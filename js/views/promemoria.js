import { supabase } from "../supabaseClient.js";

/* Le cose che non si possono fare oggi perché il mondo non è ancora pronto:
   un calendario non uscito, una lista che si aggiorna una volta l'anno.
   Non un commento nel codice, che nessuno rilegge: una riga vera che
   compare quando la data è arrivata. */

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = '<div style="max-width:700px;margin:22px auto;padding:0 16px;">Nessuna azienda attiva.</div>';
    return;
  }

  container.innerHTML =
    '<div style="max-width:700px;margin:22px auto;padding:0 14px 50px;overflow-x:hidden;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Cose da rifare</h1>'
    + '<div style="font-size:13.5px;color:#475569;margin-bottom:16px;">Ricerche che oggi non davano niente perché mancava il calendario o il dato giusto. Da qui a poco tornano utili.</div>'
    + '<div id="pr-lista"><div style="font-size:13px;color:#64748b;">Un momento&hellip;</div></div>'
    + '</div>';

  await carica(container, azienda);
}

async function carica(container, azienda) {
  const box = container.querySelector("#pr-lista");
  const { data, error } = await supabase.from("promemoria_sistema")
    .select("*").eq("azienda_id", azienda.id).eq("stato", "aperto")
    .order("data_da");

  if (error) {
    box.innerHTML = avviso("Non sono riuscito a leggere i promemoria. Riprova fra poco.");
    return;
  }

  const righe = data || [];
  if (!righe.length) {
    box.innerHTML = avviso("Niente in sospeso.");
    return;
  }

  const oggi = new Date().toISOString().slice(0, 10);
  let html = "";

  righe.forEach((r) => {
    const pronto = r.data_da <= oggi;
    html += '<div style="background:#fff;border:1px solid ' + (pronto ? "#fde68a" : "#E3E8EC") + ';border-radius:14px;padding:14px;margin-bottom:10px;overflow-wrap:anywhere;">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">'
      + '<div style="flex:1;">'
      + '<div style="font-size:14.5px;font-weight:800;">' + esc(r.titolo) + '</div>'
      + '<div style="font-size:12px;color:' + (pronto ? "#b45309" : "#94a3b8") + ';font-weight:700;margin-top:2px;">'
      + (pronto ? "Pronto da " + formatta(r.data_da) : "Da " + formatta(r.data_da))
      + (r.funzione ? " · " + esc(r.funzione) : "")
      + '</div>'
      + (r.dettaglio ? '<div style="font-size:13px;color:#475569;margin-top:8px;white-space:pre-wrap;">' + esc(r.dettaglio) + '</div>' : "")
      + '</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">'
      + '<button class="app-button small" data-fatto="' + r.id + '" style="background:#15803d;color:#fff;">Fatto</button>'
      + '<button class="app-button small gray" data-scarta="' + r.id + '">Non serve più</button>'
      + '</div></div>';
  });

  box.innerHTML = html;

  box.querySelectorAll("[data-fatto]").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      await supabase.from("promemoria_sistema")
        .update({ stato: "fatto", fatto_il: new Date().toISOString() }).eq("id", b.dataset.fatto);
      await carica(container, azienda);
    };
  });
  box.querySelectorAll("[data-scarta]").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      await supabase.from("promemoria_sistema").update({ stato: "scartato" }).eq("id", b.dataset.scarta);
      await carica(container, azienda);
    };
  });
}

function formatta(d) {
  if (!d) return "";
  const [a, m, g] = d.split("-");
  return g + "/" + m + "/" + a;
}

function avviso(testo) {
  return '<div style="background:#fff;border:1px dashed #CBD5DD;border-radius:12px;padding:14px;font-size:13.5px;color:#5A6873;">' + esc(testo) + '</div>';
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
