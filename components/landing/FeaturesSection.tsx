import Reveal from "./Reveal";

const features = [
  {
    badge: "NEW",
    title: "AI 상승이유 요약",
    desc: "특징주 기사를 읽고 왜 올랐는지 한두 문장으로 정리해요.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    badge: "NEW",
    title: "특징주 뉴스 링크",
    desc: "근거가 된 기사를 앱 안에서 바로 읽어볼 수 있어요.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
  {
    title: "매일 자동 수집",
    desc: "장 마감 후 급등주를 알아서 모아둬요. 아침이면 준비 완료.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "거래대금 자동 정렬",
    desc: "거래대금 순으로 정렬하고 큰 손이 몰린 종목을 강조해요.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "달력으로 되짚기",
    desc: "공부한 날은 달력에 잔디처럼 쌓여요. 날짜별로 다시 봐요.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: "카카오로 간편 로그인",
    desc: "복잡한 가입 없이 카카오 계정으로 3초 만에 시작해요.",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.463 2 10.735c0 2.76 1.86 5.18 4.65 6.545-.15.522-.966 3.36-.998 3.585 0 0-.02.166.088.23.108.063.235.014.235.014.31-.043 3.593-2.35 4.161-2.752.606.086 1.23.131 1.864.131 5.523 0 10-3.463 10-7.753C22 6.463 17.523 3 12 3z" />
      </svg>
    ),
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              공부는 당신이,
              <br />
              <span className="text-emerald-600">정리는 우리가.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((f, i) => (
            <Reveal key={i} delay={(i % 3) * 0.1}>
              <div className="h-full p-7 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/50 transition-all">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                  {f.badge && (
                    <span className="text-[10px] font-bold bg-emerald-600 text-white rounded px-1.5 py-0.5">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="text-[15px] text-gray-500 leading-relaxed">
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
