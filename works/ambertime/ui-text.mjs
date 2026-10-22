import {CHARACTER_PARAMETERS as C} from './character.mjs?v=stage4-r2';
// Fixed system copy only. Never pass user names, imported prose, or saved records.
// This adapter leaves simulation modules and their persisted text untouched.
const phrases=Object.freeze([
 ['涼しい棚へ移す','冷暗所へ'],['生成り','ホワイト'],['墨色','ブラック'],
 ['原酒と木の重なりを待つ','熟成を待つ'],
 ['原酒の色が深くなってきた','色が深くなった'],
 ['若い原酒のまま、少し先へ','若い原酒'],['原酒の香りが広がる頃','かおりが広がる'],
 ['木の変化をもう少し見守る','木の変化を待つ'],['軽やかさの変化を見届ける','軽やかさを待つ'],
 ['丸さがどう変わるか見守る','丸さを待つ'],['減少を承知で、もう少し待つ','量が減っても待つ'],
 ['あと3か月だけ見守って瓶詰めする','3か月後にビン詰め'],
 ['色はまだ淡く、若い原酒が、ゆっくり変わっています。試飲して、刺激の変化を確かめられます。','若い原酒がゆっくり変わっています。'],
 ['仕込みから時間が経ちました。今の口当たりを、試飲で確かめられます。','口当たりが変わってきました。'],
 ['貯蔵庫の4樽が埋まっています。','貯蔵庫は4たるで満杯です。'],
 ['この銘柄はまだ取扱い前です。','この銘柄は取扱い前です。'],
 ['瓶詰めを確かめる','ビン詰め'],['樽に詰める','たる詰め'],
 ['今止めた場合の見込み','抽出見込み'],['原酒の香り','かおり'],
 ['試飲して考える','試す'],['口当たりの変化を待つ','待つ'],
 ['抽出を終える','おわる'],['蒸留する','蒸留'],
 ['果実と樽香が重なる','果実と木のかおり'],['樽香が豊か','木のかおり豊か'],
 ['果実香が豊か','果実のかおり豊か'],['刺激と香りが重なる','刺激とかおりが重なる'],
 ['淡い木の香り','ほのかな木のかおり'],
 ['木の渋みが強い','木のしぶみが強い'],['木の香り','木のかおり'],
 ['軽やかなアイリッシュを思わせる口当たり','軽やかなアイリッシュのよう'],
 ['熟した果実と穀物','熟した果実とこくもつ'],['軽い果実と穀物','軽い果実とこくもつ'],
 ['果実と穀物','果実とこくもつ'],['木の渋み','木のしぶみ'],['控えめ','ひかえめ']
]);
export function uiText(value){
 if(value===null||value===undefined)return value;
 let text=String(value);
 for(const [from,to] of phrases)text=text.split(from).join(to);
 return text.replaceAll('銘柄','ブランド').replaceAll('樽','たる').replaceAll('瓶','ビン').replaceAll('刺激','シゲキ').replaceAll('標準','ふつう').replaceAll('バーボンたる','バーボン').replaceAll('リフィルたる','リフィル');
}

// Live maturation prompts only. Never apply this view to archived observations.
// The event detector and its persisted title/text/options remain unchanged.
export function agingEventText(event,cask,notes={}){
 const fallback={title:uiText(event.title),text:uiText(event.text)};
 if(!cask)return fallback;
 const recent=notes.samples?.at(-1),earlier=recent&&recent.age<cask.age;
 switch(event.id??event.eventId){
  case 'wood':return {title:'色が深くなった',text:earlier&&cask.wood-recent.profile.wood>=C.comparisonWood?'前に試したときより色が濃い':''};
  case 'fading':return {title:'かおりが弱くなった',text:earlier&&recent.profile.character-cask.character>=C.sampleAromaLoss?'前に試したときよりかおりが弱い':''};
  case 'rough':return {title:'若い原酒',text:'まだシゲキが残る'};
  case 'fruit':return {title:'かおりが強い',text:'果実とこくもつのかおり'};
  case 'rounded':return {title:'口当たりが丸くなった',text:''};
  case 'loss':return {title:'量が減った',text:cask.initialLitres>0?'たる詰めから'+Number(((1-cask.litres/cask.initialLitres)*100).toFixed(1))+'％減った':''};
  default:return fallback;
 }
}
