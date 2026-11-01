/** Shared dependency-free news article extraction for the app and scripts. */

const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: '"',
  lsquo: "'",
  lt: "<",
  middot: "·",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: '"',
  rsquo: "'",
};

function decodeEntities(value) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
      const raw = radix === 16 ? code.slice(2) : code.slice(1);
      const point = Number.parseInt(raw, radix);
      if (Number.isFinite(point) && point >= 0 && point <= 0x10ffff) {
        try {
          return String.fromCodePoint(point);
        } catch {
          return entity;
        }
      }
      return entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function removeNonContentBlocks(html) {
  return html
    .replace(/<(script|style|noscript|svg|form|button|nav|aside|footer|header)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(
      /<(div|section|ul|ol)\b(?=[^>]*(?:(?:id|class)\s*=\s*["'][^"']*(?:related[-_ ]?(?:news|article|link)|recommend(?:ed|ation)?|navigation|share[-_ ]?(?:box|tools?))[^"']*["']|role\s*=\s*["']navigation["']))[^>]*>[\s\S]*?<\/\1\s*>/gi,
      " "
    );
}

function stripTags(html) {
  return decodeEntities(
    removeNonContentBlocks(html)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|article|section|li|h[1-6]|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function attributesOf(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attributes;
}

function extractElementBlock(html, openTagStart, tagName) {
  const openEnd = html.indexOf(">", openTagStart);
  if (openEnd === -1) return "";
  const tags = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tags.lastIndex = openEnd + 1;
  let depth = 1;
  let match;
  while ((match = tags.exec(html))) {
    if (!match[0].startsWith("</") && !match[0].endsWith("/>")) depth += 1;
    else if (match[0].startsWith("</")) depth -= 1;
    if (depth === 0) return html.slice(openEnd + 1, match.index);
  }
  return html.slice(openEnd + 1);
}

const NAV_WORDS = /(?:홈|메뉴|로그인|회원가입|구독|공유|인쇄|글자크기|이전기사|다음기사|관련기사|많이 본 뉴스|정치|경제|사회|문화|스포츠|연예)/g;
const METADATA = /(?:기자\s*=|기자\s*$|입력\s*\d{4}|수정\s*\d{4}|무단\s*전재|재배포\s*금지|copyright|all rights reserved)/gi;

/** Reject snippets, metadata blocks, and navigation text before they reach summarization. */
export function isUsableBody(body) {
  if (typeof body !== "string") return false;
  const normalized = body.replace(/\s+/g, " ").trim();
  const compactLength = normalized.replace(/\s/g, "").length;
  if (compactLength < 100) return false;

  const replacementCount = normalized.match(/\uFFFD/g)?.length ?? 0;
  if (replacementCount > 10 || replacementCount / compactLength > 0.02) return false;

  const metadataMatches = normalized.match(METADATA)?.length ?? 0;
  const withoutMetadata = normalized.replace(METADATA, " ").replace(/\s+/g, " ").trim();
  if (withoutMetadata.replace(/\s/g, "").length < 80) return false;

  const navMatches = normalized.match(NAV_WORDS)?.length ?? 0;
  const sentenceMarks = normalized.match(/(?:[가-힣][.!?。！？])|(?:다|요|음|함|됨)[.\s]/g)?.length ?? 0;
  if (metadataMatches >= 3 && sentenceMarks < 2) return false;
  if (navMatches >= 5 && sentenceMarks < 2) return false;
  return true;
}

function candidatePriority(attributes, tagName) {
  const id = (attributes.get("id") ?? "").toLowerCase();
  const className = (attributes.get("class") ?? "").toLowerCase();
  const itemprop = (attributes.get("itemprop") ?? "").toLowerCase();

  if (itemprop.split(/\s+/).includes("articlebody")) return 120;
  if (id === "article-view-content-div") return 115;
  if (id === "dic_area") return 110;
  if (/^(?:article[-_]?body|news[-_]?body|article[-_]?text|article[-_]?txt|view[-_]?content)$/.test(id)) return 100;
  if (/(?:^|\s)(?:article[-_]?body|news[-_]?body|article[-_]?text|article[-_]?txt|view[-_]?contents?)(?:\s|$)/.test(className)) return 90;
  if (/(?:article[-_]?body|news[-_]?body|article[-_]?text|article[-_]?txt|view[-_]?contents?)/.test(`${id} ${className}`)) return 75;
  if (tagName === "article") return 50;
  if (tagName === "main") return 35;
  return 0;
}

function containerCandidates(html) {
  const candidates = [];
  const openingTags = /<(article|div|section|main)\b[^>]*>/gi;
  let match;
  while ((match = openingTags.exec(html))) {
    const tagName = match[1].toLowerCase();
    const priority = candidatePriority(attributesOf(match[0]), tagName);
    if (!priority) continue;
    const text = stripTags(extractElementBlock(html, match.index, tagName));
    if (isUsableBody(text)) candidates.push({ text, priority, index: match.index });
  }
  return candidates.sort((left, right) =>
    right.priority - left.priority || left.text.length - right.text.length || left.index - right.index
  );
}

export function extractTitle(html) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = attributesOf(tag);
    const key = (attributes.get("property") ?? attributes.get("name") ?? "").toLowerCase();
    if (key === "og:title" || key === "twitter:title") {
      const title = (attributes.get("content") ?? "").trim();
      if (title) return title;
    }
  }
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  return title ? stripTags(title[1]) : "";
}

export function extractBody(html) {
  const candidate = containerCandidates(html)[0];
  if (candidate) return candidate.text;

  const fallbackHtml = removeNonContentBlocks(html);
  const paragraphs = [...fallbackHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.replace(/\s/g, "").length >= 25);
  const joined = paragraphs.join("\n\n");
  return isUsableBody(joined) ? joined : "";
}

function declaredCharset(headers, bytes) {
  const contentType = headers?.get?.("content-type") ?? "";
  const headerMatch = contentType.match(/charset\s*=\s*["']?([^;\s"']+)/i);
  if (headerMatch) return headerMatch[1];

  // Charset declarations are ASCII, so Latin-1 safely exposes them before decoding.
  const prefix = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  return prefix.match(/<meta\b[^>]*charset\s*=\s*["']?([^\s"'/>]+)/i)?.[1]
    ?? prefix.match(/<meta\b[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([^\s;"']+)/i)?.[1]
    ?? "";
}

function normalizeCharset(charset) {
  const normalized = charset.trim().toLowerCase().replace(/["']/g, "");
  if (/^(?:euc[-_]?kr|ks_c_5601-1987|cp949|x-windows-949)$/.test(normalized)) return "euc-kr";
  if (/^(?:utf[-_]?8|unicode-1-1-utf-8)$/.test(normalized)) return "utf-8";
  return normalized;
}

function decodeHtml(bytes, headers) {
  const charset = normalizeCharset(declaredCharset(headers, bytes));
  if (charset) {
    try {
      return new TextDecoder(charset, { fatal: charset === "utf-8" }).decode(bytes);
    } catch {
      // Unknown declarations fall through to content-based decoding.
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("euc-kr").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

/** Fetch and decode an article. Network and HTTP failures are intentionally surfaced. */
export async function fetchArticle(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`기사 요청 실패 (${response.status})`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  const html = decodeHtml(bytes, response.headers);
  return { title: extractTitle(html), body: extractBody(html) };
}
