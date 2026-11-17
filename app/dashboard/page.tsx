"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ContributionGraph from "@/components/ContributionGraph";

const JOINED_YEAR = 2025;

export default function DashboardHome() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= JOINED_YEAR; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">대시보드</h1>
          <p className="text-sm text-muted-foreground">종목 상승이유 기여 현황</p>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-background border border-border rounded-xl p-6 min-w-0">
            <ContributionGraph year={selectedYear} />
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-primary text-white"
                    : "bg-background border border-border text-foreground/80 hover:bg-muted/50"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/dashboard/search")}
            className="flex items-center gap-4 p-5 bg-background border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">조건검색 실행</div>
              <div className="text-xs text-muted-foreground mt-0.5">키움증권 REST API로 종목 추출</div>
            </div>
          </button>

          <button
            onClick={() => router.push("/dashboard/history")}
            className="flex items-center gap-4 p-5 bg-background border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-success-surface flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">저장 이력</div>
              <div className="text-xs text-muted-foreground mt-0.5">과거 검색 결과 조회 및 다운로드</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
