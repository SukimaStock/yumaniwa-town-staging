// Focused layout check; fixtures are disposable test saves, never production data.
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import * as D from '../partner-orders.mjs';
import {mapProgress} from '../world-map-view.mjs';
const {chromium}=await import(pathToFileURL(process.env.AMBER_BROWSER_MODULE).href);
const root=path.resolve(new URL('../../../',import.meta.url).pathname),out=process.env.AMBER_MAP_OUTPUT??'/tmp/amber-map-check';
fs.mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{let p=new URL(req.url,'http://local').pathname;const before=p.startsWith('/before/');if(before)p=p.slice(7);if(p.endsWith('/'))p+='index.html';let f=path.join(root,p);if(before&&['room-scene.css','shop-app.mjs','index.html'].includes(path.basename(f)))f=path.join(process.env.AMBER_MAP_BEFORE,path.basename(f));try{res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.ttf':'font/ttf'})[path.extname(f)]??'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const KEY='sukimastock.ambertime.main.v1',results=[],errors=[];
const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const established=D.restoreDistillery(process.env.AMBER_MAP_FIXTURE?fs.readFileSync(process.env.AMBER_MAP_FIXTURE,'utf8'):D.serializeDistillery(D.enableMarketRules(D.enableStoreMarket(D.enableStage4(D.restoreDistillery(raw))))));
const initial=established; // Native fixture viewed at the distillery-only range.
const base=process.env.AMBER_MAP_URL??`http://127.0.0.1:${server.address().port}/works/ambertime/`;
try{
for(const before of process.env.AMBER_MAP_BEFORE?[true,false]:[false])for(const [width,height] of [[360,568],[375,620],[390,680]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 async function load(game,stage){const envelope=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(game)),userPaused:true,elapsed:0});
 await page.addInitScript(({KEY,envelope,stage,max})=>{localStorage.setItem(KEY,envelope);localStorage.setItem(KEY+'.map-reveal.v1',JSON.stringify({version:2,shown:max,announced:max}));sessionStorage.setItem(KEY+'.map-view.v1',JSON.stringify({version:1,stage,selectedShop:null}));},{KEY,envelope,stage,max:mapProgress(game).max});
 await page.goto(before?base.replace('/works/','/before/works/'):base);await page.waitForFunction(()=>document.documentElement.dataset.fontState==='ready');
 if(await page.locator('#action-dialog').isVisible())await page.locator('#close-dialog').click();
 await page.locator('#open-world-map').click();await page.waitForFunction(()=>document.querySelector('#action-dialog.daily-map:open'));
 }
 const bytes=()=>page.evaluate(k=>localStorage.getItem(k),KEY);
 async function geometry(name){const g=await page.evaluate(()=>{const d=document.querySelector('#action-dialog'),rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},f=n=>n?getComputedStyle(n).fontSize:null;return {dialog:rect(d),map:rect(d.querySelector('.world-map-surface')),controls:rect(d.querySelector('.world-map-controls')),footer:rect(d.querySelector('#dialog-actions')),report:rect(d.querySelector('.map-shop-report')),font:f(d.querySelector('#dialog-title')),bodyFont:f(d.querySelector('.map-shop-report h3')),uniform:getComputedStyle(document.documentElement).getPropertyValue('--uniform-font-size'),reportScroll:d.querySelector('.map-shop-report').scrollHeight,reportClient:d.querySelector('.map-shop-report').clientHeight,overflow:d.querySelector('#dialog-body').scrollWidth-d.querySelector('#dialog-body').clientWidth,labels:[...d.querySelectorAll('.map-shop-label')].map(n=>({...rect(n),text:n.textContent,client:n.clientWidth,scroll:n.scrollWidth})),buttons:[...d.querySelectorAll('button')].map(n=>({class:n.className,...rect(n)}))};});
 if(!before){assert(Math.abs(parseFloat(g.font)-parseFloat(g.uniform))<.001);assert.equal(g.font,g.bodyFont);assert(g.map.width>=228);assert(g.dialog.bottom<=height+1,JSON.stringify(g));assert(g.overflow<=1);for(const b of g.buttons)if(!b.class.includes('map-shop-label'))assert(b.height>=44);for(const l of g.labels){assert(l.scroll<=l.client+1);assert(l.x>=g.map.x-1&&l.right<=g.map.right+1,'label overflow');}}
 results.push({before,width,height,name,...g});await page.screenshot({path:path.join(out,`${before?'before':'after'}-${width}-${name}.png`)});return g;
 }
 await load(initial,1);await geometry('initial');await page.locator('#close-dialog').click();
 await load(established,3);const saved=await bytes(),g=await geometry('town');
 const pins=page.locator('.map-shop-hit');for(let i=0;i<await pins.count();i++){await pins.nth(i).click();const selected=await geometry('shop-'+i);if(!before){assert(Math.abs(selected.dialog.y+selected.dialog.height/2-height/2)<=1);}assert.equal(await bytes(),saved);}
 // Large factual labels are covered by map-counts-browser using fresh markup.
 if(!before){await page.locator('.map-shop-report').evaluate(n=>{const p=document.createElement('p');p.textContent='長い反応の表示確認。'.repeat(30);n.append(p);});const long=await geometry('long');assert(Math.abs(long.dialog.y+long.dialog.height/2-height/2)<=1);assert(long.reportScroll>long.reportClient);}
 for(const action of ['world-map-in','world-map-out']){const b=page.locator(`[data-action=${action}]`);if(await b.isEnabled()){await b.click();await geometry(action);}}
 assert.equal(await bytes(),saved);await page.locator('#close-dialog').click();await page.locator('#open-world-map').click();await page.locator('[data-action=map-sales-room]').click();assert.equal(await bytes(),saved);assert.equal(await page.locator('#action-dialog').isVisible(),false);
 await context.close();
}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));console.log(`PASS ${results.length} layout states; save bytes unchanged; no browser errors`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
