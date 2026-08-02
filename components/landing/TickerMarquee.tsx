const TICKER = [
  { name: "삼성전자", rate: "+2.68%", up: true },
  { name: "SK하이닉스", rate: "+3.00%", up: true },
  { name: "LG에너지솔루션", rate: "-0.42%", up: false },
  { name: "삼성바이오로직스", rate: "+1.01%", up: true },
  { name: "현대차", rate: "+1.05%", up: true },
  { name: "기아", rate: "+0.88%", up: true },
  { name: "셀트리온", rate: "-0.31%", up: false },
  { name: "NAVER", rate: "+0.68%", up: true },
  { name: "카카오", rate: "+2.14%", up: true },
  { name: "POSCO홀딩스", rate: "+4.68%", up: true },
  { name: "삼성SDI", rate: "+1.07%", up: true },
  { name: "LG화학", rate: "-0.55%", up: false },
  { name: "한화에어로스페이스", rate: "+0.22%", up: true },
  { name: "KB금융", rate: "+0.07%", up: true },
  { name: "하나금융지주", rate: "+0.15%", up: true },
  { name: "삼성물산", rate: "+1.96%", up: true },
];

function Chip({ name, rate, up }: { name: string; rate: string; up: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 mx-1.5 rounded-full bg-white border border-gray-200 whitespace-nowrap">
      <span className="text-sm font-semibold text-gray-800">{name}</span>
      <span
        className={`text-xs font-bold ${up ? "text-red-500" : "text-blue-500"}`}
      >
        {rate}
      </span>
    </div>
  );
}

/** KOSPI 대형주 종목이 좌우로 흐르는 티커 (무한 루프) */
export default function TickerMarquee() {
  return (
    <div className="ticker-mask overflow-hidden py-2">
      <div className="flex w-max animate-ticker">
        {[...TICKER, ...TICKER].map((t, i) => (
          <Chip key={i} {...t} />
        ))}
      </div>
    </div>
  );
}
