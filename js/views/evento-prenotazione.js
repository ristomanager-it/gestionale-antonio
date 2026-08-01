// js/views/evento-prenotazione.js
// Rotta PUBBLICA #/evento-prenotazione?t=TOKEN — nessun login richiesto.
// La scheda della propria prenotazione: dettagli, come arrivare, calendario,
// modifica dei coperti e disdetta. Stessa logica di prenotazione.html del locale.

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;
  const qs = new URLSearchParams((window.location.hash || "").split("?")[1] || "");
  const token = (qs.get("t") || qs.get("token") || "").trim();

  const guscio = (dentro) => `
    <style>
      .pr-page{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;
        --carta:#FBFAF7;--riga:#E4E0D8;--testo:#12232E;--muto:#6B7A83;
        background:var(--carta);color:var(--testo);min-height:100vh;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
      .pr-in{max-width:560px;margin:0 auto;padding:30px 20px 70px;}
      .pr-marchio{text-align:center;margin-bottom:26px;}
      .pr-marchio img{width:130px;}
      .pr-esito{text-align:center;margin-bottom:26px;}
      .pr-esito .segno{width:56px;height:56px;border-radius:50%;background:#EAF5E3;color:#2F6B1E;
        display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 14px;}
      .pr-esito h1{font-family:Georgia,serif;font-size:27px;margin:0 0 8px;color:var(--navy);}
      .pr-esito p{margin:0;font-size:17px;color:#3D4C55;line-height:1.55;}
      .pr-card{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:20px;margin-bottom:16px;}
      .pr-card h2{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
        color:var(--muto);margin:0 0 14px;}
      .pr-riga{display:flex;gap:12px;padding:9px 0;font-size:17px;line-height:1.45;border-top:1px solid #F2EFE9;}
      .pr-riga:first-of-type{border-top:none;}
      .pr-riga i{font-style:normal;flex:0 0 24px;}
      .pr-riga b{font-weight:700;}
      .pr-btn{display:block;text-align:center;text-decoration:none;font-weight:700;font-size:16.5px;
        padding:15px;border-radius:12px;margin-top:10px;border:none;width:100%;cursor:pointer;}
      .pr-primario{background:var(--navy);color:#fff;}
      .pr-secondario{background:#fff;border:1.5px solid var(--riga);color:var(--navy);}
      .pr-rosso{background:#fff;border:1.5px solid #FECACA;color:#B91C1C;}
      .pr-mini{font-size:13.5px;color:var(--muto);text-align:center;margin-top:14px;line-height:1.55;}
      .pr-form label{display:block;font-size:13px;font-weight:700;margin:12px 0 5px;}
      .pr-form select,.pr-form textarea{width:100%;padding:12px;border:1.5px solid #D9D5CD;border-radius:10px;
        font-size:16px;font-family:inherit;box-sizing:border-box;background:#fff;}
      .pr-avviso{border-radius:10px;padding:12px 14px;font-size:15px;margin-top:12px;display:none;}
      .pr-avviso.ok{background:#F3F8EF;border:1px solid #CFE4C2;color:#2F6B1E;display:block;}
      .pr-avviso.ko{background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;display:block;}
      .pr-annullata{background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;border-radius:12px;
        padding:14px 16px;font-size:16px;margin-bottom:16px;}
      .pr-foot{text-align:center;margin-top:36px;font-size:12.5px;color:var(--muto);line-height:1.9;}
    </style>
    <div class="pr-page"><div class="pr-in">
      <div class="pr-marchio"><img src="assets/ristoflow-logo.png" alt="Ristoflow.AI"></div>
      ${dentro}
      <div class="pr-foot">Ristoflow.AI — Nato in cucina. Non in laboratorio.</div>
    </div></div>`;

  if (!token) {
    container.innerHTML = guscio(`<div class="pr-card"><p style="margin:0;font-size:16px;">
      Questo link non è valido. Se hai prenotato, apri il collegamento che ti è arrivato via messaggio.</p></div>`);
    return;
  }

  let d = null;
  try {
    const { data } = await supabase.rpc("evento_prenotazione_info", { p_token: token });
    d = data || null;
  } catch (e) { console.error(e); }

  if (!d) {
    container.innerHTML = guscio(`<div class="pr-card"><p style="margin:0;font-size:16px;">
      Non trovo questa prenotazione. Può darsi che il link sia incompleto:
      riprova dal messaggio che hai ricevuto, oppure scrivici su WhatsApp.</p></div>`);
    return;
  }

  const ev = d.evento || {};
  const dt = ev.data_ora ? new Date(ev.data_ora) : null;
  const giorno = dt ? dt.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const ora = dt ? dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";
  const annullata = d.stato === "annullato";
  const maps = "https://maps.google.com/?q=" + encodeURIComponent(ev.maps_query || ev.luogo || "");
  const tel = (ev.telefono || "").replace(/\D/g, "");

  const gcal = dt ? ("https://www.google.com/calendar/render?action=TEMPLATE"
    + "&text=" + encodeURIComponent(ev.titolo || "Serata Ristoflow")
    + "&dates=" + fmtCal(dt) + "/" + fmtCal(new Date(dt.getTime() + 4 * 3600000))
    + "&location=" + encodeURIComponent(ev.luogo || "")
    + "&details=" + encodeURIComponent("Prenotazione a nome di " + d.nome)) : "#";

  container.innerHTML = guscio(`
    ${annullata ? `<div class="pr-annullata">Questa prenotazione è stata annullata. Se hai cambiato idea, scrivici: il posto lo rimettiamo.</div>` : `
    <div class="pr-esito">
      <div class="segno">✓</div>
      <h1>Tavolo prenotato</h1>
      <p>A nome di <b>${esc(d.nome)}</b>${d.locale ? " · " + esc(d.locale) : ""}</p>
    </div>`}

    <div class="pr-card">
      <h2>La serata</h2>
      <div class="pr-riga"><i>📅</i><div><b>${cap(giorno)}</b><br>dalle ${ora}</div></div>
      <div class="pr-riga"><i>📍</i><div>${esc(ev.luogo || "")}${ev.indirizzo ? "<br>" + esc(ev.indirizzo) : ""}</div></div>
      <div class="pr-riga"><i>👥</i><div><b>${d.persone}</b> ${d.persone === 1 ? "coperto" : "coperti"}</div></div>
      ${d.note ? `<div class="pr-riga"><i>📝</i><div>${esc(d.note)}</div></div>` : ""}
      <a class="pr-btn pr-primario" href="${maps}" target="_blank" rel="noopener">🗺️ Apri in Google Maps</a>
      <a class="pr-btn pr-secondario" href="${gcal}" target="_blank" rel="noopener">📆 Aggiungi al calendario</a>
    </div>

    ${annullata ? "" : `
    <div class="pr-card pr-form">
      <h2>Cambiare qualcosa</h2>
      <label for="pr-persone">Coperti</label>
      <select id="pr-persone">
        ${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${n === d.persone ? " selected" : ""}>${n} ${n === 1 ? "coperto" : "coperti"}</option>`).join("")}
      </select>
      <label for="pr-note">Intolleranze o richieste</label>
      <textarea id="pr-note" rows="2">${esc(d.note || "")}</textarea>
      <button class="pr-btn pr-primario" id="pr-salva">Salva le modifiche</button>
      <div class="pr-avviso" id="pr-avviso"></div>
      <button class="pr-btn pr-rosso" id="pr-annulla">Non posso venire</button>
      <p class="pr-mini">Se disdici liberi il posto per qualcun altro: è la cosa più utile che puoi fare.</p>
    </div>`}

    <div class="pr-card">
      <h2>Serve qualcosa</h2>
      <p style="margin:0 0 4px;font-size:16px;line-height:1.55;">Scrivimi direttamente, rispondo io.</p>
      <a class="pr-btn pr-secondario" href="https://wa.me/${tel}" target="_blank" rel="noopener">💬 Scrivi su WhatsApp</a>
    </div>
  `);

  const avviso = document.getElementById("pr-avviso");
  const mostra = (t, ok) => { avviso.textContent = t; avviso.className = "pr-avviso " + (ok ? "ok" : "ko"); };

  const btnSalva = document.getElementById("pr-salva");
  if (btnSalva) btnSalva.addEventListener("click", async () => {
    btnSalva.disabled = true; btnSalva.textContent = "Salvo…";
    const { data, error } = await supabase.rpc("evento_prenotazione_modifica", {
      p_token: token,
      p_persone: parseInt(document.getElementById("pr-persone").value, 10),
      p_note: document.getElementById("pr-note").value.trim() || null,
    });
    btnSalva.disabled = false; btnSalva.textContent = "Salva le modifiche";
    if (error || !data || !data.ok) return mostra((data && data.errore) || "Non è andata, riprova.", false);
    mostra("Modifica salvata.", true);
  });

  const btnAnnulla = document.getElementById("pr-annulla");
  if (btnAnnulla) btnAnnulla.addEventListener("click", async () => {
    if (!confirm("Vuoi disdire la prenotazione?")) return;
    const { data, error } = await supabase.rpc("evento_prenotazione_annulla", { p_token: token });
    if (error || !data || !data.ok) return mostra("Non è andata, riprova o scrivici.", false);
    render(container);
  });
}

function fmtCal(d) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
