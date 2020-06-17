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
        this.mapView = cast((MapView.fromOldCookie(getCookieObject("mapView")) || defaultloc), this.MapViewType);
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
        addHandler('click', e => window.pinPops.pinMouseOver(eventExtractor(e), pushpin));
        addHandler('mouseover', e => window.pinPops.pinMouseOver(eventExtractor(e), pushpin, true));
        addHandler('mouseout', e => window.pinPops.pinMouseOut(eventExtractor(e)));
    }

    incZoom(max) {
        let z = this.map.getZoom();
        if (z < max) {
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
        if (this.periodicZoomTimer) { clearInterval(this.periodicZoomTimer); this.periodicZoomTimer = null; }
    }

    zoomFor(pin) {
        if(pin.zoom) return pin.zoom;
        let pinLL = this.getPinPosition(pin);
        let maxsq = 0.001;
        let maxzoom = 16;
        let markers = this.pins;
        for (var i = 0; i < markers.length; i++) {
            var other = markers[i];
            if (other==pin) continue;
            let otherLL = this.getPinPosition(other);
            if (!otherLL) continue;
            let dn = otherLL.n - pinLL.n;
            let de = (otherLL.e - pinLL.e)*2; // assume mid-lat
            let dsq = dn*dn + de*de;
            if (dsq < maxsq) {
                maxsq = dsq;
                if (maxsq < 2e-06) break;
            }
        }
        if (maxsq < 3e-6) pin.zoom = 20;
        else if (maxsq < 2e-5) pin.zoom = 18;
        else if (maxsq < 1e-4) pin.zoom = 16;
        else pin.zoom = 14;
        return pin.zoom;
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

            this.addMouseHandlers((eventName, handler) => pushpin.addListener(eventName, handler), pushpin, e => e.tb);

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
            result = this.incZoom(pin&&this.zoomFor(pin));
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
                fillColor: "black",
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
        return {n:loc.lat(),e:loc.lng()};
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

    saveMapCookie() {
        if (this.map) {
            var loc = this.map.getCenter();
            setCookie("mapView", JSON.stringify({
                n: loc.lat(),
                e: loc.lng(),
                z: this.map.getZoom(),
                mapType: this.map.getMapTypeId(),
                mapBase: "google"
            }));
        }
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

    /*
    latLngToGlobalPixel (latLng) {
        const TILE_SIZE = 256;

        // Mercator stretches lng with increasing lat:
        var siny = Math.sin(latLng.lat() * Math.PI / 180);

        // Truncating to 0.9999 effectively limits latitude to 89.189. This is
        // about a third of a tile past the edge of the world tile.
        siny = Math.min(Math.max(siny, -0.9999), 0.9999);

        var scale = 1 << this.map.getZoom();

        // Pixel coords on single Mercator tile of world:
        var worldCoordinate = new google.maps.Point(
            TILE_SIZE * (0.5 + latLng.lng() / 360),
            TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)));

            /*
            Math.exp((4*Math.PI*y/TILE_SIZE)+0.5) == LL
            LL==(1+siny)/(1-siny)
            (1-siny)*LL == 1 - siny*2
            0 == 1 - LL + LL*siny - siny*2

            

        // Pixel coords on world tiles when zoomed in:
        var pixelCoordinate = new google.maps.Point(
            Math.floor(worldCoordinate.x * scale),
            Math.floor(worldCoordinate.y * scale));

        // Tile at this scale required for this point:
        var tileCoordinate = new google.maps.Point(
            Math.floor(pixelCoordinate.x / TILE_SIZE),
            Math.floor(pixelCoordinate.y / TILE_SIZE));
 
        return pixelCoordinate;
    }
    lonLatToScreenPixel (latLng) {
        let worldRect = this.map.getBounds();
        let northWestCorner = {lat: worldRect.getNorthEast().lat(), lng: worldRect.getSouthWest().lng()};
        let topLeftGlobalPixel = this.latLngToGlobalPixel(northWestCorner);
        let pointGlobalPixel = this.latLngToGlobalPixel(latLng);
        return {x:pointGlobalPixel.x - topLeftGlobalPixel.x, y:pointGlobalPixel.y-topLeftGlobalPixel.y};
    }
    */

    screenToLonLat(x, y) {
        const TILE_SIZE = 256;
        let worldRect = this.map.getBounds();
        let northWestCorner = new google.maps.LatLng(worldRect.getNorthEast().lat(), worldRect.getSouthWest().lng());
        let topLeftGlobalPixel = this.map.getProjection().fromLatLngToPoint(northWestCorner);
        let scale = 1 << this.map.getZoom();
        let pointGlobalPixel = { x: x + topLeftGlobalPixel.x * scale, y: y + topLeftGlobalPixel.y * scale };
        let pointWorldPixel = { x: pointGlobalPixel.x / scale, y: pointGlobalPixel.y / scale };
        let latLng = this.map.getProjection().fromPointToLatLng(pointWorldPixel);
        return { n: latLng.lat(), e: latLng.lng() };
    }

    offSetPointOnScreen(lat, lng, dx, dy) {
        let scale = 1 << this.map.getZoom();
        let worldPoint = this.map.getProjection().fromLatLngToPoint(new google.maps.LatLng(lat, lng));
        let offsetPoint = { x: worldPoint.x - dx / scale, y: worldPoint.y - dy / scale };
        return this.map.getProjection().fromPointToLatLng(offsetPoint);
    }

}

class BingMap extends GenMap {
    constructor(onloaded, defaultloc) {
        super(onloaded, "bing", defaultloc);
        g("mapbutton").style.top = "50px";
    }

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
    get MapViewType() { return MapViewMS; }

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
            result = this.incZoom(pin&&this.zoomFor(pin));
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


    saveMapCookie() {
        if (this.map) {
            var loc = this.map.getCenter();
            setCookie("mapView", JSON.stringify({
                n: loc.latitude,
                e: loc.longitude,
                z: this.map.getZoom(),
                mapType: this.map.getMapTypeId(),
                mapBase: "bing"
            }));
        }
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

    get pins () {
        return this.map.entities.getPrimitives();
    }

    getPinPosition(pin) {
        let loc = pin.getLocation();
        return {n:loc.latitude, e:loc.longitude};
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