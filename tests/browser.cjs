/* Optional regression tests; the app itself needs no npm packages or build step.
 * Start a static server on port 3000, then:
 *   npm install --no-save --no-package-lock playwright@1.58.2
 *   npx playwright install --with-deps chromium webkit
 *   node tests/browser.cjs
 * Env: BASE_URL, PLAYWRIGHT_MODULE, ENGINES=chromium,webkit, QA_DIR.
 * All browser contexts and imported fixtures are isolated from your real library.
 */
'use strict';
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const BASE = process.env.BASE_URL || 'http://localhost:3000/';
const results = [], errors = [];
const ENGINES = (process.env.ENGINES || 'chromium,webkit').split(',');
const QA = process.env.QA_DIR;
if (QA) fs.mkdirSync(QA, {recursive: true});
const pause = (page, ms = 35) => page.waitForTimeout(ms);
async function test(name, action) {
  const start = Date.now();
  try { await action(); results.push({name, status: 'PASS', ms: Date.now() - start}); console.log('PASS', name); }
  catch (error) { results.push({name, status: 'FAIL', error: error.stack}); console.error('FAIL', name, error.stack); throw error; }
}
const fixture = (name, heading) => ({name, mimeType: 'text/html', buffer: Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>' + heading + '</title></head><body><h1 id="fixture-title">' + heading + '</h1><p>A locally imported page.</p><p id="script-ok"></p><script>document.getElementById("script-ok").textContent="Interactive scripts still work";<\/script></body></html>')});
async function visibleMenu(page, id = '#m1') {
  await page.locator(id).waitFor({state: 'visible'});
  await pause(page);
  return page.locator(id).boundingBox();
}
async function inside(page, id = '#m1') {
  const box = await page.locator(id).boundingBox();
  const b = await page.evaluate(() => ProGlass.bounds());
  assert(box, id + ' is visible');
  assert(box.x >= b.left - 1 && box.y >= b.top - 1, JSON.stringify({box, b}));
  assert(box.x + box.width <= b.right + 1 && box.y + box.height <= b.bottom + 1, JSON.stringify({box, b}));
  return box;
}
async function adjacent(page, anchor, id = '#m1') {
  const box = await inside(page, id), r = await page.locator(anchor).boundingBox();
  assert(r, 'anchor is visible');
  const gap = Math.min(Math.abs(box.y - r.y - r.height), Math.abs(r.y - box.y - box.height));
  assert(gap <= 14, 'menu is beside its own trigger: ' + JSON.stringify({gap, box, r}));
}
async function escape(page) { await page.keyboard.press('Escape'); await page.locator('#layer').waitFor({state: 'hidden'}); }
async function savedCount(page) { return page.evaluate(async () => (await DB.all()).length); }
async function screenshot(page, name) { if (QA) await page.screenshot({path: path.join(QA, name + '.png')}); }

async function suite(engine, label, viewport, mobile) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prohtml-glass-'));
  const options = {viewport, reducedMotion: 'reduce', acceptDownloads: true,
    serviceWorkers: 'block', hasTouch: mobile, isMobile: mobile};
  // WebKit's ephemeral/private contexts cannot store IndexedDB Blob values.
  // Use an isolated disk-backed profile to test Safari's normal browsing mode.
  const browser = label === 'webkit' ? null : await engine.launch({headless: true, args: ['--no-sandbox']});
  const context = label === 'webkit'
    ? await engine.launchPersistentContext(path.join(temp, 'profile'), {headless: true, ...options})
    : await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(label + '/' + viewport.width + ': ' + e.message));
  const prefix = label + '/' + viewport.width + ': ';
  try {
    await test(prefix + 'shell, all tabs, and native glass assets', async () => {
      await page.goto(BASE);
      await page.locator('#bigAdd').waitFor();
      assert.equal(await page.locator('[role="tab"]').count(), 4);
      assert.equal(await page.locator('#cnt').textContent(), '0');
      assert.equal(await page.evaluate(() => typeof ProGlass.createMenus), 'function');
      assert(await page.locator('.tabs').evaluate(el => el.scrollWidth <= el.clientWidth + 1) || !mobile,
        'phone destinations should not be cropped');
      assert.equal(await page.locator('button button').count(), 0);
      await screenshot(page, prefix.replace(/[^a-z0-9]/gi, '-') + 'empty');
    });
    await test(prefix + 'plus menu anchored, dismissible, focus restored', async () => {
      await page.locator('#bAdd').click(); await visibleMenu(page);
      await adjacent(page, '#bAdd');
      assert.equal(await page.locator('#bAdd').getAttribute('aria-expanded'), 'true');
      assert.equal(await page.evaluate(() => document.getElementById('home').inert), true);
      await escape(page);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'bAdd');
      assert.equal(await page.evaluate(() => document.getElementById('home').inert), false);
      await page.locator('#bAdd').click(); await visibleMenu(page);
      await page.locator('#scrim').click({position: {x: 4, y: 4}});
      await page.locator('#layer').waitFor({state: 'hidden'});
    });
    await test(prefix + 'empty-library add menu originates at CTA, not center', async () => {
      await page.locator('#bigAdd').click(); await visibleMenu(page);
      await adjacent(page, '#bigAdd');
      assert.equal(await page.locator('#m1 [data-a="addf"]').count(), 1);
      await escape(page);
    });
    await test(prefix + 'actual file-picker import, scripts, and storage', async () => {
      await page.locator('#bAdd').click(); await visibleMenu(page);
      const chooser = page.waitForEvent('filechooser');
      await page.locator('#m1 [data-a="addf"]').click();
      await (await chooser).setFiles([
        fixture('Medicine_Revision.html', 'Medicine revision'),
        fixture('Quick_Notes.html', 'Quick notes'),
        fixture('Case_Review_ગુજરાતી.html', 'Case review — ગુજરાતી')
      ]);
      await page.waitForFunction(() => S.files.length === 3 && document.getElementById('cnt').textContent === '3');
      assert.equal(await page.locator('.row[data-id]').count(), 3);
      assert.equal(await savedCount(page), 3);
      assert.equal(await page.locator('.row .row-more').count(), 3);
      assert.equal(await page.locator('button button').count(), 0);
      await screenshot(page, prefix.replace(/[^a-z0-9]/gi, '-') + 'library');
    });
    await test(prefix + 'each file has its own anchored options; favorite/search preserved', async () => {
      const more = '.row[data-id]:nth-child(2) .row-more';
      await page.locator(more).click(); await visibleMenu(page);
      await adjacent(page, more);
      await page.evaluate(() => render()); await pause(page, 80);
      assert.equal(await page.locator('#layer').isVisible(), true, 'progress redraw must not detach the menu');
      assert.equal(await page.locator(more).getAttribute('aria-expanded'), 'true');
      await adjacent(page, more);
      await screenshot(page, prefix.replace(/[^a-z0-9]/gi, '-') + 'file-options');
      await page.locator('#m1 [data-a="fav"]').click();
      await page.waitForFunction(() => S.files.some(f => f.fav));
      await page.locator('[data-tab="fav"]').click();
      assert.equal(await page.locator('.row[data-id]').count(), 1);
      await page.locator('#q').fill('no matching fixture');
      await page.getByText('No matches', {exact: true}).waitFor();
      await page.locator('#q').fill('');
      await page.locator('[data-tab="my"]').click();
      await pause(page);
      const lens = await page.locator('.tab-lens').boundingBox(), tab = await page.locator('[data-tab="my"]').boundingBox();
      assert(Math.abs(lens.x - tab.x) < 2 && Math.abs(lens.width - tab.width) < 2, JSON.stringify({lens, tab}));
    });
    await test(prefix + 'reader, source HTML, font submenu, slider and reset', async () => {
      await page.locator('.row[data-id] .row-open').first().click();
      await page.frameLocator('#rframe iframe').locator('#script-ok').waitFor();
      assert.equal(await page.frameLocator('#rframe iframe').locator('#script-ok').textContent(), 'Interactive scripts still work');
      await page.locator('#rMenu').click(); await visibleMenu(page); await adjacent(page, '#rMenu');
      await page.locator('#m1 [data-a="font"]').click(); await visibleMenu(page, '#m2');
      await inside(page, '#m2');
      assert.equal(await page.locator('#m2').getAttribute('data-presentation'), mobile ? 'drill' : 'cascade');
      await page.locator('#fontSlider').evaluate(el => { el.value = '150'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      assert.equal(await page.locator('#fPct').textContent(), '150%');
      assert.equal(await page.frameLocator('#rframe iframe').locator('#hr-zoom').textContent(), 'html{zoom:1.5 !important}');
      await page.locator('#fontSlider').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#fontSlider').inputValue(), '155', 'range arrows remain native');
      await page.locator('#m2 [data-a="font:0"]').click();
      assert.equal(await page.locator('#fPct').textContent(), '100%');
      await screenshot(page, prefix.replace(/[^a-z0-9]/gi, '-') + 'font');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#m2').isVisible(), false);
      assert.equal(await page.locator('#m1').isVisible(), true);
    });
    await test(prefix + 'focus display, floating-button anchor, and network submenu', async () => {
      await page.locator('#m1 [data-a="disp"]').click(); await visibleMenu(page, '#m2');
      assert.equal(await page.locator('#m2 [data-a="mode:adjacent"]').getAttribute('aria-checked'), 'true');
      await page.locator('#m2 [data-a="mode:focus"]').click();
      await page.locator('#layer').waitFor({state: 'hidden'});
      assert.equal(await page.locator('#reader').getAttribute('data-mode'), 'focus');
      await page.locator('#flMenu').click(); await visibleMenu(page); await adjacent(page, '#flMenu');
      await page.locator('#m1 [data-a="net"]').click(); await visibleMenu(page, '#m2');
      await page.locator('#m2 [data-a="net:false"]').click();
      await page.locator('#layer').waitFor({state: 'hidden'});
      await page.waitForFunction(() => {
        const f = document.querySelector('#rframe iframe');
        return f && f.contentDocument && !!f.contentDocument.querySelector('meta[http-equiv="Content-Security-Policy"]');
      });
      await page.locator('#flClose').click();
      await page.locator('#reader').waitFor({state: 'hidden'});
      assert.equal(await page.locator('.row[data-id]').count(), 3);
    });
    await test(prefix + 'right-click and long-press use the exact press location', async () => {
      const row = page.locator('.row[data-id] .row-open').last();
      await row.scrollIntoViewIfNeeded();
      let box = await row.boundingBox();
      await row.click({button: 'right', position: {x: 65, y: 25}});
      await visibleMenu(page); await inside(page);
      let menu = await page.locator('#m1').boundingBox();
      const px = box.x + 65, py = box.y + 25;
      assert(Math.min(Math.abs(menu.y - py), Math.abs(menu.y + menu.height - py)) <= 8, JSON.stringify({menu, py}));
      assert.equal(await page.locator('#reader').isVisible(), false);
      await escape(page);
      box = await row.boundingBox();
      await row.dispatchEvent('pointerdown', {pointerType: 'touch', pointerId: 81, button: 0, clientX: box.x + 70, clientY: box.y + 30});
      await pause(page, 610); await visibleMenu(page); await inside(page);
      await row.dispatchEvent('pointerup', {pointerType: 'touch', pointerId: 81, button: 0});
      await row.dispatchEvent('click');
      assert.equal(await page.locator('#reader').isVisible(), false, 'long press must not also open the file');
      menu = await page.locator('#m1').boundingBox();
      assert(Math.min(Math.abs(menu.y - box.y - 30), Math.abs(menu.y + menu.height - box.y - 30)) <= 8);
      await escape(page);
    });
    await test(prefix + 'folder import and its own overflow menu retain path data', async () => {
      const dir = path.join(temp, 'Subjects'); fs.mkdirSync(path.join(dir, 'Medicine'), {recursive: true});
      fs.writeFileSync(path.join(dir, 'Medicine', 'Cardiology.html'), fixture('x', 'Cardiology').buffer);
      fs.writeFileSync(path.join(dir, 'Medicine', 'Neurology.html'), fixture('x', 'Neurology').buffer);
      await page.evaluate(() => { document.getElementById('home').scrollTop = 0; });
      await page.locator('#bAdd').click(); await visibleMenu(page);
      const chooser = page.waitForEvent('filechooser'); await page.locator('#m1 [data-a="addd"]').click();
      await (await chooser).setFiles(dir);
      await page.waitForFunction(() => S.files.length === 5);
      await page.locator('.row[data-dir] .row-more').click(); await visibleMenu(page);
      await adjacent(page, '.row[data-dir] .row-more');
      await page.locator('#m1 [data-a="opendir"]').click();
      await page.waitForFunction(() => S.path.length === 1);
      assert.equal(await page.locator('#ttl').textContent(), 'Subjects');
      await page.locator('.row[data-dir] .row-open').click();
      assert.equal(await page.locator('.row[data-id]').count(), 2);
      await page.locator('[data-tab="my"]').click();
    });
    await test(prefix + 'reload keeps all imported blobs, folder paths, and favorites', async () => {
      await page.reload(); await page.waitForFunction(() => S.files.length === 5);
      assert.equal(await savedCount(page), 5);
      assert.equal(await page.evaluate(() => S.files.filter(f => f.fav).length), 1);
      assert.equal(await page.locator('.row[data-dir]').count(), 1);
      assert.equal(await page.locator('.row[data-id]').count(), 3);
    });
    await test(prefix + 'theme/settings and built-in Custom Module are preserved', async () => {
      await page.locator('[data-tab="set"]').click();
      await page.locator('#sTheme [data-v="dark"]').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await screenshot(page, prefix.replace(/[^a-z0-9]/gi, '-') + 'dark');
      await page.locator('#sTheme [data-v="light"]').click();
      await page.locator('#sDisp').selectOption('adjacent');
      await page.locator('[data-tab="custom"]').click();
      await page.locator('#openCustomModule').click();
      await page.frameLocator('#rframe iframe').getByRole('heading', {name: 'Marrow Custom Module', exact: true}).waitFor();
      assert.equal(await page.locator('#rTitle').textContent(), 'Marrow Custom Module');
      await page.locator('#rMenu').click(); await visibleMenu(page); await adjacent(page, '#rMenu');
      await escape(page); await page.locator('#rClose').click();
      await page.locator('[data-tab="my"]').click();
    });
    await test(prefix + 'viewport resizing and short landscape menus stay on-screen', async () => {
      await page.evaluate(() => { document.getElementById('home').scrollTop = 0; });
      await page.locator('#bAdd').click(); await visibleMenu(page);
      for (const size of [{width: 320, height: 568}, {width: 844, height: 390}, {width: 768, height: 1024}, viewport]) {
        await page.setViewportSize(size); await pause(page, 100); await inside(page); await adjacent(page, '#bAdd');
      }
      await escape(page);
    });
    await test(prefix + 'keyboard tab navigation, context menu, and focus trap', async () => {
      await page.locator('[data-tab="my"]').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-tab="custom"]').getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await page.locator('[data-tab="my"]').getAttribute('aria-selected'), 'true');
      await page.locator('.row[data-id] .row-open').first().focus(); await page.keyboard.press('Shift+F10');
      await visibleMenu(page); await inside(page);
      await page.keyboard.press('End');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.a), 'del');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.a), 'open');
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.a), 'fav');
      const animated = await page.locator('#layer').evaluate(el => el.getAnimations({subtree: true}).length);
      assert.equal(animated, 0, 'Reduce Motion has no menu/child animations');
      await escape(page);
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('row-more')), true);
    });
    await test(prefix + 'file/folder actions affect only the selected fixture', async () => {
      const row = page.locator('.row[data-id]').last();
      const deletedId = await row.getAttribute('data-id');
      await row.locator('.row-more').click(); await visibleMenu(page);
      await page.locator('#m1 [data-a="del"]').click();
      await page.waitForFunction(id => !S.files.some(f => f.id === id), deletedId);
      assert.equal(await page.evaluate(() => S.files.length), 4);
      await page.locator('.row[data-dir] .row-more').click(); await visibleMenu(page);
      await page.locator('#m1 [data-a="deldir"]').click();
      await page.waitForFunction(() => S.files.length === 2);
      assert.equal(await page.locator('.row[data-id]').count(), 2);
    });
  } finally {
    await context.close(); if (browser) await browser.close(); fs.rmSync(temp, {recursive: true, force: true});
  }
}

async function motionSuite(engine, label) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prohtml-motion-'));
  const options = {viewport: {width: 1100, height: 820}, reducedMotion: 'no-preference', serviceWorkers: 'block'};
  const browser = label === 'webkit' ? null : await engine.launch({headless: true, args: ['--no-sandbox']});
  const context = label === 'webkit'
    ? await engine.launchPersistentContext(path.join(temp, 'profile'), {headless: true, ...options})
    : await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(label + '/motion: ' + e.message));
  try {
    await test(label + ': real spring keyframes and rapid open/close cancellation', async () => {
      await page.goto(BASE); await page.locator('#bigAdd').waitFor();
      await page.locator('#bAdd').click();
      const animation = await page.locator('#m1').evaluate(el => {
        const a = el.getAnimations()[0]; return a && {duration: a.effect.getTiming().duration, frames: a.effect.getKeyframes().length};
      });
      assert(animation && animation.duration === 660 && animation.frames > 40, JSON.stringify(animation));
      await pause(page, 720); await adjacent(page, '#bAdd');
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => { hideMenus(false); addMenu(document.getElementById('bAdd')); });
      }
      await pause(page, 730);
      assert.equal(await page.locator('#layer').isVisible(), true);
      assert.equal(await page.locator('#bAdd').getAttribute('aria-expanded'), 'true');
      await adjacent(page, '#bAdd');
      await page.keyboard.press('Escape'); await page.locator('#layer').waitFor({state: 'hidden'});
      assert.equal(await page.evaluate(() => document.getElementById('home').inert), false);
    });
  } finally { await context.close(); if (browser) await browser.close(); fs.rmSync(temp, {recursive: true, force: true}); }
}

async function offlineSuite(engine, label) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prohtml-offline-'));
  const options = {viewport: {width: 390, height: 844}, reducedMotion: 'reduce', serviceWorkers: 'allow'};
  const browser = label === 'webkit' ? null : await engine.launch({headless: true, args: ['--no-sandbox']});
  const context = label === 'webkit'
    ? await engine.launchPersistentContext(path.join(temp, 'profile'), {headless: true, ...options})
    : await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(label + '/offline: ' + e.message));
  try {
    await test(label + ': PWA shell, glass assets and imported files work offline', async () => {
      await page.goto(BASE); await page.locator('#bigAdd').waitFor();
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      const cached = await page.evaluate(async () => {
        const keys = await caches.keys(), c = await caches.open('html-reader-liquid-glass-v5');
        const urls = (await c.keys()).map(r => new URL(r.url).pathname);
        return {keys, urls};
      });
      assert(cached.urls.some(s => s.endsWith('/assets/liquid-glass.css')));
      assert(cached.urls.some(s => s.endsWith('/assets/liquid-glass.js')));
      await page.locator('#inFiles').setInputFiles(fixture('Offline_Check.html', 'Offline fixture'));
      await page.waitForFunction(() => S.files.length === 1);
      await context.setOffline(true); await page.reload();
      await page.waitForFunction(() => S.files.length === 1);
      await page.locator('#bAdd').click(); await visibleMenu(page); await adjacent(page, '#bAdd');
      await escape(page);
      await page.locator('.row-open').click();
      await page.frameLocator('#rframe iframe').locator('#fixture-title').waitFor();
      assert.equal(await page.frameLocator('#rframe iframe').locator('#fixture-title').textContent(), 'Offline fixture');
      await context.setOffline(false);
    });
  } finally { await context.close(); if (browser) await browser.close(); fs.rmSync(temp, {recursive: true, force: true}); }
}
async function upgradeSuite(engine, label) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prohtml-upgrade-'));
  const options = {viewport: {width: 390, height: 844}, reducedMotion: 'reduce', serviceWorkers: label === 'chromium' ? 'allow' : 'block'};
  const browser = label === 'webkit' ? null : await engine.launch({headless: true, args: ['--no-sandbox']});
  const context = label === 'webkit'
    ? await engine.launchPersistentContext(path.join(temp, 'profile'), {headless: true, ...options})
    : await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(label + '/upgrade: ' + e.message));
  try {
    await test(label + ': existing v1 database, saved module, preferences and quiz progress survive upgrade', async () => {
      const before = new URL('legacy-reader-fixture.html', BASE).href;
      await page.route(before, route => route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Legacy storage fixture</title><p>Existing reader data</p>'}));
      await page.goto(before);
      await page.evaluate(async () => {
        const records = [
          {id: 'existing-file', name: 'Existing_Notes.html', rel: ['Existing Folder'], fav: true},
          {id: 'existing-module', name: 'Existing_Custom_Module.html', rel: ['Custom Modules'], fav: false, customModuleTest: true}
        ];
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('html-reader-pwa', 1);
          request.onupgradeneeded = () => request.result.createObjectStore('files', {keyPath: 'id'});
          request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const t = db.transaction('files', 'readwrite');
          records.forEach(f => {
            const html = '<!doctype html><html><meta charset="utf-8"><h1 id="legacy">Existing saved content</h1></html>';
            const blob = new File([html], f.name, {type: 'text/html'});
            t.objectStore('files').put({...f, blob, size: blob.size, added: 1700000000000});
          });
          t.oncomplete = resolve; t.onerror = () => reject(t.error);
        }); db.close();
        localStorage.setItem('hr.set', JSON.stringify({theme:'dark', display:'focus', net:false, fix:true, fmt:true, font:150}));
        localStorage.setItem('gt_existing_quiz', JSON.stringify({phase:'prog', ans:{0:2}, question:1}));
      });
      if (label === 'chromium') await page.evaluate(async () => {
        await (await caches.open('another-app-cache')).put('/keep-unrelated-data', new Response('keep me'));
        await (await caches.open('html-reader-old-shell')).put('/old-shell', new Response('old shell'));
      });
      await page.goto(BASE);
      await page.waitForFunction(() => S.files.length === 2);
      assert.equal(await page.evaluate(() => S.set.font), 150);
      assert.equal(await page.evaluate(() => S.set.theme), 'dark');
      assert.equal(await page.evaluate(() => S.files.find(f=>f.id==='existing-file').fav), true);
      assert.deepEqual(await page.evaluate(() => S.files.find(f=>f.id==='existing-file').rel), ['Existing Folder']);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('gt_existing_quiz'))), {phase:'prog',ans:{0:2},question:1});
      await page.locator('[data-tab="custom"]').click();
      assert.equal(await page.locator('#reviewSavedModule').count(), 1);
      assert.equal(await page.locator('#openCustomModule').count(), 0, 'saved-module lock remains');
      await page.locator('#reviewSavedModule').click();
      await page.frameLocator('#rframe iframe').locator('#legacy').waitFor();
      assert.equal(await page.locator('#reader').getAttribute('data-mode'), 'focus');
      assert.equal(await page.evaluate(() => S.net), false);
      await page.locator('#flMenu').click(); await visibleMenu(page); await adjacent(page, '#flMenu');
      await escape(page); await page.locator('#flClose').click();
      if (label === 'chromium') {
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
        const keys = await page.evaluate(() => caches.keys());
        assert(keys.includes('another-app-cache'), 'unrelated caches are not deleted');
        assert(!keys.includes('html-reader-old-shell'), 'only stale reader shell caches are refreshed');
      }
      assert.equal(await savedCount(page), 2);
    });
  } finally { await context.close(); if (browser) await browser.close(); fs.rmSync(temp, {recursive: true, force: true}); }
}

(async () => {
  try {
    for (const name of ENGINES) {
      const engine = {chromium, webkit}[name]; assert(engine, 'Unknown engine ' + name);
      await suite(engine, name, {width: 1440, height: 1000}, false);
      await suite(engine, name, {width: 390, height: 844}, true);
      await motionSuite(engine, name);
      if (name === 'chromium') await offlineSuite(engine, name);
      else {
        const reason = 'This Linux Playwright WebKit build resolves Cache.put/addAll but does not retain responses, even in an isolated Cache API probe; offline validation is run in Chromium. Verify installed-PWA offline mode on a physical Apple device.';
        results.push({name: 'webkit: offline PWA automation', status: 'SKIP', reason});
        console.log('SKIP webkit: offline PWA automation — Linux runner Cache API limitation');
      }
      await upgradeSuite(engine, name);
    }
    assert.deepEqual(errors, [], 'No uncaught app JavaScript errors');
    console.log('\n' + results.filter(r=>r.status==='PASS').length + ' checks passed; ' + results.filter(r=>r.status==='SKIP').length + ' explicitly skipped. No uncaught app JavaScript errors.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally {
    if (QA) fs.writeFileSync(path.join(QA, 'results.json'), JSON.stringify({date: new Date().toISOString(), results, errors}, null, 2));
  }
})();
