import {buildChronicle} from './editor.mjs';
import {createSceneMap} from '../memory-lab/scene.mjs';
import {codeaBottle,codeaCask} from '../codea-object-art.mjs';
import {bottleShape} from '../brand-identity.mjs';
import {monthLabel} from '../model.mjs';

const $ = id => document.getElementById(id);
const menu = $('menu'), recall = $('recall'), record = $('record'), horizon = $('horizon');
const mode = $('mode'), jump = $('jump');
const open = $('open'), close = $('close'), previous = $('previous'), next = $('next');
const picture = $('picture'), evidence = $('evidence');
const drawMap = createSceneMap(picture.querySelector('canvas'));
let records, frames = [], index = 0;
const decade = month => Math.floor(month/120);
const calendarRange = (start,end) => monthLabel(start)+(end === start ? '' : '〜'+monthLabel(end));
const countLabel = {
  delivery:'納品', bottling:'瓶詰め', fill:'樽詰め', distillation:'蒸留', sale:'販売',
};

function show() {
  const frame = frames[index], event = frame.events[0];
  const scene = frame.scene ?? event.scene;
  const shop = scene?.kind === 'shop' ? scene.entity : null;
  const generation = event.kind === 'handover' ? event.ids.toGeneration : event.generationId;
  drawMap(event,shop?.id);
  const bottle = scene?.bottle;
  const cask = scene?.caskType;
  $('object').innerHTML = bottle ? codeaBottle(bottleShape({bottle:bottle.shape}),{label:bottle.label}) :
    cask ? codeaCask(cask) : '';
  $('date').textContent = calendarRange(frame.startMonth,frame.endMonth)+(generation == null ? '' : ` · 第${generation}世代`);
  $('place').textContent = event.kind === 'handover' ? '蒸留所' : scene?.entity?.name ?? '蒸留所';
  const counts = new Map();
  for (const item of frame.events) {
    const label = countLabel[item.kind] ?? item.kind;
    counts.set(label,(counts.get(label) ?? 0)+1);
  }
  $('fact').textContent = frame.type === 'passage' ?
    [...counts].map(([label,count]) => `${label}${count}回`).join(' · ') : event.label;
  $('count').textContent = `${index+1} / ${frames.length}`;
  jump.value = decade(frame.startMonth);
  const active = document.activeElement;
  previous.disabled = index === 0;
  next.disabled = picture.disabled = index === frames.length-1;
  if ((active === next || active === picture) && next.disabled) (previous.disabled ? close : previous).focus();
  if (active === previous && previous.disabled) next.focus();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const animation of $('fact').getAnimations()) animation.cancel();
    $('fact').animate([{opacity:.5},{opacity:1}],{duration:frame.type === 'passage' ? 90 : 180});
  }
}
function step(amount) {
  const target = index+amount;
  if (target >= 0 && target < frames.length) { index = target; show(); }
}
open.addEventListener('click',() => {
  const {cutoff,frames:story} = buildChronicle(records[record.value],horizon.value,mode.value);
  if (!story.length) {
    $('status').textContent = 'この時点で表示できる記録がありません。';
    return;
  }
  frames = story;
  index = 0;
  const chapters = [...new Set(story.map(frame => decade(frame.startMonth)))];
  jump.replaceChildren(...chapters.map(number => new Option(
    number === 0 ? '創業から' : `${number*10}年経過から`,number
  )));
  jump.hidden = chapters.length < 2;
  $('status').textContent = '';
  $('period').textContent = monthLabel(cutoff.month)+'の回想';
  menu.hidden = true;
  recall.hidden = false;
  show();
  close.focus();
});
close.addEventListener('click',() => { recall.hidden = true; menu.hidden = false; open.focus(); });
jump.addEventListener('change',() => {
  index = frames.findIndex(frame => decade(frame.startMonth) === Number(jump.value));
  show();
});
picture.addEventListener('click',() => step(1));
next.addEventListener('click',() => step(1));
previous.addEventListener('click',() => step(-1));
recall.addEventListener('keydown',event => {
  if (event.key === 'Escape') close.click();
  if (event.target !== jump && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
$('sources').addEventListener('click',() => {
  const frame = frames[index];
  $('details').textContent = frame.reason+(frame.returnOf ? '（前の場面 '+frame.returnOf+'）' : '')+'\n\n'+frame.events.map(event =>
    monthLabel(event.month)+'　'+event.label+'\n'+JSON.stringify({
      id:event.id,operationIndex:event.operationIndex,ordinal:event.ordinal,ids:event.ids,evidence:event.evidence,coverage:records[record.value].coverage,
    },null,2)).join('\n\n');
  evidence.showModal();
});

const labels = {local:'地元密着型',wide:'広域展開型',mixed:'混合型'};
fetch('./facts.json').then(response => {
  if (!response.ok) throw Error('履歴の読み込み');
  return response.json();
}).then(data => {
  records = data;
  for (const id of Object.keys(labels)) if (Object.hasOwn(data,id)) record.add(new Option(labels[id],id));
  if (!record.options.length) throw Error('履歴なし');
  record.disabled = open.disabled = false;
  $('status').textContent = '';
}).catch(() => { $('status').textContent = '記録を読み込めませんでした。'; });
