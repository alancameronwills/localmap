describe("Smoke tests", () => { 
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot"); 
    // put {"site":"local"} or ..."live"} in cypress.env.json

    it("loads OSM map and shows index", () => {
        cy.visit(site+"/?cartography=osm");
        cy.get("#continueButton", { timeout: 8000 }).then(b=>{b.click();});
        cy.get('.gm-control-active[title="Zoom in"', { timeout: 30000 }); // OSM up
        cy.contains("New!");
        cy.contains("Cymraeg").click();
        cy.contains("Newydd!");
        cy.contains("English").click();
    });

})