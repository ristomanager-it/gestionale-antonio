// Ristoflow — service worker.
// 1) Installabilita' PWA (tessera fidelity e app): solo le pagine passano di qui, la rete comanda.
// 2) Notifiche push: "Tavolo 7, terza uscita pronta" arriva anche a telefono bloccato.
// 3) Velocita': i file con la versione nell'indirizzo (?v=...) non cambiano mai, quindi li tengo
//    in memoria sul telefono e li servo all'istante. A ogni pubblicazione la versione cambia,
//    l'indirizzo e' nuovo e si scarica il file nuovo. Le librerie esterne (PDF, grafici, Supabase)
//    le servo dalla memoria e intanto le aggiorno. Dati di Supabase e pagine: sempre dalla rete.
var CACHE = "rf-file-v1";
var CDN = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net"];

self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (nomi) {
    return Promise.all(nomi.filter(function (n) { return n.indexOf("rf-file-") === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

function salva(cache, req, res) {
  if (!res || !res.ok) return res;
  var copia = res.clone();
  var u = new URL(req.url);
  // tolgo le versioni vecchie dello stesso file, cosi' la memoria non cresce
  cache.keys().then(function (chiavi) {
    chiavi.forEach(function (k) {
      var ku = new URL(k.url);
      if (ku.origin === u.origin && ku.pathname === u.pathname && ku.search !== u.search) cache.delete(k);
    });
  });
  cache.put(req, copia);
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method === "GET" && req.mode !== "navigate") {
    var u;
    try { u = new URL(req.url); } catch (x) { return; }
    var stessoSito = u.origin === self.location.origin;
    var v = u.searchParams.get("v") || "";
    // versione di pubblicazione (20261004-17) o router: cambiano a ogni rilascio -> memoria fissa
    var versionato = stessoSito && (/^\d{8}-\d+$/.test(v) || (v && /\/js\/router\.js$/.test(u.pathname)));
    // versione "a mano" (styles.css?v=22): mostro la copia in memoria e intanto la aggiorno
    var esterno = CDN.indexOf(u.hostname) >= 0 || (stessoSito && !!v && !versionato);
    if (versionato) {
      e.respondWith(caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          return hit || fetch(req).then(function (res) { return salva(cache, req, res); });
        });
      }));
      return;
    }
    if (esterno) {
      e.respondWith(caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          var rete = fetch(req).then(function (res) { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(function () { return hit; });
          return hit || rete;
        });
      }));
      return;
    }
    return; // tutto il resto (dati Supabase, file senza versione) va dritto in rete
  }
  // Pagine: sempre dalla rete
  if (req.mode !== "navigate") return;
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
