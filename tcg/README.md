# Gauntlet TCG (prototype)

- Open: double-click `index.html` (works as `file://`, no server, no build).
- Cards: edit `cards.js` (`window.CARDS`). Fields: id, name, photo, type, hp, attacks[{name, dmg, text?, self?}], flavor.
- Photos: drop `photos/<id>.jpg`; missing/broken photos fall back to initials in a colored circle.
- Types + weakness cycle: `WEAK` in `battle.js`. Logic test: `node battle.test.js`.
- Holo effect: `holo.css`, vendored from https://github.com/simeydotme/pokemon-cards-css.
