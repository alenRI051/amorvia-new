// cypress.config.js  (no require/import)
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    retries: { runMode: 1, openMode: 0 },
  },
};
