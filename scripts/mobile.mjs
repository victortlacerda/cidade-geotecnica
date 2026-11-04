import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, colorScheme: 'dark' });
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500);
await p.evaluate(() => { document.querySelector('.zl').click(); document.querySelector('button.cut').click(); const a=__app; a.tbm.state.paused=true; a.tbm.state.tc=3.5; const c={ tx: -70, ty: -20, tz: -34, yaw: -1.2, pitch: 0.36, dist: 66 }; Object.assign(a.controls.cur,c); Object.assign(a.controls.goal,c); });
await p.waitForTimeout(6000);
await p.screenshot({ path: '/tmp/mob.png' });
await b.close();
