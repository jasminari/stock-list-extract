import { motion } from "framer-motion";
import type { StockResult } from "@/lib/types";

function formatNumber(val: string) {
  const n = Number(val.replace(/^[+-]/, ""));
  return isNaN(n) ? val : n.toLocaleString();
}

function ChangeCell({ sign, value, rate }: { sign: string; value: string; rate: string }) {
  const isUp = sign === "2";
  const isDown = sign === "5";
  const color = isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-500";
  const prefix = isUp ? "+" : isDown ? "-" : "";
  return (
    <span className={color}>
      {prefix}{formatNumber(value)} ({rate.replace(/^[+-]/, "")}%)
    </span>
  );
}

interface RawResultTableProps {
  stocks: StockResult[];
  conditionName: string;
}

export default function RawResultTable({ stocks, conditionName }: RawResultTableProps) {
  if (stocks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          원본 데이터{" "}
          <span className="text-blue-600 font-bold">{stocks.length}</span>
          종목
        </h2>
        <span className="text-xs text-gray-400">{conditionName}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="px-4 py-3 text-left font-medium">종목코드</th>
              <th className="px-4 py-3 text-left font-medium">종목명</th>
              <th className="px-4 py-3 text-right font-medium">현재가</th>
              <th className="px-4 py-3 text-right font-medium">전일대비</th>
              <th className="px-4 py-3 text-right font-medium">거래량</th>
              <th className="px-4 py-3 text-right font-medium">시가</th>
              <th className="px-4 py-3 text-right font-medium">고가</th>
              <th className="px-4 py-3 text-right font-medium">저가</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stocks.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{s.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatNumber(s.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChangeCell sign={s.change_sign} value={s.change} rate={s.change_rate} />
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatNumber(s.volume)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatNumber(s.open)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatNumber(s.high)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatNumber(s.low)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
