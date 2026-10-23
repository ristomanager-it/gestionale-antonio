// js/views/produzione.js
// Home della sezione Produzione: cosa succede adesso e i pulsanti grandi che servono.
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
    .select("id, prodotto, lavorazione, stato, fascia, ora, iniziata_da, dipendente_id, dipendenti:dipendente_id(nome)")
    .eq("azienda_id", azienda.id).eq("data", oggi).eq("sede_id", sede.id).limit(200);
  // chi non e' responsabile vede solo le sue lavorazioni
  if (!responsabile && dipId) qPlan = qPlan.eq("dipendente_id", dipId);

  const [{ data: plan }, { data: lotti }] = await Promise.all([
    qPlan,
    supabase.from("produzione_lotti").select("lotto_uuid, codice_lotto, ricetta_id, created_at")
      .eq("azienda_id", azienda.id).eq("stato", "aperta").eq("sede_uuid", sede.id).order("created_at", { ascending: false }).limit(8),
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
    quando: r.ora ? String(r.ora).slice(0, 5) : ({ mattina: "mattina", pomeriggio: "pomeriggio", sera: "sera" }[r.fascia] || ""),
    f: (ordF[r.fascia] || 9) * 10000 + Number(String(r.ora || "99:99").replace(":", "").slice(0, 4)),
  }));
  const daFare = righe.filter((r) => r.stato !== "in_corso" && r.stato !== "completato").sort((a, b) => a.f - b.f);
  const inCorso = righe.filter((r) => r.stato === "in_corso");
  const fatte = righe.filter((r) => r.stato === "completato").length;

  const vai = (rotta) => `onclick="window.location.hash='#/${rotta}'"`;
  const rigaPlan = (r, icona) => `<div class="pr-riga"><span>${icona}</span><div><b>${esc(r.titolo)}</b>${r.lav ? ` <span class="pr-lav">· ${esc(r.lav)}</span>` : ""}<div class="pr-sub">${esc([r.quando, r.chi].filter(Boolean).join(" · "))}</div></div></div>`;
  const pulsante = (icona, testo, rotta) => `<button class="pr-btn" ${vai(rotta)}><i>${icona}</i>${testo}</button>`;

  app.innerHTML = `
    <section class="view pr-home">
      <h2 style="margin:0 0 2px;">🏭 Produzione</h2>
      <div class="small-muted" style="margin-bottom:14px;">${esc(sede.nome || "")} · ${new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>

      <div class="pr-box">
        <div class="pr-tit">🟢 In corso adesso</div>
        ${(lotti || []).length ? (lotti || []).map((l) => `
          <div class="pr-riga pr-tap" onclick="window.location.hash='#/preparazioni?lotto=${esc(l.lotto_uuid)}'">
            <span>🧪</span><div><b>${esc(nomeRic.get(l.ricetta_id) || "Lavorazione")}</b>
            <div class="pr-sub">${esc(l.codice_lotto || "")}${l.created_at ? " · dalle " + ora(l.created_at) : ""}</div></div><span class="pr-vai">›</span>
          </div>`).join("") : `<div class="pr-vuoto">Nessuna lavorazione aperta.</div>`}
      </div>

      <div class="pr-box">
        <div class="pr-tit">📋 Planning di oggi ${fatte ? `<small>· ${fatte} fatte</small>` : ""}</div>
        ${inCorso.map((r) => rigaPlan(r, "🟢")).join("")}
        ${daFare.length ? daFare.slice(0, 8).map((r) => rigaPlan(r, "⏳")).join("") : (inCorso.length ? "" : `<div class="pr-vuoto">Niente da fare in planning${responsabile ? "" : " per te"}.</div>`)}
        ${daFare.length > 8 ? `<div class="pr-vuoto">…e altre ${daFare.length - 8}</div>` : ""}
        <button class="pr-link" ${vai("planner-produzione")}>Apri il planning ›</button>
      </div>

      <div class="pr-griglia">
        ${pulsante("🧪", "Preparazioni", "preparazioni")}
        ${pulsante("📋", "Planning", "planner-produzione")}
        ${pulsante("🟢", "Produzioni aperte", "produzioni-aperte")}
        ${pulsante("📷", "Lotti in arrivo", "lotti-fornitore")}
        ${pulsante("📒", "Registro lotti", "registro-lotti")}
        ${pulsante("⏰", "Scadenze", "scadenze")}
        ${responsabile ? pulsante("📊", "Produttività", "produttivita-produzione") : ""}
        ${responsabile ? pulsante("📅", "Giorni di lavorazione", "giorni-lavorazione") : ""}
      </div>
    </section>
    <style>
      .pr-home .pr-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:12px;}
      .pr-home .pr-tit{font-weight:800;font-size:15px;margin-bottom:8px;}
      .pr-home .pr-tit small{font-weight:600;color:#64748b;}
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
