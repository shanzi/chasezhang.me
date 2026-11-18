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

const moveItem = (xs, from, to) => { const ys = xs.slice(); ys.splice(to, 0, ys.splice(from, 1)[0]); return ys; };

// The stop stack while planning: drag a row by its handle (or focus the handle and use
// the arrow keys) to reorder.
function PlanList({ stops, onRemove, onReorder }) {
  const [drag, setDrag] = useState(null); // {id, to} while a row is being dragged
  const listRef = useRef(null);
  const shown = drag ? moveItem(stops, stops.findIndex((s) => s.id === drag.id), drag.to) : stops;

  const startDrag = (e, k) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const first = listRef.current.querySelector('.stop').getBoundingClientRect();
    const id = stops[k].id;
    let to = k;
    setDrag({ id, to });
    const move = (ev) => {
      to = Math.max(0, Math.min(stops.length - 1, Math.floor((ev.clientY - first.top) / first.height)));
      setDrag({ id, to });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      if (to !== k) onReorder(k, to);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const keyMove = (e, k) => {
    const to = e.key === 'ArrowUp' ? k - 1 : e.key === 'ArrowDown' ? k + 1 : -1;
    if (to < 0 || to >= stops.length) return;
    e.preventDefault();
    onReorder(k, to);
    requestAnimationFrame(() => { const h = listRef.current.querySelectorAll('.drag-handle')[to]; if (h) h.focus(); });
  };

  return html`
    <ol class="stops" ref=${listRef}>
      ${shown.map((s, k) => html`
        <li class=${'stop' + (drag && drag.id === s.id ? ' dragging' : '')} key=${s.id}>
          <button type="button" class="drag-handle" title="Drag to reorder (or use ↑ / ↓)" aria-label=${'Reorder stop ' + stopLabel(k)}
            onPointerDown=${(e) => startDrag(e, k)} onKeyDown=${(e) => keyMove(e, k)}><${Icon} name="drag" /></button>
          <${Badge} k=${k} n=${stops.length} />
          <span class="stop-name" title=${stopName(s)}>${stopName(s)}</span>
          <button type="button" class="icon-btn small" title="Remove stop" aria-label=${'Remove stop ' + stopLabel(k)}
            onClick=${() => onRemove(k)}><${Icon} name="close" /></button>
        </li>`)}
    </ol>`;
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

export function StopsPanel({ mode, stops, route, idx, search, onRemove, onReorder, onJump }) {
  const [open, setOpen] = useState(true);
  const driving = mode === 'drive' && route;
  const body = driving || stops.length > 0;
  // The search box is its own card under the stack (not inside the scrolling card,
  // which would clip its suggestion list), so it moves down as stops are added.
  return html`
    <div class="side">
    <aside class=${'panel' + (open ? '' : ' closed')}>
      <div class="panel-head">
        <a href="/projects/" title="Back to projects">Route Rehearsal</a>
        ${driving && html`<span class="panel-progress">${fmtDist(route.samples[idx].d)} / ${fmtDist(route.total)}</span>`}
        <button type="button" class="icon-btn small" title=${open ? 'Collapse' : 'Expand'} aria-label=${open ? 'Collapse' : 'Expand'}
          onClick=${() => setOpen(!open)}><${Icon} name=${open ? 'collapse' : 'expand'} /></button>
      </div>
      ${open && body && html`<div class="panel-body">
        ${driving ? html`<${Itinerary} route=${route} idx=${idx} onJump=${onJump} />`
          : html`<${PlanList} stops=${stops} onRemove=${onRemove} onReorder=${onReorder} />`}
      </div>`}
    </aside>
    ${!driving && search && html`<div class="search">${search}</div>`}
    </div>`;
}
