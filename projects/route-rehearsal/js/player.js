// Plays a route in a Street View panorama. Framework-free: the UI subscribes via
// onChange and calls play / pause / show.
import { LOOK_AHEAD_M, TURN_ZONE_M } from './config.js';
import { aheadIndex, dist, heading } from './maps/geo.js';
import { PanoResolver } from './maps/streetview.js';

export class Player {
  constructor(onChange) {
    this.onChange = onChange; // ({idx, playing, imagery}) => void
    this.pano = null;
    this.route = null;
    this.resolver = null;
    this.idx = 0;
    this.playing = false;
    this.imagery = null;      // {date, place} | {missing: true} | null
    this.opts = { speed: 2, slowTurns: true };
    this.timer = null;
    this.token = 0;
    this.lastPanoId = null;
    this.anim = 0;
  }

  // Creates the panorama inside `el`. Call once `el` is visible so it sizes correctly.
  attach(el) {
    if (this.pano) return;
    this.pano = new window.google.maps.StreetViewPanorama(el, {
      addressControl: false, linksControl: false, panControl: false,
      zoomControl: false, motionTracking: false, motionTrackingControl: false,
      enableCloseButton: false, clickToGo: false, showRoadLabels: true,
      fullscreenControl: true, visible: true,
    });
  }

  load(route) {
    this.pause();
    this.route = route;
    this.resolver = new PanoResolver(route);
    this.idx = 0;
    this.imagery = null;
    this.lastPanoId = null;
    this.emit();
  }

  setOptions(opts) { Object.assign(this.opts, opts); }

  emit() { this.onChange({ idx: this.idx, playing: this.playing, imagery: this.imagery }); }

  nearTurn(i) {
    const d = this.route.samples[i].d;
    return this.route.steps.some((s) => s.d > 0 && Math.abs(s.d - d) <= TURN_ZONE_M);
  }

  // Turns the camera to `target` degrees, easing over `ms` (0 = instantly).
  turnTo(target, ms) {
    cancelAnimationFrame(this.anim);
    const from = this.pano.getPov().heading;
    const delta = ((target - (from || 0) + 540) % 360) - 180; // shortest way round
    if (!ms || typeof from !== 'number' || Math.abs(delta) < 0.5) {
      this.pano.setPov({ heading: target, pitch: -2 });
      return;
    }
    const t0 = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.pano.setPov({ heading: from + delta * ease, pitch: -2 });
      if (t < 1) this.anim = requestAnimationFrame(frame);
    };
    this.anim = requestAnimationFrame(frame);
  }

  // Shows sample i, turning the camera over `turnMs`. Resolves to true if the panorama changed.
  async show(i, { turnMs = 0 } = {}) {
    if (!this.route || !this.pano) return false;
    const { samples } = this.route;
    i = Math.max(0, Math.min(samples.length - 1, i));
    this.idx = i;
    const tok = ++this.token;
    this.emit();

    const data = await this.resolver.resolve(i);
    if (tok !== this.token) return false; // a newer show() superseded this one
    this.resolver.commit(i, data);
    if (!data) { this.imagery = { missing: true }; this.emit(); return false; }
    this.imagery = { date: data.imageDate, place: data.location && data.location.description };

    const s = samples[i];
    const panoLL = data.location.latLng;
    const ahead = samples[aheadIndex(samples, i, LOOK_AHEAD_M)];
    const h = dist(panoLL, ahead) < 8 ? s.heading : heading(panoLL, ahead);
    const changed = data.location.pano !== this.lastPanoId;
    if (changed) { this.pano.setPano(data.location.pano); this.lastPanoId = data.location.pano; }
    this.pano.setZoom(0);
    this.turnTo(h, turnMs);
    this.emit();
    return changed;
  }

  // Moves to the next sample (dir = +1 / -1) that shows a different panorama, so every
  // step visibly moves. Samples that map to the photo already on screen are skipped.
  async advance(dir, turnMs) {
    const last = this.route.samples.length - 1;
    const tok = ++this.token;
    let i = this.idx;
    for (let k = 0; k < 12; k++) {
      const j = i + dir;
      if (j < 0 || j > last) break;
      i = j;
      const d = await this.resolver.resolve(i);
      if (tok !== this.token) return false; // superseded by another action
      if (!d || d.location.pano !== this.lastPanoId) break;
    }
    if (i === this.idx) return false;
    return this.show(i, { turnMs });
  }

  step(dir) { this.pause(); return this.advance(dir, 300); }
  jump(i) { this.pause(); return this.show(i); }
  toggle() { this.playing ? this.pause() : this.play(); }

  play() {
    if (!this.route) return;
    if (this.idx >= this.route.samples.length - 1) this.idx = 0;
    this.playing = true;
    this.emit();
    this.tick();
  }

  pause() {
    clearTimeout(this.timer);
    if (!this.playing) return;
    this.playing = false;
    this.emit();
  }

  async tick() {
    if (!this.playing) return;
    if (this.idx >= this.route.samples.length - 1) { this.pause(); return; }
    let delay = 1000 / this.opts.speed;
    if (this.opts.slowTurns && this.nearTurn(this.idx)) delay *= 2.5;
    const started = performance.now();
    await this.advance(1, Math.min(700, delay * 0.8));
    if (!this.playing) return;
    // Keep a steady rhythm: count the time spent fetching against the delay.
    this.timer = setTimeout(() => this.tick(), Math.max(0, delay - (performance.now() - started)));
  }
}
