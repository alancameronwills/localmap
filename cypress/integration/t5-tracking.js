import { MapTest } from "../bits/MapTest.js";

describe("Links to places", function () {
    it("Can click tracking", function () {
        let mapTest = new MapTest(this);
        cy.get("#pauseButton").click();
        cy.wait(10000); // shouldn't fall over
    })
})