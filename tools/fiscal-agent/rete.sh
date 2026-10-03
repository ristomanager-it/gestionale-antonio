#!/bin/bash
# Guardiano della rete: se il Raspberry perde internet si ripara da solo.
# Ogni minuto prova a raggiungere Supabase. Dopo 5 minuti senza rete riavvia la rete,
# dopo 15 minuti riavvia tutto il Raspberry (solo se acceso da almeno 20 minuti).
cd "$HOME/fiscal-agent" || exit 1
set -a; source .env; set +a
KO=0
while true; do
  CODICE=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$SUPABASE_URL/rest/v1/" 2>/dev/null)
  if [ -n "$CODICE" ] && [ "$CODICE" != "000" ]; then
    [ $KO -gt 0 ] && echo "$(date): rete tornata dopo $KO minuti" >> agent.log
    KO=0
  else
    KO=$((KO+1))
    echo "$(date): rete assente ($KO min)" >> agent.log
    if [ $KO -eq 5 ] || [ $KO -eq 10 ]; then
      echo "$(date): riavvio la rete" >> agent.log
      sudo -n iw dev wlan0 set power_save off 2>/dev/null
      if command -v nmcli >/dev/null; then sudo -n nmcli networking off; sleep 5; sudo -n nmcli networking on
      else sudo -n systemctl restart dhcpcd 2>/dev/null || sudo -n systemctl restart networking; fi
    fi
    SU=$(cut -d. -f1 /proc/uptime)
    if [ $KO -ge 15 ] && [ "$SU" -gt 1200 ]; then
      echo "$(date): rete assente da 15 minuti, riavvio il Raspberry" >> agent.log
      sudo -n reboot
    fi
  fi
  sleep 60
done
