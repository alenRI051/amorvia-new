// cypress.config.js (ESM, no imports needed)
export default {
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    supportFile: "cypress/support/e2e.js",
    video: false,
    screenshotsFolder: "cypress/screenshots",
    downloadsFolder: "cypress/downloads",
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    retries: { runMode: 1, openMode: 0 },
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      return config;
    },
  },
};
