// =============================================================
//  夢幻化妝間 (3D 化妝換裝)
//  娃娃模型在 doll3d.js (寵物樂園也用同一套)；這裡負責
//  選單、化妝畫畫、客人任務、鏡頭、動畫、拍照。
// =============================================================
(function () {
    'use strict';
    THREE.ColorManagement.legacyMode = false;
    const $ = id => document.getElementById(id);

    // =========================================================
    //  圖示 (線條 SVG)
    // =========================================================
    const ICON_PATHS = {
        back: '<path d="M15 5l-7 7 7 7"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>',
        zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8.5 11h5M11 8.5v5"/>',
        shuffle: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
        reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
        camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
        paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="17" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><path d="M12 12c-3 0-5.5 3-5.5 5.2 0 1.6 1.4 2.3 3 1.8l2.5-.7 2.5.7c1.6.5 3-.2 3-1.8C17.5 15 15 12 12 12z"/>',
        sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
        mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9l5 6M22 9l-5 6"/>',
        char: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"/>',
        hair: '<path d="M5 14V11a7 7 0 0 1 14 0v3"/><path d="M5 14c0 3 1 5 2.5 6M19 14c0 3-1 5-2.5 6"/><path d="M8 9c2 1.5 6 1.5 8-1"/>',
        face: '<path d="M10 21h4a1 1 0 0 0 1-1v-7H9v7a1 1 0 0 0 1 1z"/><path d="M10 13V7.5L14 4v9"/>',
        paint: '<path d="M18.5 3.5l2 2-8.5 8.5-2-2z"/><path d="M10 12c-2.6 0-4 1.6-4 3.6 0 1.4-.8 2.4-2 2.9 2.5 1.2 7 .8 7.6-1.8.4-1.6-.2-3.2-1.6-4.7z"/>',
        cloth: '<path d="M9 3.5h6l-.8 4L19 20H5l4.8-12.5z"/><path d="M9.8 7.5h4.4"/>',
        acc: '<path d="M3.5 8.5l4.2 4L12 5l4.3 7.5 4.2-4L18.5 19h-13z"/>',
        fun: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.6 2.1 2.4 3.5 2.4s2.6-.8 3.5-2.4"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>',
    };
    const icon = k => '<svg class="ico" viewBox="0 0 24 24">' + ICON_PATHS[k] + '</svg>';
    document.querySelectorAll('[data-icon]').forEach(el => (el.innerHTML = icon(el.dataset.icon)));

    // =========================================================
    //  資料
    // =========================================================
    const SKINS_HUMAN = ['#ffe3cf', '#ffd2b0', '#f0b98d', '#d6946a', '#a86a45', '#7a4a2e'];
    const SKINS_FUR = ['#f8f4f0', '#ffe9a8', '#ffc48a', '#c8c8d0', '#a8784f', '#ffc4d8', '#bfe3ff'];
    const CHARS = {
        girl:  { name: '女孩', icon: '👧', skin: '#ffe3cf', hair: 'long', hairColor: '#4a2a14', outfit: 'dress', outfitColor: '#ff8fc0' },
        boy:   { name: '男孩', icon: '👦', skin: '#ffd2b0', hair: 'short', hairColor: '#2a1a12', outfit: 'tee', outfitColor: '#5fb0f0' },
        bunny: { name: '小兔', icon: '🐰', skin: '#f8f4f0', hair: 'none', hairColor: '#f3d77a', outfit: 'tutu', outfitColor: '#ffe066' },
        kitty: { name: '小貓', icon: '🐱', skin: '#ffc48a', hair: 'none', hairColor: '#d2552a', outfit: 'dress', outfitColor: '#c69cff' },
        bear:  { name: '小熊', icon: '🐻', skin: '#a8784f', hair: 'none', hairColor: '#5a3418', outfit: 'overall', outfitColor: '#ff5f7a' },
    };
    const isFur = id => !!(Doll3D.CHAR_BODY[id] || {}).fur;

    const HAIRS = [
        { id: 'none', icon: '🚫', name: '不要' }, { id: 'short', icon: '👦', name: '短髮' }, { id: 'long', icon: '👩', name: '長髮' },
        { id: 'pigtails', icon: '👧', name: '雙馬尾' }, { id: 'ponytail', icon: '🎀', name: '馬尾' }, { id: 'bun', icon: '🍡', name: '丸子頭' },
        { id: 'braids', icon: '🥨', name: '麻花辮' }, { id: 'bowl', icon: '🧒', name: '妹妹頭' }, { id: 'curly', icon: '🌀', name: '捲捲頭' },
        { id: 'spiky', icon: '⚡', name: '刺刺頭' },
    ];
    const HAIR_COLORS = ['#2a1a12', '#5a3418', '#8a5a2b', '#d9a441', '#f3d77a', '#d2552a', '#ff8fc0', '#b07cff', '#5fb0f0', '#7ad6a0', '#f5f5f5'];
    const EYE_COLORS = ['#5a3418', '#1a1a1a', '#2f7fe0', '#3aa86b', '#8a4fd6', '#ff5fa0', '#e0a020'];
    const SHADOWS = ['#ffb6d1', '#c69cff', '#8fd0ff', '#9ff0c0', '#ffd86b', '#ffb38a', '#ff6fae', '#d8d8e8'];
    const LIPS = ['#e8202f', '#ff3f8e', '#c71585', '#ff6f5a', '#9b1b4a', '#ff9a3c', '#9a3fbf', '#d98a7a'];
    const BLUSHES = ['#ff8fb0', '#ffab8a', '#ff6f9a', '#ffa8d8', '#e88a6a'];
    const OUTFITS = [
        { id: 'dress', icon: '👗', name: '洋裝' }, { id: 'tee', icon: '👕', name: 'T恤' }, { id: 'gown', icon: '👸', name: '公主裙' },
        { id: 'tutu', icon: '🩰', name: '芭蕾裙' }, { id: 'overall', icon: '👖', name: '吊帶褲' },
    ];
    const OUTFIT_COLORS = ['#ff8fc0', '#ff5f7a', '#ffb35a', '#ffe066', '#7ad6a0', '#5fb0f0', '#8f7bff', '#c69cff', '#ffffff', '#3a3a4a'];
    const PATTERNS = [
        { id: 'none', icon: '⬜', name: '素色' }, { id: 'dots', icon: '⚪', name: '圓點' }, { id: 'stripes', icon: '🦓', name: '條紋' },
        { id: 'hearts', icon: '💗', name: '愛心' }, { id: 'stars', icon: '⭐', name: '星星' }, { id: 'plaid', icon: '🧺', name: '格子' },
    ];
    const HATS = [
        { id: null, icon: '🚫', name: '不要' }, { id: 'bow', icon: '🎀', name: '蝴蝶結' }, { id: 'crown', icon: '👑', name: '皇冠' },
        { id: 'tophat', icon: '🎩', name: '禮帽' }, { id: 'flowers', icon: '🌸', name: '花圈' }, { id: 'strawhat', icon: '👒', name: '草帽' },
        { id: 'catband', icon: '😺', name: '貓耳' }, { id: 'star', icon: '⭐', name: '星星夾' }, { id: 'unicorn', icon: '🦄', name: '獨角' },
    ];
    const GLASSES = [
        { id: null, icon: '🚫', name: '不要' }, { id: 'round', icon: '👓', name: '圓眼鏡' }, { id: 'sun', icon: '🕶️', name: '墨鏡' },
        { id: 'heart', icon: '💗', name: '愛心' }, { id: 'starg', icon: '🌟', name: '星星' },
    ];
    const PROPS = [
        { id: null, icon: '🚫', name: '不要' }, { id: 'wand', icon: '🪄', name: '魔法棒' }, { id: 'balloon', icon: '🎈', name: '氣球' },
        { id: 'lolly', icon: '🍭', name: '棒棒糖' }, { id: 'bouquet', icon: '💐', name: '花束' }, { id: 'icecream', icon: '🍦', name: '冰淇淋' },
        { id: 'teddy', icon: '🧸', name: '小熊' },
    ];
    const EXPRS = [
        { id: 'smile', icon: '🙂', name: '微笑' }, { id: 'happy', icon: '😊', name: '開心' }, { id: 'laugh', icon: '😄', name: '大笑' },
        { id: 'wink', icon: '😉', name: '眨眼' }, { id: 'kiss', icon: '😘', name: '嘟嘴' }, { id: 'wow', icon: '😮', name: '哇！' },
    ];
    const POSES = [
        { id: 'stand', icon: '🧍', name: '站好' }, { id: 'wave', icon: '👋', name: '揮手' }, { id: 'heart', icon: '🙌', name: '萬歲' },
        { id: 'hips', icon: '💁', name: '叉腰' }, { id: 'dance', icon: '💃', name: '跳舞' }, { id: 'spin', icon: '🌀', name: '轉圈圈' },
    ];
    const THEMES = {
        pink:   { name: '粉紅房間', icon: '🎀', bg: ['#fff7fb', '#ffd9ea', '#f7b9d6'], podium: ['#ffd0e3', '#ffb3d1'], decor: ['💖', '🎀', '💕'], ink: '#c2417e' },
        night:  { name: '星空', icon: '🌙', bg: ['#7a6fd0', '#3a3480', '#191545'], podium: ['#b8acff', '#8a7af0'], decor: ['⭐', '🌟', '🌙'], ink: '#fff3a0' },
        beach:  { name: '海邊', icon: '🏖️', bg: ['#f2fdff', '#a8e6f8', '#5fc3e8'], podium: ['#f8e2a8', '#ecd08a'], decor: ['🫧', '🐚', '🐠'], ink: '#1f7fa8' },
        garden: { name: '花園', icon: '🌷', bg: ['#f6ffec', '#cdf2b4', '#8fd08a'], podium: ['#b4e48a', '#94cf6a'], decor: ['🌼', '🦋', '🌷'], ink: '#3a8a3a' },
        stage:  { name: '大舞台', icon: '🎤', bg: ['#fff0b0', '#ff9a8a', '#a8406e'], podium: ['#ff7a90', '#e04a68'], decor: ['🎉', '✨', '🎵'], ink: '#ffffff' },
    };
    const BRUSH_COLORS = ['#ff3f8e', '#ff5f5f', '#ff9a3c', '#ffe14d', '#7ad6a0', '#5fb0f0', '#8f7bff', '#ffffff', '#1a1a1a', 'rainbow'];
    const BRUSH_SIZES = [{ r: 5, name: '細' }, { r: 10, name: '中' }, { r: 18, name: '粗' }];
    const STICKERS = ['❤️', '⭐', '🌸', '🦋', '🌈', '✨', '🍓', '🐾', '💎', '🌙'];
    const BONUS_STICKERS = [
        { e: '🦄', need: 3 }, { e: '👑', need: 6 }, { e: '🍰', need: 10 }, { e: '🐱', need: 15 },
        { e: '🌟', need: 20 }, { e: '🎀', need: 25 }, { e: '💖', need: 30 }, { e: '🍀', need: 40 },
    ];
    const CUSTOMERS = [
        { icon: '🐻', name: '熊熊' }, { icon: '🐼', name: '貓熊' }, { icon: '🦊', name: '狐狸' }, { icon: '🐷', name: '小豬' },
        { icon: '🐸', name: '青蛙' }, { icon: '🦄', name: '獨角獸' }, { icon: '🐧', name: '企鵝' }, { icon: '🐨', name: '無尾熊' },
        { icon: '👸', name: '公主' }, { icon: '🧚', name: '小仙女' }, { icon: '👵', name: '奶奶' }, { icon: '🤖', name: '機器人' },
    ];

    const swatch = c => '<span class="swatch" style="background-color:' + c + '"></span>';
    const NONE_HTML = '<span class="none-x">' + icon('close') + '</span>';

    // 選單分頁 (zoom：切到這頁時鏡頭拉近多少，0 = 全身，1 = 臉)
    const TABS = [
        { id: 'char', icon: 'char', name: '角色', zoom: 0, sections: [
            { title: '選一個角色', key: 'char', list: Object.keys(CHARS).map(id => ({ id, icon: CHARS[id].icon, name: CHARS[id].name })) },
            { title: '膚色', key: 'skin', colors: () => (isFur(look.char) ? SKINS_FUR : SKINS_HUMAN) },
        ] },
        { id: 'hair', icon: 'hair', name: '頭髮', zoom: 0.55, sections: [
            { title: '髮型', key: 'hair', list: HAIRS },
            { title: '髮色', key: 'hairColor', colors: HAIR_COLORS },
        ] },
        { id: 'face', icon: 'face', name: '化妝', zoom: 1, sections: [
            { title: '眼影', key: 'shadow', colors: SHADOWS, none: true },
            { title: '口紅', key: 'lip', colors: LIPS, none: true },
            { title: '腮紅', key: 'blush', colors: BLUSHES, none: true },
            { title: '眼睛顏色', key: 'eyeColor', colors: EYE_COLORS },
            { title: '更可愛', toggles: [{ key: 'lashes', icon: '👁️', name: '長睫毛' }, { key: 'sparkle', icon: '✨', name: '亮晶晶' }] },
        ] },
        { id: 'paint', icon: 'paint', name: '畫畫', zoom: 1, hint: '用手指在臉上畫畫、貼貼紙', sections: [
            { title: '畫筆顏色', colorsDyn: true, dyn: () => BRUSH_COLORS.map(c => ({
                html: c === 'rainbow' ? '<span class="swatch" style="background:conic-gradient(#ff5f7a,#ffb35a,#ffe066,#7ad6a0,#5fb0f0,#8f7bff,#ff5f7a)"></span>' : swatch(c),
                on: tool.type === 'brush' && tool.color === c, act: () => setTool({ type: 'brush', color: c }) })) },
            { title: '粗細', dyn: () => BRUSH_SIZES.map(s => ({
                html: '<span class="dot" style="width:' + (s.r * 1.4 + 6) + 'px;height:' + (s.r * 1.4 + 6) + 'px"></span><small>' + s.name + '</small>',
                on: tool.size === s.r, act: () => setTool({ size: s.r }) })) },
            { title: '貼紙・點一下臉', dyn: () => STICKERS.map(e => ({
                html: e, on: tool.type === 'sticker' && tool.emoji === e, act: () => setTool({ type: 'sticker', emoji: e }) })) },
            { title: '星星換貼紙・幫客人化妝拿星星', dyn: () => BONUS_STICKERS.map(b => stars >= b.need
                ? { html: b.e, on: tool.type === 'sticker' && tool.emoji === b.e, act: () => setTool({ type: 'sticker', emoji: b.e }) }
                : { html: '<span class="locked">' + b.e + '</span><small class="lock-tag">★ ' + b.need + '</small>', on: false,
                    act: () => { toast('再拿 ' + (b.need - stars) + ' 顆 ★ 就能用囉'); sfx.tab(); } }) },
            { title: '擦擦', dyn: () => [
                { html: '🩹<small>橡皮擦</small>', on: tool.type === 'eraser', act: () => setTool({ type: 'eraser' }) },
                { html: '🗑️<small>全部擦掉</small>', on: false, act: () => { clearPaint(); tone(900, 300, 0.25, 0, 'sine', 0.15); } },
            ] },
        ] },
        { id: 'cloth', icon: 'cloth', name: '衣服', zoom: 0, sections: [
            { title: '款式', key: 'outfit', list: OUTFITS },
            { title: '顏色', key: 'outfitColor', colors: OUTFIT_COLORS },
            { title: '花紋', key: 'pattern', list: PATTERNS },
        ] },
        { id: 'acc', icon: 'acc', name: '配件', zoom: 0.25, sections: [
            { title: '頭飾', key: 'hat', list: HATS },
            { title: '眼鏡', key: 'glasses', list: GLASSES },
            { title: '手上拿', key: 'prop', list: PROPS },
        ] },
        { id: 'fun', icon: 'fun', name: '表情', zoom: 0.15, sections: [
            { title: '表情', key: 'expr', list: EXPRS },
            { title: '動作', key: 'pose', list: POSES },
            { title: '背景', key: 'theme', list: Object.keys(THEMES).map(id => ({ id, icon: THEMES[id].icon, name: THEMES[id].name })) },
        ] },
    ];
    // 換了要重建模型的項目 (其他只重畫臉或改顏色)
    const STRUCTURAL = { char: 1, hair: 1, outfit: 1, hat: 1, glasses: 1, prop: 1 };

    function defaultLook(charId) {
        const c = CHARS[charId];
        return {
            char: charId, skin: c.skin, hair: c.hair, hairColor: c.hairColor, eyeColor: '#5a3418',
            lashes: !isFur(charId) || charId === 'kitty', shadow: null, lip: null, blush: '#ff8fb0', sparkle: false,
            outfit: c.outfit, outfitColor: c.outfitColor, pattern: 'none', hat: null, glasses: null, prop: null,
            expr: 'smile', pose: 'stand', theme: 'pink',
        };
    }

    // ---------- 存檔 (跟寵物樂園同一個玩家) ----------
    const SAVE_KEY = 'makeup3dLook:' + (window.PetProfiles ? PetProfiles.saveKey().split(':').pop() : 'none');
    const ls = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    };
    let look = defaultLook('girl');
    try {
        const saved = JSON.parse(ls.get(SAVE_KEY) || 'null');
        if (saved && CHARS[saved.char]) look = Object.assign(defaultLook(saved.char), saved);
    } catch (e) { /* 壞掉的存檔就用預設 */ }
    let saveTimer = 0;
    function saveNow() { clearTimeout(saveTimer); ls.set(SAVE_KEY, JSON.stringify(look)); }
    function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
    let stars = parseInt(ls.get(SAVE_KEY + ':stars'), 10) || 0;

    // =========================================================
    //  場景
    // =========================================================
    const canvas = $('scene');
    const panelEl = $('panel');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // 柔和的攝影棚環境光 (讓亮面材質有好看的反光)
    (function makeEnvironment() {
        const env = new THREE.Scene();
        const geo = new THREE.SphereGeometry(10, 32, 16);
        const cols = [];
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
            const t = (p.getY(i) / 10 + 1) / 2;
            const c = new THREE.Color('#c8a0b4').lerp(new THREE.Color('#fff4f8'), t);
            cols.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
        const box = (x, y, z, w, h, k) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
            m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
        };
        box(4, 6, 5, 5, 4, 2.0); box(-6, 2, 3, 4, 5, 1.0); box(0, 3, -7, 7, 3, 1.2); box(0, 9, 0, 6, 6, 0.9);
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(env, 0.04).texture;
        pm.dispose();
    })();

    scene.add(new THREE.HemisphereLight(0xffffff, 0xffc8dc, 0.35));
    const key = new THREE.DirectionalLight(0xfff6f0, 0.95);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3.5, bottom: -1, near: 1, far: 20 });
    key.shadow.bias = -0.0008;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe8f4, 0.55);
    rim.position.set(-2, 4, -5);
    scene.add(rim);

    // 舞台：圓圓的台子
    const podiumMat = new THREE.MeshPhysicalMaterial({ color: '#ffd0e3', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    const podiumMat2 = new THREE.MeshStandardMaterial({ color: '#ffb3d1', roughness: 0.5 });
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.6, 0.22, 64), podiumMat);
    podium.position.y = -0.11; podium.receiveShadow = true;
    scene.add(podium);
    const podium2 = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.85, 0.14, 64), podiumMat2);
    podium2.position.y = -0.27; podium2.receiveShadow = true;
    scene.add(podium2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.035, 10, 80), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.0;
    scene.add(ring);

    // ---------- 背景主題 ----------
    const emojiTexCache = {};
    function emojiTex(e) {
        if (emojiTexCache[e]) return emojiTexCache[e];
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const g = cv.getContext('2d');
        g.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(e, 64, 70);
        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        return (emojiTexCache[e] = t);
    }
    const decor = new THREE.Group();
    scene.add(decor);
    function applyTheme() {
        const th = THEMES[look.theme] || THEMES.pink;
        document.body.style.background = 'radial-gradient(circle at calc((100vw - var(--sx)) / 2) 38%, ' + th.bg[0] + ' 0%, ' + th.bg[1] + ' 55%, ' + th.bg[2] + ' 100%)';
        podiumMat.color.set(th.podium[0]);
        podiumMat2.color.set(th.podium[1]);
        while (decor.children.length) decor.remove(decor.children[0]);
        for (let i = 0; i < 12; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(th.decor[i % th.decor.length]), transparent: true, depthWrite: false, opacity: 0.85 }));
            const side = i % 2 ? 1 : -1;
            s.userData = { x: side * (2.2 + Math.random() * 2.2), y: 0.3 + Math.random() * 3.6, z: -3.5 - Math.random() * 2.5, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.5 };
            const sz = 0.3 + Math.random() * 0.25;
            s.scale.set(sz, sz, sz);
            decor.add(s);
        }
    }

    // =========================================================
    //  臉上畫畫 (畫在頭的貼圖上：u = 經度，v = 緯度)
    // =========================================================
    const PAINT_W = 1024, PAINT_H = 512;
    const paintCanvas = document.createElement('canvas');
    paintCanvas.width = PAINT_W; paintCanvas.height = PAINT_H;
    const pctx = paintCanvas.getContext('2d');
    const paintTex = new THREE.CanvasTexture(paintCanvas);
    paintTex.encoding = THREE.sRGBEncoding;
    paintTex.anisotropy = 4;
    const paintMat = new THREE.MeshStandardMaterial({ map: paintTex, transparent: true, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

    // 娃娃：root (玩家轉) → doll.root (跳動) → 身體、頭
    const root = new THREE.Group();
    scene.add(root);
    let doll = null;
    function buildDoll() {
        if (doll) root.remove(doll.root);
        doll = Doll3D.build(look, { detail: 'high', paintMat });
        root.add(doll.root);
    }

    // =========================================================
    //  亮晶晶粒子
    // =========================================================
    const sparkTex = (() => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const g = cv.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.25, 'rgba(255,255,255,0.8)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4, r = i % 2 ? 7 : 32;
            g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
        }
        g.fill();
        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        return t;
    })();
    const SPARK_COLS = ['#ffffff', '#fff07a', '#ffb3d4', '#c69cff', '#8fd0ff'];
    const sparks = [];
    function burst(localPos, n, spread) {
        for (let i = 0; i < n; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: SPARK_COLS[i % SPARK_COLS.length], transparent: true, depthWrite: false }));
            s.position.copy(localPos);
            s.userData = {
                v: new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.8 + 0.3, (Math.random() - 0.2) * spread),
                life: 0, max: 0.7 + Math.random() * 0.5, size: 0.12 + Math.random() * 0.14,
            };
            root.add(s);
            sparks.push(s);
        }
    }
    const BURST_AT = {
        char: [0, 1.6, 0.6], skin: [0, 2.0, 0.8], hair: [0, 2.7, 0.3], hairColor: [0, 2.7, 0.3],
        shadow: [0, 2.15, 0.8], lip: [0, 1.75, 0.8], blush: [0, 1.85, 0.8], eyeColor: [0, 2.05, 0.8],
        lashes: [0, 2.1, 0.8], sparkle: [0, 2.05, 0.8],
        outfit: [0, 0.9, 0.5], outfitColor: [0, 0.9, 0.5], pattern: [0, 0.9, 0.5], hat: [0, 2.85, 0.2], glasses: [0, 2.05, 0.9], prop: [0.5, 1.3, 0.6],
        expr: [0, 1.8, 0.85], pose: [0, 1.2, 0.6], theme: [0, 1.6, 0.6],
    };

    // =========================================================
    //  音效 (簡單合成，不用載入檔案)
    // =========================================================
    let actx = null;
    let soundOn = ls.get('makeup3dSound') !== 'off';
    function audio() {
        if (!actx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            actx = new AC();
        }
        if (actx.state === 'suspended') actx.resume();
        return actx;
    }
    function tone(freq, freq2, dur, delay, type, vol) {
        const a = soundOn && audio();
        if (!a) return;
        const t = a.currentTime + (delay || 0);
        const o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq2, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(a.destination);
        o.start(t); o.stop(t + dur + 0.02);
    }
    const sfx = {
        pop() { tone(520, 980, 0.14, 0, 'sine'); },
        magic() { [880, 1175, 1568].forEach((f, i) => tone(f, f * 1.02, 0.18, i * 0.07, 'triangle', 0.12)); },
        giggle() { [700, 820, 760].forEach((f, i) => tone(f, f * 1.3, 0.09, i * 0.09, 'sine', 0.12)); },
        tab() { tone(400, 600, 0.08, 0, 'triangle', 0.1); },
        shutter() { tone(1800, 300, 0.12, 0, 'square', 0.08); tone(1200, 200, 0.1, 0.1, 'square', 0.06); },
        brush() { tone(300 + Math.random() * 200, 700, 0.1, 0, 'sine', 0.06); },
        stamp() { tone(660, 1320, 0.12, 0, 'triangle', 0.14); tone(990, 1500, 0.1, 0.06, 'sine', 0.08); },
    };

    // ---------- 畫筆 ----------
    const PAINT_KEY = SAVE_KEY + ':paint';
    const tool = { type: 'brush', color: '#ff3f8e', size: 10, emoji: '❤️' };
    let rainbowHue = 0;
    function setTool(t) { Object.assign(tool, t); sfx.tab(); renderItems(); }
    // 貼圖越靠近頭頂/下巴，橫向被壓得越扁，所以畫的時候要橫向拉寬
    function stretchAt(v) { return 1 / Math.max(0.2, Math.sin((1 - v) * Math.PI)); }
    function wrapDraw(x, rx, fn) {
        fn(x);
        if (x - rx < 0) fn(x + PAINT_W);
        if (x + rx > PAINT_W) fn(x - PAINT_W);
    }
    function dab(u, v) {
        const x = u * PAINT_W, y = (1 - v) * PAINT_H;
        const er = tool.type === 'eraser' ? 1.4 : 1;
        const r = tool.size * er, rx = r * stretchAt(v);
        pctx.globalCompositeOperation = tool.type === 'eraser' ? 'destination-out' : 'source-over';
        if (tool.color === 'rainbow') { rainbowHue = (rainbowHue + 4) % 360; pctx.fillStyle = 'hsl(' + rainbowHue + ',90%,65%)'; }
        else pctx.fillStyle = tool.color;
        wrapDraw(x, rx, xx => { pctx.beginPath(); pctx.ellipse(xx, y, rx, r, 0, 0, Math.PI * 2); pctx.fill(); });
        pctx.globalCompositeOperation = 'source-over';
    }
    function strokeTo(a, b) {
        if (Math.abs(a.x - b.x) > 0.5) { dab(b.x, b.y); return; } // 跨過接縫就不連線
        const dist = Math.hypot((b.x - a.x) * PAINT_W / stretchAt(b.y), (b.y - a.y) * PAINT_H);
        const n = Math.max(1, Math.ceil(dist / (tool.size * 0.35)));
        for (let i = 1; i <= n; i++) dab(a.x + (b.x - a.x) * (i / n), a.y + (b.y - a.y) * (i / n));
        paintTex.needsUpdate = true;
    }
    function stamp(u, v) {
        const x = u * PAINT_W, y = (1 - v) * PAINT_H, s = 34, st = stretchAt(v);
        pctx.font = s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
        wrapDraw(x, s * st, xx => { pctx.save(); pctx.translate(xx, y); pctx.scale(st, 1); pctx.fillText(tool.emoji, 0, 2); pctx.restore(); });
        paintTex.needsUpdate = true;
    }
    let paintSaveTimer = 0;
    function paintEmpty() {
        const d = pctx.getImageData(0, 0, PAINT_W, PAINT_H).data;
        for (let i = 3; i < d.length; i += 64) if (d[i]) return false;
        return true;
    }
    function savePaint() {
        clearTimeout(paintSaveTimer);
        paintSaveTimer = setTimeout(() => ls.set(PAINT_KEY, paintEmpty() ? '' : paintCanvas.toDataURL('image/png')), 400);
    }
    function clearPaint() { pctx.clearRect(0, 0, PAINT_W, PAINT_H); paintTex.needsUpdate = true; savePaint(); }
    (function loadPaint() {
        const url = ls.get(PAINT_KEY);
        if (!url) return;
        const img = new Image();
        img.onload = () => { pctx.drawImage(img, 0, 0); paintTex.needsUpdate = true; };
        img.src = url;
    })();
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function faceHit(clientX, clientY) {
        if (!doll || !doll.paint) return null;
        ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObject(doll.paint, false)[0];
        if (!hit || !hit.uv) return null;
        // 被頭髮、帽子擋住就不畫
        const first = raycaster.intersectObject(doll.root, true).find(h => h.object.isMesh && !h.object.material.transparent);
        if (first && first.distance < hit.distance - 0.1) return null;
        return { x: hit.uv.x, y: hit.uv.y };
    }

    // =========================================================
    //  套用選擇
    // =========================================================
    let hopT = -1;
    function apply(k, value) {
        if (k === 'char') {
            if (value === look.char) return;
            const c = CHARS[value];
            Object.assign(look, { char: value, skin: c.skin, hair: c.hair, hairColor: c.hairColor });
        } else {
            look[k] = value;
        }
        if (STRUCTURAL[k]) buildDoll(); else doll.update(look);
        if (k === 'theme') applyTheme();
        const isMakeup = k === 'shadow' || k === 'lip' || k === 'blush' || k === 'sparkle' || k === 'lashes' || k === 'eyeColor';
        (isMakeup ? sfx.magic : sfx.pop)();
        burst(new THREE.Vector3().fromArray(BURST_AT[k] || [0, 2, 0.6]), isMakeup ? 10 : 14, isMakeup ? 0.9 : 1.6);
        hopT = 0;
        save();
        renderItems();
        checkTask();
    }
    function randomLook() {
        const pick = a => a[Math.floor(Math.random() * a.length)];
        const fur = isFur(look.char);
        const maybe = (list, p) => (Math.random() < p ? pick(list.filter(x => x.id)).id : null);
        Object.assign(look, {
            skin: pick(fur ? SKINS_FUR : SKINS_HUMAN),
            hair: fur && Math.random() < 0.5 ? 'none' : pick(HAIRS.filter(h => h.id !== 'none')).id,
            hairColor: pick(HAIR_COLORS), eyeColor: pick(EYE_COLORS),
            shadow: Math.random() < 0.8 ? pick(SHADOWS) : null,
            lip: Math.random() < 0.8 ? pick(LIPS) : null,
            blush: Math.random() < 0.85 ? pick(BLUSHES) : null,
            lashes: Math.random() < 0.7, sparkle: Math.random() < 0.4,
            outfit: pick(OUTFITS).id, outfitColor: pick(OUTFIT_COLORS),
            pattern: Math.random() < 0.5 ? 'none' : pick(PATTERNS).id,
            hat: maybe(HATS, 0.7), glasses: maybe(GLASSES, 0.35), prop: maybe(PROPS, 0.6),
            expr: pick(EXPRS).id,
        });
        buildDoll();
        sfx.magic();
        burst(new THREE.Vector3(0, 1.8, 0.5), 26, 2.2);
        hopT = 0;
        save();
        renderItems();
        checkTask();
    }
    function clearLook() {
        Object.assign(look, { shadow: null, lip: null, blush: null, sparkle: false, hat: null, glasses: null, prop: null, expr: 'smile', pose: 'stand' });
        clearPaint();
        buildDoll();
        tone(900, 300, 0.25, 0, 'sine', 0.15);
        hopT = 0;
        save();
        renderItems();
        checkTask();
    }

    // =========================================================
    //  客人點妝：照客人想要的打扮，全部做到就拿星星
    // =========================================================
    const iconOf = (list, id) => (list.find(x => x.id === id) || {}).icon;
    const REQ_TYPES = [
        { key: 'lip', tab: 'face', vals: LIPS, html: v => '<span class="tag">💋</span>' + swatch(v) },
        { key: 'shadow', tab: 'face', vals: SHADOWS, html: v => '<span class="tag">👁️</span>' + swatch(v) },
        { key: 'blush', tab: 'face', vals: BLUSHES, html: v => '<span class="tag">😊</span>' + swatch(v) },
        { key: 'hair', tab: 'hair', vals: HAIRS.filter(h => h.id !== 'none').map(h => h.id), html: v => iconOf(HAIRS, v) },
        { key: 'hairColor', tab: 'hair', vals: HAIR_COLORS, html: v => '<span class="tag">💇</span>' + swatch(v) },
        { key: 'outfit', tab: 'cloth', vals: OUTFITS.map(o => o.id), html: v => iconOf(OUTFITS, v) },
        { key: 'outfitColor', tab: 'cloth', vals: OUTFIT_COLORS, html: v => '<span class="tag">👗</span>' + swatch(v) },
        { key: 'pattern', tab: 'cloth', vals: PATTERNS.filter(p => p.id !== 'none').map(p => p.id), html: v => iconOf(PATTERNS, v) },
        { key: 'hat', tab: 'acc', vals: HATS.filter(h => h.id).map(h => h.id), html: v => iconOf(HATS, v) },
        { key: 'glasses', tab: 'acc', vals: GLASSES.filter(h => h.id).map(h => h.id), html: v => iconOf(GLASSES, v) },
        { key: 'prop', tab: 'acc', vals: PROPS.filter(h => h.id).map(h => h.id), html: v => iconOf(PROPS, v) },
        { key: 'expr', tab: 'fun', vals: EXPRS.map(e => e.id), html: v => iconOf(EXPRS, v) },
        { key: 'theme', tab: 'fun', vals: Object.keys(THEMES), html: v => THEMES[v].icon },
    ];
    let task = null;
    const taskEl = $('task');
    function newTask() {
        const pick = a => a[Math.floor(Math.random() * a.length)];
        const types = REQ_TYPES.slice().sort(() => Math.random() - 0.5);
        const reqs = [], perTab = {};
        for (const ty of types) {
            if (reqs.length >= (stars < 6 ? 2 : stars < 20 ? 3 : 4)) break;
            if ((perTab[ty.tab] || 0) >= 2) continue; // 同一頁最多兩個，比較好找
            reqs.push({ type: ty, value: pick(ty.vals.filter(v => v !== look[ty.key])) });
            perTab[ty.tab] = (perTab[ty.tab] || 0) + 1;
        }
        let cust;
        do { cust = pick(CUSTOMERS); } while (task && task.cust === cust);
        task = { cust, reqs, done: false };
        renderTask();
        taskEl.classList.remove('hidden');
        taskEl.style.animation = 'none'; void taskEl.offsetWidth; taskEl.style.animation = '';
        tone(523, 784, 0.15, 0, 'triangle', 0.12); tone(784, 1046, 0.15, 0.12, 'triangle', 0.12);
    }
    function renderTask() {
        if (!task) return;
        $('task-cust').textContent = task.cust.icon;
        $('task-title').textContent = task.done ? '太棒了！謝謝你 💖' : task.cust.name + '想要';
        const box = $('task-reqs');
        box.innerHTML = '';
        task.reqs.forEach(r => {
            const b = document.createElement('button');
            b.className = 'req' + (look[r.type.key] === r.value ? ' ok' : '');
            b.innerHTML = r.type.html(r.value);
            b.addEventListener('click', () => { const t = TABS.find(x => x.id === r.type.tab); if (t) selectTab(t); });
            box.appendChild(b);
        });
        const next = $('task-next');
        next.textContent = task.done ? '下一位客人 ›' : '換一位客人';
        next.classList.toggle('ghost', !task.done);
    }
    function checkTask() {
        if (!task || task.done) return;
        renderTask();
        if (!task.reqs.every(r => look[r.type.key] === r.value)) return;
        task.done = true;
        const got = task.reqs.length, before = stars;
        stars += got;
        ls.set(SAVE_KEY + ':stars', String(stars));
        showStars();
        renderTask();
        setTimeout(() => {
            [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.22, i * 0.12, 'triangle', 0.14));
            burst(new THREE.Vector3(0, 1.8, 0.6), 40, 3);
            hopT = 0;
            const unlocked = BONUS_STICKERS.filter(b => b.need > before && b.need <= stars).map(b => b.e).join('');
            toast('+' + got + ' ★ 完成！' + (unlocked ? '<br><small>解鎖新貼紙 ' + unlocked + '</small>' : ''));
            if (curTab.id === 'paint') renderItems();
        }, 350);
    }
    function showStars() { $('star-badge').textContent = stars; }
    showStars();
    let toastTimer = 0;
    function toast(html) {
        const el = $('toast');
        el.innerHTML = html;
        el.classList.remove('hidden');
        el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
    }

    // =========================================================
    //  選單
    // =========================================================
    const tabsEl = $('tabs');
    const itemsEl = $('items');
    let curTab = TABS[0];
    let zoomTarget = 0, zoomCur = 0;
    const hint = $('hint');
    const hideHint = () => hint.classList.add('gone');
    let hintTimer = setTimeout(hideHint, 7000);

    function selectTab(t) {
        curTab = t;
        zoomTarget = t.zoom;
        sfx.tab();
        if (t.hint) { hint.textContent = t.hint; hint.classList.remove('gone'); clearTimeout(hintTimer); hintTimer = setTimeout(hideHint, 4000); }
        renderTabs();
        renderItems();
        itemsEl.scrollTop = 0;
    }
    TABS.forEach(t => {
        const b = document.createElement('button');
        b.className = 'tab';
        b.innerHTML = icon(t.icon) + '<span>' + t.name + '</span>';
        b.addEventListener('click', () => selectTab(t));
        t.el = b;
        tabsEl.appendChild(b);
    });
    function renderTabs() {
        TABS.forEach(t => t.el.classList.toggle('on', t === curTab));
        $('panel-title').textContent = curTab.name;
    }
    function itemBtn(on, inner, onClick, cls) {
        const b = document.createElement('button');
        b.className = 'item' + (cls ? ' ' + cls : '') + (on ? ' on' : '');
        b.innerHTML = inner;
        b.addEventListener('click', onClick);
        return b;
    }
    function renderItems() {
        itemsEl.innerHTML = '';
        curTab.sections.forEach(sec => {
            const h = document.createElement('div');
            h.className = 'sec-title';
            h.textContent = sec.title;
            itemsEl.appendChild(h);
            const grid = document.createElement('div');
            grid.className = 'grid' + (sec.colors || sec.colorsDyn ? ' colors' : '');
            if (sec.list) {
                sec.list.forEach(it => grid.appendChild(itemBtn(look[sec.key] === it.id,
                    it.icon + '<small>' + it.name + '</small>', () => apply(sec.key, it.id))));
            } else if (sec.colors) {
                if (sec.none) grid.appendChild(itemBtn(!look[sec.key], NONE_HTML, () => apply(sec.key, null), 'color'));
                const cols = typeof sec.colors === 'function' ? sec.colors() : sec.colors;
                cols.forEach(col => grid.appendChild(itemBtn(look[sec.key] === col, swatch(col), () => apply(sec.key, col), 'color')));
            } else if (sec.dyn) {
                sec.dyn().forEach(it => grid.appendChild(itemBtn(it.on, it.html, it.act, sec.colorsDyn ? 'color' : '')));
            } else if (sec.toggles) {
                sec.toggles.forEach(tg => grid.appendChild(itemBtn(!!look[tg.key],
                    tg.icon + '<small>' + tg.name + '</small>', () => apply(tg.key, !look[tg.key]))));
            }
            itemsEl.appendChild(grid);
        });
    }

    // ---------- 工具按鈕 ----------
    $('btn-task').addEventListener('click', () => {
        if (task && !taskEl.classList.contains('hidden')) { taskEl.classList.add('hidden'); sfx.tab(); }
        else if (task && !task.done) { taskEl.classList.remove('hidden'); sfx.tab(); }
        else newTask();
    });
    $('task-next').addEventListener('click', newTask);
    $('task-close').addEventListener('click', () => { taskEl.classList.add('hidden'); sfx.tab(); });
    $('btn-park').addEventListener('click', () => {
        saveNow();
        // 記下是哪個玩家的造型，樂園那邊會直接用這個玩家進去並換上
        ls.set('makeup3dToPark', JSON.stringify({ pid: window.PetProfiles && PetProfiles.current() ? PetProfiles.current().id : null, t: Date.now() }));
        sfx.magic();
        toast('帶著新造型去寵物樂園囉 🐾');
        setTimeout(() => { location.href = 'pet.html'; }, 900);
    });
    $('btn-view').addEventListener('click', () => { zoomTarget = zoomTarget > 0.5 ? 0 : 1; sfx.tab(); });
    $('btn-random').addEventListener('click', randomLook);
    $('btn-clear').addEventListener('click', clearLook);
    const soundBtn = $('btn-sound');
    const showSound = () => { soundBtn.innerHTML = icon(soundOn ? 'sound' : 'mute'); soundBtn.classList.toggle('off', !soundOn); };
    showSound();
    soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        ls.set('makeup3dSound', soundOn ? 'on' : 'off');
        showSound();
        sfx.pop();
    });

    // ---------- 拍照 (只拍舞台空白處，不含選單) ----------
    $('btn-photo').addEventListener('click', () => {
        sfx.shutter();
        render();
        const dpr = renderer.getPixelRatio();
        const fa = freeArea();
        const w = Math.round(fa.w * dpr), h = Math.round(fa.h * dpr);
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const g = out.getContext('2d');
        const th = THEMES[look.theme] || THEMES.pink;
        const grd = g.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, Math.max(w, h) * 0.7);
        grd.addColorStop(0, th.bg[0]); grd.addColorStop(0.55, th.bg[1]); grd.addColorStop(1, th.bg[2]);
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
        g.drawImage(canvas, 0, 0, w, h, 0, 0, w, h);
        const fs = Math.round(Math.min(w, h) * 0.055);
        g.font = '800 ' + fs + 'px ui-rounded, "PingFang TC", sans-serif';
        g.textAlign = 'center';
        g.fillStyle = th.ink;
        g.fillText('✨ 我的可愛造型 ✨', w / 2, h - fs * 1.2);
        const url = out.toDataURL('image/png');
        $('photo-img').src = url;
        $('photo-save').href = url;
        $('photo').classList.remove('hidden');
        flash = 1;
    });
    $('photo-close').addEventListener('click', () => $('photo').classList.add('hidden'));

    // =========================================================
    //  觸控：拖曳轉圈、兩指縮放、點一下娃娃會笑、畫畫
    // =========================================================
    const pointers = new Map();
    let rotY = 0, rotVel = 0, lastMove = 0, pinchDist = 0, dragMoved = 0;
    let painting = null; // 正在畫的筆畫：上一個點的 uv

    canvas.addEventListener('pointerdown', e => {
        audio();
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        dragMoved = 0;
        painting = null;
        if (pointers.size === 1 && curTab.id === 'paint') {
            const uv = faceHit(e.clientX, e.clientY);
            if (uv) {
                dragMoved = 99;
                hideHint();
                if (tool.type === 'sticker') { stamp(uv.x, uv.y); sfx.stamp(); savePaint(); burst(new THREE.Vector3(0, 2.05, 0.8), 6, 0.8); }
                else { painting = uv; dab(uv.x, uv.y); paintTex.needsUpdate = true; sfx.brush(); }
            }
        }
        if (pointers.size === 2) {
            painting = null;
            const [a, b] = [...pointers.values()];
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        }
    });
    canvas.addEventListener('pointermove', e => {
        const p = pointers.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x;
        p.x = e.clientX; p.y = e.clientY;
        if (painting && pointers.size === 1) {
            const uv = faceHit(e.clientX, e.clientY);
            if (uv) { strokeTo(painting, uv); painting = uv; if (Math.random() < 0.08) sfx.brush(); }
            return;
        }
        if (pointers.size === 1) {
            rotY += dx * 0.012;
            rotVel = dx * 0.012;
            dragMoved += Math.abs(dx);
            lastMove = performance.now();
            if (dragMoved > 20) hideHint();
        } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            zoomTarget = Math.min(1, Math.max(0, zoomTarget + (dist - pinchDist) * 0.004));
            pinchDist = dist;
            dragMoved = 99;
            hideHint();
        }
    });
    const up = e => {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        if (painting) { painting = null; savePaint(); }
        if (!pointers.size && dragMoved < 8) { sfx.giggle(); hopT = 0; burst(new THREE.Vector3(0, 2.3, 0.6), 6, 1.2); }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        zoomTarget = Math.min(1, Math.max(0, zoomTarget - e.deltaY * 0.0015));
    }, { passive: false });

    // =========================================================
    //  畫面大小與鏡頭 (娃娃置中在選單以外的空白處)
    // =========================================================
    function freeArea() {
        const W = window.innerWidth, H = window.innerHeight;
        const r = panelEl.getBoundingClientRect();
        if (r.top > H * 0.3) return { w: W, h: Math.max(100, r.top - 6), W, H }; // 直放：選單在下面
        return { w: Math.max(100, r.left - 6), h: H, W, H };                    // 橫放：選單在右邊
    }
    function resize() {
        const W = window.innerWidth, H = window.innerHeight;
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        const fa = freeArea();
        camera.setViewOffset(W, H, (W - fa.w) / 2, (H - fa.h) / 2, W, H);
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(panelEl);
    resize();

    const lerp = (a, b, t) => a + (b - a) * t;
    function placeCamera() {
        const z = zoomCur;
        const fa = freeArea();
        // 鏡頭要讓娃娃塞進空白處：空白處越窄、越矮就退越遠
        const fill = fa.H / fa.h;
        const narrow = Math.max(1, 0.95 / (fa.w / fa.h));
        const dist = lerp(7.8 * narrow, 4.7 * Math.min(narrow, 1.3), z) * fill;
        const ty = lerp(1.45, 2.2, z);
        camera.position.set(0, ty + lerp(0.75, 0.12, z), dist);
        camera.lookAt(0, ty, 0);
    }

    // =========================================================
    //  動畫
    // =========================================================
    let flash = 0;
    let blinkAt = 2, blinkT = -1;
    const clock = new THREE.Clock();
    function render() { renderer.render(scene, camera); }

    function tick() {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        // 轉圈慣性；放開一陣子後慢慢轉回正面
        if (!pointers.size) {
            rotY += rotVel;
            rotVel *= 0.92;
            if (performance.now() - lastMove > 3500) {
                rotY = Math.atan2(Math.sin(rotY), Math.cos(rotY));
                rotY *= 1 - Math.min(1, dt * 1.5);
            }
        }
        root.rotation.y = rotY;
        zoomCur += (zoomTarget - zoomCur) * Math.min(1, dt * 5);
        placeCamera();

        if (doll) {
            // 跳一下
            let y = 0, sq = 1;
            if (hopT >= 0) {
                hopT += dt / 0.45;
                if (hopT >= 1) hopT = -1;
                else { y = Math.sin(hopT * Math.PI) * 0.28; sq = 1 + Math.sin(hopT * Math.PI * 2) * 0.05; }
            }
            // 動作：算出手臂要到的角度 [x, z]，再平滑轉過去
            const sway = Math.sin(t * 1.6) * 0.06;
            let L = [0, -0.2 - sway], R = look.prop ? [-0.95, 0.18] : [0, 0.2 + sway];
            let bodyZ = 0, headTilt = 0;
            const pose = painting ? 'stand' : look.pose; // 畫畫時乖乖站好
            if (pose === 'wave') R = [-0.35, 2.0 + Math.sin(t * 9) * 0.35];
            else if (pose === 'heart') { L = [-0.2, -2.1]; R = [-0.2, 2.1]; y += Math.abs(Math.sin(t * 3)) * 0.05; }
            else if (pose === 'hips') { L = [0.35, -0.75]; R = [0.35, 0.75]; headTilt = Math.sin(t * 1.2) * 0.12; }
            else if (pose === 'dance') {
                const b = Math.sin(t * 4);
                L = [0, -0.5 - (b + 1) * 0.9]; R = [0, 0.5 + (1 - b) * 0.9];
                bodyZ = b * 0.1; y += Math.abs(Math.cos(t * 4)) * 0.08;
            } else if (pose === 'spin') { L = [0, -1.3]; R = [0, 1.3]; }
            const k = Math.min(1, dt * 8);
            doll.armL.rotation.x += (L[0] - doll.armL.rotation.x) * k;
            doll.armL.rotation.z += (L[1] - doll.armL.rotation.z) * k;
            doll.armR.rotation.x += (R[0] - doll.armR.rotation.x) * k;
            doll.armR.rotation.z += (R[1] - doll.armR.rotation.z) * k;
            doll.hand.quaternion.copy(doll.armR.quaternion).invert(); // 手上的東西永遠朝上
            doll.body.rotation.z += (bodyZ - doll.body.rotation.z) * k;
            doll.body.position.y = doll.bodyY + Math.sin(t * 2.2) * 0.012;
            doll.root.rotation.y = pose === 'spin' ? t * 4 : doll.root.rotation.y * (1 - k);
            doll.root.position.y = y;
            doll.root.scale.set(2 - sq, sq, 2 - sq);
            doll.head.rotation.z = Math.sin(t * 0.9) * 0.06 + headTilt;
            doll.head.rotation.x = Math.sin(t * 0.6) * 0.03;

            // 眨眼 (重畫臉)
            if (blinkT < 0 && t > blinkAt) { blinkT = 0; doll.redrawFace(true); }
            if (blinkT >= 0) {
                blinkT += dt;
                if (blinkT > 0.13) { blinkT = -1; blinkAt = t + 2 + Math.random() * 3; doll.redrawFace(false); }
            }
            // 亮晶晶模式：臉旁邊偶爾閃一下
            if (look.sparkle && Math.random() < dt * 2.5) {
                burst(new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.8 + Math.random() * 0.6, 0.75), 1, 0.2);
            }
        }

        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i], u = s.userData;
            u.life += dt;
            const kk = u.life / u.max;
            if (kk >= 1) { root.remove(s); s.material.dispose(); sparks.splice(i, 1); continue; }
            s.position.addScaledVector(u.v, dt);
            u.v.y -= dt * 0.8;
            const sz = u.size * Math.sin(kk * Math.PI) * (1 + Math.sin(u.life * 20) * 0.2);
            s.scale.set(sz, sz, sz);
            s.material.opacity = 1 - kk * kk;
        }
        decor.children.forEach(s => {
            const u = s.userData;
            s.position.set(u.x + Math.sin(t * u.sp + u.ph) * 0.15, u.y + Math.sin(t * u.sp * 1.3 + u.ph) * 0.2, u.z);
            s.material.rotation = Math.sin(t * u.sp + u.ph) * 0.2;
        });

        render();
        if (flash > 0) {
            flash -= dt * 3;
            canvas.style.filter = flash > 0 ? 'brightness(' + (1 + flash) + ')' : '';
        }
        requestAnimationFrame(tick);
    }

    // =========================================================
    //  開始
    // =========================================================
    buildDoll();
    applyTheme();
    renderTabs();
    renderItems();
    requestAnimationFrame(() => {
        tick();
        $('loading').classList.add('out');
        setTimeout(() => $('loading').classList.add('hidden'), 600);
    });
})();
