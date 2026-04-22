export async function render(container) {

const id = window.routeParams?.id || null;
const aziendaId = window.state?.azienda?.id || null;

if (!aziendaId) {
  container.innerHTML = `<div class="page">Errore azienda</div>`;
  return;
}

let pren = null;

if (id) {
  const { data } = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .select("*")
    .eq("id", id)
    .single();

  pren = data;
}

container.innerHTML = `
<div class="page" style="padding:12px">

<h2 style="margin-bottom:10px">
${id ? "Modifica prenotazione" : "Nuova prenotazione"}
</h2>

<div class="form-group">
<input id="nome" class="input" placeholder="Nome e cognome">
</div>

<div class="form-group">
<input id="telefono" class="input" placeholder="Telefono">
</div>

<div class="form-group">
<input type="date" id="data" class="input">
</div>

<div class="form-group">
<input type="time" id="ora" class="input">
</div>

<div class="form-group">
<input type="number" id="coperti" class="input" value="2">
</div>

<div class="form-group">
<textarea id="note" class="input" placeholder="Note"></textarea>
</div>

<div class="form-group">
<select id="stato" class="input">
<option value="in_attesa">In attesa</option>
<option value="confermata">Confermata</option>
<option value="arrivata">Arrivata</option>
<option value="no_show">No show</option>
<option value="annullata">Annullata</option>
</select>
</div>

<button id="salva" class="app-button primary">
Salva
</button>

<div id="msg"></div>

</div>
`;

const today = new Date().toISOString().split("T")[0];

// prefill
document.getElementById("data").value = pren?.data || today;
document.getElementById("ora").value = pren?.ora || "";
document.getElementById("coperti").value = pren?.coperti || 2;
document.getElementById("nome").value = pren?.cliente_nome || "";
document.getElementById("telefono").value = pren?.cliente_telefono || "";
document.getElementById("note").value = pren?.note || "";
document.getElementById("stato").value = pren?.stato || "in_attesa";

// salva
document.getElementById("salva").onclick = async () => {

const msg = document.getElementById("msg");

const nome = document.getElementById("nome").value.trim();
const telefono = document.getElementById("telefono").value.trim();
const data = document.getElementById("data").value;
const ora = document.getElementById("ora").value;
const coperti = Number(document.getElementById("coperti").value);
const note = document.getElementById("note").value;
const stato = document.getElementById("stato").value;

if (!nome) {
  msg.innerHTML = "Nome obbligatorio";
  return;
}

let error;

if (id) {

  // UPDATE
  const res = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .update({
      cliente_nome: nome,
      cliente_telefono: telefono,
      data,
      ora,
      coperti,
      note,
      stato
    })
    .eq("id", id);

  error = res.error;

} else {

  // INSERT
  const res = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .insert([{
      azienda_id: aziendaId,
      cliente_nome: nome,
      cliente_telefono: telefono,
      data,
      ora,
      coperti,
      note,
      stato: "confermata",
      canale: "manuale"
    }]);

  error = res.error;
}

if (error) {
  msg.innerHTML = error.message;
  return;
}

// redirect
window.location.hash = "#/prenotazioni";

};

}
