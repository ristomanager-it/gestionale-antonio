// js/utils/ltv.js
// Modulo LTV riutilizzabile — importa e usa ovunque nel gestionale

const supa = () => window.supabaseClient || window.supabase;

// ─── LIVELLI FISSI (specchio della tabella ltv_livelli_sistema) ───────────────
export const LTV_LIVELLI = {
  nuovo:       { emoji: '🌱', label: 'Nuovo',       ordine: 0, colore: '#64748b', bg: '#f8fafc' },
  occasionale: { emoji: '☕', label: 'Occasionale', ordine: 1, colore: '#78716c', bg: '#fafaf9' },
  abituale:    { emoji: '🍽️', label: 'Abituale',    ordine: 2, colore: '#2563eb', bg: '#eff6ff' },
  fedele:      { emoji: '⭐', label: 'Fedele',       ordine: 3, colore: '#d97706', bg: '#fffbeb' },
  vip:         { emoji: '💎', label: 'VIP',          ordine: 4, colore: '#16a34a', bg: '#f0fdf4' },
};

// ─── CALCOLA LIVELLO LATO CLIENT (stima rapida senza roundtrip DB) ────────────
// Usata per preview in tempo reale nella scheda cliente
export function calcolaLivelloLocale(mediaSpesa, nVisite, cfg = {}) {
  const {
    min_visite        = 2,
    min_spesa         = 0,
    totale_spesa      = 0,
    soglia_occasionale = 1,
    soglia_abituale   = 50,
    soglia_fedele     = 120,
    soglia_vip        = 250,
  } = cfg;

  if (nVisite < min_visite || totale_spesa < min_spesa) return 'nuovo';
  if (mediaSpesa >= soglia_vip)        return 'vip';
  if (mediaSpesa >= soglia_fedele)     return 'fedele';
  if (mediaSpesa >= soglia_abituale)   return 'abituale';
  if (mediaSpesa >= soglia_occasionale) return 'occasionale';
  return 'nuovo';
}

// ─── BADGE HTML — usa ovunque per mostrare il livello ─────────────────────────
// Esempi:
//   badgeLTV('vip')
//   badgeLTV(contatto.ltv_livello, { mostraLabel: true, mostraMedia: true, media: contatto.ltv_media_spesa })
export function badgeLTV(livello, opzioni = {}) {
  const l = LTV_LIVELLI[livello] || LTV_LIVELLI.nuovo;
  const { mostraLabel = false, mostraMedia = false, media = null, size = 'md' } = opzioni;

  const padding  = size === 'sm' ? '2px 7px' : '3px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';
  const emojiSize = size === 'sm' ? '13px' : '15px';

  let contenuto = `<span style="font-size:${emojiSize};">${l.emoji}</span>`;
  if (mostraLabel) contenuto += ` <span>${l.label}</span>`;
  if (mostraMedia && media !== null) contenuto += ` <span style="opacity:.7;">€${Number(media).toFixed(0)}/vis</span>`;

  return `<span style="
    display:inline-flex;align-items:center;gap:4px;
    background:${l.bg};color:${l.colore};
    border:1px solid ${l.colore}30;
    border-radius:20px;padding:${padding};
    font-size:${fontSize};font-weight:600;line-height:1.3;
    white-space:nowrap;
  ">${contenuto}</span>`;
}

// ─── NOME + BADGE — snippet pronto per liste clienti ─────────────────────────
// Esempio: nomeConLTV('Mario Rossi', 'vip')  → "Mario Rossi 💎"
export function nomeConLTV(nome, livello) {
  const l = LTV_LIVELLI[livello] || LTV_LIVELLI.nuovo;
  return `${nome} ${l.emoji}`;
}

// ─── CARICA CONFIGURAZIONE LTV AZIENDA ────────────────────────────────────────
export async function caricaConfigLTV(aziendaId) {
  const { data } = await supa()
    .from('ltv_configurazione')
    .select('*')
    .eq('azienda_id', aziendaId)
    .single();

  // Ritorna i valori dell'azienda oppure i default Ristoflow
  return {
    finestra_mesi:      data?.finestra_mesi      ?? 12,
    min_visite:         data?.min_visite         ?? 2,
    min_spesa:          data?.min_spesa          ?? 0,
    soglia_occasionale: data?.soglia_occasionale ?? 1,
    soglia_abituale:    data?.soglia_abituale     ?? 50,
    soglia_fedele:      data?.soglia_fedele       ?? 120,
    soglia_vip:         data?.soglia_vip          ?? 250,
  };
}

// ─── SALVA CONFIGURAZIONE LTV ─────────────────────────────────────────────────
export async function salvaConfigLTV(aziendaId, cfg) {
  const { error } = await supa()
    .from('ltv_configurazione')
    .upsert({ azienda_id: aziendaId, ...cfg, updated_at: new Date().toISOString() },
             { onConflict: 'azienda_id' });
  return !error;
}

// ─── RICALCOLA LTV TUTTI I CONTATTI (chiama Edge Function) ───────────────────
export async function ricalcolaLTVAzienda(aziendaId) {
  const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
  const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ltv-ricalcola`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ azienda_id: aziendaId }),
  });
  return res.json();
}
