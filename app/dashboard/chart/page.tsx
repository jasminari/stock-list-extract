"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import StockEventChart from "@/components/StockEventChart";
import { LoadingIcon } from "@/components/ui/loading-icon";
import { formatDbStocks } from "@/lib/format";
import { parseDate } from "@/lib/date";
import type { ProcessedStock, ResultMeta } from "@/lib/types";

interface Pick {
  code: string;
  name: string;
}

/** 차트 탭에 한 번에 보여 줄 거래대금 상위 종목 수 */
const TOP_COUNT = 10;

const formatBil = (bil: number) =>
  bil >= 10000 ? `${(bil / 10000).toFixed(1)}조` : `${Math.round(bil).toLocaleString("ko-KR")}억`;

export default function ChartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingIcon className="h-20 w-20 text-primary" label="차트 불러오는 중" />
        </div>
      }
    >
      <ChartContent />
    </Suspense>
  );
}

function ChartContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");
  const nameParam = searchParams.get("name");

  const [latest, setLatest] = useState<ResultMeta | null>(null);
  const [topStocks, setTopStocks] = useState<ProcessedStock[]>([]);
  const [watchlist, setWatchlist] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Pick | null>(
    codeParam ? { code: codeParam, name: nameParam || codeParam } : null
  );

  // 가장 최근 목록의 거래대금 상위 종목
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetch("/api/results").then((r) => r.json());
        const results: ResultMeta[] = list.results ?? [];
        const newest = [...results].sort((a, b) => b.date.localeCompare(a.date))[0];
        if (!newest?.id) return;
        const detail = await fetch(`/api/results/${newest.id}`).then((r) => r.json());
        if (cancelled) return;
        const stocks = detail.stocks ? formatDbStocks(detail.stocks) : [];
        setLatest(newest);
        setTopStocks(
          [...stocks].sort((a, b) => b.tradingAmountBil - a.tradingAmountBil).slice(0, TOP_COUNT)
        );
      } catch {
        // 목록을 못 불러와도 관심종목 차트는 볼 수 있게 둔다
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setWatchlist(
            (data.items ?? []).map((i: Pick) => ({ code: i.code, name: i.name }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // 고른 종목이 없으면 거래대금 1위, 그것도 없으면 첫 관심종목
  const active = useMemo<Pick | null>(() => {
    if (picked) return picked;
    if (topStocks[0]) return { code: topStocks[0].code, name: topStocks[0].name };
    return watchlist[0] ?? null;
  }, [picked, topStocks, watchlist]);

  const activeStock = topStocks.find((s) => s.code === active?.code);
  const activeRank = activeStock ? topStocks.indexOf(activeStock) + 1 : 0;

  const chipClass = (on: boolean) =>
    `inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors ${
      on ? "bg-foreground text-background" : "bg-muted text-foreground/80 hover:bg-border"
    }`;

  if (loading && !active) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingIcon className="h-20 w-20 text-primary" label="차트 불러오는 중" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-24 md:pb-8">
      <div className="mx-auto max-w-3xl px-4 pt-3 md:px-8 md:pt-6">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">차트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          점이 찍힌 날을 누르면 그 날 오른 이유를 볼 수 있어요.
        </p>

        {topStocks.length > 0 && latest && (
          <section className="mt-5" aria-label="거래대금 상위 종목">
            <h2 className="mb-2 text-xs font-medium text-muted-foreground">
              {parseDate(latest.date).getMonth() + 1}월 {parseDate(latest.date).getDate()}일 거래대금 순
            </h2>
            <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {topStocks.map((s, i) => (
                <button
                  key={s.code}
                  type="button"
                  aria-pressed={active?.code === s.code}
                  onClick={() => setPicked({ code: s.code, name: s.name })}
                  className={chipClass(active?.code === s.code)}
                >
                  <span className="tabular-nums opacity-60">{i + 1}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {watchlist.length > 0 && (
          <section className="mt-4" aria-label="관심종목">
            <h2 className="mb-2 text-xs font-medium text-muted-foreground">관심종목</h2>
            <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {watchlist.map((w) => (
                <button
                  key={w.code}
                  type="button"
                  aria-pressed={active?.code === w.code}
                  onClick={() => setPicked(w)}
                  className={chipClass(active?.code === w.code)}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {active ? (
          <section className="mt-6" aria-label={`${active.name} 차트`}>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-foreground">{active.name}</h2>
                <p className="text-xs tabular-nums text-muted-foreground">{active.code}</p>
              </div>
              {activeStock && (
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-muted-foreground">거래대금 {activeRank}위</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatBil(activeStock.tradingAmountBil)}
                  </p>
                </div>
              )}
            </div>
            {/* key로 종목이 바뀔 때 차트를 새로 그린다 */}
            <StockEventChart
              key={active.code}
              code={active.code}
              name={active.name}
              chartHeight="min(420px, 46dvh)"
            />
            <p className="mt-3 text-[11px] text-muted-foreground">
              일봉 · 왼쪽으로 스크롤하면 최근 1년까지 볼 수 있어요
            </p>
          </section>
        ) : (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <p className="text-[15px] font-semibold text-foreground">볼 수 있는 차트가 아직 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              홈에서 종목 옆 별표를 누르면 여기에 관심종목 차트가 생겨요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
