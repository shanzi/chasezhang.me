// Bottom bar spanning both panels: playback buttons, speed, status, and Start / Stop route.
// The playback controls are always shown, disabled until a route is playing.
import { html } from '../vendor/preact-htm.js';
import { SPEED_MAX, SPEED_MIN } from '../config.js';
import { Icon } from './icons.js';

// Slider position 0..100 <-> steps per second, on a log scale.
const RATIO = SPEED_MAX / SPEED_MIN;
const toSpeed = (pos) => SPEED_MIN * RATIO ** (pos / 100);
const toPos = (speed) => Math.round(100 * Math.log(speed / SPEED_MIN) / Math.log(RATIO));

export function ControlBar({ player, route, view, speed, onSpeed, status, canRoute, busy, onRoute, onStop }) {
  const driving = !!route;
  const last = driving ? route.samples.length - 1 : 0;
  const prevT = driving ? player.prevTurnTarget() : null;
  const nextT = driving ? player.nextTurnTarget() : null;
  const turnTitle = (t, label, key) => (t && t.n ? `${label}: ${t.n}. ${t.text} (${key})` : t ? `Back to start (${key})` : `No ${label.toLowerCase()}`);
  const btn = (icon, title, onClick, enabled, cls = '') => html`
    <button type="button" class=${'icon-btn ' + cls} title=${title} aria-label=${title}
      disabled=${!driving || !enabled} onClick=${onClick}><${Icon} name=${icon} /></button>`;
  return html`
    <footer class="controls">
      <div class="nav" role="group" aria-label="Playback">
        ${btn('first', 'Back to start', () => player.start(), view.idx > 0)}
        ${btn('prevTurn', turnTitle(prevT, 'Previous turn', 'shift+←'), () => player.prevTurn(), !!prevT)}
        ${btn('stepBack', 'Step back (←)', () => player.step(-1), view.idx > 0)}
        ${btn(view.playing ? 'pause' : 'play', view.playing ? 'Pause (space)' : 'Play (space)', () => player.toggle(), true, 'play')}
        ${btn('stepFwd', 'Step forward (→)', () => player.step(1), view.idx < last)}
        ${btn('nextTurn', turnTitle(nextT, 'Next turn', 'shift+→'), () => player.nextTurn(), !!nextT)}
        ${btn('last', 'Jump to the end', () => player.end(), view.idx < last)}
      </div>
      <label class="speed" title="Playback speed">
        Slow
        <input type="range" min="0" max="100" value=${toPos(speed)} disabled=${!driving}
          onInput=${(e) => onSpeed(toSpeed(+e.currentTarget.value))} />
        Fast
      </label>
      <div class=${'status' + (status.err ? ' err' : '')} role="status">${status.msg}</div>
      ${driving
        ? html`<button type="button" class="route danger" onClick=${onStop}>Stop route</button>`
        : html`<button type="button" class="route primary" disabled=${!canRoute || busy} onClick=${onRoute}>
            ${busy ? 'Finding route…' : 'Start route'}</button>`}
    </footer>`;
}
