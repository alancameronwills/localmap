import { MapTest } from "../bits/MapTest.js";

describe("Links to places", function () {

    // IMHO this is more readable than .as():
    let link = null;
    it("Can get sharing link and use it", function () {
        let mapTest = new MapTest(this);
        mapTest.addPlaceAtPostcode("SE10 9NN", (editor) => {
            editor.textInput("Test place", "ego");
            cy.get("#getLinkButton").click();
            cy.get("#msgbox").then($m => {
                link = $m.val();
                cy.get("#message").click(1, 1); // close msg
            })
        });
        // Wait for editor to finish before refreshing:
        mapTest.indexContains("Test place", 2).then(() => {
            // Re-open window on shared place link:
            mapTest.visit(link).then(() => {
                cy.get(".infoBox").should("have.text", "Test place");
            });
        })
    });

    // Depends on wired-in RowKey of Modern Meridian place:
    it("Can find place from iframe API", function () {
        let mapTest = new MapTest(this);
        // Open one place and check content, but not for editing:
      //  mapTest.openEditorViaAPI('8dwn40fvv2%7C320501040707199024165', 1, "Modern meridian", true)
       // .then(() =>{
                // Open another place and check content, then delete:
                let testId = link.replace(/^.*=/, "");
                mapTest.openEditorViaAPI(testId, 0, "Test place", false, editor => {
                    editor.textInput("{del}");
                });
         //   });
    });


})