import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view"><h3>Nessuna azienda attiva</h3></div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0;">Anagrafica Prodotti</h3>
        <div style="margin-left:auto; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button tiny gray" id="btn-prodotti-refresh">↻ Aggiorna</button>
          <button class="app-button tiny green" id="btn-prodotti-nuovo">+ Nuovo Prodotto</button>
        </div>
      </div>

      <div class="editor-section open">
        <div class="editor-section-header">
          <strong>Categorie interne</strong>
        </div>
        <div class="editor-section-body">
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
            <label style="flex:1 1 220px;">
              Nome categoria
              <input id="cat-nome" class="input-pill" placeholder="Es: Carne" />
            </label>
            <label style="width:120px;">
              Sigla
              <input id="cat-sigla" class="input-pill" placeholder="CAR" maxlength="6" />
            </label>
            <button class="app-button small gray" id="btn-cat-add">Aggiungi</button>
          </div>
          <div id="cat-list" style="margin-top:10px;"></div>
        </div>
      </div>

      <div style="margin-top:14px;">
        <input id="prodotti-search" class="input-pill" placeholder="🔎 Cerca per descrizione o codice..." />
      </div>

      <div id="prodotti-table" style="margin-top:12px;"></div>
    </div>

    <div id="prodotti-modal-backdrop"
      style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">
      <div class="view" style="max-width:720px; margin:0 auto; border-radius:14px; padding:16px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
          <h3 id="prodotti-modal-title" style="margin:0;">Prodotto</h3>
          <button id="prodotti-modal-close" class="app-button tiny gray">✕ Chiudi</button>
        </div>

        <div id="prodotti-modal-body" style="margin-top:12px;"></div>
      </div>
    </div>
  `;

  const state = {
    categorie: [],
    prodotti: [],
    prodottiFiltrati: [],
    editing: null
  };

  const btnRefresh = document.getElementById("btn-prodotti-refresh");
  const btnNuovo = document.getElementById("btn-prodotti-nuovo");
  const search = document.getElementById("prodotti-search");
  const catList = document.getElementById("cat-list");
  const btnCatAdd = document.getElementById("btn-cat-add");

  btnRefresh?.addEventListener("click", async () => {
    await loadAll();
    renderAll();
  });

  btnNuovo?.addEventListener("click", () => openProdottoModal(null, state));

  search?.addEventListener("input", () => {
    const q = (search.value || "").trim().toLowerCase();
    if (!q) {
      state.prodottiFiltrati = [...state.prodotti];
    } else {
      state.prodottiFiltrati = state.prodotti.filter(p =>
        (p.descrizione || "").toLowerCase().includes(q) ||
        (p.codice_interno || "").toLowerCase().includes(q)
      );
    }
    renderProdottiTable(state);
  });

  btnCatAdd?.addEventListener("click", async () => {
    const nome = (document.getElementById("cat-nome")?.value || "").trim();
    const sigla = (document.getElementById("cat-sigla")?.value || "").trim().toUpperCase();

    if (!nome) return alert("Inserisci il nome categoria.");
    if (!sigla) return alert("Inserisci la sigla (es: CAR).");

    const { error } = await window.supabaseClient
      .from("categorie_interne_prodotti")
      .insert({
        azienda_id: azienda.id,
        nome,
        sigla,
        attiva: true
      });

    if (error) {
      console.error("Errore crea categoria:", error);
      alert("Errore creazione categoria (sigla già usata?).");
      return;
    }

    document.getElementById("cat-nome").value = "";
    document.getElementById("cat-sigla").value = "";

    await loadCategorie(state);
    renderCategorie(state);
  });

  async function loadAll() {
    await Promise.all([
      loadCategorie(state),
      loadProdotti(state)
    ]);
    state.prodottiFiltrati = [...state.prodotti];
  }

  function renderAll() {
    renderCategorie(state);
    renderProdottiTable(state);
  }

  await loadAll();
  renderAll();

  async function loadCategorie(st) {
    const { data, error } = await window.supabaseClient
      .from("categorie_interne_prodotti")
      .select("id, nome, sigla, attiva, created_at")
      .eq("azienda_id", azienda.id)
      .order("nome");

    if (error) {
      console.error("Errore load categorie:", error);
      st.categorie = [];
      return;
    }
    st.categorie = data || [];
  }

  async function loadProdotti(st) {
    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select(`
        id,
        descrizione,
        codice_interno,
        categoria_interna_id,
        tipo_prodotto,
        unita_misura,
        iva_percentuale,
        scorta_minima,
        attivo
      `)
      .eq("azienda_id", azienda.id)
      .order("descrizione");

    if (error) {
      console.error("Errore load prodotti:", error);
      st.prodotti = [];
      return;
    }
    st.prodotti = data || [];
  }

  function renderCategorie(st) {
    if (!catList) return;

    if (!st.categorie.length) {
      catList.innerHTML = `<div class="small-muted">Nessuna categoria. Aggiungine una (es: Carne → CAR).</div>`;
      return;
    }

    catList.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${st.categorie.map(c => `
          <span class="pill" style="display:inline-flex; gap:8px; align-items:center;">
            <strong>${escapeHtml(c.sigla)}</strong> ${escapeHtml(c.nome)}
            <button class="app-button tiny gray btn-cat-toggle" data-id="${escapeHtml(c.id)}">
              ${c.attiva ? "Disattiva" : "Attiva"}
            </button>
          </span>
        `).join("")}
      </div>
    `;

    catList.querySelectorAll(".btn-cat-toggle").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const cat = st.categorie.find(x => x.id === id);
        if (!cat) return;

        const { error } = await window.supabaseClient
          .from("categorie_interne_prodotti")
          .update({ attiva: !cat.attiva })
          .eq("azienda_id", azienda.id)
          .eq("id", id);

        if (error) {
          console.error("Errore toggle categoria:", error);
          alert("Errore aggiornamento categoria.");
          return;
        }

        await loadCategorie(st);
        renderCategorie(st);
      });
    });
  }

  function categoriaLabel(st, categoriaId) {
    const c = st.categorie.find(x => x.id === categoriaId);
    if (!c) return "-";
    return `${c.sigla} · ${c.nome}`;
  }

  function renderProdottiTable(st) {
    const wrap = document.getElementById("prodotti-table");
    if (!wrap) return;

    const rows = st.prodottiFiltrati || [];

    wrap.innerHTML = `
      <table class="table-timbrature">
        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
            <th>Categoria</th>
            <th>Tipo</th>
            <th>UM</th>
            <th>IVA</th>
            <th>Scorta</th>
            <th>Stato</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => `
            <tr>
              <td>${escapeHtml(p.codice_interno || "")}</td>
              <td>${escapeHtml(p.descrizione || "")}</td>
              <td>${escapeHtml(categoriaLabel(st, p.categoria_interna_id))}</td>
              <td>${escapeHtml(p.tipo_prodotto || "")}</td>
              <td>${escapeHtml(p.unita_misura || "")}</td>
              <td>${Number(p.iva_percentuale ?? 10)}%</td>
              <td>${Number(p.scorta_minima || 0)}</td>
              <td>${p.attivo ? "Attivo" : "Off"}</td>
              <td>
                <button class="app-button tiny gray btn-prod-edit" data-id="${escapeHtml(p.id)}">Modifica</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll(".btn-prod-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const prodotto = st.prodotti.find(x => x.id === id);
        openProdottoModal(prodotto || null, st);
      });
    });
  }

  function openProdottoModal(prodotto, st) {
    const backdrop = document.getElementById("prodotti-modal-backdrop");
    const body = document.getElementById("prodotti-modal-body");
    const title = document.getElementById("prodotti-modal-title");
    const btnClose = document.getElementById("prodotti-modal-close");

    if (!backdrop || !body || !title || !btnClose) return;

    const isEdit = !!prodotto?.id;

    title.innerText = isEdit ? "✏️ Modifica Prodotto" : "➕ Nuovo Prodotto";

    const catOptions = (st.categorie || [])
      .filter(c => c.attiva)
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.sigla)} · ${escapeHtml(c.nome)}</option>`)
      .join("");

    body.innerHTML = `
      <div class="editor-stack">

        <div class="editor-section open">
          <div class="editor-section-header"><strong>Dati base</strong></div>
          <div class="editor-section-body editor-grid-2">
            <label>
              Categoria interna
              <select id="p-cat" class="input-pill" ${isEdit ? "disabled" : ""}>
                <option value="">Seleziona...</option>
                ${catOptions}
              </select>
              <div class="small-muted" style="margin-top:6px;">
                ${isEdit ? "Categoria bloccata dopo creazione (codice interno legato alla categoria)." : "Obbligatoria. Genera automaticamente il codice interno."}
              </div>
            </label>

            <label>
              Codice interno (auto)
              <input id="p-cod" class="input-pill" value="${escapeHtml(prodotto?.codice_interno || "")}" readonly />
            </label>

            <label style="grid-column:1/-1;">
              Descrizione prodotto (nome interno)
              <input id="p-desc" class="input-pill" value="${escapeHtml(prodotto?.descrizione || "")}" placeholder="Es: Filetto di manzo" />
            </label>

            <label>
              Tipo prodotto
              <select id="p-tipo" class="input-pill">
                <option value="materia_prima">materia_prima</option>
                <option value="semilavorato">semilavorato</option>
                <option value="prodotto_finito">prodotto_finito</option>
              </select>
            </label>

            <label>
              Unità di misura
              <select id="p-um" class="input-pill">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="pz">pz</option>
                <option value="conf">conf</option>
                <option value="cartone">cartone</option>
              </select>
            </label>

            <label>
              IVA
              <select id="p-iva" class="input-pill">
                <option value="4">4%</option>
                <option value="10">10%</option>
                <option value="22">22%</option>
              </select>
            </label>

            <label>
              Scorta minima
              <input id="p-scorta" type="number" step="0.001" min="0" class="input-pill" value="${escapeHtml(String(prodotto?.scorta_minima ?? 0))}" />
            </label>

            <label style="display:flex; gap:8px; align-items:center; margin-top:6px;">
              <input id="p-attivo" type="checkbox" ${prodotto?.attivo === false ? "" : "checked"} />
              <span>Attivo</span>
            </label>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button id="btn-p-save" class="app-button green">💾 Salva</button>
          <button id="btn-p-cancel" class="app-button gray">Annulla</button>
        </div>

        <div id="p-esito" class="small-muted" style="margin-top:10px;"></div>
      </div>
    `;

    const elCat = document.getElementById("p-cat");
    const elTipo = document.getElementById("p-tipo");
    const elUm = document.getElementById("p-um");
    const elIva = document.getElementById("p-iva");

    if (elCat && prodotto?.categoria_interna_id) elCat.value = prodotto.categoria_interna_id;
    if (elTipo && prodotto?.tipo_prodotto) elTipo.value = prodotto.tipo_prodotto;
    if (elUm && prodotto?.unita_misura) elUm.value = prodotto.unita_misura;
    if (elIva) elIva.value = String(prodotto?.iva_percentuale ?? 10);

    const close = () => (backdrop.style.display = "none");
    btnClose.onclick = close;

    const btnCancel = document.getElementById("btn-p-cancel");
    btnCancel.onclick = close;

    backdrop.onclick = (e) => {
      if (e.target?.id === "prodotti-modal-backdrop") close();
    };

    const btnSave = document.getElementById("btn-p-save");
    btnSave.onclick = async () => {
      const esito = document.getElementById("p-esito");
      const categoriaId = (document.getElementById("p-cat")?.value || "").trim();
      const descrizione = (document.getElementById("p-desc")?.value || "").trim();
      const tipo = (document.getElementById("p-tipo")?.value || "").trim();
      const um = (document.getElementById("p-um")?.value || "").trim();
      const iva = Number(document.getElementById("p-iva")?.value || 10);
      const scorta = Number(document.getElementById("p-scorta")?.value || 0);
      const attivo = !!document.getElementById("p-attivo")?.checked;

      if (!isEdit && !categoriaId) return alert("Seleziona la categoria interna.");
      if (!descrizione) return alert("Inserisci la descrizione prodotto.");
      if (!tipo) return alert("Seleziona il tipo prodotto.");
      if (!um) return alert("Seleziona l'unità di misura.");

      btnSave.setAttribute("disabled", "disabled");
      if (esito) esito.innerText = "Salvataggio...";

      if (!isEdit) {
        const { error } = await window.supabaseClient
          .from("prodotti")
          .insert({
            azienda_id: azienda.id,
            categoria_interna_id: categoriaId,
            descrizione,
            tipo_prodotto: tipo,
            unita_misura: um,
            iva_percentuale: iva,
            scorta_minima: scorta,
            attivo: attivo
          });

        if (error) {
          console.error("Errore insert prodotto:", error);
          if (esito) esito.innerText = "Errore salvataggio prodotto.";
          btnSave.removeAttribute("disabled");
          return;
        }
      } else {
        const { error } = await window.supabaseClient
          .from("prodotti")
          .update({
            descrizione,
            tipo_prodotto: tipo,
            unita_misura: um,
            iva_percentuale: iva,
            scorta_minima: scorta,
            attivo: attivo
          })
          .eq("azienda_id", azienda.id)
          .eq("id", prodotto.id);

        if (error) {
          console.error("Errore update prodotto:", error);
          if (esito) esito.innerText = "Errore aggiornamento prodotto.";
          btnSave.removeAttribute("disabled");
          return;
        }
      }

      await Promise.all([loadCategorie(st), loadProdotti(st)]);
      st.prodottiFiltrati = [...st.prodotti];
      renderCategorie(st);
      renderProdottiTable(st);

      if (esito) esito.innerText = "Salvato ✔️";
      setTimeout(close, 250);
    };

    backdrop.style.display = "block";
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
