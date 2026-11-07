const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = '/home/claude/boveda/dist', OUT = '/tmp/claude-0/-home-claude/f080613c-ff30-54e8-904c-c8ad1ad09996/scratchpad/shots';
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(8765);
const log = (...a) => console.log(...a);
async function pin(p, digits) { for (const d of digits) await p.click(`#pad .key:text-is("${d}")`); }
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  // Virtual authenticator with PRF
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('WebAuthn.enable');
  let authOk = true;
  try { await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true } }); }
  catch (e) { authOk = false; log('no virtual PRF authenticator:', e.message); }
  await p.goto('http://localhost:8765/');
  await p.waitForSelector('#pad .key');
  log('lock title:', await p.textContent('#lockTitle'));
  await p.screenshot({ path: OUT + '/01-setup.png' });
  let t = Date.now();
  await pin(p, '1357'); await p.waitForFunction(() => document.querySelector('#lockTitle').textContent.includes('Repite'));
  await pin(p, '1357');
  await p.waitForFunction(() => /huella/.test(document.querySelector('#lockTitle').textContent) || !document.querySelector('#app').hidden, null, { timeout: 20000 });
  log('vault created in', Date.now() - t, 'ms; stage:', await p.textContent('#lockTitle'));
  if (!(await p.isHidden('#lock'))) {
    await p.screenshot({ path: OUT + '/02-bio-offer.png' });
    if (authOk) { await p.click('#lockActions .btn.primary'); }
    else await p.click('#lockActions .btn.quiet');
    await p.waitForSelector('#app:not([hidden])', { timeout: 15000 }).catch(async () => log('bio msg:', await p.textContent('#lockMsg')));
  }
  await p.waitForTimeout(500);
  log('cards:', await p.locator('.card').count(), 'upcoming:', await p.locator('.up').count());
  await p.waitForTimeout(3000); await p.screenshot({ path: OUT + '/03-list-mobile.png' });
  // search
  await p.fill('#q', 'dni'); await p.waitForTimeout(150);
  log('search dni ->', await p.locator('.card').count(), 'marks:', await p.locator('.card mark').count());
  await p.fill('#q', 'tramites'); await p.waitForTimeout(150);
  log('search tramites (sin tilde) ->', await p.locator('.card').count());
  await p.fill('#q', '#tareas'); await p.waitForTimeout(150);
  log('search #tareas ->', await p.locator('.card').count());
  await p.fill('#q', 'zzzz'); await p.waitForTimeout(150);
  log('empty text:', (await p.textContent('.empty h2')).trim());
  await p.fill('#q', ''); await p.waitForTimeout(150);
  // toggle checkbox on card
  const before = await p.locator('.card input[type=checkbox]:checked').count();
  await p.locator('.card input[type=checkbox]:not(:checked)').first().click(); await p.waitForTimeout(300);
  log('checked before/after:', before, await p.locator('.card input[type=checkbox]:checked').count(), 'editor open?', await p.evaluate(() => document.body.classList.contains('editing')));
  // new note
  await p.click('#fab'); await p.waitForTimeout(400);
  await p.fill('#edTitle', 'Claves del wifi'); await p.press('#edTitle', 'Enter');
  await p.keyboard.type('Casa: Pa55word\n- [ ] Cambiar la clave del router');
  await p.keyboard.press('Enter'); await p.keyboard.type('Revisar en enero');
  await p.click('#swatches .sw[data-c="lila"]');
  await p.fill('#tagInput', 'claves'); await p.press('#tagInput', 'Enter');
  await p.fill('#edDate', new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)); await p.dispatchEvent('#edDate', 'change');
  await p.waitForTimeout(700);
  log('body after list-continue:', JSON.stringify(await p.inputValue('#edBody')));
  log('save state:', await p.textContent('#saveState'));
  await p.screenshot({ path: OUT + '/04-editor-mobile.png' });
  await p.click('#modeView'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/05-editor-view.png' });
  await p.click('#edClose'); await p.waitForTimeout(500);
  log('cards after new:', await p.locator('.card').count(), 'upcoming:', await p.locator('.up').count());
  // check storage is encrypted
  const raw = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('boveda-notas'); q.onsuccess = () => { const t = q.result.transaction('notes').objectStore('notes').getAll(); t.onsuccess = () => r(JSON.stringify(t.result)); }; }));
  log('plaintext leak in IDB?', /Pa55word|wifi|DNI/i.test(raw), 'records len', raw.length);
  // lock & wrong pin
  await p.click('#btnLock'); await p.waitForSelector('#lock:not([hidden])');
  await p.waitForTimeout(800);
  if (await p.isVisible('#app')) log('ERR app visible after lock');
  // if bio auto-unlocked, lock again
  if (!(await p.isHidden('#lock')) === false) {}
  await p.reload(); await p.waitForSelector('#pad .key'); await p.waitForTimeout(1200);
  if (await p.isVisible('#app')) { log('auto bio unlock on reload: yes'); await p.click('#btnLock'); await p.waitForTimeout(300); }
  await pin(p, '0000'); await p.waitForFunction(() => /incorrecto/.test(document.querySelector('#lockMsg').textContent), null, { timeout: 15000 });
  log('wrong pin msg:', await p.textContent('#lockMsg'));
  await p.screenshot({ path: OUT + '/06-wrong-pin.png' });
  await pin(p, '1357'); await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  log('unlocked with pin, cards:', await p.locator('.card').count(), 'has wifi note:', await p.locator('.card h3:text("Claves del wifi")').count());
  // bio unlock
  if (authOk) {
    await p.click('#btnLock'); await p.waitForTimeout(300);
    await p.click('#pad .key.bio').catch(() => {});
    await p.waitForSelector('#app:not([hidden])', { timeout: 10000 }).then(() => log('bio unlock: OK')).catch(async () => log('bio unlock FAIL:', await p.textContent('#lockMsg')));
  }
  // export
  await p.click('#btnSettings'); await p.waitForSelector('.sheet');
  await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/07-settings.png', fullPage: false });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#sExport')]);
  const bpath = OUT + '/backup.json'; await dl.saveAs(bpath);
  const bk = JSON.parse(fs.readFileSync(bpath, 'utf8')); log('backup notes:', bk.notes.length, 'leak?', /Pa55word/.test(fs.readFileSync(bpath, 'utf8')));
  await p.keyboard.press('Escape');
  // desktop context: import backup
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const d = await ctx2.newPage(); d.on('pageerror', e => errors.push('desk pageerror ' + e.message));
  await d.goto('http://localhost:8765/'); await d.waitForSelector('#pad .key');
  await d.keyboard.type('2468'); await d.waitForTimeout(300); await d.keyboard.type('2468');
  await d.waitForSelector('#app:not([hidden])', { timeout: 20000 });
  await d.click('#btnSettings'); await d.waitForSelector('#sFile', { state: 'attached' });
  await d.setInputFiles('#sFile', bpath); await d.waitForSelector('#pinAsk');
  await d.fill('#pinAsk', '1111'); await d.click('#pinForm .btn.primary'); await d.waitForTimeout(1500);
  log('import wrong pin msg:', await d.textContent('#pinAskErr'));
  await d.fill('#pinAsk', '1357'); await d.click('#pinForm .btn.primary'); await d.waitForTimeout(2500);
  log('desktop cards after import:', await d.locator('.card').count(), 'toast:', await d.locator('.toast').allTextContents());
  await d.waitForTimeout(3200);
  await d.screenshot({ path: OUT + '/08-desktop-dark.png' });
  await d.locator('.card h3:text("Claves del wifi")').first().click(); await d.waitForTimeout(500);
  await d.screenshot({ path: OUT + '/09-desktop-editor.png' });
  await d.keyboard.press('Escape'); await d.keyboard.press('/'); await d.keyboard.type('claves'); await d.waitForTimeout(200);
  log('desktop "/" search ->', await d.locator('.card').count());
  // light desktop
  await d.emulateMedia({ colorScheme: 'light' }); await d.fill('#q', ''); await d.waitForTimeout(200);
  await d.screenshot({ path: OUT + '/10-desktop-light.png' });
  // overflow check
  for (const [pg, name] of [[p, 'mobile'], [d, 'desktop']]) log(name, 'h-overflow:', await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
  log('ERRORS:', errors.length ? errors : 'none');
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
