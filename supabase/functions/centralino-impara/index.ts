// centralino-impara — il centralino (bot WhatsApp e voce) si istruisce da solo leggendo quello che l'app sa gia' del locale:
// descrizione ed etichette della sede (animali, parcheggio, giardino, senza glutine...), sito, landing e promo attive,
// eventi in programma, feste, campagne, sale, menu. Ne scrive la "scheda del locale" in centralino_config.info_auto.
// Le "cose da sapere" scritte dal locale (info_extra) restano a parte e valgono di piu'.
// POST { azienda_id, sede_id }  -> { ok, scheda, fonti }
// POST { tutte: true }          -> rifa' la scheda di tutte le sedi col bot o la voce accesi (cron notturno)
// Chiamata server-server: header x-centralino-key (da centralino-agenti / centralino-bot) o x-deploy-key (cron). verify_jwt = false.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const MODELLO = Deno.env.get("CENTRALINO_IMPARA_MODEL") || "claude-haiku-4-5-20251001";
const MODELLO_RISERVA = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5";

function anthropicKey(): string {
  const env = Deno.env.toObject();
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY_AI"]) if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  for (const [, v] of Object.entries(env)) if (typeof v === "string" && v.trim().startsWith("sk-ant-")) return v.trim();
  return "";
}
const ANTHROPIC_KEY = anthropicKey();

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const prova = async (path: string) => { try { return (await rest(path)) || []; } catch (e) { console.warn("fonte saltata:", (e as Error).message); return []; } };

const oggi = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
const traGiorni = (n: number) => { const d = new Date(Date.now() + n * 86400000); return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d); };
const corto = (s: unknown, n = 400) => { const t = String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const pulito = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));

const ETICHETTE: Record<string, string> = {
  animali: "animali ammessi", parcheggio: "parcheggio", giardino: "giardino / spazio all'aperto", wifi: "wi-fi per i clienti",
  disabili: "accessibile a persone con disabilità", bambini: "adatto ai bambini", senza_glutine: "piatti senza glutine",
  vegano: "piatti vegani", vegetariano: "piatti vegetariani", bio: "prodotti biologici", romantico: "adatto a cene romantiche",
  business: "pranzi di lavoro", aperitivo: "aperitivo", brunch: "brunch", asporto: "asporto", dehors: "dehors",
  terrazza: "terrazza", pos: "pagamento con carta", musica: "musica dal vivo", eventi: "eventi privati",
};
const etichette = (t: unknown) => (Array.isArray(t) ? t : []).map((x) => ETICHETTE[String(x)] || String(x).replace(/_/g, " "));

async function raccogli(azienda: string, sede: string) {
  const sedeOr = `or=(sede_id.is.null,sede_id.eq.${sede})`;
  // piu' condizioni "o" insieme: in PostgREST vanno dentro un solo and=(...)
  const tutte = (...o: string[]) => `and=(${o.join(",")})`;
  const inSede = `or(sede_id.is.null,sede_id.eq.${sede})`, nonBozza = "or(bozza.is.null,bozza.eq.false)";
  const oggiS = oggi(), fra60 = traGiorni(60);
  const [az, se, sito, landing, promo, eventi, ticket, feste, codici, sale, menu, servizi] = await Promise.all([
    prova(`aziende?id=eq.${azienda}&select=nome,descrizione,tipo_locale,tipo_cucina,tags,fascia_prezzo,sito_web,instagram,instagram_url,facebook_url&limit=1`),
    prova(`sedi?id=eq.${sede}&azienda_id=eq.${azienda}&select=nome,tipo,descrizione,tipo_cucina,tags,fascia_prezzo,sito_web,coperto_medio,link_menu,link_prenota,link_ordina&limit=1`),
    prova(`sito_config?azienda_id=eq.${azienda}&${sedeOr}&select=sede_id,nome,hero_titolo,hero_sub,chisiamo_1,chisiamo_2,mare_quote,mare_testo,hl1,hl2,hl3,avviso,pagina_chisiamo,pagina_eventi`),
    prova(`landing_promo?azienda_id=eq.${azienda}&${tutte(inSede, nonBozza, `or(data_fine.is.null,data_fine.gte.${oggiS})`)}&attiva=eq.true&select=titolo,sottotitolo,piatto,tipo,etichetta,prezzo,prezzo_nota,comprende,orari_testo,validita_testo,giorni_validi,turno,data_inizio,data_fine,regolamento,contenuto&limit=20`),
    prova(`promo?azienda_id=eq.${azienda}&${tutte(inSede, nonBozza, `or(data_scadenza.is.null,data_scadenza.gte.${oggiS})`)}&attiva=eq.true&select=nome,descrizione,tipo,valore,regolamento,giorni_disponibili,turni,min_persone,data_scadenza,canale&limit=20`),
    prova(`eventi_locale?azienda_id=eq.${azienda}&${sedeOr}&data_evento=gte.${oggiS}&data_evento=lte.${fra60}&stato=not.in.(annullato,bozza)&select=nome,data_evento,ora,tipo,prezzo,posti,posti_venduti,descrizione,menu_testo&order=data_evento&limit=15`),
    prova(`ticket_eventi?azienda_id=eq.${azienda}&${sedeOr}&data_inizio=gte.${oggiS}&stato=not.in.(bozza,annullato)&select=nome,sottotitolo,data_inizio,luogo,descrizione&order=data_inizio&limit=10`),
    prova(`wa_eventi_info?azienda_id=eq.${azienda}&attivo=eq.true&or=(valido_fino.is.null,valido_fino.gte.${oggiS})&select=nome,messaggio,valido_fino`),
    prova(`whatsapp_codici?azienda_id=eq.${azienda}&${sedeOr}&attivo=eq.true&nota=not.is.null&select=codice,etichetta,nota`),
    prova(`sale?azienda_id=eq.${azienda}&sede_id=eq.${sede}&attiva=eq.true&select=nome,capienza_max,descrizione`),
    prova(`menu?azienda_id=eq.${azienda}&sede_id=eq.${sede}&attivo=eq.true&select=id,nome,descrizione,ordinabile,ritiro_attivo,consegna_attiva,prezzo_fisso_persona,prezzo_fisso_nome,ordine_minimo,consegna_costo,consegna_gratis_sopra,tempo_consegna_min`),
    prova(`servizi_evento?azienda_id=eq.${azienda}&attivo=eq.true&preventivo_online=eq.true&select=categoria,nome&limit=30`),
  ]);
  const ids = (menu || []).map((m: any) => m.id);
  const [cat, voci] = ids.length ? await Promise.all([
    prova(`menu_categorie?menu_id=in.(${ids.join(",")})&attivo=eq.true&select=menu_id,nome&order=ordine`),
    prova(`menu_voci?menu_id=in.(${ids.join(",")})&attivo=eq.true&select=menu_id,tags,nome,solo_asporto&limit=800`),
  ]) : [[], []];
  const tagsPiatti = new Set<string>();
  for (const v of voci) for (const t of (Array.isArray(v.tags) ? v.tags : [])) if (t) tagsPiatti.add(String(t).toLowerCase());

  const dati = pulito({
    data_di_oggi: oggiS,
    azienda: pulito({ ...(az[0] || {}), descrizione: corto(az[0]?.descrizione, 600), tags: undefined, servizi_dichiarati: etichette(az[0]?.tags) }),
    sede: pulito({ ...(se[0] || {}), descrizione: corto(se[0]?.descrizione, 900), tags: undefined, servizi_dichiarati: etichette(se[0]?.tags) }),
    sito: sito.filter((s: any) => !s.sede_id || s.sede_id === sede).map((s: any) => pulito({
      titolo: corto(s.hero_titolo, 150), sottotitolo: corto(s.hero_sub, 200), chi_siamo: corto([s.chisiamo_1, s.chisiamo_2].filter(Boolean).join(" "), 900),
      punti_forti: [s.hl1, s.hl2, s.hl3].filter(Boolean).map((x: string) => corto(x, 150)), mare: corto([s.mare_quote, s.mare_testo].filter(Boolean).join(" "), 400),
      avviso: corto(s.avviso, 300), pagina_chi_siamo: corto(s.pagina_chisiamo, 800), pagina_eventi: corto(s.pagina_eventi, 600),
    })),
    offerte_e_landing_attive: landing.map((l: any) => pulito({
      titolo: corto(l.titolo, 150), sottotitolo: corto(l.sottotitolo, 200), piatto: l.piatto, tipo: l.tipo || l.etichetta,
      prezzo: l.prezzo, nota_prezzo: corto(l.prezzo_nota, 150), comprende: corto(Array.isArray(l.comprende) ? l.comprende.join(", ") : l.comprende, 300),
      quando: corto([l.orari_testo, l.validita_testo, l.turno].filter(Boolean).join(" · "), 250), giorni: l.giorni_validi,
      dal: l.data_inizio, al: l.data_fine, regole: corto(l.regolamento, 300), testo: corto(l.contenuto, 400),
    })),
    promozioni_attive: promo.map((p: any) => pulito({
      nome: p.nome, descrizione: corto(p.descrizione, 300), tipo: p.tipo, valore: p.valore, regole: corto(p.regolamento, 300),
      giorni: p.giorni_disponibili, turni: p.turni, minimo_persone: p.min_persone, scade: p.data_scadenza,
    })),
    eventi_in_programma: [
      ...eventi.map((e: any) => pulito({ nome: e.nome, data: e.data_evento, ora: e.ora, tipo: e.tipo, prezzo: e.prezzo,
        posti_rimasti: e.posti ? Math.max(0, Number(e.posti) - Number(e.posti_venduti || 0)) : null, descrizione: corto(e.descrizione, 300), menu: corto(e.menu_testo, 300) })),
      ...ticket.map((t: any) => pulito({ nome: t.nome, sottotitolo: t.sottotitolo, data: t.data_inizio, luogo: t.luogo, descrizione: corto(t.descrizione, 300) })),
    ],
    feste_e_ricorrenze: feste.map((f: any) => pulito({ nome: f.nome, cosa_rispondiamo: corto(f.messaggio, 600), valido_fino: f.valido_fino })),
    campagne_in_corso: codici.map((c: any) => pulito({ nome: c.etichetta || c.codice, cosa: c.nota })),
    sale: sale.map((s: any) => pulito({ nome: s.nome, posti: s.capienza_max, descrizione: corto(s.descrizione, 200) })),
    menu: menu.map((m: any) => pulito({
      nome: m.nome, descrizione: corto(m.descrizione, 200), categorie: [...new Set(cat.filter((c: any) => c.menu_id === m.id).map((c: any) => c.nome))].slice(0, 30),
      piatti: voci.filter((v: any) => v.menu_id === m.id).length,
      asporto: !!(m.ordinabile && m.ritiro_attivo), consegna_a_domicilio: !!(m.ordinabile && m.consegna_attiva),
      prezzo_fisso: m.prezzo_fisso_persona ? `${m.prezzo_fisso_nome || "a persona"}: ${m.prezzo_fisso_persona} €` : null,
      ordine_minimo: m.ordine_minimo, costo_consegna: m.consegna_costo, consegna_gratis_sopra: m.consegna_gratis_sopra, tempo_preparazione_min: m.tempo_consegna_min,
    })),
    etichette_dei_piatti: [...tagsPiatti].slice(0, 40),
    servizi_per_eventi: servizi.map((s: any) => s.nome).slice(0, 30),
  });
  const fonti = Object.entries({
    sede: !!se.length, sito: !!sito.length, landing: landing.length, promo: promo.length, eventi: eventi.length + ticket.length,
    feste: feste.length, campagne: codici.length, sale: sale.length, menu: menu.length,
  }).filter(([, v]) => v).map(([k, v]) => (typeof v === "number" ? `${k}:${v}` : k));
  return { dati, fonti, nome: se[0]?.nome || az[0]?.nome || "il locale" };
}

const ISTRUZIONI = `Scrivi la SCHEDA DEL LOCALE che l'assistente del ristorante (bot WhatsApp e voce al telefono) userà per rispondere ai clienti.
Ti do in JSON tutto quello che il gestionale sa del locale.

REGOLE
- Solo fatti presenti nei dati. Non inventare e non dedurre (se non c'è scritto che c'è il parcheggio, non dirlo).
- "servizi_dichiarati" sono caratteristiche dichiarate dal locale: valgono come fatti (es. "animali ammessi" = i cani sono ammessi).
- NON scrivere orari di apertura, indirizzo, telefono, menu del giorno né i prezzi dei singoli piatti: l'assistente li legge già da un altro strumento sempre aggiornato.
- Offerte, promozioni ed eventi: scrivi sempre per quando valgono (giorni, turni, date) e il prezzo se c'è. Ignora quelli già scaduti rispetto a data_di_oggi.
- Le campagne: scrivi cosa offrono, così se un cliente arriva da lì l'assistente sa di cosa parla.
- "promozioni_attive" sono coupon mandati a clienti precisi: mettile sotto il titolo COUPON AI CLIENTI con la nota "non proporli di tua iniziativa: confermali solo se il cliente dice di averli ricevuti". Le landing e le offerte invece sono pubbliche.
- Italiano semplice, frasi brevi, a punti, raggruppate sotto questi titoli (solo quelli che hanno qualcosa): IL LOCALE · SERVIZI E COMODITÀ · CUCINA E MENU · ASPORTO E CONSEGNA · OFFERTE · COUPON AI CLIENTI · EVENTI IN PROGRAMMA · FESTE · SALE E FESTE PRIVATE.
- Testo semplice: titoli in maiuscolo e righe che iniziano con "- ". Niente #, niente asterischi.
- Niente frasi pubblicitarie o superlativi: informazioni utili per rispondere a un cliente.
- Massimo 2800 caratteri. Scrivi solo la scheda, senza premesse.`;

async function chiedi(modello: string, nome: string, dati: unknown) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: modello, max_tokens: 2500, system: ISTRUZIONI,
      messages: [{ role: "user", content: `Locale: ${nome}\n\nDATI:\n${JSON.stringify(dati).slice(0, 30000)}` }] }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const testo = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
  return { testo, stop: String(d.stop_reason || ""), usage: d.usage || {}, modello };
}

// se il testo si interrompe prima della fine (stop diverso da end_turn) riprovo una volta con il modello di riserva
async function scriviScheda(nome: string, dati: unknown) {
  let out = await chiedi(MODELLO, nome, dati);
  if (out.stop !== "end_turn" || out.testo.length < 200) {
    console.warn("scheda interrotta:", out.modello, out.stop, out.testo.length);
    const riserva = await chiedi(MODELLO_RISERVA, nome, dati);
    if (riserva.testo.length > out.testo.length) out = riserva;
  }
  return { testo: out.testo.slice(0, 3200), usage: { ...out.usage, modello: out.modello }, stop: out.stop, modello: out.modello };
}

async function registraConsumo(azienda: string, usage: any, rif: string) {
  try {
    const l = (await rest(`ai_listino?modello=eq.${encodeURIComponent(usage.modello || MODELLO)}&select=input_per_mtok,output_per_mtok&order=valido_dal.desc&limit=1`))?.[0];
    const i = usage.input_tokens || 0, o = usage.output_tokens || 0;
    const costo = l ? (i / 1e6) * Number(l.input_per_mtok) + (o / 1e6) * Number(l.output_per_mtok) : null;
    await rest("ai_consumi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
      azienda_id: azienda, funzione: "centralino_impara", modello: usage.modello || MODELLO, input_tokens: i, output_tokens: o, cache_read: 0, costo_usd: costo, riferimento: rif, esito: "ok",
    }) });
  } catch (e) { console.warn("consumo:", (e as Error).message); }
}

async function impara(azienda: string, sede: string) {
  const { dati, fonti, nome } = await raccogli(azienda, sede);
  const { testo, usage, stop, modello } = await scriviScheda(nome, dati);
  if (!testo) throw new Error("scheda vuota");
  const campi = { info_auto: testo, info_auto_at: new Date().toISOString(), info_auto_fonti: fonti };
  const c = (await rest(`centralino_config?azienda_id=eq.${azienda}&sede_id=eq.${sede}&select=id&limit=1`))?.[0];
  if (c) await rest(`centralino_config?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify(campi) });
  else await rest(`centralino_config`, { method: "POST", body: JSON.stringify({ azienda_id: azienda, sede_id: sede, ...campi }) });
  await registraConsumo(azienda, usage, sede.slice(0, 8));
  return { ok: true, scheda: testo, fonti, aggiornata: campi.info_auto_at, stop, modello };
}

async function autorizzato(req: Request) {
  if (CENTRALINO_KEY && req.headers.get("x-centralino-key") === CENTRALINO_KEY) return true;
  const k = String(req.headers.get("x-deploy-key") || "").trim();
  if (!k) return false;
  const cfg = (await rest(`deploy_config?id=eq.1&select=chiave&limit=1`).catch(() => []))?.[0];
  return !!cfg?.chiave && String(cfg.chiave).trim() === k;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ errore: "solo POST" }, 405);
  if (!(await autorizzato(req))) return json({ errore: "non autorizzato" }, 401);
  if (!ANTHROPIC_KEY) return json({ errore: "AI non configurata" }, 400);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.tutte) {
      const cfgs = (await rest(`centralino_config?or=(bot_wa_ai.eq.true,ai_attivo.eq.true)&select=azienda_id,sede_id`)) || [];
      const esiti: any[] = [];
      for (const c of cfgs) {
        if (!c.sede_id) continue;
        try { await impara(c.azienda_id, c.sede_id); esiti.push({ sede: c.sede_id, ok: true }); }
        catch (e) { esiti.push({ sede: c.sede_id, errore: (e as Error).message }); }
      }
      return json({ ok: true, sedi: esiti.length, esiti });
    }
    const azienda = String(b.azienda_id || ""), sede = String(b.sede_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(azienda) || !/^[0-9a-f-]{36}$/i.test(sede)) return json({ errore: "servono azienda_id e sede_id" }, 400);
    return json(await impara(azienda, sede));
  } catch (e) {
    console.error("centralino-impara:", e);
    return json({ errore: (e as Error).message }, 502);
  }
});
