import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(app) {

  const html = createPageLayout({
    title: "Operandi AI",
    subtitle: "Assistente intelligente per il ristorante",

    content: `

      <div class="grid-cards">

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
          title: "⚡ Azioni rapide",
          body: `
            <div class="ai-actions">

              <button class="btn-secondary ai-action" data-prompt="Suggerisci 3 piatti con ingredienti stagionali per un ristorante italiano">
                🍝 Suggerisci piatti
              </button>

              <button class="btn-secondary ai-action" data-prompt="Genera calendario social settimanale per un ristorante">
                📅 Calendario social
              </button>

              <button class="btn-secondary ai-action" data-prompt="Suggerisci una promozione per il weekend per aumentare gli incassi di un ristorante">
                📣 Idee promozione
              </button>

              <button class="btn-secondary ai-action" data-prompt="Suggerisci un piatto del giorno con alto margine per un ristorante italiano">
                🍽 Piatto del giorno
              </button>

            </div>
          `
        })}

        ${createCard({
          title: "💬 Risposta Operandi AI",
          body: `
            <div id="ai-result" style="white-space:pre-wrap;"></div>
          `
        })}

      </div>

    `
  });

  app.innerHTML = html;

  initAI();
}

function initAI() {

  const input = document.getElementById("ai-prompt");
  const sendBtn = document.getElementById("ai-send");
  const result = document.getElementById("ai-result");

  const actions = document.querySelectorAll(".ai-action");

  actions.forEach(btn => {
    btn.onclick = () => {
      input.value = btn.dataset.prompt;
    };
  });

  sendBtn.onclick = async () => {

    const prompt = input.value.trim();

    if (!prompt) return;

    result.innerHTML = "⏳ Operandi AI sta pensando...";

    try {

      const res = await fetch(
        https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/operandi-ai
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            azienda: window.state?.azienda?.nome ?? "ristorante",
            ingredienti: [],
            stagione: "",
            evento: ""
          })
        }
      );

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
