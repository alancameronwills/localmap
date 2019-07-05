const PicPrompt = "What's in this pic?";
const PlacePrompt = "What's here?"


if (location.protocol == "http:" && location.toString().indexOf("azure") > 0) {
    location.replace(("" + location).replace("http:", "https:"));
}

var knownTags = [
    { id: "fauna", name: "Anifeiliaid", color: "#a00000", tip: "Animals" },
    { id: "flora", name: "Planhigion", color: "#00a000", tip: "Plants" },
    { id: "petri", name: "Cerrig", color: "#909090", tip: "Rocks" },
    { id: "pop", name: "Pobl", color: "#c0a000", tip: "People" },
    { id: "met", name: "Tywydd", color: "#40a0ff", tip: "Weather" },
    { id: "ego", name: "Fy", color: "#ffff00", tip: "Me" }];

window.Places = {};
var RecentUploads = {};

var seqid = 1000;
function newId() { return new Date().toISOString().replace(/:/g, '').replace('.', '') + (seqid++); }

class Place {
    constructor(lon, lat) {
        this.id = newId();
        this.loc = { e: lon, n: lat };
        this.text = PlacePrompt;
        this.pics = [];
        this.tags = "";
    }
    get Stripped() {
        return this.text.replace(/(<div|<p|<br)[^>]*>/g, "¬¬¬").replace(/<[^>]*>/g, "").replace("&nbsp;", " ").replace(/^[ ¬]*/g, "").replace(/¬¬[ ¬]*/g, "<br/>");
    }
    get Title() {
        return this.Stripped.match(/[^<]*/)[0];
    }
    get Short() {
        var t = this.Stripped;
        if (t.length < 200) return t;
        return t.substr(0, 200) + "...";
    }
    get Hash() {
        var h = "" + this.text + this.loc.e + this.loc.n;
        if (this.pics) this.pics.forEach(function (pic, i, a) { h += pic.id + pic.caption; });
        if (this.tags) h += this.tags.toString();
        return hashCode(h);
    }
}

// An image or other media file attached to a place
class Picture {
    constructor(place, extension) {
        this.id = (place ? place.id + "-" + (seqid++) : newId()) + extension;
        this.url = "media/" + this.id;
        this.caption = PicPrompt;
        this.date = "";
        this.type = ""; // image/jpg etc
    }
    imgSrc() {
        return RecentUploads[this.id] ? RecentUploads[this.id] : this.url;
    }
    setImgData(data) {
        RecentUploads[this.id] = data;
    }
    setImg(img) {
        img.src = this.imgSrc();
        img.pic = this;
        img.title = (this.date || "") + " " + this.caption;
        img.style.transform = Picture.transform(this.orientation);
    }
    get extension() {
        return this.id.match(/\.[^.]*$/)[0].toLowerCase();
    }
    get isPicture() {
        return ".jpeg.jpg.gif.png".indexOf(this.extension) >= 0;
    }
    get isAudio() {
        return ".wav.mp3.avv.ogg".indexOf(this.extension) >= 0;
    }
}

Picture.transform = function (orientation) {
    return "rotate(" +
        (orientation == 6 ? "0.25"
            : orientation == 8 ? "0.75"
                : "0") + "turn)";
}

function init() {
    makeTags();
    setUpMap();
    setPetals();
}

// Initial load of all saved places into the map
function loadPlaces() {
    window.Places = {};
    getPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            place.__proto__ = Place.prototype;
            place.pics.forEach(function (pic) {
                pic.__proto__ = Picture.prototype;
            })
            window.Places[place.id] = place;
            mapAdd(place);
        });
        setTracking();
    });
}

function updatePlaces() {
    getRecentPlaces(mostRecentUpdate, function (placeArray) {
        placeArray.forEach(function (place) {
            place.__proto__ = Place.prototype;
            place.pics.forEach(function (pic) {
                pic.__proto__ = Picture.prototype;
            });
            if (window.Places[place.id]) {
                mapReplace(window.Places[place.id], place);
            } else {
                mapAdd(place);
            }
            window.Places[place.id] = place;
        });
    });
}

// Create a new place and assign it to current user.
// Returns null if user not signed in yet.
function makePlace(lon, lat) {
    var username = usernameOrSignIn();
    if (!username) return null;
    var place = new Place(lon, lat);
    Places[place.id] = place;
    place.user = username;
    return place;
}

function onAddPlaceButton() {
    var target = g("target");
    var x = target.offsetLeft + target.offsetWidth / 2;
    var y = target.offsetTop + target.offsetHeight / 2;
    var loc = mapScreenToLonLat(x, y);
    showPopup(mapAdd(makePlace(loc.e, loc.n)), x, y);
}

function updatePlacePosition(pin) {
    var target = g("target");
    var x = target.offsetLeft + target.offsetWidth / 2;
    var y = target.offsetTop + target.offsetHeight / 2;
    pin.place.loc = mapScreenToLonLat(x, y);
    updatePin(pin);
}

// Shift the map.
function moveTo(e, n) {
    var target = g("target");
    var x = target.offsetLeft + target.offsetWidth / 2;
    var y = target.offsetTop + target.offsetHeight / 2;
    var centerOffsetY = y - window.innerHeight / 2;
    var centerOffsetX = x - window.innerWidth / 2;
    mapMoveTo(e, n, centerOffsetX, centerOffsetY);
}

window.onclose = function () {
    closePopup();
}

// The Place editor.
function showPopup(placePoint, x, y) {
    closePopup();
    if (!placePoint) return;
    var tt = g("popuptext");
    tt.innerHTML = placePoint.place.text;
    var pop = g("popup");

    pop.editable = window.isAdmin || !placePoint.place.user || usernameIfKnown() == placePoint.place.user;
    tt.contentEditable = pop.editable;
    g("addPicToPlaceButton").style.visibility = pop.editable || !usernameIfKnown() ? "visible" : "hidden";
    g("author").innerHTML = placePoint.place.user || "";

    if (true) {
        pop.className = "fixedPopup";
        pop.style.display = "block";
    } else {
        pop.style.display = "block";
        pop.style.top = "" + Math.min(y, window.innerHeight - pop.clientHeight) + "px";
        pop.style.left = "" + Math.min(x, window.innerWidth - pop.clientWidth) + "px";
    }
    pop.placePoint = placePoint;
    pop.hash = placePoint.place.Hash;
    g("picPrompt").style.display = !pop.editable || placePoint.place.pics.length > 0 ? "none" : "inline";
    var thumbnails = g("thumbnails");
    placePoint.place.pics.forEach(function (pic, ix) {
        thumbnails.appendChild(thumbnail(pic));
    });
    showTags(placePoint.place);
}

function thumbnail(pic) {
    var img = null;
    if (pic.isPicture) {
        img = document.createElement("img");
        pic.setImg(img);
        img.height = 80;
    } else {
        img = document.createElement("button");
        img.innerHTML = "|&gt;";
        img.className = "addButton";
        img.title = pic.caption + " " + pic.extension;
    }
    img.onclick = function (event) {
        showPic(pic);
    }
    return img;
}

function showPic(pic) {
    if (pic.isPicture) {
        g("lightbox").currentPic = pic;
        g("caption").innerHTML = pic.caption;
        pic.setImg(g("bigpic"));
        g("lightbox").style.display = "block";
    } else {
        window.open(pic.url);
    }
}

function hidePic() {
    g("lightbox").style.display = 'none';
    g("lightbox").currentPic.caption = g("caption").innerHTML;
}


function onDeletePic() {
    var pic = g("lightbox").currentPic;
    var place = g("popup").placePoint.place;
    place.pics = place.pics.filter(function (v, i, a) {
        return !(v === pic);
    });
    deletePic(pic.id);
    hidePic();
    closePopup();
}

/// Save place to server. Text, links to pics, etc.
function closePopup() {
    var pop = g("popup");
    if (pop.style.display && pop.style.display != "none") {
        if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
            let place = pop.placePoint.place;
            place.text = g("popuptext").innerHTML;
            if (pop.hash != place.Hash) {
                var stripped = place.text.replace(/<[^>]*>/g, "").replace("&nbsp;", "").trim();
                if (!stripped && place.pics.length == 0) {
                    deletePin(pop.placePoint);
                    deletePlace(place.id);
                    delete window.Places[place.id];
                } else {
                    if (!place.user) place.user = usernameOrSignIn();
                    if (place.user) {
                        updatePin(pop.placePoint); // title etc
                        sendPlace(place);
                    }
                }
            }
        }
        g("thumbnails").innerHTML = "";
        pop.style.display = "none";
        // Popup is reusable - only used by one place at a time
        pop.placePoint = null;
    }

}



function usernameIfKnown() {
    if (!window.username) {
        window.username = getCookie("username");
        g("usernamediv").innerHTML = window.username;
    }
    return window.username;
}

function usernameOrSignIn() {
    var username = usernameIfKnown();
    if (username) return window.username;
    else {
        g("signin").style.display = "block";
        return "";
    }
}

function signedin(input) {
    var n = input.value.trim();
    if (n && n.length > 3) {
        window.username = n;
        setCookie("username", n);
        g("signin").style.display = "none";
        g("usernamediv").innerHTML = n;
    } else {
        input.style.borderColor = "red";
    }
}


window.isAdmin = location.queryParameters.admin == "span";

// User clicked an Add button.
function onClickAddFiles(auxButton) {
    if (!usernameOrSignIn()) return;
    // Make the file selection button clickable and click it:
    var uploadButton = g(auxButton);
    uploadButton.style.display = "inline";
    uploadButton.click();
}

// User has selected files to upload, either to a specific Place,
// or to a place TBD from the photos' locations.
// auxButton: The file input button, to hide.
// files: From the input button.
// Place: to which to add pics, or null if TBD
function doUploadFiles(auxButton, files, place) {
    if (auxButton) auxButton.style.display = "none";

    var assignedPlaces = [];

    for (var i = 0; i < files.length; i++) {
        let localName = files[i].name;
        let extension = localName.match(/\.[^.]+$/);
        let pic = new Picture(place, extension);
        if (place) place.pics.push(pic);
        else {
            if (!window.loosePics) window.loosePics = [];
            window.loosePics.push(pic);
        }
        // Send to server:
        sendPic(pic, files[i]);
        // Read data directly so that we can display now:
        let reader = new FileReader();
        reader.pic = pic;
        reader.onload = function () {
            reader.pic.setImgData(reader.result);
            reader.pic.type = extractFileType(reader.result);
            if (reader.pic.isPicture) {
                var img = createImg(reader.pic);
                // Conjecture: EXIF calls back immediately, before continuing. 
                if (!place && !reader.pic.loc) {
                    img.width = 200;
                    g("loosePicsShow").appendChild(img);
                    img.ondragend = function (event) {
                        // Add to a place
                    }
                }
                if (place) {
                    img.height = 80;
                    g("thumbnails").appendChild(img);
                    g("picPrompt").style.display = "none";
                }
                img.onclick = function (event) {
                    showPic(this.pic);
                }
            } else {
                if (place) {
                    g("thumbnails").appendChild(thumbnail(reader.pic));
                }
            }
        };
        reader.readAsDataURL(files[i]);
    }

}

function extractFileType(data) {
    return data.match(/data:(.*);/)[1];
}

function createImg(pic) {
    let img = document.createElement("img");
    pic.setImg(img);
    img.onload = function () {
        EXIF.getData(img, function () {
            var allMetaData = EXIF.getAllTags(this);
            pic.date = allMetaData.DateTimeOriginal;
            pic.orientation = allMetaData.Orientation || 1;
            img.title = pic.date || "";
            img.style.transform = Picture.transform(pic.orientation);
            if (allMetaData.GPSLongitude && allMetaData.GPSLatitude) {
                pic.loc = {
                    e: Sexagesimal(allMetaData.GPSLongitude) * (allMetaData.GPSLongitudeRef == "W" ? -1 : 1),
                    n: Sexagesimal(allMetaData.GPSLatitude) * (allMetaData.GPSLatitudeRef == "N" ? 1 : -1)
                };
                if (!place) {
                    var assignedPlace = assignToPlace(reader.pic);
                    mapBroaden(assignedPlace.loc);
                }
            }
        });
    }
    return img;
}

// Look at all the places and find one near to this photo's location authored by this user.
// If none, offer to create a new place.
function assignToPlace(pic) {
    var assignedPlace = null;
    let shortestDistanceSquared = 1.0;
    for (var id in Places) {
        let place = Places[id];
        let d = distanceSquared(place.loc, pic.loc);
        if (d < shortestDistanceSquared) {
            if (!pic.user || pic.user == window.user) {
                assignedPlace = place;
                shortestDistanceSquared = d;
            }
        }
    }

    // Assign to an existing or new place
    if (shortestDistanceSquared > 1e-7) {
        var assignedPin = mapAdd(makePlace(pic.loc.e, pic.loc.n));
        assignedPlace = assignedPin.place;
        assignedPlace.text = "Pics " + assignedPlace.id.replace(/T.*/, "");
        assignedPlace.pics.push(pic);
        assignedPlace.tags += " ego";
        updatePin(assignedPin);
    } else {
        assignedPlace.pics.push(pic);
        assignedPlace.tags += " ego";
    }
    console.info(assignedPlace.id + " -> " + pic.id);
    sendPlace(assignedPlace);
    return assignedPlace;
}


function distanceSquared(loc1, loc2) {
    let de = loc1.e - loc2.e;
    let dn = loc1.n - loc2.n;
    // 1 deg N is approx 2 * distance of 1 deg E
    return de * de + dn * dn * 4;
}


function makeTags() {
    var s = "<div style='background-color:white;width:100%;'>";
    knownTags.forEach(function (tag) {
        s += "<div class='tooltip'>" +
            "<span class='tag' style='background-color:" + tag.color + "40' id='" + tag.id + "' onclick='clickTag(this)'> " + tag.name + " </span>" +
            "<span class='tooltiptext'>" + tag.tip + "</span></div>";
    });;
    s += "</div>";
    g("tags").innerHTML = s;
}


function clickTag(span) {
    var tagClicked = " " + span.id;
    var pop = g("popup");
    if (!pop.editable) return;
    var place = pop.placePoint.place;
    if (!place.tags || typeof (place.tags) != "string") place.tags = "";
    var ix = place.tags.indexOf(tagClicked);
    if (ix < 0) place.tags += tagClicked;
    else place.tags = place.tags.replace(tagClicked, "");
    showTags(place);
}

function showTags(place) {
    var tagSpans = document.getElementsByClassName("tag");
    for (var i = 0; i < tagSpans.length; i++) {
        var tagSpan = tagSpans[i];
        if (place.tags && place.tags.indexOf(" " + tagSpan.id) >= 0) {
            tagSpan.style.borderColor = "coral";
            tagSpan.style.borderStyle = "solid";
        }
        else {
            tagSpan.style.borderStyle = "none";
        }
    }
}

// Default colour, shape, and label of a pin:
function pinOptions(place) {
    var thisPinColor = place.text.length > 100 ? "#0000A0" : "#00000";
    if (place.tags) {
        for (var i = 0; i < knownTags.length; i++) {
            if (place.tags.indexOf(knownTags[i].id) >= 0) {
                thisPinColor = knownTags[i].color;
            }
        }
    }
    return {
        title: place.Title,
        //text: postcodeLetter,
        //subTitle: place.subtitle, 
        color: thisPinColor,
        enableHoverStyle: true
    };
}

function toggleMap() {
    if (mapsToggleType()=="aerial") {
        // switch to aerial
        g("mapbutton").src = "img/map-icon.png";
    }
    else {
        // switch to OS
        g("mapbutton").src = "img/aerial-icon.png";
    }
}

function flashMessage(msg) {
    var msgDiv = g("topMessage");
    msgDiv.innerHTML = msg;
    msgDiv.style.visibility = "visible";
    setTimeout(function () {
        msgDiv.style.visibility = "hidden";
    }, 2000);
}

var petalRadius = 100;
function setPetals() {
    var petals = g("petals");
    if (!petals) return;
    // Top left of hexagon shapes.
    // With a horizontal middle row:
    var posh = [{ x: 0, y: -2.79 }, { x: 1, y: -1 }, { x: 0, y: 0.79 },
    { x: -2, y: 0.79 }, { x: -3, y: -1 }, { x: -2, y: -2.79 }];
    // With a vertical middle row:
    var posv = [{ x: -1, y: -3 }, { x: 2.79, y: -2 }, { x: 2.79, y: 0 },
    { x: -1, y: 1 }, { x: -2.79, y: 0 }, { x: -2.79, y: -2 }];
    for (var i = 5; i >= 0; i--) {
        let petal = document.createElement("img");
        petal.className = "petal";
        petal.style.top = (posh[i].x + 2.79) * petalRadius + "px";
        petal.style.left = (posh[i].y + 3) * petalRadius + "px";
        petals.appendChild(petal);
        stopPetalHide(petal);
    }
    var middle = g("petaltext");
    middle.style.top = 1.79 * petalRadius + "px";
    middle.style.left = 2 * petalRadius + "px";
    stopPetalHide(middle);
    g("lightbox").onmouseenter = function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
        }
    }
    g("petaltext").oncontextmenu = function (e) {
        e.cancelBubble = true;
        e.preventDefault();
        var menu = g("menu");
        menu.innerHTML = "Move to target";
        menu.onmouseout = () => {
            menu.style.display = "none";
        }
        menu.style.top = e.pageY + "px";
        menu.style.left = e.pageX + "px";
        menu.style.display = "block";
        menu.onclick = function (ee) {
            hidePetals();
            menu.style.display = "none";
            var pin = g("petaltext").pin;
            updatePlacePosition(pin);
            sendPlace(pin.place); g("bigpic")
        }
    }
}

function stopPetalHide(petal) {
    petal.addEventListener("mouseenter", function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
        }
    });
    petal.addEventListener("mouseleave", function (e) {
        window.petalHideTimeout = setTimeout(() => {
            hidePetals();
        }, 500);
    }
    );
    petal.addEventListener("click", function (e) {

        if (this.pic) showPic(this.pic);
        else {
            hidePetals();
            showPopup(petal.pin, e.pageX, e.pageY);
        }
    });
}

function hidePetals(e) {
    g("petals").style.display = "none";
    g("audiodiv").style.display="none";
    if (g("audiocontrol")) g("audiocontrol").pause();
}

function popPetals(e) {
    var pin = e.primitive || this;
    var petals = g("petals");
    petals.style.left = (e.pageX - petalRadius * 3) + "px";
    petals.style.top = (e.pageY - 2.79 * petalRadius) + "px";
    var middle = g("petaltext");
    middle.innerHTML = pin.place.Short;
    middle.pin = pin;
    var images = petals.children;
    var pics = pin.place.pics;
    for (var i = 0, p = 0; i < images.length; i++) {
        images[i].pin = pin;
        if (images[i].className != "petal") continue;
        if (p < pics.length) {
            let pic = pics[p++];
            if (pic.isPicture) {
                pic.setImg(images[i]);
            } else if (pic.isAudio) {
                images[i].src = "img/sounds.png";
                images[i].pic = pic;
                images[i].style.transform ="rotate(0)";
                images[i].title = "sounds";

                g("audiodiv").innerHTML = "<audio id='audiocontrol' controls='controls' autoplay='autoplay' src='{0}' type='audio/mpeg'></audio>".format(pic.url);
                g("audiodiv").style.display = "block";
            } else {
                images[i].src = "img/file.png";
                images[i].pic = pic;
                images[i].style.transform ="rotate(0)";
                images[i].title = "file";
            }
            images[i].style.visibility = "visible";
        } else {
            images[i].src = "";
            images[i].pic = null;
            images[i].style.visibility = "hidden";
        }
    }
    petals.style.display = "block";
}


