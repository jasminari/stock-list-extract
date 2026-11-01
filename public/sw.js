// 홈 화면 설치(PWA) 요건을 만족시키기 위한 최소한의 서비스 워커.
// 캐싱 전략 없이 네트워크 요청을 그대로 통과시킨다 (오프라인 지원은 하지 않음).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let parsed;
  try { parsed = event.data ? event.data.json() : {}; } catch { parsed = { body: event.data?.text() ?? "" }; }
  const payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  const title = typeof payload.title === "string" ? payload.title : "주가 알림";
  const body = typeof payload.body === "string" ? payload.body : "관심종목 가격 알림이 도착했습니다.";
  const tag = typeof payload.tag === "string" ? payload.tag : undefined;
  let url = "/dashboard/notifications";
  try {
    if (typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//")) {
      const candidate = new URL(payload.url, self.location.origin);
      if (candidate.origin === self.location.origin) url = candidate.pathname + candidate.search + candidate.hash;
    }
  } catch { /* Use the safe default path. */ }
  event.waitUntil(self.registration.showNotification(title, { body, tag, icon: "/icons/icon-192.png", badge: "/icons/favicon-32.png", data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let target;
  try { target = new URL(event.notification.data?.url || "/dashboard/notifications", self.location.origin); }
  catch { target = new URL("/dashboard/notifications", self.location.origin); }
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) return client.navigate(target.href).then((navigated) => (navigated || client).focus());
    }
    return self.clients.openWindow(target.href);
  }));
});
