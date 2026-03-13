export function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function parseLocaleNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  let s = String(value).trim();
  if (!s) return fallback;

  s = s.replace(/[€\s]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    s = s.replace(",", ".");
  }

  s = s.replace(/[^0-9.\-]/g, "");

  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export function formatMoney(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "0,00";

  return n.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function normalizeInputDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);

  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const ymd = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);

  if (ymd) {
    const yyyy = ymd[1];
    const mm = ymd[2].padStart(2, "0");
    const dd = ymd[3].padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

export function safeFileName(name) {
  return String(name || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function computeRowsTotal(rows = []) {
  return rows.reduce((sum, row) => {
    const totaleRiga = parseLocaleNumber(row?.totale_riga, NaN);
    const quantita = parseLocaleNumber(row?.quantita, 0);
    const prezzo = parseLocaleNumber(row?.prezzo_unitario, 0);

    if (Number.isFinite(totaleRiga) && totaleRiga > 0) {
      return sum + totaleRiga;
    }

    return sum + (quantita * prezzo);
  }, 0);
}

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizePiva(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  return digits.length > 11
    ? digits.slice(-11)
    : digits;
}

export function normalizeCodiceInterno(value) {
  const base = String(value || "").trim();

  if (!base) return "PRODOTTO";

  const cleaned = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 80);

  return cleaned || "PRODOTTO";
}
