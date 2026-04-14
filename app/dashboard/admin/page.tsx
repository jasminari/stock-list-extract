"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ExtractionLog {
  id: number;
  date: string;
  conditionSeq: string;
  conditionName: string;
  stockCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface TokenStatus {
  status: "connected" | "error" | "loading";
  message?: string;
  expiresAt?: string;
}

interface RegisteredCondition {
  id: number;
  seq: string;
  name: string;
  registeredAt: string;
}

interface AvailableCondition {
  seq: string;
  name: string;
}

const MAX_CONDITIONS = 3;

function formatDate(dateStr: string) {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function formatTime(isoStr: string) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<ExtractionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ status: "loading" });

  // 조건검색식 관리
  const [registered, setRegistered] = useState<RegisteredCondition[]>([]);
  const [available, setAvailable] = useState<AvailableCondition[]>([]);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [registeringSeq, setRegisteringSeq] = useState<string | null>(null);
  const [unregisteringSeq, setUnregisteringSeq] = useState<string | null>(null);

  // 권한 체크
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [session, sessionStatus, router]);

  // 토큰 상태 확인
  const checkTokenStatus = useCallback(async () => {
    setTokenStatus({ status: "loading" });
    try {
      const res = await fetch("/api/token-status");
      const data = await res.json();
      if (data.status === "connected") {
        setTokenStatus({ status: "connected", expiresAt: data.expiresAt });
      } else {
        setTokenStatus({ status: "error", message: data.message });
      }
    } catch {
      setTokenStatus({ status: "error", message: "API 서버에 연결할 수 없습니다." });
    }
  }, []);

  // 수집 로그 로드
  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/extraction-logs");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      setError("수집 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 등록된 조건검색식 로드
  const loadRegistered = useCallback(async () => {
    try {
      const res = await fetch("/api/registered-conditions");
      const data = await res.json();
      setRegistered(data.conditions ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      checkTokenStatus();
      loadLogs();
      loadRegistered();
    }
  }, [session, checkTokenStatus, loadLogs, loadRegistered]);

  // 키움에서 조건검색식 불러오기
  const handleLoadConditions = async () => {
    setLoadingConditions(true);
    setError(null);
    try {
      const res = await fetch("/api/conditions");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      const registeredSeqs = new Set(registered.map((r) => r.seq));
      const filtered = (data.conditions ?? []).filter(
        (c: AvailableCondition) => !registeredSeqs.has(c.seq)
      );
      setAvailable(filtered);
    } catch {
      setError("조건검색식을 불러오지 못했습니다. 키움 API를 확인해주세요.");
    } finally {
      setLoadingConditions(false);
    }
  };

  // 조건검색식 등록
  const handleRegister = async (cond: AvailableCondition) => {
    if (registered.length >= MAX_CONDITIONS) {
      setError(`최대 ${MAX_CONDITIONS}개까지 등록할 수 있습니다.`);
      return;
    }
    setRegisteringSeq(cond.seq);
    try {
      const res = await fetch("/api/registered-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seq: cond.seq, name: cond.name }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRegistered((prev) => [data.condition, ...prev]);
      setAvailable((prev) => prev.filter((c) => c.seq !== cond.seq));
    } catch {
      setError("등록에 실패했습니다.");
    } finally {
      setRegisteringSeq(null);
    }
  };

  // 조건검색식 해제
  const handleUnregister = async (seq: string) => {
    setUnregisteringSeq(seq);
    try {
      const cond = registered.find((c) => c.seq === seq);
      const res = await fetch("/api/registered-conditions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seq }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRegistered((prev) => prev.filter((c) => c.seq !== seq));
      if (cond) {
        setAvailable((prev) => [...prev, { seq: cond.seq, name: cond.name }]);
      }
    } catch {
      setError("해제에 실패했습니다.");
    } finally {
      setUnregisteringSeq(null);
    }
  };

  if (sessionStatus === "loading") return null;
  if (session?.user?.role !== "admin") return null;

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            키움 API 연결 상태, 수집 조건검색식 관리, 자동 수집 이력을 확인합니다.
          </p>
        </div>

        {/* 키움 API 연결 상태 */}
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
          tokenStatus.status === "connected"
            ? "bg-green-50 border-green-200"
            : tokenStatus.status === "error"
            ? "bg-red-50 border-red-200"
            : "bg-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              tokenStatus.status === "connected"
                ? "bg-green-100"
                : tokenStatus.status === "error"
                ? "bg-red-100"
                : "bg-gray-100"
            }`}>
              {tokenStatus.status === "loading" ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : tokenStatus.status === "connected" ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">키움 API 연결 상태</p>
              {tokenStatus.status === "loading" ? (
                <p className="text-xs text-gray-500 mt-0.5">연결 확인 중...</p>
              ) : tokenStatus.status === "connected" ? (
                <p className="text-xs text-green-700 mt-0.5">
                  연결됨 · 토큰 만료: {tokenStatus.expiresAt ?? "-"}
                </p>
              ) : (
                <p className="text-xs text-red-700 mt-0.5">
                  {tokenStatus.message?.includes("지정단말기")
                    ? "연결 실패 · 키움 지정단말기 IP를 확인하세요"
                    : `연결 실패 · ${tokenStatus.message ?? "알 수 없는 오류"}`}
                </p>
              )}
            </div>
          </div>
          {tokenStatus.status !== "loading" && (
            <button
              onClick={checkTokenStatus}
              className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                tokenStatus.status === "connected"
                  ? "text-green-700 border-green-300 hover:bg-green-100"
                  : "text-red-700 border-red-300 hover:bg-red-100"
              }`}
            >
              다시 확인
            </button>
          )}
        </div>

        {/* 에러 */}
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

        {/* 수집 조건검색식 관리 */}
        <div className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">수집 조건검색식</h2>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                registered.length >= MAX_CONDITIONS
                  ? "bg-orange-100 text-orange-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {registered.length}/{MAX_CONDITIONS}
              </span>
            </div>
            <button
              onClick={handleLoadConditions}
              disabled={loadingConditions}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-xs text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${loadingConditions ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loadingConditions ? "불러오는 중..." : "키움에서 불러오기"}
            </button>
          </div>

          <div className="p-4 space-y-2">
            {/* 등록된 조건검색식 */}
            {registered.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-400">등록된 수집 조건검색식이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">키움에서 불러오기 버튼으로 조건검색식을 추가하세요.</p>
              </div>
            ) : (
              registered.map((cond) => (
                <div
                  key={cond.seq}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cond.name}</p>
                      <p className="text-xs text-gray-500">seq: {cond.seq}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnregister(cond.seq)}
                    disabled={unregisteringSeq === cond.seq}
                    className="px-2.5 py-1 text-xs text-gray-500 border border-gray-300 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40"
                  >
                    {unregisteringSeq === cond.seq ? "해제 중..." : "해제"}
                  </button>
                </div>
              ))
            )}

            {/* 추가 가능한 조건검색식 */}
            {available.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs text-gray-500 font-medium">추가 가능</p>
                {available.map((cond) => (
                  <div
                    key={cond.seq}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-sm text-gray-700">{cond.name}</p>
                    </div>
                    <button
                      onClick={() => handleRegister(cond)}
                      disabled={registeringSeq === cond.seq || registered.length >= MAX_CONDITIONS}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {registeringSeq === cond.seq ? "등록 중..." : "등록"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">전체 수집</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}건</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">성공</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{successCount}건</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">실패</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{errorCount}건</p>
          </div>
        </div>

        {/* 수집 로그 테이블 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">수집 로그</h2>
            <button
              onClick={loadLogs}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              새로고침
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-2">로그를 불러오는 중...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">수집 로그가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">스크립트가 실행되면 여기에 기록됩니다.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium">날짜</th>
                  <th className="px-4 py-3 text-left font-medium">조건검색식</th>
                  <th className="px-4 py-3 text-right font-medium">종목수</th>
                  <th className="px-4 py-3 text-center font-medium">상태</th>
                  <th className="px-4 py-3 text-left font-medium">에러</th>
                  <th className="px-4 py-3 text-right font-medium">시각</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{formatDate(log.date)}</td>
                    <td className="px-4 py-3 text-gray-700">{log.conditionName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${log.stockCount > 0 ? "text-blue-600" : "text-gray-400"}`}>
                        {log.stockCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.status === "success" ? (
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
                    <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate">
                      {log.errorMessage || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {formatTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
