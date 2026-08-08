// js/views/bo/bo-test.js — Test di competenza: componi, invia, leggi gli esiti.
// I test si preparavano solo a database: qui si creano, si filtrano per reparto
// e si mandano ai dipendenti con una scadenza.

const supa = () => window.supabaseClient || window.supabase;
const QUIZ_URL = "https://app.ristoflow-ai.com/quiz.html?t=";

let aziendaId = null;
let sedeId = null;
let testCorrente = null;

const REPARTI = ["tutti", "sala", "cucina", "ricevimento"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function giornoOra(v) {
  if (!v) return "-";
  const d = new Date(v);
  return d.toLocaleDateString("it-IT") + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export async function render(container) {
  aziendaId = window.state?.azienda?.id;
  sedeId = window.state?.sedeAttiva?.id || null;

  if (!aziendaId) {
    container.innerHTML = '<div style="padding:40px;color:#94a3b8;">Nessuna azienda attiva.</div>';
    return;
  }

  container.innerHTML = `
    <section class="view" style="max-width:960px;margin:0 auto;">
      <h2 style="margin:0 0 4px;">📝 Test di competenza</h2>
      <p class="small-muted" style="margin:0 0 18px;">
        Domande brevi sulle cose che si devono sapere. I risultati entrano nella valutazione,
        insieme a presenze, tempi di servizio e recensioni.
      </p>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <button class="app-button small" id="bt-nuovo">+ Nuovo test</button>
        <button class="app-button small gray" id="bt-ricarica">↻ Aggiorna</button>
      </div>

      <div id="bt-elenco"></div>
      <div id="bt-esiti" style="margin-top:26px;"></div>
    </section>
  `;

  container.querySelector("#bt-nuovo").onclick = () => formTest(container);
  container.querySelector("#bt-ricarica").onclick = () => render(container);

  await caricaElenco(container);
  await caricaEsiti(container);
}

/* ---------------- elenco test ---------------- */

async function caricaElenco(container) {
  const box = container.querySelector("#bt-elenco");
  box.innerHTML = '<div class="small-muted">Carico…</div>';

  const { data: test, error } = await supa().from("test_competenze")
    .select("id, titolo, categoria, reparto, attivo, minuti_max, created_at")
    .eq("azienda_id", aziendaId)
    .order("created_at", { ascending: false });

  if (error) { box.innerHTML = '<div style="color:#b91c1c;">Errore: ' + esc(error.message) + "</div>"; return; }
  if (!test?.length) {
    box.innerHTML = '<div class="small-muted">Nessun test. Creane uno con “Nuovo test”.</div>';
    return;
  }

  const ids = test.map((t) => t.id);
  const { data: domande } = await supa().from("test_competenze_domande").select("id, test_id").in("test_id", ids);
  const conta = {};
  (domande || []).forEach((d) => { conta[d.test_id] = (conta[d.test_id] || 0) + 1; });

  box.innerHTML = test.map((t) => `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
        <div>
          <div style="font-weight:800;font-size:16px;">${esc(t.titolo)}</div>
          <div class="small-muted">
            ${esc(t.reparto || "tutti")} · ${conta[t.id] || 0} domande
            ${t.minuti_max ? " · max " + t.minuti_max + " min" : ""}
            ${t.attivo ? "" : " · <span style='color:#b45309;'>non attivo</span>"}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="app-button small gray" data-dom="${t.id}">Domande</button>
          <button class="app-button small" data-invia="${t.id}">Invia</button>
        </div>
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-dom]").forEach((b) => {
    b.onclick = () => formDomande(container, test.find((x) => x.id === b.dataset.dom));
  });
  box.querySelectorAll("[data-invia]").forEach((b) => {
    b.onclick = () => formInvio(container, test.find((x) => x.id === b.dataset.invia));
  });
}

/* ---------------- nuovo test ---------------- */

function formTest(container) {
  const m = modale("Nuovo test", `
    <label class="small-muted">Titolo</label>
    <input id="bt-titolo" class="input-pill" placeholder="Es. Allergeni e intolleranze">
    <label class="small-muted" style="margin-top:10px;display:block;">Reparto</label>
    <select id="bt-reparto" class="input-pill">
      ${REPARTI.map((r) => '<option value="' + r + '">' + r + "</option>").join("")}
    </select>
    <label class="small-muted" style="margin-top:10px;display:block;">Categoria</label>
    <input id="bt-categoria" class="input-pill" placeholder="sicurezza, menu, servizio…">
    <label class="small-muted" style="margin-top:10px;display:block;">Tempo massimo consigliato (minuti, facoltativo)</label>
    <input id="bt-minuti" type="number" min="1" class="input-pill" placeholder="5">
  `, async () => {
    const titolo = document.getElementById("bt-titolo").value.trim();
    if (!titolo) { alert("Serve un titolo."); return false; }
    const { error } = await supa().from("test_competenze").insert({
      azienda_id: aziendaId,
      titolo,
      categoria: document.getElementById("bt-categoria").value.trim() || null,
      reparto: document.getElementById("bt-reparto").value,
      minuti_max: Number(document.getElementById("bt-minuti").value) || null,
      attivo: true,
    });
    if (error) { alert("Errore: " + error.message); return false; }
    await caricaElenco(container);
    return true;
  });
  document.body.appendChild(m);
}

/* ---------------- domande ---------------- */

async function formDomande(container, test) {
  testCorrente = test;
  const { data: dom } = await supa().from("test_competenze_domande")
    .select("id, domanda, opzioni, risposta_corretta, ordine")
    .eq("test_id", test.id).order("ordine", { ascending: true });

  const elenco = (dom || []).map((d, i) => `
    <div style="border-bottom:1px solid #f1f5f9;padding:9px 0;font-size:14px;">
      <div style="font-weight:700;">${i + 1}. ${esc(d.domanda)}</div>
      <div class="small-muted">Giusta: ${esc(d.risposta_corretta)}</div>
      <button class="app-button small gray" data-del="${d.id}" style="margin-top:6px;">Elimina</button>
    </div>
  `).join("") || '<div class="small-muted">Nessuna domanda.</div>';

  const m = modale("Domande — " + esc(test.titolo), `
    <div style="max-height:34vh;overflow:auto;margin-bottom:14px;">${elenco}</div>
    <div style="border-top:2px solid #e2e8f0;padding-top:12px;">
      <label class="small-muted">Nuova domanda</label>
      <input id="bd-testo" class="input-pill" placeholder="Scrivi una situazione vera del locale">
      <input id="bd-o1" class="input-pill" placeholder="Opzione 1" style="margin-top:8px;">
      <input id="bd-o2" class="input-pill" placeholder="Opzione 2" style="margin-top:8px;">
      <input id="bd-o3" class="input-pill" placeholder="Opzione 3 (facoltativa)" style="margin-top:8px;">
      <input id="bd-corretta" class="input-pill" placeholder="Risposta giusta (identica a un'opzione)" style="margin-top:8px;">
    </div>
  `, async () => {
    const testo = document.getElementById("bd-testo").value.trim();
    const opz = ["bd-o1", "bd-o2", "bd-o3"].map((k) => document.getElementById(k).value.trim()).filter(Boolean);
    const giusta = document.getElementById("bd-corretta").value.trim();
    if (!testo || opz.length < 2 || !giusta) { alert("Servono domanda, almeno due opzioni e la risposta giusta."); return false; }
    if (!opz.some((o) => o.toLowerCase() === giusta.toLowerCase())) {
      alert("La risposta giusta deve essere scritta identica a una delle opzioni."); return false;
    }
    const { error } = await supa().from("test_competenze_domande").insert({
      test_id: test.id, domanda: testo, opzioni: opz, risposta_corretta: giusta,
      punteggio: 1, ordine: (dom?.length || 0) + 1,
    });
    if (error) { alert("Errore: " + error.message); return false; }
    await caricaElenco(container);
    return true;
  }, "Aggiungi");

  m.querySelectorAll("[data-del]").forEach((b) => {
    b.onclick = async () => {
      if (!confirm("Elimino la domanda?")) return;
      await supa().from("test_competenze_domande").delete().eq("id", b.dataset.del);
      m.remove();
      formDomande(container, test);
    };
  });
  document.body.appendChild(m);
}

/* ---------------- invio ---------------- */

async function formInvio(container, test) {
  let q = supa().from("dipendenti")
    .select("id, nome, cognome, mansione, reparto_id, sede_id")
    .eq("azienda_id", aziendaId).eq("attivo", true).order("nome");
  const { data: dip } = await q;

  const { data: reparti } = await supa().from("reparti").select("id, nome").eq("azienda_id", aziendaId);
  const nomeReparto = new Map((reparti || []).map((r) => [String(r.id), String(r.nome || "").toLowerCase()]));

  const rep = String(test.reparto || "tutti").toLowerCase();
  const lista = (dip || []).filter((d) => {
    if (rep === "tutti") return true;
    const suo = d.reparto_id ? nomeReparto.get(String(d.reparto_id)) : "";
    const mans = String(d.mansione || "").toLowerCase();
    return (suo && suo.indexOf(rep) >= 0) || mans.indexOf(rep) >= 0;
  });

  const scadenzaDefault = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const righe = (dip || []).map((d) => {
    const consigliato = lista.some((x) => x.id === d.id);
    return `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <input type="checkbox" value="${d.id}" ${consigliato ? "checked" : ""} style="width:18px;height:18px;">
        <span>${esc(d.nome)} ${esc(d.cognome || "")}
          <span class="small-muted">${esc(d.mansione || "")}</span>
        </span>
      </label>`;
  }).join("");

  const m = modale("Invia — " + esc(test.titolo), `
    <div class="small-muted" style="margin-bottom:8px;">
      Reparto del test: <b>${esc(rep)}</b>. Ho già spuntato chi ci rientra, puoi cambiare.
    </div>
    <label class="small-muted">Consegna entro</label>
    <input id="bi-scadenza" type="date" class="input-pill" value="${scadenzaDefault}">
    <div style="max-height:38vh;overflow:auto;margin-top:12px;">${righe || '<div class="small-muted">Nessun dipendente.</div>'}</div>
    <div id="bi-link" style="margin-top:12px;"></div>
  `, async () => {
    const scelti = Array.from(document.querySelectorAll('#rf-modale input[type=checkbox]:checked')).map((c) => c.value);
    if (!scelti.length) { alert("Scegli almeno una persona."); return false; }
    const scad = document.getElementById("bi-scadenza").value;
    const righeIns = scelti.map((id) => ({
      azienda_id: aziendaId, test_id: test.id, dipendente_id: id,
      token: (crypto.randomUUID().replace(/-/g, "")),
      scadenza: scad ? new Date(scad + "T23:59:59").toISOString() : null,
    }));
    const { data, error } = await supa().from("test_competenze_invii").insert(righeIns).select("token, dipendente_id");
    if (error) { alert("Errore: " + error.message); return false; }

    const nomi = new Map((dip || []).map((d) => [String(d.id), d.nome + " " + (d.cognome || "")]));
    const testo = (data || []).map((r) =>
      (nomi.get(String(r.dipendente_id)) || "") + ": " + QUIZ_URL + r.token).join("\n");
    document.getElementById("bi-link").innerHTML =
      '<div class="small-muted" style="margin-bottom:6px;">Link generati — copiali e mandali su WhatsApp:</div>' +
      '<textarea readonly style="width:100%;height:120px;font-size:12px;">' + esc(testo) + "</textarea>";
    await caricaEsiti(container);
    return false; // resta aperto per copiare i link
  }, "Genera i link");

  document.body.appendChild(m);
}

/* ---------------- esiti ---------------- */

async function caricaEsiti(container) {
  const box = container.querySelector("#bt-esiti");
  if (!box) return;

  const { data: invii } = await supa().from("test_competenze_invii")
    .select("id, test_id, dipendente_id, stato, inviato_il, completato_il, scadenza, durata_secondi, uscite_pagina, sospetto, risultato_id")
    .eq("azienda_id", aziendaId)
    .order("inviato_il", { ascending: false })
    .limit(80);

  if (!invii?.length) { box.innerHTML = ""; return; }

  const { data: dip } = await supa().from("dipendenti").select("id, nome, cognome").eq("azienda_id", aziendaId);
  const { data: test } = await supa().from("test_competenze").select("id, titolo").eq("azienda_id", aziendaId);
  const ids = invii.map((i) => i.risultato_id).filter(Boolean);
  let risultati = [];
  if (ids.length) {
    const { data } = await supa().from("test_competenze_risultati").select("id, percentuale").in("id", ids);
    risultati = data || [];
  }
  const nomeDip = new Map((dip || []).map((d) => [String(d.id), d.nome + " " + (d.cognome || "")]));
  const nomeTest = new Map((test || []).map((t) => [String(t.id), t.titolo]));
  const perc = new Map(risultati.map((r) => [String(r.id), r.percentuale]));

  box.innerHTML = `
    <h3 style="margin:0 0 8px;">Inviati e completati</h3>
    <div style="overflow:auto;">
    <table style="width:100%;border-collapse:collapse;background:#fff;font-size:13px;">
      <tr style="background:#0E5A7A;color:#fff;">
        <th style="padding:8px;text-align:left;">Persona</th>
        <th style="padding:8px;text-align:left;">Test</th>
        <th style="padding:8px;">Stato</th>
        <th style="padding:8px;">Esito</th>
        <th style="padding:8px;">Tempo</th>
        <th style="padding:8px;">Note</th>
      </tr>
      ${invii.map((i) => {
        const p = i.risultato_id ? perc.get(String(i.risultato_id)) : null;
        const min = i.durata_secondi ? Math.round(i.durata_secondi / 60) : null;
        return `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;">${esc(nomeDip.get(String(i.dipendente_id)) || "-")}</td>
          <td style="padding:8px;">${esc(nomeTest.get(String(i.test_id)) || "-")}</td>
          <td style="padding:8px;text-align:center;">${esc(i.stato)}</td>
          <td style="padding:8px;text-align:center;font-weight:700;">${p != null ? p + "%" : "-"}</td>
          <td style="padding:8px;text-align:center;">${min != null ? min + " min" : "-"}</td>
          <td style="padding:8px;text-align:center;">${i.sospetto ? "🔎 da rivedere" : ""}</td>
        </tr>`;
      }).join("")}
    </table></div>
    <div class="small-muted" style="margin-top:8px;">
      “Da rivedere” compare quando il test è stato lasciato aperto più volte o alcune risposte
      hanno richiesto molto tempo. È un motivo per parlarne, non una prova di niente.
    </div>
  `;
}

/* ---------------- modale ---------------- */

function modale(titolo, corpo, onOk, testoOk) {
  const wrap = document.createElement("div");
  wrap.id = "rf-modale";
  wrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:88vh;overflow:auto;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">${titolo}</h3>
          <button id="rf-x" style="background:none;border:none;font-size:22px;cursor:pointer;color:#64748b;">✕</button>
        </div>
        <div>${corpo}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;">
          <button class="app-button small gray" id="rf-annulla">Annulla</button>
          <button class="app-button small" id="rf-ok">${testoOk || "Salva"}</button>
        </div>
      </div>
    </div>`;
  const chiudi = () => wrap.remove();
  wrap.querySelector("#rf-x").onclick = chiudi;
  wrap.querySelector("#rf-annulla").onclick = chiudi;
  wrap.querySelector("#rf-ok").onclick = async () => {
    const esito = await onOk();
    if (esito !== false) chiudi();
  };
  return wrap;
}
