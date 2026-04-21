export async function render(container) {

  const params = window.routeParams || {};
  const contattoId = params.id;

  if(!contattoId){
    container.innerHTML = "Cliente non trovato";
    return;
  }

  container.innerHTML = `
    <div class="view">

      <div class="card" id="cliente-info">Caricamento...</div>

      <div class="card" id="cliente-stats"></div>

      <div class="card" id="cliente-storico"></div>

    </div>
  `;

  // 🔥 INFO CLIENTE
  const { data: cliente } = await window.supabaseClient
    .from("contatti")
    .select("*")
    .eq("id", contattoId)
    .single();

  if(!cliente){
    document.getElementById("cliente-info").innerHTML = "Cliente non trovato";
    return;
  }

  document.getElementById("cliente-info").innerHTML = `
    <h2>${cliente.nome || ""}</h2>
    <div>${cliente.telefono || ""}</div>
  `;

  // 🔥 PRENOTAZIONI
  const { data: pren } = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .select("*")
    .eq("contatto_id", contattoId)
    .order("data", { ascending: false });

  const totale = pren?.length || 0;
  const copertiTot = (pren || []).reduce((acc,p)=> acc + (p.coperti || 0),0);
  const copertiMedi = totale ? Math.round(copertiTot / totale) : 0;
  const noShow = (pren || []).filter(p => p.stato === "no_show").length;

  document.getElementById("cliente-stats").innerHTML = `
    <h3>📊 Statistiche</h3>
    <div>Visite: <strong>${totale}</strong></div>
    <div>Coperti medi: <strong>${copertiMedi}</strong></div>
    <div>No show: <strong>${noShow}</strong></div>
  `;

  // 🔥 ALERT
  let alert = [];

  if(noShow > 0) alert.push("🔴 Cliente con no-show");
  if(totale >= 10) alert.push("🟣 Cliente VIP");
  else if(totale >= 3) alert.push("🔵 Cliente abituale");

  if(alert.length){
    document.getElementById("cliente-stats").innerHTML += `
      <div style="margin-top:10px;">
        ${alert.map(a => `<div>${a}</div>`).join("")}
      </div>
    `;
  }

  // 🔥 STORICO
  document.getElementById("cliente-storico").innerHTML = `
    <h3>📅 Storico prenotazioni</h3>

    ${(pren && pren.length) ? pren.map(p => `
      <div style="padding:6px 0;border-bottom:1px solid #eee;">
        ${p.data} ${p.ora || ""} · ${p.coperti} coperti · ${p.stato}
      </div>
    `).join("") : "Nessuna prenotazione"}

  `;
}
