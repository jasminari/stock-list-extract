import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              매일 반복하는
              <br />
              종목 정리,
              <br />
              <span className="text-blue-600">자동으로 끝내세요</span>
            </h1>
            <p className="mt-6 text-lg text-gray-500 leading-relaxed">
              키움증권 조건검색 결과를 자동으로 추출하고
              <br className="hidden sm:block" />
              거래대금 정렬, 등락률 컬러코딩, 키워드 메모까지.
              <br className="hidden sm:block" />
              구글 시트에 수동으로 옮기던 작업을 없애세요.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/register"
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                무료로 시작하기
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                바로 사용해보기
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-gray-400">가공 뷰</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="py-2 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">종목명</th>
            <th className="py-2 text-left font-medium">키워드</th>
            <th className="py-2 text-right font-medium">거래대금</th>
            <th className="py-2 text-right font-medium">등락률</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {[
            { name: "삼성전자", keyword: "반도체", amount: "3,200억", rate: "+5.2%", bold: false },
            { name: "SK하이닉스", keyword: "HBM", amount: "2,800억", rate: "+18.3%", bold: true },
            { name: "에코프로", keyword: "2차전지", amount: "1,500억", rate: "+7.1%", bold: false },
            { name: "POSCO홀딩스", keyword: "-", amount: "980억", rate: "+5.8%", bold: false },
          ].map((row, i) => (
            <tr key={i} className={i < 3 ? "border-b border-gray-50" : ""}>
              <td className="py-2 text-gray-400">{i + 1}</td>
              <td className="py-2 font-medium">{row.name}</td>
              <td className={`py-2 ${row.keyword === "-" ? "text-gray-300" : "text-blue-500"}`}>
                {row.keyword}
              </td>
              <td className="py-2 text-right">
                {i < 2 ? (
                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                    {row.amount}
                  </span>
                ) : (
                  row.amount
                )}
              </td>
              <td className={`py-2 text-right ${i < 2 ? "text-red-500" : "text-gray-700"} ${row.bold ? "font-bold" : i === 0 ? "font-medium" : ""}`}>
                {row.rate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
