// Title screen, deck type picker, binder. Owned by the menus work. Entry points: title() typePick() binder(); start() lives in engine.js.
function title() {
  app.innerHTML = `<h1>Gauntlet TCG</h1><p>Cohort 6 as a card game, Pokémon TCG Pocket rules. 20-card decks, an Energy Zone, 3 points to win.</p>
    <p><button class="big" onclick="typePick()">Play</button> &nbsp; <button class="big alt" onclick="binder()">Find your card</button></p>
    <p class="hint">${CARDS.length} people · ${TRAINERS.length} trainers · hover to tilt</p>`;
}

function binder() {
  app.innerHTML = `<h2>The Binder</h2><p class="hint"><a href="#" onclick="title();return false">← Back</a> · ${CARDS.length} people in Guess Who order, then trainers</p>
    <div class="row">${CARDS.map(c => cardHTML(c, { full: true })).join("")}</div><div class="row">${TRAINERS.map(t => trainerHTML(t)).join("")}</div>`;
}

let picked = [];

function typePick() {
  picked = [];
  renderTypePick();
}

function renderTypePick() {
  const n = CARDS.filter(c => picked.includes(c.type)).length;
  app.innerHTML = `<h2>Build your deck: pick 1 or 2 energy types</h2><p class="hint">Your Energy Zone only makes these types. Every deck is 12 people + 8 trainers: your types first, ⭐ Staff cards fill the rest.</p>
    <div class="typepick">${Object.keys(TYPES).filter(t => t !== "normal").map(t => `<button class="${picked.includes(t) ? "on" : ""}" onclick="togglePick('${t}')">${typeOf(t)} <small>(${CARDS.filter(c => c.type === t).length})</small></button>`).join("")}</div>
    <p><button class="big" onclick="start()" ${picked.length ? "" : "disabled"}>Shuffle up & play${picked.length ? ` (${n} people)` : ""}</button></p>`;
}

function togglePick(t) {
  picked = picked.includes(t) ? picked.filter(x => x !== t) : picked.concat(t).slice(-2);
  renderTypePick();
}
