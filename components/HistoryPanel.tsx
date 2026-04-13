"use client";

import { useState, useCallback } from "react";
import { formatDbStocks } from "@/lib/format";
import type { ResultMeta, ProcessedStock } from "@/lib/types";
import ProcessedResultTable from "./ProcessedResultTable";

interface HistoryPanelProps {
  results: ResultMeta[];
  resultsLoading: boolean;
  onRefresh: () => void;
  onDownload: (fileName: string) => void;
}

export default function HistoryPanel({
  results,
  resultsLoading,
  onRefresh,
  onDownload,
}: HistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailStocks, setDetailStocks] = useState<ProcessedStock[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const toggleDetail = useCallback(
    async (result: ResultMeta) => {
      if (!result.id) return;

      if (expandedId === result.id) {
        setExpandedId(null);
        setDetailStocks([]);
        return;
      }

      setExpandedId(result.id);
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/results/${result.id}`);
        const data = await res.json();
        if (data.stocks) {
          setDetailStocks(formatDbStocks(data.stocks));
        }
      } catch {
        setDetailStocks([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [expandedId]
  );

  const handleAnnotationUpdate = useCallback(
    (entryId: number, field: "keyword" | "reason", value: string) => {
      setDetailStocks((prev) =>
        prev.map((s) => (s.entryId === entryId ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {results.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-400">
          저장된 결과가 없습니다.
        </div>
      ) : (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-4 py-3 text-left font-medium">날짜</th>
                <th className="px-4 py-3 text-left font-medium">조건검색식</th>
                <th className="px-4 py-3 text-right font-medium">종목 수</th>
                <th className="px-4 py-3 text-right font-medium">저장 시각</th>
                <th className="px-4 py-3 text-center font-medium">다운로드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => toggleDetail(r)}
                  className={`hover:bg-gray-50 transition-colors ${
                    r.id ? "cursor-pointer" : ""
                  } ${expandedId === r.id ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3 text-gray-700">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.conditionName}
                    {r.id && (
                      <span className="ml-2 text-xs text-gray-400">
                        {expandedId === r.id ? "▲" : "▼"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600 font-medium">
                    {r.count}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(r.createdAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.fileName && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(r.fileName!);
                        }}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Excel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {expandedId && (
            <div className="border-t border-gray-200 p-4">
              {detailLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  종목 데이터 불러오는 중...
                </div>
              ) : (
                <ProcessedResultTable
                  stocks={detailStocks}
                  conditionName={
                    results.find((r) => r.id === expandedId)?.conditionName || ""
                  }
                  date={
                    results.find((r) => r.id === expandedId)?.date || ""
                  }
                  onAnnotationUpdate={handleAnnotationUpdate}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
