// Player bar along the bottom while a route plays: progress on the left, the
// playback buttons centred, and a speed menu on the right.
import { html, useEffect, useRef, useState } from '../vendor/preact-htm.js';
import { SPEED_DEFAULT, SPEED_RATES } from '../config.js';
import { fmtDist } from '../maps/geo.js';
import { Icon } from './icons.js';

const fmtRate = (r) => `${r}x`;

// "1x" button that opens a small menu of rates above it.
function SpeedMenu({ speed, onSpeed }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const rate = speed / SPEED_DEFAULT;

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); box.current.querySelector('.speed-btn').focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    box.current.querySelector('.speed-menu [aria-checked="true"]')?.focus();
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = (r) => { onSpeed(r * SPEED_DEFAULT); setOpen(false); box.current.querySelector('.speed-btn').focus(); };
  return html`
    <div class="speed" ref=${box}>
      <button type="button" class="speed-btn" title="Playback speed" aria-haspopup="menu" aria-expanded=${open}
        onClick=${() => setOpen(!open)}>${fmtRate(rate)}</button>
      ${open && html`
        <div class="speed-menu" role="menu" aria-label="Playback speed">
          ${SPEED_RATES.slice().reverse().map((r) => html`
            <button type="button" role="menuitemradio" aria-checked=${Math.abs(r - rate) < 1e-6}
              key=${r} onClick=${() => pick(r)}>${fmtRate(r)}</button>`)}
        </div>`}
    </div>`;
}

export function ControlBar({ player, route, view, speed, onSpeed }) {
  const last = route.samples.length - 1;
  const prevT = player.prevTurnTarget();
  const nextT = player.nextTurnTarget();
  const turnTitle = (t, label, key) => (t && t.n ? `${label}: ${t.n}. ${t.text} (${key})` : t ? `Back to start (${key})` : `No ${label.toLowerCase()}`);
  const btn = (icon, title, onClick, enabled, cls = '') => html`
    <button type="button" class=${'icon-btn ' + cls} title=${title} aria-label=${title}
      disabled=${!enabled} onClick=${onClick}><${Icon} name=${icon} /></button>`;
  return html`
    <footer class="controls">
      <div class="time">${fmtDist(route.samples[view.idx].d)} / ${fmtDist(route.total)}</div>
      <div class="nav" role="group" aria-label="Playback">
        ${btn('first', 'Back to start', () => player.start(), view.idx > 0)}
        ${btn('prevTurn', turnTitle(prevT, 'Previous turn', 'shift+←'), () => player.prevTurn(), !!prevT)}
        ${btn('stepBack', 'Step back (←)', () => player.step(-1), view.idx > 0)}
        ${btn(view.playing ? 'pause' : 'play', view.playing ? 'Pause (space)' : 'Play (space)', () => player.toggle(), true, 'play')}
        ${btn('stepFwd', 'Step forward (→)', () => player.step(1), view.idx < last)}
        ${btn('nextTurn', turnTitle(nextT, 'Next turn', 'shift+→'), () => player.nextTurn(), !!nextT)}
        ${btn('last', 'Jump to the end', () => player.end(), view.idx < last)}
      </div>
      <${SpeedMenu} speed=${speed} onSpeed=${onSpeed} />
    </footer>`;
}

// Bottom row of the stops card: a tip or status on the left, Start / Stop on the right.
export function RouteActions({ driving, status, canRoute, busy, onRoute, onStop }) {
  return html`
    <div class="panel-actions">
      <div class=${'status' + (status.err ? ' err' : '')} role="status">${status.msg}</div>
      ${driving
        ? html`<button type="button" class="route danger" onClick=${onStop}>Stop</button>`
        : html`<button type="button" class="route primary" disabled=${!canRoute || busy} onClick=${onRoute}>
            ${busy ? 'Starting…' : 'Start'}</button>`}
    </div>`;
}
