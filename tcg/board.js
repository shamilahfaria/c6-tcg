// Battle screen: render() for setup / play / promote / over phases. Owned by the board-layout work.
// Actions available: playCard(i) attach(i|-1) retreat(i) promote(i) attack(i) endTurn() setupPick(i) begin() typePick() binder()
const app = document.getElementById("app");

function handHTML(s, mine) {
  return s.hand.map((c, i) => c.sig
    ? cardHTML(c, { cls: "mini" + (mine ? " pickable" : ""), onclick: mine ? `playCard(${i})` : "" })
    : trainerHTML(c, { cls: mine ? "pickable" : "", onclick: mine ? `playCard(${i})` : "" })).join("");
}


function render() {
  if (G.phase === "over") {
    app.innerHTML = `<div class="over"><h1>${G.winner === "me" ? "You win!" : "You lose."}</h1><p class="log">${G.why}. ${G.log.at(-1)}</p>
      <p><button class="big" onclick="typePick()">Play Again</button> &nbsp; <button class="big alt" onclick="binder()">Find your card</button></p></div>`;
    return;
  }
  const me = G.me, op = G.op, mine = myTurn();
  if (G.phase === "setup") {
    app.innerHTML = `<h2>${me.active ? "Bench up to 3 more, or start" : "Choose your active card"}</h2><p class="hint">Click a person in your hand. ${G.log[0]}</p>
      <div class="row">${me.active ? cardHTML(me.active, { cls: "active" }) : "<p>—</p>"}<div class="bench">${me.bench.map(c => cardHTML(c, { cls: "mini" })).join("")}</div></div>
      <div class="hand">${me.hand.map((c, i) => c.sig ? cardHTML(c, { cls: "mini pickable", onclick: `setupPick(${i})` }) : trainerHTML(c)).join("")}</div>
      <p><button class="big" onclick="begin()" ${me.active ? "" : "disabled"}>Start battle</button></p>`;
    return;
  }
  const canAttach = mine && me.energyNext && !me.attached;
  const rc = me.active ? Math.max(0, (me.active.retreat ?? 1) - me.hotfix) : 0;
  const canRetreat = mine && me.active && !me.retreated && me.active.energy.length >= rc && G.phase === "play";
  const benchSlot = (c, i) => `<div class="slot">${cardHTML(c, { cls: "mini" })}<div class="acts">
      ${G.phase === "promote" ? `<button onclick="promote(${i})">Step in</button>` : ""}
      ${canAttach ? `<button onclick="attach(${i})">＋${icon(me.energyNext)}</button>` : ""}
      ${canRetreat ? `<button onclick="retreat(${i})">Retreat (${rc})</button>` : ""}</div></div>`;
  app.innerHTML = `<div class="board">
    <div class="status">Opponent · <b>${dots(op.points)}</b> · hand ${op.hand.length} · deck ${op.deck.length} · ${op.types.map(icon).join("")}</div>
    <div class="row">${op.active ? cardHTML(op.active, { cls: "active" }) : ""}<div class="bench">${op.bench.map(c => cardHTML(c, { cls: "mini" })).join("")}</div></div>
    <div class="log">${G.log.map((l, i) => i < G.log.length - 1 ? `<small>${l}</small>` : l).join("")}</div>
    ${G.phase === "promote" ? `<h3>Your active card was knocked out — choose who steps in.</h3>` : ""}
    <div class="row">
      ${me.active ? `<div class="slot">${cardHTML(me.active, { cls: "active", attack: true, busy: !mine || G.phase !== "play" })}<div class="acts">${canAttach ? `<button onclick="attach(-1)">＋${icon(me.energyNext)}</button>` : ""}</div></div>` : ""}
      <div class="bench">${me.bench.map(benchSlot).join("")}</div>
    </div>
    <div class="status">You · <b>${dots(me.points)}</b> · deck ${me.deck.length} · ${me.supporter ? "supporter used" : "supporter available"}
      ${mine && G.phase === "play" ? ` · <button class="acts" onclick="endTurn()" style="font:13px system-ui;padding:4px 10px;border-radius:6px;border:0;background:#ffcc33;cursor:pointer">End turn</button>` : ` · <i>${G.phase === "promote" ? "" : "opponent's turn…"}</i>`}</div>
    <div class="hand">${handHTML(me, mine && G.phase === "play")}</div>
  </div>
  <div class="zone"><div>ENERGY ZONE</div>
    <div class="cur ${me.energyNext ? "" : "dim"}">${me.energyNext ? icon(me.energyNext) : "—"}</div>
    <div>${me.energyNext ? (me.attached ? "attached" : "click ＋ on a card") : (me.attached ? "attached this turn" : "next turn")} · deck types ${me.types.map(icon).join("")}</div></div>`;
}

// Holo pointer tracking (math from pokemon-cards-css Card.svelte, minus the springs).
