// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add("visitTestProject", function() {
    cy.visit(this.site + `?project=${this.TestProjectId}`);
    cy.get(".gm-svpc", { timeout: 30000 }); // Google up
    cy.get("#splash").should("not.be.visible", {timeout:30000});
});

Cypress.Commands.add("loginUser", () => {
    cy.request(
        {
            method: "POST",
            url: `https://login.microsoftonline.com/${Cypress.config("tenantId")}/oauth2/v2.0/authorize`,
            form: true,
            body: {
                client_id: Cypress.config("clientId"),
                grant_type: "password",
//                scope: "wl.basic user.read openid profile offline_access",
                scope: "wl.basic",
                login: "bob@cameronwills.org",
                passwd: "greenway01!"
            }
        }
    ).then (result => {
        cy.request ({
            method: "POST",
            url: "https://deep-map.azurewebsites.net/.auth/login/microsoftaccount",
            form: true,
            body: {access_token: result.body.access_token}
        })
    })
});

Cypress.Commands.add("loginGoogle", () => {
    cy.request ({
        method: "POST",
        url: "https://deep-map.azurewebsites.net/.auth/login/google",
        form: false,
        body: 
            {"id_token":"eyJhbGciOiJSUzI1NiIsImtpZCI6ImUxYWMzOWI2Y2NlZGEzM2NjOGNhNDNlOWNiYzE0ZjY2ZmFiODVhNGMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0MDc0MDg3MTgxOTIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MDc0MDg3MTgxOTIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDUzMjQzOTE0MDU4NDg4MzEwMzciLCJlbWFpbCI6InBhbnR5d3lsYW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJOandWY1Y1M2I3c0JsWFJRV0x1MXNBIiwiaWF0IjoxNjE3NTgwODIyLCJleHAiOjE2MTc1ODQ0MjJ9.BOkaWy-Rghm0fPzqq0daJzQJElJDUW_ypH9DSCdhsQt0zH-_RtlETD-_-dj4Vgjyc75e-qbYZWdOAGmkG4oiD_E70dFGvbovowPYeJdcfMwUmoNeoPCYaY1oaHM5jaSO300ezDVzhGhN9qCTLSVMIqRUR8X1ZreoCOHoFIpMEbFNVGXEEd6D49XUZvlvLQKCOVwL9Z-ZsGzQWhncrVZgpUNYh47rG_TwxU9PqEtrQ0lSfUNVSlgGFD17gq_8S1jrYXrp3MnUaEV7cWVrkvboEXG6HtPHPKX5Rzq-WW8NrduwDEyll6ZsRxs7Wwl05smwMsBxVBLm9gO1mh2_aYuWXA" 
          
}})});

Cypress.Commands.add("login", () => {
    cy.request({
        method: "POST",
        url: `https://login.microsoftonline.com/${Cypress.config("tenantId")}/oauth2/token`,
        form: true,
        body: {
            grant_type: "client_credentials",
            client_id: Cypress.config("clientId"),
            client_secret: Cypress.config("clientSecret"),
            scope: "wl.signin"
        },
    }).then(response => {
        cy.request ({
            method: "POST",
            url: "https://deep-map.azurewebsites.net/.auth/login/microsoftaccount",
            form: true,
            body: {access_token: response.body.access_token}
        })
        const ADALToken = response.body.access_token;
        const expiresOn = response.body.expires_on;

        localStorage.setItem("adal.token.keys", `${Cypress.config("clientId")}|`);
        localStorage.setItem(`adal.access.token.key${Cypress.config("clientId")}`, ADALToken);
        localStorage.setItem(`adal.expiration.key${Cypress.config("clientId")}`, expiresOn);
        localStorage.setItem("adal.idtoken", ADALToken);
    });
});