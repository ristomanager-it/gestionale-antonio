// js/views/barcode-scanner.js — Scanner EAN via fotocamera
// Strategia: 1) BarcodeDetector nativo (Chrome/Android)  2) ZXing UMD (iOS/Safari) con più CDN di fallback
// apriScanner(onDetected) apre la camera; chiama onDetected(codice) al primo codice letto.

let zxingControls = null;

// Prova a caricare ZXing da più CDN finché uno funziona; espone window.ZXing
async function caricaZXing() {
  if (window.ZXing && window.ZXing.BrowserMultiFormatReader) return window.ZXing;
  const cdns = [
    "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js",
    "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js",
    "https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js",
    "https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js"
  ];
  for (const url of cdns) {
    try {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.onload = res;
        s.onerror = () => rej(new Error("load fail"));
        document.head.appendChild(s);
        setTimeout(() => rej(new Error("timeout")), 6000);
      });
      if (window.ZXing && window.ZXing.BrowserMultiFormatReader) return window.ZXing;
    } catch (e) { /* prova il prossimo */ }
  }
  throw new Error("libreria scanner non raggiungibile");
}

export async function apriScanner(onDetected) {
  if (document.getElementById("rf-scan-backdrop")) document.getElementById("rf-scan-backdrop").remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div id="rf-scan-backdrop" style="position:fixed;inset:0;background:#000;z-index:10001;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:#0f172a;color:#fff;">
        <span style="font-weight:700;">📷 Inquadra il codice a barre</span>
        <button id="rf-scan-close" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;">Chiudi</button>
      </div>
      <div style="flex:1;position:relative;overflow:hidden;background:#000;">
        <video id="rf-scan-video" playsinline autoplay muted style="width:100%;height:100%;object-fit:cover;"></video>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:78%;max-width:340px;height:130px;border:3px solid #22c55e;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,0.35);"></div>
      </div>
      <div style="padding:10px;background:#0f172a;">
        <div id="rf-scan-msg" style="color:#cbd5e1;text-align:center;font-size:13px;margin-bottom:8px;">Attivazione fotocamera…</div>
        <div style="display:flex;gap:8px;">
          <input id="rf-scan-manual" inputmode="numeric" placeholder="…oppure scrivi il codice a mano" style="flex:1;padding:11px;border:none;border-radius:8px;font-size:15px;text-align:center;">
          <button id="rf-scan-manual-ok" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0 16px;font-weight:800;">OK</button>
        </div>
      </div>
    </div>`);

  const backdrop = document.getElementById("rf-scan-backdrop");
  const video = document.getElementById("rf-scan-video");
  const msg = document.getElementById("rf-scan-msg");
  let stream = null, running = true, rafId = null, detector = null;

  const chiudi = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    try { if (zxingControls) { zxingControls.stop(); zxingControls = null; } } catch (e) {}
    if (stream) stream.getTracks().forEach(t => t.stop());
    backdrop.remove();
  };
  document.getElementById("rf-scan-close").onclick = chiudi;

  const fire = (codice) => {
    if (!running) return;
    const pulito = String(codice || "").replace(/\D/g, "");
    if (pulito.length < 6) return;
    if (navigator.vibrate) navigator.vibrate(80);
    running = false;
    chiudi();
    onDetected(pulito);
  };

  // Inserimento manuale sempre disponibile
  const manualOk = () => {
    const v = document.getElementById("rf-scan-manual").value.replace(/\D/g, "");
    if (v.length >= 6) { running = false; chiudi(); onDetected(v); }
  };
  document.getElementById("rf-scan-manual-ok").onclick = manualOk;
  document.getElementById("rf-scan-manual").addEventListener("keydown", (e) => { if (e.key === "Enter") manualOk(); });

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
    video.srcObject = stream;
    await video.play().catch(() => {});

    // 1) BarcodeDetector nativo
    if ("BarcodeDetector" in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        const wanted = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"].filter(f => formats.includes(f));
        if (wanted.length) {
          detector = new window.BarcodeDetector({ formats: wanted });
          msg.textContent = "Pronto — inquadra il codice";
          const scan = async () => {
            if (!running) return;
            try { const codes = await detector.detect(video); if (codes && codes.length) { fire(codes[0].rawValue); return; } } catch (e) {}
            rafId = requestAnimationFrame(scan);
          };
          scan();
          return;
        }
      } catch (e) { /* passo a ZXing */ }
    }

    // 2) ZXing (iOS/Safari)
    msg.textContent = "Caricamento lettore…";
    let ZXing;
    try { ZXing = await caricaZXing(); }
    catch (e) { msg.innerHTML = "⚠️ Lettore automatico non disponibile su questo dispositivo.<br>Scrivi il codice qui sotto 👇"; return; }

    msg.textContent = "Pronto — inquadra il codice";
    const reader = new ZXing.BrowserMultiFormatReader();
    // decodeFromVideoDevice(deviceId=null usa camera di default), callback su ogni frame
    reader.decodeFromVideoDevice(null, video, (result, err, controls) => {
      if (controls && !zxingControls) zxingControls = controls;
      if (result) fire(result.getText ? result.getText() : result.text);
    }).then((controls) => { if (controls) zxingControls = controls; }).catch(() => {
      msg.innerHTML = "⚠️ Impossibile avviare il lettore.<br>Scrivi il codice a mano 👇";
    });

  } catch (err) {
    msg.innerHTML = "❌ Fotocamera non accessibile.<br>Scrivi il codice a mano 👇";
  }
}
