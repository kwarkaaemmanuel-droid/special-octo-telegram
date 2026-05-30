// OctoTrade — main controller. Wires markets + store into views and modals.
import { MARKETS, CATEGORY_LABELS, findMarket } from '../data/markets.js';
import { initMarket, onTick, getPrice, getChangePct, getHistory } from './market.js';
import * as store from './store.js';
import {
  fmtUsd, fmtNum, fmtPct, changeClass, timeAgo,
  sparkline, avatar, el, escapeHtml,
} from './ui.js';

const app = document.getElementById('app');

// ---- Router (hash based) ----
const route = { name: 'home', params: {} };

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = h.split('/');
  route.name = name || 'home';
  route.params = { id: rest[0] };
}

function go(path) { location.hash = path; }

window.addEventListener('hashchange', () => { parseHash(); render(); });

// ---- Boot ----
initMarket();
parseHash();
render();

// Re-render on every price tick and on state change. To preserve focus while
// the user is typing (Swap/Perps fields, modal inputs), skip the tick re-render
// when an input/select is focused or a modal is open — liquidations still run.
onTick(() => {
  const changed = store.checkLiquidations();
  const editing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  const modalOpen = document.querySelector('.modal-backdrop');
  if (changed || (!editing && !modalOpen)) render();
});
store.onChange(render);

// ---- Top-level render ----
function render() {
  const s = store.getState();
  if (!s.created) { renderOnboarding(); return; }

  let view;
  switch (route.name) {
    case 'asset':    view = viewAsset(route.params.id); break;
    case 'swap':     view = viewSwap(); break;
    case 'perps':    view = viewPerps(); break;
    case 'activity': view = viewActivity(); break;
    case 'settings': view = viewSettings(); break;
    case 'home':
    default:         view = viewHome(); break;
  }

  app.innerHTML = `
    <div class="phone">
      ${view}
      ${navBar()}
    </div>`;
  bindEvents();
}

// ===================================================================
// Onboarding
// ===================================================================
function renderOnboarding() {
  app.innerHTML = `
    <div class="phone">
      <div class="onboard">
        <div class="brand-mark">🐙</div>
        <h1>OctoTrade</h1>
        <p class="muted">Your self-custody wallet for stocks, tokens, meme coins and perps — all in one place.</p>
        <ul class="onboard-feats">
          <li><span>📈</span> Trade tokenized stocks &amp; ETFs</li>
          <li><span>🪙</span> Swap crypto tokens instantly</li>
          <li><span>🐸</span> Ape into meme coins</li>
          <li><span>⚡</span> Go long or short with perps</li>
        </ul>
        <button class="btn btn-primary btn-block" id="create-wallet">Create wallet</button>
        <p class="disclaimer">Demo app · simulated prices · $25,000 in play money</p>
      </div>
    </div>`;
  document.getElementById('create-wallet').onclick = () => {
    store.createWallet();
    go('home');
    render();
  };
}

// ===================================================================
// Home — portfolio + asset browser
// ===================================================================
let homeTab = 'token';

function viewHome() {
  const s = store.getState();
  const total = store.totalValue();
  const dayChange = portfolioDayChange();
  const cls = changeClass(dayChange);

  return `
    <header class="topbar">
      <div class="acct">
        <span class="acct-dot"></span>
        <span class="acct-name">Account 1</span>
        <span class="acct-addr">${escapeHtml(s.address)}</span>
      </div>
      <button class="icon-btn" data-go="settings" title="Settings">⚙</button>
    </header>

    <section class="balance">
      <div class="balance-label">Total balance</div>
      <div class="balance-amt">${fmtUsd(total, { digits: 2 })}</div>
      <div class="balance-chg ${cls}">${fmtPct(dayChange)} today</div>
      <div class="actions">
        <button class="action" data-act="receive"><span>↓</span>Receive</button>
        <button class="action" data-act="send"><span>↑</span>Send</button>
        <button class="action" data-go="swap"><span>⇄</span>Swap</button>
        <button class="action" data-go="perps"><span>⚡</span>Perps</button>
      </div>
    </section>

    ${holdingsStrip()}

    <div class="tabs">
      ${Object.entries(CATEGORY_LABELS).map(([k, label]) =>
        `<button class="tab ${homeTab === k ? 'active' : ''}" data-tab="${k}">${label}</button>`).join('')}
    </div>

    <section class="list">
      ${MARKETS.filter((m) => m.type === homeTab).map((m) => marketRow(m)).join('')}
    </section>
  `;
}

function holdingsStrip() {
  const s = store.getState();
  const ids = Object.keys(s.holdings);
  const perpV = store.perpValue();
  const items = [];
  items.push(holdCard('Cash', fmtUsd(s.cash, { digits: 2 }), '#5a5a66', '$'));
  if (perpV > 0) items.push(holdCard('Perps', fmtUsd(perpV, { digits: 2 }), '#ab9ff2', '⚡'));
  for (const id of ids) {
    const m = findMarket(id);
    if (!m) continue;
    items.push(holdCard(m.symbol, fmtUsd(s.holdings[id] * getPrice(id), { digits: 2 }), m.color, m.glyph || m.symbol[0]));
  }
  if (items.length <= 1 && perpV === 0) return '';
  return `<div class="hold-strip">${items.join('')}</div>`;
}

function holdCard(label, value, color, glyph) {
  return `<div class="hold-card">
    <span class="hold-glyph" style="background:${color}">${glyph}</span>
    <div><div class="hold-label">${label}</div><div class="hold-val">${value}</div></div>
  </div>`;
}

function marketRow(m) {
  const price = getPrice(m.id);
  const chg = getChangePct(m.id);
  const cls = changeClass(chg);
  const held = store.getState().holdings[m.id] || 0;
  const heldLine = held > 0
    ? `<div class="row-sub">${fmtNum(held)} ${m.symbol} · ${fmtUsd(held * price, { digits: 2 })}</div>`
    : `<div class="row-sub">${m.name}</div>`;
  return `
    <div class="row" data-asset="${m.id}">
      ${avatar(m)}
      <div class="row-main">
        <div class="row-title">${m.symbol} ${m.type === 'perp' ? '<span class="pill">PERP</span>' : ''}</div>
        ${heldLine}
      </div>
      <div class="row-spark">${sparkline(getHistory(m.id), { stroke: chg >= 0 ? '#21c08b' : '#e5484d' })}</div>
      <div class="row-right">
        <div class="row-price">${fmtUsd(price)}</div>
        <div class="row-chg ${cls}">${fmtPct(chg)}</div>
      </div>
    </div>`;
}

// ===================================================================
// Asset detail
// ===================================================================
function viewAsset(id) {
  const m = findMarket(id);
  if (!m) return `<div class="pad">Unknown asset. <a href="#/home">Go home</a></div>`;
  const price = getPrice(id);
  const chg = getChangePct(id);
  const cls = changeClass(chg);
  const hist = getHistory(id);
  const held = store.getState().holdings[id] || 0;

  const tradePanel = m.type === 'perp'
    ? `<div class="detail-cta">
         <button class="btn btn-block" data-go="perps">Trade ${escapeHtml(m.symbol)}</button>
       </div>`
    : `<div class="detail-cta two">
         <button class="btn btn-primary" data-buy="${id}">Buy</button>
         <button class="btn btn-ghost" data-sell="${id}" ${held <= 0 ? 'disabled' : ''}>Sell</button>
       </div>`;

  return `
    <header class="topbar">
      <button class="icon-btn" data-go="home">←</button>
      <div class="topbar-title">${avatar(m, 22)} ${escapeHtml(m.symbol)}</div>
      <span style="width:34px"></span>
    </header>

    <section class="detail-head">
      <div class="detail-price">${fmtUsd(price)}</div>
      <div class="detail-chg ${cls}">${fmtPct(chg)} today</div>
    </section>

    <div class="chart">${sparkline(hist, { w: 320, h: 120, stroke: chg >= 0 ? '#21c08b' : '#e5484d' })}</div>

    ${held > 0 ? `<div class="balance-card">
      <div><div class="muted sm">Your balance</div><div class="bold">${fmtNum(held)} ${m.symbol}</div></div>
      <div class="bold">${fmtUsd(held * price, { digits: 2 })}</div>
    </div>` : ''}

    <div class="info-card">
      <div class="info-row"><span class="muted">Name</span><span>${escapeHtml(m.name)}</span></div>
      <div class="info-row"><span class="muted">Category</span><span>${CATEGORY_LABELS[m.type]}</span></div>
      ${m.type === 'perp' ? `<div class="info-row"><span class="muted">Funding (8h)</span><span class="${m.funding>=0?'up':'down'}">${fmtPct(m.funding)}</span></div>
      <div class="info-row"><span class="muted">Max leverage</span><span>${m.maxLev}×</span></div>` : ''}
      <div class="info-row about"><span class="muted">About</span><span>${escapeHtml(m.desc)}</span></div>
    </div>

    ${tradePanel}
  `;
}

// ===================================================================
// Swap
// ===================================================================
const swapState = { from: 'usdc', to: 'sol', amount: '' };

function viewSwap() {
  const swappable = MARKETS.filter((m) => m.type !== 'perp');
  const fromM = findMarket(swapState.from);
  const toM = findMarket(swapState.to);
  const fromPrice = getPrice(swapState.from);
  const toPrice = getPrice(swapState.to);
  const held = store.getState().holdings[swapState.from] || 0;
  const amt = parseFloat(swapState.amount) || 0;
  const usd = amt * fromPrice;
  const fee = usd * 0.0025;
  const out = toPrice > 0 ? (usd - fee) / toPrice : 0;

  const opts = (sel) => swappable.map((m) =>
    `<option value="${m.id}" ${sel === m.id ? 'selected' : ''}>${m.symbol}</option>`).join('');

  return `
    <header class="topbar"><button class="icon-btn" data-go="home">←</button>
      <div class="topbar-title">Swap</div><span style="width:34px"></span></header>

    <section class="swap">
      <div class="swap-box">
        <div class="swap-box-top"><span class="muted">You pay</span>
          <span class="muted sm">Balance: ${fmtNum(held)}</span></div>
        <div class="swap-box-row">
          <input class="swap-input" id="swap-amt" inputmode="decimal" placeholder="0.0" value="${escapeHtml(swapState.amount)}"/>
          <select class="swap-select" id="swap-from">${opts(swapState.from)}</select>
        </div>
        <div class="swap-box-bottom">
          <span class="muted sm">${fmtUsd(usd, { digits: 2 })}</span>
          <button class="link-btn" id="swap-max">Max</button>
        </div>
      </div>

      <button class="swap-flip" id="swap-flip">⇅</button>

      <div class="swap-box">
        <div class="swap-box-top"><span class="muted">You receive</span></div>
        <div class="swap-box-row">
          <input class="swap-input" value="${fmtNum(out)}" readonly/>
          <select class="swap-select" id="swap-to">${opts(swapState.to)}</select>
        </div>
        <div class="swap-box-bottom"><span class="muted sm">${fmtUsd(out * toPrice, { digits: 2 })}</span></div>
      </div>

      <div class="swap-meta">
        <div class="info-row"><span class="muted">Rate</span><span>1 ${fromM.symbol} ≈ ${fmtNum(toPrice>0?fromPrice/toPrice:0)} ${toM.symbol}</span></div>
        <div class="info-row"><span class="muted">Network fee (0.25%)</span><span>${fmtUsd(fee, { digits: 2 })}</span></div>
      </div>

      <button class="btn btn-primary btn-block" id="swap-go">Swap</button>
    </section>
  `;
}

// ===================================================================
// Perps
// ===================================================================
const perpForm = { asset: 'btc-perp', side: 'long', margin: '', leverage: 5 };

function viewPerps() {
  const perpMarkets = MARKETS.filter((m) => m.type === 'perp');
  const m = findMarket(perpForm.asset);
  const price = getPrice(perpForm.asset);
  const margin = parseFloat(perpForm.margin) || 0;
  const lev = perpForm.leverage;
  const notional = margin * lev;
  const liq = perpForm.side === 'long'
    ? price * (1 - 1 / lev * 0.95)
    : price * (1 + 1 / lev * 0.95);
  const positions = store.getState().perps;

  return `
    <header class="topbar"><button class="icon-btn" data-go="home">←</button>
      <div class="topbar-title">⚡ Perps</div><span style="width:34px"></span></header>

    <section class="perp">
      <div class="seg" id="perp-asset-seg">
        ${perpMarkets.map((p) => `<button class="seg-btn ${perpForm.asset === p.id ? 'active' : ''}" data-perp-asset="${p.id}">${p.symbol.replace('-PERP','')}</button>`).join('')}
      </div>

      <div class="perp-price">
        <span>${escapeHtml(m.symbol)}</span>
        <strong>${fmtUsd(price)}</strong>
        <span class="${changeClass(getChangePct(perpForm.asset))}">${fmtPct(getChangePct(perpForm.asset))}</span>
      </div>

      <div class="side-toggle">
        <button class="side long ${perpForm.side === 'long' ? 'active' : ''}" data-side="long">Long</button>
        <button class="side short ${perpForm.side === 'short' ? 'active' : ''}" data-side="short">Short</button>
      </div>

      <label class="field-label">Margin (USD)</label>
      <input class="field" id="perp-margin" inputmode="decimal" placeholder="0.0" value="${escapeHtml(perpForm.margin)}"/>

      <div class="lev-head"><span class="field-label">Leverage</span><span class="lev-val">${lev}×</span></div>
      <input class="slider" id="perp-lev" type="range" min="1" max="${m.maxLev}" step="1" value="${lev}"/>

      <div class="swap-meta">
        <div class="info-row"><span class="muted">Position size</span><span>${fmtUsd(notional, { digits: 2 })}</span></div>
        <div class="info-row"><span class="muted">Entry price</span><span>${fmtUsd(price)}</span></div>
        <div class="info-row"><span class="muted">Est. liquidation</span><span class="down">${margin>0?fmtUsd(liq):'—'}</span></div>
        <div class="info-row"><span class="muted">Funding (8h)</span><span class="${m.funding>=0?'up':'down'}">${fmtPct(m.funding)}</span></div>
      </div>

      <button class="btn btn-block ${perpForm.side === 'long' ? 'btn-long' : 'btn-short'}" id="perp-open">
        ${perpForm.side === 'long' ? 'Open Long' : 'Open Short'} ${escapeHtml(m.symbol)}
      </button>

      <h3 class="section-title">Open positions ${positions.length ? `(${positions.length})` : ''}</h3>
      ${positions.length ? positions.map(perpCard).join('') : '<p class="empty">No open positions.</p>'}
    </section>
  `;
}

function perpCard(pos) {
  const price = getPrice(pos.assetId);
  const pnl = store.perpPnl(pos);
  const roi = pos.margin ? (pnl / pos.margin) * 100 : 0;
  const cls = changeClass(pnl);
  return `
    <div class="pos-card">
      <div class="pos-top">
        <span class="pos-sym">${escapeHtml(pos.symbol)}</span>
        <span class="badge ${pos.side}">${pos.side.toUpperCase()} ${pos.leverage}×</span>
        <button class="link-btn close" data-close="${pos.id}">Close</button>
      </div>
      <div class="pos-grid">
        <div><div class="muted sm">Margin</div><div>${fmtUsd(pos.margin, { digits: 2 })}</div></div>
        <div><div class="muted sm">Entry</div><div>${fmtUsd(pos.entry)}</div></div>
        <div><div class="muted sm">Mark</div><div>${fmtUsd(price)}</div></div>
        <div><div class="muted sm">Liq.</div><div class="down">${fmtUsd(pos.liq)}</div></div>
      </div>
      <div class="pos-pnl ${cls}">
        ${pnl >= 0 ? '+' : ''}${fmtUsd(pnl, { digits: 2 })} <span class="sm">(${fmtPct(roi)})</span>
      </div>
    </div>`;
}

// ===================================================================
// Activity
// ===================================================================
function viewActivity() {
  const acts = store.getState().activity;
  return `
    <header class="topbar"><button class="icon-btn" data-go="home">←</button>
      <div class="topbar-title">Activity</div><span style="width:34px"></span></header>
    <section class="list">
      ${acts.length ? acts.map(activityRow).join('') : '<p class="empty">No activity yet.</p>'}
    </section>`;
}

function activityRow(a) {
  const map = {
    buy:        { icon: '↓', title: `Bought ${a.symbol}`, sub: `${fmtNum(a.qty)} @ ${fmtUsd(a.price)}`, amt: `-${fmtUsd(a.usd, { digits: 2 })}`, cls: 'down' },
    sell:       { icon: '↑', title: `Sold ${a.symbol}`, sub: `${fmtNum(a.qty)} @ ${fmtUsd(a.price)}`, amt: `+${fmtUsd(a.usd, { digits: 2 })}`, cls: 'up' },
    swap:       { icon: '⇄', title: `Swapped ${a.fromSymbol} → ${a.toSymbol}`, sub: `${fmtNum(a.fromQty)} → ${fmtNum(a.toQty)}`, amt: fmtUsd(a.usd, { digits: 2 }), cls: 'flat' },
    receive:    { icon: '↓', title: a.note || 'Received', sub: '', amt: `+${fmtUsd(a.amount, { digits: 2 })}`, cls: 'up' },
    'perp-open':{ icon: '⚡', title: `Open ${a.side} ${a.symbol}`, sub: `${a.leverage}× @ ${fmtUsd(a.entry)}`, amt: `-${fmtUsd(a.margin, { digits: 2 })}`, cls: 'flat' },
    'perp-close':{ icon: '⚡', title: `Close ${a.side} ${a.symbol}`, sub: `PnL ${fmtUsd(a.pnl, { digits: 2 })}`, amt: `+${fmtUsd(a.payout, { digits: 2 })}`, cls: a.pnl >= 0 ? 'up' : 'down' },
    'perp-liq': { icon: '💥', title: `Liquidated ${a.side} ${a.symbol}`, sub: 'Position closed', amt: `-${fmtUsd(a.margin, { digits: 2 })}`, cls: 'down' },
  };
  const d = map[a.kind] || { icon: '•', title: a.kind, sub: '', amt: '', cls: 'flat' };
  return `
    <div class="act-row">
      <span class="act-icon">${d.icon}</span>
      <div class="row-main"><div class="row-title">${d.title}</div><div class="row-sub">${d.sub} · ${timeAgo(a.ts)}</div></div>
      <div class="act-amt ${d.cls}">${d.amt}</div>
    </div>`;
}

// ===================================================================
// Settings
// ===================================================================
function viewSettings() {
  const s = store.getState();
  return `
    <header class="topbar"><button class="icon-btn" data-go="home">←</button>
      <div class="topbar-title">Settings</div><span style="width:34px"></span></header>
    <section class="pad">
      <div class="info-card">
        <div class="info-row"><span class="muted">Address</span><span>${escapeHtml(s.address)}</span></div>
        <div class="info-row"><span class="muted">Buying power</span><span>${fmtUsd(s.cash, { digits: 2 })}</span></div>
        <div class="info-row about"><span class="muted">Recovery phrase</span><span class="seed">${escapeHtml(s.seed)}</span></div>
      </div>
      <p class="disclaimer">⚠️ Demo only — never store a real seed phrase in a web app. All funds and prices here are simulated.</p>
      <button class="btn btn-ghost btn-block" id="reset-wallet">Reset wallet</button>
    </section>`;
}

// ===================================================================
// Bottom nav
// ===================================================================
function navBar() {
  const item = (name, icon, label) =>
    `<button class="nav-item ${route.name === name ? 'active' : ''}" data-go="${name}">
      <span class="nav-ico">${icon}</span><span>${label}</span></button>`;
  return `<nav class="navbar">
    ${item('home', '🏠', 'Home')}
    ${item('swap', '⇄', 'Swap')}
    ${item('perps', '⚡', 'Perps')}
    ${item('activity', '🕘', 'Activity')}
  </nav>`;
}

// ===================================================================
// Event binding (delegated re-bind after each render)
// ===================================================================
function bindEvents() {
  app.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  app.querySelectorAll('[data-asset]').forEach((r) => r.onclick = () => go('asset/' + r.dataset.asset));
  app.querySelectorAll('[data-tab]').forEach((t) => t.onclick = () => { homeTab = t.dataset.tab; render(); });
  app.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => openTradeModal(b.dataset.buy, 'buy'));
  app.querySelectorAll('[data-sell]').forEach((b) => b.onclick = () => openTradeModal(b.dataset.sell, 'sell'));
  app.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => openInfoModal(b.dataset.act));

  const fromSel = document.getElementById('swap-from');
  const toSel = document.getElementById('swap-to');
  const amtIn = document.getElementById('swap-amt');
  if (fromSel) fromSel.onchange = () => { swapState.from = fromSel.value; render(); };
  if (toSel) toSel.onchange = () => { swapState.to = toSel.value; render(); };
  if (amtIn) amtIn.oninput = () => { swapState.amount = amtIn.value; updateSwapPreview(); };
  const flip = document.getElementById('swap-flip');
  if (flip) flip.onclick = () => { [swapState.from, swapState.to] = [swapState.to, swapState.from]; render(); };
  const maxBtn = document.getElementById('swap-max');
  if (maxBtn) maxBtn.onclick = () => { swapState.amount = String(store.getState().holdings[swapState.from] || 0); render(); };
  const swapGo = document.getElementById('swap-go');
  if (swapGo) swapGo.onclick = doSwap;

  app.querySelectorAll('[data-perp-asset]').forEach((b) => b.onclick = () => {
    perpForm.asset = b.dataset.perpAsset;
    const mm = findMarket(perpForm.asset);
    if (perpForm.leverage > mm.maxLev) perpForm.leverage = mm.maxLev;
    render();
  });
  app.querySelectorAll('[data-side]').forEach((b) => b.onclick = () => { perpForm.side = b.dataset.side; render(); });
  const marginIn = document.getElementById('perp-margin');
  if (marginIn) marginIn.oninput = () => { perpForm.margin = marginIn.value; };
  const levIn = document.getElementById('perp-lev');
  if (levIn) levIn.oninput = () => { perpForm.leverage = parseInt(levIn.value, 10); document.querySelector('.lev-val').textContent = perpForm.leverage + '×'; };
  const perpOpen = document.getElementById('perp-open');
  if (perpOpen) perpOpen.onclick = doOpenPerp;
  app.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => {
    const r = store.closePerp(parseFloat(b.dataset.close));
    if (r.ok) toast(`Closed · PnL ${fmtUsd(r.pnl, { digits: 2 })}`);
  });

  const reset = document.getElementById('reset-wallet');
  if (reset) reset.onclick = () => { if (confirm('Reset the demo wallet? This clears all balances and history.')) { store.resetWallet(); go('home'); render(); } };
}

function updateSwapPreview() {
  const amt = parseFloat(swapState.amount) || 0;
  const fromPrice = getPrice(swapState.from);
  const toPrice = getPrice(swapState.to);
  const usd = amt * fromPrice;
  const fee = usd * 0.0025;
  const out = toPrice > 0 ? (usd - fee) / toPrice : 0;
  const recv = app.querySelectorAll('.swap-input')[1];
  if (recv) recv.value = fmtNum(out);
}

function doSwap() {
  const amt = parseFloat(swapState.amount) || 0;
  const r = store.swap(swapState.from, swapState.to, amt);
  if (!r.ok) { toast(r.error); return; }
  toast(`Swapped → ${fmtNum(r.toQty)} ${findMarket(swapState.to).symbol}`);
  swapState.amount = '';
  render();
}

function doOpenPerp() {
  const margin = parseFloat(perpForm.margin) || 0;
  const r = store.openPerp(perpForm.asset, perpForm.side, margin, perpForm.leverage);
  if (!r.ok) { toast(r.error); return; }
  toast(`Opened ${perpForm.side} ${findMarket(perpForm.asset).symbol} ${perpForm.leverage}×`);
  perpForm.margin = '';
  render();
}

// ===================================================================
// Modals
// ===================================================================
function openTradeModal(assetId, mode) {
  const m = findMarket(assetId);
  const price = getPrice(assetId);
  const held = store.getState().holdings[assetId] || 0;
  const cash = store.getState().cash;

  const body = mode === 'buy'
    ? `<div class="modal-sub">Buying power: ${fmtUsd(cash, { digits: 2 })}</div>
       <label class="field-label">Amount (USD)</label>
       <input class="field" id="trade-input" inputmode="decimal" placeholder="0.00"/>
       <div class="quick">${[50, 100, 500].map((v) => `<button class="chip" data-quick="${v}">$${v}</button>`).join('')}
         <button class="chip" data-quick="max">Max</button></div>
       <div class="modal-preview" id="trade-preview">≈ 0 ${m.symbol}</div>`
    : `<div class="modal-sub">Balance: ${fmtNum(held)} ${m.symbol} · ${fmtUsd(held * price, { digits: 2 })}</div>
       <label class="field-label">Amount (${m.symbol})</label>
       <input class="field" id="trade-input" inputmode="decimal" placeholder="0.0"/>
       <div class="quick">${[25, 50, 100].map((v) => `<button class="chip" data-quick="${v}">${v}%</button>`).join('')}</div>
       <div class="modal-preview" id="trade-preview">≈ $0.00</div>`;

  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-head">${avatar(m, 28)}<span>${mode === 'buy' ? 'Buy' : 'Sell'} ${escapeHtml(m.symbol)}</span>
          <button class="icon-btn modal-x">×</button></div>
        <div class="modal-price">${fmtUsd(price)}</div>
        ${body}
        <button class="btn btn-block ${mode === 'buy' ? 'btn-primary' : 'btn-ghost'}" id="trade-confirm">${mode === 'buy' ? 'Buy' : 'Sell'} ${escapeHtml(m.symbol)}</button>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const input = modal.querySelector('#trade-input');
  const preview = modal.querySelector('#trade-preview');
  const close = () => modal.remove();
  modal.querySelector('.modal-x').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const refresh = () => {
    const v = parseFloat(input.value) || 0;
    const p = getPrice(assetId);
    preview.textContent = mode === 'buy'
      ? `≈ ${fmtNum(p > 0 ? v / p : 0)} ${m.symbol}`
      : `≈ ${fmtUsd(v * p, { digits: 2 })}`;
  };
  input.oninput = refresh;

  modal.querySelectorAll('[data-quick]').forEach((b) => b.onclick = () => {
    const q = b.dataset.quick;
    if (mode === 'buy') {
      input.value = q === 'max' ? String(Math.floor(store.getState().cash)) : q;
    } else {
      const pct = parseFloat(q) / 100;
      input.value = String((store.getState().holdings[assetId] || 0) * pct);
    }
    refresh();
  });

  modal.querySelector('#trade-confirm').onclick = () => {
    const v = parseFloat(input.value) || 0;
    const r = mode === 'buy' ? store.buy(assetId, v) : store.sell(assetId, v);
    if (!r.ok) { toast(r.error); return; }
    toast(mode === 'buy' ? `Bought ${fmtNum(r.qty)} ${m.symbol}` : `Sold for ${fmtUsd(r.usd, { digits: 2 })}`);
    close();
    render();
  };
  input.focus();
}

function openInfoModal(kind) {
  const s = store.getState();
  const isReceive = kind === 'receive';
  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-head"><span>${isReceive ? 'Receive' : 'Send'}</span><button class="icon-btn modal-x">×</button></div>
        ${isReceive
          ? `<p class="muted">Share your address to receive demo assets:</p>
             <div class="addr-box">${escapeHtml(s.address)}</div>
             <p class="disclaimer">This is a simulated address for the demo.</p>`
          : `<p class="muted">Sending is disabled in the demo. Use Swap to convert between assets, or Buy/Sell from any asset page.</p>`}
        <button class="btn btn-primary btn-block modal-x">Got it</button>
      </div>
    </div>`);
  document.body.appendChild(modal);
  modal.querySelectorAll('.modal-x').forEach((b) => b.onclick = () => modal.remove());
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ===================================================================
// Toast
// ===================================================================
let toastTimer;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = el('<div id="toast"></div>'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ===================================================================
// Portfolio day-change estimate
// ===================================================================
function portfolioDayChange() {
  const s = store.getState();
  let now = store.spotValue() + store.perpValue();
  let base = 0;
  for (const [id, qty] of Object.entries(s.holdings)) {
    const chg = getChangePct(id) / 100;
    const cur = qty * getPrice(id);
    base += cur / (1 + chg);
  }
  for (const pos of s.perps) base += pos.margin;
  if (base <= 0) return 0;
  return ((now - base) / base) * 100;
}
