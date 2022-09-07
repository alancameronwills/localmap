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

    it("Use a view URL", function() {
        let mapTest = new MapTest(this, {project:"folio", splash:true,
            url:
            this.site + 
            "?project=Folio&view=%7B%22n%22%3A52.562110281842706%2C%22e%22%3A-1.8242518490390025%2C%22z%22%3A20%2C%22mapChoice%22%3A2%2C%22mapBase%22%3A%22google%22%7D"
         });

    })

    it("Open on a tour", function () {
        testWith1ExtraPlace(this, (mapTest) =>{
            // ... having set up an extra place

            // Move map elsewhere
            cy.get("#addressSearchBox").type("{selectall}SA43 3BU\n");
            cy.wait(2000);

            // Set tour to include two places
            let testId = this.placeLink.replace(/^.*=/, "");
            let placeIdSet = ["8dwn40fvv2|320501040707199024165", testId.replace("%7C", "|")];
            cy.window().then(win => win.postMessage({
                op: "tour",
                places: placeIdSet
            }, "*"));
            
            cy.get("div[aria-label='Modern meridian']").should("be.visible");
            cy.get("div[aria-label='Test place']").should("be.visible");
        })
    })

})