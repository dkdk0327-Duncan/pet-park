// =============================================================
//  歡樂大廳 － 寵物樂園主打卡片的「即時 3D 預覽」與存檔資訊
// =============================================================
(function () {
    // ---------- 上次的寵物樂園進度 ----------
    // 每個玩家的進度 (pet-profiles.js)
    try {
        const P = window.PetProfiles;
        const parts = (P ? P.list() : []).map(p => {
            const sm = P.summary(p.id);
            return `${p.icon} ${p.name}` + (sm ? ` 第 ${sm.day} 天・🐾 ${sm.pets}` : '');
        });
        if (parts.length) document.getElementById('save-info').textContent = '📒 ' + parts.join('｜');
    } catch (e) { /* 沒有存檔 */ }

    document.querySelector('.hero').addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') location.href = 'pet.html';
    });

    // ---------- 3D 預覽 ----------
    if (typeof THREE === 'undefined' || !window.PetModels) return; // 沒網路時顯示 emoji 備案
    const stage = document.querySelector('.hero-stage');
    const canvas = document.getElementById('hero-canvas');
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 4.2, 9.5);
    camera.lookAt(0, 0.6, 0);

    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x4a3a6a, 0.55));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.6);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 0.9);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const { part, mat } = PetModels;
    // 旋轉的小草地舞台
    const island = new THREE.Group();
    scene.add(island);
    const top = part('cyl', 0x7fd35a, [3.6, 0.35, 3.6], [0, -0.18, 0], island, { kind: 'fur' });
    top.receiveShadow = true;
    part('cyl', 0xa8743e, [3.5, 0.9, 3.5], [0, -0.75, 0], island, { kind: 'wood' });
    part('cone', 0x8a5a2e, [3.4, 1.6, 3.4], [0, -2.0, 0], island, { rot: [Math.PI, 0, 0], kind: 'wood' });
    // 小花與小樹
    const flowerC = [0xff6b9a, 0xffd166, 0xffffff, 0xb388ff];
    for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 2.2;
        part('sphere', flowerC[i % 4], [0.09, 0.09, 0.09], [Math.cos(a) * r, 0.08, Math.sin(a) * r], island, { shadow: false });
    }
    [[-2.6, -1.4], [2.7, -1.0]].forEach(([x, z]) => {
        part('cyl', 0x8b5a2b, [0.12, 0.9, 0.12], [x, 0.45, z], island, { kind: 'wood' });
        part('sphere', 0x4caf50, [0.6, 0.55, 0.6], [x, 1.15, z], island);
        part('sphere', 0x66bb6a, [0.45, 0.4, 0.45], [x + 0.3, 1.5, z + 0.1], island);
    });
    // 迷你摩天輪
    const wheel = new THREE.Group();
    wheel.position.set(0.4, 1.9, -2.5);
    island.add(wheel);
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 6, 36), mat(0xff8fb0, 'plastic'));
    wheel.add(rimMesh);
    for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const sp = part('box', 0xffffff, [0.04, 1.2, 0.04], [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0], wheel, { kind: 'metal' });
        sp.rotation.z = a - Math.PI / 2;
        part('sphere', [0xff6b6b, 0x6ec6ff, 0xffd166, 0x7ed957, 0xb388ff, 0xff9f43][i], [0.16, 0.16, 0.16], [Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0], wheel, { kind: 'plastic' });
    }
    [-1, 1].forEach(sd => {
        const leg = part('box', 0xb0b8c8, [0.08, 2.0, 0.08], [0.4 + sd * 0.45, 0.95, -2.5], island, { kind: 'metal' });
        leg.rotation.z = sd * 0.25;
    });

    // 可愛動物們
    const species = ['dog', 'cat', 'panda', 'rabbit', 'penguin', 'chick'];
    const pets = species.map((id, i) => {
        const m = PetModels.buildPet(id);
        const a = (i / species.length) * Math.PI * 2;
        const r = 1.75;
        m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        const s = PetModels.SPECS[id].size;
        m.scale.setScalar(0.85 * Math.min(1.1, Math.max(0.75, s)));
        m.rotation.y = -a + Math.PI / 2 + 0.6;
        m.traverse(o => { if (o.isMesh) o.castShadow = true; });
        island.add(m);
        return { m, rig: m.userData.rig, phase: Math.random() * 6, hopT: 1 + Math.random() * 4, hop: 0 };
    });

    // 漂浮的愛心 / 星星
    const sparkTex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,230,150,0.9)'); grd.addColorStop(1, 'rgba(255,200,100,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
    })();
    const sparks = [];
    for (let i = 0; i < 26; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        sp.scale.setScalar(0.18 + Math.random() * 0.2);
        sp.position.set((Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 6);
        sp.userData.v = 0.2 + Math.random() * 0.4;
        sp.userData.p = Math.random() * 6;
        scene.add(sp);
        sparks.push(sp);
    }

    function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = w / h < 1.1 ? 12 : 9.5;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();
    stage.classList.add('ready');

    let visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
    }
    let last = performance.now(), t = 0;
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!visible || document.hidden) return;
        t += dt;
        island.rotation.y += dt * 0.25;
        wheel.rotation.z += dt * 0.6;
        pets.forEach(p => {
            p.hopT -= dt;
            if (p.hopT <= 0) { p.hop = 1; p.hopT = 2.5 + Math.random() * 4; }
            let pose = 'idle', y = 0;
            if (p.hop > 0) {
                p.hop = Math.max(0, p.hop - dt * 1.4);
                y = Math.abs(Math.sin((1 - p.hop) * Math.PI * 2)) * 0.45;
                pose = 'happy';
            }
            p.m.position.y = y;
            PetModels.animateRig(p.rig, pose, dt, 0);
        });
        sparks.forEach(sp => {
            sp.userData.p += dt;
            sp.position.y += sp.userData.v * dt;
            sp.material.opacity = 0.5 + Math.sin(sp.userData.p * 3) * 0.5;
            if (sp.position.y > 4.5) sp.position.y = -0.3;
        });
        renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
})();
