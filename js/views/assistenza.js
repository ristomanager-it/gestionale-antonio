// js/views/assistenza.js
// Chat di assistenza lato cliente: una conversazione per locale, come su WhatsApp.
// Se l'operatore la chiude e il cliente riscrive, si riapre da sola.
import { sb, esc, testoHtml, ora, nomeUtente, statoAssistenza } from "../utils/assistenza.js";

let canale = null;

export async function render(container) {
  const az = window.state?.azienda?.id;
  if (canale) { try { sb().removeChannel(canale); } catch (_) {} canale = null; }

  container.innerHTML = `
  <style>
    .ass-wrap{max-width:760px;margin:0 auto;display:flex;flex-direction:column;height:calc(100dvh - 150px);min-height:420px;padding:10px 12px 0;}
    body.con-rf-footer .ass-wrap{height:calc(100dvh - 210px);}
    .ass-head{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#023C59;color:#fff;border-radius:16px 16px 0 0;}
    .ass-head h1{font-size:17px;margin:0;color:#fff;}
    .ass-pill{font-size:12px;opacity:.9;display:flex;align-items:center;gap:6px;margin-top:2px;}
    .ass-dot{width:8px;height:8px;border-radius:50%;display:inline-block;}
    .ass-msgs{flex:1;overflow-y:auto;background:#F4F7F9;padding:14px 12px;display:flex;flex-direction:column;gap:8px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;}
    .ass-b{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14.5px;line-height:1.4;box-shadow:0 1px 2px rgba(0,0,0,.05);}
    .ass-b small{display:block;font-size:11px;opacity:.65;margin-top:4px;}
    .ass-me{align-self:flex-end;background:#0E5A7A;color:#fff;border-bottom-right-radius:4px;}
    .ass-op{align-self:flex-start;background:#fff;color:#0f172a;border-bottom-left-radius:4px;}
    .ass-sys{align-self:center;background:#FFF7ED;color:#9A3412;font-size:13px;text-align:center;max-width:92%;}
    .ass-box{border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;background:#fff;padding:10px;}
    .ass-row{display:flex;gap:8px;align-items:flex-end;}
    .ass-row textarea{flex:1;resize:none;border:1px solid #CBD5E1;border-radius:12px;padding:10px 12px;font:inherit;font-size:15px;max-height:140px;}
    .ass-row button{background:#E66101;color:#fff;border:none;border-radius:12px;padding:11px 16px;font-weight:700;font-size:15px;cursor:pointer;}
    .ass-row button:disabled{opacity:.5;}
    .ass-urg{display:flex;align-items:center;gap:8px;font-size:13px;color:#B91C1C;margin:0 0 8px 2px;}
  </style>
  <div class="ass-wrap">
    <div class="ass-head">
      <div style="font-size:26px;">💬</div>
      <div><h1>Assistenza Ristoflow</h1><div class="ass-pill" id="ass-stato"><span class="ass-dot" style="background:#94a3b8"></span>…</div></div>
    </div>
    <div class="ass-msgs" id="ass-msgs"></div>
    <div class="ass-box">
      <label class="ass-urg" id="ass-urg-wrap" style="display:none;"><input type="checkbox" id="ass-urg"> 🚨 È un blocco urgente (cassa, comande o prenotazioni ferme)</label>
      <div class="ass-row">
        <textarea id="ass-txt" rows="1" placeholder="Scrivi il problema o la domanda…"></textarea>
        <button id="ass-invia">Invia</button>
      </div>
    </div>
  </div>`;

  const elMsgs = container.querySelector("#ass-msgs");
  const elTxt = container.querySelector("#ass-txt");
  const btn = container.querySelector("#ass-invia");
  const visti = new Set();
  let conv = null;

  if (!az) { elMsgs.innerHTML = `<div class="ass-b ass-sys">Scegli prima il locale.</div>`; return; }

  const [{ data: cfg }, { data: ultima }] = await Promise.all([
    sb().from("assistenza_config").select("*").eq("id", 1).maybeSingle(),
    sb().from("assistenza_conversazioni").select("*").eq("azienda_id", az).order("ultimo_messaggio_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  conv = ultima || null;

  const st = statoAssistenza(cfg);
  container.querySelector("#ass-stato").innerHTML =
    `<span class="ass-dot" style="background:${st.inOrario ? "#22c55e" : st.reperibilita ? "#F1B302" : "#94a3b8"}"></span>${esc(st.testo)}`;
  if (!st.inOrario && st.reperibilita) container.querySelector("#ass-urg-wrap").style.display = "flex";

  elMsgs.innerHTML = `<div class="ass-b ass-sys">Scrivi qui cosa ti serve: ti risponde una persona del team Ristoflow.
    Se serve, ti mandiamo un link per una videochiamata e risolviamo insieme sullo schermo.
    ${!st.inOrario ? "<br><b>" + esc(cfg?.messaggio_fuori_orario || "") + "</b>" : ""}</div>`;

  function aggiungi(m) {
    if (m.id && visti.has(m.id)) return;
    if (m.id) visti.add(m.id);
    const mio = m.autore_tipo === "cliente";
    const div = document.createElement("div");
    div.className = "ass-b " + (m.autore_tipo === "sistema" ? "ass-sys" : mio ? "ass-me" : "ass-op");
    div.innerHTML = `${!mio && m.autore_tipo === "operatore" ? `<b style="font-size:12px;color:#E66101;">${esc(m.autore_nome || "Ristoflow")}</b><br>` : ""}${testoHtml(m.testo)}
      <small>${mio && m.autore_nome && m.autore_nome !== nomeUtente() ? esc(m.autore_nome) + " · " : ""}${ora(m.created_at || Date.now())}</small>`;
    elMsgs.appendChild(div);
    elMsgs.scrollTop = elMsgs.scrollHeight;
  }

  function ascolta() {
    if (!conv || canale) return;
    canale = sb().channel("ass-cli-" + conv.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assistenza_messaggi", filter: `conversazione_id=eq.${conv.id}` },
        (p) => { aggiungi(p.new); if (p.new.autore_tipo === "operatore") sb().rpc("assistenza_segna_letti", { p_conv: conv.id, p_lato: "cliente" }).then(() => aggiornaBadge()); })
      .subscribe();
  }

  if (conv) {
    const { data: msgs } = await sb().from("assistenza_messaggi").select("*").eq("conversazione_id", conv.id).order("id").limit(300);
    (msgs || []).forEach(aggiungi);
    if (conv.non_letti_cliente) await sb().rpc("assistenza_segna_letti", { p_conv: conv.id, p_lato: "cliente" });
    aggiornaBadge();
    ascolta();
  }

  elTxt.addEventListener("input", () => { elTxt.style.height = "auto"; elTxt.style.height = Math.min(elTxt.scrollHeight, 140) + "px"; });
  elTxt.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); invia(); } });
  btn.addEventListener("click", invia);

  async function invia() {
    const testo = elTxt.value.trim();
    if (!testo) return;
    const urgente = !!container.querySelector("#ass-urg")?.checked;
    btn.disabled = true;
    try {
      if (!conv) {
        const { data, error } = await sb().from("assistenza_conversazioni")
          .insert({ azienda_id: az, aperta_da_nome: nomeUtente(), urgente }).select("*").single();
        if (error) throw error;
        conv = data; ascolta();
      } else if (urgente) {
        await sb().rpc("assistenza_segnala_urgente", { p_conv: conv.id });
      }
      const { data: m, error } = await sb().from("assistenza_messaggi")
        .insert({ conversazione_id: conv.id, autore_tipo: "cliente", autore_nome: nomeUtente(), testo }).select("*").single();
      if (error) throw error;
      aggiungi(m);
      elTxt.value = ""; elTxt.style.height = "auto";
      if (urgente) container.querySelector("#ass-urg").checked = false;
      sb().functions.invoke("assistenza-avviso", { body: { conversazione_id: conv.id } }).catch(() => {});
    } catch (e) {
      alert("Messaggio non inviato: " + (e?.message || e));
    } finally { btn.disabled = false; elTxt.focus(); }
  }

  // via dalla pagina: chiudo l'ascolto
  const fuori = () => {
    if (!location.hash.startsWith("#/assistenza")) {
      if (canale) { try { sb().removeChannel(canale); } catch (_) {} canale = null; }
      window.removeEventListener("hashchange", fuori);
    }
  };
  window.addEventListener("hashchange", fuori);
}

// pallino dei non letti sulla voce "Aiuto" della barra in basso
export async function aggiornaBadge() {
  try { window.rfAggiornaBadgeAssistenza && window.rfAggiornaBadgeAssistenza(); } catch (_) {}
}
