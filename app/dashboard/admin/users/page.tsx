"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserSummary {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
  provider: string;
  subscriptionCount: number;
  createdAt: string;
}

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

const PROVIDER_LABEL: Record<string, string> = {
  credentials: "아이디",
  kakao: "카카오",
};

export default function AdminUsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // 권한 체크
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [session, sessionStatus, router]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("가입자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") loadUsers();
  }, [session, loadUsers]);

  const changeRole = async (user: UserSummary) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const label = user.displayName || user.username;
    const message =
      nextRole === "admin"
        ? `${label} 님에게 관리자 권한을 부여할까요?`
        : `${label} 님의 관리자 권한을 해제할까요?`;
    if (!confirm(message)) return;

    setUpdatingId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: nextRole }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
      );
    } catch {
      setError("권한 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q)
    );
  }, [users, keyword]);

  if (sessionStatus === "loading") return null;
  if (session?.user?.role !== "admin") return null;

  const adminCount = users.filter((u) => u.role === "admin").length;
  const kakaoCount = users.filter((u) => u.provider === "kakao").length;

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
          <h1 className="text-2xl font-bold text-gray-900">가입자 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            가입한 사용자를 조회하고 관리자 권한을 부여하거나 해제합니다.
          </p>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "전체 가입자", value: users.length, color: "text-gray-900" },
            { label: "관리자", value: adminCount, color: "text-emerald-600" },
            { label: "카카오 가입", value: kakaoCount, color: "text-yellow-600" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-white border border-gray-200 rounded-xl">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
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

        {/* 목록 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 flex-shrink-0">
              가입자 목록
            </h2>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="아이디 또는 이름 검색"
              className="w-52 px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              {users.length === 0 ? "가입자가 없습니다." : "검색 결과가 없습니다."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">사용자</th>
                    <th className="px-4 py-2 text-left font-medium">가입 방식</th>
                    <th className="px-4 py-2 text-right font-medium">구독</th>
                    <th className="px-4 py-2 text-left font-medium">가입일</th>
                    <th className="px-4 py-2 text-right font-medium">권한</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((user) => {
                    const isSelf = String(session.user.id) === String(user.id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {user.displayName || user.username}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">
                                나
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {user.username}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {PROVIDER_LABEL[user.provider] ?? user.provider}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {user.subscriptionCount}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDateTime(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                user.role === "admin"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {user.role === "admin" ? "관리자" : "일반"}
                            </span>
                            <button
                              onClick={() => changeRole(user)}
                              disabled={updatingId === user.id || isSelf}
                              className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              title={isSelf ? "본인 권한은 변경할 수 없습니다" : undefined}
                            >
                              {updatingId === user.id
                                ? "변경 중..."
                                : user.role === "admin"
                                ? "해제"
                                : "관리자로"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
