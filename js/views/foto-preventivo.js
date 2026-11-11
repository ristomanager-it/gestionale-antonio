// FOTO DEL PREVENTIVO ONLINE — EVENTI › 🌐 Preventivo online › 📷 Foto dei piatti
// Elenco dei piatti visibili nel "Crea il tuo preventivo", divisi per passo, prima quelli senza foto.
// Un solo gesto: tocchi "Scatta", si apre la fotocamera, la foto va sul piatto (foto_pubblica_url).
// Sul sito, in ogni passo le foto compaiono quando le hanno tutti i piatti di quel passo.
const sb = () => window.supabaseClient || window.supabase;
const az = () => window.state?.azienda?.id;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (i) => document.getElementById(i);
// come il sito divide i piatti nei passi (stesse regole della Edge Function preventivo-online)
const PASSI = [
  ["aperitivo", "Aperitivo"], ["angoli", "Isole del matrimonio"], ["antipasti", "Antipasti"], ["primi", "Primi"],
  ["secondi", "Secondi"], ["contorni", "Contorni"], ["torta", "Torte"], ["dolci", "Dolci"],
];
let S = { voci: [], sede: null, soloMancanti: true };

function passo(cat, nome) {
  const c = String(cat || "").toLowerCase(), n = String(nome || "");
  if (/antipast/.test(c)) return /aperitiv/i.test(n) ? "aperitivo" : (/^angolo/i.test(n) ? "angoli" : "antipasti");
  if (/primi/.test(c)) return "primi";
  if (/secondi/.test(c)) return "secondi";
  if (/contorn/.test(c)) return "contorni";
  if (/dessert|dolci/.test(c)) return /torta/i.test(n) ? "torta" : "dolci";
  return null;
}

export async function render(app) {
  app.innerHTML = '<section class="view fp-v">' + CSS + '<div style="margin-bottom:10px"><button class="app-button small gray" onclick="window.location.hash=\'#/preventivo-online\'">← Preventivo online</button></div>'
    + '<h2>📷 Foto dei piatti</h2><p class="fp-m">Tocca «Scatta» e fotografa il piatto: la foto va subito nel preventivo online. In ogni passo le foto compaiono sul sito quando le hanno tutti i piatti del passo.</p>'
    + '<label class="fp-sw"><input type="checkbox" id="fpSolo" checked> Mostra solo i piatti senza foto</label><div id="fpL"><p class="fp-m">Carico…</p></div></section>';
  $("fpSolo").onchange = (e) => { S.soloMancanti = e.target.checked; disegna(); };
  await carica();
}

async function carica() {
  const a = az();
  const { data: cfg } = await sb().from("preventivi_config").select("online_sede_id").eq("azienda_id", a).maybeSingle();
  S.sede = cfg?.online_sede_id || null;
  const [pv, cats] = await Promise.all([
    (() => { let q = sb().from("prodotti_vendita").select("id, nome, nome_pubblico, foto_url, foto_pubblica_url, categoria_vendita_id").eq("azienda_id", a).eq("attivo", true).eq("preventivo_online", true); if (S.sede) q = q.eq("sede_id", S.sede); return q.limit(1000); })(),
    sb().from("categorie_vendita").select("id, nome").eq("azienda_id", a).limit(500),
  ]);
  const nomeCat = {}; (cats.data || []).forEach((c) => { nomeCat[c.id] = c.nome; });
  S.voci = (pv.data || []).map((p) => ({ id: p.id, nome: p.nome_pubblico || p.nome, foto: p.foto_pubblica_url || p.foto_url || "", k: passo(nomeCat[p.categoria_vendita_id], p.nome) }))
    .filter((v) => v.k);
  disegna();
}

function disegna() {
  const tot = S.voci.length, mancano = S.voci.filter((v) => !v.foto).length;
  let h = '<div class="fp-k"><b>' + (tot - mancano) + " / " + tot + "</b> piatti con la foto" + (mancano ? " · ne mancano <b>" + mancano + "</b>" : " · tutto fatto ✓") + "</div>";
  PASSI.forEach(([k, titolo]) => {
    const tutti = S.voci.filter((v) => v.k === k);
    if (!tutti.length) return;
    const senza = tutti.filter((v) => !v.foto).length;
    const vs = (S.soloMancanti ? tutti.filter((v) => !v.foto) : tutti).sort((x, y) => (x.foto ? 1 : 0) - (y.foto ? 1 : 0) || x.nome.localeCompare(y.nome));
    h += '<div class="fp-card"><div class="fp-h"><b>' + esc(titolo) + '</b><span class="' + (senza ? "no" : "ok") + '">' + (senza ? "mancano " + senza : "✓ completo, sul sito con le foto") + "</span></div>";
    h += vs.map((v) => '<div class="fp-r">' + (v.foto ? '<img src="' + esc(v.foto) + '" alt="">' : '<span class="fp-ph">📷</span>') + '<span class="fp-n">' + esc(v.nome) + '</span>'
      + '<label class="fp-btn' + (v.foto ? "" : " p") + '">' + (v.foto ? "Rifai" : "Scatta") + '<input type="file" accept="image/*" capture="environment" data-id="' + esc(v.id) + '" hidden></label></div>').join("");
    h += "</div>";
  });
  $("fpL").innerHTML = h;
  $("fpL").querySelectorAll("input[type=file]").forEach((inp) => inp.onchange = () => carica1(inp));
}

// foto ridotta a 1400 px (lato lungo), JPEG: leggera da caricare dal telefono e veloce sul sito
function riduci(file) {
  return new Promise((ok, ko) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob((b) => b ? ok(b) : ko(new Error("foto non leggibile")), "image/jpeg", 0.82);
    };
    img.onerror = () => ko(new Error("foto non leggibile"));
    img.src = url;
  });
}

async function carica1(inp) {
  const f = inp.files && inp.files[0]; if (!f) return;
  const id = inp.dataset.id, lab = inp.closest("label");
  lab.firstChild.textContent = "Carico…";
  try {
    const blob = await riduci(f);
    const path = az() + "/preventivo-online/" + id + "-" + Date.now() + ".jpg";
    const up = await sb().storage.from("media-aziende").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw up.error;
    const url = sb().storage.from("media-aziende").getPublicUrl(path).data.publicUrl;
    const { error } = await sb().from("prodotti_vendita").update({ foto_pubblica_url: url }).eq("id", id);
    if (error) throw error;
    const v = S.voci.find((x) => x.id === id); if (v) v.foto = url;
    disegna();
  } catch (e) {
    lab.firstChild.textContent = "Riprova";
    alert("La foto non è stata salvata: " + (e.message || e));
  }
}

const CSS = '<style>.fp-v{max-width:640px;box-sizing:border-box}.fp-v *{box-sizing:border-box}.fp-m{color:#64748b;font-size:13px}'
  + '.fp-sw{display:flex;gap:8px;align-items:center;font-size:14px;margin:8px 0}.fp-k{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:10px 0;font-size:15px}'
  + '.fp-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;margin:10px 0}.fp-h{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0 8px}'
  + '.fp-h .no{font-size:12px;font-weight:700;color:#b45309}.fp-h .ok{font-size:12px;font-weight:700;color:#166534}'
  + '.fp-r{display:flex;align-items:center;gap:10px;border-top:1px solid #f1f5f9;padding:8px 0}.fp-r img,.fp-ph{width:48px;height:48px;border-radius:8px;object-fit:cover;flex:none}'
  + '.fp-ph{display:grid;place-items:center;background:#f1f5f9;font-size:20px}.fp-n{flex:1;min-width:0;font-size:14px}'
  + '.fp-btn{flex:none;display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#0f172a;border-radius:10px;padding:10px 14px;font-weight:700;font-size:14px;cursor:pointer}.fp-btn.p{background:#023C59;color:#fff;border-color:#023C59}</style>';
