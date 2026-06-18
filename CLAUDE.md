# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Deep Map" / Map Digi — a web app for recording people's stories about places on a map (https://mapdigi.org). Plain HTML + vanilla JavaScript with jQuery; **no build step, no bundler, no transpilation**. Scripts are loaded directly via `<script>` tags in `index.html`.

## Commands

There is no build or lint. Testing is Cypress e2e only:

- `npm run live` — run all tests headless against the live site (https://mapdigi.org; deep-map.azurewebsites.net 301-redirects there, which breaks Cypress mid-test)
- `npm run local` — run headless against a local server (requires `cypress.env.json`)
- `npm run hlive` / `npm run hlocal` — same, headed
- `npm run open` / `npm run openlive` — open the Cypress UI
- Single spec: `npx cypress run --spec cypress/e2e/t1.cy.js --env site=live`
- The root `.cmd` files (`live.cmd`, `local.cmd`, `open.cmd`, …) are just shortcuts for these npm scripts.

Local runs need a `cypress.env.json` (gitignored), e.g. `{"site": "local", "localRoot": "http://localhost", "TestProjectId": "8dwn40fvv2"}`. Shared env (`liveRoot`) lives in `cypress.config.js`; the legacy `cypress/cypress.json` is ignored by Cypress 10. "Local" means the repo served by a local web server (`python -m http.server 80` suffices); it **must be on port 80** because the mapdigi.org API's CORS policy allows origin `http://localhost` but not other ports. Tests that need DB cleanup (`t2`–`t5`, `rightClick`) reset the test project by soft-deleting places through the public `uploadPlace` API (see the `MapTest` constructor) — no key setup needed. The server's hard-delete functions (`deletePlace`, `deleteTestPlaces`) currently return 500 (their code lives in the Functions app, not this repo), so soft-deleted rows accumulate in the test partition until they're fixed; the app itself also only soft-deletes (`deletePlace` in deep-map.js). The tests edit anonymously (the test project has `instantContributor`); there are no credentials for true sign-in tests.

## Cache-busting convention

Each script is referenced as `scripts/foo.js?v=N` in `index.html` (and `mobileIndex.html`). **When you edit a script, bump its `?v=N` number in the HTML that includes it**, otherwise clients keep the cached old version. Same applies to `css/deep-map.css?v=N`.

## Architecture

All app code is global-scope scripts in `scripts/`, loaded in dependency order by `index.html` (the main entry point; `mobileIndex.html` is an older mobile variant).

**Data flow:** The backend is an Azure web app (REST API documented in `rest-api.md`). `scripts/azuredb.js` makes **all** server calls (places download/upload with retry queue, media upload to Azure blob storage); `scripts/model.js` defines the client model (`Place`, picture classes) and parses the returned rows. When the page is served from `localhost`, `azuredb.js` points API calls at `https://mapdigi.org` — so local development still talks to the live backend.

**How the site is served:** `mapdigi.org` is a custom domain on the Azure Functions app. The static site (HTML/JS/CSS/img + the published `projects/*` files) lives in the `deepmap` blob container and is served by an in-app catch-all Function (`static`, route `{*path}`, in `../mapdigi-server`) that streams the blob and returns its stored content-type. This replaced the retired Azure Functions **Proxies** feature (`proxies.json`, removed June 2026). The `/share/{id}` link 302-redirects to `/?place={id}` via the `share` Function. Because the catch-all owns the root namespace, the Functions `routePrefix` is `""` and every API function carries an explicit `api/<name>` route — so `/api/*` URLs (and the `codeFromGit` GitHub webhook) are unchanged.

Key model quirks (see `rest-api.md`):
- A place's `Text` field holds title and body together: the title is everything up to the first `<br/>`/`<p>`/`<div>`.
- `Media` arrives as a JSON string embedded in a table cell and must be `JSON.parse`d.
- Place ids are `project|rowKey` (Azure table PartitionKey|RowKey).

**Maps:** the map layer is three files, loaded in this order: `scripts/tile-sources.js` (the single `MapTypes` data table that defines every map type — icon/maxZoom/nativeMaxZoom and a tile-URL template per layer, pure data so it can be serialized; plus the `tileUrlFor` template renderer, `overzoomLayer` factory, and `OverzoomMapType`), `scripts/map-views.js` (the `MapView*` classes — base/overlay switching per zoom and map choice), and `scripts/maps.js` (`GenMap` plus the interchangeable cartography classes `GoogleMap`, `OpenMap`, `AzureMap` — selected in `doLoadMap()` from the project config or a `?cartography=` query parameter, and exposed as `window.map`). All run on the Google Maps JS engine. Provider status (as of mid-2026): Bing Maps was retired by Microsoft in 2025 — projects configured for bing get `AzureMap` (Azure Maps raster tiles, Microsoft's successor; needs a `Client_AzureMaps_K` key in the server config) or fall back to `OpenMap` while no key is configured. `GoogleMap` works (the Google key lives server-side, in the Azure Functions config behind `/api/map` and `/api/keys`). `OpenMap` uses no Google base maps — bases and overlays come from OSM, MapTiler (key from `/api/keys`: modern OS, satellite/hybrid, historical OS 1900/1930s) and self-hosted Azure blob tiles (1890/1940, Folio area only), so it works even without a valid Google key.

All custom tile layers are served through `OverzoomMapType` (tile-sources.js): beyond a layer's deepest real zoom level it shows the deepest tiles scaled up, so zooming to 20 goes fuzzy rather than blank. The native ceilings (`nativeMaxZoom`) are set per layer in the `MapTypes` table — NLS 1885/1900 and 1930s layers stop at z16, the 1890/1940 blob tiles and OSM at z19. Pin labels are Google marker labels styled via the `.pinLabel` class in `deep-map.css` (two-line clamp, translucent background); the marker code sets only the class name. Notes for tests: Google fetches its own base tiles by XHR and draws to canvas, so tests can't look for `img` tiles on Google bases; and the historical MapTiler layers take several seconds to paint a screenful.

**Projects:** Each map deployment is a "project" (e.g. Trefdraeth, Folio, hudson26). A project's config (location, languages, tags, cartography, mapChoices, admin, `instantContributor`, …) and its loading-splash HTML are now **server-managed**: they live in a `projects` table in Azure storage (keyed by lowercased id), edited by admins through `contributors.html` (the project + user-roles admin console) via the `listProjects`/`upsertProject`/`deleteProject` functions, and encapsulated server-side in `SharedCode/Projects.js`. On save, the server **publishes** static `projects/<id>.json` and `projects/<id>.html` copies to the `deepmap` blob; the client still loads those as fast static files — `Project.get` (model.js) and `splash.js` fetch them from the live base (`https://mapdigi.org` on localhost, else origin). The repo's old file-based `projects/` directory has been retired (the table is authoritative). Place data is partitioned by project on the server (partitionKey = the mixed-case project `id`). NB: the project file name was historically just the lowercased id by coincidence — the real id is the `id` field; server lookups lowercase the partitionKey to match the table RowKey. The server (`uploadPlace`) authorizes writes by `instantContributor`/role from this store. The Azure Functions backend is a **separate repo** at `../mapdigi-server` (push to its `main` deploys it; it runs on **Node 22** — the live host's `WEBSITE_NODE_DEFAULT_VERSION`, matched by `NODE_VERSION` in its deploy workflow).

**Other major pieces:**
- `scripts/index.js` — app startup and the group/index side panel (`GroupNode` tree of places)
- `scripts/deep-map.js` — core UI: place display, petals menu (`petals.js`), editing flow with `editor.js` and `text-edit.js`
- `scripts/sign-in.js` — Google/Microsoft sign-in; user roles (contributor/editor/admin) gate editing (`Place.IsEditable`)
- `scripts/track.js`, `zones.js`, `ProximityPolygons.js` — location tracking and proximity triggers while walking
- `scripts/recorder.js`, `recordingUI.js` — audio recording
- `service-worker.js` — offline caching (work in progress, not registered from any live code path; see "Geraint's Backlog" in README.md)
- Multi-language support (English/Welsh, sometimes Irish): UI strings looked up via `s(id, default)` from `util.js`; project tag names have `namecy`/`tipcy` etc. variants.

**Vendored libraries** in `scripts/` (jquery, azure-storage-*, heic2any, markerclustererplus, exif-js, ol) — do not edit.

There used to be PHP files at the root (`getPlaces.php`, `upload.php`, `list.php`, `delete.php`) — a simple file-based server-side alternative, not part of the main Azure flow. They were removed (unused, and a security risk if ever served by a PHP host).
