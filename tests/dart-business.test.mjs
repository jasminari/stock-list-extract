import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessText, ISSUER_STOCK_ALIASES, selectPeriodicFilings, xmlToText } from '../scripts/lib/dart-business.mjs';

const prose = `${'당사는 반도체 장비 사업을 영위하며 주요 고객에게 검사 서비스를 제공합니다. '.repeat(30)}매출은 제품 판매와 유지보수 서비스에서 발생합니다.`;

test('periodic filings are limited to the requested as-of date and sorted newest first', () => {
  const items = [
    { report_nm: '분기보고서 (2026.09)', rcept_dt: '20261114', rcept_no: '3' },
    { report_nm: '주요사항보고서', rcept_dt: '20261019', rcept_no: '4' },
    { report_nm: '반기보고서 (2026.06)', rcept_dt: '20260814', rcept_no: '2' },
    { report_nm: '[기재정정]사업보고서 (2025.12)', rcept_dt: '20260401', rcept_no: '1' },
  ];
  assert.deepEqual(selectPeriodicFilings(items, '20261019').map((item) => item.rcept_no), ['2', '1']);
});

test('preferred-share issuer mapping is explicit and exact', () => {
  assert.equal(ISSUER_STOCK_ALIASES.get('005935'), '005930');
  assert.equal(ISSUER_STOCK_ALIASES.has('005936'), false);
});

test('extracts substantive overview and products rather than a table of contents', () => {
  const xml = `<DOCUMENT>
    <SECTION-1><TITLE>목 차</TITLE><P>II. 사업의 내용</P><P>1. 사업의 개요</P><P>2. 주요 제품 및 서비스</P></SECTION-1>
    <SECTION-1><TITLE>II. 사업의 내용</TITLE>
      <SECTION-2><TITLE>1. 사업의 개요</TITLE><P>${prose}</P></SECTION-2>
      <SECTION-2><TITLE>2. 주요 제품 및 서비스</TITLE><P>${prose} 주력 제품은 테스트 장비입니다.</P></SECTION-2>
    </SECTION-1>
  </DOCUMENT>`;
  const result = extractBusinessText(xml);
  assert.match(result, /\[사업의 개요\]/);
  assert.match(result, /\[주요 제품 및 서비스\]/);
  assert.match(result, /테스트 장비/);
  assert.doesNotMatch(result, /\[목 차\]/);
});

test('rejects headings and generic subsidiary boilerplate without meaningful detail', () => {
  const xml = `<DOCUMENT><SECTION-1><TITLE>II. 사업의 내용</TITLE>
    <SECTION-2><TITLE>1. 사업의 개요</TITLE><P>당사 및 종속회사의 사업 내용은 다음과 같습니다.</P></SECTION-2>
    <SECTION-2><TITLE>2. 주요 제품 및 서비스</TITLE><P>해당사항 없습니다.</P></SECTION-2>
  </SECTION-1></DOCUMENT>`;
  assert.equal(extractBusinessText(xml), null);
});

test('decodes common entities and preserves useful row boundaries', () => {
  assert.match(xmlToText('<P>A &amp; B</P><TABLE><TR><TD>제품</TD><TD>매출</TD></TR></TABLE>'), /^A & B\n+제품 매출$/);
});
