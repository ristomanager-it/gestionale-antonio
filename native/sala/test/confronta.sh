#!/bin/sh
# Confronta byte per byte le comande del tablet (escpos.js) con quelle del Raspberry (stampe.py).
cd "$(dirname "$0")"
SUPABASE_URL=http://x SUPABASE_SERVICE_ROLE_KEY=x python3 py.py ../../../tools/fiscal-agent > /tmp/py.txt || exit 1
node js.js > /tmp/js.txt || exit 1
if cmp -s /tmp/py.txt /tmp/js.txt; then echo "OK: $(wc -l < /tmp/py.txt) stampe identiche"; else echo "DIVERSE"; diff /tmp/py.txt /tmp/js.txt | head; exit 1; fi
