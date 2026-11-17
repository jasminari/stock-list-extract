"use client";

import { LoadingIcon } from "@/components/ui/loading-icon";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
const MAX_PRICE = 2147483647;

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
  const [pixels, setPixels] = useState<{ lowY: number; highY: number; width: number; height: number } | null>(null);
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
    const chart = chartRef.current;
    if (!chart) return;
    const width = chart.timeScale().width();
    const height = chart.panes()[0].getHeight();
    setPixels((previous) =>
      previous?.lowY === lowY && previous.highY === highY && previous.width === width && previous.height === height
        ? previous
        : { lowY, highY, width, height }
    );
  }, []);

  useEffect(() => {
    if (loading || error || !candles || candles.length === 0 || !containerRef.current) return;

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
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Price coordinates become available after the chart's first paint. Keep the
    // overlay aligned during price-axis scaling too (no scale-change event exists).
    let animationFrame: number;
    const syncOverlay = () => {
      recomputePixels();
      animationFrame = requestAnimationFrame(syncOverlay);
    };
    animationFrame = requestAnimationFrame(syncOverlay);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
      dragRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [candles, loading, error, recomputePixels]);

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
        const span = drag.startRange.high - drag.startRange.low;
        const low = Math.max(1, Math.min(MAX_PRICE - span, Math.round(newLow)));
        setRange({ low, high: low + span });
        return;
      }

      const price = priceAtY(y);
      if (price === null) return;
      const cur = rangeRef.current;
      if (!cur) return;
      const minGap = Math.max(1, cur.high * MIN_GAP_RATIO);

      if (drag.target === "low") {
        const low = Math.max(1, Math.min(Math.round(price), Math.floor(cur.high - minGap)));
        setRange({ low, high: cur.high });
      } else if (drag.target === "high") {
        const high = Math.min(MAX_PRICE, Math.max(Math.round(price), Math.ceil(cur.low + minGap)));
        setRange({ low: cur.low, high });
      }
    },
    [priceAtY]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] sm:max-h-[85vh]">
        <DialogHeader eyebrow="가격 알림 범위 설정">{name}</DialogHeader>

          <DialogBody>
            {loading && <div role="status" className="flex flex-col items-center gap-3 py-16"><LoadingIcon className="h-20 w-20 text-primary" decorative /><span className="sr-only">차트를 불러오는 중…</span></div>}
            {error && <div className="py-16 text-center text-sm text-muted-foreground">{error}</div>}
            {!loading && !error && candles?.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">표시할 차트 데이터가 없습니다</div>
            )}

            {!loading && !error && candles && candles.length > 0 && (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  위/아래 선을 드래그해 알림 받을 가격대를 정하세요. 가운데를 드래그하면 범위를 통째로 옮길 수 있습니다.
                </p>
                <div
                  className="relative w-full select-none"
                  style={{ height: "min(420px, 52dvh)" }}
                >
                  <div ref={containerRef} className="absolute inset-0" />

                  {pixels && range && (
                    <div
                      className="absolute left-0 top-0 z-10 pointer-events-none overflow-hidden"
                      style={{ width: pixels.width, height: pixels.height }}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                      onLostPointerCapture={onPointerUp}
                    >
                      {/* 범위 밴드 — 드래그하면 통째로 이동 */}
                      <div
                        onPointerDown={onPointerDown("band")}
                        aria-label="가격 알림 범위 이동"
                        className="absolute left-0 right-0 pointer-events-auto touch-none bg-primary/[0.15] border-2 border-primary cursor-move"
                        style={{
                          top: Math.min(pixels.lowY, pixels.highY),
                          height: Math.abs(pixels.lowY - pixels.highY),
                        }}
                      />

                      {/* 상한선 */}
                      <div
                        onPointerDown={onPointerDown("high")}
                        className="absolute left-0 right-0 h-6 -mt-6 pointer-events-auto touch-none cursor-ns-resize flex items-end"
                        style={{ top: pixels.highY }}
                      >
                        <div className="w-full h-0.5 bg-primary" />
                        <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 h-2 w-8 rounded-full border-2 border-primary bg-background" />
                        <span className="absolute right-1 bottom-2 text-[11px] font-semibold text-primary-hover bg-background/90 px-1 rounded">
                          상한 {range.high.toLocaleString("ko-KR")}
                        </span>
                      </div>

                      {/* 하한선 */}
                      <div
                        onPointerDown={onPointerDown("low")}
                        className="absolute left-0 right-0 h-6 pointer-events-auto touch-none cursor-ns-resize flex items-start"
                        style={{ top: pixels.lowY }}
                      >
                        <div className="w-full h-0.5 bg-primary" />
                        <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 h-2 w-8 rounded-full border-2 border-primary bg-background" />
                        <span className="absolute right-1 top-2 text-[11px] font-semibold text-primary-hover bg-background/90 px-1 rounded">
                          하한 {range.low.toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {range && (
                  <p className="mt-3 text-center text-sm font-semibold tabular-nums text-primary-hover">
                    {range.low.toLocaleString("ko-KR")}원 ~ {range.high.toLocaleString("ko-KR")}원
                  </p>
                )}
              </>
            )}

            {saveError && <p className="mt-3 text-xs text-destructive">{saveError}</p>}
          </DialogBody>

          {!loading && !error && candles && candles.length > 0 && (
            <DialogFooter>
              {(initialLow !== null || initialHigh !== null) && (
                <Button variant="outline" onClick={handleClear} disabled={saving}>
                  알림 끄기
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving || !range}
              >
                {saving ? "저장 중..." : "이 범위로 알림 설정"}
              </Button>
            </DialogFooter>
          )}
      </DialogContent>
    </Dialog>
  );
}
