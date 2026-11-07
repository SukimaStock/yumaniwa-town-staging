import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {size,hash} from './measure.mjs';
import {assertFormalSize,expandFormalGame} from '../../save-codec.mjs';
const dir=path.resolve(process.argv[2]??'/tmp/ambertime-s3-r0'),r=JSON.parse(fs.readFileSync(path.join(dir,'results.json')));
assert(r.totalMs,'run must finish before summarizing');
const firstFile=`first-exceeded-${r.firstExceeded.month}.research.json`,firstRaw=fs.readFileSync(path.join(dir,firstFile),'utf8');r.firstExceeded.fixture=firstFile;r.firstExceeded.fixtureBytes=Buffer.byteLength(firstRaw);r.firstExceeded.fixtureSha256=hash(firstRaw);const first=JSON.parse(firstRaw);assert.equal(first.game.core.month,r.firstExceeded.month);assert.deepEqual(size(first.game),{utf16:r.firstExceeded.utf16,utf8:r.firstExceeded.utf8,count:r.firstExceeded.count});assert.throws(()=>assertFormalSize(JSON.stringify(first.game)),/保存が大きすぎます/);
for(const [i,row] of r.checkpoints.entries()){
 row.formalSizeEligible??=row.formalEligible;delete row.formalEligible;
 const rawFixture=fs.readFileSync(path.join(dir,row.fixture),'utf8');assert.equal(hash(rawFixture),row.sessionHash);assert.equal(Buffer.byteLength(rawFixture),row.fixtureBytes);
 const s=JSON.parse(rawFixture),g=s.game,t=g.labConnection.town;assert.equal(hash(g),row.gameHash);assert.deepEqual(size(g),row.groups.game);assert.equal(JSON.stringify(t.arrivals),JSON.stringify(t.events.filter(e=>e.type==='arrival')));
 row.delta=i?row.groups.game.utf16-r.checkpoints[i-1].groups.game.utf16:null;
 row.townDelta=i?row.groups.town.utf16-r.checkpoints[i-1].groups.town.utf16:null;
 row.types=Object.fromEntries([...new Set(t.events.map(x=>x.type))].map(type=>{const a=t.events.filter(x=>x.type===type);return[type,size(a)];}));
 row.eventIDsUnique=new Set(t.events.map(x=>x.id)).size===t.events.length;
 row.attemptKeysUnique=new Set(t.attempts.map(x=>`${x.type}/${x.sourceId}/${x.month}`)).size===t.attempts.length;
 row.sidecarFields=Object.fromEntries(Object.entries(s).filter(([k])=>k!=='game').map(([k,v])=>[k,size(v)]));
 if(!row.formalSizeEligible){const before=JSON.stringify(g);assert.throws(()=>assertFormalSize(before),/保存が大きすぎます/);const compact=JSON.parse(before);compact.labConnection.town.arrivals=null;assert.throws(()=>expandFormalGame(compact),/保存が大きすぎます/);assert.equal(JSON.stringify(g),before);row.expandedGuardRejection=true;row.decoderGuardRejection=true;}
}
r.fixturePolicy='Synthetic seed42 research snapshots, not valid formal save files. Retained outside Git; full JSON and SHA recorded. No player save touched.';
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(r,null,2)+'\n');
const cols=['month','years','utf16','utf8','compactUtf16','compactUtf8','sessionUtf16','sessionUtf8','margin','delta','operations','releases','deliveries','events','dialogueMs'];
fs.writeFileSync(new URL('./capacity.csv',import.meta.url),cols.join(',')+'\n'+r.checkpoints.map(x=>[x.month,x.years,x.groups.game.utf16,x.groups.game.utf8,x.groups.compactGame.utf16,x.groups.compactGame.utf8,x.groups.theoreticalSession.utf16,x.groups.theoreticalSession.utf8,x.margin,x.delta,x.operations,x.releases,x.deliveries,x.events,x.dialogueMs].join(',')).join('\n')+'\n');
const max=Math.ceil(r.monthly.at(-1).utf16/1e6)*1e6,W=860,H=420,px=x=>70+x/1200*740,py=y=>350-y/max*300;
const line=r.monthly.map(x=>`${px(x.month).toFixed(2)},${py(x.utf16).toFixed(2)}`).join(' ');
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" font-size="13" fill="#172c3c"><text x="70" y="25">S3-R wide seed 42: full formal JSON (UTF-16 code units)</text>`;
for(let y=0;y<=max;y+=1e6)svg+=`<line x1="70" y1="${py(y)}" x2="810" y2="${py(y)}" stroke="#e3e8ed"/><text x="15" y="${py(y)+4}">${y/1e6}M</text>`;
for(let x=0;x<=1200;x+=120)svg+=`<text x="${px(x)-8}" y="375">${x/12}</text>`;
svg+=`<text x="750" y="400">years</text><polyline fill="none" stroke="#176b91" stroke-width="2" points="${line}"/><line x1="70" y1="${py(r.limit)}" x2="810" y2="${py(r.limit)}" stroke="#b33131" stroke-dasharray="6 4"/><text x="90" y="${py(r.limit)-8}">strict limit: ${r.limit.toLocaleString('en-US')}</text><circle cx="${px(r.firstExceeded.month)}" cy="${py(r.firstExceeded.utf16)}" r="5" fill="#b33131"/><text x="${px(r.firstExceeded.month)+10}" y="${py(r.firstExceeded.utf16)+20}">first sampled over-limit month: ${r.firstExceeded.month}</text></g></svg>`;
fs.writeFileSync(new URL('./capacity.svg',import.meta.url),svg+'\n');
console.log(JSON.stringify({firstExceeded:r.firstExceeded,checkpoints:r.checkpoints.map(x=>({month:x.month,game:x.groups.game,compact:x.groups.compactGame,session:x.groups.theoreticalSession,margin:x.margin,town:x.groups.town,ops:x.operations,releases:x.releases,deliveries:x.deliveries,events:x.events,delta:x.delta,dialogueMs:x.dialogueMs})),totalMs:r.totalMs},null,2));
