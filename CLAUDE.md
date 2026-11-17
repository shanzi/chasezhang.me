# CLAUDE.md

Static site for https://chasezhang.me, served by GitHub Pages from the `master` branch root (custom domain set in `CNAME`). There is no build step and no Jekyll processing (`.nojekyll`): every committed file is served as-is at its path.

## Layout

- `index.html`, `javascripts/`, `stylesheets/` — the homepage (2D-canvas 3D scene + audio wave).
  - `stylesheets/index.css` is compiled from `index.scss`; edit the `.scss` and recompile (e.g. `sass stylesheets/index.scss stylesheets/index.css`), committing both.
- `projects/` — gallery of hosted projects.
  - Each project gets its own folder: `projects/<slug>/index.html` → `https://chasezhang.me/projects/<slug>/`.
  - Commit built/static output only (HTML/JS/CSS/assets). Use relative asset paths so the project works under its subpath.
  - Add an entry for every new project to the list in `projects/index.html`.
- `sketch-rendering/` — older project kept at its original URL (`/sketch-rendering/`) so existing links don't break; it's linked from the gallery.

## Notes

- Preview locally with any static server, e.g. `python3 -m http.server` from the repo root.
- Licensed GPLv3 (`LICENSE`).
