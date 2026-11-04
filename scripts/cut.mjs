import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [,, out='/tmp/cut.png', w='1400', h='800', tc='3', cam='', night=''] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs=[]; p.on('console', m => logs.push(m.type()+': '+m.text())); p.on('pageerror', e => logs.push('PAGEERROR: '+e.stack));
await p.goto(process.env.URL || 'http://localhost:4173/');
await p.waitForTimeout(2500);
await p.evaluate(({tc,cam,night}) => {
  document.querySelector('.zl').click();
  document.querySelector('button.cut').click();
  const a = window.__app; a.tbm.state.paused = true; a.tbm.state.tc = +tc;
  const c = cam ? JSON.parse(cam) : { tx: -70, ty: -11, tz: -29, yaw: -1.2, pitch: 0.36, dist: 52 };
  Object.assign(a.controls.cur, c); Object.assign(a.controls.goal, c);
  if (night) a.dn.setNight(true);
}, {tc, cam, night});
await p.waitForTimeout(+(process.env.WAIT||6000));
// avanço de um quadro com tempo para atualizar estado
await p.screenshot({ path: out });
console.log(logs.slice(0,15).join('\n'));
await b.close();
