const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [svg, out, size] of [['dist/icon.svg','dist/icon-192.png',192],['dist/icon.svg','dist/icon-512.png',512],['maskable.svg','dist/icon-maskable-512.png',512]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${fs.readFileSync(svg).toString('base64')}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await p.screenshot({ path: out, omitBackground: true });
  }
  await b.close();
})();
