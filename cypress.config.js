// cypress.config.js
import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  screenshotsFolder: 'cypress/screenshots',
  e2e: {
    baseUrl: 'http://localhost:3000',          // your http-server target
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Simple Node-side logger so you can print to terminal from tests
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
      return config;
    },
  },
});

