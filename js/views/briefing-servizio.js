// js/views/briefing-servizio.js
// Il foglio che si legge in piedi cinque minuti prima di cominciare.
// Le intolleranze stanno in cima, prima di tutto: sono la cosa che manda a
// monte un evento. I valori sono quelli dell'azienda, presi da comandamenti.

const supa = () => window.supabaseClient || window.supabase;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function dataLunga(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function ora(v) { return v ? String(v).slice(0, 5) : ""; }

// Le intolleranze arrivano come frase libera: le spezzo per mostrarle una per
// riga, perche un elenco fitto in fondo a un foglio non lo legge nessuno.
function pezziIntolleranze(testo) {
  if (!testo) return [];
  return String(testo).split(/[,;]|\se\s/).map((x) => x.trim()).filter(Boolean);
}

export async function render(container) {
  const params = new URLSearchParams((location.hash.split("?")[1] || ""));
  const servizioId = params.get("s");
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h3>Nessuna azienda attiva</h3></section>';
    return;
  }

  container.innerHTML = '<section class="view"><div class="small-muted">Preparo il briefing…</div></section>';

  // senza un servizio indicato mostro quelli in arrivo, cosi si sceglie
  if (!servizioId) return elenco(container, aziendaId);

  const { data, error } = await supa().rpc("briefing_servizio", { p_servizio: servizioId });
  if (error || !data?.ok) {
    container.innerHTML = '<section class="view"><h3>Briefing non disponibile</h3>' +
      '<p class="small-muted">' + esc(error?.message || data?.errore || "") + "</p></section>";
    return;
  }

  const b = data;
  const into = pezziIntolleranze(b.intolleranze);
  const squadra = b.squadra || [];
  const piatti = b.piatti || [];
  const lavorazioni = b.lavorazioni || [];
  const valori = (b.valori || []).slice(0, 4);

  container.innerHTML = `
    <section class="view" style="max-width:820px;margin:0 auto;">
      <div style="display:flex;gap:8px;margin-bottom:12px;" class="no-print">
        <button class="app-button small gray" onclick="history.back()">← Indietro</button>
        <button class="app-button small" onclick="window.print()">🖨️ Stampa</button>
      </div>

      <div style="background:#0E5A7A;color:#fff;border-radius:16px;padding:20px 22px;margin-bottom:14px;">
        <h1 style="margin:0 0 4px;font-size:22px;">${esc(b.titolo)}</h1>
        <div style="opacity:.92;font-size:14.5px;">
          ${esc(dataLunga(b.data))} · ${b.coperti || 0} coperti${b.bambini ? " di cui " + b.bambini + " bambini" : ""}${b.location ? " · " + esc(b.location) : ""}
        </div>
        ${b.ora_inizio ? `<div style="opacity:.85;font-size:13.5px;margin-top:3px;">
          Servizio dalle ${ora(b.ora_inizio)}${b.ora_fine ? " alle " + ora(b.ora_fine) : ""}</div>` : ""}
      </div>

      ${b.obiettivo ? `
      <div style="background:linear-gradient(135deg,#0E5A7A,#14758f);color:#fff;border-radius:16px;
                  padding:18px 22px;margin-bottom:14px;">
        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;font-weight:700;">
          L'obiettivo di oggi</div>
        <div style="font-size:19px;font-weight:800;line-height:1.35;margin-top:6px;">${esc(b.obiettivo)}</div>
      </div>` : ""}

      ${into.length ? `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <h2 style="font-size:16px;margin:0 0 12px;">⚠️ Intolleranze e allergie — da leggere prima di tutto</h2>
        ${into.map((x) => `
          <div style="border-left:4px solid #dc2626;background:#fef2f2;border-radius:0 10px 10px 0;
                      padding:10px 13px;margin-bottom:8px;font-size:14.5px;font-weight:700;color:#b91c1c;">
            ${esc(x)}
          </div>`).join("")}
        <div style="font-size:13.5px;color:#64748b;margin-top:8px;">
          I piatti speciali escono <b>prima</b> degli altri e si consegnano <b>a mano</b> alla persona,
          non si lasciano sul tavolo.
        </div>
      </div>` : ""}

      ${squadra.length ? `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <h2 style="font-size:16px;margin:0 0 10px;">Squadra</h2>
        ${squadra.map((p) => `
          <div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #f1f5f9;">
            <span style="background:#0E5A7A;color:#fff;padding:2px 10px;border-radius:999px;
                         font-size:12px;font-weight:700;">${esc(p.ruolo)}</span>
            <b>${esc(p.nome)}</b>
            <span style="margin-left:auto;font-size:12.5px;color:#64748b;">${esc(p.reparto || "")}</span>
          </div>`).join("")}
      </div>` : ""}

      ${piatti.length ? `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <h2 style="font-size:16px;margin:0 0 10px;">Cosa esce dalla cucina</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${piatti.map((p) => `
            <tr><td style="padding:7px 0;border-top:1px solid #f1f5f9;">${esc(p.nome)}
              <span style="color:#94a3b8;font-size:12.5px;">${esc(p.sezione || "")}</span></td>
              <td style="padding:7px 0;border-top:1px solid #f1f5f9;text-align:right;font-weight:700;">
                ${Math.round(Number(p.quantita) || 0)}</td></tr>`).join("")}
        </table>
      </div>` : ""}

      ${lavorazioni.length ? `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <h2 style="font-size:16px;margin:0 0 10px;">Lavorazioni preparate</h2>
        ${lavorazioni.map((l) => `
          <div style="display:flex;gap:10px;padding:8px 0;border-top:1px solid #f1f5f9;font-size:14px;align-items:baseline;">
            <span style="font-weight:700;color:#0E5A7A;min-width:52px;">
              ${new Date(l.data + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</span>
            <span>${esc(l.piatto)}</span>
            <span style="margin-left:auto;font-size:12.5px;color:#64748b;">
              ${Math.round(Number(l.porzioni) || 0)} porz · ${esc(l.lotto)}</span>
          </div>`).join("")}
      </div>` : ""}

      ${valori.length ? `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <h2 style="font-size:16px;margin:0 0 10px;">Come stiamo insieme</h2>
        ${valori.map((v) => `
          <div style="padding:8px 0;border-top:1px solid #f1f5f9;font-size:14.5px;color:#334155;">
            <span style="color:#0E5A7A;font-weight:800;">— </span>${esc(v)}
          </div>`).join("")}
      </div>` : ""}

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:14px;">
        <div style="display:flex;gap:30px;margin-top:30px;">
          <div style="flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:12px;color:#64748b;">
            Firma responsabile di sala</div>
          <div style="flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:12px;color:#64748b;">
            Firma chef</div>
        </div>
      </div>

      <div class="no-print" style="text-align:center;margin-bottom:20px;">
        <button class="app-button" id="br-letto">✓ Briefing fatto con la squadra</button>
      </div>

      <style>@media print { .no-print { display:none !important; } }</style>
    </section>`;

  const btn = container.querySelector("#br-letto");
  if (btn) btn.onclick = async () => {
    btn.disabled = true;
    const { error: e2 } = await supa().from("servizi")
      .update({ briefing_letto_il: new Date().toISOString() }).eq("id", servizioId);
    btn.textContent = e2 ? "Non salvato: " + e2.message : "✓ Segnato";
  };
}

async function elenco(container, aziendaId) {
  const oggi = new Date().toISOString().slice(0, 10);
  const { data } = await supa().from("servizi")
    .select("id, data_servizio, tipo_servizio, coperti_previsti, note, briefing_letto_il")
    .eq("azienda_id", aziendaId).gte("data_servizio", oggi)
    .order("data_servizio").limit(30);

  const servizi = data || [];
  container.innerHTML = `
    <section class="view" style="max-width:820px;margin:0 auto;">
      <h2 style="margin:0 0 4px;">📋 Briefing di servizio</h2>
      <p class="small-muted" style="margin:0 0 16px;">Scegli il servizio da preparare.</p>
      ${servizi.length ? servizi.map((s) => `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin-bottom:10px;
                    display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="min-width:0;">
            <div style="font-weight:800;">${new Date(s.data_servizio + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>
            <div class="small-muted">${s.coperti_previsti || 0} coperti · ${esc(s.tipo_servizio || "")}
              ${s.briefing_letto_il ? " · briefing già fatto" : ""}</div>
          </div>
          <button class="app-button small" data-apri="${s.id}">Apri briefing</button>
        </div>`).join("")
        : '<div class="small-muted">Nessun servizio in programma.</div>'}
    </section>`;

  container.querySelectorAll("[data-apri]").forEach((b) => {
    b.onclick = () => { location.hash = "#/briefing-servizio?s=" + b.dataset.apri; render(container); };
  });
}
