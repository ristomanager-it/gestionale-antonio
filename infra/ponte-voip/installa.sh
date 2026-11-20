#!/usr/bin/env bash
# Ponte VoIP Ristoflow: collega un numero VoipVoice (o altro operatore con registrazione SIP) alla voce AI di ElevenLabs.
# Server Ubuntu 22.04/24.04 pulito, con IP pubblico. Uso (da root):
#   bash installa.sh <UTENTE_SIP> <PASSWORD_SIP> <NUMERO>        es: bash installa.sh 5406234526 'xxxx' 0550107610
# Cosa fa:
#   chiamate in arrivo sul numero  -> Asterisk -> sip:+39NUMERO@sip.rtc.elevenlabs.io (TCP)
#   chiamate in uscita dalla voce AI (trasferimento a un collega) -> Asterisk (utente/password) -> VoipVoice
# Alla fine stampa i dati da dare a ElevenLabs (indirizzo, utente e password per le chiamate in uscita).
set -euo pipefail

UTENTE="${1:?utente SIP mancante}"
PASSWORD="${2:?password SIP mancante}"
NUMERO="${3:?numero mancante}"
REGISTRAR="${REGISTRAR:-sip.voipvoicetel.it}"
SUBNET_OPERATORE="${SUBNET_OPERATORE:-212.97.59.64/27 193.227.104.0/24 109.233.128.0/21 93.94.93.0/24}"

case "$NUMERO" in
  +*) NUM_E164="$NUMERO" ;;
  0039*) NUM_E164="+${NUMERO#00}" ;;
  *) NUM_E164="+39${NUMERO}" ;;
esac

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq asterisk ufw curl openssl >/dev/null

IP_PUBBLICO="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
EL_UTENTE="ristoflow"
EL_PASSWORD="$(openssl rand -hex 16)"

cat > /etc/asterisk/pjsip.conf <<EOF
[global]
type=global
endpoint_identifier_order=ip,auth_username,username
user_agent=Ristoflow Ponte

[udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=${IP_PUBBLICO}
external_signaling_address=${IP_PUBBLICO}

[tcp]
type=transport
protocol=tcp
bind=0.0.0.0:5060
external_media_address=${IP_PUBBLICO}
external_signaling_address=${IP_PUBBLICO}

; ---------- operatore (VoipVoice): registrazione con utente e password ----------
[operatore-auth]
type=auth
auth_type=userpass
username=${UTENTE}
password=${PASSWORD}

[operatore-reg]
type=registration
transport=udp
outbound_auth=operatore-auth
server_uri=sip:${REGISTRAR}
client_uri=sip:${UTENTE}@${REGISTRAR}
contact_user=${UTENTE}
retry_interval=60
expiration=600

[operatore-aor]
type=aor
contact=sip:${REGISTRAR}

[operatore]
type=endpoint
transport=udp
context=da-operatore
disallow=all
allow=alaw,ulaw
outbound_auth=operatore-auth
aors=operatore-aor
from_user=${UTENTE}
from_domain=${REGISTRAR}
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
dtmf_mode=rfc4733

[operatore-identify]
type=identify
endpoint=operatore
$(for s in $SUBNET_OPERATORE; do echo "match=$s"; done)

; ---------- ElevenLabs ----------
[elevenlabs-aor]
type=aor
contact=sip:sip.rtc.elevenlabs.io:5060\;transport=tcp

[elevenlabs-auth]
type=auth
auth_type=userpass
username=${EL_UTENTE}
password=${EL_PASSWORD}

[elevenlabs]
type=endpoint
transport=tcp
context=da-elevenlabs
disallow=all
allow=ulaw,alaw
aors=elevenlabs-aor
auth=elevenlabs-auth
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
dtmf_mode=rfc4733
send_pai=yes
trust_id_outbound=yes
EOF

cat > /etc/asterisk/extensions.conf <<EOF
[general]
static=yes
writeprotect=yes

[globals]
NUMERO=${NUM_E164}

; chiamata dal cliente -> voce AI. Il numero del cliente passa in formato +39...
[da-operatore]
exten => _X.,1,Goto(voce-ai,s,1)
exten => _+X.,1,Goto(voce-ai,s,1)
exten => s,1,Goto(voce-ai,s,1)

[voce-ai]
exten => s,1,NoOp(Chiamata in arrivo da \${CALLERID(num)})
 same => n,Set(CHI=\${CALLERID(num)})
 same => n,ExecIf(\$["\${CHI:0:2}" = "00"]?Set(CHI=+\${CHI:2}))
 same => n,ExecIf(\$["\${CHI:0:1}" != "+" & "\${CHI}" != ""]?Set(CHI=+39\${CHI}))
 same => n,Set(CALLERID(num)=\${CHI})
 same => n,Dial(PJSIP/elevenlabs/sip:\${NUMERO}@sip.rtc.elevenlabs.io:5060\;transport=tcp,60)
 same => n,Hangup()

; chiamata dalla voce AI (trasferimento a un collega) -> operatore
[da-elevenlabs]
exten => _+39X.,1,Dial(PJSIP/\${EXTEN:3}@operatore,60)
 same => n,Hangup()
exten => _+X.,1,Dial(PJSIP/00\${EXTEN:1}@operatore,60)
 same => n,Hangup()
exten => _X.,1,Dial(PJSIP/\${EXTEN}@operatore,60)
 same => n,Hangup()
EOF

cat > /etc/asterisk/rtp.conf <<'EOF'
[general]
rtpstart=10000
rtpend=20000
EOF

# firewall: SIP UDP solo dall'operatore; SIP TCP aperto (ElevenLabs entra con utente e password); audio RTP
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
for s in $SUBNET_OPERATORE; do ufw allow from "$s" to any port 5060 proto udp >/dev/null; done
ufw allow 5060/tcp >/dev/null
ufw allow 10000:20000/udp >/dev/null
ufw --force enable >/dev/null

systemctl enable asterisk >/dev/null 2>&1
systemctl restart asterisk
sleep 5
asterisk -rx "pjsip show registrations" || true

cat <<EOF

==================== PONTE PRONTO ====================
Numero:            ${NUM_E164}
Indirizzo ponte:   ${IP_PUBBLICO}
Da dare a ElevenLabs per le chiamate in uscita (trasferimenti):
  indirizzo  ${IP_PUBBLICO}:5060  (TCP)
  utente     ${EL_UTENTE}
  password   ${EL_PASSWORD}
La riga "Registered" qui sopra vuol dire che VoipVoice ha accettato il collegamento.
======================================================
EOF
