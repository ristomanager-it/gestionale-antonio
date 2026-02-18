// js/views/modifica-azienda.js
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
    container.innerHTML = `<div class="view">Azienda non trovata</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2>Modifica Azienda</h2>

      ${cardLogo(azienda)}
      ${cardAnagrafica(azienda)}
      ${cardFiscale(azienda)}
      ${cardContatti(azienda)}
      ${cardSaaS(azienda)}
      ${cardFeatures()}

      <div style="margin-top:24px; display:flex; gap:12px;">
        <button class="app-button" id="btn-save">💾 Salva modifiche</button>
        <button class="app-button small gray" id="btn-back">⬅ Indietro</button>
      </div>

      <div id="save-result" style="margin-top:12px;"></div>
    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  document.getElementById("btn-save").onclick = async () => {
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
      data_scadenza: val("data_scadenza") || null,
      piano: val("piano"),
      numero_massimo_utenti: intVal("numero_massimo_utenti"),
      numero_massimo_ricette: intVal("numero_massimo_ricette"),
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
      result.innerHTML = `<span style="color:#dc2626;">Errore: ${error.message}</span>`;
      return;
    }

    result.innerHTML = `<span style="color:#16a34a;">Salvato correttamente ✔</span>`;
  };

  renderFeatures(azienda);

  document.getElementById("logo-upload").addEventListener("change", async (e) => {
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

  const currentFeatures = azienda.features || {};

  container.innerHTML = MODULI.map(m => `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:10px 0;
      border-bottom:1px solid #e5e7eb;
    ">
      <span>${m.label}</span>
      <input 
        type="checkbox"
        data-key="${m.key}"
        ${currentFeatures[m.key] !== false ? "checked" : ""}
      />
    </div>
  `).join("");

  container.querySelectorAll("input[type='checkbox']")
    .forEach(toggle => {
      toggle.addEventListener("change", async (e) => {

        const key = e.target.dataset.key;
        const value = e.target.checked;

        const nuoveFeatures = {
          ...currentFeatures,
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
    <div style="margin-top:10px;">
      <label class="small-muted">${label}</label>
      <input class="input-pill" type="${type}" id="${id}" value="${value ?? ""}" />
    </div>
  `;
}

function select(id,label,value,options){
  return `
    <div style="margin-top:10px;">
      <label class="small-muted">${label}</label>
      <select class="input-pill" id="${id}">
        ${options.map(o=>`<option value="${o}" ${o===value?"selected":""}>${o}</option>`).join("")}
      </select>
    </div>
  `;
}

function cardLogo(a){
  return `
    <div class="view" style="margin-top:20px;">
      <h3>Logo Azienda</h3>
      ${
        a.logo_url
          ? `<img src="${a.logo_url}" style="width:120px; height:120px; object-fit:cover; border-radius:16px; margin-bottom:10px;" />`
          : `<p class="small-muted">Nessun logo caricato</p>`
      }
      <input type="file" id="logo-upload" accept="image/*" />
    </div>
  `;
}

function cardAnagrafica(a) {
  return `
    <div class="view" style="margin-top:20px;">
      <h3>Dati Anagrafici</h3>
      ${input("nome","Nome",a.nome)}
      ${input("ragione_sociale","Ragione Sociale",a.ragione_sociale)}
      ${input("referente","Referente",a.referente)}
    </div>
  `;
}

function cardFiscale(a) {
  return `
    <div class="view" style="margin-top:20px;">
      <h3>Dati Fiscali</h3>
      ${input("partita_iva","Partita IVA",a.partita_iva)}
      ${input("codice_fiscale","Codice Fiscale",a.codice_fiscale)}
      ${input("codice_univoco","Codice Univoco",a.codice_univoco)}
      ${input("pec","PEC",a.pec)}
    </div>
  `;
}

function cardContatti(a) {
  return `
    <div class="view" style="margin-top:20px;">
      <h3>Contatti</h3>
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
  `;
}

function cardSaaS(a) {
  return `
    <div class="view" style="margin-top:20px;">
      <h3>Configurazione SaaS</h3>
      ${select("piano","Piano",a.piano,["basic","pro","premium"])}
      ${input("numero_massimo_utenti","Max Utenti",a.numero_massimo_utenti,"number")}
      ${input("numero_massimo_ricette","Max Ricette",a.numero_massimo_ricette,"number")}
      ${input("data_scadenza","Data Scadenza",a.data_scadenza,"date")}
      ${select("stato_attivazione","Stato Attivazione",a.stato_attivazione,["bozza","attiva","sospesa"])}
      ${select("stato","Stato",a.stato,["attiva","sospesa"])}
      <label style="display:block;margin-top:10px;">
        <input type="checkbox" id="attiva" ${a.attiva ? "checked":""}/> Attiva
      </label>
    </div>
  `;
}

function cardFeatures(){
  return `
    <div class="view" style="margin-top:20px;">
      <h3>Moduli Attivi</h3>
      <div id="features-container"></div>
    </div>
  `;
}
