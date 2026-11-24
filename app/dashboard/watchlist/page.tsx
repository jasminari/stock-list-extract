"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  listDate?: string | null;
  createdAt: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** createdAt(ISO) → 한국 시간 기준 YYYY-MM-DD */
function toSeoulDateKey(iso: string): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 담은 목록의 날짜로 묶고, 목록 밖에서 담은 종목은 등록일로 묶는다 */
function folderKeyOf(item: { listDate?: string | null; createdAt: string }): string {
  const d = item.listDate;
  if (d && /^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return toSeoulDateKey(item.createdAt);
}

function formatFolderLabel(key: string, todayKey: string, yesterdayKey: string): string {
  if (key === "unknown") return "날짜 미상";
  const [y, m, d] = key.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const base = `${y}년 ${m}월 ${d}일 (${weekday})`;
  if (key === todayKey) return `오늘 · ${base}`;
  if (key === yesterdayKey) return `어제 · ${base}`;
  return base;
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
  // 폴더별 열림 여부. 지정되지 않은 폴더는 가장 최근 날짜만 열린 상태로 시작
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const folders = useMemo(() => {
    const map = new Map<string, WatchlistItem[]>();
    for (const item of items) {
      const key = folderKeyOf(item);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a === "unknown" ? 1 : b === "unknown" ? -1 : b.localeCompare(a)))
      .map(([key, list]) => ({ key, items: list }));
  }, [items]);

  const todayKey = toSeoulDateKey(new Date().toISOString());
  const yesterdayKey = toSeoulDateKey(new Date(Date.now() - 86_400_000).toISOString());
  const isFolderOpen = (key: string, index: number) => openFolders[key] ?? index === 0;
  const toggleFolder = (key: string, index: number) =>
    setOpenFolders((current) => ({ ...current, [key]: !isFolderOpen(key, index) }));

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
          <h1 className="text-2xl font-bold text-foreground">관심종목</h1>
          <p className="text-sm text-muted-foreground mt-1">
            홈 탭에서 종목을 오른쪽으로 밀거나 별표를 누르면, 그 종목 목록의 날짜 폴더에 담깁니다.
          </p>
        </div>

        <PushNotifications />

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
            <p className="text-sm text-destructive flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="border border-border rounded-xl p-8 text-center">
            <LoadingIcon className="mx-auto h-20 w-20 text-primary" label="관심종목 불러오는 중" />
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-input rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-sm text-muted-foreground">등록된 관심종목이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {folders.map((folder, folderIndex) => {
              const open = isFolderOpen(folder.key, folderIndex);
              const alertCount = folder.items.filter((i) => i.alertActive).length;
              return (
                <section key={folder.key} className="border border-border rounded-xl bg-background overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder.key, folderIndex)}
                    aria-expanded={open}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <svg className={`w-5 h-5 flex-shrink-0 ${open ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden="true">
                      {open ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      )}
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatFolderLabel(folder.key, todayKey, yesterdayKey)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {folder.items.length}종목
                        {alertCount > 0 && <span className="text-primary"> · 알림 {alertCount}개</span>}
                        {!open && <> · {folder.items.map((i) => i.name).join(", ")}</>}
                      </p>
                    </div>
                    <svg className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {open && (
                  <div className="border-t border-border bg-muted/20 p-3 space-y-2">
            {folder.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-border rounded-xl bg-background"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{item.code}</p>
                  {item.alertActive && item.alertDirection === "above" && item.alertLow !== null ? (
                    <p className="text-xs text-primary font-medium mt-1.5">{item.alertLow.toLocaleString("ko-KR")}원 이상 도달 시 알림 대기 중</p>
                  ) : item.alertActive && item.alertDirection === "below" && item.alertLow !== null ? (
                    <p className="text-xs text-primary font-medium mt-1.5">{item.alertLow.toLocaleString("ko-KR")}원 이하 도달 시 알림 대기 중</p>
                  ) : item.alertActive && item.alertLow !== null && item.alertHigh !== null ? (
                    <p className="text-xs text-primary font-medium mt-1.5">
                      {item.alertLow.toLocaleString("ko-KR")} ~ {item.alertHigh.toLocaleString("ko-KR")}원 알림 대기 중
                    </p>
                  ) : item.alertTriggeredAt ? (
                    <p className="text-xs text-muted-foreground/80 mt-1.5">조건에 도달했습니다 · 다시 받으려면 가격을 재설정하세요</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/80 mt-1.5">설정된 가격 알림 없음</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <select aria-label={`${item.name} 목표 방향`} value={directDirection[item.code] ?? "above"} onChange={(event) => setDirectDirection((current) => ({ ...current, [item.code]: event.target.value as "above" | "below" }))} className="px-2 py-1.5 text-xs border border-input rounded-lg bg-background">
                      <option value="above">이상</option><option value="below">이하</option>
                    </select>
                    <input aria-label={`${item.name} 목표 가격`} type="number" min="1" step="1" value={directPrice[item.code] ?? ""} onChange={(event) => setDirectPrice((current) => ({ ...current, [item.code]: event.target.value }))} placeholder="목표가" className="w-24 px-2 py-1.5 text-xs border border-input rounded-lg" />
                    <button onClick={() => void handleDirectAlert(item.code)} disabled={savingDirect === item.code || !directPrice[item.code]} className="px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/40 rounded-lg hover:bg-accent disabled:opacity-40">저장</button>
                  </div>
                  <button
                    onClick={() => setAlertTarget(item)}
                    className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/40 rounded-lg hover:bg-accent transition-colors"
                  >
                    가격 알림 설정
                  </button>
                  {item.alertActive && <button onClick={() => void handleClearAlert(item.code)} className="px-3 py-1.5 text-xs text-muted-foreground border border-input rounded-lg hover:bg-muted/50">알림 끄기</button>}
                  <button
                    onClick={() => handleRemove(item.code)}
                    disabled={removingCode === item.code}
                    className="px-3 py-1.5 text-xs text-muted-foreground border border-input rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 disabled:opacity-40 transition-colors"
                  >
                    관심 해제
                  </button>
                </div>
              </div>
            ))}
                  </div>
                  )}
                </section>
              );
            })}
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
