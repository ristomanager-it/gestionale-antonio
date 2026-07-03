import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const EDGE_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/invita-wedding-planner";

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function render(container) {

  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({ body: "<p>Sezione riservata alla piattaforma.</p>" })
    });
    return;
  }

  container.innerHTML = createPageLayout({
    title: "Wedding Planner",
    subtitle: "Onboarding e anagrafica wedding planner (Ristoflow Wedding)",
    content: `
      <style>
        .wp-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px; }
        .wp-btn { border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600; }
        .wp-form input { width:100%;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:8px;box-sizing:border-box; }
        .wp-grid2 { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
        @media(max-width:600px){ .wp-grid2{ grid-template-columns:1fr; } }
        .wp-badge { display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700; }
      </style>

      <div class="wp-card">
        <h3 style="margin-top:0;">➕ Invita nuovo Wedding Planner</h3>
        <div class="wp-form">
          <input id="wp-nome-studio" placeholder="Nome studio / attività *">
          <div class="wp-grid2">
            <input id="wp-referente" placeholder="Nome referente">
            <input id="wp-email" type="email" placeholder="Email *">
          </div>
          <div class="wp-grid2">
            <input id="wp-telefono" placeholder="Telefono">
            <input id="wp-citta" placeholder="Città">
          </div>
        </div>
        <button id="btn-wp-invita" class="wp-btn" style="background:#7c3aed;color:white;">Invita</button>
        <span id="wp-msg" style="margin-left:10px;font-size:13px;"></span>
      </div>

      <div id="wp-lista"></div>
    `
  });

  async function caricaLista() {
    const { data } = await supabase
      .from("wedding_planners")
      .select("*")
      .order("created_at", { ascending: false });

    const box = container.querySelector("#wp-lista");
    if (!data?.length) {
      box.innerHTML = '<div class="wp-card" style="text-align:center;color:#64748b;">Nessun wedding planner ancora.</div>';
      return;
    }

    box.innerHTML = data.map(wp => `
      <div class="wp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:15px;">
              ${esc(wp.nome_studio)}
              ${wp.attivo === false ? '<span class="wp-badge" style="background:#fee2e2;color:#dc2626;">DISATTIVO</span>' : '<span class="wp-badge" style="background:#dcfce7;color:#16a34a;">ATTIVO</span>'}
            </div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">
              ${wp.referente_nome ? esc(wp.referente_nome) + ' · ' : ''}${esc(wp.email)}${wp.telefono ? ' · ' + esc(wp.telefono) : ''}
            </div>
            ${wp.citta ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px;">📍 ${esc(wp.citta)}</div>` : ''}
          </div>
          <button data-toggle="${wp.id}" data-stato="${wp.attivo}" class="wp-btn" style="background:${wp.attivo === false ? '#16a34a' : '#f59e0b'};color:white;">
            ${wp.attivo === false ? 'Riattiva' : 'Disattiva'}
          </button>
        </div>
      </div>
    `).join("");

    box.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.onclick = async () => {
        const attivoOra = btn.dataset.stato === "true";
        await supabase.from("wedding_planners").update({ attivo: !attivoOra }).eq("id", btn.dataset.toggle);
        caricaLista();
      };
    });
  }

  await caricaLista();

  container.querySelector("#btn-wp-invita").onclick = async () => {
    const msg = container.querySelector("#wp-msg");
    const nome_studio = container.querySelector("#wp-nome-studio").value.trim();
    const email = container.querySelector("#wp-email").value.trim();

    if (!nome_studio || !email) {
      msg.style.color = "#dc2626";
      msg.textContent = "Nome studio ed email sono obbligatori";
      return;
    }

    msg.style.color = "#64748b";
    msg.textContent = "Invio in corso...";

    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          nome_studio,
          referente_nome: container.querySelector("#wp-referente").value.trim() || null,
          email,
          telefono: container.querySelector("#wp-telefono").value.trim() || null,
          citta: container.querySelector("#wp-citta").value.trim() || null,
        })
      });
      const data = await res.json();

      if (!data.success) {
        msg.style.color = "#dc2626";
        msg.textContent = "Errore: " + data.error;
        return;
      }

      msg.style.color = "#16a34a";
      msg.textContent = "✅ Invitato";
      ["#wp-nome-studio", "#wp-referente", "#wp-email", "#wp-telefono", "#wp-citta"]
        .forEach(sel => container.querySelector(sel).value = "");
      await caricaLista();
    } catch (err) {
      msg.style.color = "#dc2626";
      msg.textContent = "Errore di rete: " + err.message;
    }
  };
}
