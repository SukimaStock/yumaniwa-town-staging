// Maintainer-only: edit notices.json, then run this file. No client-side dependency.
import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('./notices.json',import.meta.url),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(data.items.length>3)throw new Error('Keep notices to at most three verified entries');
const entries=data.items.map(n=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||!/^[-a-z0-9]+$/.test(n.workId))throw new Error('Invalid notice date or work id');
 return `<li><time datetime="${n.date}">${n.date.replaceAll('-','.')}</time><a href="../../?work=${n.workId}">${escape(n.title)}</a></li>`;
}).join('\n');
const file=new URL('./index.html',import.meta.url),html=readFileSync(file,'utf8');
if(!/<ul class="notices">[\s\S]*?<\/ul>/.test(html))throw new Error('Missing notices list');
writeFileSync(file,html.replace(/<ul class="notices">[\s\S]*?<\/ul>/,`<ul class="notices">\n${entries}\n</ul>`));
