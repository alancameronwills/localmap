/** Find element with given id  */
function g(id) { return id ? document.getElementById(id) : null; }
/** Return element or find element with given id */
function gx(idOrElement) {
    return typeof idOrElement == "string" ? g(idOrElement) : idOrElement;
}
/** Fixed 2-digit decimal */
function d2(n) { return n.toFixed(2); }
/** Fixed 6-digit decimal */
function d6(n) { return n.toFixed(6); }

/*function registerServiceWorker(){
    if('serviceWorker' in navigator) {
        navigator.serviceWorker
                 .register('service-worker.js')
                 .then(function() { console.log("Service Worker Registered"); });
      }
}*/


function RegisterSW() {
    //if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
    console.log("mobile device");
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('service-worker.js')
            .then(function () { console.log("Service Worker Registered"); });
        location.reload();
    }



    /*} else {
        console.log("not mobile device");
    }*/
}


function UnregisterSW() {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister()
        }
    })
    console.log("Service Worker Deleted");
    location.reload();

}



/**
 * Set display of a DOM element to none.
 * @param {Element|string} x - element or its id
 */
function hide(x) {
    let o = typeof x == "string" ? g(x) : x;
    if (o && o.style) o.style.display = "none";
}
/**
 * Set display style of a DOM element.
 * @param {Element|string} x - element or its id
 * @param {string} d - display type - default 'block'
 */
function show(x, d = "block") {
    let o = typeof x == "string" ? g(x) : x;
    if (o && o.style) o.style.display = d;
}

/**
 * Optionally set and return innerHTML.
 * @param {Element} x 
 * @param {string} content - HTML
 * @returns x.innerHTML
 */
function html(x, content) {
    let o = typeof x == "string" ? g(x) : x;
    if (o) {
        if (content != null) {
            o.innerHTML = content;
        }
        return o.innerHTML;
    }
    return null;
}

/** Return innerText of an element, or strip out any HTML and set content.
 * @param {Element} x 
 * @param {string} content - optional
 * @returns x.innerText
 */
function text(x, content) {
    let o = typeof x == "string" ? g(x) : x;
    if (o) {
        if (content != null) {
            o.innerHTML = content.replace(/<.*?>/g, "");
        }
        return o.innerText;
    }
    return null;
}

function listen(x, eventName, fn) {
    let o = typeof x == "string" ? g(x) : x;
    if (o && o.addEventListener) {
        o.addEventListener(eventName, fn);
    }
}

/**Create a DOM element & append to parent.
 * @param id {string} 
 * @param type {string} - div, img, etc
 * @param parent {Element|String|null} - element or its id
 */
function c(id, type, parent, ns = null, attribs = {}) {
    let i = ns ? document.createElementNS(ns, type) : document.createElement(type);
    if (id) i.id = id;
    if (parent) {
        let p = typeof parent == "string" ? g(parent) : parent;
        if (p) p.append(i);
    }
    Object.keys(attribs).forEach(k => {
        switch (k) {
            case "c": i.className = attribs[k];
                break;
            case "i": i.id = attribs[k];
                break;
            case "h": i.innerHTML = attribs[k];
                break;
            default:
                i.setAttribute(k, attribs[k]);
                break;
        }
    });
    return i;
}

/** Create a fixed DOM structure and provide access to parts.
 * See example in lighbox.js
 */
class U {
    /**
     * @param struct {id:id,t:DOM type,c:classNames,h:innerHTML,s:[children]}
     * @param existingElement {Element} - if null, create new element
     * @post this.id points to each sub element. 
     */
    constructor(struct, existingElement) {
        this.root = this.UU(struct, null, this, existingElement);
    }

    UU(struct, parent, dictionary, existingElement) {
        let element = existingElement || document.createElement(struct.t || "div");
        if (struct.c) element.className = struct.c;
        if (struct.h) element.innerHTML = struct.h;
        if (parent) parent.append(element);
        if (struct.id) dictionary[struct.id] = element;
        Object.keys(struct).forEach(k => {
            if (k.length > 1) {
                element[k] = struct[k];
            }
        });
        if (struct.s) {
            struct.s.forEach(sub => {
                this.UU(sub, element, dictionary);
            })
        }
        return element;
    }
}


// MS Application Insights for monitoring user activity
if (!window.Cypress) {
var sdkInstance = "appInsightsSDK";
window[sdkInstance] = "appInsights";
var aiName = window[sdkInstance], aisdk = window[aiName] || function (e) { function n(e) { t[e] = function () { var n = arguments; t.queue.push(function () { t[e].apply(t, n) }) } } var t = { config: e }; t.initialize = !0; var i = document, a = window; setTimeout(function () { var n = i.createElement("script"); n.src = e.url || "https://az416426.vo.msecnd.net/scripts/b/ai.2.min.js", i.getElementsByTagName("script")[0].parentNode.appendChild(n) }); try { t.cookie = i.cookie } catch (e) { } t.queue = [], t.version = 2; for (var r = ["Event", "PageView", "Exception", "Trace", "DependencyData", "Metric", "PageViewPerformance"]; r.length;)n("track" + r.pop()); n("startTrackPage"), n("stopTrackPage"); var s = "Track" + r[0]; if (n("start" + s), n("stop" + s), n("setAuthenticatedUserContext"), n("clearAuthenticatedUserContext"), n("flush"), !(!0 === e.disableExceptionTracking || e.extensionConfig && e.extensionConfig.ApplicationInsightsAnalytics && !0 === e.extensionConfig.ApplicationInsightsAnalytics.disableExceptionTracking)) { n("_" + (r = "onerror")); var o = a[r]; a[r] = function (e, n, i, a, s) { var c = o && o(e, n, i, a, s); return !0 !== c && t["_" + r]({ message: e, url: n, lineNumber: i, columnNumber: a, error: s }), c }, e.autoExceptionInstrumented = !0 } return t }(
    {
        instrumentationKey: "ec1253ac-df0e-464b-89aa-53765d385794"
    }
); window[aiName] = aisdk, aisdk.queue && 0 === aisdk.queue.length && aisdk.trackPageView({});
} else {
// Placeholder: removed appInsights initialization for now:
var appInsights = {
    trackEvent: () =>{}, 
    setAuthenticatedUserContext:()=>{}, 
    clearAuthenticatedUserContext: () =>{}
};
}

// Get query parameters
location.queryParameters = {};
location.search.substr(1).split("&").forEach(function (pair) {
    if (pair === "") return;
    var parts = pair.split("=");
    location.queryParameters[parts[0]] = parts[1] &&
        decodeURIComponent(parts[1].replace(/\+/g, " ")).replace(/%27/,"");
});

if (!window.version) { window.version = location.queryParameters["v"] || "1"; }

// For searching and sorting place names
// Remove puntuation, spacing, Welsh chars, so that Tŷ Wylan == Ty-wylan
function comparable(title) {
    return title.toLocaleLowerCase().replace(/[- '",]+/g, "").replace(/^the/, ""
        .replace(/[âêîôûŵŷ]/, function (c) { return { "â": "a", "ê": "e", "î": "i", "ô": "o", "û": "u", "ŵ": "w", "ŷ": "y" }[c]; }));
}

/** Set a cookie for this app
 * 
 * @param {string} cname Name
 * @param {string} cvalue Use JSON.stringify() on an object
 * @param {number} exdays Expiry period in days (default 30)
 */
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

class Notifier {
    constructor() {
        this.name = "observable" + observableNameCounter++;
        this.event = new Event(this.name);
    }
    Notify() {
        window.dispatchEvent(this.event);
    }
    AddHandler(fn) {
        window.addEventListener(this.name, fn);
        fn();
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

/** Extend this to make an object that listens to several inputs. */
class MultipleNotifierListener {
    constructor () {
        this.filters = [];
    }
    /** public
     * Add a Notifier to listen to
     * @param {Notifier} notifier
     * @param {()=>{true|false|null}} filter - Value notified by this notifier; or null if don't care.
     */
    addTrigger(notifier, filter) {
        this.filters.push(filter);
        notifier.AddHandler( () => this.update());
    }

    /** protected. A method of combining values from multiple Booleans */
    BooleanCombination() {
        let verdict = false;
        this.filters.forEach(f => {
            let result = f();
            if (result === true) verdict = true;
            else if (result === false) verdict = false;
        });
        this.setValue(verdict);
    }
    /** private */
    setValue(v) {
        this.currentValue = v;
        this.specificSetValue(v);
    }
    /** public */
    setTemporarily(tempValue = true, timeout = 10000) {
        let oldValue = this.currentValue;
        if (oldValue != tempValue) {
            this.setValue(tempValue);
            setTimeout(() => {
                this.setValue(oldValue);
            }, timeout);
        }
    }

    /** (optional) Override this for some other combination rule. Protected */
    update() {
        this.BooleanCombination();
    }
    
    /** (required) Override to define what happens on change of value. */
    specificSetValue(v) {
        throw("Override this");
    }

}


function insertScript(s, onload) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';
    script.src = s;
    script.onload = onload;
    head.appendChild(script);
}

// -------------
// Language
// -------------

window.strings = {};
window.iaith = "EN";

function toggleLanguage() {
    if (appInsights) appInsights.trackEvent({ name: "toggleLanguage" });
    setLanguage(window.iaith == "CYM" ? "EN" : "CYM");
}

function setLanguage(lang) {
    if (!window.project.welsh) return;
    window.iaith = lang;
    setCookie("iaith", window.iaith);
    if (g("aboutEN")) {
        if (lang == "CYM") {
            hide("aboutEN");
            show("aboutCYM", "inline");
        } else {
            show("aboutEN", "inline");
            hide("aboutCYM");
        }
    }
    setTimeout(() => {
        setStrings();
    }, 500);
}

function setStrings() {
    getFile(siteUrl + "/api/strings", (data) => {
        setStringsFromTable(window.iaith, data);
    });
}

function setStringsFromTable(iaith, data) {
    window.strings = {};
    for (var i = 0; i < data.length; i++) {
        let row = data[i];
        let ids = row.id.split(' ');
        for (var j = 0; j < ids.length; j++) {
            id = ids[j];
            window.strings[id] = row;
            if (!row.attr || row.attr == "js") continue;
            let phrase = row[iaith] || row["EN"];
            if (!phrase) continue;
            let elem = g(id);
            if (elem) {
                try {
                    if (row.attr == "html") {
                        elem.innerHTML = phrase;
                    } else if (row.attr != "js") {
                        elem.setAttribute(row.attr, phrase);
                    }
                } catch (ex) { }
            }
        }
    }
    switchTagLanguage(iaith);
}

function s(sid, en) {
    var r = null;
    try {
        if (window.strings[sid]) r = window.strings[sid][window.iaith];
    } catch (ex) { }
    return r || en;
}


window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


// ==========
// Projects 
// ==========

let projectQuery = location.queryParameters["project"] || "";
let placeQuery = location.queryParameters["place"] || "";

if (!projectQuery && placeQuery) {
    let placeproject = placeQuery.split("|")[0];
    if (placeproject) projectQuery = placeproject;
}
switch (projectQuery.toLocaleLowerCase()) {
    case "8dwn40fvv2":
        window.project = {
            id: "8dwn40fvv2",
            splashId: "testSplash",
            loc: { n: 51.48, e: 0.0, z: 15, mapChoice: 0, mapBase: "google" },
            welsh: true,
            instantContributor: true,
            admin: "map@pantywylan.org",
            title: "Greenwich",
            terms: "https://www.moylgrove.wales/privacy",
            intro: "https://www.moylgrove.wales/walks",
            cartography: "google",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth", namecy: "Geo", tipcy: "Cerrig, y ddaear" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals", namecy: "Natur", tipcy: "Planhigion ac anifeiliaid" },
                { id: "pop", name: "Activities", color: "#ff0000", tip: "Things to do", namecy: "Gweithgareddau", tipcy: "Pethau i wneud" },
                { id: "built", name: "Built", color: "#40ff40", tip: "Architecture, houses, structures", namecy: "Adeiladu", tipcy: "Pensaernïaeth, tai, ..." },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was, stories", namecy: "Hanes", tipcy: "Bywyd fel yr arferai fod" },
                { id: "ego", name: "Nav", color: "#f0f000", tip: "Finding your way", namecy: "Llywio", tipcy: "Dewch o hyd i'ch ffordd" }
            ]
        };
        break;
    case "trewyddel":
        window.project = {
            id: "Trewyddel", // PrimaryKey in places table
            splashId: "trewyddelSplash",
            loc: { n: 52.070666, e: -4.758313, z: 15, mapChoice: 0, mapBase: "bing" },
            welsh: true,
            instantContributor: true,
            admin: "map@pantywylan.org",
            title: "Trewyddel::Moylgrove",
            org: "Cymdeithas Trewyddel",
            terms: "https://www.moylgrove.wales/privacy",
            intro: "https://www.moylgrove.wales/walks",
            cartography: "bing",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth", namecy: "Geo", tipcy: "Cerrig, y ddaear" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals", namecy: "Natur", tipcy: "Planhigion ac anifeiliaid" },
                { id: "pop", name: "Activities", color: "#ff0000", tip: "Things to do", namecy: "Gweithgareddau", tipcy: "Pethau i wneud" },
                { id: "built", name: "Built", color: "#40ff40", tip: "Architecture, houses, structures", namecy: "Adeiladu", tipcy: "Pensaernïaeth, tai, ..." },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was, stories", namecy: "Hanes", tipcy: "Bywyd fel yr arferai fod" },
                { id: "ego", name: "Nav", color: "#f0f000", tip: "Finding your way", namecy: "Llywio", tipcy: "Dewch o hyd i'ch ffordd" }
            ]
        };
        break;
    case "trefdraeth":
        window.project = {
            id: "Trefdraeth", // PrimaryKey in places table
            splashId: "trefdraethSplash",
            loc: { n: 52.016392, e: -4.836004, z: 15, mapChoice: 0, mapBase: "bing" },
            welsh: true,
            instantContributor: true,
            admin: "map@pantywylan.org",
            title: "Newport Pembrokeshire",
            org: "Newport",
            terms: "hhttps://www.newport-pembs.co.uk/wp-content/uploads/2020/06/Website-bilingual-270819-1.pdf",
            intro: "https://www.newport-pembs.co.uk/wp-content/uploads/2020/06/Website-bilingual-270819-1.pdf",
            cartography: "bing",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth", namecy: "Geo", tipcy: "Cerrig, y ddaear" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals", namecy: "Natur", tipcy: "Planhigion ac anifeiliaid" },
                { id: "pop", name: "Arts", color: "#ff0000", tip: "Writing, music, architecture, painting, ...", namecy: "Celfyddydau", tipcy: "ysgrifennu, cerddoriaeth, pensaernïaeth, paentio, ..." },
                //{ id: "built", name: "Built", color: "#40ff40", tip: "Architecture, houses, structures", namecy: "Adeiladu", tipcy: "Pensaernïaeth, tai, ..." },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was, stories", namecy: "Hanes", tipcy: "Bywyd fel yr arferai fod" },
                { id: "ego", name: "Nav", color: "#f0f000", tip: "Finding your way", namecy: "Llywio", tipcy: "Dewch o hyd i'ch ffordd" }
            ]
        };
        break;
    case "folio":
        window.project = {
            id: "Folio", // PrimaryKey in places table
            splashId: "folioSplash",
            loc: { n: 52.562132, e: -1.822827, z: 14, mapChoice: 0, mapBase: "google" },
            mapChoices: ["roadmap", "satellite", "os1890map", "os1900map", "os1940map"],
            welsh: false,
            instantContributor: true,
            admin: "map@foliosuttoncoldfield.org.uk",
            title: "Telling Sutton's Stories",
            org: "Folio",
            terms: "http://foliosuttoncoldfield.org.uk/telling-suttons-stories-terms/",
            intro: "http://foliosuttoncoldfield.org.uk/telling-suttons-stories/",
            cartography: "google",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals" },
                { id: "pop", name: "Arts", color: "#ff0000", tip: "Writing, music, architecture, painting, ..." },
                //{ id: "built", name: "Built", color: "#40ff40", tip: "Architecture, roads" },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was" },
                { id: "ego", name: "Me", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas" }]
        };
        break;
    case "ffordd" :
        window.project = {
            id:"ffordd",
            splashId: "fforddSplash",
            loc: {n:51.960748, e: -4.745572, z:13, mapChoice: 0, mapBase: "bing"},
            welsh:true,
            instantContributor: true,
            title:"Y Ffordd Euraidd",
            admin:"mapdigipenfro@span-arts.org.uk",
            intro: "https://span-arts.ticketsolve.com/shows/873624530",
            terms: "img/permissions_form_golden_road.pdf",
            cartography: "bing",
            tags: [

                { id: "petri", name: "Geo", color: "#909090", tip: "The earth", namecy: "Geo", tipcy: "Cerrig, y ddaear" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals", namecy: "Natur", tipcy: "Planhigion ac anifeiliaid" },
                { id: "pop", name: "Arts", color: "#ff0000", tip: "Writing, music, painting, ...", namecy: "Celfyddydau", tipcy: "ysgrifennu, cerddoriaeth, paentio, ..." },
                { id: "built", name: "Built", color: "#40ff40", tip: "Architecture, houses, structures", namecy: "Adeiladu", tipcy: "Pensaernïaeth, tai, ..." },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was, stories", namecy: "Hanes", tipcy: "Bywyd fel yr arferai fod" },
                { id: "ego", name: "Nav", color: "#f0f000", tip: "Finding your way", namecy: "Llywio", tipcy: "Dewch o hyd i'ch ffordd" }
            ]
        };
        break;
    default:
        // (52.008144, -5.067547), //Garn Fawr   //(51.782365, -5.101158), // Broadhaven // 51.799447, -4.744831), // Span 
        window.project = {
            id: "Garn Fawr",
            splashId: "spanSplash",
            loc: { n: 51.855912, e: -4.920331, z: 11, mapChoice: 0, mapBase: "bing" },
            welsh: true,
            instantContributor: true,
            title: "Map Digi Penfro",
            org: "Span Arts",
            admin: "mapdigipenfro@span-arts.org.uk",
            intro: "http://www.span-arts.org.uk/news/help-us-add-to-the-span-deep-map-map-digi-penfro/#.Xu09q2hKiUl",
            terms: "privacy.html",
            cartography: "bing",
            tags: [
                { id: "fauna", name: "Animals", namecy: "Anifeiliaid", color: "#a00000", tip: "Anything that moves", tipcy: "Unrhyw beth sy'n symud"},
                { id: "flora", name: "Plants", namecy: "Planhigion", color: "#00a000", tip: "Botany" , tipcy: "Botaneg"},
                { id: "petri", name: "Rocks", namecy: "Cerrig", color: "#909090", tip: "Geology", tipcy: "Daeareg" },
                { id: "pop", name: "People", namecy: "Pobl", color: "#c0a000", tip: "History, archaeology, stories", tipcy: "Hanes, archeoleg, straeon"},
                { id: "met", name: "Weather", namecy: "Tywydd", color: "#40a0ff", tip: "Sea, sky, climate", tipcy: "Môr, awyr, hinsawdd"},
                { id: "ego", name: "Me", namecy: "Fi", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas", tipcy:"Nodiadau, cofiannau, teimladau, syniadau" }]
        };
        break;
}
let titleElements = document.getElementsByTagName("title");
if (titleElements.length > 0 && window.project.title) {
    titleElements[0].innerHTML = window.project.title;
}
