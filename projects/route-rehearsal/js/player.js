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

  // Shows sample i. Resolves to true if the panorama changed.
  async show(i) {
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
    this.pano.setPov({ heading: h, pitch: -2 });
    this.pano.setZoom(0);
    this.emit();
    return changed;
  }

  step(delta) { this.pause(); return this.show(this.idx + delta); }
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
    const changed = await this.show(this.idx + 1);
    if (!this.playing) return;
    let delay = 1000 / this.opts.speed;
    if (this.opts.slowTurns && this.nearTurn(this.idx)) delay *= 2.5;
    if (!changed) delay = Math.min(delay, 150); // same panorama: don't sit still
    this.timer = setTimeout(() => this.tick(), delay);
  }
}
