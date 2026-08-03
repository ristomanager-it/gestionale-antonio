export async function render(container) {

  container.innerHTML = `
    <div class="page">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <h1>🪑 Sala</h1>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="app-button" id="btn-add-tavolo">➕ Tavolo</button>
          <button class="app-button gray" id="btn-refresh-sala">Aggiorna</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px;">
        <div style="font-size:14px;display:flex;gap:16px;flex-wrap:wrap;">
          <span>🟢 Libero</span>
          <span>🟡 Prenotato</span>
          <span>🔴 Occupato</span>
        </div>
        <div style="margin-top:8px;font-size:13px;color:#555;">
          Trascina i tavoli per posizionarli. Click sul tavolo per aprire la comanda. Click destro per modificarlo.
        </div>
      </div>

      <div class="card">
        <div id="sala-container" class="sala-mappa" style="
          position:relative;
          min-height:600px;
          background:#f8fafc;
          border-radius:12px;
          overflow:auto;
          border:1px solid #e5e7eb;
        "></div>
      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const box = document.getElementById("sala-container");

  let tavoli = [];
  let stati = [];
  let prenotazioni = [];

  document.getElementById("btn-refresh-sala").onclick = load;

  document.getElementById("btn-add-tavolo").onclick = async () => {
    const nome = prompt("Nome tavolo?");
    if (!nome) return;

    const coperti = parseInt(prompt("Coperti massimi?", "2"), 10) || 2;

    const { error } = await window.supabaseClient
      .from("tavoli")
      .insert([{
        azienda_id: aziendaId,
        sede_id: sedeId,
        nome,
        coperti_min: 1,
        coperti_max: coperti,
        unibile: true,
        attivo: true,
        pos_x: 40,
        pos_y: 40
      }]);

    if (error) {
      console.error("Errore creazione tavolo:", error);
      alert("Errore durante la creazione del tavolo");
      return;
    }

    await load();
  };

  async function load() {

    box.innerHTML = "Caricamento sala...";

    const oggi = new Date().toISOString().split("T")[0];

    // le tre letture partono insieme: prima erano in fila e la sala ci metteva il triplo
    const [tav, sta, pre] = await Promise.all([
      window.supabaseClient.from("tavoli").select("*")
        .eq("azienda_id", aziendaId).eq("sede_id", sedeId).eq("attivo", true)
        .order("nome", { ascending: true }),
      window.supabaseClient.from("tavoli_stato").select("*")
        .eq("azienda_id", aziendaId),
      window.supabaseClient.from("prenotazioni_tavoli").select("*")
        .eq("azienda_id", aziendaId).eq("sede_id", sedeId).eq("data", oggi),
    ]);

    if (tav.error) {
      console.error("Errore tavoli:", tav.error);
      box.innerHTML = "Errore caricamento tavoli";
      return;
    }
    tavoli = tav.data || [];

    if (sta.error) console.error("Errore stati tavoli:", sta.error);
    stati = sta.data || [];

    if (pre.error) console.error("Errore prenotazioni sala:", pre.error);
    prenotazioni = pre.data || [];

    renderSala();
  }

  function renderSala() {

    box.innerHTML = "";

    if (!tavoli.length) {
      box.innerHTML = `
        <div style="padding:24px;text-align:center;color:#666;">
          Nessun tavolo configurato.<br/>
          Usa il pulsante <strong>➕ Tavolo</strong> per creare il primo tavolo.
        </div>
      `;
      return;
    }

    tavoli.forEach(t => {

      const stato = stati.find(s => s.tavolo_id === t.id);
      const pren = prenotazioni.find(p => p.tavolo_id === t.id);

      let classe = "libero";
      let statoLabel = "Libero";
      let extra = "";

      if (stato?.stato === "occupato") {
        classe = "occupato";
        statoLabel = "Occupato";
      } else if (pren) {
        classe = "prenotato";
        statoLabel = "Prenotato";
        extra = `
          <div style="font-size:11px;margin-top:4px;line-height:1.2;">
            ${escapeHtml(pren.ora || "")} · ${escapeHtml(pren.cliente_nome || "")}
          </div>
        `;
      }

      const el = document.createElement("div");
      el.className = "tavolo-mappa " + classe;

      el.style.position = "absolute";
      el.style.left = (toNumber(t.pos_x) || 0) + "px";
      el.style.top = (toNumber(t.pos_y) || 0) + "px";
      el.style.width = "96px";
      el.style.height = "96px";
      el.style.borderRadius = "14px";
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "grab";
      el.style.userSelect = "none";
      el.style.fontWeight = "700";
      el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
      el.style.border = "1px solid rgba(0,0,0,0.08)";
      el.style.transition = "transform .12s ease";

      if (classe === "libero") el.style.background = "#e8f5e9";
      if (classe === "occupato") el.style.background = "#ffebee";
      if (classe === "prenotato") el.style.background = "#fff3cd";

      el.innerHTML = `
        <div style="font-size:15px;">${escapeHtml(t.nome || "Tavolo")}</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(String(t.coperti_max || 0))} coperti</div>
        <div style="font-size:11px;margin-top:4px;">${statoLabel}</div>
        ${extra}
      `;

      el.onmouseenter = () => {
        el.style.transform = "scale(1.03)";
      };

      el.onmouseleave = () => {
        el.style.transform = "scale(1)";
      };

      enableDrag(el, t);

      el.onclick = async (e) => {
        if (el.dataset.dragging === "1") return;
        e.stopPropagation();

        const prenotazione = prenotazioni.find(p => p.tavolo_id === t.id);
        const statoLive = stati.find(s => s.tavolo_id === t.id);

        if (prenotazione && prenotazione.stato === "confermata") {
          await window.supabaseClient
            .from("prenotazioni_tavoli")
            .update({ stato: "arrivata" })
            .eq("id", prenotazione.id);
        }

        if (!statoLive) {
          await window.supabaseClient
            .from("tavoli_stato")
            .insert([{
              tavolo_id: t.id,
              azienda_id: aziendaId,
              stato: "occupato",
              coperti: prenotazione?.coperti || null,
              ora_apertura: new Date().toISOString()
            }]);
        }

        window.location.hash = "#/comanda?tavolo=" + t.id;
      };

      el.oncontextmenu = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await modificaTavolo(t);
      };

      box.appendChild(el);
    });
  }

  function enableDrag(el, tavolo) {

    let isDragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;

    el.onmousedown = (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      moved = false;
      el.dataset.dragging = "0";
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      el.style.cursor = "grabbing";
    };

    document.onmousemove = (e) => {
      if (!isDragging) return;

      moved = true;
      el.dataset.dragging = "1";

      const rect = box.getBoundingClientRect();

      let x = e.clientX - rect.left - offsetX + box.scrollLeft;
      let y = e.clientY - rect.top - offsetY + box.scrollTop;

      x = Math.max(0, x);
      y = Math.max(0, y);

      el.style.left = x + "px";
      el.style.top = y + "px";
    };

    document.onmouseup = async () => {
      if (!isDragging) return;

      isDragging = false;
      el.style.cursor = "grab";

      const x = parseInt(el.style.left, 10) || 0;
      const y = parseInt(el.style.top, 10) || 0;

      if (moved) {
        const { error } = await window.supabaseClient
          .from("tavoli")
          .update({
            pos_x: x,
            pos_y: y
          })
          .eq("id", tavolo.id);

        if (error) {
          console.error("Errore salvataggio posizione:", error);
        }
      }

      setTimeout(() => {
        el.dataset.dragging = "0";
      }, 80);
    };
  }

  async function modificaTavolo(tavolo) {

    const nome = prompt("Nome tavolo", tavolo.nome || "");
    if (nome === null) return;

    const coperti = parseInt(prompt("Coperti massimi", String(tavolo.coperti_max || 2)), 10) || tavolo.coperti_max || 2;

    const azione = prompt("Scrivi:\nmodifica = salva modifiche\nelimina = disattiva tavolo", "modifica");

    if (azione === null) return;

    if (azione.toLowerCase() === "elimina") {
      const conferma = confirm(`Disattivare il tavolo ${tavolo.nome}?`);
      if (!conferma) return;

      const { error } = await window.supabaseClient
        .from("tavoli")
        .update({ attivo: false })
        .eq("id", tavolo.id);

      if (error) {
        console.error("Errore eliminazione tavolo:", error);
        alert("Errore durante la disattivazione del tavolo");
        return;
      }

      await load();
      return;
    }

    const { error } = await window.supabaseClient
      .from("tavoli")
      .update({
        nome,
        coperti_max: coperti
      })
      .eq("id", tavolo.id);

    if (error) {
      console.error("Errore modifica tavolo:", error);
      alert("Errore durante il salvataggio del tavolo");
      return;
    }

    await load();
  }

  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  load();
}
