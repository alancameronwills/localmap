import { MapTest } from "../bits/MapTest.js";

describe("cartography-test: Cartography choices", function () {

    // The cartography dropdown itself is only visible to signed-in admins, so
    // test the query parameter it sets instead.
    it("honours the cartography query parameter", function () {
        let mapTest = new MapTest(this, { noClearDB: true, cartography: "osm" });
        mapTest.mapShowingIs("osmOS");
        // cartography=google needs a valid Google Maps API key - not currently
        // testable. Bing was retired by Microsoft in 2025.
    });

    it("toggles through base maps with the map button", function () {
        let mapTest = new MapTest(this, { noClearDB: true });
        // Default map choices are roadmap, satellite, os1900map:
        mapTest.mapShowingIs("osmOS");
        cy.get("#mapbutton").should("be.visible").click();
        mapTest.mapShowingIs("osmSat");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("osm1900");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("osmOS");
    });
});
