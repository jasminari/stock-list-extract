"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import StockEventChart from "@/components/StockEventChart";
import ProcessedResultTable from "@/components/ProcessedResultTable";
import { BottomSheet, type SheetSnap } from "@/components/ui/bottom-sheet";
import { useWatchlist } from "@/lib/useWatchlist";
import { withPreviewThemes } from "@/lib/themePreview";
import { LoadingIcon } from "@/components/ui/loading-icon";
import { formatDbStocks } from "@/lib/format";
import { parseDate } from "@/lib/date";
import type { ProcessedStock, ResultMeta } from "@/lib/types";

interface Pick {
  code: string;
  name: string;
}

/** 시트를 가장 낮게 내렸을 때 보이는 높이(px) */
const PEEK_HEIGHT = 118;
/** 이만큼(px) 옆으로 밀어야 다음 종목으로 넘어간다 */
const SWIPE_DISTANCE = 48;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

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
  const { data: session } = useSession();
  const { codes: watchlistCodes, toggle: toggleWatchlist } = useWatchlist();

  const [latest, setLatest] = useState<ResultMeta | null>(null);
  const [stocks, setStocks] = useState<ProcessedStock[]>([]);
  const [watchlist, setWatchlist] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Pick | null>(
    codeParam ? { code: codeParam, name: nameParam || codeParam } : null
  );
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [tab, setTab] = useState<"list" | "watchlist">("list");
  const [slide, setSlide] = useState<"left" | "right" | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // 테마별 묶음은 아직 미리보기라 홈과 같은 조건(관리자 또는 미리보기를 켠 브라우저)에서만 쓴다
  const [previewOptIn, setPreviewOptIn] = useState(false);
  useEffect(() => {
    try {
      setPreviewOptIn(localStorage.getItem("marketStudyPreview") === "1");
    } catch {
      // 저장소를 못 쓰면 미리보기 없이 보여 준다
    }
  }, []);
  const grouped = session?.user?.role === "admin" || previewOptIn;

  // 가장 최근 목록
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
        setLatest(newest);
        setStocks(detail.stocks ? formatDbStocks(detail.stocks) : []);
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

  /** 거래대금이 큰 순서. 좌우로 넘길 때 이 순서를 따른다 */
  const ranked = useMemo(
    () => [...stocks].sort((a, b) => b.tradingAmountBil - a.tradingAmountBil),
    [stocks]
  );
  const sheetStocks = useMemo(
    () => (grouped ? withPreviewThemes(stocks) : stocks),
    [grouped, stocks]
  );

  // 고른 종목이 없으면 거래대금 1위, 그것도 없으면 첫 관심종목
  const active = useMemo<Pick | null>(() => {
    if (picked) return picked;
    if (ranked[0]) return { code: ranked[0].code, name: ranked[0].name };
    return watchlist[0] ?? null;
  }, [picked, ranked, watchlist]);

  // 넘겨 볼 묶음: 고른 종목이 오늘 목록에 있으면 목록, 아니면 관심종목
  const rankIndex = ranked.findIndex((s) => s.code === active?.code);
  const deck: Pick[] = rankIndex >= 0 ? ranked : watchlist;
  const deckIndex = deck.findIndex((s) => s.code === active?.code);
  const activeStock = rankIndex >= 0 ? ranked[rankIndex] : undefined;

  const go = (direction: -1 | 1) => {
    const next = deck[deckIndex + direction];
    if (!next) return;
    setSlide(direction === 1 ? "left" : "right");
    setPicked({ code: next.code, name: next.name });
  };

  const select = (code: string, name: string) => {
    setSlide(null);
    setPicked({ code, name });
    setSnap("peek");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? 1 : -1);
  };

  if (loading && !active) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingIcon className="h-20 w-20 text-primary" label="차트 불러오는 중" />
      </div>
    );
  }

  const latestDate = latest ? parseDate(latest.date) : null;
  const arrowClass =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";
  const tabClass = (on: boolean) =>
    `flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors ${
      on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
    }`;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: PEEK_HEIGHT + 16 }}>
        <div className="mx-auto max-w-3xl px-4 pt-2 md:px-8 md:pt-5">
          {active ? (
            <section aria-label={`${active.name} 차트`}>
              {/* 이 머리 부분을 좌우로 밀면 앞뒤 종목으로 넘어간다. 차트 위에서 밀면 날짜가 움직인다 */}
              <div
                className="-mx-2 flex touch-pan-y items-center gap-1"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <button
                  type="button"
                  aria-label="이전 종목"
                  disabled={deckIndex <= 0}
                  onClick={() => go(-1)}
                  className={arrowClass}
                >
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <div
                  key={active.code}
                  className={`flex min-w-0 flex-1 items-end justify-between gap-3 ${
                    slide === "left" ? "chart-slide-left" : slide === "right" ? "chart-slide-right" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold text-foreground">{active.name}</h1>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {active.code}
                      {deckIndex >= 0 && deck.length > 1 && (
                        <span className="ml-2">
                          {deckIndex + 1} / {deck.length}
                        </span>
                      )}
                    </p>
                  </div>
                  {activeStock && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted-foreground">거래대금 {rankIndex + 1}위</p>
                      <p className="text-xl font-bold tabular-nums text-foreground">
                        {formatBil(activeStock.tradingAmountBil)}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="다음 종목"
                  disabled={deckIndex < 0 || deckIndex >= deck.length - 1}
                  onClick={() => go(1)}
                  className={arrowClass}
                >
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
              <div className="mt-3">
                {/* key로 종목이 바뀔 때 차트를 새로 그린다 */}
                <StockEventChart
                  key={active.code}
                  code={active.code}
                  name={active.name}
                  chartHeight="clamp(220px, calc(100dvh - 500px), 900px)"
                />
              </div>
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

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        peekHeight={PEEK_HEIGHT}
        label="종목 목록"
        header={
          <div className="px-4 pb-3">
            <p className="flex items-baseline justify-between pb-2.5 text-[15px] font-bold text-foreground">
              <span>
                {latestDate
                  ? `${latestDate.getMonth() + 1}월 ${latestDate.getDate()}일 ${WEEKDAYS[latestDate.getDay()]}요일`
                  : "종목 목록"}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                종목을 누르면 차트가 바뀌어요
              </span>
            </p>
            <div className="flex gap-1 rounded-2xl bg-muted p-1">
              <button
                type="button"
                aria-pressed={tab === "list"}
                onClick={() => {
                  setTab("list");
                  if (snap === "peek") setSnap("half");
                }}
                className={tabClass(tab === "list")}
              >
                그날 목록
                <span className="tabular-nums font-medium opacity-60">{stocks.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={tab === "watchlist"}
                onClick={() => {
                  setTab("watchlist");
                  if (snap === "peek") setSnap("half");
                }}
                className={tabClass(tab === "watchlist")}
              >
                관심종목
                <span className="tabular-nums font-medium opacity-60">{watchlist.length}</span>
              </button>
            </div>
          </div>
        }
      >
        {tab === "list" ? (
          stocks.length > 0 && latest ? (
            <ProcessedResultTable
              stocks={sheetStocks}
              grouped={grouped}
              conditionName={latest.conditionName}
              date={latest.date}
              title={latest.conditionName}
              watchlistCodes={watchlistCodes}
              onToggleWatchlist={toggleWatchlist}
              onStockSelect={select}
            />
          ) : (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              아직 불러온 목록이 없어요
            </p>
          )
        ) : watchlist.length > 0 ? (
          <ul className="px-2 pb-6">
            {watchlist.map((w) => (
              <li key={w.code}>
                <button
                  type="button"
                  aria-current={active?.code === w.code ? "true" : undefined}
                  onClick={() => select(w.code, w.name)}
                  className={`flex h-14 w-full items-center justify-between rounded-xl px-3 text-left transition-colors hover:bg-muted ${
                    active?.code === w.code ? "bg-accent" : ""
                  }`}
                >
                  <span className="truncate text-[15px] font-semibold text-foreground">{w.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{w.code}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            홈에서 종목 옆 별표를 누르면 여기에 모여요
          </p>
        )}
      </BottomSheet>
    </div>
  );
}
