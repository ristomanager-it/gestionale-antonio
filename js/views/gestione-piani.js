// js/views/gestione-piani.js
import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const FEATURE_KEYS = [
  // Ristorante
  "cassa", "menu_digitale", "prenotazioni_base", "prenotazioni_avanzate",
  "ricettario", "food_cost", "produzione", "preparazioni",
  "magazzino", "acquisti", "venduto", "margini",
  "dipendenti", "hr_timbrature", "report_kpi",
  "marketing", "promo", "fidelity", "catenarie",
  "whatsapp_notifiche", "chatbot_whatsapp",
  "multi_sede", "social", "api",
  "tony_ai", "preventivi", "ocr_fatture",
  // Hotel
  "hotel_planning", "hotel_prenotazioni", "hotel_checkin",
  "hotel_operations", "hotel_colazione", "hotel_minibar",
  "hotel_report", "tony_hotel", "booking_online",
  // Fondatore
  "fondatore_badge", "priority_support", "future_features",
];

function safeText(v) { return String(v ?? ""); }
function toBool(v) { return v === true; }

function getEnabledFeatures(featuresObj) {
  const f = featuresObj && typeof featuresObj === "object" ? featuresObj : {};
  return FEATURE_KEYS.filter((k) => f[k] === true);
}

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({ body: `<p>Sezione riservata alla piattaforma.</p>` }),
    });
    return;
  }

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
      <div>
        <div style="font-size:14px;color:#6b7280;">SaaS</div>
        <div style="margin-top:4px;font-weight:800;font-size:18px;">Piani abbonamento</div>
        <div style="margin-top:6px;font-size:13px;color:#6b7280;">Gestisci prezzi, limiti sedi e feature incluse.</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="app-button green" id="btn-nuovo-piano">➕ Nuovo Piano</button>
        <button class="app-button small gray" id="btn-home">⬅ Dashboard</button>
      </div>
    </div>
    <div id="piani-list" style="margin-top:16px;"></div>
    <div id="piano-editor" style="margin-top:16px;"></div>
  `;

  container.innerHTML = createPageLayout({
    title: "Gestione Piani",
    subtitle: "Piattaforma",
    content: createCard({ body: content }),
  });

  document.getElementById("btn-home").onclick = () => { window.location.hash = "#/homePiattaforma"; };
  document.getElementById("btn-nuovo-piano").onclick = () => { renderEditor(null); };

  await caricaPiani();
}

async function caricaPiani() {
  const { data, error } = await supabase
    .from("piani_abbonamento")
    .select("id,nome,prezzo_mensile,sedi_max,features,tipo,stripe_price_id_mensile,stripe_price_id_annuale")
    .order("prezzo_mensile", { ascending: true });

  const container = document.getElementById("piani-list");
  container.innerHTML = "";

  if (error) {
    container.innerHTML = `<div style="color:#dc2626;">Errore: ${safeText(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="small-muted">Nessun piano configurato.</p>`;
    return;
  }

  // Conta aziende per piano
  const { data: aziende } = await supabase
    .from("aziende")
    .select("piano_id")
    .neq("stato", "piattaforma");

  const conteggioPerPiano = {};
  (aziende || []).forEach(a => {
    if (a.piano_id) conteggioPerPiano[a.piano_id] = (conteggioPerPiano[a.piano_id] || 0) + 1;
  });

  data.forEach((p) => {
    const div = document.createElement("div");
    div.style.cssText = "background:white;border:1px solid #e5e7eb;border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:0 10px 26px rgba(0,0,0,0.04);";

    const enabled = getEnabledFeatures(p.features);
    const nAziende = conteggioPerPiano[p.id] || 0;
    // sedi_max dal campo dedicato o da features (retrocompatibilità)
    const sediMax = p.sedi_max ?? p.features?.sedi_max ?? 1;

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div style="min-width:220px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-weight:900;font-size:16px;">${safeText(p.nome).toUpperCase()}</div>
            <span style="font-size:11px;padding:3px 8px;border-radius:999px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;">
              ${nAziende} client${nAziende !== 1 ? "i" : "e"}
            </span>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;">
              € <strong>${safeText(p.prezzo_mensile)}</strong> / mese
            </span>
            <span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;">
              Sedi max: <strong>${sediMax}</strong>
            </span>
            <span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;">
              Tipo: <strong>${p.tipo || "mensile"}</strong>
            </span>
            <span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;">
              Feature: <strong>${enabled.length}</strong>
            </span>
            ${p.stripe_price_id_mensile ? `<span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #d1fae5;background:#f0fdf4;color:#065f46;">✅ Stripe mensile</span>` : `<span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #fee2e2;background:#fef2f2;color:#991b1b;">⚠️ No Stripe ID</span>`}
            ${p.stripe_price_id_annuale ? `<span style="font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #d1fae5;background:#f0fdf4;color:#065f46;">✅ Stripe annuale</span>` : ''}
          </div>
          ${enabled.length
            ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
                ${enabled.slice(0,12).map(k => `<span style="font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;">${k}</span>`).join("")}
                ${enabled.length > 12 ? `<span style="font-size:11px;color:#6b7280;">+${enabled.length - 12}</span>` : ""}
              </div>`
            : `<div style="margin-top:10px;font-size:12px;color:#6b7280;">Nessuna feature attiva.</div>`
          }
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="app-button small gray" data-edit="${p.id}">Modifica</button>
          <button class="app-button small red" data-delete="${p.id}" data-nome="${safeText(p.nome)}" data-clienti="${nAziende}">Elimina</button>
        </div>
      </div>
    `;

    container.appendChild(div);
  });

  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const { data: piano } = await supabase
        .from("piani_abbonamento")
        .select("id,nome,prezzo_mensile,sedi_max,features,tipo,stripe_price_id_mensile,stripe_price_id_annuale")
        .eq("id", id)
        .single();
      if (piano) renderEditor(piano);
    });
  });

  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete");
      const nome = btn.getAttribute("data-nome");
      const nClienti = parseInt(btn.getAttribute("data-clienti") || "0");

      if (nClienti > 0) {
        alert(`Impossibile eliminare "${nome}": ha ${nClienti} client${nClienti !== 1 ? "i" : "e"} attiv${nClienti !== 1 ? "i" : "o"}. Sposta prima i clienti su un altro piano.`);
        return;
      }

      if (!confirm(`Elimina piano "${nome}"? Questa azione non è reversibile.`)) return;

      const { error } = await supabase.from("piani_abbonamento").delete().eq("id", id);
      if (error) { alert("Errore: " + error.message); return; }
      window.router.reloadCurrentRoute();
    });
  });
}

function renderEditor(piano) {
  const editor = document.getElementById("piano-editor");
  const isEdit = !!piano?.id;
  const currentFeatures = piano?.features && typeof piano.features === "object" ? piano.features : {};
  const sediMax = piano?.sedi_max ?? currentFeatures?.sedi_max ?? 1;

  const featureChecks = FEATURE_KEYS.map((key) => {
    const checked = toBool(currentFeatures[key]) ? "checked" : "";
    return `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;cursor:pointer;">
        <input type="checkbox" data-feature="${key}" ${checked} />
        <span style="font-weight:600;font-size:13px;">${key}</span>
      </label>
    `;
  }).join("");

  editor.innerHTML = `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:22px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-size:14px;color:#6b7280;">Editor piano</div>
          <div style="margin-top:4px;font-weight:900;font-size:16px;">
            ${isEdit ? `Modifica: ${safeText(piano?.nome).toUpperCase()}` : "Nuovo piano"}
          </div>
        </div>
        <button class="app-button small gray" id="btn-cancel-editor">Chiudi</button>
      </div>

      <div style="margin-top:14px;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">

        <div style="background:white;border:1px solid #e5e7eb;border-radius:18px;padding:14px;display:grid;gap:10px;">
          <label style="font-size:13px;font-weight:600;">
            Nome piano
            <input id="p-nome" class="input" value="${safeText(piano?.nome)}" placeholder="Es. Business" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Slug (URL)
            <input id="p-slug" class="input" value="${safeText(piano?.slug)}" placeholder="Es. business" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Descrizione
            <input id="p-desc" class="input" value="${safeText(piano?.descrizione)}" placeholder="Descrizione breve" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Prezzo mensile (€)
            <input id="p-prezzo" type="number" class="input" value="${safeText(piano?.prezzo_mensile ?? 0)}" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Prezzo annuale (€)
            <input id="p-prezzo-annuale" type="number" class="input" value="${safeText(piano?.prezzo_annuale ?? 0)}" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Sedi max
            <input id="p-sedi" type="number" class="input" value="${safeText(piano?.sedi_max ?? 1)}" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Utenti max
            <input id="p-utenti" type="number" class="input" value="${safeText(piano?.utenti_max ?? 10)}" style="margin-top:4px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Tipo piano
            <select id="p-tipo" class="input" style="margin-top:4px;">
              <option value="ristorante" ${(piano?.tipo||'ristorante')==='ristorante'?'selected':''}>🍽️ Ristorante</option>
              <option value="hotel" ${piano?.tipo==='hotel'?'selected':''}>🏨 Hotel</option>
              <option value="full" ${piano?.tipo==='full'?'selected':''}>⭐ Full</option>
              <option value="fondatore" ${piano?.tipo==='fondatore'?'selected':''}>👑 Fondatore</option>
            </select>
          </label>
          <label style="font-size:13px;font-weight:600;">
            Icona emoji
            <input id="p-icona" class="input" value="${safeText(piano?.icona ?? '🍽️')}" style="margin-top:4px;max-width:80px;" />
          </label>
          <label style="font-size:13px;font-weight:600;">
            Colore (hex)
            <input id="p-colore" type="color" value="${safeText(piano?.colore ?? '#0E5A7A')}" style="margin-top:4px;height:36px;width:60px;" />
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="p-popolare" ${piano?.popolare?'checked':''} style="accent-color:#0E5A7A;"> Piano popolare
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="p-attivo" ${piano?.attivo!==false?'checked':''} style="accent-color:#0E5A7A;"> Attivo
          </label>
          <div style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:4px;">
            <div style="font-size:12px;color:#6b7280;font-weight:700;margin-bottom:8px;">💳 STRIPE PRICE IDs</div>
            <label style="font-size:13px;font-weight:600;">
              Price ID mensile
              <input id="p-stripe-mensile" class="input" value="${safeText(piano?.stripe_price_id_mensile)}" placeholder="price_live_..." style="margin-top:4px;font-family:monospace;font-size:11px;" />
            </label>
            <label style="font-size:13px;font-weight:600;margin-top:8px;display:block;">
              Price ID annuale
              <input id="p-stripe-annuale" class="input" value="${safeText(piano?.stripe_price_id_annuale)}" placeholder="price_live_..." style="margin-top:4px;font-family:monospace;font-size:11px;" />
            </label>
            <div style="margin-top:6px;font-size:11px;color:#9ca3af;">Trovi gli ID su <a href="https://dashboard.stripe.com/products" target="_blank" style="color:#0E5A7A;">Stripe Dashboard → Prodotti</a></div>
          </div>
        </div>

        <div style="background:white;border:1px solid #e5e7eb;border-radius:18px;padding:14px;">
          <div style="font-weight:800;margin-bottom:10px;">Feature incluse</div>
          <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
            ${featureChecks}
          </div>
        </div>

      </div>

      <div id="piano-editor-error" style="margin-top:12px;color:#dc2626;font-size:13px;"></div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="app-button primary" id="btn-save-piano">
          ${isEdit ? "Salva modifiche" : "Crea piano"}
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-cancel-editor").onclick = () => { editor.innerHTML = ""; };

  const errorEl = document.getElementById("piano-editor-error");

  document.getElementById("btn-save-piano").onclick = async () => {
    errorEl.textContent = "";

    const nome     = document.getElementById("p-nome").value.trim();
    const slug     = document.getElementById("p-slug").value.trim().toLowerCase().replace(/\s+/g,'-');
    const desc     = document.getElementById("p-desc").value.trim();
    const prezzo   = Number(document.getElementById("p-prezzo").value || 0);
    const prezzoA  = Number(document.getElementById("p-prezzo-annuale").value || 0);
    const sedi     = Number(document.getElementById("p-sedi").value || 1);
    const utenti   = Number(document.getElementById("p-utenti").value || 10);
    const tipo     = document.getElementById("p-tipo").value;
    const icona    = document.getElementById("p-icona").value.trim();
    const colore   = document.getElementById("p-colore").value;
    const popolare = document.getElementById("p-popolare").checked;
    const attivo   = document.getElementById("p-attivo").checked;

    if (!nome) { errorEl.textContent = "Inserisci un nome piano."; return; }

    const featureInputs = editor.querySelectorAll("[data-feature]");
    const features = {};
    featureInputs.forEach((input) => {
      features[input.getAttribute("data-feature")] = input.checked === true;
    });

    const payload = {
      nome, slug, descrizione: desc,
      prezzo_mensile: prezzo, prezzo_annuale: prezzoA,
      sedi_max: sedi, utenti_max: utenti,
      tipo, icona, colore, popolare, attivo,
      features,
      stripe_price_id_mensile: document.getElementById("p-stripe-mensile").value.trim() || null,
      stripe_price_id_annuale: document.getElementById("p-stripe-annuale").value.trim() || null,
    };

    const res = isEdit
      ? await supabase.from("piani_abbonamento").update(payload).eq("id", piano.id).select()
      : await supabase.from("piani_abbonamento").insert(payload).select();

    if (res.error) { errorEl.textContent = res.error.message || "Errore salvataggio."; return; }

    editor.innerHTML = "";
    window.router.reloadCurrentRoute();
  };
}
