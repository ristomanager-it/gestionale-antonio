import { supabase } from "../supabaseClient.js";

/* Archivio dei destinatari delle campagne.
   Non e' un elenco di indirizzi: e' l'elenco di chi ha fatto qualcosa.
   Chi ha lasciato il preventivo a meta' sta in cima, perche' quella
   e' la telefonata che vale. */

const FILTRI = [
  { v: "caldi", e: "Da richiamare" },
  { v: "tutti", e: "Tutti" },
  { v: "bozze", e: "Mail da leggere" },
  { v: "proposto", e: "Da decidere" },
  { v: "inviata", e: "Contattati" },
  { v: "da_chiamare", e: "Senza email" },
];

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = '<div style="max-width:780px;margin:22px auto;padding:0 16px;">Nessuna azienda attiva.</div>';
    return;
  }

  container.innerHTML =
    '<div style="max-width:820px;margin:22px auto;padding:0 14px 50px;overflow-x:hidden;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Chi abbiamo contattato</h1>'
    + '<div style="font-size:13px;color:#64748b;margin-bottom:16px;">' + esc(azienda.nome || "") + '</div>'
    + '<div id="ca-filtri" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;"></div>'
    + '<div id="ca-lista"><div style="font-size:13px;color:#64748b;">Un momento&hellip;</div></div>'
    + '</div>';

  const barra = container.querySelector("#ca-filtri");
  FILTRI.forEach((f, i) => {
    const b = document.createElement("button");
    b.textContent = f.e;
    b.dataset.f = f.v;
    b.style.cssText = "border-radius:99px;padding:7px 14px;font-size:13px;font-weight:700;border:1px solid #CBD5DD;background:#fff;color:#334155;cursor:pointer;";
    if (i === 0) selezionato(b, true);
    b.onclick = () => {
      barra.querySelectorAll("button").forEach((x) => selezionato(x, false));
      selezionato(b, true);
      carica(container, azienda, f.v);
    };
    barra.appendChild(b);
  });

  await carica(container, azienda, "caldi");
}

function selezionato(b, si) {
  b.style.background = si ? "#0E5A7A" : "#fff";
  b.style.color = si ? "#fff" : "#334155";
  b.style.borderColor = si ? "#0E5A7A" : "#CBD5DD";
}

async function carica(container, azienda, filtro) {
  const lista = container.querySelector("#ca-lista");
  lista.innerHTML = '<div style="font-size:13px;color:#64748b;">Un momento&hellip;</div>';

  let q = supabase.from("v_campagne_stato").select("*").eq("azienda_id", azienda.id);
  if (filtro === "bozze") q = q.not("mail_testo", "is", null).neq("mail_stato", "inviata");
  else if (filtro === "proposto") q = q.eq("stato", "proposto");
  else if (filtro === "da_chiamare") q = q.eq("stato", "da_chiamare");
  else if (filtro === "inviata") q = q.not("inviata_il", "is", null);

  const { data, error } = await q.order("ultimo_segnale", { ascending: false, nullsFirst: false }).limit(200);

  if (error) {
    lista.innerHTML = avviso("Non sono riuscito a leggere l'archivio. Riprova fra poco.");
    return;
  }

  let righe = data || [];
  if (filtro === "caldi") {
    righe = righe.filter((r) => !r.disiscritto &&
      (r.form_lasciato_a_meta || r.ha_aperto_form || r.ha_cliccato || r.richiesta_completa));
    righe.sort((a, b) => peso(b) - peso(a));
  }

  if (!righe.length) {
    lista.innerHTML = avviso(
      filtro === "caldi"
        ? "Nessuno ha ancora dato segnali. Qui compaiono quelli che aprono il preventivo: sono le telefonate che valgono."
        : filtro === "bozze"
          ? "Nessuna mail scritta. Chiedi a Tony di scriverle per i destinatari che hai accettato."
          : "Niente in archivio con questo filtro.");
    return;
  }

  let html = '<div style="font-size:12.5px;color:#64748b;margin-bottom:10px;">' + righe.length + (righe.length === 1 ? " destinatario" : " destinatari") + '</div>';

  righe.forEach((r) => {
    const colore = r.richiesta_completa ? "#16a34a"
      : r.form_lasciato_a_meta ? "#dc2626"
      : r.ha_cliccato ? "#d97706" : "#94a3b8";

    html += '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:14px;padding:13px 14px;margin-bottom:9px;overflow-wrap:anywhere;">'
      + '<div style="display:flex;gap:9px;align-items:flex-start;">'
      + '<span style="width:9px;height:9px;border-radius:50%;background:' + colore + ';margin-top:6px;flex:0 0 9px;"></span>'
      + '<div style="flex:1;min-width:0;overflow-wrap:anywhere;">'
      + '<div style="font-size:14.5px;font-weight:800;">' + esc(r.ragione_sociale) + '</div>'
      + '<div style="font-size:12px;color:' + colore + ';font-weight:700;margin-top:2px;">' + esc(r.a_che_punto) + '</div>'
      + (r.citta ? '<div style="font-size:12px;color:#94a3b8;margin-top:2px;">' + esc(r.citta) + ' · ' + esc(r.segmento) + '</div>' : "")
      + (r.motivo ? '<div style="font-size:12.5px;color:#475569;margin-top:6px;">' + esc(r.motivo) + '</div>' : "")
      + (r.note ? '<div style="font-size:12.5px;color:#334155;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:9px;padding:8px;margin-top:8px;white-space:pre-wrap;">' + esc(r.note) + '</div>' : "")
      + '</div></div>'
      + (r.mail_testo
          ? '<details style="margin-top:10px;border-top:1px solid #F1F5F9;padding-top:10px;" data-mail="' + r.id + '">'
            + '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#0E5A7A;">'
            + (r.mail_stato === 'approvata' ? 'Mail approvata, pronta a partire' : 'Leggi la mail che ha scritto Tony')
            + '</summary>'
            + '<div style="margin-top:10px;">'
            + '<label style="font-size:11.5px;font-weight:700;color:#94a3b8;">Oggetto</label>'
            + '<input type="text" data-ogg="' + r.id + '" value="' + esc(r.mail_oggetto || '') + '" style="width:100%;border:1px solid #CBD5DD;border-radius:8px;padding:9px;font-size:13.5px;margin:4px 0 10px;font-family:inherit;">'
            + '<label style="font-size:11.5px;font-weight:700;color:#94a3b8;">Testo</label>'
            + '<textarea data-txt="' + r.id + '" rows="12" style="width:100%;border:1px solid #CBD5DD;border-radius:8px;padding:10px;font-size:13.5px;font-family:inherit;line-height:1.5;margin:4px 0 10px;">' + esc(r.mail_testo) + '</textarea>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '<button class="app-button small" data-salva="' + r.id + '" style="background:#0E5A7A;color:#fff;">Salva correzioni</button>'
            + (r.mail_stato === 'approvata'
                ? '<button class="app-button small gray" data-sblocca="' + r.id + '">Rimetti in bozza</button>'
                : '<button class="app-button small" data-approva="' + r.id + '" style="background:#15803d;color:#fff;">Approva</button>')
            + '</div>'
            + '<div style="font-size:11.5px;color:#94a3b8;margin-top:8px;">Approvare non fa partire niente: le mail approvate partono quando lo dici a Tony.</div>'
            + '</div></details>'
          : '')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;max-width:100%;">'
      + (r.telefono ? '<a href="tel:' + esc(r.telefono) + '" class="app-button small" style="background:#0E5A7A;color:#fff;text-decoration:none;">Chiama</a>' : "")
      + (r.email ? '<a href="mailto:' + esc(r.email) + '" class="app-button small gray" style="text-decoration:none;">Scrivi</a>' : "")
      + (r.sito ? '<a href="' + esc(r.sito) + '" target="_blank" rel="noopener" class="app-button small gray" style="text-decoration:none;">Sito</a>' : "")
      + (r.fonte_url ? '<a href="' + esc(r.fonte_url) + '" target="_blank" rel="noopener" style="font-size:11.5px;color:#94a3b8;align-self:center;text-decoration:none;">da dove viene</a>' : "")
      + '</div></div>';
  });

  lista.innerHTML = html;

  // Correzioni e approvazione: quello che parte e' quello che si legge qui.
  lista.querySelectorAll("[data-salva]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.salva;
      const ogg = lista.querySelector('[data-ogg="' + id + '"]').value.trim();
      const txt = lista.querySelector('[data-txt="' + id + '"]').value.trim();
      if (!ogg || !txt) { alert("Servono sia l'oggetto sia il testo."); return; }
      b.disabled = true; b.textContent = "Salvo...";
      const { error } = await supabase.from("campagne_target")
        .update({ mail_oggetto: ogg, mail_testo: txt, mail_stato: "bozza" }).eq("id", id);
      b.disabled = false; b.textContent = "Salva correzioni";
      if (error) { alert("Non sono riuscito a salvare."); return; }
      await carica(container, azienda, filtro);
    };
  });

  lista.querySelectorAll("[data-approva]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.approva;
      const ogg = lista.querySelector('[data-ogg="' + id + '"]').value.trim();
      const txt = lista.querySelector('[data-txt="' + id + '"]').value.trim();
      b.disabled = true;
      const { error } = await supabase.from("campagne_target")
        .update({ mail_oggetto: ogg, mail_testo: txt, mail_stato: "approvata" }).eq("id", id);
      b.disabled = false;
      if (error) { alert("Non sono riuscito ad approvare."); return; }
      await carica(container, azienda, filtro);
    };
  });

  lista.querySelectorAll("[data-sblocca]").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      const { error } = await supabase.from("campagne_target")
        .update({ mail_stato: "bozza" }).eq("id", b.dataset.sblocca);
      b.disabled = false;
      if (error) { alert("Non riesco a rimetterla in bozza."); return; }
      await carica(container, azienda, filtro);
    };
  });
}

function peso(r) {
  return (r.form_lasciato_a_meta ? 60 : 0)
    + (r.ha_aperto_form ? 20 : 0)
    + (r.ha_cliccato ? 25 : 0)
    + (r.richiesta_completa ? 40 : 0);
}

function avviso(testo) {
  return '<div style="background:#fff;border:1px dashed #CBD5DD;border-radius:12px;padding:14px;font-size:13.5px;color:#5A6873;">' + esc(testo) + '</div>';
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
