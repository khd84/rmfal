// Produce a static GitHub Pages review copy; the Express deployment is unchanged.
import fs from 'node:fs/promises';
import path from 'node:path';
const base = process.env.PREVIEW_BASE || '/rmfal/';
if (!/^\/[a-zA-Z0-9_-]+\/$/.test(base)) throw Error('Invalid PREVIEW_BASE');
const output = 'dist/pages';
await fs.mkdir(output,{recursive:true});
await fs.cp('public',output,{recursive:true});
for(const file of await fs.readdir(output,{recursive:true})){
  if(!/\.(html|css|js)$/.test(file))continue;
  const target=path.join(output,file);
  let text=await fs.readFile(target,'utf8');
  if(file.endsWith('.html')){
    text=text.replace(/((?:href|src|action)=")\/(?!\/)/g,`$1${base}`);
    text=text.replace(/(['"])\/assets\//g,`$1${base}assets/`);
    text=text.replace(/url\(\//g,`url(${base}`);
    text=text.replace('id="main_url" value=""',`id="main_url" value="${base.slice(0,-1)}"`);
    text=text.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
  }
  if(file.endsWith('.css'))text=text.replace(/url\((['"]?)\/(?!\/)/g,`url($1${base}`);
  if(file==='migration.js')text=text.replace("if(!form.reportValidity())return;",`if(!form.reportValidity())return;
      status.textContent=english?'This is a review preview. Form submissions will be enabled on the final hosting.':'هذه نسخة للمعاينة فقط. سيتم تفعيل إرسال النماذج بعد النشر على الاستضافة النهائية.';
      return;`);
  await fs.writeFile(target,text);
}
for(const [language,destination] of [['ar',base],['en',base+'en/']]){
  const folder=path.join(output,'changelanguage',language);
  await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=${destination}"></head><body><a href="${destination}">Continue</a></body></html>`);
}
await fs.writeFile(path.join(output,'.nojekyll'),'');
await fs.writeFile(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log(`Static preview ready in ${output}, base ${base}`);
