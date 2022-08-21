// Splash screen 

class SplashScreen {
    constructor() {
        this.permits = {};
        setTimeout(() => { this.permitDrop("minimum show time"); }, 2000);

        this.onDropActions = [];

        if (Date.now() - getCookie("viewed") < 86400000) {
            this.permitDrop("recently viewed");
        } else if (window.location.queryParameters.nosplash) {
            this.permitDrop("nosplash");
        }
    }

    enableCloseButtons() {
        if (!window.maintenance) {
            let buttons = document.getElementsByClassName("splashCloser");
            for (let button of buttons) {
                show(button);
            }
        }
        /*show("splashCloseX");
        show("continueButton");*/
        hide("loadingFlag");
    }

    permitDrop(clue) {
        appInsights.trackEvent({ name: "loading", measurements: { duration: (Date.now() - window.loadingTimer) / 1000 } });
        let p = this.permits;
        p[clue] = 1;
        if (p["places loaded"] && p["minimum show time"] &&
            (p["parameter goto"] || p["api goto"] || p["no user"] || p["signed in"] || p["recently viewed"] || p["nosplash"])) {
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
            goto(placeKey, null, "auto", !window.placeToGo || window.placeToGo.show, null, null, true);
        }
        setCookie("viewed", "" + Date.now());
        this.doOnDropActions();
    }

    get isShowing() {
        return g("splash").style.display != "none";
    }

    onDrop(f) {
        this.onDropActions.push(f);
        if (!this.isShowing) this.doOnDropActions();
    }

    doOnDropActions() {
        while (this.onDropActions.length) {
            this.onDropActions.pop()();
        }
    }
}
