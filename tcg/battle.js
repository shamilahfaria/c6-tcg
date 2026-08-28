// Pure battle logic. No DOM. Loaded by index.html (globals) and battle.test.js (require).
// WEAK[type] = the type it takes 2x damage from.
var WEAK = { fire: "water", water: "electric", electric: "grass", grass: "fire", psychic: "fighting", fighting: "psychic" };

// Does not mutate. Returns damage dealt, whether it was super effective, and defender's new hp (clamped at 0).
function damage(attacker, defender, attack) {
  var mult = WEAK[defender.type] === attacker.type ? 2 : 1;
  var dmg = attack.dmg * mult;
  return { dmg: dmg, super: mult === 2, hp: Math.max(0, defender.hp - dmg) };
}

// Expected damage — what the AI ranks attacks by. Coin-flip attacks hit half the time.
function ev(attacker, defender, attack) {
  return damage(attacker, defender, attack).dmg * (attack.flip ? 0.5 : 1);
}

if (typeof module !== "undefined") module.exports = { WEAK: WEAK, damage: damage, ev: ev };
