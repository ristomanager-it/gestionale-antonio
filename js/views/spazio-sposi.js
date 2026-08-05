// js/views/spazio-sposi.js
// Rotta PUBBLICA #/spazio?t=TOKEN — lo spazio di chi si sposa o festeggia.
// Sei sezioni: Invitati, Da fare, Fornitori, Ricevimento, Idee, La pagina.
// Il token degli sposi è diverso da quello degli invitati: da qui si vede tutto
// del proprio evento, da lì nessun prezzo.

let D = null, T = null, M = null, X = null, sez = "invitati", token = "", tavoloAperto = null, piano = null;

// nomi pronti per i tavoli: la domanda che fanno tutti
const TEMI_NOMI = {
  "Città": ["Roma","Parigi","Lisbona","Vienna","Praga","Siviglia","Atene","Oslo","Dublino","Berlino","Napoli","Amsterdam"],
  "Isole": ["Ponza","Ischia","Capri","Ustica","Favignana","Pantelleria","Lipari","Salina","Elba","Giglio","Procida","Stromboli"],
  "Vini": ["Barolo","Amarone","Brunello","Etna Rosso","Franciacorta","Verdicchio","Falanghina","Sagrantino","Cesanese","Vermentino","Nero d'Avola","Timorasso"],
  "Fiori": ["Peonia","Rosa","Lavanda","Girasole","Glicine","Ortensia","Mimosa","Tulipano","Iris","Camelia","Gelsomino","Magnolia"],
  "Film": ["Casablanca","Amarcord","Titanic","Notting Hill","La La Land","Il Postino","Ratatouille","Amélie","Cinema Paradiso","Grease","Rocky","Su e giù"],
  "Musica": ["Adagio","Allegro","Bolero","Notturno","Serenata","Ninna nanna","Ouverture","Ritornello","Rapsodia","Sonata","Valzer","Tango"],
};

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  token = (new URLSearchParams((location.hash.split("?")[1] || ""))).get("t") || "";
  if (!token) { container.innerHTML = guscio(`<div class="sp-err">Collegamento incompleto.</div>`); return; }

  container.innerHTML = guscio(`<div class="sp-caric">Un attimo…</div>`);
  try {
    const [a, b, c, x] = await Promise.all([
      supabase.rpc("spazio_sposi", { p_token: token }),
      supabase.rpc("spazio_tableau", { p_token: token, p_piano: piano }),
      supabase.rpc("spazio_menu", { p_token: token }),
      supabase.rpc("spazio_dettagli", { p_token: token }),
    ]);
    D = a.data; T = b.data?.ok ? b.data : null; M = c.data?.ok ? c.data : null;
    X = x.data?.ok ? x.data : {};
  } catch (e) { console.error(e); }

  if (!D?.ok) { container.innerHTML = guscio(`<div class="sp-err">${esc(D?.errore || "Non riesco a caricare lo spazio.")}</div>`); return; }
  disegna(container, supabase);
}

function disegna(container, supabase) {
  const t = D.tema || {};
  const c = D.conteggi || {};
  const linguette = [["invitati","Invitati"],["tavoli","Tavoli"],["dafare","Da fare"],["fornitori","Fornitori"],
                     ["ricevimento","Ricevimento"],["idee","Idee"],["pagina","La pagina"]];

  container.innerHTML = guscio(`
    <div class="sp-foglio">
      <div class="sp-testa">
        <div class="sp-oc">${esc(t.occhiello || "Il vostro evento")}</div>
        <h1>${esc(D.titolo || "")}</h1>
        <div class="sp-q">${esc(dataLunga(D.data))}</div>
        ${D.data ? `<div class="sp-conto">${mancano(D.data)}</div>` : ""}
      </div>

      <div class="sp-nav">
        ${linguette.map(([k, l]) => `<button data-sez="${k}" class="${sez === k ? "on" : ""}">${l}</button>`).join("")}
      </div>

      <div class="sp-corpo">${pagina()}</div>

      <div class="sp-pie">Compreso nel vostro ricevimento</div>
    </div>`, t);

  container.querySelectorAll("[data-sez]").forEach(b =>
    b.addEventListener("click", () => { sez = b.dataset.sez; disegna(container, supabase); window.scrollTo(0, 0); }));

  aggancia(container, supabase);

  function pagina() {
    if (sez === "invitati") return `
      <div class="sp-k3">
        <div><b>${c.confermati || 0}</b><span>confermati</span></div>
        <div><b>${c.attesa || 0}</b><span>in attesa</span></div>
        <div><b>${c.allergie || 0}</b><span>allergie</span></div>
      </div>
      <div class="sp-card">
        ${(D.invitati || []).length ? D.invitati.map(i => `
          <div class="r">
            <div class="t"><b>${esc(i.nome)}</b>
              <span>${i.quanti} ${i.quanti === 1 ? "persona" : "persone"}${i.gruppo ? " · " + esc(i.gruppo) : ""}${
                (i.allergie || []).length ? " · " + i.allergie.map(esc).join(", ") : ""}</span></div>
            <span class="pill ${i.stato === "confermato" ? "si" : i.stato === "assente" ? "no" : "forse"}">${
              i.stato === "confermato" ? "c'è" : i.stato === "assente" ? "non può" : i.stato === "forse" ? "in forse" : "in attesa"}</span>
          </div>`).join("") : `<div class="vuoto">Nessun invitato ancora. Aggiungeteli qui sotto.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Aggiungi un invitato</div>
        <div class="g">
          <input id="in-nome" placeholder="Nome e cognome">
          <input id="in-quanti" type="number" min="1" value="1" placeholder="quanti">
          <input id="in-tel" placeholder="Telefono">
          <input id="in-gruppo" placeholder="Gruppo (famiglia, amici…)">
        </div>
        <button class="sp-btn" id="in-add">Aggiungi</button>
      </div>
      <button class="sp-btn ch" id="sp-link-invito">🔗 Copia il link dell'invito</button>`;

    if (sez === "tavoli") {
      if (!T) return `
        <div class="sp-chiuso">Non riesco a caricare i tavoli.
          Riprova tra poco: se resta così, scriveteci.</div>`;
      const seduti = (T.tavoli || []).reduce((a, t) => a + (t.seduti || 0), 0);
      const restano = (T.da_sedere || []).reduce((a, i) => a + (i.quanti || 0), 0);
      return `
      <div class="sp-piani">
        ${["A","B"].map(x => `
          <button data-piano="${x}" class="${(T.piano || "A") === x ? "on" : ""}">
            Piano ${x}${(T.piano_attivo || "A") === x ? " ✓" : ""}</button>`).join("")}
        ${T.modificabile ? `<button class="copia" data-copia-piano="${T.piano === "B" ? "B|A" : "A|B"}">
          ⧉ Copia in ${T.piano === "B" ? "A" : "B"}</button>` : ""}
      </div>
      <div class="sott">
        Il piano con la spunta è quello che va in sala.
        ${(T.piano_attivo || "A") !== (T.piano || "A")
          ? `<button class="sp-mini" data-attiva-piano="${T.piano}">Fai valere questo</button>` : ""}
        <br>Ci si mettono solo gli invitati che hanno <b>già confermato</b>.
      </div>

      ${!T.modificabile ? `<div class="sp-chiuso">Il tableau è chiuso: mancano meno di 48 ore.
        Per un cambio scriveteci.</div>` : ""}

      <div class="sp-k3">
        <div><b>${seduti}</b><span>seduti</span></div>
        <div><b>${restano}</b><span>da sistemare</span></div>
        <div><b>${T.in_attesa || 0}</b><span>non hanno risposto</span></div>
      </div>

      ${(T.da_sedere || []).length ? `
        <h2>Da sistemare</h2>
        <div class="sp-card">
          ${T.da_sedere.map(i => `
            <div class="r">
              <div class="t"><b>${esc(i.nome)}</b><span>${i.quanti} ${i.quanti === 1 ? "persona" : "persone"}${
                i.gruppo ? " · " + esc(i.gruppo) : ""}${(i.allergie || []).length ? " · " + i.allergie.map(esc).join(", ") : ""}</span></div>
              ${T.modificabile && (T.tavoli || []).length ? `<button class="mini" data-siedi="${esc(i.id)}">Siedi ›</button>` : ""}
            </div>`).join("")}
        </div>` : `<div class="sp-ok">Tutti i confermati hanno un posto.</div>`}

      <h2>I tavoli</h2>
      ${(T.tavoli || []).length ? T.tavoli.map(t => `
        <div class="sp-tavolo ${t.seduti > t.posti ? "pieno" : ""}">
          <div class="cap">
            <b>${esc(t.nome)}</b>
            <span>${t.seduti}/${t.posti}${t.composto_da ? " · composto da " + t.composto_da : ""}</span>
            ${T.modificabile ? `<button class="x" data-togli-tavolo="${esc(t.id)}">✕</button>` : ""}
          </div>
          ${(t.persone || []).map(pz => `
            <div class="p">
              <div class="t">${esc(pz.nome)}${pz.quanti > 1 ? ` <small>×${pz.quanti}</small>` : ""}${
                (pz.allergie || []).length ? `<span class="all">${pz.allergie.map(esc).join(", ")}</span>` : ""}</div>
              ${T.modificabile ? `<button class="x" data-alza="${esc(pz.id)}">alza</button>` : ""}
            </div>`).join("")}
          ${!(t.persone || []).length ? `<div class="vuotino">nessuno seduto</div>` : ""}
        </div>`).join("") : `<div class="sp-card"><div class="vuoto">Nessun tavolo. Createne uno qui sotto.</div></div>`}

      ${T.modificabile ? `
        <div class="sp-mod">
          <div class="tit">Crea un tavolo</div>
          <div class="g">
            <input id="tv-nome" placeholder="Nome o numero">
            <select id="tv-forma">
              <option value="rotondo">Rotondo</option>
              <option value="rettangolare">Rettangolare</option>
              <option value="imperiale">Imperiale</option>
              <option value="composto">Composto (gruppo grande)</option>
              <option value="sposi">Tavolo degli sposi</option>
            </select>
            <input id="tv-posti" type="number" min="1" value="10" placeholder="posti">
            <input id="tv-comp" type="number" min="2" placeholder="quanti tavoli uniti">
          </div>
          <button class="sp-btn" id="tv-add">Aggiungi il tavolo</button>
          <div class="aiutino">Per amici o colleghi in quindici o venti, scegli <b>composto</b> e indica
            quanti tavoli si uniscono: serve a noi per la sala.</div>
        </div>

        <h2>Come chiamare i tavoli</h2>
        <div class="sp-temi">
          ${Object.keys(TEMI_NOMI).map(k => `<button data-tema="${k}">${k}</button>`).join("")}
        </div>
        <div class="aiutino">Rinomina tutti i tavoli con il tema scelto. Il tavolo degli sposi non si tocca.</div>` : ""}`;
    }

    if (sez === "dafare") {
      const fatte = (D.checklist || []).filter(x => x.fatta).length;
      const fasi = [...new Set((D.checklist || []).map(x => x.fase))];
      return `
      <div class="sp-avanz">
        <div class="n"><b>${fatte} su ${(D.checklist || []).length}</b><span>cose fatte</span></div>
        <div class="barra"><i style="width:${(D.checklist || []).length ? Math.round(fatte / D.checklist.length * 100) : 0}%"></i></div>
      </div>
      ${fasi.map(f => `
        <h2>${esc(f)}</h2>
        <div class="sp-card">
          ${D.checklist.filter(x => x.fase === f).map(x => `
            <div class="r ${x.fatta ? "fatto" : ""}">
              <i class="box" data-voce="${esc(x.id)}" data-fatta="${x.fatta}"></i>
              <div class="t"><b>${esc(x.voce)}</b>${x.scadenza ? `<span>entro il ${data(x.scadenza)}</span>` : ""}</div>
              <span class="tag ${x.di_chi === "noi" ? "noi" : "voi"}">${x.di_chi === "noi" ? "con noi" : "vostro"}</span>
            </div>`).join("")}
        </div>`).join("")}
      <div class="sp-mod">
        <div class="tit">Aggiungete una cosa da fare</div>
        <div class="g"><input id="ck-voce" placeholder="Cosa c'è da fare"><input id="ck-quando" type="date"></div>
        <button class="sp-btn" id="ck-add">Aggiungi</button>
      </div>`;
    }

    if (sez === "fornitori") return `
      <div class="sott">Chi lavora al vostro evento, con l'ora in cui arriva.</div>
      <div class="sp-card">
        ${(D.fornitori || []).length ? D.fornitori.map(f => `
          <div class="r">
            <div class="t"><b>${esc(f.nome)}</b><span>${esc(f.categoria)}${f.referente ? " · " + esc(f.referente) : ""}${
              f.telefono ? " · " + esc(f.telefono) : ""}</span>
              <span class="soldi">
                <input type="number" step="0.01" placeholder="costo" value="${f.importo ?? ""}"
                  data-forn="${esc(f.id)}" data-campo="importo"> €
                <input type="number" step="0.01" placeholder="acconto" value="${f.acconto ?? ""}"
                  data-forn="${esc(f.id)}" data-campo="acconto"> versati
              </span></div>
            <em>${f.ora_arrivo ? String(f.ora_arrivo).slice(0, 5) : "—"}</em>
          </div>`).join("") : `<div class="vuoto">Nessun fornitore ancora.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Aggiungi un fornitore</div>
        <div class="g">
          <select id="fo-cat">
            <option>Fotografo</option><option>Video</option><option>Fiorista</option><option>Musica</option>
            <option>Parrucchiere</option><option>Trucco</option><option>Auto</option><option>Abito</option>
            <option>Bomboniere</option><option>Altro</option>
          </select>
          <input id="fo-nome" placeholder="Nome dell'azienda">
          <input id="fo-ref" placeholder="Referente">
          <input id="fo-tel" placeholder="Telefono">
          <input id="fo-ora" type="time">
          <select id="fo-dove">
            <option>in location</option><option>a casa</option><option>in chiesa</option>
          </select>
        </div>
        <button class="sp-btn" id="fo-add">Aggiungi</button>
      </div>
      ${(D.strutture || []).length ? `
        <h2>Dove far dormire chi viene da fuori</h2>
        <div class="sp-card">
          ${D.strutture.map(s => `<div class="r"><div class="t"><b>${esc(s.nome)}</b>
            <span>${esc(s.distanza || "")}</span></div><em>${s.prezzo ? euro(s.prezzo) : ""}</em></div>`).join("")}
        </div>` : ""}`;

    if (sez === "ricevimento") {
      const r = D.ricevimento;
      return `
      <div class="sott">Quello che avete preso con noi.</div>
      ${r ? `<div class="sp-card">
        <div class="r"><div class="t"><b>Invitati previsti</b></div><em>${r.invitati || "—"}</em></div>
        <div class="r"><div class="t"><b>Totale</b></div><em>${euro(r.totale)}</em></div>
        <div class="r"><div class="t"><b>Acconto versato</b></div><em>${euro(r.acconto)}</em></div>
        <div class="r"><div class="t"><b>Saldo il giorno dell'evento</b></div><em>${euro((r.totale || 0) - (r.acconto || 0))}</em></div>
      </div>` : `<div class="vuoto">Non c'è ancora un preventivo collegato.</div>`}
      ${(M?.portate || []).length ? `
        <h2>Il vostro menu</h2>
        <div class="sp-menu">
          ${[...new Set(M.portate.map(x => x.sezione))].map(s2 => `
            <div class="s">
              <div class="tit">${esc(s2)}${M.portate.find(x => x.sezione === s2 && x.per_bambini) ? " · bambini" : ""}</div>
              ${M.portate.filter(x => x.sezione === s2).map(x => `
                <div class="pi">${esc(x.nome)}${x.descrizione ? `<span>${esc(x.descrizione)}</span>` : ""}</div>`).join("")}
            </div>`).join("")}
        </div>` : ""}

      ${(D.extra_presi || []).length ? `
        <h2>Servizi compresi</h2>
        <div class="sp-card">
          ${D.extra_presi.map(x => `<div class="r"><div class="t"><b>${esc(x.descrizione)}</b></div>
            <em>${euro(x.prezzo)}</em></div>`).join("")}
        </div>` : ""}

      ${(D.extra_disponibili || []).length ? `
        <h2>Potete ancora aggiungere</h2>
        <div class="sp-card">
          ${D.extra_disponibili.map(x => `
            <div class="r"><div class="t"><b>${esc(x.nome)}</b>
              <span>${esc(x.descrizione || x.categoria)}</span></div>
              <em>${euro(x.prezzo)}${x.unita === "a persona" ? " a persona" : ""}</em></div>`).join("")}
        </div>
        <div class="sott" style="margin-top:9px;">Se ne volete uno, scriveteci: ve lo confermiamo con il prezzo aggiornato.</div>` : ""}

      <div class="sott" style="margin-top:16px;">Per aggiungere o cambiare qualcosa, scriveteci: vi rispondiamo con il prezzo aggiornato.</div>`;
    }

    if (sez === "idee") return `
      <h2>Le foto che vi piacciono</h2>
      <div class="sott">Torta, fiori, allestimenti: caricate quello che avete in mente.</div>
      <div class="sp-idee">
        ${(D.idee || []).map(i => `<div style="background-image:url('${esc(i.url)}')" title="${esc(i.nota || "")}"></div>`).join("")}
        <label class="piu"><input type="file" accept="image/*" multiple id="id-file" style="display:none;">＋</label>
      </div>
      <div id="id-esito" class="sott" style="margin-top:8px;"></div>
      <h2>I vostri appunti</h2>
      ${(D.appunti || []).length ? `<div class="sp-note">
        ${D.appunti.map(a => `· ${esc(a.testo)}`).join("<br>")}</div>` : ""}
      <div class="sp-mod">
        <div class="tit">Scrivi un appunto</div>
        <textarea id="ap-testo" rows="3" placeholder="Quello che vi viene in mente…"></textarea>
        <button class="sp-btn" id="ap-add">Salva</button>
      </div>`;

    // LA PAGINA
    const S = D.sezioni || {};
    const voci = [["invito","💌","Invito e conferma","con le allergie"],
                  ["come_arrivare","📍","Come arrivare","cerimonia e ricevimento"],
                  ["dress_code","👗","Come vestirsi","i vostri colori"],
                  ["hotel","🛏️","Dove dormire","strutture convenzionate"],
                  ["passaggi","🚗","Passaggi in auto","si organizzano tra loro"],
                  ["auguri","📖","Libro degli auguri","i messaggi degli invitati"],
                  ["annunci","📣","Annunci","scrivete voi, leggono loro"],
                  ["regali","🎁","Dove farci un regalo","i vostri link"]];
    return `
      <div class="sott">Questa è la pagina che vedono gli invitati. Accendete solo quello che volete.</div>
      <div class="sp-card">
        ${voci.map(([k, ic, tit, sub]) => `
          <div class="sw"><div class="ic">${ic}</div>
            <div class="t">${tit}<span>${sub}</span></div>
            <div class="tg ${String(S[k]) === "true" || S[k] === true ? "on" : ""}" data-sez-toggle="${k}"></div></div>`).join("")}
      </div>
      <h2>Componete la pagina</h2>
      <div class="sp-mod">
        <div class="tit">La foto in alto</div>
        <div class="sp-cop" style="${X.foto_copertina
          ? `background-image:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.55)),url('${esc(X.foto_copertina)}')` : ""}">
          ${X.foto_copertina ? "" : "<span>nessuna foto</span>"}
        </div>
        <label class="sp-btn ch" style="display:block;text-align:center;margin-top:8px;">
          <input type="file" accept="image/*" id="cop-file" style="display:none;">
          ${X.foto_copertina ? "Cambia foto" : "Carica una foto"}
        </label>
      </div>

      <div class="sp-mod">
        <div class="tit">Cosa scrivete agli invitati</div>
        <textarea id="dt-invito" rows="3" placeholder="Ci farebbe piacere averti con noi…">${esc(X.testo_invito || "")}</textarea>
      </div>

      <div class="sp-mod">
        <div class="tit">La cerimonia</div>
        <div class="g">
          <input id="dt-ora-cer" type="time" value="${esc((X.ora_cerimonia || "").slice(0,5))}">
          <input id="dt-luogo-cer" placeholder="Chiesa o comune" value="${esc(X.luogo_cerimonia || "")}">
        </div>
        <input id="dt-ind-cer" placeholder="Indirizzo" value="${esc(X.indirizzo_cerimonia || "")}" style="margin-top:8px;">
      </div>

      <div class="sp-mod">
        <div class="tit">Il ricevimento</div>
        <div class="g">
          <input id="dt-ora-ric" type="time" value="${esc((X.ora_ricevimento || "").slice(0,5))}">
          <input id="dt-luogo-ric" placeholder="Dove" value="${esc(X.luogo_ricevimento || "")}">
        </div>
        <input id="dt-ind-ric" placeholder="Indirizzo" value="${esc(X.indirizzo_ricevimento || "")}" style="margin-top:8px;">
      </div>

      <div class="sp-mod">
        <div class="tit">Come vestirsi</div>
        <textarea id="dt-dress" rows="2" placeholder="Elegante, senza esagerare…">${esc(X.dress_code || "")}</textarea>
        <div class="tit" style="margin-top:12px;">Se piove</div>
        <textarea id="dt-pioggia" rows="2" placeholder="Cosa succede se piove">${esc(X.piano_pioggia || "")}</textarea>
        <button class="sp-btn" id="dt-salva">Salva la pagina</button>
      </div>

      <div class="sp-mod">
        <div class="tit">Cosa chiedete agli invitati</div>
        ${(X.domande || []).map(q => `
          <div class="sp-dom"><span>${esc(q.testo)}</span>
            <button class="x" data-togli-domanda="${esc(q.id)}">✕</button></div>`).join("")}
        <div class="g" style="margin-top:8px;">
          <input id="dm-testo" placeholder="Es. ti serve il pullman?">
          <select id="dm-tipo">
            <option value="si_no">Sì / No</option>
            <option value="numero">Un numero</option>
            <option value="testo">Testo libero</option>
          </select>
        </div>
        <button class="sp-btn ch" id="dm-add">Aggiungi la domanda</button>
      </div>

      <button class="sp-btn" id="sp-apri-invito">Guarda com'è venuta</button>
      <button class="sp-btn ch" id="sp-link-invito2">🔗 Copia il link per gli invitati</button>

      <h2>Annunci</h2>
      <div class="sp-card">
        ${(D.annunci || []).length ? D.annunci.map(a => `
          <div class="r"><div class="t"><b>${esc(a.testo)}</b><span>${quando(a.quando)}</span></div></div>`).join("")
          : `<div class="vuoto">Nessun annuncio.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Scrivi un annuncio</div>
        <textarea id="an-testo" rows="2" placeholder="Es. chi vuole il pullman ce lo dica entro venerdì"></textarea>
        <button class="sp-btn" id="an-add">Pubblica</button>
      </div>

      <h2>I link per i regali</h2>
      <div class="sp-card">
        ${(D.regali || []).length ? D.regali.map(r => `
          <div class="r"><div class="t"><b>${esc(r.etichetta)}</b><span>${esc(r.dettaglio || "")}</span></div></div>`).join("")
          : `<div class="vuoto">Nessun link.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Aggiungi un link</div>
        <div class="g"><input id="rg-et" placeholder="Es. Lista in negozio"><input id="rg-url" placeholder="https://…"></div>
        <button class="sp-btn" id="rg-add">Aggiungi</button>
      </div>`;
  }
}

/* ── scritture ───────────────────────────────────────────────── */
function aggancia(container, supabase) {
  const ricarica = () => render(container);
  const v = (id) => (document.getElementById(id)?.value || "").trim();

  const tableau = (cosa, dati) => supabase.rpc("spazio_tableau_scrivi", {
    p_token: token, p_cosa: cosa, p_dati: { ...dati, piano: T?.piano || "A" } });

  container.querySelectorAll("[data-piano]").forEach(b =>
    b.addEventListener("click", () => { piano = b.dataset.piano; render(container); }));

  container.querySelectorAll("[data-copia-piano]").forEach(b =>
    b.addEventListener("click", async () => {
      const [da, a] = b.dataset.copiaPiano.split("|");
      if (!confirm(`Copio il piano ${da} nel piano ${a}?\n\n` +
        `Quello che c'è ora nel piano ${a} viene sostituito.`)) return;
      const { data } = await supabase.rpc("spazio_copia_piano", { p_token: token, p_da: da, p_a: a });
      if (data?.ok) { piano = a; render(container); }
      else alert(data?.errore || "Non è andata.");
    }));

  container.querySelectorAll("[data-attiva-piano]").forEach(b =>
    b.addEventListener("click", async () => {
      await supabase.rpc("spazio_piano_attivo", { p_token: token, p_piano: b.dataset.attivaPiano });
      render(container);
    }));

  container.querySelector("#tv-add")?.addEventListener("click", async () => {
    const forma = v("tv-forma") || "rotondo";
    await tableau("tavolo", {
      nome: v("tv-nome"), forma,
      posti: Number(v("tv-posti")) || 10,
      composto_da: forma === "composto" ? (Number(v("tv-comp")) || 2) : null });
    ricarica();
  });

  container.querySelectorAll("[data-togli-tavolo]").forEach(b =>
    b.addEventListener("click", async () => {
      if (!confirm("Tolgo questo tavolo? Chi era seduto torna tra quelli da sistemare.")) return;
      await tableau("togli_tavolo", { tavolo_id: b.dataset.togliTavolo });
      ricarica();
    }));

  container.querySelectorAll("[data-alza]").forEach(b =>
    b.addEventListener("click", async () => {
      await tableau("alza", { invitato_id: b.dataset.alza });
      ricarica();
    }));

  // sedere a tocchi: si sceglie il tavolo da un elenco, niente trascinamenti
  container.querySelectorAll("[data-siedi]").forEach(b =>
    b.addEventListener("click", async () => {
      const lista = (T?.tavoli || []).map((t, i) =>
        `${i + 1}. ${t.nome} (${t.seduti}/${t.posti})`).join("\n");
      const scelta = prompt("A che tavolo lo mettiamo?\n\n" + lista + "\n\nScrivi il numero:");
      const n = Number(scelta);
      if (!n || !T.tavoli[n - 1]) return;
      const r = await tableau("siedi", { invitato_id: b.dataset.siedi, tavolo_id: T.tavoli[n - 1].id });
      if (r.data?.pieno) alert(`Attenzione: ${T.tavoli[n - 1].nome} ha ${r.data.seduti} persone su ${r.data.posti} posti.`);
      ricarica();
    }));

  container.querySelectorAll("[data-tema]").forEach(b =>
    b.addEventListener("click", async () => {
      const tema = b.dataset.tema;
      if (!confirm(`Rinomino tutti i tavoli con i nomi "${tema}"?`)) return;
      await tableau("tema_nomi", { tema, nomi: TEMI_NOMI[tema] });
      ricarica();
    }));

  container.querySelector("#dt-salva")?.addEventListener("click", async () => {
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "dettagli", p_dati: {
      testo_invito: v("dt-invito"), dress_code: v("dt-dress"), piano_pioggia: v("dt-pioggia"),
      ora_cerimonia: v("dt-ora-cer"), luogo_cerimonia: v("dt-luogo-cer"), indirizzo_cerimonia: v("dt-ind-cer"),
      ora_ricevimento: v("dt-ora-ric"), luogo_ricevimento: v("dt-luogo-ric"), indirizzo_ricevimento: v("dt-ind-ric"),
    }});
    ricarica();
  });

  container.querySelector("#dm-add")?.addEventListener("click", async () => {
    if (!v("dm-testo")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "domanda", p_dati: {
      testo: v("dm-testo"), tipo: v("dm-tipo") }});
    ricarica();
  });

  container.querySelectorAll("[data-togli-domanda]").forEach(b =>
    b.addEventListener("click", async () => {
      await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "togli_domanda",
        p_dati: { id: b.dataset.togliDomanda }});
      ricarica();
    }));

  document.getElementById("cop-file")?.addEventListener("change", async (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    const path = `spazi/${token}/copertina-${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type });
    if (up.error) return alert("Non è andata: " + up.error.message);
    const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "dettagli",
      p_dati: { foto_copertina: pub.publicUrl }});
    ricarica();
  });

  container.querySelector("#in-add")?.addEventListener("click", async () => {
    if (!v("in-nome")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "invitato", p_dati: {
      nome: v("in-nome"), quanti: Number(v("in-quanti")) || 1,
      telefono: v("in-tel"), gruppo: v("in-gruppo") } });
    ricarica();
  });

  container.querySelector("#ck-add")?.addEventListener("click", async () => {
    if (!v("ck-voce")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "checklist", p_dati: {
      voce: v("ck-voce"), scadenza: v("ck-quando") || null } });
    ricarica();
  });

  container.querySelectorAll("[data-voce]").forEach(b =>
    b.addEventListener("click", async () => {
      await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "checklist_spunta", p_dati: {
        id: b.dataset.voce, fatta: b.dataset.fatta !== "true" } });
      ricarica();
    }));

  container.querySelector("#fo-add")?.addEventListener("click", async () => {
    if (!v("fo-nome")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "fornitore", p_dati: {
      categoria: v("fo-cat"), nome: v("fo-nome"), referente: v("fo-ref"),
      telefono: v("fo-tel"), ora_arrivo: v("fo-ora") || null, dove: v("fo-dove") } });
    ricarica();
  });

  container.querySelector("#ap-add")?.addEventListener("click", async () => {
    if (!v("ap-testo")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "appunto", p_dati: { testo: v("ap-testo") } });
    ricarica();
  });

  container.querySelector("#an-add")?.addEventListener("click", async () => {
    if (!v("an-testo")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "annuncio", p_dati: { testo: v("an-testo") } });
    ricarica();
  });

  container.querySelector("#rg-add")?.addEventListener("click", async () => {
    if (!v("rg-et")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "regalo", p_dati: {
      etichetta: v("rg-et"), url: v("rg-url") } });
    ricarica();
  });

  container.querySelectorAll("[data-sez-toggle]").forEach(b =>
    b.addEventListener("click", async () => {
      await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "sezione", p_dati: {
        chiave: b.dataset.sezToggle, attiva: !b.classList.contains("on") } });
      ricarica();
    }));

  const linkInvito = () => (location.origin + location.pathname).replace(/index\.html$/, "")
    + "#/invito?t=" + D.token_invitati;

  ["#sp-link-invito", "#sp-link-invito2"].forEach(s =>
    container.querySelector(s)?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(linkInvito()); alert("Link copiato:\n" + linkInvito()); }
      catch { prompt("Link per gli invitati:", linkInvito()); }
    }));

  container.querySelector("#sp-apri-invito")?.addEventListener("click", () => window.open(linkInvito(), "_blank"));

  document.getElementById("id-file")?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const esito = document.getElementById("id-esito");
    if (esito) esito.textContent = "Carico…";
    let ok = 0;
    for (const f of files.slice(0, 10)) {
      try {
        const path = `spazi/${token}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type });
        if (up.error) { console.error(up.error); continue; }
        const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
        await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "idea", p_dati: { url: pub.publicUrl } });
        ok++;
      } catch (err) { console.error(err); }
    }
    if (esito) esito.textContent = ok ? `${ok} ${ok === 1 ? "foto caricata" : "foto caricate"}.` : "Non è andata.";
    render(container);
  });

  container.querySelectorAll("[data-forn]").forEach(el =>
    el.addEventListener("change", async () => {
      const patch = {};
      patch[el.dataset.campo] = el.value;
      await supabase.rpc("spazio_fornitore_aggiorna", {
        p_token: token, p_id: el.dataset.forn, p_dati: patch });
    }));
}

/* ── utilità ─────────────────────────────────────────────────── */
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function dataLunga(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  const g = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric" });
  return g.charAt(0).toUpperCase() + g.slice(1) + " " + MESI[d.getMonth()] + " " + d.getFullYear();
}
function data(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  return d.getDate() + " " + MESI[d.getMonth()].slice(0, 3);
}
function mancano(iso) {
  const g = Math.ceil((new Date(String(iso) + "T12:00:00") - Date.now()) / 86400000);
  if (g < 0) return "";
  if (g === 0) return "È oggi!";
  return g === 1 ? "manca un giorno" : "mancano " + g + " giorni";
}
function quando(iso) {
  if (!iso) return "";
  const g = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : g + " giorni fa";
}
function euro(n) { return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function guscio(dentro, tema) {
  const c1 = tema?.colore || "#7C2D4A", c2 = tema?.colore2 || "#C08497";
  return `<style>
  .sp{--vino:${c1};--rosa:${c2};--verde:#348127;--carta:#FBFAF7;--riga:#E4E0D8;--muto:#6B7A83;
      background:#DFE3E7;min-height:100vh;padding:16px 10px 50px;color:#12232E;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
  .sp-foglio{max-width:460px;margin:0 auto;background:var(--carta);border-radius:20px;overflow:hidden;
    box-shadow:0 14px 44px rgba(0,0,0,.16);}
  .sp-testa{padding:24px 22px 20px;text-align:center;color:#fff;
    background:${tema?.immagine ? `linear-gradient(180deg,rgba(0,0,0,.4),rgba(0,0,0,.64)), url('${tema.immagine}') center/cover`
                                : `linear-gradient(160deg,${c1},${c2})`};}
  .sp-oc{font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.85;font-weight:700;}
  .sp-testa h1{font-family:Georgia,serif;font-size:25px;margin:6px 0 3px;font-weight:normal;}
  .sp-q{font-size:13.5px;opacity:.92;}
  .sp-conto{display:inline-block;margin-top:10px;background:rgba(255,255,255,.18);
    border:1px solid rgba(255,255,255,.3);border-radius:100px;padding:5px 12px;font-size:12px;font-weight:700;}
  .sp-nav{display:flex;background:#fff;border-bottom:1px solid var(--riga);overflow-x:auto;}
  .sp-nav button{flex:0 0 auto;background:none;border:none;padding:13px 14px;font-size:13.5px;
    font-family:inherit;color:var(--muto);cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;}
  .sp-nav button.on{color:var(--vino);font-weight:800;border-bottom-color:var(--vino);}
  .sp-corpo{padding:18px 20px 26px;}
  .sott{font-size:13px;color:var(--muto);margin-bottom:12px;line-height:1.5;}
  .sp h2{font-family:Georgia,serif;font-size:17px;color:var(--vino);margin:20px 0 9px;font-weight:normal;}
  .sp-k3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
  .sp-k3 div{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:11px;text-align:center;}
  .sp-k3 b{display:block;font-family:Georgia,serif;font-size:22px;color:var(--vino);line-height:1;}
  .sp-k3 span{display:block;font-size:11px;color:var(--muto);margin-top:4px;}
  .sp-card{background:#fff;border:1px solid var(--riga);border-radius:13px;overflow:hidden;}
  .sp-card .r{display:flex;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid #F1EEE8;font-size:14px;}
  .sp-card .r:first-child{border-top:none;}
  .sp-card .r .t{flex:1;}
  .sp-card .r .t b{display:block;font-size:14px;font-weight:600;}
  .sp-card .r .t span{display:block;font-size:12px;color:var(--muto);margin-top:1px;}
  .sp-card .r em{font-style:normal;font-size:13px;color:var(--vino);font-weight:700;white-space:nowrap;}
  .sp-card .vuoto{padding:16px;color:var(--muto);font-size:13.5px;text-align:center;}
  .pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:100px;white-space:nowrap;}
  .pill.si{background:#F1F8ED;color:var(--verde);} .pill.no{background:#FEF2F2;color:#B91C1C;}
  .pill.forse{background:#FFFCF3;color:#9A6A00;}
  .tag{font-size:10px;font-weight:800;text-transform:uppercase;padding:3px 7px;border-radius:100px;}
  .tag.noi{background:#FBF3F6;color:var(--vino);} .tag.voi{background:#F1F4F6;color:var(--muto);}
  .box{width:19px;height:19px;border-radius:5px;border:2px solid #CFC7C1;flex-shrink:0;position:relative;cursor:pointer;}
  .fatto .box{background:var(--verde);border-color:var(--verde);}
  .fatto .box:after{content:"✓";position:absolute;inset:0;color:#fff;font-size:12px;display:flex;
    align-items:center;justify-content:center;font-weight:700;}
  .fatto .t b{color:var(--muto);text-decoration:line-through;}
  .sp-avanz{background:#fff;border:1px solid var(--riga);border-radius:13px;padding:14px;margin-bottom:6px;}
  .sp-avanz .n{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px;}
  .sp-avanz .n b{font-family:Georgia,serif;font-size:22px;color:var(--vino);}
  .sp-avanz .n span{font-size:12.5px;color:var(--muto);}
  .barra{height:8px;background:#EDE7E2;border-radius:100px;overflow:hidden;}
  .barra i{display:block;height:100%;background:linear-gradient(90deg,${c1},${c2});}
  .sp-mod{background:#fff;border:1.5px solid var(--rosa);border-radius:13px;padding:14px;margin-top:11px;}
  .sp-mod .tit{font-size:12px;font-weight:800;color:var(--vino);text-transform:uppercase;
    letter-spacing:.08em;margin-bottom:10px;}
  .sp-mod .g{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .sp input,.sp select,.sp textarea{width:100%;padding:10px;border:1.5px solid var(--riga);border-radius:9px;
    font-size:14.5px;font-family:inherit;background:#fff;}
  .sp-btn{width:100%;background:var(--vino);color:#fff;border:none;border-radius:11px;padding:13px;
    font-size:15px;font-weight:700;font-family:inherit;margin-top:10px;cursor:pointer;}
  .sp-btn.ch{background:#fff;border:1.5px solid var(--riga);color:var(--vino);}
  .sw{display:flex;align-items:center;gap:11px;padding:12px 14px;border-top:1px solid #F1EEE8;}
  .sw:first-child{border-top:none;}
  .sw .ic{font-size:18px;width:24px;text-align:center;}
  .sw .t{flex:1;font-size:14px;}
  .sw .t span{display:block;font-size:11.5px;color:var(--muto);}
  .tg{width:42px;height:25px;border-radius:100px;background:#D7D2CC;position:relative;flex-shrink:0;cursor:pointer;}
  .tg.on{background:var(--verde);}
  .tg:after{content:"";position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;}
  .tg.on:after{left:20px;}
  .sp-cop{height:130px;border-radius:11px;background:#EDE2E6 center/cover;border:1px solid var(--riga);
    display:flex;align-items:center;justify-content:center;color:#9B7F8A;font-size:12.5px;}
  .sp-card .r .t .soldi{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11.5px;color:var(--muto);}
  .sp-card .r .t .soldi input{width:76px;padding:5px 7px;border:1.5px solid var(--riga);border-radius:7px;font-size:13px;}
  .sp-dom{display:flex;align-items:center;gap:9px;padding:9px 0;border-top:1px solid #F1EEE8;font-size:14px;}
  .sp-dom:first-of-type{border-top:none;}
  .sp-dom span{flex:1;}
  .sp-dom .x{background:#fff;border:1.5px solid var(--riga);border-radius:8px;padding:4px 9px;
    font-size:12px;color:var(--muto);cursor:pointer;}
  .sp-idee{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
  .sp-idee div{aspect-ratio:1;border-radius:9px;background-size:cover;background-position:center;
    background-color:#EDE2E6;border:1px solid var(--riga);}
  .sp-idee .piu{aspect-ratio:1;border:1.5px dashed #CBD5DB;border-radius:9px;display:flex;
    align-items:center;justify-content:center;color:var(--muto);font-size:20px;cursor:pointer;}
  .sp-menu{background:#fff;border:1px solid var(--riga);border-radius:13px;overflow:hidden;}
  .sp-menu .s{padding:12px 15px;border-top:1px solid #F1EEE8;}
  .sp-menu .s:first-child{border-top:none;}
  .sp-menu .tit{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--vino);
    font-weight:800;margin-bottom:6px;}
  .sp-menu .pi{font-size:14.5px;line-height:1.45;padding:2px 0;}
  .sp-menu .pi span{display:block;font-size:12.5px;color:var(--muto);font-style:italic;}
  .sp-note{background:#FFFDF5;border:1px solid #F0E3C0;border-radius:11px;padding:13px;
    font-size:13.5px;line-height:1.7;color:#5A4A2A;}
  .sp-pie{background:#fff;border-top:1px solid var(--riga);padding:14px;text-align:center;
    font-size:11px;color:var(--muto);}
  .sp-tavolo{background:#fff;border:1px solid var(--riga);border-radius:13px;overflow:hidden;margin-bottom:9px;}
  .sp-tavolo.pieno{border-color:#FECACA;}
  .sp-tavolo .cap{background:#F7F2F4;padding:10px 14px;display:flex;align-items:center;gap:9px;}
  .sp-tavolo .cap b{flex:1;font-size:14.5px;}
  .sp-tavolo .cap span{font-size:12px;color:var(--muto);}
  .sp-tavolo.pieno .cap span{color:#B91C1C;font-weight:700;}
  .sp-tavolo .p{display:flex;align-items:center;gap:9px;padding:9px 14px;border-top:1px solid #F1EEE8;font-size:14px;}
  .sp-tavolo .p .t{flex:1;}
  .sp-tavolo .p .all{display:block;font-size:11.5px;color:#9A3412;}
  .sp-tavolo .vuotino{padding:11px 14px;font-size:12.5px;color:var(--muto);}
  .sp-tavolo .x,.sp-card .mini{background:#fff;border:1.5px solid var(--riga);border-radius:8px;
    padding:5px 10px;font-size:12px;color:var(--muto);font-family:inherit;cursor:pointer;}
  .sp-card .mini{color:var(--vino);font-weight:700;}
  .sp-chiuso{background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;border-radius:12px;
    padding:12px 14px;font-size:13.5px;margin-bottom:12px;line-height:1.5;}
  .sp-ok{background:#F1F8ED;border:1px solid #CFE4C2;color:var(--verde);border-radius:12px;
    padding:12px 14px;font-size:13.5px;}
  .sp-piani{display:flex;gap:7px;margin-bottom:10px;flex-wrap:wrap;}
  .sp-piani button{background:#fff;border:1.5px solid var(--riga);border-radius:10px;padding:9px 16px;
    font-size:14px;font-family:inherit;color:var(--muto);font-weight:700;cursor:pointer;}
  .sp-piani button.on{background:var(--vino);border-color:var(--vino);color:#fff;}
  .sp-piani .copia{margin-left:auto;font-weight:400;font-size:13px;color:var(--vino);}
  .sp-mini{background:#fff;border:1.5px solid var(--vino);color:var(--vino);border-radius:8px;
    padding:4px 10px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;margin-left:6px;}
  .sp-temi{display:flex;flex-wrap:wrap;gap:7px;}
  .sp-temi button{background:#fff;border:1.5px solid var(--riga);border-radius:100px;padding:8px 14px;
    font-size:13px;color:var(--vino);font-family:inherit;cursor:pointer;}
  .aiutino{font-size:12px;color:var(--muto);line-height:1.55;margin-top:9px;}
  .sp-caric,.sp-err{max-width:440px;margin:60px auto;background:#fff;border-radius:14px;padding:24px;
    text-align:center;font-size:15.5px;color:#3D4C55;}
  </style><div class="sp">${dentro}</div>`;
}
