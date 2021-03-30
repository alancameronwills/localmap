describe("Bing Coverage Test", () => {
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot");
    // put {"site":"local"} or ..."live"} in cypress.env.json

    it("loads Bing map", () => {
        cy.visit(site);
        cy.get("#continueButton", { timeout: 30000 }).then(b => { b.click(); });
        cy.get("#ZoomInButton", { timeout: 10000 }); // Bing up
        cy.reload();
        cy.getCookie("mapView", { timeout: 5000 }).should("exist");
    });

})