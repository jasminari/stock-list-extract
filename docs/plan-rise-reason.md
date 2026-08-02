# 개발 계획: 상승이유 자동 수집 (특징주 뉴스 → AI 요약)

> 작성일: 2026-07-26
> 목표 참고 자료: `list/25년 6월 5일 (목).xlsx` (수동 정리 엑셀)

## 1. 배경과 목표

### 현재 워크플로우 (수동)

1. 매일 15:40 Oracle VM에서 조건검색 결과 자동 수집 → `/dashboard/history`에서 종목 리스트 확인
2. 각 종목마다 네이버에서 **`특징주 <종목명>`** 검색
3. 해당 일자에 나온 특징주 기사를 읽고 왜 올랐는지 파악
4. 엑셀에 **키워드(테마)** 와 **상승이유(상세 설명)** 를 직접 입력

### 목표 상태

엑셀 수동 정리와 같은 결과물이 서비스 안에서 자동으로 만들어진다:

| 번호 | 종목명 | 키워드 | 거래대금 | 종가 | 등락률 | 상승이유 |
|---|---|---|---|---|---|---|
| 1 | 두산에너빌리티 | 체코 금지가처분 취소 | 9,019억 | 45,900 | 7.62% | 체코 최고행정법원 계약금지 가처분 취소… 🔗기사 |

- **키워드**: 테마 태그 (예: "지역화폐", "애플 유리기판")
- **상승이유**: 기사 기반 요약 (상승 배경 + 회사 소개) + **원본 기사 링크**
- 자동으로 채우되, **수동 편집은 그대로 가능** (기존 인라인 편집 유지)

### 현재 코드 기반 (이미 갖춰진 것)

| 항목 | 위치 | 상태 |
|---|---|---|
| 키워드/상승이유 저장 | `lib/db/schema.ts` → `stock_annotations.keyword/reason` | ✅ 존재 |
| upsert 함수 | `lib/storage-db.ts` → `updateAnnotation()` | ✅ 존재 |
| UI 렌더링 + 인라인 편집 | `components/ProcessedResultTable.tsx` + `PATCH /api/annotations` | ✅ 존재 |
| 자동 수집 | `scripts/auto-extract.mjs` (Oracle VM, systemd timer 평일 15:40 KST) | ✅ 가동 중 |
| 뉴스/AI 연동 | 없음 | ❌ **신규 개발 대상** |

즉, **"저장소와 화면"은 이미 있고, "자동으로 채우는 파이프라인"만 만들면 된다.**

## 2. 아키텍처

```
[평일 15:40 KST] systemd timer (Oracle VM)
  └─ scripts/auto-extract.mjs        ← 기존: 조건검색 수집 + DB 저장
       └─ (수집 성공 후) scripts/enrich-reasons.mjs   ← 신규
            ① 당일 stock_entries 조회 (annotation 미작성 종목만)
            ② 네이버 뉴스 API: 「특징주 <종목명>」 검색 (sort=date)
            ③ pubDate = 수집일(KST) 기사만 필터, 제목에 종목명 포함 우선
            ④ 기사 본문 확보
               - n.news.naver.com 링크 → 본문 스크래핑 (#dic_area)
               - 그 외 → API가 준 제목 + 요약(description) 사용
            ⑤ Claude API (Haiku)에 본문 전달 → { keyword, reason } JSON
            ⑥ stock_annotations upsert
               - reason + source_url + auto_filled=true + enriched_at
               - 이미 수동 입력된 종목은 건너뜀 (덮어쓰기 금지)
```

### 왜 이 구조인가

- **수집 직후 자동 실행**: 아침에 열어보면 이미 채워져 있는 경험. 별도 timer를 만들지 않고 auto-extract 마지막 단계에서 child process 또는 함수 호출로 이어 실행 (실패해도 수집 자체에는 영향 없도록 try/catch 분리).
- **네이버 뉴스 검색 API**: 사용자의 수동 검색(`특징주 종목명`)과 동일한 결과. 무료 25,000건/일, 앱 등록만 필요.
- **Claude Haiku 요약**: 기사 원문 → 엑셀 수준의 상승이유 텍스트. 일 ~25종목이면 비용은 월 수백 원 미만.

## 3. DB 변경

`stock_annotations` 테이블에 컬럼 추가 (drizzle migration):

| 컬럼 | 타입 | 용도 |
|---|---|---|
| `source_url` | text, default `''` | 특징주 기사 링크 |
| `auto_filled` | boolean, default `false` | 자동 작성 여부 (수동 편집 시 `false`로 전환) |
| `enriched_at` | timestamp, nullable | 자동 작성 시각 |

- 마이그레이션: `lib/db/schema.ts` 수정 → `drizzle-kit generate` → 배포 DB에 적용
- `lib/storage-db.ts`의 `getSearchResultStocks()` join과 `updateAnnotation()`에 신규 컬럼 반영
- `PATCH /api/annotations` (수동 편집)에서는 `auto_filled=false`로 업데이트 → 수동 입력이 자동 갱신에 덮어써지지 않게 보호

## 4. 신규 코드

### `scripts/enrich-reasons.mjs` (핵심, Oracle VM 실행)

- `auto-extract.mjs`와 같은 스타일: raw `postgres` SQL, `.env.local` 로드, 의존성 최소화 (1GB RAM VM)
- CLI: `node scripts/enrich-reasons.mjs [--date YYYYMMDD] [--dry] [--force]`
  - `--dry`: DB 쓰기 없이 검색 결과만 출력 (검증용)
  - `--force`: auto_filled 항목 재생성 (수동 입력은 여전히 보호)
- 처리 흐름 (종목별 순차, 호출 간 200ms throttle):
  1. 네이버 뉴스 API `GET https://openapi.naver.com/v1/search/news.json?query=특징주+<종목명>&sort=date&display=10`
     - 헤더: `X-Naver-Client-Id`, `X-Naver-Client-Secret`
  2. `pubDate`를 KST로 변환해 수집일과 일치하는 기사만 남김 (API에 날짜 필터가 없어 클라이언트 필터 필수)
  3. 우선순위: 제목에 "특징주"+종목명 포함 > 제목에 종목명 포함 > 최신순
  4. `link`가 `n.news.naver.com`이면 fetch 후 `#dic_area`(네이버 뉴스 본문 영역) 텍스트 추출 — 정규식/문자열 처리로 충분, cheerio 등 미도입
  5. Claude API (`claude-haiku-4-5`) 호출:
     - 프롬프트: 기사 제목+본문 + "이 종목이 오늘 상승한 이유를 2~4문장으로, 테마 키워드 1개와 함께 JSON으로" (엑셀 예시 몇 개를 few-shot으로 포함)
     - 응답: `{ "keyword": "지역화폐", "reason": "이재명 정부 출범에 따른 정책 수혜 기대감…" }`
  6. upsert. 기사가 없으면 아무것도 쓰지 않음 (엑셀에도 빈칸인 종목이 원래 있음 — 정상 케이스)
- 로그: `extraction_logs` 스타일로 성공/실패 건수 기록 (journalctl로 확인)

### `auto-extract.mjs` 수정

- `main()` 마지막에 enrich 단계 호출 (env 키 없으면 skip + 로그만)
- 실패해도 수집 결과에는 영향 없도록 격리

### 환경 변수 (신규)

| 변수 | 용도 | 등록 위치 |
|---|---|---|
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 뉴스 검색 API | 로컬 `.env.local` + Oracle `/etc/stock-extract.env` |
| `ANTHROPIC_API_KEY` | Claude 요약 | 〃 |

> 네이버 개발자센터(developers.naver.com) → 애플리케이션 등록 → "검색" API 선택 → Client ID/Secret 발급 (무료)

## 5. UI 변경

`components/ProcessedResultTable.tsx` 상승이유 셀:

- `source_url` 있으면: 요약 텍스트 + 🔗 기사 링크 (새 탭)
- 자동 작성분은 시각적 구분 (예: 옅은 "AI" 뱃지) — 수동 검수 대상임을 표시
- 기존 인라인 편집(EditableCell) 유지: 클릭해서 수정하면 `auto_filled=false`
- `lib/types.ts` `ProcessedStock`에 `sourceUrl`, `autoFilled` 필드 추가, `lib/format.ts` 매핑 반영

## 6. 단계별 마일스톤

### Phase 0 — 선행 정리 (현재 미커밋 작업)
- [ ] `getCollectionDateStr()` 날짜버그 수정분 검증 후 커밋
- [ ] `scripts/fix-date-20260418.mjs` `--dry` → 실제 교정 실행 여부 확인
- [ ] Oracle VM에 최신 코드 반영 (tarball 재배포)

### Phase 1 — 기사 링크 찾기
- [x] 네이버 개발자센터 앱 등록, env 키 발급 (`.env.local`에 NAVER_CLIENT_ID/SECRET)
- [x] DB 마이그레이션 (`source_url`, `source_title`, `auto_filled`, `enriched_at`) — 라이브 DB 적용 완료
- [x] `enrich-reasons.mjs`: 뉴스 검색 + 날짜 필터 + `source_url` 저장까지 (AI 요약 없이)
- [x] UI에 기사 링크 표시 (`ProcessedResultTable.tsx` 상승이유 셀 하단에 🔗 기사제목 링크)
- [x] `--dry`로 최근 수집일 기준 매칭률 확인 — 2026-07-31: 118종목 중 24종목 매칭(~20%), 오류 0건
- [x] 모바일 스레드 UI (종목 행 아래 키워드/상승이유/기사 링크 서브 행)

### Phase 2 — AI 요약
- [x] 기사 본문 추출 (`lib/article.ts` / enrich 내장 로직)
- [x] LLM 요약 → `keyword` + `reason` 자동 작성 (OpenRouter, nemotron-3-super free)
- [x] 프롬프트에 엑셀 실제 사례 few-shot 반영 (개조식 말투)
- [x] auto-extract 뒤에 enrich 자동 실행 연결 (`runEnrich`, 별도 프로세스 격리)
- [ ] Oracle 배포 + env 추가 (NAVER_CLIENT_ID/SECRET, OPENROUTER_API_KEY)

### Phase 3 — 고도화 (선택)
- [ ] UI에서 실패/빈 종목 개별 "재시도" 버튼 (admin)
- [ ] 키워드 기준 테마 그룹핑 뷰 (엑셀의 테마별 묶음 + 그룹 거래대금 합계 재현)
- [ ] 엑셀 다운로드 3-시트 구성: 주식 쉐도잉 / 급등주 쉐도잉(등락률순) / 거래대금 쉐도잉(거래대금순)

## 7. 제약 · 리스크 · 비용

| 항목 | 내용 | 대응 |
|---|---|---|
| 네이버 API 쿼터 | 25,000건/일 무료 | 일 ~25종목이라 여유 충분. 호출 간 200ms throttle |
| 날짜 필터 미지원 | API에 기간 검색 없음 | `pubDate` 클라이언트 필터 (KST 변환 주의) |
| 기사 없는 종목 | 엑셀에도 빈칸 존재 | 빈 상태 유지가 정상. 무리하게 다른 기사 매칭하지 않음 |
| 동명 이슈 | 종목명이 일반 명사인 경우 오매칭 | "특징주" 접두 검색 + 제목 포함 검사로 대부분 걸러짐. Phase 2에서 AI에게 관련성 판단 위임 |
| 본문 스크래핑 | 네이버 개편 시 깨질 수 있음 | 실패 시 제목+description으로 폴백 (요약 품질만 저하, 기능은 유지) |
| Claude 비용 | 일 25건 × 기사 1편 (Haiku) | 월 수백 원 미만 예상 |
| Oracle VM 1GB RAM | OOM 주의 | 순차 처리, 스트리밍/대형 라이브러리 미사용 |
| 수동 입력 보호 | 자동 갱신이 사용자 입력을 덮어쓰면 안 됨 | `auto_filled` 플래그로 구분, 수동 입력 종목은 항상 skip |

## 8. 검증 방법

1. **Phase 1**: `node scripts/enrich-reasons.mjs --date 20260724 --dry` → 25종목 중 기사 매칭 결과 육안 확인 (사용자가 손으로 찾은 결과와 비교)
2. **Phase 2**: 같은 날짜로 실제 실행 → `/dashboard/history`에서 상승이유·링크 확인, 엑셀 수동 정리본과 품질 비교
3. **자동 실행**: Oracle VM에서 다음 평일 15:40 수집 후 `journalctl -u stock-extract.service`로 enrich 로그 확인 → 웹에서 결과 확인
