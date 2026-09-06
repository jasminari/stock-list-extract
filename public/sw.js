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
