// js/views/centralino-ai.js
// Centralino AI del locale, in due servizi:
//  - 💬 Bot WhatsApp (incluso nel piano): risponde in chat, prenota, legge orari e menu, manda il link, prende l'asporto
//  - 📞 Voce al telefono (modulo a pagamento "centralino_voce"): stessa cosa al telefono, con voce scelta o del titolare
// Salvataggio, conteggio chiamate e voce del titolare passano dalla funzione centralino-agenti (solo admin del locale).
// Orari, indirizzo e menu del giorno bot e voce li leggono dall'app durante la conversazione.

const supa = () => window.supabaseClient || window.supabase;
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TESTO_VOCE = `Buongiorno e benvenuti! Qui si prenota un tavolo in un attimo: mi dica per quante persone e a che ora, e controllo subito se c'è posto.
Stasera in cucina abbiamo la pasta fatta in casa, il pesce fresco del giorno e i dolci della nostra pasticceria.
Il parcheggio è comodo, proprio davanti al locale, e la domenica siamo aperti anche a pranzo.
Se ha un'allergia o un'intolleranza me lo dica pure: lo segno e avviso la cucina.
Preferisce un tavolo all'aperto o dentro, vicino alla finestra? Per un compleanno possiamo preparare una torta, basta dirlo qualche giorno prima.
Le mando il menu su WhatsApp, così lo guarda con calma. Grazie per aver chiamato, a presto e buona serata!`;

export async function render(container) {
  container.innerHTML = `<section class="view" style="max-width:760px;margin:0 auto;padding:12px 12px 90px;">
    <h2 style="margin:4px 0 12px;">📞 Centralino AI</h2><div id="cai-box"></div></section>`;
  await renderCentralinoAI(container.querySelector("#cai-box"));
}

export async function renderCentralinoAI(box) {
  const azienda = window.state?.azienda;
  if (!azienda) { box.innerHTML = "<p>Nessuna azienda attiva</p>"; return; }
  const superadmin = !!window.state?.isSuperadmin || window.state?.ruolo === "superadmin";
  const admin = ["admin", "superadmin"].includes(window.state?.ruolo) || superadmin;
  const moduloVoce = typeof window.hasFeature === "function" ? window.hasFeature("centralino_voce") : !!window.state?.featuresEffettive?.centralino_voce;
  box.innerHTML = `<div style="color:#94a3b8;padding:12px;">Caricamento centralino…</div>`;

  const { data: sedi } = await supa().from("sedi").select("id,nome").eq("azienda_id", azienda.id).order("nome");
  let sedeId = window.state?.sedeAttiva?.id || sedi?.[0]?.id || null;
  let voci = null, vociSede = null, audio = null;

  async function caricaVoci() {
    if (voci && vociSede === sedeId) return voci;
    const { data, error } = await supa().functions.invoke("centralino-agenti", { body: { azione: "voci", azienda_id: azienda.id, sede_id: sedeId } });
    voci = error ? { errore: await testoErrore(error) } : (data?.voci || []);
    vociSede = sedeId;
    return voci;
  }

  async function disegna() {
    const [{ data: cfgs }, { data: menus }] = await Promise.all([
      supa().from("centralino_config").select("*").eq("azienda_id", azienda.id).eq("sede_id", sedeId).limit(1),
      supa().from("menu").select("id,nome,slug,ordinabile,ritiro_attivo").eq("azienda_id", azienda.id).eq("sede_id", sedeId).eq("attivo", true).order("nome"),
    ]);
    const c = cfgs?.[0] || {};
    const menuSel = (menus || []).find((m) => m.id === c.menu_id_voce) || null;
    const v = moduloVoce ? await caricaVoci() : [];
    const sedeNome = (sedi || []).find((s) => s.id === sedeId)?.nome || "";
    const salutoDefault = `Buongiorno, ${sedeNome}! Sono l'assistente per le prenotazioni. Come posso aiutarla?`;
    const dis = admin ? "" : "disabled";
    const genere = (g) => g === "female" ? "donna" : g === "male" ? "uomo" : g;

    const opzVoci = Array.isArray(v)
      ? v.map((x) => `<option value="${esc(x.voice_id)}" data-anteprima="${esc(x.anteprima || "")}" ${x.voice_id === c.voce_ai ? "selected" : ""}>${x.propria ? "🎙️ La tua voce" : (x.italiana ? "🇮🇹 " : "") + esc(x.nome) + (x.genere ? " · " + esc(genere(x.genere)) : "") + (x.accento ? " · " + esc(x.accento) : "")}</option>`).join("")
      : "";
    const interruttore = (id, on, si, no) => `<label style="display:flex;align-items:center;gap:8px;font-weight:600;margin-left:10px;white-space:nowrap;">
      <input type="checkbox" id="${id}" data-si="${si}" data-no="${no}" ${on ? "checked" : ""} ${dis} style="width:22px;height:22px;"> <span>${on ? si : no}</span></label>`;

    box.innerHTML = `
      <style>
        .cai-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin-bottom:12px;}
        .cai-card h4{margin:0 0 4px;font-size:15px;color:#0f172a;}
        .cai-card p.h{margin:0 0 10px;font-size:12.5px;color:#64748b;line-height:1.45;}
        .cai-in{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;}
        .cai-row{display:flex;gap:8px;align-items:center;}
        .cai-btn{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer;}
        .cai-sez{font-size:13px;font-weight:700;color:#0E5A7A;text-transform:uppercase;letter-spacing:.04em;margin:18px 2px 8px;}
        .cai-num{font-size:22px;font-weight:700;color:#0f172a;} .cai-lab{font-size:12px;color:#64748b;}
      </style>

      ${(sedi || []).length > 1 ? `<div class="cai-card"><h4>Sede</h4>
        <select id="cai-sede" class="cai-in">${(sedi || []).map((s) => `<option value="${s.id}" ${s.id === sedeId ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}</select></div>` : ""}

      <div class="cai-sez">💬 Bot WhatsApp · incluso</div>
      <div class="cai-card">
        <div class="cai-row" style="justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;"><h4>Risponde l'AI su WhatsApp</h4>
            <p class="h" style="margin:0;">Chi scrive al WhatsApp del locale riceve risposta subito: prenota controllando i posti, dice orari, indirizzo e piatto del giorno,
            legge il menu con i prezzi, manda il link del menu e, se attivo, prende l'ordine da asporto. Se serve una persona avvisa lo staff.</p></div>
          ${interruttore("cai-bot", !!c.bot_wa_ai, "Attivo", "Spento")}
        </div>
      </div>

      <div class="cai-sez">Cosa sa dire (vale per chat e telefono)</div>
      ${admin ? `<div class="cai-card" id="cai-domande" style="display:none;border-color:#fdba74;background:#fffbf5;"></div>` : ""}
      <div class="cai-card">
        <h4>Cose da sapere</h4>
        <p class="h">Tutto quello che deve sapere oltre a orari, indirizzo e menu del giorno (quelli li prende dall'app).
          Esempi: parcheggio, animali, chiusure per ferie, pizza solo la sera, menu bambini, eventi del mese.</p>
        <textarea id="cai-extra" class="cai-in" rows="5" maxlength="4000" ${dis} placeholder="Parcheggio gratuito davanti al locale. Cani di piccola taglia ammessi. Chiusi dal 7 al 21 gennaio.">${esc(c.info_extra || "")}</textarea>
      </div>
      <div class="cai-card">
        <h4>Menu</h4>
        <p class="h">Il menu che legge (portate e prezzi) e che manda a chi vuole vederlo. Se non scegli, usa il menu attivo della sede.</p>
        <select id="cai-menu" class="cai-in" ${dis}>
          <option value="">— Automatico —</option>
          ${(menus || []).map((m) => `<option value="${m.id}" ${m.id === c.menu_id_voce ? "selected" : ""}>${esc(m.nome)}${m.ordinabile && m.ritiro_attivo ? " · ordinabile da asporto" : ""}</option>`).join("")}
        </select>
        ${(menus || []).length ? "" : `<div style="font-size:12.5px;color:#b45309;margin-top:6px;">Questa sede non ha menu attivi: non potrà leggere il menu né mandare il link.</div>`}
      </div>
      <div class="cai-card">
        <div class="cai-row" style="justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;"><h4>Ordini da asporto</h4>
            <p class="h" style="margin:0;">Prende l'ordine, dice il totale, chiede orario di ritiro e nome; il cliente conferma su WhatsApp e paga al ritiro. Ottimo per pizzerie.
            Serve un menu ordinabile con il ritiro attivo.</p></div>
          ${interruttore("cai-asporto", !!c.asporto_attivo, "Sì", "No")}
        </div>
        ${c.asporto_attivo && menuSel && !(menuSel.ordinabile && menuSel.ritiro_attivo) ? `<div style="font-size:12.5px;color:#b45309;margin-top:8px;">Il menu scelto non è ordinabile da asporto: attiva "ordinabile" e "ritiro" nel menu, oppure scegline un altro.</div>` : ""}
      </div>
      <div class="cai-card">
        <h4>Quando passa a una persona</h4>
        <p class="h">Per gruppi numerosi, eventi, reclami, domande a cui non sa rispondere o se il cliente lo chiede.
          In chat avvisa lo staff; al telefono passa la chiamata al numero indicato nella sezione voce (senza numero fa richiamare).</p>
        <div class="cai-row" style="flex-wrap:wrap;">
          <span style="font-size:13px;color:#475569;">gruppi oltre</span>
          <input id="cai-maxp" class="cai-in" style="width:80px;" type="number" min="2" max="100" ${dis} value="${esc(c.max_persone_ai || 12)}">
          <span style="font-size:13px;color:#475569;">persone</span>
        </div>
      </div>

      <div class="cai-sez">📞 Voce al telefono ${moduloVoce ? "" : "· servizio a parte"}</div>
      ${moduloVoce ? `
      <div class="cai-card">
        <div class="cai-row" style="justify-content:space-between;">
          <div><h4>Voce AI attiva</h4><p class="h" style="margin:0;">Quando è spenta le telefonate non vengono gestite dalla voce.</p></div>
          ${interruttore("cai-attivo", !!c.ai_attivo, "Attiva", "Spenta")}
        </div>
      </div>
      <div class="cai-card">
        <h4>Voce</h4>
        <p class="h">Scegli la voce e premi ▶ per ascoltarla, oppure usa la tua.</p>
        ${Array.isArray(v)
          ? `<div class="cai-row"><select id="cai-voce" class="cai-in" ${dis}><option value="">— Voce predefinita —</option>${opzVoci}</select>
             <button type="button" id="cai-ascolta" class="cai-btn" style="background:#f1f5f9;">▶</button></div>`
          : `<div style="color:#b45309;font-size:13px;">Elenco voci non disponibile: ${esc(v?.errore || "")}</div>`}
        ${admin ? `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="cai-mia" class="cai-btn" style="background:#fff7ed;color:#9a3412;border:1px solid #fdba74;">🎙️ ${c.voce_clonata_id ? "Registra di nuovo la tua voce" : "Usa la mia voce"}</button>
          ${c.voce_clonata_id ? `<button type="button" id="cai-mia-elimina" class="cai-btn" style="background:#fff;color:#b91c1c;border:1px solid #fecaca;">Elimina la mia voce</button>` : ""}
        </div><div id="cai-registra"></div>` : ""}
      </div>
      <div class="cai-card">
        <h4>Come risponde</h4>
        <p class="h">La prima frase che dice quando risponde al telefono.</p>
        <input id="cai-saluto" class="cai-in" maxlength="300" ${dis} placeholder="${esc(salutoDefault)}" value="${esc(c.saluto_ai || "")}">
      </div>
      <div class="cai-card">
        <h4>Numero a cui passare la chiamata</h4>
        <input id="cai-numero" class="cai-in" inputmode="tel" ${dis} placeholder="+39 333 1234567" value="${esc(c.numero_trasferimento || "")}">
      </div>
      <div class="cai-card" id="cai-chiamate"><h4>📊 Chiamate di questo mese</h4><p class="h">Caricamento…</p></div>
      ` : `
      <div class="cai-card" style="background:#f8fafc;">
        <h4>La voce che risponde al telefono</h4>
        <p class="h" style="margin:0;">Una voce naturale, in italiano e inglese, risponde al telefono del locale: prenota, legge il menu, prende l'asporto e passa la chiamata quando serve.
          Si può usare anche la voce del titolare. È un servizio a parte: chiedilo a Ristoflow per attivarlo.</p>
      </div>`}

      ${admin ? `<button type="button" id="cai-salva" class="cai-btn" style="background:#0E5A7A;color:#fff;width:100%;padding:13px;font-size:15px;margin-top:6px;">💾 Salva</button>`
              : `<div style="font-size:13px;color:#64748b;">Solo l'admin del locale può modificare il centralino.</div>`}
      <div id="cai-esito" style="margin-top:10px;font-size:13px;"></div>

      ${moduloVoce && c.agente_it ? `<div class="cai-card" style="margin-top:12px;">
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
    box.querySelectorAll("input[type=checkbox][data-si]").forEach((x) => x.addEventListener("change", () => {
      x.nextElementSibling.textContent = x.checked ? x.dataset.si : x.dataset.no;
    }));

    box.querySelector("#cai-ascolta")?.addEventListener("click", () => {
      const opt = box.querySelector("#cai-voce")?.selectedOptions?.[0];
      const url = opt?.dataset?.anteprima;
      if (audio) { audio.pause(); audio = null; }
      if (!url) { alert("Per questa voce non c'è un'anteprima."); return; }
      audio = new Audio(url); audio.play().catch(() => {});
    });

    box.querySelectorAll(".cai-prova").forEach((b) => b.addEventListener("click", () => {
      const w = box.querySelector("#cai-widget");
      if (!document.querySelector("script[data-cai-widget]")) {
        const s = document.createElement("script");
        s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
        s.async = true; s.type = "text/javascript"; s.dataset.caiWidget = "1";
        document.body.appendChild(s);
      }
      w.innerHTML = `<elevenlabs-convai agent-id="${esc(b.dataset.agente)}"></elevenlabs-convai>
        <div style="font-size:12px;color:#64748b;margin-top:6px;">Il pulsante per parlare compare in basso a destra dello schermo.</div>`;
    }));

    box.querySelector("#cai-mia")?.addEventListener("click", () => apriRegistrazione(box.querySelector("#cai-registra")));
    box.querySelector("#cai-mia-elimina")?.addEventListener("click", async (ev) => {
      if (!confirm("Elimino la tua voce? Il centralino torna alla voce predefinita.")) return;
      const btn = ev.currentTarget; btn.disabled = true;
      const { data, error } = await supa().functions.invoke("centralino-agenti", { body: { azione: "elimina_voce", azienda_id: azienda.id, sede_id: sedeId } });
      if (error || !data?.ok) { alert("❌ " + (error ? await testoErrore(error) : data?.errore || "Errore")); btn.disabled = false; return; }
      voci = null; await disegna();
    });

    if (moduloVoce) caricaChiamate();
    if (admin) caricaDomande();

    box.querySelector("#cai-salva")?.addEventListener("click", async (ev) => {
      const btn = ev.currentTarget, esito = box.querySelector("#cai-esito");
      const voceSel = box.querySelector("#cai-voce");
      const payload = {
        azione: "salva", azienda_id: azienda.id, sede_id: sedeId,
        bot_wa_ai: !!box.querySelector("#cai-bot")?.checked,
        info_extra: box.querySelector("#cai-extra").value,
        max_persone_ai: Number(box.querySelector("#cai-maxp").value) || 12,
        menu_id_voce: box.querySelector("#cai-menu")?.value || null,
        asporto_attivo: !!box.querySelector("#cai-asporto")?.checked,
      };
      if (moduloVoce) Object.assign(payload, {
        ai_attivo: !!box.querySelector("#cai-attivo")?.checked,
        voce_ai: voceSel ? voceSel.value || null : (c.voce_ai || null),
        voce_ai_nome: voceSel?.value ? voceSel.selectedOptions[0].textContent.replace(/^🇮🇹 /, "") : (voceSel ? null : c.voce_ai_nome || null),
        saluto_ai: box.querySelector("#cai-saluto")?.value || "",
        numero_trasferimento: box.querySelector("#cai-numero")?.value || "",
      });
      btn.disabled = true; btn.textContent = "Salvo…";
      esito.innerHTML = "";
      const { data, error } = await supa().functions.invoke("centralino-agenti", { body: payload });
      btn.disabled = false; btn.textContent = "💾 Salva";
      if (error || !data?.ok) {
        esito.innerHTML = `<span style="color:#dc2626;">❌ ${esc(error ? await testoErrore(error) : data?.errore || "Errore")}</span>`;
        return;
      }
      await disegna();
      const parti = [payload.bot_wa_ai ? "bot WhatsApp attivo" : "bot WhatsApp spento"];
      if (data.modulo_voce) parti.push(data.trasferimento === "attivo" ? "voce aggiornata, passaggio chiamata attivo" : "voce aggiornata (senza numero fa richiamare)");
      box.querySelector("#cai-esito").innerHTML = `<span style="color:#16a34a;">✅ Salvato: ${esc(parti.join(" · "))}.</span>`;
    });
  }

  /* domande dei clienti a cui il centralino non sapeva rispondere: la risposta entra nelle cose da sapere */
  async function caricaDomande(lista) {
    const el = box.querySelector("#cai-domande");
    if (!el) return;
    if (!lista) {
      const { data, error } = await supa().functions.invoke("centralino-agenti", { body: { azione: "stato", azienda_id: azienda.id, sede_id: sedeId } });
      if (error || !box.contains(el)) return;
      lista = data?.domande_aperte || [];
    }
    if (!lista.length) { el.style.display = "none"; return; }
    el.style.display = "";
    const quando = (d) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    el.innerHTML = `<h4>❓ Domande dei clienti senza risposta (${lista.length})</h4>
      <p class="h">Il centralino non sapeva rispondere. Scrivi la risposta come la diresti al cliente: da quel momento la sa, in chat e al telefono.</p>
      ${lista.map((d) => `<div class="cai-dom" data-id="${esc(d.id)}" style="border-top:1px solid #fde7c7;padding:10px 0;">
        <div style="font-weight:600;font-size:14px;color:#0f172a;">«${esc(d.domanda)}»</div>
        <div style="font-size:12px;color:#94a3b8;margin:2px 0 6px;">${d.canale === "whatsapp" ? "💬 WhatsApp" : "📞 Telefono"} · ${quando(d.created_at)}</div>
        <input class="cai-in cai-dom-r" maxlength="400" placeholder="Es. Sì, i cani di piccola taglia sono i benvenuti">
        <div class="cai-row" style="margin-top:6px;">
          <button type="button" class="cai-btn cai-dom-ok" style="background:#0E5A7A;color:#fff;">Salva risposta</button>
          <button type="button" class="cai-btn cai-dom-no" style="background:#f1f5f9;color:#475569;">Non serve</button>
        </div></div>`).join("")}`;
    el.querySelectorAll(".cai-dom").forEach((r) => {
      const invia = async (ignora) => {
        const risposta = r.querySelector(".cai-dom-r").value.trim();
        if (!ignora && !risposta) { r.querySelector(".cai-dom-r").focus(); return; }
        r.querySelectorAll("button").forEach((b) => (b.disabled = true));
        const { data, error } = await supa().functions.invoke("centralino-agenti", {
          body: { azione: "rispondi_domande", azienda_id: azienda.id, sede_id: sedeId, risposte: [{ id: r.dataset.id, risposta, ignora }] },
        });
        if (error || !data?.ok) { alert("❌ " + (error ? await testoErrore(error) : data?.errore || "Errore")); r.querySelectorAll("button").forEach((b) => (b.disabled = false)); return; }
        if (!ignora) {
          const ta = box.querySelector("#cai-extra");
          const { data: cf } = await supa().from("centralino_config").select("info_extra").eq("azienda_id", azienda.id).eq("sede_id", sedeId).limit(1);
          if (ta && cf?.[0]) ta.value = cf[0].info_extra || "";
        }
        caricaDomande(data.domande_aperte || []);
      };
      r.querySelector(".cai-dom-ok").addEventListener("click", () => invia(false));
      r.querySelector(".cai-dom-no").addEventListener("click", () => invia(true));
    });
  }

  async function caricaChiamate() {
    const el = box.querySelector("#cai-chiamate");
    if (!el) return;
    const { data, error } = await supa().functions.invoke("centralino-agenti", { body: { azione: "chiamate", azienda_id: azienda.id } });
    if (!box.contains(el)) return;
    if (error || !data?.ok) { el.querySelector("p").textContent = "Conteggio non disponibile: " + (error ? await testoErrore(error) : data?.errore || ""); return; }
    const m = data.mese || {}, p = data.pacchetto || {};
    el.innerHTML = `<h4>📊 Chiamate di questo mese</h4>
      <div class="cai-row" style="gap:18px;flex-wrap:wrap;margin:6px 0 8px;">
        <div><div class="cai-num">${m.chiamate || 0}</div><div class="cai-lab">chiamate</div></div>
        <div><div class="cai-num">${String(m.minuti || 0).replace(".", ",")}</div><div class="cai-lab">minuti${p.minuti_inclusi ? " su " + p.minuti_inclusi + " inclusi" : ""}</div></div>
        <div><div class="cai-num">${String(m.media_min || 0).replace(".", ",")}</div><div class="cai-lab">min a chiamata</div></div>
        ${m.costo_usd != null ? `<div><div class="cai-num">$ ${String(m.costo_usd).replace(".", ",")}</div><div class="cai-lab">costo vivo stimato (solo piattaforma)</div></div>` : ""}
      </div>
      <p class="h" style="margin:0;">Contano anche le prove fatte da qui. Tutte le sedi dell'azienda.</p>`;
  }

  /* ---------- registrazione della voce del titolare ---------- */
  function apriRegistrazione(pan) {
    if (!pan) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      pan.innerHTML = `<p class="h" style="color:#b91c1c;margin-top:10px;">Questo browser non registra l'audio: apri la pagina da Chrome o Safari aggiornati.</p>`; return;
    }
    let rec = null, pezzi = [], blob = null, mime = "", t0 = 0, timer = null;
    const nomeDip = window.state?.dipendente ? ((window.state.dipendente.nome || "") + " " + (window.state.dipendente.cognome || "")).trim() : "";
    pan.innerHTML = `
      <div style="margin-top:12px;border:1px dashed #fdba74;border-radius:12px;padding:12px;background:#fffbf5;">
        <p class="h" style="margin:0 0 8px;">In un posto silenzioso, col telefono a una spanna dalla bocca, leggi con calma e con il tono che useresti con un cliente.
          Serve almeno 1 minuto: se finisci prima, rileggi da capo.</p>
        <div style="white-space:pre-line;font-size:15px;line-height:1.6;background:#fff;border-radius:10px;padding:12px;border:1px solid #fde4c8;">${esc(TESTO_VOCE)}</div>
        <div class="cai-row" style="margin-top:10px;flex-wrap:wrap;">
          <button type="button" id="rv-start" class="cai-btn" style="background:#dc2626;color:#fff;">⏺ Registra</button>
          <button type="button" id="rv-stop" class="cai-btn" style="background:#334155;color:#fff;display:none;">⏹ Stop</button>
          <span id="rv-tempo" style="font-weight:700;font-variant-numeric:tabular-nums;">0:00</span>
        </div>
        <audio id="rv-ascolta" controls style="width:100%;margin-top:8px;display:none;"></audio>
        <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13px;color:#334155;">
          <input type="checkbox" id="rv-ok" style="width:20px;height:20px;margin-top:1px;">
          <span id="rv-consenso">La voce registrata è la mia e autorizzo Ristoflow a usarla per il centralino di questo locale. Posso eliminarla quando voglio.</span></label>
        <input id="rv-nome" class="cai-in" style="margin-top:8px;" placeholder="Nome e cognome di chi registra" value="${esc(nomeDip)}">
        <button type="button" id="rv-invia" class="cai-btn" style="background:#0E5A7A;color:#fff;width:100%;margin-top:10px;" disabled>Crea la mia voce</button>
        <div id="rv-esito" style="margin-top:8px;font-size:13px;"></div>
      </div>`;
    const $ = (s) => pan.querySelector(s);
    const aggiornaInvia = () => { $("#rv-invia").disabled = !(blob && $("#rv-ok").checked && $("#rv-nome").value.trim().length > 3); };
    $("#rv-ok").addEventListener("change", aggiornaInvia);
    $("#rv-nome").addEventListener("input", aggiornaInvia);

    $("#rv-start").addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        pezzi = []; blob = null; aggiornaInvia();
        rec.ondataavailable = (e) => { if (e.data?.size) pezzi.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          clearInterval(timer);
          blob = new Blob(pezzi, { type: rec.mimeType || mime || "audio/webm" });
          const a = $("#rv-ascolta"); a.src = URL.createObjectURL(blob); a.style.display = "block";
          const sec = Math.round((Date.now() - t0) / 1000);
          $("#rv-esito").innerHTML = sec < 60 ? `<span style="color:#b45309;">Registrazione di ${sec} secondi: ne serve almeno un minuto. Registra di nuovo rileggendo il testo.</span>` : "";
          if (sec < 60) blob = null;
          $("#rv-start").style.display = ""; $("#rv-start").textContent = "⏺ Registra di nuovo"; $("#rv-stop").style.display = "none";
          aggiornaInvia();
        };
        rec.start(1000); t0 = Date.now();
        timer = setInterval(() => {
          const s = Math.round((Date.now() - t0) / 1000);
          $("#rv-tempo").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
          if (s >= 180 && rec?.state === "recording") rec.stop();
        }, 500);
        $("#rv-start").style.display = "none"; $("#rv-stop").style.display = "";
      } catch (e) { $("#rv-esito").innerHTML = `<span style="color:#b91c1c;">Microfono non disponibile: ${esc(e.message)}</span>`; }
    });
    $("#rv-stop").addEventListener("click", () => { if (rec?.state === "recording") rec.stop(); });

    $("#rv-invia").addEventListener("click", async () => {
      if (!blob) return;
      const btn = $("#rv-invia"); btn.disabled = true; btn.textContent = "Creo la tua voce… (un minuto)";
      const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(blob); });
      const { data, error } = await supa().functions.invoke("centralino-agenti", { body: {
        azione: "clona", azienda_id: azienda.id, sede_id: sedeId, audio_base64: b64, mime: blob.type,
        consenso: true, testo_consenso: $("#rv-consenso").textContent, nome: $("#rv-nome").value.trim(),
      } });
      if (error || !data?.ok) {
        btn.disabled = false; btn.textContent = "Crea la mia voce";
        $("#rv-esito").innerHTML = `<span style="color:#b91c1c;">❌ ${esc(error ? await testoErrore(error) : data?.errore || "Errore")}</span>`;
        return;
      }
      voci = null;
      await disegna();
      box.querySelector("#cai-esito").innerHTML = `<span style="color:#16a34a;">✅ La tua voce è pronta ed è già quella del centralino: provala con «Prova in italiano».</span>`;
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
