// views/bo/bo-whatsapp.js
import { createPageLayout } from "../../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    container.innerHTML = `<div class="view" style="padding:40px;text-align:center;color:#ef4444;">Nessuna azienda attiva.</div>`;
    return;
  }

  container.innerHTML = createPageLayout({
    title: "💬 WhatsApp Inbox",
    subtitle: "Messaggi in arrivo dai clienti",
    content: `
      <style>
        #wa-layout { display:flex; gap:16px; height:calc(100vh - 160px); overflow:hidden; }
        @media (max-width: 767px) {
          #wa-layout { display:block; height:calc(100vh - 120px); }
          #wa-sidebar { width:100% !important; min-width:unset !important; height:100%; }
          #wa-chat { position:fixed !important; top:0; left:0; right:0; bottom:0; z-index:200; border-radius:0 !important; display:none !important; }
          #wa-chat.mobile-open { display:flex !important; }
          #wa-back-btn { display:flex !important; }
        }
      </style>
      <div id="wa-layout">

        <!-- LISTA CONVERSAZIONI -->
        <div id="wa-sidebar" style="
          width:320px;
          min-width:280px;
          background:white;
          border-radius:12px;
          border:1px solid #e5e7eb;
          display:flex;
          flex-direction:column;
          overflow:hidden;
        ">
          <div style="padding:16px;border-bottom:1px solid #e5e7eb;">
            <input id="wa-search" type="text" placeholder="🔍 Cerca per numero o nome..."
              style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          <div style="padding:8px;border-bottom:1px solid #e5e7eb;display:flex;gap:6px;flex-wrap:wrap;">
            <button class="wa-filter-btn active" data-filter="tutti"
              style="padding:4px 10px;border-radius:20px;border:1px solid #0E5A7A;background:#0E5A7A;color:white;font-size:12px;cursor:pointer;">
              Tutti
            </button>
            <button class="wa-filter-btn" data-filter="prenotazione"
              style="padding:4px 10px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">
              📅 Prenotazioni
            </button>
            <button class="wa-filter-btn" data-filter="reclamo"
              style="padding:4px 10px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">
              ⚠️ Reclami
            </button>
            <button class="wa-filter-btn" data-filter="non_letti"
              style="padding:4px 10px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">
              🔴 Non letti
            </button>
          </div>
          <div id="wa-conversations" style="flex:1;overflow-y:auto;"></div>
        </div>

        <!-- CHAT VIEW -->
        <div id="wa-chat" style="
          flex:1;
          background:white;
          border-radius:12px;
          border:1px solid #e5e7eb;
          display:flex;
          flex-direction:column;
          overflow:hidden;
        ">
          <div id="wa-chat-header" style="padding:16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">
            <button id="wa-back-btn" style="display:none;background:none;border:none;font-size:22px;cursor:pointer;padding:0 8px 0 0;color:#0E5A7A;">←</button>
            <div style="color:#6b7280;font-size:14px;">Seleziona una conversazione</div>
          </div>
          <div id="wa-chat-messages" style="flex:1;overflow-y:auto;padding:16px;background:#f9fafb;display:flex;flex-direction:column;gap:8px;">
          </div>
          <div id="wa-chat-input" style="padding:16px;border-top:1px solid #e5e7eb;display:none;">
            <div style="display:flex;gap:8px;align-items:flex-end;">
              <textarea id="wa-reply-text" placeholder="Scrivi un messaggio..."
                style="flex:1;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:none;height:44px;max-height:120px;font-family:inherit;"
                rows="1"></textarea>
              <button id="wa-send-btn"
                style="padding:10px 20px;background:#0E5A7A;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;white-space:nowrap;">
                Invia
              </button>
            </div>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
              <button class="wa-quick-reply" data-text="Ciao! Confermo la tua prenotazione ✅"
                style="padding:4px 10px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">
                ✅ Conferma prenotazione
              </button>
              <button class="wa-quick-reply" data-text="Ci dispiace, purtroppo non abbiamo disponibilità per quella data. Vuoi provare un altro giorno?"
                style="padding:4px 10px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">
                ❌ Non disponibile
              </button>
              <button class="wa-quick-reply" data-text="Grazie per averci contattato! Un operatore ti risponderà a breve 😊"
                style="padding:4px 10px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">
                ⏳ Attendi operatore
              </button>
            </div>
          </div>
        </div>

      </div>
    `
  });

  let conversazioni = [];
  let conversazioneAttiva = null;
  let filtroAttivo = "tutti";

  // ── CARICA CONVERSAZIONI ─────────────────────────────────────────────────
  async function caricaConversazioni() {
    const { data } = await supa()
      .from("whatsapp_messaggi")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("created_at", { ascending: false });

    if (!data) return;

    // Raggruppa per numero
    const map = new Map();
    for (const msg of data) {
      const key = msg.from_numero;
      if (!map.has(key)) {
        map.set(key, {
          numero: key,
          nome: msg.from_nome || key,
          ultimoMessaggio: msg.testo || "[media]",
          ultimaData: msg.created_at,
          nonLetti: 0,
          intent: msg.intent,
          messaggi: []
        });
      }
      const conv = map.get(key);
      conv.messaggi.push(msg);
      if (!msg.letto) conv.nonLetti++;
    }

    conversazioni = [...map.values()].sort(
      (a, b) => new Date(b.ultimaData) - new Date(a.ultimaData)
    );

    renderConversazioni();
    aggiornaContatoreBadge();
  }

  // ── RENDER LISTA ─────────────────────────────────────────────────────────
  function renderConversazioni() {
    const search = document.getElementById("wa-search")?.value?.toLowerCase() || "";
    const lista = document.getElementById("wa-conversations");
    if (!lista) return;

    let filtrate = conversazioni.filter(c => {
      if (filtroAttivo === "non_letti" && c.nonLetti === 0) return false;
      if (filtroAttivo === "prenotazione" && c.intent !== "prenotazione") return false;
      if (filtroAttivo === "reclamo" && c.intent !== "reclamo") return false;
      if (search && !c.numero.includes(search) && !c.nome.toLowerCase().includes(search)) return false;
      return true;
    });

    if (filtrate.length === 0) {
      lista.innerHTML = `<div style="padding:24px;text-align:center;color:#9ca3af;font-size:14px;">Nessuna conversazione</div>`;
      return;
    }

    lista.innerHTML = filtrate.map(c => {
      const isAttiva = conversazioneAttiva?.numero === c.numero;
      const intentColor = c.intent === "prenotazione" ? "#10b981" :
                          c.intent === "reclamo" ? "#ef4444" : "#6b7280";
      const intentLabel = c.intent === "prenotazione" ? "📅" :
                          c.intent === "reclamo" ? "⚠️" :
                          c.intent === "info_orari" ? "⏰" :
                          c.intent === "info_menu" ? "🍽️" : "💬";
      const data = new Date(c.ultimaData).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

      return `
        <div class="wa-conv-item" data-numero="${c.numero}"
          style="
            padding:12px 16px;
            border-bottom:1px solid #f3f4f6;
            cursor:pointer;
            background:${isAttiva ? "#f0f7ff" : "white"};
            border-left:3px solid ${isAttiva ? "#0E5A7A" : "transparent"};
            transition:background 0.15s;
          ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:16px;">${intentLabel}</span>
              <span style="font-weight:600;font-size:14px;color:#111827;">${c.nome}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;color:#9ca3af;">${data}</span>
              ${c.nonLetti > 0 ? `<span style="background:#ef4444;color:white;border-radius:50%;font-size:10px;padding:2px 6px;font-weight:700;">${c.nonLetti}</span>` : ""}
            </div>
          </div>
          <div style="font-size:12px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${c.ultimoMessaggio?.substring(0, 50) || "[media]"}
          </div>
        </div>
      `;
    }).join("");

    // Click su conversazione
    lista.querySelectorAll(".wa-conv-item").forEach(el => {
      el.onclick = () => {
        const numero = el.dataset.numero;
        const conv = conversazioni.find(c => c.numero === numero);
        if (conv) apriConversazione(conv);
      };
    });
  }

  // ── APRI CONVERSAZIONE ───────────────────────────────────────────────────
  async function apriConversazione(conv) {
    conversazioneAttiva = conv;

    // Mobile: mostra chat a schermo intero
    const chatEl = document.getElementById("wa-chat");
    if (chatEl) chatEl.classList.add("mobile-open");

    // Back button mobile
    const backBtn = document.getElementById("wa-back-btn");
    if (backBtn) {
      backBtn.onclick = () => {
        chatEl?.classList.remove("mobile-open");
        conversazioneAttiva = null;
      };
    }

    // Marca come letti
    await supa()
      .from("whatsapp_messaggi")
      .update({ letto: true })
      .eq("azienda_id", aziendaId)
      .eq("from_numero", conv.numero)
      .eq("letto", false);

    conv.nonLetti = 0;
    renderConversazioni();
    aggiornaContatoreBadge();

    // Header chat
    const header = document.getElementById("wa-chat-header");
    header.innerHTML = `
      <div style="width:40px;height:40px;border-radius:50%;background:#0E5A7A;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;">
        ${conv.nome.charAt(0).toUpperCase()}
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:15px;color:#111827;">${conv.nome}</div>
        <div style="font-size:12px;color:#6b7280;">+${conv.numero}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <span style="padding:4px 10px;border-radius:20px;font-size:12px;background:${conv.intent === 'prenotazione' ? '#d1fae5' : conv.intent === 'reclamo' ? '#fee2e2' : '#f3f4f6'};color:${conv.intent === 'prenotazione' ? '#065f46' : conv.intent === 'reclamo' ? '#991b1b' : '#374151'};">
          ${conv.intent || "generico"}
        </span>
      </div>
    `;

    // Messaggi
    const msgBox = document.getElementById("wa-chat-messages");
    const msgOrdinati = [...conv.messaggi].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    msgBox.innerHTML = msgOrdinati.map(msg => {
      const ora = new Date(msg.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      const isRisposta = msg.risposta_inviata;

      return `
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="
            max-width:75%;
            padding:10px 14px;
            border-radius:${isRisposta ? "12px 12px 0 12px" : "12px 12px 12px 0"};
            background:${isRisposta ? "#f3f4f6" : "white"};
            border:1px solid #e5e7eb;
            font-size:14px;
            color:#111827;
            align-self:flex-start;
          ">
            ${msg.testo || "[media]"}
          </div>
          <div style="font-size:11px;color:#9ca3af;padding:0 4px;">${ora}</div>
        </div>

        ${msg.risposta_testo ? `
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
            <div style="
              max-width:75%;
              padding:10px 14px;
              border-radius:12px 12px 0 12px;
              background:#0E5A7A;
              color:white;
              font-size:14px;
              align-self:flex-end;
            ">
              ${msg.risposta_testo}
            </div>
            <div style="font-size:11px;color:#9ca3af;padding:0 4px;">🤖 Risposta automatica</div>
          </div>
        ` : ""}
      `;
    }).join("");

    // Scroll bottom
    msgBox.scrollTop = msgBox.scrollHeight;

    // Mostra input
    document.getElementById("wa-chat-input").style.display = "block";
  }

  // ── INVIA RISPOSTA MANUALE ───────────────────────────────────────────────
  async function inviaRisposta() {
    const testo = document.getElementById("wa-reply-text")?.value?.trim();
    if (!testo || !conversazioneAttiva) return;

    const btn = document.getElementById("wa-send-btn");
    btn.textContent = "...";
    btn.disabled = true;

    try {
      const { data: conn } = await supa()
        .from("whatsapp_connessioni")
        .select("meta_phone_number_id, meta_access_token")
        .eq("azienda_id", aziendaId)
        .eq("attivo", true)
        .limit(1)
        .maybeSingle();

      if (!conn) throw new Error("Connessione WhatsApp non trovata");

      const session = await supa().auth.getSession();
      const token = session?.data?.session?.access_token
        || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

      const res = await fetch(
        `https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/whatsapp-send-ts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            azienda_id: aziendaId,
            numero_dest: conversazioneAttiva.numero,
            testo,
            contesto: "risposta_manuale",
          }),
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Errore invio");

      document.getElementById("wa-reply-text").value = "";
      await caricaConversazioni();
      const conv = conversazioni.find(c => c.numero === conversazioneAttiva.numero);
      if (conv) apriConversazione(conv);

    } catch (err) {
      alert("Errore invio: " + err.message);
    } finally {
      btn.textContent = "Invia";
      btn.disabled = false;
    }
  }

  // ── AGGIORNA BADGE GLOBALE ───────────────────────────────────────────────
  function aggiornaContatoreBadge() {
    const totaleNonLetti = conversazioni.reduce((acc, c) => acc + c.nonLetti, 0);

    // Badge nel menu/header
    const waBadge = document.getElementById("wa-badge");
    if (waBadge) {
      waBadge.textContent = totaleNonLetti;
      waBadge.style.display = totaleNonLetti > 0 ? "block" : "none";
    }

    // Badge globale notifiche WhatsApp
    if (window.updateWaBadge) {
      window.updateWaBadge(totaleNonLetti);
    }
  }

  // ── EVENT LISTENERS ──────────────────────────────────────────────────────

  // Filtri
  document.querySelectorAll(".wa-filter-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".wa-filter-btn").forEach(b => {
        b.style.background = "white";
        b.style.color = "#374151";
        b.style.borderColor = "#e5e7eb";
        b.classList.remove("active");
      });
      btn.style.background = "#0E5A7A";
      btn.style.color = "white";
      btn.style.borderColor = "#0E5A7A";
      btn.classList.add("active");
      filtroAttivo = btn.dataset.filter;
      renderConversazioni();
    };
  });

  // Ricerca
  document.getElementById("wa-search")?.addEventListener("input", renderConversazioni);

  // Invia
  document.getElementById("wa-send-btn")?.addEventListener("click", inviaRisposta);

  // Enter per inviare
  document.getElementById("wa-reply-text")?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inviaRisposta();
    }
  });

  // Quick replies
  document.querySelectorAll(".wa-quick-reply").forEach(btn => {
    btn.onclick = () => {
      const input = document.getElementById("wa-reply-text");
      if (input) input.value = btn.dataset.text;
    };
  });

  // ── POLLING MESSAGGI NUOVI (ogni 15 secondi) ─────────────────────────────
  await caricaConversazioni();

  const pollInterval = setInterval(async () => {
    await caricaConversazioni();
    if (conversazioneAttiva) {
      const conv = conversazioni.find(c => c.numero === conversazioneAttiva.numero);
      if (conv && conv.messaggi.length !== conversazioneAttiva.messaggi.length) {
        apriConversazione(conv);
      }
    }
  }, 15000);

  // Cleanup al cambio route
  window.addEventListener("hashchange", () => clearInterval(pollInterval), { once: true });
}
