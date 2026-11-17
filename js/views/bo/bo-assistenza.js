// js/views/bo/bo-assistenza.js
// Piattaforma → Assistenza clienti: tutte le chat dei locali in tempo reale.
// Elenco a sinistra (urgenti in cima), conversazione a destra; su telefono una schermata alla volta.
import { sb, esc, testoHtml, ora, nomeUtente, statoAssistenza, GIORNI, bip } from "../../utils/assistenza.js";

let canale = null;

export async function render(container) {
  if (canale) { try { sb().removeChannel(canale); } catch (_) {} canale = null; }

  container.innerHTML = `
  <style>
    .ba{max-width:1200px;margin:0 auto;padding:14px 12px 40px;}
    .ba-top{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px;}
    .ba-top h1{font-size:22px;margin:0;color:#023C59;}
    .ba-btn{border:1px solid #CBD5E1;background:#fff;border-radius:10px;padding:8px 12px;font-weight:700;font-size:13px;cursor:pointer;color:#023C59;}
    .ba-btn.pri{background:#E66101;border-color:#E66101;color:#fff;}
    .ba-grid{display:grid;grid-template-columns:340px 1fr;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;height:calc(100dvh - 190px);min-height:460px;background:#fff;}
    .ba-list{border-right:1px solid #E2E8F0;overflow-y:auto;}
    .ba-tabs{display:flex;border-bottom:1px solid #E2E8F0;position:sticky;top:0;background:#fff;z-index:1;}
    .ba-tabs button{flex:1;border:none;background:none;padding:11px;font-weight:700;color:#64748B;cursor:pointer;}
    .ba-tabs button.on{color:#023C59;box-shadow:inset 0 -3px 0 #E66101;}
    .ba-it{padding:11px 13px;border-bottom:1px solid #F1F5F9;cursor:pointer;display:flex;gap:10px;}
    .ba-it:hover,.ba-it.sel{background:#F1F7FA;}
    .ba-it .t{font-weight:700;color:#0f172a;font-size:14px;display:flex;justify-content:space-between;gap:6px;}
    .ba-it .p{font-size:13px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
    .ba-n{background:#E66101;color:#fff;border-radius:9px;font-size:11px;font-weight:800;padding:1px 7px;}
    .ba-urg{background:#FEF2F2;}
    .ba-chat{display:flex;flex-direction:column;min-width:0;}
    .ba-ch{padding:11px 14px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .ba-msgs{flex:1;overflow-y:auto;background:#F4F7F9;padding:14px;display:flex;flex-direction:column;gap:8px;}
    .ba-b{max-width:78%;padding:9px 12px;border-radius:14px;font-size:14.5px;line-height:1.4;}
    .ba-b small{display:block;font-size:11px;opacity:.65;margin-top:4px;}
    .ba-cli{align-self:flex-start;background:#fff;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.05);}
    .ba-op{align-self:flex-end;background:#023C59;color:#fff;border-bottom-right-radius:4px;}
    .ba-comp{border-top:1px solid #E2E8F0;padding:10px;display:flex;gap:8px;align-items:flex-end;}
    .ba-comp textarea{flex:1;resize:none;border:1px solid #CBD5E1;border-radius:12px;padding:10px 12px;font:inherit;font-size:15px;max-height:160px;}
    .ba-vuoto{margin:auto;color:#94A3B8;text-align:center;padding:30px;}
    .ba-set{border:1px solid #E2E8F0;border-radius:16px;padding:14px;margin-bottom:12px;background:#fff;display:none;}
    .ba-set h3{margin:0 0 10px;font-size:15px;color:#023C59;}
    .ba-set .r{display:flex;gap:8px;align-items:center;margin:5px 0;font-size:14px;flex-wrap:wrap;}
    .ba-set input[type=time]{border:1px solid #CBD5E1;border-radius:8px;padding:4px 6px;}
    .ba-back{display:none;}
    @media (max-width:760px){
      .ba-grid{grid-template-columns:1fr;}
      .ba-grid.aperta .ba-list{display:none;}
      .ba-grid:not(.aperta) .ba-chat{display:none;}
      .ba-back{display:inline-block;}
    }
  </style>
  <div class="ba">
    <div class="ba-top">
      <div><h1>💬 Assistenza clienti</h1><div id="ba-stato" style="font-size:13px;color:#64748B;margin-top:2px;"></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="ba-btn" id="ba-notif">🔔 Avvisi sul browser</button>
        <button class="ba-btn" id="ba-imp">⚙️ Orari e operatori</button>
      </div>
    </div>
    <div class="ba-set" id="ba-set"></div>
    <div class="ba-grid" id="ba-grid">
      <div class="ba-list">
        <div class="ba-tabs"><button data-f="aperta" class="on">Aperte</button><button data-f="chiusa">Chiuse</button></div>
        <div id="ba-elenco"></div>
      </div>
      <div class="ba-chat" id="ba-chat"><div class="ba-vuoto">Scegli una conversazione</div></div>
    </div>
  </div>`;

  const $ = (s) => container.querySelector(s);
  let filtro = "aperta", convs = [], corrente = null, cfg = null;
  const visti = new Set();

  // ── impostazioni ──
  async function caricaCfg() {
    const { data } = await sb().from("assistenza_config").select("*").eq("id", 1).maybeSingle();
    cfg = data;
    const st = statoAssistenza(cfg);
    $("#ba-stato").textContent = st.testo + (cfg?.reperibilita_attiva ? "" : " · reperibilità spenta");
  }

  async function disegnaSet() {
    const box = $("#ba-set");
    const { data: ops } = await sb().from("assistenza_operatori").select("*").order("nome");
    const o = cfg?.orari || {};
    const ordine = [1, 2, 3, 4, 5, 6, 0];
    box.innerHTML = `
      <h3>Orari dell'assistenza ordinaria (ora italiana)</h3>
      ${ordine.map(g => `<div class="r"><span style="width:90px;">${GIORNI[g]}</span>
        <input type="time" data-g="${g}" data-k="0" value="${o[g]?.[0] || ""}"> –
        <input type="time" data-g="${g}" data-k="1" value="${o[g]?.[1] || ""}">
        <span style="color:#94A3B8;font-size:12px;">vuoto = chiuso</span></div>`).join("")}
      <div class="r" style="margin-top:10px;"><label><input type="checkbox" id="ba-rep" ${cfg?.reperibilita_attiva ? "checked" : ""}> Reperibilità fuori orario per le urgenze</label></div>
      <div class="r"><span>Messaggio fuori orario</span></div>
      <textarea id="ba-msgfo" rows="2" style="width:100%;border:1px solid #CBD5E1;border-radius:10px;padding:8px;font:inherit;">${esc(cfg?.messaggio_fuori_orario || "")}</textarea>
      <div class="r"><button class="ba-btn pri" id="ba-salva">Salva orari</button><span id="ba-salvato" style="color:#16a34a;font-size:13px;"></span></div>
      <h3 style="margin-top:18px;">Operatori</h3>
      <div style="font-size:13px;color:#64748B;margin-bottom:6px;">Tu rispondi sempre come superadmin. Qui aggiungi le persone della rete di assistenza (devono avere già un account Ristoflow).</div>
      ${(ops || []).map(p => `<div class="r"><span style="flex:1;">${esc(p.nome)}</span>
        <label style="font-size:13px;"><input type="checkbox" data-op="${p.user_id}" ${p.attivo ? "checked" : ""}> attivo</label></div>`).join("") || '<div class="r" style="color:#94A3B8;">Nessun operatore aggiunto</div>'}
      <div class="r"><input id="ba-op-email" placeholder="email" style="border:1px solid #CBD5E1;border-radius:8px;padding:7px;flex:1;min-width:160px;">
        <input id="ba-op-nome" placeholder="nome da mostrare ai clienti" style="border:1px solid #CBD5E1;border-radius:8px;padding:7px;flex:1;min-width:160px;">
        <button class="ba-btn" id="ba-op-add">Aggiungi</button></div>`;
    box.querySelector("#ba-salva").onclick = async () => {
      const orari = {};
      box.querySelectorAll("input[type=time]").forEach(i => {
        const g = i.dataset.g; orari[g] = orari[g] || ["", ""]; orari[g][+i.dataset.k] = i.value;
      });
      Object.keys(orari).forEach(g => { if (!orari[g][0] || !orari[g][1]) delete orari[g]; });
      const { error } = await sb().from("assistenza_config").update({
        orari, reperibilita_attiva: box.querySelector("#ba-rep").checked,
        messaggio_fuori_orario: box.querySelector("#ba-msgfo").value.trim(), updated_at: new Date().toISOString(),
      }).eq("id", 1);
      box.querySelector("#ba-salvato").textContent = error ? "Errore: " + error.message : "Salvato ✓";
      await caricaCfg();
    };
    box.querySelectorAll("[data-op]").forEach(c => c.onchange = () =>
      sb().from("assistenza_operatori").update({ attivo: c.checked }).eq("user_id", c.dataset.op));
    box.querySelector("#ba-op-add").onclick = async () => {
      const { data, error } = await sb().rpc("assistenza_aggiungi_operatore", {
        p_email: box.querySelector("#ba-op-email").value, p_nome: box.querySelector("#ba-op-nome").value });
      if (error || !data?.ok) return alert(error?.message || data?.errore);
      disegnaSet();
    };
  }

  $("#ba-imp").onclick = async () => {
    const box = $("#ba-set");
    const apri = box.style.display !== "block";
    box.style.display = apri ? "block" : "none";
    if (apri) await disegnaSet();
  };
  $("#ba-notif").onclick = async () => {
    if (!("Notification" in window)) return alert("Questo browser non supporta gli avvisi.");
    const p = await Notification.requestPermission();
    $("#ba-notif").textContent = p === "granted" ? "🔔 Avvisi attivi" : "🔕 Avvisi bloccati";
  };
  if ("Notification" in window && Notification.permission === "granted") $("#ba-notif").textContent = "🔔 Avvisi attivi";

  // ── elenco ──
  container.querySelectorAll(".ba-tabs button").forEach(b => b.onclick = () => {
    filtro = b.dataset.f;
    container.querySelectorAll(".ba-tabs button").forEach(x => x.classList.toggle("on", x === b));
    caricaElenco();
  });

  async function caricaElenco() {
    const { data, error } = await sb().from("assistenza_conversazioni").select("*")
      .eq("stato", filtro).order("urgente", { ascending: false }).order("ultimo_messaggio_at", { ascending: false }).limit(200);
    if (error) { $("#ba-elenco").innerHTML = `<div class="ba-vuoto">Errore: ${esc(error.message)}</div>`; return; }
    convs = data || [];
    $("#ba-elenco").innerHTML = convs.map(c => `
      <div class="ba-it ${c.urgente ? "ba-urg" : ""} ${corrente?.id === c.id ? "sel" : ""}" data-id="${c.id}">
        <div style="flex:1;min-width:0;">
          <div class="t"><span>${c.urgente ? "🚨 " : ""}${esc(c.azienda_nome || "Locale")}</span>
            <span style="font-weight:500;font-size:12px;color:#94A3B8;">${ora(c.ultimo_messaggio_at)}</span></div>
          <div class="p">${c.ultimo_autore_tipo === "operatore" ? "Tu: " : ""}${esc(c.ultimo_messaggio_testo || "")}</div>
          <div style="font-size:11.5px;color:#94A3B8;margin-top:2px;">${esc(c.aperta_da_nome || "")}${c.operatore_nome ? " · segue " + esc(c.operatore_nome) : ""}</div>
        </div>
        ${c.non_letti_operatore ? `<span class="ba-n" style="align-self:center;">${c.non_letti_operatore}</span>` : ""}
      </div>`).join("") || `<div class="ba-vuoto">${filtro === "aperta" ? "Nessuna richiesta aperta 👌" : "Nessuna conversazione chiusa"}</div>`;
    $("#ba-elenco").querySelectorAll(".ba-it").forEach(el => el.onclick = () => apri(el.dataset.id));
  }

  // ── conversazione ──
  async function apri(id) {
    corrente = convs.find(c => c.id === id) || (await sb().from("assistenza_conversazioni").select("*").eq("id", id).single()).data;
    if (!corrente) return;
    visti.clear();
    $("#ba-grid").classList.add("aperta");
    $("#ba-chat").innerHTML = `
      <div class="ba-ch">
        <button class="ba-btn ba-back" id="ba-back">←</button>
        <div style="flex:1;min-width:0;"><b>${corrente.urgente ? "🚨 " : ""}${esc(corrente.azienda_nome || "Locale")}</b>
          <div style="font-size:12px;color:#64748B;">${esc(corrente.aperta_da_nome || "")}</div></div>
        <button class="ba-btn" id="ba-meet">📹 Videochiamata</button>
        <button class="ba-btn" id="ba-stato-btn">${corrente.stato === "aperta" ? "✓ Risolta, chiudi" : "↺ Riapri"}</button>
      </div>
      <div class="ba-msgs" id="ba-msgs"></div>
      <div class="ba-comp"><textarea id="ba-txt" rows="1" placeholder="Rispondi…"></textarea><button class="ba-btn pri" id="ba-invia" style="padding:11px 16px;">Invia</button></div>`;
    $("#ba-back").onclick = () => { $("#ba-grid").classList.remove("aperta"); corrente = null; caricaElenco(); };
    $("#ba-meet").onclick = () => {
      window.open("https://meet.google.com/new", "_blank", "noopener");
      const t = $("#ba-txt");
      t.value = "Ti aspetto in videochiamata, così vediamo insieme lo schermo: incolla qui il link → ";
      t.focus();
    };
    $("#ba-stato-btn").onclick = async () => {
      const chiudi = corrente.stato === "aperta";
      await sb().from("assistenza_conversazioni").update(chiudi
        ? { stato: "chiusa", urgente: false, chiusa_at: new Date().toISOString(), non_letti_operatore: 0 }
        : { stato: "aperta", chiusa_at: null }).eq("id", corrente.id);
      corrente.stato = chiudi ? "chiusa" : "aperta";
      $("#ba-stato-btn").textContent = chiudi ? "↺ Riapri" : "✓ Risolta, chiudi";
      caricaElenco();
    };
    const t = $("#ba-txt");
    t.addEventListener("input", () => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; });
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 760) { e.preventDefault(); invia(); } });
    $("#ba-invia").onclick = invia;

    const { data: msgs } = await sb().from("assistenza_messaggi").select("*").eq("conversazione_id", corrente.id).order("id").limit(500);
    (msgs || []).forEach(aggiungi);
    if (corrente.non_letti_operatore) {
      await sb().rpc("assistenza_segna_letti", { p_conv: corrente.id, p_lato: "operatore" });
      corrente.non_letti_operatore = 0;
    }
    caricaElenco();
  }

  function aggiungi(m) {
    if (!corrente || m.conversazione_id !== corrente.id || visti.has(m.id)) return;
    visti.add(m.id);
    const box = $("#ba-msgs"); if (!box) return;
    const op = m.autore_tipo === "operatore";
    const d = document.createElement("div");
    d.className = "ba-b " + (op ? "ba-op" : "ba-cli");
    d.innerHTML = `${testoHtml(m.testo)}<small>${esc(m.autore_nome || "")} · ${ora(m.created_at)}</small>`;
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }

  async function invia() {
    const t = $("#ba-txt"), testo = t.value.trim();
    if (!testo || !corrente) return;
    $("#ba-invia").disabled = true;
    const { data, error } = await sb().from("assistenza_messaggi")
      .insert({ conversazione_id: corrente.id, autore_tipo: "operatore", autore_nome: nomeOperatore(), testo }).select("*").single();
    $("#ba-invia").disabled = false;
    if (error) return alert("Non inviato: " + error.message);
    aggiungi(data); t.value = ""; t.style.height = "auto"; t.focus();
  }

  // ai clienti si presenta col nome scelto nella lista operatori, altrimenti col proprio nome
  let nomeOp = null;
  function nomeOperatore() { return nomeOp || nomeUtente(); }
  sb().from("assistenza_operatori").select("nome").eq("user_id", window.state?.user?.id || "").maybeSingle()
    .then(({ data }) => { if (data?.nome) nomeOp = data.nome; });

  // ── tempo reale ──
  canale = sb().channel("ass-operatori")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "assistenza_messaggi" }, (p) => {
      const m = p.new;
      if (corrente && m.conversazione_id === corrente.id) {
        aggiungi(m);
        if (m.autore_tipo === "cliente" && document.visibilityState === "visible")
          sb().rpc("assistenza_segna_letti", { p_conv: corrente.id, p_lato: "operatore" });
      }
      if (m.autore_tipo === "cliente") {
        bip();
        if ("Notification" in window && Notification.permission === "granted" && (document.visibilityState !== "visible" || corrente?.id !== m.conversazione_id)) {
          try { new Notification("💬 " + (m.autore_nome || "Cliente"), { body: String(m.testo).slice(0, 140), tag: m.conversazione_id }); } catch (_) {}
        }
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "assistenza_conversazioni" }, () => caricaElenco())
    .subscribe();

  const fuori = () => {
    if (!location.hash.startsWith("#/bo-assistenza")) {
      if (canale) { try { sb().removeChannel(canale); } catch (_) {} canale = null; }
      window.removeEventListener("hashchange", fuori);
    }
  };
  window.addEventListener("hashchange", fuori);

  await caricaCfg();
  await caricaElenco();
  const daLink = new URLSearchParams((location.hash.split("?")[1] || "")).get("c");
  if (daLink) apri(daLink);
}
