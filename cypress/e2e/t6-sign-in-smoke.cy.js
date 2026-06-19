import { MapTest } from "../bits/MapTest.js";

// Non-interactive sign-in smoke test: verifies the wiring up to the
// third-party (Google/Microsoft) provider boundary WITHOUT performing a real
// OAuth login. There are no test credentials for a true sign-in (the test
// project signs nobody in), and the provider consent screen can't be driven
// headlessly, so each test stops the moment control would hand over to Google.
//
// Covered:
//  1. the app (sign-in.js) opens the sign-in popup with the right sign-in.html URL
//  2. sign-in.html loads, sets window.version inline (no longer threaded from the
//     opener), and builds the right /.auth/login/<provider> redirect, returning to
//     signed-in.html
//  3. the live /.auth/login/google endpoint 302-redirects to accounts.google.com

describe("Sign-in smoke (up to provider boundary)", function () {

    it("the app opens the sign-in popup with the right URL", function () {
        const projectId = this.TestProjectId;
        // We don't create places, so skip the DB reset:
        new MapTest(this, { noClearDB: true });
        cy.window().then(win => {
            // Pretend the popup opened and is still open, so the close-poll stays quiet:
            cy.stub(win, "open").returns({ closed: false }).as("openPopup");
            // nobreakout=true forces the popup path (not the Safari/in-frame breakout):
            win.signin(true);
        });
        cy.get("@openPopup").should("have.been.calledOnce");
        cy.get("@openPopup").its("firstCall.args.0")
            .should("match", new RegExp(`^sign-in\\.html\\?project=${projectId}&lang=`, "i"));
    });

    it("sign-in.html loads and builds the provider redirect URL", function () {
        const site = this.site;
        const projectId = this.TestProjectId;
        cy.visit(`${site}/sign-in.html?project=${projectId}&lang=en`);

        // Version is now set inline, not inherited via a ?v= query param:
        cy.window().its("version").should("eq", 60);

        // Wait for init()'s async Project.get() to finish (the #title div ships with
        // default "Map Digi" text, so it's not a reliable readiness signal):
        cy.window().its("project").should("exist");
        // The provider buttons live in #loginPanel, hidden until consent is ticked:
        cy.get("#loginPanel").should("not.be.visible");
        cy.get("#consent").check();
        cy.get("input.button[value*='Google']").should("be.visible");
        cy.get("input.button[value*='Microsoft']").should("be.visible");

        // Clicking a provider navigates via window.open(..., "_self"); capture the URL
        // instead of letting Cypress leave the origin to Google:
        cy.window().then(win => {
            cy.stub(win, "open").as("openAuth");
            win.signin("google");
        });
        cy.get("@openAuth").should("have.been.calledOnce");
        cy.get("@openAuth").its("firstCall.args.0").then(decodeURIComponent).then(url => {
            expect(url).to.match(/\/\.auth\/login\/google\?post_login_redirect_url=/);
            // The post-login return lands on signed-in.html for this project:
            expect(url).to.contain(`/signed-in.html?project=${projectId}`);
        });
    });

    it("the live Google auth endpoint redirects to the provider", function () {
        // The auth endpoint always lives on mapdigi.org (azuredb points there even on
        // localhost), so check it directly regardless of local/live run:
        cy.request({
            url: `${Cypress.env("liveRoot")}/.auth/login/google`,
            followRedirect: false
        }).then(resp => {
            expect(resp.status).to.eq(302);
            expect(resp.redirectedToUrl).to.contain("accounts.google.com");
        });
    });

});
