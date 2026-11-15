package com.ristoflow.stampa;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Stampa diretta dal tablet sulle termiche di rete (ESC/POS, porta 9100).
 * Stesso comportamento di invia() in tools/fiscal-agent/stampe.py, chiusura "gentile" compresa.
 */
@CapacitorPlugin(name = "RistoflowStampa")
public class RistoflowStampaPlugin extends Plugin {

    @PluginMethod
    public void inviaTcp(final PluginCall call) {
        final String ip = call.getString("ip");
        final String b64 = call.getString("dati");
        if (ip == null || ip.isEmpty() || b64 == null) {
            call.reject("Parametri mancanti: ip e dati");
            return;
        }
        final int porta = call.getInt("porta", 9100);
        final int attesa = call.getInt("timeoutMs", 5000);
        new Thread(() -> {
            String dove = ip + ":" + porta;
            byte[] dati;
            try {
                dati = Base64.decode(b64, Base64.DEFAULT);
            } catch (Exception e) {
                call.reject("Dati non validi");
                return;
            }
            Socket s = new Socket();
            try {
                s.connect(new InetSocketAddress(ip, porta), attesa);
                OutputStream out = s.getOutputStream();
                out.write(dati);
                out.flush();
                try {
                    s.shutdownOutput();
                    s.setSoTimeout(2000);
                    InputStream in = s.getInputStream();
                    byte[] buf = new byte[64];
                    while (in.read(buf) != -1) { /* aspetto che chiuda la stampante */ }
                } catch (Exception ignorata) { }
                JSObject r = new JSObject();
                r.put("ok", true);
                r.put("byte", dati.length);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Stampante non raggiungibile (" + dove + "): " + e.getMessage());
            } finally {
                try { s.close(); } catch (Exception ignorata) { }
            }
        }).start();
    }
}
