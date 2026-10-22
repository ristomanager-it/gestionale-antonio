// js/utils/cartellini-lotto.js
// 📷 Cartellini della materia prima dentro la lavorazione (tracciabilita' HACCP).
// Si fotografano i cartellini della carne o della merce usata (anche piu' insieme): Tony legge prodotto,
// produttore, lotto, scadenza, peso e provenienza; ogni cartellino diventa un lotto fornitore con la foto
// ed e' legato a QUESTA lavorazione come materia prima. Avvisa se la scadenza del prodotto supera quella
// della materia prima.
const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const URL_EF = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-etichetta-lotto";
const fd = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("it-IT") : "—");
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };

async function riduci(file) {
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.82));
  const b64 = c.toDataURL("image/jpeg", 0.82).split(",")[1];
  return { blob, b64 };
}

export function montaCartellini(box, { lotto }) {
  if (!box) return;
  const az = window.state?.azienda?.id;
  let letti = []; // cartellini letti da confermare
  box.innerHTML = `<style>${stile()}</style><div class="ct">
    <div class="ct-tit">📷 Cartellini della materia prima</div>
    <div class="ct-sub">Fotografa i cartellini della merce che usi (carne, formaggi…) o le etichette delle nostre preparazioni (ragù, besciamella…): lotto, scadenza, peso e provenienza restano legati a questa lavorazione.</div>
    <label class="ct-foto">📷 Fotografa i cartellini<input type="file" accept="image/*" multiple hidden></label>
    <label class="ct-grp"><input type="checkbox" id="ct-stesso"> Le foto sono dello stesso prodotto (il nome da un lato, la scadenza dall'altro)</label>
    <div class="ct-schede"></div><div class="ct-lista"></div></div>`;
  const elSchede = box.querySelector(".ct-schede"), elLista = box.querySelector(".ct-lista");

  async function rigaLotto() {
    const l = lotto?.();
    if (!l?.lotto_uuid) return null;
    const { data } = await sb().from("produzione_lotti").select("id, ricetta_id, data_scadenza, codice_lotto, sede_uuid").eq("lotto_uuid", l.lotto_uuid).maybeSingle();
    return data || null;
  }

  async function carica() {
    const r = await rigaLotto();
    if (!r) { elLista.innerHTML = `<div class="ct-nota">I cartellini si legano quando la lavorazione è aperta (prima firma o "Registra").</div>`; return; }
    const { data } = await sb().from("produzione_lotto_ingredienti")
      .select("id, quantita, unita_misura, lotto_materia_prima, scadenza_materia_prima, lotto_fornitore_id, lotto_interno_id, scelto_auto, lotti_fornitore(prodotto_letto, produttore, lotto, data_scadenza, quantita, unita, foto_url, foto_urls, letto_da), prodotti(nome)")
      .eq("lotto_id", r.id).or("lotto_fornitore_id.not.is.null,and(lotto_interno_id.not.is.null,scelto_auto.eq.false)");
    const righe = data || [];
    if (!righe.length) { elLista.innerHTML = ""; return; }
    const kg = righe.reduce((t, x) => t + (x.lotti_fornitore?.unita === "kg" || !x.lotti_fornitore?.unita ? Number(x.lotti_fornitore?.quantita) || 0 : 0), 0);
    const scadMin = righe.map((x) => x.lotti_fornitore?.data_scadenza || x.scadenza_materia_prima).filter(Boolean).sort()[0];
    const oltre = scadMin && r.data_scadenza && r.data_scadenza > scadMin;
    elLista.innerHTML = `<div class="ct-tot">Materia prima legata: ${righe.length} ${righe.length === 1 ? "cartellino" : "cartellini"}${kg ? ` · <b>${kg.toLocaleString("it-IT", { maximumFractionDigits: 3 })} kg</b>` : ""}${scadMin ? ` · scade il ${fd(scadMin)}` : ""}</div>
      ${oltre ? `<div class="ct-avviso">⚠ La scadenza di questa lavorazione (${fd(r.data_scadenza)}) supera quella della materia prima (${fd(scadMin)}). Controlla la conservazione scelta.</div>` : ""}
      ${righe.map((x) => { const f = x.lotti_fornitore || {}; const o = f.letto_da?.origine;
        if (!x.lotto_fornitore_id) return `<div class="ct-riga"><div class="ct-noimg">🏷</div><div><b>${esc(x.prodotti?.nome || "Nostra produzione")}</b>
          <div class="ct-r3">nostro lotto <b>${esc(x.lotto_materia_prima || "—")}</b> · scade ${fd(x.scadenza_materia_prima)}</div></div></div>`;
        return `<div class="ct-riga">${(f.foto_urls?.length ? f.foto_urls : (f.foto_url ? [f.foto_url] : [])).map((u) => `<a href="${esc(u)}" target="_blank"><img src="${esc(u)}" alt=""></a>`).join("") || `<div class="ct-noimg">📄</div>`}
          <div><b>${esc(x.prodotti?.nome || f.prodotto_letto || "Materia prima")}</b>
          <div class="ct-r3">lotto <b>${esc(f.lotto || x.lotto_materia_prima || "—")}</b> · scade ${fd(f.data_scadenza || x.scadenza_materia_prima)}${f.quantita ? ` · ${esc(f.quantita)} ${esc(f.unita || "kg")}` : ""}</div>
          <div class="ct-r3">${esc([f.produttore, o].filter(Boolean).join(" · "))}</div></div></div>`; }).join("")}`;
  }

  box.querySelector("input[type=file]").addEventListener("change", async (e) => {
    const files = [...e.target.files].slice(0, 8); e.target.value = "";
    if (!files.length) return;
    const r = await rigaLotto();
    if (!r) { alert("Prima apri la lavorazione (firma la prima fase o premi Registra), poi fotografa i cartellini."); return; }
    elSchede.innerHTML = `<div class="ct-nota">🔎 Tony legge ${files.length} ${files.length === 1 ? "cartellino" : "cartellini"}…</div>`;
    const { data: ing } = await sb().from("ricetta_ingredienti").select("prodotto_id, nome_prodotto").eq("ricetta_id", r.ricetta_id).not("prodotto_id", "is", null);
    const { data: { session } } = await sb().auth.getSession();
    // una foto = un cartellino; con "stesso prodotto" tutte le foto sono lette insieme (nome e scadenza possono stare su lati diversi)
    const gruppo = box.querySelector("#ct-stesso")?.checked && files.length > 1;
    const leggiGruppo = async (fs) => {
      try {
        const rid = await Promise.all(fs.map((f) => riduci(f)));
        const ups = rid.map(({ blob }) => {
          const percorso = `lotti-fornitore/${az}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
          return sb().storage.from("media-aziende").upload(percorso, blob, { upsert: false, cacheControl: "31536000", contentType: "image/jpeg" })
            .then(({ error }) => error ? "" : sb().storage.from("media-aziende").getPublicUrl(percorso).data?.publicUrl || "").catch(() => "");
        });
        const res = await fetch(URL_EF, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.access_token || "") },
          body: JSON.stringify({ azienda_id: az, immagini: rid.map((x) => ({ base64: x.b64, mime: "image/jpeg" })) }) });
        const d = await res.json();
        // etichetta NOSTRA (ragu', besciamella... fatti da noi): il lotto e' un lotto interno, si lega quello
        let interno = null;
        const cod = String(d.letto?.lotto || "").trim();
        if (cod.length >= 4) {
          const { data: li } = await sb().from("produzione_lotti").select("id, codice_lotto, data_scadenza, ricetta_id, ricette(nome)")
            .eq("azienda_id", az).ilike("codice_lotto", cod).neq("id", r.id).limit(1);
          if (li?.[0]) interno = { ...li[0], nome: li[0].ricette?.nome || "" };
        }
        return { letto: d.letto || {}, candidati: d.candidati || [], interno, foto_url: await up, errore: res.ok ? "" : (d.errore || "non letto") };
      } catch (err) { return { letto: {}, candidati: [], foto_url: "", errore: String(err?.message || err) }; }
    }));
    disegnaSchede(r, ing || []);
  });

  function disegnaSchede(r, ing) {
    if (!letti.length) { elSchede.innerHTML = ""; return; }
    elSchede.innerHTML = letti.map((c, i) => {
      const L = c.letto || {};
      if (c.interno) return `<div class="ct-scheda ct-interno" data-i="${i}">
        ${c.foto_url ? `<img class="ct-mini" src="${esc(c.foto_url)}" alt="">` : ""}
        <div><b>🏷 Nostra produzione: ${esc(c.interno.nome || L.prodotto || "")}</b></div>
        <div class="ct-r3">lotto <b>${esc(c.interno.codice_lotto)}</b> · scade ${fd(c.interno.data_scadenza)}</div>
        <div class="ct-az"><button type="button" class="ct-sec" data-scarta="${i}">Scarta</button><button type="button" class="ct-pri" data-salva="${i}">💾 Lega alla lavorazione</button></div>
      </div>`;
      // prima gli ingredienti della ricetta (di solito e' uno di quelli), poi i prodotti simili trovati da Tony
      const opz = [...ing.map((x) => ({ id: x.prodotto_id, nome: x.nome_prodotto, ric: true })), ...c.candidati.filter((x) => !ing.some((y) => y.prodotto_id === x.id))];
      const pre = opz.find((o) => c.candidati[0] && o.id === c.candidati[0].id) || (ing.length === 1 ? opz[0] : null);
      return `<div class="ct-scheda" data-i="${i}">
        ${c.foto_url ? `<img class="ct-mini" src="${esc(c.foto_url)}" alt="">` : ""}
        ${c.errore ? `<div class="ct-avviso">Lettura non riuscita: compila a mano.</div>` : `<div class="ct-r3">Letto: <b>${esc(L.prodotto || "—")}</b>${L.produttore ? " · " + esc(L.produttore) : ""}</div>`}
        ${L.dubbi ? `<div class="ct-r3" style="color:#b45309">⚠ ${esc(L.dubbi)}</div>` : ""}
        <label>Prodotto<select class="ct-in" data-k="prodotto">${opz.map((o) => `<option value="${o.id}" ${pre && o.id === pre.id ? "selected" : ""}>${o.ric ? "★ " : ""}${esc(o.nome)}</option>`).join("")}<option value="" ${pre ? "" : "selected"}>— scegli —</option></select></label>
        <div class="ct-g3"><label>Lotto<input class="ct-in" data-k="lotto" value="${esc(L.lotto || "")}"></label>
          <label>Scadenza<input class="ct-in" type="date" data-k="scadenza" value="${esc(L.scadenza || "")}"></label>
          <label>Peso kg<input class="ct-in" inputmode="decimal" data-k="peso" value="${esc(L.peso ?? "")}"></label></div>
        <label>Provenienza (nato, allevato, macellato, sezionato in · bollo CE)<input class="ct-in" data-k="origine" value="${esc(L.origine || "")}"></label>
        <div class="ct-az"><button type="button" class="ct-sec" data-scarta="${i}">Scarta</button><button type="button" class="ct-pri" data-salva="${i}">💾 Lega alla lavorazione</button></div>
      </div>`;
    }).join("") + (letti.length > 1 ? `<button type="button" class="ct-pri ct-tutti">💾 Lega tutti (${letti.length})</button>` : "");
    elSchede.querySelectorAll("[data-scarta]").forEach((b) => b.addEventListener("click", () => { letti.splice(Number(b.dataset.scarta), 1); disegnaSchede(r, ing); }));
    elSchede.querySelectorAll("[data-salva]").forEach((b) => b.addEventListener("click", async () => {
      const i = Number(b.dataset.salva);
      b.disabled = true; b.textContent = "Salvo…";
      const ok = await salva(r, i);
      if (ok) { letti.splice(i, 1); disegnaSchede(r, ing); await carica(); } else { b.disabled = false; b.textContent = "💾 Lega alla lavorazione"; }
    }));
    elSchede.querySelector(".ct-tutti")?.addEventListener("click", async (ev) => {
      ev.target.disabled = true; ev.target.textContent = "Salvo…";
      for (let i = letti.length - 1; i >= 0; i--) { if (await salva(r, i)) letti.splice(i, 1); }
      disegnaSchede(r, ing); await carica();
    });
  }

  // lotto interno (semilavorato fatto da noi): si lega alla riga del suo ingrediente nella ricetta
  async function salvaInterno(r, c) {
    const li = c.interno;
    const { data: prod } = await sb().from("prodotti").select("id").eq("azienda_id", az).eq("ricetta_id", li.ricetta_id).limit(5);
    const pids = (prod || []).map((x) => x.id);
    const { data: righe } = pids.length ? await sb().from("produzione_lotto_ingredienti").select("id, lotto_interno_id, scelto_auto, prodotto_id").eq("lotto_id", r.id).in("prodotto_id", pids) : { data: [] };
    const riga = (righe || []).find((x) => !x.lotto_interno_id) || (righe || []).find((x) => x.scelto_auto) || null;
    const val = { lotto_interno_id: li.id, lotto_materia_prima: li.codice_lotto, scadenza_materia_prima: li.data_scadenza, scelto_auto: false };
    const { error } = riga
      ? await sb().from("produzione_lotto_ingredienti").update(val).eq("id", riga.id)
      : await sb().from("produzione_lotto_ingredienti").insert({ lotto_id: r.id, ricetta_id: r.ricetta_id, prodotto_id: pids[0] || null, azienda_id: az, ...val });
    if (error) { alert("Non legato: " + error.message); return false; }
    return true;
  }

  async function salva(r, i) {
    if (letti[i]?.interno) return salvaInterno(r, letti[i]);
    const el = elSchede.querySelector(`.ct-scheda[data-i="${i}"]`);
    const v = (k) => el.querySelector(`[data-k="${k}"]`).value.trim();
    const pid = Number(v("prodotto")) || null;
    if (!pid) { alert("Scegli il prodotto del cartellino."); return false; }
    if (!v("lotto")) { alert("Manca il lotto del cartellino."); return false; }
    const c = letti[i];
    const letto = { ...(c.letto || {}), origine: v("origine") || null, fonte: "cartellino in lavorazione" };
    const { data: lf, error } = await sb().from("lotti_fornitore").insert({
      azienda_id: az, sede_id: r.sede_uuid || window.state?.sedeAttiva?.id || null, prodotto_id: pid, prodotto_letto: c.letto?.prodotto || null,
      produttore: c.letto?.produttore || null, lotto: v("lotto"), data_scadenza: v("scadenza") || null, tipo_data: c.letto?.tipo_data || "scadenza",
      quantita: num(v("peso")), unita: "kg", foto_url: c.foto_url || null, letto_da: letto, stato: "in_uso",
      ricevuto_il: new Date().toISOString(), creato_da: window.state?.user?.id || null,
    }).select("id, lotto, data_scadenza").single();
    if (error) { alert("Cartellino non salvato: " + error.message); return false; }
    // la foto vale piu' della scelta automatica: si aggiorna la riga della materia prima, o se ne aggiunge una
    const { data: righe } = await sb().from("produzione_lotto_ingredienti").select("id, lotto_fornitore_id, scelto_auto").eq("lotto_id", r.id).eq("prodotto_id", pid);
    const libera = (righe || []).find((x) => !x.lotto_fornitore_id) || (righe || []).find((x) => x.scelto_auto);
    const val = { lotto_fornitore_id: lf.id, lotto_materia_prima: lf.lotto, scadenza_materia_prima: lf.data_scadenza, scelto_auto: false, ...(num(v("peso")) ? { quantita: num(v("peso")), unita_misura: "kg" } : {}) };
    const { error: e2 } = libera
      ? await sb().from("produzione_lotto_ingredienti").update(val).eq("id", libera.id)
      : await sb().from("produzione_lotto_ingredienti").insert({ lotto_id: r.id, ricetta_id: r.ricetta_id, prodotto_id: pid, azienda_id: az, ...val });
    if (e2) { alert("Cartellino salvato ma non legato: " + e2.message); return false; }
    return true;
  }

  carica();
  // la lavorazione puo' aprirsi dopo (prima firma): si ricontrolla quando si torna sulla scheda
  box.addEventListener("click", () => { if (!elLista.innerHTML || elLista.querySelector(".ct-nota")) carica(); }, { capture: true });
}

function stile() {
  return `
  .ct{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:12px 0;}
  .ct-tit{font-weight:800;font-size:16px;}
  .ct-sub{font-size:13px;color:#64748b;margin:3px 0 10px;}
  .ct-foto{display:block;text-align:center;background:#0E5A7A;color:#fff;border-radius:12px;padding:13px;font-weight:800;font-size:15px;cursor:pointer;}
  .ct-nota{font-size:13px;color:#64748b;margin-top:10px;}
  .ct-interno{border-color:#86efac!important;background:#f0fdf4!important;}
  .ct-scheda{border:1.5px solid #bfdbfe;background:#f8fbff;border-radius:12px;padding:10px;margin-top:10px;}
  .ct-scheda label{display:block;font-size:12px;font-weight:700;color:#64748b;margin-top:6px;}
  .ct-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:9px;font-size:15px;font-family:inherit;background:#fff;color:#0f172a;margin-top:2px;}
  .ct-g3{display:grid;grid-template-columns:1.2fr 1.1fr .8fr;gap:6px;}
  .ct-mini{width:100%;max-height:160px;object-fit:contain;border-radius:8px;background:#f1f5f9;margin-bottom:6px;}
  .ct-az{display:flex;gap:8px;margin-top:10px;}
  .ct-pri{flex:2;border:0;border-radius:11px;padding:12px;background:#0E5A7A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;width:100%;margin-top:8px;}
  .ct-az .ct-pri{margin-top:0;}
  .ct-sec{flex:1;border:1.5px solid #cbd5e1;background:#fff;border-radius:11px;padding:12px;font-weight:700;color:#334155;cursor:pointer;}
  .ct-tot{font-size:13.5px;margin-top:12px;color:#0f172a;}
  .ct-avviso{background:#fef3c7;color:#92400e;border-radius:9px;padding:8px 10px;font-size:13px;margin-top:8px;}
  .ct-riga{display:flex;gap:10px;align-items:center;border-top:1px solid #f1f5f9;padding:8px 0;font-size:14px;}
  .ct-riga img,.ct-noimg{width:54px;height:54px;object-fit:cover;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex:none;}
  .ct-r3{font-size:12.5px;color:#64748b;margin-top:2px;}`;
}
