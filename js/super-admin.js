// js/super-admin.js
// Gestione aziende - Super Admin

(function () {
  const supabase = window.supabaseClient;

  const panel = document.getElementById("sa-aziende-panel");
  if (!panel) return;

  const lista = document.getElementById("sa-aziende-lista");
  const btnSalva = document.getElementById("btn-sa-salva-azienda");

  const inputId = document.getElementById("sa-azienda-id");
  const inputNome = document.getElementById("sa-azienda-nome");
  const inputPiano = document.getElementById("sa-azienda-piano");
  const inputMaxLocali = document.getElementById("sa-azienda-max-locali");
  const inputMaxUtenti = document.getElementById("sa-azienda-max-utenti");

  // =========================
  async function caricaAziende() {
    const { data, error } = await supabase
      .from("aziende")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Errore caricamento aziende");
      return;
    }

    lista.innerHTML = "";

    data.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.nome}</td>
        <td>${a.piano}</td>
        <td>${a.max_locali}</td>
        <td>${a.max_utenti}</td>
        <td>
          <button class="app-button tiny gray">Modifica</button>
        </td>
      `;

      tr.querySelector("button").addEventListener("click", () => {
        inputId.value = a.id;
        inputNome.value = a.nome;
        inputPiano.value = a.piano;
        inputMaxLocali.value = a.max_locali;
        inputMaxUtenti.value = a.max_utenti;
      });

      lista.appendChild(tr);
    });
  }

  // =========================
  btnSalva.addEventListener("click", async () => {
    const payload = {
      nome: inputNome.value,
      piano: inputPiano.value,
      max_locali: Number(inputMaxLocali.value),
      max_utenti: Number(inputMaxUtenti.value),
    };

    if (!payload.nome) {
      alert("Nome azienda obbligatorio");
      return;
    }

    if (inputId.value) {
      await supabase.from("aziende").update(payload).eq("id", inputId.value);
    } else {
      await supabase.from("aziende").insert(payload);
    }

    inputId.value = "";
    inputNome.value = "";
    inputMaxLocali.value = "";
    inputMaxUtenti.value = "";

    caricaAziende();
  });

  // =========================
  caricaAziende();
})();
