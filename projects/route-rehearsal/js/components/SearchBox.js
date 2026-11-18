// Google place search (PlaceAutocompleteElement) wrapped as a component. Each instance
// owns one element; remount it (change its key) to get a fresh, empty box.
import { html, useEffect, useRef } from '../vendor/preact-htm.js';
import { toLL } from '../maps/geo.js';

export function SearchBox({ placeholder, autoFocus, getBounds, onPlace, onError }) {
  const box = useRef(null);
  const cb = useRef(null);
  cb.current = { getBounds, onPlace, onError };

  useEffect(() => {
    let ac = null, alive = true;
    const onSelect = async (ev) => {
      try {
        const place = ev.placePrediction ? ev.placePrediction.toPlace() : ev.place;
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'viewport'] });
        cb.current.onPlace({ text: place.displayName || place.formattedAddress || '', ll: toLL(place.location), viewport: place.viewport });
      } catch (e) {
        cb.current.onError('Search failed: ' + (e.message || e));
      }
    };
    window.google.maps.importLibrary('places').then(({ PlaceAutocompleteElement }) => {
      if (!alive) return;
      ac = new PlaceAutocompleteElement();
      if (placeholder) ac.setAttribute('placeholder', placeholder);
      const b = cb.current.getBounds();
      if (b) ac.locationBias = b;
      ac.addEventListener('gmp-select', onSelect);      // current API
      ac.addEventListener('gmp-placeselect', onSelect); // older API versions
      ac.addEventListener('gmp-error', () =>
        cb.current.onError('Place search is unavailable (is Places API (New) enabled for this key?).'));
      box.current.appendChild(ac);
      if (autoFocus) requestAnimationFrame(() => ac.focus());
    }, (e) => cb.current.onError('Place search is unavailable: ' + (e.message || e)));
    return () => { alive = false; if (ac) ac.remove(); };
  }, []);

  return html`<div class="search-box" ref=${box}></div>`;
}
