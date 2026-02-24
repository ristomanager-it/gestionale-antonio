// js/views/marketing.js

export async function render(container) {

  container.innerHTML = `
    <div class="view">

      <div style="
        background: var(--color-primary);
        color: white;
        padding: 32px;
        border-radius: 24px;
        margin-bottom: 32px;
      ">
        <h2 style="margin:0;">Marketing</h2>
        <p style="margin:8px 0 0 0; opacity:0.9;">
          Area dedicata a clienti, fidelizzazione e campagne
        </p>
      </div>

      <div style="
        background:white;
        padding:30px;
        border-radius:22px;
        box-shadow:0 10px 30px rgba(0,0,0,0.05);
      ">
        <p class="small-muted" style="margin:0;">
          Moduli marketing in arrivo.
        </p>
      </div>

    </div>
  `;
}
