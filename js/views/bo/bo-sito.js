// ============================================================
//  bo-sito.js v4 — CLEAN REWRITE
// ============================================================

const SUPABASE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";
// Il menu nelle pagine pubblicate si aggiorna da solo: all'apertura la pagina
// rilegge il menu della sede. Se la lettura fallisce resta quello pubblicato.
function menuLive(sedeId) {
  return `<script>(function(){var u=${JSON.stringify(SUPABASE_URL)}+"/rest/v1/rpc/menu_sito",k=${JSON.stringify(ANON_KEY)};
function e(t){return String(t==null?"":t).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
fetch(u,{method:"POST",headers:{"apikey":k,"Authorization":"Bearer "+k,"Content-Type":"application/json"},body:JSON.stringify({p_sede:${JSON.stringify(sedeId)}})})
.then(function(r){return r.ok?r.json():null}).then(function(d){if(!d||!d.cats||!d.cats.length)return;
var h='<div class="mcat">'+d.cats.map(function(c,i){return'<button class="mcat-btn'+(i?'':' active')+'" data-c="'+e(c.id)+'" onclick="filtraMenu(this.dataset.c,this)">'+e(c.nome)+'</button>'}).join("")+'</div><div>'+
d.cats.map(function(c,i){return'<div class="menu-cat" data-cat="'+e(c.id)+'" style="'+(i?'display:none':'')+'">'+d.voci.filter(function(v){return v.categoria_id===c.id}).map(function(v){
return'<div class="mi"><div><div class="mi-n">'+e(v.nome)+'</div>'+(v.descrizione?'<div class="mi-d">'+e(v.descrizione)+'</div>':'')+'</div>'+(Number(v.prezzo)?'<div class="mi-p">\u20ac '+Number(v.prezzo).toFixed(2)+'</div>':'')+'</div>'}).join("")+'</div>'}).join("")+'</div>';
document.querySelectorAll("[data-menu-live]").forEach(function(x){x.innerHTML=h})}).catch(function(){})})();</script>`;
}

const GITHUB_OWNER = "ristomanager-it";
const GITHUB_REPO  = "siti-clienti";

export async function render(container) {
  const sc = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id || window.state?.aziendaId;

  // ── STATO ───────────────────────────────────────────────────
  let sedeSelezionata = null;
  let _identita = null;
  const fotoSel = { cover: null, reelTerra: null, reelMare: null, locale: [], header: [], videoHero: null };
  let repoSito = null;   // repo dedicato del sito, letto dal database
  const SEZIONI = [
    { id:"hero",       label:"🦸 Hero",              def:true  },
    { id:"intro",      label:"📝 Breve descrizione",  def:false },
    { id:"highlights", label:"✨ Highlights",         def:true  },
    { id:"cucina",     label:"🍽️ La nostra cucina",  def:true  },
    { id:"reel",       label:"🎬 Video reel",         def:true  },
    { id:"mare",       label:"🐟 Filosofia mare",     def:false },
    { id:"menu",       label:"📋 Menu digitale",      def:true  },
    { id:"menugiorno", label:"🍝 Menu del giorno",     def:false },
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
    .sw-add-foto{border:1px solid #0E5A7A;background:#fff;color:#0E5A7A;border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:600;cursor:pointer}
    .sw-add-foto:active{background:#0E5A7A;color:#fff}
    .sw-lente{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:50%;width:22px;height:22px;font-size:11px;line-height:1;cursor:pointer;padding:0}
    .sw-lente:hover{background:rgba(0,0,0,.85)}
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
        <div style="font-size:12px;color:#64748b;margin:10px 0 6px;">Titoli delle due sezioni con foto o video. Lasciali vuoti e restano quelli attuali.</div>
        <div class="sw-field">
          <label class="sw-label">Sezione 1 &mdash; sopratitolo</label>
          <input id="sw-sez1-occhiello" class="sw-input" placeholder="Tradizione · Territorio">
        </div>
        <div class="sw-field">
          <label class="sw-label">Sezione 1 &mdash; titolo</label>
          <input id="sw-sez1-titolo" class="sw-input" placeholder="I primi di terra">
        </div>
        <div class="sw-field">
          <label class="sw-label">Sezione 2 &mdash; sopratitolo</label>
          <input id="sw-sez2-occhiello" class="sw-input" placeholder="Scelto ogni mattina">
        </div>
        <div class="sw-field">
          <label class="sw-label">Sezione 2 &mdash; titolo</label>
          <input id="sw-sez2-titolo" class="sw-input" placeholder="Il nostro mare">
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
      <div class="sw-card" id="card-galleria-sito">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🖼️ Galleria del sito</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">Le foto gia' tagliate nella misura giusta, pronte da usare. Aggiungine dalla libreria: scegli il punto, il resto lo fa il sistema.</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px;">
          <button class="sw-add-foto" data-f="copertina">+ Copertina</button>
          <button class="sw-add-foto" data-f="sezione">+ Sezione</button>
          <button class="sw-add-foto" data-f="quadrata">+ Quadrata</button>
          <button class="sw-add-foto" data-f="verticale">+ Verticale</button>
        </div>
        <div class="sw-media-grid" id="grid-sito"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🖼️ Copertina</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">Tocca le foto che vuoi in cima al sito. Se ne scegli più di una si alternano da sole. Tocca la lente per vederle grandi.</div>
        <div class="sw-media-grid" id="grid-cover"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">🎥 Video di copertina</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">Foto o video, come preferisci. Se scegli un video prende il posto delle foto. Ritocca per toglierlo.</div>
        <div class="sw-media-grid" id="grid-video-hero"></div>
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
        <button type="button" id="sw-up-locale" style="background:#0f4c5c;color:#fff;border:0;border-radius:10px;padding:11px 14px;font-weight:700;font-size:14px;margin:4px 0 10px;cursor:pointer;">＋ Carica foto dal telefono</button>
        <input type="file" id="sw-file-locale" accept="image/*" style="display:none">
        <div class="sw-media-grid" id="grid-locale"></div>
      </div>
      <div class="sw-card">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">⭐ Foto delle recensioni</div>
        <div style="font-size:12.5px;color:#64748b;margin-bottom:8px;line-height:1.45;">Quando arriva una recensione (Google, Facebook, TripAdvisor) fai lo screenshot e caricalo qui: compare nella home sotto "Dicono di noi". Se non ne carichi, il sito sceglie da solo le recensioni migliori.</div>
        <button type="button" id="sw-up-rec" style="background:#0f4c5c;color:#fff;border:0;border-radius:10px;padding:11px 14px;font-weight:700;font-size:14px;margin:4px 0 10px;cursor:pointer;">＋ Carica foto recensioni</button>
        <input type="file" id="sw-file-rec" accept="image/*" multiple style="display:none">
        <div id="sw-rec-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;"></div>
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
  let ordineSezioni = SEZIONI.map(function (s) { return s.id; });
  // Le sezioni si spostano con le frecce: sul telefono il trascinamento
  // e' scomodo e sbaglia bersaglio, le frecce no.
  function disegnaSezioni() {
    const elenco = ordineSezioni
      .map(function (id) { return SEZIONI.find(function (x) { return x.id === id; }); })
      .filter(Boolean);
    sezioniList.innerHTML = elenco.map(function (s, i) {
      return '<div class="sw-sezione-row">' +
        '<span style="display:flex;gap:3px;margin-right:8px;">' +
          '<button class="sw-su" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>&#9650;</button>' +
          '<button class="sw-giu" data-i="' + i + '"' + (i === elenco.length - 1 ? ' disabled' : '') + '>&#9660;</button>' +
        '</span>' +
        '<span style="font-size:14px;font-weight:600;flex:1;">' + s.label + '</span>' +
        '<button class="sw-toggle' + (sezioniState[s.id] ? ' on' : '') + '" data-sezione="' + s.id + '"></button>' +
        '</div>';
    }).join("");

    sezioniList.querySelectorAll(".sw-su,.sw-giu").forEach(function (b) {
      b.style.cssText = "border:1px solid #cbd5e1;background:#fff;border-radius:6px;width:26px;height:26px;font-size:10px;line-height:1;cursor:pointer;padding:0";
      if (b.disabled) b.style.opacity = ".3";
      b.onclick = function () {
        const i = Number(b.dataset.i);
        const j = b.classList.contains("sw-su") ? i - 1 : i + 1;
        if (j < 0 || j >= ordineSezioni.length) return;
        const t = ordineSezioni[i];
        ordineSezioni[i] = ordineSezioni[j];
        ordineSezioni[j] = t;
        disegnaSezioni();
      };
    });

    sezioniList.querySelectorAll(".sw-toggle").forEach(function (btn) {
      btn.onclick = function () {
        btn.classList.toggle("on");
        sezioniState[btn.dataset.sezione] = btn.classList.contains("on");
      };
    });
  }
  disegnaSezioni();

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
      sez1_occhiello: g("sw-sez1-occhiello"),
      sez1_titolo:    g("sw-sez1-titolo"),
      sez2_occhiello: g("sw-sez2-occhiello"),
      sez2_titolo:    g("sw-sez2-titolo"),
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
      foto_header:     fotoSel.header,
      video_hero:      fotoSel.videoHero,
      sezioni:      { ...sezioniState },
      sezioni_ordine: ordineSezioni.slice(),
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
      set("sw-sez1-occhiello", conf.sez1_occhiello);
      set("sw-sez1-titolo",    conf.sez1_titolo);
      set("sw-sez2-occhiello", conf.sez2_occhiello);
      set("sw-sez2-titolo",    conf.sez2_titolo);
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
      if (conf.foto_header)     fotoSel.header     = conf.foto_header;
      if (conf.video_hero)      fotoSel.videoHero  = conf.video_hero;
      if (Array.isArray(conf.sezioni_ordine) && conf.sezioni_ordine.length) {
        const noti = SEZIONI.map(function (x) { return x.id; });
        ordineSezioni = conf.sezioni_ordine.filter(function (k) { return noti.indexOf(k) !== -1; });
        noti.forEach(function (k) { if (ordineSezioni.indexOf(k) === -1) ordineSezioni.push(k); });
      }
      try { disegnaSezioni(); } catch (e) { console.warn("sezioni:", e); }
      repoSito = conf.repo_github || null;
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
      foto_header:     conf.foto_header,
      video_hero:      conf.video_hero,
      sezioni:         conf.sezioni,
      sezioni_ordine:  conf.sezioni_ordine,
      sez1_occhiello:  conf.sez1_occhiello,
      sez1_titolo:     conf.sez1_titolo,
      sez2_occhiello:  conf.sez2_occhiello,
      sez2_titolo:     conf.sez2_titolo,
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
    document.querySelectorAll(".sw-add-foto").forEach(function (b) {
      b.onclick = function () { scegliDaLibreria(b.dataset.f); };
    });
    await caricaSitoMedia();

    // Le sezioni pescano dalla galleria del sito, non dalla libreria: li'
    // dentro le foto sono gia' tagliate nella misura giusta e leggere.
    function pronte(formati) {
      return sitoMedia.filter(function (m) { return formati.indexOf(m.formato) !== -1; })
        .map(function (m) {
          return { url: m.url, thumb_url: m.url, tipo: "immagine",
                   nome: m.titolo || (FORMATI[m.formato] ? FORMATI[m.formato].nome : m.formato),
                   tag: FORMATI[m.formato] ? FORMATI[m.formato].nome : m.formato };
        });
    }
    renderMedia("grid-cover",      pronte(["copertina"]),          "header",    true);
    renderMedia("grid-video-hero", video,                          "videoHero", false);
    // Nelle sezioni si puo' mettere un video oppure una foto gia' pronta.
    const perSezione = video.concat(pronte(["verticale", "quadrata", "sezione"]));
    renderMedia("grid-reel-terra", perSezione,                     "reelTerra", false);
    renderMedia("grid-reel-mare",  perSezione,                     "reelMare",  false);
    renderMedia("grid-locale",     pronte(["sezione","quadrata"]), "locale",    true);
    // Carica una foto del locale direttamente dal telefono: si ridimensiona, si salva e diventa la prima
    (function () {
      const b = document.getElementById("sw-up-locale"), f = document.getElementById("sw-file-locale");
      if (!b || !f) return;
      b.onclick = function () { f.click(); };
      f.onchange = async function () {
        const file = f.files && f.files[0];
        if (!file) return;
        b.disabled = true; b.textContent = "Carico…";
        try {
          const url = URL.createObjectURL(file);
          const img = await new Promise(function (res, rej) { const im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = url; });
          const k = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          const blob = await new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.84); });
          if (!blob) throw new Error("foto non elaborata");
          const nome = "sito/" + aziendaId + "/" + Date.now() + "-locale.jpg";
          const up = await sc.storage.from("media-aziende").upload(nome, blob, { contentType: "image/jpeg", upsert: false });
          if (up.error) throw up.error;
          const pub = sc.storage.from("media-aziende").getPublicUrl(nome);
          const ins = await sc.from("sito_media").insert({
            azienda_id: aziendaId, sede_id: (sedeSelezionata && sedeSelezionata.id) || null, formato: "sezione",
            url: pub.data.publicUrl, path: nome, larghezza: w, altezza: h, peso_kb: Math.round(blob.size / 1024), titolo: file.name || "Locale"
          });
          if (ins.error) throw ins.error;
          fotoSel.locale = [pub.data.publicUrl].concat((fotoSel.locale || []).filter(function (u) { return u !== pub.data.publicUrl; }));
          await caricaSitoMedia();
          renderMedia("grid-locale", pronte(["sezione", "quadrata"]), "locale", true);
          alert("Foto caricata: e' la prima del locale. Ora ripubblica il sito.");
        } catch (e) {
          alert("Non sono riuscito a caricarla: " + (e.message || e));
        }
        b.disabled = false; b.textContent = "＋ Carica foto dal telefono"; f.value = "";
      };
    })();

    // Foto delle recensioni: si caricano dal telefono man mano che arrivano e compaiono in home sotto "Dicono di noi"
    (function () {
      const b = document.getElementById("sw-up-rec"), f = document.getElementById("sw-file-rec"), g = document.getElementById("sw-rec-grid");
      if (!b || !f || !g) return;
      async function elenco() {
        const { data } = await sc.from("sito_media").select("id,url,path").eq("azienda_id", aziendaId).eq("formato", "recensione")
          .order("ordine", { ascending: true }).order("created_at", { ascending: false });
        g.innerHTML = (data || []).map(function (x) {
          return '<div style="position:relative;"><img src="' + x.url + '" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;">' +
            '<button type="button" data-del="' + x.id + '" data-path="' + (x.path || "") + '" style="position:absolute;top:4px;right:4px;background:#b91c1c;color:#fff;border:0;border-radius:6px;font-size:12px;padding:3px 7px;">🗑</button></div>';
        }).join("") || '<div style="grid-column:1/-1;color:#94a3b8;font-size:13px;">Ancora nessuna foto: il sito sceglie in automatico le recensioni migliori.</div>';
        g.querySelectorAll("[data-del]").forEach(function (d) {
          d.onclick = async function () {
            if (!confirm("Togliere questa foto dal sito?")) return;
            await sc.from("sito_media").delete().eq("id", d.dataset.del);
            if (d.dataset.path) await sc.storage.from("media-aziende").remove([d.dataset.path]);
            await elenco();
            alert("Tolta. Ripubblica il sito per aggiornarlo.");
          };
        });
      }
      b.onclick = function () { f.click(); };
      f.onchange = async function () {
        const files = Array.from(f.files || []);
        if (!files.length) return;
        b.disabled = true;
        let n = 0;
        for (const file of files) {
          try {
            b.textContent = "Carico " + (n + 1) + " di " + files.length + "…";
            const url = URL.createObjectURL(file);
            const img = await new Promise(function (res, rej) { const im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = url; });
            const k = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
            const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
            const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            const blob = await new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.86); });
            if (!blob) throw new Error("foto non elaborata");
            const nome = "sito/" + aziendaId + "/" + Date.now() + "-" + n + "-recensione.jpg";
            const up = await sc.storage.from("media-aziende").upload(nome, blob, { contentType: "image/jpeg", upsert: false });
            if (up.error) throw up.error;
            const pub = sc.storage.from("media-aziende").getPublicUrl(nome);
            const ins = await sc.from("sito_media").insert({
              azienda_id: aziendaId, sede_id: (sedeSelezionata && sedeSelezionata.id) || null, formato: "recensione",
              url: pub.data.publicUrl, path: nome, larghezza: w, altezza: h, peso_kb: Math.round(blob.size / 1024), titolo: file.name || "Recensione"
            });
            if (ins.error) throw ins.error;
            n++;
          } catch (e) {
            alert("Una foto non e' stata caricata: " + (e.message || e));
          }
        }
        b.disabled = false; b.textContent = "＋ Carica foto recensioni"; f.value = "";
        await elenco();
        if (n) alert(n + (n === 1 ? " foto caricata" : " foto caricate") + ". Ripubblica il sito per vederle.");
      };
      elenco();
    })();
    pieghevoli();
  }

  // Anteprima a schermo intero: le miniature sono troppo piccole per capire
  // se una foto regge in copertina.
  function apriAnteprima(url, isVideo) {
    let ov = document.getElementById("sw-anteprima");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "sw-anteprima";
      ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:16px;";
      ov.onclick = () => { ov.style.display = "none"; ov.innerHTML = ""; };
      document.body.appendChild(ov);
    }
    ov.style.display = "flex";
    ov.innerHTML = (isVideo
      ? '<video src="' + url + '" controls autoplay playsinline style="max-width:100%;max-height:88vh;border-radius:12px;"></video>'
      : '<img src="' + url + '" style="max-width:100%;max-height:88vh;object-fit:contain;border-radius:12px;">')
      + '<div style="position:absolute;top:14px;right:18px;color:#fff;font-size:30px;line-height:1;">&times;</div>'
      + '<div style="position:absolute;bottom:16px;left:0;right:0;text-align:center;color:rgba(255,255,255,.7);font-size:12px;">Tocca per chiudere</div>';
  }

  // I riquadri del tab Media partono chiusi: con centinaia di media,
  // averli tutti aperti significa scorrere all'infinito per arrivare in fondo.
  function pieghevoli() {
    const pan = document.getElementById("panel-foto");
    if (!pan) return;
    pan.querySelectorAll(".sw-card").forEach(function (card) {
      if (card.dataset.pieg) return;
      card.dataset.pieg = "1";
      const testa = card.firstElementChild;
      if (!testa) return;
      const corpo = Array.prototype.slice.call(card.children, 1);
      const freccia = document.createElement("span");
      freccia.textContent = "▸";
      freccia.style.cssText = "float:right;color:#94a3b8;font-size:13px;transition:transform .15s;";
      testa.appendChild(freccia);
      testa.style.cursor = "pointer";
      testa.style.userSelect = "none";
      testa.style.marginBottom = "0";
      corpo.forEach(function (el) { el.style.display = "none"; });
      testa.onclick = function () {
        const chiuso = corpo[0] && corpo[0].style.display === "none";
        corpo.forEach(function (el) { el.style.display = chiuso ? "" : "none"; });
        freccia.style.transform = chiuso ? "rotate(90deg)" : "";
        testa.style.marginBottom = chiuso ? "4px" : "0";
      };
    });
  }

  // ── GALLERIA DEL SITO ──────────────────────────────────────
  // Le foto della libreria hanno forme e pesi a caso. Qui si sceglie
  // l'inquadratura una volta sola e si salva una copia gia' della misura
  // giusta e leggera. L'originale in libreria non viene mai toccato.
  const FORMATI = {
    copertina: { w: 1600, h: 900,  nome: "Copertina" },
    sezione:   { w: 1200, h: 675,  nome: "Sezione" },
    quadrata:  { w: 1000, h: 1000, nome: "Quadrata" },
    verticale: { w: 1080, h: 1920, nome: "Verticale" }
  };
  let sitoMedia = [];

  async function caricaSitoMedia() {
    const grid = document.getElementById("grid-sito");
    if (!grid) return;
    let q = sc.from("sito_media").select("*").eq("azienda_id", aziendaId);
    if (sedeSelezionata && sedeSelezionata.id) q = q.eq("sede_id", sedeSelezionata.id);
    const { data } = await q.order("created_at", { ascending: false });
    sitoMedia = data || [];
    if (!sitoMedia.length) {
      grid.innerHTML = '<div style="color:#94a3b8;font-size:13px;grid-column:1/-1;padding:8px;">Ancora nessuna foto pronta. Usa i pulsanti qui sopra.</div>';
      return;
    }
    grid.innerHTML = sitoMedia.map(function (m) {
      return '<div class="sw-media-item" data-url="' + m.url + '" style="cursor:default">' +
        '<img src="' + m.url + '" loading="lazy" decoding="async">' +
        '<button class="sw-lente" data-big="' + m.url + '" data-vid="0">&#128269;</button>' +
        '<button class="sw-del-foto" data-id="' + m.id + '" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:0;border-radius:50%;width:22px;height:22px;font-size:12px;line-height:1;padding:0;cursor:pointer">&times;</button>' +
        '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:9px;padding:2px 5px;">' +
          (FORMATI[m.formato] ? FORMATI[m.formato].nome : m.formato) + ' · ' + (m.peso_kb || "?") + ' kB</div>' +
        '</div>';
    }).join("");
    grid.querySelectorAll(".sw-lente").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); apriAnteprima(b.dataset.big, false); };
    });
    grid.querySelectorAll(".sw-del-foto").forEach(function (b) {
      b.onclick = async function (e) {
        e.stopPropagation();
        if (!confirm("Togliere questa foto dalla galleria del sito?")) return;
        await sc.from("sito_media").delete().eq("id", b.dataset.id);
        caricaSitoMedia();
      };
    });
  }

  async function scegliDaLibreria(formato) {
    let q = sc.from("media_library").select("id,url,thumb_url,nome,tag,path")
      .eq("azienda_id", aziendaId).eq("tipo", "immagine")
      .or("archiviata.is.null,archiviata.eq.false");
    if (sedeSelezionata && sedeSelezionata.id) q = q.eq("sede_id", sedeSelezionata.id);
    const { data } = await q.order("created_at", { ascending: false }).limit(600);
    const foto = data || [];
    if (!foto.length) { alert("Nessuna foto in libreria per questa sede."); return; }

    const tags = Array.from(new Set(foto.map(function (f) { return f.tag; }).filter(Boolean))).sort();
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:99998;background:#0f172a;display:flex;flex-direction:column;";
    ov.innerHTML =
      '<div style="padding:12px 14px;color:#fff;display:flex;justify-content:space-between;align-items:center;">' +
        '<b style="font-size:15px">Scegli la foto &mdash; ' + FORMATI[formato].nome + '</b>' +
        '<button id="ch-x" style="background:none;border:0;color:#fff;font-size:26px;line-height:1">&times;</button></div>' +
      '<div id="ch-f" style="display:flex;gap:6px;overflow-x:auto;padding:0 14px 10px;"></div>' +
      '<div id="ch-g" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;padding:0 14px 20px;"></div>';
    document.body.appendChild(ov);
    ov.querySelector("#ch-x").onclick = function () { ov.remove(); };

    const barra = ov.querySelector("#ch-f");
    barra.innerHTML = '<button data-t="">Tutte</button>' +
      tags.map(function (t) { return '<button data-t="' + t + '">' + t + '</button>'; }).join("");
    barra.querySelectorAll("button").forEach(function (b) {
      b.style.cssText = "border:1px solid #334155;background:#1e293b;color:#e2e8f0;border-radius:999px;padding:5px 12px;font-size:12px;white-space:nowrap";
      b.onclick = function () { mostra(b.dataset.t ? foto.filter(function (f) { return f.tag === b.dataset.t; }) : foto); };
    });

    function mostra(elenco) {
      const g = ov.querySelector("#ch-g");
      g.innerHTML = elenco.map(function (f) {
        return '<img src="' + (f.thumb_url || f.url) + '" data-u="' + f.url + '" loading="lazy" ' +
          'style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer">';
      }).join("");
      g.querySelectorAll("img").forEach(function (im) {
        im.onclick = function () {
          const orig = elenco.find(function (x) { return x.url === im.dataset.u; });
          ov.remove();
          apriRitaglio(orig, formato);
        };
      });
    }
    mostra(foto);
  }

  function apriRitaglio(orig, formato) {
    const F = FORMATI[formato];
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:99998;background:#0b1220;display:flex;flex-direction:column;";
    ov.innerHTML =
      '<div style="padding:12px 14px;color:#fff;display:flex;justify-content:space-between;align-items:center;">' +
        '<b style="font-size:15px">' + F.nome + ' &middot; ' + F.w + '&times;' + F.h + '</b>' +
        '<button id="rt-x" style="background:none;border:0;color:#fff;font-size:26px;line-height:1">&times;</button></div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 14px;">' +
        '<div id="rt-box" style="position:relative;width:100%;max-width:520px;overflow:hidden;background:#000;border-radius:12px;touch-action:none;">' +
          '<img id="rt-img" style="position:absolute;transform-origin:0 0;user-select:none;-webkit-user-drag:none;max-width:none;max-height:none;">' +
          '<div style="position:absolute;inset:0;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55);border-radius:12px;pointer-events:none"></div>' +
        '</div></div>' +
      '<div style="padding:14px;color:#cbd5e1;font-size:12.5px;text-align:center">Trascina per spostare &middot; pizzica per ingrandire</div>' +
      '<div style="padding:0 14px 22px;display:flex;gap:10px;">' +
        '<button id="rt-ann" style="flex:1;padding:14px;border-radius:10px;border:1px solid #334155;background:transparent;color:#e2e8f0;font-size:15px">Annulla</button>' +
        '<button id="rt-ok" style="flex:2;padding:14px;border-radius:10px;border:0;background:#0E5A7A;color:#fff;font-size:15px;font-weight:600">Aggiungi alla galleria</button>' +
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector("#rt-x").onclick = ov.querySelector("#rt-ann").onclick = function () { ov.remove(); };

    const box = ov.querySelector("#rt-box");
    const img = ov.querySelector("#rt-img");
    box.style.aspectRatio = F.w + " / " + F.h;

    let scala = 1, dx = 0, dy = 0, pronto = false;
    img.crossOrigin = "anonymous";

    // Quando la foto finisce di caricare il riquadro puo' non avere ancora
    // una larghezza: il calcolo partirebbe da zero e l'immagine resterebbe
    // una striscia. Si aspetta che il riquadro esista davvero.
    function prepara() {
      const r = box.getBoundingClientRect();
      if (!r.width || !r.height || !img.naturalWidth) {
        requestAnimationFrame(prepara);
        return;
      }
      scala = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
      dx = (r.width - img.naturalWidth * scala) / 2;
      dy = (r.height - img.naturalHeight * scala) / 2;
      pronto = true;
      applica();
    }
    img.onload = prepara;
    img.onerror = function () { alert("Non riesco a caricare questa foto."); ov.remove(); };
    img.src = orig.url;
    if (window.ResizeObserver) new ResizeObserver(function () { if (pronto) applica(); }).observe(box);

    function applica() {
      const rr = box.getBoundingClientRect();
      const bw = rr.width, bh = rr.height;
      if (!bw || !bh) return;
      const minS = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
      if (scala < minS) scala = minS;
      const lw = img.naturalWidth * scala, lh = img.naturalHeight * scala;
      if (dx > 0) dx = 0;
      if (dy > 0) dy = 0;
      if (dx < bw - lw) dx = bw - lw;
      if (dy < bh - lh) dy = bh - lh;
      img.style.width = img.naturalWidth + "px";
      img.style.height = img.naturalHeight + "px";
      img.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + scala + ")";
    }

    let punti = {};
    box.onpointerdown = function (e) { box.setPointerCapture(e.pointerId); punti[e.pointerId] = e; };
    box.onpointerup = box.onpointercancel = function (e) { delete punti[e.pointerId]; };
    box.onpointermove = function (e) {
      if (!punti[e.pointerId]) return;
      const ids = Object.keys(punti);
      if (ids.length === 1) {
        dx += e.clientX - punti[e.pointerId].clientX;
        dy += e.clientY - punti[e.pointerId].clientY;
        punti[e.pointerId] = e;
        applica();
      } else if (ids.length === 2) {
        const a = punti[ids[0]], b = punti[ids[1]];
        const prima = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        punti[e.pointerId] = e;
        const a2 = punti[ids[0]], b2 = punti[ids[1]];
        const dopo = Math.hypot(a2.clientX - b2.clientX, a2.clientY - b2.clientY);
        if (prima > 0) { scala = scala * (dopo / prima); applica(); }
      }
    };
    box.onwheel = function (e) { e.preventDefault(); scala = scala * (e.deltaY < 0 ? 1.08 : 0.93); applica(); };

    ov.querySelector("#rt-ok").onclick = async function () {
      const btn = ov.querySelector("#rt-ok");
      btn.disabled = true; btn.textContent = "Preparo...";
      try {
        const bw = box.getBoundingClientRect().width;
        const r = F.w / bw;
        const cv = document.createElement("canvas");
        cv.width = F.w; cv.height = F.h;
        const cx = cv.getContext("2d");
        cx.imageSmoothingQuality = "high";
        cx.drawImage(img, dx * r, dy * r, img.naturalWidth * scala * r, img.naturalHeight * scala * r);

        const blob = await new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.82); });
        if (!blob) throw new Error("ritaglio non riuscito");

        const nome = "sito/" + aziendaId + "/" + Date.now() + "-" + formato + ".jpg";
        const up = await sc.storage.from("media-aziende").upload(nome, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
        const pub = sc.storage.from("media-aziende").getPublicUrl(nome);

        const ins = await sc.from("sito_media").insert({
          azienda_id: aziendaId,
          sede_id: (sedeSelezionata && sedeSelezionata.id) || null,
          formato: formato,
          url: pub.data.publicUrl,
          path: nome,
          larghezza: F.w, altezza: F.h,
          peso_kb: Math.round(blob.size / 1024),
          origine_id: orig.id || null,
          ritaglio: { dx: dx, dy: dy, scala: scala, box: bw },
          titolo: orig.nome || null
        });
        if (ins.error) throw ins.error;

        ov.remove();
        caricaSitoMedia();
      } catch (e) {
        alert("Non sono riuscito a salvare: " + (e.message || e));
        btn.disabled = false; btn.textContent = "Aggiungi alla galleria";
      }
    };
  }

  function renderMedia(gridId, media, key, multi) {
    const grid = document.getElementById(gridId);
    if (!media.length) { grid.innerHTML = `<div style="color:#94a3b8;font-size:13px;grid-column:1/-1;padding:8px;">Niente qui. Aggiungi le foto dalla Galleria del sito, in cima.</div>`; return; }
    // Riquadro con quello che si e' scelto: numerato, nell'ordine in cui
    // finisce in copertina, con la x per togliere.
    const boxId = gridId + "-scelte";
    let box = document.getElementById(boxId);
    if (!box) {
      box = document.createElement("div");
      box.id = boxId;
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;padding:10px;background:#f1f5f9;border-radius:10px;";
      grid.parentNode.insertBefore(box, grid);
    }
    function scelte() {
      const v = fotoSel[key];
      return multi ? (v || []) : (v ? [v] : []);
    }
    function aggiornaScelte() {
      const urls = scelte();
      if (!urls.length) { box.innerHTML = '<span style="font-size:12px;color:#94a3b8;">Niente scelto</span>'; return; }
      box.innerHTML = '<div style="width:100%;font-size:12px;font-weight:600;">' +
        (multi ? urls.length + ' scelte, in questo ordine' : 'Scelto') + '</div>' +
        urls.map(function (u, i) {
          const mm = media.find(function (x) { return x.url === u; }) || {};
          const vid = mm.tipo === "video";
          return '<div style="position:relative;width:62px;height:62px;border-radius:8px;overflow:hidden;background:#000;">' +
            (vid ? '<video src="' + u + '" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>'
                 : '<img src="' + u + '" style="width:100%;height:100%;object-fit:cover;">') +
            (multi ? '<div style="position:absolute;bottom:2px;left:2px;background:#0f4c5c;color:#fff;font-size:10px;width:16px;height:16px;border-radius:8px;text-align:center;line-height:16px;">' + (i + 1) + '</div>' : '') +
            '<button data-tog="' + u + '" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.65);color:#fff;border:0;border-radius:8px;width:17px;height:17px;font-size:12px;line-height:1;padding:0;">&times;</button></div>';
        }).join("");
      box.querySelectorAll("button[data-tog]").forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          const u = b.dataset.tog;
          if (multi) fotoSel[key] = (fotoSel[key] || []).filter(function (x) { return x !== u; });
          else fotoSel[key] = null;
          const it = grid.querySelector('.sw-media-item[data-url="' + u + '"]');
          if (it) it.classList.remove("selected");
          aggiornaScelte();
        };
      });
    }

    // Filtri per tipo: con centinaia di media trovarne uno a mano e' un lavoro.
    const tags = Array.from(new Set(media.map(function (m) { return m.tag; }).filter(Boolean))).sort();
    const barId = gridId + "-filtri";
    let bar = document.getElementById(barId);
    if (!bar && tags.length > 1) {
      bar = document.createElement("div");
      bar.id = barId;
      bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;";
      bar.innerHTML = '<button data-t="">Tutte</button>' +
        tags.map(function (t) { return '<button data-t="' + t + '">' + t + '</button>'; }).join("");
      bar.querySelectorAll("button").forEach(function (b) {
        b.style.cssText = "border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;";
        b.onclick = function () {
          bar.querySelectorAll("button").forEach(function (x) { x.style.background = "#fff"; x.style.color = "#0f172a"; });
          b.style.background = "#0f4c5c"; b.style.color = "#fff";
          const t = b.dataset.t;
          disegna(t ? media.filter(function (m) { return m.tag === t; }) : media);
        };
      });
      grid.parentNode.insertBefore(bar, grid);
    }

    function disegna(elenco) {
      grid.innerHTML = elenco.map(m => {
        const isV = m.tipo === "video";
        const isSel = multi ? (fotoSel[key] || []).includes(m.url) : fotoSel[key] === m.url;
        return `<div class="sw-media-item${isSel ? ' selected' : ''}" data-url="${m.url}" data-key="${key}">
          ${isV ? `<video src="${m.url}" muted preload="metadata"></video>` : `<img src="${m.thumb_url || m.url}" alt="${m.nome || ''}" loading="lazy" decoding="async">`}
          <div class="sw-media-check">✓</div>
          <button class="sw-lente" data-big="${m.url}" data-vid="${isV ? 1 : 0}" title="Vedi grande">🔍</button>
          <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:white;font-size:9px;padding:2px 5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${m.nome || ""}</div>
        </div>`;
      }).join("");
      grid.querySelectorAll(".sw-lente").forEach(b => {
        b.onclick = ev => { ev.stopPropagation(); apriAnteprima(b.dataset.big, b.dataset.vid === "1"); };
      });
      grid.querySelectorAll(".sw-media-item").forEach(el => {
        el.onclick = () => {
          if (multi) {
            el.classList.toggle("selected");
            fotoSel[key] = el.classList.contains("selected")
              ? [...(fotoSel[key] || []), el.dataset.url]
              : (fotoSel[key] || []).filter(u => u !== el.dataset.url);
          } else if (el.classList.contains("selected")) {
            el.classList.remove("selected");
            fotoSel[key] = null;
          } else {
            grid.querySelectorAll(".sw-media-item").forEach(x => x.classList.remove("selected"));
            el.classList.add("selected");
            fotoSel[key] = el.dataset.url;
          }
          aggiornaScelte();
        };
      });
    }

    aggiornaScelte();
    disegna(media);
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

    // Recensioni vere della sede: solo quelle accese dal titolare.
    let recensioni = [];
    if (sedeId) {
      const { data: rec } = await sc.from("recensioni")
        .select("voto,testo,autore")
        .eq("sede_id", sedeId).eq("visibile", true).gte("voto", 4)
        .order("created_at", { ascending: false }).limit(6);
      recensioni = rec || [];
    }

    // Menu del giorno: si prende quello di oggi, solo se il titolare
    // l'ha pubblicato. Se non c'e', la sezione non viene proprio stampata.
    let menuOggi = null;
    if (sedeId && sezioniState.menugiorno) {
      const oggi = new Date().toISOString().slice(0, 10);
      const { data: mg } = await sc.from("menu_giorno")
        .select("titolo,voci,note,prezzo_fisso,prezzo_visibile")
        .eq("sede_id", sedeId).eq("data", oggi).eq("pubblicato", true)
        .maybeSingle();
      if (mg && Array.isArray(mg.voci) && mg.voci.length) menuOggi = mg;
    }

    const logo    = sede?.logo_url || az?.logo_url || "";
    const clrBtn  = conf.colore_brand      || sede?.colore_brand      || az?.colore_brand || "#794d01";
    const clrAcc  = conf.colore_secondario || sede?.colore_secondario || "#c4892a";
    // sugli sfondi scuri (barra, mappa, piede) un accento scuro (es. marrone) non si legge: li' si usa un oro chiaro
    const lum = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "")); if (!m) return 0.5; const c = [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const clrAccChiaro = lum(clrAcc) < 0.3 ? "#E3B866" : clrAcc;
    const font    = conf.font_family || "Inter";
    const tel     = conf.telefono || sede?.telefono || profilo?.telefono || "";
    const em      = conf.email    || profilo?.email  || "";
    const ind     = conf.indirizzo || [profilo?.indirizzo, profilo?.citta].filter(Boolean).join(", ") || "";
    const mapsUrl = profilo?.google_maps_url || (ind ? `https://maps.google.com/?q=${encodeURIComponent(ind)}` : "#");
    const lat     = sede?.lat || profilo?.lat || 42.4597;
    const lng     = sede?.lng || profilo?.lng || 12.3857;
    const nome    = conf.nome || sedeSelezionata?.nome || "Ristorante";
    const cta     = conf.hero_cta || "Prenota un tavolo";
    // Copertina: le foto scelte nel gestionale. Se non ce ne sono si usa
    // la vecchia foto singola, cosi' i siti gia' pubblicati non cambiano.
    // Tre dati secchi sotto i bottoni: chi cerca dove mangiare mentre e' in
    // viaggio decide su questi, non sulle descrizioni.
    const fatti = [];
    if (recensioni.length >= 3) {
      const media = recensioni.reduce((t, r) => t + (Number(r.voto) || 0), 0) / recensioni.length;
      fatti.push("\u2605 " + media.toFixed(1).replace(".", ",") + " su " + recensioni.length + " recensioni");
    }
    if (menuOggi && menuOggi.prezzo_visibile && Number(menuOggi.prezzo_fisso) > 0) {
      fatti.push("Menu del giorno " + Number(menuOggi.prezzo_fisso).toFixed(0) + " \u20AC");
    }
    if (conf.hl1 && conf.hl1.titolo) fatti.push(conf.hl1.titolo);

    // Nelle sezioni si puo' mettere un video oppure una foto: si distingue
    // dall'estensione, cosi' il titolare sceglie quello che ha.
    const eVideo = function (u) { return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(u || "")); };
    const mediaSezione = function (u, etichetta) {
      if (!u) return "";
      return eVideo(u)
        ? `<div class="reel-item" onclick="apriVideo('${esc(u)}')"><video src="${esc(u)}" autoplay muted loop playsinline></video><div class="reel-tocca">${etichetta}</div></div>`
        : `<div class="reel-item" onclick="apriVideo('${esc(u)}')"><img src="${esc(u)}" alt="" loading="lazy"></div>`;
    };

    const copertina = (Array.isArray(conf.foto_header) && conf.foto_header.length)
      ? conf.foto_header.slice(0, 6)
      : (conf.foto_cover ? [conf.foto_cover] : []);
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

    // ── orari ricavati dal testo libero ("Lunedì-sabato 12:00-14:30 (domenica chiuso a pranzo)"): servono per "Aperto ora" e per Google ──
    const GIORNI_IT = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];   // getDay(): 0 = domenica
    const fasciaDa = (testo) => {
      const t = String(testo || "");
      const m = /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/.exec(t);
      if (!m) return null;
      const x = t.toLowerCase().replace(/ì/g, "i").replace(/ù/g, "u");
      const chiusi = [];
      GIORNI_IT.forEach((g, i) => {
        if (new RegExp(g + "\\s*(?:sera|mattina|a pranzo|a cena)?\\s*chius").test(x) || new RegExp("chius\\w*\\s+(?:il\\s+|di\\s+)?" + g).test(x)) chiusi.push(i);
      });
      const p2 = (n) => String(n).padStart(2, "0");
      return { da: p2(m[1]) + ":" + m[2], a: p2(m[3]) + ":" + m[4], chiusi };
    };
    const fasce = [fasciaDa(conf.orari_pranzo), fasciaDa(conf.orari_cena)].filter(Boolean);

    // ── dati strutturati per Google e per gli assistenti (ChatGPT...): nome, indirizzo, telefono, orari, menu ──
    const dom = String(conf.dominio || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const giorniSchema = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const indParti = String(conf.indirizzo || "").split(",").map((s) => s.trim()).filter(Boolean);
    const ld = {
      "@context": "https://schema.org", "@type": "Restaurant", name: nome,
      ...(dom ? { url: "https://" + dom, hasMenu: "https://" + dom + "/menu.html" } : {}),
      ...(conf.telefono ? { telephone: conf.telefono } : {}),
      ...(conf.foto_cover ? { image: conf.foto_cover } : {}),
      ...(indParti.length ? { address: { "@type": "PostalAddress", streetAddress: indParti[0], ...(indParti[1] ? { addressLocality: indParti[1] } : {}), addressCountry: "IT" } } : {}),
      ...(fasce.length ? { openingHoursSpecification: fasce.map((f) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: giorniSchema.filter((_, i) => !f.chiusi.includes(i)), opens: f.da, closes: f.a })) } : {}),
      acceptsReservations: true,
    };
    const jsonLd = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;

    // ── tracciamenti per le pubblicita' (Meta, Google): partono SOLO se il visitatore accetta il banner ──
    let metaPixelId = "", gtmId = "", ga4Id = "", adsId = "", privacyUrl = "";
    try {
      const { data: ident } = await sc.from("azienda_identita").select("meta_pixel_id, gtm_id, ga4_id, gads_id, privacy_url").eq("azienda_id", aziendaId).maybeSingle();
      metaPixelId = String(ident?.meta_pixel_id || "").replace(/[^0-9]/g, "");
      gtmId = String(ident?.gtm_id || "").replace(/[^A-Za-z0-9-]/g, "");
      ga4Id = String(ident?.ga4_id || "").replace(/[^A-Za-z0-9-]/g, "");
      adsId = String(ident?.gads_id || "").replace(/[^A-Za-z0-9-]/g, "");
      privacyUrl = /^https?:\/\//i.test(String(ident?.privacy_url || "").trim()) ? String(ident.privacy_url).trim() : "";
    } catch (e) { /* senza ID il sito non carica niente */ }
    const consensoScript = (metaPixelId || gtmId || ga4Id || adsId) ? `<script>(function(){
var META='${metaPixelId}',GTM='${gtmId}',GA4='${ga4Id}',ADS='${adsId}',K='rf_consenso';
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
function st(){try{return localStorage.getItem(K);}catch(e){return null;}}
function carica(){
  gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
  if(META&&!window.fbq){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',META);fbq('track','PageView');}
  if(!GTM&&(GA4||ADS)&&!window.__gtagOk){window.__gtagOk=1;var gs=document.createElement('script');gs.async=true;gs.src='https://www.googletagmanager.com/gtag/js?id='+(GA4||ADS);document.head.appendChild(gs);gtag('js',new Date());if(GA4)gtag('config',GA4);if(ADS)gtag('config',ADS);}
  if(GTM&&!window.__gtmOk){window.__gtmOk=1;(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',GTM);}
}
var MAP={cta_prenota:'InitiateCheckout',click_telefono:'Contact',wame:'Contact',click_menu:'ViewContent',click_mappa:'FindLocation',prenotazione_completata:'Schedule'};
window.rfDecisione=st;
window.rfEvento=function(el){if(st()!=='si')return;try{if(window.fbq&&MAP[el])fbq('track',MAP[el]);dataLayer.push({event:'rf_'+el});if(!GTM&&(GA4||ADS)){gtag('event',el);if(el==='click_telefono')gtag('event','tel');}}catch(e){}};
function banner(){
  var b=document.createElement('div');
  b.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9998;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:14px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.28);font:14px/1.45 system-ui,sans-serif;max-width:520px;margin:0 auto;';
  b.innerHTML='<div style="margin-bottom:10px;">Usiamo i cookie.${privacyUrl ? ` <a href="${esc(privacyUrl)}" target="_blank" rel="noopener" style="color:#6b7280;text-decoration:underline">Privacy</a>` : ""}</div>'
    +'<div style="display:flex;gap:8px;"><button id="rf-ck-no" style="flex:1;border:1px solid #d1d5db;background:#f3f4f6;color:#111827;border-radius:10px;padding:11px;font-weight:700;font-size:14px;">Rifiuta</button>'
    +'<button id="rf-ck-si" style="flex:1;border:0;background:var(--btn);color:#fff;border-radius:10px;padding:11px;font-weight:800;font-size:14px;">Accetta</button></div>';
  document.body.appendChild(b);
  function fine(v){try{localStorage.setItem(K,v);}catch(e){}b.remove();if(v==='si')carica();}
  b.querySelector('#rf-ck-si').onclick=function(){fine('si');};
  b.querySelector('#rf-ck-no').onclick=function(){fine('no');};
}
if(st()==='si')carica();else if(st()!=='no')document.addEventListener('DOMContentLoaded',banner);
})();</script>` : "";

    // ── WhatsApp della sede (il numero del chatbot): chi scrive entra nel tuo WhatsApp con il suo numero ──
    let waUrl = "";
    try {
      if (sedeId) {
        const { data: wa } = await sc.from("whatsapp_connessioni").select("numero_telefono").eq("azienda_id", aziendaId).eq("sede_id", sedeId).eq("attivo", true).limit(1);
        let n = String(wa?.[0]?.numero_telefono || "").replace(/[^0-9]/g, "");
        if (n.length === 10 && n.startsWith("3")) n = "39" + n;
        if (n.length >= 11) waUrl = "https://wa.me/" + n + "?text=" + encodeURIComponent("Buongiorno, vorrei prenotare un tavolo dal vostro sito.");
      }
    } catch (e) { /* senza numero il pulsante WhatsApp non compare */ }

    const fontUrl = font === "Inter" ? "Inter:wght@300;400;600;700"
      : font === "Playfair Display" ? "Playfair+Display:ital,wght@0,600;1,400"
      : font === "Montserrat" ? "Montserrat:wght@300;400;600;700"
      : font === "Lato" ? "Lato:wght@300;400;700"
      : font === "Merriweather" ? "Merriweather:ital,wght@0,400;0,700;1,400"
      : "Inter:wght@300;400;600;700";

    const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--btn:${clrBtn};--acc:${clrAcc};--accl:${clrAccChiaro};--scuro:#1A1209;--caldo:#F5EFE4;--grigio:#6B5E4E}
html{scroll-behavior:smooth}
body{font-family:'${font}',system-ui,sans-serif;background:#fff;color:var(--scuro);overflow-x:hidden}
a{text-decoration:none;color:inherit}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(26,18,9,.92);backdrop-filter:blur(12px)}
.nav-logo{display:flex;align-items:center;gap:8px}
.nav-logo img{width:42px;height:42px;border-radius:50%;object-fit:cover}
.nav-logo span{font-family:'Cormorant Garamond',serif;font-size:clamp(21px,5.6vw,30px);font-weight:700;color:var(--accl);letter-spacing:.3px;line-height:1.1}
.nav-links{display:flex;gap:18px}
.nav-links a{font-size:12px;color:rgba(255,255,255,.75);letter-spacing:.4px}
.nav-links a:hover{color:var(--accl)}
.nav-cta{background:var(--btn);color:#fff;font-size:12px;font-weight:800;padding:8px 18px;border-radius:6px}
@media(max-width:600px){.nav-links{display:none}.nav-burger{display:block}}
.nav-burger{display:none;background:transparent;border:0;color:#fff;font-size:30px;line-height:1;padding:4px 8px;cursor:pointer}
.nav-panel{display:none;position:fixed;top:68px;left:0;right:0;z-index:99;background:rgba(26,18,9,.97);padding:6px 20px 18px;flex-direction:column;box-shadow:0 14px 30px rgba(0,0,0,.35)}
.nav-panel.open{display:flex}
.nav-panel a{color:#fff;font-size:19px;padding:14px 4px;border-bottom:1px solid rgba(255,255,255,.12)}
.nav-panel .np-p{background:var(--btn);border-radius:10px;text-align:center;font-weight:800;margin-top:14px;border:0}
.nav-panel .np-c{background:#fff;color:var(--btn);border-radius:10px;text-align:center;font-weight:800;margin-top:8px;border:0}
.nav-panel .np-w{background:#25D366;color:#073b1f;border-radius:10px;text-align:center;font-weight:800;margin-top:8px;border:0}
@media(min-width:601px){.nav-panel{display:none!important}}
.cta-bar{position:sticky;bottom:0;z-index:90;display:flex;background:var(--caldo);border-top:1px solid #d8ccba;box-shadow:0 -4px 14px rgba(0,0,0,.10)}
.cta-bar a{flex:1;padding:14px 4px;text-align:center;font-size:12.5px;font-weight:800;letter-spacing:.2px}
.cta-p{background:var(--btn);color:#fff}
.cta-c{background:#2e7d32;color:#fff}
.cta-i{background:#1f5f8b;color:#fff}
.cta-m{background:#efe6d6;color:#4b3b25}
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
.reel-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px}
@media(max-width:760px){.reel-grid{grid-template-columns:1fr;gap:26px}}
.reel-blocco{display:grid;grid-template-columns:38% 1fr;gap:14px;align-items:start}
@media(max-width:380px){.reel-blocco{grid-template-columns:1fr}}
.reel-testo{padding:0}
.reel-testo h3{font-family:'Cormorant Garamond',serif;font-size:21px;font-style:italic;margin-bottom:4px}
.reel-testo .occhiello{font-size:10px;letter-spacing:2px;color:var(--acc);text-transform:uppercase;margin-bottom:6px}
.reel-testo p{font-size:14.5px;line-height:1.6;color:var(--grigio)}
.reel-tocca{position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:5px 10px;border-radius:999px;pointer-events:none}
.cop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;animation:cop 30s infinite}
@keyframes cop{0%{opacity:0}3%{opacity:.85}16%{opacity:.85}20%{opacity:0}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.cop{animation:none;opacity:0}.cop:first-of-type{opacity:.85}}
.reel-item{position:relative;aspect-ratio:3/4;max-height:38svh;overflow:hidden;background:var(--scuro);border-radius:12px;cursor:pointer}
.reel-item video{width:100%;height:100%;object-fit:cover}
.reel-item video,.reel-item img{width:100%;height:100%;object-fit:cover}
.reel-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(26,18,9,.75) 0%,transparent 50%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
.reel-lbl{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#fff;margin-bottom:3px}
.reel-sub{font-size:10px;letter-spacing:2px;color:var(--accl);text-transform:uppercase}
.mare-s{background:var(--scuro);padding:72px 20px}
.mare-i{max-width:700px;margin:0 auto;color:#fff}
.mare-q{font-family:'Cormorant Garamond',serif;font-size:clamp(20px,4vw,34px);font-style:italic;line-height:1.4;margin-bottom:24px;border-left:2px solid var(--accl);padding-left:20px}
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
.rev-bg{background:var(--caldo);padding:72px 20px;scroll-margin-top:64px}
.rev-c{background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.rev-strip{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding-bottom:8px;margin:0 -20px;padding-left:20px;padding-right:20px}
.rev-strip::-webkit-scrollbar{display:none}
.rev-strip .rev-c{flex:0 0 80%;max-width:340px;scroll-snap-align:start;margin-bottom:0}
@media(min-width:760px){.rev-strip .rev-c{flex-basis:45%}}
.rev-scorri{font-size:12px;color:var(--grigio);margin-top:6px}
.rev-t{font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;line-height:1.6;margin-bottom:10px}
.stars{color:var(--acc);letter-spacing:2px;font-size:13px;margin-bottom:6px}
.map-s{background:var(--scuro);padding:72px 20px}
.map-i{max-width:700px;margin:0 auto;color:#fff}
.map-g{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
@media(max-width:480px){.map-g{grid-template-columns:1fr}}
.map-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--accl);margin-bottom:3px}
.map-v{font-size:13px;color:rgba(255,255,255,.88);line-height:1.5}
.map-v a{color:var(--accl);text-decoration:underline}
footer{background:#0e0a04;padding:36px 20px;text-align:center}
.ft-logo{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--accl);margin-bottom:10px;font-style:italic}
.ft-links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
.ft-links a{font-size:11px;color:rgba(255,255,255,.35)}
.ft-copy{font-size:10px;color:rgba(255,255,255,.2)}`;

    const head = (title) => `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(conf.chisiamo_1?.slice(0,150)||'')}">
${jsonLd}
${consensoScript}
<meta property="og:title" content="${esc(nome)}">
<meta property="og:image" content="${esc(conf.foto_cover||'')}">
<title>${esc(title)} — ${esc(nome)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400&family=${fontUrl}&display=swap" rel="stylesheet">
<style>${css}</style>
<script>
// Video a schermo pieno al tocco: sul telefono un video incastrato in una
// colonna non si guarda, cosi' si apre grande e con l'audio.
function apriVideo(u){
  /* si apre a schermo pieno: video con l'audio, foto grande. Si segna quanti guardano (e quanto) */
  var img=/\\.(jpe?g|png|webp|gif|avif)(\\?|$)/i.test(String(u));
  try{window._rfTrack&&window._rfTrack('click',img?'foto_apri':'video_apri',{valore:String(u).slice(-60)});}catch(e){}
  var o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;padding:12px';
  o.innerHTML=(img
      ? '<img src="'+u+'" alt="" style="max-width:100%;max-height:92vh;border-radius:12px">'
      : '<video src="'+u+'" controls autoplay playsinline style="max-width:100%;max-height:92vh;border-radius:12px"></video>')
    +'<div style="position:absolute;top:14px;right:18px;color:#fff;font-size:30px;line-height:1">&times;</div>';
  o.onclick=function(){o.remove()};
  document.body.appendChild(o);
  if(!img){
    var v=o.querySelector('video'),meta=0;
    v.addEventListener('timeupdate',function(){if(!meta&&v.duration&&v.currentTime/v.duration>=.5){meta=1;try{window._rfTrack('click','video_meta',{});}catch(e){}}});
    v.addEventListener('ended',function(){try{window._rfTrack('click','video_fine',{});}catch(e){}});
  }
}
(function(){
  var SID=sessionStorage.getItem('rf_sid')||(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
  /* aperture del titolare: ?escludi=1 esclude questo dispositivo, ?escludi=0 lo riattiva */
  try{var QE=new URLSearchParams(location.search).get('escludi');if(QE==='1')localStorage.setItem('rf_escludi','1');if(QE==='0')localStorage.removeItem('rf_escludi');}catch(e){}
  var ESCL=false;try{ESCL=localStorage.getItem('rf_escludi')==='1';}catch(e){}
  /* da dove e' arrivata la visita (prima apertura): passa alla pagina di prenotazione */
  var SRC='';try{SRC=sessionStorage.getItem('rf_src')||'';if(!SRC){var UQ=new URLSearchParams(location.search).get('utm_source');var RH='';if(!UQ&&document.referrer){try{RH=new URL(document.referrer).hostname.replace(/^www\./,'');}catch(e){}}SRC=UQ||RH||'diretto';sessionStorage.setItem('rf_src',SRC);}}catch(e){}
  sessionStorage.setItem('rf_sid',SID);
  var AZ_ID='${aziendaId||""}';
  var SEDE_ID='${sedeId||""}';
  var PAGINA=location.pathname.split('/').pop().replace('.html','')||'home';
  window._rfTrack=function(tipo,elemento,extra){
    if(ESCL)return;
    try{window.rfEvento&&window.rfEvento(elemento);}catch(e){}
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
      try{if(/ristoflow-ai\.com/.test(href)&&!/utm_source=/.test(href)&&SRC){var UU=new URL(href);UU.searchParams.set('utm_source',SRC);UU.searchParams.set('rf_sid',SID);var DC=window.rfDecisione&&window.rfDecisione();if(DC)UU.searchParams.set('rf_c',DC==='si'?'1':'0');a.href=UU.toString();}}catch(e){}
      window._rfTrack('click','cta_prenota',{valore:href.slice(0,80)});
    } else if(a.classList.contains('cta-c')||href.startsWith('tel:')){
      window._rfTrack('click','click_telefono',{valore:href});
    } else if(href.includes('menu.html')||a.classList.contains('cta-m')){
      window._rfTrack('click','click_menu',{});
    } else if(href.includes('wa.me')){
      window._rfTrack('click','wame',{valore:'whatsapp'});
    } else if(href.includes('contatti.html')||href.includes('maps')){
      window._rfTrack('click','click_mappa',{});
    }
  });
  /* contenuti: la galleria viene vista? fin dove scorrono? quanto restano? */
  try{
    var galVista=false,soglie={25:0,50:0,75:0,100:0};
    var gal=document.querySelector('.reel-item');
    if(gal&&window.IntersectionObserver){
      new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting&&!galVista){galVista=true;window._rfTrack('click','galleria_vista',{});}});},{threshold:.5}).observe(gal);
    }
    window.addEventListener('scroll',function(){
      var h=document.documentElement,tot=h.scrollHeight-h.clientHeight;if(tot<=0)return;
      var p=Math.round(100*h.scrollTop/tot);
      [25,50,75,100].forEach(function(s){if(p>=s&&!soglie[s]){soglie[s]=1;window._rfTrack('click','scroll_'+s,{});}});
    },{passive:true});
    var t0=Date.now(),mandato=false;
    var tempo=function(){if(mandato)return;var s=Math.round((Date.now()-t0)/1000);if(s<2)return;mandato=true;window._rfTrack('click','tempo_pagina',{valore:String(s)});};
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')tempo();});
    window.addEventListener('pagehide',tempo);
  }catch(e){}
})();
</script>
</head>`;

    const nav = `<nav class="nav">
  <a class="nav-logo" href="index.html">${logo ? `<img src="${esc(logo)}" alt="Logo">` : ""}<span>${esc(nome)}</span></a>
  <div class="nav-links">
    <a href="index.html">Home</a><a href="chi-siamo.html">Chi siamo</a>
    <a href="menu.html">Menu</a><a href="contatti.html">Contatti</a>
  </div>
  <button class="nav-burger" type="button" aria-label="Menu" aria-expanded="false" onclick="var p=document.getElementById('nav-panel');var o=p.classList.toggle('open');this.setAttribute('aria-expanded',o);this.textContent=o?'✕':'☰';">☰</button>
</nav>
<div id="nav-panel" class="nav-panel">
  <a href="index.html">Home</a><a href="chi-siamo.html">Chi siamo</a><a href="menu.html">Menu</a><a href="contatti.html">Contatti</a>
  <a class="np-p" href="${esc(formUrl)}">🗓 ${esc(cta)}</a>
  ${tel ? `<a class="np-c" href="tel:${esc(tel)}">📞 Chiama</a>` : ""}
  ${waUrl ? `<a class="np-w" href="${esc(waUrl)}">💬 WhatsApp</a>` : ""}
</div>`;

    const ctaBar = `<div class="cta-bar">
  <a class="cta-p" href="${esc(formUrl)}">🗓 Prenota</a>
  ${tel ? `<a class="cta-c" href="tel:${esc(tel)}">📞 Chiama</a>` : ""}
  ${mapsUrl && mapsUrl !== "#" ? `<a class="cta-i" href="${esc(mapsUrl)}">📍 Indicazioni</a>` : ""}
  <a class="cta-m" href="menu.html">📋 Menu</a>
</div>`;

    const footer = `<footer>
  <div class="ft-logo">${esc(nome)}</div>
  <div class="ft-links"><a href="index.html">Home</a><a href="chi-siamo.html">Chi siamo</a><a href="menu.html">Menu</a><a href="contatti.html">Contatti</a><a href="${esc(formUrl)}">${esc(cta)}</a></div>
  <div class="ft-copy">© ${new Date().getFullYear()} ${esc(nome)}${conf.piva ? ` — P.IVA ${esc(conf.piva)}` : ""}${privacyUrl ? ` · <a href="${esc(privacyUrl)}" style="color:inherit;text-decoration:underline">Privacy e cookie</a>` : ""}</div>
</footer>`;

    const menuItemsHTML = menuCats.map((c, i) => `
  <div class="menu-cat" data-cat="${c.id}" style="${i > 0 ? 'display:none' : ''}">
    ${menuVoci.filter(v => v.categoria_id === c.id).map(v => `
    <div class="mi">
      <div><div class="mi-n">${esc(v.nome)}</div>${v.descrizione ? `<div class="mi-d">${esc(v.descrizione)}</div>` : ""}</div>
      ${v.prezzo ? `<div class="mi-p">€ ${Number(v.prezzo).toFixed(2)}</div>` : ""}
    </div>`).join("")}
  </div>`).join("");

    const menuScript = `<script>function filtraMenu(id,btn){document.querySelectorAll('.menu-cat').forEach(el=>el.style.display='none');document.querySelectorAll('.mcat-btn').forEach(b=>b.classList.remove('active'));var el=document.querySelector('.menu-cat[data-cat="'+id+'"]');if(el)el.style.display='';if(btn)btn.classList.add('active')}</script>${sedeId ? menuLive(sedeId) : ""}`;

    // ── HOME ──────────────────────────────────────────────────
    const home = `${head(nome)}
<body>
${nav}
<div style="position:relative;min-height:82svh;display:flex;align-items:flex-end;overflow:hidden;">
  <div style="position:absolute;inset:0;background:var(--scuro);">
    ${conf.video_hero
      ? `<video src="${esc(conf.video_hero)}" autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85;"></video>`
      : (copertina.length > 1
          ? copertina.map((u,i) => `<img src="${esc(u)}" class="cop" style="animation-delay:${i*5}s" alt="">`).join("")
          : (copertina[0] ? `<img src="${esc(copertina[0])}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85;" alt="">` : ""))}
  </div>
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,.1) 55%,transparent 100%);"></div>
  <div style="position:relative;z-index:2;width:100%;max-width:1100px;margin:0 auto;padding:0 20px 34px;text-align:left;">
    <!-- l'indicatore Aperto/Chiuso sta sopra i pulsanti Prenota e Chiama -->
    <script>document.addEventListener('DOMContentLoaded',function(){var S=${JSON.stringify(fasce)};var el=document.getElementById('rf-aperto');if(!S.length||!el)return;
var n=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Rome'}));var g=n.getDay(),m=n.getHours()*60+n.getMinutes();
function mm(h){var p=h.split(':');return (+p[0])*60+(+p[1]);}
function aperta(s,d){return s.chiusi.indexOf(d)<0;}
var txt='',ok=false;
for(var i=0;i<S.length;i++){var s=S[i];if(aperta(s,g)&&m>=mm(s.da)&&m<mm(s.a)){txt='Aperto ora · fino alle '+s.a;ok=true;break;}}
if(!ok){var best=null;
for(var k=0;k<3&&!best;k++){var d=(g+k)%7;for(var j=0;j<S.length;j++){var t=S[j];if(!aperta(t,d))continue;var inizio=mm(t.da);if(k===0&&inizio<=m)continue;if(!best||inizio<best.i){best={k:k,i:inizio,da:t.da};}}}
if(best)txt='Chiuso · riapre '+(best.k===0?'alle ':(best.k===1?'domani alle ':'dopodomani alle '))+best.da;}
if(txt){el.textContent=(ok?'🟢 ':'🔴 ')+txt;el.style.display='inline-block';}});</script>
    <div class="eyebrow" style="color:#fff;font-size:15px;font-weight:700;letter-spacing:2.5px;text-shadow:0 2px 8px rgba(0,0,0,.65);margin-bottom:6px;">Orte · uscita A1</div>
    <h1 class="h2" style="color:#fff;font-size:clamp(31px,8vw,58px);line-height:1.06;margin:8px 0 10px;text-shadow:0 2px 12px rgba(0,0,0,.5);">${esc(conf.hero_titolo || nome)}</h1>
    ${conf.hero_sub ? `<p style="font-size:16px;color:rgba(255,255,255,.9);margin-bottom:20px;max-width:34ch;text-shadow:0 1px 6px rgba(0,0,0,.5);">${esc(conf.hero_sub)}</p>` : ""}
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:min(100%,430px);">
      <div id="rf-aperto" style="display:none;background:rgba(255,255,255,.96);color:#1f2937;font-size:14px;font-weight:700;padding:7px 14px;border-radius:999px;text-align:center;"></div>
      <div style="display:flex;gap:10px;width:100%;">
        <a class="btn" href="${esc(formUrl)}" style="flex:1 1 0;text-align:center;font-size:14.5px;padding:15px 8px;margin:6px 0 0;">🗓 ${esc(cta)}</a>
        ${tel ? `<a class="btn" href="tel:${esc(tel)}" style="flex:1 1 0;text-align:center;font-size:14.5px;padding:15px 8px;margin:6px 0 0;background:#fff;color:var(--btn);">📞 Chiama</a>` : ""}
      </div>
      ${waUrl ? `<a href="${esc(waUrl)}" style="display:block;width:100%;box-sizing:border-box;text-align:center;background:#25D366;color:#073b1f;font-weight:800;font-size:14.5px;padding:13px 8px;border-radius:8px;">💬 Scrivici su WhatsApp</a>` : ""}
    </div>
    ${fatti.length ? `<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px;">${fatti.map(f => f.charAt(0) === "\u2605"
      ? `<a href="#recensioni" style="border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.16);color:#fff;padding:5px 11px;border-radius:999px;font-size:12.5px;font-weight:700;">${esc(f)} ›</a>`
      : `<span style="border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.88);padding:5px 11px;border-radius:999px;font-size:12.5px;">${esc(f)}</span>`).join("")}</div>` : ""}
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
  ${conf.foto_reel_terra ? `<div class="reel-blocco">
    ${mediaSezione(conf.foto_reel_terra, "Tocca")}
    <div class="reel-testo"><div class="occhiello">${esc(conf.sez1_occhiello || "Tradizione · Territorio")}</div><h3>${esc(conf.sez1_titolo || "I primi di terra")}</h3>${conf.chisiamo_2 ? `<p>${esc(conf.chisiamo_2)}</p>` : ""}</div>
  </div>` : ""}
  ${conf.foto_reel_mare ? `<div class="reel-blocco">
    ${mediaSezione(conf.foto_reel_mare, "Tocca")}
    <div class="reel-testo"><div class="occhiello">${esc(conf.sez2_occhiello || "Scelto ogni mattina")}</div><h3>${esc(conf.sez2_titolo || "Il nostro mare")}</h3>${conf.mare_testo ? `<p>${esc(conf.mare_testo)}</p>` : ""}</div>
  </div>` : ""}
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
    <div data-menu-live>
    <div class="mcat">${menuCats.map((c,i) => `<button class="mcat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`).join("")}</div>
    <div>${menuItemsHTML}</div>
    </div>
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
${menuOggi ? `
<section class="section" id="menugiorno">
  <div class="eyebrow">Oggi in cucina</div>
  <h2 class="h2" style="margin-bottom:6px;">${esc(menuOggi.titolo || "Menu del giorno")}</h2>
  ${menuOggi.prezzo_visibile && Number(menuOggi.prezzo_fisso) > 0
    ? `<div style="font-size:19px;color:var(--btn);font-weight:600;margin-bottom:16px;">${Number(menuOggi.prezzo_fisso).toFixed(0)} € a persona</div>`
    : `<div style="margin-bottom:16px;"></div>`}
  ${["antipasti","primi","secondi","contorni","dolci"].map(p => {
      const v = menuOggi.voci.filter(x => (x.portata || "").toLowerCase() === p);
      if (!v.length) return "";
      return `<div style="margin-bottom:14px;">
        <div class="eyebrow" style="margin-bottom:6px;">${p}</div>
        ${v.map(x => `<div style="padding:5px 0;border-bottom:1px solid #eee;font-size:15px;">${esc(x.nome)}</div>`).join("")}
      </div>`;
    }).join("")}
  ${menuOggi.note ? `<p style="font-size:14px;color:var(--grigio);margin-top:10px;">${esc(menuOggi.note)}</p>` : ""}
  <div style="margin-top:18px;"><a class="btn" href="${esc(formUrl)}">🗓 ${esc(cta)}</a></div>
</section>` : ""}
${sezioniState.recensioni && recensioni.length ? `
<div class="rev-bg" id="recensioni">
  <div style="max-width:700px;margin:0 auto;">
    <div class="eyebrow">Dicono di noi</div>
    <h2 class="h2" style="margin-bottom:24px;">L'opinione<br><em>dei nostri ospiti</em></h2>
    <div class="rev-strip">${recensioni.map(r => `<div class="rev-c"><div class="stars">${"★".repeat(Number(r.voto)||5)}</div><div class="rev-t">"${esc(r.testo)}"</div>${r.autore ? `<div style="font-size:12px;color:var(--grigio)"><strong>${esc(r.autore)}</strong></div>` : ""}</div>`).join("")}</div>
    ${recensioni.length > 1 ? `<div class="rev-scorri">Scorri per leggerne altre &rarr;</div>` : ""}
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
    <div data-menu-live>
    <div class="mcat">${menuCats.map((c,i) => `<button class="mcat-btn${i===0?' active':''}" onclick="filtraMenu('${c.id}',this)">${esc(c.nome)}</button>`).join("")}</div>
    <div>${menuItemsHTML}</div>
    </div>` : `<p style="color:var(--grigio);">Menu non disponibile al momento.</p>`}
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

    // ── Landing "Pranzo business" (prova): pagina vera con prenotazione, nascosta e non indicizzata ──
    // La foto si ridimensiona da sola (le foto originali pesano anche 3 MB: troppo per chi arriva da un annuncio).
    async function fotoLeggera(url, chiave) {
      try {
        const nomeF = "sito/" + aziendaId + "/landing-" + chiave + ".jpg";
        const pubF = sc.storage.from("media-aziende").getPublicUrl(nomeF).data.publicUrl;
        const gia = await fetch(pubF, { method: "HEAD" }).catch(() => null);
        if (gia && gia.ok) return pubF;
        const img = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = url; });
        const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const cx = cv.getContext("2d"); cx.fillStyle = "#2a1a0d"; cx.fillRect(0, 0, w, h); cx.imageSmoothingQuality = "high"; cx.drawImage(img, 0, 0, w, h);
        const blob = await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.8));
        if (!blob) throw new Error("foto non elaborata");
        const upF = await sc.storage.from("media-aziende").upload(nomeF, blob, { contentType: "image/jpeg", upsert: true });
        if (upF.error) throw upF.error;
        return pubF;
      } catch (e) { return url; }
    }

    let landingPranzo = null;
    if (aziendaId === "b331365f-17db-4dda-aa2f-77a09427fe42" && sedeId === "4a936e52-a1e3-42fc-843c-e8d15dc86040") {
      const lpFotoOrig = SUPABASE_URL + "/storage/v1/object/public/media-aziende/" + aziendaId + "/voce-ec6dd7df-ef82-498d-998a-aa1c0740f36a-1783681578432.png";
      const lpFoto = await fotoLeggera(lpFotoOrig, "salsicce-broccoletti");
      const lpCss = `
body{background:#fbf7f0;color:#3b2412}
.lp{max-width:430px;margin:0 auto;background:#fbf7f0;font-size:16px;line-height:1.5}
.lp a{text-decoration:none}
.lp-hero{position:relative;height:620px;background:#2a1a0d;color:#fff;overflow:hidden}
.lp-hero img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}
.lp-vel{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(26,16,8,.54)}
.lp-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px}
.lp-logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:25px;font-weight:700;line-height:1.1}
.lp-loc{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#f0d9a0;text-align:right}
.lp-hc{position:absolute;left:0;right:0;bottom:0;padding:0 22px 86px}
.lp-eye{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#f0d9a0;margin-bottom:12px}
.lp-h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:58px;line-height:.98;font-weight:700;margin:0 0 14px;text-shadow:0 2px 16px rgba(0,0,0,.5)}
.lp-sub{font-size:17px;line-height:1.45;color:#f6eddc;max-width:330px;text-shadow:0 1px 8px rgba(0,0,0,.5)}
.lp-card{position:relative;margin:-56px 16px 0;padding:22px 20px 20px;background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(42,26,13,.2)}
.lp-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.lp-prezzo{font-family:'Cormorant Garamond',Georgia,serif;font-size:60px;font-weight:700;line-height:1;color:var(--btn)}
.lp-pnota{font-size:14px;color:#5a4632;margin-top:4px}
.lp-orari{text-align:right;font-size:13px;color:#5a4632;line-height:1.4}
.lp-cta{display:flex;align-items:center;justify-content:center;min-height:54px;margin-top:18px;background:var(--btn);color:#fff;font-size:17px;font-weight:700;border-radius:12px;border:0;width:100%;cursor:pointer}
.lp-lnk{display:block;text-align:center;margin-top:12px;font-size:14px;font-weight:600;color:var(--btn)}
.lp-incl{display:flex;flex-wrap:wrap;gap:8px 18px;padding:24px 22px 6px;font-size:15px;color:#5a4632}
.lp-incl span:before{content:"✓";color:var(--btn);font-weight:800;margin-right:6px}
.lp-menu{display:none;margin-top:26px;padding:32px 22px 30px;background:#2a1a0d;color:#f3e9d6}
.lp-meye{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#f0d9a0;margin-bottom:8px}
.lp-mh{font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:700;line-height:1.1;color:#fff;margin:0 0 20px}
.lp-pt{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f0d9a0;padding:14px 0 8px;border-bottom:1px solid #5a4632}
.lp-pv{padding:9px 0 2px}
.lp-prenota{padding:34px 20px 10px}
.lp-h2{font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:700;line-height:1.1;margin:0 0 6px}
.lp-p2{font-size:15px;color:#6b5a48;margin:0 0 22px}
.lp-box{background:#fff;border-radius:16px;padding:20px 18px 22px;box-shadow:0 6px 22px rgba(42,26,13,.1)}
.lp-lbl{display:block;font-size:14px;font-weight:700;margin:0 0 8px}
.lp-gr{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.lp-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:20px}
.lp-chip,.lp-slot{min-height:46px;border-radius:10px;border:1px solid #d9cdbb;background:#fff;color:#3b2412;font-size:15px;font-weight:600;cursor:pointer;padding:0 14px;font-family:inherit}
.lp-chip.on,.lp-slot.on{background:var(--btn);border-color:var(--btn);color:#fff}
.lp-slot:disabled{opacity:.4;cursor:not-allowed;text-decoration:line-through}
.lp-nota{font-size:14px;color:#6b5a48;grid-column:1/-1}
.lp-pers{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.lp-pers button{width:46px;height:46px;border-radius:10px;border:1px solid #d9cdbb;background:#fff;color:#3b2412;font-size:22px;font-weight:600;cursor:pointer}
.lp-pers b{min-width:36px;text-align:center;font-size:22px}
.lp-in{width:100%;min-height:48px;padding:0 14px;border:1px solid #d9cdbb;border-radius:10px;background:#fbf7f0;font-size:16px;color:#3b2412;margin-bottom:16px;font-family:inherit}
.lp-priv{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#5a4632;margin-bottom:18px;line-height:1.45}
.lp-priv input{width:22px;height:22px;flex-shrink:0;accent-color:var(--btn)}
.lp-msg{margin-top:12px;font-size:14px;font-weight:600;text-align:center;min-height:20px}
.lp-msg.err{color:#b42318}
.lp-ok{display:none;text-align:center;padding:10px 4px}
.lp-ok h3{font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;margin:6px 0 8px}
.lp-sep{display:flex;align-items:center;gap:12px;margin:22px 0 16px;color:#6b5a48;font-size:13px}
.lp-sep i{flex:1;height:1px;background:#d9cdbb}
.lp-alt{display:flex;gap:10px}
.lp-alt a{flex:1 1 0;display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:12px;font-size:15px;font-weight:700}
.lp-wa{background:#25d366;color:#073b1f}
.lp-ch{background:#fff;border:1px solid var(--btn);color:var(--btn)}
.lp-ft{margin-top:30px;padding:26px 22px 34px;background:#2a1a0d;color:#f3e9d6;font-size:14px;line-height:1.6}
.lp-ft b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#fff;margin-bottom:6px}
.lp-mappa{padding:34px 20px 0}
.lp-frame{display:block;width:100%;height:250px;border:0;border-radius:14px;margin-bottom:14px;background:#e8dcc8}
`;
      const lpJs = `(function(){
var SB='${SUPABASE_URL}',KEY='${ANON_KEY}',AZ='${aziendaId}',SEDE='${sedeId}',MAXLP=20;
var H={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
var P=new URLSearchParams(location.search);
var st={g:null,t:null,o:null,p:2,cfg:null,occ:[]};
var GN=['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];
function q(i){return document.getElementById(i);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function T(el,x){try{window._rfTrack&&window._rfTrack('step',el,Object.assign({step:el},x||{}));}catch(e){}}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function hhmm(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function plus(s,min){var p=s.split(':'),m=(+p[0])*60+(+p[1])+min;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function msg(t,err){var m=q('lp-msg');m.textContent=t||'';m.className='lp-msg'+(err?' err':'');}
function giorni(){
  var cfg=st.cfg,att=(cfg&&cfg.giorni_attivi)||['lunedi','martedi','mercoledi','giovedi','venerdi'],chi=(cfg&&cfg.giorni_chiusura)||[];
  var out=[],d=new Date();if(d.getHours()>=21)d.setDate(d.getDate()+1);
  for(var i=0;i<28&&out.length<5;i++){var w=d.getDay();
    if(w>=1&&w<=5&&att.indexOf(GN[w])>-1&&chi.indexOf(GN[w])<0)out.push(new Date(d.getTime()));
    d.setDate(d.getDate()+1);}
  return out;
}
function renderGiorni(){
  var h='';giorni().forEach(function(d){var v=iso(d),l=d.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
    h+='<button type="button" class="lp-chip'+(st.g===v?' on':'')+'" data-d="'+v+'">'+esc(l.charAt(0).toUpperCase()+l.slice(1))+'</button>';});
  q('lp-giorni').innerHTML=h||'<div class="lp-nota">Nessun giorno disponibile: chiamaci.</div>';
}
function orari(){var b=(st.cfg&&st.cfg.orari)||['12:00','12:30','13:00','13:30','14:00','19:00','19:30','20:00','20:30','21:00','21:30'];return b.filter(function(s){return st.t==='cena'?(s>='19:00'&&s<='21:30'):(s>='12:00'&&s<='14:00');});}
function renderTurni(){q('lp-turni').innerHTML='<button type="button" class="lp-chip'+(st.t==='pranzo'?' on':'')+'" data-t="pranzo">Pranzo</button><button type="button" class="lp-chip'+(st.t==='cena'?' on':'')+'" data-t="cena">Cena</button>';}
function renderOrari(){
  var box=q('lp-orari');if(!st.g||!st.t){box.innerHTML='<div class="lp-nota">Scegli prima giorno e pranzo o cena.</div>';return;}
  var min=(st.cfg&&st.cfg.slot_minuti)||30,max=Math.min((st.cfg&&st.cfg.max_coperti_slot)||30,MAXLP);
  var oggi=iso(new Date()),lim=plus(hhmm(new Date()),30),h='',ok=false;
  orari().forEach(function(s){var f=plus(s,min);
    var occ=st.occ.filter(function(p){var o=String(p.ora).slice(0,5);return o>=s&&o<f;}).reduce(function(t,p){return t+(Number(p.coperti)||0);},0);
    var lib=(max-occ)>=st.p&&!(st.g===oggi&&s<lim);if(st.o===s&&lib)ok=true;
    h+='<button type="button" class="lp-slot'+(st.o===s&&lib?' on':'')+'" data-o="'+s+'"'+(lib?'':' disabled')+'>'+s+'</button>';});
  if(!ok)st.o=null;box.innerHTML=h;
}
function caricaOcc(){
  if(!st.g)return Promise.resolve();
  return fetch(SB+'/rest/v1/rpc/slot_occupati',{method:'POST',headers:H,body:JSON.stringify({p_azienda:AZ,p_data:st.g,p_sede:SEDE||null})})
    .then(function(r){return r.json();}).then(function(a){st.occ=Array.isArray(a)?a:[];}).catch(function(){st.occ=[];});
}
q('lp-turni').addEventListener('click',function(e){var b=e.target.closest('button[data-t]');if(!b)return;
  st.t=b.getAttribute('data-t');st.o=null;T('seleziona_turno');renderTurni();renderOrari();});
q('lp-giorni').addEventListener('click',function(e){var b=e.target.closest('button[data-d]');if(!b)return;
  st.g=b.getAttribute('data-d');st.o=null;T('seleziona_data');renderGiorni();caricaOcc().then(renderOrari);});
q('lp-orari').addEventListener('click',function(e){var b=e.target.closest('button[data-o]');if(!b||b.disabled)return;
  st.o=b.getAttribute('data-o');T('seleziona_orario');renderOrari();});
q('lp-meno').onclick=function(){st.p=Math.max(1,st.p-1);q('lp-n').textContent=st.p;renderOrari();};
q('lp-piu').onclick=function(){st.p=Math.min(12,st.p+1);q('lp-n').textContent=st.p;renderOrari();};
function fatto(){
  q('lp-form').style.display='none';q('lp-ok').style.display='block';
  var d=new Date(st.g+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  q('lp-ok-t').textContent=d+' alle '+st.o+' · '+st.p+(st.p===1?' persona':' persone');
  try{window._rfTrack('submit','prenotazione_completata',{step:'success',completato:true,valore:st.p+' coperti - '+st.g+' '+st.o});}catch(e){}
}
q('lp-invia').onclick=function(){
  T('submit_tentativo');
  var nome=q('lp-nome').value.trim(),tel=q('lp-tel').value.replace(/[^0-9+]/g,''),em=q('lp-mail').value.trim(),man=[];
  if(!nome)man.push('il nome');if(tel.replace('+','').length<8)man.push('il telefono');if(!st.g)man.push('il giorno');if(!st.t)man.push('pranzo o cena');if(!st.o)man.push("l'orario");
  if(man.length){msg('Per prenotare mancano: '+man.join(', ')+'.',true);try{window._rfTrack('error','validazione_fallita',{step:'submit_tentativo',valore:man.join(',')});}catch(e){}return;}
  if(!q('lp-priv').checked){msg('Serve il consenso al trattamento dei dati per prenotare.',true);return;}
  if(tel.charAt(0)!=='+'){tel=tel.indexOf('0039')===0?'+'+tel.slice(2):'+39'+tel;}
  var tok=(window.crypto&&crypto.randomUUID)?crypto.randomUUID().replace(/-/g,''):(Date.now().toString(16)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)).slice(0,32);
  var src='';try{src=sessionStorage.getItem('rf_src')||'';}catch(e){}
  var rif=JSON.stringify({landing:'menu-business',turno:st.t,utm_source:P.get('utm_source'),utm_medium:P.get('utm_medium'),utm_campaign:P.get('utm_campaign'),sid:(function(){try{return sessionStorage.getItem('rf_sid');}catch(e){return null;}})()});
  var b=q('lp-invia');b.disabled=true;b.textContent='Invio...';msg('');
  fetch(SB+'/rest/v1/prenotazioni_tavoli',{method:'POST',headers:Object.assign({},H,{'Prefer':'return=minimal'}),
    body:JSON.stringify({azienda_id:AZ,sede_id:SEDE||null,cliente_nome:nome,cliente_telefono:tel,cliente_email:em||null,data:st.g,ora:st.o,coperti:st.p,
      stato:'in_attesa',canale:'online',note:'Menu business 25 euro · '+st.t,token_pubblico:tok,source:(src||P.get('utm_source')||'landing_menu_business'),riferimento:rif})})
  .then(function(r){
    if(!r.ok)return r.text().then(function(t){throw new Error(t||'errore');});
    fetch(SB+'/functions/v1/prenotazione-notifica-tavolo',{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({token_pubblico:tok})}).catch(function(){});
    fatto();})
  .catch(function(e){b.disabled=false;b.textContent='Prenota il tavolo';msg('Non siamo riusciti a registrare la prenotazione. Riprova o chiamaci.',true);
    try{window._rfTrack('error','submit_db_error',{step:'submit',valore:String(e.message).slice(0,80)});}catch(x){}});
};
fetch(SB+'/rest/v1/prenotazioni_slot_config?azienda_id=eq.'+AZ+'&select=*',{headers:H}).then(function(r){return r.json();})
  .then(function(a){st.cfg=(a&&a[0])||null;}).catch(function(){st.cfg=null;}).then(function(){renderGiorni();renderTurni();renderOrari();});
fetch(SB+'/rest/v1/rpc/menu_giorno_pubblico',{method:'POST',headers:H,body:JSON.stringify({p_sede:SEDE})}).then(function(r){return r.json();}).then(function(m){
  var v=(m&&m.voci)||[];
  /* se la cucina non ha ancora scritto il menu di oggi (o e' domenica) la sezione resta, con una riga vera, invece di sparire */
  if(!v.length){q('lp-menu-voci').innerHTML='<div class="lp-pv">Il menu cambia ogni giorno. Intanto sai gia cosa e compreso: antipasto, primo, secondo, acqua e caffè.</div>';q('lp-menu').style.display='block';return;}
  var N={antipasti:'Antipasti',primi:'Primi',secondi:'Secondi',dessert:'Dessert'},h='';
  ['antipasti','primi','secondi','dessert'].forEach(function(k){var l=v.filter(function(x){return x.portata===k;});if(!l.length)return;
    h+='<div class="lp-pt">'+N[k]+'</div>'+l.map(function(x){return '<div class="lp-pv">'+esc(x.nome)+'</div>';}).join('');});
  if(!h)return;q('lp-menu-voci').innerHTML=h;q('lp-menu').style.display='block';
}).catch(function(){});
})();`;
      // WhatsApp dalla landing: il codice (rif. PB25) fa partire il percorso del pranzo business e segna da dove arriva la prenotazione
      const lpWa = waUrl ? waUrl.split("?text=")[0] + "?text=" + encodeURIComponent("Buongiorno, vorrei prenotare il menu business a 25 euro.") : "";
      landingPranzo = head("Menu business 25 €").replace("</head>", `<meta name="robots" content="noindex,nofollow">\n<style>${lpCss}</style>\n</head>`) + `
<body>
<main class="lp">
  <div class="lp-hero">
    <img src="${esc(lpFoto)}" alt="Salsicce e broccoletti" width="1400" height="1050">
    <div class="lp-vel"></div>
    <div class="lp-top"><div class="lp-logo">${esc(nome)}</div><div class="lp-loc">Orte · uscita A1</div></div>
    <div class="lp-hc">
      <div class="lp-eye">Menu business · lun–ven · pranzo e cena</div>
      <h1 class="lp-h1">Mangiare bene,<br>senza pensarci.</h1>
      <p class="lp-sub">Antipasto, primo, secondo, acqua e caffè. A pranzo e a cena.</p>
    </div>
  </div>

  <div class="lp-card">
    <div class="lp-row">
      <div><div class="lp-prezzo">25 €</div><div class="lp-pnota">a persona, tutto compreso</div></div>
      <div class="lp-orari">Lun–ven<br>Pranzo 12:00–14:30<br>Cena 19:00–22:30</div>
    </div>
    <a class="lp-cta" href="#prenota" onclick="try{window._rfTrack('click','cta_prenota',{valore:'landing'})}catch(e){}">Prenota il tuo tavolo</a>
    <a class="lp-lnk" href="#oggi">Guarda il menu di oggi</a>
    <a class="lp-lnk" href="#mappa" style="margin-top:6px">Come arrivare</a>
  </div>

  <div class="lp-incl"><span>Antipasto</span><span>Primo</span><span>Secondo</span><span>Acqua</span><span>Caffè</span></div>

  <div class="lp-menu" id="lp-menu"><div id="oggi"></div>
    <div class="lp-meye">Il menu cambia ogni giorno</div>
    <h2 class="lp-mh">Oggi in cucina</h2>
    <div id="lp-menu-voci"></div>
  </div>

  <div class="lp-prenota" id="prenota">
    <h2 class="lp-h2">Prenota il tuo tavolo</h2>
    <p class="lp-p2">Scegli giorno, pranzo o cena e orario: la prenotazione arriva direttamente in sala.</p>
    <div class="lp-box">
      <div id="lp-form">
        <span class="lp-lbl">Giorno</span><div class="lp-gr" id="lp-giorni"></div>
        <span class="lp-lbl">Pranzo o cena</span><div class="lp-gr" id="lp-turni"></div>
        <span class="lp-lbl">Orario</span><div class="lp-g3" id="lp-orari"></div>
        <span class="lp-lbl">Persone</span>
        <div class="lp-pers"><button type="button" id="lp-meno" aria-label="Una persona in meno">−</button><b id="lp-n">2</b><button type="button" id="lp-piu" aria-label="Una persona in più">+</button></div>
        <label class="lp-lbl" for="lp-nome">Nome</label><input class="lp-in" id="lp-nome" type="text" autocomplete="name">
        <label class="lp-lbl" for="lp-tel">Telefono</label><input class="lp-in" id="lp-tel" type="tel" autocomplete="tel">
        <label class="lp-lbl" for="lp-mail">Email (facoltativa, per la conferma)</label><input class="lp-in" id="lp-mail" type="email" autocomplete="email">
        <label class="lp-priv" for="lp-priv"><input id="lp-priv" type="checkbox"><span>Acconsento al trattamento dei dati per gestire la prenotazione (GDPR).</span></label>
        <button type="button" class="lp-cta" id="lp-invia" style="margin-top:0">Prenota il tavolo</button>
        <div class="lp-msg" id="lp-msg" role="status"></div>
      </div>
      <div class="lp-ok" id="lp-ok">
        <h3>Prenotazione ricevuta</h3>
        <p id="lp-ok-t"></p>
        <p style="font-size:14px;color:#6b5a48;margin-top:10px">Ti aspettiamo. Per cambiare o disdire chiamaci${tel ? " al " + esc(tel) : ""}.</p>
      </div>
    </div>
    <div class="lp-sep"><i></i><span>oppure</span><i></i></div>
    <div class="lp-alt">
      ${lpWa ? `<a class="lp-wa" href="${esc(lpWa)}">WhatsApp</a>` : ""}
      ${tel ? `<a class="lp-ch" href="tel:${esc(tel)}">Chiama</a>` : ""}
    </div>
  </div>

  <div class="lp-mappa" id="mappa">
    <h2 class="lp-h2">Come arrivare</h2>
    <p class="lp-p2">${ind ? esc(ind) + " · " : ""}Uscita A1 Orte</p>
    <iframe class="lp-frame" loading="lazy" title="Mappa" src="https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed"></iframe>
    <a class="lp-cta" href="${esc(mapsUrl)}" style="margin-top:0">Apri le indicazioni</a>
  </div>

  <div class="lp-ft"><b>${esc(nome)}</b>Orte · uscita A1${conf.orari_pranzo ? `<br>Pranzo: ${esc(conf.orari_pranzo)}` : ""}${conf.orari_cena ? `<br>Cena: ${esc(conf.orari_cena)}` : ""}${privacyUrl ? `<br><a href="${esc(privacyUrl)}" style="color:inherit;text-decoration:underline">Privacy e cookie</a>` : ""}</div>
</main>
<script>${lpJs}</script>
</body></html>`;
    }

    return { home, chiSiamo, menuPage, contatti, landingPranzo };
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
          repo:    repoSito,
          pagine: {
            "index.html":     pagine.home,
            "chi-siamo.html": pagine.chiSiamo,
            "menu.html":      pagine.menuPage,
            "contatti.html":  pagine.contatti,
            "l/menu-business.html": pagine.landingPranzo,
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
