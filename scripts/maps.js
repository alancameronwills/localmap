//const mapTypeEvent = new Event("mapType");
var timeWhenLoaded;
/*var radius = 5500;
var restricted = false;
var counter = 0;
var zoom = 14;
var resetCenter;
let cachePlaces = [];
var circleBoundsB;
let filtered = [];
let picURLs = [];
var urlCache;
var width = 1;
var i = 0;*/

/** Controls whether the target icon in the middle of the map is showing.
 * 
 */
class MapTarget extends MultipleNotifierListener {
    /** protected */
    specificSetValue(v) {
        let target = g("target");
        target.style.visibility = v ? "visible" : "hidden";
    }
}
window.mapTarget = new MapTarget();

function mapModuleLoaded(refresh = false) {
    window.map.loaded(window.onmaploaded || (() => { }), refresh);

    window.mapTarget.addTrigger(window.signInNotifier, () => window.user && true);
}

function doLoadMap(onloaded) {
    var projectCartography = window.project.cartography;
    var queryCartography = window.location.queryParameters["cartography"];
    var cartography = queryCartography || projectCartography || "bing";

    window.map = new ({
        google: GoogleMap, bing: BingMap, osm: OpenMap
    }
    [cartography] || BingMap)
        (onloaded, window.project.loc);

    window.signInNotifier.AddHandler(() => {
        let signedIn = !!window.user;
        if (signedIn && window.user.isAdmin) {
            show("cartographyDropdown");
        } else {
            hide("cartographyDropdown");
        }
    });
}


/** Encapsulates map location, zoom, and map choice.
 * Decides what map base and overlay to show.
 */
class MapView {
    constructor(n, e, z, mapChoice) {
        this.n = n;
        this.e = e;
        this.z = z;
        this.mapChoice = mapChoice;
    }
    get Zoom() { return this.z || 14; }

    static fromCookie(c, mapViewType) {
        if (!c) return null;
        if (c.loc) {
            // deal with legacy cookies
            return new mapViewType(c.loc.latitude, c.loc.longitude, c.zoom, c.mapChoice);
        } else {
            return new mapViewType(c.n, c.e, c.z, c.mapChoice);
        }
    }
}
class MapViewMS extends MapView {
    constructor(n, e, z, mapChoice) {
        super(n, e, z, mapChoice);
        this.overlayUri = {
            "osStreetMap": 'https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/{zoom}/{x}/{y}.png?key=' + window.keys.Client_OS_K,
            "os1900map": 'https://nls-0.tileserver.com/5gPpYk8vHlPB/{zoom}/{x}/{y}.png'
        };
    }
    get MapTypeId() {
        return this.mapChoice == 2
            ? Microsoft.Maps.MapTypeId.aerial
            : Microsoft.Maps.MapTypeId.ordnanceSurvey;
    }
    get Overlay() {
        switch (this.mapChoice) {
            // OS Landranger Map only goes up to zoom 17. Above that, display OS Standard.
            case 0: return this.z >= 17 ? this.overlayUri["osStreetMap"] : "";
            case 1: return this.overlayUri["os1900map"];
            case 2: return "";
        }
    }
    get Location() {
        return new Microsoft.Maps.Location(this.n, this.e);
    }
}

class MapViewGoogle extends MapView {

    constructor(n, e, z, mapChoice) {
        super(n, e, z, mapChoice);
        // Since these settings are constant, just create them once and return
        // one or the other when asked for the overlay.
        // Each is a function so we can delay actually creating until map is ready
        this.overlaySettingsGetters = {
            "": () => null, // No overlay required
            "os1900map": () => new google.maps.ImageMapType({
                getTileUrl: function (tile, zoom) {
                    return `https://nls-0.tileserver.com/5gPpYk8vHlPB/${zoom}/${tile.x}/${tile.y}.png`;
                },
                maxZoom: 20,
                minZoom: 7
            }),
            "os1930map": () => new google.maps.ImageMapType({
                getTileUrl: function (tile, zoom) {
                    // in tileserver.js:
                    return NLSTileUrlOS(tile.x, tile.y, zoom);
                },
                tileSize: new google.maps.Size(256, 256),
                maxZoom: 10,
                minZoom: 8,
                isPng: false
            }),
            "osStreetMap": () => new google.maps.ImageMapType({
                getTileUrl: function (tile, zoom) {
                    return `https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/${zoom}/${tile.x}/${tile.y}.png?key=${window.keys.Client_OS_K}`;
                },
                maxZoom: 20,
                minZoom: 17
            }),
            "openStreetMap": () => new google.maps.ImageMapType({
                getTileUrl: function (tile, zoom) {
                    return `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
                },
                maxZoom: 20
            })
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

    get MapTypeId() {
        switch (this.mapChoice) {
            case 2: return "satellite";
            case 1: return "roadmap";
            default:
                if (this.z < 20) return "openStreetMap";
                else return "osStreetMap";
        }
    }
    get Overlay() {
        switch (this.mapChoice) {
            case 2: return null;
            case 1: return this.z > 7 && this.overlaySettings("os1900map");
            default: return this.overlaySettings(
                this.z > 7 && this.z <= 15 && "os1930map");
        }
    }
    get Location() {
        return new google.maps.LatLng(this.n, this.e);
    }

}

class MapViewOSM extends MapView {
    get MapTypeId() {
        return ""; // Only one map type
    }
    get Overlay() { return ""; }
    get Location() {
        return new google.maps.LatLng(this.n || 54, this.e || -1);
    }

}


class GenMap {
    /** 
     * Load map module and display map.
     * @param {(){}} onloaded Function to perform when API has loaded
     * @param {"google"|"bing"} sort Map API to load
     * @param {{n,e,z,mapChoice}} defaultloc Where to start the map if no cookie or query params
     */
    constructor(onloaded, sort, defaultloc) {
        this.onloaded = onloaded;
        this.maxAutoZoom = 20;
        this.mapView = MapView.fromCookie(
            location.queryParameters.view
                ? JSON.parse(decodeURIComponent(location.queryParameters.view))
                : getCookieObject("mapView") || defaultloc
            , this.MapViewType);
        //alert (`GenMap ${sort} ${this.mapView.n} ${this.mapView.e}`);
        this.placeToPin = {};
        insertScript(siteUrl + "/api/map?sort=" + sort);
        this.mapChoiceObservable = new Observable(0);
        this.pinOpacity = new Observable(0);
        this.setOpacity;
        if (this.mapViewHandler) { // just in case this class doesn’t have one
            this.mapChoiceObservable.AddHandler(() => {
                this.mapView.mapChoice = this.mapChoiceObservable.Value;
                this.mapViewHandler();
            });
        }
        window.addEventListener("beforeunload", e => this.saveMapCookie());
        this.projectName;
    }

    loaded() {
        this.timeWhenLoaded = Date.now();
    }


    setPinsVisible(tag) {
        this.setPlacesVisible(place => place.HasTag(tag));
    }

    setPlaceVisibility(place, visible) {
        this.setPinVisibility(this.placeToPin[place.id], visible);
    }

    updatePinForPlace(place) {
        if (!place) return;
        this.updatePin(this.placeToPin[place.id]);
    }

    /**
    * Zoom to show all the places.
    * @param {Array(Place)} places 
    */
    setBoundsRoundPlaces(places) {
        var included = places.map(place => this.placeToPin[place.id]);
        this.setBoundsRoundPins(included);
    }

    showPlaceSet(placeIdList) {
        var included = placeIdList.map(placeId => this.placeToPin[placeId])
        this.setBoundsRoundPins(included);
        this.setPlacesVisible(place =>
            placeIdList.includes(place.id)
        );
    }

    setBoundsRoundPoints(points) {
        let box = { west: 180, east: -180, north: -90, south: 90 };
        points.forEach(point => {
            box.west = Math.min(box.west, point.e);
            box.east = Math.max(box.east, point.e);
            box.south = Math.min(box.south, point.n);
            box.north = Math.max(box.north, point.n);
        });
        this.setBoundsRoundBox(box);
    }

    repaint() { }

    /**
     * adds event handlers for different mouse events
     * @param {*} addHandler 
     * @param {*} pushpin 
     * @param {*} eventExtractor 
     */
    addMouseHandlers(addHandler, pushpin, eventExtractor) {
        addHandler('click', e => window.pinPops.pinClick(eventExtractor(e), pushpin));
        addHandler('mouseover', e => window.pinPops.pinMouseOver(eventExtractor(e), pushpin, true));
        addHandler('mouseout', e => window.pinPops.pinMouseOut(eventExtractor(e)));
    }

    get Zoom() { return this.map.getZoom(); }

    incZoom(max) {
        let z = this.Zoom;
        // Don't bother if only 1 out - reduce jumping around on trails:
        if (z < max - 1 && z < this.maxAutoZoom) {
            let aim = Math.min(max, z + 3);
            this.setZoom(aim);
            if (this.Zoom != aim) return false;
            return true;
        }
        else {
            return false;
        }
    }

    periodicZoom(e, n, offX, offY, pin) {
        this.stopPeriodicZoom();
        this.periodicZoomTimer = setInterval(() => {
            if (!this.moveTo(e, n, offX, offY, "inc", pin)) this.stopPeriodicZoom();
        }, 4000);
    }

    stopPeriodicZoom() {
        if (this.periodicZoomTimer) {
            clearInterval(this.periodicZoomTimer);
            this.periodicZoomTimer = null;
        }
    }

    /**
     * Nearest place, distancekm, zoom, nearestList
     * @param {n,e} posn 
     * @param {Pin} pinToExclude place we're centred at, if any
     * @param {int|null} cutOffKm null => just find nearest; >0 => make a sorted list
     */
    nearestPlace(posn, tracking, pinToExclude = null, cutOffKm) {
        let minsq = 10000000;
        let markers = this.pins;
        let nearest = null;
        let nearestList = [];
        let latFactor = Math.cos(posn.n / 57.3);
        let cutOffDeg = cutOffKm === null ? 0 : cutOffKm / 111;
        let cutOffSqDeg = cutOffDeg * cutOffDeg;
        for (var i = 0; i < markers.length; i++) {
            var other = markers[i];
            if (other == pinToExclude) continue;
            if (!other.place) continue;
            let otherLL = this.getPinPosition && this.getPinPosition(other);
            if (!otherLL) continue;
            let dn = otherLL.n - posn.n;
            let de = (otherLL.e - posn.e) * latFactor;
            let dsq = dn * dn + de * de;
            if (tracking) {
                var rangekm = other.place.range / 1000;
                var rangesq = (rangekm * rangekm) / 111;
                if (rangesq < dsq) continue;
            }
            if (dsq < minsq) {
                minsq = dsq;
                nearest = other;
            }
            if (dsq < cutOffSqDeg) nearestList.push({ pin: other, distancekm: Math.sqrt(dsq) * 111 });
        }
        log("Nearest " + (nearest ? nearest.place.Title : ""));
        let distancekm = Math.sqrt(minsq) * 111;
        let zoom = Math.min(20, Math.max(1, 9 - Math.floor(0.6 + Math.log2(minsq) * 10 / 23)));
        //log(`Zoom minsq=${distancekm.toExponential(2)} -> zoom=${zoom}`);
        if (cutOffKm !== null) {
            nearestList.sort((a, b) => a.distancekm - b.distancekm);
        }
        return { place: nearest && nearest.place, distancekm: distancekm, zoom: zoom, nearestList };
    }

    zoomFor(pin) {
        if (pin.zoom) return pin.zoom;
        let pinLL = this.getPinPosition(pin);
        let nearest = this.nearestPlace(pinLL, pin);
        pin.zoom = nearest.zoom;
        return pin.zoom;
    }

    /**
     * Gets the current zoom, position and map type and saves to the mapView cookie
     */
    saveMapCookie() {
        if (this.map) {
            setCookie("mapView", this.getViewString());
            //console.log(JSON.stringify(mapViewParam))
        }
    }


    setArea() {
        log(this.projectName);
        g("locationPopupID").style.display = "none";
        switch (this.projectName) {
            case "garnFawr":
                this.locationDetails = {
                    lat: 52.00217138773845, lng: -5.032960191437891
                };
                this.setLocation();
                if (window.project.id != "Garn Fawr") {
                    let params = "?project=garnfawr";
                    document.location.search = params;
                    break;
                }
                break;
            case "folio":
                this.locationDetails = {
                    lat: 52.562132, lng: -1.822827
                };
                this.setLocation();
                if (window.project.id != "Folio") {
                    let params = "?project=folio";
                    document.location.search = params;
                    break;
                }
                break;
            case "trewyddel":
                this.locationDetails = {
                    lat: 52.070666, lng: -4.758313
                };
                this.setLocation();
                if (window.project.id != "Trewyddel") {
                    let params = "?project=trewyddel";
                    document.location.search = params;
                    break;
                }
                break;
            case "trefdraeth":
                this.locationDetails = {
                    lat: 52.016392, lng: -4.836004
                };
                this.setLocation();
                if (window.project.id != "Trefdraeth") {
                    let params = "?project=trefdraeth";
                    document.location.search = params;
                    break;
                }
                break;
            case "":
                log("No Project Name");
                break;
        }

    }
    codeAddress(address) {
        let cleanAddress = address.replace(/[|&;$%@"<>(){}#~:^£!*]/g, "").trim();
        if (!cleanAddress) return;
        this.gotoAddress(cleanAddress);
    }
}



class GoogleMapBase extends GenMap {
    /*
    Google maps API is user pantywylan@gmail.com, project name moylegrove-f7u
    */

    // https://developers.google.com/maps/documentation/javascript/markers
    constructor(onloaded, defaultloc) {
        super(onloaded, "google", defaultloc);
        this.previousOverlay = "";
        this.geocoder;
        show("opacitySlider");
    }

    get MapViewType() { return MapViewGoogle; }

    loaded() {
        super.loaded();
    }

    /**
     * sets up the Google map with markers, control options and map type
     */
    mapSetup() {
        this.markerClusterer = new MarkerClusterer(this.map, [],
            { imagePath: 'img/m', gridSize: 50, maxZoom: 17, ignoreHidden: true });
        this.map.setOptions({
            mapTypeControl: false,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            panControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            streetViewControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            rotateControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            motionTrackingControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },

            mapTypeControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM,
                mapTypeControl: false,
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            }
        });
        this.map.getStreetView().setOptions({
            addressControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
            panControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
            fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM }
        });
        this.getMapType();
        this.map.addListener("maptypeid_changed", function () {
            window.map.getMapType();
            window.map.reDrawMarkers();
        });
        this.mapChoiceObservable.Value = this.mapView.mapChoice;
        this.geocoder = new google.maps.Geocoder();
        var latlng = new google.maps.LatLng(-34.397, 150.644);
        var mapOptions = {
            zoom: 8,
            center: latlng
        }


    }

    /**
     * refreshes markers on the map
     */
    reDrawMarkers() {
        for (var i = 0; i < this.markers.length; i++) {
            var pin = this.markers[i];
            this.updatePin(pin);
        }
    }

    onclick(f) {
        this.map.addListener("click", f);
    }
    /**
     * 
     * @returns mapType = Satellite || Roadmap
     */
    getMapType() {
        var t = this.map.getMapTypeId();
        this.mapType = t == google.maps.MapTypeId.SATELLITE || t == google.maps.MapTypeId.HYBRID ? "satellite" : "roadmap";
        return this.mapType;
    }


    /**
     * Sets up various handlers.
     * RightClickMenu: opens menuBox.
     * Zoom: logs zoom and runs mapViewHandler.
     * Click: Closes the open mapMenu.
     */
    setUpMapMenu() {
        var menuString = "";
        for (var i = 0; i < window.rightClickActions.length; i++) {
            menuString += "<a href='#' onclick='rightClickActions[{1}].eventHandler()'>{0}</a>".format(rightClickActions[i].label, i);
            menuString += "<br/>";
        }
        this.menuBox = new google.maps.InfoWindow({
            content: menuString
        });
        this.map.addListener("rightclick", function (e) {
            window.map.menuBox.setPosition(e.latLng);
            window.map.menuBox.open(window.map.map);
        });
        this.map.addListener("zoom_changed", e => {
            log("Zoom = " + this.Zoom);
            this.mapViewHandler();
        });
        this.map.addListener("click", e => {
            this.closeMapMenu();
        });
    }

    /**
     * Closes the open mapMenu
     */
    closeMapMenu() {
        if (this.menuBox) this.menuBox.close();
        this.stopPeriodicZoom();
    }

    /**
     * From rightClickActions
     */
    doAddPlace() {
        var loc = this.menuBox.getPosition();
        this.menuBox.close();
        showPlaceEditor(this.addOrUpdate(makePlace(loc.lng(), loc.lat())), 0, 0);
    }


    /**
     * used to cache the selected area of the map
     * @requires menuBox from right click
     */
    /*cacheMap() {
        filtered = [];
        cachePlaces = [];
        var loc = this.menuBox.getPosition();
        this.menuBox.setOptions({ visible: false });
        this.circle = new google.maps.Circle({ center: { lat: loc.lat(), lng: loc.lng() }, radius: radius, map: this.map, strokeColor: "blue", strokeWeight: 2, fillOpacity: 0 });
        this.map.fitBounds(this.circle.getBounds(), 0);
        this.menuBox.close();
        this.circle.setOptions({ visible: false });
        this.map.setOptions({ center: this.menuBox.getPosition() });

        this.circleBounds = {
            north: this.map.getBounds().getNorthEast().lat(),
            south: this.map.getBounds().getSouthWest().lat(),
            west: this.map.getBounds().getSouthWest().lng(),
            east: this.map.getBounds().getNorthEast().lng(),
        };
        circleBoundsB = this.circleBounds;
        this.circleCenter = { lat: loc.lat(), lng: loc.lng() };
        //console.log(this.circleCenter);
        this.Restriction = {
            latLngBounds: this.circleBounds,
            strictBounds: false,
        };
        //this.map.setOptions({restriction: { latLngBounds: this.circleBounds }, strictBounds: false, zoom: 14 });
        resetCenter = { lat: loc.lat(), lng: loc.lng() };



        Object.keys(window.Places).forEach(key => { cachePlaces.push(window.Places[key]); });
        //console.log(cachePlaces);

        filtered = cachePlaces.filter(function (item) {
            return item.loc.e <= circleBoundsB.east
                && item.loc.e >= circleBoundsB.west
                && item.loc.n <= circleBoundsB.north
                && item.loc.n >= circleBoundsB.south
                && item.pics.filter(function (item) { return item.isPicture == true; })
                && item.pics.length > 0;
        });
        //console.log(filtered);

        filtered.map(a => a.pics.map(a => a.id).forEach(function (item) {
            if (window.innerWidth < 1080 && item.match(/\.(jpeg|jpg|JPG|png)$/)) {
                item = item.replace(/\.[^.]+$/, ".jpg");
                urlCache = siteUrl + "/smedia/" + item;
                if (urlCache.match(/\.(jpeg|jpg|JPG|png)$/) != null) {
                    picURLs.push(siteUrl + "/smedia/" + item);
                }
                urlCache = "";
            } else {
                urlCache = siteUrl + "/smedia/" + item;
                if (urlCache.match(/\.(jpeg|jpg|JPG|gif|png)$/) != null) {
                    picURLs.push(siteUrl + "/media/" + item);
                }
                urlCache = "";
            }
        }));
        picURLs.forEach(function (item) {
            $.get(item);
        });
        log(picURLs);
        picURLs = [];


        this.panMapStart();
    }*/

    setLocation() {
        this.map.panTo(this.locationDetails);
        this.map.setZoom(13);
        return;
    }

    /**
     * updates the progress bar as the map is cached
     */
    updateBar() {
        var elem = g("myBar");
        if (width >= 100) {
            width = 0;
            i = 0;
        } else {
            width = width + 1.38;
            elem.style.width = width + "%";
            elem.innerHTML = width.toFixed(1) + "%";
        }
    }

    /**
     * starts the caching process
     */
    panMapStart() {
        setTimeout(() => { this.panMapEastLatLng() }, 250);
    }
    panMapEastLatLng() {
        this.map.panTo({ lat: this.map.getCenter().lat(), lng: this.map.getCenter().lng() + 0.01 });
        setTimeout(() => { this.panMapWestLatLng(); this.updateBar(); }, 250);
    }
    panMapWestLatLng() {
        this.map.panTo({ lat: this.map.getCenter().lat(), lng: this.map.getCenter().lng() - 0.02 });
        setTimeout(() => { this.panMapReset(); this.updateBar(); }, 250);
    }
    /**
     * resets to center and increases zoom for caching the map tiles
     */
    panMapReset() {
        if (counter < 3) {
            this.map.panTo({ lat: this.map.getCenter().lat() + 0.01, lng: this.map.getCenter().lng() + 0.01 });
            counter = counter + 1;
            setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
        } else if (counter == 3) {
            this.map.panTo({ lat: this.map.getCenter().lat() - 0.03, lng: this.map.getCenter().lng() + 0.01 });
            counter = counter + 1;
            setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
        } else if (counter > 3 && counter < 6) {
            this.map.panTo({ lat: this.map.getCenter().lat() - 0.01, lng: this.map.getCenter().lng() + 0.01 });
            counter = counter + 1;
            setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
        } else {
            if (zoom < 17) {
                this.map.panTo({ lat: this.map.getCenter().lat() + 0.03, lng: this.map.getCenter().lng() + 0.01 });
                this.map.setZoom(zoom)
                zoom = zoom + 1;
                counter = 1;
                setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
            } else {
                var popup = g("loadingPopupID");
                popup.style.display = "none";
                zoom = 13;
                this.map.setZoom(zoom);
                this.map.panTo(resetCenter);
            }
        }
    }
    /**
     * adds areas to instantly pan to (NOT IN USE)
     */
    addArea() {
        g("locationPopupID").style.display = "none";
        this.map.setOptions({ draggableCursor: "url(img/map-pin.png), auto" })
        var locationString = "";
        for (var i = 0; i < window.addLocationClick.length; i++) {
            locationString += "<a href='#' onclick='addLocationClick[{1}].eventHandler()'>{0}</a>".format(addLocationClick[i].label, i);
            locationString += "<br/>";
        }
        this.locationBox = new google.maps.InfoWindow({
            content: locationString
        });
        this.map.addListener("click", function (e) {
            window.map.locationBox.setPosition(e.latLng);
            window.map.locationBox.open(window.map.map);
        });
    }

    newLocation() { //Work in progress...
        this.map.setOptions({ draggableCursor: "" });
        var loc = this.locationBox.getPosition();
        this.locationBox.close();
        var newLine = g("locationPopupID").getElementsByClassName("popup-content")[0];
        newLine.insertAdjacentHTML("beforeend", "<p><button class='selection' onclick='placeName = 'garnFawr', setArea()'>Garn Fawr</button></p>");
    }







    /**
     * Add a place to the map, or update it with changed title, tags, location, etc
     * @param {*} place 
     * @param {*} inBatch - defer adding to map until repaint()
     */
    addOrUpdate(place, inBatch = false) {
        if (!place) return null;
        if (!(pushpin = this.placeToPin[place.id])) {
            var options = this.pinOptionsFromPlace(place);
            var pushpin = new google.maps.Marker(options);
            this.markers.push(pushpin);
            pushpin.myColor = options.icon.strokeColor;
            pushpin.id = place.id;
            pushpin.place = place;
            place.pin = pushpin;
            pushpin.setOpacity(1);
            this.placeToPin[place.id] = pushpin;

            this.addMouseHandlers((eventName, handler) => pushpin.addListener(eventName, handler), pushpin, e => e.tb || e.ub || e.ab || e.vb || e.nb || e.domEvent);

            this.markerClusterer.addMarker(pushpin, inBatch);
        } else {
            this.updatePinForPlace(place);
        }
        return pushpin;
    }

    extraPoint(loc, screenRadius, colour = "yellow") {
        // https://developers.google.com/maps/documentation/javascript/reference/marker
        let marker = new google.maps.Marker({
            position: { lat: loc.n, lng: loc.e },
            map: this.map,
            clickable: false,
            // https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                strokeColor: colour,
                strokeWeight: 2,
                scale: 6
            }
        });
        return marker;
    }

    /**
     * User has entered a search for an address
     * @param {} cleanAddress 
     * @see https://developers.google.com/maps/documentation/javascript/geocoding
     */
    gotoAddress(cleanAddress) {
        this.geocoder.geocode({
            componentRestrictions: {
                country: "GB"
            },
            'address': cleanAddress
        }, (results, status) => {
            if (status == 'OK') {
                log(cleanAddress);
                this.map.setCenter(results[0].geometry.location);
                var marker = new google.maps.Marker({
                    map: this.map,
                    position: results[0].geometry.location
                });
            } else {
                this.geocoder.geocode({
                    'address': cleanAddress
                }, (results, status) => {
                    if (status == 'OK') {
                        log(cleanAddress);
                        this.map.setCenter(results[0].geometry.location);
                        var marker = new google.maps.Marker({
                            map: this.map,
                            position: results[0].geometry.location
                        });
                    } else {
                        alert('Geocode was not successful for the following reason: ' + status);
                    }
                });
            }
        });

    }
    /**
     * After calling addOrUpdate(place,true)
     */
    repaint() {
        this.markerClusterer.repaint();
    }

    clustering(on) {
        this.markerClusterer.setOptions({ minimumClusterSize: on ? 2 : 20 });
        this.repaint();
    }

    setZoom(z) {
        this.map.setZoom(z);
    }

    moveTo(e, n, centerOffsetX, centerOffsetY, zoom, pin) {
        let result = true;
        if (zoom == "auto") {
            let c = this.map.getCenter();
            this.setBoundsRoundPoints([{ e: e, n: n }, { e: c.lng(), n: c.lat() }]);
            //this.incZoom(this.maxAutoZoom, 1);
            this.map.panTo(this.offSetPointOnScreen(n, e, centerOffsetX, centerOffsetY));
            this.periodicZoom(e, n, centerOffsetX, centerOffsetY, pin);
        } else if (zoom == "inc") {
            result = this.incZoom(pin && this.zoomFor(pin));
            this.map.panTo(this.offSetPointOnScreen(n, e, centerOffsetX, centerOffsetY)); //    { lat: n, lng: e });
        }
        else {
            if (zoom) this.map.setZoom(zoom);
            this.map.panTo(this.offSetPointOnScreen(n, e, centerOffsetX, centerOffsetY)); //    { lat: n, lng: e });
        }
        return result;
    }

    deletePin(pin) {
        var i = this.markers.indexOf(pin);
        this.markers.splice(i, 1);
        this.markerClusterer.removeMarker(pin);
        pin.place.pin = null;
        pin.place = null;
    }

    replace(oldPlace, newPlace) {
        if (!newPlace) return null;
        var pin = place.pin;
        if (!pin) return;
        newPlace.pin = pin;
        place.pin = null;
        pin.place = newPlace;
        updatePin(pin);
        return pin;
    }


    addOrUpdateLink(place1) {
        if (!place1) return;
        let place2 = place1.next;
        if (!place2) return;
        if (place1 == place2) return;
        let newLine = this.drawLine(place1.loc, place2.loc, place1.line);
        if (!place1.line) {
            place1.line = newLine;
            google.maps.event.addListener(newLine, "click",
                () => this.setBoundsRoundPlaces([place1, place2]));
        }
    }

    removeLink(place1) {
        if (!place1 || !place1.line) return;
        place1.line.setMap(null);
        place1.line = null;
    }

    /** Draw a line between two points 
     * @param {e,n} loc1 
     * @param {e,n} loc2 
     * @param {[google.maps.Polyline]} existingLine - update this if it exists
     * @param {[string]} colour 
     * @returns 
     */
    drawLine(loc1, loc2, existingLine, colour = "red") {
        let lineCoords = [{ lat: loc1.n, lng: loc1.e }, { lat: loc2.n, lng: loc2.e }];
        let lineOptions = { map: this.map, path: lineCoords, strokeColor: colour || "red", strokeWidth: 3 };
        if (existingLine) {
            existingLine.setOptions(lineOptions);
            return existingLine;
        } else {
            return new google.maps.Polyline(lineOptions);
        }
    }

    /** Draw a polygon on the map */
    drawPolyline(path, colour = "lightblue") {
        let googlePath = path.map(p => { return { lat: p.n, lng: p.e }; });
        return new google.maps.Polyline({
            map: this.map,
            strokeColor: colour,
            strokeWidth: 3,
            path: googlePath
        });
    }

    removeElement(element) {
        element.setMap(null);
    }

    /** Draw an initial editable polygon on the map */
    drawPoly() {
        let bounds = this.map.getBounds();
        let ne = bounds.getNorthEast();
        let sw = bounds.getSouthWest();
        let height = ne.lat() - sw.lat();
        let width = ne.lng() - sw.lng();
        let xe = sw.lng() + width / 3;
        let xw = sw.lng() + width * 2 / 3;
        let xs = sw.lat() + height / 3;
        let xn = sw.lat() + height * 2 / 3;
        let path = [{ lat: xs, lng: xe }, { lat: xn, lng: xe }, { lat: xn, lng: xw }, { lat: xs, lng: xw }];
        let googlePoly = { map: this.map, strokeColor: "blue", strokeWidth: 3, editable: true, path: path };
        this.poly = new google.maps.Polygon(googlePoly);
        this.poly.addListener("mouseup", evt => this.updateLocalPoly());
        this.updateLocalPoly();
    }

    /** Remove the editable polygon */
    clearPoly() {
        if (this.poly) this.poly.setMap(null);
        this.poly = null;
        this.localPoly = null;
    }

    /** User has moved the polygon */
    updateLocalPoly() {
        this.localPoly = new Polygon(this.poly.getPath().getArray(), p => { return { x: p.lng(), y: p.lat() }; });
    }

    /** Whether the user-drawn polygon contains a place */
    polyContains(e, n) {
        return this.localPoly && this.localPoly.contains(e, n);
    }

    /** Whether the user-drawn filter polygon is on the map */
    get isPolyActive() { return !!this.localPoly; }

    /** Sets the options for the pins */
    pinOptionsFromPlace(place, nomap = false) {
        var options = pinOptions(place);
        var googleOptions = {
            label: {
                color: this.getLabelColor(),
                fontWeight: "bold",
                text: options.title
            },
            position: new google.maps.LatLng(place.loc.n, place.loc.e),
            icon: options.isGroupHead // trying a few options for grouphead
                ? {
                    url: (place.indexGroupNode && place.indexGroupNode.isShowingSubs
                        ? "img/compass-open.png"
                        : "img/compass.png"),
                    anchor: { x: 26, y: 30 },
                    labelOrigin: { x: 30, y: 70 }
                }
                : {
                    path: google.maps.SymbolPath.CIRCLE,
                    strokeColor: options.color,
                    fillColor: options.isGroupHead ? "white" : place.IsInteresting ? "black" : options.color,
                    fillOpacity: 1,
                    scale: options.isGroupHead ? 10 : 6,
                    labelOrigin: { x: 0, y: 2.3 }
                }
        };
        return googleOptions;
    }


    /** Set the title and colour according to the attached place 
    */
    updatePin(pin) {
        pin.setOptions(this.pinOptionsFromPlace(pin.place));
    }

    setPlacesVisible(filter) {
        let includedPins = [];
        this.markers.forEach(item => {
            let place = item.place;
            if (place) {
                let yes = !filter || filter(place);
                if (yes) {
                    includedPins.push(item);
                }
                item.setVisible(yes);
            }
        });
        this.repaint();
        return includedPins;
    }

    setPinVisibility(pin, visibility) {
        pin.setVisible(visibility);
    }

    get pins() {
        return this.markers;
    }

    getPinPosition(pin) {
        let loc = pin.getPosition();
        return { n: loc.lat(), e: loc.lng() };
    }

    setBoundsRoundPins(pins) {
        this.setBoundsRoundPoints(pins.map(pin => {
            let latLng = pin.getPosition();
            return { n: latLng.lat(), e: latLng.lng() }
        }));
    }

    setBoundsRoundBox(box) {
        this.map.fitBounds(box);
        if (this.Zoom > this.maxAutoZoom) {
            this.map.setZoom(this.maxAutoZoom);
        }
        this.map.setCenter({ lat: (box.north + box.south) / 2, lng: (box.west + box.east) / 2 });
    }

    /**
     * @returns current map location, zoom and mapChoice
     */
    getViewString() {
        var loc = this.map.getCenter();
        return JSON.stringify({
            n: loc.lat(),
            e: loc.lng(),
            z: this.Zoom,
            mapChoice: this.mapChoiceObservable.Value,
            mapTypeId: this.mapView.mapTypeId, // TODO probably redundant
            mapBase: "google"
        });
    }

    /** Toggles the map type.
     *  OS map || Old map || Satellite map
     */
    toggleType() {
        if (!this.map) return;
        this.mapChoiceObservable.Value = (this.mapChoiceObservable.Value + 1) % 3;
        this.reDrawMarkers(); // TODO: nicer to spring this off observable
    }



    screenToLonLat(x, y) {
        let worldRect = this.map.getBounds();
        let northWestCorner = new google.maps.LatLng(worldRect.getNorthEast().lat(), worldRect.getSouthWest().lng());
        let topLeftGlobalPixel = this.map.getProjection().fromLatLngToPoint(northWestCorner);
        let scale = 1 << this.Zoom;
        let pointGlobalPixel = { x: x + topLeftGlobalPixel.x * scale, y: y + topLeftGlobalPixel.y * scale };
        let pointWorldPixel = { x: pointGlobalPixel.x / scale, y: pointGlobalPixel.y / scale };
        let latLng = this.map.getProjection().fromPointToLatLng(pointWorldPixel);
        return { n: latLng.lat(), e: latLng.lng() };
    }

    pinScreenPoint(pin) {
        return this.lonLatToScreen(pin.getPosition());
    }

    lonLatToScreen(lngLat) {
        let scale = 1 << this.Zoom;
        let worldRect = this.map.getBounds();
        let northWestCorner = new google.maps.LatLng(worldRect.getNorthEast().lat(), worldRect.getSouthWest().lng());
        let worldPoint = this.map.getProjection().fromLatLngToPoint(lngLat);
        let topLeftWorld = this.map.getProjection().fromLatLngToPoint(northWestCorner);
        let screenOffset = { x: (worldPoint.x - topLeftWorld.x) * scale, y: (worldPoint.y - topLeftWorld.y) * scale };
        return screenOffset;
    }

    offSetPointOnScreen(lat, lng, dx, dy) {
        let scale = 1 << this.Zoom;
        let worldPoint = this.map.getProjection().fromLatLngToPoint(new google.maps.LatLng(lat, lng));
        let offsetPoint = { x: worldPoint.x - dx / scale, y: worldPoint.y - dy / scale };
        return this.map.getProjection().fromPointToLatLng(offsetPoint);
    }

}

class GoogleMap extends GoogleMapBase {

    constructor(onloaded, defaultloc) {
        super(onloaded, defaultloc);
        this.oldMapLoaded = false;
    }

    get MapViewType() { return MapViewGoogle; }

    loaded() {
        log("Google Map Loaded");
        super.loaded();
        this.markers = [];
        g("target").style.top = "50%";
        this.map = new google.maps.Map(g('theMap'),
            {
                center: this.mapView.Location,
                zoom: this.mapView.Zoom,
                tilt: 0,
                clickableIcons: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
                keyboardShortcuts: false,
                //mapTypeControl: false,
                mapTypeId: this.mapView.MapTypeId,
                styles: [
                    {
                        "featureType": "transit.station",
                        "stylers": [{ visibility: "off" }]
                    },
                    {
                        "featureType": "poi",
                        "stylers": [{ visibility: "off" }]
                    }
                ]
            });
        // Create the search box and link it to the UI element.

        this.setAltMapTypes();
        this.mapSetup();
        this.setUpMapMenu();
        this.NLScredit();
        this.onloaded && this.onloaded();
        this.setControlsWhileStreetView();

        this.mapViewHandler();

    }

    NLScredit() {
        let credit = c("NLScredit", "div", null, null, {
            style: 'background:rgba(255,255,255,0.5);font-size:10px;padding:0 4px;',
            h: 'Historical maps from <a href="https://maps.nls.uk/projects/api/">NLS Maps API<\/a>'
        });
        this.map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(credit);
    }


    /** Hide our controls if Streetview is displayed.
     * Currently, it turns up as the 2nd grandchild. 
     * After being added on first use, it is hidden and displayed as required.
     */
    setControlsWhileStreetView() {
        // Not all browsers have IntersectionObserver:
        if (IntersectionObserver) {
            // Wait for streetview div to be added by crude polling:
            window.watchForStreetview = setInterval(() => {
                try {
                    // Hugely dependent on current implementation. Might not work one day:
                    let streetView = g("theMap").children[0].children[1];
                    // If this is really it...
                    if (streetView && streetView.className.indexOf("gm-style") >= 0) {
                        // Nicer way of waiting for it to show and hide:
                        window.mapObserver = new IntersectionObserver((items, o) => {
                            // Show or hide our controls:
                            show("topLayer", items[0].isIntersecting ? "none" : "block");
                        }, { threshold: 0.5 });
                        window.mapObserver.observe(streetView);
                    }
                } catch {
                    // Failed to find streetview - give up:
                    clearInterval(window.watchForStreetview);
                }
            }, 2000);
        }
    }

    /** Define various map types pointing at their respective tile servers */
    setAltMapTypes() {
        let setAltMap = (name, maxZoom, fnxyz) => {
            this.map.mapTypes.set(name, new google.maps.ImageMapType({
                getTileUrl: function (tile, zoom) {
                    let tilesPerGlobe = 1 << zoom;
                    let x = (tile.x + tilesPerGlobe) % tilesPerGlobe;
                    return fnxyz(x, tile.y, zoom);
                },
                name: name,
                maxZoom: maxZoom
            }));
        }

        setAltMap("openStreetMap", 20, (x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
        setAltMap("osStreetMap", 20, (x, y, z) => `https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/${z}/${x}/${y}.png?key=${window.keys.Client_OS_K}`);
        setAltMap("os1930map", 20, (x, y, z) => NLSTileUrlOS(x, y, z)); //tileserver.js
        setAltMap("os1900map", 20, (x, y, z) => `https://nls-0.tileserver.com/5gPpYk8vHlPB/${z}/${x}/${y}.png`);
    }

    /**
     * label color depending on the selected map and map type
     */
    getLabelColor() {
        const labelColours = ["#606080", "#0000FF", "#FFFF80"];
        return labelColours[this.mapChoiceObservable.Value];
    }

    /**
    * Reads user choice of map, zoom level; updates map engine’s base map and overlay.
    */
    mapViewHandler() {
        // Make sure mapView is up to date:
        this.mapView.mapChoice = this.mapChoiceObservable.Value;
        this.mapView.z = this.Zoom;
        // set the base map:
        this.map.setMapTypeId(this.mapView.MapTypeId);
        // change the overlay map, if necessary:
        let overlayRequired = this.mapView.Overlay; // returns a Google map settings
        if (this.previousOverlay != overlayRequired) {
            this.previousOverlay = overlayRequired;
            this.map.overlayMapTypes.clear();
            if (overlayRequired) {
                this.map.overlayMapTypes.insertAt(0, overlayRequired);
            }
        }
    }
}
var coords;
class OpenMap extends GoogleMapBase {
    constructor(onloaded, defaultloc) {
        super(onloaded, defaultloc);
        this.tileURL;
    }

    getLabelColor() {
        return "#0000FF";
    }

    get MapViewType() { return MapViewOSM; }

    loaded() {
        log("OSM Map Loaded");
        super.loaded();
        this.markers = [];
        g("target").style.top = "50%";
        g("mapbutton").style.display = "none";
        var element = document.getElementById("theMap");

        this.map = new google.maps.Map(element, {
            center: this.mapView.Location,
            zoom: this.mapView.Zoom,
            mapTypeId: "OSM",
            streetViewControl: false,
            tilt: 0,
            clickableIcons: false,
            fullscreenControl: false,
            gestureHandling: "greedy",
            keyboardShortcuts: false,
            styles: [
                {
                    "featureType": "transit.station",
                    "stylers": [{ visibility: "off" }]
                },
                {
                    "featureType": "poi",
                    "stylers": [{ visibility: "off" }]
                }
            ]
        });

        //Define OSM map type pointing at the OpenStreetMap tile server
        this.map.mapTypes.set("OSM", new google.maps.ImageMapType({
            getTileUrl: function (coord, zoom) {
                // "Wrap" x (longitude) at 180th meridian properly
                // NB: Don't touch coord.x: because coord param is by reference, and changing its x property breaks something in Google's lib
                var tilesPerGlobe = 1 << zoom;
                var x = coord.x;
                x = coord.x % tilesPerGlobe;
                if (x < 0) {
                    x = tilesPerGlobe + x;
                }
                // Wrap y (latitude) in a like manner if you want to enable vertical infinite scrolling
                coords = x + "/" + coord.y;
                return "https://tile.openstreetmap.org/" + zoom + "/" + x + "/" + coord.y + ".png";
            },
            tileSize: new google.maps.Size(256, 256),
            name: "OpenStreetMap",
            maxZoom: 18
        }));

        this.mapSetup();
        this.setUpMapMenu();
        this.onloaded && this.onloaded();

    }

    getTiles() {
        var loc = this.menuBox.getPosition();
        this.menuBox.setOptions({ visible: false });
        this.circle = new google.maps.Circle({ center: { lat: loc.lat(), lng: loc.lng() }, radius: 5500, map: this.map, strokeColor: "blue", strokeWeight: 2, fillOpacity: 0 });
        this.map.fitBounds(this.circle.getBounds(), 0);
        this.menuBox.close();
        this.circle.setOptions({ visible: true });
        this.map.setOptions({ center: this.menuBox.getPosition() });

        this.circleBounds = {
            north: this.map.getBounds().getNorthEast().lat(),
            south: this.map.getBounds().getSouthWest().lat(),
            west: this.map.getBounds().getSouthWest().lng(),
            east: this.map.getBounds().getNorthEast().lng(),
        };
        this.circleBoundsB = this.circleBounds;
        this.circleCenter = { lat: loc.lat(), lng: loc.lng() };


        /*this.map.panTo({lat: this.circleBounds.south, lng: this.circle.getCenter().lng()});
        console.log(coords);
        this.map.panTo({lat: this.circleBounds.north, lng: this.circle.getCenter().lng()});*/
        //console.log(this.circleBounds.north, this.circleBounds.south, this.circleBounds.east, this.circleBounds.west);
        setTimeout(() => { this.panEast(); }, 750)
        //getTileUrl(this)
    }
    panEast() {
        this.map.panTo({ lat: this.circle.getCenter().lat(), lng: this.circleBounds.east });


        setTimeout(() => { this.panWest(); }, 750)
    }
    panWest() {
        this.eastCoords = coords.split("/");
        this.eastx = this.eastCoords[0];
        this.easty = this.eastCoords[1];
        console.log("East: " + this.eastCoords);
        this.map.panTo({ lat: this.circle.getCenter().lat(), lng: this.circleBounds.west });


        setTimeout(() => { this.panNorth(); }, 750)
    }
    panNorth() {
        this.westCoords = coords.split("/");
        this.westx = this.westCoords[0];
        this.westy = this.westCoords[1];
        console.log("West: " + this.westCoords);
        this.map.panTo({ lat: this.circleBounds.north, lng: this.circle.getCenter().lng() });


        setTimeout(() => { this.panSouth(); }, 750)
    }
    panSouth() {
        this.northCoords = coords.split("/");
        this.northx = this.northCoords[0];
        this.northy = this.northCoords[1];
        console.log("North: " + this.northCoords);
        this.map.panTo({ lat: this.circleBounds.south, lng: this.circle.getCenter().lng() });


        setTimeout(() => { this.cacheTiles(); }, 750)
    }
    cacheTiles() {
        this.southCoords = coords.split("/");
        this.southx = this.southCoords[0];
        this.southy = this.southCoords[1];
        console.log("South: " + this.southCoords);

        this.zoomLevel = this.map.getZoom();
        let tilesArray = [];
        this.tileResultLat = this.eastx - this.westx;
        this.tileRestulLng = this.southy - this.northy;
        var i;

        for (i = 0; i < this.tileResultLat; this.westx++, i++) {
            tilesArray.push("https://tile.openstreetmap.org/" + this.zoomLevel + "/" + this.westx + "/" + this.westy + ".png");
            tilesArray.push("https://tile.openstreetmap.org/" + (this.zoomLevel + 1) + "/" + (this.westx * 2) + "/" + (this.westy * 2) + ".png");
            tilesArray.push("https://tile.openstreetmap.org/" + (this.zoomLevel + 2) + "/" + ((this.westx * 2) * 2) + "/" + ((this.westy * 2) * 2) + ".png");
        }
        i = 0;

        for (i = 0; i < this.tileRestulLng; this.northy++, i++) {
            tilesArray.push("https://tile.openstreetmap.org/" + this.zoomLevel + "/" + this.northx + "/" + this.northy + ".png");
            tilesArray.push("https://tile.openstreetmap.org/" + (this.zoomLevel + 1) + "/" + (this.northx * 2) + "/" + (this.northy * 2) + ".png");
            tilesArray.push("https://tile.openstreetmap.org/" + (this.zoomLevel + 2) + "/" + ((this.northx * 2) * 2) + "/" + ((this.northy * 2) * 2) + ".png");
        }

        console.log(tilesArray);

    }

    mapViewHandler() {
        // Only one map in this class
    }
}

class BingMap extends GenMap {
    // https://docs.microsoft.com/bingmaps/v8-web-control/map-control-api
    constructor(onloaded, defaultloc) {
        super(onloaded, "bing", defaultloc);
        g("mapbutton").style.top = "50px";
        g("fullWindowButton").style.top = "50px";
        this.layers = {};
        hide("opacitySlider");
    }
    get MapViewType() { return MapViewMS; }

    clearPoly() { }

    loaded() {
        log("Bing Map Loaded");
        super.loaded();

        // Load map:
        this.map = new Microsoft.Maps.Map(g('theMap'),
            {
                mapTypeId: this.mapView.mapTypeId,
                center: this.mapView.Location,
                showLocateMeButton: false,
                showMapTypeSelector: false,
                showZoomButtons: true,
                disableBirdseye: true,
                disableKeyboardInput: true,
                disableStreetside: true,
                enableClickableLogo: false,
                navigationBarMode: Microsoft.Maps.NavigationBarMode.compact,
                zoom: this.mapView.Zoom
            });

        Microsoft.Maps.Events.addHandler(this.map, 'viewchangeend',
            () => this.mapViewHandler());
        this.setUpMapMenu();
        this.mapChoiceObservable.Value = this.mapView.mapChoice;
        this.onloaded && this.onloaded();

    }

    onclick(f) {
        Microsoft.Maps.Events.addHandler(this.map, "click", f);
    }

    gotoAddress(cleanAddress) {
        Microsoft.Maps.loadModule(
            'Microsoft.Maps.Search',
            () => {
                const countryList = ["united states", "america", " na", " us", " usa", " ca", "canada", " nz", "new zealand", " au", "australia"];
                const iterator = countryList.values();
                for (const value of iterator) {
                    var containsCountry = cleanAddress.includes(value);
                    if (containsCountry) {
                        break;
                    }
                }
                var searchManager = new Microsoft.Maps.Search.SearchManager(this.map);
                if (containsCountry) {
                    var requestOptions = {
                        bounds: this.map.getBounds(),
                        where: cleanAddress,
                        callback: (answer, userData) => {
                            this.map.setView({ bounds: answer.results[0].bestView });
                            this.map.entities.push(new Microsoft.Maps.Pushpin(answer.results[0].location));
                        }
                    };
                } else {
                    var requestOptions = {
                        bounds: this.map.getBounds(),
                        where: cleanAddress + ", uk",
                        callback: (answer, userData) => {
                            this.map.setView({ bounds: answer.results[0].bestView });
                            this.map.entities.push(new Microsoft.Maps.Pushpin(answer.results[0].location));
                        }
                    };
                }

                searchManager.geocode(requestOptions);
                log(requestOptions);
            }
        );
    }

    setZoom(z) {
        this.map.setView({ zoom: z });
    }

    moveTo(e, n, offX, offY, zoom, pin) {
        let result = true;
        if (zoom == "auto") {
            let c = this.map.getCenter();
            this.setBoundsRoundPoints([{ e: e, n: n }, { e: c.longitude, n: c.latitude }]);
            this.periodicZoom(e, n, offX, offY, pin);
        } else if (zoom == "inc") {
            result = this.incZoom(pin && this.zoomFor(pin));
        } else if (zoom) {
            this.map.setView({ zoom: zoom });
        }
        this.map.setView({
            center: new Microsoft.Maps.Location(n, e),
            centerOffset: new Microsoft.Maps.Point(offX, offY)
        });
        return result;
    }
    setLocation() {
        this.map.setView({
            center: new Microsoft.Maps.Location(this.locationDetails.lat, this.locationDetails.lng),
            zoom: 13
        });
        return;
    }
    setUpMapMenu() {
        this.menuBox = new Microsoft.Maps.Infobox(
            this.map.getCenter(),
            {
                visible: false,
                showPointer: true,
                offset: new Microsoft.Maps.Point(0, 0),
                actions: window.rightClickActions
            });
        this.menuBox.setMap(this.map);
        Microsoft.Maps.Events.addHandler(this.map, "rightclick",
            function (e) {
                // Don't provide right-click on map on a mobile
                if (!window.deviceHasMouseEnter) return;
                // Ignore accidental touches close to the edge - often just gripping fingers:
                if (e.pageY && (e.pageX < 40 || e.pageX > window.innerWidth - 40)) return;
                window.map.menuBox.setOptions({
                    location: e.location,
                    visible: true
                });
            });
        Microsoft.Maps.Events.addHandler(this.map, "click", function (e) {
            window.map.closeMapMenu();
        });
    }

    closeMapMenu() {
        if (window.map.menuBox != null) { window.map.menuBox.setOptions({ visible: false }); }
        this.stopPeriodicZoom();
    }

    doAddPlace() {
        var loc = this.menuBox.getLocation();
        this.menuBox.setOptions({ visible: false });
        showPlaceEditor(this.addOrUpdate(makePlace(loc.longitude, loc.latitude)), 0, 0);
    }

    latlongToEN(loc) { return { e: loc.longitude, n: loc.latitude }; }

    drawCircle(centre, radiusMeters = 5000, colour = "blue") {
        var loc = centre || this.latlongToEN(this.menuBox.getLocation());
        this.menuBox.setOptions({ visible: false });
        this.circle = new Microsoft.Maps.Circle({ center: { lat: loc.n, lng: loc.e }, radius: radiusMeters, map: this.map, strokeColor: colour, strokeWeight: 2 });
    }

    addOrUpdate(place) {
        if (!place) return null;
        var pushpin = null;
        try {
            if (!(pushpin = this.placeToPin[place.id])) {
                pushpin = new Microsoft.Maps.Pushpin(
                    new Microsoft.Maps.Location(place.loc.n, place.loc.e),
                    {
                        title: place.Title.replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " "),
                        enableHoverStyle: false
                    }
                );
                this.map.entities.push(pushpin);
                this.addMouseHandlers((eventName, fn) => Microsoft.Maps.Events.addHandler(pushpin, eventName, fn), pushpin, e => e);
            }
            pushpin.place = place;
            this.placeToPin[place.id] = pushpin;
            this.updatePin(pushpin);
        } catch (xx) {
            log("map addOrUpdate " + xx);
        }
        return pushpin;
    }

    
    extraPoint(loc, screenRadius, colour = "darkred") {
        let pin = new Microsoft.Maps.Pushpin (
            new Microsoft.Maps.Location(loc.n, loc.e), {color:colour});
        this.map.entities.push(pin);
        if (!this.extras) this.extras = [];
        this.extras.push(pin);
        return pin;
    }

    deleteExtras() {
        if (this.extras) {
            this.extras.forEach(pin => this.map.entities.remove(pin));
            this.extras = [];
        }
    }


    deletePin(pin) {
        this.map.entities.remove(pin);
        delete this.placeToPin[pin.place.id];
    }

    /**
     * Add a link from a place.
     * PRE: next and prvs pointers are set or null.
     * @param {Place} place1 source
     */
    addOrUpdateLink(place1) {
        if (!place1) return;
        let place2 = place1.next;
        if (!place2) return;
        if (place1 == place2) return;
        place1.line = this.drawLine(place1.loc, place2.loc, place1.line, null,
            e => this.setBoundsRoundPlaces([place1, place2]));
    }

    /** Draw a line between two points 
     * @param {e,n} loc1 
     * @param {e,n} loc2 
     * @param {[Microsoft.Maps.Polyline]} existingLine - update this if it exists
     * @param {[string]} colour 
     * @param {(evt)} onclick
     * @returns 
     */
    drawLine(loc1, loc2, existingLine, colour = "red", onclick) {

        let lineCoords = [new Microsoft.Maps.Location(loc1.n, loc1.e),
            new Microsoft.Maps.Location(loc2.n, loc2.e)];
        if (existingLine) {
            existingLine.setLocations(lineCoords);
            return existingLine;
        } else {
            let line = new Microsoft.Maps.Polyline(lineCoords, {
                strokeColor: colour,
                strokeThickness: 3
            });
            this.map.entities.push(line);
            if (onclick) Microsoft.Maps.Events.addHandler(line, "click", onclick);
            return line;
        }
    }

    /**
     * Delete the line from a place.
     * @param {Place} place 
     */
    removeLink(place) {
        if (place && place.line) {
            this.map.entities.remove(place.line);
            place.line = null;
        }
    }

    /** Set the title and colour according to the attached place 
    */
    updatePin(pin) {
        var options = pinOptions(pin.place);
        options.color = Microsoft.Maps.Color.fromHex(options.color);
        if (options.isGroupHead) {
            options.icon = this.principalPinTemplate();
            options.text = pin.place.Title;
            options.title = "";
            options.anchor = { x: 50, y: 12 };
        }
        pin.setOptions(options);
        pin.setLocation(new Microsoft.Maps.Location(
            pin.place.loc.n, pin.place.loc.e));
    }

    // Big marker for towns that aren't currently displayed:
    principalPinTemplate() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="25">'
            + '<rect x="0" y="0" width="100" height="25" rx="7" ry="7" fill="blue" />'
            + '<text x="7" y="15" fill="white" font-family="sans-serif" font-size="12px">{text}</text>'
            + '</svg>';
    }

    showPin(pin, e) {
        showPlaceEditor(pin, e.pageX, e.page.Y);
    }

    pinScreenPoint(pin) {
        if (!pin.getLocation) return null;
        return this.map.tryLocationToPixel(pin.getLocation(), Microsoft.Maps.PixelReference.control);
    }

    /**
     * Map has moved, changed zoom level, or changed type
     * Reads user choice of map, zoom level; updates map engine’s base map and overlay.
     */
    mapViewHandler() {
        // make sure mapView is up to date:
        this.mapView.mapChoice = this.mapChoiceObservable.Value;
        this.mapView.z = this.Zoom;

        // set base map:
        this.map.setView({ mapTypeId: this.mapView.MapTypeId });

        // set overlay:
        let overlayRequired = this.mapView.Overlay; // returns an overlay URI or ""
        if (this.previousOverlay != overlayRequired) {
            if (this.previousOverlay && this.layers[this.previousOverlay]) {
                this.layers[this.previousOverlay].setVisible(0);
            }
            this.previousOverlay = overlayRequired;
            if (overlayRequired) {
                if (!this.layers[overlayRequired]) {
                    this.layers[overlayRequired] = new Microsoft.Maps.TileLayer({
                        mercator: new Microsoft.Maps.TileSource({
                            uriConstructor: overlayRequired
                        })
                    });
                    this.map.layers.insert(this.layers[overlayRequired]);
                }
                this.layers[overlayRequired].setVisible(1);
            }
        }



        // OS map licence goes stale after some interval. Reload the map if old:
        if (this.mapChoiceObservable && timeWhenLoaded && (Date.now() - timeWhenLoaded > 60000 * 15)) {
            this.refreshMap();
        }
    }

    toggleType() {
        if (!this.map) return;
        this.mapChoiceObservable.Value = (this.mapChoiceObservable.Value + 1) % 3;
    }


    /**
     * Refresh Bing map. After about 15 minutes, it loses its OS licence.
     *  
     */
    refreshMap() {
        this.saveMapCookie();
        this.map.dispose();
        mapModuleLoaded(true);
    }

    getViewString() {
        var loc = this.map.getCenter();
        return JSON.stringify({
            n: loc.latitude,
            e: loc.longitude,
            z: this.Zoom,
            mapChoice: this.mapChoiceObservable.Value,
            mapBase: "bing"
        });
    }

    setBoundsRoundPins(pins) {
        var rect = Microsoft.Maps.LocationRect.fromShapes(pins);
        this.map.setView({ bounds: rect, padding: 100 });
        if (this.Zoom > 18) {
            this.map.setView({ zoom: 18 });
        }
    }

    setBoundsRoundBox(box) {
        var rect = Microsoft.Maps.LocationRect.fromEdges(box.north, box.west, box.south, box.east);
        this.map.setView({ bounds: rect, padding: 100 });
        if (this.Zoom > 17) {
            this.map.setView({ zoom: 17 });
        }
    }

    /**
     * Zoom out the map view if necessary to encompass the specified loc
     * @param {*} loc 
     */
    mapBroaden(loc) {
        var asIs = window.map.getBounds();
        this.map.setView({
            bounds: Microsoft.Maps.LocationRect.fromLocations(
                [asIs.getNorthwest(), asIs.getSoutheast(),
                new Microsoft.Maps.Location(loc.n, loc.e)]), padding: 40
        });
    }

    setPlacesVisible(which) {
        let includedPins = [];
        let shapes = this.map.entities.getPrimitives();
        for (var i = 0; i < shapes.length; i++) {
            let pin = shapes[i];
            let place = pin.place;
            if (!place) continue; // Not a pin
            let yes = !which || which(place);
            if (yes) includedPins.push(pin);
            pin.setOptions({ visible: yes });
        }
        return includedPins;
    }

    setPinVisibility(pin, visibility) {
        pin.setOptions(({ visible: visibility }));
    }

    get pins() {
        return this.map.entities.getPrimitives();
    }

    getPinPosition(pin) {
        if (!pin.getLocation) return null; // May be some other graphic
        let loc = pin.getLocation();
        return { n: loc.latitude, e: loc.longitude };
    }

    replace(oldPlace, newPlace) {
        if (!newPlace) return null;
        var pin = this.placeToPin[oldPlace.id];
        if (!pin) return;
        this.placeToPin[newPlace.id] = pin;
        pin.place = newPlace;
        this.updatePin(pin);
        return pin;
    }
    screenToLonLat(x, y) {
        var loc = this.map.tryPixelToLocation(new Microsoft.Maps.Point(x - window.innerWidth / 2, y - window.innerHeight / 2));
        return { e: loc.longitude, n: loc.latitude };
    }

    /** Draw a polyline on the map */
    drawPolyline(path, colour = "lightblue") {
        let bingpath = path.map(p => { return { latitude: p.n, longitude: p.e }; });
        let poly = new Microsoft.Maps.Polyline(bingpath,
            {
                map: this.map,
                strokeColor: colour,
                strokeThickness: 3
            });
        this.map.entities.push(poly);
        return poly;
    }

    removeElement(element) {
        this.map.entities.remove(element);
    }
}





class Polygon {

    constructor(list, fn) {
        this.pp = [];
        //let pointsList = "";
        for (let i = 0; i < list.length; i++) {
            let p = fn(list[i]);
            this.add(p.x, p.y);
        }
    }

    add(x, y) {
        if (this.pp.length == 0) {
            this.bbox = { l: x, r: x, t: y, b: y };
        } else {
            if (x < this.bbox.l) this.bbox.l = x;
            if (x > this.bbox.r) this.bbox.r = x;
            if (y < this.bbox.t) this.bbox.t = y;
            if (y > this.bbox.b) this.bbox.b = y;
        }
        this.pp.push({ x, y });
    }
    contains(x, y) {
        if (x < this.bbox.l || x > this.bbox.r) return false;
        if (y < this.bbox.t || y > this.bbox.b) return false;
        var i, j = this.pp.length - 1;
        var odd = 0;
        for (i = 0; i < this.pp.length; i++) {
            if ((this.pp[i].y < y && this.pp[j].y >= y || this.pp[j].y < y && this.pp[i].y >= y)
                && (this.pp[i].x <= x || this.pp[j].x <= x)) {
                odd ^= (this.pp[i].x + (y - this.pp[i].y) * (this.pp[j].x - this.pp[i].x) / (this.pp[j].y - this.pp[i].y)) < x;
            }
            j = i;
        }
        return odd == 1;
    }
}

