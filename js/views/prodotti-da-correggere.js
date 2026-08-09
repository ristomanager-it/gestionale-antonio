/* =========================================================
   PRODOTTI DA CORREGGERE
   Prodotti comprati a pezzo o a cassa ma usati in ricetta a peso o volume.
   Senza sapere quanto contiene un pezzo, il costo per grammo viene calcolato
   come se un pezzo pesasse un chilo: nessun errore, un numero credibile e
   sbagliato. Qui si compila il contenuto e il conto torna.

   Si scrive su contenuto_confezione + um_confezione, che sono i campi che
   costo_prodotto_per_um() usa gia' quando il costo non e' a peso.
========================================================= */

function client() {
  return window.supabaseClient || window.supabase;
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function euro(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(2).replace(".", ",") + " €";
}

export async function render(app) {
  const supabase = client();
  const azienda = window.state?.azienda;

  if (!azienda?.id) {
    app.innerHTML = '<div style="padding:24px;">Nessuna azienda selezionata.</div>';
    return;
  }

  app.innerHTML = '<div style="padding:24px;color:#64748b;">Controllo in corso…</div>';

  const { data, error } = await supabase.rpc("prodotti_da_correggere", { p_azienda_id: azienda.id });

  if (error) {
    console.error("prodotti_da_correggere:", error);
    app.innerHTML = '<div style="padding:24px;color:#b42318;">Non riesco a leggere l\'elenco: '
      + esc(error.message) + '</div>';
    return;
  }

  const righe = data || [];

  if (!righe.length) {
    app.innerHTML = `
      <div style="padding:28px;max-width:760px;margin:0 auto;">
        <h2 style="margin:0 0 8px;font-size:20px;">Prodotti da correggere</h2>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;
          font-size:15px;color:#15803d;font-weight:600;">
          Nessun prodotto da sistemare: tutti i costi delle ricette sono calcolati su dati reali.
        </div>
      </div>`;
    return;
  }

  const opzioniUm = ["kg", "gr", "lt", "ml"];

  const cards = righe.map((r) => {
    const um = String(r.um_costo || "pz");
    return `
      <div class="pdc-card" data-id="${esc(r.prodotto_id)}">
        <div class="pdc-testa">
          <div>
            <div class="pdc-nome">${esc(r.prodotto)}</div>
            <div class="pdc-sotto">
              ${euro(r.costo_unitario)} a ${esc(um)} ·
              ${esc(r.ricette_coinvolte)} ${Number(r.ricette_coinvolte) === 1 ? "ricetta" : "ricette"} ·
              oggi conta ${euro(r.costo_sospetto)}
            </div>
          </div>
        </div>

        <div class="pdc-form">
          <label>Un ${esc(um)} contiene</label>
          <input class="pdc-qta" type="number" step="0.01" min="0" placeholder="es. 5" />
          <select class="pdc-um">
            ${opzioniUm.map((u) => `<option value="${u}">${u}</option>`).join("")}
          </select>
          <button type="button" class="pdc-salva">Salva</button>
        </div>

        <div class="pdc-esito"></div>
      </div>`;
  }).join("");

  app.innerHTML = `
    <div style="padding:24px;max-width:820px;margin:0 auto;">
      <h2 style="margin:0 0 6px;font-size:20px;">Prodotti da correggere</h2>
      <p style="margin:0 0 18px;font-size:14px;color:#64748b;line-height:1.55;">
        Questi prodotti si comprano a pezzo o a cassa ma nelle ricette si usano a peso.
        Finché non si sa quanto contiene un pezzo, il costo viene calcolato come se
        pesasse un chilo. Scrivi il contenuto e il costo si sistema da solo.
      </p>
      <div id="pdc-lista">${cards}</div>
    </div>

    <style>
      .pdc-card{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px;background:#fff;}
      .pdc-card.fatto{border-color:#bbf7d0;background:#f0fdf4;}
      .pdc-nome{font-size:15px;font-weight:700;color:#111827;}
      .pdc-sotto{font-size:12px;color:#64748b;margin-top:2px;}
      .pdc-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;}
      .pdc-form label{font-size:12px;font-weight:600;color:#475569;}
      .pdc-qta{width:110px;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;}
      .pdc-um{padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;}
      .pdc-salva{padding:8px 16px;background:#0E5A7A;color:#fff;border:none;border-radius:8px;
        font-size:13px;font-weight:700;cursor:pointer;}
      .pdc-salva:disabled{opacity:.5;cursor:default;}
      .pdc-esito{font-size:12px;margin-top:8px;}
    </style>`;

  // Gli handler si agganciano al contenitore, non ai singoli pulsanti: le schede
  // vengono riscritte dopo ogni salvataggio e i pulsanti smetterebbero di
  // rispondere in silenzio.
  const lista = app.querySelector("#pdc-lista");

  lista.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".pdc-salva");
    if (!btn) return;

    const card = btn.closest(".pdc-card");
    const id = card?.dataset?.id;
    const esito = card.querySelector(".pdc-esito");
    const qta = Number(String(card.querySelector(".pdc-qta").value || "").replace(",", "."));
    const um = card.querySelector(".pdc-um").value;

    if (!Number.isFinite(qta) || qta <= 0) {
      esito.style.color = "#b42318";
      esito.textContent = "Scrivi quanto contiene un pezzo.";
      return;
    }

    btn.disabled = true;
    esito.style.color = "#64748b";
    esito.textContent = "Salvataggio…";

    const { error: errUpd } = await supabase
      .from("prodotti")
      .update({ contenuto_confezione: qta, um_confezione: um })
      .eq("id", id)
      .eq("azienda_id", azienda.id);

    if (errUpd) {
      console.error("salvataggio contenuto:", errUpd);
      btn.disabled = false;
      esito.style.color = "#b42318";
      esito.textContent = "Non salvato: " + errUpd.message;
      return;
    }

    // Verifica sul database, non sulla speranza: si rilegge il costo appena
    // ricalcolato e lo si mostra.
    let nuovo = null;
    try {
      const { data: chk } = await supabase.rpc("costo_prodotto_per_um_check", {
        p_prodotto_id: Number(id),
        p_um: um === "kg" || um === "gr" ? "gr" : "ml"
      });
      nuovo = chk;
    } catch (e) { /* la verifica e' un di piu', il salvataggio e' andato */ }

    card.classList.add("fatto");
    esito.style.color = "#15803d";
    esito.textContent = nuovo != null
      ? "Salvato. Ora costa " + Number(nuovo).toFixed(4).replace(".", ",") + " € al "
        + (um === "kg" || um === "gr" ? "grammo" : "millilitro") + "."
      : "Salvato. Il costo delle ricette si aggiorna al prossimo ricalcolo.";
  });
}
