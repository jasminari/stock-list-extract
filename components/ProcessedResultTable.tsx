"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { ProcessedStock } from "@/lib/types";

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
        className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded outline-none bg-blue-50"
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

export default function ProcessedResultTable({
  stocks,
  conditionName,
  date,
  onAnnotationUpdate,
}: ProcessedResultTableProps) {
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
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            가공 데이터{" "}
            <span className="text-blue-600 font-bold">{stocks.length}</span>
            종목
          </h2>
          <span className="text-xs text-gray-400">{conditionName}</span>
        </div>
        {formattedDate && (
          <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="px-3 py-3 text-center font-medium w-12">번호</th>
              <th className="px-3 py-3 text-left font-medium">종목명</th>
              <th className="px-3 py-3 text-left font-medium w-28">키워드</th>
              <th className="px-3 py-3 text-right font-medium">거래대금(억)</th>
              <th className="px-3 py-3 text-right font-medium">종가</th>
              <th className="px-3 py-3 text-right font-medium">등락률</th>
              <th className="px-3 py-3 text-left font-medium min-w-[200px]">
                상승이유
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stocks.map((s) => {
              const isHighVolume = s.tradingAmountBil >= 2000;
              const isHighRate = s.changeRate >= 15;

              return (
                <tr key={s.index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-500">
                    {s.index}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-3 py-3">
                    <EditableCell
                      value={s.keyword}
                      entryId={s.entryId}
                      field="keyword"
                      onSave={onAnnotationUpdate}
                    />
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-medium ${
                      isHighVolume
                        ? "bg-orange-100 text-orange-800"
                        : "text-gray-700"
                    }`}
                  >
                    {s.tradingAmountBil.toLocaleString()}억
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">
                    {s.closingPrice.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-medium ${
                      isHighRate ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {s.changeRate.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3">
                    <EditableCell
                      value={s.reason}
                      entryId={s.entryId}
                      field="reason"
                      onSave={onAnnotationUpdate}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
