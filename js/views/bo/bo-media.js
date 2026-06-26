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
  const sedeId    = window.state?.sedeAttiva?.id || null;

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
        <button class="media-upload-btn" id="btn-upload-media">
          ➕ Aggiungi foto/video
        </button>
      </div>

      <!-- Drop zone -->
      <div class="media-drop-zone" id="drop-zone">
        <div class="drop-icon">📸</div>
        <div class="drop-title">Trascina qui le tue foto e video</div>
        <div class="drop-sub">JPG, PNG, WEBP, MP4 · Max 50MB per file<br>Oppure clicca per sfogliare dal telefono o dal computer</div>
      </div>
      <input type="file" id="file-input" multiple accept="${ACCEPT_TYPES}" style="display:none">

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

    if (!sedeId) {
      document.getElementById("media-grid").innerHTML = `<div class="media-empty"><div class="empty-icon">🏠</div>Seleziona una sede per vedere i media.</div>`;
      allMedia = [];
      return;
    }

    let q = sc.from("media_library")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .order("created_at", { ascending: false });

    const { data, error } = await q;

    if (error) {
      document.getElementById("media-grid").innerHTML = `<div class="media-empty"><div class="empty-icon">🔧</div>Prima configurazione: carica il tuo primo file!</div>`;
      allMedia = [];
    } else {
      allMedia = data || [];
      renderGriglia();
    }
  }

  // ── RENDER GRIGLIA ───────────────────────────────────────────
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
            : `<img src="${escHtml(m.url)}" alt="${escHtml(m.nome)}" loading="lazy">`
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

      const { error: uploadError } = await sc.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) { console.error("Upload error:", uploadError); completati++; continue; }

      const { data: { publicUrl } } = sc.storage.from(STORAGE_BUCKET).getPublicUrl(path);

      // Salva in media_library
      await sc.from("media_library").insert({
        azienda_id: aziendaId,
        sede_id: sedeId || null,
        nome,
        url: publicUrl,
        path,
        tipo: isVideo ? "video" : "immagine",
        tag: "Altro",
        dimensione: file.size,
        created_at: new Date().toISOString()
      });

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
    document.getElementById("media-modal").style.display = "flex";
    setTimeout(() => document.getElementById("modal-nome-input").focus(), 100);
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
