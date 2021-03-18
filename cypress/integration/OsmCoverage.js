describe("OSM Test", () => { 
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot"); 
    // put {"site":"local"} or ..."live"} in cypress.env.json

    it("loads OSM map and shows index", () => {
        cy.visit(site+"/?cartography=osm");
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get('.gm-control-active[title="Zoom in"]', { timeout: 30000 }); // OSM up
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
    });

})