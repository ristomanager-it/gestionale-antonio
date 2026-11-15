import sys, json, base64, os
sys.path.insert(0, sys.argv[1])
import stampe
stampe.data_ora_locale = lambda: "15/11/2026 12:45"
for c in json.load(open("casi.json")):
    print(base64.b64encode(stampe.build_comanda(c, 42)).decode())
print(base64.b64encode(stampe.build_prova({"testo":"Ciao è €"}, 42)).decode())
