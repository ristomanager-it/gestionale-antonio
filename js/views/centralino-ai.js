// js/views/centralino-ai.js
// Centralino AI: la voce che risponde al telefono del locale, prende le prenotazioni e risponde alle domande.
// Il locale sceglie voce, saluto, cose da sapere e a chi passare la chiamata; al salvataggio
// la funzione centralino-agenti aggiorna (o crea) gli agenti italiano e inglese su ElevenLabs.
// Orari, indirizzo e menu del giorno la voce li legge dall'app durante la chiamata.

const supa = () => window.supabaseClient || window.supabase;
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function render(container) {
  container.innerHTML = `<section class="view" style="max-width:760px;margin:0 auto;padding:12px 12px 90px;">
    <h2 style="margin:4px 0 12px;">📞 Centralino AI</h2><div id="cai-box"></div></section>`;
  await renderCentralinoAI(container.querySelector("#cai-box"));
}

export async function renderCentralinoAI(box) {
  const azienda = window.state?.azienda;
  if (!azienda) { box.innerHTML = "<p>Nessuna azienda attiva</p>"; return; }
  const admin = ["admin", "superadmin"].includes(window.state?.ruolo) || !!window.state?.isSuperadmin;
  box.innerHTML = `<div style="color:#94a3b8;padding:12px;">Caricamento centralino AI…</div>`;

  const { data: sedi } = await supa().from("sedi").select("id,nome").eq("azienda_id", azienda.id).order("nome");
  let sedeId = window.state?.sedeAttiva?.id || sedi?.[0]?.id || null;
  let voci = null; // caricate una volta
  let audio = null;

  async function caricaVoci() {
    if (voci) return voci;
    const { data, error } = await supa().functions.invoke("centralino-agenti", { body: { azione: "voci" } });
    voci = error ? { errore: await testoErrore(error) } : (data?.voci || []);
    return voci;
  }

  async function disegna() {
    const { data: cfgs } = await supa().from("centralino_config").select("*").eq("azienda_id", azienda.id).eq("sede_id", sedeId).limit(1);
    const c = cfgs?.[0] || {};
    const v = await caricaVoci();
    const sedeNome = (sedi || []).find((s) => s.id === sedeId)?.nome || "";
    const salutoDefault = `Buongiorno, ${sedeNome}! Sono l'assistente per le prenotazioni. Come posso aiutarla?`;
    const dis = admin ? "" : "disabled";

    const opzVoci = Array.isArray(v)
      ? v.map((x) => `<option value="${esc(x.voice_id)}" data-anteprima="${esc(x.anteprima || "")}" ${x.voice_id === c.voce_ai ? "selected" : ""}>${x.italiana ? "🇮🇹 " : ""}${esc(x.nome)}${x.genere ? " · " + esc(x.genere === "female" ? "donna" : x.genere === "male" ? "uomo" : x.genere) : ""}${x.accento ? " · " + esc(x.accento) : ""}</option>`).join("")
      : "";

    box.innerHTML = `
      <style>
        .cai-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin-bottom:12px;}
        .cai-card h4{margin:0 0 4px;font-size:15px;color:#0f172a;}
        .cai-card p.h{margin:0 0 10px;font-size:12.5px;color:#64748b;line-height:1.45;}
        .cai-in{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;}
        .cai-row{display:flex;gap:8px;align-items:center;}
        .cai-btn{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer;}
      </style>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:13px;color:#1e3a5f;line-height:1.55;">
        La <b>voce AI</b> risponde al telefono del locale in italiano e in inglese: prende le <b>prenotazioni</b> controllando i posti liberi,
        risponde su <b>orari, indirizzo e menu del giorno</b> (li legge dall'app) e, quando serve, <b>passa la chiamata</b> a una persona.
        Le prenotazioni arrivano in Prenotazioni con la nota "📞 Presa dalla voce AI".
      </div>

      ${(sedi || []).length > 1 ? `<div class="cai-card"><h4>Sede</h4>
        <select id="cai-sede" class="cai-in">${(sedi || []).map((s) => `<option value="${s.id}" ${s.id === sedeId ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}</select></div>` : ""}

      <div class="cai-card">
        <div class="cai-row" style="justify-content:space-between;">
          <div><h4>Voce AI attiva</h4><p class="h" style="margin:0;">Quando è spenta le chiamate non vengono gestite dalla voce.</p></div>
          <label style="display:flex;align-items:center;gap:8px;font-weight:600;"><input type="checkbox" id="cai-attivo" ${c.ai_attivo ? "checked" : ""} ${dis} style="width:22px;height:22px;"> ${c.ai_attivo ? "Attiva" : "Spenta"}</label>
        </div>
      </div>

      <div class="cai-card">
        <h4>Voce</h4>
        <p class="h">Scegli la voce e premi ▶ per ascoltarla. Le voci con 🇮🇹 sono italiane.</p>
        ${Array.isArray(v)
          ? `<div class="cai-row"><select id="cai-voce" class="cai-in" ${dis}><option value="">— Voce predefinita —</option>${opzVoci}</select>
             <button type="button" id="cai-ascolta" class="cai-btn" style="background:#f1f5f9;">▶</button></div>`
          : `<div style="color:#b45309;font-size:13px;">Elenco voci non disponibile: ${esc(v?.errore || "")}</div>`}
      </div>

      <div class="cai-card">
        <h4>Come risponde</h4>
        <p class="h">La prima frase che dice quando risponde.</p>
        <input id="cai-saluto" class="cai-in" maxlength="300" ${dis} placeholder="${esc(salutoDefault)}" value="${esc(c.saluto_ai || "")}">
      </div>

      <div class="cai-card">
        <h4>Cose da sapere</h4>
        <p class="h">Tutto quello che la voce deve sapere oltre a orari, indirizzo e menu del giorno (quelli li prende dall'app).
          Esempi: parcheggio, animali, chiusure per ferie, pizza solo la sera, menu bambini, eventi del mese.</p>
        <textarea id="cai-extra" class="cai-in" rows="6" maxlength="4000" ${dis} placeholder="Parcheggio gratuito davanti al locale. Cani di piccola taglia ammessi. Chiusi dal 7 al 21 gennaio.">${esc(c.info_extra || "")}</textarea>
      </div>

      <div class="cai-card">
        <h4>A chi passare la chiamata</h4>
        <p class="h">Per gruppi numerosi, eventi, reclami, domande a cui non sa rispondere o se il cliente chiede una persona.
          Senza numero, la voce prende nome e telefono e dice che verrà richiamato.</p>
        <div class="cai-row" style="flex-wrap:wrap;">
          <input id="cai-numero" class="cai-in" style="flex:1;min-width:180px;" inputmode="tel" ${dis} placeholder="+39 333 1234567" value="${esc(c.numero_trasferimento || "")}">
          <span style="font-size:13px;color:#475569;">gruppi oltre</span>
          <input id="cai-maxp" class="cai-in" style="width:80px;" type="number" min="2" max="100" ${dis} value="${esc(c.max_persone_ai || 12)}">
          <span style="font-size:13px;color:#475569;">persone</span>
        </div>
      </div>

      ${admin ? `<button type="button" id="cai-salva" class="cai-btn" style="background:#0E5A7A;color:#fff;width:100%;padding:13px;font-size:15px;">💾 Salva e aggiorna la voce</button>`
              : `<div style="font-size:13px;color:#64748b;">Solo l'admin del locale può modificare il centralino AI.</div>`}
      <div id="cai-esito" style="margin-top:10px;font-size:13px;"></div>

      ${c.agente_it ? `<div class="cai-card" style="margin-top:12px;">
        <h4>🎧 Prova la voce</h4>
        <p class="h">Parla col microfono come se fossi un cliente. Le prenotazioni di prova finiscono davvero in Prenotazioni: poi cancellale.
          ${c.ai_aggiornato_at ? "Ultimo aggiornamento: " + new Date(c.ai_aggiornato_at).toLocaleString("it-IT") : ""}</p>
        <div class="cai-row">
          <button type="button" class="cai-btn cai-prova" data-agente="${esc(c.agente_it)}" style="background:#f1f5f9;">🇮🇹 Prova in italiano</button>
          ${c.agente_en ? `<button type="button" class="cai-btn cai-prova" data-agente="${esc(c.agente_en)}" style="background:#f1f5f9;">🇬🇧 Prova in inglese</button>` : ""}
        </div>
        <div id="cai-widget" style="margin-top:10px;"></div>
      </div>` : ""}
    `;

    box.querySelector("#cai-sede")?.addEventListener("change", (e) => { sedeId = e.target.value; disegna(); });
    box.querySelector("#cai-attivo")?.addEventListener("change", (e) => { e.target.parentElement.lastChild.textContent = e.target.checked ? " Attiva" : " Spenta"; });

    box.querySelector("#cai-ascolta")?.addEventListener("click", () => {
      const opt = box.querySelector("#cai-voce")?.selectedOptions?.[0];
      const url = opt?.dataset?.anteprima;
      if (audio) { audio.pause(); audio = null; }
      if (!url) { alert("Per questa voce non c'è un'anteprima."); return; }
      audio = new Audio(url); audio.play().catch(() => {});
    });

    box.querySelectorAll(".cai-prova").forEach((b) => b.addEventListener("click", () => {
      const w = box.querySelector("#cai-widget");
      if (!document.querySelector('script[data-cai-widget]')) {
        const s = document.createElement("script");
        s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
        s.async = true; s.type = "text/javascript"; s.dataset.caiWidget = "1";
        document.body.appendChild(s);
      }
      w.innerHTML = `<elevenlabs-convai agent-id="${esc(b.dataset.agente)}"></elevenlabs-convai>
        <div style="font-size:12px;color:#64748b;margin-top:6px;">Il pulsante per parlare compare in basso a destra dello schermo.</div>`;
    }));

    box.querySelector("#cai-salva")?.addEventListener("click", async (ev) => {
      const btn = ev.currentTarget, esito = box.querySelector("#cai-esito");
      const voceSel = box.querySelector("#cai-voce");
      const payload = {
        azione: "salva", azienda_id: azienda.id, sede_id: sedeId,
        ai_attivo: box.querySelector("#cai-attivo").checked,
        voce_ai: voceSel ? voceSel.value || null : (c.voce_ai || null),
        voce_ai_nome: voceSel?.value ? voceSel.selectedOptions[0].textContent.replace(/^🇮🇹 /, "") : (voceSel ? null : c.voce_ai_nome || null),
        saluto_ai: box.querySelector("#cai-saluto").value,
        info_extra: box.querySelector("#cai-extra").value,
        numero_trasferimento: box.querySelector("#cai-numero").value,
        max_persone_ai: Number(box.querySelector("#cai-maxp").value) || 12,
      };
      btn.disabled = true; btn.textContent = "Aggiorno la voce…";
      esito.innerHTML = "";
      const { data, error } = await supa().functions.invoke("centralino-agenti", { body: payload });
      btn.disabled = false; btn.textContent = "💾 Salva e aggiorna la voce";
      if (error || !data?.ok) {
        esito.innerHTML = `<span style="color:#dc2626;">❌ ${esc(error ? await testoErrore(error) : data?.errore || "Errore")}</span>`;
        return;
      }
      await disegna();
      box.querySelector("#cai-esito").innerHTML = `<span style="color:#16a34a;">✅ Salvato: la voce è aggiornata. ${data.trasferimento === "attivo" ? "Passaggio chiamata attivo." : "Nessun numero per passare la chiamata: la voce farà richiamare."}</span>`;
    });
  }

  await disegna();
}

async function testoErrore(error) {
  try {
    const t = await error.context.text();
    const j = JSON.parse(t);
    return j.errore || t;
  } catch { return error?.message || String(error); }
}
