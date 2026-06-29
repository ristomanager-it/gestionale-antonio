// js/views/mansionario-controllo.js
// Dashboard manager: chi ha studiato, chi ha eseguito, punteggi quiz, valutazioni

import { createPageLayout, createCard } from "../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

function getAziendaId() { return window.state?.azienda?.id || null; }
function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

const CATEGORIE = {
  mise_en_place:"🍽️", accoglienza:"🤝", servizio:"🫗",
  vendita:"💬", operativo:"📋", igiene:"🧹"
};

export async function render(container) {
  container.innerHTML = `<div style="padding:20px;color:#94a3b8;">Caricamento...</div>`;

  const oggi = new Date().toISOString().slice(0, 10);
  const [procData, eseData, valData, dipData] = await Promise.all([
    supa().from("procedure_sala").select("id,nome,categoria,difficolta").eq("azienda_id", getAziendaId()).eq("attivo", true),
    supa().from("procedure_sala_esecuzioni").select("*").eq("azienda_id", getAziendaId()).gte("created_at", oggi+"T00:00:00").order("created_at", { ascending: false }),
    supa().from("procedure_sala_valutazioni").select("*").eq("azienda_id", getAziendaId()).gte("created_at", oggi+"T00:00:00").order("created_at", { ascending: false }),
    supa().from("dipendenti").select("id,nome,cognome,mansione").eq("azienda_id", getAziendaId()).eq("attivo", true),
  ]);

  const procedure = procData.data || [];
  const esecuzioni = eseData.data || [];
  const valutazioni = valData.data || [];
  const dipendenti = dipData.data || [];

  // KPI
  const totProc = procedure.length;
  const totEse  = esecuzioni.filter(e => e.completata).length;
  const totQuiz = esecuzioni.filter(e => e.quiz_superato).length;
  const mediaQuiz = esecuzioni.filter(e => e.quiz_punteggio != null).length
    ? Math.round(esecuzioni.filter(e => e.quiz_punteggio != null).reduce((s,e)=>s+(e.quiz_punteggio||0),0) / esecuzioni.filter(e => e.quiz_punteggio != null).length)
    : null;

  // Per dipendente
  const perDip = {};
  dipendenti.forEach(d => {
    perDip[d.id] = { nome: `${d.nome} ${d.cognome||""}`.trim(), eseguite: 0, studiate: 0, quizMedia: null, quizPunti: [], valMedia: null, valPunti: [] };
  });
  esecuzioni.forEach(e => {
    if (!e.dipendente_id || !perDip[e.dipendente_id]) return;
    if (e.completata) perDip[e.dipendente_id].eseguite++;
    if (e.quiz_superato) perDip[e.dipendente_id].studiate++;
    if (e.quiz_punteggio != null) perDip[e.dipendente_id].quizPunti.push(e.quiz_punteggio);
  });
  valutazioni.forEach(v => {
    if (!v.dipendente_id || !perDip[v.dipendente_id]) return;
    if (v.punteggio != null) perDip[v.dipendente_id].valPunti.push(v.punteggio);
  });
  Object.values(perDip).forEach(d => {
    d.quizMedia = d.quizPunti.length ? Math.round(d.quizPunti.reduce((a,b)=>a+b,0)/d.quizPunti.length) : null;
    d.valMedia  = d.valPunti.length  ? Math.round(d.valPunti.reduce((a,b)=>a+b,0)/d.valPunti.length*10)/10 : null;
  });

  // Per procedura
  const perProc = {};
  procedure.forEach(p => { perProc[p.id] = { nome: p.nome, categoria: p.categoria, eseguite: 0, studiate: 0 }; });
  esecuzioni.forEach(e => {
    if (!perProc[e.procedura_id]) return;
    if (e.completata) perProc[e.procedura_id].eseguite++;
    if (e.quiz_superato) perProc[e.procedura_id].studiate++;
  });

  container.innerHTML = createPageLayout({
    title: "📊 Controllo Mansionario",
    subtitle: `Stato di oggi — ${new Date().toLocaleDateString("it-IT", { weekday:"long", day:"numeric", month:"long" })}`,
    content: `

      <!-- KPI GIORNO -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px;">
        ${[
          { icon:"📋", label:"Procedure attive", val:totProc, color:"#0E5A7A" },
          { icon:"✅", label:"Esecuzioni oggi",   val:totEse,  color:"#16a34a" },
          { icon:"🧠", label:"Quiz superati",     val:totQuiz, color:"#7c3aed" },
          { icon:"⭐", label:"Media quiz",        val:mediaQuiz!=null?mediaQuiz+"%":"—", color:"#d97706" },
        ].map(k => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;">${k.icon}</div>
            <div style="font-size:24px;font-weight:800;color:${k.color};margin-top:4px;">${k.val}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">${k.label}</div>
          </div>
        `).join("")}
      </div>

      <!-- PERFORMANCE PER DIPENDENTE -->
      ${createCard({ title: "👥 Performance staff oggi", body: `
        ${!Object.values(perDip).some(d => d.eseguite > 0 || d.studiate > 0)
          ? '<div style="color:#94a3b8;font-size:13px;">Nessuna attività registrata oggi</div>'
          : `<div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="background:#f8fafc;">
                    ${["Dipendente","Studiate","Eseguite","Media quiz","Media voto manager"].map(h=>`
                      <th style="padding:8px 12px;text-align:${h==="Dipendente"?"left":"center"};font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">${h}</th>
                    `).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(perDip)
                    .filter(([,d]) => d.eseguite > 0 || d.studiate > 0 || d.quizMedia != null)
                    .sort(([,a],[,b]) => b.eseguite - a.eseguite)
                    .map(([id, d]) => `
                      <tr style="border-bottom:1px solid #f1f5f9;" onclick="location.hash='#/mansionario-dip-${id}'" style="cursor:pointer;">
                        <td style="padding:10px 12px;font-weight:600;">${esc(d.nome)}</td>
                        <td style="padding:10px 12px;text-align:center;">
                          ${d.studiate > 0 ? `<span style="background:#f3e8ff;color:#7c3aed;border-radius:20px;padding:2px 10px;font-weight:600;">${d.studiate}</span>` : "—"}
                        </td>
                        <td style="padding:10px 12px;text-align:center;">
                          ${d.eseguite > 0 ? `<span style="background:#dcfce7;color:#16a34a;border-radius:20px;padding:2px 10px;font-weight:600;">${d.eseguite}</span>` : "—"}
                        </td>
                        <td style="padding:10px 12px;text-align:center;font-weight:700;color:${d.quizMedia!=null?(d.quizMedia>=70?"#16a34a":"#dc2626"):"#94a3b8"};">
                          ${d.quizMedia != null ? d.quizMedia+"%" : "—"}
                        </td>
                        <td style="padding:10px 12px;text-align:center;">
                          ${d.valMedia != null ? "⭐".repeat(Math.round(d.valMedia)) + ` <span style="font-size:11px;color:#6b7280;">(${d.valMedia})</span>` : "—"}
                        </td>
                      </tr>
                    `).join("")}
                </tbody>
              </table>
            </div>`
        }
      `})}

      <!-- COPERTURA PROCEDURE -->
      ${createCard({ title: "📋 Copertura procedure oggi", body: `
        <div style="display:grid;gap:8px;">
          ${procedure.map(p => {
            const d = perProc[p.id];
            const pct = totEse > 0 ? Math.round(d.eseguite / Math.max(dipendenti.length, 1) * 100) : 0;
            const catIcon = CATEGORIE[p.categoria] || "📋";
            return `
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:20px;text-align:center;flex-shrink:0;">${catIcon}</div>
                <div style="flex:1;font-size:13px;font-weight:600;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.nome)}</div>
                <div style="width:80px;background:#f1f5f9;border-radius:999px;height:8px;flex-shrink:0;">
                  <div style="background:${d.eseguite>0?"#16a34a":"#e5e7eb"};width:${Math.min(100,pct)}%;height:100%;border-radius:999px;"></div>
                </div>
                <div style="font-size:12px;color:#6b7280;width:60px;text-align:right;flex-shrink:0;">
                  ${d.eseguite}✅ ${d.studiate}🧠
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `})}

      <!-- VALUTAZIONI RECENTI -->
      ${valutazioni.length ? createCard({ title: "⭐ Valutazioni di oggi", body: `
        <div style="display:grid;gap:10px;">
          ${valutazioni.slice(0, 10).map(v => `
            <div style="background:#f8fafc;border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;">
              <div style="font-size:22px;">⭐</div>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:13px;">${esc(v.dipendente_nome||"N/D")}</div>
                <div style="font-size:12px;color:#6b7280;">${esc(procedure.find(p=>p.id===v.procedura_id)?.nome||"")}</div>
                ${v.note_valutatore ? `<div style="font-size:12px;color:#374151;margin-top:4px;font-style:italic;">"${esc(v.note_valutatore)}"</div>` : ""}
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:18px;">${"⭐".repeat(v.punteggio||0)}</div>
                <div style="font-size:11px;color:${v.eseguito_correttamente?"#16a34a":"#dc2626"};font-weight:600;">
                  ${v.eseguito_correttamente ? "✅ Corretto" : "❌ Da migliorare"}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `) : ""}

      <div style="display:flex;gap:10px;margin-top:16px;">
        <button onclick="location.hash='#/mansionario-sala'" class="app-button secondary" style="flex:1;">
          ← Torna al Mansionario
        </button>
      </div>
    `
  });
}
