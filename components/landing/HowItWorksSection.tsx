const steps = [
  { step: "01", title: "회원가입", desc: "간단한 ID/PW로 계정을 생성합니다" },
  { step: "02", title: "조건검색 실행", desc: "키움증권에 등록된 조건식을 선택하고 실행합니다" },
  { step: "03", title: "결과 확인 & 메모", desc: "자동 정렬된 결과에 키워드와 상승이유를 기록합니다" },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">사용 방법</h2>
          <p className="mt-4 text-gray-500">3단계로 바로 시작하세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
