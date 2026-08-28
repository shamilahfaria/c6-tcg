// Game state + rules glue: turn flow, player actions, AI. Calls render() (board.js) and FX.* (fx.js). Do not restyle here.
let G;


const inst = c => ({ ...c, max: c.hp, energy: [], uid: Math.random().toString(36).slice(2) });
const cardEl = c => c && document.querySelector(`[data-uid="${c.uid}"]`);

function newSide(types) {
  return { types, deck: buildDeck(types, CARDS, TRAINERS), hand: [], active: null, bench: [], discard: [], points: 0,
    energyNext: null, energyPreview: rnd(types), attached: false, supporter: false, retreated: false, bonus: 0, hotfix: 0, shield: 0 };
}

function draw(s, n = 1) { for (let i = 0; i < n && s.deck.length; i++) s.hand.push(s.deck.shift()); }

function log(s) { G.log.push(s); if (G.log.length > 3) G.log.shift(); }

const other = who => who === "me" ? "op" : "me";

const name = who => who === "me" ? "You" : "Opponent";


function start() {
  const opTypes = shuffle(Object.keys(TYPES)).slice(0, 1 + (Math.random() < .5 ? 1 : 0));
  G = { me: newSide(picked), op: newSide(opTypes), turn: 0, who: null, first: null, log: [], phase: "setup", after: null };
  for (const s of [G.me, G.op]) {
    do { s.deck = shuffle(s.deck); s.hand = s.deck.slice(0, 5); } while (!s.hand.some(c => c.sig)); // Pocket: a person is guaranteed in the opening hand
    s.deck = s.deck.slice(5);
  }
  G.first = Math.random() < .5 ? "me" : "op";
  // opponent setup: highest HP person active, the rest to the bench
  const people = G.op.hand.filter(c => c.sig).sort((a, b) => b.hp - a.hp);
  G.op.active = inst(people[0]); G.op.bench = people.slice(1, 4).map(inst);
  G.op.hand = G.op.hand.filter(c => !people.slice(0, 4).includes(c));
  log(`Coin flip: ${G.first === "me" ? "you go" : "opponent goes"} first. Opponent's deck: ${opTypes.map(typeOf).join(" + ")}.`);
  render();
}

function setupPick(i) { // choose starting active / bench from hand
  const c = G.me.hand[i]; if (!c.sig) return;
  if (!G.me.active) G.me.active = inst(c); else if (G.me.bench.length < 3) G.me.bench.push(inst(c)); else return;
  G.me.hand.splice(i, 1); render();
}

function begin() { G.phase = "play"; beginTurn(G.first); }


function beginTurn(who) {
  G.who = who; G.turn++;
  const s = G[who]; Object.assign(s, { attached: false, supporter: false, retreated: false, bonus: 0, hotfix: 0, shield: 0 });
  const opening = G.turn === 1;
  FX.banner(who === "me" ? "Your turn" : "Opponent's turn");
  if (opening) { s.energyNext = null; log(`${name(who)} go${who === "me" ? "" : "es"} first: no draw, no energy this turn.`); }
  else { draw(s); s.energyNext = s.energyPreview || rnd(s.types); s.energyPreview = rnd(s.types); log(`${name(who)} drew a card. Energy Zone: ${icon(s.energyNext)}.`); }
  render();
  if (who === "op") setTimeout(aiTurn, 900);
}

function endTurn() {
  if (G.phase === "over") return;
  G[G.who].energyNext = null; // unattached energy is lost
  beginTurn(other(G.who));
}


const myTurn = () => G.who === "me" && G.phase === "play";

function playCard(i) {
  if (!myTurn()) return;
  const s = G.me, c = s.hand[i];
  if (c.sig) { if (!s.active) s.active = inst(c); else if (s.bench.length < 3) s.bench.push(inst(c)); else return; log(`You played ${c.name}.`); }
  else if (!applyTrainer("me", c)) return;
  s.hand.splice(i, 1); render();
}

function attach(i) { // i = -1 active, else bench index
  if (!myTurn()) return;
  const s = G.me; if (!s.energyNext || s.attached) return;
  const c = i < 0 ? s.active : s.bench[i]; c.energy.push(s.energyNext); FX.energy(cardEl(c)); FX.play("energy");
  log(`You attached ${icon(s.energyNext)} to ${c.name}.`); s.energyNext = null; s.attached = true; render();
}

function retreat(i) {
  if (!myTurn()) return;
  const s = G.me, cost = Math.max(0, (s.active.retreat ?? 1) - s.hotfix);
  if (s.retreated || s.active.energy.length < cost) return;
  s.active.energy.splice(0, cost);
  [s.active, s.bench[i]] = [s.bench[i], s.active]; s.retreated = true;
  log(`${s.bench[i].name} retreats. ${s.active.name} steps in.`); render();
}

function promote(i) {
  const s = G.me; s.active = s.bench.splice(i, 1)[0]; G.phase = "play";
  log(`${s.active.name} steps in.`);
  const f = G.after; G.after = null; f ? f() : render();
}

function attack(i) {
  if (!myTurn()) return;
  const s = G.me, m = moves(s.active)[i]; if (!canPay(s.active, m.cost)) return;
  resolve("me", m);
  if (G.phase === "over") return;
  if (!s.active) { G.phase = "promote"; G.after = endTurn; render(); } else endTurn();
}


function resolve(who, m) {
  const A = G[who], D = G[other(who)], a = A.active, d = D.active;
  if (!a || !d) return;
  if (m.flip) { const heads = Math.random() < .5; FX.coin(heads); if (!heads) { log(`${a.name} used ${m.name}... tails. Nothing happens.`); return; } }
  const r = damage(a, d, m, A.bonus), dmg = Math.max(0, r.dmg - (D.shield || 0)); d.hp = Math.max(0, d.hp - dmg);
  log(`${a.name} used ${m.name}! ${r.weak ? "Weakness, +20! " : ""}${A.bonus ? "+10! " : ""}${D.shield ? "Shielded, -20. " : ""}${dmg} damage.`);
  FX.hit(cardEl(d), dmg, { weak: r.weak, shield: !!D.shield }); FX.play(r.weak ? "super" : "hit");
  if (m.self) a.hp = Math.max(0, a.hp - m.self);
  if (m.heal) a.hp = Math.min(a.max, a.hp + m.heal);
  if (d.hp === 0) ko(other(who), who);
  if (a.hp === 0 && G.phase !== "over") ko(who, other(who));
}

function ko(loserWho, scorerWho) {
  const L = G[loserWho], S = G[scorerWho], c = L.active;
  FX.ko(cardEl(c)); FX.play("ko");
  L.discard.push(c); L.active = null; S.points += points(c);
  log(`${c.name} is knocked out! ${name(scorerWho)} get${scorerWho === "me" ? "" : "s"} ${points(c)} point${points(c) > 1 ? "s" : ""}.`);
  if (S.points >= 3) return gameOver(scorerWho, "3 points");
  if (!L.bench.length) return gameOver(scorerWho, `${name(loserWho).toLowerCase()} ${loserWho === "me" ? "have" : "has"} no cards left`);
  if (loserWho === "op") { L.bench.sort((x, y) => y.hp - x.hp); L.active = L.bench.shift(); log(`${L.active.name} steps in.`); }
  else G.phase = "promote";
}

function applyTrainer(who, t) {
  const s = G[who], o = G[other(who)];
  const heal = (c, n) => { if (!c || c.hp === c.max) return false; c.hp = Math.min(c.max, c.hp + n); return true; };
  const give = n => { for (let i = 0; i < n; i++) s.active.energy.push(rnd(s.types)); };
  if (t.kind === "supporter" && s.supporter) return false;
  if (!s.active) return false;
  let ok = true, note = "";
  switch (t.effect) {
    case "heal20": ok = heal(s.active, 20); break;
    case "heal50": ok = heal(s.active, 50); break;
    case "heal20all": ok = [s.active, ...s.bench].map(c => heal(c, 20)).some(Boolean); break;
    case "ball": { const i = s.deck.findIndex(c => c.sig); if (i < 0) ok = false; else s.hand.push(s.deck.splice(i, 1)[0]); break; }
    case "hotfix": s.hotfix = 1; break;
    case "retreatFree": s.hotfix = 9; break;
    case "draw2": ok = s.deck.length > 0; draw(s, 2); break;
    case "draw3": ok = s.deck.length > 0; draw(s, 3); break;
    case "draw5": ok = s.deck.length > 0 && s.hand.length < 6; draw(s, Math.max(0, 5 - (s.hand.length - 1))); break;
    case "plus10": s.bonus = 10; break;
    case "shield": s.shield = 20; break;
    case "energy": give(1); break;
    case "flipEnergy": { let n = 0; while (Math.random() < .5) n++; give(n); note = ` ${n} heads.`; break; }
    case "moveEnergy": ok = s.bench.some(c => c.energy.length); s.bench.forEach(c => { if (c.energy.length) s.active.energy.push(c.energy.pop()); }); break;
    case "sabrina": { if (!o.bench.length) { ok = false; break; } const i = Math.floor(Math.random() * o.bench.length); [o.active, o.bench[i]] = [o.bench[i], o.active]; note = ` ${o.active.name} is dragged in.`; break; }
    case "redcard": { o.deck = shuffle(o.deck.concat(o.hand)); o.hand = []; draw(o, 3); break; }
    case "dmg20": { o.active.hp = Math.max(0, o.active.hp - 20); break; }
  }
  if (!ok) return false;
  if (t.kind === "supporter") s.supporter = true;
  log(`${name(who)} played ${t.name}.${note}`);
  if (t.effect === "dmg20" && o.active.hp === 0) ko(other(who), who);
  return true;
}

function gameOver(who, why) { G.phase = "over"; G.winner = who; G.why = why; render(); }


function aiTurn() {
  const s = G.op, me = G.me, later = (f, ms) => setTimeout(() => { if (G.phase !== "over") f(); }, ms);
  // people to the field
  s.hand.filter(c => c.sig).sort((a, b) => b.hp - a.hp).forEach(c => {
    if (!s.active) s.active = inst(c); else if (s.bench.length < 3) s.bench.push(inst(c)); else return;
    s.hand.splice(s.hand.indexOf(c), 1); log(`Opponent played ${c.name}.`);
  });
  // items, then one supporter
  s.hand.filter(c => c.kind === "item").forEach(t => { if (t.effect === "hotfix") return; if (applyTrainer("op", t)) s.hand.splice(s.hand.indexOf(t), 1); });
  const ready = canPay(s.active, s.active.sig.cost), hurt = s.active.max - s.active.hp;
  const want = { heal50: hurt >= 50, heal20all: hurt >= 20, draw2: s.hand.length <= 2, draw3: s.hand.length <= 3, draw5: s.hand.length <= 3, energy: !ready, flipEnergy: !ready,
    moveEnergy: !ready && s.bench.some(c => c.energy.length), plus10: ready, sabrina: me.bench.length > 0 && Math.random() < .3,
    shield: Math.random() < .5, redcard: me.hand.length >= 4, dmg20: true, retreatFree: false };
  const sup = s.hand.find(c => c.kind === "supporter" && want[c.effect]);
  if (sup && applyTrainer("op", sup)) s.hand.splice(s.hand.indexOf(sup), 1);
  if (G.phase === "over") return;
  // energy: active until it can use its signature, then the bench card closest to its signature, then active
  if (s.energyNext) {
    const target = !canPay(s.active, s.active.sig.cost) ? s.active : (s.bench.find(c => !canPay(c, c.sig.cost)) || s.active);
    target.energy.push(s.energyNext); log(`Opponent attached ${icon(s.energyNext)} to ${target.name}.`); s.energyNext = null; s.attached = true;
  }
  render();
  later(() => {
    if (me.active) {
      const best = moves(s.active).reduce((x, y) => ev(s.active, me.active, y, s.bonus) > ev(s.active, me.active, x, s.bonus) ? y : x);
      if (ev(s.active, me.active, best, s.bonus) > 0) resolve("op", best); else log("Opponent ends the turn.");
    }
    render();
    later(endTurn, 1100);
  }, 900);
}
