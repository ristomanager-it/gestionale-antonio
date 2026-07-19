// Ristoflow — service worker minimo per l'installabilita' PWA (tessera fidelity).
// Passthrough: nessuna cache aggressiva, la rete comanda.
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  // Solo passthrough: serve a rendere l'app installabile.
  e.respondWith(fetch(e.request).catch(function () {
    return new Response("Sei offline. Riapri con la connessione attiva.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }));
});
