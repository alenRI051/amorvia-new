// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // ← adjust if different
    defaultCommandTimeout: 8000,
    video: false,
  },
});
