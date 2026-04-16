"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface CollectedData {
  id: number;
  date: string;
  conditionName: string;
  count: number;
  createdAt: string;
}

interface RegisteredCondition {
  id: number;
  seq: string;
  name: string;
  registeredAt: string;
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
  const { data: session } = useSession();
  const router = useRouter();
  const [allData, setAllData] = useState<CollectedData[]>([]);
  const [registered, setRegistered] = useState<RegisteredCondition[]>([]);
  const [subscribed, setSubscribed] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [togglingSeq, setTogglingSeq] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [resultsRes, conditionsRes, subRes] = await Promise.all([
        fetch("/api/results"),
        fetch("/api/registered-conditions"),
        fetch("/api/user-subscriptions"),
      ]);
      const resultsJson = await resultsRes.json();
      const conditionsJson = await conditionsRes.json();
      const subJson = await subRes.json();

      if (resultsJson.error) {
        setError(resultsJson.error);
      } else {
        setAllData(resultsJson.results ?? []);
      }
      setRegistered(conditionsJson.conditions ?? []);
      setSubscribed(new Set(subJson.subscriptions ?? []));
    } catch {
      setError("수집 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (openDropdown === null) return;
    const handleClick = () => setOpenDropdown(null);
    const timer = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [openDropdown]);

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

  const handleViewResult = (item: CollectedData) => {
    router.push(`/dashboard/history?resultId=${item.id}`);
  };

  const handleSubscribe = async (seq: string) => {
    setTogglingSeq(seq);
    try {
      const res = await fetch("/api/user-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditionSeq: seq }),
      });
      const data = await res.json();
      if (!data.error) {
        setSubscribed((prev) => {
          const next = new Set(prev);
          next.add(seq);
          return next;
        });
      }
    } catch {
      setError("선택에 실패했습니다.");
    } finally {
      setTogglingSeq(null);
      setOpenDropdown(null);
    }
  };

  const handleUnsubscribe = async (seq: string) => {
    setTogglingSeq(seq);
    try {
      const res = await fetch("/api/user-subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditionSeq: seq }),
      });
      const data = await res.json();
      if (!data.error) {
        setSubscribed((prev) => {
          const next = new Set(prev);
          next.delete(seq);
          return next;
        });
      }
    } catch {
      setError("해제에 실패했습니다.");
    } finally {
      setTogglingSeq(null);
    }
  };

  // 수동 수집
  const handleExtractNow = async () => {
    setExtracting(true);
    setExtractResult(null);
    setError(null);
    try {
      const todayStr = new Date()
        .toLocaleDateString("ko-KR", {
          year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul",
        })
        .replace(/\. /g, "").replace(".", "");

      const res = await fetch("/api/extract-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      const total = data.results?.reduce((s: number, r: { count: number }) => s + r.count, 0) ?? 0;
      setExtractResult(`${data.results?.length}개 조건검색 완료 (총 ${total}종목)`);
      loadData();
    } catch {
      setError("수집에 실패했습니다. 로컬 서버에서 실행해주세요.");
    } finally {
      setExtracting(false);
    }
  };

  // 내 수집 현황 카드에만 구독 필터 적용
  const myRegistered = subscribed
    ? registered.filter((c) => subscribed.has(c.seq))
    : [];

  // 선택 안 된 조건검색식 (드롭다운용)
  const unsubscribedConditions = registered.filter(
    (c) => !subscribed || !subscribed.has(c.seq)
  );

  // 요약 카드 + 데이터 리스트는 전체 데이터
  const data = allData;

  // 각 등록 조건의 최신 수집 상태
  const getConditionStatus = (condName: string) => {
    const latest = allData.find((d) => d.conditionName === condName);
    if (!latest) return { status: "waiting" as const, date: "" };
    return {
      status: latest.count > 0 ? ("success" as const) : ("error" as const),
      date: latest.date,
      count: latest.count,
    };
  };

  const groups = groupByDate(data);
  const totalCount = data.length;
  const successCount = data.filter((d) => d.count > 0).length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">수집 데이터</h1>
          <p className="text-sm text-gray-500 mt-1">
            매일 자동으로 수집된 조건검색 결과 목록입니다.
          </p>
        </div>

        {/* 내 수집 현황 — 항상 3칸 표시 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">내 수집 현황</h2>
            {session?.user?.role === "admin" && (
              <button
                onClick={handleExtractNow}
                disabled={extracting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    수집 중...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    지금 수집
                  </>
                )}
              </button>
            )}
          </div>
          {extractResult && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs text-green-800">{extractResult}</p>
              <button onClick={() => setExtractResult(null)} className="ml-auto text-green-400 hover:text-green-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => {
              const cond = myRegistered[i];

              // 선택된 조건검색식 카드
              if (cond) {
                const condStatus = getConditionStatus(cond.name);
                return (
                  <div
                    key={cond.seq}
                    className={`relative p-4 border rounded-xl ${
                      condStatus.status === "success"
                        ? "border-green-200 bg-green-50"
                        : condStatus.status === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <button
                      onClick={() => handleUnsubscribe(cond.seq)}
                      disabled={togglingSeq === cond.seq}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-red-200 flex items-center justify-center transition-colors disabled:opacity-40"
                      title="선택 해제"
                    >
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2 mb-2 pr-5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        condStatus.status === "success"
                          ? "bg-green-500"
                          : condStatus.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-300"
                      }`} />
                      <p className="text-sm font-medium text-gray-900 truncate">{cond.name}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {condStatus.status === "success"
                        ? `${formatDate(condStatus.date)} · ${condStatus.count}종목`
                        : condStatus.status === "error"
                        ? `${formatDate(condStatus.date)} · 수집 실패`
                        : "수집 대기 중"}
                    </p>
                  </div>
                );
              }

              // 미선택 카드 — 클릭 시 드롭다운
              return (
                <div key={`empty-${i}`} className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
                    disabled={unsubscribedConditions.length === 0}
                    className="w-full p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors text-left disabled:hover:bg-gray-50 disabled:hover:border-gray-300 disabled:cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {unsubscribedConditions.length > 0 ? (
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        ) : (
                          <span className="text-xs text-gray-400">{i + 1}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {unsubscribedConditions.length > 0 ? "클릭하여 선택" : "미선택"}
                      </p>
                    </div>
                  </button>

                  {/* 드롭다운 */}
                  {openDropdown === i && unsubscribedConditions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                      {unsubscribedConditions.map((uc) => (
                        <button
                          key={uc.seq}
                          onClick={() => handleSubscribe(uc.seq)}
                          disabled={togglingSeq === uc.seq}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-40"
                        >
                          {togglingSeq === uc.seq ? "추가 중..." : uc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium">날짜</th>
                    <th className="px-4 py-3 text-left font-medium">조건검색식</th>
                    <th className="px-4 py-3 text-right font-medium">종목수</th>
                    <th className="px-4 py-3 text-center font-medium">상태</th>
                    <th className="px-4 py-3 text-right font-medium">수집 시각</th>
                    <th className="px-4 py-3 text-center font-medium">가공데이터</th>
                    <th className="px-4 py-3 text-center font-medium">원본데이터</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) =>
                    group.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => item.count > 0 && handleViewResult(item)}
                        className={`border-b border-gray-100 transition-colors ${
                          item.count > 0
                            ? "cursor-pointer hover:bg-blue-50"
                            : "hover:bg-gray-50"
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
                                handleViewResult(item);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              보기
                            </button>
                          )}
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
          데이터는 매일 평일 20:10(KST)에 자동 수집됩니다. 행을 클릭하면 데이터 보기 탭에서 상세 종목을 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
