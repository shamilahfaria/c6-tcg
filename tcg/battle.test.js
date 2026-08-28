// node battle.test.js
const assert = require("assert");
global.window = {}; require("./cards.js");
const { WEAK, canPay, damage, ev, points, buildDeck } = require("./battle.js");
const { CARDS, TRAINERS } = window;

const fire = { type: "fire", hp: 90, energy: ["fire", "fire", "water"] };
const water = { type: "water", hp: 90, energy: [] };

// energy costs: own type counts toward t, anything counts toward c
assert.ok(canPay(fire, { t: 2 }));
assert.ok(canPay(fire, { t: 2, c: 1 }));
assert.ok(!canPay(fire, { t: 3 }), "water energy is not fire");
assert.ok(!canPay(fire, { t: 2, c: 2 }));
// weakness is +20 flat (Pocket), one direction only
assert.deepStrictEqual(damage(water, fire, { dmg: 30 }), { dmg: 50, weak: true, hp: 40 });
assert.strictEqual(damage(fire, water, { dmg: 30 }).weak, false);
// Demo Day bonus stacks; KO clamps at 0
assert.strictEqual(damage(water, { type: "fire", hp: 55 }, { dmg: 30 }, 10).hp, 0);
// ev: unaffordable = 0, flip halves
assert.strictEqual(ev(fire, water, { cost: { t: 3 }, dmg: 100 }), 0);
assert.strictEqual(ev(fire, water, { cost: { t: 2 }, dmg: 70, flip: true }), 35);
// points; every type's weakness is a real type; colorless cards pay with anything
assert.strictEqual(points({ ex: true }), 2); assert.strictEqual(points({}), 1);
Object.values(WEAK).forEach(w => assert.ok(WEAK[w], w));
assert.ok(canPay({ type: "normal", energy: ["fire", "water"] }, { c: 2 }));
// deck: 20 cards, ≤2 copies, only chosen types, at least one person
let i = 0; const rand = () => ((i += 7) % 11) / 11;
const deck = buildDeck(["fire"], CARDS, TRAINERS, rand);
assert.strictEqual(deck.length, 20);
const people = deck.filter(c => c.sig);
assert.strictEqual(people.length, 12); assert.ok(people.every(c => c.type === "fire"));
// a thin type still gets 12 people: the rest are colorless staff
const thin = buildDeck(["grass"], CARDS, TRAINERS, rand).filter(c => c.sig);
assert.strictEqual(thin.length, 12); assert.ok(thin.every(c => c.type === "grass" || c.type === "normal")); assert.ok(thin.some(c => c.type === "normal"));
const counts = {}; deck.forEach(c => counts[c.id] = (counts[c.id] || 0) + 1);
assert.ok(Object.values(counts).every(n => n <= 2));
// data sanity: every card has a common move for its type and a signature with a cost
CARDS.forEach(c => { assert.ok(window.COMMON[c.type], c.id); assert.ok(c.sig && c.sig.cost, c.id); });

console.log("battle.test.js: all passed");
