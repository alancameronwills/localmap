const PicPrompt = "What's in this?";
const PlacePrompt = "What's here?"
const PetalRadius = 100.0;


if (location.protocol == "http:" && location.toString().indexOf("azure") > 0) {
    location.replace(("" + location).replace("http:", "https:"));
}


window.Places = {};
var RecentUploads = {};

/** While photos, pics etc are being uploaded, retain the dataUrl. 
 * @param mediaId Bare id (no url prefix) with file extension
 * @param data Data read from file locally, as data URL
 */
function cacheLocalMedia(mediaId, data) {
    RecentUploads[mediaId] = data;
}
function mediaSource(mediaId) {
    return RecentUploads[mediaId] ? RecentUploads[mediaId] : PicUrl(mediaId);
}

Picture.prototype.setImg = function (img) {
    img.src = mediaSource(this.id);
    img.pic = this;
    img.title = (this.date || "") + " " + this.caption.replace(/<.*>/, "").replace(/&.*?;/, " ");
    img.style.transform = this.transform;
}



function init() {
    isSendQueueEmptyObservable.AddHandler(() => {
        g("picLaundryFlag").style.visibility = isSendQueueEmptyObservable.Value ? "hidden" : "visible";
    });
    isMapTypeOsObservable.AddHandler(() => {
        g("mapbutton").src = isMapTypeOsObservable.Value ? "img/aerial-icon.png" : "img/map-icon.png";
    });
    makeTags();
    // Get API keys, and then initialize the map:
    getKeys(function (data) {
        initMap();
    });
    setPetals(); // Set up shape 
    checkSignin(un => {
        if (un && un != "test") {
            permitDropSplash();
        }
    });
    setTimeout(() => { permitDropSplash(); }, 2000);

    // Arrow keys change picture in lightbox:
    window.addEventListener("keydown", doLightBoxKeyStroke);
    // But allow use of arrow keys in picture caption:
    g("caption").addEventListener("keydown", event => { stopPropagation(event); });
}


// Initial load of all saved places into the map
function loadPlaces() {
    window.Places = {};
    getPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            window.Places[place.id] = place;
            mapAdd(place);
        });
        g("continueButton").style.display = "block";
        g("loadingFlag").style.display = "none";
        permitDropSplash();
        setTracking();
    });
}

function dropSplash() {
    g("splash").style.display = "none";
    let placeKey = window.location.queryParameters.place;
    if (placeKey) {
        let pin = placeToPin[placeKey];
        if (pin) {
            showPopup(pin, 0, 0);
        }
    }
}

var permitCount = 3;
function permitDropSplash() {
    if (--permitCount <= 0) {
        dropSplash();
    }
}


function showLink(place) {
    var url = window.location.origin + window.location.pathname + "?place=" + place.id;
    $("#message").html("To show someone else this place, copy and send them this link:<br/>"
        + "<input id='msgbox' type='text' value='{0}' size={1} readonly></input>".format(url, url.length + 2));
    $("#message").show();
    $("#msgbox")[0].setSelectionRange(0, url.length);
    $("#msgbox")[0].focus();
    appInsights.trackEvent("showLink ");
}

function showHelp() {
    g('splash').style.display = 'block';
    g("continueButton").style.display = "block";
    g("loadingFlag").style.display = "none";
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

    pop.editable = placePoint.place.IsEditable;
    tt.contentEditable = pop.editable;
    g("toolBar1").style.display = pop.editable ? "block" : "none";
    g("addPicToPlaceButton").style.visibility = pop.editable ? "visible" : "hidden";
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
        img.id = pic.id;
        img.height = 80;
        img.className = "thumbnail";
    } else {
        img = document.createElement("button");
        img.innerHTML = "|&gt;";
        img.className = "addButton";
        img.title = pic.caption + " " + pic.extension;
        img.pic = pic;
    }
    img.pin = pin;
    img.onclick = function (event) {
        showPic(pic, pin);
    }

    // Reorder pictures: this is source image:
    img.ondragstart = function (event) {
        if (!this.pin.place.IsEditable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("Text", this.pic.id);
        event.target.style.opacity = "0.4";
        return true;
    }

    // Reorder pictures: this is target image:
    img.ondrop = function (event) {
        if (!this.pin.place.IsEditable) return;
        // Retrieve target image id:
        var src = g(event.dataTransfer.getData("Text"));
        // Make sure it's another pic, not some other item:
        if (src && src.pic) {
            // Rearrange pics in model:
            var pics = this.pin.place.pics;
            var fromIx = pics.indexOf(src.pic);
            var toIx = pics.indexOf(this.pic);
            if (fromIx == toIx) return;
            // assert(toIx >= 0 && fromIx >= 0);
            // Remove pic from old position:
            pics.splice(fromIx, 1);
            // List is now shorter:
            if (toIx > fromIx) toIx -= 1;
            // Insert in new position:
            pics.splice(toIx, 0, src.pic);

            // Rearrange pics in display:
            this.parentElement.insertBefore(src, this);
        }
    }

    // Reorder pictures: end of dragging whether dropped or not:
    img.ondragend = function (event) {
        this.style.opacity = "1.0";
    }

    img.ondragenter = function (event) {
        event.preventDefault();
        return true;
    }
    img.ondragover = function (event) {
        event.preventDefault();
        return false;
    }

    // Right-click:
    img.oncontextmenu = function (event) {
        event.cancelBubble = true;
        event.preventDefault();
        if (this.pin.place.IsEditable) {
            showMenu("petalMenu", this.pic, this.pin, event);
        }
    }
    return img;
}

/**
 * Show media in the lightbox
 * @param {Picture} pic The media to show
 * @param {Pin} pin Map pin. 
 * @pre pin.place.pics.indexOf(pic) >= 0
 */
function showPic(pic, pin) {
    if (pic.isPicture) {
        g("lightbox").currentPic = pic;
        g("lightbox").currentPin = pin;
        g("caption").innerHTML = pic.caption;
        g("caption").contentEditable = pin.place.IsEditable;
        //g("deletePicButton").style.visibility = pin.place.IsEditable ? "visible" : "hidden";
        pic.setImg(g("bigpic"));
        g("lightbox").style.display = "block";
        window.lightboxShowing = true;

        if (pic.sound) {
            g("audiodiv").style.display = "block";
            let audio = g("audiocontrol");
            audio.src = mediaSource(pic.sound);
            audio.load();
            audio.onended = function () {
                doLightBoxNext(1, null);
            }
        }

        var link = pic.caption.match(/http[^'"]+/);
        if (link) {
            if (link[0].indexOf("youtu.be") > 0) {
                ytid = link[0].match(/\/[^/]+$/)[0];
                g("youtubePlayer").src = "https://www.youtube.com/embed{0}?rel=0&modestbranding=1&autoplay=1&loop=1".format(ytid);
                g("youtube").style.display = "block";
            }
            else {
                window.open(link);
            }
        }
    } else {
        window.open(mediaSource(pic.id));
    }
}

/**
 * Stop showing a picture in the lightbox and playing associated sound.
 * @param {boolean} keepBackground Don't fade, we're going to show another
 */
function hidePic(keepBackground = false) {
    g("audiocontrol").pause();
    g("audiodiv").style.display = "none";
    var box = g("lightbox");
    if (!keepBackground) { box.style.display = 'none'; window.lightboxShowing = false; }
    if (box.currentPic && box.currentPin.place.IsEditable) { box.currentPic.caption = g("caption").innerHTML; }
}

/** User has clicked left or right on lightbox
 * @param {int} inc +1 or -1 == next or previous
 */
function doLightBoxNext(inc, event) {
    var box = g("lightbox");
    var pics = box.currentPin.place.pics;
    var nextPic = pics[(pics.indexOf(box.currentPic) + inc + pics.length) % pics.length];
    hidePic(true);
    showPic(nextPic, box.currentPin);
    if (event) return stopPropagation(event);
}

/**
 * Key pressed while showing lightbox.
 * @param {key event} event 
 */
function doLightBoxKeyStroke(event) {
    if (window.lightboxShowing) {
        switch (event.keyCode) {
            case 37: doLightBoxNext(-1, event);
                break;
            case 39: doLightBoxNext(1, event);
                break;
            case 13: case 27: hidePic(false);
                break;
            default: return false;
        }
        return stopPropagation(event);
    } else {
        if (event.keyCode == 27) {
            closePopup();
            return stopPropagation(event);
        }
    }
    return false;
}

function stopPropagation(event) {
    event.cancelBubble = true;
    if (event.stopPropagation) event.stopPropagation();
    return true;
}

/**
 * User context menu command 
 * @param {*} pin 
 * @param {*} context 
 */
function deletePlaceCmd(pin, context) {
    var place = pin.place;
    var stripped = place.Stripped;
    if ((!stripped || stripped.length < 40) && place.pics.length == 0) {
        deletePlace(pin);
        closePopup();
        hidePetals();
    } else {
        flashMessage("To delete a place, delete its pictures and text");
    }
}

/**
 * Delete a pin from the map, and its place from the DB.
 * @param {*} pin 
 */
function deletePlace(pin) {
    dbDeletePlace(pin.place.id, function () {
        deletePin(pin);
        delete window.Places[pin.place.id];
    });
}


/** Close place editing dialog and save changes to server. Text, links to pics, etc.
 * No-op if editing dialog is not open.
*/
function closePopup() {
    // Get the editing dialog:
    var pop = g("popup");
    // Is it actually showing?
    if (pop.style.display && pop.style.display != "none") {
        // Just in case:
        g("titleDialog").style.display = "none";
        // Is this user allowed to edit this place? And some sanity checks.
        if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
            let pin = pop.placePoint;
            let place = pin.place;
            place.text = g("popuptext").innerHTML;
            if (pop.hash != place.Hash) {
                var stripped = place.Stripped;
                if (!stripped && place.pics.length == 0) {
                    // User has deleted content.
                    deletePlace(pin);
                } else {
                    // User has updated content.
                    if (!place.user) place.user = usernameOrSignIn();
                    if (place.user) {
                        updatePin(pop.placePoint); // title etc
                        sendPlace(place);
                    }
                }
            } else {
                // User made no changes.
                if (place.isNew) {
                    // User created a place but then closed it.
                    //deletePlace(pin);
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
function showFileSelectDialog(auxButton) {
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
            cacheLocalMedia(reader.pic.id, reader.result);
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
                            stopPropagation(event);
                            event.preventDefault();
                            moveTo(img.pic.loc.e, img.pic.loc.n);
                        }
                    }
                    img.ondragstart = function (event) {
                        // This is picked up by dragOverMap as cursor moves:
                        event.dataTransfer.effectAllowed = "move";
                        //event.dataTransfer.setDragImage(img,  0, 0);
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

function flashMessage(msg) {
    var msgDiv = g("topMessage");
    msgDiv.innerHTML = msg;
    msgDiv.style.visibility = "visible";
    setTimeout(function () {
        msgDiv.style.visibility = "hidden";
    }, 2000);
}

/** Open a menu. The menu is a div in index.html. Each item is a contained div with onclick='onmenuclick(this, cmdFn)'.
 * @param {div} id      id of the div
 * @param {*} item      First parameter passed on to cmdFn
 * @param {*} context   Second parameter passed on to cmdFn
 * @param {*} event     Right-click event that triggered the menu.
 */
function showMenu(id, item, context, event) {
    let menu = g(id);
    menu.item = item;
    menu.context = context;
    menu.style.top = event.pageY + "px";
    menu.style.left = event.pageX + "px";
    menu.style.display = "block";
}

/**
 * User clicks a menu item after showMenu().
 * @param {*} menudiv 
 * @param {*} fn 
 */
function onmenuclick(menudiv, fn) {
    var menuRoot = menudiv.parentElement;
    fn(menuRoot.item, menuRoot.context);
    menuRoot.style.display = "none";
}

function movePlaceCmd(pin, context) {
    hidePetals();
    updatePlacePosition(pin);
    sendPlace(pin.place);
}

function onDeletePic(lightbox) {
    deletePicCmd(lightbox.currentPic, lightbox.currentPin);
}

/**
 * User chose delete pic from menu
 * @param {*} pic 
 * @param {*} pin 
 */
function deletePicCmd(pic, pin) {
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

/**
 * User chose re-title pic from menu.
 * @param {*} pic 
 * @param {*} pin 
 */
function titlePicCmd(pic, pin) {
    showTitleDialog(pic, pin);
}


/**
 * Allow user to edit caption of a pic or other file.
 * @param {*} pic Picture
 * @param {*} pin Map pin
 */
function showTitleDialog(pic, pin) {
    if (!pin.place.IsEditable) return;
    let inputBox = g("titleInput");
    inputBox.value = pic.caption;
    inputBox.onclick = e => stopPropagation(e);
    let dialog = g("titleDialog");
    dialog.pic = pic;
    dialog.pin = pin;
    dialog.style.display = "block";
}

/** User has selected Attach Sound menu item on a picture
 * @param pic Picture
 * @param pin Pin
 */
function attachSoundCmd(pic, pin) {
    if (!pic.isPicture) return;
    // You can attach a sound to an unassigned picture (pin==null)
    if (pin && !pin.place.IsEditable) return;
    let inputField = g("attachSoundInput")
    inputField.pic = pic;
    inputField.pin = pin;
    showFileSelectDialog('attachSoundInput');
}

/** Upload a sound file and attach it to a pic
 * @param inputField HTML input element type=file with pic and pin attached
 */
function doAttachSound(inputField) {
    let soundFile = inputField.files[0];
    if (!soundFile) return;
    let extension = soundFile.name.match(/\.[^.]+$/)[0].toLowerCase();
    if (".mp3.m4a.wav.avv.ogg".indexOf(extension) < 0) { alert("Need an mp3, m4a, wav, avv, or ogg file"); return; }
    let id = inputField.pic.id + extension;
    inputField.pic.sound = id;
    let reader = new FileReader();
    reader.fileInfo = { file: soundFile, id: id, isPicture: false };
    reader.place = inputField.pin.place;
    reader.onload = function () {
        cacheLocalMedia(this.fileInfo.id, this.result);
        sendFile(this.fileInfo);
        sendPlace(reader.place);
    }
    reader.readAsDataURL(soundFile);
}

/**
 * User has edited caption
 * @param {*} t 
 */
function onTitleDialog(t) {
    let dialog = g("titleDialog");
    dialog.pic.caption = t;
    dialog.style.display = 'none';
    hidePetals();
    sendPlace(dialog.pin.place);
}

function movePicCmd(pic, context) {

}

/** Set up the hexagon of "petals" for displaying pictures on hover.
 *  Called once on init.
 */
function setPetals() {
    var petalSize = PetalRadius * 2 + "px";
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
    for (var i = 5; i >= 0; i--) {
        let petal = document.createElement("img");
        petal.className = "petal";
        petal.style.top = (posh[i].x + 2.79) * PetalRadius + "px";
        petal.style.left = (posh[i].y + 3) * PetalRadius + "px";
        petal.style.width = petalSize;
        petal.style.height = petalSize;
        // Keep the central disc on top:
        if (child1) petals.insertBefore(petal, child1);
        else petals.appendChild(petal);
        petalBehavior(petal);
    }

    let middle = g("petaltext");
    middle.style.top = 1.79 * PetalRadius + "px";
    middle.style.left = 2 * PetalRadius + "px";
    middle.style.height = petalSize;
    middle.style.width = petalSize;
    petalBehavior(middle);

    // Don't lose petals on expanding a picture:
    g("lightbox").onmouseenter = function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
        }
    }

    // Allow user to operate audio controls without losing petals:
    g("audiodiv").addEventListener("mouseenter", function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
        }
    });

}


/**
 * Show the petals, filled with text and pictures.
 * @param {*} e   Hover event that triggered.
 */
function popPetals(e) {
    var pin = e.primitive || this;
    var petals = g("petals");
    petals.style.left = (e.pageX - PetalRadius * 3) + "px";
    petals.style.top = (e.pageY - 2.79 * PetalRadius) + "px";
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
                petal.title = pic.caption;

                g("audiodiv").style.display = "block";
                let audio = g("audiocontrol");
                audio.src = mediaSource(pic.id);
                audio.load();
                // autoplay specified in html, so will play when sufficient is loaded,
                // unless user has never clicked in the page.
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


/** Keep petals showing while mouse moves between them.
 * @param {*} petal 
 */
function petalPreserve(petal) {
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
}

// Behavior defns for all children of petals,  incl menu
function petalBehavior(petal) {
    petalPreserve(petal);
    petal.onclick = function (e) {
        if (this.pic) {
            if (this.pic.isAudio) {
                g("audiocontrol").play();
            } else {
                showPic(this.pic, this.pin);
            }
        }
        else if (this.pin) {
            hidePetals();
            showPopup(this.pin, e.pageX, e.pageY);
        }
    };
    petal.oncontextmenu = function (e) {
        stopPropagation(e);
        e.preventDefault();
        if (!this.pin.place.IsEditable) return;
        this.showingMenu = true;
        if (this.pic) {
            showMenu("petalMenu", this.pic, this.pin, e);
        } else if (this.pin) {
            showMenu("petalTextMenu", this.pin, null, e);
        }
    }
}


/** Hide petals on moving cursor out.
 * Called 500ms after cursor moves out of a petal.
 * Timeout is cancelled by moving into another petal.
 */
function hidePetals(e) {
    g("petals").style.display = "none";
    g("audiodiv").style.display = "none";
    if (g("audiocontrol")) g("audiocontrol").pause();
}

//------------------------
// Help
//------------------------
var helping = false;
function dohelp() {
    helping = true;
    g("splash").style.display = "none";
    showBaseHelp();
}

function showBaseHelp() {
    var svg = g("svg");
    g("basehelp").style.display = "block";
    helpLines();
}
function closeBaseHelp() {
    g('basehelp').style.display = 'none';
    var svg = g("svg");
    var f;
    while (f = svg.firstChild) {
        svg.removeChild(f);
    }
}

function helpLines() {
    const box = g("basehelp");
    const boxTop = box.offsetTop;
    const boxLeft = box.offsetLeft;
    const boxRight = boxLeft + box.offsetWidth;

    const target = g("target");
    const targetBottom = target.offsetTop + target.offsetHeight;
    const targetMid = target.offsetLeft + target.offsetWidth / 2;
    const targetHelpTop = g("helpRefTarget").offsetTop + boxTop;
    drawLine(targetMid, targetBottom, targetMid, targetHelpTop);

    const trackingHelpMid = g("helpRefTracking").offsetTop + g("helpRefTracking").offsetHeight / 2 + boxTop;
    const trackingButton = g("pauseButton");
    const trackingBottom = trackingButton.offsetTop + trackingButton.offsetHeight;
    const trackingBottomMid = trackingButton.offsetLeft + trackingButton.offsetWidth / 2;
    drawLine(trackingBottomMid, trackingBottom, trackingBottomMid, trackingBottom + 10);
    drawLine(trackingBottomMid, trackingBottom + 10, boxLeft - 10, trackingBottom + 10);
    drawLine(boxLeft - 10, trackingBottom + 10, boxLeft - 10, trackingHelpMid);
    drawLine(boxLeft - 10, trackingHelpMid, boxLeft + 10, trackingHelpMid);

    const addHelpMid = g("helpRefAdd").offsetTop + g("helpRefAdd").offsetHeight / 2 + boxTop;
    const addButton = g("addPlaceButton");
    const addButtonBottom = addButton.offsetTop + addButton.offsetHeight;
    const addButtonMid = addButton.offsetLeft + addButton.offsetWidth / 2;
    drawLine(addButtonMid, addButtonBottom, addButtonMid, addHelpMid);
    drawLine(boxRight - 10, addHelpMid, addButtonMid, addHelpMid);

    const addFileButton = g("addFileButton");
    const addFileButtonTop = addFileButton.offsetTop;
    const addFileButtonMid = addFileButton.offsetLeft + addFileButton.offsetWidth / 2;
    const addFileHelpMid = g("helpRefAddPics").offsetTop + g("helpRefAddPics").offsetHeight / 2 + boxTop;
    drawLine(addFileButtonMid, addFileButtonTop, addFileButtonMid, addFileHelpMid);
    drawLine(addFileButtonMid, addFileHelpMid, boxRight - 10, addFileHelpMid);
}
function drawLine(x1, y1, x2, y2) {
    var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLine.setAttribute('x1', x1);
    newLine.setAttribute('y1', y1);
    newLine.setAttribute('x2', x2);
    newLine.setAttribute('y2', y2);
    newLine.style.stroke = "rgb(0,255,255)";
    newLine.style.strokeWidth = "6";
    g("svg").append(newLine);
}
