const {chromium,devices}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];
 for(const name of ['iPhone 13','iPad (gen 7)','Desktop']){
  const context=await browser.newContext(name==='Desktop'?{viewport:{width:1280,height:800}}:devices[name]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TSUBU_URL || 'http://127.0.0.1:8765/works/tsumatta-tsubu/');
  await page.waitForTimeout(700);
  const snap=()=>page.evaluate(async()=>{const {simulation:s}=await import('./app.mjs');const r=document.querySelector('canvas').getBoundingClientRect(),scale=Math.min(r.width/400,r.height/535);const p=s.particles[0];return {escaped:s.particles.filter(p=>p.y>360).length,drag:s.drag,x:r.x+(r.width-400*scale)/2+p.x*scale,y:r.y+(r.height-535*scale)/2+(p.y-80)*scale,scale,overflow:document.documentElement.scrollWidth>innerWidth};});
  let st=await snap();if(st.escaped!==0)throw Error(name+' premature flow');
  const cdp=await context.newCDPSession(page);
  const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,radiusX:7,radiusY:7}]});
  if(name==='Desktop'){await page.mouse.click(st.x,st.y);}else{await touch('touchStart',st.x,st.y);await page.waitForTimeout(80);await touch('touchEnd');}
  await page.waitForTimeout(500);if((await snap()).escaped)throw Error(name+' tap unlocked');
  st=await snap();
  if(name==='Desktop'){await page.mouse.move(st.x,st.y);await page.mouse.down();await page.mouse.move(st.x+20*st.scale,st.y,{steps:12});}else{await touch('touchStart',st.x,st.y);for(let i=1;i<=12;i++){await touch('touchMove',st.x+20*st.scale*i/12,st.y);await page.waitForTimeout(16);}}
  await page.waitForTimeout(350);
  if(name==='Desktop')await page.mouse.up();else await touch('touchEnd');
  const afterRelease=await snap();await page.waitForTimeout(6000);const flowed=await snap();
  if(flowed.escaped!==32)throw Error(name+' flow incomplete '+flowed.escaped);
  await page.screenshot({path:'/tmp/tsubu-'+name.replaceAll(' ','-')+'-empty.png'});
  await page.locator('#reset').click();st=await snap();if(st.escaped!==0||st.drag)throw Error('reset');
  await page.screenshot({path:'/tmp/tsubu-'+name.replaceAll(' ','-')+'.png'});
  if(name!=='Desktop'){await touch('touchStart',st.x,st.y);await touch('touchCancel');}else{await page.mouse.move(st.x,st.y);await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();}
  if((await snap()).drag)throw Error('cancel retained drag');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);st=await snap();if(st.overflow||st.drag||st.escaped)throw Error('resize');
  results.push({device:name,afterRelease:afterRelease.escaped,after6seconds:flowed.escaped,tapNoRelease:true,cancel:true,resize:true,overflow:st.overflow,errors});await context.close();
 }
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
