// Ícones SVG inline (traço 1.75, grade 24px) — sem dependências externas.
const paths = {
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7C3.6 7.9 7.5 5 12 5s8.4 2.9 9.94 6.65a1 1 0 0 1 0 .7C20.4 16.1 16.5 19 12 19s-8.4-2.9-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.7 5.08A10 10 0 0 1 12 5c4.5 0 8.4 2.9 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.56 2.63"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5A10.7 10.7 0 0 1 12 19c-4.5 0-8.4-2.9-9.94-6.65a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.1A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.9L17.5 7"/><path d="M10 11v6M14 11v6"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.6 1.4 2.8 2.5 2.8Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  rollover: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M12 8v4l2.5 1.5"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  sort: '<path d="M3 6h13M3 12h9M3 18h5"/><path d="m17 15 3 3 3-3M20 18V8"/>',
  sparkle: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
};

export function icon(name, size = 18, extraClass = '') {
  return `<svg class="icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

// Marca: anel de progresso em gradiente + check.
export function logo(size = 28) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 128 128" aria-hidden="true">
    <defs>
      <linearGradient id="lg-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
      <linearGradient id="lg-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1d26"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient>
    </defs>
    <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#lg-bg)" stroke="#2f343c" stroke-width="2"/>
    <circle cx="64" cy="64" r="36" fill="none" stroke="#262a31" stroke-width="10"/>
    <path d="M64 28a36 36 0 1 1-34.2 47.1" fill="none" stroke="url(#lg-ring)" stroke-width="10" stroke-linecap="round"/>
    <path d="m48 64 11 11 21-23" fill="none" stroke="#edeef0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
