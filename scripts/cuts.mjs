import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [,, prefix='/tmp/seq', tcs='2,8,10,11.5,12.5', cam='', w='1000', h='620'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs=[]; p.on('console', m => logs.push(m.type()+': '+m.text())); p.on('pageerror', e => logs.push('PAGEERROR: '+e.stack));
await p.goto('http://localhost:4173/');
await p.waitForTimeout(2500);
await p.evaluate((cam) => {
  document.querySelector('.zl').click(); document.querySelector('button.cut').click();
  const a = window.__app; a.tbm.state.paused = true;
  document.getElementById('panel').style.display='none';
  const c = cam ? JSON.parse(cam) : { tx: -70, ty: -12, tz: -33, yaw: -1.3, pitch: 0.3, dist: 30 };
  Object.assign(a.controls.cur, c); Object.assign(a.controls.goal, c);
}, cam);
let i = 0;
for (const tc of tcs.split(',')) {
  await p.evaluate((tc) => { window.__app.tbm.state.tc = +tc; }, tc);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${prefix}${i++}.png` });
}
console.log(logs.filter(l=>!/TUNNEL/.test(l)).slice(0,10).join('\n'));
await b.close();
