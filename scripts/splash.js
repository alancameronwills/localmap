// Splash screen

class SplashScreen {
    constructor() {
        this.permits = {};
        setTimeout(() => { this.permitDrop("minimum show time"); }, 2000); 
        
        if (Date.now() - getCookie("viewed") < 86400000) {
            this.permitDrop("recently viewed");
        }
    }

    permitDrop(clue) {
        appInsights.trackEvent({ name: "loading", measurements: { duration: (Date.now() - window.loadingTimer) / 1000 } });
        let p = this.permits;
        p[clue] = 1;
        if (p["places loaded"] && p["minimum show time"] &&
            (p["parameter goto"] || p["api goto"] || p["no user"] || p["signed in"] || p["recently viewed"])) {
            log("dropSplash " + clue);
            this.dropSplash();
        } else {
            log("permitDropSplash " + clue);
        }
    }

    dropSplash() {
        appInsights.trackEvent({ name: "dropSplash" });
        hide("splash");
        let placeKey = window.placeToGo && window.placeToGo.place || window.location.queryParameters.place;
        if (placeKey) {
            goto(placeKey, null, "auto", !window.placeToGo || window.placeToGo.show);
        }
        setCookie("viewed", "" + Date.now());
    }
}
