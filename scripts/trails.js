// Trails: a place can link to a next place, forming a chain shown as lines on the map.
// Display of trails, and the Start/Continue Trail context menu commands.

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
