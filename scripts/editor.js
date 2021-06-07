// The Place editor.
function showPlaceEditor(placePoint, x, y) { 
    if (!closePopup()) return;
    if (!placePoint) return;
    if (placePoint.place.deleted) return;
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
        + (placePoint.place.DisplayName || `<span style="color:lightgray">${usernameIfKnown()}</span>`));
    if (pop.editable) {
        g("author").onclick = event => showMenu("openAuthorMenu", placePoint.place, null, event);
    } else {
        g("author").onclick = null;
    }

    //showComments(placePoint.place, g("popupComments"));
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
    pop.groupSelector = new GroupSelector("groupEditorBox", newPath => placePoint.place.group = newPath);
    pop.groupSelector.setGroup(placePoint.place.group);
    if (helping) {
        helping = false;
        showEditorHelp();
    }
}


/** Close place editing dialog and save changes to server. Text, links to pics, etc. 
 * No-op if editing dialog is not open.
 * @returns false if the editor was not closed (because of validation errors)
*/
function closePopup(ignoreNoTags = false) { 
    // Get the editing dialog:
    var pop = g("popup");
    // Is it actually showing?
    if (pop.style.display && pop.style.display != "none") {
        lightboxU.hide();
        closeRecorder();
        // Just in case:
        hide("titleDialog");
        // Is this user allowed to edit this place? And some sanity checks.
        if (pop.editable && pop.placePoint != null && pop.placePoint.place != null) {
            pop.groupSelector.eliminateDuplicates();
            let pin = pop.placePoint;
            let place = pin.place;
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
                promptForInfo(place, "", "Tip: To link to another page, select a phrase such as 'Read more', click the Link tool, and paste in the link", "insertLinkButton")
            ) {
                return false;
            }
            if (!ignoreNoTags && (!stripped && place.pics.length > 0) &&
                promptForInfo(place, "", s("titleAlert", "Please enter a title"), "popupTextTopLine")
            ) {
                return false;
            }

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
                index.expandToGroup(place.group);
            }
        }
        var checkList = document.getElementById('tagSelectorList');
        if (checkList) checkList.classList.remove('visible');
        html("thumbnails", "");
        hide(pop);
        // Popup is reusable - only used by one place at a time
        pop.placePoint = null;
        pop.groupSelector = null;
    }
    return true;
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
    var x = target.offsetLeft;
    var y = target.offsetTop;
    var loc = map.screenToLonLat(x, y);
    return loc;
}

function onAddPlaceButton() {
    var loc = targetLocation();
    showPlaceEditor(map.addOrUpdate(makePlace(loc.e, loc.n)), 0, 0);
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
function editRangeCmd(place, x2) {
    showRangeDialog(place, null, s("trackingRange", "Tracking Range"),
        place.range, (picx, pinx, t) => {
            let tt = t.trim();
            place.range = tt;
            text("rangeValue", (place.Range || 300));
            g("popup").hash = -1; // Ensure will be written
        });
}


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

// User clicked an Add button.
function showFileSelectDialog(auxButton) {
    if (!usernameOrSignIn()) return;
    // Make the file selection button clickable and click it:
    let uploadButton = g(auxButton);
    show(uploadButton, "inline");
    uploadButton.value = "";
    uploadButton.click();
}


function onDeletePic(lightbox) {
    deletePicCmd(lightboxU.currentPic, lightboxU.currentPin);
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
    lightboxU.hide();
    pinPops.hide();
    closePopup(true);
    sendPlace(place);
    showPlaceEditor(pin);
}

/** User has chosen Download command on a file
 * @parame f {Picture} - the file
 * @param pin {Pin} - the map point for the place
 */
function downloadFileCmd(f, pin) {
    let anchor = c(null, "a", "menu", null, {download:"", href:mediaSource(f.id), target:"_blank"});
    anchor.click();
    html("menu", "");
}

/** User has chosen Rotate 90 command on a picture
* @param pic
 * @param pin
 */
function rotatePicCmd(pic, pin) {
    if (!pin.place.IsEditable) return;
    pic.rot90();
    lightboxU.hide(false);
    closePopup(true);
    pinPops.hide();
    sendPlace(pin.place);
    showPlaceEditor(pin);
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
    if (audioFileTypes.indexOf(extension) < 0) { alert(s("audioFileTypeAlert", "Need a file of type:") + " mp3, m4a, wav, avv, ogg"); return; }
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
            showPlaceEditor(pin);
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
function showRangeDialog(pic, pin, promptMessage, oldValue, onDone) {
    if (pin && !pin.place.IsEditable) return;
    html("editRangePrompt", promptMessage);
    let inputBox = g("rangeInput");
    let dialog = g("rangeDialog");
    inputBox.whenDone = (v) => { hide(dialog); onDone(pic, pin, v.trim()); };
    inputBox.innerHTML = oldValue;
    inputBox.onclick = e => stopPropagation(e);
    dialog.pic = pic;
    dialog.pin = pin;
    show(dialog);
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


//----------------------
// Voice Recorder
//----------------------

function showVoiceRecorder() {
    let pop = g("popup");    
    pop.recorder = new RecordingUI(g("recorderPopup"), pop.placePoint);
}

function closeRecorder() {
    let pop = g("popup");
    if (pop.recorder) pop.recorder.close();
}

