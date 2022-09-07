// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')


beforeEach(() => {
  // Put {"site":"local"} or ..."live"} in ../cypress.env.json 
  cy.wrap(Cypress.env('site') == "local" ? Cypress.env("localRoot") : Cypress.env("liveRoot")).as("site");
  cy.wrap(Cypress.env('TestProjectId')).as("TestProjectId");
  // See https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Sharing-Context
});
