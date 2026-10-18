"use client";

import { LoadingIcon } from "@/components/ui/loading-icon";

import { useEffect, useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createChart, createSeriesMarkers, type IChartApi, type MouseEventParams, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from "lightweight-charts";
import {
  dailyChartOptions,
  addCandleSeries,
  addVolumeSeries,
  useDailyChartData,
} from "@/lib/dailyChart";

interface StockChartModalProps {
  code: string;
  name: string;
  onClose: () => void;
}

export default function StockChartModal({ code, name, onClose }: StockChartModalProps) {
  const connectorRef = useRef<SVGSVGElement>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { candles, articleDates, articles, error, loading } = useDailyChartData(code);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const summaryDates = useMemo(() => {
    const available = new Set(candles?.map((c) => c.date) ?? []);
    return [...new Set(articles.filter((a) => a.reason?.trim() && available.has(a.date)).map((a) => a.date))].sort();
  }, [articles, candles]);
  const activeDate = selectedDate && summaryDates.includes(selectedDate)
    ? selectedDate : summaryDates.at(-1);
  const activeArticles = articles.filter((a) => a.date === activeDate && a.reason?.trim());
  useEffect(() => { setSelectedDate(null); }, [code]);
  const activeIndex = activeDate ? summaryDates.indexOf(activeDate) : -1;
  const navigateSummary = (direction: -1 | 1) => {
    const date = summaryDates[activeIndex + direction];
    const chart = chartRef.current;
    if (!date || !chart || !candles) return;
    setSelectedDate(date);
    const index = candles.findIndex((c) => c.date === date);
    if (index < 0) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    const span = range ? range.to - range.from : Math.min(63, candles.length);
    chart.timeScale().setVisibleLogicalRange({ from: index - span / 2, to: index + span / 2 });
    if (seriesRef.current) chart.setCrosshairPosition(candles[index].close, date, seriesRef.current);
  };

  // 캔들차트 렌더링
  useEffect(() => {
    if (!candles || candles.length === 0 || !containerRef.current) return;

    const chart = createChart(
      containerRef.current,
      dailyChartOptions(containerRef.current.clientWidth, containerRef.current.clientHeight)
    );
    chartRef.current = chart;

    const series = addCandleSeries(chart, candles);
    seriesRef.current = series;
    addVolumeSeries(chart, candles);

    markersRef.current = createSeriesMarkers(series, []);

    const selectSummary = (event: MouseEventParams) => {
      const time = event.time;
      const date = typeof time === "string" ? time : time && typeof time === "object"
        ? `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}` : null;
      if (date && summaryDates.includes(date)) setSelectedDate(date);
    };
    chart.subscribeClick(selectSummary);

    // 1년치를 다 로드해두고, 초기 화면은 최근 3개월(약 63영업일)만 보여준다.
    // 왼쪽으로 스크롤하면 이미 로드된 과거 구간이 추가 요청 없이 바로 드러난다.
    const total = candles.length;
    const visibleBars = Math.min(63, total);
    chart.timeScale().setVisibleLogicalRange({
      from: total - visibleBars - 0.5,
      to: total - 0.5,
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeClick(selectSummary);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, [candles, articleDates, summaryDates]);

  // 선택 상태만 갱신해 차트의 확대 비율과 스크롤 위치를 유지한다.
  useEffect(() => {
    if (!markersRef.current || !candles) return;
    const available = new Set(candles.map((c) => c.date));
    markersRef.current.setMarkers(articleDates.filter((date) => available.has(date)).map((date) => ({
      time: date,
      position: "aboveBar" as const,
      id: date,
      shape: "circle" as const,
      color: date === activeDate ? "transparent" : summaryDates.includes(date) ? "#10b981" : "#f59e0b",
      size: date === activeDate ? 1.4 : 1,

    })));
  }, [activeDate, candles, articleDates, summaryDates]);

  // 가격축 확대/이동 중에도 연결선과 선택 점이 같은 캔들을 따라간다.
  useEffect(() => {
    const candle = candles?.find((c) => c.date === activeDate);
    let frame = 0;
    let last = "";
    const update = () => {
      const svg = connectorRef.current;
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (svg && chart && series && candle) {
        const x = chart.timeScale().timeToCoordinate(candle.date);
        const high = series.priceToCoordinate(candle.high);
        const y = high === null ? null : high - 12;
        const visible = x !== null && y !== null && x >= 0 && x <= chart.timeScale().width() && y >= 0 && y < (containerRef.current?.clientHeight ?? 0);
        const key = `${visible}:${x}:${y}`;
        if (key !== last) {
          svg.style.visibility = visible ? "visible" : "hidden";
          if (visible) {
            const line = svg.querySelector("line")!;
            const dot = svg.querySelector("circle")!;
            line.setAttribute("x1", String(x));
            line.setAttribute("x2", String(x));
            line.setAttribute("y2", String(y + 16));
            dot.setAttribute("cx", String(x));
            dot.setAttribute("cy", String(y + 16));
          }
          last = key;
        }
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [activeDate, candles]);

  // 모달 열려있는 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        /* 모바일 하단 탭바가 z-50이라 같은 값이면 DOM 순서상 탭바가 위로 덮인다 */
        className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center sm:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="bg-white w-full sm:max-w-2xl max-h-[85dvh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-xl safe-area-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-gray-100">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-indigo-500 mb-1">
                일봉 · 왼쪽으로 스크롤하면 최근 1년까지 볼 수 있어요
              </p>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
                {name}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          </div>

          {/* 본문 */}
          <div className="px-4 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto">
            {loading && (
              <div role="status" className="py-16 flex flex-col items-center gap-3 text-gray-500 text-sm">
                  <LoadingIcon className="h-20 w-20 text-indigo-600" decorative />
                <span className="sr-only">차트를 불러오는 중…</span>
              </div>
            )}
            {error && (
              <div className="py-16 text-center text-sm text-gray-500">{error}</div>
            )}
            {!loading && !error && candles?.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-500">
                표시할 차트 데이터가 없습니다
              </div>
            )}
            {!loading && !error && activeDate && (
              <section
                aria-label={`${activeDate} 뉴스 요약`}
                aria-live="polite"
                className="mb-4 rounded-xl border border-gray-200 bg-gray-50/60"
              >
                <div className="max-h-28 overflow-y-auto px-4 py-3 space-y-2">
                {[...new Set(activeArticles.map((article) => article.reason?.trim()))].map((reason) => (
                  <p key={reason} className="text-sm leading-relaxed text-gray-700">
                    {reason}
                  </p>
                ))}
                </div>
                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                  <time dateTime={activeDate} className="pl-1 text-xs tabular-nums font-medium text-indigo-600">{activeDate.replaceAll("-", ". ")}</time>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="이전 뉴스 요약" disabled={activeIndex <= 0} onClick={() => navigateSummary(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">&lt;</button>
                    <button type="button" aria-label="다음 뉴스 요약" disabled={activeIndex >= summaryDates.length - 1} onClick={() => navigateSummary(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">&gt;</button>
                  </div>
                </div>
              </section>
            )}
            <div className="relative">
              <div
                ref={containerRef}
                className="w-full"
                style={{ height: candles && candles.length > 0 ? "min(360px, 38dvh)" : 0 }}
              />
              {!loading && !error && activeDate && (
                <svg ref={connectorRef} aria-hidden="true" className="pointer-events-none absolute left-0 -top-4 z-10 w-full overflow-visible" style={{ height: "calc(100% + 16px)", visibility: "hidden" }}>
                  <line y1="0" stroke="#a5b4fc" strokeWidth="1" />
                  <circle r="5" fill="#6366f1" stroke="white" strokeWidth="2" />
                </svg>
              )}
            </div>
            {articleDates.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                기사 링크만 기록
                <span className="ml-3 inline-block w-2 h-2 rounded-full bg-emerald-500" />
                뉴스 요약이 기록된 날
                <span className="ml-3 inline-block w-2 h-2 rounded-full bg-indigo-500" />
                선택한 요약
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
