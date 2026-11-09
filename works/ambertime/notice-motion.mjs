// Presentation-only labels and motion; never alters event eligibility or game state.
export const NOTIFICATION_MOTION=Object.freeze({ambient:'ambient',news:'news',operation:'operation',important:'important'});
export function noticePresentation(events){
 const item=Array.isArray(events)&&events.length===1?events[0]:null;
 if(item?.kind==='message'&&item.id?.startsWith('daily-display:'))return {motion:'ambient',heading:item.sourceLabel??'蒸留所のひとこと'};
 if(item?.id?.startsWith('world-display:'))return {motion:'news',heading:'町の知らせ'};
 return {motion:'operation',heading:''};
}
export const generationCaption=id=>id===1?'初代':({2:'二代',3:'三代',4:'四代',5:'五代',6:'六代',7:'七代',8:'八代',9:'九代',10:'十代'}[id]??(Number.isInteger(id)?id+'代':'蒸留所'));
export function topGenerationNotice({generation,modal,canSave,preview,runtimeHalted,documentHidden}={}){
 if(modal||!generation||generation.phase!=='last-batch'||runtimeHalted||documentHidden||(!preview&&!canSave))return null;
 return {heading:'大切な連絡',text:generationCaption(generation.id)+'の最後の仕込み · '+generation.deadlineLabel+'まで',kind:'important'};
}
