import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const logs=[]; const p = await b.newPage({ viewport: { width: 390, height: 780 } });
p.on('console', m => { if (!/TUNNEL|fonts/.test(m.text())) logs.push(m.type()+': '+m.text()); }); p.on('pageerror', e => logs.push('PAGEERROR: '+e.stack));
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500);
for (const [w, key, tc] of [['C4','c4',40]]) {
  await p.evaluate(({w,key,tc}) => { document.querySelector(`.zl[aria-label^="Zona ${w[0]}"]`).click(); document.querySelector(`button.cut[data-w="${w}"]`).click(); const s = window.__app[key].state; s.paused = true; s.tc = tc; }, {w,key,tc});
  await p.waitForTimeout(9000); await p.screenshot({ path: `/tmp/zb2_${w}.png` });
  await p.evaluate(({key}) => { const s = window.__app[key].state; s.paused = false; s.tc = 64.4; }, {key}); await p.waitForTimeout(6000);
  console.log(w, 'loop', await p.evaluate(({key}) => { const s = window.__app[key].state; return { tc: +s.tc.toFixed(2), hold: +s.hold.toFixed(2) }; }, {key}));
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  console.log('esc', await p.evaluate(({key}) => ({ active: window.__app[key].state.active, rig: window.__app.engine.scene.getObjectByName('c-rig').visible }), {key}));
}
console.log(logs.slice(0,10).join('\n') || 'sem erros');
await b.close();
