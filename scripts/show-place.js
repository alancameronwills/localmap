// Showing a place: navigate the map to a place and present its content in the
// lightbox — slideshow stepping, audio, YouTube, and lightbox keystrokes.

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
    let pin = map.placeToPin[decodeURI(placeKey.replace("+", "%20"))];
    return pin.place.Title;
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
    appInsights.trackEvent({ name: "presentSlidesOrEdit", properties: { place: pin.place.Title, id: pin.place.id } });
    var pic = pin.place.findPic(p => p.isPicture);
    //if (pic || pin.place.pics.length > 0 || !pin.place.IsEditable) {
    showPic(pic, pin, pin.place.pics.length > 1 || pin.place.next || pin.place.prvs, autozoom, fromClick);
    window.audioPlayer.playAudio(pin.place, audioFilter);
    //} else {
    //    showPlaceEditor(pin, x, y);
    //}
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

            let ytid = pic.YouTubeId;
            if (ytid) {
                showYouTube(ytid);
                lightboxU.onPicClick(()=>showYouTube(ytid));
            }
        }
    }
}

function showYouTube(ytid) {
    stopPicTimer();
    g("youtubePlayer").src = "https://www.youtube.com/embed{0}?rel=0&modestbranding=1&autoplay=1&loop=1".format(ytid);
    show("youtube");
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
