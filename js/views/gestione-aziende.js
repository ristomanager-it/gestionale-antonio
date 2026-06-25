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
    .select("id,nome,stato,stato_attivazione,profilo_completato,data_scadenza,piano_id,piano_nome,email,citta,moduli,tipo_app,abbonamento_stato,abbonamento_scade_il,stripe_customer_id,stripe_subscription_id")
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
          ${az.abbonamento_stato === 'attivo' ? '<span style="background:#dcfce7;color:#166534;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:4px;">✅ Attivo</span>' : ''}
          ${az.abbonamento_stato === 'pagamento_fallito' ? '<span style="background:#fee2e2;color:#991b1b;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:4px;">⚠️ Pagamento fallito</span>' : ''}
          ${az.abbonamento_stato === 'in_attesa_pagamento' ? '<span style="background:#fef3c7;color:#92400e;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;margin-left:4px;">⏳ In attesa</span>' : ''}
          ${az.tipo_app?.length ? az.tipo_app.map(t=>`<span style="background:#f1f5f9;color:#374151;padding:2px 8px;border-radius:20px;font-size:10px;">${t}</span>`).join('') : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-mini btn-open">Apri</button>
        <button class="btn-mini btn-piano">💳 Piano</button>
        <button class="btn-mini btn-moduli">🧩 Moduli</button>
        <button class="btn-mini btn-wa">📱 WhatsApp</button>
        <button class="btn-mini btn-stripe">💳 Stripe</button>
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
        <button class="btn-attiva-stripe app-button small" style="background:#635bff;color:#fff;">⚡ Attiva con Stripe</button>
        <button class="btn-portale-stripe app-button small" style="background:#f1f5f9;color:#374151;">🔗 Portale cliente</button>
        <button class="btn-attiva-manuale app-button small" style="background:#059669;color:#fff;">✅ Attiva manualmente</button>
      </div>
      <div id="abbonamento-stato-${az.id}" style="margin-top:10px;font-size:12px;"></div>
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

    <!-- PANEL WHATSAPP -->
    <div class="panel-wa" style="display:none;background:#f8fafc;border-radius:10px;padding:14px;margin-top:8px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📱 Attivazione WhatsApp Business</div>
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;">Sede</label>
        <select id="wa-sede-${az.id}" class="input" style="margin-top:4px;">
          <option value="">— Azienda (tutti) —</option>
        </select>
        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Assegna il numero a una sede specifica, o lascia "Azienda" per usarlo su tutte</div>
      </div>
      <div id="wa-stato-${az.id}" style="margin-bottom:12px;"></div>
      <div style="display:grid;gap:10px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;">Numero telefono cliente</label>
          <input id="wa-numero-${az.id}" class="input" placeholder="+39 333 1234567" style="margin-top:4px;"
            value="${az.wa_numero||''}">
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Numero WhatsApp Business del cliente da aggiungere al WABA</div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;">Phone Number ID <span style="color:#94a3b8;">(da Meta Business Manager)</span></label>
          <input id="wa-phoneid-${az.id}" class="input" placeholder="Es. 1079292468608484" style="margin-top:4px;font-family:monospace;"
            value="${az.wa_phone_number_id||''}">
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Inserisci dopo aver aggiunto il numero al WABA Meta</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn-attiva-wa app-button small primary">✅ Attiva numero</button>
        <button class="btn-notifica-wa app-button small gray">📧 Notifica attivazione al cliente</button>
        <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers/?business_id=1592588934535117&tab=phone-numbers&asset_id=969232959308152" target="_blank"
          class="app-button small gray" style="text-decoration:none;">🌐 Apri WhatsApp Manager</a>
      </div>
    </div>

    <!-- PANEL STRIPE -->
    <div class="panel-stripe" style="display:none;background:#f8fafc;border-radius:10px;padding:14px;margin-top:8px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">💳 Configurazione Stripe</div>
      <div id="stripe-stato-${az.id}" style="margin-bottom:12px;"></div>
      <div style="display:grid;gap:10px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;">Publishable Key</label>
          <input id="stripe-pub-${az.id}" class="input" placeholder="pk_live_..." style="margin-top:4px;font-family:monospace;font-size:12px;"
            value="${az.stripe_publishable_key||''}">
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Chiave pubblica dal pannello Stripe → Developers → API Keys</div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;">Secret Key</label>
          <input id="stripe-sec-${az.id}" class="input" placeholder="sk_live_..." type="password" style="margin-top:4px;font-family:monospace;font-size:12px;"
            value="${az.stripe_secret_key||''}">
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Chiave segreta — non condividere mai</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="stripe-attivo-${az.id}" ${az.stripe_attivo ? 'checked' : ''}> Pagamenti attivi
          </label>
          <span style="font-size:11px;color:#94a3b8;">Se disattivato i pagamenti non vengono elaborati</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn-salva-stripe app-button small primary">✅ Salva configurazione</button>
        <button class="btn-test-stripe app-button small gray">🧪 Testa connessione</button>
        <a href="https://dashboard.stripe.com/apikeys" target="_blank" class="app-button small gray" style="text-decoration:none;">🌐 Apri Stripe Dashboard</a>
      </div>
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

  // Attiva abbonamento con Stripe Checkout
  riga.querySelector('.btn-attiva-stripe').onclick = async () => {
    const pianoId = riga.querySelector(`input[name="piano-${az.id}"]:checked`)?.value;
    if (!pianoId) { alert('Seleziona prima un piano'); return; }
    const btn = riga.querySelector('.btn-attiva-stripe');
    btn.disabled = true; btn.textContent = 'Caricamento...';
    try {
      const { data, error } = await supabase.functions.invoke('ristoflow-crea-abbonamento', {
        body: { azienda_id: az.id, piano_id: pianoId }
      });
      if (error || !data?.url) throw new Error(error?.message || 'Errore creazione checkout');
      // Mostra modal con link da inviare al cliente
      const tel = az.telefono ? az.telefono.replace(/\D/g,'') : '';
      const waUrl = tel
        ? `https://wa.me/39${tel}?text=${encodeURIComponent(`Ciao ${az.nome}! 👋\n\nEcco il link per attivare il tuo abbonamento Ristoflow:\n\n${data.url}\n\nSe hai bisogno di aiuto siamo qui!`)}`
        : null;
      // Crea modal
      let m = document.getElementById('modal-link-checkout');
      if (m) m.remove();
      m = document.createElement('div');
      m.id = 'modal-link-checkout';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
      m.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);">
          <div style="font-size:18px;font-weight:700;margin-bottom:4px;">💳 Link pagamento generato</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:16px;">Invia questo link a <strong>${az.nome}</strong> per completare l'abbonamento</div>
          <div style="background:#f1f5f9;border-radius:8px;padding:12px;font-size:12px;font-family:monospace;word-break:break-all;margin-bottom:16px;border:1px solid #e2e8f0;">${data.url}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="navigator.clipboard.writeText('${data.url}');this.textContent='✅ Copiato!';setTimeout(()=>this.textContent='📋 Copia link',2000);" style="flex:1;padding:10px;background:#0E5A7A;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">📋 Copia link</button>
            ${waUrl ? `<button onclick="window.open('${waUrl}','_blank')" style="flex:1;padding:10px;background:#25d366;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">💬 Invia via WhatsApp</button>` : ''}
            <button onclick="document.getElementById('modal-link-checkout').remove()" style="padding:10px 16px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;font-weight:600;cursor:pointer;">✕</button>
          </div>
          <div style="margin-top:12px;font-size:11px;color:#9ca3af;">⏱️ Il link scade dopo 24h. Il cliente inserisce la carta direttamente su Stripe.</div>
        </div>`;
      document.body.appendChild(m);
      m.onclick = (e) => { if(e.target === m) m.remove(); };
    } catch(e) {
      alert('Errore: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = '⚡ Attiva con Stripe';
    }
  };

  // Portale cliente Stripe
  riga.querySelector('.btn-portale-stripe').onclick = async () => {
    if (!az.stripe_customer_id) { alert('Nessun cliente Stripe associato. Attiva prima un abbonamento.'); return; }
    const btn = riga.querySelector('.btn-portale-stripe');
    btn.disabled = true; btn.textContent = 'Caricamento...';
    try {
      const { data, error } = await supabase.functions.invoke('ristoflow-portale-cliente', {
        body: { azienda_id: az.id }
      });
      if (error || !data?.url) throw new Error(error?.message || 'Errore portale');
      window.open(data.url, '_blank');
    } catch(e) {
      alert('Errore: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = '🔗 Portale cliente';
    }
  };

  // Attiva manualmente (es. Fondatore, accordo speciale)
  riga.querySelector('.btn-attiva-manuale').onclick = async () => {
    const pianoId = riga.querySelector(`input[name="piano-${az.id}"]:checked`)?.value;
    if (!pianoId) { alert('Seleziona prima un piano'); return; }
    const scadenza = riga.querySelector('.inp-scadenza').value;
    if (!scadenza) { alert('Inserisci la data di scadenza'); return; }
    if (!confirm(`Attivare manualmente il piano per ${az.nome}? Scadenza: ${scadenza}`)) return;
    await supabase.from('aziende').update({
      piano_id: pianoId,
      abbonamento_stato: 'attivo',
      abbonamento_scade_il: scadenza,
    }).eq('id', az.id);
    mostraToast('Abbonamento attivato manualmente ✅');
    // Aggiorna badge
    const statoDiv = document.getElementById(`abbonamento-stato-${az.id}`);
    if (statoDiv) statoDiv.innerHTML = '<span style="color:#166534;font-weight:700;">✅ Attivo fino al '+scadenza+'</span>';
  };

  // Mostra stato abbonamento corrente
  const statoDiv = document.getElementById(`abbonamento-stato-${az.id}`);
  if (statoDiv && az.abbonamento_stato) {
    const colori = { attivo:'#166534', in_attesa_pagamento:'#92400e', pagamento_fallito:'#991b1b', cancellato:'#6b7280' };
    const labels = { attivo:'✅ Attivo', in_attesa_pagamento:'⏳ In attesa pagamento', pagamento_fallito:'⚠️ Pagamento fallito', cancellato:'❌ Cancellato' };
    const col = colori[az.abbonamento_stato] || '#6b7280';
    const lab = labels[az.abbonamento_stato] || az.abbonamento_stato;
    statoDiv.innerHTML = `<span style="color:${col};font-weight:700;">${lab}</span>${az.abbonamento_scade_il ? ` · scade <strong>${az.abbonamento_scade_il}</strong>` : ''}`;
  }

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

  // Panel Stripe
  riga.querySelector('.btn-stripe').onclick = async () => {
    const s = riga.querySelector('.panel-stripe');
    const w = riga.querySelector('.panel-wa');
    const p = riga.querySelector('.panel-piano');
    const m = riga.querySelector('.panel-moduli');
    s.style.display = s.style.display==='none' ? '' : 'none';
    w.style.display = 'none'; p.style.display = 'none'; m.style.display = 'none';

    if (s.style.display !== 'none') {
      const statoEl = document.getElementById(`stripe-stato-${az.id}`);
      const haKeys = az.stripe_publishable_key && az.stripe_secret_key;
      statoEl.innerHTML = haKeys
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${az.stripe_attivo ? '#059669' : '#d97706'};flex-shrink:0;"></span>
            <span style="font-size:13px;font-weight:600;">Stripe configurato — pagamenti ${az.stripe_attivo ? 'attivi' : 'disattivati'}</span>
           </div>`
        : `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;font-size:13px;color:#c2410c;">
            ⚠️ Stripe non configurato — inserisci le chiavi API
           </div>`;
    }

    // Salva
    s.querySelector('.btn-salva-stripe').onclick = async () => {
      const pub = document.getElementById(`stripe-pub-${az.id}`).value.trim();
      const sec = document.getElementById(`stripe-sec-${az.id}`).value.trim();
      const attivo = document.getElementById(`stripe-attivo-${az.id}`).checked;
      if (!pub || !sec) { alert('Inserisci entrambe le chiavi'); return; }
      await supabase.from('aziende').update({
        stripe_publishable_key: pub,
        stripe_secret_key: sec,
        stripe_attivo: attivo,
      }).eq('id', az.id);
      az.stripe_publishable_key = pub;
      az.stripe_secret_key = sec;
      az.stripe_attivo = attivo;
      mostraToast('Stripe configurato ✅');
      s.style.display = 'none';
    };

    // Test connessione
    s.querySelector('.btn-test-stripe').onclick = async () => {
      const pub = document.getElementById(`stripe-pub-${az.id}`).value.trim();
      if (!pub) { alert('Inserisci prima la publishable key'); return; }
      const isLive = pub.startsWith('pk_live_');
      const isTest = pub.startsWith('pk_test_');
      if (isLive || isTest) {
        mostraToast(isLive ? '✅ Chiave LIVE valida' : '⚠️ Chiave TEST — non usare in produzione');
      } else {
        mostraToast('❌ Formato chiave non valido');
      }
    };
  };

  // Panel WhatsApp
  riga.querySelector('.btn-wa').onclick = async () => {
    const w = riga.querySelector('.panel-wa');
    const p = riga.querySelector('.panel-piano');
    const m = riga.querySelector('.panel-moduli');
    const s = riga.querySelector('.panel-stripe');
    w.style.display = w.style.display==='none' ? '' : 'none';
    p.style.display = 'none'; m.style.display = 'none'; if(s) s.style.display = 'none';

    if (w.style.display !== 'none') {
      // Carica sedi con window.supabaseClient per bypassare RLS
      const sc = window.supabaseClient || supabase;
      const { data: sedi } = await sc
        .from('sedi')
        .select('id, nome')
        .eq('azienda_id', az.id)
        .order('nome');

      const sedeSelect = document.getElementById(`wa-sede-${az.id}`);
      sedeSelect.innerHTML = '<option value="">— Azienda (tutti) —</option>';
      (sedi || []).forEach(sede => {
        const opt = document.createElement('option');
        opt.value = sede.id;
        opt.textContent = sede.nome;
        sedeSelect.appendChild(opt);
      });

      // Funzione per caricare connessione per sede selezionata
      const caricaConnessione = async (sedeId) => {
        let q = sc.from('whatsapp_connessioni')
          .select('id,numero_telefono,meta_phone_number_id,stato,sede_id')
          .eq('azienda_id', az.id);
        if (sedeId) q = q.eq('sede_id', sedeId);
        else q = q.is('sede_id', null);
        const { data: waConn } = await q.maybeSingle();

        const statoEl = document.getElementById(`wa-stato-${az.id}`);
        if (waConn) {
          const statoColor = { connesso:'#059669', non_connesso:'#dc2626', in_attesa:'#d97706', errore:'#dc2626' }[waConn.stato] || '#64748b';
          statoEl.innerHTML = `
            <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${statoColor};flex-shrink:0;"></span>
              <div style="font-size:13px;">
                <strong>${waConn.numero_telefono||'—'}</strong>
                <span style="color:${statoColor};font-weight:700;margin-left:8px;">${waConn.stato}</span>
                ${waConn.meta_phone_number_id ? `<br><span style="font-size:11px;color:#94a3b8;font-family:monospace;">ID: ${waConn.meta_phone_number_id}</span>` : ''}
              </div>
            </div>`;
          document.getElementById(`wa-numero-${az.id}`).value = waConn.numero_telefono||'';
          document.getElementById(`wa-phoneid-${az.id}`).value = waConn.meta_phone_number_id||'';
        } else {
          statoEl.innerHTML = '<div style="font-size:12px;color:#94a3b8;">Nessun numero configurato per questa sede</div>';
          document.getElementById(`wa-numero-${az.id}`).value = '';
          document.getElementById(`wa-phoneid-${az.id}`).value = '';
        }
      };

      sedeSelect.onchange = () => caricaConnessione(sedeSelect.value || null);
      await caricaConnessione(null);
    }
  };

  // Attiva numero
  riga.querySelector('.btn-attiva-wa').onclick = async () => {
    const numero  = document.getElementById(`wa-numero-${az.id}`).value.trim();
    const phoneId = document.getElementById(`wa-phoneid-${az.id}`).value.trim();
    const sedeId  = document.getElementById(`wa-sede-${az.id}`)?.value || null;
    if (!numero) { alert('Inserisci il numero telefono'); return; }

    // Carica token default da secrets (via Edge Function)
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/attiva-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
      body: JSON.stringify({ azienda_id: az.id, sede_id: sedeId || null, numero, phone_number_id: phoneId || null }),
    });
    const data = await res.json();
    if (data.error) { alert('Errore: ' + data.error); return; }
    mostraToast(phoneId ? '✅ Numero attivato!' : '⏳ Numero salvato — in attesa di attivazione');
    riga.querySelector('.btn-wa').click(); // Ricarica stato
    riga.querySelector('.btn-wa').click();
  };

  // Notifica cliente
  riga.querySelector('.btn-notifica-wa').onclick = async () => {
    const { data: waConn } = await supabase
      .from('whatsapp_connessioni')
      .select('numero_telefono,meta_phone_number_id,stato')
      .eq('azienda_id', az.id).maybeSingle();
    if (!waConn?.meta_phone_number_id) { alert('Attiva prima il numero'); return; }
    // Invia WA di conferma al cliente
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/whatsapp-send-ts', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
      body: JSON.stringify({
        azienda_id: az.id,
        to: waConn.numero_telefono,
        type: 'text',
        text: { body: `✅ Il tuo numero WhatsApp Business è ora attivo su Ristoflow!\n\nI tuoi clienti possono già scriverti e il chatbot risponde automaticamente.\n\nBenvenuto! 🎉` }
      }),
    });
    mostraToast('📱 Notifica inviata al cliente');
  };
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
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      'https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/elimina-azienda',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ azienda_id: aziendaId }),
      }
    );
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Errore eliminazione');
    mostraToast(`✅ "${nome}" eliminata`);
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    alert("Errore eliminazione: " + (err.message || err));
  }
}
