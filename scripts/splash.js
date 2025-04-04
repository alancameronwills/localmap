// Splash screen 

class SplashScreen {
    constructor(id) {
        this.projectId = id;
        this.permits = {};
        setTimeout(() => { this.permitDrop("minimum show time"); }, 2000);

        this.onDropActions = [];

        if (Date.now() - getCookie("viewed") < 86400000) {
            this.permitDrop("recently viewed");
        } else if (window.location.queryParameters.nosplash) {
            this.permitDrop("nosplash");
        }
    }
    async show () {
        //g("splashScreen").innerHTML = window.project.splash.join("\n");
        g("splashScreen").innerHTML = await fetch(`./projects/${this.projectId.toLowerCase()}.html?v=${window.version}`)
            .then(r=>r.text());

        g("curtain").style.opacity = 0;
        setTimeout(() => {
            g("curtain").remove();
        }, 1000);
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
        if (!window.maintenance) {
            appInsights.trackEvent({ name: "dropSplash" });
            hide("splash");
            let placeKey = window.placeToGo && window.placeToGo.place || window.location.queryParameters.place;
            if (placeKey) {
                goto(placeKey, null, "auto", !window.placeToGo || window.placeToGo.show, null, null, true);
            }
            setCookie("viewed", "" + Date.now());
            this.doOnDropActions();
        }
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
