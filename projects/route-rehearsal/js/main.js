import { html, render } from './vendor/preact-htm.js';
import { App } from './components/App.js';

render(html`<${App} />`, document.getElementById('app'));
