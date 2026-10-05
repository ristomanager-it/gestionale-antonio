// js/views/modelli-buffet.js
// 🥂 Modelli buffet: come si fa ogni tipo di buffet (matrimonio, compleanno, medio, aperitivo...).
// Una riga per piatto: quantita' in % sugli invitati (150% = 1,5 pezzi a persona), fasi e quando,
// parametri, titolo di chi lo fa. Si salva da solo mentre scrivi. Nella Scheda evento il pulsante
// "Usa modello" riempie il buffet con le quantita' calcolate sugli ospiti.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  app.innerHTML = stile() + `<div class="mb"><div class="mb-vuoto">Un attimo…</div></div>`;
  const box = app.querySelector(".mb");
  let modelli = [], voci = [], attivo = null, ospiti = 100;
  const { data: dip } = await sb().from("dipendenti").select("mansione, attivo").eq("azienda_id", az);
  const titoli = [...new Set((dip || []).filter((d) => d.attivo !== false).map((d) => (d.mansione || "").trim()).filter(Boolean))].sort();

  async function caricaModelli() {
    const { data } = await sb().from("modelli_buffet").select("id, nome, ordine").eq("azienda_id", az).order("ordine").order("id");
    modelli = data || [];
    if (!attivo || !modelli.some((m) => m.id === attivo)) attivo = modelli[0]?.id || null;
  }
  async function caricaVoci() {
    if (!attivo) { voci = []; return; }
    const { data } = await sb().from("modelli_buffet_voci").select("id, ordine, angolo, piatto, ricetta_id, percentuale, fasi, parametri, titolo, ricette(nome)")
      .eq("modello_id", attivo).order("ordine").order("id");
    voci = data || [];
  }

  function stato(t) { const s = box.querySelector(".mb-stato"); if (s) s.textContent = t; }
  const pz = (perc) => perc ? Math.ceil(Number(perc) * ospiti / 100) : null;

  function disegna() {
    const m = modelli.find((x) => x.id === attivo);
    box.innerHTML = `
      <h2 class="mb-tit">🥂 Modelli buffet</h2>
      <div class="mb-sub">Come fai ogni tipo di buffet. Si salva da solo mentre scrivi; nella scheda di un evento lo applichi con «Usa modello».</div>
      <div class="mb-tabs">${modelli.map((x) => `<button data-m="${x.id}" class="${x.id === attivo ? "on" : ""}">${esc(x.nome)}</button>`).join("")}
        <button data-nuovo="1" class="mb-nuovo">＋ Nuovo</button></div>
      ${m ? `
      <div class="mb-head">
        <input class="mb-in mb-nome" value="${esc(m.nome)}" data-rinomina="1">
        <button class="mb-x" data-elimina="1" title="Elimina modello">🗑</button>
      </div>
      <div class="mb-calc">Calcola su <input class="mb-in mb-osp" type="number" min="1" value="${ospiti}"> invitati</div>
      <div class="mb-voci">${voci.map((v, i) => voce(v, i)).join("") || `<div class="mb-vuoto">Nessun piatto: aggiungi il primo.</div>`}</div>
      <button class="mb-add">＋ Aggiungi piatto</button>
      ${voci.length ? `<div class="mb-tot">Totale su ${ospiti} invitati: <b>${voci.reduce((s, v) => s + (pz(v.percentuale) || 0), 0)} pezzi</b></div>` : ""}
      ` : `<div class="mb-vuoto">Crea il primo modello con «＋ Nuovo».</div>`}
      <div class="mb-stato">Tutto salvato</div>`;
    collega();
  }

  function voce(v, i) {
    const n = pz(v.percentuale);
    return `<div class="mb-v" data-i="${i}">
      <div class="mb-r"><input class="mb-in mb-piatto" data-k="piatto" value="${esc(v.piatto)}" placeholder="Piatto (es. supplì)"><button class="mb-x" data-via="1">✕</button></div>
      <div class="mb-r">
        <div class="mb-perc"><input class="mb-in" data-k="percentuale" type="number" min="0" step="5" value="${esc(v.percentuale ?? "")}" placeholder="%"><span>% invitati</span></div>
        <div class="mb-pz">${n != null ? "= <b>" + n + " pz</b> su " + ospiti : ""}</div>
      </div>
      <textarea class="mb-in" data-k="fasi" rows="2" placeholder="Fasi e quando (es. cottura riso 1 giorno prima → formatura → frittura al servizio)">${esc(v.fasi || "")}</textarea>
      <div class="mb-r">
        <input class="mb-in" data-k="parametri" value="${esc(v.parametri || "")}" placeholder="Parametri (es. frittura 175 °C 3 min)">
        <select class="mb-in mb-tit2" data-k="titolo"><option value="">Titolo</option>${titoli.map((t) => `<option ${t === v.titolo ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
      </div>
      <div class="mb-ric">${v.ricetta_id ? `Ricetta: <b>${esc(v.ricette?.nome || "#" + v.ricetta_id)}</b> <a href="#" data-scollega="1">scollega</a>`
        : `<input class="mb-in mb-cerca" placeholder="Collega la ricetta (serve per lotti e spesa): cerca"><div class="mb-ris"></div>`}</div>
    </div>`;
  }

  const timers = {};
  function salvaCampo(v, campi) {
    clearTimeout(timers[v.id]);
    stato("Salvo…");
    timers[v.id] = setTimeout(async () => {
      const { error } = await sb().from("modelli_buffet_voci").update({ ...campi, updated_at: new Date().toISOString() }).eq("id", v.id);
      stato(error ? "Non salvato: " + error.message : "✓ Salvato");
    }, 500);
  }

  function collega() {
    box.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", async () => { attivo = Number(b.dataset.m); await caricaVoci(); disegna(); }));
    box.querySelector("[data-nuovo]")?.addEventListener("click", async () => {
      const nome = prompt("Nome del modello (es. Buffet comunione):");
      if (!nome) return;
      const { data, error } = await sb().from("modelli_buffet").insert({ azienda_id: az, nome: nome.trim(), ordine: 100 }).select("id").single();
      if (error) { alert(error.message); return; }
      attivo = data.id; await caricaModelli(); await caricaVoci(); disegna();
    });
    box.querySelector("[data-rinomina]")?.addEventListener("change", async (e) => {
      const nome = e.target.value.trim(); if (!nome) return;
      await sb().from("modelli_buffet").update({ nome }).eq("id", attivo);
      modelli.find((x) => x.id === attivo).nome = nome; stato("✓ Salvato");
      box.querySelector(`[data-m="${attivo}"]`).textContent = nome;
    });
    box.querySelector("[data-elimina]")?.addEventListener("click", async () => {
      const m = modelli.find((x) => x.id === attivo);
      if (!confirm("Elimino il modello «" + m.nome + "» con tutti i suoi piatti?")) return;
      await sb().from("modelli_buffet").delete().eq("id", attivo);
      attivo = null; await caricaModelli(); await caricaVoci(); disegna();
    });
    box.querySelector(".mb-osp")?.addEventListener("input", (e) => {
      ospiti = Math.max(1, Number(e.target.value) || 1);
      box.querySelectorAll(".mb-v").forEach((el) => {
        const n = pz(voci[Number(el.dataset.i)].percentuale);
        el.querySelector(".mb-pz").innerHTML = n != null ? "= <b>" + n + " pz</b> su " + ospiti : "";
      });
      const t = box.querySelector(".mb-tot"); if (t) t.innerHTML = `Totale su ${ospiti} invitati: <b>${voci.reduce((s, v) => s + (pz(v.percentuale) || 0), 0)} pezzi</b>`;
    });
    box.querySelector(".mb-add")?.addEventListener("click", async () => {
      const { data, error } = await sb().from("modelli_buffet_voci").insert({ azienda_id: az, modello_id: attivo, ordine: voci.length + 1, piatto: "" })
        .select("id, ordine, piatto, ricetta_id, percentuale, fasi, parametri, titolo").single();
      if (error) { alert(error.message); return; }
      voci.push(data); disegna();
      box.querySelector(`.mb-v[data-i="${voci.length - 1}"] .mb-piatto`)?.focus();
    });
    box.querySelectorAll(".mb-v").forEach((el) => {
      const v = voci[Number(el.dataset.i)];
      el.querySelectorAll("[data-k]").forEach((c) => c.addEventListener(c.tagName === "SELECT" ? "change" : "input", () => {
        const k = c.dataset.k;
        v[k] = k === "percentuale" ? (c.value === "" ? null : Number(c.value)) : c.value;
        if (k === "percentuale") {
          const n = pz(v.percentuale);
          el.querySelector(".mb-pz").innerHTML = n != null ? "= <b>" + n + " pz</b> su " + ospiti : "";
          const t = box.querySelector(".mb-tot"); if (t) t.innerHTML = `Totale su ${ospiti} invitati: <b>${voci.reduce((s, x) => s + (pz(x.percentuale) || 0), 0)} pezzi</b>`;
        }
        salvaCampo(v, { [k]: k === "percentuale" ? v.percentuale : (v[k] || null) });
      }));
      el.querySelector("[data-via]").addEventListener("click", async () => {
        if (!confirm("Tolgo «" + (v.piatto || "questo piatto") + "» dal modello?")) return;
        await sb().from("modelli_buffet_voci").delete().eq("id", v.id);
        voci.splice(Number(el.dataset.i), 1); disegna(); stato("✓ Salvato");
      });
      el.querySelector("[data-scollega]")?.addEventListener("click", async (e) => {
        e.preventDefault();
        await sb().from("modelli_buffet_voci").update({ ricetta_id: null }).eq("id", v.id);
        v.ricetta_id = null; v.ricette = null; disegna(); stato("✓ Salvato");
      });
      const cerca = el.querySelector(".mb-cerca");
      if (cerca) {
        const ris = el.querySelector(".mb-ris"); let t;
        cerca.addEventListener("input", () => {
          clearTimeout(t); const q = cerca.value.trim();
          if (q.length < 2) { ris.innerHTML = ""; return; }
          t = setTimeout(async () => {
            const { data } = await sb().from("ricette").select("id, nome").eq("azienda_id", az).eq("attivo", true)
              .is("lavorazione_prodotto_id", null).ilike("nome", "%" + q + "%").order("nome").limit(10);
            ris.innerHTML = (data || []).map((x) => `<button data-id="${x.id}" data-nome="${esc(x.nome)}">${esc(x.nome)}</button>`).join("")
              || `<div class="mb-vuoto">Nessuna ricetta: puoi crearla con «Nuova ricetta», anche a voce.</div>`;
            ris.querySelectorAll("button").forEach((b) => b.addEventListener("click", async () => {
              await sb().from("modelli_buffet_voci").update({ ricetta_id: Number(b.dataset.id) }).eq("id", v.id);
              v.ricetta_id = Number(b.dataset.id); v.ricette = { nome: b.dataset.nome };
              if (!v.piatto) v.piatto = b.dataset.nome, await sb().from("modelli_buffet_voci").update({ piatto: v.piatto }).eq("id", v.id);
              disegna(); stato("✓ Salvato");
            }));
          }, 250);
        });
      }
    });
  }

  await caricaModelli(); await caricaVoci(); disegna();
}

function stile() {
  return `<style>
  .mb{max-width:760px;margin:0 auto;padding:16px 14px 60px;}
  .mb-tit{margin:0;font-size:22px;font-weight:800;}
  .mb-sub{font-size:13.5px;color:#64748b;margin:3px 0 12px;}
  .mb-tabs{display:flex;gap:6px;flex-wrap:wrap;}
  .mb-tabs button{border:1.5px solid #e2e8f0;background:#fff;border-radius:20px;padding:8px 12px;font-weight:700;cursor:pointer;font-size:13px;}
  .mb-tabs button.on{background:#0E5A7A;color:#fff;border-color:#0E5A7A;} .mb-tabs .mb-nuovo{color:#0E5A7A;border-style:dashed;}
  .mb-head{display:flex;gap:6px;margin-top:14px;}
  .mb-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:9px;font-size:14px;font-family:inherit;background:#fff;min-width:0;}
  .mb-nome{font-size:17px;font-weight:800;}
  .mb-x{flex:none;border:0;background:#f1f5f9;border-radius:8px;width:38px;cursor:pointer;color:#64748b;font-size:15px;}
  .mb-calc{font-size:13.5px;color:#475569;margin:10px 0;display:flex;align-items:center;gap:6px;} .mb-osp{width:90px;}
  .mb-v{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin-bottom:10px;display:grid;gap:6px;}
  .mb-r{display:flex;gap:6px;align-items:center;}
  .mb-piatto{font-weight:700;font-size:15px;}
  .mb-perc{display:flex;align-items:center;gap:5px;flex:none;} .mb-perc input{width:80px;} .mb-perc span{font-size:12.5px;color:#64748b;white-space:nowrap;}
  .mb-pz{font-size:13px;color:#0E5A7A;flex:1;text-align:right;}
  .mb-tit2{flex:none;width:42%;}
  .mb-ric{font-size:12.5px;color:#475569;} .mb-ric a{color:#0E5A7A;margin-left:6px;}
  .mb-ris button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:9px;font-size:14px;cursor:pointer;}
  .mb-add{width:100%;border:1.5px dashed #0E5A7A;background:#f0f9ff;color:#0E5A7A;border-radius:12px;padding:12px;font-weight:800;cursor:pointer;}
  .mb-tot{text-align:right;font-size:13.5px;margin-top:10px;}
  .mb-stato{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));background:#0f172a;color:#fff;border-radius:20px;padding:6px 12px;font-size:12px;opacity:.85;}
  .mb-vuoto{color:#64748b;text-align:center;padding:16px;font-size:13.5px;}
  </style>`;
}
