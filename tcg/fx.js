// Visual + audio effects. Owned by the FX work. Every function is fire-and-forget and must never throw.
// Engine calls: FX.banner(text) FX.coin(heads, label?) FX.draw(fromEl, toEl) FX.victory(win) FX.hit(el, dmg, {weak, shield}) FX.ko(el) FX.energy(el) FX.play(name)
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
  btn.onclick = () => { try { localStorage.setItem("gtcg-mute", muted() ? "0" : "1"); } catch {} paint(); FX.play("click"); if (muted()) MUSIC.stop(); else if (window.G && G.phase === "play") MUSIC.start(); };
  paint(); document.body.appendChild(btn);
  document.addEventListener("click", e => { if (e.target.closest("button:not(#fx-mute), .pickable")) FX.play("click"); });

  const safe = f => (...a) => { try { f(...a); } catch (e) { console.debug("FX", e); } };

  // ---- background music: an original 8-bit battle loop (square lead, triangle bass, noise hats), no files ----
  // Notes are semitones from A4. 160 BPM, 16th-note grid, 4 bars looping.
  const MUSIC = (() => {
    const LEAD = [0,0,3,0,7,0,3,0, 0,0,3,0,10,7,3,0,  -4,-4,0,-4,3,-4,0,-4, -2,-2,2,-2,5,-2,2,-2,
                  0,0,3,0,7,0,3,0, 0,0,3,0,10,7,3,0,  -5,-2,2,7,5,2,-2,-5, 0,3,7,12,10,7,3,0];
    const BASS = [-24,-24,-24,-24,-24,-24,-24,-24, -28,-28,-28,-28,-26,-26,-26,-26, -24,-24,-24,-24,-24,-24,-24,-24, -29,-29,-29,-29,-24,-24,-24,-24];
    const f = n => 440 * Math.pow(2, n / 12);
    let on = false, step = 0, next = 0, timer = null, master = null, noise = null;
    function tone(c, type, freq, t, dur, vol) {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    function hat(c, t, vol) {
      if (!noise) { const n = c.sampleRate * 0.05, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; noise = buf; }
      const s = c.createBufferSource(), g = c.createGain(), hp = c.createBiquadFilter(); s.buffer = noise; hp.type = "highpass"; hp.frequency.value = 6000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); s.connect(hp); hp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.05);
    }
    function tick() {
      const c = audio(); if (!c || !on) return;
      const spb = 60 / 160 / 4; // seconds per 16th
      while (next < c.currentTime + 0.15) {
        const i = step % 64;
        tone(c, "square", f(LEAD[i]), next, spb * 0.9, 0.045);
        if (i % 2 === 0) tone(c, "triangle", f(BASS[(i / 2) % 32]), next, spb * 1.8, 0.07);
        hat(c, next, i % 4 === 0 ? 0.035 : 0.015);
        next += spb; step++;
      }
    }
    return {
      start() { if (on || muted()) return; const c = audio(); if (!c) return; on = true; step = 0; next = c.currentTime + 0.05;
        master = master || c.createGain(); master.gain.value = 0.5; master.connect(c.destination); timer = setInterval(tick, 40); tick(); },
      stop() { on = false; clearInterval(timer); timer = null; },
      get playing() { return on; },
    };
  })();

  // card draw: a card back slides from a deck stack into a hand, then fades as the real hand re-renders beneath it
  const DRAW = safe((fromEl, toEl) => {
    const a = rect(fromEl), b = rect(toEl); if (!a || !b) return;
    const back = typeof cardBackHTML === "function" ? cardBackHTML() : `<div style="width:100%;height:100%;background:#0b0b0d;border:3px solid #c9a227;border-radius:10px"></div>`;
    const w = spawn("fx-draw", back, 700, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px",
      "--dx": (b.left + b.width / 2 - a.left - a.width / 2) + "px", "--dy": (b.top + b.height / 2 - a.top - a.height / 2) + "px", "--sc": (b.width / a.width).toFixed(3) });
    const c = w.firstElementChild; if (c && c.classList) { c.style.zoom = ""; const cr = c.getBoundingClientRect(); if (cr.width) c.style.transform = `scale(${a.width / cr.width})`; c.style.transformOrigin = "0 0"; }
    FX.play("click");
  });

  // victory finale: a burst of gold sparkles rising across the screen (win) or a quiet grey settle (loss)
  const VICTORY = safe(win => {
    const layer = spawn("fx-victory " + (win ? "win" : "lose"), "", 3200, {});
    const n = win ? 46 : 14;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      const size = 4 + Math.random() * 8, x = Math.random() * 100, delay = Math.random() * 900, dur = 1400 + Math.random() * 1400;
      s.style.cssText = `left:${x}%;bottom:-20px;width:${size}px;height:${size}px;animation-delay:${delay}ms;animation-duration:${dur}ms`;
      layer.appendChild(s);
    }
  });
  window.FX = {
    victory: VICTORY,
    draw: DRAW,
    music: MUSIC,
    banner: safe(text => {
      spawn("fx-banner", `<span>${esc(text)}</span>`, 900); FX.play("banner");
    }),
    coin: safe((heads, label) => {
      spawn("fx-coin " + (heads ? "heads" : "tails"),
        `<div class="toss"><div class="coin"><div class="f h"></div><div class="f t"></div></div><div class="shadow"></div></div><div class="lbl">${esc(label || (heads ? "Heads!" : "Tails…"))}</div>`, label ? 2400 : 1900);
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
