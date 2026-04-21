export async function render(container){

  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  const clienteId = params.get("id");

  if(!clienteId || clienteId === "null"){
    container.innerHTML = `
      <div class="page">
        <h2>Cliente non collegato</h2>
        <p>Questa prenotazione non ha una scheda cliente.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="page">Caricamento...</div>`;

  // 🔥 CLIENTE (SAFE)
  let cliente = null;

  const { data: clienteData, error: clienteError } = await window.supabaseClient
    .from("contatti")
    .select("*")
    .eq("id", clienteId)
    .maybeSingle();

  if(!clienteError){
    cliente = clienteData;
  }

  if(!cliente){
    container.innerHTML = `
      <div class="page">
        <h2>Cliente non trovato</h2>
        <p>Il contatto non esiste o non è più disponibile.</p>
      </div>
    `;
    return;
  }

  // 🔥 PRENOTAZIONI
  let pren = [];
  const { data: prenData } = await window.supabaseClient
    .from("prenotazioni_tavoli")
    .select("*")
    .eq("contatto_id", clienteId)
    .order("data", { ascending: false });

  pren = prenData || [];

  // 🔥 TAG
  let listaTag = [];
  const { data: tagsData } = await window.supabaseClient
    .from("contatti_tag")
    .select("tag")
    .eq("contatto_id", clienteId);

  listaTag = tagsData?.map(t => t.tag) || [];

  // 🔥 ALERT
  const totale = pren.length;
  const noShow = pren.filter(p => p.stato === "no_show").length;

  let alert = [];
  if(noShow > 0) alert.push("🔴 No-show");
  if(totale >= 10) alert.push("🟣 VIP");
  else if(totale >= 3) alert.push("🔵 Abituale");

  container.innerHTML = `
    <div class="page">

      <div class="page-header">
        <h1>👤 Cliente</h1>
      </div>

      <div class="card">
        <h2>${cliente.nome || "-"}</h2>
        <div>📞 ${cliente.telefono || "-"}</div>
        ${cliente.email ? `<div>📩 ${cliente.email}</div>` : ""}

        <div style="margin-top:10px;">
          ${alert.map(a => `<span>${a}</span>`).join(" ")}
        </div>
      </div>

      <div class="card">
        <h3>🏷️ Tag</h3>

        <div id="tag-list">
          ${listaTag.map(t => `<span class="tag">${t}</span>`).join("")}
        </div>

        <div style="margin-top:10px;">
          <input id="new-tag" class="input" placeholder="Nuovo tag"/>
          <button id="add-tag" class="app-button">+</button>
        </div>
      </div>

      <div class="card">
        <h3>📊 Storico prenotazioni</h3>

        <div>
          ${pren.length ? pren.map(p => `
            <div style="margin-bottom:6px;">
              ${p.data} ${p.ora || ""} · ${p.coperti} · ${p.stato}
            </div>
          `).join("") : "Nessuna prenotazione"}
        </div>
      </div>

    </div>
  `;

  // 🔥 AGGIUNTA TAG
  const btn = document.getElementById("add-tag");
  if(btn){
    btn.onclick = async ()=>{
      const tag = document.getElementById("new-tag").value.trim();
      if(!tag) return;

      await window.supabaseClient
        .from("contatti_tag")
        .insert([{
          contatto_id: clienteId,
          tag
        }]);

      location.reload();
    };
  }
}
