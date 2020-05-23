
function g(id) {return id ? document.getElementById(id) : null;}
function d2(n) { return n.toFixed(2); }
function d6(n) { return n.toFixed(6); }

// Placeholder: removed appInsights initialization for now:
var appInsights = {trackEvent: () =>{}}

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
        hash = ((hash << 5) - hash) + chr*(i%11); // notice reorderings
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function Sexagesimal (numbers) {
    return numbers[0].numerator / numbers[0].denominator + (numbers[1].numerator / numbers[1].denominator)/60 + (numbers[2].numerator / numbers[2].denominator)/3600;
}

function log (s) {
    if (console && console.log) {
        console.log(new Date().toUTCString() + " " + s);
    }
}
log ("util load");

var observableNameCounter = 0;

class Observable {
    constructor (initValue) {
        this.name = "observable" + observableNameCounter++;
        this.event = new Event(this.name);
        this.value = initValue;
    }
    set Value (v) {
        if (v == this.value) return;
        this.value = v;
        window.dispatchEvent(this.event);
    }
    get Value() { return this.value; }
    AddHandler (fn) {
        window.addEventListener(this.name, fn);
    }
}

class ObservableWrapper {
    /**
     * Wrap a getter function with an event.
     * @pre fn has no side effects
     * @param {fn} getter 
     */
    constructor (getter) {
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
    Notify () {
        var v = this.getter();
        if (v == this.oldValue) return;
        this.oldValue = v;
        window.dispatchEvent(this.event);
    }
    AddHandler (fn) {
        window.addEventListener(this.name, fn);
    }
}