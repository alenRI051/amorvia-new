const { defineConfig } = require('cypress');
const path = require('path');
const http = require('http');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

function startStaticServer({ port = 3000, root = path.join(__dirname) } = {}) {
  const serve = serveStatic(root);
  const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));
  return new Promise((resolve) => {
    server.listen(port, () => resolve({
      close: () => new Promise((r) => server.close(() => r()))
    }));
  });
}

let serverRef;

module.exports = defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.js',
    baseUrl: 'http://localhost:3000',
    chromeWebSecurity: false,
    video: false,
    setupNodeEvents(on, config) {
      on('task', {
        async startServer() {
          if (!serverRef) {
            serverRef = await startStaticServer({ root: __dirname, port: 3000 });
            return true;
          }
          return true;
        },
        async stopServer() {
          if (serverRef) {
            await serverRef.close();
            serverRef = null;
          }
          return true;
        }
      });
      return config;
    },
  },
});
