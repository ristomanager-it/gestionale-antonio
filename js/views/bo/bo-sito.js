// ============================================================
//  bo-sito.js v2 — Gestione Sito Web da Ristoflow
//  Multi-sede, anteprima locale, Tony AI, multi-pagina
// ============================================================

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

export async function render(container) {
  const sc = window.supabaseClient || window.supabase?.createClient(SUPABASE_URL, ANON_KEY);
  const aziendaId = window.state?.azienda?.id || window.state?.aziendaId;

  // ── CSS ────────────────────────────────────────────────────
  if (!document.getElementById("bo-sito-style")) {
    const style = document.createElement("style");
    style.id = "bo-sito-style";
    style.textContent = `
      .sw { padding:16px; max-width:820px; }
      .sw-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px; }
      .sw-title { font-size:18px;font-weight:800;color:#111827; }
      .sw-tabs { display:flex;gap:2px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:20px;flex-wrap:wrap; }
      .sw-tab { padding:8px 16px;border-radius:8px;border:none;background:transparent;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s; }
      .sw-tab.active { background:white;color:#0E5A7A;box-shadow:0 1px 4px rgba(0,0,0,.1); }
      .sw-panel { display:none; }
      .sw-panel.active { display:block; }
      .sw-card { background:white;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.06); }
      .sw-card-title { font-size:14px;font-weight:700;color:#111827;margin-bottom:12px;display:flex;align-items:center;gap:8px; }
      .sw-label { font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px; }
      .sw-input { width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit; }
      .sw-input:focus { border-color:#0E5A7A; }
      .sw-textarea { width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;resize:vertical;min-height:90px;font-family:inherit;line-height:1.6; }
      .sw-textarea:focus { border-color:#0E5A7A; }
      .sw-field { margin-bottom:14px; }
      .sw-field-row { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px; }
      @media(max-width:500px) { .sw-field-row { grid-template-columns:1fr; } }
      .sw-tony-btn { display:flex;align-items:center;gap:6px;padding:7px 14px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0; }
      .sw-tony-btn:hover { opacity:.9; }
      .sw-tony-btn:disabled { opacity:.5;cursor:not-allowed; }
      .sw-field-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:6px; }
      .sw-media-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:8px; }
      .sw-media-item { position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent; }
      .sw-media-item.selected { border-color:#0E5A7A; }
      .sw-media-item img,.sw-media-item video { width:100%;height:100%;object-fit:cover; }
      .sw-media-check { position:absolute;top:4px;right:4px;background:#0E5A7A;color:white;border-radius:50%;width:20px;height:20px;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700; }
      .sw-media-item.selected .sw-media-check { display:flex; }
      .sw-pub-btn { width:100%;padding:16px;background:#0E5A7A;color:white;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;letter-spacing:.3px; }
      .sw-pub-btn:hover { opacity:.9; }
      .sw-pub-btn:disabled { opacity:.6;cursor:not-allowed; }
      .sw-status { margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600; }
      .sw-status.success { background:#f0fdf4;color:#15803d; }
      .sw-status.error { background:#fef2f2;color:#dc2626; }
      .sw-status.loading { background:#f0f9ff;color:#0E5A7A; }
      .sw-slug-preview { font-size:11px;color:#94a3b8;margin-top:4px; }
      .sw-sede-card { border:2px solid #e5e7eb;border-radius:12px;padding:14px;cursor:pointer;transition:all .15s;background:white; }
      .sw-sede-card.selected { border-color:#0E5A7A;background:#f0f9ff; }
      .sw-sede-card h4 { font-size:14px;font-weight:700;color:#111827;margin:0 0 4px; }
      .sw-sede-card p { font-size:12px;color:#64748b;margin:0; }
      .sw-toggle { width:42px;height:24px;background:#e5e7eb;border-radius:12px;position:relative;cursor:pointer;transition:background .2s;border:none;flex-shrink:0; }
      .sw-toggle.on { background:#0E5A7A; }
      .sw-toggle::after { content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;background:white;border-radius:50%;transition:transform .2s; }
      .sw-toggle.on::after { transform:translateX(18px); }
      .sw-sezione-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9; }
      .sw-tag { display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase; }
      .sw-import-box { background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:16px; }
      .sw-checklist-item { display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0; }
    `;
    document.head.appendChild(style);
  }

  // ── STATO ───────────────────────────────────────────────────
  let sedeSelezionata = null;
  let allMedia = [];
  const fotoSel = { cover: null, reelTerra: null, reelMare: null, locale: [] };
  let _identita = null;
  let _profilo  = null;
  const SEZIONI = [
    { id:"hero",       label:"🦸 Hero + CTA principale",    def:true  },
    { id:"highlights", label:"✨ Highlights (3 punti chiave)", def:true  },
    { id:"cucina",     label:"🍽️ La nostra cucina",         def:true  },
    { id:"reel",       label:"🎬 Video reel",                def:true  },
    { id:"mare",       label:"🐟 Filosofia mare",            def:false },
    { id:"menu",       label:"📋 Menu digitale",             def:true  },
    { id:"eventi",     label:"🎉 Eventi speciali",           def:false },
    { id:"locale",     label:"🏠 Il locale",                 def:true  },
    { id:"recensioni", label:"⭐ Recensioni",                def:true  },
    { id:"mappa",      label:"📍 Come raggiungerci",         def:true  },
  ];
  const sezioniState = {};
  SEZIONI.forEach(s => sezioniState[s.id] = s.def);

  // ── HTML ────────────────────────────────────────────────────
  container.innerHTML = `
  <div class="sw">
    <div class="sw-header">
      <div class="sw-title">🌐 Sito Web</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="sw-btn-preview" class="sw-tony-btn" style="background:#f8fafc;color:#374151;border:1.5px solid #e5e7eb;">👁 Anteprima</button>
        <button id="sw-btn-salva" class="sw-tony-btn" style="background:#f0fdf4;color:#15803d;border:1.5px solid #86efac;">💾 Salva bozza</button>
        <button id="sw-btn-tony-all" class="sw-tony-btn">✨ Tony genera tutto</button>
        <button id="sw-btn-pubblica" class="sw-pub-btn" style="width:auto;padding:10px 24px;font-size:14px;">🚀 Pubblica</button>
      </div>
    </div>

    <!-- SELEZIONE SEDE -->
    <div id="sw-sedi-wrap" style="display:none;margin-bottom:16px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;" id="sw-sedi-bar"></div>
    </div>

    <!-- IMPORT SITO ESISTENTE -->
    <div class="sw-import-box">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">🔗 Hai già un sito? Importa da URL</div>
      <div style="display:flex;gap:8px;">
        <input id="sw-import-url" class="sw-input" placeholder="https://trattoriadellaquila.it" style="flex:1;">
        <button id="sw-btn-import" class="sw-tony-btn" style="background:#92400e;">Importa</button>
      </div>
      <div id="sw-import-status" style="font-size:12px;color:#92400e;margin-top:6px;display:none;"></div>
    </div>

    <div class="sw-tabs">
      <button class="sw-tab active" data-tab="contenuti">✏️ Contenuti</button>
      <button class="sw-tab" data-tab="pagine">📄 Pagine</button>
      <button class="sw-tab" data-tab="foto">📸 Media</button>
      <button class="sw-tab" data-tab="sezioni">📋 Sezioni</button>
      <button class="sw-tab" data-tab="pubblica">🚀 Pubblica</button>
    </div>

    <!-- TAB CONTENUTI -->
    <div class="sw-panel active" id="panel-contenuti">
      <div class="sw-card">
        <div class="sw-card-title">🏷️ Identità</div>
        <div class="sw-field-row">
          <div class="sw-field">
            <label class="sw-label">Nome visualizzato</label>
            <input id="sw-nome" class="sw-input" placeholder="Es. Trattoria dell'Aquila">
          </div>
          <div class="sw-field">
            <label class="sw-label">Slug URL *</label>
            <input id="sw-slug" class="sw-input" placeholder="trattoria-aquila">
            <div class="sw-slug-preview" id="sw-slug-preview"></div>
          </div>
        </div>
        <div class="sw-field">
          <label class="sw-label">Dominio personalizzato <span style="color:#94a3b8;font-weight:400;">(opzionale)</span></label>
          <input id="sw-dominio" class="sw-input" placeholder="Es. trattoriadellaquila.it">
          <div id="sw-dns-box" style="display:none;background:#f0f9ff;border-radius:10px;padding:12px;margin-top:8px;font-size:12px;color:#0369a1;line-height:1.8;" id="sw-dns-content"></div>
        </div>
      </div>

      <div class="sw-card">
        <div class="sw-field-header">
          <div class="sw-card-title" style="margin:0;">🦸 Hero</div>
          <button class="sw-tony-btn" data-tony="hero">✨ Tony</button>
        </div>
        <div class="sw-field" style="margin-top:12px;">
          <label class="sw-label">Titolo principale</label>
          <input id="sw-hero-titolo" class="sw-input" placeholder="Es. Il posto giusto dove fermarsi">
        </div>
        <div class="sw-field">
          <label class="sw-label">Sottotitolo</label>
          <input id="sw-hero-sub" class="sw-input" placeholder="Es. Cucina di territorio · Orte (VT)">
        </div>
        <div class="sw-field">
          <label class="sw-label">Testo CTA principale</label>
          <input id="sw-hero-cta" class="sw-input" placeholder="Prenota un tavolo" value="Prenota un tavolo">
        </div>
      </div>

      <div class="sw-card">
        <div class="sw-field-header">
          <div class="sw-card-title" style="margin:0;">✨ Highlights <span style="font-size:11px;color:#94a3b8;font-weight:400;">(3 punti chiave)</span></div>
          <button class="sw-tony-btn" data-tony="highlights">✨ Tony</button>
        </div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
          <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:center;">
            <span style="font-size:20px;">📍</span>
            <input id="sw-hl1-titolo" class="sw-input" placeholder="Titolo" value="A pochi passi dall'A1">
            <input id="sw-hl1-testo" class="sw-input" placeholder="Descrizione" value="Uscita Orte · Parcheggio gratuito">
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:center;">
            <span style="font-size:20px;">🍽️</span>
            <input id="sw-hl2-titolo" class="sw-input" placeholder="Titolo" value="Cucina di territorio">
            <input id="sw-hl2-testo" class="sw-input" placeholder="Descrizione" value="Ingredienti scelti ogni giorno">
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:center;">
            <span style="font-size:20px;">🐟</span>
            <input id="sw-hl3-titolo" class="sw-input" placeholder="Titolo" value="Il mare, ogni giorno">
            <input id="sw-hl3-testo" class="sw-input" placeholder="Descrizione" value="Dal mercato ittico direttamente in tavola">
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div class="sw-field-header">
          <div class="sw-card-title" style="margin:0;">📖 Chi siamo</div>
          <button class="sw-tony-btn" data-tony="chisiamo">✨ Tony</button>
        </div>
        <div class="sw-field" style="margin-top:12px;">
          <label class="sw-label">Paragrafo 1</label>
          <textarea id="sw-chisiamo-1" class="sw-textarea" placeholder="La storia del locale..."></textarea>
        </div>
        <div class="sw-field">
          <label class="sw-label">Paragrafo 2</label>
          <textarea id="sw-chisiamo-2" class="sw-textarea" placeholder="Filosofia e valori..."></textarea>
        </div>
      </div>

      <div class="sw-card" id="sw-card-mare">
        <div class="sw-field-header">
          <div class="sw-card-title" style="margin:0;">🐟 Filosofia mare</div>
          <button class="sw-tony-btn" data-tony="mare">✨ Tony</button>
        </div>
        <div class="sw-field" style="margin-top:12px;">
          <label class="sw-label">Citazione</label>
          <textarea id="sw-mare-quote" class="sw-textarea" style="min-height:60px;" placeholder="La frase chiave della vostra filosofia..."></textarea>
        </div>
        <div class="sw-field">
          <label class="sw-label">Testo</label>
          <textarea id="sw-mare-testo" class="sw-textarea" placeholder="Approfondimento..."></textarea>
        </div>
      </div>

      <div class="sw-card">
        <div class="sw-card-title">🗓️ Form prenotazione</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:12px;">Seleziona il form da collegare al pulsante "Prenota" del sito.</div>
        <select id="sw-form-id" class="sw-input" style="margin-bottom:8px;">
          <option value="">— Caricamento form... —</option>
        </select>
        <div id="sw-form-preview" style="font-size:12px;color:#0E5A7A;margin-top:4px;"></div>
      </div>
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
    </div>

    <!-- TAB PAGINE -->
    <div class="sw-panel" id="panel-pagine">
      <div class="sw-card">
        <div class="sw-card-title">📄 Pagine del sito</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Il sito genera automaticamente queste pagine. Tony può scrivere i contenuti.</div>
        
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="background:#f8fafc;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:14px;font-weight:700;">🏠 Home</div>
              <div style="font-size:12px;color:#64748b;">Hero, highlights, CTA, anteprima menu, recensioni</div>
            </div>
            <span class="sw-tag" style="background:#dcfce7;color:#15803d;">Sempre attiva</span>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:14px;font-weight:700;">👥 Chi siamo</div>
              <div style="font-size:12px;color:#64748b;">Storia, filosofia, team, valori</div>
            </div>
            <button class="sw-tony-btn" data-tony="pagina-chisiamo">✨ Tony scrive</button>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:14px;font-weight:700;">📋 Menu</div>
              <div style="font-size:12px;color:#64748b;">Menu completo caricato da Ristoflow, aggiornato automaticamente</div>
            </div>
            <span class="sw-tag" style="background:#dbeafe;color:#1d4ed8;">Auto da Ristoflow</span>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:14px;font-weight:700;">📍 Contatti</div>
              <div style="font-size:12px;color:#64748b;">Mappa, orari, form prenotazione, indicazioni</div>
            </div>
            <span class="sw-tag" style="background:#dbeafe;color:#1d4ed8;">Auto da Ristoflow</span>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:14px;font-weight:700;">🎉 Eventi</div>
              <div style="font-size:12px;color:#64748b;">Serate speciali, degustazioni, menu stagionali</div>
            </div>
            <button class="sw-tony-btn" data-tony="pagina-eventi">✨ Tony scrive</button>
          </div>
        </div>
      </div>

      <div class="sw-card">
        <div class="sw-field-header">
          <div class="sw-card-title" style="margin:0;">👥 Testo pagina Chi siamo</div>
          <button class="sw-tony-btn" data-tony="pagina-chisiamo">✨ Tony</button>
        </div>
        <textarea id="sw-pagina-chisiamo" class="sw-textarea" style="margin-top:12px;min-height:150px;" placeholder="Tony può generare questo testo automaticamente..."></textarea>
      </div>

      <div class="sw-card">
        <div class="sw-field-header">
          <div class="sw-card-title" style="margin:0;">🎉 Testo pagina Eventi</div>
          <button class="sw-tony-btn" data-tony="pagina-eventi">✨ Tony</button>
        </div>
        <textarea id="sw-pagina-eventi" class="sw-textarea" style="margin-top:12px;min-height:120px;" placeholder="Descrivi i vostri eventi, serate tematiche, degustazioni..."></textarea>
      </div>
    </div>

    <!-- TAB FOTO -->
    <div class="sw-panel" id="panel-foto">
      <div class="sw-card">
        <div class="sw-card-title">📸 Foto di copertina (hero)</div>
        <div class="sw-media-grid" id="grid-cover"></div>
      </div>
      <div class="sw-card">
        <div class="sw-card-title">🎬 Video — Cucina di terra</div>
        <div class="sw-media-grid" id="grid-reel-terra"></div>
      </div>
      <div class="sw-card">
        <div class="sw-card-title">🐟 Video — Cucina di mare</div>
        <div class="sw-media-grid" id="grid-reel-mare"></div>
      </div>
      <div class="sw-card">
        <div class="sw-card-title">🏠 Foto Il Locale <span style="font-size:11px;font-weight:400;color:#94a3b8;">(seleziona più foto)</span></div>
        <div class="sw-media-grid" id="grid-locale"></div>
      </div>
    </div>

    <!-- TAB SEZIONI -->
    <div class="sw-panel" id="panel-sezioni">
      <div class="sw-card">
        <div class="sw-card-title">📋 Sezioni visibili in home</div>
        <div id="sw-sezioni-list"></div>
      </div>
    </div>

    <!-- TAB PUBBLICA -->
    <div class="sw-panel" id="panel-pubblica">
      <div class="sw-card">
        <div class="sw-card-title">🌐 Dominio</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:12px;">Usa il link GitHub Pages gratuito o collega il tuo dominio.</div>
        <div id="sw-url-box" style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">URL SITO</div>
          <div id="sw-url-display" style="font-size:14px;font-weight:600;color:#0E5A7A;word-break:break-all;">—</div>
        </div>
        <div id="sw-dns-istruzioni" style="display:none;background:#f0f9ff;border-radius:10px;padding:14px;margin-bottom:12px;font-size:12px;color:#0369a1;line-height:1.8;"></div>
      </div>
      <div class="sw-card">
        <div class="sw-card-title">🚀 Pubblica</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Genera e pubblica tutte le pagine del sito su GitHub Pages.</div>
        <button id="sw-btn-pubblica-main" class="sw-pub-btn">🚀 Pubblica ora</button>
        <div id="sw-pub-status" style="display:none;" class="sw-status"></div>
      </div>
      <div class="sw-card">
        <div class="sw-card-title">📋 Checklist</div>
        <div id="sw-checklist"></div>
      </div>
    </div>
  </div>`;

  // ── SEDI ────────────────────────────────────────────────────
  async function caricaSedi() {
    const { data: sedi } = await sc.from("sedi").select("*").eq("azienda_id", aziendaId).order("nome");
    if (!sedi || sedi.length <= 1) {
      sedeSelezionata = sedi?.[0] || null;
      document.getElementById("sw-sedi-wrap").style.display = "none";
    } else {
      document.getElementById("sw-sedi-wrap").style.display = "";
      const bar = document.getElementById("sw-sedi-bar");
      bar.innerHTML = sedi.map((s, i) => `
        <button class="sw-tab${i===0?' active':''}" data-sede-id="${s.id}" style="border-radius:20px;padding:7px 16px;">
          🏠 ${s.nome}
        </button>`).join("");
      bar.querySelectorAll("button").forEach(btn => {
        btn.onclick = () => {
          bar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          sedeSelezionata = sedi.find(s => s.id === btn.dataset.sedeId);
          caricaConfig();
        };
      });
      sedeSelezionata = sedi[0];
      bar.querySelector("button")?.classList.add("active");
    }
    await caricaConfig();
  }

  // ── CARICA FORM PRENOTAZIONE ────────────────────────────────
  async function caricaFormDisponibili() {
    if (!aziendaId) return;
    const { data: forms } = await sc.from("booking_forms")
      .select("id,nome,sede_id,attivo")
      .eq("azienda_id", aziendaId)
      .eq("attivo", true)
      .order("nome");
    const sel = document.getElementById("sw-form-id");
    if (!sel) return;
    sel.innerHTML = '<option value="">— Nessun form selezionato —</option>' +
      (forms || []).map(f => `<option value="${f.id}">${f.nome}${f.sede_id ? ' 📍' : ''}</option>`).join("");
    // Preseleziona se salvato in config
    const { data: conf } = await sc.from("sito_config")
      .select("form_id").eq("azienda_id", aziendaId)
      .eq("sede_id", sedeSelezionata?.id || null).maybeSingle()
      .catch(() => ({ data: null }));
    if (conf?.form_id) sel.value = conf.form_id;
    sel.onchange = () => {
      const preview = document.getElementById("sw-form-preview");
      if (preview && sel.value) preview.textContent = `URL: https://app.ristoflow-ai.com/#/prenotazione-online?form_id=${sel.value}`;
      else if (preview) preview.textContent = "";
    };
    sel.dispatchEvent(new Event("change"));
  }
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
      <span style="font-size:14px;font-weight:600;color:#111827;">${s.label}</span>
      <button class="sw-toggle ${s.def ? 'on' : ''}" data-sezione="${s.id}"></button>
    </div>`).join("");
  sezioniList.querySelectorAll(".sw-toggle").forEach(btn => {
    btn.onclick = () => {
      btn.classList.toggle("on");
      sezioniState[btn.dataset.sezione] = btn.classList.contains("on");
      if (btn.dataset.sezione === "mare") {
        document.getElementById("sw-card-mare").style.display = btn.classList.contains("on") ? "" : "none";
      }
    };
  });

  // ── SLUG AUTO ───────────────────────────────────────────────
  document.getElementById("sw-slug").addEventListener("input", function() {
    const slug = this.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    this.value = slug;
    const url = slug ? `https://ristomanager-it.github.io/siti-clienti/${slug}/` : "—";
    document.getElementById("sw-slug-preview").textContent = slug ? url : "";
    document.getElementById("sw-url-display").textContent = url;
  });

  // ── DNS ISTRUZIONI ───────────────────────────────────────────
  document.getElementById("sw-dominio").addEventListener("input", function() {
    const dominio = this.value.trim();
    const box = document.getElementById("sw-dns-istruzioni");
    if (!dominio) { box.style.display = "none"; return; }
    const isApex = dominio.split(".").length === 2;
    box.style.display = "";
    box.innerHTML = isApex
      ? `<strong>Record DNS da aggiungere (dominio apex):</strong><br>
         Tipo A → @ → 185.199.108.153<br>
         Tipo A → @ → 185.199.109.153<br>
         Tipo A → @ → 185.199.110.153<br>
         Tipo A → @ → 185.199.111.153<br>
         Tipo CNAME → www → ristomanager-it.github.io`
      : `<strong>Record DNS da aggiungere:</strong><br>
         Tipo CNAME → ${dominio.split(".")[0]} → ristomanager-it.github.io`;
  });

  // ── IMPORT SITO ESISTENTE ───────────────────────────────────
  document.getElementById("sw-btn-import").onclick = async () => {
    const url = document.getElementById("sw-import-url").value.trim();
    const status = document.getElementById("sw-import-status");
    if (!url) return;
    status.style.display = "";
    status.textContent = "⏳ Importazione in corso...";
    try {
      // Usa Tony AI per estrarre info dal sito
      const prompt = `Analizza il sito web all'URL: ${url}
Estrai queste informazioni in formato JSON:
{
  "nome": "nome del locale",
  "hero_titolo": "titolo principale della home",
  "hero_sub": "sottotitolo o tagline",
  "chisiamo_1": "primo paragrafo chi siamo",
  "chisiamo_2": "secondo paragrafo",
  "telefono": "numero di telefono",
  "email": "email",
  "indirizzo": "indirizzo completo",
  "orari_pranzo": "orari pranzo",
  "orari_cena": "orari cena"
}
Rispondi SOLO con il JSON, nessun testo aggiuntivo.`;

      const session = window.supabaseClient?.auth ? (await window.supabaseClient.auth.getSession())?.data?.session : null;
      const token = session?.access_token || ANON_KEY;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/assistente-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": token,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], azienda_id: aziendaId })
      });
      const data = await res.json();
      const reply = data.reply || data.content?.[0]?.text || "";
      const clean = reply.replace(/```json|```/g, "").trim();
      const info = JSON.parse(clean);

      // Precompila i campi
      if (info.nome) document.getElementById("sw-nome").value = info.nome;
      if (info.hero_titolo) document.getElementById("sw-hero-titolo").value = info.hero_titolo;
      if (info.hero_sub) document.getElementById("sw-hero-sub").value = info.hero_sub;
      if (info.chisiamo_1) document.getElementById("sw-chisiamo-1").value = info.chisiamo_1;
      if (info.chisiamo_2) document.getElementById("sw-chisiamo-2").value = info.chisiamo_2;
      if (info.telefono) document.getElementById("sw-telefono").value = info.telefono;
      if (info.email) document.getElementById("sw-email").value = info.email;
      if (info.indirizzo) document.getElementById("sw-indirizzo").value = info.indirizzo;
      if (info.orari_pranzo) document.getElementById("sw-pranzo").value = info.orari_pranzo;
      if (info.orari_cena) document.getElementById("sw-cena").value = info.orari_cena;

      status.textContent = "✅ Importato! Rivedi i campi e pubblica.";
      status.style.color = "#15803d";
    } catch(e) {
      status.textContent = "❌ Errore importazione — inserisci i dati manualmente";
      status.style.color = "#dc2626";
    }
  };

  async function chiamaTony(sezione) {
    const conf = leggiForm();
    const nomeLocale = conf.nome || sedeSelezionata?.nome || window.state?.azienda?.nome || "il locale";
    const sedeIdCorrente = sedeSelezionata?.id || null;

    if (!sedeIdCorrente) {
      alert("⚠️ Seleziona prima la sede per cui vuoi creare il sito, poi usa Tony.");
      return;
    }

    // Carica menu filtrato per sede
    const { data: menuSede } = await sc.from("menu")
      .select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeIdCorrente);
    const menuIds = (menuSede || []).map(m => m.id);

    const { data: menuCatsRaw } = await sc.from("menu_categorie").select("id,nome,menu_id")
      .eq("azienda_id", aziendaId);
    const menuCatsRes = menuIds.length
      ? (menuCatsRaw || []).filter(c => menuIds.includes(c.menu_id))
      : (menuCatsRaw || []);

    const { data: menuVociRaw } = await sc.from("menu_voci").select("id,nome,descrizione,prezzo,categoria_id")
      .eq("azienda_id", aziendaId).eq("disponibile", true).order("ordine").limit(80);
    const menuVociRes = menuVociRaw || [];

    const top3 = "";
    const topCatTesto = "";

    // Prova a leggere top venduti (opzionale - non blocca se fallisce)
    let topVendutiTesto = "";
    try {
      const { data: vendite } = await sc.from("vendite_giornaliere")
        .select("nome_articolo,quantita")
        .eq("azienda_id", aziendaId)
        .eq("sede_uuid", sedeIdCorrente)
        .gte("data_vendita", new Date(Date.now() - 30*86400000).toISOString().split("T")[0])
        .limit(500);
      if (vendite?.length) {
        const topMap = new Map();
        for (const v of vendite) {
          const k = v.nome_articolo || "?";
          topMap.set(k, (topMap.get(k) || 0) + (v.quantita || 1));
        }
        topVendutiTesto = [...topMap.entries()].sort((a,b) => b[1]-a[1]).slice(0,3)
          .map(([nome, qty]) => `${nome} (${qty} pz)`).join(", ");
      }
    } catch(e) { /* vendite non disponibili - non blocca */ }

    // Menu strutturato
    const menuTesto = menuCatsRes.map(c => {
      const voci = menuVociRes.filter(v => v.categoria_id === c.id)
        .map(v => `  - ${v.nome}${v.prezzo ? ` €${Number(v.prezzo).toFixed(2)}` : ""}${v.descrizione ? ` (${v.descrizione})` : ""}`)
        .join("\n");
      return voci ? `${c.nome}:\n${voci}` : null;
    }).filter(Boolean).join("\n\n");

    // Contesto reale completo — SEDE specifica
    const ctx = [
      `Nome locale: ${nomeLocale}`,
      sedeSelezionata?.indirizzo ? `Indirizzo: ${sedeSelezionata.indirizzo}` : "",
      sedeSelezionata?.citta     ? `Città: ${sedeSelezionata.citta}` : "",
      sedeSelezionata?.telefono  ? `Telefono: ${sedeSelezionata.telefono}` : "",
      _identita?.gc_why        ? `WHY: ${_identita.gc_why}` : "",
      _identita?.gc_how        ? `HOW: ${_identita.gc_how}` : "",
      _identita?.gc_what       ? `WHAT: ${_identita.gc_what}` : "",
      _identita?.tone_of_voice ? `Tone of voice: ${_identita.tone_of_voice}` : "",
      _identita?.posizionamento? `Posizionamento: ${_identita.posizionamento}` : "",
      _identita?.cliente_ideale? `Cliente ideale: ${_identita.cliente_ideale}` : "",
      _identita?.differenziazione? `Differenziazione: ${_identita.differenziazione}` : "",
      _profilo?.testo_sede     ? `Descrizione locale: ${_profilo.testo_sede}` : "",
      _profilo?.orari_pranzo   ? `Orari pranzo: ${_profilo.orari_pranzo}` : "",
      _profilo?.orari_cena     ? `Orari cena: ${_profilo.orari_cena}` : "",
      _profilo?.indirizzo      ? `Indirizzo: ${_profilo.indirizzo}` : "",
      _profilo?.telefono       ? `Telefono: ${_profilo.telefono}` : "",
      conf.chisiamo_1          ? `Chi siamo (già scritto): ${conf.chisiamo_1}` : "",
      conf.mare_quote          ? `Filosofia mare (già scritta): ${conf.mare_quote}` : "",
      conf.indirizzo           ? `Indirizzo: ${conf.indirizzo}` : "",
      conf.orari_pranzo        ? `Orari pranzo: ${conf.orari_pranzo}` : "",
      conf.orari_cena          ? `Orari cena: ${conf.orari_cena}` : "",
      sedeSelezionata?.nome    ? `Sede: ${sedeSelezionata.nome}` : "",
      topVendutiTesto              ? `Top 3 piatti più venduti (30gg): ${topVendutiTesto}` : "",
      menuTesto                ? `\nMENU COMPLETO:\n${menuTesto}` : "",
    ].filter(Boolean).join("\n");

    const prompts = {
      hero: `Sei un esperto di marketing per ristoranti italiani.
Il locale si chiama ESATTAMENTE: "${nomeLocale}"
NON usare mai altri nomi — non "Campo Antico", non nomi inventati.

Dati reali:
${ctx}

Scrivi UN titolo hero (max 8 parole) e UN sottotitolo (max 15 parole) per "${nomeLocale}".
Il titolo deve contenere riferimenti specifici a questo locale, non generici.
Rispondi SOLO con JSON: {"hero_titolo":"...","hero_sub":"..."}`,

      highlights: `Sei un esperto di marketing per ristoranti italiani.
Il locale si chiama ESATTAMENTE: "${nomeLocale}"
NON usare mai altri nomi.

Dati reali:
${ctx}

Scrivi 3 punti di forza SPECIFICI per "${nomeLocale}" basati sui dati forniti.
Rispondi SOLO con JSON: {"hl1":{"titolo":"...","testo":"..."},"hl2":{"titolo":"...","testo":"..."},"hl3":{"titolo":"...","testo":"..."}}`,

      chisiamo: `Sei un esperto di copywriting per ristoranti italiani.
Il locale si chiama ESATTAMENTE: "${nomeLocale}"
NON usare mai "Campo Antico" o altri nomi — solo "${nomeLocale}".

Dati reali:
${ctx}

Scrivi 2 paragrafi "chi siamo" per "${nomeLocale}". Tono caldo, autentico. Max 60 parole ciascuno.
Rispondi SOLO con JSON: {"p1":"...","p2":"..."}`,

      mare: `Sei un esperto di copywriting per ristoranti italiani.
Il locale si chiama ESATTAMENTE: "${nomeLocale}"

Dati reali:
${ctx}

Scrivi una citazione filosofica sul mare (max 2 righe, elegante) e un paragrafo (max 40 parole) per "${nomeLocale}".
Rispondi SOLO con JSON: {"quote":"...","testo":"..."}`,

      "pagina-chisiamo": `Sei un esperto di copywriting per ristoranti italiani.
Il locale si chiama ESATTAMENTE: "${nomeLocale}"
NON usare mai altri nomi — solo "${nomeLocale}".

Dati reali:
${ctx}

Scrivi il testo completo della pagina "Chi siamo" per "${nomeLocale}". 3-4 paragrafi, tono autentico.
Rispondi con il testo diretto, no JSON.`,

      "pagina-eventi": `Sei un esperto di copywriting per ristoranti italiani.
Il locale si chiama ESATTAMENTE: "${nomeLocale}"

Dati reali:
${ctx}

Scrivi il testo introduttivo della pagina "Eventi" per "${nomeLocale}". 2 paragrafi.
Rispondi con il testo diretto, no JSON.`,
    };

    const prompt = prompts[sezione];
    if (!prompt) return;

    const session = window.supabaseClient?.auth ? (await window.supabaseClient.auth.getSession())?.data?.session : null;
    const token = session?.access_token || ANON_KEY;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/assistente-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": token,
      },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], azienda_id: aziendaId })
    });
    const data = await res.json();
    const reply = (data.reply || data.content?.[0]?.text || "").trim();

    try {
      const clean = reply.replace(/```json|```/g, "").trim();
      const json = JSON.parse(clean);

      if (sezione === "hero") {
        if (json.hero_titolo) document.getElementById("sw-hero-titolo").value = json.hero_titolo;
        if (json.hero_sub) document.getElementById("sw-hero-sub").value = json.hero_sub;
      } else if (sezione === "highlights") {
        if (json.hl1) { document.getElementById("sw-hl1-titolo").value = json.hl1.titolo||""; document.getElementById("sw-hl1-testo").value = json.hl1.testo||""; }
        if (json.hl2) { document.getElementById("sw-hl2-titolo").value = json.hl2.titolo||""; document.getElementById("sw-hl2-testo").value = json.hl2.testo||""; }
        if (json.hl3) { document.getElementById("sw-hl3-titolo").value = json.hl3.titolo||""; document.getElementById("sw-hl3-testo").value = json.hl3.testo||""; }
      } else if (sezione === "chisiamo") {
        if (json.p1) document.getElementById("sw-chisiamo-1").value = json.p1;
        if (json.p2) document.getElementById("sw-chisiamo-2").value = json.p2;
      } else if (sezione === "mare") {
        if (json.quote) document.getElementById("sw-mare-quote").value = json.quote;
        if (json.testo) document.getElementById("sw-mare-testo").value = json.testo;
      }
    } catch {
      // Testo libero
      if (sezione === "pagina-chisiamo") document.getElementById("sw-pagina-chisiamo").value = reply;
      if (sezione === "pagina-eventi") document.getElementById("sw-pagina-eventi").value = reply;
    }
  }

  // Bind pulsanti Tony
  container.querySelectorAll("[data-tony]").forEach(btn => {
    btn.onclick = async function() {
      const sezione = this.dataset.tony;
      const origText = this.textContent;
      this.textContent = "⏳..."; this.disabled = true;
      try { await chiamaTony(sezione); } finally {
        this.textContent = origText; this.disabled = false;
      }
    };
  });

  // Tony genera tutto
  document.getElementById("sw-btn-tony-all").onclick = async function() {
    this.textContent = "⏳ Tony sta scrivendo..."; this.disabled = true;
    try {
      await chiamaTony("hero");
      await chiamaTony("highlights");
      await chiamaTony("chisiamo");
      if (sezioniState.mare) await chiamaTony("mare");
    } finally {
      this.textContent = "✨ Tony genera tutto"; this.disabled = false;
    }
  };

  // ── ANTEPRIMA LOCALE ─────────────────────────────────────────
  document.getElementById("sw-btn-preview").onclick = async function() {
    this.textContent = "⏳..."; this.disabled = true;
    try {
      const conf = leggiForm();
      const html = await generaHTML(conf);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch(e) {
      alert("Errore anteprima: " + e.message);
    } finally {
      this.textContent = "👁 Anteprima"; this.disabled = false;
    }
  };

  // ── MEDIA ───────────────────────────────────────────────────
  async function caricaMedia() {
    if (!aziendaId) return;
    const sedeFiltro = sedeSelezionata?.id || null;

    let q = sc.from("media_library").select("*").eq("azienda_id", aziendaId);
    if (sedeFiltro) q = q.eq("sede_id", sedeFiltro);
    q = q.order("created_at", { ascending: false });

    const { data } = await q;
    allMedia = data || [];
    const imgs  = allMedia.filter(m => m.tipo === "immagine");
    const video = allMedia.filter(m => m.tipo === "video");
    renderGrigliaMedia("grid-cover", imgs, "cover", false);
    renderGrigliaMedia("grid-reel-terra", video, "reelTerra", false);
    renderGrigliaMedia("grid-reel-mare", video, "reelMare", false);
    renderGrigliaMedia("grid-locale", imgs, "locale", true);
  }

  function renderGrigliaMedia(gridId, media, key, multi) {
    const grid = document.getElementById(gridId);
    if (!media.length) { grid.innerHTML = `<div style="color:#94a3b8;font-size:13px;grid-column:1/-1;padding:12px;">Nessun media — carica dalla Media Library 🖼️</div>`; return; }
    grid.innerHTML = media.map(m => {
      const isV = m.tipo === "video";
      const isSel = multi ? fotoSel[key].includes(m.url) : fotoSel[key] === m.url;
      return `<div class="sw-media-item${isSel?' selected':''}" data-url="${m.url}" data-key="${key}">
        ${isV ? `<video src="${m.url}" muted preload="metadata"></video>` : `<img src="${m.url}" alt="${m.nome}" loading="lazy">`}
        <div class="sw-media-check">✓</div>
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:white;font-size:9px;padding:3px 5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${m.nome||""}</div>
      </div>`;
    }).join("");
    grid.querySelectorAll(".sw-media-item").forEach(el => {
      el.onclick = () => {
        if (multi) {
          el.classList.toggle("selected");
          if (el.classList.contains("selected")) fotoSel[key].push(el.dataset.url);
          else fotoSel[key] = fotoSel[key].filter(u => u !== el.dataset.url);
        } else {
          grid.querySelectorAll(".sw-media-item").forEach(x => x.classList.remove("selected"));
          el.classList.add("selected");
          fotoSel[key] = el.dataset.url;
        }
      };
    });
  }

  // ── LEGGI FORM ───────────────────────────────────────────────
  function leggiForm() {
    const g = id => document.getElementById(id)?.value?.trim() || "";
    return {
      form_id:       document.getElementById("sw-form-id")?.value || null,
      slug:        g("sw-slug"),
      dominio:     g("sw-dominio") || null,
      hero_titolo: g("sw-hero-titolo"),
      hero_sub:    g("sw-hero-sub"),
      hero_cta:    g("sw-hero-cta") || "Prenota un tavolo",
      hl1: { titolo: g("sw-hl1-titolo"), testo: g("sw-hl1-testo") },
      hl2: { titolo: g("sw-hl2-titolo"), testo: g("sw-hl2-testo") },
      hl3: { titolo: g("sw-hl3-titolo"), testo: g("sw-hl3-testo") },
      chisiamo_1:  g("sw-chisiamo-1"),
      chisiamo_2:  g("sw-chisiamo-2"),
      mare_quote:  g("sw-mare-quote"),
      mare_testo:  g("sw-mare-testo"),
      telefono:    g("sw-telefono"),
      email:       g("sw-email"),
      indirizzo:   g("sw-indirizzo"),
      orari_pranzo: g("sw-pranzo"),
      orari_cena:  g("sw-cena"),
      piva:        g("sw-piva"),
      pagina_chisiamo: g("sw-pagina-chisiamo"),
      pagina_eventi:   g("sw-pagina-eventi"),
      foto_cover:      fotoSel.cover,
      foto_reel_terra: fotoSel.reelTerra,
      foto_reel_mare:  fotoSel.reelMare,
      foto_locale:     fotoSel.locale,
      sezioni:         { ...sezioniState },
    };
  }

  // ── CARICA CONFIG ────────────────────────────────────────────
  async function caricaConfig() {
    if (!aziendaId) return;
    const sedeIdCorrente = sedeSelezionata?.id || null;

    const [{ data: az }, { data: profilo }, { data: conf }] = await Promise.all([
      sc.from("aziende").select("nome,telefono,indirizzo,citta,email_pubblica").eq("id", aziendaId).maybeSingle(),
      sc.from("azienda_profilo_pubblico").select("testo_sede,testo_orari,indirizzo,citta,telefono,email,cover_url,foto_galleria,google_maps_url,lat,lng").eq("azienda_id", aziendaId).maybeSingle(),
      sedeIdCorrente
        ? sc.from("sito_config").select("*").eq("azienda_id", aziendaId).eq("sede_id", sedeIdCorrente).maybeSingle()
        : sc.from("sito_config").select("*").eq("azienda_id", aziendaId).is("sede_id", null).maybeSingle(),
    ]);

    // Carica identita per Tony
    const { data: identita } = await sc.from("azienda_identita")
      .select("gc_why,gc_how,gc_what,tone_of_voice,posizionamento,cliente_ideale,differenziazione")
      .eq("azienda_id", aziendaId).maybeSingle();
    _identita = identita || null;
    _profilo  = profilo || null;

    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };

    // Precompila da dati Ristoflow
    if (az) {
      set("sw-nome", conf?.nome || sedeSelezionata?.nome || az.nome);
      set("sw-telefono", conf?.telefono || profilo?.telefono || sedeSelezionata?.telefono || az.telefono);
      set("sw-indirizzo", conf?.indirizzo || [profilo?.indirizzo || sedeSelezionata?.indirizzo || az.indirizzo, profilo?.citta || sedeSelezionata?.citta || az.citta].filter(Boolean).join(", "));
      set("sw-email", conf?.email || profilo?.email || az.email_pubblica);
    }
    if (profilo?.testo_sede && !conf?.chisiamo_1) set("sw-chisiamo-1", profilo.testo_sede);
    if (profilo?.testo_orari && !conf?.orari_pranzo) {
      // Prova a estrarre orari dal testo libero
      const testo = profilo.testo_orari || "";
      const pranzoMatch = testo.match(/pranzo[:\s]+([0-9:]+\s*[-–]\s*[0-9:]+)/i);
      const cenaMatch   = testo.match(/cena[:\s]+([0-9:]+\s*[-–]\s*[0-9:]+)/i);
      if (pranzoMatch) set("sw-pranzo", pranzoMatch[1].trim());
      if (cenaMatch)   set("sw-cena", cenaMatch[1].trim());
    }
    // Usa cover dalla sede se non c'è foto cover nel config
    if (!conf?.foto_cover && !fotoSel.cover) {
      if (sedeSelezionata?.cover_url) fotoSel.cover = sedeSelezionata.cover_url;
      else if (profilo?.cover_url) fotoSel.cover = profilo.cover_url;
    }

    // Carica config sito salvata
    if (conf) {
      set("sw-slug", conf.slug);
      set("sw-dominio", conf.dominio);
      set("sw-hero-titolo", conf.hero_titolo);
      set("sw-hero-sub", conf.hero_sub);
      set("sw-hero-cta", conf.hero_cta);
      set("sw-chisiamo-1", conf.chisiamo_1);
      set("sw-chisiamo-2", conf.chisiamo_2);
      set("sw-mare-quote", conf.mare_quote);
      set("sw-mare-testo", conf.mare_testo);
      set("sw-pranzo", conf.orari_pranzo);
      set("sw-cena", conf.orari_cena);
      set("sw-piva", conf.piva);
      set("sw-pagina-chisiamo", conf.pagina_chisiamo);
      set("sw-pagina-eventi", conf.pagina_eventi);
      if (conf.hl1) { set("sw-hl1-titolo", conf.hl1.titolo); set("sw-hl1-testo", conf.hl1.testo); }
      if (conf.hl2) { set("sw-hl2-titolo", conf.hl2.titolo); set("sw-hl2-testo", conf.hl2.testo); }
      if (conf.hl3) { set("sw-hl3-titolo", conf.hl3.titolo); set("sw-hl3-testo", conf.hl3.testo); }
      if (conf.sezioni) Object.assign(sezioniState, conf.sezioni);
      if (conf.foto_cover) fotoSel.cover = conf.foto_cover;
      if (conf.foto_reel_terra) fotoSel.reelTerra = conf.foto_reel_terra;
      if (conf.foto_reel_mare) fotoSel.reelMare = conf.foto_reel_mare;
      if (conf.foto_locale) fotoSel.locale = conf.foto_locale;
      if (conf.slug) document.getElementById("sw-slug").dispatchEvent(new Event("input"));
      if (conf.dominio) document.getElementById("sw-dominio").dispatchEvent(new Event("input"));
    }
  }

  async function salvaConfig() {
    if (!aziendaId) return;
    const conf = leggiForm();
    const sedeIdCorrente = sedeSelezionata?.id || null;
    if (!sedeIdCorrente) { alert("Seleziona una sede prima di salvare."); return; }

    const payload = {
      azienda_id: aziendaId,
      sede_id: sedeIdCorrente,
      slug: conf.slug,
      nome: conf.nome,
      dominio: conf.dominio,
      form_id: conf.form_id || null,
      hero_titolo: conf.hero_titolo,
      hero_sub: conf.hero_sub,
      hero_cta: conf.hero_cta,
      hl1: conf.hl1,
      hl2: conf.hl2,
      hl3: conf.hl3,
      chisiamo_1: conf.chisiamo_1,
      chisiamo_2: conf.chisiamo_2,
      mare_quote: conf.mare_quote,
      mare_testo: conf.mare_testo,
      telefono: conf.telefono,
      email: conf.email,
      indirizzo: conf.indirizzo,
      orari_pranzo: conf.orari_pranzo,
      orari_cena: conf.orari_cena,
      piva: conf.piva,
      pagina_chisiamo: conf.pagina_chisiamo,
      pagina_eventi: conf.pagina_eventi,
      foto_cover: conf.foto_cover,
      foto_reel_terra: conf.foto_reel_terra,
      foto_reel_mare: conf.foto_reel_mare,
      foto_locale: conf.foto_locale,
      sezioni: conf.sezioni,
      updated_at: new Date().toISOString()
    };

    // Prova a fare update prima, poi insert se non esiste
    const { data: existing } = await sc.from("sito_config")
      .select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeIdCorrente).maybeSingle();

    if (existing?.id) {
      await sc.from("sito_config").update(payload).eq("id", existing.id);
    } else {
      await sc.from("sito_config").insert(payload);
    }
  }

  // ── CHECKLIST ────────────────────────────────────────────────
  function aggiornaChecklist() {
    const conf = leggiForm();
    const items = [
      { label: "Slug URL",      ok: !!conf.slug },
      { label: "Titolo hero",   ok: !!conf.hero_titolo },
      { label: "Chi siamo",     ok: !!conf.chisiamo_1 },
      { label: "Telefono",      ok: !!conf.telefono },
      { label: "Foto cover",    ok: !!conf.foto_cover },
      { label: "Orari",         ok: !!(conf.orari_pranzo || conf.orari_cena) },
    ];
    document.getElementById("sw-checklist").innerHTML = items.map(i =>
      `<div class="sw-checklist-item">
        <span style="color:${i.ok?'#15803d':'#dc2626'};font-size:16px;">${i.ok?'✅':'⭕'}</span>
        <span style="color:${i.ok?'#374151':'#94a3b8'};font-size:13px;">${i.label}</span>
      </div>`
    ).join("");
  }

  // ── GENERA HTML ──────────────────────────────────────────────
  async function generaHTML(conf) {
    const sedeIdCorrente = sedeSelezionata?.id || null;

    const [{ data: identita }, { data: az2 }] = await Promise.all([
      sc.from("azienda_identita")
        .select("gc_why,gc_how,gc_what,tone_of_voice,posizionamento")
        .eq("azienda_id", aziendaId).maybeSingle(),
      sc.from("aziende")
        .select("logo_url,colore_brand")
        .eq("id", aziendaId).maybeSingle(),
    ]);

    // Booking form — usa quello scelto nel pannello (priorità), poi cerca per sede
    let formId = conf.form_id || null;
    if (!formId && sedeIdCorrente) {
      const { data: formSede } = await sc.from("booking_forms")
        .select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeIdCorrente).eq("attivo", true).limit(1).maybeSingle();
      formId = formSede?.id;
    }
    if (!formId) {
      const { data: formAny } = await sc.from("booking_forms")
        .select("id").eq("azienda_id", aziendaId).eq("attivo", true).limit(1).maybeSingle();
      formId = formAny?.id;
    }
    const formUrl = formId
      ? `https://app.ristoflow-ai.com/#/prenotazione-online?form_id=${formId}`
      : "#";

    // Dati sede — priorità: config form > sede > profilo pubblico
    const { data: sedeDati } = sedeIdCorrente
      ? await sc.from("sedi").select("nome,telefono,indirizzo,citta,logo_url,cover_url,lat,lng,orari_apertura,descrizione,colore_brand,colore_secondario").eq("id", sedeIdCorrente).maybeSingle()
      : { data: null };

    const { data: profiloPub } = await sc.from("azienda_profilo_pubblico")
      .select("indirizzo,citta,telefono,email,google_maps_url,lat,lng,cover_url")
      .eq("azienda_id", aziendaId).maybeSingle();

    const gen_telefono  = conf.telefono  || sedeDati?.telefono  || profiloPub?.telefono  || "";
    const gen_email     = conf.email     || profiloPub?.email   || "";
    const gen_indirizzo = conf.indirizzo || [sedeDati?.indirizzo || profiloPub?.indirizzo, sedeDati?.citta || profiloPub?.citta].filter(Boolean).join(", ") || "";
    const mapsUrl       = profiloPub?.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(gen_indirizzo)}`;

    // Menu filtrato per sede
    let menuCats = [], menuVoci = [];
    if (sedeIdCorrente) {
      const { data: menuSede } = await sc.from("menu")
        .select("id").eq("azienda_id", aziendaId).eq("sede_id", sedeIdCorrente).eq("attivo", true);
      const menuIds = (menuSede || []).map(m => m.id);
      if (menuIds.length) {
        const { data: cats } = await sc.from("menu_categorie")
          .select("id,nome,menu_id").in("menu_id", menuIds).order("ordine").limit(15);
        menuCats = cats || [];
        const catIds = menuCats.map(c => c.id);
        if (catIds.length) {
          const { data: voci } = await sc.from("menu_voci")
            .select("id,nome,descrizione,prezzo,categoria_id")
            .in("categoria_id", catIds).eq("disponibile", true).order("ordine").limit(60);
          menuVoci = voci || [];
        }
      }
    } else {
      const { data: cats } = await sc.from("menu_categorie")
        .select("id,nome").eq("azienda_id", aziendaId).order("ordine").limit(15);
      menuCats = cats || [];
      const { data: voci } = await sc.from("menu_voci")
        .select("id,nome,descrizione,prezzo,categoria_id").eq("azienda_id", aziendaId)
        .eq("disponibile", true).order("ordine").limit(60);
      menuVoci = voci || [];
    }

    const logo        = sedeDati?.logo_url || az2?.logo_url || "";
    const colore      = sedeDati?.colore_brand      || az2?.colore_brand      || "#794d01";
    const coloreLight = sedeDati?.colore_secondario || az2?.colore_brand      || "#c4892a";
    const lat         = sedeDati?.lat || profiloPub?.lat || 42.4597;
    const lng         = sedeDati?.lng || profiloPub?.lng || 12.3857;
    const esc = v => String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const nome = conf.nome || sedeSelezionata?.nome || "Ristorante";
    const ctaTesto = conf.hero_cta || "Prenota un tavolo";
    const slug = conf.slug || "sito";

    const cssBase = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --oro:${coloreLight};
  --oro-btn:${colore};
  --oro-btn-hover:${colore}dd;
  --scuro:#1A1209;
  --caldo:#F5EFE4;
  --grigio:#6B5E4E;
  --bianco:#fff
}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,sans-serif;background:#fff;color:var(--scuro);overflow-x:hidden}
a{color:inherit;text-decoration:none}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(26,18,9,.9);backdrop-filter:blur(12px)}
.nav-logo{display:flex;align-items:center;gap:8px}
.nav-logo img{width:30px;height:30px;border-radius:50%;object-fit:cover}
.nav-logo span{font-family:'Cormorant Garamond',serif;font-size:15px;color:var(--oro);letter-spacing:.3px}
.nav-links{display:flex;gap:18px}
.nav-links a{font-size:12px;color:rgba(255,255,255,.7);letter-spacing:.4px;transition:color .2s}
.nav-links a:hover{color:var(--oro)}
.nav-cta{background:var(--oro-btn);color:#fff;font-size:12px;font-weight:800;padding:8px 16px;border-radius:6px;letter-spacing:.3px;transition:opacity .2s}
.nav-cta:hover{opacity:.9}
@media(max-width:600px){.nav-links{display:none}}
.cta-bar{position:sticky;bottom:0;z-index:90;display:flex;background:var(--scuro);border-top:1px solid rgba(196,137,42,.3)}
.cta-bar a{flex:1;padding:14px 8px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.4px;transition:background .2s}
.cta-prenota{background:var(--oro-btn);color:#fff}
.cta-prenota:hover{background:var(--oro-btn-hover)}
.cta-chiama{background:#1e3a14;color:#7ed370}
.cta-menu-link{background:#1e1e1e;color:rgba(255,255,255,.8)}
.section{padding:72px 20px;max-width:700px;margin:0 auto}
.section-full{padding:72px 0;max-width:100%}
.eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--oro);margin-bottom:10px;font-weight:600}
.h2{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,5vw,44px);font-weight:600;line-height:1.1;margin-bottom:16px}
.h2 em{font-style:italic;color:var(--oro)}
.body-text{font-size:14px;color:var(--grigio);line-height:1.85}
.body-text p+p{margin-top:12px}
.cta-inline{display:inline-block;background:var(--oro-btn);color:#fff;font-weight:800;font-size:14px;padding:13px 28px;border-radius:8px;letter-spacing:.3px;margin-top:20px;transition:opacity .2s}
.cta-inline:hover{opacity:.9}
.cta-inline-ghost{display:inline-block;border:1.5px solid var(--oro-btn);color:var(--oro-btn);font-size:14px;font-weight:600;padding:13px 24px;border-radius:8px;margin-top:20px;margin-left:10px}
.hl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:24px}
.hl-card{background:#f8fafc;border-radius:14px;padding:20px;text-align:center}
.hl-icon{font-size:32px;margin-bottom:10px}
.hl-titolo{font-size:14px;font-weight:800;color:#111827;margin-bottom:4px}
.hl-testo{font-size:12px;color:var(--grigio);line-height:1.5}
.reel-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px}
@media(max-width:500px){.reel-grid{grid-template-columns:1fr}}
.reel-item{position:relative;aspect-ratio:9/16;overflow:hidden;background:var(--scuro)}
.reel-item video,.reel-item img{width:100%;height:100%;object-fit:cover}
.reel-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(26,18,9,.75) 0%,transparent 50%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
.reel-label{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#fff;margin-bottom:3px}
.reel-sub{font-size:10px;letter-spacing:2px;color:var(--oro);text-transform:uppercase}
.mare-section{background:var(--scuro);color:#fff;padding:72px 20px}
.mare-inner{max-width:700px;margin:0 auto}
.mare-quote{font-family:'Cormorant Garamond',serif;font-size:clamp(20px,4vw,34px);font-style:italic;line-height:1.4;margin-bottom:24px;border-left:2px solid var(--oro);padding-left:20px}
.mare-body{font-size:14px;color:rgba(255,255,255,.65);line-height:1.9}
.menu-section{background:var(--caldo);padding:72px 20px}
.menu-inner{max-width:700px;margin:0 auto}
.menu-cats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
.menu-cat-btn{padding:6px 14px;border-radius:20px;border:1.5px solid #c9b89a;background:transparent;font-size:12px;color:var(--grigio);cursor:pointer;font-family:inherit;transition:all .15s}
.menu-cat-btn.active{background:var(--oro-btn);border-color:var(--oro-btn);color:#fff;font-weight:700}
.menu-item{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;border-bottom:1px solid #d8ccba;gap:12px}
.menu-item:last-child{border-bottom:none}
.menu-item-nome{font-size:14px;font-weight:500}
.menu-item-desc{font-size:11px;color:var(--grigio);margin-top:2px;line-height:1.4}
.menu-item-prezzo{font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--oro);font-weight:600;white-space:nowrap}
.locale-img{width:100%;height:280px;object-fit:cover;display:block}
.reviews-bg{background:var(--caldo);padding:72px 20px}
.review-card{background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.review-text{font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;line-height:1.6;margin-bottom:10px}
.stars{color:var(--oro);letter-spacing:2px;font-size:13px;margin-bottom:6px}
.map-section{background:var(--scuro);padding:72px 20px}
.map-inner{max-width:700px;margin:0 auto;color:#fff}
.map-infos{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
@media(max-width:480px){.map-infos{grid-template-columns:1fr}}
.map-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--oro);margin-bottom:3px}
.map-val{font-size:13px;color:rgba(255,255,255,.8);line-height:1.5}
.map-val a{color:var(--oro)}
footer{background:#0e0a04;padding:36px 20px;text-align:center}
.footer-logo{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--oro);margin-bottom:10px;font-style:italic}
.footer-links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
.footer-links a{font-size:11px;color:rgba(255,255,255,.35)}
.footer-copy{font-size:10px;color:rgba(255,255,255,.2)}`;

    const head = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(conf.chisiamo_1?.slice(0,150)||conf.hero_sub||'')}">
<meta property="og:title" content="${esc(nome)}">
<meta property="og:image" content="${esc(conf.foto_cover||'')}">
<title>${esc(nome)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>${cssBase}</style>
</head>`;

    const nav = `<nav class="nav">
  <a class="nav-logo" href="index.html">
    ${logo ? `<img src="${esc(logo)}" alt="Logo">` : ""}
    <span>${esc(nome)}</span>
  </a>
  <div class="nav-links">
    <a href="index.html">Home</a>
    <a href="chi-siamo.html">Chi siamo</a>
    <a href="menu.html">Menu</a>
    ${sezioniState.eventi ? '<a href="eventi.html">Eventi</a>' : ""}
    <a href="contatti.html">Contatti</a>
  </div>
  <a class="nav-cta" href="${esc(formUrl)}">${esc(ctaTesto)}</a>
</nav>`;

    const ctaBar = `<div class="cta-bar">
  <a class="cta-prenota" href="${esc(formUrl)}">🗓 ${esc(ctaTesto)}</a>
  ${gen_telefono ? `<a class="cta-chiama" href="tel:${esc(gen_telefono)}">📞 Chiama</a>` : ""}
  <a class="cta-menu-link" href="menu.html">📋 Menu</a>
</div>`;

    const footer = `<footer>
  <div class="footer-logo">${esc(nome)}</div>
  <div class="footer-links">
    <a href="index.html">Home</a>
    <a href="chi-siamo.html">Chi siamo</a>
    <a href="menu.html">Menu</a>
    <a href="contatti.html">Contatti</a>
    <a href="${esc(formUrl)}">${esc(ctaTesto)}</a>
  </div>
  <div class="footer-copy">© ${new Date().getFullYear()} ${esc(nome)}${conf.piva ? ` — P.IVA ${esc(conf.piva)}` : ""}</div>
</footer>`;

    const menuItemsHTML = (menuCats||[]).map((c,i) => `
      <div class="menu-cat" data-cat="${c.id}" style="${i>0?'display:none':''}">
        ${(menuVoci||[]).filter(v=>v.categoria_id===c.id).map(v=>`
          <div class="menu-item">
            <div><div class="menu-item-nome">${esc(v.nome)}</div>${v.descrizione?`<div class="menu-item-desc">${esc(v.descrizione)}</div>`:""}</div>
            ${v.prezzo?`<div class="menu-item-prezzo">€ ${Number(v.prezzo).toFixed(2)}</div>`:""}
          </div>`).join("")}
      </div>`).join("");

    const menuScript = `<script>
function filtraMenu(id,btn){
  document.querySelectorAll('.menu-cat').forEach(el=>el.style.display='none');
  document.querySelectorAll('.menu-cat-btn').forEach(b=>b.classList.remove('active'));
  const el=document.querySelector('.menu-cat[data-cat="'+id+'"]');
  if(el)el.style.display='';
  if(btn)btn.classList.add('active');
}
</script>`;

    // ── HOME ──────────────────────────────────────────────────
    const homeHTML = `${head}
<body>
${nav}

<!-- HERO -->
<div style="position:relative;height:100svh;min-height:580px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:80px;text-align:center;overflow:hidden;">
  <div style="position:absolute;inset:0;background:var(--scuro);">
    ${conf.foto_cover ? `<img src="${esc(conf.foto_cover)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55;" alt="">` : ""}
  </div>
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 60%);"></div>
  <div style="position:relative;z-index:2;padding:0 20px;">
    <div class="eyebrow">Orte · A1 · Parcheggio gratuito</div>
    <h1 class="h2" style="color:#fff;font-size:clamp(38px,8vw,72px);margin-bottom:16px;">${esc(conf.hero_titolo||nome)}</h1>
    ${conf.hero_sub ? `<p style="font-size:14px;color:rgba(255,255,255,.75);margin-bottom:28px;line-height:1.6;max-width:420px;margin-left:auto;margin-right:auto;">${esc(conf.hero_sub)}</p>` : ""}
    <a class="cta-inline" href="${esc(formUrl)}" style="font-size:16px;padding:16px 36px;">🗓 ${esc(ctaTesto)}</a>
    ${gen_telefono ? `<a class="cta-inline-ghost" href="tel:${esc(gen_telefono)}">📞 Chiama</a>` : ""}
  </div>
</div>

${ctaBar}

<!-- HIGHLIGHTS -->
${conf.hl1?.titolo ? `
<section class="section" id="highlights">
  <div class="hl-grid">
    <div class="hl-card"><div class="hl-icon">📍</div><div class="hl-titolo">${esc(conf.hl1.titolo)}</div><div class="hl-testo">${esc(conf.hl1.testo)}</div></div>
    <div class="hl-card"><div class="hl-icon">🍽️</div><div class="hl-titolo">${esc(conf.hl2.titolo)}</div><div class="hl-testo">${esc(conf.hl2.testo)}</div></div>
    <div class="hl-card"><div class="hl-icon">🐟</div><div class="hl-titolo">${esc(conf.hl3.titolo)}</div><div class="hl-testo">${esc(conf.hl3.testo)}</div></div>
  </div>
</section>` : ""}

${sezioniState.cucina && conf.chisiamo_1 ? `
<!-- CUCINA -->
<section class="section" id="cucina">
  <div class="eyebrow">La nostra cucina</div>
  <h2 class="h2">${conf.hero_titolo ? "Terra e mare,<br><em>scelti ogni giorno</em>" : "La nostra <em>cucina</em>"}</h2>
  <div class="body-text"><p>${esc(conf.chisiamo_1)}</p>${conf.chisiamo_2?`<p>${esc(conf.chisiamo_2)}</p>`:""}</div>
  <a class="cta-inline" href="chi-siamo.html">Scopri chi siamo →</a>
</section>` : ""}

${sezioniState.reel && (conf.foto_reel_terra || conf.foto_reel_mare) ? `
<!-- REEL -->
<div class="reel-grid">
  ${conf.foto_reel_terra ? `<div class="reel-item"><video src="${esc(conf.foto_reel_terra)}" autoplay muted loop playsinline></video><div class="reel-overlay"><div class="reel-label">I primi di terra</div><div class="reel-sub">Tradizione · Territorio</div></div></div>` : ""}
  ${conf.foto_reel_mare ? `<div class="reel-item"><video src="${esc(conf.foto_reel_mare)}" autoplay muted loop playsinline></video><div class="reel-overlay"><div class="reel-label">Il nostro mare</div><div class="reel-sub">Scelto ogni mattina</div></div></div>` : ""}
</div>` : ""}

${sezioniState.mare && conf.mare_quote ? `
<!-- MARE -->
<div class="mare-section" id="mare">
  <div class="mare-inner">
    <div class="eyebrow" style="color:var(--oro)">Il mare</div>
    <blockquote class="mare-quote">${esc(conf.mare_quote)}</blockquote>
    ${conf.mare_testo ? `<div class="mare-body"><p>${esc(conf.mare_testo)}</p></div>` : ""}
    <a class="cta-inline" href="${esc(formUrl)}" style="margin-top:28px;">🗓 ${esc(ctaTesto)}</a>
  </div>
</div>` : ""}

${sezioniState.menu ? `
<!-- MENU PREVIEW -->
<div class="menu-section" id="menu">
  <div class="menu-inner">
    <div class="eyebrow">Il menu</div>
    <h2 class="h2" style="margin-bottom:8px;">Cosa portiamo<br><em>in tavola</em></h2>
    <p style="font-size:13px;color:var(--grigio);margin-bottom:20px;">Anteprima. <a href="menu.html" style="color:var(--oro);font-weight:600;">Vedi menu completo →</a></p>
    <div class="menu-cats">${(menuCats||[]).map((c,i)=>`<button class="menu-cat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`).join("")}</div>
    <div>${menuItemsHTML}</div>
    <a class="cta-inline" href="menu.html">Menu completo →</a>
  </div>
</div>` : ""}

${sezioniState.locale && conf.foto_locale?.[0] ? `
<!-- LOCALE -->
<div id="locale">
  <img class="locale-img" src="${esc(conf.foto_locale[0])}" alt="Il locale" loading="lazy">
  <section class="section">
    <div class="eyebrow">Il locale</div>
    <h2 class="h2">All'interno<br><em>dell'Hotel Aquila</em></h2>
    <div class="body-text"><p>All'interno dell'Hotel Aquila, a pochi metri dall'uscita A1 di Orte. Parcheggio gratuito, ambiente tranquillo.</p></div>
    <a class="cta-inline" href="${esc(formUrl)}">🗓 ${esc(ctaTesto)}</a>
  </section>
</div>` : ""}

${sezioniState.recensioni ? `
<!-- RECENSIONI -->
<div class="reviews-bg">
  <div style="max-width:700px;margin:0 auto;">
    <div class="eyebrow">Dicono di noi</div>
    <h2 class="h2" style="margin-bottom:24px;">L'opinione<br><em>dei nostri ospiti</em></h2>
    <div class="review-card"><div class="stars">★★★★★</div><div class="review-text">"Cucina tradizionale curata e servizio rapido. Una sosta ideale per chi viaggia."</div><div style="font-size:12px;color:var(--grigio)"><strong>Marco R.</strong> · lavoro</div></div>
    <div class="review-card"><div class="stars">★★★★★</div><div class="review-text">"Il pesce era freschissimo, si sentiva. Torneremo sicuramente."</div><div style="font-size:12px;color:var(--grigio)"><strong>Laura M.</strong> · famiglia</div></div>
    <div style="text-align:center;margin-top:20px;">
      <a class="cta-inline" href="${esc(formUrl)}">🗓 ${esc(ctaTesto)}</a>
    </div>
  </div>
</div>` : ""}

${sezioniState.mappa ? `
<!-- MAPPA -->
<div class="map-section" id="contatti">
  <div class="map-inner">
    <div class="eyebrow" style="color:var(--oro)">Come raggiungerci</div>
    <h2 class="h2" style="color:#fff;">A pochi minuti<br><em>dall'autostrada</em></h2>
    <iframe style="width:100%;height:200px;border-radius:12px;border:none;margin:20px 0;opacity:.8" src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed" allowfullscreen loading="lazy"></iframe>
    <div class="map-infos">
      ${gen_indirizzo ? `<div><div class="map-label">Indirizzo</div><div class="map-val">${esc(gen_indirizzo)}</div></div>` : ""}
      <div><div class="map-label">Orari</div><div class="map-val">${conf.orari_pranzo?`Pranzo: ${esc(conf.orari_pranzo)}<br>`:""}${conf.orari_cena?`Cena: ${esc(conf.orari_cena)}`:""}</div></div>
      ${gen_telefono ? `<div><div class="map-label">Telefono</div><div class="map-val"><a href="tel:${esc(gen_telefono)}">${esc(gen_telefono)}</a></div></div>` : ""}
      ${gen_email ? `<div><div class="map-label">Email</div><div class="map-val"><a href="mailto:${esc(gen_email)}">${esc(gen_email)}</a></div></div>` : ""}
    </div>
    <div style="display:flex;gap:10px;margin-top:28px;flex-wrap:wrap;">
      <a class="cta-inline" href="${esc(formUrl)}" style="flex:1;min-width:180px;text-align:center;">🗓 ${esc(ctaTesto)}</a>
      ${gen_telefono ? `<a style="flex:1;min-width:180px;display:inline-block;border:1.5px solid rgba(255,255,255,.3);color:#fff;font-weight:600;font-size:14px;padding:13px 20px;border-radius:8px;text-align:center;margin-top:0;" href="tel:${esc(gen_telefono)}">📞 Chiama ora</a>` : ""}
    </div>
  </div>
</div>` : ""}

${footer}
${menuScript}
</body></html>`;

    // ── CHI SIAMO ─────────────────────────────────────────────
    const chiSiamoHTML = `${head}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<section class="section" style="padding-top:60px;">
  <div class="eyebrow">Chi siamo</div>
  <h1 class="h2">La nostra <em>storia</em></h1>
  <div class="body-text">
    ${conf.pagina_chisiamo
      ? conf.pagina_chisiamo.split("\n\n").map(p => `<p>${esc(p)}</p>`).join("")
      : (conf.chisiamo_1 ? `<p>${esc(conf.chisiamo_1)}</p>` : "") + (conf.chisiamo_2 ? `<p>${esc(conf.chisiamo_2)}</p>` : "")
    }
  </div>
  <a class="cta-inline" href="${esc(formUrl)}">🗓 ${esc(ctaTesto)}</a>
</section>
${conf.foto_locale?.[0] ? `<img class="locale-img" src="${esc(conf.foto_locale[0])}" alt="Il locale" loading="lazy">` : ""}
${conf.mare_quote && sezioniState.mare ? `
<div class="mare-section">
  <div class="mare-inner">
    <blockquote class="mare-quote">${esc(conf.mare_quote)}</blockquote>
    ${conf.mare_testo ? `<div class="mare-body"><p>${esc(conf.mare_testo)}</p></div>` : ""}
    <a class="cta-inline" href="${esc(formUrl)}" style="margin-top:24px;">🗓 ${esc(ctaTesto)}</a>
  </div>
</div>` : ""}
${ctaBar}
${footer}
</body></html>`;

    // ── MENU PAGE ─────────────────────────────────────────────
    const menuHTML = `${head}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<div class="menu-section" style="padding-top:60px;">
  <div class="menu-inner">
    <div class="eyebrow">Il menu</div>
    <h1 class="h2" style="margin-bottom:8px;">Cosa portiamo<br><em>in tavola</em></h1>
    <p style="font-size:13px;color:var(--grigio);margin-bottom:24px;">Aggiornato in tempo reale da Ristoflow</p>
    <div class="menu-cats">${(menuCats||[]).map((c,i)=>`<button class="menu-cat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`).join("")}</div>
    <div>${menuItemsHTML}</div>
    <a class="cta-inline" href="${esc(formUrl)}" style="margin-top:32px;">🗓 ${esc(ctaTesto)}</a>
  </div>
</div>
${ctaBar}
${footer}
${menuScript}
</body></html>`;

    // ── CONTATTI PAGE ─────────────────────────────────────────
    const contattiHTML = `${head}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<div class="map-section" style="padding-top:60px;">
  <div class="map-inner">
    <div class="eyebrow" style="color:var(--oro)">Contatti</div>
    <h1 class="h2" style="color:#fff;">Come<br><em>raggiungerci</em></h1>
    <iframe style="width:100%;height:220px;border-radius:12px;border:none;margin:24px 0;opacity:.8" src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed" allowfullscreen loading="lazy"></iframe>
    <div class="map-infos">
      ${gen_indirizzo ? `<div><div class="map-label">Indirizzo</div><div class="map-val">${esc(gen_indirizzo)}</div></div>` : ""}
      <div><div class="map-label">Orari</div><div class="map-val">${conf.orari_pranzo?`Pranzo: ${esc(conf.orari_pranzo)}<br>`:""}${conf.orari_cena?`Cena: ${esc(conf.orari_cena)}`:""}</div></div>
      ${gen_telefono ? `<div><div class="map-label">Telefono</div><div class="map-val"><a href="tel:${esc(gen_telefono)}">${esc(gen_telefono)}</a></div></div>` : ""}
      ${gen_email ? `<div><div class="map-label">Email</div><div class="map-val"><a href="mailto:${esc(gen_email)}">${esc(gen_email)}</a></div></div>` : ""}
    </div>
    <a class="cta-inline" href="${esc(formUrl)}" style="margin-top:28px;">🗓 ${esc(ctaTesto)}</a>
  </div>
</div>
${ctaBar}
${footer}
</body></html>`;

    // ── EVENTI PAGE ───────────────────────────────────────────
    const eventiHTML = `${head}
<body>
${nav}
<div style="height:70px;background:var(--scuro);"></div>
<section class="section" style="padding-top:60px;">
  <div class="eyebrow">Eventi</div>
  <h1 class="h2">Serate <em>speciali</em></h1>
  <div class="body-text">
    ${conf.pagina_eventi
      ? conf.pagina_eventi.split("\n\n").map(p => `<p>${esc(p)}</p>`).join("")
      : "<p>Scopri le nostre serate speciali, degustazioni e menu stagionali. Per informazioni contattaci.</p>"
    }
  </div>
  <a class="cta-inline" href="${esc(formUrl)}">🗓 ${esc(ctaTesto)}</a>
</section>
${ctaBar}
${footer}
</body></html>`;

    return { home: homeHTML, chiSiamo: chiSiamoHTML, menu: menuHTML, contatti: contattiHTML, eventi: eventiHTML };
  }

  // ── PUBBLICA ─────────────────────────────────────────────────
  async function pubblica(solo_anteprima = false) {
    const conf = leggiForm();

    if (solo_anteprima) {
      const pagine = await generaHTML(conf);
      const blob = new Blob([pagine.home], { type: "text/html;charset=utf-8" });
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }

    const statusEl = document.getElementById("sw-pub-status");
    const btnMain  = document.getElementById("sw-btn-pubblica-main");
    const btnTop   = document.getElementById("sw-btn-pubblica");
    statusEl.style.display = "";
    statusEl.className = "sw-status loading";
    statusEl.textContent = "⏳ Salvataggio configurazione...";
    btnMain.disabled = true; btnTop.disabled = true;

    try {
      await salvaConfig();
      statusEl.textContent = "⏳ Generazione pagine...";
      const pagine = await generaHTML(conf);

      statusEl.textContent = "⏳ Pubblicazione su GitHub Pages...";
      const session2 = window.supabaseClient?.auth ? (await window.supabaseClient.auth.getSession())?.data?.session : null;
      const token2 = session2?.access_token || ANON_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/github-deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token2}`, "apikey": token2 },
        body: JSON.stringify({
          slug: conf.slug,
          nome: conf.nome,
          dominio: conf.dominio || null,
          pagine: {
            "index.html":     pagine.home,
            "chi-siamo.html": pagine.chiSiamo,
            "menu.html":      pagine.menu,
            "contatti.html":  pagine.contatti,
            "eventi.html":    pagine.eventi,
          }
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Errore pubblicazione");

      statusEl.className = "sw-status success";
      statusEl.innerHTML = `✅ Sito pubblicato su ${data.pagine_pubblicate} pagine!<br>
        <a href="${data.url}" target="_blank" style="color:#15803d;">${data.url}</a><br>
        <span style="font-size:11px;color:#64748b;">Potrebbe volerci 1-2 minuti prima che le modifiche siano visibili.</span>`;
    } catch(e) {
      statusEl.className = "sw-status error";
      statusEl.textContent = "❌ " + e.message;
    } finally {
      btnMain.disabled = false; btnTop.disabled = false;
    }
  }

  document.getElementById("sw-btn-preview").onclick = () => pubblica(true);
  document.getElementById("sw-btn-salva").onclick = async function() {
    this.textContent = "⏳..."; this.disabled = true;
    try {
      await salvaConfig();
      this.textContent = "✅ Salvato!";
      setTimeout(() => { this.textContent = "💾 Salva bozza"; this.disabled = false; }, 2000);
    } catch(e) {
      this.textContent = "❌ Errore"; this.disabled = false;
    }
  };
  document.getElementById("sw-btn-pubblica").onclick = () => {
    container.querySelector('[data-tab="pubblica"]').click();
    pubblica(false);
  };
  document.getElementById("sw-btn-pubblica-main").onclick = () => pubblica(false);

  // ── CHECKLIST ────────────────────────────────────────────────
  function aggiornaChecklist() {
    const conf = leggiForm();
    const items = [
      { label:"Slug URL",     ok:!!conf.slug },
      { label:"Titolo hero",  ok:!!conf.hero_titolo },
      { label:"Chi siamo",    ok:!!conf.chisiamo_1 },
      { label:"Telefono",     ok:!!conf.telefono },
      { label:"Foto cover",   ok:!!conf.foto_cover },
      { label:"Orari",        ok:!!(conf.orari_pranzo||conf.orari_cena) },
    ];
    document.getElementById("sw-checklist").innerHTML = items.map(i =>
      `<div class="sw-checklist-item"><span style="font-size:16px;">${i.ok?"✅":"⭕"}</span><span style="font-size:13px;color:${i.ok?"#374151":"#94a3b8"};">${i.label}</span></div>`
    ).join("");
  }

  // ── INIT ─────────────────────────────────────────────────────
  await caricaSedi();
  await caricaFormDisponibili();
}
