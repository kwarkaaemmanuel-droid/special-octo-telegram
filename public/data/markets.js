// Static market universe for OctoTrade.
// Prices are seed values; live price drift is simulated client-side in market.js.
// Categories: token (crypto), meme (meme coins), stock (tokenized equities), perp (perpetual futures).

export const MARKETS = [
  // ---- Crypto tokens ----
  { id: 'sol',   symbol: 'SOL',   name: 'Solana',        type: 'token', price: 168.42, vol: 0.04, color: '#14f195', glyph: '◎', desc: 'High-throughput L1 blockchain.' },
  { id: 'eth',   symbol: 'ETH',   name: 'Ethereum',      type: 'token', price: 3512.10, vol: 0.035, color: '#627eea', glyph: 'Ξ', desc: 'Smart contract platform.' },
  { id: 'btc',   symbol: 'BTC',   name: 'Bitcoin',       type: 'token', price: 67250.0, vol: 0.025, color: '#f7931a', glyph: '₿', desc: 'The original cryptocurrency.' },
  { id: 'usdc',  symbol: 'USDC',  name: 'USD Coin',      type: 'token', price: 1.00, vol: 0.0005, color: '#2775ca', glyph: '$', desc: 'Fully-backed USD stablecoin.', stable: true },
  { id: 'jup',   symbol: 'JUP',   name: 'Jupiter',       type: 'token', price: 0.84, vol: 0.06, color: '#c7f284', glyph: '🪐', desc: 'Solana DeFi aggregator.' },
  { id: 'jto',   symbol: 'JTO',   name: 'Jito',          type: 'token', price: 2.91, vol: 0.06, color: '#3ad1c3', glyph: 'J', desc: 'Liquid staking + MEV.' },

  // ---- Meme tokens ----
  { id: 'bonk',  symbol: 'BONK',  name: 'Bonk',          type: 'meme', price: 0.0000241, vol: 0.11, color: '#f7a600', glyph: '🐕', desc: 'The first Solana dog coin.' },
  { id: 'wif',   symbol: 'WIF',   name: 'dogwifhat',     type: 'meme', price: 2.18, vol: 0.13, color: '#c8a06a', glyph: '🧢', desc: 'A dog. With a hat.' },
  { id: 'pepe',  symbol: 'PEPE',  name: 'Pepe',          type: 'meme', price: 0.0000119, vol: 0.14, color: '#4caf50', glyph: '🐸', desc: 'The meme to end all memes.' },
  { id: 'popcat',symbol: 'POPCAT',name: 'Popcat',        type: 'meme', price: 1.42, vol: 0.15, color: '#e8c07d', glyph: '🐱', desc: 'Pop the cat.' },
  { id: 'mew',   symbol: 'MEW',   name: 'cat in a dogs world', type: 'meme', price: 0.0072, vol: 0.16, color: '#b07d3a', glyph: '😼', desc: 'A cat, in a dogs world.' },
  { id: 'doge',  symbol: 'DOGE',  name: 'Dogecoin',      type: 'meme', price: 0.162, vol: 0.09, color: '#c2a633', glyph: '🐶', desc: 'Much wow. The OG meme coin.' },

  // ---- Tokenized stocks ----
  { id: 'aapl',  symbol: 'AAPL',  name: 'Apple Inc.',    type: 'stock', price: 212.55, vol: 0.018, color: '#a2aaad', glyph: '', desc: 'Consumer tech hardware & services.' },
  { id: 'tsla',  symbol: 'TSLA',  name: 'Tesla Inc.',    type: 'stock', price: 248.10, vol: 0.04, color: '#e82127', glyph: 'T', desc: 'Electric vehicles & energy.' },
  { id: 'nvda',  symbol: 'NVDA',  name: 'NVIDIA Corp.',  type: 'stock', price: 131.26, vol: 0.035, color: '#76b900', glyph: 'N', desc: 'GPUs & accelerated computing.' },
  { id: 'amzn',  symbol: 'AMZN',  name: 'Amazon.com',    type: 'stock', price: 186.40, vol: 0.02, color: '#ff9900', glyph: 'a', desc: 'E-commerce & cloud (AWS).' },
  { id: 'googl', symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', price: 178.92, vol: 0.02, color: '#4285f4', glyph: 'G', desc: 'Search, ads & cloud.' },
  { id: 'msft',  symbol: 'MSFT',  name: 'Microsoft',     type: 'stock', price: 449.78, vol: 0.017, color: '#00a4ef', glyph: '⊞', desc: 'Software & cloud (Azure).' },

  // ---- Perpetual futures ----
  { id: 'btc-perp', symbol: 'BTC-PERP', name: 'Bitcoin Perp', type: 'perp', price: 67280.0, vol: 0.03, color: '#f7931a', glyph: '₿', desc: 'BTC perpetual swap.', funding: 0.0091, maxLev: 50, underlying: 'btc' },
  { id: 'eth-perp', symbol: 'ETH-PERP', name: 'Ethereum Perp', type: 'perp', price: 3514.0, vol: 0.04, color: '#627eea', glyph: 'Ξ', desc: 'ETH perpetual swap.', funding: 0.0075, maxLev: 50, underlying: 'eth' },
  { id: 'sol-perp', symbol: 'SOL-PERP', name: 'Solana Perp', type: 'perp', price: 168.6, vol: 0.05, color: '#14f195', glyph: '◎', desc: 'SOL perpetual swap.', funding: 0.0123, maxLev: 20, underlying: 'sol' },
  { id: 'wif-perp', symbol: 'WIF-PERP', name: 'dogwifhat Perp', type: 'perp', price: 2.19, vol: 0.13, color: '#c8a06a', glyph: '🧢', desc: 'WIF perpetual swap.', funding: 0.0210, maxLev: 10, underlying: 'wif' },
];

export const CATEGORY_LABELS = {
  token: 'Tokens',
  meme: 'Meme',
  stock: 'Stocks',
  perp: 'Perps',
};

export function findMarket(id) {
  return MARKETS.find((m) => m.id === id);
}
