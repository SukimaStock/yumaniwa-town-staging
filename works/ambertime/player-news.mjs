// Disposable player-facing views. Saved events, labels, receipts and simulation
// draws remain untouched so old recordings keep their exact replay contract.
import {NODES,townAffinity} from './town-connection.mjs?v=stage4-r2';

const places=new Map(NODES.map(n=>[n.id,n]));
const townOf=game=>game?.labConnection?.version===1?game.labConnection.town:null;
const releasesOf=game=>game?.releases??[];
function mainRelease(game,event){
 const town=townOf(game),external=town?.releases?.find(r=>r.id===event.releaseId)?.externalId;
 return releasesOf(game).find(r=>r.id===(event.mainReleaseId??external))
  ??releasesOf(game).find(r=>event.productId!==undefined&&r.productId===event.productId);
}

export function productTitle(game,releaseOrId){
 const release=typeof releaseOrId==='object'&&releaseOrId!==null?releaseOrId:releasesOf(game).find(r=>r.id===releaseOrId);
 if(!release)return 'ウイスキー';
 const brand=game?.brands?.find(b=>b.id===release.brandId),name=brand?.name??'ウイスキー';
 const number=releasesOf(game).filter(r=>r.brandId===release.brandId&&r.id<=release.id).length;
 return name+(number?'・第'+number+'回':'');
}

function introduction(byId,event){
 const seen=new Set();
 let source=event;
 while(source?.sourceId&&!seen.has(source.sourceId)){
  seen.add(source.sourceId);source=byId.get(source.sourceId);
  if(source?.type==='rumor')return source;
 }
 return null;
}

export function playerMilestones(game){
 const town=townOf(game);if(!town)return [];
 const seen=new Set(),out=[],byId=new Map((town.events??[]).map(e=>[e.id,e]));
 for(const event of town.events??[]){
  const place=places.get(event.to),release=mainRelease(game,event);
  if(!place||!release)continue;
  const arrival=event.type==='arrival'&&event.channel!=='direct';
  const inquiry=event.type==='inquiry'&&place.level!=='町';
  if(!arrival&&!inquiry)continue;
  const key=[event.type,release.brandId??'legacy',place.id].join(':');
  if(seen.has(key))continue;seen.add(key);
  const title=productTitle(game,release),from=arrival?introduction(byId,event):null;
  const text=arrival?place.name+'へ「'+title+'」の口コミが届きました。'+(from?.actor?from.actor+'からの紹介です。':'')
   :place.name+'から「'+title+'」の取扱いについて問い合わせがありました。';
  out.push({id:'town:'+event.id,month:event.month,text,priority:inquiry?3:place.level==='町'?1:2});
 }
 return out;
}

export function selectedTownEvents(before,after){
 const known=new Set(playerMilestones(before).map(e=>e.id));
 return playerMilestones(after).filter(e=>!known.has(e.id))
  .sort((a,b)=>b.priority-a.priority||b.month-a.month).slice(0,1)
  .map(e=>({...e,kind:'message'}));
}

function displayHash(seed,key){
 let hash=seed>>>0;
 for(const char of key)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return hash;
}
function commentLines(release,context){
 const profile=release.profile,flavor=profile?.flavor,raw=flavor?.version===1?flavor.profile:null;
 if(!profile||!['roughness','character','wood'].every(k=>Number.isFinite(profile[k])))return [];
 const rough=raw?.rough??profile.roughness,wood=raw?Math.max(raw.wood,raw.vanilla):profile.wood;
 const fit=townAffinity('town',release).fit;
 if(context)Object.assign(context,{raw,rough,wood,fit});
 if(fit<.5){
  if(raw?.smoke>=.55)return ['煙の香りは、私には少し強いかな。','私は煙の香りが控えめな方が好きかな。'];
  if(rough<.22)return ['私はもう少し刺激がある方が好きかな。','私には少し穏やかすぎるかな。'];
  if(rough>=.55)return ['私には少し刺激が強いかな。','もう少し穏やかな飲み口が好みです。'];
  if(wood>=.65)return ['私には樽の香りが強いかな。','樽の香りは、もう少し控えめな方が好きかな。'];
  if(raw?.fruit>=.6)return ['果実の香りはしますね。私の好みとは少し違うかな。'];
  return [];
 }
 if(raw?.smoke>=.55&&raw.smoke>=Math.max(raw.fruit,raw.grain))return ['けっこうスモーキーですね。','煙の香りがはっきりしますね。'];
 if(raw?.fruit>=.6&&raw.fruit>=Math.max(raw.smoke,raw.grain))return ['このウイスキー、果実の香りが豊かですね。','果実の香りがよく出ていますね。'];
 if(raw?.body>=.6&&raw.body>=Math.max(raw.fruit,raw.grain,raw.smoke))return ['しっかりした飲みごたえですね。','口に含むと厚みがありますね。'];
 if(raw?.grain>=.55&&raw.grain>=Math.max(raw.fruit,raw.smoke))return ['麦の香りがよく分かりますね。','麦の香りがしっかりしますね。'];
 if(wood>=.55)return ['樽の香りがよく出ていますね。','樽の香りがはっきりしますね。'];
 if(rough<=.18&&(!raw||raw.body<.45))return ['軽い飲み口ですね。','穏やかな飲み口ですね。'];
 if(rough>=.65)return ['けっこう刺激がありますね。','力強い飲み口ですね。'];
 return [];
}

// Display-only variation. These descriptions also serve the low-affinity
// branch: noticing an aroma does not imply liking it. Preferences never cross
// the existing fit<.5 / fit>=.5 boundary.
const commentStyles={
 smoke:{descriptions:['けっこうスモーキーですね。','煙の香りがはっきりしますね。'],preference:'この煙の香り、好きです。'},
 fruit:{descriptions:['このウイスキー、果実の香りが豊かですね。','果実の香りがよく出ていますね。'],preference:'こういう果実の香り、好きです。'},
 body:{descriptions:['しっかりした飲みごたえですね。','口に含むと厚みがありますね。'],preference:'こういう飲みごたえが好みです。'},
 grain:{descriptions:['麦の香りがよく分かりますね。','麦の香りがしっかりしますね。'],preference:'この麦の香り、好きです。'},
 wood:{descriptions:['樽の香りがよく出ていますね。','樽の香りがはっきりしますね。'],preference:'この樽の香りが好みです。'},
 gentle:{descriptions:['軽い飲み口ですね。','穏やかな飲み口ですね。'],preference:'この穏やかな飲み口、好きです。'},
 rough:{descriptions:['けっこう刺激がありますね。','力強い飲み口ですね。'],preference:'この力強い飲み口が好みです。'}
};
function commentStyle(legacy,{raw,rough,wood,fit}){
 const low=fit<.5;
 let key;
 if(low){
  if(raw?.smoke>=.55)key='smoke';
  else if(rough<.22)key='gentle';
  else if(rough>=.55)key='rough';
  else if(wood>=.65)key='wood';
  else if(raw?.fruit>=.6)key='fruit';
 }else{
  if(raw?.smoke>=.55&&raw.smoke>=Math.max(raw.fruit,raw.grain))key='smoke';
  else if(raw?.fruit>=.6&&raw.fruit>=Math.max(raw.smoke,raw.grain))key='fruit';
  else if(raw?.body>=.6&&raw.body>=Math.max(raw.fruit,raw.grain,raw.smoke))key='body';
  else if(raw?.grain>=.55&&raw.grain>=Math.max(raw.fruit,raw.smoke))key='grain';
  else if(wood>=.55)key='wood';
  else if(rough<=.18&&(!raw||raw.body<.45))key='gentle';
  else if(rough>=.65)key='rough';
 }
 const style=commentStyles[key];
 return style?{descriptions:low&&key==='gentle'?['刺激が控えめですね。','穏やかな飲み口ですね。']:style.descriptions,preferences:low?legacy:[style.preference]}:{descriptions:legacy,preferences:[]};
}
function commentWording(game,receipt,legacy,context,previous){
 const style=commentStyle(legacy,context),hash=displayHash(game.seed,'customer-wording:'+receipt.id);
 // Low bits correlate with the existing hash%8 occurrence filter. Use high
 // bits for the occasional preference and separate bits for the wording.
 const pool=(hash>>>16)%4===0?style.preferences:style.descriptions;
 let lines=pool.filter(line=>line!==previous);
 if(!lines.length)lines=style.descriptions.filter(line=>line!==previous);
 if(!lines.length)lines=[...style.descriptions,...style.preferences];
 return lines[(hash>>>8)%lines.length];
}

export function customerComments(game){
 const town=townOf(game);if(!town)return [];
 const out=[];let lastMonth=-Infinity,lastLine=null,lastDisplayedLine=null;
 // These are factual retail sales, not deliveries or people who only heard a rumor.
 for(const receipt of town.shipments??[]){
  if(!receipt.id?.startsWith('retail:')||!(receipt.count>0)||receipt.month-lastMonth<12)continue;
  const hash=displayHash(game.seed,'customer:'+receipt.id);
  if(hash%8!==0)continue;
  const part=receipt.parts?.find(p=>p.count>0),release=part?mainRelease(game,{releaseId:part.releaseId}):null;
  if(!release)continue;
  const context={},legacy=commentLines(release,context),lines=legacy.filter(line=>line!==lastLine);
  if(!lines.length)continue;
  // Keep the original line-selection state for eligibility, including the
  // singleton mismatch branch. Display variety must not add/suppress events.
  const legacyLine=lines[Math.floor(hash/8)%lines.length];
  const line=commentWording(game,receipt,legacy,context,lastDisplayedLine);
  out.push({id:'customer:'+receipt.id,month:receipt.month,text:productTitle(game,release)+'のお客さん「'+line+'」',releaseId:release.id});
  lastMonth=receipt.month;lastLine=legacyLine;lastDisplayedLine=line;
 }
 return out;
}
