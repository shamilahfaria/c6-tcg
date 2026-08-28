// Visual + audio effects. Owned by the FX work. Every function is fire-and-forget and must never throw.
// Engine calls: FX.banner(text) FX.coin(heads) FX.hit(el, dmg, {weak, shield}) FX.ko(el) FX.energy(el) FX.play(name)
// All visuals are overlays appended to <body>, positioned from the target's rect at call time: the engine re-renders #app right after.
(() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = ms => RM ? Math.min(ms, 250) : ms;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rect = el => { const r = el && el.getBoundingClientRect && el.getBoundingClientRect(); return r && r.width ? r : null; };
  const at = r => ({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });

  // overlay element, self-removing after ms
  function spawn(cls, html, ms, style) {
    const d = document.createElement("div");
    d.className = "fx " + cls; d.innerHTML = html; d.style.setProperty("--t", T(ms) + "ms");
    for (const k in style) k[0] === "-" ? d.style.setProperty(k, style[k]) : d.style[k] = style[k];
    document.body.appendChild(d); setTimeout(() => d.remove(), T(ms) + 60);
    return d;
  }

  // a fixed copy of the card over its own rect; the real card is hidden by uid via a temporary style rule so the copy survives re-renders
  function ghost(el, r, ms) {
    const c = el.cloneNode(true); c.style.cssText = ""; c.classList.remove("interacting", "pickable"); c.removeAttribute("data-uid"); c.removeAttribute("onclick");
    const w = spawn("fx-ghost", "", ms, at(r)); w.appendChild(c);
    const cr = c.getBoundingClientRect(); if (cr.width) c.style.transform = `scale(${r.width / cr.width})`;
    const uid = el.dataset && el.dataset.uid;
    if (uid) { // transition:none because holo.css transitions "all", which would delay the hide
      const s = document.createElement("style"); s.textContent = `[data-uid="${uid}"],[data-uid="${uid}"] *{visibility:hidden!important;transition:none!important}`;
      document.head.appendChild(s); setTimeout(() => s.remove(), T(ms));
    }
    return w;
  }

  // ---- audio: lazy context, synthesized tones, no files ----
  let ctx, gestured = false;
  const muted = () => { try { return localStorage.getItem("gtcg-mute") === "1"; } catch { return false; } };
  function audio() {
    if (!gestured) return null;
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  addEventListener("pointerdown", () => { gestured = true; try { audio(); } catch {} }, { capture: true });

  function tone(c, { type = "sine", f = 440, f2, t = 0, dur = .2, g = .3 }) {
    const o = c.createOscillator(), a = c.createGain(), now = c.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, now); if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
    a.gain.setValueAtTime(.0001, now); a.gain.linearRampToValueAtTime(g, now + .012); a.gain.exponentialRampToValueAtTime(.0001, now + dur);
    o.connect(a).connect(c.destination); o.start(now); o.stop(now + dur + .05);
  }
  function noise(c, { t = 0, dur = .15, g = .3, f = 800, f2, q = 1 }) {
    const n = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), a = c.createGain(), now = c.currentTime + t;
    s.buffer = b; bp.type = "bandpass"; bp.Q.value = q; bp.frequency.setValueAtTime(f, now); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, now + dur);
    a.gain.setValueAtTime(g, now); a.gain.exponentialRampToValueAtTime(.0001, now + dur);
    s.connect(bp).connect(a).connect(c.destination); s.start(now); s.stop(now + dur);
  }
  const SOUNDS = {
    hit: c => { tone(c, { f: 150, f2: 40, dur: .18, g: .55 }); noise(c, { dur: .07, g: .3, f: 500 }); },
    super: c => { SOUNDS.hit(c); tone(c, { type: "square", f: 520, f2: 1500, t: .07, dur: .22, g: .1 }); tone(c, { f: 1040, f2: 2400, t: .1, dur: .22, g: .1 }); },
    ko: c => { tone(c, { type: "sawtooth", f: 420, f2: 55, dur: .65, g: .15 }); tone(c, { f: 220, f2: 40, dur: .65, g: .3 }); noise(c, { dur: .12, g: .2, f: 300 }); },
    energy: c => { tone(c, { f: 880, dur: .22, g: .16 }); tone(c, { f: 1320, t: .06, dur: .32, g: .12 }); tone(c, { type: "triangle", f: 1760, t: .1, dur: .3, g: .05 }); },
    coin: c => { [2500, 3760, 5300].forEach((f, i) => tone(c, { f, dur: .55 - i * .12, g: .12 / (i + 1) })); noise(c, { dur: .04, g: .15, f: 5000, q: 4 }); tone(c, { f: 2500, t: 1.1, dur: .35, g: .08 }); },
    banner: c => noise(c, { dur: .5, g: .22, f: 300, f2: 2400, q: .8 }),
    click: c => tone(c, { type: "square", f: 1900, dur: .025, g: .07 }),
  };

  // ---- mute toggle: the only permanent DOM we own, appended to <body> once (survives #app re-renders) ----
  const btn = document.createElement("button"); btn.id = "fx-mute"; btn.type = "button";
  const paint = () => { btn.textContent = muted() ? "🔇" : "🔊"; btn.title = muted() ? "Unmute" : "Mute"; btn.setAttribute("aria-label", btn.title); };
  btn.onclick = () => { try { localStorage.setItem("gtcg-mute", muted() ? "0" : "1"); } catch {} paint(); FX.play("click"); };
  paint(); document.body.appendChild(btn);
  document.addEventListener("click", e => { if (e.target.closest("button:not(#fx-mute), .pickable")) FX.play("click"); });

  const safe = f => (...a) => { try { f(...a); } catch (e) { console.debug("FX", e); } };
  window.FX = {
    banner: safe(text => {
      spawn("fx-banner", `<span>${esc(text)}</span>`, 900); FX.play("banner");
    }),
    coin: safe(heads => {
      spawn("fx-coin " + (heads ? "heads" : "tails"),
        `<div class="toss"><div class="coin"><div class="f h"></div><div class="f t">G</div></div><div class="shadow"></div></div><div class="lbl">${heads ? "Heads!" : "Tails…"}</div>`, 1900);
      FX.play("coin");
    }),
    hit: safe((el, dmg, o = {}) => {
      const r = rect(el); if (!r) return;
      ghost(el, r, 800).classList.add("shake");
      spawn("fx-hit" + (o.weak ? " weak" : ""), `<div class="flash"></div><div class="num">-${+dmg || 0}${o.weak ? "<small>Weak!</small>" : ""}${o.shield ? "<small class=sh>Shield</small>" : ""}</div>`, 800, at(r));
    }),
    ko: safe(el => {
      const r = rect(el); if (!r) return;
      ghost(el, r, 700).classList.add("fall");
      spawn("fx-ko", "<b>K.O.</b>", 700, at(r));
    }),
    energy: safe(el => {
      const r = rect(el); if (!r) return;
      const zr = rect(document.querySelector(".zone"));
      const x0 = zr ? zr.left + zr.width / 2 : innerWidth - 60, y0 = zr ? zr.top + zr.height / 2 : innerHeight - 60;
      const x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
      const col = getComputedStyle(el).getPropertyValue("--c2").trim() || "#ffcc33";
      spawn("fx-orb", "<i></i>", 500, { left: x0 + "px", top: y0 + "px", "--dx": x1 - x0 + "px", "--dy": y1 - y0 + "px", "--col": col });
      setTimeout(() => spawn("fx-burst", "<i></i><i></i><i></i><i></i><i></i><i></i>", 400, { left: x1 + "px", top: y1 + "px", "--col": col }), T(500) - 40);
    }),
    play: safe(name => {
      if (muted() || !SOUNDS[name]) return;
      const c = audio(); if (c) SOUNDS[name](c);
    }),
  };
})();
