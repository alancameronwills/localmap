const { defineConfig } = require("cypress");

module.exports = defineConfig({
  // cypress.env.json should contain something like:
  // {"site": "local", "localRoot": "http://localhost", "TestProjectId": "..."}
  env: {
    // NB deep-map.azurewebsites.net 301-redirects here; visiting it directly
    // makes Cypress hop superdomains mid-test and fail erratically:
    liveRoot: "https://mapdigi.org"
  },
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
