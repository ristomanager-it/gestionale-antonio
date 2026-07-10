export function initMenu() {

  const menu = document.getElementById("global-menu");
  const toggle = document.getElementById("menu-toggle");
  const headerRight = document.getElementById("header-right");

  if (!menu || !toggle) return;

  if (headerRight && !document.getElementById("notif-bell")) {
    // ── ICONA WHATSAPP ───────────────────────────────────────────────────
    if (!document.getElementById("wa-btn-header")) {
      const waBtn = document.createElement("div");
      waBtn.id = "wa-btn-header";
      waBtn.title = "WhatsApp Inbox";
      waBtn.style.cssText = `
        position: relative;
        cursor: pointer;
        margin-left: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #f0f7ff;
      `;
      waBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.964-1.418A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.073-1.115l-.292-.173-3.024.865.852-3.114-.19-.302A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.884c-.241-.121-1.428-.704-1.649-.785-.221-.08-.382-.12-.543.12-.16.242-.622.786-.763.947-.14.162-.281.182-.522.061-.241-.121-1.018-.375-1.939-1.197-.716-.64-1.2-1.43-1.341-1.671-.14-.242-.015-.372.106-.493.108-.108.241-.282.362-.422.12-.141.16-.242.241-.403.08-.161.04-.302-.02-.423-.06-.12-.543-1.309-.744-1.792-.196-.47-.395-.406-.543-.414l-.463-.008a.888.888 0 00-.643.302c-.221.242-.844.824-.844 2.01 0 1.186.864 2.332.984 2.493.121.16 1.7 2.596 4.12 3.641.576.248 1.025.396 1.374.507.577.184 1.103.158 1.518.096.463-.069 1.428-.584 1.629-1.148.2-.563.2-1.046.14-1.147-.06-.1-.221-.16-.462-.282z"/>
        </svg>
        <div id="wa-badge" style="
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 5px;
          display: none;
          min-width: 16px;
          text-align: center;
        ">0</div>
      `;
      waBtn.onclick = () => {
        window.location.hash = "#/bo-whatsapp";
        closeMenu();
      };
      headerRight.appendChild(waBtn);
    }

    // ── POLLING BADGE WA ─────────────────────────────────────────────────
    window.updateWaBadge = (count) => {
      const badge = document.getElementById("wa-badge");
      if (!badge) return;
      badge.textContent = count;
      badge.style.display = count > 0 ? "block" : "none";
    };

    async function pollWaBadge() {
      const aziendaId = window.state?.azienda?.id;
      if (!aziendaId) return;
      try {
        const { count } = await (window.supabaseClient || window.supabase)
          .from("whatsapp_messaggi")
          .select("id", { count: "exact", head: true })
          .eq("azienda_id", aziendaId)
          .eq("letto", false);
        window.updateWaBadge(count || 0);
      } catch {}
    }

    setTimeout(() => { pollWaBadge(); setInterval(pollWaBadge, 30000); }, 3000);

    // ── PULSANTE TONY AI — in header ─────────────────────────────────────
    if (!document.getElementById("tony-btn-header")) {
      const tonyBtn = document.createElement("div");
      tonyBtn.id = "tony-btn-header";
      tonyBtn.title = "Tony AI";
      tonyBtn.style.cssText = `
        cursor: pointer;
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        gap: 3px;
      `;
      tonyBtn.innerHTML = `
        <img src="https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/Avatar/Tony.png"
          style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #0E5A7A;box-shadow:0 2px 8px rgba(14,90,122,0.3);" />
        <span style="font-size:9px;font-weight:800;color:#0E5A7A;letter-spacing:0.4px;line-height:1;white-space:nowrap;">Tony.AI</span>
      `;
      tonyBtn.onclick = () => {
        window.location.hash = "#/ai";
        closeMenu();
      };
      headerRight.appendChild(tonyBtn);
    }

    // RistoflowBook rimosso dall'header su richiesta (restano solo WhatsApp e Tony)

    // Tasting rimosso dall'header — disponibile nel menu laterale

  }

  let overlay = document.querySelector(".menu-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
  }

  function getRuoloAttivo() {
    const raw = window.state?.viewAs || window.state?.ruolo;
    return window.normalizeRuolo ? window.normalizeRuolo(raw) : raw;
  }

  function isSuperadmin() {
    return !window.state?.viewAs && (
      window.state?.isSuperadmin === true ||
      getRuoloAttivo() === "superadmin"
    );
  }

  function isAziendaRole() {
    const r = getRuoloAttivo();
    return ["admin", "manager", "operatore"].includes(r);
  }

  function can(route) {
    if (!route) return true;
    const cleanRoute = String(route).split("?")[0];

    if (window.hasPermission) {
      return window.hasPermission(cleanRoute);
    }

    if (isSuperadmin()) return true;
    return isAziendaRole();
  }

  function go(route) {

    if (!can(route)) return;
    window.location.hash = "#/" + route;
    closeMenu();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getProfiloUtente() {

    const user = window.state?.user || {};
    const meta = user.user_metadata || {};

    const profile =
      window.state?.userProfile ||
      window.state?.profilo ||
      window.state?.dipendente ||
      {};

    const nome =
      profile.nome ||
      meta.nome ||
      meta.first_name ||
      "";

    const cognome =
      profile.cognome ||
      meta.cognome ||
      meta.last_name ||
      "";

    const displayName =
      [nome, cognome]
        .filter(Boolean)
        .join(" ")
        .trim() || "Utente";

    const foto =
      profile.foto_url ||
      profile.avatar_url ||
      meta.foto_url ||
      meta.avatar_url ||
      "";

    const ruolo =
      getRuoloAttivo() || "";

    return {
      nome,
      cognome,
      displayName,
      foto,
      ruolo
    };
  }

  async function loadMenuUserProfile() {

    const user =
      window.state?.user;

    const aziendaId =
      window.state?.azienda?.id;

    if (
      !user?.id ||
      !aziendaId ||
      window.state?.userProfile?.__loadedFor === user.id
    ) return;

    try {

      const { data } =
        await window.supabaseClient
          .from("dipendenti")
          .select(`
            nome,
            cognome,
            telefono,
            email,
            foto_url,
            avatar_url,
            ruolo
          `)
          .eq("user_id", user.id)
          .eq("azienda_id", aziendaId)
          .maybeSingle();

      if (data) {

        window.state.userProfile = {
          ...data,
          __loadedFor: user.id
        };

      }

    } catch (e) {

      console.warn(
        "Profilo menu non caricato:",
        e
      );

    }
  }

  function renderMenuHeader() {

    const azienda =
      window.state?.azienda;

    const sede =
      window.state?.sedeAttiva;

    const profilo =
      getProfiloUtente();

    const avatar =
      profilo.foto ||
      (
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(profilo.displayName)
      );

    const header =
      document.createElement("div");

    header.className =
      "menu-user-header";

    header.innerHTML = `
      <div class="menu-company-name">
        ${escapeHtml(azienda?.nome || "Ristoflow")}
      </div>

      <div class="menu-company-site">
        ${escapeHtml(sede?.nome || "Nessuna sede attiva")}
      </div>

      <div class="menu-user-row">

        <img
          class="menu-user-avatar"
          src="${escapeHtml(avatar)}"
          alt="Foto profilo"
        />

        <div class="menu-user-info">

          <div class="menu-user-name">
            ${escapeHtml(profilo.displayName)}
          </div>

          <div class="menu-user-role">
            ${escapeHtml(profilo.ruolo)}
          </div>

        </div>

      </div>
    `;

    return header;
  }

  function getMenu() {
    const sections = [];
    const ruolo = getRuoloAttivo();

    // ── PIATTAFORMA (solo superadmin) — visibile anche con viewAs attivo ──
    const isSa = window.state?.isSuperadmin === true
      || window.state?.ruolo === "superadmin"
      || window.state?.ruoloRaw === "superadmin"
      || (window.state?.aziende || []).some(a => a.ruolo === "superadmin");
    if (isSa) {
      sections.push({
        title: "PIATTAFORMA",
        items: [
          { label: "🖥️ Dashboard SaaS",    route: "homePiattaforma" },
          { label: "🏢 Gestione Aziende",  route: "gestioneAziende" },
          { label: "💍 Wedding Planner",   route: "gestioneWeddingPlanner" },
          { label: "➕ Crea Azienda",      route: "creaAzienda"     },
          { label: "💳 Piani Abbonamento", route: "gestionePiani"   },
        ]
      });
    }

    // ── OPERATIVO ──
    sections.push({
      key: "operativo",
      title: "OPERATIVO",
      items: [
        { label: "🏠 Home",             route: "home"           },
        { label: "👨‍🍳 Display Cucina", route: "display-cucina" },
        { label: "📦 Magazzino",        route: "magazzino"      },
        { label: "🕒 Timbratura",       route: "timbrature"     },
      ]
    });

    // ── SALA ──
    sections.push({
      key: "sala",
      title: "🪑 SALA",
      items: [
        { label: "🪑 Comande",           route: "bo-comande"         },
        { label: "📅 Prenotazioni",      route: "prenotazioni"       },
        { label: "🗓️ Tavoli",           route: "prenotazioni-tavoli"},
        { label: "🏛️ Location Ricevimenti", route: "bo-location-ricevimenti" },
        { label: "📑 Preventivi",        route: "preventivi"         },
        { label: "📋 Mansionario Sala",  route: "mansionario-sala"   },
        { label: "🗺️ Mappa Sala",       route: "sala"               },
      ]
    });

    // ── CUCINA ──
    sections.push({
      key: "cucina",
      title: "CUCINA",
      items: [
        { label: "📖 Ricettario",         route: "ricettario"         },
        { label: "➕ Nuova ricetta",       route: "crea-ricetta" },
        { label: "🏭 Produzione",          route: "produzione"         },
        { label: "🧪 Preparazioni",        route: "preparazioni"       },
        { label: "📋 Planning",            route: "planner-produzione" },
        { label: "🔌 Dispositivi",         route: "bo-dispositivi"     },
        { label: "📋 Mansionario Cucina",  route: "mansionario-cucina" },
      ]
    });

    // ── GESTIONE ──
    if (isAziendaRole() || isSuperadmin()) {
      sections.push({
        key: "gestione",
        title: "GESTIONE",
        items: [
          { label: "📊 Dashboard",        route: "bo-dashboard"      },
          { label: "🧮 Ragioniere",       route: "bo-bilancio"       },
          { label: "🛒 Acquisti",         route: "acquisti"          },
          { label: "💰 Venduto",          route: "venduto"           },
          { label: "📈 Margini",          route: "margini"           },
          { label: "🍽️ Menu Intelligence AI", route: "menu-intelligence" },
        ]
      });

      sections.push({
        key: "menu_prodotti",
        title: "MENU & PRODOTTI",
        items: [
          { label: "📋 Menu Builder",     route: "bo-menu"           },
          { label: "🧺 Prodotti",         route: "bo-prodotti"       },
          { label: "📂 Categorie",        route: "bo-categorie"      },
          { label: "🍳 Ricette BO",       route: "bo-ricette"        },
          { label: "📦 Magazzino BO",     route: "bo-magazzino"      },
          { label: "👨‍🍳 Produzione BO",  route: "bo-produzione"     },
        ]
      });

      sections.push({
        key: "marketing",
        title: "MARKETING & CRM",
        items: [
          { label: "📉 Analytics",          route: "bo-analytics"      },
          { label: "🏷️ Tag & LTV",       route: "bo-tag"            },
          { label: "💬 Template WhatsApp",route: "bo-template"       },
          { label: "📣 Campagne",         route: "bo-marketing"      },
          { label: "🎁 Promo",             route: "bo-promo"          },
          { label: "🎫 Fidelity & Network", route: "bo-fidelity"       },
          { label: "🔗 Catenarie",          route: "bo-catenarie"      },
          { label: "✂️ Short Link",         route: "bo-shortlink"      },
          { label: "📱 WhatsApp Inbox",     route: "bo-whatsapp",      badge: "wa" },
          { label: "🤖 Chatbot",             route: "bo-chatbot"        },
          { label: "🖼️ Media Library",       route: "bo-media"          },
          { label: "🌐 Sito Web",              route: "bo-sito"           },
        ]
      });

      sections.push({
        key: "personale",
        title: "PERSONALE",
        items: [
          { label: "👥 Candidature",      route: "bo-candidature"    },
          { label: "💬 Survey team",       route: "bo-survey"         },
          { label: "👨‍💼 Dipendenti",     route: "dipendenti"        },
          { label: "➕ Nuovo dipendente", route: "crea-dipendente"   },
          { label: "🏢 Agenzie",          route: "bo-agenzie"        },
          { label: "🔐 Permessi",         route: "permessi-operatore"},
          { label: "📆 Gestione ferie",   route: "hr-admin"          },
          { label: "👤 Fascicolo HR",      route: "hr-fascicolo"      },
          { label: "📁 Documenti HR",      route: "hr-documenti"      },
          { label: "📘 Manuale",          route: "manuale"           },
        ]
      });

      sections.push({
        key: "configurazione",
        title: "CONFIGURAZIONE",
        items: [
          { label: "🚀 Setup guidato",        route: "bo-onboarding"    },
          { label: "⚙️ Impostazioni",         route: "bo-configurazione" },
          { label: "🔗 Accessi Consulenti",   route: "bo-consulenti"    },
          { label: "🖼️ Media Library",        route: "bo-media"         },
        ]
      });

      // ── HOTEL ──
      sections.push({
        key: "hotel",
        title: "🏨 HOTEL",
        items: [
          { label: "🏨 Vai a Ristoflow Hotel", url: "https://hotel.ristoflow-ai.com", external: true },
        ]
      });

      // ── AGENTI VENDITA — solo se l'utente è un agente registrato ──
      if (window.state?._isAgenteAttivo === true) {
        sections.push({
          title: "🤝 VENDITA",
          items: [
            { label: "🤝 Home Agente", route: "home-agente" },
          ]
        });
      }
    }

    // ── TASTING — sempre visibile ──
    sections.push({
      key: "tasting",
      title: "🍷 TASTING",
      items: [
        { label: "🎫 Vendite",       route: "ticket-vendite"  },
        { label: "✅ Check-in",      route: "ticket-checkin"  },
        { label: "📋 Mansionario",   route: "mansionario-tasting" },
        { label: "🍷 Vai a Tasting", url: "https://tasting.ristoflow-ai.com", external: true },
      ]
    });

    // ── CONSULENTE DEL LAVORO ──
    if (ruolo === "consulente_lavoro") {
      sections.length = 0; // svuota tutto
      sections.push({
        title: "DIPENDENTI",
        items: [
          { label: "👨‍💼 Dipendenti",       route: "dipendenti"      },
          { label: "➕ Nuovo dipendente",  route: "crea-dipendente" },
          { label: "🕒 Timbrature",        route: "timbrature"      },
          { label: "📆 Gestione ferie",    route: "hr-admin"        },
          { label: "👤 Fascicolo HR",       route: "hr-fascicolo"    },
          { label: "📁 Documenti HR",       route: "hr-documenti"    },
        ]
      });
      sections.push({
        title: "IL MIO PROFILO",
        items: [
          { label: "👤 Profilo", route: "completa-profilo" },
        ]
      });
      return sections;
    }

    // ── COMMERCIALISTA ──
    if (ruolo === "commercialista") {
      sections.length = 0; // svuota tutto
      sections.push({
        title: "CONTABILITÀ",
        items: [
          { label: "📈 Bilancio live", route: "bo-bilancio" },
          { label: "🛒 Acquisti",      route: "acquisti"    },
        ]
      });
      sections.push({
        title: "IL MIO PROFILO",
        items: [
          { label: "👤 Profilo", route: "completa-profilo" },
        ]
      });
      return sections;
    }

    // ── SEDI ──
    sections.push({
      title: "SEDI",
      items: (() => {
        if (["manager","operatore"].includes(ruolo)) {
          return [{ label: "🔄 Cambia sede", route: "gestione-sedi" }];
        }
        return [
          { label: "🔄 Cambia sede",   route: "gestione-sedi"              },
          { label: "➕ Crea sede",     route: "gestione-sedi?mode=first"   },
          { label: "⚙️ Gestisci sedi", route: "gestione-sedi?mode=manage" },
        ];
      })()
    });

    // ── PERSONALE ──
    sections.push({
      title: "IL MIO PROFILO",
      items: [
        { label: "👤 Profilo",            route: "completa-profilo" },
        { label: "🕒 Timbratura",         route: "timbrature"       },
        { label: "📆 Richiedi ferie",     route: "hr-richieste"     },
        { label: "📁 I miei documenti",   route: "hr-documenti-me"  },

      ]
    });

    return riordinaPerTipoApp(sections);
  }

  // ── RIORDINO SEZIONI IN BASE AL TIPO ATTIVITÀ ──
  // Non nasconde nulla: porta in alto ciò che conta di più per quel business.
  function riordinaPerTipoApp(sections) {
    const tipoApp = window.state?.azienda?.tipo_app || [];
    if (!Array.isArray(tipoApp) || !tipoApp.length) return sections;

    // priorità per ciascun tipo attività: chiavi messe per prime
    const PRIORITA = {
      hotel:      ["hotel", "personale", "gestione", "marketing", "configurazione", "operativo", "sala", "cucina", "menu_prodotti", "tasting"],
      tasting:    ["tasting", "marketing", "gestione", "personale", "configurazione", "operativo", "sala", "cucina", "menu_prodotti", "hotel"],
      bar:        ["sala", "menu_prodotti", "gestione", "marketing", "cucina", "personale", "configurazione", "operativo", "hotel", "tasting"],
      ristorante: ["sala", "cucina", "gestione", "menu_prodotti", "marketing", "personale", "configurazione", "operativo", "hotel", "tasting"],
    };

    // combina priorità di tutti i tipi selezionati (se multi-tipo, es. hotel+ristorante)
    const ordineKeys = [];
    tipoApp.forEach(t => {
      (PRIORITA[t] || []).forEach(k => { if (!ordineKeys.includes(k)) ordineKeys.push(k); });
    });

    const fixedFirst = sections.filter(s => s.title === "PIATTAFORMA");
    const fixedLast   = sections.filter(s => ["SEDI","IL MIO PROFILO"].includes(s.title));
    const middle      = sections.filter(s => s.key && !["PIATTAFORMA","SEDI","IL MIO PROFILO"].includes(s.title));
    const noKey       = sections.filter(s => !s.key && !["PIATTAFORMA","SEDI","IL MIO PROFILO"].includes(s.title));

    middle.sort((a, b) => {
      const ia = ordineKeys.indexOf(a.key);
      const ib = ordineKeys.indexOf(b.key);
      const pa = ia === -1 ? 999 : ia;
      const pb = ib === -1 ? 999 : ib;
      return pa - pb;
    });

    return [...fixedFirst, ...middle, ...noKey, ...fixedLast];
  }

  function renderMenu() {

    menu.innerHTML = "";

    menu.appendChild(
      renderMenuHeader()
    );

    const struttura =
      getMenu();

    struttura.forEach(section => {

      const items =
        section.items.filter(
          i => can(i.route)
        );

      if (items.length === 0) return;

      const sectionBox =
        document.createElement("div");

      sectionBox.className =
        "menu-section";

      const title =
        document.createElement("div");

      title.className =
        "menu-category";

      title.innerHTML = `
        <span>${section.title}</span>
        <span class="menu-arrow">›</span>
      `;

      const itemsBox =
        document.createElement("div");

      itemsBox.className =
        "menu-subitems";

      items.forEach(item => {

        const row =
          document.createElement("div");

        row.className =
          "menu-subitem";

        if (item.badge === "wa") {
          const badgeCount = document.getElementById("wa-badge")?.textContent || "0";
          const badgeVisible = document.getElementById("wa-badge")?.style.display !== "none";
          row.innerHTML = `
            <span>${item.label}</span>
            <span id="wa-menu-badge" style="
              background:#ef4444;
              color:white;
              border-radius:50%;
              font-size:10px;
              font-weight:700;
              padding:2px 6px;
              min-width:16px;
              text-align:center;
              display:${badgeVisible ? "inline-block" : "none"};
            ">${badgeCount}</span>
          `;
          row.style.display = "flex";
          row.style.justifyContent = "space-between";
          row.style.alignItems = "center";
        } else {
          row.innerText = item.label;
        }

        row.onclick = () => {
          if (item.url) {
            // SSO: passa il token Supabase all'app hotel
            if (item.url && (item.url.includes("hotel.ristoflow-ai.com") || item.url.includes("tasting.ristoflow-ai.com"))) {
              (async () => {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session?.access_token) {
                  const url = item.url + "#access_token=" + session.access_token + "&refresh_token=" + session.refresh_token + "&type=sso";
                  window.open(url, "_blank");
                } else {
                  window.open(item.url, "_blank");
                }
              })();
            } else {
              window.open(item.url, "_blank");
            }
          } else {
            go(item.route);
          }
        };

        itemsBox.appendChild(row);

      });

      title.onclick = () => {

        const isOpen =
          itemsBox.classList.contains("open");

        document
          .querySelectorAll(".menu-subitems")
          .forEach(el => {
            el.classList.remove("open");
          });

        document
          .querySelectorAll(".menu-arrow")
          .forEach(el => {
            el.style.transform =
              "rotate(0deg)";
          });

        if (!isOpen) {

          itemsBox.classList.add("open");

          title.querySelector(
            ".menu-arrow"
          ).style.transform =
            "rotate(90deg)";

        }

      };

      sectionBox.appendChild(title);
      sectionBox.appendChild(itemsBox);

      menu.appendChild(sectionBox);

    });

    // Pulisci cache
    const cacheBtn = document.createElement("div");
    cacheBtn.className = "menu-logout";
    cacheBtn.style.cssText = "background:#f3f4f6;color:#374151;margin-bottom:4px;font-size:12px;";
    cacheBtn.innerText = "🔄 Aggiorna app";
    cacheBtn.onclick = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
      } catch(e) {}
      window.location.reload(true);
    };
    menu.appendChild(cacheBtn);

    // Manuale prima del logout
    const manualeBtn = document.createElement("div");
    manualeBtn.className = "menu-logout";
    manualeBtn.style.cssText = "background:#e8f4f8;color:#0E5A7A;margin-bottom:4px;";
    manualeBtn.innerText = "📘 Manuale d'uso";
    manualeBtn.onclick = () => {
      window.location.hash = "#/manuale";
      closeMenu();
    };
    menu.appendChild(manualeBtn);

    // ── RISTOFLOWBOOK BUTTON ──────────────────────────────────────────────
    const rfbMenuBtn = document.createElement("div");
    rfbMenuBtn.className = "menu-logout";
    rfbMenuBtn.style.cssText = `
      background: linear-gradient(135deg, #0E5A7A 0%, #22c55e 50%, #f97316 100%);
      color: white;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `;
    rfbMenuBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.5 14.5L4 19l1.5 1.5L10 16m5.5-1.5L20 19l-1.5 1.5L14 16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="8" r="4" stroke="white" stroke-width="1.5"/>
        <path d="M12 4v8M8 8h8" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      🌐 RistoflowBook
    `;
    rfbMenuBtn.onclick = () => {
      window.open("https://social.ristoflow-ai.com", "_blank");
      closeMenu();
    };
    menu.appendChild(rfbMenuBtn);

    const logout =
      document.createElement("div");

    logout.className =
      "menu-logout";

    logout.innerText =
      "Logout";

    logout.onclick = () => {

      if (window.router?.logout) {
        window.router.logout();
      }

      closeMenu();

    };

    menu.appendChild(logout);
  }

  async function openMenu() {

    await loadMenuUserProfile();

    renderMenu();

    menu.classList.add("open");
    overlay.classList.add("open");
  }

  function closeMenu() {

    menu.classList.remove("open");
    overlay.classList.remove("open");

  }

  toggle.onclick = () => {

    if (menu.classList.contains("open")) {

      closeMenu();

    } else {

      openMenu();

    }

  };

  overlay.onclick = closeMenu;

  window.menuController = {

    refresh: renderMenu,

    open: openMenu,

    close: closeMenu

  };
}

