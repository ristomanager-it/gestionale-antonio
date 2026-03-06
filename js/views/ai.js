import { createPageLayout, createCard } from "../utils/pageLayout.js";

const API_URL =
  "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/operandi-ai";

export async function render(app) {

  const html = createPageLayout({
    title: "Operandi AI",
    subtitle: "Assistente intelligente per il ristorante",

    content: `

      <div class="grid-cards">

        ${createCard({
          title: "☀ Meteo oggi",
          body: `<div id="ai-weather">Caricamento...</div>`
        })}

        ${createCard({
          title: "📺 Eventi TV",
          body: `<div id="ai-events">Caricamento...</div>`
        })}

        ${createCard({
          title: "💰 Suggerimenti Operandi",
          body: `<div id="ai-suggestions">Caricamento...</div>`
        })}

        ${createCard({
          title: "🤖 Chiedi a Operandi AI",
          body: `
            <textarea 
              id="ai-prompt"
              class="input"
              rows="4"
              placeholder="Es: Suggerisci 3 piatti con mozzarella e zucchine">
            </textarea>

            <button id="ai-send" class="btn-primary" style="margin-top:10px;">
              Invia richiesta
            </button>
          `
        })}

        ${createCard({
          title: "💬 Risposta AI",
          body: `<div id="ai-result" style="white-space:pre-wrap;"></div>`
        })}

      </div>

    `
  });

  app.innerHTML = html;

  loadAI();
  initChat();
}

async function loadAI() {

  const weatherBox = document.getElementById("ai-weather");
  const eventsBox = document.getElementById("ai-events");
  const suggestionsBox = document.getElementById("ai-suggestions");

  try {

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: "Dammi suggerimenti operativi per oggi",
        azienda: window.state?.azienda?.nome ?? "ristorante",
        lat: window.state?.sedeAttiva?.latitudine,
        lon: window.state?.sedeAttiva?.longitudine
      })
    });

    const data = await res.json();

    if (data.weather) {
      weatherBox.innerHTML =
        `${data.weather.temperatura}°C<br>${data.weather.meteo}`;
    } else {
      weatherBox.innerHTML = "Dati meteo non disponibili";
    }

    if (data.events?.length) {
      eventsBox.innerHTML =
        data.events.map(e => `• ${e.nome}`).join("<br>");
    } else {
      eventsBox.innerHTML = "Nessun evento rilevante";
    }

    suggestionsBox.innerHTML =
      data.reply || "Nessun suggerimento disponibile";

  } catch (err) {

    console.error(err);

    weatherBox.innerHTML = "Errore meteo";
    eventsBox.innerHTML = "Errore eventi";
    suggestionsBox.innerHTML = "Errore AI";

  }

}

function initChat() {

  const input = document.getElementById("ai-prompt");
  const sendBtn = document.getElementById("ai-send");
  const result = document.getElementById("ai-result");

  sendBtn.onclick = async () => {

    const prompt = input.value.trim();
    if (!prompt) return;

    result.innerHTML = "⏳ Operandi AI sta pensando...";

    try {

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          azienda: window.state?.azienda?.nome ?? "ristorante",
          lat: window.state?.sedeAttiva?.latitudine,
          lon: window.state?.sedeAttiva?.longitudine
        })
      });

      const data = await res.json();

      if (data.success) {
        result.innerHTML = data.reply;
      } else {
        result.innerHTML = "Errore AI";
      }

    } catch (err) {

      console.error(err);
      result.innerHTML = "Errore connessione AI";

    }

  };

}
