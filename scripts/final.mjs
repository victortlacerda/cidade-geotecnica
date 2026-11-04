import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
const logs=[]; p.on('pageerror', e => logs.push(e.stack)); p.on('console', m => m.type()==='error' && !/TUNNEL|fonts/.test(m.text()) && logs.push(m.text()));
await p.goto('http://localhost:4173/_test.html'); await p.waitForTimeout(3500);
await p.screenshot({path: process.env.OUT+'/final.png'});
console.log('labels', await p.evaluate(()=>document.querySelectorAll('.zl').length), 'errors:', logs.join('|')||'nenhum'); await b.close();
