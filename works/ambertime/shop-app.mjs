 const tools=currentDistillTools();if(!tools.leverEnabled)return;
 if(D.collectionState(game).expired){act(D.restartRangeDistillation,()=>message(''),null,{paused:false});return;}
 prepareDistillation(x=>{if(!D.stage4Mode(x))return D.startDistillation(x);const cards=manualCards(x);if(cards.ferment!==x.labConnection.cards.ferment)x=D.selectFlavorCards(x,cards);return D.startRangeDistillation(x);});
}
function endTaste(){if(!game||!preview&&!canSave)return false;if(game.tastingId!==null){const next=D.endTasting(game);if(!saveCandidate(next))return false;game=next;}return true;}
function selectRoom(next){if(!game||!preview&&!canSave||!['distill','warehouse','sales'].includes(next)||modal)return;marketUI.cancel();marketEditing=false;countdown.cancel();stopClock();if(manualDistilling())userPaused=true;if(!endTaste()){render();return;}if(next==='distill')shownFillSpiritId=null;room=next;save();render();schedule();}
// The internal identity remains the action target; its display serial is derived.
const caskLabel=c=>caskName(c.id)+' '+uiText(P.casks[c.type].short);
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+(text==='閉じる'?'data-close="true" ':text.endsWith('戻る')?'data-return="true" ':'')+extra+'>'+text+'</button>';
function openModal(kind,id=null){if(!game||(modal&&!['inspect','staff-panel','aux-panel'].includes(modal.kind))||kind==='fill'&&game.still.phase!=='filling')return;countdown.cancel();stopClock();deliveryNotice='';modal={kind,id};render();}
// Display the active sales mode; legacy delivery conditions are not shelf conditions.
 dialogueNotice.reset();dialogueProjection.reset();
 countdown.cancel();stopClock();game=session.game;caskSlots=session.caskSlots;recentLedger=session.recentLedger;historyRecord=session.historyRecord;pendingRecall=recallRecord=session.recallRecord;recallPreview=null;userPaused=session.userPaused;elapsed=session.elapsed;
 if(manualDistilling())userPaused=true;
 committedSession={...session,caskSlots:[...caskSlots]};canSave=!preview;runtimeHalted=false;lastSaveError=null;
 distillRoom.reset();scene.resetMotion();marketUI.reset();placementUI?.reset();marketEditing=false;feedbackComments.reset();staffDisplayKey=null;staffDisplay=null;
 automaticNews.reset();staffMigrationNotice=false;shownFillSpiritId=null;modal=null;playbackRate=1;glassKey='';shelfPage=0;
 if(fresh){mapShown=0;mapAnnounced=0;mapPending=0;mapBrowse=null;try{mapUIStorage()?.removeItem(MAP_VIEW_KEY);}catch{}mapNoticeSave();}
 else mapNoticeLoad(true);
 warehouseRoom.select(game.tastingId??game.core.casks[0]?.id??null);room=warehouseRoom.selectedId!==null?'warehouse':'distill';
 // Persist the replay boundary before allowing the bar to make future offers.
 let barMigrationFailed=false;
