import { createPageLayout, createCard } from "../utils/pageLayout.js";

import {
  getWeather,
  getLocalEvents,
  generateSalesSuggestions,
  generateMarketingIdeas,
  generateMarketingCalendar
} from "../js/aiEngine.js";

export async function render(app) {

  const html = createPageLayout({
    title: "Operandi AI",
    subtitle: "Assistente intelligente per il ristorante",

    content: `

      <div class="grid-cards">

        ${createCard({
          title: "☀️ Meteo oggi",
          body: `<div id="ai-weather">Caricamento...</div>`
        })}

        ${createCard({
          title: "🎉 Eventi locali",
          body: `<div id="ai-events">Caricamento...</div>`
        })}

        ${createCard({
          title: "💰 Suggerimenti vendita",
          body: `<div id="ai-sales"></div>`
        })}

        ${createCard({
          title: "📣 Idee social",
          body: `<div id="ai-marketing"></div>`
        })}

        ${createCard({
          title: "📅 Calendario marketing",
          body: `<div id="ai-calendar"></div>`
        })}

      </div>

    `
  });

  app.innerHTML = html;

  loadAI();
}

async function loadAI() {

  const sede = window.state?.sedeAttiva;

  if (!sede) return;

  const lat = sede.latitudine;
  const lon = sede.longitudine;

  const weather = await getWeather(lat, lon);
  const events = await getLocalEvents(lat, lon);

  renderWeather(weather);
  renderEvents(events);

  const sales = generateSalesSuggestions(weather, events);
  const marketing = generateMarketingIdeas(weather, events);
  const calendar = generateMarketingCalendar();

  renderList("ai-sales", sales);
  renderList("ai-marketing", marketing);
  renderCalendar(calendar);
}

function renderWeather(weather) {

  const el = document.getElementById("ai-weather");

  if (!weather) {
    el.innerHTML = "Nessun dato meteo.";
    return;
  }

  el.innerHTML = `
    Temperatura: ${weather.temperatura}°C<br>
    Condizione: ${weather.descrizione}
  `;
}

function renderEvents(events) {

  const el = document.getElementById("ai-events");

  if (!events?.length) {
    el.innerHTML = "Nessun evento vicino.";
    return;
  }

  el.innerHTML = events
    .map(e => `${e.date} — ${e.name}`)
    .join("<br>");
}

function renderList(id, list) {

  const el = document.getElementById(id);

  if (!list?.length) {
    el.innerHTML = "Nessun suggerimento.";
    return;
  }

  el.innerHTML = list.map(i => `• ${i}`).join("<br>");
}

function renderCalendar(calendar) {

  const el = document.getElementById("ai-calendar");

  el.innerHTML = calendar
    .map(c => `<b>${c.giorno}</b> — ${c.idea}`)
    .join("<br>");
}
