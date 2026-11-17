"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight } from "lucide-react";
import type { ProcessedStock } from "@/lib/types";
import ArticleModal from "./ArticleModal";
import StockChartModal from "./StockChartModal";
import WatchlistStar from "./WatchlistStar";

/** 정렬 가능한 숫자 컬럼 */
type SortKey =
  | "tradingAmountBil"
  | "turnoverRate"
  | "closingPrice"
  | "changeRate";
type SortState = { key: SortKey; dir: "desc" | "asc" };

interface ProcessedResultTableProps {
  highlightedEntryId?: number;
  stocks: ProcessedStock[];
  conditionName: string;
  date: string;
  /** 머리줄 제목. 생략하면 "가공 데이터" */
  title?: string;
  onAnnotationUpdate?: (
    entryId: number,
    field: "keyword" | "reason",
    value: string
  ) => void;
  watchlistCodes?: Set<string>;
  onToggleWatchlist?: (code: string, name: string) => void;
}

function EditableCell({
  value,
  entryId,
  field,
  onSave,
}: {
  value: string;
  entryId: number | null;
  field: "keyword" | "reason";
  onSave?: (entryId: number, field: "keyword" | "reason", value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setText(value); }, [value]);

  const handleSave = useCallback(async () => {
    setEditing(false);
    if (text === value) return;
    if (!entryId || !onSave) return;

    setSaving(true);
    try {
      const response = await fetch("/api/annotations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockEntryId: entryId,
          [field]: text,
        }),
      });
      if (!response.ok) throw new Error("저장 실패");
      onSave(entryId, field, text);
    } catch {
      setText(value); // revert on error
    } finally {
      setSaving(false);
    }
  }, [text, value, entryId, field, onSave]);

  if (!entryId || !onSave) {
    return <span className={`whitespace-pre-line ${!value || value === "미확인" ? "text-muted-foreground/80" : field === "keyword" ? "break-keep text-[13px] font-medium leading-snug text-primary" : "break-keep leading-relaxed text-foreground/90"}`}>{value || ""}</span>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setText(value);
            setEditing(false);
          }
        }}
        className="w-full rounded-lg border border-primary/60 bg-accent px-2 py-1 text-sm outline-none"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`-mx-1 inline-block min-h-[20px] min-w-[40px] cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-muted ${
        saving ? "opacity-50" : ""
      } ${!text || text === "미확인" ? "text-muted-foreground/80" : field === "keyword" ? "whitespace-pre-line break-keep text-[13px] font-medium leading-snug text-primary" : "whitespace-pre-line break-keep leading-relaxed text-foreground/90"}`}
    >
      {field === "keyword" ? (text || "").replace(/\s*·\s*/, "\n") : text || ""}
    </span>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string; title?: string }[] = [
  { key: "tradingAmountBil", label: "거래대금" },
  {
    key: "turnoverRate",
    label: "회전율",
    title: "거래대금 ÷ 시가총액 (그날 상장주식의 손바뀜 비율)",
  },
  { key: "closingPrice", label: "종가" },
  { key: "changeRate", label: "등락률" },
];

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  title,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  title?: string;
}) {
  const activeDir = sort?.key === sortKey ? sort.dir : null;
  const Icon = activeDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className="whitespace-nowrap px-3 py-2.5 text-right font-medium"
      aria-sort={activeDir === "asc" ? "ascending" : activeDir === "desc" ? "descending" : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={title}
        aria-label={`${label} 정렬`}
        className={`group -mr-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 transition-colors hover:text-foreground ${
          activeDir ? "font-semibold text-foreground" : ""
        }`}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={`h-3 w-3 transition-opacity ${
            activeDir ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-40"
          }`}
        />
      </button>
    </th>
  );
}

/** 등락률: 방향을 색과 부호로 함께 보여준다 */
function rateText(rate: number) {
  return `${rate > 0 ? "+" : ""}${rate.toFixed(2)}%`;
}
function rateTone(rate: number) {
  return rate > 0 ? "text-rise" : rate < 0 ? "text-fall" : "text-muted-foreground";
}

export default function ProcessedResultTable({
  stocks,
  highlightedEntryId,
  conditionName,
  date,
  title,
  onAnnotationUpdate,
  watchlistCodes,
  onToggleWatchlist,
}: ProcessedResultTableProps) {
  const [viewArticle, setViewArticle] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [chartTarget, setChartTarget] = useState<{
    code: string;
    name: string;
  } | null>(null);
  // null = 수집된 원본 순서 유지
  const [sort, setSort] = useState<SortState | null>(null);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" }
    );
  }, []);

  const sortedStocks = useMemo(() => {
    if (!sort) return stocks;
    const factor = sort.dir === "desc" ? -1 : 1;
    // 회전율은 상장주식수가 없으면 null → 방향과 무관하게 항상 뒤로 보낸다
    return [...stocks].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * factor;
    });
  }, [stocks, sort]);

  // 같은 종목이 넓은 화면용 표와 좁은 화면용 목록에 한 번씩 그려진다. 보이는 쪽으로 이동한다.
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);
  const highlightedItemRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!highlightedEntryId) return;
    const frame = requestAnimationFrame(() => {
      const target = [highlightedRowRef.current, highlightedItemRef.current].find(
        (el) => el && el.offsetParent !== null
      );
      if (!target) return;
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightedEntryId, stocks]);

  if (stocks.length === 0) return null;

  const formattedDate = date
    ? `${date.slice(0, 4)}년 ${date.slice(4, 6)}월 ${date.slice(6, 8)}일`
    : "";
  const heading = title ?? "가공 데이터";

  const rows = sortedStocks.map((s) => {
    const unconfirmed = !s.reason.trim() || s.reason === "미확인";
    const related = unconfirmed ? s.relatedMaterial : undefined;
    const business = unconfirmed && !related ? s.businessProfile : undefined;
    const label = related ? "관련 재료" : business ? "사업 소개" : !unconfirmed ? "상승 배경" : "";
    const badgeClass = related
      ? "bg-news-surface text-news"
      : business
        ? "bg-muted text-muted-foreground"
        : "bg-reason-surface text-reason";
    const keyword =
      related?.keyword || business?.keyword || (unconfirmed ? "" : s.keyword === "미확인" ? "" : s.keyword);
    const reason = related?.summary || business?.summary || (unconfirmed ? "" : s.reason);
    return {
      s,
      unconfirmed,
      related,
      business,
      label,
      badgeClass,
      keyword,
      reason,
      sourceUrl: related?.sourceUrl || s.sourceUrl,
      sourceTitle: related?.sourceTitle || s.sourceTitle,
      dates: related
        ? `${related.eventDate.slice(4, 6)}.${related.eventDate.slice(6)} 자료 기준 · ${related.articleDate.slice(4, 6)}.${related.articleDate.slice(6)} 보도`
        : "",
      hasThread: !!related || !!business || (!unconfirmed && !!(keyword || reason || s.sourceUrl)),
      isHighVolume: s.tradingAmountBil >= 2000,
      isHighRate: s.changeRate >= 15,
      // 하루에 상장주식의 20% 이상 손바뀜 = 단기 과열 신호
      isHighTurnover: (s.turnoverRate ?? 0) >= 20,
      highlighted: s.entryId === highlightedEntryId,
      turnoverText:
        s.turnoverRate === null ? "-" : `${s.turnoverRate.toFixed(s.turnoverRate < 1 ? 2 : 1)}%`,
      turnoverTitle: s.marketCapBil ? `시가총액 ${s.marketCapBil.toLocaleString()}억` : "상장주식수 미수집",
    };
  });
  type Row = (typeof rows)[number];

  const badgeOf = (r: Row) =>
    r.label ? (
      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${r.badgeClass}`}>
        {r.label}
      </span>
    ) : null;

  /** 근거 링크 묶음 — 표와 목록이 같이 쓴다 */
  const sourcesOf = (r: Row) => (
    <>
      {r.related && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {r.dates} · 당일 상승과의 연결은 확인되지 않음
        </p>
      )}
      {(r.business || ((!r.unconfirmed || r.related) && r.sourceUrl)) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {r.business && (
            <a
              href={r.business.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`${r.business.reportName} · ${r.business.filingDate}`}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              DART · {r.business.reportName}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
          {(!r.unconfirmed || r.related) && r.sourceUrl && (
            <button
              type="button"
              onClick={() => setViewArticle({ url: r.sourceUrl, title: r.sourceTitle })}
              title={r.sourceTitle || r.sourceUrl}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
            >
              {r.related ? "관련 기사" : "근거 기사"}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <header className="flex items-baseline justify-between gap-3 px-4 pb-3 sm:px-3">
        <h2 className="flex items-baseline gap-2 text-base font-semibold text-foreground">
          {heading}
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {stocks.length}종목
          </span>
        </h2>
        <p className="truncate text-xs text-muted-foreground">
          {[heading === conditionName ? "" : conditionName, title ? "" : formattedDate]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {/* 좁은 화면: 정렬 칩 + 종목 목록 */}
      <div className="sm:hidden">
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2">
          {SORT_OPTIONS.map((o) => {
            const activeDir = sort?.key === o.key ? sort.dir : null;
            const Icon = activeDir === "asc" ? ArrowUp : ArrowDown;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggleSort(o.key)}
                aria-label={`${o.label} 정렬`}
                aria-pressed={!!activeDir}
                className={`inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full px-3 text-[13px] font-medium transition-colors ${
                  activeDir ? "bg-foreground text-background" : "bg-muted text-foreground/80"
                }`}
              >
                {o.label}
                {activeDir && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <ul className="divide-y divide-border/60">
          {rows.map((r) => {
            const { s } = r;
            return (
              <li
                key={s.index}
                ref={r.highlighted ? highlightedItemRef : undefined}
                tabIndex={r.highlighted ? -1 : undefined}
                aria-label={r.highlighted ? `${s.name} 원본 데이터` : undefined}
                className={`px-4 py-4 outline-none ${r.highlighted ? "bg-accent ring-2 ring-inset ring-ring" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {onToggleWatchlist && (
                        <WatchlistStar
                          active={!!watchlistCodes?.has(s.code)}
                          onClick={() => onToggleWatchlist(s.code, s.name)}
                          className="-ml-1 h-7 w-7"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setChartTarget({ code: s.code, name: s.name })}
                        className="truncate text-left text-base font-semibold text-foreground"
                      >
                        {s.name}
                      </button>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-muted-foreground">
                      <span>종가 {s.closingPrice.toLocaleString()}원</span>
                      <span
                        title={r.turnoverTitle}
                        className={r.isHighTurnover ? "rounded-md bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-800" : ""}
                      >
                        회전율 {r.turnoverText}
                      </span>
                    </p>
                  </div>
                  {/* 이 화면에서 가장 중요한 숫자는 거래대금이다 */}
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-[15px] font-semibold text-foreground">
                      <span className="sr-only">거래대금 </span>
                      <span className={r.isHighVolume ? "-mr-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-orange-800" : ""}>
                        {s.tradingAmountBil.toLocaleString()}
                        <span className={`ml-0.5 text-xs font-normal ${r.isHighVolume ? "" : "text-muted-foreground"}`}>억</span>
                      </span>
                    </p>
                    <p className={`mt-1 text-[13px] font-medium ${rateTone(s.changeRate)}`}>
                      <span className={r.isHighRate ? "-mr-1.5 rounded-md bg-rise-surface px-1.5 py-0.5 font-semibold" : ""}>
                        {rateText(s.changeRate)}
                      </span>
                    </p>
                  </div>
                </div>

                {r.hasThread && (
                  <div className={`mt-3 rounded-xl p-3 ${r.highlighted ? "bg-background/70" : "bg-muted/60"}`}>
                    {(r.keyword || r.label) && (
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        {badgeOf(r)}
                        {r.keyword && (
                          <span className="break-keep text-[13px] font-semibold text-foreground">{r.keyword}</span>
                        )}
                      </div>
                    )}
                    {r.reason && (
                      <p className="whitespace-pre-line break-keep text-[13px] leading-relaxed text-foreground/80">
                        {r.reason}
                      </p>
                    )}
                    {sourcesOf(r)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* 넓은 화면: 7열 표 */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border/60 text-xs text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-medium">종목명</th>
              <th className="w-40 px-3 py-2.5 text-left font-medium">키워드</th>
              {SORT_OPTIONS.map((o) => (
                <SortHeader
                  key={o.key}
                  label={o.label}
                  sortKey={o.key}
                  sort={sort}
                  onSort={toggleSort}
                  title={o.title}
                />
              ))}
              <th className="min-w-[220px] px-3 py-2.5 pl-6 text-left font-medium">상승이유</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => {
              const { s } = r;
              const editable = r.business || r.related ? undefined : onAnnotationUpdate;
              return (
                <tr
                  key={s.index}
                  ref={r.highlighted ? highlightedRowRef : undefined}
                  tabIndex={r.highlighted ? -1 : undefined}
                  aria-label={r.highlighted ? `${s.name} 원본 데이터` : undefined}
                  className={
                    r.highlighted
                      ? "bg-accent outline outline-2 -outline-offset-2 outline-ring"
                      : "transition-colors hover:bg-muted/40"
                  }
                >
                  <td className="whitespace-nowrap px-3 py-4 align-top">
                    <div className="flex items-center gap-1.5">
                      {onToggleWatchlist && (
                        <WatchlistStar
                          active={!!watchlistCodes?.has(s.code)}
                          onClick={() => onToggleWatchlist(s.code, s.name)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setChartTarget({ code: s.code, name: s.name })}
                        className="text-[15px] font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {s.name}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <EditableCell value={r.keyword} entryId={s.entryId} field="keyword" onSave={editable} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right align-top tabular-nums">
                    <span
                      className={
                        r.isHighVolume
                          ? "-mr-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-800"
                          : "font-medium text-foreground"
                      }
                    >
                      {s.tradingAmountBil.toLocaleString()}억
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right align-top tabular-nums" title={r.turnoverTitle}>
                    <span
                      className={
                        r.isHighTurnover
                          ? "-mr-1.5 rounded-md bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-800"
                          : "text-foreground/80"
                      }
                    >
                      {r.turnoverText}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right align-top tabular-nums text-foreground/80">
                    {s.closingPrice.toLocaleString()}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-4 text-right align-top font-medium tabular-nums ${rateTone(s.changeRate)}`}>
                    <span className={r.isHighRate ? "-mr-1.5 rounded-md bg-rise-surface px-1.5 py-0.5 font-semibold" : ""}>
                      {rateText(s.changeRate)}
                    </span>
                  </td>
                  <td className="px-3 py-4 pl-6 align-top">
                    {r.label && <div className="mb-1.5">{badgeOf(r)}</div>}
                    <EditableCell value={r.reason} entryId={s.entryId} field="reason" onSave={editable} />
                    {sourcesOf(r)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewArticle && (
        <ArticleModal
          url={viewArticle.url}
          fallbackTitle={viewArticle.title}
          onClose={() => setViewArticle(null)}
        />
      )}
      {chartTarget && (
        <StockChartModal
          code={chartTarget.code}
          name={chartTarget.name}
          onClose={() => setChartTarget(null)}
        />
      )}
    </section>
  );
}
