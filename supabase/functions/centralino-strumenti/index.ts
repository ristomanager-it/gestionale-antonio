// centralino-strumenti — le azioni che la voce AI (agente ElevenLabs) usa durante la telefonata.
// Chiamata da ElevenLabs come "webhook tool": POST JSON, header x-centralino-key = secret CENTRALINO_KEY.
// Parametri in query: ?azione=disponibilita|prenota|info&azienda=<uuid>&sede=<uuid>
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
    return json({ errore: "azione sconosciuta" }, 400);
  } catch (e) {
    console.error(azione, e);
    return json({ esito: "errore_tecnico", messaggio: "Problema tecnico: scusati e passa la chiamata a una persona." });
  }
});
