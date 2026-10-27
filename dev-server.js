const http = require('http');
const fs = require('fs');
const path = require('path');

const SYMBOLS = ['NVDA', 'TSLA', 'META', 'AMZN', 'MSFT', 'GOOGL', 'AAPL'];
const MIN_REFRESH_COOLDOWN_MS = 60 * 1000; // 60s safety guard against accidental double-clicks (8 credits/min limit)
const DISK_CACHE_PATH = path.join(__dirname, 'quotes-cache.json');
const SNAPSHOT_JS_PATH = path.join(__dirname, 'quotes-snapshot.js');

// Load persisted quote cache from disk if available
function loadDiskCache() {
  try {
    if (fs.existsSync(DISK_CACHE_PATH)) {
      const raw = fs.readFileSync(DISK_CACHE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.payload && Array.isArray(parsed.payload.quotes)) {
        return parsed;
      }
    }
  } catch (_) {
    // Ignore corrupted cache file
  }
  return { timestamp: 0, payload: null };
}

function saveDiskCache(cacheObj) {
  try {
    fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(cacheObj, null, 2), 'utf8');
    if (cacheObj && cacheObj.payload) {
      fs.writeFileSync(
        SNAPSHOT_JS_PATH,
        `window.__MAG7_CACHED_QUOTES__ = ${JSON.stringify(cacheObj.payload)};\n`,
        'utf8'
      );
    }
  } catch (_) {
    // Ignore write errors
  }
}

let quoteCache = loadDiskCache();

// Parse .env.local fresh on demand so saving .env.local takes effect immediately
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  const env = {};
  if (!fs.existsSync(envPath)) return env;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (!eqIdx || eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function getApiKey() {
  const localEnv = loadEnvLocal();
  return (
    localEnv.TWELVE_DATA_API_KEY ||
    localEnv.VITE_TWELVE_DATA_API_KEY ||
    process.env.TWELVE_DATA_API_KEY ||
    ''
  ).trim();
}

async function fetchTwelveDataQuotes(forceRefresh = false) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_twelve_data_api_key_here') {
    return {
      status: 'missing_key',
      message: 'Add your TWELVE_DATA_API_KEY in .env.local to enable live Twelve Data quotes.'
    };
  }

  const now = Date.now();

  // If not explicitly syncing (e.g. just loading/refreshing the page) and we already have a saved snapshot,
  // serve the saved snapshot for 0 API credits!
  if (!forceRefresh && quoteCache.payload) {
    return {
      ...quoteCache.payload,
      cached: true
    };
  }

  // Protect against accidental double-clicks within 60 seconds (Twelve Data free tier = 8 credits/min)
  if (
    forceRefresh &&
    quoteCache.payload &&
    now - quoteCache.timestamp < MIN_REFRESH_COOLDOWN_MS
  ) {
    const waitSec = Math.ceil((MIN_REFRESH_COOLDOWN_MS - (now - quoteCache.timestamp)) / 1000);
    return {
      ...quoteCache.payload,
      cached: true,
      cooldownSec: waitSec
    };
  }

  const url = `https://api.twelvedata.com/quote?symbol=${SYMBOLS.join(',')}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const data = await res.json();

  // Check for top-level Twelve Data error (e.g. 401 invalid key or 429 rate limit)
  if (data.status === 'error' || data.code) {
    if (quoteCache.payload) {
      return {
        ...quoteCache.payload,
        cached: true,
        warning: data.message
      };
    }
    return {
      status: 'error',
      code: data.code || 500,
      message: data.message || 'Twelve Data API error'
    };
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

    // Calculate intraday range volatility factor (1.05 to 2.20)
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

  if (normalized.length === 0) {
    return {
      status: 'error',
      message: 'No valid stock quotes returned from Twelve Data.'
    };
  }

  const payload = {
    status: 'live',
    cached: false,
    updatedAt: new Date().toISOString(),
    marketOpen: anyMarketOpen,
    quotes: normalized
  };

  quoteCache = {
    timestamp: now,
    payload
  };
  saveDiskCache(quoteCache);

  return payload;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // API Endpoint: GET /api/quotes (pass ?refresh=1 to force a live Twelve Data sync)
  if (parsedUrl.pathname === '/api/quotes') {
    const corsHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    };
    try {
      const forceRefresh = parsedUrl.searchParams.get('refresh') === '1';
      const result = await fetchTwelveDataQuotes(forceRefresh);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // Serve Static Files
  let reqPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const baseName = path.basename(safePath);
  if (baseName.startsWith('.env') || baseName === 'quotes-cache.json') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

const env = loadEnvLocal();
const PORT = Number(env.PORT || process.env.PORT || 3000);

server.listen(PORT, async () => {
  console.log(`\n🎰 MAG 7 JACKPOT Server running at http://localhost:${PORT}`);
  console.log(`🔑 On-demand Twelve Data sync enabled (.env.local)`);
  if (!quoteCache.payload) {
    console.log(`🌐 Fetching initial Magnificent 7 quotes from Twelve Data...`);
    try {
      const res = await fetchTwelveDataQuotes(true);
      if (res.status === 'live') {
        console.log(`✅ Synced ${res.quotes.length} stocks! Saved to quotes-cache.json & quotes-snapshot.js\n`);
      } else {
        console.log(`⚠️ Twelve Data response: ${res.message}\n`);
      }
    } catch (err) {
      console.log(`⚠️ Initial sync failed: ${err.message}\n`);
    }
  } else {
    console.log(`📦 Loaded cached snapshot from ${quoteCache.payload.updatedAt}\n`);
  }
});
