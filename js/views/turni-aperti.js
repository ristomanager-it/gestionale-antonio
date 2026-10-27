// js/views/turni-aperti.js
// Turni rimasti aperti: entrate senza uscita. Ci porta il pulsante "Sistemale ora" dell'email.
// Per ogni turno si scrive l'ora di uscita e il turno si chiude con la regola di sempre
// (pausa detratta oltre 4 e oltre 8 ore): resta scritto chi l'ha corretto e perche'.

const TZ = "Europe/Rome";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function quando(iso) {
  return new Date(iso).toLocaleString("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// "AAAA-MM-GGTHH:MM" in ora di Roma, per i campi data e ora
function perCampo(d) {
  return new Date(d).toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T").slice(0, 16);
}

// dal campo (ora di Roma) all'istante vero, qualunque sia il fuso del telefono
function daCampo(v) {
  const guess = new Date(v + ":00Z");
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(guess).forEach((x) => { p[x.type] = x.value; });
  const comeUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(guess.getTime() - (comeUtc - guess.getTime()));
}

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;

  // senza azienda scelta si va alla scelta, mai su una pagina vuota
  if (!azienda?.id) { window.location.hash = "#/sceltaAzienda"; return; }

  container.innerHTML = `
    <div class="view" style="max-width:640px;margin:0 auto;padding:18px 14px 40px;">
      <h2 style="margin:0 0 6px;">Turni senza uscita</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.5;">Finché restano aperti, quelle ore valgono zero. Scrivi a che ora è uscito e il turno si chiude.</p>
      <div id="ta-lista"><div style="color:#94a3b8;">Un attimo…</div></div>
    </div>`;
  const lista = container.querySelector("#ta-lista");

  const card = (t) => {
    const min = perCampo(t.inizio);
    const max = perCampo(new Date(new Date(t.inizio).getTime() + 23.9 * 3600e3));
    const campo = "width:100%;box-sizing:border-box;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px;font-family:inherit;";
    return `
      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:12px;background:#fff;">
        <div style="font-weight:800;font-size:16px;">${esc(t.dipendente)}</div>
        <div style="color:#64748b;font-size:13.5px;margin:2px 0 12px;">Entrato ${esc(quando(t.inizio))}${t.sede ? " · " + esc(t.sede) : ""}</div>
        <label style="font-size:13px;font-weight:700;">A che ora è uscito?</label>
        <input type="datetime-local" data-ora="${esc(t.id)}" min="${min}" max="${max}" style="${campo}">
        <label style="display:block;font-size:13px;font-weight:700;margin-top:10px;">Motivo</label>
        <input type="text" data-nota="${esc(t.id)}" value="Uscita dimenticata" style="${campo}">
        <button data-chiudi="${esc(t.id)}" style="width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:#023C59;color:#fff;font-weight:800;font-size:15px;font-family:inherit;">Chiudi turno</button>
        <div data-msg="${esc(t.id)}" style="margin-top:8px;font-size:13.5px;"></div>
      </div>`;
  };

  async function carica() {
    const { data, error } = await supabase.from("vw_turni_aperti")
      .select("id, dipendente_id, dipendente, sede, inizio")
      .eq("azienda_id", azienda.id).order("inizio", { ascending: true });
    if (error) {
      lista.innerHTML = `<div style="color:#b91c1c;">Non riesco a leggere i turni. <button id="ta-riprova" style="margin-left:8px;padding:8px 12px;border:0;border-radius:8px;background:#023C59;color:#fff;font-weight:700;">Riprova</button></div>`;
      lista.querySelector("#ta-riprova").onclick = carica;
      return;
    }
    if (!data || !data.length) {
      lista.innerHTML = `<div style="padding:18px;background:#f0fdf4;border-radius:12px;color:#166534;font-weight:600;">Nessun turno aperto: è tutto a posto.</div>`;
      return;
    }
    lista.innerHTML = data.map(card).join("");
    lista.querySelectorAll("[data-chiudi]").forEach((b) => { b.onclick = () => chiudi(b, data); });
  }

  async function chiudi(btn, data) {
    const id = btn.dataset.chiudi;
    const t = data.find((x) => String(x.id) === String(id));
    const q = (s) => lista.querySelector(`[${s}="${id}"]`);
    const msg = q("data-msg");
    const dire = (testo, ok) => { msg.style.color = ok ? "#166534" : "#b91c1c"; msg.textContent = testo; };
    const ora = q("data-ora").value;
    const nota = q("data-nota").value.trim() || "Uscita dimenticata";
    if (!t) return;
    if (!ora) return dire("Scrivi a che ora è uscito.", false);
    const uscita = daCampo(ora);
    const entrata = new Date(t.inizio);
    if (uscita <= entrata) return dire("L'uscita deve essere dopo l'entrata.", false);
    if (uscita - entrata >= 24 * 3600e3) return dire("L'uscita deve essere entro 24 ore dall'entrata.", false);
    if (uscita > new Date()) return dire("L'uscita non può essere nel futuro.", false);

    btn.disabled = true; btn.style.opacity = ".6";
    const { data: r, error } = await supabase.rpc("timbratura_manuale", {
      p_dipendente: t.dipendente_id, p_tipo: "fine_turno", p_quando: uscita.toISOString(), p_nota: nota,
    });
    if (error || !r || !r.ok) {
      btn.disabled = false; btn.style.opacity = "1";
      return dire((r && r.errore) || (error && error.message) || "Non sono riuscito a chiudere il turno.", false);
    }
    dire("Chiuso: " + Number(r.ore).toFixed(2).replace(".", ",") + " ore.", true);
    setTimeout(carica, 1200);
  }

  await carica();
}
