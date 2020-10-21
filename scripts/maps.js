const mapTypeEvent = new Event("mapType");
var timeWhenLoaded;

function mapModuleLoaded(refresh = false) {
    window.map.loaded(window.onmaploaded || (() => { }), refresh);
}


function doLoadMap(onloaded) {

    var projectCartography = window.project.cartography;
    var queryCartography = window.location.queryParameters["cartography"]
        ? (window.location.queryParameters["cartography"] == "google" ? "google" : "bing")
        : null;
    var cartography = queryCartography || projectCartography || "bing";

    window.map = cartography == "google"
        ? new GoogleMap(onloaded, window.project.loc)
        : new BingMap(onloaded, window.project.loc);
}

class MapView {
    constructor(n, e, z, mapType) {
        this.n = n;
        this.e = e;
        this.z = z;
        this.mapType = mapType || "aerial"; // a | os 

    }
    static fromOldCookie(c) {
        if (c && c.loc) {
            return new MapView(c.loc.latitude, c.loc.longitude, c.zoom, c.mapType);
        } else {
            return c;
        }
    }
    get Zoom() { return this.z || 14; }
}
class MapViewMS extends MapView {
    get MapTypeId() {
        switch (this.mapType) {
            case "a":
            case "aerial":
            case "satellite":
            case "hybrid": return Microsoft.Maps.MapTypeId.aerial;
            default: return Microsoft.Maps.MapTypeId.ordnanceSurvey;
        }
    }
    get Location() {
        return new Microsoft.Maps.Location(this.n || 51, this.e || -4);
    }
}

class MapViewGoogle extends MapView {
    get MapTypeId() {
        switch (this.mapType) {
            case "a": case "aerial": case "hybrid": return "hybrid";
            case "satellite": return "satellite";
            default: return "roadmap";
        }
    }
    get Location() {
        return new google.maps.LatLng(this.n || 54, this.e || -1);
    }
}


class GenMap {
    /**
     * Load map module and display map.
     * @param {(){}} onloaded
     * @param {"google"|"bing"} sort 
     * @param {{n,e,z,mapType}} defaultloc 
     */
    constructor(onloaded, sort, defaultloc) {
        this.onloaded = onloaded;
        let mapViewParam = location.queryParameters.view 
        ? JSON.parse(decodeURIComponent(location.queryParameters.view)) 
        : MapView.fromOldCookie(getCookieObject("mapView"));
        this.mapView = cast((mapViewParam || defaultloc), this.MapViewType);
        this.placeToPin = {};
        insertScript(siteUrl + "/api/map?sort=" + sort);
    }

    loaded() {
        this.timeWhenLoaded = Date.now();
        window.addEventListener("beforeunload", e => this.saveMapCookie());
    }

    setPinsVisible(tag) {
        this.setPlacesVisible(place => place.HasTag(tag));
    }

    /**
    * Zoom to show all the places.
    * @param {Array(Place)} places 
    */
    setBoundsRoundPlaces(places) {
        var included = places.map(place => this.placeToPin[place.id]);
        this.setBoundsRoundPins(included);
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

    addMouseHandlers(addHandler, pushpin, eventExtractor) {
        addHandler('click', e => window.pinPops.pinClick(eventExtractor(e), pushpin));
        addHandler('mouseover', e => window.pinPops.pinMouseOver(eventExtractor(e), pushpin, true));
        addHandler('mouseout', e => window.pinPops.pinMouseOut(eventExtractor(e)));
    }

    incZoom(max) {
        let z = this.map.getZoom();
        // Don't bother if only 1 out - reduce jumping around on trails:
        if (z < max-1) {
            let aim = Math.min(max, z + 3);
            this.setZoom(aim);
            if (this.map.getZoom() != aim) return false;
            return true;
        }
        else return false;
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
     * nearest pin, distance squared to it, zoom appropriate
     * @param {n,e} posn 
     * @param pin place we're centred at, if any
     */
    nearestPlace(posn, pin = null) {
        let minsq = 10000000;
        let markers = this.pins;
        let nearest = null;
        for (var i = 0; i < markers.length; i++) {
            var other = markers[i];
            if (other == pin) continue;
            let otherLL = this.getPinPosition && this.getPinPosition(other);
            if (!otherLL) continue;
            let dn = otherLL.n - posn.n;
            let de = (otherLL.e - posn.e) * 2; // assume mid-lat
            let dsq = dn * dn + de * de;
            if (dsq < minsq) {
                minsq = dsq;
                nearest = other;
            }
        }
        log("Nearest " + nearest ? nearest.place.Title : "");
        let zoom = Math.min(20, Math.max(1, 9 - Math.floor(0.3 + Math.log2(minsq) * 10 / 23)));
        log(`Zoom minsq=${minsq.toExponential(2)} -> zoom=${zoom}`);
        return {nearest: nearest, distancesq: minsq, zoom: zoom};
    }

    zoomFor(pin) {
        if (pin.zoom) return pin.zoom;
        let pinLL = this.getPinPosition(pin);
        let nearest = this.nearestPlace(pinLL, pin);
        pin.zoom = nearest.zoom;
        return pin.zoom;
    }

    saveMapCookie() {
        if (this.map) {
            setCookie("mapView", this.getViewString());
        }
    }

}

class GoogleMap extends GenMap {
    // https://developers.google.com/maps/documentation/javascript/markers
    constructor(onloaded, defaultloc) {
        super(onloaded, "google", defaultloc);
        this.maxAutoZoom = 20;
        this.oldMapLoaded = false;
    }
    get MapViewType() { return MapViewGoogle; }

    loaded() {
        super.loaded();
        this.markers = [];
        g("target").style.top = "50%";
        this.map = new google.maps.Map(document.getElementById('theMap'),
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
        this.markerClusterer = new MarkerClusterer(this.map, [],
            { imagePath: 'img/m', gridSize: 30, maxZoom: 18, ignoreHidden: true });
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

        this.isMapTypeOsObservable = new ObservableWrapper(() => this.map.getMapTypeId() == "roadmap");

        this.setUpMapMenu();
        this.onloaded && this.onloaded();

        // Hide our controls if Streetview is displayed.
        // Currently, it turns up as the 2nd grandchild. 
        // After being added on first use, it is hidden and displayed as required.
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
        this.insertOldMap();
    }

    reDrawMarkers() {
        for (var i = 0; i < this.markers.length; i++) {
            var pin = this.markers[i];
            this.updatePin(pin);
        }
    }

    onclick(f) {
        this.map.addListener("click", f);
    }

    getMapType() {
        var t = this.map.getMapTypeId();
        this.mapType = t == google.maps.MapTypeId.SATELLITE || t == google.maps.MapTypeId.HYBRID ? "satellite" : "roadmap";
        return this.mapType;
    }


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
            // console.log("rightclick 1");
            window.map.menuBox.setPosition(e.latLng);
            window.map.menuBox.open(window.map.map);
        });
        this.map.addListener("zoom_changed", e => {
            log("Zoom = " + this.map.getZoom());
            this.insertOldMap();
        });
        this.map.addListener("click", e => {
            this.closeMapMenu();
        });
    }

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
        showPopup(this.addOrUpdate(makePlace(loc.lng(), loc.lat())), 0, 0);
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

            this.placeToPin[place.id] = pushpin;

            this.addMouseHandlers((eventName, handler) => pushpin.addListener(eventName, handler), pushpin, e => e.tb || e.ub || e.ab || e.vb);

            this.markerClusterer.addMarker(pushpin, inBatch);
        } else {
            this.updatePin(this.placeToPin[place.id]);
        }
        return pushpin;
    }

    /**
     * After calling addOrUpdate(place,true)
     */
    repaint() {
        this.markerClusterer.repaint();
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
        let lineCoords = [{ lat: place1.loc.n, lng: place1.loc.e }, { lat: place2.loc.n, lng: place2.loc.e }];
        let lineOptions = { map: this.map, path: lineCoords, strokeColor: "red", strokeWidth: 3 };
        if (place1.line) {
            place1.line.setOptions(lineOptions);
        } else {
            place1.line = new google.maps.Polyline(lineOptions);
            google.maps.event.addListener(place1.line, "click",
                () => this.setBoundsRoundPlaces([place1, place2]));
        }
    }

    removeLink(place1) {
        if (!place1 || !place1.line) return;
        place1.line.setMap(null);
        place1.line = null;
    }

    /** Draw an initial editable polygon on the map */
    drawPoly() {
        let bounds = this.map.getBounds();
        let ne = bounds.getNorthEast();
        let sw = bounds.getSouthWest();
        let height = ne.lat() - sw.lat();
        let width = ne.lng() - sw.lng();
        let xe = sw.lng() + width/3;
        let xw  =sw.lng() + width*2/3;
        let xs = sw.lat() + height/3;
        let xn = sw.lat() + height*2/3;
        let path = [{lat:xs, lng:xe}, {lat:xn, lng:xe}, {lat:xn, lng:xw}, {lat:xs, lng:xw}];
        let googlePoly = {map: this.map, strokeColor:"blue", strokeWidth: 3, editable:true, path: path};
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
        this.localPoly = new Polygon(this.poly.getPath().getArray(), p => {return {x:p.lng(), y:p.lat()};});
    }

    /** Whether the user-drawn polygon contains a place */
    polyContains(e, n) {
        return this.localPoly && this.localPoly.contains(e, n);
    }

    /** Whether the user-drawn filter polygon is on the map */
    get isPolyActive () { return !!this.localPoly;}


    pinOptionsFromPlace(place, nomap = false) {
        var options = pinOptions(place);
        var thisLabelColor = this.getMapType() == "satellite" ? "#FFFF80" : "#606080";
        var googleOptions = {
            label: {
                color: thisLabelColor,
                fontWeight: "bold",
                text: options.title
            },
            position: new google.maps.LatLng(place.loc.n, place.loc.e),
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                strokeColor: options.color,
                fillColor: place.IsInteresting ? "black" : options.color,
                fillOpacity: 1,
                scale: 6,
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
        if (this.map.getZoom() > this.maxAutoZoom) {
            this.map.setZoom(this.maxAutoZoom);
        }
        this.map.setCenter({ lat: (box.north + box.south) / 2, lng: (box.west + box.east) / 2 });
    }

    getViewString() {
        var loc = this.map.getCenter();
        return JSON.stringify({
            n: loc.lat(),
            e: loc.lng(),
            z: this.map.getZoom(),
            mapType: this.map.getMapTypeId(),
            mapBase: "google"
        });
    }


    toggleType() {
        if (!this.map) return;
        if (this.isMapTypeOsObservable.Value) {
            this.map.setMapTypeId("hybrid");
        }
        else {
            this.map.setMapTypeId("roadmap");
        }
        this.insertOldMap();
    }
    osMap() {
        return new google.maps.ImageMapType({
            getTileUrl: function (tile, zoom) {
                return `https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/${zoom}/${tile.x}/${tile.y}.png?key=${window.keys.Client_OS_K}`;
            },
            maxZoom: 20,
            minZoom: 17
        })
    }
    nlsmap() {
        return new google.maps.ImageMapType({
            getTileUrl: function (tile, zoom) {
                return NLSTileUrlOS(tile.x, tile.y, zoom);
            },
            tileSize: new google.maps.Size(256, 256),
            maxZoom: 14,
            minZoom: 8,
            isPng: false
        })
    }

    insertOldMap() {
        if (this.map.getMapTypeId() == "roadmap") {
            let zoom = this.map.getZoom();
            if (this.isOldMapLoaded && !(zoom >= 8 && zoom <= 15)) {
                this.isOldMapLoaded = false;
                this.map.overlayMapTypes.clear();
            }
            if (this.isOSMapLoaded && !(zoom >= 16)) {
                this.isOSMapLoaded = false;
                this.map.overlayMapTypes.clear();
            }
            if (!this.isOldMapLoaded && zoom >= 8 && zoom <= 15) {
                this.isOldMapLoaded = true;
                this.map.overlayMapTypes.insertAt(0, this.nlsmap());
            }
            if (!this.isOSMapLoaded && zoom >= 16) {
                this.isOSMapLoaded = true;
                this.map.overlayMapTypes.insertAt(0, this.osMap());
            }
        } else {
            this.isOldMapLoaded = false;
            this.isOSMapLoaded = false;
            this.map.overlayMapTypes.clear();
        }
    }

    screenToLonLat(x, y) {
        let worldRect = this.map.getBounds();
        let northWestCorner = new google.maps.LatLng(worldRect.getNorthEast().lat(), worldRect.getSouthWest().lng());
        let topLeftGlobalPixel = this.map.getProjection().fromLatLngToPoint(northWestCorner);
        let scale = 1 << this.map.getZoom();
        let pointGlobalPixel = { x: x + topLeftGlobalPixel.x * scale, y: y + topLeftGlobalPixel.y * scale };
        let pointWorldPixel = { x: pointGlobalPixel.x / scale, y: pointGlobalPixel.y / scale };
        let latLng = this.map.getProjection().fromPointToLatLng(pointWorldPixel);
        return { n: latLng.lat(), e: latLng.lng() };
    }

    pinScreenPoint(pin) {
        return this.lonLatToScreen(pin.getPosition());
    }

    lonLatToScreen(lngLat) {
        let scale = 1 << this.map.getZoom();
        let worldRect = this.map.getBounds();
        let northWestCorner = new google.maps.LatLng(worldRect.getNorthEast().lat(), worldRect.getSouthWest().lng());
        let worldPoint = this.map.getProjection().fromLatLngToPoint(lngLat);
        let topLeftWorld = this.map.getProjection().fromLatLngToPoint(northWestCorner);
        let screenOffset = { x: (worldPoint.x - topLeftWorld.x) * scale, y: (worldPoint.y - topLeftWorld.y) * scale };
        return screenOffset;
    }

    offSetPointOnScreen(lat, lng, dx, dy) {
        let scale = 1 << this.map.getZoom();
        let worldPoint = this.map.getProjection().fromLatLngToPoint(new google.maps.LatLng(lat, lng));
        let offsetPoint = { x: worldPoint.x - dx / scale, y: worldPoint.y - dy / scale };
        return this.map.getProjection().fromPointToLatLng(offsetPoint);
    }

}

class BingMap extends GenMap {
    // https://docs.microsoft.com/bingmaps/v8-web-control/map-control-api
    constructor(onloaded, defaultloc) {
        super(onloaded, "bing", defaultloc);
        g("mapbutton").style.top = "50px";
        g("fullWindowButton").style.top = "50px";
    }
    get MapViewType() { return MapViewMS; }

    loaded() {
        super.loaded();

        // Load map:
        this.map = new Microsoft.Maps.Map(g('theMap'),
            {
                mapTypeId: this.mapView.MapTypeId,
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
        this.isMapTypeOsObservable = new ObservableWrapper(() => this.map.getMapTypeId() == "os");
        Microsoft.Maps.Events.addHandler(this.map, 'viewchangeend',
            () => this.mapViewHandler());
        this.setUpMapMenu();
        this.onloaded && this.onloaded();
    }

    onclick(f) {
        Microsoft.Maps.Events.addHandler(this.map, "click", f);
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
        showPopup(this.addOrUpdate(makePlace(loc.longitude, loc.latitude)), 0, 0);
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
        let lineCoords = [new Microsoft.Maps.Location(place1.loc.n, place1.loc.e),
        new Microsoft.Maps.Location(place2.loc.n, place2.loc.e)];
        if (place1.line) {
            place1.line.setLocations(lineCoords);
        } else {
            let line = new Microsoft.Maps.Polyline(lineCoords, {
                strokeColor: "red",
                strokeThickness: 3
            });
            place1.line = line;
            this.map.entities.push(line);
            Microsoft.Maps.Events.addHandler(line, "click", e => {
                this.setBoundsRoundPlaces([place1, place2]);
            });
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
        pin.setOptions(options);
        pin.setLocation(new Microsoft.Maps.Location(
            pin.place.loc.n, pin.place.loc.e));
    }

    showPin(pin, e) {
        showPopup(pin, e.pageX, e.page.Y);
    }

    pinScreenPoint(pin) {
        if (!pin.getLocation) return null;
        return this.map.tryLocationToPixel(pin.getLocation(), Microsoft.Maps.PixelReference.control);
    }

    /*
                    var nlsmap = new google.maps.ImageMapType({
                        getTileUrl: function (tile, zoom) {
                            return NLSTileUrlOS(tile.x, tile.y, zoom);
                        },
                        tileSize: new google.maps.Size(256, 256),
                        isPng: false
                    });
    */
    /**
     * Map has moved, changed zoom level, or changed type
     */
    mapViewHandler() {
        log("Zoom = " + this.map.getZoom());
        const isOs = this.isMapTypeOsObservable.Value;
        // OS Landranger Map only goes up to zoom 17. Above that, display OS Standard.

        if (isOs && this.map.getZoom() > 17) {
            if (!this.streetOSLayer) {
                this.streetOSLayer = new Microsoft.Maps.TileLayer({
                    mercator: new Microsoft.Maps.TileSource({
                        uriConstructor: 'https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/{zoom}/{x}/{y}.png?key=' + window.keys.Client_OS_K
                    })
                });
                this.map.layers.insert(this.streetOSLayer);
            }
            else this.streetOSLayer.setVisible(1);
        }
        else { if (this.streetOSLayer) this.streetOSLayer.setVisible(0); }

        // OS map licence goes stale after some interval. Reload the map if old:
        if (isOs && timeWhenLoaded && (Date.now() - timeWhenLoaded > 60000 * 15)) {
            this.refreshMap();
        }
        this.isMapTypeOsObservable.Notify();
    }

    toggleType() {
        if (!this.map) return;
        if (this.isMapTypeOsObservable.Value) {
            this.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.aerial });
        }
        else {
            this.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.ordnanceSurvey });
        }
        this.mapViewHandler();
    }


    /**
     * Refresh Bing map. After about 15 minutes, it loses its OS licence.
     *  
     */
    refreshMap() {
        this.saveMapCookie();
        this.map.dispose();
        this.mapModuleLoaded(true);
    }

    getViewString() {
        var loc = this.map.getCenter();
        return JSON.stringify({
            n: loc.latitude,
            e: loc.longitude,
            z: this.map.getZoom(),
            mapType: this.map.getMapTypeId(),
            mapBase: "bing"
        });
    }

    setBoundsRoundPins(pins) {
        var rect = Microsoft.Maps.LocationRect.fromShapes(pins);
        this.map.setView({ bounds: rect, padding: 100 });
        if (this.map.getZoom() > 18) {
            this.map.setView({ zoom: 18 });
        }
    }

    setBoundsRoundBox(box) {
        var rect = Microsoft.Maps.LocationRect.fromEdges(box.north, box.west, box.south, box.east);
        this.map.setView({ bounds: rect, padding: 100 });
        if (this.map.getZoom() > 17) {
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
}


class Polygon {
    pp = [];

    constructor(list, fn) {
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