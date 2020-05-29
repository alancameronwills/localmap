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


function mapModuleLoaded(refresh=false) {
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
        this.mapType = mapType || "aerial";

    }
}
class MapViewMS extends MapView {
    get MapTypeId() {
        return this.mapType == "aerial" ?
            Microsoft.Maps.MapTypeId.aerial :
            Microsoft.Maps.MapTypeId.ordnanceSurvey;
    }
    get Location() {
        return new Microsoft.Maps.Location(this.n, this.e);
    }
    get Zoom() { return this.z; }
}


class Map {
    /**
     * Load map module and display map.
     * @param {(){}} onloaded
     * @param {"google"|"bing"} sort 
     * @param {{n,e,z,mapType}} defaultloc 
     */
    constructor(onloaded, sort, defaultloc) {
        this.onloaded = onloaded;
        this.mapView = (getCookieObject("mapView") || defaultloc).as(this.MapViewType);
        this.placeToPin = {};
        insertScript(sort);
    }

    loaded(onloaded) {
        this.timeWhenLoaded = Date.now();
    }
    refresh() {

    }
    moveTo() {

    }
    deletePin() {

    }
    replace(oldPlace, newPlace) { //???

    }
    addOrUpdate(place) {

    }
    addOrUpdateLink(place1) {

    }
    mapRemoveLink(place) {

    }
    updatePin(pin) { //???

    }
    showPin(pin, e) { // popup

    }
    setPinsVisible(tag) {

    }
    setPlacesVisible(filter) {

    }
    mapSearch(term) {

    }
    setBoundsRoundPins(pins) {

    }
    setBoundsRoundPlaces(places) {

    }
    broaden(loc) {

    }
    toggleType() {

    }
}

class BingMap extends Map {
    constructor(onloaded, defaultloc) {
        super(onloaded, "bing", defaultloc);
    }

    loaded(onload) {
        super.loaded(onload);
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
        Microsoft.Maps.Events.addHandler(this.map, 'viewchangeend', mapViewHandler);
        this.setUpMapClick();
        this.setUpMenu();
        onload();
    }
    get MapViewType() { return MapViewMS; }
}