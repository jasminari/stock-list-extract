import Reveal from "./Reveal";

/** 날짜가 정해지면 badge의 대괄호 표기를 실제 일정으로 바꾸면 된다. */
const STEPS = [
  {
    no: "01",
    title: "웹 서비스 운영 중",
    desc: "매일 장 마감 후 급등주를 모으고 상승이유를 정리하고 있어요. 지금 바로 체험할 수 있습니다.",
    badge: "진행 중",
    active: true,
  },
  {
    no: "02",
    title: "앱 비공개 베타",
    desc: "출시 알림을 신청하신 분들께 먼저 초대장을 보내드려요.",
    badge: "[베타 시작 예정]",
    active: false,
  },
  {
    no: "03",
    title: "App Store · Google Play",
    desc: "iOS와 Android에 정식 출시합니다.",
    badge: "[출시 예정]",
    active: false,
  },
];

export default function RoadmapSection() {
  return (
    <section id="roadmap" className="scroll-mt-16 bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mb-12 text-center md:mb-14">
            <h2 className="break-keep text-3xl font-extrabold tracking-tight text-gray-900 md:text-[44px]">
              앱 출시까지, 지금 여기
            </h2>
            <p className="mt-4 break-keep text-base text-gray-500 md:text-[17px]">
              출시 전까지 웹 서비스는 매일 그대로 돌아갑니다.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.no} delay={i * 0.1}>
              <div
                className={`flex h-full flex-col gap-3.5 rounded-2xl border bg-white p-7 ${
                  s.active ? "border-indigo-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-base font-extrabold ${
                      s.active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {s.no}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      s.active
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.badge}
                  </span>
                </div>
                <h3 className="text-[19px] font-bold text-gray-900">{s.title}</h3>
                <p className="break-keep text-[15px] leading-relaxed text-gray-500">
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
