import Reveal from "./Reveal";

const steps = [
  {
    step: "01",
    title: "카카오로 로그인",
    desc: "3초면 시작해요.",
  },
  {
    step: "02",
    title: "매일 자동 수집",
    desc: "급등주와 상승이유가 알아서 쌓여요.",
  },
  {
    step: "03",
    title: "시장 공부하기",
    desc: "왜 올랐는지 확인하고 나만의 메모를 더해요.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-24 md:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              세 걸음이면 충분해요
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.12}>
              <div className="relative text-center px-4">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-xl font-extrabold shadow-lg shadow-indigo-600/25">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
