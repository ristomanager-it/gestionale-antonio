#!/usr/bin/env python3
# Battito del ponte: a ogni giro il Raspberry scrive in agenti_ponte che e' vivo.
# Se smette, il server lo vede in pochi minuti e manda la notifica in home.
# Telecomando: se in agenti_ponte qualcuno imposta riavvio_richiesto_il, il ponte si chiude
# e run.sh lo fa ripartire scaricando prima l'ultima versione (aggiornamento a distanza).
import datetime
import json
import os
import socket
import subprocess
import urllib.request

import agent

DIR = os.path.dirname(os.path.abspath(__file__))
AVVIO = datetime.datetime.now(datetime.timezone.utc)


def nome():
    return os.environ.get("RISTOFLOW_PONTE_NOME", "").strip() or socket.gethostname()


def versione():
    try:
        with open(os.path.join(DIR, ".versione"), encoding="utf-8") as f:
            return "ponte 1.1 " + f.read().strip()[:7]
    except Exception:
        return "ponte 1.1"


def ip_locali():
    # tutti gli indirizzi (cavo e wifi), cosi' sappiamo dove raggiungerlo
    try:
        out = subprocess.run(["hostname", "-I"], capture_output=True, text=True, timeout=5).stdout.split()
        ips = [x for x in out if "." in x]
        if ips:
            return ", ".join(ips)
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def _req(metodo, path, body=None, prefer=None):
    h = {"apikey": agent.SERVICE_KEY, "Authorization": "Bearer " + agent.SERVICE_KEY, "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    req = urllib.request.Request(agent.SUPABASE_URL + "/rest/v1/" + path,
                                 data=(json.dumps(body).encode("utf-8") if body is not None else None),
                                 method=metodo, headers=h)
    with urllib.request.urlopen(req, timeout=10) as r:
        dati = r.read()
        return json.loads(dati) if dati else None


def battito(errore=None):
    _req("POST", "agenti_ponte", {
        "id": nome(),
        "azienda_id": agent.AZIENDA_ID or None,
        "sede_id": agent.SEDE_ID or None,
        "ultimo_contatto": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "versione": versione(),
        "ip_locale": ip_locali(),
        "ultimo_errore": (str(errore)[:300] if errore else None),
    }, "resolution=merge-duplicates,return=minimal")
    righe = _req("GET", "agenti_ponte?id=eq." + nome() + "&select=riavvio_richiesto_il") or []
    rich = (righe[0] or {}).get("riavvio_richiesto_il") if righe else None
    if rich:
        quando = datetime.datetime.fromisoformat(str(rich).replace("Z", "+00:00"))
        if quando > AVVIO:
            print("Riavvio richiesto da remoto: mi aggiorno e riparto", flush=True)
            os._exit(0)
