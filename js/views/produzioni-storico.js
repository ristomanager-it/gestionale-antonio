// js/views/produzioni-storico.js
// Elenco di TUTTE le produzioni, aperte e chiuse.
// Prima esisteva solo il monitor delle produzioni aperte: un lotto chiuso non
// era piu raggiungibile da nessuna parte, quindi non si potevano ristampare ne
// le etichette ne il registro HACCP. Ma il registro lo chiedono dopo, magari
// settimane dopo, durante un controllo.

const supa = () => window.supabaseClient || window.supabase;

let filtri = { ricerca: "", stato: "", da: "", a: "" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function dataIT(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString("it-IT");
}

function euro(n) {
  const v = Number(n);
  if (!isFinite(v) || v === 0) return "—";
  return v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h3>Nessuna azienda attiva</h3></section>';
    return;
  }

  // di base gli ultimi tre mesi: quasi sempre e quello che serve
  if (!filtri.da) {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    filtri.da = d.toISOString().slice(0, 10);
  }

  container.innerHTML = `
    <section class="view" style="max-width:960px;margin:0 auto;">
      <div style="margin-bottom:12px;">
        <button class="app-button small gray" onclick="window.location.hash='#/produzione'">← Centro Produzione</button>
      </div>

      <h2 style="margin:0 0 4px;">📚 Storico produzioni</h2>
      <p class="small-muted" style="margin:0 0 16px;">
        Tutti i lotti, anche quelli chiusi. Da qui si riaprono per ristampare etichette e registro HACCP.
      </p>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <input id="ps-cerca" class="input-pill" placeholder="Ricetta o codice lotto" style="flex:1;min-width:180px;" value="${esc(filtri.ricerca)}">
        <select id="ps-stato" class="input-pill" style="min-width:130px;">
          <option value="">Tutti gli stati</option>
          <option value="aperta">Aperte</option>
          <option value="firmato">Firmate</option>
          <option value="chiuso">Chiuse</option>
        </select>
        <input id="ps-da" type="date" class="input-pill" value="${esc(filtri.da)}">
        <input id="ps-a" type="date" class="input-pill" value="${esc(filtri.a)}">
      </div>

      <div id="ps-lista"><div class="small-muted">Carico…</div></div>
    </section>
  `;

  const el = (id) => container.querySelector(id);
  el("#ps-stato").value = filtri.stato;

  const aggiorna = () => {
    filtri.ricerca = el("#ps-cerca").value.trim();
    filtri.stato = el("#ps-stato").value;
    filtri.da = el("#ps-da").value;
    filtri.a = el("#ps-a").value;
    carica(container, aziendaId);
  };

  el("#ps-cerca").addEventListener("input", () => {
    clearTimeout(window.__psT);
    window.__psT = setTimeout(aggiorna, 300);
  });
  ["#ps-stato", "#ps-da", "#ps-a"].forEach((id) => el(id).addEventListener("change", aggiorna));

  await carica(container, aziendaId);
}

async function carica(container, aziendaId) {
  const box = container.querySelector("#ps-lista");
  if (!box) return;
  box.innerHTML = '<div class="small-muted">Carico…</div>';

  let q = supa().from("produzione_lotti")
    .select("id, lotto_uuid, codice_lotto, ricetta_id, data_produzione, data_scadenza, quantita_output, unita_misura, stato, costo_totale_lotto, costo_unitario_output, note, ricette(nome), dipendenti!produzione_lotti_operatore_id_fkey(nome, cognome)")
    .eq("azienda_id", aziendaId)
    .order("data_produzione", { ascending: false })
    .limit(300);

  if (filtri.stato) q = q.eq("stato", filtri.stato);
  if (filtri.da) q = q.gte("data_produzione", filtri.da);
  if (filtri.a) q = q.lte("data_produzione", filtri.a);

  const { data, error } = await q;
  if (error) {
    box.innerHTML = '<div style="color:#b91c1c;">Errore: ' + esc(error.message) + "</div>";
    return;
  }

  let lotti = data || [];

  // la ricerca la faccio qui: deve pescare sia nel codice lotto sia nel nome ricetta
  if (filtri.ricerca) {
    const t = filtri.ricerca.toLowerCase();
    lotti = lotti.filter((l) =>
      String(l.codice_lotto || "").toLowerCase().includes(t) ||
      String(l.ricette?.nome || "").toLowerCase().includes(t));
  }

  if (!lotti.length) {
    box.innerHTML = '<div class="small-muted">Nessuna produzione nel periodo scelto.</div>';
    return;
  }

  // firme: quante fasi sono state firmate davvero su ogni lotto
  const uuids = lotti.map((l) => l.lotto_uuid).filter(Boolean);
  const conta = {};
  if (uuids.length) {
    const { data: fasi } = await supa().from("produzione_log_haccp")
      .select("lotto_id, firmato_da").in("lotto_id", uuids).limit(5000);
    (fasi || []).forEach((f) => {
      const c = conta[f.lotto_id] = conta[f.lotto_id] || { tot: 0, firmate: 0 };
      c.tot++;
      if (f.firmato_da) c.firmate++;
    });
  }

  const oggi = new Date().toISOString().slice(0, 10);

  box.innerHTML = lotti.map((l) => {
    const c = conta[l.lotto_uuid] || { tot: 0, firmate: 0 };
    const completo = c.tot > 0 && c.firmate === c.tot;
    const scaduto = l.data_scadenza && l.data_scadenza < oggi;
    const aperta = l.stato === "aperta";

    const bordo = aperta ? "#dc2626" : (completo ? "#16a34a" : "#f59e0b");
    const badge = aperta
      ? '<span style="background:#fee2e2;color:#b91c1c;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;">aperta</span>'
      : '<span style="background:#dcfce7;color:#166534;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;">' + esc(l.stato) + "</span>";

    const firmeTxt = c.tot
      ? (completo
          ? '<span style="color:#166534;font-weight:700;">Registro completo · ' + c.firmate + "/" + c.tot + " fasi</span>"
          : '<span style="color:#b45309;font-weight:700;">Registro incompleto · ' + c.firmate + "/" + c.tot + " fasi</span>")
      : '<span style="color:#94a3b8;">Nessuna fase registrata</span>';

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-left:5px solid ${bordo};border-radius:12px;padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
          <div>
            <div style="font-weight:800;font-size:16px;">${esc(l.ricette?.nome || "Ricetta")} ${badge}</div>
            <div class="small-muted" style="margin-top:2px;">
              Lotto <b>${esc(l.codice_lotto || "—")}</b> ·
              ${dataIT(l.data_produzione)} ·
              ${Number(l.quantita_output) || 0} ${esc(l.unita_misura || "")}
              ${l.dipendenti?.nome ? " · " + esc(l.dipendenti.nome) : ""}
            </div>
            <div class="small-muted" style="margin-top:2px;">
              Scadenza ${dataIT(l.data_scadenza)}${scaduto ? ' <span style="color:#b91c1c;font-weight:700;">scaduto</span>' : ""}
              ${l.costo_unitario_output ? " · " + euro(l.costo_unitario_output) + "/" + esc(l.unita_misura || "") : ""}
              ${l.costo_totale_lotto ? " · totale " + euro(l.costo_totale_lotto) : ""}
            </div>
            <div style="margin-top:6px;font-size:13px;">${firmeTxt}</div>
          </div>
          <button class="app-button small" data-apri="${esc(l.lotto_uuid)}">Apri</button>
        </div>
      </div>`;
  }).join("");

  box.querySelectorAll("[data-apri]").forEach((b) => {
    b.onclick = () => { window.location.hash = "#/preparazioni?lotto=" + b.dataset.apri; };
  });
}
