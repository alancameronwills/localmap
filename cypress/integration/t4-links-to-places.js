import { MapTest } from "../bits/MapTest.js";

describe("Links to places", function () {

    it("Can get sharing link and use it", function () {
        let mapTest = new MapTest(this);
        mapTest.addPlaceAtPostcode("SE10 9NN", (editor) => {
            editor.textInput("Test place", "ego");
            cy.get("#getLinkButton").click();
            cy.get("#msgbox").then($m => {
                cy.wrap($m.val()).as("placeLink");
                cy.get("#message").click(1, 1); // close msg
            })
        // Perform next bit in then() because we're using the alias 'link' 
        }).then(() => {
            // Re-open window on shared place link:
            mapTest.visit(this.placeLink);
            cy.get(".infoBox").should("have.text", "Test place");
        });
    });

    // Depends on wired-in RowKey of Modern Meridian place:
    it("Can find place from iframe API", function () {
        let mapTest = new MapTest(this);
        // Open one place and check content, but not for editing:
        mapTest.openEditorViaAPI('8dwn40fvv2%7C320501040707199024165', 1, "Modern meridian", true)
        // Open another place and check content, then delete:
        let testId = this.placeLink.replace(/^.*=/, "");
        mapTest.openEditorViaAPI(testId, 0, "Test place", false, editor => {
            editor.textInput("{del}");
        });
    });


})