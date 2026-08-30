"use client";

import { Fragment, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import type { ProcessedStock } from "@/lib/types";
import ArticleModal from "./ArticleModal";

/** 정렬 가능한 숫자 컬럼 */
type SortKey =
  | "tradingAmountBil"
  | "turnoverRate"
  | "closingPrice"
  | "changeRate";
type SortState = { key: SortKey; dir: "desc" | "asc" };

interface ProcessedResultTableProps {
  stocks: ProcessedStock[];
  conditionName: string;
  date: string;
  onAnnotationUpdate?: (
    entryId: number,
    field: "keyword" | "reason",
    value: string
  ) => void;
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

  const handleSave = useCallback(async () => {
    setEditing(false);
    if (text === value) return;
    if (!entryId || !onSave) return;

    setSaving(true);
    try {
      await fetch("/api/annotations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockEntryId: entryId,
          [field]: text,
        }),
      });
      onSave(entryId, field, text);
    } catch {
      setText(value); // revert on error
    } finally {
      setSaving(false);
    }
  }, [text, value, entryId, field, onSave]);

  if (!entryId) {
    return <span className="text-gray-300">-</span>;
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
        className="w-full px-1 py-0.5 text-sm border border-indigo-400 rounded outline-none bg-indigo-50"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 inline-block min-w-[40px] min-h-[20px] ${
        saving ? "opacity-50" : ""
      } ${text ? "text-gray-700" : "text-gray-300"}`}
    >
      {text || "-"}
    </span>
  );
}

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

  return (
    <th className="px-2 md:px-3 py-2 md:py-3 text-right font-medium whitespace-nowrap">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={title}
        aria-label={`${label} 정렬`}
        className={`inline-flex items-center gap-1 hover:text-gray-700 transition-colors ${
          activeDir ? "text-indigo-600" : ""
        }`}
      >
        {label}
        <span className="flex flex-col leading-[0.6] text-[7px] md:text-[8px]">
          <span className={activeDir === "asc" ? "text-indigo-600" : "text-gray-300"}>
            ▲
          </span>
          <span className={activeDir === "desc" ? "text-indigo-600" : "text-gray-300"}>
            ▼
          </span>
        </span>
      </button>
    </th>
  );
}

export default function ProcessedResultTable({
  stocks,
  conditionName,
  date,
  onAnnotationUpdate,
}: ProcessedResultTableProps) {
  const [viewArticle, setViewArticle] = useState<{
    url: string;
    title: string;
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

  if (stocks.length === 0) return null;

  const formattedDate = date
    ? `${date.slice(0, 4)}년 ${date.slice(4, 6)}월 ${date.slice(6, 8)}일`
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm md:text-base font-semibold text-gray-800">
            가공 데이터{" "}
            <span className="text-indigo-600 font-bold">{stocks.length}</span>
            종목
          </h2>
          <span className="text-[10px] md:text-xs text-gray-400">{conditionName}</span>
        </div>
        {formattedDate && (
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">{formattedDate}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs">
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-medium">종목명</th>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-medium w-20 md:w-28 hidden sm:table-cell">키워드</th>
              <SortHeader
                label="거래대금"
                sortKey="tradingAmountBil"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader
                label="회전율"
                sortKey="turnoverRate"
                sort={sort}
                onSort={toggleSort}
                title="거래대금 ÷ 시가총액 (그날 상장주식의 손바뀜 비율)"
              />
              <SortHeader
                label="종가"
                sortKey="closingPrice"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader
                label="등락률"
                sortKey="changeRate"
                sort={sort}
                onSort={toggleSort}
              />
              <th className="px-2 md:px-3 py-2 md:py-3 text-left font-medium min-w-[120px] md:min-w-[200px] hidden sm:table-cell">
                상승이유
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedStocks.map((s) => {
              const isHighVolume = s.tradingAmountBil >= 2000;
              const isHighRate = s.changeRate >= 15;
              // 하루에 상장주식의 20% 이상 손바뀜 = 단기 과열 신호
              const isHighTurnover = (s.turnoverRate ?? 0) >= 20;
              const hasThread = !!(s.keyword || s.reason || s.sourceUrl);

              return (
                <Fragment key={s.index}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 md:px-3 py-1.5 md:py-3 font-medium text-gray-900 whitespace-nowrap">
                    {s.name}
                  </td>
                  <td className="px-2 md:px-3 py-1.5 md:py-3 hidden sm:table-cell">
                    <EditableCell
                      value={s.keyword}
                      entryId={s.entryId}
                      field="keyword"
                      onSave={onAnnotationUpdate}
                    />
                  </td>
                  <td
                    className={`px-2 md:px-3 py-1.5 md:py-3 text-right font-medium whitespace-nowrap ${
                      isHighVolume
                        ? "bg-orange-100 text-orange-800"
                        : "text-gray-700"
                    }`}
                  >
                    {s.tradingAmountBil.toLocaleString()}억
                  </td>
                  <td
                    className={`px-2 md:px-3 py-1.5 md:py-3 text-right whitespace-nowrap ${
                      isHighTurnover
                        ? "bg-purple-100 text-purple-800 font-medium"
                        : "text-gray-700"
                    }`}
                    title={
                      s.marketCapBil
                        ? `시가총액 ${s.marketCapBil.toLocaleString()}억`
                        : "상장주식수 미수집"
                    }
                  >
                    {s.turnoverRate === null
                      ? "-"
                      : `${s.turnoverRate.toFixed(s.turnoverRate < 1 ? 2 : 1)}%`}
                  </td>
                  <td className="px-2 md:px-3 py-1.5 md:py-3 text-right text-gray-700 whitespace-nowrap">
                    {s.closingPrice.toLocaleString()}
                  </td>
                  <td
                    className={`px-2 md:px-3 py-1.5 md:py-3 text-right font-medium whitespace-nowrap ${
                      isHighRate ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {s.changeRate.toFixed(2)}%
                  </td>
                  <td className="px-2 md:px-3 py-1.5 md:py-3 hidden sm:table-cell">
                    <EditableCell
                      value={s.reason}
                      entryId={s.entryId}
                      field="reason"
                      onSave={onAnnotationUpdate}
                    />
                    {s.sourceUrl && (
                      <button
                        onClick={() =>
                          setViewArticle({
                            url: s.sourceUrl,
                            title: s.sourceTitle,
                          })
                        }
                        title={s.sourceTitle || s.sourceUrl}
                        className="block text-left text-[10px] md:text-xs text-indigo-500 hover:underline truncate max-w-[200px] md:max-w-[280px] mt-0.5"
                      >
                        🔗 {s.sourceTitle || "기사 보기"}
                      </button>
                    )}
                  </td>
                </tr>
                {/* 모바일 전용: 종목 아래 스레드형 서브 행 (키워드/상승이유/기사 링크) */}
                {hasThread && (
                  <tr className="sm:hidden !border-t-0">
                    <td colSpan={7} className="px-2 pb-2 pt-0">
                      <div className="ml-1 pl-2.5 border-l-2 border-indigo-200 space-y-1">
                        {s.keyword && (
                          <span className="inline-block text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
                            {s.keyword}
                          </span>
                        )}
                        {s.reason && (
                          <p className="text-[11px] text-gray-600 leading-snug whitespace-pre-line">
                            {s.reason}
                          </p>
                        )}
                        {s.sourceUrl && (
                          <button
                            onClick={() =>
                              setViewArticle({
                                url: s.sourceUrl,
                                title: s.sourceTitle,
                              })
                            }
                            className="block w-full text-left text-[11px] text-indigo-500 hover:underline truncate"
                          >
                            🔗 {s.sourceTitle || "기사 보기"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
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
    </motion.div>
  );
}
