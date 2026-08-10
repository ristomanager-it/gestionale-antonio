import { supabase } from "../supabaseClient.js";

/* La mappa dei richiami: i posti che, intorno al locale, tirano gente da
   fuori. Stadi, palazzetti, musei, borghi, fiere, santuari, parchi.

   La scrive il ristoratore, che la sa meglio di qualsiasi ricerca: sa quali
   posti gli hanno mandato clienti in vent'anni e quali no. La ricerca
   automatica resta un suggeritore, e quello che propone va confermato.

   Serve a tre cose: dice a chi scrivere subito (chi gestisce il posto e deve
   dire ai gruppi dove mangiare), dove andare a cercare chi arriva (i
   calendari di quegli impianti), e quando ha senso farsi vedere. */

const TIPI = [
  { v: "stadio", e: "Stadio" }, { v: "palazzetto", e: "Palazzetto" },
  { v: "museo", e: "Museo" }, { v: "sito", e: "Sito o borgo" },
  { v: "fiera", e: "Fiera" }, { v: "congressi", e: "Centro congressi" },
  { v: "santuario", e: "Santuario" }, { v: "parco", e: "Parco" },
  { v: "autodromo", e: "Autodromo" }, { v: "arena", e: "Arena concerti" },
  { v: "terme", e: "Terme" }, { v: "altro", e: "Altro" },
];

const PUBBLICI = [
  { v: "sportiva", e: "Squadre in trasferta" },
  { v: "scuola", e: "Scolaresche" },
  { v: "agenzia", e: "Gruppi in pullman" },
  { v: "azienda", e: "Aziende ed espositori" },
  { v: "misto", e: "Un po' di tutto" },
];

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = '<div style="max-width:820px;margin:22px auto;padding:0 16px;">Nessuna azienda attiva.</div>';
    return;
  }

  container.innerHTML =
    '<div style="max-width:820px;margin:22px auto;padding:0 14px 60px;overflow-x:hidden;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Cosa porta gente da queste parti</h1>'
    + '<div style="font-size:13.5px;color:#475569;margin-bottom:16px;">I posti intorno a voi che attirano gruppi da fuori: stadi, musei, borghi, fiere, santuari. Chi li gestisce deve dire a quei gruppi dove mangiare, e da lì si parte.</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">'
    + '<button id="rt-nuovo" class="app-button primary">+ Aggiungi attrattiva</button>'
    + '<button id="rt-cerca" class="app-button gray">Falle cercare a Tony</button>'
    + '</div>'
    + '<div id="rt-form"></div>'
    + '<div id="rt-lista"><div style="font-size:13px;color:#64748b;">Un momento&hellip;</div></div>'
    + '</div>';

  container.querySelector("#rt-nuovo").onclick = () => mostraForm(container, azienda, null);
  container.querySelector("#rt-cerca").onclick = () => cercaConTony(container, azienda);

  await carica(container, azienda);
}

async function carica(container, azienda) {
  const box = container.querySelector("#rt-lista");
  const { data, error } = await supabase.from("richiami_territorio")
    .select("*").eq("azienda_id", azienda.id)
    .order("stato").order("priorita").order("minuti", { nullsFirst: false });

  if (error) {
    box.innerHTML = avviso("Non sono riuscito a leggere la mappa. Riprova fra poco.");
    return;
  }

  const righe = data || [];
  if (!righe.length) {
    box.innerHTML = avviso("Nessuna attrattiva. Comincia da quelle che conosci: lo stadio dove vengono le squadre, il borgo dove arrivano i pullman, la fiera. Bastano il nome e chi la gestisce.")
      + '<div style="margin-top:14px;"><button id="rt-nuovo-fondo" class="app-button primary">+ Aggiungi attrattiva</button></div>';
    const primo = box.querySelector("#rt-nuovo-fondo");
    if (primo) primo.onclick = () => mostraForm(container, azienda, null);
    return;
  }

  const proposti = righe.filter((r) => r.stato === "proposto");
  let html = "";

  if (proposti.length) {
    html += '<div style="font-size:11.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#d97706;margin:4px 0 8px;">'
      + proposti.length + ' da confermare o buttare</div>';
  }

  righe.forEach((r) => {
    if (r.stato === "scartato") return;
    const proposto = r.stato === "proposto";
    html += '<div style="background:#fff;border:1px solid ' + (proposto ? "#fde68a" : "#E3E8EC") + ';border-radius:14px;padding:13px 14px;margin-bottom:9px;overflow-wrap:anywhere;">'
      + '<div style="font-size:14.5px;font-weight:800;">' + esc(r.nome) + '</div>'
      + '<div style="font-size:12px;color:#94a3b8;margin-top:2px;">'
      + esc(etichetta(TIPI, r.tipo)) + ' · ' + esc(etichetta(PUBBLICI, r.chi_attira))
      + (r.comune ? ' · ' + esc(r.comune) : "")
      + (r.minuti ? ' · ' + r.minuti + ' min' : (r.distanza_km ? ' · ' + r.distanza_km + ' km' : ""))
      + '</div>'
      + (r.gestore ? '<div style="font-size:13px;color:#334155;margin-top:6px;">Gestito da <b>' + esc(r.gestore) + '</b></div>' : "")
      + (r.gestore_email || r.gestore_telefono
          ? '<div style="font-size:12.5px;color:#64748b;margin-top:2px;">'
            + esc([r.gestore_telefono, r.gestore_email].filter(Boolean).join(" · ")) + '</div>'
          : (r.gestore ? '<div style="font-size:12.5px;color:#b45309;margin-top:2px;">Nessun recapito: aggiungilo o fattelo cercare</div>' : ""))
      + (r.stagionalita ? '<div style="font-size:12.5px;color:#64748b;margin-top:2px;">' + esc(r.stagionalita) + '</div>' : "")
      + (r.volume ? '<div style="font-size:12.5px;color:#64748b;">' + esc(r.volume) + '</div>' : "")
      + '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;max-width:100%;">'
      + (proposto
          ? '<button class="app-button small" data-conf="' + r.id + '" style="background:#15803d;color:#fff;">Conferma</button>'
            + '<button class="app-button small gray" data-scarta="' + r.id + '">Non serve</button>'
          : '')
      + (r.gestore_telefono
          ? '<a href="tel:' + esc(r.gestore_telefono) + '" class="app-button small" style="background:#0E5A7A;color:#fff;text-decoration:none;">Chiama</a>'
          : "")
      + (r.gestore_email
          ? '<a href="mailto:' + esc(r.gestore_email) + '" class="app-button small gray" style="text-decoration:none;">Scrivi a mano</a>'
          : "")
      + '<button class="app-button small gray" data-mod="' + r.id + '">Modifica</button>'
      + (!proposto && !r.target_id
          ? '<button class="app-button small gray" data-target="' + r.id + '">Mettilo fra i contatti</button>'
          : "")
      + (r.target_id
          ? '<a href="#/mail-marketing" style="font-size:11.5px;color:#15803d;align-self:center;font-weight:700;text-decoration:none;">nei contatti &rsaquo;</a>'
          : "")
      + (!r.gestore_email && !proposto
          ? '<button class="app-button small gray" data-trova="' + r.id + '">Cerca i contatti</button>'
          : "")
      + '</div></div>';
  });

  html += '<div style="margin-top:16px;"><button id="rt-nuovo-fondo" class="app-button primary">+ Aggiungi attrattiva</button></div>';

  box.innerHTML = html;

  const inFondo = box.querySelector("#rt-nuovo-fondo");
  if (inFondo) inFondo.onclick = () => mostraForm(container, azienda, null);

  box.querySelectorAll("[data-conf]").forEach((b) => {
    b.onclick = async () => { await cambiaStato(b.dataset.conf, "confermato"); await carica(container, azienda); };
  });
  box.querySelectorAll("[data-scarta]").forEach((b) => {
    b.onclick = async () => { await cambiaStato(b.dataset.scarta, "scartato"); await carica(container, azienda); };
  });
  box.querySelectorAll("[data-mod]").forEach((b) => {
    b.onclick = () => mostraForm(container, azienda, righe.find((r) => r.id === b.dataset.mod));
  });
  box.querySelectorAll("[data-trova]").forEach((b) => {
    b.onclick = async () => {
      const r = righe.find((x) => x.id === b.dataset.trova);
      if (!r) return;
      b.disabled = true; b.textContent = "Cerco...";
      try {
        // Prima lo si porta fra i contatti, poi la funzione che legge le
        // pagine contatti fa il resto: e' la stessa che usiamo per le aziende.
        await supabase.rpc("richiamo_in_target", { p_richiamo: r.id });
        const { data } = await supabase.functions.invoke("tony-target-contatti", {
          body: { azienda_id: azienda.id, max: 3 },
        });
        const esito = data && Array.isArray(data.esiti) ? data.esiti[0] : null;
        if (esito && esito.email) {
          await supabase.from("richiami_territorio")
            .update({ gestore_email: esito.email, fonte_url: esito.pagina || null }).eq("id", r.id);
        } else {
          alert("Sul loro sito non ho trovato un indirizzo pubblico. Meglio chiamarli.");
        }
      } catch (e) {
        alert("La ricerca non ha funzionato. Puoi scrivere il recapito a mano.");
      }
      await carica(container, azienda);
    };
  });

  box.querySelectorAll("[data-target]").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true; b.textContent = "Aggiungo...";
      const { error } = await supabase.rpc("richiamo_in_target", { p_richiamo: b.dataset.target });
      if (error) { b.disabled = false; b.textContent = "Mettilo fra i contatti"; alert("Non riesco ad aggiungerlo: " + error.message); return; }
      await carica(container, azienda);
    };
  });
}

async function cambiaStato(id, stato) {
  const patch = { stato: stato };
  if (stato === "confermato") patch.confermato_il = new Date().toISOString();
  await supabase.from("richiami_territorio").update(patch).eq("id", id);
}

function mostraForm(container, azienda, r) {
  const box = container.querySelector("#rt-form");
  const v = r || {};

  const opz = (lista, sel) => lista.map((o) =>
    '<option value="' + o.v + '"' + (sel === o.v ? " selected" : "") + '>' + esc(o.e) + '</option>').join("");

  box.innerHTML = '<div style="background:#fff;border:1px solid #0E5A7A;border-radius:14px;padding:15px;margin-bottom:16px;">'
    + '<div style="font-size:14px;font-weight:800;margin-bottom:12px;">' + (r ? "Modifica attrattiva" : "Nuova attrattiva") + '</div>'
    + campo("rt-nome", "Come si chiama l'attrattiva", v.nome, "es. Stadio Rocchi, Parco dei Mostri, Fiera di...")
    + '<label style="font-size:12.5px;font-weight:700;color:#334155;">Che cos\'è</label>'
    + '<select id="rt-tipo" style="' + stileCampo() + '">' + opz(TIPI, v.tipo) + '</select>'
    + '<label style="font-size:12.5px;font-weight:700;color:#334155;">Chi ci porta</label>'
    + '<select id="rt-attira" style="' + stileCampo() + '">' + opz(PUBBLICI, v.chi_attira) + '</select>'
    + '<div style="display:flex;gap:10px;">'
    + '<div style="flex:1;">' + campo("rt-comune", "Comune", v.comune, "") + '</div>'
    + '<div style="flex:0 0 110px;">' + campo("rt-minuti", "Minuti da voi", v.minuti, "es. 30", "number") + '</div>'
    + '</div>'
    + campo("rt-gestore", "Chi lo gestisce", v.gestore, "società sportiva, comune, Pro Loco, fondazione")
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
    + '<div style="flex:1;min-width:180px;">' + campo("rt-email", "Email del gestore", v.gestore_email, "info@...") + '</div>'
    + '<div style="flex:1;min-width:140px;">' + campo("rt-tel", "Telefono", v.gestore_telefono, "") + '</div>'
    + '</div>'
    + campo("rt-stag", "In che periodi lavora", v.stagionalita, "da settembre a maggio, tutto l'anno, estate")
    + campo("rt-volume", "Quanta gente muove", v.volume, "capienza, visitatori all'anno, quanti pullman")
    + '<div style="display:flex;gap:8px;margin-top:6px;">'
    + '<button id="rt-salva" class="app-button primary">Salva</button>'
    + '<button id="rt-annulla" class="app-button gray">Annulla</button>'
    + '</div>'
    + '<div id="rt-err" style="font-size:13px;color:#dc2626;margin-top:8px;"></div>'
    + '</div>';

  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  box.querySelector("#rt-annulla").onclick = () => { box.innerHTML = ""; };

  box.querySelector("#rt-salva").onclick = async () => {
    const nome = box.querySelector("#rt-nome").value.trim();
    if (!nome) { box.querySelector("#rt-err").textContent = "Serve almeno il nome."; return; }

    const riga = {
      azienda_id: azienda.id,
      sede_id: window.state?.sede?.id || null,
      nome: nome,
      tipo: box.querySelector("#rt-tipo").value,
      chi_attira: box.querySelector("#rt-attira").value,
      comune: box.querySelector("#rt-comune").value.trim() || null,
      minuti: Number(box.querySelector("#rt-minuti").value) || null,
      gestore: box.querySelector("#rt-gestore").value.trim() || null,
      gestore_email: box.querySelector("#rt-email").value.trim().toLowerCase() || null,
      gestore_telefono: box.querySelector("#rt-tel").value.trim() || null,
      stagionalita: box.querySelector("#rt-stag").value.trim() || null,
      volume: box.querySelector("#rt-volume").value.trim() || null,
      // Quello che scrive una persona non ha bisogno di essere confermato.
      stato: "confermato",
      fonte: r ? (r.fonte || "mano") : "mano",
    };

    const btn = box.querySelector("#rt-salva");
    btn.disabled = true; btn.textContent = "Salvo...";
    const esito = r
      ? await supabase.from("richiami_territorio").update(riga).eq("id", r.id)
      : await supabase.from("richiami_territorio").insert(riga);
    if (esito.error) {
      btn.disabled = false; btn.textContent = "Salva";
      box.querySelector("#rt-err").textContent = esito.error.code === "23505"
        ? "C'è già un'attrattiva con questo nome." : "Non sono riuscito a salvare: " + esito.error.message;
      return;
    }
    box.innerHTML = "";
    await carica(container, azienda);
  };
}

async function cercaConTony(container, azienda) {
  const b = container.querySelector("#rt-cerca");
  b.disabled = true;
  b.textContent = "Sto cercando, ci vuole un minuto...";
  try {
    const { data, error } = await supabase.functions.invoke("tony-richiami", {
      body: { azienda_id: azienda.id, sede_id: window.state?.sede?.id || null, km: 50, minuti: 60 },
    });
    if (error || !data || data.success === false) {
      alert("La ricerca non ha funzionato" + (data && data.error ? ": " + data.error : "") + ". Puoi aggiungerli a mano.");
    }
  } catch (e) {
    alert("La ricerca non ha funzionato. Puoi aggiungerli a mano.");
  }
  b.disabled = false;
  b.textContent = "Falle cercare a Tony";
  await carica(container, azienda);
}

function stileCampo() {
  return "width:100%;border:1px solid #CBD5DD;border-radius:9px;padding:10px;margin:4px 0 12px;font-size:14px;font-family:inherit;";
}

function campo(id, etichettaTesto, valore, segnaposto, tipo) {
  return '<label style="font-size:12.5px;font-weight:700;color:#334155;">' + esc(etichettaTesto) + '</label>'
    + '<input id="' + id + '" type="' + (tipo || "text") + '" value="' + esc(valore == null ? "" : valore) + '"'
    + ' placeholder="' + esc(segnaposto || "") + '" style="' + stileCampo() + '">';
}

function etichetta(lista, v) {
  const t = lista.find((x) => x.v === v);
  return t ? t.e : (v || "");
}

function avviso(testo) {
  return '<div style="background:#fff;border:1px dashed #CBD5DD;border-radius:12px;padding:14px;font-size:13.5px;color:#5A6873;">' + esc(testo) + '</div>';
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
