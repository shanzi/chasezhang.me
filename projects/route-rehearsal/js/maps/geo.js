// Geometry and formatting helpers. Functions that measure distances need the
// Maps API (geometry library) to be loaded first.
import { LOOK_AHEAD_M } from '../config.js';

const gm = () => window.google.maps;
const asLatLng = (p) => (p instanceof gm().LatLng ? p : new (gm().LatLng)(p));

export const dist = (a, b) => gm().geometry.spherical.computeDistanceBetween(asLatLng(a), asLatLng(b));
export const heading = (a, b) => gm().geometry.spherical.computeHeading(asLatLng(a), asLatLng(b));

// Normalises LatLng, LatLngLiteral, or objects carrying one under .latLng / .location.
export function toLL(p) {
  if (!p) return null;
  if (p.latLng) return toLL(p.latLng);
  if (p.location) return toLL(p.location);
  const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
  const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
}

// "lat,lng" -> {lat, lng}; anything else -> null.
export function parseCoords(s) {
  const m = String(s || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}

export function fmtCoords(ll) {
  const p = toLL(ll);
  return p.lat.toFixed(6) + ',' + p.lng.toFixed(6);
}

export function fmtDist(m, units) {
  if (units === 'mi') {
    const mi = m / 1609.344;
    return mi < 0.1 ? Math.round(m * 3.28084 / 10) * 10 + ' ft' : mi.toFixed(mi < 10 ? 1 : 0) + ' mi';
  }
  return m < 1000 ? Math.round(m / 5) * 5 + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km';
}

export function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

// Index of the first sample at least `meters` further along the route than sample i.
export function aheadIndex(samples, i, meters) {
  let j = i;
  while (j < samples.length - 1 && samples[j].d < samples[i].d + meters) j++;
  return j;
}

// Evenly spaced points along a path: [{lat, lng, d, heading}], d = metres from start.
export function resample(path, spacing) {
  const out = [{ lat: path[0].lat, lng: path[0].lng, d: 0 }];
  let cum = 0, carry = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = asLatLng(path[i]), b = asLatLng(path[i + 1]);
    const seg = dist(a, b);
    if (seg === 0) continue;
    let pos = spacing - carry;
    while (pos <= seg) {
      const p = gm().geometry.spherical.interpolate(a, b, pos / seg);
      out.push({ lat: p.lat(), lng: p.lng(), d: cum + pos });
      pos += spacing;
    }
    carry = seg - (pos - spacing);
    cum += seg;
  }
  const last = path[path.length - 1];
  if (cum - out[out.length - 1].d > spacing * 0.3) out.push({ lat: last.lat, lng: last.lng, d: cum });
  // Direction of travel at each sample (fallback when a panorama sits right on the point).
  for (let i = 0; i < out.length; i++) {
    const j = aheadIndex(out, i, LOOK_AHEAD_M);
    out[i].heading = j === i && i > 0 ? out[i - 1].heading : heading(out[i], out[j === i ? Math.max(0, i - 1) : j]);
  }
  return { samples: out, total: cum };
}

export function nearestSample(samples, latLng) {
  let i = -1, d = Infinity;
  for (let k = 0; k < samples.length; k++) {
    const dd = dist(latLng, samples[k]);
    if (dd < d) { d = dd; i = k; }
  }
  return { i, d };
}
