import { MapTest } from "../bits/MapTest.js";

describe("Links to places", function () {

    function testWith1ExtraPlace(testRunner, restOfTest) {
        let mapTest = new MapTest(testRunner);
        mapTest.addPlaceAtPostcode("SE10 9NN", (editor) => {
            editor.textInput("Test place", "ego");
            cy.get("#getLinkButton").click();
            cy.get("#msgbox").then($m => {
                cy.wrap($m.val()).as("placeLink");
                cy.get("#message").click(1, 1); // close msg
            })
        }).then(()=>restOfTest(mapTest));
    }

    it("Can get sharing link and use it", function () {
        testWith1ExtraPlace(this, (mapTest) => {
            // Re-open window on shared place link:
            mapTest.visit(this.placeLink);
            cy.get(".infoBox").should("have.text", "Test place");
        });
    });

    it("Can respond to window API", function () {
        testWith1ExtraPlace(this, (mapTest) => {
            // Depends on wired-in RowKey of Modern Meridian place:
            // Open one place and check content, but not for editing:
            mapTest.openEditorViaAPI('8dwn40fvv2%7C320501040707199024165', 1, "Modern meridian", true)
            // Open another place and check content, then delete:
            let testId = this.placeLink.replace(/^.*=/, "");
            mapTest.openEditorViaAPI(testId, 0, "Test place", false, editor => {
                editor.textInput("{del}");
            });
        });
    });


})