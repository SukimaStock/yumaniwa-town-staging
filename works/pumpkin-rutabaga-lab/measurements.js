/* Removable lab instrumentation. No persistence, score or physical feedback. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FruitLabTiming=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  function begin(mode,now,resets,settings){return {mode,resets,lastClock:now,elapsedSeconds:0,simulationSeconds:0,handoffs:0,sections:[{phase:'surface',seconds:0}],complete:false,tuningChanged:false,parametersAtStart:clone(settings)};}
  function tick(t,now,s,playing=true){
    const elapsed=Math.max(0,(now-t.lastClock)/1000);t.lastClock=now;
    if(!playing||t.complete)return false;
    t.elapsedSeconds+=elapsed;t.sections.at(-1).seconds+=elapsed;
    if(t.sections.at(-1).phase!==s.phase)t.sections.push({phase:s.phase,seconds:0});
    t.simulationSeconds=s.time;t.handoffs=s.handoffs;
    if(s.finished){t.complete=true;return true;}return false;
  }
  function checkpoint(t,now){if(t)t.lastClock=now;}
  function snapshot(t){if(!t)return null;const result=clone(t);delete result.lastClock;return result;}
  function text(current,history,resetCounts){
    const labels={surface:'地上①',underground:'地下①',return:'地上②',underground2:'地下②',finish:'地上フィニッシュ'};
    const rows=['プレイ時間（調整・離脱中は除外）'];
    if(current){rows.push(`${current.mode.toUpperCase()} · ${current.complete?'ひと区切り':'プレイ中'}`,`${current.elapsedSeconds.toFixed(2)} 秒 · 交代 ${current.handoffs} 回 · RESET ${resetCounts[current.mode]||0} 回`);
      for(const section of current.sections)rows.push(`${labels[section.phase]||section.phase}: ${section.seconds.toFixed(2)} 秒`);
      if(current.tuningChanged)rows.push('この試行は途中で調整あり');
    }else rows.push('WORLD LOOP系列を選ぶと計測を開始します。');
    if(history.length){rows.push('\n直近の完走');for(const t of history.slice(-6))rows.push(`${t.mode.toUpperCase()}: ${t.elapsedSeconds.toFixed(2)} 秒 / 交代 ${t.handoffs} / RESET ${t.resets}${t.tuningChanged?' / 調整あり':''}`);}
    return rows.join('\n');
  }
  return {begin,tick,checkpoint,snapshot,text};
});
