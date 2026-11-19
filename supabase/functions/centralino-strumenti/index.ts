// centralino-strumenti — le azioni che la voce AI (agente ElevenLabs) usa durante la telefonata.
// Chiamata da ElevenLabs come "webhook tool": POST JSON, header x-centralino-key = secret CENTRALINO_KEY.
// Parametri in query: ?azione=disponibilita|prenota|info|menu|invia_link|ordina&azienda=<uuid>&sede=<uuid>
// verify_jwt = false (ElevenLabs non ha un JWT Supabase): l'accesso e' protetto dalla chiave.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const STATI_ATTIVI = ["in_attesa", "confermata", "arrivata"];

async function sel(table: string, q: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: H });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return await r.json();
}
async function ins(table: string, row: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return (await r.json())[0];
}

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

function hhmm(s: string) {
  const m = String(s || "").match(/(\d{1,2})[:.,h ]?(\d{2})?/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2] || 0);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}
const piuMinuti = (ora: string, min: number) => {
  const [h, m] = ora.split(":").map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const telNorm = (t: string) => {
  let s = String(t || "").replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^3\d{8,9}$/.test(s)) s = "+39" + s;
  return s;
};

function oggi() {
  const d = new Date();
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...o }).format(d);
  return { oggi: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d), giorno_settimana: f({ weekday: "long" }), ora_attuale: f({ hour: "2-digit", minute: "2-digit" }) };
}

async function configSlot(azienda: string) {
  const c = (await sel("prenotazioni_slot_config", `azienda_id=eq.${azienda}&select=*&limit=1`))[0] || {};
  return {
    slot: Number(c.slot_minuti) || 30,
    max: Number(c.max_coperti_slot) || 30,
    orari: (Array.isArray(c.orari) && c.orari.length ? c.orari : ["12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"]) as string[],
  };
}

async function liberi(azienda: string, data: string, ora: string, slot: number, max: number) {
  const rows = await sel("prenotazioni_tavoli",
    `azienda_id=eq.${azienda}&data=eq.${data}&stato=in.(${STATI_ATTIVI.join(",")})&ora=gte.${ora}&ora=lt.${piuMinuti(ora, slot)}&select=coperti`);
  return max - rows.reduce((s: number, p: any) => s + (Number(p.coperti) || 0), 0);
}

async function disponibilita(azienda: string, b: any) {
  const data = String(b.data || "");
  const persone = Number(b.persone) || 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !persone) return { esito: "dati_mancanti", ...oggi(), messaggio: "Servono data (AAAA-MM-GG) e numero di persone." };
  const cfg = await configSlot(azienda);
  const ora = hhmm(b.ora);
  if (ora) {
    const l = await liberi(azienda, data, ora, cfg.slot, cfg.max);
    if (l >= persone) return { esito: "disponibile", data, ora, persone };
  }
  // proponi gli orari liberi dello stesso giorno
  const alternative: string[] = [];
  for (const o of cfg.orari) {
    if ((await liberi(azienda, data, o, cfg.slot, cfg.max)) >= persone) alternative.push(o);
  }
  return { esito: ora ? "pieno" : "scegli_orario", data, persone, orari_liberi: alternative };
}

async function prenota(azienda: string, sede: string | null, b: any) {
  const d = await disponibilita(azienda, b);
  if (d.esito !== "disponibile") return { ...d, salvata: false };
  const telefono = telNorm(b.telefono);
  const nome = String(b.nome || "").trim();
  if (!nome || telefono.length < 8) return { esito: "dati_mancanti", salvata: false, messaggio: "Servono nome e numero di telefono." };
  const note = [b.note, b.intolleranze ? `🥗 Intolleranze: ${b.intolleranze}` : "", "📞 Presa dalla voce AI"].filter(Boolean).join("\n");
  const pren = await ins("prenotazioni_tavoli", {
    azienda_id: azienda, sede_id: sede, cliente_nome: nome, cognome: b.cognome || null,
    cliente_telefono: telefono, data: d.data, ora: (d as any).ora, coperti: d.persone,
    note, stato: "in_attesa", canale: "telefono",
  });
  return { esito: "prenotata", salvata: true, id: pren?.id, data: d.data, ora: (d as any).ora, persone: d.persone };
}


const GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const NOMI_G: Record<string, string> = { lun: "lunedì", mar: "martedì", mer: "mercoledì", gio: "giovedì", ven: "venerdì", sab: "sabato", dom: "domenica" };

async function info(azienda: string, sede: string | null, b: any) {
  const s = sede ? (await sel("sedi", `id=eq.${sede}&azienda_id=eq.${azienda}&select=nome,citta,indirizzo,telefono,orari_apertura,tipo_cucina,descrizione&limit=1`))[0] : null;
  const orari: string[] = [];
  const oa = s?.orari_apertura || {};
  for (const g of ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]) {
    const o = oa[g];
    if (!o) continue;
    if (!o.aperto) { orari.push(`${NOMI_G[g]}: chiuso`); continue; }
    const pranzo = o.solo_cena ? "" : `pranzo ${o.pranzo_inizio}-${o.pranzo_fine}`;
    const cena = o.solo_pranzo ? "" : `cena ${o.cena_inizio}-${o.cena_fine}`;
    orari.push(`${NOMI_G[g]}: ${[pranzo, cena].filter(Boolean).join(", ")}`);
  }
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(b.data || "")) ? String(b.data) : oggi().oggi;
  let m = sede ? (await sel("menu_giorno", `azienda_id=eq.${azienda}&sede_id=eq.${sede}&data=eq.${data}&pubblicato=eq.true&select=voci,prezzo_fisso,note,titolo&limit=1`))[0] : null;
  if (!m && sede) m = (await sel("menu_giorno", `azienda_id=eq.${azienda}&sede_id=eq.${sede}&data=eq.${data}&select=voci,prezzo_fisso,note,titolo&limit=1`))[0];
  let menu_del_giorno: any = null;
  if (m) {
    const per: Record<string, string[]> = {};
    for (const v of (Array.isArray(m.voci) ? m.voci : [])) {
      const k = String(v.portata || "altro");
      (per[k] ||= []).push(String(v.nome || "").trim());
    }
    menu_del_giorno = { data, titolo: m.titolo || null, prezzo_fisso: m.prezzo_fisso || null, portate: per, note: m.note || null };
  }
  const giorno = GIORNI[new Date(data + "T12:00:00").getDay()];
  return {
    locale: s?.nome || null, indirizzo: s ? `${s.indirizzo || ""}, ${s.citta || ""}`.replace(/^, |, $/g, "") : null,
    telefono: s?.telefono || null, cucina: s?.tipo_cucina || null, descrizione: s?.descrizione || null,
    orari_apertura: orari, data_richiesta: data, giorno_richiesto: NOMI_G[giorno],
    menu_del_giorno: menu_del_giorno || "non ancora pubblicato per questa data", ...oggi(),
  };
}

/* ---------------- menu, link e ordini da asporto ---------------- */
const APP_URL = "https://app.ristoflow-ai.com";
const NUM_PAROLE: Record<string, number> = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const norm = (t: string) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const euro = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",") + " €";

async function configSede(azienda: string, sede: string | null) {
  if (!sede) return null;
  return (await sel("centralino_config", `azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=*&limit=1`))[0] || null;
}

// Il menu della voce: quello scelto nel Centralino AI, altrimenti il menu attivo della sede (prima quelli ordinabili da asporto)
async function menuVoce(azienda: string, sede: string | null, perOrdini = false) {
  const c = await configSede(azienda, sede);
  if (c?.menu_id_voce) {
    const m = (await sel("menu", `id=eq.${c.menu_id_voce}&azienda_id=eq.${azienda}&select=id,nome,slug,attivo,ordinabile,ritiro_attivo,tempo_consegna_min,ordine_minimo,istruzioni_ritiro&limit=1`))[0];
    if (m) return { menu: m, cfg: c };
  }
  if (!sede) return { menu: null, cfg: c };
  const tutti = await sel("menu", `azienda_id=eq.${azienda}&sede_id=eq.${sede}&attivo=eq.true&select=id,nome,slug,attivo,ordinabile,ritiro_attivo,tempo_consegna_min,ordine_minimo,istruzioni_ritiro`);
  tutti.sort((a: any, b: any) => Number(!!b.ritiro_attivo) - Number(!!a.ritiro_attivo) || Number(!!b.ordinabile) - Number(!!a.ordinabile));
  const m = perOrdini ? tutti.find((x: any) => x.ordinabile && x.ritiro_attivo) : tutti[0];
  return { menu: m || null, cfg: c };
}

async function vociMenu(menuId: string) {
  const [cat, voci] = await Promise.all([
    sel("menu_categorie", `menu_id=eq.${menuId}&select=id,nome,ordine,attivo,visibile&order=ordine`),
    sel("menu_voci", `menu_id=eq.${menuId}&attivo=eq.true&select=id,nome,descrizione,prezzo,prezzo_override,categoria_id,visibile,disponibile,ordinabile,ordine&order=ordine&limit=1000`),
  ]);
  const catOk = new Map((cat || []).filter((c: any) => c.attivo !== false && c.visibile !== false).map((c: any) => [c.id, c.nome]));
  return (voci || [])
    .filter((v: any) => v.visibile !== false && v.disponibile !== false && (!v.categoria_id || catOk.has(v.categoria_id)))
    .map((v: any) => ({ id: v.id, nome: String(v.nome || "").trim(), descrizione: String(v.descrizione || "").trim(),
      prezzo: Number(v.prezzo_override ?? v.prezzo ?? 0), categoria: catOk.get(v.categoria_id) || "Altro", ordinabile: v.ordinabile !== false }));
}

async function menu(azienda: string, sede: string | null, b: any) {
  const { menu: m } = await menuVoce(azienda, sede);
  if (!m) return { esito: "menu_non_disponibile" };
  let voci = await vociMenu(m.id);
  const cerca = norm(b.cerca || "");
  const categoria = norm(b.categoria || "");
  if (categoria) voci = voci.filter((v) => norm(v.categoria).includes(categoria));
  if (cerca) {
    const parole = cerca.split(" ").filter((w) => w.length > 2);
    voci = voci.filter((v) => { const t = norm(v.nome + " " + v.descrizione + " " + v.categoria); return parole.every((w) => t.includes(w)); });
  }
  // senza filtri: solo le categorie con qualche esempio, cosi' la voce chiede cosa interessa invece di leggere tutto
  if (!cerca && !categoria) {
    const per: Record<string, { piatti: number; esempi: string[] }> = {};
    for (const v of voci) { const c = (per[v.categoria] ||= { piatti: 0, esempi: [] }); c.piatti++; if (c.esempi.length < 3) c.esempi.push(v.nome); }
    return { menu: m.nome, totale_piatti: voci.length, categorie: per,
      nota: "Chiedi quale categoria interessa e richiama menu_locale con categoria.",
      link_menu: m.slug ? `${APP_URL}/menu-pubblico.html?slug=${encodeURIComponent(m.slug)}` : null };
  }
  const categorie: Record<string, string[]> = {};
  for (const v of voci.slice(0, 150)) {
    (categorie[v.categoria] ||= []).push(`${v.nome}${v.prezzo > 0 ? " — " + euro(v.prezzo) : ""}${(cerca || categoria) && v.descrizione ? " (" + v.descrizione.slice(0, 120) + ")" : ""}`);
  }
  return {
    menu: m.nome, totale_piatti: voci.length, categorie,
    nota: voci.length > 150 ? "Elenco troncato: chiedi una categoria o cerca un piatto." : undefined,
    link_menu: m.slug ? `${APP_URL}/menu-pubblico.html?slug=${encodeURIComponent(m.slug)}` : null,
  };
}

async function inviaLink(azienda: string, sede: string | null, b: any) {
  const { menu: m, cfg } = await menuVoce(azienda, sede);
  const cosa = String(b.cosa || "menu");
  let link: string | null = null;
  if (cosa === "prenota") link = `${APP_URL}/prenotazione-tavolo.html?a=${azienda}${sede ? "&s=" + sede : ""}&utm_source=voce_ai`;
  else if (m?.slug) link = `${APP_URL}/menu-pubblico.html?slug=${encodeURIComponent(m.slug)}&utm_source=voce_ai`;
  if (!link) return { inviato: false, motivo: "nessun menu pubblicato da mandare" };
  const dest = telNorm(b.telefono).replace(/^\+/, "");
  if (dest.length < 10) return { inviato: false, motivo: "numero non valido: chiedilo al cliente" };
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-ts`, {
      method: "POST", headers: H,
      body: JSON.stringify({ azienda_id: azienda, sede_id: sede || cfg?.sede_id || null, numero_dest: dest,
        template_name: "centralino_link", template_params: [link], contesto: "centralino_ai" }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok && j?.success ? { inviato: true, canale: "whatsapp", link } : { inviato: false, motivo: "WhatsApp non partito", link };
  } catch { return { inviato: false, motivo: "WhatsApp non partito", link }; }
}

// "2 margherite; 1 diavola senza piccante" -> [{q:2, nome:"margherite"}, {q:1, nome:"diavola", note:"senza piccante"}]
function righeDaTesto(t: string) {
  return String(t || "").split(/[;\n]+| e poi | poi /i).map((x) => x.trim()).filter(Boolean).map((x) => {
    let q = 1, resto = x;
    const m = resto.match(/^(\d{1,2})\s*x?\s+(.*)$/i);
    if (m) { q = Number(m[1]); resto = m[2]; }
    else { const w = resto.split(/\s+/)[0].toLowerCase(); if (NUM_PAROLE[w]) { q = NUM_PAROLE[w]; resto = resto.slice(w.length).trim(); } }
    let note = "";
    const n = resto.match(/^(.+?)\s*(?:\(([^)]*)\)|\s(senza .*|con aggiunta .*|ben cott.*|poco cott.*|al sangue.*|tagliat[ae] a .*))$/i);
    if (n && n[1]) { resto = n[1].trim(); note = (n[2] || n[3] || "").trim(); }
    return { q: Math.max(1, Math.min(30, q)), nome: resto, note };
  });
}

function trovaVoce(richiesto: string, voci: any[]) {
  const r = norm(richiesto).replace(/\b(pizza|pizze|porzione|porzioni|di|del|della|al|alla)\b/g, " ").replace(/\s+/g, " ").trim();
  const singolare = (w: string) => w.replace(/(e|i)$/, "");
  const esatte = voci.filter((v) => norm(v.nome) === norm(richiesto) || norm(v.nome) === r);
  if (esatte.length === 1) return { voce: esatte[0] };
  const parole = r.split(" ").filter((w) => w.length > 2).map(singolare);
  if (!parole.length) return { simili: [] };
  const punteggio = (v: any) => { const t = norm(v.nome); return parole.filter((w) => t.includes(w)).length / parole.length; };
  const candidati = voci.map((v) => ({ v, p: punteggio(v) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p || a.v.nome.length - b.v.nome.length);
  if (candidati.length && candidati[0].p === 1 && (candidati.length === 1 || candidati[1].p < 1)) return { voce: candidati[0].v };
  return { simili: candidati.slice(0, 4).map((x) => x.v.nome) };
}

async function mandaRiepilogoOrdine(ordine: any, nomeLocale: string, righe: any[]) {
  const conn = (await sel("whatsapp_connessioni", `azienda_id=eq.${ordine.azienda_id}&attivo=eq.true&meta_phone_number_id=not.is.null&select=meta_phone_number_id,meta_access_token&limit=1`))[0];
  if (!conn) return "nessun numero WhatsApp collegato";
  const campo = (s: string, max: number) => { const t = String(s || "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim(); return t.length > max ? t.slice(0, max - 1) + "…" : (t || "-"); };
  const piatti = righe.map((r) => r.quantita + " " + r.nome_prodotto + (r.note ? " (" + r.note + ")" : "")).join(", ");
  const r = await fetch(`https://graph.facebook.com/v21.0/${conn.meta_phone_number_id}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + conn.meta_access_token },
    body: JSON.stringify({ messaging_product: "whatsapp", to: telNorm(ordine.cliente_telefono).replace(/^\+/, ""), type: "template",
      template: { name: "ordine_conferma_v1", language: { code: "it" }, components: [{ type: "body", parameters: [
        { type: "text", text: campo(String(ordine.cliente_nome).split(" ")[0], 40) },
        { type: "text", text: campo(nomeLocale, 60) },
        { type: "text", text: campo("oggi alle " + String(ordine.orario_consegna || "").slice(0, 5), 60) },
        { type: "text", text: campo(piatti, 700) },
        { type: "text", text: euro(Number(ordine.totale) || 0) },
      ] }] } }),
  });
  if (r.ok) return null;
  const e = await r.json().catch(() => ({}));
  return String(e?.error?.message || ("errore " + r.status)).slice(0, 300);
}

async function ordina(azienda: string, sede: string | null, b: any) {
  const { menu: m, cfg } = await menuVoce(azienda, sede, true);
  if (!cfg?.asporto_attivo) return { esito: "asporto_non_attivo", messaggio: "Il locale non prende ordini al telefono: proponi di mandare il link del menu." };
  if (!m || !m.ordinabile || !m.ritiro_attivo) return { esito: "asporto_non_attivo", messaggio: "Nessun menu da asporto attivo: proponi il link del menu." };
  const richieste = righeDaTesto(b.ordine);
  if (!richieste.length) return { esito: "dati_mancanti", messaggio: "Dimmi cosa vuole ordinare, con le quantità." };
  const voci = (await vociMenu(m.id)).filter((v) => v.ordinabile && v.prezzo > 0);
  const scelte: any[] = [], da_chiarire: any[] = [];
  for (const r of richieste) {
    const t = trovaVoce(r.nome, voci);
    if (t.voce) scelte.push({ ...r, voce: t.voce });
    else da_chiarire.push({ richiesto: r.nome, forse: t.simili });
  }
  if (da_chiarire.length) return { esito: "da_chiarire", da_chiarire, messaggio: "Chiedi al cliente quale intende tra quelli simili, oppure di sceglierne un altro." };
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ordine_righe_valide`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_menu: m.id, p_tipo: "asporto", p_righe: scelte.map((s) => ({ menu_voce_id: s.voce.id, quantita: s.q, opzioni: [] })) }),
  });
  const calc = rpc.ok ? await rpc.json() : null;
  if (!calc?.ok) return { esito: "non_ordinabili", scartati: calc?.scartati || [], messaggio: "Alcuni piatti non si possono ordinare da asporto." };
  const righe = (calc.righe as any[]).map((r) => ({ ...r, note: (scelte.find((s) => s.voce.id === r.menu_voce_id && !s.usata && (s.usata = true)) || {}).note || null }));
  const subtotale = Number(calc.subtotale) || 0;
  const minimo = Number(m.ordine_minimo) || 0;
  const riepilogo = righe.map((r) => `${r.quantita} × ${r.nome_prodotto}${r.note ? " (" + r.note + ")" : ""} — ${euro(r.prezzo_unitario * r.quantita)}`);
  if (minimo > 0 && subtotale < minimo) return { esito: "sotto_minimo", minimo: euro(minimo), totale: euro(subtotale), riepilogo };
  const ora = hhmm(b.orario);
  if (!(b.conferma === true || b.conferma === "true")) {
    return { esito: "da_confermare", riepilogo, totale: euro(subtotale), pagamento: "contanti al ritiro",
      tempo_preparazione_minuti: m.tempo_consegna_min || null, orario_ritiro: ora,
      messaggio: "Leggi il riepilogo e il totale al cliente; se conferma, richiama ordina con conferma=true, orario, nome e telefono." };
  }
  const nome = String(b.nome || "").trim();
  const telefono = telNorm(b.telefono);
  if (!nome || telefono.length < 8 || !ora) return { esito: "dati_mancanti", messaggio: "Servono nome, telefono e orario di ritiro." };
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/ordini_menu_pubblico`, {
    method: "POST", headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      azienda_id: azienda, sede_id: sede, menu_id: m.id, cliente_nome: nome, cliente_telefono: telefono,
      tipo_consegna: "asporto", luogo_consegna_label: "Asporto", luogo_consegna_valore: "Telefono",
      orario_consegna: ora, data_consegna: oggi().oggi, allergie_note: [b.allergie, "📞 Ordine preso dalla voce AI"].filter(Boolean).join(" · "),
      subtotale, costo_consegna: 0, mancia: 0, totale: subtotale, persone: 1,
      metodo_pagamento: "contanti", stato_pagamento: "da_incassare", stato_ordine: "da_confermare", conferma_stato: "da_confermare",
    }),
  });
  if (!ins.ok) throw new Error("ordine: " + ins.status + " " + (await ins.text()).slice(0, 200));
  const ordine = (await ins.json())[0];
  await fetch(`${SUPABASE_URL}/rest/v1/ordini_menu_pubblico_righe`, {
    method: "POST", headers: H,
    body: JSON.stringify(righe.map((r) => ({ ordine_id: ordine.id, menu_voce_id: r.menu_voce_id, nome_prodotto: r.nome_prodotto, quantita: r.quantita,
      prezzo_unitario: r.prezzo_unitario, prezzo_base: r.prezzo_base, opzioni: r.opzioni || [], testo_opzioni: r.testo_opzioni || null, note: r.note }))),
  });
  const sedeNome = sede ? ((await sel("sedi", `id=eq.${sede}&select=nome&limit=1`))[0]?.nome || "") : "";
  const errore = await mandaRiepilogoOrdine(ordine, sedeNome, righe);
  // se il riepilogo WhatsApp non parte, l'ordine confermato a voce va comunque in cucina
  await fetch(`${SUPABASE_URL}/rest/v1/ordini_menu_pubblico?id=eq.${ordine.id}`, {
    method: "PATCH", headers: H,
    body: JSON.stringify(errore ? { stato_ordine: "nuovo", conferma_stato: "non_richiesta", conferma_errore: errore }
      : { conferma_inviata_il: new Date().toISOString() }),
  });
  return { esito: "ordinato", totale: euro(subtotale), orario_ritiro: ora, whatsapp: !errore,
    messaggio: errore ? "Ordine registrato e passato in cucina." : "Ordine registrato: il cliente riceve il riepilogo su WhatsApp e deve toccare «Confermo»." };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ errore: "solo POST" }, 405);
  if (!CENTRALINO_KEY || req.headers.get("x-centralino-key") !== CENTRALINO_KEY) return json({ errore: "non autorizzato" }, 401);
  const u = new URL(req.url);
  const azione = u.searchParams.get("azione") || "";
  const azienda = u.searchParams.get("azienda") || "";
  const sede = u.searchParams.get("sede") || null;
  if (!/^[0-9a-f-]{36}$/i.test(azienda)) return json({ errore: "azienda mancante" }, 400);
  let b: any = {};
  try { b = await req.json(); } catch { /* corpo vuoto */ }
  try {
    if (azione === "disponibilita") return json(await disponibilita(azienda, b));
    if (azione === "prenota") return json(await prenota(azienda, sede, b));
    if (azione === "info") return json(await info(azienda, sede, b));
    if (azione === "menu") return json(await menu(azienda, sede, b));
    if (azione === "invia_link") return json(await inviaLink(azienda, sede, b));
    if (azione === "ordina") return json(await ordina(azienda, sede, b));
    return json({ errore: "azione sconosciuta" }, 400);
  } catch (e) {
    console.error(azione, e);
    return json({ esito: "errore_tecnico", messaggio: "Problema tecnico: scusati e passa la chiamata a una persona." });
  }
});
