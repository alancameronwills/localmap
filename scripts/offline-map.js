
var zoom = 0;
var isMoving = false;
var movingFromX = 0;
var movingFromY = 0;
var mapOffsetX = 0;
var mapOffsetY = 0;
var newMapOffsetX = 0;
var newMapOffsetY = 0;
var mapHeight = 800;
var mapWidth = 1978;

var mapimgsrc = "";


function setUpMap() {
    var mapImage = new Image();
    mapImage.onload = function (event) {
        mapHeight = mapImage.height;
        mapWidth = mapImage.width;
        var psvg = g("points");
        psvg.style.height = "" + mapHeight + "px";
        psvg.style.width = "" + mapWidth + "px";
        var mapdiv = g("mapdiv");
        mapdiv.style.height = "" + mapHeight + "px";
        mapdiv.style.width = "" + mapWidth + "px";
        centreMap(Math.floor(2400 - window.innerWidth / 2), Math.floor(800 - innerHeight / 2));
        loadPlaces();
        g("splash").style.display = "none";
    }
    mapImage.src = "img/a-1.png";
    var m = g("mapdiv");
    m.style.backgroundImage = mapimgsrc = "url(img/a-1.png)";


    m.onmousedown = function (e) {
        movingFromX = e.offsetX;
        movingFromY = e.offsetY;
        isMoving = true;
    }

    m.onmouseup = exit;
    m.onmouseleave = exit;
    m.onmousemove = function (event) {
        if (isMoving && zoom == 0) {
            var dx = event.offsetX - movingFromX;
            var dy = event.offsetY - movingFromY;
            newMapOffsetX = Math.max(window.innerWidth - mapWidth, Math.min(0, mapOffsetX + dx));
            newMapOffsetY = Math.max(window.innerHeight - mapHeight, Math.min(0, mapOffsetY + dy));
            setMapOffset(newMapOffsetX, newMapOffsetY);
        }
        reportPosition(event);
    }

    m.onauxclick = function (event) {
        event.preventDefault();
    }

    m.oncontextmenu = function (e) {
        e.preventDefault();
        closePopup();
        var x = event.offsetX - mapOffsetX;
        var y = event.offsetY - mapOffsetY;
        var latlong = toLatlong(y, x);
        var placePoint = makePlacePoint(x, y, makePlace(latlong.e, latlong.n));
    }

    m.onclick = function (event) {
        closePopup();
    }

}

// Set colour, label, ...
function updatePin(pin) {
    var options = pinOptions(pin.place);
    pin.setAttributeNS(null, "fill", options.color);
    pin.title = options.title;
}

function mapChange(v) {
    if (v == "os") {
        g("mapdiv").style.backgroundImage = mapimgsrc = "url(img/b-os-1.png)";
    } else {
        g("mapdiv").style.backgroundImage = mapimgsrc = "url(img/a-1.png)";
    }
}

function exit(e) {
    if (isMoving) {
        isMoving = false;
        mapOffsetX = newMapOffsetX;
        mapOffsetY = newMapOffsetY;
    }
}

function setMapOffset(x, y) {
    g("mapdiv").style.backgroundPosition = "" + x + "px " + y + "px";
    // shift points
    var pp = g("points");
    pp.setAttribute("x", x);
    pp.setAttribute("y", y);
}

function centreMap(x, y) {
    mapOffsetX = -x; newMapOffsetX = -x;
    mapOffsetY = -y; newMapOffsetY = -y;
    setMapOffset(mapOffsetX, mapOffsetY);
}

function makePlacePoint(x, y, place) {
    var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttributeNS(null, "cx", x);
    c.setAttributeNS(null, "cy", y);
    c.setAttributeNS(null, "r", 10);
    c.setAttributeNS(null, "fill", "red");
    g("points").appendChild(c);
    c.onmouseover = function (event) {
        this.style['stroke'] = "yellow";
        var label = g("label");
        if (this.title && label) {
            label.innerHTML = this.title;
            label.style.top = event.pageY + 10 + "px";
            label.style.left = event.pageX + 10 + "px";
            label.style.display = "block";
        }
    }
    c.onmouseout = function (event) {
        this.style['stroke'] = "none";
        var label = g("label");
        if (label) label.style.display = "none";
    }
    c.place = place;
    c.onclick = function (e) {
        showPopup(this, e.pageX, e.pageY);
        e.cancelBubble = true;
    }
    c.onauxclick = function (e) {
        e.preventDefault();
        cancelBubble = true;
    }
    c.oncontextmenu = function (e) {
        cancelBubble = true;
        e.preventDefault();
        // TODO: menu to move or delete
    }
    updatePin(c);
    return c;
}

function reportPosition(event) {
    var m = g("mapdiv");
    var sx = (event.offsetX - mapOffsetX);
    var sy = (event.offsetY - mapOffsetY);
    var latlong = toLatlong(sy, sx);

    g("msg").innerHTML = "" + m.clientWidth + ", " + m.clientHeight + "; " +
        event.offsetX + ", " + event.offsetY + "; " +
        d2(sx) + ", " + d2(sy) + "; " +
        d6(latlong.n) + ", " + d6(latlong.e);
}


function mapScreenToLonLat(x, y) {
    return toLatlong(y - mapOffsetY, x - mapOffsetX);
}

var Zx = 2307;
var Zy = 1465;
var NLx = -5.06853;
var Mxx = 5.3323e-6;
var Myx = 2e-08; //1.9495e-07;
var NLy = 52.006453;
var Myy = -3.307e-6;
var Mxy = 2e-9;

// Myx*Mxy == 3.899e-16
// 1/(Myx*Mxy - Myy*Mxx) == 1.763431e-11
var Mex = 187532.2;  // 1 / (Mxx - Myx*Mxy/Myy)
var Mnx = - 100; //11055.156 ;  // Myx/(Myx*Mxy - Myy*Mxx)
var Mny = -302382.2;  // 1 / (Myy - Myx*Mxy/Mxx)
var Mey = 113.4153;  // Mxy/(Myx*Mxy - Myy*Mxx)


function toLatlong(y, x) {
    return { e: (x - Zx) * Mxx + NLx + (y - Zy) * Myx, n: (y - Zy) * Myy + NLy + (x - Zx) * Mxy };
}

function toXY(latlong) {
    var re = latlong.e - NLx;
    var rn = latlong.n - NLy;
    // re == rx*Mxx + ry*Myx
    // rx == (re - ry*Myx)/Mxx
    // rn == ry*Myy + rx*Mxy
    // ry == (rn - rx*Mxy)/Myy
    // rx == (re - ((rn - rx*Mxy)/Myy)*Myx)/Mxx
    // rx == re/Mxx - (rn*Myx/Myy*Mxx) + (rx*Myx*Mxy/Myy*Mxx)
    // rx == (re/Mxx - rn*Myx/Myy*Mxx)/(1 - Myx*Mxy/Myy*Mxx)
    // rx == re/(Mxx - Myx*Mxy/Myy) + rn*Myx/(Myx*Mxy - Myy*Mxx)
    var rx = re * Mex + rn * Mnx;
    var ry = re * Mey + rn * Mny;
    return { x: rx + Zx, y: ry + Zy };
}


/// Show on map
function mapAdd(place) {
    if (!place) return;
    var xy = toXY(place.loc);
    makePlacePoint(xy.x, xy.y, place);
}