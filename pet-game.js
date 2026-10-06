// =============================================================
//  寵物領養樂園 3D － 遊戲主程式
//  (舊版 2D 程式備份於 backup/pet-v1/)
// =============================================================
(function () {
    'use strict';
    const loadingEl = document.getElementById('loading');
    if (typeof THREE === 'undefined' || !window.PetModels || !window.PetWorld) {
        loadingEl.textContent = '⚠️ 無法載入 3D 引擎，請確認網路連線後重新整理頁面。';
        return;
    }

    const { buildPet, buildKid, buildEagle, animateRig, SPECS } = PetModels;
    const { buildWorld, updateWorld, makeTextSprite, roundRect, BOUNDS, LAYOUT } = PetWorld;

    // ---------------------------------------------------------
    //  資料
    // ---------------------------------------------------------
    const KIDS = [
        { id: 'boy_cute', label: '可愛男孩' },
        { id: 'girl_cute', label: '可愛女孩' },
        { id: 'boy_handsome', label: '帥氣男生' },
        { id: 'girl_beautiful', label: '漂亮女生' },
        { id: 'boy_tall', label: '高挺男生' },
        { id: 'girl_tall', label: '高挺女生' },
        { id: 'kid_short', label: '小巧孩童' },
        { id: 'kid_cool', label: '酷酷孩童' },
    ];
    const KID_BY_ID = {};
    KIDS.forEach(k => KID_BY_ID[k.id] = k);

    const PET_DB = [
        { id: 'dog', emoji: '🐶', name: '小狗', eats: ['🍖', '🍞', '🍎'] },
        { id: 'cat', emoji: '🐱', name: '小貓', eats: ['🐟', '🍖'] },
        { id: 'rabbit', emoji: '🐰', name: '兔子', eats: ['🥕', '🥬', '🍎'] },
        { id: 'hamster', emoji: '🐹', name: '黃金鼠', eats: ['🌻', '🥕', '🥜'] },
        { id: 'mouse', emoji: '🐭', name: '小白鼠', eats: ['🧀', '🌻', '🍞'] },
        { id: 'fox', emoji: '🦊', name: '小狐狸', eats: ['🍖', '🐟', '🍎'] },
        { id: 'bear', emoji: '🐻', name: '小熊', eats: ['🐟', '🍖', '🍎'] },
        { id: 'panda', emoji: '🐼', name: '貓熊', eats: ['🌿', '🍎'] },
        { id: 'koala', emoji: '🐨', name: '無尾熊', eats: ['🌿'] },
        { id: 'tiger', emoji: '🐯', name: '小老虎', eats: ['🍖'] },
        { id: 'lion', emoji: '🦁', name: '小獅子', eats: ['🍖'] },
        { id: 'cow', emoji: '🐮', name: '小乳牛', eats: ['🥬', '🥕'] },
        { id: 'pig', emoji: '🐷', name: '小豬', eats: ['🍎', '🥬', '🥕', '🍞'] },
        { id: 'frog', emoji: '🐸', name: '小青蛙', eats: ['🐛'] },
        { id: 'monkey', emoji: '🐵', name: '小猴子', eats: ['🍌', '🍎', '🥜'] },
        { id: 'penguin', emoji: '🐧', name: '企鵝', eats: ['🐟'] },
        { id: 'bird', emoji: '🐦', name: '小鳥', eats: ['🐛', '🌻', '🍞'] },
        { id: 'chick', emoji: '🐤', name: '小雞', eats: ['🐛', '🌻', '🥬'] },
        { id: 'duck', emoji: '🦆', name: '小鴨', eats: ['🐛', '🍞', '🥬'] },
        { id: 'owl', emoji: '🦉', name: '貓頭鷹', eats: ['🐛', '🍖'] },
    ];
    const PET_BY_ID = {};
    PET_DB.forEach(p => PET_BY_ID[p.id] = p);

    const FOOD_TYPES = ['🍖', '🐟', '🥕', '🍎', '🥬', '🌻', '🥜', '🐛', '🍞', '🍌', '🌿', '🧀'];
    const FOOD_NAMES = {
        '🍖': '肉', '🐟': '魚', '🥕': '紅蘿蔔', '🍎': '蘋果', '🥬': '青菜', '🌻': '葵花子',
        '🥜': '花生', '🐛': '小蟲', '🍞': '麵包', '🍌': '香蕉', '🌿': '葉子', '🧀': '起司',
    };

    // 小吃店商品
    const SHOP_ITEMS = [
        { id: 'icecream', emoji: '🍦', name: '冰淇淋', price: 8, desc: '主人吃一支涼涼甜甜的冰淇淋', kind: 'kid' },
        { id: 'lollipop', emoji: '🍭', name: '棒棒糖', price: 5, desc: '彩虹漩渦棒棒糖', kind: 'kid' },
        { id: 'juice', emoji: '🧃', name: '果汁', price: 6, desc: '新鮮柳橙汁，咕嚕咕嚕', kind: 'kid' },
        { id: 'hotdog', emoji: '🌭', name: '熱狗', price: 10, desc: '香噴噴的熱狗堡', kind: 'kid' },
        { id: 'balloon', emoji: '🎈', name: '氣球', price: 12, desc: '拿著彩色氣球到處逛', kind: 'kid' },
        { id: 'popcorn', emoji: '🍿', name: '爆米花', price: 12, desc: '撒在地上，所有動物都能吃！', kind: 'share' },
        { id: 'cookie', emoji: '🍪', name: '寵物餅乾 ×3', price: 15, desc: '每種動物都超愛！放進下方食物列', kind: 'bag' },
        { id: 'ball', emoji: '🎾', name: '網球', price: 10, desc: '丟出去，動物會跑去撿回來！可以一直玩', kind: 'toy' },
        { id: 'frisbee', emoji: '🥏', name: '飛盤', price: 16, desc: '飛得又高又遠，動物會跳起來接', kind: 'toy' },
        { id: 'bow', emoji: '🎀', name: '蝴蝶結', price: 8, desc: '幫動物打扮：可愛的粉紅蝴蝶結', kind: 'acc' },
        { id: 'scarf', emoji: '🧣', name: '圍巾', price: 10, desc: '幫動物打扮：暖呼呼的紅圍巾', kind: 'acc' },
        { id: 'glasses', emoji: '🕶️', name: '太陽眼鏡', price: 12, desc: '幫動物打扮：酷酷的墨鏡', kind: 'acc' },
        { id: 'hat', emoji: '🎩', name: '紳士帽', price: 12, desc: '幫動物打扮：帥氣的小禮帽', kind: 'acc' },
        { id: 'crown', emoji: '👑', name: '小皇冠', price: 20, desc: '幫動物打扮：閃亮亮的金皇冠', kind: 'acc' },
    ];
    const UNIVERSAL_FOODS = { '🍿': 1, '🍪': 1 };

    // 每日任務 (每天隨機 3 個)
    const QUEST_POOL = [
        { id: 'feed', icon: '🍖', text: '餵動物吃東西 6 次', ev: 'feed', n: 6, reward: 15 },
        { id: 'pet', icon: '🤚', text: '摸摸動物 10 次', ev: 'pet', n: 10, reward: 12 },
        { id: 'ride', icon: '🎡', text: '讓動物玩遊樂設施 4 次', ev: 'ride', n: 4, reward: 15 },
        { id: 'kidPlay', icon: '🛝', text: '主人去玩 1 次遊樂設施', ev: 'kidPlay', n: 1, reward: 10 },
        { id: 'water', icon: '💧', text: '幫水槽加水 1 次', ev: 'water', n: 1, reward: 8 },
        { id: 'fish', icon: '🐟', text: '餵池塘的魚 2 次', ev: 'fishFeed', n: 2, reward: 10 },
        { id: 'shop', icon: '🏪', text: '在小吃店買 1 樣東西', ev: 'shop', n: 1, reward: 8 },
        { id: 'trick', icon: '💞', text: '看動物撒嬌 3 次', ev: 'trick', n: 3, reward: 15 },
        { id: 'fetch', icon: '🎾', text: '跟動物玩丟接 3 次', ev: 'fetch', n: 3, reward: 18, needToy: true },
        { id: 'sit', icon: '🪑', text: '主人坐在長椅上休息 1 次', ev: 'sit', n: 1, reward: 6 },
        { id: 'bath', icon: '🛁', text: '幫動物洗澡 2 次', ev: 'bath', n: 2, reward: 15 },
        { id: 'build', icon: '🏗️', text: '在樂園放 1 個裝飾', ev: 'build', n: 1, reward: 10 },
        { id: 'home', icon: '🏠', text: '回家看看', ev: 'homeEnter', n: 1, reward: 8 },
        { id: 'cook', icon: '🍪', text: '在家做寵物餅乾 1 次', ev: 'cook', n: 1, reward: 10 },
        { id: 'tv', icon: '📺', text: '坐在沙發看電視', ev: 'tv', n: 1, reward: 6 },
        { id: 'tramp', icon: '🤸', text: '讓動物跳彈跳床 2 次', ev: 'tramp', n: 2, reward: 12, needTramp: true },
        { id: 'dress', icon: '🎀', text: '幫動物換 1 次配件', ev: 'dress', n: 1, reward: 8, needAcc: true },
    ];
    const QUEST_ALL_BONUS = 20;

    // 成就貼紙
    const ACHIEVEMENTS = [
        { id: 'firstBaby', icon: '🍼', name: '第一隻寶寶', desc: '樂園裡第一次有寶寶誕生', check: s => s.baby >= 1 },
        { id: 'babies10', icon: '👨‍👩‍👧', name: '大家庭', desc: '一共生了 10 隻寶寶', check: s => s.baby >= 10 },
        { id: 'rare', icon: '✨', name: '稀有寶寶', desc: '生出一隻稀有顏色的寶寶', check: s => s.rare >= 1 },
        { id: 'book5', icon: '📖', name: '動物新手', desc: '圖鑑收集 5 種動物', check: () => bookCount() >= 5 },
        { id: 'book20', icon: '🏅', name: '動物博士', desc: '圖鑑收集全部 20 種動物', check: () => bookCount() >= 20 },
        { id: 'pets20', icon: '🐾', name: '熱鬧樂園', desc: '樂園裡同時有 20 隻動物', check: () => pets.length >= 20 },
        { id: 'quests10', icon: '📋', name: '任務達人', desc: '完成 10 個每日任務', check: s => s.quest >= 10 },
        { id: 'coins200', icon: '💰', name: '小富翁', desc: '同時擁有 200 枚金幣', check: () => coins >= 200 },
        { id: 'fetch10', icon: '🎾', name: '丟接高手', desc: '跟動物玩丟接 10 次', check: s => s.fetch >= 10 },
        { id: 'pet100', icon: '❤️', name: '愛心滿滿', desc: '摸摸動物 100 次', check: s => s.pet >= 100 },
        { id: 'fish10', icon: '🐠', name: '餵魚小幫手', desc: '餵池塘的魚 10 次', check: s => s.fishFeed >= 10 },
        { id: 'rainbow', icon: '🌈', name: '看見彩虹', desc: '雨過天晴，看到彩虹', check: s => s.rainbow >= 1 },
        { id: 'snow', icon: '☃️', name: '下雪囉', desc: '在樂園遇到下雪', check: s => s.snow >= 1 },
        { id: 'day7', icon: '📅', name: '一週紀念', desc: '在樂園度過 7 天', check: () => dayCount >= 7 },
        { id: 'bath10', icon: '🛁', name: '洗澡達人', desc: '幫動物洗澡 10 次', check: s => s.bath >= 10 },
        { id: 'homeSleep', icon: '🛏️', name: '溫暖的家', desc: '在家裡的床上睡一覺', check: s => s.homeSleep >= 1 },
        { id: 'cook5', icon: '👩‍🍳', name: '小廚師', desc: '在家做 5 次寵物餅乾', check: s => s.cook >= 5 },
        { id: 'builder', icon: '🏗️', name: '小小建築師', desc: '在樂園放 10 個裝飾', check: s => s.build >= 10 },
        { id: 'tramp20', icon: '🤸', name: '彈跳冠軍', desc: '動物跳彈跳床 20 次', check: s => s.tramp >= 20 },
        { id: 'fashion', icon: '👗', name: '時尚樂園', desc: '同時有 5 隻動物戴著配件', check: () => pets.filter(p => p.acc).length >= 5 },
    ];
    const ACHIEVE_REWARD = 20;

    // 圖鑑小知識
    const PET_FACTS = {
        dog: '狗狗的鼻子很靈，嗅覺比人類好很多倍。',
        cat: '貓咪一天大約要睡 12 到 16 個小時。',
        rabbit: '兔子的牙齒會一直長，要常常咬東西磨牙。',
        hamster: '黃金鼠會把食物塞在臉頰的頰囊裡帶回家。',
        mouse: '老鼠用鬍鬚來感覺周圍的東西。',
        fox: '狐狸的大尾巴，冬天可以拿來當被子保暖。',
        bear: '熊冬天會冬眠，一睡就是好幾個月。',
        panda: '貓熊一天大部分的時間都在吃竹子。',
        koala: '無尾熊幾乎只吃尤加利樹葉，一天要睡很久。',
        tiger: '每隻老虎身上的條紋都不一樣，就像人的指紋。',
        lion: '獅子喜歡一大群住在一起，叫做「獅群」。',
        cow: '乳牛的胃分成四個部分，可以慢慢消化青草。',
        pig: '小豬其實很聰明，也很愛乾淨。',
        frog: '青蛙小時候是蝌蚪，在水裡游泳長大。',
        monkey: '猴子會互相理毛，這是牠們表達友好的方式。',
        penguin: '企鵝不會飛，但是非常會游泳。',
        bird: '小鳥用唱歌來跟同伴說話。',
        chick: '小雞會把出生後第一眼看到的對象當成媽媽。',
        duck: '鴨子的羽毛有油脂，所以不怕水。',
        owl: '貓頭鷹的頭可以轉很大的角度，晚上也看得很清楚。',
    };

    const STATE_TEXT = {
        WANDER: '散步中 🚶', EAT: '吃東西 🍽️', DRINK: '喝水 💧', TOILET: '上廁所 🚽', SLEEP: '睡覺 💤',
        PLAY: '玩耍中 🎠', LOVED: '好開心 ❤️', CIRCLE_KID: '繞著主人轉圈 💞', JUMP_KID: '跳跳撒嬌 ⭐',
        ZIGZAG_KID: '跑來跑去 💨', MATING_APPROACH: '找到心上人 💘', MATING_JUMP: '談戀愛中 💑',
        FOLLOW_PARENT: '跟著爸媽 👣', BEING_SENT: '搭大鳥出發 🦅', FETCH: '去撿玩具 🎾', BATH: '洗澡中 🛁', HOME: '在主人家 🏠',
    };

    const DAY_LENGTH = 1200;      // 一天 20 分鐘
    const NIGHT_START = 1080;     // 最後 2 分鐘是晚上
    const ADULT_AGE = 600;        // 10 分鐘長大
    const MAX_PETS = 40;
    const MAX_PER_SPECIES = 8;
    const BREED_COOLDOWN = 300;
    // 每個玩家有自己的存檔 (pet-profiles.js)
    const saveKey = () => PetProfiles.saveKey();

    // ---------------------------------------------------------
    //  小工具
    // ---------------------------------------------------------
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
    const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // ---------------------------------------------------------
    //  Three.js 基本設定
    // ---------------------------------------------------------
    const canvas = document.getElementById('scene');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd8ff);
    // 文字名牌、特效等「貼圖精靈」放在獨立的場景，畫在後製效果之上 (保持清晰、不被 AO 影響)
    const overlay = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 320);
    const world = buildWorld(scene);
    const house = PetHouse.create(scene, world, makeTextSprite);
    scene.environment = PetWorld.makeEnvironment(renderer);
    const raycaster = new THREE.Raycaster();

    // 把場地裡的設施招牌搬到 overlay 場景
    (function moveSpritesToOverlay() {
        scene.updateMatrixWorld(true);
        const list = [];
        scene.traverse(o => { if (o.isSprite) list.push(o); });
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        list.forEach(sp => {
            sp.updateMatrixWorld(true);
            sp.matrixWorld.decompose(p, q, s);
            sp.parent.remove(sp);
            sp.position.copy(p);
            sp.scale.copy(s);
            sp.material.toneMapped = false;
            overlay.add(sp);
        });
    })();

    // 天氣系統 (雨、雪、烏雲)
    const weather = PetWeather.create(scene, overlay, world);

    // 佈置系統 (裝飾、彈跳床)
    const build = PetBuild.create({
        scene, world,
        fx: (e, x, y, z, o) => spawnFx(e, x, y, z, o),
        sfx: name => Audio3D.sfx(name),
        toast: msg => toast(msg),
        addCoins: (n, pos, reason) => addCoins(n, pos, reason),
        getCoins: () => coins,
        spendCoins: n => { coins -= n; updateHUD(); },
        track: ev => track(ev),
        save: () => saveGame(),
    });
    // 天空的鳥：偶爾飛過的鳥群 + 住在樂園的小麻雀
    const birds = PetBirds.create(scene, world, {
        house,
        groundY: (x, z) => groundY(x, z),
        getFoods: () => foods,
        getActors: () => pets.filter(p => !p.indoor).concat(kid && !kid.indoor ? [kid] : []),
        sfx: (name, pos) => { if (spatial(pos).onScreen) sfxAt(name, pos); },
    });
    // 天空的熱氣球：「某某的樂園」
    const balloon = PetBalloon.create(scene, world, { name: (PetProfiles.current() || { name: '我' }).name });

    // ---------- 畫質 / 後製 (環境遮蔽 SSAO + 夜晚光暈 Bloom + 抗鋸齒) ----------
    const hasPost = !!(THREE.EffectComposer && THREE.SSAOPass && THREE.UnrealBloomPass && THREE.ShaderPass);
    // 觸控裝置 (iPad / 手機)。網址加 ?touch=1 可以在電腦上模擬
    const isTouch = matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search);
    let quality = 'high';
    try { quality = localStorage.getItem('petQuality') || (isTouch ? 'normal' : 'high'); } catch (e) { /* ignore */ }
    if (!hasPost) quality = 'normal';
    let composer = null, ssaoPass = null, bloomPass = null, fxaaPass = null;
    function buildComposer() {
        if (!hasPost || composer) return;
        composer = new THREE.EffectComposer(renderer);
        ssaoPass = new THREE.SSAOPass(scene, camera, 2, 2);
        ssaoPass.kernelRadius = 0.9;
        ssaoPass.minDistance = 0.0002;
        ssaoPass.maxDistance = 0.008;
        composer.addPass(ssaoPass);
        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.0, 0.6, 0.82);
        composer.addPass(bloomPass);
        // 調色：稍微提高飽和度與對比，加一點暗角
        composer.addPass(new THREE.ShaderPass({
            uniforms: { tDiffuse: { value: null }, saturation: { value: 1.18 }, contrast: { value: 1.06 }, vignette: { value: 0.28 } },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: `uniform sampler2D tDiffuse; uniform float saturation; uniform float contrast; uniform float vignette; varying vec2 vUv;
                void main() {
                    vec4 c = texture2D(tDiffuse, vUv);
                    float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                    c.rgb = mix(vec3(l), c.rgb, saturation);
                    c.rgb = (c.rgb - 0.18) * contrast + 0.18;
                    float d = distance(vUv, vec2(0.5));
                    c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
                    gl_FragColor = vec4(max(c.rgb, 0.0), c.a);
                }`,
        }));
        // (色調映射在 r147 已於材質內套用，這裡只需轉回 sRGB)
        composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
        fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        composer.addPass(fxaaPass);
    }
    let perfScale = 1;            // 自動降低解析度 (跑不動時)
    function applyQuality() {
        const high = quality === 'high';
        // 解析度：手機 / 平板的螢幕很細，全解析度太吃力 → 設上限；跑不動時會再自動降低 (perfScale)
        const cap = isTouch ? (high ? 1.5 : 1.25) : (high ? 1.5 : 1.5);
        renderer.setPixelRatio(Math.max(0.75, Math.min(cap, window.devicePixelRatio || 1) * perfScale));
        const newType = high ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
        if (renderer.shadowMap.type !== newType) {
            renderer.shadowMap.type = newType;
            scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
        }
        world.sun.shadow.mapSize.set(high ? 4096 : 2048, high ? 4096 : 2048);
        if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; }
        if (high) buildComposer();
        onResize();
        const b = document.getElementById('btn-quality');
        if (b) b.innerHTML = high ? '<i>✨</i><span>畫質：高</span>' : '<i>⚡</i><span>畫質：一般</span>';
    }

    // 夜晚時降低環境光反射
    let lastEnv = -1;
    function applyEnvIntensity(v) {
        if (Math.abs(v - lastEnv) < 0.02) return;
        lastEnv = v;
        scene.traverse(o => {
            if (o.isMesh && o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = v;
        });
    }

    function renderFrame() {
        const high = quality === 'high' && composer;
        if (high) {
            bloomPass.strength = 0.15 + (world.bloomAmt || 0) * 0.75;
            bloomPass.threshold = 0.82 - (world.bloomAmt || 0) * 0.3;
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
        // 名牌與特效畫在最上層
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(overlay, camera);
        renderer.autoClear = true;
    }

    const CAM_DEFAULT = { yaw: 0, pitch: 0.92, dist: 66, tx: 0, tz: 1 };
    const cam = { yaw: CAM_DEFAULT.yaw, pitch: CAM_DEFAULT.pitch, dist: CAM_DEFAULT.dist, target: new THREE.Vector3(CAM_DEFAULT.tx, 0, CAM_DEFAULT.tz) };
    function updateCamera() {
        const cp = Math.cos(cam.pitch);
        camera.position.set(
            cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
            cam.target.y + Math.sin(cam.pitch) * cam.dist,
            cam.target.z + Math.cos(cam.yaw) * cp * cam.dist
        );
        camera.lookAt(cam.target);
    }
    function resetCamera() {
        cam.yaw = CAM_DEFAULT.yaw; cam.pitch = CAM_DEFAULT.pitch; cam.dist = CAM_DEFAULT.dist;
        cam.target.set(CAM_DEFAULT.tx, 0, CAM_DEFAULT.tz);
    }
    function onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        if (composer) {
            const pr = renderer.getPixelRatio();
            composer.setPixelRatio(pr);
            composer.setSize(w, h);
            ssaoPass.setSize(w * pr, h * pr);
            fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
        }
        camera.aspect = w / h;
        // 直立螢幕時拉遠一點，讓整個樂園看得到
        CAM_DEFAULT.dist = w / h < 1 ? 105 : 66;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    // ---------------------------------------------------------
    //  遊戲狀態
    // ---------------------------------------------------------
    let gameState = 'LOADING';   // START_MENU / SELECT_KID / ADOPT_PET / PARK
    let kid = null;
    let pets = [];
    let foods = [];
    let dayTimer = 60, dayCount = 1;
    let isNight = false;
    let waterLevel = 100;
    let breedTimer = 60;
    let sendMode = false;
    let showLabels = true;
    let selectedPet = null;
    let eagle = null;
    let rainbows = [];
    let fxList = [];
    let uidCounter = 1;
    let elapsed = 0;
    let saveTimer = 0;
    let waterWarned = false;
    let coins = 30;                 // 金幣
    let inventory = { cookie: 0, toys: { ball: false, frisbee: false }, accs: {} };  // 背包 (寵物餅乾、玩具)
    let stats = {};                 // 累積紀錄 (成就用)
    let book = { seen: {}, variants: {} };   // 動物圖鑑
    let achieved = {};              // 已解鎖的成就
    let quests = { day: 0, list: [] };       // 每日任務
    let activeToy = null;           // 正在被丟、被撿的玩具
    let happyCoinTimer = 90;
    let shopOpen = false;

    // ---------------------------------------------------------
    //  Emoji 貼圖 / 特效粒子
    // ---------------------------------------------------------
    const emojiTexCache = {};
    function emojiTexture(e) {
        if (!emojiTexCache[e]) {
            const cv = document.createElement('canvas');
            cv.width = cv.height = 128;
            const c = cv.getContext('2d');
            c.font = '100px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(e, 64, 72);
            const t = new THREE.CanvasTexture(cv);
            t.encoding = THREE.sRGBEncoding;
            emojiTexCache[e] = t;
        }
        return emojiTexCache[e];
    }

    function spawnFx(emoji, x, y, z, opt) {
        opt = opt || {};
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false, toneMapped: false }));
        const size = opt.size || 0.9;
        sp.scale.set(size * 0.3, size * 0.3, 1);
        sp.position.set(x, y, z);
        sp.renderOrder = 5;
        overlay.add(sp);
        const life = opt.life || 1.6;
        fxList.push({ sp, vx: opt.vx || 0, vy: opt.vy !== undefined ? opt.vy : 1.4, vz: opt.vz || 0, life, max: life, size });
    }
    function burst(x, y, z, emojis, n, spread) {
        for (let i = 0; i < n; i++) {
            spawnFx(pick(emojis), x + rand(-spread, spread), y + rand(0, spread * 0.8), z + rand(-spread, spread) * 0.5,
                { vy: rand(1, 2.4), vx: rand(-0.6, 0.6), life: rand(1.4, 2.2), size: rand(0.7, 1.1) });
        }
    }
    function updateFx(dt) {
        for (let i = fxList.length - 1; i >= 0; i--) {
            const f = fxList[i];
            f.life -= dt;
            f.sp.position.x += f.vx * dt;
            f.sp.position.y += f.vy * dt;
            f.sp.position.z += f.vz * dt;
            const age = f.max - f.life;
            const s = f.size * Math.min(1, 0.3 + age * 5);
            f.sp.scale.set(s, s, 1);
            f.sp.material.opacity = Math.min(1, (f.life / f.max) * 2.2);
            if (f.life <= 0) {
                overlay.remove(f.sp);
                f.sp.material.dispose();
                fxList.splice(i, 1);
            }
        }
    }

    // ---------------------------------------------------------
    //  名牌 (頭上的名字 + 狀態圖示)
    // ---------------------------------------------------------
    function makeLabel() {
        const cv = document.createElement('canvas');
        cv.width = 384; cv.height = 88;
        const tex = new THREE.CanvasTexture(cv);
        tex.encoding = THREE.sRGBEncoding;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
        sp.scale.set(2.6, 0.6, 1);
        sp.renderOrder = 4;
        sp.userData = { cv, tex, key: '' };
        overlay.add(sp);
        return sp;
    }
    function drawLabel(sp, text, icon, color) {
        const key = text + '|' + icon + '|' + color;
        if (sp.userData.key === key) return;
        sp.userData.key = key;
        const { cv, tex } = sp.userData;
        const c = cv.getContext('2d');
        c.clearRect(0, 0, cv.width, cv.height);
        c.font = 'bold 34px "Microsoft JhengHei", sans-serif';
        const full = icon ? text + ' ' + icon : text;
        const w = Math.min(cv.width - 8, c.measureText(full).width + 36);
        c.fillStyle = 'rgba(255,255,255,0.88)';
        roundRect(c, (cv.width - w) / 2, 10, w, 64, 30);
        c.fill();
        c.fillStyle = color || '#444';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(full, cv.width / 2, 44);
        tex.needsUpdate = true;
    }
    function disposeLabel(sp) {
        overlay.remove(sp);
        sp.material.map.dispose();
        sp.material.dispose();
    }

    // ---------------------------------------------------------
    //  地形高度 (睡窩木地板、廁所沙坑)
    // ---------------------------------------------------------
    function groundY(x, z) {
        const D = world.den;
        if (Math.abs(x - D.x) < D.hw && Math.abs(z - D.z) < D.hd) return 0.22;
        const BA = world.bath;
        if (Math.abs(x - BA.x) < BA.hw && Math.abs(z - BA.z) < BA.hd) return BA.deckY;
        const t = LAYOUT.toilet;
        if (Math.abs(x - t.x) < 2.9 && Math.abs(z - t.z) < 2.0) return 0.33;
        return 0;
    }

    // ---------------------------------------------------------
    //  移動 (會自動尋路繞過設施)
    // ---------------------------------------------------------
    function turnTo(ent, yaw, dt, speed) {
        const diff = wrapAngle(yaw - ent.yaw);
        ent.yaw = wrapAngle(ent.yaw + diff * Math.min(1, dt * (speed || 9)));
    }
    function stepToward(ent, tx, tz, speed, dt, arrive) {
        const dx = tx - ent.pos.x, dz = tz - ent.pos.z;
        const d = Math.hypot(dx, dz);
        if (d <= arrive) return true;
        const step = Math.min(d, speed * dt);
        const ox = ent.pos.x, oz = ent.pos.z;
        ent.pos.x += dx / d * step;
        ent.pos.z += dz / d * step;
        if (!ent.noCollide) world.resolveObstacles(ent.pos, ent.radius);
        const moved = Math.hypot(ent.pos.x - ox, ent.pos.z - oz);
        // 真的卡住了 (例如被其他動物擠住) → 重新規劃路線，再不行就往旁邊閃一下
        if (step > 0.002 && moved < step * 0.3) {
            ent.stuck = (ent.stuck || 0) + dt;
            // 已經很接近目標，只是被別的動物擋住 → 就當作到了 (避免大家擠成一團卡住)
            if (d < 1.6 && ent.stuck > 0.6) { ent.stuck = 0; return true; }
            ent.repath = 0;
            if (ent.stuck > 0.9) {
                ent.stuck = 0;
                ent.detourSide = -(ent.detourSide || 1);
                const s = ent.detourSide;
                ent.detour = { x: ent.pos.x + (-dz / d) * 1.6 * s, z: ent.pos.z + (dx / d) * 1.6 * s, t: 0.8 };
            }
        } else {
            ent.stuck = 0;
        }
        turnTo(ent, Math.atan2(dx, dz), dt);
        ent.moving = true;
        ent.moveSpeed = speed;
        return d - step <= arrive;
    }
    function moveTo(ent, tx, tz, speed, dt, arrive) {
        if (arrive === undefined) arrive = 0.15;
        if (ent.noCollide) return stepToward(ent, tx, tz, speed, dt, arrive);
        if (ent.detour) {
            ent.detour.t -= dt;
            if (ent.detour.t <= 0 || stepToward(ent, ent.detour.x, ent.detour.z, speed, dt, 0.3)) { ent.detour = null; ent.repath = 0; }
            return false;
        }
        // 尋路：目標改變、或每隔一段時間重新規劃
        ent.repath = (ent.repath === undefined ? 0 : ent.repath) - dt;
        if (!ent.path || Math.abs(ent.pathTx - tx) > 0.5 || Math.abs(ent.pathTz - tz) > 0.5 || ent.repath <= 0) {
            ent.path = world.findPath(ent.pos, { x: tx, z: tz }, ent.radius || 0.5);
            ent.pathTx = tx; ent.pathTz = tz; ent.repath = 1.5;
        }
        while (ent.path.length > 1 && Math.hypot(ent.path[0].x - ent.pos.x, ent.path[0].z - ent.pos.z) < 0.45) ent.path.shift();
        if (ent.path.length > 1) {
            stepToward(ent, ent.path[0].x, ent.path[0].z, speed, dt, 0.05);
            return false;
        }
        return stepToward(ent, tx, tz, speed, dt, arrive);
    }

    // ---------------------------------------------------------
    //  遊樂設施活動 (寵物與主人共用)
    // ---------------------------------------------------------
    function newSlideAct() { return { type: 'slide', phase: 'toBase', lane: rand(-0.35, 0.35), locked: false, v: 0, s: 0 }; }
    function newFerrisAct() { return { type: 'ferris', phase: 'toBoard', locked: false, wait: 0, gd: null, travelled: 0, ox: rand(-1.2, 1.2) }; }
    // 某個角色目前正在進行的遊樂活動
    function actOf(ent) { return ent && (ent.isKid ? (kid && kid.task && kid.task.act) : ent.act); }
    // 清掉過期的佔位 (角色已經不在玩了，座位卻還被佔著)
    function cleanSeat(seat, key) {
        ['rider', 'reserved'].forEach(f => {
            const e = seat[f];
            if (!e) return;
            const a = actOf(e);
            const gone = !e.isKid && pets.indexOf(e) === -1;
            if (gone || !a || a[key] !== seat) seat[f] = null;
        });
    }
    function freeSwingSeat() {
        world.swings.seats.forEach(s => cleanSeat(s, 'seat'));
        return world.swings.seats.find(s => !s.rider && !s.reserved);
    }
    function newSwingAct(ent) {
        const seat = freeSwingSeat();
        if (!seat) return null;
        seat.reserved = ent;
        return { type: 'swing', phase: 'toBoard', seat, locked: false, rideT: rand(12, 18), bt: 0 };
    }
    const tmpV = new THREE.Vector3();
    // 小朋友坐下時，把整個人往下移，讓屁股剛好在座位上
    function seatOffset(ent) { return ent.isKid ? 0.18 - 0.6 * kidScale() : 0; }

    // 回傳：null 進行中 | 'loop' 溜完一趟 | 'done' 結束 | 'giveup' 放棄
    function stepActivity(ent, act, dt) {
        ent.noCollide = act.locked;
        if (act.type === 'slide') {
            const S = world.slide;
            if (act.phase === 'toBase') {
                const dBase = Math.hypot(S.base.x - ent.pos.x, S.base.z + act.lane - ent.pos.z);
                if (S.climber && (S.climber === ent || !S.climber.act || S.climber.act === null)) S.climber = null;
                if (dBase < 2.2 && S.climber && S.climber !== ent) {
                    // 有人在爬 → 在梯子旁邊排隊等
                    turnTo(ent, Math.atan2(S.base.x - ent.pos.x, S.base.z - ent.pos.z), dt);
                    act.wait = (act.wait || 0) + dt;
                    if (act.wait > 40) return 'giveup';
                } else if (dBase < 2.2) {
                    // 輪到我了：走到梯子正下方開始爬
                    S.climber = ent;
                    act.locked = true; ent.noCollide = true; ent.detour = null;
                    if (stepToward(ent, S.base.x, S.base.z + act.lane, 3, dt, 0.08)) act.phase = 'climb';
                } else {
                    moveTo(ent, S.base.x, S.base.z + act.lane, 3, dt, 0.15);
                }
            } else if (act.phase === 'climb') {
                ent.pos.y = Math.min(S.H, ent.pos.y + 1.6 * dt);
                const k = ent.pos.y / S.H;
                ent.pos.x = S.base.x + (S.top.x - S.base.x) * k;
                ent.pos.z = S.base.z + act.lane;
                turnTo(ent, Math.PI / 2, dt);
                ent.moving = true; ent.moveSpeed = 1.6;
                if (ent.pos.y >= S.H) { act.phase = 'top'; if (S.climber === ent) S.climber = null; }
            } else if (act.phase === 'top') {
                ent.pos.y = S.H;
                if (stepToward(ent, S.start.x, S.start.z + act.lane * 0.5, 2.2, dt, 0.08)) {
                    act.phase = 'slide'; act.v = 2; act.s = 0;
                    sfxAt('whee', ent.pos);
                    if (ent.id && PET_BY_ID[ent.id] && Math.random() < 0.6) petSay(ent);
                    if (Math.random() < 0.7) spawnFx(pick(['😆', '🎵', '✨']), ent.pos.x, ent.pos.y + 1.4, ent.pos.z);
                }
            } else if (act.phase === 'slide') {
                const sx = S.start.x, ex = S.end.x - 0.8, H = S.H;
                const slopeLen = Math.hypot(ex - sx, H);
                act.v = Math.min(9, act.v + 8 * dt);
                act.s += act.v * dt;
                ent.pose = ent.isKid ? 'benchsit' : 'sit';
                turnTo(ent, Math.PI / 2, dt, 20);
                if (act.s < slopeLen) {
                    const k = act.s / slopeLen;
                    ent.pos.x = sx + (ex - sx) * k;
                    ent.pos.y = H + (0.15 - H) * k;
                } else {
                    ent.pos.x = Math.min(S.end.x, ent.pos.x + act.v * 0.5 * dt);
                    ent.pos.y = 0.15;
                    act.v *= 0.9;
                    if (ent.pos.x >= S.end.x - 0.05 || act.v < 0.5) {
                        act.phase = 'out'; act.locked = false;
                        spawnFx(pick(['🎵', '😄', '✨']), ent.pos.x, 1.5, ent.pos.z);
                    }
                }
                ent.pos.z = S.start.z + act.lane * 0.5;
                if (ent.isKid) ent.pos.y += seatOffset(ent) * 0.6;
            } else if (act.phase === 'out') {
                ent.pos.y = Math.max(0, ent.pos.y - dt);
                if (moveTo(ent, S.exit.x + act.lane * 2, S.exit.z + act.lane * 3, 3, dt, 0.8)) {
                    act.phase = 'toBase';
                    return 'loop';
                }
            }
        } else if (act.type === 'ferris') {
            const F = world.ferris;
            if (act.phase === 'toBoard') {
                if (moveTo(ent, F.board.x + act.ox, F.board.z + Math.abs(act.ox) * 0.5, 3, dt, 1.0)) act.phase = 'wait';
            } else if (act.phase === 'wait') {
                act.wait += dt;
                turnTo(ent, Math.PI, dt);
                for (const gd of F.gondolas) {
                    if (gd.rider) continue;
                    const a = wrapAngle(gd.baseAngle + F.angle + Math.PI / 2);
                    if (Math.abs(a) < 0.16) {
                        gd.rider = ent; act.gd = gd; act.phase = 'board'; act.locked = true; act.bt = 0;
                        sfxAt('ding', ent.pos);
                        break;
                    }
                }
                if (act.phase === 'wait' && act.wait > 30) return 'giveup';
            } else if (act.phase === 'board' || act.phase === 'ride') {
                F.seatPos(act.gd, tmpV);
                tmpV.y += seatOffset(ent);
                if (act.phase === 'board') {
                    act.bt += dt;
                    const k = Math.min(1, act.bt / 0.5);
                    ent.pos.x += (tmpV.x - ent.pos.x) * k;
                    ent.pos.y += (tmpV.y - ent.pos.y) * k;
                    ent.pos.z += (tmpV.z - ent.pos.z) * k;
                    ent.moving = true; ent.moveSpeed = 2;
                    if (k >= 1) { act.phase = 'ride'; act.travelled = 0; }
                } else {
                    ent.pos.copy(tmpV);
                    ent.pose = 'ride';
                    act.travelled += F.speed * dt;
                    turnTo(ent, cam.yaw, dt, 3);
                    if (Math.random() < dt * 0.5) spawnFx(pick(['🎵', '😆', '💕', '✨']), ent.pos.x, ent.pos.y + 1.4, ent.pos.z + 0.6);
                    if (act.travelled >= Math.PI * 2) {
                        act.gd.rider = null; act.gd = null;
                        ent.pos.set(F.board.x + act.ox, 0, F.board.z);
                        act.locked = false;
                        return 'done';
                    }
                }
            }
        } else if (act.type === 'swing') {
            const SW = world.swings, seat = act.seat;
            if (act.phase === 'toBoard') {
                if (moveTo(ent, SW.boardX, seat.z, 3, dt, 0.6)) {
                    act.phase = 'board'; act.locked = true; act.bt = 0; ent.noCollide = true;
                    sfxAt('sit', ent.pos);
                }
            } else if (act.phase === 'board') {
                act.bt += dt;
                SW.seatPos(seat, tmpV);
                tmpV.y += seatOffset(ent);
                const k = Math.min(1, act.bt / 0.5);
                ent.pos.x += (tmpV.x - ent.pos.x) * k;
                ent.pos.y += (tmpV.y - ent.pos.y) * k;
                ent.pos.z += (tmpV.z - ent.pos.z) * k;
                turnTo(ent, Math.PI / 2, dt, 8);
                ent.moving = true; ent.moveSpeed = 1.5;
                if (k >= 1) { act.phase = 'ride'; seat.rider = ent; seat.reserved = null; }
            } else if (act.phase === 'ride') {
                SW.seatPos(seat, tmpV);
                tmpV.y += seatOffset(ent);
                ent.pos.copy(tmpV);
                ent.pose = ent.isKid ? 'swing' : 'ride';
                ent.yaw = Math.PI / 2;
                act.rideT -= dt;
                if (Math.random() < dt * 0.6) spawnFx(pick(['🎵', '😆', '✨', '💨']), ent.pos.x, ent.pos.y + 1.3, ent.pos.z);
                if (Math.random() < dt * 0.25) sfxAt('creak', ent.pos);
                // 盪到最低點附近才跳下來
                if (act.rideT <= 0 && Math.abs(seat.angle) < 0.12) {
                    seat.rider = null;
                    ent.pos.set(SW.boardX, 0, seat.z);
                    act.locked = false;
                    return 'done';
                }
            }
        }
        else if (act.type === 'tramp') {
            const D = act.deco;
            if (build.decos.indexOf(D) === -1) return 'giveup';   // 彈跳床被拆掉了
            if (act.phase === 'toBoard') {
                if (moveTo(ent, act.bx, act.bz, 3, dt, 0.5)) {
                    act.phase = 'board'; act.locked = true; act.t = 0; ent.noCollide = true;
                    act.from = { x: ent.pos.x, y: ent.pos.y, z: ent.pos.z };
                    D.reserved = null; D.rider = ent;
                }
            } else if (act.phase === 'board') {
                act.t += dt;
                const k = Math.min(1, act.t / 0.5);
                ent.pos.set(act.from.x + (D.x - act.from.x) * k, act.from.y + (0.5 - act.from.y) * k + Math.sin(k * Math.PI) * 0.8, act.from.z + (D.z - act.from.z) * k);
                ent.pose = ent.isKid ? 'happy' : 'hop';
                if (k >= 1) { act.phase = 'jump'; act.t = 0; act.hops = 0; }
            } else if (act.phase === 'jump') {
                // 一直彈跳！高點會轉圈
                act.t += dt;
                act.rideT -= dt;
                const period = 0.72;
                const ph = (act.t % period) / period;
                const h = Math.sin(ph * Math.PI) * (ent.isKid ? 1.6 : 1.9);
                ent.pos.set(D.x, 0.5 + h, D.z);
                ent.trampSquash = ph < 0.12 ? 1 - ph / 0.12 : ph > 0.88 ? (ph - 0.88) / 0.12 : 0;
                ent.pose = ent.isKid ? 'happy' : (h > 0.3 ? 'hop' : 'idle');
                if (h > 1.2) ent.yaw += dt * (ent.isKid ? 3 : 5);
                const hops = Math.floor(act.t / period);
                if (hops > act.hops) {
                    act.hops = hops;
                    sfxAt('boing', ent.pos);
                    if (Math.random() < 0.5) spawnFx(pick(['⭐', '🌟', '😆', '✨']), ent.pos.x, ent.pos.y + 1.6, ent.pos.z, { size: 0.6 });
                }
                if (act.rideT <= 0 && ph < 0.1) { act.phase = 'off'; act.t = 0; act.from = { x: ent.pos.x, y: ent.pos.y, z: ent.pos.z }; ent.trampSquash = 0; }
            } else if (act.phase === 'off') {
                act.t += dt;
                const k = Math.min(1, act.t / 0.5);
                ent.pos.set(act.from.x + (act.bx - act.from.x) * k, act.from.y * (1 - k) + Math.sin(k * Math.PI) * 0.8, act.from.z + (act.bz - act.from.z) * k);
                ent.pose = ent.isKid ? 'happy' : 'hop';
                if (k >= 1) {
                    D.rider = null;
                    act.locked = false;
                    ent.pos.y = 0;
                    if (!ent.isKid) track('tramp');
                    return 'done';
                }
            }
        }
        return null;
    }
    function newTrampAct(ent) {
        build.decos.forEach(d => { if (d.id === 'trampoline') cleanSeat(d, 'deco'); });
        const D = build.freeTrampoline(ent, ent.pos);
        if (!D) return null;
        D.reserved = ent;
        // 從靠近自己的那一側上去
        let dx = ent.pos.x - D.x, dz = ent.pos.z - D.z;
        const dl = Math.hypot(dx, dz) || 1;
        dx /= dl; dz /= dl;
        const r = 1.45 + 0.7;
        const p = { x: D.x + dx * r, z: D.z + dz * r };
        world.resolveObstacles(p, 0.4);
        return { type: 'tramp', phase: 'toBoard', deco: D, locked: false, t: 0, rideT: rand(7, 11), bx: p.x, bz: p.z };
    }
    function releaseAct(ent, act) {
        if (!act) return;
        if (act.deco) {
            if (act.deco.rider === ent) act.deco.rider = null;
            if (act.deco.reserved === ent) act.deco.reserved = null;
            ent.trampSquash = 0;
            if (ent.pos.y > 0.3) { ent.pos.set(act.bx, 0, act.bz); }
        }
        if (act.gd && act.gd.rider === ent) act.gd.rider = null;
        act.gd = null;
        if (world.slide.climber === ent) world.slide.climber = null;
        if (act.seat) {
            if (act.seat.rider === ent) act.seat.rider = null;
            if (act.seat.reserved === ent) act.seat.reserved = null;
        }
        if (ent.pos.y > 0.4) {
            // 還在半空中 → 放回安全的地面
            if (act.type === 'ferris') ent.pos.set(world.ferris.board.x, 0, world.ferris.board.z);
            else if (act.type === 'swing') ent.pos.set(world.swings.boardX, 0, act.seat.z);
            else ent.pos.set(world.slide.exit.x, 0, world.slide.exit.z);
        }
        ent.noCollide = false;
        ent.path = null;
    }

    // ---------------------------------------------------------
    //  寵物
    // ---------------------------------------------------------
    function addBlob() { const b = PetWorld.makeBlobShadow(); scene.add(b); return b; }
    const proxyGeo = new THREE.SphereGeometry(0.8, 8, 6);
    const proxyMat = new THREE.MeshBasicMaterial();
    const LABEL_H = { quad: 1.6, bird: 1.25, penguin: 1.5, owl: 1.45, frog: 0.85 };

    function petScale(p) {
        const g = p.isAdult ? 1 : 0.55 + 0.45 * Math.min(1, p.age / ADULT_AGE);
        return SPECS[p.id].size * g;
    }
    function petName(p) { return p.nick || p.name; }

    // 身上的泥巴斑點 (越髒越多)
    const dirtGeo = new THREE.SphereGeometry(1, 8, 6);
    function makeDirtBlobs(rig) {
        const main = rig.body.children.find(c => c.isMesh);
        const sx = main ? main.scale.x : 0.4, sy = main ? main.scale.y : 0.4, sz = main ? main.scale.z : 0.4;
        const spots = [[0.55, 0.6, 0.3], [-0.6, 0.5, -0.2], [0.2, 0.8, -0.45], [-0.3, 0.7, 0.5], [0.7, 0.1, -0.5]];
        return spots.map(([x, y, z]) => {
            const m = new THREE.Mesh(dirtGeo, PetModels.mat(0x7a5230));
            m.scale.set(0.1, 0.045, 0.09);
            m.position.set(x * sx, y * sy, z * sz);
            m.visible = false;
            rig.body.add(m);
            return m;
        });
    }

    function createPet(speciesId, o) {
        o = o || {};
        const db = PET_BY_ID[speciesId];
        const model = buildPet(speciesId, o.variant);
        const rig = model.userData.rig;
        const proxy = new THREE.Mesh(proxyGeo, proxyMat);
        proxy.visible = false;
        proxy.position.y = 0.6;
        model.add(proxy);
        scene.add(model);
        const p = {
            uid: o.uid || uidCounter++,
            id: speciesId, name: db.name, emoji: db.emoji, eats: db.eats.slice(),
            nick: o.nick || '',
            variant: PetModels.VARIANTS[o.variant] ? o.variant : null,
            gender: o.gender || (Math.random() < 0.5 ? 'M' : 'F'),
            age: o.age || 0,
            isAdult: !!o.isAdult,
            hunger: o.hunger !== undefined ? o.hunger : rand(10, 30),
            thirst: o.thirst !== undefined ? o.thirst : rand(0, 20),
            boredom: o.boredom !== undefined ? o.boredom : rand(0, 30),
            bladder: o.bladder !== undefined ? o.bladder : rand(0, 40),
            dirt: o.dirt !== undefined ? o.dirt : rand(0, 20),
            acc: o.acc && PetModels.ACCESSORIES[o.acc] ? o.acc : null,
            toiletCooldown: o.toiletCooldown !== undefined ? o.toiletCooldown : rand(0, 60),
            trickTimer: o.trickTimer !== undefined ? o.trickTimer : rand(30, 120),
            breedCooldown: o.breedCooldown || 0,
            followParentTimer: o.followParentTimer || 0,
            parent: null,
            state: 'WANDER', st: 0, data: {},
            pos: new THREE.Vector3(o.x || 0, 0, o.z || 0),
            yaw: o.yaw !== undefined ? o.yaw : rand(-Math.PI, Math.PI),
            model, rig, proxy, label: makeLabel(), blob: addBlob(),
            pose: 'idle', moving: false, moveSpeed: 0, hopH: 0, solid: true,
            radius: 0.5, spot: null, act: null, mate: null,
        };
        if (p.age >= ADULT_AGE) p.isAdult = true;
        if (p.uid >= uidCounter) uidCounter = p.uid + 1;
        proxy.userData.pick = { kind: 'pet', pet: p };
        pets.push(p);
        p.dirtBlobs = makeDirtBlobs(rig);
        if (p.acc) PetModels.setAccessory(model, p.acc);
        markSeen(p, !!o.silent);
        return p;
    }

    function removePet(p) {
        leaveState(p, 'GONE');
        scene.remove(p.model);
        scene.remove(p.blob);
        disposeLabel(p.label);
        pets = pets.filter(x => x !== p);
        pets.forEach(x => { if (x.parent === p) x.parent = null; });
        if (favoriteUid === p.uid) favoriteUid = null;
        if (selectedPet === p) closePetPanel();
    }

    function setState(p, s, data) {
        leaveState(p, s);
        p.state = s;
        p.st = 0;
        p.data = data || {};
    }
    const TRICKS = { CIRCLE_KID: 1, JUMP_KID: 1, ZIGZAG_KID: 1 };
    function leaveState(p, next) {
        if (p.spot) { p.spot.occupant = null; p.spot = null; }
        if (p.act) { releaseAct(p, p.act); p.act = null; }
        if (p.mate && !(next === 'MATING_APPROACH' || next === 'MATING_JUMP')) {
            const m = p.mate;
            p.mate = null;
            if (m.mate === p) {
                m.mate = null;
                if (m.state === 'MATING_APPROACH' || m.state === 'MATING_JUMP') setState(m, 'WANDER');
            }
        }
        // 撒嬌被打斷時，給一段冷卻，避免馬上又重來
        if (TRICKS[p.state] && p.trickTimer <= 0) p.trickTimer = rand(30, 60);
        if (p.state === 'FOLLOW_PARENT' && next !== 'FOLLOW_PARENT' && next !== 'SLEEP') { p.parent = null; p.followParentTimer = 0; }
        if (p.state === 'HOME' && next !== 'HOME' && p.indoor) {
            p.indoor = false; p.climb = null;
            { const q = house.L(0.8, house.D / 2 + 1.8); p.pos.set(q.x, 0, q.z); }
        }
        if (p.state === 'FETCH' && next !== 'FETCH' && activeToy && activeToy.carrier === p) {
            activeToy.carrier = null; activeToy.phase = 'ground'; activeToy.groundT = 0;
            activeToy.to = { x: p.pos.x, z: p.pos.z };
        }
        p.detour = null;
        p.noCollide = false;
        p.hopH = 0;
    }

    function reserveSpot(p, spots, nearest) {
        let best = null, bd = Infinity;
        for (let i = 0; i < spots.length; i++) {
            const s = spots[i];
            if (s.occupant && s.occupant !== p) continue;
            const d = nearest ? dist2D(s, p.pos) : i;
            if (d < bd) { bd = d; best = s; }
        }
        if (best) { best.occupant = p; p.spot = best; }
        return best;
    }
    const hasFreeSpot = spots => spots.some(s => !s.occupant);

    function kidAvailable() {
        return kid && !kid.indoor && !(kid.task && kid.task.act) && kid.pos.y < 0.7;
    }

    function findFood(p) {
        let best = null, bd = Infinity;
        foods.forEach(f => {
            if (!f.landed || f.taken || !(p.eats.includes(f.emoji) || UNIVERSAL_FOODS[f.emoji])) return;
            const d = dist2D(f, p.pos);
            if (d < bd) { bd = d; best = f; }
        });
        return best;
    }

    // 天氣喜好：青蛙、鴨子愛下雨；企鵝愛下雪
    const RAIN_LOVERS = { frog: 1, duck: 1 };
    const SNOW_LOVERS = { penguin: 1 };
    function inDen(pos) {
        const D = world.den;
        return Math.abs(pos.x - D.x) < D.hw && Math.abs(pos.z - D.z) < D.hd;
    }
    function weatherMood(p, dt, d) {
        const top = p.pos.y + 1.4 * petScale(p);
        if (weather.rainAmt > 0.3) {
            if (RAIN_LOVERS[p.id]) {
                if (Math.random() < dt * 0.3) { d.happyT = 1.6; spawnFx(pick(['💦', '😆', '🌧️']), p.pos.x, top, p.pos.z, { size: 0.6 }); }
            } else if (!inDen(p.pos) && Math.random() < dt * 0.1) {
                // 甩甩身上的雨水
                d.happyT = 0.7;
                burst(p.pos.x, p.pos.y + 0.6 * petScale(p), p.pos.z, ['💦'], 3, 0.4);
            }
        } else if (weather.snowAmt > 0.3) {
            if (SNOW_LOVERS[p.id]) {
                if (Math.random() < dt * 0.3) { d.happyT = 1.6; spawnFx(pick(['❄️', '😆', '⛄']), p.pos.x, top, p.pos.z, { size: 0.6 }); }
            } else if (Math.random() < dt * 0.03) {
                spawnFx(pick(['🥶', '❄️']), p.pos.x, top, p.pos.z, { size: 0.55 });
            }
        }
        if (d.happyT > 0) { d.happyT -= dt; p.pose = 'happy'; }
    }

    // 決定下一個想做的事 (在散步時判斷)
    function think(p) {
        // 最愛的寵物：主人在家 → 玩完也回家找主人
        if (p.uid === favoriteUid && kid && kid.indoor && !(kid.task && kid.task.type === 'exitHome')) { setState(p, 'HOME', { phase: 'toDoor' }); return true; }
        if (isNight) { setState(p, 'SLEEP'); return true; }
        if (p.bladder > 80 && p.toiletCooldown <= 0 && hasFreeSpot(world.toiletSpots)) { setState(p, 'TOILET'); return true; }
        if (p.thirst > 80 && waterLevel > 1 && hasFreeSpot(world.drinkSpots)) { setState(p, 'DRINK'); return true; }
        const food = findFood(p);
        if (food) { setState(p, 'EAT', { food }); return true; }
        if (p.boredom > 80) { setState(p, 'PLAY'); return true; }
        // 同時最多 2 隻來撒嬌，避免主人被擠爆
        if (p.trickTimer <= 0 && kidAvailable() && pets.filter(x => TRICKS[x.state]).length < 2) {
            const dice = 1 + Math.floor(Math.random() * 6);
            setState(p, dice <= 4 ? 'CIRCLE_KID' : dice === 5 ? 'JUMP_KID' : 'ZIGZAG_KID');
            return true;
        }
        return false;
    }

    // ---------- 聲音 (依畫面位置決定左右聲道與遠近音量) ----------
    const Audio3D = window.PetAudio || { petVoice() {}, sfx() {}, ambience() {}, setNight() {}, setMusic() {}, setSfx() {}, musicOn: false, sfxOn: false, supported: false };
    const sndV = new THREE.Vector3(), sndW = new THREE.Vector3();
    function spatial(pos) {
        sndV.set(pos.x, pos.y + 0.5, pos.z).project(camera);
        const onScreen = sndV.z < 1 && Math.abs(sndV.x) < 1.1 && Math.abs(sndV.y) < 1.1;
        const d = camera.position.distanceTo(sndW.set(pos.x, pos.y, pos.z));
        return { pan: clamp(sndV.x, -1, 1) * 0.7, vol: clamp(30 / d, 0.15, 1) * (onScreen ? 1 : 0.3), onScreen };
    }
    function petSay(p, force) {
        const s = spatial(p.pos);
        Audio3D.petVoice(p.id, { pan: s.pan, vol: s.vol, baby: !p.isAdult, force });
    }
    function sfxAt(name, pos) {
        Audio3D.sfx(name, { pan: pos ? spatial(pos).pan : 0 });
    }

    function endTrick(p, success) {
        p.trickTimer = rand(60, 120);
        if (success) {
            burst(p.pos.x, p.pos.y + 1.2, p.pos.z, ['❤️', '💖', '💗', '💓'], 6, 0.8);
            sfxAt('sparkle', p.pos);
            petSay(p, true);
            addCoins(3, p.pos);
            track('trick');
            if (kid) { spawnFx('🥰', kid.pos.x, kid.pos.y + 2.6, kid.pos.z); kid.cheerT = 1.6; }
            p.boredom = Math.max(0, p.boredom - 20);
            setState(p, 'LOVED', { t: 1.2 });
        } else {
            setState(p, 'WANDER');
        }
    }

    // 相機的右方向 (讓左右跑在畫面上看起來是左右)
    function camRight() { return { x: Math.cos(cam.yaw), z: -Math.sin(cam.yaw) }; }
    function camFront() { return { x: Math.sin(cam.yaw), z: Math.cos(cam.yaw) }; }

    // ---------- 各狀態行為 ----------
    const STATES = {
        WANDER(p, dt) {
            const d = p.data;
            d.thinkT = (d.thinkT === undefined ? rand(0, 0.4) : d.thinkT) - dt;
            if (d.thinkT <= 0) {
                d.thinkT = rand(0.4, 0.7);
                if (think(p)) return;
            }
            if (d.target) {
                d.walkT = (d.walkT || 0) + dt;
                // 走太久還沒到 (目標被主人或別的動物擋住) → 換個地方
                if (d.walkT > 14) { d.target = null; d.walkT = 0; d.idle = rand(0.5, 2); return; }
                if (moveTo(p, d.target.x, d.target.z, d.speed || 2.2, dt, 0.25)) {
                    d.walkT = 0;
                    d.target = null;
                    d.idle = d.idleLong ? rand(6, 12) : rand(1.5, 5);
                    d.sit = d.idleLong || Math.random() < 0.35;
                    d.idleLong = false;
                }
            } else {
                d.idle = (d.idle === undefined ? rand(0.3, 2) : d.idle) - dt;
                if (d.sit) p.pose = 'sit';
                if (d.lookKid && kid) turnTo(p, Math.atan2(kid.pos.x - p.pos.x, kid.pos.z - p.pos.z), dt, 3);
                weatherMood(p, dt, d);
                if (d.idle <= 0) {
                    let tx, tz;
                    const D = world.den;
                    if (weather.rainAmt > 0.4 && !RAIN_LOVERS[p.id] && Math.random() < 0.75) {
                        // 下雨了 → 跑去睡窩的紗帳下躲雨
                        tx = D.x + rand(-D.hw + 1, D.hw - 1); tz = D.z + rand(-D.hd + 1, D.hd - 1);
                        d.idleLong = true;
                    } else if (kid && Math.random() < 0.25) {
                        tx = kid.pos.x + rand(-4, 4); tz = kid.pos.z + rand(-4, 4);
                    } else {
                        tx = p.pos.x + rand(-9, 9); tz = p.pos.z + rand(-7, 7);
                    }
                    const t = { x: clamp(tx, BOUNDS.minX + 1, BOUNDS.maxX - 1), z: clamp(tz, BOUNDS.minZ + 1, BOUNDS.maxZ - 1) };
                    world.resolveObstacles(t, 0.8);
                    d.target = t;
                    d.speed = Math.random() < 0.15 ? 4 : rand(1.8, 2.6);
                    d.sit = false;
                    d.lookKid = Math.random() < 0.3;
                }
            }
        },

        LOVED(p, dt) {
            p.pose = 'happy';
            if (kid) turnTo(p, Math.atan2(kid.pos.x - p.pos.x, kid.pos.z - p.pos.z), dt, 6);
            if (p.st > (p.data.t || 2)) setState(p, 'WANDER', { idle: rand(0.5, 1.5) });
        },

        EAT(p, dt) {
            const d = p.data;
            if (d.eating) {
                p.pose = 'eat';
                d.eatT -= dt;
                if (Math.random() < dt * 3) spawnFx(d.emoji, p.pos.x + rand(-0.2, 0.2), p.pos.y + 0.4, p.pos.z, { size: 0.45, vy: 0.8, life: 0.8 });
                if (d.eatT <= 0) {
                    p.hunger = Math.max(0, p.hunger - 35);
                    track('feed');
                    p.boredom = Math.max(0, p.boredom - 10);
                    if (d.emoji === '🍪') {
                        // 寵物餅乾：超級開心
                        p.hunger = Math.max(0, p.hunger - 25);
                        p.boredom = Math.max(0, p.boredom - 40);
                        burst(p.pos.x, p.pos.y + 1.2, p.pos.z, ['💖', '✨', '🍪'], 5, 0.6);
                    }
                    spawnFx('😋', p.pos.x, p.pos.y + 1.5 * petScale(p) + 0.4, p.pos.z);
                    sfxAt('yum', p.pos);
                    if (Math.random() < 0.5) petSay(p);
                    setState(p, 'LOVED', { t: 1.2 });
                }
                return;
            }
            if (!d.food || d.food.taken || foods.indexOf(d.food) === -1) {
                const f = findFood(p);
                if (!f) { setState(p, 'WANDER'); return; }
                d.food = f;
            }
            if (moveTo(p, d.food.x, d.food.z, 3.2, dt, 0.5 + 0.2 * petScale(p))) {
                d.emoji = d.food.emoji;
                takeFood(d.food);
                d.eating = true;
                sfxAt('eat', p.pos);
                d.eatT = 1.4;
            }
            if (p.st > 25) setState(p, 'WANDER');
        },

        DRINK(p, dt) {
            const d = p.data;
            if (!p.spot && !reserveSpot(p, world.drinkSpots, true)) { setState(p, 'WANDER'); return; }
            if (!d.at) {
                if (moveTo(p, p.spot.x, p.spot.z, 2.8, dt, 0.12)) d.at = true;
            } else {
                p.solid = false;
                p.pose = 'drink';
                turnTo(p, p.spot.face, dt);
                if (waterLevel <= 0) {
                    spawnFx('😢', p.pos.x, p.pos.y + 1.6 * petScale(p), p.pos.z);
                    setState(p, 'WANDER');
                    return;
                }
                p.thirst -= 40 * dt;
                waterLevel = Math.max(0, waterLevel - 2.5 * dt);
                if (Math.random() < dt * 3) { spawnFx('💧', p.pos.x, p.pos.y + 0.8, p.pos.z, { size: 0.5, vy: 0.7, life: 0.9 }); sfxAt('drink', p.pos); }
                if (p.thirst <= 0) { p.thirst = 0; setState(p, 'WANDER'); }
            }
            if (p.st > 40) setState(p, 'WANDER');
        },

        TOILET(p, dt) {
            const d = p.data;
            if (!p.spot && !reserveSpot(p, world.toiletSpots, true)) { setState(p, 'WANDER'); return; }
            if (!d.at) {
                if (moveTo(p, p.spot.x, p.spot.z, 2.8, dt, 0.12)) d.at = true;
            } else {
                p.solid = false;
                p.pose = 'poop';
                turnTo(p, 0, dt);
                p.bladder -= 30 * dt;
                if (Math.random() < dt * 1.2) { spawnFx('💩', p.pos.x + rand(-0.3, 0.3), p.pos.y + 0.6, p.pos.z, { size: 0.55, vy: 0.5, life: 1.2 }); sfxAt('plop', p.pos); }
                if (p.bladder <= 0) {
                    p.bladder = 0;
                    p.toiletCooldown = 120;
                    spawnFx('✨', p.pos.x, p.pos.y + 1.4, p.pos.z);
                    setState(p, 'WANDER');
                }
            }
            if (p.st > 40) setState(p, 'WANDER');
        },

        SLEEP(p, dt) {
            const d = p.data;
            if (!isNight) {
                // 天亮了 → 一定醒來 (修正舊版睡不醒的問題)
                spawnFx(pick(['☀️', '🥱', '✨']), p.pos.x, p.pos.y + 1.6 * petScale(p), p.pos.z);
                setState(p, 'WANDER', { idle: rand(0.5, 3) });
                return;
            }
            if (!p.spot && !d.noSpot && !reserveSpot(p, world.sleepSpots, false)) d.noSpot = true;
            if (p.spot && !d.at) {
                // 走不到就原地睡 (避免卡住)
                if (moveTo(p, p.spot.x, p.spot.z, 3.0, dt, 0.3) || p.st > 25) { d.at = true; d.yaw = cam.yaw + rand(-0.35, 0.35); }
                return;
            }
            p.solid = false;
            p.pose = 'sleep';
            if (p.spot) {
                // 爬上自己的小床 (臉朝向鏡頭，蓋上小被子)
                p.noCollide = true;
                const k = Math.min(1, dt * 4);
                p.pos.x += (p.spot.x - p.pos.x) * k;
                p.pos.z += (p.spot.z - p.pos.z) * k;
                p.pos.y += ((p.spot.y || 0) - p.pos.y) * Math.min(1, dt * 6);
            }
            if (d.yaw === undefined) d.yaw = p.yaw;
            turnTo(p, d.yaw, dt, 2);
            if (Math.random() < dt * 0.45) spawnFx('💤', p.pos.x + 0.3, p.pos.y + 1.1 * petScale(p), p.pos.z, { size: 0.6, vy: 0.45, vx: 0.2, life: 2.2 });
        },

        PLAY(p, dt) {
            if (!p.act) {
                // 選一個遊樂設施：摩天輪 / 盪鞦韆 / 溜滑梯
                const freeG = world.ferris.gondolas.filter(g => !g.rider).length;
                const waiting = pets.filter(x => x.act && x.act.type === 'ferris').length;
                const opts = ['slide'];
                if (freeG > waiting + 1) opts.push('ferris');
                if (freeSwingSeat()) opts.push('swing', 'swing');
                build.decos.forEach(d => { if (d.id === 'trampoline') cleanSeat(d, 'deco'); });
                if (build.freeTrampoline(p)) opts.push('tramp', 'tramp', 'tramp');
                const choice = pick(opts);
                p.act = choice === 'ferris' ? newFerrisAct() : choice === 'swing' ? newSwingAct(p) : choice === 'tramp' ? newTrampAct(p) : newSlideAct();
                if (!p.act) p.act = newSlideAct();
            }
            if (isNight && !p.act.locked) { setState(p, 'SLEEP'); return; }
            const r = stepActivity(p, p.act, dt);
            if (p.act && (p.act.phase === 'ride' || p.act.phase === 'jump')) p.boredom = Math.max(0, p.boredom - (p.act.type === 'ferris' ? 3 : 6) * dt);
            if (r === 'loop') {
                p.boredom = Math.max(0, p.boredom - 40);
                p.dirt = Math.min(100, p.dirt + 3);
                track('ride');
                if (p.boredom <= 0 || isNight) { p.boredom = 0; setState(p, 'WANDER'); }
            } else if (r === 'done') {
                p.boredom = 0;
                track('ride');
                burst(p.pos.x, p.pos.y + 1.2, p.pos.z, ['🎵', '😆', '✨'], 3, 0.6);
                setState(p, 'WANDER');
            } else if (r === 'giveup') {
                // 排太久了 → 先去別的地方逛逛
                p.boredom = 60;
                setState(p, 'WANDER', { idle: 0.5 });
                return;
            }
            if (p.st > 150) setState(p, 'WANDER');
        },

        CIRCLE_KID(p, dt) {
            if (!kidAvailable()) { endTrick(p, false); return; }
            const d = p.data;
            const R = 2.0 + petScale(p) * 0.8;
            if (!d.orbit) {
                if (d.ang === undefined) d.ang = Math.atan2(p.pos.x - kid.pos.x, p.pos.z - kid.pos.z);
                if (moveTo(p, kid.pos.x + Math.sin(d.ang) * R, kid.pos.z + Math.cos(d.ang) * R, 4.2, dt, 0.35)) { d.orbit = true; d.prog = 0; }
            } else {
                const w = 2.1;
                d.ang += w * dt;
                d.prog += w * dt;
                p.pos.x = kid.pos.x + Math.sin(d.ang) * R;
                p.pos.z = kid.pos.z + Math.cos(d.ang) * R;
                turnTo(p, Math.atan2(Math.cos(d.ang), -Math.sin(d.ang)), dt, 15);
                p.moving = true; p.moveSpeed = w * R;
                if (Math.random() < dt * 2) spawnFx('💕', p.pos.x, p.pos.y + 1.4 * petScale(p), p.pos.z, { size: 0.6 });
                if (d.prog >= Math.PI * 4) { endTrick(p, true); return; }
            }
            if (p.st > 25) endTrick(p, false);
        },

        JUMP_KID(p, dt) {
            if (!kidAvailable()) { endTrick(p, false); return; }
            const d = p.data;
            if (!d.jumping) {
                const dx = p.pos.x - kid.pos.x, dz = p.pos.z - kid.pos.z;
                const dd = Math.hypot(dx, dz) || 1;
                const off = 1.6 + petScale(p) * 0.4;
                if (moveTo(p, kid.pos.x + dx / dd * off, kid.pos.z + dz / dd * off, 4, dt, 0.3)) { d.jumping = true; d.jt = 0; d.hops = 0; }
            } else {
                d.jt += dt;
                turnTo(p, Math.atan2(kid.pos.x - p.pos.x, kid.pos.z - p.pos.z), dt, 10);
                const period = 0.5;
                const ph = (d.jt % period) / period;
                p.hopH = Math.sin(ph * Math.PI) * 0.9 * Math.max(0.7, petScale(p));
                p.pose = p.hopH > 0.08 ? 'hop' : 'idle';
                const hops = Math.floor(d.jt / period);
                if (hops > d.hops) { d.hops = hops; spawnFx('⭐', p.pos.x, p.pos.y + 1.6 * petScale(p), p.pos.z, { size: 0.6 }); }
                if (d.jt >= period * 5) { endTrick(p, true); return; }
            }
            if (p.st > 25) endTrick(p, false);
        },

        ZIGZAG_KID(p, dt) {
            if (!kidAvailable()) { endTrick(p, false); return; }
            const d = p.data;
            const r = camRight(), f = camFront();
            if (d.leg === undefined) { d.leg = 0; d.dir = 1; }
            const tx = kid.pos.x + f.x * 2.2 + r.x * 2.6 * d.dir;
            const tz = kid.pos.z + f.z * 2.2 + r.z * 2.6 * d.dir;
            if (moveTo(p, tx, tz, d.leg === 0 ? 4 : 6.5, dt, 0.3)) {
                d.leg++;
                d.dir *= -1;
                spawnFx('💨', p.pos.x, p.pos.y + 0.5, p.pos.z, { size: 0.6, vy: 0.4 });
                if (d.leg > 6) { endTrick(p, true); return; }
            }
            if (p.st > 25) endTrick(p, false);
        },

        MATING_APPROACH(p, dt) {
            const m = p.mate;
            if (!m || m.mate !== p || (m.state !== 'MATING_APPROACH' && m.state !== 'MATING_JUMP')) { setState(p, 'WANDER'); return; }
            const meet = 0.9 + (petScale(p) + petScale(m)) * 0.35;
            if (dist2D(p.pos, m.pos) < meet) {
                setState(p, 'MATING_JUMP');
                setState(m, 'MATING_JUMP');
                sfxAt('love', p.pos);
                return;
            }
            moveTo(p, m.pos.x, m.pos.z, 2.6, dt, 0.1);
            if (Math.random() < dt) spawnFx('💘', p.pos.x, p.pos.y + 1.5 * petScale(p), p.pos.z, { size: 0.6 });
            if (p.st > 30) setState(p, 'WANDER');
        },

        MATING_JUMP(p, dt) {
            const m = p.mate;
            if (!m || m.mate !== p) { setState(p, 'WANDER'); return; }
            turnTo(p, Math.atan2(m.pos.x - p.pos.x, m.pos.z - p.pos.z), dt, 8);
            p.solid = false;
            const period = 0.4;
            const ph = (p.st % period) / period;
            p.hopH = Math.sin(ph * Math.PI) * 0.6 * Math.max(0.7, petScale(p));
            p.pose = 'hop';
            if (Math.random() < dt * 4) spawnFx(pick(['❤️', '💕', '💖']), p.pos.x, p.pos.y + 1.4 * petScale(p), p.pos.z, { size: 0.65 });
            if (p.st >= period * 10 && p.gender === 'F') giveBirth(p, m);
            else if (p.st > period * 16) setState(p, 'WANDER');
        },

        FOLLOW_PARENT(p, dt) {
            const par = p.parent;
            p.followParentTimer -= dt;
            if (!par || pets.indexOf(par) === -1 || p.followParentTimer <= 0) {
                p.parent = null; p.followParentTimer = 0;
                setState(p, 'WANDER');
                return;
            }
            const back = 0.9 + petScale(par) * 0.6;
            const side = (p.uid % 3 - 1) * 0.7;
            const tx = par.pos.x - Math.sin(par.yaw) * back + Math.cos(par.yaw) * side;
            const tz = par.pos.z - Math.cos(par.yaw) * back - Math.sin(par.yaw) * side;
            moveTo(p, tx, tz, Math.max(2.4, (par.moving ? par.moveSpeed : 0) * 1.15), dt, 0.3);
        },

        HOME(p, dt) {
            const d = p.data;
            p.solid = false;
            if (!kid) { setState(p, 'WANDER'); return; }
            const s = petScale(p);
            if (d.phase === 'toDoor') {
                const dq = house.L(0.6, house.D / 2 + 1.7);
                if (moveTo(p, dq.x, dq.z, 4.5, dt, 0.6)) d.phase = 'enter';
                else if (p.st > 30) { p.pos.set(dq.x, 0, dq.z); d.phase = 'enter'; }   // 走太久就直接到門口
                if (!kid.indoor && !(kid.task && kid.task.type === 'enterHome')) setState(p, 'WANDER');
                return;
            }
            if (d.phase === 'enter') {
                p.noCollide = true;
                const iq = house.L(0.6, house.D / 2 - 0.9);
                if (stepToward(p, iq.x, iq.z, 3.5, dt, 0.2)) { d.phase = 'in'; p.indoor = true; p.floor = 1; }
                p.pos.y += (house.Y1 - p.pos.y) * Math.min(1, dt * 10);
                return;
            }
            if (d.phase === 'leave') {
                p.noCollide = true;
                if (p.indoor) {
                    { const iq = house.L(0.6, house.D / 2 - 0.9); if (homeMoveTo(p, iq.x, iq.z, 1, 3.8, dt, 0.3)) p.indoor = false; }
                    return;
                }
                const oq = house.L(0.8, house.D / 2 + 1.8);
                if (stepToward(p, oq.x, oq.z, 3.5, dt, 0.2)) {
                    p.noCollide = false;
                    setState(p, 'WANDER', { idle: 1 });
                }
                return;
            }
            // 在家裡：跟著主人
            p.noCollide = true;
            if (!kid.indoor) { d.phase = 'leave'; return; }
            // 家裡有寵物碗：慢慢補充水分和飽足
            p.thirst = Math.max(0, p.thirst - dt * 2);
            p.hunger = Math.max(0, p.hunger - dt * 0.8);
            if (kid.lying || (kid.task && kid.task.type === 'hSleep' && kid.task.phase !== 'go')) {
                // 主人睡覺 → 睡在床邊的寵物小床
                const B = house.petBed;
                if (p.climb || p.floor !== 2 || Math.hypot(p.pos.x - B.x, p.pos.z - B.z) > 0.9) {
                    homeMoveTo(p, B.x, B.z, 2, 3, dt, 0.12);
                } else {
                    const k = Math.min(1, dt * 6);
                    p.pos.set(p.pos.x + (B.x - p.pos.x) * k, B.y, p.pos.z + (B.z - p.pos.z) * k);
                    p.pose = 'sleep';
                    turnTo(p, 0, dt, 3);
                    if (Math.random() < dt * 0.4) spawnFx('💤', p.pos.x + 0.2, p.pos.y + 0.9 * s, p.pos.z, { size: 0.5, vy: 0.4, life: 1.8 });
                }
                return;
            }
            const kf = kid.climb ? kid.climb.toFloor : kid.floor;
            const side = Math.sin(kid.yaw + Math.PI / 2), back = Math.cos(kid.yaw + Math.PI / 2);
            const tx = kid.pos.x + side * 1.0, tz = kid.pos.z + back * 1.0;
            const near = p.floor === kf && Math.hypot(p.pos.x - kid.pos.x, p.pos.z - kid.pos.z) < 1.6;
            if (!near || p.climb) homeMoveTo(p, tx, tz, kf, 3.6, dt, 0.4);
            else {
                p.pos.y = house.floorY(p.floor);
                turnTo(p, Math.atan2(kid.pos.x - p.pos.x, kid.pos.z - p.pos.z), dt, 4);
                p.pose = (kid.task && kid.task.type === 'hUse' && kid.task.id === 'sofa') ? 'sit' : 'idle';
                if (Math.random() < dt * 0.15) spawnFx(pick(['💕', '🎵']), p.pos.x, p.pos.y + 1.2 * s, p.pos.z, { size: 0.5 });
            }
        },

        BATH(p, dt) {
            const d = p.data, BA = world.bath;
            if (!p.spot && !reserveSpot(p, BA.spots, true)) { toast('🛁 浴缸滿了，等一下再洗喔'); setState(p, 'WANDER'); return; }
            const S = p.spot;
            const s = petScale(p);
            if (!d.phase) d.phase = 'go';
            if (d.phase === 'go') {
                // 走到浴缸旁邊
                if (moveTo(p, S.exit.x, S.exit.z, 3, dt, 0.5) || p.st > 30) { d.phase = 'climb'; d.t = 0; }
                return;
            }
            p.noCollide = true;
            p.solid = false;
            d.t += dt;
            if (d.phase === 'climb') {
                // 跳進浴缸
                if (!d.from) d.from = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
                const k = Math.min(1, d.t / 0.8);
                p.pos.set(d.from.x + (S.x - d.from.x) * k, d.from.y + (S.y - d.from.y) * k + Math.sin(k * Math.PI) * 0.7, d.from.z + (S.z - d.from.z) * k);
                p.pose = 'hop';
                turnTo(p, 0, dt, 6);
                if (k >= 1) { d.phase = 'soak'; d.t = 0; sfxAt('splash', p.pos); burst(p.pos.x, p.pos.y + 0.5, p.pos.z, ['💦'], 4, 0.5); }
            } else if (d.phase === 'soak' || d.phase === 'scrub' || d.phase === 'rinse') {
                p.pos.set(S.x, S.y, S.z);
                turnTo(p, 0, dt, 4);
                if (d.phase === 'soak') {
                    p.pose = 'sit';
                    if (d.t > 1.2) { d.phase = 'scrub'; d.t = 0; }
                } else if (d.phase === 'scrub') {
                    // 搓搓泡泡
                    p.pose = 'happy';
                    p.dirt = Math.max(0, p.dirt - dt * 35);
                    if (Math.random() < dt * 5) spawnFx(pick(['💦', '✨', '💭']), p.pos.x + rand(-0.4, 0.4), p.pos.y + rand(0.6, 1.1) * s, p.pos.z, { size: 0.5, vy: 0.8, life: 1 });
                    if (Math.random() < dt * 1.5) sfxAt('drink', p.pos);
                    if (d.t > 3.2) { d.phase = 'rinse'; d.t = 0; BA.showerT = 1.8; sfxAt('water', p.pos); }
                } else {
                    // 沖水
                    p.pose = 'sit';
                    p.dirt = 0;
                    if (Math.random() < dt * 6) spawnFx('💧', p.pos.x + rand(-0.3, 0.3), p.pos.y + 1.3 * s, p.pos.z, { size: 0.5, vy: -1.2, life: 0.8 });
                    if (d.t > 1.8) { d.phase = 'out'; d.t = 0; d.from = null; }
                }
            } else if (d.phase === 'out') {
                // 跳出浴缸
                if (!d.from) d.from = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
                const k = Math.min(1, d.t / 0.8);
                p.pos.set(d.from.x + (S.exit.x - d.from.x) * k, d.from.y + (BA.deckY - d.from.y) * k + Math.sin(k * Math.PI) * 0.7, d.from.z + (S.exit.z - d.from.z) * k);
                p.pose = 'hop';
                if (k >= 1) {
                    d.phase = 'shake'; d.t = 0;
                    burst(p.pos.x, p.pos.y + 0.7 * s, p.pos.z, ['💦', '💦', '✨'], 8, 0.8);
                    sfxAt('splash', p.pos);
                }
            } else if (d.phase === 'shake') {
                // 甩甩身體，變得香噴噴
                p.pose = 'happy';
                if (d.t > 1.3) {
                    p.dirt = 0;
                    p.boredom = Math.max(0, p.boredom - 15);
                    burst(p.pos.x, p.pos.y + 1.2 * s, p.pos.z, ['✨', '🌟', '💖'], 6, 0.7);
                    sfxAt('sparkle', p.pos);
                    petSay(p, true);
                    track('bath');
                    addCoins(2, p.pos);
                    p.noCollide = false;
                    setState(p, 'LOVED', { t: 1.2 });
                }
            }
        },

        FETCH(p, dt) {
            const T = activeToy;
            if (!T || isNight || !kid) { setState(p, 'WANDER'); return; }
            const s = petScale(p);
            if (T.carrier && T.carrier !== p) {
                // 被別隻搶先撿到了 → 跟在後面跑一下
                p.data.lost = (p.data.lost || 0) + dt;
                moveTo(p, T.carrier.pos.x, T.carrier.pos.z, 3.5, dt, 1.5);
                if (p.data.lost > 2.5) setState(p, 'WANDER', { idle: rand(0.5, 1.5) });
                return;
            }
            if (T.carrier === p) {
                // 叼著玩具跑回主人身邊
                const fx = kid.pos.x + Math.sin(kid.yaw) * 1.4, fz = kid.pos.z + Math.cos(kid.yaw) * 1.4;
                if (moveTo(p, fx, fz, 4.2, dt, 0.9) || dist2D(p.pos, kid.pos) < 1.6 + s * 0.4) {
                    returnToy(null);
                    burst(p.pos.x, p.pos.y + 1.2 * s, p.pos.z, ['❤️', '💖', '⭐', '🎾'], 6, 0.7);
                    p.boredom = Math.max(0, p.boredom - 40);
                    kid.cheerT = 1.6;
                    spawnFx('🥰', kid.pos.x, kid.pos.y + 2.5 * kidScale(), kid.pos.z);
                    petSay(p, true);
                    sfxAt('sparkle', p.pos);
                    track('fetch');
                    addCoins(2, p.pos);
                    setState(p, 'LOVED', { t: 1.6 });
                    return;
                }
                if (p.st > 40) { T.phase = 'ground'; T.to = { x: p.pos.x, z: p.pos.z }; T.carrier = null; T.groundT = 0; setState(p, 'WANDER'); }
                return;
            }
            // 衝過去撿 (玩具還在空中就先往落點跑)
            const reach = 0.55 + 0.25 * s;
            const got = moveTo(p, T.to.x, T.to.z, 5.8, dt, reach);
            if (got && T.phase === 'ground') {
                T.carrier = p;
                T.phase = 'carried';
                p.st = 0;
                sfxAt('boing', p.pos);
                spawnFx(T.type === 'frisbee' ? '🥏' : '🎾', p.pos.x, p.pos.y + 1.6 * s, p.pos.z, { size: 0.6 });
            } else if (got) {
                // 飛盤還沒落地 → 原地跳起來接
                p.hopH = Math.abs(Math.sin(p.st * 8)) * 0.6 * Math.max(0.7, s);
                p.pose = 'hop';
                turnTo(p, Math.atan2(T.mesh.position.x - p.pos.x, T.mesh.position.z - p.pos.z), dt, 8);
            }
            if (p.st > 25) setState(p, 'WANDER');
        },

        BEING_SENT(p) {
            p.pose = 'happy';
            p.solid = false;
            p.noCollide = true;
        },
    };

    function giveBirth(mom, dad) {
        mom.mate = null; dad.mate = null;
        mom.breedCooldown = BREED_COOLDOWN; dad.breedCooldown = BREED_COOLDOWN;
        const sameSpecies = pets.filter(x => x.id === mom.id).length;
        if (pets.length < MAX_PETS && sameSpecies < MAX_PER_SPECIES) {
            const bx = (mom.pos.x + dad.pos.x) / 2 + rand(-0.4, 0.4);
            const bz = (mom.pos.z + dad.pos.z) / 2 + 0.6;
            // 稀有顏色：爸媽是稀有色有 35% 機率遺傳，不然 10% 機率出現
            let variant = null;
            const parentV = [mom.variant, dad.variant].filter(Boolean);
            if (parentV.length && Math.random() < 0.35) variant = pick(parentV);
            else if (Math.random() < 0.10) variant = pick(Object.keys(PetModels.VARIANTS));
            const baby = createPet(mom.id, { x: bx, z: bz, age: 0, hunger: 10, thirst: 0, boredom: 0, bladder: 0, toiletCooldown: 120, trickTimer: 120, variant });
            track('baby');
            if (variant) {
                const V = PetModels.VARIANTS[variant];
                track('rare');
                setTimeout(() => { toast(`✨ 哇！是稀有的${V.name}${baby.name}！`); addCoins(30, baby.pos, '稀有寶寶'); burst(baby.pos.x, 1.4, baby.pos.z, ['✨', '🌟', V.icon], 12, 1.2); }, 1500);
            }
            baby.parent = mom;
            baby.followParentTimer = 60;
            setState(baby, 'FOLLOW_PARENT');
            burst(bx, 1.2, bz, ['❤️', '💖', '🌟', '✨', '🥰', '🎉', '🎊', '🎀', '🍼'], 14, 1.5);
            showBirthBanner(mom, dad, baby);
            Audio3D.sfx('fanfare');
            addCoins(15, baby.pos, '新寶寶誕生了');
            setTimeout(() => { if (pets.indexOf(baby) !== -1) petSay(baby, true); }, 1100);
        } else {
            burst(mom.pos.x, 1.2, mom.pos.z, ['❤️', '💖'], 5, 1);
            toast('樂園滿了，這次沒有生寶寶喔 🏡');
        }
        setState(mom, 'WANDER', { idle: 1 });
        setState(dad, 'WANDER', { idle: 1 });
    }

    // 配對：同種、一公一母、成年、狀態良好
    // 談戀愛的條件 (同時給資訊卡顯示原因用)
    const BREED_HUNGER = 90, BREED_THIRST = 90;
    const BREED_READY_STATES = { WANDER: 1, LOVED: 1 };
    function breedStatus(p) {
        if (!p.isAdult) return { ok: false, text: `🍼 還沒長大（${Math.floor(p.age / ADULT_AGE * 100)}%），成年後才能談戀愛` };
        if (p.mate) return { ok: true, text: '💘 正在談戀愛！' };
        if (p.breedCooldown > 0) return { ok: false, text: `💤 剛當爸媽，休息中（${Math.ceil(p.breedCooldown / 60)} 分鐘）` };
        const other = p.gender === 'M' ? 'F' : 'M';
        if (!pets.some(x => x !== p && x.id === p.id && x.gender === other)) {
            return { ok: false, text: `💔 樂園裡沒有${p.gender === 'M' ? '女生' : '男生'}${p.name}，再領養一隻吧` };
        }
        if (!pets.some(x => x !== p && x.id === p.id && x.gender === other && x.isAdult)) return { ok: false, text: `⏳ 另一半還沒長大，再等一下` };
        if (pets.filter(x => x.id === p.id).length >= MAX_PER_SPECIES) return { ok: false, text: `🏡 這種動物已經 ${MAX_PER_SPECIES} 隻，住滿了` };
        if (pets.length >= MAX_PETS) return { ok: false, text: '🏡 樂園滿了，沒有空間生寶寶' };
        if (p.hunger > BREED_HUNGER) return { ok: false, text: '🍖 肚子太餓了，餵飽才會想談戀愛' };
        if (p.thirst > BREED_THIRST) return { ok: false, text: '💧 太渴了，水槽記得加水' };
        return { ok: true, text: '💕 準備好談戀愛了！' };
    }

    // 配對：同種、一公一母、成年、吃飽喝足
    let breedHintAt = {};
    function breedingCheck() {
        if (pets.length >= MAX_PETS) return;
        const groups = {};
        pets.forEach(p => {
            if (!p.isAdult || p.breedCooldown > 0 || p.mate) return;
            const g = (groups[p.id] = groups[p.id] || { M: [], F: [], hungry: 0, thirsty: 0 });
            if (p.hunger > BREED_HUNGER) { g.hungry++; return; }
            if (p.thirst > BREED_THIRST) { g.thirsty++; return; }
            if (!BREED_READY_STATES[p.state]) return;   // 正在玩、吃、睡的先不打擾
            g[p.gender].push(p);
        });
        Object.keys(groups).forEach(id => {
            const g = groups[id];
            const hasPair = pets.some(x => x.id === id && x.isAdult && x.gender === 'M') && pets.some(x => x.id === id && x.isAdult && x.gender === 'F');
            // 有一對但是太餓 / 太渴 → 提醒玩家 (每種動物 3 分鐘提醒一次)
            if (hasPair && (g.hungry || g.thirsty) && (!g.M.length || !g.F.length)) {
                if (!breedHintAt[id] || elapsed - breedHintAt[id] > 180) {
                    breedHintAt[id] = elapsed;
                    const name = PET_BY_ID[id].name;
                    toast(g.hungry ? `💕 ${name}們想談戀愛，但肚子太餓了，先餵牠們愛吃的食物吧！` : `💕 ${name}們想談戀愛，但太渴了，記得幫水槽加水！`);
                }
            }
            if (!g.M.length || !g.F.length) return;
            if (pets.filter(x => x.id === id).length >= MAX_PER_SPECIES) return;
            if (Math.random() > 0.7) return;
            const a = pick(g.M), b = pick(g.F);
            setState(a, 'MATING_APPROACH');
            setState(b, 'MATING_APPROACH');
            a.mate = b; b.mate = a;
            spawnFx('💘', a.pos.x, a.pos.y + 1.6 * petScale(a), a.pos.z);
            spawnFx('💘', b.pos.x, b.pos.y + 1.6 * petScale(b), b.pos.z);
        });
    }

    function updatePet(p, dt) {
        p.st += dt;
        if (!p.isAdult) {
            p.age += dt;
            if (p.age >= ADULT_AGE) {
                p.isAdult = true;
                p.age = ADULT_AGE;
                burst(p.pos.x, p.pos.y + 1.4, p.pos.z, ['🌟', '✨', '🎉'], 5, 0.6);
                toast(`🌟 ${petName(p)} 長大了！`);
                sfxAt('levelup', p.pos);
                addCoins(10, p.pos);
            }
        }
        if (p.state !== 'BEING_SENT') {
            const m = isNight ? 0.25 : 1;
            p.thirst = Math.min(100, p.thirst + dt * (100 / 240) * m);
            p.boredom = Math.min(100, p.boredom + dt * (100 / 90) * m);
            p.hunger = Math.min(100, p.hunger + dt * (100 / 720) * m);
            if (p.state !== 'BATH') {
                p.dirt = Math.min(100, p.dirt + dt * (100 / 900) * m);
                if (weather.rainAmt > 0.3 && !inDen(p.pos)) p.dirt = Math.min(100, p.dirt + dt * 0.5 * weather.rainAmt);
            }
            if (p.toiletCooldown > 0) p.toiletCooldown -= dt;
            else p.bladder = Math.min(100, p.bladder + dt * (100 / 120) * m);
            if (p.trickTimer > 0) p.trickTimer -= dt;
            if (p.breedCooldown > 0) p.breedCooldown -= dt;
        }
        // 偶爾自己叫一聲 (只有在畫面裡、醒著的時候)
        p.voiceT = (p.voiceT === undefined ? rand(5, 40) : p.voiceT) - dt;
        if (p.voiceT <= 0) {
            p.voiceT = rand(25, 60);
            if (!isNight && p.state !== 'SLEEP' && p.state !== 'BEING_SENT' && spatial(p.pos).onScreen) petSay(p);
        }
        p.moving = false;
        p.solid = true;
        p.pose = 'idle';
        p.hopH = 0;
        p.radius = 0.35 + petScale(p) * 0.3;
        // 夜晚：大家都去睡覺 (正在溜滑梯、坐摩天輪的會先玩完)
        if (isNight && p.state !== 'SLEEP' && p.state !== 'BEING_SENT' && p.state !== 'HOME' && !(p.act && p.act.locked) && !(p.uid === favoriteUid && kid && kid.indoor)) setState(p, 'SLEEP');
        STATES[p.state](p, dt);
        if (p.moving && !p.noCollide) {
            if (!p.wd) p.wd = { x: p.pos.x, z: p.pos.z, t: 0 };
            p.wd.t += dt;
            if (p.wd.t > 1.5) {
                if (Math.hypot(p.pos.x - p.wd.x, p.pos.z - p.wd.z) < 0.35) {
                    const t = { x: p.pos.x + rand(-2.2, 2.2), z: p.pos.z + rand(-2.2, 2.2) };
                    world.resolveObstacles(t, p.radius);
                    p.detour = { x: t.x, z: t.z, t: 1 };
                    p.repath = 0;
                }
                p.wd = { x: p.pos.x, z: p.pos.z, t: 0 };
            }
        } else p.wd = null;
        // 地面高度
        if (!p.noCollide && p.state !== 'BEING_SENT') {
            const gy = groundY(p.pos.x, p.pos.z);
            p.pos.y += (gy - p.pos.y) * Math.min(1, dt * 12);
        }
    }

    // 寵物互相推開，不重疊
    function separate() {
        const list = pets.filter(p => p.solid && !p.noCollide);
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
                const d = Math.hypot(dx, dz);
                const min = (a.radius + b.radius) * 0.85;
                if (d < min && d > 0.0001) {
                    const push = (min - d) / 2;
                    a.pos.x -= dx / d * push; a.pos.z -= dz / d * push;
                    b.pos.x += dx / d * push; b.pos.z += dz / d * push;
                }
            }
            if (kid && !kid.noCollide && !kid.indoor) {
                const dx = a.pos.x - kid.pos.x, dz = a.pos.z - kid.pos.z;
                const d = Math.hypot(dx, dz);
                const min = a.radius + 0.45;
                if (d < min && d > 0.0001 && !TRICKS[a.state]) {
                    // 互相推開 (動物 60%、主人 40%)，才不會被主人卡死在牆邊
                    const push = min - d;
                    a.pos.x += dx / d * push * 0.6;
                    a.pos.z += dz / d * push * 0.6;
                    const kidFree = !(kid.task && (kid.task.act || kid.task.type === 'sit'));
                    if (kidFree) {
                        kid.pos.x -= dx / d * push * 0.4;
                        kid.pos.z -= dz / d * push * 0.4;
                        world.resolveObstacles(kid.pos, kid.radius);
                    }
                }
            }
            world.resolveObstacles(a.pos, a.radius);
        }
    }

    function applyPetVisual(p, dt) {
        const s = petScale(p);
        p.model.visible = !(p.indoor && houseMode && !p.climb && p.floor !== house.viewFloor);
        p.model.position.set(p.pos.x, p.pos.y + p.hopH, p.pos.z);
        p.model.rotation.y = p.yaw;
        p.model.scale.setScalar(s);
        p.proxy.scale.setScalar(Math.max(0.85, s) / s);
        // 接觸陰影：跳起來時變小變淡
        p.blob.visible = p.state !== 'BEING_SENT';
        const lift = Math.min(1, p.hopH * 0.8);
        p.blob.position.set(p.pos.x, p.pos.y + 0.03, p.pos.z);
        p.blob.scale.setScalar(s * 1.5 * (1 - lift * 0.4));
        p.blob.material.opacity = 0.55 * (1 - lift * 0.6);
        const blobsOn = Math.floor((p.dirt || 0) / 20);
        p.dirtBlobs.forEach((b, i) => { b.visible = i < blobsOn; });
        if (p.dirt > 85 && p.state !== 'SLEEP' && Math.random() < dt * 0.6) spawnFx('💨', p.pos.x + rand(-0.3, 0.3), p.pos.y + 1.2 * s, p.pos.z, { size: 0.45, vy: 0.5, life: 1.1 });
        if (p.variant === 'gold' && Math.random() < dt * 0.8) spawnFx('✨', p.pos.x + rand(-0.4, 0.4), p.pos.y + rand(0.5, 1.4) * s, p.pos.z, { size: 0.45, vy: 0.6, life: 1 });
        // 睡在小床上 → 蓋小被子 (頭露出來)
        if (p.state === 'SLEEP' && p.data.at && p.spot && p.spot.blanket) {
            const b = p.spot.blanket;
            b.visible = true;
            b.position.set(p.pos.x - Math.sin(p.yaw) * 0.14 * s, p.pos.y + 0.24 * s, p.pos.z - Math.cos(p.yaw) * 0.14 * s);
            b.rotation.y = p.yaw;
            b.scale.set(0.62 * s, 0.6 * s, 0.6 * s);
        }
        let pose = p.pose;
        if (p.moving && pose === 'idle') pose = p.moveSpeed > 4 ? 'run' : 'walk';
        animateRig(p.rig, pose, dt, p.moveSpeed / Math.max(0.5, s));

        // 名牌
        p.label.visible = (showLabels || p === selectedPet) && p.model.visible;
        if (p.label.visible) {
            const h = (LABEL_H[p.rig.type] || 1.5) * s;
            p.label.position.set(p.pos.x, p.pos.y + p.hopH + h + 0.45, p.pos.z);
            const ls = clamp(cam.dist / 45, 0.6, 2.0);
            p.label.scale.set(2.6 * ls, 0.6 * ls, 1);
            drawLabel(p.label, (p.uid === favoriteUid ? '💛' : '') + (p.variant ? PetModels.VARIANTS[p.variant].icon : '') + petName(p) + (p.gender === 'M' ? '♂' : '♀'), statusIcon(p), p.gender === 'M' ? '#2a6fd6' : '#d6407a');
        }
    }

    function statusIcon(p) {
        switch (p.state) {
            case 'SLEEP': return '💤';
            case 'TOILET': return '🚽';
            case 'DRINK': return '💧';
            case 'EAT': return '🍽️';
            case 'PLAY': return '🎠';
            case 'MATING_APPROACH': case 'MATING_JUMP': return '💘';
            case 'FOLLOW_PARENT': return '👣';
            case 'FETCH': return '🎾';
            case 'BATH': return '🛁';
            case 'HOME': return '🏠';
            case 'CIRCLE_KID': case 'JUMP_KID': case 'ZIGZAG_KID': return '💞';
        }
        if (p.thirst > 80) return '💧';
        if (p.hunger > 75) return '🍽️';
        if (p.bladder > 80) return '🚽';
        if (p.boredom > 80) return '🎈';
        if (p.dirt > 75) return '🛁';
        if (!p.isAdult) return '🍼';
        return '';
    }

    function moodOf(p) {
        const m = 100 - p.hunger * 0.32 - p.thirst * 0.32 - p.boredom * 0.13 - p.bladder * 0.12 - (p.dirt || 0) * 0.11;
        return clamp(Math.round(m), 0, 100);
    }

    // ---------------------------------------------------------
    //  主人 (小朋友)
    // ---------------------------------------------------------
    function createKid(id, x, z) {
        const model = buildKid(id);
        scene.add(model);
        const label = makeLabel();
        // 雨傘 (下雨時自動撐起來)
        const umbrella = PetModels.buildUmbrella();
        umbrella.position.set(-0.32, 0.72, 0.12);
        umbrella.visible = false;
        model.add(umbrella);
        kid = {
            id, label: KID_BY_ID[id].label, isKid: true,
            pos: new THREE.Vector3(x !== undefined ? x : 0, 0, z !== undefined ? z : 3),
            yaw: 0, model, rig: model.userData.rig, nameSprite: label, blob: addBlob(),
            task: null, pose: 'idle', moving: false, moveSpeed: 0, cheerT: 0,
            radius: 0.45, uid: 0, noCollide: false,
            umbrella, held: null, balloon: null,
        };
    }
    function replaceKid(id) {
        const x = kid ? kid.pos.x : 0, z = kid ? kid.pos.z : 3;
        const wasIndoor = kid && kid.indoor, floor = kid ? kid.floor : 0, y = kid ? kid.pos.y : 0, yaw = kid ? kid.yaw : 0;
        const held = kid && kid.held ? kid.held.type : null;
        const balloonT = kid && kid.balloon ? kid.balloon.t : 0;
        if (kid) {
            cancelKidTask();
            scene.remove(kid.blob);
            scene.remove(kid.model);
            disposeLabel(kid.nameSprite);
        }
        createKid(id, x, z);
        if (wasIndoor) { kid.indoor = true; kid.floor = floor; kid.noCollide = true; kid.pos.y = y; kid.yaw = yaw; }
        if (held) giveKidItem(held);
        if (balloonT > 0) { giveKidItem('balloon'); kid.balloon.t = balloonT; }
        burst(x, 2, z, ['✨', '🌟'], 6, 0.8);
    }
    function kidScale() { return PetModels.KID_SPECS[kid.id].scale * 1.1; }

    // 主人拿著的點心 / 氣球
    function giveKidItem(type) {
        if (type === 'balloon') {
            if (kid.balloon) kid.model.remove(kid.balloon.model);
            const m = PetModels.buildHeldItem('balloon');
            m.position.set(0.36, 0.72, 0.12);
            kid.model.add(m);
            kid.balloon = { model: m, t: 240 };
            return;
        }
        if (kid.held) kid.held.model.parent.remove(kid.held.model);
        const m = PetModels.buildHeldItem(type);
        m.position.set(0, -0.44, 0.07);
        kid.rig.arms[1].add(m);
        kid.held = { type, model: m, t: 22, bite: 0 };
    }

    function updateKid(dt) {
        kid.moving = false;
        kid.pose = 'idle';
        const t = kid.task;
        if (t) {
            if (t.type === 'walk') {
                if (moveTo(kid, t.x, t.z, 5, dt, 0.12)) kid.task = null;
            } else if (t.type === 'water') {
                const F = world.troughFill;
                if (!t.at) {
                    if (moveTo(kid, F.x, F.z, 5, dt, 0.2)) { t.at = true; t.t = 0; sfxAt('water', kid.pos); }
                } else {
                    t.t += dt;
                    kid.pose = 'happy';
                    turnTo(kid, -Math.PI / 2, dt);
                    waterLevel = Math.min(100, waterLevel + 60 * dt);
                    if (Math.random() < dt * 8) spawnFx('💦', LAYOUT.trough.x + rand(-3.5, 3.5), 1.0, LAYOUT.trough.z + rand(-0.4, 0.4), { size: 0.7, vy: 1 });
                    if (t.t > 1.5 && waterLevel >= 100) {
                        kid.task = null;
                        waterWarned = false;
                        toast('💧 水槽加滿了！');
                        track('water');
                    }
                }
            } else if (t.type === 'play') {
                const r = stepActivity(kid, t.act, dt);
                if (r === 'loop') {
                    t.loops--;
                    if (t.loops <= 0) { releaseAct(kid, t.act); kid.task = null; track('kidPlay'); }
                } else if (r === 'done') {
                    releaseAct(kid, t.act); kid.task = null;
                    track('kidPlay');
                    spawnFx('😆', kid.pos.x, 2.6, kid.pos.z);
                } else if (r === 'giveup') {
                    releaseAct(kid, t.act); kid.task = null;
                    toast('摩天輪客滿了，等一下再來吧！');
                }
            } else if (t.type === 'sit') {
                // 坐在長椅上
                const B = t.bench;
                if (!t.at) {
                    if (moveTo(kid, B.front.x, B.front.z, 5, dt, 0.2)) { t.at = true; t.k = 0; sfxAt('sit', kid.pos); track('sit'); }
                } else {
                    kid.noCollide = true;
                    t.k = Math.min(1, t.k + dt * 3);
                    kid.pos.x += (B.seat.x - kid.pos.x) * t.k;
                    kid.pos.z += (B.seat.z - kid.pos.z) * t.k;
                    const sy = B.seatY + 0.06 - 0.6 * kidScale();
                    kid.pos.y += (sy - kid.pos.y) * t.k;
                    turnTo(kid, B.yaw, dt, 10);
                    kid.pose = 'benchsit';
                    if (Math.random() < dt * 0.12) spawnFx(pick(['🎵', '😊', '☺️']), kid.pos.x, kid.pos.y + 2.2, kid.pos.z, { size: 0.6 });
                }
            } else if (t.type === 'shop') {
                const S = world.shop;
                if (!t.at) {
                    if (moveTo(kid, S.stand.x, S.stand.z, 5, dt, 0.25)) {
                        t.at = true;
                        S.wave = 2.5;
                        Audio3D.sfx('ding');
                        openShop();
                    }
                } else {
                    turnTo(kid, Math.PI, dt);
                    if (!shopOpen) kid.task = null;
                }
            } else if (t.type === 'enterHome') {
                // 走到門口 → 開門 → 走進屋裡
                if (t.phase === 'walk') {
                    if (moveTo(kid, house.doorOut.x, house.doorOut.z, 5, dt, 0.3)) { t.phase = 'door'; t.t = 0; house.doorTarget = 1; Audio3D.sfx('click'); }
                } else if (t.phase === 'door') {
                    t.t += dt;
                    turnTo(kid, Math.PI + house.rot, dt);
                    if (t.t > 0.4) { t.phase = 'in'; kid.noCollide = true; }
                } else if (t.phase === 'in') {
                    if (stepToward(kid, house.doorIn.x, house.doorIn.z, 3.5, dt, 0.15)) {
                        kid.indoor = true; kid.floor = 1; kid.noCollide = true;
                        kid.task = null;
                        house.doorTarget = 0;
                        enterHouseView();
                    }
                    kid.pos.y += (house.Y1 - kid.pos.y) * Math.min(1, dt * 10);
                }
            } else if (t.type === 'exitHome') {
                if (t.phase === 'walk') {
                    if (homeMoveTo(kid, house.doorIn.x, house.doorIn.z, 1, 4, dt, 0.25)) { t.phase = 'door'; t.t = 0; house.doorTarget = 1; Audio3D.sfx('click'); }
                } else if (t.phase === 'door') {
                    t.t += dt;
                    turnTo(kid, house.rot, dt);
                    if (t.t > 0.4) { t.phase = 'out'; exitHouseView(); }
                } else if (t.phase === 'out') {
                    if (stepToward(kid, house.doorOut.x, house.doorOut.z, 3.5, dt, 0.15)) {
                        kid.indoor = false; kid.noCollide = false; kid.floor = 0;
                        kid.task = null;
                        house.doorTarget = 0;
                    }
                }
            } else if (t.type === 'hWalk') {
                if (homeMoveTo(kid, t.x, t.z, t.floor, 4, dt, 0.15)) kid.task = null;
            } else if (t.type === 'hUse') {
                updateFurnitureUse(t, dt);
            } else if (t.type === 'hSleep') {
                updateSleep(t, dt);
            } else if (t.type === 'bathHelp') {
                const BA = world.bath;
                if (!t.at) {
                    if (moveTo(kid, BA.stand.x, BA.stand.z, 5, dt, 0.3)) t.at = true;
                } else {
                    turnTo(kid, Math.PI, dt);
                    const busy = pets.some(p => p.state === 'BATH' && p.data.phase && p.data.phase !== 'go');
                    if (busy) kid.pose = 'happy';
                    if (!pets.some(p => p.state === 'BATH')) kid.task = null;
                }
            } else if (t.type === 'feed') {
                const F = world.feeder;
                if (!t.at) {
                    if (moveTo(kid, F.stand.x, F.stand.z, 5, dt, 0.25)) { t.at = true; t.t = 0; }
                } else {
                    t.t += dt;
                    turnTo(kid, Math.atan2(F.x - kid.pos.x, F.z - kid.pos.z), dt, 10);
                    if (t.t > 0.35 && !t.done) {
                        t.done = true;
                        world.feedFish(9);
                        track('fishFeed');
                        sfxAt('crank', F);
                        setTimeout(() => sfxAt('splash', F), 650);
                        feedCooldown = 3;
                        spawnFx('🐟', F.x, 2.8, F.z);
                    }
                    kid.pose = t.t < 1 ? 'happy' : 'idle';
                    if (t.t > 1.6) kid.task = null;
                }
            }
        }
        if (kid.cheerT > 0) {
            kid.cheerT -= dt;
            if (!kid.moving && !(kid.task && (kid.task.act || kid.task.type === 'sit'))) kid.pose = 'happy';
        }
        if (!kid.noCollide && !kid.indoor) {
            const gy = groundY(kid.pos.x, kid.pos.z);
            kid.pos.y += (gy - kid.pos.y) * Math.min(1, dt * 12);
        }
        // 套用外觀 (躺在床上時整個人轉成平躺)
        kid.model.position.copy(kid.pos);
        kid.blob.position.set(kid.pos.x, Math.max(0, kid.pos.y) + 0.03, kid.pos.z);
        kid.blob.scale.setScalar(1.3 * kidScale());
        kid.blob.visible = !kid.lying && (kid.indoor ? !kid.climb : kid.pos.y < 0.5);
        kid.model.rotation.order = 'YXZ';
        kid.model.rotation.set(kid.lying ? -Math.PI / 2 : 0, kid.yaw, 0);
        // 在家裡看別的樓層時，主人先隱藏
        kid.model.visible = !(houseMode && kid.indoor && !kid.climb && kid.floor !== house.viewFloor);
        let pose = kid.pose;
        if (kid.moving && pose === 'idle') pose = 'walk';
        animateRig(kid.rig, pose, dt, kid.moveSpeed);

        // 配件：下雨撐傘 (坐遊樂設施時收起來)
        const onRide = kid.task && kid.task.act && kid.task.act.locked;
        kid.umbrella.visible = weather.rainAmt > 0.25 && !onRide && !kid.indoor && !kid.lying;
        if (kid.umbrella.visible) kid.rig.arms[0].rotation.set(-0.55, 0, 0.1);
        if (kid.held) {
            kid.held.t -= dt;
            kid.held.bite -= dt;
            if (kid.held.bite <= 0) kid.held.bite = 2.6;
            const biting = kid.held.bite > 2.0;
            if (!onRide) kid.rig.arms[1].rotation.set(biting ? -2.2 : -0.7, 0, biting ? 0.35 : 0.15);
            if (biting && Math.random() < dt * 2) spawnFx(pick(['😋', '✨']), kid.pos.x, kid.pos.y + 2.3 * kidScale(), kid.pos.z, { size: 0.5 });
            if (kid.held.t <= 0) {
                kid.held.model.parent.remove(kid.held.model);
                kid.held = null;
                spawnFx('😊', kid.pos.x, kid.pos.y + 2.4, kid.pos.z);
            }
        }
        if (kid.balloon) {
            kid.balloon.t -= dt;
            const ball = kid.balloon.model.userData.ball;
            ball.position.x = Math.sin(elapsed * 1.3) * 0.12;
            ball.position.z = Math.cos(elapsed * 1.1) * 0.1;
            ball.rotation.z = Math.sin(elapsed * 1.3) * 0.15;
            if (kid.balloon.t <= 0) {
                // 氣球飛走了
                const wp = new THREE.Vector3();
                ball.getWorldPosition(wp);
                spawnFx('🎈', wp.x, wp.y, wp.z, { vy: 2.5, life: 3, size: 1.2 });
                kid.model.remove(kid.balloon.model);
                kid.balloon = null;
            }
        }

        kid.nameSprite.visible = showLabels;
        const ks = kidScale();
        kid.nameSprite.position.set(kid.pos.x, kid.pos.y + 1.95 * ks + 0.45 + (kid.umbrella.visible ? 0.8 : 0), kid.pos.z);
        const ls = clamp(cam.dist / 45, 0.6, 2.0);
        kid.nameSprite.scale.set(2.6 * ls, 0.6 * ls, 1);
        drawLabel(kid.nameSprite, '⭐ ' + kid.label, '', '#b85c00');
    }

    function kidBusyLocked() { return kid && kid.task && kid.task.act && kid.task.act.locked; }
    function cancelKidTask() {
        const t = kid.task;
        if (t && t.act) releaseAct(kid, t.act);
        if (t && t.type === 'sit') {
            // 從長椅站起來
            t.bench.occupant = null;
            kid.noCollide = false;
            kid.pos.set(t.bench.front.x, 0, t.bench.front.z);
        }
        if (t && t.type === 'shop' && shopOpen) closeShop();
        if (t && t.type === 'hUse') {
            if (t.id === 'sofa' && house.tv.on) { house.setTv(false); const s = house.furnById('sofa').stand; kid.pos.set(s.x, house.Y1, s.z); }
            if (t.id === 'fridge') t.f.door.rotation.y = 0;
        }
        if (t && t.type === 'hSleep' && kid.lying) {
            kid.lying = false;
            t.f.bedQuilt.visible = false; t.f.quilt.visible = true;
            kid.pos.set(t.f.stand.x, house.Y2, t.f.stand.z);
            hideSleepOverlay();
        }
        kid.task = null;
        kid.path = null;
    }
    function kidCheckBusy() {
        if (kidBusyLocked()) { toast('主人正在玩，玩完就回來囉！'); return true; }
        if (kid.task && (kid.task.type === 'enterHome' || kid.task.type === 'exitHome')) return true;
        if (kid.indoor) { toast('🏠 主人在家裡，先按「🚪 出門」喔'); return true; }
        return false;
    }
    function kidWalkTo(x, z) {
        if (kidCheckBusy()) return;
        cancelKidTask();
        const t = { x: clamp(x, BOUNDS.minX + 0.5, BOUNDS.maxX - 0.5), z: clamp(z, BOUNDS.minZ + 0.5, BOUNDS.maxZ - 0.5) };
        world.resolveObstacles(t, 0.5);
        kid.task = { type: 'walk', x: t.x, z: t.z };
        showClickMarker(t.x, t.z);
    }
    function kidPlay(kind) {
        if (kidCheckBusy()) return;
        if (isNight) { toast('🌙 晚上了，設施休息中，明天再玩吧！'); return; }
        let act;
        if (kind === 'swing') {
            act = newSwingAct(kid);
            if (!act) { toast('鞦韆都有人在盪，等一下喔！'); return; }
        }
        if (kind === 'tramp') {
            act = newTrampAct(kid);
            if (!act) { toast('彈跳床都有人在跳，等一下喔！'); return; }
        }
        cancelKidTask();
        if (kind === 'swing' || kind === 'tramp') kid.task = { type: 'play', act, loops: 1 };
        else kid.task = { type: 'play', act: kind === 'ferris' ? newFerrisAct() : newSlideAct(), loops: 2 };
        toast(kind === 'ferris' ? '🎡 主人去坐摩天輪！' : kind === 'swing' ? '🪁 主人去盪鞦韆！' : kind === 'tramp' ? '🤸 主人去跳彈跳床！' : '🛝 主人去溜滑梯！');
    }
    function kidAddWater() {
        if (kidCheckBusy()) return;
        if (waterLevel >= 99.5) { toast('水槽已經是滿的喔！'); return; }
        cancelKidTask();
        kid.task = { type: 'water' };
    }
    function kidSit(bench) {
        if (kidCheckBusy()) return;
        if (kid.task && kid.task.type === 'sit' && kid.task.bench === bench) return;
        if (bench.occupant && bench.occupant !== kid) { toast('這張椅子有人坐了'); return; }
        cancelKidTask();
        bench.occupant = kid;
        kid.task = { type: 'sit', bench };
    }
    function kidGoShop() {
        if (kidCheckBusy()) return;
        if (kid.task && kid.task.type === 'shop') { if (!shopOpen) openShop(); return; }
        cancelKidTask();
        kid.task = { type: 'shop' };
        toast('🏪 主人去小吃店逛逛～');
    }
    let feedCooldown = 0;
    function kidFeedFish() {
        if (kidCheckBusy()) return;
        if (feedCooldown > 0 || (kid.task && kid.task.type === 'feed')) { toast('魚兒還在吃，等一下再餵喔 🐟'); return; }
        cancelKidTask();
        kid.task = { type: 'feed' };
    }

    // =========================================================
    //  小主人的家
    // =========================================================
    let houseMode = false;          // 鏡頭在屋裡 (娃娃屋切開)
    let camSaved = null, camAnim = null;
    let favoriteUid = null;         // 會跟著回家的最愛寵物
    let sleptHome = false;          // 昨晚在家睡覺 → 零用錢加倍
    let fridgeDay = 0;              // 冰箱點心一天拿一次

    // 室內走路 (會擋牆、家具)
    function stepIndoor(ent, tx, tz, speed, dt, arrive) {
        // 用格子找路繞過家具；目標或樓層改變、或卡住時重新找
        const hp = ent.hPath;
        if (!hp || hp.tx !== tx || hp.tz !== tz || hp.floor !== ent.floor || hp.redo) {
            ent.hPath = { tx, tz, floor: ent.floor, pts: house.findPath(ent.pos.x, ent.pos.z, tx, tz, (ent.radius || 0.45) * 0.8, ent.floor), i: 0 };
        }
        const P = ent.hPath;
        while (P.i < P.pts.length - 1 && Math.hypot(P.pts[P.i].x - ent.pos.x, P.pts[P.i].z - ent.pos.z) < 0.15) P.i++;
        if (P.i < P.pts.length - 1) {
            const wp = P.pts[P.i];
            ent.pos.y = house.floorY(ent.floor);
            const ddx = wp.x - ent.pos.x, ddz = wp.z - ent.pos.z, dd = Math.hypot(ddx, ddz);
            const st = Math.min(dd, speed * dt);
            if (dd > 1e-4) { ent.pos.x += ddx / dd * st; ent.pos.z += ddz / dd * st; turnTo(ent, Math.atan2(ddx, ddz), dt); }
            house.resolve(ent.pos, (ent.radius || 0.45) * 0.8, ent.floor);
            ent.moving = true; ent.moveSpeed = speed;
            return false;
        }
        const dx = tx - ent.pos.x, dz = tz - ent.pos.z;
        const d = Math.hypot(dx, dz);
        ent.pos.y = house.floorY(ent.floor);
        if (d <= arrive) return true;
        const step = Math.min(d, speed * dt);
        const ox = ent.pos.x, oz = ent.pos.z;
        ent.pos.x += dx / d * step;
        ent.pos.z += dz / d * step;
        house.resolve(ent.pos, (ent.radius || 0.45) * 0.8, ent.floor);
        // 被家具擋住 → 往旁邊滑一下
        if (Math.hypot(ent.pos.x - ox, ent.pos.z - oz) < step * 0.3) {
            ent.hStuck = (ent.hStuck || 0) + dt;
            if (ent.hStuck > 0.4) {
                if (ent.hPath) ent.hPath.redo = true;
                ent.hSide = -(ent.hSide || 1);
                ent.pos.x += (-dz / d) * 0.5 * ent.hSide;
                ent.pos.z += (dx / d) * 0.5 * ent.hSide;
                house.resolve(ent.pos, (ent.radius || 0.45) * 0.8, ent.floor);
                ent.hStuck = 0;
            }
        } else ent.hStuck = 0;
        turnTo(ent, Math.atan2(dx, dz), dt);
        ent.moving = true;
        ent.moveSpeed = speed;
        return d - step <= arrive;
    }
    // 室內移動 (不同樓層會自己走樓梯)
    function homeMoveTo(ent, tx, tz, tf, speed, dt, arrive) {
        if (ent.climb) {
            const c = ent.climb;
            c.t += dt / c.dur;
            const k = Math.min(1, c.t);
            ent.pos.set(c.from.x + (c.to.x - c.from.x) * k, c.from.y + (c.to.y - c.from.y) * k, c.from.z + (c.to.z - c.from.z) * k);
            turnTo(ent, Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z), dt, 10);
            ent.moving = true; ent.moveSpeed = 2.2;
            if (k >= 1) { ent.floor = c.toFloor; ent.climb = null; }
            return false;
        }
        if (ent.floor !== tf) {
            const s = ent.floor === 1 ? house.stairBottom : house.stairTop;
            if (stepIndoor(ent, s.x, s.z, speed, dt, 0.15)) {
                const toF = ent.floor === 1 ? 2 : 1;
                const to = toF === 2 ? house.stairTop : house.stairBottom;
                ent.climb = { from: ent.pos.clone(), to: new THREE.Vector3(to.x, house.floorY(toF), to.z), toFloor: toF, t: 0, dur: 1.7 };
            }
            return false;
        }
        return stepIndoor(ent, tx, tz, speed, dt, arrive);
    }

    // ---------- 進出家門 ----------
    function kidGoHome() {
        if (!kid) return;
        if (kid.indoor) { toast('🏠 主人已經在家了'); return; }
        if (kidCheckBusy()) return;
        cancelKidTask();
        if (build.active) build.stop();
        kid.task = { type: 'enterHome', phase: 'walk' };
        toast('🏠 主人回家囉～');
        // 最愛的寵物跟著回家
        const fav = pets.find(p => p.uid === favoriteUid);
        if (fav && !['BEING_SENT', 'BATH', 'MATING_JUMP'].includes(fav.state) && !(fav.act && fav.act.locked)) {
            setState(fav, 'HOME', { phase: 'toDoor' });
        }
    }
    function kidLeaveHome() {
        if (!kid || !kid.indoor) return;
        if (kid.task && (kid.task.type === 'exitHome')) return;
        cancelKidTask();
        kid.task = { type: 'exitHome', phase: 'walk' };
        const fav = pets.find(p => p.state === 'HOME');
        if (fav) fav.data.phase = 'leave';
    }
    function kidHomeWalk(x, z, floor) {
        if (!kid || !kid.indoor) return;
        if (kid.lying) return;
        cancelKidTask();
        // 只走到跟樓梯口連通的地方 (不會走進死角)
        const p = house.reachable(x, z, 0.36, floor);
        kid.task = { type: 'hWalk', x: p.x, z: p.z, floor };
        showClickMarker(p.x, p.z);
        clickMarker.position.y = house.floorY(floor) + 0.06;
    }

    // ---------- 鏡頭：飛進娃娃屋 ----------
    function animateCam(to, dur) {
        camAnim = { t: 0, dur: dur || 0.9, from: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, x: cam.target.x, y: cam.target.y, z: cam.target.z }, to };
    }
    function updateCamAnim(dt) {
        if (!camAnim) return;
        camAnim.t = Math.min(1, camAnim.t + dt / camAnim.dur);
        const k = camAnim.t < 0.5 ? 2 * camAnim.t * camAnim.t : 1 - Math.pow(-2 * camAnim.t + 2, 2) / 2;
        const f = camAnim.from, t = camAnim.to;
        cam.yaw = f.yaw + wrapAngle(t.yaw - f.yaw) * k;
        cam.pitch = f.pitch + (t.pitch - f.pitch) * k;
        cam.dist = f.dist + (t.dist - f.dist) * k;
        cam.target.set(f.x + (t.x - f.x) * k, f.y + (t.y - f.y) * k, f.z + (t.z - f.z) * k);
        if (camAnim.t >= 1) camAnim = null;
    }
    // 直的螢幕比較窄 → 鏡頭拉遠一點，整間房子才放得下
    function houseDist() { const a = window.innerWidth / window.innerHeight; return a < 1 ? 17 * Math.min(2, 0.95 / a) : 17; }
    function houseViewCam() {
        const q = house.L(0, 0.3);
        return { yaw: house.rot, pitch: 0.82, dist: houseDist(), x: q.x, y: house.floorY(kid && kid.floor || 1) + 0.8, z: q.z };
    }
    function enterHouseView() {
        houseMode = true;
        // ååºéåé²ä¾ (åºéé¡é ­éå¨é£) â æ²¿ç¨åæ¬å­çæ¨åè¦è§
        if (!(camAnim && camAnim.exiting)) camSaved = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, x: cam.target.x, y: 0, z: cam.target.z };
        house.setView('inside', kid.floor || 1);
        animateCam(houseViewCam(), 1.1);
        closeAllPanels();
        setSendMode(false);
        document.body.classList.add('in-house');
        renderHouseBar();
        $('house-bar').classList.remove('hidden');
        Audio3D.sfx('ding');
        toast('🏠 歡迎回家！點家具可以互動喔');
        track('homeEnter');
    }
    function exitHouseView() {
        houseMode = false;
        house.setView('outside');
        const back = camSaved || { yaw: CAM_DEFAULT.yaw, pitch: CAM_DEFAULT.pitch, dist: CAM_DEFAULT.dist, x: CAM_DEFAULT.tx, y: 0, z: CAM_DEFAULT.tz };
        animateCam(back, 1.0);
        camAnim.exiting = true;
        document.body.classList.remove('in-house');
        $('house-bar').classList.add('hidden');
        if (house.tv.on) house.setTv(false);
    }
    function renderHouseBar() {
        const f = kid && kid.indoor ? (kid.climb ? kid.climb.toFloor : kid.floor) : 1;
        $('hb-f1').classList.toggle('on', f === 1);
        $('hb-f2').classList.toggle('on', f === 2);
        $('hb-hint').textContent = f === 1
            ? '一樓：🛋️ 沙發看電視｜🧊 冰箱拿點心｜🍳 爐子做寵物餅乾 (🪙8)｜📚 書櫃看圖鑑'
            : '二樓：🛏️ 床上睡覺 (晚上會睡到天亮)｜👕 衣櫃換造型｜✏️ 書桌寫日記｜🌅 陽台';
    }

    // ---------- 在家裡點畫面 ----------
    const housePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function houseRaycast(cx, cy) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const objs = house.pickables(house.viewFloor).concat(
            pets.filter(p => p.indoor && p.floor === house.viewFloor).map(p => p.proxy));
        return raycaster.intersectObjects(objs, false);
    }
    function handleHouseClick(cx, cy) {
        if (!kid || !kid.indoor) return;
        if (kid.task && kid.task.type === 'hSleep' && kid.task.phase !== 'go') return;   // 睡覺中
        const hits = houseRaycast(cx, cy);
        for (const h of hits) {
            const pk = h.object.userData.pick;
            if (!pk) continue;
            if (pk.kind === 'pet') { onPetClick(pk.pet); return; }
            if (pk.kind === 'furn') { useFurniture(pk.id); return; }
        }
        // 點地板 → 走過去
        housePlane.constant = -house.floorY(house.viewFloor);
        if (raycaster.ray.intersectPlane(housePlane, gpV)) kidHomeWalk(gpV.x, gpV.z, house.viewFloor);
    }
    document.getElementById('hb-f1').addEventListener('click', () => { Audio3D.sfx('click'); if (kid && kid.indoor) { const q = house.L(-1.5, 1.5); kidHomeWalk(q.x, q.z, 1); } });
    document.getElementById('hb-f2').addEventListener('click', () => { Audio3D.sfx('click'); if (kid && kid.indoor) { const q = house.L(-0.6, 0.8); kidHomeWalk(q.x, q.z, 2); } });
    document.getElementById('hb-exit').addEventListener('click', () => { Audio3D.sfx('click'); kidLeaveHome(); });
    document.getElementById('pp-fav').addEventListener('click', () => {
        const p = selectedPet;
        if (!p) return;
        if (favoriteUid === p.uid) { favoriteUid = null; toast(`${petName(p)} 不再是最愛的寵物`); }
        else { favoriteUid = p.uid; toast(`💛 ${petName(p)} 是你最愛的寵物！回家時牠會跟著一起進門`); Audio3D.sfx('love'); }
        updatePetPanel();
        saveGame();
    });

    // ---------- 家具互動 ----------
    function useFurniture(id) {
        if (!kid || !kid.indoor || kid.lying) return;
        const f0 = house.furnById(id);
        if (!f0) return;
        const f = f0.alias ? house.furnById(f0.alias) : f0;
        if (f.id === 'stairsUp') { const q = house.L(2.0, -1.6); kidHomeWalk(q.x, q.z, 2); return; }
        if (f.id === 'stairsDown') { const q = house.L(2.6, 2.7); kidHomeWalk(q.x, q.z, 1); return; }
        cancelKidTask();
        if (f.id === 'bed') { kid.task = { type: 'hSleep', phase: 'go', f, t: 0 }; return; }
        kid.task = { type: 'hUse', id: f.id, f, phase: 'go', t: 0 };
        Audio3D.sfx('click');
    }
    function updateFurnitureUse(t, dt) {
        const f = t.f;
        if (t.phase === 'go') {
            if (homeMoveTo(kid, f.stand.x, f.stand.z, f.floor, 4, dt, 0.2)) { t.phase = 'act'; t.t = 0; t.started = false; }
            return;
        }
        t.t += dt;
        turnTo(kid, f.face, dt, 8);
        const top = kid.pos.y + 2.2 * kidScale();
        if (f.id === 'sofa') {
            // 坐上沙發看電視 (一直看到主人去做別的事)
            if (!t.started) { t.started = true; house.setTv(true); sfxAt('sit', kid.pos); }
            const k = Math.min(1, t.t * 3);
            kid.pos.x += (f.seat.x - kid.pos.x) * k;
            kid.pos.z += (f.seat.z - kid.pos.z) * k;
            kid.pos.y = house.Y1 + 0.5 - 0.6 * kidScale() + 0.1;
            kid.yaw = f.face;
            kid.pose = 'benchsit';
            if (Math.random() < dt * 0.4) spawnFx(pick(['😄', '🤣', '📺', '✨']), kid.pos.x, top, kid.pos.z, { size: 0.6 });
            if (!t.counted && t.t > 3) { t.counted = true; track('tv'); }
        } else if (f.id === 'fridge') {
            if (!t.started) {
                t.started = true;
                f.door.rotation.y = -1.5;
                Audio3D.sfx('click');
                if (fridgeDay !== dayCount) {
                    fridgeDay = dayCount;
                    const snack = pick(['icecream', 'juice', 'lollipop', 'hotdog']);
                    setTimeout(() => {
                        if (!kid) return;
                        giveKidItem(snack);
                        const names = { icecream: '冰淇淋 🍦', juice: '果汁 🧃', lollipop: '棒棒糖 🍭', hotdog: '熱狗 🌭' };
                        toast(`🧊 從冰箱拿了${names[snack]}！`);
                        Audio3D.sfx('yum');
                    }, 500);
                } else toast('🧊 今天的點心拿過了，明天再來喔');
            }
            kid.pose = t.t < 1.2 ? 'happy' : 'idle';
            if (t.t > 1.4) { f.door.rotation.y = 0; kid.task = null; }
        } else if (f.id === 'stove') {
            if (!t.started) {
                t.started = true;
                if (coins < 8) { toast('🪙 做餅乾需要 8 枚金幣喔'); Audio3D.sfx('error'); kid.task = null; return; }
                coins -= 8; updateHUD();
                toast('🍳 開始烤寵物餅乾…');
                Audio3D.sfx('crank');
            }
            kid.pose = 'happy';
            f.pan.rotation.z = Math.sin(t.t * 12) * 0.12;
            if (Math.random() < dt * 4) spawnFx(pick(['♨️', '💨', '🍪']), f.pan.getWorldPosition(tmpV).x, house.Y1 + 1.4, f.pan.getWorldPosition(tmpV).z, { size: 0.5, vy: 0.8 });
            if (t.t > 3) {
                f.pan.rotation.z = 0;
                inventory.cookie += 3;
                updateFoodBarSpecial();
                toast('🍪 烤好 3 片寵物餅乾了！放進食物列');
                Audio3D.sfx('cash');
                track('cook');
                kid.task = null;
            }
        } else if (f.id === 'shelf') {
            kid.task = null; openBook('pets');
        } else if (f.id === 'desk') {
            kid.task = null; openBook('stickers');
        } else if (f.id === 'wardrobe') {
            kid.task = null; openKidMenu(true);
        } else if (f.id === 'balcony') {
            kid.pose = t.t < 2 ? 'happy' : 'idle';
            if (!t.started) { t.started = true; toast('🌅 從陽台看出去，整個樂園都看得到！'); spawnFx('👋', kid.pos.x, top, kid.pos.z); }
            kid.yaw = house.rot;
        } else {
            kid.task = null;
        }
    }

    // ---------- 上床睡覺 ----------
    function updateSleep(t, dt) {
        const f = t.f;
        if (t.phase === 'go') {
            if (homeMoveTo(kid, f.stand.x, f.stand.z, 2, 4, dt, 0.2)) {
                t.phase = 'lie'; t.t = 0;
                kid.lying = true;
                const H = 1.85 * kidScale();
                // 頭在枕頭，身體往床尾 (床的方向跟著房子轉)
                kid.pos.set(f.sleep.x + Math.sin(house.rot) * (H - 0.15), f.sleep.y + 0.12, f.sleep.z + Math.cos(house.rot) * (H - 0.15));
                kid.yaw = house.rot;
                f.bedQuilt.visible = true; f.quilt.visible = false;
                t.night = isNight || dayTimer > 960;
                showSleepOverlay(t.night ? '🌙 晚安…' : '😴 小睡一下…', t.night ? '睡到明天早上' : '');
                sfxAt('sit', kid.pos);
            }
            return;
        }
        t.t += dt;
        kid.pose = 'bedsleep';
        if (Math.random() < dt * 0.8) spawnFx('💤', kid.pos.x + 0.3, kid.pos.y + 0.8, kid.pos.z - 1.4 * kidScale(), { size: 0.6, vy: 0.5, vx: 0.2, life: 2 });
        if (t.phase === 'lie' && t.t > 2.6) {
            t.phase = 'wake';
            if (t.night) {
                // 直接跳到早上
                sleptHome = true;
                dayTimer = DAY_LENGTH - 0.05;
                setSleepOverlayText('☀️ 早安！', '睡飽飽，今天的零用錢加倍！');
            } else {
                setSleepOverlayText('😊 睡飽了！', '精神好多了');
            }
            Audio3D.sfx('morning');
        }
        if (t.phase === 'wake' && t.t > 4.3) {
            hideSleepOverlay();
            kid.lying = false;
            f.bedQuilt.visible = false; f.quilt.visible = true;
            kid.pos.set(f.stand.x, house.Y2, f.stand.z);
            kid.cheerT = 1.5;
            track('homeSleep');
            kid.task = null;
        }
    }
    function showSleepOverlay(title, sub) {
        const el = $('sleep-overlay');
        setSleepOverlayText(title, sub);
        el.classList.remove('hidden');
        void el.offsetWidth;
        el.classList.add('show');
    }
    function setSleepOverlayText(title, sub) {
        $('sl-title').textContent = title;
        $('sl-sub').textContent = sub || '';
    }
    function hideSleepOverlay() {
        const el = $('sleep-overlay');
        el.classList.remove('show');
        setTimeout(() => el.classList.add('hidden'), 700);
    }

    // ---------------------------------------------------------
    //  食物
    // ---------------------------------------------------------
    const shadowGeo = new THREE.CircleGeometry(0.32, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
    function dropFood(emoji, spread) {
        if (!kid) return false;
        if (kid.indoor) { toast('🏠 在家裡不能丟食物，出門再餵喔'); return false; }
        if (kidBusyLocked()) { toast('主人正在玩，等一下再餵喔！'); return false; }
        if (foods.length >= 40) { toast('地上的食物太多了，先讓大家吃完吧！'); return false; }
        const a = Math.random() * Math.PI * 2, r = rand(1.0, spread || 2.0);
        const t = { x: kid.pos.x + Math.sin(a) * r, z: kid.pos.z + Math.cos(a) * r };
        world.resolveObstacles(t, 0.4);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, toneMapped: false }));
        sp.scale.set(0.85, 0.85, 1);
        overlay.add(sp);
        const sh = new THREE.Mesh(shadowGeo, shadowMat);
        sh.rotation.x = -Math.PI / 2;
        scene.add(sh);
        const from = { x: kid.pos.x, y: kid.pos.y + 1.5 * kidScale(), z: kid.pos.z };
        foods.push({ emoji, x: t.x, z: t.z, sp, sh, k: 0, from, landed: false, taken: false, age: 0 });
        kid.cheerT = Math.max(kid.cheerT, 0.4);
        turnTo(kid, Math.atan2(t.x - kid.pos.x, t.z - kid.pos.z), 1);
        sfxAt('toss', kid.pos);
        return true;
    }

    // ---------------------------------------------------------
    //  金幣 & 小吃店
    // ---------------------------------------------------------
    function addCoins(n, pos, reason) {
        if (n <= 0) return;
        coins += n;
        Audio3D.sfx('coin');
        if (pos) spawnFx('🪙', pos.x, (pos.y || 0) + 2.2, pos.z, { size: 0.8, vy: 1.6 });
        if (reason) toast(`🪙 +${n}｜${reason}`);
        const el = $('coin-stat');
        if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
        updateHUD();
    }
    function openShop() {
        if (questOpen) closeQuests();
        if (bookOpen) closeBook();
        shopOpen = true;
        renderShop();
        $('shop-panel').classList.remove('hidden');
        closePetPanel();
    }
    function closeShop() {
        shopOpen = false;
        $('shop-panel').classList.add('hidden');
    }
    function renderShop() {
        $('shop-coins').textContent = `🪙 ${coins}`;
        const grid = $('shop-grid');
        grid.innerHTML = '';
        SHOP_ITEMS.forEach(it => {
            const c = document.createElement('div');
            c.className = 'shop-item' + (coins < it.price ? ' poor' : '');
            const owned = (it.kind === 'toy' && inventory.toys[it.id]) || (it.kind === 'acc' && inventory.accs[it.id]);
            const extra = it.id === 'cookie' && inventory.cookie ? `<em>背包 ${inventory.cookie}</em>` : owned ? '<em>已擁有</em>' : '';
            c.innerHTML = `<div class="si-emoji">${it.emoji}</div><b>${it.name}</b><small>${it.desc}</small>${extra}<button ${owned ? 'disabled' : ''}>${owned ? '已擁有 ✔' : '🪙 ' + it.price}</button>`;
            c.querySelector('button').addEventListener('click', () => buyItem(it));
            grid.appendChild(c);
        });
    }
    function buyItem(it) {
        if ((it.kind === 'toy' && inventory.toys[it.id]) || (it.kind === 'acc' && inventory.accs[it.id])) return;
        if (coins < it.price) {
            Audio3D.sfx('error');
            menuToastShop('金幣不夠喔！多摸摸動物、讓牠們開心就能賺金幣 🪙');
            return;
        }
        coins -= it.price;
        Audio3D.sfx('cash');
        world.shop.wave = 2;
        if (it.kind === 'kid') {
            giveKidItem(it.id);
            kid.cheerT = 1.5;
            spawnFx(it.emoji, kid.pos.x, kid.pos.y + 2.4, kid.pos.z, { size: 1 });
            menuToastShop(`買到${it.name}了！${it.emoji}`);
        } else if (it.kind === 'share') {
            closeShop();
            for (let i = 0; i < 8; i++) setTimeout(() => dropFood(it.emoji, 3.5), i * 90);
            toast(`${it.emoji} 撒爆米花囉！大家快來吃～`);
        } else if (it.kind === 'bag') {
            inventory.cookie += 3;
            updateFoodBarSpecial();
            menuToastShop('寵物餅乾放進食物列了！🍪');
        } else if (it.kind === 'toy') {
            inventory.toys[it.id] = true;
            updateToyButtons();
            menuToastShop(`買到${it.name}了！點下方食物列的 ${it.emoji} 就能丟出去`);
        } else if (it.kind === 'acc') {
            inventory.accs[it.id] = true;
            menuToastShop(`買到${it.name}了！點動物 → 資訊卡的「👗 打扮」就能戴上`);
        }
        track('shop');
        renderShop();
        updateHUD();
        saveGame();
    }
    function menuToastShop(msg) {
        const el = $('shop-toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(menuToastShop.t);
        menuToastShop.t = setTimeout(() => el.classList.remove('show'), 1800);
    }
    function addFoodDirect(emoji, x, z, age) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, toneMapped: false }));
        sp.scale.set(0.85, 0.85, 1);
        overlay.add(sp);
        const sh = new THREE.Mesh(shadowGeo, shadowMat);
        sh.rotation.x = -Math.PI / 2;
        scene.add(sh);
        foods.push({ emoji, x, z, sp, sh, k: 1, from: null, landed: true, taken: false, age: age || 0 });
    }
    function takeFood(f) {
        f.taken = true;
        removeFood(f);
    }
    function removeFood(f) {
        overlay.remove(f.sp); scene.remove(f.sh);
        f.sp.material.dispose();
        foods = foods.filter(x => x !== f);
    }
    function updateFoods(dt) {
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const gy = groundY(f.x, f.z);
            if (!f.landed) {
                f.k = Math.min(1, f.k + dt / 0.45);
                const k = f.k;
                f.sp.position.set(
                    f.from.x + (f.x - f.from.x) * k,
                    f.from.y + (gy + 0.4 - f.from.y) * k + Math.sin(k * Math.PI) * 1.4,
                    f.from.z + (f.z - f.from.z) * k
                );
                if (k >= 1) f.landed = true;
            } else {
                f.age += dt;
                f.sp.position.set(f.x, gy + 0.4 + Math.sin(f.age * 3 + i) * 0.04, f.z);
                // 放太久沒人吃 → 慢慢消失
                if (f.age > 110) f.sp.material.opacity = Math.max(0, (120 - f.age) / 10);
                if (f.age > 120) { removeFood(f); continue; }
            }
            f.sh.position.set(f.sp.position.x, gy + 0.02, f.sp.position.z);
        }
    }

    // ---------------------------------------------------------
    //  每日任務、成就貼紙、動物圖鑑
    // ---------------------------------------------------------
    const QUEST_DEF = {};
    QUEST_POOL.forEach(q => QUEST_DEF[q.id] = q);
    let questOpen = false, bookOpen = false, bookTab = 'pets';

    function bookCount() { return Object.keys(book.seen).length; }
    function rareCount() { return Object.values(book.variants).reduce((a, v) => a + Object.keys(v).length, 0); }
    function markSeen(p, silent) {
        if (!book.seen[p.id]) {
            book.seen[p.id] = true;
            if (!silent) toast(`📖 圖鑑新增：${p.emoji} ${p.name}！`);
        }
        if (p.variant) {
            const v = (book.variants[p.id] = book.variants[p.id] || {});
            if (!v[p.variant] && !silent) toast(`📖 圖鑑新增稀有顏色：${PetModels.VARIANTS[p.variant].icon} ${PetModels.VARIANTS[p.variant].name}${p.name}！`);
            v[p.variant] = true;
        }
    }

    // 記錄玩家做了什麼 → 推進任務與成就
    function track(ev, n) {
        n = n || 1;
        stats[ev] = (stats[ev] || 0) + n;
        quests.list.forEach(q => {
            const def = QUEST_DEF[q.id];
            if (!def || q.done || def.ev !== ev) return;
            q.progress = Math.min(def.n, q.progress + n);
            if (q.progress >= def.n) {
                q.done = true;
                toast(`📋 任務完成：${def.icon} ${def.text}！到「任務」領獎勵`);
                Audio3D.sfx('levelup');
            }
        });
        updateQuestBadge();
        checkAchievements();
        if (questOpen) renderQuests();
    }

    function refreshQuests(force) {
        if (!force && quests.day === dayCount && quests.list.length) return;
        const hasToy = inventory.toys.ball || inventory.toys.frisbee;
        const hasAcc = Object.keys(inventory.accs).length > 0;
        const hasTramp = build.decos.some(d => d.id === 'trampoline');
        const pool = QUEST_POOL.filter(q => (!q.needToy || hasToy) && (!q.needAcc || hasAcc) && (!q.needTramp || hasTramp));
        const chosen = pool.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        quests = { day: dayCount, list: chosen.map(q => ({ id: q.id, progress: 0, done: false, claimed: false })), bonus: false };
        updateQuestBadge();
        if (questOpen) renderQuests();
    }
    function claimQuest(i) {
        const q = quests.list[i];
        if (!q || !q.done || q.claimed) return;
        q.claimed = true;
        const def = QUEST_DEF[q.id];
        addCoins(def.reward, kid ? kid.pos : null, `任務獎勵 ${def.icon}`);
        track('quest');
        if (!quests.bonus && quests.list.every(x => x.claimed)) {
            quests.bonus = true;
            setTimeout(() => { addCoins(QUEST_ALL_BONUS, null, '今天的任務全部完成！🎉'); Audio3D.sfx('fanfare'); }, 700);
        }
        updateQuestBadge();
        renderQuests();
        saveGame();
    }
    function updateQuestBadge() {
        const b = document.getElementById('btn-quests');
        if (b) b.classList.toggle('has-badge', quests.list.some(q => q.done && !q.claimed));
    }
    function checkAchievements() {
        ACHIEVEMENTS.forEach(a => {
            if (achieved[a.id]) return;
            let ok = false;
            try { ok = a.check(stats); } catch (e) { ok = false; }
            if (ok) {
                achieved[a.id] = dayCount;
                showSticker(a);
                addCoins(ACHIEVE_REWARD, null, null);
            }
        });
    }
    function showSticker(a) {
        const el = document.createElement('div');
        el.className = 'sticker-banner';
        el.innerHTML = `<div class="sticker">${a.icon}</div><div class="st-text"><small>獲得新貼紙！</small><b>${a.name}</b><span>${a.desc}｜🪙 +${ACHIEVE_REWARD}</span></div>`;
        $('banners').appendChild(el);
        Audio3D.sfx('fanfare');
        setTimeout(() => el.classList.add('out'), 4500);
        setTimeout(() => el.remove(), 5100);
        if (bookOpen) renderBook();
    }

    function renderQuests() {
        const list = $('quest-list');
        list.innerHTML = '';
        quests.list.forEach((q, i) => {
            const def = QUEST_DEF[q.id];
            if (!def) return;
            const row = document.createElement('div');
            row.className = 'quest-row' + (q.claimed ? ' claimed' : q.done ? ' done' : '');
            const pct = Math.round(q.progress / def.n * 100);
            row.innerHTML = `<div class="q-icon">${def.icon}</div>
                <div class="q-main"><b>${def.text}</b>
                <div class="q-bar"><i style="width:${pct}%"></i></div>
                <small>${q.progress} / ${def.n}｜獎勵 🪙 ${def.reward}</small></div>
                <button ${q.done && !q.claimed ? '' : 'disabled'}>${q.claimed ? '已領取 ✔' : q.done ? '領取' : '進行中'}</button>`;
            row.querySelector('button').addEventListener('click', () => claimQuest(i));
            list.appendChild(row);
        });
        const all = quests.list.every(x => x.claimed);
        $('quest-foot').textContent = all ? `🎉 今天的任務都完成了！第 ${dayCount + 1} 天會有新任務` : `💡 3 個任務都領完，再送 🪙 ${QUEST_ALL_BONUS}｜每天早上換新任務`;
        $('quest-day').textContent = `第 ${dayCount} 天`;
    }
    function openQuests() {
        closeAllPanels();
        questOpen = true;
        renderQuests();
        $('quest-panel').classList.remove('hidden');
    }
    function closeQuests() { questOpen = false; $('quest-panel').classList.add('hidden'); }

    function renderBook() {
        $('book-tab-pets').classList.toggle('active', bookTab === 'pets');
        $('book-tab-stickers').classList.toggle('active', bookTab === 'stickers');
        const grid = $('book-grid');
        grid.innerHTML = '';
        grid.className = bookTab === 'pets' ? 'book-grid' : 'sticker-grid';
        if (bookTab === 'pets') {
            $('book-sub').textContent = `已收集 ${bookCount()} / ${PET_DB.length} 種｜稀有顏色 ${rareCount()} / ${PET_DB.length * 3}｜稀有寶寶要靠生寶寶才會出現喔！`;
            PET_DB.forEach(pd => {
                const seen = !!book.seen[pd.id];
                const vs = book.variants[pd.id] || {};
                const here = pets.filter(p => p.id === pd.id).length;
                const c = document.createElement('div');
                c.className = 'book-card' + (seen ? '' : ' locked');
                const vChips = Object.keys(PetModels.VARIANTS).map(k => {
                    const v = PetModels.VARIANTS[k];
                    return `<span class="vchip ${vs[k] ? 'got' : ''}" title="${v.name}${pd.name}">${vs[k] ? v.icon : '？'}</span>`;
                }).join('');
                c.innerHTML = `<img alt="" src="${thumbnail('pet_' + pd.id, () => buildPet(pd.id))}">
                    <b>${seen ? pd.name : '？？？'}</b>
                    <small>${seen ? `樂園裡 ${here} 隻｜愛吃 ${pd.eats.join('')}` : '還沒遇到過'}</small>
                    <p>${seen ? PET_FACTS[pd.id] : '領養或生出這種動物，就能解開小知識！'}</p>
                    <div class="vchips">${vChips}</div>`;
                grid.appendChild(c);
            });
        } else {
            const got = ACHIEVEMENTS.filter(a => achieved[a.id]).length;
            $('book-sub').textContent = `已收集 ${got} / ${ACHIEVEMENTS.length} 張貼紙｜每張貼紙送 🪙 ${ACHIEVE_REWARD}`;
            ACHIEVEMENTS.forEach(a => {
                const c = document.createElement('div');
                c.className = 'sticker-card' + (achieved[a.id] ? ' got' : '');
                c.innerHTML = `<div class="sticker">${achieved[a.id] ? a.icon : '🔒'}</div><b>${a.name}</b><small>${a.desc}</small>${achieved[a.id] ? `<em>第 ${achieved[a.id]} 天獲得</em>` : ''}`;
                grid.appendChild(c);
            });
        }
    }
    function openBook(tab) {
        closeAllPanels();
        bookOpen = true;
        if (tab) bookTab = tab;
        renderBook();
        $('book-panel').classList.remove('hidden');
    }
    function closeBook() { bookOpen = false; $('book-panel').classList.add('hidden'); }
    function closeAllPanels() {
        if (shopOpen) closeShop();
        if (questOpen) closeQuests();
        if (bookOpen) closeBook();
        closePetPanel();
    }

    // ---------------------------------------------------------
    //  玩具：丟出去 → 動物去撿 → 叼回來給主人
    // ---------------------------------------------------------
    function throwToy(type) {
        if (!kid || !inventory.toys[type]) return;
        if (kidCheckBusy()) return;
        if (activeToy) { toast('玩具還在外面，等動物撿回來喔！'); return; }
        // 找一個空曠的落點
        let best = null;
        for (let i = 0; i < 12; i++) {
            const a = kid.yaw + rand(-1.3, 1.3) + (i >= 6 ? Math.PI : 0);
            const d = type === 'frisbee' ? rand(9, 12) : rand(6, 9);
            const t = { x: kid.pos.x + Math.sin(a) * d, z: kid.pos.z + Math.cos(a) * d };
            const bx = t.x, bz = t.z;
            world.resolveObstacles(t, 0.5);
            if (!best) best = t;
            if (Math.hypot(t.x - bx, t.z - bz) < 0.2 && groundY(t.x, t.z) === 0) { best = t; break; }
        }
        turnTo(kid, Math.atan2(best.x - kid.pos.x, best.z - kid.pos.z), 1);
        kid.cheerT = Math.max(kid.cheerT, 0.6);
        const mesh = PetModels.buildToy(type);
        scene.add(mesh);
        activeToy = {
            type, mesh, to: best, k: 0, phase: 'fly',
            from: { x: kid.pos.x, y: kid.pos.y + 1.5 * kidScale(), z: kid.pos.z },
            dur: type === 'frisbee' ? 1.4 : 0.9, h: type === 'frisbee' ? 1.6 : 3.2,
            groundT: 0, carrier: null, bounce: 0,
        };
        sfxAt('toss', kid.pos);
        updateToyButtons();
    }
    function callChasers(T) {
        if (isNight) return;
        const cands = pets.filter(p => (p.state === 'WANDER' || p.state === 'LOVED') && dist2D(p.pos, T.to) < 20)
            .sort((a, b) => dist2D(a.pos, T.to) - dist2D(b.pos, T.to)).slice(0, 3);
        cands.forEach(p => {
            setState(p, 'FETCH');
            spawnFx('❗', p.pos.x, p.pos.y + 1.6 * petScale(p), p.pos.z, { size: 0.7 });
        });
        if (cands.length) petSay(cands[0], true);
    }
    function returnToy(msg) {
        if (!activeToy) return;
        scene.remove(activeToy.mesh);
        activeToy = null;
        if (msg) toast(msg);
        updateToyButtons();
    }
    function updateToy(dt) {
        const T = activeToy;
        if (!T) return;
        if (T.phase === 'fly') {
            T.k = Math.min(1, T.k + dt / T.dur);
            const k = T.k, gy = groundY(T.to.x, T.to.z);
            T.mesh.position.set(
                T.from.x + (T.to.x - T.from.x) * k,
                T.from.y + (gy + 0.18 - T.from.y) * k + Math.sin(k * Math.PI) * T.h,
                T.from.z + (T.to.z - T.from.z) * k
            );
            if (T.type === 'frisbee') { T.mesh.rotation.y += dt * 16; T.mesh.rotation.z = 0.12; }
            else T.mesh.rotation.x += dt * 12;
            if (k >= 1) {
                T.phase = 'ground'; T.groundT = 0; T.bounce = T.type === 'ball' ? 0.7 : 0.1;
                sfxAt('boing', T.mesh.position);
                callChasers(T);
            }
        } else if (T.phase === 'ground') {
            T.groundT += dt;
            T.bounce = Math.max(0, T.bounce - dt * 1.2);
            const gy = groundY(T.to.x, T.to.z);
            T.mesh.position.set(T.to.x, gy + (T.type === 'frisbee' ? 0.05 : 0.17) + Math.abs(Math.sin(T.groundT * 9)) * T.bounce * 0.6, T.to.z);
            if (T.type === 'frisbee') T.mesh.rotation.set(0, T.mesh.rotation.y, 0);
            // 沒有動物要撿 → 再叫一次；太久就自己撿回來
            if (T.groundT > 3 && Math.floor(T.groundT) % 3 === 0 && !pets.some(p => p.state === 'FETCH')) callChasers(T);
            if (T.groundT > 20) returnToy('🎾 沒有動物去撿，主人自己把玩具撿回來了');
        } else if (T.phase === 'carried') {
            const p = T.carrier;
            if (!p || pets.indexOf(p) === -1) { T.phase = 'ground'; T.carrier = null; T.groundT = 0; return; }
            const s = petScale(p);
            const h = (LABEL_H[p.rig.type] || 1.5) * s * 0.52;
            T.mesh.position.set(p.pos.x + Math.sin(p.yaw) * 0.5 * s, p.pos.y + p.hopH + h, p.pos.z + Math.cos(p.yaw) * 0.5 * s);
            T.mesh.rotation.set(T.type === 'frisbee' ? 1.2 : 0, p.yaw, 0);
        }
    }
    function updateToyButtons() {
        ['ball', 'frisbee'].forEach(t => {
            const b = document.getElementById('toy-' + t);
            if (!b) return;
            b.classList.toggle('hidden', !inventory.toys[t]);
            b.classList.toggle('busy', !!activeToy);
        });
    }

    // ---------------------------------------------------------
    //  送人：大鳥 + 彩虹
    // ---------------------------------------------------------
    function startDelivery(p) {
        if (eagle) { toast('大鳥正在送別的寶貝，等一下喔！'); return; }
        if (p.state === 'BEING_SENT') return;
        setState(p, 'BEING_SENT');
        if (selectedPet === p) closePetPanel();
        const model = buildEagle();
        model.scale.setScalar(1.3);
        scene.add(model);
        const rope = new THREE.Mesh(PetModels.G.cyl, PetModels.mat(0x8b5a2b));
        rope.scale.set(0.04, 1, 0.04);
        scene.add(rope);
        const basket = new THREE.Group();
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.55, 14, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xc8954a, side: THREE.DoubleSide, roughness: 0.9 }));
        bowl.position.y = 0.27;
        basket.add(bowl);
        const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), PetModels.mat(0xa8763a));
        bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.02;
        basket.add(bottom);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 6, 18), PetModels.mat(0x8b5a2b));
        rim.rotation.x = Math.PI / 2; rim.position.y = 0.55;
        basket.add(rim);
        basket.scale.setScalar(Math.max(1, petScale(p) * 1.15));
        scene.add(basket);
        eagle = {
            model, rig: model.userData.rig, rope, basket, pet: p, phase: 'in', t: 0,
            name: petName(p),
            pos: new THREE.Vector3(p.pos.x - 45, 16, p.pos.z - 14),
            hover: new THREE.Vector3(p.pos.x, p.pos.y + 6.5, p.pos.z),
            basketY: 10, yaw: Math.PI / 2,
        };
        toast(`🦅 大鳥來接 ${petName(p)} 去新家了！`);
        Audio3D.sfx('eagle');
        setTimeout(() => Audio3D.sfx('flap'), 600);
    }
    function updateEagle(dt) {
        const e = eagle;
        e.t += dt;
        const p = e.pet;
        if (e.phase === 'in') {
            const dx = e.hover.x - e.pos.x, dy = e.hover.y - e.pos.y, dz = e.hover.z - e.pos.z;
            const d = Math.hypot(dx, dy, dz);
            const step = Math.min(d, 17 * dt);
            if (d > 0.05) {
                e.pos.x += dx / d * step; e.pos.y += dy / d * step; e.pos.z += dz / d * step;
                e.yaw = Math.atan2(dx, dz);
            }
            e.basketY = e.pos.y - 1.6;
            if (d < 0.1) { e.phase = 'grab'; e.t = 0; sfxAt('flap', e.pos); }
        } else if (e.phase === 'grab') {
            e.pos.y = e.hover.y + Math.sin(e.t * 3) * 0.15;
            const ground = p.pos.y;
            if (e.t < 1.2) {
                e.basketY = (e.hover.y - 1.6) + (ground - (e.hover.y - 1.6)) * (e.t / 1.2);
            } else {
                if (!e.grabbed) {
                    e.grabbed = true;
                    spawnFx('💕', p.pos.x, p.pos.y + 1.5, p.pos.z);
                }
                const k = Math.min(1, (e.t - 1.2) / 1.1);
                e.basketY = ground + ((e.pos.y - 2.2) - ground) * k;
            }
            if (e.t > 2.6) { e.phase = 'out'; e.t = 0; }
        } else {
            e.pos.x += 19 * dt;
            e.pos.y += 5 * dt;
            e.pos.z -= 6 * dt;
            e.yaw = Math.atan2(19, -6);
            e.basketY = e.pos.y - 2.2;
            if (e.pos.x > p.pos.x + 55 || e.t > 6) {
                const name = e.name;
                removePet(p);
                scene.remove(e.model); scene.remove(e.rope); scene.remove(e.basket);
                eagle = null;
                spawnRainbow();
                Audio3D.sfx('rainbow');
                toast(`🌈 ${name} 找到溫暖的新家了！`);
                return;
            }
        }
        // 寵物跟著籃子
        if (e.grabbed) {
            p.pos.set(e.pos.x, e.basketY + 0.05, e.pos.z);
        }
        e.model.position.copy(e.pos);
        e.model.rotation.y = e.yaw;
        animateRig(e.rig, e.phase === 'grab' ? 'hover' : 'fly', dt, 0);
        e.basket.position.set(e.pos.x, e.basketY, e.pos.z);
        const top = e.pos.y - 0.4, bot = e.basketY + 0.55 * e.basket.scale.y;
        e.rope.position.set(e.pos.x, (top + bot) / 2, e.pos.z);
        e.rope.scale.y = Math.max(0.01, top - bot);
    }

    // big = 雨後的大彩虹 (比較大、停留比較久)
    function spawnRainbow(big) {
        const g = new THREE.Group();
        const colors = [0xff3b3b, 0xff9a1f, 0xffe03b, 0x38c84a, 0x3b8bff, 0x9b4dff];
        const R = big ? 34 : 22, w = big ? 1.0 : 0.6;
        colors.forEach((c, i) => {
            const m = new THREE.Mesh(new THREE.TorusGeometry(R - i * w * 2, w, 8, 72, Math.PI),
                new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, fog: false, depthWrite: false }));
            g.add(m);
        });
        const f = camFront();
        if (big) {
            // 往鏡頭方向傾斜，讓俯視的視角也看得到整道彩虹橫跨樂園
            g.position.set(cam.target.x - f.x * 8, -5, cam.target.z - f.z * 8);
            g.rotation.set(-cam.pitch * 0.85, cam.yaw, 0, 'YXZ');
        } else {
            g.position.set(cam.target.x - f.x * 30, -2, cam.target.z - f.z * 30);
            g.rotation.y = cam.yaw;
        }
        scene.add(g);
        rainbows.push({ g, t: 0, life: big ? 18 : 6.5, peak: big ? 0.62 : 0.8 });
        burst(cam.target.x, 6, cam.target.z, ['✨', '⭐', '🌈'], big ? 12 : 8, 4);
    }

    // 天氣變化的通知
    weather.onEvent = type => {
        if (gameState !== 'PARK') return;
        if (type === 'rain') toast('🌧️ 下雨了！小動物們快到星星睡窩躲雨～雨水也會幫水槽補水喔');
        else if (type === 'snow') { toast('❄️ 下雪了！企鵝好開心，地上會慢慢積雪喔～'); track('snow'); }
        else if (type === 'stop') toast(weather.kind === 'snow' ? '⛅ 雪停了' : '⛅ 雨停了');
        else if (type === 'thunder') Audio3D.sfx('thunder');
        else if (type === 'rainbow') {
            // 雨過天晴，而且還是白天 → 出現彩虹一下子
            if (!isNight && dayTimer > 30 && dayTimer < 1000) {
                spawnRainbow(true);
                Audio3D.sfx('rainbow');
                track('rainbow');
                toast('🌈 雨過天晴，天空出現彩虹了！');
            }
        }
    };
    function updateRainbows(dt) {
        for (let i = rainbows.length - 1; i >= 0; i--) {
            const r = rainbows[i];
            r.t += dt;
            const a = r.t < 1.2 ? r.t / 1.2 : r.t > r.life - 1.5 ? Math.max(0, (r.life - r.t) / 1.5) : 1;
            r.g.children.forEach(m => { m.material.opacity = a * (r.peak || 0.8); });
            r.g.scale.setScalar(0.6 + 0.4 * Math.min(1, r.t / 1.2));
            if (r.t >= r.life) {
                scene.remove(r.g);
                r.g.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
                rainbows.splice(i, 1);
            }
        }
    }

    // ---------------------------------------------------------
    //  選取光圈 / 點擊標記
    // ---------------------------------------------------------
    const selRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 36),
        new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false }));
    selRing.rotation.x = -Math.PI / 2;
    selRing.visible = false;
    scene.add(selRing);
    const clickMarker = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 28),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    clickMarker.rotation.x = -Math.PI / 2;
    scene.add(clickMarker);
    let clickMarkerT = 0;
    function showClickMarker(x, z) {
        clickMarker.position.set(x, groundY(x, z) + 0.04, z);
        clickMarkerT = 0.6;
    }

    // ---------------------------------------------------------
    //  輸入：旋轉 / 平移 / 縮放 / 點擊
    // ---------------------------------------------------------
    const pointers = new Map();
    let drag = null, pinchDist = 0;
    let gesture = null;               // 兩指手勢 (觸控)
    let camVel = null;                // 放開手指後的慣性滑動
    let lastTapType = 'mouse';
    function pinch() {
        const ps = [...pointers.values()];
        return Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1;
    }
    function camLimits() {
        return houseMode ? { x0: house.x - 3, x1: house.x + 3, z0: house.z - 3, z1: house.z + 3 } : { x0: -36, x1: 36, z0: -23, z1: 23 };
    }
    function clampTarget() {
        const lim = camLimits();
        cam.target.x = clamp(cam.target.x, lim.x0, lim.x1);
        cam.target.z = clamp(cam.target.z, lim.z0, lim.z1);
    }
    const distMin = () => (houseMode ? 7 : 14), distMax = () => (houseMode ? Math.max(32, houseDist() + 6) : 115);
    // 螢幕上的點 → 地面上的點 (地面高度 = 鏡頭看的高度)
    const panPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const panV = new THREE.Vector3();
    function groundAt(cx, cy) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        panPlane.constant = -cam.target.y;
        const hit = raycaster.ray.intersectPlane(panPlane, panV);
        if (!hit || panV.distanceTo(camera.position) > 400) return null;
        return { x: panV.x, z: panV.z };
    }
    // 抓著地面拖：手指下的那個點會一直跟著手指
    function panByScreen(x0, y0, x1, y1) {
        const a = groundAt(x0, y0), b = groundAt(x1, y1);
        let dx, dz;
        if (a && b) { dx = a.x - b.x; dz = a.z - b.z; }
        else {
            const k = cam.dist * 0.0016, r = camRight(), f = camFront();
            dx = -(r.x * (x1 - x0) + f.x * (y1 - y0)) * k; dz = -(r.z * (x1 - x0) + f.z * (y1 - y0)) * k;
        }
        cam.target.x += dx; cam.target.z += dz;
        clampTarget();
        return { x: dx, z: dz };
    }
    function syncCamera() { updateCamera(); camera.updateMatrixWorld(); }

    canvas.addEventListener('pointerdown', e => {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 模擬的觸控沒有實體指標 */ }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
        camVel = null;
        const touch = e.pointerType !== 'mouse';
        if (pointers.size === 1) {
            drag = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false,
                button: e.button, touch, vx: 0, vz: 0,
                pan: touch || e.button === 2 || e.button === 1 || e.shiftKey };
        } else if (pointers.size === 2) {
            if (drag) drag.moved = true;
            pinchDist = pinch();
            const ps = [...pointers.values()];
            gesture = { mode: null, mx: (ps[0].x + ps[1].x) / 2, my: (ps[0].y + ps[1].y) / 2, d0: pinchDist, d: pinchDist,
                a: Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x), a0: 0, start: ps.map(p => ({ x: p.x, y: p.y })) };
            gesture.a0 = gesture.a;
        }
    });
    canvas.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId)) { if (e.pointerType === 'mouse') hoverCheck(e); return; }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
        if (pointers.size >= 2) {
            const ps = [...pointers.values()].slice(0, 2);
            const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1;
            if (ps[0].type === 'mouse' || !gesture) {
                cam.dist = clamp(cam.dist * pinchDist / d, distMin(), distMax());
                pinchDist = d;
                return;
            }
            const g = gesture;
            const mx = (ps[0].x + ps[1].x) / 2, my = (ps[0].y + ps[1].y) / 2;
            const a = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
            if (!g.mode) {
                // 先判斷手勢：兩指一起上下推 = 調整俯角；其他 = 縮放 / 旋轉 / 移動
                const m0 = { x: ps[0].x - g.start[0].x, y: ps[0].y - g.start[0].y };
                const m1 = { x: ps[1].x - g.start[1].x, y: ps[1].y - g.start[1].y };
                const dd = Math.abs(d - g.d0) / g.d0, da = Math.abs(wrapAngle(a - g.a0));
                const moved = Math.hypot(mx - (g.start[0].x + g.start[1].x) / 2, my - (g.start[0].y + g.start[1].y) / 2);
                const vertical = m0.y * m1.y > 0 && Math.abs(m0.y) > Math.abs(m0.x) * 1.4 && Math.abs(m1.y) > Math.abs(m1.x) * 1.4;
                if (vertical && dd < 0.08 && da < 0.12 && moved > 14) g.mode = 'tilt';
                else if (dd > 0.06 || da > 0.1 || moved > 14) g.mode = 'move';
                else return;
            }
            if (g.mode === 'tilt') {
                cam.pitch = clamp(cam.pitch + (my - g.my) * 0.005, 0.32, 1.4);
            } else {
                // 以兩指中間為中心縮放、旋轉，兩指一起移動 = 移動地圖
                syncCamera();
                const anchor = groundAt(g.mx, g.my);
                cam.dist = clamp(cam.dist * g.d / d, distMin(), distMax());
                cam.yaw += wrapAngle(a - g.a);
                syncCamera();
                const now = groundAt(mx, my);
                if (anchor && now) { cam.target.x += anchor.x - now.x; cam.target.z += anchor.z - now.z; clampTarget(); }
            }
            g.mx = mx; g.my = my; g.d = d; g.a = a;
            return;
        }
        if (!drag) return;
        const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
        const limit = drag.touch ? 12 : 7;          // 手指會微微晃動，觸控要拖遠一點才算拖曳
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > limit) drag.moved = true;
        if (!drag.moved) return;
        const px = drag.lx, py = drag.ly;
        drag.lx = e.clientX; drag.ly = e.clientY;
        if (drag.pan) {
            syncCamera();
            const mv = panByScreen(px, py, e.clientX, e.clientY);
            const t = performance.now(), dtm = Math.max(8, t - drag.lt);
            drag.lt = t;
            // 記錄拖曳速度 (給放開後的慣性用)
            drag.vx = drag.vx * 0.6 + (mv.x / dtm * 1000) * 0.4;
            drag.vz = drag.vz * 0.6 + (mv.z / dtm * 1000) * 0.4;
        } else {
            cam.yaw -= dx * 0.006;
            cam.pitch = clamp(cam.pitch + dy * 0.004, 0.32, 1.4);
        }
    });
    function endPointer(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        if (drag && !drag.moved && pointers.size === 0 && (drag.button === 0 || drag.touch)) {
            lastTapType = drag.touch ? 'touch' : 'mouse';
            handleClick(e.clientX, e.clientY);
        }
        if (pointers.size === 1) {
            // 兩指放開一指 → 剩下那指接著拖，不會跳
            const p = [...pointers.values()][0];
            gesture = null;
            if (drag) { drag.lx = p.x; drag.ly = p.y; drag.lt = performance.now(); drag.vx = 0; drag.vz = 0; if (drag.touch) drag.pan = true; }
        }
        if (pointers.size === 0) {
            if (drag && drag.moved && drag.pan && drag.touch && performance.now() - drag.lt < 90 && Math.hypot(drag.vx, drag.vz) > 2) {
                camVel = { x: drag.vx, z: drag.vz };
            }
            drag = null; gesture = null;
        }
    }
    // 慣性：放開手指後地圖再滑一下
    function updateCamInertia(dt) {
        if (!camVel || pointers.size) return;
        cam.target.x += camVel.x * dt; cam.target.z += camVel.z * dt;
        clampTarget();
        const k = Math.exp(-dt * 4.5);
        camVel.x *= k; camVel.z *= k;
        if (Math.hypot(camVel.x, camVel.z) < 0.3) camVel = null;
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), distMin(), distMax());
    }, { passive: false });

    const ndc = new THREE.Vector2();
    function raycastAt(cx, cy) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const objs = pets.filter(p => p.state !== 'BEING_SENT').map(p => p.proxy).concat(world.pickables);
        return raycaster.intersectObjects(objs, false);
    }
    let lastHover = 0;
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const gpV = new THREE.Vector3();
    function groundPointAt(cx, cy) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return raycaster.ray.intersectPlane(groundPlane, gpV) ? { x: gpV.x, z: gpV.z } : null;
    }
    function hoverCheck(e) {
        if (gameState !== 'PARK') return;
        if (houseMode) {
            const hits = houseRaycast(e.clientX, e.clientY);
            canvas.style.cursor = hits.some(h => h.object.userData.pick) ? 'pointer' : 'grab';
            return;
        }
        if (build.active) {
            const gp = groundPointAt(e.clientX, e.clientY);
            if (gp) build.onMove(gp.x, gp.z);
            canvas.style.cursor = 'crosshair';
            return;
        }
        const now = performance.now();
        if (now - lastHover < 90) return;
        lastHover = now;
        const hits = raycastAt(e.clientX, e.clientY);
        const k = hits.length && hits[0].object.userData.pick && hits[0].object.userData.pick.kind;
        canvas.style.cursor = (k && k !== 'ground') ? 'pointer' : 'grab';
    }

    const projV = new THREE.Vector3();
    function nearestPetOnScreen(cx, cy, maxPx) {
        const rect = canvas.getBoundingClientRect();
        let best = null, bd = maxPx;
        pets.forEach(p => {
            if (p.state === 'BEING_SENT' || p.indoor || !p.model.visible) return;
            projV.set(p.pos.x, p.pos.y + 0.5 * petScale(p), p.pos.z).project(camera);
            if (projV.z > 1) return;
            const sx = rect.left + (projV.x + 1) / 2 * rect.width, sy = rect.top + (1 - projV.y) / 2 * rect.height;
            const d = Math.hypot(sx - cx, sy - cy);
            if (d < bd) { bd = d; best = p; }
        });
        return best;
    }
    function handleClick(cx, cy) {
        if (gameState !== 'PARK' || !kid) return;
        if (houseMode) { handleHouseClick(cx, cy); return; }
        const hits = raycastAt(cx, cy);
        if (build.active) {
            const gp = groundPointAt(cx, cy);
            const dh = hits.find(h => h.object.userData.pick && h.object.userData.pick.kind === 'deco');
            if (gp) build.onClick(gp.x, gp.z, dh ? dh.object.userData.pick.deco : null);
            return;
        }
        // 手指點的時候比較寬容：附近有動物就算點到牠
        if (lastTapType === 'touch' && !hits.some(h => h.object.userData.pick && h.object.userData.pick.kind === 'pet')) {
            const near = nearestPetOnScreen(cx, cy, 34);
            if (near) { onPetClick(near); return; }
        }
        for (const h of hits) {
            const pk = h.object.userData.pick;
            if (!pk) continue;
            if (pk.kind === 'pet') { onPetClick(pk.pet); return; }
            if (sendMode) continue; // 送人模式只點動物
            if (pk.kind === 'slide' || pk.kind === 'ferris' || pk.kind === 'swing') { kidPlay(pk.kind); return; }
            if (pk.kind === 'trough') { kidAddWater(); return; }
            if (pk.kind === 'bench') { closePetPanel(); kidSit(world.benches[pk.index]); return; }
            if (pk.kind === 'shop') { kidGoShop(); return; }
            if (pk.kind === 'feeder' || pk.kind === 'pond') { kidFeedFish(); return; }
            if (pk.kind === 'home') { kidGoHome(); return; }
            if (pk.kind === 'balloon') {
                const me = PetProfiles.current();
                toast(`🎈 這是 ${me ? me.icon + ' ' + me.name : '我'} 的樂園！`);
                const b = balloon.root.position;
                burst(b.x, b.y - 1.5, b.z, ['💖', '✨', '🎈', '⭐'], 10, 1.2);
                Audio3D.sfx('sparkle');
                return;
            }
            if (pk.kind === 'deco') {
                const d = pk.deco;
                if (d.id === 'trampoline') kidPlay('tramp');
                else kidWalkTo(d.x + 2, d.z + 2);
                return;
            }
            if (pk.kind === 'bath') {
                if (selectedPet) sendToBath(selectedPet);
                else { toast('🛁 先點一隻動物，再按資訊卡上的「洗澡」'); kidWalkTo(world.bath.stand.x, world.bath.stand.z); }
                return;
            }
            if (pk.kind === 'house' || pk.kind === 'ground') {
                closePetPanel();
                kidWalkTo(h.point.x, h.point.z);
                return;
            }
        }
    }

    function onPetClick(p) {
        if (sendMode) {
            if (eagle) { toast('大鳥正在忙，等一下喔！'); return; }
            setSendMode(false);
            startDelivery(p);
            return;
        }
        openPetPanel(p);
        if (p.state === 'HOME') { spawnFx('❤️', p.pos.x, p.pos.y + 1.4 * petScale(p) + 0.3, p.pos.z); sfxAt('pet', p.pos); petSay(p, true); track('pet'); return; }
        if (p.state === 'SLEEP') { spawnFx('🤫', p.pos.x, p.pos.y + 1.5 * petScale(p), p.pos.z); return; }
        spawnFx('❤️', p.pos.x, p.pos.y + 1.4 * petScale(p) + 0.3, p.pos.z);
        sfxAt('pet', p.pos);
        petSay(p, true);
        track('pet');
        if ((p.coinCd || 0) <= elapsed) { p.coinCd = elapsed + 20; addCoins(1, p.pos); }
        p.boredom = Math.max(0, p.boredom - 12);
        const busy = (p.act && p.act.locked) || p.state === 'MATING_JUMP' || p.state === 'BEING_SENT' || p.state === 'EAT' && p.data.eating;
        if (!busy && p.state !== 'FOLLOW_PARENT') setState(p, 'LOVED', { t: 2 });
        if (kid && !(kid.task && kid.task.act)) turnTo(kid, Math.atan2(p.pos.x - kid.pos.x, p.pos.z - kid.pos.z), 1);
    }

    // ---------------------------------------------------------
    //  HUD / 介面
    // ---------------------------------------------------------
    const $ = id => document.getElementById(id);
    const hud = $('hud');

    function toast(msg) {
        const box = $('toasts');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        box.appendChild(el);
        while (box.children.length > 4) box.removeChild(box.firstChild);
        setTimeout(() => el.classList.add('out'), 2600);
        setTimeout(() => el.remove(), 3100);
    }

    // 遊戲內建的對話框：opts = { title, text, input?, value?, okText?, cancelText? }
    // 回傳 Promise：按確定 → true (或輸入的文字)；按取消 → null
    function askDialog(opts) {
        return new Promise(resolve => {
            const wrap = $('dialog'), inp = $('dlg-input'), ok = $('dlg-ok'), cancel = $('dlg-cancel');
            $('dlg-title').textContent = opts.title || '';
            $('dlg-text').textContent = opts.text || '';
            ok.textContent = opts.okText || '確定';
            cancel.textContent = opts.cancelText || '取消';
            inp.classList.toggle('hidden', !opts.input);
            inp.value = opts.value || '';
            wrap.classList.remove('hidden');
            setTimeout(() => (opts.input ? inp : ok).focus(), 30);
            const done = v => {
                wrap.classList.add('hidden');
                ok.onclick = cancel.onclick = inp.onkeydown = wrap.onclick = null;
                Audio3D.sfx('click');
                resolve(v);
            };
            ok.onclick = () => done(opts.input ? inp.value : true);
            cancel.onclick = () => done(null);
            wrap.onclick = e => { if (e.target === wrap) done(null); };
            inp.onkeydown = e => {
                if (e.key === 'Enter') done(inp.value);
                else if (e.key === 'Escape') done(null);
            };
        });
    }

    function showBirthBanner(mom, dad, baby) {
        const el = document.createElement('div');
        el.className = 'birth-banner';
        el.innerHTML = `<div class="bb-emoji">${dad.emoji}<span>💕</span>${mom.emoji}<span>🍼</span><small>${baby.emoji}</small></div>
            <div class="bb-text"><b>${petName(dad)} 和 ${petName(mom)}</b><br>生了一隻小${baby.name}（${baby.gender === 'M' ? '♂ 男生' : '♀ 女生'}）！🎉</div>`;
        $('banners').appendChild(el);
        setTimeout(() => el.classList.add('out'), 5000);
        setTimeout(() => el.remove(), 5600);
    }

    function setSendMode(on) {
        sendMode = on;
        $('send-banner').classList.toggle('hidden', !on);
        $('btn-send').classList.toggle('active', on);
    }

    // 食物列
    function buildFoodBar() {
        const bar = $('food-bar');
        bar.innerHTML = '';
        FOOD_TYPES.forEach(f => {
            const b = document.createElement('button');
            b.className = 'food-btn';
            b.dataset.food = f;
            b.innerHTML = `<span class="fe">${f}</span><span class="fn">${FOOD_NAMES[f]}</span>`;
            b.addEventListener('click', () => {
                dropFood(f);
                b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
            });
            bar.appendChild(b);
        });
        // 特別點心：寵物餅乾 (在小吃店買)
        const c = document.createElement('button');
        c.className = 'food-btn special';
        c.id = 'cookie-btn';
        c.innerHTML = '<span class="fe">🍪</span><span class="fn">餅乾</span><em class="cnt">0</em>';
        c.title = '寵物餅乾：每種動物都愛吃！(在小吃店買)';
        c.addEventListener('click', () => {
            if (inventory.cookie <= 0) { toast('🍪 餅乾吃完了，去 🏪 小吃店買吧！'); Audio3D.sfx('error'); return; }
            if (dropFood('🍪')) { inventory.cookie--; updateFoodBarSpecial(); }
            c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
        });
        bar.appendChild(c);
        [['ball', '🎾', '網球'], ['frisbee', '🥏', '飛盤']].forEach(([t, e, name]) => {
            const b = document.createElement('button');
            b.className = 'food-btn toy hidden';
            b.id = 'toy-' + t;
            b.innerHTML = `<span class="fe">${e}</span><span class="fn">${name}</span>`;
            b.title = `丟${name}：動物會跑去撿回來`;
            b.addEventListener('click', () => { throwToy(t); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
            bar.appendChild(b);
        });
        updateFoodBarSpecial();
        updateToyButtons();
    }
    function updateFoodBarSpecial() {
        const c = document.getElementById('cookie-btn');
        if (!c) return;
        c.querySelector('.cnt').textContent = inventory.cookie;
        c.classList.toggle('empty', inventory.cookie <= 0);
    }
    function updateFoodHints() {
        const liked = selectedPet ? selectedPet.eats : null;
        document.querySelectorAll('.food-btn').forEach(b => {
            const f = b.dataset.food;
            b.classList.toggle('liked', !!(liked && liked.includes(f)));
            const fans = [...new Set(pets.filter(p => p.eats.includes(f)).map(p => p.emoji))];
            b.title = `${FOOD_NAMES[f]}：` + (fans.length ? '喜歡的有 ' + fans.join('') : '樂園裡還沒有動物喜歡吃');
        });
    }

    // ---------- 依裝置調整版面 (平板 / 手機) ----------
    //  compact：觸控裝置或比較窄的螢幕 → 少用的按鈕收進「☰ 更多」
    //  phone：手機 → 按鈕只顯示圖示、寵物卡從下面滑上來
    const HUD_PRIO = { adopt: 1, water: 1, shop: 1, quests: 1, home: 1, book: 2, build: 2, kid: 3, send: 3, labels: 3, camera: 3, quality: 3, music: 3, sfx: 3 };
    const hudBtnList = [...document.querySelectorAll('#hud-buttons > button[data-act]')].filter(b => b.dataset.act !== 'more');
    function applyLayout() {
        const w = window.innerWidth, h = window.innerHeight;
        const phone = w <= 600 || h <= 500;
        const compact = isTouch || w <= 1024 || phone;
        const body = document.body;
        body.classList.toggle('compact', compact);
        body.classList.toggle('phone', phone);
        body.classList.toggle('phone-land', phone && w > h);
        body.classList.toggle('touch', isTouch);
        const row = $('hud-buttons'), menu = $('more-menu'), more = $('btn-more');
        hudBtnList.forEach(b => {
            const p = HUD_PRIO[b.dataset.act] || 1;
            const toMenu = compact && (p === 3 || (p === 2 && phone));
            if (toMenu) menu.appendChild(b); else row.insertBefore(b, more);
        });
        more.classList.toggle('hidden', !compact);
        if (!compact) toggleMoreMenu(false);
    }
    function toggleMoreMenu(force) {
        const menu = $('more-menu');
        const open = force === undefined ? menu.classList.contains('hidden') : force;
        menu.classList.toggle('hidden', !open);
        $('btn-more').classList.toggle('active', open);
    }
    window.addEventListener('resize', applyLayout);
    applyLayout();
    canvas.addEventListener('pointerdown', () => toggleMoreMenu(false));

    $('hud-buttons').addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const act = btn.dataset.act;
        if (act === 'more') { Audio3D.sfx('click'); toggleMoreMenu(); return; }
        if (act === 'music') { $('btn-music').click(); return; }
        if (act === 'sfx') { $('btn-sfx').click(); return; }
        Audio3D.sfx('click');
        if (btn.parentNode.id === 'more-menu') toggleMoreMenu(false);
        if (act === 'adopt') openAdoptMenu(true);
        else if (act === 'kid') openKidMenu(true);
        else if (act === 'water') kidAddWater();
        else if (act === 'send') {
            if (eagle) { toast('大鳥正在忙，等一下喔！'); return; }
            if (!pets.length) { toast('樂園裡還沒有動物喔'); return; }
            setSendMode(!sendMode);
        } else if (act === 'labels') {
            showLabels = !showLabels;
            btn.classList.toggle('active', !showLabels);
        } else if (act === 'camera') { if (houseMode) animateCam(houseViewCam(), 0.6); else resetCamera(); }
        else if (act === 'shop') kidGoShop();
        else if (act === 'quests') { if (questOpen) closeQuests(); else openQuests(); }
        else if (act === 'book') { if (bookOpen) closeBook(); else openBook(); }
        else if (act === 'build') { if (build.active) build.stop(); else if (kid && kid.indoor) toast('🏠 在家裡不能佈置樂園，先出門喔'); else { closeAllPanels(); setSendMode(false); build.start(); } }
        else if (act === 'home') { if (kid && kid.indoor) kidLeaveHome(); else kidGoHome(); }
        else if (act === 'quality') {
            quality = quality === 'high' ? 'normal' : 'high';
            try { localStorage.setItem('petQuality', quality); } catch (err) { /* ignore */ }
            applyQuality();
            toast(quality === 'high' ? '✨ 高畫質：環境遮蔽 + 光暈 + 柔和陰影' : '⚡ 一般畫質：比較順暢');
        }
    });

    // 寵物資訊卡
    function openPetPanel(p) {
        selectedPet = p;
        if ($('pp-wardrobe')) $('pp-wardrobe').classList.add('hidden');
        $('pet-panel').classList.remove('hidden');
        updatePetPanel();
        updateFoodHints();
    }
    function closePetPanel() {
        selectedPet = null;
        $('pet-panel').classList.add('hidden');
        updateFoodHints();
    }
    function bar(label, value, color) {
        return `<div class="bar-row"><span>${label}</span><div class="bar"><i style="width:${clamp(value, 0, 100)}%;background:${color}"></i></div></div>`;
    }
    function updatePetPanel() {
        const p = selectedPet;
        if (!p) return;
        const mood = moodOf(p);
        const moodEmoji = mood > 75 ? '😄' : mood > 55 ? '🙂' : mood > 35 ? '😐' : '😢';
        const grow = p.isAdult ? '成年 🌟' : `幼崽 🍼 ${Math.floor(p.age / ADULT_AGE * 100)}%`;
        $('pp-title').innerHTML = `${p.emoji} ${petName(p)} <span class="${p.gender === 'M' ? 'male' : 'female'}">${p.gender === 'M' ? '♂' : '♀'}</span>`;
        $('pp-sub').textContent = `${p.variant ? PetModels.VARIANTS[p.variant].icon + PetModels.VARIANTS[p.variant].name : ''}${p.name}｜${grow}｜心情 ${moodEmoji}`;
        $('pp-state').textContent = STATE_TEXT[p.state] || '';
        $('pp-bars').innerHTML =
            bar('🍖 飽足', 100 - p.hunger, '#ff9f43') +
            bar('💧 水分', 100 - p.thirst, '#3ba7ff') +
            bar('🎈 開心', 100 - p.boredom, '#ff6b9a') +
            bar('🚽 尿意', p.bladder, '#a07cff') +
            bar('🛁 乾淨', 100 - (p.dirt || 0), '#4dd0e1');
        $('pp-eats').textContent = '愛吃：' + p.eats.map(f => f + FOOD_NAMES[f]).join('、');
        $('pp-fav').textContent = favoriteUid === p.uid ? '💛 最愛中' : '🏠 設為最愛';
        $('pp-fav').classList.toggle('on', favoriteUid === p.uid);
        const bs = breedStatus(p);
        const love = $('pp-love');
        love.textContent = bs.text;
        love.className = bs.ok ? 'ok' : '';
    }
    $('pp-close').addEventListener('click', closePetPanel);
    // 手機：寵物卡往下滑就關掉
    (function () {
        const el = $('pet-panel');
        let sy = null;
        el.addEventListener('pointerdown', e => { sy = (e.pointerType !== 'mouse' && el.scrollTop <= 0) ? e.clientY : null; });
        el.addEventListener('pointerup', e => { if (sy !== null && e.clientY - sy > 70 && document.body.classList.contains('phone')) closePetPanel(); sy = null; });
        el.addEventListener('pointercancel', () => { sy = null; });
    })();
    $('shop-close').addEventListener('click', () => { Audio3D.sfx('click'); closeShop(); });
    $('quest-close').addEventListener('click', () => { Audio3D.sfx('click'); closeQuests(); });
    $('book-close').addEventListener('click', () => { Audio3D.sfx('click'); closeBook(); });
    $('book-tab-pets').addEventListener('click', () => { bookTab = 'pets'; Audio3D.sfx('click'); renderBook(); });
    $('book-tab-stickers').addEventListener('click', () => { bookTab = 'stickers'; Audio3D.sfx('click'); renderBook(); });
    $('pp-rename').addEventListener('click', async () => {
        const p = selectedPet;
        if (!p) return;
        const n = await askDialog({ title: '✏️ 幫牠取名字', text: `幫 ${petName(p)} 取個新名字吧（最多 8 個字）`, input: true, value: p.nick || '', okText: '取好了' });
        if (n === null) return;
        p.nick = n.trim().slice(0, 8);
        updatePetPanel();
        saveGame();
    });
    $('pp-send').addEventListener('click', async () => {
        const p = selectedPet;
        if (!p) return;
        if (eagle) { toast('大鳥正在忙，等一下喔！'); return; }
        const yes = await askDialog({ title: '🎁 送到新家', text: `確定要把 ${petName(p)} 送到新家嗎？大鳥會來接牠喔。`, okText: '送出', cancelText: '再想想' });
        if (yes && pets.indexOf(p) !== -1) startDelivery(p);
    });

    // 帶去洗澡
    function sendToBath(p) {
        if (!p || pets.indexOf(p) === -1) return;
        if (p.state === 'BATH') { toast('已經在洗澡了 🛁'); return; }
        if (isNight || p.state === 'SLEEP') { toast('🌙 牠在睡覺，明天再洗吧'); return; }
        if (p.state === 'BEING_SENT' || (p.act && p.act.locked)) { toast('牠正在忙，等一下再洗喔'); return; }
        if (p.dirt < 15) { toast(`✨ ${petName(p)} 很乾淨，不用洗澡喔`); return; }
        const free = world.bath.spots.filter(s => !s.occupant).length;
        if (!free) { toast('🛁 浴缸滿了，等一下再洗喔'); return; }
        setState(p, 'BATH');
        toast(`🛁 帶 ${petName(p)} 去洗香香！`);
        if (kid && !kidBusyLocked() && !(kid.task && kid.task.type === 'bathHelp')) {
            cancelKidTask();
            kid.task = { type: 'bathHelp' };
        }
    }
    $('pp-bath').addEventListener('click', () => sendToBath(selectedPet));

    // 打扮：衣櫃
    function renderWardrobe() {
        const p = selectedPet, box = $('pp-wardrobe');
        if (!p) return;
        const owned = Object.keys(PetModels.ACCESSORIES).filter(k => inventory.accs[k]);
        box.innerHTML = '';
        if (!owned.length) {
            box.innerHTML = '<span class="wd-empty">還沒有配件，去 🏪 小吃店買吧！</span>';
            return;
        }
        [null].concat(owned).forEach(k => {
            const b = document.createElement('button');
            const A = k ? PetModels.ACCESSORIES[k] : null;
            b.className = 'wd-btn' + ((p.acc || null) === k ? ' on' : '');
            b.innerHTML = A ? `${A.icon}<small>${A.name}</small>` : '🚫<small>不戴</small>';
            b.addEventListener('click', () => {
                if ((p.acc || null) === k) return;
                p.acc = k;
                PetModels.setAccessory(p.model, k);
                Audio3D.sfx(k ? 'sparkle' : 'click');
                if (k) {
                    spawnFx(A.icon, p.pos.x, p.pos.y + 1.7 * petScale(p), p.pos.z, { size: 0.8 });
                    track('dress');
                }
                renderWardrobe();
                saveGame();
            });
            box.appendChild(b);
        });
    }
    $('pp-dress').addEventListener('click', () => {
        const box = $('pp-wardrobe');
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) renderWardrobe();
    });

    function updateHUD() {
        const frac = dayTimer / DAY_LENGTH;
        $('time-fill').style.width = (frac * 100).toFixed(1) + '%';
        $('time-fill').style.background = isNight ? '#5b6fd6' : dayTimer > 960 ? '#ff9a5a' : '#ffd23f';
        const w = weather.icon();
        $('time-text').textContent = (isNight ? '🌙 睡覺時間' : dayTimer > 960 ? '🌅 傍晚' : '☀️ 白天') + (w ? '｜' + w : '');
        $('day-label').textContent = `第 ${dayCount} 天`;
        $('coin-stat').textContent = `🪙 ${coins}`;
        if (shopOpen) $('shop-coins').textContent = `🪙 ${coins}`;
        $('pet-count').textContent = `🐾 ${pets.length}/${MAX_PETS}`;
        const wl = Math.round(waterLevel);
        const ws = $('water-stat');
        ws.textContent = `💧 水 ${wl}%`;
        ws.classList.toggle('warn', wl < 20);
        if (wl < 20 && !waterWarned) { waterWarned = true; toast('⚠️ 水槽快沒水了！點「加水」或點水槽'); }
        if (selectedPet) updatePetPanel();
    }

    // ---------------------------------------------------------
    //  縮圖 (選單裡的 3D 角色照片)
    // ---------------------------------------------------------
    let thumbR = null, thumbScene = null, thumbCam = null;
    const thumbCache = {};
    function thumbnail(key, buildFn) {
        if (thumbCache[key]) return thumbCache[key];
        if (!thumbR) {
            const cv = document.createElement('canvas');
            thumbR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
            thumbR.setSize(200, 200, false);
            thumbR.outputEncoding = THREE.sRGBEncoding;
            thumbR.toneMapping = THREE.ACESFilmicToneMapping;
            thumbScene = new THREE.Scene();
            thumbScene.environment = PetWorld.makeEnvironment(thumbR);
            thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x99aa88, 0.35));
            const dl = new THREE.DirectionalLight(0xfff4e0, 1.9);
            dl.position.set(3, 5, 6);
            thumbScene.add(dl);
            thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        }
        const model = buildFn();
        model.rotation.y = -0.55;
        animateRig(model.userData.rig, 'idle', 0.016, 0);
        thumbScene.add(model);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const r = Math.max(size.x, size.y, size.z) * 0.5;
        const d = r / Math.tan(THREE.MathUtils.degToRad(15)) * 1.15;
        thumbCam.position.set(center.x, center.y + r * 0.45, center.z + d);
        thumbCam.lookAt(center);
        thumbR.render(thumbScene, thumbCam);
        const url = thumbR.domElement.toDataURL('image/png');
        thumbScene.remove(model);
        thumbCache[key] = url;
        return url;
    }

    // ---------------------------------------------------------
    //  選單畫面
    // ---------------------------------------------------------
    function showScreen(state) {
        if (state === 'PARK' && gameState !== 'PARK' && !houseMode) resetCamera();
        if (state === 'PARK') { refreshQuests(false); updateToyButtons(); updateFoodBarSpecial(); }
        gameState = state;
        $('menu-start').classList.toggle('hidden', state !== 'START_MENU');
        $('menu-kid').classList.toggle('hidden', state !== 'SELECT_KID');
        $('menu-adopt').classList.toggle('hidden', state !== 'ADOPT_PET');
        hud.classList.toggle('hidden', state !== 'PARK');
        document.body.classList.toggle('in-park', state === 'PARK');
        if (state !== 'PARK') { setSendMode(false); }
        if (state === 'PARK') updateFoodHints();
    }

    let kidMenuFromPark = false;
    function openKidMenu(fromPark) {
        kidMenuFromPark = fromPark;
        const grid = $('kid-grid');
        if (!grid.children.length) {
            KIDS.forEach(k => {
                const c = document.createElement('button');
                c.className = 'card kid-card';
                c.innerHTML = `<img alt="" src="${thumbnail('kid_' + k.id, () => buildKid(k.id))}"><b>${k.label}</b>`;
                c.addEventListener('click', () => selectKid(k.id));
                grid.appendChild(c);
            });
        }
        $('kid-cancel').classList.toggle('hidden', !(fromPark && kid));
        showScreen('SELECT_KID');
    }
    function selectKid(id) {
        Audio3D.sfx('adopt');
        if (kidMenuFromPark && kid) {
            replaceKid(id);
            showScreen('PARK');
            saveGame();
        } else {
            if (kid) replaceKid(id); else createKid(id, 0, 3);
            openAdoptMenu(false);
        }
    }
    $('kid-cancel').addEventListener('click', () => showScreen('PARK'));

    let adoptFromPark = false;
    let pendingAdopt = [];
    function openAdoptMenu(fromPark) {
        adoptFromPark = fromPark;
        pendingAdopt = [];
        const grid = $('pet-grid');
        if (!grid.children.length) {
            PET_DB.forEach(pd => {
                const c = document.createElement('button');
                c.className = 'card pet-card';
                c.innerHTML = `<img alt="" src="${thumbnail('pet_' + pd.id, () => buildPet(pd.id))}"><b>${pd.name}</b><small>愛吃 ${pd.eats.join('')}</small><em class="count"></em>`;
                c.addEventListener('click', () => {
                    if (pets.length + pendingAdopt.length >= MAX_PETS) { menuToast(`樂園最多只能住 ${MAX_PETS} 隻喔！`); return; }
                    pendingAdopt.push(pd.id);
                    Audio3D.petVoice(pd.id, { force: true });
                    Audio3D.sfx('adopt');
                    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
                    renderTray();
                });
                c.dataset.id = pd.id;
                grid.appendChild(c);
            });
        }
        $('adopt-cancel').classList.toggle('hidden', !fromPark);
        $('adopt-go').textContent = fromPark ? '帶回樂園 🏡' : '出發去樂園！🚀';
        renderTray();
        showScreen('ADOPT_PET');
    }
    function renderTray() {
        const list = $('tray-list');
        list.innerHTML = '';
        if (!pendingAdopt.length) {
            list.innerHTML = '<span class="tray-empty">點上面的動物來領養（可以重複選喔！）</span>';
        }
        pendingAdopt.forEach((id, i) => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.innerHTML = `${PET_BY_ID[id].emoji} ${PET_BY_ID[id].name} <span>✕</span>`;
            chip.title = '點一下取消';
            chip.addEventListener('click', () => { pendingAdopt.splice(i, 1); renderTray(); });
            list.appendChild(chip);
        });
        const counts = {};
        pendingAdopt.forEach(id => counts[id] = (counts[id] || 0) + 1);
        document.querySelectorAll('.pet-card').forEach(c => {
            const n = counts[c.dataset.id] || 0;
            c.querySelector('.count').textContent = n ? '×' + n : '';
            c.classList.toggle('chosen', n > 0);
        });
        $('adopt-sub').textContent = `主人：${kid ? kid.label : ''}｜樂園裡有 ${pets.length} 隻｜這次選了 ${pendingAdopt.length} 隻｜最多 ${MAX_PETS} 隻｜💕 同一種領養兩隻，會自動一公一母，長大後就能生寶寶`;
        $('adopt-go').disabled = !adoptFromPark && pendingAdopt.length === 0;
    }
    function menuToast(msg) {
        const el = $('menu-toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(menuToast.t);
        menuToast.t = setTimeout(() => el.classList.remove('show'), 1800);
    }
    $('adopt-go').addEventListener('click', () => {
        if (!adoptFromPark && pendingAdopt.length === 0) { menuToast('要先至少選擇一隻寵物喔！'); return; }
        // 新寵物從入口走進來
        pendingAdopt.forEach((id, i) => {
            const males = pets.filter(x => x.id === id && x.gender === 'M').length;
            const females = pets.filter(x => x.id === id && x.gender === 'F').length;
            const gender = males === females ? (Math.random() < 0.5 ? 'M' : 'F') : (males < females ? 'M' : 'F');
            const p = createPet(id, { x: rand(-1.5, 1.5), z: BOUNDS.maxZ - 0.8 - (i % 4) * 0.5, yaw: Math.PI, gender });
            setState(p, 'WANDER', { target: { x: rand(-5, 5), z: rand(-2, 6) }, speed: 2.6, thinkT: 2 });
        });
        if (pendingAdopt.length) toast(`🎉 歡迎 ${pendingAdopt.length} 位新朋友來到樂園！`);
        pendingAdopt = [];
        showScreen('PARK');
        saveGame();
        maybeShowTip();
    });
    $('adopt-cancel').addEventListener('click', () => showScreen('PARK'));

    // ---------- 誰要來玩 (玩家) ----------
    let pfEditing = null, pfIcon = '🧒';
    function renderPlayers() {
        const box = $('player-list');
        box.innerHTML = '';
        const list = PetProfiles.list(), me = PetProfiles.current();
        list.forEach(p => {
            const sm = PetProfiles.summary(p.id);
            const c = document.createElement('div');
            c.className = 'player-card' + (me && me.id === p.id ? ' on' : '');
            c.tabIndex = 0;
            c.innerHTML = `<span class="pc-icon"></span><b class="pc-name"></b><small>${sm ? `第 ${sm.day} 天・🐾 ${sm.pets} 隻` : '還沒開始玩'}</small>
                <span class="pc-tools"><button type="button" class="pc-out" title="匯出進度 (帶到別台裝置)">📤</button><button type="button" class="pc-edit" title="改名字">✏️</button><button type="button" class="pc-del" title="刪除玩家">🗑️</button></span>`;
            c.querySelector('.pc-icon').textContent = p.icon;
            c.querySelector('.pc-name').textContent = p.name;
            const choose = () => { PetProfiles.setCurrent(p.id); Audio3D.sfx('click'); renderPlayers(); };
            c.addEventListener('click', choose);
            c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
            c.querySelector('.pc-edit').addEventListener('click', e => { e.stopPropagation(); openPlayerForm(p); });
            c.querySelector('.pc-out').addEventListener('click', e => { e.stopPropagation(); Audio3D.sfx('click'); exportPlayer(p); });
            c.querySelector('.pc-del').addEventListener('click', async e => {
                e.stopPropagation();
                const yes = await askDialog({ title: '🗑️ 刪除玩家', text: `確定要刪除「${p.name}」嗎？${p.name} 的樂園進度會全部不見喔！`, okText: '刪除', cancelText: '取消' });
                if (!yes) return;
                PetProfiles.remove(p.id);
                renderPlayers();
            });
            box.appendChild(c);
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'player-card add';
        add.innerHTML = '<span class="pc-icon">➕</span><b class="pc-name">新增玩家</b><small>每個人的進度分開</small>';
        add.addEventListener('click', () => openPlayerForm(null));
        box.appendChild(add);
        const has = me && PetProfiles.summary();
        const cont = $('btn-continue');
        cont.disabled = !me;
        cont.textContent = !me ? '先新增一個玩家 👆' : has ? `繼續 ${me.name} 的樂園 🎮` : `${me.name} 開始玩 🎮`;
        $('btn-new').classList.toggle('hidden', !has);
        if (me) balloon.setName(me.name);
        if (!list.length) openPlayerForm(null);
    }
    function openPlayerForm(p) {
        pfEditing = p;
        pfIcon = p ? p.icon : PetProfiles.ICONS[PetProfiles.list().length % PetProfiles.ICONS.length];
        $('pf-title').textContent = p ? `✏️ 修改「${p.name}」` : '➕ 新增玩家';
        $('pf-name').value = p ? p.name : '';
        const ic = $('pf-icons');
        ic.innerHTML = '';
        PetProfiles.ICONS.forEach(e => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = e;
            b.className = e === pfIcon ? 'on' : '';
            b.addEventListener('click', () => { pfIcon = e; [...ic.children].forEach(x => x.classList.toggle('on', x === b)); });
            ic.appendChild(b);
        });
        $('pf-cancel').classList.toggle('hidden', !PetProfiles.list().length);
        $('player-form').classList.remove('hidden');
        setTimeout(() => $('pf-name').focus(), 50);
    }
    $('player-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = $('pf-name').value.trim();
        if (!name) { toast('✏️ 請輸入名字'); return; }
        if (pfEditing) PetProfiles.rename(pfEditing.id, name, pfIcon);
        else PetProfiles.add(name, pfIcon);
        Audio3D.sfx('ding');
        $('player-form').classList.add('hidden');
        renderPlayers();
    });
    $('pf-cancel').addEventListener('click', () => { $('player-form').classList.add('hidden'); });

    // ---------- 搬家：把進度變成一段代碼，帶到別台裝置 ----------
    //  代碼格式：PETPARKZ:<gzip+base64>  (不支援壓縮的瀏覽器用 PETPARKJ:<base64>)
    const bytesToB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
    const b64ToBytes = b64 => { const s = atob(b64); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };
    async function pipeBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
    async function packProgress(p) {
        let raw = null;
        try { raw = localStorage.getItem(PetProfiles.saveKey(p.id)); } catch (e) { raw = null; }
        if (!raw) return null;
        const json = JSON.stringify({ v: 1, name: p.name, icon: p.icon, at: Date.now(), save: raw });
        let bytes = new TextEncoder().encode(json);
        if (window.CompressionStream) {
            try { return 'PETPARKZ:' + bytesToB64(await pipeBytes(bytes, new CompressionStream('gzip'))); } catch (e) { /* 用沒壓縮的 */ }
        }
        return 'PETPARKJ:' + bytesToB64(bytes);
    }
    async function unpackProgress(code) {
        code = String(code || '').replace(/\s+/g, '');
        const m = code.match(/^PETPARK([ZJ]):([A-Za-z0-9+/=]+)$/);
        if (!m) throw new Error('這不是寵物樂園的進度代碼');
        let bytes = b64ToBytes(m[2]);
        if (m[1] === 'Z') {
            if (!window.DecompressionStream) throw new Error('這台裝置的瀏覽器太舊，請先更新系統');
            bytes = await pipeBytes(bytes, new DecompressionStream('gzip'));
        }
        const d = JSON.parse(new TextDecoder().decode(bytes));
        const s = JSON.parse(d.save);
        if (!d.name || !s || !Array.isArray(s.pets)) throw new Error('代碼不完整，請重新複製一次');
        return d;
    }
    function openXfer(opts) {
        $('xfer-title').textContent = opts.title;
        $('xfer-text').textContent = opts.text;
        const ta = $('xfer-code');
        ta.value = opts.code || '';
        ta.readOnly = !!opts.readOnly;
        ta.placeholder = opts.placeholder || '';
        const box = $('xfer-actions');
        box.innerHTML = '';
        opts.buttons.forEach(b => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = b.cls || 'primary';
            el.textContent = b.label;
            el.addEventListener('click', b.onClick);
            box.appendChild(el);
        });
        $('xfer').classList.remove('hidden');
    }
    const closeXfer = () => $('xfer').classList.add('hidden');
    $('xfer').addEventListener('click', e => { if (e.target.id === 'xfer') closeXfer(); });

    async function exportPlayer(p) {
        const code = await packProgress(p);
        if (!code) { toast(`${p.name} 還沒有進度可以匯出喔`); return; }
        const sm = PetProfiles.summary(p.id) || { day: 1, pets: 0 };
        openXfer({
            title: `📤 匯出 ${p.icon} ${p.name} 的進度`,
            text: `第 ${sm.day} 天・🐾 ${sm.pets} 隻。把下面這段代碼傳到另一台裝置（例如用 LINE 或 email 傳給自己），在那台裝置按「📥 從別的裝置匯入進度」貼上就好了！`,
            code, readOnly: true,
            buttons: [
                { label: '📋 複製代碼', onClick: () => copyXfer(code) },
                { label: '💾 存成檔案', cls: 'ghost', onClick: () => downloadXfer(p, code) },
                { label: '關閉', cls: 'ghost', onClick: closeXfer },
            ],
        });
        Audio3D.sfx('ding');
    }
    function copyXfer(code) {
        const ta = $('xfer-code');
        const fallback = () => {
            ta.focus(); ta.select(); ta.setSelectionRange(0, code.length);
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            toast(ok ? '📋 已複製！可以貼到 LINE 或 email 了' : '請長按代碼 →「全選」→「拷貝」');
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => toast('📋 已複製！可以貼到 LINE 或 email 了'), fallback);
        } else fallback();
    }
    function downloadXfer(p, code) {
        try {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
            const d = new Date();
            a.download = `寵物樂園-${p.name}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.txt`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            toast('💾 已存成檔案');
        } catch (e) { toast('這裡不能存檔案，請改用「複製代碼」'); }
    }
    function openImport() {
        openXfer({
            title: '📥 從別的裝置匯入進度',
            text: '在原本的裝置按玩家卡片上的 📤 匯出，把代碼傳過來，貼在下面（或選擇存好的檔案）。',
            code: '', readOnly: false, placeholder: '把 PETPARK 開頭的代碼貼在這裡',
            buttons: [
                { label: '✅ 匯入', onClick: () => doImport($('xfer-code').value) },
                { label: '📂 選擇檔案', cls: 'ghost', onClick: () => $('xfer-file').click() },
                { label: '取消', cls: 'ghost', onClick: closeXfer },
            ],
        });
        setTimeout(() => $('xfer-code').focus(), 50);
    }
    $('xfer-file').addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        const r = new FileReader();
        r.onload = () => { $('xfer-code').value = String(r.result || '').trim(); doImport($('xfer-code').value); };
        r.readAsText(f);
    });
    async function doImport(code) {
        let d;
        try { d = await unpackProgress(code); } catch (e) { toast('❌ ' + (e && e.message && /[一-鿿]/.test(e.message) ? e.message : '代碼不正確，請重新複製一次')); Audio3D.sfx('error'); return; }
        closeXfer();
        const sm = (() => { try { const s = JSON.parse(d.save); return { day: s.dayCount || 1, pets: s.pets.length }; } catch (e) { return { day: 1, pets: 0 }; } })();
        const same = PetProfiles.list().find(p => p.name === d.name);
        let target = null;
        if (same) {
            const yes = await askDialog({ title: `📥 已經有「${d.name}」了`, text: `要用匯入的進度（第 ${sm.day} 天・🐾 ${sm.pets} 隻）取代這台裝置上「${d.name}」的進度嗎？選「另外新增」會變成一個新玩家。`, okText: '取代', cancelText: '另外新增' });
            if (yes) target = same;
        }
        if (!target) {
            let name = d.name, k = 2;
            while (PetProfiles.list().some(p => p.name === name)) name = `${d.name.slice(0, 7)}${k++}`;
            target = PetProfiles.add(name, d.icon || '🧒');
        }
        try { localStorage.setItem(PetProfiles.saveKey(target.id), d.save); } catch (e) { toast('❌ 這台裝置存不了資料（可能是無痕模式）'); return; }
        PetProfiles.setCurrent(target.id);
        renderPlayers();
        toast(`🎉 匯入完成！歡迎 ${target.icon} ${target.name}（第 ${sm.day} 天・🐾 ${sm.pets} 隻）`);
        Audio3D.sfx('fanfare');
    }
    $('btn-import').addEventListener('click', () => { Audio3D.sfx('click'); openImport(); });

    $('btn-continue').addEventListener('click', () => {
        const me = PetProfiles.current();
        if (!me) { toast('👤 先建立一個玩家喔'); return; }
        balloon.setName(me.name);
        if (!PetProfiles.summary()) { resetGame(); openKidMenu(false); return; }   // 新玩家：直接選小主人
        if (loadGame()) { showScreen('PARK'); maybeShowTip(); toast(`${me.icon} 歡迎回來，${me.name}！`); }
        else { toast('存檔讀取失敗，開始新遊戲'); resetGame(); openKidMenu(false); }
    });
    $('btn-new').addEventListener('click', async () => {
        const me = PetProfiles.current();
        if (!me) return;
        const yes = await askDialog({ title: '✨ 開始新遊戲', text: `確定要讓「${me.name}」重新開始嗎？${me.name} 的舊存檔會被清除喔！(其他玩家的進度不受影響)`, okText: '重新開始', cancelText: '取消' });
        if (!yes) return;
        try { localStorage.removeItem(saveKey()); } catch (e) { /* ignore */ }
        resetGame();
        openKidMenu(false);
    });

    function maybeShowTip() {
        let seen = false;
        try { seen = localStorage.getItem('petGameTip3D') === '1'; } catch (e) { /* ignore */ }
        if (seen) return;
        $('help-tip').classList.remove('hidden');
    }
    $('tip-close').addEventListener('click', () => {
        $('help-tip').classList.add('hidden');
        try { localStorage.setItem('petGameTip3D', '1'); } catch (e) { /* ignore */ }
    });

    // ---------------------------------------------------------
    //  存檔 / 讀檔
    // ---------------------------------------------------------
    function saveGame() {
        if (!kid) return;
        const data = {
            v: 2,
            kid: { id: kid.id, x: kid.pos.x, z: kid.pos.z },
            pets: pets.filter(p => p.state !== 'BEING_SENT').map(p => ({
                uid: p.uid, id: p.id, nick: p.nick, gender: p.gender, variant: p.variant, age: p.age, isAdult: p.isAdult,
                hunger: p.hunger, thirst: p.thirst, boredom: p.boredom, bladder: p.bladder, dirt: p.dirt, acc: p.acc,
                toiletCooldown: p.toiletCooldown, trickTimer: p.trickTimer, breedCooldown: p.breedCooldown,
                x: p.pos.x, z: p.pos.z, yaw: p.yaw,
                follow: p.state === 'FOLLOW_PARENT' ? p.followParentTimer : 0,
                parent: p.parent ? p.parent.uid : null,
            })),
            dayTimer, dayCount, waterLevel,
            coins, cookie: inventory.cookie, toys: inventory.toys, accs: inventory.accs,
            stats, book, achieved, quests,
            decos: build.serialize(),
            favoriteUid, fridgeDay,
            foods: foods.filter(f => f.landed).map(f => ({ emoji: f.emoji, x: f.x, z: f.z, age: f.age })),
        };
        try { localStorage.setItem(saveKey(), JSON.stringify(data)); } catch (e) { /* ignore */ }
    }

    // 舊版 (2D) 存檔轉換
    function migrateV1(s) {
        const toX = x => clamp((x - 600) / 20, BOUNDS.minX + 1, BOUNDS.maxX - 1);
        const toZ = y => clamp((y - 400) / 20, BOUNDS.minZ + 1, BOUNDS.maxZ - 1);
        return {
            v: 2,
            kid: { id: (s.kid && KID_BY_ID[s.kid.id]) ? s.kid.id : 'boy_cute', x: s.kid && s.kid.x ? toX(s.kid.x) : 0, z: s.kid && s.kid.y ? toZ(s.kid.y) : 3 },
            pets: (s.pets || []).filter(p => PET_BY_ID[p.id]).map(p => ({
                id: p.id, age: p.age || 0, isAdult: !!p.isAdult,
                thirst: p.thirst || 0, boredom: p.boredom || 0, bladder: p.bladder || 0,
                toiletCooldown: p.toiletCooldown || 0, trickTimer: p.circleKidTimer || 60,
                x: p.x ? toX(p.x) : rand(-8, 8), z: p.y ? toZ(p.y) : rand(-6, 6),
            })),
            dayTimer: s.dayTimer || 60, dayCount: 1,
            waterLevel: s.waterLevel != null ? s.waterLevel : 100,
            foods: (s.foods || []).map(f => ({ emoji: f.emoji, x: toX(f.x), z: toZ(f.y), age: 0 })),
        };
    }

    function resetGame() {
        pets.slice().forEach(p => removePet(p));
        pets = [];
        foods.slice().forEach(f => removeFood(f));
        foods = [];
        if (kid) { scene.remove(kid.model); scene.remove(kid.blob); disposeLabel(kid.nameSprite); kid = null; }
        if (eagle) { scene.remove(eagle.model); scene.remove(eagle.rope); scene.remove(eagle.basket); eagle = null; }
        world.sleepSpots.concat(world.drinkSpots, world.toiletSpots).forEach(s => s.occupant = null);
        world.ferris.gondolas.forEach(g => g.rider = null);
        world.swings.seats.forEach(s => { s.rider = null; s.reserved = null; });
        world.benches.forEach(b => b.occupant = null);
        coins = 30; inventory.cookie = 0; happyCoinTimer = 90;
        inventory.toys = { ball: false, frisbee: false };
        inventory.accs = {};
        build.stop();
        build.clear();
        if (houseMode) { houseMode = false; house.setView('outside'); document.body.classList.remove('in-house'); $('house-bar').classList.add('hidden'); }
        favoriteUid = null; fridgeDay = 0; sleptHome = false;
        world.bath.spots.forEach(s => s.occupant = null);
        stats = {}; book = { seen: {}, variants: {} }; achieved = {}; quests = { day: 0, list: [] };
        if (activeToy) returnToy(null);
        if (shopOpen) closeShop();
        dayTimer = 60; dayCount = 1; waterLevel = 100; breedTimer = 60; waterWarned = false;
        uidCounter = 1;
        closePetPanel();
    }

    function loadGame() {
        let s;
        try { s = JSON.parse(localStorage.getItem(saveKey())); } catch (e) { s = null; }
        if (!s) return false;
        try {
            if (s.v === 1) s = migrateV1(s);
            if (s.v !== 2) return false;
            resetGame();
            createKid(KID_BY_ID[s.kid.id] ? s.kid.id : 'boy_cute', s.kid.x, s.kid.z);
            world.resolveObstacles(kid.pos, 0.6);
            coins = typeof s.coins === 'number' ? s.coins : 30;
            inventory.cookie = s.cookie || 0;
            inventory.toys = Object.assign({ ball: false, frisbee: false }, s.toys || {});
            inventory.accs = s.accs || {};
            build.load(s.decos || []);
            favoriteUid = s.favoriteUid || null;
            fridgeDay = s.fridgeDay || 0;
            stats = s.stats || {};
            book = s.book && s.book.seen ? s.book : { seen: {}, variants: {} };
            achieved = s.achieved || {};
            quests = s.quests && s.quests.list ? s.quests : { day: 0, list: [] };
            updateFoodBarSpecial();
            const byUid = {};
            const follow = [];
            s.pets.forEach(d => {
                if (!PET_BY_ID[d.id]) return;
                const p = createPet(d.id, Object.assign({ silent: true }, d));
                world.resolveObstacles(p.pos, 0.6);
                byUid[p.uid] = p;
                if (d.follow > 0) follow.push([p, d]);
            });
            follow.forEach(([p, d]) => {
                const par = byUid[d.parent];
                if (par) { p.parent = par; p.followParentTimer = d.follow; setState(p, 'FOLLOW_PARENT'); }
            });
            dayTimer = s.dayTimer || 0;
            dayCount = s.dayCount || 1;
            waterLevel = s.waterLevel != null ? s.waterLevel : 100;
            (s.foods || []).forEach(f => addFoodDirect(f.emoji, f.x, f.z, f.age));
            return true;
        } catch (e) {
            console.warn('讀取存檔失敗', e);
            return false;
        }
    }

    window.addEventListener('beforeunload', saveGame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

    // ---------------------------------------------------------
    //  主迴圈
    // ---------------------------------------------------------
    let hudTimer = 0;
    let achieveTimer = 2;
    function dayAmounts() {
        const t = dayTimer;
        let night = 0, dusk = 0;
        if (t < 40) night = 1 - t / 40;                       // 清晨
        else if (t > 1050) night = Math.min(1, (t - 1050) / 60); // 入夜
        if (t > 930 && t <= 1110) dusk = t < 1050 ? (t - 930) / 120 : 1 - (t - 1050) / 60;
        if (t < 40) dusk = Math.max(dusk, Math.sin((t / 40) * Math.PI) * 0.6);
        return { night: clamp(night, 0, 1), dusk: clamp(dusk, 0, 1) };
    }

    function updatePark(dt) {
        dayTimer += dt;
        if (dayTimer >= DAY_LENGTH) {
            dayTimer -= DAY_LENGTH;
            dayCount++;
            toast(`☀️ 早安！第 ${dayCount} 天開始了`);
            Audio3D.sfx('morning');
            addCoins(Math.min(60, 10 + pets.length * 2) * (sleptHome ? 2 : 1), null, sleptHome ? '在家睡飽飽，零用錢加倍！' : '每日零用錢');
            sleptHome = false;
            refreshQuests(true);
            setTimeout(() => toast('📋 新的一天，有新的每日任務喔！'), 1500);
        }
        const wasNight = isNight;
        isNight = dayTimer >= NIGHT_START;
        if (isNight && !wasNight) { Audio3D.sfx('night'); toast('🌙 天黑了，大家回小窩睡覺囉～'); }
        Audio3D.setNight(isNight);

        if (!isNight) {
            breedTimer -= dt;
            if (breedTimer <= 0) { breedTimer = 30; breedingCheck(); }
        }

        updateKid(dt);
        for (let i = 0; i < pets.length; i++) {
            const p = pets[i];
            updatePet(p, dt);
        }
        separate();
        world.beds.forEach(b => { b.blanket.visible = false; });
        pets.forEach(p => applyPetVisual(p, dt));
        updateFoods(dt);
        if (eagle) updateEagle(dt);
        if (feedCooldown > 0) feedCooldown -= dt;
        updateToy(dt);
        if (houseMode && kid && kid.indoor) {
            const vf = kid.climb ? kid.climb.toFloor : kid.floor;
            if (vf !== house.viewFloor) { house.viewFloor = vf; renderHouseBar(); }
            if (!camAnim) cam.target.y += (house.floorY(vf) + 0.8 - cam.target.y) * Math.min(1, dt * 3);
            // ä¿éªï¼é¡é ­è·é¢æ¿å­å°±é£åä¾
            if (!camAnim && (Math.hypot(cam.target.x - house.x, cam.target.z - house.z) > 4.5 || cam.dist > distMax() + 1)) animateCam(houseViewCam(), 0.8);
        }
        const scrubbing = pets.some(p => p.state === 'BATH' && (p.data.phase === 'soak' || p.data.phase === 'scrub' || p.data.phase === 'rinse'));
        world.bath.foam += ((scrubbing ? 1 : 0.12) - world.bath.foam) * Math.min(1, dt * 1.5);
        achieveTimer -= dt;
        if (achieveTimer <= 0) { achieveTimer = 2; checkAchievements(); }
        // 下雨會慢慢幫水槽補水
        if (weather.rainAmt > 0.3 && waterLevel < 100) { waterLevel = Math.min(100, waterLevel + dt * 1.3 * weather.rainAmt); if (waterLevel > 20) waterWarned = false; }
        if (world.fishAte) Audio3D.sfx('gulp');
        // 動物們很開心 → 金幣
        happyCoinTimer -= dt;
        if (happyCoinTimer <= 0) {
            happyCoinTimer = 90;
            const happy = pets.filter(p => moodOf(p) >= 70).length;
            if (happy > 0) addCoins(Math.min(8, happy), kid ? kid.pos : null, `${happy} 隻動物很開心`);
        }

        // 選取光圈
        if (selectedPet) {
            const s = petScale(selectedPet);
            selRing.visible = true;
            selRing.position.set(selectedPet.pos.x, selectedPet.pos.y + 0.04, selectedPet.pos.z);
            selRing.scale.setScalar(s * (1 + Math.sin(elapsed * 5) * 0.08));
        } else selRing.visible = false;

        saveTimer += dt;
        if (saveTimer > 20) { saveTimer = 0; saveGame(); }
        hudTimer -= dt;
        if (hudTimer <= 0) { hudTimer = 0.25; updateHUD(); }
    }

    let last = performance.now();
    // ---------- 自動調整畫質：連續幾秒很卡就降一級 ----------
    let perfLast = 0, perfAcc = 0, perfFrames = 0, perfBad = 0, perfStage = 0;
    function watchPerformance(ms) {
        if (gameState !== 'PARK' || document.hidden || ms <= 0 || ms > 250) return;   // 切到背景或卡一下不算
        perfAcc += ms; perfFrames++;
        if (perfAcc < 4000) return;
        const fps = perfFrames * 1000 / perfAcc;
        perfAcc = 0; perfFrames = 0;
        perfBad = fps < 32 ? perfBad + 1 : 0;
        if (perfBad < 2 || perfStage >= 3) return;
        perfBad = 0; perfStage++;
        if (quality === 'high') {
            quality = 'normal';
            toast('⚡ 畫面有點卡，自動換成「一般」畫質');
        } else {
            perfScale = perfStage >= 3 ? 0.6 : 0.8;
        }
        applyQuality();
    }
    function loop(now) {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        elapsed += dt;
        if (gameState === 'PARK') updatePark(dt);
        Audio3D.ambience(dt, isNight);
        const { night, dusk } = dayAmounts();
        weather.update(dt, cam.target, night);
        build.update(dt, elapsed, night);
        birds.update(dt, elapsed, { night: isNight || night > 0.6, rain: weather.rainAmt });
        balloon.update(dt, elapsed, cam.yaw, night);
        house.update(dt, elapsed, cam.yaw, night);
        if (Audio3D.setWeather) Audio3D.setWeather(weather.rainAmt, weather.snowAmt);
        updateWorld(world, scene, dt, elapsed, dayTimer / DAY_LENGTH, night, dusk, waterLevel / 100);
        updateFx(dt);
        updateRainbows(dt);
        if (clickMarkerT > 0) {
            clickMarkerT -= dt;
            clickMarker.material.opacity = Math.max(0, clickMarkerT / 0.6);
            clickMarker.scale.setScalar(1 + (0.6 - clickMarkerT) * 1.5);
        }
        // 選單畫面時相機緩慢環繞
        updateCamAnim(dt);
        updateCamInertia(dt);
        watchPerformance(now - perfLast); perfLast = now;
        if (gameState !== 'PARK') cam.yaw += dt * 0.05;
        updateCamera();
        applyEnvIntensity(world.envIntensity);
        renderFrame();
        requestAnimationFrame(loop);
    }

    // ---------------------------------------------------------
    //  啟動
    // ---------------------------------------------------------
    // ---------- 聲音開關 (畫面右下角，所有畫面都看得到) ----------
    function updateSoundButtons() {
        const m = $('btn-music'), s = $('btn-sfx');
        m.classList.toggle('off', !Audio3D.musicOn);
        s.classList.toggle('off', !Audio3D.sfxOn);
        m.innerHTML = Audio3D.musicOn ? '🎵<span>音樂 開</span>' : '🔇<span>音樂 關</span>';
        s.innerHTML = Audio3D.sfxOn ? '🔊<span>音效 開</span>' : '🔈<span>音效 關</span>';
        m.title = Audio3D.musicOn ? '關閉背景音樂' : '開啟背景音樂';
        s.title = Audio3D.sfxOn ? '關閉寵物叫聲與音效' : '開啟寵物叫聲與音效';
        // 「更多」選單裡的同一組開關
        const mm = $('menu-music'), ms = $('menu-sfx');
        if (mm) mm.innerHTML = Audio3D.musicOn ? '<i>🎵</i><span>音樂 開</span>' : '<i>🔇</i><span>音樂 關</span>';
        if (ms) ms.innerHTML = Audio3D.sfxOn ? '<i>🔊</i><span>音效 開</span>' : '<i>🔈</i><span>音效 關</span>';
    }
    function initSoundControls() {
        if (!Audio3D.supported) { $('sound-ctl').classList.add('hidden'); return; }
        $('btn-music').addEventListener('click', () => {
            Audio3D.setMusic(!Audio3D.musicOn);
            Audio3D.sfx('click');
            updateSoundButtons();
        });
        $('btn-sfx').addEventListener('click', () => {
            Audio3D.setSfx(!Audio3D.sfxOn);
            Audio3D.sfx('click');
            updateSoundButtons();
        });
        updateSoundButtons();
    }

    function init() {
        initSoundControls();
        applyQuality();
        resetCamera();
        buildFoodBar();
        loadingEl.classList.add('hidden');
        // 先選「誰要來玩」(每個玩家的進度分開)
        renderPlayers();
        showScreen('START_MENU');
        requestAnimationFrame(loop);
    }
    init();

    // 除錯用
    window.__petPark = { get pets() { return pets; }, get kid() { return kid; }, get foods() { return foods; },
        setTime(t) { dayTimer = t; }, get state() { return gameState; }, save: saveGame,
        // 快轉模擬 (秒)
        tick(sec) {
            for (let t = 0; t < sec; t += 0.05) {
                elapsed += 0.05;
                updatePark(0.05);
                const a = dayAmounts();
                weather.update(0.05, cam.target, a.night);
                birds.update(0.05, elapsed, { night: isNight || a.night > 0.6, rain: weather.rainAmt });
                balloon.update(0.05, elapsed, cam.yaw, a.night);
                updateWorld(world, scene, 0.05, elapsed, dayTimer / DAY_LENGTH, a.night, a.dusk, waterLevel / 100);
                updateFx(0.05); updateRainbows(0.05); updateCamAnim(0.05);
            }
            updateCamera();
            applyEnvIntensity(world.envIntensity);
            renderFrame();
        },
        get quests() { return quests; }, get stats() { return stats; }, get book() { return book; }, get achieved() { return achieved; }, get toy() { return activeToy; }, inventory, throwToy, openQuests, openBook, buyItem, SHOP_ITEMS, giveBirth, openPetPanel, sendToBath, build, kidPlay, house, birds, balloon, kidGoHome, kidLeaveHome, useFurniture, kidHomeWalk, get houseMode() { return houseMode; }, setFavorite(uid) { favoriteUid = uid; },
        cam, camera, world, renderer, scene, weather, spawnRainbow, dropFood, startDelivery, addCoins, openShop, kidSit, kidFeedFish, kidPlay, kidGoShop, get coins() { return coins; }, get water() { return waterLevel; }, get eagle() { return eagle; } };
})();
