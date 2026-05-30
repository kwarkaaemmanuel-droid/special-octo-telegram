// Small presentation helpers: number formatting, sparklines, icons.

export function fmtUsd(n, opts = {}) {
  if (n == null || isNaN(n)) return '$0.00';
  const abs = Math.abs(n);
  let digits = opts.digits;
  if (digits == null) {
    if (abs !== 0 && abs < 0.01) digits = 6;
    else if (abs < 1) digits = 4;
    else digits = 2;
  }
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtNum(n, digits = 4) {
  if (n == null || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (abs !== 0 && abs < 0.0001) return n.toExponential(2);
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function fmtPct(n) {
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

export function changeClass(n) {
  return n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export function sparkline(series, { w = 100, h = 32, stroke = '#ab9ff2', fill = true } = {}) {
  if (!series || series.length < 2) return '';
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = w / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M ${pts.join(' L ')}`;
  const gid = 'sg-' + stroke.replace('#', '');
  const area = fill
    ? `<path d="M ${pts.join(' L ')} L ${w},${h} L 0,${h} Z" fill="url(#${gid})" opacity="0.18"/>`
    : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${stroke}"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
    </linearGradient></defs>
    ${area}<path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function avatar(m, size = 40) {
  const fg = pickText(m.color);
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${m.color};color:${fg}">${m.glyph || m.symbol[0]}</span>`;
}

function pickText(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#16161a' : '#ffffff';
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
