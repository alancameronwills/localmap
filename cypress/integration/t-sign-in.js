describe("Sign in tests", function () {    
    it("Can sign in", function () {
        cy.visit(this.site + `?project=${this.TestProjectId}`);
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.wait(2000);
    });

    it("Can add a place", function () {
        cy.visit(this.site + `?project=${this.TestProjectId}`);
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        cy.get("#indexSidebar").contains("Modern meridian").should("be.visible");
        cy.get(".indexPlaceContainer").should("have.length", 1);
        cy.get("#addressSearchBox").type("SE10 8XJ\n");
        cy.get('#addPlaceButton').click();
        cy.get('#petri').click();
        cy.get('#popuptext').type("Test item 1").should('have.text', "Test item 1");
        cy.get("#popclose").click();
        cy.get("#popup").should("not.be.visible");
        cy.get(".indexPlaceContainer").should("have.length", 2);
        cy.get("#indexSidebar").contains("Test item 1").should("be.visible");
        
        // Check it's still there when we refresh:
        cy.visit(this.site + `?project=${this.TestProjectId}`);
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        cy.get(".indexPlaceContainer").should("have.length", 2);
        cy.get("#indexSidebar").contains("Test item 1").should("be.visible");

    })
})