/* Landing cene aziendali (una per sede). Legge window.LANDING:
   { chiave, sede, menu:[{nome, prezzo, teaser, aperitivo, portate:[[titolo,[piatti]]]}], extra:[{id, nome, prezzo, aPersona, ivaInclusa, iva}] }
   Calcolatore: si usa liberamente, ma il totale si vede solo dopo aver lasciato l'email (una volta, poi resta nel telefono). */
(function(){
  var L = window.LANDING || {}, $ = function(id){ return document.getElementById(id); };
  var URL_ = "https://cuhcscpvhypoaplcmtjk.supabase.co";
  var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";
  var supa = null; try { supa = window.supabase.createClient(URL_, ANON); } catch (e) {}
  var qs = new URLSearchParams(location.search);
  var utm = { utm_source: qs.get("utm_source"), utm_medium: qs.get("utm_medium"), utm_campaign: qs.get("utm_campaign") };
  var ev = function(n, d, s){ try { if (window.rfEvento) rfEvento(n, d || {}, s); } catch (e) {} };
  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var eur = function(n){ return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; };
  var MENU = L.menu || [], EXTRA = L.extra || [];

  // ── menù a scomparsa ──
  $("menu-lista").innerHTML = MENU.map(function(m, i){
    var corpo = (m.aperitivo ? '<p class="mn-ap">' + esc(m.aperitivo) + '</p>' : '')
      + m.portate.map(function(p){ return '<div class="mn-port"><span>' + esc(p[0]) + '</span>' + p[1].map(function(x){ return '<p>' + esc(x) + '</p>'; }).join("") + '</div>'; }).join("")
      + '<p class="mn-inc">Vini, acqua, bibite, caffè e amari inclusi</p>'
      + '<button type="button" class="btn btn-s" data-usa="' + i + '">Calcola con questo menù</button>';
    return '<details class="mn"' + (i === 0 ? '' : '') + '><summary><span class="mn-t"><b>' + esc(m.nome) + '</b><small>' + esc(m.teaser) + '</small></span><span class="mn-p">' + m.prezzo + ' €<small>a persona + IVA</small></span></summary><div class="mn-c">' + corpo + '</div></details>';
  }).join("");
  Array.prototype.forEach.call(document.querySelectorAll(".mn"), function(d, i){
    d.addEventListener("toggle", function(){ if (d.open) ev("Aziende_Apre_Menu", { menu: MENU[i].nome }); });
  });

  // ── calcolatore ──
  $("c-menu").innerHTML = MENU.map(function(m, i){ return '<label class="ch"><input type="radio" name="c-menu" value="' + i + '"' + (i === 0 ? " checked" : "") + '><span>' + esc(m.nome) + ' · ' + m.prezzo + ' €</span></label>'; }).join("");
  $("c-extra").innerHTML = EXTRA.length ? EXTRA.map(function(x){ return '<label class="ch"><input type="checkbox" value="' + x.id + '"><span>' + esc(x.nome) + ' · ' + x.prezzo + ' €' + (x.aPersona ? " a persona" : "") + (x.ivaInclusa ? " IVA incl." : " + IVA") + '</span></label>'; }).join("") : "";
  if (!EXTRA.length) $("c-extra-riga").hidden = true;
  Array.prototype.forEach.call(document.querySelectorAll("[data-usa]"), function(b){
    b.onclick = function(){ var r = document.querySelector('input[name="c-menu"][value="' + b.getAttribute("data-usa") + '"]'); if (r) r.checked = true; $("calcolo").scrollIntoView({ behavior: "smooth" }); $("c-persone").focus({ preventScroll: true }); };
  });
  function scelta(){
    var mi = Number((document.querySelector('input[name="c-menu"]:checked') || {}).value || 0), m = MENU[mi];
    var pers = parseInt($("c-persone").value, 10) || 0;
    var ex = Array.prototype.map.call(document.querySelectorAll('#c-extra input:checked'), function(i){ return i.value; });
    var righe = [{ t: m.nome + " × " + pers, imp: pers * m.prezzo, iva: 10 }];
    EXTRA.forEach(function(x){
      if (ex.indexOf(x.id) < 0) return;
      var q = x.aPersona ? pers : 1, lordo = x.ivaInclusa ? x.prezzo * q : x.prezzo * q * (1 + x.iva / 100);
      righe.push({ t: x.nome + (x.aPersona ? " × " + pers : ""), imp: lordo / (1 + x.iva / 100), iva: x.iva });
    });
    var imp = 0, iva = 0; righe.forEach(function(r){ imp += r.imp; iva += r.imp * r.iva / 100; });
    return { menu: m.nome, persone: pers, extra: ex, righe: righe, imponibile: Math.round(imp * 100) / 100, iva: Math.round(iva * 100) / 100, totale: Math.round((imp + iva) * 100) / 100 };
  }
  function mostra(s){
    $("c-esito").innerHTML = s.righe.map(function(r){ return '<div class="cr"><span>' + esc(r.t) + '</span><span>' + eur(r.imp) + '</span></div>'; }).join("")
      + '<div class="cr"><span>Imponibile</span><span>' + eur(s.imponibile) + '</span></div><div class="cr"><span>IVA</span><span>' + eur(s.iva) + '</span></div>'
      + '<div class="cr tot"><span>Totale</span><span>' + eur(s.totale) + '</span></div><div class="cr pp"><span>A persona, tutto compreso</span><span>' + eur(s.totale / s.persone) + '</span></div>'
      + '<button type="button" class="btn" id="c-blocca" style="margin-top:14px;width:100%">Richiedi questa data</button>';
    $("c-esito").hidden = false;
    $("c-blocca").onclick = function(){
      $("persone").value = s.persone; var sel = $("menu"); if (sel) sel.value = s.menu;
      Array.prototype.forEach.call(document.querySelectorAll("#f-extra input"), function(i){ i.checked = s.extra.indexOf(i.value) >= 0; });
      var em = localStorage.getItem("rf_calc_email"); if (em && !$("email").value) $("email").value = em;
      ev("Aziende_Calcolo_Richiesta", { totale: s.totale });
      $("richiesta").scrollIntoView({ behavior: "smooth" });
    };
  }
  async function registra(s, email, tel){
    if (!supa) return { ok: true };
    try {
      var r = await supa.rpc("landing_calcolo_registra", { p_landing: L.chiave, p_sede: L.sede, p_email: email, p_telefono: tel || null, p_persone: s.persone,
        p_scelta: { menu: s.menu, extra: s.extra }, p_totale: s.totale, p_consenso: true, p_utm: utm });
      return (r && r.data) || { ok: false, errore: "Connessione non riuscita, riprova." };
    } catch (e) { return { ok: false, errore: "Connessione non riuscita, riprova." }; }
  }
  var inAttesa = null;
  $("c-calcola").onclick = async function(){
    var s = scelta();
    if (!s.persone || s.persone < 1) { $("c-msg").textContent = "Quante persone siete?"; return; }
    $("c-msg").textContent = "";
    var em = null; try { em = localStorage.getItem("rf_calc_email"); } catch (e) {}
    if (em) { registra(s, em); mostra(s); ev("Aziende_Calcolo", { totale: s.totale }); return; }
    inAttesa = s; $("mail-box").hidden = false; $("m-email").focus(); ev("Aziende_Calcolo_Chiede_Email", {});
  };
  $("m-chiudi").onclick = function(){ $("mail-box").hidden = true; inAttesa = null; };
  $("m-ok").onclick = async function(){
    var email = $("m-email").value.trim(), tel = $("m-tel").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $("m-msg").textContent = "Controlla l’email."; return; }
    if (!$("m-consenso").checked) { $("m-msg").textContent = "Spunta il consenso per vedere il preventivo."; return; }
    $("m-ok").disabled = true; $("m-msg").textContent = "";
    var r = await registra(inAttesa, email, tel);
    $("m-ok").disabled = false;
    if (!r.ok) { $("m-msg").textContent = r.errore || "Riprova."; return; }
    try { localStorage.setItem("rf_calc_email", email.toLowerCase()); } catch (e) {}
    if (!$("email").value) $("email").value = email; if (tel && !$("telefono").value) $("telefono").value = tel;
    $("mail-box").hidden = true; mostra(inAttesa); ev("Lead", { content_name: L.chiave + "-calcolo", value: inAttesa.totale, currency: "EUR" }, true);
  };

  // ── richiesta ──
  var sel = $("menu"); MENU.forEach(function(m){ var o = document.createElement("option"); o.value = m.nome; o.textContent = m.nome + " · " + m.prezzo + " € a persona + IVA"; sel.appendChild(o); });
  $("f-extra").innerHTML = EXTRA.map(function(x){ return '<label class="spunta"><input type="checkbox" value="' + x.id + '"> <span>' + esc(x.nome) + '</span></label>'; }).join("");
  var oggi = new Date(); $("data").min = oggi.getFullYear() + "-" + String(oggi.getMonth() + 1).padStart(2, "0") + "-" + String(oggi.getDate()).padStart(2, "0");
  var inviando = false;
  function errore(t){ var m = $("msg"); m.className = "msg ko"; m.textContent = t; }
  $("modulo").addEventListener("submit", async function(e){
    e.preventDefault(); if (inviando) return;
    var azienda = $("azienda").value.trim(), ref = $("referente").value.trim(), tel = $("telefono").value.trim(), email = $("email").value.trim(), pers = parseInt($("persone").value, 10);
    if (azienda.length < 2) return errore("Scrivi il nome dell’azienda.");
    if (ref.length < 2) return errore("Scrivi nome e cognome di chi ci scrive.");
    if (tel.replace(/\D/g, "").length < 8) return errore("Controlla il numero di telefono.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errore("Controlla l’email: ti rispondiamo lì.");
    if (!pers || pers < 1) return errore("Quante persone siete? Scrivi un numero.");
    if (!$("privacy").checked) return errore("Per inviare la richiesta serve il consenso alla privacy.");
    if (!supa) return errore("Connessione non riuscita. Ricarica la pagina o chiamaci.");
    inviando = true; var b = $("invia"); b.disabled = true; b.textContent = "Un attimo…";
    var extra = Array.prototype.map.call(document.querySelectorAll("#f-extra input:checked"), function(i){ return i.value; });
    var r = null;
    try {
      r = await supa.rpc("cena_aziendale_richiesta", { p_azienda_nome: azienda, p_referente: ref, p_email: email, p_telefono: tel, p_persone: pers,
        p_data: $("data").value || null, p_sede: L.sede, p_note: $("note").value.trim() || null, p_privacy: true, p_marketing: $("marketing").checked,
        p_utm: utm, p_trappola: $("sito_web").value, p_menu: $("menu").value, p_extra: extra });
    } catch (x) { r = null; }
    if (!r || r.error || !r.data || r.data.ok !== true) { inviando = false; b.disabled = false; b.textContent = "Invia la richiesta"; return errore((r && r.data && r.data.errore) || "Non siamo riusciti a inviare la richiesta. Riprova o chiamaci."); }
    ev("Lead", { content_name: L.chiave, value: 0, currency: "EUR" }, true);
    $("modulo").hidden = true; $("grazie").hidden = false; $("grazie").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.addEventListener("rf-pronto", function(){ ev("ViewContent", { content_name: L.chiave, content_category: "aziende" }, true); });
})();
