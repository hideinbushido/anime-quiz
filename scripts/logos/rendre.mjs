// Rend un logo d'épreuve en PNG transparent 1024 x 1024 à partir du gabarit badge.html.
// Usage : node rendre.mjs <sortie.png> perso=<fichier> sceau=<fichier> petit="LES BEATS DE" grand="KILLER BEE" [h=820 x=0 y=20]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [, , sortie, ...paires] = process.argv;
const ici = dirname(fileURLToPath(import.meta.url));
const params = new URLSearchParams();
for (const paire of paires) {
  const i = paire.indexOf('=');
  const cle = paire.slice(0, i), valeur = paire.slice(i + 1);
  params.set(cle, cle === 'perso' || cle === 'sceau' ? pathToFileURL(resolve(valeur)).href : valeur);
}
const url = `${pathToFileURL(join(ici, 'badge.html')).href}?${params}`;

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
  '--window-size=1024,1024', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'logo-'))}`, 'about:blank',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cible;
for (let i = 0; i < 60 && !cible; i++) {
  await sleep(200);
  try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const attente = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && attente.has(m.id)) attente.get(m.id)(m.result ?? m.error); };
const envoyer = (method, p = {}) => new Promise((r) => { attente.set(++id, r); ws.send(JSON.stringify({ id, method, params: p })); });

await envoyer('Page.enable');
await envoyer('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
await envoyer('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await envoyer('Page.navigate', { url });
for (let i = 0; i < 100; i++) {
  await sleep(150);
  const pret = await envoyer('Runtime.evaluate', {
    expression: `document.body?.dataset.pret === '1' && [...document.images].every(i => i.complete && i.naturalWidth > 0)`, returnByValue: true,
  });
  if (pret.result?.value) break;
}
await sleep(300);
const capture = await envoyer('Page.captureScreenshot', { format: 'png' });
writeFileSync(sortie, Buffer.from(capture.data, 'base64'));
console.log('écrit', sortie);
ws.close();
chrome.kill();
process.exit(0);
