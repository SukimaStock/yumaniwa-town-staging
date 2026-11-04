import {monthLabel} from '../model.mjs';
import {renderScene} from './scene.mjs';

const record = document.querySelector('#record');
const relation = document.querySelector('#relation');
const status = document.querySelector('#status');
const comparison = document.querySelector('#comparison');
const presentation = document.querySelector('#presentation');
const evidence = document.querySelector('#evidence');
const sources = document.querySelector('#sources');
const kindNames = {
  shop:'店', brand:'銘柄', cask:'樽', reputation:'評判', generation:'世代'
};
const certaintyNames = {
  'same-id':'共通のIDで照合',
  'source-linked':'元記録の参照で照合',
  chronological:'時間順の比較'
};
const agencyNames = {manual:'手動', delegated:'委任', automatic:'自動', unknown:'関与不明'};
let data;

function el(tag,text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function showEvidence(connection) {
  const coverage = connection.coverage ?? data[record.value].coverage;
  const title = el('p',certaintyNames[connection.certainty] ?? connection.certainty);
  if (connection.certainty === 'chronological') title.append('。出来事を直接結ぶ参照は確認できません。');
  evidence.replaceChildren(title,el('p',coverage.complete
    ? '今回の記録には開始時点からの操作があります。'
    : '確認できる期間は保存内容に限られます。'));
  const list = el('ul');
  for (const item of [connection.start,...(connection.bridge ?? []),connection.end]) {
    if (!item) continue;
    const operation = item.operationIndex == null ? '' : `・操作 ${item.operationIndex} ${item.operationKey ?? ''}`;
    const generation = item.generationId == null ? '' : `・第${item.generationId}世代`;
    list.append(el('li',`${monthLabel(item.month)}　${item.label}（${agencyNames[item.agency] ?? '関与不明'}${generation}${operation}）`));
  }
  evidence.append(list);
  if (connection.evidence?.length) {
    const references = el('details');
    const endpoints = [connection.start,...connection.bridge,connection.end].map(({kind,ids}) => ({kind,...ids}));
    references.append(el('summary','参照ID'),el('pre',JSON.stringify({endpoints,evidence:connection.evidence},null,2)));
    evidence.append(references);
  }
}

function render() {
  const connection = data[record.value]?.connections.find(item => item.id === relation.value);
  comparison.hidden = !connection;
  status.textContent = connection ? '' : 'この記録には比較できるつながりがありません。';
  if (!connection) return;
  const view = document.querySelector('[name="view"]:checked').value;
  presentation.replaceChildren(el('h2',connection.entity.name));
  if (view === 'a') {
    const stats = el('dl');
    for (const {label,value} of connection.metrics) stats.append(el('dt',label),el('dd',value));
    presentation.append(stats);
  } else if (view === 'b') {
    presentation.append(el('p',connection.summary));
  } else {
    const stage = el('div');
    presentation.append(stage);
    renderScene(stage,connection);
  }
  showEvidence(connection);
}

function populate() {
  relation.replaceChildren(...data[record.value].connections.map(connection => new Option(
    `${kindNames[connection.kind]} · ${connection.title ?? connection.entity.name}`,connection.id
  )));
  relation.disabled = relation.options.length === 0;
  sources.open = false;
  render();
}

record.addEventListener('change',populate);
relation.addEventListener('change',() => { sources.open = false; render(); });
document.querySelector('fieldset').addEventListener('change',render);

const load = async path => {
  const response = await fetch(path);
  if (!response.ok) throw Error(path);
  return response.json();
};
Promise.all([load('../history-lab/fixtures.json'),load('./connections.json')])
  .then(([fixtures,connections]) => {
    data = connections;
    for (const {id,label} of fixtures) if (Object.hasOwn(data,id)) record.add(new Option(label,id));
    if (!record.options.length) throw Error('No matching fixtures');
    record.disabled = false;
    populate();
  })
  .catch(() => { status.textContent = '比較記録を読み込めませんでした。'; });
