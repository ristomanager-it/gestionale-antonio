// js/views/giorni-lavorazione.js
// 📅 Giorni di lavorazione: la settimana tipo del Centro cottura. Ogni regola dice in che giorno si fa
// un tipo di lavorazione (riconosciuto dalle parole nel nome del piatto) e, per dolci e torte, quando
// si compongono i singoli elementi. Le fasi scritte su una ricetta sono le eccezioni e vincono sempre.
// Si salva da solo. In alto si prova un nome di piatto per vedere quale regola scatta.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GG = ["", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  app.innerHTML = stile() + `<div class="gl"><div class="gl-vuoto">Un attimo…</div></div>`;
  const box = app.querySelector(".gl");
  let regole = [];

  async function carica() {
    const { data } = await sb().from("regole_giorni_lavorazione")
      .select("id, nome, giorno_settimana, giorno_dal, parole, ordine, attiva, note, fase_nome, composizione_nome, composizione_giorni, composizione_min_giorni")
      .eq("azienda_id", az).order("ordine").order("id");
    regole = data || [];
  }
  const sel = (v, vuoto) => `${vuoto ? `<option value="">${vuoto}</option>` : ""}${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${Number(v) === n ? "selected" : ""}>${GG[n]}</option>`).join("")}`;

  function disegna() {
    box.innerHTML = `
      <h2 class="gl-tit">📅 Giorni di lavorazione</h2>
      <div class="gl-sub">La tua settimana tipo: ogni piatto va nel giorno della sua lavorazione. Le fasi scritte su una ricetta sono le eccezioni e vincono sempre. Si salva da solo.</div>
      <div class="gl-prova"><input class="gl-in" id="gl-prova" placeholder="Prova: scrivi un piatto (es. spezzatino di vitello)"><div id="gl-esito"></div></div>
      ${regole.map((r, i) => regola(r, i)).join("")}
      <button class="gl-add">＋ Nuova regola</button>
      <div class="gl-stato">Tutto salvato</div>`;
    collega();
  }

  function regola(r, i) {
    const comp = r.composizione_nome != null;
    return `<div class="gl-r ${r.attiva ? "" : "off"}" data-i="${i}">
      <div class="gl-row"><input class="gl-in gl-nome" data-k="nome" value="${esc(r.nome)}"><label class="gl-on"><input type="checkbox" data-k="attiva" ${r.attiva ? "checked" : ""}> attiva</label><button class="gl-x" data-via="1">✕</button></div>
      <div class="gl-row">
        <span class="gl-l">Si fa il</span><select class="gl-in" data-k="giorno_settimana">${sel(r.giorno_settimana)}</select>
        <span class="gl-l">dal</span><select class="gl-in" data-k="giorno_dal">${sel(r.giorno_dal, "—")}</select>
      </div>
      <input class="gl-in" data-k="fase_nome" value="${esc(r.fase_nome || "")}" placeholder="Cosa si fa quel giorno (es. basi, taglio, cottura)">
      <textarea class="gl-in" data-k="parole" rows="2" placeholder="Parole nel nome del piatto, separate da virgola">${esc((r.parole || []).join(", "))}</textarea>
      <label class="gl-comp"><input type="checkbox" data-comp="1" ${comp ? "checked" : ""}> Ha una seconda fase (es. composizione dei singoli elementi)</label>
      ${comp ? `<div class="gl-cbox">
        <input class="gl-in" data-k="composizione_nome" value="${esc(r.composizione_nome || "")}" placeholder="Nome della seconda fase">
        <div class="gl-gg">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<label><input type="checkbox" data-cg="${n}" ${(r.composizione_giorni || []).includes(n) ? "checked" : ""}>${GG[n].slice(0, 3)}</label>`).join("")}</div>
        <div class="gl-row"><span class="gl-l">almeno</span><input class="gl-in gl-n" type="number" min="0" data-k="composizione_min_giorni" value="${esc(r.composizione_min_giorni ?? 1)}"><span class="gl-l">giorni prima dell'evento</span></div>
      </div>` : ""}
      <div class="gl-row"><span class="gl-l">Priorità</span><input class="gl-in gl-n" type="number" data-k="ordine" value="${esc(r.ordine)}"><span class="gl-l gl-hint">più basso = vince se due regole combaciano</span></div>
    </div>`;
  }

  const timers = {};
  function stato(t) { const s = box.querySelector(".gl-stato"); if (s) s.textContent = t; }
  function salva(r, campi) {
    clearTimeout(timers[r.id]); stato("Salvo…");
    timers[r.id] = setTimeout(async () => {
      const { error } = await sb().from("regole_giorni_lavorazione").update(campi).eq("id", r.id);
      stato(error ? "Non salvato: " + error.message : "✓ Salvato");
    }, 500);
  }

  function collega() {
    const prova = box.querySelector("#gl-prova"); let t;
    prova.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const q = prova.value.trim(); const out = box.querySelector("#gl-esito");
        if (q.length < 3) { out.innerHTML = ""; return; }
        const { data } = await sb().rpc("regola_giorno_ricetta", { p_azienda: az, p_nome: q });
        out.innerHTML = data && data.id ? `→ <b>${esc(data.nome)}</b>: il ${GG[data.giorno_settimana]}${data.composizione_nome ? ", poi " + esc(data.composizione_nome) : ""}`
          : `→ nessuna regola: resta il giorno stimato da Ristoflow, oppure scrivi le fasi sulla ricetta`;
      }, 300);
    });
    box.querySelector(".gl-add").addEventListener("click", async () => {
      const { data, error } = await sb().from("regole_giorni_lavorazione").insert({ azienda_id: az, nome: "Nuova regola", giorno_settimana: 3, parole: [], ordine: 100 })
        .select("id, nome, giorno_settimana, giorno_dal, parole, ordine, attiva, note, fase_nome, composizione_nome, composizione_giorni, composizione_min_giorni").single();
      if (error) { alert(error.message); return; }
      regole.push(data); disegna(); box.querySelector(`.gl-r[data-i="${regole.length - 1}"] .gl-nome`)?.select();
    });
    box.querySelectorAll(".gl-r").forEach((el) => {
      const r = regole[Number(el.dataset.i)];
      el.querySelectorAll("[data-k]").forEach((c) => c.addEventListener(c.tagName === "SELECT" || c.type === "checkbox" ? "change" : "input", () => {
        const k = c.dataset.k; let v;
        if (k === "attiva") { v = c.checked; el.classList.toggle("off", !v); }
        else if (k === "parole") v = c.value.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
        else if (["giorno_settimana", "giorno_dal", "ordine", "composizione_min_giorni"].includes(k)) v = c.value === "" ? null : Number(c.value);
        else v = c.value.trim() || null;
        if (k === "nome" && !v) return;
        r[k] = v; salva(r, { [k]: v });
      }));
      el.querySelector("[data-comp]").addEventListener("change", (e) => {
        if (e.target.checked) { r.composizione_nome = "composizione dei singoli elementi"; r.composizione_giorni = [5, 6]; r.composizione_min_giorni = 1; }
        else { r.composizione_nome = null; r.composizione_giorni = null; r.composizione_min_giorni = null; }
        salva(r, { composizione_nome: r.composizione_nome, composizione_giorni: r.composizione_giorni, composizione_min_giorni: r.composizione_min_giorni });
        disegna();
      });
      el.querySelectorAll("[data-cg]").forEach((c) => c.addEventListener("change", () => {
        r.composizione_giorni = [...el.querySelectorAll("[data-cg]:checked")].map((x) => Number(x.dataset.cg));
        salva(r, { composizione_giorni: r.composizione_giorni.length ? r.composizione_giorni : null });
      }));
      el.querySelector("[data-via]").addEventListener("click", async () => {
        if (!confirm("Elimino la regola «" + r.nome + "»?")) return;
        await sb().from("regole_giorni_lavorazione").delete().eq("id", r.id);
        regole.splice(Number(el.dataset.i), 1); disegna(); stato("✓ Salvato");
      });
    });
  }

  await carica(); disegna();
}

function stile() {
  return `<style>
  .gl{max-width:760px;margin:0 auto;padding:16px 14px 60px;}
  .gl-tit{margin:0;font-size:22px;font-weight:800;}
  .gl-sub{font-size:13.5px;color:#64748b;margin:3px 0 12px;}
  .gl-prova{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:10px;margin-bottom:12px;}
  #gl-esito{font-size:13.5px;margin-top:6px;color:#0E5A7A;}
  .gl-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px;font-size:14px;font-family:inherit;background:#fff;min-width:0;}
  .gl-r{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin-bottom:10px;display:grid;gap:6px;}
  .gl-r.off{opacity:.5;}
  .gl-row{display:flex;gap:6px;align-items:center;}
  .gl-nome{font-weight:800;font-size:15px;}
  .gl-on{font-size:12px;color:#64748b;white-space:nowrap;display:flex;gap:3px;align-items:center;}
  .gl-x{flex:none;border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;cursor:pointer;color:#64748b;}
  .gl-l{font-size:12.5px;color:#64748b;white-space:nowrap;} .gl-hint{white-space:normal;}
  .gl-n{width:70px;flex:none;}
  .gl-comp{font-size:13px;color:#334155;display:flex;gap:6px;align-items:center;}
  .gl-cbox{background:#f8fafc;border-radius:10px;padding:8px;display:grid;gap:6px;}
  .gl-gg{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;} .gl-gg label{display:flex;gap:3px;align-items:center;}
  .gl-add{width:100%;border:1.5px dashed #0E5A7A;background:#f0f9ff;color:#0E5A7A;border-radius:12px;padding:12px;font-weight:800;cursor:pointer;}
  .gl-stato{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));background:#0f172a;color:#fff;border-radius:20px;padding:6px 12px;font-size:12px;opacity:.85;}
  .gl-vuoto{color:#64748b;text-align:center;padding:16px;}
  </style>`;
}
