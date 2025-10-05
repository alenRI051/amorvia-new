// cypress.config.js (ESM-friendly)
export default {
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 8000,
    retries: 1,
    setupNodeEvents(on, config) {
      // You can add node event listeners here
      return config;
    },
  },
};
