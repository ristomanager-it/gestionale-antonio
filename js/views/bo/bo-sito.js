// ============================================================
//  bo-sito.js — Gestione Sito Web da Ristoflow
//  Legge da Supabase, genera HTML, pubblica su GitHub Pages
// ============================================================

// GitHub deploy via Edge Function (token nei Secrets Supabase)
const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

export async function render(container) {
  const sc = window.supabaseClient || window.supabase?.createClient(SUPABASE_URL, ANON_KEY);
  const aziendaId = window.state?.azienda?.id || window.state?.aziendaId;
  const sedeId    = window.state?.sedeAttiva?.id || null;

  const style = document.createElement("style");
  style.textContent = `
    .sito-wrap { padding:16px; max-width:800px; }
    .sito-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
    .sito-title { font-size:18px; font-weight:800; color:#111827; }
    .sito-tabs { display:flex; gap:2px; background:#f1f5f9; border-radius:10px; padding:3px; margin-bottom:20px; flex-wrap:wrap; }
    .sito-tab { padding:8px 16px; border-radius:8px; border:none; background:transparent; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
    .sito-tab.active { background:white; color:#0E5A7A; box-shadow:0 1px 4px rgba(0,0,0,.1); }
    .sito-panel { display:none; }
    .sito-panel.active { display:block; }
    .sito-card { background:white; border-radius:14px; padding:20px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .sito-label { font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:6px; text-transform:uppercase; letter-spacing:.5px; }
    .sito-input { width:100%; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
    .sito-input:focus { border-color:#0E5A7A; }
    .sito-textarea { width:100%; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; resize:vertical; min-height:80px; }
    .sito-textarea:focus { border-color:#0E5A7A; }
    .sito-field { margin-bottom:14px; }
    .sito-media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:8px; margin-top:8px; }
    .sito-media-item { position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; cursor:pointer; border:2px solid transparent; }
    .sito-media-item.selected { border-color:#0E5A7A; }
    .sito-media-item img { width:100%;height:100%;object-fit:cover; }
    .sito-media-item video { width:100%;height:100%;object-fit:cover; }
    .sito-media-check { position:absolute;top:4px;right:4px;background:#0E5A7A;color:white;border-radius:50%;width:20px;height:20px;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700; }
    .sito-media-item.selected .sito-media-check { display:flex; }
    .sito-publish-btn { width:100%;padding:16px;background:#0E5A7A;color:white;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;transition:opacity .2s;letter-spacing:.3px; }
    .sito-publish-btn:hover { opacity:.9; }
    .sito-publish-btn:disabled { opacity:.6;cursor:not-allowed; }
    .sito-status { margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600; }
    .sito-status.success { background:#f0fdf4;color:#15803d; }
    .sito-status.error { background:#fef2f2;color:#dc2626; }
    .sito-status.loading { background:#f0f9ff;color:#0E5A7A; }
    .sito-preview-btn { padding:10px 20px;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;text-decoration:none;display:inline-block; }
    .sito-preview-btn:hover { border-color:#0E5A7A;color:#0E5A7A; }
    .sito-slug-preview { font-size:12px;color:#94a3b8;margin-top:4px; }
    .sito-sezione-toggle { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9; }
    .sito-sezione-label { font-size:14px;font-weight:600;color:#111827; }
    .sito-toggle { width:42px;height:24px;background:#e5e7eb;border-radius:12px;position:relative;cursor:pointer;transition:background .2s;border:none; }
    .sito-toggle.on { background:#0E5A7A; }
    .sito-toggle::after { content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;background:white;border-radius:50%;transition:transform .2s; }
    .sito-toggle.on::after { transform:translateX(18px); }
  `;
  document.head.appendChild(style);

  container.innerHTML = `
    <div class="sito-wrap">
      <div class="sito-header">
        <div class="sito-title">🌐 Sito Web</div>
        <div style="display:flex;gap:8px;">
          <a id="btn-preview" class="sito-preview-btn" target="_blank">👁 Anteprima</a>
          <button id="btn-pubblica" class="sito-publish-btn" style="width:auto;padding:10px 24px;font-size:14px;">🚀 Pubblica</button>
        </div>
      </div>

      <div class="sito-tabs">
        <button class="sito-tab active" data-tab="contenuti">✏️ Contenuti</button>
        <button class="sito-tab" data-tab="foto">📸 Foto & Video</button>
        <button class="sito-tab" data-tab="sezioni">📋 Sezioni</button>
        <button class="sito-tab" data-tab="pubblica">🚀 Pubblica</button>
      </div>

      <!-- TAB CONTENUTI -->
      <div class="sito-panel active" id="panel-contenuti">
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🏷️ Identità</div>
          <div class="sito-field">
            <label class="sito-label">Nome visualizzato</label>
            <input id="sito-nome" class="sito-input" placeholder="Es. Trattoria dell'Aquila">
          </div>
          <div class="sito-field">
            <label class="sito-label">Slug URL <span style="color:#94a3b8;font-weight:400;">(solo lettere minuscole e trattini)</span></label>
            <input id="sito-slug" class="sito-input" placeholder="es. trattoria-aquila">
            <div class="sito-slug-preview" id="slug-preview"></div>
          </div>
        </div>

        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🦸 Hero</div>
          <div class="sito-field">
            <label class="sito-label">Titolo principale</label>
            <input id="sito-hero-titolo" class="sito-input" placeholder="Es. Il posto giusto dove fermarsi">
          </div>
          <div class="sito-field">
            <label class="sito-label">Sottotitolo</label>
            <input id="sito-hero-sub" class="sito-input" placeholder="Es. Cucina di territorio · Orte (VT)">
          </div>
        </div>

        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📖 Chi siamo</div>
          <div class="sito-field">
            <label class="sito-label">Testo paragrafo 1</label>
            <textarea id="sito-chisiamo-1" class="sito-textarea" placeholder="Descrizione del locale..."></textarea>
          </div>
          <div class="sito-field">
            <label class="sito-label">Testo paragrafo 2</label>
            <textarea id="sito-chisiamo-2" class="sito-textarea" placeholder="Storia, valori, filosofia..."></textarea>
          </div>
        </div>

        <div class="sito-card" id="card-mare">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🐟 Filosofia mare <span style="font-size:11px;font-weight:400;color:#94a3b8;">(sezione opzionale)</span></div>
          <div class="sito-field">
            <label class="sito-label">Citazione</label>
            <textarea id="sito-mare-quote" class="sito-textarea" style="min-height:60px;" placeholder="Es. Per noi il mare non è una specialità da aggiungere al menu..."></textarea>
          </div>
          <div class="sito-field">
            <label class="sito-label">Testo</label>
            <textarea id="sito-mare-testo" class="sito-textarea" placeholder="Approfondisci la filosofia..."></textarea>
          </div>
        </div>

        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📍 Contatti</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="sito-field">
              <label class="sito-label">Telefono</label>
              <input id="sito-telefono" class="sito-input" placeholder="0761 402673">
            </div>
            <div class="sito-field">
              <label class="sito-label">Email</label>
              <input id="sito-email" class="sito-input" placeholder="info@...">
            </div>
            <div class="sito-field">
              <label class="sito-label">Indirizzo</label>
              <input id="sito-indirizzo" class="sito-input" placeholder="Via Lazio 4, Orte (VT)">
            </div>
            <div class="sito-field">
              <label class="sito-label">Orari pranzo</label>
              <input id="sito-orari-pranzo" class="sito-input" placeholder="12:30 – 14:30">
            </div>
            <div class="sito-field">
              <label class="sito-label">Orari cena</label>
              <input id="sito-orari-cena" class="sito-input" placeholder="19:30 – 22:30">
            </div>
            <div class="sito-field">
              <label class="sito-label">P.IVA</label>
              <input id="sito-piva" class="sito-input" placeholder="02456030564">
            </div>
          </div>
        </div>
      </div>

      <!-- TAB FOTO -->
      <div class="sito-panel" id="panel-foto">
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🖼️ Foto hero (cover)</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Seleziona dalla Media Library</div>
          <div class="sito-media-grid" id="grid-cover"></div>
        </div>
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🎬 Reel cucina di terra</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Seleziona un video</div>
          <div class="sito-media-grid" id="grid-reel-terra"></div>
        </div>
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🐟 Reel cucina di mare</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Seleziona un video</div>
          <div class="sito-media-grid" id="grid-reel-mare"></div>
        </div>
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🏠 Foto Il Locale</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Seleziona 1-3 foto</div>
          <div class="sito-media-grid" id="grid-locale"></div>
        </div>
      </div>

      <!-- TAB SEZIONI -->
      <div class="sito-panel" id="panel-sezioni">
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">Sezioni visibili sul sito</div>
          <div id="sezioni-list"></div>
        </div>
      </div>

      <!-- TAB PUBBLICA -->
      <div class="sito-panel" id="panel-pubblica">
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px;">🚀 Pubblica il sito</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Il sito verrà aggiornato su GitHub Pages entro 1-2 minuti dalla pubblicazione.</div>
          <div id="sito-url-box" style="background:#f8fafc;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">URL SITO</div>
            <div id="sito-url-display" style="font-size:14px;font-weight:600;color:#0E5A7A;word-break:break-all;"></div>
          </div>
          <button id="btn-pubblica-main" class="sito-publish-btn">🚀 Pubblica ora</button>
          <div id="pubblica-status" style="display:none;" class="sito-status"></div>
        </div>
        <div class="sito-card">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px;">📋 Checklist pre-pubblicazione</div>
          <div id="checklist" style="display:flex;flex-direction:column;gap:8px;"></div>
        </div>
      </div>
    </div>
  `;

  // ── TABS ────────────────────────────────────────────────────
  container.querySelectorAll(".sito-tab").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll(".sito-tab").forEach(b => b.classList.remove("active"));
      container.querySelectorAll(".sito-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      container.querySelector(`#panel-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "foto") caricaMedia();
      if (btn.dataset.tab === "pubblica") aggiornaChecklist();
    };
  });

  // ── SLUG AUTO ───────────────────────────────────────────────
  document.getElementById("sito-slug").addEventListener("input", function() {
    const slug = this.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    this.value = slug;
    document.getElementById("slug-preview").textContent =
      slug ? `https://ristomanager-it.github.io/siti-clienti/${slug}/` : "";
    document.getElementById("sito-url-display").textContent =
      slug ? `https://ristomanager-it.github.io/siti-clienti/${slug}/` : "—";
    document.getElementById("btn-preview").href =
      slug ? `https://ristomanager-it.github.io/siti-clienti/${slug}/` : "#";
  });

  // ── SEZIONI ─────────────────────────────────────────────────
  const SEZIONI = [
    { id: "hero",       label: "🦸 Hero con foto",         default: true  },
    { id: "cucina",     label: "🍽️ La nostra cucina",      default: true  },
    { id: "reel",       label: "🎬 Video reel",             default: true  },
    { id: "mare",       label: "🐟 Filosofia mare",         default: true  },
    { id: "menu",       label: "📋 Menu digitale",          default: true  },
    { id: "locale",     label: "🏠 Il locale",              default: true  },
    { id: "recensioni", label: "⭐ Recensioni",             default: true  },
    { id: "mappa",      label: "📍 Come raggiungerci",      default: true  },
  ];
  const sezioniState = {};
  SEZIONI.forEach(s => sezioniState[s.id] = s.default);

  const sezioniList = document.getElementById("sezioni-list");
  sezioniList.innerHTML = SEZIONI.map(s => `
    <div class="sito-sezione-toggle">
      <div class="sito-sezione-label">${s.label}</div>
      <button class="sito-toggle ${s.default ? 'on' : ''}" data-sezione="${s.id}"></button>
    </div>
  `).join("");
  sezioniList.querySelectorAll(".sito-toggle").forEach(btn => {
    btn.onclick = () => {
      btn.classList.toggle("on");
      sezioniState[btn.dataset.sezione] = btn.classList.contains("on");
      if (btn.dataset.sezione === "mare") {
        document.getElementById("card-mare").style.display = btn.classList.contains("on") ? "" : "none";
      }
    };
  });

  // ── FOTO SELEZIONE ──────────────────────────────────────────
  const fotoSel = { cover: null, reelTerra: null, reelMare: null, locale: [] };

  async function caricaMedia() {
    if (!aziendaId) return;
    const { data } = await sc.from("media_library")
      .select("*").eq("azienda_id", aziendaId).order("created_at", { ascending: false });
    const media = data || [];
    const immagini = media.filter(m => m.tipo === "immagine");
    const video    = media.filter(m => m.tipo === "video");

    renderGrigliaSel("grid-cover", immagini, "cover", false);
    renderGrigliaSel("grid-reel-terra", video, "reelTerra", false);
    renderGrigliaSel("grid-reel-mare", video, "reelMare", false);
    renderGrigliaSel("grid-locale", immagini, "locale", true);
  }

  function renderGrigliaSel(gridId, media, key, multi) {
    const grid = document.getElementById(gridId);
    if (!media.length) { grid.innerHTML = `<div style="color:#94a3b8;font-size:13px;grid-column:1/-1;">Nessun media — carica dalla Media Library</div>`; return; }
    grid.innerHTML = media.map(m => {
      const isVideo = m.tipo === "video";
      return `<div class="sito-media-item" data-id="${m.id}" data-url="${m.url}" data-key="${key}">
        ${isVideo ? `<video src="${m.url}" muted preload="metadata"></video>` : `<img src="${m.url}" alt="${m.nome}" loading="lazy">`}
        <div class="sito-media-check">✓</div>
      </div>`;
    }).join("");
    grid.querySelectorAll(".sito-media-item").forEach(el => {
      el.onclick = () => {
        if (multi) {
          el.classList.toggle("selected");
          if (el.classList.contains("selected")) fotoSel[key].push(el.dataset.url);
          else fotoSel[key] = fotoSel[key].filter(u => u !== el.dataset.url);
        } else {
          grid.querySelectorAll(".sito-media-item").forEach(x => x.classList.remove("selected"));
          el.classList.add("selected");
          fotoSel[key] = el.dataset.url;
        }
      };
    });
  }

  // ── CARICA CONFIG ESISTENTE ──────────────────────────────────
  async function caricaConfig() {
    if (!aziendaId) return;

    // Legge da identità azienda
    const [{ data: az }, { data: identita }, { data: profilo }] = await Promise.all([
      sc.from("aziende").select("nome, telefono, indirizzo, citta").eq("id", aziendaId).maybeSingle(),
      sc.from("azienda_identita").select("*").eq("azienda_id", aziendaId).maybeSingle(),
      sc.from("azienda_profilo_pubblico").select("*").eq("azienda_id", aziendaId).maybeSingle(),
    ]);

    // Legge da sito_config se esiste
    const { data: sitoConf } = await sc.from("sito_config")
      .select("*").eq("azienda_id", aziendaId).maybeSingle();

    // Precompila con dati esistenti
    if (az) {
      document.getElementById("sito-nome").value = az.nome || "";
      document.getElementById("sito-telefono").value = az.telefono || "";
      document.getElementById("sito-indirizzo").value = [az.indirizzo, az.citta].filter(Boolean).join(", ") || "";
    }
    if (profilo) {
      document.getElementById("sito-chisiamo-1").value = profilo.testo_sede || "";
    }

    // Dati specifici sito
    if (sitoConf) {
      if (sitoConf.slug) {
        document.getElementById("sito-slug").value = sitoConf.slug;
        document.getElementById("sito-slug").dispatchEvent(new Event("input"));
      }
      if (sitoConf.hero_titolo) document.getElementById("sito-hero-titolo").value = sitoConf.hero_titolo;
      if (sitoConf.hero_sub) document.getElementById("sito-hero-sub").value = sitoConf.hero_sub;
      if (sitoConf.chisiamo_1) document.getElementById("sito-chisiamo-1").value = sitoConf.chisiamo_1;
      if (sitoConf.chisiamo_2) document.getElementById("sito-chisiamo-2").value = sitoConf.chisiamo_2;
      if (sitoConf.mare_quote) document.getElementById("sito-mare-quote").value = sitoConf.mare_quote;
      if (sitoConf.mare_testo) document.getElementById("sito-mare-testo").value = sitoConf.mare_testo;
      if (sitoConf.orari_pranzo) document.getElementById("sito-orari-pranzo").value = sitoConf.orari_pranzo;
      if (sitoConf.orari_cena) document.getElementById("sito-orari-cena").value = sitoConf.orari_cena;
      if (sitoConf.email) document.getElementById("sito-email").value = sitoConf.email;
      if (sitoConf.piva) document.getElementById("sito-piva").value = sitoConf.piva;
      if (sitoConf.sezioni) Object.assign(sezioniState, sitoConf.sezioni);
    }
  }

  // ── SALVA CONFIG ─────────────────────────────────────────────
  async function salvaConfig() {
    if (!aziendaId) return;
    const conf = leggiForm();
    await sc.from("sito_config").upsert({
      azienda_id: aziendaId,
      ...conf,
      updated_at: new Date().toISOString()
    }, { onConflict: "azienda_id" });
  }

  function leggiForm() {
    return {
      slug:          document.getElementById("sito-slug").value.trim(),
      hero_titolo:   document.getElementById("sito-hero-titolo").value.trim(),
      hero_sub:      document.getElementById("sito-hero-sub").value.trim(),
      chisiamo_1:    document.getElementById("sito-chisiamo-1").value.trim(),
      chisiamo_2:    document.getElementById("sito-chisiamo-2").value.trim(),
      mare_quote:    document.getElementById("sito-mare-quote").value.trim(),
      mare_testo:    document.getElementById("sito-mare-testo").value.trim(),
      telefono:      document.getElementById("sito-telefono").value.trim(),
      email:         document.getElementById("sito-email").value.trim(),
      indirizzo:     document.getElementById("sito-indirizzo").value.trim(),
      orari_pranzo:  document.getElementById("sito-orari-pranzo").value.trim(),
      orari_cena:    document.getElementById("sito-orari-cena").value.trim(),
      piva:          document.getElementById("sito-piva").value.trim(),
      nome:          document.getElementById("sito-nome").value.trim(),
      foto_cover:    fotoSel.cover,
      foto_reel_terra: fotoSel.reelTerra,
      foto_reel_mare:  fotoSel.reelMare,
      foto_locale:   fotoSel.locale,
      sezioni:       sezioniState,
    };
  }

  // ── CHECKLIST ───────────────────────────────────────────────
  function aggiornaChecklist() {
    const conf = leggiForm();
    const checks = [
      { label: "Slug URL",        ok: !!conf.slug },
      { label: "Titolo hero",     ok: !!conf.hero_titolo },
      { label: "Chi siamo",       ok: !!conf.chisiamo_1 },
      { label: "Telefono",        ok: !!conf.telefono },
      { label: "Indirizzo",       ok: !!conf.indirizzo },
      { label: "Foto cover",      ok: !!conf.foto_cover },
    ];
    document.getElementById("checklist").innerHTML = checks.map(c =>
      `<div style="display:flex;align-items:center;gap:8px;font-size:13px;">
        <span style="color:${c.ok ? '#15803d' : '#dc2626'};font-size:16px;">${c.ok ? '✅' : '⭕'}</span>
        <span style="color:${c.ok ? '#374151' : '#94a3b8'}">${c.label}</span>
      </div>`
    ).join("");
  }

  // ── GENERA HTML SITO ────────────────────────────────────────
  async function generaHTML(conf) {
    // Carica menu da Supabase
    let menuHTML = "";
    const { data: menuVoci } = await sc.from("menu_voci")
      .select("id, nome, descrizione, prezzo, categoria_id, disponibile")
      .eq("azienda_id", aziendaId).eq("disponibile", true).order("ordine").limit(50);
    const { data: menuCats } = await sc.from("menu_categorie")
      .select("id, nome").eq("azienda_id", aziendaId).order("ordine").limit(20);

    // Carica logo e colore brand
    const { data: identita } = await sc.from("azienda_identita")
      .select("logo_url, colore_brand, font_family").eq("azienda_id", aziendaId).maybeSingle();
    const logo   = identita?.logo_url || "";
    const colore = identita?.colore_brand || "#B8892A";

    // Form prenotazione
    const { data: form } = await sc.from("booking_forms")
      .select("id").eq("azienda_id", aziendaId).eq("attivo", true).limit(1).maybeSingle();
    const formUrl = form ? `https://app.ristoflow-ai.com/#/prenotazione-online?form_id=${form.id}` : "#";

    const esc = v => String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    const catButtons = (menuCats||[]).map((c,i) =>
      `<button class="menu-cat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`
    ).join("");

    const menuItemsHTML = (menuCats||[]).map(c => `
      <div class="menu-cat" data-cat="${c.id}" style="${menuCats.indexOf(c)>0?'display:none':''}">
        ${(menuVoci||[]).filter(v=>v.categoria_id===c.id).map(v=>`
          <div class="menu-item">
            <div><div class="menu-item-nome">${esc(v.nome)}</div>${v.descrizione?`<div class="menu-item-desc">${esc(v.descrizione)}</div>`:""}</div>
            ${v.prezzo?`<div class="menu-item-prezzo">€ ${Number(v.prezzo).toFixed(2)}</div>`:""}
          </div>`).join("")}
      </div>`).join("");

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(conf.chisiamo_1?.slice(0,150) || conf.hero_sub || '')}">
<meta property="og:title" content="${esc(conf.nome || 'Ristorante')}">
<meta property="og:image" content="${esc(conf.foto_cover || '')}">
<title>${esc(conf.nome || 'Ristorante')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--oro:${colore};--scuro:#1A1209;--caldo:#F5EFE4;--grigio:#6B5E4E}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:#fff;color:var(--scuro);overflow-x:hidden}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:rgba(26,18,9,.88);backdrop-filter:blur(12px)}
.nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
.nav-logo img{width:32px;height:32px;border-radius:50%;object-fit:cover}
.nav-logo span{font-family:'Cormorant Garamond',serif;font-size:15px;color:var(--oro)}
.nav-links{display:flex;gap:20px}
.nav-links a{font-size:12px;color:rgba(255,255,255,.7);text-decoration:none;letter-spacing:.5px}
.nav-links a:hover{color:var(--oro)}
.nav-cta{background:var(--oro);color:var(--scuro);font-size:12px;font-weight:700;padding:8px 18px;border-radius:6px;text-decoration:none}
@media(max-width:600px){.nav-links{display:none}}
.hero{position:relative;height:100svh;min-height:580px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:80px;text-align:center;overflow:hidden}
.hero-bg{position:absolute;inset:0}
${conf.foto_cover ? `.hero-bg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}` : `.hero-bg{background:var(--scuro)}`}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%)}
.hero-content{position:relative;z-index:2;padding:0 20px}
.hero-eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--oro);margin-bottom:14px}
.hero-title{font-family:'Cormorant Garamond',serif;font-size:clamp(38px,8vw,72px);color:#fff;font-weight:600;line-height:1.05;margin-bottom:18px}
.hero-title em{font-style:italic;color:var(--oro)}
.hero-sub{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:32px;line-height:1.6}
.hero-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn-oro{background:var(--oro);color:var(--scuro);font-weight:700;font-size:13px;padding:13px 28px;border-radius:6px;text-decoration:none;letter-spacing:.4px}
.btn-ghost{background:transparent;color:#fff;font-size:13px;padding:13px 28px;border-radius:6px;border:1.5px solid rgba(255,255,255,.35);text-decoration:none}
.cta-bar{position:sticky;bottom:0;z-index:90;display:flex;background:var(--scuro);border-top:1px solid rgba(184,137,42,.3)}
.cta-bar a{flex:1;padding:15px 8px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.5px;text-decoration:none;transition:background .2s}
.cta-prenota{background:var(--oro);color:var(--scuro)}
.cta-chiama{background:#1e3a14;color:#7ed370}
.cta-menu-btn{background:#1e1e1e;color:rgba(255,255,255,.8)}
section{padding:72px 20px;max-width:680px;margin:0 auto}
.eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--oro);margin-bottom:10px;font-weight:600}
.section-title{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,5vw,44px);font-weight:600;line-height:1.1;margin-bottom:18px}
.section-title em{font-style:italic;color:var(--oro)}
.section-body{font-size:14px;color:var(--grigio);line-height:1.85}
.section-body p+p{margin-top:12px}
.reel-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px}
@media(max-width:500px){.reel-grid{grid-template-columns:1fr}}
.reel-item{position:relative;aspect-ratio:9/16;overflow:hidden;background:var(--scuro)}
.reel-item video,.reel-item img{width:100%;height:100%;object-fit:cover}
.reel-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(26,18,9,.75) 0%,transparent 50%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
.reel-label{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#fff;margin-bottom:3px}
.reel-sub{font-size:10px;letter-spacing:2px;color:var(--oro);text-transform:uppercase}
.mare-section{background:var(--scuro);color:#fff}
.mare-inner{max-width:680px;margin:0 auto;padding:72px 20px}
.mare-quote{font-family:'Cormorant Garamond',serif;font-size:clamp(20px,4vw,34px);font-style:italic;line-height:1.4;margin-bottom:28px;border-left:2px solid var(--oro);padding-left:20px}
.mare-body{font-size:14px;color:rgba(255,255,255,.65);line-height:1.9}
.menu-section{background:var(--caldo)}
.menu-inner{max-width:680px;margin:0 auto;padding:72px 20px}
.menu-cats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:24px}
.menu-cat-btn{padding:6px 14px;border-radius:20px;border:1.5px solid #c9b89a;background:transparent;font-size:12px;color:var(--grigio);cursor:pointer;font-family:inherit}
.menu-cat-btn.active{background:var(--oro);border-color:var(--oro);color:var(--scuro);font-weight:700}
.menu-item{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;border-bottom:1px solid #d8ccba;gap:14px}
.menu-item:last-child{border-bottom:none}
.menu-item-nome{font-size:14px;color:var(--scuro);font-weight:500}
.menu-item-desc{font-size:11px;color:var(--grigio);margin-top:2px;line-height:1.4}
.menu-item-prezzo{font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--oro);font-weight:600;white-space:nowrap}
.locale-img{width:100%;height:280px;object-fit:cover;display:block}
.review-card{background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.review-text{font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;color:var(--scuro);line-height:1.6;margin-bottom:10px}
.stars{color:var(--oro);letter-spacing:2px;margin-bottom:6px;font-size:13px}
.map-section{background:var(--scuro);color:#fff}
.map-inner{max-width:680px;margin:0 auto;padding:72px 20px}
.map-infos{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
@media(max-width:480px){.map-infos{grid-template-columns:1fr}}
.map-info-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--oro);margin-bottom:3px}
.map-info-value{font-size:13px;color:rgba(255,255,255,.8);line-height:1.5}
.map-info-value a{color:var(--oro);text-decoration:none}
footer{background:#0e0a04;padding:36px 20px;text-align:center}
.footer-logo{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--oro);margin-bottom:10px;font-style:italic}
.footer-links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
.footer-links a{font-size:11px;color:rgba(255,255,255,.35);text-decoration:none}
.footer-copy{font-size:10px;color:rgba(255,255,255,.2)}
</style>
</head>
<body>
<nav class="nav">
  <a class="nav-logo" href="#">
    ${logo ? `<img src="${esc(logo)}" alt="Logo">` : ""}
    <span>${esc(conf.nome)}</span>
  </a>
  <div class="nav-links">
    <a href="#cucina">La cucina</a>
    ${sezioniState.mare ? '<a href="#mare">Il mare</a>' : ""}
    ${sezioniState.menu ? '<a href="#menu">Menu</a>' : ""}
    <a href="#contatti">Contatti</a>
  </div>
  <a class="nav-cta" href="${esc(formUrl)}">Prenota</a>
</nav>

${sezioniState.hero ? `
<div class="hero">
  <div class="hero-bg">${conf.foto_cover ? `<img src="${esc(conf.foto_cover)}" alt="Cover">` : ""}</div>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-eyebrow">Orte · A1 · Parcheggio gratuito</div>
    <h1 class="hero-title">${esc(conf.hero_titolo||conf.nome||"").replace(/\n/g,"<br>")}</h1>
    ${conf.hero_sub ? `<p class="hero-sub">${esc(conf.hero_sub)}</p>` : ""}
    <div class="hero-btns">
      <a class="btn-oro" href="${esc(formUrl)}">Prenota un tavolo</a>
      ${conf.telefono ? `<a class="btn-ghost" href="tel:${esc(conf.telefono)}">📞 ${esc(conf.telefono)}</a>` : ""}
    </div>
  </div>
</div>` : ""}

<div class="cta-bar">
  <a class="cta-prenota" href="${esc(formUrl)}">🗓 Prenota</a>
  ${conf.telefono ? `<a class="cta-chiama" href="tel:${esc(conf.telefono)}">📞 Chiama</a>` : ""}
  ${sezioniState.menu ? '<a class="cta-menu-btn" href="#menu">📋 Menu</a>' : ""}
</div>

${sezioniState.cucina ? `
<section id="cucina">
  <div class="eyebrow">La nostra cucina</div>
  <h2 class="section-title">Terra e mare,<br><em>scelti ogni giorno</em></h2>
  <div class="section-body">
    ${conf.chisiamo_1 ? `<p>${esc(conf.chisiamo_1)}</p>` : ""}
    ${conf.chisiamo_2 ? `<p>${esc(conf.chisiamo_2)}</p>` : ""}
  </div>
</section>` : ""}

${sezioniState.reel && (conf.foto_reel_terra || conf.foto_reel_mare) ? `
<div class="reel-grid">
  ${conf.foto_reel_terra ? `<div class="reel-item"><video src="${esc(conf.foto_reel_terra)}" autoplay muted loop playsinline></video><div class="reel-overlay"><div class="reel-label">I primi di terra</div><div class="reel-sub">Tradizione · Territorio</div></div></div>` : ""}
  ${conf.foto_reel_mare ? `<div class="reel-item"><video src="${esc(conf.foto_reel_mare)}" autoplay muted loop playsinline></video><div class="reel-overlay"><div class="reel-label">Il nostro mare</div><div class="reel-sub">Scelto ogni mattina</div></div></div>` : ""}
</div>` : ""}

${sezioniState.mare && conf.mare_quote ? `
<div class="mare-section" id="mare">
  <div class="mare-inner">
    <div class="eyebrow" style="color:var(--oro)">Il mare</div>
    <blockquote class="mare-quote">${esc(conf.mare_quote)}</blockquote>
    ${conf.mare_testo ? `<div class="mare-body"><p>${esc(conf.mare_testo)}</p></div>` : ""}
  </div>
</div>` : ""}

${sezioniState.menu ? `
<div class="menu-section" id="menu">
  <div class="menu-inner">
    <div class="eyebrow">Menu</div>
    <h2 class="section-title" style="margin-bottom:24px;">Cosa portiamo<br><em>in tavola</em></h2>
    <div class="menu-cats">${catButtons}</div>
    <div id="menu-items">${menuItemsHTML}</div>
  </div>
</div>` : ""}

${sezioniState.locale ? `
<div id="locale">
  ${conf.foto_locale?.[0] ? `<img class="locale-img" src="${esc(conf.foto_locale[0])}" alt="Il locale" loading="lazy">` : ""}
  <section>
    <div class="eyebrow">Il locale</div>
    <h2 class="section-title">All'interno<br><em>dell'Hotel Aquila</em></h2>
    <div class="section-body"><p>All'interno dell'Hotel Aquila, a pochi metri dall'uscita A1 di Orte, con parcheggio gratuito e un ambiente tranquillo.</p></div>
    <a href="https://maps.google.com/?q=${encodeURIComponent(conf.indirizzo||'')}" target="_blank" style="display:inline-block;margin-top:20px;padding:11px 24px;background:var(--oro);color:var(--scuro);border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;">📍 Apri in Google Maps</a>
  </section>
</div>` : ""}

${sezioniState.recensioni ? `
<section style="background:var(--caldo);max-width:100%;padding:72px 20px;">
  <div style="max-width:680px;margin:0 auto;">
    <div class="eyebrow">Dicono di noi</div>
    <h2 class="section-title" style="margin-bottom:28px;">L'opinione<br><em>dei nostri ospiti</em></h2>
    <div class="review-card"><div class="stars">★★★★★</div><div class="review-text">"Cucina tradizionale curata e servizio rapido. Una sosta ideale per chi viaggia."</div><div style="font-size:12px;color:var(--grigio)"><strong>Marco R.</strong> · lavoro</div></div>
    <div class="review-card"><div class="stars">★★★★★</div><div class="review-text">"Il pesce era freschissimo, si sentiva. Torneremo sicuramente."</div><div style="font-size:12px;color:var(--grigio)"><strong>Laura M.</strong> · famiglia</div></div>
  </div>
</section>` : ""}

${sezioniState.mappa ? `
<div class="map-section" id="contatti">
  <div class="map-inner">
    <div class="eyebrow" style="color:var(--oro)">Come raggiungerci</div>
    <h2 class="section-title" style="color:#fff;">A pochi minuti<br><em>dall'autostrada</em></h2>
    <iframe style="width:100%;height:200px;border-radius:12px;border:none;margin:20px 0;opacity:.8" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2954.5!2d12.3857!3d42.4597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0!2zNDLCsDI3JzM0LjkiTiAxMsKwMjMnMDguNSJF!5e0!3m2!1sit!2sit!4v1" allowfullscreen loading="lazy"></iframe>
    <div class="map-infos">
      ${conf.indirizzo ? `<div><div class="map-info-label">Indirizzo</div><div class="map-info-value">${esc(conf.indirizzo)}</div></div>` : ""}
      <div><div class="map-info-label">Orari</div><div class="map-info-value">${conf.orari_pranzo ? `Pranzo: ${esc(conf.orari_pranzo)}<br>` : ""}${conf.orari_cena ? `Cena: ${esc(conf.orari_cena)}` : ""}</div></div>
      ${conf.telefono ? `<div><div class="map-info-label">Telefono</div><div class="map-info-value"><a href="tel:${esc(conf.telefono)}">${esc(conf.telefono)}</a></div></div>` : ""}
      ${conf.email ? `<div><div class="map-info-label">Email</div><div class="map-info-value"><a href="mailto:${esc(conf.email)}">${esc(conf.email)}</a></div></div>` : ""}
    </div>
    <div style="display:flex;gap:10px;margin-top:28px;flex-wrap:wrap;">
      <a href="${esc(formUrl)}" style="flex:1;min-width:180px;background:var(--oro);color:var(--scuro);padding:13px 20px;border-radius:6px;text-align:center;text-decoration:none;font-weight:700;font-size:13px;">🗓 Prenota un tavolo</a>
      ${conf.telefono ? `<a href="tel:${esc(conf.telefono)}" style="flex:1;min-width:180px;background:transparent;color:#fff;padding:13px 20px;border-radius:6px;text-align:center;text-decoration:none;font-weight:600;font-size:13px;border:1.5px solid rgba(255,255,255,.3);">📞 Chiama ora</a>` : ""}
    </div>
  </div>
</div>` : ""}

<footer>
  <div class="footer-logo">${esc(conf.nome)}</div>
  <div class="footer-links">
    <a href="#cucina">La cucina</a>
    ${sezioniState.menu ? '<a href="#menu">Menu</a>' : ""}
    <a href="#contatti">Contatti</a>
    <a href="${esc(formUrl)}">Prenota</a>
  </div>
  <div class="footer-copy">© ${new Date().getFullYear()} ${esc(conf.nome)}${conf.piva ? ` — P.IVA ${esc(conf.piva)}` : ""}</div>
</footer>

<script>
function filtraMenu(catId, btn) {
  document.querySelectorAll('.menu-cat').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.menu-cat-btn').forEach(b => b.classList.remove('active'));
  const cat = document.querySelector('.menu-cat[data-cat="' + catId + '"]');
  if (cat) cat.style.display = '';
  if (btn) btn.classList.add('active');
}
</script>
</body>
</html>`;
  }

  // ── PUBBLICA SU GITHUB via Edge Function ────────────────────
  async function pubblicaSuGithub(conf) {
    const slug = conf.slug;
    if (!slug) throw new Error("Slug mancante");

    const html = await generaHTML(conf);

    const res = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/github-deploy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0"
      },
      body: JSON.stringify({ html, slug, nome: conf.nome })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Errore pubblicazione");
    return data.url;
  }

  // ── HANDLER PUBBLICA ────────────────────────────────────────
  async function handlePubblica() {
    const statusEl = document.getElementById("pubblica-status");
    const btn = document.getElementById("btn-pubblica-main");
    const btnTop = document.getElementById("btn-pubblica");

    statusEl.style.display = "";
    statusEl.className = "sito-status loading";
    statusEl.textContent = "⏳ Salvataggio configurazione...";
    btn.disabled = true; btnTop.disabled = true;

    try {
      await salvaConfig();
      statusEl.textContent = "⏳ Generazione HTML...";
      const conf = leggiForm();

      statusEl.textContent = "⏳ Pubblicazione su GitHub Pages...";
      const url = await pubblicaSuGithub(conf);

      statusEl.className = "sito-status success";
      statusEl.innerHTML = `✅ Sito pubblicato!<br><a href="${url}" target="_blank" style="color:#0E5A7A;">${url}</a><br><span style="font-size:11px;color:#64748b;">Potrebbe volerci 1-2 minuti prima che le modifiche siano visibili.</span>`;
    } catch (e) {
      statusEl.className = "sito-status error";
      statusEl.textContent = "❌ Errore: " + e.message;
    } finally {
      btn.disabled = false; btnTop.disabled = false;
    }
  }

  document.getElementById("btn-pubblica-main").onclick = handlePubblica;
  document.getElementById("btn-pubblica").onclick = () => {
    container.querySelector('[data-tab="pubblica"]').click();
    handlePubblica();
  };

  // ── INIT ─────────────────────────────────────────────────────
  await caricaConfig();
}
