"use client";

import { LoadingIcon } from "@/components/ui/loading-icon";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import {
  dailyChartOptions,
  addCandleSeries,
  addVolumeSeries,
  useDailyChartData,
} from "@/lib/dailyChart";

interface WatchlistChartModalProps {
  code: string;
  name: string;
  initialLow: number | null;
  initialHigh: number | null;
  onClose: () => void;
  onSave: (low: number, high: number) => Promise<void>;
  onClearAlert: () => Promise<void>;
}

type DragTarget = "low" | "high" | "band" | null;

/** 드래그로 가격 범위를 잡을 때 상/하한이 붙어버리지 않게 두는 최소 간격 */
const MIN_GAP_RATIO = 0.005;

export default function WatchlistChartModal({
  code,
  name,
  initialLow,
  initialHigh,
  onClose,
  onSave,
  onClearAlert,
}: WatchlistChartModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const { candles, error, loading } = useDailyChartData(code);

  // 가격 기준값(원본) — 픽셀 좌표는 이 값에서 매번 다시 계산한다
  const [range, setRange] = useState<{ low: number; high: number } | null>(
    initialLow !== null && initialHigh !== null
      ? { low: initialLow, high: initialHigh }
      : null
  );
  const rangeRef = useRef(range);
  rangeRef.current = range;

  // 렌더에 쓸 픽셀 좌표. 차트 확대/축소·리사이즈 때마다 다시 계산해 넣는다
  const [pixels, setPixels] = useState<{ lowY: number; highY: number } | null>(null);
  const dragRef = useRef<{ target: DragTarget; startY: number; startRange: { low: number; high: number } } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const recomputePixels = useCallback(() => {
    const series = seriesRef.current;
    const r = rangeRef.current;
    if (!series || !r) return;
    const lowY = series.priceToCoordinate(r.low);
    const highY = series.priceToCoordinate(r.high);
    if (lowY === null || highY === null) return;
    setPixels({ lowY, highY });
  }, []);

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

    chart.timeScale().fitContent();

    // 초기 범위가 없으면 최근 종가 기준 ±5%로 시작한다
    if (!rangeRef.current) {
      const lastClose = candles[candles.length - 1].close;
      setRange({ low: Math.round(lastClose * 0.95), high: Math.round(lastClose * 1.05) });
    } else {
      // 이미 범위가 있는 경우(기존 알림 수정) range 값 자체는 안 바뀌므로
      // range 변경에만 반응하는 recomputePixels가 트리거되지 않는다 — 여기서 직접 호출
      recomputePixels();
    }

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      recomputePixels();
    };
    window.addEventListener("resize", handleResize);
    chart.timeScale().subscribeVisibleTimeRangeChange(recomputePixels);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(recomputePixels);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [candles, recomputePixels]);

  // range 값이 바뀔 때(초기 설정 포함)마다 픽셀 좌표 갱신
  useEffect(() => {
    recomputePixels();
  }, [range, recomputePixels]);

  const priceAtY = useCallback((y: number): number | null => {
    const series = seriesRef.current;
    if (!series) return null;
    return series.coordinateToPrice(y);
  }, []);

  const onPointerDown = useCallback(
    (target: DragTarget) => (e: React.PointerEvent) => {
      if (!rangeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { target, startY: e.clientY, startRange: rangeRef.current };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      if (drag.target === "band") {
        const dy = e.clientY - drag.startY;
        const lowY0 = seriesRef.current?.priceToCoordinate(drag.startRange.low);
        const highY0 = seriesRef.current?.priceToCoordinate(drag.startRange.high);
        if (lowY0 == null || highY0 == null) return;
        const newLow = priceAtY(lowY0 + dy);
        const newHigh = priceAtY(highY0 + dy);
        if (newLow === null || newHigh === null) return;
        setRange({ low: Math.round(newLow), high: Math.round(newHigh) });
        return;
      }

      const price = priceAtY(y);
      if (price === null) return;
      const cur = rangeRef.current;
      if (!cur) return;
      const minGap = Math.max(1, cur.high * MIN_GAP_RATIO);

      if (drag.target === "low") {
        const low = Math.min(Math.round(price), Math.round(cur.high - minGap));
        setRange({ low, high: cur.high });
      } else if (drag.target === "high") {
        const high = Math.max(Math.round(price), Math.round(cur.low + minGap));
        setRange({ low: cur.low, high });
      }
    },
    [priceAtY]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async () => {
    if (!range) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(range.low, range.high);
      onClose();
    } catch {
      setSaveError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onClearAlert();
      onClose();
    } catch {
      setSaveError("삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center sm:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="bg-white w-full sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-xl safe-area-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-gray-100">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-indigo-500 mb-1">가격 알림 범위 설정</p>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">{name}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          </div>

          <div className="px-4 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto">
            {loading && <div role="status" className="py-16 flex flex-col items-center gap-3 text-gray-500 text-sm"><LoadingIcon className="h-12 w-12 text-indigo-600" decorative />차트를 불러오는 중…</div>}
            {error && <div className="py-16 text-center text-sm text-gray-500">{error}</div>}
            {!loading && !error && candles?.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-500">표시할 차트 데이터가 없습니다</div>
            )}

            {!loading && !error && candles && candles.length > 0 && (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  위/아래 선을 드래그해 알림 받을 가격대를 정하세요. 가운데를 드래그하면 범위를 통째로 옮길 수 있습니다.
                </p>
                <div
                  className="relative w-full select-none"
                  style={{ height: "min(420px, 52dvh)" }}
                >
                  <div ref={containerRef} className="absolute inset-0" />

                  {pixels && range && (
                    <div
                      className="absolute inset-0"
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                    >
                      {/* 범위 밴드 — 드래그하면 통째로 이동 */}
                      <div
                        onPointerDown={onPointerDown("band")}
                        className="absolute left-0 right-0 bg-indigo-500/10 border-y border-indigo-400 cursor-move"
                        style={{
                          top: Math.min(pixels.lowY, pixels.highY),
                          height: Math.abs(pixels.lowY - pixels.highY),
                        }}
                      />

                      {/* 상한선 */}
                      <div
                        onPointerDown={onPointerDown("high")}
                        className="absolute left-0 right-0 h-3 -mt-1.5 cursor-ns-resize flex items-center"
                        style={{ top: pixels.highY }}
                      >
                        <div className="w-full h-0.5 bg-indigo-500" />
                        <span className="absolute right-1 -top-4 text-[10px] font-semibold text-indigo-700 bg-white/90 px-1 rounded">
                          상한 {range.high.toLocaleString("ko-KR")}
                        </span>
                      </div>

                      {/* 하한선 */}
                      <div
                        onPointerDown={onPointerDown("low")}
                        className="absolute left-0 right-0 h-3 -mt-1.5 cursor-ns-resize flex items-center"
                        style={{ top: pixels.lowY }}
                      >
                        <div className="w-full h-0.5 bg-indigo-500" />
                        <span className="absolute right-1 top-1.5 text-[10px] font-semibold text-indigo-700 bg-white/90 px-1 rounded">
                          하한 {range.low.toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {saveError && <p className="text-xs text-red-600 mt-3">{saveError}</p>}
          </div>

          {!loading && !error && candles && candles.length > 0 && (
            <div className="px-4 sm:px-6 pb-4 pt-1 flex gap-2">
              {(initialLow !== null || initialHigh !== null) && (
                <button
                  onClick={handleClear}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  알림 끄기
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !range}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "저장 중..." : "이 범위로 알림 설정"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
