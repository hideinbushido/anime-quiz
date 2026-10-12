// Dependency-free Chrome smoke test through the DevTools protocol (Node 24).
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('test-output');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(output, 'chrome-'));
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { windowsHide: true, stdio: 'pipe' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = 'http://127.0.0.1:4175';
let browser;
let socket;
const exceptions = [];
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* wait for Vite */ }
    if (i === 99) throw new Error('Vite did not start');
    await delay(100);
  }
  browser = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const evaluate = async expression => {
    const result = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 300; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Condition not met: ${expression}`);
  };
  const click = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(80); };
  const clickText = async text => {
    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); button.click(); })()`);
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
  for (const [name, level] of [["Les Liens d'Ayanokoji", 'B'], ['Les Beats de Killer Bee', 'D'], ['Répliques Cultes', 'A']]) {
    await click(`[aria-label="Choisir ${name}"]`);
    await click(`.duel-class-options button:nth-child(${['D', 'C', 'B', 'A'].indexOf(level) + 1})`);
    await clickText(`Verrouiller la classe ${level}`);
  }
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Lancer le duel').disabled`), true);
  let stored = await evaluate(`JSON.parse(localStorage.getItem('anime-quiz-duel-v2'))`);
  assert.deepEqual(stored.selected.map(item => item.selectedBy), ['player1', 'player1', 'player2']);
  await navigate('/');
  await waitFor(`!!document.querySelector('.arena-resume')`);
  assert.ok(await evaluate(`document.querySelector('.arena-resume').textContent.includes('3/5')`));
  await screenshot('accueil-reprise-desktop');
  await clickText('Reprendre le duel↗');
  await waitFor(`document.querySelectorAll('.menu-logo-tile-selected').length === 3`);
  await clickText('Annuler le dernier choix');
  stored = await evaluate(`JSON.parse(localStorage.getItem('anime-quiz-duel-v2'))`);
  assert.equal(stored.selected.length, 2);
  for (const level of ['D', 'C', 'B', 'A']) {
    await evaluate(`[...document.querySelectorAll('.duel-tile-wrap')].find(tile => tile.textContent.includes("Les Liens d'Ayanokoji")).querySelector('.duel-text-button').click()`);
    await click(`.duel-class-options button:nth-child(${['D', 'C', 'B', 'A'].indexOf(level) + 1})`);
    await clickText(`Essayer la classe ${level}`);
    await waitFor(`!!document.querySelector('.links-board')`);
    assert.equal(await evaluate(`document.querySelectorAll('.links-card').length`), { D: 6, C: 8, B: 10, A: 12 }[level]);
    assert.equal(await evaluate(`document.querySelectorAll('.links-character-grid').length`), 0);
    if (level === 'A') {
      await evaluate('window.scrollTo(0, 0)'); await screenshot('ayanokoji-jeu-desktop');
      await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.ok(await evaluate('document.documentElement.scrollWidth <= 390'), 'logic game overflows mobile viewport');
      await screenshot('ayanokoji-mobile');
      await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    }
    await click('.duel-respondent button.player2');
    const solution = await evaluate(`(async () => { const { puzzlesByClass } = await import('/src/data/logicLinksDemos.ts'); const puzzle = puzzlesByClass[${JSON.stringify(level)}][0]; return puzzle.solutionIds.map(id => puzzle.characters.find(c => c.id === id).name); })()`);
    // Start in the middle, then work outwards.
    for (const index of [3, 5, 1, 4, 0, 2]) {
      await evaluate(`[...document.querySelectorAll('.links-card')].find(card => card.querySelector('strong').textContent === ${JSON.stringify(solution[index])}).click()`);
      await click(`.links-slot[aria-label="Case ${index + 1} vide"]`);
    }
    // Swap twice without dropping either card.
    const slot = n => evaluate(`document.querySelectorAll('.links-slot')[${n}].click()`).then(() => delay(80));
    await slot(0); await slot(1);
    await slot(1); await slot(0);
    await clickText('Valider la chaîne');
    await waitFor(`document.querySelector('.links-feedback')?.textContent.includes('Chaîne parfaite')`);
    assert.equal(await evaluate(`document.querySelectorAll('.links-slot-correct').length`), 6);
    assert.ok(await evaluate(`document.querySelector('.duel-header .player2').textContent.includes('600')`));
    if (level === 'A') { await evaluate('window.scrollTo(0, 0)'); await screenshot('ayanokoji-desktop'); }
    await clickText("Terminer l'épreuve");
    await clickText('Retour à la sélection');
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('anime-quiz-duel-v2')).players.player2.score`), 0);
  }
  // Existing blind test and quotes remain playable through the same duel controls.
  for (const name of ['Les Beats de Killer Bee', 'Répliques Cultes']) {
    await evaluate(`[...document.querySelectorAll('.duel-tile-wrap')].find(tile => tile.textContent.includes(${JSON.stringify(name)})).querySelector('.duel-text-button').click()`);
    await clickText('Essayer la classe D');
    if (name.startsWith('Les Beats')) {
      await waitFor(`!!document.querySelector('.beats-session audio')`);
      assert.ok(await evaluate(`document.querySelector('.beats-session audio').getAttribute('src').endsWith('.MP3')`));
      // Le blind test se joue au buzzer : un joueur buzze, puis le présentateur valide
      await click('[aria-label^="Buzz de"]');
      await waitFor(`!!document.querySelector('[aria-label="Bonne réponse"]')`);
      await click('[aria-label="Bonne réponse"]');
      await waitFor(`!!document.querySelector('.beats-reveal-info')`);
    } else {
      // L'essai s'ouvre derrière la transition entre écrans : on attend le champ avant d'écrire
      await waitFor(`!!document.querySelector('.answer-input')`);
      await evaluate(`(() => { const input = document.querySelector('.answer-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Luffy'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await clickText('Valider');
      await waitFor(`!!document.querySelector('.feedback-correct')`);
    }
    // Répliques : 100 points par bonne réponse. Blind test : barème propre à la classe, il suffit qu'il soit crédité.
    if (name.startsWith('Les Beats')) assert.notEqual(await evaluate(`document.querySelector('.duel-header .player1 .zk-sr').textContent`), '0');
    else assert.ok(await evaluate(`document.querySelector('.duel-header .player1').textContent.includes('100')`));
    await clickText('Retour à la sélection');
  }
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.scrollTo(0, 0)');
  await screenshot('selection-mobile');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= 390'), 'selection overflows mobile viewport');
  await navigate('/'); await waitFor(`!!document.querySelector('#player-one')`);
  await screenshot('accueil-mobile');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= 390'), 'home overflows mobile viewport');
  await page('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate(`[...document.querySelectorAll('.arena-brand, .arena-history, .arena-player, .arena-cta')].every(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= 320; })`), 'home controls are clipped at 320px');
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await clickText('Effacer la session');
  assert.equal(await evaluate(`localStorage.getItem('anime-quiz-duel-v2')`), null);
  assert.equal(await evaluate(`document.querySelector('#player-one').value`), '');
  assert.equal(await evaluate(`document.querySelector('#player-two').value`), '');
  assert.equal(await evaluate(`document.querySelector('.arena-cta').disabled`), true);
  await navigate('/'); await waitFor(`!!document.querySelector('#player-one')`);
  assert.equal(await evaluate(`document.querySelector('.arena-resume') === null`), true);
  assert.equal(await evaluate(`document.querySelector('#player-one').value`), '');
  await navigate('/jeu'); await waitFor(`!!document.querySelector('#player-one')`);
  assert.equal(await evaluate('location.pathname'), '/');
  assert.deepEqual(exceptions, []);
  console.log('Browser smoke passed: home name validation, draft restore, resume/reset, 2+2+1 guards, reload, all four logic classes, free placement, swaps, attribution, existing games, mobile 320/390px, direct URL recovery.');
  console.log(`Screenshots: ${output}`);
  await call('Browser.close');
} finally {
  socket?.close();
  browser?.kill();
  server.kill();
}
