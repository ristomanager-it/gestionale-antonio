// js/components/camera.js
// Camera del locale: scatta o riprende, firma, genera i formati per i social,
// carica in galleria. Al salvataggio propone di farne subito un post.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function toast(m, t) { if (window.mostraToast) window.mostraToast(m, t || 'success'); }
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id || window.state?.aziendaId; }

const FORMATI = {
  quadrata:    { w: 1080, h: 1080, l: 'Quadrata 1:1', usi: 'Instagram, Facebook' },
  verticale:   { w: 1080, h: 1350, l: 'Verticale 4:5', usi: 'Instagram feed' },
  storia:      { w: 1080, h: 1920, l: 'Storia 9:16',  usi: 'Storie e reel' },
  orizzontale: { w: 1200, h: 628,  l: 'Orizzontale',  usi: 'Facebook link' },
};

let stream = null;
let scatto = null;
let videoBlob = null;
let recorder = null;
let pezziVideo = [];
let firma = null;
let logoImg = null;
let modo = 'foto';
let facingAttuale = 'environment';

export async function apriCamera() {
  if (document.getElementById('cam-overlay')) return;

  const el = document.createElement('div');
  el.id = 'cam-overlay';
  el.innerHTML = interfaccia();
  document.body.appendChild(el);

  document.getElementById('cam-chiudi').onclick = chiudiCamera;
  document.getElementById('cam-scatta').onclick = scatta;
  document.getElementById('cam-rifai').onclick = rifai;
  document.getElementById('cam-salva').onclick = salva;
  document.getElementById('cam-cambia').onclick = cambiaCamera;
  document.getElementById('cam-modo-foto').onclick = () => cambiaModo('foto');
  document.getElementById('cam-modo-video').onclick = () => cambiaModo('video');
  document.getElementById('cam-file').onchange = daFile;

  await caricaFirma();
  await avvia('environment');
}

function interfaccia() {
  return `
  <div class="cam-wrap">
    <div class="cam-top">
      <button class="cam-x" id="cam-chiudi">✕</button>
      <div class="cam-modi">
        <button id="cam-modo-foto" class="cam-modo attivo">Foto</button>
        <button id="cam-modo-video" class="cam-modo">Video</button>
      </div>
      <button class="cam-x" id="cam-cambia">⟲</button>
    </div>

    <div class="cam-palco">
      <video id="cam-video" autoplay playsinline muted></video>
      <canvas id="cam-canvas" hidden></canvas>
      <img id="cam-anteprima" hidden alt="">
      <video id="cam-video-fatto" hidden controls playsinline></video>
      <div class="cam-guida" id="cam-guida"></div>
      <div class="cam-rec" id="cam-rec" hidden>● REC <span id="cam-tempo">0:00</span></div>
    </div>

    <div class="cam-sotto">
      <div id="cam-esito" class="cam-esito"></div>

      <div class="cam-barra" id="cam-barra-scatto">
        <label class="cam-file-lab">
          🖼<input type="file" id="cam-file" accept="image/*,video/*" hidden>
        </label>
        <button class="cam-bottone" id="cam-scatta"></button>
        <div class="cam-spazio"></div>
      </div>

      <div class="cam-barra cam-azioni" id="cam-barra-salva" hidden>
        <button class="cam-a sec" id="cam-rifai">Rifai</button>
        <button class="cam-a pri" id="cam-salva">Salva in galleria</button>
      </div>
    </div>
  </div>

  <style>
    #cam-overlay{position:fixed;inset:0;background:#000;z-index:2000;display:flex;
                 align-items:center;justify-content:center}
    .cam-wrap{width:100%;height:100%;display:flex;flex-direction:column;max-width:560px}
    .cam-top{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;gap:10px}
    .cam-x{background:rgba(255,255,255,.15);color:#fff;border:none;width:36px;height:36px;
           border-radius:18px;font-size:16px;cursor:pointer}
    .cam-modi{display:flex;background:rgba(255,255,255,.15);border-radius:20px;padding:3px}
    .cam-modo{background:none;border:none;color:#fff;padding:6px 16px;border-radius:16px;
              font-size:13px;font-weight:600;cursor:pointer;opacity:.65}
    .cam-modo.attivo{background:#fff;color:#111;opacity:1}
    #cam-overlay [hidden]{display:none !important}
    .cam-palco{flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
    .cam-palco video{width:100%;height:100%;object-fit:cover;display:block}
    .cam-palco img,.cam-palco video.fatto{width:100%;height:100%;object-fit:contain;display:block}
    .cam-guida{position:absolute;inset:0;pointer-events:none;
               background:
                 linear-gradient(to right,transparent 33.3%,rgba(255,255,255,.18) 33.3%,rgba(255,255,255,.18) 33.5%,transparent 33.5%),
                 linear-gradient(to right,transparent 66.6%,rgba(255,255,255,.18) 66.6%,rgba(255,255,255,.18) 66.8%,transparent 66.8%),
                 linear-gradient(to bottom,transparent 33.3%,rgba(255,255,255,.18) 33.3%,rgba(255,255,255,.18) 33.5%,transparent 33.5%),
                 linear-gradient(to bottom,transparent 66.6%,rgba(255,255,255,.18) 66.6%,rgba(255,255,255,.18) 66.8%,transparent 66.8%)}
    .cam-rec{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#D32F2F;
             color:#fff;padding:5px 12px;border-radius:14px;font-size:12px;font-weight:700}
    .cam-sotto{padding:14px 16px 26px}
    .cam-esito{color:#fff;font-size:12.5px;line-height:1.45;margin-bottom:10px;min-height:18px;opacity:.85}
    .cam-barra{display:flex;align-items:center;justify-content:space-between;gap:14px}
    .cam-bottone{width:68px;height:68px;border-radius:34px;background:#fff;border:5px solid rgba(255,255,255,.4);
                 cursor:pointer;flex-shrink:0}
    .cam-bottone.rec{background:#D32F2F}
    .cam-file-lab{color:#fff;font-size:24px;cursor:pointer;width:44px;text-align:center}
    .cam-spazio{width:44px}
    .cam-azioni{justify-content:stretch}
    .cam-a{flex:1;border:none;border-radius:9px;padding:13px;font-size:14px;font-weight:700;cursor:pointer}
    .cam-a.pri{background:#fff;color:#111}
    .cam-a.sec{background:rgba(255,255,255,.16);color:#fff}
    .cam-a:disabled{opacity:.5}
  </style>`;
}

async function caricaFirma() {
  const { data } = await supa().from('media_firma')
    .select('*').eq('azienda_id', aziendaId()).maybeSingle();
  firma = data || null;

  let url = firma && firma.logo_url ? firma.logo_url : null;
  if (!url) {
    const { data: az } = await supa().from('aziende').select('logo_url').eq('id', aziendaId()).maybeSingle();
    url = az && az.logo_url ? az.logo_url : null;
  }
  if (!url) return;

  logoImg = await new Promise(res => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = url;
  });
}

async function avvia(facing) {
  try {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
      audio: modo === 'video'
    });
    const v = document.getElementById('cam-video');
    v.srcObject = stream;
    v.muted = true;
    v.playsInline = true;
    try { await v.play(); } catch (e) { }
    await new Promise(res => {
      if (v.videoWidth) return res(true);
      v.onloadedmetadata = () => res(true);
      setTimeout(() => res(false), 2500);
    });
    document.getElementById('cam-esito').textContent =
      modo === 'foto' ? 'Inquadra e scatta. Le righe aiutano a tenere dritto.' : 'Premi il tasto per iniziare e per fermare.';
  } catch (e) {
    document.getElementById('cam-esito').textContent =
      'Non riesco ad aprire la fotocamera. Puoi comunque scegliere un file col tasto a sinistra.';
  }
}

async function cambiaCamera() {
  facingAttuale = facingAttuale === 'environment' ? 'user' : 'environment';
  await avvia(facingAttuale);
}

function cambiaModo(m) {
  modo = m;
  document.getElementById('cam-modo-foto').classList.toggle('attivo', m === 'foto');
  document.getElementById('cam-modo-video').classList.toggle('attivo', m === 'video');
  avvia(facingAttuale);
}

async function scatta() {
  if (modo === 'video') return registra();

  const v = document.getElementById('cam-video');
  // su iPhone le misure arrivano un attimo dopo: aspetto invece di rifiutare
  for (let i = 0; i < 12 && !v.videoWidth; i++) {
    try { await v.play(); } catch (e) { }
    await new Promise(r => setTimeout(r, 150));
  }
  if (!v.videoWidth) {
    toast('La fotocamera non parte: usa il tasto immagine per prendere una foto dal telefono', 'error');
    return;
  }

  const c = document.getElementById('cam-canvas');
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  applicaFirma(c);

  c.toBlob(b => {
    scatto = { blob: b, w: c.width, h: c.height };
    mostraAnteprima(c.toDataURL('image/jpeg', 0.92));
  }, 'image/jpeg', 0.92);
}

function registra() {
  const b = document.getElementById('cam-scatta');
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    b.classList.remove('rec');
    document.getElementById('cam-rec').hidden = true;
    return;
  }
  pezziVideo = [];
  try {
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  } catch (e) {
    toast('Il telefono non supporta la registrazione qui', 'error');
    return;
  }
  recorder.ondataavailable = e => { if (e.data.size) pezziVideo.push(e.data); };
  recorder.onstop = () => {
    videoBlob = new Blob(pezziVideo, { type: 'video/webm' });
    const u = URL.createObjectURL(videoBlob);
    const vf = document.getElementById('cam-video-fatto');
    vf.src = u; vf.hidden = false;
    document.getElementById('cam-video').hidden = true;
    document.getElementById('cam-guida').hidden = true;
    document.getElementById('cam-barra-scatto').hidden = true;
    document.getElementById('cam-barra-salva').hidden = false;
    document.getElementById('cam-esito').textContent =
      'Video pronto. Sul video la firma non viene applicata.';
  };
  recorder.start();
  b.classList.add('rec');

  const rec = document.getElementById('cam-rec');
  rec.hidden = false;
  const inizio = Date.now();
  const tick = setInterval(() => {
    if (!recorder || recorder.state !== 'recording') { clearInterval(tick); return; }
    const s = Math.floor((Date.now() - inizio) / 1000);
    document.getElementById('cam-tempo').textContent =
      Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    if (s >= 60) recorder.stop();
  }, 500);
}

function daFile(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (f.type.indexOf('video') === 0) {
    videoBlob = f;
    const vf = document.getElementById('cam-video-fatto');
    vf.src = URL.createObjectURL(f); vf.hidden = false;
    document.getElementById('cam-video').hidden = true;
    document.getElementById('cam-guida').hidden = true;
    document.getElementById('cam-barra-scatto').hidden = true;
    document.getElementById('cam-barra-salva').hidden = false;
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    const i = new Image();
    i.onload = () => {
      const c = document.getElementById('cam-canvas');
      c.width = i.width; c.height = i.height;
      c.getContext('2d').drawImage(i, 0, 0);
      applicaFirma(c);
      c.toBlob(b => {
        scatto = { blob: b, w: c.width, h: c.height };
        mostraAnteprima(c.toDataURL('image/jpeg', 0.92));
      }, 'image/jpeg', 0.92);
    };
    i.src = r.result;
  };
  r.readAsDataURL(f);
}

function mostraAnteprima(dataUrl) {
  const img = document.getElementById('cam-anteprima');
  img.src = dataUrl; img.hidden = false;
  document.getElementById('cam-video').hidden = true;
  document.getElementById('cam-guida').hidden = true;
  document.getElementById('cam-barra-scatto').hidden = true;
  document.getElementById('cam-barra-salva').hidden = false;
  document.getElementById('cam-esito').textContent =
    'Salvando creo anche i formati per Instagram, Facebook e le storie.';
}

function rifai() {
  scatto = null; videoBlob = null;
  document.getElementById('cam-anteprima').hidden = true;
  document.getElementById('cam-video-fatto').hidden = true;
  document.getElementById('cam-video').hidden = false;
  document.getElementById('cam-guida').hidden = false;
  document.getElementById('cam-barra-scatto').hidden = false;
  document.getElementById('cam-barra-salva').hidden = true;
  document.getElementById('cam-esito').textContent = '';
}

function applicaFirma(canvas) {
  if (!firma || firma.attiva === false) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const margine = Math.round(Math.min(W, H) * (Number(firma.margine || 4) / 100));
  ctx.save();
  ctx.globalAlpha = Number(firma.opacita || 0.85);
  if (firma.ombra) {
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = Math.round(W * 0.012);
    ctx.shadowOffsetY = Math.round(W * 0.003);
  }

  if (logoImg) {
    const lw = Math.round(W * (Number(firma.dimensione || 14) / 100));
    const lh = Math.round(lw * (logoImg.height / logoImg.width));
    const p = posizione(W, H, lw, lh, margine);
    ctx.drawImage(logoImg, p.x, p.y, lw, lh);
  } else {
    const testo = firma.testo || (window.state?.azienda?.nome || '');
    if (!testo) { ctx.restore(); return; }
    const dim = Math.round(W * (Number(firma.dimensione || 14) / 100) * 0.30);
    ctx.font = '600 ' + dim + 'px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = firma.colore_testo || '#FFFFFF';
    const m = ctx.measureText(testo);
    const p = posizione(W, H, m.width, dim, margine);
    ctx.textBaseline = 'top';
    ctx.fillText(testo, p.x, p.y);
  }
  ctx.restore();
}

function posizione(W, H, w, h, m) {
  switch (firma.posizione) {
    case 'basso_sinistra': return { x: m, y: H - h - m };
    case 'alto_destra':    return { x: W - w - m, y: m };
    case 'alto_sinistra':  return { x: m, y: m };
    case 'centro_basso':   return { x: (W - w) / 2, y: H - h - m };
    default:               return { x: W - w - m, y: H - h - m };
  }
}

function ritaglia(sorgente, larg, alt) {
  const c = document.createElement('canvas');
  c.width = larg; c.height = alt;
  const ctx = c.getContext('2d');
  const sr = sorgente.width / sorgente.height;
  const dr = larg / alt;
  let sw, sh, sx, sy;
  if (sr > dr) { sh = sorgente.height; sw = sh * dr; sx = (sorgente.width - sw) / 2; sy = 0; }
  else         { sw = sorgente.width;  sh = sw / dr; sx = 0; sy = (sorgente.height - sh) / 2; }
  ctx.drawImage(sorgente, sx, sy, sw, sh, 0, 0, larg, alt);
  return c;
}

function aBlob(canvas, q) {
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', q || 0.9));
}

async function salva() {
  const btn = document.getElementById('cam-salva');
  btn.disabled = true;
  const az = aziendaId();
  const esito = document.getElementById('cam-esito');

  try {
    const stamp = Date.now();
    const base = az + '/camera/' + stamp;

    if (videoBlob) {
      esito.textContent = 'Carico il video…';
      const path = base + '.webm';
      const up = await supa().storage.from('media-aziende').upload(path, videoBlob, {
        contentType: 'video/webm', upsert: false
      });
      if (up.error) throw up.error;
      const { data: pub } = supa().storage.from('media-aziende').getPublicUrl(path);

      const ins = await supa().from('media_library').insert({
        azienda_id: az, nome: 'Video del ' + new Date().toLocaleDateString('it-IT'),
        url: pub.publicUrl, tipo: 'video', tag: 'Altro', origine: 'camera'
      }).select('id').single();
      if (ins.error) throw ins.error;

      chiediPost(ins.data.id, pub.publicUrl, true);
      return;
    }

    if (!scatto) { toast('Niente da salvare', 'error'); btn.disabled = false; return; }

    esito.textContent = 'Carico la foto…';
    const path = base + '.jpg';
    const up = await supa().storage.from('media-aziende').upload(path, scatto.blob, {
      contentType: 'image/jpeg', upsert: false
    });
    if (up.error) throw up.error;
    const { data: pub } = supa().storage.from('media-aziende').getPublicUrl(path);

    const ins = await supa().from('media_library').insert({
      azienda_id: az,
      nome: 'Scatto del ' + new Date().toLocaleDateString('it-IT') + ' ' +
            new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      url: pub.publicUrl, tipo: 'immagine', tag: 'Piatti', origine: 'camera',
      larghezza: scatto.w, altezza: scatto.h
    }).select('id').single();
    if (ins.error) throw ins.error;
    const mediaId = ins.data.id;

    // l utente e libero da qui: il resto continua da solo
    chiediPost(mediaId, pub.publicUrl, false);
    formatiInBackground(mediaId, az, base);
    return;
  } catch (e) {
    toast('Non sono riuscito a salvare: ' + (e.message || e), 'error');
    btn.disabled = false;
  }
}

async function formatiInBackground(mediaId, az, base) {
  try {
    const src = document.getElementById('cam-anteprima');
    if (!src) return;
    const img = await new Promise(res => {
      const i = new Image(); i.onload = () => res(i);
      i.src = src.src;
    });

    for (const k of Object.keys(FORMATI)) {
      const f = FORMATI[k];
      try {
        const c = ritaglia(img, f.w, f.h);
        const b = await aBlob(c, 0.88);
        const p = base + '-' + k + '.jpg';
        const u2 = await supa().storage.from('media-aziende').upload(p, b, { contentType: 'image/jpeg' });
        if (u2.error) continue;
        const { data: pu } = supa().storage.from('media-aziende').getPublicUrl(p);
        await supa().from('media_varianti').insert({
          media_id: mediaId, azienda_id: az, formato: k,
          url: pu.publicUrl, larghezza: f.w, altezza: f.h,
          con_firma: firma && firma.attiva !== false
        });
      } catch (e) { }
    }
    try {
      await supa().functions.invoke('media-descrivi', { body: { azienda_id: az, limite: 1 } });
    } catch (e) { }
  } catch (e) { }
}

function chiediPost(mediaId, url, isVideo) {
  const wrap = document.querySelector('.cam-sotto');
  wrap.innerHTML =
    '<div class="cam-esito">Salvato in galleria' +
      (isVideo ? '.' : ' con i formati per Instagram, Facebook e le storie.') + '</div>' +
    '<div class="cam-barra cam-azioni">' +
      '<button class="cam-a sec" id="cam-fine">Solo galleria</button>' +
      '<button class="cam-a pri" id="cam-post">Fanne un post</button>' +
    '</div>';

  document.getElementById('cam-fine').onclick = () => { chiudiCamera(); };
  document.getElementById('cam-post').onclick = () => {
    chiudiCamera();
    const oggi = new Date();
    const k = oggi.getFullYear() + '-' + String(oggi.getMonth() + 1).padStart(2, '0') + '-' +
              String(oggi.getDate()).padStart(2, '0');
    sessionStorage.setItem('camera_media_url', url);
    sessionStorage.setItem('camera_data', k);
    if (window.router && window.router.go) window.router.go('bo-calendario');
    else window.location.hash = '#/bo-calendario';
  };
}

export function chiudiCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; scatto = null; videoBlob = null; recorder = null;
  const el = document.getElementById('cam-overlay');
  if (el) el.remove();
}

// Pulsante tondo sempre presente in home: una mano sola, senza cercare nei menu.
export function montaBottoneCamera() {
  if (document.getElementById('cam-fab')) return;
  const b = document.createElement('button');
  b.id = 'cam-fab';
  b.title = 'Scatta o riprendi';
  b.textContent = '📷';
  b.onclick = apriCamera;
  document.body.appendChild(b);

  const s = document.createElement('style');
  s.textContent =
    '#cam-fab{position:fixed;right:18px;bottom:88px;width:58px;height:58px;border-radius:29px;' +
    'background:#111827;color:#fff;border:none;font-size:24px;cursor:pointer;z-index:800;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center}' +
    '#cam-fab:active{transform:scale(.94)}' +
    '@media (max-width:640px){#cam-fab{right:14px;bottom:78px;width:54px;height:54px}}';
  document.head.appendChild(s);
}

export function smontaBottoneCamera() {
  const b = document.getElementById('cam-fab');
  if (b) b.remove();
}
