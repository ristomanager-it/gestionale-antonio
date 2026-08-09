// js/views/preventivo-pagamento.js
// Rotta PUBBLICA #/pagamento?t=TOKEN — nessun login.
// Ci arriva il cliente dopo aver confermato la proposta: o versa con carta,
// o ha già fatto il bonifico e carica la contabile.
// L'importo è l'acconto del preventivo; se la casella è vuota si usa la
// percentuale di default di preventivi_config (acconto_perc_default).

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;
  const qs = new URLSearchParams((window.location.hash || "").split("?")[1] || "");
  const token = (qs.get("t") || "").trim();

  const guscio = (dentro) => `
    <style>
      .pg{--navy:#023C59;--arancio:#E66101;--carta:#FBFAF7;--riga:#E4E0D8;--testo:#12232E;--muto:#6B7A83;
          background:#DFE3E7;min-height:100vh;padding:20px 10px 60px;color:var(--testo);
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;}
      .pg-foglio{max-width:560px;margin:0 auto;background:var(--carta);border-radius:8px;
        box-shadow:0 12px 40px rgba(0,0,0,.14);overflow:hidden;}
      .pg-testa{background:linear-gradient(160deg,#023C59,#7FA3B8);color:#fff;padding:26px 26px 22px;text-align:center;}
      .pg-testa .oc{font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.85;font-weight:700;}
      .pg-testa h1{font-family:Georgia,serif;font-size:25px;margin:8px 0 4px;font-weight:normal;}
      .pg-testa .sotto{font-size:14.5px;opacity:.9;}
      .pg-importo{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:18px;text-align:center;margin:22px 26px 0;}
      .pg-importo .et{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--muto);}
      .pg-importo b{display:block;font-family:Georgia,serif;font-size:34px;margin-top:5px;}
      .pg-importo .nota{font-size:12.5px;color:var(--muto);margin-top:6px;line-height:1.45;}
      .pg-corpo{padding:22px 26px 26px;}
      .pg h2{font-family:Georgia,serif;font-size:18px;color:var(--navy);margin:22px 0 10px;font-weight:normal;}
      .pg-card{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:16px 18px;}
      .pg-btn{display:block;width:100%;background:var(--navy);color:#fff;border:none;border-radius:11px;
        padding:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center;text-decoration:none;}
      .pg-btn.chiaro{background:#fff;color:var(--navy);border:1.5px solid var(--riga);}
      .pg-btn[disabled]{opacity:.6;}
      .pg-oppure{text-align:center;font-size:13px;color:var(--muto);margin:18px 0 10px;}
      .pg-riga{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #F1EEE8;flex-wrap:wrap;}
      .pg-riga:first-of-type{border-top:none;}
      .pg-riga .et{width:96px;font-size:11.5px;color:var(--muto);text-transform:uppercase;letter-spacing:.07em;}
      .pg-riga .val{flex:1;min-width:150px;font-size:15px;}
      .pg-riga .val.mono{font-family:ui-monospace,Menlo,monospace;font-size:14.5px;}
      .pg-copia{background:#fff;border:1.5px solid var(--riga);border-radius:8px;padding:7px 12px;
        font-size:12.5px;font-weight:700;color:var(--navy);cursor:pointer;font-family:inherit;}
      .pg-carica{border:1.5px dashed #CBD5DB;border-radius:12px;padding:16px;text-align:center;margin-top:14px;}
      .pg-carica p{font-size:13.5px;color:var(--muto);line-height:1.5;margin:6px 0 12px;}
      .pg-avviso{border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.5;margin-top:12px;}
      .pg-avviso.ok{background:#F1F8ED;border:1px solid #CFE4C2;color:#2F6B24;}
      .pg-avviso.attesa{background:#FFF7ED;border:1px solid #FED7AA;color:#9A3412;}
      .pg-nota{font-size:12.5px;color:var(--muto);line-height:1.6;margin-top:16px;}
      .pg-pie{background:#fff;border-top:1px solid var(--riga);padding:14px;text-align:center;font-size:12px;color:var(--muto);}
      .pg-errore{max-width:520px;margin:60px auto;background:#fff;border-radius:14px;padding:26px;text-align:center;font-size:16px;color:#3D4C55;}
      .pg-torna{display:block;text-align:center;font-size:13.5px;color:var(--navy);margin-top:18px;}
    </style>
    <div class="pg">${dentro}</div>`;

  if (!token) {
    container.innerHTML = guscio(`<div class="pg-errore">Questo collegamento non è completo.</div>`);
    return;
  }

  let pag = null;
  try {
    const { data } = await supabase.rpc("preventivo_pagamento", { p_token: token });
    pag = data;
  } catch (e) { console.error(e); }

  if (!pag || pag.ok === false) {
    container.innerHTML = guscio(`<div class="pg-errore">
      Per questa proposta non è ancora stato impostato il pagamento.<br>
      Scriveteci e vi diciamo subito come fare.
      <a class="pg-torna" href="#/preventivo?t=${encodeURIComponent(token)}">← Torna alla proposta</a>
    </div>`);
    return;
  }

  if (pag.gia_versato) {
    container.innerHTML = guscio(`<div class="pg-errore">
      ✅ L'acconto risulta già versato. Grazie!
      <a class="pg-torna" href="#/preventivo?t=${encodeURIComponent(token)}">← Torna alla proposta</a>
    </div>`);
    return;
  }

  container.innerHTML = guscio(`
    <div class="pg-foglio">
      <div class="pg-testa">
        <div class="oc">Acconto</div>
        <h1>${esc(pag.cliente || pag.evento || "Il vostro evento")}</h1>
        <div class="sotto">${esc(pag.evento || "")}</div>
      </div>

      <div class="pg-importo">
        <div class="et">Da versare ora</div>
        <b>${euro(pag.importo)}</b>
        ${pag.importo_da_default
          ? `<div class="nota">Acconto sul totale di ${euro(pag.totale)}. Se avete concordato una cifra diversa, scrivetecelo.</div>`
          : ""}
      </div>

      <div class="pg-corpo">
        ${pag.testo ? `<p style="font-size:14.5px;line-height:1.6;color:#3D4C55;">${esc(pag.testo)}</p>` : ""}

        ${pag.in_verifica ? `
          <div class="pg-avviso attesa">Abbiamo già ricevuto un vostro versamento: lo stiamo controllando.
          Se avete pagato due volte avvisateci.</div>` : ""}

        ${pag.stripe || pag.link ? `
          <h2>Pago adesso con carta</h2>
          ${pag.stripe
            ? `<button class="pg-btn" id="pg-carta">💳 Paga ${euro(pag.importo)} con carta</button>
               <div class="pg-nota">Pagamento sicuro con Stripe: i dati della carta non passano da noi.</div>`
            : `<a class="pg-btn" href="${esc(pag.link)}" target="_blank" rel="noopener">💳 Paga con carta</a>`}
          <div class="pg-oppure">— oppure —</div>` : ""}

        <h2>Faccio (o ho già fatto) il bonifico</h2>
        <div class="pg-card">
          ${pag.iban ? `
            <div class="pg-riga"><div class="et">Intestatario</div><div class="val">${esc(pag.intestatario || "")}</div></div>
            <div class="pg-riga"><div class="et">IBAN</div><div class="val mono">${esc(pag.iban)}</div>
              <button class="pg-copia" data-copia="${esc(pag.iban)}">Copia</button></div>
            ${pag.banca ? `<div class="pg-riga"><div class="et">Banca</div><div class="val">${esc(pag.banca)}</div></div>` : ""}
            <div class="pg-riga"><div class="et">Causale</div><div class="val">${esc(pag.causale)}</div>
              <button class="pg-copia" data-copia="${esc(pag.causale)}">Copia</button></div>
            <div class="pg-riga"><div class="et">Importo</div><div class="val"><b>${euro(pag.importo)}</b></div></div>
          ` : `<div class="pg-nota">Chiedeteci l'IBAN e ve lo mandiamo subito.</div>`}

          <div class="pg-carica">
            <b>Avete già bonificato?</b>
            <p>Caricate qui la contabile (foto o PDF): appena la controlliamo la data resta vostra.</p>
            <input id="pg-file" type="file" accept="image/*,application/pdf" style="display:none;">
            <button class="pg-btn chiaro" id="pg-scegli">📎 Carico la contabile</button>
            <div id="pg-esito"></div>
          </div>
        </div>

        <a class="pg-torna" href="#/preventivo?t=${encodeURIComponent(token)}">← Torna alla proposta</a>
      </div>

      <div class="pg-pie">Il pagamento risulta incassato solo dopo il nostro controllo.</div>
    </div>
  `);

  /* ── carta ──────────────────────────────────────────────────────────── */
  document.getElementById("pg-carta")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = "Un attimo…";
    try {
      const res = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_session",
          azienda_id: pag.azienda_id,
          tipo: "preventivo",
          riferimento_id: pag.preventivo_id,
          importo_centesimi: Math.round(Number(pag.importo || 0) * 100),
          descrizione: pag.causale,
          cliente_nome: pag.cliente || "",
          metadata: { token },
        }),
      });
      const r = await res.json();
      if (r?.checkout_url) {
        await supabase.rpc("preventivo_pagamento_registra", {
          p_token: token, p_metodo: "carta", p_importo: Number(pag.importo || 0),
          p_url: null, p_nota: "Checkout carta avviato",
        });
        window.location.href = r.checkout_url;
        return;
      }
      alert("Il pagamento con carta non è disponibile in questo momento: potete usare il bonifico.");
    } catch (err) {
      alert("Il pagamento con carta non è disponibile in questo momento: potete usare il bonifico.");
    }
    b.disabled = false; b.textContent = "💳 Paga " + euro(pag.importo) + " con carta";
  });

  /* ── contabile del bonifico ─────────────────────────────────────────── */
  const inp = document.getElementById("pg-file");
  document.getElementById("pg-scegli")?.addEventListener("click", () => inp?.click());

  inp?.addEventListener("change", async (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    const esito = document.getElementById("pg-esito");
    esito.innerHTML = `<div class="pg-avviso attesa">Caricamento…</div>`;
    try {
      const path = `contabili/${token}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
      const { data } = await supabase.rpc("preventivo_pagamento_registra", {
        p_token: token, p_metodo: "bonifico", p_importo: Number(pag.importo || 0),
        p_url: pub.publicUrl, p_nota: f.name,
      });
      esito.innerHTML = data?.ok
        ? `<div class="pg-avviso ok">Ricevuta, grazie. La controlliamo e vi confermiamo la data.</div>`
        : `<div class="pg-avviso attesa">${esc(data?.errore || "Non è andata, riprovate.")}</div>`;
    } catch (err) {
      console.error(err);
      esito.innerHTML = `<div class="pg-avviso attesa">Non è andata. Riprovate o mandatecela su WhatsApp.</div>`;
    }
    inp.value = "";
  });

  container.querySelectorAll("[data-copia]").forEach((b) => {
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copia);
        const t = b.textContent; b.textContent = "Copiato";
        setTimeout(() => { b.textContent = t; }, 1800);
      } catch { prompt("Copiate questo:", b.dataset.copia); }
    });
  });
}

/* ── utilità ──────────────────────────────────────────────────────────── */
function euro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
