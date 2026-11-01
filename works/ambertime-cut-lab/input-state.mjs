export const FIXED_LITRES=34.35;
export const initialState=()=>({phase:'ready',progress:0,start:null,end:null,prepared:false,countdown:null});
export function controls(s){const running=s.phase==='running',expired=running&&s.start===null&&s.progress>=88;return {visible:true,leverEnabled:s.prepared&&(s.phase==='ready'||expired),leverDown:s.phase==='countdown'||running&&!expired,glassEnabled:running&&(s.start===null?s.progress<=87:s.progress-s.start>=12),glassMode:running?(s.start===null?'start':'stop'):null,glassPosition:running&&s.start!==null?0:1};}
export function transition(s,action){
 if(action==='prepare')return {...initialState(),prepared:true};
 if(action==='reset')return {...initialState(),prepared:s.prepared};
 if(action==='lever'&&controls(s).leverEnabled)return {...initialState(),prepared:true,phase:'countdown',countdown:3};
 if(action==='countdown'&&s.phase==='countdown')return s.countdown>1?{...s,countdown:s.countdown-1}:{...s,phase:'running',countdown:null};
 if(action==='step'&&s.phase==='running'&&!(s.start===null&&s.progress>=88)&&s.progress<99)return {...s,progress:s.progress+1};
 if(action==='glass'&&controls(s).glassEnabled)return s.start===null?{...s,start:s.progress}:{...s,phase:'finished',end:s.progress};
 return s;
}
export function symbolicFill(s,mode='pulse'){if(s.start===null)return 0;const width=(s.end??s.progress)-s.start;return mode==='interval'?Math.min(1,width/99):Math.min(.7,width/8*.7);}
