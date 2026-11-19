import { supabase } from "../supabaseClient.js";

/* Il cervello di Tony: quello che il locale gli insegna.
   Serve agli admin per scrivere le regole del PROPRIO locale — come si parla,
   cosa non si dice mai, come si lavora — senza passare da noi.
   Le regole comuni della piattaforma si vedono ma non si toccano: sono la
   formazione di base di tutti i Tony e le cambia solo il superadmin. */

const FUNZIONI = [
  { v: "tutti", e: "Sempre" },
  { v: "tony-post", e: "Post social" },
  { v: "tony-ricetta", e: "Ricette" },
  { v: "tony-menu", e: "Menu" },
  { v: "tony-grafica", e: "Grafiche" },
];

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = box("Nessuna azienda attiva.", "giallo");
    return;
  }

  container.innerHTML =
    '<div style="max-width:780px;margin:22px auto;padding:0 16px;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Il cervello di Tony</h1>'
    + '<div style="font-size:13px;color:#64748b;margin-bottom:6px;">' + esc(azienda.nome || "") + '</div>'
    + '<div style="font-size:13.5px;color:#475569;margin-bottom:20px;">Quello che scrivi qui Tony se lo ricorda ogni volta che lavora per te: come parlate, cosa non si dice mai, come si fanno le cose in casa vostra.</div>'
    + '<div id="tc-corpo"><div style="font-size:13px;color:#64748b;">Un momento&hellip;</div></div>'
    + '</div>';

  await ricarica(container, azienda);
}

async function ricarica(container, azienda) {
  const corpo = container.querySelector("#tc-corpo");

  const [sedi, regole, formazione] = await Promise.all([
    supabase.from("sedi").select("id, nome").eq("azienda_id", azienda.id).order("created_at"),
    supabase.from("tony_sapere")
      .select("id, azienda_id, sede_id, ambito, vale_per, titolo, contenuto, priorita, attivo, sostituisce_id, sostituisce_kb")
      .or("azienda_id.is.null,azienda_id.eq." + azienda.id)
      .order("priorita", { ascending: false }).order("id"),
    // la formazione caricata con le slide (es. Pienissimo Live): fuori solo frasi motivazionali e regole di scrittura campagne
    supabase.from("tony_knowledge_base")
      .select("id, titolo, contenuto, fonte, categoria")
      .eq("attivo", true)
      .not("categoria", "in", "(motivazione,marketing,marketing_meta,campagna,promo_strategy,marketing_strategy,piattaforma)")
      .order("fonte").order("titolo"),
  ]);

  if (regole.error) {
    corpo.innerHTML = box("Non sono riuscito a leggere le regole. Riprova fra poco.", "giallo");
    return;
  }

  const listaSedi = sedi.data || [];
  const nomeSede = (id) => {
    const s = listaSedi.find((x) => x.id === id);
    return s ? s.nome : "";
  };

  const tutte = regole.data || [];
  const mie = tutte.filter((r) => r.azienda_id === azienda.id);
  const comuni = tutte.filter((r) => !r.azienda_id);
  const schede = formazione.data || [];
  // copie del locale: quale originale (regola globale o scheda) prendono il posto
  const copiaRegola = (id) => mie.find((m) => m.sostituisce_id === id);
  const copiaScheda = (id) => mie.find((m) => m.sostituisce_kb === id);
  const originaleDi = (m) => m.sostituisce_id ? comuni.find((c) => c.id === m.sostituisce_id)
    : m.sostituisce_kb ? schede.find((k) => k.id === m.sostituisce_kb) : null;

  let html = '<button id="tc-nuova" class="app-button primary" style="margin-bottom:16px;">+ Insegna una cosa a Tony</button>';
  html += '<div id="tc-form"></div>';

  if (!mie.length) {
    html += box("Tony non ha ancora imparato niente di specifico sul tuo locale. Scrivi la prima regola: per esempio come vuoi che parli ai clienti, o una parola che non deve usare mai.", "neutro");
  }

  mie.forEach((r) => {
    const sede = r.sede_id ? nomeSede(r.sede_id) : "";
    html += '<div style="background:#fff;border:1px solid ' + (r.attivo ? "#E3E8EC" : "#F1F5F9") + ';border-radius:14px;padding:14px;margin-bottom:10px;' + (r.attivo ? "" : "opacity:.6;") + '">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">'
      + '<div style="flex:1;">'
      + ((r.sostituisce_id || r.sostituisce_kb) ? '<span style="display:inline-block;font-size:11px;font-weight:700;border-radius:8px;padding:2px 7px;background:#fef3c7;color:#92400e;margin-bottom:5px;">' + (r.sostituisce_kb ? "Sostituisce una scheda di formazione" : "Sostituisce una regola globale") + '</span>' : "")
      + '<div style="font-size:14.5px;font-weight:800;">' + esc(r.titolo) + '</div>'
      + '<div style="font-size:11.5px;color:#94a3b8;margin-top:3px;">'
      + (sede ? "Solo " + esc(sede) : "Tutte le sedi")
      + " · " + esc(etichetteFunzioni(r.vale_per))
      + (r.attivo ? "" : " · spenta")
      + '</div>'
      + '<div style="font-size:13px;color:#475569;white-space:pre-wrap;margin-top:8px;">' + esc(r.contenuto) + '</div>'
      + (originaleDi(r) ? '<div style="font-size:12.5px;color:#94a3b8;text-decoration:line-through;white-space:pre-wrap;margin-top:8px;">Originale: ' + esc(String(originaleDi(r).contenuto || "").slice(0, 220)) + '</div>' : "")
      + '</div></div>'
      + '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">'
      + '<button class="app-button small gray" data-mod="' + r.id + '">Modifica</button>'
      + ((r.sostituisce_id || r.sostituisce_kb)
        ? '<button class="app-button small gray" data-del="' + r.id + '" data-torna="1">Torna all\'originale</button>'
        : '<button class="app-button small gray" data-att="' + r.id + '" data-val="' + (r.attivo ? "0" : "1") + '">' + (r.attivo ? "Spegni" : "Riaccendi") + '</button>'
          + '<button class="app-button small gray" data-del="' + r.id + '" style="color:#dc2626;">Elimina</button>')
      + '</div></div>';
  });

  const cardGlobale = (titolo, contenuto, etichetta, attr, copia) =>
    '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:11px;margin-bottom:7px;">'
    + '<div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">' + esc(etichetta) + '</div>'
    + '<div style="font-size:13.5px;font-weight:700;color:#334155;">' + esc(titolo) + '</div>'
    + '<div style="font-size:12.5px;color:#64748b;white-space:pre-wrap;margin-top:4px;">' + esc(contenuto) + '</div>'
    + (copia
      ? '<div style="font-size:12px;color:#92400e;font-weight:700;margin-top:8px;">Da voi vale la vostra versione (sopra)</div>'
      : '<button class="app-button small gray" ' + attr + ' style="margin-top:8px;color:#1f6f5c;border-color:#1f6f5c;">Cambiala per il mio locale</button>')
    + '</div>';

  if (comuni.length) {
    html += '<details style="margin-top:18px;">'
      + '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#334155;">Quello che Tony sa gia\' di suo (' + comuni.length + ')</summary>'
      + '<div style="font-size:12.5px;color:#64748b;margin:8px 0 10px;">Regole valide per tutti i locali. Se da voi si fa diverso, cambiala per il tuo locale: l\'originale non si tocca e resta per gli altri.</div>';
    comuni.forEach((r) => { html += cardGlobale(r.titolo, r.contenuto, "Regola globale", 'data-sost="' + r.id + '"', copiaRegola(r.id)); });
    html += '</details>';
  }

  if (schede.length) {
    const fonti = {};
    schede.forEach((k) => { const f = k.fonte || "Formazione"; (fonti[f] = fonti[f] || []).push(k); });
    Object.keys(fonti).forEach((f) => {
      html += '<details style="margin-top:12px;">'
        + '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#334155;">Formazione · ' + esc(f) + ' (' + fonti[f].length + ')</summary>'
        + '<div style="font-size:12.5px;color:#64748b;margin:8px 0 10px;">Schede di formazione valide per tutti i locali. La barra Cerca e Tony le usano per rispondere.</div>';
      fonti[f].forEach((k) => { html += cardGlobale(k.titolo, k.contenuto, "Formazione · " + f, 'data-sostkb="' + k.id + '"', copiaScheda(k.id)); });
      html += '</details>';
    });
  }

  if (window.state?.isSuperadmin === true || window.state?.ruolo === "superadmin") {
    html += '<div style="margin-top:22px;padding-top:14px;border-top:1px solid #E3E8EC;">'
      + '<a href="#/super-tony" style="font-size:13px;color:#0E5A7A;font-weight:700;text-decoration:none;">Apri Super Tony &rarr;</a>'
      + '<a href="#/regole-clienti" style="display:block;margin-top:8px;font-size:13px;color:#0E5A7A;font-weight:700;text-decoration:none;">Regole dei clienti da portare a tutti &rarr;</a>'
      + '</div>';
  }

  corpo.innerHTML = html;

  corpo.querySelector("#tc-nuova").onclick = () => mostraForm(container, azienda, listaSedi, null);
  corpo.querySelectorAll("[data-mod]").forEach((b) => {
    b.onclick = () => mostraForm(container, azienda, listaSedi, mie.find((r) => String(r.id) === b.dataset.mod));
  });
  corpo.querySelectorAll("[data-att]").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      const { error } = await supabase.from("tony_sapere")
        .update({ attivo: b.dataset.val === "1" }).eq("id", b.dataset.att);
      if (error) { b.disabled = false; alert("Non sono riuscito a cambiare la regola."); return; }
      await ricarica(container, azienda);
    };
  });
  corpo.querySelectorAll("[data-sost]").forEach((b) => {
    b.onclick = () => {
      const o = comuni.find((r) => String(r.id) === b.dataset.sost);
      if (o) mostraForm(container, azienda, listaSedi, null, { sostituisce_id: o.id, titolo: o.titolo, contenuto: o.contenuto, vale_per: o.vale_per });
    };
  });
  corpo.querySelectorAll("[data-sostkb]").forEach((b) => {
    b.onclick = () => {
      const o = schede.find((k) => String(k.id) === b.dataset.sostkb);
      if (o) mostraForm(container, azienda, listaSedi, null, { sostituisce_kb: o.id, titolo: o.titolo, contenuto: o.contenuto, vale_per: ["tony"] });
    };
  });
  corpo.querySelectorAll("[data-del]").forEach((b) => {
    b.onclick = async () => {
      if (!confirm(b.dataset.torna ? "Torno alla versione originale? La vostra versione viene eliminata." : "Elimino questa regola? Tony smettera' di tenerne conto.")) return;
      b.disabled = true;
      const { error } = await supabase.from("tony_sapere").delete().eq("id", b.dataset.del);
      if (error) { b.disabled = false; alert("Non sono riuscito a eliminare la regola."); return; }
      await ricarica(container, azienda);
    };
  });
}

function mostraForm(container, azienda, listaSedi, regola, base) {
  const box = container.querySelector("#tc-form");
  const r = regola || base || {};
  const valePer = Array.isArray(r.vale_per) ? r.vale_per : ["tutti"];

  let opzioniSedi = '<option value="">Tutte le sedi</option>';
  listaSedi.forEach((s) => {
    opzioniSedi += '<option value="' + s.id + '"' + (r.sede_id === s.id ? " selected" : "") + '>' + esc(s.nome) + '</option>';
  });

  let opzioniFunzioni = "";
  FUNZIONI.forEach((f) => {
    opzioniFunzioni += '<label style="display:inline-flex;align-items:center;gap:5px;margin:0 12px 6px 0;font-size:13px;">'
      + '<input type="checkbox" value="' + f.v + '"' + (valePer.includes(f.v) ? " checked" : "") + '> ' + f.e + '</label>';
  });

  box.innerHTML = '<div style="background:#fff;border:1px solid #0E5A7A;border-radius:14px;padding:15px;margin-bottom:16px;">'
    + '<div style="font-size:14px;font-weight:800;margin-bottom:12px;">' + (regola ? "Modifica" : base ? "La vostra versione" : "Cosa deve ricordarsi Tony") + '</div>'
    + (base ? '<div style="font-size:12.5px;color:#64748b;margin:-6px 0 12px;">Parti dal testo originale e scrivilo come si fa da voi. Per il tuo locale Tony e la barra useranno questa versione; per gli altri resta l\'originale.</div>' : "")
    + '<label style="font-size:12.5px;font-weight:700;color:#334155;">Titolo</label>'
    + '<input id="tc-titolo" type="text" value="' + esc(r.titolo || "") + '" placeholder="es. Come parliamo ai clienti" style="width:100%;border:1px solid #CBD5DD;border-radius:9px;padding:10px;margin:4px 0 12px;font-size:14px;">'
    + '<label style="font-size:12.5px;font-weight:700;color:#334155;">La regola</label>'
    + '<textarea id="tc-contenuto" rows="5" placeholder="Scrivilo come lo diresti a una persona nuova che comincia domani." style="width:100%;border:1px solid #CBD5DD;border-radius:9px;padding:10px;margin:4px 0 12px;font-size:14px;font-family:inherit;">' + esc(r.contenuto || "") + '</textarea>'
    + '<label style="font-size:12.5px;font-weight:700;color:#334155;">Per quale sede</label>'
    + '<select id="tc-sede" style="width:100%;border:1px solid #CBD5DD;border-radius:9px;padding:10px;margin:4px 0 12px;font-size:14px;">' + opzioniSedi + '</select>'
    + '<div style="font-size:12.5px;font-weight:700;color:#334155;margin-bottom:5px;">Quando vale</div>'
    + '<div id="tc-funzioni" style="margin-bottom:14px;">' + opzioniFunzioni + '</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button id="tc-salva" class="app-button primary">Salva</button>'
    + '<button id="tc-annulla" class="app-button gray">Annulla</button>'
    + '</div>'
    + '<div id="tc-errore" style="font-size:13px;color:#dc2626;margin-top:9px;"></div>'
    + '</div>';

  box.scrollIntoView({ behavior: "smooth", block: "nearest" });

  box.querySelector("#tc-annulla").onclick = () => { box.innerHTML = ""; };

  box.querySelector("#tc-salva").onclick = async () => {
    const titolo = box.querySelector("#tc-titolo").value.trim();
    const contenuto = box.querySelector("#tc-contenuto").value.trim();
    const errore = box.querySelector("#tc-errore");
    if (!titolo || !contenuto) {
      errore.textContent = "Servono il titolo e il testo della regola.";
      return;
    }
    const funzioni = Array.from(box.querySelectorAll("#tc-funzioni input:checked")).map((i) => i.value);
    // gli usi che qui non hanno una casella (es. campagne, Tony in chat) restano come nell'originale
    valePer.filter((v) => !FUNZIONI.some((f) => f.v === v)).forEach((v) => { if (!funzioni.includes(v)) funzioni.push(v); });
    if (!funzioni.length) funzioni.push("tutti");

    const riga = {
      ...(base && base.sostituisce_id ? { sostituisce_id: base.sostituisce_id } : {}),
      ...(base && base.sostituisce_kb ? { sostituisce_kb: base.sostituisce_kb } : {}),
      azienda_id: azienda.id,
      sede_id: box.querySelector("#tc-sede").value || null,
      ambito: "locale",
      vale_per: funzioni,
      titolo: titolo,
      contenuto: contenuto,
      priorita: Number(r.priorita) || 3,
      attivo: true,
    };

    const bottone = box.querySelector("#tc-salva");
    bottone.disabled = true;
    bottone.textContent = "Salvataggio...";

    const esito = regola
      ? await supabase.from("tony_sapere").update(riga).eq("id", regola.id)
      : await supabase.from("tony_sapere").insert(riga);

    if (esito.error) {
      bottone.disabled = false;
      bottone.textContent = "Salva";
      errore.textContent = "Non sono riuscito a salvare: " + esito.error.message;
      return;
    }
    box.innerHTML = "";
    await ricarica(container, azienda);
  };
}

function etichetteFunzioni(v) {
  const arr = Array.isArray(v) ? v : [];
  if (!arr.length || arr.includes("tutti")) return "Sempre";
  return arr.map((x) => {
    const f = FUNZIONI.find((y) => y.v === x);
    return f ? f.e : x;
  }).join(", ");
}

function box(testo, colore) {
  const stili = {
    giallo: "background:#fffbeb;border:1px solid #fde68a;color:#b45309;",
    neutro: "background:#fff;border:1px dashed #CBD5DD;color:#5A6873;",
  };
  return '<div style="' + (stili[colore] || stili.neutro) + 'border-radius:12px;padding:14px;font-size:13.5px;margin-bottom:12px;">' + esc(testo) + '</div>';
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
