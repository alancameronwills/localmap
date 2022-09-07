/*
    To run tests on local machine, set site:"local" in cypress.env.json
    this.site is set in ../support/index.js
    See https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Sharing-Context
*/
import { MapTest } from "../bits/MapTest.js";

describe("t1: Map loads, index shows", function () {

    function incrementalZoom() {
        cy.window().then(win =>{
            let initialZoom = win.map.Zoom;
            cy.wait(5000).then(()=>{
                expect(win.map.Zoom, "incremental zoom after index selection").to.be.gt(initialZoom);
                console.log("zoomed " + initialZoom + " - " + win.map.Zoom) 
            })
        })
    }

    it("loads Google map and shows index", function () {
        let mapTest = new MapTest(this, { project: "folio" });
        cy.get('.groupHead[title="Streets"]', { timeout: 8000 }).should("be.visible").click();
        mapTest.mapShowingIs("osmOS");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("googleSat");
        cy.get("#mapbutton").click();
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("google1900");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("google1950");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("osmOS");
        mapTest.indexClickPath(["Cemeteries"], "Sutton Coldfield Cemetery");
        incrementalZoom();
    });

    it("loads Bing map, can switch languages, toggle OS map and aerial, opens place from index", function () {
        let mapTest = new MapTest(this, { project: "garn+fawr" });
        cy.contains("New!");
        cy.contains("Cymraeg").click();
        cy.contains("Newydd!");
        cy.contains("English").click();
        mapTest.mapShowingIs("bingOS");
        cy.get("#mapbutton").click();
        // with overlay:
        mapTest.mapShowingIs("bingOS");
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("bingSat");
        // old map overlay here
        mapTest.indexClickPath(['Other\\ maps'], 'Sutton Coldfield');
        cy.get("#lightbox #lbTitle").should("be.visible");
        //incrementalZoom();
    });

    it("loads OSM map and shows index", function () {
        let mapTest = new MapTest(this, { project: "", cartography: "osm" });
    });

    it("opens place directly showing text, closes text and index, re-opens index", function () {
        let mapTest = new MapTest(this, {
            project: "Garn Fawr",
            place: "Garn+Fawr%7C22958215767478787397"
        });
        cy.get("#mapbutton").click();
        mapTest.mapShowingIs("bingOS");
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        cy.get("#indexSidebar").contains("Sutton Coldfield").should("be.visible");
        cy.get("#theMap").click(300, 100);
            cy.get("#lightbox #lbTitle").should("not.be.visible");
            cy.get("#indexSidebar").should("not.be.visible");
        
        cy.get("#indexFlag").click();
        cy.get("#indexSidebar").should("be.visible");
    });

    it("Cartography chooses Google map; clicking place shows text", function () {
        let mapTest = new MapTest(this, {
            project: "Garn%20Fawr",
            place: "Garn+Fawr%7C22958215767478787397",
            cartography: "google"
        });
        cy.wait(16000); // wait for auto zoom
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        cy.get("#indexSidebar").contains("Sutton Coldfield").should("be.visible");
        cy.get("#theMap").click(300, 300);
        cy.get("#lightbox #lbTitle").should("not.be.visible");
        cy.get("#indexSidebar").should("not.be.visible");
        //cy.get("button[title='Zoom in']").click().click();

        cy.get("div[aria-label='Sutton Coldfield']").then(b => {b.click();

        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        cy.get("#lightboxBack").click();
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("not.be.visible");
        });
    })

})