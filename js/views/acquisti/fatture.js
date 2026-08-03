import {
  escapeHtml,
  parseLocaleNumber,
  formatMoney,
  normalizeInputDate,
  safeFileName,
  computeRowsTotal,
  normalizeText,
  normalizePiva,
  normalizeCodiceInterno
} from "./utils.js";

import {
  findBestProductMatch,
  loadProdottiAliasOcr,
  saveProdottoAliasOcr
} from "./ocr.js";

import "../../db.js";

const CATEGORIE_GESTIONE_ACQUISTI = [
  { id: "acquisto_merci", nome: "ACQUISTO DI MERCI", categoriaBilancioSuggerita: "ACQUISTO DI MERCI" },
  { id: "servizi_terzi", nome: "SERVIZI DI TERZI", categoriaBilancioSuggerita: "SERVIZI DI TERZI" },
  { id: "energia_elettrica", nome: "ENERGIA ELETTRICA", categoriaBilancioSuggerita: "ENERGIA ELETTRICA" },
  { id: "spese_telefoniche", nome: "SPESE TELEFONICHE", categoriaBilancioSuggerita: "SPESE TELEFONICHE" },
  { id: "materiale_consumo", nome: "MATERIALE DI CONSUMO", categoriaBilancioSuggerita: "MATERIALE DI CONSUMO" },
  { id: "manutenzione_riparazione", nome: "MANUTENZIONE E RIPARAZIONE", categoriaBilancioSuggerita: "SPESE MANUTENZIONE E RIPARAZIONE" },
  { id: "software", nome: "SOFTWARE APPLICATIVI", categoriaBilancioSuggerita: "SOFTWARE APPLICATIVI" },
  { id: "consulenze", nome: "CONSULENZE", categoriaBilancioSuggerita: "CONSULENZE" },
  { id: "carburante", nome: "CARBURANTE", categoriaBilancioSuggerita: "CARBURANTE" },
  { id: "assicurazioni", nome: "ASSICURAZIONI", categoriaBilancioSuggerita: "ASSICURAZIONI" },
  { id: "abbigliamento_lavoro", nome: "ABBIGLIAMENTO LAVORO", categoriaBilancioSuggerita: "ABBIGLIAMENTO LAVORO" },
  { id: "spese_accessorie", nome: "SPESE ACCESSORIE", categoriaBilancioSuggerita: "SPESE ACCESSORIE" }
];

export async function renderFatture(container, azienda) {
  // Variabile per categoria bilancio classificata dall'AI
  let categoriaBilancioSuggerita = null; // { id, nome, codice_conto, confidenza, motivo }
  ensureAcquistiModalStyles();

  container.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0;">Acquisti · Fatture / DDT</h3>
          <div style="font-size:13px; color:#667085; margin-top:4px;"></div>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="btn-carica-documento" class="btn-primary">Carica documento</button>
          <button id="btn-carica-xml" style="background:#0f766e;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;">📄 Carica XML fattura</button>
          <input type="file" id="input-xml-fattura" accept=".xml" style="display:none;">
          <button id="btn-scarica-acquisti" style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;">📥 Scarica CSV</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
        <div>
          <label style="display:block; font-size:13px; margin-bottom:6px;">Fornitore</label>
          <input id="filter-fornitore" class="input" placeholder="Cerca per fornitore" />
        </div>
        <div>
          <label style="display:block; font-size:13px; margin-bottom:6px;">Prodotto</label>
          <input id="filter-prodotto" class="input" placeholder="Cerca prodotto (storico prezzi)" />
        </div>
        <div>
          <label style="display:block; font-size:13px; margin-bottom:6px;">Data dal</label>
          <input id="filter-data-da" type="date" class="input" />
        </div>
        <div>
          <label style="display:block; font-size:13px; margin-bottom:6px;">Data al</label>
          <input id="filter-data-a" type="date" class="input" />
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        <button id="btn-cerca-documenti" class="btn-secondary">Cerca</button>
        <button id="btn-reset-documenti" class="btn-secondary">Reset</button>
      </div>

      <div id="documenti-search-feedback" style="margin-top:12px; font-size:13px; color:#667085;">
        Inserisci fornitore e/o intervallo date per cercare i documenti.
      </div>

      <div id="documenti-results" style="margin-top:14px;"></div>
    </div>
  `;

  // === Ricerca per prodotto: storico prezzi nelle righe fattura ===
  async function cercaStoricoPrezzi(term) {
    const supa = window.supabaseClient || window.supabase;
    const box = resultsWrap;
    const t = (term || "").trim();
    if (t.length < 2) { feedback.textContent = "Scrivi almeno 2 lettere del prodotto."; box.innerHTML = ""; return; }
    feedback.textContent = 'Cerco "' + t + '" nelle fatture...';
    box.innerHTML = "";
    try {
      const rows = [];
      // Fatture elettroniche (righe in fiscale_documenti_righe)
      const { data: rf } = await supa.from("fiscale_documenti_righe")
        .select("documento_id, descrizione_originale, quantita, unita_misura, prezzo_unitario")
        .eq("azienda_id", azienda.id).ilike("descrizione_originale", "%" + t + "%").limit(400);
      const docIds = [...new Set((rf || []).map(r => r.documento_id).filter(Boolean))];
      const docHeads = {};
      if (docIds.length) {
        const { data: docs } = await supa.from("fiscale_documenti").select("id, data_documento, fornitore_id").in("id", docIds);
        const fornIds = [...new Set((docs || []).map(d => d.fornitore_id).filter(Boolean))];
        const fornMap = {};
        if (fornIds.length) {
          const { data: forn } = await supa.from("fornitori").select("id, ragione_sociale").in("id", fornIds);
          (forn || []).forEach(f => { fornMap[f.id] = f.ragione_sociale; });
        }
        (docs || []).forEach(d => { docHeads[d.id] = { data: d.data_documento, fornitore: fornMap[d.fornitore_id] || "—" }; });
      }
      (rf || []).forEach(r => {
        const h = docHeads[r.documento_id] || {};
        rows.push({ data: h.data, fornitore: h.fornitore || "—", desc: r.descrizione_originale, qta: r.quantita, um: r.unita_misura, prezzo: r.prezzo_unitario });
      });
      // Fatture tradizionali (righe in fatture_acquisto_righe)
      const { data: rt } = await supa.from("fatture_acquisto_righe")
        .select("fattura_id, descrizione, quantita, unita_misura, prezzo_unitario")
        .ilike("descrizione", "%" + t + "%").limit(400);
      const fattIds = [...new Set((rt || []).map(r => r.fattura_id).filter(Boolean))];
      const fHeads = {};
      if (fattIds.length) {
        const { data: fatt } = await supa.from("fatture_acquisto")
          .select("id, data_documento, fornitori(ragione_sociale)").in("id", fattIds).eq("azienda_id", azienda.id);
        (fatt || []).forEach(f => { fHeads[f.id] = f; });
      }
      (rt || []).forEach(r => {
        if (!fHeads[r.fattura_id]) return;
        const h = fHeads[r.fattura_id];
        rows.push({ data: h.data_documento, fornitore: h.fornitori?.ragione_sociale || "—", desc: r.descrizione, qta: r.quantita, um: r.unita_misura, prezzo: r.prezzo_unitario });
      });
      rows.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
      if (!rows.length) { feedback.textContent = 'Nessuna riga trovata per "' + t + '".'; box.innerHTML = ""; return; }
      const u = rows[0];
      feedback.textContent = "Trovate " + rows.length + " righe per \"" + t + "\".";
      box.innerHTML =
        '<div style="margin-bottom:10px;font-size:14px;padding:8px 10px;background:#f0fdfa;border-radius:8px;">Ultimo prezzo: <b>€ ' + formatMoney(u.prezzo || 0) + '</b>' + (u.um ? ' / ' + escapeHtml(u.um) : '') + ' · ' + escapeHtml(u.fornitore) + ' · ' + escapeHtml(u.data || "") + '</div>' +
        '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;color:#64748b;">' +
        '<th style="padding:5px 6px;">Data</th><th style="padding:5px 6px;">Fornitore</th><th style="padding:5px 6px;">Descrizione</th><th style="padding:5px 6px;text-align:right;">Q.tà</th><th style="padding:5px 6px;text-align:right;">Prezzo unit.</th></tr></thead><tbody>' +
        rows.map(r => '<tr style="border-top:1px solid #f1f5f9;"><td style="padding:5px 6px;white-space:nowrap;">' + escapeHtml(r.data || "") + '</td><td style="padding:5px 6px;">' + escapeHtml(r.fornitore) + '</td><td style="padding:5px 6px;">' + escapeHtml(r.desc || "") + '</td><td style="padding:5px 6px;text-align:right;white-space:nowrap;">' + escapeHtml(String(r.qta ?? "")) + ' ' + escapeHtml(r.um || "") + '</td><td style="padding:5px 6px;text-align:right;font-weight:600;white-space:nowrap;">€ ' + formatMoney(r.prezzo || 0) + '</td></tr>').join("") +
        '</tbody></table></div>';
    } catch (e) { feedback.textContent = "Errore nella ricerca prodotto."; console.error("Storico prezzi:", e); }
  }

  // Scarica CSV acquisti
  container.querySelector('#btn-scarica-acquisti')?.addEventListener('click', async () => {
    const aziendaId = window.state?.azienda?.id;
    if (!aziendaId) return;
    const { data } = await (window.supabaseClient||window.supabase)
      .from('fatture_acquisto')
      .select('data_documento,numero_documento,imponibile,iva,totale,classificazione_ok,categorie_bilancio(nome,codice_conto),fornitori(ragione_sociale)')
      .eq('azienda_id', aziendaId)
      .order('data_documento', { ascending: false })
      .limit(5000);
    const rows = [['Data','Numero','Fornitore','Categoria bilancio','Conto','Imponibile','IVA','Totale','Confermata']];
    (data||[]).forEach(r => rows.push([
      r.data_documento||'',
      r.numero_documento||'',
      r.fornitori?.ragione_sociale||'',
      r.categorie_bilancio?.nome||'Non classificata',
      r.categorie_bilancio?.codice_conto||'',
      String(r.imponibile||0).replace('.',','),
      String(r.iva||0).replace('.',','),
      String(r.totale||0).replace('.',','),
      r.classificazione_ok ? 'Sì' : 'No'
    ]));
    const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download='acquisti_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  const inputFornitore = container.querySelector("#filter-fornitore");
  const inputDataDa = container.querySelector("#filter-data-da");
  const inputDataA = container.querySelector("#filter-data-a");
  const btnCerca = container.querySelector("#btn-cerca-documenti");
  const btnReset = container.querySelector("#btn-reset-documenti");
  const btnCarica = container.querySelector("#btn-carica-documento");
  const feedback = container.querySelector("#documenti-search-feedback");
  const resultsWrap = container.querySelector("#documenti-results");

  // ── CARICAMENTO XML FATTURA ELETTRONICA (Hub Fiscale) ──
  const FISCALE_PARSE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/fiscale-parse";
  const RF_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";
  const btnXml = container.querySelector("#btn-carica-xml");
  const inputXml = container.querySelector("#input-xml-fattura");
  if (btnXml && inputXml) {
    btnXml.addEventListener("click", () => inputXml.click());
    inputXml.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const testoOrig = btnXml.textContent;
      btnXml.disabled = true; btnXml.textContent = "⏳ Elaboro...";
      try {
        const xmlText = await file.text();
        const supa = window.supabaseClient || window.supabase;
        const { data: sess } = await supa.auth.getSession();
        const token = sess?.session?.access_token;
        const res = await fetch(FISCALE_PARSE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + (token || ""),
            "apikey": RF_ANON_KEY
          },
          body: JSON.stringify({
            azione: "parse_xml",
            azienda_id: azienda.id,
            sede_id: window.state?.sede?.id || null,
            origine: "manuale",
            xml_text: xmlText
          })
        });
        const d = await res.json();
        if (d.success) {
          // Apri subito il popup di assegnazione categorie sulle righe importate
          let docId = d.documento_id || d.documentoId || d.id || null;
          if (!docId) {
            const { data: doc } = await supa.from("fiscale_documenti")
              .select("id").eq("azienda_id", azienda.id)
              .order("created_at", { ascending: false }).limit(1).maybeSingle();
            docId = doc?.id || null;
          }
          if (docId) {
            apriPopupCategorie(docId, d);
          } else {
            alert("✅ Fattura importata (" + (d.righe || 0) + " righe). Aprila da 'Vedi righe' per assegnare le categorie.");
          }
        } else if (res.status === 409) {
          alert("ℹ️ Questa fattura è già stata importata.");
        } else {
          alert("❌ " + (d.error || "Errore durante l'import."));
        }
      } catch (err) {
        alert("❌ Errore: " + (err && err.message ? err.message : err));
      } finally {
        btnXml.disabled = false; btnXml.textContent = testoOrig;
        inputXml.value = "";
      }
    });
  }

  function apriPopupCategorie(documentoId, info) {
    const m = document.createElement("div");
    m.innerHTML =
      '<div class="rf-modal-backdrop"><div class="rf-modal" style="max-width:840px;width:96%;">' +
      '<div class="rf-modal-header"><h3 class="rf-modal-title">🏷️ Assegna categorie — ' + escapeHtml(info?.fornitore || "fattura") + '</h3>' +
      '<button id="catx-close" style="background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#64748b;">✕</button></div>' +
      '<div class="rf-modal-body" id="catx-box" style="max-height:72vh;overflow:auto;"><div style="color:#94a3b8;font-size:13px;">Caricamento righe…</div></div>' +
      '<div class="rf-modal-actions"><button id="catx-fine" class="btn-primary">Fatto</button></div>' +
      '</div></div>';
    document.body.appendChild(m);
    document.body.classList.add("rf-modal-open");
    const chiudi = () => { m.remove(); document.body.classList.remove("rf-modal-open"); if (typeof eseguiRicerca === "function") eseguiRicerca(); };
    m.querySelector("#catx-close").onclick = chiudi;
    m.querySelector("#catx-fine").onclick = chiudi;
    renderRigheFiscali(m.querySelector("#catx-box"), documentoId, azienda);
  }

  function renderDocumentResults(rows) {
    if (!rows.length) {
      resultsWrap.innerHTML = `
        <div class="rf-empty-righe">
          Nessun documento trovato con i filtri selezionati.
        </div>
      `;
      return;
    }

    resultsWrap.innerHTML = `
      <div class="rf-doc-list">
        ${rows.map((row) => `
          <div class="rf-doc-item" ${row.tipo === "fattura" && row.id ? `data-fattura-id="${escapeHtml(String(row.id))}"${row.documentoFiscaleId ? ` data-doc-fiscale="${escapeHtml(String(row.documentoFiscaleId))}"` : ""} style="cursor:pointer;"` : ""}>
            <div class="rf-doc-top" style="display:flex;align-items:center;gap:8px;">
              ${row.tipo === "fattura" ? semaforoDot(row.stato_cat) : ""}
              <div class="rf-doc-badge ${row.tipo === "ddt" ? "ddt" : "fattura"}">${escapeHtml(row.tipo.toUpperCase())}</div>
              ${row.origine === "xml" ? `<span style="font-size:10px;font-weight:700;color:#6366f1;border:1px solid #c7d2fe;background:#eef2ff;border-radius:5px;padding:1px 5px;">XML</span>` : ""}
              <div class="rf-doc-date" style="margin-left:auto;">${escapeHtml(row.data || "-")}</div>
            </div>
            <div class="rf-doc-title">${escapeHtml(row.fornitore || "Fornitore non definito")}</div>
            <div class="rf-doc-meta">
              <span>Numero: ${escapeHtml(row.numero || "-")}</span>
              ${row.tipo === "fattura" ? `<span>Totale: € ${escapeHtml(formatMoney(row.totale || 0))}</span>` : ""}
              ${row.stato ? `<span>Stato: ${escapeHtml(row.stato)}</span>` : ""}
              ${row.tipo === "fattura" && row.id ? `<span style="color:#0f766e;font-weight:600;">▸ Vedi righe</span>` : ""}
            </div>
            ${row.tipo === "fattura" && row.id ? `<div class="rf-righe-dettaglio" id="righe-${escapeHtml(String(row.id))}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px dashed #e5e7eb;"></div>` : ""}
          </div>
        `).join("")}
      </div>
    `;

    // Click su una fattura → carica e mostra/nasconde le righe
    resultsWrap.querySelectorAll("[data-fattura-id]").forEach((el) => {
      el.addEventListener("click", async () => {
        const fatturaId = el.getAttribute("data-fattura-id");
        const box = document.getElementById("righe-" + fatturaId);
        if (!box) return;
        if (box.style.display === "block") { box.style.display = "none"; return; }
        box.style.display = "block";
        if (box.dataset.caricato === "1") return;
        box.innerHTML = `<div style="color:#94a3b8;font-size:13px;">Caricamento righe...</div>`;
        try {
          const docFiscale = el.getAttribute("data-doc-fiscale");
          if (docFiscale) {
            // Fattura XML: interfaccia di abbinamento prodotti
            await renderRigheFiscali(box, docFiscale, azienda);
            box.dataset.caricato = "1";
            return;
          }
          let rr = [];
          {
            // Fattura tradizionale: righe in fatture_acquisto_righe.
            // Client diretto (no window.db che forza la sede): filtro per fattura.
            const supaDir = window.supabaseClient || window.supabase;
            const { data: mie, error } = await supaDir.from("fatture_acquisto_righe")
              .select("id, fattura_id, riga_numero, descrizione, quantita, unita_misura, prezzo_unitario, iva_percent, totale_riga")
              .eq("fattura_id", fatturaId);
            if (error) throw error;
            rr = (mie || []).sort((a,b) => (a.riga_numero||0) - (b.riga_numero||0));
          }
          if (!rr.length) {
            box.innerHTML = `<div style="color:#94a3b8;font-size:13px;">Nessuna riga di dettaglio per questa fattura.</div>`;
          } else {
            box.innerHTML = `
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="text-align:left;color:#64748b;">
                  <th style="padding:4px 6px;">Descrizione</th>
                  <th style="padding:4px 6px;text-align:right;">Q.tà</th>
                  <th style="padding:4px 6px;">UM</th>
                  <th style="padding:4px 6px;text-align:right;">Prezzo</th>
                  <th style="padding:4px 6px;text-align:right;">Totale</th>
                </tr></thead>
                <tbody>
                  ${rr.map(r => `
                    <tr style="border-top:1px solid #f1f5f9;">
                      <td style="padding:4px 6px;">${escapeHtml(r.descrizione || "-")}</td>
                      <td style="padding:4px 6px;text-align:right;">${escapeHtml(String(r.quantita ?? "-"))}</td>
                      <td style="padding:4px 6px;">${escapeHtml(r.unita_misura || "")}</td>
                      <td style="padding:4px 6px;text-align:right;">€ ${escapeHtml(formatMoney(r.prezzo_unitario || 0))}</td>
                      <td style="padding:4px 6px;text-align:right;">€ ${escapeHtml(formatMoney(r.totale_riga || 0))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>`;
          }
          box.dataset.caricato = "1";
        } catch (err) {
          box.innerHTML = `<div style="color:#dc2626;font-size:13px;">Errore nel caricamento delle righe.</div>`;
          console.error("Righe fattura:", err);
        }
      });
    });
  }

  async function eseguiRicerca() {
    const prodotto = String((container.querySelector("#filter-prodotto")?.value) || "").trim();
    if (prodotto) { await cercaStoricoPrezzi(prodotto); return; }
    const fornitore = String(inputFornitore.value || "").trim();
    const dataDa = String(inputDataDa.value || "").trim();
    const dataA = String(inputDataA.value || "").trim();

    feedback.textContent = "Caricamento documenti...";
    const rows = await searchDocumenti(azienda, { fornitore, dataDa, dataA });

    if (!rows.length) {
      feedback.textContent = "Nessun documento trovato.";
      renderDocumentResults([]);
      return;
    }
    feedback.textContent = `Trovati ${rows.length} documenti.`;
    renderDocumentResults(rows);
  }

  btnCerca.addEventListener("click", eseguiRicerca);
  container.querySelector("#filter-prodotto")?.addEventListener("keydown", (e) => { if (e.key === "Enter") eseguiRicerca(); });
  let _prodDebounce;
  container.querySelector("#filter-prodotto")?.addEventListener("input", (e) => {
    const v = e.target.value;
    clearTimeout(_prodDebounce);
    if (v.trim().length < 2) { if (feedback) feedback.textContent = ""; if (resultsWrap) resultsWrap.innerHTML = ""; return; }
    _prodDebounce = setTimeout(() => cercaStoricoPrezzi(v), 300);
  });
  inputFornitore.addEventListener("keydown", (e) => { if (e.key === "Enter") eseguiRicerca(); });

  // Caricamento automatico all'apertura della vista (tutte le fatture recenti)
  eseguiRicerca();

  btnReset.addEventListener("click", () => {
    inputFornitore.value = "";
    const fp = container.querySelector("#filter-prodotto"); if (fp) fp.value = "";
    inputDataDa.value = "";
    inputDataA.value = "";
    feedback.textContent = "Filtri azzerati.";
    resultsWrap.innerHTML = "";
    eseguiRicerca();
  });

  btnCarica.addEventListener("click", async () => {
    await openDocumentoUploadModal(azienda);
  });
}

// ── Semaforo classificazione (categoria bilancio + categoria interna) ──
// Regole confermate: bilancio "presente" = valorizzato e ≠ 7 (default "Acquisti di merci").
//                    interna  "presente" = valorizzata, non vuota e ≠ "Varie".
function _catBilancioOk(v) { return v != null; }
function _catInternaOk(t) {
  if (!t) return false;
  const s = String(t).trim().toLowerCase();
  return s !== "" && s !== "varie";
}
function _statoRiga(haBil, haInt) {
  const n = (haBil ? 1 : 0) + (haInt ? 1 : 0);
  return n === 2 ? "green" : (n === 1 ? "yellow" : "red");
}
function _peggioreStato(list) {
  if (list.includes("red")) return "red";
  if (list.includes("yellow")) return "yellow";
  if (list.length) return "green";
  return "red"; // fattura senza righe = da lavorare
}
function semaforoDot(stato) {
  const col = { red: "#dc2626", yellow: "#f59e0b", green: "#16a34a" };
  const lbl = { red: "Da classificare", yellow: "Classificazione incompleta", green: "Classificata" };
  const c = col[stato] || "#94a3b8";
  return '<span class="rf-sem-dot" title="' + (lbl[stato] || "") + '" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + c + ';flex:0 0 auto;"></span>';
}

// Calcola lo stato-categorie di ogni fattura a partire dai prodotti agganciati alle righe.
async function calcolaStatoCategorie(supa, azienda, fatture, fiscali) {
  try {
    // Fatture "tradizionali" (senza documento fiscale) -> righe in fatture_acquisto_righe.
    // Fatture da XML (con documentoFiscaleId) e documenti fiscali -> righe in fiscale_documenti_righe.
    const fatturaTradIds = fatture.filter((f) => !f.documentoFiscaleId).map((f) => f.id);
    const fiscaleDocIds = new Set();
    fiscali.forEach((f) => fiscaleDocIds.add(String(f.id)));
    fatture.forEach((f) => { if (f.documentoFiscaleId) fiscaleDocIds.add(String(f.documentoFiscaleId)); });

    const [righeFattRes, righeFiscRes] = await Promise.all([
      fatturaTradIds.length
        ? supa.from("fatture_acquisto_righe").select("fattura_id, prodotto_id").in("fattura_id", fatturaTradIds)
        : Promise.resolve({ data: [] }),
      fiscaleDocIds.size
        ? supa.from("fiscale_documenti_righe").select("documento_id, prodotto_id").in("documento_id", Array.from(fiscaleDocIds))
        : Promise.resolve({ data: [] })
    ]);
    const righeFatt = righeFattRes.data || [];
    const righeFisc = righeFiscRes.data || [];

    const prodIds = new Set();
    righeFatt.forEach((r) => { if (r.prodotto_id) prodIds.add(r.prodotto_id); });
    righeFisc.forEach((r) => { if (r.prodotto_id) prodIds.add(r.prodotto_id); });

    const mappaProd = new Map();
    if (prodIds.size) {
      const { data: prods } = await supa.from("prodotti")
        .select("id, categoria_bilancio_id, categoria_interna")
        .in("id", Array.from(prodIds));
      (prods || []).forEach((p) => {
        mappaProd.set(String(p.id), _statoRiga(_catBilancioOk(p.categoria_bilancio_id), _catInternaOk(p.categoria_interna)));
      });
    }

    function statoDoc(righe, keyField, docId) {
      const rr = righe.filter((r) => String(r[keyField]) === String(docId));
      if (!rr.length) return "red";
      return _peggioreStato(rr.map((r) => (r.prodotto_id ? (mappaProd.get(String(r.prodotto_id)) || "red") : "red")));
    }

    fatture.forEach((f) => {
      f.stato_cat = f.documentoFiscaleId
        ? statoDoc(righeFisc, "documento_id", f.documentoFiscaleId)
        : statoDoc(righeFatt, "fattura_id", f.id);
    });
    fiscali.forEach((f) => { f.stato_cat = statoDoc(righeFisc, "documento_id", f.id); });
  } catch (e) {
    console.error("calcolaStatoCategorie:", e);
  }
}

async function searchDocumenti(azienda, filters) {
  try {
    // Fatture/DDT di acquisto sono AZIENDALI (senza sede_id): client diretto, filtro solo per azienda_id.
    const supaDir = window.supabaseClient || window.supabase;
    const [fattureRes, fiscaliRes, ddtRes] = await Promise.all([
      supaDir
        .from("fatture_acquisto")
        .select(`
          id,
          numero_documento,
          data_documento,
          totale,
          stato,
          origine,
          import_external_id,
          fornitori:fornitore_id ( ragione_sociale )
        `)
        .eq("azienda_id", azienda.id)
        .order("data_documento", { ascending: false }),
      supaDir
        .from("fiscale_documenti")
        .select(`
          id,
          numero_documento,
          data_documento,
          totale,
          stato,
          fornitori:fornitore_id ( ragione_sociale )
        `)
        .eq("azienda_id", azienda.id)
        .order("data_documento", { ascending: false }),
      supaDir
        .from("ddt_acquisto")
        .select(`
          id,
          numero_ddt,
          data_ddt,
          fornitori:fornitore_id ( ragione_sociale )
        `)
        .eq("azienda_id", azienda.id)
        .order("data_ddt", { ascending: false })
    ]);

    if (fattureRes.error) { console.error(fattureRes.error); return []; }
    if (ddtRes.error) { console.error(ddtRes.error); return []; }

    const fattureRaw = fattureRes.data || [];
    // Se la query fiscale fallisce non blocco la lista: mostro solo le tradizionali.
    const fiscaliRaw = (fiscaliRes && !fiscaliRes.error) ? (fiscaliRes.data || []) : [];
    if (fiscaliRes && fiscaliRes.error) console.error("fiscale_documenti:", fiscaliRes.error);

    // Dedup: nascondo i documenti fiscali già collegati a una fattura_acquisto (import_external_id).
    const idFiscaliCollegati = new Set(
      fattureRaw.map((f) => f.import_external_id).filter(Boolean).map(String)
    );

    const fatture = fattureRaw.map((f) => ({
      id: f.id,
      tipo: "fattura",
      fonte: "fattura",
      data: f.data_documento || "",
      fornitore: f.fornitori?.ragione_sociale || "",
      numero: f.numero_documento || "",
      totale: f.totale || 0,
      stato: f.stato || "",
      origine: f.origine || "",
      documentoFiscaleId: f.import_external_id || null,
      stato_cat: "red"
    }));

    const fiscali = fiscaliRaw
      .filter((fd) => !idFiscaliCollegati.has(String(fd.id)))
      .map((fd) => ({
        id: fd.id,
        tipo: "fattura",
        fonte: "fiscale",
        data: fd.data_documento || "",
        fornitore: fd.fornitori?.ragione_sociale || "",
        numero: fd.numero_documento || "",
        totale: fd.totale || 0,
        stato: fd.stato || "",
        origine: "xml",
        documentoFiscaleId: fd.id,
        stato_cat: "red"
      }));

    const ddt = (ddtRes.data || []).map((d) => ({
      tipo: "ddt",
      fonte: "ddt",
      data: d.data_ddt || "",
      fornitore: d.fornitori?.ragione_sociale || "",
      numero: d.numero_ddt || "",
      totale: 0,
      stato: ""
    }));

    // Semaforo classificazione per ogni fattura (tradizionale + XML).
    await calcolaStatoCategorie(supaDir, azienda, fatture, fiscali);

    const fornitoreNeedle = String(filters?.fornitore || "").trim().toLowerCase();
    const dataDa = String(filters?.dataDa || "").trim();
    const dataA = String(filters?.dataA || "").trim();

    return [...fatture, ...fiscali, ...ddt]
      .filter((row) => {
        const fornitoreOk = !fornitoreNeedle || String(row.fornitore || "").toLowerCase().includes(fornitoreNeedle);
        const dataOkDa = !dataDa || (row.data && row.data >= dataDa);
        const dataOkA = !dataA || (row.data && row.data <= dataA);
        return fornitoreOk && dataOkDa && dataOkA;
      })
      .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
  } catch (error) {
    console.error("Errore searchDocumenti:", error);
    return [];
  }
}

async function openDocumentoUploadModal(azienda) {
  ensureAcquistiModalStyles();

  const supabase = window.supabaseClient;

  const [fornitoriRes, prodottiRes, aliasCache] = await Promise.all([
    supabase
      .from("fornitori")
      .select("id, ragione_sociale, partita_iva")
      .eq("azienda_id", azienda.id)
      .order("ragione_sociale", { ascending: true }),
    supabase
      .from("prodotti")
      .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, categoria_interna_id, quantita_riordino, scorta_minima")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("nome", { ascending: true })
      .limit(3000),
    loadProdottiAliasOcr(supabase, azienda.id)
  ]);

  const fornitori = fornitoriRes.data || [];
  const prodottiCache = (prodottiRes.data || []).map((p) => ({
    id: p.id,
    nome: p.nome || "",
    descrizione: String(p.descrizione || "").trim(),
    codice_interno: p.codice_interno || "",
    um: p.um || "",
    categoria_bilancio_id: p.categoria_bilancio_id ?? null,
    categoria_interna_id: p.categoria_interna_id ?? null,
    quantita_riordino: p.quantita_riordino ?? 0,
    scorta_minima: p.scorta_minima ?? 0
  }));

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div class="rf-modal-backdrop">
      <div class="rf-modal">
        <div class="rf-modal-header">
          <h3 class="rf-modal-title">Carica documento</h3>
          <button type="button" id="rf-close-top" class="rf-close-icon">✕</button>
        </div>

        <div class="rf-modal-body">
          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Tipo documento</label>
              <select id="rf-tipo-documento" class="input">
                <option value="fattura">Fattura</option>
                <option value="ddt">DDT</option>
              </select>
            </div>
            <div class="rf-field">
              <label>Metodo</label>
              <select id="rf-metodo" class="input">
                <option value="carica_documento">Carica documento</option>
                <option value="manuale">Manuale</option>
              </select>
            </div>
          </div>

          <div id="rf-upload-wrap" class="rf-field">
            <label>Documento</label>
            <input id="rf-file" type="file" class="input" accept="image/*,.pdf" />
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Fornitore</label>
              <input id="rf-fornitore" class="input" list="rf-fornitori-list" placeholder="Scrivi o seleziona il fornitore" autocomplete="off" />
              <datalist id="rf-fornitori-list">
                ${fornitori.map((f) => `<option value="${escapeHtml(f.ragione_sociale || "")}"></option>`).join("")}
              </datalist>
            </div>
            <div class="rf-field">
              <label>P.IVA fornitore</label>
              <input id="rf-fornitore-piva" class="input" placeholder="P.IVA OCR o manuale" />
            </div>
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label id="rf-numero-label">Numero documento</label>
              <input id="rf-numero" class="input" />
            </div>
            <div class="rf-field">
              <label id="rf-data-label">Data documento</label>
              <input id="rf-data" type="date" class="input" />
            </div>
          </div>

          <div id="rf-totale-wrap" class="rf-field">
            <label>Totale</label>
            <input id="rf-totale" class="input" placeholder="0,00" />
          </div>

          <div class="rf-field">
            <div class="rf-righe-header">
              <label style="margin:0;">Righe documento</label>
              <button type="button" id="btn-add-riga" class="btn-secondary">Aggiungi riga</button>
            </div>
            <div id="righe-container" class="rf-righe-wrap"></div>
          </div>

          <div id="rf-feedback" class="rf-feedback"></div>
        </div>

        <div class="rf-modal-actions">
          <button type="button" id="rf-save" class="btn-primary">Salva documento</button>
          <button type="button" id="rf-close-bottom" class="btn-secondary">Chiudi</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("rf-modal-open");

  const elTipoDocumento = modal.querySelector("#rf-tipo-documento");
  const elMetodo = modal.querySelector("#rf-metodo");
  const elUploadWrap = modal.querySelector("#rf-upload-wrap");
  const elFile = modal.querySelector("#rf-file");
  const elFornitore = modal.querySelector("#rf-fornitore");
  const elFornitorePiva = modal.querySelector("#rf-fornitore-piva");
  const elNumero = modal.querySelector("#rf-numero");
  const elData = modal.querySelector("#rf-data");
  const elTotaleWrap = modal.querySelector("#rf-totale-wrap");
  const elTotale = modal.querySelector("#rf-totale");
  const elFeedback = modal.querySelector("#rf-feedback");
  const elNumeroLabel = modal.querySelector("#rf-numero-label");
  const elDataLabel = modal.querySelector("#rf-data-label");
  const btnAddRiga = modal.querySelector("#btn-add-riga");
  const btnSave = modal.querySelector("#rf-save");
  const btnCloseTop = modal.querySelector("#rf-close-top");
  const btnCloseBottom = modal.querySelector("#rf-close-bottom");
  const righeContainer = modal.querySelector("#righe-container");

  let righe = [];
  let isUploadingOcr = false;

  function closeModal() {
    document.body.classList.remove("rf-modal-open");
    modal.remove();
  }

  function setFeedback(message, isError = false) {
    elFeedback.textContent = message || "";
    elFeedback.style.color = isError ? "#b42318" : "#166534";
  }

  function findProdottoByDescrizione(nome) {
    return findBestProductMatch(nome, prodottiCache, aliasCache);
  }

  function updateLabels() {
    const isDDT = elTipoDocumento.value === "ddt";
    elNumeroLabel.textContent = isDDT ? "Numero DDT" : "Numero documento";
    elDataLabel.textContent = isDDT ? "Data DDT" : "Data documento";
    elTotaleWrap.style.display = isDDT ? "none" : "grid";
  }

  function updateMetodoUI() {
    const isManuale = elMetodo.value === "manuale";
    elUploadWrap.style.display = isManuale ? "none" : "grid";
    btnAddRiga.style.display = "inline-flex";
  }

  function updateTotaleFromRighe() {
    if (elTipoDocumento.value !== "fattura") return;
    const total = computeRowsTotal(righe);
    elTotale.value = total > 0 ? formatMoney(total) : "";
  }

  async function ensureFornitoreId(nome, piva) {
    const cleanedNome = String(nome || "").trim();
    const cleanedPiva = normalizePiva(piva);

    if (!cleanedNome) return null;

    if (cleanedNome.includes("-") && cleanedNome.length > 30) {
      console.error("UUID passato come nome fornitore:", cleanedNome);
      throw new Error("Errore fornitore: valore non valido");
    }

    const exactByPiva = cleanedPiva
      ? fornitori.find((f) => normalizeText(f.partita_iva) === normalizeText(cleanedPiva))
      : null;

    if (exactByPiva?.id) {
      if (!exactByPiva.partita_iva && cleanedPiva) {
        await supabase
          .from("fornitori")
          .update({ partita_iva: cleanedPiva })
          .eq("id", exactByPiva.id)
          .eq("azienda_id", azienda.id);
        exactByPiva.partita_iva = cleanedPiva;
      }

      return exactByPiva.id;
    }

    const exactByName = fornitori.find(
      (f) => normalizeText(f.ragione_sociale) === normalizeText(cleanedNome)
    );

    if (exactByName?.id) {
      if (!exactByName.partita_iva && cleanedPiva) {
        await supabase
          .from("fornitori")
          .update({ partita_iva: cleanedPiva })
          .eq("id", exactByName.id)
          .eq("azienda_id", azienda.id);
        exactByName.partita_iva = cleanedPiva;
      }

      return exactByName.id;
    }

    const payload = {
      azienda_id: azienda.id,
      ragione_sociale: cleanedNome
    };

    if (cleanedPiva) payload.partita_iva = cleanedPiva;
    if (window.state?.sedeAttiva?.id) payload.sede_id = window.state.sedeAttiva.id;

    const { data: created, error } = await supabase
      .from("fornitori")
      .insert(payload)
      .select("id, ragione_sociale, partita_iva")
      .single();

    if (error || !created?.id) {
      throw new Error(error?.message || "Impossibile creare il fornitore");
    }

    fornitori.push(created);

    modal.querySelector("#rf-fornitori-list").insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(created.ragione_sociale || "")}"></option>`
    );

    return created.id;
  }

  function addRiga(data = {}) {
    const descrizione = String(data.descrizione || data.descrizione_originale || "").trim();
    const matched = data.prodotto_id
      ? prodottiCache.find((p) => String(p.id) === String(data.prodotto_id)) || null
      : findProdottoByDescrizione(descrizione);

    righe.push({
      descrizione,
      descrizione_originale: String(data.descrizione_originale || descrizione).trim(),
      quantita: parseLocaleNumber(data.quantita, 1),
      prezzo_unitario: parseLocaleNumber(data.prezzo_unitario, 0),
      totale_riga: parseLocaleNumber(data.totale_riga, 0),
      iva_percent: parseLocaleNumber(data.iva_percent, 0),
      prodotto_id: matched?.id || data.prodotto_id || null,
      prodotto_nome: matched?.nome || "",
      um: data.um || matched?.um || "pz"
    });

    renderRighe();
    updateTotaleFromRighe();
  }

  function removeRiga(index) {
    righe.splice(index, 1);
    renderRighe();
    updateTotaleFromRighe();
  }

  function updateRiga(index, patch) {
    righe[index] = {
      ...righe[index],
      ...patch
    };

    if ("descrizione" in patch && !("prodotto_id" in patch)) {
      const matched = findProdottoByDescrizione(patch.descrizione);
      righe[index].prodotto_id = matched?.id || null;
      righe[index].prodotto_nome = matched?.nome || "";
      righe[index].um = righe[index].um || matched?.um || "pz";
    }

    const q = parseLocaleNumber(righe[index].quantita, NaN);
    const pu = parseLocaleNumber(righe[index].prezzo_unitario, NaN);
    const tr = parseLocaleNumber(righe[index].totale_riga, NaN);

    if (Number.isFinite(q) && Number.isFinite(pu)) {
      const computed = Number((q * pu).toFixed(2));

      if (!Number.isFinite(tr) || Math.abs(tr - computed) > 0.01) {
        righe[index].totale_riga = computed;
      }
    }

    renderRighe();
    updateTotaleFromRighe();
  }

  function renderRighe() {
    if (!righe.length) {
      righeContainer.innerHTML = `
        <div class="rf-empty-righe">
          Nessuna riga inserita.
        </div>
      `;
      return;
    }

    righeContainer.innerHTML = righe.map((row, i) => {
      // Semaforo a 3 stati basato sulle due categorie del prodotto agganciato:
      // rosso = nessuna categoria / prodotto non agganciato
      // giallo = una sola categoria assegnata
      // verde  = entrambe le categorie assegnate (sistemato)
      const prod = row.prodotto_id ? prodottiCache.find(p => String(p.id) === String(row.prodotto_id)) : null;
      const haBilancio = !!(prod && prod.categoria_bilancio_id);
      const haInterna = !!(prod && prod.categoria_interna_id);
      const nCat = (haBilancio ? 1 : 0) + (haInterna ? 1 : 0);

      let matchedClass, matched;
      if (!row.prodotto_id) {
        matchedClass = "missing";
        matched = "⚠️ Prodotto non agganciato";
      } else if (nCat === 2) {
        matchedClass = "ok";
        matched = "✅ Sistemato";
      } else if (nCat === 1) {
        matchedClass = "warning";
        matched = haBilancio ? "🟡 Manca categoria interna" : "🟡 Manca categoria bilancio";
      } else {
        matchedClass = "missing";
        matched = "🔴 Mancano entrambe le categorie";
      }

      return `
        <div class="rf-riga-card ${matchedClass}" data-i="${i}">
          <div class="rf-riga-grid">
            <div class="rf-field">
              <label>Descrizione</label>
              <input class="input riga-descrizione" data-i="${i}" value="${escapeHtml(row.descrizione || "")}" />
            </div>
            <div class="rf-field">
              <label>Quantità</label>
              <input class="input riga-quantita" data-i="${i}" value="${escapeHtml(String(row.quantita ?? ""))}" />
            </div>
            <div class="rf-field">
              <label>Prezzo unitario</label>
              <input class="input riga-prezzo" data-i="${i}" value="${escapeHtml(String(row.prezzo_unitario ?? ""))}" ${elTipoDocumento.value === "ddt" ? "disabled" : ""} />
            </div>
            <div class="rf-field">
              <label>Totale riga</label>
              <input class="input riga-totale" data-i="${i}" value="${escapeHtml(String(row.totale_riga ?? ""))}" ${elTipoDocumento.value === "ddt" ? "disabled" : ""} />
            </div>
          </div>

          <div class="rf-riga-bottom">
            <div class="rf-riga-status ${matchedClass}">
              ${escapeHtml(matched)}${row.prodotto_nome ? ` · ${escapeHtml(row.prodotto_nome)}` : ""}
            </div>

            <div class="rf-riga-actions">
              <button type="button" class="btn-secondary btn-match-riga" data-i="${i}">Riprova match</button>
              ${!row.prodotto_id ? `<button type="button" class="btn-secondary btn-crea-prodotto" data-i="${i}">Crea prodotto</button>` : ""}
              <button type="button" class="btn-secondary btn-remove-riga" data-i="${i}">Rimuovi</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    righeContainer.querySelectorAll(".riga-descrizione").forEach((el) => {
      el.addEventListener("input", (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        updateRiga(idx, { descrizione: e.currentTarget.value });
      });
    });

    righeContainer.querySelectorAll(".riga-quantita").forEach((el) => {
      el.addEventListener("input", (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        updateRiga(idx, { quantita: e.currentTarget.value });
      });
    });

    righeContainer.querySelectorAll(".riga-prezzo").forEach((el) => {
      el.addEventListener("input", (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        updateRiga(idx, { prezzo_unitario: e.currentTarget.value });
      });
    });

    righeContainer.querySelectorAll(".riga-totale").forEach((el) => {
      el.addEventListener("input", (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        updateRiga(idx, { totale_riga: e.currentTarget.value });
      });
    });

    righeContainer.querySelectorAll(".btn-remove-riga").forEach((el) => {
      el.addEventListener("click", (e) => {
        removeRiga(Number(e.currentTarget.dataset.i));
      });
    });

    righeContainer.querySelectorAll(".btn-match-riga").forEach((el) => {
      el.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        const matched = findProdottoByDescrizione(righe[idx]?.descrizione || "");

        if (matched?.id) {
          updateRiga(idx, {
            prodotto_id: matched.id,
            prodotto_nome: matched.nome || "",
            um: matched.um || "pz"
          });
          setFeedback("Prodotto agganciato alla riga.");
        } else {
          updateRiga(idx, {
            prodotto_id: null,
            prodotto_nome: "",
            um: righe[idx]?.um || "pz"
          });
          setFeedback("Nessun prodotto trovato per la riga selezionata.", true);
        }
      });
    });

    righeContainer.querySelectorAll(".btn-crea-prodotto").forEach((el) => {
      el.addEventListener("click", async (e) => {
        const idx = Number(e.currentTarget.dataset.i);
        const descrizioneFattura = String(righe[idx]?.descrizione || "").trim();
        const descrizioneOriginale = String(righe[idx]?.descrizione_originale || descrizioneFattura).trim();

        if (!descrizioneFattura) {
          setFeedback("Inserisci prima la descrizione della riga.", true);
          return;
        }

        const res = await openCreateProductModal({
          azienda,
          descrizioneFattura
        });

        if (!res?.prodotto?.id) return;

        prodottiCache.unshift({
          id: res.prodotto.id,
          nome: res.prodotto.nome || "",
          descrizione: res.prodotto.descrizione || "",
          codice_interno: res.prodotto.codice_interno || "",
          um: res.prodotto.um || "",
          categoria_bilancio_id: res.prodotto.categoria_bilancio_id ?? null,
          categoria_interna_id: res.prodotto.categoria_interna_id ?? null,
          quantita_riordino: res.prodotto.quantita_riordino ?? 0,
          scorta_minima: res.prodotto.scorta_minima ?? 0
        });

        await saveProdottoAliasOcr(
          supabase,
          azienda.id,
          descrizioneOriginale || descrizioneFattura,
          res.prodotto.id,
          aliasCache
        );

        updateRiga(idx, {
          prodotto_id: res.prodotto.id,
          prodotto_nome: res.prodotto.nome || "",
          um: res.prodotto.um || "pz"
        });

        setFeedback("Prodotto creato e agganciato alla riga.");
      });
    });
  }

  async function uploadFileAndRunOcr() {
    const file = elFile.files?.[0];
    const tipoDocumento = elTipoDocumento.value;

    if (!file) return;

    isUploadingOcr = true;

    try {
      setFeedback("Upload documento in corso...");

      const filePath = `${azienda.id}/${tipoDocumento}/${Date.now()}_${safeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("fatture")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message || "Errore upload file");
      }

      const { data: publicData } = supabase.storage
        .from("fatture")
        .getPublicUrl(filePath);

      const imageUrl = publicData?.publicUrl || "";
      if (!imageUrl) {
        throw new Error("Impossibile ottenere URL pubblico del documento");
      }

      setFeedback("Documento caricato. Analisi OCR in corso...");

      const { data, error } = await supabase.functions.invoke("ocr-fattura", {
        body: { imageUrl }
      });

      if (error) {
        throw new Error(error.message || "Errore OCR");
      }

      if (!data || data.success === false) {
        throw new Error(data?.error || "OCR fallito");
      }

      applyOcrResult(data);
      setFeedback("Documento analizzato. Classificazione in corso...");

      // ── Classificazione bilancio automatica ──
      try {
        const { data: classData } = await supabase.functions.invoke("classifica-bilancio-ts", {
          body: {
            fornitore: data.fornitore,
            righe: data.righe,
            totale: data.totale || null,
          }
        });
        if (classData?.success && classData?.classificazione) {
          categoriaBilancioSuggerita = classData.classificazione;
          renderBadgeCategoria(classData.classificazione);
        }
      } catch(e) {
        console.warn("Classificazione bilancio non disponibile:", e);
      }

      setFeedback("Documento analizzato. Controlla i dati e salva.");
    } finally {
      isUploadingOcr = false;
    }
  }

  function applyOcrResult(result) {
    const fornitoreRagioneSociale = result?.fornitore?.ragione_sociale || result?.fornitore?.nome || "";
    const fornitorePiva = result?.fornitore?.piva || result?.fornitore?.partita_iva || "";
    const numeroDocumento = result?.documento?.numero_documento || result?.documento?.numero || "";
    const dataDocumento = result?.documento?.data_documento || result?.documento?.data || "";

    if (fornitoreRagioneSociale) {
      elFornitore.value = fornitoreRagioneSociale;
    }

    if (fornitorePiva) {
      elFornitorePiva.value = normalizePiva(fornitorePiva);
    }

    if (numeroDocumento) {
      elNumero.value = numeroDocumento;
    }

    if (dataDocumento) {
      const normalizedDate = normalizeInputDate(dataDocumento);
      if (normalizedDate) elData.value = normalizedDate;
    }

    righe = [];
    (result?.righe || []).forEach((row) => {
      addRiga({
        descrizione: row.descrizione || "",
        descrizione_originale: row.descrizione || "",
        quantita: row.quantita ?? 1,
        prezzo_unitario: row.prezzo_unitario ?? 0,
        totale_riga: row.totale_riga ?? 0,
        iva_percent: row.iva_percent ?? 0,
        prodotto_id: row.prodotto_id || null,
        um: row.um || "pz"
      });
    });

    updateTotaleFromRighe();
  }

  // ── Badge categoria bilancio suggerita dall'AI ──
  function renderBadgeCategoria(cls) {
    // Cerca o crea il badge nel form
    let badge = document.getElementById("badge-categoria-bilancio");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "badge-categoria-bilancio";
      badge.style.cssText = "margin:10px 0;padding:10px 14px;border-radius:10px;font-size:13px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;";
      // Inserisci prima del pulsante salva
      const btnSalva = document.querySelector("#btn-salva-documento") || document.querySelector("[data-action='salva']");
      if (btnSalva) btnSalva.parentElement.insertBefore(badge, btnSalva);
    }

    const conf = cls.confidenza || 0;
    const bg    = conf >= 80 ? "#dcfce7" : conf >= 50 ? "#fef3c7" : "#fee2e2";
    const color = conf >= 80 ? "#15803d" : conf >= 50 ? "#92400e" : "#dc2626";
    const emoji = conf >= 80 ? "✅" : conf >= 50 ? "⚠️" : "❓";

    badge.style.background = bg;
    badge.style.border = `1px solid ${color}30`;
    badge.innerHTML = `
      <div>
        <div style="font-weight:700;color:${color};">${emoji} ${cls.categoria_nome}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">${cls.motivo || ""} — Confidenza: ${conf}%</div>
        ${cls.codice_conto ? `<div style="font-size:11px;color:#94a3b8;">Conto: ${cls.codice_conto}</div>` : ""}
      </div>
      <select id="sel-categoria-bilancio" style="border:1px solid #e2e8f0;border-radius:8px;padding:5px 8px;font-size:12px;cursor:pointer;">
        <option value="">Cambia categoria...</option>
      </select>
    `;

    // Carica opzioni select
    const sel = badge.querySelector("#sel-categoria-bilancio");
    if (sel && window._categorieBilancio) {
      window._categorieBilancio.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nome;
        if (c.id === cls.categoria_id) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = () => {
        const found = window._categorieBilancio?.find(c => String(c.id) === sel.value);
        if (found) {
          categoriaBilancioSuggerita = { ...categoriaBilancioSuggerita, categoria_id: found.id, categoria_nome: found.nome, codice_conto: found.codice_conto };
          renderBadgeCategoria(categoriaBilancioSuggerita);
        }
      };
    }
  }

  // Precarica categorie bilancio per il select
  supabase.from("categorie_bilancio").select("id,nome,codice_conto,tipo").eq("attivo", true).order("ordine")
    .then(({ data }) => { if (data) window._categorieBilancio = data; });

  async function saveDocumento() {
    const tipoDocumento = elTipoDocumento.value;
    const fornitoreNome = String(elFornitore.value || "").trim();
    const fornitorePiva = String(elFornitorePiva.value || "").trim();
    const numeroDocumento = String(elNumero.value || "").trim();
    const dataDocumento = String(elData.value || "").trim();
    const totale = parseLocaleNumber(elTotale.value, 0);

    if (!fornitoreNome) {
      throw new Error("Inserisci il fornitore");
    }

    if (!dataDocumento) {
      throw new Error(tipoDocumento === "ddt" ? "Inserisci la data DDT" : "Inserisci la data documento");
    }

    if (!numeroDocumento) {
      throw new Error(tipoDocumento === "ddt" ? "Inserisci il numero DDT" : "Inserisci il numero documento");
    }

    if (!righe.length) {
      throw new Error("Inserisci almeno una riga documento");
    }

    const fornitoreId = await ensureFornitoreId(fornitoreNome, fornitorePiva);

    if (!fornitoreId) {
      throw new Error("Errore interno: fornitore non valido");
    }

    if (tipoDocumento === "fattura") {
      const { data: insertedRows, error } = await window.db
        .insert("fatture_acquisto", {
          fornitore_id: fornitoreId,
          numero_documento: numeroDocumento || null,
          data_documento: dataDocumento,
          totale: totale || computeRowsTotal(righe) || 0,
          stato: "bozza"
        });

      const created = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

      if (error || !created?.id) {
        console.error("ERRORE INSERT FATTURA:", error);
        throw new Error(error?.message || "Errore salvataggio fattura");
      }

      const righePayload = righe.map((row, index) => {
        const payload = {
          fattura_id: created.id,
          azienda_id: azienda.id,
          riga_numero: index + 1,
          descrizione: String(row.descrizione || "").trim(),
          prodotto_id: row.prodotto_id || null,
          quantita: parseLocaleNumber(row.quantita, 0),
          unita_misura: row.um || "pz",
          prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
          iva_percent: parseLocaleNumber(row.iva_percent, 0),
          totale_riga: parseLocaleNumber(row.totale_riga, 0)
        };

        if (window.state?.sedeAttiva?.id) {
          payload.sede_id = window.state.sedeAttiva.id;
        }

        return payload;
      });

      const { error: righeError } = await supabase
        .from("fatture_acquisto_righe")
        .insert(righePayload);

      if (righeError) {
        console.error("ERRORE RIGHE FATTURA:", righeError);
        throw new Error(righeError.message || "Errore salvataggio righe fattura");
      }

      // Aggiorna costo_medio sui prodotti abbinati
      // costo_per_unita = prezzo_unitario / quantita_confezione
      await aggiornasCostoMedioProdotti(righe, azienda.id);
    } else {
      const { data: insertedRows, error } = await window.db
        .insert("ddt_acquisto", {
          fornitore_id: fornitoreId,
          numero_ddt: numeroDocumento || null,
          data_ddt: dataDocumento
        });

      const created = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

      if (error || !created?.id) {
        console.error("ERRORE INSERT DDT:", error);
        throw new Error(error?.message || "Errore salvataggio DDT");
      }

      const righePayload = righe.map((row, index) => {
        const payload = {
          ddt_id: created.id,
          azienda_id: azienda.id,
          riga_numero: index + 1,
          descrizione: String(row.descrizione || "").trim(),
          prodotto_id: row.prodotto_id || null,
          quantita: parseLocaleNumber(row.quantita, 0),
          unita_misura: row.um || "pz",
          prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
          iva_percent: parseLocaleNumber(row.iva_percent, 0),
          totale_riga: parseLocaleNumber(row.totale_riga, 0)
        };

        if (window.state?.sedeAttiva?.id) {
          payload.sede_id = window.state.sedeAttiva.id;
        }

        return payload;
      });

      const { error: righeError } = await supabase
        .from("ddt_acquisto_righe")
        .insert(righePayload);

      if (righeError) {
        console.error("ERRORE RIGHE DDT (tentativo 1):", righeError);

        const fallbackPayload = righe.map((row, index) => {
          const payload = {
            ddt_id: created.id,
            azienda_id: azienda.id,
            riga_numero: index + 1,
            descrizione: String(row.descrizione || "").trim(),
            prodotto_id: row.prodotto_id || null,
            quantita: parseLocaleNumber(row.quantita, 0),
            unita_misura: row.um || "pz",
            prezzo_unitario: parseLocaleNumber(row.prezzo_unitario, 0),
            iva_percent: parseLocaleNumber(row.iva_percent, 0),
            totale_riga: parseLocaleNumber(row.totale_riga, 0)
          };

          if (window.state?.sedeAttiva?.id) {
            payload.sede_id = window.state.sedeAttiva.id;
          }

          return payload;
        });

        const { error: fallbackError } = await supabase
          .from("ddt_acquisto_righe")
          .insert(fallbackPayload);

        if (fallbackError) {
          console.error("ERRORE RIGHE DDT (fallback):", fallbackError);
          throw new Error(fallbackError.message || righeError.message || "Errore salvataggio righe DDT");
        }
      }
    }
  }

  elTipoDocumento.addEventListener("change", () => {
    updateLabels();
    renderRighe();
    updateTotaleFromRighe();
  });

  elMetodo.addEventListener("change", () => {
    updateMetodoUI();
  });

  elFile.addEventListener("change", async () => {
    try {
      await uploadFileAndRunOcr();
    } catch (error) {
      console.error("Errore OCR documento:", error);
      setFeedback(error.message || "Errore caricamento documento", true);
    }
  });

  btnAddRiga.addEventListener("click", () => {
    addRiga({
      descrizione: "",
      descrizione_originale: "",
      quantita: 1,
      prezzo_unitario: 0,
      totale_riga: 0,
      iva_percent: 0,
      prodotto_id: null,
      um: "pz"
    });
  });

  btnSave.addEventListener("click", async () => {
    if (isUploadingOcr) return;

    try {
      setFeedback("Salvataggio in corso...");
      btnSave.disabled = true;
      await saveDocumento();
      setFeedback("Documento salvato correttamente.");
      setTimeout(() => closeModal(), 500);
    } catch (error) {
      console.error("Errore saveDocumento:", error);
      setFeedback(error.message || "Errore salvataggio documento", true);
    } finally {
      btnSave.disabled = false;
    }
  });

  btnCloseTop.addEventListener("click", closeModal);
  btnCloseBottom.addEventListener("click", closeModal);

  modal.querySelector(".rf-modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  });

  updateLabels();
  updateMetodoUI();
  renderRighe();
}

/* ============================================================
   PARSING AUTOMATICO DESCRIZIONE FATTURA
   Estrae UM e quantità confezione da stringhe tipo:
   "Nepi Eff Nat 1lt x12"  → um=lt, qta=12
   "Latte CT 6x1lt"        → um=lt, qta=6
   "Farina kg 25"          → um=kg, qta=1
   "Acqua 0.5lt x24"       → um=lt, qta=24
============================================================ */
function parseDescrizioneConfezione(desc) {
  if (!desc) return { um: "pz", qtaConfezione: 1 };

  const s = desc.toLowerCase().trim();
  let um = "pz";
  let qtaConfezione = 1;

  // Pattern UM riconosciuti
  const umPatterns = [
    { regex: /\b(\d+(?:[.,]\d+)?)\s*lt\b/,   um: "lt"  },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*l\b/,    um: "lt"  },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*ml\b/,   um: "ml"  },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*cl\b/,   um: "ml"  }, // cl → ml
    { regex: /\b(\d+(?:[.,]\d+)?)\s*kg\b/,   um: "kg"  },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*g\b/,    um: "g"   },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*gr\b/,   um: "g"   },
  ];

  // Pattern moltiplicatore: x12, x 12, *12, ct12, ct 12, pz12
  const moltiplicatorePatterns = [
    /[x×\*]\s*(\d+)/i,
    /\bct\s*(\d+)\b/i,
    /\bpz\s*(\d+)\b/i,
    /\bb(?:ott(?:iglia)?)?\.?\s*(\d+)\b/i,
    /(\d+)\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:lt|l|kg|g|gr|ml|cl)/i, // "12x1lt"
  ];

  // Estrai UM dalla descrizione
  for (const p of umPatterns) {
    if (p.regex.test(s)) {
      um = p.um;
      break;
    }
  }
  // Fallback: UM senza numero davanti (es. "acqua lt", "farina kg")
  if (um === "pz") {
    if (/\blt\b|\blitri?\b/.test(s)) um = "lt";
    else if (/\bml\b/.test(s)) um = "ml";
    else if (/\bkg\b|\bchilo/.test(s)) um = "kg";
    else if (/\bgr?\b|\bgramm/.test(s)) um = "g";
  }

  // Estrai moltiplicatore (quante unità nella confezione)
  for (const p of moltiplicatorePatterns) {
    const m = s.match(p);
    if (m) {
      // Prende il gruppo numerico più grande (es. in "12x1lt" prende 12)
      const candidates = m.slice(1).map(Number).filter(n => n > 1);
      if (candidates.length) {
        qtaConfezione = Math.max(...candidates);
        break;
      }
    }
  }

  // Caso "cl": converti in ml (1cl = 10ml)
  if (/\bcl\b/.test(s) && um === "ml") {
    const clMatch = s.match(/\b(\d+(?:[.,]\d+)?)\s*cl\b/);
    if (clMatch) {
      // Lascia um=ml, la conversione è gestita nel costo
    }
  }

  return { um, qtaConfezione };
}

async function openCreateProductModal({ azienda, descrizioneFattura }) {
  ensureAcquistiModalStyles();

  const supabase = window.supabaseClient;

  const [catsBilancioRes, catsInterneRes] = await Promise.all([
    supabase
      .from("categorie_bilancio")
      .select("id, nome, attivo")
      .eq("attivo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("categorie_interne_prodotti")
      .select("id, nome, sigla, attiva")
      .eq("azienda_id", azienda.id)
      .eq("attiva", true)
      .order("nome", { ascending: true })
  ]);

  const catsBilancio = catsBilancioRes.data || [];
  const catsInterne = catsInterneRes.data || [];

  const modalRoot = document.createElement("div");
  modalRoot.innerHTML = `
    <div class="rf-modal-backdrop">
      <div class="rf-modal rf-modal-small">
        <div class="rf-modal-header">
          <div class="rf-header-copy">
            <h3 class="rf-modal-title">Crea prodotto</h3>
            <p class="rf-modal-sub">Nome interno usato nelle ricette. Nel database: nome = nome interno, descrizione = descrizione fattura.</p>
          </div>
          <button type="button" class="btn-secondary rf-close">Chiudi</button>
        </div>

        <div class="rf-modal-body">
          <div class="rf-field">
            <label>Descrizione fattura</label>
            <input id="rf-prod-descrizione-fattura" class="input" value="${escapeHtml(descrizioneFattura || "")}" disabled />
          </div>

          <div class="rf-field">
            <label>Nome prodotto interno</label>
            <input id="rf-prod-nome-interno" class="input" value="${escapeHtml(descrizioneFattura || "")}" />
          </div>

          <div class="rf-field">
            <label>Categoria gestione</label>
            <select id="rf-cat-gestione" class="input">
              <option value="">-- Seleziona --</option>
              ${CATEGORIE_GESTIONE_ACQUISTI.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join("")}
            </select>
          </div>

          <div class="rf-field">
            <label>Categoria bilancio</label>
            <input id="rf-cat-bilancio-text" class="input" list="rf-cat-bilancio-list" placeholder="Scrivi o seleziona categoria bilancio..." autocomplete="off" />
            <input type="hidden" id="rf-cat-bilancio-id" value="" />
            <datalist id="rf-cat-bilancio-list">
              ${catsBilancio.map((c) => `<option value="${escapeHtml(c.nome || "")}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-field">
            <label>Categoria interna</label>
            <input id="rf-cat-interna-text" class="input" list="rf-cat-interna-list" placeholder="Scrivi o seleziona categoria interna..." autocomplete="off" />
            <input type="hidden" id="rf-cat-interna-id" value="" />
            <datalist id="rf-cat-interna-list">
              ${catsInterne.map((c) => `<option value="${escapeHtml(c.nome || "")}"></option>`).join("")}
            </datalist>
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Unità di misura <span style="font-size:11px;color:#667085;">(come lo usi nelle ricette)</span></label>
              <select id="rf-um" class="input">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lt">lt</option>
                <option value="ml">ml</option>
                <option value="pz">pz</option>
              </select>
            </div>
            <div class="rf-field">
              <label>Qtà per confezione <span style="font-size:11px;color:#667085;">(es. x12 → scrivi 12)</span></label>
              <input id="rf-qta-confezione" type="number" step="0.001" min="0.001" class="input" placeholder="Es. 12 (o 1 se singolo)" value="1" />
            </div>
          </div>

          <div id="rf-parsing-banner" style="display:none;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:10px 12px;font-size:12px;color:#065f46;margin-top:4px;">
          </div>

          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;">
            💡 <strong>Esempio:</strong> "Nepi Eff Nat 1lt x12" → UM: <strong>lt</strong>, Qtà: <strong>12</strong> → costo = prezzo / 12<br>
            Verifica sempre i valori rilevati automaticamente.
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Scorta minima</label>
              <input id="rf-scorta-minima" type="number" step="0.001" class="input" placeholder="Es. 1" />
            </div>
            <div class="rf-field">
              <label>Quantità riordino</label>
              <input id="rf-quantita-riordino" type="number" step="0.001" class="input" placeholder="Es. 5" />
            </div>
          </div>

          <div id="rf-prod-feedback" class="rf-feedback"></div>
        </div>

        <div class="rf-modal-actions">
          <button type="button" class="btn-primary rf-save">Crea prodotto</button>
          <button type="button" class="btn-secondary rf-cancel">Annulla</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalRoot);

  // ── Parsing automatico descrizione fattura ──
  const parsed = parseDescrizioneConfezione(descrizioneFattura);
  const selUm = modalRoot.querySelector("#rf-um");
  const inpQta = modalRoot.querySelector("#rf-qta-confezione");
  const banner = modalRoot.querySelector("#rf-parsing-banner");

  if (selUm) selUm.value = parsed.um;
  if (inpQta) inpQta.value = parsed.qtaConfezione;

  if (banner) {
    if (parsed.um !== "pz" || parsed.qtaConfezione > 1) {
      banner.style.display = "";
      banner.innerHTML = `✅ Rilevato automaticamente: <strong>UM = ${parsed.um}</strong>, <strong>Qtà confezione = ${parsed.qtaConfezione}</strong> — verifica e correggi se necessario.`;
    }
  }

  const inputNomeInterno = modalRoot.querySelector("#rf-prod-nome-interno");
  const selectGestione = modalRoot.querySelector("#rf-cat-gestione");
  const inputBilancioText = modalRoot.querySelector("#rf-cat-bilancio-text");
  const hiddenBilancioId = modalRoot.querySelector("#rf-cat-bilancio-id");
  const inputInternaText = modalRoot.querySelector("#rf-cat-interna-text");
  const hiddenInternaId = modalRoot.querySelector("#rf-cat-interna-id");
  const inputScortaMinima = modalRoot.querySelector("#rf-scorta-minima");
  const inputQuantitaRiordino = modalRoot.querySelector("#rf-quantita-riordino");
  const feedback = modalRoot.querySelector("#rf-prod-feedback");
  const datalistInterna = modalRoot.querySelector("#rf-cat-interna-list");
  const datalistBilancio = modalRoot.querySelector("#rf-cat-bilancio-list");

  const bilancioByLabel = new Map(
    catsBilancio.map((c) => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
  );

  const interneByNome = new Map(
    catsInterne.map((c) => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
  );

  function close(res = null) {
    modalRoot.remove();
    return res;
  }

  function setFeedback(message, isError = false) {
    feedback.textContent = message || "";
    feedback.style.color = isError ? "#b42318" : "#166534";
  }

  function syncBilancioId() {
    const raw = String(inputBilancioText.value || "").trim().toLowerCase();
    hiddenBilancioId.value = bilancioByLabel.get(raw) || "";
  }

  function syncInternaId() {
    const raw = String(inputInternaText.value || "").trim().toLowerCase();
    hiddenInternaId.value = interneByNome.get(raw) || "";
  }

  selectGestione.addEventListener("change", () => {
    const selected = CATEGORIE_GESTIONE_ACQUISTI.find((c) => c.id === selectGestione.value);
    if (!selected) return;
    inputBilancioText.value = selected.categoriaBilancioSuggerita || "";
    syncBilancioId();
  });

  inputBilancioText.addEventListener("input", syncBilancioId);
  inputInternaText.addEventListener("input", syncInternaId);

  modalRoot.querySelector(".rf-close").addEventListener("click", () => close());
  modalRoot.querySelector(".rf-cancel").addEventListener("click", () => close());
  modalRoot.querySelector(".rf-modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });

  return await new Promise((resolve) => {
    modalRoot.querySelector(".rf-save").addEventListener("click", async () => {
      setFeedback("");

      syncBilancioId();
      syncInternaId();

      const nomeInterno = String(inputNomeInterno.value || "").trim();
      const descrizioneOriginale = String(descrizioneFattura || "").trim();
      const categoriaBilancioId = String(hiddenBilancioId.value || "").trim();
      let categoriaInternaId = String(hiddenInternaId.value || "").trim();
      const nomeCategoriaInterna = String(inputInternaText.value || "").trim();
      const scortaMinima = parseLocaleNumber(inputScortaMinima.value, 0);
      const quantitaRiordino = parseLocaleNumber(inputQuantitaRiordino.value, 0);
      const umReale = modalRoot.querySelector("#rf-um")?.value || "pz";
      const qtaConfezione = Math.max(0.001, parseLocaleNumber(modalRoot.querySelector("#rf-qta-confezione")?.value, 1));

      if (!nomeInterno) {
        setFeedback("Inserisci il nome prodotto interno.", true);
        return;
      }

      let categoriaBilancioIdFinale = categoriaBilancioId;

      if (!categoriaBilancioIdFinale) {
        const nomeCategoriaBilancio = String(inputBilancioText.value || "").trim();

        if (!nomeCategoriaBilancio) {
          setFeedback("Inserisci o seleziona una categoria bilancio.", true);
          return;
        }

        // nome nuovo: si crea la categoria, come si fa con quella interna
        const normalizzata = nomeCategoriaBilancio.toLowerCase();
        const esistente = bilancioByLabel.get(normalizzata);

        if (esistente) {
          categoriaBilancioIdFinale = esistente;
        } else {
          if (!confirm(`La categoria di bilancio "${nomeCategoriaBilancio}" non esiste ancora.\n\nLa creo? Sarà disponibile da qui in avanti per tutti i prodotti.`)) {
            return;
          }

          const { data: creataBil, error: errBil } = await supabase
            .from("categorie_bilancio")
            .insert({ nome: nomeCategoriaBilancio, tipo: "costo", attivo: true, ordine: 999 })
            .select("id, nome")
            .single();

          if (errBil || !creataBil?.id) {
            setFeedback(errBil?.message || "Errore creazione categoria bilancio.", true);
            return;
          }

          categoriaBilancioIdFinale = String(creataBil.id);
          bilancioByLabel.set(creataBil.nome.trim().toLowerCase(), categoriaBilancioIdFinale);
          datalistBilancio.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(creataBil.nome)}"></option>`);
          inputBilancioText.value = creataBil.nome;
          hiddenBilancioId.value = categoriaBilancioIdFinale;
        }
      }

      if (!categoriaInternaId) {
        if (!nomeCategoriaInterna) {
          setFeedback("Inserisci o seleziona una categoria interna.", true);
          return;
        }

        const normalized = nomeCategoriaInterna.trim().toLowerCase();
        const existingId = interneByNome.get(normalized);

        if (existingId) {
          categoriaInternaId = existingId;
        } else {
          const payload = {
            azienda_id: azienda.id,
            nome: nomeCategoriaInterna,
            attiva: true
          };

          if (window.state?.sedeAttiva?.id) {
            payload.sede_id = window.state.sedeAttiva.id;
          }

          const { data: createdInterna, error: createdInternaError } = await supabase
            .from("categorie_interne_prodotti")
            .insert(payload)
            .select("id, nome")
            .single();

          if (createdInternaError || !createdInterna?.id) {
            setFeedback(createdInternaError?.message || "Errore creazione categoria interna.", true);
            return;
          }

          categoriaInternaId = String(createdInterna.id);

          interneByNome.set(
            createdInterna.nome.trim().toLowerCase(),
            categoriaInternaId
          );

          datalistInterna.insertAdjacentHTML(
            "beforeend",
            `<option value="${escapeHtml(createdInterna.nome)}"></option>`
          );

          inputInternaText.value = createdInterna.nome;
          hiddenInternaId.value = categoriaInternaId;
        }
      }

      const codiceInterno = normalizeCodiceInterno(nomeInterno);

      const prodottoPayload = {
        azienda_id: azienda.id,
        codice_interno: codiceInterno,
        nome: nomeInterno,
        descrizione: descrizioneOriginale || nomeInterno,
        categoria_bilancio_id: Number(categoriaBilancioIdFinale),
        categoria_interna_id: categoriaInternaId,
        scorta_minima: Number.isFinite(scortaMinima) ? scortaMinima : 0,
        quantita_riordino: Number.isFinite(quantitaRiordino) ? quantitaRiordino : 0,
        tipo_prodotto: "materia_prima",
        um: umReale,
        unita_base: umReale,
        unita_misura: umReale,
        quantita_confezione: qtaConfezione,
        um_confezione: umReale,
        costo_medio: 0,
        costo_ultimo: 0,
        attivo: true
      };

      if (window.state?.sedeAttiva?.id) {
        prodottoPayload.sede_id = window.state.sedeAttiva.id;
      }

      let created = null;

      const { data: inserted, error } = await supabase
        .from("prodotti")
        .insert(prodottoPayload)
        .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, categoria_interna_id, quantita_riordino, scorta_minima")
        .single();

      if (!error && inserted?.id) {
        created = inserted;
      }

      if (error && error.code === "23505") {
        const { data: existing, error: existingError } = await supabase
          .from("prodotti")
          .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, categoria_interna_id, quantita_riordino, scorta_minima")
          .eq("azienda_id", azienda.id)
          .ilike("nome", nomeInterno)
          .maybeSingle();

        if (existingError || !existing?.id) {
          setFeedback(error?.message || "Errore creazione prodotto.", true);
          return;
        }

        created = existing;
      }

      if (!created?.id) {
        setFeedback(error?.message || "Errore creazione prodotto.", true);
        return;
      }

      resolve({
        prodotto: {
          id: created.id,
          nome: created.nome || nomeInterno,
          descrizione: created.descrizione || descrizioneOriginale || nomeInterno,
          codice_interno: created.codice_interno || codiceInterno,
          um: created.um || "pz",
          categoria_bilancio_id: created.categoria_bilancio_id ?? null,
          categoria_interna_id: created.categoria_interna_id ?? null,
          quantita_riordino: created.quantita_riordino ?? 0,
          scorta_minima: created.scorta_minima ?? 0
        }
      });

      close();
    });
  });
}

async function aggiornasCostoMedioProdotti(righe, aziendaId) {
  const supabase = window.supabaseClient;

  // Raggruppa per prodotto_id: prende l'ultimo prezzo unitario della fattura
  const costiPerProdotto = new Map();
  for (const riga of righe) {
    if (!riga.prodotto_id) continue;
    const prezzoUnitario = parseLocaleNumber(riga.prezzo_unitario, 0);
    if (prezzoUnitario <= 0) continue;
    costiPerProdotto.set(String(riga.prodotto_id), prezzoUnitario);
  }

  if (!costiPerProdotto.size) return;

  // Per ogni prodotto, carica quantita_confezione e calcola costo_per_unita
  for (const [prodottoId, prezzoBruto] of costiPerProdotto.entries()) {
    const { data: prod } = await supabase
      .from("prodotti")
      .select("quantita_confezione, um, unita_base")
      .eq("id", prodottoId)
      .eq("azienda_id", aziendaId)
      .maybeSingle();

    const qtaConfezione = Math.max(0.001, Number(prod?.quantita_confezione ?? 1));
    const costoPerUnita = prezzoBruto / qtaConfezione;

    await supabase
      .from("prodotti")
      .update({
        costo_medio: costoPerUnita,
        costo_ultimo: costoPerUnita
      })
      .eq("id", prodottoId)
      .eq("azienda_id", aziendaId);
  }
}

function ensureAcquistiModalStyles() {
  if (document.getElementById("rf-acquisti-modal-style")) return;

  const style = document.createElement("style");
  style.id = "rf-acquisti-modal-style";

  style.textContent = `
body.rf-modal-open{
  overflow:hidden;
}

.rf-modal-backdrop{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.45);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  z-index:9999;
  box-sizing:border-box;
}

.rf-modal{
  width:100%;
  max-width:1080px;
  max-height:90vh;
  background:#fff;
  border-radius:16px;
  box-shadow:0 18px 50px rgba(0,0,0,.22);
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.rf-modal-small{
  max-width:680px;
}

.rf-modal-header{
  flex-shrink:0;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:18px;
  border-bottom:1px solid rgba(0,0,0,.08);
}

.rf-modal-body{
  flex:1;
  overflow-y:auto;
  overflow-x:hidden;
  -webkit-overflow-scrolling:touch;
  padding:18px;
  display:grid;
  gap:14px;
  box-sizing:border-box;
}

.rf-modal-actions{
  flex-shrink:0;
  display:flex;
  justify-content:flex-end;
  gap:8px;
  padding:14px 18px 18px;
  border-top:1px solid rgba(0,0,0,.08);
  flex-wrap:wrap;
}

.rf-grid-2{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}

.rf-field{
  min-width:0;
  display:grid;
  gap:6px;
}

.rf-riga-grid{
  display:grid;
  gap:10px;
  grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);
  width:100%;
}

.rf-close-icon{
  background:none;
  border:none;
  font-size:20px;
  cursor:pointer;
}

.rf-righe-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

.rf-righe-wrap{
  display:grid;
  gap:12px;
}

.rf-riga-card{
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:12px;
  display:grid;
  gap:12px;
}

.rf-riga-card.ok{
  border-color:#86efac;
  background:#f0fdf4;
}

.rf-riga-card.missing{
  border-color:#fca5a5;
  background:#fef2f2;
}

.rf-riga-card.warning{
  border-color:#fde047;
  background:#fefce8;
}

.rf-riga-bottom{
  display:flex;
  justify-content:space-between;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
}

.rf-riga-status{
  font-size:13px;
  color:#475467;
}

.rf-riga-status.ok{
  color:#166534;
}

.rf-riga-status.missing{
  color:#b91c1c;
}

.rf-riga-status.warning{
  color:#a16207;
}

.rf-riga-actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.rf-feedback{
  min-height:20px;
  font-size:13px;
}

.rf-doc-list{
  display:grid;
  gap:12px;
}

.rf-doc-item{
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:14px;
  background:#fff;
}

.rf-doc-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:8px;
  flex-wrap:wrap;
}

.rf-doc-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:4px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  background:#eef2ff;
  color:#3730a3;
}

.rf-doc-badge.ddt{
  background:#ecfeff;
  color:#155e75;
}

.rf-doc-badge.fattura{
  background:#eff6ff;
  color:#1d4ed8;
}

.rf-doc-title{
  font-weight:700;
  color:#101828;
  margin-bottom:6px;
}

.rf-doc-meta{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  font-size:13px;
  color:#475467;
}

.rf-empty-righe{
  border:1px dashed #d0d5dd;
  border-radius:12px;
  padding:18px;
  text-align:center;
  color:#667085;
  background:#fcfcfd;
}

.rf-header-copy{
  display:grid;
  gap:4px;
}

.rf-modal-title{
  margin:0;
}

.rf-modal-sub{
  margin:0;
  font-size:13px;
  color:#667085;
}

input,select,textarea{
  max-width:100%;
  font-size:16px;
  box-sizing:border-box;
}

@media (max-width:760px){
  .rf-modal-backdrop{
    padding:8px;
  }

  .rf-modal{
    max-height:95vh;
    border-radius:12px;
  }

  .rf-grid-2{
    grid-template-columns:1fr;
  }

  .rf-riga-grid{
    grid-template-columns:1fr;
  }

  .rf-modal-actions button,
  .rf-top-close{
    width:100%;
  }
}
`;

  document.head.appendChild(style);
}

// =========================================================
// HUB FISCALE — Interfaccia abbinamento righe → prodotti
// =========================================================
const FISCALE_MATCH_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/fiscale-match";
const FISCALE_CONFERMA_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/fiscale-conferma";
const RF_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

async function fiscaleFetch(url, payload) {
  const supa = window.supabaseClient || window.supabase;
  const { data: sess } = await supa.auth.getSession();
  const token = sess?.session?.access_token || "";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": RF_ANON },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function badgeConf(conf, confermato) {
  if (confermato) return '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">✓ confermato</span>';
  const c = Number(conf) || 0;
  if (c >= 0.72) return '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">' + Math.round(c*100) + '%</span>';
  if (c >= 0.45) return '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">' + Math.round(c*100) + '% da verificare</span>';
  return '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">nessun match</span>';
}

// Le fatture ricorrenti cambiano testo ogni mese ("... - Comp. novembre '25 2773286"):
// per riconoscerle si guarda la radice, senza periodo e senza numeri di pratica.
function radiceDescrizione(desc) {
  let t = String(desc || "").toLowerCase();
  t = t.split(/\s[-–]\s*comp\.?\s/)[0];                 // via " - Comp. novembre '25"
  t = t.replace(/\b(comp\.?|competenza|periodo|dal|al|mese di)\b.*$/i, "");
  t = t.replace(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/gi, "");
  t = t.replace(/'?\d{2,4}\b/g, "");                      // anni e numeri lunghi
  t = t.replace(/\b\d{4,}\b/g, "");                       // numeri pratica/contratto
  t = t.replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/g, ""); // date
  t = t.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

async function renderRigheFiscali(box, documentoId, azienda) {
  const supa = window.supabaseClient || window.supabase;
  box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px;">Caricamento righe...</div>';

  const [righeRes, prodRes, catRes, docRes] = await Promise.all([
    supa.from("fiscale_documenti_righe")
      .select("id, numero_riga, descrizione_originale, quantita, unita_misura, prezzo_unitario, totale_riga, prodotto_id, match_metodo, match_confidenza, match_confermato")
      .eq("documento_id", documentoId),
    supa.from("prodotti").select("id, nome, nome_interno, categoria_bilancio_id, categoria_interna").eq("azienda_id", azienda.id).eq("attivo", true).order("nome"),
    supa.from("categorie_bilancio").select("id, nome, tipo, solo_costo, ordine").eq("tipo", "costo").order("ordine"),
    supa.from("fiscale_documenti").select("stato").eq("id", documentoId).maybeSingle()
  ]);

  if (righeRes.error) { box.innerHTML = '<div style="color:#dc2626;font-size:13px;">Errore nel caricamento delle righe.</div>'; return; }
  const righe = (righeRes.data || []).sort((a,b) => (a.numero_riga||0) - (b.numero_riga||0));
  const prodotti = prodRes.data || [];
  const categorie = catRes.data || [];
  const statoDoc = docRes.data?.stato || "normalizzato";
  const giaFinalizzato = statoDoc === "arricchito";

  if (!righe.length) { box.innerHTML = '<div style="color:#94a3b8;font-size:13px;">Nessuna riga.</div>'; return; }

  const mappaProd = new Map(prodotti.map(p => [String(p.id), p.nome]));
  const mappaNomeInt = new Map(prodotti.map(p => [String(p.id), p.nome_interno || ""]));
  const mappaCatProd = new Map(prodotti.map(p => [String(p.id), p.categoria_bilancio_id]));
  const mappaIntProd = new Map(prodotti.map(p => [String(p.id), p.categoria_interna]));
  const mappaNomeProd = mappaProd;
  const mappaNomeCat = new Map(categorie.map(c => [String(c.id), c.nome]));
  const optionsProdotti = prodotti.map(p => '<option value="' + p.id + '">' + escapeHtml(p.nome) + '</option>').join("");
  const optionsCategorie = categorie.map(c => '<option value="' + c.id + '">' + escapeHtml(c.nome) + (c.solo_costo ? ' (solo costo)' : '') + '</option>').join("");

  // Categorie interne esistenti (dai prodotti) per la tendina
  const interneSet = new Set();
  prodotti.forEach(p => { const v = (p.categoria_interna || "").trim(); if (v && v.toLowerCase() !== "varie") interneSet.add(v); });
  const interneList = Array.from(interneSet).sort((a,b) => a.localeCompare(b));
  function optionsInterne() { return interneList.map(v => '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>').join(""); }

  const COL = { red:'#dc2626', yellow:'#f59e0b', green:'#16a34a' };
  const LBL = { red:'Da classificare', yellow:'Classificazione incompleta', green:'Classificata' };
  function statoDaProd(prodId) {
    if (!prodId) return 'red';
    return _statoRiga(_catBilancioOk(mappaCatProd.get(String(prodId))), _catInternaOk(mappaIntProd.get(String(prodId))));
  }
  const ESCLUSE = new Set(['non_prodotto', 'descrittiva']);
  const statiRiga = {};
  righe.forEach(r => { statiRiga[r.id] = ESCLUSE.has(r.match_metodo) ? 'green' : statoDaProd(r.prodotto_id); });

  function btnElimina(rigaId) {
    return '<button class="fisc-elimina" data-riga="' + rigaId + '" title="Elimina questa riga dalla fattura" style="background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:6px;padding:6px 9px;font-size:12px;font-weight:600;cursor:pointer;">🗑</button>';
  }

  function applyDot(el, stato) { if (!el) return; el.style.background = COL[stato] || '#94a3b8'; el.setAttribute('title', LBL[stato] || ''); }
  function dotEl(rid) { return box.querySelector('.fisc-dot[data-riga="' + rid + '"]'); }
  function aggiornaDotFattura() {
    const worst = _peggioreStato(Object.values(statiRiga));
    const card = box.closest('.rf-doc-item');
    if (card) applyDot(card.querySelector('.rf-sem-dot'), worst);
  }

  function aggiornaStatoCaricabile() {
    const daFare = Object.values(statiRiga).filter(s => s === 'red' || s === 'yellow').length;
    const banner = box.querySelector('.fisc-stato-banner');
    const btnC = box.querySelector('.fisc-btn-carica');
    if (banner) {
      if (daFare === 0) {
        banner.style.background = '#dcfce7'; banner.style.color = '#166534';
        banner.textContent = '\u2713 Fattura pronta per il carico \u2014 tutte le righe sono classificate o escluse';
      } else {
        banner.style.background = '#fef3c7'; banner.style.color = '#92400e';
        banner.textContent = '\u26a0\ufe0f ' + daFare + ' rig' + (daFare === 1 ? 'a' : 'he') + ' da completare: assegna la categoria o segna \"non \u00e8 un prodotto\" prima di caricare';
      }
    }
    if (btnC) { btnC.style.opacity = daFare === 0 ? '1' : '0.65'; btnC.dataset.pronto = daFare === 0 ? '1' : '0'; }
  }

  let html = '';
  html += '<div class="fisc-stato-banner" style="padding:9px 12px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:10px;"></div>';
  if (!giaFinalizzato) {
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">';
    html += '<button class="fisc-btn-match" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;">🔗 Abbina automaticamente</button>';
    html += '<button class="fisc-btn-carica" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;">📥 Carica in magazzino</button>';
    html += '</div>';
  } else {
    html += '<div style="background:#dcfce7;color:#166534;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:10px;">✓ Fattura già in magazzino · le categorie restano modificabili</div>';
  }

  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  for (const r of righe) {
    const nomeProd = r.prodotto_id ? (mappaProd.get(String(r.prodotto_id)) || "—") : null;
    const st0 = statiRiga[r.id];
    html += '<div class="fisc-riga" data-riga="' + r.id + '" style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
    html += '<span class="fisc-dot" data-riga="' + r.id + '" title="' + (LBL[st0]||'') + '" style="display:inline-block;width:12px;height:12px;border-radius:50%;flex:0 0 auto;background:' + (COL[st0]||'#94a3b8') + ';"></span>';
    const omaggio = (Number(r.quantita) > 0) && (Number(r.prezzo_unitario) === 0 || Number(r.totale_riga) === 0);
    html += '<div style="font-weight:600;font-size:13px;">' + escapeHtml(r.descrizione_originale || "-") + '</div>';
    if (omaggio) html += '<span title="Merce omaggio: entra in magazzino a costo 0, abbassa il costo medio" style="font-size:10px;font-weight:700;color:#b45309;background:#fef3c7;border:1px solid #fde68a;border-radius:5px;padding:1px 6px;flex:0 0 auto;">🎁 Omaggio</span>';
    html += '</div>';
    html += '<div style="font-size:12px;color:#64748b;margin-bottom:8px;padding-left:20px;">' + (r.quantita ?? "-") + ' ' + escapeHtml(r.unita_misura || "") + ' · € ' + formatMoney(r.prezzo_unitario || 0) + '/u · tot € ' + formatMoney(r.totale_riga || 0) + '</div>';

    // Riga a valore negativo (omaggio/sconto): indica quale riga della fattura sta compensando
    const totR = Number(r.totale_riga);
    if (Number.isFinite(totR) && totR < 0) {
      const compensata = righe.find(x => x.id !== r.id && Math.abs(Number(x.totale_riga) + totR) < 0.005);
      if (compensata) {
        const nomeC = compensata.prodotto_id ? (mappaProd.get(String(compensata.prodotto_id)) || "") : "";
        html += '<div style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 8px;margin:0 0 8px 20px;">🎁 Compensa la riga ' + (compensata.numero_riga || "?") + ': ' + escapeHtml(compensata.descrizione_originale || "") + (nomeC ? ' → ' + escapeHtml(nomeC) : '') + ' — la merce è già caricata da quella riga</div>';
      }
    }

    if (ESCLUSE.has(r.match_metodo)) {
      const etichetta = r.match_metodo === 'descrittiva'
        ? '📄 Riga descrittiva (riferimento documento / sconto) — esclusa dal magazzino'
        : '🚫 Non è un prodotto — esclusa dal magazzino';
      html += '<div style="display:flex;align-items:center;gap:10px;padding-left:20px;flex-wrap:wrap;"><span style="font-size:12px;color:#64748b;font-weight:600;">' + etichetta + '</span><button class="fisc-ripristina" data-riga="' + r.id + '" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">Ripristina</button>' + btnElimina(r.id) + '</div>';
      html += '</div>';
      continue;
    }
    const isMatched = !!r.prodotto_id;
    if (!giaFinalizzato || !isMatched) {
      html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
      html += '<select class="fisc-select" data-riga="' + r.id + '" style="flex:1;min-width:150px;padding:7px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">';
      html += '<option value="">— scegli prodotto —</option>' + optionsProdotti;
      html += '</select>';
      html += badgeConf(r.match_confidenza, r.match_confermato);
      html += '<button class="fisc-conferma" data-riga="' + r.id + '" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;">Abbina</button>';
      html += '<button class="fisc-crea" data-riga="' + r.id + '" style="background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;">＋ Crea prodotto</button>';
      html += '<button class="fisc-nonprod" data-riga="' + r.id + '" style="background:#fff1f2;border:1px solid #fecdd3;color:#be123c;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;">🚫 Non è un prodotto</button>';
      html += btnElimina(r.id);
      html += '</div>';
    } else {
      const nomeVis = mappaNomeInt.get(String(r.prodotto_id)) || nomeProd || "non abbinato";
      html += '<div style="font-size:13px;margin-bottom:4px;padding-left:20px;">→ ' + escapeHtml(nomeVis) + '</div>';
      html += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:2px;padding-left:20px;flex-wrap:wrap;">';
      html += '<span style="font-size:11px;color:#64748b;">🏷️ Nome interno</span>';
      html += '<input class="fisc-nome-interno" data-riga="' + r.id + '" data-prod="' + r.prodotto_id + '" value="' + escapeHtml(mappaNomeInt.get(String(r.prodotto_id)) || "") + '" placeholder="' + escapeHtml(nomeProd || "nome comodo per voi") + '" style="flex:1;min-width:180px;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;" />';
      html += '<button class="fisc-salva-nome" data-riga="' + r.id + '" data-prod="' + r.prodotto_id + '" style="background:#0E5A7A;color:#fff;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">💾 Salva</button>';
      html += btnElimina(r.id);
      html += '</div>';
    }

    // Categorie — sempre modificabili (anche se già in magazzino)
    html += '<div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;">';
    html += '<span style="font-size:11px;color:#64748b;">📊 Bilancio</span>';
    html += '<select class="fisc-cat" data-riga="' + r.id + '" style="flex:1;min-width:150px;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">';
    html += '<option value="">— da classificare —</option>' + optionsCategorie + '<option value="__new__">＋ Nuova categoria…</option>';
    html += '</select>';
    html += '<span style="font-size:11px;color:#64748b;">🏷️ Interna</span>';
    html += '<select class="fisc-interna" data-riga="' + r.id + '" style="flex:1;min-width:150px;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">';
    html += '<option value="">— da classificare —</option>' + optionsInterne() + '<option value="__new__">＋ Nuova categoria…</option>';
    html += '</select>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';
  box.innerHTML = html;

  box.addEventListener("click", (e) => e.stopPropagation());
  box.querySelectorAll("select").forEach(s => {
    s.addEventListener("click", (e) => e.stopPropagation());
    s.addEventListener("change", (e) => e.stopPropagation());
  });

  box.querySelectorAll(".fisc-select").forEach(sel => {
    const riga = righe.find(x => x.id === sel.getAttribute("data-riga"));
    if (riga && riga.prodotto_id) sel.value = String(riga.prodotto_id);
  });

  // Bilancio
  box.querySelectorAll(".fisc-cat").forEach(sel => {
    const rigaId = sel.getAttribute("data-riga");
    const riga = righe.find(x => x.id === rigaId);
    const prodId = riga?.prodotto_id;
    if (prodId) { const c = mappaCatProd.get(String(prodId)); if (c != null) sel.value = String(c); }
    sel.addEventListener("change", async () => {
      const pid = (righe.find(x => x.id === rigaId) || {}).prodotto_id;
      if (!pid) { alert("Prima abbina un prodotto a questa riga."); sel.value = ""; return; }
      // "nuova categoria": si chiede il nome e si crea al volo
      if (sel.value === "__new__") {
        const nome = (prompt("Nome della nuova categoria di bilancio:") || "").trim();
        if (!nome) { sel.value = mappaCatProd.get(String(pid)) != null ? String(mappaCatProd.get(String(pid))) : ""; return; }

        const supaNew = window.supabaseClient || window.supabase;
        const esistente = categorie.find(c => String(c.nome || "").trim().toLowerCase() === nome.toLowerCase());

        let idNuova = esistente ? esistente.id : null;
        if (!idNuova) {
          sel.disabled = true;
          const { data: creata, error: errCat } = await supaNew
            .from("categorie_bilancio")
            .insert({ nome, tipo: "costo", attivo: true, ordine: 999 })
            .select("id, nome, tipo, solo_costo, ordine")
            .single();
          sel.disabled = false;
          if (errCat || !creata) {
            alert("Errore creazione categoria: " + (errCat ? errCat.message : "riprova"));
            sel.value = mappaCatProd.get(String(pid)) != null ? String(mappaCatProd.get(String(pid))) : "";
            return;
          }
          idNuova = creata.id;
          categorie.push(creata);
          mappaNomeCat.set(String(creata.id), creata.nome);
          // la nuova voce compare in tutte le tendine gia' disegnate
          box.querySelectorAll("select.fisc-cat").forEach(altra => {
            const opt = document.createElement("option");
            opt.value = String(creata.id);
            opt.textContent = creata.nome;
            altra.insertBefore(opt, altra.querySelector('option[value="__new__"]'));
          });
        }
        sel.value = String(idNuova);
      }

      const nuova = sel.value ? Number(sel.value) : null;
      const precedente = mappaCatProd.get(String(pid));

      // cambiare una categoria gia' impostata sposta il prodotto in un'altra voce
      // di bilancio in tutti i report: meglio chiederlo prima di farlo
      if (precedente != null && String(precedente) !== String(nuova ?? "")) {
        const nomeProd = (mappaNomeProd.get(String(pid)) || "questo prodotto");
        const nomeVecchia = (mappaNomeCat.get(String(precedente)) || "categoria attuale");
        const nomeNuova = nuova != null ? (mappaNomeCat.get(String(nuova)) || "nuova categoria") : "nessuna categoria";
        const ok = confirm(
          nomeProd + " è già classificato come \"" + nomeVecchia + "\".\n\n" +
          "Vuoi spostarlo su \"" + nomeNuova + "\"?\n\n" +
          "La modifica vale per il prodotto ovunque, anche nelle fatture già caricate e nei report."
        );
        if (!ok) { sel.value = String(precedente); return; }
      }

      sel.disabled = true;
      const supaDir = window.supabaseClient || window.supabase;
      const { error } = await supaDir.from("prodotti").update({ categoria_bilancio_id: nuova }).eq("id", pid).eq("azienda_id", azienda.id);
      sel.disabled = false;
      if (error) { alert("Errore salvataggio bilancio: " + error.message); return; }
      mappaCatProd.set(String(pid), nuova);
      statiRiga[rigaId] = statoDaProd(pid);
      applyDot(dotEl(rigaId), statiRiga[rigaId]);
      aggiornaDotFattura();
      aggiornaStatoCaricabile();
    });
  });

  // Interna (+ crea nuova)
  box.querySelectorAll(".fisc-interna").forEach(sel => {
    const rigaId = sel.getAttribute("data-riga");
    const riga = righe.find(x => x.id === rigaId);
    const prodId = riga?.prodotto_id;
    if (prodId) { const v = (mappaIntProd.get(String(prodId)) || "").trim(); if (v && v.toLowerCase() !== "varie") sel.value = v; }
    sel.addEventListener("change", async () => {
      const pid = (righe.find(x => x.id === rigaId) || {}).prodotto_id;
      if (!pid) { alert("Prima abbina un prodotto a questa riga."); sel.value = ""; return; }
      let valore = sel.value;
      if (valore === "__new__") {
        const nome = (prompt("Nome nuova categoria interna:") || "").trim();
        if (!nome) { sel.value = ""; return; }
        if (!interneList.some(x => x.toLowerCase() === nome.toLowerCase())) {
          interneList.push(nome); interneList.sort((a,b) => a.localeCompare(b));
          box.querySelectorAll(".fisc-interna").forEach(s2 => {
            const optNew = s2.querySelector('option[value="__new__"]');
            const o = document.createElement("option"); o.value = nome; o.textContent = nome;
            s2.insertBefore(o, optNew);
          });
        }
        sel.value = nome; valore = nome;
      }
      const nuova = valore ? valore : null;
      const precedenteInt = (mappaIntProd.get(String(pid)) || "").trim();

      // stessa cautela della categoria bilancio: se ne aveva gia' una, si chiede
      if (precedenteInt && precedenteInt.toLowerCase() !== "varie" &&
          precedenteInt.toLowerCase() !== String(nuova || "").trim().toLowerCase()) {
        const nomeProd = mappaNomeProd.get(String(pid)) || "questo prodotto";
        const ok = confirm(
          nomeProd + " è già in \"" + precedenteInt + "\".\n\n" +
          "Vuoi spostarlo in \"" + (nuova || "nessuna categoria") + "\"?\n\n" +
          "La modifica vale per il prodotto ovunque, anche nelle fatture già caricate."
        );
        if (!ok) { sel.value = precedenteInt; return; }
      }

      sel.disabled = true;
      const supaDir = window.supabaseClient || window.supabase;
      const { error } = await supaDir.from("prodotti").update({ categoria_interna: nuova }).eq("id", pid).eq("azienda_id", azienda.id);
      sel.disabled = false;
      if (error) { alert("Errore salvataggio interna: " + error.message); return; }
      mappaIntProd.set(String(pid), nuova);
      statiRiga[rigaId] = statoDaProd(pid);
      applyDot(dotEl(rigaId), statiRiga[rigaId]);
      aggiornaDotFattura();
      aggiornaStatoCaricabile();
    });
  });

  const btnMatch = box.querySelector(".fisc-btn-match");
  if (btnMatch) btnMatch.addEventListener("click", async () => {
    btnMatch.disabled = true; btnMatch.textContent = "⏳ Abbinamento...";
    const d = await fiscaleFetch(FISCALE_MATCH_URL, { azienda_id: azienda.id, documento_id: documentoId });
    if (d.success) { box.dataset.caricato = ""; await renderRigheFiscali(box, documentoId, azienda); }
    else { alert("Errore: " + (d.error || "riprova")); btnMatch.disabled = false; btnMatch.textContent = "🔗 Abbina automaticamente"; }
  });

  box.querySelectorAll(".fisc-conferma").forEach(btn => {
    btn.addEventListener("click", async () => {
      const rigaId = btn.getAttribute("data-riga");
      const sel = box.querySelector('.fisc-select[data-riga="' + rigaId + '"]');
      const prodId = sel && sel.value ? Number(sel.value) : null;
      if (!prodId) { alert("Scegli prima un prodotto dalla tendina (o usa Crea prodotto)."); return; }
      btn.disabled = true; btn.textContent = "...";
      const d = await fiscaleFetch(FISCALE_CONFERMA_URL, { azione: "conferma_riga", azienda_id: azienda.id, riga_id: rigaId, prodotto_id: prodId });
      if (d.success) {
        btn.textContent = "✓"; btn.style.background = "#dcfce7";
        const riga = righe.find(x => x.id === rigaId); if (riga) riga.prodotto_id = prodId;
        statiRiga[rigaId] = statoDaProd(prodId);
        applyDot(dotEl(rigaId), statiRiga[rigaId]);
        aggiornaDotFattura();
        aggiornaStatoCaricabile();
        if (giaFinalizzato) await renderRigheFiscali(box, documentoId, azienda);
      } else { alert("Errore: " + (d.error || "riprova")); btn.disabled = false; btn.textContent = "Abbina"; }
    });
  });

  box.querySelectorAll(".fisc-crea").forEach(btn => {
    btn.addEventListener("click", async () => {
      const rigaId = btn.getAttribute("data-riga");
      const riga = righe.find(x => x.id === rigaId);
      if (!riga) return;
      const nomeSugg = String(riga.descrizione_originale || "").replace(/^\s*sconto\s+merce\s*:?\s*/i, "").trim();
      const nome = (prompt("Nome del nuovo prodotto da creare:", nomeSugg) || "").trim();
      if (!nome) return;
      btn.disabled = true; btn.textContent = "...";
      const supaDir = window.supabaseClient || window.supabase;
      const { data: nuovo, error: errP } = await supaDir.from("prodotti").insert({
        azienda_id: azienda.id, nome: nome.toLowerCase(), descrizione: riga.descrizione_originale || nome,
        tipo_prodotto: "materia_prima", um: riga.unita_misura || "pz", unita_misura: riga.unita_misura || "pz",
        costo_ultimo: (Number(riga.prezzo_unitario) > 0 ? Number(riga.prezzo_unitario) : 0),
        attivo: true, categoria_bilancio_id: 7, categoria_interna: null
      }).select("id").single();
      if (errP || !nuovo) { alert("Errore creazione prodotto: " + (errP?.message || "riprova")); btn.disabled = false; btn.textContent = "＋ Crea prodotto"; return; }
      const d = await fiscaleFetch(FISCALE_CONFERMA_URL, { azione: "conferma_riga", azienda_id: azienda.id, riga_id: rigaId, prodotto_id: nuovo.id });
      if (!d.success) alert("Prodotto creato ma abbinamento non riuscito: " + (d.error || "riprova"));
      await renderRigheFiscali(box, documentoId, azienda);
    });
  });

  box.querySelectorAll(".fisc-nonprod").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const rid = btn.getAttribute("data-riga");
      btn.disabled = true;
      const { error } = await supa.from("fiscale_documenti_righe")
        .update({ prodotto_id: null, match_confermato: true, match_metodo: "non_prodotto" }).eq("id", rid);
      if (error) { btn.disabled = false; alert("Errore: " + error.message); return; }
      await renderRigheFiscali(box, documentoId, azienda);
    });
  });

  box.querySelectorAll(".fisc-elimina").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const rid = btn.getAttribute("data-riga");
      const riga = righe.find(x => x.id === rid);
      const nome = riga ? (riga.descrizione_originale || "questa riga") : "questa riga";
      if (!confirm('Eliminare definitivamente la riga:\n\n' + nome + '\n\nSe era già stata caricata, il movimento di magazzino corrispondente viene rimosso.')) return;
      btn.disabled = true; btn.textContent = "…";
      const d = await fiscaleFetch(FISCALE_CONFERMA_URL, { azione: "elimina_riga", azienda_id: azienda.id, riga_id: rid });
      if (!d.success) { btn.disabled = false; btn.textContent = "🗑"; alert("Errore: " + (d.error || "riprova")); return; }
      box.dataset.caricato = "";
      await renderRigheFiscali(box, documentoId, azienda);
    });
  });

  box.querySelectorAll(".fisc-ripristina").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const rid = btn.getAttribute("data-riga");
      btn.disabled = true;
      const { error } = await supa.from("fiscale_documenti_righe")
        .update({ match_metodo: null, match_confermato: false }).eq("id", rid);
      if (error) { btn.disabled = false; alert("Errore: " + error.message); return; }
      await renderRigheFiscali(box, documentoId, azienda);
    });
  });

  async function salvaNomeInterno(inp, btn) {
    const prodId = inp.getAttribute("data-prod");
    if (!prodId) return;
    const rigaId = inp.getAttribute("data-riga");
    const val = inp.value.trim();
    const supaDir = window.supabaseClient || window.supabase;

    inp.disabled = true;
    if (btn) { btn.disabled = true; btn.textContent = "…"; }

    const { error } = await supaDir.from("prodotti")
      .update({ nome_interno: val || null }).eq("id", Number(prodId)).eq("azienda_id", azienda.id);

    // l'alias fa riconoscere la stessa voce alla prossima fattura, anche se il
    // fornitore ci attacca il mese o il numero pratica
    if (!error) {
      const riga = righe.find(x => String(x.id) === String(rigaId));
      const testo = radiceDescrizione(riga ? riga.descrizione_originale : "");
      if (testo) {
        const { data: giaCe } = await supaDir.from("prodotti_alias_ocr")
          .select("id").eq("azienda_id", azienda.id).eq("testo_ocr", testo).maybeSingle();
        if (!giaCe) {
          await supaDir.from("prodotti_alias_ocr")
            .insert({ azienda_id: azienda.id, testo_ocr: testo, prodotto_id: Number(prodId) });
        }
      }
    }

    inp.disabled = false;
    if (btn) { btn.disabled = false; btn.textContent = error ? "Riprova" : "✓ Salvato"; }
    if (error) { alert("Errore salvataggio nome interno: " + error.message); return; }
    mappaNomeInt.set(String(prodId), val);
    inp.style.borderColor = "#16a34a";
    if (btn) setTimeout(() => { btn.textContent = "💾 Salva"; }, 2000);
  }

  box.querySelectorAll(".fisc-nome-interno").forEach(inp => {
    inp.addEventListener("click", (e) => e.stopPropagation());
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        salvaNomeInterno(inp, box.querySelector('.fisc-salva-nome[data-riga="' + inp.getAttribute("data-riga") + '"]'));
      }
    });
    inp.addEventListener("change", () => {
      salvaNomeInterno(inp, box.querySelector('.fisc-salva-nome[data-riga="' + inp.getAttribute("data-riga") + '"]'));
    });
  });

  box.querySelectorAll(".fisc-salva-nome").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const inp = box.querySelector('.fisc-nome-interno[data-riga="' + btn.getAttribute("data-riga") + '"]');
      if (inp) salvaNomeInterno(inp, btn);
    });
  });

  const btnCarica = box.querySelector(".fisc-btn-carica");
  if (btnCarica) btnCarica.addEventListener("click", async () => {
    const daFare = Object.values(statiRiga).filter(s => s === 'red' || s === 'yellow').length;
    const msgC = daFare > 0
      ? ("\u26a0\ufe0f Ci sono ancora " + daFare + " righe da classificare: verranno SALTATE. Caricare comunque solo le righe pronte?")
      : "Caricare in magazzino le righe confermate? Genera i movimenti di carico e aggiorna i costi.";
    if (!confirm(msgC)) return;
    btnCarica.disabled = true; btnCarica.textContent = "⏳ Carico...";
    const d = await fiscaleFetch(FISCALE_CONFERMA_URL, { azione: "finalizza", azienda_id: azienda.id, documento_id: documentoId });
    if (d.success) {
      alert("✅ Caricate " + d.carichi_generati + " righe in magazzino.\n" + (d.righe_non_confermate ? (d.righe_non_confermate + " righe non confermate sono state saltate.") : "Tutte le righe caricate!"));
      box.dataset.caricato = ""; await renderRigheFiscali(box, documentoId, azienda);
    } else {
      alert("Errore: " + (d.error || "riprova")); btnCarica.disabled = false; btnCarica.textContent = "📥 Carica in magazzino";
    }
  });

  aggiornaStatoCaricabile();
}
