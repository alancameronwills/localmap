describe("Smoke tests", () => { 
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot"); 
    // put {"site":"local"} or ..."live"} in cypress.env.json

    it("loads Google map and shows index", () => {
        cy.visit(site+"/?project=folio");
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        // Index click fails
        cy.get('.groupHead[title="Streets"]', { timeout: 8000 }).should("be.visible").click();
        //cy.get("#sub\\#Streets ").should("be.visible");
    });
    
    it("loads Bing map, can switch languages, toggle OS map and aerial, opens place from index", () => {
        cy.visit(site);
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get("#ZoomInButton", { timeout: 10000 }); // Bing up
        cy.contains("New!");
        cy.contains("Cymraeg").click();
        cy.contains("Newydd!");
        cy.contains("English").click();
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.OrdnanceSurvey", {timeout:60000});
        cy.get("#mapbutton").click();
        // old map overlay here
        cy.get("#mapbutton").click(); 
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.Aerial", {timeout:60000});
        cy.get("#mapbutton").click();
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.OrdnanceSurvey", {timeout:60000});

        // Doesn't work for group heads:
        //cy.get(".groupHead[title='Other maps'] div").click();
        // Must use then:

        cy.get(".groupHead[title='Other maps'] div").then(b=>{b.click()});
        cy.get(".indexPlace[title='Sutton Coldfield']").click();
        cy.get("#lightbox #lbTitle").should("be.visible");
    });
    
    it("opens place directly showing text, closes text and index, re-opens index", () => {
        cy.visit(site+"/?project=Garn Fawr&place=Garn+Fawr%7C22958215767478787397");
        cy.get("#ZoomInButton", { timeout: 10000 }); // Bing up
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.OrdnanceSurvey", {timeout:60000});
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        cy.get("#indexSidebar").contains("Sutton Coldfield").should("be.visible");
        cy.get("#theMap").click(300,100).then(()=>{
            cy.get("#lightbox #lbTitle").should("not.be.visible");
            cy.get("#indexSidebar").should("not.be.visible");
        });
        cy.get("#indexFlag").click().then(() => {
            cy.get("#indexSidebar").should("be.visible");
        })
    });

    it("Cartography chooses Google map; clicking place shows text", () => {
        cy.visit(site+"/?project=Garn%20Fawr&place=Garn+Fawr%7C22958215767478787397&cartography=google");
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        cy.get("#indexSidebar").contains("Sutton Coldfield").should("be.visible");
        cy.get("#theMap").click(300,300).then(()=>{
            cy.get("#lightbox #lbTitle").should("not.be.visible");
            cy.get("#indexSidebar").should("not.be.visible");
        });
        
        // Searching for a map pin works but messes the Google map height.
        // Weird, because obviously get shouldn't have a side-effect.
        // The place may shift out of view, so we can't immediately click it.
        cy.get("div[aria-label='Sutton Coldfield']")
        .then((b)=> {
            // Repair Google map. Zooming resets to the viewport height:
            cy.get("button[title='Zoom out']").click();
            cy.wrap(b).should("be.visible");
            //cy.wait(2000);

            // Now should be able to click the place:
            b.click();
            cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        })
        cy.get("#lightboxBack").click();
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("not.be.visible");
    })
  
})