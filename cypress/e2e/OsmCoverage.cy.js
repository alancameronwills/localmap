describe("OSM Test", function () { 
    it("loads OSM map and shows index", function () {
        cy.visit(this.site+"/?cartography=osm");
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get('.gm-control-active[title="Zoom in"]', { timeout: 30000 }); // OSM up
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
    });

})