const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",     // where `npm run dev` serves /public
    supportFile: "cypress/support/e2e.js",
    fixturesFolder: "cypress/fixtures",
    video: false,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 800,
    chromeWebSecurity: false,
    retries: {
      runMode: 1,
      openMode: 0
    },
    setupNodeEvents(on, config) {
      // You can hook reporters or logging here later if needed
      return config;
    }
  }
});
