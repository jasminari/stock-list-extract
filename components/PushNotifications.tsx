"use client";

import { useCallback, useEffect, useState } from "react";

type PushState = "loading" | "unsupported" | "denied" | "disabled" | "pending" | "enabled" | "error";

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decoded = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function sameApplicationServerKey(subscription: PushSubscription, key: Uint8Array<ArrayBuffer>) {
  const existing = subscription.options.applicationServerKey;
  if (!existing) return false;
  const bytes = new Uint8Array(existing);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

function isSupported() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !ios || window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [message, setMessage] = useState("");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const refresh = useCallback(async (sync: boolean) => {
    if (!isSupported()) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    try {
      const configResponse = await fetch("/api/push");
      const config = await configResponse.json();
      if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error || "푸시 알림을 사용할 수 없습니다.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const readyRegistration = await navigator.serviceWorker.ready;
      const worker = readyRegistration.active ? readyRegistration : registration;
      let existing = await worker.pushManager.getSubscription();
      const hadExisting = Boolean(existing);
      const key = applicationServerKey(config.publicKey);
      if (existing && Notification.permission === "granted" && !sameApplicationServerKey(existing, key)) {
        await existing.unsubscribe();
        existing = null;
      }
      if (!existing && hadExisting && Notification.permission === "granted" && sync) existing = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      setSubscription(existing);
      if (existing && Notification.permission === "granted" && sync) {
        const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(existing.toJSON()) });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "기기 등록에 실패했습니다.");
        setState("enabled");
      } else {
        setState(existing && Notification.permission === "granted" ? "enabled" : "disabled");
      }
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "푸시 설정을 확인하지 못했습니다.");
    }
  }, []);

  useEffect(() => { void refresh(true); }, [refresh]);

  const enable = () => {
    if (!isSupported()) { setState("unsupported"); return; }
    // Browser permission must be requested directly inside the user gesture.
    const permission = Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    setState("pending"); setMessage("");
    void (async () => {
      try {
        const granted = await permission;
        if (granted !== "granted") { setState(granted === "denied" ? "denied" : "disabled"); return; }
        const configResponse = await fetch("/api/push");
        const config = await configResponse.json();
        if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error || "푸시 알림을 사용할 수 없습니다.");
        const registration = await navigator.serviceWorker.register("/sw.js");
        const readyRegistration = await navigator.serviceWorker.ready;
        const worker = readyRegistration.active ? readyRegistration : registration;
        let current = await worker.pushManager.getSubscription();
        const key = applicationServerKey(config.publicKey);
        if (current && !sameApplicationServerKey(current, key)) {
          await current.unsubscribe();
          current = null;
        }
        const next = current ?? await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next.toJSON()) });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "기기 등록에 실패했습니다.");
        setSubscription(next); setState("enabled");
      } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "푸시 알림을 설정하지 못했습니다."); }
    })();
  };

  const disable = async () => {
    setState("pending"); setMessage("");
    try {
      const current = subscription ?? await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (current) {
        const response = await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: current.endpoint }) });
        if (!response.ok) throw new Error("서버에서 기기를 해제하지 못했습니다.");
        await current.unsubscribe();
      }
      setSubscription(null); setState("disabled");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "푸시 알림을 해제하지 못했습니다."); }
  };

  const test = async () => {
    if (!subscription) return;
    setState("pending"); setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "테스트 알림을 보내지 못했습니다.");
      setMessage("테스트 알림을 보냈습니다."); setState("enabled");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "테스트 알림을 보내지 못했습니다."); }
  };

  return <section className="mb-6 p-4 border border-gray-200 rounded-xl bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-gray-900">기기 푸시 알림</h2><p className="text-xs text-gray-500 mt-1">{state === "unsupported" ? "지원하지 않는 브라우저입니다. iPhone/iPad는 홈 화면에 설치한 앱에서 사용할 수 있습니다." : state === "denied" ? "브라우저 설정에서 알림 권한을 허용해 주세요." : state === "enabled" ? "이 기기에서 푸시 알림을 받을 수 있습니다." : state === "pending" || state === "loading" ? "푸시 설정을 확인하고 있습니다…" : state === "error" ? message : "가격 알림을 이 기기의 푸시로 받아보세요."}</p></div>
      <div className="flex gap-2">
        {state === "enabled" ? <><button onClick={test} className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50">테스트 보내기</button><button onClick={() => void disable()} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">해제</button></> : <button onClick={enable} disabled={state === "pending" || state === "loading" || state === "unsupported" || state === "denied"} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40">알림 켜기</button>}
      </div>
    </div>
    {message && state !== "error" && <p className="text-xs text-green-700 mt-2">{message}</p>}
    <p className="text-[11px] text-gray-400 mt-2">가격은 장중 1분 간격으로 확인합니다. 조건마다 한 번 알림을 보낸 뒤 멈추며, 다시 받으려면 가격을 재설정해 주세요. 실시간 체결 감시가 아니며 푸시 도착 시각은 정확히 보장되지 않습니다.</p>
  </section>;
}
