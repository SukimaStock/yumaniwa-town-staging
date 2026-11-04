import {buildRecall} from './recall.mjs';
import {createSceneMap} from '../memory-lab/scene.mjs';
import {codeaBottle} from '../codea-object-art.mjs';
import {bottleShape} from '../brand-identity.mjs';
import {monthLabel} from '../model.mjs';
import {NODES} from '../town-connection.mjs';

const $ = id => document.getElementById(id);
const menu = $('menu'), recall = $('recall'), record = $('record'), horizon = $('horizon');
const open = $('open'), close = $('close'), previous = $('previous'), next = $('next');
const picture = $('picture'), evidence = $('evidence');
const drawMap = createSceneMap(picture.querySelector('canvas'));
const locations = new Map(NODES.map(({id,name}) => [id,name]));
let fixtures, connections, firstReceiptId, frames = [], index = 0;

function show() {
  const frame = frames[index];
  const shop = frame.scene.kind === 'shop' ? frame.scene.entity : null;
  const first = frame.kind === 'delivery' && frame.ids.receiptId === firstReceiptId;
  const generation = frame.kind === 'handover' ? frame.ids.toGeneration : frame.generationId;
  drawMap(frame,shop?.id);
  const bottle = frame.scene.bottle;
  $('object').innerHTML = bottle ? codeaBottle(bottleShape({bottle:bottle.shape}),{label:bottle.label}) : '';
  $('date').textContent = monthLabel(frame.month) + (generation == null ? '' : ` · 第${generation}世代`);
  $('place').textContent = shop?.name ?? locations.get(frame.ids.regionId) ?? frame.scene.entity.name;
  $('fact').textContent = ({
    'shop-start':'取引開始',
    delivery:`${first ? '最初の納品' : '納品'}　${frame.ids.count ?? ''}本${bottle?.name ? ` · ${bottle.name}` : ''}`,
    handover:'引き継ぎ',
    arrival:'口コミが届いた',
  })[frame.kind] ?? frame.label;
  $('count').textContent = `${index+1} / ${frames.length}`;
  previous.disabled = index === 0;
  next.disabled = picture.disabled = index === frames.length-1;
  if (document.activeElement === next && next.disabled ||
      document.activeElement === picture && picture.disabled) previous.focus();
  if (document.activeElement === previous && previous.disabled) next.focus();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const animation of $('fact').getAnimations()) animation.cancel();
    $('fact').animate([{opacity:.45},{opacity:1}],{duration:140});
  }
}
function step(amount) {
  const target = index + amount;
  if (target >= 0 && target < frames.length) {
    index = target;
    show();
  }
}
open.addEventListener('click',() => {
  const source = fixtures.find(row => row.id === record.value);
  const {cutoff,frames:story} = buildRecall(source.id,horizon.value,source.analysis,connections[source.id]);
  if (!story.length) {
    $('status').textContent = 'この時点で表示できる記録がありません。';
    return;
  }
  frames = story;
  firstReceiptId = source.analysis.shops.find(shop => shop.id === story.find(frame => frame.kind === "delivery")?.ids.shopId)?.receiptIds[0];
  index = 0;
  $('status').textContent = '';
  $('period').textContent = monthLabel(cutoff.month) + 'の回想';
  menu.hidden = true;
  recall.hidden = false;
  show();
  close.focus();
});
close.addEventListener('click',() => {
  recall.hidden = true;
  menu.hidden = false;
  open.focus();
});
picture.addEventListener('click',() => step(1));
next.addEventListener('click',() => step(1));
previous.addEventListener('click',() => step(-1));
recall.addEventListener('keydown',event => {
  if (event.key === 'Escape') close.click();
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
$('sources').addEventListener('click',() => {
  const frame = frames[index];
  $('details').textContent = [
    frame.label,frame.reason,
    JSON.stringify({id:frame.id,month:frame.month,generationId:frame.generationId,ids:frame.ids,
      evidence:frame.evidence,coverage:frame.coverage,scene:frame.scene},null,2),
  ].join('\n\n');
  evidence.showModal();
});

async function load(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error(path);
  return response.json();
}
Promise.all([load('../history-lab/fixtures.json'),load('../memory-lab/connections.json')])
  .then(([history,related]) => {
    fixtures = history.filter(row => Object.hasOwn(related,row.id));
    connections = related;
    for (const {id,label} of fixtures) record.add(new Option(label,id));
    if (!fixtures.length) throw Error('No matching fixtures');
    open.disabled = record.disabled = false;
    $('status').textContent = '';
  })
  .catch(() => { $('status').textContent = '記録を読み込めませんでした。'; });
