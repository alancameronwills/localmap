function insertScript(s) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';
    script.src = siteUrl + "/api/map?sort=" + s;
    head.appendChild(script);
}


function mapModuleLoaded() {
    window.map.loaded(onMapLoaded || (() => { }));
}


function doLoadMap() {
    var savedCartography = getCookie("cartography");
    var queryCartography = window.location.queryParameters["cartography"]
        ? (window.location.queryParameters["cartography"] == "google" ? "google" : "bing")
        : null;
    if (queryCartography) {
        setCookie("cartography", queryCartography);
    }
    var cartography = queryCartography || savedCartography || "bing";

    window.map = cartography == "google" ? new GoogleMap() : new BingMap();
}



class Map {
    /**
     * Load map module and display map.
     * @param {"google"|"bing"} sort 
     * @param {{n,e,z,mapType}} defaultloc 
     */
    constructor (sort, defaultloc) {
        window.map = this;
        insertScript(sort);
        this.mapView = getCookieObject("mapView") || defaultloc;
    }
    loaded(onload) {
        this.timeWhenLoaded = Date.now();

    }
    refresh () {

    }
    moveTo () {

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
    showPin(pin,e) { // popup

    }
    setPinsVisible(tag) {

    }
    setPlacesVisible(filter) {

    }
    mapSearch(term){

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
    constructor() {
        super("bing");
    }
}