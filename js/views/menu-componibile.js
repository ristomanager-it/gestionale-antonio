// Menu Componibile — crea menu al volo per gruppi / agenzie di viaggio.
// Copia della composizione del menu del giorno, ma con salvataggi separati e multipli.

const COLORE = "#0E5A7A";
const PORTATE = [
  { key: "antipasti", label: "🥗 Antipasti", titolo: "Antipasti", slots: 3 },
  { key: "primi", label: "🍝 Primi", titolo: "Primi", slots: 3 },
  { key: "secondi", label: "🍖 Secondi", titolo: "Secondi", slots: 3 },
  { key: "dessert", label: "🍰 Dessert", titolo: "Dessert", slots: 1 },
];

function supa() { return window.supabaseClient || window.supabase; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function money(n) { const v = Number(n) || 0; return v.toFixed(2).replace(".", ","); }
function formatDataIta(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    const mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
    return d.getDate() + " " + mesi[d.getMonth()] + " " + d.getFullYear();
  } catch (e) { return iso; }
}
function prezzoRicetta(r) { return (r.prezzo_ristorante != null ? Number(r.prezzo_ristorante) : (r.prezzo_vendita != null ? Number(r.prezzo_vendita) : 0)); }

export async function render(container) {
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva || null;
  if (!azienda?.id) {
    container.innerHTML = '<section class="view" style="padding:24px;"><div class="card"><h3>Nessuna azienda attiva</h3></div></section>';
    return;
  }
  container.innerHTML = '<section class="view" style="padding:16px;"><p style="color:#64748b;">Caricamento menu componibile…</p></section>';

  const oggi = new Date().toISOString().slice(0, 10);
  const s = supa();

  // Ricette divise per portata (categoria_food) — filtrate per sede
  let ricQ = s.from("ricette")
    .select("id, nome, categoria_food, prezzo_ristorante, prezzo_vendita, food_cost_percentuale")
    .eq("azienda_id", azienda.id).eq("attivo", true)
    .in("categoria_food", ["antipasti", "primi", "secondi", "dessert"]);
  if (sede?.id) ricQ = ricQ.eq("sede_id", sede.id);
  const { data: ricetteData } = await ricQ.order("nome");
  const ricette = ricetteData || [];
  const mappaRicetta = new Map(ricette.map(r => [String(r.id), r]));
  const perPortata = {};
  PORTATE.forEach(p => { perPortata[p.key] = ricette.filter(r => r.categoria_food === p.key); });

  // Menu componibili salvati (lista) + eventuale menu in modifica via hash ?id=
  const hashId = (location.hash.split("?")[1] || "").split("&").map(x=>x.split("=")).reduce((a,[k,v])=>(k?(a[k]=decodeURIComponent(v||""),a):a),{}).id || null;
  const { data: listaMenu } = await s.from("menu_componibile").select("id, titolo, nome_gruppo, data, updated_at, voci").eq("azienda_id", azienda.id).order("updated_at", { ascending: false }).limit(50);
  let q = s.from("menu_componibile").select("*").eq("azienda_id", azienda.id);
  if (hashId) q = q.eq("id", hashId); else q = q.eq("id", "00000000-0000-0000-0000-000000000000");
  q = sede?.id ? q.eq("sede_id", sede.id) : q.is("sede_id", null);
  const { data: mgData } = await q.maybeSingle();
  let mgEsistente = mgData || null;
  const sel = {};
  const liberiEsistenti = {};
  PORTATE.forEach(p => { sel[p.key] = new Array(p.slots).fill(""); liberiEsistenti[p.key] = []; });
  if (mgEsistente && Array.isArray(mgEsistente.voci)) {
    mgEsistente.voci.forEach(v => {
      if (!v.ricetta_id) { if (liberiEsistenti[v.portata]) liberiEsistenti[v.portata].push(v); return; }
      const arr = sel[v.portata];
      if (arr) { const idx = arr.indexOf(""); if (idx >= 0) arr[idx] = String(v.ricetta_id); }
    });
  }
  let mezzaPensione = mgEsistente ? !!mgEsistente.mezza_pensione : false;
  let prezzoFisso = mgEsistente && mgEsistente.prezzo_fisso != null ? Number(mgEsistente.prezzo_fisso) : null;
  const titoloVal = (mgEsistente && mgEsistente.titolo) ? mgEsistente.titolo : "Menu gruppo";
  const nomeGruppoVal = (mgEsistente && mgEsistente.nome_gruppo) ? mgEsistente.nome_gruppo : "";
  const testoInclusoVal = (mgEsistente && mgEsistente.testo_incluso != null) ? mgEsistente.testo_incluso : "Acqua e caffè inclusi";
  const fontFamVal = (mgEsistente && mgEsistente.font_family) ? mgEsistente.font_family : "Georgia, serif";
  const fontSizeVal = (mgEsistente && mgEsistente.font_size) ? mgEsistente.font_size : "medio";
  const fontColorVal = (mgEsistente && mgEsistente.font_color) ? mgEsistente.font_color : "#1a1a1a";
  const allineamentoVal = (mgEsistente && mgEsistente.allineamento) ? mgEsistente.allineamento : "center";
  const mostraLogoVal = mgEsistente ? (mgEsistente.mostra_logo !== false) : true;
  let logoUrl = (sede && sede.logo_url) || (azienda && azienda.logo_url) || "";
  if (!logoUrl && azienda?.id) {
    try {
      const { data: azLogo } = await s.from("aziende").select("logo_url").eq("id", azienda.id).maybeSingle();
      if (azLogo && azLogo.logo_url) logoUrl = azLogo.logo_url;
    } catch (e) {}
  }
  const escluse = new Set(Array.isArray(mgEsistente?.portate_escluse) ? mgEsistente.portate_escluse : []);

  // (Menu componibile: nessuno storico o scadenze — menu creati al volo per gruppi)
  const usoRecente = new Map();
  const scadenze = [];
  const nomeProd = new Map();
  const suggPerProd = new Map();

  // ---------- RENDER ----------
  function optionsFor(key, selectedId) {
    let o = '<option value="">— scegli —</option>';
    (perPortata[key] || []).forEach(r => {
      const rec = usoRecente.get(String(r.id));
      const label = r.nome + (rec != null ? "  ⚠️ " + rec + "gg fa" : "");
      o += '<option value="' + r.id + '"' + (String(r.id) === String(selectedId) ? " selected" : "") + '>' + esc(label) + '</option>';
    });
    return o;
  }
  function infoText(r) {
    if (!r) return '';
    const rec = usoRecente.get(String(r.id));
    return rec != null ? ('⚠️ servito ' + rec + 'gg fa') : '';
  }
  function infoColor(r) { return (r && usoRecente.get(String(r.id)) != null) ? '#b45309' : '#64748b'; }
  function liberoRow(key, nome, prezzo) {
    return '<div class="mg-lib-row mg-row" data-portata="' + key + '" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;background:#fff;">'
      + '<span class="mg-drag" draggable="true" title="Trascina per riordinare" style="cursor:grab;color:#94a3b8;font-size:18px;padding:0 4px;user-select:none;">⠿</span>'
      + '<input class="mg-lib-nome" data-portata="' + key + '" value="' + esc(nome || '') + '" placeholder="Piatto non catalogato (scrivilo)" style="flex:1;min-width:160px;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;">'
      + '<input class="mg-lib-prezzo" type="number" step="0.5" value="' + (prezzo != null && prezzo !== '' ? prezzo : '') + '" placeholder="€" style="width:78px;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;">'
      + '<button class="mg-lib-del" title="Rimuovi" style="background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:7px 10px;cursor:pointer;">✕</button>'
      + '</div>';
  }
  let _slotSeq = 0;
  function slotRowVal(key, selId) {
    const r = selId ? mappaRicetta.get(String(selId)) : null;
    const uid = key + "_" + (_slotSeq++);
    return '<div class="mg-slot-row mg-row" data-portata="' + key + '" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;background:#fff;">'
      + '<span class="mg-drag" draggable="true" title="Trascina per riordinare" style="cursor:grab;color:#94a3b8;font-size:18px;padding:0 4px;user-select:none;">⠿</span>'
      + '<select class="mg-sel" data-portata="' + key + '" data-slot="' + uid + '" style="flex:1;min-width:180px;padding:9px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;">' + optionsFor(key, selId) + '</select>'
      + '<span class="mg-info" data-portata="' + key + '" data-slot="' + uid + '" style="font-size:11px;color:' + infoColor(r) + ';min-width:120px;">' + infoText(r) + '</span>'
      + '</div>';
  }
  function slotRow(key, idx) {
    const selId = sel[key][idx];
    return slotRowVal(key, selId);
  }

  let html = '<section class="view" style="padding:16px;max-width:900px;margin:0 auto;">';

  html += '<div class="card" style="border-radius:12px;padding:16px;margin-bottom:14px;">'
    + '<h2 style="margin:0 0 4px;color:' + COLORE + ';">🧩 Menu Componibile <span id="mg-titolo-prezzo" style="font-size:16px;color:#16a34a;font-weight:700;">' + (prezzoFisso && prezzoFisso > 0 ? '— € ' + money(prezzoFisso) : '') + '</span></h2>'
    + '<p style="margin:0 0 12px;color:#64748b;font-size:13px;">Crea un menu al volo per gruppi e agenzie di viaggio' + (sede?.nome ? ' — ' + esc(sede.nome) : '') + '. Puoi salvarne quanti vuoi e stamparli.</p>'
    + renderListaMenu(listaMenu, hashId)
    + '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">'
    + '<label style="font-size:13px;color:#334155;">📝 Titolo <input id="mg-titolo" value="' + esc(titoloVal) + '" placeholder="Menu gruppo" style="width:170px;padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;"></label>'
    + '<label style="font-size:13px;color:#334155;">👥 Gruppo/Agenzia <input id="mg-gruppo" value="' + esc(nomeGruppoVal) + '" placeholder="Es. Agenzia Rossi Tours" style="width:200px;padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;"></label>'
    + '<label style="font-size:13px;color:#334155;">🍷 Inclusi <input id="mg-incluso" value="' + esc(testoInclusoVal) + '" placeholder="Es. Acqua e vino inclusi" style="width:200px;padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;"></label>'
    + '<label style="font-size:13px;color:#334155;">Data <input id="mg-data" type="date" value="' + oggi + '" style="padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;"></label>'
    + '<label style="font-size:13px;color:#334155;">💶 Prezzo fisso € <input id="mg-prezzo" type="number" step="0.5" min="0" value="' + (prezzoFisso != null ? prezzoFisso : '') + '" placeholder="—" style="width:80px;padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;"></label>'
    + '<label style="font-size:13px;color:#334155;display:flex;align-items:center;gap:6px;cursor:pointer;"><input id="mg-mp" type="checkbox"' + (mezzaPensione ? ' checked' : '') + '> Mezza pensione</label>'
    + '<label style="font-size:13px;color:#334155;">Font <select id="mg-font" style="padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;">'
    + ['Georgia, serif|Georgia','\'Times New Roman\', serif|Times','\'Helvetica Neue\', Arial, sans-serif|Helvetica','Garamond, serif|Garamond','\'Courier New\', monospace|Courier'].map(o=>{const[v,l]=o.split('|');return '<option value="'+v+'"'+(fontFamVal===v?' selected':'')+'>'+l+'</option>';}).join('') + '</select></label>'
    + '<label style="font-size:13px;color:#334155;">Dim. <select id="mg-fontsize" style="padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;">'
    + [['piccolo','Piccolo'],['medio','Medio'],['grande','Grande']].map(o=>'<option value="'+o[0]+'"'+(fontSizeVal===o[0]?' selected':'')+'>'+o[1]+'</option>').join('') + '</select></label>'
    + '<label style="font-size:13px;color:#334155;display:flex;align-items:center;gap:6px;">🎨 Colore <input id="mg-fontcolor" type="color" value="' + esc(fontColorVal) + '" style="width:38px;height:30px;padding:0;border:1px solid #d1d5db;border-radius:8px;cursor:pointer;"></label>'
    + '<label style="font-size:13px;color:#334155;">Allinea <select id="mg-allinea" style="padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;">'
    + [['center','Centrato'],['left','A sinistra']].map(o=>'<option value="'+o[0]+'"'+(allineamentoVal===o[0]?' selected':'')+'>'+o[1]+'</option>').join('') + '</select></label>'
    + (logoUrl ? '<label style="font-size:13px;color:#334155;display:flex;align-items:center;gap:6px;cursor:pointer;"><input id="mg-logo" type="checkbox"' + (mostraLogoVal ? ' checked' : '') + '> 🖼️ Logo</label>' : '<span style="font-size:11px;color:#94a3b8;">Nessun logo caricato (impostazioni azienda)</span>')
    + '<span id="mg-stato" style="font-size:12px;color:#64748b;margin-left:auto;">' + (mgEsistente ? '📝 salvato' : 'nuovo menu') + '</span>'
    + '</div></div>';

  // Sezioni portate
  PORTATE.forEach(p => {
    if (escluse.has(p.key)) return;
    const disp = (perPortata[p.key] || []).length;
    html += '<div class="card" style="border-radius:12px;padding:16px;margin-bottom:12px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
      + '<h3 style="margin:0;color:#0f172a;">' + p.label + '</h3>'
      + '<div style="display:flex;gap:10px;align-items:center;">'
      + '<span style="font-size:11px;color:#94a3b8;">' + disp + ' ricette</span>'
      + '<button class="mg-rm-portata" data-portata="' + p.key + '" title="Rimuovi questa portata dal menu" style="background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:3px 9px;font-size:11px;cursor:pointer;">✕</button>'
      + '</div></div>';
    html += '<div class="mg-lista" data-portata="' + p.key + '">';
    // voci salvate di questa portata, nell'ordine salvato (misto catalogati/liberi)
    const vociP = (mgEsistente && Array.isArray(mgEsistente.voci)) ? mgEsistente.voci.filter(v => v.portata === p.key) : [];
    let slotUsati = 0;
    if (vociP.length) {
      vociP.forEach(v => {
        if (v.ricetta_id) { html += slotRowVal(p.key, String(v.ricetta_id)); slotUsati++; }
        else html += liberoRow(p.key, v.nome, v.prezzo);
      });
    }
    // slot catalogati vuoti rimanenti (fino a p.slots)
    for (let i = slotUsati; i < p.slots; i++) html += slotRowVal(p.key, "");
    html += '</div>';
    html += '<button class="mg-add-libero" data-portata="' + p.key + '" style="font-size:12px;background:#eef2ff;border:1px dashed #c7d2fe;color:#4338ca;border-radius:8px;padding:6px 10px;cursor:pointer;margin-top:2px;">＋ Piatto libero (non catalogato)</button>';
    if (disp === 0) html += '<p style="font-size:12px;color:#b45309;margin:8px 0 0;">Nessuna ricetta con categoria "' + p.key + '" nel ricettario: usa "Piatto libero" oppure catalogala.</p>';
    html += '</div>';
  });

  const rimosse = PORTATE.filter(p => escluse.has(p.key));
  if (rimosse.length) {
    html += '<div style="margin:-2px 0 12px;font-size:12px;color:#64748b;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">Categorie rimosse: '
      + rimosse.map(p => '<button class="mg-readd" data-portata="' + p.key + '" style="background:#eef2ff;border:1px dashed #c7d2fe;color:#4338ca;border-radius:14px;padding:3px 10px;font-size:11px;cursor:pointer;">＋ ' + esc(p.label) + '</button>').join(' ')
      + '</div>';
  }

  // Azioni
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;position:sticky;bottom:0;background:#fff;padding:12px 0;">'
    + '<button id="mg-salva" style="flex:1;min-width:120px;background:#f1f5f9;border:1px solid #cbd5e1;color:#0f172a;border-radius:12px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">💾 Salva</button>'
    + '<button id="mg-stampa" style="flex:1;min-width:120px;background:#fff;border:1px solid ' + COLORE + ';color:' + COLORE + ';border-radius:12px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">🖨️ Stampa</button>'
    + '<button id="mg-nuovo" style="flex:1;min-width:120px;background:' + COLORE + ';border:none;color:#fff;border-radius:12px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">✨ Nuovo menu</button>'
    + '</div>';

  html += '</section>';
  container.innerHTML = html;

  const inpPrezzo = container.querySelector("#mg-prezzo");
  if (inpPrezzo) inpPrezzo.addEventListener("input", () => {
    const v = Number(inpPrezzo.value) || 0;
    const t = container.querySelector("#mg-titolo-prezzo");
    if (t) t.textContent = v > 0 ? ("— € " + money(v)) : "";
  });

  // ---------- INTERAZIONI ----------
  function aggiornaInfo(selEl) {
    const key = selEl.getAttribute("data-portata");
    const idx = selEl.getAttribute("data-slot");
    const infoEl = container.querySelector('.mg-info[data-portata="' + key + '"][data-slot="' + idx + '"]');
    const r = selEl.value ? mappaRicetta.get(String(selEl.value)) : null;
    if (infoEl) { infoEl.textContent = infoText(r); infoEl.style.color = infoColor(r); }
  }
  container.querySelectorAll(".mg-sel").forEach(selEl => selEl.addEventListener("change", () => aggiornaInfo(selEl)));

  // Riordino UNIFICATO con trascinamento: slot catalogati e piatti liberi insieme
  let dragRow = null;
  container.addEventListener("dragstart", (e) => {
    const handle = e.target.closest(".mg-drag");
    if (!handle) return;
    const row = handle.closest(".mg-row");
    if (!row) return;
    dragRow = row;
    row.style.opacity = "0.4";
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ""); } catch (_) {}
  });
  container.addEventListener("dragend", (e) => {
    const row = e.target.closest(".mg-row");
    if (row) row.style.opacity = "";
    dragRow = null;
  });
  container.addEventListener("dragover", (e) => {
    if (!dragRow) return;
    const over = e.target.closest(".mg-row");
    if (!over || over === dragRow) return;
    if (over.getAttribute("data-portata") !== dragRow.getAttribute("data-portata")) return;
    e.preventDefault();
    const rect = over.getBoundingClientRect();
    const dopo = (e.clientY - rect.top) > rect.height / 2;
    const parent = over.parentNode;
    if (dopo) parent.insertBefore(dragRow, over.nextSibling);
    else parent.insertBefore(dragRow, over);
  });

  // Fallback TOUCH (tablet/telefono)
  let touchRow = null;
  container.addEventListener("touchstart", (e) => {
    const handle = e.target.closest(".mg-drag");
    if (!handle) return;
    touchRow = handle.closest(".mg-row");
    if (touchRow) touchRow.style.opacity = "0.4";
  }, { passive: true });
  container.addEventListener("touchmove", (e) => {
    if (!touchRow) return;
    e.preventDefault();
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const over = el && el.closest ? el.closest(".mg-row") : null;
    if (!over || over === touchRow) return;
    if (over.getAttribute("data-portata") !== touchRow.getAttribute("data-portata")) return;
    const rect = over.getBoundingClientRect();
    const dopo = (t.clientY - rect.top) > rect.height / 2;
    const parent = over.parentNode;
    if (dopo) parent.insertBefore(touchRow, over.nextSibling);
    else parent.insertBefore(touchRow, over);
  }, { passive: false });
  container.addEventListener("touchend", () => {
    if (touchRow) touchRow.style.opacity = "";
    touchRow = null;
  });

  // Suggerimento -> riempi il primo slot libero della portata
  container.querySelectorAll(".mg-sugg").forEach(btn => {
    btn.addEventListener("click", () => {
      const rid = btn.getAttribute("data-ricetta");
      const key = btn.getAttribute("data-portata");
      const selects = [...container.querySelectorAll('.mg-sel[data-portata="' + key + '"]')];
      if (!selects.length) { alert('Questa ricetta è categoria "' + key + '", non tra le portate del menu (antipasti/primi/secondi/dessert).'); return; }
      let target = selects.find(sl => !sl.value) || selects[0];
      // se la ricetta non è tra le opzioni (categoria coerente) la aggiungo al volo
      if (!mappaRicetta.has(String(rid))) { /* fuori catalogo portata */ }
      target.value = String(rid);
      aggiornaInfo(target);
      target.style.borderColor = "#16a34a";
    });
  });

  // Piatti liberi (non catalogati): aggiungi/rimuovi righe
  function wireDel(row) {
    const del = row.querySelector(".mg-lib-del");
    if (del) del.addEventListener("click", () => row.remove());
  }
  container.querySelectorAll(".mg-lib-row").forEach(wireDel);
  container.querySelectorAll(".mg-add-libero").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-portata");
      const cont = container.querySelector('.mg-lista[data-portata="' + key + '"]');
      const tmp = document.createElement("div");
      tmp.innerHTML = liberoRow(key, "", "");
      const row = tmp.firstElementChild;
      cont.appendChild(row);
      wireDel(row);
      const inp = row.querySelector(".mg-lib-nome");
      if (inp) inp.focus();
    });
  });

  // Rimuovi / ripristina portate (categorie del menu del giorno)
  container.querySelectorAll(".mg-rm-portata").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-portata");
      if (!confirm("Rimuovere questa portata dal menu del giorno?")) return;
      escluse.add(key);
      try { await salva(); } catch (e) { alert("Errore: " + (e.message || e)); return; }
      await render(container);
    });
  });
  container.querySelectorAll(".mg-readd").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-portata");
      escluse.delete(key);
      try { await salva(); } catch (e) { alert("Errore: " + (e.message || e)); return; }
      await render(container);
    });
  });

  function raccogliVoci() {
    const voci = [];
    PORTATE.forEach(p => {
      if (escluse.has(p.key)) return;
      // leggo le righe nell'ordine del DOM: catalogate (mg-sel) e libere (mg-lib-nome) mescolate
      const lista = container.querySelector('.mg-lista[data-portata="' + p.key + '"]');
      if (!lista) return;
      lista.querySelectorAll(".mg-row").forEach(row => {
        const sel = row.querySelector(".mg-sel");
        if (sel) {
          const rid = sel.value;
          if (!rid) return;
          const r = mappaRicetta.get(String(rid));
          voci.push({
            ricetta_id: Number(rid),
            portata: p.key,
            nome: r ? r.nome : "Piatto",
            prezzo: r ? prezzoRicetta(r) : 0,
            food_cost: r && r.food_cost_percentuale != null ? Number(r.food_cost_percentuale) : null,
          });
          return;
        }
        const nomeEl = row.querySelector(".mg-lib-nome");
        if (nomeEl) {
          const nome = (nomeEl.value || "").trim();
          if (!nome) return;
          const prezzo = Number(row.querySelector(".mg-lib-prezzo")?.value) || 0;
          voci.push({ ricetta_id: null, portata: p.key, nome, prezzo, food_cost: null, libero: true });
        }
      });
    });
    return voci;
  }

  async function salva() {
    const voci = raccogliVoci();
    const data = container.querySelector("#mg-data").value || oggi;
    const mp = container.querySelector("#mg-mp").checked;
    const prezzoF = Number(container.querySelector("#mg-prezzo")?.value) || null;
    const titolo = (container.querySelector("#mg-titolo")?.value || "").trim() || "Menu gruppo";
    const nome_gruppo = (container.querySelector("#mg-gruppo")?.value || "").trim() || null;
    const testo_incluso = (container.querySelector("#mg-incluso")?.value || "").trim();
    const font_family = container.querySelector("#mg-font")?.value || "Georgia, serif";
    const font_size = container.querySelector("#mg-fontsize")?.value || "medio";
    const font_color = container.querySelector("#mg-fontcolor")?.value || "#1a1a1a";
    const allineamento = container.querySelector("#mg-allinea")?.value || "center";
    const mostra_logo = container.querySelector("#mg-logo") ? container.querySelector("#mg-logo").checked : true;
    const s2 = supa();
    const { data: sess } = await s2.auth.getUser();
    const uid = sess?.user?.id || null;
    const payload = { azienda_id: azienda.id, sede_id: sede?.id || null, data, nome_gruppo, testo_incluso, mezza_pensione: mp, prezzo_fisso: prezzoF, titolo, font_family, font_size, font_color, allineamento, mostra_logo, portate_escluse: [...escluse], voci, created_by: uid, updated_at: new Date().toISOString() };
    if (mgEsistente?.id) {
      const { error } = await s2.from("menu_componibile").update(payload).eq("id", mgEsistente.id);
      if (error) throw error;
    } else {
      const { data: ins, error } = await s2.from("menu_componibile").insert(payload).select("*").single();
      if (error) throw error;
      mgEsistente = ins;
      location.hash = "#/menu-componibile?id=" + ins.id;
    }
    return mgEsistente;
  }

  function stampa() {
    const voci = raccogliVoci();
    if (!voci.length) { alert("Aggiungi almeno un piatto prima di stampare."); return; }
    const dataV = container.querySelector("#mg-data").value || oggi;
    const prezzoF = Number(container.querySelector("#mg-prezzo")?.value) || null;
    const titolo = (container.querySelector("#mg-titolo")?.value || "").trim() || "Menu gruppo";
    const nomeGruppo = (container.querySelector("#mg-gruppo")?.value || "").trim();
    const testoIncluso = (container.querySelector("#mg-incluso")?.value || "").trim();
    const fontFam = container.querySelector("#mg-font")?.value || "Georgia, serif";
    const fsKey = container.querySelector("#mg-fontsize")?.value || "medio";
    const fontColor = container.querySelector("#mg-fontcolor")?.value || "#1a1a1a";
    const allinea = container.querySelector("#mg-allinea")?.value || "center";
    const conLogo = container.querySelector("#mg-logo") ? container.querySelector("#mg-logo").checked : false;
    const FS = { piccolo: { base: 14, h1: 24, h2: 14 }, medio: { base: 16, h1: 30, h2: 16 }, grande: { base: 20, h1: 38, h2: 20 } }[fsKey] || { base: 16, h1: 30, h2: 16 };
    const byPortata = {};
    PORTATE.forEach(p => { byPortata[p.key] = []; });
    voci.forEach(v => { if (byPortata[v.portata]) byPortata[v.portata].push(v); });

    let sezioni = "";
    PORTATE.forEach(p => {
      if (escluse.has(p.key)) return;
      const items = byPortata[p.key] || [];
      if (!items.length) return;
      sezioni += "<h2>" + esc(p.titolo) + "</h2><ul>" + items.map(v => "<li>" + esc(v.nome) + "</li>").join("") + "</ul>";
    });

    const titoloPrezzo = prezzoF ? '<div class="prezzo">Menu a € ' + money(prezzoF) + "</div>" : "";
    const sedeNome = sede?.nome ? '<div class="sede">' + esc(sede.nome) + "</div>" : "";
    const gruppoRiga = nomeGruppo ? '<div class="sede" style="font-weight:600;">' + esc(nomeGruppo) + "</div>" : "";
    const logoImg = (conLogo && logoUrl) ? '<img class="logo" src="' + esc(logoUrl) + '" alt="logo">' : "";
    // margini automatici per centrare le liste quando l'allineamento è centrato
    const ulAlign = allinea === "center" ? "text-align:center;" : "text-align:left;";
    const h2Border = allinea === "center" ? "border-bottom:1px solid #ccc;display:inline-block;padding:0 30px 4px;" : "border-bottom:1px solid #ccc;padding-bottom:4px;";
    const doc = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(titolo) + '</title><style>'
      + "body{font-family:" + fontFam + ";color:" + fontColor + ";max-width:620px;margin:0 auto;padding:40px 30px;text-align:" + allinea + ";font-size:" + FS.base + "px;display:flex;flex-direction:column;justify-content:center;min-height:90vh;box-sizing:border-box;}"
      + ".logo{max-width:150px;max-height:120px;object-fit:contain;margin:0 auto 18px;display:block;}"
      + "h1{font-size:" + FS.h1 + "px;letter-spacing:1px;margin:0 0 4px;text-transform:uppercase;color:" + fontColor + ";}"
      + ".data{opacity:.7;font-size:14px;}"
      + ".sede{opacity:.7;font-size:13px;margin-bottom:6px;}"
      + ".prezzo{font-size:18px;font-weight:bold;margin:8px 0 18px;}"
      + "h2{font-size:" + FS.h2 + "px;letter-spacing:2px;text-transform:uppercase;margin:22px 0 6px;" + h2Border + "}"
      + "ul{list-style:none;padding:0;margin:0 0 6px;" + ulAlign + "} li{font-size:" + FS.base + "px;margin:4px 0;}"
      + ".incluso{margin-top:26px;font-style:italic;font-size:14px;opacity:.75;}"
      + "@media print{body{padding:20px;min-height:auto;}}"
      + "</style></head><body>"
      + logoImg
      + "<h1>" + esc(titolo) + "</h1>"
      + '<div class="data">' + esc(formatDataIta(dataV)) + "</div>"
      + sedeNome + gruppoRiga + titoloPrezzo + sezioni
      + (testoIncluso ? '<div class="incluso">' + esc(testoIncluso) + '</div>' : "")
      + "</body></html>";
    const w = window.open("", "_blank");
    if (!w) { alert("Consenti i popup per stampare."); return; }
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 300);
  }

  const btnStampa = container.querySelector("#mg-stampa");
  if (btnStampa) btnStampa.addEventListener("click", stampa);

  const btnSalva = container.querySelector("#mg-salva");
  btnSalva.addEventListener("click", async () => {
    btnSalva.disabled = true; const t = btnSalva.textContent; btnSalva.textContent = "Salvo…";
    try { await salva(); container.querySelector("#mg-stato").textContent = "📝 bozza salvata"; btnSalva.textContent = "✓ Salvato"; }
    catch (e) { alert("Errore salvataggio: " + (e.message || e)); btnSalva.textContent = t; }
    finally { setTimeout(() => { btnSalva.disabled = false; btnSalva.textContent = t; }, 1200); }
  });

  const btnNuovo = container.querySelector("#mg-nuovo");
  if (btnNuovo) btnNuovo.addEventListener("click", () => {
    if (raccogliVoci().length && !confirm("Creare un nuovo menu vuoto? Le modifiche non salvate andranno perse.")) return;
    location.hash = "#/menu-componibile";
    render(container);
  });

  // apri un menu salvato dalla lista
  container.querySelectorAll(".mc-apri").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      location.hash = "#/menu-componibile?id=" + id;
      render(container);
    });
  });
  // elimina un menu salvato
  container.querySelectorAll(".mc-del").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      if (!confirm("Eliminare questo menu salvato?")) return;
      try {
        const { error } = await supa().from("menu_componibile").delete().eq("id", id);
        if (error) throw error;
        if (hashId === id) location.hash = "#/menu-componibile";
        render(container);
      } catch (err) { alert("Errore eliminazione: " + (err.message || err)); }
    });
  });
}

function renderListaMenu(lista, attivoId) {
  lista = Array.isArray(lista) ? lista : [];
  if (!lista.length) {
    return '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:#64748b;">Nessun menu salvato ancora. Componi il primo menu qui sotto e premi 💾 Salva.</div>';
  }
  let h = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:14px;">'
    + '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;">📁 Menu salvati (' + lista.length + ')</div>'
    + '<div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow:auto;">';
  lista.forEach(m => {
    const attivo = String(m.id) === String(attivoId);
    const nPiatti = Array.isArray(m.voci) ? m.voci.length : 0;
    const sub = [m.nome_gruppo, (nPiatti + ' piatti')].filter(Boolean).join(' · ');
    h += '<div class="mc-apri" data-id="' + m.id + '" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;background:' + (attivo ? '#e0f2fe' : '#fff') + ';border:1px solid ' + (attivo ? '#7dd3fc' : '#e2e8f0') + ';">'
      + '<div style="min-width:0;"><div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.titolo || 'Menu') + '</div>'
      + '<div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(sub) + '</div></div>'
      + '<button class="mc-del" data-id="' + m.id + '" title="Elimina" style="flex:none;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button>'
      + '</div>';
  });
  h += '</div></div>';
  return h;
}
