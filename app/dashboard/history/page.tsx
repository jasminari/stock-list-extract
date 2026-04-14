"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatDbStocks } from "@/lib/format";
import { toDateStr, parseDate } from "@/lib/date";
import ProcessedResultTable from "@/components/ProcessedResultTable";
import Calendar from "@/components/Calendar";
import type { ResultMeta, ProcessedStock } from "@/lib/types";

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const resultIdParam = searchParams.get("resultId");

  const [results, setResults] = useState<ResultMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedResult, setSelectedResult] = useState<ResultMeta | null>(null);
  const [stocks, setStocks] = useState<ProcessedStock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);

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
    if (dateResults.length > 0 && (!selectedResult || selectedResult.date !== selectedDate)) {
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
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span>내 검색</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">데이터 보기</span>
        </div>

        <Calendar
          selectedDate={selectedDate}
          datesWithData={datesWithData}
          dateCountMap={dateCountMap}
          years={years}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          collapsed={calendarCollapsed}
          onSelectDate={handleSelectDate}
          onSelectYear={handleSelectYear}
          onSelectMonth={setSelectedMonth}
          onToggleCollapse={() => setCalendarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Stock Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {stocksLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">종목 데이터 불러오는 중...</p>
          </div>
        ) : stocks.length > 0 && selectedResult ? (
          <ProcessedResultTable
            stocks={stocks}
            conditionName={selectedResult.conditionName}
            date={selectedResult.date}
            onAnnotationUpdate={handleAnnotationUpdate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">해당 날짜에 저장된 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
