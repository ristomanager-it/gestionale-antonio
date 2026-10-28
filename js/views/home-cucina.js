// js/views/home-cucina.js
// Home della sezione CUCINA: pulsanti grandi sempre in vista; lavorazioni in corso e planning si aprono a comando.
// Niente costi, niente elenchi da cui scegliere: chi lavora vede le sue cose.

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dataLocale = (d) => { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const ora = (iso) => (iso ? new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "");

export async function render(app) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  if (!sede) { window.location.hash = "#/scegli-sede"; return; }

  const ruolo = String((window.normalizeRuolo ? window.normalizeRuolo(window.state?.viewAs || window.state?.ruolo) : (window.state?.viewAs || window.state?.ruolo)) || "").toLowerCase();
  const responsabile = ["admin", "manager", "superadmin"].includes(ruolo);

  app.innerHTML = `<section class="view"><div class="small-muted">Un attimo…</div></section>`;

  let dipId = window.state?.dipendente?.id || null;
  if (!dipId && azienda?.id && window.state?.user?.id) {
    const { data } = await supabase.from("dipendenti").select("id").eq("azienda_id", azienda.id).eq("user_id", window.state.user.id).limit(1).maybeSingle();
    dipId = data?.id || null;
  }

  const oggi = dataLocale(new Date());
  let qPlan = supabase.from("produzioni_settimanali")
    .select("id, prodotto, lavorazione, stato, fascia, ora, ora_lavorazione, iniziata_da, dipendente_id, dipendenti:dipendente_id(nome)")
    .eq("azienda_id", azienda.id).eq("data", oggi).eq("sede_id", sede.id).limit(200);
  // chi non e' responsabile vede solo le sue lavorazioni
  if (!responsabile && dipId) qPlan = qPlan.eq("dipendente_id", dipId);

  const [{ data: plan }, { data: lotti }] = await Promise.all([
    qPlan,
    supabase.from("produzione_lotti").select("lotto_uuid, codice_lotto, ricetta_id, created_at")
      .eq("azienda_id", azienda.id).eq("stato", "aperta").eq("sede_uuid", sede.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const rid = [...new Set((lotti || []).map((l) => l.ricetta_id).filter(Boolean))];
  const { data: ric } = rid.length ? await supabase.from("ricette").select("id, nome").in("id", rid) : { data: [] };
  const nomeRic = new Map((ric || []).map((r) => [r.id, r.nome]));

  const ordF = { mattina: 1, pomeriggio: 2, sera: 3 };
  const righe = (plan || []).map((r) => ({
    titolo: String(r.prodotto || "Lavorazione").replace(/^🍽 Al servizio · /, "🍽 "),
    lav: String(r.lavorazione || "").split(" · ")[0].replace(/\s*\([^)]*\)\s*$/, ""),
    stato: r.stato,
    chi: r.iniziata_da || r.dipendenti?.nome || "",
    quando: (r.ora_lavorazione || r.ora) ? String(r.ora_lavorazione || r.ora).slice(0, 5) : ({ mattina: "mattina", pomeriggio: "pomeriggio", sera: "sera" }[r.fascia] || ""),
    f: (ordF[r.fascia] || 9) * 10000 + Number(String(r.ora || "99:99").replace(":", "").slice(0, 4)),
  }));
  const daFare = righe.filter((r) => r.stato !== "in_corso" && r.stato !== "completato").sort((a, b) => a.f - b.f);
  const inCorso = righe.filter((r) => r.stato === "in_corso");
  const fatte = righe.filter((r) => r.stato === "completato").length;
  const nLotti = (lotti || []).length;
  const nPlan = inCorso.length + daFare.length;

  // promemoria dell'incarico "menu del giorno di domani": va scritto la sera prima, entro l'ora indicata
  let cardMenu = "";
  try {
    const me = window.state?.user?.id;
    const { data: incs } = await supabase.from("incarichi").select("user_ids, giorni_servizio, ora_limite, sede_id")
      .eq("azienda_id", azienda.id).eq("codice", "menu_giorno").eq("attivo", true);
    const inc = (incs || []).find((x) => me && (x.user_ids || []).includes(me));
    if (inc) {
      const dom = new Date(); dom.setDate(dom.getDate() + 1);
      const domIso = dataLocale(dom);
      const w = dom.getDay() === 0 ? 7 : dom.getDay();
      if ((inc.giorni_servizio || []).includes(w)) {
        const { data: mg } = await supabase.from("menu_giorno").select("voci").eq("azienda_id", azienda.id).eq("sede_id", inc.sede_id).eq("data", domIso).limit(3);
        const fatto = (mg || []).some((m) => Array.isArray(m.voci) && m.voci.length > 0);
        const adesso = new Date();
        const hm = String(adesso.getHours()).padStart(2, "0") + ":" + String(adesso.getMinutes()).padStart(2, "0");
        const lim = String(inc.ora_limite || "22:00").slice(0, 5);
        if (!fatto && adesso.getHours() >= 15) {
          const tardi = hm >= lim;
          const qui = inc.sede_id === sede.id;
          cardMenu = `<div ${qui ? `onclick="window.location.hash='#/menu-giorno?data=${domIso}'"` : ""} style="${qui ? "cursor:pointer;" : ""}margin-bottom:12px;padding:12px 14px;border-radius:12px;font-size:15px;line-height:1.35;border:1px solid ${tardi ? "#fca5a5" : "#fdba74"};background:${tardi ? "#fef2f2" : "#fff7ed"};color:${tardi ? "#991b1b" : "#7c2d12"};">📝 <b>Menu di domani da scrivere</b><div style="font-size:13px;margin-top:2px;">${tardi ? "Era da fare entro le " : "Entro le "}${esc(lim)}${qui ? " · tocca per aprirlo" : " · passa alla sede del ristorante per scriverlo"}</div></div>`;
        }
      }
    }
  } catch (e) { /* senza promemoria la home funziona lo stesso */ }

  const vai = (rotta) => `onclick="window.location.hash='#/${rotta}'"`;
  const rigaPlan = (r, icona) => `<div class="pr-riga"><span>${icona}</span><div><b>${esc(r.titolo)}</b>${r.lav ? ` <span class="pr-lav">· ${esc(r.lav)}</span>` : ""}<div class="pr-sub">${esc([r.quando, r.chi].filter(Boolean).join(" · "))}</div></div></div>`;
  const pulsante = (icona, testo, rotta) => `<button class="pr-btn" ${vai(rotta)}><i>${icona}</i>${testo}</button>`;
  // riga che apre/chiude il pannello subito sotto
  const apri = `const p=this.nextElementSibling;const a=p.style.display==='none';p.style.display=a?'block':'none';this.querySelector('.chev').style.transform=a?'rotate(90deg)':'none'`;

  app.innerHTML = `
    <section class="view pr-home">
      <h2 style="margin:0 0 2px;">👨‍🍳 Cucina</h2>
      <div class="small-muted" style="margin-bottom:14px;">${esc(sede.nome || "")} · ${new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>

      ${nLotti ? `
      <div class="pr-barra pr-verde" onclick="${apri}">
        <span>🟢 ${nLotti} ${nLotti === 1 ? "lavorazione in corso" : "lavorazioni in corso"}</span><span class="chev">›</span>
      </div>
      <div class="pr-box pr-pannello" style="display:none;">
        ${(lotti || []).map((l) => `
          <div class="pr-riga pr-tap" onclick="window.location.hash='#/preparazioni?lotto=${esc(l.lotto_uuid)}'">
            <span>🧪</span><div><b>${esc(nomeRic.get(l.ricetta_id) || "Lavorazione")}</b>
            <div class="pr-sub">${esc(l.codice_lotto || "")}${l.created_at ? " · dalle " + ora(l.created_at) : ""}</div></div><span class="pr-vai">›</span>
          </div>`).join("")}
      </div>` : ""}

      ${cardMenu}
      <div class="pr-griglia" style="margin-bottom:14px;">
        <button class="pr-btn" onclick="import('./js/components/etichetta-veloce.js?v='+(window.APP_V||1)).then(m=>m.apriEtichettaVeloce())"><i>🏷</i>Etichetta veloce</button>
        ${pulsante("🏭", "Produzione", "produzione")}
        ${pulsante("🧪", "Preparazioni", "preparazioni")}
        ${pulsante("🍽️", "Menu del giorno", "menu-giorno")}
        ${pulsante("📖", "Ricette e menu", "ricettario")}
        ${pulsante("🌡️", "Cotture CBT", "cotture-cbt")}
        ${pulsante("📋", "Mansionario", "mansionario-cucina")}
        ${pulsante("🖥️", "Schermo Produzioni", "kds-produzioni")}
        ${responsabile ? pulsante("🔔", "Avvisi HACCP", "alert-haccp-config") : ""}
        ${responsabile ? pulsante("🗺️", "Layout", "layout-cucina") : ""}
      </div>

      <div class="pr-barra" onclick="${apri}">
        <span>📋 Planning di oggi · ${nPlan ? nPlan + " da fare" : "niente da fare"}${fatte ? " · " + fatte + " fatte" : ""}</span><span class="chev">›</span>
      </div>
      <div class="pr-box pr-pannello" style="display:none;">
        ${inCorso.map((r) => rigaPlan(r, "🟢")).join("")}
        ${daFare.map((r) => rigaPlan(r, "⏳")).join("")}
        ${nPlan ? "" : `<div class="pr-vuoto">Niente da fare in planning${responsabile ? "" : " per te"}.</div>`}
        <button class="pr-link" ${vai("planner-produzione")}>Apri il planning ›</button>
      </div>
    </section>
    <style>
      .pr-home .pr-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:12px;}
      .pr-home .pr-barra{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:10px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;}
      .pr-home .pr-barra.pr-verde{background:#dcfce7;border-color:#86efac;color:#14532d;font-weight:800;font-size:16px;}
      .pr-home .pr-barra .chev{font-size:20px;transition:transform .15s;}
      .pr-home .pr-riga{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #f1f5f9;font-size:15px;}
      .pr-home .pr-riga:first-of-type{border-top:0;}
      .pr-home .pr-tap{cursor:pointer;align-items:center;}
      .pr-home .pr-tap > div{flex:1;}
      .pr-home .pr-vai{color:#94a3b8;font-size:20px;}
      .pr-home .pr-sub{font-size:12.5px;color:#64748b;margin-top:1px;}
      .pr-home .pr-lav{color:#475569;font-weight:500;}
      .pr-home .pr-vuoto{font-size:14px;color:#94a3b8;padding:4px 0;}
      .pr-home .pr-link{margin-top:6px;border:0;background:none;color:#0E5A7A;font-weight:700;font-size:14px;padding:8px 0;}
      .pr-home .pr-griglia{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;}
      .pr-home .pr-btn{background:#0E5A7A;color:#fff;border:0;border-radius:14px;padding:16px 10px;font-size:15px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px;}
      .pr-home .pr-btn i{font-style:normal;font-size:24px;}
    </style>`;
}
