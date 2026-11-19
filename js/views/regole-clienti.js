import { supabase } from "../supabaseClient.js";

/* Regole dei clienti (solo superadmin).
   Le regole che i locali hanno scritto o cambiato per sé, in ordine di quanto servono
   (👍 nella barra Cerca e volte che sono uscite). Quelle buone si portano a tutti:
   - "Rendi globale": nasce una regola nuova valida per tutti i locali;
   - "Unisci all'originale": se il locale aveva cambiato una regola globale o una scheda
     di formazione, il suo testo diventa la nuova versione per tutti;
   - "Lascia locale": resta solo del cliente e non si ripropone.
   Il locale che l'ha scritta tiene la sua. Niente passa a tutti senza la rilettura. */

export async function render(container) {
  container.innerHTML =
    '<div style="max-width:780px;margin:22px auto;padding:0 16px;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Regole dei clienti</h1>'
    + '<div style="font-size:13.5px;color:#475569;margin-bottom:18px;">Le regole scritte dai locali, in ordine di quanto servono. Quelle buone le porti a tutti: prima rileggi e togli nomi e riferimenti al locale.</div>'
    + '<div id="rc-corpo"><div style="font-size:13px;color:#64748b;">Un momento&hellip;</div></div>'
    + '</div>';
  await ricarica(container);
}

async function ricarica(container) {
  const corpo = container.querySelector("#rc-corpo");
  const [regole, aziende, schede] = await Promise.all([
    supabase.from("tony_sapere")
      .select("id, azienda_id, ambito, vale_per, titolo, contenuto, priorita, attivo, sostituisce_id, sostituisce_kb, usi, utile, promossa_id, promossa_il")
      .order("utile", { ascending: false }).order("usi", { ascending: false }).order("id"),
    supabase.from("aziende").select("id, nome"),
    supabase.from("tony_knowledge_base").select("id, titolo, contenuto, fonte"),
  ]);
  if (regole.error) {
    corpo.innerHTML = box("Non sono riuscito a leggere le regole: " + regole.error.message);
    return;
  }
  const tutte = regole.data || [];
  const nomeAz = (id) => ((aziende.data || []).find((a) => a.id === id) || {}).nome || "Locale";
  const globali = tutte.filter((r) => !r.azienda_id);
  const kb = schede.data || [];
  const dei = tutte.filter((r) => r.azienda_id && r.attivo);
  const daVedere = dei.filter((r) => !r.promossa_il);
  const viste = dei.filter((r) => r.promossa_il);

  const originale = (r) => r.sostituisce_id ? globali.find((g) => g.id === r.sostituisce_id)
    : r.sostituisce_kb ? kb.find((k) => k.id === r.sostituisce_kb) : null;

  const card = (r, gia) => {
    const o = originale(r);
    return '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:14px;padding:13px;margin-bottom:10px;" data-card="' + r.id + '">'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;">'
      + tag(nomeAz(r.azienda_id), "#e0f2fe", "#075985")
      + (o ? tag((r.sostituisce_kb ? "Cambia la scheda: " : "Cambia la regola: ") + o.titolo, "#fef3c7", "#92400e") : "")
      + (gia ? tag(r.promossa_id ? "Portata a tutti" : "Lasciata locale", "#f1f5f9", "#475569") : "")
      + '</div>'
      + '<div style="font-size:15px;font-weight:800;margin-top:6px;">' + esc(r.titolo) + '</div>'
      + '<div style="font-size:13px;color:#475569;white-space:pre-wrap;margin-top:6px;">' + esc(r.contenuto) + '</div>'
      + (o ? '<div style="font-size:12.5px;color:#94a3b8;text-decoration:line-through;white-space:pre-wrap;margin-top:6px;">Originale: ' + esc(String(o.contenuto || "").slice(0, 260)) + '</div>' : "")
      + '<div style="display:flex;gap:14px;font-size:12.5px;color:#334155;margin-top:8px;">'
      + '<span><b style="font-size:16px;">' + (r.usi || 0) + '</b> volte usata</span>'
      + '<span><b style="font-size:16px;">' + (r.utile || 0) + '</b> 👍</span></div>'
      + (gia ? "" : '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">'
        + '<button class="app-button small primary" data-glob="' + r.id + '">Rendi globale</button>'
        + (o ? '<button class="app-button small gray" data-unisci="' + r.id + '">Unisci all\'originale</button>' : "")
        + '<button class="app-button small gray" data-lascia="' + r.id + '">Lascia locale</button>'
        + '</div>')
      + '<div data-editor="' + r.id + '"></div>'
      + '</div>';
  };

  let html = "";
  if (!daVedere.length) html += box("Nessuna regola nuova dei clienti da valutare.");
  daVedere.forEach((r) => { html += card(r, false); });
  if (viste.length) {
    html += '<details style="margin-top:16px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:#334155;">Già valutate (' + viste.length + ')</summary><div style="margin-top:10px;">';
    viste.forEach((r) => { html += card(r, true); });
    html += '</div></details>';
  }
  corpo.innerHTML = html;

  const trova = (id) => dei.find((r) => String(r.id) === String(id));
  corpo.querySelectorAll("[data-glob]").forEach((b) => (b.onclick = () => editor(container, trova(b.dataset.glob), "globale", originale)));
  corpo.querySelectorAll("[data-unisci]").forEach((b) => (b.onclick = () => editor(container, trova(b.dataset.unisci), "unisci", originale)));
  corpo.querySelectorAll("[data-lascia]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    const { error } = await supabase.from("tony_sapere").update({ promossa_il: new Date().toISOString() }).eq("id", b.dataset.lascia);
    if (error) { b.disabled = false; alert("Non riuscito: " + error.message); return; }
    await ricarica(container);
  }));
}

function editor(container, r, modo, originale) {
  if (!r) return;
  const box = container.querySelector('[data-editor="' + r.id + '"]');
  const o = originale(r);
  box.innerHTML = '<div style="border:1px solid #1f6f5c;border-radius:12px;padding:12px;margin-top:10px;">'
    + '<div style="font-size:14px;font-weight:800;">' + (modo === "unisci" ? "Nuova versione per tutti" : "Rendi globale") + ' — controlla prima</div>'
    + '<div style="font-size:12.5px;color:#64748b;margin:4px 0 10px;">Il testo va a tutti i locali: togli nomi di persone, del locale e dettagli che valgono solo per loro. Il locale che l\'ha scritta tiene la sua.</div>'
    + '<input class="rc-titolo" value="' + esc(r.titolo) + '" style="width:100%;box-sizing:border-box;border:1px solid #CBD5DD;border-radius:9px;padding:9px;font-size:14px;margin-bottom:8px;">'
    + '<textarea class="rc-testo" rows="6" style="width:100%;box-sizing:border-box;border:1px solid #CBD5DD;border-radius:9px;padding:9px;font-size:14px;font-family:inherit;">' + esc(r.contenuto) + '</textarea>'
    + '<div style="display:flex;gap:8px;margin-top:10px;"><button class="app-button primary rc-ok">Pubblica per tutti</button><button class="app-button gray rc-no">Annulla</button></div>'
    + '<div class="rc-err" style="font-size:13px;color:#dc2626;margin-top:8px;"></div></div>';
  box.querySelector(".rc-no").onclick = () => { box.innerHTML = ""; };
  box.querySelector(".rc-ok").onclick = async (ev) => {
    const titolo = box.querySelector(".rc-titolo").value.trim();
    const contenuto = box.querySelector(".rc-testo").value.trim();
    const err = box.querySelector(".rc-err");
    if (!titolo || !contenuto) { err.textContent = "Servono titolo e testo."; return; }
    ev.target.disabled = true;
    let idGlobale = null;
    let esito;
    if (modo === "unisci" && r.sostituisce_id) {
      esito = await supabase.from("tony_sapere").update({ titolo, contenuto, aggiornato: new Date().toISOString() }).eq("id", r.sostituisce_id);
      idGlobale = r.sostituisce_id;
    } else if (modo === "unisci" && r.sostituisce_kb) {
      esito = await supabase.from("tony_knowledge_base").update({ titolo, contenuto }).eq("id", r.sostituisce_kb);
    } else {
      esito = await supabase.from("tony_sapere").insert({
        azienda_id: null,
        ambito: ["cucina", "sala", "locale", "hotel"].includes(r.ambito) ? r.ambito : "locale",
        vale_per: Array.isArray(r.vale_per) && r.vale_per.length ? r.vale_per : ["tutti"],
        titolo, contenuto, priorita: 3, attivo: true,
      }).select("id").single();
      idGlobale = esito.data?.id || null;
    }
    if (esito.error) { ev.target.disabled = false; err.textContent = "Non pubblicata: " + esito.error.message; return; }
    // la regola del locale diventa la sua versione della nuova globale: da loro non si leggono doppie
    const agg = { promossa_id: idGlobale, promossa_il: new Date().toISOString() };
    if (modo === "globale" && idGlobale && !r.sostituisce_id && !r.sostituisce_kb) agg.sostituisce_id = idGlobale;
    await supabase.from("tony_sapere").update(agg).eq("id", r.id);
    await ricarica(container);
  };
}

function tag(t, bg, col) {
  return '<span style="display:inline-block;font-size:11px;font-weight:700;border-radius:8px;padding:2px 7px;background:' + bg + ';color:' + col + ';">' + esc(t) + '</span>';
}

function box(testo) {
  return '<div style="background:#fff;border:1px dashed #CBD5DD;color:#5A6873;border-radius:12px;padding:14px;font-size:13.5px;margin-bottom:12px;">' + esc(testo) + '</div>';
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
