#!/usr/bin/env python3
# Agente fiscale Ristoflow - modalita' Realtime.
# Riusa sb_get ed elabora di agent.py (non modificato).
# Supabase avvisa appena entra una riga in coda_fiscale; il polling resta come riserva ogni 30 s.

import json
import os
import threading
import time

import websocket

import agent

FALLBACK_SECONDS = 30
HEARTBEAT_SECONDS = 25
SVEGLIA = threading.Event()


def ws_url():
    base = os.environ["SUPABASE_URL"].rstrip("/").replace("https://", "wss://")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return base + "/realtime/v1/websocket?apikey=" + key + "&vsn=1.0.0"


def join_msg():
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    payload = {
        "config": {
            "postgres_changes": [
                {"event": "INSERT", "schema": "public", "table": "coda_fiscale"}
            ]
        }
    }
    if key.startswith("eyJ"):
        payload["access_token"] = key
    return json.dumps({
        "topic": "realtime:coda_fiscale",
        "event": "phx_join",
        "payload": payload,
        "ref": "1",
    })


def ascolta():
    ref = [1]

    def heartbeat(ws, attivo):
        while attivo.is_set():
            time.sleep(HEARTBEAT_SECONDS)
            if not attivo.is_set():
                break
            ref[0] += 1
            try:
                ws.send(json.dumps({"topic": "phoenix", "event": "heartbeat",
                                    "payload": {}, "ref": str(ref[0])}))
            except Exception:
                break

    while True:
        attivo = threading.Event()

        def on_open(ws):
            attivo.set()
            ws.send(join_msg())
            threading.Thread(target=heartbeat, args=(ws, attivo), daemon=True).start()
            print("Realtime collegato", flush=True)
            SVEGLIA.set()  # recupera eventuali righe entrate mentre era scollegato

        def on_message(ws, msg):
            try:
                m = json.loads(msg)
            except Exception:
                return
            ev = m.get("event")
            if ev == "postgres_changes":
                SVEGLIA.set()
            elif ev == "phx_reply" and m.get("ref") == "1":
                stato = (m.get("payload") or {}).get("status")
                print("Realtime iscrizione:", stato, flush=True)
            elif ev in ("phx_error", "system") and (m.get("payload") or {}).get("status") == "error":
                print("Realtime errore:", m.get("payload"), flush=True)

        def on_close(ws, code, reason):
            attivo.clear()
            print("Realtime chiuso:", code, reason, flush=True)

        def on_error(ws, err):
            print("Realtime errore connessione:", err, flush=True)

        try:
            app = websocket.WebSocketApp(ws_url(), on_open=on_open, on_message=on_message,
                                         on_close=on_close, on_error=on_error)
            app.run_forever()
        except Exception as e:
            print("Realtime eccezione:", e, flush=True)
        attivo.clear()
        time.sleep(5)


def main():
    print("Agente fiscale avviato, Realtime + riserva ogni", FALLBACK_SECONDS, "s", flush=True)
    threading.Thread(target=ascolta, daemon=True).start()
    while True:
        SVEGLIA.clear()
        try:
            righe = agent.sb_get("coda_fiscale?stato=eq.in_attesa&order=created_at.asc&limit=5")
            for riga in righe:
                agent.elabora(riga)
            if len(righe) == 5:
                SVEGLIA.set()  # potrebbero essercene altre
        except Exception as e:
            print("Errore nel ciclo:", e, flush=True)
        SVEGLIA.wait(FALLBACK_SECONDS)


if __name__ == "__main__":
    main()
