// Material-style 24px icons as inline SVG, coloured by currentColor.
import { html } from '../vendor/preact-htm.js';

const PATHS = {
  first: 'M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z',
  prevTurn: 'M6 6h2v12H6zm3.5 6 8.5 6V6z',
  stepBack: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  stepFwd: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  nextTurn: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  last: 'M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z',
  drag: 'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
};

export const Icon = ({ name }) => html`
  <svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d=${PATHS[name]} /></svg>`;
