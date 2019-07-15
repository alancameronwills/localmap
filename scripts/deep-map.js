const PicPrompt = "What's in this pic?";
const PlacePrompt = "What's here?"


if (location.protocol == "http:" && location.toString().indexOf("azure") > 0) {
    location.replace(("" + location).replace("http:", "https:"));
}


window.Places = {};
var RecentUploads = {};


Picture.prototype.imgSrc = function () {
    return RecentUploads[this.id] ? RecentUploads[this.id] : PicUrl(this.id);
}
Picture.prototype.setImgData = function (data) {
    RecentUploads[this.id] = data;
}
Picture.prototype.setImg = function (img) {
    img.src = this.imgSrc();
    img.pic = this;
    img.title = (this.date || "") + " " + this.caption;
    img.style.transform = this.transform;
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
            window.Places[place.id] = place;
            mapAdd(place);
        });
        g("splash").style.display = "none";
        setTracking();
    });
}

function updatePlaces() {
    getPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            if (window.Places[place.id]) {
                mapReplace(window.Places[place.id], place);
            } else {
                mapAdd(place);
            }
            window.Places[place.id] = place;
        });
    }, true);
}

// Create a new place and assign it to current user.
// Returns null if user not signed in yet.
function makePlace(lon, lat) {
    var username = usernameOrSignIn();
    if (!username) return null;
    var place = new Place("Garn Fawr", lon, lat);
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
        thumbnails.appendChild(thumbnail(pic, placePoint));
    });
    showTags(placePoint.place);
}

function thumbnail(pic, pin) {
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
    img.pin = pin;
    img.onclick = function (event) {
        showPic(pic, pin);
    }
    img.oncontextmenu = function (event) {
        event.cancelBubble = true;
        event.preventDefault();
        showMenu("petalMenu", this.pic, this.pin, event);
    }
    return img;
}

function showPic(pic, pin) {
    if (pic.isPicture) {
        g("lightbox").currentPic = pic;
        g("lightbox").currentPin = pin;
        g("caption").innerHTML = pic.caption;
        pic.setImg(g("bigpic"));
        g("lightbox").style.display = "block";
    } else {
        window.open(pic.url);
    }
}

function hidePic() {
    g("lightbox").style.display = 'none';
    var currentPic = g("lightbox").currentPic;
    if (currentPic) currentPic.caption = g("caption").innerHTML;
}



/// Save place to server. Text, links to pics, etc.
function closePopup() {
    var pop = g("popup");
    if (pop.style.display && pop.style.display != "none") {
        if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
            let pin = pop.placePoint;
            let place = pin.place;
            place.text = g("popuptext").innerHTML;
            if (pop.hash != place.Hash) {
                var stripped = place.text.replace(/<[^>]*>/g, "").replace("&nbsp;", "").trim();
                if (!stripped && place.pics.length == 0) {
                    deletePlace(place.id, function () {
                        deletePin(pin);
                        delete window.Places[place.id];
                    });
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
function doUploadFiles(auxButton, files, pin) {
    if (auxButton) auxButton.style.display = "none";

    var assignedPlaces = [];

    for (var i = 0; i < files.length; i++) {
        let localName = files[i].name;
        let extension = localName.match(/\.[^.]+$/);
        let pic = new Picture(pin ? pin.place : null, extension);
        if (pin) pin.place.pics.push(pic);
        pic.file = files[i];
        // Read data directly so that we can display now:
        let reader = new FileReader();
        reader.pic = pic;
        reader.onload = function () {
            reader.pic.setImgData(reader.result);
            reader.pic.type = extractFileType(reader.result);
            if (!reader.pic.isPicture) {
                // This is a sound file, pdf, or other document.
                // Can only upload to an open place:
                if (pin) {
                    g("thumbnails").appendChild(thumbnail(reader.pic, pin));
                }
                sendFile(reader.pic);
            } else {
                // This is a photo.
                var img = createImg(reader.pic, sendImage);
                img.className = "selectable";
                if (pin) {
                    // Adding a photo to a place.
                    img.height = 80;
                    g("thumbnails").appendChild(img);
                    g("picPrompt").style.display = "none";
                    img.onclick = function (event) {
                        showPic(this.pic, pin);
                    }
                    img.oncontextmenu = function (event) {

                    }
                } else {
                    // Uploading a photo before assigning it to a place.
                    // Show pic in sidebar and make it draggable onto the map:
                    img.width = 200;
                    img.title = "Drag this picture to place it on the map";
                    // Replaces title if/when the geolocation of the photo is discovered:
                    img.gpstitle = "Right-click to see recorded location. Then drag to place on map.";
                    g("loosePicsShow").appendChild(img);
                    img.onclick = function (event) {
                        showPic(img.pic, null);
                    }
                    img.oncontextmenu = function (event) {
                        // Shift the map to the photo's GPS location:
                        if (img.pic.loc) {
                            e.cancelBubble=true;
                            e.preventDefault();
                            moveTo(img.pic.loc.e, img.pic.loc.n);
                        }
                    }
                    img.ondragstart = function (event) {
                        // This is picked up by dragOverMap as cursor moves:
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setDragImage(img,  0, 0);
                    }
                    img.ondragend = function (event) {
                        // dropEffect is set by dragOverMap() as the cursor moves:
                        if (event.dataTransfer.dropEffect != "move") return;
                        // Add to a new or existing place a this location:
                        img.pic.loc = mapScreenToLonLat(event.pageX, event.pageY);
                        assignToPlace(img.pic);
                        // Remove from sidebar:
                        g("loosePicsShow").removeChild(img);
                    }
                }
            }
        };
        reader.readAsDataURL(files[i]);
    }

}

// Used when dragging a picture to a place
function dragOverMap(event) {
    if (event.dataTransfer.effectAllowed == "move") {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }
}

function extractFileType(data) {
    return data.match(/data:(.*);/)[1];
}

// Create an img element for a pic and extract metadata
function createImg(pic, onload) {
    let img = document.createElement("img");
    pic.setImg(img);
    img.onload = function () {
        EXIF.getData(img, function () {
            var allMetaData = EXIF.getAllTags(this);
            pic.date = allMetaData.DateTimeOriginal;
            pic.orientation = allMetaData.Orientation || 1;
            pic.caption = pic.date || "What's this?";
            img.title = img.title || pic.date || "";
            img.style.transform = pic.transform;
            if (allMetaData.GPSLongitude && allMetaData.GPSLatitude) {
                if (img.gpstitle) img.title = img.gpstitle;
                pic.loc = {
                    e: Sexagesimal(allMetaData.GPSLongitude) * (allMetaData.GPSLongitudeRef == "W" ? -1 : 1),
                    n: Sexagesimal(allMetaData.GPSLatitude) * (allMetaData.GPSLatitudeRef == "N" ? 1 : -1)
                };
            }
        });
        if (onload) onload(pic, img);
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
            "<span class='tag' style='background-color:" + tag.color + "' id='" + tag.id + "' onclick='clickTag(this)'> " + tag.name + " </span>" +
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
    if (mapsToggleType() == "aerial") {
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
    var child1 = petals.firstElementChild;
    petalBehavior(child1);
    for (var i = 5; i >= 0; i--) {
        let petal = document.createElement("img");
        petal.className = "petal";
        petal.style.top = (posh[i].x + 2.79) * petalRadius + "px";
        petal.style.left = (posh[i].y + 3) * petalRadius + "px";
        // Keep the context menu on top:
        if (child1) petals.insertBefore(petal, child1);
        else petals.appendChild(petal);
        petalBehavior(petal);
    }

    var middle = g("petaltext");
    middle.style.top = 1.79 * petalRadius + "px";
    middle.style.left = 2 * petalRadius + "px";
    petalBehavior(middle);

    g("lightbox").onmouseenter = function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
        }
    }
}


function onmenuclick(menudiv, fn) {
    var menuRoot = menudiv.parentElement;
    fn(menuRoot.item, menuRoot.context);
    menuRoot.style.display = "none";
}

function movePlace(pin, context) {
    hidePetals();
    updatePlacePosition(pin);
    sendPlace(pin.place);
}

function onDeletePic(lightbox) {
    deletePic(lightbox.currentPic, lightbox.currentPin);
}

function deletePic(pic, pin) {
    var place = pin.place;
    place.pics = place.pics.filter(function (v, i, a) {
        return !(v === pic);
    });
    dbDeletePic(pic.id);
    hidePic();
    hidePetals();
    closePopup();
    sendPlace(place);
}

function movePic(pic, context) {

}

// Behavior defns for all children of petals,  incl menu
function petalBehavior(petal) {
    petal.onmouseout = function (e) {
        if (petal.pin || petal.pic) {
            if (petal.showingMenu) petal.showingMenu = false;
            else {
                window.petalHideTimeout = setTimeout(() => {
                    hidePetals();
                }, 500);
            }
        }
    };
    petal.onmouseenter = function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
        }
    };
    petal.onclick = function (e) {
        if (this.pic)
            showPic(this.pic, this.pin);
        else if (this.pin) {
            hidePetals();
            showPopup(this.pin, e.pageX, e.pageY);
        }
    };
    petal.oncontextmenu = function (e) {
        e.cancelBubble = true;
        e.preventDefault();
        this.showingMenu = true;
        if (this.pic) {
            showMenu("petalMenu", this.pic, this.pin, e);
        } else if (this.pin) {
            showMenu("petalTextMenu", this.pin, null, e);
        }
    }
}

function showMenu(id, item, context, event) {
    let menu = g(id);
    menu.item = item;
    menu.context = context;
    menu.style.top = event.pageY + "px";
    menu.style.left = event.pageX + "px";
    menu.style.display = "block";
}



function hidePetals(e) {
    g("petals").style.display = "none";
    g("audiodiv").style.display = "none";
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
        let petal = images[i];
        petal.pin = pin;
        if (petal.className != "petal") continue;
        if (p < pics.length) {
            let pic = pics[p++];
            if (pic.isPicture) {
                pic.setImg(images[i]);
            } else if (pic.isAudio) {
                petal.src = "img/sounds.png";
                petal.pic = pic;
                petal.style.transform = "rotate(0)";
                petal.title = "sounds";

                g("audiodiv").innerHTML = "<audio id='audiocontrol' controls='controls' autoplay='autoplay' src='{0}' type='audio/mpeg'></audio>".format(pic.url);
                g("audiodiv").style.display = "block";
            } else {
                petal.src = "img/file.png";
                petal.pic = pic;
                petal.style.transform = "rotate(0)";
                petal.title = "file";
            }
            images[i].style.visibility = "visible";
        } else {
            petal.src = "";
            petal.pic = null;
            petal.style.visibility = "hidden";
        }
    }
    petals.style.display = "block";
}


