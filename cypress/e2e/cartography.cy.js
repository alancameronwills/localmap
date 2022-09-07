import { MapTest } from "../bits/MapTest.js";

describe("cartography-test: Cartography dropdown", function () {
        
    it("gets cartography dropdown and can change to new cartography", function () {
        let mapTest = new MapTest(this);
        cy.get('#cartographyButton').should("be.visible").click();
        cy.get('#mapDropdown').should("be.visible");
        cy.get('#dropdownSelection3').click();
        mapTest.mapShowingIs("osmOS");
        cy.get('#cartographyButton').should("be.visible").click();
        cy.get('#mapDropdown').should("be.visible");
        cy.get('#dropdownSelection2').click();
        mapTest.mapShowingIs("bingOS");
        cy.get('#cartographyButton').should("be.visible").click();
        cy.get('#mapDropdown').should("be.visible");
        cy.get('#dropdownSelection1').click();
        mapTest.mapShowingIs("osmOS");
    });
});
