import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500);
await p.evaluate(() => { document.querySelector('.zl').click(); document.querySelector('button.cut[data-w="A5"]').click(); window.__app.emb.state.paused = true; window.__app.emb.state.tc = 31; });
await p.waitForTimeout(7000);
await p.screenshot({ path: '/tmp/mob5.png' });
await b.close();
