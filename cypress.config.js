// cypress.config.js
const { defineConfig } = require('cypress');
const { spawn } = require('child_process');

let serverProc = null;
const PORT = process.env.PORT || 3000;
// If your index.html lives in /public, keep "public". If it’s at repo root, use "."
const DOC_ROOT = process.env.DOC_ROOT || '.'; // change to 'public' if needed

module.exports = defineConfig({
  e2e: {
    baseUrl: `http://localhost:${PORT}`,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    chromeWebSecurity: false,
    defaultCommandTimeout: 20000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    setupNodeEvents(on, config) {
      on('task', {
        startServer() {
          return new Promise((resolve, reject) => {
            if (serverProc) return resolve(true);

            // Serve the app statically
            serverProc = spawn(
              'npx',
              [
                'http-server',
                DOC_ROOT,
                '-p',
                String(PORT),
                '-s',    // SPA fallback
                '-c-1',  // no cache
              ],
              { stdio: 'inherit', shell: true }
            );

            let settled = false;

            serverProc.on('error', (err) => {
              if (!settled) {
                settled = true;
                reject(err);
              }
            });

            // Give the server a short moment to start listening
            setTimeout(() => {
              if (!settled) {
                settled = true;
                resolve(true);
              }
            }, 1000);
          });
        },

        stopServer() {
          if (serverProc) {
            try {
              serverProc.kill();
            } catch {}
            serverProc = null;
          }
          return null;
        },
      });

      return config;
    },
  },
});
