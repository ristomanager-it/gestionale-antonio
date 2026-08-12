// ============================================================
//  bo-sito.js v4 — CLEAN REWRITE
// ============================================================

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";
const GITHUB_OWNER = "ristomanager-it";
const GITHUB_REPO  = "siti-clienti";

export async function render(container) {
  const sc = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id || window.state?.aziendaId;

  // ── STATO ───────────────────────────────────────────────────
  let sedeSelezionata = null;
  let _identita = null;
  const fotoSel = { cover: null, reelTerra: null, reelMare: null, locale: [] };
  const SEZIONI = [
    { id:"hero",       label:"🦸 Hero",              def:true  },
    { id:"highlights", label:"✨ Highlights",         def:true  },
    { id:"cucina",     label:"🍽️ La nostra cucina",  def:true  },
    { id:"reel",       label:"🎬 Video reel",         def:true  },
    { id:"mare",       label:"🐟 Filosofia mare",     def:false },
    { id:"menu",       label:"📋 Menu digitale",      def:true  },
    { id:"locale",     label:"🏠 Il locale",          def:true  },
    { id:"recensioni", label:"⭐ Recensioni",         def:true  },
    { id:"mappa",      label:"📍 Come raggiungerci",  def:true  },
  ];
  const sezioniState = {};
  SEZIONI.forEach(s => sezioniState[s.id] = s.def);

  // ── CSS ─────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .sw{padding:16px;max-width:820px}
    .sw-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
    .sw-title{font-size:18px;font-weight:800;color:#111827}
    .sw-tabs{display:flex;gap:2px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:20px;flex-wrap:wrap}
    .sw-tab{padding:8px 16px;border-radius:8px;border:none;background:transparent;font-size:13px;font-weight:600;color:#64748b;cursor:pointer}
    .sw-tab.active{background:white;color:#0E5A7A;box-shadow:0 1px 4px rgba(0,0,0,.1)}
    .sw-panel{display:none}
    .sw-panel.active{display:block}
    .sw-card{background:white;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .sw-label{font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
    .sw-input{width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit}
    .sw-input:focus{border-color:#0E5A7A}
    .sw-textarea{width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;resize:vertical;min-height:90px;font-family:inherit;line-height:1.6}
    .sw-textarea:focus{border-color:#0E5A7A}
    .sw-field{margin-bottom:14px}
    .sw-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    @media(max-width:500px){.sw-field-row{grid-template-columns:1fr}}
    .sw-tony-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer}
    .sw-tony-btn:hover{opacity:.9}
    .sw-tony-btn:disabled{opacity:.5;cursor:not-allowed}
    .sw-pub-btn{width:100%;padding:16px;background:#0E5A7A;color:white;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer}
    .sw-pub-btn:hover{opacity:.9}
    .sw-pub-btn:disabled{opacity:.6;cursor:not-allowed}
    .sw-status{margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600}
    .sw-status.success{background:#f0fdf4;color:#15803d}
    .sw-status.error{background:#fef2f2;color:#dc2626}
    .sw-status.loading{background:#f0f9ff;color:#0E5A7A}
    .sw-media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:8px}
    .sw-media-item{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent}
    .sw-media-item.selected{border-color:#0E5A7A}
    .sw-media-item img,.sw-media-item video{width:100%;height:100%;object-fit:cover}
    .sw-media-check{position:absolute;top:4px;right:4px;background:#0E5A7A;color:white;border-radius:50%;width:20px;height:20px;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700}
    .sw-media-item.selected .sw-media-check{display:flex}
    .sw-toggle{width:42px;height:24px;background:#e5e7eb;border-radius:12px;position:relative;cursor:pointer;border:none;flex-shrink:0}
    .sw-toggle.on{background:#0E5A7A}
    .sw-toggle::after{content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;background:white;border-radius:50%;transition:transform .2s}
    .sw-toggle.on::after{transform:translateX(18px)}
    .sw-sezione-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .sw-checklist-item{display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0}
    .sw-sede-btn{padding:7px 16px;border-radius:20px;border:1.5px solid #e5e7eb;background:white;font-size:13px;font-weight:600;color:#64748b;cursor:pointer}
    .sw-sede-btn.active{background:#0E5A7A;border-color:#0E5A7A;color:white}
    .sw-save-btn{padding:10px 20px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;color:#15803d}
    .sw-save-btn:hover{background:#dcfce7}
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────
  container.innerHTML = `
  <div class="sw">
    <div class="sw-header">
      <div class="sw-title">🌐 Sito Web</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="sw-btn-preview" style="padding:10px 16px;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">👁 Anteprima</button>
        <button id="sw-btn-salva" class="sw-save-btn">💾 Salva bozza</button>
        <button id="sw-btn-tony-all" class="sw-tony-btn">✨ Tony genera</button>
        <button id="sw-btn-pubblica" class="sw-pub-btn" style="width:auto;padding:10px 24px;font-size:14px;">🚀 Pubblica</button>
      </div>
    </div>

    <!-- SEDI -->
    <div id="sw-sedi-wrap" style="display:none;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Sede</div>
      <div id="sw-sedi-bar" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
    </div>

    <div class="sw-tabs">
      <button class="sw-tab active" data-tab="contenuti">✏️ Contenuti</button>
      <button class="sw-tab" data-tab="foto">📸 Media</button>
      <button class="sw-tab" data-tab="sezioni">📋 Sezioni</button>
      <button class="sw-tab" data-tab="pubblica">🚀 Pubblica</button>
    </div>

    <!-- TAB CONTENUTI -->
    <div class="sw-panel active" id="panel-contenuti">

      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🏷️ Identità sito</div>
        <div class="sw-field-row">
          <div class="sw-field">
            <label class="sw-label">Nome visualizzato *</label>
            <input id="sw-nome" class="sw-input" placeholder="Trattoria dell'Aquila">
          </div>
          <div class="sw-field">
            <label class="sw-label">Slug URL *</label>
            <input id="sw-slug" class="sw-input" placeholder="trattoria-aquila">
            <div id="sw-slug-preview" style="font-size:11px;color:#94a3b8;margin-top:4px;"></div>
          </div>
        </div>
        <div class="sw-field">
          <label class="sw-label">Dominio personalizzato <span style="color:#94a3b8;font-weight:400;">(opzionale)</span></label>
          <input id="sw-dominio" class="sw-input" placeholder="trattoriadellaquila.it">
        </div>
      </div>

      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🗓️ Link prenotazione</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:10px;">Incolla il link del form dal Booking Builder (il link del QR code).</div>
        <div class="sw-field">
          <label class="sw-label">Link form prenotazione</label>
          <input id="sw-form-link" class="sw-input" placeholder="https://app.ristoflow-ai.com/#/booking/social">
        </div>
      </div>

      <div class="sw-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;">🦸 Hero</div>
          <button class="sw-tony-btn" data-tony="hero">✨ Tony</button>
        </div>
        <div class="sw-field">
          <label class="sw-label">Titolo principale</label>
          <input id="sw-hero-titolo" class="sw-input" placeholder="Il posto giusto dove fermarsi">
        </div>
        <div class="sw-field">
          <label class="sw-label">Sottotitolo</label>
          <input id="sw-hero-sub" class="sw-input" placeholder="Cucina di territorio · Orte (VT)">
        </div>
        <div class="sw-field">
          <label class="sw-label">Testo CTA</label>
          <input id="sw-hero-cta" class="sw-input" placeholder="Prenota un tavolo" value="Prenota un tavolo">
        </div>
      </div>

      <div class="sw-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;">✨ Highlights</div>
          <button class="sw-tony-btn" data-tony="highlights">✨ Tony</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
          <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:center;">
            <span style="font-size:18px;">📍</span>
            <input id="sw-hl1-t" class="sw-input" placeholder="Titolo" value="A pochi passi dall'A1">
            <input id="sw-hl1-d" class="sw-input" placeholder="Descrizione" value="Uscita Orte · Parcheggio gratuito">
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:center;">
            <span style="font-size:18px;">🍽️</span>
            <input id="sw-hl2-t" class="sw-input" placeholder="Titolo" value="Cucina di territorio">
            <input id="sw-hl2-d" class="sw-input" placeholder="Descrizione" value="Ingredienti scelti ogni giorno">
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:center;">
            <span style="font-size:18px;">🐟</span>
            <input id="sw-hl3-t" class="sw-input" placeholder="Titolo" value="Il mare, ogni giorno">
            <input id="sw-hl3-d" class="sw-input" placeholder="Descrizione" value="Dal mercato ittico direttamente in tavola">
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;">📖 Chi siamo</div>
          <button class="sw-tony-btn" data-tony="chisiamo">✨ Tony</button>
        </div>
        <div class="sw-field">
          <label class="sw-label">Paragrafo 1</label>
          <textarea id="sw-chisiamo-1" class="sw-textarea" placeholder="La storia del locale..."></textarea>
        </div>
        <div class="sw-field">
          <label class="sw-label">Paragrafo 2</label>
          <textarea id="sw-chisiamo-2" class="sw-textarea" placeholder="Filosofia e valori..."></textarea>
        </div>
      </div>

      <div class="sw-card" id="sw-card-mare">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;">🐟 Filosofia mare</div>
          <button class="sw-tony-btn" data-tony="mare">✨ Tony</button>
        </div>
        <div class="sw-field">
          <label class="sw-label">Citazione</label>
          <textarea id="sw-mare-quote" class="sw-textarea" style="min-height:60px;" placeholder="La frase chiave..."></textarea>
        </div>
        <div class="sw-field">
          <label class="sw-label">Testo</label>
          <textarea id="sw-mare-testo" class="sw-textarea" placeholder="Approfondimento..."></textarea>
        </div>
      </div>

      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📍 Contatti</div>
        <div class="sw-field-row">
          <div class="sw-field">
            <label class="sw-label">Telefono</label>
            <input id="sw-telefono" class="sw-input" placeholder="0761 402673">
          </div>
          <div class="sw-field">
            <label class="sw-label">Email</label>
            <input id="sw-email" class="sw-input" placeholder="info@...">
          </div>
          <div class="sw-field">
            <label class="sw-label">Indirizzo</label>
            <input id="sw-indirizzo" class="sw-input" placeholder="Via Lazio 4, Orte (VT)">
          </div>
          <div class="sw-field">
            <label class="sw-label">P.IVA</label>
            <input id="sw-piva" class="sw-input" placeholder="02456030564">
          </div>
          <div class="sw-field">
            <label class="sw-label">Pranzo</label>
            <input id="sw-pranzo" class="sw-input" placeholder="12:30 – 14:30">
          </div>
          <div class="sw-field">
            <label class="sw-label">Cena</label>
            <input id="sw-cena" class="sw-input" placeholder="19:30 – 22:30">
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🎨 Colori e font</div>
        <div class="sw-field-row">
          <div class="sw-field">
            <label class="sw-label">Colore principale (bottoni CTA)</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="sw-colore-btn" value="#794d01" style="width:44px;height:38px;border:none;border-radius:8px;cursor:pointer;padding:2px;">
              <input id="sw-colore-btn-hex" class="sw-input" style="flex:1;" value="#794d01" placeholder="#794d01">
            </div>
          </div>
          <div class="sw-field">
            <label class="sw-label">Colore accenti (testi, titoli)</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="sw-colore-acc" value="#c4892a" style="width:44px;height:38px;border:none;border-radius:8px;cursor:pointer;padding:2px;">
              <input id="sw-colore-acc-hex" class="sw-input" style="flex:1;" value="#c4892a" placeholder="#c4892a">
            </div>
          </div>
        </div>
        <div class="sw-field">
          <label class="sw-label">Font</label>
          <select id="sw-font" class="sw-input">
            <option value="Inter">Inter (moderno, pulito)</option>
            <option value="Cormorant Garamond">Cormorant Garamond (elegante, serif)</option>
            <option value="Playfair Display">Playfair Display (classico, serif)</option>
            <option value="Montserrat">Montserrat (geometrico, sans)</option>
            <option value="Lato">Lato (leggero, sans)</option>
            <option value="Merriweather">Merriweather (editoriale, serif)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- TAB FOTO -->
    <div class="sw-panel" id="panel-foto">
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🖼️ Foto cover (hero)</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">La prima foto che vede il visitatore</div>
        <div class="sw-media-grid" id="grid-cover"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🎬 Video — cucina di terra</div>
        <div class="sw-media-grid" id="grid-reel-terra"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🐟 Video — cucina di mare</div>
        <div class="sw-media-grid" id="grid-reel-mare"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🏠 Foto il locale</div>
        <div class="sw-media-grid" id="grid-locale"></div>
      </div>
    </div>

    <!-- TAB SEZIONI -->
    <div class="sw-panel" id="panel-sezioni">
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">Sezioni visibili in home</div>
        <div id="sw-sezioni-list"></div>
      </div>
    </div>

    <!-- TAB PUBBLICA -->
    <div class="sw-panel" id="panel-pubblica">
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">🌐 URL sito</div>
        <div id="sw-url-display" style="font-size:14px;font-weight:600;color:#0E5A7A;word-break:break-all;background:#f8fafc;padding:12px;border-radius:10px;">—</div>
        <div id="sw-dns-box" style="display:none;background:#f0f9ff;border-radius:10px;padding:12px;margin-top:10px;font-size:12px;color:#0369a1;line-height:1.8;"></div>
      </div>
      <div class="sw-card">
        <button id="sw-btn-pubblica-main" class="sw-pub-btn">🚀 Pubblica ora</button>
        <div id="sw-pub-status" style="display:none;" class="sw-status"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;">📋 Checklist</div>
        <div id="sw-checklist"></div>
      </div>
    </div>
  </div>`;

  // ── TABS ────────────────────────────────────────────────────
  container.querySelectorAll(".sw-tab").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll(".sw-tab").forEach(b => b.classList.remove("active"));
      container.querySelectorAll(".sw-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "foto") caricaMedia();
      if (btn.dataset.tab === "pubblica") aggiornaChecklist();
    };
  });

  // ── SEZIONI ─────────────────────────────────────────────────
  const sezioniList = document.getElementById("sw-sezioni-list");
  sezioniList.innerHTML = SEZIONI.map(s => `
    <div class="sw-sezione-row">
      <span style="font-size:14px;font-weight:600;">${s.label}</span>
      <button class="sw-toggle ${s.def ? 'on' : ''}" data-sezione="${s.id}"></button>
    </div>`).join("");
  sezioniList.querySelectorAll(".sw-toggle").forEach(btn => {
    btn.onclick = () => {
      btn.classList.toggle("on");
      sezioniState[btn.dataset.sezione] = btn.classList.contains("on");
    };
  });

  // ── COLOR PICKER SYNC ───────────────────────────────────────
  const syncPicker = (pickerId, hexId) => {
    const p = document.getElementById(pickerId);
    const h = document.getElementById(hexId);
    p.oninput = () => h.value = p.value;
    h.oninput = () => { if (/^#[0-9a-fA-F]{6}$/.test(h.value)) p.value = h.value; };
  };
  syncPicker("sw-colore-btn", "sw-colore-btn-hex");
  syncPicker("sw-colore-acc", "sw-colore-acc-hex");

  // ── SLUG PREVIEW ────────────────────────────────────────────
  document.getElementById("sw-slug").addEventListener("input", function() {
    const slug = this.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    this.value = slug;
    const url = slug ? `https://ristomanager-it.github.io/siti-clienti/${slug}/` : "—";
    document.getElementById("sw-slug-preview").textContent = slug ? url : "";
    document.getElementById("sw-url-display").textContent = url;
  });

  // ── DNS ─────────────────────────────────────────────────────
  document.getElementById("sw-dominio").addEventListener("input", function() {
    const d = this.value.trim();
    const box = document.getElementById("sw-dns-box");
    if (!d) { box.style.display = "none"; return; }
    box.style.display = "";
    const isApex = d.split(".").length === 2;
    box.innerHTML = isApex
      ? `<strong>Record DNS:</strong><br>A → @ → 185.199.108.153<br>A → @ → 185.199.109.153<br>A → @ → 185.199.110.153<br>A → @ → 185.199.111.153<br>CNAME → www → ristomanager-it.github.io`
      : `<strong>Record DNS:</strong><br>CNAME → ${d.split(".")[0]} → ristomanager-it.github.io`;
  });

  // ── FORM PRENOTAZIONE ───────────────────────────────────────
  async function caricaForms() { return; }

  // ── SEDI ────────────────────────────────────────────────────
  async function caricaSedi() {
    if (!aziendaId) return;
    const { data: sedi } = await sc.from("sedi").select("*").eq("azienda_id", aziendaId).order("nome");
    if (!sedi?.length) return;
    if (sedi.length === 1) {
      sedeSelezionata = sedi[0];
      document.getElementById("sw-sedi-wrap").style.display = "none";
    } else {
      document.getElementById("sw-sedi-wrap").style.display = "";
      const bar = document.getElementById("sw-sedi-bar");
      bar.innerHTML = sedi.map((s, i) =>
        `<button class="sw-sede-btn${i === 0 ? ' active' : ''}" data-id="${s.id}">${s.nome}</button>`
      ).join("");
      bar.querySelectorAll(".sw-sede-btn").forEach(btn => {
        btn.onclick = () => {
          bar.querySelectorAll(".sw-sede-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          sedeSelezionata = sedi.find(s => s.id === btn.dataset.id);
          caricaConfig();
        };
      });
      sedeSelezionata = sedi[0];
    }
  }

  // ── LEGGI FORM ───────────────────────────────────────────────
  function leggiForm() {
    const g = id => document.getElementById(id)?.value?.trim() || "";
    return {
      nome:         g("sw-nome"),
      slug:         g("sw-slug"),
      dominio:      g("sw-dominio") || null,
      form_link:    g("sw-form-link") || null,
      hero_titolo:  g("sw-hero-titolo"),
      hero_sub:     g("sw-hero-sub"),
      hero_cta:     g("sw-hero-cta") || "Prenota un tavolo",
      hl1: { titolo: g("sw-hl1-t"), testo: g("sw-hl1-d") },
      hl2: { titolo: g("sw-hl2-t"), testo: g("sw-hl2-d") },
      hl3: { titolo: g("sw-hl3-t"), testo: g("sw-hl3-d") },
      chisiamo_1:   g("sw-chisiamo-1"),
      chisiamo_2:   g("sw-chisiamo-2"),
      mare_quote:   g("sw-mare-quote"),
      mare_testo:   g("sw-mare-testo"),
      telefono:     g("sw-telefono"),
      email:        g("sw-email"),
      indirizzo:    g("sw-indirizzo"),
      orari_pranzo: g("sw-pranzo"),
      orari_cena:   g("sw-cena"),
      piva:         g("sw-piva"),
      colore_brand:      g("sw-colore-btn-hex") || "#794d01",
      colore_secondario: g("sw-colore-acc-hex") || "#c4892a",
      font_family:  g("sw-font") || "Inter",
      foto_cover:      fotoSel.cover,
      foto_reel_terra: fotoSel.reelTerra,
      foto_reel_mare:  fotoSel.reelMare,
      foto_locale:     fotoSel.locale,
      sezioni:      { ...sezioniState },
    };
  }

  // ── CARICA CONFIG ────────────────────────────────────────────
  async function caricaConfig() {
    if (!aziendaId) return;
    const sedeId = sedeSelezionata?.id || null;

    // Carica tutto in parallelo
    const [{ data: sede }, { data: profilo }, { data: conf }, { data: identita }] = await Promise.all([
      sedeId ? sc.from("sedi").select("nome,telefono,indirizzo,citta,logo_url,cover_url,colore_brand,colore_secondario,lat,lng").eq("id", sedeId).maybeSingle() : Promise.resolve({ data: null }),
      sc.from("azienda_profilo_pubblico").select("telefono,email,indirizzo,citta,testo_sede,testo_orari,google_maps_url,lat,lng").eq("azienda_id", aziendaId).maybeSingle(),
      sedeId
        ? sc.from("sito_config").select("*").eq("azienda_id", aziendaId).eq("sede_id", sedeId).maybeSingle()
        : sc.from("sito_config").select("*").eq("azienda_id", aziendaId).is("sede_id", null).maybeSingle(),
      sc.from("azienda_identita").select("gc_why,gc_how,gc_what,tone_of_voice,posizionamento,cliente_ideale").eq("azienda_id", aziendaId).maybeSingle(),
    ]);

    _identita = identita || null;

    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };

    // Precompila — priorità: config salvato > sede > profilo pubblico
    // TELEFONO: mai dal utente — solo da sede/profilo
    const tel = conf?.telefono || sede?.telefono || profilo?.telefono || "";
    const em  = conf?.email    || profilo?.email  || "";
    const ind = conf?.indirizzo || [sede?.indirizzo || profilo?.indirizzo, sede?.citta || profilo?.citta].filter(Boolean).join(", ") || "";

    set("sw-nome",     conf?.nome     || sedeSelezionata?.nome || "");
    set("sw-telefono", tel);
    set("sw-email",    em);
    set("sw-indirizzo", ind);

    if (conf?.chisiamo_1 || profilo?.testo_sede) set("sw-chisiamo-1", conf?.chisiamo_1 || profilo?.testo_sede);

    if (conf) {
      set("sw-slug",        conf.slug);
      set("sw-dominio",     conf.dominio);
      set("sw-hero-titolo", conf.hero_titolo);
      set("sw-hero-sub",    conf.hero_sub);
      set("sw-hero-cta",    conf.hero_cta);
      set("sw-chisiamo-2",  conf.chisiamo_2);
      set("sw-mare-quote",  conf.mare_quote);
      set("sw-mare-testo",  conf.mare_testo);
      set("sw-pranzo",      conf.orari_pranzo);
      set("sw-cena",        conf.orari_cena);
      set("sw-piva",        conf.piva);
      if (conf.hl1) { set("sw-hl1-t", conf.hl1.titolo); set("sw-hl1-d", conf.hl1.testo); }
      if (conf.hl2) { set("sw-hl2-t", conf.hl2.titolo); set("sw-hl2-d", conf.hl2.testo); }
      if (conf.hl3) { set("sw-hl3-t", conf.hl3.titolo); set("sw-hl3-d", conf.hl3.testo); }
      if (conf.sezioni) Object.assign(sezioniState, conf.sezioni);
      if (conf.foto_cover)      fotoSel.cover     = conf.foto_cover;
      if (conf.foto_reel_terra) fotoSel.reelTerra = conf.foto_reel_terra;
      if (conf.foto_reel_mare)  fotoSel.reelMare  = conf.foto_reel_mare;
      if (conf.foto_locale)     fotoSel.locale     = conf.foto_locale;
      if (conf.form_link) document.getElementById('sw-form-link').value = conf.form_link;
      // Colori
      if (conf.colore_brand)      { set("sw-colore-btn-hex", conf.colore_brand);      document.getElementById("sw-colore-btn").value = conf.colore_brand; }
      if (conf.colore_secondario) { set("sw-colore-acc-hex", conf.colore_secondario); document.getElementById("sw-colore-acc").value = conf.colore_secondario; }
      if (conf.font_family) set("sw-font", conf.font_family);
    }

    // Colori dalla sede se non in config
    if (!conf?.colore_brand && sede?.colore_brand)      { set("sw-colore-btn-hex", sede.colore_brand);      document.getElementById("sw-colore-btn").value = sede.colore_brand; }
    if (!conf?.colore_secondario && sede?.colore_secondario) { set("sw-colore-acc-hex", sede.colore_secondario); document.getElementById("sw-colore-acc").value = sede.colore_secondario; }

    // Cover dalla sede se non selezionata
    if (!fotoSel.cover && sede?.cover_url) fotoSel.cover = sede.cover_url;

    // Slug preview
    if (conf?.slug) document.getElementById("sw-slug").dispatchEvent(new Event("input"));
    // DNS preview
    if (conf?.dominio) document.getElementById("sw-dominio").dispatchEvent(new Event("input"));
  }

  // ── SALVA CONFIG ─────────────────────────────────────────────
  async function salvaConfig() {
    if (!aziendaId) throw new Error("Azienda non trovata");
    const sedeId = sedeSelezionata?.id || null;
    if (!sedeId) throw new Error("Seleziona una sede");
    const conf = leggiForm();

    // Cerca record esistente
    const { data: existing } = await sc.from("sito_config")
      .select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeId).maybeSingle();

    const payload = {
      azienda_id:      aziendaId,
      sede_id:         sedeId,
      slug:            conf.slug,
      nome:            conf.nome,
      dominio:         conf.dominio,
      form_link:       conf.form_link || null,
      hero_titolo:     conf.hero_titolo,
      hero_sub:        conf.hero_sub,
      hero_cta:        conf.hero_cta,
      hl1:             conf.hl1,
      hl2:             conf.hl2,
      hl3:             conf.hl3,
      chisiamo_1:      conf.chisiamo_1,
      chisiamo_2:      conf.chisiamo_2,
      mare_quote:      conf.mare_quote,
      mare_testo:      conf.mare_testo,
      telefono:        conf.telefono,
      email:           conf.email,
      indirizzo:       conf.indirizzo,
      orari_pranzo:    conf.orari_pranzo,
      orari_cena:      conf.orari_cena,
      piva:            conf.piva,
      colore_brand:    conf.colore_brand,
      colore_secondario: conf.colore_secondario,
      font_family:     conf.font_family,
      foto_cover:      conf.foto_cover,
      foto_reel_terra: conf.foto_reel_terra,
      foto_reel_mare:  conf.foto_reel_mare,
      foto_locale:     conf.foto_locale,
      sezioni:         conf.sezioni,
      updated_at:      new Date().toISOString()
    };

    let error;
    if (existing?.id) {
      ({ error } = await sc.from("sito_config").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await sc.from("sito_config").insert(payload));
    }
    if (error) throw new Error(error.message);

    // Salva anche colori sulla sede
    await sc.from("sedi").update({
      colore_brand: conf.colore_brand,
      colore_secondario: conf.colore_secondario
    }).eq("id", sedeId);
  }

  // ── MEDIA ───────────────────────────────────────────────────
  async function caricaMedia() {
    if (!aziendaId) return;
    const sedeId = sedeSelezionata?.id;
    let q = sc.from("media_library").select("*").eq("azienda_id", aziendaId);
    if (sedeId) q = q.eq("sede_id", sedeId);
    q = q.order("created_at", { ascending: false });
    const { data } = await q;
    const imgs  = (data || []).filter(m => m.tipo === "immagine");
    const video = (data || []).filter(m => m.tipo === "video");
    renderMedia("grid-cover",      imgs,  "cover",     false);
    renderMedia("grid-reel-terra", video, "reelTerra", false);
    renderMedia("grid-reel-mare",  video, "reelMare",  false);
    renderMedia("grid-locale",     imgs,  "locale",    true);
  }

  function renderMedia(gridId, media, key, multi) {
    const grid = document.getElementById(gridId);
    if (!media.length) { grid.innerHTML = `<div style="color:#94a3b8;font-size:13px;grid-column:1/-1;padding:8px;">Nessun media — carica dalla Media Library</div>`; return; }
    grid.innerHTML = media.map(m => {
      const isV = m.tipo === "video";
      const isSel = multi ? fotoSel[key].includes(m.url) : fotoSel[key] === m.url;
      return `<div class="sw-media-item${isSel ? ' selected' : ''}" data-url="${m.url}" data-key="${key}">
        ${isV ? `<video src="${m.url}" muted preload="metadata"></video>` : `<img src="${m.url}" alt="${m.nome}" loading="lazy">`}
        <div class="sw-media-check">✓</div>
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:white;font-size:9px;padding:2px 5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${m.nome || ""}</div>
      </div>`;
    }).join("");
    grid.querySelectorAll(".sw-media-item").forEach(el => {
      el.onclick = () => {
        if (multi) {
          el.classList.toggle("selected");
          fotoSel[key] = el.classList.contains("selected")
            ? [...fotoSel[key], el.dataset.url]
            : fotoSel[key].filter(u => u !== el.dataset.url);
        } else {
          grid.querySelectorAll(".sw-media-item").forEach(x => x.classList.remove("selected"));
          el.classList.add("selected");
          fotoSel[key] = el.dataset.url;
        }
      };
    });
  }

  // ── TONY ────────────────────────────────────────────────────
  async function chiamaTony(sezione) {
    const sedeId = sedeSelezionata?.id;
    if (!sedeId) { alert("Seleziona prima la sede"); return; }
    const conf = leggiForm();
    const nome = conf.nome || sedeSelezionata?.nome || "il locale";

    const ctx = [
      `Nome: ${nome}`,
      sedeSelezionata?.indirizzo ? `Indirizzo: ${sedeSelezionata.indirizzo}` : "",
      sedeSelezionata?.telefono  ? `Telefono: ${sedeSelezionata.telefono}` : "",
      _identita?.gc_why ? `WHY: ${_identita.gc_why}` : "",
      _identita?.gc_how ? `HOW: ${_identita.gc_how}` : "",
      _identita?.gc_what ? `WHAT: ${_identita.gc_what}` : "",
      _identita?.tone_of_voice ? `Tone of voice: ${_identita.tone_of_voice}` : "",
      conf.chisiamo_1 ? `Chi siamo: ${conf.chisiamo_1}` : "",
    ].filter(Boolean).join("\n");

    // Menu per sede
    const { data: menuSede } = await sc.from("menu").select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeId);
    const menuIds = (menuSede || []).map(m => m.id);
    let menuTesto = "";
    if (menuIds.length) {
      const { data: cats } = await sc.from("menu_categorie").select("id,nome,menu_id").in("menu_id", menuIds);
      const { data: voci } = await sc.from("menu_voci").select("nome,prezzo,categoria_id").eq("azienda_id", aziendaId).eq("disponibile", true).limit(60);
      menuTesto = (cats || []).map(c => {
        const v = (voci || []).filter(x => x.categoria_id === c.id).map(x => `  - ${x.nome}${x.prezzo ? ` €${Number(x.prezzo).toFixed(2)}` : ""}`).join("\n");
        return v ? `${c.nome}:\n${v}` : null;
      }).filter(Boolean).join("\n\n");
    }

    const prompts = {
      hero:       `Locale: "${nome}"\n${ctx}\nScrivi titolo hero (max 8 parole) e sottotitolo (max 15 parole). Tono elegante. JSON: {"hero_titolo":"...","hero_sub":"..."}`,
      highlights: `Locale: "${nome}"\n${ctx}\nScrivi 3 punti di forza specifici. JSON: {"hl1":{"titolo":"...","testo":"..."},"hl2":{"titolo":"...","testo":"..."},"hl3":{"titolo":"...","testo":"..."}}`,
      chisiamo:   `Locale: "${nome}"\n${ctx}\n${menuTesto ? "Menu:\n"+menuTesto : ""}\nScrivi 2 paragrafi chi siamo autentici. JSON: {"p1":"...","p2":"..."}`,
      mare:       `Locale: "${nome}"\n${ctx}\nScrivi citazione filosofica mare (max 2 righe) e testo (max 40 parole). JSON: {"quote":"...","testo":"..."}`,
    };
    const prompt = prompts[sezione];
    if (!prompt) return;

    const session = window.supabaseClient?.auth ? (await window.supabaseClient.auth.getSession())?.data?.session : null;
    const token = session?.access_token || ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/assistente-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": token },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], azienda_id: aziendaId })
    });
    const data = await res.json();
    const reply = (data.reply || "").replace(/```json|```/g, "").trim();
    try {
      const j = JSON.parse(reply);
      if (sezione === "hero") { if (j.hero_titolo) document.getElementById("sw-hero-titolo").value = j.hero_titolo; if (j.hero_sub) document.getElementById("sw-hero-sub").value = j.hero_sub; }
      if (sezione === "highlights") {
        if (j.hl1) { document.getElementById("sw-hl1-t").value = j.hl1.titolo||""; document.getElementById("sw-hl1-d").value = j.hl1.testo||""; }
        if (j.hl2) { document.getElementById("sw-hl2-t").value = j.hl2.titolo||""; document.getElementById("sw-hl2-d").value = j.hl2.testo||""; }
        if (j.hl3) { document.getElementById("sw-hl3-t").value = j.hl3.titolo||""; document.getElementById("sw-hl3-d").value = j.hl3.testo||""; }
      }
      if (sezione === "chisiamo") { if (j.p1) document.getElementById("sw-chisiamo-1").value = j.p1; if (j.p2) document.getElementById("sw-chisiamo-2").value = j.p2; }
      if (sezione === "mare") { if (j.quote) document.getElementById("sw-mare-quote").value = j.quote; if (j.testo) document.getElementById("sw-mare-testo").value = j.testo; }
    } catch {}
  }

  container.querySelectorAll("[data-tony]").forEach(btn => {
    btn.onclick = async function() {
      const orig = this.innerHTML; this.innerHTML = "⏳..."; this.disabled = true;
      try { await chiamaTony(this.dataset.tony); } catch(e) { alert("Errore Tony: " + e.message); }
      finally { this.innerHTML = orig; this.disabled = false; }
    };
  });

  document.getElementById("sw-btn-tony-all").onclick = async function() {
    this.innerHTML = "⏳..."; this.disabled = true;
    try { await chiamaTony("hero"); await chiamaTony("highlights"); await chiamaTony("chisiamo"); }
    finally { this.innerHTML = "✨ Tony genera"; this.disabled = false; }
  };

  // ── CHECKLIST ────────────────────────────────────────────────
  function aggiornaChecklist() {
    const conf = leggiForm();
    const items = [
      { label:"Slug URL",       ok:!!conf.slug },
      { label:"Titolo hero",    ok:!!conf.hero_titolo },
      { label:"Chi siamo",      ok:!!conf.chisiamo_1 },
      { label:"Telefono",       ok:!!conf.telefono },
      { label:"Foto cover",     ok:!!conf.foto_cover },
      { label:"Form prenota",   ok:!!conf.form_id },
    ];
    document.getElementById("sw-checklist").innerHTML = items.map(i =>
      `<div class="sw-checklist-item"><span style="font-size:16px;">${i.ok ? "✅" : "⭕"}</span><span style="color:${i.ok ? "#374151" : "#94a3b8"};">${i.label}</span></div>`
    ).join("");
  }

  // ── GENERA HTML ──────────────────────────────────────────────
  async function generaHTML(conf) {
    const sedeId = sedeSelezionata?.id;
    const esc = v => String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    // Dati
    const [{ data: sede }, { data: profilo }, { data: az }] = await Promise.all([
      sedeId ? sc.from("sedi").select("nome,telefono,logo_url,cover_url,lat,lng,colore_brand,colore_secondario").eq("id", sedeId).maybeSingle() : Promise.resolve({data:null}),
      sc.from("azienda_profilo_pubblico").select("telefono,email,indirizzo,citta,google_maps_url,lat,lng").eq("azienda_id", aziendaId).maybeSingle(),
      sc.from("aziende").select("logo_url,colore_brand").eq("id", aziendaId).maybeSingle(),
    ]);

    const logo    = sede?.logo_url || az?.logo_url || "";
    const clrBtn  = conf.colore_brand      || sede?.colore_brand      || az?.colore_brand || "#794d01";
    const clrAcc  = conf.colore_secondario || sede?.colore_secondario || "#c4892a";
    const font    = conf.font_family || "Inter";
    const tel     = conf.telefono || sede?.telefono || profilo?.telefono || "";
    const em      = conf.email    || profilo?.email  || "";
    const ind     = conf.indirizzo || [profilo?.indirizzo, profilo?.citta].filter(Boolean).join(", ") || "";
    const mapsUrl = profilo?.google_maps_url || (ind ? `https://maps.google.com/?q=${encodeURIComponent(ind)}` : "#");
    const lat     = sede?.lat || profilo?.lat || 42.4597;
    const lng     = sede?.lng || profilo?.lng || 12.3857;
    const nome    = conf.nome || sedeSelezionata?.nome || "Ristorante";
    const cta     = conf.hero_cta || "Prenota un tavolo";
    const formUrl = conf.form_link || (conf.form_id
      ? `https://app.ristoflow-ai.com/#/prenotazione-online?form_id=${conf.form_id}`
      : "#");

    // Menu per sede
    let menuCats = [], menuVoci = [];
    if (sedeId) {
      const { data: menuSede } = await sc.from("menu").select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeId).eq("attivo", true);
      const menuIds = (menuSede || []).map(m => m.id);
      if (menuIds.length) {
        const { data: cats } = await sc.from("menu_categorie").select("id,nome,menu_id").in("menu_id", menuIds).order("ordine");
        menuCats = cats || [];
        if (menuCats.length) {
          const catIds = menuCats.map(c => c.id);
          const { data: voci } = await sc.from("menu_voci").select("id,nome,descrizione,prezzo,categoria_id").in("categoria_id", catIds).eq("disponibile", true).order("ordine").limit(60);
          menuVoci = voci || [];
        }
      }
    }

    const fontUrl = font === "Inter" ? "Inter:wght@300;400;600;700"
      : font === "Playfair Display" ? "Playfair+Display:ital,wght@0,600;1,400"
      : font === "Montserrat" ? "Montserrat:wght@300;400;600;700"
      : font === "Lato" ? "Lato:wght@300;400;700"
      : font === "Merriweather" ? "Merriweather:ital,wght@0,400;0,700;1,400"
      : "Inter:wght@300;400;600;700";

    const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--btn:${clrBtn};--acc:${clrAcc};--scuro:#1A1209;--caldo:#F5EFE4;--grigio:#6B5E4E}
html{scroll-behavior:smooth}
body{font-family:'${font}',system-ui,sans-serif;background:#fff;color:var(--scuro);overflow-x:hidden}
a{text-decoration:none;color:inherit}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(26,18,9,.92);backdrop-filter:blur(12px)}
.nav-logo{display:flex;align-items:center;gap:8px}
.nav-logo img{width:32px;height:32px;border-radius:50%;object-fit:cover}
.nav-logo span{font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--acc);letter-spacing:.3px}
.nav-links{display:flex;gap:18px}
.nav-links a{font-size:12px;color:rgba(255,255,255,.75);letter-spacing:.4px}
.nav-links a:hover{color:var(--acc)}
.nav-cta{background:var(--btn);color:#fff;font-size:12px;font-weight:800;padding:8px 18px;border-radius:6px}
@media(max-width:600px){.nav-links{display:none}}
.cta-bar{position:sticky;bottom:0;z-index:90;display:flex;background:var(--scuro);border-top:1px solid rgba(196,137,42,.25)}
.cta-bar a{flex:1;padding:14px 8px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.4px}
.cta-p{background:var(--btn);color:#fff}
.cta-c{background:#1e3a14;color:#7ed370}
.cta-m{background:#1e1e1e;color:rgba(255,255,255,.8)}
.section{padding:72px 20px;max-width:700px;margin:0 auto}
.eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--acc);margin-bottom:10px;font-weight:600}
.h2{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,5vw,44px);font-weight:600;line-height:1.1;margin-bottom:16px}
.h2 em{font-style:italic;color:var(--acc)}
.body{font-size:14px;color:var(--grigio);line-height:1.85}
.body p+p{margin-top:12px}
.btn{display:inline-block;background:var(--btn);color:#fff;font-weight:800;font-size:14px;padding:13px 28px;border-radius:8px;margin-top:20px}
.btn-ghost{display:inline-block;border:1.5px solid var(--btn);color:var(--btn);font-size:14px;font-weight:600;padding:13px 24px;border-radius:8px;margin-top:20px;margin-left:10px}
.hl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:24px}
.hl-card{background:#f8fafc;border-radius:14px;padding:20px;text-align:center}
.hl-icon{font-size:32px;margin-bottom:10px}
.hl-t{font-size:14px;font-weight:800;color:#111827;margin-bottom:4px}
.hl-d{font-size:12px;color:var(--grigio);line-height:1.5}
.reel-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px}
@media(max-width:500px){.reel-grid{grid-template-columns:1fr}}
.reel-item{position:relative;aspect-ratio:9/16;overflow:hidden;background:var(--scuro)}
.reel-item video,.reel-item img{width:100%;height:100%;object-fit:cover}
.reel-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(26,18,9,.75) 0%,transparent 50%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
.reel-lbl{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#fff;margin-bottom:3px}
.reel-sub{font-size:10px;letter-spacing:2px;color:var(--acc);text-transform:uppercase}
.mare-s{background:var(--scuro);padding:72px 20px}
.mare-i{max-width:700px;margin:0 auto;color:#fff}
.mare-q{font-family:'Cormorant Garamond',serif;font-size:clamp(20px,4vw,34px);font-style:italic;line-height:1.4;margin-bottom:24px;border-left:2px solid var(--acc);padding-left:20px}
.mare-b{font-size:14px;color:rgba(255,255,255,.65);line-height:1.9}
.menu-s{background:var(--caldo);padding:72px 20px}
.menu-i{max-width:700px;margin:0 auto}
.mcat{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
.mcat-btn{padding:6px 14px;border-radius:20px;border:1.5px solid #c9b89a;background:transparent;font-size:12px;color:var(--grigio);cursor:pointer;font-family:inherit}
.mcat-btn.active{background:var(--btn);border-color:var(--btn);color:#fff;font-weight:700}
.mi{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;border-bottom:1px solid #d8ccba;gap:12px}
.mi:last-child{border-bottom:none}
.mi-n{font-size:14px;font-weight:500}
.mi-d{font-size:11px;color:var(--grigio);margin-top:2px;line-height:1.4}
.mi-p{font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--acc);font-weight:600;white-space:nowrap}
.loc-img{width:100%;height:280px;object-fit:cover;display:block}
.rev-bg{background:var(--caldo);padding:72px 20px}
.rev-c{background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.rev-t{font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;line-height:1.6;margin-bottom:10px}
.stars{color:var(--acc);letter-spacing:2px;font-size:13px;margin-bottom:6px}
.map-s{background:var(--scuro);padding:72px 20px}
.map-i{max-width:700px;margin:0 auto;color:#fff}
.map-g{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
@media(max-width:480px){.map-g{grid-template-columns:1fr}}
.map-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--acc);margin-bottom:3px}
.map-v{font-size:13px;color:rgba(255,255,255,.8);line-height:1.5}
.map-v a{color:var(--acc)}
footer{background:#0e0a04;padding:36px 20px;text-align:center}
.ft-logo{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--acc);margin-bottom:10px;font-style:italic}
.ft-links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
.ft-links a{font-size:11px;color:rgba(255,255,255,.35)}
.ft-copy{font-size:10px;color:rgba(255,255,255,.2)}`;

    const head = (title) => `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(conf.chisiamo_1?.slice(0,150)||'')}">
<meta property="og:title" content="${esc(nome)}">
<meta property="og:image" content="${esc(conf.foto_cover||'')}">
<title>${esc(title)} — ${esc(nome)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=${fontUrl}&display=swap" rel="stylesheet">
<style>${css}</style>
<script>
(function(){
  var SID=sessionStorage.getItem('rf_sid')||(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
  sessionStorage.setItem('rf_sid',SID);
  var AZ_ID='${aziendaId||""}';
  var SEDE_ID='${sedeId||""}';
  var PAGINA=location.pathname.split('/').pop().replace('.html','')||'home';
  window._rfTrack=function(tipo,elemento,extra){
    var p=new URLSearchParams(location.search);
    fetch('https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/track',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(Object.assign({
        azienda_id:AZ_ID||null,sede_id:SEDE_ID||null,
        pagina:'sito-'+PAGINA,pagina_id:AZ_ID||null,
        tipo:tipo,elemento:elemento||null,
        referrer:document.referrer||null,
        utm_source:p.get('utm_source'),utm_medium:p.get('utm_medium'),utm_campaign:p.get('utm_campaign'),
        device:/Mobi/.test(navigator.userAgent)?'mobile':'desktop',
        session_id:SID
      },extra||{}))
    }).catch(function(){});
  };
  window._rfTrack('view','sito_pagina',{completato:false});
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');
    if(!a)return;
    var href=a.href||'';
    if(href.includes('prenotazione-online')||href.includes('booking')||a.classList.contains('nav-cta')||a.classList.contains('btn')||a.classList.contains('cta-p')){
      window._rfTrack('click','cta_prenota',{valore:href.slice(0,80)});
    } else if(a.classList.contains('cta-c')||href.startsWith('tel:')){
      window._rfTrack('click','click_telefono',{valore:href});
    } else if(href.includes('menu.html')||a.classList.contains('cta-m')){
      window._rfTrack('click','click_menu',{});
    } else if(href.includes('contatti.html')||href.includes('maps')){
      window._rfTrack('click','click_mappa',{});
    }
  });
})();
</script>
</head>`;

    const nav = `<nav class="nav">
  <a class="nav-logo" href="index.html">${logo ? `<img src="${esc(logo)}" alt="Logo">` : ""}<span>${esc(nome)}</span></a>
  <div class="nav-links">
    <a href="index.html">Home</a><a href="chi-siamo.html">Chi siamo</a>
    <a href="menu.html">Menu</a><a href="contatti.html">Contatti</a>
  </div>
  <a class="nav-cta" href="${esc(formUrl)}">${esc(cta)}</a>
</nav>`;

    const ctaBar = `<div class="cta-bar">
  <a class="cta-p" href="${esc(formUrl)}">🗓 ${esc(cta)}</a>
  ${tel ? `<a class="cta-c" href="tel:${esc(tel)}">📞 Chiama</a>` : ""}
  <a class="cta-m" href="menu.html">📋 Menu</a>
</div>`;

    const footer = `<footer>
  <div class="ft-logo">${esc(nome)}</div>
  <div class="ft-links"><a href="index.html">Home</a><a href="chi-siamo.html">Chi siamo</a><a href="menu.html">Menu</a><a href="contatti.html">Contatti</a><a href="${esc(formUrl)}">${esc(cta)}</a></div>
  <div class="ft-copy">© ${new Date().getFullYear()} ${esc(nome)}${conf.piva ? ` — P.IVA ${esc(conf.piva)}` : ""}</div>
</footer>`;

    const menuItemsHTML = menuCats.map((c, i) => `
  <div class="menu-cat" data-cat="${c.id}" style="${i > 0 ? 'display:none' : ''}">
    ${menuVoci.filter(v => v.categoria_id === c.id).map(v => `
    <div class="mi">
      <div><div class="mi-n">${esc(v.nome)}</div>${v.descrizione ? `<div class="mi-d">${esc(v.descrizione)}</div>` : ""}</div>
      ${v.prezzo ? `<div class="mi-p">€ ${Number(v.prezzo).toFixed(2)}</div>` : ""}
    </div>`).join("")}
  </div>`).join("");

    const menuScript = `<script>function filtraMenu(id,btn){document.querySelectorAll('.menu-cat').forEach(el=>el.style.display='none');document.querySelectorAll('.mcat-btn').forEach(b=>b.classList.remove('active'));var el=document.querySelector('.menu-cat[data-cat="'+id+'"]');if(el)el.style.display='';if(btn)btn.classList.add('active')}</script>`;

    // ── HOME ──────────────────────────────────────────────────
    const home = `${head(nome)}
<body>
${nav}
<div style="position:relative;height:100svh;min-height:580px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:80px;text-align:center;overflow:hidden;">
  <div style="position:absolute;inset:0;background:var(--scuro);">
    ${conf.foto_cover ? `<img src="${esc(conf.foto_cover)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55;" alt="">` : ""}
  </div>
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,rgba(0,0,0,.2) 60%,transparent 100%);"></div>
  <div style="position:relative;z-index:2;padding:0 20px;">
    <div class="eyebrow">Orte · A1 · Parcheggio gratuito</div>
    <h1 class="h2" style="color:#fff;font-size:clamp(36px,8vw,72px);margin-bottom:16px;text-shadow:0 2px 12px rgba(0,0,0,.5);">${esc(conf.hero_titolo || nome)}</h1>
    ${conf.hero_sub ? `<p style="font-size:14px;color:rgba(255,255,255,.85);margin-bottom:28px;max-width:440px;margin-left:auto;margin-right:auto;text-shadow:0 1px 6px rgba(0,0,0,.5);">${esc(conf.hero_sub)}</p>` : ""}
    <a class="btn" href="${esc(formUrl)}" style="font-size:16px;padding:16px 36px;">🗓 ${esc(cta)}</a>
    ${tel ? `<a class="btn-ghost" href="tel:${esc(tel)}">📞 Chiama</a>` : ""}
  </div>
</div>
${ctaBar}
${sezioniState.highlights && conf.hl1?.titolo ? `
<section class="section">
  <div class="hl-grid">
    <div class="hl-card"><div class="hl-icon">📍</div><div class="hl-t">${esc(conf.hl1.titolo)}</div><div class="hl-d">${esc(conf.hl1.testo)}</div></div>
    <div class="hl-card"><div class="hl-icon">🍽️</div><div class="hl-t">${esc(conf.hl2.titolo)}</div><div class="hl-d">${esc(conf.hl2.testo)}</div></div>
    <div class="hl-card"><div class="hl-icon">🐟</div><div class="hl-t">${esc(conf.hl3.titolo)}</div><div class="hl-d">${esc(conf.hl3.testo)}</div></div>
  </div>
</section>` : ""}
${sezioniState.cucina && conf.chisiamo_1 ? `
<section class="section" id="cucina">
  <div class="eyebrow">La nostra cucina</div>
  <h2 class="h2">Terra e mare,<br><em>scelti ogni giorno</em></h2>
  <div class="body"><p>${esc(conf.chisiamo_1)}</p>${conf.chisiamo_2 ? `<p>${esc(conf.chisiamo_2)}</p>` : ""}</div>
  <a class="btn" href="chi-siamo.html">Scopri chi siamo →</a>
  <a class="btn" href="${esc(formUrl)}" style="margin-left:10px;">🗓 ${esc(cta)}</a>
</section>` : ""}
${sezioniState.reel && (conf.foto_reel_terra || conf.foto_reel_mare) ? `
<div class="reel-grid" style="max-width:${conf.foto_reel_terra && conf.foto_reel_mare ? '100%' : '600px'};margin:0 auto;">
  ${conf.foto_reel_terra ? `<div class="reel-item"><video src="${esc(conf.foto_reel_terra)}" autoplay muted loop playsinline></video><div class="reel-ov"><div class="reel-lbl">I primi di terra</div><div class="reel-sub">Tradizione · Territorio</div></div></div>` : ""}
  ${conf.foto_reel_mare ? `<div class="reel-item"><video src="${esc(conf.foto_reel_mare)}" autoplay muted loop playsinline></video><div class="reel-ov"><div class="reel-lbl">Il nostro mare</div><div class="reel-sub">Scelto ogni mattina</div></div></div>` : ""}
</div>` : ""}
${sezioniState.mare && conf.mare_quote ? `
<div class="mare-s" id="mare">
  <div class="mare-i">
    <div class="eyebrow" style="color:var(--acc)">Il mare</div>
    <blockquote class="mare-q">${esc(conf.mare_quote)}</blockquote>
    ${conf.mare_testo ? `<div class="mare-b"><p>${esc(conf.mare_testo)}</p></div>` : ""}
    <a class="btn" href="${esc(formUrl)}" style="margin-top:28px;">🗓 ${esc(cta)}</a>
  </div>
</div>` : ""}
${sezioniState.menu && menuCats.length ? `
<div class="menu-s" id="menu">
  <div class="menu-i">
    <div class="eyebrow">Il menu</div>
    <h2 class="h2" style="margin-bottom:8px;">Cosa portiamo<br><em>in tavola</em></h2>
    <p style="font-size:13px;color:var(--grigio);margin-bottom:20px;">Anteprima. <a href="menu.html" style="color:var(--acc);font-weight:600;">Vedi menu completo →</a></p>
    <div class="mcat">${menuCats.map((c,i) => `<button class="mcat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`).join("")}</div>
    <div>${menuItemsHTML}</div>
    <a class="btn" href="${esc(formUrl)}" style="margin-top:32px;">🗓 ${esc(cta)}</a>
  </div>
</div>` : ""}
${sezioniState.locale && conf.foto_locale?.[0] ? `
<div id="locale">
  <img class="loc-img" src="${esc(conf.foto_locale[0])}" alt="Il locale" loading="lazy">
  <section class="section">
    <div class="eyebrow">Il locale</div>
    <h2 class="h2">Un'atmosfera<br><em>unica</em></h2>
    <div class="body"><p>All'interno dell'Hotel Aquila, a pochi metri dall'uscita A1 di Orte. Parcheggio gratuito, ambiente tranquillo.</p></div>
    <a class="btn" href="${esc(formUrl)}">🗓 ${esc(cta)}</a>
  </section>
</div>` : ""}
${sezioniState.recensioni ? `
<div class="rev-bg">
  <div style="max-width:700px;margin:0 auto;">
    <div class="eyebrow">Dicono di noi</div>
    <h2 class="h2" style="margin-bottom:24px;">L'opinione<br><em>dei nostri ospiti</em></h2>
    <div class="rev-c"><div class="stars">★★★★★</div><div class="rev-t">"Cucina tradizionale curata e servizio rapido. Una sosta ideale per chi viaggia."</div><div style="font-size:12px;color:var(--grigio)"><strong>Marco R.</strong> · lavoro</div></div>
    <div class="rev-c"><div class="stars">★★★★★</div><div class="rev-t">"Il pesce era freschissimo, si sentiva. Torneremo sicuramente."</div><div style="font-size:12px;color:var(--grigio)"><strong>Laura M.</strong> · famiglia</div></div>
    <div style="text-align:center;margin-top:20px;"><a class="btn" href="${esc(formUrl)}">🗓 ${esc(cta)}</a></div>
  </div>
</div>` : ""}
${sezioniState.mappa ? `
<div class="map-s" id="contatti">
  <div class="map-i">
    <div class="eyebrow" style="color:var(--acc)">Come raggiungerci</div>
    <h2 class="h2" style="color:#fff;">A pochi minuti<br><em>dall'autostrada</em></h2>
    <iframe style="width:100%;height:200px;border-radius:12px;border:none;margin:20px 0;opacity:.8" src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed" allowfullscreen loading="lazy"></iframe>
    <div class="map-g">
      ${ind ? `<div><div class="map-lbl">Indirizzo</div><div class="map-v">${esc(ind)}</div></div>` : ""}
      <div><div class="map-lbl">Orari</div><div class="map-v">${conf.orari_pranzo ? `Pranzo: ${esc(conf.orari_pranzo)}<br>` : ""}${conf.orari_cena ? `Cena: ${esc(conf.orari_cena)}` : ""}</div></div>
      ${tel ? `<div><div class="map-lbl">Telefono</div><div class="map-v"><a href="tel:${esc(tel)}">${esc(tel)}</a></div></div>` : ""}
      ${em ? `<div><div class="map-lbl">Email</div><div class="map-v"><a href="mailto:${esc(em)}">${esc(em)}</a></div></div>` : ""}
    </div>
    <div style="display:flex;gap:10px;margin-top:28px;flex-wrap:wrap;">
      <a class="btn" href="${esc(formUrl)}" style="flex:1;min-width:180px;text-align:center;">🗓 ${esc(cta)}</a>
      ${tel ? `<a href="tel:${esc(tel)}" style="flex:1;min-width:180px;display:inline-block;border:1.5px solid rgba(255,255,255,.3);color:#fff;font-weight:600;font-size:14px;padding:13px 20px;border-radius:8px;text-align:center;">📞 Chiama ora</a>` : ""}
    </div>
  </div>
</div>` : ""}
${footer}${menuScript}
</body></html>`;

    // ── CHI SIAMO ─────────────────────────────────────────────
    const chiSiamo = `${head("Chi siamo")}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<section class="section" style="padding-top:60px;">
  <div class="eyebrow">Chi siamo</div>
  <h1 class="h2">La nostra <em>storia</em></h1>
  <div class="body">
    ${conf.chisiamo_1 ? `<p>${esc(conf.chisiamo_1)}</p>` : ""}
    ${conf.chisiamo_2 ? `<p>${esc(conf.chisiamo_2)}</p>` : ""}
  </div>
  <a class="btn" href="${esc(formUrl)}">🗓 ${esc(cta)}</a>
</section>
${conf.foto_locale?.[0] ? `<img class="loc-img" src="${esc(conf.foto_locale[0])}" alt="Il locale" loading="lazy">` : ""}
${conf.mare_quote && sezioniState.mare ? `
<div class="mare-s">
  <div class="mare-i">
    <blockquote class="mare-q">${esc(conf.mare_quote)}</blockquote>
    ${conf.mare_testo ? `<div class="mare-b"><p>${esc(conf.mare_testo)}</p></div>` : ""}
    <a class="btn" href="${esc(formUrl)}" style="margin-top:24px;">🗓 ${esc(cta)}</a>
  </div>
</div>` : ""}
${ctaBar}${footer}
</body></html>`;

    // ── MENU PAGE ─────────────────────────────────────────────
    const menuPage = `${head("Menu")}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<div class="menu-s" style="padding-top:60px;">
  <div class="menu-i">
    <div class="eyebrow">Il menu</div>
    <h1 class="h2" style="margin-bottom:20px;">Cosa portiamo<br><em>in tavola</em></h1>
    ${menuCats.length ? `
    <div class="mcat">${menuCats.map((c,i) => `<button class="mcat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`).join("")}</div>
    <div>${menuItemsHTML}</div>` : `<p style="color:var(--grigio);">Menu non disponibile al momento.</p>`}
    <a class="btn" href="${esc(formUrl)}" style="margin-top:32px;">🗓 ${esc(cta)}</a>
  </div>
</div>
${ctaBar}${footer}${menuScript}
</body></html>`;

    // ── CONTATTI ──────────────────────────────────────────────
    const contatti = `${head("Contatti")}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<div class="map-s" style="padding-top:60px;">
  <div class="map-i">
    <div class="eyebrow" style="color:var(--acc)">Contatti</div>
    <h1 class="h2" style="color:#fff;">Come<br><em>raggiungerci</em></h1>
    <iframe style="width:100%;height:220px;border-radius:12px;border:none;margin:24px 0;opacity:.8" src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed" allowfullscreen loading="lazy"></iframe>
    <div class="map-g">
      ${ind ? `<div><div class="map-lbl">Indirizzo</div><div class="map-v">${esc(ind)}</div></div>` : ""}
      <div><div class="map-lbl">Orari</div><div class="map-v">${conf.orari_pranzo ? `Pranzo: ${esc(conf.orari_pranzo)}<br>` : ""}${conf.orari_cena ? `Cena: ${esc(conf.orari_cena)}` : ""}</div></div>
      ${tel ? `<div><div class="map-lbl">Telefono</div><div class="map-v"><a href="tel:${esc(tel)}">${esc(tel)}</a></div></div>` : ""}
      ${em ? `<div><div class="map-lbl">Email</div><div class="map-v"><a href="mailto:${esc(em)}">${esc(em)}</a></div></div>` : ""}
    </div>
    <a class="btn" href="${esc(formUrl)}" style="margin-top:28px;">🗓 ${esc(cta)}</a>
  </div>
</div>
${ctaBar}${footer}
</body></html>`;

    return { home, chiSiamo, menuPage, contatti };
  }

  // ── PUBBLICA ─────────────────────────────────────────────────
  async function pubblica(soloAnteprima = false) {
    const conf = leggiForm();
    if (!conf.slug && !soloAnteprima) { alert("Inserisci lo slug URL"); return; }

    if (soloAnteprima) {
      const pagine = await generaHTML(conf);
      const blob = new Blob([pagine.home], { type: "text/html;charset=utf-8" });
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }

    const statusEl = document.getElementById("sw-pub-status");
    const btn      = document.getElementById("sw-btn-pubblica-main");
    const btnTop   = document.getElementById("sw-btn-pubblica");
    statusEl.style.display = "";
    statusEl.className = "sw-status loading";
    statusEl.textContent = "⏳ Salvataggio...";
    btn.disabled = true; btnTop.disabled = true;

    try {
      await salvaConfig();
      statusEl.textContent = "⏳ Generazione pagine...";
      const pagine = await generaHTML(conf);

      statusEl.textContent = "⏳ Pubblicazione su GitHub...";
      const session = window.supabaseClient?.auth ? (await window.supabaseClient.auth.getSession())?.data?.session : null;
      const token   = session?.access_token || ANON_KEY;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/github-deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": token },
        body: JSON.stringify({
          slug:   conf.slug,
          nome:   conf.nome,
          dominio: conf.dominio || null,
          pagine: {
            "index.html":     pagine.home,
            "chi-siamo.html": pagine.chiSiamo,
            "menu.html":      pagine.menuPage,
            "contatti.html":  pagine.contatti,
          }
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Errore pubblicazione");

      statusEl.className = "sw-status success";
      statusEl.innerHTML = `✅ Sito pubblicato! (${data.pagine_pubblicate || 4} pagine)<br>
        <a href="${data.url}" target="_blank" style="color:#15803d;font-weight:600;">${data.url}</a><br>
        <span style="font-size:11px;color:#64748b;">Attendi 1-2 minuti per la propagazione.</span>`;

    } catch(e) {
      statusEl.className = "sw-status error";
      statusEl.textContent = "❌ " + e.message;
    } finally {
      btn.disabled = false; btnTop.disabled = false;
    }
  }

  // ── HANDLERS ────────────────────────────────────────────────
  document.getElementById("sw-btn-preview").onclick = () => pubblica(true);
  document.getElementById("sw-btn-pubblica").onclick = () => {
    container.querySelector('[data-tab="pubblica"]').click();
    pubblica(false);
  };
  document.getElementById("sw-btn-pubblica-main").onclick = () => pubblica(false);
  document.getElementById("sw-btn-salva").onclick = async function() {
    const orig = this.innerHTML; this.innerHTML = "⏳..."; this.disabled = true;
    try { await salvaConfig(); this.innerHTML = "✅ Salvato!"; setTimeout(() => { this.innerHTML = orig; this.disabled = false; }, 2000); }
    catch(e) { alert("Errore: " + e.message); this.innerHTML = orig; this.disabled = false; }
  };

  // ── INIT ─────────────────────────────────────────────────────
  await caricaSedi();
  await caricaConfig();
}
