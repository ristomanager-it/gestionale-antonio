import { createPageLayout, createCard } from "../utils/pageLayout.js";
import { supabase } from "../supabaseClient.js";

export async function render(app) {

  const html = createPageLayout({
    title: "Assistente AI Ristoflow",
    subtitle: "Copilota intelligente per il ristorante",

    content: `

      <div class="grid-cards">

        ${createCard({
          title: "☀ Meteo oggi",
          body: `<div id="ai-weather">Caricamento...</div>`
        })}

        ${createCard({
          title: "💡 Suggerimenti AI",
          body: `<div id="ai-suggestions">Caricamento...</div>`
        })}

        ${createCard({
          title: "🤖 Chiedi all'Assistente",
          body: `
            <textarea 
              id="ai-prompt"
              class="input"
              rows="4"
              placeholder="Es: Suggerisci 3 piatti con mozzarella e zucchine">
            </textarea>

            <button 
              id="ai-send" 
              class="btn-primary"
              style="margin-top:12px;"
            >
              Invia richiesta
            </button>
          `
        })}

        ${createCard({
          title: "💬 Risposta AI",
          body: `
            <div 
              id="ai-result"
              style="white-space:pre-wrap;"
            ></div>
          `
        })}

      </div>

    `
  });

  app.innerHTML = html;

  loadAI();
  initChat();
}

/* -----------------------------
   CARICAMENTO SUGGERIMENTI
-------------------------------- */

async function loadAI() {

  const weatherBox = document.getElementById("ai-weather");
  const suggestionsBox = document.getElementById("ai-suggestions");

  try {

    const { data, error } = await supabase.functions.invoke(
      "assistente-ai",
      {
        body: {
          prompt: "Dammi suggerimenti operativi per oggi",
          azienda: window.state?.azienda?.nome ?? "ristorante",
          lat: window.state?.sedeAttiva?.latitudine,
          lon: window.state?.sedeAttiva?.longitudine
        }
      }
    );

    if (error) {
      throw error;
    }

    if (data?.weather) {

      weatherBox.innerHTML =
        `${data.weather.temperatura}°C<br>${data.weather.meteo}`;

    } else {

      weatherBox.innerHTML = "Meteo non disponibile";

    }

    suggestionsBox.innerHTML =
      data?.reply || "Nessun suggerimento disponibile";

  } catch (err) {

    console.error("AI load error:", err);

    weatherBox.innerHTML = "Errore meteo";
    suggestionsBox.innerHTML = "Errore caricamento AI";

  }

}

/* -----------------------------
   CHAT AI
-------------------------------- */

function initChat() {

  const input = document.getElementById("ai-prompt");
  const sendBtn = document.getElementById("ai-send");
  const result = document.getElementById("ai-result");

  sendBtn.onclick = async () => {

    const prompt = input.value.trim();

    if (!prompt) return;

    result.innerHTML = "⏳ L'assistente AI sta pensando...";

    try {

      const { data, error } = await supabase.functions.invoke(
        "assistente-ai",
        {
          body: {
            prompt,
            azienda: window.state?.azienda?.nome ?? "ristorante",
            lat: window.state?.sedeAttiva?.latitudine,
            lon: window.state?.sedeAttiva?.longitudine
          }
        }
      );

      if (error) {
        throw error;
      }

      if (data?.success) {

        result.innerHTML = data.reply;

      } else {

        result.innerHTML = "Errore nella risposta AI";

      }

    } catch (err) {

      console.error("AI chat error:", err);

      result.innerHTML = "Errore connessione assistente AI";

    }

  };

}
