export async function render(container) {

  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const clienteId = params.get("id");

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>👤 Cliente</h1>
      </div>

      <div class="card">

        <div class="form-grid">

          <div>
            <label>Nome</label>
            <input id="nome" class="input"/>
          </div>

          <div>
            <label>Telefono</label>
            <input id="telefono" class="input"/>
          </div>

          <div>
            <label>Email</label>
            <input id="email" class="input"/>
          </div>

          <div>
            <label>Data nascita</label>
            <input type="date" id="data_nascita" class="input"/>
          </div>

          <div>
            <label>Provincia</label>
            <input id="provincia" class="input"/>
          </div>

          <div>
            <label>CAP</label>
            <input id="cap" class="input"/>
          </div>

          <div style="grid-column:1 / -1;">
            <label>Note</label>
            <textarea id="note" class="input"></textarea>
          </div>

        </div>

        <div style="margin-top:20px;">
          <label>Tag</label>
          <div id="tag-list"></div>
        </div>

        <div style="margin-top:20px;display:flex;gap:10px;">
          <button class="app-button" id="btn-salva">Salva</button>
          <button class="app-button gray" id="btn-annulla">Annulla</button>
        </div>

        <div id="msg"></div>

      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;

  let selectedTags = [];

  // 🔥 CARICA TAG
  const { data: tags } = await window.supabaseClient
    .from("clienti_tag")
    .select("*")
    .eq("azienda_id", aziendaId);

  renderTags(tags);

  // 🔥 SE EDIT → CARICA DATI
  if (clienteId) {
    const { data } = await window.supabaseClient
      .from("contatti")
      .select("*")
      .eq("id", clienteId)
      .maybeSingle();

    if (data) {
      document.getElementById("nome").value = data.nome || "";
      document.getElementById("telefono").value = data.telefono || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("data_nascita").value = data.data_nascita || "";
      document.getElementById("provincia").value = data.provincia || "";
      document.getElementById("cap").value = data.cap || "";
      document.getElementById("note").value = data.note || "";
    }

    // tag cliente
    const { data: rel } = await window.supabaseClient
      .from("clienti_tag_rel")
      .select("tag_id")
      .eq("cliente_id", clienteId);

    selectedTags = rel.map(r => r.tag_id);
    updateTagUI();
  }

  function renderTags(tags) {
    const container = document.getElementById("tag-list");

    container.innerHTML = tags.map(t => `
      <span class="tag selectable" data-id="${t.id}">
        ${t.nome}
      </span>
    `).join("");

    container.querySelectorAll(".tag").forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;

        if (selectedTags.includes(id)) {
          selectedTags = selectedTags.filter(x => x !== id);
        } else {
          selectedTags.push(id);
        }

        updateTagUI();
      };
    });
  }

  function updateTagUI() {
    document.querySelectorAll(".tag").forEach(el => {
      if (selectedTags.includes(el.dataset.id)) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }

  document.getElementById("btn-annulla").onclick = () => {
    window.history.back();
  };

  document.getElementById("btn-salva").onclick = async () => {

    const nome = document.getElementById("nome").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim();
    const data_nascita = document.getElementById("data_nascita").value;
    const provincia = document.getElementById("provincia").value;
    const cap = document.getElementById("cap").value;
    const note = document.getElementById("note").value;

    const msg = document.getElementById("msg");

    if (!nome) {
      msg.innerHTML = "Nome obbligatorio";
      return;
    }

    let id = clienteId;

    if (clienteId) {
      await window.supabaseClient
        .from("contatti")
        .update({
          nome,
          telefono,
          email,
          data_nascita,
          provincia,
          cap,
          note
        })
        .eq("id", clienteId);
    } else {
      const { data } = await window.supabaseClient
        .from("contatti")
        .insert([{
          nome,
          telefono,
          email,
          data_nascita,
          provincia,
          cap,
          note,
          azienda_id: aziendaId
        }])
        .select()
        .single();

      id = data.id;
    }

    // 🔥 SALVA TAG
    await window.supabaseClient
      .from("clienti_tag_rel")
      .delete()
      .eq("cliente_id", id);

    if (selectedTags.length) {
      const rows = selectedTags.map(tagId => ({
        azienda_id: aziendaId,
        cliente_id: id,
        tag_id: tagId
      }));

      await window.supabaseClient
        .from("clienti_tag_rel")
        .insert(rows);
    }

    msg.innerHTML = "✅ Salvato";

    setTimeout(() => {
      window.history.back();
    }, 800);
  };
}
