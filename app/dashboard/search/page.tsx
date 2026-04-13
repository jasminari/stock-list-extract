"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useConditions } from "@/hooks/useConditions";
import { useSearch } from "@/hooks/useSearch";
import { getTodayStr } from "@/lib/date";
import ProcessedResultTable from "@/components/ProcessedResultTable";
import RawResultTable from "@/components/RawResultTable";

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<"processed" | "raw">("processed");
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const cond = useConditions();
  const search = useSearch();
  const todayStr = getTodayStr();

  const handleSearch = () => {
    search.runSearch(cond.selectedSeq, cond.selectedName);
  };

  const handleSelectCondition = (seq: string, name: string) => {
    cond.select(seq, name);
    setShowInfoBanner(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Breadcrumb + View Toggle */}
      <div className="border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>내 검색</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">조건검색 실행</span>
          </div>
          {search.stocks.length > 0 && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode("processed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "processed"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                가공 뷰
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "raw"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                </svg>
                원본 데이터
              </button>
            </div>
          )}
        </div>

        {/* Condition Selection */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-500 flex-shrink-0">조건검색식:</span>
          {cond.loading ? (
            <span className="text-xs text-gray-400">불러오는 중...</span>
          ) : cond.error ? (
            <span className="text-xs text-red-500">{cond.error}</span>
          ) : cond.conditions.length > 0 ? (
            cond.conditions.map((c) => (
              <button
                key={c.seq}
                onClick={() => handleSelectCondition(c.seq, c.name)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  cond.selectedSeq === c.seq
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {c.name}
              </button>
            ))
          ) : (
            <span className="text-xs text-gray-400">조건검색식이 없습니다</span>
          )}
          <button
            onClick={cond.load}
            disabled={cond.loading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
            title="새로고침"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            disabled={!cond.selectedSeq || search.searching}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {search.searching ? "검색 중..." : "조건검색 실행"}
          </button>
          {search.lastFileName && (
            <button
              onClick={() => search.downloadFile(search.lastFileName)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel 다운로드
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {cond.selectedName && showInfoBanner && (
        <div className="mx-6 mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <p className="flex-1 text-sm text-blue-900">
            선택한 조건검색식 <span className="font-semibold">&apos;{cond.selectedName}&apos;</span>에 대한 결과를 표시합니다.
            키움증권 REST API를 통해 실시간으로 종목을 추출합니다.
          </p>
          <button
            onClick={() => setShowInfoBanner(false)}
            className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error */}
      {search.searchError && (
        <div className="mx-6 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex-shrink-0">
          {search.searchError}
        </div>
      )}

      {/* Filter Bar */}
      {search.stocks.length > 0 && (
        <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            필터
          </button>
          <button className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">거래대금</button>
          <button className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">등락률</button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">{search.stocks.length}개 종목</span>
        </div>
      )}

      {/* Results Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {search.stocks.length === 0 && !search.searching ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">조건검색식을 선택하고 실행해주세요</p>
            <p className="text-gray-400 text-xs mt-1">키움증권 REST API를 통해 종목을 추출합니다</p>
          </div>
        ) : search.searching ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">종목을 검색하는 중입니다...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === "processed" ? (
              <ProcessedResultTable
                key="processed"
                stocks={search.processedStocks}
                conditionName={cond.selectedName}
                date={todayStr}
                onAnnotationUpdate={search.handleAnnotationUpdate}
              />
            ) : (
              <RawResultTable
                key="raw"
                stocks={search.stocks}
                conditionName={cond.selectedName}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
