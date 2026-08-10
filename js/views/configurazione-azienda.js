import { supabase } from "../supabaseClient.js";

/* Schermata di sola lettura dello stato di configurazione.
   Nasce perche' la card della home puntava a #/completaAzienda, che per
   un'azienda gia' attiva cade nel ramo del form di accesso: chi era gia'
   dentro si vedeva chiedere di iscriversi. Qui non c'e' wizard e non si
   tocca l'azienda attiva: si legge stato_requisiti e si mostra cosa manca.
   Markup, colori ed etichette dei moduli sono gli stessi di
   mostraRequisiti() in completa-azienda.js, cosi' le due schermate non
   divergono. */

export async function render(container) {
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");

  const azienda = window.state?.azienda;
  const aziendaId = azienda?.id;

  if (!aziendaId) {
    container.innerHTML = '<div style="max-width:760px;margin:24px auto;padding:0 16px;">'
      + '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;font-size:14px;color:#b45309;">Nessuna azienda attiva.</div>'
      + '<div style="margin-top:18px;"><a href="#/home" style="font-size:13px;color:#0E5A7A;text-decoration:none;font-weight:700;">&larr; Torna alla home</a></div>'
      + '</div>';
    return;
  }

  const nomeAzienda = escapeTesto(azienda?.nome || azienda?.ragione_sociale || "");

  container.innerHTML = '<div style="max-width:760px;margin:24px auto;padding:0 16px;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;color:#0f172a;margin:0 0 2px;">Configurazione dell\'azienda</h1>'
    + '<div style="font-size:13px;color:#64748b;margin-bottom:20px;">' + nomeAzienda + '</div>'
    + '<div id="cfg-requisiti"><div style="font-size:13px;color:#64748b;">Controllo in corso&hellip;</div></div>'
    + '<div style="margin-top:24px;"><a href="#/home" style="font-size:13px;color:#0E5A7A;text-decoration:none;font-weight:700;">&larr; Torna alla home</a></div>'
    + '</div>';

  const box = container.querySelector("#cfg-requisiti");

  const { data, error } = await supabase.rpc("stato_requisiti", { p_azienda_id: aziendaId });
  if (error) {
    console.error("stato_requisiti:", error);
    box.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;font-size:14px;color:#b45309;">Non sono riuscito a leggere lo stato della configurazione. Riprova tra poco.</div>';
    return;
  }

  const righe = data || [];
  const obbligatori = righe.filter((r) => r.obbligatorio);
  const fatti = obbligatori.filter((r) => r.completato).length;
  const perc = obbligatori.length ? Math.round((fatti * 100) / obbligatori.length) : 0;

  const etichetteModuli = {
    base: "Dati dell'attivit\u00e0", persone: "Personale", cucina: "Cucina",
    sala: "Sala e servizio", marketing: "Marketing", fatturazione: "Fatturazione elettronica",
    pagamenti: "Incassi online",
  };

  const mancanti = righe.filter((r) => !r.completato);
  const completate = righe.filter((r) => r.completato);

  const gruppi = {};
  mancanti.forEach((r) => { (gruppi[r.modulo] = gruppi[r.modulo] || []).push(r); });

  let html = '<div style="margin-bottom:18px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">'
    + '<span>Configurazione</span><span>' + perc + '%</span></div>'
    + '<div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">'
    + '<div style="height:100%;width:' + perc + '%;background:' + (perc === 100 ? "#16a34a" : "#0E5A7A") + ';"></div></div>'
    + '<div style="font-size:12px;color:#64748b;margin-top:6px;">' + fatti + ' voci su ' + obbligatori.length + ' necessarie sono a posto.</div>'
    + '</div>';

  if (!mancanti.length) {
    html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;font-size:14px;color:#15803d;font-weight:600;">Tutto a posto.</div>';
  }

  Object.keys(gruppi).forEach((modulo) => {
    html += '<div style="margin-bottom:16px;">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">'
      + escapeTesto(etichetteModuli[modulo] || modulo) + '</div>';

    gruppi[modulo].forEach((r) => {
      // Dieci requisiti su quindici puntano al wizard di primo ingresso, che per
      // un'azienda attiva non si apre: si mandano alla rotta di modifica.
      const rotta = String(r.rotta || "").indexOf("completaAzienda") === 0
        ? "configura-dati" : r.rotta;
      const colore = r.obbligatorio ? "#dc2626" : "#d97706";
      const sfondo = r.obbligatorio ? "#fef2f2" : "#fffbeb";
      const bordo = r.obbligatorio ? "#fecaca" : "#fde68a";
      html += '<div style="background:' + sfondo + ';border:1px solid ' + bordo + ';border-radius:10px;padding:12px;margin-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">'
        + '<div style="flex:1;">'
        + '<div style="font-size:14px;font-weight:700;color:' + colore + ';">' + escapeTesto(r.etichetta) + '</div>'
        + '<div style="font-size:12px;color:#64748b;line-height:1.45;margin-top:2px;">' + escapeTesto(r.descrizione || "") + '</div>'
        + '</div>'
        + '<a href="#/' + escapeTesto(rotta) + '" class="app-button small gray" style="white-space:nowrap;text-decoration:none;">'
        + escapeTesto(r.etichetta_azione) + '</a>'
        + '</div></div>';
    });

    html += '</div>';
  });

  if (completate.length) {
    html += '<details style="margin-top:8px;">'
      + '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#334155;">Gi\u00e0 a posto (' + completate.length + ')</summary>'
      + '<div style="margin-top:10px;">';
    completate.forEach((r) => {
      html += '<div style="display:flex;gap:8px;align-items:flex-start;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:6px;">'
        + '<span style="color:#16a34a;font-weight:800;">&#10003;</span>'
        + '<div style="flex:1;">'
        + '<div style="font-size:13px;font-weight:700;color:#334155;">' + escapeTesto(r.etichetta) + '</div>'
        + '<div style="font-size:12px;color:#94a3b8;">' + escapeTesto(etichetteModuli[r.modulo] || r.modulo) + '</div>'
        + '</div></div>';
    });
    html += '</div></details>';
  }

  box.innerHTML = html;
}

function escapeTesto(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
