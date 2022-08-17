import { MapTest } from "../bits/MapTest.js";


describe("Right Click Test", function() {

    it("Load Google Map and check right click menu", function() {
        let mapTest = new MapTest(this);
        mapTest.indexContains("Modern meridian", 1);
        cy.wait(1000);
        cy.get('#theMap').rightclick();       // Right click on the map
        cy.get('.gm-style-iw').should('be.visible');
        cy.wait(1000);
        cy.get('#theMap').click("right");
        cy.get('.gm-style-iw').should('not.exist');
    });

})