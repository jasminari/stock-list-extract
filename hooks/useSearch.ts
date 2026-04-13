"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatProcessedStocks, formatDbStocks } from "@/lib/format";
import type { StockResult, ProcessedStock } from "@/lib/types";

export function useSearch() {
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [stocks, setStocks] = useState<StockResult[]>([]);
  const [lastFileName, setLastFileName] = useState("");
  const [searchResultId, setSearchResultId] = useState<number | null>(null);
  const [dbStocks, setDbStocks] = useState<ProcessedStock[]>([]);

  // DB에서 종목 로드 (searchResultId 변경 시)
  useEffect(() => {
    if (!searchResultId) {
      setDbStocks([]);
      return;
    }
    fetch(`/api/results/${searchResultId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.stocks) setDbStocks(formatDbStocks(data.stocks));
      })
      .catch(() => {});
  }, [searchResultId]);

  const runSearch = useCallback(
    async (seq: string, conditionName: string) => {
      if (!seq) return;
      setSearching(true);
      setSearchError("");
      setStocks([]);
      setSearchResultId(null);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seq, conditionName }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setStocks(data.stocks);
        setLastFileName(data.fileName);
        if (data.searchResultId) setSearchResultId(data.searchResultId);
        return data;
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : "오류가 발생했습니다");
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const processedStocks = useMemo(() => {
    if (dbStocks.length > 0) return dbStocks;
    return formatProcessedStocks(stocks);
  }, [dbStocks, stocks]);

  const handleAnnotationUpdate = useCallback(
    (entryId: number, field: "keyword" | "reason", value: string) => {
      setDbStocks((prev) =>
        prev.map((s) => (s.entryId === entryId ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const downloadFile = useCallback((fileName: string) => {
    window.open(`/api/download?file=${encodeURIComponent(fileName)}`, "_blank");
  }, []);

  return {
    searching,
    searchError,
    stocks,
    lastFileName,
    searchResultId,
    processedStocks,
    runSearch,
    handleAnnotationUpdate,
    downloadFile,
  };
}
