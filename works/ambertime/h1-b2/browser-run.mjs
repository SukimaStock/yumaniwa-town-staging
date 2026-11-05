// Real index.html / formal key tests, each condition has a fresh local origin/profile.
// No fake getItem/setItem, reader bypass or product model replacement is used.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const directory=dirname(fileURLToPath(import.meta.url)),root=resolve(directory,'../../..');
const KEY='sukimastock.ambertime.main.v1',sha=x=>createHash('sha256').update(x).digest('hex');
const sourceNames=['shop-app.mjs','index.html','placement-save.mjs','save-codec.mjs','market-ui.mjs','partner-orders.mjs','economy-parameters.mjs'];
const fingerprint=()=>sha(sourceNames.map(f=>readFileSync(resolve(directory,'..',f),'utf8')).join('\n'));
const selfFingerprint=()=>sha(readFileSync(fileURLToPath(import.meta.url),'utf8'));
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/package.json')),{chromium,webkit}=require('playwright');
async function serverFor(saves){
 const server=createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/__seed/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>isolated storage setup</title>');return;}let file;if(name.startsWith('/__input/')){assert(/^\/__input\/(local|wide|mixed)-(360|720|1080|1200)\.json$/.test(name));file=resolve(saves,name.split('/').pop());}else{assert(!name.includes('..'));file=resolve(root,'.'+name);if(name.endsWith('/'))file=resolve(file,'index.html');assert(file.startsWith(root+'/'));}const bytes=readFileSync(file);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'})[extname(file)]??'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,base:`http://127.0.0.1:${server.address().port}`};
}
function verifyInput(saves,id,month){const raw=readFileSync(resolve(saves,`${id}-${month}.json`),'utf8'),report=readFileSync(resolve(directory,'../chronicle-lab/H24.md'),'utf8'),label={local:'地元密着',wide:'広域展開',mixed:'混合'}[id],row=[...report.matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)].find(r=>r[1]===label&&+r[2]*12===month);assert(row);assert.equal(sha(raw),row[4]);return raw;}
async function status(page){return page.evaluate(async()=>{const d=window.amberPlacement?.diagnostics(),game=window.amberPlacement?.snapshot();const raw=game===null||game===undefined?null:JSON.stringify(game),stored=localStorage.getItem('sukimastock.ambertime.main.v1');const hash=async x=>x===null?null:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)))].map(v=>v.toString(16).padStart(2,'0')).join('');return {diagnostics:d??null,gameHash:await hash(raw),month:game?.core?.month??null,storedHash:await hash(stored),storedVersion:stored===null?null:JSON.parse(stored).version,storedLength:stored?.length??0,saveStatus:document.getElementById('save-status')?.textContent??null,notice:document.getElementById('storage-notice')?.textContent??null,recovery:!document.getElementById('recovery')?.hidden};});}
async function ready(page){await page.waitForFunction(()=>!!window.amberPlacement&&window.amberPlacement.snapshot()!==null,{},{timeout:600000});return status(page);}
async function storageHash(page){return (await status(page)).storedHash;}
async function loadFile(page,path){
 await page.locator('#open-aux-menu').click({timeout:30000});
 const button=page.locator('[data-action="connected-import"]:visible');await button.waitFor({state:'visible',timeout:30000});
 const [chooser]=await Promise.all([page.waitForEvent('filechooser',{timeout:30000}),button.click({timeout:30000})]);await chooser.setFiles(path);
}

async function condition(saves,output,id,month){
 mkdirSync(output,{recursive:true});const raw=verifyInput(saves,id,month),original=JSON.stringify({version:2,game:JSON.parse(raw),userPaused:true,elapsed:0}),sourceHash=sha(raw),start=fingerprint(),runnerFingerprint=selfFingerprint(),out=resolve(output,id+'-'+month+'.json');
 if(existsSync(out)){const old=JSON.parse(readFileSync(out,'utf8'));if(old.status==='complete'&&old.sourceHash===sourceHash&&old.codeFingerprint===start&&old.runnerFingerprint===runnerFingerprint){console.log(JSON.stringify({id,month,reused:true}));return old;}}
 const {server,base}=await serverFor(saves),profile=resolve(output,'profile-'+id+'-'+month),launch={headless:true,executablePath:process.env.AMBER_BROWSER_EXECUTABLE??'/tmp/h1-b1-browser/runtime/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'],acceptDownloads:true,viewport:{width:390,height:740}};let context,page;const errors=[],dialogs=[],checks={};let result,firstCompact=null;const nativeReceipts=[];
 const originalFile=resolve(output,id+'-'+month+'-old.json');writeFileSync(originalFile,original);const mark=stage=>{console.error(JSON.stringify({id,month,stage}));writeFileSync(resolve(output,id+'-'+month+'-progress.json'),JSON.stringify({stage,checks},null,2));};
 const launchPage=async()=>{context=await chromium.launchPersistentContext(profile,launch);page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);await cdp.send('DOMStorage.enable');const observe=data=>{if(data.key!==KEY)return;const value=data.newValue;try{const session=JSON.parse(value);if(session.version===3&&session.game?.core?.month===month){if(firstCompact===null)firstCompact=value;nativeReceipts.push({hash:sha(value),version:3,month:session.game.core.month});}}catch{}};cdp.on('DOMStorage.domStorageItemUpdated',observe);cdp.on('DOMStorage.domStorageItemAdded',observe);page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message(),accepted:true});await d.accept();});};
 try{
  await launchPage();await page.goto(base+'/__seed/');
  const seeded=await page.evaluate(async({url,key})=>{const raw=await(await fetch(url)).text(),text=JSON.stringify({version:2,game:JSON.parse(raw),userPaused:true,elapsed:0});try{localStorage.setItem(key,text);return {success:localStorage.getItem(key)===text};}catch(e){return {success:false,error:e.name};}},{url:'/__input/'+id+'-'+month+'.json',key:KEY});
  checks.oldNativeSeed=seeded;assert(seeded.success||seeded.error==='QuotaExceededError');
  await page.goto(base+'/works/ambertime/',{waitUntil:'commit'});let current=await ready(page);checks.boot=current;mark('boot');
  if(seeded.success){
   assert.equal(current.gameHash,sourceHash,'old boot game differs');assert.equal(current.storedHash,sha(original));assert.equal(current.storedVersion,2);assert.equal(current.diagnostics.canSave,false);assert.equal(current.diagnostics.migrationPending,true);assert.equal(current.diagnostics.clockPending,false);
   const exportSelector=await page.evaluate(()=>['migration-export','backup-export','recovery-export','export-original'].map(id=>'#'+id).find(s=>document.querySelector(s))??null);assert(exportSelector,'migration original export missing');
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator(exportSelector).click()]);const exportedPath=await download.path(),exported=readFileSync(exportedPath,'utf8');assert.equal(exported,original);assert.equal(await storageHash(page),sha(original));assert.equal((await status(page)).diagnostics.canSave,false);checks.download={exact:true,sha256:sha(exported),downloadAloneDoesNotAuthorize:true};mark('download');
   const verifySelector=await page.evaluate(()=>['migration-file','backup-file'].map(id=>'#'+id).find(s=>document.querySelector(s))??null);assert(verifySelector,'migration file verification input missing');
   await page.locator(verifySelector).setInputFiles(exportedPath);await page.waitForFunction(()=>window.amberPlacement.diagnostics().canSave===true&&window.amberPlacement.diagnostics().saveVersion===3,{},{timeout:600000});checks.migrationReadback={exact:true,explicitConfirmation:dialogs.some(d=>d.type==='confirm')};mark('migrated');
  }else{
   // Old broad90/100 cannot physically fit native localStorage. Read its exact
   // v2 file through the real app's backup restoration UI instead of faking IO.
   assert.equal(id,'wide');assert([1080,1200].includes(month));await loadFile(page,originalFile);await page.waitForFunction(({month})=>window.amberPlacement?.snapshot()?.core?.month===month&&window.amberPlacement.diagnostics().canSave===true&&window.amberPlacement.diagnostics().saveVersion===3,{month},{timeout:600000});checks.oldFileRestore={path:'visible auxiliary-menu import button and real file chooser',explicitConfirmation:dialogs.some(d=>d.type==='confirm')};mark('file-restored');
  }
  current=await status(page);assert.equal(current.storedVersion,3);assert(current.diagnostics.canSave);assert(!current.diagnostics.migrationPending);
  // Native CDP storage events observe, but never replace, actual setItem calls.
  await page.waitForTimeout(100);assert(firstCompact,'native first compact write missing');const {expandFormalGame}=await import('../save-codec.mjs');assert.equal(sha(expandFormalGame(JSON.parse(firstCompact).game)),sourceHash,'first compact migration candidate differs from formal source');checks.firstCompactWrite={wireHash:sha(firstCompact),expandedHash:sourceHash,nativeReceipt:true};
  // Existing syncModal may notice staff opportunities immediately after save.
  // These genuine pre-existing public operations are checked separately from codec.
  async function verifyStartupNotices(){return page.evaluate(async url=>{
   const D=await import('./partner-orders.mjs?v=market-rules-r1&touch=1'),old=await(await fetch(url)).json(),now=window.amberPlacement.snapshot();
   if(JSON.stringify(now.operations.slice(0,old.operations.length))!==JSON.stringify(old.operations))throw Error('Startup changed original operation prefix');
   const extra=now.operations.slice(old.operations.length);for(const op of extra)if(!['staff-opportunity-notice','generation-notice','stockist-notice'].includes(op.key)||op.value?.progress!==null)throw Error('Unexpected startup operation '+op.key);
   // Validate CURRENT state with the actual unchanged official reader. Rewinding
   // its cache to the old prefix would add an irrelevant long replay per notice.
   const raw=JSON.stringify(now),restored=D.restoreDistillery(raw);if(JSON.stringify(restored)!==raw)throw Error('Current startup state fails official reader');
   return {extraOperations:extra,originalOperationPrefixExact:true,currentOfficialReaderExact:true,exact:true};
  },'/__input/'+id+'-'+month+'.json');}

  checks.startupNotices=await verifyStartupNotices();mark('first-native-write-and-notices');
  // Dismiss only ordinary existing announcements, through visible UI controls.
  for(let n=0;n<12;n++){const kind=await page.locator('#action-dialog').evaluate(d=>d.open?d.dataset.kind:null);if(!kind)break;const selector=kind==='staff-opportunity'?'[data-action="staff-opportunity-later"]':kind==='world-map'?'[data-action="map-continue"]':kind==='generation-notice'?'[data-action="generation-continue"]':kind==='shop-offer'?'[data-action="shop-later"]':null;if(!selector)throw Error('Unexpected initial dialog '+kind);await page.locator(selector).click({timeout:30000});}
  checks.settledNotices=await verifyStartupNotices();current=await status(page);const settledHash=current.gameHash;checks.saved=current;mark('settled');
  // Exact new wire readback through the same placement session reader and the
  // unchanged official restore, then actual main reload (new module instance).
  const expanded=await page.evaluate(async()=>{const S=await import('./placement-save.mjs?v=h1-b2-browser-reader'),D=await import('./partner-orders.mjs?v=market-rules-r1&touch=1'),{PARALLEL_PARAMETERS:T}=await import('./economy-parameters.mjs?v=0.7'),raw=localStorage.getItem('sukimastock.ambertime.main.v1'),s=S.readSession(raw,{enabled:true,restore:D.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs}),text=JSON.stringify(s.game),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');return {hash,paused:s.userPaused,elapsed:s.elapsed};});assert.equal(expanded.hash,settledHash);checks.expandedOfficialRead=expanded;mark('official-read');
  await page.reload({waitUntil:'commit'});current=await ready(page);assert.equal(current.gameHash,settledHash);assert.equal(current.storedVersion,3);assert(current.diagnostics.canSave);checks.reload=current;mark('reloaded');
  // Public clock controls execute the actual scheduled monthly save path.
  const nextHash=await page.evaluate(async()=>{const D=await import('./partner-orders.mjs?v=market-rules-r1&touch=1'),next=D.tickDistillery(window.amberPlacement.snapshot()),text=JSON.stringify(next);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');});
  await page.locator('#toggle-time').click({timeout:30000});await page.waitForFunction(m=>window.amberPlacement.snapshot()?.core.month===m+1,month,{timeout:600000});await page.locator('#toggle-time').click({timeout:30000});current=await status(page);assert.equal(current.month,month+1);assert.equal(current.gameHash,nextHash);assert(current.diagnostics.canSave);assert.equal(current.storedVersion,3);checks.nextMonth=current;mark('next-month');
  if(id==='wide'&&month===1200){await context.close();context=null;await launchPage();await page.goto(base+'/works/ambertime/',{waitUntil:'commit'});const reopened=await ready(page);assert.equal(reopened.gameHash,nextHash);assert.equal(reopened.month,month+1);checks.cleanProcessReopen=reopened;}
  assert.equal(fingerprint(),start,'Product files changed during condition');assert.equal(selfFingerprint(),runnerFingerprint);result={schema:'ambertime-h1-b2-browser-condition/1',status:'complete',id,month,sourceHash,codeFingerprint:start,runnerFingerprint,browser:await page.evaluate(()=>navigator.userAgent),checks,nativeReceipts,dialogs,pageErrors:errors,limits:['Only isolated profiles and HTTP origins use the actual formal key.','Wide90/100 old native v2 cannot fit, so exact v2 backup files use the real import UI.','Download bytes and readback are observed; off-device location is explicit user confirmation, not a verified cloud write.','No iPhone Safari, OS kill, screen lock or eviction verification.','First native v3 migration write is byte-exact to source; later pre-existing notices preserve original operations and pass current-state official validation, not an additional independent cold notice replay.']};assert.equal(errors.length,0,JSON.stringify(errors));writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({id,month,status:'complete'}));return result;
 }catch(error){result={schema:'ambertime-h1-b2-browser-condition/1',status:'failed',id,month,sourceHash,codeFingerprint:start,runnerFingerprint,checks,dialogs,pageErrors:errors,error:String(error.stack??error)};writeFileSync(out,JSON.stringify(result,null,2)+'\n');throw error;
 }finally{await context?.close();await new Promise(r=>server.close(r));}
}
async function run(saves,output){
 mkdirSync(output,{recursive:true});const pending=[1200,1080,720,360].flatMap(month=>['wide','mixed','local'].map(id=>({id,month}))),results=[],active=new Set();let stopped=false;
 const workers=await Promise.allSettled([0,1,2].map(async()=>{
  while(!stopped&&pending.length){const {id,month}=pending.shift(),child=spawn(process.execPath,[fileURLToPath(import.meta.url),'condition',saves,output,id,String(month)],{stdio:['ignore','pipe','pipe']});active.add(child);let stderr='';child.stdout.on('data',x=>process.stderr.write(x));child.stderr.on('data',x=>{stderr+=x;process.stderr.write(x);});const code=await new Promise(r=>child.once('exit',r));active.delete(child);
   if(code!==0){stopped=true;for(const other of active)other.kill('SIGTERM');throw Error(`${id}-${month} failed: ${stderr}`);}
   results.push(JSON.parse(readFileSync(resolve(output,id+'-'+month+'.json'),'utf8')));
  }
 }));
 const failed=workers.filter(r=>r.status==='rejected');if(failed.length)throw Error(failed.map(r=>String(r.reason)).join('\n'));
 assert.equal(results.length,12);assert(results.every(r=>r.status==='complete'));assert.equal(new Set(results.map(r=>r.codeFingerprint)).size,1);const result={schema:'ambertime-h1-b2-browser/1',status:'complete',codeFingerprint:fingerprint(),runnerFingerprint:selfFingerprint(),results};writeFileSync(resolve(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,conditions:results.length}));
}

async function probeWebkit(output){let browser;let result;try{browser=await webkit.launch({headless:true});const page=await browser.newPage();await page.goto('data:text/html,<title>probe</title>');result={status:'available',version:browser.version(),title:await page.title()};}catch(error){result={status:'unavailable',executable:webkit.executablePath(),error:String(error)};}finally{await browser?.close();}result.node=process.version;result.runnerFingerprint=selfFingerprint();result.iPhoneSafari='unverified: no physical device access';writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,output}));}
const [mode,saves,output,id,month]=process.argv.slice(2);if(mode==='webkit')await probeWebkit(saves);else if(mode==='condition')await condition(saves,output,id,Number(month));else if(mode==='run')await run(saves,output);else throw Error('browser-run.mjs run <saves> <new-output> | condition <saves> <output> <id> <month>');
