// Ristoflow — service worker.
// 1) Installabilita' PWA (tessera fidelity e app): solo le pagine passano di qui, la rete comanda.
// 2) Notifiche push: "Tavolo 7, terza uscita pronta" arriva anche a telefono bloccato.
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", function (e) {
  // Tocco solo la navigazione: le chiamate a Supabase e i file vanno dritti in rete.
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response("Sei offline. Riapri con la connessione attiva.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }));
});

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Ristoflow", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Ristoflow", {
    body: d.body || "",
    tag: d.tag || undefined,
    renotify: true,                 // stesso tavolo: avvisa di nuovo
    requireInteraction: true,       // resta finche' il cameriere non la tocca
    vibrate: [300, 120, 300, 120, 600],
    icon: "/favicon-192.png",
    badge: "/favicon-192.png",
    data: { url: d.url || "/" }
  }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      if ("focus" in c) { try { c.navigate(url); } catch (x) {} return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
