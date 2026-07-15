// Food cost mancanti — schermata rapida per inserire a mano il food cost/porzione
// dei prodotti_vendita che non lo hanno (né da ricetta né manuale). Per sede.

const COLORE = "#0E5A7A";
function supa() { return window.supabaseClient || window.supabase; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function money(n) { const v = Number(n) || 0; return v.toFixed(2).replace(".", ","); }
function norm(s) { return String(s || "").trim().toLowerCase(); }

export async function render(container) {
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva || null;
  if (!azienda?.id) {
    container.innerHTML = '<section class="view" style="padding:24px;"><div class="card"><h3>Nessuna azienda attiva</h3></div></section>';
    return;
  }
  if (!sede?.id) {
    container.innerHTML = '<section class="view" style="padding:24px;"><div class="card"><h3>Seleziona una sede</h3><p>Il food cost è per sede — scegli la sede in alto.</p></div></section>';
    return;
  }
  container.innerHTML = '<section class="view" style="padding:16px;"><p style="color:#64748b;">Caricamento…</p></section>';
  const s = supa();

  // Prodotti attivi della sede + eventuale costo ricetta
  const { data: prodData } = await s.from("prodotti_vendita")
    .select("id, nome, prezzo_base, ricetta_id, food_cost_manuale, ricette(costo_porzione)")
    .eq("sede_id", sede.id).eq("attivo", true).order("nome");
  const prodotti = (prodData || []).map(p => ({
    id: p.id, nome: p.nome, prezzo: p.prezzo_base,
    costo_ricetta: p.ricette?.costo_porzione != null ? Number(p.ricette.costo_porzione) : 0,
    manuale: p.food_cost_manuale != null ? Number(p.food_cost_manuale) : null,
  }));
  // Solo quelli senza costo da ricetta (quelli con ricetta costata sono già a posto)
  const daFare = prodotti.filter(p => !(p.costo_ricetta > 0));

  // Prodotti effettivamente venduti (per dare priorità)
  const { data: vend } = await s.from("vendite_giornaliere")
    .select("nome_prodotto, nome_articolo").eq("sede_uuid", sede.id).limit(20000);
  const venduti = new Set();
  (vend || []).forEach(v => { if (v.nome_prodotto) venduti.add(norm(v.nome_prodotto)); if (v.nome_articolo) venduti.add(norm(v.nome_articolo)); });
  daFare.forEach(p => { p.venduto = venduti.has(norm(p.nome)); });

  // ordina: venduti prima, poi senza valore prima, poi nome
  daFare.sort((a, b) => (b.venduto - a.venduto) || ((a.manuale != null) - (b.manuale != null)) || a.nome.localeCompare(b.nome));

  const nVenduti = daFare.filter(p => p.venduto).length;
  const nFatti = daFare.filter(p => p.manuale != null).length;

  function rigaHtml(p) {
    return '<div class="fcm-row" data-id="' + p.id + '" data-nome="' + esc(p.nome.toLowerCase()) + '" data-venduto="' + (p.venduto ? 1 : 0) + '" style="display:flex;gap:8px;align-items:center;padding:8px 4px;border-bottom:1px solid #f1f5f9;">'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(p.nome) + (p.venduto ? ' <span style="font-size:10px;font-weight:700;color:#166534;background:#dcfce7;border-radius:5px;padding:1px 5px;">venduto</span>' : '') + '</div>'
      + '<div style="font-size:11px;color:#94a3b8;">prezzo € ' + money(p.prezzo) + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:4px;">'
      + '<span style="font-size:13px;color:#64748b;">€</span>'
      + '<input class="fcm-input" data-id="' + p.id + '" type="number" step="0.10" min="0" inputmode="decimal" value="' + (p.manuale != null ? p.manuale : '') + '" placeholder="food cost" style="width:92px;padding:8px;border:1px solid ' + (p.manuale != null ? '#16a34a' : '#d1d5db') + ';border-radius:8px;font-size:14px;text-align:right;">'
      + '</div></div>';
  }

  let html = '<section class="view" style="padding:16px;max-width:760px;margin:0 auto;">';
  html += '<div class="card" style="border-radius:12px;padding:16px;margin-bottom:12px;">'
    + '<h2 style="margin:0 0 4px;color:' + COLORE + ';">🍝 Food cost mancanti</h2>'
    + '<p style="margin:0 0 10px;color:#64748b;font-size:13px;">' + esc(sede.nome || '') + ' — scrivi il costo materia prima <strong>per porzione</strong>. Dove poi compili la ricetta, il valore si aggiorna da solo.</p>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12px;color:#475569;">'
    + '<span>Da fare: <strong>' + daFare.length + '</strong></span>'
    + '<span>· venduti: <strong style="color:#166534;">' + nVenduti + '</strong></span>'
    + '<span>· già inseriti: <strong>' + nFatti + '</strong></span>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;">'
    + '<input id="fcm-search" placeholder="🔍 Cerca prodotto…" style="flex:1;min-width:160px;padding:9px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">'
    + '<label style="font-size:13px;color:#334155;display:flex;align-items:center;gap:6px;cursor:pointer;"><input id="fcm-solo-venduti" type="checkbox" checked> Solo venduti</label>'
    + '</div></div>';

  html += '<div class="card" style="border-radius:12px;padding:8px 12px;">';
  html += '<div id="fcm-list">' + daFare.map(rigaHtml).join('') + '</div>';
  if (!daFare.length) html += '<p style="padding:16px;color:#64748b;">Nessun prodotto senza food cost 🎉</p>';
  html += '</div>';
  html += '</section>';
  container.innerHTML = html;

  const list = container.querySelector("#fcm-list");
  const search = container.querySelector("#fcm-search");
  const soloVend = container.querySelector("#fcm-solo-venduti");

  function applica() {
    const q = norm(search.value);
    const onlyV = soloVend.checked;
    list.querySelectorAll(".fcm-row").forEach(row => {
      const nomeOk = !q || row.getAttribute("data-nome").includes(q);
      const vendOk = !onlyV || row.getAttribute("data-venduto") === "1";
      row.style.display = (nomeOk && vendOk) ? "" : "none";
    });
  }
  search.addEventListener("input", applica);
  soloVend.addEventListener("change", applica);
  applica();

  // Salvataggio food cost a mano
  list.querySelectorAll(".fcm-input").forEach(inp => {
    inp.addEventListener("change", async () => {
      const id = inp.getAttribute("data-id");
      const raw = inp.value.trim().replace(",", ".");
      const val = raw === "" ? null : Number(raw);
      if (val != null && (!Number.isFinite(val) || val < 0)) { inp.style.borderColor = "#dc2626"; return; }
      inp.disabled = true;
      const { error } = await supa().from("prodotti_vendita").update({ food_cost_manuale: val, updated_at: new Date().toISOString() }).eq("id", Number(id));
      inp.disabled = false;
      if (error) { alert("Errore salvataggio: " + error.message); inp.style.borderColor = "#dc2626"; return; }
      inp.style.borderColor = val != null ? "#16a34a" : "#d1d5db";
    });
  });
}
