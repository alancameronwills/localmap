import { MapTest } from "../bits/MapTest.js";

describe("Tracking", function () {
    it("Can click tracking", function () {
        let mapTest = new MapTest(this);
        cy.get("#pauseButton").click();
        cy.wait(10000); // shouldn't fall over
    })

    it("Pops a place", function () {
        let mapTest = new MapTest(this);
        cy.window().then(win => {
            // Simulate tracking button pressed:
            win.paused = false;
            // Simulate effect of polling geoloc:
            win.updatePosition({ coords: { latitude: 51.477, longitude: 0 } });
            mapTest.checkLightBox(1, "meridian");
            cy.wait(2000).then(() => {
                win.updatePosition({ coords: { latitude: 51.4, longitude: 0 } });
                // Should be no change:
                cy.get("#lightbox", { timeout: 10 }).should("contain.text", "meridian").then(() => {
                    // Allow for throttling:
                    cy.wait(2000);
                    // Close lightbox:
                    cy.get("#lightboxBack").click().then(() => {
                        win.updatePosition({ coords: { latitude: 51.477, longitude: 0 } });
                        cy.get("#lightbox").should("not.be.visible");
                    })
                })
            });
        });
    })

    it("Pops a place in Bing", function () {
        let mapTest = new MapTest(this, {cartography:"bing"});
        cy.window().then(win => {
            // Simulate tracking button pressed:
            win.paused = false;
            // Simulate effect of polling geoloc:
            win.updatePosition({ coords: { latitude: 51.477, longitude: 0 } });
            mapTest.checkLightBox(1, "meridian");
            cy.wait(2000).then(() => {
                win.updatePosition({ coords: { latitude: 51.4, longitude: 0 } });
                // Should be no change:
                cy.get("#lightbox", { timeout: 10 }).should("contain.text", "meridian").then(() => {
                    // Allow for throttling:
                    cy.wait(2000);
                    // Close lightbox:
                    cy.get("#lightboxBack").click().then(() => {
                        win.updatePosition({ coords: { latitude: 51.477, longitude: 0 } });
                        cy.get("#lightbox").should("not.be.visible");
                    })
                })
            });
        });
    })


    function testWith1ExtraPlace(testRunner, restOfTest) {
        let mapTest = new MapTest(testRunner);
        cy.window().then(win => {win.map.moveTo(-0.001776, 51.478795, 0, 0);
        mapTest.addPlaceAtCentre((editor) => {
            editor.textInput("Test place", "ego");
            cy.get("#getLinkButton").click();
            cy.get("#msgbox").then($m => {
                cy.wrap($m.val()).as("placeLink");
                cy.get("#message").click(1, 1); // close msg
            })
        }).then(() => restOfTest(mapTest));});
    }

    it("Pops nearest place", function () {
        testWith1ExtraPlace(this, function (mapTest) {
            cy.window().then(win => { 
                win.paused = false; 
                win.updatePosition({ coords: { latitude: 51.478768, longitude: -0.000939 } });
                mapTest.checkLightBox(0, "Test place");
            })
            cy.window().then(win => {
                win.paused = false; 
                win.updatePosition({ coords: { latitude: 51.477940, longitude: 0.001143 } });
                mapTest.checkLightBox(1, "meridian");
            })
            cy.get("#lightboxBack").click();
            cy.window().then(win => {
                win.paused = false;
                win.updatePosition({ coords: { latitude: 51, longitude: 0 } });
                cy.wait(500);
                cy.get("#lightbox").should("not.be.visible");
            })            
        })
    });

})