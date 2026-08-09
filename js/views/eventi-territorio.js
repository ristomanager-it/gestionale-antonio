/* =========================================================
   EVENTI IN ZONA
   Sagre, fiere, concerti e partite entro il raggio della sede, trovati dalla
   ricerca del lunedi'. Sono PROPOSTE: la ricerca passa da un modello e un
   modello puo' sbagliare data o inventare. Qui si guarda e si decide.
   Solo quelli confermati contano.
========================================================= */

function client() {
  return window.supabaseClient || window.supabase;
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const CATEGORIE = {
  sagra:     { i: "🍲", l: "Sagra" },
  fiera:     { i: "🎪", l: "Fiera" },
  concerto:  { i: "🎵", l: "Concerto" },
  religioso: { i: "⛪", l: "Festa religiosa" },
  sport:     { i: "⚽", l: "Sport" },
  mercato:   { i: "🧺", l: "Mercato" },
  altro:     { i: "📌", l: "Evento" },
};

const IMPATTI = {
  porta_gente: { l: "Porta gente", c: "#166534", b: "#dcfce7" },
  porta_via:   { l: "Porta via gente", c: "#b45309", b: "#fef3c7" },
  neutro:      { l: "Ininfluente", c: "#475569", b: "#f1f5f9" },
};

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
              "luglio","agosto","settembre","ottobre","novembre","dicembre"];

function dataLunga(iso) {
  if (!iso) return "";
  const p = String(iso).split("-");
  if (p.length !== 3) return iso;
  return Number(p[2]) + " " + MESI[Number(p[1]) - 1];
}

function categoriaDi(c) {
  const k = String(c || "altro").toLowerCase();
  for (const nome in CATEGORIE) {
    if (k.indexOf(nome) >= 0) return CATEGORIE[nome];
  }
  return CATEGORIE.altro;
}

export async function render(app) {
  const supabase = client();
  const azienda = window.state?.azienda;

  if (!azienda?.id) {
    app.innerHTML = '<div style="padding:24px;">Nessuna azienda selezionata.</div>';
    return;
  }

  app.innerHTML = '<div style="padding:24px;color:#64748b;">Carico gli eventi…</div>';

  const oggi = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("eventi_territorio")
    .select("id, nome, data_inizio, data_fine, luogo, comune, distanza_km, categoria, descrizione, fonte_url, stato, impatto, note")
    .eq("azienda_id", azienda.id)
    .neq("stato", "scartato")
    .gte("data_inizio", oggi)
    .order("data_inizio", { ascending: true })
    .limit(100);

  if (error) {
    console.error("eventi_territorio:", error);
    app.innerHTML = '<div style="padding:24px;color:#b42318;">Non riesco a leggere gli eventi: '
      + esc(error.message) + '</div>';
    return;
  }

  const eventi = data || [];
  const daGuardare = eventi.filter(e => e.stato === "proposto").length;

  const testa = `
    <div style="padding:24px 20px 8px;max-width:820px;margin:0 auto;">
      <h2 style="margin:0 0 6px;font-size:20px;">Eventi in zona</h2>
      <p style="margin:0 0 4px;font-size:14px;color:#64748b;line-height:1.55;">
        Sagre, fiere, concerti e partite vicino alle vostre sedi. La ricerca gira
        ogni lunedì e propone: quello che vedi qui non è ancora verificato.
      </p>
      <p style="margin:0 0 18px;font-size:13px;color:#94a3b8;">
        ${daGuardare ? daGuardare + (daGuardare === 1 ? " da guardare" : " da guardare") : "Niente da guardare"}
        · ${eventi.length} in programma
      </p>
    </div>`;

  if (!eventi.length) {
    app.innerHTML = testa + `
      <div style="padding:0 20px 24px;max-width:820px;margin:0 auto;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;font-size:14px;color:#64748b;">
          Nessun evento in programma. La ricerca gira ogni lunedì mattina.
        </div>
      </div>`;
    return;
  }

  const schede = eventi.map((e) => {
    const cat = categoriaDi(e.categoria);
    const imp = IMPATTI[e.impatto] || IMPATTI.neutro;
    const proposto = e.stato === "proposto";
    const periodo = e.data_fine && e.data_fine !== e.data_inizio
      ? "dal " + dataLunga(e.data_inizio) + " al " + dataLunga(e.data_fine)
      : dataLunga(e.data_inizio);

    return `
      <div class="ev-card ${proposto ? "" : "ev-ok"}" data-id="${esc(e.id)}">
        <div class="ev-testa">
          <span class="ev-ico">${cat.i}</span>
          <div style="flex:1;min-width:0;">
            <div class="ev-nome">${esc(e.nome)}</div>
            <div class="ev-quando">${esc(periodo)}</div>
          </div>
          ${proposto ? "" : '<span class="ev-bollo">confermato</span>'}
        </div>

        <div class="ev-dati">
          <span>${esc(cat.l)}</span>
          ${e.comune ? "<span>" + esc(e.comune) + "</span>" : ""}
          ${e.distanza_km != null ? "<span>" + esc(e.distanza_km) + " km</span>" : ""}
          <span class="ev-imp" style="background:${imp.b};color:${imp.c};">${imp.l}</span>
        </div>

        ${e.descrizione ? '<div class="ev-desc">' + esc(e.descrizione) + "</div>" : ""}
        ${e.luogo ? '<div class="ev-luogo">' + esc(e.luogo) + "</div>" : ""}

        <div class="ev-azioni">
          ${e.fonte_url
            ? '<a href="' + esc(e.fonte_url) + '" target="_blank" rel="noopener" class="ev-btn ev-link">Vedi la fonte</a>'
            : '<span class="ev-nofonte">Nessuna fonte indicata</span>'}
          ${proposto
            ? '<button type="button" class="ev-btn ev-si" data-azione="conferma">È giusto</button>' +
              '<button type="button" class="ev-btn ev-no" data-azione="scarta">Scarta</button>'
            : '<button type="button" class="ev-btn ev-no" data-azione="scarta">Rimuovi</button>'}
        </div>
        <div class="ev-esito"></div>
      </div>`;
  }).join("");

  app.innerHTML = testa + `
    <div id="ev-lista" style="padding:0 20px 28px;max-width:820px;margin:0 auto;">${schede}</div>

    <style>
      .ev-card{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px;background:#fff;}
      .ev-card.ev-ok{border-color:#bbf7d0;background:#f6fdf8;}
      .ev-testa{display:flex;gap:10px;align-items:flex-start;}
      .ev-ico{font-size:20px;line-height:1.2;}
      .ev-nome{font-size:15px;font-weight:700;color:#111827;line-height:1.3;}
      .ev-quando{font-size:13px;color:#0E5A7A;font-weight:600;margin-top:2px;}
      .ev-bollo{font-size:11px;font-weight:700;color:#166534;background:#dcfce7;
                border-radius:99px;padding:3px 9px;white-space:nowrap;}
      .ev-dati{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;font-size:12px;color:#64748b;}
      .ev-dati span{background:#f8fafc;border:1px solid #e2e8f0;border-radius:99px;padding:2px 9px;}
      .ev-imp{border:none !important;font-weight:700;}
      .ev-desc{font-size:13px;color:#374151;line-height:1.45;margin-top:9px;}
      .ev-luogo{font-size:12px;color:#94a3b8;margin-top:3px;}
      .ev-azioni{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;}
      .ev-btn{border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;
              cursor:pointer;border:1px solid transparent;text-decoration:none;display:inline-block;}
      .ev-si{background:#0E5A7A;color:#fff;}
      .ev-no{background:#fff;color:#b42318;border-color:#fecaca;}
      .ev-link{background:#f1f5f9;color:#334155;border-color:#e2e8f0;}
      .ev-nofonte{font-size:12px;color:#94a3b8;}
      .ev-esito{font-size:12px;margin-top:8px;}
    </style>`;

  // Handler sul contenitore: le schede vengono riscritte dopo ogni decisione e
  // i gestori attaccati ai singoli pulsanti smetterebbero di rispondere in
  // silenzio.
  const lista = app.querySelector("#ev-lista");

  lista.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-azione]");
    if (!btn) return;

    const card = btn.closest(".ev-card");
    const id = card?.dataset?.id;
    const azione = btn.dataset.azione;
    const esito = card.querySelector(".ev-esito");

    card.querySelectorAll("button").forEach(b => { b.disabled = true; });
    esito.style.color = "#64748b";
    esito.textContent = "Salvataggio…";

    const patch = azione === "conferma"
      ? { stato: "confermato", confermato_da: window.state?.user?.id || null,
          confermato_il: new Date().toISOString() }
      : { stato: "scartato" };

    const { error: errUpd } = await supabase
      .from("eventi_territorio")
      .update(patch)
      .eq("id", id)
      .eq("azienda_id", azienda.id);

    if (errUpd) {
      console.error("aggiornamento evento:", errUpd);
      card.querySelectorAll("button").forEach(b => { b.disabled = false; });
      esito.style.color = "#b42318";
      esito.textContent = "Non salvato: " + errUpd.message;
      return;
    }

    if (azione === "scarta") {
      card.style.transition = "opacity .2s";
      card.style.opacity = "0";
      setTimeout(() => card.remove(), 220);
      return;
    }

    card.classList.add("ev-ok");
    esito.style.color = "#15803d";
    esito.textContent = "Confermato.";
    btn.remove();
  });
}
