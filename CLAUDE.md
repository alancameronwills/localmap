# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Deep Map" / Map Digi — a web app for recording people's stories about places on a map (https://mapdigi.org). Plain HTML + vanilla JavaScript with jQuery; **no build step, no bundler, no transpilation**. Scripts are loaded directly via `<script>` tags in `index.html`.

## Commands

There is no build or lint. Testing is Cypress e2e only:

- `npm run live` — run all tests headless against the live site (https://deep-map.azurewebsites.net)
- `npm run local` — run headless against a local server (requires `cypress.env.json`)
- `npm run hlive` / `npm run hlocal` — same, headed
- `npm run open` / `npm run openlive` — open the Cypress UI
- Single spec: `npx cypress run --spec cypress/e2e/t1.cy.js --env site=live`
- The root `.cmd` files (`live.cmd`, `local.cmd`, `open.cmd`, …) are just shortcuts for these npm scripts.

Local runs need a `cypress.env.json` (gitignored), e.g. `{"site": "local", "localRoot": "http://localhost/localmap", "TestProjectId": "..."}` — see `cypress/cypress.json`. "Local" means the repo served by a local web server with PHP; there is no dev-server script in this repo.

## Cache-busting convention

Each script is referenced as `scripts/foo.js?v=N` in `index.html` (and `mobileIndex.html`). **When you edit a script, bump its `?v=N` number in the HTML that includes it**, otherwise clients keep the cached old version. Same applies to `css/deep-map.css?v=N`.

## Architecture

All app code is global-scope scripts in `scripts/`, loaded in dependency order by `index.html` (the main entry point; `mobileIndex.html` is an older mobile variant).

**Data flow:** The backend is an Azure web app (REST API documented in `rest-api.md`). `scripts/azuredb.js` makes **all** server calls (places download/upload with retry queue, media upload to Azure blob storage); `scripts/model.js` defines the client model (`Place`, picture classes) and parses the returned rows. When the page is served from `localhost`, `azuredb.js` points API calls at `https://mapdigi.org` — so local development still talks to the live backend.

Key model quirks (see `rest-api.md`):
- A place's `Text` field holds title and body together: the title is everything up to the first `<br/>`/`<p>`/`<div>`.
- `Media` arrives as a JSON string embedded in a table cell and must be `JSON.parse`d.
- Place ids are `project|rowKey` (Azure table PartitionKey|RowKey).

**Maps:** `scripts/maps.js` defines interchangeable cartography classes — `GoogleMap`, `BingMap`, `OpenMap` (OpenLayers, vendored at `scripts/v6.5.0-dist/`) — selected in `doLoadMap()` from the project config or a `?cartography=` query parameter, and exposed as `window.map`. Historical OS map tiles come from maptiler.

**Projects:** Each map deployment is a "project" (e.g. Trefdraeth, Folio, hudson26). Per-project config lives in `scripts/projects.json` (location, languages, tags, cartography, admin); per-project splash screens are in `projects/*.html` + `*.json`. The place data is partitioned by project on the server.

**Other major pieces:**
- `scripts/index.js` — app startup and the group/index side panel (`GroupNode` tree of places)
- `scripts/deep-map.js` — core UI: place display, petals menu (`petals.js`), editing flow with `editor.js` and `text-edit.js`
- `scripts/sign-in.js` — Google/Microsoft sign-in; user roles (contributor/editor/admin) gate editing (`Place.IsEditable`)
- `scripts/track.js`, `zones.js`, `ProximityPolygons.js` — location tracking and proximity triggers while walking
- `scripts/recorder.js`, `recordingUI.js` — audio recording
- `service-worker.js`, `offline-map.js`, `sync.js` — offline caching/support (work in progress; see "Geraint's Backlog" in README.md)
- Multi-language support (English/Welsh, sometimes Irish): UI strings looked up via `s(id, default)` from `util.js`; project tag names have `namecy`/`tipcy` etc. variants.

**Vendored libraries** in `scripts/` (jquery, azure-storage-*, heic2any, markerclustererplus, exif-js, ol) — do not edit.

The PHP files at the root (`getPlaces.php`, `upload.php`, …) are a simple file-based server-side alternative, not part of the main Azure flow.
