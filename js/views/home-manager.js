export async function render(container, reparto) {

  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  const today = new Date().toISOString().slice(0,10);

  let servizi = [];
  let staff = [];
  let timbrature = [];

  try {

    const { data: serviziData } = await supabase
      .from("servizi")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("data_servizio", today)
      .order("ora_inizio");

    servizi = serviziData || [];

    const { data: staffData } = await supabase
      .from("servizio_staff")
      .select(`
        *,
        dipendenti(nome)
      `)
      .eq("azienda_id", azienda.id);

    staff = staffData || [];

    const { data: timbratureData } = await supabase
      .from("timbrature")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("data", today);

    timbrature = timbratureData || [];

  } catch(e) {
    console.error("home manager load error", e);
  }

  const serviziHtml = servizi.map(s => {

    const staffCount = staff.filter(st => st.servizio_id === s.id).length;

    return `
      <div class="servizio-row">
        <div class="servizio-tipo">${s.tipo_servizio}</div>
        <div class="servizio-info">
          ${s.coperti_previsti || 0} coperti
        </div>
        <div class="servizio-staff">
          brigata ${staffCount}
        </div>
      </div>
    `;

  }).join("");

  const timbrati = timbrature.filter(t => t.tipo === "ingresso").length;
  const pause = timbrature.filter(t => t.tipo === "pausa").length;
  const usciti = timbrature.filter(t => t.tipo === "uscita").length;

  container.innerHTML = `

  <div class="view manager-home">

    <div class="manager-header">

      <div>
        <div class="manager-title">Dashboard manager</div>
        <div class="manager-reparto">${reparto || ""}</div>
      </div>

    </div>

    <div class="agenda-card">

      <div class="card-title">Programma oggi</div>

      ${serviziHtml || "<div>Nessun servizio oggi</div>"}

    </div>

    <div class="agenda-card">

      <div class="card-title">Urgenze</div>

      <div class="alert">⚠ Controllare brigata servizi</div>
      <div class="alert">⚠ Verificare produzioni cucina</div>

    </div>

    <div class="manager-grid">

      <div class="card" onclick="location.hash='#/servizi'">
        <div class="card-title">Servizi</div>
        <div class="card-sub">${servizi.length} servizi oggi</div>
      </div>

      <div class="card" onclick="location.hash='#/produzione'">
        <div class="card-title">Produzioni</div>
        <div class="card-sub">Gestione cucina</div>
      </div>

      <div class="card" onclick="location.hash='#/dipendenti'">
        <div class="card-title">Brigata</div>
        <div class="card-sub">${staff.length} assegnati</div>
      </div>

      <div class="card" onclick="location.hash='#/timbrature'">
        <div class="card-title">Timbrature</div>
        <div class="card-sub">
          ${timbrati} timbrati • ${pause} pausa • ${usciti} usciti
        </div>
      </div>

    </div>

    <div class="tony-box">

      <div class="card-title">Tony segnala</div>

      <div class="tony-msg">
        • Controllare coperti cena
      </div>

      <div class="tony-msg">
        • Verificare produzioni
      </div>

    </div>

  </div>

  <style>

  .manager-header{
    margin-bottom:20px;
  }

  .manager-title{
    font-size:22px;
    font-weight:800;
  }

  .manager-reparto{
    font-size:13px;
    color:#6b7280;
  }

  .agenda-card{
    background:white;
    padding:16px;
    border-radius:14px;
    margin-bottom:14px;
  }

  .card-title{
    font-weight:700;
    margin-bottom:10px;
  }

  .servizio-row{
    display:flex;
    justify-content:space-between;
    padding:6px 0;
    border-bottom:1px solid #eee;
  }

  .alert{
    color:#dc2626;
    font-size:14px;
  }

  .manager-grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
    gap:12px;
    margin-bottom:14px;
  }

  .card{
    background:white;
    padding:16px;
    border-radius:14px;
    cursor:pointer;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
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

  .tony-msg{
    font-size:14px;
    margin-top:6px;
  }

  </style>

  `;
}
