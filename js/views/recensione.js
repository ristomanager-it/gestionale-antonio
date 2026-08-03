// js/views/recensione.js
// Rotta PUBBLICA #/recensione?c=CODICE — nessun login.
// Il QR del collaboratore porta qui: la pagina smista su Google o TripAdvisor
// secondo quanto ha deciso la direzione, e firma il messaggio col nome di chi ha servito.

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;
  const qs = new URLSearchParams((window.location.hash || "").split("?")[1] || "");
  const codice = (qs.get("c") || qs.get("r") || "").trim();

  const guscio = (dentro) => `
    <style>
      .rc-page{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;
        --carta:#FBFAF7;--riga:#E4E0D8;--testo:#12232E;--muto:#6B7A83;
        background:var(--carta);color:var(--testo);min-height:100vh;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
      .rc-in{max-width:460px;margin:0 auto;padding:40px 22px 60px;text-align:center;}
      .rc-logo{max-width:130px;max-height:90px;margin-bottom:26px;}
      .rc-locale{font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--arancio);margin-bottom:18px;}
      .rc-page h1{font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:0 0 14px;}
      .rc-firma{font-size:19px;line-height:1.5;color:var(--navy);margin:0 0 12px;font-weight:600;}
      .rc-corpo{font-size:17px;line-height:1.6;color:#3D4C55;margin:0 0 30px;}
      .rc-btn{display:block;background:var(--navy);color:#fff;text-decoration:none;font-weight:700;
        font-size:18px;padding:18px;border-radius:14px;margin-bottom:12px;}
      .rc-btn.google{background:#1a73e8;}
      .rc-btn.trip{background:#00a680;}
      .rc-privato{display:inline-block;margin-top:18px;font-size:14.5px;color:var(--muto);text-decoration:underline;}
      .rc-grazie{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:28px 22px;}
      .rc-grazie h2{font-family:Georgia,serif;color:var(--navy);margin:0 0 10px;font-size:23px;}
      .rc-foot{margin-top:40px;font-size:12px;color:var(--muto);}
      .rc-errore{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:22px;font-size:16px;color:#3D4C55;}
    </style>
    <div class="rc-page"><div class="rc-in">${dentro}
      <div class="rc-foot">Ristoflow.AI</div>
    </div></div>`;

  if (!codice) {
    container.innerHTML = guscio(`<div class="rc-errore">Questo collegamento non è completo. Fatti inquadrare di nuovo il codice.</div>`);
    return;
  }

  let d = null;
  try {
    const { data } = await supabase.rpc("recensione_pagina", { p_codice: codice });
    d = data || null;
  } catch (e) { console.error(e); }

  if (!d || !d.ok) {
    container.innerHTML = guscio(`<div class="rc-errore">${esc((d && d.errore) || "Non riesco a caricare la pagina. Riprova tra poco.")}</div>`);
    return;
  }

  const logo = d.logo ? `<img class="rc-logo" src="${esc(d.logo)}" alt="${esc(d.locale)}">` : "";
  const firma = d.firma
    ? `<p class="rc-firma">Sono <b>${esc(d.firma)}</b>, vi ho servito io oggi.</p>` : "";

  const bottoni = d.piattaforma === "entrambe"
    ? `${d.url_google ? `<a class="rc-btn google" data-p="google" href="${esc(d.url_google)}" target="_blank" rel="noopener">Recensione su Google</a>` : ""}
       ${d.url_tripadvisor ? `<a class="rc-btn trip" data-p="tripadvisor" href="${esc(d.url_tripadvisor)}" target="_blank" rel="noopener">Recensione su TripAdvisor</a>` : ""}`
    : (d.url ? `<a class="rc-btn ${d.piattaforma === "google" ? "google" : "trip"}" data-p="${esc(d.piattaforma)}" href="${esc(d.url)}" target="_blank" rel="noopener">Lascia una recensione</a>` : "");

  const privato = d.feedback_privato && d.telefono_feedback
    ? `<a class="rc-privato" data-p="privato" href="https://wa.me/${String(d.telefono_feedback).replace(/\D/g, "")}?text=${encodeURIComponent("Ciao, vorrei dirvi una cosa sulla mia visita")}" target="_blank" rel="noopener">Preferisci scrivercelo direttamente?</a>`
    : "";

  container.innerHTML = guscio(`
    ${logo}
    <div class="rc-locale">${esc(d.locale)}${d.sede ? " · " + esc(d.sede) : ""}</div>
    <h1>${esc(d.titolo)}</h1>
    ${firma}
    <p class="rc-corpo">${esc(d.corpo)}</p>
    ${bottoni || `<div class="rc-errore">Le pagine recensioni non sono ancora configurate.</div>`}
    ${privato}
  `);

  container.querySelectorAll("a[data-p]").forEach(a => {
    a.addEventListener("click", () => {
      try { supabase.rpc("recensione_click", { p_codice: codice, p_piattaforma: a.dataset.p }); } catch (e) { /* non blocca */ }
      if (a.dataset.p !== "privato") {
        setTimeout(() => {
          const box = container.querySelector(".rc-in");
          if (box) box.innerHTML = `<div class="rc-grazie"><h2>Grazie davvero.</h2>
            <p style="font-size:16px;color:#3D4C55;line-height:1.6;margin:0;">Se la pagina non si è aperta, riprova dal pulsante: a volte serve fare l'accesso.</p></div>`;
        }, 1200);
      }
    });
  });
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
