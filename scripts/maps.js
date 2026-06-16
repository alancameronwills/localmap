// The map on the screen. doLoadMap picks a cartography class - GoogleMap, AzureMap,
// or OpenMap, all running on the Google Maps JS engine - and exposes it as window.map.
// GenMap defines the interface the rest of the app uses. Tile servers are in
// tile-sources.js; base/overlay switching per zoom and map choice is in the
// MapView classes in map-views.js.

/** Controls whether the target icon in the middle of the map is showing.
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
    // Bing Maps was retired by Microsoft in 2025; its successor Azure Maps serves
    // projects configured for bing, once a key is in the server config (Client_AzureMaps_K).
    // window.keys comes from the localStorage cache (dbGetKeys), so a key added or removed
    // on the server takes effect one page load late; if the cached key turns out to be
    // invalid, AzureMap falls back to the osm bases when its tiles fail to load.
    let azure = window.keys && window.keys.Client_AzureMaps_K ? "azure" : "osm";
    const workingCartography = { google: "google", bing: azure, azure: azure, osm: "osm" };
    var queryCartography = window.location.queryParameters["cartography"];
    var cartography = queryCartography
        ? workingCartography[queryCartography] || queryCartography
        : workingCartography[window.project.cartography] || "osm";

    window.map = new ({
        google: GoogleMap, azure: AzureMap, osm: OpenMap
    }
    [cartography] || OpenMap)
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


/** Base class of the cartography classes: the map API the rest of the app uses.
 * Holds the pins (markers) for the places, and the current MapView.
 */
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
        let loc = defaultloc;
        try {
            loc = location.queryParameters.view
                ? JSON.parse(decodeURIComponent(location.queryParameters.view))
                : getCookieObject("mapView") || defaultloc;
        } catch { }
        this.mapView = MapView.fromCookie(loc, this.MapViewType);
        this.placeToPin = {};
        insertScript(`${apiUrl}/map?sort=${sort}`);
        this.mapChoiceObservable = new Observable(0);
        this.pinOpacity = new Observable(0);
        if (this.mapViewHandler) { // just in case this class doesn’t have one
            this.mapChoiceObservable.AddHandler(() => {
                this.mapView.MapChoice = this.mapChoiceObservable.Value;
                this.mapViewHandler();
            });
        }
        window.addEventListener("beforeunload", e => this.saveMapCookie());
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

    /** Toggles the map type.
     */
    toggleType(event) {
        if (!this.map) return;
        let modulo = (window.project.mapChoices ? window.project.mapChoices.length : 3);
        if (event.ctrlKey && this.toggleOpacity) {
            this.toggleOpacity();
        } else {
            let increment = (event.shiftKey || event.altKey) ? -1 : 1;
            this.mapChoiceObservable.Value = (this.mapChoiceObservable.Value + modulo + increment) %
                modulo;
            this.toggleOpacity && this.toggleOpacity(true);
        }
    }


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
    nearestPlace(posn, tracking, pinToExclude = null, cutOffMetres = null) {
        let minsq = 10000000;
        let markers = this.pins;
        let nearest = null;
        let nearestList = [];
        let latFactor = Math.cos(posn.n / 57.3);
        let cutOffDeg = cutOffMetres === null ? 0 : cutOffMetres / 111000;
        let cutOffSqDeg = cutOffDeg * cutOffDeg;
        for (var i = 0; i < markers.length; i++) {
            var other = markers[i];
            if (other == pinToExclude) continue; // Don't choose the one we're measuring from.
            if (!other.place) continue; // Could be an intersection marker
            let otherLL = this.getPinPosition && this.getPinPosition(other);
            if (!otherLL) continue;
            let dn = otherLL.n - posn.n;
            let de = (otherLL.e - posn.e) * latFactor;
            let dsq = dn * dn + de * de;
            if (tracking) {
                var rangekm = other.place.range / 1000;
                var rangesq = (rangekm * rangekm) / (111 * 111);
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
        log(`Zoom minsq=${distancekm.toExponential(2)} -> zoom=${zoom}`);
        if (cutOffMetres !== null) {
            nearestList.sort((a, b) => a.distancekm - b.distancekm);
        }
        return { place: nearest && nearest.place, distancekm: distancekm, zoom: zoom, nearestList };
    }

    zoomFor(pin) {
        if (pin.zoom) return pin.zoom;
        let pinLL = this.getPinPosition(pin);
        let nearest = this.nearestPlace(pinLL, false, pin);
        pin.zoom = nearest.zoom;
        return pin.zoom;
    }

    /**
     * Gets the current zoom, position and map type and saves to the mapView cookie
     */
    saveMapCookie() {
        if (this.map) {
            setCookie("mapView", this.getViewString());
        }
    }


    codeAddress(address) {
        let cleanAddress = address.replace(/[|&;$%@"<>(){}#~:^£!*]/g, "").trim();
        if (!cleanAddress) return;
        if (window.project.region && cleanAddress.indexOf(",") < 0) {
            cleanAddress += ", " + window.project.region;
        } else {
            cleanAddress = cleanAddress.replace(/, */, ", ");
        }
        this.gotoAddress(cleanAddress);
    }
}

class GeoCoderNominatim {
    constructor() {
        this.source = "https://nominatim.openstreetmap.org/search?q={0}&format=json";
    }
    async geocode(s) {
        let results = await fetch(this.source.replace("{0}", encodeURIComponent(s))).then(r => r.json()).catch(r => { error: r });
        return results[0];
    }
}



class GoogleMap extends GenMap {
    /*
    Google maps API is user pantywylan@gmail.com, project name mapdigi.org
    */

    // https://developers.google.com/maps/documentation/javascript/markers
    constructor(onloaded, defaultloc) {
        super(onloaded, "google", defaultloc);
        this.previousOverlay = "";
        show("opacitySlider", "inline-flex");
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

        this.setAltMapTypes();
        this.mapSetup();
        this.setUpMapMenu();
        this.onloaded && this.onloaded();
        this.setControlsWhileStreetView();

        this.mapViewHandler();

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
        });
        this.mapChoiceObservable.Value = this.mapView.mapChoice;

        this.geocoder = {
            gc: new GeoCoderNominatim(),
            geocode: async function (s) {
                let result = await this.gc.geocode(s);
                return new google.maps.LatLng(result?.lat, result?.lon);
            }
        }
    }

    /** Hide our controls while Streetview is displayed. */
    setControlsWhileStreetView() {
        let streetView = this.map.getStreetView();
        streetView.addListener("visible_changed", () => {
            show("topLayer", streetView.getVisible() ? "none" : "block");
        });
    }

    /** Define various map types pointing at their respective tile servers. */
    setAltMapTypes() {
        this.setAltMap("openStreetMap");
        this.setAltMap("osStreetMap");
        this.setAltMap("os1930map");
        this.setAltMap("os1900map");
    }

    /** Register the named MapTypes layer, overzoomed beyond its native zoom. */
    setAltMap(name, onTileStatus = null) {
        this.map.mapTypes.set(name, overzoomLayer(name, 0, onTileStatus));
    }

    /**
    * Reads user choice of map, zoom level; updates map engine’s base map and overlay.
    */
    mapViewHandler() {
        // Make sure mapView is up to date:
        this.mapView.MapChoice = this.mapChoiceObservable.Value;
        this.mapView.z = this.Zoom;
        if (this.Zoom > this.mapView.MaxZoom) {
            this.setZoom(this.mapView.MaxZoom);
            setTimeout(() => { this.setZoom(this.mapView.MaxZoom); }, 200);
            return;
        }
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

    toggleOpacity(setit) {
        if (this.previousOverlay) {
            let opacity = this.previousOverlay.getOpacity();
            if (opacity != opacity || !opacity) opacity = 1; // NaN or undefined
            opacity = setit ? 1 : opacity < 0.2 ? 1 : Math.max(0, opacity - 0.3);
            this.previousOverlay.setOpacity(opacity);
        }
    }

    onclick(f) {
        return this.map.addListener("click", (ev) => f({ n: ev.latLng.lat(), e: ev.latLng.lng() }, ev));
    }

    removeHandler(handler) {
        google.maps.event.removeListener(handler);
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
            if (window.user && window.user.isContributor) {
                window.map.menuBox.setPosition(e.latLng);
                window.map.menuBox.open(window.map.map);
            }
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

    menuBoxClose() {
        var loc = this.menuBox.getPosition();
        this.menuBox.close();
        return { e: loc.lng(), n: loc.lat() };
    }

    /**
     * Add a place to the map, or update it with changed title, tags, location, etc
     * @param {*} place
     * @param {*} inBatch - defer adding to map until repaint()
     */
    addOrUpdate(place, inBatch = false) {
        if (!place) return null;
        let pushpin = this.placeToPin[place.id];
        if (!pushpin) {
            var options = this.pinOptionsFromPlace(place);
            pushpin = new google.maps.Marker(options);
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

    deletePin(pin) {
        var i = this.markers.indexOf(pin);
        this.markers.splice(i, 1);
        this.markerClusterer.removeMarker(pin);
        pin.place.pin = null;
        pin.place = null;
    }

    replace(oldPlace, newPlace) {
        if (!newPlace) return null;
        var pin = this.placeToPin[oldPlace.id];
        if (!pin) return;
        this.placeToPin[newPlace.id] = pin;
        newPlace.pin = pin;
        oldPlace.pin = null;
        pin.place = newPlace;
        this.updatePin(pin);
        return pin;
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
        if (!this.extras) this.extras = [];
        this.extras.push(marker);
        return marker;
    }

    deleteExtras() {
        if (this.extras) {
            this.extras.forEach(pin => pin.map = null);
            this.extras = [];
        }
    }

    /**
     * User has entered a search for an address
     * @param {} cleanAddress
     * @see https://developers.google.com/maps/documentation/javascript/geocoding
     */
    async gotoAddress(cleanAddress) {
        let latlng = await this.geocoder.geocode(cleanAddress);

        this.map.setCenter(latlng);
        var marker = new google.maps.Marker({
            map: this.map,
            position: latlng
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
            this.map.panTo(this.offSetPointOnScreen(n, e, centerOffsetX, centerOffsetY));
            this.periodicZoom(e, n, centerOffsetX, centerOffsetY, pin);
        } else if (zoom == "inc") {
            result = this.incZoom(pin && this.zoomFor(pin));
            this.map.panTo(this.offSetPointOnScreen(n, e, centerOffsetX, centerOffsetY));
        }
        else {
            if (zoom) this.map.setZoom(zoom);
            this.map.panTo(this.offSetPointOnScreen(n, e, centerOffsetX, centerOffsetY));
        }
        return result;
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
                className: "pinLabel", // all styling is in the class - see deep-map.css
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

/** Map without Google base maps: bases and overlays all come from OSM and MapTiler
 * tile servers, so it works without a valid Google Maps key.
 * Inherits the base/overlay switching machinery from GoogleMap.
 */
class OpenMap extends GoogleMap {

    get MapViewType() { return MapViewOsm; }

    loaded() {
        log("OSM Map Loaded");
        super.loaded();
        // No Street View without a Google base map:
        this.map.setOptions({ streetViewControl: false });
    }

    /** Register the map types used as bases by MapViewOsm, in addition to GoogleMap's */
    setAltMapTypes() {
        super.setAltMapTypes();
        this.setAltMap("satelliteMap");
    }
}

/** Microsoft cartography: Azure Maps raster tiles (successor to the retired Bing Maps)
 * on the Google Maps engine. Needs an Azure Maps subscription key served as
 * Client_AzureMaps_K by the server's /api/keys.
 */
class AzureMap extends OpenMap {

    get MapViewType() { return MapViewAzure; }

    /** Register the map types used as bases by MapViewAzure */
    setAltMapTypes() {
        super.setAltMapTypes();
        // If no Azure tile ever loads but some fail, the key is probably invalid
        // (e.g. rotated, or stale in the localStorage cache): revert to the
        // OpenMap bases rather than leave a blank map. Self-heals on the next
        // page load, when dbGetKeys has refreshed the cache.
        let onTileStatus = ok => {
            if (ok) this.azureWorks = true;
            else if (!this.azureWorks && !this.azureFailed) {
                this.azureFailed = true;
                log("Azure Maps tiles unavailable - reverting to osm bases");
                this.mapViewHandler();
            }
        };
        this.setAltMap("azureRoad", onTileStatus);
        this.setAltMap("azureSatellite", onTileStatus);
    }
}


class Polygon {

    constructor(list, fn) {
        this.pp = [];
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
