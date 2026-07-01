// js/utils/pageLayout.js

/**
 * Crea layout standard pagina Ristoflow
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {string} options.content
 * @returns {string}
 */
export function createPageLayout({ title, subtitle = "", content = "", showBack = true }) {
  return `
    <div class="page">

      <div class="page-header">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          ${showBack ? `
            <button onclick="(function(){ if (window.history.length > 1) { window.history.back(); } else { window.location.hash = '#/home'; } })()"
              title="Indietro"
              style="flex-shrink:0;width:36px;height:36px;border:none;border-radius:8px;background:#f1f5f9;color:#0f172a;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:2px;">←</button>
          ` : ""}
          <div>
            <h1>${title}</h1>
            ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
          </div>
        </div>
      </div>

      ${content}

    </div>
  `;
}


/**
 * Crea card standard
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.body
 * @returns {string}
 */
export function createCard({ title, body }) {
  return `
    <div class="card">
      ${title ? `
        <div class="card-header">
          <h3>${title}</h3>
        </div>
      ` : ""}
      <div class="card-body">
        ${body}
      </div>
    </div>
  `;
}
