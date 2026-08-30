import Reveal from "./Reveal";

const FEATURES = [
  {
    title: "AI 상승이유 요약",
    desc: "특징주 기사를 읽고 왜 올랐는지 한두 문장으로 정리해요.",
    badge: "NEW",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    ),
  },
  {
    title: "매일 퀴즈",
    desc: "오늘 오른 종목의 상승이유로 5문제. 연속 학습일이 쌓여요.",
    badge: "NEW",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "매일 자동 수집",
    desc: "장 마감 후 급등주를 알아서 모아둬요. 아침이면 준비 완료.",
    badge: null,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
];

export default function AppFeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="mb-12 break-keep text-center text-3xl font-extrabold tracking-tight text-gray-900 md:mb-14 md:text-[44px]">
            공부는 당신이,
            <br />
            <span className="text-indigo-600">정리는 우리가.</span>
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-gray-200 bg-white p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg
                    className="h-[26px] w-[26px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {f.icon}
                  </svg>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                  {f.badge && (
                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="break-keep text-[15px] leading-relaxed text-gray-500">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
