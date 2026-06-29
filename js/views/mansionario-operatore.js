// js/views/mansionario-operatore.js
// Vista operatore: studia → esegui → firma la procedura
// Accessibile da home-operatore tramite card Mansionario

const supa = () => window.supabaseClient || window.supabase;
const EDGE_TONY = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai";

const CATEGORIE = {
  mise_en_place: { label: "Mise en Place",     icon: "🍽️" },
  accoglienza:   { label: "Accoglienza",        icon: "🤝" },
  servizio:      { label: "Servizio al Tavolo", icon: "🫗" },
  vendita:       { label: "Vendita & Upselling",icon: "💬" },
  operativo:     { label: "Operativo Turno",    icon: "📋" },
  igiene:        { label: "Igiene & HACCP",     icon: "🧹" },
};

function getAziendaId() { return window.state?.azienda?.id || null; }
function getDipendenteId() { return window.state?.dipendente?.id || null; }
function getDipendenteName() {
  const d = window.state?.dipendente;
  return d ? `${d.nome||""} ${d.cognome||""}`.trim() : (window.state?.user?.email || "");
}
function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// ═══════════════════════════════════════════════════════
// CARICA DATI
// ═══════════════════════════════════════════════════════
async function loadProcedure() {
  const { data } = await supa()
    .from("procedure_sala")
    .select("*")
    .eq("azienda_id", getAziendaId())
    .eq("attivo", true)
    .order("categoria").order("nome");
  return data || [];
}

async function loadFasi(proceduraId) {
  const { data } = await supa()
    .from("procedure_sala_fasi")
    .select("*")
    .eq("procedura_id", proceduraId)
    .order("ordine");
  return data || [];
}

async function loadEsecuzioneOggi(proceduraId) {
  const oggi = new Date().toISOString().slice(0, 10);
  const dipId = getDipendenteId();
  if (!dipId) return null;
  const { data } = await supa()
    .from("procedure_sala_esecuzioni")
    .select("*")
    .eq("procedura_id", proceduraId)
    .eq("azienda_id", getAziendaId())
    .eq("dipendente_id", dipId)
    .eq("data_esecuzione", oggi)
    .maybeSingle();
  return data;
}

async function loadTutteEsecuzioniOggi() {
  const oggi = new Date().toISOString().slice(0, 10);
  const dipId = getDipendenteId();
  if (!dipId) return [];
  const { data } = await supa()
    .from("procedure_sala_esecuzioni")
    .select("procedura_id, completata, quiz_superato")
    .eq("azienda_id", getAziendaId())
    .eq("dipendente_id", dipId)
    .eq("data_esecuzione", oggi);
  return data || [];
}

// ═══════════════════════════════════════════════════════
// RENDER LISTA
// ═══════════════════════════════════════════════════════
async function renderLista(container) {
  const [procedure, esecuzioni] = await Promise.all([loadProcedure(), loadTutteEsecuzioniOggi()]);
  const eseMap = {};
  esecuzioni.forEach(e => { eseMap[e.procedura_id] = e; });

  const perCat = {};
  Object.keys(CATEGORIE).forEach(k => perCat[k] = []);
  procedure.forEach(p => { (perCat[p.categoria] || (perCat["servizio"])).push(p); });

  // KPI rapidi
  const totali = procedure.length;
  const completate = esecuzioni.filter(e => e.completata).length;
  const studiate = esecuzioni.filter(e => e.quiz_superato).length;

  container.innerHTML = `
    <div style="padding:16px;padding-bottom:100px;">

      <!-- HEADER -->
      <div style="margin-bottom:20px;">
        <div style="font-size:22px;font-weight:800;">📋 Mansionario di Sala</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">
          Le procedure operative del tuo ruolo
        </div>
      </div>

      <!-- KPI GIORNO -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
        ${[
          { label:"Procedure", val:totali, icon:"📋", color:"#0E5A7A" },
          { label:"Studiate",  val:studiate, icon:"🧠", color:"#7c3aed" },
          { label:"Completate",val:completate, icon:"✅", color:"#16a34a" },
        ].map(k => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:14px;text-align:center;">
            <div style="font-size:20px;">${k.icon}</div>
            <div style="font-size:22px;font-weight:800;color:${k.color};">${k.val}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">${k.label}</div>
          </div>
        `).join("")}
      </div>

      <!-- LISTA PROCEDURE PER CATEGORIA -->
      ${Object.entries(CATEGORIE).filter(([k]) => perCat[k]?.length).map(([catId, cat]) => `
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">
            ${cat.icon} ${cat.label}
          </div>
          <div style="display:grid;gap:10px;">
            ${perCat[catId].map(p => {
              const ese = eseMap[p.id];
              const completata = ese?.completata;
              const studiata = ese?.quiz_superato;
              return `
                <div data-proc-id="${esc(p.id)}" onclick="mostraDettaglio('${esc(p.id)}')"
                  style="background:white;border:2px solid ${completata ? '#16a34a' : '#e5e7eb'};border-radius:14px;padding:16px;cursor:pointer;display:flex;align-items:center;gap:14px;">
                  <div style="font-size:28px;flex-shrink:0;">${completata ? "✅" : studiata ? "🧠" : "⬜"}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:14px;">${esc(p.nome)}</div>
                    ${p.obiettivo ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.obiettivo)}</div>` : ""}
                    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
                      ${p.durata_min ? `<span style="font-size:11px;color:#6b7280;">⏱ ${p.durata_min} min</span>` : ""}
                      ${studiata ? `<span style="background:#f3e8ff;color:#7c3aed;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:600;">Studiata</span>` : ""}
                      ${completata ? `<span style="background:#dcfce7;color:#16a34a;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:600;">Completata oggi</span>` : ""}
                    </div>
                  </div>
                  <div style="font-size:20px;color:#d1d5db;flex-shrink:0;">›</div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  // bind globale
  window.mostraDettaglio = (id) => renderDettaglio(container, id, procedure);
}

// ═══════════════════════════════════════════════════════
// RENDER DETTAGLIO PROCEDURA
// ═══════════════════════════════════════════════════════
async function renderDettaglio(container, procId, procedure) {
  const proc = procedure.find(p => p.id === procId);
  if (!proc) return;

  const [fasi, esecuzione] = await Promise.all([loadFasi(procId), loadEsecuzioneOggi(procId)]);
  const fasiCompletate = new Set(esecuzione?.fasi_completate || []);
  let esecuzioneId = esecuzione?.id || null;

  const cat = CATEGORIE[proc.categoria] || CATEGORIE["servizio"];
  const media = proc.media_urls || [];

  container.innerHTML = `
    <div style="padding:16px;padding-bottom:100px;">

      <!-- BACK -->
      <button id="btn-back" style="background:none;border:none;color:#0E5A7A;font-size:14px;font-weight:600;cursor:pointer;padding:0 0 16px;display:flex;align-items:center;gap:6px;">
        ← Torna al mansionario
      </button>

      <!-- HEADER PROCEDURA -->
      <div style="background:linear-gradient(135deg,#0E5A7A,#1a7a9f);color:white;border-radius:16px;padding:20px;margin-bottom:16px;">
        <div style="font-size:13px;opacity:.8;margin-bottom:4px;">${cat.icon} ${cat.label}</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:8px;">${esc(proc.nome)}</div>
        ${proc.obiettivo ? `<div style="font-size:13px;opacity:.9;line-height:1.5;">${esc(proc.obiettivo)}</div>` : ""}
        <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
          ${proc.durata_min ? `<span style="background:rgba(255,255,255,.2);border-radius:20px;padding:4px 12px;font-size:12px;">⏱ ${proc.durata_min} min</span>` : ""}
          ${proc.difficolta ? `<span style="background:rgba(255,255,255,.2);border-radius:20px;padding:4px 12px;font-size:12px;">${proc.difficolta}</span>` : ""}
        </div>
      </div>

      <!-- AZIONI PRINCIPALI -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <button id="btn-studia" style="background:#7c3aed;color:white;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
          🧠 Studia con Tony
        </button>
        <button id="btn-esegui" style="background:#0E5A7A;color:white;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
          ▶️ Esegui ora
        </button>
      </div>

      <!-- MEDIA PROCEDURA -->
      ${media.length ? `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:14px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📸 Foto & Video</div>
          <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
            ${media.map(url => url.match(/\.(mp4|mov|webm)$/i)
              ? `<video src="${esc(url)}" controls style="height:120px;border-radius:8px;flex-shrink:0;"></video>`
              : `<img src="${esc(url)}" onclick="apriMedia('${esc(url)}')" style="height:120px;border-radius:8px;flex-shrink:0;object-fit:cover;cursor:pointer;">`
            ).join("")}
          </div>
        </div>
      ` : ""}

      <!-- MATERIALI -->
      ${proc.materiali?.length ? `
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:14px;padding:14px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;">📦 Materiali necessari</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${proc.materiali.map(m => `<span style="background:white;border:1px solid #fde68a;border-radius:20px;padding:3px 10px;font-size:12px;">${esc(m)}</span>`).join("")}
          </div>
        </div>
      ` : ""}

      <!-- FASI OPERATIVE -->
      <div style="margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📋 Fasi operative</div>
        <div id="fasi-list">
          ${fasi.map((f, idx) => {
            const completata = fasiCompletate.has(f.ordine);
            const fasMedia = f.media_urls || [];
            return `
              <div data-fase-ordine="${f.ordine}" style="background:white;border:2px solid ${completata ? '#16a34a' : '#e5e7eb'};border-radius:14px;padding:16px;margin-bottom:10px;opacity:${completata ? '.8' : '1'};">
                <div style="display:flex;align-items:flex-start;gap:12px;">
                  <button class="btn-check-fase" data-ordine="${f.ordine}"
                    style="width:28px;height:28px;border-radius:50%;border:2px solid ${completata ? '#16a34a' : '#d1d5db'};background:${completata ? '#16a34a' : 'white'};cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;">
                    ${completata ? "✓" : ""}
                  </button>
                  <div style="flex:1;">
                    <div style="font-weight:700;font-size:14px;${completata ? 'text-decoration:line-through;color:#6b7280;' : ''}">${idx+1}. ${esc(f.titolo)}</div>
                    ${f.descrizione_operativa ? `<div style="font-size:13px;color:#374151;margin-top:6px;line-height:1.6;">${esc(f.descrizione_operativa)}</div>` : ""}
                    ${f.durata_min ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">⏱ ${f.durata_min} min</div>` : ""}
                    ${fasMedia.length ? `
                      <div style="display:flex;gap:6px;overflow-x:auto;margin-top:8px;padding-bottom:4px;">
                        ${fasMedia.map(url => url.match(/\.(mp4|mov|webm)$/i)
                          ? `<video src="${esc(url)}" controls style="height:80px;border-radius:8px;flex-shrink:0;"></video>`
                          : `<img src="${esc(url)}" onclick="apriMedia('${esc(url)}')" style="height:80px;border-radius:8px;flex-shrink:0;object-fit:cover;cursor:pointer;">`
                        ).join("")}
                      </div>
                    ` : ""}
                    ${f.tip_pro ? `
                      <div style="background:#f0f9ff;border-left:3px solid #0E5A7A;border-radius:0 8px 8px 0;padding:8px 12px;margin-top:8px;font-size:12px;color:#0E5A7A;">
                        💡 <strong>Tip pro:</strong> ${esc(f.tip_pro)}
                      </div>
                    ` : ""}
                    ${f.check_qualita ? `
                      <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 8px 8px 0;padding:8px 12px;margin-top:6px;font-size:12px;color:#15803d;">
                        ✅ <strong>Autocontrollo:</strong> ${esc(f.check_qualita)}
                      </div>
                    ` : ""}
                    ${f.errori_comuni ? `
                      <div style="background:#fff7ed;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:8px 12px;margin-top:6px;font-size:12px;color:#92400e;">
                        ⚠️ ${esc(f.errori_comuni)}
                      </div>
                    ` : ""}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- STANDARD QUALITÀ -->
      ${proc.standard_qualita ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:14px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:#15803d;margin-bottom:6px;">🏆 Standard di qualità</div>
          <div style="font-size:13px;color:#166534;">${esc(proc.standard_qualita)}</div>
        </div>
      ` : ""}

      <!-- FIRMA ESECUZIONE -->
      <div id="firma-box" style="background:white;border:2px solid #e5e7eb;border-radius:14px;padding:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;">✍️ Firma esecuzione</div>
        <textarea id="note-esecuzione" placeholder="Note opzionali..."
          style="width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:8px;padding:10px;font-size:13px;resize:vertical;font-family:inherit;margin-bottom:10px;" rows="2">${esc(esecuzione?.note_operatore||"")}</textarea>
        <button id="btn-firma" style="width:100%;background:#16a34a;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;">
          ${esecuzione?.completata ? "✅ Firmata — aggiorna nota" : "✅ Segna come completata"}
        </button>
        ${esecuzione?.completata ? `<div style="text-align:center;font-size:12px;color:#16a34a;margin-top:6px;">Firmata il ${new Date(esecuzione.firmata_alle).toLocaleString("it-IT")}</div>` : ""}
      </div>
    </div>
  `;

  // BACK
  document.getElementById("btn-back").onclick = () => renderLista(container);

  // CHECK FASE — salva in real time
  container.querySelectorAll(".btn-check-fase").forEach(btn => {
    btn.onclick = async () => {
      const ordine = Number(btn.dataset.ordine);
      if (fasiCompletate.has(ordine)) fasiCompletate.delete(ordine);
      else fasiCompletate.add(ordine);

      // Salva/aggiorna esecuzione
      const payload = {
        procedura_id: procId,
        azienda_id: getAziendaId(),
        dipendente_id: getDipendenteId(),
        dipendente_nome: getDipendenteName(),
        data_esecuzione: new Date().toISOString().slice(0, 10),
        fasi_completate: [...fasiCompletate],
        completata: false,
      };
      if (esecuzioneId) {
        await supa().from("procedure_sala_esecuzioni").update(payload).eq("id", esecuzioneId);
      } else {
        const { data } = await supa().from("procedure_sala_esecuzioni").insert(payload).select("id").single();
        esecuzioneId = data?.id;
      }
      // Ri-renderizza solo le fasi
      await renderDettaglio(container, procId, procedure);
    };
  });

  // FIRMA COMPLETA
  document.getElementById("btn-firma").onclick = async () => {
    const note = document.getElementById("note-esecuzione").value.trim();
    const payload = {
      procedura_id: procId,
      azienda_id: getAziendaId(),
      dipendente_id: getDipendenteId(),
      dipendente_nome: getDipendenteName(),
      data_esecuzione: new Date().toISOString().slice(0, 10),
      fasi_completate: [...fasiCompletate],
      completata: true,
      firmata_alle: new Date().toISOString(),
      note_operatore: note || null,
    };
    if (esecuzioneId) {
      await supa().from("procedure_sala_esecuzioni").update(payload).eq("id", esecuzioneId);
    } else {
      const { data } = await supa().from("procedure_sala_esecuzioni").insert(payload).select("id").single();
      esecuzioneId = data?.id;
    }
    await renderDettaglio(container, procId, procedure);
  };

  // STUDIA CON TONY
  document.getElementById("btn-studia").onclick = () => avviaQuizTony(container, proc, fasi, procedure);

  // ESEGUI — scorri alle fasi
  document.getElementById("btn-esegui").onclick = () => {
    document.getElementById("fasi-list")?.scrollIntoView({ behavior:"smooth" });
  };

  // APRI MEDIA
  window.apriMedia = (url) => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;";
    ov.innerHTML = `<img src="${esc(url)}" style="max-width:95vw;max-height:95vh;border-radius:8px;object-fit:contain;">`;
    ov.onclick = () => ov.remove();
    document.body.appendChild(ov);
  };
}

// ═══════════════════════════════════════════════════════
// QUIZ TONY — studia la procedura
// ═══════════════════════════════════════════════════════
async function avviaQuizTony(container, proc, fasi, procedure) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px 20px 0 0;width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#9c5cf8);color:white;padding:16px 20px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <span style="font-size:24px;">🧠</span>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:15px;">Tony — Studio ${proc.nome}</div>
          <div style="font-size:11px;opacity:.8;">Tony ti farà domande sulla procedura</div>
        </div>
        <button id="quiz-close" style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;">✕</button>
      </div>
      <div id="quiz-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;"></div>
      <div style="padding:12px 14px;border-top:1px solid #f1f5f9;display:flex;gap:8px;flex-shrink:0;">
        <input id="quiz-input" placeholder="Rispondi..." style="flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;">
        <button id="quiz-send" style="background:#7c3aed;color:white;border:none;padding:10px 16px;border-radius:12px;cursor:pointer;font-size:16px;">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const msgs   = overlay.querySelector("#quiz-msgs");
  const input  = overlay.querySelector("#quiz-input");
  const send   = overlay.querySelector("#quiz-send");
  overlay.querySelector("#quiz-close").onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  let storia = [];
  let risposteCorrette = 0;
  let totDomande = 0;

  function aggMsg(testo, tipo) {
    const div = document.createElement("div");
    div.style.cssText = tipo === "user"
      ? "background:#7c3aed;color:white;padding:10px 14px;border-radius:14px;border-bottom-right-radius:4px;align-self:flex-end;max-width:85%;font-size:13px;line-height:1.5;"
      : "background:#f3e8ff;color:#374151;padding:10px 14px;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;max-width:85%;font-size:13px;line-height:1.5;";
    div.textContent = testo;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Primo messaggio Tony: spiega e inizia
  const contestoProc = `
PROCEDURA: ${proc.nome}
OBIETTIVO: ${proc.obiettivo || ""}
MATERIALI: ${(proc.materiali||[]).join(", ")}
FASI: ${fasi.map((f,i) => `${i+1}. ${f.titolo}: ${f.descrizione_operativa||""} ${f.tip_pro ? "(tip: "+f.tip_pro+")" : ""}`).join(" | ")}
STANDARD: ${proc.standard_qualita || ""}
ERRORI COMUNI: ${proc.errori_comuni || ""}
  `.trim();

  const systemPrompt = `Sei Tony, coach di sala per Ristoflow. Stai aiutando un operatore a studiare questa procedura di sala prima del turno.

${contestoProc}

REGOLE:
- Fai UNA domanda alla volta sulla procedura
- Dopo ogni risposta: valuta (corretto/parziale/sbagliato), spiega brevemente, poi fai la domanda successiva
- Usa un tono incoraggiante e pratico
- Fai max 5 domande totali, poi dai un punteggio finale (0-100) in questo formato esatto: "PUNTEGGIO_FINALE: XX"
- Le domande devono coprire: materiali, fasi, errori da evitare, tip pro, standard qualità
- Parla sempre in italiano, tono diretto e caldo
- Inizia presentandoti e facendo la prima domanda`;

  const loading = document.createElement("div");
  loading.style.cssText = "background:#f3e8ff;color:#374151;padding:10px 14px;border-radius:14px;align-self:flex-start;font-size:13px;";
  loading.textContent = "⏳";
  msgs.appendChild(loading);

  try {
    const s = await supa().auth.getSession();
    const tok = s?.data?.session?.access_token || "";
    const res = await fetch(EDGE_TONY, {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok,"apikey":tok},
      body: JSON.stringify({
        azienda_id: getAziendaId(),
        messages: [{ role:"user", content:"Inizia il quiz sulla procedura" }],
        // sistema prompt iniettato nel contesto
        messages: [
          { role:"user", content: systemPrompt },
          { role:"assistant", content:"Perfetto, ho capito la procedura. Sono pronto a iniziare il quiz." },
          { role:"user", content:"Inizia il quiz" }
        ]
      })
    });
    const data = await res.json();
    loading.remove();
    const reply = data.reply || "Ciao! Iniziamo a studiare insieme questa procedura.";
    aggMsg(reply, "tony");
    storia.push({ role:"assistant", content:reply });
  } catch(e) {
    loading.textContent = "Errore connessione. Riprova.";
  }

  // Gestione risposte
  async function invia() {
    const testo = input.value.trim();
    if (!testo) return;
    input.value = "";
    aggMsg(testo, "user");
    storia.push({ role:"user", content:testo });
    totDomande++;

    const ld = document.createElement("div");
    ld.style.cssText = "background:#f3e8ff;padding:10px 14px;border-radius:14px;align-self:flex-start;font-size:13px;color:#374151;";
    ld.textContent = "⏳";
    msgs.appendChild(ld);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const s = await supa().auth.getSession();
      const tok = s?.data?.session?.access_token || "";
      const messConText = [
        { role:"user", content: systemPrompt },
        { role:"assistant", content:"Perfetto, ho capito la procedura. Sono pronto a iniziare il quiz." },
        ...storia
      ];
      const res = await fetch(EDGE_TONY, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok,"apikey":tok},
        body: JSON.stringify({ azienda_id: getAziendaId(), messages: messConText })
      });
      const data = await res.json();
      ld.remove();
      const reply = data.reply || "...";
      aggMsg(reply, "tony");
      storia.push({ role:"assistant", content:reply });

      // Controlla punteggio finale
      const match = reply.match(/PUNTEGGIO_FINALE:\s*(\d+)/i);
      if (match) {
        const punteggio = Math.min(100, Math.max(0, Number(match[1])));
        const superato = punteggio >= 70;

        // Salva risultato quiz
        const oggi = new Date().toISOString().slice(0, 10);
        const dipId = getDipendenteId();
        if (dipId) {
          const { data: ese } = await supa()
            .from("procedure_sala_esecuzioni")
            .select("id")
            .eq("procedura_id", proc.id)
            .eq("azienda_id", getAziendaId())
            .eq("dipendente_id", dipId)
            .eq("data_esecuzione", oggi)
            .maybeSingle();

          const quizPayload = {
            procedura_id: proc.id, azienda_id: getAziendaId(),
            dipendente_id: dipId, dipendente_nome: getDipendenteName(),
            data_esecuzione: oggi, quiz_superato: superato,
            quiz_punteggio: punteggio, quiz_data: new Date().toISOString(),
          };
          if (ese?.id) await supa().from("procedure_sala_esecuzioni").update(quizPayload).eq("id", ese.id);
          else await supa().from("procedure_sala_esecuzioni").insert(quizPayload);
        }

        // Badge risultato
        setTimeout(() => {
          const badge = document.createElement("div");
          badge.style.cssText = `background:${superato?"#dcfce7":"#fee2e2"};border:2px solid ${superato?"#16a34a":"#dc2626"};border-radius:14px;padding:16px;text-align:center;margin-top:10px;`;
          badge.innerHTML = `
            <div style="font-size:32px;">${superato ? "🎉" : "📚"}</div>
            <div style="font-size:22px;font-weight:800;color:${superato?"#16a34a":"#dc2626"};">${punteggio}/100</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${superato ? "Procedura studiata!" : "Ripassala ancora"}</div>
            <button onclick="this.closest('[style*=position]').remove()" style="margin-top:12px;background:${superato?"#16a34a":"#dc2626"};color:white;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:700;">
              ${superato ? "✅ Vai ad eseguirla" : "🔄 Riprova"}
            </button>
          `;
          msgs.appendChild(badge);
          msgs.scrollTop = msgs.scrollHeight;
        }, 500);
      }
    } catch(e) {
      ld.textContent = "❌ Errore: " + e.message;
    }
  }

  send.onclick = invia;
  input.onkeydown = e => { if (e.key === "Enter") invia(); };
  input.focus();
}

// ═══════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════
export async function render(container) {
  if (!getAziendaId()) {
    container.innerHTML = `<div style="padding:20px;color:#94a3b8;">Azienda non selezionata</div>`;
    return;
  }
  await renderLista(container);
}
