export async function render(container) {

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const user = window.state?.user;

  const today = new Date().toISOString().slice(0,10);

  let servizioOggi = null;

  try {

    const { data } = await supabase
      .from("servizi")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("data_servizio", today)
      .limit(1)
      .single();

    servizioOggi = data;

  } catch(e){
    console.log(e);
  }

  container.innerHTML = `

  <div class="view operatore-home">

    <div class="operatore-header">

      <div class="operatore-title">
        Area operatore
      </div>

      <div class="operatore-sub">
        Benvenuto ${user?.email || ""}
      </div>

    </div>

    <div class="operatore-grid">

      <div class="card big" onclick="location.hash='#/timbrature'">
        ⏱ Timbratura
      </div>

      <div class="card">

        <div class="card-title">
          Servizio di oggi
        </div>

        <div class="card-sub">
          ${servizioOggi ? servizioOggi.tipo_servizio : "Nessun servizio"}
        </div>

      </div>

      <div class="card" onclick="location.hash='#/task'">

        <div class="card-title">
          Compiti
        </div>

        <div class="card-sub">
          Vedi attività assegnate
        </div>

      </div>

      <div class="card" onclick="location.hash='#/produzione'">

        <div class="card-title">
          Produzioni
        </div>

        <div class="card-sub">
          Preparazioni cucina
        </div>

      </div>

      <div class="card" onclick="location.hash='#/ferie'">

        <div class="card-title">
          Permessi
        </div>

        <div class="card-sub">
          Richiedi ferie o permessi
        </div>

      </div>

    </div>

    <div class="tony-box">

      <div class="tony-title">
        Tony
      </div>

      <div class="tony-msg">
        Controlla i compiti del servizio
      </div>

    </div>

  </div>

  <style>

  .operatore-header{
    margin-bottom:20px;
  }

  .operatore-title{
    font-size:22px;
    font-weight:800;
  }

  .operatore-sub{
    font-size:13px;
    color:#6b7280;
  }

  .operatore-grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    gap:12px;
    margin-bottom:16px;
  }

  .card{
    background:white;
    padding:16px;
    border-radius:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
    cursor:pointer;
  }

  .card.big{
    font-size:18px;
    font-weight:700;
    text-align:center;
  }

  .card-title{
    font-weight:700;
  }

  .card-sub{
    font-size:12px;
    color:#6b7280;
    margin-top:4px;
  }

  .tony-box{
    background:white;
    padding:16px;
    border-radius:14px;
  }

  .tony-title{
    font-weight:700;
    margin-bottom:6px;
  }

  </style>

  `;
}
