import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const origin = 'https://rmfal.com';
const english = process.argv.includes('--en');
let cookie = '';
if (english) {
  const response = await fetch(origin + '/changelanguage/en', {redirect:'manual'});
  cookie = response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
}
const queue = [origin + '/'];
const seen = new Set();
const assets = new Map();
const pages = [];
const failures = [];
const decode = s => s.replaceAll('&amp;', '&');
async function download(url) {
  const response = await fetch(url, {headers:cookie ? {cookie} : {},signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}
function assetPath(url) {
  const u = new URL(url);
  if (u.hostname === 'rmfal.com') return u.pathname.replace(/\.php$/, '-generated.css');
  return '/assets/external/' + crypto.createHash('sha256').update(url).digest('hex').slice(0,16) + (path.extname(u.pathname) || '.css');
}
async function asset(url) {
  url = decode(url);
  if (assets.has(url)) return assets.get(url);
  const local = assetPath(url);
  assets.set(url, local);
  try {await fs.access(path.join('public',local)); return local;} catch {}
  try {
    const response = await download(url);
    let data = Buffer.from(await response.arrayBuffer());
    if (/css/.test(response.headers.get('content-type') || '') || local.endsWith('.css')) {
      let css = data.toString();
      const refs = [...css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)];
      for (const match of refs) {
        if (/^(data:|#)/.test(match[1])) continue;
        const absolute = new URL(match[1], url).href;
        css = css.replaceAll(match[1], await asset(absolute));
      }
      data = Buffer.from(css);
    }
    const dest = path.join('public', local);
    await fs.mkdir(path.dirname(dest), {recursive:true});
    await fs.writeFile(dest, data);
  } catch(error) { failures.push(String(error)); }
  return local;
}
while(queue.length) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  try {
    let html = await (await download(url)).text();
    const u = new URL(url);
    const route = decodeURIComponent(u.pathname);
    console.log('Page', route);
    await fs.mkdir('archive/pages', {recursive:true});
    await fs.writeFile('archive/pages/' + (english ? 'en__' : '') + (route === '/' ? 'home' : route.slice(1).replaceAll('/','__')) + '.html', html);
    for (const match of html.matchAll(/href=["'](https:\/\/rmfal\.com[^"'#]*)["']/g)) {
      const target = new URL(decode(match[1]));
      if (!target.pathname.startsWith('/assets/') && !target.pathname.startsWith('/changelanguage') && !target.pathname.includes('/submit') && !target.pathname.includes('/store')) queue.push(target.href.replace(/\/$/, '') || origin + '/');
    }
    const refs = new Set([...html.matchAll(/(?:https?:)?\/\/(?:rmfal\.com\/assets\/|fonts\.googleapis\.com\/)[^"'<>\s)]+/g)].map(m=>decode(m[0])));
    for (const ref of refs) html = html.replaceAll(ref.replaceAll('&','&amp;'), await asset(ref)).replaceAll(ref, assets.get(ref));
    html = html.replaceAll('https://rmfal.com', '').replaceAll('http://rmfal.com','');
    // The existing public HTML is preserved; hosting-specific behavior is replaced locally.
    html = html.replace('<html lang="en">', english ? '<html lang="en" dir="ltr">' : '<html lang="ar" dir="rtl">');
    html = html.replace(/<meta name="csrf-token"[^>]*>/g, '').replace(/<input[^>]*name="_token"[^>]*>/g, '');
    html = html.replace(/<script[^>]*src="https:\/\/www.google.com\/recaptcha[^>]*><\/script>/g, '');
    html = html.replace(/<div[^>]*class="g-recaptcha"[^>]*><\/div>/g, '');
    html = html.replaceAll('href=""','href="/"');
    if(english) html=html.replace(/href="\/(?!assets|changelanguage)([^"#]*)"/g, 'href="/en/$1"');
    html = html.replace('</head>', '<link rel="stylesheet" href="/migration.css"></head>');
    html = html.replace('</body>', '<script src="/migration.js" defer></script></body>');
    const file = (english ? 'en/' : '') + (route === '/' ? 'index.html' : route.slice(1) + '/index.html');
    await fs.mkdir(path.dirname(path.join('public',file)), {recursive:true});
    await fs.writeFile(path.join('public',file), html);
    if (!pages.some(p=>p.route===route)) pages.push({route,file});
  } catch(error) {failures.push(String(error));}
}
await fs.writeFile(english ? 'archive/manifest-en.json' : 'archive/manifest.json', JSON.stringify({capturedAt:new Date().toISOString(),pages,assets:Object.fromEntries(assets),failures},null,2));
console.log(JSON.stringify({pages:pages.length,assets:assets.size,failures},null,2));
