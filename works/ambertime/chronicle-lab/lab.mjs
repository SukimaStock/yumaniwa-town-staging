import {withReputationCandidates} from './facts-d.mjs';
import {firstDeliveryIds,recallSentence} from './caption.mjs';
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
let records, recordsD, deliveryFirsts, frames = [], index = 0;
const editions = new Map();

function currentEdition(method) {
  const key = [record.value,horizon.value,method].join('/');
  if (!editions.has(key)) editions.set(key,buildChronicle((method === 'd' ? recordsD : records)[record.value],horizon.value,method));
  return editions.get(key);
}

function textNode(tag,text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
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
  const sentence = mode.value === 'd' && frame.type !== 'passage';
  $('date').hidden = $('place').hidden = sentence;
  $('place').textContent = (event.kind === 'handover' ? '蒸留所' : scene?.entity?.name ?? '蒸留所');
  const counts = new Map();
  for (const item of frame.events) {
    const label = countLabel[item.kind] ?? item.kind;
    counts.set(label,(counts.get(label) ?? 0)+1);
  }
  $('fact').textContent = frame.type === 'passage' ?
    [...counts].map(([label,count]) => `${label}${count}回`).join(' · ') : sentence ? recallSentence(event,deliveryFirsts) : event.label;
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
  const {cutoff,frames:story} = currentEdition(mode.value);
  if (!story.length) {
    $('status').textContent = 'この時点で表示できる記録がありません。';
    return;
  }
  frames = story;
  deliveryFirsts = mode.value === 'd' ? firstDeliveryIds(records[record.value]) : null;
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
      id:event.id,operationIndex:event.operationIndex,ordinal:event.ordinal,replayOrdinal:event.replayOrdinal,ids:event.ids,evidence:event.evidence,coverage:records[record.value].coverage,
    },null,2)).join('\n\n');
  evidence.showModal();
});

$('compare').addEventListener('click',() => {
  const comparison = $('comparison');
  const rows = ['a','b','c','d'].map(method => {
    const {frames} = currentEdition(method);
    const passages = frames.filter(frame => frame.type === 'passage').length;
    const row = document.createElement('tr');
    const name = textNode('th',method.toUpperCase());
    name.scope = 'row';
    row.append(name,...[frames.length-passages,passages,frames.length].map(count => textNode('td',count)));
    return row;
  });
  $('comparison-counts').replaceChildren(...rows);
  const {frames,omitted,audit} = currentEdition('d');
  $('selected-events').replaceChildren(...frames.map(frame => textNode('li',
    `${monthLabel(frame.startMonth)} ${frame.events[0].label} ${frame.reason}`)));
  const events = new Map(recordsD[record.value].events.map(event => [event.id,event]));
  const pastOmissions = omitted.filter(item => item.reason !== '回想時点より後');
  $('omitted-events').replaceChildren(...pastOmissions.map(({id,reason}) => {
    const event = events.get(id);
    return textNode('li',`${event ? monthLabel(event.month)+' '+event.label : id} ${reason}`);
  }));
  if (pastOmissions.length < omitted.length) $('omitted-events').append(
    textNode('li',`回想時点より後のため対象外　${omitted.length-pastOmissions.length}件`));
  $('edition-audit').textContent = JSON.stringify({
    ...audit,旧資料の省略集計_30年全体:records[record.value].omitted,追加候補数:recordsD[record.value].events.length-records[record.value].events.length,
  },null,2);
  for (const details of comparison.querySelectorAll('details')) details.open = false;
  comparison.showModal();
});

const labels = {local:'地元密着型',wide:'広域展開型',mixed:'混合型'};
async function loadFacts(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error('履歴の読み込み');
  return response.json();
}
Promise.all([loadFacts('./facts.json'),loadFacts('./facts-d.json').catch(() => null)]).then(([data,extra]) => {
  if (extra) {
    try {
      recordsD = Object.fromEntries(Object.entries(data).map(([id,item]) => [id,withReputationCandidates(item,extra[id])]));
    } catch {
      recordsD = null;
    }
  }
  if (!recordsD) {
    mode.querySelector('option[value=d]').disabled = true;
    mode.value = 'c';
  }
  records = data;
  for (const id of Object.keys(labels)) if (Object.hasOwn(data,id)) record.add(new Option(labels[id],id));
  if (!record.options.length) throw Error('履歴なし');
  record.disabled = open.disabled = false;
  $('compare').disabled = !recordsD;
  $('status').textContent = recordsD ? '' : 'D案の追加資料を読み込めませんでした。';
}).catch(() => { $('status').textContent = '記録を読み込めませんでした。'; });
