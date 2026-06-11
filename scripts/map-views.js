// MapView classes: each encapsulates map location, zoom, and map choice, and decides
// which base map and overlay the map engine should show for the current zoom and
// choice. Each map class in maps.js names its MapView subclass via MapViewType.
// Tile servers and OverzoomMapType are in tile-sources.js.

/** Encapsulates map location, zoom, and map choice.
 * Decides what map base and overlay to show.
 */
class MapView {
    constructor(n, e, z, mapChoice) {
        this.n = isNaN(n) ? 54 : n;
        this.e = isNaN(e) ? -4 : e;
        this.z = isNaN(z) ? 18 : z;
        this.mapChoice = isNaN(mapChoice) ? 0 : mapChoice;
    }

    /**
     * Construct an instance of a subclass of MapView
     * @param {{n,e,z,mapChoice}} c Location, zoom, and mapChoice
     * @param {class} mapViewType Subclass of MapView
     * @returns MapView
     */
    static fromCookie(c, mapViewType) {
        if (!c) return null;
        else {
            return new mapViewType(c.n, c.e, c.z, c.mapChoice);
        }
    }

    /** Set properties of the available maps choices here.
     * maxZoom 20 = the layer's OverzoomMapType shows scaled-up tiles beyond its native zoom. */
    static MapProperties = {
        "roadmap": { maxZoom: 30, icon: "img/map-icon.png", tileGetter: () => null },
        "satellite": { maxZoom: 30, icon: "img/map-icon-aerial.png", tileGetter: () => null },
        "os1890map": {
            maxZoom: 20, icon: "img/map-icon-1890.png",
            tileGetter: (tile, zoom) => TileUrl1890(tile.x, tile.y, zoom)
        },
        "os1900map": {
            maxZoom: 20, icon: "img/map-icon-1900.png",
            tileGetter: (tile, zoom) => TileUrl1900(tile.x, tile.y, zoom)
        },
        "os1940map": {
            maxZoom: 20, icon: "img/map-icon-1940.png",
            tileGetter: (tile, zoom) => TileUrl1940(tile.x, tile.y, zoom)
        },
        "osStreetMap": {
            maxZoom: 30, icon: "img/map-icon.png",
            tileGetter: (tile, zoom) => TileUrlOsStreet(tile.x, tile.y, zoom),
        },
        "openStreetMap": {
            maxZoom: 30, icon: "img/map-icon.png",
            tileGetter: (tile, zoom) => TileUrlOsm(tile.x, tile.y, zoom)
        }
    }

    get MapChoices() {
        return window.project.mapChoices ||
            ["roadmap", "satellite", "os1900map"];
    }

    /** Name of the currently chosen map, e.g. "roadmap" */
    get Choice() {
        return this.MapChoices[(this.mapChoice || 0) % this.MapChoices.length];
    }

    set MapChoice(index) {
        this.mapChoice = index % this.MapChoices.length;
    }

    get MapProperties() { return MapView.MapProperties[this.Choice || "roadmap"]; }

    get MaxZoom() {
        return this.MapProperties.maxZoom;
    }

    get Icon() {
        return this.MapProperties.icon;
    }

    get Zoom() { return this.z || 14; }
}

class MapViewGoogle extends MapView {

    constructor(n, e, z, mapChoice) {
        super(n, e, z, mapChoice);
        // Since these settings are constant, just create them once and return
        // one or the other when asked for the overlay.
        // Each is a function so we can delay actually creating until map is ready
        this.overlaySettingsGetters = {
            "": () => null, // No overlay required
            "os1890map": () => new OverzoomMapType(TileUrl1890, nativeMaxZooms.os1890map, 13),
            "os1900map": () => new OverzoomMapType(TileUrl1900, nativeMaxZooms.os1900map, 7),
            "os1930map": () => new OverzoomMapType(TileUrl1930, nativeMaxZooms.os1930map, 8),
            "os1940map": () => new OverzoomMapType(TileUrl1940, nativeMaxZooms.os1940map, 13),
            "osStreetMap": () => new OverzoomMapType(TileUrlOsStreet, nativeMaxZooms.osStreetMap, 17),
            "openStreetMap": () => new OverzoomMapType(TileUrlOsm, nativeMaxZooms.openStreetMap)
        };
    }

    /** private - get the Google settings for a particular overlay map
     * @param {*} sort Our name for overlay map
     */
    overlaySettings(sort) {
        if (!sort) return null; // No overlay required
        // If this setting isn't in the cache, create it:
        if (!this.overlaySettingsCache) this.overlaySettingsCache = {};
        if (!this.overlaySettingsCache[sort]) {
            // Run the selected function to generate the settings:
            this.overlaySettingsCache[sort] = this.overlaySettingsGetters[sort]();
        }
        return this.overlaySettingsCache[sort];
    }

    /** Base map */
    get MapTypeId() {
        return {
            "roadmap": this.z < 20 ? "openStreetMap" : "osStreetMap",
            "satellite": "hybrid",
            "os1890map": this.z > 13 ? "hybrid" : "osStreetMap",
            "os1900map": this.z > 13 ? "hybrid" : "osStreetMap",
            "os1940map": this.z > 13 ? "hybrid" : "osStreetMap"
        }
        [this.Choice];
    }
    get Overlay() {
        return this.overlaySettings({
            "roadmap": null,
            "satellite": null,
            "os1890map": this.z >= 13 && "os1890map",
            "os1900map": this.z > 7 && "os1900map",
            "os1940map": this.z >= 16 && "os1940map" || this.z > 7 && "os1930map"
        }[this.Choice]);

    }
    get Location() {
        return new google.maps.LatLng(this.n, this.e);
    }
}

/** Map view for the OpenMap cartography. Runs on the Google Maps engine but uses no
 * Google base maps: bases come from OSM and MapTiler tile servers, so it works
 * without a valid Google Maps key. Overlays are inherited from MapViewGoogle.
 */
class MapViewOsm extends MapViewGoogle {
    /** Map type used as the road base; registered in OpenMap.setAltMapTypes */
    get RoadBase() { return "openStreetMap"; }
    /** Map type used as the satellite base; registered in OpenMap.setAltMapTypes */
    get SatelliteBase() { return "satelliteMap"; }
    /** Base map */
    get MapTypeId() {
        return {
            "roadmap": this.RoadBase,
            "satellite": this.SatelliteBase,
            "os1890map": this.z > 13 ? this.SatelliteBase : "osStreetMap",
            "os1900map": this.z > 13 ? this.SatelliteBase : "osStreetMap",
            "os1940map": this.z > 13 ? this.SatelliteBase : "osStreetMap"
        }
        [this.Choice];
    }
    get MaxZoom() {
        // Beyond their tiles' native zoom, the OverzoomMapTypes show scaled-up tiles:
        return Math.min(super.MaxZoom, 20);
    }
}

/** Map view for the AzureMap cartography: Azure Maps raster tiles on the Google Maps
 * engine. Same as MapViewOsm except for the road and satellite bases, plus a label
 * overlay to make the satellite view hybrid. If the Azure tiles fail to load
 * (e.g. invalid key), reverts to the MapViewOsm bases.
 */
class MapViewAzure extends MapViewOsm {
    constructor(n, e, z, mapChoice) {
        super(n, e, z, mapChoice);
        this.overlaySettingsGetters["azureLabels"] = () => new OverzoomMapType((x, y, z) =>
            AzureTileUrl("microsoft.base.hybrid.road", x, y, z), nativeMaxZooms.azureLabels);
    }
    get AzureFailed() { return window.map && window.map.azureFailed; }
    get RoadBase() { return this.AzureFailed ? super.RoadBase : "azureRoad"; }
    get SatelliteBase() { return this.AzureFailed ? super.SatelliteBase : "azureSatellite"; }
    get Overlay() {
        if (this.Choice == "satellite" && !this.AzureFailed)
            return this.overlaySettings("azureLabels");
        return super.Overlay;
    }
}
