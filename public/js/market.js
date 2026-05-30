// Live price simulation engine.
// Seeds a price history per asset and applies a gentle random walk on a timer
// so the UI feels alive. Pure client-side, no network.
import { MARKETS } from '../data/markets.js';

const HISTORY_LEN = 48;       // points kept for sparklines / detail chart
const TICK_MS = 2500;         // how often prices drift

const state = new Map();      // id -> { price, open, history[] }
const listeners = new Set();

function seedHistory(price, vol) {
  const points = [];
  let p = price * (1 - vol * 0.6);
  for (let i = 0; i < HISTORY_LEN; i++) {
    p = p * (1 + (Math.random() - 0.48) * vol * 0.5);
    points.push(p);
  }
  points[points.length - 1] = price;
  return points;
}

export function initMarket() {
  for (const m of MARKETS) {
    const history = seedHistory(m.price, m.vol);
    state.set(m.id, {
      price: m.price,
      open: history[0],
      history,
    });
  }
  setInterval(tick, TICK_MS);
}

function tick() {
  for (const m of MARKETS) {
    const s = state.get(m.id);
    if (!s) continue;
    if (m.stable) {
      s.price = 1 + (Math.random() - 0.5) * 0.0008;
    } else {
      const drift = (Math.random() - 0.5) * m.vol * 0.45;
      s.price = Math.max(s.price * (1 + drift), s.price * 0.5);
    }
    s.history.push(s.price);
    if (s.history.length > HISTORY_LEN) s.history.shift();
  }
  listeners.forEach((fn) => fn());
}

export function getPrice(id) {
  return state.get(id)?.price ?? 0;
}

export function getChangePct(id) {
  const s = state.get(id);
  if (!s || !s.open) return 0;
  return ((s.price - s.open) / s.open) * 100;
}

export function getHistory(id) {
  return state.get(id)?.history ?? [];
}

export function onTick(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
