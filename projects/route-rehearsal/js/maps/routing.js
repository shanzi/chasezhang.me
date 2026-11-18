// Fetches a driving route and turns it into evenly spaced samples + turn instructions.
import { STEP_M, TURN_LEAD_M } from '../config.js';
import { dist, resample, stripHtml, toLL } from './geo.js';

// from / to: {lat, lng} or an address string.
async function fetchRoute(from, to) {
  const gm = window.google.maps;
  const errors = [];

  // 1) Routes API (Route.computeRoutes).
  try {
    const lib = await gm.importLibrary('routes');
    if (lib.Route && lib.Route.computeRoutes) {
      const req = { origin: from, destination: to, travelMode: 'DRIVING', fields: ['path', 'legs'] };
      const { routes } = await lib.Route.computeRoutes(req);
      if (!routes || !routes.length) throw new Error('No route found');
      const r = routes[0];
      const path = (r.path || []).map(toLL).filter(Boolean);
      const steps = [];
      for (const leg of r.legs || []) {
        for (const s of leg.steps || []) {
          const loc = toLL(s.startLocation) || (s.path && toLL(s.path[0]));
          const text = s.instructions || (s.navigationInstruction && s.navigationInstruction.instructions) || '';
          if (loc && text) steps.push({ loc, text: stripHtml(text) });
        }
      }
      if (path.length > 1) return { path, steps };
      throw new Error('Route had no path');
    }
  } catch (e) { errors.push('Routes: ' + (e.message || e)); }

  // 2) Legacy Directions service, for projects that still have it enabled.
  try {
    const res = await new gm.DirectionsService().route({
      origin: from, destination: to, travelMode: gm.TravelMode.DRIVING,
    });
    const r = res.routes[0];
    const path = [], steps = [];
    for (const leg of r.legs) {
      for (const s of leg.steps) {
        for (const p of s.path) path.push(toLL(p));
        steps.push({ loc: toLL(s.start_location), text: stripHtml(s.instructions) });
      }
    }
    return { path: path.length > 1 ? path : r.overview_path.map(toLL), steps };
  } catch (e) { errors.push('Directions: ' + (e.message || e.code || e)); }

  throw new Error('Could not get a route. ' + errors.join(' | '));
}

// Places each instruction at the distance along the route where it happens.
function placeSteps(rawSteps, samples) {
  const out = [];
  let from = 0;
  for (const st of rawSteps) {
    let best = from, bestD = Infinity;
    for (let i = from; i < samples.length; i++) {
      const dd = dist(st.loc, samples[i]);
      if (dd < bestD) { bestD = dd; best = i; }
      if (bestD < 15 && dd > 300) break; // well past a good match
    }
    from = best;
    out.push({ i: best, d: samples[best].d, lat: samples[best].lat, lng: samples[best].lng, text: st.text });
  }
  return out;
}

// Turns are the instructions after the first ("Head north…" is the start, not a turn).
// `at` is the sample a little before the turn, where turn navigation lands.
function listTurns(steps, samples) {
  return steps.filter((s) => s.d > 0).map((s, n) => {
    let at = s.i;
    while (at > 0 && samples[at - 1].d >= s.d - TURN_LEAD_M) at--;
    return { ...s, n: n + 1, at };
  });
}

// Returns {path, samples, steps, turns, total}. Each call yields a new object, so it
// can be used as an identity for "a new route was loaded".
export async function buildRoute({ from, to }) {
  const { path, steps: raw } = await fetchRoute(from, to);
  const { samples, total } = resample(path, STEP_M);
  const steps = placeSteps(raw, samples);
  return { path, samples, total, steps, turns: listTurns(steps, samples) };
}
