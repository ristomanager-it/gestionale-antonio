// js/components/cornice.js
// Monta la grafica del post senza passare da Canva: foto sopra, fascia scura
// sotto con titolo e riga. Lo fa il browser con canvas, come per i formati
// della camera: nessuna credenziale, nessuna attesa, nessuna AI che decide.

const supa = () => window.supabaseClient || window.supabase;

const MISURE = {
  quadrata:  { w: 1080, h: 1080, foto: 0.62 },
  verticale: { w: 1080, h: 1350, foto: 0.60 },
  storia:    { w: 1080, h: 1920, foto: 0.58 },
};

function caricaImmagine(url) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('immagine non caricata'));
    i.src = url;
  });
}

// testo a capo automatico dentro una larghezza
function righe(ctx, testo, larghezza) {
  const parole = String(testo || '').split(/\s+/).filter(Boolean);
  const out = [];
  let riga = '';
  for (const p of parole) {
    const prova = riga ? riga + ' ' + p : p;
    if (ctx.measureText(prova).width > larghezza && riga) { out.push(riga); riga = p; }
    else riga = prova;
  }
  if (riga) out.push(riga);
  return out;
}

// il colore del locale, se ce l ha
async function coloriAzienda(aziendaId) {
  try {
    const { data } = await supa().from('aziende')
      .select('colore_primario, colore_brand, logo_url').eq('id', aziendaId).maybeSingle();
    return {
      fondo: (data && data.colore_primario) || '#122A38',
      accento: (data && data.colore_brand) || '#CEAE6C',
      logo: data ? data.logo_url : null
    };
  } catch (e) {
    return { fondo: '#122A38', accento: '#CEAE6C', logo: null };
  }
}

// L azienda e la ragione sociale, la sede e il locale che i clienti conoscono.
// Nelle grafiche ci va il secondo: nessuno cerca Campo Antico Ricevimenti
// quando vuole andare alla Trattoria dell Aquila.
async function nomeLocale(sedeId) {
  if (sedeId) {
    try {
      const { data } = await supa().from('sedi').select('nome').eq('id', sedeId).maybeSingle();
      if (data && data.nome) return String(data.nome);
    } catch (e) { }
  }
  return window.state?.sedeAttiva?.nome || window.state?.azienda?.nome || '';
}

export async function componiCornice(opzioni) {
  const {
    aziendaId, fotoUrl, titolo, riga2, formato = 'verticale', occasione
  } = opzioni;

  const m = MISURE[formato] || MISURE.verticale;
  const col = await coloriAzienda(aziendaId);

  const c = document.createElement('canvas');
  c.width = m.w; c.height = m.h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = col.fondo;
  ctx.fillRect(0, 0, m.w, m.h);

  // ---- foto in alto, riempie tutta la larghezza
  const altezzaFoto = Math.round(m.h * m.foto);
  const img = await caricaImmagine(fotoUrl);
  const r = Math.max(m.w / img.width, altezzaFoto / img.height);
  const lw = img.width * r, lh = img.height * r;
  ctx.drawImage(img, (m.w - lw) / 2, (altezzaFoto - lh) * 0.4, lw, lh);

  // sfumatura di raccordo: la foto non taglia netta sul fondo
  const alt = Math.round(m.h * 0.10);
  const g = ctx.createLinearGradient(0, altezzaFoto - alt, 0, altezzaFoto);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, col.fondo);
  ctx.fillStyle = g;
  ctx.fillRect(0, altezzaFoto - alt, m.w, alt);

  // ---- testo sotto
  let y = altezzaFoto + Math.round(m.h * 0.055);
  const margine = Math.round(m.w * 0.09);
  const larghezza = m.w - margine * 2;

  if (occasione) {
    const dim = Math.round(m.w * 0.026);
    ctx.font = '600 ' + dim + 'px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = col.accento;
    ctx.textAlign = 'center';
    const sp = String(occasione).toUpperCase().split('').join(' ');
    ctx.fillText(sp, m.w / 2, y);
    y += Math.round(dim * 2.1);
  }

  const dimT = Math.round(m.w * (String(titolo || '').length > 34 ? 0.058 : 0.072));
  ctx.font = '700 ' + dimT + 'px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#F5F3EE';
  ctx.textAlign = 'center';
  for (const rg of righe(ctx, titolo, larghezza)) {
    ctx.fillText(rg, m.w / 2, y);
    y += Math.round(dimT * 1.22);
  }

  if (riga2) {
    y += Math.round(m.h * 0.012);
    const dim2 = Math.round(m.w * 0.030);
    ctx.font = '300 ' + dim2 + 'px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#B0BEC7';
    for (const rg of righe(ctx, riga2, larghezza)) {
      ctx.fillText(rg, m.w / 2, y);
      y += Math.round(dim2 * 1.4);
    }
  }

  // ---- riga e nome in fondo
  const base = m.h - Math.round(m.h * 0.055);
  ctx.strokeStyle = col.accento;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(m.w / 2 - m.w * 0.10, base - Math.round(m.h * 0.035));
  ctx.lineTo(m.w / 2 + m.w * 0.10, base - Math.round(m.h * 0.035));
  ctx.stroke();
  ctx.globalAlpha = 1;

  const nome = String(locale || '').toUpperCase();
  if (nome) {
    const dimN = Math.round(m.w * 0.025);
    ctx.font = '600 ' + dimN + 'px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#F5F3EE';
    ctx.fillText(nome.split('').join(' '), m.w / 2, base);
  }

  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
}

// compone, carica e restituisce l indirizzo
export async function creaGrafica(aziendaId, giorno, formato) {
  const foto = giorno.media_url;
  if (!foto) throw new Error('Serve prima una foto');

  const blob = await componiCornice({
    aziendaId: aziendaId,
    fotoUrl: foto,
    titolo: giorno.titolo || '',
    riga2: null,
    occasione: giorno.ricorrenza || null,
    formato: formato || 'verticale'
  });
  if (!blob) throw new Error('Composizione non riuscita');

  const path = aziendaId + '/grafiche/' + giorno.id + '-' + Date.now() + '.jpg';
  const up = await supa().storage.from('media-aziende')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;

  const { data } = supa().storage.from('media-aziende').getPublicUrl(path);
  return data.publicUrl;
}
