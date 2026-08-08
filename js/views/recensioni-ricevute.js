// js/views/recensioni-ricevute.js
// Le recensioni si potevano solo raccogliere, non leggere: la voce "Recensioni"
// apriva configurazione e QR. Qui si vedono, si rispondono, e si vede chi
// serviva quel tavolo.

const supa = () => window.supabaseClient || window.supabase;
let filtro = "tutte";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function quando(v) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function stelle(n) {
  const v = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h3>Nessuna azienda attiva</h3></section>';
    return;
  }

  container.innerHTML = `
    <section class="view" style="max-width:820px;margin:0 auto;">
      <h2 style="margin:0 0 4px;">⭐ Recensioni ricevute</h2>
      <p class="small-muted" style="margin:0 0 16px;">
        Rispondere conta: chi legge le recensioni guarda soprattutto come reagisce il locale.
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <button class="app-button small ${filtro === "tutte" ? "" : "gray"}" data-f="tutte">Tutte</button>
        <button class="app-button small ${filtro === "senza" ? "" : "gray"}" data-f="senza">Senza risposta</button>
        <button class="app-button small ${filtro === "basse" ? "" : "gray"}" data-f="basse">Critiche</button>
      </div>
      <div id="rr-lista"><div class="small-muted">Carico…</div></div>
    </section>`;

  container.querySelectorAll("[data-f]").forEach((b) => {
    b.onclick = () => { filtro = b.dataset.f; render(container); };
  });

  await carica(container, aziendaId);
}

async function carica(container, aziendaId) {
  const box = container.querySelector("#rr-lista");
  if (!box) return;

  let q = supa().from("recensioni")
    .select("id, voto, testo, created_at, risposta_titolare, verificata, visibile, dipendente_id, prenotazione_id")
    .eq("azienda_id", aziendaId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filtro === "senza") q = q.is("risposta_titolare", null);
  if (filtro === "basse") q = q.lte("voto", 3);

  const { data, error } = await q;
  if (error) { box.innerHTML = '<div style="color:#b91c1c;">Errore: ' + esc(error.message) + "</div>"; return; }
  const rec = data || [];

  if (!rec.length) {
    box.innerHTML = '<div class="small-muted">Nessuna recensione con questo filtro.</div>';
    return;
  }

  // chi ha servito: la recensione puo essere attribuita a una persona
  const ids = Array.from(new Set(rec.map((r) => r.dipendente_id).filter(Boolean)));
  const nomi = new Map();
  if (ids.length) {
    const { data: dip } = await supa().from("dipendenti").select("id, nome, cognome").in("id", ids);
    (dip || []).forEach((d) => nomi.set(String(d.id), d.nome + " " + (d.cognome || "")));
  }

  const media = rec.reduce((s, r) => s + (Number(r.voto) || 0), 0) / rec.length;
  const senza = rec.filter((r) => !r.risposta_titolare).length;

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:800;">${media.toFixed(1)}</div>
        <div class="small-muted" style="font-size:12px;">voto medio</div></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:800;">${rec.length}</div>
        <div class="small-muted" style="font-size:12px;">recensioni</div></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:${senza ? "#b45309" : "#166534"};">${senza}</div>
        <div class="small-muted" style="font-size:12px;">senza risposta</div></div>
    </div>
  ` + rec.map((r) => {
    const basso = Number(r.voto) <= 3;
    const chi = r.dipendente_id ? nomi.get(String(r.dipendente_id)) : null;
    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-left:5px solid ${basso ? "#dc2626" : "#16a34a"};
                  border-radius:14px;padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline;">
          <div style="font-size:18px;color:${basso ? "#dc2626" : "#16a34a"};letter-spacing:2px;">${stelle(r.voto)}</div>
          <div class="small-muted" style="font-size:13px;">
            ${quando(r.created_at)}${r.verificata ? " · verificata" : ""}
          </div>
        </div>
        ${r.testo ? `<p style="margin:8px 0 6px;font-size:15px;line-height:1.5;">${esc(r.testo)}</p>` : ""}
        ${chi ? `<div class="small-muted" style="font-size:13px;">Ha servito: <b>${esc(chi)}</b></div>` : ""}

        ${r.risposta_titolare
          ? `<div style="background:#f8fafc;border-left:3px solid #0E5A7A;border-radius:0 8px 8px 0;
                        padding:10px 12px;margin-top:10px;font-size:14px;">
               <div style="font-size:11px;font-weight:800;color:#0E5A7A;text-transform:uppercase;
                           letter-spacing:.06em;margin-bottom:4px;">La vostra risposta</div>
               ${esc(r.risposta_titolare)}
             </div>
             <button class="app-button small gray" data-mod="${r.id}" style="margin-top:8px;">Modifica risposta</button>`
          : `<div style="margin-top:10px;">
               <textarea id="rr-txt-${r.id}" rows="2" class="input-pill"
                 style="width:100%;resize:vertical;"
                 placeholder="${basso ? "Rispondete con calma: chi legge guarda come reagite" : "Un grazie fa più di quanto sembri"}"></textarea>
               <button class="app-button small" data-salva="${r.id}" style="margin-top:8px;">Pubblica risposta</button>
             </div>`}
      </div>`;
  }).join("");

  box.querySelectorAll("[data-salva]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.salva;
      const testo = (document.getElementById("rr-txt-" + id)?.value || "").trim();
      if (!testo) { alert("Scrivete la risposta prima di pubblicarla."); return; }
      b.disabled = true; b.textContent = "Salvo…";
      const { error } = await supa().from("recensioni")
        .update({ risposta_titolare: testo }).eq("id", id);
      if (error) {
        b.disabled = false; b.textContent = "Pubblica risposta";
        alert("Non è stata salvata: " + error.message);
        return;
      }
      await carica(container, window.state?.azienda?.id);
    };
  });

  box.querySelectorAll("[data-mod]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.mod;
      const attuale = rec.find((x) => String(x.id) === String(id))?.risposta_titolare || "";
      const nuovo = prompt("Risposta:", attuale);
      if (nuovo === null) return;
      const { error } = await supa().from("recensioni")
        .update({ risposta_titolare: nuovo.trim() || null }).eq("id", id);
      if (error) { alert("Non è stata salvata: " + error.message); return; }
      await carica(container, window.state?.azienda?.id);
    };
  });
}
