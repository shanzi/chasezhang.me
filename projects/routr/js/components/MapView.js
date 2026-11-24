// Map panel: the stop stack card, stop markers, click-to-add popup, place search,
// Map / Satellite switch, the route line, turn markers and the car marker. Google Maps
// objects are imperative, so they live in a ref and are synced to props in effects.
import { html, render, useEffect, useRef, useState } from '../vendor/preact-htm.js';
import { DEFAULT_VIEW, JUMP_RADIUS_M, MAX_STOPS } from '../config.js';
import { fmtDist, nearestSample, toLL } from '../maps/geo.js';
import { stopLabel } from '../maps/routing.js';
import { StopsPanel, stopColor } from './StopsPanel.js';
import { SearchBox } from './SearchBox.js';

function PopupHeader({ title, sub }) {
  return html`
    <div class="pick-head">
      <div class="pick-title">${title}</div>
      <div class="pick-sub">${sub}</div>
    </div>`;
}

// Map / Satellite switch. Satellite uses the "hybrid" type so labels always show.
const MAP_TYPES = [
  { id: 'roadmap', label: 'Map' },
  { id: 'hybrid', label: 'Satellite' },
];
function MapTypeSwitch({ map }) {
  const [type, setType] = useState(map.getMapTypeId());
  const choose = (id) => { map.setMapTypeId(id); setType(id); };
  return html`
    <div class="maptype" role="radiogroup" aria-label="Map style">
      ${MAP_TYPES.map((t) => html`
        <button type="button" role="radio" aria-checked=${type === t.id}
          class=${type === t.id ? 'on' : ''} onClick=${() => choose(t.id)}>${t.label}</button>`)}
    </div>`;
}

// Teardrop pin with the stop letter inside.
function pinIcon(color) {
  const gm = window.google.maps;
  return {
    path: 'M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 34 12 34s12-13.6 12-22.3C24 5.2 18.6 0 12 0z',
    fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1.5,
    scale: 1.1, anchor: new gm.Point(12, 34), labelOrigin: new gm.Point(12, 12),
  };
}

function turnIcon(next) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE, scale: next ? 10 : 8,
    fillColor: next ? '#e37400' : '#1a73e8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2,
  };
}

// Width of the map hidden behind the stops card on the left (0 if the card is
// missing or would leave less than `room` px of map beside it).
const cardCover = (map, room) => {
  const el = map.getDiv(), side = el.parentElement.querySelector('.side');
  if (!side) return 0;
  const m = el.getBoundingClientRect(), c = side.getBoundingClientRect();
  const cover = c.right - m.left;
  return cover > 0 && m.width - cover >= room ? cover : 0;
};

const fitAfterLayout = (map, pts) => {
  // Wait for the map to notice a container resize before fitting into it.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const b = new window.google.maps.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    const cover = cardCover(map, 400); // fit beside the card only if that still leaves a useful area
    map.fitBounds(b, cover ? { top: 60, right: 60, bottom: 60, left: cover + 40 } : 60);
  }));
};

export function MapView({ mode, stops, route, idx, car, nextTurn, onAdd, onMove, onRemove, onReorder, onDuplicate, onClear, onJump, onNotice, actions, recenter }) {
  const el = useRef(null);
  const [searchKey, setSearchKey] = useState(0); // bumped to get a fresh, empty search box
  const g = useRef(null); // {map, info, stopMarkers, line, car, turns}
  const latest = useRef(null);
  latest.current = { mode, route, stops, car, onAdd, onJump, onNotice };

  function showPopup(head, body, position) {
    const { map, info } = g.current;
    if (info.setHeaderContent) info.setHeaderContent(head); // title sits beside the close button
    else body.prepend(head);
    info.setContent(body);
    info.setPosition(position);
    info.open({ map });
  }

  // Planning: offer to add the point as the next stop.
  // Driving: points near the route offer "Jump here"; others do nothing.
  // opts.sub replaces the coordinates line (e.g. with an address); opts.fromSearch clears
  // the search box once the place is added.
  function openPopup(latLng, title, opts = {}) {
    const { info } = g.current;
    const L = latest.current;
    const ll = toLL(latLng);
    const head = document.createElement('div');
    const body = document.createElement('div');
    if (L.mode === 'drive' && L.route) {
      const n = nearestSample(L.route.samples, ll);
      if (n.d >= JUMP_RADIUS_M) { info.close(); return; }
      const s = L.route.samples[n.i];
      render(html`<${PopupHeader} title="On route" sub=${fmtDist(s.d) + ' from start'} />`, head);
      render(html`<div class="pick">
        <button type="button" class="pick-main" onClick=${() => { info.close(); L.onJump(n.i); }}>Jump here</button>
      </div>`, body);
      showPopup(head, body, { lat: s.lat, lng: s.lng });
      return;
    }
    const k = L.stops.length;
    const full = k >= MAX_STOPS;
    render(html`<${PopupHeader} title=${title || 'Dropped pin'} sub=${opts.sub || ll.lat.toFixed(5) + ', ' + ll.lng.toFixed(5)} />`, head);
    const add = () => {
      info.close();
      L.onAdd({ text: title || '', ll });
      if (opts.fromSearch) setSearchKey((n) => n + 1); // fresh, empty search box
    };
    render(html`<div class="pick">
      <button type="button" class="pick-main" disabled=${full} onClick=${add}>
        <span class="pin-badge" style=${{ background: stopColor(k, k + 1) }}>${stopLabel(k)}</span>
        ${full ? `Up to ${MAX_STOPS} stops` : k === 0 ? 'Start here' : 'Add stop'}
      </button>
    </div>`, body);
    showPopup(head, body, ll);
  }

  // A searched place is shown on the map with the usual popup; it is added only when
  // the user confirms there.
  function onSearchPlace(place) {
    const { map } = g.current;
    if (place.viewport) map.fitBounds(place.viewport);
    else { map.setCenter(place.ll); map.setZoom(17); }
    openPopup(place.ll, place.text, { sub: place.address, fromSearch: true });
  }

  // Clicking a business, station or other labelled place on the map uses its name.
  async function onPlaceIcon(placeId, latLng) {
    try {
      const { Place } = await window.google.maps.importLibrary('places');
      const p = new Place({ id: placeId });
      await p.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      openPopup(p.location || latLng, p.displayName || '', { sub: p.formattedAddress });
    } catch (e) {
      openPopup(latLng); // no Places access: fall back to coordinates
    }
  }

  // Create the map once.
  useEffect(() => {
    const gm = window.google.maps;
    const map = new gm.Map(el.current, {
      ...DEFAULT_VIEW,
      clickableIcons: true, streetViewControl: false, fullscreenControl: false,
      mapTypeId: 'roadmap', mapTypeControl: false, // replaced by MapTypeSwitch
    });
    g.current = { map, info: new gm.InfoWindow({ maxWidth: 300 }), stopMarkers: [], line: null, car: null, turns: [] };
    map.addListener('click', (e) => {
      if (e.placeId) {
        e.stop(); // suppress Google's own info card
        if (latest.current.mode === 'drive') openPopup(e.latLng);
        else onPlaceIcon(e.placeId, e.latLng);
      } else openPopup(e.latLng);
    });
    const switchBox = document.createElement('div');
    render(html`<${MapTypeSwitch} map=${map} />`, switchBox);
    map.controls[gm.ControlPosition.RIGHT_TOP].push(switchBox); // the stops card is on the left

    // Frame any stops restored from the URL.
    const pts = stops.map((s) => s.ll);
    if (pts.length > 1) fitAfterLayout(map, pts);
    else if (pts.length === 1) { map.setCenter(pts[0]); map.setZoom(15); }
  }, []);

  // One lettered pin per stop; drag one to move it while planning.
  useEffect(() => {
    const gm = window.google.maps;
    const { map } = g.current;
    g.current.stopMarkers.forEach((m) => m.setMap(null));
    g.current.stopMarkers = stops.map((s, k) => {
      const m = new gm.Marker({
        map, position: s.ll, draggable: mode === 'plan', zIndex: 5, icon: pinIcon(stopColor(k, stops.length)),
        label: { text: stopLabel(k), color: '#fff', fontSize: '13px', fontWeight: '700' },
        title: `Stop ${stopLabel(k)}: ${s.text || 'dropped pin'}` + (mode === 'plan' ? ' (drag to move)' : ''),
      });
      m.addListener('dragend', (e) => onMove(k, toLL(e.latLng)));
      if (mode === 'drive' && route) m.addListener('click', () => latest.current.onJump(route.stops[k].i));
      return m;
    });
  }, [stops, mode, route]);

  // Route line. It swallows map clicks, so it handles them itself.
  useEffect(() => {
    const { map } = g.current;
    if (g.current.line) g.current.line.setMap(null);
    g.current.line = route && new window.google.maps.Polyline({
      path: route.path, map, strokeColor: '#1a73e8', strokeOpacity: 0.85, strokeWeight: 5,
    });
    if (g.current.line) g.current.line.addListener('click', (e) => openPopup(e.latLng));
  }, [route]);

  // Numbered marker at every turn; clicking one jumps to just before it.
  useEffect(() => {
    const gm = window.google.maps;
    const { map } = g.current;
    g.current.turns.forEach((t) => t.marker.setMap(null));
    g.current.turns = [];
    if (!route) return;
    route.turns.forEach((t, k) => {
      const marker = new gm.Marker({
        map, position: t, zIndex: 6, icon: turnIcon(false), title: `${t.n}. ${t.text}`,
        label: { text: String(t.n), color: '#fff', fontSize: '10px', fontWeight: '700' },
      });
      marker.addListener('click', () => latest.current.onJump(t.at));
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

  // Fit the route whenever we enter drive mode; the map has just shrunk.
  useEffect(() => {
    g.current.info.close();
    if (mode === 'drive' && route) fitAfterLayout(g.current.map, route.path);
    else if (mode === 'plan' && latest.current.stops.length > 1) fitAfterLayout(g.current.map, latest.current.stops.map((s) => s.ll));
  }, [mode, route]);

  // The player bar's re-centre button: odd presses zoom in on the car, even presses show the whole route.
  useEffect(() => {
    const { map } = g.current;
    const { route: r, car: c } = latest.current;
    if (!recenter || !r) return;
    if (recenter % 2 && c) {
      map.setZoom(18);
      map.setCenter(c);
      map.panBy(-cardCover(map, 150) / 2, 0); // centre the car in the part of the map beside the card
    }
    else fitAfterLayout(map, r.path);
  }, [recenter]);

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

  const search = stops.length < MAX_STOPS && html`<${SearchBox} key=${searchKey} autoFocus=${searchKey > 0}
    placeholder=${stops.length ? 'Add a stop' : 'Search for a starting point'}
    getBounds=${() => g.current && g.current.map.getBounds()}
    onPlace=${onSearchPlace}
    onError=${(msg) => latest.current.onNotice(msg, true)} />`;

  return html`
    <div class="map-wrap">
      <div class="map" ref=${el}></div>
      <${StopsPanel} mode=${mode} stops=${stops} route=${route} idx=${idx} search=${search} actions=${actions}
        onRemove=${onRemove} onReorder=${onReorder} onDuplicate=${onDuplicate} onClear=${onClear} onJump=${onJump} />
    </div>`;
}
