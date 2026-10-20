// Step 1 boundary only. No room, storage key, migration or economic rule lives
// here. Products passed to this foundation are the existing listed inventory.
import {advanceMonth,validateState} from './model.mjs?v=0.6-parallel';
import {CHARACTER_PARAMETERS as C,observeCharacterMonth} from './character.mjs?v=0.40-partial-bottling';
const copy=x=>structuredClone(x);
const assert=(ok,message)=>{if(!ok)throw new Error(message);};

export function advanceCoreMonth(core,expectedMonth=core.month,options={}) {
  assert(Number.isInteger(expectedMonth)&&expectedMonth===core.month,'月次処理の対象月が一致しません。');
  return advanceMonth(core,options);
}

export function createCaskNotes(cask) {
  return {phase:'watching',view:'watching',peakCharacter:cask.character,targetAge:null,
    choices:[],pending:null,seen:[],lastEventAge:-C.minEventGap,samples:[],actions:[],cooled:false,intent:null};
}

function checkedNotes(core,notesById) {
  assert(notesById&&typeof notesById==='object'&&!Array.isArray(notesById),'樽別の記録がありません。');
  const ids=core.casks.map(c=>String(c.id));
  assert(Object.keys(notesById).length===ids.length&&Object.keys(notesById).every(id=>ids.includes(id)),'樽と記録の識別値が一致しません。');
  for(const id of ids) {
    const n=notesById[id];
    assert(n&&['watching','choice'].includes(n.phase)&&['watching','tasting'].includes(n.view),'樽の停止状態が不正です。');
    assert(Number.isFinite(n.peakCharacter)&&n.peakCharacter>=0&&n.peakCharacter<=1&&
      (n.targetAge===null||Number.isInteger(n.targetAge)&&n.targetAge>=0)&&
      Number.isInteger(n.lastEventAge)&&Array.isArray(n.choices)&&Array.isArray(n.seen)&&Array.isArray(n.samples),'樽の観察記録が不正です。');
    assert(n.pending===null||n.phase==='choice'&&typeof n.pending?.id==='string','樽の判断が不正です。');
    assert(n.phase!=='choice'||n.pending!==null,'未解決の判断がありません。');
  }
}

function requestBottling(j) {
  j.phase='choice';j.view='watching';j.targetAge=null;
  j.pending={id:'bottle-ready',title:'この樽を瓶へ移す',text:'',options:[{id:'bottle',label:'瓶詰めを確かめる'}]};
}

// Passive flavor history reuses the existing observation thresholds and spacing.
// It never creates a choice, deadline, completion, or a new chemistry step.
function observeFreeAging(notes,cask,month){
 const n=copy(notes);n.peakCharacter=Math.max(n.peakCharacter,cask.character);
 if(cask.age<C.firstEventAge||cask.age-n.lastEventAge<C.minEventGap)return n;
 const unseen=id=>!n.seen.includes(id),recent=n.samples.at(-1);let event=null;
 if(unseen('wood')&&cask.wood>=C.woodGoal)event={id:'wood',title:'原酒の色が深くなってきた'};
 else if(unseen('fading')&&(n.peakCharacter-cask.character>=C.aromaLoss||recent&&recent.profile.character-cask.character>=C.sampleAromaLoss))event={id:'fading',title:'香りの移り変わり'};
 else if(unseen('rough')&&cask.roughness>C.roughGoal)event={id:'rough',title:'若い原酒のまま、少し先へ'};
 else if(unseen('fruit')&&unseen('rough')&&unseen('rounded')&&cask.character>C.fruitGoal)event={id:'fruit',title:'原酒の香りが広がる頃'};
 else if(unseen('rounded')&&unseen('fruit')&&cask.roughness<=C.softGoal)event={id:'rounded',title:'口当たりが変わる頃'};
 else if(unseen('loss')&&(cask.litres+(n.withdrawnLitres??0))/cask.initialLitres<=C.remainingGoal&&cask.wood<C.woodThreat)event={id:'loss',title:'少しずつ、減っていく'};
 if(event){n.seen.push(event.id);n.lastEventAge=cask.age;n.observations??=[];n.observations.push({caskId:cask.id,age:cask.age,eventId:event.id,title:event.title,text:'',month});}
 return n;
}

export function advanceMonthly(state,{expectedMonth,paused=false,listedProductIds}={}) {
  validateState(state.core);
  // Reject stale callbacks even while paused; they must never become a later
  // second transaction when the pause is removed.
  assert(Number.isInteger(expectedMonth)&&expectedMonth===state.core.month,'月次処理の対象月が一致しません。');
  checkedNotes(state.core,state.notesById);
  if(paused||Object.values(state.notesById).some(n=>n.view==='tasting'||n.pending!==null))return state;
  const core=advanceCoreMonth(state.core,expectedMonth,{listedProductIds}),notesById={},decisions=[];
  for(const before of [...state.core.casks].sort((a,b)=>a.id-b.id)) {
    const cask=core.casks.find(c=>c.id===before.id);
    // Existing chemistry can retire a barrel below one bottle; do not create
    // a phantom observation or refer to another barrel in its place.
    if(!cask)continue;
    const local={...copy(state.notesById[before.id]),core:{...core,casks:[cask]}};
    const {core:ignored,...legacyNotes}=state.freeAging?.version===1?local:observeCharacterMonth(local,requestBottling);
    const notes=state.freeAging?.version===1?observeFreeAging(legacyNotes,cask,core.month):legacyNotes;
    notesById[cask.id]=notes;
    if(notes.pending)decisions.push({month:core.month,caskId:cask.id,eventId:notes.pending.id,pending:copy(notes.pending)});
  }
  return {...state,core,notesById,decisions};
}
