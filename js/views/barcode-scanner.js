// js/views/barcode-scanner.js — Scanner EAN via fotocamera (BarcodeDetector nativo + fallback ZXing)
// apriScanner(onDetected) apre una modale camera; chiama onDetected(codice) al primo codice letto.

let zxingReader = null;

async function caricaZXing() {
  if (window.ZXingBrowser) return window.ZXingBrowser;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js";
    s.onload = res; s.onerror = () => rej(new Error("ZXing non caricato"));
    document.head.appendChild(s);
  });
  return window.ZXingBrowser;
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
        <video id="rf-scan-video" playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:78%;max-width:340px;height:130px;border:3px solid #22c55e;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,0.35);"></div>
      </div>
      <div id="rf-scan-msg" style="padding:12px;background:#0f172a;color:#cbd5e1;text-align:center;font-size:13px;">Attivazione fotocamera…</div>
    </div>`);

  const backdrop = document.getElementById("rf-scan-backdrop");
  const video = document.getElementById("rf-scan-video");
  const msg = document.getElementById("rf-scan-msg");
  let stream = null, running = true, rafId = null;

  const chiudi = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    try { if (zxingReader) { zxingReader.reset?.(); zxingReader = null; } } catch (e) {}
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

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();

    // 1) BarcodeDetector nativo (Chrome/Android)
    if ("BarcodeDetector" in window) {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      const wanted = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"].filter(f => formats.includes(f));
      if (wanted.length) {
        const detector = new window.BarcodeDetector({ formats: wanted });
        msg.textContent = "Pronto — inquadra il codice";
        const scan = async () => {
          if (!running) return;
          try {
            const codes = await detector.detect(video);
            if (codes && codes.length) { fire(codes[0].rawValue); return; }
          } catch (e) {}
          rafId = requestAnimationFrame(scan);
        };
        scan();
        return;
      }
    }

    // 2) Fallback ZXing (iOS/Safari)
    msg.textContent = "Caricamento lettore…";
    const ZX = await caricaZXing();
    zxingReader = new ZX.BrowserMultiFormatReader();
    msg.textContent = "Pronto — inquadra il codice";
    zxingReader.decodeFromVideoElement(video, (result) => {
      if (result) fire(result.getText());
    });
  } catch (err) {
    msg.textContent = "❌ Fotocamera non disponibile: " + (err.message || err) + ". Puoi inserire il codice a mano.";
  }
}
