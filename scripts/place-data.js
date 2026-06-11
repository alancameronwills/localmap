// The client-side collection of places: initial load from the DB, periodic refresh
// while tracking, and the move/delete place commands.

window.Places = {};
var RecentUploads = {};

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

function getRecentPlaces() {
    dbLoadPlaces(function (placeArray) {
        placeArray.forEach(function (place) {
            if (window.Places[place.id]) {
                if (place.deleted) {
                    deleteFromUi(map.placeToPin[place.id]);
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
    // NB this is a soft delete: we blank the text and set the Deleted flag,
    // then re-upload via the POST uploadPlace path. There is deliberately no
    // hard-delete call from the client (the old GET /deletePlace was a
    // state-changing GET with ambient credentials — a CSRF risk — and has
    // been removed).
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

function movePlaceCmd(pin, context) {
    pinPops.hide();
    updatePlacePosition(pin);
    sendPlace(pin.place);
}
