"use client";

import { LoadingIcon } from "@/components/ui/loading-icon";

import { useEffect, useRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createChart, createSeriesMarkers, type IChartApi, type MouseEventParams, type ISeriesApi, type ISeriesMarkersPluginApi, type Time } from "lightweight-charts";
import {
  dailyChartOptions,
  addCandleSeries,
  addVolumeSeries,
  useDailyChartData,
} from "@/lib/dailyChart";

interface StockEventChartProps {
  code: string;
  name: string;
  /** 차트 영역 높이 (CSS 값). 대화상자와 차트 탭이 서로 다른 높이를 쓴다 */
  chartHeight?: string;
}

/**
 * 일봉 차트 + 뉴스가 기록된 날의 점 + 선택한 날의 요약.
 * 차트 대화상자(StockChartModal)와 차트 탭이 함께 쓴다.
 */
export default function StockEventChart({ code, name, chartHeight = "min(360px, 38dvh)" }: StockEventChartProps) {
  const connectorRef = useRef<SVGSVGElement>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { candles, articleDates, articles, error, loading } = useDailyChartData(code);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const summaryDates = useMemo(() => {
    return [...new Set(articles.filter((a) => a.reason?.trim() || a.sourceUrl?.trim()).map((a) => a.date))].sort();
  }, [articles]);
  const activeDate = selectedDate && summaryDates.includes(selectedDate)
    ? selectedDate : summaryDates.at(-1);
  const activeArticles = articles.filter((a) => a.date === activeDate);
  useEffect(() => { setSelectedDate(null); }, [code]);
  const activeIndex = activeDate ? summaryDates.indexOf(activeDate) : -1;
  const navigateSummary = (direction: -1 | 1) => {
    const date = summaryDates[activeIndex + direction];
    const chart = chartRef.current;
    if (!date) return;
    setSelectedDate(date);
    if (!chart || !candles) return;
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
      color: date === activeDate ? "transparent" : articles.some((article) => article.date === date && article.reason?.trim()) ? "#10b981" : "#f59e0b",
      size: date === activeDate ? 1.4 : 1,

    })));
  }, [activeDate, candles, articleDates, articles]);

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

  return (
    <>
            {loading && (
              <div role="status" className="flex flex-col items-center gap-3 py-16">
                  <LoadingIcon className="h-20 w-20 text-primary" decorative />
                <span className="sr-only">차트를 불러오는 중…</span>
              </div>
            )}
            {error && (
              <div className="py-16 text-center text-sm text-muted-foreground">{error}</div>
            )}
            {!loading && !error && candles?.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                표시할 차트 데이터가 없습니다
              </div>
            )}
            {!loading && !error && !activeDate && (
              <section
                aria-label="뉴스 요약"
                aria-live="polite"
                className="mb-4 rounded-xl border border-border bg-muted/50"
              >
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  표시할 뉴스 없음
                </p>
              </section>
            )}
            {!loading && !error && activeDate && (
              <section
                aria-label={`${activeDate} 뉴스 요약`}
                aria-live="polite"
                className="mb-4 rounded-xl border border-border bg-muted/50"
              >
                <div className="max-h-28 overflow-y-auto px-4 py-3 space-y-2">
                {activeArticles.filter((article, index, all) => all.findIndex((a) => a.reason?.trim() === article.reason?.trim() && a.sourceUrl === article.sourceUrl) === index).map((article) => (
                  <div key={article.entryId} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1 text-sm leading-relaxed">
                      {article.reason?.trim() && <p className="whitespace-pre-line text-foreground/80">{article.reason.trim()}</p>}
                      {article.sourceUrl && /^https?:\/\//i.test(article.sourceUrl) && (
                        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="block text-primary hover:underline">
                          {article.sourceTitle?.trim() || `${name} 관련 기사 원문`} ↗
                        </a>
                      )}
                    </div>

                  </div>
                ))}
                </div>
                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <time dateTime={activeDate} className="pl-1 text-xs tabular-nums font-medium text-primary">{activeDate.replaceAll("-", ". ")}</time>
                    {activeArticles.filter((article, index, all) => all.findIndex((a) => a.reason?.trim() === article.reason?.trim() && a.sourceUrl === article.sourceUrl) === index).map((article) => (
                      <a
                        key={article.entryId}
                        href={`/dashboard/history?resultId=${article.resultId}&entryId=${article.entryId}`}
                        aria-label={`${name} ${activeDate} 원본 데이터로 이동`}
                        title="원본 데이터로 이동"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary/70 transition-colors hover:bg-accent hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 5h16M4 10h10M4 15h6M4 20h6M14 17h7m-3-3 3 3-3 3" />
                        </svg>
                      </a>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="이전 뉴스 요약" disabled={activeIndex <= 0} onClick={() => navigateSummary(-1)}>&lt;</Button>
                    <Button variant="outline" size="icon" aria-label="다음 뉴스 요약" disabled={activeIndex >= summaryDates.length - 1} onClick={() => navigateSummary(1)}>&gt;</Button>
                  </div>
                </div>
              </section>
            )}
            <div className="relative">
              <div
                ref={containerRef}
                className="w-full"
                style={{ height: candles && candles.length > 0 ? chartHeight : 0 }}
              />
              {!loading && !error && activeDate && (
                <svg ref={connectorRef} aria-hidden="true" className="pointer-events-none absolute left-0 -top-4 z-10 w-full overflow-visible" style={{ height: "calc(100% + 16px)", visibility: "hidden" }}>
                  <line y1="0" stroke="#a5b4fc" strokeWidth="1" />
                  <circle r="5" fill="#6366f1" stroke="white" strokeWidth="2" />
                </svg>
              )}
            </div>
            {articleDates.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                기사 링크만 기록
                <span className="ml-3 inline-block w-2 h-2 rounded-full bg-emerald-500" />
                뉴스 요약이 기록된 날
                <span className="ml-3 inline-block w-2 h-2 rounded-full bg-indigo-500" />
                선택한 요약
              </p>
            )}
    </>
  );
}
