import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {noticeLayout,NOTICE_WINDOW} from '../canvas-layout.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const motion=read('notice-motion.css');
const rule=selector=>motion.split(selector+'{').slice(1).map(body=>body.split('}')[0]).find(body=>body.includes('animation:'))??'';

test('transient bodies align left while bottle and ordinary UI alignment stays scoped',()=>{
 const css=read('room-scene.css'),dialogue=read('shop-dialogue.css');
 assert.match(css,/\.automatic-news\{display:block;text-align:left;/);
 assert.match(dialogue,/\.shop-dialogue-content p\{[^}]*text-align:left/);
 assert.match(css,/\.first-bottle-complete\{[^}]*text-align:center/);
 assert.match(css,/\.first-bottle-finished-name\{[^}]*text-align:center/);
});

test('Canvas fallback notices paint each line from the same padded left edge',()=>{
 const source=read('canvas-scene.mjs'),start=source.indexOf('if(view.notice){'),end=source.indexOf('}else delete this.root.dataset.noticeLayout;',start);
 assert(start>0&&end>start);const render=vm.runInNewContext('(function(view,noticeStep,metrics,c){'+source.slice(start,end+1)+'})',{noticeLayout,NOTICE_WINDOW,BODY_SIZE:16,FONT_STACK:'sans-serif'});
 const calls=[],scene={measure:text=>[...text].length*16,window:()=>{},root:{dataset:{}},text:(...args)=>calls.push(args)};
 const text='通知の読み始めを揃えます。長い文章の折返しでも左端を変えません。';
 render.call(scene,{notice:text},26,{pixels:16,unit:1},{save:()=>{},restore:()=>{},measureText:()=>({actualBoundingBoxAscent:12,actualBoundingBoxDescent:3})});
 const layout=JSON.parse(scene.root.dataset.noticeLayout);assert(calls.length>1);
 assert.deepEqual(calls.map(c=>c[0]),layout.lines);assert(calls.every(c=>c[1]===layout.x+layout.padding&&c[4]==='left'));
});

test('each timed lane has brief stepped edges and no moving animation during reading',()=>{
 const lanes=[['.automatic-news[data-motion="ambient"]','amber-day-rise','amber-day-leave',240,6000],['.automatic-news[data-motion="news"]','amber-news-pass','amber-news-leave',240,6500],['.automatic-news[data-motion="operation"]','amber-top-appear','amber-operation-leave',180,3500],['#shop-dialogue-notice[data-motion="ambient"]','amber-shop-rise','amber-shop-leave',180,6500]];
 for(const [selector,enter,leave,entryMs,lifetime] of lanes){
  const enterSteps=enter==='amber-news-pass'?'6':'[34]',leaveSteps=leave==='amber-news-leave'?'5':'3';
  const body=rule(selector);assert.match(body,new RegExp('animation:'+enter+' '+entryMs+'ms steps\\('+enterSteps+',end\\) both,'+leave+' 180ms steps\\('+leaveSteps+',end\\) calc\\(var\\(--notice-life,'+lifetime+'ms\\) - 180ms\\) forwards;'));
  // The entry finishes within 240ms and the exit cannot start until the final
  // 180ms; the entire intervening reading interval keeps the final entry pose.
  assert(entryMs<=240);assert(lifetime-180-entryMs>=3000);
 }
 assert.match(rule('#important-top-notice'),/animation:amber-top-appear 240ms steps\(4,end\) both/);
 assert.doesNotMatch(motion,/ease(?:-in|-out)?|\blinear\b/);
});

test('reduced motion bypasses all transient animations and restores the complete static pose',()=>{
 const reduced=motion.slice(motion.indexOf('@media(prefers-reduced-motion:reduce)'));
 for(const selector of ['.automatic-news[data-motion="ambient"]','.automatic-news[data-motion="news"]','.automatic-news[data-motion="operation"]','#shop-dialogue-notice[data-motion="ambient"]','#important-top-notice'])assert(reduced.includes(selector),selector);
 assert.match(reduced,/animation:none!important;transform:none!important;opacity:1!important/);
});

// Optional actual app/font/browser coverage. Instrument the served response only;
// no testing hook, extra timer or dependency is shipped in the production app.
test('browser: left text, short stepped edges, still hold and long-text controls at four phone sizes',{skip:!process.env.AMBER_BROWSER_MODULE,timeout:120000},async()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const hook=`\nwindow.ui2StyleTest={push:events=>automaticNews.push(events),reset:()=>automaticNews.reset(),prepare:()=>{userPaused=true;room='sales';modal=null;render();schedule();}};`;
 const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+'/'))throw Error('path');
  let data=await readFile(file);if(file.endsWith('/shop-app.mjs'))data=Buffer.from(data.toString()+hook);
  res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]??'text/html');res.end(data);
 }catch{res.writeHead(404);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  const {chromium}=await import(process.env.AMBER_BROWSER_MODULE);browser=await chromium.launch({executablePath:process.env.AMBER_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:680},hasTouch:true});
  await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/?preview=1`);await page.waitForFunction(()=>window.ui2StyleTest&&window.amberPlacement?.snapshot()?.core&&document.documentElement.dataset.fontState==='ready');await page.evaluate(()=>ui2StyleTest.prepare());
  const pauseAt=async time=>page.locator('#automatic-news').evaluate((el,time)=>{for(const animation of el.getAnimations()){animation.pause();animation.currentTime=time;}return {transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity};},time);
  for(const [width,height] of [[360,568],[375,620],[390,680],[430,740]]){
   await page.setViewportSize({width,height});
   for(const text of ['お知らせが届きました。','全国の飲食のつながりへ、『AmberTime・第3回』の口コミが届きました。同じきっかけで、別の地域にも評判が伝わりました。']){
    await page.evaluate(text=>{ui2StyleTest.reset();ui2StyleTest.push([{id:'town:style:'+text,kind:'message',text}]);},text);
    await page.waitForFunction(()=>{const el=document.getElementById('automatic-news'),layout=JSON.parse(el.dataset.noticeLayout??'null'),viewport=JSON.parse(document.getElementById('scene-root').dataset.viewport??'null');return viewport&&Math.abs(viewport.width-innerWidth)<1&&layout&&layout.lines.join('').replace(/\n/g,'')===el.textContent.replace(/\n/g,'');});
    const frame1=await pauseAt(60),frame2=await pauseAt(120);assert.notEqual(frame1.transform,frame2.transform);
    assert.deepEqual(await pauseAt(400),await pauseAt(4000),'reading position is stationary');
    const geometry=await page.locator('#automatic-news').evaluate(el=>({align:getComputedStyle(el).textAlign,r:el.getBoundingClientRect().toJSON(),sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}));
    assert.equal(geometry.align,'left');assert(geometry.r.left>=0&&geometry.r.right<=width&&geometry.r.top>=0&&geometry.r.bottom<=height);assert(geometry.sw<=geometry.cw+1&&geometry.sh<=geometry.ch+1);
   }
   await page.evaluate(()=>{ui2StyleTest.reset();ui2StyleTest.push([{id:'town:style:extreme',kind:'message',text:'長い地域名と商品名を含む知らせです。'.repeat(50)+'文章の末尾。'}]);});await pauseAt(1000);
   await page.waitForFunction(()=>document.getElementById('automatic-news').dataset.overflow==='true');
   assert((await page.locator('#automatic-news').textContent()).endsWith('文章の末尾。'));await page.locator('#automatic-news').evaluate(el=>{el.scrollTop=el.scrollHeight;});assert(await page.locator('#automatic-news').evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-1));
   await page.locator('#automatic-news-close').click();assert(await page.locator('#automatic-news').isVisible()===false);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{ui2StyleTest.reset();ui2StyleTest.push([{id:'town:style:reduced',kind:'message',text:'静止した知らせを最後まで読みます。'}]);});
  const reduced=await page.locator('#automatic-news').evaluate(el=>({name:getComputedStyle(el).animationName,transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity,text:el.textContent}));assert.equal(reduced.name,'none');assert.equal(reduced.transform,'none');assert.equal(reduced.opacity,'1');assert(reduced.text.endsWith('静止した知らせを最後まで読みます。'));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
