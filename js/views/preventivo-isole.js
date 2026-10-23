// js/views/preventivo-isole.js
// Isole del buffet nel preventivo (per ora solo matrimoni).
// Di base il preventivo e' generico: isole con la descrizione. L'operatore, col cliente davanti, tocca
// "Mostra le portate": compaiono i piatti di ogni isola, e dove serve si spuntano (con il minimo richiesto).
// Le scelte si salvano subito in preventivi_isole_scelte.

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function apriIsole({ supabase, azienda, P, onChiudi }) {
  if (!P || !P.id) {
    alert("Salva prima il preventivo, poi apri le isole del buffet.");
    return;
  }
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:5000;background:#F6F8FA;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 0 90px;";
  ov.innerHTML = `<div style="padding:24px;font-family:inherit;">Un attimo…</div>`;
  document.body.appendChild(ov);

  const [ri, rp, rs, rv] = await Promise.all([
    supabase.from("buffet_isole").select("*").eq("azienda_id", azienda.id).eq("tipo_evento", "Matrimonio").order("ordine"),
    supabase.from("buffet_isole_piatti").select("*").eq("azienda_id", azienda.id).order("ordine"),
    supabase.from("preventivi_isole_scelte").select("*").eq("preventivo_id", P.id),
    supabase.from("preventivi").select("mostra_portate").eq("id", P.id).maybeSingle(),
  ]);
  if (ri.error || rp.error || rs.error) {
    ov.innerHTML = `<div style="padding:24px;">Non riesco a leggere le isole. Riprova tra poco. <button id="is-x" class="app-button">Chiudi</button></div>`;
    ov.querySelector("#is-x").onclick = () => ov.remove();
    return;
  }
  const isole = ri.data || [];
  const piatti = rp.data || [];
  let mostra = !!rv.data?.mostra_portate;
  // da qui il preventivo mostra le isole al cliente (i preventivi gia' inviati non cambiano)
  if (!P.isole_attive) {
    await supabase.from("preventivi").update({ isole_attive: true }).eq("id", P.id);
    P.isole_attive = true;
  }
  const scelti = new Set((rs.data || []).map((s) => (s.piatto_id ? "p" + s.piatto_id : "i" + s.isola_id)));
  const dellIsola = (id) => piatti.filter((p) => p.isola_id === id).sort((a, b) => a.ordine - b.ordine);
  const nScelti = (isola) => dellIsola(isola.id).filter((p) => scelti.has("p" + p.id)).length;

  const stile = `<style>
    .is{max-width:760px;margin:0 auto;padding:16px 16px 0;color:#1F2937;font-family:inherit;}
    .is h2{margin:0;font-size:20px;}
    .is .top{display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#F6F8FA;padding:12px 0;z-index:2;}
    .is .mostra{border:0;border-radius:999px;padding:11px 16px;font-weight:700;font-size:14px;background:#E5E7EB;color:#374151;}
    .is .mostra.on{background:#0E5A7A;color:#fff;}
    .is .gruppo{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6B7280;font-weight:700;margin:22px 0 6px;}
    .is .box{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px;margin-bottom:10px;}
    .is .nome{font-size:16px;font-weight:700;}
    .is .desc{font-size:14px;color:#4B5563;margin-top:3px;line-height:1.45;}
    .is .cnt{float:right;font-size:13px;font-weight:700;border-radius:999px;padding:3px 10px;background:#FEF3C7;color:#92400E;}
    .is .cnt.ok{background:#DCFCE7;color:#166534;}
    .is .piatti{margin-top:10px;border-top:1px solid #F1F5F9;}
    .is label.p{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:15px;cursor:pointer;}
    .is label.p input{width:20px;height:20px;margin-top:1px;flex-shrink:0;}
    .is .fisso{padding:7px 0;border-bottom:1px solid #F1F5F9;font-size:14.5px;color:#374151;}
    .is .incl{display:flex;gap:10px;align-items:center;margin-top:10px;font-weight:700;font-size:14.5px;}
    .is .incl input{width:20px;height:20px;}
    .is .manca{margin-top:14px;padding:12px 14px;border-radius:12px;background:#FEF3C7;color:#92400E;font-size:14px;line-height:1.5;}
    .is .manca.ok{background:#DCFCE7;color:#166534;}
  </style>`;

  function disegna() {
    let gruppoVisto = null;
    const manca = [];
    const corpo = isole.map((is) => {
      let testa = "";
      if (is.gruppo && is.gruppo !== gruppoVisto) {
        gruppoVisto = is.gruppo;
        const primaDesc = isole.find((x) => x.gruppo === is.gruppo && x.descrizione)?.descrizione;
        testa = `<div class="gruppo">${esc(is.gruppo)}</div>${primaDesc && is.modo !== "opzionale" ? `<div class="desc" style="margin:-2px 2px 8px;">${esc(primaDesc)}</div>` : ""}`;
      }
      if (!is.gruppo) gruppoVisto = null;
      const lista = dellIsola(is.id);
      const inclusa = scelti.has("i" + is.id);
      const n = nScelti(is);
      const min = is.minimo || 0;
      let contatore = "", dentro = "";
      if (is.modo === "scegli" && mostra) {
        if (min) {
          contatore = `<span class="cnt ${n >= min ? "ok" : ""}">${n} di ${min}</span>`;
          if (n < min) manca.push(`${is.nome} ${min - n}`);
        } else contatore = `<span class="cnt ok">${n} scelti</span>`;
        dentro = `<div class="piatti">${lista.map((p) => `
          <label class="p"><input type="checkbox" data-p="${p.id}" data-i="${is.id}" ${scelti.has("p" + p.id) ? "checked" : ""}><span>${esc(p.nome)}</span></label>`).join("")}</div>`;
      } else if (is.modo === "fissa" && mostra && lista.length) {
        dentro = `<div class="piatti">${lista.map((p) => `<div class="fisso">${esc(p.nome)}</div>`).join("")}</div>`;
      } else if (is.modo === "opzionale") {
        dentro = `<label class="incl"><input type="checkbox" data-incl="${is.id}" ${inclusa ? "checked" : ""}> Includi nel preventivo</label>`;
        if (mostra && inclusa) dentro += `<div class="piatti">${lista.map((p) => `<div class="fisso">${esc(p.nome)}</div>`).join("")}</div>`;
      }
      const desc = is.descrizione && !(is.gruppo && isole.find((x) => x.gruppo === is.gruppo && x.descrizione)?.id === is.id && is.modo !== "opzionale")
        ? `<div class="desc">${esc(is.descrizione)}</div>` : "";
      return `${testa}<div class="box"><div class="nome">${contatore}${esc(is.nome)}</div>${desc}${dentro}</div>`;
    }).join("");

    ov.innerHTML = `${stile}<div class="is">
      <div class="top"><div><h2>Isole del buffet</h2><div class="desc">Matrimonio</div></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="mostra ${mostra ? "on" : ""}" id="is-mostra">${mostra ? "✓ Portate visibili" : "Mostra le portate"}</button>
          <button class="app-button" id="is-chiudi">Chiudi</button>
        </div></div>
      ${corpo}
      ${mostra ? `<div class="manca ${manca.length ? "" : "ok"}">${manca.length ? "Mancano: " + esc(manca.join(" · ")) : "Tutte le isole hanno le portate richieste."}</div>` : `<div class="desc" style="padding:6px 4px;">Il preventivo resta generico finché non tocchi "Mostra le portate".</div>`}
    </div>`;

    ov.querySelector("#is-chiudi").onclick = () => { ov.remove(); if (onChiudi) onChiudi(); };
    ov.querySelector("#is-mostra").onclick = async () => {
      mostra = !mostra;
      await supabase.from("preventivi").update({ mostra_portate: mostra }).eq("id", P.id);
      P.mostra_portate = mostra;
      disegna();
    };
    ov.querySelectorAll("input[data-p]").forEach((el) => el.addEventListener("change", async () => {
      const piatto = Number(el.dataset.p), isola = Number(el.dataset.i), k = "p" + piatto;
      let err = null;
      if (el.checked) {
        scelti.add(k);
        ({ error: err } = await supabase.from("preventivi_isole_scelte").insert({ azienda_id: azienda.id, preventivo_id: P.id, isola_id: isola, piatto_id: piatto }));
      } else {
        scelti.delete(k);
        ({ error: err } = await supabase.from("preventivi_isole_scelte").delete().eq("preventivo_id", P.id).eq("piatto_id", piatto));
      }
      if (err) { alert("Non sono riuscito a salvare la scelta. Riprova."); if (el.checked) scelti.delete(k); else scelti.add(k); }
      disegna();
    }));
    ov.querySelectorAll("input[data-incl]").forEach((el) => el.addEventListener("change", async () => {
      const isola = Number(el.dataset.incl), k = "i" + isola;
      let err = null;
      if (el.checked) {
        scelti.add(k);
        ({ error: err } = await supabase.from("preventivi_isole_scelte").insert({ azienda_id: azienda.id, preventivo_id: P.id, isola_id: isola, piatto_id: null }));
      } else {
        scelti.delete(k);
        ({ error: err } = await supabase.from("preventivi_isole_scelte").delete().eq("preventivo_id", P.id).eq("isola_id", isola).is("piatto_id", null));
      }
      if (err) { alert("Non sono riuscito a salvare. Riprova."); if (el.checked) scelti.delete(k); else scelti.add(k); }
      disegna();
    }));
  }
  disegna();
}
