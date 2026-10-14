/* Feel Parameters: optional Studio declarations; the work uses these defaults without Bridge. */
(function(root){'use strict';
const defaults={angle:0,wait:.85,gravity:670,resistance:1.05,response:1,sensitivity:1,rainDensity:46,dropSize:1,waterColor:'#e4f5ee',rainEnabled:true,rainStyle:'soft',volume:1};
const parameters=[
 {id:'response',label:'雨どいが指に追いつく速さ',type:'range',min:.4,max:1.8,step:.05,apply:'live',group:'手触り'},
 {id:'sensitivity',label:'指の動きへの反応',type:'range',min:.5,max:1.8,step:.05,apply:'live',group:'手触り'},
 {id:'gravity',label:'雨粒の落ちる強さ',type:'range',min:300,max:1100,step:10,apply:'live',group:'水の流れ'},
 {id:'resistance',label:'雨どいを流れる水の抵抗',type:'range',min:0,max:3,step:.05,apply:'live',group:'水の流れ'},
 {id:'rainDensity',label:'背景の雨の密度',type:'range',min:0,max:92,step:1,apply:'live',group:'雨の景色'},
 {id:'dropSize',label:'水滴の見た目の大きさ',type:'range',min:.6,max:1.5,step:.05,apply:'live',group:'雨の景色',hint:'当たり判定は変わりません。'},
 {id:'waterColor',label:'水の色',type:'color',apply:'live',group:'雨の景色'},
 {id:'rainEnabled',label:'背景に雨を降らせる',type:'boolean',apply:'live',group:'雨の景色'},
 {id:'rainStyle',label:'雨の見え方',type:'choice',options:[{value:'soft',label:'かすかな雨'},{value:'clear',label:'くっきりした雨'}],apply:'live',group:'雨の景色'},
 {id:'volume',label:'水音の大きさ',type:'range',min:0,max:1.5,step:.05,apply:'live',group:'音',hint:'作品の♪ボタンで音を出します。'},
 {id:'angle',label:'最初の雨どいの傾き',type:'value',min:-.66,max:.66,step:.02,unit:'rad',apply:'restart',group:'次の始まり'},
 {id:'wait',label:'最初の雨までの間',type:'timing',min:0,max:2,step:.05,unit:'秒',apply:'restart',group:'次の始まり'},
 {id:'gutterShape',label:'雨どいの形を変える',type:'rebuild',apply:'rebuild',group:'形をつくる',hint:'コードの別案をWorkへ依頼します。'}
];
function validate(value){
 if(!value||Object.keys(value).sort().join()!==Object.keys(defaults).sort().join())throw Error('雨つぎの設定の形が違います');
 const next=JSON.parse(JSON.stringify(value));
 for(const e of parameters){if(e.apply==='rebuild')continue;const v=next[e.id];
  if(['range','timing','value'].includes(e.type)&&(!Number.isFinite(v)||v<e.min||v>e.max))throw Error('調整値が範囲外です');
  if(e.type==='boolean'&&typeof v!=='boolean')throw Error('雨の表示が不正です');
  if(e.type==='color'&&(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v)))throw Error('水の色が不正です');
  if(e.type==='choice'&&!e.options.some(o=>o.value===v))throw Error('雨の見え方が不正です');
 }
 return next;
}
const api={defaults,parameters,validate,elements:config=>[
 {id:'gutter',label:'雨どいをつかむ',type:'position',control:'work',apply:'live',group:'手触り',hint:'銅色の端を上下に動かせます。試遊の傾きは一時的な操作です。次の開始角度は「次の始まり」で保存します。'},
 ...parameters.map(e=>({...e,...(e.apply==='rebuild'?{}:{value:config[e.id]})}))]};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AmetsugiParameters=api;
})(typeof window!=='undefined'?window:globalThis);
