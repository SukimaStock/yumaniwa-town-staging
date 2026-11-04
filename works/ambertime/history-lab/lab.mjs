import {monthLabel} from '../model.mjs';

const scenario = document.querySelector('#scenario');
const file = document.querySelector('#file');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const number = value => new Intl.NumberFormat('ja-JP').format(value);
let worker, examples;

function element(tag,text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function show(analysis,description) {
  const {coverage,elapsedMonths,totals,shops,brands,regions,timeline,aging,generations,annualSales} = analysis;
  document.querySelector('#description').textContent = description;
  status.textContent = coverage.complete ? '' : `${monthLabel(coverage.fromMonth)}以前は保存に残る記録だけを表示します。`;
  const entries = [
    ['経過',`${Math.floor(elapsedMonths/12)}年${elapsedMonths%12 ? elapsedMonths%12+'か月' : ''}`],
    ['世代',generations.length ? `${generations.length}世代` : '記録なし'],
    [coverage.complete ? '瓶詰め' : '確認できる瓶詰め',number(totals.bottledRecorded)+'本'],
    ['実売',number(totals.sold)+'本'],
    ['銘柄',brands.map(row => row.name).join('、') || '記録なし'],
    ['取引先',shops.map(row => row.name).join('、') || '店舗記録なし'],
    ['口コミの到達',regions.map(row => `${row.level} ${row.placeIds.length}か所`).join('、') || '記録なし'],
  ];
  document.querySelector('#overview').replaceChildren(...entries.flatMap(([key,value]) => [element('dt',key),element('dd',value)]));
  const timelineNode = document.querySelector('#timeline');
  timelineNode.replaceChildren(...timeline.map(event => {
    const row = element('li','');
    row.append(element('time',monthLabel(event.month)),element('p',event.fact));
    if (event.interpretation) row.append(element('small',event.interpretation.text));
    return row;
  }));
  if (!timeline.length) timelineNode.append(element('li','表示できる出来事はまだありません。'));
  const features = document.querySelector('#features');
  features.replaceChildren(...shops.map(shop => {
    const row = element('p',`${shop.name}へ${number(shop.bottles)}本納品` +
      (shop.firstMonth === null ? '。' : `（${monthLabel(shop.firstMonth)}〜${monthLabel(shop.lastMonth)}）。`));
    if (shop.generationIds.length > 1) row.append(` ${shop.generationIds.length}世代で納品を確認。`);
    if (shop.gaps.length) row.append(` 納品記録のない最長期間は${Math.max(...shop.gaps.map(gap=>gap.months))}か月。`);
    return row;
  }));
  if (aging.matureBottles || aging.shortBottles) features.append(element('p',
    `1年以下の熟成で瓶詰めしたのは${number(aging.shortBottles)}本。3年以上は${number(aging.matureBottles)}本。`));
  if (coverage.townFromMonth > 0) features.append(element('p',`口コミの観測は${monthLabel(coverage.townFromMonth)}から。`));
  if (annualSales.length) {
    const details = element('details','');
    details.append(element('summary','年ごとの実売'));
    for (const {year,sold} of annualSales) details.append(element('div',`${year}年目　${number(sold)}本`));
    features.append(details);
  }
  result.hidden = false;
}
function selectExample() {
  worker?.terminate();
  worker = null;
  if (scenario.value !== 'file') scenario.querySelector('[value="file"]')?.remove();
  const selected = examples?.find(example => example.id === scenario.value);
  if (selected) show(selected.analysis,selected.description);
}
scenario.addEventListener('change',selectExample);
file.addEventListener('change',() => {
  const selected = file.files[0];
  if (!selected) return;
  file.value = '';
  worker?.terminate();
  worker = null;
  if (selected.size >= 24_100_000) {
    status.textContent = '保存ファイルが大きすぎます。';
    return;
  }
  if (!scenario.querySelector('[value="file"]')) scenario.add(new Option('読み込んだ保存','file'));
  scenario.disabled = false;
  scenario.value = 'file';
  result.hidden = true;
  status.textContent = '保存記録を再生しています。別の記録に切り替えられます。';
  worker = new Worker('./worker.mjs',{type:'module'});
  const finish = ({analysis}) => {
    worker.terminate();
    worker = null;
    if (analysis) show(analysis,'保存ファイルの分析');
    else status.textContent = 'この保存を読み取れませんでした。';
  };
  worker.onmessage = ({data}) => finish(data);
  worker.onerror = () => finish({});
  worker.postMessage(selected);
});

fetch('./fixtures.json').then(response => {
  if (!response.ok) throw Error();
  return response.json();
}).then(data => {
  examples = data;
  for (const example of examples) scenario.add(new Option(example.label,example.id));
  scenario.disabled = false;
  if (!scenario.value || scenario.value !== 'file') selectExample();
}).catch(() => { if (!worker) status.textContent = '比較記録を読み込めませんでした。'; });
