

if (location.protocol == "http:" && location.toString().indexOf("azure") > 0) {
    if (window.location == window.parent.location) { //not in an iframe
        location.replace(("" + location).replace("http:", "https:"));
    }
}

window.onpopstate = function (e) { window.history.forward(1); }
window.rightClickActions = [{ label: "Add place here  .", eventHandler: () => window.map.doAddPlace() }];

window.Places = {};
var RecentUploads = {};

function init() {
    log("init");
    window.splashScreen = new SplashScreen();
    window.loadingTimer = Date.now();
    if (window.location != window.parent.location) {
        g("fullWindowButton").style.display = "block";
    }
    let target = window.location == window.parent.location ? "_blank" : "_top";
    html("workingTitle", `<a href="${window.project.intro}" target="${target}">${window.project.title}</a>`);
    window.deviceHasMouseEnter = false;
    window.lightboxU = new LightboxU(g("lightbox"));
    g("topLayer").oncontextmenu = (event) => {
        event.preventDefault();
    }
    isSendQueueEmptyObservable.AddHandler(() => {
        g("picLaundryFlag").style.visibility = isSendQueueEmptyObservable.Value ? "hidden" : "visible";
    });
    makeTags();
    setLanguage(window.project.welsh && getCookie("iaith") || "EN");
    if (!window.project.welsh) {
        hide("toggleLanguageButton");
        hide("welshKeys");
    }
    // Get API keys, and then initialize the map:
    dbGetKeys(function (data) {
        doLoadMap(() => {
            if (map.isMapTypeOsObservable) {
                map.isMapTypeOsObservable.AddHandler(() => {
                    g("mapbutton").src = map.isMapTypeOsObservable.Value ? "img/aerial-icon.png" : "img/map-icon.png";
                });
            }
            else {
                hide("mapbutton");
            }
            mapReady();
        });
        log("got keys");
    });
    window.pinPops = new Petals(true); // Set up shape 
    if (location.queryParameters.nosearch) {
        hide("bottomLeftPanel");
    }
    if (location.queryParameters.notrack) {
        hide("pauseButton");
    }
    if (location.queryParameters.nouser) {
        hide("usernamediv");
        splashScreen.permitDrop("no user");
    } else {
        checkSignin(un => {
            if (un && un != "test") {
                splashScreen.permitDrop("signed in");
            }
        });
    }


    // Arrow keys change picture in lightbox:
    window.addEventListener("keydown", doLightBoxKeyStroke);
    // But allow use of arrow keys in picture caption:
    // g("lightboxCaption").addEventListener("keydown", event => { stopPropagation(event); });

    g("lightbox").oncontextmenu = function (e) {
        stopPropagation(e);
        e.preventDefault();
        stopPicTimer();
        if (!lightboxU.currentPin.place.IsEditable) return;
        if (lightboxU.currentPic) {
            showMenu("petalMenu", lightboxU.currentPic, lightboxU.currentPin, e);
        } else if (lightboxU.currentPin) {
            showMenu("petalTextMenu", lightboxU.currentPin, null, e);
        }
    }

    // Sanitize pasted HTML, Word docs, etc
    g("popuptext").addEventListener('paste', (e) => {
        // Get user's pasted data
        let data = e.clipboardData.getData('text/plain');
        if (data) {
            data = data.replace(/\n/, "\n<br/>\n");
        } else {
            data = e.clipboardData.getData('text/html');
            data = data.replace(/<.*>/, "");
        }

        // Insert the filtered content
        document.execCommand('insertHTML', false, data);

        // Prevent the standard paste behavior
        e.preventDefault();
    });

    g("statsLink").href = "stats.html?project=" + window.project.id;
}

/**
 * Called when the map is loaded or refreshed.
 */
function mapReady() {
    log("map ready");
    window.map.onclick((e) => {
        closePopup();
        pinPops.hide();
        hidePic();
        index.hideIndex();
    });
    currentTrail = [];
    if (window.Places && Object.keys(window.Places).length > 0) {
        addAllPlacesToMap();
    } else {
        loadPlaces();
    }
}


/**
 * Initial load of all places from DB onto the map.
 * PRE: map is empty.
 */
function loadPlaces() {
    window.Places = {};
    window.groupsAvailable = {};
    dbLoadPlaces(function (placeArray) {
        log("places loaded");
        placeArray.forEach(function (place) {
            if (!place.deleted) {
                window.Places[place.id] = place;
                if (place.group) window.groupsAvailable[place.group] = 1;
            }
        });
        addAllPlacesToMap();
        initTracking();
        show("splashCloseX");
        show("continueButton");
        hide("loadingFlag");
        splashScreen.permitDrop("places loaded");
        clearTimeout(window.restartTimer);
        if (window.location.queryParameters.place) {
            splashScreen.permitDrop("parameter goto");
        }
        setGroupOptions();
        index.showIndex();
    });
}

/**
 * Put Places on the map.
 * PRE: map is empty; Places has all the places.
 */
function addAllPlacesToMap() {
    for (var id in Places) {
        let place = Places[id];
        map.addOrUpdate(place);

        if (place.next) place.next.prvs = null;
        place.next = place.nextRowKey ? Places[place.NextId] : null;
        if (place.next) {
            place.next.prvs = place;
        }
    }
}

let currentTrail = [];

/**
 * Show a trail on which place is an item.
 * Hide any current trail if it doesn't include this.
 * PRE: next and prvs already set, or null
 * INV: Place p; !p.next || p.next.prvs == p
 * Currently an item can only be on one trail.
 * @param {Place} place Place on a trail
 */
function showTrail(place) {
    // Is this on a trail?
    if (!place.next && !place.prvs) return;
    // Already showing a trail with this place?
    if (currentTrail.indexOf(place) >= 0) return;
    // Showing a different trail?
    if (currentTrail.length > 0) hideTrail();
    // Find start
    for (var start = place; start.prvs && start.prvs != place; start = start.prvs) {

    }
    // Show links
    for (var current = start; current && current.next != start; current = current.next) {
        map.addOrUpdateLink(current);
        currentTrail.push(current);
        createTrailPrevious = current;
    }
}

/**
 * Hide any currently showing trail if it doesn't include this place.
 * @param {Place} place 
 */
function hideOtherTrail(place) {
    if (currentTrail.length > 0 && currentTrail.indexOf(place) < 0) {
        hideTrail();
    }
}

/**
 * Hide the currently showing trail.
 */
function hideTrail() {
    currentTrail.forEach(v => {
        map.removeLink(v);
    });
    currentTrail = [];
}

/** Listen for messages from parent if we're in an iFrame */
function setParentListener() {
    window.addEventListener("message", function (event) {
        if (event.source == window.parent && event.data.op == "gotoPlace") {
            onPauseButton(true); // Stop tracking 
            let placeKey = decodeURIComponent(event.data.placeKey.replace(/\+/g, " "));
            if (!window.placeToGo) {
                // This is the first call after opening, so probably need to clear splash screen
                splashScreen.permitDrop("api goto");
                // If that hasn't cleared the splash, it's because we're still waiting on map loading
                // So keep the command for execution later
                window.placeToGo = { place: placeKey, show: event.data.show };
                // But try it anyway ...
            }
            goto(placeKey, null, "auto", event.data.show);
        }
    });
}

function gotoFromIndex(placeKey, event) {
    window.lightboxU.unexpand();
    goto(placeKey, event);
    showTrail(map.placeToPin[placeKey].place);
}

function goto(placeKey, e, zoom = "auto", showPix = true) {
    if (e) stopPropagation(e);
    let pin = map && map.placeToPin[placeKey];
    if (pin) {
        moveTo(pin.place.loc.e, pin.place.loc.n, zoom, pin);
        window.pinPops.popPetals(null, pin, false);
        if (showPix && (pin.place.pics.length > 0 || pin.place.Stripped.length - pin.place.Title.length > 10)) {
            presentSlidesOrEdit(pin, 0, 0);
        } else hidePic();
        let target = g("target");
        if (window.getComputedStyle(target).visibility == "hidden") {
            target.style.visibility = "visible";
            setTimeout(() => {
                target.style.visibility = "hidden";
            }, 10000);
        }
    }
}

setParentListener();

// Shift the map.
function moveTo(e, n, zoom, pin) {
    var target = g("target");
    var x = target.offsetLeft + target.offsetWidth / 2;
    var y = target.offsetTop + target.offsetHeight / 2;
    var centerOffsetY = y - window.innerHeight / 2;
    var centerOffsetX = x - window.innerWidth / 2;
    map.moveTo(e, n, centerOffsetX, centerOffsetY, zoom, pin);
}

function getTitleFromId(placeKey) {
    let pin = placeToPin[decodeURI(placeKey.replace("+", "%20"))];
    return pin.place.Title;
}


function contactx(event, place) {
    window.open(`mailto:${window.project.admin}?subject=${encodeURIComponent(window.project.title)}&body=About%20this%20item:%20${encodeURIComponent(getLink(place))}%0A%0A`, "_blank")
    return stopPropagation(event);
}

function showLink(place, event) {
    stopPropagation(event);
    var url = getLink(place);
    html("messageInner", s("getLinkDialog", "To show someone else this place, copy and send them this link:") + "<br/>"
        + "<input id='msgbox' type='text' value='{0}' size={1} readonly></input>".format(url, url.length + 2));
    show("message");
    g("msgbox").setSelectionRange(0, url.length);
    g("msgbox").focus();
}

function confirmDialog(message, onconfirm) {
    html("messageInner", message + "<br/><button id='messageOkButton'>OK</button> <button id='messageCancelButto'>Cancel</button>");
    g("messageOkButton").addEventListener("click", evt => {
        stopPropagation(evt);
        hide("msgbox");
        onconfirm();
    });
    g("messageCancelButton").addEventListener("click", evt => hide("msgbox"));
    show("msgBox");
}

function showHelp() {
    show('splash');
    show("continueButton");
    hide("loadingFlag");
}


function getRecentPlaces() {
    dbLoadPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            if (window.Places[place.id]) {
                if (place.deleted) {
                    deleteFromUi(placeToPin[place.id]);
                } else {
                    map.replace(window.Places[place.id], place);
                    window.Places[place.id] = place;
                }
            } else {
                if (!place.deleted) {
                    map.addOrUpdate(place, true);
                    window.Places[place.id] = place;
                }
            }
            if (place.group) window.groupsAvailable[place.group] = 1;
        });
        map.repaint();
    }, true);
}

/*
// contentType : ("place" | "picImg" | ...), content: (File | JSON)
function upload(id, contentType, content, remoteFileName) {
    syncWorker.postMessage({ id: id, contentType: contentType, content: content, remoteFileName: remoteFileName });
}
*/

function startIncrementalUpdate() {
    // Just in case we've already been here:
    stopIncrementalUpdate();
    // And then get them again every minute:
    window.placeGetter = setInterval(getRecentPlaces, 60000);
}

function stopIncrementalUpdate() {
    if (window.placeGetter) clearInterval(window.placeGetter);
}



// Create a new place and assign it to current user.
// Returns null if user not signed in yet.
function makePlace(lon, lat) {
    var username = usernameOrSignIn();
    if (!username || !window.user.isContributor) return null;
    var place = new Place(window.project.id || "Garn Fawr", lon, lat);
    Places[place.id] = place;
    place.user = username;
    place.group = window.selectedGroup;
    place.tags = window.recentTags;
    place.modified = Place.DateString(Date.now());
    return place;
}

function targetLocation() {
    var target = g("target");
    var x = target.offsetLeft + target.offsetWidth / 2;
    var y = target.offsetTop + target.offsetHeight / 2;
    var loc = map.screenToLonLat(x, y);
    return loc;
}

function onAddPlaceButton() {
    var loc = targetLocation();
    showPopup(map.addOrUpdate(makePlace(loc.e, loc.n)), 0, 0);
}

function updatePlacePosition(pin) {
    pin.place.loc = targetLocation();
    map.updatePin(pin);
}

function openAuthorCmd(place, x2) {
    text("author", "");
    place.user = "";
    place.displayName = "";
    g("popup").hash = -1; // Ensure will be written
}

function editAuthorCmd(place, x2) {
    showInputDialog(place, null, s("authorName", "Author name"),
        place.DisplayName, (picx, pinx, t) => {
            let tt = t.trim();
            place.displayName = tt;
            text("author", place.DisplayName);
            g("popup").hash = -1; // Ensure will be written
        });
}

// The Place editor.
function showPopup(placePoint, x, y) {
    if (!closePopup()) return;
    if (!placePoint) return;
    var tt = g("popuptext");
    tt.innerHTML = placePoint.place.text;
    g("popupTimestampTextBox").innerHTML = placePoint.place.modified || "";
    var pop = g("popup");

    pop.editable = placePoint.place.IsEditable;
    tt.contentEditable = pop.editable;
    show("toolBar1", pop.editable ? "block" : "none");
    g("addPicToPlaceButton").style.visibility = pop.editable ? "visible" : "hidden";
    g("editorHelpButton").style.visibility = pop.editable ? "visible" : "hidden";
    setNewGroupOption();

    html("author", (placePoint.place.user && window.user && window.user.isEditor ? "<div class='bluedot'>&nbsp;</div>&nbsp;" : "")
        + (placePoint.place.DisplayName || `<span style="color:lightgray" title="Edit the place to take authorship">${usernameIfKnown()}</span>`));
    if (pop.editable) {
        g("author").onclick = event => showMenu("openAuthorMenu", placePoint.place, null, event);
    } else {
        g("author").onclick = null;
    }

    showComments(placePoint.place, g("popupComments"));
    if (true) {
        pop.className = "fixedPopup";
        show(pop);
    } else {
        pop.style.display = "block";
        pop.style.top = "" + Math.min(y, window.innerHeight - pop.clientHeight) + "px";
        pop.style.left = "" + Math.min(x, window.innerWidth - pop.clientWidth) + "px";
    }
    pop.placePoint = placePoint;
    pop.hash = placePoint.place.Hash;
    show("picPrompt", !pop.editable || placePoint.place.pics.length > 0 ? "none" : "inline");
    placePoint.place.pics.forEach(function (pic, ix) {
        addThumbNail(pic, placePoint, true);
    });
    showTags(placePoint.place);
    let groupSelector = new GroupSelector("groupEditorBox", newPath => placePoint.place.group = newPath);
    groupSelector.setGroup(placePoint.place.group);
    if (helping) {
        helping = false;
        showEditorHelp();
    }
}


/**
 * Show media in the lightbox
 * @param pic The media to show
 * @param pin Map pin. 
 * @param runShow {bool} Run slides automatically
 * @pre pin.place.pics.indexOf(pic) >= 0
 */
function showPic(pic, pin, runShow, autozoom = true, fromClick = false) {
    closePopup(true);
    if (pin.place && pin.place.group) index.expandToGroup(pin.place.group);
    if (fromClick || !(pic && pic.isPicture)) window.lightboxU.unexpand();
    if (!pic || pic.isPicture) {
        lightboxU.currentPic = pic;
        if (lightboxU.currentPin != pin) {
            lightboxU.currentPin = pin;
            lightboxU.setPlace(
                pin.place.IsEditable,
                pin.place.DisplayName +
                (window.innerWidth > 400 ? " " + pin.place.modified : ""),
                pin.place.Title,
                pin.place.NonMediaFiles.map(f => `<a href="${PicUrl(f.id)}" target="_blank"><img src="${f.fileTypeIcon}" style="border:2px solid blue;float:right"/></a>`).join('')
                + fixInnerLinks(pin.place.Body));
            showComments(pin.place, lightboxU.lightboxComments);
        }

        if (pic) {
            lightboxU.setPic(pic, pin.place.pics.length > 1);
            if (pic.sound) {
                show("audiodiv");
                let audio = g("audiocontrol");
                audio.src = mediaSource(pic.sound);
                audio.load();

                if (runShow) {
                    audio.onended = function () {
                        doLightBoxNext(1, null, autozoom);
                    };
                }
            } else if (runShow) {
                window.showPicTimeout = setTimeout(() => doLightBoxNext(1, null, autozoom), 6000);
            }

            let linkFromCaption = pic.Caption.match(/http[^'"]+/); // old botch
            let link = pic.youtube || (linkFromCaption ? linkFromCaption[0] : "");
            if (link) {
                if (link.indexOf("youtu.be") > 0) {
                    ytid = link.match(/\/[^/]+$/)[0];
                    stopPicTimer();
                    g("youtubePlayer").src = "https://www.youtube.com/embed{0}?rel=0&modestbranding=1&autoplay=1&loop=1".format(ytid);
                    show("youtube");
                }
            }
        } else {
            lightboxU.black();
        }
    } else {
        window.open(mediaSource(pic.id));
    }
}

function fixInnerLinks(text) {
    return text.replace(/<a [^>]*href="\.\/\?place=([^"]*)"/g, (x, p1) => {
        return `<a onclick="goto('${decodeURI(p1.replace("+", "%20"))}', event)" `;
    });
}

function expandPic(event) {
    stopPropagation(event);
    if (!lightboxU.isExpanded()) {
        lightboxU.expand();
    } else {
        window.open(lightboxU.lbImg.src.toString());
    }
}

function frameBreakout() {
    let mapLocUri = map.getViewString();
    window.open(location.href.replace(/\?.*/, "")
        + `?project=${window.project.id}&view=${encodeURIComponent(mapLocUri)}`, "_blank");
}

function setImgFromPic(img, pic, title, onloaded) {
    img.onload = () => {
        img.style.transform = pic.transform(img);
        img.title = title || (pic.date || "") + " " + pic.Caption.replace(/<.*?>/g, "").replace(/&.*?;/, " ").replace(/\/\/.*/, "") || "";
        if (onloaded) onloaded();
    };
    img.title = ""; // to avoid confusion just in case it doesn't load
    img.src = pic.isAudio ? "img/sounds.png" : mediaSource(pic.id);
    img.pic = pic;
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
    // Stop sound accompanying a picture
    if (!keepBackground || lightboxU.currentPic && lightboxU.currentPic.sound) {
        g("audiocontrol").pause();
        hide("audiodiv");
    }
    //if (box.currentPic && box.currentPin && box.currentPin.place.IsEditable) { box.currentPic.caption = g("lightboxCaption").innerHTML; }
    if (!keepBackground) {
        lightboxU.hide();
        lightboxU.currentPin = null;
    }
}

function switchToEdit() {
    let pin = lightboxU.currentPin;
    hidePic(false);
    showPopup(pin, 0, 0);
}

var incZoomCount = 0;

/** User has clicked left or right on lightbox, or pic timed out.
 * @param {int} inc +1 or -1 == next or previous
 * @event {eventArgs} triggered by 
 */
function doLightBoxNext(inc, event, autozoom = true) {
    if (window.showPicTimeout) {
        clearTimeout(window.showPicTimeout);
        window.showPicTimeout = null;
    }
    let next = whatsNext(inc);
    if (!next) return;
    hidePic(true);
    if (next.place) goto(next.place, null, autozoom);
    else {
        showPic(next.pic, next.pin, inc >= 0, autozoom);
        /*
        if (autozoom && incZoomCount++ < 5) {
            let box = g("lightbox");
            let place = box.currentPin.place;
            moveTo(place.loc.e, place.loc.n, "inc");
        }
        */
    }
    if (!window.previewImage) window.previewImage = new Image();
    let preview = whatsNext(1);
    window.previewImage.src = preview.pic ? mediaSource(preview.pic.id) : "";
    if (event) return stopPropagation(event);
}


/**
 * Decide the next place and picture in a slide show.
 * @param {*} inc +1 | -1 == forward | backward
 * @returns {place, pic, pin}
 */
function whatsNext(inc) {
    if (inc == 0) return null;
    let pics = lightboxU.currentPin.place.pics;
    if (pics.length == 0) return null;
    let nextPic = null;
    let count = 0;
    let index = pics.indexOf(lightboxU.currentPic);
    do {
        if (count++ > pics.length) return null; // In case of no actual pictures
        index = (index + inc + pics.length) % pics.length;
        nextPic = pics[index];
    } while (!nextPic.isPicture);

    // Trails
    if (index == 0 && (lightboxU.currentPin.place.next || lightboxU.currentPin.place.prvs)
        && lightboxU.currentPin.place != lightboxU.currentPin.place.next
        && window.paused  // Not tracking
    ) {
        let next = lightboxU.currentPin.place.next;
        if (!next) {
            for (next = lightboxU.currentPin.place.prvs; !!next.prvs; next = next.prvs) {
                if (next.prvs == lightboxU.currentPin.place) break;
            }
        }
        return { place: next.id, pic: next.pics[0] };
    }
    else if (lightboxU.currentPic == nextPic) {
        return null;
    } else {
        return { pic: nextPic, pin: lightboxU.currentPin };
    }
}

/**
 * Key pressed while showing lightbox.
 * @param {key event} event 
 */
function doLightBoxKeyStroke(event) {
    if (window.lightboxU.isShowing()) {
        switch (event.keyCode) {
            case 37: doLightBoxNext(-1, event, false);
                break;
            case 39: doLightBoxNext(1, event, false);
                break;
            case 13: case 27: hidePic(false);
                break;
            default: return false;
        }
        return stopPropagation(event);
    } else {
        if (event.keyCode == 27) {
            closePopup();
            window.map.closeMapMenu();
            window.map.stopPeriodicZoom();
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
        pinPops.hide();
    } else {
        alert(s("deletePlaceDialog", "To delete a place, first delete its pictures and text"));
    }
}

/**
 * Delete a pin from the map, and its place from the DB.
 * @param {*} pin 
 */
function deletePlace(pin) {
    /*
    dbDeletePlace(pin.place.id, function () {
        map.deletePin(pin);
        delete window.Places[pin.place.id];
        index.showIndex();
    });
    */

    if (!usernameOrSignIn()) return;
    pin.place.text = "";
    pin.place.deleted = true;

    if (pin.next) {
        pin.next.prvs = null;
    }
    if (pin.prvs) {
        pin.prvs.nextRowKey = "";
        pin.prvs.next = null;
        sendPlace(pin.prvs);
    }
    pin.nextRowKey = "";
    sendPlace(pin.place);
    deleteFromUi(pin);
}

function deleteFromUi(pin) {
    delete window.Places[pin.place.id];
    map.deletePin(pin);
    index.showIndex();
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
    if (!item && recentPrompt != place.id + locusId) {
        recentPrompt = place.id + locusId;
        if (locusId) {
            let locus = g(locusId); if (locus) {
                locus.style.outline = "3px dashed red";
                setTimeout(() => { locus.style.outline = ""; }, 6000);
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
    // Get the editing dialog:
    var pop = g("popup");
    // Is it actually showing?
    if (pop.style.display && pop.style.display != "none") {
        hidePic();
        // Just in case:
        hide("titleDialog");
        // Is this user allowed to edit this place? And some sanity checks.
        if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
            let pin = pop.placePoint;
            let place = pin.place;
            if (g("groupEditorUi")) place.group = g("groupEditorUi").value;
            // Remove some of the worst bits from pasted Word text:
            place.text = g("popuptext").innerHTML.replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "")
                .replace(/<font [^>]*>/g, "").replace(/<\/font>/g, "")
                .replace(/<([^>]*)class=\"[^>]*\"([^>]*)>/g, (s, p1, p2) => "<" + p1 + p2 + ">")
                .replace(/\u2028/g, "<br/>");
            // Validation:
            var stripped = place.Stripped;
            if (!ignoreNoTags && stripped
                && promptForInfo(place, place.tags, s("tagAlert", "Please select some coloured tags"), "tags")) {
                return false;
            }
            if (!ignoreNoTags && (stripped.indexOf("http") >= 0 || stripped.indexOf("www") >= 0) &&
                promptForInfo(place, "", "Tip: To link to another page, select a phrase such as 'Read more', click the Link tool, and paste in the link", "inserLinkButton")
            ) {
                return false;
            }
            /*
            if (!ignoreNoTags
                && promptForInfo(place, place.Title, s("titleAlert", "Please enter a title"), "popupTextTopLine")) {
                return false;
            */

            if (!stripped && place.pics.length == 0) {
                // User has deleted content.
                deletePlace(pin);
                index.showIndex();
            } else if (pop.hash != place.Hash) {
                if (!place.user && text("author")) place.user = usernameOrSignIn();
                // User has updated content.
                map.updatePin(pop.placePoint); // title etc
                sendPlace(place);
                window.recentTags = place.tags;
                index.showIndex();
            }
        }
        html("thumbnails", "");
        hide(pop);
        // Popup is reusable - only used by one place at a time
        pop.placePoint = null;
    }
    return true;
}

// User clicked an Add button.
function showFileSelectDialog(auxButton) {
    if (!usernameOrSignIn()) return;
    // Make the file selection button clickable and click it:
    let uploadButton = g(auxButton);
    show(uploadButton, "inline");
    uploadButton.value = "";
    uploadButton.click();
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
    html("tags", s);

    // Tags key panel
    var ss = "";
    knownTags.forEach(function (tag) {
        ss += "<div id='c{0}' onclick='tagFilter(this.id)'><div class='tagButton' style='border-color:{1}'></div><span id='k{0}'>{2}</span></div>"
            .format(tag.id, tag.color, tag.name);
    });
    html("tagsKeyPanel", ss + "<div id='cpob' onclick='tagFilter(\"\")'><div class='tagButton' style='border-color:black'></div><span id='kpob'>All</span></div>");
}

function switchTagLanguage(iaith = "") {
    let lang = iaith == "CYM" ? "cy" : "";
    knownTags.forEach((tag) => {
        html(tag.id, tag["name"+lang]);
        html("tip"+tag.id, tag["tip"+lang]);
        html("k"+tag.id, tag["name"+lang]);
    });
}

function tagFilter(cid) {
    appInsights.trackEvent({ name: "tagFilter" });
    g("searchButton").value = "";
    window.tagSelected = cid ? cid.substring(1) : "";
    g("tagKeyButton").style.backgroundImage = "none";
    g("tagKeyButton").style.backgroundColor = window.tagSelected ? knownTag(window.tagSelected).color : "#ffffff";
    index.showIndex(window.tagSelected);
}

function knownTag(id) {
    for (var i = 0; i < knownTags.length; i++) {
        if (id == knownTags[i].id) return knownTags[i];
    }
    return null;
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
        if (place.HasTag(tagSpan.id)) {
            tagSpan.style.borderColor = "coral";
            tagSpan.style.borderStyle = "solid";
        }
        else {
            tagSpan.style.borderStyle = "none";
        }
    }
}

/** Colour dependent on tags. Optional light version for backgrounds. */
function placePinColor(place, light) {
    var transp = light ? 0.2 : 1.0;
    var thisPinColor = (place.text.length > 100 || place.pics.length > 0
        ? "rgba(0,0,196,{0})" : "rgba(0,0,0,{0})").
        format(light ? 0.2 : 1.0);
    if (place.tags) {
        for (var i = 0; i < knownTags.length; i++) {
            if (place.tags.indexOf(knownTags[i].id) >= 0) {
                thisPinColor = light ? knownTags[i].lightColour : knownTags[i].color;
            }
        }
    }
    return thisPinColor;
}

// Default colour, shape, and label of a pin:
function pinOptions(place) {
    return {
        title: place.Title.replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " "),
        text: place.IsInteresting ? "" : "-",
        //subTitle: place.subtitle, 
        color: placePinColor(place),
        enableHoverStyle: true
    };
}

function flashMessage(msg) {
    var msgDiv = g("topMessage");
    msgDiv.innerHTML = msg;
    msgDiv.style.visibility = "visible";
    setTimeout(function () {
        msgDiv.style.visibility = "hidden";
    }, 5000);
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
    pinPops.hide();
    updatePlacePosition(pin);
    sendPlace(pin.place);
}

function onDeletePic(lightbox) {
    deletePicCmd(lightboxU.currentPic, lightboxU.currentPin);
}

let createTrailPrevious = null;
/**
 * User has selected Start Trail cmd on pin.
 * Note the place.
 * @param {Pin} pin 
 * @param {*} context 
 */
function startTrailCmd(pin, context) {
    createTrailPrevious = pin.place;
}

/**
 * User has selected Continue Trail cmd on pin.
 * Make a link from previous Start or Continue trail pin.
 * @param {Pin} pin 
 * @param {*} context 
 */
function continueTrailCmd(pin, context) {
    if (!pin.place) return;
    if (!!createTrailPrevious && !createTrailPrevious.deleted &&
        createTrailPrevious.PartitionKey == pin.place.PartitionKey) {
        if (pin.place.prvs) {
            let previous = pin.place.prvs;
            previous.next = null;
            previous.nextRowKey = null;
            sendPlace(previous);
        }
        if (createTrailPrevious.next) {
            createTrailPrevious.next.prvs = null;
            map.removeLink(createTrailPrevious);
            createTrailPrevious.next = null;
            createTrailPrevious.nextRowKey = null;
        }
        if (createTrailPrevious.next != pin.place) {
            createTrailPrevious.next = pin.place;
            pin.place.prvs = createTrailPrevious;
            createTrailPrevious.nextRowKey = pin.place.RowKey;
            map.addOrUpdateLink(createTrailPrevious);
            currentTrail.push(pin.place);
        }
        sendPlace(createTrailPrevious);
        createTrailPrevious = pin.place;
        pinPops.hide(null);
    }
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
    pinPops.hide();
    closePopup(true);
    sendPlace(place);
    if (!place.deleted) showPopup(pin);
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
            pinPops.hide();
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


/** Text input from user.
 * E.g. to edit caption of a pic or other file.
 * @param {*} pic Picture (optional) - to pass through to callback
 * @param {*} pin Map pin (optional) - to pass through to callback
 * @param {string} promptMessage
 * @param {string} oldValue - to show initially
 * @param {fn(pic,pin)} - callback on close
 */
function showInputDialog(pic, pin, promptMessage, oldValue, onDone) {
    if (pin && !pin.place.IsEditable) return;
    html("editTitlePrompt", promptMessage);
    let inputBox = g("titleInput");
    let dialog = g("titleDialog");
    inputBox.whenDone = (v) => { hide(dialog); onDone(pic, pin, v.trim()); };
    inputBox.innerHTML = oldValue;
    inputBox.onclick = e => stopPropagation(e);
    dialog.pic = pic;
    dialog.pin = pin;
    show(dialog);
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
    pinPops.hide();
    sendPlace(pin.place);
    if (!pin.place.deleted) showPopup(pin);
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
    if (inputField.pic.sound) id = id + "?v=" + (Date.now() % 100); // Make viewers refresh cache
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

function playAudio(pic) {
    show("audiodiv", "block");
    let audio = g("audiocontrol");
    audio.src = mediaSource(pic.id);
    audio.load();
    audio.autoplay = true;
}

function presentSlidesOrEdit(pin, x, y, autozoom = true, fromClick = false) {
    if (fromClick) {
        window.lightboxU.unexpand();
    }
    pinPops.hide();
    closePopup();
    hidePic();
    incZoomCount = 0;
    appInsights.trackEvent({ name: "presentSlidesOrEdit", properties: { place: pin.place.Title } });
    var pic = findPic(pin.place, p => p.isPicture);
    //if (pic || pin.place.pics.length > 0 || !pin.place.IsEditable) {
    var au = findPic(pin.place, p => p.isAudio);
    if (au) {
        setTimeout(() => playAudio(au), 1000);
    }
    showPic(pic, pin, pin.place.pics.length > 1 || pin.place.next || pin.place.prvs, autozoom);
    //} else {
    //    showPopup(pin, x, y);
    //}
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


//----------------------
// Editor Help
//----------------------

function showEditorHelp() {
    show("editorHelp");
    editorHelpLines();
}

function closeEditorHelp() {
    hide("editorHelp");
    var svg = g("editorHelpSvg");
    var f;
    while (f = svg.firstChild) {
        svg.removeChild(f);
    }
}



function showTagsKey() {
    show("tagsKey");
}
function hideTagsKey() {
    hide("tagsKey");
}


function showComments(place, parent) {
    parent.innerHTML = "";
    getComments(place, (comments) => {
        let currentUser = window.user; //usernameIfKnown();
        let t = document.createElement("table");
        t.className = "commentTable";
        let tbody = document.createElement("tbody");
        let mostRecentCommenter = null;
        if (comments) {
            for (let i = 0; i < comments.length; i++) {
                // Don't include empty (= deleted) comments:
                if (comments[i].Text) {
                    tbody.appendChild(commentRow(comments[i], currentUser, place, i));
                    mostRecentCommenter = comments[i].User;
                }
            }
        }
        // Space to append a comment if you're signed in
        //  - but if it's your own place, you only get to comment after someone else.
        //  - and you don't need it if you're the last person to comment, because you can just edit your last remark:
        if (currentUser && mostRecentCommenter != currentUser.name && (comments && comments.length > 0 || currentUser.name != place.user)) {
            tbody.appendChild(commentRow({ User: currentUser.name, Text: "", Item: place.RowKey, PartitionKey: place.PartitionKey, RowKey: "" },
                currentUser, place, comments ? comments.length : 0));
        }
        if (tbody.childNodes.length > 0) {
            parent.innerHTML = "<h3>Comments</h3>";
            t.appendChild(tbody);
            parent.appendChild(t);
        }
    });
}

function commentRow(comment, currentUser, place, i) {
    let tr = document.createElement("tr");
    let td1 = document.createElement("td");
    tr.appendChild(td1);
    let td2 = document.createElement("td");
    tr.appendChild(td2);
    td1.innerHTML = comment.User.replace(" ", "&nbsp;") + ":";
    // You can edit your own comments, or you can edit if you're an admin:
    if (currentUser && (currentUser.isEditor || currentUser.isAdmin || currentUser.name == comment.User)) {
        let div = document.createElement("div");
        div.innerHTML = comment.Text;
        td2.appendChild(div);
        div.setAttribute("contentEditable", "true");
        div.comment = comment;
        div.place = place;
        div.addEventListener("click", e => { stopPropagation(e); });
        div.addEventListener("keydown", e => { event.cancelBubble = true; });
        div.addEventListener("blur", (e) => {
            setComment(e.target.place, e.target.comment, stripComment(e.target.innerHTML));
        });
    } else {
        td2.innerHTML = comment.Text;
    }
    return tr;
}

function stripComment(text) {
    var t = text;
    const xx = ["i", "b", "u"];
    xx.forEach(x => {
        let re1 = new RegExp("<" + x + ">", "sg");
        let re2 = new RegExp("<\/" + x + ">", "sg");
        t = t.replace(re1, "###" + x + "===").replace(re2, "###!" + x + "===");
    });
    t = t.replace(/<[^]*?>/g, " ");
    t = t.replace(/###!.===/g, z => "<\/" + z.substr(4, 1) + ">").replace(/###.===/g, z => "<" + z.substr(3, 1) + ">");
    return t.trim();
}

function setComment(place, comment, text) {
    if (comment.Text != text) {
        if (!comment.RowKey) {
            comment.RowKey = "" + Date.now();
            place.commentCache.push(comment);
        }
        comment.Text = text;
        uploadComment(comment);
        if (text.length == 0) {
            for (var i = 0; i < place.commentCache.length; i++) {
                if (place.commentCache[i] === comment) {
                    place.commentCache.splice(i, 1);
                    break;
                }
            }
        }
    }
}