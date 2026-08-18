/* =========================
OCR + MATCHING + LEARNING
Libreria condivisa OCR acquisti
========================= */

/* =========================
MATCHING TESTO
========================= */

function normalizeMatchText(value) {
  let s = String(value || "").trim().toLowerCase();
  if (!s) return "";

  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[.,;:/\\|()[\]{}'"`´’“”]+/g, " ");
  s = s.replace(/[%€$£]+/g, " ");

  s = s.replace(/\bgr\s*\d+([.,]\d+)?\b/g, " g ");
  s = s.replace(/\bgr\b/g, " g ");
  s = s.replace(/\bgrammi\b/g, " g ");
  s = s.replace(/\bkg\b/g, " kg ");
  s = s.replace(/\bkgr\b/g, " kg ");

  s = s.replace(/\blt\b/g, " l ");
  s = s.replace(/\bltr\b/g, " l ");

  s = s.replace(/\bpezzi\b/g, " pz ");
  s = s.replace(/\bpezzo\b/g, " pz ");

  s = s.replace(/\bconf\b/g, " confezione ");
  s = s.replace(/\bconfez\b/g, " confezione ");

  s = s.replace(/\bx\b/g, " ");

  // I numeri delle confezioni non dicono che prodotto e' e cambiano da una
  // fattura all'altra: senza toglierli, "UOVA GRANDI L PZ90" e "uova grandi
  // l pz" restavano due prodotti diversi.
  s = s.replace(/\b(pz|kg|gr|g|l|ml|cl|cf|conf|bs|pn)\s*\d+([.,]\d+)?\b/g, " $1 ");
  s = s.replace(/\b\d+([.,]\d+)?\b/g, " ");

  s = s.replace(/\s+/g, " ").trim();

  return s;
}

// Parole che NON dicono che prodotto e': unita' di misura, confezioni, categorie
// merceologiche, provenienze. Sono la causa degli abbinamenti assurdi:
// "TROFIE GR500" e "farina mais gialla prec GR500" avevano in comune solo gr500,
// e tanto bastava per agganciarli.
const PAROLE_VUOTE = new Set([
  "g", "kg", "l", "ml", "cl", "pz", "confezione", "conf", "cf", "ct", "bt", "bst",
  "vasc", "brick", "sv", "s", "f", "c", "n", "nr", "nl", "porz", "cat", "ii", "iii",
  "italia", "italiano", "italiana", "sfusa", "sfuso", "circa", "the", "di", "da",
  "al", "il", "la", "le", "lo", "un", "una", "per", "con", "in", "e"
]);

function paroleUtili(parole) {
  return parole.filter((p) => {
    if (PAROLE_VUOTE.has(p)) return false;
    if (/^\d/.test(p)) return false;          // 500, 1kg, 6x24
    if (p.length < 3) return false;
    return true;
  });
}

function tokenizeMatchText(value) {
  return normalizeMatchText(value)
    .split(" ")
    .filter(Boolean);
}

function computeWordOverlapScore(queryWords, targetWords) {
  const q = paroleUtili(queryWords);
  const t = paroleUtili(targetWords);
  if (!q.length || !t.length) return 0;

  let matches = 0;
  q.forEach((word) => { if (t.includes(word)) matches += 1; });

  return matches / q.length;
}

// Senza almeno una parola sostanziale in comune non si aggancia niente, a
// nessun punteggio: e' il controllo che impedisce a un salmone di diventare
// una bottiglia d'olio perche' condividono la pezzatura.
function haParolaInComune(queryWords, targetWords) {
  const q = paroleUtili(queryWords);
  const t = paroleUtili(targetWords);
  if (!q.length || !t.length) return false;
  for (const w of q) {
    if (t.includes(w)) return true;
    for (const w2 of t) {
      if (w.length >= 5 && w2.length >= 5 && (w.startsWith(w2.slice(0, 5)) || w2.startsWith(w.slice(0, 5)))) return true;
    }
  }
  return false;
}

/* =========================
DISTANZA LEVENSHTEIN
========================= */

function levenshteinDistance(a, b) {
  const s = String(a || "");
  const t = String(b || "");

  const m = s.length;
  const n = t.length;

  if (!m) return n;
  if (!n) return m;

  const dp = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/* =========================
MATCH PRODOTTI
========================= */

export function findBestProductMatch(nome, prodottiCache, aliasCache = []) {
  const query = normalizeMatchText(nome);
  if (!query) return null;

  const aliasExact = aliasCache.find(
    (item) => item.testo_norm === query
  );

  if (aliasExact?.prodotto_id) {
    const matchedByAlias = prodottiCache.find(
      (p) => String(p.id) === String(aliasExact.prodotto_id)
    );

    if (matchedByAlias) return matchedByAlias;
  }

  let best = null;
  let bestScore = 0;

  const queryWords = tokenizeMatchText(query);

  prodottiCache.forEach((prodotto) => {
    const targetBase = `${prodotto.nome || ""} ${prodotto.descrizione || ""}`.trim();
    const target = normalizeMatchText(targetBase);

    if (!target) return;

    let score = 0;

    if (target === query) {
      score = 100;
    } else {
      if (target.includes(query) || query.includes(target)) {
        score = Math.max(score, 80);
      }

      const targetWords = tokenizeMatchText(target);

      // Nessuna parola sostanziale in comune: non si aggancia, punto.
      if (haParolaInComune(queryWords, targetWords)) {
        const overlapScore = computeWordOverlapScore(queryWords, targetWords);

        if (overlapScore >= 0.45) {
          score = Math.max(score, overlapScore * 90);
        }

        const distance = levenshteinDistance(query, target);
        const maxLen = Math.max(query.length, target.length) || 1;
        const similarity = 1 - distance / maxLen;

        if (similarity >= 0.72) {
          score = Math.max(score, similarity * 90);
        }
      }
    }

    const aliasRows = aliasCache.filter(
      (item) => String(item.prodotto_id) === String(prodotto.id)
    );

    aliasRows.forEach((item) => {
      if (!item.testo_norm) return;

      if (item.testo_norm === query) {
        score = Math.max(score, 120);
        return;
      }

      if (
        item.testo_norm.includes(query) ||
        query.includes(item.testo_norm)
      ) {
        score = Math.max(score, 85);
      }

      const aliasWords = tokenizeMatchText(item.testo_norm);

      const overlapScore = computeWordOverlapScore(
        queryWords,
        aliasWords
      );

      if (overlapScore >= 0.6) {
        score = Math.max(score, overlapScore * 95);
      }
    });

    if (score > bestScore) {
      best = prodotto;
      bestScore = score;
    }
  });

  // Soglia a 65 su una scala ora omogenea: prima i criteri arrivavano a massimi
  // diversi (70 le parole, 60 la distanza) e 30 significava agganciare con il
  // 43% di parole in comune, contando anche gr500 e cat II.
  return bestScore >= 65 ? best : null;
}

/* =========================
OCR ALIAS LEARNING
========================= */

export async function loadProdottiAliasOcr(supabase, aziendaId) {
  try {
    const { data, error } = await supabase
      .from("prodotti_alias_ocr")
      .select("id, testo_ocr, prodotto_id")
      .eq("azienda_id", aziendaId);

    if (error) {
      console.warn(
        "prodotti_alias_ocr non disponibile",
        error.message
      );
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      testo_ocr: item.testo_ocr || "",
      testo_norm: normalizeMatchText(item.testo_ocr || ""),
      prodotto_id: item.prodotto_id
    }));
  } catch (err) {
    console.warn("Errore caricamento alias OCR", err);
    return [];
  }
}

export async function saveProdottoAliasOcr(
  supabase,
  aziendaId,
  testoOcr,
  prodottoId,
  aliasCache
) {
  const testo = String(testoOcr || "").trim();
  const testoNorm = normalizeMatchText(testo);

  if (!testo || !testoNorm || !prodottoId) return;

  try {
    const existing = aliasCache.find(
      (item) => item.testo_norm === testoNorm
    );

    if (existing?.id) {
      const { error } = await supabase
        .from("prodotti_alias_ocr")
        .update({ prodotto_id: prodottoId })
        .eq("id", existing.id);

      if (!error) {
        existing.prodotto_id = prodottoId;
      }

      return;
    }

    const { data, error } = await supabase
      .from("prodotti_alias_ocr")
      .insert({
        azienda_id: aziendaId,
        testo_ocr: testo,
        prodotto_id: prodottoId
      })
      .select("id, testo_ocr, prodotto_id")
      .single();

    if (!error && data?.id) {
      aliasCache.push({
        id: data.id,
        testo_ocr: data.testo_ocr || testo,
        testo_norm: normalizeMatchText(data.testo_ocr || testo),
        prodotto_id: data.prodotto_id
      });
    }
  } catch (err) {
    console.warn("Errore salvataggio alias OCR", err);
  }
}
