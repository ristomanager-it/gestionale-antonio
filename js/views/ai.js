import { supabase } from "../supabaseClient.js";

let conversation = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

const TONY_AVATAR =
  "https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/Avatar/Tony.png";
const USER_AVATAR =
  "https://ui-avatars.com/api/?name=U&background=0E5A7A&color=fff";

export async function render(app) {
  conversation = [];

  const ruolo = window.state?.ruolo || "operatore";

  // Chip in base al ruolo
  const chipsAdmin = `
    <button class="chat-chip" data-prompt="Dammi il briefing operativo di oggi">📊 Briefing</button>
    <button class="chat-chip" data-prompt="Quante prenotazioni ho oggi e quali sono? Analizza i coperti e dimmi se è una buona giornata">📅 Prenotazioni oggi</button>
    <button class="chat-chip" data-prompt="Dimmi gli arrivi e le partenze hotel di oggi. Chi arriva, chi parte, ci sono saldi da riscuotere?">🏨 Hotel oggi</button>
    <button class="chat-chip" data-prompt="Analizza le prenotazioni e il traffico degli ultimi 7 giorni. Da dove arrivano i clienti? Cosa posso migliorare?">📈 Trend settimana</button>
    <button class="chat-chip" data-prompt="Analizza il tasso di conversione e gli abbandoni del form prenotazione. Dammi suggerimenti concreti per migliorarlo">🎯 Conversioni</button>
    <button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">🍳 Produzione</button>
    <button class="chat-chip" data-prompt="Dammi suggerimenti marketing per oggi basandoti sui dati reali">📢 Marketing</button>
    <button class="chat-chip" data-voice="ricetta">🎤 Nuova ricetta</button>
  `;

  const chipsOperatore = `
    <button class="chat-chip" data-prompt-ruolo="briefing">📋 Il mio giorno</button>
    <button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">🍳 Produzione</button>
    <button class="chat-chip" data-prompt="Cosa devo spingere in sala oggi?">🍽️ Sala</button>
    <button class="chat-chip" data-prompt-ruolo="obiettivi">🎯 I miei obiettivi</button>
    <button class="chat-chip" data-voice="ricetta">🎤 Nuova ricetta</button>
  `;

  const chips = (ruolo === "admin" || ruolo === "manager") ? chipsAdmin : chipsOperatore;

  app.innerHTML = `
<style>
/* Reset page layout per Tony */
.page-header { display: none !important; }
.page { padding: 0 !important; margin: 0 !important; }
#footer-root { display: none !important; }

.chat-shell {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: #e5ddd5;
  overflow: hidden;
  z-index: 50;
}

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #0E5A7A;
  color: #fff;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-avatar-img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}

.chat-name { font-size: 15px; font-weight: 700; }
.chat-status { font-size: 11px; opacity: 0.85; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}

.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.msg-row.user { flex-direction: row-reverse; }

.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.msg-row.user .msg-bubble { background: #dcf8c6; }

.msg-meta {
  font-size: 10px;
  color: #6b7280;
  text-align: right;
  margin-top: 4px;
}

.msg-voice-badge {
  font-size: 10px;
  background: rgba(14,90,122,0.1);
  color: #0E5A7A;
  border-radius: 999px;
  padding: 2px 7px;
  margin-right: 5px;
}

.msg-action-card {
  margin-top: 8px;
  background: rgba(14,90,122,0.08);
  border: 1px solid rgba(14,90,122,0.2);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #0E5A7A;
}

.chat-quick-actions {
  flex-shrink: 0;
  display: flex;
  gap: 7px;
  padding: 7px 10px;
  overflow-x: auto;
  background: #f8fafc;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.chat-quick-actions::-webkit-scrollbar { display: none; }

.chat-chip {
  border: none;
  background: white;
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

#voice-transcript-bar {
  flex-shrink: 0;
  padding: 7px 14px;
  background: #fff3cd;
  font-size: 12px;
  color: #856404;
  border-top: 1px solid #ffc107;
  display: none;
}

.chat-input-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  background: #f0f2f5;
  align-items: flex-end;
}

#chat-input {
  flex: 1;
  resize: none;
  padding: 10px 14px;
  border-radius: 20px;
  border: 1px solid #ccc;
  font-size: 14px;
  max-height: 100px;
  overflow-y: auto;
  line-height: 1.4;
}

.chat-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: #0E5A7A;
  color: white;
  font-size: 17px;
  cursor: pointer;
  flex-shrink: 0;
}

.chat-mic-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: white;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.chat-mic-btn.recording {
  background: #dc2626;
  animation: pulse-mic 1s infinite;
}

@keyframes pulse-mic {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
}
</style>

<div class="chat-shell">

  <div class="chat-header">
    <div class="chat-header-left">
      <img src="${TONY_AVATAR}" class="chat-avatar-img"/>
      <div>
        <div class="chat-name">Tony</div>
        <div class="chat-status" id="tony-status">Assistente operativo</div>
      </div>
    </div>
    <div style="margin-left:auto;">
      ${(ruolo === "admin" || ruolo === "manager") ? '<button id="btn-memoria" style="background:rgba(255,255,255,0.15);border:none;color:white;border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;font-weight:600;">🧠 Memoria</button>' : ""}
    </div>
  </div>

  <!-- PANNELLO MEMORIA -->
  <div id="memoria-panel" style="display:none;position:absolute;top:60px;left:0;right:0;bottom:0;background:white;z-index:100;overflow-y:auto;flex-direction:column;">
    <div style="background:#0E5A7A;color:white;padding:14px 16px;display:flex;align-items:center;gap:10px;">
      <button id="btn-chiudi-memoria" style="background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:4px 10px;cursor:pointer;">← Torna</button>
      <span style="font-weight:700;font-size:15px;">🧠 Cosa sa Tony del tuo locale</span>
    </div>
    <div style="padding:16px;">
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#0E5A7A;margin-bottom:8px;">💡 Dettatura guidata</div>
        <div style="font-size:12px;color:#374151;margin-bottom:12px;">Tony farà domande per conoscere meglio il tuo locale. Rispondi liberamente — salverà tutto automaticamente.</div>
        <button id="btn-avvia-dettatura" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;width:100%;">🎙️ Avvia dettatura guidata</button>
      </div>
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px;">📋 Ricordi salvati</div>
      <div id="memoria-lista">
        <div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px;">Caricamento...</div>
      </div>
    </div>
  </div>

  <div id="chat-messages" class="chat-messages"></div>

  <div class="chat-quick-actions">${chips}</div>

  <div id="voice-transcript-bar">
    🎤 <span id="voice-transcript-text">Trascrizione in corso...</span>
  </div>

  <div class="chat-input-bar">
    <button id="chat-mic" class="chat-mic-btn" title="Parla con Tony">🎤</button>
    <textarea id="chat-input" rows="1" placeholder="Scrivi a Tony..."></textarea>
    <button id="chat-tts" class="chat-mic-btn" title="Attiva voce Tony" style="font-size:18px;opacity:0.4;" aria-pressed="false">🔊</button>
    <button id="chat-send" class="chat-send-btn">➤</button>
  </div>

</div>
`;

  initChat(ruolo);
}

// ── Utilities ──────────────────────────────────────────

function getNowTime() {
  return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function scrollBottom() {
  const c = document.getElementById("chat-messages");
  if (c) c.scrollTop = c.scrollHeight;
}

function setStatus(text) {
  const el = document.getElementById("tony-status");
  if (el) el.textContent = text;
}

function addMessage(text, type, opts = {}) {
  const container = document.getElementById("chat-messages");
  if (!container) return null;

  const row = document.createElement("div");
  row.className = `msg-row ${type}`;

  const avatar = document.createElement("img");
  avatar.className = "msg-avatar";
  avatar.src = type === "ai" ? TONY_AVATAR : USER_AVATAR;
  row.appendChild(avatar);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (opts.isVoice) {
    const badge = document.createElement("span");
    badge.className = "msg-voice-badge";
    badge.textContent = "🎤 vocale";
    bubble.appendChild(badge);
  }

  const span = document.createElement("span");
  span.textContent = text;
  bubble.appendChild(span);

  if (opts.action && opts.actionExecuted) {
    const card = document.createElement("div");
    card.className = "msg-action-card";
    card.textContent = "✅ " + opts.action.type.replace(/_/g, " ");
    bubble.appendChild(card);
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = getNowTime();
  bubble.appendChild(meta);

  row.appendChild(bubble);
  container.appendChild(row);
  scrollBottom();
  return bubble;
}

// ── Briefing personalizzato per ruolo ──────────────────

function getBriefingPrompt(ruolo) {
  const user = window.state?.user;
  const dipendente = window.state?.dipendente;
  const nome = dipendente?.nome || user?.user_metadata?.nome || "collega";
  const profiloAI = dipendente?.profilo_ai || {};

  if (ruolo === "operatore") {
    const obiettivi = profiloAI.obiettivi_personali || profiloAI.obiettivi_professionali || "";
    const energia = profiloAI.energia || "";
    const ruoloTarget = profiloAI.ruolo_target || "";

    return `Fai un briefing personalizzato per ${nome}, ruolo operatore.
NON mostrare ricavi, margini o dati economici — non sono di sua competenza.
Mostragli: cosa produrre oggi, cosa spingere in sala, eventuali sottoscorte operative.
${obiettivi ? `I suoi obiettivi personali sono: ${obiettivi}.` : ""}
${energia ? `Si sente così al lavoro: ${energia}.` : ""}
${ruoloTarget ? `Vuole diventare: ${ruoloTarget}.` : ""}
Valuta il suo rendimento in base ai dati di produzione e sala disponibili.
Se il rendimento è positivo, complimentati e dai un rinforzo motivazionale caldo e diretto.
Se ci sono aree di miglioramento, incoraggialo con tono positivo e dai suggerimenti pratici.
Sii come un coach, non un capo. Parla in prima persona rivolgendoti a lui/lei.`;
  }

  if (ruolo === "manager") {
    return `Dammi il briefing operativo completo di oggi per il manager.
Includi: vendite, costo lavoro, produzione consigliata, magazzino, eventi imminenti.
Evidenzia le priorità urgenti e le opportunità di oggi.`;
  }

  // admin / default
  return "Dammi il briefing operativo completo di oggi con tutti i KPI.";
}

function getObiettiviPrompt() {
  const dipendente = window.state?.dipendente;
  const profiloAI = dipendente?.profilo_ai || {};
  const nome = dipendente?.nome || "collega";
  const obiettivi = profiloAI.obiettivi_personali || profiloAI.obiettivi_professionali || "";
  const ruoloTarget = profiloAI.ruolo_target || "";
  const crescita = profiloAI.crescita || profiloAI.tipo_crescita || "";

  return `Parla con ${nome} dei suoi obiettivi di crescita professionale.
${obiettivi ? `Obiettivi dichiarati: ${obiettivi}.` : "Non ha ancora dichiarato obiettivi specifici — chiediglieli."}
${ruoloTarget ? `Vuole diventare: ${ruoloTarget}.` : ""}
${crescita ? `Area di crescita: ${crescita}.` : ""}
Dammi consigli pratici su come può migliorare nel suo ruolo attuale e avvicinarsi ai suoi obiettivi.
Sii motivante, diretto e concreto. NON mostrare dati economici.`;
}


function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderChart(chart) {
  const container = document.getElementById("chat-messages");
  if (!container || !chart?.labels || !chart?.data) return;
  const box = document.createElement("div");
  box.className = "chart-box";
  box.style.cssText = "width:100%;max-width:600px;margin-top:8px;";
  const canvas = document.createElement("canvas");
  box.appendChild(canvas);
  container.appendChild(box);
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: chart.labels,
      datasets: [{ label: chart.label || "Vendite", data: chart.data, backgroundColor: "rgba(14,90,122,0.7)", borderRadius: 6 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
  scrollBottom();
}

// ── Context DB — dati reali per Tony ──────────────────────────────────────
async function buildContextDB() {
  const supa = window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;
  if (!supa || !aziendaId) return "";

  try {
    const oggi = new Date().toISOString().split("T")[0];
    const ieri = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const sett = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const mese = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [prenOggi, prenSett, prenMese, analyt, prenotazioni, hotelOggi, hotelSett, hotelProssimi] = await Promise.all([
      // Prenotazioni ristorante oggi
      supa.from("prenotazioni_tavoli")
        .select("id,coperti,stato,ora,canale,nome_cliente:cliente_nome")
        .eq("azienda_id", aziendaId)
        .eq("data", oggi)
        .neq("stato", "annullata")
        .order("ora"),

      // Prenotazioni ristorante settimana
      supa.from("prenotazioni_tavoli")
        .select("id,coperti,stato,canale,data")
        .eq("azienda_id", aziendaId)
        .gte("data", sett)
        .neq("stato", "annullata"),

      // Prenotazioni ristorante mese
      supa.from("prenotazioni_tavoli")
        .select("id,coperti")
        .eq("azienda_id", aziendaId)
        .gte("data", mese)
        .neq("stato", "annullata"),

      // Analytics ultimi 7 giorni
      supa.from("page_analytics")
        .select("tipo,elemento,device,utm_source,created_at")
        .eq("azienda_id", aziendaId)
        .gte("created_at", sett + "T00:00:00"),

      // Prossime prenotazioni ristorante
      supa.from("prenotazioni_tavoli")
        .select("data,ora,coperti,stato,nome_cliente:cliente_nome,canale")
        .eq("azienda_id", aziendaId)
        .gte("data", oggi)
        .neq("stato", "annullata")
        .order("data").order("ora")
        .limit(10),

      // Hotel — arrivi/partenze oggi
      supa.from("hotel_prenotazioni")
        .select("id,ospite_nome,ospite_cognome,data_checkin,data_checkout,stato,hotel_camere(nome),notti,adulti,colazione_inclusa,saldo_residuo,note_ospite")
        .eq("azienda_id", aziendaId)
        .or(`data_checkin.eq.${oggi},data_checkout.eq.${oggi}`)
        .neq("stato", "annullata"),

      // Hotel — prenotazioni settimana
      supa.from("hotel_prenotazioni")
        .select("id,stato,notti,prezzo_totale,data_checkin,data_checkout")
        .eq("azienda_id", aziendaId)
        .gte("data_checkin", sett)
        .neq("stato", "annullata"),

      // Hotel — prossimi arrivi (7 giorni)
      supa.from("hotel_prenotazioni")
        .select("ospite_nome,ospite_cognome,data_checkin,data_checkout,hotel_camere(nome),adulti,stato,saldo_residuo,checkin_online_completato")
        .eq("azienda_id", aziendaId)
        .gte("data_checkin", oggi)
        .neq("stato", "annullata")
        .order("data_checkin")
        .limit(7),
    ]);

    // Elabora prenotazioni oggi
    const prenOggiData = prenOggi.data || [];
    const copertiOggi = prenOggiData.reduce((s, p) => s + (p.coperti || 0), 0);
    const prenOggiDettaglio = prenOggiData.map(p =>
      `  - ${p.ora?.slice(0,5) || "?"} · ${p.nome_cliente || "N/D"} · ${p.coperti} cop. · ${p.stato}`
    ).join("\n") || "  Nessuna prenotazione";

    // Elabora settimana
    const prenSettData = prenSett.data || [];
    const copertiSett = prenSettData.reduce((s, p) => s + (p.coperti || 0), 0);
    const canaliSett = {};
    prenSettData.forEach(p => { canaliSett[p.canale || "?"] = (canaliSett[p.canale || "?"] || 0) + 1; });

    // Elabora mese
    const prenMeseData = prenMese.data || [];
    const copertiMese = prenMeseData.reduce((s, p) => s + (p.coperti || 0), 0);

    // Elabora analytics
    const analytData = analyt.data || [];
    const visite = analytData.filter(r => r.tipo === "view").length;
    const abbandoni = analytData.filter(r => r.tipo === "abbandono").length;
    const mobile = analytData.filter(r => r.tipo === "view" && r.device === "mobile").length;
    const fonti = {};
    analytData.filter(r => r.tipo === "view").forEach(r => {
      const src = r.utm_source || "diretto";
      fonti[src] = (fonti[src] || 0) + 1;
    });
    const fontiTop = Object.entries(fonti).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k,v]) => `${k}:${v}`).join(", ");

    // Prossime prenotazioni
    const prossime = (prenotazioni.data || []).slice(0, 5).map(p =>
      `  - ${p.data} ${p.ora?.slice(0,5)||""} · ${p.nome_cliente||"N/D"} · ${p.coperti} cop.`
    ).join("\n") || "  Nessuna";

    const convRate = visite > 0 ? Math.round((prenSettData.length / visite) * 100) : 0;

    // ── HOTEL ──
    const hotelOggiData = hotelOggi.data || [];
    const arriviOggi  = hotelOggiData.filter(p => p.data_checkin === oggi);
    const partenzeOggi = hotelOggiData.filter(p => p.data_checkout === oggi);
    const inCasaOggi  = hotelOggiData.filter(p => p.stato === 'checkin');
    const hotelSettData = hotelSett.data || [];
    const hotelProssimiData = hotelProssimi.data || [];
    const incassoHotelSett = hotelSettData.reduce((s,p) => s + parseFloat(p.prezzo_totale||0), 0);

    const arriviDettaglio = arriviOggi.map(p =>
      `  - ${p.ospite_nome} ${p.ospite_cognome} | Camera: ${p.hotel_camere?.nome||'?'} | ${p.notti}n · ${p.adulti} pers.${p.colazione_inclusa?' · 🍳 colazione':''}${p.saldo_residuo>0?` · 💰 saldo €${parseFloat(p.saldo_residuo).toFixed(2)}`:''}${p.checkin_online_completato===false?' · ⚠️ check-in online NON completato':''}`
    ).join('\n') || '  Nessun arrivo';

    const partenzeDettaglio = partenzeOggi.map(p =>
      `  - ${p.ospite_nome} ${p.ospite_cognome} | Camera: ${p.hotel_camere?.nome||'?'}${p.saldo_residuo>0?` | 💰 saldo da riscuotere €${parseFloat(p.saldo_residuo).toFixed(2)}`:''}`
    ).join('\n') || '  Nessuna partenza';

    const prossimiArrivi = hotelProssimiData.slice(0,5).map(p =>
      `  - ${p.data_checkin} · ${p.ospite_nome} ${p.ospite_cognome} | ${p.hotel_camere?.nome||'?'} | ${p.adulti} pers.${p.saldo_residuo>0?` | saldo €${parseFloat(p.saldo_residuo).toFixed(2)}`:''}`
    ).join('\n') || '  Nessuno';

    const hotelSection = (arriviOggi.length || partenzeOggi.length || hotelProssimiData.length) ? `
🏨 HOTEL — OGGI (${oggi}):
  Arrivi: ${arriviOggi.length} ospiti
${arriviDettaglio}
  Partenze: ${partenzeOggi.length} ospiti
${partenzeDettaglio}
  In struttura: ${inCasaOggi.length} ospiti

🏨 HOTEL — PROSSIMI ARRIVI:
${prossimiArrivi}

🏨 HOTEL — SETTIMANA:
  ${hotelSettData.length} prenotazioni · Incasso: €${incassoHotelSett.toFixed(2)}
` : '';

    return `
--- DATI REALI AGGIORNATI (${new Date().toLocaleString("it-IT")}) ---

📅 PRENOTAZIONI OGGI (${oggi}):
  Totale: ${prenOggiData.length} prenotazioni · ${copertiOggi} coperti
${prenOggiDettaglio}

📊 SETTIMANA (ultimi 7 giorni):
  ${prenSettData.length} prenotazioni · ${copertiSett} coperti
  Canali: ${Object.entries(canaliSett).map(([k,v]) => `${k}:${v}`).join(", ") || "N/D"}

📆 MESE (ultimi 30 giorni):
  ${prenMeseData.length} prenotazioni · ${copertiMese} coperti

🔜 PROSSIME PRENOTAZIONI:
${prossime}

📈 ANALYTICS SITO/FORM (ultimi 7 giorni):
  Visite form: ${visite} · Mobile: ${mobile} (${visite ? Math.round(mobile/visite*100) : 0}%)
  Abbandoni: ${abbandoni} · Conversione: ${convRate}%
  Fonti traffico: ${fontiTop || "N/D"}
${hotelSection}
--- FINE DATI REALI ---`;

  } catch(e) {
    console.warn("buildContextDB error:", e);
    return "";
  }
}

// ── API Tony ───────────────────────────────────────────

async function callTony(messages, audioBase64 = null, tipoMessaggio = null) {

  // Inietta dati reali DB nel sistema (solo se non è messaggio iniziale)
  let messagesConCtx = messages;
  if (tipoMessaggio !== "messaggio_iniziale") {
    const ctx = await buildContextDB();
    if (ctx) {
      // Inserisci il context come primo messaggio di sistema
      messagesConCtx = [
        { role: "user", content: ctx },
        { role: "assistant", content: "Perfetto, ho i dati aggiornati. Sono pronto a rispondere." },
        ...messages
      ];
    }
  }

  const _linguaDip = getLinguaDipendente();
  const body = {
    messages: messagesConCtx,
    azienda_id: window.state?.azienda?.id,
    azienda: window.state?.azienda?.nome,
    sede_id: window.state?.sedeAttiva?.id || null,
    lat: window.state?.sedeAttiva?.latitudine,
    lon: window.state?.sedeAttiva?.longitudine,
    ruolo: window.state?.ruolo || "operatore",
    lingua: _linguaDip,
  };
  if (audioBase64) body.audio_base64 = audioBase64;
  if (tipoMessaggio) body.tipo_messaggio = tipoMessaggio;

  // Fetch diretto con timeout 60s invece di supabase.functions.invoke
  const supabaseUrl = "https://cuhcscpvhypoaplcmtjk.supabase.co";
  const session = await window.supabase?.auth?.getSession();
  const token = session?.data?.session?.access_token || "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/assistente-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": token,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Registrazione audio ────────────────────────────────

async function startRecording() {
  try {
    // Verifica HTTPS
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      alert("Il microfono richiede una connessione sicura (HTTPS). Assicurati di aprire l'app su https://app.ristoflow-ai.com");
      return;
    }

    // Verifica supporto API
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Il tuo browser non supporta il microfono. Prova con Chrome o Safari aggiornati.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    // Rileva il miglior formato supportato dal browser
    let mimeType = "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
      mimeType = "audio/mp4";
    } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
      mimeType = "audio/ogg";
    }

    console.log("TONY MIC: formato selezionato", mimeType);

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder._mimeType = mimeType;
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start(100);
    isRecording = true;

    const mic = document.getElementById("chat-mic");
    if (mic) { mic.classList.add("recording"); mic.textContent = "⏹"; }
    setStatus("🔴 Registrazione in corso...");
  } catch(err) {
    console.error("TONY MIC ERROR:", err);
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      alert("Accesso al microfono negato.\n\nVai nelle impostazioni del browser e consenti l'accesso al microfono per app.ristoflow-ai.com");
    } else if (err.name === "NotFoundError") {
      alert("Nessun microfono trovato. Controlla che il dispositivo abbia un microfono funzionante.");
    } else {
      alert("Impossibile accedere al microfono: " + err.message);
    }
  }
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") { resolve(null); return; }
    mediaRecorder.onstop = async () => {
      const actualMime = mediaRecorder._mimeType || mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(audioChunks, { type: actualMime });
      mediaRecorder.stream?.getTracks().forEach(t => t.stop());
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };
    mediaRecorder.stop();
    isRecording = false;

    const mic = document.getElementById("chat-mic");
    if (mic) { mic.classList.remove("recording"); mic.textContent = "🎤"; }
    setStatus("⏳ Trascrizione...");
  });
}

async function sendVoiceMessage() {
  const audioBase64 = await stopRecording();
  if (!audioBase64) { setStatus("Assistente operativo"); return; }

  const bar = document.getElementById("voice-transcript-bar");
  const barText = document.getElementById("voice-transcript-text");
  if (bar) bar.style.display = "block";
  if (barText) barText.textContent = "Trascrizione in corso...";

  const loading = addMessage("Tony sta ascoltando...", "ai");

  try {
    const data = await callTony(conversation, audioBase64);
    if (loading) loading.parentElement?.remove();

    const voiceInput = data?.voice_input;
    if (voiceInput) {
      if (barText) barText.textContent = `"${voiceInput}"`;
      addMessage(voiceInput, "user", { isVoice: true });
      conversation.push({ role: "user", content: voiceInput });
    } else {
      if (bar) bar.style.display = "none";
    }

    const reply = data?.reply || "Non ho capito, puoi ripetere?";
    addMessage(reply, "ai", { action: data?.action, actionExecuted: data?.action_executed });
    conversation.push({ role: "assistant", content: reply });
    ttsParla(reply);

    // Conversazione continua gestita dentro ttsParla via audio.onended

    if (data?.action?.type === "crea_ricetta" && data?.action_executed) {
      setTimeout(() => {
        if (confirm("Ricetta creata! Vuoi aprirla per completarla?")) {
          const id = data?.action_result?.id;
          if (id) window.location.hash = `#/crea-ricetta?id=${id}`;
        }
      }, 500);
    }
  } catch {
    if (loading) loading.textContent = "Errore risposta vocale";
    if (bar) bar.style.display = "none";
  }
  setStatus("Assistente operativo");
}

// ── Init ───────────────────────────────────────────────

// ── Messaggio iniziale dinamico ────────────────────────
function getSaluto() {
  const ora = new Date().getHours();
  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function getSeedDelGiorno() {
  // Seed basato sul giorno — cambia ogni giorno, non ogni apertura
  const oggi = new Date();
  return `${oggi.getFullYear()}-${oggi.getMonth()}-${oggi.getDate()}`;
}

async function loadMessaggioIniziale(ruolo) {
  const nome = window.state?.dipendente?.nome || window.state?.user?.email?.split("@")[0] || "";
  const saluto = getSaluto();
  const seed = getSeedDelGiorno();

  try {
    setStatus("⏳ Tony si sveglia...");

    const prompt = `Genera il messaggio di benvenuto di Tony per oggi (${seed}).

REGOLE PRECISE:
- Inizia con "${saluto}${nome ? " " + nome : ""}!" — poi va a capo
- Una frase motivazionale breve e carica di energia (max 2 righe) — deve sembrare scritta oggi, non generica
- Usa UNA citazione dalle CITAZIONI & ANCORE EMOTIVE della knowledge base — integrata in modo naturale, senza citare la fonte, senza virgolette esplicite
- Chiudi con una frase che invita all'azione: cosa può fare Tony oggi per lui/lei
- Tono: caldo, diretto, energico — "vibrazioni emozione carica"
- Max 5 righe totali
- NON includere dati operativi, numeri o briefing — quello viene dopo a richiesta
- Il messaggio deve essere DIVERSO ogni giorno grazie al seed: ${seed}
- Ruolo utente: ${ruolo}`;

    const data = await callTony([{ role: "user", content: prompt }], null, "messaggio_iniziale");
    const reply = data?.reply || `${saluto}! Sono Tony, il tuo assistente operativo. Cosa possiamo fare di grande oggi?`;

    addMessage(reply, "ai");
    conversation.push({ role: "assistant", content: reply });
    setStatus("Assistente operativo");
  } catch {
    const fallback = `${saluto}${nome ? " " + nome : ""}!\n\nSono Tony, pronto a darti una mano oggi. Scrivi "briefing" per il riepilogo completo, oppure dimmi direttamente cosa ti serve. 🚀`;
    addMessage(fallback, "ai");
    conversation.push({ role: "assistant", content: fallback });
    setStatus("Assistente operativo");
  }
}

// Fix altezza mobile
function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setVh();
window.addEventListener("resize", setVh);

// ── MEMORIA TONY ──────────────────────────────────────────────────────────
async function loadMemoria() {
  const aziendaId = window.state?.azienda?.id;
  const lista = document.getElementById("memoria-lista");
  if (!lista) return;

  const supabase = window.supabaseClient || window.supabase;
  const { data } = await supabase
    .from("tony_memoria")
    .select("id, tipo, titolo, contenuto, created_at")
    .eq("azienda_id", aziendaId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data?.length) {
    lista.innerHTML = `<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px;">Nessun ricordo salvato ancora.<br>Avvia la dettatura guidata per iniziare!</div>`;
    return;
  }

  lista.innerHTML = data.map(m => `
    <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;">
      <div style="flex:1;">
        <div style="font-size:11px;color:#0E5A7A;font-weight:700;text-transform:uppercase;margin-bottom:2px;">${m.tipo || "nota"}</div>
        ${m.titolo ? `<div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px;">${m.titolo}</div>` : ""}
        <div style="font-size:13px;color:#374151;line-height:1.4;">${m.contenuto}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:4px;">${new Date(m.created_at).toLocaleDateString("it-IT")}</div>
      </div>
      <button onclick="eliminaRicordo('${m.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;padding:0;flex-shrink:0;">🗑</button>
    </div>
  `).join("");
}

window.eliminaRicordo = async (id) => {
  if (!confirm("Eliminare questo ricordo?")) return;
  const supabase = window.supabaseClient || window.supabase;
  await supabase.from("tony_memoria").delete().eq("id", id);
  loadMemoria();
};

const DETTATURA_DOMANDE = [
  "Come si chiama il tuo locale e di che tipo si tratta? (ristorante, pizzeria, trattoria, catering...)",
  "Qual è la tua filosofia in cucina? Cosa ti distingue dagli altri?",
  "Chi è il tuo cliente ideale? Chi vuoi che venga da te?",
  "Quali sono i tuoi 3 piatti simbolo — quelli che ti rappresentano di più?",
  "Quali sono i tuoi obiettivi per i prossimi 6 mesi?",
  "C'è qualcosa che Tony deve sapere sul tuo team o sulla gestione del personale?",
  "Hai già usato campagne marketing? Cosa ha funzionato e cosa no?",
  "C'è qualcosa di importante che vuoi che Tony ricordi sempre quando ti risponde?",
];

let dettaturaStep = 0;
let dettaturaRisposte = [];

async function avviaDettatura() {
  const panel = document.getElementById("memoria-panel");
  if (panel) panel.style.display = "none";

  dettaturaStep = 0;
  dettaturaRisposte = [];

  // Torna alla chat e avvia il flusso
  addMessage("🧠 Perfetto! Avvio la dettatura guidata. Ti farò alcune domande per conoscere meglio il tuo locale — rispondi liberamente, salvo tutto automaticamente.\n\nPuoi rispondere con testo o con la voce 🎤", "ai");

  setTimeout(() => {
    addMessage(DETTATURA_DOMANDE[0], "ai");
    window._inDettatura = true;
    window._dettaturaStep = 0;
  }, 800);
}

async function gestisciRispostaDettatura(risposta) {
  const step = window._dettaturaStep || 0;
  const domanda = DETTATURA_DOMANDE[step];

  // Salva in tony_memoria
  const aziendaId = window.state?.azienda?.id;
  const supabase = window.supabaseClient || window.supabase;
  const tipi = ["identita", "filosofia", "cliente_ideale", "menu", "obiettivi", "personale", "marketing", "istruzione"];
  await supabase.from("tony_memoria").insert({
    azienda_id: aziendaId,
    tipo: tipi[step] || "nota",
    titolo: domanda.split("?")[0].replace(/^[^a-zA-Z]+/, ""),
    contenuto: risposta,
  });

  const prossimoStep = step + 1;
  window._dettaturaStep = prossimoStep;

  if (prossimoStep < DETTATURA_DOMANDE.length) {
    addMessage(`✅ Salvato! Prossima domanda:

${DETTATURA_DOMANDE[prossimoStep]}`, "ai");
  } else {
    window._inDettatura = false;
    window._dettaturaStep = 0;
    addMessage("🎉 Dettatura completata! Tony ora conosce il tuo locale molto meglio e userà queste informazioni in ogni risposta.\n\nPuoi aggiornare o cancellare i ricordi in qualsiasi momento dal pannello 🧠 Memoria.", "ai");
  }
}

// Manda prompt a Tony senza mostrare nulla in chat — Tony risponde direttamente
async function sendMessageSilent(hiddenPrompt) {
  const send = document.getElementById("chat-send");
  if (send) send.disabled = true;

  conversation.push({ role: "user", content: hiddenPrompt });

  setStatus("⏳ Tony sta scrivendo...");
  const loading = addMessage("Tony sta scrivendo...", "ai");

  try {
    const data = await callTony(conversation);
    if (loading) loading.parentElement?.remove();
    const reply = data?.reply || "Nessuna risposta.";
    addMessage(reply, "ai", { action: data?.action, actionExecuted: data?.action_executed });
    conversation.push({ role: "assistant", content: reply });
    ttsParla(reply);
  } catch {
    if (loading) loading.textContent = "Errore Tony";
  }

  if (send) send.disabled = false;
  setStatus("Assistente operativo");
  scrollBottom();
}


/* ============================================================
   🔊 TEXT-TO-SPEECH — Tony parla in italiano
   Usa Web Speech API SpeechSynthesis (nativa nel browser).
   Nessuna libreria, nessuna chiamata esterna.
============================================================ */

/* ============================================================
   🔊 TTS con OpenAI — Tony parla con voce naturale
   Chiama la Edge Function assistente-ai con tipo_messaggio="tts"
   che usa openai.audio.speech.create() e restituisce audio base64.
   Fallback su SpeechSynthesis se la EF non risponde.
============================================================ */

let _ttsAttivo = false;
let _ttsAudio = null;  // HTMLAudioElement corrente

// Voce OpenAI assegnata al dipendente (default: nova — la più naturale)
const OPENAI_VOCI = {
  nova:    { label: "Nova — voce femminile calda", emoji: "🎙️" },
  alloy:   { label: "Alloy — voce neutra bilanciata", emoji: "🎙️" },
  echo:    { label: "Echo — voce maschile profonda", emoji: "🎙️" },
  fable:   { label: "Fable — voce espressiva", emoji: "🎙️" },
  onyx:    { label: "Onyx — voce maschile autorevole", emoji: "🎙️" },
  shimmer: { label: "Shimmer — voce femminile vivace", emoji: "🎙️" },
};

function getTtsVoice() {
  return window.state?.dipendente?.voce_tony
    || window.state?.user?.user_metadata?.voce_tony
    || "nova";
}

async function ttsParla(testo) {
  if (!_ttsAttivo || !testo) return;

  // Ferma audio precedente
  if (_ttsAudio) {
    _ttsAudio.pause();
    _ttsAudio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();

  // Pulizia testo
  const pulito = testo
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^[-\u2022]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\u20ac/g, "euro")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!pulito) return;
  const testoBreve = pulito.length > 1500 ? pulito.substring(0, 1497) + "..." : pulito;

  // Prova prima con OpenAI via Edge Function
  try {
    const supa = window.supabaseClient || window.supabase;
    const s = await supa.auth.getSession();
    const token = s?.data?.session?.access_token || "";

    const resp = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "Authorization": "Bearer " + token, "apikey": token },
      body: JSON.stringify({
        azienda_id: window.state?.azienda?.id,
        tipo_messaggio: "tts",
        tts_testo: testoBreve,
        tts_voce: getTtsVoice(),
        messages: []
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.audio_base64) {
        // Riproduce l'audio base64 ricevuto
        const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
        _ttsAudio = audio;
        audio.play();
        // Dopo la riproduzione riavvia mic se in modalità conversazione continua
        audio.onended = () => {
          _ttsAudio = null;
          if (_ttsAttivo && _ttsConversazioneContinua) {
            setTimeout(() => { if (_ttsAttivo) startRecording(); }, 400);
          }
        };
        return;
      }
    }
  } catch(e) {
    console.warn("TTS OpenAI fallito, uso SpeechSynthesis:", e.message);
  }

  // Fallback: SpeechSynthesis browser
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(testoBreve);
  utt.lang = "it-IT";
  utt.rate = 1.0;
  utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
  utt.onend = () => {
    if (_ttsAttivo && _ttsConversazioneContinua) {
      setTimeout(() => { if (_ttsAttivo) startRecording(); }, 400);
    }
  };
}

let _ttsConversazioneContinua = false;

function ttsToggle() {
  _ttsAttivo = !_ttsAttivo;
  const btn = document.getElementById("chat-tts");
  if (!btn) return;
  btn.style.opacity = _ttsAttivo ? "1" : "0.4";
  btn.title = _ttsAttivo ? "Voce Tony attiva — clicca per disattivare" : "Attiva voce Tony";
  btn.setAttribute("aria-pressed", _ttsAttivo ? "true" : "false");
  btn.textContent = _ttsAttivo ? "🔊" : "🔇";
  setTimeout(() => { btn.textContent = "🔊"; }, 1000);
  if (!_ttsAttivo) {
    if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } else {
    ttsParla("Voce attivata. Sono pronto.");
  }
}

function ttsInit() {
  // Non serve più inizializzare voci browser — usiamo OpenAI
  // Manteniamo la funzione per compatibilità
}

function initChat(ruolo) {
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const mic = document.getElementById("chat-mic");

  ttsInit();
  document.getElementById("chat-tts")?.addEventListener("click", ttsToggle);

  loadMessaggioIniziale(ruolo);

  // Memoria panel
  const btnMemoria = document.getElementById("btn-memoria");
  const memoriaPanel = document.getElementById("memoria-panel");
  const btnChiudiMemoria = document.getElementById("btn-chiudi-memoria");
  const btnAvviaDettatura = document.getElementById("btn-avvia-dettatura");

  if (btnMemoria) btnMemoria.onclick = () => {
    memoriaPanel.style.display = "flex";
    memoriaPanel.style.flexDirection = "column";
    loadMemoria();
  };
  if (btnChiudiMemoria) btnChiudiMemoria.onclick = () => {
    memoriaPanel.style.display = "none";
  };
  if (btnAvviaDettatura) btnAvviaDettatura.onclick = avviaDettatura;

  async function sendMessage(prompt) {
    prompt = (prompt || input?.value || "").trim();
    if (!prompt) return;

    addMessage(prompt, "user");
    conversation.push({ role: "user", content: prompt });
    if (input) input.value = "";
    if (send) send.disabled = true;

    // Intercetta dettatura guidata
    if (window._inDettatura) {
      await gestisciRispostaDettatura(prompt);
      if (send) send.disabled = false;
      scrollBottom();
      return;
    }

    setStatus("⏳ Tony sta scrivendo...");
    const loading = addMessage("Tony sta scrivendo...", "ai");

    try {
      const data = await callTony(conversation);
      if (loading) loading.parentElement?.remove();

      const reply = data?.reply || "Nessuna risposta.";
      addMessage(reply, "ai", { action: data?.action, actionExecuted: data?.action_executed });
      conversation.push({ role: "assistant", content: reply });

      if (data?.action?.type === "crea_ricetta" && data?.action_executed) {
        setTimeout(() => {
          if (confirm("Ricetta creata! Vuoi aprirla per completarla?")) {
            const id = data?.action_result?.id;
            if (id) window.location.hash = `#/crea-ricetta?id=${id}`;
          }
        }, 500);
      }
    } catch {
      if (loading) loading.textContent = "Errore Tony";
    }

    if (send) send.disabled = false;
    setStatus("Assistente operativo");
    scrollBottom();
  }

  if (send) send.onclick = () => sendMessage();

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });
  }

  if (mic) {
    mic.onclick = async () => {
      if (!isRecording) { _ttsConversazioneContinua = true; await startRecording(); }
      else await sendVoiceMessage();
    };
  }

  // Chip
  document.querySelectorAll(".chat-chip").forEach(chip => {
    chip.onclick = () => {
      if (chip.dataset.voice === "ricetta") {
        addMessage("🎤 Parla ora: descrivi la ricetta (nome, ingredienti, dosi, conservazione...)", "ai");
        startRecording();
        return;
      }
      if (chip.dataset.promptRuolo === "briefing") {
        // Manda il prompt internamente senza mostrarlo in chat
        sendMessageSilent(getBriefingPrompt(ruolo));
        return;
      }
      if (chip.dataset.promptRuolo === "obiettivi") {
        sendMessageSilent(getObiettiviPrompt());
        return;
      }
      if (chip.dataset.prompt) sendMessage(chip.dataset.prompt);
    };
  });
}