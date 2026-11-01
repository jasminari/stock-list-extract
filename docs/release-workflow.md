# dev 검증 후 운영 배포

## 환경

- 운영: https://stock-list-extract.vercel.app (Vercel stock-list-extract)
- dev: https://stock-list-extract-dev.vercel.app/dev/market (별도 Vercel stock-list-extract-dev)
- dev만 `DEV_PREVIEW=1`. 운영 DB·DART·수집·인증 키를 dev로 복사하지 않는다.
- 현재 dev는 공개 시장 데이터 fixture를 사용하는 읽기 전용 UI 검증 환경이다. 로그인·관심종목 쓰기·자동수집 전체 통합환경은 아니다. 해당 기능을 검증하려면 별도 테스트 DB와 테스트 계정을 먼저 구성한다.
- `/dev/market`은 DEV_PREVIEW가 없는 운영에서 404다. dev의 데이터 쓰기 및 사용자 API는 차단한다. 기사 본문 GET만 허용한다.

## 배포 순서

1. 작업별 변경 파일과 최신 운영 커밋을 확인한다. 관계없는 미완료 파일을 릴리스에 포함하지 않는다.
2. `npm run test:news`, `npm run test:push`, `npm run build`를 실행한다. 동일 검사를 실행할 GitHub Actions 정의는 `docs/ci-quality.yml`에 준비되어 있다. 현재 GitHub 계정의 workflow 권한이 없어 자동 실행은 아직 연결하지 않았다. 권한을 갖춘 계정에서 `.github/workflows/quality.yml`로 옮겨 등록한다. 그 전에는 아래 검사를 수동으로 실행한다.
3. 일별 기사 처리는 `node scripts/enrich-reasons.mjs --date YYYYMMDD --dry --force --report <검증파일>`로 먼저 실행한다. 기사·자료 날짜, 동일 회사, 계획/완료, 테마 제외, DART 날짜를 확인한다.
4. 개인 정보 없는 공개 종목 fixture만 dev에 갱신한다. dev 프로젝트로 명시적으로 link한 별도 릴리스 폴더에서 배포한다. `DEV_PREVIEW=1`이 dev에만 있는지 확인한다.
5. dev 실제 화면에서 7열, 20종목, 우선순위, 원문 링크, 정렬, 모바일 표시를 확인하고 캡처를 남긴다. DB 변경은 트랜잭션 검증 후 rollback하여 기존 주석 불변을 확인한다.
6. 추가형 migration을 먼저 적용한다. 검토한 일별 데이터는 별도 관련 재료 테이블에 반영하고 상승이유 주석을 덮어쓰지 않는다.
7. 동일 소스를 운영 프로젝트에 `vercel deploy --prod --skip-domain`으로 배포한다. 준비된 빌드를 점검한 뒤 `vercel promote <검증한 배포 URL>`로 운영 도메인을 전환한다. DEV_PREVIEW를 운영에 설정하지 않는다.
8. 인증된 운영 화면과 20종목을 재확인한다. 실패 시 이전 Ready 배포로 rollback하고 additive 테이블은 보존한다.
9. Oracle 수집 모듈은 기존 파일 백업 후 동일 검증본으로 교체한다. timer를 중복 실행하지 않고, 다음 자동수집 결과를 실제 화면까지 점검한다.

main의 Git 자동 배포는 vercel.json에서 비활성화했다. 코드 push가 운영 도메인을 즉시 바꾸지 않도록 하고, 검증 완료 후 명시적으로 승격한다. dev 프로젝트의 production 환경은 dev 도메인을 뜻하며 실제 서비스 운영과는 별도다.

## 표시 규칙

1. 기사에서 당일 상승과 명시적으로 연결된 기업 고유 재료: **상승 배경**.
2. 당일 상승과의 연결은 확인되지 않았으나 당일 기사에 최근 7일 이내 구체적 기업 사건이 있음: **관련 재료**. 자료 기준일과 보도일을 구분하고 연결 미확인 안내를 표시한다.
3. 위 둘이 없으면 리스트 날짜 이전 DART 공시의 **사업 소개**.

테마 동반상승·다른 회사 사건·일반 기대만 있는 글은 제외한다. 같은 날 보도됐다는 이유만으로 상승 배경으로 올리지 않는다. 관련 재료는 stock_related_materials, 사업 소개는 stock_business_profiles에 독립 저장한다.
