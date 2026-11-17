import type { ProcessedStock } from "./types";

/**
 * 테마별 묶음 미리보기용 임시 분류.
 *
 * 수집 데이터에는 아직 "테마" 항목이 없어서, 종목의 키워드·사업 소개 문구에
 * 들어 있는 단어로 업종을 추정한다. 그날의 시장 테마를 판단하는 것이 아니라
 * 화면 구성을 확인하기 위한 것이므로, 정식 기능으로 쓰려면 수집 단계에서
 * 테마를 기록하도록 바꿔야 한다.
 */
const RULES: [string, RegExp][] = [
  ["금융", /금융|은행|보험|증권|카드|캐피탈|벤처투자|토큰증권|STO|결제|스테이블코인/],
  ["방산·항공우주", /방산|항공|우주|위성|유도탄|전차|탄약/],
  ["조선·해운", /조선|선박|운반선|해운/],
  ["전력·에너지", /전력|변압기|케이블|원전|SMR|발전|에너지|태양광|풍력|ESS/],
  ["반도체", /반도체|메모리|파운드리|HBM|웨이퍼/],
  ["2차전지", /2차전지|이차전지|배터리|양극재|음극재/],
  ["자동차", /완성차|자동차|전장|모빌리티/],
  ["바이오·헬스케어", /바이오|신약|치료|면역|제약|임상|의료|헬스케어|백신/],
  ["AI·소프트웨어", /AI|인공지능|보안|솔루션|소프트웨어|클라우드|로봇|플랫폼/],
  ["소비재", /화장품|뷰티|식품|면류|담배|음료|패션|유통/],
  ["게임·콘텐츠", /게임|웹툰|엔터|콘텐츠|미디어/],
  ["건설·기계", /건설|기계|플랜트|장비/],
];

export const UNGROUPED_THEME = "기타";

export function withPreviewThemes(stocks: ProcessedStock[]): ProcessedStock[] {
  return stocks.map((s) => {
    const text = [
      s.keyword === "미확인" ? "" : s.keyword,
      s.relatedMaterial?.keyword,
      s.businessProfile?.keyword,
    ]
      .filter(Boolean)
      .join(" ");
    const hit = RULES.find(([, pattern]) => pattern.test(text));
    return { ...s, theme: hit ? hit[0] : UNGROUPED_THEME };
  });
}
