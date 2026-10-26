// js/views/layout-cucina.js
// LAYOUT — modello 3D di cucina, sala di lavoro e lavaggio.
// Visibile ad admin e manager (gli operatori non hanno la rotta).
// Tocca forni, frigo, abbattitori e sfogliatrice per aprirli.
// Il modello di ogni azienda e' un file in /layout/; per ora c'e' Campo Antico.

const LAYOUT_AZIENDE = {
  "b331365f-17db-4dda-aa2f-77a09427fe42": "layout/campo-antico.html",
};

export async function render(app) {
  const az = window.state?.azienda?.id;
  const file = LAYOUT_AZIENDE[az];
  if (!file) {
    app.innerHTML = `<section class="view"><h2 style="margin:0 0 8px;">🗺️ Layout</h2>
      <p class="small-muted">Il layout 3D della cucina non è ancora stato preparato per questa azienda.</p></section>`;
    return;
  }
  const src = file + "?v=" + encodeURIComponent(window.APP_V || "1");
  app.innerHTML = `
    <section class="view" style="padding-top:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;">
        <h2 style="margin:0;font-size:1.15rem;">🗺️ Layout</h2>
        <a href="${src}" target="_blank" rel="noopener" style="font-size:.85rem;font-weight:600;">Schermo intero ↗</a>
      </div>
      <iframe src="${src}" title="Layout 3D della cucina"
        style="width:100%;height:calc(100dvh - 170px);min-height:460px;border:0;border-radius:14px;display:block;background:#E4E7E9;"
        allow="fullscreen"></iframe>
    </section>`;
}
