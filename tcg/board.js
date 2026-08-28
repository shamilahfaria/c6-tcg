// Battle screen: render() for setup / play / promote / over phases. Owned by the board-layout work.
// Actions available: playCard(i) attach(i|-1) retreat(i) promote(i) attack(i) endTurn() setupPick(i) begin() typePick() binder()
// Layout mirrors Pokémon TCG Pocket's battle screen, vertically stacked (opp hand → opp bench → opp active → centre → my active → my bench → my hand)
// inside a 1280×720 .board; the .arena is zoomed to fit the window (fit()).
const app = document.getElementById("app");
const UI = { arm: false, panel: -1, retreat: false, menu: false }; // board-only state. panel = the G.turn it was opened on, so it closes itself next turn

const back = () => typeof cardBackHTML === "function" ? cardBackHTML("") : `<div class="back"></div>`;
const stack = (s, cls) => `<div class="deck ${cls}"><div class="cw">${back()}</div><div class="cw">${back()}</div><div class="cw">${back()}</div><b>${s.deck.length}</b></div>`;
const pts = n => `<span class="pts">${[0, 1, 2].map(k => `<i class="${k < n ? "on" : ""}"></i>`).join("")}</span>`;
const slot = (cls, inner, attrs = "") => `<div class="slot ${cls} ${inner ? "" : "empty"}" ${attrs}>${inner}</div>`;

// a card on the field, Pocket-style: big HP number + bar floating above its top-right, energy icons at its bottom-left, both outside the card
const field = (c, attrs = "") => `<div class="fc" ${attrs}>${cardHTML(c, { inplay: true })}
  <div class="hpf ${c.hp * 3 <= c.max ? "low" : ""}"><b>${c.hp}</b><i><u style="width:${c.hp / c.max * 100}%"></u></i></div>
  ${c.energy.length ? `<div class="en">${c.energy.map(pip).join("")}</div>` : ""}</div>`;

function handHTML(s, act) { // act: "play" | "setup" | null (not interactive). Fanned: cards overlap more as the hand grows (600 board px wide, 121 per card at zoom .55).
  const n = s.hand.length, m = Math.min(96, n > 1 ? (600 - 121) / (n - 1) : 96) / .55 - 220, mid = (n - 1) / 2;
  return `<div class="hand" style="--m:${m}px">${s.hand.map((c, i) => {
    const on = act && (c.sig || act === "play"), fn = act === "setup" ? `setupPick(${i})` : c.sig ? `playCard(${i})` : `playTrainer(${i})`;
    return `<div class="hc ${c.sig ? "" : "tr"} ${on ? "on" : ""}" style="--r:${(i - mid) * 3}deg;--y:${Math.abs(i - mid) * 6}px" ${on ? `data-drag="${c.sig ? "person" : "trainer"}" data-i="${i}"` : ""}>${
      c.sig ? cardHTML(c, { onclick: on ? fn : "" }) : trainerHTML(c, { onclick: on ? fn : "" })}</div>`;
  }).join("")}</div>`;
}

function playTrainer(i) { // Pocket: the trainer is shown big in the centre for a beat so its text can be read, then it resolves
  if (!myTurn() || !G.me.hand[i]) return;
  const d = document.createElement("div"); d.className = "preview"; d.style.zoom = arena().style.zoom; d.innerHTML = trainerHTML(G.me.hand[i]);
  document.body.append(d); setTimeout(() => { d.remove(); playCard(i); }, 800);
}

function quit() { G.phase = "over"; UI.menu = false; } // leaving mid-battle: "over" is what the engine's AI timers check before acting, so nothing re-renders the board later

function render() {
  const me = G.me, op = G.op, mine = myTurn(), setup = G.phase === "setup", promo = G.phase === "promote";
  const canAttach = mine && me.energyNext && !me.attached;
  const rc = me.active ? Math.max(0, (me.active.retreat ?? 1) - me.hotfix) : 0;
  const canRetreat = mine && me.active && !me.retreated && me.active.energy.length >= rc && me.bench.length > 0;
  if (!canAttach) UI.arm = false;
  if (!canRetreat) UI.retreat = false;
  const panel = UI.panel === G.turn && me.active && G.phase === "play";
  const tap = i => promo ? `onclick="promote(${i})"` : UI.arm ? `onclick="UI.arm=false;attach(${i})"` : i < 0 && !setup ? `onclick="UI.panel=G.turn;render()"` : "";
  const fd = c => setup ? `<div class="cw">${back()}</div>` : field(c); // opponent's cards stay face-down until the battle starts

  const opSide = `<div class="ophand">${op.hand.map(() => `<div class="cw">${back()}</div>`).join("")}<b>${op.hand.length}</b></div>
    <div class="who op">${pts(op.points)}<b>Opponent</b></div>${stack(op, "op")}
    <div class="bench op">${[0, 1, 2].map(i => slot("", op.bench[i] ? fd(op.bench[i]) : "")).join("")}</div>
    ${slot("act op", op.active ? fd(op.active) : "")}`;

  const mySide = `${me.active ? slot("act me", field(me.active, `data-drop="card" data-i="-1" ${tap(-1)}`), `data-drop="active"`) : slot("act me tgt", "", `data-drop="active"`)}
    <div class="bench me">${[0, 1, 2].map(i => me.bench[i]
      ? slot(promo ? "pick" : "", field(me.bench[i], `data-drop="card" data-i="${i}" ${tap(i)}`), `data-drop="bench" data-i="${i}"`)
      : slot(me.active ? "tgt" : "", "", `data-drop="bench" data-i="${i}"`)).join("")}</div>
    ${stack(me, "me")}<div class="who me"><b>You</b>${pts(me.points)}</div>`;

  const msg = setup ? (me.active ? "Bench up to 3 more, then Battle!" : "Put a person in the Active Spot.") : promo ? "Choose who steps in." : G.log.at(-1) || "";
  const pills = `<div class="msg"><i></i>${msg}</div>
    ${setup ? `<div class="first">${G.first === "me" ? "You are going first" : "Opponent goes first"}</div>` : `<div class="turn">Current turn:<b>${G.turn}</b></div>`}
    <div class="side">${setup ? (me.active ? `<button class="pill go" onclick="begin()">Battle!</button>` : "") : mine ? `<button class="pill" onclick="endTurn()">End Turn</button>` : ""}</div>`;

  const e = me.energyNext, live = canAttach ? `data-drag="energy" onclick="UI.arm=!UI.arm;render()"` : "";
  const dial = `<div class="zone ${canAttach ? "live" : ""} ${UI.arm ? "armed" : ""}" title="${canAttach ? "Drag onto a card, or click then pick a card" : e ? "" : "Next turn's energy"}">
    <div class="orb ${e || "off"}" ${live}>${e ? icon(e) : ""}</div><div class="orb sm ${me.energyPreview}">${icon(me.energyPreview)}</div></div>`;

  const menu = `<button class="mbtn" onclick="UI.menu=!UI.menu;render()" aria-label="Menu">☰</button>
    ${UI.menu ? `<div class="mpanel"><button class="pill" onclick="quit();binder()">Binder</button><button class="pill" onclick="quit();title()">Home</button></div>` : ""}`;

  const apanel = panel ? `<div class="apanel" onclick="if(event.target===this){UI.panel=-1;UI.retreat=false;render()}"><div class="ap">
    <div class="big">${cardHTML(me.active, { attack: true, busy: !mine })}</div>
    <div class="acts">${mine ? "" : `<div class="wait">Opponent's turn…</div>`}
      ${canRetreat ? `<button class="pill sm" onclick="UI.retreat=!UI.retreat;render()">Retreat ${pip().repeat(rc) || "· free"}</button>` : ""}
      ${UI.retreat ? `<div class="chooser"><small>Who steps in?</small>${me.bench.map((c, i) => `<div class="cw" onclick="UI.retreat=false;UI.panel=-1;retreat(${i})">${cardHTML(c)}</div>`).join("")}</div>` : ""}
      <button class="pill sm" onclick="UI.panel=-1;UI.retreat=false;render()">Close</button></div></div></div>` : "";

  const over = G.phase === "over" ? `<div class="over"><div class="panel"><h1>${G.winner === "me" ? "You win!" : "You lose."}</h1>
    <p>You ${pts(me.points)} &nbsp;·&nbsp; Opponent ${pts(op.points)}</p><p class="why">${G.why}. ${G.log.at(-1) || ""}</p>
    <p><button class="pill" onclick="typePick()">Play again</button> &nbsp; <button class="pill sm" onclick="binder()">Binder</button></p></div></div>` : "";

  app.innerHTML = `<div class="arena ${G.phase} ${UI.arm ? "armed" : ""}"><div class="board">
    <div class="rim"><div class="felt"><div class="court"></div></div></div><div class="tzone" data-drop="trainer"></div>
    ${opSide}${mySide}${pills}${dial}${menu}${handHTML(me, setup ? "setup" : mine ? "play" : null)}${apanel}${over}</div></div>`;
  fit();
}

function fit() { // scale the 1280×720 design to the window; the arena fills the viewport in logical px and centres the stage
  const a = app.querySelector(".arena"); if (!a) return;
  const z = Math.min(innerWidth / 1280, innerHeight / 720, 1.5);
  a.style.zoom = z; a.style.width = innerWidth / z + "px"; a.style.height = innerHeight / z + "px";
}
addEventListener("resize", fit);

// ---- Drag & drop (Pointer Events). Sources: [data-drag=person|trainer|energy][data-i]. Clicks still work: the drag only starts after 6px.
// Targets: people → .slot.tgt (empty active / empty bench); energy → [data-drop=card]; trainers → .tzone, the teal centre overlay shown while dragging.
let D = null, swallow = false;
const zoomOf = el => { let z = 1; for (let n = el; n; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1; return z; };
const arena = () => app.querySelector(".arena");

function dropAt(e, kind) {
  const under = document.elementFromPoint(e.clientX, e.clientY), t = under && under.closest("[data-drop]");
  if (!t) return null;
  if (kind === "energy") return t.dataset.drop === "card" ? t : null;
  if (kind === "person") return t.classList.contains("tgt") ? t : null;
  return t.dataset.drop === "trainer" ? t : null;
}

document.addEventListener("pointerdown", e => {
  const el = e.target.closest("[data-drag]");
  if (!el || e.button !== 0 || e.target.closest("button")) return;
  const r = el.getBoundingClientRect();
  D = { el, kind: el.dataset.drag, i: +el.dataset.i, x0: e.clientX, y0: e.clientY, left: r.left, top: r.top, z: zoomOf(el), ghost: null, over: null };
});

document.addEventListener("pointermove", e => {
  if (!D) return;
  const dx = e.clientX - D.x0, dy = e.clientY - D.y0;
  if (!D.ghost) {
    if (Math.hypot(dx, dy) < 6) return;
    try { D.el.setPointerCapture(e.pointerId); } catch {}
    D.ghost = document.createElement("div"); D.ghost.className = "ghost";
    D.ghost.style.cssText = `left:${D.left}px;top:${D.top}px`;
    D.ghost.innerHTML = `<div style="zoom:${D.z}">${D.kind === "energy" ? D.el.outerHTML : D.el.innerHTML}</div>`;
    document.body.append(D.ghost); D.el.classList.add("lifted");
    arena()?.classList.add("drag", "drag-" + D.kind);
  }
  D.ghost.style.transform = `translate(${dx}px,${dy}px)`;
  const t = dropAt(e, D.kind);
  if (t !== D.over) { D.over?.classList.remove("over"); D.over = t; t?.classList.add("over"); }
});

function endDrag(e, ok) {
  const d = D; D = null;
  if (!d || !d.ghost) return; // no drag happened: the click event does the work
  swallow = true; setTimeout(() => swallow = false, 150);
  arena()?.classList.remove("drag", "drag-person", "drag-trainer", "drag-energy");
  d.over?.classList.remove("over");
  const t = ok && document.contains(d.el) && dropAt(e, d.kind);
  if (!t) { // snap back
    d.ghost.classList.add("back"); d.ghost.style.transform = "translate(0,0)";
    setTimeout(() => { d.ghost.remove(); d.el.classList.remove("lifted"); }, 200);
    return;
  }
  d.ghost.remove(); d.el.classList.remove("lifted"); FX.play("click");
  if (d.kind === "energy") { UI.arm = false; attach(+t.dataset.i); }
  else if (d.kind === "person" && G.phase === "setup") setupPick(d.i);
  else if (d.kind === "person") playCard(d.i);
  else playTrainer(d.i);
}
document.addEventListener("pointerup", e => endDrag(e, true));
document.addEventListener("pointercancel", e => endDrag(e, false));
document.addEventListener("click", e => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true); // a drag must not also click
