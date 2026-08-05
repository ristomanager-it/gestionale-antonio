// js/views/servizi-eventi.js
// Le due cose che rendono i preventivi veloci: il listino dei servizi che
// vendi (col fornitore dietro e i due prezzi) e quante persone servono in sala
// per ogni tipo di festa. Si compilano una volta, poi il preventivo pesca da qui.

let vista = "servizi";

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  container.innerHTML = `<div class="se"><div class="se-caric">Un attimo…</div></div>${stile()}`;
  await disegna();

  async function disegna() {
    const [srv, reg, forn, dip, tem, cf, sal] = await Promise.all([
      supabase.from("servizi_evento").select("*").eq("azienda_id", azienda.id).order("categoria").order("nome"),
      supabase.from("regole_personale").select("*").eq("azienda_id", azienda.id).eq("attiva", true).order("tipo_evento"),
      supabase.from("fornitori").select("id, ragione_sociale").eq("azienda_id", azienda.id).order("ragione_sociale").limit(500),
      supabase.from("dipendenti").select("mansione, ruolo, costo_orario").eq("azienda_id", azienda.id).eq("attivo", true),
      supabase.from("preventivi_temi").select("*").eq("azienda_id", azienda.id).order("tipo_evento"),
      supabase.from("preventivi_config").select("*").eq("azienda_id", azienda.id).maybeSingle(),
      supabase.from("sala_piantina").select("*").eq("azienda_id", azienda.id).order("nome"),
    ]);
    const servizi = srv.data || [];
    const regole = reg.data || [];
    const fornitori = forn.data || [];
    const temi = tem.data || [];
    const cfg = cf.data || {};
    const sale = sal.data || [];

    // costo orario medio per mansione: serve per far vedere quanto pesa una regola
    const perMansione = {};
    (dip.data || []).forEach(d => {
      const c = Number(d.costo_orario) || 0;
      if (c <= 0) return;
      const k = norm(d.mansione || d.ruolo || "");
      if (!k) return;
      (perMansione[k] = perMansione[k] || []).push(c);
    });
    const mediaDi = (m) => {
      const k = norm(m);
      const v = perMansione[k] || Object.entries(perMansione).find(([kk]) => kk.includes(k) || k.includes(kk))?.[1];
      return v && v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    };

    container.innerHTML = `
      <div class="se">
        <h1>🎪 Servizi e personale eventi</h1>
        <p class="se-sub">Da qui il preventivo pesca i servizi da vendere e calcola quante persone servono in sala.</p>

        <div class="se-tab">
          <button data-vista="servizi" class="${vista === "servizi" ? "on" : ""}">Listino servizi</button>
          <button data-vista="personale" class="${vista === "personale" ? "on" : ""}">Personale per evento</button>
          <button data-vista="temi" class="${vista === "temi" ? "on" : ""}">Aspetto del documento</button>
          <button data-vista="pagamenti" class="${vista === "pagamenti" ? "on" : ""}">Pagamenti e testi</button>
          <button data-vista="sale" class="${vista === "sale" ? "on" : ""}">Sale e piantine</button>
        </div>

        ${vista === "sale" ? `
          <div class="se-card">
            <h2>Le vostre sale</h2>
            <div class="aiuto">Caricate la piantina della sala e segnate dove stanno le cose fisse:
              ingresso, musica, buffet, torta. Gli sposi ci sistemano i tavoli sopra, ma quelle non le spostano.</div>
          </div>

          ${sale.map(sa => `
            <div class="se-sala">
              <div class="testa">
                <input class="in nome" value="${esc(sa.nome)}" data-sala="${sa.id}" data-campo="nome">
                <label class="max">Tavoli che ci stanno
                  <input class="in" type="number" min="1" value="${sa.max_tavoli || ""}"
                    data-sala="${sa.id}" data-campo="max_tavoli"></label>
              </div>

              <div class="mappa" data-mappa="${sa.id}"
                style="${sa.sfondo_url ? `background-image:url('${esc(sa.sfondo_url)}');background-size:cover;background-position:center;` : ""}">
                ${(sa.elementi || []).map((el, i) => `
                  <div class="el" data-el="${sa.id}|${i}"
                    style="left:${el.x}%;top:${el.y}%;">${esc(el.etichetta || el.tipo)}</div>`).join("")}
                ${!sa.sfondo_url ? `<div class="senza">Nessuna piantina caricata</div>` : ""}
              </div>

              <div class="azioni">
                <label class="se-btn piccolo">
                  <input type="file" accept="image/*" data-sfondo="${sa.id}" style="display:none;">
                  ${sa.sfondo_url ? "Cambia piantina" : "Carica la piantina"}
                </label>
                ${["Ingresso","Musica","Buffet","Torta","Bar","Palco","Torta nuziale"].map(t =>
                  `<button class="se-btn piccolo chiaro" data-aggiungi="${sa.id}|${t}">+ ${t}</button>`).join("")}
              </div>
              <div class="aiuto">Gli elementi si aggiungono al centro: trascinateli dove stanno davvero.</div>
            </div>`).join("")}

          <div class="se-card">
            <h2>Aggiungi una sala</h2>
            <div class="se-form">
              <input id="sa-nome" class="in" placeholder="Nome della sala">
              <input id="sa-max" class="in" type="number" min="1" placeholder="Quanti tavoli ci stanno">
              <button class="se-btn" id="sa-add">Aggiungi</button>
            </div>
          </div>
        ` : vista === "pagamenti" ? `
          <div class="se-card">
            <h2>Come il cliente versa l'acconto</h2>
            <div class="aiuto">Compaiono nella pagina del cliente solo quando il preventivo ha un acconto.
              Un acconto che richiede una telefonata spesso non arriva.</div>
            <div class="se-form" style="margin-top:12px;">
              <input class="in" placeholder="Intestatario del conto" value="${esc(cfg.intestatario || "")}" data-cfg="intestatario">
              <input class="in" placeholder="IBAN" value="${esc(cfg.iban || "")}" data-cfg="iban">
              <input class="in" placeholder="Banca" value="${esc(cfg.banca || "")}" data-cfg="banca">
              <input class="in" placeholder="Link per pagare con carta" value="${esc(cfg.link_pagamento || "")}" data-cfg="link_pagamento">
            </div>
            <label style="display:block;margin-top:12px;">
              <span class="aiuto">Causale — {evento} {cliente} {data} vengono sostituiti</span>
              <input class="in" value="${esc(cfg.causale_modello || "")}" data-cfg="causale_modello">
            </label>
            <label style="display:block;margin-top:12px;">
              <span class="aiuto">Cosa scrivere sopra i dati di pagamento</span>
              <textarea class="in" rows="3" data-cfg="testo_pagamento">${esc(cfg.testo_pagamento || "")}</textarea>
            </label>
          </div>

          <div class="se-card">
            <h2>I testi del documento</h2>
            <label style="display:block;">
              <span class="aiuto">Messaggio iniziale</span>
              <textarea class="in" rows="4" data-cfg="intro">${esc(cfg.intro || "")}</textarea>
            </label>
            <label style="display:block;margin-top:12px;">
              <span class="aiuto">Condizioni in fondo</span>
              <textarea class="in" rows="3" data-cfg="condizioni">${esc(cfg.condizioni || "")}</textarea>
            </label>
            <label style="display:block;margin-top:12px;">
              <span class="aiuto">Testo quando la proposta è scaduta</span>
              <textarea class="in" rows="2" data-cfg="testo_scaduto">${esc(cfg.testo_scaduto || "")}</textarea>
            </label>
            <div class="se-form" style="margin-top:12px;">
              <label class="aiuto">Validità di serie (giorni)
                <input class="in" type="number" min="1" value="${cfg.giorni_validita_default || 15}" data-cfg="giorni_validita_default"></label>
              <label class="aiuto">Variazione invitati accettata da sola
                <input class="in" type="number" min="0" value="${cfg.invitati_variazione_max ?? 20}" data-cfg="invitati_variazione_max"></label>
            </div>
          </div>
        ` : vista === "temi" ? `
          <div class="se-card">
            <h2>Come si presenta la proposta</h2>
            <div class="aiuto">La testata del documento che riceve il cliente cambia col tipo di evento:
              i due colori fanno la sfumatura, la frase è quella che legge per prima.
              Se metti l'indirizzo di una foto, quella prende il posto dei colori.</div>
          </div>

          <div class="se-lista">
            ${temi.map(t => `
              <div class="se-tema">
                <div class="anteprima" style="background:${t.immagine_url
                    ? `linear-gradient(180deg,rgba(0,0,0,.42),rgba(0,0,0,.62)), url('${esc(t.immagine_url)}') center/cover`
                    : `linear-gradient(160deg, ${esc(t.colore || "#023C59")}, ${esc(t.colore2 || "#7FA3B8")})`};">
                  <span class="occ">${esc(t.occhiello || "")}</span>
                  <span class="nomi">Nome &amp; Nome</span>
                </div>
                <div class="campi">
                  <div class="tipo">${esc(t.tipo_evento)}</div>
                  <label>Frase<input class="in" value="${esc(t.occhiello || "")}" data-tema="${t.id}" data-campo="occhiello"></label>
                  <div class="colori">
                    <label>Colore<input type="color" value="${esc(t.colore || "#023C59")}" data-tema="${t.id}" data-campo="colore"></label>
                    <label>Sfumatura<input type="color" value="${esc(t.colore2 || "#7FA3B8")}" data-tema="${t.id}" data-campo="colore2"></label>
                  </div>
                  <div class="foto-riga">
                    <label class="carica-foto">
                      <input type="file" accept="image/*" data-foto-tema="${t.id}" style="display:none;">
                      <span>${t.immagine_url ? "🖼️ Cambia foto" : "🖼️ Carica una foto"}</span>
                    </label>
                    ${t.immagine_url ? `<button class="x del" data-togli-foto="${t.id}">Togli</button>` : ""}
                  </div>
                  <div class="aiuto" style="margin-top:5px;">${t.immagine_url
                    ? "La foto copre i colori. Toglila per tornare alla sfumatura."
                    : "Senza foto vale la sfumatura dei due colori."}</div>
                </div>
              </div>`).join("")}
          </div>
        ` : vista === "servizi" ? `
          <div class="se-card">
            <h2>Aggiungi un servizio</h2>
            <div class="se-form">
              <select id="s-cat" class="in">
                ${CATEGORIE.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
              <input id="s-nome" class="in" placeholder="Nome (es. Servizio fotografico)">
              <select id="s-forn" class="in">
                <option value="">— fornitore, se c'è —</option>
                ${fornitori.map(f => `<option value="${f.id}">${esc(f.ragione_sociale)}</option>`).join("")}
              </select>
              <input id="s-costo" class="in" type="number" step="0.01" placeholder="Quanto lo paghi">
              <input id="s-prezzo" class="in" type="number" step="0.01" placeholder="Quanto lo vendi">
              <select id="s-unita" class="in">
                <option value="forfait">a forfait</option>
                <option value="a persona">a persona</option>
                <option value="a ora">a ora</option>
              </select>
              <select id="s-conta" class="in">
                <option value="fisso">quantità fissa</option>
                <option value="ospiti">uno ogni tot ospiti</option>
                <option value="bambini">uno ogni tot bambini</option>
              </select>
              <input id="s-ogni" class="in" type="number" min="1" placeholder="ogni quanti">
              <input id="s-min" class="in" type="number" min="0" placeholder="minimo" value="1">
              <button class="se-btn" id="s-add">Aggiungi</button>
            </div>
            <div class="aiuto">Quanto lo paghi non esce mai dal locale: nella pagina del cliente compare solo il prezzo di vendita.
              I servizi "uno ogni tot" — baby sitter, hostess, sommelier — si contano da soli sul numero di ospiti o di bambini
              del preventivo, e quelli sui bambini spariscono quando i bambini sono zero.</div>
          </div>

          ${servizi.length ? `
            <div class="se-lista">
              ${servizi.map(s => {
                const c = Number(s.costo_fornitore) || 0, p = Number(s.prezzo_cliente) || 0;
                const marg = p > 0 && c > 0 ? ((p - c) / p) * 100 : null;
                return `
                <div class="se-riga ${s.attivo ? "" : "spento"}">
                  <div class="t">
                    <b>${esc(s.nome)}</b>
                    <span>${esc(s.categoria)}${s.fornitore_nome ? " · " + esc(s.fornitore_nome) : ""} · ${esc(s.unita)}${
                      s.conta_su !== "fisso" ? ` · uno ogni ${s.ogni} ${s.conta_su}${s.minimo ? ", minimo " + s.minimo : ""}` : ""}</span>
                  </div>
                  <div class="pz">
                    <div class="v">${euro(p)}</div>
                    ${c ? `<small>costo ${euro(c)}${marg != null ? " · " + marg.toFixed(0) + "%" : ""}</small>` : `<small>costo non indicato</small>`}
                  </div>
                  <button class="x" data-toggle="${s.id}" data-attivo="${s.attivo}">${s.attivo ? "Disattiva" : "Riattiva"}</button>
                  <button class="x del" data-del="${s.id}">✕</button>
                </div>`;
              }).join("")}
            </div>` : `<div class="se-vuoto">Il listino è vuoto: aggiungi il primo servizio qui sopra.</div>`}
        ` : `
          <div class="se-card">
            <h2>Quante persone servono in sala</h2>
            <div class="aiuto">Un addetto ogni tot ospiti, con una base minima sotto cui non si scende.
              Il preventivo usa la riga del tipo evento scelto, altrimenti quella chiamata "Altro".
              Qui va solo il personale <b>compreso nel prezzo</b>: le figure che vendi a parte — baby sitter,
              sommelier, hostess — stanno nel listino servizi, dove hanno un prezzo per il cliente.</div>
          </div>

          <div class="se-lista">
            ${regole.map(r => {
              const oraria = mediaDi(r.mansione) || 15;
              return `
              <div class="se-regola">
                <div class="t">
                  <b>${esc(r.tipo_evento)}</b>
                  <span>${esc(r.mansione)} · ${euro(oraria)} l'ora</span>
                  <button class="x del" data-del-reg="${r.id}" title="Togli questa regola">✕</button>
                </div>
                <div class="campi">
                  <label>1 ogni<input class="mini" type="number" min="1" value="${r.ospiti_per_addetto}" data-reg="${r.id}" data-campo="ospiti_per_addetto"></label>
                  <label>minimo<input class="mini" type="number" min="0" value="${r.minimo_addetti}" data-reg="${r.id}" data-campo="minimo_addetti"></label>
                  <label>ore<input class="mini" type="number" step="0.5" min="0" value="${r.ore_servizio}" data-reg="${r.id}" data-campo="ore_servizio"></label>
                </div>
                <div class="esempio">
                  100 ospiti → <b>${Math.max(Math.ceil(100 / (r.ospiti_per_addetto || 1)), r.minimo_addetti)}</b> in sala ·
                  ${euro(Math.max(Math.ceil(100 / (r.ospiti_per_addetto || 1)), r.minimo_addetti) * (Number(r.ore_servizio) || 0) * oraria)}
                </div>
              </div>`;
            }).join("")}
          </div>

          <div class="se-card">
            <h2>Aggiungi un tipo di evento</h2>
            <div class="se-form">
              <input id="r-tipo" class="in" placeholder="Tipo evento (deve combaciare col preventivo)">
              <input id="r-mansione" class="in" placeholder="Mansione (cameriere, sommelier…)" value="cameriere">
              <input id="r-ogni" class="in" type="number" min="1" placeholder="1 ogni quanti ospiti">
              <input id="r-min" class="in" type="number" min="0" placeholder="Minimo">
              <input id="r-ore" class="in" type="number" step="0.5" placeholder="Ore">
              <button class="se-btn" id="r-add">Aggiungi</button>
            </div>
          </div>
        `}
        <div id="se-esito" class="se-esito"></div>
      </div>
      ${stile()}`;

    container.querySelectorAll("[data-vista]").forEach(b =>
      b.addEventListener("click", () => { vista = b.dataset.vista; disegna(); }));

    container.querySelector("#s-add")?.addEventListener("click", async () => {
      const nome = (document.getElementById("s-nome")?.value || "").trim();
      if (!nome) return msg("Scrivi il nome del servizio.", true);
      const fid = document.getElementById("s-forn")?.value || null;
      const { error } = await supabase.from("servizi_evento").insert({
        azienda_id: azienda.id,
        categoria: document.getElementById("s-cat")?.value || "altro",
        nome,
        fornitore_id: fid ? Number(fid) : null,
        fornitore_nome: fid ? (fornitori.find(f => String(f.id) === String(fid))?.ragione_sociale || null) : null,
        costo_fornitore: Number(document.getElementById("s-costo")?.value) || null,
        prezzo_cliente: Number(document.getElementById("s-prezzo")?.value) || null,
        unita: document.getElementById("s-unita")?.value || "forfait",
        conta_su: document.getElementById("s-conta")?.value || "fisso",
        ogni: Number(document.getElementById("s-ogni")?.value) || null,
        minimo: Number(document.getElementById("s-min")?.value) || 1,
      });
      if (error) return msg("Errore: " + error.message, true);
      disegna();
    });

    container.querySelectorAll("[data-toggle]").forEach(b =>
      b.addEventListener("click", async () => {
        await supabase.from("servizi_evento").update({ attivo: b.dataset.attivo !== "true" }).eq("id", b.dataset.toggle);
        disegna();
      }));

    container.querySelectorAll("[data-del]").forEach(b =>
      b.addEventListener("click", async () => {
        if (!confirm("Tolgo questo servizio dal listino?")) return;
        await supabase.from("servizi_evento").delete().eq("id", b.dataset.del);
        disegna();
      }));

    container.querySelector("#sa-add")?.addEventListener("click", async () => {
      const nome = (document.getElementById("sa-nome")?.value || "").trim();
      if (!nome) return msg("Scrivi il nome della sala.", true);
      const { error } = await supabase.from("sala_piantina").insert({
        azienda_id: azienda.id, nome,
        max_tavoli: Number(document.getElementById("sa-max")?.value) || null,
        elementi: [] });
      if (error) return msg("Errore: " + error.message, true);
      disegna();
    });

    container.querySelectorAll("[data-sala]").forEach(el =>
      el.addEventListener("change", async () => {
        const patch = {};
        patch[el.dataset.campo] = el.type === "number" ? (Number(el.value) || null) : el.value;
        await supabase.from("sala_piantina").update(patch).eq("id", el.dataset.sala);
        msg("Salvato.");
      }));

    container.querySelectorAll("[data-sfondo]").forEach(inp =>
      inp.addEventListener("change", async (ev) => {
        const f = (ev.target.files || [])[0];
        if (!f) return;
        msg("Carico la piantina…");
        const path = `${azienda.id}/piantine/${inp.dataset.sfondo}-${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type, upsert: true });
        if (up.error) return msg("Non è andata: " + up.error.message, true);
        const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
        await supabase.from("sala_piantina").update({ sfondo_url: pub.publicUrl }).eq("id", inp.dataset.sfondo);
        disegna();
      }));

    container.querySelectorAll("[data-aggiungi]").forEach(b =>
      b.addEventListener("click", async () => {
        const [id, tipo] = b.dataset.aggiungi.split("|");
        const sa = sale.find(x => String(x.id) === id);
        const el = [...(sa?.elementi || []), { tipo: tipo.toLowerCase(), etichetta: tipo, x: 50, y: 50 }];
        await supabase.from("sala_piantina").update({ elementi: el }).eq("id", id);
        disegna();
      }));

    // trascinamento degli elementi fissi sulla piantina
    container.querySelectorAll("[data-el]").forEach(el => {
      let muovendo = false;
      const mappa = el.closest(".mappa");
      const sposta = (ev) => {
        if (!muovendo) return;
        const r = mappa.getBoundingClientRect();
        const p = ev.touches ? ev.touches[0] : ev;
        const x = Math.min(Math.max(((p.clientX - r.left) / r.width) * 100, 2), 98);
        const y = Math.min(Math.max(((p.clientY - r.top) / r.height) * 100, 2), 98);
        el.style.left = x + "%"; el.style.top = y + "%";
        ev.preventDefault();
      };
      const fine = async () => {
        if (!muovendo) return;
        muovendo = false;
        const [id, i] = el.dataset.el.split("|");
        const sa = sale.find(x => String(x.id) === id);
        const elementi = [...(sa?.elementi || [])];
        elementi[Number(i)] = { ...elementi[Number(i)],
          x: Math.round(parseFloat(el.style.left)), y: Math.round(parseFloat(el.style.top)) };
        await supabase.from("sala_piantina").update({ elementi }).eq("id", id);
        msg("Posizione salvata.");
      };
      el.addEventListener("mousedown", () => { muovendo = true; });
      el.addEventListener("touchstart", () => { muovendo = true; }, { passive: true });
      mappa?.addEventListener("mousemove", sposta);
      mappa?.addEventListener("touchmove", sposta, { passive: false });
      document.addEventListener("mouseup", fine);
      document.addEventListener("touchend", fine);
      el.addEventListener("dblclick", async () => {
        if (!confirm("Tolgo questo elemento?")) return;
        const [id, i] = el.dataset.el.split("|");
        const sa = sale.find(x => String(x.id) === id);
        const elementi = (sa?.elementi || []).filter((_, n) => n !== Number(i));
        await supabase.from("sala_piantina").update({ elementi }).eq("id", id);
        disegna();
      });
    });

    container.querySelectorAll("[data-cfg]").forEach(el =>
      el.addEventListener("change", async () => {
        const patch = {};
        const v = el.value;
        patch[el.dataset.cfg] = el.type === "number" ? (Number(v) || 0) : (v || null);
        const { error } = await supabase.from("preventivi_config")
          .upsert({ azienda_id: azienda.id, ...patch }, { onConflict: "azienda_id" });
        msg(error ? "Errore: " + error.message : "Salvato.", Boolean(error));
      }));

    container.querySelectorAll("[data-foto-tema]").forEach(inp =>
      inp.addEventListener("change", async (e) => {
        const f = (e.target.files || [])[0];
        if (!f) return;
        msg("Carico la foto…");
        try {
          const path = `${azienda.id}/temi-preventivo/${inp.dataset.fotoTema}-${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
          const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type, upsert: true });
          if (up.error) return msg("Non è andata: " + up.error.message, true);
          const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
          const { error } = await supabase.from("preventivi_temi")
            .update({ immagine_url: pub.publicUrl }).eq("id", inp.dataset.fotoTema);
          if (error) return msg("Errore: " + error.message, true);
          msg("Foto messa.");
          disegna();
        } catch (err) { msg("Non è andata: " + err.message, true); }
      }));

    container.querySelectorAll("[data-togli-foto]").forEach(b =>
      b.addEventListener("click", async () => {
        await supabase.from("preventivi_temi").update({ immagine_url: null }).eq("id", b.dataset.togliFoto);
        disegna();
      }));

    container.querySelectorAll("[data-tema]").forEach(el =>
      el.addEventListener("change", async () => {
        const patch = {};
        patch[el.dataset.campo] = el.value || null;
        const { error } = await supabase.from("preventivi_temi").update(patch).eq("id", el.dataset.tema);
        if (error) return msg("Errore: " + error.message, true);
        disegna();
      }));

    container.querySelectorAll("[data-del-reg]").forEach(b =>
      b.addEventListener("click", async () => {
        if (!confirm("Tolgo questa regola? Il preventivo non conterà più questa figura per quel tipo di evento.")) return;
        await supabase.from("regole_personale").delete().eq("id", b.dataset.delReg);
        disegna();
      }));

    container.querySelectorAll("[data-reg]").forEach(el =>
      el.addEventListener("change", async () => {
        const patch = {};
        patch[el.dataset.campo] = Number(el.value) || 0;
        const { error } = await supabase.from("regole_personale").update(patch).eq("id", el.dataset.reg);
        if (error) return msg("Errore: " + error.message, true);
        disegna();
      }));

    container.querySelector("#r-add")?.addEventListener("click", async () => {
      const tipo = (document.getElementById("r-tipo")?.value || "").trim();
      if (!tipo) return msg("Scrivi il tipo di evento.", true);
      const { error } = await supabase.from("regole_personale").insert({
        azienda_id: azienda.id, tipo_evento: tipo,
        mansione: (document.getElementById("r-mansione")?.value || "cameriere").trim(),
        ospiti_per_addetto: Number(document.getElementById("r-ogni")?.value) || 25,
        minimo_addetti: Number(document.getElementById("r-min")?.value) || 0,
        ore_servizio: Number(document.getElementById("r-ore")?.value) || 6,
      });
      if (error) return msg("Errore: " + error.message, true);
      disegna();
    });

    function msg(t, ko) {
      const e = container.querySelector("#se-esito");
      if (e) { e.textContent = t; e.className = "se-esito " + (ko ? "ko" : "ok"); }
    }
  }
}

const CATEGORIE = ["fotografia", "video", "auto", "allestimenti", "fiori", "musica",
  "animazione", "noleggi", "sala", "trasporti", "altro"];

function euro(n) { return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .se{--navy:#023C59;--arancio:#E66101;--verde:#348127;--rosso:#B91C1C;--riga:#E2E6EA;--muto:#6B7A83;
      max-width:820px;margin:0 auto;padding:16px 14px 70px;color:#12232E;}
  .se-caric{padding:40px;text-align:center;color:#94a3b8;}
  .se h1{font-size:22px;margin:0 0 4px;}
  .se-sub{font-size:13.5px;color:var(--muto);margin-bottom:16px;}
  .se-tab{display:flex;gap:7px;margin-bottom:14px;}
  .se-tab button{flex:1;border:1px solid var(--riga);background:#fff;border-radius:10px;padding:10px;
    font-size:14px;font-family:inherit;color:var(--muto);cursor:pointer;}
  .se-tab button.on{background:var(--navy);color:#fff;border-color:var(--navy);font-weight:700;}
  .se-card{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:16px;margin-bottom:14px;}
  .se-card h2{font-size:16px;margin-bottom:10px;}
  .se .aiuto{font-size:12.5px;color:var(--muto);line-height:1.5;margin-top:9px;}
  .se-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;}
  .se .in{width:100%;padding:10px;border:1.5px solid var(--riga);border-radius:10px;font-size:15px;font-family:inherit;background:#fff;}
  .se-btn{background:var(--navy);color:#fff;border:none;border-radius:10px;padding:11px 18px;font-size:15px;
    font-weight:700;cursor:pointer;font-family:inherit;}
  .se-lista{background:#fff;border:1px solid var(--riga);border-radius:16px;overflow:hidden;margin-bottom:14px;}
  .se-riga{display:flex;align-items:center;gap:11px;padding:12px 15px;border-top:1px solid #F1F4F6;flex-wrap:wrap;}
  .se-riga:first-child{border-top:none;}
  .se-riga.spento{opacity:.5;}
  .se-riga .t{flex:1;min-width:150px;}
  .se-riga .t b{font-size:15px;}
  .se-riga .t span{display:block;font-size:12.5px;color:var(--muto);}
  .se-riga .pz{text-align:right;}
  .se-riga .pz .v{font-weight:700;color:var(--navy);font-size:15.5px;}
  .se-riga .pz small{font-size:11.5px;color:var(--muto);}
  .se-riga .x{background:#fff;border:1.5px solid var(--riga);border-radius:9px;padding:7px 11px;
    font-size:12.5px;cursor:pointer;font-family:inherit;color:var(--muto);}
  .se-riga .x.del{color:var(--rosso);border-color:#FECACA;}
  .se-regola{padding:13px 15px;border-top:1px solid #F1F4F6;}
  .se-regola:first-child{border-top:none;}
  .se-regola .t{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
  .se-regola .t b{font-size:15px;}
  .se-regola .t .del{margin-left:auto;background:#fff;border:1.5px solid #FECACA;color:var(--rosso);
    border-radius:8px;padding:4px 9px;font-size:12px;cursor:pointer;font-family:inherit;}
  .se-regola .t span{display:block;font-size:12.5px;color:var(--muto);}
  .se-regola .campi{display:flex;gap:12px;margin:9px 0 7px;flex-wrap:wrap;}
  .se-regola label{font-size:12.5px;color:var(--muto);display:flex;align-items:center;gap:6px;}
  .se .mini{width:72px;padding:7px;border:1.5px solid var(--riga);border-radius:8px;font-size:14px;text-align:right;font-family:inherit;}
  .se-regola .esempio{font-size:12.5px;color:#9A6A00;background:#FFFCF3;border:1px solid #F5DFA0;
    border-radius:8px;padding:7px 10px;display:inline-block;}
  .se-vuoto{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:18px;color:var(--muto);font-size:14px;}
  .se-tema{display:flex;gap:14px;padding:14px 15px;border-top:1px solid #F1F4F6;flex-wrap:wrap;}
  .se-tema:first-child{border-top:none;}
  .se-tema .anteprima{width:190px;min-height:96px;border-radius:12px;color:#fff;padding:14px;
    display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;}
  .se-tema .anteprima .occ{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;opacity:.9;}
  .se-tema .anteprima .nomi{font-family:Georgia,serif;font-size:19px;margin-top:5px;}
  .se-tema .campi{flex:1;min-width:230px;}
  .se-tema .tipo{font-weight:700;font-size:15px;margin-bottom:7px;}
  .se-tema label{display:block;font-size:12px;color:var(--muto);margin-bottom:7px;}
  .se-tema .colori{display:flex;gap:14px;}
  .se-tema .foto-riga{display:flex;gap:8px;align-items:center;margin-top:4px;}
  .se-tema .carica-foto{margin:0;cursor:pointer;background:#fff;border:1.5px solid var(--riga);
    border-radius:9px;padding:9px 13px;font-size:13.5px;color:var(--navy);font-weight:700;display:inline-block;}
  .se-tema .x.del{background:#fff;border:1.5px solid #FECACA;color:var(--rosso);border-radius:9px;
    padding:9px 12px;font-size:13px;cursor:pointer;font-family:inherit;}
  .se-tema input[type=color]{width:52px;height:34px;border:1px solid var(--riga);border-radius:8px;
    background:#fff;padding:2px;cursor:pointer;display:block;margin-top:3px;}
  .se-sala{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:16px;margin-bottom:14px;}
  .se-sala .testa{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px;}
  .se-sala .testa .nome{flex:1;min-width:160px;font-weight:700;}
  .se-sala .testa .max{font-size:12px;color:var(--muto);}
  .se-sala .testa .max input{width:110px;margin-top:4px;}
  .se-sala .mappa{position:relative;height:320px;border:1px solid var(--riga);border-radius:12px;
    background-color:#fff;overflow:hidden;touch-action:none;
    background-image:linear-gradient(#F3F5F7 1px,transparent 1px),linear-gradient(90deg,#F3F5F7 1px,transparent 1px);
    background-size:26px 26px;}
  .se-sala .el{position:absolute;transform:translate(-50%,-50%);background:#EEF0F2;border:1px dashed #C7CDD2;
    border-radius:8px;padding:6px 12px;font-size:11.5px;font-weight:700;color:var(--muto);
    text-transform:uppercase;letter-spacing:.06em;cursor:grab;white-space:nowrap;user-select:none;}
  .se-sala .senza{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    color:#B9C2C8;font-size:13.5px;pointer-events:none;}
  .se-sala .azioni{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px;}
  .se-btn.piccolo{padding:8px 13px;font-size:12.5px;cursor:pointer;display:inline-block;}
  .se-btn.chiaro{background:#fff;border:1.5px solid var(--riga);color:var(--navy);}
  .se-esito{margin-top:10px;font-size:14px;}
  .se-esito.ok{color:var(--verde);} .se-esito.ko{color:var(--rosso);}
  </style>`;
}
