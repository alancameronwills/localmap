import { MapTest } from "../bits/MapTest.js";

describe("t1: Map loads, index shows", function () {
        
    it("gets cartography dropdown and can change to new cartography", function () {
        let mapTest = new MapTest(this);
        cy.get('.dropbtn').should("be.visible").click();
        cy.get('#mapDropdown').should("be.visible");
        cy.get('#dropdownSelection3').click();
        mapTest.mapShowingIs("osmOS");
        cy.get('.dropbtn').should("be.visible").click();
        cy.get('#mapDropdown').should("be.visible");
        cy.get('#dropdownSelection2').click();
        mapTest.mapShowingIs("bingOS");
        cy.get('.dropbtn').should("be.visible").click();
        cy.get('#mapDropdown').should("be.visible");
        cy.get('#dropdownSelection1').click();
        mapTest.mapShowingIs("google1950");
    });
});
