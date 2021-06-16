
// This code will run every time the GPS gets a new position:
function updatePosition(pos) {
    try {
        // User has clicked pause button?
        if (window.paused) return;
        showState("orange");

        // Ignore if < 10s since last update: 
        var t = new Date().getTime();
        if (!window.lastMoveTime || t - window.lastMoveTime > (window.Cypress ? 100 : 10000)) {
            window.lastMoveTime = t;
            var tracking = true;
            // nearest place and appropriate zoom:
            let nearest = window.map.nearestPlace({ e: pos.coords.longitude, n: pos.coords.latitude }, tracking);

            if (nearest.distancekm < 0.3 && window.lastPlace != nearest.place) {
                window.lastPlace = nearest.place;
                window.index.hideIndex();
                goto(nearest.place.id, null, nearest.zoom, true, {e:pos.coords.longitude, n:pos.coords.latitude});
                appInsights.trackEvent({ name: "trackPlace", properties: { place: nearest.place.id } });
            } else {
                // Shift map to current location:
                moveTo(pos.coords.longitude, pos.coords.latitude); //, nearest.zoom);
                appInsights.trackEvent({ name: "trackMove", properties: { project: window.project.id } });
            }
        }
        showState("lightgreen");
    } catch (e) {
        appInsights.trackEvent({ name: "trackException", properties: { msg: e.toString() } });
        showState("magenta");
    }
}

window.lastPlace = null;

/**
 * Set the tracking pause button from cookie.
 */
function initTracking() {
    window.isTrackingNotifier = new Notifier();

    window.trackingEnable = !location.queryParameters.notrack && window.isMobile || window.Cypress || location.queryParameters.track;
    if (window.trackingEnable) g("pauseButton").style.display = "inline-block";

    if (getCookie("tracking") == "on" && window.trackingEnable) {
        onPauseButton();
    }

    window.mapTarget.addTrigger(window.isTrackingNotifier, () => window.trackingEnable && !window.paused || null);

}

window.paused = true;

function onPauseButton(stop = false) {
    try {
        var b = g("pauseButton");
        if (window.paused && !stop) {
            if (startLocationTracking()) {
                window.lastPlace = null;
                showState("green");
                b.innerHTML = "<img src='img/tracking-on.png'/>";
                b.title = "Pause map tracking";
                window.paused = false;
                flashMessage(s("trackingResumed", "Tracking resumed"));
                setCookie("tracking", "on");
                startIncrementalUpdate();
                window.index.hideIndex();
            }
        } else if (!window.paused) {
            switchOffTracking();
        }
        window.isTrackingNotifier.Notify();
    } catch (e) {
        showState("purple");
        appInsights.trackEvent({ name: "trackButtonException", properties: { msg: e.toString() } });
    }
}

function switchOffTracking() {
    var b = g("pauseButton");
    b.innerHTML = "<img src='img/tracking.png'/>";
    b.title = "Move the map as you walk";
    window.paused = true;
    flashMessage(s("trackingSuspended", "Tracking location suspended"));
    setCookie("tracking", "off");
    showState("white");

    stopIncrementalUpdate();
    stopLocationTracking();
}

function startLocationTracking() {
    appInsights.trackEvent({ name: "startTracking", properties: { project: window.project.id } });
    if (!navigator.geolocation) {
        alert("Sorry - Your browser doesn't support location tracking");
        return false;
    }
    navigator.geolocation.getCurrentPosition(updatePosition,
        function (error) {
            showStateError(error);
            if (error.code == error.PERMISSION_DENIED) {
                alert("You need to allow this website to track your location");
                switchOffTracking();
            }
        }
    );
    window.navigatorWatch = navigator.geolocation.watchPosition(
        updatePosition,
        // Not much we can do if GPS returns an error, other than try again later:
        function (error) {
            showStateError(error);
        },
        // Various options:
        {
            enableHighAccuracy: true,
            timeout: 9000,  // Stop trying after 9 seconds (e.g. if in a tunnel)
            maximumAge: 3000 // We accept location calculated anything up to 3 seconds ago
        }
    );
    return true;
}

function stopLocationTracking() {
    appInsights.trackEvent({ name: "stopTracking", properties: { project: window.project.id } });
    navigator.geolocation.clearWatch(window.navigatorWatch);
}

function showState(c) {
    g("pauseButton").style.backgroundColor = c;
}
function showStateError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            showState("pink");
            break;
        case error.POSITION_UNAVAILABLE: showState("blue"); break;
        case error.TIMEOUT: showState("lightblue"); break;
        default: showState("red"); break;
    }
}

