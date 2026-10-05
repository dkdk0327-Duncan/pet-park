// ============================================================
//  極速跑酷 — runner-game.js
// ============================================================

const canvas = document.getElementById('runnerCanvas');
if (!canvas) {
    document.body.style.background = 'red';
    document.body.innerHTML = '<h2 style="color:white;padding:40px">錯誤：找不到 canvas 元素！請確認在 runner.html 開啟。</h2>';
    throw new Error('No #runnerCanvas element found');
}
const ctx    = canvas.getContext('2d');
const CW = 800, CH = 600;

// ── Top-level error handler (diagnostic) ─────────────────
window.onerror = function(msg, _src, line, col) {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#1a0533';
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('頂層JS錯誤 / JS Error (line ' + line + '):', 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    // wrap text
    const words = String(msg).split(' ');
    let ln = '', y = 32;
    for (const w of words) {
        const t = ln ? ln + ' ' + w : w;
        if (t.length > 72) { ctx.fillText(ln, 10, y); ln = w; y += 17; }
        else ln = t;
    }
    if (ln) ctx.fillText(ln, 10, y);
    return true;
};

// ── Perspective constants ─────────────────────────────────
const VP_X = 400, VP_Y = 165;          // vanishing point
const NEAR_Y = 510;                    // player Y (feet)
const LANE_X_NEAR = [170, 400, 630];   // lane X at player level
const HORIZON_SCALE = 0.13;            // relative size at horizon

function projectPoint(lane, t) {
    const x     = lerp(LANE_X_NEAR[lane], VP_X, t);
    const y     = lerp(NEAR_Y, VP_Y, t);
    const scale = lerp(1.0, HORIZON_SCALE, t);
    return { x, y, scale };
}

// ── Helpers ───────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Game states ───────────────────────────────────────────
const S = {
    MENU: 'MENU',
    LEVEL_SELECT: 'LEVEL_SELECT',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    CHECKPOINT_ANIM: 'CHECKPOINT_ANIM',
    FAIL_ANIM: 'FAIL_ANIM',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    ALL_CLEAR: 'ALL_CLEAR'
};

// ── Obstacle types ────────────────────────────────────────
const OT = {
    ROCK:        { id:'ROCK',        emoji:'🪨', lanes:1, canJump:true,  tall:false },
    WALL:        { id:'WALL',        emoji:'🚧', lanes:1, canJump:false, tall:true  },
    WATER:       { id:'WATER',       emoji:'🌊', lanes:1, canJump:true,  tall:false },
    TRAIN:       { id:'TRAIN',       emoji:'🚃', lanes:2, canJump:false, tall:true  },
    DOUBLE_ROCK: { id:'DOUBLE_ROCK', emoji:'🪨', lanes:2, canJump:true,  tall:false }
};

// ── Power-up types ──────────────────────────────────────────
const PU = {
    DOUBLE_JUMP: { id:'DOUBLE_JUMP', emoji:'⚡', name:'雙段跳', color:'#ffe040', duration:7 },
    INVINCIBLE:  { id:'INVINCIBLE',  emoji:'⭐', name:'無敵',   color:'#ff9800', duration:5 },
    SHIELD:      { id:'SHIELD',      emoji:'🛡️', name:'護盾',   color:'#4fc3f7', duration:0 },
};
const PU_POOL = [PU.DOUBLE_JUMP, PU.DOUBLE_JUMP, PU.INVINCIBLE, PU.SHIELD];

// ── Level configs ─────────────────────────────────────────
// Each level: { speed, obs (obstacles per section), pool[] }
function buildLevels() {
    const levels = [];
    const POOLS = [
        [OT.ROCK],
        [OT.ROCK, OT.WALL],
        [OT.ROCK, OT.WALL, OT.WATER],
        [OT.ROCK, OT.WALL, OT.WATER, OT.DOUBLE_ROCK],
        [OT.ROCK, OT.WALL, OT.WATER, OT.DOUBLE_ROCK, OT.TRAIN],
        [OT.ROCK, OT.WALL, OT.WATER, OT.DOUBLE_ROCK, OT.TRAIN, OT.TRAIN]
    ];
    for (let i = 1; i <= 40; i++) {
        let speed, obs, pool;
        if      (i <=  4) { speed = 1.80 + (i- 1)*0.07; obs =  4; pool = POOLS[0]; }
        else if (i <=  8) { speed = 2.10 + (i- 5)*0.08; obs =  5; pool = POOLS[1]; }
        else if (i <= 12) { speed = 2.45 + (i- 9)*0.08; obs =  6; pool = POOLS[1]; }
        else if (i <= 16) { speed = 2.78 + (i-13)*0.09; obs =  7; pool = POOLS[2]; }
        else if (i <= 20) { speed = 3.15 + (i-17)*0.10; obs =  8; pool = POOLS[3]; }
        else if (i <= 24) { speed = 3.55 + (i-21)*0.12; obs =  9; pool = POOLS[3]; }
        else if (i <= 28) { speed = 4.05 + (i-25)*0.14; obs = 10; pool = POOLS[4]; }
        else if (i <= 32) { speed = 4.65 + (i-29)*0.16; obs = 11; pool = POOLS[4]; }
        else if (i <= 36) { speed = 5.30 + (i-33)*0.20; obs = 12; pool = POOLS[5]; }
        else              { speed = 6.10 + (i-37)*0.30; obs = 14; pool = POOLS[5]; }
        levels.push({ speed, obs, pool });
    }
    return levels;
}
const LEVELS = buildLevels();

// ── Weather System ─────────────────────────────────────────
const WEATHER = {
    CLEAR:        { icon:'☀️',  name:'晴天',
        skyTop:'#040e2c', skyMid:'#0c2e7a', skyBot:'#1a5ac8',
        gndTop:'#1a1a2e', gndBot:'#0d0d1a',
        fogAlpha:0,    rainCount:0,   snowCount:0,   wind:0,   lightning:false, heat:0   },
    CLOUDY:       { icon:'⛅',  name:'多雲時晴',
        skyTop:'#14202c', skyMid:'#1e3040', skyBot:'#304860',
        gndTop:'#181824', gndBot:'#0c0c18',
        fogAlpha:0.10, rainCount:0,   snowCount:0,   wind:0,   lightning:false, heat:0   },
    RAIN_LIGHT:   { icon:'🌦️', name:'小雨',
        skyTop:'#080e16', skyMid:'#10182a', skyBot:'#18283c',
        gndTop:'#0e1620', gndBot:'#060810',
        fogAlpha:0.18, rainCount:80,  snowCount:0,   wind:15,  lightning:false, heat:0   },
    RAIN_HEAVY:   { icon:'🌧️', name:'大雨',
        skyTop:'#040810', skyMid:'#080e18', skyBot:'#0e1826',
        gndTop:'#0a1018', gndBot:'#040608',
        fogAlpha:0.35, rainCount:220, snowCount:0,   wind:45,  lightning:false, heat:0   },
    THUNDERSTORM: { icon:'⛈️', name:'暴風雨',
        skyTop:'#020406', skyMid:'#04070c', skyBot:'#070c14',
        gndTop:'#060810', gndBot:'#02030a',
        fogAlpha:0.45, rainCount:320, snowCount:0,   wind:90,  lightning:true,  heat:0   },
    SNOW_LIGHT:   { icon:'🌨️', name:'小雪',
        skyTop:'#0c1822', skyMid:'#18263a', skyBot:'#2c4056',
        gndTop:'#182028', gndBot:'#0a1018',
        fogAlpha:0.08, rainCount:0,   snowCount:65,  wind:5,   lightning:false, heat:0   },
    SNOW_HEAVY:   { icon:'❄️',  name:'大雪',
        skyTop:'#080e14', skyMid:'#0e161e', skyBot:'#182030',
        gndTop:'#121820', gndBot:'#080c12',
        fogAlpha:0.28, rainCount:0,   snowCount:160, wind:15,  lightning:false, heat:0   },
    BLIZZARD:     { icon:'🌪️', name:'暴風雪',
        skyTop:'#040508', skyMid:'#07090e', skyBot:'#0c1018',
        gndTop:'#0a0c12', gndBot:'#040508',
        fogAlpha:0.55, rainCount:0,   snowCount:290, wind:160, lightning:false, heat:0   },
    HEAT:         { icon:'🌞',  name:'烈日',
        skyTop:'#0c0400', skyMid:'#5c2800', skyBot:'#b85a00',
        gndTop:'#120a00', gndBot:'#080400',
        fogAlpha:0,    rainCount:0,   snowCount:0,   wind:0,   lightning:false, heat:0.5 },
    EXTREME_HEAT: { icon:'🔥',  name:'超強烈日',
        skyTop:'#0c0100', skyMid:'#7c1000', skyBot:'#c42800',
        gndTop:'#160200', gndBot:'#080100',
        fogAlpha:0,    rainCount:0,   snowCount:0,   wind:0,   lightning:false, heat:1.0 },
};
const LEVEL_WEATHER = [
    null,
    'CLEAR','CLEAR','CLEAR','CLEAR',
    'CLOUDY','CLOUDY','CLOUDY','CLOUDY',
    'RAIN_LIGHT','RAIN_LIGHT','RAIN_LIGHT','RAIN_LIGHT',
    'RAIN_HEAVY','RAIN_HEAVY','RAIN_HEAVY','RAIN_HEAVY',
    'THUNDERSTORM','THUNDERSTORM','THUNDERSTORM','THUNDERSTORM',
    'SNOW_LIGHT','SNOW_LIGHT','SNOW_LIGHT','SNOW_LIGHT',
    'SNOW_HEAVY','SNOW_HEAVY','SNOW_HEAVY','SNOW_HEAVY',
    'BLIZZARD','BLIZZARD','BLIZZARD','BLIZZARD',
    'HEAT','HEAT','HEAT','HEAT',
    'EXTREME_HEAT','EXTREME_HEAT','EXTREME_HEAT','EXTREME_HEAT',
];
function getWeather() { return WEATHER[LEVEL_WEATHER[game.level] || 'CLEAR']; }

let weatherParticles = [];
let lightningFlash   = 0;
let lightningTimer   = 2.0;
let heatPhase        = 0;

function initWeatherParticles() {
    const cfg = getWeather();
    weatherParticles = [];
    if (cfg.rainCount > 0) {
        for (let i = 0; i < cfg.rainCount; i++)
            weatherParticles.push({ kind:'rain',
                x: Math.random()*CW, y: Math.random()*CH,
                len: 8 + Math.random()*14,
                speed: 370 + Math.random()*180,
                wind: cfg.wind });
    }
    if (cfg.snowCount > 0) {
        for (let i = 0; i < cfg.snowCount; i++)
            weatherParticles.push({ kind:'snow',
                x: Math.random()*CW, y: Math.random()*CH,
                r: 1.5 + Math.random()*3.5,
                speed: 38 + Math.random()*65,
                drift: (Math.random()-0.5)*cfg.wind*0.4,
                phase: Math.random()*Math.PI*2 });
    }
    lightningFlash = 0;
    lightningTimer = 1.5 + Math.random()*3.0;
    heatPhase = 0;
}

function updateWeather(dt) {
    heatPhase += dt;
    const cfg = getWeather();
    for (const p of weatherParticles) {
        if (p.kind === 'rain') {
            p.y += p.speed*dt;  p.x += p.wind*dt;
            if (p.y > CH+20) { p.y = -20; p.x = Math.random()*CW; }
            if (p.x > CW+20) p.x = -20;
            if (p.x < -20)   p.x = CW+20;
        } else {
            p.y += p.speed*dt;
            p.phase += dt*1.8;
            p.x += Math.sin(p.phase)*0.7 + p.drift*dt;
            if (p.y > CH+10) { p.y = -10; p.x = Math.random()*CW; }
            if (p.x > CW+10) p.x = -10;
            if (p.x < -10)   p.x = CW+10;
        }
    }
    if (cfg.lightning) {
        lightningFlash = Math.max(0, lightningFlash - dt*5.5);
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
            lightningFlash = 1.0;
            lightningTimer = 1.5 + Math.random()*4.5;
        }
    }
}

function drawWeatherBackground(cfg) {
    if (cfg.heat > 0) {
        const sx = CW-82, sy = 56, glowR = 38 + cfg.heat*18;
        for (let r = glowR+22; r > glowR-4; r -= 5) {
            const a = (1-(r-glowR+4)/26) * (cfg.heat > 0.8 ? 0.13 : 0.09);
            ctx.fillStyle = cfg.heat > 0.8 ? `rgba(255,55,0,${a})` : `rgba(255,155,0,${a})`;
            ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
        }
        ctx.font = `${50 + cfg.heat*12}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = cfg.heat > 0.8 ? '#ff2800' : '#ff8800';
        ctx.shadowBlur = 25 + cfg.heat*20;
        ctx.fillText(cfg.heat > 0.8 ? '🌞' : '☀️', sx, sy);
        ctx.shadowBlur = 0;
    } else {
        ctx.font = (cfg.rainCount > 0 || cfg.snowCount > 0) ? '26px serif' : '32px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(cfg.icon, CW-60, 46);
    }
}

function drawWeatherForeground() {
    const cfg = getWeather();
    if (cfg.heat > 0) {
        const lineCount = Math.floor(8 + cfg.heat*12), startY = VP_Y + 55;
        for (let i = 0; i < lineCount; i++) {
            const y  = startY + i*(CH-startY)/lineCount;
            const amp = cfg.heat*5*((y-startY)/(CH-startY));
            const ph  = heatPhase*2.8 + i*0.65;
            ctx.strokeStyle = `rgba(255,165,35,${cfg.heat*0.05})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = 0; x <= CW; x += 5) {
                const yy = y + Math.sin(ph + x*0.035)*amp;
                x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
            }
            ctx.stroke();
        }
        const hg = ctx.createLinearGradient(0, NEAR_Y-60, 0, CH);
        hg.addColorStop(0, 'rgba(255,70,0,0)');
        hg.addColorStop(1, `rgba(255,45,0,${cfg.heat*0.15})`);
        ctx.fillStyle = hg;
        ctx.fillRect(0, NEAR_Y-60, CW, CH-NEAR_Y+60);
    }
    if (weatherParticles.length > 0 && weatherParticles[0]?.kind === 'rain') {
        ctx.save();
        ctx.strokeStyle = 'rgba(180,215,255,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const p of weatherParticles) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.wind*0.022, p.y + p.len);
        }
        ctx.stroke();
        ctx.restore();
    }
    if (weatherParticles.length > 0 && weatherParticles[0]?.kind === 'snow') {
        ctx.save();
        ctx.fillStyle = 'rgba(220,235,255,0.88)';
        ctx.beginPath();
        for (const p of weatherParticles) {
            ctx.moveTo(p.x + p.r, p.y);
            ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        }
        ctx.fill();
        ctx.restore();
    }
    if (cfg.fogAlpha > 0) {
        const fc = cfg.snowCount > 0 ? '190,210,235' : (cfg.rainCount > 0 ? '65,95,125' : '88,88,100');
        const fg = ctx.createLinearGradient(0, 0, 0, CH);
        fg.addColorStop(0,   `rgba(${fc},${cfg.fogAlpha*1.1})`);
        fg.addColorStop(0.4, `rgba(${fc},${cfg.fogAlpha*0.7})`);
        fg.addColorStop(1,   `rgba(${fc},${cfg.fogAlpha*0.25})`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, CW, CH);
    }
    if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(210,235,255,${lightningFlash*0.42})`;
        ctx.fillRect(0, 0, CW, CH);
    }
}

// Returns array of { type, laneA, laneB(optional), z }
function generateSection(levelIdx) {
    const cfg = LEVELS[levelIdx];
    const result = [];
    let z = 1.0;
    const MIN_GAP = Math.max(0.20, 0.35 - levelIdx * 0.006);
    let lastLanes = null;

    for (let i = 0; i < cfg.obs; i++) {
        z += MIN_GAP + Math.random() * 0.18;
        // Pick obstacle type
        let type;
        let attempts = 0;
        do {
            type = pick(cfg.pool);
            attempts++;
        } while (attempts < 10 && lastLanes && type.lanes === 1 && lastLanes.length === 1 && lastLanes[0] === randInt(0,2));

        let laneA, laneB = null;
        if (type.lanes === 2) {
            // Two adjacent lanes: pick start lane 0 or 1
            laneA = randInt(0, 1);
            laneB = laneA + 1;
            // Ensure at least one lane free by checking all 3 lanes
            // (laneA and laneA+1 are blocked, third lane is free — always solvable)
        } else {
            laneA = randInt(0, 2);
        }
        lastLanes = laneB !== null ? [laneA, laneB] : [laneA];

        result.push({ type, laneA, laneB, z: 1.0 + z - 1.0, progress: z });
    }
    // Normalise z so first obstacle starts at z=1.0 coming in
    // We'll space them using a "queue" approach: generate as distances from start
    // Each obs has .dist = cumulative distance from section start
    let cum = 0;
    const out = [];
    let baseGap = MIN_GAP;
    cum = baseGap + 0.15;
    for (let i = 0; i < result.length; i++) {
        if (i === 0) cum = baseGap + 0.1;
        else cum += baseGap + Math.random() * 0.15;
        out.push({ ...result[i], dist: cum });
    }
    // Optionally add a power-up collectible (~50% chance per section)
    if (Math.random() < 0.50) {
        const puDist = (out.length > 0 ? out[Math.floor(out.length * 0.4)].dist : 0.8)
                       + 0.3 + Math.random() * 0.4;
        out.push({ isPowerup: true, puType: pick(PU_POOL), lane: randInt(0, 2), dist: puDist });
        out.sort((a, b) => a.dist - b.dist);
    }
    return out;
}

// ── Save / Load ───────────────────────────────────────────
const SAVE_KEY = 'runnerGameSave';
function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const d = JSON.parse(raw);
            if (d.v === 1) return d;
        }
    } catch(e) {}
    return null;
}
function writeSave() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1,
        unlockedLevel: game.unlockedLevel,
        bestScores: game.bestScores
    }));
}

// ── Game object ───────────────────────────────────────────
const game = {
    state: S.MENU,
    unlockedLevel: 1,
    bestScores: {},

    // Current run
    level: 1,        // 1-indexed
    section: 1,      // 1-3
    score: 0,
    lastCheckpoint: { level: 1, section: 1 },

    // Section data
    obstacles: [],   // active obstacles on screen
    sectionObstacles: [], // pre-generated for current section
    sectionDist: 0,  // how far we've scrolled in this section
    nextObsIdx: 0,   // index into sectionObstacles
    obstaclesCleared: 0,
    obstaclesTotal: 0,

    // Timers / animation
    countdownVal: 3,
    countdownTimer: 0,
    animTimer: 0,
    animDuration: 0,

    // Scroll markers
    markers: [],
    scrollOffset: 0,

    // UI
    menuBtnHover: -1,
    levelSelectScroll: 0,

    // Power-ups
    powerupItems: [],
    activePowerup: null,
    hasShield: false,
    sectionBreakTimer: 0,
};

// ── Player ────────────────────────────────────────────────
const player = {
    lane: 1,
    x: LANE_X_NEAR[1],
    targetX: LANE_X_NEAR[1],
    transTimer: 0,
    transDur: 0.18,
    isJumping: false,
    jumpProgress: 0,
    jumpDur: 0.55,
    yOffset: 0,
    doubleJumpUsed: false,
};

// ── Input ─────────────────────────────────────────────────
const keys = {};
const keyJustPressed = {};
window.addEventListener('keydown', e => {
    if (!keys[e.code]) keyJustPressed[e.code] = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('click', handleClick);
canvas.addEventListener('mousemove', handleMouseMove);

// ── Audio System ──────────────────────────────────────────
let audioCtx    = null;
let masterGain  = null;
let bgmGain     = null;
let sfxGain     = null;
let isMuted     = false;
let bgmRunning  = false;
let bgmScheduleId = null;
let bgmNextNote   = 0;
let bgmNoteIndex  = 0;

const BGM_BPM   = 145;
const BEAT      = 60 / BGM_BPM;
const HALF_BEAT = BEAT / 2;

const HZ = {
    D2:73.4,  F2:87.3,  G2:98.0,  A2:110.0,
    D3:146.8, F3:174.6, G3:196.0, A3:220.0,
    D4:293.7, F4:349.2, G4:392.0, A4:440.0, C5:523.3,
    D5:587.3, F5:698.5, A5:880.0
};
const BGM_MELODY = [
    'D4','A4','G4','F4', 'D4','F4','G4','A4',
    'G4','A4','C5','D5', 'A4','G4','F4','D4',
    'F4','D4','A4','G4', 'F4','A4','D5','A4',
    'G4','F4','D4','A3', 'D4','F4','A4','D5'
];
const BGM_BASS = [
    'D2','D2','F2','G2', 'A2','A2','G2','F2',
    'D2','F2','G2','A2', 'D2','A2','D2','D2'
];

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 1.0;
        masterGain.connect(audioCtx.destination);
        bgmGain = audioCtx.createGain();
        bgmGain.gain.value = 0.18;
        bgmGain.connect(masterGain);
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.55;
        sfxGain.connect(masterGain);
    } catch(e) {}
}

function resumeAudio() {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function toggleMute() {
    isMuted = !isMuted;
    if (masterGain) masterGain.gain.value = isMuted ? 0 : 1.0;
}

// ── BGM Scheduler ─────────────────────────────────────────
function startBGM() {
    if (!audioCtx || bgmRunning) return;
    bgmRunning   = true;
    bgmNoteIndex = 0;
    bgmNextNote  = audioCtx.currentTime + 0.05;
    scheduleBGM();
}

function stopBGM() {
    bgmRunning = false;
    if (bgmScheduleId) { clearTimeout(bgmScheduleId); bgmScheduleId = null; }
}

function scheduleBGM() {
    if (!bgmRunning || !audioCtx) return;
    const LOOK = 0.4;
    while (bgmNextNote < audioCtx.currentTime + LOOK) {
        const t    = bgmNextNote;
        const beat = bgmNoteIndex;
        const mi   = beat % BGM_MELODY.length;
        schedOsc(HZ[BGM_MELODY[mi]], t, HALF_BEAT * 0.82, 'square',   bgmGain, 0.10);
        if (beat % 2 === 0) {
            const bi = Math.floor(beat / 2) % BGM_BASS.length;
            schedOsc(HZ[BGM_BASS[bi]], t, BEAT * 0.88, 'triangle', bgmGain, 0.16);
        }
        if (beat % 8  === 0) schedKick(t);
        if (beat % 16 === 8) schedSnare(t);
        schedHihat(t);
        bgmNoteIndex++;
        bgmNextNote += HALF_BEAT;
    }
    bgmScheduleId = setTimeout(scheduleBGM, 120);
}

function schedOsc(freq, t, dur, type, dest, vol) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
}

function schedKick(t) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
    o.connect(g); g.connect(bgmGain);
    o.start(t); o.stop(t + 0.25);
}

function schedSnare(t) {
    if (!audioCtx) return;
    const sz = Math.floor(audioCtx.sampleRate * 0.10);
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random()*2-1)*(1-i/sz);
    const src = audioCtx.createBufferSource(), g = audioCtx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
    src.connect(g); g.connect(bgmGain); src.start(t);
}

function schedHihat(t) {
    if (!audioCtx) return;
    const sz = Math.floor(audioCtx.sampleRate * 0.03);
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random()*2-1)*(1-i/sz);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const f = audioCtx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7000;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(f); f.connect(g); g.connect(bgmGain); src.start(t);
}

// ── Sound Effects ─────────────────────────────────────────
function sfxJump() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(280, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(740, audioCtx.currentTime + 0.13);
    g.gain.setValueAtTime(0.24, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(audioCtx.currentTime + 0.20);
}

function sfxSwitch() {
    if (!audioCtx) return;
    const sz = Math.floor(audioCtx.sampleRate * 0.06);
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/sz, 1.5);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const f = audioCtx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.35, audioCtx.currentTime);
    src.connect(f); f.connect(g); g.connect(sfxGain); src.start();
}

function sfxPass() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = 1047;
    g.gain.setValueAtTime(0.10, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(audioCtx.currentTime + 0.09);
}

function sfxCheckpoint() {
    if (!audioCtx) return;
    [523.3, 659.3, 784.0, 1046.5].forEach((freq, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle'; o.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.11;
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g); g.connect(sfxGain);
        o.start(t); o.stop(t + 0.28);
    });
}

function sfxFail() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.45);
    g.gain.setValueAtTime(0.45, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.50);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(audioCtx.currentTime + 0.55);
    const sz = Math.floor(audioCtx.sampleRate * 0.06);
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) dat[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(), ng = audioCtx.createGain();
    src.buffer = buf;
    ng.gain.setValueAtTime(0.4, audioCtx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    src.connect(ng); ng.connect(sfxGain); src.start();
}

function sfxLevelComplete() {
    if (!audioCtx) return;
    [{f:523.3,t:0},{f:659.3,t:0.14},{f:784.0,t:0.28},{f:1046.5,t:0.42}].forEach(s => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle'; o.frequency.value = s.f;
        const at = audioCtx.currentTime + s.t;
        g.gain.setValueAtTime(0.35, at);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
        o.connect(g); g.connect(sfxGain);
        o.start(at); o.stop(at + 0.22);
    });
}

function sfxAllClear() {
    if (!audioCtx) return;
    [{f:523.3,t:0},{f:659.3,t:0.12},{f:784.0,t:0.24},
     {f:1046.5,t:0.36},{f:1318.5,t:0.50},{f:1568.0,t:0.64}].forEach(s => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle'; o.frequency.value = s.f;
        const at = audioCtx.currentTime + s.t;
        const dur = s.t < 0.5 ? 0.14 : 0.55;
        g.gain.setValueAtTime(0.38, at);
        g.gain.exponentialRampToValueAtTime(0.001, at + dur);
        o.connect(g); g.connect(sfxGain);
        o.start(at); o.stop(at + dur + 0.05);
    });
}

function sfxCountdown(val) {
    if (!audioCtx) return;
    const freq = val === 0 ? 880 : 440;
    const dur  = val === 0 ? 0.35 : 0.12;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.28, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(audioCtx.currentTime + dur + 0.02);
}

function sfxPowerup() {
    if (!audioCtx) return;
    [523.3, 784.0, 1046.5, 1318.5].forEach((freq, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'triangle'; o.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.07;
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o.connect(g); g.connect(sfxGain);
        o.start(t); o.stop(t + 0.18);
    });
}

function sfxShieldBreak() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.25);
    g.gain.setValueAtTime(0.35, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(audioCtx.currentTime + 0.30);
}

// ── Power-up activation ───────────────────────────────────
function activatePowerup(pu) {
    sfxPowerup();
    if (pu.type.id === 'SHIELD') {
        game.hasShield = true;
    } else {
        game.activePowerup = { id: pu.type.id, timer: pu.type.duration };
        if (pu.type.id === 'DOUBLE_JUMP') {
            player.doubleJumpUsed = false; // reset immediately
        }
    }
}

// ── Init ──────────────────────────────────────────────────
function init() {
    const save = loadSave();
    if (save) {
        game.unlockedLevel = save.unlockedLevel;
        game.bestScores    = save.bestScores || {};
    }
    // Build scroll markers
    game.markers = [];
    for (let m = 0; m < 20; m++) {
        game.markers.push({ t: Math.random() });
    }
    requestAnimationFrame(gameLoop);
}

// ── Game loop ─────────────────────────────────────────────
let lastTs = 0;
function gameLoop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    try {
        update(dt);
        draw();
    } catch (err) {
        ctx.clearRect(0, 0, CW, CH);
        ctx.fillStyle = '#1a0533';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('遊戲錯誤 / Game Error:', 20, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        const msg = String(err.message || err);
        // Word-wrap the message
        const words = msg.split(' ');
        let line = '', y = 50;
        for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (test.length > 70) { ctx.fillText(line, 20, y); line = w; y += 18; }
            else line = test;
        }
        if (line) ctx.fillText(line, 20, y);
        console.error('Runner game error:', err);
        requestAnimationFrame(gameLoop);
        return;
    }

    // Clear just-pressed
    for (const k in keyJustPressed) delete keyJustPressed[k];

    requestAnimationFrame(gameLoop);
}

// ── Update ────────────────────────────────────────────────
function update(dt) {
    switch (game.state) {
        case S.COUNTDOWN:      updateCountdown(dt);     break;
        case S.PLAYING:        updatePlaying(dt);       break;
        case S.CHECKPOINT_ANIM:
        case S.FAIL_ANIM:
        case S.LEVEL_COMPLETE:
        case S.ALL_CLEAR:      updateAnim(dt);          break;
    }
}

function updateCountdown(dt) {
    game.countdownTimer -= dt;
    if (game.countdownTimer <= 0) {
        game.countdownVal--;
        if (game.countdownVal < 0) {
            game.state = S.PLAYING;
            startBGM();
        } else {
            game.countdownTimer = 1.0;
            sfxCountdown(game.countdownVal);
        }
    }
}

function updatePlaying(dt) {
    const speed = LEVELS[game.level - 1].speed;

    // ── Lane switch input ──
    if (!player.transTimer) {
        if ((keyJustPressed['ArrowLeft'] || keyJustPressed['KeyA']) && player.lane > 0) {
            player.lane--;
            player.targetX = LANE_X_NEAR[player.lane];
            player.transTimer = player.transDur;
            sfxSwitch();
        } else if ((keyJustPressed['ArrowRight'] || keyJustPressed['KeyD']) && player.lane < 2) {
            player.lane++;
            player.targetX = LANE_X_NEAR[player.lane];
            player.transTimer = player.transDur;
            sfxSwitch();
        }
    }
    // Smooth lane transition
    if (player.transTimer > 0) {
        player.transTimer = Math.max(0, player.transTimer - dt);
        player.x = lerp(player.x, player.targetX, Math.min(1, dt / Math.max(player.transTimer, 0.001) + dt * 8));
        if (player.transTimer === 0) player.x = player.targetX;
    }

    // ── Jump input (with double-jump power-up support) ──
    const canDoubleJump = game.activePowerup?.id === 'DOUBLE_JUMP';
    const jumpKey = keyJustPressed['ArrowUp'] || keyJustPressed['Space'] || keyJustPressed['KeyW'];
    if (jumpKey) {
        if (!player.isJumping) {
            player.isJumping    = true;
            player.jumpProgress = 0;
            player.doubleJumpUsed = false;
            sfxJump();
        } else if (canDoubleJump && !player.doubleJumpUsed) {
            player.jumpProgress   = 0;
            player.doubleJumpUsed = true;
            sfxJump();
        }
    }
    if (player.isJumping) {
        player.jumpProgress += dt / player.jumpDur;
        if (player.jumpProgress >= 1) {
            player.jumpProgress   = 1;
            player.isJumping      = false;
            player.doubleJumpUsed = false;
        }
        player.yOffset = -115 * Math.sin(Math.PI * player.jumpProgress);
    } else {
        player.yOffset = 0;
    }

    // ── Scroll ──
    game.scrollOffset = (game.scrollOffset + speed * dt * 0.4) % 1;
    game.sectionDist += speed * dt;
    updateWeather(dt);

    // ── Power-up timer countdown ──
    if (game.activePowerup) {
        game.activePowerup.timer -= dt;
        if (game.activePowerup.timer <= 0) game.activePowerup = null;
    }

    // ── Section break: breathing room between sections ──
    if (game.sectionBreakTimer > 0) {
        game.sectionBreakTimer -= dt;
        // Still move any power-up items that were spawned for this section
        for (let i = game.powerupItems.length - 1; i >= 0; i--) {
            const pu = game.powerupItems[i];
            pu.z -= speed * dt * 0.28;
            if (pu.z <= 0.10 && pu.z > -0.05 && pu.lane === player.lane) {
                activatePowerup(pu);
                game.powerupItems.splice(i, 1);
            } else if (pu.z < -0.15) {
                game.powerupItems.splice(i, 1);
            }
        }
        return;
    }

    // ── Spawn obstacles / power-ups ──
    while (game.nextObsIdx < game.sectionObstacles.length &&
           game.sectionDist >= game.sectionObstacles[game.nextObsIdx].dist * 3.0) {
        const def = game.sectionObstacles[game.nextObsIdx];
        if (def.isPowerup) {
            game.powerupItems.push({ type: def.puType, lane: def.lane, z: 1.0 });
        } else {
            game.obstacles.push({ type: def.type, laneA: def.laneA, laneB: def.laneB, z: 1.0 });
        }
        game.nextObsIdx++;
    }

    // ── Move obstacles ──
    const toRemove = [];
    for (let i = 0; i < game.obstacles.length; i++) {
        const obs = game.obstacles[i];
        obs.z -= speed * dt * 0.28;

        // ── Collision zone ──
        if (obs.z <= 0.10 && obs.z > -0.05) {
            const playerLanes = [player.lane];
            const obsLanes = obs.laneB !== null ? [obs.laneA, obs.laneB] : [obs.laneA];
            const overlap = obsLanes.some(l => playerLanes.includes(l));
            if (overlap && game.activePowerup?.id !== 'INVINCIBLE') {
                const fatal = obs.type.tall
                    ? true
                    : !player.isJumping && player.yOffset > -45;
                if (fatal) {
                    triggerFail();
                    return;
                }
            }
        }

        if (obs.z < -0.15) {
            toRemove.push(i);
            game.obstaclesCleared++;
            game.score++;
            sfxPass();
        }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
        game.obstacles.splice(toRemove[i], 1);
    }

    // ── Move power-up items ──
    for (let i = game.powerupItems.length - 1; i >= 0; i--) {
        const pu = game.powerupItems[i];
        pu.z -= speed * dt * 0.28;
        if (pu.z <= 0.10 && pu.z > -0.05 && pu.lane === player.lane) {
            activatePowerup(pu);
            game.powerupItems.splice(i, 1);
        } else if (pu.z < -0.15) {
            game.powerupItems.splice(i, 1);
        }
    }

    // ── Section complete? ──
    const allSpawned = game.nextObsIdx >= game.sectionObstacles.length;
    const allCleared = game.obstacles.length === 0;
    if (allSpawned && allCleared) {
        sectionComplete();
    }
}

function updateAnim(dt) {
    game.animTimer -= dt;
    if (game.animTimer <= 0) {
        finishAnim();
    }
}

function sectionComplete() {
    game.score += 50;
    sfxCheckpoint();
    if (game.section < 3) {
        // Seamless transition: breathing room instead of countdown
        game.section++;
        game.lastCheckpoint = { level: game.level, section: game.section };
        writeSave();
        game.obstacles = [];
        game.powerupItems = [];
        game.sectionObstacles = generateSection(game.level - 1);
        game.sectionDist = 0;
        game.nextObsIdx = 0;
        game.obstaclesCleared = 0;
        game.obstaclesTotal = LEVELS[game.level - 1].obs;
        game.sectionBreakTimer = 3.5;
        // state stays S.PLAYING — no countdown
    } else {
        // Level complete
        levelComplete();
    }
}

function levelComplete() {
    game.score += 150;
    if (game.level > game.unlockedLevel) game.unlockedLevel = game.level;
    if (game.level < 40) game.unlockedLevel = Math.min(40, Math.max(game.unlockedLevel, game.level + 1));
    if (!game.bestScores[game.level] || game.score > game.bestScores[game.level]) {
        game.bestScores[game.level] = game.score;
    }
    writeSave();
    stopBGM();
    if (game.level === 40) {
        sfxAllClear();
        game.state = S.ALL_CLEAR;
        game.animTimer = 4.0;
        game.animDuration = 4.0;
    } else {
        sfxLevelComplete();
        game.state = S.LEVEL_COMPLETE;
        game.animTimer = 2.5;
        game.animDuration = 2.5;
    }
}

function triggerFail() {
    if (game.hasShield) {
        game.hasShield = false;
        sfxShieldBreak();
        return;
    }
    sfxFail();
    stopBGM();
    game.state = S.FAIL_ANIM;
    game.animTimer = 1.8;
    game.animDuration = 1.8;
}

function finishAnim() {
    if (game.state === S.CHECKPOINT_ANIM) {
        startSection(game.level, game.section + 1);
    } else if (game.state === S.FAIL_ANIM) {
        startSection(game.lastCheckpoint.level, game.lastCheckpoint.section);
    } else if (game.state === S.LEVEL_COMPLETE) {
        game.state = S.LEVEL_SELECT;
    } else if (game.state === S.ALL_CLEAR) {
        game.state = S.LEVEL_SELECT;
    }
}

function startSection(level, section) {
    game.level   = level;
    game.section = section;
    game.obstacles = [];
    game.sectionObstacles = generateSection(level - 1);
    game.sectionDist = 0;
    game.nextObsIdx = 0;
    game.obstaclesCleared = 0;
    game.obstaclesTotal = LEVELS[level - 1].obs;

    // Reset player
    player.lane        = 1;
    player.x           = LANE_X_NEAR[1];
    player.targetX     = LANE_X_NEAR[1];
    player.transTimer  = 0;
    player.isJumping   = false;
    player.jumpProgress = 0;
    player.yOffset     = 0;

    initWeatherParticles();
    game.powerupItems = [];
    game.sectionBreakTimer = 0;
    game.activePowerup = null;
    game.hasShield = false;
    game.state = S.COUNTDOWN;
    game.countdownVal   = 3;
    game.countdownTimer = 1.0;
    sfxCountdown(3);
}

function startLevel(level) {
    game.level = level;
    game.section = 1;
    game.score = 0;
    game.lastCheckpoint = { level, section: 1 };
    startSection(level, 1);
}

// ── Draw ──────────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, CW, CH);
    switch (game.state) {
        case S.MENU:            drawMenu();          break;
        case S.LEVEL_SELECT:    drawLevelSelect();   break;
        case S.COUNTDOWN:       drawGame(); drawCountdown(); break;
        case S.PLAYING:         drawGame();          break;
        case S.CHECKPOINT_ANIM: drawGame(); drawCheckpointAnim(); break;
        case S.FAIL_ANIM:       drawGame(); drawFailAnim();       break;
        case S.LEVEL_COMPLETE:  drawGame(); drawLevelComplete();  break;
        case S.ALL_CLEAR:       drawGame(); drawAllClear();       break;
    }
    drawMuteBtn();
}

// ── Background / Track ────────────────────────────────────
function drawBackground() {
    const wCfg = getWeather();
    // Sky gradient (weather-themed)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VP_Y + 80);
    skyGrad.addColorStop(0,   wCfg.skyTop);
    skyGrad.addColorStop(0.5, wCfg.skyMid);
    skyGrad.addColorStop(1,   wCfg.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CW, VP_Y + 80);

    // Ground gradient (weather-themed)
    const gndGrad = ctx.createLinearGradient(0, VP_Y + 80, 0, CH);
    gndGrad.addColorStop(0,   wCfg.gndTop);
    gndGrad.addColorStop(0.5, wCfg.gndTop);
    gndGrad.addColorStop(1,   wCfg.gndBot);
    ctx.fillStyle = gndGrad;
    ctx.fillRect(0, VP_Y + 80, CW, CH - (VP_Y + 80));

    // Stars (dim/hidden in bright or stormy weather)
    if (wCfg.heat === 0) {
        const starAlpha = wCfg.fogAlpha > 0.35 ? 0.15 : (wCfg.fogAlpha > 0 ? 0.35 : 0.6);
        ctx.fillStyle = `rgba(255,255,255,${starAlpha})`;
        const starSeed = [120,45,230,80,310,30,50,140,260,190,370,60,420,100,15,290];
        for (let i = 0; i < starSeed.length; i += 2) {
            const sx = (starSeed[i] * 5.3 + 40) % CW;
            const sy = (starSeed[i+1] * 1.7 + 10) % (VP_Y + 60);
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2, 0, Math.PI*2);
            ctx.fill();
        }
    }
    // Weather sky icon / sun glow
    drawWeatherBackground(wCfg);

    // Track surface (trapezoid)
    ctx.fillStyle = '#2a2a3e';
    ctx.beginPath();
    ctx.moveTo(0,     CH);
    ctx.lineTo(CW,    CH);
    ctx.lineTo(CW,    NEAR_Y - 20);
    // widen the track base to full width
    const leftNear  = LANE_X_NEAR[0] - 120;
    const rightNear = LANE_X_NEAR[2] + 120;
    ctx.lineTo(rightNear, NEAR_Y - 20);
    ctx.lineTo(VP_X + 80, VP_Y + 20);
    ctx.lineTo(VP_X - 80, VP_Y + 20);
    ctx.lineTo(leftNear, NEAR_Y - 20);
    ctx.closePath();
    ctx.fill();

    // Track surface fill (trapezoid between VP and near)
    const trackGrad = ctx.createLinearGradient(0, VP_Y, 0, CH);
    trackGrad.addColorStop(0, '#1e1e40');
    trackGrad.addColorStop(1, '#2a2a50');
    ctx.fillStyle = trackGrad;
    ctx.beginPath();
    ctx.moveTo(VP_X - 55, VP_Y + 22);
    ctx.lineTo(VP_X + 55, VP_Y + 22);
    ctx.lineTo(LANE_X_NEAR[2] + 110, CH);
    ctx.lineTo(LANE_X_NEAR[0] - 110, CH);
    ctx.closePath();
    ctx.fill();

    // Lane dividers (dashed lines scrolling)
    drawLaneDividers();

    // Outer rails
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 8;
    // Left rail
    ctx.beginPath();
    ctx.moveTo(VP_X - 58, VP_Y + 22);
    ctx.lineTo(LANE_X_NEAR[0] - 112, CH);
    ctx.stroke();
    // Right rail
    ctx.beginPath();
    ctx.moveTo(VP_X + 58, VP_Y + 22);
    ctx.lineTo(LANE_X_NEAR[2] + 112, CH);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawLaneDividers() {
    // 2 dividers between 3 lanes
    for (let div = 0; div < 2; div++) {
        // Compute near/far x for this divider
        const nearX = LANE_X_NEAR[div] + (LANE_X_NEAR[div+1] - LANE_X_NEAR[div]) / 2;
        const farX  = VP_X; // all converge to VP_X

        // Draw scrolling dashes
        const DASH_COUNT = 18;
        for (let d = 0; d < DASH_COUNT; d++) {
            const t0 = ((d / DASH_COUNT) + game.scrollOffset) % 1;
            const t1 = Math.min(1, t0 + 0.03);
            if (t0 > 0.98) continue;
            const x0 = lerp(nearX, farX, t0);
            const y0 = lerp(NEAR_Y, VP_Y + 22, t0);
            const x1 = lerp(nearX, farX, t1);
            const y1 = lerp(NEAR_Y, VP_Y + 22, t1);
            const alpha = lerp(0.8, 0.2, t0);
            ctx.strokeStyle = `rgba(100,180,255,${alpha})`;
            ctx.lineWidth = lerp(2.5, 0.5, t0);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
    }

    // Ground neon strip glow
    ctx.strokeStyle = 'rgba(80,150,255,0.15)';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(VP_X, VP_Y + 22);
    ctx.lineTo(400, CH);
    ctx.stroke();
    ctx.lineWidth = 1;
}

function drawGame() {
    drawBackground();

    // Power-up collectibles (draw behind obstacles)
    for (const pu of game.powerupItems) drawPowerupItem(pu);

    // Sort and draw obstacles (far first)
    const sorted = [...game.obstacles].sort((a, b) => b.z - a.z);
    for (const obs of sorted) {
        drawObstacle(obs);
    }

    drawPlayer();
    drawWeatherForeground();
    drawHUD();
    if (game.sectionBreakTimer > 0) drawSectionBreakBanner();
}

function drawObstacle(obs) {
    if (obs.z > 1.02 || obs.z < -0.05) return;
    const t = clamp(obs.z, 0, 1);

    if (obs.laneB !== null) {
        // Two-lane obstacle
        const pA = projectPoint(obs.laneA, t);
        const pB = projectPoint(obs.laneB, t);
        const midX = (pA.x + pB.x) / 2;
        const midY = (pA.y + pB.y) / 2;
        const sc   = (pA.scale + pB.scale) / 2;
        drawObstacleEmoji(obs.type, midX, midY, sc * 1.4);
    } else {
        const p = projectPoint(obs.laneA, t);
        drawObstacleEmoji(obs.type, p.x, p.y, p.scale);
    }
}

function drawObstacleEmoji(type, x, y, scale) {
    const baseSize = type.tall ? 80 : 60;
    const sz = baseSize * scale;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + sz * 0.35, sz * 0.45, sz * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glow for tall obstacles
    if (type.tall) {
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 20 * scale;
    }

    ctx.font = `${sz}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type.emoji, x, y);
    ctx.shadowBlur = 0;
}

function drawPlayer() {
    const px = player.x;
    const py = NEAR_Y + player.yOffset;

    // Shield aura
    if (game.hasShield) {
        ctx.save();
        ctx.strokeStyle = 'rgba(79,195,247,0.75)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#4fc3f7';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(px, py - 10, 38, 44, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    // Invincible aura
    if (game.activePowerup?.id === 'INVINCIBLE') {
        ctx.save();
        ctx.strokeStyle = `rgba(255,152,0,${0.5 + 0.4 * Math.sin(Date.now() * 0.012)})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff9800';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(px, py - 10, 38, 44, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Shadow on ground
    const shadowAlpha = lerp(0.6, 0.15, -player.yOffset / 115);
    const shadowScale = lerp(1.0, 0.5, -player.yOffset / 115);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(px, NEAR_Y + 10, 28 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skateboard
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛹', px, py + 28);

    // Runner
    ctx.font = '52px serif';
    ctx.shadowColor = 'rgba(100,200,255,0.6)';
    ctx.shadowBlur = 15;
    ctx.fillText('🏃', px, py);
    ctx.shadowBlur = 0;
}

function drawPowerupItem(pu) {
    if (pu.z > 1.02 || pu.z < -0.05) return;
    const t = clamp(pu.z, 0, 1);
    const p = projectPoint(pu.lane, t);
    const sz = 42 * p.scale;
    // Glowing ring
    ctx.save();
    ctx.shadowColor = pu.type.color;
    ctx.shadowBlur = 16 * p.scale;
    ctx.strokeStyle = pu.type.color;
    ctx.lineWidth = 2.5 * p.scale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, sz * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${sz}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.type.emoji, p.x, p.y);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawSectionBreakBanner() {
    const elapsed = 3.5 - game.sectionBreakTimer;
    const alpha = elapsed < 0.4 ? elapsed / 0.4
                : game.sectionBreakTimer < 0.45 ? game.sectionBreakTimer / 0.45 : 1.0;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.92;
    ctx.fillStyle = '#00695c';
    roundRect(ctx, CW/2 - 210, CH/2 - 38, 420, 76, 18);
    ctx.fill();
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2.5;
    roundRect(ctx, CW/2 - 210, CH/2 - 38, 420, 76, 18);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✅ 存檔點！進入第 ${game.section}/3 節`, CW/2, CH/2 - 8);
    ctx.fillStyle = '#b2dfdb';
    ctx.font = '14px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('稍做休息… 前方即將出現障礎！', CW/2, CH/2 + 20);
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawHUD() {
    const cfg = LEVELS[game.level - 1];

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 10, 10, 310, 52, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`第 ${game.level} 關  |  第 ${game.section}/3 節`, 22, 28);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`分數：${game.score}`, 22, 50);

    // Active power-up indicator (below top bar)
    if (game.activePowerup || game.hasShield) {
        const hasBoth = game.activePowerup && game.hasShield;
        const barH = hasBoth ? 48 : 28;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, 10, 66, 175, barH, 8);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
        if (game.activePowerup) {
            const pu = game.activePowerup;
            ctx.fillStyle = PU[pu.id].color;
            ctx.fillText(`${PU[pu.id].emoji} ${PU[pu.id].name}  ${pu.timer.toFixed(1)}s`, 18, hasBoth ? 78 : 80);
        }
        if (game.hasShield) {
            ctx.fillStyle = '#4fc3f7';
            ctx.fillText(`🛡️ 護盾備妃`, 18, hasBoth ? 104 : 80);
        }
    }

    // Weather badge (top-right, below mute btn)
    const wDisp = getWeather();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, CW - 166, 62, 116, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${wDisp.icon} ${wDisp.name}`, CW - 108, 75);

    // Progress bar
    const barX = 10, barY = CH - 30, barW = CW - 20, barH = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, barX, barY, barW, barH, 9);
    ctx.fill();

    const prog = game.obstaclesTotal > 0
        ? clamp(game.obstaclesCleared / game.obstaclesTotal, 0, 1)
        : 0;
    const progGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    progGrad.addColorStop(0, '#00e5ff');
    progGrad.addColorStop(0.5, '#7c4dff');
    progGrad.addColorStop(1, '#e040fb');
    ctx.fillStyle = progGrad;
    roundRect(ctx, barX, barY, barW * prog, barH, 9);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, barX, barY, barW, barH, 9);
    ctx.stroke();

    // Section markers on bar
    for (let m = 1; m < 3; m++) {
        const mx = barX + barW * (m / 3);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(mx - 1, barY, 2, barH);
    }

    // Controls hint (only at start)
    if (game.obstaclesCleared < 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '13px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← → 左右移動   ↑ / 空白鍵 跳躍', CW / 2, CH - 48);
    }
}

// ── Menu ──────────────────────────────────────────────────
function drawMenu() {
    // ── bright border to confirm rendering ──
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, CW - 6, CH - 6);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, '#0d0221');
    bg.addColorStop(0.5, '#1a0533');
    bg.addColorStop(1, '#2d1b69');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    // Neon track lines decoration
    ctx.strokeStyle = 'rgba(100,180,255,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const x = (i * CW / 7) - 40;
        ctx.beginPath();
        ctx.moveTo(CW/2, CH * 0.1);
        ctx.lineTo(x, CH * 1.1);
        ctx.stroke();
    }

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '72px serif';
    ctx.fillText('🏃', CW/2, 140);

    const titleGrad = ctx.createLinearGradient(0, 195, 0, 245);
    titleGrad.addColorStop(0, '#00e5ff');
    titleGrad.addColorStop(1, '#e040fb');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 46px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('極速跑酷', CW/2, 220);

    ctx.fillStyle = 'rgba(200,200,255,0.7)';
    ctx.font = '18px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('跳躍閃避障礙，通關全部 40 關！', CW/2, 265);
    ctx.restore();

    // Buttons
    const hasSave = game.unlockedLevel > 1 || Object.keys(game.bestScores).length > 0;
    const btns = hasSave
        ? [{ label: '🎮 開始遊戲', id: 0 }, { label: '📂 繼續遊戲', id: 1 }]
        : [{ label: '🎮 開始遊戲', id: 0 }];

    btns.forEach((btn, i) => {
        const bx = CW/2 - 130, by = 330 + i * 80;
        const isHover = game.menuBtnHover === i;
        const btnGrad = ctx.createLinearGradient(bx, by, bx + 260, by + 52);
        if (btn.id === 1) {
            btnGrad.addColorStop(0, isHover ? '#0097a7' : '#006064');
            btnGrad.addColorStop(1, isHover ? '#00bcd4' : '#0097a7');
        } else {
            btnGrad.addColorStop(0, isHover ? '#7c4dff' : '#512da8');
            btnGrad.addColorStop(1, isHover ? '#e040fb' : '#9c27b0');
        }
        ctx.fillStyle = btnGrad;
        roundRect(ctx, bx, by, 260, 52, 26);
        ctx.fill();

        if (isHover) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            roundRect(ctx, bx, by, 260, 52, 26);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, bx + 130, by + 26);
    });

    // Controls hint
    ctx.fillStyle = 'rgba(180,180,255,0.5)';
    ctx.font = '14px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← → 左右移動   ↑ / 空白鍵 跳躍', CW/2, CH - 25);
}

// ── Level Select ──────────────────────────────────────────
function drawLevelSelect() {
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, '#0d0221');
    bg.addColorStop(1, '#2d1b69');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️ 選擇關卡', CW/2, 40);

    // 5 rows × 8 cols = 40 levels
    const COLS = 8;
    const btnW = 85, btnH = 58, gapX = 8, gapY = 10;
    const totalW = COLS * btnW + (COLS-1) * gapX;
    const startX = (CW - totalW) / 2;
    const startY = 72;

    for (let i = 0; i < 40; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const bx = startX + col * (btnW + gapX);
        const by = startY + row * (btnH + gapY);
        const lvl = i + 1;
        const unlocked = lvl <= game.unlockedLevel;
        const best = game.bestScores[lvl];

        if (unlocked) {
            const g = ctx.createLinearGradient(bx, by, bx + btnW, by + btnH);
            g.addColorStop(0, '#6a3dcc');
            g.addColorStop(1, '#b030d8');
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = '#2a1a50';   // dark-purple, visible against background
        }
        roundRect(ctx, bx, by, btnW, btnH, 10);
        ctx.fill();

        ctx.strokeStyle = unlocked ? 'rgba(220,170,255,0.75)' : 'rgba(140,100,220,0.45)';
        ctx.lineWidth = unlocked ? 2 : 1.5;
        roundRect(ctx, bx, by, btnW, btnH, 10);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';   // always reset before text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (unlocked) {
            ctx.font = '15px serif';
            ctx.fillText(WEATHER[LEVEL_WEATHER[lvl]].icon, bx + btnW/2, by + 14);
            ctx.font = 'bold 13px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
            ctx.fillText(`第 ${lvl} 關`, bx + btnW/2, by + btnH/2 + (best ? 1 : 8));
            if (best) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '9px "Comic Sans MS", sans-serif';
                ctx.fillText(`最高 ${best}`, bx + btnW/2, by + btnH/2 + 18);
            }
        } else {
            ctx.fillStyle = '#aa88ee';
            ctx.font = '12px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
            ctx.fillText(`第 ${lvl} 關`, bx + btnW/2, by + btnH/2 - 8);
            ctx.fillStyle = '#665588';
            ctx.font = '18px serif';
            ctx.fillText('🔒', bx + btnW/2, by + btnH/2 + 10);
        }
    }
}

// ── Countdown ─────────────────────────────────────────────
function drawCountdown() {
    const alpha = clamp(game.countdownTimer / 1.0, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,0.35)`;
    ctx.fillRect(0, 0, CW, CH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 30;

    if (game.countdownVal > 0) {
        const scale = lerp(1.8, 1.0, 1 - game.countdownTimer);
        ctx.save();
        ctx.translate(CW/2, CH/2);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 120px "Comic Sans MS", sans-serif';
        ctx.fillText(game.countdownVal, 0, 0);
        ctx.restore();
    } else {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 90px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
        ctx.fillText('GO！', CW/2, CH/2);
    }
    ctx.shadowBlur = 0;
}

// ── Checkpoint anim ───────────────────────────────────────
function drawCheckpointAnim() {
    const prog = 1 - game.animTimer / game.animDuration;
    const alpha = prog < 0.2 ? prog / 0.2 : prog > 0.8 ? (1-prog)/0.2 : 1.0;
    const scale = lerp(0.5, 1.05, Math.min(1, prog * 3));

    ctx.fillStyle = `rgba(0,0,0,0.5)`;
    ctx.fillRect(0, 0, CW, CH);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CW/2, CH/2);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#00c853';
    roundRect(ctx, -220, -55, 440, 110, 20);
    ctx.fill();
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 3;
    roundRect(ctx, -220, -55, 440, 110, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('✅ 存檔點已儲存！', 0, -12);
    ctx.font = '18px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ccffcc';
    ctx.fillText(`第 ${game.section + 1}/3 節即將開始`, 0, 26);
    ctx.restore();
    ctx.globalAlpha = 1;
}

// ── Fail anim ─────────────────────────────────────────────
function drawFailAnim() {
    const prog = 1 - game.animTimer / game.animDuration;
    const flashAlpha = prog < 0.15 ? (prog / 0.15) * 0.5 : 0;

    if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,0,0,${flashAlpha})`;
        ctx.fillRect(0, 0, CW, CH);
    }

    const alpha = prog < 0.2 ? prog / 0.2 : prog > 0.85 ? (1-prog)/0.15 : 1.0;
    const scale = lerp(0.4, 1.0, Math.min(1, prog * 2.5));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CW/2, CH/2);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#b71c1c';
    roundRect(ctx, -240, -60, 480, 120, 20);
    ctx.fill();
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 3;
    roundRect(ctx, -240, -60, 480, 120, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('💥 失敗！回到存檔點…', 0, -12);
    ctx.font = '17px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#ffcccc';
    ctx.fillText(`返回第 ${game.lastCheckpoint.level} 關 第 ${game.lastCheckpoint.section} 節`, 0, 28);
    ctx.restore();
    ctx.globalAlpha = 1;
}

// ── Level complete ────────────────────────────────────────
function drawLevelComplete() {
    const prog = 1 - game.animTimer / game.animDuration;

    // Particle celebration (simple)
    const numParticles = 30;
    ctx.save();
    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        const dist  = 120 + 80 * prog;
        const px    = CW/2 + Math.cos(angle + prog * 3) * dist * prog;
        const py    = CH/2 + Math.sin(angle + prog * 3) * dist * prog * 0.5;
        const emojis = ['⭐','🎉','✨','🌟','💫'];
        ctx.font = `${16 + (i%3)*4}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, 1 - prog * 1.2);
        ctx.fillText(emojis[i % emojis.length], px, py);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    const alpha = prog < 0.15 ? prog/0.15 : prog > 0.8 ? (1-prog)/0.2 : 1.0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.translate(CW/2, CH/2);

    ctx.fillStyle = '#311b92';
    roundRect(ctx, -220, -80, 440, 160, 24);
    ctx.fill();
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 3;
    roundRect(ctx, -220, -80, 440, 160, 24);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`🎉 第 ${game.level} 關完成！`, 0, -25);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`得分：${game.score}`, 0, 20);
    ctx.fillStyle = '#a5d6a7';
    ctx.font = '16px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('即將返回關卡選擇…', 0, 55);
    ctx.restore();
    ctx.globalAlpha = 1;
}

// ── All Clear ─────────────────────────────────────────────
function drawAllClear() {
    const prog = 1 - game.animTimer / game.animDuration;

    const bgGrad = ctx.createRadialGradient(CW/2, CH/2, 0, CW/2, CH/2, 500);
    bgGrad.addColorStop(0, '#3d0066');
    bgGrad.addColorStop(1, '#000033');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CW, CH);

    // Floating emojis
    const items = ['🌟','🎊','🏆','✨','🎉','💫','⭐','🥇'];
    for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + prog * 2;
        const r = 180 + 60 * Math.sin(prog * 5 + i);
        const px = CW/2 + Math.cos(angle) * r;
        const py = CH/2 + Math.sin(angle) * r * 0.5;
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[i % items.length], px, py);
    }

    const alpha = prog < 0.2 ? prog/0.2 : 1.0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 56px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillText('🏆 全部通關！', CW/2, CH/2 - 30);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px "Comic Sans MS", "Microsoft JhengHei", sans-serif';
    ctx.fillText('恭喜完成所有 40 個關卡！', CW/2, CH/2 + 30);
    ctx.fillStyle = '#a5d6a7';
    ctx.font = '16px "Comic Sans MS", sans-serif';
    ctx.fillText('即將返回關卡選擇…', CW/2, CH/2 + 68);
    ctx.restore();
    ctx.globalAlpha = 1;
}

// ── Input handling (clicks) ───────────────────────────────
function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top)  * (CH / rect.height);

    // Mute button (always active, top-right corner)
    if (mx >= CW - 52 && mx <= CW - 10 && my >= 10 && my <= 52) {
        resumeAudio();
        toggleMute();
        return;
    }

    if (game.state === S.MENU) {
        handleMenuClick(mx, my);
    } else if (game.state === S.LEVEL_SELECT) {
        handleLevelSelectClick(mx, my);
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top)  * (CH / rect.height);

    if (game.state === S.MENU) {
        const hasSave = game.unlockedLevel > 1 || Object.keys(game.bestScores).length > 0;
        const btnCount = hasSave ? 2 : 1;
        game.menuBtnHover = -1;
        for (let i = 0; i < btnCount; i++) {
            const bx = CW/2 - 130, by = 330 + i * 80;
            if (mx >= bx && mx <= bx + 260 && my >= by && my <= by + 52) {
                game.menuBtnHover = i;
            }
        }
    }
}

function handleMenuClick(mx, my) {
    resumeAudio();
    const hasSave = game.unlockedLevel > 1 || Object.keys(game.bestScores).length > 0;
    const btnCount = hasSave ? 2 : 1;
    for (let i = 0; i < btnCount; i++) {
        const bx = CW/2 - 130, by = 330 + i * 80;
        if (mx >= bx && mx <= bx + 260 && my >= by && my <= by + 52) {
            if (i === 0) {
                // New game — reset progress
                game.unlockedLevel = 1;
                game.bestScores = {};
                writeSave();
                game.state = S.LEVEL_SELECT;
            } else {
                // Continue
                game.state = S.LEVEL_SELECT;
            }
        }
    }
}

function handleLevelSelectClick(mx, my) {
    resumeAudio();
    const COLS = 8;
    const btnW = 85, btnH = 58, gapX = 8, gapY = 10;
    const totalW = COLS * btnW + (COLS-1) * gapX;
    const startX = (CW - totalW) / 2;
    const startY = 72;

    for (let i = 0; i < 40; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const bx = startX + col * (btnW + gapX);
        const by = startY + row * (btnH + gapY);
        const lvl = i + 1;
        if (lvl <= game.unlockedLevel && mx >= bx && mx <= bx+btnW && my >= by && my <= by+btnH) {
            startLevel(lvl);
        }
    }
}

// ── Mute button ──────────────────────────────────────────
function drawMuteBtn() {
    const bx = CW - 52, by = 10, bw = 42, bh = 42;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.fill();
    ctx.strokeStyle = isMuted ? 'rgba(255,80,80,0.7)' : 'rgba(100,200,255,0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.stroke();
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isMuted ? '🔇' : '🔊', bx + bw / 2, by + bh / 2);
}

// ── Utility: rounded rect ─────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ── Start ─────────────────────────────────────────────────
try { init(); } catch(e) {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#1a0533'; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('init() \u932f\u8aa4 / init() Error:', 10, 10);
    ctx.fillStyle = '#ffffff'; ctx.font = '13px monospace';
    ctx.fillText(String(e.message || e), 10, 35);
    console.error('init() failed:', e);
}
