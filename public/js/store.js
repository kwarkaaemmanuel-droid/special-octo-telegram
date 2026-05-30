// Wallet state + persistence. All values are demo funds — no real money.
import { getPrice } from './market.js';
import { findMarket } from '../data/markets.js';

const KEY = 'octotrade.wallet.v1';
const listeners = new Set();

const DEFAULT_STATE = () => ({
  created: false,
  address: '',
  seed: '',
  cash: 25000,
  holdings: {},
  perps: [],
  activity: [],
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_STATE(), ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STATE();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((fn) => fn());
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

const WORDS = ['ocean','signal','copper','maple','quantum','river','ember','pixel','cobalt','lunar','drift','spruce','vivid','tidal','nimbus','zephyr'];

export function createWallet() {
  const seed = Array.from({ length: 12 }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join(' ');
  const address = 'oct' + Math.random().toString(36).slice(2, 6) + '...' + Math.random().toString(36).slice(2, 6);
  state = { ...DEFAULT_STATE(), created: true, seed, address };
  logActivity('receive', { note: 'Welcome bonus', amount: 25000, symbol: 'USD' });
  persist();
  return state;
}

export function resetWallet() {
  state = DEFAULT_STATE();
  persist();
}

function logActivity(kind, data) {
  state.activity.unshift({ id: Date.now() + Math.random(), kind, ts: Date.now(), ...data });
  if (state.activity.length > 100) state.activity.length = 100;
}

export function buy(assetId, usdAmount) {
  const m = findMarket(assetId);
  const price = getPrice(assetId);
  if (!m || price <= 0) return { ok: false, error: 'Market unavailable' };
  if (usdAmount <= 0) return { ok: false, error: 'Enter an amount' };
  if (usdAmount > state.cash) return { ok: false, error: 'Insufficient buying power' };
  const qty = usdAmount / price;
  state.cash -= usdAmount;
  state.holdings[assetId] = (state.holdings[assetId] || 0) + qty;
  logActivity('buy', { assetId, symbol: m.symbol, qty, price, usd: usdAmount });
  persist();
  return { ok: true, qty };
}

export function sell(assetId, qty) {
  const m = findMarket(assetId);
  const price = getPrice(assetId);
  const held = state.holdings[assetId] || 0;
  if (!m || price <= 0) return { ok: false, error: 'Market unavailable' };
  if (qty <= 0) return { ok: false, error: 'Enter an amount' };
  if (qty > held + 1e-12) return { ok: false, error: 'Not enough balance' };
  const usd = qty * price;
  state.holdings[assetId] = held - qty;
  if (state.holdings[assetId] < 1e-12) delete state.holdings[assetId];
  state.cash += usd;
  logActivity('sell', { assetId, symbol: m.symbol, qty, price, usd });
  persist();
  return { ok: true, usd };
}

export function swap(fromId, toId, fromQty) {
  const fromM = findMarket(fromId);
  const toM = findMarket(toId);
  const fromPrice = getPrice(fromId);
  const toPrice = getPrice(toId);
  const held = state.holdings[fromId] || 0;
  if (!fromM || !toM) return { ok: false, error: 'Market unavailable' };
  if (fromId === toId) return { ok: false, error: 'Pick two different assets' };
  if (fromQty <= 0) return { ok: false, error: 'Enter an amount' };
  if (fromQty > held + 1e-12) return { ok: false, error: 'Not enough balance' };
  const usd = fromQty * fromPrice;
  const fee = usd * 0.0025;
  const toQty = (usd - fee) / toPrice;
  state.holdings[fromId] = held - fromQty;
  if (state.holdings[fromId] < 1e-12) delete state.holdings[fromId];
  state.holdings[toId] = (state.holdings[toId] || 0) + toQty;
  logActivity('swap', { fromSymbol: fromM.symbol, toSymbol: toM.symbol, fromQty, toQty, usd });
  persist();
  return { ok: true, toQty, fee };
}

export function openPerp(assetId, side, margin, leverage) {
  const m = findMarket(assetId);
  const price = getPrice(assetId);
  if (!m || price <= 0) return { ok: false, error: 'Market unavailable' };
  if (margin <= 0) return { ok: false, error: 'Enter margin' };
  if (margin > state.cash) return { ok: false, error: 'Insufficient buying power' };
  const lev = Math.max(1, Math.min(leverage, m.maxLev || 20));
  const notional = margin * lev;
  const size = notional / price;
  const liq = side === 'long'
    ? price * (1 - 1 / lev * 0.95)
    : price * (1 + 1 / lev * 0.95);
  state.cash -= margin;
  const pos = {
    id: Date.now() + Math.random(),
    assetId, symbol: m.symbol, side, margin, leverage: lev,
    entry: price, size, liq, ts: Date.now(),
  };
  state.perps.push(pos);
  logActivity('perp-open', { symbol: m.symbol, side, margin, leverage: lev, entry: price });
  persist();
  return { ok: true, pos };
}

export function perpPnl(pos) {
  const price = getPrice(pos.assetId);
  const dir = pos.side === 'long' ? 1 : -1;
  return (price - pos.entry) * pos.size * dir;
}

export function closePerp(posId) {
  const idx = state.perps.findIndex((p) => p.id === posId);
  if (idx === -1) return { ok: false, error: 'Position not found' };
  const pos = state.perps[idx];
  const pnl = perpPnl(pos);
  const payout = Math.max(0, pos.margin + pnl);
  state.cash += payout;
  state.perps.splice(idx, 1);
  logActivity('perp-close', { symbol: pos.symbol, side: pos.side, pnl, payout });
  persist();
  return { ok: true, pnl, payout };
}

export function checkLiquidations() {
  let changed = false;
  for (const pos of [...state.perps]) {
    const price = getPrice(pos.assetId);
    const hit = pos.side === 'long' ? price <= pos.liq : price >= pos.liq;
    if (hit) {
      const idx = state.perps.findIndex((p) => p.id === pos.id);
      if (idx !== -1) state.perps.splice(idx, 1);
      logActivity('perp-liq', { symbol: pos.symbol, side: pos.side, margin: pos.margin });
      changed = true;
    }
  }
  if (changed) persist();
  return changed;
}

export function spotValue() {
  let v = 0;
  for (const [id, qty] of Object.entries(state.holdings)) v += qty * getPrice(id);
  return v;
}

export function perpValue() {
  let v = 0;
  for (const pos of state.perps) v += pos.margin + perpPnl(pos);
  return v;
}

export function totalValue() {
  return state.cash + spotValue() + perpValue();
}
