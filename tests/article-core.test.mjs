import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  extractBody,
  extractTitle,
  fetchArticle,
  isUsableBody,
} from "../lib/article-core.mjs";

const story = "실제 기사 본문입니다. 수요 증가와 실적 전망을 자세히 설명합니다. ".repeat(7);
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("prefers a nested semantic article body to its surrounding layout", () => {
  const html = `<div class="article-body"><p>${"공유 메뉴 글자 크기 ".repeat(12)}</p><section><div itemprop="articleBody"><p>${story}</p></div></section><p>관련기사 다음기사</p></div>`;
  assert.equal(extractBody(html), story.trim());
});

test("rejects navigation, metadata, and description-only pages", () => {
  const navigation = `<main>${"홈 메뉴 로그인 회원가입 정치 경제 사회 문화 스포츠 연예 공유 인쇄 ".repeat(8)}</main>`;
  assert.equal(extractBody(navigation), "");
  assert.equal(isUsableBody("입력 2026.10.20 기자 = 홍길동 무단 전재 및 재배포 금지 ".repeat(8)), false);
  assert.equal(extractBody(`<meta property="og:description" content="${story}">`), "");
});

test("rejects decoding-corrupted bodies", () => {
  const corrupted = `${"정상적인 기사 내용입니다. ".repeat(18)}${"�".repeat(11)}`;
  assert.equal(isUsableBody(corrupted), false);
  assert.equal(extractBody(`<article itemprop="articleBody">${corrupted}</article>`), "");
});

test("paragraph fallback excludes wrapped navigation and related-link blocks", () => {
  const navigationParagraphs = `<nav><p>${"홈 메뉴 정치 경제 사회 문화 스포츠 연예 ".repeat(12)}</p></nav>`;
  const relatedParagraphs = `<div class="related-news"><p>${"관련기사 다음기사 추천 뉴스 링크 모음입니다. ".repeat(12)}</p></div>`;
  assert.equal(extractBody(`${navigationParagraphs}${relatedParagraphs}`), "");
});

test("decodes named and numeric entities in titles and article text", () => {
  const html = `<meta content="A &amp; B &#xB7; 실적" property="og:title"><article itemprop="articleBody"><p>${story}</p><p>원전&amp;가스터빈 &#183; 투자&#33;</p></article>`;
  assert.equal(extractTitle(html), "A & B · 실적");
  const body = extractBody(html);
  assert.match(body, /원전&가스터빈 · 투자!/);
});

test("fetchArticle decodes a legacy EUC-KR response before extraction", async () => {
  // EUC-KR byte sequences for 가, 나, 다. Keeping the fixture byte-level also
  // proves fetchArticle uses arrayBuffer rather than Response.text().
  const open = Buffer.from('<meta charset="ks_c_5601-1987"><title>', "ascii");
  const korean = Buffer.from([0xb0, 0xa1, 0xb3, 0xaa, 0xb4, 0xd9]);
  const middle = Buffer.from("</title><article itemprop=articleBody><p>", "ascii");
  const body = Buffer.concat(Array.from({ length: 45 }, () => korean));
  const close = Buffer.from(".</p></article>", "ascii");
  const payload = Buffer.concat([open, korean, middle, body, close]);
  globalThis.fetch = async () => new Response(payload, {
    status: 200,
    headers: { "content-type": "text/html; charset=ks_c_5601-1987" },
  });

  const article = await fetchArticle("https://example.test/article");
  assert.equal(article.title, "가나다");
  assert.ok(article.body.startsWith("가나다가나다"));
  assert.ok(article.body.length > 100);
});

test("fetchArticle surfaces HTTP failures", async () => {
  globalThis.fetch = async () => new Response("nope", { status: 503 });
  await assert.rejects(fetchArticle("https://example.test/down"), /503/);
});
