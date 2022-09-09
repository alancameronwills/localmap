
// bulk of the unclassed code
if (location.protocol == "http:" && location.toString().indexOf("azure") > 0) {
    if (window.location == window.parent.location) { //not in an iframe
        location.replace(("" + location).replace("http:", "https:"));
    }
}

window.onpopstate = function (e) { window.history.forward(1); }
window.rightClickActions = [
    {
        label: "Add place here  .\n",
        eventHandler: function () {
            onAddPlaceButton(window.map.menuBoxClose());
        }
    },
    {
        label: "Add video here  .",
        eventHandler: function () {
            onAddVideoButton(window.map.menuBoxClose());
        }
    }];


function checkMap() {
    if ((window.location.queryParameters["cartography"] == "osm")) {
        return "Get Tiles"
    } else {
        return ""
    }
}

window.Places = {};
var RecentUploads = {};

async function init() {
    
    window.project = await Project.get();
    
    log("Project: " + window.project.id);

    window.splashScreen = new SplashScreen(window.project.id);
    await window.splashScreen.show();

    //registerServiceWorker();
    if (JSON.stringify(navigator.onLine) == ("true")) {
        log("Browser Status: Online");
    } else {
        log("Browser Status: Offline");
    }
    setParentListener();
    window.loadingTimer = Date.now();
    if (window.location != window.parent.location) {
        g("fullWindowButton").style.display = "block";
    }
    let target = window.location == window.parent.location ? "_blank" : "_top";
    let intro = window.iaith && window.project.intro_lang[window.iaith] || window.project.intro;
    html("workingTitle", `<a href="${intro}" target="${target}"><img src='img/home.png'><span>${window.project.title}</span></a>`);

    window.lightboxU = new LightboxU(g("lightbox"));
    window.audioPlayer = new AudioPlayer(g("audiodiv"));
    g("topLayer").oncontextmenu = (event) => {
        event.preventDefault();
    }
    isSendQueueEmptyObservable.AddHandler(() => {
        g("picLaundryFlag").style.visibility = isSendQueueEmptyObservable.Value ? "hidden" : "visible";
    });
    makeTags();
    let hasLanguage = window.project && window.project.languages && window.project.languages.length > 1;
    setLanguage(hasLanguage && (location.queryParameters.lang || getCookie("iaith")) || "en");
    if (!hasLanguage) {
        hide("toggleLanguageButton");
        hide("welshKeys");
    }
    if (window.project.languages && window.project.languages.length > 2) {
        hide("welshKeys");
    }
    // Get API keys, and then initialize the map:
    dbGetKeys(function (data) {
        doLoadMap(() => {
            if (map.pinOpacity) {
                let setPointOpacity = () => {
                    map.setOpacity = [ // an array to pick from
                        0.6,
                        0.3,
                        0.1,
                        1][map.pinOpacity.Value || 0];
                };
                // Do this whenever the map choice changes:
                map.pinOpacity.AddHandler(setPointOpacity);
                // And do it now to set button to initial choice got from cookie:
                setPointOpacity();
            } else {
                hide("opacitySlider");
            }
            if (map.mapChoiceObservable) { // just in case this map doesn’t use it
                let setMapButtonIcon = () => {
                    g("mapbutton").src = map.mapView.Icon
                };
                // Do this whenever the map choice changes:
                map.mapChoiceObservable.AddHandler(setMapButtonIcon);
                // And do it now to set button to initial choice got from cookie:
                setMapButtonIcon();
            }
            else {
                hide("mapbutton");
            }

            mapReady();
        });
        log("got keys");
    });

    window.pinPops = new Petals(true, ["lightbox", "audiodiv"]); // Set up shape 
    if (location.queryParameters.nosearch) {
        hide("bottomLeftPanel");
        hide("addressSearchBox");
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
        window.pinPops.hide();
        lightboxU.hide();
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
    dbLoadPlaces(function (placeArray) {
        log("places loaded");
        placeArray.forEach(function (place) {
            if (!place.deleted) {
                window.Places[place.id] = place;
                window.index.addGroupsAvailable(place);
            }
        });
        addAllPlacesToMap();
        window.tracker = new Tracker();
        splashScreen.enableCloseButtons();
        setGroupOptions();
        index.showIndex();
        clearTimeout(window.restartTimer);
        splashScreen.permitDrop("places loaded");
        if (window.location.queryParameters.place || window.location.queryParameters.signin) {
            splashScreen.permitDrop("parameter goto");
        }
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
    if (window.parentListenerSet) return;
    window.parentListenerSet = true;
    window.addEventListener("message", function (event) {
        if ((event.source == window.parent || window.Cypress)) {
            switch (event.data.op) {
                case "gotoPlace":
                    window.tracker.onPauseButton(true); // Stop tracking 
                    let placeKey = decodeURIComponent(event.data.placeKey.replace(/\+/g, " "));
                    if (!window.placeToGo) {
                        // This is the first call after opening, so probably need to clear splash screen
                        window.splashScreen.permitDrop("api goto");
                        // If that hasn't cleared the splash, it's because we're still waiting on map loading
                        // So keep the command for execution later
                        window.placeToGo = { place: placeKey, show: event.data.show };
                        // But try it anyway ...
                    }
                    goto(placeKey, null, "auto", event.data.show, null, null, true);
                    break;
                case "tour":
                    let tourList = event.data.places.map(p => decodeURIComponent(p));
                    window.splashScreen.onDrop(() => {
                        window.map.showPlaceSet(tourList);
                        map.clustering(false);
                        map.maxAutoZoom = 17;
                    })
                    break;
            }
        }
    });
}

function gotoFromIndex(placeKey, event) {
    window.lightboxU.unexpand();
    goto(placeKey, event);
    showTrail(map.placeToPin[placeKey].place);
    let addressSearchBox = g("addressSearchBox");
    if (addressSearchBox) addressSearchBox.value = "";
}

function goto(placeKey, e, zoom = "auto", showPix = true, location = null, audioFilter, fromClick = false) {
    if (e) stopPropagation(e);
    let pin = map && map.placeToPin[placeKey];
    if (pin) {
        let loc = location || pin.place.loc;
        moveTo(loc.e, loc.n, zoom, pin);
        window.pinPops.popPetals(null, pin, false);
        if (showPix && (pin.place.pics.length > 0 || pin.place.Stripped.length - pin.place.Title.length > 10)) {
            presentSlidesOrEdit(pin, 0, 0, null, fromClick, audioFilter);
        } else lightboxU.hide();
        window.mapTarget.setTemporarily();
    }
}

function closePlaceIf(place) {
    if (window.pinPops.pin && window.pinPops.pin.place == place) {
        window.pinPops.hide();
    }
    if (lightboxU.currentPin && lightboxU.currentPin.place == place) {
        lightboxU.hide();
    }
}

// Shift the map.
function moveTo(e, n, zoom, pin) {
    var target = g("target");
    var x = target.offsetLeft; //  + target.offsetWidth / 2;
    var y = target.offsetTop; //+ target.offsetHeight / 2;
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
            window.index.addGroupsAvailable(place);
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

/** Refresh list of places for scenario where other users are adding to the database */
function startIncrementalUpdate() {
    // Just in case we've already been here:
    stopIncrementalUpdate();
    // And then get them again every minute:
    window.placeGetter = setInterval(getRecentPlaces, 60000);
}

function stopIncrementalUpdate() {
    if (window.placeGetter) clearInterval(window.placeGetter);
}





/**
 * Show media in the lightbox
 * @param pic The media to show
 * @param pin Map pin. 
 * @param runShow {bool} Run slides automatically
 * @pre !pic || pin.place.pics.indexOf(pic) >= 0 // pic, if any, is in this place
 */
function showPic(pic, pin, runShow, autozoom = true, fromClick = false) {
    closePopup(true);
    if (fromClick || !(pic && pic.isPicture)) window.lightboxU.unexpand();
    if (fromClick && pin.place && pin.place.group) index.expandToGroup(pin.place.group);
    if (pic && !pic.isPicture && !pic.embed) {
        // pic is actually a PDF or some other sort of file
        window.open(mediaSource(pic.id));
    } else {
        // Either no pic, or a pic that can be displayed or played

        lightboxU.setPlacePic(pin, pic);

        if (pic) {
            if (pic.sound) {
                window.audioPlayer.playOneAudioFile(pic,
                    runShow && (() => doLightBoxNext(1, null, autozoom)));
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
        }
    }
}

function frameBreakout(signin = false) {
    let mapLocUri = map.getViewString();
    window.open(location.href.replace(/\?.*/, "")
        + `?project=${window.project.id}&`
        + (window.iaith ? `lang=${window.iaith}&` : "")
        + `view=${encodeURIComponent(mapLocUri)}` + (signin ? "&signin=true" : ""), "_blank");
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


function switchToEdit() {
    let pin = lightboxU.currentPin;
    lightboxU.hide(false);
    showPlaceEditor(pin, 0, 0);
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
    lightboxU.hide(true);
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
        && window.tracker.paused  // Not tracking
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
            case 13: case 27: lightboxU.hide(false);
                break;
            default: return false;
        }
        return stopPropagation(event);
    } else {
        if (window.accentNext) {
            let accent = window.accentNext;
            window.accentNext = "";
            let i = "aeiouwy".indexOf(event.key);
            if (i >= 0) {
                let accentedCharacter = (accent == "^"
                    ? "âêîôûŵŷ" : "áéíóúwy").substring(i, i + 1);
                setTimeout(() => onInsertText(accentedCharacter), 100);
                return stopPropagation(event);
            }
            return;
        }
        if (event.keyCode == 27) {
            closePopup();
            window.map.closeMapMenu();
            window.map.stopPeriodicZoom();
            return stopPropagation(event);
        }
        switch (event.key) {
            case "^":
                window.accentNext = "^";
                return stopPropagation(event);
                break;
            case "`":
                window.accentNext = "`";
                return stopPropagation(event);
                break;
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

function callDropdown() {
    var checkList = document.getElementById('tagSelectorList');
    checkList.getElementsByClassName('tagAnchor')[0].onclick = function (evt) {
        checkList.classList.add('visible');
    }
    checkList.onmouseleave = function (evt) {
        checkList.classList.remove('visible');
    }
}

function makeTags() {
    if (!window.project.tags || window.project.tags.length == 0) {
        hide("tagKeyButton");
        hide("eh2");
        return;
    }
    // Top of the editor
    var sDropDown = "<div id='tagSelectorList' class='dropdown-check-list' tabindex='100'><span class='tagAnchor'>Tags</span><ul class='items'>";
    var sButtons = "<div style='background-color:white;width:100%;'>";
    window.project.tags.forEach(function (tag) {
        sDropDown += `<li><input type='checkbox' class='tag' id='${tag.id}' onchange='clickTag(this)'/><label id='label${tag.id}'>${tag.name}</label></li>`;
        sButtons += "<div class='tooltip'>" +
            `<span class='tag' style='background-color:${tag.color}' id='${tag.id}' onclick='clickTag(this)'> <span id='label${tag.id}'>${tag.name}</span> </span>` +
            `<span class='tooltiptext' id='tip${tag.id}'>${tag.tip}</span></div>`;
    });
    sDropDown += "</ul></div>"
    sButtons += "</div>";

    if (window.innerWidth < 960) {
        html("tags", sDropDown);
        callDropdown();
    } else {
        html("tags", sButtons);
    }


    // Tags key panel
    var ss = "";
    window.project.tags.forEach(function (tag) {
        ss += "<div id='c{0}' onclick='tagFilter(this.id)'><div class='tagButton' style='border-color:{1}'></div><span id='k{0}'>{2}</span></div>"
            .format(tag.id, tag.color, tag.name);
    });
    html("tagsKeyPanel", ss + "<div id='cpob' onclick='tagFilter(\"\")'><div class='tagButton' style='border-color:black'></div><span id='kpob'>All</span></div>");
}

function switchTagLanguage(iaith = "") {
    window.project.tags.forEach((tag) => {
        html("label" + tag.id, tag["name" + iaith]);
        html("tip" + tag.id, tag["tip" + iaith]);
        html("k" + tag.id, tag["name" + iaith]);
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
    for (var i = 0; i < window.project.tags.length; i++) {
        if (id == window.project.tags[i].id) return window.project.tags[i];
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
            tagSpan.checked = true;
        }
        else {
            tagSpan.style.borderStyle = "none";
            tagSpan.checked = false;
        }
    }
}

/** Colour dependent on tags. Optional light version for backgrounds. */
function placePinColor(place, light) {
    var transp = light ? 0.2 : 1.0;
    var thisPinColor = light ? "#ffffff00" : (place.text.length > 100 || place.pics.length > 0
        ? "#FF40FF" : "#FF40FF");
    if (place.tags) {
        for (var i = 0; i < window.project.tags.length; i++) {
            if (place.tags.indexOf(window.project.tags[i].id) >= 0) {
                thisPinColor = light ? window.project.tags[i].lightColour : window.project.tags[i].color;
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
        enableHoverStyle: true, // for Bing
        // Index isn't set yet, so too early to follow link to group
        isGroupHead: false // place.group && place.group.endsWith(place.Title) // 2021-01-19 disable groupHeads
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
            createTrailPrevious.nextRowKey = pin.place.rowKey;
            map.addOrUpdateLink(createTrailPrevious);
            currentTrail.push(pin.place);
        }
        sendPlace(createTrailPrevious);
        createTrailPrevious = pin.place;
        pinPops.hide(null);
    }
}

function presentSlidesOrEdit(pin, x, y, autozoom = true, fromClick = false, audioFilter) {
    if (fromClick) {
        window.lightboxU.unexpand();
        if (pin.place.indexGroupNode) {
            if (!pin.place.indexGroupNode.showSubPlacesOf(pin.place))
                return;
        }
    }
    if (map.setOpacity < 0.4) {
        var currentPin = window.map.markers.filter(item => {
            return item.id == pin.place.id;
        });
        currentPin[0].setOpacity(0.7);
    }
    pinPops.hide();
    closePopup();
    lightboxU.hide();
    incZoomCount = 0;
    appInsights.trackEvent({ name: "presentSlidesOrEdit", properties: { place: pin.place.Title } });
    var pic = pin.place.findPic(p => p.isPicture);
    //if (pic || pin.place.pics.length > 0 || !pin.place.IsEditable) {
    showPic(pic, pin, pin.place.pics.length > 1 || pin.place.next || pin.place.prvs, autozoom, fromClick);
    window.audioPlayer.playAudio(pin.place, audioFilter);
    //} else {
    //    showPlaceEditor(pin, x, y);
    //}
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
            tbody.appendChild(commentRow({ User: currentUser.name, Text: "", Item: place.rowKey, PartitionKey: place.PartitionKey, RowKey: "" },
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
        if (!comment.rowKey) {
            comment.rowKey = "" + Date.now();
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

function offline() {
    var popup = g("offlinePopupID");
    var btn = g("offlinePopup");
    var span = document.getElementsByClassName("close")[0];
    var cancel = document.getElementsByClassName("cancel")[0];
    btn.onclick = function () {
        popup.style.display = "block";
    }
    span.onclick = function () {
        popup.style.display = "none";
    }
    cancel.onclick = function () {
        popup.style.display = "none";
    }
    window.onclick = function (event) {
        if (event.target == popup) {
            popup.style.display = "none";
        }
    }
}

function selectCartography() {
    g("mapDropdown").classList.toggle("show");
}
function selectCategory() {
    g("categoryDropdown").classList.toggle("show");
}
var selectedMap;
function mapSelect() {
    window.location.search = "?cartography=" + selectedMap + "&project=" + (window.project.id);
}
function opacitySlider() {
    map.pinOpacity.Value = (map.pinOpacity.Value + 1) % 4;

    try {
        var markers = window.map.markers;
        markers.forEach(item => {
            item.setOpacity(map.setOpacity);
        });
        var cluster = document.getElementsByClassName("cluster");
        for (var i = 0; i < cluster.length; i++) {
            cluster[i].style.opacity = (map.setOpacity * 100) + "%";
        }
    } catch { }
}
window.onclick = function (event) {
    if (!event.target.matches('#cartographyButton')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.toggle('show', false);
        }
    }
}
