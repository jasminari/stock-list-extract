import { useEffect, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { DailyCandle } from "./types";

/**
 * 일봉 차트를 그리는 여러 모달(시장 공부하기 미리보기, 관심종목 가격 알림)이
 * 공통으로 쓰는 조회/렌더링 로직. 한쪽에서 바뀐 스타일이 다른 쪽에서도 그대로
 * 유지되도록 여기서만 관리한다.
 */

export function formatPrice(price: number): string {
  return Math.round(price).toLocaleString("ko-KR");
}

export function formatAmount(value: number): string {
  return `${Math.round(value / 1e8).toLocaleString("ko-KR")}억`;
}

/** 캔들차트 공통 레이아웃/그리드/축 포맷 옵션 */
export function dailyChartOptions(width: number, height: number) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: "#ffffff" },
      textColor: "#374151",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: "#f3f4f6" },
      horzLines: { color: "#f3f4f6" },
    },
    width,
    height,
    timeScale: { borderColor: "#e5e7eb" },
    rightPriceScale: { borderColor: "#e5e7eb", minimumWidth: 68 },
    localization: { priceFormatter: formatPrice, locale: "ko-KR" },
  };
}

/** 캔들 시리즈 생성. 아래쪽 28%는 거래대금 히스토그램 자리로 비워둔다 */
export function addCandleSeries(
  chart: IChartApi,
  candles: DailyCandle[]
): ISeriesApi<"Candlestick"> {
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#dc2626",
    downColor: "#2563eb",
    borderVisible: false,
    wickUpColor: "#dc2626",
    wickDownColor: "#2563eb",
    priceFormat: { type: "custom", formatter: formatPrice, minMove: 1 },
  });
  series.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.28 } });
  series.setData(
    candles.map((c) => ({
      time: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
  );
  return series;
}

/** 거래대금(억원) 히스토그램. 캔들과 분리된 축으로 아래쪽 25%에 겹쳐 그린다 */
export function addVolumeSeries(chart: IChartApi, candles: DailyCandle[]) {
  const volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: "custom", formatter: formatAmount, minMove: 1 },
    priceScaleId: "amount",
  });
  chart.priceScale("amount").applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
  volumeSeries.setData(
    candles.map((c) => ({
      time: c.date,
      value: c.amount,
      color: c.close >= c.open ? "#f8b4b4" : "#a7c4f0",
    }))
  );
  return volumeSeries;
}

export interface ChartArticle {
  resultId: number;
  entryId: number;
  date: string;
  reason: string | null;
  keyword: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

interface DailyChartData {
  articles: ChartArticle[];
  candles: DailyCandle[] | null;
  /** 상승이유 기사가 붙었던 날짜 (YYYY-MM-DD) */
  articleDates: string[];
  error: string | null;
  loading: boolean;
}

/** 종목 일봉 + 상승이유 기사일 조회. code가 바뀔 때마다 다시 가져온다 */
export function useDailyChartData(code: string): DailyChartData {
  const [candles, setCandles] = useState<DailyCandle[] | null>(null);
  const [articles, setArticles] = useState<ChartArticle[]>([]);
  const [articleDates, setArticleDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCandles(null);
    setArticleDates([]);
    setArticles([]);

    fetch(`/api/stock/chart/${code}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          setError(data.error || "차트를 불러오지 못했습니다");
        } else {
          setCandles(data.candles || []);
          setArticleDates(data.articleDates || []);
          setArticles(data.articles || []);
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

  return { candles, articleDates, articles, error, loading };
}
