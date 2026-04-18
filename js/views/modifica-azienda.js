import { supabase } from "../supabaseClient.js";

const MODULI = [
  { key: "produzione", label: "Produzione" },
  { key: "magazzino", label: "Magazzino" },
  { key: "acquisti", label: "Acquisti" },
  { key: "dipendenti", label: "Dipendenti" },
  { key: "ricettario", label: "Ricettario" },
  { key: "preparazioni", label: "Preparazioni" },
  { key: "report", label: "Report" }
];

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;
  const id = window.routeParams?.id;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
        </div>
      </div>
    `;
    return;
  }

  const { data: azienda, error } = await supabase
    .from("aziende")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !azienda) {
    container.innerHTML = `<div class="page"><h2>Azienda non trovata</h2></div>`;
    return;
  }

  // 🔥 prendo abbonamento attivo
  const { data: abbonamento } = await supabase
    .from("abbonamenti")
    .select("*, piani_abbonamento(*)")
    .eq("azienda_id", id)
    .eq("stato", "attivo")
    .single();

  const pianoCorrente = abbonamento?.piani_abbonamento?.nome || azienda.piano;

  container.innerHTML = `
    <div class="page">

      <div class="page-header">
        <div>
          <h1>Modifica Azienda</h1>
          <p class="page-subtitle">Gestione completa configurazione aziendale</p>
        </div>
      </div>

      ${cardLogo(azienda)}
      ${cardAnagrafica(azienda)}
      ${cardFiscale(azienda)}
      ${cardContatti(azienda)}
      ${cardSaaS(azienda, pianoCorrente)}
      ${cardFeatures()}

      <div class="form-actions">
        <button class="app-button" id="btn-save">💾 Salva modifiche</button>
        <button class="app-button secondary" id="btn-back">⬅ Indietro</button>
      </div>

      <div id="save-result" class="form-result"></div>

    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  document.getElementById("btn-save").onclick = async () => {

    const nuovoPianoNome = val("piano");

    // 🔥 PRENDO PIANO DB
    const { data: piano } = await supabase
      .from("piani_abbonamento")
      .select("*")
      .eq("nome", nuovoPianoNome)
      .single();

    // 🔥 PRENDO ABBONAMENTO ATTIVO
    const { data: abbonamentoAttivo } = await supabase
      .from("abbonamenti")
      .select("*")
      .eq("azienda_id", id)
      .eq("stato", "attivo")
      .single();

    // 🔥 SE CAMBIA → UPGRADE
    if (piano && abbonamentoAttivo && abbonamentoAttivo.piano_id !== piano.id) {

      await supabase
        .from("abbonamenti")
        .update({
          stato: "terminato",
          data_fine: new Date()
        })
        .eq("id", abbonamentoAttivo.id);

      await supabase
        .from("abbonamenti")
        .insert({
          azienda_id: id,
          piano_id: piano.id,
          stato: "attivo"
        });
    }

    // 🔥 UPDATE AZIENDA (SENZA PIANO)
    const updateData = {
      nome: val("nome"),
      ragione_sociale: val("ragione_sociale"),
      partita_iva: val("partita_iva"),
      codice_fiscale: val("codice_fiscale"),
      indirizzo: val("indirizzo"),
      citta: val("citta"),
      cap: val("cap"),
      provincia: val("provincia"),
      nazione: val("nazione"),
      email: val("email"),
      telefono: val("telefono"),
      pec: val("pec"),
      codice_univoco: val("codice_univoco"),
      referente: val("referente"),
      email_amministrativa: val("email_amministrativa"),
      telefono_amministrativo: val("telefono_amministrativo"),
      attiva: boolVal("attiva"),
      stato: val("stato"),
      stato_attivazione: val("stato_attivazione")
    };

    const { error } = await supabase
      .from("aziende")
      .update(updateData)
      .eq("id", id);

    const result = document.getElementById("save-result");

    if (error) {
      result.innerHTML = `<span class="error-text">Errore: ${error.message}</span>`;
      return;
    }

    result.innerHTML = `<span class="success-text">Salvato correttamente ✔</span>`;
  };

  renderFeatures(azienda);

  document.getElementById("logo-upload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `logo-${id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("loghi-aziende")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Errore upload logo");
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("loghi-aziende")
      .getPublicUrl(filePath);

    await supabase
      .from("aziende")
      .update({
        logo_path: filePath,
        logo_url: publicUrl.publicUrl
      })
      .eq("id", id);

    location.reload();
  });
}

function renderFeatures(azienda) {
  const container = document.getElementById("features-container");

  container.innerHTML = MODULI.map(m => `
    <div class="feature-row">
      <span>${m.label}</span>
      <input 
        type="checkbox"
        data-key="${m.key}"
        ${azienda.features?.[m.key] === false ? "" : "checked"}
      />
    </div>
  `).join("");

  container.querySelectorAll("input[type='checkbox']")
    .forEach(toggle => {
      toggle.addEventListener("change", async (e) => {

        const key = e.target.dataset.key;
        const value = e.target.checked;

        const nuoveFeatures = {
          ...(azienda.features || {}),
          [key]: value
        };

        const { error } = await supabase
          .from("aziende")
          .update({ features: nuoveFeatures })
          .eq("id", azienda.id);

        if (!error) {
          azienda.features = nuoveFeatures;
        } else {
          alert("Errore aggiornamento feature");
        }

      });
    });
}

function val(id) {
  return document.getElementById(id)?.value.trim() || null;
}

function intVal(id) {
  const v = document.getElementById(id)?.value;
  return v ? parseInt(v) : null;
}

function boolVal(id) {
  return document.getElementById(id)?.checked || false;
}

function input(id,label,value,type="text"){
  return `
    <div class="form-group">
      <label>${label}</label>
      <input class="input" type="${type}" id="${id}" value="${value ?? ""}" />
    </div>
  `;
}

function select(id,label,value,options){
  return `
    <div class="form-group">
      <label>${label}</label>
      <select class="input" id="${id}">
        ${options.map(o=>`<option value="${o}" ${o===value?"selected":""}>${o}</option>`).join("")}
      </select>
    </div>
  `;
}

function cardLogo(a){
  return `
    <div class="card">
      <div class="card-header">
        <h3>Logo Azienda</h3>
      </div>
      <div class="card-body">
        ${
          a.logo_url
            ? `<img src="${a.logo_url}" class="logo-preview" />`
            : `<p class="small-muted">Nessun logo caricato</p>`
        }
        <input type="file" id="logo-upload" accept="image/*" />
      </div>
    </div>
  `;
}

function cardAnagrafica(a) {
  return `
    <div class="card">
      <div class="card-header"><h3>Dati Anagrafici</h3></div>
      <div class="card-body form-grid">
        ${input("nome","Nome",a.nome)}
        ${input("ragione_sociale","Ragione Sociale",a.ragione_sociale)}
        ${input("referente","Referente",a.referente)}
      </div>
    </div>
  `;
}

function cardFiscale(a) {
  return `
    <div class="card">
      <div class="card-header"><h3>Dati Fiscali</h3></div>
      <div class="card-body form-grid">
        ${input("partita_iva","Partita IVA",a.partita_iva)}
        ${input("codice_fiscale","Codice Fiscale",a.codice_fiscale)}
        ${input("codice_univoco","Codice Univoco",a.codice_univoco)}
        ${input("pec","PEC",a.pec)}
      </div>
    </div>
  `;
}

function cardContatti(a) {
  return `
    <div class="card">
      <div class="card-header"><h3>Contatti</h3></div>
      <div class="card-body form-grid">
        ${input("email","Email",a.email)}
        ${input("telefono","Telefono",a.telefono)}
        ${input("email_amministrativa","Email Amministrativa",a.email_amministrativa)}
        ${input("telefono_amministrativo","Telefono Amministrativo",a.telefono_amministrativo)}
        ${input("indirizzo","Indirizzo",a.indirizzo)}
        ${input("citta","Città",a.citta)}
        ${input("cap","CAP",a.cap)}
        ${input("provincia","Provincia",a.provincia)}
        ${input("nazione","Nazione",a.nazione)}
      </div>
    </div>
  `;
}

function cardSaaS(a, pianoCorrente) {
  return `
    <div class="card">
      <div class="card-header"><h3>Configurazione SaaS</h3></div>
      <div class="card-body form-grid">
        ${select("piano","Piano",pianoCorrente,["basic","pro","premium"])}
        ${select("stato_attivazione","Stato Attivazione",a.stato_attivazione,["bozza","attiva","sospesa"])}
        ${select("stato","Stato",a.stato,["attiva","sospesa"])}
        <div class="form-group checkbox-group">
          <label><input type="checkbox" id="attiva" ${a.attiva ? "checked":""}/> Attiva</label>
        </div>
      </div>
    </div>
  `;
}

function cardFeatures(){
  return `
    <div class="card">
      <div class="card-header"><h3>Moduli Attivi</h3></div>
      <div class="card-body">
        <div id="features-container"></div>
      </div>
    </div>
  `;
}
