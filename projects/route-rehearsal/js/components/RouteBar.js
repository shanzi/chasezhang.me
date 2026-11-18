// Top bar: start / end fields and the Start / Stop route button.
import { html } from '../vendor/preact-htm.js';

export function RouteBar({ from, to, mode, busy, ready, onField, onStart, onStop }) {
  const enter = (e) => { if (e.key === 'Enter' && ready) onStart(); };
  const field = (key, value, placeholder) => html`
    <input type="text" class=${'field field-' + key} value=${value} placeholder=${placeholder}
      readOnly=${mode === 'drive'}
      onInput=${(e) => onField(key, e.currentTarget.value)} onKeyDown=${enter} />`;
  return html`
    <header class="bar">
      <h1><a href="/projects/" title="Back to projects">Route Rehearsal</a></h1>
      ${field('from', from.text, 'From: click the map, search, or type an address')}
      ${field('to', to.text, 'To')}
      ${mode === 'drive'
        ? html`<button class="danger" onClick=${onStop}>Stop route</button>`
        : html`<button class="primary" disabled=${!ready || busy} onClick=${onStart}>
            ${busy ? 'Finding route…' : 'Start route'}
          </button>`}
    </header>`;
}
