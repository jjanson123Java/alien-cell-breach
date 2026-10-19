import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.argv[2] || 'http://127.0.0.1:8765/';
const debugPort = 9333;
const profile = await mkdtemp(join(tmpdir(), 'alien-cell-breach-'));
const screenshotPath = resolve('game-preview.png');
const browser = spawn(browserPath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-gpu-sandbox',
  '--disable-software-rasterizer',
  '--hide-scrollbars',
  '--window-size=1440,1000',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  baseUrl
], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserDiagnostics = '';
browser.stderr.on('data', chunk => { browserDiagnostics += chunk.toString(); });

let socket;
let nextId = 0;
const pending = new Map();
const errors = [];

async function waitForTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const target = targets.find(item => item.type === 'page' && item.url.startsWith(baseUrl));
      if (target?.webSocketDebuggerUrl) return target;
    } catch {
      // Chrome may still be starting.
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
  }
  throw new Error('Chrome debugging target did not become ready.');
}

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => {
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      rejectCommand(new Error(`Timed out waiting for ${method}`));
    }, 6000);
  });
}

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text);
  return response.result.result.value;
}

async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise(resolveDelay => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function click(selector) {
  const clicked = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element || element.disabled) return false;
    element.click();
    return true;
  })()`);
  assert.equal(clicked, true, `Expected clickable element: ${selector}`);
}

try {
  const target = await waitForTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  socket.addEventListener('message', event => {
    if (process.env.BROWSER_DEBUG) console.error('CDP message:', typeof event.data, String(event.data).slice(0, 240));
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      errors.push(details.exception?.description || details.text);
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const entry = message.params.entry;
      if (!entry.url?.endsWith('/favicon.ico')) errors.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
    }
  });
  socket.addEventListener('close', event => {
    if (process.env.BROWSER_DEBUG) console.error('CDP closed:', event.code, event.reason, browserDiagnostics.slice(-2000));
  });
  socket.addEventListener('error', event => {
    if (process.env.BROWSER_DEBUG) console.error('CDP error:', event.message || event.type);
  });

  await command('Runtime.enable');
  await command('Log.enable');
  await command('Page.enable');
  await waitFor(`location.href === ${JSON.stringify(baseUrl)} && document.readyState === 'complete'`, 'page load');
  if (process.env.BROWSER_DEBUG) {
    console.error('Page state:', await evaluate(`JSON.stringify({ href: location.href, title: document.title, body: document.body?.innerText.slice(0, 160) })`));
  }

  assert.equal(await evaluate('document.title'), 'Alien: Cell Breach');
  assert.equal(await evaluate(`document.body.innerText.includes('ALIEN: CELL BREACH')`), true);
  assert.equal(await evaluate(`!document.querySelector('#intro-screen').hidden`), true);

  await click('[data-action="start"]');
  assert.equal(await evaluate(`!document.querySelector('#board-screen').hidden`), true);
  await click('[data-cell-index="0"]');
  assert.equal(await evaluate(`!document.querySelector('#battle-screen').hidden`), true);
  assert.equal(await evaluate(`document.querySelector('#alien-attack').textContent`), 'LASER');

  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(capture.result.data, 'base64'));

  await click('[data-response="shield"]');
  assert.equal(await evaluate(`document.querySelector('#battle-feedback').textContent.includes('Alien loses')`), true);
  await click('[data-action="next-exchange"]');
  assert.equal(await evaluate(`document.querySelector('#alien-attack').textContent`), 'SHIELD');
  await click('[data-response="blast"]');
  assert.equal(await evaluate(`!document.querySelector('#battle-summary').hidden`), true);
  await click('[data-action="return-board"]');
  assert.equal(await evaluate(`document.querySelector('[data-cell-index="0"]').textContent`), 'X');

  const preservedBoard = await evaluate(`[...document.querySelectorAll('[data-cell-index]')].map(cell => cell.textContent).join('')`);
  await click('#board-screen [data-action="open-help"]');
  assert.equal(await evaluate(`!document.querySelector('#help-screen').hidden`), true);
  await click('[data-action="close-help"]');
  assert.equal(await evaluate(`[...document.querySelectorAll('[data-cell-index]')].map(cell => cell.textContent).join('')`), preservedBoard);

  await click('[data-cell-index="1"]');
  await click('[data-response="blast"]');
  await click('[data-action="next-exchange"]');
  await click('[data-response="shield"]');
  assert.equal(await evaluate(`document.querySelector('#battle-summary-title').textContent`), 'CELL BREACHED');
  await click('[data-action="return-board"]');
  assert.equal(await evaluate(`document.querySelector('[data-cell-index="1"]').textContent`), 'O');

  await click('#board-screen [data-action="open-help"]');
  await click('#help-restart');
  assert.equal(await evaluate(`!document.querySelector('#board-screen').hidden`), true);
  assert.equal(await evaluate(`[...document.querySelectorAll('[data-cell-index]')].every(cell => cell.textContent === '')`), true);

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
  assert.deepEqual(errors, []);

  console.log(`Browser smoke test passed: ${baseUrl}`);
  console.log(`Preview captured: ${screenshotPath}`);
  console.log('Verified: load, win path, loss path, Help preservation, Restart, mobile overflow, and console errors.');
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
  if (browser.exitCode === null) await once(browser, 'exit');
  await rm(profile, { recursive: true, force: true });
}
