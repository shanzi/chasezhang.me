// Street View panel: panorama, turn prompts, and playback controls.
import { html, useEffect, useRef } from '../vendor/preact-htm.js';
import { SPEED_MAX, SPEED_MIN, TURN_ZONE_M } from '../config.js';
import { fmtDist } from '../maps/geo.js';

// Slider position 0..100 <-> steps per second, on a log scale.
const RATIO = SPEED_MAX / SPEED_MIN;
const toSpeed = (pos) => SPEED_MIN * RATIO ** (pos / 100);
const toPos = (speed) => Math.round(100 * Math.log(speed / SPEED_MIN) / Math.log(RATIO));

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

export function DriveView({ player, route, mode, view, speed, slowTurns, onSpeed, onSlowTurns }) {
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

  const n = route ? route.samples.length : 0;
  const d = route ? route.samples[view.idx].d : 0;
  return html`
    <section class="drive">
      <div class="pano-wrap">
        <div class="pano" ref=${panoEl}></div>
        <${Hud} route=${route} idx=${view.idx} imagery=${view.imagery} />
      </div>
      <div class="controls">
        <button title="Back to start" onClick=${() => player.jump(0)}>⏮</button>
        <button title="One step back (←)" onClick=${() => player.step(-1)}>◀ Step</button>
        <button class="primary" title="Play / pause (space)" onClick=${() => player.toggle()}>
          ${view.playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button title="One step forward (→)" onClick=${() => player.step(1)}>Step ▶</button>
        <input class="scrub" type="range" min="0" max=${Math.max(0, n - 1)} value=${view.idx}
          onInput=${(e) => player.jump(+e.currentTarget.value)} />
        <span class="progress">${route ? `${fmtDist(d)} / ${fmtDist(route.total)}` : '–'}</span>
        <label class="speed" title="Playback speed">
          Slow
          <input type="range" min="0" max="100" value=${toPos(speed)}
            onInput=${(e) => onSpeed(toSpeed(+e.currentTarget.value))} />
          Fast
        </label>
        <label class="check">
          <input type="checkbox" checked=${slowTurns} onChange=${(e) => onSlowTurns(e.currentTarget.checked)} />
          slow near turns
        </label>
      </div>
    </section>`;
}
