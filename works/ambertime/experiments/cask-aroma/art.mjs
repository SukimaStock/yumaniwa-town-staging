// Original decorative vector pieces for this independent experiment.
// Labels and all meaningful values belong to the surrounding HTML.
const ink = '#344849';
const cream = '#dfd2ae';
const gold = '#caa269';
const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true" focusable="false"><g stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const caskId = id => ['bourbon', 'sherry', 'refill'].includes(id) ? id : 'refill';
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// A shared 48 × 48 drawing vocabulary, reused directly on bottle labels.
function aromaShape(key) {
  switch (key) {
    case 'spirit':
      return `<path d="M22 16C12 10 5 19 8 30C11 39 20 41 25 33C30 41 39 34 39 25C39 17 31 12 25 16" fill="#ba9d61" stroke-width="2.2"/><path d="M24 17Q22 10 28 7M27 10Q34 5 37 11Q31 15 27 10" fill="#8e9d75" stroke-width="2"/><path d="M11 40L22 26M12 34L9 28M16 31L17 24M17 35L23 34" fill="none" stroke="#eee0b3" stroke-width="2.8"/>`;
    case 'vanilla':
      return `<path d="M10 41Q29 28 28 7Q22 25 8 36Q5 41 10 41Z" fill="#746047" stroke-width="2"/><path d="M17 42Q36 28 34 11Q29 28 16 37Q12 42 17 42Z" fill="#96754e" stroke-width="2"/><path d="M32 18Q24 14 27 8Q31 5 35 11Q36 3 41 6Q46 10 40 15Q48 17 43 22Q38 25 36 19Q33 27 28 23Q25 20 32 18Z" fill="${cream}" stroke-width="1.8"/><circle cx="36" cy="16" r="3" fill="${gold}" stroke-width="1.5"/>`;
    case 'dried':
      return `<path d="M8 15Q19 6 28 15L31 28Q23 41 11 32Q5 25 8 15Z" fill="#8e6258" stroke-width="2.1"/><path d="M11 17Q19 11 25 17L27 27Q21 35 13 29Z" fill="#c29572" stroke-width="1.7"/><path d="M15 19L18 25L23 19M19 28L20 31" fill="none" stroke="#8e6258" stroke-width="1.8"/><path d="M30 22Q36 15 41 23Q46 33 38 39Q29 42 27 33Z" fill="#70524d" stroke-width="2.1"/><path d="M34 24L32 30L35 35M39 26L37 31L39 34" fill="none" stroke="#bb9275" stroke-width="1.7"/>`;
    case 'woody':
    case 'wood':
      return `<path d="M8 15L30 7L41 17V34L19 42L8 32Z" fill="#ab865a" stroke-width="2.1"/><path d="M8 15L19 25L41 17M19 25V42" fill="none" stroke-width="2"/><path d="M12 18L17 22M12 24L16 28M12 30L16 34M24 28L36 24M24 34L32 31M29 37L37 34" fill="none" stroke="#745c43" stroke-width="1.7"/><path d="M19 13L26 12L32 15L26 18Z" fill="none" stroke="#e1c28c" stroke-width="1.7"/>`;
    default:
      return '';
  }
}

export function aromaIcon(key) {
  return svg('0 0 48 48', aromaShape(key));
}

export function caskArt(id) {
  const type = caskId(id);
  const wood = { bourbon: '#9a754e', sherry: '#977064', refill: '#929277' }[type];
  // Broader sherry butt, compact bourbon barrel, slender refill cask.
  const outline = {
    bourbon: 'M35 23Q65 13 95 23Q112 65 96 109Q65 122 34 109Q18 65 35 23Z',
    sherry: 'M31 18Q65 8 99 18Q119 66 100 116Q65 131 30 116Q11 66 31 18Z',
    refill: 'M39 18Q65 9 91 18Q105 66 92 113Q65 127 38 113Q25 66 39 18Z'
  }[type];
  const motif = { bourbon: 'vanilla', sherry: 'dried', refill: 'spirit' }[type];
  return svg('0 0 130 142', `<ellipse cx="65" cy="132" rx="47" ry="5" fill="#152527" opacity=".3" stroke="none"/><path d="${outline}" fill="${wood}" stroke-width="2.7"/><path d="M50 20Q39 68 49 116M65 18V120M80 20Q92 68 81 116" fill="none" stroke="#655b47" stroke-width="1.8" opacity=".8"/><path d="M31 39Q65 49 100 39L103 50Q65 61 28 50Z M28 91Q65 103 103 91L100 102Q65 115 31 102Z" fill="#53605a" stroke-width="2"/><path d="M34 41Q65 51 97 41M32 94Q65 105 99 94" fill="none" stroke="#b9b697" stroke-width="1.2" opacity=".65"/><path d="M43 28L40 35M89 60L90 82M44 63L43 79M77 109L76 116" fill="none" stroke="#e2c797" stroke-width="1.5" opacity=".5"/><path d="M87 54L103 63L100 91L78 87L77 67Z" fill="${cream}" stroke-width="1.8"/><circle cx="86" cy="63" r="1.5" fill="${ink}" stroke="none"/><g transform="translate(80 65) scale(.43)">${aromaShape(motif)}</g>`);
}

export function newmakeArt() {
  return svg('0 0 144 142', `<ellipse cx="70" cy="131" rx="47" ry="5" fill="#152527" opacity=".3" stroke="none"/><path d="M52 14H83V41Q103 49 103 68V116Q103 124 95 124H40Q32 124 32 116V68Q32 49 52 41Z" fill="#a8b6a1" fill-opacity=".12" stroke="#a8b6a1" stroke-width="2.4"/><path d="M36 73Q67 79 99 73V115Q99 120 94 120H41Q36 120 36 115Z" fill="${cream}" opacity=".6" stroke="none"/><ellipse cx="67.5" cy="73" rx="31.5" ry="4" fill="${cream}" opacity=".7" stroke="none"/><rect x="49" y="8" width="37" height="12" rx="3" fill="#957851" stroke-width="2"/><path d="M46 53L43 64M43 83V109" fill="none" stroke="#e7dfc3" stroke-width="2" opacity=".7"/><path d="M19 120L43 85M29 106L19 101M32 101L30 90M26 112L15 110M36 97L41 90M22 117L12 119" fill="none" stroke="${gold}" stroke-width="3"/><path d="M107 122L123 97M111 115L106 106M116 107L117 98M112 115L122 112" fill="none" stroke="${gold}" stroke-width="2.6"/>`);
}

export function glassArt(profile = {}) {
  const age = Math.max(0, finite(profile?.age, finite(profile?.months)));
  const shade = age >= 60 ? '#ac804e' : age >= 18 ? '#c99a56' : age > 0 ? '#d4b778' : cream;
  return svg('0 0 100 116', `<ellipse cx="50" cy="107" rx="28" ry="4" fill="#152527" opacity=".3" stroke="none"/><path d="M23 15H77L71 71Q69 86 50 87Q31 86 29 71Z" fill="#b7c2b0" fill-opacity=".06" stroke="#b7c2b0" stroke-width="2"/><path d="M28 49Q50 53 72 49L68 70Q66 82 50 82Q34 82 32 70Z" fill="${shade}" opacity=".83" stroke="none"/><ellipse cx="50" cy="49" rx="22" ry="3" fill="${shade}" stroke="none"/><path d="M33 23L37 62M50 88V103M35 104H65" fill="none" stroke="#d0d1b4" stroke-width="2.2"/>`);
}

export function bottleArt(id, aromaKeys = [], age = 0) {
  const type = caskId(id);
  const keys = Array.isArray(aromaKeys) ? [...new Set(aromaKeys)].filter(key => ['spirit', 'vanilla', 'dried', 'woody'].includes(key)).slice(0, 3) : [];
  const shape = {
    bourbon: 'M28 17H46V40L60 54V137Q60 144 53 144H21Q14 144 14 137V54L28 40Z',
    sherry: 'M28 17H46V37Q46 43 54 48Q63 54 63 66V136Q63 144 55 144H19Q11 144 11 136V66Q11 54 20 48Q28 43 28 37Z',
    refill: 'M29 17H45V45Q55 53 55 65V138Q55 144 49 144H25Q19 144 19 138V65Q19 53 29 45Z'
  }[type];
  const shade = finite(age) >= 60 ? '#ac804e' : finite(age) >= 18 ? '#c99a56' : '#d4b778';
  const width = type === 'refill' ? 30 : type === 'sherry' ? 46 : 40;
  const left = 37 - width / 2;
  const labelMotifs = keys.map((key, i) => {
    const scale = keys.length === 1 ? .52 : keys.length === 2 ? .4 : .32;
    const gap = keys.length === 1 ? 0 : keys.length === 2 ? 18 : 14;
    const x = 37 - (keys.length - 1) * gap / 2 + i * gap - 24 * scale;
    return `<g transform="translate(${x} ${92 - 24 * scale}) scale(${scale})">${aromaShape(key)}</g>`;
  }).join('');
  return svg('0 0 74 154', `<ellipse cx="37" cy="149" rx="28" ry="3.5" fill="#152527" opacity=".3" stroke="none"/><path d="${shape}" fill="${shade}" fill-opacity=".74" stroke="#a6b497" stroke-width="2"/><rect x="26" y="7" width="22" height="13" rx="2" fill="#9b7a50" stroke-width="2"/><path d="M30 12H44" stroke="${gold}" stroke-width="1.4"/><rect x="${left}" y="75" width="${width}" height="36" rx="1.5" fill="${cream}" stroke-width="1"/>${labelMotifs}<path d="M${left + 5} 117H${left + width - 5}" stroke="${cream}" stroke-width="1.6" opacity=".7"/><path d="M${left + 4} 62V69M${left + 4} 124V134" stroke="#e7dfc3" stroke-width="1.7" opacity=".65"/>`);
}
