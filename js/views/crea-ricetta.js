// js/views/crea-ricetta.js
// ============================================================
// CREA / MODIFICA RICETTA – VERSIONE INDUSTRIALE (MODULARE)
// Coerente con struttura DB reale:
// - ricette
// - ricetta_ingredienti
// - ricette_preparazione_fasi
// - ricette_conservazione
// - ricette_cottura (1 record per ricetta)
// - ricette_output (1 record per ricetta)
// - ricette_porzione
// + ricette_output_secondari (coprodotti / rifili)
// ============================================================
import { requirePermessi } from "../auth-utils.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";
let ricettaId = null;

let prodottiCache = [];
let prodottiMap = new Map();

let categoriePortataCache = [];
let categoriePortataMap = new Map();

let fasiTemplateCache = [];
let fasiTemplateMap = new Map();

let ingredientiCache = [];
let fasiCache = [];
let conservazioniCache = [];
let conservazionePassaggiMap = new Map();
let porzioniCache = [];
let cotturaCache = null;
let outputCache = null;
let outputSecondariCache = [];

let _autocompleteDocBound = false;

let dispositividCache = []; // { id, nome, tipo, temperatura_min, temperatura_max, marca, modello }

// mini-tab fasi
let faseTabAttiva = "preparazione";


// ============================================================
// 🔐 PIN RICETTE — verifica una volta per sessione
// ============================================================

async function richiediPinRicette(container) {
  // Già verificato in questa sessione?
  if (sessionStorage.getItem("pin_ricette_ok") === "true") return true;

  const dipendente = window.state?.dipendente;
  const pinSalvato = dipendente?.pin;

  // Se non ha PIN, accesso libero
  if (!pinSalvato) {
    sessionStorage.setItem("pin_ricette_ok", "true");
    return true;
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      z-index:9999;
    `;
    overlay.innerHTML = `
      <div style="
        background:white;border-radius:16px;padding:28px;
        width:300px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.2);
      ">
        <div style="font-size:32px;margin-bottom:8px;">🔐</div>
        <h3 style="margin:0 0 6px;font-size:17px;">Accesso Ricette</h3>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">
          Inserisci il tuo PIN per continuare
        </p>
        <input
          id="pin-input"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="••••"
          style="
            width:100%;padding:12px;font-size:22px;letter-spacing:8px;
            text-align:center;border:2px solid #e5e7eb;border-radius:10px;
            outline:none;box-sizing:border-box;margin-bottom:12px;
          "
        />
        <div id="pin-error" style="color:#dc2626;font-size:12px;min-height:16px;margin-bottom:10px;"></div>
        <button id="pin-confirm" style="
          width:100%;padding:12px;background:#0E5A7A;color:white;
          border:none;border-radius:10px;font-size:15px;cursor:pointer;
        ">Conferma</button>
        <button id="pin-cancel" style="
          width:100%;padding:10px;background:transparent;color:#6b7280;
          border:none;font-size:13px;cursor:pointer;margin-top:6px;
        ">Annulla</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#pin-input");
    const errEl = overlay.querySelector("#pin-error");
    input.focus();

    function verify() {
      if (input.value === String(pinSalvato)) {
        sessionStorage.setItem("pin_ricette_ok", "true");
        overlay.remove();
        resolve(true);
      } else {
        errEl.textContent = "PIN errato, riprova";
        input.value = "";
        input.focus();
      }
    }

    overlay.querySelector("#pin-confirm").onclick = verify;
    overlay.querySelector("#pin-cancel").onclick = () => {
      overlay.remove();
      resolve(false);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verify();
    });
  });
}



/* ============================================================
   🤖 TONY AI — Inserimento fasi e ingredienti da testo libero
   L'operatore scrive/detta in linguaggio naturale.
   Tony struttura e popola il form automaticamente.
============================================================ */


/* ============================================================
   🎤 VOCALE TONY — Registrazione audio per i modal ricette
   Condivide la stessa logica di ai.js ma è indipendente.
   Usa l'Edge Function assistente-ai con audio_base64.
============================================================ */

let _tonyMicRecorder = null;
let _tonyMicChunks = [];
let _tonyMicRecording = false;

async function tonyStartMic(btnEl, statusEl) {
  if (_tonyMicRecording) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    alert("Il microfono richiede HTTPS. Usa https://app.ristoflow-ai.com");
    return false;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Il tuo browser non supporta il microfono.");
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _tonyMicChunks = [];
    let mimeType = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/mp4";
    _tonyMicRecorder = new MediaRecorder(stream, { mimeType });
    _tonyMicRecorder._mimeType = mimeType;
    _tonyMicRecorder.ondataavailable = e => { if (e.data.size > 0) _tonyMicChunks.push(e.data); };
    _tonyMicRecorder.start(100);
    _tonyMicRecording = true;
    if (btnEl) { btnEl.textContent = "⏹ Stop"; btnEl.style.background = "#dc2626"; }
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626;">🔴 Registrazione in corso... premi Stop quando hai finito</span>`;
    return true;
  } catch(err) {
    alert("Microfono non accessibile: " + err.message);
    return false;
  }
}

function tonyStopMic(btnEl) {
  return new Promise(resolve => {
    if (!_tonyMicRecorder || _tonyMicRecorder.state === "inactive") { resolve(null); return; }
    _tonyMicRecorder.onstop = () => {
      const mime = _tonyMicRecorder._mimeType || "audio/webm";
      const blob = new Blob(_tonyMicChunks, { type: mime });
      _tonyMicRecorder.stream?.getTracks().forEach(t => t.stop());
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };
    _tonyMicRecorder.stop();
    _tonyMicRecording = false;
    if (btnEl) { btnEl.textContent = "🎤 Vocale"; btnEl.style.background = ""; }
  });
}

async function tonyTrascriviEInvia(tipo, audioBase64, statusEl, btnEl) {
  const aziendaId = window.state?.azienda?.id;
  const supa = window.supabaseClient || window.supabase;
  const sessionData = await supa.auth.getSession();
  const token = sessionData?.data?.session?.access_token || "";

  if (statusEl) statusEl.innerHTML = '<span style="color:#0E5A7A;">⏳ Trascrizione in corso...</span>';

  // STEP 1: invia audio alla Edge Function Tony per trascrizione (Whisper)
  // La EF risponde con { voice_input: "testo trascritto", reply: "risposta Tony", ... }
  let trascrizione = "";
  try {
    const resp = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "apikey": token
      },
      body: JSON.stringify({
        azienda_id: aziendaId,
        audio_base64: audioBase64,
        messages: [{ role: "user", content: "trascrivi" }]
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      trascrizione = data.voice_input || "";
    }
  } catch(e) {
    console.warn("Trascrizione EF fallita, procedo senza:", e);
  }

  if (!trascrizione) {
    throw new Error("Trascrizione audio non riuscita. Prova a usare il campo testo.");
  }

  if (statusEl) statusEl.innerHTML = '<span style="color:#0E5A7A;">✍️ Tony sta strutturando: <em>' + trascrizione.substring(0, 60) + '...</em></span>';

  // STEP 2: struttura il testo trascritto con API Anthropic
  const parsed = await tonyInserisciDaTestoLibero(tipo, trascrizione);

  return { trascrizione, parsed };
}


async function tonyInserisciDaTestoLibero(tipo, testoOperatore) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) return;

  // GPT-4o-mini risponde sempre { "reply": "...", "action": ... }
  // Il testo strutturato finisce dentro reply come stringa.
  // Strategia: chiediamo a GPT di mettere il JSON dell'array direttamente
  // dentro reply, poi lo estraiamo con una regex robusta.

  let prompt;

  if (tipo === "fasi") {
    prompt = `Estrai le fasi di lavorazione. Rispondi SOLO con questo JSON:
{"fasi":[{"tipo_fase":"preparazione","descrizione_operativa":"...","durata_min":10,"lavoro_umano_min":10,"temperatura":null,"tecnologia":null}]}

REGOLE:
- tipo_fase: "preparazione" o "cottura" o "attesa" o "raffreddamento".
- riposa/lievita = attesa. raffredda/abbatti = raffreddamento.
- fuoco vivo = temperatura 200, cottura. fuoco basso/lento = temperatura 85, cottura.
- Durate e temperature SOLO se dette o deducibili dalle regole sopra: altrimenti null. NON inventare.
- lavoro_umano_min <= durata_min. Max 12 fasi. Ordine di esecuzione.

DESCRIZIONE: "` + testoOperatore + `"`;
  } else {
    prompt = `Estrai gli ingredienti con quantità. Rispondi SOLO con questo JSON:
{"ingredienti":[{"nome":"...","quantita":0.5,"unita_misura":"kg","note":""}]}

REGOLE:
- unita_misura SOLO tra: "kg", "gr", "lt", "ml", "pz". MAI "g", "l", "grammi", "litri".
- mezzo kg = 0.5 kg. un etto = 100 gr. q.b. = quantita 0.01, um "kg", note "q.b.".
- Solidi in kg/gr, liquidi in lt/ml, uova e pezzi contabili in pz.
- Quantità SOLO se detta: se manca usa null, NON inventare.
- nome: nome pulito dell'ingrediente, singolare, minuscolo, senza quantità dentro.

INGREDIENTI: "` + testoOperatore + `"`;
  }

  const supa = window.supabaseClient || window.supabase;
  const sessionData = await supa.auth.getSession();
  const token = sessionData?.data?.session?.access_token || "";

  try {
    const resp = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "apikey": token
      },
      body: JSON.stringify({
        azienda_id: aziendaId,
        tipo_messaggio: "estrai_ricetta",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();

    // data.reply può essere:
    // A) una stringa JSON array: "[{...}]"
    // B) testo con array JSON embedded
    // C) oggetto JSON come stringa: "{\"fasi\":[...]}"
    const replyRaw = (data.reply || "").trim();

    // Funzione estrazione robusta: cerca il primo array JSON nella stringa
    function estraiArray(testo) {
      // Pulizia backtick
      let s = testo.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
      // Caso A: è già un array
      if (s.startsWith("[")) return JSON.parse(s);
      // Caso B: cerca array dentro la stringa
      const m = s.match(/\[[\s\S]*\]/);
      if (m) return JSON.parse(m[0]);
      // Caso C: oggetto con chiave nota
      const obj = JSON.parse(s);
      if (Array.isArray(obj)) return obj;
      if (Array.isArray(obj.fasi)) return obj.fasi;
      if (Array.isArray(obj.ingredienti)) return obj.ingredienti;
      if (Array.isArray(obj.items)) return obj.items;
      if (typeof obj.reply === "string") return estraiArray(obj.reply);
      if (Array.isArray(obj.reply)) return obj.reply;
      throw new Error("Array non trovato nella risposta");
    }

    let items = estraiArray(replyRaw);

    // Precisione: UM canoniche + matching magazzino LOCALE (fuzzy su tutti
    // i prodotti, non delegato a GPT). Match certo solo con score alto.
    if (Array.isArray(items) && tipo !== "fasi") {
      items = items.map(ing => {
        const out = { ...ing, unita_misura: normUm(ing.unita_misura) || "kg" };
        if (!out.nome_magazzino) {
          const candidati = trovaProdottiSimili(out.nome, 1);
          if (candidati.length && candidati[0].score >= 70) {
            out.nome_magazzino = candidati[0].prodotto.descrizione || candidati[0].prodotto.nome || "";
          }
        }
        return out;
      });
    }

    return items;

  } catch(err) {
    console.error("Tony JSON error:", err);
    throw err;
  }
}


/* ============================================================
   🤖 TONY UNIVERSALE — modal vocale/testo per ogni sezione
   apriModalTony(sezione) dove sezione è:
   "anagrafica" | "output" | "porzionature" | "conservazione" | "coprodotti"
   (fasi e ingredienti hanno già i loro modal dedicati)
============================================================ */

const TONY_SEZIONI = {
  anagrafica: {
    titolo: "Anagrafica ricetta",
    esempio: 'Es: "Ragù bolognese, piatto finito, categoria secondi, attrezzatura pentola grande, resa 3 kg, descrizione ragù tradizionale con cottura lenta"',
    prompt: (testo) => `Sei un assistente culinario. Estrai i dati anagrafici da questa descrizione e rispondi con JSON esatto:
{"reply":{"nome":"","tipo_ricetta":"base o finita","categoria_portata":"nome categoria o stringa vuota","attrezzatura":"","pezzi_base":null,"descrizione":"","note_procedimento":""},"action":null}
tipo_ricetta: "finita" per piatti da menu, "base" per semilavorati/preparazioni.
DESCRIZIONE: "${testo}"`
  },
  output: {
    titolo: "Output / Resa finale",
    esempio: 'Es: "resa 2.5 kg di ragù finito" oppure "produce 20 porzioni da 150g"',
    prompt: (testo, prodottiCtx) => `Sei un assistente culinario. Estrai i dati di output/resa e rispondi con JSON esatto:
{"reply":{"prodotto_nome":"nome del prodotto finito","peso_finale":0.0,"unita_misura":"kg o gr o pz o lt o ml"},"action":null}
Prodotti magazzino disponibili: ${prodottiCtx}
DESCRIZIONE: "${testo}"`
  },
  porzionature: {
    titolo: "Porzionature",
    esempio: 'Es: "ristorante 180g, evento 120g, trattoria 220g" oppure "vasetto 250g per asporto"',
    prompt: (testo) => `Sei un assistente culinario. Estrai le porzionature e rispondi con JSON esatto:
{"reply":[{"label":"nome contesto porzione","peso_porzione":180,"unita_misura":"gr o kg o pz o ml","note":""}],"action":null}
Il valore di reply deve essere un array di porzionature.
DESCRIZIONE: "${testo}"`
  },
  conservazione: {
    titolo: "Conservazione",
    esempio: 'Es: "abbattimento a +3 gradi per 2 ore poi frigo 0/+3 per 5 giorni, oppure abbattimento a -18 e freezer per 90 giorni"',
    prompt: (testo) => `Sei un assistente culinario. Estrai gli scenari di conservazione e rispondi con JSON esatto:
{"reply":[{"scenario_label":"nome scenario es Frigo +3","shelf_life_giorni":5,"note":"","passaggi":[{"tipo_passaggio":"abbattimento o raffreddamento o sottovuoto o stoccaggio o congelamento o confezionamento","titolo":"","temperatura_c":null,"durata_min":null,"attrezzatura":"","descrizione_operativa":""}]}],"action":null}
Il valore di reply deve essere un array di scenari, ognuno con il suo array di passaggi.
DESCRIZIONE: "${testo}"`
  },
  coprodotti: {
    titolo: "Coprodotti / Scarti nobili",
    esempio: 'Es: "fondo bruno 1.2 kg, grasso filtrato 400g, ritagli di carne 600g"',
    prompt: (testo, prodottiCtx) => `Sei un assistente culinario. Estrai i coprodotti e rispondi con JSON esatto:
{"reply":[{"prodotto_nome":"nome prodotto","peso":1.2,"unita_misura":"kg o gr o pz o lt","metodo_allocazione":"peso"}],"action":null}
Il valore di reply deve essere un array di coprodotti.
Prodotti magazzino: ${prodottiCtx}
DESCRIZIONE: "${testo}"`
  }
};

async function tonyChiamaEF(prompt) {
  const aziendaId = window.state?.azienda?.id;
  const supa = window.supabaseClient || window.supabase;
  const sessionData = await supa.auth.getSession();
  const token = sessionData?.data?.session?.access_token || "";
  const resp = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json",
      "Authorization": "Bearer " + token, "apikey": token },
    body: JSON.stringify({ azienda_id: aziendaId,
      tipo_messaggio: "estrai_ricetta",
      messages: [{ role: "user", content: prompt }] })
  });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return await resp.json();
}

function tonyEstraiReply(data) {
  const raw = (data.reply || "").trim()
    .replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
  const parsed = JSON.parse(raw);
  // reply può essere l'oggetto diretto, un array, o dentro .reply
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    if (parsed.reply !== undefined) return parsed.reply;
    return parsed;
  }
  return parsed;
}

function apriModalTony(sezione) {
  const cfg = TONY_SEZIONI[sezione];
  if (!cfg) return;

  const prodottiCtx = prodottiCache.slice(0,60)
    .map(p => p.descrizione || p.nome || "").filter(Boolean).join(", ");

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";

  overlay.innerHTML = `
    <div style="background:white;border-radius:20px 20px 0 0;width:100%;max-width:600px;padding:24px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);max-height:85vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="font-size:26px;">🤖</span>
        <div>
          <div style="font-weight:700;font-size:16px;">Tony AI — ${cfg.titolo}</div>
          <div style="font-size:12px;color:#6b7280;">Descrivi a voce o per testo</div>
        </div>
      </div>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#0369a1;">
        💡 ${cfg.esempio}
      </div>
      <textarea id="tony-uni-input" placeholder="Scrivi qui oppure usa il vocale..." 
        style="width:100%;box-sizing:border-box;height:110px;border:2px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;line-height:1.5;resize:vertical;font-family:inherit;outline:none;"></textarea>
      <div id="tony-uni-status" style="font-size:13px;min-height:18px;margin:8px 0;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="tony-uni-mic" type="button"
          style="background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:12px 16px;font-size:14px;cursor:pointer;">
          🎤 Vocale
        </button>
        <button id="tony-uni-go" type="button"
          style="flex:1;background:#0E5A7A;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;">
          🚀 Compila con Tony
        </button>
        <button id="tony-uni-close" type="button"
          style="background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:14px 18px;font-size:15px;cursor:pointer;">✕</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const textarea = overlay.querySelector("#tony-uni-input");
  const status   = overlay.querySelector("#tony-uni-status");
  const btnGo    = overlay.querySelector("#tony-uni-go");
  const btnMic   = overlay.querySelector("#tony-uni-mic");
  const btnClose = overlay.querySelector("#tony-uni-close");

  textarea.focus();
  btnClose.onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  // 🎤 Vocale
  btnMic.onclick = async () => {
    if (!_tonyMicRecording) {
      await tonyStartMic(btnMic, status);
    } else {
      btnGo.disabled = true; btnMic.disabled = true;
      const audio = await tonyStopMic(btnMic);
      if (!audio) { status.innerHTML = '<span style="color:#dc2626;">❌ Audio non registrato</span>'; btnGo.disabled=false; btnMic.disabled=false; return; }
      status.innerHTML = '<span style="color:#0E5A7A;">⏳ Trascrizione...</span>';
      try {
        // Per la trascrizione audio inviamo audio_base64 direttamente
        const supa2 = window.supabaseClient || window.supabase;
        const s2 = await supa2.auth.getSession();
        const tok2 = s2?.data?.session?.access_token || "";
        const r2 = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai", {
          method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok2,"apikey":tok2},
          body: JSON.stringify({ azienda_id: window.state?.azienda?.id, audio_base64: audio, messages:[{role:"user",content:"trascrivi"}] })
        });
        const efData = r2.ok ? await r2.json() : { voice_input: "" };
        // La EF con audio restituisce voice_input
        const trascritto = efData.voice_input || "";
        if (trascritto) { textarea.value = trascritto; status.innerHTML = '<span style="color:#16a34a;">✍️ Trascritto — premi Compila</span>'; }
        else { status.innerHTML = '<span style="color:#f59e0b;">⚠️ Trascrizione vuota — riprova o scrivi</span>'; }
      } catch(e) { status.innerHTML = '<span style="color:#dc2626;">❌ ' + e.message + '</span>'; }
      btnGo.disabled=false; btnMic.disabled=false;
    }
  };

  // 🚀 Compila
  btnGo.onclick = async () => {
    const testo = textarea.value.trim();
    if (!testo) return;
    btnGo.disabled = true;
    btnGo.textContent = "⏳ Tony sta pensando...";
    status.innerHTML = '<span style="color:#0E5A7A;">Analisi in corso...</span>';
    try {
      const prompt = typeof cfg.prompt === "function"
        ? cfg.prompt(testo, prodottiCtx)
        : cfg.prompt;
      const data = await tonyChiamaEF(prompt);
      const result = tonyEstraiReply(data);
      await tonyApplicaSezione(sezione, result, overlay, status);
    } catch(e) {
      status.innerHTML = '<span style="color:#dc2626;">❌ ' + e.message + ' — riprova</span>';
      btnGo.disabled=false; btnGo.textContent="🚀 Compila con Tony";
    }
  };
}

async function tonyApplicaSezione(sezione, result, overlay, status) {
  if (sezione === "anagrafica") {
    const d = result;
    if (d.nome) setVal("r-nome", d.nome);
    if (d.tipo_ricetta) {
      setVal("r-tipo", d.tipo_ricetta);
      const wrap = document.getElementById("categoria-wrapper");
      if (wrap) wrap.style.display = d.tipo_ricetta === "finita" ? "" : "none";
    }
    if (d.attrezzatura) setVal("r-attrezzatura", d.attrezzatura);
    if (d.pezzi_base) setVal("r-pezzi-base", d.pezzi_base);
    if (d.descrizione) setVal("r-descrizione", d.descrizione);
    if (d.note_procedimento) setVal("r-note-proc", d.note_procedimento);
    // Categoria portata: cerca in cache, altrimenti crea
    if (d.categoria_portata && d.tipo_ricetta === "finita") {
      const catInput  = document.getElementById("r-categoria-search");
      const catHidden = document.getElementById("r-categoria-id");
      if (catInput) catInput.value = d.categoria_portata;
      // Cerca nella cache locale
      let found = categoriePortataCache.find(c =>
        (c.nome||"").toLowerCase() === d.categoria_portata.toLowerCase());
      if (found && catHidden) {
        catHidden.value = found.id;
      } else {
        // Non trovata in cache — crea la categoria al volo
        try {
          const supa = window.supabaseClient || window.supabase;
          const { data: newCat } = await supa
            .from("categorie_portata")
            .insert({ nome: d.categoria_portata, azienda_id: window.state?.azienda?.id })
            .select("id,nome").single();
          if (newCat) {
            categoriePortataCache.push(newCat);
            if (catHidden) catHidden.value = newCat.id;
          }
        } catch(e) { console.warn("Categoria non creata:", e.message); }
      }
    }
    status.innerHTML = '<span style="color:#16a34a;">✅ Anagrafica compilata! Salvataggio in corso...</span>';
    // Auto-salva dopo che Tony ha compilato l'anagrafica
    setTimeout(async () => {
      try {
        await salvaTutto();
        overlay.remove();
      } catch(e) {
        status.innerHTML = '<span style="color:#dc2626;">❌ Errore salvataggio: ' + e.message + '</span>';
      }
    }, 600);

  } else if (sezione === "output") {
    const d = result;
    if (d.peso_finale) setVal("r-output-peso", d.peso_finale);
    if (d.unita_misura) setVal("r-output-um", d.unita_misura);
    // Cerca prodotto output nel magazzino
    if (d.prodotto_nome) {
      const candidati = trovaProdottiSimili(d.prodotto_nome, 1);
      const match = candidati.length > 0 && candidati[0].score >= 50 ? candidati[0].prodotto : null;
      const outSearch = document.getElementById("r-output-search");
      const outHidden = document.getElementById("r-output-id");
      if (outSearch) outSearch.value = match ? (match.descrizione||match.nome||d.prodotto_nome) : d.prodotto_nome;
      if (outHidden && match) outHidden.value = match.id;
    }
    aggiornaOutputInfo();
    status.innerHTML = '<span style="color:#16a34a;">✅ Output compilato!</span>';
    setTimeout(() => overlay.remove(), 1200);

  } else if (sezione === "porzionature") {
    const arr = Array.isArray(result) ? result : [result];
    const container = document.getElementById("porzioni-container");
    if (container) container.innerHTML = "";
    arr.forEach(p => aggiungiPorzione({
      label: p.label || "",
      peso_porzione: p.peso_porzione || p.peso || 0,
      unita_misura: p.unita_misura || "gr",
      note: p.note || ""
    }));
    status.innerHTML = `<span style="color:#16a34a;">✅ ${arr.length} porzionatura/e compilata/e!</span>`;
    setTimeout(() => overlay.remove(), 1200);

  } else if (sezione === "conservazione") {
    const arr = Array.isArray(result) ? result : [result];
    const container = document.getElementById("conservazione-container");
    if (container) container.innerHTML = "";
    arr.forEach(sc => {
      const passaggi = Array.isArray(sc.passaggi) ? sc.passaggi : [];
      aggiungiScenarioConservazione({
        scenario_label: sc.scenario_label || sc.label || "",
        shelf_life_giorni: sc.shelf_life_giorni || sc.shelf_life || null,
        note: sc.note || "",
        attivo: true
      }, passaggi.map((p, idx) => ({
        posizione: idx + 1,
        tipo_passaggio: p.tipo_passaggio || "altro",
        titolo: p.titolo || p.tipo_passaggio || "",
        temperatura_c: p.temperatura_c || null,
        durata_min: p.durata_min || null,
        attrezzatura: p.attrezzatura || "",
        descrizione_operativa: p.descrizione_operativa || ""
      })));
    });
    status.innerHTML = `<span style="color:#16a34a;">✅ ${arr.length} scenario/i compilato/i!</span>`;
    setTimeout(() => overlay.remove(), 1200);

  } else if (sezione === "coprodotti") {
    const arr = Array.isArray(result) ? result : [result];
    const container = document.getElementById("output-secondari-container");
    if (container) container.innerHTML = "";
    arr.forEach(c => {
      const candidati = trovaProdottiSimili(c.prodotto_nome || "", 1);
      const match = candidati.length > 0 && candidati[0].score >= 50 ? candidati[0].prodotto : null;
      aggiungiOutputSecondario({
        prodotto_id: match?.id ?? "",
        nome_prodotto: match?.descrizione || c.prodotto_nome || "",
        peso: c.peso || 0,
        unita_misura: c.unita_misura || "kg",
        metodo_allocazione: c.metodo_allocazione || "peso"
      });
    });
    status.innerHTML = `<span style="color:#16a34a;">✅ ${arr.length} coprodotto/i compilato/i!</span>`;
    setTimeout(() => overlay.remove(), 1200);
  }
}


function apriModalTonyFasi() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0;";

  overlay.innerHTML = `
    <div style="background:white;border-radius:20px 20px 0 0;width:100%;max-width:600px;padding:24px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);max-height:85vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:28px;">🤖</span>
        <div>
          <div style="font-weight:700;font-size:17px;">Tony AI — Inserisci le fasi</div>
          <div style="font-size:12px;color:#6b7280;">Descrivi il procedimento come lo spiegheresti a un collega</div>
        </div>
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#0369a1;line-height:1.5;">
        💡 <strong>Esempio:</strong><br>
        "Prima soffriggo cipolla e aglio in olio per 5 minuti. Aggiungo la carne e la faccio rosolare bene 10 minuti a fuoco vivo. Poi metto il pomodoro e lascio cuocere 2 ore a fuoco basso mescolando ogni tanto. Alla fine aggiusto di sale."
      </div>

      <textarea id="tony-fasi-input" placeholder="Descrivi il procedimento qui..." 
        style="width:100%;box-sizing:border-box;height:140px;border:2px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;line-height:1.5;resize:vertical;font-family:inherit;outline:none;"
      ></textarea>

      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;margin-bottom:14px;">
        <span style="font-size:11px;color:#9ca3af;">Suggerimenti rapidi:</span>
        ${["soffriggere", "cuocere in forno", "abbattere", "lievitare", "montare", "frullare"].map(s =>
          `<button type="button" onclick="document.getElementById('tony-fasi-input').value += ' ${s}'" 
            style="background:#f3f4f6;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:#374151;">${s}</button>`
        ).join("")}
      </div>

      <div id="tony-fasi-status" style="font-size:13px;color:#6b7280;min-height:20px;margin-bottom:12px;"></div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="tony-fasi-mic" type="button"
          style="background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:12px 16px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;">
          🎤 Vocale
        </button>
        <button id="tony-fasi-go" type="button"
          style="flex:1;background:#0E5A7A;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;">
          🚀 Genera fasi con Tony
        </button>
        <button type="button" onclick="this.closest('[style*=position]').remove()"
          style="background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:14px 18px;font-size:15px;cursor:pointer;">
          ✕
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector("#tony-fasi-input").focus();

  // 🎤 Pulsante vocale — modal fasi
  overlay.querySelector("#tony-fasi-mic")?.addEventListener("click", async () => {
    const btnMic = overlay.querySelector("#tony-fasi-mic");
    const status = overlay.querySelector("#tony-fasi-status");
    const textarea = overlay.querySelector("#tony-fasi-input");

    if (!_tonyMicRecording) {
      await tonyStartMic(btnMic, status);
    } else {
      const btnGo = overlay.querySelector("#tony-fasi-go");
      btnGo.disabled = true;
      btnMic.disabled = true;
      const audioBase64 = await tonyStopMic(btnMic);
      if (!audioBase64) {
        status.innerHTML = `<span style="color:#dc2626;">❌ Audio non registrato</span>`;
        btnGo.disabled = false; btnMic.disabled = false; return;
      }
      try {
        const { trascrizione, parsed } = await tonyTrascriviEInvia("fasi", audioBase64, status, btnMic);
        if (trascrizione) textarea.value = trascrizione;
        if (Array.isArray(parsed) && parsed.length) {
          const container = document.getElementById("fasi-container");
          if (container) container.innerHTML = "";
          parsed.forEach(f => aggiungiFase({
            tipo_fase: f.tipo_fase || "preparazione",
            descrizione_operativa: f.descrizione_operativa || "",
            durata_min: f.durata_min || 0,
            lavoro_umano_min: f.lavoro_umano_min || 0,
            temperatura: f.temperatura || null,
            tecnologia: f.tecnologia || ""
          }));
          status.innerHTML = `<span style="color:#16a34a;">✅ ${parsed.length} fase/i generate dal vocale!</span>`;
          setTimeout(() => overlay.remove(), 1500);
        }
      } catch(err) {
        status.innerHTML = `<span style="color:#dc2626;">❌ ${err.message}</span>`;
      }
      btnGo.disabled = false; btnMic.disabled = false;
    }
  });

  overlay.querySelector("#tony-fasi-go").addEventListener("click", async () => {
    const testo = overlay.querySelector("#tony-fasi-input").value.trim();
    if (!testo) return;

    const status = overlay.querySelector("#tony-fasi-status");
    const btn = overlay.querySelector("#tony-fasi-go");
    btn.disabled = true;
    btn.textContent = "⏳ Tony sta pensando...";
    status.innerHTML = `<span style="color:#0E5A7A;">Analisi in corso — attendi qualche secondo...</span>`;

    try {
      const fasi = await tonyInserisciDaTestoLibero("fasi", testo);

      if (!Array.isArray(fasi) || !fasi.length) throw new Error("Nessuna fase estratta");

      // Svuota container e inserisce le fasi generate
      const container = document.getElementById("fasi-container");
      if (container) container.innerHTML = "";

      fasi.forEach(f => {
        aggiungiFase({
          tipo_fase: f.tipo_fase || "preparazione",
          descrizione_operativa: f.descrizione_operativa || "",
          durata_min: f.durata_min || 0,
          lavoro_umano_min: f.lavoro_umano_min || 0,
          temperatura: f.temperatura || null,
          tecnologia: f.tecnologia || ""
        });
      });

      status.innerHTML = `<span style="color:#16a34a;">✅ ${fasi.length} fase/i generate! Controlla e modifica se necessario.</span>`;
      setTimeout(() => overlay.remove(), 1500);

    } catch(err) {
      status.innerHTML = `<span style="color:#dc2626;">❌ Errore: ${err.message}. Riprova o inserisci manualmente.</span>`;
      btn.disabled = false;
      btn.textContent = "🚀 Genera fasi con Tony";
    }
  });

  // Click fuori chiude
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function apriModalTonyIngredienti() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";

  overlay.innerHTML = `
    <div style="background:white;border-radius:20px 20px 0 0;width:100%;max-width:600px;padding:24px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);max-height:85vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:28px;">🤖</span>
        <div>
          <div style="font-weight:700;font-size:17px;">Tony AI — Inserisci gli ingredienti</div>
          <div style="font-size:12px;color:#6b7280;">Elenca gli ingredienti come vuoi, Tony li struttura</div>
        </div>
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#0369a1;line-height:1.5;">
        💡 <strong>Esempio:</strong><br>
        "5 kg di carne macinata, 3 kg passata di pomodoro, una cipolla grande, 2 carote, mezzo bicchiere di vino rosso, olio evo q.b., sale e pepe"
      </div>

      <textarea id="tony-ing-input" placeholder="Elenca gli ingredienti qui..." 
        style="width:100%;box-sizing:border-box;height:120px;border:2px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;line-height:1.5;resize:vertical;font-family:inherit;outline:none;"
      ></textarea>

      <div id="tony-ing-status" style="font-size:13px;color:#6b7280;min-height:20px;margin:10px 0;"></div>
      <div id="tony-ing-preview" style="margin-bottom:12px;"></div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="tony-ing-mic" type="button"
          style="background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:12px 16px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;">
          🎤 Vocale
        </button>
        <button id="tony-ing-go" type="button"
          style="flex:1;background:#0E5A7A;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;">
          🚀 Genera ingredienti con Tony
        </button>
        <button type="button" onclick="this.closest('[style*=position]').remove()"
          style="background:#f3f4f6;color:#374151;border:none;border-radius:12px;padding:14px 18px;font-size:15px;cursor:pointer;">
          ✕
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector("#tony-ing-input").focus();

  // 🎤 Pulsante vocale — modal ingredienti
  overlay.querySelector("#tony-ing-mic")?.addEventListener("click", async () => {
    const btnMic = overlay.querySelector("#tony-ing-mic");
    const status = overlay.querySelector("#tony-ing-status");
    const textarea = overlay.querySelector("#tony-ing-input");

    if (!_tonyMicRecording) {
      await tonyStartMic(btnMic, status);
    } else {
      const btnGo = overlay.querySelector("#tony-ing-go");
      btnGo.disabled = true; btnMic.disabled = true;
      const audioBase64 = await tonyStopMic(btnMic);
      if (!audioBase64) {
        status.innerHTML = `<span style="color:#dc2626;">❌ Audio non registrato</span>`;
        btnGo.disabled = false; btnMic.disabled = false; return;
      }
      try {
        const { trascrizione, parsed } = await tonyTrascriviEInvia("ingredienti", audioBase64, status, btnMic);
        if (trascrizione) textarea.value = trascrizione;
        if (Array.isArray(parsed) && parsed.length) {
          // Usa lo stesso flusso del testo: popola preview e poi inserisce
          const container = document.getElementById("ingredienti-container");
          if (container) container.innerHTML = "";
          parsed.forEach(ing => {
            const candidati = trovaProdottiSimili(ing.nome_magazzino || ing.nome, 1);
            const match = candidati.length > 0 && candidati[0].score >= 70 ? candidati[0].prodotto : null;
            aggiungiIngrediente({
              prodotto_id: match?.id ?? "",
              nome_prodotto: match?.descrizione || ing.nome,
              _nome_tony: match ? null : (ing.nome_magazzino || ing.nome),
              quantita: ing.quantita,
              unita_misura: ing.unita_misura,
              note: ing.note || ""
            });
          });
          status.innerHTML = `<span style="color:#16a34a;">✅ ${parsed.length} ingredienti dal vocale!</span>`;
          setTimeout(() => overlay.remove(), 1500);
        }
      } catch(err) {
        status.innerHTML = `<span style="color:#dc2626;">❌ ${err.message}</span>`;
      }
      btnGo.disabled = false; btnMic.disabled = false;
    }
  });

  overlay.querySelector("#tony-ing-go").addEventListener("click", async () => {
    const testo = overlay.querySelector("#tony-ing-input").value.trim();
    if (!testo) return;

    const status = overlay.querySelector("#tony-ing-status");
    const preview = overlay.querySelector("#tony-ing-preview");
    const btn = overlay.querySelector("#tony-ing-go");
    btn.disabled = true;
    btn.textContent = "⏳ Tony sta pensando...";
    status.innerHTML = `<span style="color:#0E5A7A;">Analisi in corso...</span>`;

    try {
      const ingredienti = await tonyInserisciDaTestoLibero("ingredienti", testo);

      if (!Array.isArray(ingredienti) || !ingredienti.length) throw new Error("Nessun ingrediente estratto");

      // Preview prima di confermare
      preview.innerHTML = `
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;">Ingredienti estratti — controlla e conferma:</div>
          ${ingredienti.map((ing, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
              <span>${escapeHtml(ing.nome)}</span>
              <span style="color:#0E5A7A;font-weight:600;">${ing.quantita} ${ing.unita_misura}</span>
              <span style="font-size:11px;color:${ing.nome_magazzino ? '#16a34a' : '#f59e0b'};">
                ${ing.nome_magazzino ? '✅ ' + ing.nome_magazzino : '⚠️ non in magazzino'}
              </span>
            </div>
          `).join("")}
        </div>
      `;

      status.innerHTML = `<span style="color:#16a34a;">${ingredienti.length} ingredienti trovati. Premi "Inserisci" per aggiungerli.</span>`;

      btn.disabled = false;
      btn.textContent = "✅ Inserisci nel form";
      btn.style.background = "#16a34a";

      // Seconda click → inserisce nel form
      btn.onclick = () => {
        const container = document.getElementById("ingredienti-container");
        if (container) container.innerHTML = "";

        ingredienti.forEach(ing => {
          const candidati = trovaProdottiSimili(ing.nome_magazzino || ing.nome, 1);
          const match = candidati.length > 0 && candidati[0].score >= 70 ? candidati[0].prodotto : null;
          aggiungiIngrediente({
            prodotto_id: match?.id ?? "",
            nome_prodotto: match?.descrizione || ing.nome,
            _nome_tony: match ? null : (ing.nome_magazzino || ing.nome),
            quantita: ing.quantita,
            unita_misura: ing.unita_misura,
            note: ing.note || ""
          });
        });

        overlay.remove();
      };

    } catch(err) {
      status.innerHTML = `<span style="color:#dc2626;">❌ Errore: ${err.message}. Riprova.</span>`;
      btn.disabled = false;
      btn.textContent = "🚀 Genera ingredienti con Tony";
    }
  });

  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

export async function render(app) {
  ricettaId = window.routeParams?.id ? String(window.routeParams.id) : null;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  // ============================================================
  // ? CONTROLLO PERMESSI
  // ============================================================

  if (!requirePermessi({
    container: app,
    resource: "ricette",
    action: "read"
  })) return;

  // 🔐 PIN obbligatorio per scrivere/modificare ricette
  const pinOk = await richiediPinRicette(app);
  if (!pinOk) {
    window.history.back();
    return;
  }

  if (!ricettaId) {
    if (!requirePermessi({
      container: app,
      resource: "ricette",
      action: "create"
    })) return;
  } else {
    if (!requirePermessi({
      container: app,
      resource: "ricette",
      action: "update"
    })) return;
  }

  // ============================================================
  // ? LAYOUT DEFINITIVO (COME PREVENTIVO)
  // ============================================================

  app.innerHTML = createPageLayout({
    title: ricettaId ? "Modifica Ricetta" : "Crea Ricetta",
    subtitle: "Struttura operativa ed economica",
    content: `
 <div style="margin-bottom:16px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <div id="mode-toggle" style="display:inline-flex; background:#eef1f4; border-radius:12px; padding:4px; gap:4px;">
          <button id="btn-mode-semplice" type="button"
            style="border:none; border-radius:9px; padding:8px 16px; font-size:14px; font-weight:700; cursor:pointer; background:transparent; color:#334155;">
            ⚡ Semplice
          </button>
          <button id="btn-mode-avanzata" type="button"
            style="border:none; border-radius:9px; padding:8px 16px; font-size:14px; font-weight:700; cursor:pointer; background:transparent; color:#334155;">
            🔧 Avanzata
          </button>
        </div>
        <button id="btn-help" class="app-button gray small" type="button">
         Come funziona questa scheda
        </button>
      </div>

      <div id="help-box" style="
        display:none;
        background:#f4f4f4;
        border-radius:12px;
        padding:16px;
        margin-bottom:20px;
        font-size:14px;
        line-height:1.5;
      ">
        <strong>Guida compilazione ricetta</strong><br><br>

  <strong>1️⃣ Anagrafica</strong><br>
  Definisce identità e quantità base della ricetta.<br>
  <em>Esempio:</em> Ragù classico – 10 porzioni base.<br><br>

  <strong>2️⃣ Ingredienti</strong><br>
  Inserire solo prodotti codificati con quantità REALI utilizzate.<br>
  Questo genera il food cost.<br>
  <em>Esempio:</em><br>
  • Carne macinata 5 kg<br>
  • Passata pomodoro 3 kg<br>
  • Olio EVO 0,25 kg<br><br>

  <strong>3️⃣ Output (Resa)</strong><br>
  Indicare il prodotto finale e il peso reale dopo la lavorazione.<br>
  Serve per calcolare il costo unitario.<br>
  <em>Esempio:</em><br>
  Input totale 8,5 kg → Resa reale 7,2 kg<br><br>

  <strong>4️⃣ Procedimento</strong><br>
  Standard operativo replicabile da qualsiasi operatore.<br>
  Per ogni fase indicare titolo, durata, lavoro umano, tecnologia e temperatura.<br>
  <em>Esempio:</em><br>
  Fase 1 – Soffritto (15 min, 15 min lavoro umano, pentola)<br>
  Fase 2 – Cottura lenta (180 min, 10 min lavoro umano, 90°C)<br><br>

  <strong>5️⃣ Porzionature</strong><br>
  Definisce utilizzo commerciale della ricetta.<br>
  <em>Esempio:</em><br>
  • Ristorante → 180 g<br>
  • Evento → 130 g<br>
  • Trattoria → 220 g<br><br>

  <strong>6️⃣ Conservazione</strong><br>
  Inserire scenari completi con tutti i passaggi tecnici.<br>
  Determina shelf life ed etichetta lotto.<br>
  <em>Esempio scenario 1:</em><br>
  • Abbattimento +3°C – 90 min<br>
  • Sottovuoto – 15 min<br>
  • Conservazione frigo 0/+3°C – 5 giorni<br><br>

  <em>Esempio scenario 2:</em><br>
  • Abbattimento -18°C – 120 min<br>
  • Conservazione freezer – 90 giorni<br><br>

  <strong>7️⃣ Coprodotti</strong><br>
  Inserire eventuali output secondari per corretta allocazione costi.<br>
  <em>Esempio:</em><br>
  • Fondo bruno 1,2 kg<br>
  • Grasso filtrato 0,4 kg<br><br>

  <strong>⚙️ Regola generale</strong><br>
  Questa è una scheda operativa.<br>
  Se compilata correttamente permette:<br>
  • Calcolo preciso costi<br>
  • Standardizzazione produzione<br>
  • Tracciabilità lotti<br>
  • Controllo qualità

</div>

      <div class="form-actions" style="margin-bottom:16px;">
      <div class="form-actions" style="margin-bottom:16px;">
        <button class="app-button secondary"
          onclick="window.location.hash='#/produzione'">
          Indietro
        </button>
      </div>

      ${createCard({
        title: "Anagrafica",
        body: `
          <div class="form-grid">

            <div class="form-group">
              <label>Nome ricetta *</label>
              <input id="r-nome" class="input" />
            </div>

            <div class="form-group">
              <label>Tipo ricetta *</label>
              <select id="r-tipo" class="input">
                <option value="base">Base (semilavorato)</option>
                <option value="finita">Piatto finito</option>
              </select>
            </div>

            <div class="form-group" id="categoria-wrapper" style="display:none;">
              <label>Categoria portata *</label>
              <div class="input-wrap">
                <input id="r-categoria-search"
                  class="input"
                  autocomplete="off"
                  placeholder="Cerca o crea categoria..." />
                <input id="r-categoria-id" type="hidden" />
                <div id="r-categoria-suggest" class="suggest-list"></div>
              </div>
            </div>

            <div class="form-group">
              <label>Attrezzatura produzione</label>
              <input id="r-attrezzatura" class="input" placeholder="Es. teglia inox, roner, abbattitore..." />
            </div>

            <div class="form-group">
              <label>Pezzi base</label>
              <input id="r-pezzi-base" type="number" min="0" class="input" />
            </div>

            <div class="form-group">
              <label>Foto piatto</label>
              <input id="r-foto-file"
                type="file"
                class="input"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />
              <input id="r-foto-url" type="hidden" />
              <div id="r-foto-preview-wrap" style="margin-top:10px; display:none;">
                <img id="r-foto-preview"
                  alt="Preview foto piatto"
                  style="width:100%; max-width:260px; border-radius:12px; border:1px solid rgba(0,0,0,0.08);" />
              </div>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label>Descrizione</label>
              <textarea id="r-descrizione" class="input"></textarea>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label>Note procedimento</label>
              <textarea id="r-note-proc" class="input"></textarea>
            </div>

          </div>
          <div style="margin-top:12px;">
            <button id="btn-tony-anagrafica" type="button"
              style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;">
              🤖 Compila anagrafica con Tony
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Ingredienti",
        body: `
          <div id="ingredienti-container"></div>

          <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-tony-ing"
              class="app-button"
              type="button"
              style="background:#0E5A7A;display:flex;align-items:center;gap:6px;">
              🤖 Detta a Tony
            </button>
            <button id="btn-add-ing"
              class="app-button secondary"
              type="button">
              + Aggiungi manuale
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Output (Resa)",
        body: `
          <div class="form-grid">

            <div class="form-group" style="grid-column:1/-1;">
              <label>Prodotto output *</label>
              <div class="input-wrap">
                <input id="r-output-search"
                  class="input"
                  autocomplete="off"
                  placeholder="Cerca prodotto..." />
                <input id="r-output-id" type="hidden" />
                <div id="r-output-suggest" class="suggest-list"></div>
              </div>
            </div>

            <div class="form-group">
              <label>Peso finale *</label>
              <input id="r-output-peso"
                type="number"
                step="0.001"
                class="input" />
            </div>

            <div class="form-group">
              <label>Unità misura *</label>
              <select id="r-output-um" class="input">
                <option value="kg">kg</option>
                <option value="gr">gr</option>
                <option value="pz">pz</option>
                <option value="lt">lt</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <div id="r-cost-preview" style="position:sticky;top:0;z-index:15;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;color:#166534;">
                Food cost: — (aggiungi ingredienti per vedere il calcolo)
              </div>
            </div>

          </div>
          <div style="margin-top:10px;">
            <button id="btn-tony-output" type="button"
              style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;">
              🤖 Compila resa con Tony
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Procedimento",
        body: `
          <div id="fasi-container"></div>

          <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-tony-fasi"
              class="app-button"
              type="button"
              style="background:#0E5A7A;display:flex;align-items:center;gap:6px;">
              🤖 Detta a Tony
            </button>
            <button id="btn-add-fase"
              class="app-button secondary"
              type="button">
              + Aggiungi manuale
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Porzionature",
        body: `
          <div id="porzioni-container"></div>

          <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-tony-porzionature" type="button"
              class="app-button"
              style="background:#0E5A7A;display:flex;align-items:center;gap:6px;">
              🤖 Detta a Tony
            </button>
            <button id="btn-add-porzione"
              class="app-button secondary"
              type="button">
              + Aggiungi manuale
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Conservazione",
        body: `
          <div id="conservazione-container"></div>

          <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-tony-conservazione" type="button"
              class="app-button"
              style="background:#0E5A7A;display:flex;align-items:center;gap:6px;">
              🤖 Detta a Tony
            </button>
            <button id="btn-add-conservazione"
              class="app-button secondary"
              type="button">
              + Aggiungi manuale
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Area Economica",
        body: `
          <div id="output-secondari-container"></div>

          <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-tony-coprodotti" type="button"
              class="app-button"
              style="background:#0E5A7A;display:flex;align-items:center;gap:6px;">
              🤖 Detta a Tony
            </button>
            <button id="btn-add-out2"
              class="app-button secondary"
              type="button">
              + Aggiungi manuale
            </button>
          </div>
        `
      })}

      <div class="form-actions" style="margin-top:20px;">
        <button id="btn-salva"
          class="app-button">
          Salva Ricetta
        </button>
      </div>

      <div id="r-esito" class="form-result"></div>
    `
  });

  // ============================================================
  // ? LOGICA ORIGINALE (NON TOCCATA)
  // ============================================================

  await loadProdotti();
  await loadCategoriePortata();
  await loadFasiTemplate();
  await loadDispositivi();
  bindUI();
  initModeToggle();

  if (ricettaId) {
    await caricaRicettaCompleta();
  } else {
    // default: finita (coerente con default DB). Cambia qui se preferisci "base".
    setVal("r-tipo", "finita");
    const wrapCat = document.getElementById("categoria-wrapper");
    if (wrapCat) wrapCat.style.display = "";

    aggiungiIngrediente();
    aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });
    aggiungiScenarioConservazione();
    aggiungiPorzione();
    aggiornaOutputInfo();
  }
}

/* ============================================================
   MODALITÀ SEMPLICE / AVANZATA
   Semplice = anagrafica essenziale + ingredienti + resa/food cost
   Avanzata = tutto (procedimento, porzionature, conservazione, coprodotti)
============================================================ */
const EDITOR_MODE_KEY = "rf_ricetta_mode";

function getAdvancedCards() {
  const ids = [
    "fasi-container",
    "porzioni-container",
    "conservazione-container",
    "output-secondari-container",
  ];
  return ids
    .map((id) => document.getElementById(id)?.closest(".card"))
    .filter(Boolean);
}

function getAdvancedFields() {
  const ids = ["r-attrezzatura", "r-note-proc"];
  return ids
    .map((id) => document.getElementById(id)?.closest(".form-group"))
    .filter(Boolean);
}

function applyEditorMode(mode) {
  const semplice = mode === "semplice";

  getAdvancedCards().forEach((card) => {
    card.style.display = semplice ? "none" : "";
  });
  getAdvancedFields().forEach((fg) => {
    fg.style.display = semplice ? "none" : "";
  });

  const btnS = document.getElementById("btn-mode-semplice");
  const btnA = document.getElementById("btn-mode-avanzata");
  const on = "background:#0E5A7A;color:#fff;border:none;border-radius:9px;padding:8px 16px;font-size:14px;font-weight:700;cursor:pointer;";
  const off = "background:transparent;color:#334155;border:none;border-radius:9px;padding:8px 16px;font-size:14px;font-weight:700;cursor:pointer;";
  if (btnS) btnS.style.cssText = semplice ? on : off;
  if (btnA) btnA.style.cssText = semplice ? off : on;

  try { localStorage.setItem(EDITOR_MODE_KEY, mode); } catch {}
}

function initModeToggle() {
  const btnS = document.getElementById("btn-mode-semplice");
  const btnA = document.getElementById("btn-mode-avanzata");
  if (!btnS || !btnA) return;

  btnS.addEventListener("click", () => applyEditorMode("semplice"));
  btnA.addEventListener("click", () => applyEditorMode("avanzata"));

  // Route "crea-ricetta-avanzata" forza avanzata; altrimenti ultima scelta o semplice
  let mode = "semplice";
  if ((window.location.hash || "").includes("crea-ricetta-avanzata")) {
    mode = "avanzata";
  } else {
    try { mode = localStorage.getItem(EDITOR_MODE_KEY) || "semplice"; } catch {}
  }
  applyEditorMode(mode);
}

/* ============================================================
   PRODOTTI + AUTOCOMPLETE
============================================================ */
async function loadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um, unita_base, costo_medio, quantita_confezione, um_confezione, contenuto_confezione, um_costo")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  if (error) {
    console.error(error);
    prodottiCache = [];
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  // Calcola il costo per unità di RICETTA di ogni prodotto.
  // um_costo dice in che unità è espresso costo_medio (deriva dalle fatture):
  // - fattura a peso/volume (kg, gr, lt, ml) → costo_medio è già €/unità
  // - fattura a collo (pz) → costo_medio è €/collo: si divide per
  //   quantita_confezione (multipack) e poi per contenuto_confezione
  //   (es. sacco farina kg25 a €48 → 48/25 = €1,92/kg)
  prodottiCache.forEach(p => {
    let costo = Number(p.costo_medio ?? 0);
    const qtaConfezione = Number(p.quantita_confezione ?? 0);
    const contenuto = Number(p.contenuto_confezione ?? 0);
    const umCosto = normUm(p.um_costo);
    const umConf = normUm(p.um_confezione);

    if (["kg", "gr", "lt", "ml"].includes(umCosto)) {
      p._costo_per_unita = costo;
      p._um_unitaria = umCosto;
    } else {
      if (qtaConfezione > 1) costo = costo / qtaConfezione;
      if (contenuto > 0 && ["kg", "gr", "lt", "ml"].includes(umConf)) {
        p._costo_per_unita = costo / contenuto;
        p._um_unitaria = umConf;
      } else {
        p._costo_per_unita = costo;
        p._um_unitaria = normUm(p.unita_base || p.um) || "pz";
      }
    }
  });
  prodottiMap = new Map(prodottiCache.map(p => [String(p.id), p]));

setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest"),
    (p) => {
      const umSel = document.getElementById("r-output-um");
      if (p?.um && umSel) {
        const val = String(p.um).toLowerCase();
        const ok = ["kg", "gr", "pz", "l", "ml"].includes(val);
        if (ok) umSel.value = val;
      }
      aggiornaOutputInfo();
    }
  );
}

/* ============================================================
   CATEGORIE PORTATA
============================================================ */
async function loadCategoriePortata() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("categorie_portata")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .order("nome");

  if (error) {
    console.error(error);
    categoriePortataCache = [];
    categoriePortataMap = new Map();
    return;
  }

  categoriePortataCache = data || [];
  categoriePortataMap = new Map(categoriePortataCache.map(c => [String(c.id), c]));

  setupCategoriaAutocomplete();
}
/* ============================================================
   DISPOSITIVI
============================================================ */
async function loadDispositivi() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("dispositivi")
    .select("id, nome, tipo, marca, modello, connesso, temperatura_min, temperatura_max")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (error) {
    console.warn("loadDispositivi:", error.message);
    dispositividCache = [];
    return;
  }
  dispositividCache = data || [];
}

function buildDispositvoOptions(selectedId = "") {
  const nessuno = `<option value="">— Nessun dispositivo (manuale) —</option>`;
  if (!dispositividCache.length) return nessuno;
  return nessuno + dispositividCache.map(d => {
    const badge = d.connesso ? "🤖 AUTO" : "✋ manuale";
    const label = `${d.nome}${d.marca ? ` (${d.marca})` : ""} — ${badge}`;
    return `<option value="${d.id}" ${String(d.id) === String(selectedId) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

/* ============================================================
   FASI TEMPLATE
============================================================ */
async function loadFasiTemplate() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("fasi_template")
    .select("id, titolo, descrizione_operativa, tipo_fase, durata_min_default, lavoro_umano_min_default, tecnologia_default, temperatura_default, richiede_conferma, parametri")
    .eq("azienda_id", aziendaId)
    .eq("attiva", true)
    .order("titolo");

  if (error) {
    console.error(error);
    fasiTemplateCache = [];
    fasiTemplateMap = new Map();
    return;
  }

  fasiTemplateCache = data || [];
  fasiTemplateMap = new Map(fasiTemplateCache.map(t => [String(t.id), t]));
}

function rebuildFasiTemplateOptions(selectEl, tipoFase = null, selectedId = "") {
  if (!selectEl) return;

  const selId = selectedId ? String(selectedId) : "";

  const baseOpt = `<option value="">— Nessun template —</option>`;
  const opts = (fasiTemplateCache || [])
    .filter(t => !tipoFase || String(t.tipo_fase || "") === String(tipoFase || ""))
    .map(t => `<option value="${t.id}">${escapeHtml(t.titolo)}</option>`)
    .join("");

  selectEl.innerHTML = baseOpt + opts;
  if (selId) selectEl.value = selId;
}


function setupAutocomplete(input, hidden, suggestBox, onPick = null) {
  if (!_autocompleteDocBound) {
    _autocompleteDocBound = true;
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".suggest-list.open").forEach(box => {
        const wrap = box.closest(".input-wrap") || box.parentElement;
        if (wrap && !wrap.contains(e.target)) box.classList.remove("open");
      });
    });
  }

  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 2) {
      suggestBox.classList.remove("open");
      return;
    }

    const risultati = prodottiCache
      .filter(p => (p.descrizione || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(p => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = p.descrizione;

      div.onclick = () => {
        input.value = p.descrizione;
        hidden.value = p.id;
        suggestBox.innerHTML = "";
        suggestBox.classList.remove("open");
        if (typeof onPick === "function") onPick(p);
      };

      suggestBox.appendChild(div);
    });

    suggestBox.classList.add("open");
  });
}


function setupCategoriaAutocomplete() {
  const input = document.getElementById("r-categoria-search");
  const hidden = document.getElementById("r-categoria-id");
  const suggestBox = document.getElementById("r-categoria-suggest");

  if (!input || !hidden || !suggestBox) return;

  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 1) {
      suggestBox.classList.remove("open");
      return;
    }

    const risultati = categoriePortataCache
      .filter(c => (c.nome || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(c => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = c.nome;

      div.onclick = () => {
        input.value = c.nome;
        hidden.value = c.id;
        suggestBox.innerHTML = "";
        suggestBox.classList.remove("open");
      };

      suggestBox.appendChild(div);
    });

    suggestBox.classList.add("open");
  });

  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const nome = (input.value || "").trim();
    if (!nome) return;

    const esistente = categoriePortataCache.find(c =>
      String(c.nome || "").toLowerCase() === nome.toLowerCase()
    );

    if (esistente) {
      input.value = esistente.nome;
      hidden.value = esistente.id;
      suggestBox.innerHTML = "";
      suggestBox.classList.remove("open");
      return;
    }

    const supabase = window.supabaseClient;
    const aziendaId = window.state.azienda.id;

    const { data, error } = await supabase
      .from("categorie_portata")
      .insert({
        azienda_id: aziendaId,
        nome
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error(error);
      return alert("Errore creazione categoria portata.");
    }

    categoriePortataCache.push(data);
    categoriePortataMap.set(String(data.id), data);

    input.value = data.nome;
    hidden.value = data.id;
    suggestBox.innerHTML = "";
    suggestBox.classList.remove("open");
  });
}

async function uploadFotoRicetta(file) {
  if (!file) return null;

  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const ext = String(file.name || "").split(".").pop().toLowerCase();
  const allowed = ["jpg", "jpeg", "png", "webp"];

  if (!allowed.includes(ext)) {
    alert("Formato immagine non supportato. Usa JPG, PNG o WEBP.");
    return null;
  }

  const path = `${aziendaId}/ricetta_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase
    .storage
    .from("ricette")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined
    });

  if (uploadError) {
    // Bucket "ricette" non ancora creato su Supabase Storage — skip silenzioso
    console.warn("Upload foto ricetta non disponibile:", uploadError.message);
    return null;
  }

  const { data } = supabase
    .storage
    .from("ricette")
    .getPublicUrl(path);

  return data?.publicUrl || null;
}

function aggiornaOutputInfo() {
  const outId = document.getElementById("r-output-id")?.value;
  const outInfo = document.getElementById("r-output-info");

  if (outInfo) {
    if (!outId) {
      outInfo.innerText = "Nessun prodotto output selezionato";
    } else {
      const p = prodottiMap.get(String(outId));
      outInfo.innerText = p ? `Output: ${p.descrizione} — UM: ${p.um || "-"}` : "Prodotto output selezionato";
    }
  }

  aggiornaFoodCostLive();
}

// Ricalcola il food cost IN TEMPO REALE (senza salvare) leggendo lo stato
// corrente del form — prima il food cost si vedeva solo DOPO aver premuto
// Salva, ora si aggiorna mentre aggiungi/modifichi ingredienti.
function aggiornaFoodCostLive() {
  const prev = document.getElementById("r-cost-preview");
  if (!prev) return;

  const ingredientRows = [];
  document.querySelectorAll("#ingredienti-container .azienda-card").forEach(r => {
    const pid = (r.querySelector(".ing-id")?.value || "").trim();
    const qta = toNumOrNull(r.querySelector(".ing-qta")?.value);
    if (!pid || !qta || qta <= 0) return;
    const p = prodottiMap.get(String(pid));
    const um = (r.querySelector(".ing-um")?.value || p?.um || "pz");
    ingredientRows.push({ prodotto_id: Number(pid), quantita: qta, unita_misura: um });
  });

  if (!ingredientRows.length) {
    prev.innerText = "Food cost: — (aggiungi almeno un ingrediente)";
    return;
  }

  const output_peso = toNumOrNull(getVal("r-output-peso"));
  const output_um = getVal("r-output-um");

  const computed = computeCostoIndustriale({
    outputPrincipale: { peso: output_peso || 1, um: output_um || "kg" },
    ingredienti: ingredientRows,
    outputSecondariDom: []
  });

  if (!output_peso) {
    prev.innerText = `Food cost materia prima: € ${formatMoney(computed.costoTotaleInput)} (inserisci la resa/output per il costo unitario)`;
  } else if (computed.ok) {
    prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — Costo unitario output: € ${formatMoney(computed.costoUnitarioPrincipale)} / ${computed.baseUnitLabel}`;
  } else {
    prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — ${computed.warning || "Verifica unità output/ingredienti"}`;
  }
}

/* ============================================================
   MINI-TAB FASI
============================================================ */
function initFasiTabs() {
  const tabs = document.querySelectorAll(".fase-tab");
  if (!tabs.length) return;

  // default
  if (!faseTabAttiva) faseTabAttiva = "preparazione";

  tabs.forEach(btn => {
    btn.onclick = () => {
      faseTabAttiva = btn.dataset.tab || "preparazione";
      refreshFasiTabUI();
      filterFasiByTab();
    };
  });

  refreshFasiTabUI();
}

function refreshFasiTabUI() {
  document.querySelectorAll(".fase-tab").forEach(btn => {
    const isActive = (btn.dataset.tab === faseTabAttiva);

    // attiva = bottone standard, inattive = gray (nessun colore nuovo)
    btn.className = isActive
      ? "app-button small"
      : "app-button small gray";
  });
}

function filterFasiByTab() {
  const rows = document.querySelectorAll("#fasi-container .azienda-card");
  rows.forEach(row => {
    const tipo = row.dataset.tipoFase || "preparazione";
    row.style.display = (tipo === faseTabAttiva) ? "" : "none";
  });
}

/* ============================================================
   INGREDIENTI
============================================================ */

/* ============================================================
   🔍 FUZZY MATCH — trova prodotti simili nel magazzino
   Ritorna lista ordinata per score (0-100)
============================================================ */
function trovaProdottiSimili(nomeRicercato, maxRisultati = 5) {
  if (!nomeRicercato || !prodottiCache.length) return [];
  const q = nomeRicercato.toLowerCase().trim();
  const parole = q.split(/\s+/).filter(p => p.length > 2);

  const scored = prodottiCache.map(p => {
    const nome = (p.descrizione || p.nome || "").toLowerCase();
    let score = 0;

    // Match esatto
    if (nome === q) { score = 100; }
    // Contiene la stringa intera
    else if (nome.includes(q)) { score = 80; }
    else if (q.includes(nome) && nome.length > 3) { score = 70; }
    else {
      // Match per parole chiave
      const paroleTrovate = parole.filter(pw => nome.includes(pw));
      score += paroleTrovate.length * 20;
      // Match prime lettere
      if (nome.startsWith(q.substring(0, 3))) score += 15;
      // Levenshtein semplice sui primi 8 caratteri
      const a = q.substring(0, 8), b = nome.substring(0, 8);
      let dist = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] !== b[i]) dist++;
      }
      score += Math.max(0, 15 - dist * 5);
    }

    return { prodotto: p, score };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxRisultati);

  return scored;
}

// Precompila campo search e apre dropdown con candidati
function precompilaCampoConFuzzy(ingSearch, ingHidden, ingSuggest, nomeTony, umSel, onPick) {
  if (!nomeTony) return;

  const candidati = trovaProdottiSimili(nomeTony, 6);
  const matchEsatto = candidati.length > 0 && candidati[0].score >= 70
    ? candidati[0].prodotto : null;

  if (matchEsatto) {
    // Match sicuro: preseleziona direttamente
    ingSearch.value = matchEsatto.descrizione || matchEsatto.nome || nomeTony;
    ingHidden.value = matchEsatto.id;
    if (umSel) {
      const val = normUm(matchEsatto._um_unitaria || matchEsatto.um);
      if (["kg","gr","pz","lt","ml"].includes(val)) umSel.value = val;
    }
    ingSearch.style.borderColor = "#16a34a";
    ingSearch.title = "✅ Trovato nel magazzino";
    if (typeof onPick === "function") onPick(matchEsatto);
  } else {
    // Match incerto: precompila il nome e mostra dropdown con candidati
    ingSearch.value = nomeTony;
    ingHidden.value = "";
    ingSearch.style.borderColor = "#f59e0b";
    ingSearch.style.background = "#fffbeb";
    ingSearch.title = "⚠️ Non trovato esatto — scegli dal menu o cerca manualmente";

    if (candidati.length > 0) {
      ingSuggest.innerHTML = candidati.map(({prodotto: p, score}) => {
        const um = p.um || p.unita_base || "";
        const costoMedio = p._costo_per_unita ? ` — €${Number(p._costo_per_unita).toFixed(2)}/${p._um_unitaria || um}` : "";
        const badge = score >= 50
          ? `<span style="background:#dcfce7;color:#15803d;font-size:10px;padding:1px 5px;border-radius:8px;margin-left:4px;">simile</span>`
          : `<span style="background:#f3f4f6;color:#6b7280;font-size:10px;padding:1px 5px;border-radius:8px;margin-left:4px;">cerca</span>`;
        return `<div data-pid="${escapeHtml(String(p.id))}" data-pnome="${escapeHtml(p.descrizione||p.nome||"")}" data-pum="${escapeHtml(um)}"
          style="padding:8px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
          <span>${escapeHtml(p.descrizione||p.nome||"")}${badge}</span>
          <span style="color:#6b7280;font-size:11px;">${costoMedio}</span>
        </div>`;
      }).join("") +
      `<div style="padding:6px 10px;font-size:11px;color:#9ca3af;border-top:1px solid #f1f5f9;">
        oppure digita per cercare altri prodotti
      </div>`;

      ingSuggest.classList.add("open");

      // Bind click sulle opzioni
      ingSuggest.querySelectorAll("[data-pid]").forEach(item => {
        item.addEventListener("click", e => {
          e.stopPropagation();
          const p = prodottiCache.find(x => String(x.id) === item.dataset.pid);
          if (!p) return;
          ingSearch.value = p.descrizione || p.nome || "";
          ingHidden.value = p.id;
          ingSearch.style.borderColor = "#16a34a";
          ingSearch.style.background = "";
          ingSearch.title = "✅ Trovato nel magazzino";
          ingSuggest.classList.remove("open");
          if (umSel) {
            const val = normUm(p._um_unitaria || p.um);
            if (["kg","gr","pz","lt","ml"].includes(val)) umSel.value = val;
          }
          if (typeof onPick === "function") onPick(p);
        });
      });
    } else {
      // Nessun candidato — suggerisce ricerca manuale
      ingSuggest.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:#f59e0b;">
        ⚠️ "${escapeHtml(nomeTony)}" non trovato nel magazzino — digita per cercare
      </div>`;
      ingSuggest.classList.add("open");
    }
  }
}

function aggiungiIngrediente(initial = {}) {
  const container = document.getElementById("ingredienti-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">Ingrediente</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="app-button tiny" type="button" data-action="up">↑</button>
        <button class="app-button tiny" type="button" data-action="down">↓</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label>Prodotto / ingrediente *</label>
        <div class="input-wrap">
          <input class="ing-search input"
            placeholder="Cerca prodotto..."
            autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="ing-id" type="hidden" value="${escapeAttr(initial.prodotto_id ?? "")}" />
          <div class="ing-suggest suggest-list"></div>
        </div>
      </div>

      <div class="form-group">
        <label>Quantità *</label>
        <input class="ing-qta input" type="number" step="0.001" value="${escapeAttr(initial.quantita ?? "")}" />
      </div>

      <div class="form-group">
        <label>UM *</label>
        <select class="ing-um input">
          <option value="kg">kg</option>
          <option value="gr">gr</option>
          <option value="pz">pz</option>
          <option value="lt">lt</option>
          <option value="ml">ml</option>
        </select>
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Note (opz.)</label>
        <input class="ing-note input" value="${escapeAttr(initial.note || "")}" />
      </div>
    </div>
  `;

  // riordino
  card.querySelector('[data-action="up"]').addEventListener("click", () => {
    const prev = card.previousElementSibling;
    if (prev) container.insertBefore(card, prev);
    rinumeraOrdineIngredienti();
  });
  card.querySelector('[data-action="down"]').addEventListener("click", () => {
    const next = card.nextElementSibling;
    if (next) container.insertBefore(next, card);
    rinumeraOrdineIngredienti();
  });

  card.querySelector('[data-action="delete"]').addEventListener("click", () => {
    card.remove();
    rinumeraOrdineIngredienti();
    aggiornaOutputInfo();
  });

  const umSel = card.querySelector(".ing-um");
  umSel.value = (initial.unita_misura || "kg").toLowerCase();

  const ingSearch = card.querySelector(".ing-search");
  const ingHidden = card.querySelector(".ing-id");
  const ingSuggest = card.querySelector(".ing-suggest");

  setupAutocomplete(ingSearch, ingHidden, ingSuggest, (p) => {
    if (p?.um && umSel) {
      const val = String(p.um).toLowerCase();
      const ok = ["kg", "gr", "pz", "l", "ml"].includes(val);
      if (ok) umSel.value = val;
    }
    // Reset stile fuzzy quando l'utente sceglie manualmente
    ingSearch.style.borderColor = "#16a34a";
    ingSearch.style.background = "";
    aggiornaOutputInfo();
  });

  // Se viene da Tony con nome non trovato → fuzzy precompila
  if (initial._nome_tony && !initial.prodotto_id) {
    // Ritardo minimo per assicurarsi che il DOM sia pronto
    setTimeout(() => {
      precompilaCampoConFuzzy(ingSearch, ingHidden, ingSuggest, initial._nome_tony, umSel, (p) => {
        aggiornaOutputInfo();
      });
    }, 30);
  }

  // aggiorna food cost su change qty/um
  card.querySelector(".ing-qta").addEventListener("input", () => aggiornaOutputInfo());
  umSel.addEventListener("change", () => aggiornaOutputInfo());

  container.appendChild(card);
  rinumeraOrdineIngredienti();
}

function rinumeraOrdineIngredienti() {
  const container = document.getElementById("ingredienti-container");
  if (!container) return;
  // non abbiamo campo ordine visibile: l'ordine verrà salvato in base alla posizione DOM
}


/* ============================================================
   FASI
============================================================ */
function aggiungiFase(initial = {}) {
  const container = document.getElementById("fasi-container");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "14px";
  card.style.padding = "16px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div class="fase-title" style="font-weight:700; font-size:18px;">Fase</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button class="app-button tiny" type="button" data-action="up">↑</button>
        <button class="app-button tiny" type="button" data-action="down">↓</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="form-grid" style="margin-top:12px;">
      
      <div class="form-group" style="grid-column:1/-1;">
        <label>Descrizione operativa</label>
        <textarea class="fase-descrizione input" rows="4" placeholder="Istruzioni operative per l’operatore...">${escapeHtml(initial.descrizione_operativa || "")}</textarea>
      </div>

      <div class="form-group">
        <label>Durata totale (min)</label>
        <input class="fase-durata input" type="number" min="0" value="${escapeAttr(initial.durata_min ?? 0)}" />
      </div>

      <div class="form-group">
        <label>Lavoro umano (min)</label>
        <input class="fase-lavoro input" type="number" min="0" value="${escapeAttr(initial.lavoro_umano_min ?? 0)}" />
      </div>

      <div class="form-group">
        <label>Dispositivo</label>
        <select class="fase-dispositivo input">
          ${buildDispositvoOptions(initial.dispositivo_id || "")}
        </select>
        <div class="fase-dispositivo-badge" style="margin-top:4px;font-size:12px;"></div>
      </div>

      <div class="form-group">
        <label>Attrezzatura (testo libero)</label>
        <input class="fase-tecnologia input" value="${escapeAttr(initial.tecnologia || "")}" placeholder="Es. teglia inox, sac à poche..." />
      </div>

      <div class="form-group">
        <label>Temperatura (°C)</label>
        <input class="fase-temperatura input" type="number" step="0.1" value="${escapeAttr(initial.temperatura ?? "")}" />
      </div>

      <div class="form-group">
        <label>Tipo fase</label>
        <select class="fase-tipo input">
          <option value="preparazione">preparazione</option>
          <option value="cottura">cottura</option>
          <option value="attesa">attesa</option>
          <option value="raffreddamento">raffreddamento</option>
        </select>
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Note (opz.)</label>
        <input class="fase-note input" value="${escapeAttr(initial.note || "")}" />
      </div>
    </div>
  `;

  const selTipo = card.querySelector(".fase-tipo");
  if (selTipo) selTipo.value = initial.tipo_fase || "preparazione";

  const btnUp = card.querySelector('[data-action="up"]');
  const btnDown = card.querySelector('[data-action="down"]');
  const btnDel = card.querySelector('[data-action="delete"]');

  if (btnUp) btnUp.addEventListener("click", () => {
    const prev = card.previousElementSibling;
    if (prev) container.insertBefore(card, prev);
    renumberFasi();
  });

  if (btnDown) btnDown.addEventListener("click", () => {
    const next = card.nextElementSibling;
    if (next) container.insertBefore(next, card);
    renumberFasi();
  });

  if (btnDel) btnDel.addEventListener("click", () => {
    card.remove();
    renumberFasi();
  });

  container.appendChild(card);
  renumberFasi();

  // Badge ibrido dispositivo
  const selDisp = card.querySelector(".fase-dispositivo");
  const badgeDisp = card.querySelector(".fase-dispositivo-badge");
  function aggiornaBadgeDisp() {
    const id = selDisp?.value;
    if (!id) { if (badgeDisp) badgeDisp.innerHTML = ""; return; }
    const d = dispositividCache.find(x => String(x.id) === String(id));
    if (!d || !badgeDisp) return;
    badgeDisp.innerHTML = `<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:20px;">✋ Manuale — il cuoco inserirà i dati in produzione</span>`;
    // Precompila temperatura prevista se il dispositivo ha soglie
    const tempEl = card.querySelector(".fase-temperatura");
    if (tempEl && !tempEl.value && d.temperatura_min != null) {
      tempEl.value = d.temperatura_min;
    }
  }
  selDisp?.addEventListener("change", aggiornaBadgeDisp);
  aggiornaBadgeDisp(); // esegui subito se c'è già un valore
}

const TIPO_FASE_LABELS = {
  preparazione: "🔪 Preparazione",
  cottura: "🔥 Cottura",
  attesa: "⏳ Attesa / Riposo",
  raffreddamento: "❄️ Raffreddamento"
};

function renumberFasi() {
  const rows = document.querySelectorAll("#fasi-container .azienda-card");
  rows.forEach((card, idx) => {
    const t = card.querySelector(".fase-title");
    const tipoSel = card.querySelector(".fase-tipo");
    const tipo = tipoSel?.value || "preparazione";
    const label = TIPO_FASE_LABELS[tipo] || tipo;
    if (t) t.textContent = `Fase ${idx + 1} — ${label}`;
    card.dataset.tipoFase = tipo;
  });
}



/* ============================================================
   COPRODOTTI / OUTPUT SECONDARI (Area economica tecnica)
   Nota: la parte economica è gestita in amministrazione, ma qui
   teniamo i coprodotti per la resa e lo scarico/costo materia.
============================================================ */
function aggiungiOutputSecondario(initial = {}) {
  const container = document.getElementById("output-secondari-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">Coprodotto</div>
     <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label>Prodotto coprodotto *</label>
        <div class="input-wrap">
          <input class="out2-search input"
            placeholder="Cerca prodotto..."
            autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="out2-id" type="hidden" value="${escapeAttr(initial.prodotto_id ?? "")}" />
          <div class="out2-suggest suggest-list"></div>
        </div>
      </div>

      <div class="form-group">
        <label>Peso *</label>
        <input class="out2-peso input" type="number" step="0.001" value="${escapeAttr(initial.peso ?? "")}" />
      </div>

      <div class="form-group">
        <label>UM *</label>
        <select class="out2-um input">
          <option value="kg">kg</option>
          <option value="gr">gr</option>
          <option value="pz">pz</option>
        </select>
      </div>

      <div class="form-group">
        <label>Metodo allocazione</label>
        <select class="out2-metodo input">
          <option value="peso">peso</option>
          <option value="percentuale">percentuale</option>
        </select>
      </div>

      <div class="form-group">
        <label>% allocazione (se percentuale)</label>
        <input class="out2-percent input" type="number" step="0.01" min="0" max="100" value="${escapeAttr((initial.percentuale_allocazione != null) ? (Number(initial.percentuale_allocazione) * 100) : "")}" />
      </div>
    </div>
  `;

  card.querySelector('[data-action="delete"]').addEventListener("click", () => card.remove());

  // default values
  card.querySelector(".out2-um").value = (initial.unita_misura || "kg").toLowerCase();
  card.querySelector(".out2-metodo").value = (initial.metodo_allocazione || "peso");

  const s = card.querySelector(".out2-search");
  const hid = card.querySelector(".out2-id");
  const sug = card.querySelector(".out2-suggest");
  setupAutocomplete(s, hid, sug, (p) => {
    if (p?.um) {
      const val = String(p.um).toLowerCase();
      const ok = ["kg", "gr", "pz"].includes(val);
      if (ok) card.querySelector(".out2-um").value = val;
    }
  });

  // abilita/disabilita percent
  const metodoSel = card.querySelector(".out2-metodo");
  const percInp = card.querySelector(".out2-percent");
  const syncPerc = () => {
    const isPerc = metodoSel.value === "percentuale";
    percInp.disabled = !isPerc;
    if (!isPerc) percInp.value = "";
  };
  metodoSel.addEventListener("change", syncPerc);
  syncPerc();

  container.appendChild(card);
}


/* ============================================================
   CONSERVAZIONE
============================================================ */
function aggiungiScenarioConservazione(initial = {}, passaggi = []) {
  const container = document.getElementById("conservazione-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  const titolo = initial.scenario_label || "";
  const shelf = (initial.shelf_life_giorni ?? "") === null ? "" : (initial.shelf_life_giorni ?? "");
  const attivoVal = String(initial.attivo ?? true);

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">
        Scenario conservazione
      </div>
      <div style="display:flex; gap:8px;">
        <button class="app-button tiny" type="button" data-action="toggle">▾</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="cons-body" style="margin-top:10px;">
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nome scenario *</label>
          <input class="cons-label input" value="${escapeAttr(titolo)}" placeholder="Es: Abbattimento +3°C / Abbattimento -18°C / Sottovuoto frigo..." />
        </div>

        <div class="form-group">
          <label>Shelf life (giorni) *</label>
          <input class="cons-shelf input" type="number" min="0" value="${escapeAttr(shelf)}" />
        </div>

        <div class="form-group">
          <label>Attivo</label>
          <select class="cons-attivo input">
            <option value="true">sì</option>
            <option value="false">no</option>
          </select>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Note (opz.)</label>
          <input class="cons-note input" value="${escapeAttr(initial.note || "")}" />
        </div>
      </div>

      <div style="margin-top:14px; font-weight:700;">Passaggi (post-cottura)</div>
      <div class="cons-passaggi" style="margin-top:8px;"></div>

      <div class="form-actions" style="margin-top:10px;">
        <button class="app-button secondary" type="button" data-action="add-passaggio">
          + Aggiungi passaggio
        </button>
      </div>
    </div>
  `;

  card.querySelector(".cons-attivo").value = attivoVal;

  // toggle collapse
  const body = card.querySelector(".cons-body");
  const btnToggle = card.querySelector('[data-action="toggle"]');
  if (btnToggle && body) {
    btnToggle.addEventListener("click", () => {
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "" : "none";
      btnToggle.textContent = isHidden ? "▾" : "▸";
    });
  }

  // delete
  card.querySelector('[data-action="delete"]').addEventListener("click", () => card.remove());

  // passaggi container
  const passContainer = card.querySelector(".cons-passaggi");

  // render existing passaggi
  if (Array.isArray(passaggi) && passaggi.length) {
    // group by posizione then by gruppo_alternativa
    const sorted = [...passaggi].sort((a,b) => {
      const pa = a.posizione ?? 0, pb = b.posizione ?? 0;
      if (pa !== pb) return pa - pb;
      const ga = a.gruppo_alternativa ?? 0, gb = b.gruppo_alternativa ?? 0;
      if (ga !== gb) return ga - gb;
      return String(a.titolo||"").localeCompare(String(b.titolo||""));
    });
    sorted.forEach(p => aggiungiConservazionePassaggio(passContainer, p));
  }

  // add passaggio
  card.querySelector('[data-action="add-passaggio"]').addEventListener("click", () => {
    const nextPos = nextPosizionePassaggio(passContainer);
    aggiungiConservazionePassaggio(passContainer, { posizione: nextPos, gruppo_alternativa: null });
  });

  container.appendChild(card);
}

function nextPosizionePassaggio(passContainer) {
  let max = 0;
  passContainer.querySelectorAll(".cons-passaggio").forEach(r => {
    const pos = parseInt(r.dataset.posizione || "0", 10);
    if (pos > max) max = pos;
  });
  return max + 1;
}

function aggiungiConservazionePassaggio(passContainer, initial = {}) {
  const row = document.createElement("div");
  row.className = "cons-passaggio";
  row.style.border = "1px solid rgba(0,0,0,0.08)";
  row.style.borderRadius = "10px";
  row.style.padding = "12px";
  row.style.marginBottom = "10px";
  row.style.background = "rgba(255,255,255,0.6)";

  const posizione = initial.posizione ?? 1;
  const gruppo = initial.gruppo_alternativa ?? null;

  row.dataset.posizione = String(posizione);
  row.dataset.gruppo = (gruppo == null) ? "" : String(gruppo);

  const headerLabel = (gruppo == null)
    ? `Passaggio ${posizione}`
    : `Passaggio ${posizione} – Alternativa ${String.fromCharCode(65 + ((parseInt(gruppo,10) || 1) - 1))}`;

  row.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700;">${escapeHtml(headerLabel)}</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="app-button tiny" type="button" data-action="up">↑</button>
        <button class="app-button tiny" type="button" data-action="down">↓</button>
        <button class="app-button tiny" type="button" data-action="alt">+ Alternativa</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      
      <div class="form-group">
        <label>Tipo</label>
        <select class="cp-tipo input">
          <option value="abbattimento">abbattimento</option>
          <option value="confezionamento">confezionamento</option>
          <option value="pastorizzazione">pastorizzazione</option>
          <option value="stoccaggio">stoccaggio</option>
          <option value="altro">altro</option>
        </select>
      </div>

      <div class="form-group">
        <label>Attrezzatura</label>
        <input class="cp-attrezz input" value="${escapeAttr(initial.attrezzatura || "")}" placeholder="Es: teglia inox / roner / abbattitore..." />
      </div>

      <div class="form-group">
        <label>Temp (°C)</label>
        <input class="cp-temp input" type="number" step="0.1" value="${escapeAttr(initial.temperatura_c ?? "")}" />
      </div>

      <div class="form-group">
        <label>Durata (min)</label>
        <input class="cp-durata input" type="number" min="0" value="${escapeAttr(initial.durata_min ?? "")}" />
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Descrizione operativa (popup operatore)</label>
        <textarea class="cp-desc input" rows="2">${escapeHtml(initial.descrizione_operativa || "")}</textarea>
      </div>
    </div>
  `;

  row.querySelector(".cp-tipo").value = initial.tipo_passaggio || "altro";

  // actions
  row.querySelector('[data-action="delete"]').addEventListener("click", () => row.remove());

  row.querySelector('[data-action="up"]').addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev) passContainer.insertBefore(row, prev);
    rinumeraPassaggi(passContainer);
  });

  row.querySelector('[data-action="down"]').addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next) passContainer.insertBefore(next, row);
    rinumeraPassaggi(passContainer);
  });

  row.querySelector('[data-action="alt"]').addEventListener("click", () => {
    // crea alternativa nello stesso slot (stessa posizione) con gruppo incrementale
    const pos = parseInt(row.dataset.posizione || "1", 10);
    const existingGroups = [...passContainer.querySelectorAll(`.cons-passaggio[data-posizione="${pos}"]`)]
      .map(el => parseInt(el.dataset.gruppo || "0", 10))
      .filter(n => n > 0);
    const nextGroup = (existingGroups.length ? Math.max(...existingGroups) : 0) + 1;
    const altRow = {
      posizione: pos,
      gruppo_alternativa: nextGroup,
      tipo_passaggio: row.querySelector(".cp-tipo").value,
      titolo: "",
      attrezzatura: "",
      temperatura_c: null,
      durata_min: null,
      descrizione_operativa: ""
    };
    // inserisci subito dopo
    const newEl = aggiungiConservazionePassaggio(passContainer, altRow);
    passContainer.insertBefore(newEl, row.nextElementSibling);
    rinumeraPassaggi(passContainer);
  });

  passContainer.appendChild(row);
  rinumeraPassaggi(passContainer);
  return row;
}

function rinumeraPassaggi(passContainer) {
  // Rinumera in base all'ordine visuale, mantenendo le alternative sullo stesso numero se hanno stessa data-posizione.
  // Se l'utente sposta un passaggio, aggiorniamo le posizioni in sequenza.
  let pos = 1;
  const rows = [...passContainer.querySelectorAll(".cons-passaggio")];

  // raggruppa per blocchi: ogni row che non è alternativa (gruppo vuoto) inizia un nuovo pos,
  // ma se un row ha gruppo >0 e la precedente ha stesso dataset.posizione, la lasciamo nello stesso pos.
  // Regola semplice: se una riga ha gruppo vuoto -> nuova posizione incrementale.
  // Se ha gruppo >0 -> usa la posizione della riga precedente con gruppo vuoto più vicina sopra.
  let currentPos = 0;
  rows.forEach(r => {
    const grp = parseInt(r.dataset.gruppo || "0", 10);
    if (!grp) {
      currentPos = pos++;
      r.dataset.posizione = String(currentPos);
    } else {
      r.dataset.posizione = String(currentPos || 1);
    }
    const header = r.querySelector("div > div");
    if (header) {
      const g = grp ? ` – Alternativa ${String.fromCharCode(65 + (grp - 1))}` : "";
      header.textContent = `Passaggio ${r.dataset.posizione}${g}`;
    }
  });
}


/* ============================================================
   PORZIONATURE
============================================================ */
function aggiungiPorzione(initial = {}) {
  const container = document.getElementById("porzioni-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">Porzione</div>
      <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label>Label porzione *</label>
        <input class="porz-label input" value="${escapeAttr(initial.label || "")}" placeholder="Es: Trattoria 200g / Ricevimento 120g / Vasetto 280g" />
      </div>

      <div class="form-group">
        <label>Peso porzione *</label>
        <input class="porz-peso input" type="number" min="0" step="0.001" value="${escapeAttr(initial.peso_porzione ?? "")}" />
      </div>

      <div class="form-group">
        <label>Unità misura *</label>
        <select class="porz-um input">
          <option value="gr">gr</option>
          <option value="kg">kg</option>
          <option value="pz">pz</option>
          <option value="ml">ml</option>
          <option value="lt">lt</option>
        </select>
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Note (opz.)</label>
        <input class="porz-note input" value="${escapeAttr(initial.note || "")}" />
      </div>

      <div class="form-group">
        <label>Attivo</label>
        <select class="porz-attivo input">
          <option value="true">sì</option>
          <option value="false">no</option>
        </select>
      </div>
    </div>
  `;

  card.querySelector(".porz-um").value = initial.unita_misura || "gr";
  card.querySelector(".porz-attivo").value = String(initial.attivo ?? true);
  card.querySelector('[data-action="delete"]').addEventListener("click", () => card.remove());

  container.appendChild(card);
}


/* ============================================================
   CARICA RICETTA COMPLETA
============================================================ */
async function caricaRicettaCompleta() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data: ricetta, error: errRic } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaId)
    .eq("azienda_id", aziendaId)
    .single();

  if (errRic || !ricetta) {
    console.error(errRic);
    alert("Ricetta non trovata o non accessibile.");
    window.location.hash = "#/ricettario";
    return;
  }

  setVal("r-nome", ricetta.nome || "");
  setVal("r-pezzi-base", ricetta.pezzi_base ?? "");
  setVal("r-descrizione", ricetta.descrizione || "");
  setVal("r-note-proc", ricetta.note_procedimento || "");
  setVal("r-foto-url", ricetta.foto_url || "");
  setVal("r-attrezzatura", ricetta.attrezzatura || "");
  if (ricetta.foto_url) {
    const fotoWrap = document.getElementById("r-foto-preview-wrap");
    const fotoImg = document.getElementById("r-foto-preview");
    if (fotoImg) fotoImg.src = ricetta.foto_url;
    if (fotoWrap) fotoWrap.style.display = "";
  }
  setVal("r-tipo", ricetta.tipo_ricetta || "base");
  setVal("r-categoria-id", ricetta.categoria_portata_id ? String(ricetta.categoria_portata_id) : "");
  if (ricetta.categoria_portata_id) {
    const cat = categoriePortataMap.get(String(ricetta.categoria_portata_id));
    if (cat) setVal("r-categoria-search", cat.nome || "");
  }
  const wrapCat = document.getElementById("categoria-wrapper");
  if (wrapCat) wrapCat.style.display = ((ricetta.tipo_ricetta || "base") === "finita") ? "" : "none";

  if (ricetta.prodotto_output_id) {
    const p = prodottiMap.get(String(ricetta.prodotto_output_id));
    if (p) {
      setVal("r-output-search", p.descrizione || "");
      setVal("r-output-id", p.id);
    } else {
      setVal("r-output-id", ricetta.prodotto_output_id);
    }
  }
  aggiornaOutputInfo();

  // ingredienti
  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId);

  ingredientiCache = ingredienti || [];
  document.getElementById("ingredienti-container").innerHTML = "";
  if (ingredientiCache.length) ingredientiCache.forEach(i => aggiungiIngrediente(i));
  else aggiungiIngrediente();

  // fasi
  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("ordine", { ascending: true });

  fasiCache = fasi || [];
  document.getElementById("fasi-container").innerHTML = "";
  if (fasiCache.length) fasiCache.forEach(f => aggiungiFase(f));
  else aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });

  // conservazione
  const { data: cons } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  conservazioniCache = cons || [];
  // passaggi conservazione (nuovo modello a fasi)
  conservazionePassaggiMap = new Map();
  const { data: consPass } = await supabase
    .from("ricette_conservazione_passaggi")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("ricette_conservazione_id", { ascending: true })
    .order("posizione", { ascending: true })
    .order("gruppo_alternativa", { ascending: true });

  (consPass || []).forEach(p => {
    const sid = String(p.ricette_conservazione_id);
    if (!conservazionePassaggiMap.has(sid)) conservazionePassaggiMap.set(sid, []);
    conservazionePassaggiMap.get(sid).push(p);
  });

  const consContainer = document.getElementById("conservazione-container");
  if (consContainer) consContainer.innerHTML = "";
  if (conservazioniCache.length) {
    conservazioniCache.forEach(c => {
      const passaggi = conservazionePassaggiMap.get(String(c.id)) || [];
      aggiungiScenarioConservazione(c, passaggi);
    });
  }
  else aggiungiScenarioConservazione();

  // output (1 record)
  const { data: output } = await supabase
    .from("ricette_output")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  outputCache = output || null;
  if (outputCache) {
    setVal("r-output-peso", outputCache.peso_finale ?? "");
    setVal("r-output-um", outputCache.unita_misura || "kg");
    setVal("r-output-note", outputCache.note || "");
  } else {
    setVal("r-output-peso", ricetta.peso_output_kg ?? "");
    setVal("r-output-um", "kg");
    setVal("r-output-note", "");
  }

  // output secondari
  const { data: out2 } = await supabase
    .from("ricette_output_secondari")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  outputSecondariCache = out2 || [];
  const out2Container = document.getElementById("output-secondari-container");
  if (out2Container) out2Container.innerHTML = "";
  if (outputSecondariCache.length) {
    outputSecondariCache.forEach(o => aggiungiOutputSecondario(o));
  }

  // porzioni
  const { data: porzioni } = await supabase
    .from("ricette_porzione")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  porzioniCache = porzioni || [];
  document.getElementById("porzioni-container").innerHTML = "";
  if (porzioniCache.length) porzioniCache.forEach(p => aggiungiPorzione(p));
  else aggiungiPorzione();

  const prev = document.getElementById("r-cost-preview");
  if (prev) {
    const cm = ricetta.costo_materia_prima ?? 0;
    prev.innerText = `Food cost (MP): € ${formatMoney(cm)} (snapshot)`;
  }
}

/* ============================================================
   SALVA TUTTO
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  if (!ricettaId) {
    if (!requirePermessi({ resource: "ricette", action: "create" })) {
      alert("Non hai i permessi per creare ricette.");
      return;
    }
  } else {
    if (!requirePermessi({ resource: "ricette", action: "update" })) {
      alert("Non hai i permessi per modificare ricette.");
      return;
    }
  }

  const nome = getVal("r-nome").trim();
  const pezzi_base = toIntOrNull(getVal("r-pezzi-base"));
  const descrizione = getVal("r-descrizione").trim() || null;
  const note_procedimento = getVal("r-note-proc").trim() || null;
  const foto_url = getVal("r-foto-url").trim() || null;
  const tipo_ricetta = getVal("r-tipo") || "base";
  const categoria_portata_id_raw = getVal("r-categoria-id");
  let categoria_portata_id = categoria_portata_id_raw
    ? Number(categoria_portata_id_raw)
    : null;
  if (!Number.isFinite(categoria_portata_id)) categoria_portata_id = null;


  const prodotto_output_id_raw = getVal("r-output-id");
  const prodotto_output_id = toBigIntOrNull(prodotto_output_id_raw);
  const output_peso = toNumOrNull(getVal("r-output-peso"));
  const output_um = getVal("r-output-um");
  const output_note = getVal("r-output-note").trim() || null;

  if (!nome) return alert("Nome ricetta obbligatorio.");

  if (tipo_ricetta === "finita" && !categoria_portata_id) {
    // Prova a creare categoria "Generale" come fallback
    try {
      const supaFallback = window.supabaseClient || window.supabase;
      let catFallback = categoriePortataCache.find(c => (c.nome||"").toLowerCase() === "generale");
      if (!catFallback) {
        const { data: nc } = await supaFallback
          .from("categorie_portata")
          .insert({ nome: "Generale", azienda_id: aziendaId })
          .select("id,nome").single();
        if (nc) { categoriePortataCache.push(nc); catFallback = nc; }
      }
      if (catFallback) {
        const hidden = document.getElementById("r-categoria-id");
        if (hidden) hidden.value = catFallback.id;
        categoria_portata_id = Number(catFallback.id) || null;
      } else {
        return alert("Seleziona la categoria portata (antipasti, primi, secondi...).");
      }
    } catch(e) {
      return alert("Seleziona la categoria portata (antipasti, primi, secondi...).");
    }
  }
  if (tipo_ricetta === "base" && categoria_portata_id) {
    return alert("Una ricetta BASE non può avere categoria portata.");
  }
  // Output non obbligatorio — si può salvare senza
  // if (!prodotto_output_id) return alert("Seleziona il prodotto output.");
  // if (!output_peso || output_peso <= 0) return alert("Inserisci il peso finale (resa) dell'output.");
  // if (!output_um) return alert("Seleziona unità misura output.");

  const esito = document.getElementById("r-esito");
  if (esito) esito.innerText = "Salvataggio in corso...";

  let savedId = ricettaId;

  if (!ricettaId) {
    const payload = cleanPayload({
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      azienda_id: aziendaId,
      sede_id: window.state?.sedeAttiva?.id || null,
      attivo: true,
      stato_strutturale: "bozza",
      tipo_ricetta,
      categoria_portata_id,
      creato_da: window.state?.user?.id || null,
      creato_da_tony: false
    });

    // prodotto_output_id è bigint e FK verso prodotti(id).
    // Lo inviamo solo se realmente selezionato e valido.
    if (prodotto_output_id !== null) {
      payload.prodotto_output_id = prodotto_output_id;
    }

    const { data, error } = await supabase
      .from("ricette")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("Errore salvataggio ricetta.", error, payload);
      if (esito) esito.innerText = "";
      return showSaveError("Errore salvataggio ricetta.", error);
    }

    savedId = String(data.id);
    ricettaId = savedId;
  } else {
    const payload = cleanPayload({
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      aggiornato_il: new Date().toISOString(),
      tipo_ricetta,
      categoria_portata_id,
      modificato_da: window.state?.user?.id || null,
      modificato_il: new Date().toISOString()
    });

    // prodotto_output_id è bigint e FK verso prodotti(id).
    // Lo inviamo solo se realmente selezionato e valido.
    if (prodotto_output_id !== null) {
      payload.prodotto_output_id = prodotto_output_id;
    }

    const { error } = await supabase
      .from("ricette")
      .update(payload)
      .eq("id", Number(ricettaId))
      .eq("azienda_id", aziendaId);

    if (error) {
      console.error("Errore aggiornamento ricetta.", error, payload);
      if (esito) esito.innerText = "";
      return showSaveError("Errore aggiornamento ricetta.", error);
    }
  }

  const ricettaIdNum = Number(savedId);

  // output principale
  {
    const payloadOut = {
      ricetta_id: ricettaIdNum,
      peso_finale: output_peso,
      unita_misura: normalizeUmForDb(output_um),
      note: output_note,
      azienda_id: aziendaId
    };

    const { error } = await supabase
      .from("ricette_output")
      .upsert(payloadOut, { onConflict: "ricetta_id" });

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      console.warn("Errore salvataggio output ricetta — non bloccante:", error);
    }
  }

  // output secondari
  {
    const { error: delOut2Err } = await supabase
      .from("ricette_output_secondari")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delOut2Err) {
      console.error(delOut2Err);
      if (esito) esito.innerText = "";
      return alert("Errore reset coprodotti.");
    }

    const out2Rows = [];
    document.querySelectorAll("#output-secondari-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".out2-id")?.value || "").trim();
      const peso = toNumOrNull(r.querySelector(".out2-peso")?.value);
      const um = (r.querySelector(".out2-um")?.value || "").trim();
      const metodo = (r.querySelector(".out2-metodo")?.value || "peso").trim();
      const perc = toNumOrNull(r.querySelector(".out2-percent")?.value);

      if (pid && peso && peso > 0 && um) {
        out2Rows.push({
          ricetta_id: ricettaIdNum,
          prodotto_id: Number(pid),
          peso,
          unita_misura: um,
          metodo_allocazione: metodo,
          percentuale_allocazione: (metodo === "percentuale" && perc != null)
            ? (Number(perc) / 100)
            : null,
          azienda_id: aziendaId
        });
      }
    });

    if (out2Rows.length) {
      const { error: insOut2Err } = await supabase
        .from("ricette_output_secondari")
        .insert(out2Rows);

      if (insOut2Err) {
        console.error(insOut2Err);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio coprodotti.");
      }
    }
  }

  // ingredienti
  let ingredientRowsForCost = [];
  {
    const { error: delErr } = await supabase
      .from("ricetta_ingredienti")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset ingredienti.");
    }

    const rows = [];
    document.querySelectorAll("#ingredienti-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".ing-id")?.value || "").trim();
      const nomeProd = (r.querySelector(".ing-search")?.value || "").trim();
      const qta = toNumOrNull(r.querySelector(".ing-qta")?.value);

      if (pid && qta && qta > 0) {
        const p = prodottiMap.get(String(pid));
        const um = (r.querySelector(".ing-um")?.value || p?.um || "pz");

        rows.push({
          ricetta_id: ricettaIdNum,
          prodotto_id: Number(pid),
          nome_prodotto: nomeProd || (p?.descrizione || ""),
          quantita: qta,
          unita_misura: um,
          azienda_id: aziendaId,
          mapping_stato: "ok"
        });

        ingredientRowsForCost.push({
          prodotto_id: Number(pid),
          quantita: qta,
          unita_misura: um
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricetta_ingredienti")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio ingredienti.");
      }
    }
  }

  // fasi (procedimento)
  {
    const { error: delFasiErr } = await supabase
      .from("ricette_preparazione_fasi")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delFasiErr) {
      console.error(delFasiErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset fasi.");
    }

    const rows = [];
    document.querySelectorAll("#fasi-container .azienda-card").forEach((r, idx) => {
      const ordine = idx + 1;
      const tipo_fase = (r.querySelector(".fase-tipo")?.value || "preparazione").trim();
      const nome_fase = (r.querySelector(".fase-tipo")?.value || "preparazione").trim();
      const descrizione_operativa = (r.querySelector(".fase-descrizione")?.value || "").trim() || null;
      const durata_min = toIntOrNull(r.querySelector(".fase-durata")?.value) ?? 0;
      const lavoro_umano_min = toIntOrNull(r.querySelector(".fase-lavoro")?.value) ?? 0;
      const tecnologia = (r.querySelector(".fase-tecnologia")?.value || "").trim() || null;
      const temperatura = toNumOrNull(r.querySelector(".fase-temperatura")?.value);
      const note = (r.querySelector(".fase-note")?.value || "").trim() || null;
      const dispositivo_id = r.querySelector(".fase-dispositivo")?.value || null;

      rows.push({
        ricetta_id: ricettaIdNum,
        ordine,
        nome_fase,
        tipo_fase,
        durata_min,
        lavoro_umano_min,
        tecnologia,
        temperatura,
        note,
        descrizione_operativa,
        dispositivo_id: dispositivo_id || null,
        richiede_conferma: false,
        fase_template_id: null,
        parametri: {},
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insFasiErr } = await supabase
        .from("ricette_preparazione_fasi")
        .insert(rows);

      if (insFasiErr) {
        console.error(insFasiErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio fasi.");
      }
    }
  }


  // conservazione (scenari + passaggi)
  {
    // reset passaggi prima (dipendono dagli scenari)
    const { error: delPassErr } = await supabase
      .from("ricette_conservazione_passaggi")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delPassErr) {
      console.error(delPassErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset passaggi conservazione.");
    }

    const { error: delConsErr } = await supabase
      .from("ricette_conservazione")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delConsErr) {
      console.error(delConsErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset conservazione.");
    }

    const scenarioDom = [...document.querySelectorAll("#conservazione-container .azienda-card")];

    const scenarioRows = [];
    scenarioDom.forEach(card => {
      const scenario_label = (card.querySelector(".cons-label")?.value || "").trim();
      const shelf_life_giorni = toIntOrNull(card.querySelector(".cons-shelf")?.value);
      const note = (card.querySelector(".cons-note")?.value || "").trim() || null;
      const attivo = (card.querySelector(".cons-attivo")?.value !== "false");

      if (!scenario_label) return;

      scenarioRows.push({
        ricetta_id: ricettaIdNum,
        scenario_label,
        shelf_life_giorni,
        note,
        attivo,
        azienda_id: aziendaId
      });
    });

    let insertedScenari = [];
    if (scenarioRows.length) {
      const { data: insData, error: insConsErr } = await supabase
        .from("ricette_conservazione")
        .insert(scenarioRows)
        .select("id, scenario_label");

      if (insConsErr) {
        console.error(insConsErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio conservazione.");
      }
      insertedScenari = insData || [];
    }

    // passaggi
    const passRows = [];
    // associamo per indice: i card DOM sono nello stesso ordine dei row inseriti (scenarioRows)
    let insIdx = 0;
    scenarioDom.forEach(card => {
      const scenario_label = (card.querySelector(".cons-label")?.value || "").trim();
      if (!scenario_label) return;

      const scenarioRecord = insertedScenari[insIdx++];
      if (!scenarioRecord?.id) return;

      const passContainer = card.querySelector(".cons-passaggi");
      if (!passContainer) return;

      // calcola gruppi alternativa per posizione: se esistono più righe con stessa posizione, assegna gruppo_alternativa 1..N
      const rows = [...passContainer.querySelectorAll(".cons-passaggio")];

      // mappa pos -> count alt encountered
      const posCounts = new Map();

      rows.forEach(r => {
        const posizione = toIntOrNull(r.dataset.posizione) || 1;

        // gruppo: se la riga ha dataset.gruppo (numero) usalo, altrimenti null (passaggio principale)
        let gruppo_alternativa = toIntOrNull(r.dataset.gruppo);
        if (!gruppo_alternativa) gruppo_alternativa = null;

        // Se esistono più righe con stesso pos e gruppo null, la seconda diventerebbe alt: preveniamo
        if (gruppo_alternativa == null) {
          const c = (posCounts.get(posizione) || 0) + 1;
          posCounts.set(posizione, c);
          if (c > 1) gruppo_alternativa = c - 1; // fallback
        }

        const titolo = (r.querySelector(".cp-tipo")?.value || "altro").trim();
        const tipo_passaggio = (r.querySelector(".cp-tipo")?.value || "altro").trim();
        const attrezzatura = (r.querySelector(".cp-attrezz")?.value || "").trim() || null;
        const temperatura_c = toNumOrNull(r.querySelector(".cp-temp")?.value);
        const durata_min = toIntOrNull(r.querySelector(".cp-durata")?.value);
        const descrizione_operativa = (r.querySelector(".cp-desc")?.value || "").trim() || null;

        

        passRows.push({
          azienda_id: aziendaId,
          ricette_conservazione_id: Number(scenarioRecord.id),
          ricetta_id: ricettaIdNum,
          posizione,
          gruppo_alternativa,
          titolo,
          tipo_passaggio,
          attrezzatura,
          temperatura_c,
          durata_min,
          descrizione_operativa,
          note: null,
          parametri: {}
        });
      });
    });

    if (passRows.length) {
      const { error: insPassErr } = await supabase
        .from("ricette_conservazione_passaggi")
        .insert(passRows);

      if (insPassErr) {
        console.error(insPassErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio passaggi conservazione.");
      }
    }
  }

  // porzionature
  {
    const { error: delPorzErr } = await supabase
      .from("ricette_porzione")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delPorzErr) {
      console.error(delPorzErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset porzionature.");
    }

    const rows = [];
    document.querySelectorAll("#porzioni-container .azienda-card").forEach(r => {
      const label = (r.querySelector(".porz-label")?.value || "").trim();
      const peso_porzione = toNumOrNull(r.querySelector(".porz-peso")?.value);
      const unita_misura = (r.querySelector(".porz-um")?.value || "gr").trim();
      const note = (r.querySelector(".porz-note")?.value || "").trim() || null;
      const attivo = (r.querySelector(".porz-attivo")?.value !== "false");

      if (!label) return;
      if (!peso_porzione || peso_porzione <= 0) return;

      rows.push({
        ricetta_id: ricettaIdNum,
        label,
        peso_porzione,
        unita_misura,
        note,
        attivo,
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insPorzErr } = await supabase
        .from("ricette_porzione")
        .insert(rows);

      if (insPorzErr) {
        console.error(insPorzErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio porzionature.");
      }
    }
  }


  // calcolo costo + snapshot ricetta
  const computed = computeCostoIndustriale({
    outputPrincipale: { peso: output_peso, um: output_um },
    ingredienti: ingredientRowsForCost,
    outputSecondariDom: readOutputSecondariFromDOM()
  });

  {
    const payloadSnap = {
      costo_materia_prima: computed.costoTotaleInput,
      costo_tot_snapshot: computed.costoTotaleInput,
      ultimo_ricalcolo: new Date().toISOString(),
      stato_costo: computed.ok ? "ok" : "warning"
    };

    const { error: upErr } = await supabase
      .from("ricette")
      .update(payloadSnap)
      .eq("id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (upErr) console.error(upErr);
  }

  const prev = document.getElementById("r-cost-preview");
  if (prev) {
    if (computed.ok) {
      prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — Costo unitario output: € ${formatMoney(computed.costoUnitarioPrincipale)} / ${computed.baseUnitLabel}`;
    } else {
      prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — ${computed.warning || "Verifica unità output/ingredienti"}`;
    }
  }

  {
    const hasIngredienteValido = Array.isArray(ingredientRowsForCost) && ingredientRowsForCost.length > 0;

    let hasFaseValida = false;
    document.querySelectorAll("#fasi-container .azienda-card").forEach(r => {
      const nomeFase = (r.querySelector(".fase-nome")?.value || "").trim();
      if (nomeFase) hasFaseValida = true;
    });

    const hasOutputProdotto = !!prodotto_output_id;
    const hasOutputPeso = !!output_peso && output_peso > 0;
    const hasOutputUm = !!output_um;

    const scheda_completa =
      hasIngredienteValido &&
      hasFaseValida &&
      hasOutputProdotto &&
      hasOutputPeso &&
      hasOutputUm;

    const stato_strutturale = scheda_completa ? "strutturata" : "bozza";

    const { error: strutturaErr } = await supabase
      .from("ricette")
      .update({
        scheda_completa,
        stato_strutturale,
        aggiornato_il: new Date().toISOString()
      })
      .eq("id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (strutturaErr) console.error(strutturaErr);
  }

  if (esito) esito.innerText = "Ricetta salvata";
  alert("Ricetta salvata");
  window.location.hash = "#/ricettario";
}

/* ============================================================
   COSTO INDUSTRIALE
============================================================ */
// UM canoniche Ristoflow: kg, gr, lt, ml, pz (g→gr, l/L/litri→lt)
function normUm(u) {
  const x = String(u || "").toLowerCase().trim();
  if (["g", "grammi", "grammo"].includes(x)) return "gr";
  if (["l", "litri", "litro"].includes(x)) return "lt";
  if (["pezzi", "pezzo", "nr", "n", "collo", "colli", "ct", "cf"].includes(x)) return "pz";
  return x;
}

// Converte una quantità tra unità dello stesso dominio (peso o volume).
// Ritorna null se le unità non sono compatibili (es. "pz" con "kg").
function convertQtyPerCosto(qty, fromUnit, toUnit) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return null;
  const f = normUm(fromUnit);
  const t = normUm(toUnit);
  if (!f || !t || f === t) return n;
  const pesoInGrammi = { kg: 1000, gr: 1 };
  const volumeInMl = { lt: 1000, ml: 1, cl: 10 };
  if (pesoInGrammi[f] && pesoInGrammi[t]) return n * pesoInGrammi[f] / pesoInGrammi[t];
  if (volumeInMl[f] && volumeInMl[t]) return n * volumeInMl[f] / volumeInMl[t];
  return null;
}

function computeCostoIndustriale({ outputPrincipale, ingredienti, outputSecondariDom }) {
  let costoTotale = 0;
  for (const r of (ingredienti || [])) {
    const p = prodottiMap.get(String(r.prodotto_id));
    // Usa _costo_per_unita che già tiene conto della divisione per quantità confezione
    // es. latte ct 6x1lt a €7 → _costo_per_unita = 7/6 = 1.167 €/lt
    const costoPerUnita = Number(p?._costo_per_unita ?? p?.costo_medio ?? 0);
    const qtaInserita = Number(r.quantita ?? 0);
    // FIX: prima si moltiplicava direttamente qtaInserita (nell'unità scelta
    // in riga, es. "gr") per costoPerUnita (nell'unità base prodotto, es.
    // "kg") senza convertire — con farina a sacchi da 25kg questo produceva
    // costi sballati di ordini di grandezza. Ora convertiamo la quantità
    // inserita nell'unità base del prodotto prima di moltiplicare.
    const qtaConvertita = convertQtyPerCosto(qtaInserita, r.unita_misura, p?._um_unitaria);
    const qta = qtaConvertita !== null ? qtaConvertita : qtaInserita;
    costoTotale += (costoPerUnita * qta);
  }

  const p1 = convertToBase(outputPrincipale.peso, outputPrincipale.um);
  if (!p1.ok) {
    return {
      ok: false,
      costoTotaleInput: round4(costoTotale),
      costoUnitarioPrincipale: 0,
      baseUnitLabel: "unità",
      warning: p1.warning
    };
  }

  let outputs = [{ kind: "principale", baseQty: p1.baseQty, unitLabel: p1.baseUnitLabel, metodo: "peso" }];

  for (const o of (outputSecondariDom || [])) {
    const conv = convertToBase(o.peso, o.unita_misura);
    if (!conv.ok || conv.baseUnitLabel !== p1.baseUnitLabel) {
      return {
        ok: false,
        costoTotaleInput: round4(costoTotale),
        costoUnitarioPrincipale: 0,
        baseUnitLabel: p1.baseUnitLabel,
        warning: "Unità coprodotti non coerenti con output (kg/g oppure l/ml oppure pz)."
      };
    }
    outputs.push({
      kind: "secondario",
      baseQty: conv.baseQty,
      metodo: o.metodo_allocazione,
      percentuale_allocazione: o.percentuale_allocazione
    });
  }

  const percentSecondari = outputs
    .filter(x => x.kind === "secondario" && x.metodo === "percentuale" && Number.isFinite(x.percentuale_allocazione))
    .reduce((a, x) => a + Number(x.percentuale_allocazione), 0);

  let costoPrincipale = costoTotale;

  if (percentSecondari > 0) {
    const perc = Math.max(0, Math.min(1, percentSecondari));
    costoPrincipale = costoTotale * (1 - perc);
  } else {
    const totBase = outputs.reduce((a, x) => a + (Number(x.baseQty) || 0), 0);
    if (totBase > 0) costoPrincipale = costoTotale * (p1.baseQty / totBase);
  }

  const costoUnitarioPrincipale = (p1.baseQty > 0) ? (costoPrincipale / p1.baseQty) : 0;

  return {
    ok: true,
    costoTotaleInput: round4(costoTotale),
    costoPrincipale: round4(costoPrincipale),
    costoUnitarioPrincipale: round4(costoUnitarioPrincipale),
    baseUnitLabel: p1.baseUnitLabel,
    warning: null
  };
}

function readOutputSecondariFromDOM() {
  const out = [];
  document.querySelectorAll("#output-secondari-container .azienda-card").forEach(r => {
    const pid = (r.querySelector(".out2-id")?.value || "").trim();
    const peso = toNumOrNull(r.querySelector(".out2-peso")?.value);
    const um = (r.querySelector(".out2-um")?.value || "").trim();
    const metodo = (r.querySelector(".out2-metodo")?.value || "peso").trim();
    const perc = toNumOrNull(r.querySelector(".out2-percent")?.value);

    if (pid && peso && peso > 0 && um) {
      out.push({
        prodotto_id: Number(pid),
        peso,
        unita_misura: um,
        metodo_allocazione: metodo,
        percentuale_allocazione: (metodo === "percentuale" && perc != null)
          ? (Number(perc) / 100)
          : null
      });
    }
  });
  return out;
}

function convertToBase(qty, um) {
  const u = String(um || "").toLowerCase().trim();
  const n = Number(qty ?? 0);

  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, warning: "Peso/Qtà output non valido." };
  }

  if (u === "kg") return { ok: true, baseQty: n * 1000, baseUnitLabel: "gr" };
  if (u === "gr") return { ok: true, baseQty: n, baseUnitLabel: "gr" };

  if (u === "l") return { ok: true, baseQty: n * 1000, baseUnitLabel: "ml" };
  if (u === "ml") return { ok: true, baseQty: n, baseUnitLabel: "ml" };

  if (u === "pz") return { ok: true, baseQty: n, baseUnitLabel: "pz" };

  return { ok: false, warning: "Unità output non supportata (usa kg/gr oppure l/ml oppure pz)." };
}

/* ============================================================
   BIND UI
============================================================ */
function bindUI() {
  safeOn("btn-add-ing", "click", () => aggiungiIngrediente());
  safeOn("btn-add-out2", "click", () => aggiungiOutputSecondario());
  safeOn("r-output-peso", "input", () => aggiornaFoodCostLive());
  safeOn("r-output-um", "change", () => aggiornaFoodCostLive());
  safeOn("btn-add-fase", "click", () =>
  aggiungiFase({
    tipo_fase: "preparazione",
    durata_min: 0,
    lavoro_umano_min: 0
  })
);
  // 🤖 Tony AI — tutte le sezioni
  safeOn("btn-tony-fasi", "click", () => apriModalTonyFasi());
  safeOn("btn-tony-ing", "click", () => apriModalTonyIngredienti());
  safeOn("btn-tony-anagrafica", "click", () => apriModalTony("anagrafica"));
  safeOn("btn-tony-output", "click", () => apriModalTony("output"));
  safeOn("btn-tony-porzionature", "click", () => apriModalTony("porzionature"));
  safeOn("btn-tony-conservazione", "click", () => apriModalTony("conservazione"));
  safeOn("btn-tony-coprodotti", "click", () => apriModalTony("coprodotti"));
  safeOn("btn-add-conservazione", "click", () => aggiungiScenarioConservazione());
  safeOn("btn-add-porzione", "click", () => aggiungiPorzione());
  safeOn("btn-salva", "click", () => salvaTutto());

  // Tipo ricetta -> mostra/nasconde categoria
  safeOn("r-tipo", "change", () => {
    const tipo = getVal("r-tipo") || "base";
    const wrap = document.getElementById("categoria-wrapper");
    if (wrap) wrap.style.display = (tipo === "finita") ? "" : "none";
    if (tipo !== "finita") {
      setVal("r-categoria-search", "");
      setVal("r-categoria-id", "");
    }
  });

  // init visibilità
  const wrapInit = document.getElementById("categoria-wrapper");
  const tipoInit = getVal("r-tipo") || "base";
  if (wrapInit) wrapInit.style.display = (tipoInit === "finita") ? "" : "none";

  // Autocomplete output (già inizializzato in loadProdotti) ma reinforziamo in caso di render tardivo
  const outSearch = document.getElementById("r-output-search");
  const outHidden = document.getElementById("r-output-id");
  const outSuggest = document.getElementById("r-output-suggest");
    if (outSearch && outHidden && outSuggest) {
    if (!outSearch.dataset.acBound) {
      outSearch.dataset.acBound = "1";
      setupAutocomplete(outSearch, outHidden, outSuggest, () => aggiornaOutputInfo());
    }
  }

  const fotoInput = document.getElementById("r-foto-file");
  if (fotoInput && !fotoInput.dataset.uploadBound) {
    fotoInput.dataset.uploadBound = "1";
    fotoInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = await uploadFotoRicetta(file);
      if (!url) return;

      setVal("r-foto-url", url);

      const wrap = document.getElementById("r-foto-preview-wrap");
      const img = document.getElementById("r-foto-preview");

      if (img) img.src = url;
      if (wrap) wrap.style.display = "";
    });
  }

  safeOn("btn-help", "click", () => {
    const box = document.getElementById("help-box");
    if (box) {
      box.style.display = box.style.display === "none" ? "block" : "none";
    }
  });

}


function nextOrdineFase() {
  return (document.querySelectorAll("#fasi-container .azienda-card").length || 0) + 1;
}


/* ============================================================
   HELPERS
============================================================ */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? (el.value ?? "") : "";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toBigIntOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  // Accetta solo ID numerici bigint. Evita UUID, stringhe vuote e NaN.
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function cleanPayload(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );
}

function normalizeUmForDb(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "g") return "gr";
  return s || null;
}

function showSaveError(titolo, error) {
  const dettagli = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code ? `Codice: ${error.code}` : null
  ].filter(Boolean).join("\n");
  alert(`${titolo}\n${dettagli || "Errore sconosciuto. Controlla la console."}`);
}

function safeOn(id, evt, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(evt, fn);
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

function round4(n) {
  const x = Number(n ?? 0);
  return Math.round(x * 10000) / 10000;
}

function formatMoney(n) {
  const x = Number(n ?? 0);
  return x.toFixed(2);
}
