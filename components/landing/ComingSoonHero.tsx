import Link from "next/link";
import PhoneMockup, { HistoryScreen } from "./PhoneMockup";
import TickerMarquee from "./TickerMarquee";
import Reveal from "./Reveal";

/** 앱 출시 전 랜딩 히어로 — 기기 목업과 '체험하기' CTA */
export default function ComingSoonHero() {
  return (
    <section className="relative overflow-x-clip bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-16 md:pb-16 md:pt-20">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-14">
          <Reveal className="w-full lg:w-[596px] lg:flex-shrink-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3.5 py-1.5 text-[13px] font-bold text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              iOS · Android 앱 출시 준비 중
            </span>

            <h1 className="mt-7 break-keep text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 md:text-5xl lg:text-[62px]">
              오늘 오른 종목,
              <br />
              <span className="text-indigo-600">왜 올랐는지</span>까지
              <br />
              주머니 속에서.
            </h1>

            <p className="mt-6 break-keep text-base leading-relaxed text-gray-500 md:text-lg lg:text-[19px]">
              장 마감 후 급등주를 자동으로 모으고, 특징주 기사를 찾아 상승이유를
              정리합니다.
              <br className="hidden lg:block" /> 모바일 앱은 준비 중이에요 — 웹에서는
              지금 바로 써볼 수 있어요.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-[17px] font-bold text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-700"
              >
                체험하기
                <svg
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <a
                href="#notify"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-7 py-4 text-[17px] font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                출시 알림 받기
              </a>
            </div>

            <p className="mt-4 text-[13px] text-gray-400">
              카카오 로그인 3초 · 오늘 데이터까지 그대로 열려 있어요
            </p>
          </Reveal>

          <Reveal delay={0.15} className="relative w-full min-w-0 lg:flex-1">
            <PhoneMockup
              heightClass="h-[600px] sm:h-[700px] lg:h-[880px]"
              scaleClass="scale-[0.68] sm:scale-[0.8] lg:scale-100"
            >
              <HistoryScreen />
            </PhoneMockup>

            {/* 매일 퀴즈 미리보기 — 기기 왼쪽에 겹쳐 띄운다 */}
            <div className="pointer-events-none absolute -left-2 bottom-6 hidden w-[264px] rounded-[20px] border border-gray-200 bg-white p-[18px] shadow-2xl shadow-gray-300/40 sm:block lg:-left-9 lg:bottom-24">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-indigo-50">
                  <svg
                    className="h-[18px] w-[18px] text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-bold text-indigo-600">매일 퀴즈</span>
                <span className="ml-auto text-[11px] text-gray-400">5문제 · 3분</span>
              </div>
              <p className="text-sm font-bold leading-snug text-gray-900">
                8월 28일 한전기술이
                <br />
                19.8% 오른 이유는?
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold text-indigo-700">
                  체코 신규 원전 계약 체결
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* KOSPI 종목 티커 */}
      <div className="pb-14 md:pb-20">
        <TickerMarquee />
      </div>
    </section>
  );
}
