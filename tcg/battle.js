// Pure rules. No DOM. Loaded by index.html (globals) and battle.test.js (require).
// Pokémon TCG Pocket rules: weakness is a flat +20, 3 points win, ex cards give 2 points.
var WEAK = { fire: "water", water: "electric", electric: "grass", grass: "fire", psychic: "fighting", fighting: "psychic" };

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

// Build a 20-card deck from 1-2 types: up to 2 copies of each person of those types (12 max), rest trainers (max 2 copies each).
function buildDeck(types, cards, trainers, rand) {
  rand = rand || Math.random;
  var people = cards.filter(function (c) { return types.indexOf(c.type) >= 0; });
  var deck = [];
  people.forEach(function (c) { deck.push(c, c); });
  deck.sort(function () { return rand() - 0.5; }); // ponytail: biased shuffle, fine here
  deck = deck.slice(0, 12);
  var pool = [];
  trainers.forEach(function (t) { pool.push(t, t); });
  pool.sort(function () { return rand() - 0.5; });
  while (deck.length < 20 && pool.length) deck.push(pool.pop());
  return deck.sort(function () { return rand() - 0.5; });
}

if (typeof module !== "undefined") module.exports = { WEAK: WEAK, canPay: canPay, costSize: costSize, damage: damage, ev: ev, points: points, buildDeck: buildDeck };
