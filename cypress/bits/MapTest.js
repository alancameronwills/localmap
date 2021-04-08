// To use this: import {MapTest} from "../bits.MapTest.js"

/**
 * Encapsulates the key building blocks of a test on the map
 */
export class MapTest {
    /** Default opens test project with google cartography
     * @param TestRunner - call with new MapTest(this)
     * @param options - {project: "...", cartography:"...", place:"..."}
     */
    constructor(_testRunner, options = {}) {
        this.testRunner = _testRunner;
        this.project = options.project || this.testRunner.TestProjectId;
        this.cartography = options.cartography || "";
        this.place = options.place || "";
        this.visit();
    }
    visit() {
        let expectNoSplash = !this.project == this.testRunner.TestProjectId
            || this.place;
        let expectCartography = this.cartography || (!this.project ? "bing" : "google");

        cy.visit(this.testRunner.site
            + `?project=${this.project}`
            + `${this.cartography ? '&cartography=' + this.cartography : ''}`
            + `${this.place ? '&place=' + this.place : ""}`);
        if (expectNoSplash) cy.get("#splash").should("not.be.visible", { timeout: 30000 });
        else cy.get("#continueButton", { timeout: 30000 }).then(b => { b.click(); });
        if (expectCartography == "google") cy.get(".gm-svpc", { timeout: 30000 });
        else cy.get("#ZoomInButton", { timeout: 10000 });
    }

    /** Shift map and then click add place button. If stuffToDoInEditor, do it and then close editor */
    addPlaceAtPostcode(postcode, stuffToDoInEditor) {
        if (postcode) cy.get("#addressSearchBox").type(postcode + "\n");
        cy.get('#addPlaceButton').click();
        if (stuffToDoInEditor) {
            stuffToDoInEditor();
            this.closeEditor();
        }
    }

    addPlaceAtCentre(stuffToDoInEditor) {
        cy.get('#theMap').rightclick(); 
        cy.get("a").contains("Add place here").click();
        if (stuffToDoInEditor) {
            stuffToDoInEditor();
            this.closeEditor();
        }
    }

    /** Test that index contains a given name or a specific count of items */
    indexContains(item, count = -1, clearSearch = false) {
        if (clearSearch) cy.get("#searchCancel").click();
        if (item) cy.get("#indexSidebar").contains(item).should("be.visible");
        if (count >= 0) cy.get(".indexPlaceContainer").should("have.length", count);
    }

    /** Search in the index, or clear the search */
    indexClick(item) {
        if (item) {
            // Use the index to find a place:
            cy.get("#searchButton").type(item + "\n");
            cy.get(".indexPlaceContainer").contains(item).first().click();
        } else {
            cy.get("#searchCancel").click();
        }
    }

    /** Perform editor actions on a place, given (part of) its title.
     * @param item - name to click in index
     * @param picsCount - number of pictures expected 
     * @param stuffToDoInEditor - function containing list of actions. On completion, editor is closed and index search cleared.
     */
    openEditorWithPics(item, picsCount, stuffToDoInEditor) {
        this.openEditorFromIndex(item, stuffToDoInEditor, picsCount);
    }
    openEditorFromIndex(item, stuffToDoInEditor, picsCount = 0) {
        this.openLightbox(item, picsCount, () => {
            if (picsCount == 1) cy.get("#onePicBox").should("be.visible");
            cy.get("#lightboxEditButton").should("be.visible").click();
            cy.get("#popup").should("be.visible");
            if (stuffToDoInEditor) {
                stuffToDoInEditor();
                this.closeEditor();
            }
        });
    }

    /** Open the lightbox (i.e. detail display) of a place.
     * @param item - Title or part of title of place
     * @param picsCount - Number of pictures expected
     * @stuffToDo - ops to perform while lightbox is open; close when completed
     */
    openLightbox(item, picsCount, stuffToDo) {
        this.indexClick(item);
        if (picsCount == 0) cy.get(".infoBox").should("be.visible").click();
        cy.get("#lightbox").should("be.visible");
        if (stuffToDo) {
            stuffToDo();
            cy.get("#searchCancel").click();
        }
    }

    /** Replace existing text and click a tag */
    editorInput(text, tagToClick) {
        if (tagToClick) cy.get("#" + tagToClick).click();
        if (text !== null) {
            cy.get('#popuptext').type("{selectall}" + text)
                .should('have.text', text.replace(/\{.*?\}/g, ""));
        }
    }

    editorAddFile(fixtureName = "test-pic-1.jpg", picCountAfter = 1) {
        cy.get("#uploadToPlaceButton").then(button => {
            button.show();
            cy.wrap(button).attachFile('../fixtures/' + fixtureName)
            cy.get("#picLaundryFlag").should("be.visible");
            cy.get("#thumbnails").children().should("have.length", picCountAfter);
        })
    }

    /** Close the place editor */
    closeEditor() {
        cy.get("#popclose").click();
        cy.get("#popup").should("not.be.visible");
        cy.get("#picLaundryFlag", { timeout: 20000 }).should("not.be.visible");
    }

}