function g(id) { return id ? document.getElementById(id) : null; }
function d2(n) { return n.toFixed(2); }
function d6(n) { return n.toFixed(6); }



// MS Application Insights for monitoring user activity
var sdkInstance = "appInsightsSDK";
window[sdkInstance] = "appInsights";
var aiName = window[sdkInstance], aisdk = window[aiName] || function (e) { function n(e) { t[e] = function () { var n = arguments; t.queue.push(function () { t[e].apply(t, n) }) } } var t = { config: e }; t.initialize = !0; var i = document, a = window; setTimeout(function () { var n = i.createElement("script"); n.src = e.url || "https://az416426.vo.msecnd.net/scripts/b/ai.2.min.js", i.getElementsByTagName("script")[0].parentNode.appendChild(n) }); try { t.cookie = i.cookie } catch (e) { } t.queue = [], t.version = 2; for (var r = ["Event", "PageView", "Exception", "Trace", "DependencyData", "Metric", "PageViewPerformance"]; r.length;)n("track" + r.pop()); n("startTrackPage"), n("stopTrackPage"); var s = "Track" + r[0]; if (n("start" + s), n("stop" + s), n("setAuthenticatedUserContext"), n("clearAuthenticatedUserContext"), n("flush"), !(!0 === e.disableExceptionTracking || e.extensionConfig && e.extensionConfig.ApplicationInsightsAnalytics && !0 === e.extensionConfig.ApplicationInsightsAnalytics.disableExceptionTracking)) { n("_" + (r = "onerror")); var o = a[r]; a[r] = function (e, n, i, a, s) { var c = o && o(e, n, i, a, s); return !0 !== c && t["_" + r]({ message: e, url: n, lineNumber: i, columnNumber: a, error: s }), c }, e.autoExceptionInstrumented = !0 } return t }(
    {
        instrumentationKey: "ec1253ac-df0e-464b-89aa-53765d385794"
    }
); window[aiName] = aisdk, aisdk.queue && 0 === aisdk.queue.length && aisdk.trackPageView({});

/*
// Placeholder: removed appInsights initialization for now:
var appInsights = {
    trackEvent: () =>{}, 
    setAuthenticatedUserContext:()=>{}, 
    clearAuthenticatedUserContext: () =>{}
};
*/

// Get query parameters
location.queryParameters = {};
location.search.substr(1).split("&").forEach(function (pair) {
    if (pair === "") return;
    var parts = pair.split("=");
    location.queryParameters[parts[0]] = parts[1] &&
        decodeURIComponent(parts[1].replace(/\+/g, " "));
});


// For searching and sorting place names
// Remove puntuation, spacing, Welsh chars, so that Tŷ Wylan == Ty-wylan
function comparable(title) {
    return title.toLocaleLowerCase().replace(/[- '",]+/g, "").replace(/^the/, ""
        .replace(/[âêîôûŵŷ]/, function (c) { return { "â": "a", "ê": "e", "î": "i", "ô": "o", "û": "u", "ŵ": "w", "ŷ": "y" }[c]; }));
}


/// Default 30 days
function setCookie(cname, cvalue, exdays) {
    if (!exdays) exdays = 30;
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    document.cookie = cname + "=" + cvalue + "; expires=" + d.toUTCString();
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getCookieObject(cname) {
    let cookie = getCookie(cname);
    if (!cookie) return null;
    return JSON.parse(cookie);
}

// Determines whether one element is contained in another
function isInNode(element, nodeId) {
    if (!element) return false;
    if (!element.id) return isInNode(element.parentElement, nodeId);
    return element.id == nodeId;
}


function noPropagate(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    else {
        e.cancelBubble = true;
    }
}

function trimQuotes(s) {
    if (typeof s !== "string" || s.length == 0) return "";
    return s.replace(/^"|"$/gm, '');
}

function cast(object, type) {
    object.__proto__ = type.prototype;
    return object;
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}


var isAdvancedBrowser = function () {
    var div = document.createElement('div');
    return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
}();

function hashPassword(email, pwd) {
    return "" + (hashCode(email) * hashCode(pwd));
};

function hashCode(s) {
    var hash = 0, i, chr;
    if (s.length === 0) return hash;
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr * (i % 11); // notice reorderings
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function Sexagesimal(numbers) {
    return numbers[0].numerator / numbers[0].denominator + (numbers[1].numerator / numbers[1].denominator) / 60 + (numbers[2].numerator / numbers[2].denominator) / 3600;
}

function log(s) {
    if (console && console.log) {
        console.log(new Date().toUTCString() + " " + s);
    }
}
log("util load");

var observableNameCounter = 0;

class Observable {
    constructor(initValue) {
        this.name = "observable" + observableNameCounter++;
        this.event = new Event(this.name);
        this.value = initValue;
    }
    set Value(v) {
        if (v == this.value) return;
        this.value = v;
        window.dispatchEvent(this.event);
    }
    get Value() { return this.value; }
    AddHandler(fn) {
        window.addEventListener(this.name, fn);
    }
}

class ObservableWrapper {
    /**
     * Wrap a getter function with an event.
     * @pre fn has no side effects
     * @param {fn} getter 
     */
    constructor(getter) {
        this.name = "observable" + observableNameCounter++;
        this.getter = getter;
        this.event = new Event(this.name);
        this.oldValue = null;
    }
    /**
     * Current value
     */
    get Value() { return this.getter(); }
    /**
     * If the value has changed since last call, send the event.
     */
    Notify() {
        var v = this.getter();
        if (v == this.oldValue) return;
        this.oldValue = v;
        window.dispatchEvent(this.event);
    }
    AddHandler(fn) {
        window.addEventListener(this.name, fn);
    }
}
let projectQuery = location.queryParameters["project"] || "";
let placeQuery = location.queryParameters["place"] || "";

if (!projectQuery && placeQuery) {
    let placeproject = placeQuery.split("|")[0];
    if (placeproject) projectQuery = placeproject;
}

switch (projectQuery.toLocaleLowerCase()) {
    case "folio":
        window.project = {
            id: "Folio", // PrimaryKey in places table
            loc: { n: 52.562132, e: -1.822827, z: 14, mapType:"a", mapBase:"google"},
            welsh: false,
            contributorRole: true, // Contributors must be approved
            title: "Folio Map",
            terms: "http://foliosuttoncoldfield.org.uk/mapping-our-memories-terms/",
            intro: "http://foliosuttoncoldfield.org.uk/mapping-our-memories/",
            cartography: "google",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals" },
                { id: "pop", name: "People", color: "#ff0000", tip: "Life as it is" },
                { id: "arch", name: "History", color: "#40ff40", tip: "Life as it was" },
                { id: "built", name: "Built", color: "#40a0ff", tip: "Architecture, roads" },
                { id: "ego", name: "Me", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas" }]
        };
        break;
    default:
        // (52.008144, -5.067547), //Garn Fawr   //(51.782365, -5.101158), // Broadhaven // 51.799447, -4.744831), // Span 
        window.project = {
            id: "Garn Fawr",
            loc: { n: 51.855912, e: -4.920331, z: 11, mapType:"os", mapBase: "bing" },
            welsh: true,
            title: "Map Digi Penfro",
            terms: "privacy.html",
            cartography: "bing",
            tags: [
                { id: "fauna", name: "Anifeiliaid", color: "#a00000", tip: "Anything that moves" },
                { id: "flora", name: "Planhigion", color: "#00a000", tip: "Botany" },
                { id: "petri", name: "Cerrig", color: "#909090", tip: "Geology" },
                { id: "pop", name: "Pobl", color: "#c0a000", tip: "History, archaeology, stories" },
                { id: "met", name: "Tywydd", color: "#40a0ff", tip: "Sea, sky, climate" },
                { id: "ego", name: "Fi", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas" }]
        };
        break;
}
let titleElements = document.getElementsByTagName("title");
if (titleElements.length > 0 && window.project.title) {
    titleElements[0].innerHTML = window.project.title;
}