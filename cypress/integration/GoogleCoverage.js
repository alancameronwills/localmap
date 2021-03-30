describe("Google Coverage Test", () => { 
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot"); 
    // put {"site":"local"} or ..."live"} in cypress.env.json

    it("Load Google Map and pause to check coverage", () => {
        cy.visit(site+"/?project=folio");
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        // Index click fails
        cy.get('.groupHead[title="Streets"]', { timeout: 8000 }).should("be.visible").click();
        //cy.get("#sub\\#Streets ").should("be.visible");
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
        
    });

})