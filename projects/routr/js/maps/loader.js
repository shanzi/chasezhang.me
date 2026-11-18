// Loads the Google Maps JavaScript API once and resolves with `google.maps`.
let loading = null;

export function loadMaps(key, { onAuthFailure } = {}) {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const cb = '__rrMapsReady';
    window[cb] = () => { delete window[cb]; resolve(window.google.maps); };
    // Google calls this global when the key is rejected (bad key, referrer, quota).
    window.gm_authFailure = () => onAuthFailure && onAuthFailure();
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) +
            '&v=weekly&libraries=geometry&loading=async&callback=' + cb;
    s.async = true;
    s.onerror = () => reject(new Error('Could not load the Google Maps script (network blocked?).'));
    document.head.appendChild(s);
  });
  return loading;
}
