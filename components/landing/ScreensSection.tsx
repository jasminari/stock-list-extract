import PhoneMockup, { HistoryScreen, QuizScreen, HomeScreen } from "./PhoneMockup";
import Reveal from "./Reveal";

const SCREENS = [
  {
    title: "시장 공부하기",
    desc: "오른 종목과 상승이유, 근거 기사까지 한 화면에서 확인해요.",
    screen: <HistoryScreen />,
  },
  {
    title: "매일 퀴즈",
    desc: "그날의 상승이유로 만든 5문제. 연속 학습일이 쌓여요.",
    screen: <QuizScreen />,
  },
  {
    title: "대시보드",
    desc: "공부한 날이 잔디로 쌓이고, 날짜별로 다시 볼 수 있어요.",
    screen: <HomeScreen />,
  },
];

export default function ScreensSection() {
  return (
    <section id="screens" className="scroll-mt-16 bg-white py-20 md:py-24 lg:py-26">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mb-12 text-center md:mb-14">
            <h2 className="break-keep text-3xl font-extrabold tracking-tight text-gray-900 md:text-[44px]">
              앱에서 이렇게 보여요
            </h2>
            <p className="mt-4 break-keep text-base text-gray-500 md:text-[17px]">
              웹에서 쓰던 화면 그대로, 손에 잡히는 크기로.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {SCREENS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="flex flex-col items-center gap-6">
                <PhoneMockup
                  heightClass="h-[600px] md:h-[630px] lg:h-[750px]"
                  scaleClass="scale-[0.68] md:scale-[0.72] lg:scale-[0.86]"
                >
                  {s.screen}
                </PhoneMockup>
                <div className="max-w-[300px] text-center">
                  <h3 className="mb-2 text-lg font-bold text-gray-900">{s.title}</h3>
                  <p className="break-keep text-sm leading-relaxed text-gray-500">
                    {s.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
