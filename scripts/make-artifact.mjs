import fs from 'node:fs'; import path from 'node:path';
const dist = 'dist/assets';
const files = fs.readdirSync(dist);
const js = fs.readFileSync(path.join(dist, files.find((f) => f.endsWith('.js'))), 'utf8');
const css = fs.readFileSync(path.join(dist, files.find((f) => f.endsWith('.css'))), 'utf8');
if (js.includes('</script')) throw new Error('script fecha tag');
const body = `<title>Cidade Geotécnica</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@500;600;700&display=swap">
<style>${css}</style>
<script>${js}</script>
`;
fs.writeFileSync('artifact/cidade-geotecnica.html', body);
fs.writeFileSync('artifact/_test.html', `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${body}</body></html>`);
console.log('ok', (body.length / 1024).toFixed(0) + ' KB');
