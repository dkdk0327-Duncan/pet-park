'use strict';

const canvas = document.getElementById('mergeCanvas');
const ctx    = canvas.getContext('2d');
const CW = 1000, CH = 700;

// ── Layout ──────────────────────────────────────────────────
const BAR_H       = 50;
const LANE_TOP    = BAR_H;
const LANE_H      = 278;
const LANE_BOT    = LANE_TOP + LANE_H;
const LANE_Y      = LANE_TOP + Math.round(LANE_H * 0.68);
const GRID_ROWS   = 4;
const GRID_COLS   = 5;
const CELL_W      = 160;
const CELL_H      = 86;
const GRID_X      = (CW - GRID_COLS * CELL_W) / 2;
const GRID_Y      = LANE_BOT + 10;
const MON_SPAWN_X = 1030;
const MON_ESC_X   = -70;

// ── Data ─────────────────────────────────────────────────────
const CTYPES = [
    { id:0, emoji:'⚔️',  name:'武士', atk:1.2, dw:22, proj:'⚔️'  },
    { id:1, emoji:'🧙',  name:'法師', atk:1.5, dw:22, proj:'🔮'  },
    { id:2, emoji:'🏹',  name:'弓手', atk:1.0, dw:22, proj:'🏹'  },
    { id:3, emoji:'🛡️', name:'騎士', atk:0.8, dw:22, proj:'🛡️' },
    { id:4, emoji:'🧚',  name:'妖精', atk:0.6, dw:9,  proj:'💫'  },
    { id:5, emoji:'🐉',  name:'龍騎', atk:2.0, dw:3,  proj:'🔥'  },
];
const TDW = CTYPES.reduce((s,t) => s + t.dw, 0);

const MON_EMOJIS  = ['🐺','🐗','🐻','🦊','🦝','🦌','🐆','🦈','🐊','🦎',
                     '🦂','🕷️','🐍','🦇','🐲','👹','👺','💀','🧟','👾'];
const BOSS_EMOJIS = ['💀','👾','🐲','👹','🧟'];

const SAVE_KEY  = 'mergeHeroSave2';
const HERO_CD   = 1.4;
const AUTO_FIRE = 3.8;
const ATK_BASE  = 14;
const INIT_TIME = 120;

// ── State ────────────────────────────────────────────────────
let state      = 'START';
let grid       = new Array(GRID_COLS * GRID_ROWS).fill(null);
let heroCd     = new Array(GRID_COLS * GRID_ROWS).fill(0);
let heroAutoCd = new Array(GRID_COLS * GRID_ROWS).fill(0).map(() => Math.random() * AUTO_FIRE);

let stage      = 1;
let timer      = INIT_TIME;
let lives      = 3;
let kills      = 0;
let bossKilled = false;

let entities   = [];
let projs      = [];
let spawnQ     = [];
let spawnCd    = 0;
let spawnIv    = 2.4;
let uid        = 1;

let parts      = [];
let banner     = null;
let chestModal = null;
let dmgBoost   = 0;

let autoSaveT  = 0;
let lastTs     = 0;
let saveMsg    = '';
let saveMsgT   = 0;

let drag  = null;
let mX = 0, mY = 0;

// ── Utilities ─────────────────────────────────────────────────
function wrand() {
    let r = Math.random() * TDW;
    for (const t of CTYPES) { r -= t.dw; if (r <= 0) return t; }
    return CTYPES[5];
}

function cellIdx(px, py) {
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        const cx = GRID_X + (i % GRID_COLS) * CELL_W;
        const cy = GRID_Y + Math.floor(i / GRID_COLS) * CELL_H;
        if (px >= cx && px < cx + CELL_W && py >= cy && py < cy + CELL_H) return i;
    }
    return -1;
}

function cellCtr(i) {
    return { x: GRID_X + (i % GRID_COLS) * CELL_W + CELL_W / 2,
             y: GRID_Y + Math.floor(i / GRID_COLS) * CELL_H + CELL_H / 2 };
}

function freeSlots() {
    return grid.reduce((a, v, i) => v === null ? [...a, i] : a, []);
}

function addHero(tid, lv) {
    const sl = freeSlots();
    if (!sl.length) return false;
    grid[sl[0]] = { typeId: tid, level: lv };
    return true;
}

function monHp(s, boss)  { return Math.floor((boss ? 900 : 90)  * Math.pow(s, 1.3)); }
function monSpd(s, boss) { const b = 38 + s * 1.8; return boss ? b * 0.6 : b; }

// ── Wave generation ───────────────────────────────────────────
function genWave(s) {
    const q = [];
    const n = 4 + s;
    for (let i = 0; i < n; i++) {
        const mIdx = (s - 1 + i) % MON_EMOJIS.length;
        q.push({ kind:'monster', emoji:MON_EMOJIS[mIdx],
                 hp:monHp(s,false), spd:monSpd(s,false), sz:50, boss:false });
        q.push({ kind:'clock', bonus: 8 + Math.floor(s / 5) });
        if ((i + 1) % 5 === 0) q.push({ kind:'chest' });
    }
    q.push({ kind:'monster', emoji:BOSS_EMOJIS[s % BOSS_EMOJIS.length],
             hp:monHp(s,true), spd:monSpd(s,true), sz:74, boss:true });
    return q;
}

function startWave(s) {
    spawnQ     = genWave(s);
    spawnCd    = 0.6;
    spawnIv    = Math.max(0.75, 2.6 - s * 0.045);
    entities   = [];
    projs      = [];
    bossKilled = false;
}

function spawnNext() {
    if (!spawnQ.length) return;
    const d  = spawnQ.shift();
    const id = uid++;
    const yj = LANE_Y + (Math.random() - 0.5) * 26;
    if (d.kind === 'monster') {
        entities.push({ id, kind:'monster', x:MON_SPAWN_X, y:yj,
            hp:d.hp, hpMax:d.hp, spd:d.spd, emoji:d.emoji, sz:d.sz,
            boss:d.boss, flash:0 });
    } else if (d.kind === 'clock') {
        entities.push({ id, kind:'clock', x:MON_SPAWN_X, y:yj,
            spd:monSpd(stage, false) * 0.9, emoji:'⏰', sz:38, bonus:d.bonus });
    } else {
        entities.push({ id, kind:'chest', x:MON_SPAWN_X, y:yj,
            spd:monSpd(stage, false) * 0.42, emoji:'🎁', sz:46, hits:0 });
    }
}

// ── Power-up pool ─────────────────────────────────────────────
function buildPool() {
    const p = [];
    for (const t of CTYPES)
        p.push({ label:`召喚 Lv.1 ${t.emoji}${t.name}`,
                 desc:`格子加入一名新 ${t.name}`,
                 apply: () => addHero(t.id, 1) });
    p.push({ label:'全員 +1 等 ⬆️', desc:'所有英雄等級 +1（上限20）',
             apply: () => { for (const h of grid) if (h && h.level < 20) h.level++; } });
    p.push({ label:'+30 秒 ⏱️', desc:'立即增加 30 秒計時',
             apply: () => { timer = Math.min(timer + 30, 300); } });
    p.push({ label:'雙倍傷害 15秒 🔥', desc:'所有攻擊傷害 ×2，持續 15 秒',
             apply: () => { dmgBoost = 15; } });
    p.push({ label:'恢復 1 命 ❤️', desc:'增加一條命（上限5）',
             apply: () => { lives = Math.min(lives + 1, 5); } });
    return p;
}
function pick3() { return buildPool().sort(() => Math.random() - 0.5).slice(0, 3); }

// ── Particles ─────────────────────────────────────────────────
function pText(x, y, txt, col) {
    parts.push({ x, y, vx:(Math.random()-0.5)*2, vy:-2.5-Math.random()*2,
        life:1, decay:0.03, txt, col:col||'#ff4', sz:17, isText:true });
}
function pEmoji(x, y, em, sz) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3.5;
    parts.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
        life:1, decay:0.022+Math.random()*0.015, em, sz:sz||20 });
}
function pMerge(x, y) {
    for (let i = 0; i < 12; i++) {
        const a = (Math.PI*2*i)/12, sp = 2+Math.random()*3;
        parts.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
            life:1, decay:0.022, em:['⭐','✨','💫','🌟'][i%4], sz:18+Math.random()*10 });
    }
}
function upParts(dt) {
    for (let i = parts.length-1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) parts.splice(i, 1);
    }
}
function drParts() {
    for (const p of parts) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (p.isText) {
            ctx.fillStyle = p.col;
            ctx.font = `bold ${p.sz}px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
            ctx.fillText(p.txt, p.x, p.y);
        } else {
            ctx.font = `${p.sz}px serif`;
            ctx.fillText(p.em, p.x, p.y);
        }
    }
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// ── Save / Load ───────────────────────────────────────────────
function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
        v:3, grid:grid.map(h => h ? {typeId:h.typeId, level:h.level} : null),
        stage, timer, lives
    }));
    saveMsg = '已儲存 💾'; saveMsgT = 3;
}
function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
function loadSave() {
    try {
        const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
        if (d.v !== 3) return false;
        grid  = d.grid.map(h => h ? {typeId:h.typeId, level:h.level} : null);
        stage = d.stage; timer = d.timer || INIT_TIME; lives = d.lives || 3;
        heroCd     = new Array(GRID_COLS * GRID_ROWS).fill(0);
        heroAutoCd = new Array(GRID_COLS * GRID_ROWS).fill(0).map(() => Math.random() * AUTO_FIRE);
        return true;
    } catch { return false; }
}

// ── New Game ──────────────────────────────────────────────────
function newGame() {
    grid  = new Array(GRID_COLS * GRID_ROWS).fill(null);
    heroCd     = new Array(GRID_COLS * GRID_ROWS).fill(0);
    heroAutoCd = new Array(GRID_COLS * GRID_ROWS).fill(0).map(() => Math.random() * AUTO_FIRE);
    parts = []; banner = null; chestModal = null;
    autoSaveT = 0; lastTs = 0; dmgBoost = 0; kills = 0;
    timer = INIT_TIME; lives = 3; uid = 1; stage = 1;
    const sh = [...CTYPES].sort(() => Math.random() - 0.5);
    grid[0] = { typeId:sh[0].id, level:1 };
    grid[2] = { typeId:sh[1].id, level:1 };
    startWave(1);
    state = 'PLAYING';
    save();
}

// ── Fire projectile ───────────────────────────────────────────
function fire(slot) {
    if (state !== 'PLAYING') return;
    if (heroCd[slot] > 0) return;
    const h = grid[slot];
    if (!h) return;
    const monsters = entities.filter(e => e.kind === 'monster');
    if (!monsters.length) return;
    const tgt = monsters.reduce((a, b) => b.x > a.x ? b : a, monsters[0]);
    const { x:sx, y:sy } = cellCtr(slot);
    const dx = tgt.x - sx, dy = tgt.y - sy, d = Math.sqrt(dx*dx + dy*dy);
    const spd = 480;
    const dmg = h.level * CTYPES[h.typeId].atk * ATK_BASE * (dmgBoost > 0 ? 2 : 1);
    projs.push({ id:uid++, x:sx, y:sy, vx:(dx/d)*spd, vy:(dy/d)*spd,
                 dmg, em:CTYPES[h.typeId].proj, tid:tgt.id });
    heroCd[slot]    = HERO_CD;
    heroAutoCd[slot] = AUTO_FIRE;
}

// ── Boss killed ───────────────────────────────────────────────
function bossDown(e) {
    kills++;
    timer = Math.min(timer + 15, 300);
    for (let k = 0; k < 8; k++) pEmoji(e.x, e.y, e.emoji, 26);
    if (stage >= 30) { state = 'VICTORY'; localStorage.removeItem(SAVE_KEY); return; }
    bossKilled = true;
    banner = { txt:`⚡ Boss 擊敗！+15秒！`, t:2.5, mt:2.5, col:'rgba(200,100,0,0.95)' };
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) addHero(wrand().id, 1);
}

// ── Drawing helpers ───────────────────────────────────────────
function rr(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y, x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h, x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h, x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y, x+r,y);
    ctx.closePath();
    if (fill)   { ctx.fillStyle = fill;    ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw||2; ctx.stroke(); }
}

function badgeStyle(lv) {
    if (lv <= 5)  return { bg:'#7a3b00', tx:'#ffe0b0' };
    if (lv <= 10) return { bg:'#4a6070', tx:'#e8f4ff' };
    if (lv <= 15) return { bg:'#806000', tx:'#fff8c0' };
    return null;
}

function drawHero(h, cx, cy, fs, al) {
    if (!h) return;
    ctx.globalAlpha = al ?? 1;
    const t = CTYPES[h.typeId];
    ctx.font = `${fs}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.emoji, cx, cy - 2);
    const bx = cx + fs * 0.40, by = cy + fs * 0.40;
    const bs = badgeStyle(h.level);
    if (bs) {
        rr(bx-13, by-10, 26, 17, 5, bs.bg, '#000', 1);
        ctx.fillStyle = bs.tx; ctx.font = `bold 11px "Comic Sans MS",sans-serif`;
        ctx.textBaseline = 'middle'; ctx.fillText(String(h.level), bx, by-1);
    } else {
        const rg = ctx.createLinearGradient(bx-13, by-10, bx+13, by+7);
        rg.addColorStop(0, '#ff3300'); rg.addColorStop(0.5, '#ffd700'); rg.addColorStop(1, '#4488ff');
        rr(bx-13, by-10, 26, 17, 5, rg, '#fff', 1.5);
        ctx.fillStyle = '#fff'; ctx.font = `bold 11px "Comic Sans MS",sans-serif`;
        ctx.textBaseline = 'middle'; ctx.fillText(String(h.level), bx, by-1);
    }
    ctx.globalAlpha = (al ?? 1) * 0.92; ctx.fillStyle = '#e0d8ff';
    ctx.font = `11px "Microsoft JhengHei",sans-serif`;
    ctx.textBaseline = 'top'; ctx.fillText(t.name, cx, cy + fs * 0.54);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// ── Draw: top bar ─────────────────────────────────────────────
function drawBar() {
    rr(0, 0, CW, BAR_H, 0, 'rgba(6,1,18,0.98)', 'rgba(110,55,230,0.65)', 1.5);
    const tc = timer <= 20 ? '#ff4444' : timer <= 50 ? '#ffa040' : '#88ee88';
    ctx.fillStyle = tc; ctx.font = `bold 24px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`⏱️ ${Math.ceil(timer)}s`, 14, BAR_H/2);
    ctx.fillStyle = '#d0b8ff'; ctx.font = 'bold 19px "Comic Sans MS","Microsoft JhengHei",sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(`🗺️ 關卡 ${stage}/30`, CW/2, BAR_H/2);
    let ls = ''; for (let i=0;i<lives;i++) ls+='❤️'; for (let i=lives;i<3;i++) ls+='🖤';
    ctx.fillStyle = '#ff6b6b'; ctx.font = '20px serif'; ctx.textAlign = 'right';
    ctx.fillText(ls, 820, BAR_H/2);
    ctx.fillStyle = '#aaddff'; ctx.font = '16px "Microsoft JhengHei",sans-serif';
    ctx.fillText(`💀${kills}`, 985, BAR_H/2);
    if (dmgBoost > 0) {
        ctx.fillStyle = '#ff9800'; ctx.font = '14px "Microsoft JhengHei",sans-serif';
        ctx.textAlign = 'left'; ctx.fillText(`🔥×2 ${Math.ceil(dmgBoost)}s`, 228, BAR_H/2);
    }
    if (saveMsgT > 0) {
        ctx.globalAlpha = Math.min(1, saveMsgT);
        ctx.fillStyle = '#80ff80'; ctx.font = '13px "Microsoft JhengHei",sans-serif';
        ctx.textAlign = 'right'; ctx.fillText(saveMsg, CW-3, BAR_H/2-8);
        ctx.globalAlpha = 1;
    }
    ctx.textBaseline = 'alphabetic';
}

// ── Draw: lane ────────────────────────────────────────────────
function drawLane() {
    rr(0, LANE_TOP, CW, LANE_H, 0, 'rgba(8,3,22,0.97)', null);
    const gg = ctx.createLinearGradient(0, LANE_Y-34, 0, LANE_Y+58);
    gg.addColorStop(0, '#2a1352'); gg.addColorStop(1, '#3a1c6a');
    ctx.fillStyle = gg; ctx.fillRect(0, LANE_Y-34, CW, 92);
    ctx.strokeStyle = 'rgba(155,95,255,0.50)'; ctx.lineWidth = 2;
    ctx.setLineDash([22, 12]);
    ctx.beginPath(); ctx.moveTo(0, LANE_Y+30); ctx.lineTo(CW, LANE_Y+30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(110,55,200,0.72)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, LANE_Y-32); ctx.lineTo(CW, LANE_Y-32);
    ctx.moveTo(0, LANE_Y+56); ctx.lineTo(CW, LANE_Y+56);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,0,0,0.14)'; ctx.fillRect(0, LANE_Y-34, 82, 92);
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💔', 41, LANE_Y+10);
    const qm = spawnQ.filter(e => e.kind==='monster').length;
    if (qm > 0) {
        ctx.fillStyle = 'rgba(210,185,255,0.80)';
        ctx.font = '14px "Microsoft JhengHei",sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(`待機 ${qm} 隻 →`, CW-8, LANE_TOP+22);
    }
    for (const e of entities) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (e.kind === 'monster') {
            if (e.boss) {
                const gl = ctx.createRadialGradient(e.x,e.y,4,e.x,e.y,e.sz*1.4);
                gl.addColorStop(0,'rgba(255,60,0,0.60)'); gl.addColorStop(1,'rgba(255,0,0,0)');
                ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(e.x,e.y,e.sz*1.4,0,Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = e.flash>0 ? 0.4 : 1;
            ctx.font = `${e.sz}px serif`; ctx.fillText(e.emoji, e.x, e.y);
            ctx.globalAlpha = 1;
            const bw=e.sz*1.7, bh=9, bx=e.x-bw/2, by=e.y-e.sz*0.74;
            rr(bx,by,bw,bh,4,'#222',null);
            const rt=Math.max(0,e.hp/e.hpMax);
            if (rt>0) { const hc=rt>0.55?'#4caf50':rt>0.28?'#ff9800':'#f44336'; rr(bx,by,Math.max(4,bw*rt),bh,4,hc,null); }
            if (e.boss) {
                ctx.fillStyle='#fff'; ctx.font='bold 12px "Comic Sans MS",sans-serif';
                ctx.textBaseline='alphabetic'; ctx.fillText(`${Math.ceil(e.hp)}`,e.x,by-3);
            }
        } else if (e.kind === 'clock') {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle='rgba(0,210,255,0.28)'; ctx.beginPath(); ctx.arc(e.x,e.y,e.sz*0.72,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=1; ctx.font=`${e.sz}px serif`; ctx.fillText(e.emoji,e.x,e.y);
            ctx.fillStyle='#00ddff'; ctx.font='bold 13px "Microsoft JhengHei",sans-serif';
            ctx.textBaseline='alphabetic'; ctx.fillText(`+${e.bonus}s`,e.x,e.y+e.sz*0.65+15);
        } else if (e.kind === 'chest') {
            const r2=e.hits/3;
            ctx.globalAlpha=0.3+r2*0.55;
            ctx.fillStyle=`rgba(255,200,0,${0.32+r2*0.46})`; ctx.beginPath(); ctx.arc(e.x,e.y,e.sz*0.88,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=1; ctx.font=`${e.sz}px serif`; ctx.fillText(e.emoji,e.x,e.y);
            ctx.fillStyle='#ffd700'; ctx.font='bold 13px "Microsoft JhengHei",sans-serif';
            ctx.textBaseline='alphabetic'; ctx.fillText(`💥${e.hits}/3`,e.x,e.y+e.sz*0.65+15);
        }
        ctx.textBaseline='middle';
    }
    for (const p of projs) {
        ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(p.em, p.x, p.y);
    }
    ctx.textBaseline='alphabetic';
}

// ── Draw: hero grid ───────────────────────────────────────────
function drawGrid() {
    const px=GRID_X-10, py=GRID_Y-8, pw=GRID_COLS*CELL_W+20, ph=GRID_ROWS*CELL_H+16;
    rr(px, py, pw, ph, 14, 'rgba(6,1,20,0.95)', 'rgba(120,60,250,0.85)', 2.5);
    ctx.fillStyle='rgba(215,200,255,0.90)'; ctx.font='bold 13px "Microsoft JhengHei",sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.fillText('👥 英雄格（點擊 = 攻擊  ／  拖曳相同種類+等級 = 合體升等）', px+10, py-5);
    const ht = drag ? cellIdx(mX, mY) : -1;
    for (let i=0; i<GRID_COLS*GRID_ROWS; i++) {
        const col=i%GRID_COLS, row=Math.floor(i/GRID_COLS);
        const cx=GRID_X+col*CELL_W, cy=GRID_Y+row*CELL_H;
        const isSrc=drag&&drag.slot===i, isTgt=drag&&ht===i&&i!==drag.slot;
        const h=isSrc?null:grid[i], cd=heroCd[i], acd=heroAutoCd[i];
        let cf='rgba(48,14,95,0.88)', cs='rgba(130,70,255,0.60)', clw=1.5;
        if (isTgt) {
            const th=grid[i], cm=th&&th.typeId===drag.hero.typeId&&th.level===drag.hero.level&&drag.hero.level<20;
            cf=cm?'rgba(40,120,50,0.60)':(!th?'rgba(60,110,210,0.48)':'rgba(180,30,30,0.44)');
            cs=cm?'#4caf50':(!th?'#5588ee':'#ff5555'); clw=2.8;
        } else if (!drag&&grid[i]&&mX>=cx&&mX<cx+CELL_W&&mY>=cy&&mY<cy+CELL_H) {
            cf='rgba(95,30,210,0.94)'; cs='#c080ff'; clw=2.2;
        }
        rr(cx+3, cy+3, CELL_W-6, CELL_H-6, 10, cf, cs, clw);
        if (h) {
            drawHero(h, cx+CELL_W/2, cy+CELL_H/2-3, 36, cd>0?0.50:1);
            if (cd > 0) {
                const rt=cd/HERO_CD;
                rr(cx+3, cy+3+(CELL_H-6)*(1-rt), CELL_W-6, (CELL_H-6)*rt, 10, 'rgba(0,0,0,0.52)', null);
                ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.font='bold 13px "Comic Sans MS",sans-serif';
                ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(cd.toFixed(1), cx+CELL_W/2, cy+CELL_H/2);
                ctx.textBaseline='alphabetic';
            }
            if (acd > 0) {
                const ratio=1-acd/AUTO_FIRE;
                ctx.fillStyle='rgba(120,210,255,0.60)';
                ctx.fillRect(cx+4, cy+CELL_H-7, Math.max(1,(CELL_W-8)*ratio), 5);
            }
        }
    }
    if (drag) drawHero(drag.hero, mX, mY-12, 48, 0.82);
    ctx.textBaseline='alphabetic';
}

// ── Draw: banner ─────────────────────────────────────────────
function drawBanner() {
    if (!banner || banner.t <= 0) return;
    const al = Math.min(1, banner.t/0.3) * Math.min(1, (banner.mt-banner.t)/0.3+0.7);
    ctx.globalAlpha = Math.max(0, Math.min(1, al));
    rr(80, LANE_TOP+84, 840, 78, 18, banner.col, 'rgba(255,255,255,0.55)', 2);
    ctx.fillStyle='#fff'; ctx.font=`bold 27px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(banner.txt, CW/2, LANE_TOP+123);
    ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
}

// ── Draw: chest modal ─────────────────────────────────────────
function drawChestModal() {
    if (!chestModal) return;
    ctx.fillStyle='rgba(0,0,0,0.80)'; ctx.fillRect(0,0,CW,CH);
    rr(65,145,870,375,20,'rgba(14,3,38,0.99)','#ffd700',3);
    ctx.fillStyle='#ffd700'; ctx.font=`bold 28px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText('🎁 寶箱開啟！選擇一個獎勵', CW/2, 200);
    ctx.fillStyle='rgba(210,190,255,0.85)'; ctx.font='15px "Microsoft JhengHei",sans-serif';
    ctx.fillText('點擊其中一個選項（遊戲暫停中）', CW/2, 230);
    const cw=244, ch=195, sy=248;
    chestModal.choices.forEach((c, i) => {
        const cx=108+i*(cw+30);
        const hov=mX>=cx&&mX<=cx+cw&&mY>=sy&&mY<=sy+ch;
        rr(cx,sy,cw,ch,14,hov?'rgba(90,30,200,0.96)':'rgba(28,8,66,0.96)',hov?'#ffd700':'#8855cc',hov?3:2);
        ctx.fillStyle='#ffd700'; ctx.font=`bold 16px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(c.label, cx+cw/2, sy+ch*0.34);
        ctx.fillStyle='rgba(218,200,255,0.95)'; ctx.font='13px "Microsoft JhengHei",sans-serif';
        ctx.fillText(c.desc, cx+cw/2, sy+ch*0.62);
        if (hov) { ctx.fillStyle='#80ff80'; ctx.font='14px "Microsoft JhengHei",sans-serif'; ctx.fillText('▶ 選擇', cx+cw/2, sy+ch*0.86); }
    });
    ctx.textBaseline='alphabetic';
}

// ── Draw: start screen ────────────────────────────────────────
function drawStart() {
    const g=ctx.createLinearGradient(0,0,0,CH); g.addColorStop(0,'#0d0820'); g.addColorStop(1,'#2a0a55');
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
    ctx.fillStyle='rgba(255,255,255,0.13)';
    for (let i=0;i<70;i++){ ctx.beginPath(); ctx.arc((i*173+40)%CW,(i*113+55)%CH,1+(i%2),0,Math.PI*2); ctx.fill(); }
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillStyle='#ffd700'; ctx.font=`bold 66px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
    ctx.fillText('合體英雄', CW/2, 148);
    ctx.fillStyle='#d0b8ff'; ctx.font='22px "Comic Sans MS","Microsoft JhengHei",sans-serif';
    ctx.fillText('⚔️ 點擊英雄攻擊・合體升等・守護陣地・30 關通關 🐉', CW/2, 196);
    ctx.textBaseline='middle';
    ['⚔️','🧙','🏹','🛡️','🧚','🐉'].forEach((e,i)=>{ ctx.font='46px serif'; ctx.fillText(e,196+i*120,260); });
    ctx.textBaseline='alphabetic';
    ctx.fillStyle='#999'; ctx.font='15px "Microsoft JhengHei",sans-serif';
    ctx.fillText('6 種英雄 × 最高 20 級 × 計時挑戰 × 30 關', CW/2, 306);
    const hs=hasSave();
    if (hs) {
        rr(315,328,370,58,14,'#1b5e20','#4caf50',2.5);
        ctx.fillStyle='#fff'; ctx.font=`bold 25px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
        ctx.textAlign='center'; ctx.fillText('▶ 繼續遊戲', CW/2, 364);
    }
    const ny=hs?404:358;
    rr(315,ny,370,58,14,'#7b2ff7','#9c4dff',2.5);
    ctx.fillStyle='#fff'; ctx.font=`bold 25px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
    ctx.textAlign='center'; ctx.fillText('🌟 新遊戲', CW/2, ny+36);
    ctx.fillStyle='rgba(255,255,255,0.50)'; ctx.font='14px "Microsoft JhengHei",sans-serif';
    const hy=hs?500:450;
    ctx.fillText('💡 點擊英雄格 → 發射攻擊  ｜  拖曳相同種類+等級 → 合體升等', CW/2, hy);
    ctx.fillText('🎁 點寶箱 3 下打開 → 選獎勵  ｜  ⏰ 點鐘錶增加時間', CW/2, hy+24);
    ctx.fillText('💔 怪物逃出左邊扣命  ｜  ⏱️ 時間歸零失敗  ｜  Boss 倒地升關', CW/2, hy+48);
}

// ── Draw: end screens ─────────────────────────────────────────
function drawEnd(victory) {
    const g=ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,victory?'#0d0820':'#1a0000');
    g.addColorStop(1,victory?'#2a0a55':'#3d0808');
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    if (victory) {
        ctx.fillStyle='#ffd700'; ctx.font=`bold 68px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
        ctx.fillText('🎉 勝利！🎉', CW/2, 200);
        ctx.fillStyle='#d0b8ff'; ctx.font='26px "Microsoft JhengHei",sans-serif';
        ctx.fillText('你帶領英雄打倒了 30 關所有 Boss！', CW/2, 256);
    } else {
        ctx.fillStyle='#ff4444'; ctx.font=`bold 68px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
        ctx.fillText('💀 遊戲結束 💀', CW/2, 220);
        ctx.fillStyle='#d0b8ff'; ctx.font='26px "Microsoft JhengHei",sans-serif';
        ctx.fillText(`到達關卡 ${stage}  ｜  擊殺怪物 ${kills} 隻`, CW/2, 284);
    }
    rr(315,360,370,58,14,'#7b2ff7','#9c4dff',2.5);
    ctx.fillStyle='#fff'; ctx.font=`bold 25px "Comic Sans MS","Microsoft JhengHei",sans-serif`;
    ctx.textAlign='center'; ctx.fillText('🌟 再來一局', CW/2, 396);
    drParts();
}

// ── Main draw ─────────────────────────────────────────────────
function draw() {
    ctx.clearRect(0,0,CW,CH); ctx.textBaseline='alphabetic';
    if (state==='START')     { drawStart(); return; }
    if (state==='GAME_OVER') { drawEnd(false); return; }
    if (state==='VICTORY')   { drawEnd(true);  return; }
    const bg=ctx.createLinearGradient(0,0,0,CH);
    bg.addColorStop(0,'#0b0618'); bg.addColorStop(0.45,'#150933'); bg.addColorStop(1,'#180a35');
    ctx.fillStyle=bg; ctx.fillRect(0,0,CW,CH);
    drawLane(); drawGrid(); drawBar(); drawBanner(); drParts();
    if (state==='CHEST_OPEN') drawChestModal();
}

// ── Main update ───────────────────────────────────────────────
function update(ts) {
    if (!lastTs) lastTs=ts;
    const dt=Math.min((ts-lastTs)/1000, 0.08);
    lastTs=ts;
    if (state==='VICTORY'||state==='GAME_OVER'){ upParts(dt); return; }
    if (state==='CHEST_OPEN'){ upParts(dt); return; }
    if (state!=='PLAYING') return;
    if (saveMsgT>0) saveMsgT-=dt;
    if (banner&&banner.t>0) banner.t-=dt;
    if (dmgBoost>0) dmgBoost=Math.max(0,dmgBoost-dt);
    for (let i=0;i<heroCd.length;i++) if (heroCd[i]>0) heroCd[i]=Math.max(0,heroCd[i]-dt);
    for (let i=0;i<GRID_COLS*GRID_ROWS;i++) {
        if (!grid[i]) continue;
        heroAutoCd[i]-=dt;
        if (heroAutoCd[i]<=0){ fire(i); heroAutoCd[i]=AUTO_FIRE; }
    }
    timer-=dt;
    if (timer<=0){ timer=0; state='GAME_OVER'; return; }
    autoSaveT+=dt; if (autoSaveT>=30){ autoSaveT=0; save(); }
    if (spawnQ.length>0){ spawnCd-=dt; if (spawnCd<=0){ spawnNext(); spawnCd=spawnIv; } }
    for (let i=entities.length-1;i>=0;i--) {
        const e=entities[i]; e.x-=e.spd*dt;
        if (e.kind==='monster'&&e.flash>0) e.flash-=dt;
        if (e.x<MON_ESC_X) {
            entities.splice(i,1);
            if (e.kind==='monster') {
                if (e.boss) {
                    lives=Math.max(0,lives-2);
                    banner={txt:'💀 Boss 逃脫！-2命！',t:2.5,mt:2.5,col:'rgba(155,10,10,0.96)'};
                    if (lives<=0){ state='GAME_OVER'; return; }
                    setTimeout(()=>{ if(state==='PLAYING'){
                        entities.push({id:uid++,kind:'monster',x:MON_SPAWN_X,y:LANE_Y,
                            hp:monHp(stage,true),hpMax:monHp(stage,true),spd:monSpd(stage,true),
                            emoji:BOSS_EMOJIS[stage%BOSS_EMOJIS.length],sz:74,boss:true,flash:0});
                    }},4000);
                } else {
                    lives=Math.max(0,lives-1);
                    banner={txt:`💔 怪物逃脫！剩 ${lives} 命`,t:1.4,mt:1.4,col:'rgba(130,10,10,0.92)'};
                    if (lives<=0){ state='GAME_OVER'; return; }
                }
            }
        }
    }
    if (spawnQ.length===0&&entities.length===0&&bossKilled) {
        stage++; bossKilled=false; startWave(stage); save();
        banner={txt:`✨ 關卡 ${stage} 開始！`,t:2,mt:2,col:'rgba(36,100,36,0.93)'};
    }
    for (let i=projs.length-1;i>=0;i--) {
        const p=projs[i]; p.x+=p.vx*dt; p.y+=p.vy*dt;
        let hit=false;
        for (let j=entities.length-1;j>=0;j--) {
            const e=entities[j]; if(e.kind!=='monster') continue;
            const dx=p.x-e.x, dy=p.y-e.y;
            if (Math.sqrt(dx*dx+dy*dy)<e.sz*0.56) {
                e.hp-=p.dmg; e.flash=0.1;
                pText(p.x,p.y-10,`-${Math.floor(p.dmg)}`,'#ffee00');
                if (e.hp<=0) {
                    if (e.boss) bossDown(e);
                    else { kills++; if(Math.random()<0.38&&freeSlots().length>0) addHero(wrand().id,1); }
                    entities.splice(j,1);
                }
                hit=true; break;
            }
        }
        if (hit||p.x>MON_SPAWN_X+80||p.x<-80||p.y<LANE_TOP-80||p.y>CH+80) projs.splice(i,1);
    }
    upParts(dt);
}

function gameLoop(ts){ update(ts); draw(); requestAnimationFrame(gameLoop); }

// ── Input ─────────────────────────────────────────────────────
function cpos(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*(CW/r.width),y:(e.clientY-r.top)*(CH/r.height)}; }

canvas.addEventListener('mousemove', e=>{
    const {x,y}=cpos(e); mX=x; mY=y;
    if (drag&&Math.sqrt((x-drag.sx)**2+(y-drag.sy)**2)>9) drag.isDrag=true;
    if (state==='PLAYING'&&!drag) { const idx=cellIdx(x,y); canvas.style.cursor=(idx>=0&&grid[idx])?'pointer':'default'; }
});

canvas.addEventListener('mousedown', e=>{
    const {x,y}=cpos(e);
    if (state==='START') {
        const hs=hasSave();
        if (hs&&x>=315&&x<=685&&y>=328&&y<=386){ if(loadSave()){ startWave(stage); state='PLAYING'; } return; }
        const ny=hs?404:358;
        if (x>=315&&x<=685&&y>=ny&&y<=ny+58) newGame();
        return;
    }
    if (state==='GAME_OVER'||state==='VICTORY'){
        if (x>=315&&x<=685&&y>=360&&y<=418) newGame(); return;
    }
    if (state==='CHEST_OPEN'){
        if (!chestModal) return;
        const cw=244,ch=195,sy=248;
        chestModal.choices.forEach((c,i)=>{
            const cx=108+i*(cw+30);
            if (x>=cx&&x<=cx+cw&&y>=sy&&y<=sy+ch){
                c.apply(); chestModal=null; state='PLAYING';
                banner={txt:`✨ ${c.label} 獲得！`,t:2,mt:2,col:'rgba(30,90,30,0.95)'};
            }
        });
        return;
    }
    if (state!=='PLAYING') return;
    for (let i=entities.length-1;i>=0;i--) {
        const e=entities[i]; const dx=x-e.x, dy=y-e.y;
        if (Math.sqrt(dx*dx+dy*dy)<e.sz*0.72+10) {
            if (e.kind==='clock') {
                timer=Math.min(timer+e.bonus,300);
                banner={txt:`⏰ +${e.bonus} 秒！`,t:1.4,mt:1.4,col:'rgba(0,120,180,0.94)'};
                pText(e.x,e.y-30,`+${e.bonus}s`,'#00ddff');
                entities.splice(i,1); return;
            }
            if (e.kind==='chest'&&!e.opened) {
                e.hits++; pText(e.x,e.y-32,`💥${e.hits}/3`,'#ffd700');
                if (e.hits>=3){ e.opened=true; entities.splice(i,1); chestModal={choices:pick3()}; state='CHEST_OPEN'; return; }
                return;
            }
        }
    }
    const slot=cellIdx(x,y);
    if (slot>=0&&grid[slot]){ drag={slot,hero:{...grid[slot]},isDrag:false,sx:x,sy:y}; grid[slot]=null; canvas.style.cursor='grabbing'; }
});

canvas.addEventListener('mouseup', e=>{
    if (!drag) return;
    const {x,y}=cpos(e);
    if (!drag.isDrag) {
        const s=drag.slot; grid[s]=drag.hero; drag=null; canvas.style.cursor='default';
        fire(s); return;
    }
    const tgt=cellIdx(x,y);
    if (tgt<0||tgt===drag.slot) {
        grid[drag.slot]=drag.hero;
    } else {
        const th=grid[tgt], cm=th&&th.typeId===drag.hero.typeId&&th.level===drag.hero.level&&drag.hero.level<20;
        if (cm) {
            const nl=drag.hero.level+1; grid[tgt]={typeId:drag.hero.typeId,level:nl}; grid[drag.slot]=null;
            const c=cellCtr(tgt); pMerge(c.x,c.y);
            if (nl===20) banner={txt:`🌟 ${CTYPES[drag.hero.typeId].name} 升到 Lv.20！`,t:2.5,mt:2.5,col:'rgba(200,100,0,0.95)'};
        } else if (th&&th.typeId===drag.hero.typeId&&drag.hero.level>=20) {
            banner={txt:'⭐ 已達最高等級 Lv.20！',t:1.8,mt:1.8,col:'rgba(55,55,80,0.93)'}; grid[drag.slot]=drag.hero;
        } else if (!th) {
            grid[tgt]=drag.hero; grid[drag.slot]=null;
        } else {
            grid[tgt]=drag.hero; grid[drag.slot]=th;
        }
    }
    drag=null; canvas.style.cursor='default';
});

canvas.addEventListener('mouseleave',()=>{ if(drag){ grid[drag.slot]=drag.hero; drag=null; canvas.style.cursor='default'; } });
window.addEventListener('beforeunload',()=>{ if(state==='PLAYING') save(); });

// ── Boot ──────────────────────────────────────────────────────
requestAnimationFrame(gameLoop);
