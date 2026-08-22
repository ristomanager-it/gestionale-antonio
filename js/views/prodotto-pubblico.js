// Pagina che si apre inquadrando il QR sul retro della confezione.
// Nessun login: legge la sola funzione scheda_prodotto_pubblica, che
// espone i campi gia' stampati sull'etichetta piu' le altre referenze.

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export async function renderProdottoPubblico(app, codice) {
  const supa = window.supabaseClient || window.supabase;

  app.innerHTML = `<div style="padding:40px;text-align:center;color:#8a6d3b;font-family:Georgia,serif;">Un attimo...</div>`;

  let d = null;
  try {
    const { data, error } = await supa.rpc("scheda_prodotto_pubblica", { p_codice: codice });
    if (error) throw error;
    d = data;
  } catch (e) {
    console.error("scheda prodotto:", e);
  }

  if (!d || d.ok !== true) {
    app.innerHTML = `<div style="padding:60px 24px;text-align:center;font-family:Georgia,serif;color:#3d2f1f;">
      <div style="font-size:22px;margin-bottom:8px;">Prodotto non trovato</div>
      <div style="font-size:14px;color:#7a6a52;">Controlla il codice sulla confezione.</div></div>`;
    return;
  }

  const allergeni = Array.isArray(d.allergeni) ? d.allergeni.filter(Boolean) : [];
  const altre = Array.isArray(d.altre) ? d.altre : [];

  const sez = (titolo, corpo) => corpo
    ? `<div class="pp-sez">${esc(titolo)}</div><div class="pp-testo">${esc(corpo)}</div>` : "";

  app.innerHTML = `
    <style>
      .pp-bg { background:#FBF7EF; min-height:100vh; margin:0; padding:0 0 40px; }
      .pp-wrap { max-width:520px; margin:0 auto; padding:0 20px; }
      .pp-head { text-align:center; padding:28px 0 18px; }
      .pp-marchio { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#8a6d3b; font-weight:700; }
      .pp-rule { width:46px; height:1px; background:#c9b896; margin:12px auto; }
      .pp-nome { font-family:Georgia,serif; font-size:30px; line-height:1.1; color:#3d2f1f; margin:0; }
      .pp-extra { font-size:14px; font-style:italic; color:#7a6a52; margin-top:8px; }
      .pp-foto { width:100%; border-radius:10px; margin:18px 0 6px; display:block; }
      .pp-card { background:#fff; border:1px solid #e6ddcb; border-radius:12px; padding:18px 20px; margin-top:16px; }
      .pp-sez { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:#8a6d3b; margin:18px 0 6px; }
      .pp-sez:first-child { margin-top:0; }
      .pp-testo { font-size:15px; line-height:1.6; color:#2b2b2b; white-space:pre-line; }
      .pp-uso { background:#fff; border-left:4px solid #8a6d3b; border-radius:8px; padding:16px 18px; margin-top:16px; }
      .pp-uso .pp-sez { margin-top:0; }
      .pp-uso .pp-testo { font-size:16px; }
      .pp-alle { font-weight:800; color:#7a2e2e; }
      .pp-altre { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .pp-chip { display:block; border:1px solid #d9cfbb; background:#FBF7EF; border-radius:22px;
                 padding:8px 14px; font-size:13px; color:#3d2f1f; text-decoration:none; }
      .pp-piede { text-align:center; font-size:11px; color:#8a7a62; margin-top:26px; line-height:1.5; }
    </style>

    <div class="pp-bg"><div class="pp-wrap">
      <div class="pp-head">
        ${d.marchio ? `<div class="pp-marchio">${esc(d.marchio)}</div><div class="pp-rule"></div>` : ""}
        <h1 class="pp-nome">${esc(d.denominazione)}</h1>
        ${d.denominazione_extra ? `<div class="pp-extra">${esc(d.denominazione_extra)}</div>` : ""}
      </div>

      ${d.foto_url ? `<img class="pp-foto" src="${esc(d.foto_url)}" alt="${esc(d.denominazione)}">` : ""}

      ${d.istruzioni_uso ? `<div class="pp-uso">
        <div class="pp-sez">Come si usa</div>
        <div class="pp-testo">${esc(d.istruzioni_uso)}</div></div>` : ""}

      <div class="pp-card">
        ${sez("Ingredienti", d.ingredienti)}
        ${allergeni.length ? `<div class="pp-sez">Allergeni</div><div class="pp-testo pp-alle">${esc(allergeni.join(", "))}</div>` : ""}
        ${sez("Origine", d.origine)}
        ${sez("Conservazione", d.conservazione)}
        ${sez("Dopo l'apertura", d.dopo_apertura)}
      </div>

      ${altre.length ? `<div class="pp-card">
        <div class="pp-sez">Le altre nostre ricette</div>
        <div class="pp-altre">${altre.map(a =>
          `<a class="pp-chip" href="#/prodotto/${esc(a.codice)}">${esc(a.nome)}</a>`).join("")}</div>
      </div>` : ""}

      ${d.produttore ? `<div class="pp-piede">
        ${esc(d.produttore.ragione_sociale)}<br>${esc(d.produttore.indirizzo || "")}</div>` : ""}
    </div></div>`;
}
