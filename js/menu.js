export function initMenu(){

const menu=document.getElementById("global-menu")
const toggle=document.getElementById("menu-toggle")

if(!menu || !toggle) return

let overlay=document.querySelector(".menu-overlay")

if(!overlay){
overlay=document.createElement("div")
overlay.className="menu-overlay"
document.body.appendChild(overlay)
}

const sections=[

{
nome:"OPERATIVO",
items:[
["Produzione","produzione"],
["Magazzino","magazzino"],
["Ricettario","ricettario"],
["Preparazioni","preparazioni"]
]
},

{
nome:"AMMINISTRAZIONE",
items:[
["Acquisti","acquisti"],
["Dipendenti","dipendenti"],
["Timbrature","timbrature"]
]
},

{
nome:"GESTIONE",
items:[
["Venduto","venduto"],
["Margini","margini"],
["Preventivi","preventivi"]
]
},

{
nome:"AI",
items:[
["Tony","ai"]
]
}

]

function renderMenu(){

menu.innerHTML=sections.map(sec=>`

<div class="menu-section">

<div class="menu-title">${sec.nome}</div>

<div class="menu-items">

${sec.items.map(i=>`
<div class="menu-item" data-route="${i[1]}">
${i[0]}
</div>
`).join("")}

</div>

</div>

`).join("")+

`<div class="menu-logout">Logout</div>`

menu.querySelectorAll(".menu-title").forEach(title=>{

title.onclick=()=>{
title.nextElementSibling.classList.toggle("open")
}

})

menu.querySelectorAll(".menu-item").forEach(item=>{

item.onclick=()=>{
window.location.hash="#/"+item.dataset.route
closeMenu()
}

})

document.querySelector(".menu-logout").onclick=()=>{
window.router.logout()
}

}

function openMenu(){
renderMenu()
menu.classList.add("open")
overlay.classList.add("open")
}

function closeMenu(){
menu.classList.remove("open")
overlay.classList.remove("open")
}

toggle.onclick=()=>{
menu.classList.contains("open") ? closeMenu() : openMenu()
}

overlay.onclick=closeMenu

}
