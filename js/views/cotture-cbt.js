// js/views/cotture-cbt.js
// Scheda delle cotture CBT (bassa temperatura sottovuoto): cosa, a quanti gradi e per quanto tempo.
// Dati: tabella sottovuoto_riferimenti. Ricerca per nome e filtri per categoria e famiglia.

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const CATEGORIE = [["carne", "Carne"], ["pesce", "Pesce"], ["vegetali", "Vegetali"], ["dolci", "Dolci"], ["basi", "Basi"], ["salse", "Salse"], ["uova", "Uova"]];

function tempo(min) {
  const m = Number(min) || 0;
  if (!m) return "—";
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function gradi(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return "—";
  return (Number.isInteger(n) ? String(n) : String(n).replace(".", ",")) + " °C";
}
const MAX_RIGHE = 120;

export async function render(app) {
  const sb = window.supabaseClient || window.supabase;
  app.innerHTML = `<section class="view"><div class="small-muted">Un attimo…</div></section>`;

  const { data, error } = await sb.from("sottovuoto_riferimenti")
    .select("id, categoria, famiglia, alimento, specifiche, temperatura_c, tempo_minuti, note")
    .eq("attivo", true).order("famiglia").order("alimento").limit(2000);
  if (error) {
    app.innerHTML = `<section class="view"><div style="margin-bottom:12px;"><button class="app-button small gray" onclick="window.location.hash='#/home-cucina'">← Cucina</button></div><div>Non riesco a leggere le cotture. Riprova tra poco.</div></section>`;
    return;
  }
  const righe = (data || []).map((r) => ({ ...r, _k: norm([r.alimento, r.famiglia, r.specifiche, r.categoria].join(" ")) }));
  let cat = "", fam = "";

  app.innerHTML = `
    <section class="view cbt">
      <div style="margin-bottom:12px;">
        <button class="app-button small gray" onclick="window.location.hash='#/home-cucina'">← Cucina</button>
      </div>
      <h2 style="margin:0 0 2px;">🌡️ Cotture CBT</h2>
      <div class="small-muted" style="margin-bottom:12px;">Temperatura e tempo per la cottura sottovuoto a bassa temperatura</div>
      <input id="cbt-q" class="input" placeholder="Cerca: manzo, polpo, carote…" autocomplete="off" style="margin-bottom:10px;" />
      <div id="cbt-cat" class="cbt-chips"></div>
      <div id="cbt-fam" class="cbt-chips cbt-fam"></div>
      <div id="cbt-conta" class="small-muted" style="margin:6px 0 10px;"></div>
      <div id="cbt-lista"></div>
    </section>
    <style>
      .cbt .cbt-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;}
      .cbt .cbt-fam{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;}
      .cbt .cbt-chip{border:0;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;background:#EEF2F7;color:#374151;white-space:nowrap;}
      .cbt .cbt-chip.on{background:#0E5A7A;color:#fff;}
      .cbt .cbt-riga{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:8px;}
      .cbt .cbt-riga.nota{cursor:pointer;}
      .cbt .cbt-nome{font-size:15px;font-weight:600;color:#1F2937;}
      .cbt .cbt-sub{font-size:12px;color:#6B7280;margin-top:2px;}
      .cbt .cbt-dx{text-align:right;flex-shrink:0;}
      .cbt .cbt-temp{font-size:18px;font-weight:800;color:#0E5A7A;}
      .cbt .cbt-tempo{font-size:13px;color:#374151;margin-top:1px;}
      .cbt .cbt-notatxt{display:none;margin:-4px 0 8px;padding:10px 14px;background:#F8FAFC;border:1px solid #e5e7eb;border-radius:12px;font-size:13px;color:#374151;}
    </style>`;

  const q = app.querySelector("#cbt-q");
  const boxCat = app.querySelector("#cbt-cat"), boxFam = app.querySelector("#cbt-fam");
  const conta = app.querySelector("#cbt-conta"), lista = app.querySelector("#cbt-lista");

  function disegna() {
    const t = norm(q.value).trim();
    const presenti = new Set(righe.map((r) => r.categoria));
    boxCat.innerHTML = `<button class="cbt-chip ${cat ? "" : "on"}" data-cat="">Tutte</button>` +
      CATEGORIE.filter(([k]) => presenti.has(k)).map(([k, n]) => `<button class="cbt-chip ${cat === k ? "on" : ""}" data-cat="${k}">${n}</button>`).join("");

    const dellaCat = cat ? righe.filter((r) => r.categoria === cat) : [];
    const famiglie = [...new Set(dellaCat.map((r) => r.famiglia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
    boxFam.style.display = famiglie.length > 1 ? "flex" : "none";
    boxFam.innerHTML = famiglie.length > 1
      ? `<button class="cbt-chip ${fam ? "" : "on"}" data-fam="">Tutti</button>` + famiglie.map((f) => `<button class="cbt-chip ${fam === f ? "on" : ""}" data-fam="${esc(f)}">${esc(f)}</button>`).join("")
      : "";

    let ris = righe;
    if (cat) ris = ris.filter((r) => r.categoria === cat);
    if (cat && fam) ris = ris.filter((r) => r.famiglia === fam);
    if (t) ris = ris.filter((r) => t.split(/\s+/).every((p) => r._k.includes(p)));

    conta.textContent = ris.length === righe.length ? `${ris.length} cotture` : `${ris.length} ${ris.length === 1 ? "cottura" : "cotture"}${ris.length > MAX_RIGHE ? ` · ne vedi ${MAX_RIGHE}, restringi la ricerca` : ""}`;
    if (!ris.length) { lista.innerHTML = `<div class="small-muted">Nessuna cottura trovata.</div>`; return; }

    lista.innerHTML = ris.slice(0, MAX_RIGHE).map((r) => {
      const nota = String(r.note || "").trim();
      return `
        <div class="cbt-riga ${nota ? "nota" : ""}" ${nota ? 'data-nota="1"' : ""}>
          <div style="min-width:0;">
            <div class="cbt-nome">${esc(r.alimento || r.famiglia || "—")}</div>
            <div class="cbt-sub">${esc([r.famiglia && r.famiglia !== r.alimento ? r.famiglia : "", r.specifiche].filter(Boolean).join(" · "))}${nota ? " · tocca per le note" : ""}</div>
          </div>
          <div class="cbt-dx"><div class="cbt-temp">${gradi(r.temperatura_c)}</div><div class="cbt-tempo">${tempo(r.tempo_minuti)}</div></div>
        </div>
        ${nota ? `<div class="cbt-notatxt">${esc(nota)}</div>` : ""}`;
    }).join("");
  }

  boxCat.addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (!b) return; cat = b.dataset.cat; fam = ""; disegna(); });
  boxFam.addEventListener("click", (e) => { const b = e.target.closest("[data-fam]"); if (!b) return; fam = b.dataset.fam; disegna(); });
  lista.addEventListener("click", (e) => {
    const r = e.target.closest("[data-nota]");
    if (!r) return;
    const n = r.nextElementSibling;
    if (n && n.classList.contains("cbt-notatxt")) n.style.display = n.style.display === "block" ? "none" : "block";
  });
  q.addEventListener("input", disegna);
  disegna();
}
