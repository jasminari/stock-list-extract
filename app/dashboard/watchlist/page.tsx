"use client";

import { useCallback, useEffect, useState } from "react";
import WatchlistChartModal from "@/components/WatchlistChartModal";
import { LoadingIcon } from "@/components/ui/loading-icon";

interface WatchlistItem {
  id: number;
  code: string;
  name: string;
  alertLow: number | null;
  alertHigh: number | null;
  alertActive: boolean;
  alertTriggeredAt: string | null;
  createdAt: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertTarget, setAlertTarget] = useState<WatchlistItem | null>(null);
  const [removingCode, setRemovingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("관심종목을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (code: string) => {
    setRemovingCode(code);
    try {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setItems((prev) => prev.filter((i) => i.code !== code));
    } catch {
      setError("삭제하지 못했습니다.");
    } finally {
      setRemovingCode(null);
    }
  };

  const handleSaveAlert = async (code: string, low: number, high: number) => {
    const res = await fetch("/api/watchlist/alert", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, low, high }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await load();
  };

  const handleClearAlert = async (code: string) => {
    const res = await fetch("/api/watchlist/alert", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await load();
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">관심종목</h1>
          <p className="text-sm text-gray-500 mt-1">
            공시·시장 공부하기 탭에서 종목명 옆 별표를 눌러 등록할 수 있습니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="border border-gray-200 rounded-xl p-8 text-center">
            <LoadingIcon className="mx-auto h-10 w-10 text-indigo-600" label="관심종목 불러오는 중" />
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-sm text-gray-500">등록된 관심종목이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.code}</p>
                  {item.alertActive && item.alertLow !== null && item.alertHigh !== null ? (
                    <p className="text-xs text-indigo-600 font-medium mt-1.5">
                      {item.alertLow.toLocaleString("ko-KR")} ~ {item.alertHigh.toLocaleString("ko-KR")}원 알림 대기 중
                    </p>
                  ) : item.alertTriggeredAt ? (
                    <p className="text-xs text-gray-400 mt-1.5">알림을 이미 보냈습니다 · 다시 설정하려면 범위를 그리세요</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1.5">설정된 가격 알림 없음</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setAlertTarget(item)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    가격 알림 설정
                  </button>
                  <button
                    onClick={() => handleRemove(item.code)}
                    disabled={removingCode === item.code}
                    className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-40 transition-colors"
                  >
                    관심 해제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {alertTarget && (
        <WatchlistChartModal
          code={alertTarget.code}
          name={alertTarget.name}
          initialLow={alertTarget.alertActive ? alertTarget.alertLow : null}
          initialHigh={alertTarget.alertActive ? alertTarget.alertHigh : null}
          onClose={() => setAlertTarget(null)}
          onSave={(low, high) => handleSaveAlert(alertTarget.code, low, high)}
          onClearAlert={() => handleClearAlert(alertTarget.code)}
        />
      )}
    </div>
  );
}
