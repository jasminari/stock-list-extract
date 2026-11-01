import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const API_BASE = 'https://opendart.fss.or.kr/api';
const VIEW_BASE = 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=';
// OpenDART assigns one corp code to the issuer and lists its common-share ticker.
// Keep preferred-share aliases explicit so unrelated six-digit codes can never collide.
export const ISSUER_STOCK_ALIASES = new Map([
  ['005935', '005930'], // 삼성전자우 -> 삼성전자
]);

function apiKey() {
  const key = process.env.DART_API_KEY;
  if (!key) throw new Error('DART_API_KEY environment variable is missing');
  return key;
}

function cacheRoot(dateStr) {
  return path.resolve(process.cwd(), `output/dart-business-${dateStr}`);
}

async function readIfPresent(file) {
  try { return await fs.readFile(file); } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function fetchWithRetry(urlFactory, label, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(urlFactory(), { cache: 'no-store', signal: controller.signal });
      if (response.ok) return response;
      if (response.status < 500 && response.status !== 429) {
        throw new Error(`${label} returned HTTP ${response.status}`);
      }
      throw new Error(`${label} temporarily returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || (/HTTP 4\d\d/.test(error.message) && !/429/.test(error.message))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** (attempt - 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/** Extract the first member of DART's single-file ZIP response. */
export function unzipSingleFile(buffer) {
  const EOCD = 0x06054b50;
  const CDFH = 0x02014b50;
  let eocd = -1;
  for (let i = buffer.length - 22, min = Math.max(0, buffer.length - 22 - 0xffff); i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('DART ZIP end record was not found');
  const central = buffer.readUInt32LE(eocd + 16);
  if (buffer.readUInt32LE(central) !== CDFH) throw new Error('DART ZIP central directory is invalid');
  const method = buffer.readUInt16LE(central + 10);
  const compressedSize = buffer.readUInt32LE(central + 20);
  const local = buffer.readUInt32LE(central + 42);
  const dataStart = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
  const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return Buffer.from(compressed);
  if (method === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`Unsupported DART ZIP compression method: ${method}`);
}

function decodeXml(buffer) {
  const encoding = /encoding\s*=\s*["']([\w-]+)["']/i.exec(buffer.subarray(0, 160).toString('latin1'))?.[1]?.toLowerCase();
  if (!encoding || /utf-?8/.test(encoding)) return buffer.toString('utf8');
  try { return new TextDecoder(encoding).decode(buffer); } catch { return buffer.toString('utf8'); }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
}

export function xmlToText(xml) {
  return decodeEntities(xml
    .replace(/<(?:BR|P|TITLE|TR|LI|SECTION-\d+)\b[^>]*>/gi, '\n')
    .replace(/<\/\s*(?:P|TITLE|TR|LI|SECTION-\d+|TABLE)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeHeading(value) {
  return xmlToText(value).replace(/^\s*(?:[IVX]+|\d+)[.)]?\s*/i, '').replace(/\s+/g, ' ').trim();
}

/** Return nested DART SECTION-n blocks with their own titles. */
export function extractTitledSections(xml) {
  const sections = [];
  const opening = /<SECTION-(\d+)\b[^>]*>/gi;
  let match;
  while ((match = opening.exec(xml))) {
    const level = match[1];
    const close = new RegExp(`<\\/SECTION-${level}\\s*>`, 'ig');
    close.lastIndex = opening.lastIndex;
    const end = close.exec(xml);
    if (!end) continue;
    const body = xml.slice(opening.lastIndex, end.index);
    const titleMatch = /^\s*<TITLE\b[^>]*>([\s\S]*?)<\/TITLE>/i.exec(body);
    if (!titleMatch) continue;
    sections.push({
      level: Number(level),
      title: normalizeHeading(titleMatch[1]),
      text: xmlToText(body),
    });
  }
  return sections;
}

function substantive(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < 300) return false;
  const signals = ['사업', '제품', '서비스', '매출', '생산', '영업', '시장', '고객', '연구개발'];
  return signals.filter((word) => normalized.includes(word)).length >= 2;
}

function cleanSectionText(text, limit = 12_000) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, all) => index === 0 || line !== all[index - 1])
    .join('\n')
    .slice(0, limit)
    .trim();
}

/** Extract evidence-bearing business prose, preferring overview and product/service sections. */
export function extractBusinessText(xml) {
  const sections = extractTitledSections(xml);
  const specific = sections.filter(({ title, text }) =>
    /사업의\s*개요|주요\s*(?:제품|상품)(?:\s*및\s*서비스)?|제품\s*및\s*서비스|주요\s*서비스/.test(title) && substantive(text));
  const selected = [];
  for (const section of specific) {
    if (!selected.some((item) => item.title === section.title && item.text === section.text)) selected.push(section);
  }
  const focused = selected.length
    ? selected.slice(0, 4).map(({ title, text }) => `[${title}]\n${cleanSectionText(text, 4_000)}`).join('\n\n').slice(0, 8_000)
    : null;
  // A very short overview often points to later product/market sections. In that case,
  // use the enclosing business chapter to give downstream summarization enough context.
  const broad = sections.find(({ title, text }) => /^사업의\s*내용$/.test(title) && substantive(text));
  if (focused && focused.length >= 2_000) return focused;
  if (broad) return `[${broad.title}]\n${cleanSectionText(broad.text, 8_000)}`.slice(0, 8_000);
  if (selected.length) {
    return focused;
  }
  return null;
}

export function selectPeriodicFilings(items, dateStr) {
  return [...items]
    .filter((item) => /^\d{8}$/.test(item.rcept_dt) && item.rcept_dt <= dateStr)
    .filter((item) => /(?:사업|반기|분기)보고서/.test(item.report_nm))
    .sort((a, b) => b.rcept_dt.localeCompare(a.rcept_dt) || b.rcept_no.localeCompare(a.rcept_no));
}

async function loadCorpMap(dateStr) {
  const root = cacheRoot(dateStr);
  const xmlFile = path.join(root, 'raw', 'corpCode.xml.gz');
  const cached = await readIfPresent(xmlFile);
  let xmlBuffer = cached ? zlib.gunzipSync(cached) : null;
  if (!xmlBuffer) {
    const response = await fetchWithRetry(
      () => `${API_BASE}/corpCode.xml?crtfc_key=${encodeURIComponent(apiKey())}`,
      'DART corpCode.xml');
    const zipped = Buffer.from(await response.arrayBuffer());
    if (zipped.length < 4 || zipped.readUInt16LE(0) !== 0x4b50) throw new Error('DART corpCode.xml did not return a ZIP file');
    xmlBuffer = unzipSingleFile(zipped);
    await fs.mkdir(path.dirname(xmlFile), { recursive: true });
    await fs.writeFile(xmlFile, zlib.gzipSync(xmlBuffer));
  }
  const xml = decodeXml(xmlBuffer);
  const map = new Map();
  for (const match of xml.matchAll(/<list>([\s\S]*?)<\/list>/g)) {
    const stockCode = /<stock_code>\s*([0-9A-Z]{6})\s*<\/stock_code>/.exec(match[1])?.[1];
    const corpCode = /<corp_code>\s*(\d{8})\s*<\/corp_code>/.exec(match[1])?.[1];
    if (stockCode && corpCode) map.set(stockCode, corpCode);
  }
  return map;
}

async function loadFilings(corpCode, dateStr) {
  const file = path.join(cacheRoot(dateStr), 'raw', `filings-${corpCode}.json`);
  const cached = await readIfPresent(file);
  if (cached) return JSON.parse(cached.toString('utf8'));
  const begin = `${Math.max(1999, Number(dateStr.slice(0, 4)) - 2)}0101`;
  const params = new URLSearchParams({
    crtfc_key: apiKey(), corp_code: corpCode, bgn_de: begin, end_de: dateStr,
    pblntf_ty: 'A', page_no: '1', page_count: '100',
  });
  const response = await fetchWithRetry(() => `${API_BASE}/list.json?${params}`, 'DART list.json');
  const json = await response.json();
  if (json.status === '013') return [];
  if (json.status !== '000') throw new Error(`DART list.json error ${json.status}: ${json.message}`);
  const list = json.list ?? [];
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(list, null, 2)}\n`);
  return list;
}

async function loadDocument(receiptNo, dateStr) {
  const file = path.join(cacheRoot(dateStr), 'raw', `document-${receiptNo}.xml.gz`);
  const cached = await readIfPresent(file);
  if (cached) return decodeXml(zlib.gunzipSync(cached));
  const response = await fetchWithRetry(
    () => `${API_BASE}/document.xml?crtfc_key=${encodeURIComponent(apiKey())}&rcept_no=${encodeURIComponent(receiptNo)}`,
    'DART document.xml');
  const zipped = Buffer.from(await response.arrayBuffer());
  if (zipped.length < 4 || zipped.readUInt16LE(0) !== 0x4b50) {
    const message = /<message>([^<]*)<\/message>/.exec(zipped.toString('utf8'))?.[1];
    throw new Error(`DART document.xml did not return a ZIP file${message ? `: ${message}` : ''}`);
  }
  const raw = unzipSingleFile(zipped);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, zlib.gzipSync(raw));
  return decodeXml(raw);
}

/** Fetch the latest as-of-date periodic filing containing meaningful business evidence. */
export async function fetchBusinessEvidence(stockCode, dateStr) {
  if (!/^[0-9A-Z]{6}$/.test(stockCode)) throw new Error(`Invalid stock code: ${stockCode}`);
  if (!/^\d{8}$/.test(dateStr)) throw new Error(`Invalid date: ${dateStr}`);
  const corpMap = await loadCorpMap(dateStr);
  const corpCode = corpMap.get(stockCode) ?? corpMap.get(ISSUER_STOCK_ALIASES.get(stockCode));
  if (!corpCode) return null;
  const filings = selectPeriodicFilings(await loadFilings(corpCode, dateStr), dateStr);
  for (const filing of filings.slice(0, 12)) {
    const businessText = extractBusinessText(await loadDocument(filing.rcept_no, dateStr));
    if (!businessText) continue;
    return {
      corpCode,
      reportName: filing.report_nm,
      receiptNo: filing.rcept_no,
      filingDate: filing.rcept_dt,
      sourceUrl: `${VIEW_BASE}${filing.rcept_no}`,
      businessText,
    };
  }
  return null;
}
