"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface FeedbackItem {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  rating: number | null;
  message: string;
  pagePath: string;
  status: string;
  createdAt: string;
}

const RATING_EMOJI: Record<number, string> = {
  1: "😞",
  2: "🙁",
  3: "😐",
  4: "🙂",
  5: "😍",
};

const RATING_LABEL: Record<number, string> = {
  1: "별로예요",
  2: "아쉬워요",
  3: "보통이에요",
  4: "좋아요",
  5: "최고예요",
};

function formatDateTime(isoStr: string) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Filter = "all" | "new" | "done";

export default function AdminFeedbackPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // 권한 체크
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [session, sessionStatus, router]);

  const loadFeedbacks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feedback");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setItems(data.feedbacks ?? []);
    } catch {
      setError("의견 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") loadFeedbacks();
  }, [session, loadFeedbacks]);

  const toggleStatus = async (item: FeedbackItem) => {
    const nextStatus = item.status === "done" ? "new" : "done";
    setUpdatingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: nextStatus } : f))
      );
    } catch {
      setError("상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((f) => f.status === filter)),
    [items, filter]
  );

  const stats = useMemo(() => {
    const rated = items.filter((f) => f.rating !== null);
    const avg =
      rated.length > 0
        ? rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length
        : 0;
    // 1~5 각각 몇 건인지 — 만족도 분포 막대에 쓴다
    const dist = [1, 2, 3, 4, 5].map(
      (v) => rated.filter((f) => f.rating === v).length
    );
    return {
      total: items.length,
      newCount: items.filter((f) => f.status === "new").length,
      avg,
      ratedCount: rated.length,
      dist,
    };
  }, [items]);

  if (sessionStatus === "loading") return null;
  if (session?.user?.role !== "admin") return null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard/admin")}
            className="text-xs text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            관리로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">의견 · 만족도</h1>
          <p className="text-sm text-gray-500 mt-1">
            사용자가 보낸 만족도와 의견을 확인합니다.
          </p>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">전체 의견</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">미확인</p>
            <p className="text-xl font-bold text-orange-500 mt-1">{stats.newCount}</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">평균 만족도</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {stats.ratedCount > 0 ? stats.avg.toFixed(1) : "-"}
              <span className="text-xs font-normal text-gray-400 ml-1">
                / 5 ({stats.ratedCount}명)
              </span>
            </p>
          </div>
        </div>

        {/* 만족도 분포 */}
        {stats.ratedCount > 0 && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-sm font-semibold text-gray-900 mb-3">만족도 분포</p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((v) => {
                const count = stats.dist[v - 1];
                const pct = Math.round((count / stats.ratedCount) * 100);
                return (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-base w-6 text-center">{RATING_EMOJI[v]}</span>
                    <span className="text-xs text-gray-500 w-16">{RATING_LABEL[v]}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {count}건
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* 목록 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">받은 의견</h2>
            <div className="flex items-center gap-1">
              {([
                { id: "all", label: "전체" },
                { id: "new", label: "미확인" },
                { id: "done", label: "확인함" },
              ] as { id: Filter; label: string }[]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    filter === tab.id
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              {items.length === 0 ? "받은 의견이 없습니다." : "해당하는 의견이 없습니다."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <div key={item.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">
                      {item.rating ? RATING_EMOJI[item.rating] : "💬"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {item.displayName || item.username}
                        </span>
                        {item.rating && (
                          <span className="text-xs text-gray-500">
                            {RATING_LABEL[item.rating]}
                          </span>
                        )}
                        {item.status === "new" && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-medium rounded-full">
                            미확인
                          </span>
                        )}
                      </div>
                      {item.message && (
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                          {item.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                        <span>{formatDateTime(item.createdAt)}</span>
                        {item.pagePath && (
                          <>
                            <span>·</span>
                            <span className="truncate">{item.pagePath}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus(item)}
                      disabled={updatingId === item.id}
                      className={`flex-shrink-0 px-2.5 py-1 text-xs border rounded-md transition-colors disabled:opacity-40 ${
                        item.status === "done"
                          ? "text-gray-400 border-gray-200 hover:bg-gray-50"
                          : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      {item.status === "done" ? "되돌리기" : "확인"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
