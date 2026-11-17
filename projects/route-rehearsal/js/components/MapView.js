// Map panel: start/end markers, click-to-pick popup, place search, satellite toggle,
// the route line and the car marker. Google Maps objects are imperative, so they live
// in a ref and are synced to props in effects.
import { html, render, useEffect, useRef } from '../vendor/preact-htm.js';
import { DEFAULT_VIEW, JUMP_RADIUS_M } from '../config.js';
import { fmtCoords, nearestSample, toLL } from '../maps/geo.js';

// Contents of the popup shown for a clicked or searched location.
function PickMenu({ title, fromSet, onPick, onJump }) {
  return html`
    <div class="pick">
      ${title && html`<div class="pick-title">${title}</div>`}
      <div class="pick-actions">
        ${onJump && html`<button class="primary" onClick=${onJump}>Jump here</button>`}
        <button class=${!onJump && !fromSet ? 'primary' : ''} onClick=${() => onPick('from')}>Start here</button>
        <button class=${!onJump && fromSet ? 'primary' : ''} onClick=${() => onPick('to')}>End here</button>
      </div>
    </div>`;
}

const fitAfterLayout = (map, path) => {
  // Wait for the map to notice a container resize before fitting into it.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const b = new window.google.maps.LatLngBounds();
    path.forEach((p) => b.extend(p));
    map.fitBounds(b, 40);
  }));
};

const TURN_LEAD_M = 40; // clicking a turn marker jumps to this far before the turn

function turnIcon(next) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE, scale: next ? 11 : 9,
    fillColor: next ? '#e37400' : '#1a73e8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2,
  };
}

export function MapView({ mode, from, to, route, car, nextTurn, onPick, onJump, onNotice }) {
  const el = useRef(null);
  const g = useRef(null); // {map, info, markers, line, car}
  const latest = useRef(null);
  latest.current = { mode, route, from, onPick, onJump, onNotice };

  function openPicker(latLng, title) {
    const { map, info } = g.current;
    const L = latest.current;
    let onJumpHere = null;
    if (L.mode === 'drive' && L.route) {
      const n = nearestSample(L.route.samples, latLng);
      if (n.d < JUMP_RADIUS_M) onJumpHere = () => { info.close(); L.onJump(n.i); };
    }
    const pick = (which) => {
      info.close();
      latest.current.onPick(which, { text: title || fmtCoords(latLng), ll: toLL(latLng) });
    };
    const box = document.createElement('div');
    render(html`<${PickMenu} title=${title} fromSet=${!!L.from.text.trim()} onPick=${pick} onJump=${onJumpHere} />`, box);
    info.setContent(box);
    info.setPosition(latLng);
    info.open({ map });
  }

  async function addSearch(map) {
    const gm = window.google.maps;
    try {
      const { PlaceAutocompleteElement } = await gm.importLibrary('places');
      const ac = new PlaceAutocompleteElement();
      const wrap = document.createElement('div');
      wrap.className = 'search';
      wrap.appendChild(ac);
      map.controls[gm.ControlPosition.TOP_LEFT].push(wrap);
      map.addListener('idle', () => { ac.locationBias = map.getBounds(); });
      const onSelect = async (ev) => {
        try {
          const place = ev.placePrediction ? ev.placePrediction.toPlace() : ev.place;
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'viewport'] });
          if (place.viewport) map.fitBounds(place.viewport);
          else { map.setCenter(place.location); map.setZoom(17); }
          openPicker(place.location, place.displayName || place.formattedAddress);
        } catch (e) {
          latest.current.onNotice('Search failed: ' + (e.message || e), true);
        }
      };
      ac.addEventListener('gmp-select', onSelect);      // current API
      ac.addEventListener('gmp-placeselect', onSelect); // older API versions
      ac.addEventListener('gmp-error', () =>
        latest.current.onNotice('Place search is unavailable (is Places API (New) enabled for this key?).', true));
    } catch (e) {
      latest.current.onNotice('Place search is unavailable: ' + (e.message || e), true);
    }
  }

  // Create the map once.
  useEffect(() => {
    const gm = window.google.maps;
    const map = new gm.Map(el.current, {
      ...DEFAULT_VIEW,
      clickableIcons: false, streetViewControl: false, fullscreenControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: { // "Map" (+ Terrain) / "Satellite" (+ Labels)
        style: gm.MapTypeControlStyle.HORIZONTAL_BAR,
        position: gm.ControlPosition.LEFT_BOTTOM, // keeps the top free for search
      },
    });
    g.current = { map, info: new gm.InfoWindow(), markers: {}, line: null, car: null, turns: [] };
    map.addListener('click', (e) => openPicker(e.latLng));
    addSearch(map);

    // Frame any points restored from the URL.
    const pts = [from.ll, to.ll].filter(Boolean);
    if (pts.length === 2) fitAfterLayout(map, pts);
    else if (pts.length === 1) { map.setCenter(pts[0]); map.setZoom(15); }
  }, []);

  // Start / end markers follow the chosen points; dragging one updates it.
  useEffect(() => {
    const gm = window.google.maps;
    const { map, markers } = g.current;
    for (const [which, pt] of [['from', from], ['to', to]]) {
      let m = markers[which];
      if (!pt.ll) { if (m) { m.setMap(null); delete markers[which]; } continue; }
      if (!m) {
        m = markers[which] = new gm.Marker({
          map, draggable: true, zIndex: 5,
          label: { text: which === 'from' ? 'A' : 'B', color: '#fff', fontWeight: '700' },
          title: (which === 'from' ? 'Start' : 'End') + ' (drag to move)',
        });
        m.addListener('dragend', (e) =>
          latest.current.onPick(which, { text: fmtCoords(e.latLng), ll: toLL(e.latLng) }));
      }
      m.setPosition(pt.ll);
    }
  }, [from.ll, to.ll]);

  // Route line.
  useEffect(() => {
    const { map } = g.current;
    if (g.current.line) g.current.line.setMap(null);
    g.current.line = route && new window.google.maps.Polyline({
      path: route.path, map, strokeColor: '#1a73e8', strokeOpacity: 0.85, strokeWeight: 5,
    });
  }, [route]);

  // Numbered marker at every turn; clicking one jumps to just before it.
  useEffect(() => {
    const gm = window.google.maps;
    const { map } = g.current;
    g.current.turns.forEach((t) => t.marker.setMap(null));
    g.current.turns = [];
    if (!route) return;
    let n = 0;
    route.steps.forEach((s, k) => {
      if (s.d <= 0) return; // the first instruction ("Head north…") is the start, not a turn
      n++;
      const marker = new gm.Marker({
        map, position: s, zIndex: 6, icon: turnIcon(false), title: `${n}. ${s.text}`,
        label: { text: String(n), color: '#fff', fontSize: '11px', fontWeight: '700' },
      });
      marker.addListener('click', () => {
        let j = s.i;
        while (j > 0 && route.samples[j - 1].d >= s.d - TURN_LEAD_M) j--;
        latest.current.onJump(j);
      });
      g.current.turns.push({ k, marker });
    });
  }, [route]);

  // Highlight the next upcoming turn.
  useEffect(() => {
    for (const t of g.current.turns) {
      const next = t.k === nextTurn;
      t.marker.setIcon(turnIcon(next));
      t.marker.setZIndex(next ? 8 : 6);
    }
  }, [route, nextTurn]);

  // Fit the route whenever we (re)enter drive mode; the map has just shrunk.
  useEffect(() => {
    g.current.info.close();
    if (mode === 'drive' && route) fitAfterLayout(g.current.map, route.path);
  }, [mode, route]);

  // Car marker shows the current Street View position.
  useEffect(() => {
    const gm = window.google.maps;
    const { map } = g.current;
    if (!car) { if (g.current.car) g.current.car.setMap(null); g.current.car = null; return; }
    const icon = {
      path: gm.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, rotation: car.heading,
      fillColor: '#e37400', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2,
    };
    if (!g.current.car) g.current.car = new gm.Marker({ map, zIndex: 10, clickable: false });
    g.current.car.setIcon(icon);
    g.current.car.setPosition(car);
    const b = map.getBounds();
    if (b && !b.contains(car)) map.panTo(car);
  }, [car]);

  return html`<div class="map" ref=${el}></div>`;
}
