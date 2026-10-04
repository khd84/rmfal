import fs from 'node:fs/promises';
import path from 'node:path';
const all = await fs.readdir('public',{recursive:true});
const files = all.filter(f=>f.endsWith('.html'));
const pages=[];
for(const file of files) {
  const en=file.startsWith('en'+path.sep)||file.startsWith('en/');
  const prefix=en?'/en':'';
  const route='/'+file.replaceAll(path.sep,'/').replace(/index\.html$/,'');
  let html=await fs.readFile(path.join('public',file),'utf8');
  html=html.replace(/href="\/migration.css(?:\?v=\d+)?"/g,'href="/migration.css?v=3"');
  html=html.replaceAll('href=""',`href="${prefix}/"`);
  html=html.replace(/<link rel="preconnect"[^>]*>/g,'');
  let styleCount=0;
  html=html.replace(/href="\/assets\/front\/css\/dynamic-css.css"/g, match=>++styleCount===2?'href="/assets/front/css/dynamic-css-generated.css"':match);
  html=html.replace(/<div id="bgndVideo"[^>]*><\/div>/g,'');
  html=html.replace(/<span class="icon"<i/g,'<span class="icon"><i');
  html=html.replace(/alt="Omnivus"/g,'alt="الميموني والعلوني | Almaymoni & Alalwani"');
  const targets={'من نحن':'/about','خدماتنا':'/service','اتصل بنا':'/contact','About Us':'/about','About':'/about','Services':'/service','Our services':'/service','Contact Us':'/contact','Contact':'/contact'};
  html=html.replace(/<a href="#">(<i[^>]*><\/i>)([^<]+)<\/a>/g,(full,icon,label)=>targets[label.trim()]?`<a href="${prefix}${targets[label.trim()]}">${icon}${label}</a>`:full);
  html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${en?'Almaymoni & Alalwani Law Firm — legal consultancy, litigation and corporate services in Saudi Arabia.':'شركة الميموني والعلوني للمحاماة والاستشارات القانونية — خدمات قانونية متكاملة للأفراد والشركات في المملكة العربية السعودية.'}">`);
  if(!html.includes('rel="canonical"'))html=html.replace('</head>',`<link rel="canonical" href="https://rmfal.com${route}"></head>`);
  await fs.writeFile(path.join('public',file),html);
  pages.push(route);
}
// Remove references to decorative template assets already missing on the source host.
for(const file of all.filter(f=>f.endsWith('.css'))) {
  const full=path.join('public',file); let css=await fs.readFile(full,'utf8');
  for(const m of [...css.matchAll(/url\(['"]?(\/[^)'"\s]+)['"]?\)/g)]) {
    try {await fs.access(path.join('public',decodeURIComponent(m[1].split(/[?#]/)[0])));} catch {
      const fallback=m[1].replace('/img/shape/','/images/');
      try {await fs.access(path.join('public',fallback)); css=css.replaceAll(m[0],`url('${fallback}')`);} catch {css=css.replaceAll(m[0],'none');}
    }
  }
  await fs.writeFile(full,css);
}
await fs.writeFile('public/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(route=>`<url><loc>https://rmfal.com${encodeURI(route)}</loc></url>`).join('')+'</urlset>');
await fs.writeFile('public/robots.txt','User-agent: *\nAllow: /\nSitemap: https://rmfal.com/sitemap.xml\n');
console.log(`Finalized ${files.length} pages.`);

