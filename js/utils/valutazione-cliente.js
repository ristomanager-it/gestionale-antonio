// Valutazione interna del cliente (22/11/2026).
// Serve allo staff delle proprie sedi per sapere con chi ha a che fare: no-show, non pagato, ecc.
// Resta dentro l'azienda (tabella clienti_valutazioni_interne, policy mie_aziende): il cliente non la vede su Ospitalia.
// Solo fatti: etichette fisse + nota breve. Le valutazioni scadono dopo 24 mesi.

const ETICHETTE = [
  { k: "puntuale", l: "Puntuale", neg: false },
  { k: "gentile", l: "Gentile", neg: false },
  { k: "spende_bene", l: "Spende bene", neg: false },
  { k: "no_show", l: "No-show", neg: true },
  { k: "ritardo", l: "Ritardo grave", neg: true },
  { k: "disdetta_ultimo", l: "Disdetta all'ultimo", neg: true },
  { k: "non_pagato", l: "Non ha pagato", neg: true },
  { k: "scorretto", l: "Comportamento scorretto", neg: true },
];
const NOME_ETICHETTA = Object.fromEntries(ETICHETTE.map((e) => [e.k, e.l]));

function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
export function telNorm(t) { const d = String(t || "").replace(/\D/g, ""); return d ? d.slice(-10) : ""; }

// avvisi per piu' telefoni insieme (elenco prenotazioni): { telefono_norm: riga v_clienti_avvisi }
export async function caricaAvvisi(aziendaId, telefoni) {
  const tels = [...new Set((telefoni || []).map(telNorm).filter(Boolean))];
  if (!aziendaId || !tels.length) return {};
  const out = {};
  for (let i = 0; i < tels.length; i += 150) {
    const { data } = await window.supabaseClient.from("v_clienti_avvisi")
      .select("telefono_norm,livello,n_no_show,n_disdette,n_non_pagato,n_scorretto,voto_medio,n_valutazioni")
      .eq("azienda_id", aziendaId).in("telefono_norm", tels.slice(i, i + 150));
    (data || []).forEach((r) => { out[r.telefono_norm] = r; });
  }
  return out;
}

// piccolo bollino per le righe dell'elenco
export function badgeAvviso(av) {
  if (!av) return "";
  if (av.livello === "attenzione") {
    const parti = [];
    if (av.n_no_show) parti.push(av.n_no_show + " no-show");
    if (av.n_non_pagato) parti.push("non ha pagato");
    if (av.n_scorretto) parti.push("scorretto");
    if (!parti.length && av.voto_medio) parti.push("voto " + av.voto_medio);
    return `<span title="Avviso interno" style="display:inline-block;background:#fdecea;color:#a32a1d;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;margin-left:6px;white-space:nowrap">⚠️ ${esc(parti.join(" · "))}</span>`;
  }
  if (av.livello === "affidabile") return `<span title="Cliente affidabile" style="display:inline-block;background:#eaf5ec;color:#245a30;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;margin-left:6px">★</span>`;
  return "";
}

function stelle(v) { let o = ""; for (let i = 1; i <= 5; i++) o += i <= (v || 0) ? "★" : "☆"; return o; }
function dataBreve(iso) { try { return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }); } catch (_e) { return ""; } }

// scheda prenotazione: avviso + storico + form "Valuta il cliente"
export async function montaValutazioneCliente(box, opt) {
  if (!box) return;
  const sb = window.supabaseClient;
  const tel = telNorm(opt.telefono);
  if (!tel || !opt.aziendaId) { box.innerHTML = ""; return; }
  const [{ data: storico }, { data: riep }] = await Promise.all([
    sb.from("clienti_valutazioni_interne").select("id,voto,etichette,nota,origine,created_at,prenotazione_id")
      .eq("azienda_id", opt.aziendaId).eq("telefono_norm", tel).gte("scade_il", new Date().toISOString().slice(0, 10))
      .order("created_at", { ascending: false }).limit(20),
    sb.from("v_clienti_avvisi").select("*").eq("azienda_id", opt.aziendaId).eq("telefono_norm", tel).maybeSingle(),
  ]);
  const st = storico || [];
  const giaQuesta = st.find((v) => v.prenotazione_id === opt.prenotazioneId && v.origine === "manuale");

  let h = "";
  if (riep && riep.livello === "attenzione") {
    const parti = [];
    if (riep.n_no_show) parti.push(riep.n_no_show + " no-show");
    if (riep.n_disdette) parti.push(riep.n_disdette + (riep.n_disdette === 1 ? " disdetta" : " disdette") + " all'ultimo");
    if (riep.n_non_pagato) parti.push("non ha pagato " + riep.n_non_pagato + (riep.n_non_pagato === 1 ? " volta" : " volte"));
    if (riep.n_scorretto) parti.push("comportamento scorretto");
    if (riep.voto_medio) parti.push("voto medio " + riep.voto_medio + " su 5");
    h += `<div style="background:#fdecea;border:1px solid #f3b8b1;border-radius:14px;padding:12px 14px;margin-bottom:12px">
      <div style="font-weight:800;color:#a32a1d;font-size:15px">⚠️ Attenzione con questo cliente</div>
      <div style="color:#7a3a33;font-size:14px;margin-top:4px">${esc(parti.join(" · "))}</div>
      ${riep.ultima_nota ? `<div style="color:#7a3a33;font-size:14px;margin-top:4px">Nota: “${esc(riep.ultima_nota)}”</div>` : ""}
    </div>`;
  } else if (riep && riep.livello === "affidabile") {
    h += `<div style="background:#eaf5ec;border:1px solid #b9dcc0;border-radius:14px;padding:12px 14px;margin-bottom:12px;color:#245a30;font-weight:700;font-size:14px">★ Cliente affidabile · voto medio ${esc(riep.voto_medio)} su 5</div>`;
  }

  if (st.length) {
    h += `<div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin:4px 0 6px">Storico valutazioni (solo staff)</div>`;
    h += st.slice(0, 6).map((v) => `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px">
        <span style="color:#C9832E">${stelle(v.voto)}</span> · ${esc((v.etichette || []).map((e) => NOME_ETICHETTA[e] || e).join(", ") || "—")}
        ${v.nota ? `<div style="color:#475569;font-size:13px;margin-top:2px">“${esc(v.nota)}”</div>` : ""}
        <div style="color:#94a3b8;font-size:12px">${esc(dataBreve(v.created_at))}${v.origine === "no_show_auto" ? " · automatica (no-show)" : ""}</div></div>`).join("");
  }

  h += `<div id="vc-form" style="margin-top:12px">
    <button type="button" id="vc-apri" class="pren-det-link" style="width:100%">${giaQuesta ? "✏️ Modifica la valutazione di questa visita" : "⭐ Valuta il cliente"}</button>
  </div>`;
  box.innerHTML = h;

  const sel = { voto: giaQuesta ? giaQuesta.voto : 0, etichette: new Set(giaQuesta ? giaQuesta.etichette : []), nota: giaQuesta ? (giaQuesta.nota || "") : "" };
  box.querySelector("#vc-apri").onclick = () => {
    const f = box.querySelector("#vc-form");
    f.innerHTML = `
      <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin:6px 0">Voto</div>
      <div id="vc-stelle" style="display:flex;gap:4px">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" style="width:46px;height:46px;border:none;background:none;font-size:32px;cursor:pointer;color:#d8d0c1">★</button>`).join("")}</div>
      <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin:10px 0 6px">Cosa è successo</div>
      <div id="vc-chips" style="display:flex;flex-wrap:wrap;gap:8px">${ETICHETTE.map((e) => `<button type="button" data-k="${e.k}" data-neg="${e.neg ? 1 : 0}" style="min-height:44px;padding:0 14px;border-radius:22px;border:1px solid #E8E1D4;background:#fff;font-size:14px;cursor:pointer">${esc(e.l)}</button>`).join("")}</div>
      <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin:10px 0 6px">Nota (facoltativa, solo fatti)</div>
      <textarea id="vc-nota" maxlength="280" rows="2" class="pren-det-textarea" placeholder="Es. Prenotato per 6, nessuno si è presentato, telefono spento.">${esc(sel.nota)}</textarea>
      <button type="button" id="vc-salva" class="pren-det-btn primary" style="width:100%;margin-top:10px">Salva valutazione</button>
      <div style="font-size:12px;color:#64748b;margin-top:8px">Visibile solo allo staff delle tue sedi. Si cancella da sola dopo 24 mesi.</div>
      <div id="vc-msg" style="font-size:13px;margin-top:6px"></div>`;
    const ridisegna = () => {
      f.querySelectorAll("#vc-stelle button").forEach((b) => { b.style.color = Number(b.dataset.v) <= sel.voto ? "#C9832E" : "#d8d0c1"; });
      f.querySelectorAll("#vc-chips button").forEach((b) => {
        const on = sel.etichette.has(b.dataset.k), neg = b.dataset.neg === "1";
        b.style.background = on ? (neg ? "#a32a1d" : "#12302C") : "#fff";
        b.style.color = on ? "#fff" : "#1D2422";
        b.style.borderColor = on ? (neg ? "#a32a1d" : "#12302C") : "#E8E1D4";
      });
    };
    f.querySelectorAll("#vc-stelle button").forEach((b) => { b.onclick = () => { sel.voto = Number(b.dataset.v); ridisegna(); }; });
    f.querySelectorAll("#vc-chips button").forEach((b) => { b.onclick = () => { sel.etichette.has(b.dataset.k) ? sel.etichette.delete(b.dataset.k) : sel.etichette.add(b.dataset.k); ridisegna(); }; });
    ridisegna();
    f.querySelector("#vc-salva").onclick = async () => {
      const msg = f.querySelector("#vc-msg");
      if (!sel.voto && !sel.etichette.size) { msg.style.color = "#b45309"; msg.textContent = "Scegli un voto o almeno un'etichetta."; return; }
      const riga = {
        azienda_id: opt.aziendaId, sede_id: opt.sedeId || null, telefono_norm: tel, cliente_nome: opt.nome || null,
        prenotazione_id: opt.prenotazioneId || null, voto: sel.voto || null, etichette: [...sel.etichette],
        nota: (f.querySelector("#vc-nota").value || "").trim().slice(0, 280) || null, origine: "manuale",
      };
      const q = giaQuesta
        ? sb.from("clienti_valutazioni_interne").update(riga).eq("id", giaQuesta.id)
        : sb.from("clienti_valutazioni_interne").insert(riga);
      const { error } = await q;
      if (error) { msg.style.color = "#b91c1c"; msg.textContent = "Non salvata: " + error.message; return; }
      montaValutazioneCliente(box, opt);
    };
  };
}
