#!/usr/bin/env python3
# Battito del ponte: a ogni giro il Raspberry scrive in agenti_ponte che e' vivo.
# Se smette, il server lo vede in pochi minuti e manda la notifica in home.
import datetime
import json
import os
import socket
import urllib.request

import agent

VERSIONE = "ponte 1.0"


def ip_locale():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def battito(errore=None):
    body = {
        "id": os.environ.get("RISTOFLOW_PONTE_NOME", "").strip() or socket.gethostname(),
        "azienda_id": agent.AZIENDA_ID or None,
        "sede_id": agent.SEDE_ID or None,
        "ultimo_contatto": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "versione": VERSIONE,
        "ip_locale": ip_locale(),
        "ultimo_errore": (str(errore)[:300] if errore else None),
    }
    req = urllib.request.Request(
        agent.SUPABASE_URL + "/rest/v1/agenti_ponte",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "apikey": agent.SERVICE_KEY,
            "Authorization": "Bearer " + agent.SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        r.read()
