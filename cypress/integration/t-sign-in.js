describe("Sign in tests", function () {    
    it("Can sign in", function () {
        cy.visit(this.site + `?project=${this.TestProjectId}`);
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.wait(2000);
    });
    
  
})