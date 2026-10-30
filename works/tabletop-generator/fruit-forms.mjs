// Local fruit contours. Their bounds include the connected stem and are evaluated
// after rotation, so a foreground fruit can rest on a chosen support plane.
const FORMS = {
  lemon: {
    body: [
      ['M', -1, 0],
      ['C', -.91, -.17, -.94, -.2, -.82, -.3],
      ['C', -.59, -.92, -.2, -1.07, .18, -.97],
      ['C', .55, -.94, .8, -.53, .9, -.17],
      ['L', 1, 0], ['L', .9, .15],
      ['C', .77, .65, .4, 1, 0, 1],
      ['C', -.42, 1, -.72, .74, -.85, .28], ['Z'],
    ],
  },
  orange: {
    body: [
      ['M', -.02, -.98],
      ['C', .55, -1.02, .98, -.61, .99, -.03],
      ['C', 1.02, .5, .63, .94, .18, .98],
      ['C', .04, 1, -.15, 1, -.29, .96],
      ['C', -.76, .86, -1.01, .46, -.99, -.08],
      ['C', -.98, -.61, -.55, -1.01, -.02, -.98], ['Z'],
    ],
    stem: [
      ['M', -.075, -.94],
      ['C', -.09, -1.01, -.09, -1.07, -.045, -1.12],
      ['L', .015, -1.10],
      ['C', -.015, -1.04, -.015, -1, .02, -.95], ['Z'],
    ],
  },
  pear: {
    body: [
      ['M', -.03, -1.08],
      ['C', .34, -1.10, .24, -.55, .52, -.18],
      ['C', .96, .28, .94, .74, .54, .93],
      ['C', .24, 1.07, -.26, 1.05, -.58, .91],
      ['C', -.98, .73, -.92, .24, -.55, -.18],
      ['C', -.27, -.59, -.34, -1.08, -.03, -1.08], ['Z'],
    ],
    stem: [
      ['M', -.065, -1.045],
      ['C', -.095, -1.16, -.075, -1.28, .025, -1.36],
      ['L', .085, -1.305],
      ['C', .015, -1.23, -.005, -1.15, .025, -1.045], ['Z'],
    ],
  },
};
const round = value => Number(value.toFixed(6));
function scaled(commands, rx, ry) {
  return commands.map(([command, ...coordinates]) => [command,
    ...coordinates.map((value, index) => round(value * (index % 2 ? ry : rx)))]);
}
function serialize(commands) {
  return commands.map(([command, ...coordinates]) => command + coordinates.join(' ')).join(' ');
}
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
function extrema(p0, p1, p2, p3) {
  const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
  const b = 6 * (p0 - 2 * p1 + p2);
  const c = 3 * (p1 - p0);
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}
function bounds(paths, angle) {
  const radians = (angle % 360) * Math.PI / 180;
  const cosine = Math.cos(radians), sine = Math.sin(radians);
  const rotate = (x, y) => [x * cosine - y * sine, x * sine + y * cosine];
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  const include = ([x, y]) => {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  };
  for (const commands of paths) {
    let current, start;
    for (const [command, ...coordinates] of commands) {
      if (command === 'M') {
        current = rotate(...coordinates); start = current; include(current);
      } else if (command === 'L') {
        current = rotate(...coordinates); include(current);
      } else if (command === 'C') {
        const controls = [current, rotate(coordinates[0], coordinates[1]),
          rotate(coordinates[2], coordinates[3]), rotate(coordinates[4], coordinates[5])];
        const ts = [0, 1,
          ...extrema(...controls.map(point => point[0])),
          ...extrema(...controls.map(point => point[1]))];
        for (const t of ts) if (t >= 0 && t <= 1) include([
          cubic(...controls.map(point => point[0]), t),
          cubic(...controls.map(point => point[1]), t),
        ]);
        current = controls[3];
      } else if (command === 'Z') {
        include(start); current = start;
      }
    }
  }
  return { bottom, top, left, right };
}
export function fruitForm(variety, rx, ry, angle = 0) {
  if (!Object.hasOwn(FORMS, variety)) throw new RangeError('Unsupported fruit variety');
  if (![rx, ry].every(value => Number.isFinite(value) && value > 0 && value <= 10000)
    || !Number.isFinite(angle)) throw new RangeError('Fruit dimensions and angle must be finite');
  const form = FORMS[variety], body = scaled(form.body, rx, ry);
  const stem = form.stem ? scaled(form.stem, rx, ry) : null;
  return { path: serialize(body), ...(stem ? { stemPath: serialize(stem) } : {}),
    ...bounds(stem ? [body, stem] : [body], angle) };
}
