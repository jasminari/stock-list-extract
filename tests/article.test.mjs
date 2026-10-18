import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBody } from '../lib/article.ts';

const story = '실제 기사 본문입니다. 수요 증가와 실적 전망을 자세히 설명합니다. '.repeat(6);
test('prefers dedicated article body over surrounding menus', () => {
  const html = `<div id="article-view"><div class="article-body"><p>본문 글씨 키우기</p><article id="article-view-content-div" itemprop="articleBody"><p>${story}</p></article><p>공유</p></div></div>`;
  assert.equal(extractBody(html), story.trim());
});
test('preserves nested dedicated div content and decodes punctuation', () => {
  const html = `<article><div id="article-view-content-div"><div>${story}</div><p>원전&middot;가스터빈&hellip;</p></div><div>메뉴</div></article>`;
  const body = extractBody(html);
  assert.ok(body.includes(story.trim()));
  assert.ok(body.includes('원전·가스터빈…'));
  assert.ok(!body.includes('메뉴'));
});
test('keeps Naver article extraction working', () => {
  assert.equal(extractBody(`<article id="dic_area">${story}</article>`), story.trim());
});
