# Routr

Drive a route in Google Street View before driving it for real.
Live at https://chasezhang.me/projects/routr/

No build step: plain ES modules, served as-is. UI uses Preact + htm (vendored, ~13 KB).

```
index.html                 page shell, loads css/app.css and js/main.js
css/app.css                all styles
js/main.js                 mounts <App>
js/config.js               API key and tuning constants
js/player.js               playback engine (framework-free)
js/maps/loader.js          loads the Google Maps JS API
js/maps/geo.js             distance / heading / resampling / formatting helpers
js/maps/routing.js         multi-stop Routes API (+ Directions fallback) -> samples, turns, stops
js/maps/streetview.js      chooses the road panorama for each sample
js/components/App.js       state (stops, route, playback), plan/drive modes, keyboard shortcuts
js/components/MapView.js   map, stop pins, click popup, place search, satellite toggle, turn markers
js/components/StopsPanel.js search + stop stack; while driving, the itinerary / progress view
js/components/DriveView.js Street View panel and turn prompts
js/components/ControlBar.js bottom bar: playback icons, speed, status, Start / Stop route
js/components/SearchBox.js Google place search box (remount for a fresh one)
js/components/icons.js     inline SVG icons
js/vendor/preact-htm.js    htm@3.1.1 preact/standalone.module.js, unmodified
```

## Google Maps key

The key in `js/config.js` must have these APIs enabled and allowed in its API restrictions:
Maps JavaScript API, Routes API, Places API (New) (for search). Website restriction:
`https://chasezhang.me/*` (browsers send only the origin as referrer for API calls).

## Local preview

Key restrictions block `localhost` unless you add it to the key. Serve the repo root with
`python3 -m http.server 8000` and open `http://localhost:8000/projects/routr/`.

## Cache busting

`index.html` loads every module and the stylesheet through content-hashed URLs (`?v=…`,
via an import map), so a browser never runs a mix of cached old and new files.
After changing anything under `css/` or `js/`, run `python3 projects/routr/tools/stamp.py`
and commit the updated `index.html` with the change.
