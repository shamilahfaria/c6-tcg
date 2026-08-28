// Pure rules. No DOM. Loaded by index.html (globals) and battle.test.js (require).
// Pokémon TCG Pocket rules: weakness is a flat +20, 3 points win, ex cards give 2 points.
var WEAK = { fire: "water", water: "electric", electric: "grass", grass: "fire", psychic: "fighting", fighting: "psychic", normal: "fighting" };

// card.energy = array of type strings. cost = { t: own-type count, c: any-type count }.
function canPay(card, cost) {
  var own = card.energy.filter(function (e) { return e === card.type; }).length;
  return own >= (cost.t || 0) && card.energy.length >= (cost.t || 0) + (cost.c || 0);
}
function costSize(cost) { return (cost.t || 0) + (cost.c || 0); }

// Does not mutate. bonus = flat extra damage (Demo Day). Returns damage dealt, weakness flag, defender's new hp.
function damage(attacker, defender, move, bonus) {
  var weak = WEAK[defender.type] === attacker.type;
  var dmg = move.dmg + (weak ? 20 : 0) + (bonus || 0);
  return { dmg: dmg, weak: weak, hp: Math.max(0, defender.hp - dmg) };
}
// Expected damage, for the AI. Unaffordable moves are worth 0.
function ev(attacker, defender, move, bonus) {
  if (!canPay(attacker, move.cost)) return 0;
  return damage(attacker, defender, move, bonus).dmg * (move.flip ? 0.5 : 1);
}
function points(card) { return card.ex ? 2 : 1; }

// Build a 20-card deck from 1-2 types: always 12 people + 8 trainers, max 2 copies of anything.
// People come from the chosen types first; colorless ("normal") staff cards fill the rest so thin types get full decks.
function buildDeck(types, cards, trainers, rand) {
  rand = rand || Math.random;
  var twice = function (list) { var out = []; list.forEach(function (c) { out.push(c, c); }); return out.sort(function () { return rand() - 0.5; }); }; // ponytail: biased shuffle, fine here
  var deck = twice(cards.filter(function (c) { return types.indexOf(c.type) >= 0; })).slice(0, 12);
  var filler = twice(cards.filter(function (c) { return c.type === "normal"; }));
  while (deck.length < 12 && filler.length) deck.push(filler.pop());
  var pool = [], count = {};
  trainers.forEach(function (t) { pool.push(t); if (t.kind === "item") pool.push(t, t); }); // items ×3 in the pool: many supporters, few items
  pool.sort(function () { return rand() - 0.5; });
  while (deck.length < 20 && pool.length) { var t = pool.pop(); if ((count[t.id] || 0) < 2) { count[t.id] = (count[t.id] || 0) + 1; deck.push(t); } }
  return deck.sort(function () { return rand() - 0.5; });
}

if (typeof module !== "undefined") module.exports = { WEAK: WEAK, canPay: canPay, costSize: costSize, damage: damage, ev: ev, points: points, buildDeck: buildDeck };
