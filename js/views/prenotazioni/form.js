import { trovaOCreaContatto } from "../../services/contatti.js";
import { eseguiAutomazioni } from "../../services/automazioni.js?v=2";

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  // Carica configurazione slot
  const { data: slotCfg } = await supa()
    .from("prenotazioni_slot_config")
    .select("*")
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  const slotMinuti = slotCfg?.slot_minuti || 30;
  const maxCopertiSlot = slotCfg?.max_coperti_slot || 30;
  const orariDisponibili = slotCfg?.orari || ["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>➕ Nuova Prenotazione</h1>
      </div>

      <div class="card">
        <div class="form-grid">

          <div style="position:relative;">
            <label>Cerca cliente</label>
            <input id="cliente_search" class="input" placeholder="Nome o telefono"/>
            <div id="suggestions" class="dropdown"></div>
          </div>

          <div>
            <label>Nome</label>
            <input id="cliente_nome" class="input"/>
          </div>

          <div>
            <label>Cognome</label>
            <input id="cliente_cognome" class="input"/>
          </div>

          <div style="display:flex; gap:6px;">
            <div style="width:110px;">
              <label>Prefisso</label>
              <select id="prefisso" class="input">
                <option value="+39">🇮🇹 +39</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+34">🇪🇸 +34</option>
              </select>
            </div>
            <div style="flex:1;">
              <label>Telefono *</label>
              <input id="cliente_telefono" class="input"/>
            </div>
          </div>

          <div>
            <label>Data</label>
            <input type="date" id="data" class="input"/>
          </div>

          <div>
            <label>Ora</label>
            <select id="ora" class="input">
              ${orariDisponibili.map(o => `<option value="${o}">${o}</option>`).join("")}
            </select>
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

          <div>
            <label>Intolleranze / allergie</label>
            <input id="intolleranze" class="input" placeholder="Es: glutine, lattosio — lascia vuoto se nessuna">
          </div>

          <div style="display:flex;align-items:center;gap:10px;padding-top:22px;">
            <input type="checkbox" id="seggiolone" style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;">
            <label for="seggiolone" style="cursor:pointer;font-size:14px;">👶 Seggiolone richiesto</label>
          </div>

          <div style="grid-column:1 / -1;">
            <label>Note aggiuntive</label>
            <textarea id="note" class="input" rows="2"></textarea>
          </div>

          <div style="grid-column:1 / -1;">
            <label>📎 Allegati (menu, documenti)</label>
            <input type="file" id="allegati-input" class="input" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="padding:8px;" />
            <div id="allegati-lista" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;"></div>
          </div>

        </div>

        <!-- DISPONIBILITÀ SLOT -->
        <div id="slot-info" style="margin-top:12px;display:none;"></div>

        <div style="margin-top:20px;display:flex;gap:10px;">
          <button class="app-button primary" id="btn-salva">Salva prenotazione</button>
          <button class="app-button gray" id="btn-annulla">Annulla</button>
        </div>

        <div id="form-msg" style="margin-top:10px;font-size:13px;"></div>
      </div>
    </div>
  `;

  document.getElementById("data").value = new Date().toISOString().split("T")[0];
  let clienteSelezionato = null;

  // Verifica disponibilità slot
  async function verificaSlot() {
    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = parseInt(document.getElementById("coperti").value) || 0;
    const box = document.getElementById("slot-info");

    if (!data || !ora || !coperti) { box.style.display = "none"; return; }

    // Conta coperti già prenotati in questo slot
    const oraEnd = new Date(`${data}T${ora}`);
    oraEnd.setMinutes(oraEnd.getMinutes() + slotMinuti);
    const oraEndStr = `${String(oraEnd.getHours()).padStart(2,"0")}:${String(oraEnd.getMinutes()).padStart(2,"0")}`;

    const { count } = await supa()
      .from("prenotazioni_tavoli")
      .select("coperti", { count: "exact", head: false })
      .eq("azienda_id", aziendaId)
      .eq("data", data)
      .in("stato", ["in_attesa","confermata","arrivata"])
      .gte("ora", ora)
      .lt("ora", oraEndStr);

    // Somma coperti
    const { data: prenSlot } = await supa()
      .from("prenotazioni_tavoli")
      .select("coperti")
      .eq("azienda_id", aziendaId)
      .eq("data", data)
      .in("stato", ["in_attesa","confermata","arrivata"])
      .gte("ora", ora)
      .lt("ora", oraEndStr);

    const copertiOccupati = (prenSlot || []).reduce((s, p) => s + (Number(p.coperti) || 0), 0);
    const disponibili = maxCopertiSlot - copertiOccupati;
    const ok = disponibili >= coperti;

    box.style.display = "block";
    box.innerHTML = `
      <div style="background:${ok ? "#d1fae5" : "#fee2e2"};border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">${ok ? "✅" : "⚠️"}</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:${ok ? "#065f46" : "#991b1b"};">
            ${ok ? `Slot disponibile — ${disponibili} coperti liberi su ${maxCopertiSlot}` : `Slot quasi pieno — solo ${disponibili} coperti disponibili`}
          </div>
          <div style="font-size:12px;color:#6b7280;">Slot ${ora} → ${oraEndStr} · Max ${maxCopertiSlot} coperti</div>
        </div>
      </div>
    `;
  }

  document.getElementById("data").addEventListener("change", verificaSlot);
  document.getElementById("ora").addEventListener("change", verificaSlot);
  document.getElementById("coperti").addEventListener("input", verificaSlot);

  // Autocomplete cliente
  document.getElementById("cliente_search").oninput = async (e) => {
    const term = e.target.value.trim();
    const box = document.getElementById("suggestions");
    if (term.length < 2) { box.innerHTML = ""; return; }

    const { data } = await supa()
      .from("contatti")
      .select("id, nome, cognome, telefono")
      .or(`nome.ilike.%${term}%,telefono.ilike.%${term}%`)
      .limit(5);

    if (!data?.length) { box.innerHTML = `<div class="dropdown-item">Nessun cliente</div>`; return; }

    box.innerHTML = data.map(c => `
      <div class="dropdown-item" data-id="${c.id}">
        ${(c.nome || "") + " " + (c.cognome || "")} ${c.telefono ? "· " + c.telefono : ""}
      </div>
    `).join("");

    box.querySelectorAll(".dropdown-item").forEach(el => {
      el.onclick = () => {
        const c = data.find(x => x.id == el.dataset.id);
        clienteSelezionato = String(c.id);
        document.getElementById("cliente_nome").value = c.nome || "";
        document.getElementById("cliente_cognome").value = c.cognome || "";
        document.getElementById("cliente_telefono").value = c.telefono || "";
        box.innerHTML = "";
        verificaSlot();
      };
    });
  };

  document.getElementById("btn-annulla").onclick = () => window.location.hash = "#/prenotazioni";

  // Anteprima allegati selezionati
  const allegatiInput = document.getElementById("allegati-input");
  if (allegatiInput) {
    allegatiInput.onchange = () => {
      const lista = document.getElementById("allegati-lista");
      const files = Array.from(allegatiInput.files || []);
      lista.innerHTML = files.map(f => {
        const kb = Math.round(f.size / 1024);
        return `<div style="font-size:13px;color:#374151;background:#f1f5f9;padding:6px 10px;border-radius:8px;">📄 ${f.name} <span style="color:#94a3b8;">(${kb} KB)</span></div>`;
      }).join("");
    };
  }

  // Salvataggio
  document.getElementById("btn-salva").onclick = async () => {
    const nome = document.getElementById("cliente_nome").value.trim();
    const cognome = document.getElementById("cliente_cognome").value.trim();
    const prefisso = document.getElementById("prefisso").value;
    const telefonoRaw = document.getElementById("cliente_telefono").value.trim();
    const telefono = (prefisso + telefonoRaw).replace(/[^\d+]/g, "");
    const data = document.getElementById("data").value;
    const ora = document.getElementById("ora").value;
    const coperti = Number(document.getElementById("coperti").value);
    const stato = document.getElementById("stato").value;
    const intolleranze = document.getElementById("intolleranze").value.trim();
    const seggiolone = document.getElementById("seggiolone").checked;
    const noteExtra = document.getElementById("note").value.trim();
    const msg = document.getElementById("form-msg");

    msg.innerHTML = "";
    if (!telefonoRaw) { msg.innerHTML = `<span style="color:#dc2626;">Telefono obbligatorio</span>`; return; }
    if (!nome) { msg.innerHTML = `<span style="color:#dc2626;">Nome obbligatorio</span>`; return; }

    // Costruisce note
    const noteParti = [];
    if (intolleranze) noteParti.push(`🥗 Intolleranze: ${intolleranze}`);
    if (seggiolone) noteParti.push(`👶 Seggiolone richiesto`);
    if (noteExtra) noteParti.push(noteExtra);
    const note = noteParti.join("\n");

    let contatto = null;
    if (!clienteSelezionato) {
      contatto = await trovaOCreaContatto({ nome, cognome, telefono });
    }
    let contattoId = clienteSelezionato || contatto?.id || null;
    if (contattoId && contattoId.length < 20) contattoId = null;

    // Upload allegati su storage (bucket media-aziende)
    let allegatiSalvati = [];
    const inputFile = document.getElementById("allegati-input");
    const files = inputFile?.files ? Array.from(inputFile.files) : [];
    if (files.length) {
      msg.innerHTML = `<span style="color:#0E5A7A;">Caricamento allegati…</span>`;
      for (const file of files) {
        try {
          const estensione = file.name.split(".").pop();
          const path = `prenotazioni/${aziendaId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${estensione}`;
          const { error: upErr } = await supa().storage.from("media-aziende").upload(path, file, { upsert: false });
          if (upErr) { console.warn("Upload allegato fallito:", upErr.message); continue; }
          const { data: pub } = supa().storage.from("media-aziende").getPublicUrl(path);
          allegatiSalvati.push({
            nome: file.name,
            url: pub?.publicUrl || "",
            tipo: file.type || estensione,
            caricato_il: new Date().toISOString(),
          });
        } catch (e) { console.warn("Errore upload allegato:", e); }
      }
    }

    const { data: pren, error } = await supa()
      .from("prenotazioni_tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        contatto_id: contattoId,
        cliente_nome: nome,
        cognome,
        cliente_telefono: telefono,
        data,
        ora,
        coperti,
        stato,
        note,
        allegati: allegatiSalvati,
        canale: "manuale",
      }])
      .select()
      .single();

    if (error) { msg.innerHTML = `<span style="color:#dc2626;">Errore: ${error.message}</span>`; return; }

    await eseguiAutomazioni("prenotazione_creata", pren);
    msg.innerHTML = `<span style="color:#059669;">✅ Prenotazione salvata!</span>`;
    setTimeout(() => window.location.hash = "#/prenotazioni", 800);
  };

  // Verifica slot iniziale
  verificaSlot();
}
