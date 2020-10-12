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

let projectQuery = location.queryParameters["project"] || "";
let placeQuery = location.queryParameters["place"] || "";

if (!projectQuery && placeQuery) {
    let placeproject = placeQuery.split("|")[0];
    if (placeproject) projectQuery = placeproject;
}

switch (projectQuery.toLocaleLowerCase()) {
    case "trefdraeth":
        window.project = {
            id: "Trefdraeth", // PrimaryKey in places table
            splashId: "trefdraethSplash",
            loc: { n: 52.016392, e: -4.836004, z: 15, mapType: "a", mapBase: "bing" },
            welsh: true,
            instantContributor: true,
            admin: "map@pantywylan.org",
            title: "Newport Pembrokeshire",
            org: "Newport",
            terms: "hhttps://www.newport-pembs.co.uk/wp-content/uploads/2020/06/Website-bilingual-270819-1.pdf",
            intro: "https://www.newport-pembs.co.uk/wp-content/uploads/2020/06/Website-bilingual-270819-1.pdf",
            cartography: "bing",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals" },
                { id: "pop", name: "Arts", color: "#ff0000", tip: "Writing, music, architecture, painting, ..." },
                //{ id: "built", name: "Built", color: "#40ff40", tip: "Architecture, roads" },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was" },
                { id: "ego", name: "Me", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas" }]
        };
        break;
    case "folio":
        window.project = {
            id: "Folio", // PrimaryKey in places table
            splashId: "folioSplash",
            loc: { n: 52.562132, e: -1.822827, z: 14, mapType: "a", mapBase: "google" },
            welsh: false,
            instantContributor: true,
            admin: "map@foliosuttoncoldfield.org.uk",
            title: "Telling Sutton's Stories",
            org: "Folio",
            terms: "http://foliosuttoncoldfield.org.uk/telling-suttons-stories-terms/",
            intro: "http://foliosuttoncoldfield.org.uk/telling-suttons-stories/",
            cartography: "google",
            tags: [
                { id: "petri", name: "Geo", color: "#909090", tip: "The earth" },
                { id: "flora", name: "Nature", color: "#a000a0", tip: "Plants and animals" },
                { id: "pop", name: "Arts", color: "#ff0000", tip: "Writing, music, architecture, painting, ..." },
                //{ id: "built", name: "Built", color: "#40ff40", tip: "Architecture, roads" },
                { id: "arch", name: "History", color: "#40a0ff", tip: "Life as it was" },
                { id: "ego", name: "Me", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas" }]
        };
        break;
    default:
        // (52.008144, -5.067547), //Garn Fawr   //(51.782365, -5.101158), // Broadhaven // 51.799447, -4.744831), // Span 
        window.project = {
            id: "Garn Fawr",
            splashId: "spanSplash",
            loc: { n: 51.855912, e: -4.920331, z: 11, mapType: "os", mapBase: "bing" },
            welsh: true,
            instantContributor: true,
            title: "Map Digi Penfro",
            org: "Span Arts",
            admin: "mapdigipenfro@span-arts.org.uk",
            intro: "http://www.span-arts.org.uk/news/help-us-add-to-the-span-deep-map-map-digi-penfro/#.Xu09q2hKiUl",
            terms: "privacy.html",
            cartography: "bing",
            tags: [
                { id: "fauna", name: "Anifeiliaid", color: "#a00000", tip: "Anything that moves" },
                { id: "flora", name: "Planhigion", color: "#00a000", tip: "Botany" },
                { id: "petri", name: "Cerrig", color: "#909090", tip: "Geology" },
                { id: "pop", name: "Pobl", color: "#c0a000", tip: "History, archaeology, stories" },
                { id: "met", name: "Tywydd", color: "#40a0ff", tip: "Sea, sky, climate" },
                { id: "ego", name: "Fi", color: "#ffff00", tip: "Notes, memoirs, feelings, ideas" }]
        };
        break;
}
let titleElements = document.getElementsByTagName("title");
if (titleElements.length > 0 && window.project.title) {
    titleElements[0].innerHTML = window.project.title;
}
