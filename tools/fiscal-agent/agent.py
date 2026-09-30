#!/usr/bin/env python3
"""
Agente fiscale Ristoflow v4.1 (scontrini + comande) — legge coda_fiscale e stampa su Epson FP-81 II RT via fpmate.cgi
Stati validi: in_attesa, in_elaborazione, completato, errore
Documenti: scontrino, fattura (= scontrino, la fattura elettronica si fa a parte),
           preconto (non fiscale), lettura_x, chiusura_z
Avviato da realtime.py (che importa sb_get ed elabora da qui).
"""
import datetime
import json
import os
import re
import time
import urllib.request
import urllib.error

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Europe/Rome")
except Exception:
    TZ = None

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
POLL_SECONDS = 3
MAX_TENTATIVI = 3

# Con più locali ogni Raspberry prende solo i documenti suoi. Tutti facoltativi (vuoti = prende tutto):
#   RISTOFLOW_AZIENDA_ID  uuid dell'azienda
#   RISTOFLOW_SEDE_ID     uuid della sede (i documenti senza sede restano validi)
#   RISTOFLOW_STAMPANTI   IP delle stampanti di questo locale, separati da virgola
AZIENDA_ID = os.environ.get("RISTOFLOW_AZIENDA_ID", "").strip()
SEDE_ID = os.environ.get("RISTOFLOW_SEDE_ID", "").strip()
STAMPANTI = [x.strip() for x in os.environ.get("RISTOFLOW_STAMPANTI", "").split(",") if x.strip()]


def filtro_coda():
    f = ""
    if AZIENDA_ID:
        f += "&azienda_id=eq." + AZIENDA_ID
    if SEDE_ID:
        f += "&or=(sede_id.eq." + SEDE_ID + ",sede_id.is.null)"
    if STAMPANTI:
        f += "&stampante_ip=in.(" + ",".join(STAMPANTI) + ")"
    return f


def query_in_attesa(limite=5):
    return "coda_fiscale?stato=eq.in_attesa&order=created_at.asc&limit=" + str(limite) + filtro_coda()
LARGHEZZA = 42          # caratteri per riga sul preconto
# QR in fondo allo scontrino (coupon / link). Se la stampante rifiuta il QR,
# il documento viene ristampato subito SENZA fondo: lo scontrino non si blocca mai per il QR.
QR_TIPO = "QRCODE2"
QR_DIMENSIONE = 8       # qRCodeSize: dimensione del quadratino (1-16)
QR_ALLINEAMENTO = 1     # qRCodeAlignment: 0 sinistra, 1 centro, 2 destra
QR_CORREZIONE = 1       # qRCodeErrorCorrection: 0 L, 1 M, 2 Q, 3 H
MAX_DESCR = 38          # lunghezza massima descrizione articolo sulla FP-81

# Aliquota IVA -> reparto programmato sulla stampante (come in stampanti_fiscali.reparti_iva)
DEPARTMENT_MAP = {10: 1, 22: 2, 4: 3}
DEFAULT_DEPARTMENT = 1

# Metodo Ristoflow -> (paymentType, index) Epson
#  0 contanti, 2 elettronico (carta/POS), 3 buoni pasto, 5 non riscosso
PAGAMENTI = {
    "contanti": ("0", "0"),
    "carta": ("2", "1"),
    "pos": ("2", "1"),
    "stripe": ("2", "1"),
    "buoni_pasto": ("3", "1"),
    "bonifico": ("5", "0"),
    "addebito": ("5", "0"),
}
DESCR_PAGAMENTO = {
    "contanti": "CONTANTI",
    "carta": "PAGAMENTO ELETTRONICO",
    "pos": "PAGAMENTO ELETTRONICO",
    "stripe": "PAGAMENTO ELETTRONICO",
    "buoni_pasto": "BUONI PASTO",
    "bonifico": "NON RISCOSSO - BONIFICO",
    "addebito": "NON RISCOSSO - ADDEBITO",
}


# ── Supabase ─────────────────────────────────────────────────────────────
def sb_get(path):
    req = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/" + path,
        headers={"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY},
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))


def sb_patch(path, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/" + path,
        data=data,
        method="PATCH",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": "Bearer " + SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        r.read()


# ── Utilità ──────────────────────────────────────────────────────────────
def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def euro(v):
    return "%.2f" % round(num(v), 2)


def qta_str(q):
    q = num(q, 1)
    return str(int(q)) if q == int(q) else ("%.3f" % q).rstrip("0")


def oggi():
    now = datetime.datetime.now(TZ) if TZ else datetime.datetime.now()
    return now.strftime("%Y-%m-%d")


def envelope(corpo):
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">'
        "<s:Body>" + corpo + "</s:Body></s:Envelope>"
    )


def pagamenti_di(riga):
    """Lista [(metodo, importo)] che copre esattamente il totale da pagare."""
    totale = round(num(riga.get("totale")), 2)
    lista = riga.get("pagamenti") or []
    out = []
    for p in lista:
        m = str(p.get("metodo") or "contanti").lower()
        imp = round(num(p.get("importo")), 2)
        if imp > 0:
            out.append([m, imp])
    if not out:
        return [(str(riga.get("metodo_pagamento") or "contanti").lower(), totale)]
    # l'ultimo pagamento assorbe gli arrotondamenti
    somma_prec = round(sum(x[1] for x in out[:-1]), 2)
    out[-1][1] = round(totale - somma_prec, 2)
    return [(m, i) for m, i in out]


# ── XML documenti ────────────────────────────────────────────────────────
def xml_qr(fine):
    qr = (fine or {}).get("qr") or {}
    code = str(qr.get("contenuto") or "").strip()
    if not code:
        return ""
    # Per i QR la guida Epson vuole attributi dedicati: position/width/height/hRI non vanno usati
    return (
        '<printBarCode operator="1" codeType="' + QR_TIPO + '" qRCodeAlignment="' + str(QR_ALLINEAMENTO)
        + '" qRCodeSize="' + str(QR_DIMENSIONE) + '" qRCodeErrorCorrection="' + str(QR_CORREZIONE)
        + '" qRCodeDataType="0" code="' + esc(code[:250]) + '" />'
    )


def righe_fine(fine):
    fine = fine or {}
    out = [str(x) for x in (fine.get("righe") or []) if str(x).strip()]
    qr = fine.get("qr") or {}
    out += [str(x) for x in (qr.get("righe") or []) if str(x).strip()]
    return [x[:40] for x in out][:6]


def build_scontrino(riga, con_fine=True):
    corpo = '<printerFiscalReceipt><beginFiscalReceipt operator="1" />'
    for r in riga.get("righe") or []:
        prezzo = num(r.get("prezzo_unitario"))
        if prezzo <= 0:
            continue  # righe a zero (es. portate del menu del giorno) e sconti non vanno sul fiscale
        desc = esc(str(r.get("descrizione", ""))[:MAX_DESCR])
        iva = int(num(r.get("aliquota_iva"), 10))
        dep = DEPARTMENT_MAP.get(iva, DEFAULT_DEPARTMENT)
        corpo += (
            '<printRecItem operator="1" description="' + desc + '" quantity="' + qta_str(r.get("quantita", 1))
            + '" unitPrice="' + euro(prezzo) + '" department="' + str(dep) + '" justification="1" />'
        )
    sconto = round(num(riga.get("sconto")), 2)
    if sconto > 0:
        corpo += (
            '<printRecSubtotalAdjustment operator="1" adjustmentType="1" description="SCONTO" amount="'
            + euro(sconto) + '" justification="1" />'
        )
    fine = riga.get("fine_scontrino") if con_fine else None
    if fine:
        i = 0
        for testo in righe_fine(fine):
            i += 1
            corpo += '<printRecMessage operator="1" messageType="3" index="' + str(i) + '" font="1" message="' + esc(testo) + '" />'
        corpo += xml_qr(fine)  # il barcode va prima dei pagamenti
    for metodo, importo in pagamenti_di(riga):
        tipo, idx = PAGAMENTI.get(metodo, ("0", "0"))
        descr = DESCR_PAGAMENTO.get(metodo, metodo.upper())
        corpo += (
            '<printRecTotal operator="1" description="' + esc(descr) + '" payment="' + euro(importo)
            + '" paymentType="' + tipo + '" index="' + idx + '" justification="1" />'
        )
    corpo += '<endFiscalReceipt operator="1" /></printerFiscalReceipt>'
    return envelope(corpo)


def riga_testo(sx, dx=""):
    sx = str(sx)
    spazio = LARGHEZZA - len(dx)
    if len(sx) > spazio - 1:
        sx = sx[: spazio - 1]
    return sx + " " * (spazio - len(sx)) + dx


def build_preconto(riga, con_fine=True):
    linee = ["PRECONTO - NON FISCALE".center(LARGHEZZA)]
    if riga.get("numero_tavolo"):
        linee.append(("Tavolo " + str(riga["numero_tavolo"])).center(LARGHEZZA))
    linee.append("-" * LARGHEZZA)
    for r in riga.get("righe") or []:
        q = num(r.get("quantita"), 1)
        tot = q * num(r.get("prezzo_unitario"))
        linee.append(riga_testo(qta_str(q) + " x " + str(r.get("descrizione", "")), euro(tot).replace(".", ",")))
    sconto = num(riga.get("sconto"))
    if sconto > 0:
        linee.append(riga_testo("Sconto", "-" + euro(sconto).replace(".", ",")))
    linee.append("-" * LARGHEZZA)
    linee.append(riga_testo("TOTALE EURO", euro(riga.get("totale")).replace(".", ",")))
    if riga.get("coperti"):
        linee.append("Coperti: " + str(riga["coperti"]))
    fine = riga.get("fine_scontrino") if con_fine else None
    if fine:
        linee.append("")
        linee += [t.center(LARGHEZZA) for t in righe_fine(fine)]
    corpo = '<printerNonFiscal><beginNonFiscal operator="1" />'
    for l in linee:
        corpo += '<printNormal operator="1" font="1" data="' + esc(l) + '" />'
    if fine:
        corpo += xml_qr(fine)
    corpo += '<endNonFiscal operator="1" /></printerNonFiscal>'
    return envelope(corpo)


def build_report(tipo):
    tag = "printZReport" if tipo == "chiusura_z" else "printXReport"
    return envelope('<printerFiscalReport><' + tag + ' operator="1" /></printerFiscalReport>')


def build_xml(riga, con_fine=True):
    tipo = riga.get("tipo_documento") or "scontrino"
    if tipo == "preconto":
        return build_preconto(riga, con_fine), 15
    if tipo in ("lettura_x", "chiusura_z"):
        return build_report(tipo), 90  # la Z trasmette i corrispettivi: può metterci
    return build_scontrino(riga, con_fine), 15


# ── Stampa ───────────────────────────────────────────────────────────────
def stampa(ip, porta, xml, timeout=15):
    url = "http://%s:%s/cgi-bin/fpmate.cgi" % (ip, porta)
    req = urllib.request.Request(
        url,
        data=xml.encode("utf-8"),
        headers={"Content-Type": "text/xml; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8")


def tag_valore(testo, tag):
    m = re.search(r"<" + tag + r">\s*([^<]*?)\s*</" + tag + ">", testo)
    return m.group(1).strip() if m and m.group(1).strip() else None


def estrai_numero(testo):
    n = tag_valore(testo, "fiscalReceiptNumber")
    if n:
        return n
    m = re.search(r"DOCUMENTO N\.?\s*([\d\-]+)", testo)
    return m.group(1) if m else None


def elabora(riga):
    rid = riga["id"]
    tipo = riga.get("tipo_documento") or "scontrino"
    print("Elaboro", tipo, rid)
    try:
        # prenoto la riga: se l'agente cade a metà stampa non la ristampa da solo
        sb_patch("coda_fiscale?id=eq." + rid + "&stato=eq.in_attesa", {"stato": "in_elaborazione"})
        xml, timeout = build_xml(riga)
        risposta = stampa(riga["stampante_ip"], riga["stampante_porta"], xml, timeout)
        if 'success="false"' in risposta and riga.get("fine_scontrino"):
            # il fondo (saluto/QR) non deve mai bloccare lo scontrino: riprovo senza
            err = re.search(r'code="([^"]*)"', risposta)
            print("Fondo scontrino rifiutato (" + (err.group(1) if err else "?") + "), ristampo senza")
            xml, timeout = build_xml(riga, con_fine=False)
            risposta = stampa(riga["stampante_ip"], riga["stampante_porta"], xml, timeout)
            riga["_fine_rifiutato"] = err.group(1) if err else "?"
        if 'success="false"' in risposta:
            err = re.search(r'code="([^"]*)"', risposta)
            raise RuntimeError("Stampante: " + (err.group(1) if err else "errore sconosciuto"))
        if tipo in ("scontrino", "fattura"):
            numero = estrai_numero(risposta) or ("RT-" + str(int(time.time())))
        elif tipo == "chiusura_z":
            numero = "Z-" + (tag_valore(risposta, "zRepNumber") or oggi())
        elif tipo == "lettura_x":
            numero = "X-" + oggi()
        else:
            numero = "PRECONTO"
        sb_patch(
            "coda_fiscale?id=eq." + rid,
            {"stato": "completato", "numero_scontrino": numero,
             "data_scontrino": oggi(), "elaborato_at": "now()",
             "errore_msg": ("Fondo non stampato: " + riga["_fine_rifiutato"]) if riga.get("_fine_rifiutato") else None},
        )
        print("OK,", tipo, numero)
    except Exception as e:
        tentativi = (riga.get("tentativi") or 0) + 1
        # la chiusura Z non si ritenta da sola: meglio che la rilanci una persona
        if tipo == "chiusura_z":
            stato = "errore"
        else:
            stato = "errore" if tentativi >= MAX_TENTATIVI else "in_attesa"
        try:
            sb_patch(
                "coda_fiscale?id=eq." + rid,
                {"stato": stato, "errore_msg": str(e), "tentativi": tentativi},
            )
        except Exception as e2:
            print("Impossibile aggiornare lo stato:", e2)
        print("ERRORE:", e)


def main():
    print("Agente fiscale avviato, polling ogni", POLL_SECONDS, "s")
    while True:
        try:
            righe = sb_get(query_in_attesa())
            for riga in righe:
                elabora(riga)
        except urllib.error.URLError as e:
            print("Errore di rete verso Supabase:", e)
        except Exception as e:
            print("Errore imprevisto nel ciclo:", e)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
