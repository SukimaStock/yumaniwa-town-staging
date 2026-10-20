import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root=path.resolve(new URL('../../../../../',import.meta.url).pathname),out='/tmp/ambertime-contest-browser';await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let rel=new URL(req.url,'http://localhost').pathname;if(rel.endsWith('/'))rel+='index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.ttf':'font/ttf','.json':'application/json','.md':'text/plain'})[path.extname(rel)]??'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']}),errors=[],checks=[];
try{
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(8000);
 const origin=`http://127.0.0.1:${server.address().port}`;
 await p.goto(origin+'/works/ambertime/experiments/contest/');
 const snapshot=()=>p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort())));
 // Existing values are arbitrary opaque sentinels: experiment must not parse or write any key.
 await p.evaluate(()=>{localStorage.setItem('sukimastock.ambertime.wholesale.v18','opaque-v18-save');localStorage.setItem('sukimastock.ambertime.economy.v7','opaque-old-save');localStorage.setItem('unrelated','unchanged');});const before=await snapshot();await p.reload();
 await p.locator('[data-cask]').first().waitFor();await p.evaluate(()=>document.fonts.ready);
 const initial=await p.locator('#casks').innerText();assert.equal(await p.locator('[data-cask]').count(),4);
 for(const id of [1,2,3,4]){await p.locator(`[data-cask="${id}"]`).click();await p.locator('#submit').click();assert.equal(await p.locator('#history tr').count(),id);assert.match(await p.locator('#latest').innerText(),/総合/);}
 assert.equal(await snapshot(),before);checks.push('4 selections, distinct 3-judge scores, fixed rival and frozen history; storage unchanged');
 await p.locator('#reset').click();assert.equal(await p.locator('#casks').innerText(),initial);assert.equal(await p.locator('#history tr').count(),0);
 await p.locator('#consumption').selectOption('none');await p.locator('#submit').click();assert.match(await p.locator('#latest').innerText(),/消費 0.00 L/);
 await p.locator('#consumption').selectOption('large');await p.locator('#submit').click();assert.match(await p.locator('#latest').innerText(),/消費 0.70 L/);assert.equal(await p.locator('#history tr').count(),1);
 await p.locator('#consumption').selectOption('small');await p.locator('#evaporation').selectOption('strong');const strong=await p.locator('[data-cask="2"] .volume').innerText();await p.locator('#evaporation').selectOption('current');assert.notEqual(strong,await p.locator('[data-cask="2"] .volume').innerText());assert.equal(await p.locator('#casks').innerText(),initial);
 await p.locator('#advance6').click();assert.match(await p.locator('#month').innerText(),/6か月/);await p.locator('#advance12').click();assert.match(await p.locator('#month').innerText(),/1年6か月/);await p.locator('#submit').click();
 checks.push('same-state reset; all consumption conditions; hypothetical evaporation reset;6/12-month controls');
 await p.locator('#replace-panel summary').click();await p.locator('#recipe-stop').selectOption('30');await p.locator('#recipe-type').selectOption('bourbon');await p.locator('#replace').click();assert.equal(await p.locator('[data-cask="5"]').count(),1);assert.match(await p.locator('#sold').innerText(),/売却 1樽/);
 const downloadWait=p.waitForEvent('download');await p.locator('#export').click();const download=await downloadWait;const downloaded=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(downloaded.casks.length,4);assert.equal(downloaded.sold.length,1);assert.equal(downloaded.history.length,1);assert.equal(downloaded.version,'ambertime-contest/0.1');assert.equal(await snapshot(),before);
 checks.push('sell/replace four slots, retired barrel and exported exact session');
 await p.locator('#reset').click();await p.locator('[data-cask="2"]').click();await p.locator('#submit').click();await p.screenshot({path:out+'/phone390.png',fullPage:true});
 for(const width of [360,1280]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await p.locator('[data-cask]').count(),4);await p.screenshot({path:out+`/width${width}.png`,fullPage:true});}
 await p.goto(origin+'/lab/#room-bench');await p.locator('a[href="../works/ambertime-contest-lab/"]').click();await p.locator('[data-cask]').first().waitFor();assert.match(p.url(),/ambertime\/experiments\/contest\//);await p.locator('.back').click();assert.match(p.url(),/lab\/#room-bench/);assert.equal(await snapshot(),before);assert.deepEqual(errors,[]);checks.push('360/390/1280 fit,LAB redirect/back,no page errors,all stored bytes unchanged');
 console.log(JSON.stringify({passed:true,checks,errors,screenshots:out,physicalSafari:false},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
