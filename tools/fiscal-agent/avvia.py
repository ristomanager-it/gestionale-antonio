#!/usr/bin/env python3
# Avvio del ponte su Windows: carica .env e tiene vivo realtime.py (se cade, riparte in 5 secondi).
import os
import subprocess
import sys
import time

DIR = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(DIR, "agent.log")

for riga in open(os.path.join(DIR, ".env"), encoding="utf-8"):
    riga = riga.strip()
    if riga and not riga.startswith("#") and "=" in riga:
        k, v = riga.split("=", 1)
        os.environ[k.strip()] = v.strip()
os.environ["PYTHONIOENCODING"] = "utf-8"

python = sys.executable.replace("pythonw.exe", "python.exe")
while True:
    with open(LOG, "a", encoding="utf-8") as log:
        r = subprocess.call([python, "-u", os.path.join(DIR, "realtime.py")], cwd=DIR,
                            stdout=log, stderr=subprocess.STDOUT,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        log.write(time.strftime("%d/%m/%Y %H:%M:%S") + ": agente terminato (" + str(r) + "), riavvio tra 5s\n")
    time.sleep(5)
