"use client";

import { useCallback, useEffect, useState } from "react";
import WatchlistChartModal from "@/components/WatchlistChartModal";
import { LoadingIcon } from "@/components/ui/loading-icon";
import PushNotifications from "@/components/PushNotifications";

interface WatchlistItem {
  id: number;
  code: string;
  name: string;
  alertLow: number | null;
  alertHigh: number | null;
  alertDirection?: "range" | "above" | "below";
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
  const [directPrice, setDirectPrice] = useState<Record<string, string>>({});
  const [directDirection, setDirectDirection] = useState<Record<string, "above" | "below">>({});
  const [savingDirect, setSavingDirect] = useState<string | null>(null);

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
    if (!res.ok || data.error) throw new Error(data.error || "가격 알림을 저장하지 못했습니다.");
    await load();
  };

  const handleClearAlert = async (code: string) => {
    const res = await fetch("/api/watchlist/alert", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "가격 알림을 해제하지 못했습니다.");
    await load();
  };

  const handleDirectAlert = async (code: string) => {
    const price = Number(directPrice[code]);
    if (!Number.isInteger(price) || price <= 0) { setError("1원 단위의 올바른 목표 가격을 입력해 주세요."); return; }
    setSavingDirect(code);
    try {
      const response = await fetch("/api/watchlist/alert", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, low: price, high: price, direction: directDirection[code] ?? "above" }) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "가격 알림을 저장하지 못했습니다.");
      setDirectPrice((current) => ({ ...current, [code]: "" }));
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "가격 알림을 저장하지 못했습니다."); }
    finally { setSavingDirect(null); }
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

        <PushNotifications />

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
            <LoadingIcon className="mx-auto h-20 w-20 text-indigo-600" label="관심종목 불러오는 중" />
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
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-gray-200 rounded-xl bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.code}</p>
                  {item.alertActive && item.alertDirection === "above" && item.alertLow !== null ? (
                    <p className="text-xs text-indigo-600 font-medium mt-1.5">{item.alertLow.toLocaleString("ko-KR")}원 이상 도달 시 알림 대기 중</p>
                  ) : item.alertActive && item.alertDirection === "below" && item.alertLow !== null ? (
                    <p className="text-xs text-indigo-600 font-medium mt-1.5">{item.alertLow.toLocaleString("ko-KR")}원 이하 도달 시 알림 대기 중</p>
                  ) : item.alertActive && item.alertLow !== null && item.alertHigh !== null ? (
                    <p className="text-xs text-indigo-600 font-medium mt-1.5">
                      {item.alertLow.toLocaleString("ko-KR")} ~ {item.alertHigh.toLocaleString("ko-KR")}원 알림 대기 중
                    </p>
                  ) : item.alertTriggeredAt ? (
                    <p className="text-xs text-gray-400 mt-1.5">조건에 도달했습니다 · 다시 받으려면 가격을 재설정하세요</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1.5">설정된 가격 알림 없음</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <select aria-label={`${item.name} 목표 방향`} value={directDirection[item.code] ?? "above"} onChange={(event) => setDirectDirection((current) => ({ ...current, [item.code]: event.target.value as "above" | "below" }))} className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white">
                      <option value="above">이상</option><option value="below">이하</option>
                    </select>
                    <input aria-label={`${item.name} 목표 가격`} type="number" min="1" step="1" value={directPrice[item.code] ?? ""} onChange={(event) => setDirectPrice((current) => ({ ...current, [item.code]: event.target.value }))} placeholder="목표가" className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded-lg" />
                    <button onClick={() => void handleDirectAlert(item.code)} disabled={savingDirect === item.code || !directPrice[item.code]} className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 disabled:opacity-40">저장</button>
                  </div>
                  <button
                    onClick={() => setAlertTarget(item)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    가격 알림 설정
                  </button>
                  {item.alertActive && <button onClick={() => void handleClearAlert(item.code)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">알림 끄기</button>}
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
          initialLow={alertTarget.alertActive && (!alertTarget.alertDirection || alertTarget.alertDirection === "range") ? alertTarget.alertLow : null}
          initialHigh={alertTarget.alertActive && (!alertTarget.alertDirection || alertTarget.alertDirection === "range") ? alertTarget.alertHigh : null}
          onClose={() => setAlertTarget(null)}
          onSave={(low, high) => handleSaveAlert(alertTarget.code, low, high)}
          onClearAlert={() => handleClearAlert(alertTarget.code)}
        />
      )}
    </div>
  );
}
