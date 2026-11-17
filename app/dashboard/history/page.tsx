"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatDbStocks } from "@/lib/format";
import { toDateStr, parseDate } from "@/lib/date";
import ProcessedResultTable from "@/components/ProcessedResultTable";
import Calendar from "@/components/Calendar";
import type { ResultMeta, ProcessedStock } from "@/lib/types";
import { useWatchlist } from "@/lib/useWatchlist";
import { LoadingIcon } from "@/components/ui/loading-icon";
import { withPreviewThemes } from "@/lib/themePreview";

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <LoadingIcon className="h-20 w-20 text-primary" label="기록 불러오는 중" />
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const resultIdParam = searchParams.get("resultId");
  const entryIdParam = Number(searchParams.get("entryId")) || undefined;

  const [results, setResults] = useState<ResultMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedResult, setSelectedResult] = useState<ResultMeta | null>(null);
  const [stocks, setStocks] = useState<ProcessedStock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const { codes: watchlistCodes, toggle: toggleWatchlist } = useWatchlist();
  // 미리보기: 테마별 묶음. 분류는 lib/themePreview.ts의 임시 규칙을 쓴다
  const [themeGrouped, setThemeGrouped] = useState(false);
  const shownStocks = useMemo(
    () => (themeGrouped ? withPreviewThemes(stocks) : stocks),
    [themeGrouped, stocks]
  );

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const todayStr = toDateStr(now);

  useEffect(() => {
    setLoading(true);
    fetch("/api/results")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && data.results) setResults(data.results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const datesWithData = useMemo(() => new Set(results.map((r) => r.date)), [results]);

  const dateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    results.forEach((r) => map.set(r.date, (map.get(r.date) || 0) + 1));
    return map;
  }, [results]);

  const years = useMemo(() => {
    const set = new Set<number>();
    results.forEach((r) => set.add(parseInt(r.date.slice(0, 4))));
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [results, now]);

  // resultId 파라미터가 있으면 해당 결과로 이동
  const [initialResultHandled, setInitialResultHandled] = useState(false);

  // resultIdParam이 변경되면 리셋 (같은 라우트에서 다른 resultId로 재방문 시)
  useEffect(() => {
    setInitialResultHandled(false);
  }, [resultIdParam]);

  useEffect(() => {
    if (initialResultHandled || results.length === 0 || !resultIdParam) return;
    const targetId = Number(resultIdParam);
    const target = results.find((r) => r.id === targetId);
    if (target) {
      setSelectedDate(target.date);
      setSelectedResult(target);
      const d = parseDate(target.date);
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth());
      setInitialResultHandled(true);
      return;
    }
    setInitialResultHandled(true);
  }, [results, resultIdParam, initialResultHandled]);

  // 디폴트로 오늘 또는 가장 최신 날짜 선택
  useEffect(() => {
    if (selectedDate || resultIdParam) return;
    if (datesWithData.has(todayStr)) {
      setSelectedDate(todayStr);
    } else {
      const sorted = Array.from(datesWithData).sort((a, b) => b.localeCompare(a));
      if (sorted.length > 0) {
        setSelectedDate(sorted[0]);
        const d = parseDate(sorted[0]);
        setSelectedYear(d.getFullYear());
        setSelectedMonth(d.getMonth());
      }
    }
  }, [datesWithData, selectedDate, todayStr, resultIdParam]);

  const dateResults = results.filter((r) => r.date === selectedDate);

  useEffect(() => {
    if (dateResults.length > 0 && !selectedResult) {
      setSelectedResult(dateResults[0]);
    }
    if (dateResults.length === 0) {
      setSelectedResult(null);
    }
  }, [selectedDate, dateResults, selectedResult]);

  const loadStocks = useCallback(async (result: ResultMeta) => {
    if (!result.id) return;
    setStocksLoading(true);
    try {
      const res = await fetch(`/api/results/${result.id}`);
      const data = await res.json();
      setStocks(data.stocks ? formatDbStocks(data.stocks) : []);
    } catch {
      setStocks([]);
    } finally {
      setStocksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedResult?.id) {
      loadStocks(selectedResult);
    } else {
      setStocks([]);
    }
  }, [selectedResult, loadStocks]);

  const handleAnnotationUpdate = useCallback(
    (entryId: number, field: "keyword" | "reason", value: string) => {
      setStocks((prev) =>
        prev.map((s) => (s.entryId === entryId ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedResult(null);
  }, []);

  const handleSelectYear = useCallback((year: number) => {
    const now = new Date();
    setSelectedYear(year);
    setSelectedMonth(year === now.getFullYear() ? now.getMonth() : 0);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingIcon className="h-20 w-20 text-primary" label="기록 불러오는 중" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 머리 영역: 날짜가 곧 화면 제목 */}
      <div className="flex-shrink-0 border-b border-border/60 px-4 pb-3 pt-3 md:px-8 md:pb-4 md:pt-6">
        <Calendar
          selectedDate={selectedDate}
          datesWithData={datesWithData}
          dateCountMap={dateCountMap}
          years={years}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelectDate={handleSelectDate}
          onSelectYear={handleSelectYear}
          onSelectMonth={setSelectedMonth}
        />

        <div className="hide-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto">
          {dateResults.length > 1 &&
            dateResults.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedResult(r)}
                aria-pressed={selectedResult?.id === r.id}
                className={`h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors ${
                  selectedResult?.id === r.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground/80 hover:bg-border"
                }`}
              >
                {r.conditionName}
              </button>
            ))}
          <button
            type="button"
            onClick={() => setThemeGrouped((v) => !v)}
            aria-pressed={themeGrouped}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors ${
              themeGrouped
                ? "border-primary bg-accent text-primary"
                : "border-border bg-background text-foreground/80 hover:bg-muted"
            }`}
          >
            테마별로 묶기
            <span className="rounded bg-warning-surface px-1 py-px text-[10px] font-semibold text-warning">
              미리보기
            </span>
          </button>
        </div>
      </div>

      {/* 종목 */}
      <div className="flex-1 overflow-auto pb-24 pt-4 sm:px-5 md:pb-8 md:pt-5">
        {stocksLoading ? (
          <div role="status" className="px-4 sm:px-3">
            <span className="sr-only">종목 데이터 불러오는 중...</span>
            <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
            <div className="mt-5 divide-y divide-border/60">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start justify-between gap-6 py-4">
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
                    <div className="h-3 w-3/4 max-w-md animate-pulse rounded-md bg-muted" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="ml-auto h-4 w-16 animate-pulse rounded-md bg-muted" />
                    <div className="ml-auto h-3 w-12 animate-pulse rounded-md bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : stocks.length > 0 && selectedResult ? (
          <ProcessedResultTable
            highlightedEntryId={selectedResult.id === Number(resultIdParam) ? entryIdParam : undefined}
            stocks={shownStocks}
            grouped={themeGrouped}
            conditionName={selectedResult.conditionName}
            date={selectedResult.date}
            title={selectedResult.conditionName}
            onAnnotationUpdate={handleAnnotationUpdate}
            watchlistCodes={watchlistCodes}
            onToggleWatchlist={toggleWatchlist}
          />
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <svg className="h-7 w-7 text-muted-foreground/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-foreground">이 날은 저장된 종목이 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground">위 날짜를 눌러 숫자가 표시된 날을 골라보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
