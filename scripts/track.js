// This code will run every time the GPS gets a new position:
function updatePosition(pos) {
    // User has clicked pause button?
    if (window.paused) return;

    // Ignore if < 10s since last update: 
    var t = new Date().getTime();
    if (window.lastMoveTime && t - window.lastMoveTime < 10000) return;
    window.lastMoveTime = t;

    // nearest place and appropriate zoom:
    let nearest = window.map.nearestPlace({e:pos.coords.longitude, n:pos.coords.latitude});

    if (nearest.distancesq < 0.002 && window.lastPlace != nearest.place)  { // ~0.1mi
        window.lastPlace = nearest.place;
        goto(nearest.place);
    } else {
        // Shift map to current location:
        moveTo(pos.coords.longitude, pos.coords.latitude, nearest.zoom);
    }
}

window.lastPlace = null;

/**
 * Set the tracking pause button from cookie.
 */
function initTracking() {
    
    window.trackingEnable = !location.queryParameters.notrack && window.isMobile  || window.Cypress;
    if (window.trackingEnable) g("pauseButton").style.display="inline-block";
    
    if (getCookie("tracking") == "on" && window.trackingEnable) {
        onPauseButton();
    }
}
 
window.paused = true;

function onPauseButton(stop=false) {
    var b = g("pauseButton");
    if (window.paused && !stop) {
        b.style.backgroundColor = "lightgreen";
        b.innerHTML = "<small><b>||</b></small>";
        b.title = "Pause map tracking";
        window.paused = false;
        flashMessage("Tracking resumed");
        setCookie("tracking", "on");

        startIncrementalUpdate();
        startLocationTracking();
    } else if(!window.paused) {
        b.style.backgroundColor = "white";
        b.innerHTML = "<b>&gt;</b>";
        b.title = "Move the map as you walk";
        window.paused = true;
        flashMessage("Tracking location suspended");
        setCookie("tracking", "off");
        
        stopIncrementalUpdate();
        stopLocationTracking();
    }
}

function startLocationTracking() {
    navigator.geolocation.getCurrentPosition(updatePosition);
    window.navigatorWatch = navigator.geolocation.watchPosition(
        updatePosition,
        // Not much we can do if GPS returns an error, other than try again later:
        function (err) { },
        // Various options:
        {
            enableHighAccuracy: true,
            timeout: 9000,  // Stop trying after 9 seconds (e.g. if in a tunnel)
            maximumAge: 3000 // We accept location calculated anything up to 3 seconds ago
        }
    );
}

function stopLocationTracking() {
    navigator.geolocation.clearWatch(window.navigatorWatch);
}
