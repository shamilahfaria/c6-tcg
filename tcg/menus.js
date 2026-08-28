// Title screen, deck type picker, binder. Owned by the menus work. Entry points: title() typePick() binder(); start() lives in engine.js.
// Globals added here: picked (chosen types, read by start()), BINDER (binder filter state).
const PICKABLE = Object.keys(TYPES).filter(t => t !== "normal"); // ⭐ Staff is colorless filler, never an energy type
const byType = t => CARDS.filter(c => c.type === t);
const facePic = c => c.photo ? `<img src="${c.photo}" alt="" title="${c.real}" onerror="this.remove()">` : "";

function title() {
  const fan = shuffle(CARDS).slice(0, 4).map(c => `<div>${cardHTML(c)}</div>`).join("");
  app.innerHTML = `<div class="menu home">
    <div class="fan">${fan}</div>
    <h1>Gauntlet TCG</h1>
    <p class="sub">Cohort 6 · Pokémon TCG Pocket rules</p>
    <div class="btns"><button class="pbtn" onclick="typePick()">⚔️ Battle</button><button class="pbtn blue" onclick="binder()">📒 Binder</button></div>
    <p class="rules">20-card decks · Energy Zone · 3 points to win</p>
    <img class="logo" src="assets/logo_1.png" alt="Gauntlet">
  </div>`;
}

/* ---------- deck picker ---------- */
let picked = [];

function typePick() { picked = []; renderTypePick(); }

function renderTypePick() {
  const boxes = PICKABLE.map(t => `<button class="box ${t} ${picked.includes(t) ? "on" : ""}" aria-pressed="${picked.includes(t)}" onclick="togglePick('${t}')">
      <span class="ic">${icon(t)}</span><b>${TYPES[t].label}</b><small>${byType(t).length} people</small>
      <span class="faces">${byType(t).map(facePic).join("")}</span></button>`).join("");
  const deck = picked.length ? buildDeck(picked, CARDS, TRAINERS) : []; // one random sample; start() builds its own
  const people = deck.filter(c => c.sig), trainers = deck.filter(c => !c.sig);
  app.innerHTML = `<div class="menu deckpick">
    <div class="mbar"><button class="mback" onclick="title()">‹ Home</button><h2>Choose your energy</h2><span class="hint">${picked.map(typeOf).join(" + ") || "Pick 1 or 2 types"}</span></div>
    <div class="boxes">${boxes}</div>
    <p class="hint">Your Energy Zone only makes these types. Every deck is 12 people + 8 trainers — your types first, ⭐ Staff cards fill any gaps.</p>
    <div class="preview">${picked.length ? `<div class="pv-hd">Sample deck <small>— ${people.length} people + ${trainers.length} trainers, reshuffled at battle start</small></div>
      <div class="pv-people">${people.map(c => cardHTML(c)).join("")}</div>
      <div class="pv-trainers">${trainers.map(t => `<span class="${t.kind}">${t.name}</span>`).join("")}</div>` : `<div class="pv-empty">Pick a type to preview a deck</div>`}</div>
    <button class="pbtn go" onclick="start()" ${picked.length ? "" : "disabled"}>Shuffle up & battle</button>
  </div>`;
}

function togglePick(t) {
  picked = picked.includes(t) ? picked.filter(x => x !== t) : picked.concat(t).slice(-2);
  renderTypePick();
}

/* ---------- binder ---------- */
const BINDER = { f: "all", q: "", sort: "name" };
const CHIPS = [["all", "All"], ...Object.keys(TYPES).map(t => [t, typeOf(t)]), ["trainers", "🎒 Trainers"]];
const CMP = { name: (a, b) => a.name.localeCompare(b.name), hp: (a, b) => (b.hp || 0) - (a.hp || 0), type: (a, b) => (a.type || "").localeCompare(b.type || "") };

function binder() {
  app.innerHTML = `<div class="menu binder">
    <div class="mbar"><button class="mback" onclick="title()">‹ Home</button><h2>Binder</h2><span id="bcount" class="hint"></span></div>
    <div class="tools">
      <div class="chips">${CHIPS.map(([k, l]) => `<button class="chip" data-k="${k}" onclick="BINDER.f='${k}';renderBinder()">${l}</button>`).join("")}</div>
      <input class="search" type="search" placeholder="Search name or real name" value="${BINDER.q}" oninput="BINDER.q=this.value;renderBinder()">
      <select class="sort" onchange="BINDER.sort=this.value;renderBinder()">${Object.keys(CMP).map(s => `<option value="${s}" ${BINDER.sort === s ? "selected" : ""}>Sort: ${s}</option>`).join("")}</select>
    </div>
    <div id="bgrid" class="grid"></div>
  </div>`;
  renderBinder();
}

function renderBinder() { // re-renders only the grid so the search box keeps focus
  const q = BINDER.q.trim().toLowerCase(), f = BINDER.f, hit = s => (s || "").toLowerCase().includes(q);
  const list = (f === "trainers" ? TRAINERS.filter(t => !q || hit(t.name) || hit(t.text))
    : CARDS.filter(c => (f === "all" || c.type === f) && (!q || hit(c.name) || hit(c.real))))
    .sort((a, b) => CMP[BINDER.sort](a, b) || CMP.name(a, b));
  document.querySelectorAll(".binder .chip").forEach(el => el.classList.toggle("on", el.dataset.k === f));
  document.getElementById("bcount").textContent = `${list.length} ${f === "trainers" ? "trainers" : "cards"}`;
  document.getElementById("bgrid").innerHTML = list.length
    ? list.map(c => `<button class="cell" onclick="binderOpen('${c.id}')">${c.sig ? cardHTML(c, { full: true }) : trainerHTML(c)}</button>`).join("")
    : `<p class="hint">No matches.</p>`;
}

function binderOpen(id) {
  const tr = BINDER.f === "trainers", c = (tr ? TRAINERS : CARDS).find(x => x.id === id); if (!c) return;
  const mv = m => `<div class="mv"><span class="mcost">${pips(m.cost, c.type)}</span><b>${m.name}</b><em>${m.dmg}</em>
    ${[m.flip ? "🪙 coin flip: tails does nothing" : "", m.text || ""].filter(Boolean).map(s => `<small>${s}</small>`).join("")}</div>`;
  const info = tr ? `<h3>${c.name}</h3><p class="realname">${c.staff ? "Gauntlet staff · " : ""}${c.kind}</p><p>${c.text}</p>`
    : `<h3>${c.name}${c.ex ? ` <em class="ex">ex</em>` : ""}</h3><p class="realname">${c.real}</p>
      <dl><dt>Type</dt><dd>${typeOf(c.type)}</dd><dt>HP</dt><dd>${c.hp}</dd><dt>Weakness</dt><dd>${typeOf(WEAK[c.type])} +20</dd><dt>Retreat</dt><dd>${"⚪".repeat(c.retreat ?? 1) || "free"}</dd></dl>
      ${moves(c).map(mv).join("")}<p class="flav">${c.flavor}</p>`;
  binderClose();
  app.insertAdjacentHTML("beforeend", `<div class="bmodal" onclick="if(event.target===this)binderClose()"><div class="dlg">
    <button class="x" onclick="binderClose()" aria-label="Close">✕</button>
    <div class="show">${tr ? trainerHTML(c) : cardHTML(c, { full: true })}</div><div class="info">${info}</div></div></div>`);
  document.querySelector(".bmodal .x").focus();
}

function binderClose() { document.querySelector(".bmodal")?.remove(); }

document.addEventListener("keydown", e => { if (e.key === "Escape") binderClose(); });
