"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

function formatWhen(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (!data.error) setNotifications(data.notifications ?? []);
    } catch {
      // 무시 — 빈 상태로 둔다
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || notifications.every((n) => n.read)) return;
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">알림</h1>
          <p className="text-sm text-gray-500 mt-1">
            관심종목에 설정한 가격대에 도달하면 여기에 표시됩니다.
          </p>
        </div>

        {loading ? (
          <div className="border border-gray-200 rounded-xl p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm text-gray-500">아직 알림이 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">
              관심종목 탭에서 종목을 등록하고 가격대를 설정해보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => n.link && router.push(n.link)}
                className={`w-full text-left p-4 border rounded-xl transition-colors ${
                  n.read
                    ? "bg-white border-gray-200 hover:border-gray-300"
                    : "bg-indigo-50 border-indigo-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatWhen(n.createdAt)}
                  </span>
                </div>
                {n.body && (
                  <p className="text-sm text-gray-600 mt-1 leading-snug">{n.body}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
