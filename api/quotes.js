const fs = require('fs');
const path = require('path');

const SYMBOLS = ['NVDA', 'TSLA', 'META', 'AMZN', 'MSFT', 'GOOGL', 'AAPL'];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400'); // Edge cache 4 hours

  const apiKey = (process.env.TWELVE_DATA_API_KEY || '').trim();

  // If no API key configured on Vercel yet, try fallback snapshot or mock
  if (!apiKey) {
    return res.status(200).json({
      status: 'missing_key',
      message: 'Add TWELVE_DATA_API_KEY to your Vercel Environment Variables.'
    });
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${SYMBOLS.join(',')}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'error' || data.code) {
      return res.status(200).json({
        status: 'error',
        message: data.message || 'Twelve Data API Error'
      });
    }

    const normalized = [];
    let anyMarketOpen = false;

    for (const sym of SYMBOLS) {
      const item = data[sym];
      if (!item || item.status === 'error') continue;

      const price = parseFloat(item.close || item.price || 0);
      const changePct = parseFloat(item.percent_change || 0);
      const high = parseFloat(item.high || price);
      const low = parseFloat(item.low || price);
      const open = parseFloat(item.open || price);

      if (item.is_market_open) anyMarketOpen = true;

      const intradayRangePct = open > 0 ? ((high - low) / open) * 100 : Math.abs(changePct);
      const volatility = Math.max(1.05, Math.min(2.2, Number((1.0 + intradayRangePct * 0.15).toFixed(2))));

      if (price > 0) {
        normalized.push({
          id: sym,
          name: item.name || sym,
          price: Number(price.toFixed(2)),
          changePct: Number(changePct.toFixed(2)),
          volatility,
          isMarketOpen: Boolean(item.is_market_open),
          datetime: item.datetime || null
        });
      }
    }

    return res.status(200).json({
      status: 'live',
      cached: false,
      updatedAt: new Date().toISOString(),
      marketOpen: anyMarketOpen,
      quotes: normalized
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
