import { MapTest } from "../bits/MapTest";

describe("Google Coverage Test", function () { 

    it("Load Google Map and pause to check coverage", function () {
        let mapTest = new MapTest(this, {project:"folio"});
        // Index click fails
        cy.get('.groupHead[title="Streets"]', { timeout: 8000 }).should("be.visible").click();
        //cy.get("#sub\\#Streets ").should("be.visible");
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
        
    });

})