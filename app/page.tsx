"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Condition {
  seq: string;
  name: string;
}

interface StockResult {
  code: string;
  name: string;
  price: string;
  change_sign: string;
  change: string;
  change_rate: string;
  volume: string;
  open: string;
  high: string;
  low: string;
}

interface ResultMeta {
  fileName: string;
  date: string;
  conditionName: string;
  count: number;
  createdAt: string;
}

function formatNumber(val: string) {
  const n = Number(val.replace(/^[+-]/, ""));
  return isNaN(n) ? val : n.toLocaleString();
}

function ChangeCell({ sign, value, rate }: { sign: string; value: string; rate: string }) {
  const isUp = sign === "2";
  const isDown = sign === "5";
  const color = isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-500";
  const prefix = isUp ? "▲" : isDown ? "▼" : "";
  return (
    <span className={color}>
      {prefix} {formatNumber(value)} ({rate.replace(/^[+-]/, "")}%)
    </span>
  );
}

export default function Home() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [selectedSeq, setSelectedSeq] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");
  const [condLoading, setCondLoading] = useState(false);
  const [condError, setCondError] = useState<string>("");

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>("");
  const [stocks, setStocks] = useState<StockResult[]>([]);
  const [lastFileName, setLastFileName] = useState<string>("");

  const [results, setResults] = useState<ResultMeta[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"search" | "history">("search");

  const loadConditions = useCallback(async () => {
    setCondLoading(true);
    setCondError("");
    try {
      const res = await fetch("/api/conditions");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConditions(data.conditions);
      if (data.conditions.length > 0) {
        setSelectedSeq(data.conditions[0].seq);
        setSelectedName(data.conditions[0].name);
      }
    } catch (e) {
      setCondError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setCondLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      if (!data.error) setResults(data.results);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConditions();
    loadResults();
  }, [loadConditions, loadResults]);

  const runSearch = async () => {
    if (!selectedSeq) return;
    setSearching(true);
    setSearchError("");
    setStocks([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seq: selectedSeq, conditionName: selectedName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStocks(data.stocks);
      setLastFileName(data.fileName);
      loadResults();
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setSearching(false);
    }
  };

  const downloadFile = (fileName: string) => {
    window.open(`/api/download?file=${encodeURIComponent(fileName)}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900">조건검색 종목 추출</h1>
          <p className="text-sm text-gray-500 mt-1">키움증권 REST API 연동</p>
        </motion.div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(["search", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "search" ? "조건검색 실행" : "저장 이력"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "search" ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 조건검색 선택 패널 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-800">조건검색식 선택</h2>
                  <button
                    onClick={loadConditions}
                    disabled={condLoading}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
                  >
                    {condLoading ? "불러오는 중..." : "새로고침"}
                  </button>
                </div>

                {condError && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {condError}
                  </div>
                )}

                {conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {conditions.map((c) => (
                      <button
                        key={c.seq}
                        onClick={() => {
                          setSelectedSeq(c.seq);
                          setSelectedName(c.name);
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          selectedSeq === c.seq
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  !condLoading && (
                    <p className="text-sm text-gray-400">
                      조건검색식을 불러오려면 새로고침을 눌러주세요.
                    </p>
                  )
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={runSearch}
                    disabled={!selectedSeq || searching}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {searching ? "검색 중..." : "조건검색 실행"}
                  </button>
                  {lastFileName && (
                    <button
                      onClick={() => downloadFile(lastFileName)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Excel 다운로드
                    </button>
                  )}
                </div>

                {searchError && (
                  <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {searchError}
                  </div>
                )}
              </div>

              {/* 검색 결과 테이블 */}
              {stocks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">
                      검색 결과{" "}
                      <span className="text-blue-600 font-bold">{stocks.length}</span>
                      종목
                    </h2>
                    <span className="text-xs text-gray-400">{selectedName}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs">
                          <th className="px-4 py-3 text-left font-medium">종목코드</th>
                          <th className="px-4 py-3 text-left font-medium">종목명</th>
                          <th className="px-4 py-3 text-right font-medium">현재가</th>
                          <th className="px-4 py-3 text-right font-medium">전일대비</th>
                          <th className="px-4 py-3 text-right font-medium">거래량</th>
                          <th className="px-4 py-3 text-right font-medium">시가</th>
                          <th className="px-4 py-3 text-right font-medium">고가</th>
                          <th className="px-4 py-3 text-right font-medium">저가</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {stocks.map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-500">{s.code}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatNumber(s.price)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ChangeCell
                                sign={s.change_sign}
                                value={s.change}
                                rate={s.change_rate}
                              />
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatNumber(s.volume)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatNumber(s.open)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatNumber(s.high)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatNumber(s.low)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800">저장된 결과</h2>
                  <button
                    onClick={loadResults}
                    disabled={resultsLoading}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
                  >
                    {resultsLoading ? "로딩 중..." : "새로고침"}
                  </button>
                </div>
                {results.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-gray-400">
                    저장된 결과가 없습니다.
                  </div>
                ) : (
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
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-700">{r.date}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {r.conditionName}
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
                            <button
                              onClick={() => downloadFile(r.fileName)}
                              className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              Excel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

