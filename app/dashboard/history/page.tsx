"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDbStocks } from "@/lib/format";
import { toDateStr, parseDate } from "@/lib/date";
import ProcessedResultTable from "@/components/ProcessedResultTable";
import Calendar from "@/components/Calendar";
import type { ResultMeta, ProcessedStock } from "@/lib/types";
import { useWatchlist } from "@/lib/useWatchlist";
import { LoadingIcon } from "@/components/ui/loading-icon";
import { withPreviewThemes } from "@/lib/themePreview";
// 미리보기: 코스피·코스닥 일별 총 거래대금 스냅샷 (scripts/fetch-market-trading-value.mjs로 받은 값)
import marketTradingValue from "@/data/market-trading-value.json";
// 미리보기: 최근 며칠치 종목별 [당일, 전일] 거래대금 스냅샷 (scripts/fetch-prev-trading-value.mjs)
import prevTradingValue from "@/data/prev-trading-value.json";

const MARKET_TOTALS = marketTradingValue as Record<string, number[]>;
const MARKET_DATES = Object.keys(MARKET_TOTALS).sort();
const PREV_VALUES = prevTradingValue as Record<string, Record<string, number[]>>;

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
  const { codes: watchlistCodes, toggle: toggleWatchlist, add: addToWatchlist } = useWatchlist();
  // 미리보기 기능(테마 묶기, 엑셀 보기, 시장 비중, 전일 대비)은 관리자 계정에만 보인다.
  // 정식 데이터로 바꾸기 전까지 일반 사용자 화면은 기존과 같게 둔다.
  // 관리자가 아니어도 주소에 ?preview=1을 한 번 붙이면 그 브라우저에서 켜지고, ?preview=0으로 끈다.
  const { data: session } = useSession();
  const previewParam = searchParams.get("preview");
  const [previewOptIn, setPreviewOptIn] = useState(false);
  useEffect(() => {
    try {
      if (previewParam === "1") localStorage.setItem("marketStudyPreview", "1");
      if (previewParam === "0") localStorage.removeItem("marketStudyPreview");
      setPreviewOptIn(localStorage.getItem("marketStudyPreview") === "1");
    } catch {
      setPreviewOptIn(previewParam === "1");
    }
  }, [previewParam]);
  const previewEnabled = session?.user?.role === "admin" || previewOptIn;
  // 미리보기: 테마별 묶음. 분류는 lib/themePreview.ts의 임시 규칙을 쓴다
  const [themeGroupedState, setThemeGrouped] = useState(false);
  // 미리보기: 직접 정리하던 엑셀 시트를 닮은 보기
  const [sheetViewState, setSheetView] = useState(false);
  const themeGrouped = previewEnabled && themeGroupedState;
  const sheetView = previewEnabled && sheetViewState;
  const shownStocks = useMemo(
    () => (themeGrouped ? withPreviewThemes(stocks) : stocks),
    [themeGrouped, stocks]
  );

  // 홈 목록에서 왼쪽으로 밀어 버린 종목. 날짜·조건(결과)마다 이 브라우저에 기억한다
  const dismissKey = selectedResult ? `homeDismissed:${selectedResult.id}` : null;
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!dismissKey) return setDismissed(new Set());
    try {
      setDismissed(new Set(JSON.parse(localStorage.getItem(dismissKey) ?? "[]")));
    } catch {
      setDismissed(new Set());
    }
  }, [dismissKey]);
  // 스와이프 콜백은 밀어내는 애니메이션이 끝난 뒤에 불리므로, 그 사이 바뀐 값을 덮어쓰지 않게 이전 값에서 만든다
  const updateDismissed = useCallback(
    (change: (prev: Set<string>) => Set<string>) => {
      setDismissed((prev) => {
        const next = change(prev);
        if (dismissKey) {
          try {
            if (next.size === 0) localStorage.removeItem(dismissKey);
            else localStorage.setItem(dismissKey, JSON.stringify([...next]));
          } catch {}
        }
        return next;
      });
    },
    [dismissKey]
  );

  const [toast, setToast] = useState<
    { kind: "dismiss"; code: string; name: string } | { kind: "watch"; name: string; status: "added" | "already" | "failed" } | null
  >(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSwipeDismiss = useCallback(
    (code: string, name: string) => {
      updateDismissed((prev) => new Set(prev).add(code));
      setToast({ kind: "dismiss", code, name });
    },
    [updateDismissed]
  );
  const handleSwipeWatch = useCallback(
    async (code: string, name: string) => {
      const status = await addToWatchlist(code, name, selectedResult?.date);
      setToast({ kind: "watch", name, status });
    },
    [addToWatchlist, selectedResult?.date]
  );
  const undoDismiss = (code: string) => {
    updateDismissed((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
    setToast(null);
  };
  const dismissedInList = stocks.filter((s) => dismissed.has(s.code)).length;

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
          {previewEnabled && (
          <>
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
          <button
            type="button"
            onClick={() => {
              // 엑셀 보기는 묶음 색과 소계가 있어야 원래 시트와 닮는다
              if (!sheetView) setThemeGrouped(true);
              setSheetView((v) => !v);
            }}
            aria-pressed={sheetView}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors ${
              sheetView
                ? "border-primary bg-accent text-primary"
                : "border-border bg-background text-foreground/80 hover:bg-muted"
            }`}
          >
            엑셀처럼 보기
            <span className="rounded bg-warning-surface px-1 py-px text-[10px] font-semibold text-warning">
              미리보기
            </span>
          </button>
          </>
          )}
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
          <>
          <div className="mb-3 flex items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:hidden">
            <span>종목을 오른쪽으로 밀면 관심종목, 왼쪽으로 밀면 버리기</span>
            {dismissedInList > 0 && (
              <button
                type="button"
                onClick={() => updateDismissed(() => new Set())}
                className="shrink-0 font-medium text-primary"
              >
                버린 {dismissedInList}개 다시 보기
              </button>
            )}
          </div>
          <ProcessedResultTable
            highlightedEntryId={selectedResult.id === Number(resultIdParam) ? entryIdParam : undefined}
            stocks={shownStocks}
            grouped={themeGrouped}
            variant={sheetView ? "sheet" : "default"}
            marketTotal={(() => {
              const row = previewEnabled ? MARKET_TOTALS[selectedResult.date] : undefined;
              if (!row) return undefined;
              const prev = MARKET_TOTALS[MARKET_DATES[MARKET_DATES.indexOf(selectedResult.date) - 1]];
              return { kospi: row[0], kosdaq: row[1], prevSum: prev ? prev[0] + prev[1] : undefined };
            })()}
            prevTradingValue={previewEnabled ? PREV_VALUES[selectedResult.date] : undefined}
            conditionName={selectedResult.conditionName}
            date={selectedResult.date}
            title={selectedResult.conditionName}
            onAnnotationUpdate={handleAnnotationUpdate}
            watchlistCodes={watchlistCodes}
            onToggleWatchlist={(code, name) => toggleWatchlist(code, name, selectedResult.date)}
            onSwipeDismiss={handleSwipeDismiss}
            onSwipeWatch={handleSwipeWatch}
            hiddenCodes={dismissed}
          />
          </>
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

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 md:bottom-8"
        >
          <span className="min-w-0 truncate">
            {toast.kind === "dismiss"
              ? `${toast.name} 버렸어요`
              : toast.status === "failed"
                ? `${toast.name}을(를) 담지 못했어요. 잠시 후 다시 시도해 주세요`
                : toast.status === "already"
                  ? `${toast.name}은(는) 이미 관심종목에 있어요`
                  : `${toast.name} 관심종목에 담았어요`}
          </span>
          {toast.kind === "dismiss" ? (
            <button type="button" onClick={() => undoDismiss(toast.code)} className="shrink-0 font-semibold text-primary-foreground/90 underline underline-offset-2">
              되돌리기
            </button>
          ) : toast.status === "failed" ? null : (
            <Link href="/dashboard/watchlist" className="shrink-0 font-semibold underline underline-offset-2">
              보러 가기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
