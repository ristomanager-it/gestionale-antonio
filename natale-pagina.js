(function(){
  var CFG = window.NATALE_PAG;

  var N = window.NATALE || {};
  var $ = function(id){ return document.getElementById(id); };
  var euro = function(n){ return n.toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €"; };
  var euroI = function(n){ return (Math.round(n) === n ? String(n) : n.toLocaleString("it-IT")) + " €"; };
  var CAP = (N.capienza || {})[CFG.chiave] || null;
  var MANCANO = [];
  if (!N.menu || !N.menu.length) MANCANO.push("menu");
  if (!N.prezzo) MANCANO.push("prezzo");
  if (!N.ora) MANCANO.push("orario");
  if (!CAP) MANCANO.push("posti");
  var PRONTO = MANCANO.length === 0;
  var TBD = '<span class="tbd">da definire</span>';
  function riempi(){
    var mappa = {
      ora: N.ora ? esc(N.ora) : TBD,
      prezzo: N.prezzo ? euroI(N.prezzo) : TBD,
      prezzo_txt: N.prezzo ? "<b>" + euroI(N.prezzo) + "</b> a persona<br>menu di Natale" : "<b>Prenotazioni</b><br>a breve",
      bimbi: N.prezzo_bimbi ? ("I bambini (" + esc(N.eta_bimbi || "") + ") pagano " + euroI(N.prezzo_bimbi) + ". Segnalateli nel modulo: pensiamo noi al seggiolone.") : TBD,
      comprende: N.comprende ? esc(N.comprende) : TBD,
      disdetta: N.disdetta ? esc(N.disdetta) : TBD
    };
    Array.prototype.forEach.call(document.querySelectorAll("[data-v]"), function(el){ var k = el.getAttribute("data-v"); if (mappa[k] !== undefined) el.innerHTML = mappa[k]; });
    $("amo-prezzo").innerHTML = N.prezzo ? euroI(N.prezzo) : "Natale";
    $("amo-frase").textContent = N.prezzo ? "Il Pranzo di Natale, venerdì 25 dicembre." : "Il Pranzo di Natale, venerdì 25 dicembre. Menu e prezzo a breve.";
    var m = $("menu-box");
    if (N.menu && N.menu.length) {
      m.className = "menu";
      m.innerHTML = N.menu.map(function(s){ return '<div class="portata"><h4>' + esc(s.titolo) + '</h4>' + (s.piatti || []).map(function(p){ return "<p>" + esc(p) + "</p>"; }).join("") + "</div>"; }).join("");
    } else {
      m.className = "vuoto-menu";
      m.innerHTML = "Il menu del pranzo di Natale è in preparazione.<br>Lo pubblichiamo a breve.";
    }
    if (!PRONTO) {
      var b = document.createElement("div"); b.className = "bozza"; b.id = "bozza";
      b.innerHTML = "<b>BOZZA</b> · le prenotazioni si aprono quando sono pronti: " + MANCANO.join(", ") + ".";
      document.body.insertBefore(b, document.body.firstChild);
    }
  }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  var supa = null;
  try { supa = window.supabase.createClient(CFG.url, CFG.anon); } catch (e) {}
  var ospiti = 2, bimbi = 0, liberi = null, inviando = false;
  var qs = new URLSearchParams(location.search);
  riempi();
  $("eta-bimbi").textContent = (N.eta_bimbi || "") + (N.prezzo_bimbi ? ", " + euroI(N.prezzo_bimbi) : "");

  function totale(){ return (N.prezzo || 0) * ospiti + (N.prezzo_bimbi || 0) * bimbi; }
  function aggiorna(){
    $("ospiti-val").textContent = ospiti;
    $("bimbi-val").textContent = bimbi;
    $("c-ospiti").textContent = ospiti + (ospiti === 1 ? " adulto" : " adulti") + (bimbi ? " + " + bimbi + (bimbi === 1 ? " bambino" : " bambini") : "");
    var tot = totale(), acc = Math.round(tot * (N.perc || 30)) / 100;
    $("c-tot").textContent = PRONTO ? euro(tot) : "—";
    $("c-acc").textContent = PRONTO ? euro(acc) : "—";
    $("c-saldo").textContent = PRONTO ? euro(tot - acc) : "—";
  }
  function pieno(){ return ospiti + bimbi >= 20 || (liberi !== null && ospiti + bimbi >= liberi); }
  $("meno").onclick = function(){ if (ospiti > 1) { ospiti--; aggiorna(); } };
  $("piu").onclick = function(){ if (!pieno()) { ospiti++; aggiorna(); } };
  $("bmeno").onclick = function(){ if (bimbi > 0) { bimbi--; aggiorna(); } };
  $("bpiu").onclick = function(){ if (!pieno()) { bimbi++; aggiorna(); } };
  aggiorna();

  function errore(t){ var m = $("msg"); m.className = "msg ko"; m.textContent = t; }
  if (!PRONTO) { $("invia").disabled = true; $("invia").textContent = "Prenotazioni a breve"; }

  // posti liberi in tempo reale
  if (supa && PRONTO) supa.rpc("evento_posti_liberi", { p_sede: CFG.sede_id, p_data: N.data, p_capienza: CAP })
    .then(function(r){
      if (r.error || r.data === null || r.data === undefined) return;
      liberi = Number(r.data);
      var box = $("posti"); box.style.display = "block";
      if (liberi <= 0) { box.innerHTML = "<b>Tutto esaurito.</b><br>Chiamaci per la lista d’attesa."; $("invia").disabled = true; }
      else {
        box.innerHTML = "Restano <b>" + liberi + "</b> posti su " + CAP + ".";
        if (liberi <= 30) $("posti-hero").textContent = "Restano solo " + liberi + " posti.";
        if (ospiti + bimbi > liberi) { bimbi = 0; ospiti = Math.min(ospiti, liberi); aggiorna(); }
      }
    }).catch(function(){});

  $("modulo").addEventListener("submit", async function(ev){
    ev.preventDefault();
    if (inviando || !PRONTO) return;
    var nome = $("nome").value.trim(), cognome = $("cognome").value.trim();
    var tel = $("telefono").value.replace(/[^\d+]/g, ""), email = $("email").value.trim();
    var note = $("note").value.trim();
    if (!nome || !cognome) return errore("Scrivi nome e cognome.");
    if (tel.replace(/\D/g, "").length < 8) return errore("Controlla il numero di telefono.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errore("Controlla l’email: ti mandiamo lì la conferma.");
    if (!$("privacy").checked) return errore("Per prenotare serve il consenso alla privacy.");
    if (!supa) return errore("Connessione non riuscita. Ricarica la pagina o chiamaci.");

    inviando = true;
    var btn = $("invia"); btn.disabled = true; btn.textContent = "Un attimo…";
    $("msg").className = "msg"; $("msg").textContent = "";

    var token = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : (Date.now().toString(16) + Math.random().toString(16).slice(2)));
    var acconto = Math.round(totale() * (N.perc || 30));
    var persone = ospiti + bimbi;
    rfEvento("InitiateCheckout", { value: acconto / 100, currency: "EUR", content_name: CFG.slug, num_items: persone }, true);
    var riga = {
      azienda_id: CFG.azienda_id, sede_id: CFG.sede_id,
      cliente_nome: (nome + " " + cognome).trim(), cliente_telefono: tel, cliente_email: email,
      data: N.data, ora: N.ora, coperti: persone, bambini: bimbi, promo: false, stato: "in_attesa_pagamento", canale: "online",
      note: note || null, richieste_speciali: note || null, token_pubblico: token,
      tag: CFG.slug, source: qs.get("utm_source") || "landing",
      riferimento: JSON.stringify({ landing: CFG.slug, prezzo_persona: N.prezzo, prezzo_bambino: N.prezzo_bimbi, acconto_perc: N.perc || 30, adulti: ospiti, bambini: bimbi,
        consenso_gdpr: true, consenso_marketing: $("marketing").checked,
        utm_source: qs.get("utm_source"), utm_medium: qs.get("utm_medium"), utm_campaign: qs.get("utm_campaign") })
    };
    var ins = await supa.from("prenotazioni_tavoli").insert([riga]);
    if (ins.error) {
      inviando = false; btn.disabled = false; btn.textContent = "Paga l’acconto e conferma";
      return errore("Non siamo riusciti a registrare la prenotazione. Riprova o chiamaci.");
    }
    rfEvento("Lead", { value: acconto / 100, currency: "EUR", content_name: CFG.slug }, true);

    // gli avvisi al locale e la conferma al cliente partono dal database quando arriva il pagamento
    var PAG = "https://app.ristoflow-ai.com/natale-prenotazione.html?t=" + token;
    try {
      var pub = await supa.rpc("prenotazione_pubblica", { p_token: token });
      var id = pub.data && pub.data.ok ? pub.data.prenotazione.id : null;
      var res = await fetch(CFG.url + "/functions/v1/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": CFG.anon, "Authorization": "Bearer " + CFG.anon },
        body: JSON.stringify({ action: "create_session", azienda_id: CFG.azienda_id, tipo: "tavolo", riferimento_id: id,
          importo_centesimi: acconto,
          descrizione: "Acconto " + (N.perc || 30) + "% · Pranzo di Natale · " + CFG.locale + " · 25/12/2026 · " + ospiti + (ospiti === 1 ? " adulto" : " adulti") + (bimbi ? " + " + bimbi + (bimbi === 1 ? " bambino" : " bambini") : ""),
          cliente_email: email, cliente_nome: (nome + " " + cognome).trim(),
          success_url: PAG + "&esito=ok", cancel_url: PAG + "&esito=annullato",
          metadata: { landing: CFG.slug, adulti: String(ospiti), bambini: String(bimbi) } })
      });
      var out = await res.json();
      if (!res.ok || !out.checkout_url) throw new Error(out.error || "checkout");
      $("msg").className = "msg ok"; $("msg").textContent = "Ti portiamo al pagamento sicuro…";
      location.href = out.checkout_url;
    } catch (e) {
      try { await supa.rpc("prenotazione_pagamento_fallito", { p_token: token }); } catch (x) {}
      inviando = false; btn.disabled = false; btn.textContent = "Paga l’acconto e conferma";
      errore("Il pagamento non è partito. La richiesta l’abbiamo ricevuta: puoi riprovare dalla pagina della prenotazione.");
      setTimeout(function(){ location.href = PAG; }, 2500);
    }
  });

  // remarketing: chi arriva fino a dove, per ricolpirlo con il messaggio giusto
  document.addEventListener("rf-pronto", function(){ rfEvento("ViewContent", { content_name: CFG.slug, content_category: "natale" }, true); });
  if ("IntersectionObserver" in window) {
    var visti = {};
    var oss = new IntersectionObserver(function(voci){
      voci.forEach(function(v){
        var n = v.target.getAttribute("data-traccia");
        if (v.isIntersecting && !visti[n]) { visti[n] = true; rfEvento(n, { locale: CFG.locale }); }
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(document.querySelectorAll("[data-traccia]"), function(el){ oss.observe(el); });
  }
  var iniziato = false;
  $("nome").addEventListener("focus", function(){ if (!iniziato) { iniziato = true; rfEvento("Natale_Inizio_Modulo", { locale: CFG.locale }); } });
})();