// Card faces: cardHTML(c, o), trainerHTML(t, o), cardBackHTML(cls) + shared helpers + holo pointer tracking. Owned by the card-face work.
// Contract: cardHTML(c, {cls, onclick, badge, attack, busy, full, inplay}) renders attack rows as <button class="atk" onclick="attack(i)"> when o.attack.
//   inplay: no HP text in the header (type symbol stays), no attached-energy pips, no damage bar — the board draws HP + energy outside the card (Pocket style).
// Card is designed at 220px wide (holo.css); everything inside is px, scaled by CSS `zoom` on wrappers (.mini = .5).
const rnd = a => a[Math.floor(Math.random() * a.length)];

const shuffle = a => a.slice().sort(() => Math.random() - .5); // ponytail: biased shuffle, fine for 20 cards

const icon = t => TYPES[t].icon;

const typeOf = t => `${icon(t)} ${TYPES[t].label}`;

const moves = c => [COMMON[c.type], c.sig];

// energy pip: colored circle with the type icon inside. "any" = grey ⚪
const pip = t => t ? `<i class="pip ${t}">${icon(t)}</i>` : `<i class="pip any">⚪</i>`;

const pips = (cost, t) => pip(t).repeat(cost.t || 0) + pip().repeat(cost.c || 0);

const dots = n => "●".repeat(n) + "○".repeat(Math.max(0, 3 - n));

const rarity = c => "◆".repeat(c.type === "normal" ? 1 : c.ex ? 4 : c.hp >= 110 ? 3 : 2);

// name always fits on one line: font-size stepped by length. steps = [[maxLen, px], ...]; ex cards lose 2.5px (badge + 3-digit HP).
const nm = (name, steps, minus = 0) => `<span class="nm" style="font-size:${(steps.find(([n]) => name.length <= n) || steps.at(-1))[1] - minus}px">${name}</span>`;
const NM_CARD = [[9, 15], [12, 13], [15, 11.5], [99, 10]], NM_TRAINER = [[12, 16], [18, 14], [24, 12], [99, 10]];

function cardHTML(c, o = {}) {
  const max = c.max || c.hp, energy = o.inplay ? [] : c.energy || [];
  const initials = c.name.split(" ").map(w => w[0]).join("").slice(0, 2);
  const rows = moves(c).map((m, i) => {
    const rider = [m.flip ? `<i class="pip flip">?</i>flip` : "", m.self ? `${m.self} self` : "", m.text || ""].filter(Boolean).join(" · ");
    const inner = `<span class="cost">${pips(m.cost, c.type)}</span><span class="atkn">${m.name}${rider ? `<small>${rider}</small>` : ""}</span><b>${m.dmg}</b>`;
    const ok = o.attack && !o.busy && canPay(c, m.cost);
    return o.attack ? `<button class="atk" onclick="attack(${i})" ${ok ? "" : "disabled"}>${inner}</button>` : `<div class="atk">${inner}</div>`;
  }).join("");
  return `<div class="card ${c.type} ${c.ex ? "ex" : ""} ${o.cls || ""} ${o.full ? "full" : ""}" ${c.uid ? `data-uid="${c.uid}"` : ""} ${o.onclick ? `onclick="${o.onclick}"` : ""}>
    ${o.badge ? `<b class="n">${o.badge}</b>` : ""}
    <div class="card__rotator">
      <div class="card__front"><div class="face">
        <div class="hd"><span class="basic">Basic</span>${nm(c.name, NM_CARD, c.ex ? 2.5 : 0)}${c.ex ? `<em class="exb">ex</em>` : ""}
          ${o.inplay ? "" : `<span class="hp ${c.hp < max ? "hurt" : ""}"><small>HP</small>${c.hp}</span>`}<i class="tc ${c.type}">${icon(c.type)}</i></div>
        <div class="pic">${initials}${c.photo ? `<img src="${c.photo}" alt="" onerror="this.remove()">` : ""}
          ${!o.inplay && c.hp < max ? `<div class="bar"><i style="width:${c.hp / max * 100}%"></i></div>` : ""}</div>
        <div class="type">${energy.length ? `<span class="energy">${energy.map(pip).join("")}</span>` : ""}${typeOf(c.type)}${o.full ? `<span class="real">${c.real}</span>` : ""}</div>
        <div class="atks">${rows}</div>
        ${o.full ? `<div class="flavor">${c.flavor}</div>` : ""}
        <div class="ft"><span>weakness ${pip(WEAK[c.type])} +20</span><span>retreat ${pip().repeat(c.retreat ?? 1) || "—"}</span></div>
        <div class="rr"><span>${rarity(c)}</span><span>Gauntlet C6 · ${c.id}</span></div>
      </div></div>
      <div class="card__shine"></div>
      <div class="card__glare"></div>
    </div>
  </div>`;
}

function trainerHTML(t, o = {}) {
  const sup = t.kind !== "item";
  return `<div class="trainer ${t.kind} ${t.staff ? "staff" : ""} ${o.cls || ""}" ${o.onclick ? `onclick="${o.onclick}"` : ""}><div class="face">
    <div class="hd"><span class="kind">${sup ? "Supporter" : "Item"}</span><span class="tl">Trainer</span></div>${nm(t.name, NM_TRAINER)}
    <div class="pic ${t.photo ? "" : "ph"}">${t.photo ? `<img src="${t.photo}" alt="" onerror="this.remove()">` : `<img src="assets/shield.png" alt="">`}</div>
    <p>${t.text}</p>
    <small class="note">${sup ? "You may play only 1 Supporter card during your turn." : "You may play any number of Item cards during your turn."}</small>
    <div class="rr"><span>◆</span><span>Gauntlet C6 · ${t.id}</span></div>
  </div></div>`;
}

// Face-down card (opponent's hand, decks): black, Gauntlet shield, gold trim. Same outer size/radius as a card.
function cardBackHTML(cls = "") {
  return `<div class="card back ${cls}"><div class="face"><img src="assets/shield.png" alt=""></div></div>`;
}

document.addEventListener("pointermove", e => {
  if (document.querySelector(".arena.drag")) return; // no holo tilt mid-drag — it fought the drag
  const c = e.target.closest(".card"); if (!c || c.closest(".static")) return; // .static: no holo tilt (attack panel)
  const r = c.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100));
  const y = Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100));
  c.classList.add("interacting");
  c.style.cssText = `--pointer-x:${x}%;--pointer-y:${y}%;--rotate-x:${-(x - 50) / 6}deg;--rotate-y:${(y - 50) / 6}deg;` +
    `--background-x:${37 + x * .26}%;--background-y:${33 + y * .34}%;--card-opacity:1`;
});

document.addEventListener("pointerout", e => {
  const c = e.target.closest(".card"); if (!c || c.contains(e.relatedTarget)) return;
  c.classList.remove("interacting");
  c.style.cssText = "";
});

// Hard rule: a card name never overflows its header. Measured fit (not guessed by length): after any render,
// shrink each unfitted .nm until it fits its box; also clears any ellipsis. Runs once per element.
(() => {
  // .nm = card/trainer names; .atkn = attack names (the rider <small> under an attack name is excluded from the measure)
  const fit = () => document.querySelectorAll(".nm:not([data-fit]), .atkn:not([data-fit])").forEach(el => {
    el.dataset.fit = "1";
    const z = parseFloat(getComputedStyle(el).fontSize) || 14;
    const tooWide = () => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && el.scrollWidth > el.clientWidth + 0.5;
    for (let s = z; s >= 6 && tooWide(); s -= 0.5) el.style.fontSize = s + "px";
    if (tooWide()) el.style.letterSpacing = "-0.4px";
  });
  new MutationObserver(() => requestAnimationFrame(fit)).observe(document.documentElement, { childList: true, subtree: true });
  document.fonts?.ready.then(() => { document.querySelectorAll(".nm[data-fit], .atkn[data-fit]").forEach(el => { delete el.dataset.fit; el.style.fontSize = ""; }); fit(); });
  addEventListener("load", fit);
})();
