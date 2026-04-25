export async function render(container) {

  const aziendaId =
    window.state?.azienda?.id ||
    window.state?.aziendaAttiva?.id ||
    null;

  const sedeId =
    window.state?.sedeSelezionata?.id ||
    window.state?.sedeAttiva?.id ||
    null;

  let currentForm = null;
  let tempFormId = null;
  let tempSlug = null;

  let customFields = [];
  let fasceOrarie = [];
  let currentLink = null;

  const BASE_PUBLIC_URL = "https://ristoflow-ai.com";
  const STORAGE_BUCKET = "loghi-aziende";

  container.innerHTML = `
  <div style="padding:16px; max-width:960px; margin:0 auto;">

    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <h2 style="margin:0;">Booking Forms</h2>
      <button id="new-form" class="app-button primary" type="button">+ Nuovo Form</button>
    </div>

    <div id="forms-list" style="margin-top:12px;"></div>

    <hr>

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">Editor</h2>
      <div id="actions-box"></div>
    </div>

    <input id="nome" class="input" placeholder="Nome form">
    <input id="slug" class="input" placeholder="Slug">
    <input id="emoji" class="input" placeholder="Emoji">

    <div id="link-box"></div>

    <button id="save" class="app-button primary" type="button">SALVA FORM</button>

    <div id="msg" style="margin-top:12px;"></div>

  </div>
  `;

  document.getElementById("new-form").onclick = startNewForm;
  document.getElementById("save").onclick = saveForm;

  await loadForms();

  function startNewForm() {
    currentForm = null;
    tempFormId = crypto.randomUUID();
    tempSlug = makeSlug("form") + "-" + shortId();

    document.getElementById("nome").value = "";
    document.getElementById("slug").value = "";
    document.getElementById("emoji").value = "";

    document.getElementById("actions-box").innerHTML = "";
    document.getElementById("link-box").innerHTML = "";
  }

  async function loadForms() {
    const { data } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("azienda_id", aziendaId);

    document.getElementById("forms-list").innerHTML = (data || []).map(f => `
      <div data-id="${escapeAttribute(f.id)}" style="cursor:pointer;">
        ${escapeHtml(f.nome || "")}
      </div>
    `).join("");

    document.querySelectorAll("[data-id]").forEach(el => {
      el.onclick = () => loadForm(el.dataset.id);
    });
  }

  async function loadForm(id) {
    currentForm = id;

    const { data: form } = await window.supabaseClient
      .from("booking_forms")
      .select("*")
      .eq("id", id)
      .single();

    const config = form.config || {};

    document.getElementById("nome").value = form.nome || "";
    document.getElementById("emoji").value = config.emoji || "";

    document.getElementById("actions-box").innerHTML = `
      <div style="display:flex;justify-content:flex-end;">
        <button id="delete-form" class="app-button" style="background:#dc2626;color:#fff;">
          🗑️ Elimina form
        </button>
      </div>
    `;

    document.getElementById("delete-form").onclick = deleteForm;

    renderLink();
  }

  function renderLink() {
    if (!currentForm) return;

    const slug = document.getElementById("slug").value.trim();
    if (!slug) return;

    const url = `${BASE_PUBLIC_URL}/#/booking/${slug}`;

    document.getElementById("link-box").innerHTML = `
      <input class="input" value="${escapeAttribute(url)}" readonly>
      <img src="${qrUrl(url, 180)}">
    `;
  }

  async function saveForm() {
    const nome = document.getElementById("nome").value.trim();

    if (!nome) {
      alert("Inserisci nome");
      return;
    }

    const config = {
      emoji: document.getElementById("emoji").value || ""
    };

    const id = currentForm || tempFormId;

    if (!currentForm) {
      await window.supabaseClient.from("booking_forms").insert([{
        id,
        azienda_id: aziendaId,
        sede_id: sedeId,
        nome,
        config
      }]);

      currentForm = id;
    } else {
      await window.supabaseClient
        .from("booking_forms")
        .update({ nome, config })
        .eq("id", currentForm);
    }

    document.getElementById("msg").innerText = "Salvato";

    await loadForms();
  }

  async function deleteForm() {
    if (!currentForm) return;

    if (!confirm("⚠️ Eliminare questo form?")) return;

    const id = currentForm;

    await window.supabaseClient
      .from("booking_links")
      .delete()
      .eq("form_id", id)
      .eq("azienda_id", aziendaId);

    await window.supabaseClient
      .from("booking_form_versions")
      .delete()
      .eq("form_id", id);

    await window.supabaseClient
      .from("booking_forms")
      .delete()
      .eq("id", id)
      .eq("azienda_id", aziendaId);

    currentForm = null;

    document.getElementById("actions-box").innerHTML = "";
    document.getElementById("link-box").innerHTML = "";
    document.getElementById("msg").innerText = "Eliminato";

    await loadForms();
  }

  function qrUrl(url, size) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  }

  function makeSlug(value) {
    return String(value || "form")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "form";
  }

  function shortId() {
    return Date.now().toString(36);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

}
