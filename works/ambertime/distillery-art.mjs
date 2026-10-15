// A small copper still and a clear receiving jar. Drawn here, with no asset dependency.
// --collection (0..1) controls only the physical amount in the receiver.
export function stillArt() {
  return `<svg viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <ellipse cx="121" cy="226" rx="91" ry="7" fill="#101a1d" opacity=".65"/>
    <ellipse cx="286" cy="226" rx="39" ry="5" fill="#101a1d" opacity=".65"/>
    <path d="M38 219H203M53 219V228M186 219V228" fill="none" stroke="#4a5147" stroke-width="6"/>
    <path d="M71 111Q37 125 43 169Q47 208 121 210Q192 208 199 168Q204 126 169 111L151 83H88Z" fill="#93633f" stroke="#4c392e" stroke-width="3"/>
    <path d="M62 136Q80 117 91 117M55 157Q54 190 82 195" fill="none" stroke="#c49866" stroke-width="3" opacity=".65"/>
    <path d="M92 88Q120 98 151 87M49 185Q121 205 194 185" fill="none" stroke="#d2a06c" stroke-width="2" opacity=".4"/>
    <path d="M104 86V59Q105 27 130 30L167 62H272Q286 62 286 77V119" fill="none" stroke="#513c30" stroke-width="17" stroke-linejoin="round"/>
    <path d="M104 86V59Q105 27 130 30L167 62H272Q286 62 286 77V119" fill="none" stroke="#a8784b" stroke-width="12" stroke-linejoin="round"/>
    <path d="M109 61Q109 35 129 36L166 67H270" fill="none" stroke="#dbb080" stroke-width="2" opacity=".5"/>
    <path d="M180 54V69M208 54V69M279 91H293" stroke="#564a37" stroke-width="4"/>
    <circle cx="121" cy="149" r="13" fill="#67492f" stroke="#bd9561" stroke-width="2"/>
    <circle cx="121" cy="149" r="4" fill="#ac8556"/>
    <path d="M117 149H125M121 145V153" stroke="#413727" stroke-width="1.5"/>
    <path d="M66 206V217M177 206V217" stroke="#514c3d" stroke-width="7"/>
    <path d="M251 145H321L314 214Q313 221 306 221H266Q259 221 258 214Z" fill="#c0c8aa" fill-opacity=".055" stroke="#a7b29b" stroke-width="1.7"/>
    <g class="receiver-liquid">
      <path d="M254 156Q286 160 318 156L312 213Q311 218 306 218H267Q261 218 260 213Z" fill="#d8d0a7" fill-opacity=".68"/>
      <ellipse cx="286" cy="156" rx="32" ry="3" fill="#e7ddb6" opacity=".8"/>
    </g>
    <path d="M260 150L265 203M270 215H302" fill="none" stroke="#d4d7bf" stroke-width="2" opacity=".5"/>
    <path d="M286 122V151" class="distill-stream" fill="none" stroke="#ded7b5" stroke-width="2.5" stroke-dasharray="4 5"/>
    <g class="still-steam" fill="none" stroke="#c1b79a" stroke-width="1.2" opacity=".25"><path d="M89 25Q82 17 89 8"/><path d="M101 17Q97 9 103 3"/></g>
    <path d="M22 234H338" fill="none" stroke="#485247" stroke-width="1"/>
  </svg>`;
}
