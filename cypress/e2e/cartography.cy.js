import { MapTest } from "../bits/MapTest.js";

describe("cartography-test: Cartography choices", function () {

    // The cartography dropdown itself is only visible to signed-in admins, so
    // test the query parameter it sets instead. Bing was retired by Microsoft in 2025.
    it("honours the cartography query parameter", function () {
        let mapTest = new MapTest(this, { noClearDB: true, cartography: "osm" });
        mapTest.mapShowingIs("osmOS");
    });

    it("toggles through base maps with the map button (osm)", function () {
        let mapTest = new MapTest(this, { noClearDB: true, cartography: "osm" });
        // Default map choices are roadmap, satellite, os1900map:
        mapTest.mapShowingIs("osmOS");
        cy.get("#mapbutton").should("be.visible").click();
        mapTest.mapShowingIs("osmSat");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("osm1900");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("osmOS");
    });

    it("toggles through base maps with the map button (azure)", function () {
        let mapTest = new MapTest(this, { noClearDB: true, cartography: "azure" });
        cy.window().then(win => {
            if (!win.keys || !win.keys.Client_AzureMaps_K) {
                // Azure Maps key not configured yet: azure should fall back to osm
                mapTest.mapShowingIs("osmOS");
                return;
            }
            mapTest.mapShowingIs("azureRoad");
            cy.get("#mapbutton").should("be.visible").click();
            mapTest.mapShowingIs("azureSat");
            cy.get("#mapbutton").click();
            mapTest.mapShowingIs("osm1900");  // 1900 overlay comes from MapTiler on every cartography
            cy.get("#mapbutton").click();
            mapTest.mapShowingIs("azureRoad");
        });
    });

    // Keep the google test last: navigating away from a page with Google's base maps
    // throws a cross-origin SecurityError that fails whatever test follows.
    it("toggles through base maps with the map button (google)", function () {
        let mapTest = new MapTest(this, { noClearDB: true, cartography: "google" });
        // Google's roadmap choice also uses OSM tiles as base below zoom 20:
        mapTest.mapShowingIs("osmOS");
        cy.get("#mapbutton").should("be.visible").click();
        mapTest.mapShowingIs("googleSat");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("google1900");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("osmOS");
    });
});
