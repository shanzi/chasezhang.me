// Top bar: start / end / via fields, step spacing, and the Start / Change route buttons.
import { html } from '../vendor/preact-htm.js';
import { SPACING_OPTIONS } from '../config.js';

export function RouteBar({ from, to, via, spacing, mode, busy, ready, onField, onSpacing, onStart, onEdit }) {
  const enter = (e) => { if (e.key === 'Enter' && ready) onStart(); };
  const field = (key, value, placeholder) => html`
    <input type="text" class=${'field field-' + key} value=${value} placeholder=${placeholder}
      onInput=${(e) => onField(key, e.currentTarget.value)} onKeyDown=${enter} />`;
  return html`
    <header class="bar">
      <h1><a href="/projects/" title="Back to projects">Route Rehearsal</a></h1>
      ${field('from', from.text, 'From: click the map, search, or type an address')}
      ${field('to', to.text, 'To')}
      ${field('via', via, 'Via (optional, separate with ;)')}
      <select title="Distance between Street View steps" value=${spacing}
        onChange=${(e) => onSpacing(+e.currentTarget.value)}>
        ${SPACING_OPTIONS.map((m) => html`<option value=${m}>every ${m} m</option>`)}
      </select>
      <button class="primary" disabled=${!ready || busy} onClick=${onStart}>
        ${busy ? 'Finding route…' : 'Start route'}
      </button>
      ${mode === 'drive' && html`<button onClick=${onEdit}>Change route</button>`}
    </header>`;
}
