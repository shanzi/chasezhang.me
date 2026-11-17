// Picks the Street View panorama to show for each route sample.
//
// Once we are on a road panorama we move by following its links (the arrows you'd click
// in Street View), always to the linked panorama closest to the next route point. Road
// panoramas link along the road, so this does not drop into subway stations, garages or
// user photo spheres the way "nearest panorama" can. We only search by location to get
// started, after a jump, or when the road links run out.
import { MAX_HOPS, OFF_ROUTE_M, PANO_RADIUS_M, REANCHOR_M } from '../config.js';
import { dist } from './geo.js';

export class PanoResolver {
  constructor(route) {
    const gm = window.google.maps;
    this.samples = route.samples;
    this.service = new gm.StreetViewService();
    this.line = new gm.Polyline({ path: route.path }); // never shown; used for on-route checks
    this.byId = new Map();     // pano id -> Promise<data|null>
    this.anchors = new Map();  // sample index -> Promise<data|null>
    this.current = null;       // last resolved panorama data
    this.currentIdx = -1;
  }

  onRoute(latLng) {
    return window.google.maps.geometry.poly.isLocationOnEdge(latLng, this.line, OFF_ROUTE_M / 111320);
  }

  // Google's own imagery (not a user upload), linked to neighbours, on the route.
  isRoadPano(d) {
    return !!(d && d.location && d.location.latLng &&
      /google/i.test(d.copyright || '') &&
      (d.links || []).some((l) => l && l.pano) &&
      this.onRoute(d.location.latLng));
  }

  remember(data) {
    if (data && data.location && !this.byId.has(data.location.pano)) this.byId.set(data.location.pano, Promise.resolve(data));
    return data;
  }

  getById(id) {
    if (!this.byId.has(id)) {
      this.byId.set(id, this.service.getPanorama({ pano: id }).then((r) => r.data).catch(() => null));
    }
    return this.byId.get(id);
  }

  findAnchor(i) {
    if (!this.anchors.has(i)) {
      const gm = window.google.maps;
      const s = this.samples[i];
      this.anchors.set(i, this.service.getPanorama({
        location: { lat: s.lat, lng: s.lng }, radius: PANO_RADIUS_M,
        source: gm.StreetViewSource.OUTDOOR, preference: gm.StreetViewPreference.NEAREST,
      }).then((r) => this.remember(r.data)).then((d) => (this.isRoadPano(d) ? d : null)).catch(() => null));
    }
    return this.anchors.get(i);
  }

  async walkToward(start, target) {
    let cur = start;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const dCur = dist(cur.location.latLng, target);
      if (dCur < 4) break;
      const ids = (cur.links || []).map((l) => l && l.pano).filter(Boolean);
      const cands = await Promise.all(ids.map((id) => this.getById(id)));
      let best = null, bestD = dCur - 0.5;
      for (const c of cands) {
        if (!this.isRoadPano(c)) continue;
        const d = dist(c.location.latLng, target);
        if (d < bestD) { best = c; bestD = d; }
      }
      if (!best) break;
      cur = best;
    }
    return cur;
  }

  // Resolves with panorama data for sample i, or null when there is no road imagery nearby.
  async resolve(i) {
    const target = this.samples[i];
    let data = null;
    if (this.current && Math.abs(i - this.currentIdx) <= 4) {
      const walked = await this.walkToward(this.current, target);
      if (dist(walked.location.latLng, target) <= REANCHOR_M) data = walked;
    }
    if (!data) data = await this.findAnchor(i);
    if (!data && this.current && dist(this.current.location.latLng, target) <= REANCHOR_M) data = this.current;
    return data;
  }

  // Marks `data` as shown for sample i and prefetches its neighbours.
  commit(i, data) {
    if (!data) return;
    this.current = data;
    this.currentIdx = i;
    // Prefetch two hops ahead so the next steps don't wait on the network.
    for (const l of data.links || []) {
      if (l && l.pano) this.getById(l.pano).then((n) => (n && n.links || []).forEach((m) => m && m.pano && this.getById(m.pano)));
    }
  }
}
