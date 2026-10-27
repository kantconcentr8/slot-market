// MAG 7 JACKPOT — Wall Street Casino Slot Machine
// Dynamic Market Multiplier Engine + 3-Reel Vegas Cabinet

const MAG7_STOCKS = [
  {
    id: 'NVDA',
    name: 'NVIDIA',
    icon: '🟢',
    badge: '⚡',
    price: 142.80,
    changePct: 4.85,
    volatility: 1.45,
    bgGradient: 'linear-gradient(135deg, #3a7d0a 0%, #76b900 52%, #1b3d04 100%)',
    borderColor: '#bef264'
  },
  {
    id: 'TSLA',
    name: 'Tesla',
    icon: '🔴',
    badge: '🚀',
    price: 268.40,
    changePct: 3.92,
    volatility: 1.55,
    bgGradient: 'linear-gradient(135deg, #991b1b 0%, #e82127 52%, #450a0a 100%)',
    borderColor: '#fca5a5'
  },
  {
    id: 'META',
    name: 'Meta',
    icon: '🔵',
    badge: '♾️',
    price: 592.10,
    changePct: 2.74,
    volatility: 1.25,
    bgGradient: 'linear-gradient(135deg, #1d4ed8 0%, #0668E1 52%, #172554 100%)',
    borderColor: '#93c5fd'
  },
  {
    id: 'AMZN',
    name: 'Amazon',
    icon: '🟠',
    badge: '📦',
    price: 214.60,
    changePct: 2.15,
    volatility: 1.20,
    bgGradient: 'linear-gradient(135deg, #9a3412 0%, #ff9900 55%, #431407 100%)',
    borderColor: '#fdba74'
  },
  {
    id: 'MSFT',
    name: 'Microsoft',
    icon: '🟦',
    badge: '🪟',
    price: 448.90,
    changePct: 1.68,
    volatility: 1.15,
    bgGradient: 'linear-gradient(135deg, #0369a1 0%, #00a4ef 52%, #082f49 100%)',
    borderColor: '#7dd3fc'
  },
  {
    id: 'GOOGL',
    name: 'Alphabet',
    icon: '🟡',
    badge: '🔍',
    price: 186.30,
    changePct: 1.24,
    volatility: 1.12,
    bgGradient: 'linear-gradient(135deg, #1e40af 0%, #ea4335 50%, #ca8a04 100%)',
    borderColor: '#fde047'
  },
  {
    id: 'AAPL',
    name: 'Apple',
    icon: '⚪',
    badge: '🍎',
    price: 236.50,
    changePct: 0.95,
    volatility: 1.10,
    bgGradient: 'linear-gradient(135deg, #4b5563 0%, #1f2937 52%, #090d16 100%)',
    borderColor: '#e5e7eb'
  }
];

const MARKET_CATALYSTS = [
  { title: 'NVDA AI GPU SUPERCYCLE ANNOUNCED!', targets: ['NVDA'], boost: 4.6 },
  { title: 'TSLA FULL SELF-DRIVING SHORT SQUEEZE!', targets: ['TSLA'], boost: 5.4 },
  { title: 'AAPL RECORD IPHONE SUPER-UPGRADE CYCLE!', targets: ['AAPL'], boost: 3.9 },
  { title: 'META AI AD-REVENUE EARNINGS BLOWOUT!', targets: ['META'], boost: 4.2 },
  { title: 'AWS & AZURE CLOUD DEMAND SURGE!', targets: ['AMZN', 'MSFT'], boost: 3.5 },
  { title: 'GOOGL QUANTUM & GEMINI BREAKTHROUGH!', targets: ['GOOGL'], boost: 4.1 },
  { title: 'FED EMERGENCY RATE CUT — MAG 7 RALLY!', targets: ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA'], boost: 2.8 }
];

const BET_LEVELS = [10, 25, 50, 100, 250];

// Base jackpot credit multipliers relative to Bet
const TIER_CONFIG = {
  grand: {
    label: 'GRAND',
    baseDisplayAt50: 1250000,
    creditBetMult: 250, // 250x bet * stock dynamic mult
  },
  major: {
    label: 'MAJOR',
    baseDisplayAt50: 100000,
    creditBetMult: 80,
  },
  minor: {
    label: 'MINOR',
    baseDisplayAt50: 10000,
    creditBetMult: 30,
  },
  mini: {
    label: 'MINI',
    baseDisplayAt50: 1000,
    creditBetMult: 12,
  }
};

// Game State
const state = {
  credits: 1250,
  betIndex: 2, // 50 default (matches image!)
  lastWin: 1000, // matches 1000 on initial display
  isSpinning: false,
  soundEnabled: true,
  isLiveFeedActive: false,
  // Current 3 visible symbols per reel [top, center, bottom]
  reelView: [
    ['AMZN', 'NVDA', 'META'],
    ['GOOGL', 'NVDA', 'GOOGL'],
    ['AAPL', 'NVDA', 'AAPL']
  ],
  rankedStocks: [],
  tierAssignments: {} // symbolId -> 'grand' | 'major' | 'minor' | 'mini'
};

// Web Audio Synthesizer for Casino Sounds
class CasinoAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tone(freq, duration = 0.08, type = 'triangle', gainVal = 0.12, delay = 0) {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playButton() {
    this.tone(580, 0.06, 'square', 0.08);
    this.tone(860, 0.07, 'triangle', 0.1, 0.04);
  }

  playReelTick() {
    this.tone(240 + Math.random() * 80, 0.03, 'sawtooth', 0.045);
  }

  playReelStop(reelIdx) {
    const base = 180 + reelIdx * 55;
    this.tone(base, 0.11, 'square', 0.14);
  }

  playBillInsert() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, 0.12, 'triangle', 0.13, i * 0.07);
    });
  }

  playWinFanfare(isGrand = false) {
    const notes = isGrand
      ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5]
      : [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      this.tone(f, 0.18, 'triangle', 0.16, idx * 0.09);
    });
  }
}

const audio = new CasinoAudio();

// Compute dynamic multiplier for a stock from its daily % change & volatility
function getStockMultiplier(stock) {
  const perfBoost = Math.max(-0.25, stock.changePct * 0.12);
  const raw = 1.0 + perfBoost + (stock.volatility - 1.0) * 0.6;
  return Math.max(1.0, Math.min(4.5, Number(raw.toFixed(2))));
}

// Rank Mag 7 stocks by daily % change & assign to GRAND / MAJOR / MINOR / MINI
function updateMarketRankings() {
  const sorted = [...MAG7_STOCKS].sort((a, b) => b.changePct - a.changePct);
  state.rankedStocks = sorted;

  // Map top #1 -> grand, #2-#3 -> major, #4-#5 -> minor, #6-#7 -> mini
  const map = {};
  sorted.forEach((s, idx) => {
    if (idx === 0) map[s.id] = 'grand';
    else if (idx <= 2) map[s.id] = 'major';
    else if (idx <= 4) map[s.id] = 'minor';
    else map[s.id] = 'mini';
  });
  state.tierAssignments = map;

  renderJackpotBoard();
  renderTickerTape();
  renderPaytableModal();
}

function getStockById(id) {
  return MAG7_STOCKS.find((s) => s.id === id) || MAG7_STOCKS[0];
}

// Format dollar strings like $1,250,000.00
function formatDollars(num) {
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Render the 4 Jackpot Tiers on the cabinet upper display
function renderJackpotBoard() {
  const bet = BET_LEVELS[state.betIndex];
  const betScale = bet / 50; // Reference photo shows $1.25M at Bet 50

  const tierGroups = {
    grand: state.rankedStocks.slice(0, 1),
    major: state.rankedStocks.slice(1, 3),
    minor: state.rankedStocks.slice(3, 5),
    mini: state.rankedStocks.slice(5, 7)
  };

  Object.keys(tierGroups).forEach((tierKey) => {
    const stocks = tierGroups[tierKey];
    const cfg = TIER_CONFIG[tierKey];
    const avgMult =
      stocks.reduce((acc, s) => acc + getStockMultiplier(s), 0) / stocks.length;

    const jackpotVal = cfg.baseDisplayAt50 * betScale * avgMult;

    // Render 3 symbol chips on the left of the row
    // If tier has 1 stock (GRAND), show 3 of that stock (e.g. NVDA NVDA NVDA)
    // If tier has 2 stocks, show [S1, S1/S2, S2]
    const displayTrio =
      stocks.length === 1
        ? [stocks[0], stocks[0], stocks[0]]
        : [stocks[0], stocks[0], stocks[1]];

    const symContainer = document.getElementById(`tierSymbols-${tierKey}`);
    if (symContainer) {
      symContainer.innerHTML = displayTrio
        .map(
          (st) => `
          <div class="mini-stock-chip" style="background:${st.bgGradient}; border-color:${st.borderColor}" title="${st.name} (${st.changePct >= 0 ? '+' : ''}${st.changePct.toFixed(2)}%)">
            <span class="chip-icon">${st.badge}</span>
            <span class="chip-sym">${st.id}</span>
          </div>
        `
        )
        .join('');
    }

    const multEl = document.getElementById(`tierMult-${tierKey}`);
    if (multEl) {
      const names = stocks.map((s) => s.id).join('/');
      multEl.textContent = `${names} • ${avgMult.toFixed(2)}x`;
    }

    const amountEl = document.getElementById(`tierAmount-${tierKey}`);
    if (amountEl) {
      amountEl.textContent = formatDollars(jackpotVal);
    }
  });
}

// Render scrolling NASDAQ ticker tape at top
function renderTickerTape() {
  const tape = document.getElementById('tickerTape');
  if (!tape) return;

  const itemsHtml = state.rankedStocks
    .map((s, idx) => {
      const sign = s.changePct >= 0 ? '+' : '';
      const dirClass = s.changePct >= 0 ? 'ticker-up' : 'ticker-down';
      const arrow = s.changePct >= 0 ? '▲' : '▼';
      const mult = getStockMultiplier(s).toFixed(2);
      const tierName = state.tierAssignments[s.id].toUpperCase();
      return `
        <span class="ticker-item">
          <span class="ticker-sym">#${idx + 1} ${s.id}</span>
          <span>$${s.price.toFixed(2)}</span>
          <span class="${dirClass}">${arrow} ${sign}${s.changePct.toFixed(2)}%</span>
          <span class="ticker-mult-pill">${tierName} ${mult}x</span>
        </span>
      `;
    })
    .join('');

  // Duplicate for seamless infinite loop
  tape.innerHTML = itemsHtml + itemsHtml;
}

// Create HTML for a single stock symbol cell on a reel
function createStockCellHtml(symbolId, isCenterPayline = false) {
  const st = getStockById(symbolId);
  const sign = st.changePct >= 0 ? '+' : '';
  const negClass = st.changePct < 0 ? 'neg' : '';
  return `
    <div class="reel-cell" data-symbol="${st.id}">
      <div class="stock-tile ${isCenterPayline ? 'payline-tile' : ''}" style="background:${st.bgGradient}; border-color:${st.borderColor}">
        <div class="stock-top-row">
          <span class="stock-logo-badge">${st.badge}</span>
          <span class="stock-ticker-code">${st.id}</span>
        </div>
        <div class="stock-sub-row">
          <span class="stock-company-name">${st.name}</span>
          <span class="stock-move-pill ${negClass}">${sign}${st.changePct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  `;
}

// Render static 3-row view [top, center, bottom] for a specific reel
function renderReelStatic(reelIdx) {
  const strip = document.getElementById(`reelStrip${reelIdx}`);
  if (!strip) return;
  const [topSym, centerSym, bottomSym] = state.reelView[reelIdx];
  strip.style.transition = 'none';
  strip.style.transform = 'translateY(0px)';
  strip.innerHTML =
    createStockCellHtml(topSym, false) +
    createStockCellHtml(centerSym, true) +
    createStockCellHtml(bottomSym, false);
}

function renderAllReelsStatic() {
  for (let i = 0; i < 3; i++) {
    renderReelStatic(i);
  }
}

// Update LED displays (CREDITS, BET, WIN)
function updateLedDisplays() {
  const creditsEl = document.getElementById('ledCredits');
  const betEl = document.getElementById('ledBet');
  const winEl = document.getElementById('ledWin');

  if (creditsEl) creditsEl.textContent = Math.floor(state.credits);
  if (betEl) betEl.textContent = BET_LEVELS[state.betIndex];
  if (winEl) winEl.textContent = Math.floor(state.lastWin);
}

// Random weighted symbol pick
function pickRandomSymbolId() {
  const idx = Math.floor(Math.random() * MAG7_STOCKS.length);
  return MAG7_STOCKS[idx].id;
}

// Clear any active win highlights
function clearWinHighlights() {
  document.querySelectorAll('.tier-row').forEach((el) => el.classList.remove('tier-hit'));
  document.querySelectorAll('.stock-tile').forEach((el) => el.classList.remove('win-highlight'));
  const beam = document.getElementById('paylineBeam');
  if (beam) beam.classList.remove('win-beam');
  const siren = document.getElementById('sirenTower');
  if (siren) siren.classList.remove('siren-active');
}

// Spin a single reel drum with a long strip of symbols that settles on targetTrio
function animateSingleReel(reelIdx, targetTrio, durationMs) {
  return new Promise((resolve) => {
    const strip = document.getElementById(`reelStrip${reelIdx}`);
    if (!strip) {
      resolve();
      return;
    }

    const cellHeight = 72;
    const spinSteps = 14 + reelIdx * 5; // Reel 0 stops first, Reel 1 second, Reel 2 last
    const currentTrio = state.reelView[reelIdx];

    // Build strip: [targetTrio (at top, index 0..2), random fillers..., currentTrio (at bottom)]
    // We start translated to the bottom showing currentTrio, then transition to translateY(0) showing targetTrio!
    const cells = [];
    cells.push(createStockCellHtml(targetTrio[0], false));
    cells.push(createStockCellHtml(targetTrio[1], true));
    cells.push(createStockCellHtml(targetTrio[2], false));

    for (let i = 0; i < spinSteps; i++) {
      cells.push(createStockCellHtml(pickRandomSymbolId(), false));
    }

    cells.push(createStockCellHtml(currentTrio[0], false));
    cells.push(createStockCellHtml(currentTrio[1], false));
    cells.push(createStockCellHtml(currentTrio[2], false));

    strip.style.transition = 'none';
    strip.innerHTML = cells.join('');

    const totalOffset = (spinSteps + 3) * cellHeight;
    strip.style.transform = `translateY(-${totalOffset}px)`;

    // Force layout reflow before starting CSS transition
    void strip.offsetHeight;

    // Mechanical bounce cubic-bezier at the end of the spin
    strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.12, 0.85, 0.22, 1.04)`;
    strip.style.transform = 'translateY(0px)';

    // Tick sound interval during spin
    const tickInterval = setInterval(() => {
      audio.playReelTick();
    }, 95);

    setTimeout(() => {
      clearInterval(tickInterval);
      state.reelView[reelIdx] = targetTrio;
      renderReelStatic(reelIdx);
      audio.playReelStop(reelIdx);
      resolve();
    }, durationMs);
  });
}

// Evaluate center payline result [sym0, sym1, sym2]
function evaluatePayline(centerLine) {
  const [s0, s1, s2] = centerLine;
  const st0 = getStockById(s0);
  const st1 = getStockById(s1);
  const st2 = getStockById(s2);
  const bet = BET_LEVELS[state.betIndex];

  // 1. Exact 3-of-a-Kind (e.g. NVDA - NVDA - NVDA)
  if (s0 === s1 && s1 === s2) {
    const tierKey = state.tierAssignments[s0] || 'mini';
    const tierCfg = TIER_CONFIG[tierKey];
    const mult = getStockMultiplier(st0);
    const winCredits = Math.round(bet * tierCfg.creditBetMult * mult);
    return {
      winCredits,
      tierKey,
      winIndices: [0, 1, 2],
      isGrand: tierKey === 'grand',
      message: `🎰 ${tierCfg.label} JACKPOT! 3× ${s0} (${mult.toFixed(2)}x VOLATILITY BOOST) = +${winCredits.toLocaleString()} CREDITS!`
    };
  }

  // 2. "AI Hyperscaler Trio" Bonus (NVDA + MSFT + GOOGL in any order)
  const trioSet = new Set(centerLine);
  if (trioSet.has('NVDA') && trioSet.has('MSFT') && trioSet.has('GOOGL')) {
    const avgMult = (getStockMultiplier(st0) + getStockMultiplier(st1) + getStockMultiplier(st2)) / 3;
    const winCredits = Math.round(bet * 25 * avgMult);
    return {
      winCredits,
      tierKey: 'major',
      winIndices: [0, 1, 2],
      isGrand: false,
      message: `🤖 AI SUPERCYCLE TRIO (NVDA + MSFT + GOOGL)! +${winCredits.toLocaleString()} CREDITS!`
    };
  }

  // 3. Same-Tier Mixed 3-of-a-Kind (e.g. both stocks in MAJOR tier)
  const t0 = state.tierAssignments[s0];
  const t1 = state.tierAssignments[s1];
  const t2 = state.tierAssignments[s2];
  if (t0 && t0 === t1 && t1 === t2) {
    const avgMult = (getStockMultiplier(st0) + getStockMultiplier(st1) + getStockMultiplier(st2)) / 3;
    const winCredits = Math.round(bet * 15 * avgMult);
    return {
      winCredits,
      tierKey: t0,
      winIndices: [0, 1, 2],
      isGrand: false,
      message: `📈 ${t0.toUpperCase()} SECTOR SWEEP (${s0}•${s1}•${s2})! +${winCredits.toLocaleString()} CREDITS!`
    };
  }

  // 4. Any Pair of Matching Mag 7 Stocks on Center Payline
  if (s0 === s1 || s1 === s2 || s0 === s2) {
    let matchedSym = s0;
    let winIndices = [0, 1];
    if (s1 === s2) {
      matchedSym = s1;
      winIndices = [1, 2];
    } else if (s0 === s2) {
      matchedSym = s0;
      winIndices = [0, 2];
    }
    const matchedStock = getStockById(matchedSym);
    const mult = getStockMultiplier(matchedStock);
    const winCredits = Math.round(bet * 3 * mult);
    return {
      winCredits,
      tierKey: null,
      winIndices,
      isGrand: false,
      message: `💵 DIVIDEND PAIR: 2× ${matchedSym} (${mult.toFixed(2)}x MULT) = +${winCredits.toLocaleString()} CREDITS!`
    };
  }

  return {
    winCredits: 0,
    tierKey: null,
    winIndices: [],
    isGrand: false,
    message: `📊 PAYLINE: ${s0} • ${s1} • ${s2} — SPIN AGAIN FOR BULL MARKET GAINS!`
  };
}

// Animate WIN counter ticking up
function animateWinCounter(targetWin) {
  const winEl = document.getElementById('ledWin');
  if (!winEl) return;
  if (targetWin <= 0) {
    winEl.textContent = '0';
    return;
  }

  let current = 0;
  const steps = 20;
  const stepVal = targetWin / steps;
  const interval = setInterval(() => {
    current += stepVal;
    if (current >= targetWin) {
      winEl.textContent = Math.round(targetWin);
      clearInterval(interval);
    } else {
      winEl.textContent = Math.round(current);
    }
  }, 28);
}

// Trigger a Spin
async function spinReels() {
  if (state.isSpinning) return;

  const bet = BET_LEVELS[state.betIndex];
  if (state.credits < bet) {
    setStatusBanner('⚠️ INSUFFICIENT CREDITS! CLICK "INSERT BILL / TICKET" BELOW FOR +1,000 CREDITS.');
    audio.playButton();
    return;
  }

  clearWinHighlights();
  state.isSpinning = true;
  state.credits -= bet;
  state.lastWin = 0;
  updateLedDisplays();
  setControlsDisabled(true);
  audio.playButton();

  // Only nudge mock prices if live Twelve Data feed is not active
  if (!state.isLiveFeedActive) {
    nudgeMarketPrices();
  }

  setStatusBanner('🔄 EXECUTING MARKET ORDER... REELS SPINNING!');

  // Determine target symbols with a fun, generous Vegas arcade hit rate:
  // ~18% chance of 3-of-a-kind boost for exciting gameplay
  const roll = Math.random();
  let centerTargets;
  if (roll < 0.16) {
    const luckySym = pickRandomSymbolId();
    centerTargets = [luckySym, luckySym, luckySym];
  } else {
    centerTargets = [pickRandomSymbolId(), pickRandomSymbolId(), pickRandomSymbolId()];
  }

  const targetTrios = [0, 1, 2].map((i) => [
    pickRandomSymbolId(),
    centerTargets[i],
    pickRandomSymbolId()
  ]);

  // Run all 3 reels with staggered stop durations
  await Promise.all([
    animateSingleReel(0, targetTrios[0], 1050),
    animateSingleReel(1, targetTrios[1], 1450),
    animateSingleReel(2, targetTrios[2], 1880)
  ]);

  // Evaluate outcome
  const result = evaluatePayline(centerTargets);
  if (result.winCredits > 0) {
    state.credits += result.winCredits;
    state.lastWin = result.winCredits;
    updateLedDisplays();
    animateWinCounter(result.winCredits);

    // Highlight winning payline symbols
    result.winIndices.forEach((rIdx) => {
      const strip = document.getElementById(`reelStrip${rIdx}`);
      if (strip) {
        const paylineTile = strip.querySelector('.payline-tile');
        if (paylineTile) paylineTile.classList.add('win-highlight');
      }
    });

    const beam = document.getElementById('paylineBeam');
    if (beam) beam.classList.add('win-beam');

    if (result.tierKey) {
      const row = document.getElementById(`tierRow-${result.tierKey}`);
      if (row) row.classList.add('tier-hit');
      const siren = document.getElementById('sirenTower');
      if (siren) siren.classList.add('siren-active');
    }

    audio.playWinFanfare(result.isGrand);
  }

  setStatusBanner(result.message);
  state.isSpinning = false;
  setControlsDisabled(false);
}

function setStatusBanner(htmlText) {
  const el = document.getElementById('statusBanner');
  if (el) el.innerHTML = htmlText;
}

function setControlsDisabled(disabled) {
  ['btnSpin', 'btnBetOne', 'btnBetMax', 'btnCashOut'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
}

// Apply a live quote payload to the game state
function applyQuotesPayload(data, manualClick = false) {
  const statusDot = document.getElementById('marketStatusDot');
  const statusText = document.getElementById('marketStatusText');

  state.isLiveFeedActive = true;

  data.quotes.forEach((q) => {
    const target = MAG7_STOCKS.find((s) => s.id === q.id);
    if (target) {
      target.price = q.price;
      target.changePct = q.changePct;
      target.volatility = q.volatility || target.volatility;
    }
  });

  updateMarketRankings();
  if (!state.isSpinning) {
    renderAllReelsStatic();
  }

  const timeStr = new Date(data.updatedAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const mktState = data.marketOpen ? 'MARKET OPEN' : 'LAST CLOSE';

  if (statusDot) {
    statusDot.style.background = '#10b981';
    statusDot.style.boxShadow = '0 0 10px #10b981';
  }
  if (statusText) {
    statusText.textContent = `12 DATA LIVE (${mktState}) • SYNCED ${timeStr}`;
  }

  const top = state.rankedStocks[0];
  if (manualClick) {
    if (data.cooldownSec) {
      setStatusBanner(
        `⏳ <strong>SNAPSHOT RECENTLY SYNCED</strong> (WAIT ${data.cooldownSec}s FOR NEXT LIVE CALL) — LEADER: <strong>${top.id}</strong> ($${top.price.toFixed(2)})`
      );
    } else {
      setStatusBanner(
        `✅ <strong>TWELVE DATA SYNCED!</strong> #1 GRAND TIER LEADER: <strong>${top.id}</strong> ($${top.price.toFixed(2)}, ${top.changePct >= 0 ? '+' : ''}${top.changePct.toFixed(2)}%)`
      );
    }
  } else {
    setStatusBanner(
      `📈 <strong>12 DATA SNAPSHOT LOADED:</strong> #1 GRAND TIER LEADER IS <strong>${top.id}</strong> ($${top.price.toFixed(2)}, ${top.changePct >= 0 ? '+' : ''}${top.changePct.toFixed(2)}%)`
    );
  }
}

// Fetch live quotes from local server (/api/quotes -> Twelve Data API using .env.local)
async function syncTwelveDataQuotes(manualClick = false) {
  const statusDot = document.getElementById('marketStatusDot');
  const statusText = document.getElementById('marketStatusText');

  try {
    if (manualClick) {
      audio.playButton();
      setStatusBanner('🌐 FETCHING LIVE MAG 7 QUOTES FROM TWELVE DATA...');
    }

    // Support both http://localhost:3000 and opening index.html directly via file://
    const apiBase =
      window.location.protocol === 'file:' || window.location.port !== '3000'
        ? 'http://localhost:3000'
        : '';
    const endpoint = `${apiBase}/api/quotes${manualClick ? '?refresh=1' : ''}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.status === 'live' && Array.isArray(data.quotes)) {
      applyQuotesPayload(data, manualClick);
      return;
    }

    // Key not configured yet in .env.local or API error
    state.isLiveFeedActive = false;
    if (statusDot) {
      statusDot.style.background = '#f59e0b';
      statusDot.style.boxShadow = '0 0 10px #f59e0b';
    }
    if (statusText) {
      statusText.textContent =
        data.status === 'missing_key'
          ? 'SIM MODE • ADD TWELVE_DATA_API_KEY IN .env.local'
          : `SIM MODE • 12 DATA: ${data.message || 'OFFLINE'}`;
    }

    if (manualClick && data.message) {
      setStatusBanner(`⚠️ ${data.message}`);
    }
  } catch (err) {
    // If opened via file:// and server isn't running, check if quotes-snapshot.js exists on disk!
    if (!manualClick && window.__MAG7_CACHED_QUOTES__ && Array.isArray(window.__MAG7_CACHED_QUOTES__.quotes)) {
      applyQuotesPayload(window.__MAG7_CACHED_QUOTES__, false);
      return;
    }

    state.isLiveFeedActive = false;
    if (statusDot) {
      statusDot.style.background = '#f59e0b';
      statusDot.style.boxShadow = '0 0 10px #f59e0b';
    }
    if (statusText) {
      statusText.textContent = 'SIM MODE • RUN "node server.js" FOR .env.local 12 DATA';
    }
    if (manualClick) {
      setStatusBanner('⚠️ START SERVER WITH "node server.js" TO LOAD .env.local TWELVE DATA KEY.');
    }
  }
}

// Micro-tick stock prices and daily % moves when in Sim Mode
function nudgeMarketPrices() {
  MAG7_STOCKS.forEach((st) => {
    const deltaPct = (Math.random() - 0.47) * 0.65 * st.volatility;
    st.changePct = Math.max(-6.5, Math.min(14.5, Number((st.changePct + deltaPct).toFixed(2))));
    st.price = Math.max(20, Number((st.price * (1 + deltaPct / 100)).toFixed(2)));
  });
  updateMarketRankings();
  if (!state.isSpinning) {
    renderAllReelsStatic();
  }
}

// Trigger a headline Wall Street Catalyst event
function triggerMarketCatalyst() {
  audio.playBillInsert();
  const ev = MARKET_CATALYSTS[Math.floor(Math.random() * MARKET_CATALYSTS.length)];
  MAG7_STOCKS.forEach((st) => {
    if (ev.targets.includes(st.id)) {
      st.changePct = Number((st.changePct + ev.boost).toFixed(2));
      st.price = Number((st.price * (1 + ev.boost / 100)).toFixed(2));
    }
  });
  updateMarketRankings();
  if (!state.isSpinning) {
    renderAllReelsStatic();
  }
  const topLeader = state.rankedStocks[0];
  setStatusBanner(
    `⚡ <strong>BREAKING CATALYST:</strong> ${ev.title} — <strong>${topLeader.id}</strong> LEADS GRAND TIER (${getStockMultiplier(topLeader).toFixed(2)}x)!`
  );
}

// Render Paytable & Live Market Rankings Modal
function renderPaytableModal() {
  const grid = document.getElementById('paytableGrid');
  if (!grid) return;

  const bet = BET_LEVELS[state.betIndex];
  grid.innerHTML = state.rankedStocks
    .map((s, idx) => {
      const tierKey = state.tierAssignments[s.id];
      const tierCfg = TIER_CONFIG[tierKey];
      const mult = getStockMultiplier(s);
      const payout3x = Math.round(bet * tierCfg.creditBetMult * mult);
      const sign = s.changePct >= 0 ? '+' : '';
      return `
        <div class="paytable-item">
          <strong style="color:#fde047">#${idx + 1} ${tierCfg.label}</strong>
          <span>${s.badge} <strong>${s.id}</strong> (${s.name})</span>
          <span style="color:${s.changePct >= 0 ? '#4ade80' : '#f87171'}">$${s.price.toFixed(2)} (${sign}${s.changePct.toFixed(2)}%)</span>
          <span><strong>${mult.toFixed(2)}x</strong> • 3x Pays <strong>${payout3x.toLocaleString()}</strong></span>
        </div>
      `;
    })
    .join('');
}

// Wire up buttons and keyboard shortcuts
function initEvents() {
  document.getElementById('btnSpin').addEventListener('click', () => spinReels());

  document.getElementById('btnBetOne').addEventListener('click', () => {
    if (state.isSpinning) return;
    audio.playButton();
    state.betIndex = (state.betIndex + 1) % BET_LEVELS.length;
    updateLedDisplays();
    renderJackpotBoard();
    renderPaytableModal();
    setStatusBanner(`💰 BET SET TO <span class="highlight">${BET_LEVELS[state.betIndex]} CREDITS</span> — JACKPOT TIERS SCALED!`);
  });

  document.getElementById('btnBetMax').addEventListener('click', () => {
    if (state.isSpinning) return;
    state.betIndex = BET_LEVELS.length - 1;
    updateLedDisplays();
    renderJackpotBoard();
    renderPaytableModal();
    spinReels();
  });

  document.getElementById('btnCashOut').addEventListener('click', () => {
    if (state.isSpinning) return;
    audio.playBillInsert();
    const modal = document.getElementById('cashoutModal');
    const amountEl = document.getElementById('voucherAmount');
    const metaEl = document.getElementById('voucherMeta');
    const leader = state.rankedStocks[0];
    if (amountEl) amountEl.textContent = formatDollars(state.credits);
    if (metaEl) {
      metaEl.textContent = `TICKET #${Math.floor(10000 + Math.random() * 90000)}-${leader.id} • TOP HOLDING: ${leader.name.toUpperCase()}`;
    }
    if (modal) modal.classList.remove('hidden');
  });

  document.getElementById('btnRedeemKeepPlaying').addEventListener('click', () => {
    audio.playButton();
    document.getElementById('cashoutModal').classList.add('hidden');
  });

  document.getElementById('btnResetFresh').addEventListener('click', () => {
    audio.playBillInsert();
    state.credits = 1250;
    state.lastWin = 0;
    updateLedDisplays();
    document.getElementById('cashoutModal').classList.add('hidden');
    setStatusBanner('💵 FRESH $1,250.00 TRADING ROLL LOADED — GOOD LUCK!');
  });

  document.getElementById('btnInsertBill').addEventListener('click', () => {
    audio.playBillInsert();
    state.credits += 1000;
    updateLedDisplays();
    setStatusBanner('💵 +1,000 CREDITS DEPOSITED VIA BILL ACCEPTOR!');
  });

  const syncBtn = document.getElementById('btnSyncLive');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      syncTwelveDataQuotes(true);
    });
  }

  document.getElementById('btnCatalyst').addEventListener('click', () => {
    triggerMarketCatalyst();
  });

  document.getElementById('btnPaytable').addEventListener('click', () => {
    audio.playButton();
    renderPaytableModal();
    document.getElementById('paytableModal').classList.remove('hidden');
  });

  document.getElementById('closePaytable').addEventListener('click', () => {
    document.getElementById('paytableModal').classList.add('hidden');
  });

  document.getElementById('btnSound').addEventListener('click', (e) => {
    state.soundEnabled = !state.soundEnabled;
    e.currentTarget.textContent = state.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  });

  // Spacebar to spin
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'BUTTON') {
      e.preventDefault();
      spinReels();
    }
  });

  // Fallback Sim Mode tick every 6 seconds only when Twelve Data key is not active
  setInterval(() => {
    if (!state.isSpinning && !state.isLiveFeedActive) {
      nudgeMarketPrices();
    }
  }, 6000);
}

// Initialize Cabinet on load
window.addEventListener('DOMContentLoaded', () => {
  updateMarketRankings();
  renderAllReelsStatic();
  updateLedDisplays();
  initEvents();
  syncTwelveDataQuotes(false);
});
