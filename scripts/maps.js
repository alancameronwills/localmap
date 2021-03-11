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

function mapModuleLoaded(refresh = false) {
    window.map.loaded(window.onmaploaded || (() => { }), refresh);
}


function doLoadMap(onloaded) {
    var projectCartography = window.project.cartography;
    var queryCartography = window.location.queryParameters["cartography"];
    var cartography = queryCartography || projectCartography || "bing";

    window.map = new({
        google: GoogleMap, bing: BingMap, osm: OpenMap
    }
    [cartography] || BingMap)
    (onloaded, window.project.loc);

    
    
}



class MapView {
    constructor(n, e, z, mapChoice) {
        this.n = n;
        this.e = e;
        this.z = z;
        this.mapChoice =  mapChoice;
    }
    static fromCookie(c) {
        if (c && c.loc) {
            return new MapView(c.loc.latitude, c.loc.longitude, c.zoom, c.mapChoice);
        } else {
            return c;
        }
    }
    get Zoom() { return this.z || 14; }
}
class MapViewMS extends MapView {
    get MapTypeId() {
        switch (this.mapChoice) {
            case 0:
                return "0";
            case 1:
                return "1";
            case 2:
                return "2";
        }
    }
    get Location() {
        return new Microsoft.Maps.Location(this.n || 51, this.e || -4);
    }
}

class MapViewGoogle extends MapView {
    get MapTypeId() {
        switch (this.mapChoice) {
            case 0:
                return "0";
            case 1:
                return "1";
            case 2:
                return "2";
        }
    }
    get Location() {
        return new google.maps.LatLng(this.n || 54, this.e || -1);
    }
}

class MapViewOSM extends MapView {
    get Location(){
        return new ol.center(this.n || 51, this.e || -4);
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
            : MapView.fromCookie(getCookieObject("mapView"));
        this.mapView = cast((mapViewParam || defaultloc), this.MapViewType);

        this.placeToPin = {};
        insertScript(siteUrl + "/api/map?sort=" + sort);
        this.mapChoiceObservable = new Observable(0);
        // just in case this class doesn’t have one
        this.mapChoiceObservable.AddHandler(() => {
            this.mapViewHandler(this.mapChoiceObservable.Value);
        })
        window.addEventListener("beforeunload", e => this.saveMapCookie());
    }

    loaded() {
        this.timeWhenLoaded = Date.now();
    }
    /**
     * @returns value used to select map type
     * 0 || 1 || 2
     */
    getMapChoice() {
        this.mapChoiceObservable.Value = this.mapView.mapChoice;
        return this.mapChoiceObservable.Value;
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

    incZoom(max) {
        let z = this.map.getZoom();
        // Don't bother if only 1 out - reduce jumping around on trails:
        if (z < max - 1) {
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
        log("Nearest " + (nearest ? nearest.place.Title : ""));
        let zoom = Math.min(20, Math.max(1, 9 - Math.floor(0.3 + Math.log2(minsq) * 10 / 23)));
        log(`Zoom minsq=${minsq.toExponential(2)} -> zoom=${zoom}`);
        return { nearest: nearest, distancesq: minsq, zoom: zoom };
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

}



class GoogleMapBase extends GenMap {
    
    // https://developers.google.com/maps/documentation/javascript/markers
    constructor(onloaded, defaultloc) {
        super(onloaded, "google", defaultloc);
        this.maxAutoZoom = 20;
        this.oldMapLoaded = false;
        this.isOSMLoaded = false;
    }
    
    get MapViewType() { return MapViewGoogle; }
    
    loaded() {
        
    }

    /**
     * sets up the Google map with markers, control options and map type
     */
    mapSetup() {
        this.markerClusterer = new MarkerClusterer(this.map, [],
            { imagePath: 'img/m', gridSize: 60, maxZoom: 18, ignoreHidden: true });
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
        this.getMapChoice();
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
     * @returns label color depending on the selected map and map type
     */
    getLabelColor() {
        var labelColor;
        if (!this.isOSMLoaded) {
            switch (this.mapChoiceObservable.Value) {
                case 0:
                    labelColor = "#606080"
                    break;
                case 1:
                    labelColor = "#0000FF";
                    break;
                case 2:
                    labelColor = "#FFFF80";
                    break;
            }
        } else {
            labelColor = "#0000FF";
        }
        return labelColor;
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
            // console.log("rightclick 1");
            window.map.menuBox.setPosition(e.latLng);
            window.map.menuBox.open(window.map.map);
        });
        this.map.addListener("zoom_changed", e => {
            log("Zoom = " + this.map.getZoom());
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
    cacheMap() {
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
            && item.pics.length > 0; });
        //console.log(filtered);
        
        filtered.map(a => a.pics.map(a => a.id).forEach(function (item) {
            if (window.innerWidth < 1080 && item.match(/\.(jpeg|jpg|JPG|png)$/)){
                item = item.replace(/\.[^.]+$/, ".jpg");
                urlCache = siteUrl + "/smedia/" + item;
                if (urlCache.match(/\.(jpeg|jpg|JPG|png)$/) != null){
                    picURLs.push(siteUrl + "/smedia/" + item);
                }
                urlCache = "";
            } else {
                urlCache = siteUrl + "/smedia/" + item;
                if (urlCache.match(/\.(jpeg|jpg|JPG|gif|png)$/) != null){
                    picURLs.push(siteUrl + "/media/" + item);
                }
                urlCache = "";
            }
        }));
        picURLs.forEach(function (item) {
                $.get(item);
        });
        console.log(picURLs);
        picURLs = [];
        

        this.panMapStart();
    }

    setLocation() {
        var popup = g("loadingPopupID");
        popup.style.display = "block";
        
        this.map.panTo(setLocation.loc);
        this.map.setZoom(13);
        var menuString = "";
        this.menuBox = new google.maps.InfoWindow({
            content: menuString
        });
        window.map.menuBox.setPosition(this.map.getCenter());
        window.map.menuBox.open(window.map.map);
        this.cacheMap();
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
        this.map.panTo({lat: this.map.getCenter().lat(), lng: this.map.getCenter().lng() + 0.01});
        setTimeout(() => { this.panMapWestLatLng(); this.updateBar(); }, 250);
    }
    panMapWestLatLng() {
        this.map.panTo({lat: this.map.getCenter().lat(), lng: this.map.getCenter().lng() - 0.02});
        setTimeout(() => { this.panMapReset(); this.updateBar(); }, 250);
    }
    /**
     * resets to center and increases zoom for caching the map tiles
     */
    panMapReset() {
        if (counter < 3) {
            this.map.panTo({lat: this.map.getCenter().lat() + 0.01, lng: this.map.getCenter().lng() + 0.01});
            counter = counter + 1;
            setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
        } else if (counter == 3) {
            this.map.panTo({lat: this.map.getCenter().lat() - 0.03, lng: this.map.getCenter().lng() + 0.01});
            counter = counter + 1;
            setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
        } else if (counter > 3 && counter < 6) {
            this.map.panTo({lat: this.map.getCenter().lat() - 0.01, lng: this.map.getCenter().lng() + 0.01});
            counter = counter + 1;
            setTimeout(() => { this.panMapEastLatLng(); this.updateBar(); }, 250);
        } else {
            if (zoom < 17) {
                this.map.panTo({lat: this.map.getCenter().lat() + 0.03, lng: this.map.getCenter().lng() + 0.01});
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
    addArea(){
        g("locationPopupID").style.display = "none";
        this.map.setOptions({ draggableCursor : "url(img/map-pin.png), auto" })
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

    newLocation(){ //Work in progress...
        this.map.setOptions({ draggableCursor : "" });
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

            this.placeToPin[place.id] = pushpin;

            this.addMouseHandlers((eventName, handler) => pushpin.addListener(eventName, handler), pushpin, e => e.tb || e.ub || e.ab || e.vb || e.nb || e.domEvent);

            this.markerClusterer.addMarker(pushpin, inBatch);
        } else {
            this.updatePinForPlace(place);
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
        var thisLabelColor = this.getLabelColor();
        var googleOptions = {
            label: {
                color: thisLabelColor,
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
        if (this.map.getZoom() > this.maxAutoZoom) {
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
            z: this.map.getZoom(),
            mapChoice: this.mapChoiceObservable.Value,
            mapTypeId: this.mapView.mapTypeId,
            mapBase: "google"
        });
    }

    /** Toggles the map type.
     *  OS map || Old map || Satellite map
     */
    toggleType() {
        if (!this.map) return;
        this.mapChoiceObservable.Value = (this.mapChoiceObservable.Value + 1) % 3;
        this.reDrawMarkers();
    }
    /** Settings for osMap */
    osMap() {
        return new google.maps.ImageMapType({
            getTileUrl: function (tile, zoom) {
                return `https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/${zoom}/${tile.x}/${tile.y}.png?key=${window.keys.Client_OS_K}`;
            },
            maxZoom: 20,
            minZoom: 17
        })
    }
    /** Settings for nslmap */
    nlsmap() {
        return new google.maps.ImageMapType({
            getTileUrl: function (tile, zoom) {
                return NLSTileUrlOS(tile.x, tile.y, zoom);
            },
            tileSize: new google.maps.Size(256, 256),
            maxZoom: 10,
            minZoom: 8,
            isPng: false
        })
    }
    /** Settings for ol3map */
    ol3map() {
        return new google.maps.ImageMapType({
            getTileUrl: function (tile, zoom) {
                return `https://nls-0.tileserver.com/5gPpYk8vHlPB/${zoom}/${tile.x}/${tile.y}.png`;
            },
            maxZoom: 21,
            minZoom: 7
        })
    }


    /**
     * Reads user choice of map, zoom level; updates map engine’s base map and overlay.
     */
    mapViewHandler() {
        if (!this.isOSMLoaded) {
            switch (this.mapChoiceObservable.Value) {
                case 0:
                    this.map.setMapTypeId("roadmap");
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
                break;
                case 1:
                    this.map.overlayMapTypes.clear();
                    this.map.overlayMapTypes.insertAt(0, this.ol3map());
                break;
                case 2:
                    this.isOldMapLoaded = false;
                    this.isOSMapLoaded = false;
                    this.map.overlayMapTypes.clear();
                    this.map.setMapTypeId("hybrid");
                break;
            }
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

class GoogleMap extends GoogleMapBase {
  

    get MapViewType() { return MapViewGoogle; }

    loaded() {
        this.isOSMLoaded = false;
        console.log("Google Map Loaded");
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
        
        

        


        this.mapSetup();
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
        this.mapViewHandler();
    }
}

class OpenMap extends GoogleMapBase {
    constructor(onloaded, defaultloc) {
        super(onloaded, "google", defaultloc);
        this.maxAutoZoom = 20;
        this.oldMapLoaded = false;
        this.isOSMLoaded = true;
    }

    get MapViewType() { return MapViewGoogle; }

    loaded() {
        console.log("OSM Map Loaded");
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
                var coords = x + "/" + coord.y;
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

    getTiles(){
        var loc = this.menuBox.getPosition();
        this.menuBox.setOptions({ visible: false });
        this.circle = new google.maps.Circle({ center: { lat: loc.lat(), lng: loc.lng() }, radius: radius, map: this.map, strokeColor: "blue", strokeWeight: 2, fillOpacity: 0 });
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
        circleBoundsB = this.circleBounds;
        this.circleCenter = { lat: loc.lat(), lng: loc.lng() };

        
        //console.log(this.circleBounds.south);
        
        /*this.map.panTo({lat: this.circleBounds.south, lng: this.circle.getCenter().lng()});
        console.log(coords);
        this.map.panTo({lat: this.circleBounds.north, lng: this.circle.getCenter().lng()});*/
        console.log(cx);
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
        console.log("Bing Map Loaded");
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
        this.onloaded && this.onloaded();
        this.getMapChoice();
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
        showPlaceEditor(this.addOrUpdate(makePlace(loc.longitude, loc.latitude)), 0, 0);
    }

    drawCircle(){
        var loc = this.menuBox.getLocation();
        this.menuBox.setOptions({ visible: false });
        this.circle = new Microsoft.Maps.Circle ({center:{lat:loc.latitude, lng:loc.longitude}, radius:5000, map:this.map, strokeColor:blue, strokeWeight:2});
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
     * Reads user choice of map, zoom level; updates map engine’s base map and overlay.
     */
   
 
    mapViewHandler() {
        log("Zoom = " + this.map.getZoom());
        this.streetOSLayer = new Microsoft.Maps.TileLayer({
            mercator: new Microsoft.Maps.TileSource({
                uriConstructor: 'https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/{zoom}/{x}/{y}.png?key=' + window.keys.Client_OS_K
            })
        });
        // OS Landranger Map only goes up to zoom 17. Above that, display OS Standard.
        switch (this.mapChoiceObservable.Value) {
            case 0:
                this.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.ordnanceSurvey });
                if (this.map.getZoom() >= 17) {
                    if (!this.streetOSLayer) {
                        this.streetOSLayer = new Microsoft.Maps.TileLayer({
                            mercator: new Microsoft.Maps.TileSource({
                                uriConstructor: 'https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/{zoom}/{x}/{y}.png?key=' + window.keys.Client_OS_K
                            })
                        });
                        this.map.layers.insert(this.streetOSLayer);
                    } else this.streetOSLayer.setVisible(1);
                } else {
                    this.streetOSLayer.setVisible(0);
                    this.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.ordnanceSurvey });
                }
            break;
            case 1:
                this.streetOSLayer.setVisible(0);
                this.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.ordnanceSurvey });
                if (!this.oldOSLayer) {
                    this.oldOSLayer = new Microsoft.Maps.TileLayer({
                        mercator: new Microsoft.Maps.TileSource({
                            uriConstructor: 'https://nls-0.tileserver.com/5gPpYk8vHlPB/{zoom}/{x}/{y}.png'
                        })
                    });
                    this.map.layers.insert(this.oldOSLayer);
                }
                else this.oldOSLayer.setVisible(1);
            break;
            case 2:
                this.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.aerial });
                if (this.streetOSLayer) this.streetOSLayer.setVisible(0);
                if (this.oldOSLayer) this.oldOSLayer.setVisible(0);
            break;
        }

        // OS map licence goes stale after some interval. Reload the map if old:
        if (this.mapChoiceObservable && timeWhenLoaded && (Date.now() - timeWhenLoaded > 60000 * 15)) {
            this.refreshMap();
        }
        //this.mapChoiceObservable.Notify();
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
            z: this.map.getZoom(),
            mapChoice: this.mapChoiceObservable.Value,
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






