import { comprimiImmagine } from "../../utils/immagini.js";

export function renderCaricoModal() {
  return `
    <div id="rf-carico-backdrop" class="rf-overlay-backdrop" style="display:none;">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">Carico Magazzino</h3>
          <button id="btn-close-carico" class="app-button tiny gray">Chiudi</button>
        </div>

        <div class="rf-overlay-body">

          <div id="carico-sede-avviso" style="display:none;"><div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:10px;line-height:1.4;">⚠ Nessuna sede attiva: scegli la sede in alto, accanto al nome della società. Serve per registrare il carico e vedere la giacenza. Foto e fornitore preferito si possono segnare lo stesso.</div></div>

          <div style="display:flex;gap:8px;margin-bottom:14px;">
            <button id="tab-mp" style="
              flex:1;padding:10px;border:none;border-radius:10px;
              background:#0E5A7A;color:white;font-size:13px;font-weight:600;cursor:pointer;
            ">🧂 Materia Prima</button>
            <button id="tab-prep" style="
              flex:1;padding:10px;border:none;border-radius:10px;
              background:#e5e7eb;color:#374151;font-size:13px;font-weight:600;cursor:pointer;
            ">🍳 Preparazione</button>
          </div>

          <div id="carico-foto-rapida" style="margin-bottom:14px;">
            <div style="display:flex;gap:8px;">
              <button type="button" id="carico-scatta" class="app-button" style="flex:1 1 0;min-width:0;width:auto;padding:14px 10px;font-size:15px;font-weight:800;">📷 Scatta la foto del prodotto</button>
              <button type="button" id="carico-galleria" class="app-button gray" style="flex:0 0 64px;width:64px;padding:14px 0;font-size:20px;" title="Dalla galleria">🖼</button>
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Anche più foto: davanti per il nome, dietro per codice a barre e scadenza. Tony legge e mette il prodotto in anagrafe.</div>
            <div id="carico-foto-strip"></div>
            <div id="carico-tony" style="display:none;margin-top:8px;font-size:13px;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;"></div>
            <div id="carico-tony-scelta"></div>
            <input id="carico-rapida-camera" type="file" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1">
            <input id="carico-rapida-file" type="file" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1">
          </div>

          <div class="rf-field">
            <label>Prodotto</label>
            <input
              id="carico-search"
              class="input"
              placeholder="Cerca materia prima..."
              autocomplete="off"
            />
          </div>

          <div id="carico-risultati"></div>

          <div id="carico-prodotto" class="rf-section-spacer" style="display:none;"></div>

          <div id="carico-form" class="rf-section-spacer" style="display:none;">

            <div class="rf-product-card" style="margin-top:10px;">
              <div class="rf-product-section-title">Quanto carichi</div>

              <div class="rf-field">
                <label id="carico-qta-label">Quantità</label>
                <input id="carico-quantita" type="number" step="0.001" class="input" inputmode="decimal" style="font-size:20px;font-weight:700;" />
              </div>

              <div class="rf-field" style="margin-top:10px;">
                <label>Costo di un pezzo (€) <span style="font-size:11px;color:#6b7280;">se lo sai · lascia 0 per non aggiornare</span></label>
                <input id="carico-prezzo" type="number" step="0.001" min="0" class="input" inputmode="decimal" value="0" />
              </div>

              <div id="carico-costo-preview" style="font-size:12px;color:#0E5A7A;margin-top:6px;min-height:16px;"></div>

              <div style="display:flex;gap:10px;margin-top:6px;">
                <div class="rf-field" style="flex:1 1 0;min-width:0;">
                  <label>Scadenza</label>
                  <input id="carico-scad" type="date" class="input" style="width:100%;max-width:100%;box-sizing:border-box;" />
                </div>
                <div class="rf-field" style="flex:1 1 0;min-width:0;">
                  <label>Lotto</label>
                  <input id="carico-lotto" class="input" autocomplete="off" style="width:100%;max-width:100%;box-sizing:border-box;" />
                </div>
              </div>
              <div class="rf-field" style="margin-top:8px;">
                <label>Tipo di data</label>
                <select id="carico-tipodata" class="input"><option value="scadenza">Da consumarsi entro</option><option value="tmc">Preferibilmente entro</option></select>
              </div>
            </div>

            <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
              <button id="btn-conferma-carico" class="app-button">
                Registra Carico
              </button>

              <button id="btn-annulla-carico" class="app-button tiny gray">
                Annulla
              </button>
            </div>

            <div id="carico-esito" style="margin-top:10px; font-size:13px;"></div>

            <details style="margin-top:16px;">
              <summary style="font-weight:700;cursor:pointer;padding:8px 0;color:#0E5A7A;">Altri dati (confezione, scorta minima, categoria, data, note)</summary>

              <div class="rf-product-card" style="margin-top:8px;">
                <div class="rf-field">
                  <label>Qtà per confezione <span style="font-size:11px;color:#6b7280;">es. CT da 6 → scrivi 6</span></label>
                  <input id="carico-qta-confezione" type="number" step="0.001" min="0.001" class="input" value="1" />
                </div>
              </div>

              <div class="rf-product-card" id="carico-um-card" style="display:none;margin-top:10px;">
                <div class="rf-product-section-title">Unità di misura</div>
                <div class="rf-product-grid">
                  <div class="rf-product-field">
                    <span class="rf-product-label">UM</span>
                    <div id="carico-um-value" class="rf-product-value">—</div>
                  </div>
                </div>
              </div>

              <div class="rf-product-card" style="margin-top:10px;">
                <div class="rf-product-section-title">Scorta minima / Riordino</div>
                <div class="rf-field">
                  <label>Quantità minima</label>
                  <input id="carico-scorta" type="number" class="input" />
                </div>
              </div>

              <div class="rf-product-card" style="margin-top:10px;">
                <div class="rf-product-section-title">Categoria interna</div>
                <div class="rf-field">
                  <label>Categoria</label>
                  <input id="carico-categoria" class="input" placeholder="es. inventario, rettifica..." />
                </div>
              </div>

              <div class="rf-field" style="margin-top:10px;">
                <label>Data movimento</label>
                <input id="carico-data" type="date" class="input" style="width:100%;max-width:100%;box-sizing:border-box;" />
              </div>

              <div class="rf-field" style="margin-top:10px;">
                <label>Note</label>
                <input id="carico-note" class="input" />
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  `;
}

let _tipoCarico = "materia_prima";

export async function apriCaricoModal({ aziendaId }) {
  _tipoCarico = "materia_prima"; // reset al default
  const backdrop = document.getElementById("rf-carico-backdrop");

  if (!backdrop) {
    console.error("Overlay carico non trovato nel DOM");
    return;
  }

  const search = backdrop.querySelector("#carico-search");
  const risultati = backdrop.querySelector("#carico-risultati");
  const prodottoBox = backdrop.querySelector("#carico-prodotto");
  const form = backdrop.querySelector("#carico-form");
  const btnClose = backdrop.querySelector("#btn-close-carico");
  const btnAnnulla = backdrop.querySelector("#btn-annulla-carico");
  const btnConferma = backdrop.querySelector("#btn-conferma-carico");

  const qtaEl = backdrop.querySelector("#carico-quantita");
  const scortaEl = backdrop.querySelector("#carico-scorta");
  const dataEl = backdrop.querySelector("#carico-data");
  const noteEl = backdrop.querySelector("#carico-note");
  const categoriaEl = backdrop.querySelector("#carico-categoria");
  const esitoEl = backdrop.querySelector("#carico-esito");
  const umValueEl = backdrop.querySelector("#carico-um-value");
  const umCard = backdrop.querySelector("#carico-um-card");

  const prezzoEl = backdrop.querySelector("#carico-prezzo");
  const qtaConfezioneEl = backdrop.querySelector("#carico-qta-confezione");
  const costoPrevEl = backdrop.querySelector("#carico-costo-preview");

  function aggiornaCostoPreview() {
    const prezzo = Number(prezzoEl?.value || 0);
    const qtaConf = Math.max(0.001, Number(qtaConfezioneEl?.value || 1));
    if (prezzo > 0 && costoPrevEl) {
      const costoUnit = prezzo / qtaConf;
      costoPrevEl.textContent = `→ Costo per unità: € ${costoUnit.toFixed(4)}`;
    } else if (costoPrevEl) {
      costoPrevEl.textContent = "";
    }
  }

  prezzoEl?.addEventListener("input", aggiornaCostoPreview);
  qtaConfezioneEl?.addEventListener("input", aggiornaCostoPreview);

  let prodottoId = null;
  let prodottoSelezionato = null;
  let nuovoProdottoMode = false;

  let fornitoriCache = [];

  async function loadFornitori() {
    const { data } = await window.supabaseClient
      .from("fornitori")
      .select("id, ragione_sociale")
      .eq("azienda_id", aziendaId)
      .order("ragione_sociale", { ascending: true });

    fornitoriCache = data || [];
  }

  function bindCreateButton(term) {
    const btn = risultati.querySelector("#btn-nuovo-prodotto");
    if (!btn) return;
    btn.onclick = () => {
      nuovoProdottoMode = true;
      prodottoId = null;
      prodottoSelezionato = null;
      mostraFormNuovoProdotto(term);
    };
  }

  backdrop.style.display = "flex";

  risultati.innerHTML = "";
  prodottoBox.innerHTML = "";
  prodottoBox.style.display = "none";
  form.style.display = "none";
  esitoEl.innerText = "";

  // ── Binding tab ──
  const tabMP = backdrop.querySelector("#tab-mp");
  const tabPrep = backdrop.querySelector("#tab-prep");

  function setTab(tipo) {
    _tipoCarico = tipo;
    if (tipo === "materia_prima") {
      tabMP.style.background = "#0E5A7A"; tabMP.style.color = "white";
      tabPrep.style.background = "#e5e7eb"; tabPrep.style.color = "#374151";
      search.placeholder = "Cerca materia prima...";
    } else {
      tabPrep.style.background = "#0E5A7A"; tabPrep.style.color = "white";
      tabMP.style.background = "#e5e7eb"; tabMP.style.color = "#374151";
      search.placeholder = "Cerca preparazione...";
    }
    search.value = "";
    risultati.innerHTML = "";
    prodottoBox.style.display = "none";
    form.style.display = "none";
    nuovoProdottoMode = false;
    prodottoId = null;
    prodottoSelezionato = null;
  }

  tabMP.onclick = () => { setTab("materia_prima"); mostraFotoRapida(true); };
  tabPrep.onclick = () => { setTab("preparazione"); mostraFotoRapida(false); };

  search.value = "";
  qtaEl.value = "";
  scortaEl.value = "";
  categoriaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario";

  await loadFornitori();

  const close = () => {
    backdrop.style.display = "none";
  };

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
    if (e.target.id === "rf-carico-backdrop") {
      close();
    }
  };

  search.oninput = async () => {
    const term = search.value.trim();

    prodottoId = null;
    prodottoSelezionato = null;
    nuovoProdottoMode = false;

    prodottoBox.innerHTML = "";
    prodottoBox.style.display = "none";
    form.style.display = "none";
    risultati.innerHTML = "";
    esitoEl.innerText = "";
    umValueEl.innerText = "—";
    umCard.style.display = "none";
    scortaEl.value = "";

    if (!term) {
      return;
    }

    if (term.length < 2) {
      risultati.innerHTML = `
        <div class="rf-empty-state">Digita almeno 2 caratteri oppure crea un nuovo prodotto</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Crea "${escapeHtml(term)}"
        </button>
      `;
      bindCreateButton(term);
      return;
    }

    const safeTerm = sanitizeSearchTerm(term);

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id, tipo_prodotto, foto_url")
      .eq("azienda_id", aziendaId)
      .eq("tipo_prodotto", _tipoCarico)
      .or(`descrizione.ilike.%${safeTerm}%,codice_interno.ilike.%${safeTerm}%`)
      .limit(10);

    if (error) {
      console.error(error);
      risultati.innerHTML = `
        <div class="rf-empty-state">Errore durante la ricerca</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Crea "${escapeHtml(term)}"
        </button>
      `;
      bindCreateButton(term);
      return;
    }

    if (!data || !data.length) {
      risultati.innerHTML = `
        <div class="rf-empty-state">Nessun prodotto trovato</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Crea "${escapeHtml(term)}"
        </button>
      `;

      bindCreateButton(term);

      return;
    }

    risultati.innerHTML = `
      <div class="rf-search-list">
        ${data.map((p) => `
          <div class="rf-search-item">
            <div class="rf-search-row">
              ${p.foto_url ? `<img src="${escapeHtml(p.foto_url)}" alt="" loading="lazy" style="width:44px;height:44px;border-radius:8px;object-fit:cover;margin-right:10px;flex:0 0 auto;">` : ""}
              <div class="rf-search-main">
                <div class="rf-search-code">${escapeHtml(p.codice_interno || "—")}</div>
                <div class="rf-search-title">${escapeHtml(p.descrizione || "")}</div>
              </div>

              <button class="rf-search-action carico-item-action" data-id="${p.id}">🔍</button>
            </div>
          </div>
        `).join("")}
      </div>

      <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
        + Crea "${escapeHtml(term)}"
      </button>
    `;

    bindCreateButton(term);

    risultati.querySelectorAll(".carico-item-action").forEach((btn) => {
      btn.onclick = async () => {
        const id = String(btn.dataset.id);

        prodottoId = id;
        nuovoProdottoMode = false;

        const prodotto = await loadDettaglioProdotto(aziendaId, id);

        if (!prodotto) {
          prodottoBox.style.display = "block";
          prodottoBox.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
          return;
        }

        prodottoSelezionato = prodotto;

        prodottoBox.style.display = "block";
        prodottoBox.innerHTML = renderSchedaCaricoProdotto(prodotto, fornitoriCache);
        bindSchedaProdotto(prodotto);

        umValueEl.innerText = prodotto.unita_base || "—";
        umCard.style.display = "block";

        scortaEl.value = prodotto.scorta_minima || "";

        form.style.display = "block";

        // l'elenco si chiude e la scheda sale in vista: prima restava sotto l'elenco, fuori schermo
        risultati.innerHTML = "";
        if (prodottoBox.scrollIntoView) prodottoBox.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
  };

  // ── SCHEDA ANAGRAFE DEL PRODOTTO: foto e fornitore preferito ──
  let fotoNuovoUrl = "";

  async function caricaFotoProdotto(f) {
    const ridotta = await comprimiImmagine(f, { latoMax: 1200, qualita: 0.8, forza: true });
    const path = `${aziendaId}/prodotti/${(crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2))}.jpg`;
    const up = await window.supabaseClient.storage.from("media-aziende").upload(path, ridotta, { contentType: ridotta.type || "image/jpeg", cacheControl: "31536000" });
    if (up.error) throw up.error;
    return window.supabaseClient.storage.from("media-aziende").getPublicUrl(path).data.publicUrl;
  }

  function aggiornaEtichettaQuantita(prodotto) {
    const ql = backdrop.querySelector("#carico-qta-label");
    if (ql) ql.textContent = "Quantità (" + ((prodotto && prodotto.unita_base) || "—") + ")";
  }

  function bindSchedaProdotto(prodotto) {
    aggiornaEtichettaQuantita(prodotto);
    const sb = window.supabaseClient;
    const esitoA = prodottoBox.querySelector("#carico-anag-esito");
    const msg = (testo, ok) => { if (esitoA) { esitoA.textContent = testo; esitoA.style.color = ok ? "#15803d" : "#b91c1c"; } };
    const fileEl = prodottoBox.querySelector("#carico-foto-file");
    if (fileEl) {
      fileEl.onchange = async (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (!f) return;
        msg("⏳ Carico la foto…", true);
        try {
          const url = await caricaFotoProdotto(f);
          const { error } = await sb.from("prodotti").update({ foto_url: url }).eq("id", prodotto.id).eq("azienda_id", aziendaId);
          if (error) throw error;
          prodotto.foto_url = url;
          prodottoBox.querySelector("#carico-foto-box").innerHTML = `<img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
          msg("✅ Foto salvata nell'anagrafe", true);
        } catch (e) {
          msg("Non riesco a salvare la foto: " + ((e && e.message) || "errore"), false);
        }
      };
    }
    // toccando il riquadro si apre la fotocamera; "Galleria" apre le foto del telefono. Stessa procedura per tutte e due.
    const cameraEl = prodottoBox.querySelector("#carico-foto-camera");
    if (fileEl && cameraEl) {
      cameraEl.onchange = (ev) => fileEl.onchange(ev);
      prodottoBox.querySelector("#carico-foto-box").onclick = () => cameraEl.click();
      prodottoBox.querySelector("#carico-foto-galleria").onclick = () => fileEl.click();
    }
    const sel = prodottoBox.querySelector("#carico-forn-pref");
    if (sel) {
      sel.onchange = async () => {
        const id = sel.value ? Number(sel.value) : null;
        const { error } = await sb.from("prodotti").update({ fornitore_preferito_id: id }).eq("id", prodotto.id).eq("azienda_id", aziendaId);
        if (error) { msg("Non riesco a salvare il fornitore: " + (error.message || "errore"), false); return; }
        prodotto.fornitore_preferito_id = id;
        msg(id ? "✅ Fornitore preferito salvato" : "✅ Fornitore preferito tolto", true);
      };
    }
  }

  // ── FOTO SUBITO: Tony legge il prodotto dalle foto (anche piu' lati), lo trova o lo crea in anagrafe e apre la scheda ──
  const URL_LEGGI = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-etichetta-lotto";
  let fotoRaccolte = [];
  let lettoTony = null;
  const $q = (s) => backdrop.querySelector(s);
  const normNome = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  function mostraFotoRapida(si) {
    const b = $q("#carico-foto-rapida");
    if (b) b.style.display = si ? "block" : "none";
  }

  function resetFotoRapida() {
    fotoRaccolte = [];
    lettoTony = null;
    ["#carico-foto-strip", "#carico-tony-scelta"].forEach((s) => { const e = $q(s); if (e) e.innerHTML = ""; });
    const t = $q("#carico-tony");
    if (t) { t.style.display = "none"; t.textContent = ""; }
    ["#carico-lotto", "#carico-scad"].forEach((s) => { const e = $q(s); if (e) e.value = ""; });
    const td = $q("#carico-tipodata");
    if (td) td.value = "scadenza";
    mostraFotoRapida(_tipoCarico === "materia_prima");
  }

  function messaggioTony(testo, tipo) {
    const t = $q("#carico-tony");
    if (!t) return;
    const errore = tipo === "errore";
    t.style.display = "block";
    t.textContent = testo;
    t.style.color = errore ? "#b91c1c" : "#166534";
    t.style.background = errore ? "#fef2f2" : "#f0fdf4";
    t.style.borderColor = errore ? "#fecaca" : "#bbf7d0";
  }

  async function preparaFotoRapida(file) {
    const img = await comprimiImmagine(file, { latoMax: 1600, qualita: 0.82, forza: true });
    const b64 = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = ko; r.readAsDataURL(img); });
    const percorso = `${aziendaId}/prodotti/${(crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2))}.jpg`;
    const url = window.supabaseClient.storage.from("media-aziende").upload(percorso, img, { contentType: img.type || "image/jpeg", cacheControl: "31536000" })
      .then(({ error }) => (error ? "" : window.supabaseClient.storage.from("media-aziende").getPublicUrl(percorso).data.publicUrl))
      .catch(() => "");
    return { mime: img.type || "image/jpeg", b64, anteprima: URL.createObjectURL(img), url };
  }

  async function aggiungiFotoRapida(file) {
    messaggioTony("⏳ Preparo la foto…");
    try {
      fotoRaccolte.push(await preparaFotoRapida(file));
      const t = $q("#carico-tony");
      if (t) t.style.display = "none";
    } catch (e) {
      messaggioTony("Foto non riuscita: " + ((e && e.message) || "errore"), "errore");
    }
    disegnaRaccolta();
  }

  function disegnaRaccolta() {
    const s = $q("#carico-foto-strip");
    if (!s) return;
    if (!fotoRaccolte.length) { s.innerHTML = ""; return; }
    s.innerHTML = `<div style="margin-top:10px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;background:#f8fafc;">
      <div style="font-size:13px;font-weight:700;">${fotoRaccolte.length} foto</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${fotoRaccolte.map((f, i) => `<div style="position:relative;"><img src="${f.anteprima}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px;"><button type="button" data-rmf="${i}" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#0f172a;color:#fff;font-size:12px;">✕</button></div>`).join("")}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        ${fotoRaccolte.length < 4 ? `<button type="button" id="carico-altra" class="app-button gray">➕ Altra foto (retro, codice a barre, scadenza)</button>` : ""}
        <button type="button" id="carico-leggi" class="app-button">✨ Leggi con Tony</button>
      </div></div>`;
    const altra = s.querySelector("#carico-altra");
    if (altra) altra.onclick = () => $q("#carico-rapida-camera").click();
    s.querySelector("#carico-leggi").onclick = () => leggiConTony();
    s.querySelectorAll("[data-rmf]").forEach((b) => { b.onclick = () => { fotoRaccolte.splice(Number(b.dataset.rmf), 1); disegnaRaccolta(); }; });
  }

  async function leggiConTony() {
    const raccolte = fotoRaccolte.slice();
    if (!raccolte.length) return;
    $q("#carico-foto-strip").innerHTML = "";
    $q("#carico-tony-scelta").innerHTML = "";
    messaggioTony(`✨ Tony legge ${raccolte.length > 1 ? "le " + raccolte.length + " foto" : "la foto"}…`);
    let d;
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      const r = await fetch(URL_LEGGI, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + ((session && session.access_token) || "") },
        body: JSON.stringify({ azienda_id: aziendaId, immagini: raccolte.map((f) => ({ base64: f.b64, mime: f.mime })) }),
      });
      d = await r.json();
      if (!r.ok) throw new Error(d.errore || "lettura non riuscita");
    } catch (e) {
      messaggioTony("Non sono riuscito a leggere (" + ((e && e.message) || "errore") + "). Riprova con più luce, aggiungi un'altra foto o cerca il prodotto qui sotto.", "errore");
      disegnaRaccolta(); // le foto restano: si puo' riprovare
      return;
    }
    const urls = (await Promise.all(raccolte.map((f) => f.url))).filter(Boolean);
    fotoRaccolte = [];
    await esitoLettura(d, urls);
  }

  async function esitoLettura(d, urls) {
    const l = d.letto || {};
    lettoTony = { ...l, foto_urls: urls };
    // lotto e scadenza letti vanno gia' nel modulo del carico
    if ($q("#carico-lotto")) $q("#carico-lotto").value = l.lotto || "";
    if ($q("#carico-scad")) $q("#carico-scad").value = l.scadenza || "";
    if ($q("#carico-tipodata")) $q("#carico-tipodata").value = l.tipo_data === "tmc" ? "tmc" : "scadenza";
    const nome = String(l.prodotto || "").trim();
    const riassunto = `✨ Tony ha letto: ${nome || "nome non leggibile"}${l.lotto ? " · lotto " + l.lotto : ""}${l.scadenza ? " · scade " + String(l.scadenza).split("-").reverse().join("/") : ""}${l.codice_barre ? " · codice " + l.codice_barre : ""}.${l.dubbi ? " ⚠ " + l.dubbi + "." : ""}`;

    // 1) codice a barre: il modo piu' sicuro per riconoscere un prodotto gia' in anagrafe
    if (d.per_barcode && d.per_barcode.id) {
      messaggioTony(riassunto + " È già in anagrafe (riconosciuto dal codice a barre).");
      return mostraProdottoLetto(d.per_barcode.id, { urls });
    }
    if (!nome) {
      messaggioTony(riassunto + " Cerca il prodotto qui sotto o scrivilo.", "errore");
      return;
    }
    // 2) stesso nome gia' in anagrafe
    const cands = Array.isArray(d.candidati) ? d.candidati : [];
    const esatto = cands.find((c) => normNome(c.nome) === normNome(nome));
    if (esatto) {
      messaggioTony(riassunto + " È già in anagrafe.");
      return mostraProdottoLetto(esatto.id, { urls });
    }
    // 3) non c'e': lo creo
    if (!cands.length) {
      messaggioTony(riassunto + " Non è in anagrafe: lo creo.");
      return creaProdottoLetto();
    }
    // 4) ce ne sono di simili: scegli tu, oppure e' nuovo
    messaggioTony(riassunto + " È uno di questi?");
    const sc = $q("#carico-tony-scelta");
    sc.innerHTML = `<div style="margin-top:8px;">${cands.slice(0, 5).map((c) => `<button type="button" class="app-button gray" data-cand="${escapeHtml(String(c.id))}" style="display:block;width:100%;text-align:left;margin-top:6px;">${escapeHtml(c.nome)}</button>`).join("")}
      <button type="button" id="carico-crea-letto" class="app-button" style="width:100%;margin-top:10px;">➕ No, è nuovo: crea «${escapeHtml(nome)}»</button></div>`;
    sc.querySelectorAll("[data-cand]").forEach((b) => { b.onclick = () => mostraProdottoLetto(b.dataset.cand, { urls }); });
    sc.querySelector("#carico-crea-letto").onclick = () => creaProdottoLetto();
  }

  async function creaProdottoLetto() {
    const l = lettoTony || {};
    const nome = String(l.prodotto || "").trim();
    if (!nome) return;
    // il prodotto si conta a PEZZI (confezioni); quanto contiene un pezzo, se Tony l'ha letto, serve all'app per i costi
    const uPeso = String(l.unita || "").toLowerCase();
    const umConf = { g: "g", gr: "g", kg: "kg", ml: "ml", l: "lt", lt: "lt" }[uPeso] || "";
    const pesoN = Number(l.peso);
    const urls = l.foto_urls || [];
    const res = await insertProdottoCompat({
      azienda_id: aziendaId,
      descrizione: nome,
      unita_base: "pz",
      unita_misura: "pz",
      um: "pz",
      tipo_prodotto: _tipoCarico,
      categoria_interna: nome,
      ...(pesoN > 0 && umConf ? { contenuto_confezione: pesoN, um_confezione: umConf } : {}),
      categoria_bilancio_id: 7,
      ...(urls[0] ? { foto_url: urls[0] } : {}),
      ...(l.codice_barre ? { barcode: l.codice_barre } : {}),
    });
    if (res.error || !res.data || !res.data.id) {
      messaggioTony("Non sono riuscito a creare il prodotto: " + ((res.error && res.error.message) || "errore") + ". Cercalo o crealo a mano qui sotto.", "errore");
      return;
    }
    messaggioTony(`✨ Ho creato «${nome}» in anagrafe. Controlla l'unità di misura e segna il fornitore.`);
    $q("#carico-tony-scelta").innerHTML = "";
    return mostraProdottoLetto(String(res.data.id), { urls, nuovo: true });
  }

  async function mostraProdottoLetto(id, { urls = [], nuovo = false } = {}) {
    nuovoProdottoMode = false;
    prodottoId = String(id);
    const prodotto = await loadDettaglioProdotto(aziendaId, prodottoId);
    prodottoBox.style.display = "block";
    if (!prodotto) { prodottoBox.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`; return; }
    risultati.innerHTML = "";
    $q("#carico-tony-scelta").innerHTML = "";
    // foto e codice a barre entrano nell'anagrafe se mancano
    const sb = window.supabaseClient;
    const l = lettoTony || {};
    if (!prodotto.foto_url && urls[0]) {
      const { error } = await sb.from("prodotti").update({ foto_url: urls[0] }).eq("id", prodotto.id).eq("azienda_id", aziendaId);
      if (!error) prodotto.foto_url = urls[0];
    }
    if (l.codice_barre && !prodotto.barcode) {
      const { error } = await sb.from("prodotti").update({ barcode: l.codice_barre }).eq("id", prodotto.id).eq("azienda_id", aziendaId);
      if (!error) prodotto.barcode = l.codice_barre;
    }
    prodottoSelezionato = prodotto;
    prodottoBox.innerHTML = renderSchedaCaricoProdotto(prodotto, fornitoriCache, { nuovo });
    bindSchedaProdotto(prodotto);
    const msgA = (testo, ok) => { const e = prodottoBox.querySelector("#carico-anag-esito"); if (e) { e.textContent = testo; e.style.color = ok ? "#15803d" : "#b91c1c"; } };
    // nome del prodotto nuovo: Tony lo propone, qui si puo' correggere
    const nomeEl = prodottoBox.querySelector("#carico-nome");
    if (nomeEl) {
      nomeEl.onchange = async () => {
        const nuovoNome = nomeEl.value.trim();
        if (!nuovoNome) { nomeEl.value = prodotto.descrizione || ""; return; }
        const { error } = await sb.from("prodotti").update({ descrizione: nuovoNome, nome: nuovoNome }).eq("id", prodotto.id).eq("azienda_id", aziendaId);
        if (error) { msgA("Non riesco a salvare il nome: " + (error.message || "errore"), false); return; }
        prodotto.descrizione = nuovoNome;
        const titolo = prodottoBox.querySelector(".rf-product-title");
        if (titolo) titolo.textContent = nuovoNome;
        msgA("✅ Nome salvato", true);
      };
    }
    // si conta in pezzi, kg o litri: l'app lo legge da tre campi, vanno aggiornati insieme
    const umSel = prodottoBox.querySelector("#carico-um-sel");
    const contBox = prodottoBox.querySelector("#carico-cont-box");
    if (umSel) {
      umSel.onchange = async () => {
        const v = umSel.value;
        const { error } = await sb.from("prodotti").update({ unita_base: v, unita_misura: v, um: v }).eq("id", prodotto.id).eq("azienda_id", aziendaId);
        if (error) { msgA("Non riesco a salvare l'unità: " + (error.message || "errore"), false); return; }
        prodotto.unita_base = v;
        umValueEl.innerText = v;
        if (contBox) contBox.style.display = v === "pz" ? "" : "none";
        aggiornaEtichettaQuantita(prodotto);
        msgA("✅ Unità di misura salvata", true);
      };
    }
    // quanto contiene un pezzo (serve per i costi)
    const contEl = prodottoBox.querySelector("#carico-cont");
    const contUm = prodottoBox.querySelector("#carico-cont-um");
    const salvaCont = async () => {
      const n = Number(String(contEl.value || "").replace(",", "."));
      const agg = n > 0 ? { contenuto_confezione: n, um_confezione: contUm.value } : { contenuto_confezione: null, um_confezione: null };
      const { error } = await sb.from("prodotti").update(agg).eq("id", prodotto.id).eq("azienda_id", aziendaId);
      if (error) { msgA("Non riesco a salvare il contenuto: " + (error.message || "errore"), false); return; }
      Object.assign(prodotto, agg);
      msgA(n > 0 ? "✅ Contenuto del pezzo salvato" : "✅ Contenuto tolto", true);
    };
    if (contEl) contEl.onchange = salvaCont;
    if (contUm) contUm.onchange = () => { if (Number(contEl.value) > 0) salvaCont(); };
    umValueEl.innerText = prodotto.unita_base || "—";
    umCard.style.display = "block";
    scortaEl.value = prodotto.scorta_minima || "";
    form.style.display = "block";
    if (prodottoBox.scrollIntoView) prodottoBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // collegamenti dei pulsanti foto e azzeramento a ogni apertura
  $q("#carico-scatta").onclick = () => $q("#carico-rapida-camera").click();
  $q("#carico-galleria").onclick = () => $q("#carico-rapida-file").click();
  ["#carico-rapida-camera", "#carico-rapida-file"].forEach((sel) => {
    $q(sel).onchange = (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) aggiungiFotoRapida(f); };
  });
  resetFotoRapida();
  { const av = $q("#carico-sede-avviso"); if (av) av.style.display = window.state?.sedeAttiva?.id ? "none" : "block"; }

  btnConferma.onclick = async () => {
    const q = Number(qtaEl.value || 0);
    const scorta = Number(scortaEl.value || 0);
    const d = dataEl.value;
    const note = noteEl.value || "";
    const categoria = categoriaEl.value || "INVENTARIO";

    let sedeId = null;

    try {
      sedeId = getSedeAttivaId();
    } catch (error) {
      alert("Scegli prima la sede (in alto, accanto al nome della società): senza sede il carico non si può registrare.");
      return;
    }

    let finalProdottoId = prodottoId;

    if (!finalProdottoId && nuovoProdottoMode) {
      const codice = document.getElementById("new-codice")?.value || null;
      const descrizione = document.getElementById("new-descrizione")?.value?.trim();
      const um = document.getElementById("new-um")?.value || null;
      const scortaNew = document.getElementById("new-scorta")?.value || null;
      const fornitore = document.getElementById("new-fornitore")?.value || null;
      const fornitoreId = await resolveFornitoreId(aziendaId, fornitore);

      if (!descrizione) {
        alert("Inserisci descrizione prodotto");
        return;
      }

      const categoriaInterna = document.getElementById("new-categoria-interna")?.value || null;
      const categoriaGestione = document.getElementById("new-categoria-gestione")?.value || null;
      const categoriaBilancioId = document.getElementById("new-categoria-bilancio-id")?.value || null;

      const insertResult = await insertProdottoCompat({
        azienda_id: aziendaId,
        codice_interno: codice,
        descrizione,
        unita_base: um,
        scorta_minima: scortaNew,
        fornitore_preferito_id: fornitoreId,
        tipo_prodotto: _tipoCarico,
        ...(fotoNuovoUrl ? { foto_url: fotoNuovoUrl } : {}),
        ...(categoriaInterna ? { categoria_interna: categoriaInterna } : {}),
        ...(categoriaGestione ? { categoria_interna: categoriaGestione } : {}),
        categoria_bilancio_id: categoriaBilancioId ? Number(categoriaBilancioId) : 7
      });

      if (insertResult.error) {
        if (insertResult.error.code === "23505") {
          const { data: existing, error: existingError } = await window.supabaseClient
            .from("prodotti")
            .select("id")
            .eq("azienda_id", aziendaId)
            .ilike("descrizione", descrizione)
            .limit(1)
            .maybeSingle();

          if (existingError) {
            console.error(existingError);
            alert("Prodotto già esistente ma non recuperabile");
            return;
          }

          if (!existing?.id) {
            alert("Prodotto già esistente ma non trovato");
            return;
          }

          finalProdottoId = String(existing.id);
        } else {
          console.error(insertResult.error);
          alert("Errore creazione prodotto");
          return;
        }
      } else {
        finalProdottoId = String(insertResult.data.id);
      }
    }

    if (!finalProdottoId) {
      alert("Seleziona o crea un prodotto");
      return;
    }

    if (!q || q <= 0) {
      if (qtaEl.scrollIntoView) qtaEl.scrollIntoView({ behavior: "smooth", block: "center" });
      qtaEl.focus();
      alert("Inserisci una quantità valida");
      return;
    }

    const { error: updateError } = await window.supabaseClient
      .from("prodotti")
      .update({ scorta_minima: scorta })
      .eq("id", finalProdottoId)
      .eq("azienda_id", aziendaId);

    if (updateError) {
      console.error(updateError);
      esitoEl.innerText = "Errore aggiornamento scorta minima";
      return;
    }

    // Aggiorna costo_medio se è stato inserito un prezzo
    const prezzoAcquisto = Number(prezzoEl?.value || 0);
    if (prezzoAcquisto > 0) {
      const qtaConfezione = Math.max(0.001, Number(qtaConfezioneEl?.value || 1));
      const costoPerUnita = prezzoAcquisto / qtaConfezione;
      await window.supabaseClient
        .from("prodotti")
        .update({
          costo_medio: costoPerUnita,
          costo_ultimo: costoPerUnita,
          quantita_confezione: qtaConfezione
        })
        .eq("id", finalProdottoId)
        .eq("azienda_id", aziendaId);
    }

    esitoEl.innerText = "Salvataggio...";

    const causaleParts = [categoria];
    if (d) causaleParts.push(`data:${d}`);
    if (note) causaleParts.push(note);

    const movimentoPayload = {
      azienda_id: aziendaId,
      sede_id: sedeId,
      prodotto_id: finalProdottoId,
      tipo_movimento: "carico",
      quantita: q,
      costo: 0,
      causale: causaleParts.join(" | ")
    };

    const movimentoResult = await insertMovimentoCompat(movimentoPayload);

    if (movimentoResult.error) {
      console.error(movimentoResult.error);
      esitoEl.innerText = "Errore durante il salvataggio";
      return;
    }

    if (prodottoSelezionato) {
      const nuovaGiacenza =
        Number(prodottoSelezionato.giacenza_attuale || 0) + q;

      window.magazzinoEvents?.onGiacenzaUpdate?.({
        prodotto: {
          id: prodottoSelezionato.prodotto_id || finalProdottoId,
          nome: prodottoSelezionato.descrizione
        },
        giacenza: nuovaGiacenza,
        scorta_minima: scorta
      });
    }

    // lotto e scadenza (letti dall'etichetta o scritti a mano) restano agganciati al prodotto, con le foto
    const lottoTxt = (document.getElementById("carico-lotto")?.value || "").trim();
    const scadTxt = document.getElementById("carico-scad")?.value || "";
    let notaLotto = "";
    if (lottoTxt) {
      const urlsLotto = (lettoTony && lettoTony.foto_urls) || [];
      const umLotto = (prodottoSelezionato && prodottoSelezionato.unita_base) || "";
      const { error: lotErr } = await window.supabaseClient.from("lotti_fornitore").insert({
        azienda_id: aziendaId,
        sede_id: sedeId,
        prodotto_id: Number(finalProdottoId),
        prodotto_letto: (lettoTony && lettoTony.prodotto) || null,
        produttore: (lettoTony && lettoTony.produttore) || null,
        lotto: lottoTxt,
        data_scadenza: scadTxt || null,
        tipo_data: document.getElementById("carico-tipodata")?.value || "scadenza",
        quantita: q,
        unita: umLotto === "lt" ? "l" : (umLotto || null),
        foto_url: urlsLotto[0] || null,
        foto_urls: urlsLotto,
        letto_da: lettoTony ? { ...lettoTony, fonte: "carico giacenza" } : null,
        stato: "in_uso",
      });
      if (lotErr) { console.error(lotErr); notaLotto = " · il lotto non è stato salvato: " + (lotErr.message || "errore"); }
    } else if (scadTxt) {
      notaLotto = " · la scadenza non è stata salvata: manca il lotto";
    }

    esitoEl.innerText = "Carico registrato ✔" + notaLotto;
    setTimeout(() => close(), notaLotto ? 2500 : 500);
  };

  async function insertMovimentoCompat(payload) {
    const attempts = [
      payload,
      (() => {
        const fallback = { ...payload };
        delete fallback.costo;
        return fallback;
      })(),
      (() => {
        const fallback = { ...payload };
        delete fallback.causale;
        return fallback;
      })(),
      (() => {
        const fallback = { ...payload };
        delete fallback.costo;
        delete fallback.causale;
        return fallback;
      })()
    ];

    let lastResult = null;

    for (const attempt of attempts) {
      const result = await window.supabaseClient
        .from("magazzino_movimenti")
        .insert(attempt);

      if (!result.error) {
        return result;
      }

      lastResult = result;

      const message = String(result.error?.message || "").toLowerCase();
      const canRetry =
        result.error?.code === "PGRST204" ||
        message.includes("costo") ||
        message.includes("causale");

      if (!canRetry) {
        break;
      }
    }

    return lastResult || { error: new Error("Inserimento movimento non riuscito") };
  }


  async function resolveFornitoreId(aziendaId, nomeFornitore) {
    const nome = String(nomeFornitore || "").trim();
    if (!nome) return null;

    const { data, error } = await window.supabaseClient
      .from("fornitori")
      .select("id")
      .eq("azienda_id", aziendaId)
      .ilike("ragione_sociale", nome)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Fornitore preferito non risolto:", error);
      return null;
    }

    return data?.id || null;
  }

  async function insertProdottoCompat(payload) {
    const cleanPayload = Object.fromEntries(
      Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== "")
    );

    const descrizione = String(cleanPayload.descrizione || "").trim();

    if (descrizione) {
      const { data: existing, error: existingError } = await window.supabaseClient
        .from("prodotti")
        .select("id")
        .eq("azienda_id", cleanPayload.azienda_id)
        .ilike("descrizione", descrizione)
        .limit(1)
        .maybeSingle();

      if (!existingError && existing?.id) {
        return { data: existing, error: null };
      }
    }

    const attempts = [
      cleanPayload,
      (() => {
        const fallback = { ...cleanPayload };
        delete fallback.fornitore_preferito;
        delete fallback.fornitore_preferito_id;
        return fallback;
      })(),
      (() => {
        const fallback = { ...cleanPayload };
        delete fallback.fornitore_preferito;
        delete fallback.fornitore_preferito_id;
        delete fallback.scorta_minima;
        return fallback;
      })()
    ];

    let lastResult = null;

    for (const attempt of attempts) {
      const result = await window.supabaseClient
        .from("prodotti")
        .insert(attempt)
        .select("id")
        .single();

      if (!result.error) {
        return result;
      }

      lastResult = result;

      if (result.error?.code === "23505" && descrizione) {
        const { data: existing, error: existingError } = await window.supabaseClient
          .from("prodotti")
          .select("id")
          .eq("azienda_id", cleanPayload.azienda_id)
          .ilike("descrizione", descrizione)
          .limit(1)
          .maybeSingle();

        if (!existingError && existing?.id) {
          return { data: existing, error: null };
        }
      }

      const message = String(result.error?.message || "").toLowerCase();
      const canRetry =
        result.error?.code === "PGRST204" ||
        result.error?.code === "23505" ||
        message.includes("fornitore") ||
        message.includes("scorta_minima");

      if (!canRetry) {
        break;
      }
    }

    return lastResult || { data: null, error: new Error("Inserimento prodotto non riuscito") };
  }

  function mostraFormNuovoProdotto(term) {
    prodottoBox.style.display = "block";

    prodottoBox.innerHTML = `
      <div class="rf-product-card">

        <div class="rf-product-section-title">Nuovo prodotto</div>

        <div style="display:flex;gap:8px;margin-bottom:6px;">
          <button type="button" id="new-foto-scatta" class="app-button" style="flex:1 1 0;min-width:0;width:auto;">📷 Scatta la foto</button>
          <button type="button" id="new-foto-galleria" class="app-button gray" style="flex:1 1 0;min-width:0;width:auto;">🖼 Galleria</button>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Tony guarda la foto e compila la scheda.</div>
        <input id="new-foto-camera" type="file" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1">
        <input id="new-foto-file" type="file" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1">
        <img id="new-foto-prev" alt="" style="display:none;max-width:100%;max-height:200px;border-radius:12px;margin:6px 0;">
        <div id="new-tony" style="display:none;font-size:13px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;margin-bottom:8px;"></div>

        <div class="rf-field">
          <label>Codice interno</label>
          <input id="new-codice" class="input">
        </div>

        <div class="rf-field">
          <label>Descrizione</label>
          <input id="new-descrizione" class="input" value="${escapeHtml(term)}">
        </div>

        <div class="rf-field">
          <label>Unità di misura</label>
          <input id="new-um" class="input" placeholder="kg / pz / lt">
        </div>

        <div class="rf-field">
          <label>Quantità riordino</label>
          <input id="new-scorta" type="number" class="input">
        </div>

        <div class="rf-field" style="position:relative;">
          <label>Fornitore preferito</label>
          <input id="new-fornitore" class="input" placeholder="Scrivi o seleziona..." autocomplete="off">
          <div id="fornitore-suggerimenti" class="rf-search-list" style="position:absolute; top:100%; left:0; right:0; display:none;"></div>
        </div>

        ${_tipoCarico === "materia_prima" ? `
        <div class="rf-field">
          <label>Nome interno prodotto <span style="font-size:11px;color:#6b7280;">(breve, es. "Farina Manitoba")</span></label>
          <input id="new-categoria-interna" class="input" placeholder="es. Farina Manitoba, Petto di pollo...">
        </div>

        <div class="rf-field">
          <input type="hidden" id="new-categoria-bilancio-id" value="7">
        </div>
        ` : `
        <div class="rf-field">
          <label>Ricetta collegata (opzionale)</label>
          <input id="new-ricetta-ref" class="input" placeholder="Nome ricetta di riferimento">
        </div>
        `}

      </div>
    `;

    // foto del prodotto nuovo: si carica e Tony propone nome, marca, formato e unita' di misura
    fotoNuovoUrl = "";
    const fileNuovo = document.getElementById("new-foto-file");
    fileNuovo.onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const tonyEl = document.getElementById("new-tony");
      tonyEl.style.display = "block";
      tonyEl.textContent = "⏳ Carico la foto…";
      try {
        const ridotta = await comprimiImmagine(f, { latoMax: 1200, qualita: 0.8, forza: true });
        document.getElementById("new-foto-prev").src = URL.createObjectURL(ridotta);
        document.getElementById("new-foto-prev").style.display = "block";
        fotoNuovoUrl = await caricaFotoProdotto(f);
      } catch (e) {
        tonyEl.textContent = "Non riesco a caricare la foto: " + ((e && e.message) || "errore") + ". Puoi salvare lo stesso, senza foto.";
        return;
      }
      tonyEl.textContent = "✨ Tony sta guardando la foto…";
      try {
        const { data, error } = await window.supabaseClient.functions.invoke("prodotto-riconosci-foto", { body: { azienda_id: aziendaId, foto_url: fotoNuovoUrl } });
        const p = data && data.proposta;
        if (error || !data || !data.success || !p) throw new Error((data && data.error) || (error && error.message) || "nessuna proposta");
        const desc = document.getElementById("new-descrizione");
        const proposto = [p.nome, p.marca, p.formato].filter(Boolean).join(" ");
        if (proposto && (!desc.value.trim() || desc.value.trim() === String(term || "").trim())) desc.value = proposto;
        const umEl = document.getElementById("new-um");
        if (p.um && !umEl.value.trim()) umEl.value = p.um;
        const interno = document.getElementById("new-categoria-interna");
        if (interno && p.nome && !interno.value.trim()) interno.value = p.nome;
        tonyEl.textContent = "✨ Proposta di Tony: controlla e correggi quello che serve. Il fornitore preferito lo scegli tu.";
      } catch (e) {
        tonyEl.textContent = "Non riesco a riconoscerlo: scrivi tu cos'è, poi salva.";
      }
    };

    const camNuovo = document.getElementById("new-foto-camera");
    camNuovo.onchange = (ev) => fileNuovo.onchange(ev);
    document.getElementById("new-foto-scatta").onclick = () => camNuovo.click();
    document.getElementById("new-foto-galleria").onclick = () => fileNuovo.click();

    const input = document.getElementById("new-fornitore");
    const box = document.getElementById("fornitore-suggerimenti");

    input.oninput = () => {
      const termInput = input.value.toLowerCase().trim();

      if (!termInput) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
      }

      const res = fornitoriCache
        .filter((f) => String(f.ragione_sociale || "").toLowerCase().includes(termInput))
        .slice(0, 5);

      if (!res.length) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
      }

      box.innerHTML = res.map((f) =>
        `<div class="rf-search-item" data-value="${escapeHtml(f.ragione_sociale)}">${escapeHtml(f.ragione_sociale)}</div>`
      ).join("");

      box.style.display = "block";

      box.querySelectorAll(".rf-search-item").forEach((el) => {
        el.onmousedown = (e) => {
          e.preventDefault();
          input.value = el.dataset.value || el.innerText;
          box.style.display = "none";
          box.innerHTML = "";
        };
      });
    };

    input.onblur = () => {
      setTimeout(() => {
        box.style.display = "none";
      }, 150);
    };

    form.style.display = "block";
  }
}

async function loadDettaglioProdotto(aziendaId, prodottoId) {
  let sedeId = null;

  // senza sede attiva la scheda si apre lo stesso: foto, fornitore e anagrafe sono dell'azienda. Mancano solo i movimenti.
  try {
    sedeId = getSedeAttivaId();
  } catch (error) {
    sedeId = null;
  }

  const { data: prodotto, error: prodottoError } = await window.supabaseClient
    .from("prodotti")
    .select("id, codice_interno, nome, descrizione, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id, tipo_prodotto, attivo, foto_url, barcode, contenuto_confezione, um_confezione")
    .eq("azienda_id", aziendaId)
    .eq("id", prodottoId)
    .maybeSingle();

  if (prodottoError || !prodotto) {
    console.error(prodottoError);
    return null;
  }

  const prodottoNormalizzato = normalizeProdotto(prodotto);

  const { data: movimenti, error: movimentiError } = sedeId
    ? await window.supabaseClient
      .from("magazzino_movimenti")
      .select("tipo_movimento, quantita, created_at, causale")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("prodotto_id", prodottoId)
      .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (movimentiError) {
    console.error(movimentiError);
  }

  const storico = movimenti || [];
  const giacenzaDaMovimenti = storico.reduce((sum, movimento) => {
    const q = Number(movimento?.quantita || 0);
    const tipo = String(movimento?.tipo_movimento || "").toLowerCase();

    if (["scarico", "consumo", "rettifica_negativa", "uscita"].includes(tipo)) {
      return sum - q;
    }

    return sum + q;
  }, 0);

  let fornitore = "—";

  if (prodottoNormalizzato.fornitore_preferito_id) {
    const { data: fornitorePreferito } = await window.supabaseClient
      .from("fornitori")
      .select("ragione_sociale, nome")
      .eq("id", prodottoNormalizzato.fornitore_preferito_id)
      .maybeSingle();

    fornitore = fornitorePreferito?.ragione_sociale || fornitorePreferito?.nome || "—";
  }

  if (fornitore === "—") {
    const { data: mapping } = await window.supabaseClient
      .from("prodotti_fornitore")
      .select("fornitori:fornitore_id (ragione_sociale, nome)")
      .eq("prodotto_id", prodottoId)
      .limit(1)
      .maybeSingle();

    fornitore =
      mapping?.fornitori?.ragione_sociale ||
      mapping?.fornitori?.nome ||
      "—";
  }

  return {
    ...prodottoNormalizzato,
    prodotto_id: prodottoNormalizzato.id,
    giacenza_attuale: giacenzaDaMovimenti,
    fornitore,
    ultimi_movimenti: storico.slice(0, 5),
    storico_movimenti: storico
  };
}

function normalizeProdotto(prodotto) {
  const um = prodotto.unita_base || prodotto.unita_misura || prodotto.um || "—";
  const descrizione = prodotto.descrizione || prodotto.nome || "";

  return {
    ...prodotto,
    descrizione,
    unita_base: um,
    scorta_minima: prodotto.scorta_minima ?? prodotto.quantita_riordino ?? 0
  };
}


function renderSchedaCaricoProdotto(prodotto, fornitori = [], opzioni = {}) {
  const optForn = (fornitori || []).map((f) =>
    `<option value="${escapeHtml(String(f.id))}" ${String(f.id) === String(prodotto.fornitore_preferito_id || "") ? "selected" : ""}>${escapeHtml(f.ragione_sociale || "")}</option>`
  ).join("");

  return `
    ${window.state?.sedeAttiva?.id ? "" : `<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:10px;line-height:1.4;">⚠ Nessuna sede attiva: scegli la sede in alto, accanto al nome della società. Serve per registrare il carico e vedere la giacenza. Foto e fornitore preferito si possono segnare lo stesso.</div>`}
    <div class="rf-product-card">

      <div class="rf-product-heading">
        <div class="rf-product-code">${escapeHtml(prodotto.codice_interno || "—")}</div>
        ${opzioni.nuovo ? "" : `<div class="rf-product-title">${escapeHtml(prodotto.descrizione || "")}</div>`}
      </div>

      <div style="display:flex;gap:12px;align-items:center;margin:8px 0 12px;">
        <div style="flex:0 0 96px;">
          <div id="carico-foto-box" role="button" title="Scatta la foto del prodotto" style="width:96px;height:96px;border:2px dashed #94a3b8;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;font-weight:700;color:#0E5A7A;cursor:pointer;overflow:hidden;line-height:1.3;">${prodotto.foto_url ? `<img src="${escapeHtml(prodotto.foto_url)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : "📷<br>Scatta<br>la foto"}</div>
          <button type="button" id="carico-foto-galleria" class="app-button tiny gray" style="margin-top:6px;width:100%;">🖼 Galleria</button>
        </div>
        <input id="carico-foto-camera" type="file" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1">
        <input id="carico-foto-file" type="file" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" tabindex="-1">
        <div style="flex:1;min-width:0;">
          <label style="font-size:12px;font-weight:700;color:#475569;">Fornitore preferito</label>
          <select id="carico-forn-pref" class="input" style="width:100%;margin-top:4px;">
            <option value="">— nessuno —</option>
            ${optForn}
          </select>
          <!-- unità di misura e contenuto del pezzo: nel blocco "Nome del prodotto" qui sotto -->
          <div id="carico-anag-esito" style="font-size:12px;margin-top:4px;min-height:16px;"></div>
        </div>
      </div>
      ${opzioni.nuovo ? `<div style="margin:0 0 12px;">
        <label style="font-size:12px;font-weight:700;color:#475569;">Nome del prodotto <span style="font-weight:400;">(letto da Tony: correggilo se serve)</span></label>
        <input id="carico-nome" class="input" style="width:100%;margin-top:4px;" value="${escapeHtml(prodotto.descrizione || "")}" autocomplete="off">
        <div style="display:flex;gap:8px;margin-top:8px;align-items:flex-end;">
          <div style="flex:1 1 0;min-width:0;">
            <label style="font-size:12px;font-weight:700;color:#475569;">Si conta in</label>
            <select id="carico-um-sel" class="input" style="width:100%;margin-top:4px;">
              ${[["pz", "pezzi"], ["kg", "kg"], ["lt", "litri"]].map(([u, nomeU]) => `<option value="${u}" ${String(prodotto.unita_base || "pz") === u ? "selected" : ""}>${nomeU}</option>`).join("")}
            </select>
          </div>
          <div id="carico-cont-box" style="flex:1.4 1 0;min-width:0;${String(prodotto.unita_base || "pz") === "pz" ? "" : "display:none;"}">
            <label style="font-size:12px;font-weight:700;color:#475569;">Ogni pezzo contiene</label>
            <div style="display:flex;gap:6px;margin-top:4px;">
              <input id="carico-cont" type="number" step="0.001" min="0" inputmode="decimal" class="input" style="flex:1 1 0;min-width:0;" value="${prodotto.contenuto_confezione ? escapeHtml(String(prodotto.contenuto_confezione)) : ""}">
              <select id="carico-cont-um" class="input" style="flex:0 0 74px;">
                ${["g", "kg", "ml", "lt"].map((u) => `<option value="${u}" ${String(prodotto.um_confezione || "g") === u ? "selected" : ""}>${u}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </div>` : ""}

      <div style="font-size:13px;color:#475569;margin:2px 0 4px;">Giacenza attuale: <b>${formatNumber(prodotto.giacenza_attuale)}</b> ${escapeHtml(prodotto.unita_base || "")}${prodotto.scorta_minima ? ` · scorta minima ${formatNumber(prodotto.scorta_minima)}` : ""}</div>

      <details style="margin-top:6px;">
        <summary style="font-size:13px;color:#0E5A7A;cursor:pointer;">Ultimi movimenti</summary>
        <div class="rf-mov-list">
          ${(prodotto.ultimi_movimenti || []).length
            ? prodotto.ultimi_movimenti.map((m) => `
              <div class="rf-mov-item">
                <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
                <div class="rf-mov-meta">${formatDateTime(m.created_at)}</div>
              </div>
            `).join("")
            : `<div class="rf-empty-state">Nessun movimento recente</div>`
          }
        </div>
      </details>

    </div>
  `;
}

function sanitizeSearchTerm(value) {
  return String(value ?? "").replace(/[%,'"]/g, "");
}

function getSedeAttivaId() {
  const sedeId = window.state?.sedeAttiva?.id ?? null;

  if (!sedeId) {
    throw new Error("Sede attiva non trovata");
  }

  return String(sedeId);
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("it-IT");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
