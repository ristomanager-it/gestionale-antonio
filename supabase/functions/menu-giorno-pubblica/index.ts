import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ristoflow-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_KEY") ?? "";
const API_KEY      = Deno.env.get("FISCALE_API_KEY") ?? "";
const supabase     = createClient(SUPABASE_URL, SERVICE_KEY);

const UUID_RE = /^[0-9a-f-]{36}$/i;
const CAT_NOME = "🍽️ Menu del Giorno";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function authOk(req, aziendaId) {
  if (API_KEY && req.headers.get("x-ristoflow-key") === API_KEY) return true;
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  if (!jwt) return false;
  const { data: ud } = await supabase.auth.getUser(jwt);
  const uid = ud?.user?.id;
  if (!uid) return false;
  const { data: m } = await supabase.from("utenti_aziende").select("azienda_id").eq("user_id", uid).eq("azienda_id", aziendaId).eq("attivo", true).maybeSingle();
  return !!m;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const azienda_id = String(body.azienda_id ?? "");
    const menu_giorno_id = String(body.menu_giorno_id ?? "");
    let menu_id = body.menu_id && UUID_RE.test(String(body.menu_id)) ? String(body.menu_id) : null;

    if (!UUID_RE.test(azienda_id)) return json({ success: false, error: "azienda_id non valido" }, 400);
    if (!UUID_RE.test(menu_giorno_id)) return json({ success: false, error: "menu_giorno_id non valido" }, 400);
    if (!(await authOk(req, azienda_id))) return json({ success: false, error: "Non autorizzato" }, 401);

    const { data: mg } = await supabase.from("menu_giorno")
      .select("id, sede_id, voci, data, mezza_pensione, prezzo_fisso, prezzo_visibile, prezzi_singoli_visibili")
      .eq("id", menu_giorno_id).eq("azienda_id", azienda_id).maybeSingle();
    if (!mg) return json({ success: false, error: "Menu del giorno non trovato" }, 404);

    const voci = Array.isArray(mg.voci) ? mg.voci : [];
    if (!voci.length) return json({ success: false, error: "Nessuna voce da pubblicare" }, 400);

    if (!menu_id) {
      const { data: menus } = await supabase.from("menu")
        .select("id, attivo, created_at").eq("azienda_id", azienda_id).eq("sede_id", mg.sede_id)
        .order("attivo", { ascending: false }).order("created_at", { ascending: false });
      menu_id = (menus && menus.length) ? menus[0].id : null;
    }
    if (!menu_id) return json({ success: false, error: "Nessun menu digitale trovato per questa sede" }, 400);

    // Prezzo fisso -> va nel titolo della categoria
    const prezzoFisso = mg.prezzo_fisso != null ? Number(mg.prezzo_fisso) : null;
    // Il prezzo del menu lo dice il cameriere: nel titolo solo se richiesto
    const mostraPrezzoFisso = mg.prezzo_visibile === true;
    const catNome = CAT_NOME + (mostraPrezzoFisso && prezzoFisso && prezzoFisso > 0 ? " \u2014 \u20ac " + prezzoFisso.toFixed(2).replace(".", ",") : "");
    // Il prezzo alla carta dei singoli piatti è interno (cassa/comande): al cliente solo se richiesto
    const mostraPrezziSingoli = mg.prezzi_singoli_visibili === true;

    let catId = null;
    const { data: catList } = await supabase.from("menu_categorie")
      .select("id, nome").eq("menu_id", menu_id).ilike("nome", "%Menu del Giorno%");
    const catEsist = (catList && catList.length) ? catList[0] : null;
    if (catEsist) {
      catId = catEsist.id;
      if (catEsist.nome !== catNome) await supabase.from("menu_categorie").update({ nome: catNome }).eq("id", catId);
    } else {
      const { data: nuovaCat, error: errCat } = await supabase.from("menu_categorie")
        .insert({ azienda_id, menu_id, nome: catNome, ordine: 0, attivo: true, visibile: true })
        .select("id").single();
      if (errCat || !nuovaCat) return json({ success: false, error: "Categoria: " + (errCat?.message || "errore") }, 500);
      catId = nuovaCat.id;
    }

    await supabase.from("menu_voci").delete().eq("menu_id", menu_id).eq("categoria_id", catId);

    const righe = voci.map((v, i) => ({
      azienda_id, menu_id, categoria_id: catId,
      nome: String(v.nome || "Piatto"),
      descrizione: v.descrizione ? String(v.descrizione) : null,
      prezzo: mostraPrezziSingoli ? (Number(v.prezzo) || 0) : 0,
      ricetta_id: v.ricetta_id ? Number(v.ricetta_id) : null,
      food_cost_snapshot: v.food_cost != null ? Number(v.food_cost) : null,
      attivo: true, visibile: true, disponibile: true,
      ordine: i,
    }));
    const { error: errVoci } = await supabase.from("menu_voci").insert(righe);
    if (errVoci) return json({ success: false, error: "Voci: " + errVoci.message }, 500);

    await supabase.from("menu_giorno").update({ pubblicato: true, menu_categoria_id: catId, updated_at: new Date().toISOString() }).eq("id", menu_giorno_id);

    return json({ success: true, menu_id, categoria_id: catId, voci_pubblicate: righe.length, prezzo_fisso: prezzoFisso, prezzi_singoli_visibili: mostraPrezziSingoli });
  } catch (err) {
    console.error("MENU-GIORNO-PUBBLICA ERROR:", err);
    return json({ success: false, error: String(err?.message ?? err) }, 500);
  }
});
