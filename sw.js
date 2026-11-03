/* ZoomOut Geography — 오프라인·빠른 시작용 서비스 워커
   - 페이지(index.html): 인터넷 먼저, 안 되면 저장해 둔 것
   - 글꼴·Leaflet·Firebase 라이브러리: 저장해 둔 것 먼저
   - 위성 사진, 로그인, 기록 저장(Firestore)은 건드리지 않음 */
const VER = "zo-v3.5.0";
const SHELL = ["./", "manifest.webmanifest", "favicon.png?v=2", "apple-touch-icon.png?v=2", "icon-192.png", "icon-512.png"];
const LIB_HOSTS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VER)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) 페이지 열기: 인터넷 먼저 (수정한 내용이 바로 반영되도록)
  if (req.mode === "navigate" && url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put("./", copy)); }
        return res;
      }).catch(() => caches.match("./").then(r => r || Response.error()))
    );
    return;
  }

  // 2) 같은 사이트의 이미지·파일: 저장본을 바로 쓰고 뒤에서 새로 받아 둠
  if (url.origin === location.origin) {
    if (url.pathname.endsWith("/sw.js")) return;
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); }
          return res;
        });
        return hit || net;
      })
    );
    return;
  }

  // 3) 글꼴·라이브러리 (주소에 버전이 박혀 있어 잘 안 바뀜): 저장본 먼저
  if (LIB_HOSTS.includes(url.hostname)) {
    if (url.hostname === "www.gstatic.com" && !url.pathname.startsWith("/firebasejs/")) return;
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // 4) 그 밖(위성 사진, 로그인, Firestore 등)은 브라우저가 평소대로 처리
});
