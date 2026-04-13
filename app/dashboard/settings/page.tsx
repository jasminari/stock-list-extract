"use client";

import { useState, useEffect, useCallback } from "react";

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

interface TokenStatus {
  status: "connected" | "error" | "loading";
  message?: string;
  expiresAt?: string;
}

export default function SettingsPage() {
  const [registered, setRegistered] = useState<RegisteredCondition[]>([]);
  const [available, setAvailable] = useState<AvailableCondition[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(true);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [registeringSeq, setRegisteringSeq] = useState<string | null>(null);
  const [unregisteringSeq, setUnregisteringSeq] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ status: "loading" });

  // 키움 API 토큰 상태 확인
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

  useEffect(() => {
    checkTokenStatus();
  }, [checkTokenStatus]);

  // 등록된 조건검색식 로드
  const loadRegistered = useCallback(async () => {
    try {
      const res = await fetch("/api/registered-conditions");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRegistered(data.conditions ?? []);
    } catch {
      setError("등록된 조건검색식을 불러오지 못했습니다.");
    } finally {
      setLoadingRegistered(false);
    }
  }, []);

  useEffect(() => {
    loadRegistered();
  }, [loadRegistered]);

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
      // 이미 등록된 것은 제외
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
      setJustRegistered(cond.seq);
      setTimeout(() => setJustRegistered(null), 3000);
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

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span>설정</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">조건검색 관리</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">조건검색 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            매일 자동으로 수집할 조건검색식을 등록하고 관리합니다.
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

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 등록된 조건검색식 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">자동 수집 조건검색식</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {registered.length}개 등록
            </span>
          </div>

          {loadingRegistered ? (
            <div className="border border-gray-200 rounded-xl p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-2">등록된 조건검색식을 불러오는 중...</p>
            </div>
          ) : registered.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">등록된 조건검색식이 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">아래에서 조건검색식을 불러와 등록하세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {registered.map((cond) => (
                <div
                  key={cond.seq}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cond.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          매일 20:10 자동 수집
                        </span>
                        <span className="text-xs text-gray-400">
                          등록일: {cond.registeredAt ? new Date(cond.registeredAt).toLocaleDateString("ko-KR") : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnregister(cond.seq)}
                    disabled={unregisteringSeq === cond.seq}
                    className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40"
                  >
                    {unregisteringSeq === cond.seq ? "해제 중..." : "해제"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 조건검색식 추가 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">조건검색식 추가</h2>
            <button
              onClick={handleLoadConditions}
              disabled={loadingConditions}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <svg className={`w-4 h-4 ${loadingConditions ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loadingConditions ? "불러오는 중..." : "조건검색식 불러오기"}
            </button>
          </div>

          {available.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">추가 가능한 조건검색식이 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">
                &apos;조건검색식 불러오기&apos; 버튼을 눌러 키움에서 조건검색식을 조회하세요.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {available.map((cond) => (
                <div
                  key={cond.seq}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">{cond.name}</p>
                  </div>
                  <button
                    onClick={() => handleRegister(cond)}
                    disabled={registeringSeq === cond.seq}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {registeringSeq === cond.seq ? "등록 중..." : "등록"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 등록 완료 토스트 */}
        {justRegistered && (
          <div className="fixed bottom-6 right-6 px-5 py-3 bg-green-600 text-white text-sm rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            조건검색식이 등록되었습니다. 매일 자동으로 수집됩니다.
          </div>
        )}

        {/* 안내 배너 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">자동 수집 안내</p>
            <p className="text-sm text-blue-800 mt-1">
              등록된 조건검색식은 매일 평일 20:10(KST)에 자동으로 실행되어
              결과가 DB에 저장됩니다. 수집된 데이터는 사이드바의
              <span className="font-semibold"> &apos;수집 데이터&apos;</span> 탭에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
