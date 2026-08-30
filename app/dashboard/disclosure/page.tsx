"use client";

import { useCallback, useEffect, useState } from "react";
import OwnershipTable from "@/components/OwnershipTable";
import { formatDateKorean, getCollectionDateStr } from "@/lib/date";
import type { OwnershipRow } from "@/lib/types";

interface Failure {
  rceptNo: string;
  corpName: string;
  reason: string;
}

/** YYYYMMDD ↔ input[type=date]의 YYYY-MM-DD */
const toInput = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
const fromInput = (s: string) => s.replace(/-/g, "");

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    // 모바일에선 4개가 한 줄에 들어가야 해서 최소폭을 걸지 않는다 (min-w-0)
    <div className="min-w-0 px-1.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200 md:min-w-[7rem]">
      <div className="text-[10px] md:text-[11px] leading-tight text-gray-500">{label}</div>
      {/* "-1,234억원"까지는 잘리지 않아야 한다 — 헤드라인 숫자가 잘리면 카드가 무의미해진다 */}
      <div
        className={`truncate text-[11px] md:text-sm font-semibold tabular-nums ${tone ?? "text-gray-800"}`}
      >
        {value}
      </div>
    </div>
  );
}

/** 원 단위 금액을 억/조로 줄여 읽기 쉽게 */
function shortMoney(won: number) {
  const sign = won < 0 ? "-" : "";
  const abs = Math.abs(won);
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}조원`;
  if (abs >= 1e8) return `${sign}${Math.round(abs / 1e8).toLocaleString("ko-KR")}억원`;
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

export default function DisclosurePage() {
  const [date, setDate] = useState(getCollectionDateStr);
  const [rows, setRows] = useState<OwnershipRow[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/disclosure/ownership?date=${target}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(data.rows ?? []);
      setFailures(data.failures ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "공시를 불러오지 못했습니다");
      setRows([]);
      setFailures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const buys = rows.filter((r) => r.delta > 0);
  const sells = rows.filter((r) => r.delta < 0);
  const net =
    buys.reduce((s, r) => s + (r.amount ?? 0), 0) -
    sells.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-4 py-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              임원ㆍ주요주주 특정증권 등 소유상황보고서
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              DART 전자공시 원문에서 장내ㆍ장외ㆍ시간외 매매 내역만 추려 정리했습니다
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={toInput(date)}
              max={toInput(getCollectionDateStr())}
              onChange={(e) => e.target.value && setDate(fromInput(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => load(date)}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "불러오는 중" : "새로고침"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4 md:flex-row md:flex-wrap md:items-center">
          <span className="text-sm text-gray-700 font-medium md:mr-1">
            {formatDateKorean(date)}
          </span>
          {/* 카드 4개는 어떤 폭에서도 한 줄 — 두 줄로 접히면 무엇의 숫자인지 읽기 어려워진다 */}
          <div className="grid grid-cols-4 gap-1.5 md:flex md:gap-2">
            <Stat label="보고 건수" value={`${rows.length}건`} />
            <Stat label="매수" value={`${buys.length}건`} tone="text-red-600" />
            <Stat label="매도" value={`${sells.length}건`} tone="text-blue-700" />
            <Stat
              label="순매수"
              value={shortMoney(net)}
              tone={net >= 0 ? "text-red-600" : "text-blue-700"}
            />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {failures.length > 0 && (
          <div className="px-4 py-3 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            원문을 읽지 못한 공시 {failures.length}건은 표에서 빠졌습니다 (
            {failures.map((f) => f.corpName).join(", ")})
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">
            공시 원문을 하나씩 읽는 중입니다…
          </div>
        ) : (
          <OwnershipTable rows={rows} />
        )}
      </div>
    </div>
  );
}
