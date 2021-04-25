describe("Bing Coverage Test", function () {

    it("loads Bing map", function () {
        cy.visit(this.site);
        cy.get("#continueButton", { timeout: 30000 }).then(b => { b.click(); });
        cy.get("#ZoomInButton", { timeout: 20000 }); // Bing up
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
        cy.get("#splash").should("be.visible");
        cy.get("#splash", {timeout:30000}).should("not.be.visible");
    });

})