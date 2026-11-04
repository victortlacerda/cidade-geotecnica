import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [,, out='/tmp/shot.png', w='1280', h='720', js=''] = process.argv;
const url = process.env.URL || 'http://localhost:4173/';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs=[];
p.on('console', m => logs.push(m.type()+': '+m.text()));
p.on('pageerror', e => logs.push('PAGEERROR: '+e.stack));
await p.goto(url);
await p.waitForTimeout(2500);
if (js) { await p.evaluate(js); await p.waitForTimeout(+(process.env.WAIT||2500)); }
await p.screenshot({ path: out });
const fps = await p.evaluate(() => window.__app?.engine?.stats?.fps);
console.log('fps', fps); console.log(logs.slice(0,15).join('\n'));
await b.close();
