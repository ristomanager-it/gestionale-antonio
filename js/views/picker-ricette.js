// js/views/picker-ricette.js
// Scelta di piatti dal ricettario SENZA caricarlo tutto: si parte dalle ricette gia' categorizzate,
// si filtra per categoria di portata e si cerca per nome; mostra al massimo 40 risultati per volta.
// onOk riceve [{ id, nome }] dei piatti spuntati.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function scegliRicette({ titolo = "Aggiungi dal ricettario", onOk }) {
  const az = window.state?.azienda?.id;
  if (!az) return;
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:6000;background:#F6F8FA;overflow-y:auto;-webkit-overflow-scrolling:touch;";
  ov.innerHTML = `<div style="padding:30px;text-align:center;color:#94a3b8;">Un attimo…</div>`;
  document.body.appendChild(ov);

  const { data: cats } = await sb().from("categorie_portata").select("id, nome, ordine").eq("azienda_id", az).order("ordine").order("nome");
  // le categorie con lo stesso nome (una per sede) contano come una sola
  const perNome = new Map();
  (cats || []).forEach((c) => { const k = c.nome.trim(); if (!perNome.has(k)) perNome.set(k, []); perNome.get(k).push(c.id); });
  const nomiCat = new Map();
  (cats || []).forEach((c) => nomiCat.set(c.id, c.nome.trim()));

  let cat = "", q = "", risultati = [], tot40 = false, tempo = null;
  const sel = new Map();

  async function cerca() {
    let r = sb().from("ricette").select("id, nome, categoria_portata_id").eq("azienda_id", az).eq("attivo", true)
      .not("nome", "ilike", "%proposte%").order("nome").limit(41);
    if (q.trim()) r = r.ilike("nome", `%${q.trim().replace(/[%_]/g, "")}%`);
    if (cat === "__none") r = r.is("categoria_portata_id", null);
    else if (cat) r = r.in("categoria_portata_id", perNome.get(cat) || [-1]);
    else r = r.not("categoria_portata_id", "is", null);
    const { data } = await r;
    tot40 = (data || []).length > 40;
    risultati = (data || []).slice(0, 40);
    elenco();
  }

  function elenco() {
    const box = ov.querySelector("#pr-ris");
    if (!box) return;
    box.innerHTML = risultati.length ? risultati.map((r) => `
      <label class="r"><input type="checkbox" data-i="${r.id}" ${sel.has(r.id) ? "checked" : ""}>
        <span><b>${esc(r.nome)}</b>${nomiCat.get(r.categoria_portata_id) ? `<small>${esc(nomiCat.get(r.categoria_portata_id))}</small>` : ""}</span></label>`).join("")
      + (tot40 ? `<div class="m">Ce ne sono altri: scrivi per restringere la ricerca.</div>` : "")
      : `<div class="m">Nessuna ricetta trovata.${cat !== "__none" ? " Prova «Senza categoria» o cambia parole." : ""}</div>`;
    box.querySelectorAll("input[data-i]").forEach((el) => el.addEventListener("change", () => {
      const r = risultati.find((x) => x.id === Number(el.dataset.i));
      if (!r) return;
      if (el.checked) sel.set(r.id, r.nome); else sel.delete(r.id);
      const b = ov.querySelector("#pr-ok"); if (b) { b.textContent = `Aggiungi (${sel.size})`; b.disabled = !sel.size; }
    }));
  }

  ov.innerHTML = `<style>
    .pr{max-width:680px;margin:0 auto;padding:14px 16px 230px;color:#1F2937;font-family:inherit;}
    .pr h2{margin:6px 0 10px;font-size:20px;}
    .pr input[type=search]{width:100%;box-sizing:border-box;border:1px solid #D5DBE0;border-radius:12px;padding:12px 14px;font:inherit;font-size:16px;background:#fff;}
    .pr .ch{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;}
    .pr .ch button{border:0;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;background:#EEF2F7;color:#374151;cursor:pointer;}
    .pr .ch button.on{background:#0E5A7A;color:#fff;}
    .pr .lista{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:2px 14px;}
    .pr label.r{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid #F1F5F9;font-size:15px;cursor:pointer;}
    .pr label.r:first-child{border-top:0;} .pr label.r input{width:22px;height:22px;flex-shrink:0;margin-top:1px;}
    .pr label.r small{display:block;font-size:12px;color:#6B7280;margin-top:2px;}
    .pr .m{padding:12px 0;font-size:13px;color:#6B7280;}
    .pr .bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #E5E7EB;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));display:flex;gap:10px;justify-content:flex-end;}
  </style>
  <div class="pr"><h2>${esc(titolo)}</h2>
    <input type="search" id="pr-q" placeholder="Cerca per nome…" autocomplete="off">
    <div class="ch" id="pr-ch"></div>
    <div class="lista" id="pr-ris"></div></div>
  <div class="pr"><div class="bar"><button class="app-button secondary" id="pr-no">Annulla</button><button class="app-button" id="pr-ok" disabled>Aggiungi (0)</button></div></div>`;

  function chip() {
    ov.querySelector("#pr-ch").innerHTML =
      `<button data-c="" class="${!cat ? "on" : ""}">Categorizzate</button>` +
      [...perNome.keys()].map((n) => `<button data-c="${esc(n)}" class="${cat === n ? "on" : ""}">${esc(n)}</button>`).join("") +
      `<button data-c="__none" class="${cat === "__none" ? "on" : ""}">Senza categoria</button>`;
  }
  chip();
  ov.querySelector("#pr-ch").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-c]"); if (!b) return;
    cat = b.dataset.c; chip(); cerca();
  });
  ov.querySelector("#pr-q").addEventListener("input", (e) => { q = e.target.value; clearTimeout(tempo); tempo = setTimeout(cerca, 250); });
  ov.querySelector("#pr-no").onclick = () => ov.remove();
  ov.querySelector("#pr-ok").onclick = () => {
    const lista = [...sel.entries()].map(([id, nome]) => ({ id, nome }));
    ov.remove();
    if (onOk && lista.length) onOk(lista);
  };
  cerca();
}
