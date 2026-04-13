"use client";

import { useState, useEffect, useCallback } from "react";

interface CollectedData {
  id: number;
  date: string;
  conditionName: string;
  count: number;
  createdAt: string;
}

function formatDate(dateStr: string) {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function formatTime(isoStr: string) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
}

// 날짜별로 그룹핑
function groupByDate(data: CollectedData[]) {
  const groups: { date: string; items: CollectedData[] }[] = [];
  let currentDate = "";
  for (const item of data) {
    if (item.date !== currentDate) {
      currentDate = item.date;
      groups.push({ date: item.date, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

export default function DataPage() {
  const [data, setData] = useState<CollectedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/results");
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setData(json.results ?? []);
    } catch {
      setError("수집 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = async (item: CollectedData) => {
    setDownloadingId(item.id);
    try {
      const fileName = `${item.date}_${item.conditionName}.xlsx`;
      const res = await fetch(`/api/download?resultId=${item.id}&file=${encodeURIComponent(fileName)}`);
      if (!res.ok) {
        setError("다운로드에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloadingId(null);
    }
  };

  const groups = groupByDate(data);
  const totalCount = data.length;
  const successCount = data.filter((d) => d.count > 0).length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">수집 데이터</h1>
          <p className="text-sm text-gray-500 mt-1">
            매일 자동으로 수집된 조건검색 결과 목록입니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-3">수집 데이터를 불러오는 중...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <p className="text-sm text-gray-500">수집된 데이터가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">설정에서 조건검색식을 등록하면 매일 자동으로 수집됩니다.</p>
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">전체 수집</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}건</p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">성공</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{successCount}건</p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">실패</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{totalCount - successCount}건</p>
              </div>
            </div>

            {/* 데이터 리스트 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium">날짜</th>
                    <th className="px-4 py-3 text-left font-medium">조건검색식</th>
                    <th className="px-4 py-3 text-right font-medium">종목수</th>
                    <th className="px-4 py-3 text-center font-medium">상태</th>
                    <th className="px-4 py-3 text-right font-medium">수집 시각</th>
                    <th className="px-4 py-3 text-center font-medium">다운로드</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) =>
                    group.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          selectedId === item.id ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          {idx === 0 ? (
                            <span className="font-medium text-gray-900">{formatDate(item.date)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{item.conditionName}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${item.count > 0 ? "text-blue-600" : "text-gray-400"}`}>
                            {item.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              성공
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              실패
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 text-xs">
                          {formatTime(item.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.count > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item);
                              }}
                              disabled={downloadingId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40"
                            >
                              {downloadingId === item.id ? (
                                <div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              )}
                              Excel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 안내 */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          데이터는 매일 평일 20:10(KST)에 자동 수집됩니다. 설정에서 조건검색식을 관리할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
