
// https://docs.microsoft.com/bingmaps/v8-web-control/

const mapTypeEvent = new Event("mapType");
var timeWhenLoaded;



/**
 * Initialize map module
 */
function initMap() {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';
    script.src = 'https://www.bing.com/api/maps/mapcontrol?key=' + window.keys.Client_Map_K + '&callback=mapModuleLoaded';
    head.appendChild(script);
}

// Called when the script for Bing maps has loaded and is ready to draw a map:
function mapModuleLoaded(refresh = false) {

    timeWhenLoaded = Date.now();

    // Arbitrary place to centre the map before GPS location is acquired:

    var mapView = {
        loc: new Microsoft.Maps.Location (51.855912, -4.920331), // mid Pembs  // (52.008144, -5.067547), //Garn Fawr   //(51.782365, -5.101158), // Broadhaven // 51.799447, -4.744831), // Span //
        zoom: 11,
        mapType: Microsoft.Maps.MapTypeId.aerial
    }

    var mapCookie = getCookie("mapView");
    if (mapCookie) {
        mapView = JSON.parse(mapCookie);
    }

    // Load map:
    window.map = new Microsoft.Maps.Map(document.getElementById('theMap'),
        {
            mapTypeId: mapView.mapType,
            center: mapView.loc,
            showLocateMeButton: false,
            showMapTypeSelector: false,
            showZoomButtons: true,
            disableBirdseye: true,
            disableKeyboardInput: true,
            disableStreetside: true,
            enableClickableLogo: false,
            navigationBarMode: Microsoft.Maps.NavigationBarMode.compact,
            zoom: mapView.zoom
        });

    setUpMapClick();
    setUpMapMenu();

    Microsoft.Maps.Events.addHandler(map, 'viewchangeend', mapViewHandler);

    placeToPin = {};
    mapReady();
}


/**
 * Refresh Bing map. After about 15 minutes, it loses its OS licence.
 *  
 */
function refreshMap() {
    saveMapCookie();
    window.map.dispose();
    mapModuleLoaded(true);
}


/*
function setUpPlacePopup(map) {
    //Create an infobox to show start of place text on hover
    window.placePopup = new Microsoft.Maps.Infobox(map.getCenter(), {
        visible: false,
        showCloseButton: false,
        offset: new Microsoft.Maps.Point(0, 10),
        description: "",
        maxWidth: 400,
        maxHeight: 200,
        showPointer: true
    });
    window.placePopup.setMap(map);

    Microsoft.Maps.Events.addHandler(window.placePopup, 'click', function (e) {
        var place = e.target.place;
        if (place) {
            go(place.id, false);
        }
    });
}
*/

function mapMoveTo(e, n, offX, offY, zoom) {
    if (zoom) {
        window.map.setView({ zoom: zoom });
    }
    window.map.setView({
        center: new Microsoft.Maps.Location(n, e),
        centerOffset: new Microsoft.Maps.Point(offX, offY)
    });
}

window.addEventListener("beforeunload", function (e) {
    saveMapCookie();
});

function saveMapCookie() {
    if (window.map) {
        var loc = window.map.getCenter();
        setCookie("mapView", JSON.stringify({
            loc: loc,
            zoom: window.map.getZoom(),
            mapType: window.map.getMapTypeId()
        }));
    }
}


// Create a right-click menu for the map
function setUpMapMenu() {
    var menuBox = new Microsoft.Maps.Infobox(
        window.map.getCenter(),
        {
            visible: false,
            showPointer: true,
            offset: new Microsoft.Maps.Point(0, 0),
            actions: [
                {
                    label: "Add place here  .",
                    eventHandler: function () {
                        var loc = menuBox.getLocation();
                        menuBox.setOptions({ visible: false });
                        showPopup(mapAddOrUpdate(makePlace(loc.longitude, loc.latitude)), 0, 0);
                    }
                }
            ]
        });
    menuBox.setMap(map);
    Microsoft.Maps.Events.addHandler(window.map, "rightclick",
        function (e) {
            // Don't provide right-click on map on a mobile
            if (!window.deviceHasMouseEnter) return;
            // Ignore accidental touches close to the edge - often just gripping fingers:
            if (e.pageY && (e.pageX < 40 || e.pageX > window.innerWidth - 40)) return;
            menuBox.setOptions({
                location: e.location,
                visible: true
            });
        });
    Microsoft.Maps.Events.addHandler(window.map, "click", function (e) {
        if (menuBox != null) { menuBox.setOptions({ visible: false }); }
    });
}

function setUpMapClick() {
    Microsoft.Maps.Events.addHandler(window.map, "click", function (e) {
        closePopup();
        hidePetals();
    });
}

function mapScreenToLonLat(x, y) {
    var loc = window.map.tryPixelToLocation(new Microsoft.Maps.Point(x - window.innerWidth / 2, y - window.innerHeight / 2));
    return { e: loc.longitude, n: loc.latitude };
}


function deletePin(pin) {
    window.map.entities.remove(pin);
    delete placeToPin[pin.place.id];
}

var placeToPin = {};
function mapReplace(oldPlace, newPlace) {
    if (!newPlace) return null;
    var pin = placeToPin[oldPlace.id];
    if (!pin) return;
    placeToPin[newPlace.id] = pin;
    pin.place = newPlace;
    updatePin(pin);
    return pin;
}

/** Add or update a place on the map */
function mapAddOrUpdate(place) {
    if (!place) return null;
    var pushpin = null;
    try {
        if (!(pushpin = placeToPin[place.id])) {
            pushpin = new Microsoft.Maps.Pushpin(
                new Microsoft.Maps.Location(place.loc.n, place.loc.e),
                {
                    title: place.Title.replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " "),
                    enableHoverStyle: false
                }
            );
            window.map.entities.push(pushpin);
            Microsoft.Maps.Events.addHandler(pushpin, 'click', popPetals);
            Microsoft.Maps.Events.addHandler(pushpin, 'mouseover', popPetals);
            Microsoft.Maps.Events.addHandler(pushpin, 'mouseout', function (e) {
                window.petalHideTimeout = setTimeout(() => {
                    hidePetals();
                }, 1000);
            });
        }
        pushpin.place = place;
        placeToPin[place.id] = pushpin;
        updatePin(pushpin);
    } catch (xx) { }
    return pushpin;
}

/**
 * Add a link from a place.
 * PRE: next and prvs pointers are set or null.
 * @param {Place} place1 source
 */
function mapAddOrUpdateLink (place1) {
    if (!place1) return;
    let place2 = place1.next;
    if (!place2) return;
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
        map.entities.push(line);
        Microsoft.Maps.Events.addHandler(line, "click", e => {
            mapSetBoundsRoundPlaces([place1, place2]);
        });
    }
}

/**
 * Delete the line from a place.
 * @param {Place} place 
 */
function mapRemoveLink(place) {
    if (place && place.line) {
        window.map.entities.remove(place.line);
        place.line = null;
    }
}

/** Set the title and colour according to the attached place 
*/
function updatePin(pin) {
    var options = pinOptions(pin.place);
    options.color = Microsoft.Maps.Color.fromHex(options.color);
    pin.setOptions(options);
    pin.setLocation(new Microsoft.Maps.Location(
        pin.place.loc.n, pin.place.loc.e));
}

function showPin(pin, e) {
    showPopup(pin, e.pageX, e.pageY);
}

function mapSetPinsVisible(tag) {
    let shapes = window.map.entities.getPrimitives();
    for (var i = 0; i < shapes.length; i++) {
        let pin = shapes[i];
        let place = pin.place;
        if (!place) continue; // Not a pin
        pin.setOptions({ visible: place.HasTag(tag) });
    }
}

function mapSetPlacesVisible(which) {
    let includedPins = [];
    let shapes = window.map.entities.getPrimitives();
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

function mapSearch(term) {
    var cancel = !term;
    var pattern = new RegExp(term, "i");
    let shapes = window.map.entities.getPrimitives();
    let includedShapes = [];
    for (var i = 0; i < shapes.length; i++) {
        let pin = shapes[i];
        let place = pin.place;
        if (!place) continue; // Not a pin

        var visible = cancel || !!place.text.match(pattern);
        if (!cancel && visible) {
            includedShapes.push(pin);
        }
        pin.setOptions({ visible: visible });
    }
    if (includedShapes.length > 0) {
        var rect = Microsoft.Maps.LocationRect.fromShapes(includedShapes);
        window.map.setView({ bounds: rect, padding: 40 });
        if (window.map.getZoom() > 18) {
            window.map.setView({ zoom: 18 });
        }
    }
}

function mapSetBoundsRoundPins(pins) {
    var rect = Microsoft.Maps.LocationRect.fromShapes(pins);
    window.map.setView({ bounds: rect, padding: 100 });
    if (window.map.getZoom() > 18) {
        window.map.setView({ zoom: 18 });
    }
}

/**
 * Zoom to show all the places.
 * @param {Array(Place)} places 
 */
function mapSetBoundsRoundPlaces(places) {
    var included = places.map(place => placeToPin[place.id]);
    mapSetBoundsRoundPins(included);
}


var isMapTypeOsObservable = new ObservableWrapper(() => window.map.getMapTypeId() == "os");

/**
 * Called when map has moved, changed zoom level, or changed type.
 */
function mapViewHandler() {
    const isOs = isMapTypeOsObservable.Value;
    // OS Landranger Map only goes up to zoom 17. Above that, display OS Standard.
    if (isOs && window.map.getZoom() > 16) {
        if (!window.streetOSLayer) {
            window.streetOSLayer = new Microsoft.Maps.TileLayer({
                mercator: new Microsoft.Maps.TileSource({
                    uriConstructor: 'https://api.maptiler.com/maps/uk-openzoomstack-outdoor/256/{zoom}/{x}/{y}.png?key=' + window.keys.Client_OS_K
                })
            });
            map.layers.insert(window.streetOSLayer);
        }
        else window.streetOSLayer.setVisible(1);
    }
    else { if (window.streetOSLayer) window.streetOSLayer.setVisible(0); }

    // OS map licence goes stale after some interval. Reload the map if old:
    if (isOs && !timeWhenLoaded || Date.now() - timeWhenLoaded > 60000 * 15) {
        refreshMap();
    }
    isMapTypeOsObservable.Notify();
}


function mapsToggleType() {
    if (!window.map) return;
    if (isMapTypeOsObservable.Value) {
        window.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.aerial });
    }
    else {
        window.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.ordnanceSurvey });
    }
    mapViewHandler();
}


// Zoom out the map view if necessary to encompass the specified loc
function mapBroaden(loc) {
    var asIs = window.map.getBounds();
    window.map.setView({
        bounds: Microsoft.Maps.LocationRect.fromLocations(
            [asIs.getNorthwest(), asIs.getSoutheast(),
            new Microsoft.Maps.Location(loc.n, loc.e)]), padding: 40
    });
}