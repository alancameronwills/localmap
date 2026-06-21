// Raster tile servers and the OverzoomMapType that serves their tiles to the
// Google Maps engine. The choice of which tiles to show at each zoom and map
// choice is in map-views.js; the map classes themselves are in maps.js.

// The single source of truth for every map type - both the user-facing map
// choices (roadmap, satellite, the historical maps) and the concrete tile
// layers they resolve to. It is PURE DATA (no functions), so it can be stored
// and retrieved - e.g. serialized into a project config. map-views.js decides
// which type to show at each zoom and choice; maps.js registers the tile layers.
//
// Per-entry fields, all optional:
//   icon          map-button image, for types offered as a user choice
//   maxZoom       deepest zoom a chooser of this type may reach
//   nativeMaxZoom deepest zoom at which the server has real tiles; beyond it
//                 OverzoomMapType scales the deepest tiles up (fuzzy not blank)
//   tiles         a URL template, or an array of {upto, url} zoom bands (the
//                 first band whose `upto` >= z wins; the last band is the
//                 default). Templates use {x} {y} {z} and {KeyName} tokens;
//                 {KeyName} is filled from window.keys (e.g. {Client_OS_K}).
const MapTypes = {
    roadmap:        { icon: "img/map-icon.png", maxZoom: 30 },
    satellite:      { icon: "img/map-icon-aerial.png", maxZoom: 30 },
    openStreetMap:  { icon: "img/map-icon.png", maxZoom: 30, nativeMaxZoom: 19,
                      tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" },
    osStreetMap:    { icon: "img/map-icon.png", maxZoom: 30, nativeMaxZoom: 20,
                      tiles: "https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/{z}/{x}/{y}.png?key={Client_OS_K}" },
    satelliteMap:   { nativeMaxZoom: 20,
                      tiles: "https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key={Client_OS_K}" },
    os1890map:      { icon: "img/map-icon-1890.png", maxZoom: 20, nativeMaxZoom: 19,
                      tiles: "https://deepmap.blob.core.windows.net/tiles/1890/{z}/{x}/{y}.png" },
    os1885map:      { icon: "img/map-icon-1900.png", maxZoom: 20, nativeMaxZoom: 16,
                      tiles: "https://api.maptiler.com/tiles/uk-osgb63k1885/{z}/{x}/{y}.png?key={Client_OS_K}" },
    os1900map:      { icon: "img/map-icon-1900.png", maxZoom: 20, nativeMaxZoom: 16,
                      tiles: "https://api.maptiler.com/tiles/uk-osgb1888/{z}/{x}/{y}.png?key={Client_OS_K}" },
    os1930map:      { nativeMaxZoom: 16, tiles: [
                          { upto: 13, url: "https://api.maptiler.com/tiles/uk-osgb1919/{z}/{x}/{y}.png?key={Client_OS_K}" },
                          { url: "https://api.maptiler.com/tiles/uk-osgb25k1937/{z}/{x}/{y}.jpg?key={Client_OS_K}" } ] },
    os1940map:      { icon: "img/map-icon-1940.png", maxZoom: 20, nativeMaxZoom: 19,
                      tiles: "https://deepmap.blob.core.windows.net/tiles/1940/{z}/{x}/{y}.png" },
    azureRoad:      { nativeMaxZoom: 20,
                      tiles: "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&subscription-key={Client_AzureMaps_K}" },
    azureSatellite: { nativeMaxZoom: 19,
                      tiles: "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.imagery&zoom={z}&x={x}&y={y}&tileSize=256&subscription-key={Client_AzureMaps_K}" },
    azureLabels:    { nativeMaxZoom: 20,
                      tiles: "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.hybrid.road&zoom={z}&x={x}&y={y}&tileSize=256&subscription-key={Client_AzureMaps_K}" }
};

/** Render a map type's tile URL for x/y/z by filling its template's tokens.
 * {x} {y} {z} are the tile coordinates; any other {name} is taken from
 * window.keys. A type whose `tiles` is an array picks the zoom band. */
function tileUrlFor(type, x, y, z) {
    let template = type.tiles;
    if (Array.isArray(template))
        template = (template.find(band => z <= band.upto) || template[template.length - 1]).url;
    const token = { x, y, z };
    return template.replace(/{(\w+)}/g, (_, name) => name in token ? token[name] : window.keys[name]);
}

/** Build an OverzoomMapType for a named layer in MapTypes. */
function overzoomLayer(name, minZoom = 0, onTileStatus = null) {
    const t = MapTypes[name];
    return new OverzoomMapType((x, y, z) => tileUrlFor(t, x, y, z), t.nativeMaxZoom, minZoom, name, onTileStatus);
}

/** A Google Maps map type serving x/y/z raster tiles which, beyond the tile set's
 * deepest available zoom, shows the deepest tiles scaled up - fuzzy rather than blank.
 * Usable both as a base map type (map.mapTypes.set) and as an overlay
 * (map.overlayMapTypes). Implements setOpacity like ImageMapType, for toggleOpacity.
 */
class OverzoomMapType {
    /**
     * @param {function(x,y,z):string} tileUrl
     * @param {int} nativeMaxZoom Deepest zoom level at which the tile server has tiles
     * @param {int} minZoom No tiles shown below this zoom
     * @param {string} name Shown in the map type control, if any
     * @param {function(bool)} onTileStatus Called with true/false as each tile loads or fails
     */
    constructor(tileUrl, nativeMaxZoom, minZoom = 0, name = "", onTileStatus = null) {
        this.tileUrl = tileUrl;
        this.nativeMaxZoom = nativeMaxZoom;
        this.minZoom = minZoom;
        this.maxZoom = 20; // beyond nativeMaxZoom, tiles are scaled up to here
        this.onTileStatus = onTileStatus;
        this.name = name;
        this.alt = name;
        this.tileSize = new google.maps.Size(256, 256);
        this.opacity = 1;
        this.liveTiles = new Set();
    }
    getTile(coord, zoom, ownerDocument) {
        let tile = ownerDocument.createElement("div");
        tile.style.width = this.tileSize.width + "px";
        tile.style.height = this.tileSize.height + "px";
        tile.style.overflow = "hidden";
        tile.style.position = "relative";
        tile.style.opacity = this.opacity;
        this.liveTiles.add(tile);
        if (zoom >= this.minZoom) {
            // Use real tiles up to their deepest zoom; scale them up beyond it:
            let z = Math.min(zoom, this.nativeMaxZoom);
            let scale = 1 << (zoom - z);
            // Wrap x at the 180th meridian; no tiles beyond the poles:
            let tilesPerGlobe = 1 << zoom;
            let cx = ((coord.x % tilesPerGlobe) + tilesPerGlobe) % tilesPerGlobe;
            if (coord.y >= 0 && coord.y < tilesPerGlobe) {
                let img = ownerDocument.createElement("img");
                img.src = this.tileUrl(Math.floor(cx / scale), Math.floor(coord.y / scale), z);
                img.style.position = "absolute";
                img.style.width = this.tileSize.width * scale + "px";
                img.style.height = this.tileSize.height * scale + "px";
                img.style.left = -this.tileSize.width * (cx % scale) + "px";
                img.style.top = -this.tileSize.height * (coord.y % scale) + "px";
                img.onerror = () => {
                    img.style.display = "none"; // no broken-image icons
                    if (this.onTileStatus) this.onTileStatus(false);
                };
                if (this.onTileStatus) img.onload = () => this.onTileStatus(true);
                tile.appendChild(img);
            }
        }
        return tile;
    }
    releaseTile(tile) {
        this.liveTiles.delete(tile);
    }
    setOpacity(opacity) {
        this.opacity = opacity;
        this.liveTiles.forEach(t => t.style.opacity = opacity);
    }
    getOpacity() {
        return this.opacity;
    }
}
