import Foundation
import Network
import Capacitor

/// Stampa diretta dal tablet sulle termiche di rete (ESC/POS, porta 9100).
/// Fa quello che fa invia() in tools/fiscal-agent/stampe.py: connessione, invio, chiusura "gentile"
/// (si chiude solo la scrittura e si aspetta la stampante al massimo 2 secondi), perché alcune
/// Epson (TM-m30III) buttano i dati se la connessione si chiude di colpo.
@objc(RistoflowStampaPlugin)
public class RistoflowStampaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RistoflowStampaPlugin"
    public let jsName = "RistoflowStampa"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "inviaTcp", returnType: CAPPluginReturnPromise)
    ]

    @objc func inviaTcp(_ call: CAPPluginCall) {
        guard let ip = call.getString("ip"), !ip.isEmpty,
              let b64 = call.getString("dati"),
              let dati = Data(base64Encoded: b64) else {
            call.reject("Parametri mancanti: ip e dati")
            return
        }
        let porta = call.getInt("porta") ?? 9100
        let attesa = Double(call.getInt("timeoutMs") ?? 5000) / 1000.0
        guard let p = NWEndpoint.Port(rawValue: UInt16(clamping: porta)) else {
            call.reject("Porta non valida")
            return
        }

        let coda = DispatchQueue(label: "ristoflow.stampa." + ip)
        let conn = NWConnection(host: NWEndpoint.Host(ip), port: p, using: .tcp)
        let dove = ip + ":" + String(porta)
        var finito = false
        var collegato = false

        // Tutto gira sulla stessa coda: niente doppie risposte.
        func chiudi(_ errore: String?) {
            if finito { return }
            finito = true
            conn.cancel()
            if let e = errore {
                call.reject(e)
            } else {
                call.resolve(["ok": true, "byte": dati.count])
            }
        }

        func svuota() {
            conn.receive(minimumIncompleteLength: 1, maximumLength: 64) { _, _, completo, errore in
                if completo || errore != nil { chiudi(nil) } else { svuota() }
            }
        }

        conn.stateUpdateHandler = { stato in
            switch stato {
            case .ready:
                if collegato { return }
                collegato = true
                // .finalMessage = dopo i dati chiude la scrittura (come shutdown(SHUT_WR)).
                conn.send(content: dati, contentContext: .finalMessage, isComplete: true, completion: .contentProcessed { errore in
                    if let e = errore {
                        chiudi("Invio non riuscito a " + dove + ": " + e.localizedDescription)
                        return
                    }
                    svuota()
                    coda.asyncAfter(deadline: .now() + 2) { chiudi(nil) }
                })
            case .waiting(let e):
                // Rete locale negata o stampante spenta: iOS resterebbe in attesa per sempre.
                chiudi("Stampante non raggiungibile (" + dove + "): " + e.localizedDescription
                       + ". Controlla che la stampante sia accesa e che in Impostazioni › Ristoflow Sala sia attiva \"Rete locale\".")
            case .failed(let e):
                chiudi("Stampante non raggiungibile (" + dove + "): " + e.localizedDescription)
            default:
                break
            }
        }
        conn.start(queue: coda)
        coda.asyncAfter(deadline: .now() + attesa) {
            if !collegato { chiudi("Stampante non risponde (" + dove + ") entro " + String(Int(attesa)) + " secondi") }
        }
    }
}
