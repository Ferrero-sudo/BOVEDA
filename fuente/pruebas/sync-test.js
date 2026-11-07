const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIST = '/home/claude/boveda/dist', OUT = '/tmp/claude-0/-home-claude/f080613c-ff30-54e8-904c-c8ad1ad09996/scratchpad/shots';
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(d); }); }).listen(8767);
const log = (...a) => console.log(...a);
// ---- fake GitHub ----
const REPO = 'Ferrero-sudo/boveda-datos', TOKEN = 'github_pat_TEST123';
let file = null, shaN = 0, puts = 0;
async function fakeGitHub(route) {
  const req = route.request(); const u = new URL(req.url()); const auth = req.headers()['authorization'];
  const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,PUT' } });
  if (auth !== `Bearer ${TOKEN}`) return route.fulfill({ status: 401, headers: cors, body: '{"message":"Bad credentials"}' });
  if (u.pathname === `/repos/${REPO}`) return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ private: true, permissions: { push: true } }) });
  if (u.pathname === `/repos/${REPO}/contents/boveda.json`) {
    if (req.method() === 'GET') { if (!file) return route.fulfill({ status: 404, headers: cors, body: '{}' }); return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ sha: file.sha, content: file.content.replace(/(.{60})/g, '$1\n') }) }); }
    if (req.method() === 'PUT') { const b = JSON.parse(req.postData()); if ((file && b.sha !== file.sha) || (!file && b.sha)) return route.fulfill({ status: 409, headers: cors, body: '{}' });
      file = { sha: 'sha' + (++shaN), content: b.content }; puts++; return route.fulfill({ status: 200, headers: cors, body: '{}' }); }
  }
  return route.fulfill({ status: 404, headers: cors, body: '{}' });
}
const cloudText = () => file ? Buffer.from(file.content, 'base64').toString() : '';
async function newDevice(b, opts) {
  const ctx = await b.newContext(opts); await ctx.route('https://api.github.com/**', fakeGitHub);
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message)); return p;
}
async function setupPin(p, pin) {
  await p.waitForSelector('#pad .key'); await p.keyboard.type(pin); await p.waitForTimeout(300); await p.keyboard.type(pin);
  await p.waitForSelector('#app:not([hidden])', { timeout: 20000 });
}
const titles = p => p.$$eval('.card h3', h => h.map(x => x.textContent).sort());
(async () => {
  const b = await chromium.launch();
  // ---- PC ----
  const pc = await newDevice(b, { viewport: { width: 1280, height: 860 } });
  await pc.goto('http://localhost:8767/'); await setupPin(pc, '1234');
  log('PC notes:', await titles(pc));
  await pc.click('#btnSettings'); await pc.click('#syOn');
  await pc.fill('#syRepo', 'https://github.com/' + REPO); await pc.fill('#syTok', 'wrong'); await pc.click('#syGo'); await pc.waitForTimeout(400);
  log('wrong token msg:', await pc.textContent('#syErr'));
  await pc.fill('#syTok', TOKEN); await pc.click('#syGo');
  await pc.waitForSelector('#pCode', { state: 'attached', timeout: 15000 });
  const url = await pc.textContent('#pCode'); log('link url len', url.length, url.slice(0, 50));
  log('cloud after activate: puts', puts, 'plaintext leak?', /Renovar|DNI|bóveda|Tareas/i.test(cloudText()));
  await pc.waitForTimeout(400);
  await pc.locator('.qrbox').screenshot({ path: OUT + '/qr.png' });
  await pc.screenshot({ path: OUT + '/11-pairing-qr.png' });
  const dec = execSync(`python3 -c "import cv2;i=cv2.imread('${OUT}/qr.png');print(cv2.QRCodeDetector().detectAndDecode(i)[0])"`).toString().trim();
  log('QR decodes to link?', dec === url, dec.length);
  await pc.click('#pDone');
  log('PC sync icon:', await pc.getAttribute('#btnSync', 'data-state'));
  // ---- Phone ----
  const ph = await newDevice(b, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ph.goto(url.replace(/^https?:\/\/[^/]+/, 'http://localhost:8767'));
  await ph.waitForSelector('#pad .key'); log('phone lock msg:', await ph.textContent('#lockMsg'));
  await setupPin(ph, '9999');
  log('phone hash cleared?', !(await ph.evaluate(() => location.hash)));
  await ph.waitForSelector('#plYes'); await ph.screenshot({ path: OUT + '/12-phone-link.png' });
  await ph.click('#plYes'); await ph.waitForTimeout(2500);
  log('phone notes after link:', await titles(ph));
  // phone creates a note
  await ph.click('#fab'); await ph.fill('#edTitle', 'Desde el móvil'); await ph.press('#edTitle', 'Enter'); await ph.keyboard.type('Hola ordenador');
  await ph.click('#edClose'); await ph.waitForTimeout(3500);
  log('phone sync state:', await ph.getAttribute('#btnSync', 'data-state'), 'puts', puts);
  // PC gets it
  await pc.click('#btnSync'); await pc.waitForTimeout(1500);
  log('PC notes after sync:', await titles(pc), 'toast:', await pc.locator('.toast').allTextContents());
  // PC deletes "Tareas de la semana", edits DNI
  await pc.locator('.card h3:text("Tareas de la semana")').click(); await pc.click('#edDelete'); await pc.waitForTimeout(300);
  await pc.locator('.card h3:text("Renovar el DNI")').click(); await pc.fill('#edTitle', 'Renovar el DNI (cambiada en PC)'); await pc.keyboard.press('Escape');
  await pc.waitForTimeout(3500);
  // Phone syncs on return (simulate visibility) -> click icon
  await ph.click('#btnSync'); await ph.waitForTimeout(1500);
  log('phone notes after PC delete+edit:', await titles(ph));
  // concurrent edits: both edit same note, later wins
  await ph.locator('.card h3:text("Desde el móvil")').click(); await ph.fill('#edBody', 'versión móvil'); await ph.click('#edClose'); await ph.waitForTimeout(200);
  await pc.waitForTimeout(100);
  await pc.click('#btnSync'); await pc.waitForTimeout(1200);
  await pc.locator('.card h3:text("Desde el móvil")').click(); await pc.fill('#edBody', 'versión ordenador (más nueva)'); await pc.keyboard.press('Escape');
  await pc.waitForTimeout(3500); await ph.click('#btnSync'); await ph.waitForTimeout(1500);
  const phBody = await ph.$eval('.card[data-id] .md', e => e.textContent).catch(() => '');
  log('phone has latest text?', (await ph.locator('.card:has(h3:text("Desde el móvil")) .md').textContent()).trim());
  // lock syncs; data in cloud encrypted
  await ph.click('#btnLock'); await ph.waitForTimeout(800);
  log('final cloud leak?', /móvil|ordenador|DNI|Hola/i.test(cloudText()), 'puts total', puts);
  await pc.click('#btnSettings'); await pc.waitForTimeout(300); await pc.screenshot({ path: OUT + '/13-settings-sync.png' });
  log('errors:', pc.errors, ph.errors);
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
