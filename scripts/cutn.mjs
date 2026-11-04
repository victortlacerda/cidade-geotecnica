import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [,, prefix='/tmp/nat', tcs='3', cam='', w='1400', h='800', work='A2', hidePanel=''] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs=[]; p.on('console', m => { if (!/TUNNEL/.test(m.text())) logs.push(m.type()+': '+m.text()); }); p.on('pageerror', e => logs.push('PAGEERROR: '+e.stack));
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500);
await p.evaluate(({cam, work, hidePanel}) => {
  document.querySelector(`.zl[aria-label^="Zona ${work[0]}"]`).click();
  document.querySelector(`button.cut[data-w="${work}"]`).click();
  const a = window.__app; const W = a[({A1:'tbm',A2:'natm',A5:'emb',B2:'b2',B4:'b4',B1:'b1',B5:'b5',B3:'b3',B6:'b6',C4:'c4',C6:'c6',C7:'c7',C2:'c2',C3:'c3',C14:'c14',C1:'c1',C13:'c13',D1:'d1',D5:'d5',D6:'d6',D2:'d2',D3:'d3',D4:'d4',D7:'d7',D8:'d8',D10:'d10',D11:'d11',D14:'d14',E1:'e1',E2:'e2',E5:'e5',E6:'e6',E4:'e4',F5:'f5',F2:'f2',F3:'f3',F4:'f4',F1:'f1',H1:'h1',H4:'h4',G1:'g1',G3:'g3',G11:'g11'})[work]]; W.state.paused = true;
  if (hidePanel) document.getElementById('panel').style.display='none';
  if (cam) { const c = JSON.parse(cam); Object.assign(a.controls.cur, c); Object.assign(a.controls.goal, c); }
  else { const c = { tx: -90, ty: 3.6, tz: -37, yaw: -1.35, pitch: 0.22, dist: 34 }; Object.assign(a.controls.cur, c); Object.assign(a.controls.goal, c); }
}, { cam, work, hidePanel });
let i = 0;
for (const tc of tcs.split(',')) {
  await p.evaluate(({tc, work}) => { window.__app[({A1:'tbm',A2:'natm',A5:'emb',B2:'b2',B4:'b4',B1:'b1',B5:'b5',B3:'b3',B6:'b6',C4:'c4',C6:'c6',C7:'c7',C2:'c2',C3:'c3',C14:'c14',C1:'c1',C13:'c13',D1:'d1',D5:'d5',D6:'d6',D2:'d2',D3:'d3',D4:'d4',D7:'d7',D8:'d8',D10:'d10',D11:'d11',D14:'d14',E1:'e1',E2:'e2',E5:'e5',E6:'e6',E4:'e4',F5:'f5',F2:'f2',F3:'f3',F4:'f4',F1:'f1',H1:'h1',H4:'h4',G1:'g1',G3:'g3',G11:'g11'})[work]].state.tc = +tc; }, { tc, work });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${prefix}${i++}.png` });
}
console.log(logs.slice(0,12).join('\n') || 'sem erros');
await b.close();
