import {codeaBottle, codeaCask} from '../codea-object-art.mjs';
import {bottleShape} from '../brand-identity.mjs';
import {monthLabel} from '../model.mjs';
import {mapShopPositions} from '../world-map-view.mjs';
import {renderMap, SIZE} from '../experiments/world-map/v01/map.mjs';
import {NODES} from '../town-connection.mjs';

const levels = new Map(NODES.map(node => [node.id, node.level]));
const stageByLevel = new Map([['町', 3], ['周辺地域', 4], ['全国', 5], ['海外', 6]]);
const townStage = 3;
const townPositions = mapShopPositions(townStage);
const cropSize = 72;
const cropStart = coordinate => Math.min(SIZE - cropSize, Math.max(0, coordinate - cropSize / 2));

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function drawScene(canvas, backing, stage, position) {
  const original = backing.getContext('2d', {alpha:false});
  renderMap(original, stage);
  const ctx = canvas.getContext('2d', {alpha:false});
  ctx.imageSmoothingEnabled = false;
  if (!position) {
    ctx.drawImage(backing, 0, 0);
    return;
  }

  // Keep the same crop and marker for all scenes about this stockist.
  const [x,y] = position;
  const sx = cropStart(x), sy = cropStart(y);
  ctx.drawImage(backing, sx, sy, cropSize, cropSize, 0, 0, SIZE, SIZE);
  const px = (x - sx) * SIZE / cropSize;
  const py = (y - sy) * SIZE / cropSize;
  ctx.fillStyle = '#243135';
  ctx.fillRect(px - 6, py - 6, 12, 12);
  ctx.fillStyle = '#f6e5b4';
  ctx.fillRect(px - 4, py - 4, 8, 8);
}

export function renderScene(container, relation) {
  const {start, end, entity, kind} = relation;
  const frames = [start, ...(relation.bridge ?? []), end];
  const figure = node('figure', 'memory-scene');
  const view = node('div', 'scene-view');
  const canvas = node('canvas', 'scene-canvas');
  const backing = document.createElement('canvas');
  backing.width = backing.height = canvas.width = canvas.height = SIZE;
  canvas.setAttribute('aria-hidden', 'true');
  const art = node('div', 'scene-object');
  art.setAttribute('aria-hidden', 'true');
  const shopId = end.ids?.shopId ?? start.ids?.shopId ?? (kind === 'shop' ? entity.id : null);
  const position = shopId ? townPositions[shopId] : null;
  if (kind === 'brand' || kind === 'cask') {
    const shape = bottleShape({bottle:entity.shape});
    const label = ['cream', 'dark'].includes(entity.label) ? entity.label : null;
    const bottle = node('span', 'scene-bottle');
    bottle.innerHTML = codeaBottle(shape, {label});
    art.append(bottle);
    if (kind === 'cask') {
      const cask = node('span', 'scene-cask');
      cask.innerHTML = codeaCask(entity.caskType === 'refill' ? 'refill' : 'bourbon');
      art.prepend(cask);
    }
  }
  view.append(canvas, art);

  const caption = node('figcaption', 'scene-caption');
  caption.setAttribute('aria-live', 'polite');
  caption.setAttribute('aria-atomic', 'true');
  const date = node('p', 'scene-date');
  const fact = node('p', 'scene-fact');
  caption.append(date, fact);

  const navigation = node('div', 'scene-navigation');
  const previous = node('button', '', '前へ');
  const next = node('button', '', '次へ');
  previous.type = next.type = 'button';
  const page = node('span', 'scene-page');
  navigation.append(previous, page, next);

  let index = 0;
  function show() {
    const frame = frames[index];
    const stage = position ? townStage :
      stageByLevel.get(levels.get(frame.ids?.regionId)) ?? 1;
    drawScene(canvas, backing, stage, position);
    const generation = frame.generationId == null ? '' : ` · 第${frame.generationId}世代`;
    date.textContent = monthLabel(frame.month) + generation;
    fact.textContent = frame.label;
    page.textContent = `${index + 1} / ${frames.length}`;
    previous.disabled = index === 0;
    next.disabled = index === frames.length - 1;
    const bottle = art.querySelector('.scene-bottle');
    if (bottle) bottle.hidden = kind === 'cask' && index < frames.length - 1;
    const cask = art.querySelector('.scene-cask');
    if (cask) cask.hidden = index === frames.length - 1;
  }
  previous.addEventListener('click', () => { index--; show(); });
  next.addEventListener('click', () => { index++; show(); });
  figure.append(view, caption, navigation);
  container.replaceChildren(figure);
  show();
}
