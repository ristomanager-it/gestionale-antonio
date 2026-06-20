import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {

  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: "<p>Sezione riservata alla piattaforma.</p>"
      })
    });
    return;
  }

  // Carica piani disponibili
  const { data: piani } = await supabase
    .from("piani_abbonamento")
    .select("id,nome,slug,prezzo_mensile,prezzo_annuale,tipo,icona,colore")
    .eq("attivo", true)
    .order("ordine");

  window._piani = piani || [];

  const content = `
    <div style="display:flex;gap:26px;flex-wrap:wrap;align-items:center;margin-top:20px;">
      <canvas id="grafico-scadenze" width="200" height="200"></canvas>

      <div id="status-cards" style="flex:1;display:flex;gap:16px;flex-wrap:wrap;"></div>
    </div>

    <div id="lista-dettaglio" style="margin-top:24px;overflow:hidden;max-height:0;transition:max-height 0.4s ease;"></div>

    <div style="margin-top:30px;">
      <input
        id="search-input"
        class="input-pill"
        placeholder="Cerca azienda (min 2 caratteri)"
        style="font-size:16px;padding:12px 16px;"
      />
    </div>

    <div id="search-results" style="margin-top:16px;"></div>

    <div style="margin-top:28px;">
      <button class="app-button small gray" id="btn-home">⬅ Dashboard</button>
    </div>
  `;

  container.innerHTML = createPageLayout({
    title: "Gestione Aziende",
    subtitle: "Controllo stato attivazione e scadenze",
    content: createCard({ body: content })
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/homePiattaforma";
  };

  // Ricerca live
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (q.length >= 2) cercaAziende(q);
    else document.getElementById("search-results").innerHTML = "";
  });

  await caricaStatoScadenzeAziende();
}

async function caricaStatoScadenzeAziende() {

  // Carica TUTTE le aziende, inclusa piattaforma — la escludiamo solo dal grafico
  const { data, error } = await supabase
    .from("aziende")
    .select("id,nome,data_scadenza,stato,stato_attivazione,profilo_completato,piano_id,piano_nome,email,citta,moduli,tipo_app")
    .order("nome");

  if (error || !data) return;

  // Escludi la piattaforma dal grafico scadenze
  const aziendeFiltrate = data.filter(az => az.stato !== "piattaforma");

  const oggi = new Date();
  oggi.setHours(0,0,0,0);

  const gruppi = { verde: [], giallo: [], rosso: [] };

  aziendeFiltrate.forEach((az) => {
    if (!az.data_scadenza) {
      gruppi.verde.push(az);
      return;
    }
    const scadenza = new Date(az.data_scadenza);
    scadenza.setHours(0,0,0,0);
    const diff = Math.floor((scadenza - oggi) / (1000*60*60*24));
    if (diff < 0) {
      gruppi.rosso.push({ ...az, giorni: diff });
    } else if (diff <= 15) {
      gruppi.giallo.push({ ...az, giorni: diff });
    } else {
      gruppi.verde.push({ ...az, giorni: diff });
    }
  });

  const totale = aziendeFiltrate.length || 1;
  const percentuali = {
    verde: Math.round((gruppi.verde.length / totale) * 100),
    giallo: Math.round((gruppi.giallo.length / totale) * 100),
    rosso: Math.round((gruppi.rosso.length / totale) * 100)
  };

  creaGrafico(percentuali);
  creaCardStato(gruppi, percentuali);
}

function creaGrafico(percentuali) {
  const canvas = document.getElementById("grafico-scadenze");
  const ctx = canvas.getContext("2d");
  const colori = { verde: "#16a34a", giallo: "#eab308", rosso: "#dc2626" };
  let start = 0;
  Object.keys(percentuali).forEach((key) => {
    const slice = (percentuali[key] / 100) * (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(100,100);
    ctx.arc(100,100,90,start,start+slice);
    ctx.closePath();
    ctx.fillStyle = colori[key];
    ctx.fill();
    start += slice;
  });
  ctx.beginPath();
  ctx.arc(100,100,60,0,Math.PI*2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function creaCardStato(gruppi, percentuali) {
  const container = document.getElementById("status-cards");
  const dettaglio = document.getElementById("lista-dettaglio");
  container.innerHTML = "";

  const config = [
    { key:"verde", colore:"#16a34a", label:"Regolari" },
    { key:"giallo", colore:"#eab308", label:"In scadenza" },
    { key:"rosso", colore:"#dc2626", label:"Scadute" }
  ];

  config.forEach((c) => {
    const card = document.createElement("div");
    card.style.cssText = "flex:1;min-width:200px;padding:16px;border-radius:16px;background:#ffffff;box-shadow:0 8px 20px rgba(0,0,0,0.05);cursor:pointer;";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:12px;height:12px;border-radius:50%;background:${c.colore};"></div>
          <strong>${c.label}</strong>
        </div>
        <span style="font-size:13px;color:#6b7280;">${percentuali[c.key]}%</span>
      </div>
      <div style="font-size:28px;margin-top:10px;">${gruppi[c.key].length}</div>
    `;
    card.onclick = () => mostraDettaglio(gruppi[c.key], c.label);
    container.appendChild(card);
  });

  function mostraDettaglio(lista, titolo) {
    dettaglio.innerHTML = createCard({
      title: titolo,
      body: '<div id="lista-interna"></div>'
    });

    const interno = document.getElementById("lista-interna");

    if (lista.length === 0) {
      interno.innerHTML = '<p class="small-muted">Nessuna azienda.</p>';
    } else {
      lista.forEach((az) => renderRigaAzienda(az, interno));
    }

    dettaglio.style.maxHeight = "1200px";
  }
}

async function cercaAziende(q) {
  const { data, error } = await supabase
    .from("aziende")
    .select("id,nome,stato,stato_attivazione,profilo_completato,data_scadenza,piano_id,piano_nome,email,citta,moduli,tipo_app")
    .ilike("nome", `%${q}%`)
    .order("nome")
    .limit(20);

  const container = document.getElementById("search-results");
  container.innerHTML = "";

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="small-muted">Nessun risultato.</p>';
    return;
  }

  const wrap = document.createElement("div");
  data.forEach(az => renderRigaAzienda(az, wrap));
  container.appendChild(wrap);
}

function renderRigaAzienda(az, parent) {
  const riga = document.createElement("div");
  riga.style.cssText = "background:white;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:10px;";

  const oggi = new Date(); oggi.setHours(0,0,0,0);
  let scadenzaTesto = "";
  if (az.data_scadenza) {
    const sc = new Date(az.data_scadenza); sc.setHours(0,0,0,0);
    const diff = Math.floor((sc - oggi) / (1000*60*60*24));
    scadenzaTesto = diff < 0 ? `<span style="color:#dc2626;"> · scaduta da ${Math.abs(diff)}gg</span>` : `<span style="color:#d97706;"> · scade tra ${diff}gg</span>`;
  }

  const bozza = !az.profilo_completato || az.stato_attivazione === "bozza";
  const piano = (window._piani||[]).find(p => p.id === az.piano_id);
  const pianoColor = piano?.colore || '#64748b';

  riga.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
      <div style="flex:1;min-width:200px;">
        <div style="font-weight:700;font-size:15px;">${escH(az.nome)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:3px;">
          ${az.email||''}${az.citta?' · '+az.citta:''}
          ${scadenzaTesto}
          ${bozza ? '<span style="color:#f97316;margin-left:6px;">⚠ Profilo incompleto</span>' : ''}
        </div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="background:${statoColor(az.stato)};color:white;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">${az.stato||'—'}</span>
          ${piano ? `<span style="background:${pianoColor}20;color:${pianoColor};border:1px solid ${pianoColor}40;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">${piano.icona||''} ${piano.nome}</span>` : '<span style="color:#94a3b8;font-size:11px;">Nessun piano</span>'}
          ${az.tipo_app?.length ? az.tipo_app.map(t=>`<span style="background:#f1f5f9;color:#374151;padding:2px 8px;border-radius:20px;font-size:10px;">${t}</span>`).join('') : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-mini btn-open">Apri</button>
        <button class="btn-mini btn-piano">💳 Piano</button>
        <button class="btn-mini btn-moduli">🧩 Moduli</button>
        <button class="btn-mini ${az.stato==='sospesa'?'btn-green':'btn-yellow'}">${az.stato==='sospesa'?'Riattiva':'Sospendi'}</button>
        <button class="btn-mini btn-red btn-elimina">🗑</button>
      </div>
    </div>

    <!-- PANEL PIANO (nascosto) -->
    <div class="panel-piano" style="display:none;background:#f8fafc;border-radius:10px;padding:14px;margin-top:8px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">💳 Assegna piano abbonamento</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        ${(window._piani||[]).map(p => `
          <label style="cursor:pointer;flex:1;min-width:130px;">
            <input type="radio" name="piano-${az.id}" value="${p.id}" ${az.piano_id===p.id?'checked':''} style="display:none;">
            <div class="piano-opt" data-piano-id="${p.id}" style="border:2px solid ${az.piano_id===p.id?p.colore||'#0E5A7A':'#e5e7eb'};background:${az.piano_id===p.id?(p.colore||'#0E5A7A')+'15':'white'};border-radius:10px;padding:10px;text-align:center;transition:all .15s;">
              <div style="font-size:18px;">${p.icona||'📋'}</div>
              <div style="font-size:12px;font-weight:700;margin-top:4px;">${escH(p.nome)}</div>
              <div style="font-size:11px;color:#64748b;">€${p.prezzo_mensile}/mese</div>
            </div>
          </label>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select class="input sel-intervallo" style="max-width:150px;">
          <option value="mensile">Mensile</option>
          <option value="annuale">Annuale</option>
          <option value="lifetime">Lifetime</option>
        </select>
        <input type="date" class="input inp-scadenza" value="${az.data_scadenza||''}" placeholder="Scadenza" style="max-width:160px;">
        <button class="btn-salva-piano app-button small primary">Salva piano</button>
      </div>
    </div>

    <!-- PANEL MODULI (nascosto) -->
    <div class="panel-moduli" style="display:none;background:#f8fafc;border-radius:10px;padding:14px;margin-top:8px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">🧩 Moduli attivi</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        ${['gestionale','hotel','marketing','hr','social','ticketing'].map(m => `
          <label style="display:flex;align-items:center;gap:6px;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">
            <input type="checkbox" class="chk-modulo" value="${m}" ${(az.moduli||[]).includes(m)?'checked':''} style="accent-color:#0E5A7A;">
            ${m}
          </label>
        `).join('')}
      </div>
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;margin-top:8px;">📱 Tipo app</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        ${['gestionale','hotel'].map(t => `
          <label style="display:flex;align-items:center;gap:6px;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">
            <input type="checkbox" class="chk-tipo" value="${t}" ${(az.tipo_app||[]).includes(t)?'checked':''} style="accent-color:#0E5A7A;">
            ${t}
          </label>
        `).join('')}
      </div>
      <button class="btn-salva-moduli app-button small primary">Salva moduli</button>
    </div>
  `;

  // Bottoni
  riga.querySelector('.btn-open').onclick = () => { window.location.hash = '#/completaAzienda?id=' + az.id; };

  riga.querySelector('.btn-piano').onclick = () => {
    const p = riga.querySelector('.panel-piano');
    const m = riga.querySelector('.panel-moduli');
    p.style.display = p.style.display==='none' ? '' : 'none';
    m.style.display = 'none';
  };
  riga.querySelector('.btn-moduli').onclick = () => {
    const m = riga.querySelector('.panel-moduli');
    const p = riga.querySelector('.panel-piano');
    m.style.display = m.style.display==='none' ? '' : 'none';
    p.style.display = 'none';
  };

  // Selezione piano visiva
  riga.querySelectorAll('.piano-opt').forEach(opt => {
    opt.onclick = () => {
      riga.querySelectorAll('.piano-opt').forEach(o => {
        const pid = o.dataset.pianoId;
        const pObj = (window._piani||[]).find(p=>p.id===pid);
        o.style.borderColor = '#e5e7eb';
        o.style.background = 'white';
      });
      const pid = opt.dataset.pianoId;
      const pObj = (window._piani||[]).find(p=>p.id===pid);
      opt.style.borderColor = pObj?.colore || '#0E5A7A';
      opt.style.background  = (pObj?.colore||'#0E5A7A') + '15';
      riga.querySelector(`input[value="${pid}"]`).checked = true;
    };
  });

  // Salva piano
  riga.querySelector('.btn-salva-piano').onclick = async () => {
    const pianoId = riga.querySelector(`input[name="piano-${az.id}"]:checked`)?.value;
    const intervallo = riga.querySelector('.sel-intervallo').value;
    const scadenza = riga.querySelector('.inp-scadenza').value || null;
    if (!pianoId) { alert('Seleziona un piano'); return; }

    const piano = (window._piani||[]).find(p=>p.id===pianoId);

    // Aggiorna azienda
    await supabase.from('aziende').update({
      piano_id:   pianoId,
      piano_nome: piano?.nome || null,
      piano:      piano?.slug || null,
      data_scadenza: scadenza || null,
    }).eq('id', az.id);

    // Upsert abbonamento
    const { data: abbEsistente } = await supabase
      .from('abbonamenti').select('id').eq('azienda_id', az.id).eq('stato','attivo').maybeSingle();

    if (abbEsistente) {
      await supabase.from('abbonamenti').update({
        piano_id: pianoId, intervallo, stato: 'attivo',
        importo_pagato: intervallo==='annuale' ? piano?.prezzo_annuale : piano?.prezzo_mensile,
      }).eq('id', abbEsistente.id);
    } else {
      await supabase.from('abbonamenti').insert({
        azienda_id: az.id, piano_id: pianoId, intervallo, stato: 'attivo',
        data_inizio: new Date().toISOString(),
        importo_pagato: intervallo==='annuale' ? piano?.prezzo_annuale : piano?.prezzo_mensile,
      });
    }

    az.piano_id = pianoId;
    az.data_scadenza = scadenza;
    riga.querySelector('.panel-piano').style.display = 'none';
    mostraToast('Piano aggiornato ✅');
  };

  // Salva moduli
  riga.querySelector('.btn-salva-moduli').onclick = async () => {
    const moduli  = Array.from(riga.querySelectorAll('.chk-modulo:checked')).map(c=>c.value);
    const tipoApp = Array.from(riga.querySelectorAll('.chk-tipo:checked')).map(c=>c.value);
    await supabase.from('aziende').update({ moduli, tipo_app: tipoApp }).eq('id', az.id);
    az.moduli   = moduli;
    az.tipo_app = tipoApp;
    riga.querySelector('.panel-moduli').style.display = 'none';
    mostraToast('Moduli aggiornati ✅');
  };

  // Sospendi/riattiva
  riga.querySelector('.btn-yellow, .btn-green') && riga.querySelector('.btn-yellow, .btn-green').addEventListener('click', async () => {
    const nuovoStato = az.stato==='sospesa' ? 'attiva' : 'sospesa';
    if (!confirm(`Imposta azienda come "${nuovoStato}"?`)) return;
    await supabase.from('aziende').update({ stato: nuovoStato }).eq('id', az.id);
    az.stato = nuovoStato;
    mostraToast('Stato aggiornato');
    parent.removeChild(riga);
    renderRigaAzienda(az, parent);
  });

  // Elimina
  riga.querySelector('.btn-elimina').onclick = async () => {
    if (!confirm(`⚠️ Elimina definitivamente "${az.nome}"?`)) return;
    if (!confirm('Seconda conferma: sei sicuro?')) return;
    await eliminaAzienda(az.id, az.nome);
  };

  parent.appendChild(riga);
}

function statoColor(s) {
  return { attiva:'#059669', sospesa:'#dc2626', trial:'#d97706', piattaforma:'#0E5A7A' }[s] || '#64748b';
}

function mostraToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:white;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escH(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function eliminaAzienda(aziendaId, nome) {
  try {
    // 1. Rimuovi link utenti
    await supabase.from("utenti_aziende").delete().eq("azienda_id", aziendaId);

    // 2. Rimuovi sedi
    await supabase.from("sedi").delete().eq("azienda_id", aziendaId);

    // 3. Rimuovi l'azienda
    const { error } = await supabase.from("aziende").delete().eq("id", aziendaId);

    if (error) throw error;

    alert(`Azienda "${nome}" eliminata.`);
    window.router.reloadCurrentRoute();

  } catch (err) {
    alert("Errore eliminazione: " + (err.message || err));
  }
}
