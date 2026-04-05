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


