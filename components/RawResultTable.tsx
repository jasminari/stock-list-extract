import { motion } from "framer-motion";
import type { StockResult } from "@/lib/types";

function formatNumber(val: string) {
  const n = Number(val.replace(/^[+-]/, ""));
  return isNaN(n) ? val : n.toLocaleString();
}

function ChangeCell({ sign, value, rate }: { sign: string; value: string; rate: string }) {
  const isUp = sign === "2";
  const isDown = sign === "5";
  const color = isUp ? "text-rise" : isDown ? "text-fall" : "text-muted-foreground";
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
      className="bg-background rounded-xl border border-border overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          원본 데이터{" "}
          <span className="text-primary font-bold">{stocks.length}</span>
          종목
        </h2>
        <span className="text-xs text-muted-foreground/80">{conditionName}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs">
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
          <tbody className="divide-y divide-border/40">
            {stocks.map((s, i) => (
              <tr key={i} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{s.code}</td>
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatNumber(s.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChangeCell sign={s.change_sign} value={s.change} rate={s.change_rate} />
                </td>
                <td className="px-4 py-3 text-right text-foreground/80">
                  {formatNumber(s.volume)}
                </td>
                <td className="px-4 py-3 text-right text-foreground/80">
                  {formatNumber(s.open)}
                </td>
                <td className="px-4 py-3 text-right text-foreground/80">
                  {formatNumber(s.high)}
                </td>
                <td className="px-4 py-3 text-right text-foreground/80">
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
