#!/usr/bin/env python3
"""
Stampa NON fiscale Ristoflow: comande di reparto e preconti su stampanti termiche di rete
(ESC/POS, porta 9100). Legge coda_stampe. Usato da realtime.py insieme all'agente fiscale.
"""
import datetime
import json
import socket
import urllib.request
import time

import agent  # riusa sb_get, sb_patch, filtri e fuso orario

MAX_TENTATIVI = 3

ESC = b"\x1b"
GS = b"\x1d"
INIT = ESC + b"@" + ESC + b"t\x13"          # reset + tabella caratteri PC858 (accenti ed euro)
CENTRO = ESC + b"a\x01"
SINISTRA = ESC + b"a\x00"
NORMALE = ESC + b"!\x00"
GRASSETTO_ON = ESC + b"E\x01"
GRASSETTO_OFF = ESC + b"E\x00"
ALTO = ESC + b"!\x10"                       # doppia altezza
GRANDE = ESC + b"!\x30"                     # doppia altezza e larghezza
INVERSO_ON = GS + b"B\x01"
INVERSO_OFF = GS + b"B\x00"
TAGLIO = b"\n\n\n" + GS + b"V\x42\x00"
# dimensioni con GS ! (più compatibile di ESC ! su stampanti non Epson)
DIM_1 = GS + b"!\x00"
DIM_ALTO = GS + b"!\x01"                   # doppia altezza
DIM_2 = GS + b"!\x11"                      # doppia altezza e larghezza

REPARTI = {"cucina": "CUCINA", "bar": "BAR", "pasticceria": "PASTICCERIA", "preconto": "PRECONTO",
           "beverage": "BEVERAGE", "dessert": "DESSERT"}


def t(s):
    return str(s).encode("cp858", "replace")


def ora_locale(ts=None):
    if agent.TZ:
        now = datetime.datetime.now(agent.TZ)
    else:
        now = datetime.datetime.now()
    return now.strftime("%H:%M")


def taglia(s, n):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "."


def riga_dx(sx, dx, larg):
    sx = taglia(sx, larg - len(dx) - 1)
    return sx + " " * (larg - len(sx) - len(dx)) + dx


def a_capo(testo, n, rientro=""):
    """Spezza il testo in righe da n caratteri senza tagliare le parole."""
    parole = str(testo).split()
    righe, cur = [], ""
    for w in parole:
        while len(w) > n:
            if cur:
                righe.append(cur); cur = ""
            righe.append(w[:n]); w = w[n:]
        prova = (cur + " " + w) if cur else w
        if len(prova) <= n:
            cur = prova
        else:
            righe.append(cur); cur = rientro + w
    if cur:
        righe.append(cur)
    return righe or [""]


def build_comanda(c, larg):
    grande = max(10, larg // 2)            # caratteri per riga a doppia larghezza
    out = INIT + CENTRO + DIM_2 + t(REPARTI.get(c.get("reparto"), str(c.get("reparto") or "").upper())) + b"\n"
    tav = c.get("tavolo")
    out += DIM_2 + t("TAVOLO " + str(tav) if tav else "BANCO") + b"\n"
    if c.get("nome"):                      # nome della prenotazione, sotto il tavolo
        for riga in a_capo(str(c["nome"]).upper(), grande):
            out += DIM_2 + GRASSETTO_ON + t(riga) + GRASSETTO_OFF + b"\n"
    out += DIM_1 + NORMALE
    if c.get("via"):
        out += b"\n" + DIM_2 + GRASSETTO_ON + INVERSO_ON + t(" VIA " + str(c["via"]) + "a USCITA ") + INVERSO_OFF + GRASSETTO_OFF + DIM_1 + b"\n\n"
    if c.get("coperti"):
        out += DIM_ALTO + t(str(c["coperti"]) + " coperti") + DIM_1 + b"\n"
    out += SINISTRA + t(riga_dx(c.get("cameriere") or "", ora_locale(), larg)) + b"\n"
    if c.get("ristampa"):
        out += INVERSO_ON + t(" RISTAMPA ") + INVERSO_OFF + b"\n"
    out += t("-" * larg) + b"\n"
    info = [str(x).strip() for x in (c.get("info_tavolo") or []) if str(x).strip()]
    if info:                               # cosa deve sapere ogni reparto: allergie, bambini, occasione
        # scala Antonio: portate 10, modifiche 7, info tavolo 4, minuti 4
        out += t("=" * larg) + b"\n" + DIM_1 + GRASSETTO_ON + t("*** INFO TAVOLO ***") + b"\n"
        for voce in info:
            for riga in a_capo(voce.upper(), larg - 2, "  "):
                out += t(riga) + b"\n"
        out += GRASSETTO_OFF + t("=" * larg) + b"\n"
    # righe raggruppate per uscita: ogni gruppo ha il suo titolo in negativo
    gruppi = {}
    for r in c.get("righe") or []:
        u = int(r.get("uscita") or c.get("uscita") or 1)
        gruppi.setdefault(u, []).append(r)
    for u in sorted(gruppi):
        titolo = " " + str(u) + "a USCITA "
        out += b"\n" + CENTRO + DIM_2 + GRASSETTO_ON + INVERSO_ON + t(titolo) + INVERSO_OFF + GRASSETTO_OFF + DIM_1 + b"\n"
        tempi = [int(r["min"]) for r in gruppi[u] if str(r.get("min") or "").isdigit() and int(r["min"]) > 0]
        if tempi:
            out += t("pronta in ~" + str(max(tempi)) + " min") + b"\n"
        out += b"\n" + SINISTRA
        out += righe_gruppo(gruppi[u], grande, larg)
    out += t("-" * larg) + b"\n"
    if c.get("note") and not c.get("via"):
        out += DIM_ALTO + GRASSETTO_ON + t(taglia(str(c["note"]), larg)) + GRASSETTO_OFF + DIM_1 + b"\n"
    out += TAGLIO
    return out


def righe_gruppo(righe, grande, larg):
    out = b""
    for r in righe:
        testo = str(r.get("qta", 1)) + " " + str(r.get("nome", ""))
        out += DIM_2 + GRASSETTO_ON
        for riga in a_capo(testo, grande, "  "):
            out += t(riga) + b"\n"
        out += GRASSETTO_OFF + DIM_1
        if r.get("note"):                  # modifiche: nero su bianco, grandi e maiuscole (niente negativo)
            out += DIM_2 + GRASSETTO_ON
            for riga in a_capo(">> " + str(r["note"]).upper(), grande, "   "):
                out += t(riga) + b"\n"
            out += GRASSETTO_OFF + DIM_1
        if str(r.get("min") or "").isdigit() and int(r["min"]) > 0:
            out += t("    prep. " + str(int(r["min"])) + " min") + b"\n"
        out += b"\n"
    return out


def euro(v):
    return ("%.2f" % float(v or 0)).replace(".", ",")


def build_preconto(c, larg):
    out = INIT + CENTRO + GRANDE + t("PRECONTO") + b"\n" + NORMALE + t("documento non fiscale") + b"\n"
    if c.get("tavolo"):
        out += ALTO + t("Tavolo " + str(c["tavolo"])) + NORMALE + b"\n"
    out += SINISTRA + t("-" * larg) + b"\n"
    for r in c.get("righe") or []:
        q = float(r.get("quantita") or 1)
        qs = str(int(q)) if q == int(q) else str(q)
        tot = q * float(r.get("prezzo_unitario") or 0)
        out += t(riga_dx(qs + " x " + str(r.get("descrizione", "")), euro(tot), larg)) + b"\n"
    if float(c.get("sconto") or 0) > 0:
        out += t(riga_dx("Sconto", "-" + euro(c["sconto"]), larg)) + b"\n"
    out += t("-" * larg) + b"\n"
    out += DIM_ALTO + GRASSETTO_ON + t(riga_dx("TOTALE EURO", euro(c.get("totale")), larg)) + GRASSETTO_OFF + DIM_1 + b"\n"
    if c.get("coperti"):
        out += t("Coperti: " + str(c["coperti"])) + b"\n"
    out += CENTRO + t(ora_locale()) + b"\n" + TAGLIO
    return out


def build_prova(c, larg):
    return INIT + CENTRO + GRANDE + t("PROVA") + b"\n" + NORMALE + t(str(c.get("testo") or "Stampante collegata a Ristoflow")) + b"\n" + TAGLIO


def build_etichetta(c):
    """Etichetta lotto: PNG 696x472 (62x40 mm a 300 dpi) disegnato dall'app, nero e rosso.
    Protocollo raster Brother QL, rotolo continuo 62 mm nero/rosso (DK-22251), taglio a ogni etichetta."""
    import base64
    import io
    from PIL import Image
    from brother_ql.conversion import convert
    from brother_ql.raster import BrotherQLRaster
    png = str(c.get("png") or "")
    if "," in png:
        png = png.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(png))).convert("RGB")
    copie = max(1, min(int(c.get("copie") or 1), 50))
    # rotolo scelto nell'app: 62red, 62, 54, 50, 38, 29 (continui) o 62x29, 62x100 (pretagliati)
    label = str(c.get("label") or ("62red" if c.get("rosso", True) else "62"))
    rosso = label == "62red"
    q = BrotherQLRaster(str(c.get("modello") or "QL-820NWB"))
    q.exception_on_warning = False
    return convert(qlr=q, images=[img] * copie, label=label, rotate="0",
                   threshold=70.0, dither=False, compress=True, red=bool(rosso), dpi_600=False, hq=True, cut=True)


def build(riga):
    c = riga.get("contenuto") or {}
    if riga.get("tipo") == "etichetta":
        return build_etichetta(c)
    larg = int(riga.get("larghezza") or 42)
    tipo = riga.get("tipo")
    if tipo == "comanda":
        return build_comanda(dict(c, reparto=riga.get("reparto") or c.get("reparto")), larg)
    if tipo == "preconto":
        return build_preconto(c, larg)
    return build_prova(c, larg)


def invia(ip, porta, dati):
    s = socket.create_connection((ip, int(porta or 9100)), 5)
    try:
        s.sendall(dati)
    finally:
        s.close()


def query_in_attesa(limite=10):
    f = ""
    if agent.AZIENDA_ID:
        f += "&azienda_id=eq." + agent.AZIENDA_ID
    if agent.SEDE_ID:
        f += "&or=(sede_id.eq." + agent.SEDE_ID + ",sede_id.is.null)"
    return "coda_stampe?stato=eq.in_attesa&order=created_at.asc&limit=" + str(limite) + f


def prenota(rid):
    """Prende la stampa solo se e' ancora in attesa: con due ponti accesi esce una volta sola."""
    req = urllib.request.Request(
        agent.SUPABASE_URL + "/rest/v1/coda_stampe?id=eq." + rid + "&stato=eq.in_attesa",
        data=json.dumps({"stato": "in_elaborazione"}).encode("utf-8"),
        method="PATCH",
        headers={
            "apikey": agent.SERVICE_KEY,
            "Authorization": "Bearer " + agent.SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return len(json.loads(r.read() or b"[]")) > 0


def elabora(riga):
    rid = riga["id"]
    try:
        if not prenota(rid):
            return  # l'ha gia' presa l'altro ponte
        invia(riga["stampante_ip"], riga.get("stampante_porta"), build(riga))
        agent.sb_patch("coda_stampe?id=eq." + rid, {"stato": "completato", "elaborato_at": "now()", "errore_msg": None})
        print("Stampa OK", riga.get("tipo"), riga.get("reparto") or "", riga["stampante_ip"], flush=True)
    except Exception as e:
        tentativi = (riga.get("tentativi") or 0) + 1
        stato = "errore" if tentativi >= MAX_TENTATIVI else "in_attesa"
        try:
            agent.sb_patch("coda_stampe?id=eq." + rid, {"stato": stato, "errore_msg": str(e), "tentativi": tentativi})
        except Exception as e2:
            print("Impossibile aggiornare coda_stampe:", e2, flush=True)
        print("ERRORE stampa", riga["stampante_ip"], e, flush=True)
        if stato == "in_attesa":
            time.sleep(1)


def ciclo_una_volta():
    righe = agent.sb_get(query_in_attesa())
    for riga in righe:
        elabora(riga)
    return len(righe)
