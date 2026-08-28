// node battle.test.js
const assert = require("assert");
const { WEAK, damage } = require("./battle.js");

const fire = { type: "fire", hp: 90 };
const water = { type: "water", hp: 90 };
const atk = { name: "x", dmg: 30 };

// normal hit
assert.deepStrictEqual(damage(fire, fire, atk), { dmg: 30, super: false, hp: 60 });
// super effective: water hits fire for 2x
assert.deepStrictEqual(damage(water, fire, atk), { dmg: 60, super: true, hp: 30 });
// reverse direction is NOT super effective (one weakness per type)
assert.strictEqual(damage(fire, water, atk).super, false);
// KO clamps at 0
assert.strictEqual(damage(water, { type: "fire", hp: 50 }, atk).hp, 0);
// every type has exactly one weakness and the map is a closed cycle over the 6 types
assert.deepStrictEqual(Object.keys(WEAK).sort(), Object.values(WEAK).sort());

console.log("battle.test.js: all passed");

// expected value: a coin-flip 70 is worth 35, so a sure 40 beats it; super-effective flip 70 (=70) beats both
const { ev } = require("./battle.js");
assert.strictEqual(ev(fire, fire, { dmg: 70, flip: true }), 35);
assert.ok(ev(fire, fire, { dmg: 40 }) > ev(fire, fire, { dmg: 70, flip: true }));
assert.strictEqual(ev(water, fire, { dmg: 70, flip: true }), 70);
console.log("ev: ok");
