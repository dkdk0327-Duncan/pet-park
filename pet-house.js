// =============================================================
//  寵物樂園 3D － 小主人的家 (兩層樓、可切開看的娃娃屋)
//  一樓：客廳 (沙發、電視、書櫃) + 廚房 (冰箱、爐子、餐桌)
//  二樓：臥室 (床、寵物小床、衣櫃、書桌) + 陽台
// =============================================================
(function () {
    'use strict';
    const { part, pivot, mat, G } = PetModels;

    const HOME = { x: -28, z: 17.5 };   // 房子中心
    const W = 9, D = 7;                  // 寬 (x) / 深 (z)
    const Y1 = 0.25, Y2 = 3.25;          // 一樓、二樓地板高度
    const WALL_H = 2.8, T = 0.2;         // 牆高、牆厚
    const DOOR_W = 1.4;
    const ROT = Math.PI / 2;             // 大門朝東 (面向小吃店)
    const CR = Math.cos(ROT), SR = Math.sin(ROT);

    function create(scene, world, makeTextSprite) {
        const g = new THREE.Group();
        g.position.set(HOME.x, 0, HOME.z);
        g.rotation.y = ROT;
        scene.add(g);
        // 房子座標 (門朝 +z) ↔ 世界座標 (整棟轉 ROT)
        const L = (x, z) => ({ x: HOME.x + x * CR + z * SR, z: HOME.z - x * SR + z * CR });
        const toLocal = (wx, wz) => { const dx = wx - HOME.x, dz = wz - HOME.z; return { x: dx * CR - dz * SR, z: dx * SR + dz * CR }; };
        // 房子座標 → 世界座標

        const ext = pivot(g);            // 外觀 (一直都在)
        const roof = pivot(g);           // 屋頂
        const in1 = pivot(g);            // 一樓室內家具
        const slab2 = pivot(g);          // 二樓地板
        const in2 = pivot(g);            // 二樓室內家具
        const balcony = pivot(g);        // 陽台
        const walls = { 1: [], 2: [] };  // 每一面牆：{ full, stub, normal }

        // ---------- 地基、一樓地板 ----------
        part('box', 0xb8b0a4, [W + 0.6, Y1, D + 0.6], [0, Y1 / 2, 0], ext).receiveShadow = true;
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.75 });
        const f1 = new THREE.Mesh(new THREE.BoxGeometry(W - T, 0.04, D - T), floorMat);
        f1.position.set(0, Y1 + 0.02, 0); f1.receiveShadow = true;
        in1.add(f1);
        for (let i = 0; i < 9; i++) part('box', 0xc48a52, [0.02, 0.01, D - T], [-W / 2 + 0.5 + i, Y1 + 0.045, 0], in1, { shadow: false });
        // 門口台階 + 小路
        part('box', 0xd0c8bc, [2.2, 0.12, 1.2], [0, 0.06, D / 2 + 0.9], ext).receiveShadow = true;

        // ---------- 牆 (每面牆有完整版與「切開」後的矮牆) ----------
        const wallColor = { 1: 0xfff1d6, 2: 0xcfe8ff };
        function wallSeg(floor, side, x, z, len, horiz, opts) {
            const y0 = floor === 1 ? Y1 : Y2;
            const grp = pivot(floor === 1 ? g : in2.parent);
            const full = pivot(grp);
            const stub = pivot(grp);
            const m = mat(wallColor[floor], 'plastic');
            const sx = horiz ? len : T, sz = horiz ? T : len;
            const wm = part('box', wallColor[floor], [sx, WALL_H, sz], [x, y0 + WALL_H / 2, z], full);
            wm.material = m; wm.receiveShadow = true;
            part('box', 0xffffff, [sx + 0.02, 0.12, sz + 0.02], [x, y0 + 0.06, z], full, { kind: 'plastic' });       // 踢腳板
            part('box', wallColor[floor], [sx, 0.45, sz], [x, y0 + 0.225, z], stub, { kind: 'plastic' });
            part('box', 0xffffff, [sx + 0.04, 0.06, sz + 0.04], [x, y0 + 0.47, z], stub, { kind: 'plastic' });
            stub.visible = false;
            // 窗戶
            (opts && opts.windows || []).forEach(off => {
                const wx = horiz ? x + off : x, wz = horiz ? z : z + off;
                const fr = pivot(full, [wx, y0 + 1.55, wz]);
                if (!horiz) fr.rotation.y = Math.PI / 2;
                part('box', 0xffffff, [1.15, 1.05, T + 0.06], [0, 0, 0], fr, { kind: 'plastic' });
                const glass = new THREE.Mesh(G.box, new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.1, clearcoat: 1, emissive: 0x332a10, emissiveIntensity: 0 }));
                glass.scale.set(0.95, 0.85, T + 0.08);
                fr.add(glass);
                part('box', 0xffffff, [0.05, 0.85, T + 0.1], [0, 0, 0], fr, { kind: 'plastic', shadow: false });
                part('box', 0xffffff, [0.95, 0.05, T + 0.1], [0, 0, 0], fr, { kind: 'plastic', shadow: false });
                windowGlass.push(glass.material);
                if (floor === 1 && side !== 'back') {
                    // 窗台花箱
                    const bx = pivot(full, [wx, y0 + 0.95, wz]);
                    if (!horiz) bx.rotation.y = Math.PI / 2;
                    const out = side === 'front' ? 1 : -1;
                    part('box', 0xa86b3c, [1.1, 0.22, 0.3], [0, 0, (T / 2 + 0.15) * (horiz ? out : (side === 'left' ? -1 : 1))], bx, { kind: 'wood' });
                    [-0.35, 0, 0.35].forEach((o, i) => part('sphere', [0xff6b9a, 0xffd166, 0xb388ff][i], [0.12, 0.1, 0.12], [o, 0.15, (T / 2 + 0.15) * (horiz ? out : (side === 'left' ? -1 : 1))], bx, { kind: 'fur', shadow: false }));
                }
            });
            const normal = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] }[side];
            walls[floor].push({ full, stub, normal });
            return full;
        }
        const windowGlass = [];
        [1, 2].forEach(f => {
            const segLen = (W - DOOR_W) / 2;
            wallSeg(f, 'back', 0, -D / 2, W, true, { windows: [-2.4, 1.0] });
            wallSeg(f, 'left', -W / 2, 0, D, false, { windows: [f === 1 ? 0.6 : 0.9] });
            wallSeg(f, 'right', W / 2, 0, D, false, { windows: [f === 1 ? -0.4 : 0.6] });
            wallSeg(f, 'front', -(DOOR_W / 2 + segLen / 2), D / 2, segLen, true, { windows: [-0.6] });
            wallSeg(f, 'front', DOOR_W / 2 + segLen / 2, D / 2, segLen, true, { windows: [0.6] });
            // 門框上方的橫樑
            const y0 = f === 1 ? Y1 : Y2;
            const top = part('box', wallColor[f], [DOOR_W, WALL_H - 2.2, T], [0, y0 + 2.2 + (WALL_H - 2.2) / 2, D / 2], walls[f][3].full, { kind: 'plastic' });
            top.castShadow = true;
        });
        // 二樓的牆跟二樓一起顯示 / 隱藏
        walls[2].forEach(w => { in2.add(w.full.parent); });
        // 大門 (會打開)
        const doorPivot = pivot(walls[1][3].full, [-DOOR_W / 2 + 0.05, Y1, D / 2 + 0.02]);
        part('box', 0x9c5b2e, [DOOR_W - 0.1, 2.15, 0.08], [(DOOR_W - 0.1) / 2, 1.08, 0], doorPivot, { kind: 'wood' });
        part('cyl', 0xfff3b0, [0.2, 0.09, 0.2], [(DOOR_W - 0.1) / 2, 1.6, 0.03], doorPivot, { rot: [Math.PI / 2, 0, 0], kind: 'basic' });
        part('sphere', 0xffd166, [0.06, 0.06, 0.06], [DOOR_W - 0.3, 1.05, 0.08], doorPivot, { kind: 'metal' });

        // ---------- 二樓地板 (樓梯的地方留洞) ----------
        const slabMat = new THREE.MeshStandardMaterial({ color: 0xe8c08a, roughness: 0.8 });
        const SX0 = 2.75;               // 樓梯洞的 x 範圍 2.75 ~ 4.5
        [[(-W / 2 + SX0) / 2, 0, SX0 + W / 2, D], [(SX0 + W / 2) / 2, -2.9, W / 2 - SX0, 1.2], [(SX0 + W / 2) / 2, 2.75, W / 2 - SX0, 1.5]].forEach(([x, z, w, d]) => {
            const s = new THREE.Mesh(G.box, slabMat);
            s.scale.set(w, 0.2, d); s.position.set(x, Y2 - 0.1, z);
            s.castShadow = true; s.receiveShadow = true;
            slab2.add(s);
        });
        // 二樓樓梯洞旁的欄杆
        for (let i = 0; i <= 8; i++) part('cyl', 0xffffff, [0.03, 0.7, 0.03], [SX0, Y2 + 0.35, -2.3 + i * 0.53], in2, { kind: 'plastic' });
        part('box', 0xa86b3c, [0.08, 0.06, 4.3], [SX0, Y2 + 0.72, -0.15], in2, { kind: 'wood' });

        // ---------- 樓梯 (右側，往後爬上二樓) ----------
        const STEPS = 12, SZ0 = 1.7, SZ1 = -2.3, SXC = 3.62;
        for (let i = 0; i < STEPS; i++) {
            const z = SZ0 - (i + 0.5) * (SZ0 - SZ1) / STEPS;
            const h = (i + 1) * (Y2 - Y1) / STEPS;
            const st = part('box', i % 2 ? 0xc48a52 : 0xd29a62, [1.25, h, (SZ0 - SZ1) / STEPS], [SXC, Y1 + h / 2, z], in1, { kind: 'wood' });
            st.receiveShadow = true;
        }
        for (let i = 0; i <= 6; i++) part('cyl', 0xffffff, [0.03, 0.75, 0.03], [SXC - 0.66, Y1 + 0.375 + i * 0.5, SZ0 - i * 0.66], in1, { kind: 'plastic' });

        // ---------- 屋頂 ----------
        const ridge = 1.9, rLen = Math.hypot(D / 2 + 0.5, ridge);
        const ang = Math.atan2(ridge, D / 2 + 0.5);
        [-1, 1].forEach(sd => {
            const r = part('box', 0xe8604c, [W + 0.8, 0.22, rLen], [0, Y2 + WALL_H + ridge / 2, sd * (D / 4 + 0.25)], roof, { rot: [sd * ang, 0, 0], kind: 'plastic' });
            r.castShadow = true;
            for (let i = 1; i < 5; i++) part('box', 0xc94a3a, [W + 0.82, 0.05, 0.08], [0, Y2 + WALL_H + ridge * (i / 5) + 0.12, sd * (D / 2 + 0.5) * (1 - i / 5)], roof, { kind: 'plastic', shadow: false });
        });
        const tri = new THREE.Shape();
        tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, ridge); tri.lineTo(-D / 2, 0);
        const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false });
        [-1, 1].forEach(sd => {
            const m = new THREE.Mesh(triGeo, mat(0xcfe8ff, 'plastic'));
            m.rotation.y = Math.PI / 2;
            m.position.set(sd * (W / 2) - 0.1, Y2 + WALL_H, 0);
            m.castShadow = true;
            roof.add(m);
        });
        part('box', 0xb06a4a, [0.7, 1.4, 0.7], [2.4, Y2 + WALL_H + 1.5, -1.4], roof, { kind: 'plastic' });
        part('cyl', 0xfff3b0, [0.35, 0.35, 0.35], [0, Y2 + WALL_H + ridge * 0.55, D / 2 + 0.15], roof, { rot: [Math.PI / 2, 0, 0], kind: 'basic' }); // 圓窗

        // ---------- 陽台 ----------
        const bal = new THREE.Mesh(G.box, slabMat);
        bal.scale.set(4.2, 0.2, 1.6); bal.position.set(0, Y2 - 0.1, D / 2 + 0.8);
        bal.castShadow = true; bal.receiveShadow = true;
        balcony.add(bal);
        [-1, 1].forEach(sd => {
            part('cyl', 0xffffff, [0.12, Y2, 0.12], [sd * 1.9, Y2 / 2, D / 2 + 1.45], balcony, { kind: 'plastic' });
            for (let i = 0; i < 4; i++) part('cyl', 0xffffff, [0.03, 0.75, 0.03], [sd * 2.05, Y2 + 0.38, D / 2 + 0.15 + i * 0.4], balcony, { kind: 'plastic' });
        });
        for (let i = 0; i <= 10; i++) part('cyl', 0xffffff, [0.03, 0.75, 0.03], [-2.05 + i * 0.41, Y2 + 0.38, D / 2 + 1.55], balcony, { kind: 'plastic' });
        part('box', 0xa86b3c, [4.2, 0.07, 0.08], [0, Y2 + 0.76, D / 2 + 1.55], balcony, { kind: 'wood' });
        [-1.4, 1.4].forEach(x => {
            part('cyl', 0xe07a4a, [0.2, 0.3, 0.2], [x, Y2 + 0.15, D / 2 + 1.2], balcony, { kind: 'plastic' });
            part('sphere', 0x5cb85c, [0.28, 0.25, 0.28], [x, Y2 + 0.45, D / 2 + 1.2], balcony);
            part('sphere', 0xff6b9a, [0.08, 0.08, 0.08], [x + 0.1, Y2 + 0.62, D / 2 + 1.3], balcony, { kind: 'fur', shadow: false });
        });

        // ---------- 外觀小物：信箱、招牌、門燈 ----------
        part('cyl', 0x6d4c41, [0.06, 1.1, 0.06], [2.6, 0.55, D / 2 + 1.6], ext, { kind: 'wood' });
        part('box', 0x3ba7ff, [0.45, 0.35, 0.3], [2.6, 1.2, D / 2 + 1.6], ext, { kind: 'plastic' });
        part('box', 0xff4d6d, [0.04, 0.25, 0.1], [2.85, 1.3, D / 2 + 1.6], ext, { kind: 'plastic' });
        const doorLampMat = new THREE.MeshBasicMaterial({ color: 0xfff3c0 });
        const dl = new THREE.Mesh(G.sphere, doorLampMat);
        dl.scale.setScalar(0.14); dl.position.set(1.0, Y1 + 2.45, D / 2 + 0.2);
        ext.add(dl);
        const sign = makeTextSprite('🏠 小主人的家', 48, '#b85c00', true);
        sign.position.set(0, Y2 + WALL_H + ridge + 1.0, 0); sign.scale.set(3.6, 0.9, 1);
        ext.add(sign);

        // ==========================================================
        //  室內家具 (每件都有互動點)
        // ==========================================================
        const furn = [];          // { id, floor, proxy, stand, face, name }
        function addFurn(id, floor, name, cx, cz, size, stand, face, extra) {
            const proxy = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshBasicMaterial());
            proxy.visible = false;
            const pw = L(cx, cz);
            proxy.position.set(pw.x, (floor === 1 ? Y1 : Y2) + size[1] / 2, pw.z);
            proxy.rotation.y = ROT;
            proxy.userData.pick = { kind: 'furn', id };
            scene.add(proxy);
            const f = Object.assign({ id, floor, name, proxy, stand: L(stand[0], stand[1]), face: face + ROT }, extra || {});
            furn.push(f);
            return f;
        }
        const obstacles = { 1: [], 2: [] };
        const obs = (floor, x, z, hw, hd) => obstacles[floor].push({ x, z, hw, hd });

        // ===== 一樓：客廳 =====
        // 地毯
        const rug = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), mat(0xff9ebb, 'fur'));
        rug.rotation.x = -Math.PI / 2; rug.position.set(-2.4, Y1 + 0.05, -0.9); rug.scale.set(1.25, 1, 1); rug.receiveShadow = true;
        in1.add(rug);
        // 沙發 (面向左邊的電視)
        const sofa = pivot(in1, [-1.25, Y1, -0.9]);
        sofa.rotation.y = -Math.PI / 2;
        part('box', 0x5a8dee, [2.0, 0.45, 0.85], [0, 0.32, 0], sofa, { kind: 'fur' });
        part('box', 0x4a7ad6, [2.0, 0.75, 0.25], [0, 0.65, -0.38], sofa, { kind: 'fur' });
        [-1, 1].forEach(sd => part('box', 0x4a7ad6, [0.22, 0.6, 0.85], [sd * 1.0, 0.45, 0], sofa, { kind: 'fur' }));
        [-0.5, 0.5].forEach(x => part('box', 0x7fa8ff, [0.85, 0.12, 0.7], [x, 0.6, 0.04], sofa, { kind: 'fur' }));
        part('box', 0xffd166, [0.4, 0.35, 0.12], [0.6, 0.85, -0.2], sofa, { rot: [-0.3, 0, 0.2], kind: 'fur' });
        obs(1, -1.25, -0.9, 0.5, 1.05);
        // 茶几
        part('box', 0xd29a62, [0.7, 0.08, 1.1], [-2.5, Y1 + 0.45, -0.9], in1, { kind: 'wood' });
        [[-0.3, -0.45], [0.3, -0.45], [-0.3, 0.45], [0.3, 0.45]].forEach(([x, z]) => part('box', 0xa86b3c, [0.06, 0.42, 0.06], [-2.5 + x, Y1 + 0.21, -0.9 + z], in1, { kind: 'wood' }));
        part('cyl', 0xffffff, [0.1, 0.12, 0.1], [-2.4, Y1 + 0.55, -1.1], in1, { kind: 'plastic' });
        obs(1, -2.5, -0.9, 0.4, 0.6);
        // 電視 + 電視櫃 (左牆)
        part('box', 0xa86b3c, [0.6, 0.55, 1.9], [-4.0, Y1 + 0.28, -0.9], in1, { kind: 'wood' });
        part('box', 0x222222, [0.1, 1.05, 1.7], [-4.15, Y1 + 1.15, -0.9], in1, { kind: 'eye' });
        const tvCv = document.createElement('canvas'); tvCv.width = 256; tvCv.height = 160;
        const tvTex = new THREE.CanvasTexture(tvCv); tvTex.encoding = THREE.sRGBEncoding;
        const tvMat = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
        const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.9), tvMat);
        tvScreen.rotation.y = Math.PI / 2; tvScreen.position.set(-4.09, Y1 + 1.15, -0.9);
        in1.add(tvScreen);
        obs(1, -4.0, -0.9, 0.35, 1.0);
        addFurn('sofa', 1, '沙發看電視', -1.25, -0.9, [1.0, 1.0, 2.2], [-0.2, -0.9], -Math.PI / 2, { seat: L(-1.3, -0.9) });
        addFurn('tv', 1, '看電視', -4.0, -0.9, [0.8, 1.6, 2.0], [-0.2, -0.9], -Math.PI / 2, { seat: L(-1.3, -0.9), alias: 'sofa' });
        // 書櫃 (左牆後方)
        const shelf = pivot(in1, [-4.05, Y1, -2.75]);
        part('box', 0x9c5b2e, [0.5, 2.0, 1.2], [0, 1.0, 0], shelf, { kind: 'wood' });
        [0.45, 0.95, 1.45].forEach(y => {
            for (let i = 0; i < 5; i++) part('box', [0xff6b6b, 0x3ba7ff, 0xffd166, 0x7ed957, 0xb388ff][(i + y * 10) % 5 | 0], [0.32, 0.35, 0.14], [0.12, y + 0.18, -0.4 + i * 0.2], shelf, { kind: 'plastic', shadow: false });
        });
        obs(1, -4.05, -2.75, 0.3, 0.65);
        addFurn('shelf', 1, '看動物圖鑑', -4.05, -2.75, [0.6, 2.1, 1.3], [-3.2, -2.75], -Math.PI / 2);
        // 鞋櫃 + 盆栽 (門口)
        part('box', 0xd29a62, [1.0, 0.5, 0.4], [-1.6, Y1 + 0.25, D / 2 - 0.35], in1, { kind: 'wood' });
        part('box', 0xff6b6b, [0.25, 0.12, 0.35], [-1.85, Y1 + 0.56, D / 2 - 0.35], in1, { kind: 'plastic', shadow: false });
        part('box', 0x3ba7ff, [0.25, 0.12, 0.35], [-1.45, Y1 + 0.56, D / 2 - 0.35], in1, { kind: 'plastic', shadow: false });
        part('cyl', 0xe07a4a, [0.28, 0.45, 0.28], [-3.9, Y1 + 0.22, D / 2 - 0.5], in1, { kind: 'plastic' });
        part('sphere', 0x4caf50, [0.45, 0.55, 0.45], [-3.9, Y1 + 0.9, D / 2 - 0.5], in1);
        obs(1, -1.6, D / 2 - 0.35, 0.55, 0.25);
        obs(1, -3.9, D / 2 - 0.5, 0.35, 0.35);
        // 寵物碗
        part('cyl', 0xff9ebb, [0.22, 0.1, 0.22], [1.6, Y1 + 0.05, D / 2 - 0.5], in1, { kind: 'plastic' });
        part('cyl', 0xa0612a, [0.17, 0.02, 0.17], [1.6, Y1 + 0.1, D / 2 - 0.5], in1, { shadow: false });

        // ===== 一樓：廚房 (後牆) =====
        const fridge = pivot(in1, [-0.4, Y1, -3.05]);
        part('box', 0xf0f4f8, [0.95, 2.0, 0.75], [0, 1.0, 0], fridge, { kind: 'plastic' });
        const fridgeDoor = pivot(fridge, [-0.47, 0, 0.39]);
        part('box', 0xe6edf3, [0.94, 1.25, 0.06], [0.47, 1.33, 0], fridgeDoor, { kind: 'plastic' });
        part('box', 0xb0b8c8, [0.05, 0.4, 0.05], [0.85, 1.2, 0.05], fridgeDoor, { kind: 'metal' });
        part('box', 0xb0b8c8, [0.94, 0.03, 0.05], [0, 0.69, 0.4], fridge, { kind: 'metal' });
        part('sphere', 0xff4d6d, [0.06, 0.06, 0.03], [0.2, 1.7, 0.45], fridge, { kind: 'plastic', shadow: false });
        obs(1, -0.4, -3.05, 0.55, 0.45);
        addFurn('fridge', 1, '冰箱拿點心', -0.4, -3.05, [1.0, 2.0, 0.9], [-0.4, -2.0], Math.PI, { door: fridgeDoor });
        // 流理台 + 爐子
        part('box', 0xffffff, [2.1, 0.9, 0.7], [1.45, Y1 + 0.45, -3.1], in1, { kind: 'plastic' });
        part('box', 0x37474f, [2.15, 0.06, 0.75], [1.45, Y1 + 0.93, -3.1], in1, { kind: 'plastic' });
        [0.75, 1.15].forEach(x => part('torus', 0x222222, [0.13, 0.13, 0.3], [x, Y1 + 0.97, -3.05], in1, { rot: [Math.PI / 2, 0, 0], kind: 'metal', shadow: false }));
        const pan = pivot(in1, [0.95, Y1 + 1.0, -3.05]);
        part('cyl', 0x333333, [0.24, 0.05, 0.24], [0, 0.02, 0], pan, { kind: 'metal' });
        part('box', 0x333333, [0.4, 0.03, 0.05], [0.35, 0.03, 0], pan, { kind: 'metal' });
        part('cyl', 0xb0b8c8, [0.25, 0.12, 0.25], [2.05, Y1 + 0.93, -3.15], in1, { kind: 'metal' }); // 水槽
        part('box', 0xff9ebb, [2.1, 0.5, 0.05], [1.45, Y1 + 1.5, -3.42], in1, { kind: 'plastic' }); // 牆上磁磚
        obs(1, 1.45, -3.1, 1.1, 0.45);
        addFurn('stove', 1, '做寵物餅乾', 1.45, -3.1, [2.2, 1.0, 0.8], [1.0, -2.1], Math.PI, { pan });
        // 餐桌 + 兩張椅子
        part('cyl', 0xd29a62, [0.75, 0.07, 0.75], [1.3, Y1 + 0.75, 1.0], in1, { kind: 'wood' });
        part('cyl', 0xa86b3c, [0.08, 0.72, 0.08], [1.3, Y1 + 0.37, 1.0], in1, { kind: 'wood' });
        part('cyl', 0xffffff, [0.18, 0.03, 0.18], [1.3, Y1 + 0.8, 1.0], in1, { kind: 'plastic' });
        part('sphere', 0xff4d4d, [0.08, 0.08, 0.08], [1.3, Y1 + 0.86, 1.0], in1, { kind: 'plastic' });
        [-1, 1].forEach(sd => {
            const ch = pivot(in1, [1.3, Y1, 1.0 + sd * 0.95]);
            ch.rotation.y = sd > 0 ? Math.PI : 0;
            part('box', 0xffd166, [0.5, 0.06, 0.5], [0, 0.45, 0], ch, { kind: 'plastic' });
            part('box', 0xffd166, [0.5, 0.5, 0.06], [0, 0.72, -0.22], ch, { kind: 'plastic' });
            [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z]) => part('box', 0xa86b3c, [0.05, 0.45, 0.05], [x, 0.22, z], ch, { kind: 'wood' }));
        });
        obs(1, 1.3, 1.0, 0.8, 1.3);
        // 吊燈
        part('cone', 0xffd166, [0.4, 0.3, 0.4], [-1.5, Y2 - 0.45, -0.5], in1, { kind: 'plastic' });
        // 樓梯本體 (一樓的障礙物)
        obs(1, SXC, (SZ0 + SZ1) / 2 - 0.1, 0.7, (SZ0 - SZ1) / 2 + 0.1);
        // 點樓梯：上二樓
        addFurn('stairsUp', 1, '上二樓', SXC, (SZ0 + SZ1) / 2, [1.4, 3.0, SZ0 - SZ1 + 0.4], [SXC, SZ0 + 0.7], 0);

        // ===== 二樓：臥室 =====
        // 床 (床頭靠後牆)
        const bed = pivot(in2, [-2.6, Y2, -2.0]);
        part('box', 0xa86b3c, [1.7, 0.35, 2.7], [0, 0.22, 0], bed, { kind: 'wood' });
        part('box', 0xffffff, [1.6, 0.22, 2.55], [0, 0.48, 0], bed, { kind: 'fur' });
        part('box', 0xa86b3c, [1.8, 1.1, 0.12], [0, 0.6, -1.36], bed, { kind: 'wood' });
        part('sphere', 0xffd166, [0.12, 0.12, 0.12], [-0.8, 1.2, -1.36], bed, { kind: 'plastic' });
        part('sphere', 0xffd166, [0.12, 0.12, 0.12], [0.8, 1.2, -1.36], bed, { kind: 'plastic' });
        part('box', 0xfff3dc, [1.1, 0.18, 0.5], [0, 0.66, -1.0], bed, { kind: 'fur' });   // 枕頭
        const quilt = part('box', 0xff9ebb, [1.66, 0.12, 1.6], [0, 0.65, 0.42], bed, { kind: 'fur' });
        const bedQuilt = part('box', 0xff8fb7, [1.62, 0.32, 1.7], [0, 0.72, 0.15], bed, { kind: 'fur' }); // 睡覺時蓋上的棉被
        bedQuilt.visible = false;
        obs(2, -3.0, -2.0, 1.45, 1.4);   // 床和牆中間不留縫，避免卡在死角
        addFurn('bed', 2, '上床睡覺', -2.6, -2.0, [1.8, 1.2, 2.8], [-1.35, -1.2], -Math.PI / 2,
            { sleep: Object.assign(L(-2.6, -2.0 - 1.05), { y: Y2 + 0.6 }), quilt, bedQuilt });
        // 寵物小床 (床邊)
        part('cyl', 0xb3e0ff, [0.55, 0.15, 0.55], [-1.05, Y2 + 0.08, -2.75], in2, { kind: 'fur' });
        part('torus', 0x6ab8ff, [0.55, 0.55, 0.6], [-1.05, Y2 + 0.15, -2.75], in2, { rot: [Math.PI / 2, 0, 0], kind: 'fur' });
        const petBed = Object.assign(L(-1.05, -2.75), { y: Y2 + 0.18 });
        // 衣櫃 (後牆)
        const wd = pivot(in2, [0.75, Y2, -3.05]);
        part('box', 0xd29a62, [1.4, 2.2, 0.7], [0, 1.1, 0], wd, { kind: 'wood' });
        part('box', 0x000000, [0.02, 2.0, 0.02], [0, 1.1, 0.36], wd, { shadow: false });
        [-0.15, 0.15].forEach(x => part('sphere', 0xffd166, [0.05, 0.05, 0.05], [x, 1.15, 0.38], wd, { kind: 'metal' }));
        part('box', 0xb0e0ff, [0.5, 0.7, 0.03], [-0.35, 1.5, 0.37], wd, { kind: 'eye' }); // 小鏡子
        obs(2, 0.75, -3.05, 0.75, 0.4);
        addFurn('wardrobe', 2, '換造型', 0.75, -3.05, [1.5, 2.3, 0.8], [0.75, -2.1], Math.PI);
        // 書桌 + 椅子 + 檯燈 + 日記
        part('box', 0xffffff, [0.8, 0.08, 1.5], [-3.85, Y2 + 0.75, 1.2], in2, { kind: 'plastic' });
        [[-0.3, -0.65], [-0.3, 0.65]].forEach(([x, z]) => part('box', 0xffffff, [0.6, 0.72, 0.06], [-3.85, Y2 + 0.37, 1.2 + z], in2, { kind: 'plastic' }));
        part('box', 0xff6b9a, [0.35, 0.06, 0.45], [-3.75, Y2 + 0.82, 1.3], in2, { kind: 'plastic' });     // 日記本
        part('cyl', 0x37474f, [0.03, 0.5, 0.03], [-4.0, Y2 + 1.05, 0.7], in2, { kind: 'metal' });
        const deskLampMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffc04d, emissiveIntensity: 0.2 });
        const lampHead = new THREE.Mesh(G.cone, deskLampMat);
        lampHead.scale.set(0.18, 0.18, 0.18); lampHead.position.set(-3.95, Y2 + 1.3, 0.75); lampHead.rotation.z = 0.5;
        in2.add(lampHead);
        const chair2 = pivot(in2, [-3.1, Y2, 1.2]);
        chair2.rotation.y = -Math.PI / 2;
        part('box', 0x7ed957, [0.5, 0.06, 0.5], [0, 0.45, 0], chair2, { kind: 'plastic' });
        part('box', 0x7ed957, [0.5, 0.5, 0.06], [0, 0.72, -0.22], chair2, { kind: 'plastic' });
        obs(2, -3.85, 1.2, 0.45, 0.8);
        addFurn('desk', 2, '寫日記 (貼紙)', -3.85, 1.2, [0.9, 1.4, 1.6], [-2.8, 1.2], -Math.PI / 2);
        // 玩具箱 + 玩偶 + 地毯 + 海報
        part('box', 0xffd166, [0.8, 0.5, 0.55], [1.9, Y2 + 0.25, 2.8], in2, { kind: 'plastic' });
        part('sphere', 0xe8b37a, [0.22, 0.24, 0.2], [1.75, Y2 + 0.72, 2.8], in2, { kind: 'fur' });
        part('sphere', 0xe8b37a, [0.15, 0.15, 0.15], [1.75, Y2 + 1.0, 2.82], in2, { kind: 'fur' });
        part('sphere', 0x3ba7ff, [0.15, 0.15, 0.15], [2.1, Y2 + 0.62, 2.75], in2, { kind: 'plastic' });
        obs(2, 1.9, 2.8, 0.45, 0.35);
        const rug2 = new THREE.Mesh(new THREE.CircleGeometry(1.1, 28), mat(0xd7c4ff, 'fur'));
        rug2.rotation.x = -Math.PI / 2; rug2.position.set(-0.6, Y2 + 0.02, 0.6); rug2.receiveShadow = true;
        in2.add(rug2);
        part('box', 0x7ed957, [0.9, 0.6, 0.03], [-1.5, Y2 + 1.8, -D / 2 + T / 2 + 0.03], in2, { kind: 'plastic' });  // 海報
        part('sphere', 0xffd166, [0.15, 0.15, 0.03], [-1.5, Y2 + 1.85, -D / 2 + T / 2 + 0.05], in2, { kind: 'basic', shadow: false });
        // 二樓樓梯洞 (障礙物)
        obs(2, (SX0 + W / 2) / 2, -0.15, (W / 2 - SX0) / 2 + 0.05, 2.15);
        // 點樓梯洞：下一樓
        addFurn('stairsDown', 2, '下一樓', (SX0 + W / 2) / 2, -0.3, [W / 2 - SX0 + 0.2, 0.9, 4.4], [SXC, SZ1 - 0.6], 0);
        // 陽台互動點
        addFurn('balcony', 2, '到陽台看樂園', 0, D / 2 + 0.9, [3.6, 1.0, 1.4], [0, D / 2 + 0.9], 0);

        // 夜燈 (二樓)
        const nightLight = new THREE.PointLight(0xffd59a, 0, 9, 1.8);
        { const q = L(-1.5, 0); nightLight.position.set(q.x, Y2 + 2.2, q.z); }
        scene.add(nightLight);
        const nightLight1 = new THREE.PointLight(0xffd59a, 0, 9, 1.8);
        { const q = L(-1.5, -0.5); nightLight1.position.set(q.x, Y1 + 2.3, q.z); }
        scene.add(nightLight1);

        // 房子外面是障礙物 (動物不會穿過去)
        // (轉 90 度：寬深互換)
        world.obstacles.push({ type: 'box', x: HOME.x, z: HOME.z, hw: Math.abs(W / 2 * CR) + Math.abs(D / 2 * SR) + 0.35, hd: Math.abs(W / 2 * SR) + Math.abs(D / 2 * CR) + 0.35 });
        [-1, 1].forEach(sd => { const q = L(sd * 1.9, D / 2 + 1.45); world.obstacles.push({ type: 'circle', x: q.x, z: q.z, r: 0.2 }); });
        world.invalidateNav && world.invalidateNav();
        // 外面點房子 → 回家
        const homeProxy = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 7.5, D + 2), new THREE.MeshBasicMaterial());
        homeProxy.visible = false;
        { const q = L(0, 0.6); homeProxy.position.set(q.x, 3.7, q.z); }
        homeProxy.rotation.y = ROT;
        homeProxy.userData.pick = { kind: 'home' };
        scene.add(homeProxy);
        world.pickables.push(homeProxy);

        in1.visible = false; in2.visible = true; slab2.visible = true;

        // ==========================================================
        //  API
        // ==========================================================
        const H = {
            x: HOME.x, z: HOME.z, W, D, Y1, Y2, rot: ROT, L,
            furn, petBed,
            doorOut: L(0, D / 2 + 1.4),          // 門外
            doorIn: L(0, D / 2 - 0.9),           // 門內
            stairBottom: L(SXC, SZ0 + 0.7),
            stairTop: L(SXC, SZ1 - 0.6),
            floorY: f => (f === 2 ? Y2 : Y1),
            viewMode: 'outside', viewFloor: 1,
            tv: { on: false, t: 0 },
            doorOpen: 0, doorTarget: 0,
        };
        // 麻雀可以停的地方：屋脊、煙囪
        H.perches = [-3.2, -1.6, 0, 1.6, 3.2].map(x => Object.assign(L(x, 0), { y: Y2 + WALL_H + ridge + 0.1 }))
            .concat([Object.assign(L(2.4, -1.4), { y: Y2 + WALL_H + 2.22 })]);
        H.furnById = id => furn.find(f => f.id === id);
        H.pickables = floor => furn.filter(f => f.floor === floor).map(f => f.proxy);

        // 室內碰撞：牆、家具、樓梯洞；二樓可以走到陽台
        H.resolve = function (p, r, floor) {
            const l = toLocal(p.x, p.z);
            resolveLocal(l, r, floor);
            const w = L(l.x, l.z);
            p.x = w.x; p.z = w.z;
        };
        function resolveLocal(p, r, floor) {
            let lx = p.x, lz = p.z;
            const minX = -W / 2 + T / 2 + r, maxX = W / 2 - T / 2 - r;
            const minZ = -D / 2 + T / 2 + r, maxZ = D / 2 - T / 2 - r;
            lx = Math.max(minX, Math.min(maxX, lx));
            if (floor === 2 && lz > maxZ && (Math.abs(lx) < DOOR_W / 2 - r * 0.5 || lz > D / 2 + 0.1)) {
                // 陽台
                lx = Math.max(-1.9 + r, Math.min(1.9 - r, lx));
                lz = Math.min(D / 2 + 1.45 - r, lz);
            } else {
                lz = Math.max(minZ, Math.min(maxZ, lz));
            }
            obstacles[floor].forEach(o => {
                const hw = o.hw + r, hd = o.hd + r;
                const dx = lx - o.x, dz = lz - o.z;
                if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
                    if (hw - Math.abs(dx) < hd - Math.abs(dz)) lx = o.x + Math.sign(dx || 1) * hw;
                    else lz = o.z + Math.sign(dz || 1) * hd;
                }
            });
            p.x = lx; p.z = lz;
        }
        // 室內找路：0.25 格子 BFS，繞過家具 (回傳世界座標的轉角點)
        const CELL = 0.25;
        const free = (x, z, r, floor) => { const q = { x, z }; resolveLocal(q, r, floor); return Math.abs(q.x - x) < 0.01 && Math.abs(q.z - z) < 0.01; };
        const clearLine = (ax, az, bx, bz, r, floor) => {
            const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12);
            for (let i = 1; i <= n; i++) if (!free(ax + (bx - ax) * i / n, az + (bz - az) * i / n, r, floor)) return false;
            return true;
        };
        H.findPath = function (ax, az, bx, bz, r, floor) {
            const s = toLocal(ax, az), g = toLocal(bx, bz);
            resolveLocal(s, r, floor); resolveLocal(g, r, floor);
            const world = pts => pts.map(q => L(q.x, q.z));
            if (clearLine(s.x, s.z, g.x, g.z, r, floor)) return world([g]);
            const x0 = -W / 2, z0 = -D / 2;
            const nx = Math.ceil(W / CELL), nz = Math.ceil((D + 1.6) / CELL);
            const cx = x => Math.max(0, Math.min(nx - 1, Math.round((x - x0) / CELL)));
            const cz = z => Math.max(0, Math.min(nz - 1, Math.round((z - z0) / CELL)));
            const wx = i => x0 + i * CELL, wz = j => z0 + j * CELL;
            const ok = new Int8Array(nx * nz).fill(-1);
            const isFree = (i, j) => { const k = j * nx + i; if (ok[k] < 0) ok[k] = free(wx(i), wz(j), r, floor) ? 1 : 0; return ok[k] === 1; };
            let si = cx(s.x), sj = cz(s.z);
            const gi = cx(g.x), gj = cz(g.z);
            // 起點卡在家具邊 → 先找最近的空格
            if (!isFree(si, sj)) {
                let best = null, bd = 1e9;
                for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
                    const i = si + di, j = sj + dj;
                    if (i < 0 || j < 0 || i >= nx || j >= nz || !isFree(i, j)) continue;
                    const dd = di * di + dj * dj;
                    if (dd < bd) { bd = dd; best = [i, j]; }
                }
                if (best) { si = best[0]; sj = best[1]; }
            }
            const prev = new Int32Array(nx * nz).fill(-1);
            const start = sj * nx + si, goal = gj * nx + gi;
            prev[start] = start;
            const queue = [start];
            let found = false;
            for (let qi = 0; qi < queue.length; qi++) {
                const k = queue[qi];
                if (k === goal) { found = true; break; }
                const i = k % nx, j = (k - i) / nx;
                for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                    const ni = i + di, nj = j + dj;
                    if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
                    const nk = nj * nx + ni;
                    if (prev[nk] >= 0) continue;
                    if (nk !== goal && !isFree(ni, nj)) continue;
                    if (di && dj && (!isFree(i + di, j) || !isFree(i, j + dj))) continue;
                    prev[nk] = k;
                    queue.push(nk);
                }
            }
            if (!found) return world([g]);
            const cells = [];
            for (let k = goal; k !== start; k = prev[k]) cells.push(k);
            if (si !== cx(s.x) || sj !== cz(s.z)) cells.push(start);   // 先走到最近的空格
            cells.reverse();
            const pts = cells.map(k => ({ x: wx(k % nx), z: wz(Math.floor(k / nx)) }));
            pts[pts.length - 1] = g;
            // 拉直：能直接看到的點就跳過
            const out = [];
            let cur = s;
            for (let i = 0; i < pts.length;) {
                let j = pts.length - 1;
                while (j > i && !clearLine(cur.x, cur.z, pts[j].x, pts[j].z, r, floor)) j--;
                out.push(pts[j]); cur = pts[j]; i = j + 1;
            }
            return world(out);
        };
        // 把點擊的目標移到「走得到」的地方 (跟樓梯口連通的區域)，避免走進死角
        const reachCache = {};
        H.reachable = function (x, z, r, floor) {
            const key = floor + ':' + r.toFixed(2);
            const x0 = -W / 2, z0 = -D / 2, nx = Math.ceil(W / CELL), nz = Math.ceil((D + 1.6) / CELL);
            let comp = reachCache[key];
            if (!comp) {
                comp = new Uint8Array(nx * nz);
                const st = toLocal(...(floor === 2 ? [H.stairTop.x, H.stairTop.z] : [H.doorIn.x, H.doorIn.z]));
                resolveLocal(st, r, floor);
                let si = Math.round((st.x - x0) / CELL), sj = Math.round((st.z - z0) / CELL);
                const ok = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && free(x0 + i * CELL, z0 + j * CELL, r, floor);
                if (!ok(si, sj)) { outer: for (let d = 1; d < 5; d++) for (let a = -d; a <= d; a++) for (let b = -d; b <= d; b++) if (ok(si + a, sj + b)) { si += a; sj += b; break outer; } }
                const q = [sj * nx + si]; comp[q[0]] = 1;
                for (let k = 0; k < q.length; k++) {
                    const i = q[k] % nx, j = (q[k] - i) / nx;
                    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const ni = i + a, nj = j + b, nk = nj * nx + ni;
                        if (ni < 0 || nj < 0 || ni >= nx || nj >= nz || comp[nk] || !ok(ni, nj)) continue;
                        comp[nk] = 1; q.push(nk);
                    }
                }
                reachCache[key] = comp;
            }
            const l = toLocal(x, z);
            resolveLocal(l, r, floor);
            const ci = Math.round((l.x - x0) / CELL), cj = Math.round((l.z - z0) / CELL);
            if (ci >= 0 && cj >= 0 && ci < nx && cj < nz && comp[cj * nx + ci]) return L(l.x, l.z);
            let best = null, bd = 1e9;
            for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
                if (!comp[j * nx + i]) continue;
                const d = (i - ci) * (i - ci) + (j - cj) * (j - cj);
                if (d < bd) { bd = d; best = [i, j]; }
            }
            return best ? L(x0 + best[0] * CELL, z0 + best[1] * CELL) : L(l.x, l.z);
        };
        H.inside = (x, z) => { const l = toLocal(x, z); return Math.abs(l.x) < W / 2 && Math.abs(l.z) < D / 2 + 1.6; };
        H.toLocal = toLocal;

        // 娃娃屋切開：依鏡頭方向，把朝向鏡頭的牆換成矮牆
        H.setView = function (mode, floor) {
            H.viewMode = mode;
            if (floor) H.viewFloor = floor;
        };
        H.update = function (dt, time, camYaw, nightAmt) {
            const inside = H.viewMode === 'inside';
            const vf = H.viewFloor;
            roof.visible = !inside;
            sign.visible = !inside;
            in1.visible = inside && vf === 1;
            const show2 = !inside || vf === 2;
            in2.visible = show2;
            slab2.visible = show2;
            balcony.visible = show2;
            const cx = Math.sin(camYaw - ROT), cz = Math.cos(camYaw - ROT);
            [1, 2].forEach(f => {
                walls[f].forEach(w => {
                    const facing = w.normal[0] * cx + w.normal[1] * cz > 0.2;
                    const cut = inside && f === vf && facing;
                    w.full.visible = !cut;
                    w.stub.visible = cut;
                });
            });
            // 門
            H.doorOpen += (H.doorTarget - H.doorOpen) * Math.min(1, dt * 6);
            doorPivot.rotation.y = -H.doorOpen * 1.6;
            // 電視
            if (H.tv.on) {
                H.tv.t += dt;
                if (H.tv.t > 0.4) { H.tv.t = 0; drawTv(time); }
            }
            // 窗戶與燈：晚上亮起來
            windowGlass.forEach(m => { m.emissiveIntensity = nightAmt * 0.9; m.emissive.setHex(0xffc870); });
            doorLampMat.color.setHex(nightAmt > 0.3 ? 0xffd27a : 0xfff3c0);
            nightLight.intensity = inside && vf === 2 ? 0.6 + nightAmt * 0.8 : nightAmt * 0.5;
            nightLight1.intensity = inside && vf === 1 ? 0.6 + nightAmt * 0.8 : nightAmt * 0.5;
            deskLampMat.emissiveIntensity = 0.2 + nightAmt * 1.5;
        };

        // 電視畫面：寵物頻道
        const tvEmojis = ['🐶', '🐱', '🐰', '🐼', '🐧', '🦊', '🐸', '🐨', '🦁', '🐷'];
        function drawTv(time) {
            const c = tvCv.getContext('2d');
            if (!H.tv.on) { c.fillStyle = '#111'; c.fillRect(0, 0, 256, 160); tvTex.needsUpdate = true; return; }
            const hue = (time * 40) % 360;
            const grd = c.createLinearGradient(0, 0, 256, 160);
            grd.addColorStop(0, `hsl(${hue},80%,70%)`); grd.addColorStop(1, `hsl(${(hue + 60) % 360},80%,60%)`);
            c.fillStyle = grd; c.fillRect(0, 0, 256, 160);
            c.font = '72px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
            c.textAlign = 'center'; c.textBaseline = 'middle';
            const e = tvEmojis[Math.floor(time / 1.6) % tvEmojis.length];
            c.fillText(e, 128 + Math.sin(time * 3) * 50, 78 + Math.abs(Math.sin(time * 5)) * -18);
            c.font = 'bold 20px "Microsoft JhengHei",sans-serif';
            c.fillStyle = '#fff';
            c.fillText('📺 寵物頻道', 70, 22);
            tvTex.needsUpdate = true;
        }
        H.setTv = on => { H.tv.on = on; drawTv(performance.now() / 1000); };
        drawTv(0);

        return H;
    }

    window.PetHouse = { create, HOME };
})();
