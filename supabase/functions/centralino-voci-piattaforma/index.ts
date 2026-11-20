// centralino-voci-piattaforma — controlla l'abbonamento ElevenLabs della piattaforma:
// voci clonate usate / limite del piano e caratteri del mese. Se restano poche voci libere
// (centralino_prezzi.el_soglia_voci, default 2) o i caratteri sono quasi finiti, avvisa il superadmin
// (notifica in app con push, una volta al giorno) cosi' si passa al piano superiore in tempo.
// Chi chiama: cron giornaliero (x-deploy-key), centralino-agenti dopo una nuova voce (x-centralino-key),
// il superadmin dalla pagina Piattaforma (JWT). verify_jwt = false: l'accesso e' controllato qui.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const CENTRALINO_KEY = Deno.env.get("CENTRALINO_KEY") ?? "";
const SUPERADMIN = "5da91398-947a-4f13-bdaa-f2a593c03e54";
const RISTOFLOW_AZ = "a43d41b5-f4ac-494f-8144-6574347a754f";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-deploy-key, x-centralino-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path.split("?")[0]}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

async function autorizzato(req: Request) {
  if (CENTRALINO_KEY && req.headers.get("x-centralino-key") === CENTRALINO_KEY) return true;
  const dk = req.headers.get("x-deploy-key");
  if (dk) {
    const c = (await rest(`deploy_config?id=eq.1&select=chiave&limit=1`).catch(() => []))?.[0];
    if (c?.chiave && String(c.chiave) === dk.trim()) return true;
  }
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: req.headers.get("Authorization") || "" } });
  const u = r.ok ? await r.json() : null;
  return u?.id === SUPERADMIN;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!(await autorizzato(req))) return json({ errore: "non autorizzato" }, 401);
    if (!EL_KEY) return json({ errore: "ElevenLabs non configurato" }, 400);
    const cfg = (await rest(`centralino_prezzi?id=eq.1&select=el_soglia_voci,el_limite_voci`))?.[0] || {};
    const soglia = Number(cfg.el_soglia_voci ?? 2);
    // dati veri dell'abbonamento (serve il permesso user_read sulla chiave); senza, conto le voci clonate
    // e uso il limite scritto in centralino_prezzi.el_limite_voci
    const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": EL_KEY } });
    const sub: any = r.ok ? await r.json().catch(() => ({})) : {};
    let fonte = "abbonamento";
    if (!r.ok || sub.voice_limit == null) {
      fonte = "conteggio";
      let usate = 0, token = "", giri = 0;
      do {
        const v = await fetch(`https://api.elevenlabs.io/v2/voices?page_size=100&voice_type=personal${token ? "&next_page_token=" + encodeURIComponent(token) : ""}`, { headers: { "xi-api-key": EL_KEY } });
        const d: any = await v.json().catch(() => ({}));
        if (!v.ok) return json({ errore: `ElevenLabs ${v.status}`, dettaglio: JSON.stringify(d).slice(0, 300) }, 502);
        usate += (d.voices || []).filter((x: any) => ["cloned", "generated", "professional"].includes(x.category)).length;
        token = d.has_more ? d.next_page_token || "" : "";
      } while (token && ++giri < 10);
      sub.voice_slots_used = usate;
      sub.voice_limit = Number(cfg.el_limite_voci ?? 11);
    }
    const usate = Number(sub.voice_slots_used ?? 0), limite = Number(sub.voice_limit ?? 0);
    const libere = Math.max(0, limite - usate);
    const caratteri = Number(sub.character_count ?? 0), limCar = Number(sub.character_limit ?? 0);
    const pctCar = limCar ? Math.round(caratteri / limCar * 100) : 0;
    const locali = ((await rest(`centralino_config?voce_clonata_id=not.is.null&select=id`)) || []).length;
    const stato = {
      piano: sub.tier || null, voci_usate: usate, voci_limite: limite, voci_libere: libere, soglia,
      locali_con_voce: locali, caratteri, caratteri_limite: limCar, caratteri_pct: pctCar,
      rinnovo: sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toISOString() : null,
      allarme_voci: limite > 0 && libere <= soglia, allarme_caratteri: pctCar >= 85,
      fonte, controllato_il: new Date().toISOString(),
    };
    await rest(`centralino_prezzi?id=eq.1`, { method: "PATCH", body: JSON.stringify({ el_stato: stato }) });

    const avvisi: string[] = [];
    if (stato.allarme_voci) avvisi.push(libere === 0
      ? `Voci finite: ${usate}/${limite}${stato.piano ? " sul piano " + stato.piano : ""}. Le nuove registrazioni falliscono: passa al piano ElevenLabs superiore.`
      : `Restano ${libere} voci su ${limite}${stato.piano ? " (piano " + stato.piano + ")" : ""}. Passa al piano ElevenLabs superiore prima che finiscano.`);
    if (stato.allarme_caratteri) avvisi.push(`Caratteri del mese al ${pctCar}% (${caratteri}/${limCar}).`);
    if (avvisi.length) {
      const rif = "el_voci:" + new Date().toISOString().slice(0, 10);
      const gia = await rest(`notifiche?user_id=eq.${SUPERADMIN}&riferimento_tipo=eq.${rif}&select=id&limit=1`);
      if (!gia?.length) {
        await rest(`notifiche`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
          azienda_id: RISTOFLOW_AZ, user_id: SUPERADMIN, tipo: "piattaforma", priorita: "alta", letto: false,
          titolo: "🎙️ ElevenLabs: rinnova il piano", messaggio: avvisi.join(" "), riferimento_tipo: rif }) });
      }
    }
    return json({ ok: true, ...stato });
  } catch (e) {
    console.error("centralino-voci-piattaforma:", e);
    return json({ errore: String((e as Error)?.message || e) }, 500);
  }
});
