// cypress.config.js (CommonJS, no require('cypress'))
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    env: {
      // let tests point to your app URL if needed
      APP_URL: 'http://localhost:3000',
    },
  },
};
