const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://amorvia.eu/?devcache=0',
    video: false,
    defaultCommandTimeout: 8000
  }
});
