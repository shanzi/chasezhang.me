// Fetches a driving route through a sequence of stops and turns it into evenly spaced
// samples, turn instructions and stop positions.
import { STEP_M, TURN_LEAD_M } from '../config.js';
import { dist, resample, stripHtml, toLL } from './geo.js';

// points: [{lat, lng}, ...] (at least two). Each leg runs between consecutive points.
// Returns {path, steps: [{loc, text, leg, first}]}.
async function fetchRoute(points) {
  const gm = window.google.maps;
  const origin = points[0], destination = points[points.length - 1], middle = points.slice(1, -1);
  const errors = [];

  // 1) Routes API (Route.computeRoutes).
  try {
    const lib = await gm.importLibrary('routes');
    if (lib.Route && lib.Route.computeRoutes) {
      const req = { origin, destination, travelMode: 'DRIVING', fields: ['path', 'legs'] };
      if (middle.length) req.intermediates = middle.map((p) => ({ location: p }));
      const { routes } = await lib.Route.computeRoutes(req);
      if (!routes || !routes.length) throw new Error('No route found');
      const r = routes[0];
      const path = (r.path || []).map(toLL).filter(Boolean);
      const steps = [];
      (r.legs || []).forEach((leg, li) => {
        (leg.steps || []).forEach((s, si) => {
          const loc = toLL(s.startLocation) || (s.path && toLL(s.path[0]));
          const text = s.instructions || (s.navigationInstruction && s.navigationInstruction.instructions) || '';
          if (loc && text) steps.push({ loc, text: stripHtml(text), leg: li, first: si === 0 });
        });
      });
      if (path.length > 1) return { path, steps };
      throw new Error('Route had no path');
    }
  } catch (e) { errors.push('Routes: ' + (e.message || e)); }

  // 2) Legacy Directions service, for projects that still have it enabled.
  try {
    const res = await new gm.DirectionsService().route({
      origin, destination, travelMode: gm.TravelMode.DRIVING,
      waypoints: middle.map((p) => ({ location: p, stopover: true })),
    });
    const r = res.routes[0];
    const path = [], steps = [];
    r.legs.forEach((leg, li) => {
      leg.steps.forEach((s, si) => {
        for (const p of s.path) path.push(toLL(p));
        steps.push({ loc: toLL(s.start_location), text: stripHtml(s.instructions), leg: li, first: si === 0 });
      });
    });
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
    const s = samples[best];
    out.push({ i: best, d: s.d, lat: s.lat, lng: s.lng, text: st.text, leg: st.leg, first: st.first });
  }
  return out;
}

// Stop k sits where leg k starts; the last stop is the end of the route.
function placeStops(stops, steps, samples) {
  return stops.map((p, k) => {
    let i = 0;
    if (k === stops.length - 1) i = samples.length - 1;
    else if (k > 0) { const s = steps.find((x) => x.leg === k && x.first); i = s ? s.i : 0; }
    return { ...p, k, i, d: samples[i].d };
  });
}

// Turns are the instructions that are not the start of a leg ("Head north…").
// `at` is the sample a little before the turn, where turn navigation lands.
function listTurns(steps, samples) {
  return steps.filter((s) => !s.first).map((s, n) => {
    let at = s.i;
    while (at > 0 && samples[at - 1].d >= s.d - TURN_LEAD_M) at--;
    return { ...s, n: n + 1, at };
  });
}

// stops: [{text, ll}] (at least two). Returns {path, samples, steps, turns, stops, total}.
// Each call yields a new object, so it can be used as an identity for "a new route was loaded".
export async function buildRoute(stops) {
  const { path, steps: raw } = await fetchRoute(stops.map((s) => s.ll));
  const { samples, total } = resample(path, STEP_M);
  const steps = placeSteps(raw, samples);
  const placed = placeStops(stops, steps, samples);
  // The HUD reads steps; mention the stop when a new leg begins.
  for (const s of steps) if (s.first && s.leg > 0) s.text = `Stop ${stopLabel(s.leg)}, then ${s.text.charAt(0).toLowerCase()}${s.text.slice(1)}`;
  return { path, samples, total, steps, turns: listTurns(steps, samples), stops: placed };
}

export const stopLabel = (k) => (k < 26 ? String.fromCharCode(65 + k) : String(k + 1));
