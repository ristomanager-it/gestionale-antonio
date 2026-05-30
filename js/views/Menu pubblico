// js/views/menu-pubblico.js
// Pagina pubblica menu digitale — accessibile senza login via #/menu/:slug

const supabase = () => window.supabaseClient || window.supabase;

export async function renderMenuPubblico(container, slug) {
  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="font-size:14px;color:#64748b;">Caricamento menu...</div>
    </div>`;

  try {
    // Carica menu
    const { data: menu, error } = await supabase()
      .from("menu")
      .select("*")
      .eq("slug", slug)
      .eq("attivo", true)
      .maybeSingle();

    if (error || !menu) {
      container.innerHTML = renderErrore("Menu non trovato o non attivo.");
      return;
    }

    // Carica categorie
    const { data: categorie } = await supabase()
      .from("menu_categorie")
      .select("*")
      .eq("menu_id", menu.id)
      .order("ordine");

    // Carica voci
    const { data: voci } = await supabase()
      .from("menu_voci")
      .select("*")
      .eq("menu_id", menu.id)
      .eq("visibile", true)
      .eq("disponibile", true)
      .order("ordine");

    // Carica allergeni per voce
    const { data: allergeni } = await supabase()
      .from("menu_voci_allergeni")
      .select("*")
      .eq("menu_id", menu.id);

    // Carica campi tracciamento
    const { data: trackingFields } = await supabase()
      .from("menu_tracking_fields")
      .select("*")
      .eq("menu_id", menu.id)
      .order("ordine");

    const bg = menu.colore_sfondo || "#ffffff";
    const font = menu.font_family || "Arial";
    const fontWeight = menu.font_weight || "normal";
    const fontSize = menu.font_size || "16";

    container.innerHTML = `
      <div style="
        min-height:100vh;
        background:${bg};
        font-family:${font},sans-serif;
        font-size:${fontSize}px;
        font-weight:${fontWeight};
      ">
        <!-- Header -->
        <div style="
          position:sticky;top:0;z-index:100;
          background:${menu.cover_url ? 'none' : '#0f172a'};
          ${menu.cover_url ? `background:url('${menu.cover_url}') center/cover;` : ''}
          color:white;
          padding:20px 16px 16px;
          display:flex;
          align-items:flex-end;
          gap:12px;
          min-height:120px;
        ">
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
          <div style="position:relative;display:flex;align-items:flex-end;gap:12px;width:100%;">
            ${menu.logo_url ? `<img src="${menu.logo_url}" style="width:56px;height:56px;object-fit:contain;border-radius:12px;background:white;padding:4px;flex-shrink:0;">` : ''}
            <div>
              <h1 style="margin:0;font-size:22px;line-height:1.2;">${esc(menu.nome)}</h1>
              ${menu.descrizione ? `<p style="margin:4px 0 0;font-size:13px;opacity:0.85;">${esc(menu.descrizione)}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Navigazione categorie -->
        <div style="
          position:sticky;top:0;z-index:99;
          background:white;
          border-bottom:1px solid #e5e7eb;
          overflow-x:auto;
          white-space:nowrap;
          padding:0 12px;
          display:flex;
          gap:4px;
        " id="cat-nav">
          ${(categorie||[]).map(c => `
            <button onclick="scrollToCategoria('cat-${c.id}')" style="
              padding:12px 14px;
              border:none;
              background:transparent;
              font-size:14px;
              font-weight:500;
              color:#374151;
              cursor:pointer;
              border-bottom:2px solid transparent;
              white-space:nowrap;
            " data-cat-btn="${c.id}">${esc(c.nome)}</button>
          `).join('')}
        </div>

        <!-- Contenuto -->
        <div style="max-width:720px;margin:0 auto;padding:16px;">

          ${(categorie||[]).map(cat => {
            const vociCat = (voci||[]).filter(v => String(v.categoria_id) === String(cat.id));
            if (!vociCat.length) return '';
            return `
              <div id="cat-${cat.id}" style="margin-bottom:32px;">
                <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
                  ${esc(cat.nome)}
                </h2>
                <div style="display:flex;flex-direction:column;gap:12px;">
                  ${vociCat.map(v => {
                    const allerg = (allergeni||[]).filter(a => String(a.voce_id) === String(v.id));
                    return `
                      <div style="
                        background:white;
                        border-radius:14px;
                        padding:14px;
                        box-shadow:0 1px 4px rgba(0,0,0,0.08);
                        display:flex;
                        gap:12px;
                        align-items:flex-start;
                      ">
                        ${v.foto_url ? `<img src="${v.foto_url}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;flex-shrink:0;">` : ''}
                        <div style="flex:1;min-width:0;">
                          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            <strong style="font-size:15px;color:#0f172a;">${esc(v.nome||v.nome_snapshot||'')}</strong>
                            ${v.prezzo_override || v.prezzo ? `<span style="font-size:15px;font-weight:700;color:#0E5A7A;white-space:nowrap;">€${Number(v.prezzo_override||v.prezzo||0).toFixed(2).replace('.',',')}</span>` : ''}
                          </div>
                          ${v.descrizione || v.descrizione_snapshot ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.4;">${esc(v.descrizione||v.descrizione_snapshot||'')}</p>` : ''}
                          ${allerg.length ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">
                            ${allerg.map(a => `<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:999px;">${esc(a.nome||a.codice||'')}</span>`).join('')}
                          </div>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}

          <!-- Modulo raccolta dati -->
          ${(trackingFields||[]).length ? `
            <div style="
              margin-top:24px;
              background:white;
              border-radius:16px;
              padding:20px;
              box-shadow:0 1px 4px rgba(0,0,0,0.08);
            ">
              <h3 style="margin:0 0 16px;font-size:16px;">Lascia i tuoi dati</h3>
              <form id="tracking-form" onsubmit="submitTracking(event, '${menu.id}', '${menu.azienda_id}')">
                ${trackingFields.map(f => `
                  <div style="margin-bottom:12px;">
                    <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#374151;">
                      ${esc(f.label)} ${f.obbligatorio ? '<span style="color:#dc2626;">*</span>' : ''}
                    </label>
                    ${f.tipo === 'textarea'
                      ? `<textarea name="${esc(f.label)}" ${f.obbligatorio ? 'required' : ''} style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;" rows="3"></textarea>`
                      : `<input type="${esc(f.tipo)}" name="${esc(f.label)}" ${f.obbligatorio ? 'required' : ''} style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;">`
                    }
                  </div>
                `).join('')}
                <button type="submit" style="
                  width:100%;padding:12px;
                  background:#0E5A7A;color:white;
                  border:none;border-radius:10px;
                  font-size:15px;font-weight:600;
                  cursor:pointer;margin-top:4px;
                ">Invia</button>
                <div id="tracking-esito" style="margin-top:8px;font-size:13px;text-align:center;"></div>
              </form>
            </div>
          ` : ''}

          <div style="text-align:center;padding:24px 0 8px;font-size:12px;color:#94a3b8;">
            Powered by Ristoflow AI
          </div>
        </div>
      </div>

      <script>
        function scrollToCategoria(id) {
          document.getElementById(id)?.scrollIntoView({behavior:'smooth', block:'start'});
        }

        async function submitTracking(e, menuId, aziendaId) {
          e.preventDefault();
          const form = e.target;
          const esito = document.getElementById('tracking-esito');
          const dati = {};
          new FormData(form).forEach((v, k) => dati[k] = v);
          try {
            const supabase = window.supabaseClient || window.supabase;
            await supabase.from('menu_tracking_risposte').insert({
              azienda_id: aziendaId,
              menu_id: menuId,
              dati,
              user_agent: navigator.userAgent
            });
            esito.innerHTML = '<span style="color:#16a34a;">✅ Grazie! Dati inviati.</span>';
            form.reset();
          } catch(err) {
            esito.innerHTML = '<span style="color:#dc2626;">Errore invio. Riprova.</span>';
          }
        }

        // Evidenzia categoria attiva durante scroll
        window.addEventListener('scroll', () => {
          const cats = document.querySelectorAll('[id^="cat-"]');
          let active = null;
          cats.forEach(el => {
            if (el.getBoundingClientRect().top <= 120) active = el.id.replace('cat-','');
          });
          document.querySelectorAll('[data-cat-btn]').forEach(btn => {
            const isActive = btn.dataset.catBtn === active;
            btn.style.borderBottomColor = isActive ? '#0E5A7A' : 'transparent';
            btn.style.color = isActive ? '#0E5A7A' : '#374151';
          });
        });
      </script>
    `;

  } catch(e) {
    console.error(e);
    container.innerHTML = renderErrore("Errore caricamento menu.");
  }
}

function renderErrore(msg) {
  return `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;">
    <div style="text-align:center;color:#64748b;padding:40px;">
      <div style="font-size:48px;margin-bottom:16px;">🍽️</div>
      <p>${msg}</p>
    </div>
  </div>`;
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
