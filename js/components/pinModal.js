export function creaPinModal() {

  const overlay = document.createElement("div");
  overlay.id = "pin-modal-overlay";

  overlay.innerHTML = `
    <div id="pin-modal">

      <div class="pin-title">Inserisci PIN</div>

      <input id="pin-input" type="password" inputmode="numeric" readonly />

      <div class="pin-grid">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-btn" data-num="${n}">${n}</button>`).join("")}
        <button class="pin-btn clear">C</button>
        <button class="pin-btn" data-num="0">0</button>
        <button class="pin-btn ok">✔</button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector("#pin-input");

  overlay.querySelectorAll("[data-num]").forEach(btn => {
    btn.onclick = () => {
      if (input.value.length >= 6) return;
      input.value += btn.dataset.num;
    };
  });

  overlay.querySelector(".clear").onclick = () => {
    input.value = "";
  };

  return new Promise((resolve) => {

    overlay.querySelector(".ok").onclick = () => {
      const value = input.value;
      document.body.removeChild(overlay);
      resolve(value);
    };

  });
}

export async function verificaPin({ dipendenteId, aziendaId, pin }) {

  const { data, error } = await window.supabaseClient
    .from("dipendenti")
    .select("pin, codice_pin")
    .eq("id", dipendenteId)
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  if (error || !data) return false;

  const pinDb = data.pin || data.codice_pin;

  if (!pinDb) return false;

  return String(pinDb) === String(pin);
}
