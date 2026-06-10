describe("Default project Coverage Test", function () {

    it("loads map of default (bing-configured) project", function () {
        cy.visit(this.site);
        cy.get("#continueButton", { timeout: 30000 }).then(b => { b.click(); });
        // bing projects get Azure Maps or osm bases, both on the Google engine:
        cy.get(".gm-control-active[title='Zoom in']", { timeout: 20000 }); // map up
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
        cy.get("#splash").should("be.visible");
        cy.get("#splash", {timeout:30000}).should("not.be.visible");
    });

})
