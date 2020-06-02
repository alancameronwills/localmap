const mapTypeEvent = new Event("mapType");
var timeWhenLoaded;

function insertScript(s) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';
    script.src = siteUrl + "/api/map?sort=" + s;
    head.appendChild(script);
}


function mapModuleLoaded(refresh = false) {
    window.map.loaded(window.onmaploaded || (() => { }), refresh);
}


function doLoadMap(onloaded) {

    var savedCartography = getCookie("cartography");
    var queryCartography = window.location.queryParameters["cartography"]
        ? (window.location.queryParameters["cartography"] == "google" ? "google" : "bing")
        : null;
    if (queryCartography) {
        setCookie("cartography", queryCartography);
    }
    var cartography = queryCartography || savedCartography || "bing";

    window.map = cartography == "google" ? new GoogleMap(onloaded) : new BingMap(onloaded);
}

class MapView {
    constructor(n, e, z, mapType) {
        this.n = n;
        this.e = e;
        this.z = z;
        this.mapType = mapType || "aerial"; // a | os 

    }
    static fromOldCookie(c) {
        if (c.loc) {
            return new MapView(c.loc.latitude, c.loc.longitude, c.zoom, c.mapType);
        } else {
            return c;
        }
    }
    get Zoom() { return this.z || 14; }
}
class MapViewMS extends MapView {
    get MapTypeId() {
        switch(this.mapType) {
            case "a":
            case "aerial" :
            case "satellite" :
            case "hybrid":  return Microsoft.Maps.MapTypeId.aerial;
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
            case "a": case "aerial" : case "hybrid": return "hybrid";
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
        insertScript(sort);
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

    endAddBatch(){}

}

class GoogleMap extends GenMap {
    constructor(onloaded, defaultloc) {
        super(onloaded, "google", defaultloc);
    }
    get MapViewType() { return MapViewGoogle; }

    loaded() {
        super.loaded();
        g("mapbutton").style.display = "block";
        this.markers = [];
        g("target").style.top="50%";
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
                mapTypeId: this.mapView.MapTypeId
            });
        this.markerClusterer = new MarkerClusterer(this.map, [], {imagePath: 'img/m', gridSize: 30, maxZoom:18});
        this.map.setOptions({
            mapTypeControl: false,
            zoomControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
            panControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
            streetViewControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
            rotateControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
            motionTrackingControlOptions : { position: google.maps.ControlPosition.TOP_RIGHT },
            
            mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT,
                mapTypeControl: false,
                style:google.maps.MapTypeControlStyle.DROPDOWN_MENU}
            
            
        });
        this.map.getStreetView().setOptions ({
            addressControlOptions:  { position: google.maps.ControlPosition.TOP_RIGHT },
            panControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
            zoomControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT }
        });

        this.getMapType();
        this.map.addListener("maptypeid_changed", function () {
            window.map.getMapType();
            window.map.reDrawMarkers();
        });

        this.isMapTypeOsObservable = new ObservableWrapper(() => this.map.getMapTypeId() == "roadmap");

        this.setUpMapMenu();
        this.onloaded && this.onloaded();

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
    }

    closeMapMenu() {
        if (this.menuBox) this.menuBox.close();
    }

    /**
     * From rightClickActions
     */
    doAddPlace() {
        var loc = window.map.menuBox.getPosition();
        window.map.menuBox.close();
        showPopup(this.addOrUpdate(makePlace(loc.lng(), loc.lat())), 0, 0);
    }


    /**
     * Add a place to the map, or update it with changed title, tags, location, etc
     * @param {*} place 
     * @param {*} inBatch - defer adding to map until endAddBatch()
     */
    addOrUpdate(place, inBatch=false) {
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

            pushpin.addListener('click', e => popPetals(e.tb, pushpin));
            pushpin.addListener('mouseover', e => popPetals(e.tb, pushpin));
            pushpin.addListener('mouseout', function (e) {
                window.petalHideTimeout = setTimeout(() => {
                    hidePetals();
                }, 1000);
            });
            this.markerClusterer.addMarker(pushpin, inBatch);
        } else {
            this.updatePin(this.placeToPin[place.id]);
        }
        return pushpin;
    }

    /**
     * After calling addOrUpdate(place,true)
     */
    endAddBatch () {
        this.markerClusterer.repaint();
    }

    moveTo(e, n, centerOffsetX, centerOffsetY, zoom) {
        this.map.panTo({ lat: n, lng: e });
        if (zoom) this.map.setZoom(zoom);
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
        let lineCoords = [{lat:place1.loc.n, lng:place1.loc.e}, {lat:place2.loc.n, lng:place2.loc.e}];
        let lineOptions = {map:this.map, path: lineCoords, strokeColor:"red", strokeWidth:3};
        if (place1.line) {
            place1.line.setOptions(lineOptions);
        } else {
            place1.line = new google.maps.Polyline(lineOptions); 
            google.maps.event.addListener(place1.line, "click", 
                () => this.map.panToBounds({west:place1.loc.e, east:place2.loc.e, north:place1.loc.n, south:place2.loc.n}));
        }
    }

    removeLink(place1) {
        if(!place1 || !place1.line) return;
        place1.line.setMap(null);
        place1.line = null;
    }

    pinOptionsFromPlace(place, nomap=false) {
        var options = pinOptions(place);
        var thisLabelColor = this.getMapType() == "satellite" ? "#FFFFE0" : "#606080";
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
                fillColor: "white",
                scale: 6,
                labelOrigin: { x: 0, y: 2.2 }
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
        })
        return includedPins;
    }
    setBoundsRoundPins(pins) {
        let box = { west: 180, east: -180, north: -90, south: 90 };
        pins.forEach(pin => {
            let latLng = pin.getPosition();
            box.west = Math.min(box.west, latLng.lng());
            box.east = Math.max(box.east, latLng.lng());
            box.south = Math.min(box.south, latLng.lat());
            box.north = Math.max(box.north, latLng.lat());
        });
        this.map.fitBounds(box);
        if (this.map.getZoom() > 18) {
            this.map.setZoom(18);
        }
        this.map.setCenter ({lat:(box.north+box.south)/2, lng: (box.west+box.east)/2});
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
    }

    
    screenToLonLat(x, y) {
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

    screenToLonLat(x,y) {
        const TILE_SIZE = 256;
        let worldRect = this.map.getBounds();
        let northWestCorner = new google.maps.LatLng(worldRect.getNorthEast().lat(), worldRect.getSouthWest().lng());
        let topLeftGlobalPixel = this.map.getProjection().fromLatLngToPoint(northWestCorner);
        let scale = 1 << this.map.getZoom();
        let pointGlobalPixel = {x: x+topLeftGlobalPixel.x*scale, y:y+topLeftGlobalPixel.y*scale};
        let pointWorldPixel = {x:pointGlobalPixel.x/scale, y:pointGlobalPixel.y/scale};
        let latLng = this.map.getProjection().fromPointToLatLng(pointWorldPixel);
        return {n: latLng.lat(), e:latLng.lng()};
    }

}

class BingMap extends GenMap {
    constructor(onloaded, defaultloc) {
        super(onloaded, "bing", defaultloc);
    }

    loaded() {
        super.loaded();
        g("mapbutton").style.display = "block";

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

    moveTo(e, n, offX, offY, zoom) {
        if (zoom) {
            this.map.setView({ zoom: zoom });
        }
        this.map.setView({
            center: new Microsoft.Maps.Location(n, e),
            centerOffset: new Microsoft.Maps.Point(offX, offY)
        });
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
            if (window.map.menuBox != null) { window.map.menuBox.setOptions({ visible: false }); }
        });
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
                Microsoft.Maps.Events.addHandler(pushpin, 'click', e => popPetals(e, pushpin));
                Microsoft.Maps.Events.addHandler(pushpin, 'mouseover', e => popPetals(e, pushpin));
                Microsoft.Maps.Events.addHandler(pushpin, 'mouseout', function (e) {
                    window.petalHideTimeout = setTimeout(() => {
                        hidePetals();
                    }, 1000);
                });
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


    /**
     * Map has moved, changed zoom level, or changed type
     */
    mapViewHandler() {
        const isOs = this.isMapTypeOsObservable.Value;
        // OS Landranger Map only goes up to zoom 17. Above that, display OS Standard.
        if (isOs && this.map.getZoom() > 16) {
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