# 🐙 OctoTrade

A **Phantom-wallet-style** self-custody trading app that puts four asset classes
in one clean mobile UI:

- 📈 **Stocks** — tokenized equities (AAPL, TSLA, NVDA, AMZN, GOOGL, MSFT)
- 🪙 **Tokens** — crypto (SOL, ETH, BTC, USDC, JUP, JTO)
- 🐸 **Meme tokens** — BONK, WIF, PEPE, POPCAT, MEW, DOGE
- ⚡ **Perps** — perpetual futures with leverage, funding & liquidation
  (BTC-PERP, ETH-PERP, SOL-PERP, WIF-PERP)

> ⚠️ **Demo only.** Everything is simulated — prices, balances, and the
> "$25,000" starting balance are play money. There is no real blockchain,
> no real custody, and no real trading. Don't put a real seed phrase anywhere.

## Features

- **Onboarding** — create a wallet, get a (fake) 12-word recovery phrase and
  a starting balance of $25,000 in buying power.
- **Portfolio home** — total balance, today's change, a horizontal strip of
  your holdings, and a live, tabbed market browser (Tokens / Meme / Stocks / Perps).
- **Live prices** — every market drifts on a random walk with inline SVG
  sparklines, so the UI feels alive (fully client-side, no network).
- **Asset detail** — price chart, stats, and Buy / Sell.
- **Buy / Sell** — spot trading with USD amounts, quick-amount chips, and a
  live "you'll receive" preview.
- **Swap** — token-to-token swaps with a 0.25% fee, flip button, and Max.
- **Perps** — long/short, a leverage slider (capped per-market), margin input,
  estimated liquidation price, funding rate, live PnL/ROI, manual close, and
  **automatic liquidation** when the mark price crosses your liq price.
- **Activity** — a full, human-readable history of every buy, sell, swap, and
  perp event.
- **Persistence** — wallet, holdings, positions, and history are saved to
  `localStorage` and survive refreshes.

## Run it

No build step, no dependencies, works fully offline.

```bash
npm start
# open http://localhost:4173
```

(Custom port: `PORT=8080 npm start`.) The app is plain ES modules, so any static
file server pointed at `public/` works too.

## Project layout

```
server/server.js        Zero-dependency static file server (Node, no deps)
public/index.html       App shell
public/css/styles.css   Phantom-inspired dark theme
public/data/markets.js  The market universe (stocks, tokens, memes, perps)
public/js/market.js     Live price simulation + sparkline history
public/js/store.js      Wallet state, trading logic, persistence
public/js/ui.js         Formatting + SVG sparkline/avatar helpers
public/js/app.js        Router, views, and modals
```

## Tech

Vanilla JavaScript (ES modules), no framework, no build tooling — chosen so the
app runs anywhere with just Node for the static server. State lives in a small
observable store; the UI re-renders on price ticks and state changes.

## Disclaimer

This is an educational/demo project. It is **not** financial software, does not
connect to any exchange or blockchain, and must not be used for real trading.
