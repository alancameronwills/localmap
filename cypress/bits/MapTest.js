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
        this.project = options.project == null ? this.testRunner.TestProjectId : options.project;
        this.cartography = options.cartography || "";
        this.place = options.place || "";

        // Remove all but one test place:
        if(!options.noClearDB) cy.request("https://deep-map.azurewebsites.net/api/deleteTestPlaces?code=se3mQ/fs2Nz8elrtKyXb4VggJnUycdMbPdislVJ1ekKoz0Tf5OyrUA==");

        this.visit();
    }
    visit(link) {
        
        let url = link || (this.testRunner.site
            + `?project=${this.project}`
            + `${this.cartography ? '&cartography=' + this.cartography : ''}`
            + `${this.place ? '&place=' + this.place : ""}`);

        cy.visit(url);

        let expectNoSplash = !this.project == this.testRunner.TestProjectId
            || this.place || link;
        if (expectNoSplash) cy.get("#splash", { timeout: 30000 }).should("not.be.visible");
        else cy.get("#continueButton", { timeout: 30000 }).then(b => { b.click(); });
        
        let expectCartography = this.cartography 
        || (this.project.toLowerCase() == "folio" 
            || this.project == this.testRunner.TestProjectId ? "google" : "bing");
        return cy.get({
            "google":".gm-svpc", 
            "bing":"#ZoomInButton", 
            "osm":".gm-control-active[title='Zoom in']"}[expectCartography], {timeout:30000});
    }

    /** Shift map and then click [+] button. 
     * If stuffToDoInEditor, do it and then close editor
     * Can perform ".then(...)" on the return value */
    addPlaceAtPostcode(postcode, stuffToDoInEditor) {
        if (postcode) cy.get("#addressSearchBox").type(postcode + "\n");
        cy.get('#addPlaceButton').click();
        return new EditorTest(stuffToDoInEditor);
    }

    /** Add place using right-click */
    addPlaceAtCentre(stuffToDoInEditor) {
        cy.get('#theMap').rightclick();
        cy.get("a").contains("Add place here").click();
        return new EditorTest(stuffToDoInEditor);
    }

    /** Test that index contains a given name or a specific count of items */
    indexContains(item, count = -1, clearSearch = false) {
        if (clearSearch) cy.get("#searchCancel").click();
        let sortOfPromise = null;
        if (item) { sortOfPromise = cy.get("#indexSidebar").contains(item).should("be.visible"); }
        if (count >= 0) { sortOfPromise = cy.get(".indexPlaceContainer").should("have.length", count); }
        return sortOfPromise;
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
            new EditorTest(stuffToDoInEditor);
        });
    }

    /** Open the lightbox (i.e. detail display) of a place.
     * @param item - Title or part of title of place
     * @param picsCount - Number of pictures expected
     * @stuffToDo - ops to perform while lightbox is open; close when completed
     */
    openLightbox(item, picsCount, stuffToDo) {
        // Search for place in index and click:
        this.indexClick(item);
        if (picsCount == 0) cy.get(".infoBox").should("be.visible").click();
        cy.get("#lightbox").should("be.visible");
        if (stuffToDo) {
            stuffToDo();
            // Clear the index search and close the lightbox:
            cy.get("#searchCancel").click();
        }
    }

    /** Upload pics and then assign to places */
    uploadFilesAndCreatePlaces(fileArray) {
        cy.get("#uploadButton").then(button => {
            button.show();
            // Upload pictures to side of screen:
            cy.wrap(button).attachFile(fileArray);
            cy.get("#loosePicsShow .thumbnail").should("have.length", fileArray.length);
        });
        // Move map to each pic's loc and create or add to place:
        cy.get("#loosePicsShow .thumbnail").each(pic => {
            // click = move map to loc if pic has one
            // rightclick = menu
            cy.wrap(pic).click().rightclick();
            cy.get("#placeLoosePicMenu").click();
            // Needs a fresh cy...should here to sequence each
            cy.wrap(pic).should("not.exist");
        });
    }

    /**
     * Go to a place using inter-frame message API
     * @param {*} placeId - project%7CrowId
     * @param {int} picsExpected - count
     * @param {string} contentExpected - text to test 
     * @param {f(editorTest)} stuffToDoInEditor - if null, don't open editor; if supplied, open editor and do this
     * @returns A thing you can call ".then()" on - either a Cypress object or an EditorTest
     */
    openEditorViaAPI(placeId, picsExpected, contentExpected, commentsExpected, stuffToDoInEditor) {
        cy.window().then(win => win.postMessage({
            op: 'gotoPlace',
            placeKey: placeId,
            show: true
        },
            '*'));
        if (picsExpected == 0) cy.get(".infoBox").should("contain.text", contentExpected).click();
        cy.get("#lightbox").should("be.visible");
        if (picsExpected == 1) cy.get("#onePicBox").should("be.visible");
        if (commentsExpected) cy.get("#lightboxComments").should("be.visible");
        if (stuffToDoInEditor) {
            cy.get("#lightbox").should("contain.text", contentExpected);
            cy.get("#lightboxEditButton").click();
            return new EditorTest(stuffToDoInEditor);
        }
    }

    mapShowingIs(sort) {
        const sorts = {
            googleSat: "img:first[src*='googleapis.com/kh']",
            google1950: "img:first[src*='tileserver.com/nls']",
            google1900: "img:first[src*='tileserver.com/5g']",
            bingOS: "canvas#Microsoft\\.Maps\\.Imagery\\.OrdnanceSurvey",
            bing1900: "canvas#Microsoft\\.Maps\\.Imagery\\.OrdnanceSurvey",
            bingSat: "canvas#Microsoft\\.Maps\\.Imagery\\.Aerial"
        };
        cy.get("#theMap " + sorts[sort], {timeout:10000});
    }

}

class EditorTest {

    constructor(stuffToDo) {
        cy.get("#popup").should("be.visible");
        if (stuffToDo) {
            stuffToDo(this);
            this.close();
        }
    }

    /** Replace existing text and click a tag */
    textInput(text, tagToClick) {
        if (tagToClick) cy.get("#" + tagToClick).click();
        if (text !== null) {
            cy.get('#popuptext').type("{selectall}" + text)
                .should('have.text', text.replace(/\{.*?\}/g, ""));
        }
    }

    /** Add a picture */
    addFile(fixtureName, picCountAfter = 1) {
        cy.get("#uploadToPlaceButton").then(button => {
            button.show();
            cy.wrap(button).attachFile('../fixtures/' + fixtureName)
            cy.get("#picLaundryFlag").should("be.visible");
            cy.get("#thumbnails").children().should("have.length", picCountAfter);
        })
    }

    retitleFile(title) {
        cy.get("#thumbnails .thumbnail").rightclick();
        cy.get("#retitlePicMenu").click();
        cy.get("#titleInput").type("{selectall}" + title);
        cy.get("#titleDialog").click(1, 1);
    }

    deleteFiles(pixCountExpected) {
        for (let i = pixCountExpected; i > 0; i--) {
            cy.get("#thumbnails .thumbnail").first()
                .rightclick().then(() => {
                    cy.get("#deletePicMenu").click();
                });
            cy.get("#thumbnails .thumbnail").should("have.length", i - 1);
        }
    }

    /** Close the place editor and do any .then(f) */
    close() {
        cy.get("#popclose").click();
        cy.get("#popup").should("not.be.visible");
        cy.get("#picLaundryFlag", { timeout: 20000 }).should("not.be.visible")
            .then(() => {
                if (this.onClose) this.onClose();
            });
    }

    /** Keep this function for when the editor closes */
    then(f) {
        this.onClose = f;
    }

}