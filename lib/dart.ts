import zlib from "node:zlib";
import type {
  DartFiling,
  OwnershipRow,
  OwnershipReportKind,
} from "./types";

const BASE = "https://opendart.fss.or.kr/api";

/** 지분공시 상세유형 — D001 대량보유(5%룰), D002 임원ㆍ주요주주 소유상황 */
export const OWNERSHIP_DETAIL_TYPES = ["D001", "D002"] as const;

function apiKey(): string {
  const key = process.env.DART_API_KEY;
  if (!key) throw new Error("DART_API_KEY 환경변수가 없습니다");
  return key;
}

// ─────────────────────────────────────────────────────────────
// 공시 목록 (list.json)
// ─────────────────────────────────────────────────────────────

/**
 * 하루치 공시 목록을 상세유형별로 모두 가져온다.
 * list.json은 100건씩 페이징되므로 total_page까지 순회한다.
 */
export async function fetchFilings(
  date: string,
  detailType: string
): Promise<DartFiling[]> {
  const out: DartFiling[] = [];
  let page = 1;
  let totalPage = 1;

  do {
    const url =
      `${BASE}/list.json?crtfc_key=${apiKey()}` +
      `&bgn_de=${date}&end_de=${date}` +
      `&pblntf_detail_ty=${detailType}&page_no=${page}&page_count=100`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`DART list.json 응답 오류: ${res.status}`);
    const json = await res.json();

    // 013 = 조회 결과 없음. 그날 해당 유형 공시가 하나도 없으면 정상 상황이다.
    if (json.status === "013") return out;
    if (json.status !== "000") {
      throw new Error(`DART list.json 오류(${json.status}): ${json.message}`);
    }

    totalPage = Number(json.total_page) || 1;
    for (const it of json.list ?? []) {
      out.push({
        rceptNo: it.rcept_no,
        corpCode: it.corp_code,
        corpName: it.corp_name,
        stockCode: it.stock_code ?? "",
        corpCls: it.corp_cls ?? "",
        reportNm: it.report_nm,
        flrNm: it.flr_nm,
        rceptDt: it.rcept_dt,
        detailType,
      });
    }
    page += 1;
  } while (page <= totalPage);

  return out;
}

// ─────────────────────────────────────────────────────────────
// 공시 원문 (document.xml → ZIP)
// ─────────────────────────────────────────────────────────────

/**
 * ZIP에서 첫 번째 파일을 꺼낸다.
 * DART 원문은 항상 XML 한 개만 들어 있어 중앙 디렉터리의 첫 엔트리만 보면 된다.
 * (로컬 헤더의 크기 필드는 스트리밍 압축 시 0으로 비어 올 수 있어 중앙 디렉터리를 기준으로 삼는다)
 */
function unzipSingleFile(buf: Buffer): Buffer {
  const EOCD = 0x06054b50;
  const CDFH = 0x02014b50;

  let eocd = -1;
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("공시 원문 ZIP의 끝 레코드를 찾지 못했습니다");

  const cd = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cd) !== CDFH) {
    throw new Error("공시 원문 ZIP의 중앙 디렉터리가 손상되었습니다");
  }

  const method = buf.readUInt16LE(cd + 10);
  const compSize = buf.readUInt32LE(cd + 20);
  const localOffset = buf.readUInt32LE(cd + 42);

  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + compSize);

  if (method === 0) return Buffer.from(data);
  if (method === 8) return zlib.inflateRawSync(data);
  throw new Error(`지원하지 않는 ZIP 압축 방식입니다: ${method}`);
}

/** XML 선언부의 encoding을 보고 디코딩한다 (DART 구 문서는 EUC-KR로 온다) */
function decodeXml(buf: Buffer): string {
  const head = buf.subarray(0, 120).toString("latin1");
  const enc = /encoding\s*=\s*["']([\w-]+)["']/i.exec(head)?.[1]?.toLowerCase();
  if (!enc || enc === "utf-8" || enc === "utf8") return buf.toString("utf8");
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return buf.toString("utf8");
  }
}

/** 접수번호로 공시 원문 XML을 가져온다 */
export async function fetchDocumentXml(rceptNo: string): Promise<string> {
  const url = `${BASE}/document.xml?crtfc_key=${apiKey()}&rcept_no=${rceptNo}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`DART document.xml 응답 오류: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // 인증키 오류 등은 ZIP이 아니라 XML 에러 문서로 온다
  if (buf.length < 4 || buf.readUInt16LE(0) !== 0x4b50) {
    const msg = /<message>([^<]*)<\/message>/.exec(buf.toString("utf8"))?.[1];
    throw new Error(`공시 원문을 받지 못했습니다${msg ? `: ${msg}` : ""}`);
  }
  return decodeXml(unzipSingleFile(buf));
}

// ─────────────────────────────────────────────────────────────
// 원문 XML 파싱
//
// DART 원문은 표의 각 칸에 의미 코드가 붙어 있다.
//   <TE ACODE="MDF_STK_CNT">-1,408,147</TE>   — 값 칸
//   <TU AUNIT="MDF_DM" AUNITVALUE="20260825">2026년 08월 25일</TU>  — 코드 칸
// 열 순서 대신 이 코드로 읽으면 서식 버전이 바뀌어도 깨지지 않는다.
// ─────────────────────────────────────────────────────────────

interface Cell {
  code: string | null;
  unit: string | null;
  unitValue: string | null;
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
}

/** ACLASS로 TABLE-GROUP 블록을 잘라낸다 */
function tableGroup(xml: string, aclass: string): string {
  const m = new RegExp(
    `<TABLE-GROUP[^>]*\\bACLASS="${aclass}"[^>]*>([\\s\\S]*?)</TABLE-GROUP>`
  ).exec(xml);
  return m ? m[1] : "";
}

function rows(block: string): string[] {
  return block.match(/<TR\b[^>]*>[\s\S]*?<\/TR>/g) ?? [];
}

function cells(row: string): Cell[] {
  const out: Cell[] = [];
  const re = /<(T[DEUH])\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(row))) {
    out.push({
      code: attr(m[2], "ACODE"),
      unit: attr(m[2], "AUNIT"),
      unitValue: attr(m[2], "AUNITVALUE"),
      text: cleanText(m[3]),
    });
  }
  return out;
}

function byCode(cs: Cell[], code: string): string | null {
  return cs.find((c) => c.code === code)?.text ?? null;
}

function byUnit(cs: Cell[], unit: string): Cell | null {
  return cs.find((c) => c.unit === unit) ?? null;
}

/** 블록 전체에서 코드 하나의 첫 값을 찾는다 (표지·요약처럼 한 번만 나오는 항목용) */
function firstCode(block: string, code: string): string | null {
  for (const r of rows(block)) {
    const v = byCode(cells(r), code);
    if (v !== null) return v;
  }
  return null;
}

function firstUnit(block: string, unit: string): Cell | null {
  for (const r of rows(block)) {
    const c = byUnit(cells(r), unit);
    if (c) return c;
  }
  return null;
}

/** "1,408,147" → 1408147, "-" / "" → null. "(6,373)" 같은 괄호 표기는 값만 취한다 */
function num(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.replace(/[,\s()]/g, "");
  if (!s || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** num()과 같되 0 이하는 값이 없는 것으로 본다 (원문에서 미기재를 0으로 채우는 칸이 있다) */
function positive(raw: string | null | undefined): number | null {
  const n = num(raw);
  return n !== null && n > 0 ? n : null;
}

/** "2025.01.14" / "2026년 08월 25일" → "20250114". AUNITVALUE가 있으면 그대로 쓴다 */
function dateOf(cell: Cell | null): string | null {
  if (!cell) return null;
  if (cell.unitValue && /^\d{8}$/.test(cell.unitValue)) return cell.unitValue;
  const d = cell.text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!d) return null;
  return `${d[1]}${d[2].padStart(2, "0")}${d[3].padStart(2, "0")}`;
}

/**
 * 취득방법 이름을 정리한다. 원문은 "장내매수(+)", "장내매도(-)"처럼
 * 증감 부호를 괄호로 달고 오는데, 부호는 증감 컬럼에 이미 있으므로 뗀다.
 */
function normalizeMethod(raw: string): string {
  return raw.replace(/\s*\([+-]\)\s*$/, "").trim();
}

/**
 * 실제 매매로 지분이 움직인 건만 남긴다. 전환·증여·주식병합처럼 값을 주고받지 않은
 * 변동은 취득단가/총액이 의미가 없어 표에서 뺀다.
 *
 * 이름이 아니라 코드로 거른다 — "주식매수선택권행사"처럼 이름에 '매수'가 들어가지만
 * 장내 거래가 아닌 항목이 있어서 문자열 판정은 오탐이 난다.
 * 코드 체계는 D001(HLD_MTH)과 D002(RPT_RSN)가 같다.
 */
const TRADE_CODES = new Set([
  "01", // 장내매수
  "02", // 장내매도
  "11", // 장외매수
  "12", // 장외매도
  "81", // 시간외매매(+)
  "82", // 시간외매매(-)
]);

function isTrade(cell: Cell | null): boolean {
  return !!cell?.unitValue && TRADE_CODES.has(cell.unitValue.padStart(2, "0"));
}

interface DetailRow {
  holderName: string;
  date: string;
  method: string;
  after: number | null;
  delta: number;
  unitPrice: number | null;
}

// ─────────────────────────────────────────────────────────────
// 보고서별 파서
// ─────────────────────────────────────────────────────────────

/**
 * D002 임원ㆍ주요주주 특정증권등 소유상황보고서.
 * 보고자가 한 명이므로 세부변동내역의 모든 줄이 같은 사람 것이다.
 */
function parseExecutiveReport(xml: string, filing: DartFiling) {
  const info = tableGroup(xml, "IFR_NM");
  const holderName = firstCode(info, "IFR_NM") ?? filing.flrNm;

  // 등기여부(STF_RYN)가 "-"면 임원이 아니라 주요주주 자격으로 낸 보고서다
  const registered = firstUnit(info, "STF_RYN")?.text ?? "-";
  const position = firstCode(info, "STF_PSM") ?? "-";
  const mainShareholder = firstUnit(info, "MAIN_SH")?.text ?? "-";

  let subject: string;
  if (registered !== "-") {
    subject = position !== "-" ? `${registered}(${position})` : registered;
  } else {
    subject = mainShareholder !== "-" ? mainShareholder : "-";
  }

  // 소유비율은 보고서 단위로만 제공된다 (직전보고서 ↔ 이번보고서)
  const own = tableGroup(xml, "BFR_PS_CNT");
  const ratioAfter = num(firstCode(own, "AFR_UN_RT"));
  // 직전보고서 비율은 신규 보고·최초 취득이면 "-"로 비어 온다.
  // 그럴 때는 이번 비율에서 증감 비율을 되돌려 채운다.
  const ratioDelta = num(firstCode(own, "MDF_UN_RT"));
  const ratioBefore =
    num(firstCode(own, "BFR_UN_RT")) ??
    (ratioAfter !== null && ratioDelta !== null ? ratioAfter - ratioDelta : null);

  const details: DetailRow[] = [];
  for (const r of rows(tableGroup(xml, "RPT_RSN"))) {
    const cs = cells(r);
    const date = dateOf(byUnit(cs, "MDF_DM"));
    const delta = num(byCode(cs, "MDF_STK_CNT"));
    // 합계 줄은 변동일이 없고 *_SUM 코드를 쓰므로 여기서 걸러진다
    if (!date || delta === null) continue;
    const reason = byUnit(cs, "RPT_RSN");
    if (!isTrade(reason)) continue;
    details.push({
      holderName,
      date,
      method: normalizeMethod(reason?.text ?? ""),
      after: num(byCode(cs, "AFR_STK_CNT")),
      delta,
      unitPrice: num(byCode(cs, "ACI_AMT2")),
    });
  }

  return {
    details,
    subjectOf: () => subject,
    ratiosOf: () => ({ before: ratioBefore, after: ratioAfter }),
  };
}

/**
 * D001 주식등의 대량보유상황보고서(5%룰).
 * 세부변동내역이 보고자와 특별관계자를 한 표에 섞어 담으므로 이름별로 갈라야 한다.
 */
function parseMajorReport(xml: string, filing: DartFiling) {
  const filer = firstCode(tableGroup(xml, "RPT_DST1"), "IFR_NM") ?? filing.flrNm;

  // 보유비율의 분모. 발행주식총수가 아니라 잠재주식을 포함한 "주식등의 총수"다
  const totalShares = num(firstCode(tableGroup(xml, "BFR_IFR"), "THS_STK_CT"));

  // 이름별 보유수량·보유비율(변동 후)
  const heldByHolder = new Map<string, number>();
  const ratioByHolder = new Map<string, number>();
  for (const r of rows(tableGroup(xml, "CST_CNT1"))) {
    const cs = cells(r);
    const name = byCode(cs, "SPC_NM");
    if (!name) continue;
    const cnt = num(byCode(cs, "STK_CNT"));
    const rt = num(byCode(cs, "STK_RT"));
    if (cnt !== null) heldByHolder.set(name, cnt);
    if (rt !== null) ratioByHolder.set(name, rt);
  }

  const details: DetailRow[] = [];
  for (const r of rows(tableGroup(xml, "HLD_MTH"))) {
    const cs = cells(r);
    const name = byCode(cs, "SPC_NM");
    const date = dateOf(byUnit(cs, "MDF_DT"));
    const delta = num(byCode(cs, "MDF_SDK_CNT"));
    if (!name || !date || delta === null) continue;
    const how = byUnit(cs, "HLD_MTH");
    if (!isTrade(how)) continue;
    details.push({
      holderName: name,
      date,
      method: normalizeMethod(how?.text ?? ""),
      after: num(byCode(cs, "AFR_MDF_CNT")),
      delta,
      // 단가 칸은 두 개다. 앞칸(PRJ)은 주식 외 증권의 행사가액이라 0이나 "-"로 비는
      // 경우가 있고, 그때는 괄호로 표기된 실제 매매단가 PRG를 써야 총액이 맞는다.
      unitPrice: positive(byCode(cs, "HLD_UNT_PRJ")) ?? num(byCode(cs, "HLD_UNT_PRG")),
    });
  }

  return {
    details,
    subjectOf: (name: string) =>
      name === filer ? "주요주주" : `${filer} 특별관계자`,
    /**
     * 지분율은 요약표(CST_CNT1)의 비율을 그대로 쓰지 않고 수량에서 다시 계산한다.
     * 그 표에 보유수량 대신 증감을 적어 비율이 음수로 찍히는 공시가 실제로 있는데,
     * 세부변동내역의 변동후 수량은 그런 경우에도 맞게 들어 있기 때문이다.
     * 분모는 잠재주식을 포함한 "주식등의 총수"로, 원문의 비율과 같은 기준이다.
     */
    ratiosOf: (name: string, delta: number, afterQty: number | null) => {
      const held = afterQty ?? heldByHolder.get(name) ?? null;
      if (held === null || !totalShares) {
        return { before: null, after: ratioByHolder.get(name) ?? null };
      }
      return {
        before: ((held - delta) / totalShares) * 100,
        after: (held / totalShares) * 100,
      };
    },
  };
}

/**
 * 원문 하나를 표 여러 줄로 바꾼다.
 * (이름 × 취득방법)으로 묶어 여러 날에 걸친 매수/매도를 한 줄로 합친다 —
 * reference1의 "최초변동일~최종변동일" 한 줄이 바로 이 단위다.
 */
export function buildRows(xml: string, filing: DartFiling): OwnershipRow[] {
  const kind: OwnershipReportKind =
    filing.detailType === "D001" ? "major" : "executive";
  const parsed =
    kind === "major"
      ? parseMajorReport(xml, filing)
      : parseExecutiveReport(xml, filing);

  const groups = new Map<string, DetailRow[]>();
  for (const d of parsed.details) {
    const key = `${d.holderName}|${d.method}`;
    const g = groups.get(key);
    if (g) g.push(d);
    else groups.set(key, [d]);
  }

  const out: OwnershipRow[] = [];
  for (const g of groups.values()) {
    const sorted = [...g].sort((a, b) => a.date.localeCompare(b.date));
    const delta = sorted.reduce((s, d) => s + d.delta, 0);

    // 총액은 건별 |증감| × 단가의 합, 취득단가는 그 총액을 수량으로 나눈 가중평균.
    // 단가가 빈 건은 양쪽에서 모두 빼야 평균이 왜곡되지 않는다.
    let amount = 0;
    let pricedQty = 0;
    for (const d of sorted) {
      if (d.unitPrice === null) continue;
      amount += Math.abs(d.delta) * d.unitPrice;
      pricedQty += Math.abs(d.delta);
    }

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const ratios =
      kind === "major"
        ? (parsed as ReturnType<typeof parseMajorReport>).ratiosOf(
            first.holderName,
            delta,
            last.after
          )
        : (parsed as ReturnType<typeof parseExecutiveReport>).ratiosOf();

    out.push({
      rceptNo: filing.rceptNo,
      kind,
      corpName: filing.corpName,
      stockCode: filing.stockCode,
      corpCls: filing.corpCls,
      subject: parsed.subjectOf(first.holderName),
      holderName: first.holderName,
      firstDate: first.date,
      lastDate: last.date,
      method: first.method,
      delta,
      after: last.after,
      ratioBefore: ratios.before,
      ratioAfter: ratios.after,
      unitPrice: pricedQty > 0 ? amount / pricedQty : null,
      amount: pricedQty > 0 ? amount : null,
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
// 하루치 수집
// ─────────────────────────────────────────────────────────────

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }
  );
  await Promise.all(workers);
  return out;
}

export interface OwnershipReportResult {
  date: string;
  rows: OwnershipRow[];
  /** 원문을 읽지 못한 공시. 나머지 결과는 그대로 보여준다 */
  failures: { rceptNo: string; corpName: string; reason: string }[];
}

/**
 * 하루치 "임원, 주요주주 특정증권 등 소유상황보고서" 표를 만든다.
 * D001(대량보유)과 D002(임원ㆍ주요주주)를 함께 담는다 — reference1의 해당 섹션이
 * 두 유형을 한 표에 섞어 보여주기 때문이다. 정렬은 접수번호 순(= 공시 접수 순).
 */
export async function collectOwnershipReport(
  date: string,
  concurrency = 6
): Promise<OwnershipReportResult> {
  const filings = (
    await Promise.all(OWNERSHIP_DETAIL_TYPES.map((t) => fetchFilings(date, t)))
  ).flat();

  const failures: OwnershipReportResult["failures"] = [];
  const perFiling = await mapLimit(filings, concurrency, async (f) => {
    try {
      return buildRows(await fetchDocumentXml(f.rceptNo), f);
    } catch (e) {
      failures.push({
        rceptNo: f.rceptNo,
        corpName: f.corpName,
        reason: e instanceof Error ? e.message : "알 수 없는 오류",
      });
      return [];
    }
  });

  const rows = perFiling
    .flat()
    .sort((a, b) => a.rceptNo.localeCompare(b.rceptNo));

  return { date, rows, failures };
}
