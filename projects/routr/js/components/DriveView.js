// Street View panel: panorama and turn prompts.
import { html, useEffect, useRef } from '../vendor/preact-htm.js';
import { TURN_ZONE_M } from '../config.js';
import { fmtDist } from '../maps/geo.js';

function Hud({ route, idx, imagery }) {
  if (!route) return null;
  const d = route.samples[idx].d;
  const next = route.steps.findIndex((s) => s.d > d + 2);
  let main, soon = false, then = null;
  if (next >= 0) {
    const away = route.steps[next].d - d;
    main = `In ${fmtDist(away)}: ${route.steps[next].text}`;
    soon = away <= TURN_ZONE_M * 2;
    then = route.steps[next + 1] ? `Then: ${route.steps[next + 1].text}` : null;
  } else {
    main = `Arriving in ${fmtDist(route.total - d)}`;
  }
  const img = !imagery ? null
    : imagery.missing ? 'No road Street View near this point'
    : 'Imagery: ' + (imagery.date || 'date unknown') + (imagery.place ? ' · ' + imagery.place : '');
  return html`
    <div class="hud">
      <div class=${'chip next' + (soon ? ' soon' : '')}>${main}</div>
      ${then && html`<div class="chip small">${then}</div>`}
      ${img && html`<div class="chip small">${img}</div>`}
    </div>`;
}

export function DriveView({ player, route, mode, view }) {
  const panoEl = useRef(null);
  const loaded = useRef(null);

  // Entering drive mode with a new route: create the panorama (now visible), load, and play.
  useEffect(() => {
    if (mode !== 'drive' || !route) { player.pause(); return; }
    player.attach(panoEl.current);
    if (loaded.current === route) return;
    loaded.current = route;
    player.load(route);
    player.show(0).then(() => { if (loaded.current === route) player.play(); });
  }, [mode, route]);

  // Clicking the Street View steps forward once per click (playback keeps its play / pause state).
  // Drags (looking around) and Google's own buttons are left alone.
  const down = useRef(null);
  const onDown = (e) => { down.current = e.button === 0 ? { x: e.clientX, y: e.clientY } : null; };
  const onUp = (e) => {
    const d = down.current;
    down.current = null;
    if (!d || !route || e.target.closest('button, a, [role="button"]')) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    player.step(1);
  };

  return html`
    <section class="sv">
      <div class="pano-wrap" title="Click to step forward" onPointerDownCapture=${onDown} onPointerUpCapture=${onUp}>
        <div class="pano" ref=${panoEl}></div>
        <${Hud} route=${route} idx=${view.idx} imagery=${view.imagery} />
      </div>
    </section>`;
}
