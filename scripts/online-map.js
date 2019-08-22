
// https://docs.microsoft.com/bingmaps/v8-web-control/

// Called when the script for Bing maps has loaded and is ready to draw a map:
function mapModuleLoaded() {

    // Arbitrary place to centre the map before GPS location is acquired:
    
    var mapView = {
        loc: new Microsoft.Maps.Location(52.008144, -5.067547),
        zoom: 17,
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
    //setUpPlacePopup(window.map);

    /*
    // Minor convenience: If user selects OS map, zoom out so that actual OS shows:
    Microsoft.Maps.Events.addHandler(window.map, 'maptypechanged', function () {
        var mapTypeId = window.map.getMapTypeId();
        if (mapTypeId == Microsoft.Maps.MapTypeId.ordnanceSurvey && window.map.getZoom() > 17) {
            setTimeout(function () { window.map.setView({ zoom: 17 }) }, 300);
        }
    });
    */

    Microsoft.Maps.Events.addHandler(map, 'viewchangeend', setStreetOsLayer);

    loadPlaces();
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

function mapMoveTo(e, n, offX, offY) {
    window.map.setView({
        center: new Microsoft.Maps.Location(n, e),
        centerOffset: new Microsoft.Maps.Point(offX, offY)
    });
}

window.addEventListener("beforeunload", function (e) {
    if (this.window.map) {
        var loc = this.window.map.getCenter();
        setCookie("mapView", JSON.stringify( {
            loc: loc,
            zoom: this.window.map.getZoom(),
            mapType: this.window.map.getMapTypeId()
        }));
    }
});


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
                        mapAdd(makePlace(loc.longitude, loc.latitude));
                    }
                }
            ]
        });
    menuBox.setMap(map);
    Microsoft.Maps.Events.addHandler(window.map, "rightclick",
        function (e) {
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
function mapAdd(place) {
    if (!place) return null;
    var pushpin = null;
    try {
        pushpin = new Microsoft.Maps.Pushpin(
            new Microsoft.Maps.Location(place.loc.n, place.loc.e),
            {
                title: place.Title.replace(/&#39;/, "'").replace(/&quot;/, "\""),
                enableHoverStyle: false
            }
        );
        pushpin.place = place;
        placeToPin[place.id] = pushpin;
        updatePin(pushpin);
        window.map.entities.push(pushpin);
        Microsoft.Maps.Events.addHandler(pushpin, 'click', popPetals); 
        /*function (e) {
            if (e) { showPin(e.primitive, e); }
        }*/
        Microsoft.Maps.Events.addHandler(pushpin, 'mouseover', popPetals);
        Microsoft.Maps.Events.addHandler(pushpin, 'mouseout', function (e) {
            window.petalHideTimeout = setTimeout(() => {
                hidePetals();
            }, 1000);
        });

    } catch (xx) { }
    return pushpin;
}

// Set the title and colour according to the attached place
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


// OS Landranger Map only goes up to zoom 17. Above that, display OS Standard.
function setStreetOsLayer() {
    if (window.map.getZoom() > 17 && window.map.getMapTypeId() == "os") {
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
}

function mapsToggleType () {
    if (!window.map) return;
    if (window.map.getMapTypeId().indexOf("a") >=0) {
        window.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.ordnanceSurvey });
        setStreetOsLayer();
        return "os";
    }
    else {
        window.map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.aerial });
        return "aerial";
    }
}

// On initialization, get API keys

function setUpMap() {
    getKeys(function (data) {
        doLoadMap();
    }
    );
}

function doLoadMap() {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';
    script.src = 'https://www.bing.com/api/maps/mapcontrol?key=' + window.keys.Client_Map_K + '&callback=mapModuleLoaded';
    head.appendChild(script);
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