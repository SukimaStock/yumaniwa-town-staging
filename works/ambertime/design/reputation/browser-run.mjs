import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(new URL('../../../../',import.meta.url).pathname),output=new URL('./',import.meta.url);
const server=createServer(async(req,res)=>{try{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))throw Error('path');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const executablePath=process.env.AMBERTIME_CHROME??'/tmp/audit-chromium';
let browser;
const checks=[];
try{
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width:width===390?430:1400,height:1000},hasTouch:width===390,isMobile:width===390}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/design/reputation/browser-check.html`);
  await page.locator(width===390?'#phone':'#pc').click();
  const setup=async(name)=>{await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('正規操作'));await page.frameLocator('#game').locator('#game').waitFor({state:'visible'});};
  const f=page.frameLocator('#game');
  const open=async()=>{await f.locator('#room-nav [data-room=warehouse]').click();await f.locator('#cask-rack [data-cask-id]').last().click();await f.locator('#open-bottle').click();};
  const act=name=>f.locator(`[data-action="${name}"]`).click();
  await setup('新しい銘柄');await open();assert.equal(await f.locator('#brand-choice').inputValue(),'new');
  await f.locator('#brand-name').fill('窓辺');await f.locator('.brand-appearance summary').click();await f.locator('#brand-bottle').selectOption('slender');await f.locator('#brand-label').selectOption('dark');
  await page.screenshot({path:new URL(`new-${width}.png`,output).pathname,fullPage:true});
  await act('bottle');await act('list');
  assert.equal(await page.evaluate(()=>JSON.parse(window.qaStorage.getItem('sukimastock.ambertime.wholesale.v9')).game.brands[0].name),'窓辺');
  await setup('完売銘柄を再発売');await open();assert.equal(await f.locator('#brand-choice').inputValue(),'1');assert.equal(await f.locator('#brand-name').count(),0);
  await f.locator('#brand-choice').selectOption('new');await f.locator('#brand-name').fill('夕凪 <&>');await f.locator('.brand-appearance summary').click();await f.locator('#brand-bottle').selectOption('slender');await f.locator('#brand-label').selectOption('dark');
  await f.locator('#brand-choice').selectOption('1');await f.locator('#brand-choice').selectOption('new');assert.equal(await f.locator('#brand-name').inputValue(),'夕凪 <&>');assert.equal(await f.locator('#brand-bottle').inputValue(),'slender');assert.equal(await f.locator('#brand-label').inputValue(),'dark');
  await f.locator('#brand-choice').selectOption('1');await act('bottle');await act('list');
  let state=await page.evaluate(()=>JSON.parse(window.qaStorage.getItem('sukimastock.ambertime.wholesale.v9')).game);assert.equal(state.brands.length,1);assert.equal(state.releases.length,2);assert.equal(state.brands[0].label,'dark');
  await f.locator('#ledger > summary').click();await f.locator('.brand-history > summary').click();assert.match(await f.locator('.brand-history').innerText(),/発売 2回.*累計販売/s);assert.match(await f.locator('.brand-history').innerText(),/少しずつ知られている/);
  const overflow=await page.locator('#game').evaluate(frame=>frame.contentDocument.documentElement.scrollWidth>frame.contentWindow.innerWidth);assert.equal(overflow,false);
  await page.screenshot({path:new URL(`repeat-${width}.png`,output).pathname,fullPage:true});
  await f.locator('.brand-history').screenshot({path:new URL(`ledger-${width}.png`,output).pathname});
  await page.locator('#reload').click();await f.locator('#game').waitFor({state:'visible'});assert.equal(await f.locator('#storage-notice').isVisible(),false);
  const restored=await page.evaluate(()=>JSON.parse(window.qaStorage.getItem('sukimastock.ambertime.wholesale.v9')).game);assert.deepEqual(restored,state);
  await setup('卸売指定の樽');await f.locator('#room-nav [data-room=warehouse]').click();await f.locator('#cask-rack [data-cask-id]').last().click();await f.locator('#contract-info').click();assert.equal(await f.locator('#brand-choice').count(),0);
  assert.deepEqual(errors,[]);checks.push({width,firstDefault:'new',repeatDefault:1,draftPreserved:true,repeatIdentity:true,ledger:true,noHorizontalOverflow:true,strictReload:true,wholesaleNoBrand:true,pageErrors:errors});
  await context.close();
 }
 await fs.writeFile(new URL('./browser-results.json',output),JSON.stringify({browser:'Chromium',physicalIPhone:false,checks},null,2)+'\n');console.log(JSON.stringify(checks));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
