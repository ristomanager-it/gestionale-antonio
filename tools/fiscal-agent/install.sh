#!/bin/bash
# Installa l'agente fiscale Ristoflow su un Raspberry nuovo (o lo aggiorna).
# Uso, dal Raspberry:
#   bash <(curl -fsSL https://raw.githubusercontent.com/ristomanager-it/gestionale-antonio/main/tools/fiscal-agent/install.sh)
# Le chiavi si scrivono qui sul Raspberry e restano solo nel file ~/fiscal-agent/.env

set -e
REF="${1:-main}"
BASE="https://raw.githubusercontent.com/ristomanager-it/gestionale-antonio/$REF/tools/fiscal-agent"
DIR="$HOME/fiscal-agent"

echo "== Agente fiscale Ristoflow: installazione =="
mkdir -p "$DIR"
cd "$DIR"

echo "-> Libreria websocket (serve la password dell'utente)"
sudo apt-get install -y python3-websocket python3-pil python3-pip >/dev/null
echo "-> Libreria etichette Brother"
pip3 install --quiet --break-system-packages brother-ql-next >/dev/null 2>&1 || pip3 install --quiet brother-ql-next

echo "-> Scarico agente"
curl -fsSL "$BASE/agent.py" -o agent.py.nuovo
curl -fsSL "$BASE/realtime.py" -o realtime.py.nuovo
curl -fsSL "$BASE/stampe.py" -o stampe.py.nuovo
curl -fsSL "$BASE/ponte.py" -o ponte.py.nuovo
curl -fsSL "$BASE/rete.sh" -o rete.sh
chmod +x rete.sh
python3 -m py_compile agent.py.nuovo realtime.py.nuovo stampe.py.nuovo ponte.py.nuovo
[ -f agent.py ] && cp agent.py agent.py.bak
[ -f realtime.py ] && cp realtime.py realtime.py.bak
mv agent.py.nuovo agent.py
mv realtime.py.nuovo realtime.py
mv stampe.py.nuovo stampe.py
mv ponte.py.nuovo ponte.py
rm -rf __pycache__
sed -n 3p agent.py

if [ ! -f .env ]; then
  echo ""
  echo "-> Configurazione (una volta sola)"
  read -r -p "SUPABASE_URL (es. https://xxxx.supabase.co): " SU
  read -r -s -p "SUPABASE_SERVICE_ROLE_KEY (non si vede mentre scrivi): " SK; echo ""
  read -r -p "ID azienda Ristoflow (invio = tutte): " AZ
  read -r -p "ID sede (invio = tutte): " SE
  read -r -p "IP delle stampanti di QUESTO locale, separati da virgola (invio = tutte): " ST
  umask 077
  {
    echo "SUPABASE_URL=$SU"
    echo "SUPABASE_SERVICE_ROLE_KEY=$SK"
    echo "RISTOFLOW_AZIENDA_ID=$AZ"
    echo "RISTOFLOW_SEDE_ID=$SE"
    echo "RISTOFLOW_STAMPANTI=$ST"
  } > .env
else
  echo "-> .env già presente: lo tengo"
fi

cat > run.sh <<'EOF'
#!/bin/bash
cd /home/$(whoami)/fiscal-agent
sudo -n iw dev wlan0 set power_save off 2>/dev/null
while true; do
  set -a
  source .env
  set +a
  python3 -u realtime.py
  echo "$(date): agente terminato, riavvio tra 5s" >> agent.log
  sleep 5
done
EOF
chmod +x run.sh

echo "-> Avvio automatico all'accensione"
( crontab -l 2>/dev/null | grep -v "fiscal-agent/run.sh"; echo "@reboot nohup bash $DIR/run.sh >> $DIR/agent.log 2>&1 &" ) | crontab -

echo "-> Riavvio agente"
pkill -f "fiscal-agent/run.sh" || true
pkill -f "realtime.py" || true
sleep 1
nohup bash "$DIR/run.sh" >> "$DIR/agent.log" 2>&1 < /dev/null &
sleep 6
tail -5 "$DIR/agent.log"
echo ""
echo "== Fatto. Se vedi 'Realtime iscrizione: ok' l'agente è attivo. =="
