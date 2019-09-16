const PetalRadius = 100.0;


if (location.protocol == "http:" && location.toString().indexOf("azure") > 0) {
    location.replace(("" + location).replace("http:", "https:"));
}

window.onpopstate = function (e) { window.history.forward(1); }

window.Places = {};
var RecentUploads = {};


Picture.prototype.setImg = function (img, title) {
    img.src = this.isAudio ? "img/sounds.png" : mediaSource(this.id);
    img.pic = this;
    img.title = title || (this.date || "") + " " + this.caption.replace(/<.*?>/, "").replace(/&.*?;/, " ") || null;
    img.style.transform = this.transform;
}



function init() {
    window.deviceHasMouseEnter = false;
    g("topLayer").oncontextmenu = (event) => {
        event.preventDefault();
    }
    isSendQueueEmptyObservable.AddHandler(() => {
        g("picLaundryFlag").style.visibility = isSendQueueEmptyObservable.Value ? "hidden" : "visible";
    });
    isMapTypeOsObservable.AddHandler(() => {
        g("mapbutton").src = isMapTypeOsObservable.Value ? "img/aerial-icon.png" : "img/map-icon.png";
    });
    makeTags();
    setLanguage(getCookie("iaith") || "EN");
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
    g("lightboxCaption").addEventListener("keydown", event => { stopPropagation(event); });

    g("lightbox").oncontextmenu = function (e) {
        stopPropagation(e);
        e.preventDefault();
        stopPicTimer();
        if (!this.currentPin.place.IsEditable) return;
        this.showingMenu = true;
        if (this.currentPic) {
            showMenu("petalMenu", this.currentPic, this.currentPin, e);
        } else if (this.currentPin) {
            showMenu("petalTextMenu", this.currentPin, null, e);
        }
    }

}


// Initial load of all saved places into the map
function loadPlaces() {
    window.Places = {};
    getPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            window.Places[place.id] = place;
            mapAdd(place);
        });
        setTracking();
        g("splashCloseX").style.display = "block";
        g("continueButton").style.display = "block";
        g("loadingFlag").style.display = "none";
        permitDropSplash();
        if (window.location.queryParameters.place) {
            permitDropSplash();
        }
    });
}

function dropSplash() {
    g("splash").style.display = "none";
    let placeKey = window.location.queryParameters.place;
    if (placeKey) {
        goto(placeKey, null);
    }
}

function goto (placeKey, e) { 
    if (e) stopPropagation(e); 
    let pin = placeToPin[placeKey];
    if (pin) {
        moveTo(pin.place.loc.e, pin.place.loc.n, 18);
        presentSlidesOrEdit(pin, 0, 0);
    }
}

function getTitleFromId (placeKey) {
    let pin = placeToPin[decodeURI(placeKey.replace("+","%20"))];
    return pin.place.Title;
}

var permitCount = 3;
function permitDropSplash() {
    if (--permitCount == 0) {
        dropSplash();
    }
}

function contactx(event, place) {
    window.open("mailto:rowan@span-arts.org.uk?subject=map%20place&body=" + getLink(place) + " ", "_blank")
    return stopPropagation(event);
}

function getLink(place) {
    return window.location.origin + window.location.pathname + "?place=" + place.id.replace(" ", "+").replace("|", "%7C");
}

function showLink(place, event) {
    stopPropagation(event);
    var url = getLink(place);
    g("messageInner").innerHTML = s("getLinkDialog", "To show someone else this place, copy and send them this link:") + "<br/>"
        + "<input id='msgbox' type='text' value='{0}' size={1} readonly></input>".format(url, url.length + 2);
    g("message").style.display = "block";
    g("msgbox").setSelectionRange(0, url.length);
    g("msgbox").focus();
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
function moveTo(e, n, zoom) {
    var target = g("target");
    var x = target.offsetLeft + target.offsetWidth / 2;
    var y = target.offsetTop + target.offsetHeight / 2;
    var centerOffsetY = y - window.innerHeight / 2;
    var centerOffsetX = x - window.innerWidth / 2;
    mapMoveTo(e, n, centerOffsetX, centerOffsetY, zoom);
}


// The Place editor.
function showPopup(placePoint, x, y) {
    if (!closePopup()) return;
    if (!placePoint) return;
    var tt = g("popuptext");
    tt.innerHTML = placePoint.place.text;
    var pop = g("popup");

    pop.editable = placePoint.place.IsEditable;
    tt.contentEditable = pop.editable;
    g("toolBar1").style.display = pop.editable ? "block" : "none";
    g("addPicToPlaceButton").style.visibility = pop.editable ? "visible" : "hidden";
    g("editorHelpButton").style.visibility = pop.editable ? "visible" : "hidden";

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
    if (helping) {
        helping = false;
        showEditorHelp();
    }
}

function thumbnail(pic, pin) {
    var img = null;
    if (pic.isPicture) {
        img = document.createElement("img");
        pic.setImg(img);
        if (helping) {img.title = s("thumbnailHelp", "Right-click to add caption, sound, or YouTube. Drag to rearrange slideshow.")}
        img.id = pic.id;
        img.height = 80;
        img.className = "thumbnail";
    } else {
        img = document.createElement("button");
        if (pic.extension == ".pdf") {
            img.style.backgroundImage = "url(img/pdf.png)";
            img.style.backgroundSize = "contain";
            img.style.backgroundPosition = "center";
            img.style.backgroundRepeat = "no-repeat";
            img.style.backgroundColor = "rgba(0,0,0,0)";
        } else {
            img.innerHTML = "|&gt;";
        }
        img.className = "addButton";
        img.title = pic.caption + " " + pic.extension;
        img.pic = pic;
    }
    img.pin = pin;
    img.onclick = function (event) {
        showPic(pic, pin, true);
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
 * @param pic The media to show
 * @param pin Map pin. 
 * @param runShow {bool} Run slides automatically
 * @pre pin.place.pics.indexOf(pic) >= 0
 */
function showPic(pic, pin, runShow) {
    if (!pic || pic.isPicture) {
        g("lightboxEditButton").style.display = pin.place.IsEditable ? "inline-block" : "none";
        g("lightboxAuthor").innerHTML = pin.place.user || "";
        g("lightbox").currentPic = pic;
        g("lightbox").currentPin = pin;
        g("lightboxTop").innerHTML = "<h2>" + pin.place.Title + "</h2>";
        g("lightboxBottomText").innerHTML = fixInnerLinks(pin.place.text);
        g("lightboxCaption").contentEditable = !!pic && pin.place.IsEditable;
        g("lightbox").style.display = "block";
        window.lightboxShowing = true;

        if (pic) {
            g("lightboxCaption").innerHTML = pic.caption.replace(/What's .*\?/, " ");
            pic.setImg(g("lightboxImg"));
            if (pic.sound) {
                g("audiodiv").style.display = "block";
                let audio = g("audiocontrol");
                audio.src = mediaSource(pic.sound);
                audio.load();

                if (runShow) {
                    audio.onended = function () {
                        doLightBoxNext(1, null);
                    };
                }
            } else if (runShow) {
                window.showPicTimeout = setTimeout(() => doLightBoxNext(1, null), 6000);
            }


            var linkFromCaption = pic.caption.match(/http[^'"]+/); // old botch
            var link = pic.youtube || (linkFromCaption ? linkFromCaption[0] : "");
            if (link) {
                if (link.indexOf("youtu.be") > 0) {
                    ytid = link.match(/\/[^/]+$/)[0];
                    stopPicTimer();
                    g("youtubePlayer").src = "https://www.youtube.com/embed{0}?rel=0&modestbranding=1&autoplay=1&loop=1".format(ytid);
                    g("youtube").style.display = "block";
                }
                else {
                    window.open(link);
                }
            }
        } else {
            g("lightboxCaption").innerHTML = "";
            var img = g("lightboxImg")
            img.src = "";
            img.title = "";
        }
    } else {
        window.open(mediaSource(pic.id));
    }
}

function fixInnerLinks (text) {
    return text.replace(/<a [^>]*href="\.\/\?place=([^"]*)"/g, (x, p1) => {
        return "<a onclick=\"goto('" + decodeURI(p1.replace("+","%20")) + "', event)\" ";
    });
}

function expandPic(event) {
    stopPropagation(event);
    window.open(g('lightboxImg').src.toString());
}

/**
 * Pause the slideshow.
 */
function stopPicTimer() {
    if (window.showPicTimeout) {
        clearTimeout(window.showPicTimeout);
        window.showPicTimeout = null;
    }
}

/**
 * Stop showing a picture in the lightbox and playing associated sound.
 * @param {boolean} keepBackground Don't fade, we're going to show another
 */
function hidePic(keepBackground = false) {
    stopPicTimer();
    var box = g("lightbox");
    // Stop sound accompanying a picture
    if (!keepBackground || box.currentPic && box.currentPic.sound) {
        g("audiocontrol").pause();
        g("audiodiv").style.display = "none";
    }
    if (!keepBackground) { box.style.display = 'none'; window.lightboxShowing = false; }
    if (box.currentPic && box.currentPin.place.IsEditable) { box.currentPic.caption = g("lightboxCaption").innerHTML; }
}

function switchToEdit() {
    var pin = g("lightbox").currentPin;
    hidePic(false);
    showPopup(pin, 0, 0);
}

/** User has clicked left or right on lightbox, or pic timed out.
 * @param {int} inc +1 or -1 == next or previous
 * @event {eventArgs} triggered by 
 */
function doLightBoxNext(inc, event) {
    if (window.showPicTimeout) {
        clearTimeout(window.showPicTimeout);
        window.showPicTimeout = null;
    }
    var box = g("lightbox");
    var pics = box.currentPin.place.pics;
    var nextPic = null;
    var count = 0;
    var index = pics.indexOf(box.currentPic);
    do {
        if (count++ > pics.length) return; // In case of no actual pictures
        index = (index + inc + pics.length) % pics.length;
        nextPic = pics[index];
    } while (!nextPic.isPicture);
    hidePic(true);
    showPic(nextPic, box.currentPin, inc >= 0);
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
    if (event.preventDefault) event.preventDefault();
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
    if ((!stripped || stripped.length < 40) && place.pics.length <= 1) {
        deletePlace(pin);
        closePopup(true);
        hidePetals();
    } else {
        alert(s("deletePlaceDialog", "To delete a place, first delete its pictures and text"));
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

function placeShouldBeSaved() {
    let pop = g("popup");
    if (!pop || pop.style.display == "none") return false;
    if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
        let pin = pop.placePoint;
        let place = pin.place;
        place.text = g("popuptext").innerHTML;
        if (pop.hash != place.Hash) {
            return true;
        }
    }
    return false;
}

window.addEventListener("beforeunload", function (e) {
    if (placeShouldBeSaved()) {
        var confirmationMessage = s("changesUnsavedAlert", "There are unsaved changes. Close anyway?");
        e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
        return confirmationMessage;              // Gecko, WebKit, Chrome <34
    }
    return "";
});

var recentPrompt = null;

/**
 * Complain if the given item is missing. But let it pass the second time.
 * 
 * @param {*} place 
 * @param {*} item 
 * @param {*} msg 
 * @return True if complained.
 */
function promptForInfo(place, item, msg, locusId) {
    if (!item && recentPrompt != place.id) {
        recentPrompt = place.id;
        if (locusId) {
            let locus = g(locusId); if (locus) {
                locus.style.borderStyle = "solid";
                locus.style.borderColor = "red";
                locus.style.borderWidth = "3px";
                setTimeout(() => { locus.style.borderStyle = "none"; }, 3000);
            }
        }
        setTimeout(() => alert(msg), 100);
        return true;
    }
    return false;
}

/** Close place editing dialog and save changes to server. Text, links to pics, etc.
 * No-op if editing dialog is not open.
*/
function closePopup(ignoreNoTags = false) {
    hidePic();
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
            place.text = g("popuptext").innerHTML.replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "")
                .replace(/<font [^>]*>/g, "").replace(/<\/font>/g,"")
                .replace(/<([^>]*)class=\"[^>]*\"([^>]*)>/, (s, p1, p2) => "<"+p1 + p2 + ">");
            // Validation:
            if (!ignoreNoTags && place.text.length > 10
                && promptForInfo(place, place.tags, s("tagAlert", "Please select some coloured tags"), "tags")) {
                return false;
            }
            /*
            if (!ignoreNoTags
                && promptForInfo(place, place.Title, s("titleAlert", "Please enter a title"), "popupTextTopLine")) {
                return false;
            */

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
    return true;
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
        let extensionMatch = localName.match(/\.[^.]+$/);
        let extension = extensionMatch ? extensionMatch[0] : "";
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
                    g("thumbnails").appendChild(thumbnail(reader.pic, pin));
                    g("picPrompt").style.display = "none";
                    img.onclick = function (event) {
                        showPic(this.pic, pin, true);
                    }
                    img.oncontextmenu = function (event) {

                    }
                } else {
                    // Uploading a photo before assigning it to a place.
                    // Show pic in sidebar and make it draggable onto the map:
                    img.width = 200;
                    img.title = s("picDragTip", "Drag this picture to place it on the map");
                    // Replaces title if/when the geolocation of the photo is discovered:
                    img.gpstitle = s("picRightTip", "Right-click to see recorded location. Then drag to place on map.");
                    g("loosePicsShow").appendChild(img);
                    img.onclick = function (event) {
                        showPic(img.pic, null, true);
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
            pic.caption = pic.date || "";
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
    // Top of the editor
    var s = "<div style='background-color:white;width:100%;'>";
    knownTags.forEach(function (tag) {
        s += "<div class='tooltip'>" +
            "<span class='tag' style='background-color:" + tag.color + "' id='" + tag.id + "' onclick='clickTag(this)'> " + tag.name + " </span>" +
            "<span class='tooltiptext' id='tip" + tag.id + "'>" + tag.tip + "</span></div>";
    });
    s += "</div>";
    g("tags").innerHTML = s;

    // Tags key panel
    var ss = "";
    knownTags.forEach(function (tag) {
        ss += "<div id='c{0}' onclick='tagFilter(this.id)'><div class='tagButton' style='border-color:{1}'></div><span id='k{0}'>{2}</span></div>"
            .format(tag.id, tag.color, tag.name);
    });
    g("tagsKeyPanel").innerHTML = ss + "<div id='cpob' onclick='tagFilter(\"\")'><div class='tagButton' style='border-color:black'></div><span id='kpob'>All</span></div>";
}

function tagFilter(cid) {
    if (cid) {
        let tagId = cid.substring(1);
        mapSetPinsVisible(tagId);
    } else {
        mapSetPinsVisible("");
    }
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
    var thisPinColor = place.text.length > 100 || place.pics.length > 0 ? "#0000A0" : "#00000";
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
    }, 10000);
}

/** Open a menu. The menu is a div in index.html. Each item is a contained div with onclick='onmenuclick(this, cmdFn)'.
 * @param {div} id      id of the div
 * @param {*} item      First parameter passed on to cmdFn
 * @param {*} context   Second parameter passed on to cmdFn
 * @param {*} event     Right-click event that triggered the menu.
 */
function showMenu(id, item, context, event) {
    var e = document.documentElement, b = document.getElementsByTagName('body')[0], windowHeight = window.innerHeight || e.clientHeight || b.clientHeight;
    let menu = g(id);
    menu.item = item;
    menu.context = context;
    menu.style.top = event.pageY + "px";
    menu.style.left = event.pageX + "px";
    menu.style.display = "block";
    let maxTop = windowHeight - (menu.clientHeight || 200);
    if (maxTop < event.pageY)
        menu.style.top = maxTop + "px";
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
    closePopup(true);
    sendPlace(place);
}

/**
 * User chose re-title pic from menu.
 * @param {*} pic 
 * @param {*} pin 
 */
function titlePicCmd(pic, pin) {
    showInputDialog(pic, pin, s("editTitle", "Edit the title"),
        pic.caption, (picx, pinx, t) => {
            picx.caption = t;
            hidePetals();
            sendPlace(pinx.place);
        });
}

function attachYouTube(pic, pin) {
    showInputDialog(pic, pin, s("youTubeUrl", "Provide sharing URL https://youtu.be/... from YouTube"), "", (picx, pinx, url) => {
        if (url.indexOf("https://youtu.be/") != 0) {
            alert("URL should be https://youtu.be/.... Use the YouTUbe Share button");
            return;
        }
        picx.youtube = url;
        sendPlace(pinx.place);
    });
}


/**
 * Allow user to edit caption of a pic or other file.
 * @param {*} pic Picture
 * @param {*} pin Map pin
 */
function showInputDialog(pic, pin, promptMessage, oldValue, onDone) {
    if (!pin.place.IsEditable) return;
    g("editTitlePrompt").innerHTML = promptMessage;
    let inputBox = g("titleInput");
    let dialog = g("titleDialog");
    inputBox.whenDone = (v) => { dialog.style.display = 'none'; onDone(pic, pin, v.trim()); };
    inputBox.value = oldValue;
    inputBox.onclick = e => stopPropagation(e);
    dialog.pic = pic;
    dialog.pin = pin;
    dialog.style.display = "block";
}

/** User has chosen Rotate 90 command on a picture
* @param pic
 * @param pin
 */
function rotatePicCmd(pic, pin) {
    if (!pin.place.IsEditable) return;
    pic.rot90();
    hidePic(false);
    closePopup(true);
    hidePetals();
    sendPlace(pin.place);
}

/** User has selected Attach Sound menu item on a picture
 * @param pic Picture
 * @param pin Pin
 */
function attachSoundCmd(pic, pin) {
    if (!pin.place.IsEditable) return;
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
    if (".mp3.m4a.wav.avv.ogg".indexOf(extension) < 0) { alert(s("audioFileTypeAlert", "Need a file of type:") + " mp3, m4a, wav, avv, ogg"); return; }
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



function movePicCmd(pic, context) {

}

// -----------
// Petals
// -----------

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
    petals.onclick = (e) => hidePetals(e);

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
            window.petalHideTimeout = null;
        }
    }

    // Allow user to operate audio controls without losing petals:
    g("audiodiv").addEventListener("mouseenter", function (e) {
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
            window.petalHideTimeout = null;
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
    var centralPic = pics.length == 1 && pics[0].isPicture;
    middle.style.backgroundImage = centralPic ? "url('" + mediaSource(pics[0].id) + "')" : null;
    middle.style.backgroundSize = "cover";
    for (var i = 0, p = 0; i < images.length; i++) {
        let petal = images[i];
        petal.pin = pin;
        if (petal.className != "petal") continue;
        if (p < pics.length && !centralPic) {
            let pic = pics[p++];
            if (pic.isPicture) {
                pic.setImg(images[i]);
            } else if (pic.isAudio) {
                petal.src = "img/sounds.png";
                petal.pic = pic;
                petal.style.transform = "rotate(0)";
                petal.title = pic.caption;
                playAudio(pic);
            } else {
                if (pic.extension == ".pdf") {
                    petal.src = "img/petalPdf.png";
                }
                else petal.src = "img/file.png";
                petal.pic = pic;
                petal.style.transform = "rotate(0)";
                petal.title = pic.caption + " " + pic.extension;
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
        window.deviceHasMouseEnter = true;
        if (window.petalHideTimeout) {
            clearTimeout(window.petalHideTimeout);
            window.petalHideTimeout = null;
        }
    };
}

function playAudio(pic) {
    g("audiodiv").style.display = "block";
    let audio = g("audiocontrol");
    audio.src = mediaSource(pic.id);
    audio.load();
    // autoplay specified in html, so will play when sufficient is loaded,
    // unless user has never clicked in the page.

}

// Behavior defns for all children of petals,  incl menu
function petalBehavior(petal) {
    petalPreserve(petal);
    petal.onclick = function (e) {
        stopPropagation(e);
        if (this.pic) {
            if (this.pic.isAudio) {
                g("audiocontrol").play();
            } else {
                showPic(this.pic, this.pin, true);
            }
        }
        else if (this.pin) {
            hidePetals();
            presentSlidesOrEdit(this.pin, e.pageX, e.pageY);
        }
        else hidePetals();
    };
    petal.oncontextmenu = function (e) {
        stopPropagation(e);
        if (!this.pin.place.IsEditable) return;
        this.showingMenu = true;
        if (this.pic) {
            showMenu("petalMenu", this.pic, this.pin, e);
        } else if (this.pin) {
            showMenu("petalTextMenu", this.pin, null, e);
        }
    }
}

function presentSlidesOrEdit(pin, x, y) {
    var pic = findPic(pin.place, p => p.isPicture);
    if (pic ||  pin.place.pics.length > 0 && !pin.place.IsEditable) {
        var au = findPic(pin.place, p => p.isAudio);
        if (au) {
            playAudio(au);
        }
        showPic(pic, pin, true);
    } else {
        showPopup(pin, x, y);
    }
}

/** Skip audio, PDFs, etc
 * @param place
 * @returns First pic for which pic.isPicture
 */
function findPic(place, fnBool) {
    if (!place) return null;
    for (var i = 0; i < place.pics.length; i++) {
        if (fnBool(place.pics[i])) return place.pics[i];
    }
    return null;
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

//----------------------
// Editor Help
//----------------------

function showEditorHelp() {
    g("editorHelp").style.display = "block";
    editorHelpLines();
}
function closeEditorHelp() {
    g("editorHelp").style.display = "none";
    var svg = g("editorHelpSvg");
    var f;
    while (f = svg.firstChild) {
        svg.removeChild(f);
    }
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
    var svg = g("svgBaseHelp");
    g("basehelp").style.display = "block";
    helpLines();
}
function closeBaseHelp() {
    g('basehelp').style.display = 'none';
    var svg = g("svgBaseHelp");
    var f;
    while (f = svg.firstChild) {
        svg.removeChild(f);
    }
}

function editorHelpLines() {
    const svg = g("editorHelpSvg");
    const eh1 = g("eh1"), eh2 = g("eh2"), eh3 = g("eh3");
    const textBox = g("popuptext");
    const popup = g("popup");
    const box = g("editorHelp");
    const boxTop = box.getBoundingClientRect().top;
    const boxLeft = box.getBoundingClientRect().left;
    const eh1y = ehLevel(eh1);
    const eh2y = ehLevel(eh2);
    const eh3y = ehLevel(eh3);
    drawLine(svg, boxLeft + 3, eh1y, boxLeft - 10, eh1y);
    drawLine(svg, boxLeft + 3, eh2y, boxLeft - 30, eh2y);
    drawLine(svg, boxLeft + 3, eh3y, boxLeft - 10, eh3y);

    const tagRow = g("tags").getBoundingClientRect().top + 10;
    const addButton = g("addPicToPlaceButton");
    const addButtonRect = addButton.getBoundingClientRect();
    const addButtonMid = addButtonRect.left + addButton.offsetWidth / 2;
    const addButtonTop = addButtonRect.top;

    drawLine(svg, boxLeft - 10, eh1y, boxLeft - 10, textBox.getBoundingClientRect().top + 15);
    drawLine(svg, boxLeft - 30, eh2y, boxLeft - 30, tagRow);
    drawLine(svg, boxLeft - 10, eh3y, boxLeft - 10, addButtonTop - 10);

    drawLine(svg, boxLeft - 10, addButtonTop - 10, addButtonMid, addButtonTop - 10);
    drawLine(svg, addButtonMid, addButtonTop - 10, addButtonMid, addButtonTop);

}

function ehLevel(eh) {
    return eh.getBoundingClientRect().top + eh.offsetHeight / 2;
}

function helpLines() {
    const box = g("basehelp");
    const svg = g("svgBaseHelp");
    const boxTop = box.offsetTop;
    const boxLeft = box.offsetLeft;
    const boxRight = boxLeft + box.offsetWidth;

    const target = g("target");
    const targetBottom = target.offsetTop + target.offsetHeight;
    const targetMid = target.offsetLeft + target.offsetWidth / 2;
    const targetHelpTop = g("helpRefTarget").offsetTop + boxTop;
    drawLine(svg, targetMid, targetBottom, targetMid, targetHelpTop);

    const trackingHelpMid = g("helpRefTracking").offsetTop + g("helpRefTracking").offsetHeight / 2 + boxTop;
    const trackingButton = g("pauseButton");
    const trackingBottom = trackingButton.offsetTop + trackingButton.offsetHeight;
    const trackingBottomMid = trackingButton.offsetLeft + trackingButton.offsetWidth / 2;
    drawLine(svg, trackingBottomMid, trackingBottom, trackingBottomMid, trackingBottom + 10);
    drawLine(svg, trackingBottomMid, trackingBottom + 10, boxLeft - 10, trackingBottom + 10);
    drawLine(svg, boxLeft - 10, trackingBottom + 10, boxLeft - 10, trackingHelpMid);
    drawLine(svg, boxLeft - 10, trackingHelpMid, boxLeft + 10, trackingHelpMid);

    const addHelpMid = g("helpRefAdd").offsetTop + g("helpRefAdd").offsetHeight / 2 + boxTop;
    const addButton = g("addPlaceButton");
    const addButtonBottom = addButton.offsetTop + addButton.offsetHeight;
    const addButtonMid = addButton.offsetLeft + addButton.offsetWidth / 2;
    drawLine(svg, addButtonMid, addButtonBottom, addButtonMid, addHelpMid);
    drawLine(svg, boxRight - 10, addHelpMid, addButtonMid, addHelpMid);

    const addFileButton = g("addFileButton");
    const addFileButtonTop = addFileButton.offsetTop;
    const addFileButtonMid = addFileButton.offsetLeft + addFileButton.offsetWidth / 2;
    const addFileHelpMid = g("helpRefAddPics").offsetTop + g("helpRefAddPics").offsetHeight / 2 + boxTop;
    drawLine(svg, addFileButtonMid, addFileButtonTop, addFileButtonMid, addFileHelpMid);
    drawLine(svg, addFileButtonMid, addFileHelpMid, boxRight - 10, addFileHelpMid);
}
function drawLine(svg, x1, y1, x2, y2) {
    var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLine.setAttribute('x1', x1);
    newLine.setAttribute('y1', y1);
    newLine.setAttribute('x2', x2);
    newLine.setAttribute('y2', y2);
    newLine.style.stroke = "rgb(0,255,255)";
    newLine.style.strokeWidth = "6";
    svg.append(newLine);
}

// -------------
// Language
// -------------

window.strings = {};
window.iaith = "EN";

function toggleLanguage() {
    setLanguage(window.iaith == "CYM" ? "EN" : "CYM");
}

function setLanguage(lang) {
    window.iaith = lang;
    setCookie("iaith", window.iaith);
    if (lang == "CYM") {
        g("aboutEN").style.display = "none";
        g("aboutCYM").style.display = "inline";
    } else {
        g("aboutEN").style.display = "inline";
        g("aboutCYM").style.display = "none";
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
}

function s(sid, en) {
    var r = null;
    try {
        if (window.strings[sid]) r = window.strings[sid][window.iaith];
    } catch (ex) { }
    return r || en;
}

function showTagsKey() {
    g("tagsKey").style.display = "block";
}
function hideTagsKey() {
    g("tagsKey").style.display = "none";
}

function doSearch(term) {
    mapSearch(term);
}
