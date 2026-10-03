// Chromium file UI -> ZIP reload -> actual Desk -> source reload in a temporary copy.
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'creation-draft-browser-'));
const desk=mode=>JSON.parse(execFileSync('python3',['-B',path.join(__dirname,'test_creation_draft.py'),'--browser',mode,directory],{encoding:'utf8'}));
const fixture=desk('prepare'),root=fixture.root;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/index.html';
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/?dev=1`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()||''}));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto(url);await page.waitForFunction(()=>isMessageOpen);await page.locator('#message-window').click();await page.waitForFunction(()=>!isMessageOpen);
  await page.locator('#btn-debug-toggle').click();await page.locator('#edit-target').selectOption('props');
  const formal=await page.evaluate(()=>{recordTownEditorHistory();YUMANIWA_EDITOR_SESSION.current().draft.props[0].x+=.125;return YUMANIWA_EDITOR_BUILD_DIFF();});
  const file=async i=>page.locator('#creation-png-file').setInputFiles({name:'same.png',mimeType:'image/png',buffer:fs.readFileSync(fixture.fixtures[i])});
  await file(0);await page.waitForFunction(()=>YUMANIWA_CREATION_DRAFT.current()?.placements.length===1);
  await file(1);await page.waitForFunction(()=>YUMANIWA_CREATION_DRAFT.current()?.placements.length===2);
  await page.locator('#creation-meta-file').setInputFiles(path.join(directory,'metadata.json'));await page.waitForFunction(()=>YUMANIWA_CREATION_DRAFT.current().assets[1].metadata!==null);
  await page.locator('#creation-anchor').click();
  await page.locator('#creation-foot-up').click();await page.locator('#creation-larger').click();await page.locator('#creation-right').click();
  await file(2);await page.waitForFunction(()=>YUMANIWA_CREATION_DRAFT.current().placements.length===3);
  await page.locator('#creation-delete').click();await page.waitForFunction(()=>YUMANIWA_CREATION_DRAFT.current().placements.length===2);
  assert.deepEqual(await page.evaluate(()=>YUMANIWA_EDITOR_BUILD_DIFF()),formal);
  // Real pointer drag through main's explicit routing; formal Undo stays untouched.
  const point=await page.evaluate(()=>{const p=YUMANIWA_CREATION_DRAFT.current().placements[0],cam=getCamera(),rect=canvas.getBoundingClientRect();return {x:rect.x+((p.x+p.w/2)*16-cam.cameraX)*cam.zoom*rect.width/canvas.width,y:rect.y+((p.y+p.h/2)*16-cam.cameraY)*cam.zoom*rect.height/canvas.height};});
  await page.evaluate(()=>setEditorPanelCollapsed(true));
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+15,point.y+10,{steps:5});await page.mouse.up();
  await page.evaluate(()=>setEditorPanelCollapsed(false));
  const expected=await page.evaluate(()=>JSON.parse(JSON.stringify(YUMANIWA_CREATION_DRAFT.current().placements)));
  assert.equal(expected.length,2);assert.equal(await page.evaluate(()=>YUMANIWA_EDITOR_SESSION.current().history.length),1);
  // Hide/show preserves authored geometry; close panel leaves previews and walking enabled.
  await page.locator('#creation-visible').click();assert.equal(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.renderItems().length),1);
  await page.locator('#creation-visible').click();await page.locator('#creation-walk').click();
  assert.equal(await page.evaluate(()=>isEditMode),false);assert.equal(await page.locator('#creation-preview-status').isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.current().placements),expected);
  await page.locator('#btn-debug-toggle').click();
  // Rotate/zoom/camera changes do not touch scene values.
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{player.x+=16;player.y+=16;getCamera();});
  assert.deepEqual(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.current().placements),expected);
  await page.setViewportSize({width:844,height:390});assert.deepEqual(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.current().placements),expected);
  await page.setViewportSize({width:1100,height:850});
  await page.locator('#creation-save').click();await page.locator('#creation-download-link').waitFor({state:'visible'});
  const downloadEvent=page.waitForEvent('download');await page.locator('#creation-download-link').click();const download=await downloadEvent;await download.saveAs(path.join(directory,'draft.zip'));
  await page.locator('#creation-saved').click();assert.equal(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.isDirty()),false);
  // Capture an offscreen canvas using the real town prop/player renderer. Different foot
  // positions prove actor occlusion ordering, and exact pixels are compared after adoption.
  const capture=async(formalProps=false)=>page.evaluate(async formalProps=>{
    const api=YUMANIWA_CREATION_DRAFT,oldCtx=ctx,oldDef=activeTownSceneDef,oldPlayer={...player};
    const placements=formalProps?getActiveTownParts().filter(p=>p.id.startsWith('creation_')):api.current().placements;
    if(formalProps)await new Promise(resolve=>YUMANIWA_STATION_PLAZA_PROPS.preloadSceneProps({props:placements},{},resolve));
    const captures=[];
    try{
      activeTownSceneDef={props:formalProps?placements:[]};
      for(const offset of [-.5,.5]){
        const target=document.createElement('canvas');target.width=512;target.height=512;ctx=target.getContext('2d');
        ctx.fillStyle='#293536';ctx.fillRect(0,0,512,512);
        player.x=placements[0].x*16;player.y=(placements[0].footY+offset)*16-player.h;
        YUMANIWA_STATION_PLAZA_PROPS.drawTownActorsAndProps();captures.push(target.toDataURL());
      }
    }finally{ctx=oldCtx;activeTownSceneDef=oldDef;Object.assign(player,oldPlayer);}
    return captures;
  },formalProps);
  const visualBefore=await capture();assert.notEqual(visualBefore[0],visualBefore[1]);
  await page.reload();await page.waitForFunction(()=>YUMANIWA_ARRIVAL_READY);await page.locator('#btn-debug-toggle').click();
  await page.locator('#creation-zip-file').setInputFiles(path.join(directory,'draft.zip'));await page.waitForFunction(()=>YUMANIWA_CREATION_DRAFT.current()?.placements.length===2);
  assert.deepEqual(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.current().placements),expected);
  assert.deepEqual(await page.evaluate(()=>YUMANIWA_EDITOR_BUILD_DIFF()),formal);
  assert.equal(await page.evaluate(()=>YUMANIWA_EDITOR_SESSION.current().history.length),0);
  assert.equal(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.hasUndo()),false);
  assert.deepEqual(await capture(),visualBefore);
  await page.locator('#creation-export').click();await page.locator('#creation-download-link').waitFor({state:'visible'});
  const adoptionDownload=page.waitForEvent('download');await page.locator('#creation-download-link').click();await(await adoptionDownload).saveAs(path.join(directory,'adoption.zip'));
  await page.screenshot({path:path.join(directory,'draft-review.png')});
  const applied=desk('apply');assert.equal(applied.applied,true);assert(applied.formal.includes('パーツ更新'));
  await page.reload();await page.waitForFunction(()=>YUMANIWA_ARRIVAL_READY);
  const actual=await page.evaluate(()=>getActiveTownParts().filter(p=>p.id.startsWith('creation_')));
  assert.equal(actual.length,2);for(let i=0;i<2;i++)for(const k of ['x','y','w','h','footY'])assert.equal(actual[i][k],expected[i][k]);
  assert.equal(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.renderItems().length),0);
  assert.deepEqual(await capture(true),visualBefore);
  // Stale ZIP restore is rejected without touching the latest canonical scene.
  await page.locator('#btn-debug-toggle').click();await page.locator('#creation-zip-file').setInputFiles(path.join(directory,'draft.zip'));
  await page.waitForFunction(()=>document.getElementById('creation-status').textContent.includes('更新されています'));
  assert.equal(await page.evaluate(()=>YUMANIWA_CREATION_DRAFT.current()),null);
  assert.equal(await page.evaluate(()=>YUMANIWA_EDITOR_SESSION.isDirty()),false);
  await page.evaluate(()=>closeTownEditor());await page.screenshot({path:path.join(directory,'formal-result.png')});
  assert.deepEqual(errors,[]);
  assert(!requests.some(r=>/same\.png|placementSnapshot|k_[a-f0-9]{32}/.test(r.url+' '+r.body)));
  assert(!requests.some(r=>r.method!=='GET'));
  const result={result:'PASS',browser:await browser.version(),directory,geometry:expected,adopted:actual,formal:applied.formal,
    imageBytes:'SHA-256 exact originals verified by Desk reader',pixels:'two actor foot positions match byte-for-byte before/after 3x lossless normalization',
    scope:'Chromium desktop and emulated viewport rotation; not physical iPhone/iPad/Pythonista',pageErrors:errors,requests:requests.length};
  fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(directory);console.error(error);server.close();process.exitCode=1;});
