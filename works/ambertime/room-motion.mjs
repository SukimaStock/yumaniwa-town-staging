// Disposable presentation state. Inputs are identifiers only; no game or save access.
const DURATION=2400,STEP=400;
const kind=room=>room==='warehouse'?'cask':room==='sales'?'release':null;
export class RoomMotion{
 constructor(){this.reset();}
 reset(){this.known=null;this.pending={cask:new Set(),release:new Set()};this.active=null;}
 observe({caskIds=[],releaseIds=[],availableReleaseIds=releaseIds}){
  const current={cask:new Set(caskIds),release:new Set(releaseIds)},available={cask:current.cask,release:new Set(availableReleaseIds)};
  if(this.known)for(const type of ['cask','release'])for(const id of current[type])if(!this.known[type].has(id)&&available[type].has(id))this.pending[type].add(id);
  this.known=current;
  for(const type of ['cask','release'])for(const id of this.pending[type])if(!current[type].has(id)||!available[type].has(id))this.pending[type].delete(id);
  if(this.active){
   const a=this.active,exists=id=>current[a.type].has(id)&&available[a.type].has(id);
   if(!exists(a.target))this.active=null;else a.ids=a.ids.filter(exists);
  }
 }
 sample({room,caskIds=[],releaseIds=[],visible=true,reduced=false,now=0}){
  const type=kind(room),visibleIds=new Set(type==='cask'?caskIds:type==='release'?releaseIds:[]);
  const empty=()=>({room,ids:[],blinkId:null,hidden:false,staticIds:[],nextMs:null});
  if(this.active){const a=this.active;if(!visible||a.type!==type||!visibleIds.has(a.target)||now-a.started>=DURATION)this.active=null;else{a.ids=a.ids.filter(id=>visibleIds.has(id));a.reduced||=reduced;}}
  if(!visible||!type)return empty();
  if(!this.active){
   const ids=[...this.pending[type]].filter(id=>visibleIds.has(id));
   if(!ids.length)return empty();
   for(const id of ids)this.pending[type].delete(id);
   this.active={type,ids,target:ids.at(-1),started:now,reduced};
  }
  const a=this.active,elapsed=Math.max(0,now-a.started),remaining=DURATION-elapsed;
  return {room,ids:[...a.ids],blinkId:a.reduced?null:a.target,hidden:!a.reduced&&Math.floor(elapsed/STEP)%2===1,staticIds:a.ids.filter(id=>a.reduced||id!==a.target),nextMs:a.reduced?remaining:Math.min(remaining,STEP-elapsed%STEP)};
 }
}
