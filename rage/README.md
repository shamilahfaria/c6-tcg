# rage — every trap is an AI failure mode

Open: double-click `index.html` (needs internet once for the KAPLAY CDN). Arrows/WASD move, space/up jumps.
Skip to a level while testing: open `index.html?level=3` (0-based).
Add a level: append `{ name, map: [15 rows x 25 cols], ...flags }` to `LEVELS` in `levels.js` — legend and flags (`rateLimit`, `vignette`, `flaky`, `signs`) are in the comment at the top.
Lint maps: `node -e "$(cat levels.js); LEVELS.forEach(l => { if (l.map.length !== 15 || l.map.some(r => r.length > 25) || !l.map.join('').includes('@') || !l.map.join('').includes('E')) throw l.name })"`
