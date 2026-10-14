'use strict';
// Presentation only. Work identity, path, state and archives remain in lifecycle.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ROOM_FILE = 'data/lab-rooms.json';
const STATUS_LABELS = Object.freeze({ active: '稼働中', frozen: '保管中', candidate: '公開候補', released: '公開作品' });
const ROOM_IDS = ['motion', 'touch', 'pumpoko', 'observation', 'bench', 'archive', 'garage'];
const ARCHIVE_LABELS = {
  'What we explored': '探索したこと', 'Initial hypothesis': '最初の仮説',
  'What we tried': '試したこと', 'What we learned': '分かったこと',
  'Why we stopped': '研究を終えた理由', 'What still feels interesting': '今も面白いと感じること',
  'Related prototypes': '関連する試作', 'Playable staging URL': '試作のURL'
};

function readRooms(root, works, raw = JSON.parse(fs.readFileSync(path.join(root, ROOM_FILE), 'utf8'))) {
  if (raw.schema !== 'sukimastock-lab-rooms/1' || !Array.isArray(raw.rooms) || raw.rooms.length !== ROOM_IDS.length || !Array.isArray(raw.omit)) throw new Error('LAB: invalid room placement');
  const ids = new Set(), assigned = new Set(), tools = new Set();
  const byId = new Map(works.map(work => [work.id, work]));
  const nonempty = v => typeof v === 'string' && !!v.trim();
  const rooms = raw.rooms.map(room => {
    if (!ROOM_IDS.includes(room.id) || ids.has(room.id) || !/^0[1-7]$/.test(room.number) || !nonempty(room.title) || !nonempty(room.subtitle) || !nonempty(room.description) || !Array.isArray(room.machines)) throw new Error('LAB: invalid or duplicate room');
    ids.add(room.id);
    if ('status' in room) throw new Error('LAB: lifecycle status cannot be stored in placement');
    const machines = room.machines.map(item => {
      if ('status' in item || 'path' in item) throw new Error('LAB: lifecycle status/path cannot be stored in placement');
      if (item.work) {
        const work = byId.get(item.work);
        if (!work || assigned.has(work.id) || raw.omit.includes(work.id)) throw new Error('LAB: missing or duplicate work ' + item.work);
        if (work.status === 'frozen') throw new Error('LAB: frozen works belong in Archive');
        if (item.href || item.environment) throw new Error('LAB: work URL/environment must come from its entrypoint');
        const playable = fs.existsSync(path.join(root, work.path, 'index.html'));
        if (!playable && (!item.entryOptional || work.status !== 'active')) throw new Error('LAB: Web entry missing: ' + work.id);
        if (playable) assertEntry(root, work.path + '/');
        assigned.add(work.id);
        return { ...item, work, title: item.title || work.title, href: playable ? work.path + '/' : null, status: work.status, entryNote: playable ? null : 'Webの筐体は準備中' };
      }
      if (room.id !== 'garage' || !nonempty(item.title) || tools.has(item.title) || (!!item.href === !!item.environment)) throw new Error('LAB: invalid or duplicate tool');
      if (item.href) assertEntry(root, item.href);
      else if (!nonempty(item.environment)) throw new Error('LAB: external tool requires its environment');
      tools.add(item.title);
      return { ...item };
    });
    return { ...room, machines };
  });
  for (const id of raw.omit) {
    if (!byId.has(id) || assigned.has(id)) throw new Error('LAB: invalid omitted work ' + id);
  }
  if (new Set(raw.omit).size !== raw.omit.length) throw new Error('LAB: duplicate omission');
  const archive = rooms.find(room => room.id === 'archive'), bench = rooms.find(room => room.id === 'bench');
  for (const work of works) {
    if (work.status === 'frozen') {
      assertEntry(root, work.path + '/');
      archive.machines.push({ work, title: work.title, href: work.path + '/', status: work.status });
    } else if (!assigned.has(work.id) && !raw.omit.includes(work.id) && ['active', 'candidate'].includes(work.status) && fs.existsSync(path.join(root, work.path, 'index.html'))) {
      // New unassigned playable experiments stay visible, without making them releases.
      bench.machines.push({ work, title: work.title, href: work.path + '/', status: work.status, stored: false, note: work.theme });
    }
  }
  return rooms;
}

function assertEntry(root, href) {
  // Only checked repository-local Web entrypoints. No invented external URLs.
  if (href === '?dev=1') {
    if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('LAB: town editor entry missing');
    return;
  }
  if (!/^(works\/(?:_[a-z0-9-]+|[a-z0-9][a-z0-9-]*)|tools\/[a-z0-9][a-z0-9-]*)\/$/.test(href) || !fs.existsSync(path.join(root, href, 'index.html'))) throw new Error('LAB: Web entry missing or unsafe: ' + href);
}

const SCENES = {
  motion: `<g class="bench-furniture"><path d="M34 101h157v8H34z" fill="#b09b78"/><path d="M44 109v28m137-28v28" stroke="#737d70" stroke-width="6"/><rect x="51" y="58" width="124" height="43" rx="4" fill="#516660" stroke="#a5b8a0" stroke-width="2"/></g>
    <g class="slime"><path d="M65 87c-4-15 13-30 33-16 19 11 22-15 39-9 21 7 20 33 5 34H77q-10 0-12-9" fill="#a9c997"/><path d="M76 79q13-10 21-2" stroke="#d2e1b6" stroke-width="3" fill="none"/></g>
    <ellipse cx="234" cy="126" rx="36" ry="9" fill="#536c74"/><g class="ripple"><ellipse cx="234" cy="124" rx="17" ry="5" fill="none" stroke="#b0cbc5"/></g><circle cx="234" cy="120" r="5" fill="#e1d7aa"/>
    <g class="fireflies" fill="#e7dda5"><circle cx="194" cy="60" r="2.5"/><circle cx="204" cy="80" r="2"/><circle cx="213" cy="50" r="2"/><circle cx="183" cy="74" r="1.8"/></g>`,
  touch: `<path d="M96 128h99l-11 10h-79z" fill="#344e50"/><path d="M117 106h54v25h-54z" fill="#899897"/><path d="M117 106l27-7 27 7-27 8z" fill="#b9bbaa"/>
    <g class="polyhedron" stroke="#bfd1bd" stroke-width="1.3" stroke-linejoin="round"><path d="M142 46l34 23-6 28-28 12-27-16-7-25z" fill="#7ba8a4"/><path d="M142 46l5 32 29-9z" fill="#c2d4bc"/><path d="M108 68l39 10-5 31-27-16z" fill="#8ebdb2"/><path d="M147 78l29-9-6 28-28 12z" fill="#5e898b"/></g>
    <path d="M196 90h49v24h-49z" fill="#6f7975"/><path d="M201 96h27v10h-27z" fill="#344c4d"/><circle class="indicator" cx="236" cy="102" r="2.5" fill="#d5c78c"/><path d="M200 114v18h-10" stroke="#53645c" fill="none" stroke-width="2"/>`,
  pumpoko: `<path d="M14 126V82q34 0 56 17t55 9q24-3 45-26t61-11q23 9 37 20t46 7q25-3 45-11t43 7q30 19 66 0t118-10v52z" fill="#9d9674" stroke="#ccc39e" stroke-width="3"/><path d="M14 128h570v14H14z" fill="#746f58"/>
    <g class="soil-stones" fill="#b4ac85"><ellipse cx="74" cy="125" rx="6" ry="3"/><ellipse cx="283" cy="120" rx="7" ry="3"/><ellipse cx="403" cy="132" rx="5" ry="2"/><ellipse cx="494" cy="116" rx="7" ry="3"/></g>
    <g class="pumpkin"><path d="M183 54q-3-11 7-12" fill="none" stroke="#95ae78" stroke-width="4"/><ellipse cx="184" cy="65" rx="20" ry="17" fill="#c88a56"/><ellipse cx="178" cy="65" rx="10" ry="17" fill="#db9a62"/><ellipse cx="187" cy="65" rx="8" ry="17" fill="#e6ac71"/><path d="M177 52q-5 13 0 26m12-26q5 13 0 27" fill="none" stroke="#b9794e" stroke-width="1.2"/></g>
    <path d="M439 91q0 14-19 18t-17 12h72q-5-16-27-17l-4-14" fill="#435d55"/>
    <g class="rutabaga"><path d="M445 104q-8-8-11-5m11 5q6-8 13-6" stroke="#9ab577" stroke-width="3" fill="none"/><path d="M432 111q13-12 26 0 2 12-13 17-15-5-13-17" fill="#c5baa3"/><path d="M432 112q13-12 26 0" fill="#91828d"/><path d="M445 128l-2 5" stroke="#b9b298" stroke-width="2"/></g>
    <path d="M60 45h61v6H60m31 0v35" stroke="#647264" stroke-width="2" fill="none"/><path d="M64 52h24v18H64z" fill="#b7b299"/><path d="M68 57h16m-16 5h12" stroke="#627365"/><path d="M512 34h42v26h-42z" fill="#7e8d79"/><path d="M518 53l8-8 8 4 13-10" fill="none" stroke="#d7d0a5" stroke-width="2"/>`,
  observation: `<path d="M54 113h188v8H54m12 8v17m165-17v17" stroke="#938f71" stroke-width="4" fill="none"/>
    <path d="M104 49h68v52q0 12-34 12t-34-12z" fill="#9cbfb7" fill-opacity=".13" stroke="#b6c8be" stroke-width="2"/><path d="M106 73h64v27q0 11-32 11t-32-11z" fill="#719b9c" fill-opacity=".55"/><ellipse class="water-surface" cx="138" cy="73" rx="32" ry="4" fill="#a8c5bf" fill-opacity=".5"/>
    <g class="tea-leaf" stroke="#a2b67f" stroke-width="2" fill="#819f71"><path d="M138 97q-22-2-13-13 14-1 13 13m0 0q19-2 15-16-15 2-15 16m0 0q-9-16 0-21 9 10 0 21"/><path d="M138 99v-15"/></g>
    <path d="M191 96q17-9 20 3v13h-23V99z" fill="#aca387"/><path d="M211 98q13 0 5 11h-5" fill="none" stroke="#aca387" stroke-width="3"/><rect x="69" y="89" width="18" height="22" rx="2" fill="#778b6b"/>`,
  bench: `<path d="M29 108h244v10H29z" fill="#b39e7e"/><path d="M39 118v22m223-22v22" stroke="#738577" stroke-width="5"/>
    <rect x="42" y="83" width="41" height="23" rx="3" fill="#838f79"/><ellipse class="small-button" cx="62" cy="84" rx="11" ry="6" fill="#c28d6e"/><path d="M85 101q15 3 21 5" stroke="#596a60" stroke-width="2" fill="none"/>
    <rect x="110" y="54" width="39" height="52" rx="4" fill="#4c615d" stroke="#9caa92" stroke-width="2"/><rect x="116" y="65" width="27" height="29" rx="2" fill="#85948b"/><circle class="badge-dot" cx="144" cy="57" r="7" fill="#c68d73"/>
    <rect x="168" y="83" width="26" height="24" rx="3" fill="#9eab97"/><path d="M174 92h14m-14 6h9" stroke="#4b6560" stroke-width="2"/>
    <circle cx="229" cy="86" r="19" fill="#bfc2ab" stroke="#798c80" stroke-width="3"/><g class="clock-hand"><path d="M229 86V74m0 12h9" stroke="#52695f" stroke-width="2" fill="none"/></g>
    <path d="M179 31h55v4h-55m5 0v12m39-12v12" stroke="#7f9482" stroke-width="2"/>`,
  archive: `<path d="M33 53h230M33 92h230M33 129h230M37 40v103m222-103v103" stroke="#949785" stroke-width="5"/>
    <path d="M49 32h45v18H49z" fill="#718982"/><path d="M56 35l8 8 11-9 11 10" fill="none" stroke="#b5bba5"/><rect x="115" y="29" width="33" height="21" rx="2" fill="#958b77"/><path d="M165 29h64v21h-64z" fill="#7d8e84"/><path d="M174 35h30m-30 7h44" stroke="#b1b29b"/>
    <rect x="51" y="64" width="75" height="25" rx="2" fill="#a19b85"/><rect x="61" y="69" width="29" height="11" fill="#c7c1a7"/><path d="M104 72h12" stroke="#576b61" stroke-width="2"/>
    <path d="M145 66h38v23h-38z" fill="#778b85"/><path d="M154 70h17v13h-17z" fill="#bbc4b1"/><path d="M212 64h30v24h-30z" fill="#9b9580"/>
    <path d="M50 105h45v20H50m59-20h20v20h-20m28-20h45v20h-45m70-20h24v20h-24" fill="#778b81" stroke="#a9ac97"/><path d="M165 116q12-18 22-3t27 3" fill="none" stroke="#bca988" stroke-width="2"/>`,
  garage: `<path d="M38 32h106v54H38z" fill="#717f70"/><g stroke="#b8b9a1" stroke-width="4" fill="none"><path d="M54 41v26m-6-26q6 10 12 0m-6 26v9m27-35v34m-6-34h12m18 3v26m-7 0h14m12-26l-7 7 7 8 7-8z"/></g>
    <path d="M31 108h238v9H31m12 0v23m213-23v23" fill="#a6a184" stroke="#818b77" stroke-width="4"/>
    <rect x="52" y="90" width="50" height="17" rx="2" fill="#7b9084"/><path d="M59 95h21v7H59z" fill="#b3c7b4"/><circle cx="91" cy="99" r="3" fill="#c2b78a"/>
    <rect x="159" y="64" width="70" height="42" rx="5" fill="#a9af95"/><rect x="166" y="70" width="51" height="29" rx="2" fill="#45605c"/><path d="M171 93l10-15 13 10 15-12" stroke="#c0cba8" stroke-width="2" fill="none"/><path d="M230 106q17 4 15 19" stroke="#596c60" stroke-width="2" fill="none"/>
    <rect x="116" y="92" width="29" height="14" fill="#c1b68b"/><path d="M122 89h17" stroke="#82947c" stroke-width="2"/>`
};

function scene(id, suffix) {
  const wide = id === 'pumpoko', width = wide ? 600 : 300, end = width - 16;
  return `<svg class="room-scene scene-${id}" viewBox="0 0 ${width} 160" aria-hidden="true" focusable="false">
    <defs><linearGradient id="light-${id}-${suffix}" x2="0" y2="1"><stop stop-color="#d4c6a2" stop-opacity=".15"/><stop offset="1" stop-color="#d4c6a2" stop-opacity="0"/></linearGradient></defs>
    <path d="M14 18h${width - 44}l14 14v110H14z" fill="var(--scene-back)"/><path d="M${end - 14} 18l14 14v110h-14z" fill="#243e3b" opacity=".5"/>
    <path d="M14 142h${width - 30}l10 14H27z" fill="var(--scene-floor)"/><path d="M14 142h${width - 30}" stroke="#94a088" stroke-opacity=".35"/>
    <path d="M${width / 2} 18v12" stroke="#788f7e" stroke-width="2"/><path d="M${width / 2 - 10} 35l4-7h12l4 7z" fill="#bcc09e"/><path d="M${width / 2 - 8} 35l-61 105h138l-61-105z" fill="url(#light-${id}-${suffix})"/>
    ${SCENES[id]}
  </svg>`;
}

function renderLab(root, registry, { listWorks, archiveSections, esc }) {
  const works = listWorks(root, registry), rooms = readRooms(root, works);
  const version = file => createHash('sha256').update(fs.readFileSync(path.join(root, 'lab', file))).digest('hex').slice(0, 12);
  function state(machine) {
    return machine.status && machine.status !== 'active' ? `<span class="state state-${machine.status}" data-status="${machine.status}">${STATUS_LABELS[machine.status]}</span>` : '';
  }
  function machineHTML(machine) {
    const workId = machine.work ? ` data-work-id="${esc(machine.work.id)}"` : '';
    return `<li class="machine${machine.role === 'result' ? ' research-result' : ''}"${workId}>
      ${machine.role === 'result' ? '<p class="result-label">この部屋から生まれた作品</p>' : ''}
      <div class="machine-heading"><h3>${esc(machine.title)}</h3>${state(machine)}</div>
      ${machine.note ? `<p>${esc(machine.note)}</p>` : ''}
      ${machine.href ? `<a class="machine-link" href="../${esc(machine.href)}">${machine.role === 'result' ? '作品に触れる' : '触れてみる'}<span aria-hidden="true"> ↗</span><span class="sr-only">：${esc(machine.title)}</span></a>` : `<p class="environment">${esc(machine.entryNote || machine.environment)}</p>`}
    </li>`;
  }
  function archiveHTML(machine) {
    const work = machine.work, sections = archiveSections(root, work);
    const related = works.filter(other => other.family && other.family === work.family && other.id !== work.id && other.status === 'frozen');
    return `<article class="archive-machine" id="${work.id}" data-work-id="${work.id}">
      <p class="family">${esc(work.family || 'EXPERIMENT')}</p><div class="machine-heading"><h3>${esc(work.title)}</h3>${state(machine)}</div>
      <p>${esc(work.theme)}</p><div class="actions"><a class="machine-link" href="../${work.path}/">試作に触れる</a><a class="archive-link" href="../${work.archive}">制作記録</a></div>
      <details class="record"><summary>探索の記録</summary>${sections.map(section => `<h4>${ARCHIVE_LABELS[section.heading]}</h4><p class="archive-text">${esc(section.content)}</p>`).join('')}
      ${related.length ? `<nav class="related" aria-label="関連する保管試作">${related.map(other => `<a href="#${other.id}">${esc(other.title)}</a>`).join('')}</nav>` : ''}</details>
    </article>`;
  }
  const panels = rooms.map(room => {
    const front = room.machines.filter(machine => !machine.stored), stored = room.machines.filter(machine => machine.stored);
    return `<section class="room-panel" id="room-${room.id}" data-room="${room.id}" aria-labelledby="title-${room.id}">
      <a class="back-to-building" href="#building">← 研究所全体へ</a>
      <p class="eyebrow">ROOM ${room.number}${room.trait ? ` · ${esc(room.trait)}` : ''}</p><h2 id="title-${room.id}" tabindex="-1">${esc(room.title)}</h2>
      <p class="room-subtitle">${esc(room.subtitle)}</p><div class="room-closeup">${scene(room.id, 'closeup')}</div><p class="room-description">${esc(room.description)}</p>
      ${room.id === 'archive' ? front.map(archiveHTML).join('\n') : `<ul class="machines">${front.map(machineHTML).join('\n')}</ul>`}
      ${stored.length ? `<details class="back-shelf"><summary>${room.id === 'pumpoko' ? '最初の機械' : room.id === 'garage' ? '検査器と制作雛形' : '作業台の奥も見る'}</summary><ul class="machines">${stored.map(machineHTML).join('\n')}</ul></details>` : ''}
      <p class="return-note">装置からは、ブラウザの「戻る」でこの部屋へ。</p>
      <a class="back-to-building bottom-back" href="#building">← 研究所全体へ</a>
    </section>`;
  }).join('\n');
  const order = ['motion', 'touch', 'observation', 'bench', 'pumpoko', 'garage', 'archive'];
  const model = order.map(id => {
    const room = rooms.find(item => item.id === id);
    return `<a class="room room-${room.id}" href="#room-${room.id}" data-room-link="${room.id}" aria-controls="room-${room.id}">
      <span class="room-number">${room.number}</span>${scene(room.id, 'model')}<span class="room-sign"><strong>${esc(room.title)}</strong><span>${esc(room.subtitle)}</span></span><span class="door-light" aria-hidden="true"></span>
    </a>`;
  }).join('\n');
  return `<!doctype html>
<!-- Generated by tools/work-lifecycle.cjs --write-lab. Sources: data/work-lifecycle.json, data/lab-rooms.json and each ARCHIVE.md. -->
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#263c38"><title>SukimaStock LAB</title><link rel="stylesheet" href="./lab.css?v=${version('lab.css')}"><link rel="stylesheet" href="./lab-finish.css?v=1"><script src="./lab.js?v=${version('lab.js')}" defer></script></head>
<body><a class="skip-link" href="#building">研究所へ</a><header class="lab-header"><a href="../?dev=1">← 湯間庭町へ</a><span class="header-sign">SukimaStock <b>LAB</b></span></header>
<main class="lab-layout">
  <section class="hall" id="hall" aria-labelledby="lab-title"><p class="eyebrow">入口ホール</p><h1 id="lab-title">SukimaStock LAB</h1>
    <p class="entrance-lines">制作中のものを置いている場所です。</p>
    <p>動きの実験、作りかけのゲーム、制作道具などを部屋ごとにまとめました。途中で止めた試作も残しています。</p><p>建物の部屋を選んで、中をのぞいてみてください。</p>
    <div class="hall-object" aria-hidden="true"><span></span><i></i><i></i></div>
  </section>
  <section class="model" id="building" aria-label="研究所の断面模型" tabindex="-1"><div class="roof" aria-hidden="true"><span class="chimney"></span><span class="roof-sign">SUKIMASTOCK LAB</span><span class="roof-plant"></span></div>
    <nav class="building" aria-label="7つの研究室">${model}</nav><div class="foundation" aria-hidden="true"><span>SukimaStock</span><i></i></div>
    <p class="map-note">部屋を選んでください</p>
  </section>
  <div class="room-notes">${panels}</div>
</main><footer class="lab-footer"><span>SukimaStock LAB</span><span>実験・試作・制作道具</span></footer></body></html>
`.replace(/\n[ \t]+(?=\n)/g, '\n');
}
module.exports = { ROOM_FILE, STATUS_LABELS, readRooms, renderLab };
