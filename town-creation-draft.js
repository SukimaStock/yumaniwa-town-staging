// Local-only single-scene authoring. Never inserts into a formal prop/asset owner.
(function (root) {
    'use strict';
    const LIMITS = Object.freeze({ count: 16, image: 16*1024*1024, total: 64*1024*1024,
        manifest: 1024*1024, edge: 2048, pixels: 16*1024*1024 });
    const SOURCES = ['data/station-plaza.js','data/town-maps.js','town-ghost-npc.js','data/world-objects.js'];
    const FORMAT = 'yumaniwa-creation-draft', VERSION = 1;
    const clone = value => JSON.parse(JSON.stringify(value));
    const fail = () => { throw new Error('制作下書きの形式・容量・座標が不正です。元の作業は保持しています。'); };
    const keyOK = key => typeof key === 'string' && /^k_[a-f0-9]{32}$/.test(key);
    const shaOK = hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
    const key = () => 'k_' + Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2,'0')).join('');
    async function sha(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), n => n.toString(16).padStart(2,'0')).join(''); }
    function safeJSON(value, depth=0) {
        if (depth > 32) fail();
        if (value === null || typeof value === 'boolean') return;
        if (typeof value === 'number') { if (!Number.isFinite(value)) fail(); return; }
        if (typeof value === 'string') { if (value.length > LIMITS.manifest) fail(); return; }
        if (!value || typeof value !== 'object') fail();
        Object.keys(value).forEach(k => { if (['__proto__','prototype','constructor'].includes(k)) fail(); safeJSON(value[k],depth+1); });
    }
    function safeMetadata(value) {
        safeJSON(value);
        if (typeof value === 'string' && /https?:|data:|blob:|file:|javascript:|\/\//i.test(value)) fail();
        if(value && typeof value === 'object') Object.values(value).forEach(safeMetadata);
    }
    function exact(value, keys) { if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).sort().join() !== keys.slice().sort().join()) fail(); }
    function pngInfo(bytes) {
        if (!(bytes instanceof Uint8Array) || bytes.length < 45 || bytes.length > LIMITS.image ||
            [137,80,78,71,13,10,26,10].some((n,i) => bytes[i] !== n)) fail();
        const v = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
        let at=8, width=0, height=0, end=false, idat=false;
        while (at < bytes.length) {
            if (at+12 > bytes.length) fail();
            const size=v.getUint32(at), type=String.fromCharCode(...bytes.subarray(at+4,at+8));
            if (size > LIMITS.image || at+12+size > bytes.length || !/^[A-Za-z]{4}$/.test(type)) fail();
            let crc=0xffffffff;
            for(let i=at+4;i<at+8+size;i++){crc^=bytes[i];for(let j=0;j<8;j++)crc=(crc&1)?(crc>>>1)^0xedb88320:crc>>>1;}
            if(((crc^0xffffffff)>>>0)!==v.getUint32(at+8+size))fail();
            if (at===8) {
                if (type!=='IHDR' || size!==13) fail();
                width=v.getUint32(at+8); height=v.getUint32(at+12);
                if (!width || !height || width > LIMITS.edge || height > LIMITS.edge) fail();
            } else if (type==='IHDR' || type==='acTL' || type==='fcTL' || type==='fdAT') fail();
            if (type==='IDAT') idat=true;
            at+=size+12;
            if (type==='IEND') { if (size || at!==bytes.length) fail(); end=true; break; }
        }
        if (!end || !idat) fail();
        return [width,height];
    }
    // Same cached source URL as the loaded script. Reject a changed auto fingerprint.
    let sourcePromise;
    function sources() {
        if (!sourcePromise) sourcePromise = Promise.all(SOURCES.map(async path => {
            const scripts=Array.from(document.querySelectorAll('script[src]'));
            const script=scripts.find(s => new URL(s.src,location.href).pathname.endsWith('/'+path));
            if (!script) throw new Error('制作下書きの関連sourceを確認できません。');
            const url=new URL(script.src,location.href);
            if (url.origin !== location.origin) fail();
            const response=await fetch(url.href,{cache:'force-cache',credentials:'same-origin'});
            if (!response.ok) throw new Error('関連sourceを読み取れません。もう一度開いてください。');
            const bytes=new Uint8Array(await response.arrayBuffer());
            const revision=url.searchParams.get('rev');
            if (revision && revision.startsWith('auto-')) {
                // Existing cache revisions operate on UTF-16 code units.
                const text=new TextDecoder().decode(bytes); let hash=0x811c9dc5;
                for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);}
                if (revision!=='auto-'+(hash>>>0).toString(16).padStart(8,'0')) throw new Error('関連sourceが更新されています。ZIPを保存し、再読込して確認してください。');
            }
            return [path,await sha(bytes)];
        })).then(items => Object.fromEntries(items)).catch(error => { sourcePromise=null; throw error; });
        return sourcePromise;
    }
    let draft=null, selected=null, mode=false, serial=0, exported=-1;
    const resources=new Map(), history=[];
    function changed() { serial++; if (root.YUMANIWA_CREATION_UI) root.YUMANIWA_CREATION_UI.refresh(); }
    function record() { history.push(clone(draft)); if(history.length>50) history.shift(); }
    function current() { return draft; }
    function sameScene() { return !!draft && draft.scene.id===root.currentScene; }
    function selectedPlacement() { return draft && draft.placements.find(p => p.key===selected); }
    function activeMode() { return mode && sameScene() && root.isEditMode; }
    async function decode(bytes) {
        const blob=new Blob([bytes],{type:'image/png'}),url=URL.createObjectURL(blob),image=new Image();
        try { image.src=url; await image.decode(); return {bytes,blob,image,url}; }
        catch (_) { URL.revokeObjectURL(url); fail(); }
    }
    function release() { resources.forEach(r=>URL.revokeObjectURL(r.url)); resources.clear(); }
    function initialScene() {
        const scene=root.getTownSceneDefinition(root.currentScene);
        return {id:root.currentScene,coordinates:'scene-tiles',tileSize:16,mapWidth:scene.mapWidth,mapHeight:scene.mapHeight};
    }
    async function add(file) {
        if (draft && !sameScene()) throw new Error('元のsceneの下書きが残っています。元のsceneで保存・破棄してから始めてください。');
        if (!(file instanceof Blob) || file.size > LIMITS.image) fail();
        const bytes=new Uint8Array(await file.arrayBuffer()), physical=pngInfo(bytes);
        const items=draft ? draft.assets : [];
        if(resources.size>=LIMITS.count || items.length>=LIMITS.count || Array.from(resources.values()).reduce((n,r)=>n+r.bytes.length,0)+bytes.length>LIMITS.total ||
            Array.from(resources.values()).reduce((n,r)=>n+r.image.naturalWidth*r.image.naturalHeight,0)+physical[0]*physical[1]>LIMITS.pixels) fail();
        const originScene=root.currentScene, initial=draft, hashes=await sources(), digest=await sha(bytes), r=await decode(bytes);
        if (root.currentScene!==originScene || draft!==initial) { URL.revokeObjectURL(r.url); throw new Error('読込中に作業が変わりました。もう一度選択してください。'); }
        const owner=draft || {format:FORMAT,version:VERSION,purpose:'draft',draftKey:key(),repository:'SukimaStock/yumaniwa-town-staging',
            scene:initialScene(),sources:hashes,assets:[],placements:[],adoption:[],formal:null};
        const assetKey=key(), placementKey=key(), tile=16;
        const size=Math.min(64,owner.scene.mapWidth*tile/4,owner.scene.mapHeight*tile/4);
        const w=size/tile,h=w*physical[1]/physical[0];
        const fit=Math.min(1,(owner.scene.mapHeight/4)/h);
        const width=w*fit,height=h*fit;
        const x=Math.max(0,Math.min(owner.scene.mapWidth-width,root.player.x/tile+1-width/2));
        const y=Math.max(0,Math.min(owner.scene.mapHeight-height,root.player.y/tile+1-height));
        try { geometry({x,y,w:width,h:height,footY:y+height},owner.scene); }
        catch (_) { URL.revokeObjectURL(r.url); throw new Error('縦横比が極端で初期配置を表示できません。元の作業は保持しています。'); }
        draft=owner;record();
        draft.assets.push({key:assetKey,path:'images/'+assetKey+'.png',name:String(file.name||'仮置き').slice(0,120).replace(/[\x00-\x1f]/g,''),
            sha256:digest,bytes:bytes.length,physical,metadata:null});
        draft.placements.push({key:placementKey,assetKey,x,y,w:width,h:height,footY:y+height,visible:true});
        draft.adoption.push(placementKey); resources.set(assetKey,r); selected=placementKey; mode=true; changed();
        return placementKey;
    }
    function geometry(p, scene) {
        const values=['x','y','w','h','footY'];
        if(values.some(k=>typeof p[k]!=='number'||!Number.isFinite(p[k])) || p.w*16<1 || p.h*16<1 || p.x<0 || p.y<0 ||
            p.x+p.w>scene.mapWidth+1e-8 || p.y+p.h>scene.mapHeight+1e-8 || p.footY<0 || p.footY>scene.mapHeight) fail();
    }
    function edit(operation) {
        const p=selectedPlacement(); if(!p || !sameScene()) return;
        const next=clone(p); operation(next); geometry(next,draft.scene);
        if(JSON.stringify(next)===JSON.stringify(p))return;
        record(); Object.assign(p,next); changed();
    }
    function move(dx,dy) { edit(p => {
        const x=Math.max(0,Math.min(draft.scene.mapWidth-p.w,p.x+dx));
        const minY=Math.max(0,p.y-p.footY),maxY=Math.min(draft.scene.mapHeight-p.h,draft.scene.mapHeight-p.footY+p.y);
        const y=Math.max(minY,Math.min(maxY,p.y+dy));
        p.footY+=y-p.y;p.x=x;p.y=y;
    }); }
    function resize(factor) { edit(p=>{
        if(!Number.isFinite(factor)||factor<=0)fail();
        const cx=p.x+p.w/2,anchor=(p.footY-p.y)/p.h;
        p.w*=factor;p.h*=factor;p.x=cx-p.w/2;p.y=p.footY-anchor*p.h;
    }); }
    function foot(delta) { edit(p=>{ p.footY=Math.max(0,Math.min(draft.scene.mapHeight,p.footY+delta)); }); }
    function toggleVisible() { edit(p=>{p.visible=!p.visible;}); }
    function remove() { if(!selectedPlacement())return; record();draft.placements=draft.placements.filter(p=>p.key!==selected);draft.assets=draft.assets.filter(a=>draft.placements.some(p=>p.assetKey===a.key));draft.adoption=draft.adoption.filter(k=>k!==selected);selected=null;changed(); }
    function undo() { if(!history.length)return;draft=history.pop();selected=null;changed(); }
    function discard() { release();draft=null;selected=null;history.length=0;mode=false;changed(); }
    function select(k) { if(!draft || !draft.placements.some(p=>p.key===k))fail();selected=k;changed(); }
    function adopt(on) { if(!selectedPlacement())return;record();draft.adoption=draft.adoption.filter(k=>k!==selected);if(on)draft.adoption.push(selected);changed(); }
    async function metadata(file) {
        const p=selectedPlacement(); if(!p)return; const owner=draft,k=p.assetKey;
        if(file.size>65536)fail();let value;try {value=JSON.parse(await file.text());}catch(_){fail();} safeMetadata(value);
        if(owner!==draft || !sameScene())throw new Error('読込中に作業が変わりました。');
        record();draft.assets.find(a=>a.key===k).metadata=value;changed();
    }
    function cleanerAnchor() {
        const p=selectedPlacement(),a=p && draft.assets.find(a=>a.key===p.assetKey),m=a&&a.metadata;
        const f=m&&m.finalization,t=f&&f.target,out=f&&f.output,logical=out&&out.logicalCanvasPx;
        if(!m || m.schema!=='yumaniwa-world-object/0.1' || !logical || !Number.isFinite(logical.height) || logical.height<=0 ||
            !t || !Number.isFinite(t.groundAnchorY)||t.groundAnchorY<0||t.groundAnchorY>=logical.height) throw new Error('対応するCleaner足元行がありません。上下ボタンで設定してください。');
        // A 0-based last pixel row corresponds to its lower edge in world space.
        edit(p=>{p.footY=p.y+p.h*(t.groundAnchorY+1)/logical.height;});
    }
    function renderItems() {
        if(!sameScene() || !root.DEV_MODE_ENABLED)return [];
        const scene=root.activeTownSceneDef,objects=root.YUMANIWA_WORLD_OBJECTS.objects;
        return draft.placements.filter(p=>p.visible).filter(p=>!scene.props.some(prop=>{
            const o=objects[prop.objectId],origin=o&&o.creationDraft;
            return origin && origin.draftKey===draft.draftKey && origin.assetKey===p.assetKey && prop.id===placementId(draft.draftKey,p.key);
        })).map(p=>({prop:p,image:resources.get(p.assetKey).image}));
    }
    function placementId(d,p) { return 'creation_'+d.slice(2)+'_'+p.slice(2); }
    async function pack(purpose='draft') {
        if(!draft || !sameScene())throw new Error('下書きのsceneへ戻って書き出してください。');
        const manifest=clone(draft),api=root.YUMANIWA_EDITOR_SESSION,s=api.current();
        manifest.purpose=purpose;
        manifest.formal=s&&s.sceneId===draft.scene.id ? {baseline:clone(s.baseline),snapshot:api.snapshot(),diff:root.YUMANIWA_EDITOR_BUILD_DIFF()} : null;
        if(purpose==='adoption') {
            manifest.placements=manifest.placements.filter(p=>manifest.adoption.includes(p.key));
            if(!manifest.placements.length)throw new Error('採用する試し置きを選択してください。');
            manifest.assets=manifest.assets.filter(a=>manifest.placements.some(p=>p.assetKey===a.key));
        } else manifest.assets=manifest.assets.filter(a=>manifest.placements.some(p=>p.assetKey===a.key));
        safeJSON(manifest);const text=JSON.stringify(manifest);
        if(new TextEncoder().encode(text).length>LIMITS.manifest)fail();
        const captured=serial;
        const blob=await root.MapFactoryZip.create([{name:'manifest.json',blob:new Blob([text])},...manifest.assets.map(a=>({name:a.path,blob:resources.get(a.key).blob}))]);
        if(blob.size>LIMITS.total+LIMITS.manifest+16384)fail();
        return {blob,manifest,serial:captured};
    }
    function validateManifest(m) {
        safeJSON(m);exact(m,['format','version','purpose','draftKey','repository','scene','sources','assets','placements','adoption','formal']);
        if(m.format!==FORMAT || m.version!==VERSION || !['draft','adoption'].includes(m.purpose) || !keyOK(m.draftKey)||m.repository!=='SukimaStock/yumaniwa-town-staging')fail();
        exact(m.scene,['id','coordinates','tileSize','mapWidth','mapHeight']);
        if(typeof m.scene.id!=='string'||!root.TOWN_SCENE_MAPS[m.scene.id]||m.scene.coordinates!=='scene-tiles'||m.scene.tileSize!==16||
            !Number.isInteger(m.scene.mapWidth)||!Number.isInteger(m.scene.mapHeight)||m.scene.mapWidth<1||m.scene.mapHeight<1)fail();
        exact(m.sources,SOURCES);if(SOURCES.some(k=>!shaOK(m.sources[k])))fail();
        if(!Array.isArray(m.assets)||!Array.isArray(m.placements)||!Array.isArray(m.adoption)||m.assets.length>LIMITS.count||m.placements.length>LIMITS.count)fail();
        const assets=new Set(),placements=new Set();let total=0,pixels=0;
        m.assets.forEach(a=>{
            exact(a,['key','path','name','sha256','bytes','physical','metadata']);
            if(!keyOK(a.key)||assets.has(a.key)||a.path!=='images/'+a.key+'.png'||!shaOK(a.sha256)||typeof a.name!=='string'||a.name.length>120||
                !Number.isInteger(a.bytes)||a.bytes<45||a.bytes>LIMITS.image||!Array.isArray(a.physical)||a.physical.length!==2||
                a.physical.some(n=>!Number.isInteger(n)||n<1||n>LIMITS.edge)||JSON.stringify(a.metadata).length>65536)fail();
            safeMetadata(a.metadata);assets.add(a.key);total+=a.bytes;pixels+=a.physical[0]*a.physical[1];
        });
        if(total>LIMITS.total||pixels>LIMITS.pixels)fail();
        m.placements.forEach(p=>{
            exact(p,['key','assetKey','x','y','w','h','footY','visible']);
            if(!keyOK(p.key)||placements.has(p.key)||!assets.has(p.assetKey)||typeof p.visible!=='boolean')fail();
            geometry(p,m.scene);placements.add(p.key);
            const a=m.assets.find(a=>a.key===p.assetKey);
            if(Math.abs(p.w/p.h-a.physical[0]/a.physical[1])>1e-8)fail();
        });
        if(m.assets.some(a=>!m.placements.some(p=>p.assetKey===a.key))||new Set(m.adoption).size!==m.adoption.length||m.adoption.some(k=>!placements.has(k)))fail();
        if(m.formal!==null) { exact(m.formal,['baseline','snapshot','diff']);if(m.formal.diff.format!=='yumaniwa-editor-diff-v1'||m.formal.diff.scene!==m.scene.id)fail(); }
        return m;
    }
    async function read(file) {
        if(!(file instanceof Blob)||file.size>LIMITS.total+LIMITS.manifest+16384)fail();
        const entries=await root.MapFactoryZip.read(file);
        const json=entries.get('manifest.json');if(!json||json.size>LIMITS.manifest||entries.size>LIMITS.count+1)fail();
        let m;try{m=JSON.parse(await json.text());}catch(_){fail();}validateManifest(m);
        if(entries.size!==m.assets.length+1 || Array.from(entries.keys()).some(n=>n!=='manifest.json'&&!m.assets.some(a=>a.path===n)))fail();
        const loaded=new Map();
        try {
            for(const a of m.assets){const b=entries.get(a.path);if(!b||b.size!==a.bytes)fail();const bytes=new Uint8Array(await b.arrayBuffer());
                if(await sha(bytes)!==a.sha256||JSON.stringify(pngInfo(bytes))!==JSON.stringify(a.physical))fail();loaded.set(a.key,await decode(bytes));}
            return {manifest:m,resources:loaded};
        } catch(error) { loaded.forEach(r=>URL.revokeObjectURL(r.url));throw error; }
    }
    async function restore(file) {
        if(draft || root.YUMANIWA_EDITOR_SESSION.isDirty())throw new Error('既存の下書き・正式編集を先に保存して明示的に破棄してください。混合・上書きはしません。');
        const initial=root.currentScene,loaded=await read(file);
        try {
            const m=loaded.manifest,hashes=await sources();
            if(draft || root.YUMANIWA_EDITOR_SESSION.isDirty() || initial!==root.currentScene)throw new Error('読込中に作業が変わりました。');
            if(m.scene.id!==root.currentScene)throw new Error('ZIPのsceneへ移動してから読み込んでください: '+m.scene.id);
            const canonical=root.getTownSceneDefinition(m.scene.id);
            if(canonical.mapWidth!==m.scene.mapWidth||canonical.mapHeight!==m.scene.mapHeight||SOURCES.some(k=>m.sources[k]!==hashes[k]))throw new Error('関連sourceまたはmap寸法が更新されています。自動復元せず、元のZIPを保持してください。');
            const prepared=m.formal?root.YUMANIWA_EDITOR_SESSION.prepareRestore(m.scene.id,m.formal):null;
            if(prepared){root.YUMANIWA_EDITOR_SESSION.restorePrepared(m.scene.id,prepared);root.bindTownEditorDraft();root.resetTownEditorTransientState();}
            draft=m;release();loaded.resources.forEach((v,k)=>resources.set(k,v));selected=null;history.length=0;serial++;exported=serial;mode=true;changed();
            // Restore itself is not an unsaved edit; Undo starts after the restored state.
            exported=serial;
        } catch(error) {loaded.resources.forEach(r=>URL.revokeObjectURL(r.url));throw error;}
    }
    let drag=null;
    function pointerDown(e) {
        if(!activeMode())return false;
        const point=root.getPartEditorWorldPoint(e);if(!point)return true;
        const candidates=renderItems().map(i=>i.prop).filter(p=>point.x>=p.x*16&&point.x<=(p.x+p.w)*16&&point.y>=p.y*16&&point.y<=(p.y+p.h)*16).sort((a,b)=>a.footY-b.footY);
        const p=candidates[candidates.length-1];selected=p?p.key:null;
        if(p){drag={pointer:e.pointerId,point,before:clone(draft),p:clone(p)};try{root.canvas.setPointerCapture(e.pointerId);}catch(_){} }
        if(root.YUMANIWA_CREATION_UI)root.YUMANIWA_CREATION_UI.refresh();return true;
    }
    function pointerMove(e) {
        if(!activeMode())return false;if(!drag||drag.pointer!==e.pointerId)return true;
        const point=root.getPartEditorWorldPoint(e);if(!point)return true;
        const p=selectedPlacement(),old=drag.p;
        const x=Math.max(0,Math.min(draft.scene.mapWidth-p.w,old.x+(point.x-drag.point.x)/16));
        const minY=Math.max(0,old.y-old.footY),maxY=Math.min(draft.scene.mapHeight-p.h,draft.scene.mapHeight-old.footY+old.y);
        const y=Math.max(minY,Math.min(maxY,old.y+(point.y-drag.point.y)/16));
        p.x=x;p.y=y;p.footY=old.footY+y-old.y;
        if(root.YUMANIWA_CREATION_UI)root.YUMANIWA_CREATION_UI.refresh();return true;
    }
    function finish() {if(drag){if(JSON.stringify(draft)!==JSON.stringify(drag.before)){history.push(drag.before);if(history.length>50)history.shift();changed();}drag=null;}}
    function handleKeyboard(e) {
        if(!activeMode())return false;
        const target=e.target || document.activeElement;
        if(target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))return false;
        const delta={ArrowLeft:[-1/16,0],ArrowRight:[1/16,0],ArrowUp:[0,-1/16],ArrowDown:[0,1/16]}[e.key];
        if(delta){e.preventDefault();move(delta[0],delta[1]);return true;}
        return false;
    }
    function overlay() {
        if(!activeMode())return;const p=selectedPlacement();if(!p||!p.visible)return;
        const ctx=root.ctx;ctx.save();ctx.strokeStyle='#ffc86a';ctx.lineWidth=1/root.getCamera().zoom;
        ctx.strokeRect(p.x*16,p.y*16,p.w*16,p.h*16);ctx.beginPath();ctx.moveTo(p.x*16,p.footY*16);ctx.lineTo((p.x+p.w)*16,p.footY*16);ctx.stroke();ctx.restore();
    }
    root.YUMANIWA_CREATION_DRAFT={LIMITS,SOURCES,sha,pngInfo,safeJSON,validateManifest,placementId,current,sameScene,selectedPlacement,
        add,metadata,cleanerAnchor,move,resize,foot,toggleVisible,remove,undo,discard,select,adopt,renderItems,pack,read,restore,
        activeMode,pointerDown,pointerMove,finish,overlay,handleKeyboard,setMode:value=>{finish();root.finishPartEditorDrag();root.editingPartIndex=-1;root.editingTriggerIndex=-1;mode=!!value;},
        isDirty:()=>!!draft&&serial!==exported,markExported:value=>{if(serial===value)exported=value;},hasUndo:()=>history.length>0};
})(window);
