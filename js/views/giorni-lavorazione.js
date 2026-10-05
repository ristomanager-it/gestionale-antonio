// js/views/giorni-lavorazione.js
// 📅 Giorni di lavorazione: la settimana tipo del Centro cottura. Ogni tipo di lavorazione (riconosciuto
// dalle parole nel nome del piatto) ha le sue fasi, ognuna nel suo giorno (o "ven o sab almeno 1 giorno
// prima", o al servizio), con il segno notturna per le cotture lunghe. Le fasi scritte su una ricetta sono le eccezioni e vincono sempre.
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
    const [{ data }, { data: fasi }] = await Promise.all([
      sb().from("regole_giorni_lavorazione").select("id, nome, giorno_settimana, parole, ordine, attiva, note").eq("azienda_id", az).order("ordine").order("id"),
      sb().from("regole_fasi").select("id, regola_id, ordine, nome, giorno_settimana, giorni_ammessi, min_giorni_prima, momento, notturna").eq("azienda_id", az).order("ordine").order("id"),
    ]);
    regole = (data || []).map((r) => ({ ...r, fasi: (fasi || []).filter((f) => f.regola_id === r.id) }));
  }
  // quando: "s" al servizio, "d1".."d7" il giorno, "a" = uno dei giorni ammessi (es. ven o sab) almeno N giorni prima
  const quandoDi = (f) => f.momento === "servizio" ? "s" : f.giorni_ammessi?.length ? "a" : f.giorno_settimana ? "d" + f.giorno_settimana : "";

  function disegna() {
    box.innerHTML = `
      <h2 class="gl-tit">📅 Giorni di lavorazione</h2>
      <div class="gl-sub">La tua settimana tipo: ogni tipo di lavorazione ha le sue fasi, ognuna nel suo giorno. Le fasi scritte su una ricetta sono le eccezioni e vincono sempre. Si salva da solo.</div>
      <div class="gl-prova"><input class="gl-in" id="gl-prova" placeholder="Prova: scrivi un piatto (es. spezzatino di vitello)"><div id="gl-esito"></div></div>
      ${regole.map((r, i) => regola(r, i)).join("")}
      <button class="gl-add">＋ Nuovo tipo di lavorazione</button>
      <div class="gl-stato">Tutto salvato</div>`;
    collega();
  }

  function regola(r, i) {
    return `<div class="gl-r ${r.attiva ? "" : "off"}" data-i="${i}">
      <div class="gl-row"><input class="gl-in gl-nome" data-k="nome" value="${esc(r.nome)}"><label class="gl-on"><input type="checkbox" data-k="attiva" ${r.attiva ? "checked" : ""}> attiva</label><button class="gl-x" data-via="1">✕</button></div>
      <div class="gl-fasi">${r.fasi.map((f, j) => fase(f, j)).join("") || `<div class="gl-vuoto">Nessuna fase.</div>`}
        <button class="gl-piu" data-nuova="1">＋ Fase</button></div>
      <textarea class="gl-in" data-k="parole" rows="2" placeholder="Parole nel nome del piatto, separate da virgola">${esc((r.parole || []).join(", "))}</textarea>
      ${r.note ? `<div class="gl-nota">${esc(r.note)}</div>` : ""}
      <div class="gl-row"><span class="gl-l">Priorità</span><input class="gl-in gl-n" type="number" data-k="ordine" value="${esc(r.ordine)}"><span class="gl-l gl-hint">più basso = vince se due regole combaciano</span></div>
    </div>`;
  }

  function fase(f, j) {
    const q = quandoDi(f);
    return `<div class="gl-f ${f.momento === "servizio" ? "srv" : ""}" data-j="${j}">
      <div class="gl-row"><input class="gl-in" data-f="nome" value="${esc(f.nome)}" placeholder="Cosa si fa"><button class="gl-x" data-viaf="1">✕</button></div>
      <div class="gl-row">
        <select class="gl-in" data-f="quando">
          <option value="" ${q === "" ? "selected" : ""}>Quando…</option>
          ${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="d${n}" ${q === "d" + n ? "selected" : ""}>Il ${GG[n]}</option>`).join("")}
          <option value="a" ${q === "a" ? "selected" : ""}>Uno di questi giorni…</option>
          <option value="s" ${q === "s" ? "selected" : ""}>🍽 Al servizio</option>
        </select>
        <label class="gl-on"><input type="checkbox" data-f="notturna" ${f.notturna ? "checked" : ""}> 🌙 notturna</label>
      </div>
      ${q === "a" ? `<div class="gl-gg">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<label><input type="checkbox" data-ga="${n}" ${(f.giorni_ammessi || []).includes(n) ? "checked" : ""}>${GG[n].slice(0, 3)}</label>`).join("")}
        <span class="gl-l">almeno</span><input class="gl-in gl-n" type="number" min="0" data-f="min_giorni_prima" value="${esc(f.min_giorni_prima ?? 1)}"><span class="gl-l">gg prima</span></div>` : ""}
    </div>`;
  }

  const timers = {};
  function stato(t) { const s = box.querySelector(".gl-stato"); if (s) s.textContent = t; }
  function salva(tab, id, campi) {
    clearTimeout(timers[tab + id]); stato("Salvo…");
    timers[tab + id] = setTimeout(async () => {
      const { error } = await sb().from(tab).update(campi).eq("id", id);
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
        const r = data && data.id ? regole.find((x) => x.id === data.id) : null;
        out.innerHTML = r ? `→ <b>${esc(r.nome)}</b>: ${r.fasi.map((f) => esc(f.nome) + " (" + (f.momento === "servizio" ? "al servizio" : f.giorni_ammessi?.length ? f.giorni_ammessi.map((n) => GG[n].slice(0, 3)).join("/") : GG[f.giorno_settimana] || "?") + ")").join(" → ")}`
          : `→ nessuna regola: resta il giorno stimato da Ristoflow, oppure scrivi le fasi sulla ricetta`;
      }, 300);
    });
    box.querySelector(".gl-add").addEventListener("click", async () => {
      const { error } = await sb().from("regole_giorni_lavorazione").insert({ azienda_id: az, nome: "Nuovo tipo di lavorazione", giorno_settimana: 3, parole: [], ordine: 100 });
      if (error) { alert(error.message); return; }
      await carica(); disegna(); box.querySelector(`.gl-r[data-i="${regole.length - 1}"] .gl-nome`)?.select();
    });
    box.querySelectorAll(".gl-r").forEach((el) => {
      const r = regole[Number(el.dataset.i)];
      el.querySelectorAll(":scope > .gl-row [data-k], :scope > [data-k]").forEach((c) => c.addEventListener(c.type === "checkbox" ? "change" : "input", () => {
        const k = c.dataset.k; let v;
        if (k === "attiva") { v = c.checked; el.classList.toggle("off", !v); }
        else if (k === "parole") v = c.value.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
        else if (k === "ordine") v = c.value === "" ? 100 : Number(c.value);
        else v = c.value.trim() || null;
        if (k === "nome" && !v) return;
        r[k] = v; salva("regole_giorni_lavorazione", r.id, { [k]: v });
      }));
      el.querySelector("[data-via]").addEventListener("click", async () => {
        if (!confirm("Elimino «" + r.nome + "» e le sue fasi?")) return;
        await sb().from("regole_giorni_lavorazione").delete().eq("id", r.id);
        await carica(); disegna(); stato("✓ Salvato");
      });
      el.querySelector("[data-nuova]").addEventListener("click", async () => {
        const { error } = await sb().from("regole_fasi").insert({ azienda_id: az, regola_id: r.id, ordine: r.fasi.length + 1, nome: "", giorno_settimana: 3 });
        if (error) { alert(error.message); return; }
        await carica(); disegna();
        const fs = box.querySelectorAll(`.gl-r[data-i="${el.dataset.i}"] .gl-f [data-f="nome"]`); fs[fs.length - 1]?.focus();
      });
      el.querySelectorAll(".gl-f").forEach((fe) => {
        const f = r.fasi[Number(fe.dataset.j)];
        fe.querySelectorAll("[data-f]").forEach((c) => c.addEventListener(c.tagName === "SELECT" || c.type === "checkbox" ? "change" : "input", () => {
          const k = c.dataset.f;
          if (k === "quando") {
            const v = c.value; const campi = { momento: v === "s" ? "servizio" : "preparazione",
              giorno_settimana: v.startsWith("d") ? Number(v.slice(1)) : null,
              giorni_ammessi: v === "a" ? (f.giorni_ammessi?.length ? f.giorni_ammessi : [5, 6]) : null,
              min_giorni_prima: v === "a" ? (f.min_giorni_prima ?? 1) : null };
            Object.assign(f, campi); salva("regole_fasi", f.id, campi); disegna(); return;
          }
          const v = k === "notturna" ? c.checked : k === "min_giorni_prima" ? (c.value === "" ? null : Number(c.value)) : c.value.trim();
          f[k] = v; salva("regole_fasi", f.id, { [k]: v });
        }));
        fe.querySelectorAll("[data-ga]").forEach((c) => c.addEventListener("change", () => {
          f.giorni_ammessi = [...fe.querySelectorAll("[data-ga]:checked")].map((x) => Number(x.dataset.ga));
          salva("regole_fasi", f.id, { giorni_ammessi: f.giorni_ammessi.length ? f.giorni_ammessi : null });
        }));
        fe.querySelector("[data-viaf]").addEventListener("click", async () => {
          await sb().from("regole_fasi").delete().eq("id", f.id);
          await carica(); disegna(); stato("✓ Salvato");
        });
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
  .gl-vuoto{color:#64748b;text-align:center;padding:8px;font-size:13px;}
  .gl-fasi{display:grid;gap:5px;}
  .gl-f{background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0E5A7A;border-radius:10px;padding:6px;display:grid;gap:5px;}
  .gl-f.srv{border-left-color:#c2410c;background:#fff7ed;}
  .gl-piu{border:0;background:#e0f2fe;color:#0E5A7A;border-radius:9px;padding:7px 10px;font-weight:700;cursor:pointer;font-size:13px;justify-self:start;}
  .gl-nota{font-size:12px;color:#475569;background:#f1f5f9;border-radius:8px;padding:6px 8px;}
  </style>`;
}
