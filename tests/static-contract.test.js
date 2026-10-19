const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('page identifies the game and unofficial fan-project status', () => {
  const html = read('index.html');
  assert.match(html, /Alien: Cell Breach/);
  assert.match(html, /unofficial.*fan project/i);
});

test('essential actions are native buttons', () => {
  const html = read('index.html');
  for (const action of ['start','open-help','close-help','restart','respond','next-exchange','return-board','play-again']) {
    assert.match(html, new RegExp(`<button[^>]+data-action=["']${action}["']`, 'i'));
  }
});

test('page has polite and assertive announcement regions', () => {
  const html = read('index.html');
  assert.match(html, /id="status-live"[^>]+aria-live="polite"/);
  assert.match(html, /id="result-live"[^>]+role="alert"/);
});

test('styles include visible focus and reduced-motion handling', () => {
  const css = read('styles.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test('browser adapter initializes only when a document exists', () => {
  const script = read('game.js');
  assert.match(script, /typeof document !== ['"]undefined['"]/);
  assert.match(script, /DOMContentLoaded/);
});

test('renderer updates accessible board labels', () => {
  const script = read('game.js');
  assert.match(script, /aria-label/);
  assert.match(script, /Row/);
  assert.match(script, /column/);
});

test('canvas atmosphere exposes start stop and resize controls', () => {
  const script = read('game.js');
  assert.match(script, /CanvasAtmosphere/);
  assert.match(script, /function start\(/);
  assert.match(script, /function stop\(/);
  assert.match(script, /function resize\(/);
  assert.match(script, /cancelAnimationFrame/);
});

test('every element ID referenced by the browser adapter exists in the page', () => {
  const html = read('index.html');
  const script = read('game.js');
  const referencedIds = [...script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
  for (const id of referencedIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `Missing #${id} in index.html`);
  }
});
