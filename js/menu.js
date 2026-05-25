export function initMenu() {

  const menu = document.getElementById("global-menu");
  const toggle = document.getElementById("menu-toggle");
  const headerRight = document.getElementById("header-right");

  if (!menu || !toggle) return;

  if (headerRight && !document.getElementById("notif-bell")) {
    const bell = document.createElement("div");
    bell.id = "notif-bell";
    bell.style.position = "relative";
    bell.style.cursor = "pointer";
    bell.style.marginLeft = "10px";

    bell.innerHTML = `
      <span style="font-size:20px;">🔔</span>
      <div id="notif-badge" style="
        position:absolute;
        top:-6px;
        right:-6px;
        background:#ef4444;
        color:white;
        border-radius:50%;
        font-size:10px;
        padding:2px 6px;
        display:none;
      ">0</div>
    `;

    bell.onclick = () => {
      if (window.toggleNotificheDropdown) {
        window.toggleNotificheDropdown();
      }
    };

    headerRight.appendChild(bell);
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

    if (isSuperadmin()) {

      sections.push({

        title: "PIATTAFORMA",

        items: [

          {
            label: "Dashboard SaaS",
            route: "homePiattaforma"
          },

          {
            label: "Gestione Aziende",
            route: "gestioneAziende"
          },

          {
            label: "Crea Azienda",
            route: "creaAzienda"
          },

          {
            label: "Piani Abbonamento",
            route: "gestionePiani"
          }

        ]

      });

    }

    sections.push({

      title: "GENERALE",

      items: [

        {
          label: "Home",
          route: "home"
        },

        {
          label: "📘 Manuale operativo",
          route: "manuale"
        }

      ]

    });

    if (isAziendaRole() || isSuperadmin()) {

      sections.push({

        title: "BACK OFFICE",

        items: [

          {
            label: "⚙️ Back Office",
            route: "bo-dashboard"
          },

          {
            label: "🍳 BO Ricette",
            route: "bo-ricette"
          },

          {
            label: "🧾 Editor Ricette",
            route: "ricette-editor"
          },

          {
            label: "📦 BO Magazzino",
            route: "bo-magazzino"
          },

          {
            label: "👨‍🍳 BO Produzione",
            route: "bo-produzione"
          },

          {
            label: "🪑 BO Comande",
            route: "bo-comande"
          },

          {
            label: "🏷️ Tag",
            route: "bo-tag"
          },

          {
            label: "📄 Template",
            route: "bo-template"
          },

          {
            label: "📋 Menu Builder",
            route: "bo-menu"
          },

          {
            label: "📂 Categorie",
            route: "bo-categorie"
          },

          {
            label: "🧺 Prodotti",
            route: "bo-prodotti"
          },

          {
            label: "📣 Marketing",
            route: "bo-marketing"
          }

        ]

      });

    }

    sections.push(

      {

        title: "OPERATIVO",

        items: [

          {
            label: "🪑 Sala",
            route: "sala"
          },

          {
            label: "📅 Prenotazioni",
            route: "prenotazioni"
          },

          {
            label: "📅 Tavoli",
            route: "prenotazioni-tavoli"
          },

          {
            label: "Planning Produzione",
            route: "planner-produzione"
          },

          {
            label: "⚙️ Produzione",
            route: "app-produzione"
          },

          {
            label: "Preparazioni",
            route: "preparazioni"
          },

          {
            label: "Magazzino",
            route: "magazzino"
          },

          {
            label: "Ricettario",
            route: "ricettario"
          },

          {
            label: "➕ Crea Ricetta",
            route: "creaRicetta"
          }
{
  label: "🍽️ Ricette Semplici",
  route: "ricette-semplici"
},
        ]

      },

      {

        title: "AMMINISTRAZIONE",

        items: [

          {
            label: "Acquisti",
            route: "acquisti"
          },

          {
            label: "Dipendenti",
            route: "dipendenti"
          },

          {
            label: "Nuovo dipendente",
            route: "crea-dipendente"
          },
{
  label: "🔐 Permessi operatori",
  route: "permessi-operatore"
},
          {
            label: "Timbrature",
            route: "timbrature"
          },

          {
            label: "Permessi e ferie",
            route: "permessi"
          },

          {
            label: "Preventivi",
            route: "preventivi"
          }

        ]

      },

      {

        title: "GESTIONE AZIENDA",

        items: [

          {
            label: "Venduto",
            route: "venduto"
          },

          {
            label: "Margini",
            route: "margini"
          }

        ]

      },

      {

        title: "SEDI",

        items: (() => {

          const ruolo =
            getRuoloAttivo();

          if (
            ["manager", "operatore"]
              .includes(ruolo)
          ) {

            return [

              {
                label: "Cambia sede",
                route: "gestione-sedi"
              }

            ];

          }

          return [

            {
              label: "Cambia sede",
              route: "gestione-sedi"
            },

            {
              label: "Crea sede",
              route: "gestione-sedi?mode=first"
            },

            {
              label: "Gestisci sedi",
              route: "gestione-sedi?mode=manage"
            }

          ];

        })()

      },

      {

        title: "PERSONALE",

        items: [

          {
  label: "👤 Profilo",
  route: "completa-profilo"
},
          {
            label: "🕒 Timbratura",
            route: "timbrature"
          },

          {
            label: "📆 Permessi e ferie",
            route: "permessi"
          }

        ]

      }

    );

    return sections;
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

        row.innerText =
          item.label;

        row.onclick =
          () => go(item.route);

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
