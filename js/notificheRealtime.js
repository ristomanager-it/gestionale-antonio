// js/notificheRealtime.js

window.notificheStore = {
  list: [],
  nonLette: 0,
  lastIds: new Set()
};

let pollingInterval = null;

// ================================
// SUONO
// ================================
function playSound(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)

    gain.gain.setValueAtTime(0.1, ctx.currentTime)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  }catch(e){
    console.warn("Audio error", e)
  }
}

// ================================
// VIBRAZIONE
// ================================
function vibrate(){
  if(navigator.vibrate){
    navigator.vibrate([120, 60, 120]);
  }
}

// ================================
// LOAD NOTIFICHE
// ================================
async function loadNotifiche(){

  const supabase = window.supabaseClient;
  const user = window.state?.user;

  if(!user) return;

  const { data, error } = await supabase
    .from("notifiche")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if(error){
    console.error("Errore notifiche:", error);
    return;
  }

  const prevIds = new Set(window.notificheStore.lastIds);
  const newIds = new Set((data || []).map(n => n.id));

  // 🔥 check nuove notifiche
  let hasNew = false;

  for(const id of newIds){
    if(!prevIds.has(id)){
      hasNew = true;
      break;
    }
  }

  window.notificheStore.list = data || [];
  window.notificheStore.nonLette =
    (data || []).filter(n => !n.letto).length;

  window.notificheStore.lastIds = newIds;

  updateBellUI();

  // 🔔 trigger SOLO se nuove notifiche
  if(hasNew && prevIds.size > 0){
    playSound();
    vibrate();
  }
}

// ================================
// UI BELL
// ================================
function updateBellUI(){
  const badge = document.getElementById("notif-badge");

  if(!badge) return;

  const count = window.notificheStore.nonLette;

  badge.innerText = count > 9 ? "9+" : count;

  badge.style.display = count > 0 ? "flex" : "none";
}

// ================================
// DROPDOWN
// ================================
function renderDropdown(){

  let box = document.getElementById("notif-dropdown");

  if(box){
    box.remove();
    return;
  }

  box = document.createElement("div");
  box.id = "notif-dropdown";
  box.className = "notif-dropdown";

  const list = window.notificheStore.list.slice(0,10);

  box.innerHTML = `
    <div class="notif-header">Notifiche</div>
    ${
      list.length
      ? list.map(n => `
        <div class="notif-item ${n.letto ? "" : "unread"}">
          <div class="notif-title">${n.titolo}</div>
          <div class="notif-msg">${n.messaggio || ""}</div>
        </div>
      `).join("")
      : `<div class="notif-empty">Nessuna notifica</div>`
    }
  `;

  document.body.appendChild(box);
}

// ================================
// INIT
// ================================
window.initNotificheRealtime = function(){

  if(pollingInterval){
    clearInterval(pollingInterval);
  }

  loadNotifiche();

  pollingInterval = setInterval(loadNotifiche, 10000);
};

// click campanella
window.toggleNotificheDropdown = function(){
  renderDropdown();
};
