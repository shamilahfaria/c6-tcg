// Card faces: cardHTML(c, o) and trainerHTML(t, o) + shared helpers + holo pointer tracking. Owned by the card-face work.
// Contract: cardHTML(c, {cls, onclick, badge, attack, busy, full}) renders attack rows as <button class="atk" onclick="attack(i)"> when o.attack.
const rnd = a => a[Math.floor(Math.random() * a.length)];

const shuffle = a => a.slice().sort(() => Math.random() - .5); // ponytail: biased shuffle, fine for 20 cards

const icon = t => TYPES[t].icon;

const typeOf = t => `${icon(t)} ${TYPES[t].label}`;

const moves = c => [COMMON[c.type], c.sig];

const pips = (cost, t) => icon(t).repeat(cost.t || 0) + "⚪".repeat(cost.c || 0);

const dots = n => "●".repeat(n) + "○".repeat(Math.max(0, 3 - n));

function cardHTML(c, o = {}) {
  const max = c.max || c.hp, energy = c.energy || [];
  const initials = c.name.split(" ").map(w => w[0]).join("").slice(0, 2);
  const rows = moves(c).map((m, i) => {
    const rider = [m.flip ? "🪙 coin flip" : "", m.text || ""].filter(Boolean).join(" · ");
    const inner = `<span><span class="cost">${pips(m.cost, c.type)}</span>${m.name}${rider ? `<small>${rider}</small>` : ""}</span><b>${m.dmg}</b>`;
    const ok = o.attack && !o.busy && canPay(c, m.cost);
    return o.attack ? `<button class="atk" onclick="attack(${i})" ${ok ? "" : "disabled"}>${inner}</button>` : `<div class="atk">${inner}</div>`;
  }).join("");
  return `<div class="card ${c.type} ${o.cls || ""} ${o.full ? "full" : ""}" ${c.uid ? `data-uid="${c.uid}"` : ""} ${o.onclick ? `onclick="${o.onclick}"` : ""}>
    ${o.badge ? `<b class="n">${o.badge}</b>` : ""}
    <div class="card__rotator">
      <div class="card__front"><div class="face">
        <div class="hd"><span>${c.name}${c.ex ? `<em class="ex">ex</em>` : ""}</span><span>${c.hp}/${max} HP</span></div>
        <div class="bar"><i style="width:${c.hp / max * 100}%"></i></div>
        <div class="pic">${initials}${c.photo ? `<img src="${c.photo}" alt="" onerror="this.remove()">` : ""}</div>
        <div class="type">${typeOf(c.type)} <span class="energy">${energy.map(icon).join("")}</span></div>
        ${rows}
        <div class="weak">weak to ${icon(WEAK[c.type])} +20 · retreat ${"⚪".repeat(c.retreat ?? 1) || "free"}</div>
        ${o.full ? `<div class="flavor">${c.flavor}</div><div class="real">${c.real}</div>` : ""}
      </div></div>
      <div class="card__shine"></div>
      <div class="card__glare"></div>
    </div>
  </div>`;
}

function trainerHTML(t, o = {}) {
  return `<div class="trainer ${t.kind} ${t.staff ? "staff" : ""} ${o.cls || ""}" ${o.onclick ? `onclick="${o.onclick}"` : ""}>${t.photo ? `<img src="${t.photo}" alt="">` : ""}<b>${t.name}</b><small>${t.staff ? "staff · " : ""}${t.kind}</small><p>${t.text}</p></div>`;
}

document.addEventListener("pointermove", e => {
  const c = e.target.closest(".card"); if (!c) return;
  const r = c.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100));
  const y = Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100));
  c.classList.add("interacting");
  c.style.cssText = `--pointer-x:${x}%;--pointer-y:${y}%;--rotate-x:${-(x - 50) / 3.5}deg;--rotate-y:${(y - 50) / 3.5}deg;` +
    `--background-x:${37 + x * .26}%;--background-y:${33 + y * .34}%;--card-opacity:1`;
});

document.addEventListener("pointerout", e => {
  const c = e.target.closest(".card"); if (!c || c.contains(e.relatedTarget)) return;
  c.classList.remove("interacting");
  c.style.cssText = "";
});
