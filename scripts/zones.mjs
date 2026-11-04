import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const S = process.env.OUT; const ids = (process.argv[2] || 'A,H,D,C').split(',');
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
const logs=[]; p.on('pageerror', e => logs.push(e.stack)); p.on('console', m => m.type()==='error' && !/TUNNEL/.test(m.text()) && logs.push(m.text()));
await p.goto('http://localhost:4173/'); await p.waitForTimeout(2500);
const POS = {A:[-81,-32],F:[-27,-32],H:[27,-32],D:[81,-32],B:[-81,32],C:[-27,32],E:[27,32],G:[81,32]};
for (const id of ids) {
  const [cx,cz]=POS[id];
  await p.evaluate(([cx,cz,id]) => { const c=__app.controls; const ty = id==='D'?-2:(id==='A'||id==='H'||id==='F')?4:1;
    c.flyTo({tx:cx,ty,tz:cz+2,yaw:0.42,pitch:0.82,dist:105}); Object.assign(c.cur,c.goal); document.querySelectorAll('.zl').forEach(e=>e.style.display='none'); }, [cx,cz,id]);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${S}/z_${id}.png` });
}
console.log(logs.join('\n'));
await b.close();
