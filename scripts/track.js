function updatePosition(pos) {
    window.tracker && window.tracker.updatePosition(pos);
}

/** As user moves around, move map and pop up places */
class Tracker {

    constructor() {
        this.paused = true;
        this.lastPlace = null;
        this.isTrackingNotifier = new Notifier();
        this.visitList = new VisitList();

        this.trackingEnable = !location.queryParameters.notrack && window.isMobile || window.Cypress || location.queryParameters.track;
        if (this.trackingEnable) g("pauseButton").style.display = "inline-block";

        window.mapTarget.addTrigger(this.isTrackingNotifier, () => this.trackingEnable && !this.paused || null);

        if (this.trackingEnable && (location.queryParameters.track=="on" || getCookie("tracking") == "on")) {
            this.onPauseButton();
        }
    }


    /** On GPS event */
    updatePosition(pos) {
        try {
            // User has clicked pause button?
            if (this.paused) return;
            this.showState("orange");

            // Ignore if < 10s since last update: 
            var t = new Date().getTime();
            if (!this.lastMoveTime || t - this.lastMoveTime > (window.Cypress ? 100 : 10000)) {
                this.lastMoveTime = t;

                // nearest place and appropriate zoom:
                let nearest = window.map.nearestPlace({ e: pos.coords.longitude, n: pos.coords.latitude }, true);

                if (nearest && nearest.distancekm < 0.3 && this.lastPlace != nearest.place) {
                    this.lastPlace = nearest.place;
                    window.index.hideIndex();
                    goto(nearest.place.id, null, nearest.zoom, true, { e: pos.coords.longitude, n: pos.coords.latitude });
                    appInsights.trackEvent({ name: "trackPlace", properties: { place: nearest.place.id } });
                } else {
                    if (this.lastPlace && (!nearest || nearest.distancekm > 0.3)) {
                        closePlaceIf(this.lastPlace);
                        this.lastPlace = null;
                    }
                    // Shift map to current location:
                    moveTo(pos.coords.longitude, pos.coords.latitude); //, nearest.zoom);
                    appInsights.trackEvent({ name: "trackMove", properties: { project: window.project.id } });
                }
            }
            this.showState("lightgreen");
        } catch (e) {
            appInsights.trackEvent({ name: "trackException", properties: { msg: e.toString() } });
            this.showState("magenta");
        }
    }

    onPauseButton(stop = false) {
        try {
            var b = g("pauseButton");
            if (this.paused && !stop) {
                if (this.startLocationTracking()) {
                    this.lastPlace = null;
                    this.showState("green");
                    b.innerHTML = "<img src='img/tracking-on.png'/>";
                    b.title = "Pause map tracking";
                    this.paused = false;
                    flashMessage(s("trackingResumed", "Tracking resumed"));
                    setCookie("tracking", "on");
                    startIncrementalUpdate();
                    window.index.hideIndex();
                }
            } else if (!this.paused) {
                this.switchOffTracking();
            }
            this.isTrackingNotifier.Notify();
        } catch (e) {
            showState("purple");
            appInsights.trackEvent({ name: "trackButtonException", properties: { msg: e.toString() } });
        }
    }

    switchOffTracking() {
        var b = g("pauseButton");
        b.innerHTML = "<img src='img/tracking.png'/>";
        b.title = "Move the map as you walk";
        this.paused = true;
        flashMessage(s("trackingSuspended", "Tracking location suspended"));
        setCookie("tracking", "off");
        this.showState("white");

        stopIncrementalUpdate();
        this.stopLocationTracking();
    }

    startLocationTracking() {
        appInsights.trackEvent({ name: "startTracking", properties: { project: window.project.id } });
        if (!navigator.geolocation) {
            alert("Sorry - Your browser doesn't support location tracking");
            return false;
        }
        navigator.geolocation.getCurrentPosition(updatePosition,
            (error) => {
                this.showStateError(error);
                if (error.code == error.PERMISSION_DENIED) {
                    alert("You need to allow this website to track your location");
                    this.switchOffTracking();
                }
            }
        );
        this.navigatorWatch = navigator.geolocation.watchPosition(
            updatePosition,
            // Not much we can do if GPS returns an error, other than try again later:
            (error) => {
                this.showStateError(error);
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

    stopLocationTracking() {
        appInsights.trackEvent({ name: "stopTracking", properties: { project: window.project.id } });
        navigator.geolocation.clearWatch(this.navigatorWatch);
    }

    showState(c) {
        g("pauseButton").style.backgroundColor = c;
    }
    showStateError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                this.showState("pink");
                break;
            case error.POSITION_UNAVAILABLE: this.showState("blue"); break;
            case error.TIMEOUT: this.showState("lightblue"); break;
            default: this.showState("red"); break;
        }
    }
}

class VisitList {
    constructor() {
        this.visits = getCookieObject("visits") || [];
    }

    visit(place) {
        this.visits.unshift({ place: place.id, when: Date.now() });
        if (this.visits.length > 20) {
            this.visits = this.visits.slice(0, 20);
        }
        setCookie("visits", JSON.stringify(this.visits), 1);
    }

    /** Was place visited recently? 
     * @param {Place} place 
     * @param {number} maxIntermediates Return true only if maxIntermediates or fewer places visited since
     * @returns Minutes since visit
    */
    visited(place, maxIntermediates) {
        let vix = this.visits.findIndex(v => place.id == v.place.id);
        if (vix < 0) return null;
        if (vix > maxIntermediates) return null;
        return (Date.now - this.visits[vix].when) / 60000;
    }
}
