// Raster tile servers and the OverzoomMapType that serves their tiles to the
// Google Maps engine. The choice of which tiles to show at each zoom and map
// choice is in map-views.js; the map classes themselves are in maps.js.

function TileUrl1890(x, y, z) {
    return `https://deepmap.blob.core.windows.net/tiles/1890/${z}/${x}/${y}.png`;
}

function TileUrl1900(x, y, z) {
    return `https://api.maptiler.com/tiles/uk-osgb63k1885/${z}/${x}/${y}.png?key=${window.keys.Client_OS_K}`;
}

function TileUrl1930(x, y, z) {
    if (z < 14)
        return `https://api.maptiler.com/tiles/uk-osgb1919/${z}/${x}/${y}.png?key=${window.keys.Client_OS_K}`;
    else
        return `https://api.maptiler.com/tiles/uk-osgb25k1937/${z}/${x}/${y}.jpg?key=${window.keys.Client_OS_K}`;
}

function TileUrl1940(x, y, z) {
    return `https://deepmap.blob.core.windows.net/tiles/1940/${z}/${x}/${y}.png`;
}

function TileUrlOsm(x, y, z) {
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function TileUrlOsStreet(x, y, z) {
    return `https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/${z}/${x}/${y}.png?key=${window.keys.Client_OS_K}`;
}

function TileUrlSatellite(x, y, z) {
    return `https://api.maptiler.com/maps/hybrid/256/${z}/${x}/${y}.jpg?key=${window.keys.Client_OS_K}`;
}

/** Raster tiles from Azure Maps, Microsoft's successor to the retired Bing Maps.
 * @param tilesetId e.g. "microsoft.base.road" | "microsoft.imagery" | "microsoft.base.hybrid.road"
 */
function AzureTileUrl(tilesetId, x, y, z) {
    return `https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=${tilesetId}&zoom=${z}&x=${x}&y=${y}&tileSize=256&subscription-key=${window.keys.Client_AzureMaps_K}`;
}

/** Deepest zoom at which each tile server has real tiles. Beyond this,
 * OverzoomMapType shows the deepest tiles scaled up - fuzzy rather than blank. */
const nativeMaxZooms = {
    openStreetMap: 19,
    osStreetMap: 20,
    satelliteMap: 20,
    os1890map: 19,
    os1900map: 16,
    os1930map: 16,
    os1940map: 19,
    azureRoad: 20,
    azureSatellite: 19,
    azureLabels: 20
};

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
