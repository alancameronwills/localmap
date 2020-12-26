describe("Smoke tests", () => {
    //let site = "https://deep-map.azurewebsites.net";
    let site = Cypress.env('site'); // put {"site" : "http://localhost"} in cypress.env.json

    it("Drop splash, index visible", () => {
        cy.visit(site+"/?project=folio");
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        // Index click fails
        cy.get('.groupHead[title="Streets"]', { timeout: 8000 }).should("be.visible").click();
        //cy.get("#sub\\#Streets ").should("be.visible");
    });
    
    it("Bing cy-en", () => {
        cy.visit(site);
        cy.get("#continueButton", { timeout: 30000 }).then(b=>{b.click();});
        cy.get("#ZoomInButton", { timeout: 10000 }); // Bing up
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.Aerial", {timeout:60000});
        cy.contains("New!");
        cy.contains("Cymraeg").click();
        cy.contains("Newydd!");
        cy.contains("English").click();
        cy.get("#mapbutton").click();
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.OrdnanceSurvey", {timeout:60000});
        cy.get("#mapbutton").click();
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.Aerial", {timeout:60000});

        // Index click fails
        cy.get(".groupHead[title='Trefdraeth']").then(b=>{b.click()});
        //cy.get("#lightbox #lbTitle").should("be.visible");
    });
    
    it("Open item directly, index tab", () => {
        cy.visit(site+"/?project=Garn Fawr&place=Garn+Fawr%7C22958215767478787397");
        cy.get("#ZoomInButton", { timeout: 10000 }); // Bing up
        cy.get("canvas#Microsoft\\.Maps\\.Imagery\\.Aerial", {timeout:60000});
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

    it("Cartography, click place", () => {
        cy.visit(site+"/?project=Garn%20Fawr&place=Garn+Fawr%7C22958215767478787397&cartography=google");
        cy.get(".gm-svpc", { timeout: 30000 }); // Google up
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
        cy.get("#indexSidebar").contains("Sutton Coldfield").should("be.visible");
        cy.get("#theMap").click(300,300).then(()=>{
            cy.get("#lightbox #lbTitle").should("not.be.visible");
            cy.get("#indexSidebar").should("not.be.visible");
        });
        
        cy.get("div[aria-label='Sutton Coldfield']")
        .then((b)=> {
            cy.get("button[title='Zoom out']").click();
            cy.wait(2000);
            b.click();
            cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("be.visible");
            cy.get("#indexSidebar").should("not.be.visible");
        })
        cy.get("#lightboxBack").click();
        cy.get("#lightbox #lbTitle").contains("Sutton Coldfield").should("not.be.visible");
    })
    
})