'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.NEJI_URL || 'http://127.0.0.1:8765/works/neji-lift/');
 const value=()=>page.locator('#knob').getAttribute('aria-valuenow').then(Number);
 const dragging=()=>page.locator('#knob').evaluate(e=>e.classList.contains('dragging'));
 const center=()=>page.evaluate(()=>{const m=document.querySelector('#scene').getScreenCTM(); const p=new DOMPoint(180,423).matrixTransform(m); return {x:p.x,y:p.y,r:36*m.a};});
 const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.02,`${actual} != ${expected}`);
 const p=await center();
 const pos=a=>({x:p.x+Math.cos(a)*p.r,y:p.y+Math.sin(a)*p.r});
 let q=pos(0); await page.mouse.move(q.x,q.y); await page.mouse.down();
 for(let i=1;i<=48;i++){q=pos(i*Math.PI/24);await page.mouse.move(q.x,q.y);}
 near(await value(),56);
 q=pos(2*Math.PI-Math.PI/12);await page.mouse.move(q.x,q.y);near(await value(),56-1/3);
 await page.mouse.up(); const held=await value();await page.waitForTimeout(350);assert.equal(await value(),held);
 assert.equal(await dragging(),false);
 const cdp=await page.context().newCDPSession(page);
 const touch=async(type,a)=>{const t=pos(a);await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchCancel'||type==='touchEnd'?[]:[{x:t.x,y:t.y,id:1}]});};
 await touch('touchStart',0); for(let i=1;i<=24;i++)await touch('touchMove',i*Math.PI/24);await page.waitForFunction(expected=>Math.abs(+document.querySelector('#knob').getAttribute('aria-valuenow')-expected)<.02,held+4);near(await value(),held+4);
 await touch('touchCancel',Math.PI);assert.equal(await dragging(),false);
 await page.locator('#knob').focus();await page.keyboard.press('End');assert.equal(await value(),144);
 // Clamp at the stop, then respond immediately to reversing direction.
 q=pos(0);await page.mouse.move(q.x,q.y);await page.mouse.down();q=pos(.3);await page.mouse.move(q.x,q.y);assert.equal(await value(),144);
 q=pos(.2);await page.mouse.move(q.x,q.y);assert.ok(await value()<144);await page.mouse.up();
 await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');assert.equal(await value(),0);
 await page.keyboard.press('ArrowUp');assert.equal(await value(),1);
 await page.keyboard.press('PageUp');assert.equal(await value(),9);
 q=pos(0);await page.mouse.move(q.x,q.y);await page.mouse.down();await page.mouse.move(-50,-50);await page.mouse.up();assert.equal(await dragging(),false);
 q=pos(0);await page.mouse.move(q.x,q.y);await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await dragging(),false);await page.mouse.up();
 // Center crossing discards undefined angle, without changing the height.
 q=pos(0);await page.mouse.move(q.x,q.y);await page.mouse.down();const beforeCenter=await value();await page.mouse.move(p.x,p.y);q=pos(Math.PI);await page.mouse.move(q.x,q.y);assert.equal(await value(),beforeCenter);await page.mouse.up();
 await page.reload();assert.equal(await value(),48);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[390,844],[1100,760],[844,390]]) {
  await page.setViewportSize({width,height});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const b=await page.locator('#knob').boundingBox();assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.y+b.height<=height);
  await page.screenshot({path:`/tmp/neji-${width}.png`});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: one turn=8; immediate reverse; held after release; CDP touch/cancel; upper/lower stops; keyboard; outside release; blur; center crossing; resize/reload; reduced motion; 3 layouts; no overflow/page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
