
// This test requires running once: 
// npm install --save-dev cypress-file-upload
// See   https://www.npmjs.com/package/cypress-file-upload

import 'cypress-file-upload';
import { MapTest } from "../bits/MapTest.js";

describe("Pic tests", function () {
    it("Can add a picture to a place", function () {
        // TODO: Fix choice of smedia|media azuredb.js:184
        cy.viewport(1200, 800); // Ensure we're looking at media, not smedia
        let mapTest = new MapTest(this);
        mapTest.addPlaceAtPostcode("SE10 8XJ", () => {
            mapTest.editorInput("Test pix 1", "petri");
            mapTest.editorAddFile("test-pic-1.jpg", 1);
        });
    });
    it("Can re-title a picture", function () {
        // Pic is still there from previous test:
        let mapTest = new MapTest(this);
        mapTest.openEditorWithPics("Test pix", 1, () => {
            cy.get("#thumbnails .thumbnail").rightclick();
            cy.get("#retitlePicMenu").click();
            cy.get("#titleInput").type("{selectall}Cockchafer");
            cy.get("#titleDialog").click(1, 1);
        });
        mapTest.openLightbox("Test pix", 1, function () {
            cy.get("#oneCaption").contains("Cockchafer");
        });
    });
    
    it("Can add a 2nd picture", function () {
        let mapTest = new MapTest(this);
        mapTest.openEditorWithPics("Test pix", 1, () => {
            mapTest.editorAddFile("test-pic-2.jpg", 2);
        });
        mapTest.openLightbox("Test pix", 2, function () {
            cy.get("#lbPicCaptionContainer").then(pics => {
                let cywrappics = cy.wrap(pics);
                cywrappics.contains("Cockchafer");
                expect(pics.children()).to.have.length(2);
            });
        });
    });
    it ("Can delete pictures", function() {
        let mapTest = new MapTest(this);
        mapTest.openEditorWithPics("Test pix", 2, () => {
            cy.get("#thumbnails .thumbnail").first().rightclick();
            cy.get("#deletePicMenu").click();
        });
        mapTest.openEditorWithPics("Test pix", 1, () => {
            cy.get("#thumbnails .thumbnail").rightclick();
            cy.get("#deletePicMenu").click();
        });
        mapTest.openEditorWithPics("Test pix", 0, () => {
            mapTest.editorInput("No pix", "ego");
        });
    });
    
})