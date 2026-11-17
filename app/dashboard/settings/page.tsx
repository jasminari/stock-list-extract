"use client";

import { useState, useEffect, useCallback } from "react";
import { LoadingIcon } from "@/components/ui/loading-icon";

interface RegisteredCondition {
  id: number;
  seq: string;
  name: string;
  registeredAt: string;
}

export default function SettingsPage() {
  const [registered, setRegistered] = useState<RegisteredCondition[]>([]);
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingSeq, setTogglingSeq] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [condRes, subRes] = await Promise.all([
        fetch("/api/registered-conditions"),
        fetch("/api/user-subscriptions"),
      ]);
      const condData = await condRes.json();
      const subData = await subRes.json();

      setRegistered(condData.conditions ?? []);
      setSubscribed(new Set(subData.subscriptions ?? []));
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (seq: string) => {
    setTogglingSeq(seq);
    const isSubscribed = subscribed.has(seq);
    try {
      const res = await fetch("/api/user-subscriptions", {
        method: isSubscribed ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditionSeq: seq }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setSubscribed((prev) => {
        const next = new Set(prev);
        if (isSubscribed) {
          next.delete(seq);
        } else {
          next.add(seq);
        }
        return next;
      });
    } catch {
      setError("변경에 실패했습니다.");
    } finally {
      setTogglingSeq(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>설정</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-foreground font-medium">내 조건검색 설정</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">내 조건검색 설정</h1>
          <p className="text-sm text-muted-foreground mt-1">
            서버에서 수집 중인 조건검색식 중 내가 확인할 항목을 선택합니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-destructive flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 조건검색식 선택 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-foreground">수집 중인 조건검색식</h2>
            <span className="px-2 py-0.5 bg-primary/15 text-primary-hover text-xs font-medium rounded-full">
              {subscribed.size}개 선택
            </span>
          </div>

          {loading ? (
            <div role="status" className="border border-border rounded-xl p-8 text-center">
              <LoadingIcon className="mx-auto h-20 w-20 text-primary" decorative />
              <span className="sr-only">불러오는 중...</span>
            </div>
          ) : registered.length === 0 ? (
            <div className="border border-dashed border-input rounded-xl p-8 text-center">
              <svg className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-muted-foreground">서버에 등록된 수집 조건검색식이 없습니다.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">관리자가 조건검색식을 등록하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {registered.map((cond) => {
                const isActive = subscribed.has(cond.seq);
                const isToggling = togglingSeq === cond.seq;
                return (
                  <div
                    key={cond.seq}
                    className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${
                      isActive
                        ? "bg-accent border-primary/25"
                        : "bg-background border-border hover:border-input"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? "bg-primary/15" : "bg-muted"
                      }`}>
                        {isActive ? (
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-muted-foreground/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{cond.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isActive ? (
                            <span className="flex items-center gap-1 text-primary">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              수집 데이터 표시 중
                            </span>
                          ) : (
                            "선택하면 수집 데이터와 시장 공부하기에 표시됩니다"
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(cond.seq)}
                      disabled={isToggling}
                      className={`px-4 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:opacity-40 ${
                        isActive
                          ? "text-muted-foreground border-input hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                          : "text-primary border-primary/40 hover:bg-primary/15"
                      }`}
                    >
                      {isToggling
                        ? "처리 중..."
                        : isActive
                        ? "선택 해제"
                        : "선택"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 안내 배너 */}
        <div className="p-4 bg-accent border border-primary/25 rounded-xl flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-primary-hover">안내</p>
            <p className="text-sm text-primary-hover mt-1">
              선택한 조건검색식의 수집 결과가
              <span className="font-semibold"> &apos;수집 데이터&apos;</span>와
              <span className="font-semibold"> &apos;시장 공부하기&apos;</span> 탭에 표시됩니다.
              조건검색식은 매일 평일 20:10(KST)에 서버에서 자동으로 수집됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
