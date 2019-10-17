//..
// This code will run every time the GPS gets a new position:
function updatePosition(pos) {
    // User has clicked pause button?
    if (window.paused) return;

    // Ignore if < 3s since last update:
    var t = new Date().getTime();
    if (window.lastMoveTime && t - window.lastMoveTime < 3000) return;
    window.lastMoveTime = t;

    // Shift map to current location:
    moveTo(pos.coords.longitude, pos.coords.latitude);
}

function setTracking() {
    if (getCookie("tracking") == "on") {
        onPauseButton();
    }
}
 
window.paused = true;

function onPauseButton() {
    var b = g("pauseButton");
    if (window.paused) {
        b.style.backgroundColor = "lightgreen";
        b.innerHTML = "<small><b>||</b></small>";
        b.title = "Pause map tracking";
        window.paused = false;
        flashMessage("Tracking resumed");
        navigator.geolocation.getCurrentPosition(updatePosition);
        setCookie("tracking", "on");
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
    } else {
        b.style.backgroundColor = "white";
        b.innerHTML = "<b>&gt;</b>";
        b.title = "Move the map as you walk";
        window.paused = true;
        flashMessage("Tracking location suspended");
        setCookie("tracking", "off");

        navigator.geolocation.clearWatch(window.navigatorWatch);
    }
}

