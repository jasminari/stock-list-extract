# Oracle Cloud 배포 Task

키움 OpenAPI가 **고정 IP에서만 토큰 발급·호출**을 허용하므로, 맥북 대신 Oracle Cloud Free Tier VM에서 `scripts/auto-extract.mjs`를 상시 스케줄링한다.

## 2026-08-29 업데이트 — 매일 퀴즈 탭 (DB 마이그레이션만 해당)

- [x] 운영 DB에 `quiz_attempts` 테이블 생성 (migration 0003) — 컬럼/제약(PK, users FK CASCADE, `(user_id, quiz_date)` UNIQUE) 검증 완료
- VM 배포 대상 **아님**: 수집 스크립트는 그대로이고, 퀴즈는 이미 쌓인 데이터를 읽기만 한다
- 문제는 `(user_id + 날짜)` 시드로 매번 다시 생성하므로 문제·정답을 DB에 저장하지 않는다. 이 테이블에는 점수만 남는다
- 롤백: `DROP TABLE quiz_attempts;` (기존 테이블 영향 없음, 잃는 건 퀴즈 점수 기록뿐)

## 2026-08-25 업데이트 — 거래회전율(상장주식수 수집) 배포 완료

- [x] `scripts/auto-extract.mjs` 갱신 전송 (ka10099로 상장주식수 수집 → `list_count` 저장)
- [x] VM에서 ka10099 호출 검증: 4,305종목 / **877ms** / RSS 72MB (맥북에선 4.8초 — 춘천 리전이라 VM이 5배 빠름)
- [x] 운영 DB에 `list_count` 컬럼 추가 (migration 0002) + 기존 6,572행 소급 백필
- [x] 타이머 정상 (다음 실행 2026-08-26 15:40 KST)
- 새 npm 의존성 없음 (내장 `fetch`만). 백업: `scripts/auto-extract.mjs.bak.<ts>`
- **⚠️ 교훈**: 웹 화면(`lib/kiwoom.ts`)은 조건검색마다 ka10099를 재조회해 요청당 4.8초가 붙었다 → KST 날짜 단위 캐시로 해결. VM 스크립트는 프로세스당 1회라 무관.
- **배포 누락 주의**: `scripts/auto-extract.mjs`를 고쳤는데 VM에 안 보내면 웹 수집분만 값이 채워지고 자동수집분은 조용히 빈 채로 쌓인다. 실제로 8/17~8/25 데이터가 이 상태였다.

## 2026-08-02 업데이트 — 상승이유 자동화 배포 완료

- [x] `scripts/enrich-reasons.mjs` 신규 전송 + `auto-extract.mjs` 갱신 (수집 후 `runEnrich` 자동 실행)
- [x] `/etc/stock-extract.env`에 `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` / `OPENROUTER_API_KEY` 추가 (총 7키)
- [x] VM에서 DB 연결 / 네이버(200) / OpenRouter(200) 인증 검증 완료
- 새 npm 의존성 없음 (기존 `postgres` + 내장 `fetch`). AI 모델: `nvidia/nemotron-3-super-120b-a12b:free` (`ENRICH_MODEL`로 교체 가능)
- **⚠️ 교훈**: env 파일 마지막 줄에 trailing newline 없으면 `tee -a` append 시 첫 키가 앞줄에 접착됨 → append 전 `printf '\n'` 필수. 백업은 `/etc/stock-extract.env.bak.<ts>`

## 현재 상태 (2026-04-26 기준) — **이관 완료**

- [x] Oracle Cloud VM 생성 (`stock-server`, Always Free, Oracle Linux 9.7, **x86_64**, ap-chuncheon-1)
  - RAM 1GB / Disk 30GB (`/dev/mapper/ocivolume-root`)
- [x] Reserved Public IP 확보 (`stock-cron` = **134.185.116.216**)
- [x] 키움 개발자센터 사용 IP 등록 완료
- [x] Node 20.20.2 설치 (`/usr/local/bin/node`, nvm 바이너리 복사)
- [x] 프로젝트 배포: `/home/opc/stock-list-extract` (tarball 방식, git 미설치)
- [x] `.env.local` → `/etc/stock-extract.env` 로 root:root 600 복사
- [x] systemd 유닛 작성 (`/etc/systemd/system/stock-extract.{service,timer}`)
- [x] smoke test 1회 성공 (2026-04-23 KST 15:13~15:47)
- [x] **2026-04-26: `sudo systemctl enable --now stock-extract.timer` 완료**
  - 다음 자동 실행: **2026-04-27(월) 15:40 KST**
- [ ] 맥북 crontab/launchd 비활성화 (`10 20 * * 1-5 cd/Users/...` 깨진 줄 제거)

## 이슈 메모 (내일 이어서)

어제 세션 종료 직전 상태:
1. `curl ... | sudo bash -` 로 NodeSource 레포 등록 후
2. 이어서 `sudo dnf install -y nodejs git` 를 실행하려 했으나 여러 줄 붙여넣기가 bash stdin 에 먹혀 명령이 제대로 실행되지 않음
3. Ctrl+C 도 안 먹히고 SSH 세션이 freeze
4. 재접속 시도 시 `debug1: Local version string SSH-2.0-OpenSSH_10.0` 이후 응답 없음 → **VM OS 자체가 freeze** (1GB RAM OOM 가능성)

**내일 첫 스텝**: OCI 콘솔에서 **Force reboot**.

## 재개 절차

### 0. VM 복구 (내일 이것부터)

- [ ] OCI 콘솔 → Compute → Instances → stock-server → **Actions → Reboot**
  - 다이얼로그 "Force reboot this instance by immediately powering it off" **체크** → Reboot
- [ ] State `Running` 된 뒤 1분 더 대기 (SSH 데몬 기동 시간)
- [ ] SSH 재접속
  ```bash
  ssh -i /Users/jangssukmin/00_personal/Oracle_key/ssh-key-2026-04-19.key opc@134.185.116.216
  ```
- [ ] 메모리 상태 확인: `free -h` → available 500MB 이상이면 OK

### 1. Node.js / git 설치 (한 줄씩, 여러 줄 붙여넣기 금지)

> **중요**: 1GB RAM 이라 OOM 재발 방지 위해 반드시 한 명령씩, 끝난 뒤 다음 명령.

- [ ] nodejs만 먼저
  ```bash
  sudo dnf install -y nodejs
  ```
  `Complete!` 나올 때까지 대기 (30초~1분). 중간에 Enter/붙여넣기 금지.
- [ ] git 별도
  ```bash
  sudo dnf install -y git
  ```
- [ ] 버전 확인
  ```bash
  node -v    # v20.x 기대
  npm -v
  git --version
  ```

**OOM 증상 (프롬프트 안 돌아옴, dmesg 에 `Out of memory` 메시지) 발생 시 대안**:
- 스왑 파일 1GB 추가:
  ```bash
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- 또는 OCI 에서 인스턴스 shape 을 **VM.Standard.A1.Flex** (Ampere 1 OCPU / 6GB Always Free) 로 변경

### 2. 프로젝트 배포

- [ ] Repo clone
  ```bash
  cd ~
  git clone <repo-url> stock-list-extract
  cd stock-list-extract
  npm ci --omit=dev
  ```
  - Private 이면 GitHub fine-grained PAT 또는 deploy key 필요
- [ ] `.env.local` 전달 — **맥북 로컬에서** scp 로 보내기:
  ```bash
  scp -i /Users/jangssukmin/00_personal/Oracle_key/ssh-key-2026-04-19.key \
    /Users/jangssukmin/github/stock-list-extract/.env.local \
    opc@134.185.116.216:~/stock-list-extract/.env.local
  ```
- [ ] VM 에서 권한 제한
  ```bash
  chmod 600 ~/stock-list-extract/.env.local
  ```
- [ ] 스모크 테스트
  ```bash
  cd ~/stock-list-extract
  node scripts/auto-extract.mjs
  ```
  - Supabase `extraction_logs` 에 해당 날짜 레코드 들어오면 성공

### 3. systemd timer 구성

평일 15:40 KST 수집 (장마감 직후 반영 딜레이 10분 감안).

- [ ] `/etc/systemd/system/stock-extract.service`
  ```ini
  [Unit]
  Description=Stock auto-extract (Kiwoom)
  After=network-online.target
  Wants=network-online.target

  [Service]
  Type=oneshot
  User=opc
  WorkingDirectory=/home/opc/stock-list-extract
  EnvironmentFile=/home/opc/stock-list-extract/.env.local
  Environment=TZ=Asia/Seoul
  ExecStart=/usr/bin/node scripts/auto-extract.mjs
  StandardOutput=journal
  StandardError=journal
  ```

- [ ] `/etc/systemd/system/stock-extract.timer`
  ```ini
  [Unit]
  Description=Run stock-extract on weekdays after market close

  [Timer]
  OnCalendar=Mon..Fri *-*-* 15:40:00 Asia/Seoul
  Persistent=true

  [Install]
  WantedBy=timers.target
  ```

- [ ] 활성화
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable --now stock-extract.timer
  systemctl list-timers | grep stock-extract
  ```

### 4. 로그 / 운영

- [ ] 실행 로그: `journalctl -u stock-extract.service -f`
- [ ] 실패 알림 (선택): `OnFailure=...` + Slack webhook
- [ ] 디스크 / 메모리 사용량 점검 일정

### 5. 정리

- [ ] 기존 맥북 crontab / launchd 비활성화
- [ ] (해당 시) Vercel cron 비활성화 — `/app/api/cron/extract/route.ts` 는 수동 트리거용으로 유지
- [ ] README 에 "수집기 서버: Oracle stock-server(134.185.116.216)" 한 줄 추가

## 작업 팁 (교훈)

- **SSH 에서 여러 줄 명령 한꺼번에 붙여넣지 말 것.** 앞 명령이 stdin 을 소비하는 파이프(예: `curl | sudo bash -`)이면 뒤 줄들이 그 프로세스 입력으로 흡수되어 실행 안 됨.
- **1GB RAM VM 은 dnf install 도 무거움.** 스왑 없으면 OOM 으로 VM 자체가 freeze 될 수 있음.
- **Ctrl+C 안 먹힐 때** SSH escape 시퀀스: `Enter` → `~` → `.` (세션만 끊고 로컬로 복귀)

## 참고

- OCI Always Free Ampere (A1.Flex): 4 OCPU / 24GB RAM 까지 무료. 현재 쓰는 shape 은 x86 Micro(1GB)로 보이므로, 메모리 문제 계속되면 Ampere 로 변경 고려.
- Reserved Public IP 는 Always Free 1개 무료. 추가 할당 시 과금 — 현재 `stock-cron` 1개만 유지 중 (정상).
