// Presentation only: format an existing readout without reading or changing the
// formal game, DOM, clock, storage or random sequence.
import {uiText} from './ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1';

export function spiritReadoutView(readout,{cutInProgress=false,modalKind=null,collectionVersion}={}){
 if(!readout||cutInProgress||modalKind==='fill'||readout.phase==='filled')return {hidden:true};
 const gathering=readout.phase==='estimate';
 return {
  hidden:false,
  kind:gathering?'ここまで':readout.phase==='forecast'?(collectionVersion===2?'ここまで':'抽出見込み'):readout.phase==='filled'?'たる詰め済み':'原酒',
  phrase:gathering?'':uiText(readout.phrase),
  gaugesHidden:gathering,
  volume:readout.litres.toFixed(1)+' L',
  axes:(readout.axes??[]).map(axis=>({id:axis.id,value:String(axis.value),valueText:axis.value.toFixed(2)+' / '+axis.maximum+' · 特徴の強さ',ratio:axis.ratio}))
 };
}
