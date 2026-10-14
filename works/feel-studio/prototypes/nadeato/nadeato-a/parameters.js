/* Optional authoring parameters; the material remains independently playable. */
(function(root){'use strict';
const defaults={followDelay:0,resistance:0,fingerWidth:54,contrast:1};
const declarations=[
 {id:'followDelay',label:'毛が指に追いつくまで',min:0,max:.35,step:.01,unit:'秒',hint:'0はその場で反映。離した後も目標の向きへ静かに追いつきます。'},
 {id:'resistance',label:'なで跡のつきにくさ',min:0,max:1,step:.05,unit:'',hint:'毛の向きが変わる量を調整します。強くしても、なでると少しずつ跡が残ります。'},
 {id:'fingerWidth',label:'指が触れる幅',min:24,max:96,step:2,unit:'CSS px',hint:'通常操作は画面上の幅。比較用の一なでは640×560の基準面で換算します。'},
 {id:'contrast',label:'毛の向きによる明暗',min:.4,max:1.8,step:.05,unit:'倍',hint:'毛の形や残った跡を保ち、方向の陰影だけを変えます。'}
];
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join()!==Object.keys(defaults).sort().join())throw Error('調整設定の形が違います');
 const result={};for(const d of declarations){const v=value[d.id];if(!Number.isFinite(v)||v<d.min||v>d.max)throw Error('調整設定が範囲外です');result[d.id]=v;}return result;
}
function elements(config){const c=validate(config);return declarations.map(d=>({...d,type:'range',apply:'live',group:d.id==='contrast'?'見え方':'手触り',value:c[d.id]}));}
const api={defaults,declarations,validate,elements};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NadeatoParameters=api;
})(typeof window!=='undefined'?window:globalThis);
