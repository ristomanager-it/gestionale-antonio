// js/views/bo/bo-consulenti.js
import { createPageLayout } from "../../utils/pageLayout.js";

function getSupabase() { return window.supabase; }

export async function render(container) {
  const supabase = getSupabase();
  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = createPageLayout({
    title: "🔗 Accessi Consulenti",
    subtitle: "Invita il consulente del lavoro e il commercialista ad accedere alle loro sezioni",
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">

        <!-- INVITA -->
        <div class="card">
          <div class="card-header"><h3>➕ Invita consulente</h3></div>
          <div class="card-body">
            <div style="margin-bottom:12px">
              <label class="form-label">Email</label>
              <input type="email" id="cons-email" class="form-control" placeholder="email@studio.it"/>
            </div>
            <div style="margin-bottom:16px">
              <label class="form-label">Tipo di accesso</label>
              <select id="cons-ruolo" class="form-control">
                <option value="consulente_lavoro">👨‍💼 Consulente del Lavoro — Dipendenti, HR, Timbrature</option>
                <option value="commercialista">📊 Commercialista — Bilancio, Acquisti, Fatture</option>
              </select>
            </div>
            <div style="margin-bottom:16px">
              <label class="form-label">Nome (opzionale)</label>
              <input type="text" id="cons-nome" class="form-control" placeholder="Mario Rossi — Studio Rossi"/>
            </div>
            <button class="btn btn-primary" id="cons-invite-btn" onclick="invitaConsulente()">
              📧 Invia invito
            </button>
            <div id="cons-msg" style="margin-top:12px;display:none"></div>
          </div>
        </div>

        <!-- INFO ACCESSI -->
        <div class="card">
          <div class="card-header"><h3>ℹ️ Cosa vedono i consulenti</h3></div>
          <div class="card-body">
            <div style="margin-bottom:16px">
              <div style="font-weight:700;color:#0E5A7A;margin-bottom:6px">👨‍💼 Consulente del Lavoro</div>
              <div style="font-size:13px;color:#64748b;line-height:1.7">
                ✅ Elenco dipendenti e schede<br>
                ✅ Timbrature e presenze<br>
                ✅ Gestione ferie e permessi<br>
                ✅ Fascicolo HR<br>
                ✅ Documenti HR<br>
                ❌ Bilancio, costi, vendite
              </div>
            </div>
            <div style="border-top:1px solid #e5e7eb;padding-top:16px">
              <div style="font-weight:700;color:#7c3aed;margin-bottom:6px">📊 Commercialista</div>
              <div style="font-size:13px;color:#64748b;line-height:1.7">
                ✅ Bilancio live (P&L)<br>
                ✅ Fatture acquisto e DDT<br>
                ✅ Scadenze e pagamenti<br>
                ✅ Categorie contabili<br>
                ❌ Dipendenti, HR, operativo
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LISTA ACCESSI ATTIVI -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h3>👥 Accessi consulenti attivi</h3>
          <button class="btn btn-sm btn-secondary" onclick="loadConsulenti()">🔄 Aggiorna</button>
        </div>
        <div class="card-body" style="padding:0">
          <div id="consulenti-list">
            <div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>
          </div>
        </div>
      </div>
    `
  });

  await loadConsulenti();

  window.invitaConsulente = async function() {
    const email = document.getElementById("cons-email")?.value?.trim();
    const ruolo = document.getElementById("cons-ruolo")?.value;
    const nome = document.getElementById("cons-nome")?.value?.trim();
    const msg = document.getElementById("cons-msg");
    const btn = document.getElementById("cons-invite-btn");

    if (!email) { showMsg("Inserisci l'email", false); return; }

    btn.disabled = true;
    btn.textContent = "Invio in corso...";

    try {
      const supabaseUrl = supabase.supabaseUrl || `https://${supabase.supabaseKey?.split(".")[0]}.supabase.co`;
      const supabaseKey = supabase.supabaseKey;

      // Usa Edge Function invita-dipendente esistente
      const res = await fetch(`${window._supabaseUrl || "https://cuhcscpvhypoaplcmtjk.supabase.co"}/functions/v1/invita-dipendente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          email,
          ruolo,
          azienda_id: aziendaId,
          nome_completo: nome || email,
          redirect_url: window.location.origin + "/#/home",
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      showMsg("✅ Invito inviato a " + email, true);
      document.getElementById("cons-email").value = "";
      document.getElementById("cons-nome").value = "";
      await loadConsulenti();
    } catch(e) {
      showMsg("❌ Errore: " + e.message, false);
    }

    btn.disabled = false;
    btn.textContent = "📧 Invia invito";
  };

  window.revokaConsulente = async function(userId) {
    if (!confirm("Revocare l'accesso a questo consulente?")) return;
    await supabase.from("utenti_aziende")
      .update({ attivo: false })
      .eq("user_id", userId)
      .eq("azienda_id", aziendaId);
    await loadConsulenti();
  };

  async function loadConsulenti() {
    const el = document.getElementById("consulenti-list");
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>`;

    const { data } = await supabase
      .from("utenti_aziende")
      .select("user_id, ruolo, email, created_at, ultimo_accesso, attivo")
      .eq("azienda_id", aziendaId)
      .in("ruolo", ["consulente_lavoro", "commercialista"])
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      el.innerHTML = `<div style="padding:24px;text-align:center;color:#94a3b8">
        Nessun consulente invitato ancora.<br>
        <small>Usa il pannello a sinistra per inviare il primo invito.</small>
      </div>`;
      return;
    }

    const ruoloLabel = {
      consulente_lavoro: "👨‍💼 Consulente del Lavoro",
      commercialista: "📊 Commercialista",
    };
    const ruoloColor = {
      consulente_lavoro: "#0E5A7A",
      commercialista: "#7c3aed",
    };

    el.innerHTML = `
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th>Email</th>
            <th>Tipo accesso</th>
            <th>Invitato il</th>
            <th>Ultimo accesso</th>
            <th>Stato</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.map(u => `
            <tr style="opacity:${u.attivo ? 1 : 0.5}">
              <td><strong>${u.email || "—"}</strong></td>
              <td><span style="color:${ruoloColor[u.ruolo]};font-weight:700">${ruoloLabel[u.ruolo] || u.ruolo}</span></td>
              <td style="font-size:12px;color:#64748b">${u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : "—"}</td>
              <td style="font-size:12px;color:#64748b">${u.ultimo_accesso ? new Date(u.ultimo_accesso).toLocaleDateString("it-IT") : "Mai"}</td>
              <td>${u.attivo
                ? `<span style="background:#dcfce7;color:#16a34a;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700">Attivo</span>`
                : `<span style="background:#f3f4f6;color:#6b7280;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700">Revocato</span>`}
              </td>
              <td>
                ${u.attivo ? `<button class="btn btn-sm btn-danger" onclick="revokaConsulente('${u.user_id}')">Revoca</button>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function showMsg(text, ok) {
    const el = document.getElementById("cons-msg");
    el.style.display = "block";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "8px";
    el.style.fontSize = "13px";
    el.style.fontWeight = "600";
    el.style.background = ok ? "#dcfce7" : "#fef2f2";
    el.style.color = ok ? "#16a34a" : "#dc2626";
    el.style.border = `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`;
    el.textContent = text;
  }
}
