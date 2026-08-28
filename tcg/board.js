// Battle screen: render() for setup / play / promote / over phases. Owned by the board-layout work.
// Actions available: playCard(i) attach(i|-1) retreat(i) promote(i) attack(i) endTurn() setupPick(i) begin() typePick() binder()
// Layout: Pokémon TCG Pocket battle screen adapted to landscape. Designed at 1280×720 logical px, the .arena is zoomed to fit the window.
const app = document.getElementById("app");
const UI = { arm: false, retreat: false }; // board-only state: energy orb armed by click, retreat chooser open

const back = () => typeof cardBackHTML === "function" ? cardBackHTML("") : `<div class="back"></div>`;
const stack = s => `<div class="deck"><div class="cw">${back()}</div><div class="cw">${back()}</div><div class="cw">${back()}</div><b>${s.deck.length}</b></div>`;
const pts = n => `<span class="pts">${[0, 1, 2].map(k => `<i class="${k < n ? "on" : ""}"></i>`).join("")}</span>`;
const who = (s, label, extra = "") => `<div class="who"><b>${label}</b>${pts(s.points)} <span>${s.types.map(icon).join("")}</span>${extra ? `<small>${extra}</small>` : ""}</div>`;

function handHTML(s, act) { // act: "play" | "setup" | null (not interactive). Cards overlap more as the hand grows (510 logical px wide, 121 per card at zoom .55).
  const n = s.hand.length, m = Math.min(92, n > 1 ? (510 - 121) / (n - 1) : 92) / .55 - 220;
  return `<div class="hand" style="--m:${m}px">${s.hand.map((c, i) => {
    const on = act && (c.sig || act === "play"), fn = act === "setup" ? `setupPick(${i})` : `playCard(${i})`;
    return `<div class="hc ${c.sig ? "" : "tr"} ${on ? "on" : ""}" ${on ? `data-drag="${c.sig ? "person" : "trainer"}" data-i="${i}"` : ""}>${
      c.sig ? cardHTML(c, { onclick: on ? fn : "" }) : trainerHTML(c, { onclick: on ? fn : "" })}</div>`;
  }).join("")}</div>`;
}

function render() {
  const me = G.me, op = G.op, mine = myTurn(), setup = G.phase === "setup", promo = G.phase === "promote";
  const canAttach = mine && me.energyNext && !me.attached;
  const rc = me.active ? Math.max(0, (me.active.retreat ?? 1) - me.hotfix) : 0;
  const canRetreat = mine && me.active && !me.retreated && me.active.energy.length >= rc && me.bench.length > 0;
  if (!canAttach) UI.arm = false;
  if (!canRetreat) UI.retreat = false;
  const tap = i => promo ? `onclick="promote(${i})"` : UI.arm ? `onclick="UI.arm=false;attach(${i})"` : "";

  const opHalf = `<div class="half op">${stack(op)}${who(op, "Opponent")}
    <div class="bench">${[0, 1, 2].map(i => op.bench[i] ? `<div class="slot"><div class="cw">${setup ? back() : cardHTML(op.bench[i])}</div></div>` : `<div class="slot empty"></div>`).join("")}</div>
    ${op.active ? `<div class="slot act"><div class="cw a">${setup ? back() : cardHTML(op.active, { cls: "active" })}</div></div>` : `<div class="slot act empty"></div>`}
    <div class="ophand">${op.hand.map(() => `<div class="cw">${back()}</div>`).join("")}<b>${op.hand.length}</b></div></div>`;

  const myActive = me.active
    ? `<div class="slot act" data-drop="active"><div class="cw a" data-drop="card" data-i="-1" ${tap(-1)}>${cardHTML(me.active, { cls: "active", attack: true, busy: !mine })}</div></div>`
    : `<div class="slot act empty tgt" data-drop="active"><span>${setup ? "Place your active card" : promo ? "Choose who steps in" : ""}</span></div>`;
  const myBench = `<div class="bench">${[0, 1, 2].map(i => me.bench[i]
    ? `<div class="slot" data-drop="bench" data-i="${i}"><div class="cw ${promo ? "pick" : ""}" data-drop="card" data-i="${i}" ${tap(i)}>${cardHTML(me.bench[i])}</div></div>`
    : `<div class="slot empty ${me.active ? "tgt" : ""}" data-drop="bench" data-i="${i}"></div>`).join("")}</div>`;

  const ctl = `<div class="ctl">
    ${setup ? `<button class="btn go" onclick="begin()" ${me.active ? "" : "disabled"}>Battle!</button><div class="wait">${me.active ? "Bench up to 3 more, or go" : "Drag a person to the active slot"}</div>` : ""}
    ${mine ? `<button class="btn end" onclick="endTurn()">End turn</button>` : ""}
    ${canRetreat ? `<button class="btn" onclick="UI.retreat=!UI.retreat;render()">Retreat · ${"⚪".repeat(rc) || "free"}</button>` : ""}
    ${UI.retreat ? `<div class="chooser"><small>Retreat for ${"⚪".repeat(rc) || "free"} — who steps in?</small>${me.bench.map((c, i) => `<div class="cw" onclick="UI.retreat=false;retreat(${i})">${cardHTML(c)}</div>`).join("")}</div>` : ""}
    ${!mine && !setup && G.phase === "play" ? `<div class="wait">Opponent's turn…</div>` : ""}</div>`;

  const e = me.energyNext, live = canAttach ? `data-drag="energy" onclick="UI.arm=!UI.arm;render()"` : "";
  const zone = `<div class="zone"><div class="lbl">Energy Zone</div>
    <div class="orb ${e || "off"} ${canAttach ? "live" : ""} ${UI.arm ? "armed" : ""}" ${live} title="${canAttach ? "Drag onto a card, or click then pick a card" : ""}">${e ? icon(e) : ""}</div>
    <div class="hint">${e ? (me.attached ? "attached" : canAttach ? (UI.arm ? "pick a card" : "drag to a card") : "") : me.attached ? "attached this turn" : setup ? "" : "next turn"}</div>
    <div class="next"><div class="orb sm ${me.energyPreview}">${icon(me.energyPreview)}</div>next</div>
    <div class="types">${me.types.map(icon).join(" ")}</div></div>`;

  const meHalf = `<div class="half me" data-drop="half">${myActive}${myBench}${stack(me)}${who(me, "You", setup ? "" : me.supporter ? "supporter used" : "supporter available")}${ctl}${zone}
    ${handHTML(me, setup ? "setup" : mine ? "play" : null)}</div>`;

  const over = G.phase === "over" ? `<div class="over"><div class="panel"><h1>${G.winner === "me" ? "You win!" : "You lose."}</h1>
    <p>You ${pts(me.points)} &nbsp;·&nbsp; Opponent ${pts(op.points)}</p><p class="why">${G.why}. ${G.log.at(-1) || ""}</p>
    <p><button class="big" onclick="typePick()">Play again</button> &nbsp; <button class="big alt" onclick="binder()">Binder</button></p></div></div>` : "";

  app.innerHTML = `<div class="arena ${G.phase} ${UI.arm ? "armed" : ""}"><div class="line"></div>${opHalf}
    <div class="log">${G.log.map((l, i) => `<div class="${i === G.log.length - 1 ? "now" : ""}">${l}</div>`).join("")}</div>${meHalf}${over}</div>`;
  fit();
}

function fit() { // scale the 1280×720 design to the window; the arena fills the viewport in logical px
  const a = app.querySelector(".arena"); if (!a) return;
  const z = Math.min(innerWidth / 1280, innerHeight / 720, 1.5);
  a.style.zoom = z; a.style.width = innerWidth / z + "px"; a.style.height = innerHeight / z + "px";
}
addEventListener("resize", fit);

// ---- Drag & drop (Pointer Events). Sources: [data-drag=person|trainer|energy][data-i]. Clicks still work: the drag only starts after 6px.
// Targets: people → .slot.tgt (empty active / empty bench); energy → [data-drop=card]; trainers → anywhere on .half.me except the hand.
let D = null, swallow = false;
const zoomOf = el => { let z = 1; for (let n = el; n; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1; return z; };
const arena = () => app.querySelector(".arena");

function dropAt(e, kind) {
  const under = document.elementFromPoint(e.clientX, e.clientY), t = under && under.closest("[data-drop]");
  if (!t) return null;
  if (kind === "energy") return t.dataset.drop === "card" ? t : null;
  if (kind === "person") return t.classList.contains("tgt") ? t : null;
  return under.closest(".hand, .zone, .ctl") ? null : t.closest(".half.me");
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
    D.ghost.innerHTML = `<div style="zoom:${D.z}">${D.el.innerHTML}</div>`;
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
  else playCard(d.i);
}
document.addEventListener("pointerup", e => endDrag(e, true));
document.addEventListener("pointercancel", e => endDrag(e, false));
document.addEventListener("click", e => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true); // a drag must not also click
