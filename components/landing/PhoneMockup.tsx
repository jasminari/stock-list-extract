import type { ReactNode } from "react";

/**
 * 랜딩용 모바일 기기 목업.
 *
 * 화면 안의 수치(헤더 56px, 탭바 아이콘 20px, 색상 등)는 실제 앱
 * (app/dashboard/layout.tsx, components/ProcessedResultTable.tsx,
 * app/dashboard/quiz/page.tsx, ContributionGraph)에서 그대로 가져온 값이다.
 * 앱 UI가 바뀌면 여기도 같이 손봐야 실제와 어긋나지 않는다.
 *
 * 실기기에서는 상태바와 키보드가 레이아웃 위에 얹히므로 가짜로 그리지 않는다.
 */

const ICON = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  book: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  quiz: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  gearDot: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  clipboard:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  chevron: "M19 9l-7 7-7-7",
  link: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
};

function Icon({
  path,
  className = "w-5 h-5",
  strokeWidth = 2,
}: {
  path: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={`${className} flex-shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

type TabId = "home" | "history" | "quiz" | "settings";

const TABS: { id: TabId; label: string; path: string }[] = [
  { id: "home", label: "홈", path: ICON.home },
  { id: "history", label: "시장 공부하기", path: ICON.book },
  { id: "quiz", label: "매일 퀴즈", path: ICON.quiz },
  { id: "settings", label: "설정", path: ICON.gear },
];

/** 하단 탭바. withTip을 켜면 매일 퀴즈 위에 신규 기능 말풍선이 뜬다. */
function TabBar({ active, withTip = false }: { active: TabId; withTip?: boolean }) {
  return (
    <div className="flex items-center justify-around border-t border-gray-200 bg-white px-1 pb-3 pt-1">
      {TABS.map((tab) => {
        const color = tab.id === active ? "text-indigo-600" : "text-gray-400";
        return (
          <div
            key={tab.id}
            className={`relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 ${color}`}
          >
            {withTip && tab.id === "quiz" && (
              <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-indigo-600/30">
                새로운 기능
                <span className="absolute left-1/2 top-full -ml-1 -mt-1 h-2 w-2 rotate-45 bg-indigo-600" />
              </span>
            )}
            {tab.id === "settings" ? (
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={ICON.gear} />
                <path strokeLinecap="round" strokeLinejoin="round" d={ICON.gearDot} />
              </svg>
            ) : (
              <Icon path={tab.path} />
            )}
            <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 상단 헤더 (모바일에서는 검색창이 숨겨진다 — 실제 앱과 동일) */
function AppHeader() {
  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 px-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
        <Icon path={ICON.clipboard} className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600">
          로그아웃
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-[13px] font-medium text-white">
          J
        </div>
      </div>
    </div>
  );
}

const STOCKS = [
  {
    name: "두산에너빌리티",
    amount: "9,019억",
    hotAmount: true,
    rate: "+7.62%",
    hotRate: false,
    keyword: "체코 원전",
    reason: "체코 원전 계약금지 가처분 취소 판결에 급등",
    article: "두산에너빌리티, 체코 원전 본계약 재개 기대",
  },
  {
    name: "한전기술",
    amount: "2,048억",
    hotAmount: true,
    rate: "+19.80%",
    hotRate: true,
    keyword: "체코 계약",
    reason: "25조 규모 체코 신규 원전 계약 체결 소식",
    article: "한전기술 상한가 근접… 체코 원전 수주 기대감",
  },
  {
    name: "삼성전기",
    amount: "1,246억",
    hotAmount: false,
    rate: "+8.46%",
    hotRate: false,
    keyword: "애플 유리기판",
    reason: "애플과 유리기판 공급 협의 진행 소식",
    article: null,
  },
];

/** 시장 공부하기 — 종목 아래에 상승이유가 스레드처럼 붙는 모바일 레이아웃 */
export function HistoryScreen() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <AppHeader />

      <div className="border-b border-gray-200 px-3 py-2.5">
        <div className="inline-flex items-center gap-2 rounded-[10px] border border-gray-200 px-3 py-2 text-gray-400">
          <Icon path={ICON.calendar} className="h-4 w-4" />
          <span className="text-[13px] font-bold text-gray-900">
            2026년 8월 28일 금요일
          </span>
          <Icon path={ICON.chevron} className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                가공 데이터 <span className="font-bold text-indigo-600">50</span>종목
              </span>
              <span className="text-[10px] text-gray-400">장중급등</span>
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400">2026년 08월 28일</p>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-2 text-[10px] text-gray-500">
            <span className="flex-1">종목명</span>
            <span className="w-[62px] text-right">거래대금</span>
            <span className="w-[58px] text-right">등락률</span>
          </div>

          {STOCKS.map((s) => (
            <div key={s.name} className="border-t border-gray-100 px-2 pb-2 pt-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs font-medium text-gray-900">{s.name}</span>
                <span
                  className={`w-[62px] rounded px-1 py-0.5 text-right text-xs font-medium ${
                    s.hotAmount ? "bg-orange-100 text-orange-700" : "text-gray-700"
                  }`}
                >
                  {s.amount}
                </span>
                <span
                  className={`w-[58px] text-right text-xs font-medium ${
                    s.hotRate ? "text-red-500" : "text-gray-700"
                  }`}
                >
                  {s.rate}
                </span>
              </div>
              <div className="ml-1 mt-1.5 flex flex-col gap-1 border-l-2 border-indigo-200 pl-2.5">
                <span className="self-start rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                  {s.keyword}
                </span>
                <p className="text-[11px] leading-snug text-gray-600">{s.reason}</p>
                {s.article && (
                  <div className="flex items-center gap-1 overflow-hidden text-[11px] text-indigo-500">
                    <Icon path={ICON.link} className="h-3 w-3" />
                    <span className="truncate">{s.article}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {[
            { name: "금호건설", amount: "412억", rate: "+4.21%" },
            { name: "삼성SDI", amount: "1,880억", rate: "+3.09%" },
          ].map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 border-t border-gray-100 px-2 py-2.5"
            >
              <span className="flex-1 text-xs font-medium text-gray-900">{s.name}</span>
              <span className="w-[62px] text-right text-xs text-gray-700">{s.amount}</span>
              <span className="w-[58px] text-right text-xs font-medium text-gray-700">
                {s.rate}
              </span>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="history" withTip />
    </div>
  );
}

const CHOICES = [
  { no: "1", text: "체코 신규 원전 계약 체결 소식", selected: false },
  { no: "2", text: "분기 실적이 시장 기대를 넘었다", selected: true },
  { no: "3", text: "대주주 지분 매각 공시", selected: false },
  { no: "4", text: "코스피 지수 편입 결정", selected: false },
];

/** 매일 퀴즈 — 상승이유를 묻는 4지선다 */
export function QuizScreen() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <AppHeader />

      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">2 / 5</span>
            <span className="text-xs text-gray-400">오늘의 퀴즈</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-2/5 rounded-full bg-indigo-600" />
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-orange-600">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2c.5 3.5-1.5 4.5-3 6.5C7.3 10.7 6 12.4 6 14.5A6 6 0 0018 15c0-3.5-2.5-5-3.5-7.5-.7-1.7-1-3.5-2.5-5.5zm0 17a3 3 0 01-3-3c0-1.4 1-2.4 1.8-3.4.6-.8 1.2-1.6 1.2-2.6 1 1.3 2 2 2.6 3 .4.7.4 1.4.4 2a3 3 0 01-3 4z" />
          </svg>
          <span className="text-sm font-bold">7</span>
          <span className="text-xs">일</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 pt-2">
        <div className="mb-3 inline-block rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
          상승이유
        </div>
        <h2 className="mb-4 text-lg font-bold leading-snug text-gray-900">
          8월 28일 한전기술이 19.8% 오른 이유는?
        </h2>
        <div className="mb-5 rounded-xl border-l-4 border-indigo-200 bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-600">
          거래대금 2,048억 · 종가 78,300원 · 회전율 24.1%
        </div>
        <div className="flex flex-col gap-2.5">
          {CHOICES.map((c) => (
            <div
              key={c.no}
              className={`flex items-start gap-3 rounded-2xl border-2 border-b-4 px-4 py-3.5 text-sm font-medium leading-relaxed ${
                c.selected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  c.selected ? "bg-white/70 text-current" : "bg-gray-100 text-gray-400"
                }`}
              >
                {c.no}
              </span>
              <span className="flex-1">{c.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="rounded-xl bg-indigo-600 py-3.5 text-center text-sm font-bold text-white">
          확인
        </div>
      </div>

      <TabBar active="quiz" />
    </div>
  );
}

// ContributionGraph와 같은 GitHub 잔디 색상 스케일
const GRASS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const GRASS_SEQ = [
  0, 1, 0, 2, 3, 1, 0, 1, 2, 4, 3, 0, 0, 1, 2, 3, 3, 1, 0, 1, 2, 4, 3, 2, 1, 0, 0, 1,
  0, 2, 3, 4, 2, 1, 0, 1, 1, 2, 3, 4, 2, 0, 0, 1, 2, 2, 3, 1, 0, 2, 3, 4, 4, 2, 1, 0,
  1, 0, 2, 3, 2, 0, 1, 3, 4, 2, 1, 1, 0, 0, 0, 1, 3, 2, 4, 1, 0, 2, 2, 1, 0, 3, 4, 1,
];

/** 대시보드 — 공부한 날이 잔디로 쌓인다 */
export function HomeScreen() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <AppHeader />

      <div className="flex-1 overflow-hidden px-4 py-5">
        <h1 className="mb-0.5 text-xl font-bold text-gray-900">대시보드</h1>
        <p className="mb-5 text-xs text-gray-500">종목 상승이유 기여 현황</p>

        <div className="mb-5 flex gap-3">
          <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2.5 text-[11px] text-gray-400">올해 138일 기록</div>
            <div className="flex gap-[3px]">
              {Array.from({ length: 12 }, (_, c) => (
                <div key={c} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }, (_, r) => (
                    <div
                      key={r}
                      className="h-[11px] w-[11px] rounded-[2px]"
                      style={{
                        background: GRASS[GRASS_SEQ[(c * 7 + r) % GRASS_SEQ.length]],
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white">
              2026
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600">
              2025
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {[
            {
              path: ICON.search,
              bg: "bg-indigo-50",
              color: "text-indigo-500",
              title: "조건검색 실행",
              desc: "키움 REST API로 종목 추출",
            },
            {
              path: ICON.clock,
              bg: "bg-green-50",
              color: "text-green-500",
              title: "저장 이력",
              desc: "날짜별로 다시 보기",
            },
          ].map((a) => (
            <div
              key={a.title}
              className="flex flex-1 flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-3.5"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} ${a.color}`}
              >
                <Icon path={a.path} className="h-[22px] w-[22px]" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-gray-900">{a.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  {a.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="home" />
    </div>
  );
}

/**
 * 기기 프레임. 화면은 390x844(실제 크기)로 그리고 바깥에서 축소해
 * 어떤 뷰포트에서도 앱과 같은 비율·글자 크기로 보이게 한다.
 *
 * @param heightClass 축소된 높이만큼 자리를 잡아주는 래퍼 높이
 * @param scaleClass  축소 비율 (transform-origin은 top)
 */
export default function PhoneMockup({
  children,
  heightClass,
  scaleClass,
}: {
  children: ReactNode;
  heightClass: string;
  scaleClass: string;
}) {
  return (
    <div className={`flex w-full justify-center ${heightClass}`}>
      <div className={`origin-top ${scaleClass}`}>
        <div className="w-[406px] rounded-[48px] bg-gray-900 p-2 shadow-[0_40px_70px_-30px_rgba(17,24,39,0.45)]">
          <div className="flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-white">
            {/* 실기기의 상태바 자리 — 가짜 상태바는 그리지 않는다 */}
            <div className="h-11 flex-shrink-0 bg-white" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
