# hasnaa-abdalla.github.io

Personal website of Hasnaa Abdalla — static HTML/CSS, served by GitHub Pages.

- `index.html` — the single page
- `assets/css/style.css` — styles (colours are CSS variables at the top)
- `assets/img/` — images; to add a portfolio piece, copy an `<article class="piece">`
  block in the "Selected Work" section and swap the placeholder `div.plate`
  for `<img class="plate" src="assets/img/your-image.jpg" alt="...">`.

## Alexandria's Lost Geography (`alexandria/`)

A project page with an interactive map (Leaflet) and a gazetteer of sites.

- **Add or edit a site:** edit `alexandria/data/sites.geojson`. The file opens in QGIS,
  so points can also be placed there and exported back to GeoJSON (WGS 84).
  Each feature's properties are:
  `id`, `name`, `name_ar`, `status` (`standing` · `altered` · `threatened` · `lost` · `removed`),
  `district`, `built`, `lost`, `summary`, `story`, `sources` (list), `precision`
  (`approximate` · `surveyed` · `unlocated`) and `verified` (true/false).
  For a site that hasn't been located yet, set `"geometry": null`. It will then appear in the
  gazetteer but not on the map.
- **Add a historical map overlay:** georeference the sheet (e.g. QGIS Georeferencer), export it
  as XYZ tiles into `alexandria/maps/<name>/`, then add an entry to `OVERLAYS` at the top of
  `alexandria/alexandria.js`. A layer switcher appears automatically.
- **Preview locally:** run `python3 -m http.server` in the repo root and open
  <http://localhost:8000/alexandria/>. The site list is fetched, so opening the file directly won't work.
