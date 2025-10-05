import './commands';

// Boot a fresh app for every test
beforeEach(() => {
  cy.task('startServer');
  cy.clearCookies();
  cy.clearLocalStorage();
  // disable SW + cache like you do manually
  cy.visit('/index.html?nosw=1&devcache=0');
});
