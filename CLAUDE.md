# CLAUDE.md

Static site for https://chasezhang.me, served by GitHub Pages from the `master` branch root (custom domain set in `CNAME`). There is no build step and no Jekyll processing (`.nojekyll`): every committed file is served as-is at its path.

## Layout

- `index.html`, `javascripts/`, `stylesheets/` — the homepage (2D-canvas 3D scene + audio wave).
  - `stylesheets/index.css` is compiled from `index.scss`; edit the `.scss` and recompile (e.g. `sass stylesheets/index.scss stylesheets/index.css`), committing both.
- `projects/` — gallery of hosted projects.
  - Each project gets its own folder: `projects/<slug>/index.html` → `https://chasezhang.me/projects/<slug>/`.
  - Commit built/static output only (HTML/JS/CSS/assets). Use relative asset paths so the project works under its subpath.
  - Add an entry for every new project to the list in `projects/index.html`.
  - No build tooling. Multi-file apps use native ES modules; when a UI framework helps, use Preact + htm vendored as a single file (see `projects/routr/js/vendor/`), not npm/bundlers.
- `sketch-rendering/index.html` — redirect stub only; the project now lives in `projects/sketch-rendering/`. Keep it so old links keep working.
- `projects/routr/` — after editing its `css/` or `js/`, run `python3 projects/routr/tools/stamp.py` (refreshes the content-hashed URLs in its `index.html`) and commit the result.
- `projects/route-rehearsal/index.html` — redirect stub to `projects/routr/` (keeps the query string). Keep it.

## Notes

- Preview locally with any static server, e.g. `python3 -m http.server` from the repo root.
- Licensed GPLv3 (`LICENSE`).
