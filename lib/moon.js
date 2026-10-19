// Fase da lua a partir do mês sinódico médio (precisão de ~1 dia, suficiente para exibição).
const SYNODIC = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // lua nova de referência

// No hemisfério sul a parte iluminada aparece espelhada (crescente acesa à esquerda).
const SOUTHERN_HEMISPHERE = true;

const NAMES = [
  'Lua Nova',
  'Lua Crescente',
  'Quarto Crescente',
  'Crescente Gibosa',
  'Lua Cheia',
  'Minguante Gibosa',
  'Quarto Minguante',
  'Lua Minguante'
];

export function moonPhase(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const phase = (((days / SYNODIC) % 1) + 1) % 1; // 0 = nova, 0.5 = cheia
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const name = NAMES[Math.round(phase * 8) % 8];
  return { phase, illumination, name, age: phase * SYNODIC };
}

// Desenha a porção iluminada: semicírculo do lado aceso + elipse do terminador.
function litPath(phase, c, r) {
  const rx = Math.abs(Math.cos(2 * Math.PI * phase)) * r;
  const waxing = phase < 0.5;
  const limbSweep = waxing ? 1 : 0; // direita ao crescer, esquerda ao minguar
  const gibbous = phase > 0.25 && phase < 0.75;
  const termSweep = waxing === gibbous ? 1 : 0;
  return `M${c} ${c - r} A${r} ${r} 0 0 ${limbSweep} ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${termSweep} ${c} ${c - r}Z`;
}

let uid = 0;
export function moonSVG(date, size = 44) {
  const { phase, illumination } = moonPhase(date);
  const id = `moon${uid++}`;
  const c = 50;
  const r = 40;
  const d = litPath(phase, c, r);
  const flip = SOUTHERN_HEMISPHERE ? `transform="translate(100 0) scale(-1 1)"` : '';
  return `<svg class="moon" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${id}-lit" cx="0.42" cy="0.38" r="0.7">
        <stop offset="0" stop-color="#fbfbff"/><stop offset="0.7" stop-color="#d9dcef"/><stop offset="1" stop-color="#a9aec9"/>
      </radialGradient>
      <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.75" stop-color="#c4b5fd" stop-opacity="0.22"/><stop offset="1" stop-color="#c4b5fd" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="${id}-clip"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>
      <clipPath id="${id}-lit-clip"><path d="${d}"/></clipPath>
    </defs>
    <circle cx="${c}" cy="${c}" r="50" fill="url(#${id}-glow)" opacity="${(0.25 + illumination * 0.75).toFixed(2)}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#1b1d26" stroke="#2f343c" stroke-width="1.5"/>
    <g clip-path="url(#${id}-clip)" ${flip}>
      <path d="${d}" fill="url(#${id}-lit)"/>
      <g fill="#8e93ad" opacity="0.35" clip-path="url(#${id}-lit-clip)">
        <circle cx="38" cy="36" r="7"/><circle cx="62" cy="58" r="9"/><circle cx="44" cy="66" r="4.5"/><circle cx="66" cy="32" r="3.5"/>
      </g>
    </g>
  </svg>`;
}
