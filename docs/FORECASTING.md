# Revenue & Demand Forecasting

Every other analytics view looks backward. This one looks **forward**: given your
order history, what's revenue likely to do over the next 30 days, and what's the
best/worst case? It's the "forecasting" slice of the PC #2 overnight batch.

## What it does

1. Builds a continuous **daily revenue (and orders) series** from the CRM order log (gap-filled with zeros so the model sees an unbroken timeline).
2. Fits **Holt's linear trend** (double exponential smoothing) on the deseasonalised series, then re-applies a **day-of-week seasonal index** (weekends ≠ weekdays for WhatsApp commerce).
3. Projects `horizon` days ahead with **95% confidence bands** that widen the further out you look.
4. **Backtests** itself: holds out the last 14 days, forecasts them, and reports accuracy (100 − MAPE) so you know how much to trust it.

Reads `storeCRM` only. Rebuilds nothing. No Prophet / TensorFlow / Python — pure
JS, runs in milliseconds.

## Why Holt + day-of-week (not something fancier)

With a few months of daily data, trend + weekly seasonality captures the real
signal; anything heavier (ARIMA grid search, neural nets) overfits on this
volume and adds a dependency stack you don't want on PC #2. The model is
transparent and the backtest keeps it honest. When there's a year+ of data,
adding an annual/holiday term is the natural next step.

## Run it

```bash
npm run forecast:check   # validate install + model math on synthetic series
npm run forecast:batch   # build snapshot -> public/forecast/snapshot.json
```

Dashboard: **`/forecast.html`** — actuals → forecast with a shaded band + the
day-of-week pattern + backtest accuracy.

## Schedule on PC #2

```cron
25 3 * * *  cd /path/to/supersenderpro && node scripts/forecast-batch.js
```

Env: `FORECAST_HISTORY_DAYS` (default 120) — how much history to train on.

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// FORECAST HOOK
app.use('/api', require('./routes/forecastRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/forecast/snapshot?horizon=30` | Actuals + forecast + backtest for one store |
| GET | `/api/forecast/all` | All stores |

## Upgrade path

Postgres swap touches only the series builder in `lib/forecasting/index.js`; the
model in `forecastEngine.js` is data-source agnostic.
