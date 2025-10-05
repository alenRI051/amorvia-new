// cypress.config.js
const { defineConfig } = require('cypress');
const { spawn } = require('child_process');
const http = require('http');

let serverProc = null;

// You can override these when running, e.g. PORT=3210 DOC_ROOT=public npm run test:e2e
const PORT = Number(process.env.PORT || 3000);
// If your index.html is in /public, set DOC_ROOT=public
const DOC_ROOT = process.env.DOC_ROOT || '.';

function isServerUp(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 600 }, (res) => {
      res.resume(); // drain
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

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
        async startServer() {
          // If something is already serving on PORT, just use it
          if (await isServerUp(PORT)) return true;

          // Otherwise start a static server
          serverProc = spawn(
            'npx',
            ['http-server', DOC_ROOT, '-p', String(PORT), '-s', '-c-1'],
            { stdio: 'inherit', shell: true }
          );

          // Give it a moment and verify
          const started = await new Promise((resolve, reject) => {
            let done = false;
            const timer = setTimeout(async () => {
              if (done) return;
              done = true;
              resolve(await isServerUp(PORT));
            }, 1200);

            serverProc.on('error', (err) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              reject(err);
            });
            serverProc.on('exit', (code) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              resolve(false);
            });
          });

          if (!started) throw new Error(`Failed to start http-server on port ${PORT}`);
          return true;
        },

        stopServer() {
          if (serverProc) {
            try { serverProc.kill(); } catch {}
            serverProc = null;
          }
          return null;
        },
      });

      return config;
    },
  },
});

