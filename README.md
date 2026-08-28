# Gauntlet TCG — Game Week

Cohort 6 as a Pokémon TCG Pocket-style card game. Every cohort member is a card with a Pokémon-style name; types, moves and flavor text come from what people actually do.

**Play:** https://shamilahfaria.github.io/c6-tcg/ — or open `tcg/index.html` (no build, no server; works from `file://`).

**Rules (Pokémon TCG Pocket):** pick 1–2 energy types → auto-built 20-card deck (≤2 copies each) · 5-card hand, draw 1/turn · bench of 3 · Energy Zone gives 1 energy/turn, attach once · first player gets no draw/energy on turn 1 · weakness +20 · retreat by discarding energy, once/turn · items (any number) and one supporter per turn · 3 points to win, ex cards are worth 2.

**Cards:** every person has their type's shared move + a signature move. Types: 🔥 Frontend, 💧 Data, 🌿 ML, ⚡ Infra, 🔮 Agents, 🥊 Evals. Trainers are Gauntlet-themed (Coffee, Slack Ping, Hotfix, Weekly Writeup, Demo Day, Hiring Partner Intro, Office Hours, Stipend).

- Data: `tcg/cards.js` (people, `COMMON` moves, `TRAINERS`). Photos: `tcg/photos/<id>.jpg`.
- Rules: `tcg/battle.js` (pure, no DOM) — `node tcg/battle.test.js`.
- UI + engine: `tcg/index.html`. Holo effect: `tcg/holo.css`, vendored from [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css).
- `rage/` is a second prototype (Level Devil-style platformer where every trap is an AI failure mode). Playable at `/rage/`, not the submission.
