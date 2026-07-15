// Menu del Giorno — vista cucina: composizione 3 antipasti / 3 primi / 3 secondi / 1 dessert,
// controllo scadenze con ricette suggerite, pubblicazione automatica sul menu digitale.

const COLORE = "#0E5A7A";
const PUBBLICA_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/menu-giorno-pubblica";
const PORTATE = [
  { key: "antipasti", label: "🥗 Antipasti", slots: 3 },
  { key: "primi", label: "🍝 Primi", slots: 3 },
  { key: "secondi", label: "🍖 Secondi", slots: 3 },
  { key: "dessert", label: "🍰 Dessert", slots: 1 },
];

function supa() { return window.supabaseClient || window.supabase; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function money(n) { const v = Number(n) || 0; return v.toFixed(2).replace(".", ","); }
function prezzoRicetta(r) { return (r.prezzo_ristorante != null ? Number(r.prezzo_ristorante) : (r.prezzo_vendita != null ? Number(r.prezzo_vendita) : 0)); }

export async function render(container) {
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva || null;
  if (!azienda?.id) {
    container.innerHTML = '<section class="view" style="padding:24px;"><div class="card"><h3>Nessuna azienda attiva</h3></div></section>';
    return;
  }
  container.innerHTML = '<section class="view" style="padding:16px;"><p style="color:#64748b;">Caricamento menu del giorno…</p></section>';

  const oggi = new Date().toISOString().slice(0, 10);
  const s = supa();

  // Ricette divise per portata (categoria_food)
  const { data: ricetteData } = await s.from("ricette")
    .select("id, nome, categoria_food, prezzo_ristorante, prezzo_vendita, food_cost_percentuale")
    .eq("azienda_id", azienda.id).eq("attivo", true)
    .in("categoria_food", ["antipasti", "primi", "secondi", "dessert"])
    .order("nome");
  const ricette = ricetteData || [];
  const mappaRicetta = new Map(ricette.map(r => [String(r.id), r]));
  const perPortata = {};
  PORTATE.forEach(p => { perPortata[p.key] = ricette.filter(r => r.categoria_food === p.key); });

  // Menu del giorno di oggi (se esiste)
  let q = s.from("menu_giorno").select("*").eq("azienda_id", azienda.id).eq("data", oggi);
  q = sede?.id ? q.eq("sede_id", sede.id) : q.is("sede_id", null);
  const { data: mgData } = await q.maybeSingle();
  let mgEsistente = mgData || null;
  const sel = {};
  PORTATE.forEach(p => { sel[p.key] = new Array(p.slots).fill(""); });
  if (mgEsistente && Array.isArray(mgEsistente.voci)) {
    mgEsistente.voci.forEach(v => {
      const arr = sel[v.portata];
      if (arr) { const idx = arr.indexOf(""); if (idx >= 0) arr[idx] = String(v.ricetta_id); }
    });
  }
  let mezzaPensione = mgEsistente ? !!mgEsistente.mezza_pensione : true;

  // Scadenze materie prime (ricezione barcode) entro 7 giorni
  const inX = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const { data: scadRic } = await s.from("ordini_fornitore_ricezioni_righe")
    .select("prodotto_id, data_scadenza, lotto, quantita_ricevuta")
    .eq("azienda_id", azienda.id).not("data_scadenza", "is", null)
    .gte("data_scadenza", oggi).lte("data_scadenza", inX).order("data_scadenza");
  const scadenze = scadRic || [];
  const prodIds = [...new Set(scadenze.map(x => x.prodotto_id).filter(Boolean))];
  const nomeProd = new Map();
  const suggPerProd = new Map();
  if (prodIds.length) {
    const { data: prods } = await s.from("prodotti").select("id, nome, nome_interno").in("id", prodIds);
    (prods || []).forEach(p => nomeProd.set(String(p.id), p.nome_interno || p.nome));
    const { data: ings } = await s.from("ricetta_ingredienti").select("prodotto_id, ricetta_id").in("prodotto_id", prodIds);
    const ricIds = [...new Set((ings || []).map(i => i.ricetta_id).filter(Boolean))];
    const mappaRicSugg = new Map();
    if (ricIds.length) {
      const { data: rr } = await s.from("ricette").select("id, nome, categoria_food").in("id", ricIds);
      (rr || []).forEach(r => mappaRicSugg.set(String(r.id), r));
    }
    (ings || []).forEach(i => {
      const k = String(i.prodotto_id);
      if (!suggPerProd.has(k)) suggPerProd.set(k, []);
      const r = mappaRicSugg.get(String(i.ricetta_id));
      if (r && !suggPerProd.get(k).some(x => x.id === r.id)) suggPerProd.get(k).push(r);
    });
  }

  // ---------- RENDER ----------
  function optionsFor(key, selectedId) {
    let o = '<option value="">— scegli —</option>';
    (perPortata[key] || []).forEach(r => {
      const p = prezzoRicetta(r);
      const label = r.nome + (p > 0 ? "  (€ " + money(p) + ")" : "");
      o += '<option value="' + r.id + '"' + (String(r.id) === String(selectedId) ? " selected" : "") + '>' + esc(label) + '</option>';
    });
    return o;
  }
  function slotRow(key, idx) {
    const selId = sel[key][idx];
    const r = selId ? mappaRicetta.get(String(selId)) : null;
    const info = r ? ('FC ' + (r.food_cost_percentuale != null ? Math.round(r.food_cost_percentuale) + '%' : '—') + ' · € ' + money(prezzoRicetta(r))) : '';
    return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">'
      + '<select class="mg-sel" data-portata="' + key + '" data-slot="' + idx + '" style="flex:1;min-width:180px;padding:9px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;">' + optionsFor(key, selId) + '</select>'
      + '<span class="mg-info" data-portata="' + key + '" data-slot="' + idx + '" style="font-size:11px;color:#64748b;min-width:120px;">' + info + '</span>'
      + '</div>';
  }

  let html = '<section class="view" style="padding:16px;max-width:900px;margin:0 auto;">';

  html += '<div class="card" style="border-radius:12px;padding:16px;margin-bottom:14px;">'
    + '<h2 style="margin:0 0 4px;color:' + COLORE + ';">🍽️ Menu del Giorno</h2>'
    + '<p style="margin:0 0 12px;color:#64748b;font-size:13px;">Componi il menu del giorno' + (sede?.nome ? ' — ' + esc(sede.nome) : '') + '. Vale anche come mezza pensione per gli ospiti hotel.</p>'
    + '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">'
    + '<label style="font-size:13px;color:#334155;">Data <input id="mg-data" type="date" value="' + oggi + '" style="padding:7px;border:1px solid #d1d5db;border-radius:8px;margin-left:6px;"></label>'
    + '<label style="font-size:13px;color:#334155;display:flex;align-items:center;gap:6px;cursor:pointer;"><input id="mg-mp" type="checkbox"' + (mezzaPensione ? ' checked' : '') + '> Mezza pensione</label>'
    + '<span id="mg-stato" style="font-size:12px;color:#64748b;margin-left:auto;">' + (mgEsistente ? (mgEsistente.pubblicato ? '✅ pubblicato' : '📝 bozza salvata') : 'nuovo') + '</span>'
    + '</div></div>';

  // Sezioni portate
  PORTATE.forEach(p => {
    const disp = (perPortata[p.key] || []).length;
    html += '<div class="card" style="border-radius:12px;padding:16px;margin-bottom:12px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">'
      + '<h3 style="margin:0;color:#0f172a;">' + p.label + '</h3>'
      + '<span style="font-size:11px;color:#94a3b8;">' + disp + ' ricette disponibili</span></div>';
    for (let i = 0; i < p.slots; i++) html += slotRow(p.key, i);
    if (disp === 0) html += '<p style="font-size:12px;color:#b45309;margin:4px 0 0;">Nessuna ricetta con categoria "' + p.key + '". Assegnala nel ricettario per vederla qui.</p>';
    html += '</div>';
  });

  // Pannello scadenze
  html += '<div class="card" style="border-radius:12px;padding:16px;margin-bottom:12px;background:#fffbeb;border:1px solid #fde68a;">'
    + '<h3 style="margin:0 0 8px;color:#92400e;">⏳ In scadenza (7 giorni)</h3>';
  if (!scadenze.length) {
    html += '<p style="font-size:13px;color:#78716c;margin:0;">Nessun prodotto in scadenza registrato. Le scadenze compaiono qui quando ricevi merce scansionando lotto e scadenza col barcode.</p>';
  } else {
    scadenze.forEach(x => {
      const gg = Math.round((new Date(x.data_scadenza) - new Date(oggi)) / 86400000);
      const sugg = suggPerProd.get(String(x.prodotto_id)) || [];
      html += '<div style="border-top:1px solid #fde68a;padding:8px 0;">'
        + '<div style="font-weight:600;font-size:13px;">' + esc(nomeProd.get(String(x.prodotto_id)) || ("Prodotto " + x.prodotto_id)) + ' <span style="color:#b45309;font-weight:700;">· ' + (gg <= 0 ? 'oggi' : gg + 'gg') + '</span> <span style="color:#94a3b8;font-weight:400;">(' + (x.quantita_ricevuta || '?') + ', lotto ' + esc(x.lotto || '-') + ')</span></div>';
      if (sugg.length) {
        html += '<div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;">';
        sugg.forEach(r => {
          html += '<button class="mg-sugg" data-ricetta="' + r.id + '" data-portata="' + esc(r.categoria_food || '') + '" style="font-size:11px;background:#fff;border:1px solid #d1d5db;border-radius:14px;padding:3px 10px;cursor:pointer;">＋ ' + esc(r.nome) + '</button>';
        });
        html += '</div>';
      } else {
        html += '<div style="font-size:11px;color:#a8a29e;margin-top:2px;">Nessuna ricetta collegata (completa gli ingredienti nel ricettario).</div>';
      }
      html += '</div>';
    });
  }
  html += '</div>';

  // Azioni
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;position:sticky;bottom:0;background:#fff;padding:12px 0;">'
    + '<button id="mg-salva" style="flex:1;min-width:140px;background:#f1f5f9;border:1px solid #cbd5e1;color:#0f172a;border-radius:12px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">💾 Salva bozza</button>'
    + '<button id="mg-pubblica" style="flex:1;min-width:140px;background:' + COLORE + ';border:none;color:#fff;border-radius:12px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">🚀 Pubblica sul menu</button>'
    + '</div>';

  html += '</section>';
  container.innerHTML = html;

  // ---------- INTERAZIONI ----------
  function aggiornaInfo(selEl) {
    const key = selEl.getAttribute("data-portata");
    const idx = selEl.getAttribute("data-slot");
    const infoEl = container.querySelector('.mg-info[data-portata="' + key + '"][data-slot="' + idx + '"]');
    const r = selEl.value ? mappaRicetta.get(String(selEl.value)) : null;
    if (infoEl) infoEl.textContent = r ? ('FC ' + (r.food_cost_percentuale != null ? Math.round(r.food_cost_percentuale) + '%' : '—') + ' · € ' + money(prezzoRicetta(r))) : '';
  }
  container.querySelectorAll(".mg-sel").forEach(selEl => selEl.addEventListener("change", () => aggiornaInfo(selEl)));

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

  function raccogliVoci() {
    const voci = [];
    PORTATE.forEach(p => {
      container.querySelectorAll('.mg-sel[data-portata="' + p.key + '"]').forEach(selEl => {
        const rid = selEl.value;
        if (!rid) return;
        const r = mappaRicetta.get(String(rid));
        voci.push({
          ricetta_id: Number(rid),
          portata: p.key,
          nome: r ? r.nome : "Piatto",
          prezzo: r ? prezzoRicetta(r) : 0,
          food_cost: r && r.food_cost_percentuale != null ? Number(r.food_cost_percentuale) : null,
        });
      });
    });
    return voci;
  }

  async function salva() {
    const voci = raccogliVoci();
    const data = container.querySelector("#mg-data").value || oggi;
    const mp = container.querySelector("#mg-mp").checked;
    const s2 = supa();
    const { data: sess } = await s2.auth.getUser();
    const uid = sess?.user?.id || null;
    const payload = { azienda_id: azienda.id, sede_id: sede?.id || null, data, mezza_pensione: mp, voci, created_by: uid, updated_at: new Date().toISOString() };
    if (mgEsistente?.id) {
      const { error } = await s2.from("menu_giorno").update(payload).eq("id", mgEsistente.id);
      if (error) throw error;
    } else {
      const { data: ins, error } = await s2.from("menu_giorno").insert(payload).select("*").single();
      if (error) throw error;
      mgEsistente = ins;
    }
    return mgEsistente;
  }

  const btnSalva = container.querySelector("#mg-salva");
  btnSalva.addEventListener("click", async () => {
    btnSalva.disabled = true; const t = btnSalva.textContent; btnSalva.textContent = "Salvo…";
    try { await salva(); container.querySelector("#mg-stato").textContent = "📝 bozza salvata"; btnSalva.textContent = "✓ Salvato"; }
    catch (e) { alert("Errore salvataggio: " + (e.message || e)); btnSalva.textContent = t; }
    finally { setTimeout(() => { btnSalva.disabled = false; btnSalva.textContent = t; }, 1200); }
  });

  const btnPub = container.querySelector("#mg-pubblica");
  btnPub.addEventListener("click", async () => {
    const voci = raccogliVoci();
    if (!voci.length) { alert("Aggiungi almeno un piatto prima di pubblicare."); return; }
    if (!confirm("Pubblicare il menu del giorno sul menu digitale? Sostituisce la voce 'Menu del Giorno' attuale.")) return;
    btnPub.disabled = true; const t = btnPub.textContent; btnPub.textContent = "Pubblico…";
    try {
      await salva();
      const s2 = supa();
      const { data: sessData } = await s2.auth.getSession();
      const token = sessData?.session?.access_token || "";
      const res = await fetch(PUBBLICA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ azienda_id: azienda.id, menu_giorno_id: mgEsistente.id }),
      });
      const d = await res.json();
      if (d.success) {
        container.querySelector("#mg-stato").textContent = "✅ pubblicato";
        alert("✅ Menu del giorno pubblicato: " + d.voci_pubblicate + " piatti nel menu digitale.");
      } else {
        alert("Errore pubblicazione: " + (d.error || "riprova"));
      }
    } catch (e) {
      alert("Errore: " + (e.message || e));
    } finally {
      btnPub.disabled = false; btnPub.textContent = t;
    }
  });
}
