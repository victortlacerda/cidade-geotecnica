import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 700, height: 420 } });
const logs=[]; p.on('pageerror', e => logs.push('PAGEERROR: '+e.stack)); p.on('console', m => { if (m.type()==='error' && !/TUNNEL/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2000);
await p.evaluate(() => { document.querySelector('.zl').click(); document.querySelector('button.cut').click(); const s=__app.tbm.state; s.n=16; s.tc=12.9; s.speed=25; });
for (let i=0;i<8;i++){ await p.waitForTimeout(2500); console.log(await p.evaluate(()=>{const s=__app.tbm.state;return JSON.stringify({n:s.n,tc:+s.tc.toFixed(2),hold:+s.hold.toFixed(2),step:s.step,sHead:+s.sHead.toFixed(1)})})); }
// sair com Esc
await p.keyboard.press('Escape'); await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>JSON.stringify({active:__app.section.active, tbm:__app.tbm.state.active, panel:document.getElementById('panel').innerText.slice(0,40)})));
console.log(logs.join('\n')||'sem erros');
await b.close();
