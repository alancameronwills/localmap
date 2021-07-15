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
                    goto(nearest.place.id, null, nearest.zoom, true, { e: pos.coords.longitude, n: pos.coords.latitude }, this);
                    appInsights.trackEvent({ name: "trackPlace", properties: { place: nearest.place.Title } });
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

    /** True if the caption of the audio "pic" specifies a recently visited place; or there is no caption.
     * Callback from goto().
     * @param caption {string} Trimmed spec in form: placeTitle < count
     * @param adioPic {Picture} Audio 
     */
    okToPlayAudio(caption, audioPic) {
        if (!caption.startsWith("#")) return true;
        let disjuncts = caption.substr(1).split("|");
        disjuncts.forEach(element => {
            let ee = element.split("<");
            let minutesSinceVisit = this.visitList.visited(ee[0].trim(), ee[1] || 0);
            if (minutesSinceVisit>0 && minutesSinceVisit < 60) return true;
        });
        return false;
    }

    /** User clicked tracking button, or ensure stop
     * @param stop {boolean} Stop or remain stopped
     */
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

    /** Private. UI turn off tracking */
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

    /** Private. Start client geolocation */
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

    /** Private. Stop client geolocation */
    stopLocationTracking() {
        appInsights.trackEvent({ name: "stopTracking", properties: { project: window.project.id } });
        navigator.geolocation.clearWatch(this.navigatorWatch);
    }

    /** Private. Set colour of tracking button
     * @param c {colourString} 
     */
    showState(c) {
        g("pauseButton").style.backgroundColor = c;
    }

    /** Private. Set colour of tracking button from client geolocation error code
     * @param error {Navigator error} 
     */
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

/** Persistent length-limited list of places */
class VisitList {
    constructor() {
        this.visits = getCookieObject("visits") || [];
    }

    /** Add a datestamped place to the list */
    visit(place) {
        this.visits.unshift({ place: place.Title, when: Date.now() });
        if (this.visits.length > 20) {
            this.visits = this.visits.slice(0, 20);
        }
        setCookie("visits", JSON.stringify(this.visits), 1);
    }

    /** Was a place visited recently? 
     * @param {string} placeTitle
     * @param {number} maxIntermediates Return true only if maxIntermediates or fewer places visited since
     * @returns Minutes since visit or -1
    */
    visited(placeTitle, maxIntermediates) {
        let vix = this.visits.findIndex(v => placeTitle == v.place.Title);
        if (vix < 0) return -1;
        if (vix > maxIntermediates) return -1;
        return (Date.now - this.visits[vix].when) / 60000;
    }
}
