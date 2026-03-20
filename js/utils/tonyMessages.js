// =======================================
// TONY AI - MOTORE MESSAGGI
// =======================================

export function generaMessaggiTony({
  azienda,
  dipendente,
  alignment,
  presenza,
  produzione,
  quiz
}) {

  const messaggi = [];

  const valori = azienda?.visione_ai?.valori || [];
  const regolamento = azienda?.visione_ai?.regolamento_testo || "";
  const profilo = dipendente?.profilo_ai || {};

  /* ======================================
     1. ALLINEAMENTO VALORI
  ====================================== */

  if (alignment?.puntualita === "bassa") {
    messaggi.push({
      tipo: "warning",
      testo: "Negli ultimi giorni la puntualità è sotto gli standard aziendali."
    });
  }

  if (alignment?.collaborazione === "alta") {
    messaggi.push({
      tipo: "positivo",
      testo: "Ottima collaborazione con il team. Continua così."
    });
  }

  if (alignment?.responsabilita === "bassa") {
    messaggi.push({
      tipo: "warning",
      testo: "Serve maggiore responsabilità nelle attività quotidiane."
    });
  }

  /* ======================================
     2. DATI REALI
  ====================================== */

  if (presenza?.ritardi > 3) {
    messaggi.push({
      tipo: "alert",
      testo: "Hai accumulato diversi ritardi recentemente."
    });
  }

  if (produzione?.score < 5) {
    messaggi.push({
      tipo: "warning",
      testo: "La performance in produzione è sotto la media."
    });
  }

  if (quiz?.score >= 8) {
    messaggi.push({
      tipo: "positivo",
      testo: "Ottimi risultati nei test di competenza."
    });
  }

  /* ======================================
     3. CRESCITA PERSONALE
  ====================================== */

  if (profilo?.crescita && alignment?.qualita === "bassa") {
    messaggi.push({
      tipo: "crescita",
      testo: "Vuoi migliorare e questo è il momento giusto per lavorare sulla qualità."
    });
  }

  if (profilo?.ruolo_target) {
    messaggi.push({
      tipo: "motivazione",
      testo: `Il tuo obiettivo è diventare ${profilo.ruolo_target}. Continua a crescere in questa direzione.`
    });
  }

  /* ======================================
     4. REGOLAMENTO
  ====================================== */

  if (alignment?.puntualita === "bassa" && regolamento) {
    messaggi.push({
      tipo: "regola",
      testo: "Ricorda: la puntualità è un valore fondamentale dell’azienda."
    });
  }

  /* ======================================
     5. FALLBACK
  ====================================== */

  if (messaggi.length === 0) {
    messaggi.push({
      tipo: "neutro",
      testo: "Andamento stabile. Continua così."
    });
  }

  return messaggi;
}

/* ======================================
   FORMAT UI
====================================== */

export function renderMessaggiTony(messaggi) {

  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${messaggi.map(m => `
        <div style="
          padding:10px;
          border-radius:10px;
          background:${getColor(m.tipo)};
          font-size:14px;
        ">
          ${m.testo}
        </div>
      `).join("")}
    </div>
  `;
}

function getColor(tipo) {
  if (tipo === "positivo") return "#dcfce7";
  if (tipo === "warning") return "#fef3c7";
  if (tipo === "alert") return "#fee2e2";
  if (tipo === "crescita") return "#dbeafe";
  if (tipo === "motivazione") return "#ede9fe";
  if (tipo === "regola") return "#ffe4e6";
  return "#f3f4f6";
}
