// Card over the map. Planning: place search plus the stack of chosen stops.
// Driving: the same stops become the progress view, with the turns of each leg
// between them and the current leg highlighted.
import { html, useEffect, useRef, useState } from '../vendor/preact-htm.js';
import { fmtDist } from '../maps/geo.js';
import { stopLabel } from '../maps/routing.js';
import { Icon } from './icons.js';

export const stopColor = (k, n) => (k === 0 ? '#188038' : k === n - 1 && n > 1 ? '#d93025' : '#8430ce');

const Badge = ({ k, n }) => html`<span class="pin-badge" style=${{ background: stopColor(k, n) }}>${stopLabel(k)}</span>`;
const stopName = (s) => s.text || `${s.ll.lat.toFixed(5)}, ${s.ll.lng.toFixed(5)}`;

function PlanList({ stops, onRemove }) {
  if (!stops.length) return html`<p class="panel-hint">Search above or click the map to add your first stop.</p>`;
  return html`
    <ol class="stops">
      ${stops.map((s, k) => html`
        <li class="stop" key=${k}>
          <${Badge} k=${k} n=${stops.length} />
          <span class="stop-name" title=${stopName(s)}>${stopName(s)}</span>
          <button type="button" class="icon-btn small" title="Remove stop" aria-label="Remove stop"
            onClick=${() => onRemove(k)}><${Icon} name="close" /></button>
        </li>`)}
    </ol>
    ${stops.length < 2 && html`<p class="panel-hint">Add another stop to make a route.</p>`}`;
}

function Itinerary({ route, idx, onJump }) {
  const { stops, turns } = route;
  const d = route.samples[idx].d;
  const n = stops.length;
  let cur = 0;
  while (cur < n - 2 && d >= stops[cur + 1].d) cur++;
  const next = turns.find((t) => t.d > d + 2);
  const list = useRef(null);

  // Keep the current leg's next turn in view as playback moves along.
  useEffect(() => {
    const el = list.current && (list.current.querySelector('.turn.next') || list.current.querySelector('.leg.current .leg-dist'));
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [next, cur]);

  return html`
    <ol class="itin" ref=${list}>
      ${stops.map((s, k) => {
        const stop = html`
          <li class=${'stop' + (d >= s.d ? ' passed' : '')} key=${'s' + k}>
            <button type="button" class="stop-jump" title=${'Jump to stop ' + stopLabel(k)} onClick=${() => onJump(s.i)}>
              <${Badge} k=${k} n=${n} /><span class="stop-name">${stopName(s)}</span>
            </button>
          </li>`;
        if (k === n - 1) return stop;
        const len = stops[k + 1].d - s.d;
        const frac = k < cur ? 1 : k > cur ? 0 : Math.min(1, Math.max(0, (d - s.d) / (len || 1)));
        const legTurns = turns.filter((t) => t.leg === k);
        return [stop, html`
          <li class=${'leg' + (k === cur ? ' current' : '') + (k < cur ? ' done' : '')} key=${'l' + k}>
            <div class="rail"><div class="fill" style=${{ height: frac * 100 + '%' }}></div></div>
            <div class="leg-dist">${fmtDist(len)}${legTurns.length ? ` · ${legTurns.length} turn${legTurns.length > 1 ? 's' : ''}` : ''}</div>
            <ol class="turns">
              ${legTurns.map((t) => html`
                <li key=${t.n}>
                  <button type="button" class=${'turn' + (t === next ? ' next' : '') + (t.d <= d + 2 ? ' passed' : '')}
                    title="Jump to just before this turn" onClick=${() => onJump(t.at)}>
                    <span class="turn-n">${t.n}</span><span class="turn-text" title=${t.text}>${t.text}</span>
                  </button>
                </li>`)}
            </ol>
          </li>`];
      })}
    </ol>`;
}

export function StopsPanel({ mode, stops, route, idx, searchRef, onRemove, onJump }) {
  const [open, setOpen] = useState(true);
  const driving = mode === 'drive' && route;
  return html`
    <aside class=${'panel' + (open ? '' : ' closed')}>
      <div class="panel-head">
        <a href="/projects/" title="Back to projects">Route Rehearsal</a>
        ${driving && html`<span class="panel-progress">${fmtDist(route.samples[idx].d)} / ${fmtDist(route.total)}</span>`}
        <button type="button" class="icon-btn small" title=${open ? 'Collapse' : 'Expand'} aria-label=${open ? 'Collapse' : 'Expand'}
          onClick=${() => setOpen(!open)}><${Icon} name=${open ? 'collapse' : 'expand'} /></button>
      </div>
      <div class="panel-search" ref=${searchRef} hidden=${!!driving || !open}></div>
      ${open && html`<div class="panel-body">
        ${driving ? html`<${Itinerary} route=${route} idx=${idx} onJump=${onJump} />`
          : html`<${PlanList} stops=${stops} onRemove=${onRemove} />`}
      </div>`}
    </aside>`;
}
