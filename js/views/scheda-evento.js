// js/views/scheda-evento.js
// 🗂 Scheda evento: per ogni piatto del menu le fasi di lavorazione (cosa, quando, parametri,
// preparazione o servizio), il titolo di chi la fa e il nome per questo evento. Nel buffet e
// nell'aperitivo si scelgono i piatti dal ricettario. Le fasi si salvano sulla ricetta (restano
// per i prossimi eventi); il nome di chi le fa vale per l'evento. Salvando, lotti e planning
// del Centro cottura si aggiornano da soli (evento_sincronizza_produzione).

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GIORNI = ["", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const fdLungo = (d) => new Date(d + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

function quandoDi(f) {
  if (f.momento === "servizio") return "srv";
  if (f.giorno_settimana) return "d" + f.giorno_settimana;
  if (f.giorni_prima != null) return "g" + f.giorni_prima;
  return "";
}
function applicaQuando(f, v) {
  f.momento = v === "srv" ? "servizio" : "preparazione";
  f.giorni_prima = v === "srv" ? 0 : v.startsWith("g") ? Number(v.slice(1)) : null;
  f.giorno_settimana = v.startsWith("d") ? Number(v.slice(1)) : null;
}
const OPZ_QUANDO = [["", "Da decidere"], ["srv", "🍽 Al servizio"], ["g0", "Stesso giorno, prima"],
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ["g" + n, n === 1 ? "1 giorno prima" : n + " giorni prima"]),
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ["d" + n, "Il " + GIORNI[n] + " prima"])];

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  const id = Number((window.routeParams || {}).id || 0);
  app.innerHTML = stile() + `<div class="se"><div class="se-vuoto">Un attimo…</div></div>`;
  const box = app.querySelector(".se");
  if (!id) return elencoEventi(box, az);
  await scheda(box, az, id);
}

async function elencoEventi(box, az) {
  const ieri = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { data } = await sb().from("preventivi").select("id, titolo_evento, data_evento, ora_evento, n_invitati, n_bambini, stato")
    .eq("azienda_id", az).gte("data_evento", ieri).in("stato", ["confermato", "trattativa"]).order("data_evento").order("ora_evento").limit(40);
  const ev = data || [];
  box.innerHTML = `<h2 class="se-tit">🗂 Schede evento</h2>
    <div class="se-sub">Scegli l'evento: per ogni piatto imposti fasi, giorni, parametri e chi le fa.</div>
    ${ev.length ? ev.map((e) => `<a class="se-ev" href="#/scheda-evento?id=${e.id}">
        <b>${esc(e.titolo_evento || "Evento")}</b>
        <span>${fdLungo(e.data_evento)}${e.ora_evento ? " · " + String(e.ora_evento).slice(0, 5) : ""} · ${e.n_invitati || 0} persone${e.stato !== "confermato" ? " · in trattativa" : ""}</span></a>`).join("")
      : `<div class="se-vuoto">Nessun evento in arrivo.</div>`}`;
}

async function scheda(box, az, id) {
  const [{ data: p }, { data: righe }, { data: sezioni }, { data: dip }] = await Promise.all([
    sb().from("preventivi").select("id, titolo_evento, data_evento, ora_evento, n_invitati, n_bambini, intolleranze, sede_uuid, stato").eq("id", id).maybeSingle(),
    sb().from("preventivi_righe").select("id, sezione_menu, nome_portata, ricetta_id, quantita, ricette(nome)").eq("preventivo_id", id).order("id"),
    sb().from("sezioni_menu").select("nome, ordine, per_bambini").eq("azienda_id", az),
    sb().from("dipendenti").select("id, nome, cognome, mansione, attivo").eq("azienda_id", az).order("mansione").order("nome"),
  ]);
  if (!p) { box.innerHTML = `<div class="se-vuoto">Evento non trovato.</div>`; return; }
  const adulti = Math.max((p.n_invitati || 0) - (p.n_bambini || 0), 0);
  const persone = (dip || []).filter((d) => d.attivo !== false);
  const titoli = [...new Set(persone.map((d) => (d.mansione || "").trim()).filter(Boolean))].sort();
  const ordineSez = (n) => (sezioni || []).find((s) => (s.nome || "").toLowerCase() === (n || "").toLowerCase())?.ordine ?? 999;

  // modello in memoria: righe del menu e fasi per ricetta
  const M = { righe: (righe || []).map((r) => ({ ...r, ricetta_nome: r.ricette?.nome || null })), tolte: [], fasi: {}, fasiTolte: [], chi: {} };
  await caricaFasi(M.righe.map((r) => r.ricetta_id).filter(Boolean));
  const { data: ass } = await sb().from("evento_assegnazioni").select("fase_id, dipendente_id").eq("preventivo_id", id);
  const { data: modelli } = await sb().from("modelli_buffet").select("id, nome").eq("azienda_id", az).order("ordine").order("id");
  const sezBuffet = (n) => /buffet|aperitiv|dolci|antipast/i.test(n || "");
  (ass || []).forEach((a) => { M.chi[a.fase_id] = a.dipendente_id; });
  let modificato = false;

  async function caricaFasi(ids) {
    const nuovi = [...new Set(ids)].filter((x) => !M.fasi[x]);
    if (!nuovi.length) return;
    const { data } = await sb().from("ricette_preparazione_fasi")
      .select("id, ricetta_id, ordine, nome_fase, tipo_fase, durata_min, temperatura, momento, giorni_prima, giorno_settimana, quando_note, ruolo")
      .in("ricetta_id", nuovi).order("ordine");
    nuovi.forEach((r) => { M.fasi[r] = []; });
    (data || []).forEach((f) => M.fasi[f.ricetta_id].push(f));
  }

  function disegna() {
    const gruppi = {};
    M.righe.forEach((r, i) => { (gruppi[r.sezione_menu || "Altro"] ||= []).push(i); });
    const nomiSez = Object.keys(gruppi).sort((a, b) => ordineSez(a) - ordineSez(b));
    box.innerHTML = `
      <a class="se-back" href="#/scheda-evento">← Tutti gli eventi</a>
      <h2 class="se-tit">${esc(p.titolo_evento || "Evento")}</h2>
      <div class="se-sub">${fdLungo(p.data_evento)}${p.ora_evento ? " · ore " + String(p.ora_evento).slice(0, 5) : ""} · ${adulti} adulti${p.n_bambini ? " + " + p.n_bambini + " bambini" : ""}</div>
      ${p.intolleranze ? `<div class="se-att">⚠ ${esc(p.intolleranze)}</div>` : ""}
      <div class="se-info">Le fasi si salvano sulla ricetta e restano per i prossimi eventi. Il nome di chi le fa vale per questo evento.</div>
      ${nomiSez.map((s) => `<div class="se-sez"><div class="se-sez-t">${esc(s)}</div>
        ${gruppi[s].map((i) => piatto(i)).join("")}
        <div class="se-add" data-sez="${esc(s)}"><input class="se-in" placeholder="＋ Aggiungi un piatto a ${esc(s)}: cerca nel ricettario"><div class="se-ris"></div></div>
      </div>`).join("")}
      <div class="se-barra"><span class="se-stato">${modificato ? "Modifiche da salvare" : "Tutto salvato"}</span><button class="se-salva" ${modificato ? "" : "disabled"}>💾 Salva e aggiorna il planning</button></div>`;
    collega();
  }

  function piatto(i) {
    const r = M.righe[i];
    const fasi = r.ricetta_id ? (M.fasi[r.ricetta_id] || []) : [];
    return `<div class="se-p" data-i="${i}">
      <div class="se-p1"><input class="se-in se-nome" data-k="nome_portata" value="${esc(r.nome_portata)}">
        <input class="se-in se-q" data-k="quantita" type="number" min="0" value="${esc(r.quantita ?? "")}" title="porzioni"><button class="se-x" data-togli="${i}" title="Togli dal menu">✕</button></div>
      ${r.ricetta_id ? `<div class="se-ric">Ricetta: <b>${esc(r.ricetta_nome || "#" + r.ricetta_id)}</b></div>`
        : `<div class="se-ric se-warn">⚠ Nessuna ricetta collegata<div class="se-add se-coll" data-i="${i}"><input class="se-in" placeholder="Collega una ricetta: cerca"><div class="se-ris"></div></div></div>`}
      ${r.ricetta_id ? `<div class="se-fasi">${fasi.map((f, j) => fase(r.ricetta_id, f, j)).join("") || `<div class="se-nofasi">Nessuna fase: aggiungi la prima.</div>`}
        <button class="se-piu" data-nuova="${r.ricetta_id}">＋ Aggiungi fase</button></div>` : ""}
    </div>`;
  }

  function fase(ric, f, j) {
    const q = quandoDi(f);
    const chiOpz = persone.filter((d) => !f.ruolo || (d.mansione || "").trim() === f.ruolo || M.chi[f.id] === d.id || f._id && M.chi[f._id] === d.id);
    const chiSel = M.chi[f.id || f._id] || "";
    return `<div class="se-f ${q === "srv" ? "srv" : ""}" data-ric="${ric}" data-j="${j}">
      <div class="se-f1"><input class="se-in" data-f="nome_fase" value="${esc(f.nome_fase)}" placeholder="Cosa si fa (es. cottura del riso)">
        <button class="se-x" data-via="1">✕</button></div>
      <div class="se-f2"><select class="se-in" data-f="quando">${OPZ_QUANDO.map(([v, t]) => `<option value="${v}" ${v === q ? "selected" : ""}>${t}</option>`).join("")}</select>
        <input class="se-in se-n" data-f="temperatura" type="number" value="${esc(f.temperatura ?? "")}" placeholder="°C">
        <input class="se-in se-n" data-f="durata_min" type="number" value="${esc(f.durata_min || "")}" placeholder="min"></div>
      <input class="se-in" data-f="quando_note" value="${esc(f.quando_note || "")}" placeholder="Note (es. notturna, 12-15 minuti, abbattimento negativo)">
      <div class="se-f3"><select class="se-in" data-f="ruolo"><option value="">Titolo: chiunque</option>${titoli.map((t) => `<option ${t === f.ruolo ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
        <select class="se-in" data-f="chi"><option value="">Chi la fa: da decidere</option>${chiOpz.map((d) => `<option value="${d.id}" ${d.id === chiSel ? "selected" : ""}>${esc([d.nome, d.cognome].filter(Boolean).join(" "))}${d.mansione ? " · " + esc(d.mansione) : ""}</option>`).join("")}</select></div>
    </div>`;
  }

  function segna() { modificato = true; const s = box.querySelector(".se-stato"), b = box.querySelector(".se-salva"); if (s) s.textContent = "Modifiche da salvare"; if (b) b.disabled = false; }

  function collega() {
    box.querySelectorAll(".se-p1 [data-k]").forEach((el) => el.addEventListener("input", () => {
      const r = M.righe[Number(el.closest(".se-p").dataset.i)];
      r[el.dataset.k] = el.dataset.k === "quantita" ? (el.value === "" ? null : Number(el.value)) : el.value; segna();
    }));
    box.querySelectorAll("[data-togli]").forEach((b) => b.addEventListener("click", () => {
      const r = M.righe[Number(b.dataset.togli)];
      if (!confirm("Tolgo «" + (r.nome_portata || "") + "» dal menu di questo evento?")) return;
      if (r.id) M.tolte.push(r.id);
      M.righe.splice(Number(b.dataset.togli), 1); modificato = true; disegna();
    }));
    box.querySelectorAll(".se-f").forEach((el) => {
      const f = M.fasi[el.dataset.ric][Number(el.dataset.j)];
      el.querySelectorAll("[data-f]").forEach((c) => c.addEventListener("change", () => {
        const k = c.dataset.f;
        if (k === "quando") { applicaQuando(f, c.value); el.classList.toggle("srv", c.value === "srv"); }
        else if (k === "chi") M.chi[f.id || f._id] = c.value || null;
        else if (k === "temperatura" || k === "durata_min") f[k] = c.value === "" ? null : Number(c.value);
        else f[k] = c.value.trim() || null;
        f._mod = true; segna();
        if (k === "ruolo") disegna(); // il titolo filtra le persone
      }));
      el.querySelector("[data-via]").addEventListener("click", () => {
        if (!confirm("Tolgo la fase «" + (f.nome_fase || "") + "» da questa ricetta? Vale anche per i prossimi eventi.")) return;
        if (f.id) M.fasiTolte.push(f.id);
        M.fasi[el.dataset.ric].splice(Number(el.dataset.j), 1); modificato = true; disegna();
      });
    });
    box.querySelectorAll("[data-nuova]").forEach((b) => b.addEventListener("click", () => {
      const lista = M.fasi[b.dataset.nuova] ||= [];
      lista.push({ _id: "n" + Date.now(), ricetta_id: Number(b.dataset.nuova), nome_fase: "", momento: "preparazione", giorni_prima: null, giorno_settimana: null, _mod: true });
      modificato = true; disegna();
      const ult = box.querySelector(`.se-f[data-ric="${b.dataset.nuova}"]:last-of-type input`); ult?.focus();
    }));
    box.querySelectorAll(".se-add").forEach((w) => {
      const inp = w.querySelector("input"), ris = w.querySelector(".se-ris");
      let t;
      inp.addEventListener("input", () => {
        clearTimeout(t);
        const q = inp.value.trim();
        if (q.length < 2) { ris.innerHTML = ""; return; }
        t = setTimeout(async () => {
          const { data } = await sb().from("ricette").select("id, nome").eq("azienda_id", az).eq("attivo", true)
            .is("lavorazione_prodotto_id", null).ilike("nome", "%" + q + "%").order("nome").limit(12);
          ris.innerHTML = (data || []).map((x) => `<button data-id="${x.id}" data-nome="${esc(x.nome)}">${esc(x.nome)}</button>`).join("")
            || `<div class="se-nofasi">Nessuna ricetta trovata. Puoi crearla con «Nuova ricetta», anche a voce.</div>`;
          ris.querySelectorAll("button").forEach((b) => b.addEventListener("click", async () => {
            const ricId = Number(b.dataset.id);
            if (w.classList.contains("se-coll")) {
              const r = M.righe[Number(w.dataset.i)];
              r.ricetta_id = ricId; r.ricetta_nome = b.dataset.nome; r._mod = true;
            } else {
              const sez = w.dataset.sez;
              const bimbi = (sezioni || []).find((s) => (s.nome || "").toLowerCase() === sez.toLowerCase())?.per_bambini;
              M.righe.push({ sezione_menu: sez, nome_portata: b.dataset.nome, ricetta_id: ricId, ricetta_nome: b.dataset.nome,
                quantita: bimbi ? (p.n_bambini || 0) : adulti, _nuova: true });
            }
            await caricaFasi([ricId]);
            modificato = true; disegna();
          }));
        }, 250);
      });
    });
    box.querySelector(".se-salva")?.addEventListener("click", salva);
  }

  async function salva() {
    const btn = box.querySelector(".se-salva"); btn.disabled = true; btn.textContent = "Salvo…";
    try {
      // 1. menu dell'evento
      if (M.tolte.length) { const { error } = await sb().from("preventivi_righe").delete().in("id", M.tolte); if (error) throw error; M.tolte = []; }
      for (const r of M.righe) {
        const val = { sezione_menu: r.sezione_menu, nome_portata: r.nome_portata, ricetta_id: r.ricetta_id || null, quantita: r.quantita, ricetta_placeholder: !r.ricetta_id };
        if (r._nuova) {
          const { data, error } = await sb().from("preventivi_righe").insert({ ...val, preventivo_id: id, azienda_id: az, sede_uuid: p.sede_uuid }).select("id").single();
          if (error) throw error; r.id = data.id; r._nuova = false;
        } else {
          const { error } = await sb().from("preventivi_righe").update(val).eq("id", r.id); if (error) throw error;
        }
      }
      // 2. fasi sulle ricette (restano per i prossimi eventi)
      if (M.fasiTolte.length) { const { error } = await sb().from("ricette_preparazione_fasi").delete().in("id", M.fasiTolte); if (error) throw error; M.fasiTolte = []; }
      for (const [ric, lista] of Object.entries(M.fasi)) {
        for (let j = 0; j < lista.length; j++) {
          const f = lista[j];
          const val = { ordine: j + 1, nome_fase: f.nome_fase || "Fase " + (j + 1), durata_min: f.durata_min || 0, temperatura: f.temperatura ?? null,
            momento: f.momento || "preparazione", giorni_prima: f.giorni_prima, giorno_settimana: f.giorno_settimana,
            quando_note: f.quando_note || null, ruolo: f.ruolo || null };
          if (!f.id) {
            const { data, error } = await sb().from("ricette_preparazione_fasi").insert({ ...val, azienda_id: az, ricetta_id: Number(ric),
              tipo_fase: f.temperatura ? "cottura" : "preparazione", lavoro_umano_min: 0 }).select("id").single();
            if (error) throw error;
            if (f._id && M.chi[f._id] !== undefined) { M.chi[data.id] = M.chi[f._id]; delete M.chi[f._id]; }
            f.id = data.id;
          } else if (f._mod || f.ordine !== j + 1) {
            const { error } = await sb().from("ricette_preparazione_fasi").update(val).eq("id", f.id); if (error) throw error;
          }
          f.ordine = j + 1; f._mod = false;
        }
      }
      // 3. chi fa cosa in questo evento
      const su = Object.entries(M.chi).filter(([k, v]) => v && /^\d+$/.test(k)).map(([k, v]) => ({ azienda_id: az, preventivo_id: id, fase_id: Number(k), dipendente_id: v }));
      const giu = Object.entries(M.chi).filter(([k, v]) => !v && /^\d+$/.test(k)).map(([k]) => Number(k));
      if (su.length) { const { error } = await sb().from("evento_assegnazioni").upsert(su, { onConflict: "preventivo_id,fase_id" }); if (error) throw error; }
      if (giu.length) await sb().from("evento_assegnazioni").delete().eq("preventivo_id", id).in("fase_id", giu);
      // 4. lotti e planning
      const { data: s, error } = await sb().rpc("evento_sincronizza_produzione", { p_preventivo: id });
      if (error) throw error;
      modificato = false; disegna();
      const st = box.querySelector(".se-stato");
      st.textContent = "✓ Salvato · planning aggiornato" + (s?.nuovi ? " · " + s.nuovi + " piatti nuovi" : "") + (s?.tolti ? " · " + s.tolti + " tolti" : "");
    } catch (e) {
      btn.disabled = false; btn.textContent = "💾 Salva e aggiorna il planning";
      alert("Non salvato: " + (e.message || e));
    }
  }

  disegna();
}

function stile() {
  return `<style>
  .se{max-width:760px;margin:0 auto;padding:16px 14px 90px;}
  .se-tit{margin:0;font-size:22px;font-weight:800;}
  .se-sub{font-size:13.5px;color:#64748b;margin:3px 0 10px;text-transform:none;}
  .se-back{font-size:13px;color:#0E5A7A;font-weight:700;text-decoration:none;}
  .se-att{background:#fef2f2;color:#b91c1c;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:700;margin-bottom:8px;}
  .se-info{font-size:12.5px;color:#475569;background:#f1f5f9;border-radius:10px;padding:8px 10px;}
  .se-ev{display:block;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-top:8px;text-decoration:none;color:inherit;}
  .se-ev b{display:block;font-size:16px;} .se-ev span{font-size:13px;color:#64748b;}
  .se-sez{margin-top:18px;} .se-sez-t{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#0E5A7A;margin-bottom:6px;}
  .se-p{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin-bottom:10px;}
  .se-p1,.se-f1,.se-f2,.se-f3{display:flex;gap:6px;align-items:center;}
  .se-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px;font-size:14px;font-family:inherit;background:#fff;min-width:0;}
  .se-nome{font-weight:700;font-size:15px;} .se-q{width:70px;flex:none;} .se-n{width:70px;flex:none;}
  .se-x{flex:none;border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;cursor:pointer;color:#64748b;}
  .se-ric{font-size:12.5px;color:#475569;margin:6px 0;} .se-warn{color:#b45309;font-weight:700;}
  .se-fasi{border-top:1px dashed #e2e8f0;padding-top:6px;}
  .se-f{background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0E5A7A;border-radius:10px;padding:7px;margin-top:6px;display:grid;gap:5px;}
  .se-f.srv{border-left-color:#c2410c;background:#fff7ed;}
  .se-piu{margin-top:6px;border:0;background:#e0f2fe;color:#0E5A7A;border-radius:9px;padding:8px 12px;font-weight:700;cursor:pointer;font-size:13px;}
  .se-nofasi{font-size:12.5px;color:#64748b;padding:4px 0;}
  .se-add{margin-top:4px;} .se-ris button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:9px;font-size:14px;cursor:pointer;}
  .se-barra{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #e2e8f0;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));display:flex;gap:10px;align-items:center;justify-content:flex-end;z-index:50;}
  .se-stato{font-size:12.5px;color:#64748b;margin-right:auto;padding-left:60px;}
  .se-salva{border:0;border-radius:11px;padding:11px 14px;background:#0E5A7A;color:#fff;font-weight:800;cursor:pointer;}
  .se-salva:disabled{opacity:.45;}
  .se-vuoto{color:#64748b;text-align:center;padding:24px;}
  </style>`;
}
