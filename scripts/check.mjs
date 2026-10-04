import fs from 'node:fs/promises';
import path from 'node:path';
const files=(await fs.readdir('public',{recursive:true})).filter(f=>/\.(html|css)$/.test(f));
const errors=[]; let pages=0; let checked=0;
for(const file of files){
  const source=await fs.readFile(path.join('public',file),'utf8');
  if(file.endsWith('.html')){
    pages++;
    if(/(?:src|action)="https?:\/\/rmfal\.com/.test(source))errors.push(`${file}: old host dependency`);
    if(!source.includes('lang="ar"')&&!source.includes('lang="en"'))errors.push(`${file}: missing language`);
  }
  const refs=[...source.matchAll(/(?:src|href)="(\/[^"#]*)"|url\(['"]?(\/[^)'"\s]+)['"]?\)/g)];
  for(const m of refs){
    const ref=decodeURIComponent((m[1]||m[2]).split(/[?#]/)[0]);
    if(ref.startsWith('/changelanguage/'))continue;
    const local=path.join('public',ref);
    try {await fs.access(local);checked++;}catch{errors.push(`${file}: missing ${ref}`);}
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`PASS: ${pages} pages and ${checked} local references; no old-host asset/form dependencies.`);
