// Visual + audio effects. Owned by the FX work. Every function is fire-and-forget and must never throw.
// Engine calls: FX.banner(text) FX.coin(heads) FX.hit(el, dmg, {weak, shield}) FX.ko(el) FX.energy(el) FX.play(name)
window.FX = {
  banner(text) {},
  coin(heads) {},
  hit(el, dmg, opts) {},
  ko(el) {},
  energy(el) {},
  play(name) {},
};
