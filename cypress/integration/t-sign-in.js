describe("Sign in tests", function () {    
    it("Can sign in", function () {
        cy.visitTestProject();
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.wait(2000);
    });

    it("Can add a place", function () {
        cy.visitTestProject();
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        // Initial place - don't edit this:
        cy.get("#indexSidebar").contains("Modern meridian").should("be.visible");
        cy.get(".indexPlaceContainer").should("have.length", 1);
        // Shift map a bit to avoid stacking places:
        cy.get("#addressSearchBox").type("SE10 8XJ\n");
        cy.get('#addPlaceButton').click(); // Open editor
        cy.get('#petri').click(); // Geo tag
        cy.get('#popuptext').type("Test item 1").should('have.text', "Test item 1");
        cy.get("#popclose").click();
        cy.get("#popup").should("not.be.visible");
        // Check it appears in the index:
        cy.get(".indexPlaceContainer").should("have.length", 2);
        cy.get("#indexSidebar").contains("Test item 1").should("be.visible");
        
        // Check it's still there when we refresh:
        cy.visit(this.site + `?project=${this.TestProjectId}`);
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        cy.get(".indexPlaceContainer").should("have.length", 2);
        cy.get("#indexSidebar").contains("Test item 1").should("be.visible");

    })

    it("Can edit a place", function () {
        cy.visitTestProject();

        // Use the index to find the place we just made, and open the editor:
        cy.get("#searchButton").type("test item\n");
        cy.get(".infoBox").should("be.visible").click();
        cy.get("#lightbox").should("be.visible");
        cy.get("#lightboxEditButton").should("be.visible").click();
        cy.get("#popup").should("be.visible");

        // Edit the text of the place:
        cy.get('#popuptext').should('have.text', "Test item 1").type("{selectall}Updated item 1");
        cy.get("#popclose").click();
        cy.get("#popup").should("not.be.visible");
        //cy.get("#indexFlag").click();

        // Check the index has changed:
        // But at first, still got the old search term, so index is empty:
        cy.get(".indexPlaceContainer").should("have.length", 0);
        cy.get("#searchCancel").click();
        cy.get(".indexPlaceContainer").should("have.length", 2);
        cy.get(".indexPlaceContainer").contains("Updated item 1").should("exist");
    })

    
    it("Can add a picture to a place", function () {
        cy.visitTestProject();

        // Find and edit the place we created previously:
        cy.get("#searchButton").type("updated item\n");
        cy.get(".infoBox").click();
        cy.get("#lightboxEditButton").click();

        // Add pic
        cy.get('#addPicToPlaceButton').click();
        
    cy.fixture('test-pic-1.jpg').then(fileContent => {
        cy.get('#uploadToPlaceButton').attachFile({
            fileContent: fileContent.toString(),
            fileName: 'test-pic-1.jpg',
            mimeType: 'image/png'
        });
    });
        
    })

    it("Can delete a place", function () {
        cy.visitTestProject();

        // Find and edit the place we created previously:
        cy.get("#searchButton").type("updated item\n");
        cy.get(".infoBox").click();
        cy.get("#lightboxEditButton").click();

        // Delete all its text:
        cy.get('#popuptext').type("{selectall}{del}");
        cy.get("#popclose").click();

        // Check index has changed:        
        cy.get("#searchCancel").click();
        cy.get(".indexPlaceContainer").should("have.length", 1);
        cy.get(".indexPlaceContainer").contains("Modern meridian").should("exist");

        // Check it's still like that after refresh:
        cy.visit(this.site + `?project=${this.TestProjectId}`);
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        cy.get(".indexPlaceContainer").should("have.length", 1);
        cy.get(".indexPlaceContainer").contains("Modern meridian").should("exist");
    })

})