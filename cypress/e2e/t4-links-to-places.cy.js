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

    // Look up a place's "project|rowKey" id from (part of) its title.
    function placeIdByTitle(part) {
        return cy.window().then(win =>
            Object.values(win.Places).find(p => p.Title && p.Title.includes(part)).id);
    }

    it("Can respond to the gotoPlace window API", function () {
        let mapTest = new MapTest(this);
        mapTest.indexContains("Modern meridian", 1);

        // Display an existing place (which has a picture) by posting gotoPlace:
        placeIdByTitle("Modern meridian").then(id => {
            mapTest.openEditorViaAPI(id, 1, "meridian");
        });
        cy.get("#lightboxBack").click();

        // Create an editable place (with body text so the lightbox opens),
        // then open it for editing via the API and delete it:
        mapTest.addPlaceAtPostcode("SE10 9NN", (editor) => {
            editor.textInput("API place{enter}Body text for the API test place", "ego");
        });
        mapTest.indexContains("API place", 2);
        placeIdByTitle("API place").then(id => {
            mapTest.openEditorViaAPI(id, 0, "API place", editor => {
                editor.textInput("{del}");
            });
        });
        mapTest.indexContains("Modern meridian", 1);
    });

    it("Use a view URL", function() {
        let mapTest = new MapTest(this, {project:"folio", splash:true,
            url:
            this.site + 
            "?project=Folio&view=%7B%22n%22%3A52.562110281842706%2C%22e%22%3A-1.8242518490390025%2C%22z%22%3A20%2C%22mapChoice%22%3A2%2C%22mapBase%22%3A%22google%22%7D"
         });

    })

    it("Open on a tour", function () {
        let mapTest = new MapTest(this);
        // Add a second place to tour alongside the seed place:
        mapTest.addPlaceAtPostcode("SE10 9NN", (editor) => {
            editor.textInput("Tour place", "ego");
        });
        mapTest.indexContains("Tour place", 2);

        // Move the map far away so the tour has to bring both places into view:
        cy.get("#addressSearchBox").type("{selectall}SA43 3BU\n");
        cy.wait(2000);

        // Post a tour of both places:
        cy.window().then(win => {
            let places = Object.values(win.Places)
                .filter(p => p.Title && (p.Title.includes("Modern meridian") || p.Title.includes("Tour place")))
                .map(p => p.id);
            win.postMessage({ op: "tour", places: places }, "*");
        });

        cy.get("div[aria-label='Modern meridian']", { timeout: 10000 }).should("be.visible");
        cy.get("div[aria-label='Tour place']", { timeout: 10000 }).should("be.visible");

        // Clean up the place we created:
        mapTest.openEditorFromIndex("Tour place", (editor) => editor.textInput("{del}"));
        mapTest.indexContains("Modern meridian", 1);
    });

})