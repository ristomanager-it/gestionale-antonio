import { trovaOCreaContatto } from "../services/contatti.js";
import { eseguiAutomazioni } from "../services/automazioni.js?v=4";

export async function render(container) {

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>➕ Nuova Prenotazione</h1>
      </div>

      <div class="card">

        <div class="form-grid">

          <div style="position:relative;">
            <label>Cliente</label>
            <input id="cliente_search" class="input" placeholder="Nome o telefono"/>
            <div id="suggestions" class="dropdown"></div>
          </div>

          <div>
            <label>Nome cliente</label>
            <input id="cliente_nome" class="input"/>
          </div>

          <div>
            <label>Telefono</label>
            <input id="cliente_telefono" class="input"/>
          </div>

          <div>
            <label>Data</label>
            <input type="date" id="data" class="input"/>
          </div>

          <div>
            <label>Ora</label>
            <input type="time" id="ora" class="input"/>
          </div>

          <div>
            <label>Coperti</label>
            <input type="number" id="coperti" class="input" min="1" value="2"/>
          </div>

          <div>
            <label>Stato</label>
            <select id="stato" class="input">
              <option value="in_attesa">In attesa</option>
              <option value="confermata">Confermata</option>
              <option value="arrivata">Arrivata</option>
              <option value="no_show">No show</option>
              <option value="rifiutata">Rifiutata</option>
            </select>
          </div>

          <div style="grid-column:1 / -1;">
            <label>Note</label>
            <textarea id="note" class="input" rows="3"></textarea>
          </div>

        </div>

        <div id="alert-cliente" class="card" style="margin-top:10px;display:none;"></div>

        <div id="storico-cliente" class="card" style="margin-top:20px;display:none;"></div>

        <div style="margin-top:20px;display:flex;gap:10px;">
          <button class="app-button" id="btn-salva">Salva</button>
          <button class="app-button gray" id="btn-annulla">Annulla</button>
        </div>

        <div id="form-msg"></div>

      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("data").value = today;

  let clienteSelezionato = null;

  // 🔍 AUTOCOMPLETE
  document.getElementById("cliente_search").oninput = async (e) => {

    const term = e.target.value.trim();
    const box = document.getElementById("suggestions");

    if (term.length < 2) {
      box.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("contatti")
      .select("id, nome, telefono")
      .or(`nome.ilike.%${term}%,telefono.ilike.%${term}%`)
      .limit(5);

    if (!data || !data.length) {
      box.innerHTML = `<div class="dropdown-item">Nessun cliente</div>`;
      return;
    }

    box.innerHTML = data.map(c => `
      <div class="dropdown-item" data-id="${c.id}">
        ${c.nome || "-"} ${c.telefono ? "· " + c.telefono : ""}
      </div>
    `).join("");

    box.querySelectorAll(".dropdown-item").forEach(el => {
      el.onclick = async () => {

        const c = data.find(x => x.id == el.dataset.id);
        clienteSelezionato = c.id;

        document.getElementById("cliente_nome").value = c.nome || "";
        document.getElementById("cliente_telefono").value = c.telefono || "";

        box.innerHTML = "";

        loadStoricoCliente(c.id);
        loadAlertCliente(c.id);
      };
    });
  };

  async function loadStoricoCliente(clienteId) {

    const box = document.getElementById("storico-cliente");
    box.style.display = "block";
    box.innerHTML = "Caricamento storico...";

    const { data: pren } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("data, ora, coperti, stato")
      .eq("contatto_id", clienteId)
      .order("data", { ascending: false })
      .limit(5);

    const { count } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*", { count: "exact", head: true })
      .eq("contatto_id", clienteId);

    box.innerHTML = `
      <h3>📊 Storico Cliente</h3>

      <div style="margin-bottom:10px;">
        Totale prenotazioni: <strong>${count || 0}</strong>
      </div>

      <div>
        ${(pren && pren.length) ? pren.map(p => `
          <div class="pren-row-mini">
            ${p.data} ${p.ora || ""} · ${p.coperti} coperti · ${p.stato}
          </div>
        `).join("") : "Nessuna prenotazione"}
      </div>
    `;
  }

  async function loadAlertCliente(clienteId) {

    const box = document.getElementById("alert-cliente");
    box.style.display = "block";
    box.innerHTML = "Analisi cliente...";

    const { data: stats } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("stato")
      .eq("contatto_id", clienteId);

    const totale = stats?.length || 0;
    const noShow = (stats || []).filter(x => x.stato === "no_show").length;

    let alert = [];

    if (noShow > 0) alert.push("🔴 Cliente con no-show");
    if (totale >= 10) alert.push("🟣 Cliente VIP");
    else if (totale >= 3) alert.push("🔵 Cliente abituale");

    box.innerHTML = `
      <h3>⚠️ Alert Cliente</h3>
      ${alert.length
        ? alert.map(a => `<div class="alert-item">${a}</div>`).join("")
        : `<div>Nessun alert</div>`
      }
    `;
  }

  document.getElementById("btn-annulla").onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  document.getElementById("btn-salva").onclick = async () => {

    const cliente_nome = document.getElementById("cliente_nome").value.trim();
    const cliente_telefono = document.getElementById("cliente_telefono").value.trim();
    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);
    const stato = document.getElementById("stato").value;
    const note = document.getElementById("note").value;

    const msg = document.getElementById("form-msg");

    if (!cliente_nome) {
      msg.innerHTML = "Inserisci cliente";
      return;
    }

    // 🔥 CREA / TROVA CONTATTO
    const contatto = await trovaOCreaContatto({
      nome: cliente_nome,
      telefono: cliente_telefono
    });

    // 🔥 SALVA PRENOTAZIONE
    const { data: pren, error } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        contatto_id: contatto?.id || null,
        cliente_nome,
        cliente_telefono,
        data,
        ora,
        coperti,
        stato,
        note
      }])
      .select()
      .single();

    if (error) {
      console.error(error);
      msg.innerHTML = "Errore";
      return;
    }

    // 🔥 ENGINE AUTOMAZIONI (SOSTITUISCE TUTTO)
    await eseguiAutomazioni("prenotazione_creata", pren);

    msg.innerHTML = "✅ Salvato";

    setTimeout(() => {
      window.location.hash = "#/prenotazioni";
    }, 800);
  };
}
