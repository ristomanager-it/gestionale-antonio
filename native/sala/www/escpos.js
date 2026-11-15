/*
 * Costruttore ESC/POS di Ristoflow in JavaScript.
 * Porting 1:1 di tools/fiscal-agent/stampe.py (build_comanda, build_prova): il tablet
 * prepara gli stessi byte che oggi prepara il Raspberry, così la comanda esce identica
 * qualunque sia la strada (stampa diretta dal tablet o coda → Raspberry).
 * Se cambi l'impaginazione qui, cambiala anche in stampe.py (test: native/sala/test/confronta.sh).
 */
(function (g) {
  "use strict";

  // Tabella PC858 (byte 0x80–0xFF): accenti italiani ed euro come li stampa la Epson.
  var CP858_ALTI = "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈ€ÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ";
  var MAPPA = {};
  for (var i = 0; i < CP858_ALTI.length; i++) MAPPA[CP858_ALTI[i]] = 0x80 + i;

  var ESC = [0x1b], GS = [0x1d];
  function b() { var out = []; for (var i = 0; i < arguments.length; i++) out = out.concat(arguments[i]); return out; }
  var INIT = b(ESC, [0x40], ESC, [0x74, 0x13]);
  var CENTRO = b(ESC, [0x61, 1]), SINISTRA = b(ESC, [0x61, 0]);
  var NORMALE = b(ESC, [0x21, 0]);
  var GRASSETTO_ON = b(ESC, [0x45, 1]), GRASSETTO_OFF = b(ESC, [0x45, 0]);
  var GRANDE = b(ESC, [0x21, 0x30]);
  var INVERSO_ON = b(GS, [0x42, 1]), INVERSO_OFF = b(GS, [0x42, 0]);
  var ROSSO_ON = b(ESC, [0x72, 1]), ROSSO_OFF = b(ESC, [0x72, 0]);
  var TAGLIO = b([10, 10, 10], GS, [0x56, 0x42, 0]);
  var DIM_1 = b(GS, [0x21, 0]), DIM_ALTO = b(GS, [0x21, 1]), DIM_2 = b(GS, [0x21, 0x11]);
  var INTERLINEA_STRETTA = b(ESC, [0x33, 26]);
  var NL = [10];

  var REPARTI = { cucina: "CUCINA", bar: "BAR", pasticceria: "PASTICCERIA", preconto: "PRECONTO",
    beverage: "BEVERAGE", dessert: "DESSERT" };

  // Testo → byte PC858; i caratteri che non esistono diventano "?" (come encode "replace").
  function t(s) {
    s = String(s);
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s[i], k = s.charCodeAt(i);
      if (k < 0x80) out.push(k);
      else if (MAPPA[c] !== undefined) out.push(MAPPA[c]);
      else {
        if (k >= 0xd800 && k <= 0xdbff) i++; // emoji ecc.: un solo "?" come Python
        out.push(0x3f);
      }
    }
    return out;
  }

  function lunghezza(s) { return Array.from(String(s)).length; }
  function taglia(s, n) { s = String(s); var a = Array.from(s); return a.length <= n ? s : a.slice(0, n - 1).join("") + "."; }
  function spazi(n) { return n > 0 ? new Array(n + 1).join(" ") : ""; }
  function ripeti(ch, n) { return new Array(n + 1).join(ch); }
  function rigaDx(sx, dx, larg) {
    sx = taglia(sx, larg - lunghezza(dx) - 1);
    return sx + spazi(larg - lunghezza(sx) - lunghezza(dx)) + dx;
  }
  function aCapo(testo, n, rientro) {
    rientro = rientro || "";
    var parole = String(testo).split(/\s+/).filter(Boolean);
    var righe = [], cur = "";
    parole.forEach(function (w) {
      while (lunghezza(w) > n) {
        if (cur) { righe.push(cur); cur = ""; }
        var a = Array.from(w);
        righe.push(a.slice(0, n).join("")); w = a.slice(n).join("");
      }
      var prova = cur ? cur + " " + w : w;
      if (lunghezza(prova) <= n) cur = prova;
      else { righe.push(cur); cur = rientro + w; }
    });
    if (cur) righe.push(cur);
    return righe.length ? righe : [""];
  }
  function intero(v) { var n = Math.trunc(Number(v)); return isNaN(n) ? 0 : n; }
  function soloCifre(v) { return /^\d+$/.test(String(v == null || v === "" ? "" : v)); }
  function vuoto(v) { return v == null || v === "" || v === false || v === 0 || (Array.isArray(v) && !v.length); }

  function dataOraLocale(adesso) {
    var d = adesso || new Date();
    var p = {};
    new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return p.day + "/" + p.month + "/" + p.year + " " + (p.hour === "24" ? "00" : p.hour) + ":" + p.minute;
  }

  function righeGruppo(righe, grande, larg) {
    var out = [];
    righe.forEach(function (r) {
      var testo = String(r.qta == null ? 1 : r.qta) + " " + String(r.nome == null ? "" : r.nome);
      out = out.concat(DIM_2, GRASSETTO_ON);
      aCapo(testo, grande, "  ").forEach(function (riga) { out = out.concat(t(riga), NL); });
      out = out.concat(GRASSETTO_OFF, DIM_1);
      if (!vuoto(r.note)) {
        out = out.concat(DIM_ALTO, GRASSETTO_ON);
        aCapo(">> " + String(r.note).toUpperCase(), larg - 3, "   ").forEach(function (riga) { out = out.concat(t("   " + riga), NL); });
        out = out.concat(GRASSETTO_OFF, DIM_1);
      }
      if (!vuoto(r.allergeni_contiene)) {
        out = out.concat(DIM_1, GRASSETTO_ON, ROSSO_ON);
        aCapo("!! CONTIENE " + r.allergeni_contiene.join(", "), larg - 3, "   ").forEach(function (riga) { out = out.concat(t("   " + riga), NL); });
        out = out.concat(ROSSO_OFF, GRASSETTO_OFF);
      } else if (!vuoto(r.allergeni_ignoti)) {
        out = out.concat(DIM_1, ROSSO_ON, t("   ?? allergeni non segnati: verificare"), ROSSO_OFF, NL);
      }
      if (soloCifre(r.min) && intero(r.min) > 0) out = out.concat(t("    prep. " + intero(r.min) + " min"), NL);
    });
    return out;
  }

  function comanda(c, larg, adesso) {
    larg = larg || 42;
    var grande = Math.max(10, Math.floor(larg / 2));
    var rep = REPARTI[c.reparto] || String(c.reparto || "").toUpperCase();
    var out = b(INIT, INTERLINEA_STRETTA, CENTRO, DIM_2, t(rep), NL);
    out = out.concat(DIM_2, t(!vuoto(c.tavolo) ? "TAVOLO " + c.tavolo : "BANCO"), NL);
    if (!vuoto(c.nome)) aCapo(String(c.nome).toUpperCase(), grande).forEach(function (riga) {
      out = out.concat(DIM_2, GRASSETTO_ON, t(riga), GRASSETTO_OFF, NL);
    });
    out = out.concat(DIM_1, NORMALE);
    if (!vuoto(c.via)) out = out.concat(NL, DIM_2, GRASSETTO_ON, INVERSO_ON, t(" VIA " + c.via + "a USCITA "), INVERSO_OFF, GRASSETTO_OFF, DIM_1, NL);
    if (!vuoto(c.coperti)) out = out.concat(DIM_ALTO, t(c.coperti + " coperti"), DIM_1, NL);
    out = out.concat(SINISTRA, t(rigaDx(c.cameriere || "", dataOraLocale(adesso), larg)), NL);
    if (!vuoto(c.ristampa)) out = out.concat(INVERSO_ON, t(" RISTAMPA "), INVERSO_OFF, NL);
    out = out.concat(t(ripeti("-", larg)), NL);

    var info = (c.info_tavolo || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
    if (info.length) {
      out = out.concat(t(ripeti("=", larg)), NL, DIM_1, GRASSETTO_ON, t("*** INFO TAVOLO ***"), NL);
      info.forEach(function (voce) { aCapo(voce.toUpperCase(), larg - 2, "  ").forEach(function (riga) { out = out.concat(t(riga), NL); }); });
      out = out.concat(GRASSETTO_OFF, t(ripeti("=", larg)), NL);
    }
    var rit = c.ritmo || {};
    if (rit && typeof rit === "object" && !vuoto(rit.nome)) {
      var extra = !vuoto(rit.min) ? " (" + rit.min + " min tra le uscite)" : "";
      out = out.concat(GRASSETTO_ON, t("Ritmo: " + rit.nome + extra), GRASSETTO_OFF, NL);
    }
    var previste = {};
    Object.keys(c.uscite_previste || {}).forEach(function (k) { var v = c.uscite_previste[k]; if (!vuoto(v)) previste[String(k)] = String(v); });
    var chiavi = Object.keys(previste).sort(function (a, z) { return intero(a) - intero(z); });
    if (chiavi.length) {
      var riga = "Uscite previste:";
      chiavi.forEach(function (k) {
        var v = k + "a " + previste[k];
        if (lunghezza(riga) + 2 + lunghezza(v) > larg) { out = out.concat(t(riga), NL); riga = spazi(15); }
        riga += "  " + v;
      });
      out = out.concat(t(riga), NL);
    }
    var gruppi = {};
    (c.righe || []).forEach(function (r) {
      var u = intero(r.uscita || c.uscita || 1);
      (gruppi[u] = gruppi[u] || []).push(r);
    });
    Object.keys(gruppi).map(Number).sort(function (a, z) { return a - z; }).forEach(function (u) {
      out = out.concat(NL, CENTRO, DIM_2, GRASSETTO_ON, INVERSO_ON, t(" " + u + "a USCITA "), INVERSO_OFF, GRASSETTO_OFF, DIM_1, NL);
      var tempi = gruppi[u].filter(function (r) { return soloCifre(r.min) && intero(r.min) > 0; }).map(function (r) { return intero(r.min); });
      var oraU = previste[String(u)];
      if (oraU && tempi.length) out = out.concat(t("ore ~" + oraU + " - pronta in " + Math.max.apply(null, tempi) + " min"), NL);
      else if (oraU) out = out.concat(t("ore ~" + oraU), NL);
      else if (tempi.length) out = out.concat(t("pronta in ~" + Math.max.apply(null, tempi) + " min"), NL);
      out = out.concat(SINISTRA, righeGruppo(gruppi[u], grande, larg));
    });
    out = out.concat(t(ripeti("-", larg)), NL);
    if (!vuoto(c.note) && vuoto(c.via)) out = out.concat(DIM_ALTO, GRASSETTO_ON, t(taglia(String(c.note), larg)), GRASSETTO_OFF, DIM_1, NL);
    out = out.concat(TAGLIO);
    return new Uint8Array(out);
  }

  function prova(testo) {
    return new Uint8Array(b(INIT, CENTRO, GRANDE, t("PROVA"), NL, NORMALE, t(String(testo || "Stampante collegata a Ristoflow")), NL, TAGLIO));
  }

  function base64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
  }

  var api = { comanda: comanda, prova: prova, base64: base64, dataOraLocale: dataOraLocale };
  g.RistoflowEscpos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
