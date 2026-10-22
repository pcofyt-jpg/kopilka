// Копилка: сервис-воркер. Страница сначала берётся из сети (всегда свежая версия),
// а если сети нет, открывается последняя сохранённая копия. Плюс push-уведомления.
const CACHE = "kopilka-v3";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
const SBU = "https://saiseqeqoxzvcxujfqjs.supabase.co";
const SBK = "sb_publishable_58et5M5-wP7l7i9YPagPPA_KVQifJk9";
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
// Уведомление пришло: забираем его текст с сервера и показываем
self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let list = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (sub) {
        const r = await fetch(SBU + "/rest/v1/rpc/push_inbox", { method: "POST", headers: { apikey: SBK, "Content-Type": "application/json" }, body: JSON.stringify({ p_endpoint: sub.endpoint }) });
        list = await r.json();
      }
    } catch (err) {}
    if (!Array.isArray(list) || !list.length) list = [{ title: "Копилка", body: "Есть новости" }];
    await Promise.all(list.slice(-3).map((n, i) => self.registration.showNotification(n.title || "Копилка", {
      body: n.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: "kopilka-" + Date.now() + "-" + i
    })));
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ("focus" in c) return c.focus(); }
    return clients.openWindow(self.registration.scope);
  }));
});
