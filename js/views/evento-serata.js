// js/views/evento-serata.js
// Rotta PUBBLICA #/evento-serata?r=CODICE — nessun login richiesto.
// Modulo di prenotazione per la serata di presentazione.
// Il parametro r= e' il codice del link tracciato (agente o campagna):
// serve per sapere chi porta chi e da dove arrivano le iscrizioni.

const EVENTO = "serata-23-settembre-2026";

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;

  const raw = window.location.hash || "";
  const qs = new URLSearchParams(raw.split("?")[1] || "");
  const codice = (qs.get("r") || qs.get("ref") || "").trim();
  const utm = {
    utm_source: qs.get("utm_source"),
    utm_medium: qs.get("utm_medium"),
    utm_campaign: qs.get("utm_campaign"),
  };

  let invito = null;
  if (codice && supabase) {
    try {
      const { data } = await supabase.rpc("evento_invito_info", { p_codice: codice });
      invito = data || null;
      supabase.rpc("evento_registra_click", { p_codice: codice }).then(() => {}).catch(() => {});
    } catch (e) { /* link non valido: si prosegue senza attribuzione */ }
  }

  const invitoDa = invito && invito.tipo === "agente"
    ? `<div class="ev-invito">Sei stato invitato da <b>${esc(invito.etichetta)}</b></div>` : "";

  container.innerHTML = `
    <style>
      .ev-wrap{max-width:620px;margin:0 auto;padding:26px 18px 70px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#12232e;}
      .ev-logo{display:flex;align-items:center;gap:10px;margin-bottom:24px;}
      .ev-logo img{height:38px;}
      .ev-logo span{font-weight:800;color:#023C59;}
      .ev-kicker{display:inline-block;background:#fff7ed;border:1.5px solid #fed7aa;color:#c2410c;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:6px 12px;border-radius:100px;margin-bottom:14px;}
      .ev-wrap h1{font-size:30px;line-height:1.14;margin:0 0 12px;}
      .ev-sub{font-size:16px;color:#5b6b73;line-height:1.6;margin-bottom:22px;}
      .ev-invito{background:#eff6ff;border:1.5px solid #bfdbfe;color:#1e40af;border-radius:12px;padding:12px 14px;font-size:14px;margin-bottom:20px;}
      .ev-info{background:#fff;border:1.5px solid #e5e7eb;border-radius:14px;padding:16px 18px;margin-bottom:26px;}
      .ev-info div{display:flex;gap:10px;padding:5px 0;font-size:15px;}
      .ev-blocco{margin-bottom:28px;}
      .ev-blocco h2{font-size:19px;margin:0 0 12px;}
      .ev-voce{display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;}
      .ev-voce .n{flex:0 0 28px;height:28px;border-radius:50%;background:#023C59;color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;}
      .ev-voce p{margin:0;font-size:15px;line-height:1.5;color:#5b6b73;}
      .ev-voce p b{display:block;color:#12232e;}
      .ev-nota{background:#f0fdf4;border:1.5px solid #bbf7d0;color:#15803d;border-radius:12px;padding:13px 16px;font-weight:600;font-size:14px;margin-bottom:26px;}
      .ev-form{background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:22px 20px;}
      .ev-form h2{font-size:19px;margin:0 0 4px;}
      .ev-form .intro{font-size:14px;color:#5b6b73;margin-bottom:16px;}
      .ev-form label{display:block;font-size:13px;font-weight:700;margin:13px 0 5px;}
      .ev-form input,.ev-form select,.ev-form textarea{width:100%;padding:11px 12px;border:1.5px solid #d1d5db;border-radius:10px;font-size:16px;font-family:inherit;background:#fff;box-sizing:border-box;}
      .ev-form input:focus,.ev-form select:focus,.ev-form textarea:focus{outline:none;border-color:#023C59;}
      .ev-due{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      @media(max-width:520px){.ev-due{grid-template-columns:1fr;}}
      .ev-form button{width:100%;margin-top:20px;background:#023C59;color:#fff;border:none;font-weight:700;font-size:16px;padding:15px;border-radius:12px;cursor:pointer;}
      .ev-form button:disabled{opacity:.6;}
      .ev-privacy{font-size:12px;color:#8a959b;margin-top:12px;text-align:center;line-height:1.5;}
      .ev-errore{display:none;background:#fef2f2;border:1.5px solid #fecaca;color:#b91c1c;border-radius:10px;padding:11px;font-size:14px;margin-top:12px;}
      .ev-ok{display:none;text-align:center;background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:30px 22px;}
      .ev-ok h2{color:#023C59;margin:0 0 10px;}
      .ev-ok p{font-size:15px;color:#5b6b73;line-height:1.7;margin:0;}
      .ev-foot{text-align:center;margin-top:34px;font-size:12px;color:#8a959b;}
    </style>

    <div class="ev-wrap">
      <div class="ev-logo"><img src="img/logo.png" alt="" onerror="this.style.display='none'"><span>Ristoflow.AI</span></div>

      <span class="ev-kicker">Su invito · posti limitati</span>
      <h1>Una sera tra ristoratori.<br>A cena, non in aula.</h1>
      <p class="ev-sub">Sono Antonio Carullo, gestisco Campo Antico Ricevimenti. Mi sono costruito il gestionale
      che cercavo e non trovavo. Mercoledì 23 settembre lo faccio vedere dal vivo, sui numeri veri del mio
      locale: apro l'app e ve la mostro mentre lavora.</p>

      ${invitoDa}

      <div class="ev-info">
        <div><span>📅</span><span><b>Mercoledì 23 settembre 2026</b>, dalle 19:30</span></div>
        <div><span>📍</span><span>Campo Antico Ricevimenti</span></div>
        <div><span>🍽️</span><span>Cena offerta — nessun costo di partecipazione</span></div>
        <div><span>⏱️</span><span>Si finisce entro le 23:30</span></div>
      </div>

      <div class="ev-blocco">
        <h2>Cosa vedrete, in concreto</h2>
        <div class="ev-voce"><span class="n">1</span><p><b>Il costo vero di un piatto</b>Aggiornato da solo a ogni fattura che arriva dai fornitori.</p></div>
        <div class="ev-voce"><span class="n">2</span><p><b>Una ricetta dettata a voce</b>Quaranta secondi, senza toccare un computer.</p></div>
        <div class="ev-voce"><span class="n">3</span><p><b>Un piatto inventato con gli avanzi</b>Gli dite cosa vi è rimasto in cella, vi propone come venderlo.</p></div>
        <div class="ev-voce"><span class="n">4</span><p><b>Personale e turni</b>Timbrature dal telefono e costo del lavoro per servizio.</p></div>
        <div class="ev-voce"><span class="n">5</span><p><b>Il vostro sito e le prenotazioni</b>Con i messaggi che partono da soli al cliente.</p></div>
        <div class="ev-voce"><span class="n">6</span><p><b>Marketing sui vostri numeri</b>Promozioni sul piatto che ha davvero margine, non su quello che viene bene in foto.</p></div>
      </div>

      <div class="ev-nota">Venite con chi decide insieme a voi: socio, moglie, marito, fratello. Si prenotano due coperti, non uno.</div>

      <form class="ev-form" id="ev-form" novalidate>
        <h2>Prenota il tuo posto</h2>
        <p class="intro">Vi ricontatto io per confermare. I posti a sedere sono limitati dalla capienza della sala.</p>

        <label for="ev-nome">Nome e cognome *</label>
        <input id="ev-nome" type="text" autocomplete="name">

        <label for="ev-locale">Nome del locale</label>
        <input id="ev-locale" type="text">

        <div class="ev-due">
          <div>
            <label for="ev-tipo">Che attività avete *</label>
            <select id="ev-tipo">
              <option value="">Scegli…</option>
              <option>ristorante</option><option>pizzeria</option><option>trattoria</option>
              <option>bar</option><option>catering</option><option>hotel</option>
              <option>fornitore</option><option>altro</option>
            </select>
          </div>
          <div>
            <label for="ev-citta">Città</label>
            <input id="ev-citta" type="text">
          </div>
        </div>

        <div class="ev-due">
          <div>
            <label for="ev-tel">Telefono (WhatsApp) *</label>
            <input id="ev-tel" type="tel" inputmode="tel" autocomplete="tel">
          </div>
          <div>
            <label for="ev-persone">In quanti venite *</label>
            <select id="ev-persone">
              <option value="1">1 persona</option>
              <option value="2" selected>2 persone</option>
              <option value="3">3 persone</option>
              <option value="4">4 persone</option>
            </select>
          </div>
        </div>

        <label for="ev-email">Email</label>
        <input id="ev-email" type="email" autocomplete="email">

        <label for="ev-note">Qualcosa che vorreste vedere quella sera</label>
        <textarea id="ev-note" rows="3" placeholder="Es: il food cost, i turni, le prenotazioni…"></textarea>

        <button type="submit" id="ev-invia">Prenota il posto</button>
        <div class="ev-errore" id="ev-errore"></div>
        <p class="ev-privacy">Usiamo i vostri dati solo per gestire la serata: conferma e promemoria.
        Nessuna newsletter, nessuna cessione a terzi.</p>
      </form>

      <div class="ev-ok" id="ev-ok">
        <h2>Ci siamo 🎉</h2>
        <p>Il posto è segnato. Vi arriva un messaggio di conferma e un promemoria nei giorni prima
        della serata. Se cambiano i programmi, basta rispondere a quel messaggio.<br><br>
        <b>Mercoledì 23 settembre, dalle 19:30 — Campo Antico Ricevimenti.</b></p>
      </div>

      <div class="ev-foot">Ristoflow.AI — Nato in cucina. Non in laboratorio.</div>
    </div>
  `;

  const form = document.getElementById("ev-form");
  const btn = document.getElementById("ev-invia");
  const box = document.getElementById("ev-errore");
  const errore = (m) => { box.textContent = m; box.style.display = "block"; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    box.style.display = "none";

    const d = {
      evento_slug: EVENTO,
      nome: val("ev-nome"),
      locale: val("ev-locale") || null,
      tipo_attivita: val("ev-tipo") || null,
      citta: val("ev-citta") || null,
      telefono: val("ev-tel"),
      email: val("ev-email") || null,
      persone: parseInt(val("ev-persone"), 10) || 1,
      note: val("ev-note") || null,
      fonte: "landing",
      invito_codice: codice || null,
      utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
    };

    if (!d.nome) return errore("Manca il nome.");
    if (!d.tipo_attivita) return errore("Dicci che tipo di attività avete.");
    if (d.telefono.replace(/\D/g, "").length < 8) return errore("Il numero di telefono non sembra completo.");

    btn.disabled = true; btn.textContent = "Un attimo…";
    const { error } = await supabase.from("evento_iscrizioni").insert(d);
    if (error) {
      console.error(error);
      btn.disabled = false; btn.textContent = "Prenota il posto";
      return errore("Non è andata. Riprova, oppure scrivici su WhatsApp al 333 948 7644.");
    }
    form.style.display = "none";
    document.getElementById("ev-ok").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function val(id) { return (document.getElementById(id).value || "").trim(); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
