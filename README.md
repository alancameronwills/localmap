# Deep map

Intended for recording people's stories about places on the map.

## Cartography (updated June 2026)

Each project chooses its cartography (`cartography` in `projects/<id>.json`) and its list of map choices for the map button (`mapChoices`). It can also be chosen with a `?cartography=` query parameter, or (signed in as admin) from the Cartography dropdown.

- **osm** — the default: OpenStreetMap roadmap, satellite with labels (MapTiler hybrid), and the historical OS layers. Works with no Google key.
- **google** — Google base maps (roadmap/hybrid) with the same historical overlays. The API key lives in the Azure Functions config, served by `/api/keys` and embedded by `/api/map`.
- **azure** — Microsoft's Azure Maps raster tiles (successor to Bing Maps, which Microsoft retired in 2025; projects configured `bing` get this). Needs `Client_AzureMaps_K` in the Azure Functions config; until the key is present these projects fall back to osm.

Historical OS layers: 1885–1900 one-inch and 1919/1937 (National Library of Scotland via MapTiler, tiles up to zoom 16), and 1890/1940 town plans for the Folio area (self-hosted in Azure blob storage, up to zoom 19). All layers can be zoomed to 20 — beyond a layer's deepest tiles, an enlarged (fuzzy) view of the deepest tiles is shown. The NLS layers can take several seconds to load a screenful, so give them a moment.

## Backlog
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
