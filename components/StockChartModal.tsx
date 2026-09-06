"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  ColorType,
  type IChartApi,
} from "lightweight-charts";
import type { DailyCandle } from "@/lib/types";

interface StockChartModalProps {
  code: string;
  name: string;
  onClose: () => void;
}

export default function StockChartModal({ code, name, onClose }: StockChartModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [candles, setCandles] = useState<DailyCandle[] | null>(null);
  const [appearances, setAppearances] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 일봉 데이터 조회
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCandles(null);
    setAppearances([]);

    fetch(`/api/stock/chart/${code}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          setError(data.error || "차트를 불러오지 못했습니다");
        } else {
          setCandles(data.candles || []);
          setAppearances(data.appearances || []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("차트를 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  // 캔들차트 렌더링
  useEffect(() => {
    if (!candles || candles.length === 0 || !containerRef.current) return;

    const priceFormatter = (price: number) => Math.round(price).toLocaleString("ko-KR");

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#374151",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      timeScale: { borderColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#e5e7eb", minimumWidth: 68 },
      localization: {
        priceFormatter,
        locale: "ko-KR",
      },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#dc2626",
      downColor: "#2563eb",
      borderVisible: false,
      wickUpColor: "#dc2626",
      wickDownColor: "#2563eb",
      priceFormat: { type: "custom", formatter: priceFormatter, minMove: 1 },
    });

    series.setData(
      candles.map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // 시장 공부하기 리스트에 등장했던 날짜를 캔들 아래 점으로 표시
    const candleDates = new Set(candles.map((c) => c.date));
    const markerDates = appearances.filter((d) => candleDates.has(d));
    if (markerDates.length > 0) {
      createSeriesMarkers(
        series,
        markerDates.map((d) => ({
          time: d,
          position: "belowBar",
          color: "#f59e0b",
          shape: "circle",
        }))
      );
    }

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
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, appearances]);

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
              <div className="py-16 text-center text-gray-400 text-sm">
                차트를 불러오는 중…
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
            <div
              ref={containerRef}
              className="w-full"
              style={{ height: candles && candles.length > 0 ? "min(360px, 45dvh)" : 0 }}
            />
            {appearances.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                시장 공부하기 리스트에 등장했던 날
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
