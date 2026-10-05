// =============================================================
//  寵物樂園 3D － 聲音 (全部用 Web Audio API 即時合成，不需要音檔)
//  背景音樂 (白天輕快曲 / 晚上搖籃曲)、20 種寵物叫聲、遊戲音效、環境音
// =============================================================
(function () {
    'use strict';
    const AC = window.AudioContext || window.webkitAudioContext;

    let ctx = null, master, musicBus, sfxBus, ambBus, noiseBuf, analyser;
    let musicOn = true, sfxOn = true;
    try {
        musicOn = localStorage.getItem('petMusic') !== '0';
        sfxOn = localStorage.getItem('petSfx') !== '0';
    } catch (e) { /* ignore */ }

    const MUSIC_VOL = 0.18, SFX_VOL = 1.1, AMB_VOL = 0.35;

    function ensure() {
        if (!AC) return false;
        if (!ctx) {
            ctx = new AC();
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -14; comp.ratio.value = 4;
            master = ctx.createGain(); master.gain.value = 0.9;
            master.connect(comp); comp.connect(ctx.destination);
            analyser = ctx.createAnalyser(); analyser.fftSize = 2048; comp.connect(analyser);
            musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0; musicBus.connect(master);
            sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? SFX_VOL : 0; sfxBus.connect(master);
            ambBus = ctx.createGain(); ambBus.gain.value = sfxOn ? AMB_VOL : 0; ambBus.connect(master);
            // 白噪音 (給呼吸聲、水聲、打擊樂用)
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            startScheduler();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return true;
    }
    // 瀏覽器規定要使用者操作後才能出聲 → 第一次點擊時啟動
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, ensure, { capture: true, passive: true }));

    const now = () => ctx.currentTime;
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    // ---------- 基本合成積木 ----------
    function out(bus, pan) {
        if (pan && ctx.createStereoPanner) {
            const p = ctx.createStereoPanner();
            p.pan.value = Math.max(-1, Math.min(1, pan));
            p.connect(bus);
            return p;
        }
        return bus;
    }
    function env(g, t, a, peak, d, sustain, r) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
        if (sustain !== undefined) {
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sustain), t + a + d);
            g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
            return t + a + d + r;
        }
        g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
        return t + a + d;
    }
    // 音調滑動的振盪器
    function tone(dest, t, o) {
        const osc = ctx.createOscillator();
        osc.type = o.type || 'sine';
        const f = o.freq;
        osc.frequency.setValueAtTime(f[0], t);
        for (let i = 1; i < f.length; i++) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, f[i]), t + o.dur * (i / (f.length - 1)));
        }
        if (o.vib) {
            const lfo = ctx.createOscillator(), lg = ctx.createGain();
            lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
            lfo.connect(lg); lg.connect(osc.frequency);
            lfo.start(t); lfo.stop(t + o.dur + 0.1);
        }
        let node = osc;
        if (o.filter) {
            const fl = ctx.createBiquadFilter();
            fl.type = o.filter.type || 'lowpass';
            const ff = o.filter.freq;
            if (Array.isArray(ff)) {
                fl.frequency.setValueAtTime(ff[0], t);
                for (let i = 1; i < ff.length; i++) fl.frequency.exponentialRampToValueAtTime(ff[i], t + o.dur * (i / (ff.length - 1)));
            } else fl.frequency.value = ff;
            fl.Q.value = o.filter.q || 1;
            node.connect(fl); node = fl;
        }
        if (o.am) {
            // 振幅調變 (青蛙咕嚕聲)
            const amg = ctx.createGain(); amg.gain.value = 0.5;
            const lfo = ctx.createOscillator(), lg = ctx.createGain();
            lfo.frequency.value = o.am; lg.gain.value = 0.5;
            lfo.connect(lg); lg.connect(amg.gain);
            lfo.start(t); lfo.stop(t + o.dur + 0.1);
            node.connect(amg); node = amg;
        }
        const g = ctx.createGain();
        node.connect(g); g.connect(dest);
        const end = env(g, t, o.a || 0.01, o.vol || 0.3, o.dur, o.sus, o.r);
        osc.start(t); osc.stop(end + 0.05);
    }
    function noise(dest, t, o) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.playbackRate.value = o.rate || 1;
        const fl = ctx.createBiquadFilter();
        fl.type = o.type || 'bandpass';
        const ff = o.freq;
        if (Array.isArray(ff)) {
            fl.frequency.setValueAtTime(ff[0], t);
            fl.frequency.exponentialRampToValueAtTime(ff[1], t + o.dur);
        } else fl.frequency.value = ff;
        fl.Q.value = o.q || 1;
        const g = ctx.createGain();
        src.connect(fl); fl.connect(g); g.connect(dest);
        const end = env(g, t, o.a || 0.005, o.vol || 0.2, o.dur);
        src.start(t, Math.random()); src.stop(end + 0.05);
    }

    // =========================================================
    //  寵物叫聲
    // =========================================================
    // p = 音高倍率 (幼崽較高)、v = 音量
    const VOICES = {
        dog(d, t, p, v) {           // 汪汪
            for (let i = 0; i < 2; i++) {
                const s = t + i * 0.2;
                tone(d, s, { type: 'sawtooth', freq: [520 * p, 330 * p], dur: 0.12, vol: 0.32 * v, filter: { freq: 1500, q: 2 } });
                noise(d, s, { freq: 900 * p, q: 1.5, dur: 0.08, vol: 0.18 * v });
            }
        },
        cat(d, t, p, v) {           // 喵～
            tone(d, t, { type: 'sawtooth', freq: [620 * p, 900 * p, 560 * p], dur: 0.7, a: 0.06, vol: 0.2 * v, vib: [6, 12], filter: { type: 'bandpass', freq: [900, 2000, 1000], q: 3 } });
        },
        rabbit(d, t, p, v) {        // 嗅嗅 + 小小吱
            for (let i = 0; i < 3; i++) noise(d, t + i * 0.09, { type: 'highpass', freq: 3000, dur: 0.05, vol: 0.12 * v });
            tone(d, t + 0.3, { freq: [1800 * p, 2300 * p], dur: 0.08, vol: 0.08 * v });
        },
        hamster(d, t, p, v) {       // 吱吱
            for (let i = 0; i < 2; i++) tone(d, t + i * 0.12, { type: 'triangle', freq: [2600 * p, 3300 * p, 2800 * p], dur: 0.08, vol: 0.12 * v });
        },
        mouse(d, t, p, v) {         // 吱吱吱
            for (let i = 0; i < 3; i++) tone(d, t + i * 0.09, { freq: [3200 * p, 3800 * p], dur: 0.06, vol: 0.11 * v });
        },
        fox(d, t, p, v) {           // 嗷嗚 (高音吠)
            tone(d, t, { type: 'sawtooth', freq: [700 * p, 1100 * p, 650 * p], dur: 0.32, vol: 0.2 * v, filter: { type: 'bandpass', freq: 1500, q: 2 } });
            tone(d, t + 0.4, { type: 'sawtooth', freq: [800 * p, 600 * p], dur: 0.12, vol: 0.18 * v, filter: { type: 'bandpass', freq: 1500, q: 2 } });
        },
        bear(d, t, p, v) {          // 低吼
            tone(d, t, { type: 'sawtooth', freq: [140 * p, 110 * p, 95 * p], dur: 0.7, a: 0.08, vol: 0.32 * v, vib: [18, 8], filter: { freq: 600, q: 2 } });
            noise(d, t, { type: 'lowpass', freq: 500, dur: 0.6, vol: 0.12 * v });
        },
        panda(d, t, p, v) {         // 咩咩的軟叫
            tone(d, t, { type: 'triangle', freq: [340 * p, 300 * p], dur: 0.45, a: 0.05, vol: 0.25 * v, vib: [7, 14], filter: { freq: 1400 } });
        },
        koala(d, t, p, v) {         // 打呼似的咕嚕
            tone(d, t, { type: 'sawtooth', freq: [90 * p, 110 * p, 85 * p], dur: 0.6, a: 0.1, vol: 0.28 * v, am: 30, filter: { freq: 500 } });
        },
        tiger(d, t, p, v) { VOICES.lion(d, t, p * 1.1, v); },
        lion(d, t, p, v) {          // 吼～
            const baby = p > 1.2;
            const dur = baby ? 0.35 : 0.9;
            tone(d, t, { type: 'sawtooth', freq: [160 * p, 220 * p, 90 * p], dur, a: 0.06, vol: 0.2 * v, vib: [22, 10], filter: { freq: [500, 1400, 400], q: 1.5 } });
            noise(d, t, { type: 'bandpass', freq: [600, 300], q: 0.8, dur, vol: 0.1 * v });
        },
        cow(d, t, p, v) {           // 哞～
            tone(d, t, { type: 'sawtooth', freq: [150 * p, 135 * p, 120 * p], dur: 1.0, a: 0.12, vol: 0.28 * v, vib: [5, 3], filter: { type: 'bandpass', freq: [400, 800, 380], q: 4 } });
        },
        pig(d, t, p, v) {           // 嚄嚄
            for (let i = 0; i < 2; i++) {
                const s = t + i * 0.2;
                tone(d, s, { type: 'square', freq: [260 * p, 220 * p], dur: 0.12, vol: 0.2 * v, filter: { type: 'bandpass', freq: 1100, q: 5 } });
                noise(d, s, { freq: 700, q: 3, dur: 0.1, vol: 0.12 * v });
            }
        },
        frog(d, t, p, v) {          // 呱呱
            for (let i = 0; i < 2; i++) tone(d, t + i * 0.3, { type: 'square', freq: [200 * p, 170 * p], dur: 0.2, vol: 0.18 * v, am: 45, filter: { freq: 900, q: 3 } });
        },
        monkey(d, t, p, v) {        // 嗚嗚啊啊
            [0, 0.16, 0.32].forEach((s, i) => tone(d, t + s, { type: 'triangle', freq: [500 * p, (800 + i * 150) * p], dur: 0.13, vol: 0.2 * v }));
            tone(d, t + 0.52, { type: 'sawtooth', freq: [900 * p, 1200 * p, 700 * p], dur: 0.3, vol: 0.14 * v, filter: { type: 'bandpass', freq: 1500, q: 2 } });
        },
        penguin(d, t, p, v) {       // 嘎嘎
            for (let i = 0; i < 3; i++) tone(d, t + i * 0.16, { type: 'sawtooth', freq: [420 * p, 380 * p], dur: 0.11, vol: 0.18 * v, filter: { type: 'bandpass', freq: 1100, q: 4 } });
        },
        bird(d, t, p, v) {          // 啾啾啾
            for (let i = 0; i < 3; i++) tone(d, t + i * 0.11, { freq: [3000 * p, 4600 * p, 3600 * p], dur: 0.07, vol: 0.12 * v });
        },
        chick(d, t, p, v) {         // 嗶嗶
            for (let i = 0; i < 2; i++) tone(d, t + i * 0.15, { type: 'triangle', freq: [2200 * p, 2700 * p, 2400 * p], dur: 0.1, vol: 0.15 * v });
        },
        duck(d, t, p, v) {          // 呱呱 (鴨子)
            for (let i = 0; i < 2; i++) {
                const s = t + i * 0.22;
                tone(d, s, { type: 'sawtooth', freq: [480 * p, 360 * p], dur: 0.15, vol: 0.22 * v, filter: { type: 'bandpass', freq: 1200, q: 3 } });
                noise(d, s, { freq: 1500, q: 2, dur: 0.12, vol: 0.1 * v });
            }
        },
        owl(d, t, p, v) {           // 咕咕
            [0, 0.38].forEach(s => tone(d, t + s, { freq: [390 * p, 360 * p], dur: 0.3, a: 0.06, vol: 0.25 * v }));
        },
    };

    let lastVoice = 0;
    function petVoice(species, o) {
        o = o || {};
        if (!sfxOn || !ensure()) return;
        const t = now();
        if (!o.force && t - lastVoice < 0.9) return; // 避免太吵
        lastVoice = t;
        const f = VOICES[species];
        if (!f) return;
        const p = (o.baby ? 1.35 : 1) * (0.95 + Math.random() * 0.1);
        f(out(sfxBus, o.pan), t + 0.01, p, o.vol === undefined ? 1 : o.vol);
    }

    // =========================================================
    //  遊戲音效
    // =========================================================
    const SFX = {
        click(d, t) { tone(d, t, { type: 'triangle', freq: [700, 1050], dur: 0.06, vol: 0.18 }); },
        pet(d, t) { [0, 0.07].forEach((s, i) => tone(d, t + s, { freq: [mtof(84 + i * 4)], dur: 0.18, vol: 0.12 })); },
        toss(d, t) { noise(d, t, { freq: [800, 3000], q: 1, dur: 0.18, vol: 0.12 }); tone(d, t + 0.4, { type: 'triangle', freq: [300, 180], dur: 0.06, vol: 0.12 }); },
        eat(d, t) { for (let i = 0; i < 4; i++) noise(d, t + i * 0.11, { type: 'bandpass', freq: 1800 + Math.random() * 800, q: 2, dur: 0.05, vol: 0.18 }); },
        yum(d, t) { tone(d, t, { type: 'triangle', freq: [mtof(76), mtof(83)], dur: 0.2, vol: 0.12 }); },
        drink(d, t) { tone(d, t, { freq: [900, 400], dur: 0.08, vol: 0.12 }); },
        water(d, t) {
            noise(d, t, { type: 'lowpass', freq: [1200, 3500], dur: 1.3, a: 0.15, vol: 0.18 });
            for (let i = 0; i < 6; i++) tone(d, t + i * 0.2 + Math.random() * 0.1, { freq: [700 + Math.random() * 500, 300], dur: 0.07, vol: 0.08 });
        },
        plop(d, t) { tone(d, t, { freq: [500, 120], dur: 0.12, vol: 0.18 }); },
        whee(d, t) { tone(d, t, { type: 'triangle', freq: [500, 1400], dur: 0.5, vol: 0.12, vib: [9, 25] }); noise(d, t, { freq: [600, 2400], dur: 0.6, vol: 0.06 }); },
        ding(d, t) { [0, 0.12].forEach((s, i) => tone(d, t + s, { freq: [mtof(88 - i * 4)], dur: 0.5, vol: 0.1 })); },
        sparkle(d, t) { [79, 83, 86, 91].forEach((m, i) => tone(d, t + i * 0.07, { freq: [mtof(m)], dur: 0.35, vol: 0.09 })); },
        love(d, t) { [76, 81, 84].forEach((m, i) => tone(d, t + i * 0.12, { type: 'triangle', freq: [mtof(m)], dur: 0.3, vol: 0.1 })); },
        boing(d, t) { tone(d, t, { freq: [220, 520], dur: 0.12, vol: 0.08 }); },
        fanfare(d, t) {
            [[72, 0], [76, 0.13], [79, 0.26], [84, 0.39], [79, 0.6], [84, 0.72]].forEach(([m, s]) => {
                tone(d, t + s, { type: 'square', freq: [mtof(m)], dur: 0.22, vol: 0.07, filter: { freq: 2500 } });
                tone(d, t + s, { type: 'triangle', freq: [mtof(m - 12)], dur: 0.22, vol: 0.08 });
            });
        },
        levelup(d, t) { [72, 76, 79, 84, 88].forEach((m, i) => tone(d, t + i * 0.08, { type: 'triangle', freq: [mtof(m)], dur: 0.3, vol: 0.1 })); },
        eagle(d, t) {
            tone(d, t, { type: 'sawtooth', freq: [2600, 3300, 1800], dur: 0.6, a: 0.04, vol: 0.12, vib: [28, 120], filter: { type: 'bandpass', freq: 2600, q: 3 } });
        },
        chirp(d, t) { const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) tone(d, t + i * 0.09, { freq: [3400 + Math.random() * 900, 5200, 3900], dur: 0.05, vol: 0.05 }); },
        honk(d, t) { [0, 0.3, 0.5].forEach(s => tone(d, t + s, { type: 'sawtooth', freq: [330, 300], dur: 0.16, vol: 0.06, filter: { type: 'bandpass', freq: 900, q: 3 } })); },
        gull(d, t) { [0, 0.35].forEach(s => tone(d, t + s, { type: 'triangle', freq: [1400, 1900, 1100], dur: 0.32, vol: 0.05 })); },
        flap(d, t) { for (let i = 0; i < 3; i++) noise(d, t + i * 0.22, { type: 'lowpass', freq: 500, dur: 0.12, vol: 0.18 }); },
        rainbow(d, t) { [72, 76, 79, 83, 86, 88, 91].forEach((m, i) => tone(d, t + i * 0.09, { freq: [mtof(m)], dur: 0.8, vol: 0.07 })); },
        night(d, t) { [79, 76, 72, 67].forEach((m, i) => tone(d, t + i * 0.25, { freq: [mtof(m)], dur: 0.9, vol: 0.08 })); },
        morning(d, t) { for (let i = 0; i < 5; i++) tone(d, t + i * 0.13, { freq: [2800 + Math.random() * 800, 4200], dur: 0.07, vol: 0.08 }); },
        adopt(d, t) { [76, 79, 84].forEach((m, i) => tone(d, t + i * 0.06, { type: 'triangle', freq: [mtof(m)], dur: 0.2, vol: 0.1 })); },
        error(d, t) { tone(d, t, { type: 'square', freq: [300, 200], dur: 0.15, vol: 0.06, filter: { freq: 1200 } }); },
        coin(d, t) { tone(d, t, { type: 'square', freq: [mtof(88)], dur: 0.07, vol: 0.06, filter: { freq: 4000 } }); tone(d, t + 0.07, { type: 'square', freq: [mtof(93)], dur: 0.25, vol: 0.06, filter: { freq: 4000 } }); },
        cash(d, t) {   // 收銀機「叮鈴」
            noise(d, t, { type: 'bandpass', freq: 2500, q: 2, dur: 0.12, vol: 0.12 });
            [88, 91, 96].forEach((m, i) => tone(d, t + 0.1 + i * 0.07, { freq: [mtof(m)], dur: 0.5, vol: 0.09 }));
        },
        splash(d, t) { noise(d, t, { type: 'lowpass', freq: [2500, 600], dur: 0.35, vol: 0.2 }); for (let i = 0; i < 3; i++) tone(d, t + i * 0.06, { freq: [900 + Math.random() * 600, 300], dur: 0.06, vol: 0.06 }); },
        gulp(d, t) { tone(d, t, { freq: [500, 220], dur: 0.07, vol: 0.07 }); },
        crank(d, t) { for (let i = 0; i < 4; i++) noise(d, t + i * 0.06, { type: 'bandpass', freq: 1400, q: 6, dur: 0.03, vol: 0.12 }); },
        creak(d, t) { tone(d, t, { type: 'sawtooth', freq: [300, 360, 280], dur: 0.4, vol: 0.03, filter: { type: 'bandpass', freq: 900, q: 8 } }); },
        sit(d, t) { noise(d, t, { type: 'lowpass', freq: 400, dur: 0.12, vol: 0.12 }); },
        thunder(d, t) {
            noise(d, t, { type: 'lowpass', freq: [900, 120], dur: 2.6, a: 0.05, vol: 0.45 });
            tone(d, t, { freq: [60, 35], dur: 2.2, a: 0.1, vol: 0.25 });
        },
    };
    function sfx(name, o) {
        o = o || {};
        if (!sfxOn || !ensure() || !SFX[name]) return;
        SFX[name](out(sfxBus, o.pan), now() + 0.01);
    }

    // =========================================================
    //  背景音樂 (程序化編曲)
    // =========================================================
    // 白天：C 大調輕快曲 (8 小節循環，8 分音符)
    const DAY = {
        bpm: 104,
        chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50], [41, 45, 48], [43, 47, 50]],
        melody: [
            [76, 0, 79, 0, 76, 74, 72, 0], [74, 0, 79, 0, 71, 0, 74, 0],
            [72, 0, 76, 0, 81, 79, 76, 0], [77, 76, 74, 72, 69, 0, 72, 0],
            [79, 0, 76, 0, 79, 81, 79, 0], [77, 0, 74, 0, 71, 72, 74, 0],
            [81, 79, 77, 76, 74, 0, 72, 0], [74, 0, 0, 0, 67, 0, 71, 0],
        ],
        // 第二段 (變奏)
        melody2: [
            [72, 74, 76, 0, 79, 0, 76, 0], [74, 0, 71, 0, 67, 0, 71, 74],
            [76, 0, 72, 0, 69, 72, 76, 0], [77, 0, 81, 0, 77, 76, 74, 0],
            [76, 74, 72, 0, 76, 0, 79, 0], [79, 77, 74, 0, 71, 0, 74, 0],
            [72, 0, 69, 72, 77, 0, 76, 74], [72, 0, 0, 0, 0, 0, 0, 0],
        ],
    };
    // 晚上：F 大調搖籃曲 (音樂盒，4 分音符)
    const NIGHT = {
        bpm: 66,
        chords: [[41, 45, 48], [36, 40, 43], [38, 41, 45], [34, 38, 41], [41, 45, 48], [36, 40, 43], [34, 38, 41], [36, 40, 43]],
        melody: [
            [81, 84, 81, 77], [79, 76, 72, 0], [77, 81, 86, 81], [79, 77, 74, 0],
            [81, 77, 84, 81], [79, 76, 79, 0], [77, 74, 70, 74], [72, 76, 77, 0],
        ],
    };

    let mode = 'day';            // 目前播放的曲子
    let wantMode = 'day';
    let dayGain = null, nightGain = null;
    let nextTime = 0, step = 0, nStep = 0, schedTimer = null, loopCount = 0;
    let paused = false;

    function startScheduler() {
        dayGain = ctx.createGain(); dayGain.gain.value = wantMode === 'day' ? 1 : 0.0001; dayGain.connect(musicBus);
        nightGain = ctx.createGain(); nightGain.gain.value = wantMode === 'night' ? 1 : 0.0001; nightGain.connect(musicBus);
        mode = wantMode;
        nextTime = now() + 0.15;
        schedTimer = setInterval(schedule, 25);
    }

    function pluck(dest, t, m, dur, vol) {
        tone(dest, t, { type: 'triangle', freq: [mtof(m)], dur, a: 0.005, vol });
        tone(dest, t, { type: 'square', freq: [mtof(m)], dur: dur * 0.6, a: 0.005, vol: vol * 0.18, filter: { freq: 2400 } });
    }
    function musicBox(dest, t, m, vol) {
        const f = mtof(m);
        tone(dest, t, { freq: [f], dur: 1.6, a: 0.004, vol });
        tone(dest, t, { freq: [f * 2], dur: 0.7, a: 0.004, vol: vol * 0.28 });
        tone(dest, t, { freq: [f * 3.01], dur: 0.3, a: 0.003, vol: vol * 0.12 });
    }
    function pad(dest, t, notes, dur, vol) {
        notes.forEach((m, i) => {
            [-6, 6].forEach(det => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = mtof(m + 12);
                osc.detune.value = det + i;
                const g = ctx.createGain();
                osc.connect(g); g.connect(dest);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.3));
                g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.8);
                g.gain.linearRampToValueAtTime(0.0001, t + dur);
                osc.start(t); osc.stop(t + dur + 0.05);
            });
        });
    }

    function schedule() {
        if (!ctx || paused) return;
        // 曲子切換 (淡入淡出)
        if (wantMode !== mode) {
            const t = now();
            const fadeIn = wantMode === 'day' ? dayGain : nightGain;
            const fadeOut = wantMode === 'day' ? nightGain : dayGain;
            fadeIn.gain.cancelScheduledValues(t); fadeOut.gain.cancelScheduledValues(t);
            fadeIn.gain.setValueAtTime(Math.max(0.0001, fadeIn.gain.value), t);
            fadeOut.gain.setValueAtTime(Math.max(0.0001, fadeOut.gain.value), t);
            fadeIn.gain.exponentialRampToValueAtTime(1, t + 3);
            fadeOut.gain.exponentialRampToValueAtTime(0.0001, t + 3);
            mode = wantMode;
            step = 0;
            nextTime = Math.max(nextTime, t + 0.1);
        }
        if (nextTime < now() - 0.5) nextTime = now() + 0.05; // 分頁回來時跳過積壓
        while (nextTime < now() + 0.2) {
            if (!musicOn) { nextTime += 0.25; continue; }
            if (mode === 'day') scheduleDay(nextTime); else scheduleNight(nextTime);
        }
    }

    function scheduleDay(t) {
        const S = DAY, eighth = 60 / S.bpm / 2;
        const bar = Math.floor(step / 8) % 8, pos = step % 8;
        const mel = (loopCount % 2 === 1) ? S.melody2 : S.melody;
        const chord = S.chords[bar];
        const dg = dayGain;
        // 和弦墊底
        if (pos === 0) pad(dg, t, chord, eighth * 8, 0.035);
        // 貝斯 (根音/五音彈跳)
        if (pos % 2 === 0) {
            const m = (pos === 0 || pos === 4) ? chord[0] - 12 : chord[2] - 12;
            tone(dg, t, { type: 'triangle', freq: [mtof(m)], dur: eighth * 1.6, a: 0.005, vol: 0.32 });
        }
        // 主旋律
        const note = mel[bar][pos];
        if (note) pluck(dg, t, note, eighth * 1.8, 0.2);
        // 合音 (偶數拍彈和弦音高八度)
        if (pos === 2 || pos === 6) pluck(dg, t, chord[1] + 24, eighth, 0.05);
        // 輕打擊
        if (pos === 0 || pos === 4) tone(dg, t, { freq: [130, 45], dur: 0.14, vol: 0.35 });
        if (pos === 2 || pos === 6) noise(dg, t, { type: 'bandpass', freq: 1800, q: 0.8, dur: 0.07, vol: 0.09 });
        noise(dg, t, { type: 'highpass', freq: 8000, dur: 0.03, vol: pos % 2 ? 0.03 : 0.05 });
        step++;
        if (step % 64 === 0) loopCount++;
        nextTime += eighth;
    }

    function scheduleNight(t) {
        const S = NIGHT, quarter = 60 / S.bpm;
        const bar = Math.floor(step / 4) % 8, pos = step % 4;
        const ng = nightGain;
        const chord = S.chords[bar];
        if (pos === 0) {
            pad(ng, t, chord, quarter * 4, 0.03);
            tone(ng, t, { freq: [mtof(chord[0] - 12)], dur: quarter * 3.5, a: 0.05, vol: 0.18 });
        }
        const note = S.melody[bar][pos];
        if (note) musicBox(ng, t, note - 12, 0.16);
        // 分解和弦
        musicBox(ng, t + quarter / 2, chord[(pos + 1) % 3] + 12, 0.04);
        step++;
        nextTime += quarter;
    }

    // =========================================================
    //  環境音：白天鳥叫、晚上蟲鳴
    // =========================================================
    let ambTimer = 0, isNightAmb = false;
    function ambience(dt, night) {
        if (!ctx || !sfxOn || paused) return;
        isNightAmb = night;
        ambTimer -= dt;
        if (ambTimer > 0) return;
        const t = now();
        const d = out(ambBus, Math.random() * 1.6 - 0.8);
        if (night) {
            // 蟋蟀
            ambTimer = 0.8 + Math.random() * 1.5;
            const f = 4200 + Math.random() * 600;
            for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) tone(d, t + i * 0.07, { freq: [f], dur: 0.04, vol: 0.05, am: 60 });
        } else {
            // 遠處的小鳥
            ambTimer = 2 + Math.random() * 5;
            const base = 2500 + Math.random() * 1500;
            const n = 2 + Math.floor(Math.random() * 4);
            for (let i = 0; i < n; i++) tone(d, t + i * (0.09 + Math.random() * 0.05), { freq: [base, base * (1.2 + Math.random() * 0.4), base * 0.9], dur: 0.06 + Math.random() * 0.05, vol: 0.05 });
        }
    }

    // =========================================================
    //  天氣音：雨聲 (持續) / 風聲 (下雪)
    // =========================================================
    let rainGain = null, windGain = null;
    function startWeatherLoops() {
        const mk = (type, freq, q) => {
            const src = ctx.createBufferSource();
            src.buffer = noiseBuf; src.loop = true;
            const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
            const g = ctx.createGain(); g.gain.value = 0;
            src.connect(f); f.connect(g); g.connect(ambBus);
            src.start();
            return { g, f };
        };
        const r1 = mk('bandpass', 2600, 0.6);
        const r2 = mk('lowpass', 700, 0.5);
        rainGain = [r1.g, r2.g];
        const w = mk('lowpass', 380, 1.5);
        windGain = w;
        // 風聲忽大忽小
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.15; lg.gain.value = 140;
        lfo.connect(lg); lg.connect(w.f.frequency);
        lfo.start();
    }
    function setWeather(rain, snow) {
        if (!ctx) return;
        if (!rainGain) startWeatherLoops();
        const t = now();
        rainGain[0].gain.setTargetAtTime(rain * 0.55, t, 0.5);
        rainGain[1].gain.setTargetAtTime(rain * 0.35, t, 0.5);
        windGain.g.gain.setTargetAtTime(snow * 0.45 + rain * 0.1, t, 0.8);
    }

    // ---------- 開關 ----------
    function setMusic(on) {
        musicOn = on;
        try { localStorage.setItem('petMusic', on ? '1' : '0'); } catch (e) { /* ignore */ }
        if (ensure()) {
            musicBus.gain.cancelScheduledValues(now());
            musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, now(), 0.15);
        }
    }
    function setSfx(on) {
        sfxOn = on;
        try { localStorage.setItem('petSfx', on ? '1' : '0'); } catch (e) { /* ignore */ }
        if (ensure()) {
            sfxBus.gain.setTargetAtTime(on ? SFX_VOL : 0, now(), 0.05);
            ambBus.gain.setTargetAtTime(on ? AMB_VOL : 0, now(), 0.2);
        }
    }
    function setNight(night) { wantMode = night ? 'night' : 'day'; }

    // 切到背景分頁時暫停，回來再繼續
    document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        paused = document.hidden;
        if (paused) ctx.suspend(); else ctx.resume();
    });

    window.PetAudio = {
        supported: !!AC,
        petVoice, sfx, ambience, setMusic, setSfx, setNight, setWeather,
        get musicOn() { return musicOn; },
        get sfxOn() { return sfxOn; },
        get running() { return !!ctx && ctx.state === 'running'; },
        // 除錯用：目前輸出音量 (RMS)
        level() {
            if (!analyser) return 0;
            const a = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(a);
            let s = 0; for (const v of a) s += v * v;
            return Math.sqrt(s / a.length);
        },
    };
})();
