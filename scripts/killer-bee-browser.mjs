// Dependency-free Chrome smoke test through the DevTools protocol (Node 24).
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('test-output');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(output, 'chrome-'));
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4186', '--strictPort'], { windowsHide: true, stdio: 'pipe' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = 'http://127.0.0.1:4186';
let browser;
let socket;
const exceptions = [];
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* wait for Vite */ }
    if (i === 99) throw new Error('Vite did not start');
    await delay(100);
  }
  browser = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let logs = '';
    const timeout = setTimeout(() => reject(new Error(`Chrome startup timed out: ${logs.slice(-500)}`)), 15000);
    browser.on('error', error => { clearTimeout(timeout); reject(error); });
    browser.stderr.on('data', data => {
      logs += data;
      const match = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
  });
  socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const requests = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    if (message.id && requests.has(message.id)) {
      const { resolve, reject, timer } = requests.get(message.id);
      clearTimeout(timer); requests.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
    }
  };
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { requests.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    requests.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => call(method, params, sessionId);
  await page('Runtime.enable'); await page('Page.enable');
  await page('Network.enable');
  await page('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  const evaluate = async expression => {
    const result = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 400; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Condition not met: ${expression}; ${JSON.stringify(exceptions)}; ${await evaluate("document.body.innerText")}`);
  };
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(80); };
  const clickText = async text => {
    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)} || b.getAttribute('aria-label') === ${JSON.stringify(text)}); if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); button.click(); })()`);
    await delay(80);
  };
  const screenshot = async name => {
    await evaluate('document.fonts.ready.then(() => true)');
    const shot = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  const navigate = async path => { await page('Page.navigate', { url: origin + path }); await waitFor(`document.querySelector('#root')?.children.length > 0`); };
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/');
  await waitFor(`!!document.querySelector('#player-one')`);
  assert.equal(await evaluate(`document.querySelector('.arena-cta').disabled`), true);
  await evaluate(`(() => { const input = document.getElementById('player-one'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Alice'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  assert.equal(await evaluate(`document.querySelector('.arena-cta').disabled`), true, 'one name must not enable the CTA');
  await evaluate(`(() => { const input = document.getElementById('player-two'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '   '); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  assert.equal(await evaluate(`document.querySelector('.arena-cta').disabled`), true, 'blank spaces must not count as a name');
  await navigate('/');
  await waitFor(`document.querySelector('#player-one')?.value === 'Alice'`);
  assert.equal(await evaluate(`document.querySelector('.arena-cta').disabled`), true);
  await evaluate(`(() => { const input = document.getElementById('player-two'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Bob'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await waitFor(`!document.querySelector('.arena-cta').disabled`);
  await delay(500);
  await screenshot('accueil-desktop');
  await click('.arena-cta');
  await waitFor(`!!document.querySelector('.duel-selection')`);
  assert.equal(await evaluate(`document.querySelectorAll('.duel-tile-wrap').length`), 3);
  await screenshot('selection-desktop');
  await click('[aria-label="Choisir Les Beats de Killer Bee"]');
  await click('.duel-class-options button:first-child');
  await clickText('Essayer la classe D');
  await waitFor(`!!document.querySelector('.beats-session')`);
  // La vidéo des règles s'ouvre au lancement de l'épreuve ; le présentateur peut la passer
  await waitFor(`!!document.querySelector('.rules-video video')`);
  await delay(3200);
  assert.equal(await evaluate(`(() => { const v = document.querySelector('.rules-video video'); return !v.paused || !!document.querySelector('.rules-video-play'); })()`), true, 'rules video plays or offers a play button');
  await screenshot('regles-video');
  await click('.rules-video-skip');
  assert.equal(await evaluate(`document.querySelector('.rules-video') === null`), true, 'skipping closes the rules video');
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').paused`), true, 'track waits for host');
  await clickText('Lecture');
  await waitFor(`!document.querySelector('.beats-session audio').paused`);
  await clickText('Pause');
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').paused`), true);
  await clickText('Revenir au début');
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').currentTime`), 0);
  await clickText('Lecture');
  await waitFor(`!document.querySelector('.beats-session audio').paused`);
  await clickText('Buzz J1');
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').paused`), true);
  assert.equal(await evaluate(`document.querySelector('.beats-now-playing strong').textContent`), 'JOUEUR 1 BUZZ !');
  await click('[aria-label="Mauvaise réponse"]');
  assert.equal(await evaluate(`document.querySelector('.beats-reveal-scene') === null`), true);
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').paused`), true, 'no automatic resume');
  // Après une erreur, le buzzer reste bloqué pendant sept secondes de musique
  const buzzer = id => `[...document.querySelectorAll('.beats-buzzer')].find(b => b.getAttribute('aria-label') === 'Buzz de Joueur ${id}')`;
  assert.equal(await evaluate(`${buzzer(1)}.disabled && ${buzzer(1)}.textContent.includes('Bloqué')`), true, 'the buzzer must lock after a wrong answer');
  await clickText('Buzz J2');
  await click('[aria-label="Mauvaise réponse"]');
  assert.equal(await evaluate(`${buzzer(1)}.disabled`), true, 'the lock must not lift because the opponent tried');
  await clickText('Lecture');
  await waitFor(`!${buzzer(1)}.disabled && !${buzzer(2)}.disabled`);
  await clickText('Buzz J1');
  await click('[aria-label="Mauvaise réponse"]');
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').paused`), true, 'no automatic resume');
  await clickText('Buzz J2');
  await click('[aria-label="Mauvaise réponse"]');
  assert.equal(await evaluate(`document.querySelector('.beats-reveal-scene') === null`), true);
  await clickText('Révéler');
  await waitFor(`!!document.querySelector('.beats-reveal-scene')`);
  await screenshot('killer-bee-reveal');
  await clickText('Morceau suivant');
  assert.equal(await evaluate(`document.querySelector('.beats-session audio').paused`), true, 'no automatic resume');
  await clickText('Buzz J2');
  await click('[aria-label="Bonne réponse"]');
  assert.equal(await evaluate(`document.querySelector('.beats-reveal-info p').textContent`), 'Joueur 2 +5 pts');
  await screenshot('killer-bee-winner');
  assert.deepEqual(exceptions, []);
  console.log('Killer Bee browser checks passed: audio pause, two attempts, no early reveal, scoring and next track.');
  await call('Browser.close');
} finally {
  socket?.close();
  browser?.kill();
  server.kill();
}


