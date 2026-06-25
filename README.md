# Deep map

Intended for recording people's stories about places on the map.

## Projects

The user data is partitioned into Projects, selected by URL parameter: e.g. `?project=folio`. Default is the original Garn Fawr project. There are some domain names mapped to projects: pererinwyf.org wired-in in model.js

## Users

The maps are visible to anyone with the URL. 

Users can sign in (click Sign-in or Contribute) using Google or Microsoft ID. Contributions are attributed to the name from their account.

User roles set per project are: Viewer, Contributor, Editor, Admin. Contributors can add content and edit their own content; Editors can edit any content on their own project; Admins can change roles. There's also a class of superadmin. Superadmins can create and delete projects and edit content of any project. (A user can be made a superadmin only by editing the deepmap>users table in Azure Storage Explorer.)

On projects with `instantContributor` set, anyone who signs in gets the Contributor role if they're new to the project. Otherwise, new users get Viewer, which doesn't provide them with any access, but puts them in the table so that an Admin can then change their role. To block a user from making further contributions, set their role to Viewer.

## Project admin

If you're signed in and are an admin on the current project, click the cogwheel next to your name at top left; then click **Project Settings**. If you're the admin of several projects, choose the appropriate project from the menu.

Easiest way to create a new project (if you're a superadmin) is to click `Duplicate` and then edit.

* **Users** - Click a user's role to change it. If the user doesn't appear on the list, ask them to open the map (with the correct ?project=xxx) and sign in.
* **Splash** - Fragment of HTML that appears while the map is loading. Rules:
   - Must be a syntactically correct list of `<div>`s
   - If you include an `img`, you (currently) have to upload the source as a code update
   - For different languages, include `<span>` or `<div>` with `id=about_en`, `id=about_cy` etc
   - Include (with these id and class names):
   ```
    <p id="loadingFlag" style="background-color:yellow">Loading... | Llwytho...</p>
   <button id="continueButton" style="display:none;" 
        class="continueButton splashCloser"
            onclick="splashScreen.dropSplash()">Continue | Parhewch</button>
   ```
* **Settings**
   - **instantContributor** - if set, new users automatically get the Contributor role; so anyone can create content.
   - **id**, **splashId** - unique IDs used in the database
   - **img** - local URL of a logo. The image must (currently) be uploaded with code.
   - **description** - SEO
   - **loc** - Where the map opens for new viewers. JSON.
   ```
   {
    "n" : 52.56, "e": -1.8,
    "z": 14, /*typical zoom level*/
    "mapChoice": 0, /*see next*/
    "mapBase": "google" /*or azure or osm*/
   }
   ```
   * **mapChoices** ["roadmap", "satellite", ...]
      - subset of a wired-in set of options - see `map-views.js`
   * **welsh** - no longer used
   * **region** - `uk`, `usa`, etc - how Search addresses are cleaned
   * **languages** - e.g. `["en", "cy", "ga"]`
   * **title** - appears top left
   * **admin** - email to which 'complain about this' comments are sent
   * **intro** - URL of a page about the project - user clicks title
   * **intro_lang** `{"cy":"https://..."}` - alternative targets for intro
   * **helpPage** `{"en":"https://...", "cy": ...}`
   * **terms** - URL of a page
   * **cartography** - google, osm, or azure. The base map and aerial view.
   * **tags** - There's a default set. [{"id", "name", "color", "tip"}]
   * **contributorRole** - no longer used

## Cartography (updated June 2026)

Each project chooses its cartography (`cartography` in the projects DB) and its list of map choices for the map button (`mapChoices`). It can also be chosen with a `?cartography=` query parameter, or (signed in as admin) from the Cartography dropdown.

- **osm** — the default: OpenStreetMap roadmap, satellite with labels (MapTiler hybrid), and the historical OS layers. Works with no Google key.
- **google** — Google base maps (roadmap/hybrid) with the same historical overlays. The API key lives in the Azure Functions config, served by `/api/keys` and embedded by `/api/map`.
- **azure** — Microsoft's Azure Maps raster tiles (successor to Bing Maps, which Microsoft retired in 2025; projects configured `bing` get this). Needs `Client_AzureMaps_K` in the Azure Functions config; until the key is present these projects fall back to osm.

Historical OS layers: 1885–1900 one-inch and 1919/1937 (National Library of Scotland via MapTiler, tiles up to zoom 16), and 1890/1940 town plans for the Folio area (self-hosted in Azure blob storage, up to zoom 19). All layers can be zoomed to 20 — beyond a layer's deepest tiles, an enlarged (fuzzy) view of the deepest tiles is shown. The NLS layers can take several seconds to load a screenful, so give them a moment.

## Embedding in an iframe

If required, append `&nouser=1` to suppress the Sign In button

## Backlog
1. Bug: no terms[lang] in project parameters
1. Bug: Restore stats.html to working order
1. Bug: Cartography is bing in some project settings. Azure?
1. Splash images uploader

1. Group heads: proper nesting
2. Multiple group membership.
1. Multiple items on one place
24.	Multi-user contributions. One author can add material to a note started by another. Text contributions appear in rule-separated blocks, with author name at top. Authors can subsequently edit or delete their own contributions. 
1. Group heads: group shows when you zoom in to a certain level - what level?
1. Sofa tours: automatically draw tour on map
1. Sofa tours: don't show short place text
1. User id: store id in place
1. Email notification to author when a comment is added
1. Feedback form instead of mail link
1. Zoom controls should centre on target. 
3. Rename group
2. Private and group subsets
1. Quickly switch cartography
5. Trail delete
17. Automatically open Show Me How on first use.
1. Facebook login

14. ! Sound clips shouldn't play during a repeat of a slideshow.
5. !Move user ids away from emails.
1. Non-MS/Google group sign-in
3. Projects: auto selection based on location
19. "Just my stuff": items I have created.
13. Historical date/period
17.	Editing help / First edit screen. When an author first adds a note or opens a note for editing, guidance appears about what types of content are acceptable. Caveats about copyright, particularly of photos; and about references to living persons. Doesn’t appear again unless you click the “?” on the edit screen.
1. Bulk entry

14. ! After editing places, language flip sometimes hangs - gets stuck in innerHtml changes?
14. User-created tags.

16.	Lightbox: Swipe left/right on tablet/phone.
17. ! After closing direct link, help should show.
10. Online copyright release form.
21.	Auto translation. User can click to see a machine translation of user content to their preferred language. [The translator APIs are quite easy to use!]
27.	?Target only for phones and tablets – use right-click/long click for PCs/Macs.
31.	Offline tracking. Downloads neighbouring map tiles while connected so that in case of disconnection while walking around, the map still works.
35. Offline option - download map tiles
36. Tag media
37. Drone view - sync w drone movement
41. Better UI for tags in editing mode.
44. More detailed tag descriptions.
25.	Prompt author to attribute sources. Separate source field? 

### Geraint's Backlog
1. Set service worker to only work on mobile device
2. Prevent posts from being cached
3. Look into implementing Google Workbox
4. Add a new map class for offline maps
5. Work on moving the restricted map around to pre cache those tiles
