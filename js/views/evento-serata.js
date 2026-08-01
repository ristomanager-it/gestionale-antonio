// js/views/evento-serata.js
// Rotta PUBBLICA #/evento-serata?r=CODICE — nessun login richiesto.
// Pagina unica: invito (perche' / come / cosa) + modulo di prenotazione.
// Il parametro r= e' il codice del link tracciato (agente o campagna).

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
    } catch (e) { /* codice non valido: si prosegue senza attribuzione */ }
  }
  const daParte = invito && invito.tipo === "agente"
    ? `<p class="ev-daparte">Invito consegnato da <b>${esc(invito.etichetta)}</b></p>` : "";

  container.innerHTML = `
    <style>
      .ev-page{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;--azzurro:#02ABE3;
        --carta:#FBFAF7;--riga:#E4E0D8;--testo:#12232E;--muto:#6B7A83;
        background:var(--carta);color:var(--testo);min-height:100vh;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
      .ev-in{max-width:660px;margin:0 auto;padding:34px 22px 80px;}

      .ev-marchio{text-align:center;margin-bottom:34px;}
      .ev-marchio img{width:150px;height:auto;display:inline-block;}

      .ev-testata{text-align:center;padding-bottom:34px;border-bottom:1px solid var(--riga);margin-bottom:38px;}
      .ev-occhiello{font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--arancio);margin-bottom:18px;}
      .ev-page h1{font-family:Georgia,"Times New Roman",serif;font-weight:700;
        font-size:clamp(29px,6.2vw,44px);line-height:1.17;letter-spacing:-.01em;margin:0 0 14px;}
      .ev-page h1 span{display:block;color:var(--navy);}
      .ev-data{font-size:15px;color:var(--muto);letter-spacing:.02em;}
      .ev-daparte{margin:16px 0 0;font-size:13.5px;color:var(--navy);background:#EEF5F9;
        border:1px solid #D3E4EE;border-radius:100px;padding:8px 16px;display:inline-block;}

      .ev-firma{font-size:16.5px;line-height:1.7;margin:0 0 44px;}
      .ev-firma .nome{display:block;margin-top:16px;font-family:Georgia,serif;font-style:italic;color:var(--navy);font-size:17px;}

      .ev-passo{margin-bottom:40px;padding-left:20px;border-left:3px solid var(--riga);}
      .ev-passo.p1{border-color:var(--arancio);}
      .ev-passo.p2{border-color:var(--verde);}
      .ev-passo.p3{border-color:var(--azzurro);}
      .ev-passo .et{font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--muto);margin-bottom:9px;}
      .ev-passo h2{font-family:Georgia,serif;font-size:clamp(20px,3.7vw,26px);line-height:1.3;margin:0 0 12px;color:var(--navy);}
      .ev-passo p{font-size:16px;line-height:1.68;color:#3D4C55;margin:0;}
      .ev-passo p + p{margin-top:11px;}

      .ev-elenco{margin-top:16px;}
      .ev-el{display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--riga);}
      .ev-el:last-child{border-bottom:1px solid var(--riga);}
      .ev-el i{font-style:normal;color:var(--azzurro);font-weight:800;}
      .ev-el div{font-size:15.5px;line-height:1.5;}
      .ev-el small{display:block;color:var(--muto);font-size:13.5px;margin-top:4px;line-height:1.5;}

      .ev-ultima{background:var(--navy);color:#fff;border-radius:16px;padding:26px 24px;margin:44px 0;}
      .ev-ultima p{font-size:17px;line-height:1.6;margin:0;}
      .ev-ultima p + p{margin-top:11px;font-size:15px;color:#CFE0E8;}
      .ev-ultima .amb{color:var(--ambra);font-weight:700;}

      .ev-pratico{border-top:1px solid var(--riga);border-bottom:1px solid var(--riga);padding:22px 0;margin-bottom:40px;}
      .ev-pratico div{display:flex;gap:12px;padding:7px 0;font-size:15.5px;line-height:1.5;}
      .ev-pratico div span:first-child{width:22px;flex:0 0 22px;}

      .ev-form{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:24px 22px;}
      .ev-form h2{font-family:Georgia,serif;font-size:21px;margin:0 0 5px;color:var(--navy);}
      .ev-form .intro{font-size:14px;color:var(--muto);margin-bottom:16px;line-height:1.55;}
      .ev-form label{display:block;font-size:12.5px;font-weight:700;margin:14px 0 5px;letter-spacing:.02em;}
      .ev-form input,.ev-form select,.ev-form textarea{width:100%;padding:12px;border:1.5px solid #D9D5CD;
        border-radius:10px;font-size:16px;font-family:inherit;background:#fff;color:var(--testo);box-sizing:border-box;}
      .ev-form input:focus,.ev-form select:focus,.ev-form textarea:focus{outline:none;border-color:var(--navy);}
      .ev-due{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      @media(max-width:520px){.ev-due{grid-template-columns:1fr;}}
      .ev-form button{width:100%;margin-top:22px;background:var(--navy);color:#fff;border:none;font-weight:700;
        font-size:16.5px;padding:16px;border-radius:12px;cursor:pointer;letter-spacing:.01em;}
      .ev-form button:disabled{opacity:.55;}
      .ev-privacy{font-size:12px;color:var(--muto);margin-top:13px;text-align:center;line-height:1.55;}
      .ev-errore{display:none;background:#FEF2F2;border:1.5px solid #FECACA;color:#B91C1C;border-radius:10px;padding:11px;font-size:14px;margin-top:12px;}
      .ev-ok{display:none;background:#fff;border:1px solid var(--riga);border-radius:16px;padding:34px 24px;text-align:center;}
      .ev-ok h2{font-family:Georgia,serif;color:var(--navy);margin:0 0 12px;font-size:24px;}
      .ev-ok p{font-size:15.5px;color:#3D4C55;line-height:1.7;margin:0;}
      .ev-foot{text-align:center;margin-top:46px;font-size:12.5px;color:var(--muto);line-height:1.9;}
      .ev-sub{display:inline-block;margin-top:6px;font-size:14.5px;font-weight:700;color:var(--navy);
        text-decoration:none;border-bottom:2px solid var(--ambra);padding-bottom:2px;}
      .ev-barra{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(251,250,247,.97);
        border-top:1px solid var(--riga);padding:10px 16px;display:none;
        align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -6px 20px rgba(0,0,0,.06);}
      .ev-barra.on{display:flex;}
      .ev-barra span{font-size:13px;color:var(--muto);line-height:1.35;}
      .ev-barra b{display:block;color:var(--testo);font-size:14px;}
      .ev-barra a{background:var(--navy);color:#fff;text-decoration:none;font-weight:700;font-size:14.5px;
        padding:11px 20px;border-radius:100px;white-space:nowrap;}
      .ev-page{padding-bottom:0;}
    </style>

    <div class="ev-page"><div class="ev-in">

      <div class="ev-marchio"><img src="assets/ristoflow-logo.png" alt="Ristoflow.AI"></div>

      <div class="ev-testata">
        <div class="ev-occhiello">Invito · Campo Antico Ricevimenti</div>
        <h1>Nessuno chiude perché cucina male.<span>Si chiude perché si scopre tutto tardi.</span></h1>
        <div class="ev-data">Mercoledì 23 settembre 2026 · dalle 19:30</div>
        ${daParte}
      </div>

      <p class="ev-firma">
        Faccio il ristoratore. Trattoria, centro cottura e catering, tutti i giorni, da anni.<br><br>
        Il 23 settembre vi aspetto a tavola da me per raccontarvi <b>come ho smesso di scoprire le cose
        quando ormai erano successe</b>, e per mostrarvi lo strumento che nel frattempo è nato dentro
        le mie cucine.
        <span class="nome">Antonio Carullo — Campo Antico Ricevimenti</span>
      </p>

      <p style="margin:-30px 0 44px;"><a href="#/evento-serata" class="ev-sub" id="ev-vai">Tengo il posto ↓</a></p>

      <div class="ev-passo p1">
        <div class="et">Perché</div>
        <h2>Nel nostro mestiere si decide a sensazione</h2>
        <p>Quanto ordinare. Quanto far pagare un piatto. Quando serve una persona in più il sabato.
        Decidiamo a naso, e a naso a volte va bene.</p>
        <p>Poi arriva il commercialista, tre mesi dopo, e ci dice com'è andata: quando non possiamo
        più farci niente. Ci ho messo anni a capire che non ero disorganizzato — mi mancavano
        i numeri nel momento esatto in cui servivano.</p>
      </div>

      <div class="ev-passo p2">
        <div class="et">Come</div>
        <h2>Senza aggiungere lavoro a nessuno</h2>
        <p>Non un altro programma da imparare, con il corso e il consulente. Ma fare in modo che
        tutto quello che già succede nel locale lasci un numero da solo: una consegna che arriva,
        un turno che finisce, un tavolo che si siede, un cliente che torna.</p>
        <p>Nessuno si mette la sera a inserire dati. Se il vostro personale sa usare WhatsApp,
        ha già tutte le competenze che servono.</p>
      </div>

      <div class="ev-passo p3">
        <div class="et">Cosa</div>
        <h2>Quello che ci si guadagna: sapere prima</h2>
        <div class="ev-elenco">
          <div class="ev-el"><i>①</i><div>Quanto rende davvero un piatto, <b>mentre lo state vendendo</b>
            <small>Non a fine mese: nel momento in cui decidete se tenerlo in carta.</small></div></div>
          <div class="ev-el"><i>②</i><div>Quanto costa un servizio, tra <b>merce e persone</b>
            <small>Sabato sera vi è convenuto? La risposta esiste, e non è una sensazione.</small></div></div>
          <div class="ev-el"><i>③</i><div>Chi torna da voi e <b>chi non si vede da sei mesi</b>
            <small>Con nome e numero. Riportarlo dentro costa molto meno che trovarne uno nuovo.</small></div></div>
        </div>
      </div>

      <div class="ev-ultima">
        <p>Quella sera non vi faccio vedere una presentazione: <span class="amb">apro il mio locale</span>
        davanti a voi, con i numeri di quella giornata.</p>
        <p>E alla fine c'è un'ultima cosa, che qui non scrivo. È il motivo per cui ho smesso di
        chiamarlo "un gestionale".</p>
      </div>

      <div class="ev-pratico">
        <div><span>📅</span><span>Mercoledì 23 settembre 2026, dalle 19:30 · si finisce entro le 23:30</span></div>
        <div><span>📍</span><span>Campo Antico Ricevimenti</span></div>
        <div><span>🍽️</span><span>Si parla a tavola: siete miei ospiti, a casa mia</span></div>
        <div><span>👥</span><span>Venite in due: portate chi decide insieme a voi</span></div>
      </div>

      <form class="ev-form" id="ev-form" novalidate>
        <h2>Tengo il posto</h2>
        <p class="intro">Vi ricontatto io per confermare. I posti sono quelli che entrano in sala.</p>

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

        <label for="ev-note">C'è qualcosa che vorreste vedere quella sera?</label>
        <textarea id="ev-note" rows="3" placeholder="Es: i costi dei piatti, i turni, le prenotazioni…"></textarea>

        <button type="submit" id="ev-invia">Tieni il mio posto</button>
        <div class="ev-errore" id="ev-errore"></div>
        <p class="ev-privacy">Usiamo i vostri dati solo per la serata: conferma e promemoria.
        Nessuna newsletter, nessuna cessione a terzi.</p>
      </form>

      <div class="ev-ok" id="ev-ok">
        <h2>Ci vediamo il 23</h2>
        <p>Il posto è segnato. Vi arriva un messaggio di conferma e un promemoria nei giorni prima.
        Se cambiano i programmi, basta rispondere a quel messaggio.<br><br>
        <b>Mercoledì 23 settembre, dalle 19:30 — Campo Antico Ricevimenti.</b></p>
      </div>

      <div class="ev-foot">Ristoflow.AI — Nato in cucina. Non in laboratorio.</div>

      <div class="ev-barra" id="ev-barra">
        <span><b>Mercoledì 23 settembre</b>Campo Antico, dalle 19:30</span>
        <a href="#/evento-serata" id="ev-vai2">Tengo il posto</a>
      </div>

    </div></div>
  `;

  const vaiAlModulo = (e) => {
    if (e) e.preventDefault();
    const f = document.getElementById("ev-form");
    if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  ["ev-vai", "ev-vai2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", vaiAlModulo);
  });

  const barra = document.getElementById("ev-barra");
  const modulo = document.getElementById("ev-form");
  const aggiornaBarra = () => {
    if (!barra || !modulo) return;
    const y = window.scrollY || 0;
    const moduloVisibile = modulo.getBoundingClientRect().top < window.innerHeight - 80;
    const inviato = modulo.style.display === "none";
    barra.classList.toggle("on", y > 320 && !moduloVisibile && !inviato);
  };
  window.addEventListener("scroll", aggiornaBarra, { passive: true });
  aggiornaBarra();

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
      btn.disabled = false; btn.textContent = "Tieni il mio posto";
      return errore("Non è andata. Riprova, oppure scrivici su WhatsApp al 333 948 7644.");
    }
    form.style.display = "none";
    if (barra) barra.classList.remove("on");
    document.getElementById("ev-ok").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function val(id) { return (document.getElementById(id).value || "").trim(); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
