const supabase = window.supabase || window.supabaseClient;

export async function render(container) {
  const azienda_id = window.state?.azienda?.id;
  const sede_id = window.state?.sedeAttiva?.id || null;
  const sede_nome = window.state?.sedeAttiva?.nome || "";
  const azienda_slug = window.state?.azienda?.slug || "";
  const ruolo = window.state?.ruolo;

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<section class="view">Accesso negato</section>`;
    return;
  }
  if (!azienda_id) {
    container.innerHTML = `<section class="view">Azienda non selezionata</section>`;
    return;
  }

  const BASE = window.location.origin + window.location.pathname;
  let links = [];

  // Preset comodi basati sulla sede corrente — evitano di dover incollare
  // a mano URL lunghe con tutti i parametri.
  const presets = [
    { label: "📅 Prenotazione online", url: sede_id ? `${BASE}#/prenotazione-online?sede=${sede_id}` : "" },
    { label: "🍽️ Menu pubblico", url: azienda_slug ? `${BASE}#/menu-pubblico?az=${azienda_slug}` : "" },
  ].filter(p => p.url);

  container.innerHTML = `
    <section class="view" style="padding:16px;max-width:760px;margin:0 auto;">
      <div class="card">
        <h3 style="margin:0 0 4px;">🔗 Short Link</h3>
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;">
          Genera un link corto per prenotazioni, menu o qualsiasi pagina — comodo per i post social.
          ${sede_nome ? `Sede attuale: <strong>${esc(sede_nome)}</strong>` : ""}
        </p>

        ${presets.length ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${presets.map((p, i) => `<button class="btn-preset app-button" data-idx="${i}" type="button" style="font-size:12px;">${p.label}</button>`).join("")}
          </div>
        ` : ""}

        <label style="font-size:13px;font-weight:600;">URL di destinazione</label>
        <input id="sl-url" class="input" placeholder="https://..." style="margin-bottom:10px;">

        <label style="font-size:13px;font-weight:600;">Etichetta (facoltativa, solo per te)</label>
        <input id="sl-label" class="input" placeholder="Es. Post Instagram luglio" style="margin-bottom:12px;">

        <button id="btn-genera" class="app-button primary" type="button">✂️ Genera short link</button>
      </div>

      <div class="card" style="margin-top:16px;">
        <h4 style="margin:0 0 12px;">I tuoi short link</h4>
        <div id="sl-lista" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </section>
  `;

  qs("#btn-genera").onclick = generaLink;
  qs("#sl-url").addEventListener("keydown", (e) => { if (e.key === "Enter") generaLink(); });
  container.querySelectorAll(".btn-preset").forEach(btn => {
    btn.onclick = () => { qs("#sl-url").value = presets[btn.dataset.idx].url; };
  });

  await caricaLista();

  async function generaLink() {
    const url = qs("#sl-url").value.trim();
    const label = qs("#sl-label").value.trim() || null;

    if (!url) { alert("Incolla la URL di destinazione."); return; }
    try { new URL(url); } catch { alert("URL non valida."); return; }

    const btn = qs("#btn-genera");
    btn.disabled = true;
    btn.textContent = "Generazione...";

    let codice = generaCodiceCasuale();
    // Evita collisioni (molto improbabile ma controlliamo comunque)
    for (let tentativi = 0; tentativi < 5; tentativi++) {
      const { data: esiste } = await supabase.from("short_links").select("id").eq("codice", codice).maybeSingle();
      if (!esiste) break;
      codice = generaCodiceCasuale();
    }

    const { error } = await supabase.from("short_links").insert({
      azienda_id, sede_id, codice,
      url_destinazione: url,
      label,
      click_count: 0,
      attivo: true
    });

    btn.disabled = false;
    btn.textContent = "✂️ Genera short link";

    if (error) {
      console.error(error);
      alert("Errore durante la creazione del link: " + error.message);
      return;
    }

    qs("#sl-url").value = "";
    qs("#sl-label").value = "";
    await caricaLista();
  }

  async function caricaLista() {
    const { data, error } = await supabase
      .from("short_links")
      .select("*")
      .eq("azienda_id", azienda_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) { console.error(error); links = []; } else { links = data || []; }
    renderLista();
  }

  function renderLista() {
    const box = qs("#sl-lista");
    if (!links.length) {
      box.innerHTML = `<div style="font-size:13px;color:#94a3b8;text-align:center;padding:16px;">Nessun short link ancora creato.</div>`;
      return;
    }

    box.innerHTML = links.map(l => {
      const shortUrl = `${BASE}#/s/${l.codice}`;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;${l.attivo === false ? "opacity:.5;" : ""}">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#0E5A7A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(shortUrl)}</div>
            <div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.label ? esc(l.label) + " — " : ""}${esc(l.url_destinazione)}</div>
          </div>
          <div style="font-size:12px;color:#64748b;flex-shrink:0;white-space:nowrap;">👆 ${l.click_count || 0}</div>
          <button class="btn-copy app-button" data-url="${esc(shortUrl)}" type="button" style="flex-shrink:0;padding:6px 10px;font-size:12px;">📋 Copia</button>
          <button class="btn-copy-nude app-button" data-url="${esc(shortUrl.replace(/^https?:\/\//, ""))}" type="button" title="Copia senza https:// — comoda per bio social o vetrofanie" style="flex-shrink:0;padding:6px 10px;font-size:12px;">✂️</button>
          <button class="btn-toggle app-button" data-id="${l.id}" data-attivo="${l.attivo !== false}" type="button" style="flex-shrink:0;padding:6px 10px;font-size:12px;">${l.attivo === false ? "▶️" : "⏸️"}</button>
          <button class="btn-del app-button" data-id="${l.id}" type="button" style="flex-shrink:0;padding:6px 10px;font-size:12px;background:#fee2e2;color:#dc2626;">🗑</button>
        </div>
      `;
    }).join("");

    box.querySelectorAll(".btn-copy, .btn-copy-nude").forEach(btn => {
      btn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.url);
          const original = btn.textContent;
          btn.textContent = "✅";
          setTimeout(() => { btn.textContent = original; }, 1500);
        } catch {
          prompt("Copia manualmente:", btn.dataset.url);
        }
      };
    });

    box.querySelectorAll(".btn-toggle").forEach(btn => {
      btn.onclick = async () => {
        const nuovoStato = !(btn.dataset.attivo === "true");
        await supabase.from("short_links").update({ attivo: nuovoStato }).eq("id", btn.dataset.id);
        await caricaLista();
      };
    });

    box.querySelectorAll(".btn-del").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Eliminare questo short link? Chi lo ha già condiviso vedrà un errore.")) return;
        await supabase.from("short_links").delete().eq("id", btn.dataset.id);
        await caricaLista();
      };
    });
  }

  function generaCodiceCasuale() {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // niente 0/O/1/l/I ambigui
    let out = "";
    for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function esc(v) {
    return String(v || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function qs(sel) { return container.querySelector(sel); }
}
