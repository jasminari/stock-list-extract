/** 뉴스 기사 HTML에서 제목/본문 텍스트 추출 (리더 모드용) */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractTitle(html: string): string {
  const og = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  if (og) return decodeEntities(og[1]).trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]) : "";
}

/** 여는 <div> 위치부터 중첩 깊이를 세서 짝이 맞는 </div>까지의 내부 HTML 반환 */
function extractDivBlock(html: string, openTagStart: number): string {
  const openEnd = html.indexOf(">", openTagStart);
  if (openEnd === -1) return "";
  const re = /<\/?div\b/gi;
  re.lastIndex = openEnd + 1;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(openEnd + 1, m.index);
  }
  return html.slice(openEnd + 1);
}

/** 주요 언론사 본문 컨테이너 패턴 순서대로 시도, 실패 시 <p> 수집 → og:description */
export function extractBody(html: string): string {
  // 네이버 뉴스 (n.news.naver.com): <article id="dic_area">
  const naver = html.match(
    /<article[^>]*id=["']dic_area["'][^>]*>([\s\S]*?)<\/article>/i
  );
  if (naver) {
    const text = stripTags(naver[1]);
    if (text.length > 100) return text;
  }

  // 일반 언론사에서 흔한 본문 div 컨테이너 (중첩 div 포함 균형 추출)
  const divPatterns = [
    /<div[^>]*id=["']dic_area["'][^>]*>/i,
    /<div[^>]*(?:id|class)=["'][^"']*(?:article[-_]?body|articleBody|news[-_]?body|article[-_]?txt|articl?e[-_]?view|view[-_]?contents?)[^"']*["'][^>]*>/i,
  ];
  for (const re of divPatterns) {
    const m = html.match(re);
    if (m && m.index !== undefined) {
      const text = stripTags(extractDivBlock(html, m.index));
      if (text.length > 100) return text;
    }
  }

  // <article> 태그
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article) {
    const text = stripTags(article[1]);
    if (text.length > 100) return text;
  }

  // <p> 태그 수집 폴백
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length > 30);
  const joined = paragraphs.join("\n\n");
  if (joined.length > 200) return joined;

  const og = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  return og ? decodeEntities(og[1]).trim() : "";
}

export interface ArticleContent {
  title: string;
  body: string;
}

/** URL에서 기사 제목/본문 가져오기 (8초 타임아웃) */
export async function fetchArticle(url: string): Promise<ArticleContent> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`기사 요청 실패 (${res.status})`);
  }

  const html = await res.text();
  return { title: extractTitle(html), body: extractBody(html) };
}
