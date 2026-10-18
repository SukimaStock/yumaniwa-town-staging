// Presentation only: no flavour or ageing calculation lives in this module.
const CREAM = '#e9dfb7';
const wrap = (box, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${body}</svg>`;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export function tastingGlass(profile = {}) {
  const age = Math.max(0, finite(profile?.age, finite(profile?.months)));
  const shade = age >= 60 ? '#ac804e' : age >= 18 ? '#c99a56' : age > 0 ? '#d4b778' : '#dfd2ae';
  return wrap('0 0 48 64', `
    <path fill="${CREAM}" d="M13 3H35V12H37V20H39V27H41V40H39V46H35V50H29V55H31V58H35V61H13V58H17V55H19V50H13V46H9V40H7V27H9V20H11V12H13Z"/>
    <path fill="#17392f" d="M15 5H33V14H35V22H37V29H39V40H37V44H33V48H27V55H25V58H33V59H15V58H23V55H21V48H15V44H11V40H9V29H11V22H13V14H15Z"/>
    <path fill="${shade}" d="M10 30H38V39H36V43H32V46H16V43H12V39H10Z"/>
    <path fill="#e6c98d" d="M10 30H38V32H10Z"/>
    <path fill="${CREAM}" d="M17 7H20V11H17ZM13 24H16V34H13Z"/>
  `);
}

export function tastingAroma(key) {
  const shapes = {
    spirit: `<path fill="#a89c43" d="M17 6H21V11H17ZM21 4H29V8H25V10H21Z"/><path fill="#d6ac51" d="M8 12H15V10H19V12H26V16H29V25H26V29H20V27H16V29H10V26H7V17H8Z"/><path fill="#f0ce7c" d="M10 15H14V20H10Z"/><path fill="#dfd2ae" d="M5 30H8V25H11V21H14V24H12V28H9V32H5ZM6 24H9V27H6Z"/>`,
    vanilla: `<path fill="#c5a572" d="M3 29H7V25H11V21H15V17H19V13H23V15H21V19H17V23H13V27H9V31H3ZM7 34H12V30H16V26H20V22H24V18H27V20H26V24H22V28H18V32H14V35H7Z"/><path fill="#57402b" d="M6 28H9V25H12V22H15V19H18V17H20V19H18V22H15V25H12V28H9V30H6Z"/><path fill="${CREAM}" d="M23 5H27V9H31V13H27V17H23V13H19V9H23Z"/><path fill="#caad60" d="M23 9H27V13H23Z"/>`,
    dried: `<path fill="#c09b88" d="M8 6H17V9H20V17H17V20H8V17H5V9H8ZM23 14H31V17H34V26H31V29H23V26H20V17H23ZM7 23H15V26H18V33H15V36H7V33H4V26H7Z"/><path fill="#794a3c" d="M9 9H15V12H18V16H15V18H9V15H7V12H9ZM25 17H29V20H32V25H29V27H25V24H23V20H25ZM8 26H13V29H16V32H13V34H8V31H6V28H8Z"/>`,
    woody: `<path fill="#66503a" d="M6 10H27V13H31V17H34V26H31V30H10V27H6Z"/><path fill="#b2925f" d="M8 13H25V16H29V27H12V24H8Z"/><path fill="#dfc38d" d="M23 15H28V18H31V25H28V28H23V25H20V18H23Z"/><path fill="#8b6847" d="M24 18H27V21H29V24H26V26H23V23H22V20H24Z"/><path fill="#66503a" d="M10 17H17V20H10ZM12 23H18V25H12Z"/>`
  };
  return shapes[key] ? wrap('0 0 40 40', shapes[key]) : '';
}
