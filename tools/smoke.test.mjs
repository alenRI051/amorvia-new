// Node 18+ has fetch built-in
import assert from 'node:assert/strict';

const URL = process.env.SITE_URL || 'https://amorvia.eu';
const res = await fetch(URL, { redirect: 'follow' });
assert.equal(res.status, 200, `Expected 200 from ${URL}, got ${res.status}`);

const html = await res.text();
assert.ok(/Amorvia\s+—\s+Multi-Act/i.test(html), 'Expected title not found');
console.log('✅ Smoke test passed:', URL);
