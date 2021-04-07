import { MapTest } from "../bits/MapTest.js";

describe("Sign in tests", function () {

    it("Can sign in", function () {
        let mapTest = new MapTest(this);
        cy.wait(2000);
    });

    it("Can add a place", function () {
        let mapTest = new MapTest(this);
        // Initial place - don't change this place:
        mapTest.indexContains("Modern meridian", 1);
        // Shift map a bit to avoid stacking places:
        mapTest.addPlaceAtPostcode("SE10 8XJ", () => {
            mapTest.editorInput("Test item 1", "#petri");
        });
        mapTest.indexContains("Test item 1", 2);

        // Check it's still there when we refresh:
        mapTest.visit();
        mapTest.indexContains("Test item 1", 2);
    });

    it("Can edit a place", function () {
        let mapTest = new MapTest(this);
        mapTest.openEditorFromIndex("Test item", () => {
            mapTest.editorInput("Updated item 1");
            // But at first, still got the old search term, so index is empty:
            //mapTest.indexContains(null, 0);
        });

        // Check the index has changed:
        // Clear the index search and check again:
        mapTest.indexContains("Updated item 1", 2);
    });

    /*

    it("Can add a picture to a place", function () {
        let mapTest = new MapTest(this);
        mapTest.visit();

        // Find and edit the place we created previously:
        cy.get("#searchButton").type("updated item\n");
        cy.get(".indexPlaceContainer").contains("Updated item").click();
        cy.get(".infoBox").should("be.visible").click();
        cy.get("#lightboxEditButton").click();

        // Add pic
        //cy.get('#addPicToPlaceButton').click();

        
        cy.wait(20000);

    })
    */


    it("Can delete a place", function () {
        let mapTest = new MapTest(this);

        // Find and edit the place we created previously:
        mapTest.openEditorFromIndex("Updated item", () => {
            // Delete all its text:
            mapTest.editorInput("{del}");
        });
        // Place is gone from index:
        mapTest.indexContains("Modern meridian", 1);

        // Check it's still like that after refresh:
        mapTest.visit();
        mapTest.indexContains("Modern meridian", 1);
    });

})