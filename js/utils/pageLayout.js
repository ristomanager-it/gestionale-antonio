// js/utils/pageLayout.js

/**
 * Crea layout standard pagina Ristoflow
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {string} options.content
 * @returns {string}
 */
export function createPageLayout({ title, subtitle = "", content = "" }) {
  return `
    <div class="page">

      <div class="page-header">
        <div>
          <h1>${title}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
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
