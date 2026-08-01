// js/views/evento-serata.js
// Rotta PUBBLICA #/evento-serata?r=CODICE — nessun login richiesto.
// Prenotazione vera (capienza e posti liberi in tempo reale), non un modulo contatti.
// Struttura: cosa succede quella sera -> prenota -> perche' -> cosa ci si porta a casa.

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

  let invito = null, disp = null;
  try {
    const [i, d] = await Promise.all([
      codice ? supabase.rpc("evento_invito_info", { p_codice: codice }) : Promise.resolve({ data: null }),
      supabase.rpc("evento_disponibilita", { p_slug: EVENTO }),
    ]);
    invito = i.data || null;
    disp = d.data || null;
    if (codice) supabase.rpc("evento_registra_click", { p_codice: codice }).then(() => {}).catch(() => {});
  } catch (e) { /* si prosegue comunque */ }

  const liberi = disp ? Number(disp.liberi) : null;
  const capienza = disp ? Number(disp.capienza) : 60;
  const SOGLIA = 20;                       // sotto questa soglia il numero lavora a favore
  const pochi = liberi !== null && liberi > 0 && liberi <= SOGLIA;
  const chiuso = disp ? !!disp.chiuso : false;
  const daParte = invito && invito.tipo === "agente"
    ? `<p class="ev-daparte">Invito consegnato da <b>${esc(invito.etichetta)}</b></p>` : "";

  container.innerHTML = `
    <style>
      .ev-page{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;--azzurro:#02ABE3;
        --carta:#FBFAF7;--riga:#E4E0D8;--testo:#12232E;--muto:#6B7A83;
        background:var(--carta);color:var(--testo);min-height:100vh;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
      .ev-in{max-width:640px;margin:0 auto;padding:30px 20px 90px;}

      .ev-marchio{text-align:center;margin-bottom:32px;}
      .ev-marchio img{width:148px;height:auto;}

      .ev-occhiello{text-align:center;font-size:12.5px;font-weight:800;letter-spacing:.22em;
        text-transform:uppercase;color:var(--arancio);margin-bottom:18px;}
      .ev-page h1{font-family:Georgia,"Times New Roman",serif;font-weight:700;text-align:center;
        font-size:clamp(34px,8vw,48px);line-height:1.12;letter-spacing:-.01em;margin:0 0 16px;}
      .ev-page h1 span{display:block;color:var(--navy);}
      .ev-occhiofine{text-align:center;font-size:19px;line-height:1.55;color:#3D4C55;max-width:520px;margin:0 auto 10px;}
      .ev-daparte{text-align:center;margin:16px auto 0;font-size:13.5px;color:var(--navy);background:#EEF5F9;
        border:1px solid #D3E4EE;border-radius:100px;padding:8px 16px;display:table;}

      .ev-sera{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:8px 20px;margin:28px 0 22px;}
      .ev-sera h2{display:none;}
      .ev-sera .r{display:flex;gap:12px;padding:11px 0;border-top:1px solid #F0EDE6;font-size:17.5px;line-height:1.45;}
      .ev-sera .r:first-of-type{border-top:none;}
      .ev-sera .r i{font-style:normal;flex:0 0 22px;}

      .ev-posti{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:18px 20px;margin-bottom:30px;}
      .ev-posti.pochi{border-color:#F5DFA0;background:#FFFBF0;}
      .ev-posti.pieno{border-color:#FECACA;background:#FEF2F2;}
      .ev-posti .et{font-size:11.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;
        color:var(--arancio);margin-bottom:10px;}
      .ev-posti .num{font-family:Georgia,serif;font-size:26px;line-height:1.25;color:var(--navy);margin-bottom:4px;}
      .ev-posti .num b{font-size:34px;}
      .ev-posti small{display:block;color:var(--muto);font-size:15px;line-height:1.5;margin-top:4px;}
      .ev-barrap{height:8px;border-radius:6px;background:#EDE9E0;overflow:hidden;margin:14px 0 4px;}
      .ev-barrap i{display:block;height:100%;background:linear-gradient(90deg,var(--ambra),var(--arancio));}
      .ev-posti a{display:block;text-align:center;background:var(--navy);color:#fff;text-decoration:none;
        font-weight:700;font-size:17px;padding:15px;border-radius:12px;margin-top:16px;}

      .ev-passo{margin-bottom:32px;padding-left:20px;border-left:3px solid var(--riga);}
      .ev-passo.p1{border-color:var(--arancio);}
      .ev-passo.p2{border-color:var(--azzurro);}
      .ev-passo .et{font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--muto);margin-bottom:9px;}
      .ev-passo h2{font-family:Georgia,serif;font-size:clamp(23px,4.6vw,29px);line-height:1.3;margin:0 0 12px;color:var(--navy);}
      .ev-passo p{font-size:18px;line-height:1.6;color:#3D4C55;margin:0;}
      .ev-passo p + p{margin-top:11px;}

      .ev-elenco{margin-top:16px;}
      .ev-el{display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--riga);}
      .ev-el:last-child{border-bottom:1px solid var(--riga);}
      .ev-el i{font-style:normal;color:var(--azzurro);font-weight:800;}
      .ev-el div{font-size:18px;line-height:1.45;}
      .ev-el small{display:block;color:var(--muto);font-size:13.5px;margin-top:4px;line-height:1.5;}

      .ev-piu{margin-top:24px;}
      .ev-piu .cap{font-size:15.5px;color:var(--muto);margin:0 0 13px;line-height:1.55;}
      .ev-piu ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:9px 18px;}
      @media(max-width:540px){.ev-piu ul{grid-template-columns:1fr;}}
      .ev-piu li{font-size:16.5px;line-height:1.4;color:#3D4C55;padding-left:15px;position:relative;}
      .ev-piu li:before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%;background:var(--ambra);}

      .ev-ultima{background:var(--navy);color:#fff;border-radius:16px;padding:24px 22px;margin:32px 0;}
      .ev-ultima p{font-size:20px;line-height:1.5;margin:0;}
      .ev-ultima p + p{margin-top:11px;font-size:17px;color:#CFE0E8;}
      .ev-ultima .amb{color:var(--ambra);font-weight:700;}

      .ev-spinta{text-align:center;font-family:Georgia,serif;font-size:19px;line-height:1.5;
        color:var(--navy);margin:0 0 16px;}
      .ev-form{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:24px 22px;}
      .ev-form h2{font-family:Georgia,serif;font-size:23px;margin:0 0 5px;color:var(--navy);}
      .ev-form .intro{font-size:15.5px;color:var(--muto);margin-bottom:16px;line-height:1.55;}
      .ev-form label{display:block;font-size:13.5px;font-weight:700;margin:14px 0 5px;}
      .ev-form input,.ev-form select,.ev-form textarea{width:100%;padding:12px;border:1.5px solid #D9D5CD;
        border-radius:10px;font-size:16px;font-family:inherit;background:#fff;color:var(--testo);box-sizing:border-box;}
      .ev-form input:focus,.ev-form select:focus,.ev-form textarea:focus{outline:none;border-color:var(--navy);}
      .ev-due{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      @media(max-width:520px){.ev-due{grid-template-columns:1fr;}}
      .ev-form button{width:100%;margin-top:22px;background:var(--navy);color:#fff;border:none;font-weight:700;
        font-size:16.5px;padding:16px;border-radius:12px;cursor:pointer;}
      .ev-form button:disabled{opacity:.55;}
      .ev-slot{margin-top:14px;border-radius:10px;padding:12px 14px;font-size:15.5px;font-weight:600;}
      .ev-slot.ok{background:#F3F8EF;border:1px solid #CFE4C2;color:#2F6B1E;}
      .ev-slot.ko{background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;}
      .ev-privacy{font-size:12px;color:var(--muto);margin-top:13px;text-align:center;line-height:1.55;}
      .ev-errore{display:none;background:#FEF2F2;border:1.5px solid #FECACA;color:#B91C1C;border-radius:10px;padding:11px;font-size:14px;margin-top:12px;}
      .ev-ok{display:none;background:#fff;border:1px solid var(--riga);border-radius:16px;padding:34px 24px;text-align:center;}
      .ev-ok h2{font-family:Georgia,serif;color:var(--navy);margin:0 0 12px;font-size:24px;}
      .ev-ok p{font-size:17.5px;color:#3D4C55;line-height:1.7;margin:0;}
      .ev-ok .cod{display:inline-block;margin-top:16px;background:#F3F8EF;border:1px solid #CFE4C2;
        border-radius:10px;padding:10px 16px;font-size:14px;color:#2F6B1E;font-weight:700;}
      .ev-foot{text-align:center;margin-top:46px;font-size:12.5px;color:var(--muto);line-height:1.9;}

      .ev-barra{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(251,250,247,.97);
        border-top:1px solid var(--riga);padding:10px 16px;display:none;align-items:center;
        justify-content:space-between;gap:12px;box-shadow:0 -6px 20px rgba(0,0,0,.06);}
      .ev-barra.on{display:flex;}
      .ev-barra span{font-size:13px;color:var(--muto);line-height:1.35;}
      .ev-barra b{display:block;color:var(--testo);font-size:15.5px;}
      .ev-barra a{background:var(--navy);color:#fff;text-decoration:none;font-weight:700;font-size:16px;
        padding:11px 20px;border-radius:100px;white-space:nowrap;}
    </style>

    <div class="ev-page"><div class="ev-in">

      <div class="ev-marchio"><img src="assets/ristoflow-logo.png" alt="Ristoflow.AI"></div>

      <div class="ev-occhiello">Mercoledì 23 settembre 2026 · Campo Antico, Orte</div>
      <h1>Ho smesso di<span>chiamarlo gestionale.</span></h1>
      <p class="ev-occhiofine">Il 23 settembre vi faccio vedere perché.<br>A tavola da me, sui numeri veri del mio locale.</p>
      ${daParte}

      <div class="ev-sera">
        <div class="r"><i>🕢</i><div>19:30 – 23:30, si parla a tavola. Siete miei ospiti.</div></div>
        <div class="r"><i>💻</i><div>Niente slide: apro il mio locale, con i numeri della giornata.</div></div>
        <div class="r"><i>👥</i><div>Venite in due: portate chi decide con voi.</div></div>
        <div class="r"><i>🧾</i><div>Serata per chi ha un'attività: serve la partita IVA.</div></div>
      </div>

      <div class="ev-posti ${chiuso || liberi === 0 ? "pieno" : (pochi ? "pochi" : "")}" id="ev-posti-box">
        <div class="et">Solo su richiesta</div>
        <div class="num">${
          chiuso || liberi === 0 ? "Tavoli al completo"
          : pochi ? `<b>Ultimi ${liberi}</b> coperti`
          : "Una serata sola, posti contati"}</div>
        ${pochi ? `<div class="ev-barrap"><i style="width:${Math.min(100, Math.round((capienza - liberi) / capienza * 100))}%"></i></div>` : ""}
        <small>${
          chiuso || liberi === 0
            ? "Scrivetemi e vi metto in lista d'attesa: se qualcuno rinuncia, il posto passa a voi."
            : "Non ci sarà una seconda data, e ogni richiesta la valuto io una per una. Chi prima chiede, prima siede."}</small>
        ${chiuso || liberi === 0 ? "" : `<a href="#/evento-serata" id="ev-vai">Richiedi il posto</a>`}
      </div>

      <div class="ev-passo p1">
        <div class="et">Perché lo faccio</div>
        <h2>Il piatto che vendevo di più mi faceva perdere 2,20 € a porzione</h2>
        <p>Quello che consigliavamo noi. Più ne vendevo, più ci rimettevo, e non avevo
        modo di saperlo.</p>
      </div>

      <div class="ev-passo p2">
        <div class="et">Cosa ci si porta a casa</div>
        <h2>Sapere prima, invece di scoprire dopo</h2>
        <div class="ev-elenco">
          <div class="ev-el"><i>①</i><div>Quanto rende un piatto, <b>mentre lo vendete</b></div></div>
          <div class="ev-el"><i>②</i><div>Quanto costa un servizio, <b>tra merce e persone</b></div></div>
          <div class="ev-el"><i>③</i><div>Chi torna, e <b>chi non si vede da sei mesi</b></div></div>
        </div>

        <div class="ev-piu">
          <p class="cap">E poi cose che quella sera si vedono e basta.</p>
          <ul>
            <li>Cosa si prepara domani, e quanto</li>
            <li>Ricette che si scrivono quasi da sole</li>
            <li>Il bilancio senza aspettare marzo</li>
            <li>Quanto rende ogni persona</li>
            <li>Il telefono che risponde per voi</li>
            <li>Sito e campagne sui vostri numeri</li>
          </ul>
        </div>
      </div>

      <div class="ev-ultima">
        <p>E allora <span class="amb">cos'è?</span></p>
        <p>A parole non rende. <span class="amb">Non fatevelo raccontare:</span> il 23 venite a vederlo.</p>
      </div>

      <p class="ev-spinta">Una sera sola, e i posti sono contati.<br>Chi c'è lo vede, agli altri toccherà farselo raccontare.</p>

      <form class="ev-form" id="ev-form" novalidate>
        <h2>Richiedi il tuo posto</h2>
        <p class="intro">La serata è per chi ha un'attività: per questo chiediamo locale e partita IVA.
        Ricevuta la richiesta vi confermo io il tavolo.</p>

        <label for="ev-nome">Nome e cognome *</label>
        <input id="ev-nome" type="text" autocomplete="name">

        <label for="ev-locale">Nome del locale *</label>
        <input id="ev-locale" type="text">

        <label for="ev-piva">Partita IVA *</label>
        <input id="ev-piva" type="text" inputmode="numeric" placeholder="11 cifre">

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
            <label for="ev-persone">Coperti *</label>
            <select id="ev-persone">
              <option value="1">1 coperto</option>
              <option value="2" selected>2 coperti</option>
              <option value="3">3 coperti</option>
              <option value="4">4 coperti</option>
            </select>
          </div>
        </div>

        <label for="ev-email">Email</label>
        <input id="ev-email" type="email" autocomplete="email">

        <label for="ev-note">Intolleranze o cose che vorreste vedere</label>
        <textarea id="ev-note" rows="2" placeholder="Es: niente glutine · i costi dei piatti"></textarea>

        <div class="ev-slot ${liberi === null || liberi > 0 ? "ok" : "ko"}" id="ev-slot"></div>

        <button type="submit" id="ev-invia">Invia la richiesta</button>
        <div class="ev-errore" id="ev-errore"></div>
        <p class="ev-privacy">I dati servono solo per la serata. Nessuna newsletter.</p>
      </form>

      <div class="ev-ok" id="ev-ok">
        <h2>Tavolo prenotato</h2>
        <p>Vi arriva un messaggio di conferma e un promemoria nei giorni prima.<br><br>
        <b>Mercoledì 23 settembre, dalle 19:30<br>Campo Antico — Orte</b></p>
        <div class="cod" id="ev-riepilogo"></div>
      </div>

      <div class="ev-foot">Ristoflow.AI — Nato in cucina. Non in laboratorio.</div>

      <div class="ev-barra" id="ev-barra">
        <span><b>23 settembre, ore 19:30</b><span id="ev-barra-posti"></span></span>
        <a href="#/evento-serata" id="ev-vai2">Richiedi</a>
      </div>

    </div></div>
  `;

  const form = document.getElementById("ev-form");
  const btn = document.getElementById("ev-invia");
  const box = document.getElementById("ev-errore");
  const slot = document.getElementById("ev-slot");
  const barra = document.getElementById("ev-barra");
  const selPersone = document.getElementById("ev-persone");
  const errore = (m) => { box.textContent = m; box.style.display = "block"; };

  let liberiOra = liberi;

  function aggiornaSlot() {
    const n = parseInt(selPersone.value, 10) || 1;
    if (chiuso) { slot.className = "ev-slot ko"; slot.textContent = "Prenotazioni chiuse."; btn.disabled = true; return; }
    if (liberiOra === null) { slot.className = "ev-slot ok"; slot.textContent = "Posti limitati: la richiesta viene valutata una per una."; return; }
    if (liberiOra <= 0) { slot.className = "ev-slot ko"; slot.textContent = "Tavoli al completo. Scrivetemi per la lista d'attesa."; btn.disabled = true; return; }
    if (n > liberiOra) { slot.className = "ev-slot ko"; slot.textContent = `Restano solo ${liberiOra} coperti: riducete il numero o scrivetemi.`; btn.disabled = true; return; }
    slot.className = "ev-slot ok";
    slot.textContent = liberiOra <= SOGLIA
      ? `Ci stanno ancora: ultimi ${liberiOra} coperti`
      : "Ci stanno: la richiesta la valuto io e vi rispondo su WhatsApp";
    btn.disabled = false;
  }
  aggiornaSlot();
  selPersone.addEventListener("change", aggiornaSlot);

  const barraPosti = document.getElementById("ev-barra-posti");
  if (barraPosti) barraPosti.textContent =
    (liberiOra !== null && liberiOra > 0 && liberiOra <= SOGLIA) ? `ultimi ${liberiOra} coperti` : "Campo Antico, Orte";

  const vai = (e) => { if (e) e.preventDefault(); form.scrollIntoView({ behavior: "smooth", block: "start" }); };
  ["ev-vai", "ev-vai2"].forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener("click", vai); });

  const aggiornaBarra = () => {
    if (!barra) return;
    const visibile = form.getBoundingClientRect().top < window.innerHeight - 80;
    const inviato = form.style.display === "none";
    barra.classList.toggle("on", (window.scrollY || 0) > 320 && !visibile && !inviato);
  };
  window.addEventListener("scroll", aggiornaBarra, { passive: true });
  aggiornaBarra();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    box.style.display = "none";

    const d = {
      evento_slug: EVENTO,
      nome: val("ev-nome"),
      locale: val("ev-locale"),
      partita_iva: val("ev-piva").replace(/\s/g, ""),
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
    if (!d.locale) return errore("Manca il nome del locale.");
    if (!d.tipo_attivita) return errore("Dicci che tipo di attività avete.");
    if (!/^[0-9]{11}$/.test(d.partita_iva)) return errore("La partita IVA deve essere di 11 cifre.");
    if (d.telefono.replace(/\D/g, "").length < 8) return errore("Il numero di telefono non sembra completo.");

    btn.disabled = true; btn.textContent = "Un attimo…";
    const { data: creata, error } = await supabase
      .from("evento_iscrizioni").insert(d).select("token_pubblico").maybeSingle();
    if (error) {
      console.error(error);
      btn.disabled = false; btn.textContent = "Invia la richiesta";
      // la capienza e' controllata anche dal database: se nel frattempo si e' riempita, si dice qui
      if (/esaurit|chius/i.test(error.message || "")) {
        try {
          const { data } = await supabase.rpc("evento_disponibilita", { p_slug: EVENTO });
          liberiOra = data ? Number(data.liberi) : 0;
        } catch (_) { liberiOra = 0; }
        aggiornaSlot();
        return errore("Nel frattempo i posti sono finiti. Scriveteci su WhatsApp al 333 948 7644: vi mettiamo in lista d'attesa.");
      }
      return errore("Non è andata. Riprova, oppure scrivici su WhatsApp al 333 948 7644.");
    }

    // si atterra sulla scheda della propria prenotazione: mappa, calendario, modifica, disdetta
    if (creata && creata.token_pubblico) {
      window.location.hash = "#/evento-prenotazione?t=" + creata.token_pubblico;
      return;
    }
    document.getElementById("ev-riepilogo").textContent =
      `${d.persone} ${d.persone === 1 ? "coperto" : "coperti"} a nome di ${d.nome}`;
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
