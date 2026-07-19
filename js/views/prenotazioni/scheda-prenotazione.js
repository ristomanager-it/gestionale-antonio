export async function render(container) {
  const prenotazioneId = window.routeParams?.id || null;
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;

  container.innerHTML = `
    <div class="view prenotazione-dettaglio-view">
      <style>
        .pren-det-view{
          min-height:100%;
          background:#f7f9fc;
          padding:0 0 96px;
        }

        .pren-det-header{
          position:sticky;
          top:0;
          z-index:20;
          background:#ffffff;
          border-bottom:1px solid #e5e7eb;
          padding:10px 12px;
        }

        .pren-det-top{
          display:grid;
          grid-template-columns:40px 1fr 40px;
          align-items:center;
          gap:8px;
        }

        .pren-det-title-wrap{
          min-width:0;
          text-align:center;
        }

        .pren-det-title{
          font-size:15px;
          font-weight:700;
          color:#111827;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .pren-det-subtitle{
          margin-top:2px;
          font-size:11px;
          color:#6b7280;
          font-weight:500;
        }

        .pren-det-icon-btn{
          width:40px;
          height:40px;
          border:none;
          border-radius:12px;
          background:#eef2f7;
          color:#374151;
          font-size:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }

        .pren-det-content{
          padding:12px 10px 0;
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .pren-det-card{
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:12px;
          box-shadow:0 2px 8px rgba(0,0,0,0.04);
        }

        .pren-det-section-title{
          font-size:12px;
          font-weight:700;
          color:#111827;
          margin-bottom:10px;
          text-transform:uppercase;
          letter-spacing:.04em;
        }

        .pren-det-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
        }

        .pren-det-field{
          display:flex;
          flex-direction:column;
          gap:6px;
        }

        .pren-det-field.full{
          grid-column:1 / -1;
        }

        .pren-det-label{
          font-size:11px;
          font-weight:600;
          color:#4b5563;
        }

        .pren-det-input,
        .pren-det-select,
        .pren-det-textarea{
          width:100%;
          border:1px solid #d1d5db;
          border-radius:12px;
          background:#ffffff;
          min-height:42px;
          padding:0 12px;
          font-size:14px;
          color:#111827;
          outline:none;
          box-sizing:border-box;
        }

        .pren-det-input:focus,
        .pren-det-select:focus,
        .pren-det-textarea:focus{
          border-color:#0E5A7A;
          box-shadow:0 0 0 3px rgba(14,90,122,0.12);
        }

        .pren-det-textarea{
          min-height:110px;
          padding:12px;
          resize:vertical;
        }

        .pren-det-actions{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
        }

        .pren-det-btn{
          min-height:46px;
          border:none;
          border-radius:14px;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
        }

        .pren-det-btn.primary{
          background:#0E5A7A;
          color:#ffffff;
          box-shadow:0 8px 18px rgba(14,90,122,0.18);
        }

        .pren-det-btn.secondary{
          background:#eef2f7;
          color:#374151;
        }

        .pren-det-inline{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          align-items:center;
        }

        .pren-det-pill{
          display:inline-flex;
          align-items:center;
          min-height:28px;
          padding:0 10px;
          border-radius:999px;
          background:#f3f4f6;
          color:#374151;
          font-size:11px;
          font-weight:700;
        }

        .pren-det-pill.in_attesa{
          background:#fef3c7;
          color:#92400e;
        }

        .pren-det-pill.confermata{
          background:#dbeafe;
          color:#1d4ed8;
        }

        .pren-det-pill.arrivata{
          background:#dcfce7;
          color:#166534;
        }

        .pren-det-pill.no_show{
          background:#fee2e2;
          color:#991b1b;
        }

        .pren-det-pill.annullata{
          background:#e5e7eb;
          color:#374151;
        }

        .pren-det-loading,
        .pren-det-error,
        .pren-det-empty,
        .pren-det-success{
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:18px 14px;
          text-align:center;
          color:#6b7280;
          font-size:13px;
          font-weight:600;
        }

        .pren-det-error{
          color:#991b1b;
          background:#fff7f7;
          border-color:#fecaca;
        }

        .pren-det-success{
          color:#166534;
          background:#f0fdf4;
          border-color:#bbf7d0;
        }

        .pren-det-link-row{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .pren-det-link{
          min-height:42px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:0 12px;
          border-radius:12px;
          background:#f8fafc;
          border:1px solid #e5e7eb;
          color:#111827;
          font-size:13px;
          font-weight:600;
          cursor:pointer;
        }

        .pren-det-link small{
          color:#6b7280;
          font-weight:600;
        }

        @media (max-width: 640px){
          .pren-det-grid{
            grid-template-columns:1fr;
          }

          .pren-det-actions{
            grid-template-columns:1fr;
          }
        }

        @media (min-width: 768px){
          .pren-det-content{
            max-width:840px;
            margin:0 auto;
            padding:14px 12px 0;
          }
        }
      </style>

      <div class="pren-det-view">
        <div class="pren-det-header">
          <div class="pren-det-top">
            <button type="button" id="pren-det-back" class="pren-det-icon-btn" aria-label="Indietro">←</button>

            <div class="pren-det-title-wrap">
              <div class="pren-det-title">Scheda prenotazione</div>
              <div id="pren-det-subtitle" class="pren-det-subtitle">Caricamento...</div>
            </div>

            <button type="button" id="pren-det-refresh" class="pren-det-icon-btn" aria-label="Aggiorna">↻</button>
          </div>
        </div>

        <div id="pren-det-body" class="pren-det-content">
          <div class="pren-det-loading">Caricamento prenotazione...</div>
        </div>
      </div>
    </div>
  `;

  const body = container.querySelector("#pren-det-body");
  const subtitle = container.querySelector("#pren-det-subtitle");
  const backBtn = container.querySelector("#pren-det-back");
  const refreshBtn = container.querySelector("#pren-det-refresh");

  const pageState = {
    prenotazione: null,
    saving: false
  };

  backBtn.onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  refreshBtn.onclick = async () => {
    await loadPrenotazione();
  };

  if (!prenotazioneId) {
    subtitle.textContent = "ID mancante";
    body.innerHTML = `<div class="pren-det-error">ID prenotazione mancante</div>`;
    return;
  }

  async function loadPrenotazione() {
    body.innerHTML = `<div class="pren-det-loading">Caricamento prenotazione...</div>`;
    subtitle.textContent = `ID ${escapeHtml(String(prenotazioneId))}`;

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("id", prenotazioneId);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("ERRORE CARICAMENTO PRENOTAZIONE:", error);
      subtitle.textContent = "Errore caricamento";
      body.innerHTML = `<div class="pren-det-error">Errore caricamento prenotazione</div>`;
      return;
    }

    if (!data) {
      subtitle.textContent = `ID ${escapeHtml(String(prenotazioneId))}`;
      body.innerHTML = `<div class="pren-det-empty">Prenotazione non trovata</div>`;
      return;
    }

    pageState.prenotazione = data;
    renderForm();
  }

  function renderForm(message = "") {
    const p = pageState.prenotazione || {};
    const nomeCliente = buildClientName(p);
    const statoValue = String(p.stato || "in_attesa").toLowerCase();
    const contattoId = p.contatto_id || "";
    const telefono = p.telefono || p.cliente_telefono || p.phone || "";
    const servizio = inferService(p);

    subtitle.textContent = `${escapeHtml(nomeCliente)} · ${escapeHtml((p.data || "").toString())} ${escapeHtml((p.ora || "").toString().slice(0, 5))}`;

    body.innerHTML = `
      ${message ? `<div class="pren-det-success">${escapeHtml(message)}</div>` : ""}

      <div class="pren-det-card">
        <div class="pren-det-section-title">Riepilogo</div>

        <div class="pren-det-inline">
          <span class="pren-det-pill ${escapeAttribute(statoValue)}">${escapeHtml(getStatusLabel(statoValue))}</span>
          <span class="pren-det-pill">${Number(p.coperti) || 0} coperti</span>
          <span class="pren-det-pill">${escapeHtml(servizio)}</span>
          ${p.canale || p.origine || p.source ? `<span class="pren-det-pill">${escapeHtml(getOriginLabel(p))}</span>` : ""}
        </div>
      </div>

      <div class="pren-det-card">
        <div class="pren-det-section-title">Prenotazione</div>

        <div class="pren-det-grid">
          <div class="pren-det-field">
            <label class="pren-det-label" for="pren-data">Data</label>
            <input id="pren-data" class="pren-det-input" type="date" value="${escapeAttribute(normalizeDateValue(p.data))}">
          </div>

          <div class="pren-det-field">
            <label class="pren-det-label" for="pren-ora">Ora</label>
            <input id="pren-ora" class="pren-det-input" type="time" value="${escapeAttribute(normalizeTimeValue(p.ora))}">
          </div>

          <div class="pren-det-field">
            <label class="pren-det-label" for="pren-coperti">Coperti</label>
            <input id="pren-coperti" class="pren-det-input" type="number" min="1" step="1" <input id="pren-cognome" class="pren-det-input" type="text" value="${escapeAttribute(String(p.cognome || ""))}">
          </div>

          <div class="pren-det-field">
            <label class="pren-det-label" for="pren-stato">Stato</label>
            <select id="pren-stato" class="pren-det-select">
              ${renderStatoOptions(statoValue)}
            </select>
          </div>

          <div class="pren-det-field full">
            <label class="pren-det-label" for="pren-note">Note</label>
            <textarea id="pren-note" class="pren-det-textarea" placeholder="Aggiungi note">${escapeHtml(p.note || "")}</textarea>
          </div>

          <div class="pren-det-field full">
            <label class="pren-det-label">📎 Allegati (menu, documenti)</label>
            <div id="pren-allegati-esistenti" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
              ${(Array.isArray(p.allegati) ? p.allegati : []).map(a => `
                <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" style="font-size:13px;color:#0E5A7A;text-decoration:none;background:#f1f5f9;padding:8px 10px;border-radius:8px;display:flex;align-items:center;gap:6px;">
                  📄 ${escapeHtml(a.nome || "allegato")} <span style="color:#94a3b8;margin-left:auto;">apri ↗</span>
                </a>
              `).join("") || '<div style="font-size:13px;color:#94a3b8;">Nessun allegato</div>'}
            </div>
            <input type="file" id="pren-allegati-input" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="font-size:13px;" />
            <div id="pren-allegati-nuovi" style="margin-top:6px;display:flex;flex-direction:column;gap:6px;"></div>
          </div>
        </div>
      </div>

      <div class="pren-det-card">
        <div class="pren-det-section-title">Cliente</div>

        <div class="pren-det-grid">
          <div class="pren-det-field">
            <label class="pren-det-label" for="pren-nome">Nome</label>
            <input id="pren-nome" class="pren-det-input" type="text" value="${escapeAttribute(String(p.cliente_nome || p.nome_cliente || p.nome || ""))}">
          </div>

          <div class="pren-det-field">
            <label class="pren-det-label" for="pren-cognome">Cognome</label>
            <input id="pren-cognome" class="pren-det-input" type="text" value="${escapeAttribute(String(p.cognome || ""))}">
          </div>

          <div class="pren-det-field full">
            <label class="pren-det-label" for="pren-telefono">Telefono</label>
            <input id="pren-telefono" class="pren-det-input" type="tel" value="${escapeAttribute(String(telefono))}">
          </div>
        </div>

        <div class="pren-det-link-row" style="margin-top:12px;">
          <button type="button" id="pren-open-cliente" class="pren-det-link" ${contattoId ? "" : "disabled"} style="${contattoId ? "" : "opacity:.55;cursor:not-allowed;"}">
            <span>Apri scheda cliente</span>
            <small>${contattoId ? "Vai al contatto" : "Cliente non collegato"}</small>
          </button>

          <button type="button" id="pren-stampa" class="pren-det-link">
            <span>🖨 Stampa talloncino</span>
            <small>Nome, coperti, allergie e QR menu</small>
          </button>
          <button type="button" id="pren-open-wa" class="pren-det-link" ${telefono ? "" : "disabled"} style="${telefono ? "" : "opacity:.55;cursor:not-allowed;"}">
            <span>Apri WhatsApp</span>
            <small>${telefono ? escapeHtml(telefono) : "Telefono non disponibile"}</small>
          </button>
        </div>
      </div>

      <div class="pren-det-card">
        <div class="pren-det-section-title">Azioni</div>

        <div class="pren-det-actions">
          <button type="button" id="pren-save" class="pren-det-btn primary">Salva modifiche</button>
          <button type="button" id="pren-back-list" class="pren-det-btn secondary">Torna alla lista</button>
        </div>
      </div>
    `;

    bindFormEvents();
  }

  async function stampaTalloncino() {
    const p = pageState.prenotazione || {};
    const supabase = window.supabaseClient;
    const aziendaId = window.state?.azienda?.id;
    const nomeCliente = [p.cliente_nome, p.cognome].filter(Boolean).join(" ") || p.cliente_nome || "Ospite";
    const dataIt = p.data ? new Date(p.data + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" }) : "—";
    const ora = (p.ora || "").toString().slice(0, 5);
    const note = (p.note || "").trim();

    // sede + menu attivo (per il QR)
    let sedeNome = window.state?.azienda?.nome || "";
    let slug = null;
    try {
      if (p.sede_id) {
        const { data: s } = await supabase.from("sedi").select("nome").eq("id", p.sede_id).maybeSingle();
        if (s?.nome) sedeNome = s.nome;
        const { data: m1 } = await supabase.from("menu").select("slug").eq("sede_id", p.sede_id).eq("attivo", true).order("created_at", { ascending: false }).limit(1);
        slug = m1 && m1[0] ? m1[0].slug : null;
      }
      if (!slug && aziendaId) {
        const { data: m2 } = await supabase.from("menu").select("slug").eq("azienda_id", aziendaId).eq("attivo", true).order("created_at", { ascending: false }).limit(1);
        slug = m2 && m2[0] ? m2[0].slug : null;
      }
    } catch (e) { /* il QR e' un plus */ }
    const menuUrl = slug ? (window.location.origin + "/menu-pubblico.html?slug=" + encodeURIComponent(slug)) : null;

    // QR come dataURL (qrcodejs)
    let qrData = null;
    if (menuUrl && typeof QRCode !== "undefined") {
      try {
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
        document.body.appendChild(host);
        new QRCode(host, { text: menuUrl, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
        await new Promise(r => setTimeout(r, 30));
        const cv = host.querySelector("canvas");
        const im = host.querySelector("img");
        qrData = cv ? cv.toDataURL("image/png") : (im ? im.src : null);
        host.remove();
      } catch (e) { qrData = null; }
    }

    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
      <title>Prenotazione — ${escapeHtml(nomeCliente)}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:Georgia,'Times New Roman',serif; color:#1c2430; display:flex; justify-content:center; padding:24px; background:#f3f4f6; }
        .tall { background:#fff; width:148mm; min-height:105mm; padding:12mm; border:1px solid #e5e7eb; display:flex; flex-direction:column; }
        .top { text-align:center; border-bottom:2px solid #1c2430; padding-bottom:6mm; margin-bottom:6mm; }
        .locale { font-size:13px; letter-spacing:3px; text-transform:uppercase; color:#6b7280; }
        .riservato { font-style:italic; font-size:14px; color:#9ca3af; margin-top:4mm; }
        .nome { font-size:34px; font-weight:700; margin-top:2mm; }
        .mid { display:flex; gap:8mm; align-items:center; flex:1; }
        .dati { flex:1; }
        .riga { font-size:16px; margin-bottom:3mm; }
        .riga b { display:inline-block; min-width:34mm; font-family:Arial,sans-serif; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#6b7280; }
        .allergie { margin-top:4mm; background:#fff7ed; border:1.5px solid #fdba74; border-radius:8px; padding:4mm; }
        .allergie .t { font-family:Arial,sans-serif; font-size:10px; font-weight:700; letter-spacing:1px; color:#c2410c; text-transform:uppercase; }
        .allergie .v { font-size:14px; margin-top:1.5mm; }
        .qrbox { text-align:center; width:44mm; }
        .qrbox img { width:38mm; height:38mm; }
        .qrbox .cap { font-family:Arial,sans-serif; font-size:10px; color:#6b7280; margin-top:2mm; line-height:1.4; }
        .footer { text-align:center; font-family:Arial,sans-serif; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:3mm; margin-top:4mm; }
        .no-print { position:fixed; top:12px; right:12px; display:flex; gap:8px; }
        .no-print button { border:none; border-radius:999px; padding:10px 20px; font-size:13px; font-weight:700; cursor:pointer; font-family:Arial,sans-serif; }
        @media print { body { background:#fff; padding:0; } .tall { border:none; } .no-print { display:none !important; } }
      </style></head><body>
      <div class="no-print">
        <button onclick="window.print()" style="background:#0E5A7A;color:#fff;">🖨 Stampa</button>
        <button onclick="window.close()" style="background:#e2e8f0;color:#334155;">✕ Chiudi</button>
      </div>
      <div class="tall">
        <div class="top">
          <div class="locale">${escapeHtml(sedeNome)}</div>
          <div class="riservato">Tavolo riservato per</div>
          <div class="nome">${escapeHtml(nomeCliente)}</div>
        </div>
        <div class="mid">
          <div class="dati">
            <div class="riga"><b>Data</b> ${escapeHtml(dataIt)}</div>
            <div class="riga"><b>Orario</b> ${escapeHtml(ora || "—")}</div>
            <div class="riga"><b>Persone</b> ${Number(p.coperti) || 0}</div>
            ${note ? `<div class="allergie"><div class="t">⚠ Note / Allergie</div><div class="v">${escapeHtml(note)}</div></div>` : ""}
          </div>
          ${qrData ? `<div class="qrbox"><img src="${qrData}"><div class="cap">Inquadra per sfogliare<br><b>il nostro menu</b></div></div>` : ""}
        </div>
        <div class="footer">Benvenuti — vi auguriamo una piacevole permanenza</div>
      </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Consenti i popup per la stampa."); return; }
    win.document.open(); win.document.write(html); win.document.close();
  }

  function bindFormEvents() {
    const btnSave = container.querySelector("#pren-save");
    const btnBackList = container.querySelector("#pren-back-list");
    const btnOpenCliente = container.querySelector("#pren-open-cliente");
    const btnOpenWa = container.querySelector("#pren-open-wa");
    const btnStampa = container.querySelector("#pren-stampa");
    if (btnStampa) btnStampa.onclick = () => stampaTalloncino();

    if (btnBackList) {
      btnBackList.onclick = () => {
        window.location.hash = "#/prenotazioni";
      };
    }

    if (btnOpenCliente) {
      btnOpenCliente.onclick = () => {
        const contattoId = pageState.prenotazione?.contatto_id || "";
        if (!contattoId) return;
        window.location.hash = "#/contatti-dettaglio?id=" + encodeURIComponent(contattoId);
      };
    }

    // Anteprima nuovi allegati selezionati
    const allInput = container.querySelector("#pren-allegati-input");
    if (allInput) {
      allInput.onchange = () => {
        const box = container.querySelector("#pren-allegati-nuovi");
        const files = Array.from(allInput.files || []);
        box.innerHTML = files.map(f => {
          const kb = Math.round(f.size / 1024);
          return `<div style="font-size:13px;color:#374151;background:#ecfdf5;padding:6px 10px;border-radius:8px;">➕ ${f.name} <span style="color:#94a3b8;">(${kb} KB)</span></div>`;
        }).join("");
      };
    }

    if (btnOpenWa) {
      btnOpenWa.onclick = () => {
        const p = pageState.prenotazione || {};
        const phone = p.telefono || p.cliente_telefono || p.phone || "";
        if (!phone) return;

        const nome = buildClientName(p);
        const data = p?.data ? formatDateHuman(p.data) : "";
        const ora = p?.ora ? String(p.ora).slice(0, 5) : "";
        const coperti = p?.coperti || 0;

        const text = encodeURIComponent(
          `Ciao ${nome}, ti confermiamo la prenotazione per ${coperti} persone${data ? ` il ${data}` : ""}${ora ? ` alle ${ora}` : ""}.`
        );

        window.open(`https://wa.me/${sanitizePhone(phone)}?text=${text}`, "_blank");
      };
    }

    if (btnSave) {
      btnSave.onclick = async () => {
        if (pageState.saving) return;
        pageState.saving = true;
        btnSave.disabled = true;
        btnSave.textContent = "Salvataggio...";

        try {
          const payload = await buildPayloadFromForm();
          const { error, data } = await window.supabaseClient
            .from("prenotazioni_tavoli")
            .update(payload)
            .eq("id", prenotazioneId)
            .select("*")
            .maybeSingle();

          if (error) {
            console.error("ERRORE SALVATAGGIO PRENOTAZIONE:", error);
            alert("Errore salvataggio prenotazione");
            return;
          }

          if (data) {
            pageState.prenotazione = data;
          } else {
            pageState.prenotazione = { ...(pageState.prenotazione || {}), ...payload };
          }

          renderForm("Prenotazione aggiornata");
        } finally {
          pageState.saving = false;
        }
      };
    }
  }

  async function buildPayloadFromForm() {
    const current = pageState.prenotazione || {};

   const data = container.querySelector("#pren-data")?.value || null;
const ora = container.querySelector("#pren-ora")?.value || null;
const coperti = Math.max(1, Number(container.querySelector("#pren-coperti")?.value || 0));

// 🔥 FIX STATO
let stato = container.querySelector("#pren-stato")?.value;

// fallback sicuro
if (!stato || stato === "in_attesa") {
  stato = "confermata";
}

const note = container.querySelector("#pren-note")?.value || "";
const clienteNome = container.querySelector("#pren-nome")?.value || "";
const clienteCognome = container.querySelector("#pren-cognome")?.value || "";
const telefono = container.querySelector("#pren-telefono")?.value || "";

// Allegati: parto da quelli esistenti e aggiungo i nuovi caricati
let allegatiFinali = Array.isArray(current.allegati) ? [...current.allegati] : [];
const inputAll = container.querySelector("#pren-allegati-input");
const nuoviFile = inputAll?.files ? Array.from(inputAll.files) : [];
if (nuoviFile.length) {
  const azId = current.azienda_id;
  for (const file of nuoviFile) {
    try {
      const est = file.name.split(".").pop();
      const path = `prenotazioni/${azId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${est}`;
      const { error: upErr } = await window.supabaseClient.storage.from("media-aziende").upload(path, file, { upsert: false });
      if (upErr) { console.warn("Upload allegato fallito:", upErr.message); continue; }
      const { data: pub } = window.supabaseClient.storage.from("media-aziende").getPublicUrl(path);
      allegatiFinali.push({ nome: file.name, url: pub?.publicUrl || "", tipo: file.type || est, caricato_il: new Date().toISOString() });
    } catch (e) { console.warn("Errore upload allegato:", e); }
  }
}

// DEBUG (puoi toglierlo dopo)
console.log("STATO SALVATO:", stato);
const payload = {
  data,
  ora,
  coperti,
  stato,
  note,
  allegati: allegatiFinali,
  cliente_nome: clienteNome,
  cognome: clienteCognome,
  cliente_telefono: telefono
};
    if ("nome_cliente" in current) payload.nome_cliente = clienteNome;
    if ("nome" in current && !("cliente_nome" in current)) payload.nome = clienteNome;
    if ("cognome" in current || clienteCognome) payload.cognome = clienteCognome;
    if ("cliente_telefono" in current) payload.cliente_telefono = telefono;
   
    return payload;
  }

  function renderStatoOptions(selected) {
    const stati = [
      { value: "in_attesa", label: "In attesa" },
      { value: "confermata", label: "Confermata" },
      { value: "arrivata", label: "Arrivata" },
      { value: "no_show", label: "No show" },
      { value: "annullata", label: "Annullata" }
    ];

    return stati.map((item) => {
      const isSelected = item.value === selected ? "selected" : "";
      return `<option value="${escapeAttribute(item.value)}" ${isSelected}>${escapeHtml(item.label)}</option>`;
    }).join("");
  }

  function getStatusLabel(stato) {
    const value = String(stato || "").toLowerCase();
    if (value === "in_attesa") return "ATT";
    if (value === "confermata") return "CONF";
    if (value === "arrivata") return "ARR";
    if (value === "no_show") return "NO SHOW";
    if (value === "annullata") return "ANNULLATA";
    return value || "STATO";
  }

  function inferService(p) {
    if (p.servizio) return String(p.servizio).toLowerCase();

    const ora = String(p.ora || "").slice(0, 5);
    if (!ora) return "pranzo";

    if (ora >= "06:00" && ora < "11:00") return "colazione";
    if (ora >= "11:00" && ora < "15:30") return "pranzo";
    if (ora >= "15:30" && ora < "19:30") return "aperitivo";
    return "cena";
  }

  function getOriginLabel(p) {
    const channel = String(p.canale || p.origine || p.source || "").trim();
    return channel || "Prenotazione";
  }

  function buildClientName(p) {
    const nome = String(p?.cliente_nome || p?.nome_cliente || p?.nome || "").trim();
    const cognome = String(p?.cognome || "").trim();
    const full = `${nome} ${cognome}`.trim();
    return full || "Cliente";
  }

  function normalizeDateValue(value) {
    if (!value) return "";
    const raw = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
  }

  function normalizeTimeValue(value) {
    if (!value) return "";
    const raw = String(value).slice(0, 5);
    return /^\d{2}:\d{2}$/.test(raw) ? raw : "";
  }

  function formatDateHuman(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function sanitizePhone(phone) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  await loadPrenotazione();
}
