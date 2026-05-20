export default async function renderPermessiOperatore(container) {

  const supabase =
    window.supabaseClient;

  const aziendaId =
    window.state?.azienda?.id;

  if (!aziendaId) {

    container.innerHTML = `
      <div class="page">
        Azienda non trovata
      </div>
    `;

    return;
  }

  const PERMESSI = [

    {
      key: "planning.write",
      label: "Planning produzione"
    },

    {
      key: "acquisti.write",
      label: "Gestione acquisti"
    },

    {
      key: "magazzino.write",
      label: "Gestione magazzino"
    },

    {
      key: "ricette.write",
      label: "Gestione ricette"
    },

    {
      key: "dipendenti.read",
      label: "Visualizza dipendenti"
    },

    {
      key: "dipendenti.write",
      label: "Gestione dipendenti"
    }

  ];

  container.innerHTML = `
    <div class="page">

      <div class="page-header">
        <h1>
          🔐 Permessi operatori
        </h1>
      </div>

      <div id="permessi-list"></div>

    </div>
  `;

  const list =
    container.querySelector(
      "#permessi-list"
    );

  async function load() {

    list.innerHTML =
      `<div class="card">Caricamento...</div>`;

    const { data: dipendenti } =
      await supabase
        .from("dipendenti")
        .select(`
          id,
          nome,
          cognome,
          ruolo
        `)
        .eq("azienda_id", aziendaId)
        .eq("ruolo", "operatore")
        .order("nome");

    const { data: permessiData } =
      await supabase
        .from("permessi_utenti")
        .select(`
          id,
          dipendente_id,
          permesso,
          attivo
        `)
        .eq("azienda_id", aziendaId);

    const map =
      {};

    (permessiData || [])
      .forEach(p => {

        if (!map[p.dipendente_id]) {
          map[p.dipendente_id] = {};
        }

        map[p.dipendente_id][p.permesso] =
          p.attivo;

      });

    list.innerHTML = "";

    (dipendenti || [])
      .forEach(d => {

        const card =
          document.createElement("div");

        card.className =
          "card";

        card.style.marginBottom =
          "16px";

        card.innerHTML = `

          <div style="
            font-size:18px;
            font-weight:700;
            margin-bottom:16px;
          ">
            ${d.nome} ${d.cognome}
          </div>

          <div class="perm-grid">

            ${PERMESSI.map(p => {

              const active =
                map[d.id]?.[p.key] === true;

              return `

                <label
                  class="perm-item"
                >

                  <input
                    type="checkbox"
                    data-dip="${d.id}"
                    data-perm="${p.key}"
                    ${active ? "checked" : ""}
                  />

                  <span>
                    ${p.label}
                  </span>

                </label>

              `;

            }).join("")}

          </div>

        `;

        list.appendChild(card);

      });

    bindEvents();

  }

  function bindEvents() {

    list
      .querySelectorAll("input[type='checkbox']")
      .forEach(input => {

        input.onchange =
          async () => {

            const dipendenteId =
              input.dataset.dip;

            const permesso =
              input.dataset.perm;

            const checked =
              input.checked;

            if (checked) {

              await supabase
                .from("permessi_utenti")
                .upsert({

                  azienda_id:
                    aziendaId,

                  dipendente_id:
                    dipendenteId,

                  permesso,

                  attivo: true

                });

            } else {

              await supabase
                .from("permessi_utenti")
                .delete()
                .eq(
                  "azienda_id",
                  aziendaId
                )
                .eq(
                  "dipendente_id",
                  dipendenteId
                )
                .eq(
                  "permesso",
                  permesso
                );

            }

          };

      });

  }

  await load();

}
