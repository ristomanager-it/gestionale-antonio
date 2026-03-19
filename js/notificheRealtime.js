// js/notificheRealtime.js

window.notificheStore = {
  list: [],
  nonLette: 0,
  lastIds: new Set()
};

let pollingInterval = null;

// ================================
// 🔊 SUONO
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
  }catch(e){}
}

// ================================
// 📳 VIBRAZIONE
// ================================
function vibrate(){
  if(navigator.vibrate){
    navigator.vibrate([120, 60, 120])
  }
}

// ================================
// 🔥 LOAD NOTIFICHE
// ================================
async function loadNotifiche(){

  const supabase = window.supabaseClient;
  const user = window.state?.user;

  if(!user) return;

  const { data } = await supabase
    .from("notifiche")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const prevIds = new Set(window.notificheStore.lastIds);
  const newIds = new Set((data || []).map(n => n.id));

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

  if(hasNew && prevIds.size > 0){
    playSound();
    vibrate();
  }
}

// ================================
// 🔢 BADGE
// ================================
function updateBellUI(){

  const badge = document.getElementById("notif-badge");
  if(!badge) return;

  const count = window.notificheStore.nonLette;

  badge.innerText = count > 9 ? "9+" : count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// ================================
// 🔽 DROPDOWN
// ================================
function renderDropdown(){

  let box = document.getElementById("notif-dropdown");

  if(box){
    box.remove();
    return;
  }

  box = document.createElement("div");
  box.id = "notif-dropdown";

  box.style.position = "fixed";
  box.style.top = "60px";
  box.style.right = "10px";
  box.style.width = "320px";
  box.style.maxHeight = "400px";
  box.style.overflow = "auto";
  box.style.background = "#fff";
  box.style.border = "1px solid #eee";
  box.style.borderRadius = "12px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.1)";
  box.style.zIndex = "9999";

  const list = window.notificheStore.list.slice(0,10);

  box.innerHTML = `
    <div style="padding:10px; font-weight:700; border-bottom:1px solid #eee;">
      Notifiche
    </div>

    ${
      list.length
      ? list.map(n => `
        <div style="padding:10px; border-bottom:1px solid #f1f1f1; cursor:pointer;">
          <div style="font-weight:600;">${n.titolo}</div>
          <div style="font-size:12px; color:#666;">${n.messaggio || ""}</div>
        </div>
      `).join("")
      : `<div style="padding:10px;">Nessuna notifica</div>`
    }
  `;

  document.body.appendChild(box);
}

// ================================
// 🚀 INIT
// ================================
window.initNotificheRealtime = function(){

  if(pollingInterval){
    clearInterval(pollingInterval);
  }

  loadNotifiche();

  pollingInterval = setInterval(loadNotifiche, 10000);
};

// ================================
// CLICK BELL
// ================================
window.toggleNotificheDropdown = function(){
  renderDropdown();
};
