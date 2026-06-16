import { MapTest } from "../bits/MapTest.js";

// Tag filtering: the "Tags" key panel filters the index down to places carrying
// a chosen tag. The project's tag ids drive both the editor tag buttons
// (#petri, #ego) and the key-panel swatches (#c<tagid>); "All" (#cpob) clears
// the filter. Untagged places (e.g. the seed place) pass every tag filter
// (HasTag is true when a place has no tags), so we assert on the tagged places.
describe("tags: filter the index by tag", function () {

    beforeEach(() => {
        cy.viewport(1200, 800); // desktop: keep the index sidebar open
    });

    // Open the tag key panel and click a swatch (the panel closes on click).
    function filterByTag(swatchId) {
        cy.get("#tagKeyButton").click();
        cy.get("#" + swatchId).should("be.visible").click();
    }

    it("filters the index to places with the selected tag", function () {
        let mapTest = new MapTest(this);
        mapTest.indexContains("Modern meridian", 1);

        // Two places with different tags, co-located so both stay in view:
        mapTest.addPlaceAtPostcode("SE10 9NN", (editor) => {
            editor.textInput("Rocks place", "petri");
        });
        mapTest.addPlaceAtPostcode(null, () => {
            // A new place inherits the previous place's tags (recentTags), so
            // petri is already on: toggle it off before switching to ego.
            cy.get("#petri").click();
            cy.get("#ego").click();
            cy.get("#popuptext").type("{selectall}Ego place").should("have.text", "Ego place");
        });
        cy.get("#indexSidebar").contains("Rocks place").should("be.visible");
        cy.get("#indexSidebar").contains("Ego place").should("be.visible");

        // Filter to the "petri" tag: only the petri place (and the untagged
        // seed place) remain; the ego-tagged place drops out:
        filterByTag("cpetri");
        cy.get("#indexSidebar").contains("Rocks place").should("be.visible");
        cy.get("#indexSidebar").should("not.contain.text", "Ego place");

        // Switch to the "ego" tag: now the petri place drops out:
        filterByTag("cego");
        cy.get("#indexSidebar").contains("Ego place").should("be.visible");
        cy.get("#indexSidebar").should("not.contain.text", "Rocks place");

        // "All" clears the filter — both places show again:
        filterByTag("cpob");
        cy.get("#indexSidebar").contains("Rocks place").should("be.visible");
        cy.get("#indexSidebar").contains("Ego place").should("be.visible");

        // Clean up the places we created:
        mapTest.openEditorFromIndex("Rocks place", (editor) => editor.textInput("{del}"));
        mapTest.openEditorFromIndex("Ego place", (editor) => editor.textInput("{del}"));
        mapTest.indexContains("Modern meridian", 1);
    });

});
