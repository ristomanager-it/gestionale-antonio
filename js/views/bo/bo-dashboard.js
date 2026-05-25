export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;

  if (!supabase || typeof supabase.from !== "function") {
    container.innerHTML = "<p>Errore: Supabase non inizializzato</p>";
    return;
  }

  const ruolo = window.state?.ruolo;
  const azienda_id = window.state?.azienda?.id;
  const sede_id = window.state?.sedeAttiva?.id || window.state?.utenteAzienda?.sede_id || null;
  const ruoloNorm = window.normalizeRuolo ? window.normalizeRuolo(ruolo) : ruolo;

  if (!["admin", "manager", "operatore", "superadmin"].includes(ruoloNorm)) {
    container.innerHTML = `
      <section class="view">
        <h2>Accesso negato</h2>
        <p>Non hai i permessi per accedere al Back Office.</p>
      </section>
    `;
    return;
  }

  const money = (v) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(v || 0));

  const today = new Date().toISOString().slice(0, 10);
  const startOfWeek = (() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0, 10);
  })();
  const startOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const startOfYear = `${new Date().getFullYear()}-01-01`;

  let contattiCount = 0;
  let tagCount = 0;
  let templateCount = 0;
  let bookingCount = 0;

  const lavoro = {
    oggi: 0,
    settimana: 0,
    mese: 0,
    anno: 0,
    oreOggi: 0,
    oreSettimana: 0,
    dipendentiOggi: 0
  };

  async function countTable(table) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("azienda_id", azienda_id);

    return count || 0;
  }

  async function loadCostoLavoro(from, to) {
    let q = supabase
      .from("timbrature_costi_giornalieri")
      .select("dipendente_id, ore_lavorate, costo_totale, data")
      .eq("azienda_id", azienda_id)
      .gte("data", from)
      .lte("data", to);

    if (sede_id) q = q.eq("sede_id", sede_id);

    const { data, error } = await q;
    if (error) {
      console.warn("Costo lavoro non caricato:", error);
      return { costo: 0, ore: 0, dipendenti: 0 };
    }

    const dip = new Set();
    let costo = 0;
    let ore = 0;

    for (const row of data || []) {
      if (row.dipendente_id) dip.add(row.dipendente_id);
      costo += Number(row.costo_totale || 0);
      ore += Number(row.ore_lavorate || 0);
    }

    return {
      costo,
      ore,
      dipendenti: dip.size
    };
  }

  try {
    [contattiCount, tagCount, templateCount, bookingCount] = await Promise.all([
      countTable("contatti"),
      countTable("clienti_tag"),
      countTable("messaggi_template"),
      countTable("booking_forms")
    ]);

    const [oggi, settimana, mese, anno] = await Promise.all([
      loadCostoLavoro(today, today),
      loadCostoLavoro(startOfWeek, today),
      loadCostoLavoro(startOfMonth, today),
      loadCostoLavoro(startOfYear, today)
    ]);

    lavoro.oggi = oggi.costo;
    lavoro.settimana = settimana.costo;
    lavoro.mese = mese.costo;
    lavoro.anno = anno.costo;
    lavoro.oreOggi = oggi.ore;
    lavoro.oreSettimana = settimana.ore;
    lavoro.dipendentiOggi = oggi.dipendenti;
  } catch (err) {
    console.error("Errore caricamento dashboard BO", err);
  }

  container.innerHTML = `
    <div class="bo-dashboard-layout">

      <aside class="bo-sidebar">
        <div class="bo-sidebar-title">BACK OFFICE</div>

        <div class="bo-menu-item" data-route="bo-dashboard">🏠 Dashboard</div>

        <div class="bo-section-label">MARKETING</div>
        <div class="bo-menu-item" data-route="bo-tag">🏷️ Tag</div>
        <div class="bo-menu-item" data-route="bo-template">✉️ Template</div>
        <div class="bo-menu-item" data-route="bo-marketing">📢 Campagne</div>

        <div class="bo-section-label">MENU</div>
        <div class="bo-menu-item" data-route="bo-menu">🍽️ Builder Menù</div>
        <div class="bo-menu-item" data-route="bo-categorie">📂 Categorie</div>
        <div class="bo-menu-item" data-route="bo-prodotti">🍔 Prodotti</div>
        <div class="bo-menu-item" data-route="ricette-semplici">🥗 Ricette semplici</div>

        <div class="bo-section-label">PRODUZIONE</div>
        <div class="bo-menu-item" data-route="bo-magazzino">📦 Magazzino</div>
        <div class="bo-menu-item" data-route="bo-produzione">🏭 Produzione</div>
        <div class="bo-menu-item" data-route="bo-comande">🧾 Comande</div>
        <div class="bo-menu-item" data-route="bo-ricette">📖 Ricette avanzate</div>

        <div class="bo-section-label">PERSONALE</div>
        <div class="bo-menu-item" data-route="timbrature">⏱️ Timbrature</div>
        <div class="bo-menu-item" data-route="dipendenti">👥 Dipendenti</div>
      </aside>

      <div id="bo-content" class="bo-content">

        <div class="card">
          <h2>Back Office Dashboard</h2>
          <p>Panoramica azienda${sede_id ? " filtrata sulla sede attiva" : ""}</p>
        </div>

        <div class="bo-kpi-grid">
          <div class="card">
            <h3>👥 Contatti</h3>
            <p class="bo-kpi-number">${contattiCount}</p>
          </div>

          <div class="card">
            <h3>🏷️ Tag</h3>
            <p class="bo-kpi-number">${tagCount}</p>
          </div>

          <div class="card">
            <h3>✉️ Template</h3>
            <p class="bo-kpi-number">${templateCount}</p>
          </div>

          <div class="card">
            <h3>📅 Booking</h3>
            <p class="bo-kpi-number">${bookingCount}</p>
          </div>
        </div>

        <div class="card">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
            <div>
              <h3>💶 Costo lavoro</h3>
              <p style="margin:4px 0 0; opacity:.75;">Dati da timbrature_costi_giornalieri</p>
            </div>
            <button class="app-button small" data-route="timbrature" type="button">Apri timbrature</button>
          </div>

          <div class="bo-kpi-grid" style="margin-top:12px;">
            <div class="bo-mini-kpi">
              <span>Oggi</span>
              <strong>${money(lavoro.oggi)}</strong>
              <small>${Number(lavoro.oreOggi || 0).toFixed(2)} ore • ${lavoro.dipendentiOggi} dip.</small>
            </div>
            <div class="bo-mini-kpi">
              <span>Settimana</span>
              <strong>${money(lavoro.settimana)}</strong>
              <small>${Number(lavoro.oreSettimana || 0).toFixed(2)} ore</small>
            </div>
            <div class="bo-mini-kpi">
              <span>Mese</span>
              <strong>${money(lavoro.mese)}</strong>
              <small>Dal ${startOfMonth}</small>
            </div>
            <div class="bo-mini-kpi">
              <span>Anno</span>
              <strong>${money(lavoro.anno)}</strong>
              <small>Dal ${startOfYear}</small>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  const items = container.querySelectorAll(".bo-menu-item, [data-route]");

  items.forEach((el) => {
    el.onclick = () => {
      const route = el.getAttribute("data-route");
      if (route) window.location.hash = "#/" + route;
    };
  });
}
