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


RUN_SH = r'''#!/bin/bash
# Tiene vivo il ponte. A ogni (ri)partenza: scarica l'ultima versione da GitHub (se compila),
# legge le impostazioni a distanza da agenti_ponte.config e poi avvia realtime.py.
cd /home/$(whoami)/fiscal-agent
sudo -n iw dev wlan0 set power_save off 2>/dev/null
REPO=ristomanager-it/gestionale-antonio

aggiorna() {
  SHA=$(curl -fsS -m 15 "https://api.github.com/repos/$REPO/commits/main" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sha"])' 2>/dev/null)
  [ -z "$SHA" ] && return
  [ "$SHA" = "$(cat .versione 2>/dev/null)" ] && return
  B="https://raw.githubusercontent.com/$REPO/$SHA/tools/fiscal-agent"
  rm -rf .nuovo && mkdir -p .nuovo
  for f in agent.py realtime.py stampe.py ponte.py rete.sh; do
    curl -fsS -m 30 "$B/$f" -o ".nuovo/$f" || { echo "$(date): aggiornamento non scaricato ($f)" >> agent.log; return; }
  done
  python3 -m py_compile .nuovo/*.py || { echo "$(date): aggiornamento scartato, non compila" >> agent.log; return; }
  for f in agent.py realtime.py stampe.py ponte.py rete.sh; do cp ".nuovo/$f" "$f"; done
  chmod +x rete.sh; rm -rf .nuovo; echo "$SHA" > .versione
  echo "$(date): aggiornato a ${SHA:0:7}" >> agent.log
}

impostazioni_remote() {
  NOME="${RISTOFLOW_PONTE_NOME:-$(hostname)}"
  CFG=$(curl -fsS -m 10 "$SUPABASE_URL/rest/v1/agenti_ponte?id=eq.$NOME&select=config" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null)
  eval "$(echo "$CFG" | python3 -c '
import sys, json, shlex
try:
    c = (json.load(sys.stdin) or [{}])[0].get("config") or {}
except Exception:
    c = {}
mappa = {"sede_id": "RISTOFLOW_SEDE_ID", "stampanti": "RISTOFLOW_STAMPANTI", "azienda_id": "RISTOFLOW_AZIENDA_ID"}
for k, v in c.items():
    if k in mappa and v is not None:
        print("export " + mappa[k] + "=" + shlex.quote(str(v)))
' 2>/dev/null)"
}

while true; do
  aggiorna
  set -a; source .env; set +a
  impostazioni_remote
  python3 -u realtime.py
  echo "$(date): agente terminato, riavvio tra 5s" >> agent.log
  sleep 5
done
'''


def sistema_run_sh():
    """run.sh non si aggiorna da solo: lo riscrive il ponte (sostituzione atomica, bash tiene il vecchio)."""
    if os.name != "posix":
        return
    p = os.path.join(DIR, "run.sh")
    try:
        with open(p, encoding="utf-8") as f:
            if f.read() == RUN_SH:
                return
    except Exception:
        pass
    try:
        tmp = p + ".nuovo"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(RUN_SH)
        os.chmod(tmp, 0o755)
        os.replace(tmp, p)
        print("run.sh aggiornato", flush=True)
    except Exception as e:
        print("run.sh non aggiornato:", e, flush=True)


sistema_run_sh()
