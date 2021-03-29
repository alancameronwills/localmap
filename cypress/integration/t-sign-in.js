describe("Sign in tests", () => { 
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot"); 
    // put {"site":"local"} or ..."live"} in cypress.env.json

   
    it("Can sign in", () => {
        cy.visit(site + "?project=8dwn40fvv2");
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.wait(2000);
        cy.get("#signInButtonTop", { timeout: 10000 }).click();
        cy.get("#consent").click();
        cy.get(".button[value^='Microsoft']").click();
        cy.visit(site + "?project=8dwn40fvv2");
    });
    
  
})