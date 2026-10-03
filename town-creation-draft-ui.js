// Explicit Editor hooks and a local file workflow; no uploads or telemetry.
(function(root){
    'use strict';
    const api=root.YUMANIWA_CREATION_DRAFT;
    let installed=false,busy=false,message='',pendingSave=null;
    const el=id=>document.getElementById(id);
    function show(text){message=text;refresh();}
    async function action(fn){if(busy)return;busy=true;refresh();try{await fn();}catch(error){show(error.message);}finally{busy=false;refresh();}}
    function install(){
        if(installed||!root.DEV_MODE_ENABLED)return;
        const content=document.querySelector('#editor-panel .editor-content');if(!content)return;
        installed=true;
        const section=document.createElement('section');section.id='creation-draft-panel';
        section.innerHTML=`<h3>制作下書き <small>未登録素材</small></h3>
<p>見た目だけを確認します。当たり判定・イベントは付きません。再読込・タブ終了で一時状態は消えます。ZIPを「ファイル」へ保存してください。</p>
<p>1枚16 MiB・各辺2048px以内／16枚・合計64 MiB・展開画素合計16 Mpx以内（Undo中の画像も個数・容量に含みます）。</p>
<div class="creation-actions"><button id="creation-import-png">PNGを持ち込む</button><button id="creation-open">下書きZIPを再開</button></div>
<input id="creation-png-file" type="file" accept="image/png,.png" hidden><input id="creation-zip-file" type="file" accept="application/zip,.zip" hidden><input id="creation-meta-file" type="file" accept="application/json,.json" hidden>
<label>操作対象 <select id="creation-mode"><option value="formal">正式編集（既存Undo）</option><option value="draft">未登録下書き（専用Undo）</option></select></label>
<label>試し置き <select id="creation-selection"><option value="">選択してください</option></select></label>
<p id="creation-details"></p>
<div class="creation-actions"><button id="creation-left">← 1px</button><button id="creation-right">→ 1px</button><button id="creation-up">↑ 1px</button><button id="creation-down">↓ 1px</button></div>
<div class="creation-actions"><button id="creation-smaller">縮小 −5%</button><button id="creation-larger">拡大 +5%</button></div>
<div class="creation-actions"><button id="creation-foot-up">足元線 ↑ 1px</button><button id="creation-foot-down">足元線 ↓ 1px</button></div>
<div class="creation-actions"><button id="creation-meta">任意のCleaner JSON</button><button id="creation-anchor">Cleaner足元行を使用</button></div>
<label><input type="checkbox" id="creation-adopt">この試し置きを採用分に含める</label>
<div class="creation-actions"><button id="creation-visible">表示／非表示</button><button id="creation-delete">この試し置きを捨てる</button><button id="creation-undo">下書きUndo</button></div>
<div class="creation-actions"><button id="creation-walk">枠・パネルを隠して歩く</button><button id="creation-save">下書きZIPを保存</button><button id="creation-export">採用分をDeskへ渡す</button></div>
<div id="creation-download" hidden><a id="creation-download-link">ZIPをファイルへ保存</a><button id="creation-saved">ファイル保存完了を確認</button><button id="creation-save-cancel">書き出しを閉じる</button></div>
<div class="creation-actions"><button id="creation-discard">下書き全体を捨てる</button></div>
<p id="creation-status" role="status" aria-live="polite"></p>`;
        content.insertBefore(section,content.firstChild);
        const badge=document.createElement('div');badge.id='creation-preview-status';badge.hidden=true;badge.setAttribute('role','status');document.body.appendChild(badge);
        const bind=(id,fn)=>el(id).addEventListener('click',()=>action(fn));
        bind('creation-import-png',()=>{el('creation-png-file').value='';el('creation-png-file').click();});
        bind('creation-open',()=>{el('creation-zip-file').value='';el('creation-zip-file').click();});
        bind('creation-meta',()=>{el('creation-meta-file').value='';el('creation-meta-file').click();});
        [['creation-png-file',file=>api.add(file)],['creation-zip-file',file=>api.restore(file)],['creation-meta-file',file=>api.metadata(file)]].forEach(([id,fn])=>{
            el(id).addEventListener('change',()=>{const file=el(id).files[0];if(!file)return;action(async()=>{await fn(file);el('creation-mode').value='draft';api.setMode(true);show(id==='creation-zip-file'?'復元済み。Undoはここからの操作に効きます。':'読込済み。座標はscene基準です。');});});
        });
        [['creation-left',()=>api.move(-1/16,0)],['creation-right',()=>api.move(1/16,0)],['creation-up',()=>api.move(0,-1/16)],['creation-down',()=>api.move(0,1/16)],
            ['creation-smaller',()=>api.resize(1/1.05)],['creation-larger',()=>api.resize(1.05)],['creation-foot-up',()=>api.foot(-1/16)],['creation-foot-down',()=>api.foot(1/16)],
            ['creation-anchor',api.cleanerAnchor],['creation-visible',api.toggleVisible],['creation-undo',api.undo]].forEach(([id,fn])=>bind(id,fn));
        bind('creation-delete',()=>{if(confirm('この試し置きを下書きから捨てますか？ 元PNGや正式編集は変更しません。'))api.remove();});
        bind('creation-discard',()=>{if(confirm('下書き全体を捨てますか？ 未保存の試し置きは失われます。正式編集は別に残ります。')){api.discard();show('制作下書きだけを破棄しました。');}});
        el('creation-selection').addEventListener('change',()=>{if(el('creation-selection').value)api.select(el('creation-selection').value);refresh();});
        el('creation-adopt').addEventListener('change',()=>api.adopt(el('creation-adopt').checked));
        el('creation-mode').addEventListener('change',()=>{api.setMode(el('creation-mode').value==='draft');root.finishPartEditorDrag();root.editingPartIndex=-1;root.editingTriggerIndex=-1;refresh();});
        bind('creation-walk',()=>root.closeTownEditor());
        const exportFile=async purpose=>{
            api.finish();root.finishPartEditorDrag();
            const result=await api.pack(purpose);
            clearDownload();const url=URL.createObjectURL(result.blob);
            const name=(purpose==='draft'?'制作下書き-':'Desk採用分-')+result.manifest.scene.id+'.zip';
            pendingSave={...result,url,purpose};el('creation-download-link').href=url;el('creation-download-link').download=name;
            el('creation-download').hidden=false;
            show('元PNGと仮配置'+(result.manifest.formal?'、独立した正式編集snapshot／diff':'')+'を含みます。「ZIPをファイルへ保存」から保存してください。ダウンロード開始だけでは保存済みにしません。');
        };
        bind('creation-save',()=>exportFile('draft'));bind('creation-export',()=>exportFile('adoption'));
        bind('creation-saved',()=>{if(pendingSave&&pendingSave.purpose==='draft'){api.markExported(pendingSave.serial);show('ファイル保存の確認済み。正式編集の反映は別途必要です。');}else show('採用分の書出しです。下書き全体の保存状態は更新しません。');clearDownload();});
        bind('creation-save-cancel',()=>{clearDownload();show('書出しを閉じました。作業は残っています。');});
        root.addEventListener('beforeunload',event=>{if(api.isDirty()){event.preventDefault();event.returnValue='';}});
        refresh();
    }
    function clearDownload(){if(pendingSave)URL.revokeObjectURL(pendingSave.url);pendingSave=null;if(el('creation-download'))el('creation-download').hidden=true;}
    function refresh(){
        if(!installed)return;const draft=api.current(),p=api.selectedPlacement(),same=api.sameScene();
        const select=el('creation-selection');select.replaceChildren();
        const first=document.createElement('option');first.value='';first.textContent='試し置きを選択';select.appendChild(first);
        if(draft)draft.placements.forEach(item=>{const a=draft.assets.find(a=>a.key===item.assetKey),o=document.createElement('option');o.value=item.key;o.textContent='未登録: '+a.name+' ['+item.key.slice(-6)+']'+(!item.visible?'（非表示）':'');select.appendChild(o);});
        select.value=p?p.key:'';
        const a=p&&draft.assets.find(a=>a.key===p.assetKey);
        el('creation-details').textContent=p?`PNG ${a.physical.join('×')}px／論理サイズ・基準倍率・pixelSafeは未検証。配置 x=${(p.x*16).toFixed(2)}, y=${(p.y*16).toFixed(2)}, ${ (p.w*16).toFixed(2)}×${(p.h*16).toFixed(2)} world px／足元=${(p.footY*16).toFixed(2)} world px`:'名前・分類・正式objectIdはDeskで確定します。';
        el('creation-adopt').checked=!!p&&draft.adoption.includes(p.key);el('creation-adopt').disabled=!p||!same||busy;
        const selectionButtons=['creation-left','creation-right','creation-up','creation-down','creation-smaller','creation-larger','creation-foot-up','creation-foot-down','creation-meta','creation-anchor','creation-visible','creation-delete'];
        selectionButtons.forEach(id=>{el(id).disabled=!p||!same||busy;});
        ['creation-save','creation-export'].forEach(id=>{el(id).disabled=!draft||!same||busy;});
        el('creation-undo').disabled=!api.hasUndo()||!same||busy;
        el('creation-import-png').disabled=busy||!!draft&&!same;el('creation-open').disabled=busy;
        el('creation-status').textContent=(draft?(same?'下書き '+draft.scene.id:'別scene '+draft.scene.id+' の下書きを保持中')+'／'+(api.isDirty()?'未書き出し・書出し後の変更あり':'保存確認済み'):'制作下書きなし')+'。正式編集は既存保存欄で別管理。'+message;
        const badge=el('creation-preview-status');badge.hidden=!draft||!same;
        badge.textContent='未登録プレビュー中 '+(draft?draft.placements.filter(p=>p.visible).length:0)+'点'+(api.isDirty()?'・未書き出し':'・ZIP保存確認済み')+'／再読込で消失';
        el('editor-panel').classList.toggle('creation-mode-active',api.activeMode());
        const formalUndo=el('btn-editor-undo');if(formalUndo)formalUndo.disabled=api.activeMode();
    }
    root.YUMANIWA_CREATION_UI={install,refresh};
    root.addEventListener('load',install);
})(window);
