// Real Chromium + actual Desk transaction bridge. All writes are in a temp copy.
// Run: PLAYWRIGHT_MODULE=playwright node tests/map-asset-browser.cjs
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'map-asset-browser-'));
const desk=mode=>JSON.parse(execFileSync('python3',['-B',path.join(__dirname,'test_map_asset_registration.py'),'--browser',mode,directory],{encoding:'utf8'}));
const fixture=desk('prepare'),root=fixture.root;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/')name='/index.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
});
(async()=>{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const url=`http://127.0.0.1:${server.address().port}/?dev=1`;
    const browser=await chromium.launch({headless:true});
    try {
        const page=await browser.newPage({viewport:{width:1100,height:850}});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
        await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
        await page.goto(url);
        // The existing first-visit guide opens 900ms after load; close it before editing.
        await page.waitForFunction(()=>isMessageOpen);
        await page.locator('#message-window').click();
        await page.waitForFunction(()=>!isMessageOpen);
        await page.locator('#btn-debug-toggle').click();
        await page.locator('#edit-target').selectOption('props');
        await page.locator('#part-asset-select').selectOption(fixture.objectId);
        assert.equal(await page.locator('#part-asset-select option:checked').textContent(),'接続テスト植木');
        assert.equal(await page.evaluate(id=>getActiveTownParts().filter(p=>p.objectId===id).length,fixture.objectId),0);
        await page.locator('#btn-part-mode-add').click();
        const canvas=page.locator('#game-canvas'),box=await canvas.boundingBox();
        await page.mouse.click(box.x+box.width*0.45,box.y+box.height*0.58);
        const read=()=>page.evaluate(id=>JSON.parse(JSON.stringify(getActiveTownParts().filter(p=>p.objectId===id))),fixture.objectId);
        const placed=await read();assert.equal(placed.length,1);assert(!('src' in placed[0]));
        // Actual Editor fields -> history -> Undo, then drag -> clone -> delete -> Undo.
        const x=page.locator('#part-x-input');await x.fill(String(Math.round(placed[0].x*16)+16));await x.press('Tab');
        assert.notEqual((await read())[0].x,placed[0].x);
        await page.locator('#btn-editor-undo').click();assert.deepEqual(await read(),placed);
        const point=await page.evaluate(id=>{
            const part=getActiveTownParts().find(p=>p.objectId===id),r=getPartRectPixels(part),c=getCamera(),b=canvas.getBoundingClientRect();
            return {x:b.x+((r.x+r.w/2-c.cameraX)*c.zoom)*b.width/canvas.width,y:b.y+((r.y+r.h/2-c.cameraY)*c.zoom)*b.height/canvas.height};
        },fixture.objectId);
        await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+25,point.y+12,{steps:5});await page.mouse.up();
        assert.notDeepEqual(await read(),placed);
        await page.locator('#btn-part-duplicate').click();assert.equal((await read()).length,2);
        await page.locator('#btn-part-delete').click();assert.equal((await read()).length,1);
        await page.locator('#btn-editor-undo').click();assert.equal((await read()).length,2);
        await page.locator('#btn-editor-undo').click();assert.equal((await read()).length,1);
        const expected=await read();
        await page.locator('#btn-editor-export').click();
        const exported=await page.locator('#export-textarea').inputValue();
        assert(exported.includes('yumaniwa-editor-diff-v1'));assert(exported.includes(fixture.objectId));
        fs.writeFileSync(path.join(directory,'editor-export.txt'),exported);
        await page.locator('#btn-close-export').click();
        await page.screenshot({path:path.join(directory,'placed.png')});
        const applied=desk('apply');assert.equal(applied.applied,true);
        await page.reload();
        assert.deepEqual(await read(),expected);
        const loaded=await page.evaluate(async id=>{
            const image=new Image();image.src=YUMANIWA_WORLD_OBJECTS.resolveSrc(id);await image.decode();
            return {width:image.naturalWidth,height:image.naturalHeight,scene:currentScene,src:image.src};
        },fixture.objectId);
        assert.equal(loaded.width,fixture.logical[0]);assert.equal(loaded.height,fixture.logical[1]);
        await page.waitForFunction(()=>window.YUMANIWA_ARRIVAL_READY && getComputedStyle(document.getElementById('town-loading-layer')).opacity==='0');
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.screenshot({path:path.join(directory,'reloaded.png')});
        assert.deepEqual(errors,[]);
        const result={browser:await browser.version(),directory,url,registration:fixture,desk:applied,expected,loaded,pageErrors:errors,result:'PASS'};
        fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
    } finally {await browser.close();server.close();}
})().catch(error=>{console.error(directory);console.error(error);server.close();process.exitCode=1;});
