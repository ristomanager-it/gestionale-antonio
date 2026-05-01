import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";
import { generaMessaggiTony, renderMessaggiTony } from "../utils/tonyMessages.js";
export async function render(container) {
  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const sedeAttiva = window.state?.sedeAttiva;
  const dipendenteId = window.routeParams?.id || null;

  if (!user || !azienda) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Errore</h2>
        <p class="small-muted" style="margin-top:6px;">Sessione o azienda non disponibile.</p>
      </div>
    `;
    return;
  }

  if (!dipendenteId) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Dipendente non trovato</h2>
        <p class="small-muted" style="margin-top:6px;">Manca l'identificativo del dipendente nella route.</p>
        <div style="margin-top:16px;">
          <button class="app-button small gray" id="btn-back-dipendenti">⬅ Torna ai dipendenti</button>
        </div>
      </div>
    `;

    const btnBack = document.getElementById("btn-back-dipendenti");
    if (btnBack) {
      btnBack.onclick = () => {
        window.location.hash = "#/dipendenti";
      };
    }
    return;
  }

  if (!window.hasPermesso || !window.hasPermesso("dipendenti.read")) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Accesso negato</h2>
        <p class="small-muted" style="margin-top:6px;">
          Non hai i permessi per visualizzare la scheda dipendente.
        </p>
      </div>
    `;
    return;
  }

  const [
    dipRes,
    sediRes,
    repartiRes,
    valutazioniRes,
    metricheRes,
    presenzaData,
    produzioneData,
    quizData
  ] = await Promise.all([
    supabase
      .from("dipendenti")
      .select("*")
      .eq("id", dipendenteId)
      .eq("azienda_id", azienda.id)
      .single(),

    supabase
      .from("sedi")
      .select("id,nome")
      .eq("azienda_id", azienda.id)
      .order("nome", { ascending: true }),

    supabase
      .from("reparti")
      .select("id,nome")
      .eq("azienda_id", azienda.id)
      .order("sort_order", { ascending: true }),

    supabase
      .from("dipendenti_valutazioni")
      .select(`
        id,
        periodo_da,
        periodo_a,
        tipo,
        punteggio_presenza,
        punteggio_velocita,
        punteggio_qualita,
        punteggio_conoscenza,
        punteggio_autonomia,
        punteggio_collaborazione,
        punteggio_responsabilita,
        punteggio_totale,
        punti_forza,
        aree_miglioramento,
        note_manager,
        azione_consigliata,
        valutatore_ruolo,
        created_at
      `)
      .eq("azienda_id", azienda.id)
      .eq("dipendente_id", dipendenteId)
      .order("created_at", { ascending: false }),

    supabase
      .from("valutazioni_metriche")
      .select("id,nome,categoria,peso,ordine,attivo")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("ordine", { ascending: true }),

    calcolaPresenzaIbrida(azienda.id, dipendenteId),
    calcolaProduzioneIbrida(azienda.id, dipendenteId),
    calcolaQuizIbridi(azienda.id, dipendenteId)
  ]);

  const dip = dipRes.data;
  const dipError = dipRes.error;

  if (dipError || !dip) {
    console.error("Errore caricamento dipendente:", dipError);
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Errore caricamento</h2>
        <p class="small-muted" style="margin-top:6px;">Impossibile caricare la scheda dipendente.</p>
        <div style="margin-top:16px;">
          <button class="app-button small gray" id="btn-back-dipendenti">⬅ Torna ai dipendenti</button>
        </div>
      </div>
    `;

    const btnBack = document.getElementById("btn-back-dipendenti");
    if (btnBack) {
      btnBack.onclick = () => {
        window.location.hash = "#/dipendenti";
      };
    }
    return;
  }

  const sedi = sediRes.data || [];
  const reparti = repartiRes.data || [];
  const metriche = metricheRes.data || [];
  const valutazioni = Array.isArray(valutazioniRes.data) ? valutazioniRes.data : [];

  const repartiMap = Object.fromEntries(reparti.map((r) => [String(r.id), r.nome]));
  const sediMap = Object.fromEntries(sedi.map((s) => [String(s.id), s.nome]));

  const profiloAI = normalizeProfiloAI(dip.profilo_ai);
  const ultimaValutazione = valutazioni.length > 0 ? valutazioni[0] : null;
  const messaggiTony = generaMessaggiTony({
    presenza: presenzaData,
    produzione: produzioneData,
    quiz: quizData,
    valutazione: ultimaValutazione
  });

  const fotoUrl = dip.foto_url || "";
  const nomeCompleto = buildNomeCompleto(dip);
  const repartoLabel = dip.reparto_id ? repartiMap[String(dip.reparto_id)] || dip.reparto_id : "-";
  const sedeLabel = dip.sede_id ? sediMap[String(dip.sede_id)] || dip.sede_id : (sedeAttiva?.nome || "-");
  const statoLabel = dip.attivo ? "Attivo" : "Non attivo";
  const tipoCompensoLabel = dip.tipo_compenso || "-";

  const content = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
      <button class="app-button small gray" id="btn-back-dipendenti">⬅ Torna ai dipendenti</button>
      ${window.hasPermesso && window.hasPermesso("dipendenti.update")
        ? `<button class="app-button small" id="btn-edit-dipendente">✏️ Modifica</button>`
        : ""}
    </div>

    <div style="display:grid; gap:16px;">

      ${createCard({
        title: "Profilo",
        body: `
          <div style="display:grid; grid-template-columns:minmax(0, 120px) minmax(0, 1fr); gap:16px; align-items:start;">
            <div>
              <div id="dip-foto-preview">
                ${fotoUrl
                  ? `<img src="${escapeHtmlAttr(fotoUrl)}" alt="${escapeHtmlAttr(nomeCompleto)}" style="width:100px;height:100px;border-radius:18px;object-fit:cover;border:1px solid #e5e7eb;background:#f9fafb;">`
                  : `<div style="width:100px;height:100px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:28px;">👤</div>`}
              </div>
              <div style="margin-top:10px;">
                <div class="small-muted" style="margin-bottom:6px;">Upload foto</div>
                <input id="dip-foto-input" type="file" accept="image/png,image/jpeg" class="input-pill">
                <div class="small-muted" style="margin-top:6px;">Preview locale, senza salvataggio storage.</div>
              </div>
            </div>

            <div style="display:grid; gap:10px;">
              <div>
                <div style="font-size:22px; font-weight:700; line-height:1.2;">${escapeHtml(nomeCompleto)}</div>
                <div class="small-muted" style="margin-top:4px;">Scheda anagrafica dipendente</div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                ${infoRow("Email", dip.email || "-")}
                ${infoRow("Telefono", dip.telefono || "-")}
                ${infoRow("Ruolo", dip.ruolo || "-")}
                ${infoRow("Mansione", dip.mansione || "-")}
                ${infoRow("Reparto", repartoLabel)}
                ${infoRow("Sede", sedeLabel)}
                ${infoRow("Stato", statoLabel)}
                ${infoRow("Data nascita", formatDate(dip.data_nascita))}
                ${infoRow("Luogo nascita", dip.luogo_nascita || "-")}
                ${infoRow("Codice fiscale", dip.codice_fiscale || "-")}
                ${infoRow("Indirizzo", dip.indirizzo || "-")}
                ${infoRow("Residenza", dip.residenza || "-")}
                ${infoRow("IBAN", dip.iban || "-")}
              </div>
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Costo e contratto",
        body: `
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
            ${infoRow("Tipo compenso", tipoCompensoLabel)}
            ${infoRow("Retribuzione base", formatCurrencyOrDash(dip.retribuzione_base))}
            ${infoRow("Costo orario", formatCurrencyOrDash(dip.costo_orario))}
            ${infoRow("Ore mensili contrattuali", formatNumberOrDash(dip.ore_mensili_contrattuali))}
            ${infoRow("Ore medie per servizio", formatNumberOrDash(dip.ore_medie_per_servizio))}
            ${infoRow("Costo medio", dip.costo_medio || "-")}
            ${infoRow("Tipo operativo", dip.tipo_operativo || "-")}
            ${infoRow("Codice dipendente", dip.codice || "-")}
            ${infoRow("PIN dipendente", dip.pin || dip.codice_pin || "-")}
          </div>
        `
      })}

      ${createCard({
        title: "Obiettivi e crescita",
        body: `
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
            ${infoRow("Obiettivi personali", profiloAI.obiettivi_personali || "-")}
            ${infoRow("Obiettivi professionali", profiloAI.obiettivi_professionali || "-")}
            ${infoRow("Tipo crescita", profiloAI.tipo_crescita || "-")}
            ${infoRow("Ruolo target", profiloAI.ruolo_target || "-")}
          </div>
        `
      })}

      ${createCard({
        title: "Indicatori automatici",
        body: `
          <div style="display:grid; gap:14px;">
            <div class="small-muted">Calcolo automatico basato su timbrature, turni, assenze, produzione e quiz.</div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;">
              ${scoreRow("Presenza automatica", presenzaData.score)}
              ${scoreRow("Produzione automatica", produzioneData.score)}
              ${scoreRow("Quiz automatici", quizData.score)}
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
              ${infoRow("Giorni lavorati", presenzaData.giorniLavorati)}
              ${infoRow("Ore lavorate", formatNumberOrDash(presenzaData.oreLavorate))}
              ${infoRow("Ritardi", presenzaData.ritardi)}
              ${infoRow("Assenze non giustificate", presenzaData.assenzeNonGiustificate)}
              ${infoRow("Straordinari (ore)", formatNumberOrDash(presenzaData.straordinariOre))}
              ${infoRow("Lotti produzione", produzioneData.lotti)}
              ${infoRow("Quantità prodotta", formatNumberOrDash(produzioneData.quantita))}
              ${infoRow("Resa media %", formatNumberOrDash(produzioneData.resaMedia))}
              ${infoRow("Scarto medio %", formatNumberOrDash(produzioneData.scartoMedio))}
              ${infoRow("Quiz completati", quizData.numeroQuiz)}
              ${infoRow("Media quiz %", formatNumberOrDash(quizData.mediaPercentuale))}
            </div>

            ${longTextRow(
              "Dettaglio automatico",
              [
                presenzaData.dettaglio,
                produzioneData.dettaglio,
                quizData.dettaglio
              ].filter(Boolean).join("\n")
            )}
          </div>
        `
      })}

      ${createCard({
        title: "Valutazione corrente",
        body: ultimaValutazione
          ? `
            <div style="display:grid; gap:14px;">
              <div class="small-muted">
                Ultima valutazione registrata il ${formatDateTime(ultimaValutazione.created_at)}
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;">
                ${scoreRow("Presenza", ultimaValutazione.punteggio_presenza)}
                ${scoreRow("Velocità", ultimaValutazione.punteggio_velocita)}
                ${scoreRow("Qualità", ultimaValutazione.punteggio_qualita)}
                ${scoreRow("Conoscenza", ultimaValutazione.punteggio_conoscenza)}
                ${scoreRow("Autonomia", ultimaValutazione.punteggio_autonomia)}
                ${scoreRow("Collaborazione", ultimaValutazione.punteggio_collaborazione)}
                ${scoreRow("Responsabilità", ultimaValutazione.punteggio_responsabilita)}
                ${scoreRow("Punteggio totale", ultimaValutazione.punteggio_totale)}
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                ${infoRow("Periodo", formatPeriodo(ultimaValutazione.periodo_da, ultimaValutazione.periodo_a))}
                ${infoRow("Tipo", ultimaValutazione.tipo || "-")}
                ${infoRow("Valutatore ruolo", ultimaValutazione.valutatore_ruolo || "-")}
                ${infoRow("Azione consigliata", ultimaValutazione.azione_consigliata || "-")}
              </div>

              <div style="display:grid; gap:10px;">
                ${longTextRow("Punti di forza", ultimaValutazione.punti_forza || "-")}
                ${longTextRow("Aree miglioramento", ultimaValutazione.aree_miglioramento || "-")}
                ${longTextRow("Note manager", ultimaValutazione.note_manager || "-")}
              </div>
            </div>
          `
          : `
            <div class="small-muted">
              Nessuna valutazione disponibile.
            </div>
          `
      })}

      ${window.hasPermesso && window.hasPermesso("dipendenti.update")
        ? createCard({
            title: "Nuova valutazione ibrida",
            body: `
              <div style="display:grid; gap:14px;">

                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;">
                  ${scoreRow("Presenza (auto)", presenzaData.score)}
                  ${scoreRow("Produzione (auto)", produzioneData.score)}
                  ${scoreRow("Quiz (auto)", quizData.score)}
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;" id="metriche-dinamiche-box">
                  ${renderMetricheDinamiche(metriche, {
                    presenza: presenzaData.score,
                    produzione: produzioneData.score,
                    quiz: quizData.score
                  })}
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                  <div>
                    <div class="small-muted" style="margin-bottom:6px;">Periodo da</div>
                    <input id="val-periodo-da" type="date" class="input-pill">
                  </div>
                  <div>
                    <div class="small-muted" style="margin-bottom:6px;">Periodo a</div>
                    <input id="val-periodo-a" type="date" class="input-pill">
                  </div>
                  <div>
                    <div class="small-muted" style="margin-bottom:6px;">Tipo</div>
                    <input id="val-tipo" class="input-pill" placeholder="es. mensile">
                  </div>
                </div>

                <textarea id="val-note" class="input-pill" placeholder="Note manager"></textarea>
                <textarea id="val-miglioramento" class="input-pill" placeholder="Aree miglioramento"></textarea>
                <textarea id="val-forza" class="input-pill" placeholder="Punti di forza"></textarea>
                <input id="val-azione" class="input-pill" placeholder="Azione consigliata">

                <button class="app-button small" id="btn-save-val">
                  Salva valutazione
                </button>

                <div id="val-msg"></div>
              </div>
            `
          })
        : ""}

      ${createCard({
        title: "Storico valutazioni",
        body: valutazioni.length > 0
          ? `
            <div class="table-wrapper">
              <table class="table-timbrature">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Periodo</th>
                    <th>Tipo</th>
                    <th>Ruolo valutatore</th>
                    <th>Totale</th>
                    <th>Presenza</th>
                    <th>Velocità</th>
                    <th>Qualità</th>
                    <th>Conoscenza</th>
                    <th>Autonomia</th>
                    <th>Collaborazione</th>
                    <th>Responsabilità</th>
                  </tr>
                </thead>
                <tbody>
                  ${valutazioni.map((v) => `
                    <tr>
                      <td>${escapeHtml(formatDateTime(v.created_at))}</td>
                      <td>${escapeHtml(formatPeriodo(v.periodo_da, v.periodo_a))}</td>
                      <td>${escapeHtml(v.tipo || "-")}</td>
                      <td>${escapeHtml(v.valutatore_ruolo || "-")}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_totale))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_presenza))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_velocita))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_qualita))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_conoscenza))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_autonomia))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_collaborazione))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_responsabilita))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `
            <div class="small-muted">Nessuna valutazione salvata.</div>
          `
      })}

      ${createCard({
        title: "🤖 Tony - Assistente AI",
        body: renderMessaggiTony(messaggiTony)
      })}

    </div>
  `;

  container.innerHTML = createPageLayout({
    title: nomeCompleto,
    subtitle: "Scheda dipendente",
    content
  });

  const btnBack = document.getElementById("btn-back-dipendenti");
  if (btnBack) {
    btnBack.onclick = () => {
      window.location.hash = "#/dipendenti";
    };
  }

  const btnEdit = document.getElementById("btn-edit-dipendente");
  if (btnEdit) {
    btnEdit.onclick = () => {
      if (typeof window._dipEdit === "function") {
        window.location.hash = "#/dipendenti";
        setTimeout(() => {
          window._dipEdit(dipendenteId);
        }, 50);
      } else {
        window.location.hash = "#/dipendenti";
      }
    };
  }

  const fotoInput = document.getElementById("dip-foto-input");
  const fotoPreview = document.getElementById("dip-foto-preview");
  if (fotoInput && fotoPreview) {
    fotoInput.onchange = () => {
      const file = fotoInput.files && fotoInput.files[0] ? fotoInput.files[0] : null;
      if (!file) return;

      const isValidType = file.type === "image/jpeg" || file.type === "image/png";
      if (!isValidType) {
        fotoInput.value = "";
        fotoPreview.innerHTML = `<div class="small-muted" style="color:#dc2626;">Formato non valido. Usa JPG o PNG.</div>`;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        fotoPreview.innerHTML = `
          <img
            src="${escapeHtmlAttr(String(reader.result || ""))}"
            alt="${escapeHtmlAttr(nomeCompleto)}"
            style="width:100px;height:100px;border-radius:18px;object-fit:cover;border:1px solid #e5e7eb;background:#f9fafb;"
          >
        `;
      };
      reader.readAsDataURL(file);
    };
  }

  const btnSaveVal = document.getElementById("btn-save-val");
  if (btnSaveVal) {
    btnSaveVal.onclick = async () => {
      const msg = document.getElementById("val-msg");
      if (msg) msg.innerHTML = "";

      const metricheInputs = Array.from(document.querySelectorAll("[data-metrica-id]"));
      const metricheByName = {};
      const valoriById = {};

      metriche.forEach((m) => {
        const normalizedName = normalizeMetricName(m.nome);
        let value = 0;

        if (normalizedName === "presenza") {
          value = presenzaData.score;
        } else if (normalizedName === "produzione") {
          value = produzioneData.score;
        } else if (normalizedName === "quiz") {
          value = quizData.score;
        } else {
          const input = metricheInputs.find((el) => el.getAttribute("data-metrica-id") === String(m.id));
          value = parseFloat(input?.value || "0") || 0;
        }

        valoriById[String(m.id)] = value;
        metricheByName[normalizedName] = value;
      });

      let sommaPesata = 0;
      let totalePesi = 0;

      metriche.forEach((m) => {
        const peso = parseFloat(m.peso) || 1;
        const value = valoriById[String(m.id)] || 0;
        sommaPesata += value * peso;
        totalePesi += peso;
      });

      const punteggioTotale = totalePesi > 0 ? Number((sommaPesata / totalePesi).toFixed(2)) : 0;

      const payload = {
        azienda_id: azienda.id,
        dipendente_id: dipendenteId,
        valutatore_user_id: user.id,
        valutatore_ruolo: window.state?.ruolo || "admin",
        periodo_da: document.getElementById("val-periodo-da")?.value || null,
        periodo_a: document.getElementById("val-periodo-a")?.value || null,
        tipo: document.getElementById("val-tipo")?.value?.trim() || "ibrida",
        punteggio_presenza: metricheByName.presenza ?? presenzaData.score,
        punteggio_velocita: metricheByName.velocita ?? 0,
        punteggio_qualita: metricheByName.qualita ?? 0,
        punteggio_conoscenza: metricheByName.conoscenza ?? metricheByName.quiz ?? quizData.score,
        punteggio_autonomia: metricheByName.autonomia ?? 0,
        punteggio_collaborazione: metricheByName.collaborazione ?? 0,
        punteggio_responsabilita: metricheByName.responsabilita ?? 0,
        punteggio_totale: punteggioTotale,
        punti_forza: document.getElementById("val-forza")?.value?.trim() || null,
        aree_miglioramento: document.getElementById("val-miglioramento")?.value?.trim() || null,
        note_manager: document.getElementById("val-note")?.value?.trim() || null,
        azione_consigliata: document.getElementById("val-azione")?.value?.trim() || null
      };

      const { error } = await supabase
        .from("dipendenti_valutazioni")
        .insert(payload);

      if (error) {
        console.error("Errore salvataggio valutazione:", error);
        if (msg) msg.innerHTML = `<span style="color:#dc2626;">Errore salvataggio valutazione</span>`;
        return;
      }

      if (msg) msg.innerHTML = `<span style="color:#16a34a;">Valutazione salvata ✔</span>`;
      setTimeout(() => {
        window.location.reload();
      }, 700);
    };
  }
}

async function calcolaPresenzaIbrida(aziendaId, dipendenteId) {
  const oggi = new Date();
  const inizioPeriodo = new Date();
  inizioPeriodo.setDate(oggi.getDate() - 30);

  const [
    timbratureRes,
    turniRes,
    assenzeRes
  ] = await Promise.all([
    supabase
      .from("timbrature")
      .select("id,tipo,timestamp,ora_inizio,ora_fine,ore_lavorate")
      .eq("azienda_id", aziendaId)
      .eq("dipendente_id", dipendenteId)
      .gte("timestamp", inizioPeriodo.toISOString())
      .order("timestamp", { ascending: true }),

    supabase
      .from("turni_dipendenti")
      .select("id,data,ora_inizio_prevista,ora_fine_prevista")
      .eq("azienda_id", aziendaId)
      .eq("dipendente_id", dipendenteId)
      .gte("data", inizioPeriodo.toISOString().slice(0, 10))
      .order("data", { ascending: true }),

    supabase
      .from("assenze_dipendenti")
      .select("id,data_da,data_a,giustificata")
      .eq("azienda_id", aziendaId)
      .eq("dipendente_id", dipendenteId)
      .gte("data_a", inizioPeriodo.toISOString().slice(0, 10))
  ]);

  const timbrature = timbratureRes.data || [];
  const turni = turniRes.data || [];
  const assenze = assenzeRes.data || [];

  const giorniLavoratiSet = new Set();
  let oreLavorate = 0;
  let ritardi = 0;
  let straordinariOre = 0;

  timbrature.forEach((t) => {
    const ts = t.timestamp ? new Date(t.timestamp) : null;
    if (ts && !Number.isNaN(ts.getTime())) {
      giorniLavoratiSet.add(ts.toISOString().slice(0, 10));
    }
    oreLavorate += Number(t.ore_lavorate || 0);
  });

  const turniMap = Object.fromEntries(
    turni.map((t) => [String(t.data), t])
  );

  timbrature.forEach((t) => {
    const ts = t.timestamp ? new Date(t.timestamp) : null;
    if (!ts || Number.isNaN(ts.getTime())) return;

    const giorno = ts.toISOString().slice(0, 10);
    const turno = turniMap[giorno];
    if (!turno || !turno.ora_inizio_prevista) return;

    const prevista = new Date(`${giorno}T${turno.ora_inizio_prevista}`);
    if (!Number.isNaN(prevista.getTime())) {
      const diffMin = (ts.getTime() - prevista.getTime()) / 60000;
      if (diffMin > 10) ritardi += 1;
    }

    if (t.ore_lavorate && turno.ora_fine_prevista && turno.ora_inizio_prevista) {
      const start = new Date(`${giorno}T${turno.ora_inizio_prevista}`);
      const end = new Date(`${giorno}T${turno.ora_fine_prevista}`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const oreAttese = Math.max(0, (end.getTime() - start.getTime()) / 3600000);
        const extra = Number(t.ore_lavorate || 0) - oreAttese;
        if (extra > 0) straordinariOre += extra;
      }
    }
  });

  let assenzeNonGiustificate = 0;
  assenze.forEach((a) => {
    if (a.giustificata === false) {
      assenzeNonGiustificate += diffDaysInclusive(a.data_da, a.data_a);
    }
  });

  const giorniTurni = turni.length;
  const giorniLavorati = giorniLavoratiSet.size;

  let score = 10;

  if (giorniTurni > 0) {
    const ratioPresenze = giorniLavorati / giorniTurni;
    score = ratioPresenze * 10;
  }

  score -= ritardi * 0.4;
  score -= assenzeNonGiustificate * 1.2;
  score += Math.min(1, straordinariOre * 0.1);

  score = clamp(score, 0, 10);

  const dettaglio = [
    `Periodo ultimi 30 giorni`,
    `Giorni lavorati: ${giorniLavorati}`,
    `Turni pianificati: ${giorniTurni}`,
    `Ritardi rilevati: ${ritardi}`,
    `Assenze non giustificate: ${assenzeNonGiustificate}`,
    `Straordinari (ore): ${formatNumberOrDash(straordinariOre)}`
  ].join("\n");

  return {
    score: Number(score.toFixed(2)),
    giorniLavorati,
    oreLavorate: Number(oreLavorate.toFixed(2)),
    ritardi,
    assenzeNonGiustificate,
    straordinariOre: Number(straordinariOre.toFixed(2)),
    dettaglio
  };
}

async function calcolaProduzioneIbrida(aziendaId, dipendenteId) {
  const oggi = new Date();
  const inizioPeriodo = new Date();
  inizioPeriodo.setDate(oggi.getDate() - 30);

  const { data, error } = await supabase
    .from("produzione_lotti")
    .select("id,quantita_output,resa_percentuale,scarto_percentuale,stato,data_produzione")
    .eq("azienda_id", aziendaId)
    .eq("operatore_id", dipendenteId)
    .gte("data_produzione", inizioPeriodo.toISOString().slice(0, 10));

  if (error || !data || data.length === 0) {
    return {
      score: 0,
      lotti: 0,
      quantita: 0,
      resaMedia: 0,
      scartoMedio: 0,
      dettaglio: "Nessun lotto produzione negli ultimi 30 giorni"
    };
  }

  const lottiValidi = data.filter((x) => x.stato === "confermato" || x.stato === "chiuso");
  const lotti = lottiValidi.length;
  const quantita = lottiValidi.reduce((sum, x) => sum + Number(x.quantita_output || 0), 0);

  const resaValues = lottiValidi
    .map((x) => Number(x.resa_percentuale))
    .filter((x) => !Number.isNaN(x));

  const scartoValues = lottiValidi
    .map((x) => Number(x.scarto_percentuale))
    .filter((x) => !Number.isNaN(x));

  const resaMedia = resaValues.length ? resaValues.reduce((a, b) => a + b, 0) / resaValues.length : 0;
  const scartoMedio = scartoValues.length ? scartoValues.reduce((a, b) => a + b, 0) / scartoValues.length : 0;

  let score = 0;
  score += Math.min(4, lotti * 0.4);
  score += Math.min(4, resaMedia / 25);
  score += Math.max(0, 2 - (scartoMedio / 10));
  score = clamp(score, 0, 10);

  const dettaglio = [
    `Periodo ultimi 30 giorni`,
    `Lotti validi: ${lotti}`,
    `Quantità prodotta: ${formatNumberOrDash(quantita)}`,
    `Resa media: ${formatNumberOrDash(resaMedia)}%`,
    `Scarto medio: ${formatNumberOrDash(scartoMedio)}%`
  ].join("\n");

  return {
    score: Number(score.toFixed(2)),
    lotti,
    quantita: Number(quantita.toFixed(2)),
    resaMedia: Number(resaMedia.toFixed(2)),
    scartoMedio: Number(scartoMedio.toFixed(2)),
    dettaglio
  };
}

async function calcolaQuizIbridi(aziendaId, dipendenteId) {
  const { data, error } = await supabase
    .from("test_competenze_risultati")
    .select("id,punteggio,percentuale,completato_at")
    .eq("azienda_id", aziendaId)
    .eq("dipendente_id", dipendenteId)
    .order("completato_at", { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    return {
      score: 0,
      numeroQuiz: 0,
      mediaPercentuale: 0,
      dettaglio: "Nessun quiz completato"
    };
  }

  const percentuali = data
    .map((x) => Number(x.percentuale))
    .filter((x) => !Number.isNaN(x));

  const mediaPercentuale = percentuali.length
    ? percentuali.reduce((a, b) => a + b, 0) / percentuali.length
    : 0;

  const score = clamp(mediaPercentuale / 10, 0, 10);

  const dettaglio = [
    `Quiz completati: ${data.length}`,
    `Media risultati: ${formatNumberOrDash(mediaPercentuale)}%`
  ].join("\n");

  return {
    score: Number(score.toFixed(2)),
    numeroQuiz: data.length,
    mediaPercentuale: Number(mediaPercentuale.toFixed(2)),
    dettaglio
  };
}

function renderMetricheDinamiche(metriche, automaticScores) {
  if (!metriche || metriche.length === 0) {
    return `<div class="small-muted">Nessuna metrica configurata.</div>`;
  }

  return metriche.map((m) => {
    const normalized = normalizeMetricName(m.nome);

    if (normalized === "presenza") {
      return renderAutoMetricCard(m.nome, automaticScores.presenza);
    }

    if (normalized === "produzione") {
      return renderAutoMetricCard(m.nome, automaticScores.produzione);
    }

    if (normalized === "quiz" || normalized === "conoscenza_quiz") {
      return renderAutoMetricCard(m.nome, automaticScores.quiz);
    }

    return `
      <div>
        <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(m.nome)}</div>
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          class="input-pill"
          data-metrica-id="${escapeHtmlAttr(String(m.id))}"
          placeholder="0-10"
        >
      </div>
    `;
  }).join("");
}

function renderAutoMetricCard(label, value) {
  return `
    <div>
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)} (auto)</div>
      <input
        type="number"
        class="input-pill"
        value="${escapeHtmlAttr(formatScore(value))}"
        disabled
      >
    </div>
  `;
}

function normalizeProfiloAI(profiloAI) {
  if (!profiloAI) return {};
  if (typeof profiloAI === "object") return profiloAI;

  try {
    return JSON.parse(profiloAI);
  } catch (_) {
    return {};
  }
}

function normalizeMetricName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function buildNomeCompleto(dip) {
  const nome = String(dip?.nome || "").trim();
  const cognome = String(dip?.cognome || "").trim();
  const full = `${nome} ${cognome}`.trim();
  return full || "Dipendente";
}

function infoRow(label, value) {
  return `
    <div style="padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:#fff;">
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="font-weight:600;">${escapeHtml(String(value ?? "-"))}</div>
    </div>
  `;
}

function longTextRow(label, value) {
  return `
    <div style="padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:#fff;">
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="white-space:pre-wrap; line-height:1.45;">${escapeHtml(String(value ?? "-"))}</div>
    </div>
  `;
}

function scoreRow(label, value) {
  return `
    <div style="padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:#fff;">
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="font-size:20px; font-weight:700;">${escapeHtml(formatScore(value))}</div>
    </div>
  `;
}

function formatPeriodo(da, a) {
  if (!da && !a) return "-";
  if (da && a) return `${formatDate(da)} → ${formatDate(a)}`;
  if (da) return `Dal ${formatDate(da)}`;
  return `Fino al ${formatDate(a)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("it-IT");
}

function formatCurrencyOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(n);
}

function formatNumberOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n);
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2);
}

function diffDaysInclusive(da, a) {
  if (!da || !a) return 1;
  const start = new Date(da);
  const end = new Date(a);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(str) {
  return escapeHtml(str);
}
