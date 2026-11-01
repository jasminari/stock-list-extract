# Stock List Extract

Next.js 16 프로젝트 with App Router, shadcn/ui, and Framer Motion

## 기술 스택

- **Next.js 16** - React 프레임워크 (App Router)
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **shadcn/ui** - 재사용 가능한 컴포넌트 라이브러리
- **Framer Motion** - 애니메이션 라이브러리

## 시작하기

### 의존성 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

## shadcn/ui 컴포넌트 추가

새로운 shadcn/ui 컴포넌트를 추가하려면:

```bash
npx shadcn@latest add [component-name]
```

예시:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## 프로젝트 구조

```
.
├── app/              # App Router 디렉토리
│   ├── layout.tsx   # 루트 레이아웃
│   ├── page.tsx     # 홈 페이지
│   └── globals.css  # 전역 스타일
├── components/       # React 컴포넌트
│   └── ui/          # shadcn/ui 컴포넌트
├── lib/             # 유틸리티 함수
└── public/          # 정적 파일
```



### 뉴스 재료 매칭 검증

뉴스 수집은 `scripts/lib/news-search.mjs`, 회사 식별·후보 선택은
`scripts/lib/news-selection.mjs`에서 처리합니다. 기사 보기 API와 배치 작업은
`lib/article-core.mjs`의 같은 본문 추출기를 사용합니다. UI와 annotation 필드 구조는 유지합니다.

- 종목명/특징주 검색 결과를 합치고, 같은 날의 기사만 비교합니다.
- 회사명 접두사 혼동, 스포츠, 시세 집계, 비교 대상 회사, 다른 회사가 주체인 제목을 제외합니다.
- 제목에 해당 회사가 명시되고 본문에도 회사와 재료가 함께 확인되는 후보만 채택합니다.
- 본문 추출 실패 시 다음 후보/원문 URL을 시도합니다. 제목만으로 요약하지 않습니다.
- 최대 검색 범위에 도달하면 `searchIncomplete`를 기록합니다. 미확인은 재료가 없다는 뜻이 아닙니다.
- AI 요약 실패 시 기존 annotation을 덮어쓰지 않습니다. 수동 입력 보호는 유지합니다.

```sh
npm run test:news
node scripts/enrich-reasons.mjs --date 20261019 --dry --force --no-ai --report output/crawl-report.json
node scripts/compare-news.mjs --date 20261019 --baseline output/material-preview-20261019/original.json
node scripts/compare-news.mjs --date 20261019 --replay
```

`compare-news.mjs`는 실제 배치의 선택 함수를 사용하며 DB에 쓰지 않습니다.
비교 결과·검색 후보·검사한 본문은 `output/news-comparison-날짜/`에 저장합니다.
`--replay`는 동일 날짜·baseline의 저장된 입력으로 재현합니다. 후보 범위나 본문이 달라졌다면
새 live 실행이 필요합니다. 비교 수치는 기사 선택 결과이며 AI 요약 정확도나 전체 재료 발견률이 아닙니다.

### 당일 상승 근거 확인

`findMaterialArticle`은 이제 본문에서 회사명·재료·상승 연결 표현이 함께 확인되는 당일 기사만 선택한다. 단순 관련 뉴스, 향후 주가 전망, 과거 상승, 타사 재료는 상승이유로 채우지 않는다. 상승 연결 후보를 먼저 검증하고 최대 12개 본문을 확인한다. 기사상 연결 근거이며 가격 인과관계의 확증은 아니다. 문장이 나뉘거나 별칭을 쓴 경우 누락될 수 있다.

정상 검색 후 채택 기사가 없으면 자동 작성 항목의 키워드/상승이유를 `미확인`으로 저장한다. 수동 입력 보호와 기본 기존 완성 항목 건너뛰기는 유지되므로 기존 자동 항목 재검증에는 `--force`가 필요하다. 검색 예외나 AI 호출 실패 시 기존 값을 보존한다. 초기 비교 실행은 DB에 쓰지 않았으며, 이후 사용자 요청에 따라 10월 19일 결과에 검증된 뉴스와 사업 소개를 적용했다.

`output/rise-comparison-20261019/rise-comparison.html`에 직전 관련기사 요약과 새 상승 근거 판정을 비교했다. 원문 캐시를 이용한 재현: `node scripts/compare-news.mjs --date 20261019 --out output/rise-comparison-20261019 --replay` 후 `node scripts/render-rise-comparison.mjs`. 새 보고서는 AI 생성 문장 대신 판정 근거 문장을 표시한다.


### 기사 없는 종목의 DART 사업 소개

테마·업종 동반상승 기사와 정책·테마만으로 설명하는 기사는 제외한다. 개별 재료 기사 요약이 없으면 기존 표의 키워드/상승이유 자리에 `사업 소개`를 표시한다. 사업 설명을 상승 원인으로 저장하거나 뉴스 링크로 사용하지 않는다. 내부 `미확인` 값은 화면에 노출하지 않는다.

- `stock_business_profiles`에 종목코드·공시 접수번호별 요약, 출처, 근거를 별도 저장한다. 배포 시 `0007_add_business_profiles.sql` 마이그레이션이 필요하다.
- 리스트 날짜까지 제출된 정기보고서의 사업 내용을 사용한다. 삼성전자우는 명시적으로 삼성전자 발행사 공시에 연결한다.
- `enrich-reasons.mjs`는 채택 기사가 없는 종목에 DART 수집과 AI 사업 요약을 실행한다. 같은 공시 요약은 재사용하며, `--no-ai`에서는 사업 요약도 생성하지 않는다. DART_API_KEY와 OPENROUTER_API_KEY가 필요하다.
- 10월 19일의 51개 사업 소개는 DART 원문에서 직접 작성·검토하고 근거 문자열을 검증한 초기 데이터다. 자동 요약 API 호출 결과로 가장하지 않도록 `assistant-reviewed-dart-excerpt` 출처를 저장한다. 향후 자동 요약 API 실패 시 기존 소개를 유지한다.

```sh
node scripts/collect-dart-business.mjs 20261019
# evidence.json을 근거로 summaries.json 작성·검토 후:
node scripts/apply-business-profiles.mjs 20261019 --apply
```

2026-10-19 화면 검증: 54행, 기존 7열, 개별 기사 3개, DART 사업 소개 51개. 캡처: `output/dart-business-20261019/actual-table-desktop.png`.

### 표시 우선순위와 dev 배포

당일 상승 배경이 기사에서 확인되면 `상승 배경`, 상승 인과는 확인되지 않았지만 최근 구체적 회사 사건이 있으면 `관련 재료`, 둘 다 없으면 `DART 사업 소개`를 표시한다. 관련 재료는 별도 테이블에 저장하며 테마 동반상승은 계속 제외한다.

운영 전 검증: [dev 시장 공부하기](https://stock-list-extract-dev.vercel.app/dev/market). 공개 시장 데이터 기반의 읽기 전용 검증 환경이며 운영 DB와 연결하지 않는다. [배포 절차](docs/release-workflow.md)에 따라 테스트·dev 화면 확인 후 운영 후보 빌드를 승격한다.
