import { comprimiImmagine } from "../../utils/immagini.js";
// ============================================================
//  bo-media.js — Media Manager Ristoflow
//  Carica, organizza e usa foto/video per sito, menu, promo
// ============================================================

const STORAGE_BUCKET = "media-aziende";
const SUPABASE_URL   = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const ANON_KEY       = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

const TAGS = ["Tutti","Piatti","Mare","Terra","Locale","Antipasti","Dolci","Vini","Eventi","Altro"];
const ACCEPT_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

export async function render(container) {
  const sc = window.supabaseClient || window.supabase?.createClient(SUPABASE_URL, ANON_KEY);
  const aziendaId = window.state?.azienda?.id || window.state?.aziendaId;
  
  // sedeId letto dinamicamente ad ogni operazione
  const getSedeId = () => window.state?.sedeAttiva?.id || null;

  // ── CSS ────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .media-wrap { padding: 16px; max-width: 1000px; }
    .media-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
    .media-title { font-size:18px; font-weight:800; color:#111827; }
    .media-upload-btn { background:#0E5A7A; color:white; border:none; border-radius:10px; padding:10px 18px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; }
    .media-upload-btn:hover { background:#0a4a64; }
    .media-tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
    .media-tag { padding:6px 14px; border-radius:20px; border:1.5px solid #e5e7eb; background:white; font-size:12px; color:#374151; cursor:pointer; transition:all .15s; }
    .media-tag.active { background:#0E5A7A; border-color:#0E5A7A; color:white; font-weight:600; }
    .media-search { width:100%; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:13px; margin-bottom:16px; outline:none; }
    .media-search:focus { border-color:#0E5A7A; }
    .media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
    .media-card { position:relative; border-radius:12px; overflow:hidden; background:#f1f5f9; aspect-ratio:1; cursor:pointer; group; }
    .media-card img, .media-card video { width:100%; height:100%; object-fit:cover; display:block; transition:transform .2s; }
    .media-card:hover img, .media-card:hover video { transform:scale(1.04); }
    .media-card-overlay { position:absolute; inset:0; background:rgba(0,0,0,0); transition:background .2s; display:flex; flex-direction:column; justify-content:space-between; padding:8px; }
    .media-card:hover .media-card-overlay { background:rgba(0,0,0,0.45); }
    .media-card-actions { display:flex; gap:6px; justify-content:flex-end; opacity:0; transition:opacity .2s; }
    .media-card:hover .media-card-actions { opacity:1; }
    .media-card-btn { background:rgba(255,255,255,.9); border:none; border-radius:6px; padding:5px 8px; font-size:11px; cursor:pointer; font-weight:600; color:#111827; }
    .media-card-btn:hover { background:white; }
    .media-card-tag { align-self:flex-start; background:rgba(0,0,0,.5); color:white; font-size:10px; padding:3px 8px; border-radius:10px; opacity:0; transition:opacity .2s; }
    .media-card:hover .media-card-tag { opacity:1; }
    .media-card-type { position:absolute; top:8px; left:8px; background:rgba(0,0,0,.5); color:white; font-size:10px; padding:3px 6px; border-radius:6px; }
    .media-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; grid-column:1/-1; }
    .media-empty .empty-icon { font-size:48px; margin-bottom:12px; }
    .media-drop-zone { border:2px dashed #e5e7eb; border-radius:16px; padding:40px 20px; text-align:center; margin-bottom:20px; transition:all .2s; cursor:pointer; background:white; }
    .media-drop-zone.drag-over { border-color:#0E5A7A; background:#f0f9ff; }
    .media-drop-zone .drop-icon { font-size:40px; margin-bottom:12px; }
    .media-drop-zone .drop-title { font-size:15px; font-weight:700; color:#374151; margin-bottom:6px; }
    .media-drop-zone .drop-sub { font-size:12px; color:#94a3b8; }
    .media-modal { position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; }
    .media-modal-inner { background:white; border-radius:16px; max-width:400px; width:100%; }
    .media-modal-header { padding:14px 16px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .media-modal-close { background:none; border:none; font-size:20px; cursor:pointer; color:#64748b; flex-shrink:0; }
    .media-modal-body { padding:16px; }
    .media-modal-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
    .media-modal-btn { flex:1; padding:10px; border-radius:10px; border:none; font-size:13px; font-weight:600; cursor:pointer; }
    .media-modal-btn.copy { background:#0E5A7A; color:white; }
    .media-modal-btn.copy:hover { background:#0a4a64; }
    .media-modal-btn.delete { background:#fef2f2; color:#dc2626; }
    .media-modal-btn.delete:hover { background:#fee2e2; }
    .media-progress { margin-top:10px; }
    .media-progress-bar { height:4px; background:#e5e7eb; border-radius:4px; overflow:hidden; }
    .media-progress-fill { height:100%; background:#0E5A7A; border-radius:4px; transition:width .3s; }
    .media-tag-select { width:100%; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:13px; margin-bottom:12px; outline:none; }
    .media-count { font-size:12px; color:#94a3b8; margin-bottom:12px; }
    @media(max-width:500px) { .media-grid { grid-template-columns:repeat(2,1fr); } }
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="media-wrap">
      <div class="media-header">
        <div class="media-title">🖼️ Media Library</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="media-upload-btn" id="btn-upload-media">
            ➕ Aggiungi foto/video
          </button>
          <button class="media-upload-btn" id="btn-import-drive" style="background:#1a73e8;">
            📁 Importa da Google Drive
          </button>
        </div>
      </div>

      <!-- Drop zone -->
      <div class="media-drop-zone" id="drop-zone">
        <div class="drop-icon">📸</div>
        <div class="drop-title">Trascina qui le tue foto e video</div>
        <div class="drop-sub">JPG, PNG, WEBP, MP4 · Max 50MB per file<br>Oppure clicca per sfogliare dal telefono o dal computer</div>
      </div>
      <input type="file" id="file-input" multiple accept="${ACCEPT_TYPES}" style="display:none">

      <!-- Pannello import da Google Drive -->
      <div id="drive-panel" style="display:none;background:white;border:1px solid #dbeafe;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">📁 Importa foto/video da Google Drive</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">
          1. Su Drive: tasto destro sulla cartella → <b>Condividi</b> → "Chiunque abbia il link".<br>
          2. Copia il link della cartella e incollalo qui (vanno bene anche link di singoli file).<br>
          Le <b>sottocartelle</b> vengono lette automaticamente: se una si chiama come una <b>categoria</b> (es. "Vini", "Dolci") le foto prendono quel tag; se si chiama come una <b>sede</b> (es. "Trattoria", "Catering") le foto vanno a quella sede. Vale anche combinato: "Catering/Vini".
        </div>
        <textarea id="drive-link" rows="2" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px;font-size:13px;box-sizing:border-box;" placeholder="https://drive.google.com/drive/folders/..."></textarea>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
          <select id="drive-tag" class="media-tag-select" style="width:auto;"></select>
          <label style="font-size:12px;color:#374151;display:flex;align-items:center;gap:5px;cursor:pointer;">
            <input type="checkbox" id="drive-ai" checked> 🤖 Dai un nome alle foto senza nome
          </label>
          <button class="media-upload-btn" id="btn-drive-avvia">⬇️ Importa</button>
          <button class="media-upload-btn" id="btn-drive-chiudi" style="background:#e5e7eb;color:#374151;">Annulla</button>
          <span id="drive-esito" style="font-size:12px;color:#64748b;"></span>
        </div>
      </div>

      <!-- Filtri -->
      <input class="media-search" id="media-search" placeholder="🔍 Cerca per nome…" oninput="filterMedia()">
      <div class="media-tags" id="media-tags"></div>
      <div class="media-count" id="media-count"></div>

      <!-- Griglia -->
      <div class="media-grid" id="media-grid">
        <div class="media-empty"><div class="empty-icon">🖼️</div>Caricamento…</div>
      </div>
    </div>

    <!-- Modal dettaglio -->
    <div class="media-modal" id="media-modal" style="display:none;">
      <div class="media-modal-inner">
        <div class="media-modal-header">
          <input id="modal-nome-input" style="flex:1;border:none;font-size:14px;font-weight:700;color:#111827;outline:none;background:transparent;" placeholder="Nome file">
          <button class="media-modal-close" onclick="chiudiModal()">✕</button>
        </div>
        <div class="media-modal-body">
          <div id="modal-preview" style="margin-bottom:12px;border-radius:10px;overflow:hidden;background:#f1f5f9;text-align:center;cursor:zoom-in;" title="Clicca per aprire l'originale"></div>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tag</label>
            <select class="media-tag-select" id="modal-tag-select" onchange="salvaTag()">
              ${TAGS.filter(t=>t!=="Tutti").map(t=>`<option value="${t}">${t}</option>`).join("")}
            </select>
          </div>
          <div class="media-modal-actions">
            <button class="media-modal-btn copy" onclick="copiaUrl()">📋 Copia URL</button>
            <button class="media-modal-btn" onclick="salvaNome()" style="background:#f0fdf4;color:#15803d;">💾 Salva nome</button>
            <button class="media-modal-btn delete" onclick="eliminaMedia()">🗑️ Elimina</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── STATO ───────────────────────────────────────────────────
  let allMedia = [];
  let tagAttivo = "Tutti";
  let mediaSelezionato = null;

  // ── TAGS ────────────────────────────────────────────────────
  const tagsEl = document.getElementById("media-tags");
  TAGS.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "media-tag" + (tag === "Tutti" ? " active" : "");
    btn.textContent = tag;
    btn.onclick = () => {
      tagAttivo = tag;
      document.querySelectorAll(".media-tag").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderGriglia();
    };
    tagsEl.appendChild(btn);
  });

  // ── CARICA MEDIA ─────────────────────────────────────────────
  async function caricaMedia() {
    if (!aziendaId) { document.getElementById("media-grid").innerHTML = `<div class="media-empty"><div class="empty-icon">⚠️</div>Azienda non trovata.</div>`; return; }

    const sedeId = getSedeId();
    if (!sedeId) {
      document.getElementById("media-grid").innerHTML = `<div class="media-empty"><div class="empty-icon">🏠</div>Seleziona una sede per vedere i media.</div>`;
      allMedia = [];
      return;
    }

    // le foto senza sede devono restare visibili: altrimenti chi carica
    // senza sede attiva le perde e non le ritrova piu
    const sedeCorrente = getSedeId();
    let q = sc.from("media_library")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending: false });
    if (sedeCorrente) q = q.or("sede_id.eq." + sedeCorrente + ",sede_id.is.null");

    const { data, error } = await q;

    if (error) {
      document.getElementById("media-grid").innerHTML = `<div class="media-empty"><div class="empty-icon">🔧</div>Prima configurazione: carica il tuo primo file!</div>`;
      allMedia = [];
    } else {
      allMedia = data || [];
      renderGriglia();
      avviaCodaThumb(); // genera in background le miniature mancanti
    }
  }

  // ── RENDER GRIGLIA ───────────────────────────────────────────
  // Miniature generate DALL'APP (canvas) e salvate nello storage:
  // il servizio di resize di Supabase non e' incluso nel piano, quindi
  // le creiamo noi alla prima apertura e le riusiamo per sempre.
  function urlAnteprima(m) { return m.thumb_url || m.url; }

  async function generaThumb(m) {
    try {
      const resp = await fetch(m.url);
      if (!resp.ok) return false;
      const blob = await resp.blob();
      if (!/^image\//.test(blob.type)) return false;
      const bmp = await createImageBitmap(blob);
      const MAX = 420;
      const scala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scala));
      const h = Math.max(1, Math.round(bmp.height * scala));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
      bmp.close && bmp.close();
      const thumbBlob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.72));
      if (!thumbBlob) return false;
      const path = `${aziendaId}/thumbs/${m.id}.jpg`;
      const { error: upErr } = await sc.storage.from(STORAGE_BUCKET)
        .upload(path, thumbBlob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
      if (upErr) return false;
      const { data: { publicUrl } } = sc.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      await sc.from("media_library").update({ thumb_url: publicUrl }).eq("id", m.id);
      m.thumb_url = publicUrl;
      const img = document.querySelector(`img[data-mid="${m.id}"]`);
      if (img) img.src = publicUrl;
      return true;
    } catch { return false; }
  }

  // Coda in background: genera le miniature mancanti (3 alla volta)
  let thumbQueueAttiva = false;
  async function avviaCodaThumb() {
    if (thumbQueueAttiva) return;
    thumbQueueAttiva = true;
    try {
      const daFare = allMedia.filter(m => m.tipo === "immagine" && !m.thumb_url);
      const PARALLELI = 3;
      for (let i = 0; i < daFare.length; i += PARALLELI) {
        await Promise.all(daFare.slice(i, i + PARALLELI).map(generaThumb));
      }
    } finally { thumbQueueAttiva = false; }
  }

  function renderGriglia() {
    const search = (document.getElementById("media-search")?.value || "").toLowerCase();
    const grid   = document.getElementById("media-grid");
    const count  = document.getElementById("media-count");

    let filtered = allMedia.filter(m => {
      if (tagAttivo !== "Tutti" && m.tag !== tagAttivo) return false;
      if (search && !m.nome.toLowerCase().includes(search)) return false;
      return true;
    });

    count.textContent = `${filtered.length} file`;

    if (!filtered.length) {
      grid.innerHTML = `<div class="media-empty"><div class="empty-icon">🔍</div>${allMedia.length ? "Nessun risultato" : "Nessun file ancora — carica la tua prima foto!"}</div>`;
      return;
    }

    grid.innerHTML = filtered.map(m => {
      const isVideo = m.tipo === "video";
      const tag = m.tag || "Altro";
      return `
        <div class="media-card" onclick="apriModal('${m.id}')">
          ${isVideo
            ? `<video src="${escHtml(m.url)}" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<img src="${escHtml(urlAnteprima(m))}" data-mid="${m.id}" alt="${escHtml(m.nome)}" loading="lazy" decoding="async">`
          }
          <div class="media-card-type">${isVideo ? "🎬" : "🖼️"}</div>
          <div class="media-card-overlay">
            <div class="media-card-tag">${escHtml(tag)}</div>
            <div class="media-card-actions">
              <button class="media-card-btn" onclick="event.stopPropagation();copiaDiretto('${escHtml(m.url)}')">📋</button>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  window.filterMedia = renderGriglia;

  // ── UPLOAD ───────────────────────────────────────────────────
  const dropZone  = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");

  dropZone.onclick = () => fileInput.click();
  document.getElementById("btn-upload-media").onclick = () => fileInput.click();

  // ── IMPORT DA GOOGLE DRIVE ──────────────────────────────────
  const drivePanel = document.getElementById("drive-panel");
  const driveTagSel = document.getElementById("drive-tag");
  if (driveTagSel) driveTagSel.innerHTML = TAGS.filter(t => t !== "Tutti")
    .map(t => `<option value="${t}">${t}</option>`).join("");

  document.getElementById("btn-import-drive").onclick = () => {
    drivePanel.style.display = drivePanel.style.display === "none" ? "block" : "none";
  };
  document.getElementById("btn-drive-chiudi").onclick = () => { drivePanel.style.display = "none"; };

  document.getElementById("btn-drive-avvia").onclick = async () => {
    const testo = document.getElementById("drive-link").value.trim();
    const esito = document.getElementById("drive-esito");
    if (!testo) { esito.textContent = "Incolla prima un link Drive."; return; }
    const btn = document.getElementById("btn-drive-avvia");
    btn.disabled = true;

    const EF_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/import-da-drive";
    const base = {
      azienda_id: aziendaId,
      sede_id: window.state?.sedeAttiva?.id || null,
      tag: driveTagSel?.value || "Altro",
      tags_disponibili: TAGS.filter(t => t !== "Tutti"),
      sedi_disponibili: (window.state?.sedi || []).map(s => ({ id: s.id, nome: s.nome })),
      usa_ai: document.getElementById("drive-ai")?.checked !== false
    };
    const chiama = async (payload) => {
      const r = await fetch(EF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({}, base, payload))
      });
      return await r.json();
    };

    try {
      // 1) Elenco dei file (veloce, non scarica nulla)
      esito.textContent = "🔎 Leggo la cartella…";
      const lista = await chiama({ testo, solo_lista: true });
      if (!lista.success || !lista.file?.length) {
        esito.textContent = "❌ " + (lista.error || "Nessun file trovato nella cartella");
        return;
      }

      // 2) Import a blocchi da 8: nessun timeout anche con AI e tante foto
      const BATCH = 8;
      let importati = 0, falliti = 0, conAI = 0;
      for (let i = 0; i < lista.file.length; i += BATCH) {
        esito.textContent = `⏳ Importate ${importati} di ${lista.file.length}…` + (conAI ? ` · 🤖 ${conAI}` : "");
        const blocco = lista.file.slice(i, i + BATCH);
        try {
          const r = await chiama({ file_batch: blocco });
          if (r.success) {
            importati += r.importati || 0;
            conAI += r.rinominati_ai || 0;
            falliti += (r.risultati || []).filter(x => !x.success).length;
          } else {
            falliti += blocco.length;
          }
        } catch { falliti += blocco.length; }
        renderGriglia && await caricaMedia(); // la griglia si riempie man mano
      }

      esito.textContent = `✅ Importate ${importati} su ${lista.file.length}` +
        (conAI ? ` · 🤖 ${conAI} nominate dall'AI` : "") +
        (falliti ? ` — ${falliti} non importate (condivisione o dimensione)` : "");
      document.getElementById("drive-link").value = "";
      await caricaMedia();
    } catch (e) {
      esito.textContent = "❌ Errore di rete: " + e.message;
    } finally {
      btn.disabled = false;
    }
  };

  fileInput.addEventListener("change", e => gestisciFiles(Array.from(e.target.files)));

  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    gestisciFiles(Array.from(e.dataTransfer.files));
  });

  async function gestisciFiles(files) {
    if (!aziendaId) { alert("Seleziona prima un'azienda."); return; }

    // Crea la progress bar
    const progressHtml = `<div class="media-progress" id="upload-progress"><div style="font-size:13px;font-weight:600;margin-bottom:6px;" id="upload-label">Caricamento…</div><div class="media-progress-bar"><div class="media-progress-fill" id="upload-fill" style="width:0%"></div></div></div>`;
    dropZone.insertAdjacentHTML("afterend", progressHtml);

    let completati = 0;
    for (const file of files) {
      if (file.size > 100 * 1024 * 1024) { alert(`${file.name} è troppo grande (max 100MB)`); completati++; continue; }

      const isVideo = file.type.startsWith("video/");
      const ext     = file.name.split(".").pop().toLowerCase();
      const nome    = file.name.replace(/\.[^.]+$/, "");
      const path    = `${aziendaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      document.getElementById("upload-label").textContent = `Caricamento ${file.name}…`;
      document.getElementById("upload-fill").style.width = `${(completati / files.length) * 100}%`;

      // le foto pesanti si ridimensionano prima di partire: banda e tempi di caricamento
      const daCaricare = isVideo ? file : await comprimiImmagine(file);
      const { error: uploadError } = await sc.storage.from(STORAGE_BUCKET).upload(path, daCaricare, { cacheControl: "31536000", contentType: daCaricare.type, upsert: false });

      if (uploadError) { console.error("Upload error:", uploadError); completati++; continue; }

      const { data: { publicUrl } } = sc.storage.from(STORAGE_BUCKET).getPublicUrl(path);

      // Salva in media_library
      const { data: nuovo } = await sc.from("media_library").insert({
        azienda_id: aziendaId,
        sede_id: getSedeId() || null,
        nome,
        url: publicUrl,
        path,
        tipo: isVideo ? "video" : "immagine",
        tag: "Altro",
        dimensione: daCaricare.size,
        created_at: new Date().toISOString()
      }).select("id,url,tipo,thumb_url").single();
      if (nuovo && nuovo.tipo === "immagine") generaThumb(nuovo); // thumb subito, in background

      completati++;
    }

    document.getElementById("upload-fill").style.width = "100%";
    document.getElementById("upload-label").textContent = `✅ ${completati} file caricati!`;
    setTimeout(() => document.getElementById("upload-progress")?.remove(), 2000);
    fileInput.value = "";
    await caricaMedia();
  }

  // ── MODAL ────────────────────────────────────────────────────
  window.apriModal = function(id) {
    mediaSelezionato = allMedia.find(m => m.id === id);
    if (!mediaSelezionato) return;
    const m = mediaSelezionato;
    document.getElementById("modal-nome-input").value = m.nome;
    document.getElementById("modal-tag-select").value = m.tag || "Altro";
    const prev = document.getElementById("modal-preview");
    if (prev) {
      prev.innerHTML = m.tipo === "video"
        ? "<video src=\"" + escHtml(m.url) + "\" controls style=\"max-width:100%;max-height:45vh;display:block;margin:0 auto;\"></video>"
        : "<img src=\"" + escHtml(m.url) + "\" style=\"max-width:100%;max-height:45vh;object-fit:contain;display:block;margin:0 auto;\">";
      prev.onclick = () => window.open(m.url, "_blank");
    }
    document.getElementById("media-modal").style.display = "flex";
  };

  window.salvaNome = async function() {
    if (!mediaSelezionato) return;
    const nuovoNome = document.getElementById("modal-nome-input").value.trim();
    if (!nuovoNome) return;
    await sc.from("media_library").update({ nome: nuovoNome }).eq("id", mediaSelezionato.id);
    mediaSelezionato.nome = nuovoNome;
    const idx = allMedia.findIndex(m => m.id === mediaSelezionato.id);
    if (idx >= 0) allMedia[idx].nome = nuovoNome;
    chiudiModal();
    renderGriglia();
  };

  // Salva nome anche con Invio
  document.getElementById("modal-nome-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") window.salvaNome();
  });

  window.chiudiModal = function() {
    document.getElementById("media-modal").style.display = "none";
    mediaSelezionato = null;
  };

  document.getElementById("media-modal").onclick = function(e) {
    if (e.target === this) chiudiModal();
  };

  window.copiaUrl = function() {
    if (!mediaSelezionato) return;
    navigator.clipboard.writeText(mediaSelezionato.url)
      .then(() => { const btn = document.querySelector(".media-modal-btn.copy"); btn.textContent = "✅ Copiato!"; setTimeout(() => btn.textContent = "📋 Copia URL", 2000); })
      .catch(() => { alert("URL: " + mediaSelezionato.url); });
  };

  window.copiaDiretto = function(url) {
    navigator.clipboard.writeText(url)
      .then(() => { /* toast */ })
      .catch(() => alert("URL: " + url));
  };

  window.salvaTag = async function() {
    if (!mediaSelezionato) return;
    const tag = document.getElementById("modal-tag-select").value;
    await sc.from("media_library").update({ tag }).eq("id", mediaSelezionato.id);
    mediaSelezionato.tag = tag;
    const idx = allMedia.findIndex(m => m.id === mediaSelezionato.id);
    if (idx >= 0) allMedia[idx].tag = tag;
    renderGriglia();
  };

  window.eliminaMedia = async function() {
    if (!mediaSelezionato) return;
    if (!confirm(`Eliminare "${mediaSelezionato.nome}"? L'operazione è irreversibile.`)) return;
    await sc.storage.from(STORAGE_BUCKET).remove([mediaSelezionato.path]);
    await sc.from("media_library").delete().eq("id", mediaSelezionato.id);
    allMedia = allMedia.filter(m => m.id !== mediaSelezionato.id);
    chiudiModal();
    renderGriglia();
  };

  function escHtml(v) { return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  // ── INIT ─────────────────────────────────────────────────────
  await caricaMedia();
}
