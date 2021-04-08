
import 'cypress-file-upload';
import { MapTest } from "../bits/MapTest.js";

describe("Pic tests", function () {
    it("Can add a picture to a place", function () {
        // TODO: Fix choice of smedia|media azuredb.js:184
        cy.viewport(1200, 800); // Ensure we're looking at media, not smedia
        let mapTest = new MapTest(this);
        mapTest.addPlaceAtPostcode("SE10 8XJ", () => {
            mapTest.editorInput("Test pix 1", "petri");
            mapTest.editorAddFile();
        });
        // Check it's still there after reload:
        mapTest.visit();
        mapTest.openEditorWithPics("Test pix", 1, () => {

        });

    });
})