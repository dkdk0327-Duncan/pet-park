// =============================================================
//  寵物樂園 3D － 場地 (地形、設施、池塘、日夜變化、尋路)
// =============================================================
(function () {
    const { part, pivot, mat } = PetModels;

    // 樂園範圍 (圍欄內)
    const BOUNDS = { minX: -38, maxX: 38, minZ: -24, maxZ: 24 };

    // 設施位置
    const LAYOUT = {
        sleep:   { x: -28, z: 2 },      // 星星睡窩
        toilet:  { x: 31, z: -18 },     // 廁所 (沙坑)
        slide:   { x: 10, z: -15 },     // 溜滑梯
        ferris:  { x: -15, z: -16 },    // 摩天輪
        swings:  { x: 28, z: -5 },      // 盪鞦韆
        trough:  { x: 5, z: 14 },       // 飲水槽
        pond:    { x: 25, z: 13 },      // 池塘
        shop:    { x: -13, z: 15.5 },   // 小吃店
        bath:    { x: -28, z: -15 },    // 洗澡小屋
        home:    { x: -28, z: 17.5 },   // 小主人的家
        plaza:   { x: 0, z: 0 },
    };
    const POND_R = 6.2;               // 水面半徑
    const POND_RIM = 6.9;             // 外圍石牆半徑
    const POND_Y = 0.7;               // 水面高度 (架高的池塘)

    // 障礙物 (寵物 / 主人不會穿過)
    const OBSTACLES = [
        { type: 'circle', x: LAYOUT.pond.x, z: LAYOUT.pond.z, r: POND_RIM },
        { type: 'box', x: LAYOUT.trough.x, z: LAYOUT.trough.z, hw: 4.3, hd: 0.9 },
        { type: 'box', x: LAYOUT.ferris.x, z: LAYOUT.ferris.z - 0.6, hw: 3.4, hd: 1.4 },
        { type: 'box', x: LAYOUT.slide.x + 2.2, z: LAYOUT.slide.z, hw: 3.6, hd: 0.9 },
        { type: 'box', x: LAYOUT.swings.x, z: LAYOUT.swings.z, hw: 1.5, hd: 4.9 },
        { type: 'box', x: LAYOUT.shop.x, z: LAYOUT.shop.z - 0.2, hw: 3.3, hd: 2.0 },
        { type: 'box', x: LAYOUT.toilet.x, z: LAYOUT.toilet.z - 2.6, hw: 1.3, hd: 0.9 },
    ];

    function resolveObstacles(p, radius) {
        for (const o of OBSTACLES) {
            if (o.type === 'circle') {
                const dx = p.x - o.x, dz = p.z - o.z;
                const d = Math.hypot(dx, dz);
                const min = o.r + radius;
                if (d < min && d > 0.0001) {
                    p.x = o.x + dx / d * min;
                    p.z = o.z + dz / d * min;
                }
            } else {
                const hw = o.hw + radius, hd = o.hd + radius;
                const dx = p.x - o.x, dz = p.z - o.z;
                if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
                    const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
                    if (px < pz) p.x = o.x + Math.sign(dx || 1) * hw;
                    else p.z = o.z + Math.sign(dz || 1) * hd;
                }
            }
        }
        p.x = Math.max(BOUNDS.minX + radius, Math.min(BOUNDS.maxX - radius, p.x));
        p.z = Math.max(BOUNDS.minZ + radius, Math.min(BOUNDS.maxZ - radius, p.z));
    }

    // ---------------------------------------------------------
    //  尋路：直線被設施擋住時，沿著障礙物的轉角繞過去
    // ---------------------------------------------------------
    function segBlocked(ax, az, bx, bz, radius) {
        for (const o of OBSTACLES) {
            if (o.type === 'circle') {
                const r = o.r + radius + 0.05;
                const dx = bx - ax, dz = bz - az;
                const L2 = dx * dx + dz * dz || 1e-6;
                let t = ((o.x - ax) * dx + (o.z - az) * dz) / L2;
                t = Math.max(0, Math.min(1, t));
                const cx = ax + dx * t - o.x, cz = az + dz * t - o.z;
                if (cx * cx + cz * cz < r * r) return true;
            } else {
                // 線段與 AABB (slab 法)
                const hw = o.hw + radius + 0.05, hd = o.hd + radius + 0.05;
                const minX = o.x - hw, maxX = o.x + hw, minZ = o.z - hd, maxZ = o.z + hd;
                let t0 = 0, t1 = 1;
                const dx = bx - ax, dz = bz - az;
                const clip = (p, q) => {
                    if (Math.abs(p) < 1e-9) return q >= 0;
                    const r = q / p;
                    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
                    else { if (r < t0) return false; if (r < t1) t1 = r; }
                    return true;
                };
                if (clip(-dx, ax - minX) && clip(dx, maxX - ax) && clip(-dz, az - minZ) && clip(dz, maxZ - az) && t0 < t1 - 1e-4) return true;
            }
        }
        return false;
    }
    function insideAny(x, z, radius) {
        if (x < BOUNDS.minX + radius || x > BOUNDS.maxX - radius || z < BOUNDS.minZ + radius || z > BOUNDS.maxZ - radius) return true;
        for (const o of OBSTACLES) {
            if (o.type === 'circle') { if (Math.hypot(x - o.x, z - o.z) < o.r + radius) return true; }
            else if (Math.abs(x - o.x) < o.hw + radius && Math.abs(z - o.z) < o.hd + radius) return true;
        }
        return false;
    }
    function navNodes(radius) {
        const m = radius + 0.45;
        const nodes = [];
        for (const o of OBSTACLES) {
            if (o.type === 'circle') {
                const R = (o.r + radius + 0.2) / Math.cos(Math.PI / 10);
                for (let i = 0; i < 10; i++) {
                    const a = i / 10 * Math.PI * 2;
                    nodes.push({ x: o.x + Math.cos(a) * R, z: o.z + Math.sin(a) * R });
                }
            } else {
                [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => nodes.push({ x: o.x + sx * (o.hw + m), z: o.z + sz * (o.hd + m) }));
            }
        }
        return nodes.filter(n => !insideAny(n.x, n.z, radius));
    }
    const navCache = {};
    function findPath(from, to, radius) {
        // 起點、終點常常貼著設施 (例如喝水的位置)，連到它們的線段放寬一點
        const rs = Math.max(0.05, radius - 0.15);
        if (!segBlocked(from.x, from.z, to.x, to.z, rs)) return [{ x: to.x, z: to.z }];
        const key = Math.round(radius * 10);
        const nodes = navCache[key] || (navCache[key] = navNodes(radius));
        // Dijkstra：起點 = -1，終點 = nodes.length
        const N = nodes.length;
        const dist = new Array(N + 1).fill(Infinity), prev = new Array(N + 1).fill(-2), done = new Array(N + 1).fill(false);
        const pt = i => (i === N ? to : nodes[i]);
        for (let i = 0; i <= N; i++) {
            const p = pt(i);
            if (!segBlocked(from.x, from.z, p.x, p.z, rs)) { dist[i] = Math.hypot(p.x - from.x, p.z - from.z); prev[i] = -1; }
        }
        for (;;) {
            let u = -1, best = Infinity;
            for (let i = 0; i <= N; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
            if (u === -1 || u === N) break;
            done[u] = true;
            const a = pt(u);
            for (let v = 0; v <= N; v++) {
                if (done[v]) continue;
                const b = pt(v);
                const d = best + Math.hypot(b.x - a.x, b.z - a.z);
                if (d < dist[v] && !segBlocked(a.x, a.z, b.x, b.z, v === N ? rs : radius)) { dist[v] = d; prev[v] = u; }
            }
        }
        if (prev[N] === -2) return [{ x: to.x, z: to.z }]; // 找不到路 → 直走 (由碰撞處理)
        const path = [];
        for (let i = N; i !== -1; i = prev[i]) path.unshift({ x: pt(i).x, z: pt(i).z });
        return path;
    }

    function rand(a, b) { return a + Math.random() * (b - a); }
    // 簡單偽隨機 (讓裝飾每次位置一致)
    let seed = 12345;
    function srand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    // 設施區域 (不放花草)
    const FAC_RECTS = [
        [LAYOUT.sleep.x, LAYOUT.sleep.z + 1, 7.5, 7.5],
        [LAYOUT.toilet.x, LAYOUT.toilet.z - 1, 4.5, 4.5],
        [LAYOUT.slide.x + 2, LAYOUT.slide.z, 6.5, 3.5],
        [LAYOUT.ferris.x, LAYOUT.ferris.z, 5.5, 4.5],
        [LAYOUT.swings.x, LAYOUT.swings.z, 4.5, 6],
        [LAYOUT.trough.x, LAYOUT.trough.z, 6, 3],
        [LAYOUT.pond.x, LAYOUT.pond.z, 9, 9],
        [LAYOUT.shop.x, LAYOUT.shop.z, 5, 5],
        [LAYOUT.bath.x, LAYOUT.bath.z, 5.5, 4.5],
        [LAYOUT.home.x + 0.8, LAYOUT.home.z, 5.6, 6.2],
    ];
    function isFacilityArea(x, z) {
        if (Math.abs(x) < 2.2 || Math.abs(z) < 1.4) return true; // 主要步道
        return FAC_RECTS.some(r => Math.abs(x - r[0]) < r[2] && Math.abs(z - r[1]) < r[3]);
    }

    function buildWorld(scene) {
        const world = { layout: LAYOUT, bounds: BOUNDS, obstacles: OBSTACLES, resolveObstacles, findPath, segBlocked, POND_Y, POND_R };
        const pickables = [];
        world.pickables = pickables;
        function addProxy(geo, pos, pick) {
            const proxy = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
            proxy.visible = false;
            proxy.position.set(pos[0], pos[1], pos[2]);
            proxy.userData.pick = pick;
            scene.add(proxy);
            pickables.push(proxy);
            return proxy;
        }

        // ---------- 燈光 ----------
        const hemi = new THREE.HemisphereLight(0xdff3ff, 0x6a8f4a, 0.75);
        scene.add(hemi);
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.castShadow = true;
        sun.shadow.mapSize.set(4096, 4096);
        const sc = sun.shadow.camera;
        sc.left = -46; sc.right = 46; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 160;
        sun.shadow.bias = -0.0006;
        sun.shadow.normalBias = 0.03;
        scene.add(sun);
        scene.add(sun.target);
        world.hemi = hemi; world.sun = sun;

        // ---------- 地面 ----------
        const grassTex = makeGrassTexture();
        const outerTex = grassTex.clone();
        outerTex.needsUpdate = true;
        outerTex.repeat.set(70, 70);
        const outerMat = new THREE.MeshStandardMaterial({ color: 0x86c45e, map: outerTex, roughness: 1 });
        const outer = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), outerMat);
        outer.rotation.x = -Math.PI / 2;
        outer.position.y = -0.05;
        outer.receiveShadow = true;
        scene.add(outer);

        const GW = BOUNDS.maxX - BOUNDS.minX + 6, GD = BOUNDS.maxZ - BOUNDS.minZ + 6;
        const groundGeo = new THREE.PlaneGeometry(GW, GD, GW, GD);
        const colors = [];
        const base = new THREE.Color(0x8fd05a), c2 = new THREE.Color(0x74b947);
        for (let i = 0; i < groundGeo.attributes.position.count; i++) {
            const c = base.clone().lerp(c2, srand());
            colors.push(c.r, c.g, c.b);
        }
        groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        grassTex.repeat.set(GW / 5.5, GD / 5.5);
        const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: 1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.userData.pick = { kind: 'ground' };
        scene.add(ground);
        pickables.push(ground);
        world.ground = ground;
        world.groundMats = [groundMat, outerMat];

        // 步道 (石磚)
        const pathMat = new THREE.MeshStandardMaterial({ map: makeStoneTexture(), roughness: 0.92 });
        world.pathMat = pathMat;
        function worldUV(m) {
            m.updateMatrixWorld(true);
            const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
                uv.setXY(i, v.x / 3, v.z / 3);
            }
            uv.needsUpdate = true;
        }
        function pathDisc(x, z, r) {
            const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), pathMat);
            m.rotation.x = -Math.PI / 2; m.position.set(x, 0.015, z); m.receiveShadow = true;
            worldUV(m);
            scene.add(m);
        }
        function pathStrip(x1, z1, x2, z2, w) {
            const len = Math.hypot(x2 - x1, z2 - z1);
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), pathMat);
            m.rotation.x = -Math.PI / 2;
            m.rotation.z = Math.atan2(x2 - x1, z2 - z1);
            m.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2);
            m.receiveShadow = true;
            worldUV(m);
            scene.add(m);
        }
        const L = LAYOUT;
        pathDisc(0, 0, 6.5);
        const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 32), mat(0xd4b88a));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
        pathStrip(0, 0, L.sleep.x + 6.5, L.sleep.z + 1, 2.4);
        pathStrip(0, 0, L.ferris.x, L.ferris.z + 3, 2.4);
        pathStrip(0, 0, L.slide.x - 1, L.slide.z + 2.2, 2.4);
        pathStrip(0, 0, L.trough.x, L.trough.z - 1.6, 2.4);
        pathStrip(0, 0, L.swings.x - 3, L.swings.z, 2.4);
        pathStrip(L.swings.x - 3, L.swings.z, L.toilet.x - 2.5, L.toilet.z + 2.5, 2.0);
        pathStrip(0, 0, L.shop.x, L.shop.z + 3.2, 2.4);
        pathStrip(L.shop.x - 3, L.shop.z + 3.6, L.home.x + 5.6, L.home.z, 2.2);
        pathStrip(L.ferris.x - 3.6, L.ferris.z + 3, L.bath.x + 4.6, L.bath.z + 2.6, 2.0);
        pathStrip(0, 0, L.pond.x - 6.6, L.pond.z + 5.2, 2.4);
        pathStrip(0, 0, 0, BOUNDS.maxZ + 0.5, 3); // 入口

        // ---------- 圍欄 ----------
        const postGeo = new THREE.BoxGeometry(0.3, 1.3, 0.3);
        const posts = [];
        for (let x = BOUNDS.minX - 1; x <= BOUNDS.maxX + 1; x += 2) {
            posts.push([x, BOUNDS.minZ - 1]);
            if (Math.abs(x) > 2.5) posts.push([x, BOUNDS.maxZ + 1]);
        }
        for (let z = BOUNDS.minZ + 1; z < BOUNDS.maxZ + 1; z += 2) {
            posts.push([BOUNDS.minX - 1, z]);
            posts.push([BOUNDS.maxX + 1, z]);
        }
        const postMesh = new THREE.InstancedMesh(postGeo, mat(0xffffff), posts.length);
        const dummy = new THREE.Object3D();
        posts.forEach((p, i) => {
            dummy.position.set(p[0], 0.65, p[1]); dummy.updateMatrix();
            postMesh.setMatrixAt(i, dummy.matrix);
        });
        postMesh.castShadow = true;
        scene.add(postMesh);
        const railMat = mat(0xffffff);
        function rail(x1, z1, x2, z2) {
            const len = Math.hypot(x2 - x1, z2 - z1);
            [0.45, 0.95].forEach(y => {
                const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.1), railMat);
                r.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
                r.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
                r.castShadow = true;
                scene.add(r);
            });
        }
        const fx0 = BOUNDS.minX - 1, fx1 = BOUNDS.maxX + 1, fz0 = BOUNDS.minZ - 1, fz1 = BOUNDS.maxZ + 1;
        rail(fx0, fz0, fx1, fz0);
        rail(fx0, fz0, fx0, fz1);
        rail(fx1, fz0, fx1, fz1);
        rail(fx0, fz1, -2.5, fz1);
        rail(2.5, fz1, fx1, fz1);
        {
            const g = new THREE.Group();
            g.position.set(0, 0, fz1);
            [-1, 1].forEach(sd => part('cyl', 0xff8fb0, [0.3, 3.4, 0.3], [2.6 * sd, 1.7, 0], g, { kind: 'plastic' }));
            part('box', 0xffd166, [6.2, 0.9, 0.35], [0, 3.6, 0], g, { kind: 'plastic' });
            [-1, 1].forEach(sd => part('sphere', 0xff6b9a, [0.4, 0.4, 0.4], [2.6 * sd, 3.5, 0], g, { kind: 'plastic' }));
            const sign = makeTextSprite('🐾 寵物樂園 🐾', 64, '#7a3b00');
            sign.position.set(0, 3.62, 0.25);
            sign.scale.set(5.2, 0.85, 1);
            g.add(sign);
            scene.add(g);
        }

        // ---------- 樹木 ----------
        world.trees = [];
        const treeSpots = [];
        for (let i = 0; i < 56; i++) {
            const side = i % 4;
            let x, z;
            if (side === 0) { x = rand(-44, 44); z = rand(-32, -26.5); }
            else if (side === 1) { x = rand(-44, 44); z = rand(26.5, 33); if (Math.abs(x) < 5) x += 9; }
            else if (side === 2) { x = rand(-47, -40.5); z = rand(-28, 28); }
            else { x = rand(40.5, 47); z = rand(-28, 28); }
            treeSpots.push([x, z]);
        }
        [[-36, -9], [35, 6], [-3, -21], [3, -22.5], [-4, 19], [14, 21.5], [-36.5, 11.5], [-24, -21], [21, -22], [-19, 22]].forEach(p => treeSpots.push(p));
        treeSpots.forEach(([x, z], i) => {
            const t = new THREE.Group();
            t.position.set(x, 0, z);
            const s = rand(0.8, 1.35);
            t.scale.setScalar(s);
            part('cyl', 0x8b5a2b, [0.28, 1.6, 0.28], [0, 0.8, 0], t, { kind: 'wood' });
            const leaf = pivot(t, [0, 0, 0]);
            const palette = [0x4caf50, 0x66bb6a, 0x43a047, 0x7cc35a];
            const lc = palette[i % palette.length];
            if (i % 3 === 0) {
                part('cone', 0x2e8b57, [1.4, 1.8, 1.4], [0, 2.2, 0], leaf);
                part('cone', 0x3cb371, [1.1, 1.5, 1.1], [0, 3.1, 0], leaf);
                part('cone', 0x48c27a, [0.75, 1.2, 0.75], [0, 3.9, 0], leaf);
            } else {
                part('sphere', lc, [1.4, 1.2, 1.4], [0, 2.4, 0], leaf);
                part('sphere', lc, [1.0, 0.9, 1.0], [0.6, 3.1, 0.2], leaf);
                part('sphere', lc, [0.9, 0.8, 0.9], [-0.5, 3.0, -0.3], leaf);
                if (i % 4 === 1) {
                    for (let k = 0; k < 5; k++) {
                        const a = k * 1.3;
                        part('sphere', 0xff4d4d, [0.16, 0.16, 0.16], [Math.cos(a) * 1.25, 2.2 + (k % 2) * 0.6, Math.sin(a) * 1.25], leaf, { shadow: false });
                    }
                }
            }
            leaf.userData.phase = Math.random() * 6;
            world.trees.push(leaf);
            scene.add(t);
            if (Math.abs(x) < BOUNDS.maxX && Math.abs(z) < BOUNDS.maxZ) OBSTACLES.push({ type: 'circle', x, z, r: 0.45 * s });
        });

        // ---------- 花朵與草叢 ----------
        const flowerGeo = new THREE.SphereGeometry(0.17, 7, 5);
        const stemGeo = new THREE.SphereGeometry(0.22, 6, 4);
        const flowerColors = [0xff6b9a, 0xffd166, 0xffffff, 0xb388ff, 0xff8a65];
        const patches = [];
        for (let i = 0; i < 160 && patches.length < 22; i++) {
            const x = srand() * 72 - 36, z = srand() * 44 - 22;
            if (Math.hypot(x, z) < 9 || isFacilityArea(x, z)) continue;
            const pp = { x, z };
            resolveObstacles(pp, 1.5);
            if (Math.abs(pp.x - x) > 0.01 || Math.abs(pp.z - z) > 0.01) continue;
            if (patches.some(p => Math.hypot(p.x - x, p.z - z) < 6)) continue;
            patches.push({ x, z, c: flowerColors[patches.length % flowerColors.length] });
        }
        const perPatch = 9;
        const leafIM = new THREE.InstancedMesh(stemGeo, mat(0x4f9a3a), Math.max(1, patches.length * perPatch));
        let li = 0;
        flowerColors.forEach(fc => {
            const mine = patches.filter(p => p.c === fc);
            const im = new THREE.InstancedMesh(flowerGeo, mat(fc), Math.max(1, mine.length * perPatch));
            let n = 0;
            mine.forEach(p => {
                for (let k = 0; k < perPatch; k++) {
                    const a = srand() * Math.PI * 2, r = srand() * 1.3;
                    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
                    dummy.position.set(x, 0.32, z);
                    dummy.scale.setScalar(0.8 + srand() * 0.5);
                    dummy.updateMatrix();
                    im.setMatrixAt(n++, dummy.matrix);
                    dummy.position.set(x, 0.12, z);
                    dummy.scale.set(1, 0.6, 1);
                    dummy.updateMatrix();
                    leafIM.setMatrixAt(li++, dummy.matrix);
                }
            });
            im.count = n;
            scene.add(im);
        });
        leafIM.count = li;
        scene.add(leafIM);
        const grassGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
        const grass = new THREE.InstancedMesh(grassGeo, mat(0x6fb64a), 380);
        let gn = 0;
        for (let i = 0; i < 900 && gn < 380; i++) {
            const x = srand() * 74 - 37, z = srand() * 46 - 23;
            if (Math.hypot(x, z) < 7 || isFacilityArea(x, z)) continue;
            dummy.position.set(x, 0.15, z);
            dummy.rotation.set(0, srand() * 3, (srand() - 0.5) * 0.4);
            dummy.scale.setScalar(0.8 + srand() * 0.8);
            dummy.updateMatrix();
            grass.setMatrixAt(gn++, dummy.matrix);
        }
        dummy.rotation.set(0, 0, 0);
        grass.count = gn;
        scene.add(grass);
        const bushGeo = new THREE.IcosahedronGeometry(0.8, 1);
        const bushList = [];
        for (let x = -36; x <= 36; x += 6) if (Math.abs(x - L.ferris.x) > 6 && Math.abs(x - L.slide.x - 2) > 7) bushList.push([x, BOUNDS.minZ - 0.3]);
        for (let z = -20; z <= 20; z += 5) { bushList.push([BOUNDS.minX + 0.2, z]); if (Math.abs(z - L.swings.z) > 7) bushList.push([BOUNDS.maxX - 0.2, z]); }
        const bushes = new THREE.InstancedMesh(bushGeo, mat(0x5cb85c), bushList.length);
        bushList.forEach(([x, z], i) => {
            dummy.position.set(x, 0.4, z);
            dummy.scale.set(1.2, 0.8, 1);
            dummy.updateMatrix();
            bushes.setMatrixAt(i, dummy.matrix);
        });
        bushes.castShadow = true;
        scene.add(bushes);

        // =====================================================
        //  星星睡窩 (每隻動物一張小床 + 小被子 + 紗帳 + 小燈串)
        // =====================================================
        {
            const S = L.sleep;
            const g = new THREE.Group();
            g.position.set(S.x, 0, S.z);
            const DW = 12.4, DD = 11;
            // 木地板 (有木紋條)
            part('box', 0xc8955a, [DW, 0.22, DD], [0, 0.11, 0.5], g, { kind: 'wood' }).receiveShadow = true;
            for (let i = 0; i < 12; i++) {
                const b = part('box', i % 2 ? 0xb88550 : 0xd2a066, [DW - 0.1, 0.02, DD / 12 - 0.05], [0, 0.225, -DD / 2 + 0.5 + (i + 0.5) * DD / 12], g, { kind: 'wood', shadow: false });
                b.receiveShadow = true;
            }
            // 柱子 + 紗帳 (半透明，不會擋住睡覺的動物)
            const postsXZ = [[-DW / 2 + 0.3, -DD / 2 + 0.8], [DW / 2 - 0.3, -DD / 2 + 0.8], [-DW / 2 + 0.3, DD / 2 + 0.2], [DW / 2 - 0.3, DD / 2 + 0.2]];
            postsXZ.forEach(p => part('cyl', 0xf3e2c0, [0.15, 4.2, 0.15], [p[0], 2.1, p[1]], g, { kind: 'wood' }));
            [-DD / 2 + 0.8, DD / 2 + 0.2].forEach(z => part('box', 0xf3e2c0, [DW - 0.4, 0.15, 0.15], [0, 4.2, z], g, { kind: 'wood' }));
            [-DW / 2 + 0.3, DW / 2 - 0.3].forEach(x => part('box', 0xf3e2c0, [0.15, 0.15, DD - 0.6], [x, 4.2, 0.5], g, { kind: 'wood' }));
            const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd8c8ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false });
            const canopy = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.4, DD - 0.6, 12, 10), canopyMat);
            // 讓紗帳中間微微下垂
            const cp = canopy.geometry.attributes.position;
            for (let i = 0; i < cp.count; i++) {
                const x = cp.getX(i) / (DW / 2), y = cp.getY(i) / (DD / 2);
                cp.setZ(i, -(1 - x * x) * (1 - y * y) * 0.6);
            }
            canopy.geometry.computeVertexNormals();
            canopy.rotation.x = -Math.PI / 2;
            canopy.position.set(0, 4.25, 0.5);
            g.add(canopy);
            // 小燈串
            const lightsMat = new THREE.MeshBasicMaterial({ color: 0xfff1c1 });
            world.denLightsMat = lightsMat;
            for (let i = 0; i < 26; i++) {
                const t = i / 25;
                const x = -DW / 2 + 0.4 + t * (DW - 0.8);
                const sag = Math.sin(t * Math.PI) * 0.45;
                [-DD / 2 + 0.8, DD / 2 + 0.2].forEach(z => {
                    const b = new THREE.Mesh(PetModels.G.sphere, lightsMat);
                    b.scale.setScalar(0.09); b.position.set(x, 4.05 - sag, z);
                    g.add(b);
                });
            }
            // 床 (6 × 5)
            world.sleepSpots = [];
            world.beds = [];
            const bedColors = [0xffb3c7, 0xb3e0ff, 0xfff0a8, 0xc8f0b8, 0xdcc8ff, 0xffd0a8];
            const blanketColors = [0xff7aa2, 0x6ab8ff, 0xffd45a, 0x7fd36a, 0xa98cff, 0xff9f5a];
            const COLS = 6, ROWS = 5, SX = 1.85, SZ = 1.75;
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const bx = (c - (COLS - 1) / 2) * SX, bz = (r - (ROWS - 1) / 2) * SZ + 0.6;
                    const bed = pivot(g, [bx, 0.22, bz]);
                    const ci = (r * COLS + c) % bedColors.length;
                    // 籃子
                    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.68, 0.32, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xc8954a, roughness: 0.85, side: THREE.DoubleSide }));
                    basket.position.y = 0.16; basket.castShadow = true; basket.receiveShadow = true;
                    bed.add(basket);
                    part('torus', 0xb07a3a, [0.78, 0.78, 0.5], [0, 0.32, 0], bed, { rot: [Math.PI / 2, 0, 0], kind: 'wood' });
                    const cushion = part('cyl', bedColors[ci], [0.68, 0.14, 0.68], [0, 0.12, 0], bed, { kind: 'fur' });
                    cushion.receiveShadow = true;
                    part('sphere', 0xffffff, [0.3, 0.1, 0.18], [0, 0.24, -0.42], bed, { kind: 'fur' }); // 小枕頭
                    // 小被子 (有動物睡覺時才出現)
                    const blanket = new THREE.Group();
                    const bm = part('sphere', blanketColors[ci], [1, 1, 1], [0, 0, 0], blanket, { kind: 'fur' });
                    bm.scale.set(1, 0.5, 1);
                    [-0.5, 0, 0.5].forEach(z => part('sphere', 0xffffff, [0.18, 0.1, 0.18], [0.35 * (z ? 1 : -1), 0.42, z], blanket, { kind: 'fur', shadow: false }));
                    blanket.visible = false;
                    scene.add(blanket);
                    const spot = { x: S.x + bx, z: S.z + bz, y: 0.48, occupant: null, blanket, bed: true };
                    world.sleepSpots.push(spot);
                    world.beds.push(spot);
                }
            }
            // 床位不夠時：前方的軟草地墊
            const mat2 = part('box', 0xa8d88a, [DW, 0.05, 2.0], [0, 0.03, DD / 2 + 1.6], g, { kind: 'fur' });
            mat2.receiveShadow = true;
            for (let i = 0; i < 12; i++) {
                world.sleepSpots.push({ x: S.x - DW / 2 + 0.6 + i * (DW - 1.2) / 11, z: S.z + DD / 2 + 1.6, y: 0.06, occupant: null });
            }
            // 後方的小木屋 + 月亮招牌
            const hut = pivot(g, [-3.5, 0, -DD / 2 - 1.6]);
            part('box', 0xf6d7a7, [3.4, 2.4, 2.4], [0, 1.2, 0], hut, { kind: 'wood' });
            part('box', 0x6a5acd, [3.9, 0.25, 1.75], [0, 2.95, -0.58], hut, { rot: [0.62, 0, 0] });
            part('box', 0x6a5acd, [3.9, 0.25, 1.75], [0, 2.95, 0.58], hut, { rot: [-0.62, 0, 0] });
            part('box', 0x8b5a2b, [1.0, 1.5, 0.08], [0, 0.75, 1.22], hut, { kind: 'wood' });
            [-1, 1].forEach(sd => part('box', 0xfff3b0, [0.55, 0.5, 0.06], [sd * 1.05, 1.5, 1.22], hut, { kind: 'basic' }));
            OBSTACLES.push({ type: 'box', x: S.x - 3.5, z: S.z - DD / 2 - 1.6, hw: 2.0, hd: 1.5 });
            const moonPole = pivot(g, [3.6, 0, -DD / 2 - 1.0]);
            part('cyl', 0xa86b3c, [0.12, 5.2, 0.12], [0, 2.6, 0], moonPole, { kind: 'wood' });
            part('halfTorus', 0xffd166, [0.8, 0.8, 1.4], [0, 5.6, 0], moonPole, { rot: [0, 0, -Math.PI / 2], kind: 'plastic' });
            [[0.9, 6.2], [-0.8, 6.5], [0.2, 7.0]].forEach(([x, y]) => part('sphere', 0xfff3a0, [0.14, 0.14, 0.14], [x, y, 0], moonPole, { kind: 'basic', shadow: false }));
            const label = makeTextSprite('🌙 星星睡窩', 48, '#4a3a8a', true);
            label.position.set(0, 5.4, -DD / 2 + 0.8); label.scale.set(3.6, 0.9, 1);
            g.add(label);
            scene.add(g);
            world.den = { x: S.x, z: S.z + 0.5, hw: DW / 2, hd: DD / 2, canopyMat };
            addProxy(new THREE.BoxGeometry(DW, 3, DD), [S.x, 1.5, S.z + 0.5], { kind: 'house' });
        }

        // =====================================================
        //  洗澡小屋：木平台 + 大浴缸 (兩個位子) + 蓮蓬頭 + 小鴨
        // =====================================================
        {
            const B = L.bath;
            const g = new THREE.Group();
            g.position.set(B.x, 0, B.z);
            const DW = 8, DD = 5.4;
            part('box', 0xb8e0f0, [DW, 0.15, DD], [0, 0.075, 0], g, { kind: 'plastic' }).receiveShadow = true;
            // 磁磚格線
            for (let i = 1; i < 8; i++) part('box', 0xffffff, [0.03, 0.01, DD], [-DW / 2 + i * DW / 8, 0.155, 0], g, { shadow: false });
            for (let i = 1; i < 5; i++) part('box', 0xffffff, [DW, 0.01, 0.03], [0, 0.155, -DD / 2 + i * DD / 5], g, { shadow: false });
            // 浴缸 (橢圓)
            const tub = new THREE.Group();
            tub.position.set(0, 0.15, -0.4);
            tub.scale.set(1.7, 1, 1);
            g.add(tub);
            const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.05, 0.9, 32, 1, true),
                new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, clearcoat: 0.8, side: THREE.DoubleSide }));
            wall.position.y = 0.45; wall.castShadow = true;
            tub.add(wall);
            part('torus', 0xffffff, [1.25, 1.25, 0.6], [0, 0.9, 0], tub, { rot: [Math.PI / 2, 0, 0], kind: 'plastic' });
            part('cyl', 0xf0f0f0, [1.05, 0.05, 1.05], [0, 0.03, 0], tub, { kind: 'plastic' });
            // 四隻小腳
            [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]].forEach(([x, z]) => part('sphere', 0xffd166, [0.14, 0.1, 0.14], [x * 0.6, 0.02, z], tub, { kind: 'metal' }));
            const waterMat = new THREE.MeshStandardMaterial({ color: 0x7fd4ff, roughness: 0.05, transparent: true, opacity: 0.7 });
            const water = new THREE.Mesh(new THREE.CircleGeometry(1.18, 32), waterMat);
            water.rotation.x = -Math.PI / 2; water.position.y = 0.7;
            tub.add(water);
            // 泡泡 (洗澡時會變多)
            const bubbles = new THREE.Group();
            bubbles.position.y = 0.72;
            tub.add(bubbles);
            const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transmission: 0.3, transparent: true, opacity: 0.85, clearcoat: 1 });
            for (let i = 0; i < 26; i++) {
                const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 1.0;
                const b = new THREE.Mesh(PetModels.G.sphere, bubbleMat);
                const s = 0.08 + Math.random() * 0.14;
                b.scale.set(s / 1.7, s, s);
                b.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
                b.userData.base = s;
                bubbles.add(b);
            }
            // 小黃鴨
            const duck = pivot(tub, [0.55, 0.74, 0.35]);
            duck.scale.set(1 / 1.7, 1, 1);
            part('sphere', 0xffd23f, [0.16, 0.12, 0.2], [0, 0.06, 0], duck, { kind: 'plastic' });
            part('sphere', 0xffd23f, [0.1, 0.1, 0.1], [0, 0.2, 0.1], duck, { kind: 'plastic' });
            part('cone', 0xff8c1a, [0.04, 0.08, 0.04], [0, 0.19, 0.2], duck, { rot: [Math.PI / 2, 0, 0], kind: 'plastic' });
            // 蓮蓬頭
            const showerX = 1.1 * 1.7 + 0.5;
            part('cyl', 0xb0b8c8, [0.06, 3.0, 0.06], [showerX, 1.5, -0.4], g, { kind: 'metal' });
            part('cyl', 0xb0b8c8, [0.05, 1.2, 0.05], [showerX - 0.6, 3.0, -0.4], g, { rot: [0, 0, Math.PI / 2], kind: 'metal' });
            part('cone', 0xb0b8c8, [0.25, 0.22, 0.25], [showerX - 1.2, 2.88, -0.4], g, { kind: 'metal' });
            const showerDrops = new THREE.Group();
            showerDrops.position.set(showerX - 1.2, 2.7, -0.4);
            g.add(showerDrops);
            const dropMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.8 });
            for (let i = 0; i < 18; i++) {
                const d = new THREE.Mesh(PetModels.G.sphere, dropMat);
                d.scale.set(0.025, 0.08, 0.025);
                d.userData.off = Math.random();
                d.userData.x = (Math.random() - 0.5) * 0.4; d.userData.z = (Math.random() - 0.5) * 0.4;
                showerDrops.add(d);
            }
            showerDrops.visible = false;
            // 毛巾架
            part('box', 0xa86b3c, [0.08, 1.4, 0.08], [-DW / 2 + 0.6, 0.85, -DD / 2 + 0.5], g, { kind: 'wood' });
            part('box', 0xa86b3c, [0.08, 1.4, 0.08], [-DW / 2 + 1.8, 0.85, -DD / 2 + 0.5], g, { kind: 'wood' });
            part('box', 0xa86b3c, [1.3, 0.07, 0.07], [-DW / 2 + 1.2, 1.5, -DD / 2 + 0.5], g, { kind: 'wood' });
            part('box', 0xff9ebb, [0.5, 0.7, 0.05], [-DW / 2 + 0.95, 1.18, -DD / 2 + 0.52], g, { kind: 'fur' });
            part('box', 0x8fd3ff, [0.45, 0.6, 0.05], [-DW / 2 + 1.5, 1.22, -DD / 2 + 0.52], g, { kind: 'fur' });
            // 小屋牆面 (背後) + 屋頂
            part('box', 0xd8f0ff, [DW, 2.6, 0.2], [0, 1.4, -DD / 2 - 0.1], g, { kind: 'plastic' });
            part('box', 0x5aa8e8, [DW + 0.4, 0.22, 1.6], [0, 2.9, -DD / 2 + 0.55], g, { rot: [-0.25, 0, 0], kind: 'plastic' });
            [-1, 0, 1].forEach(i => part('sphere', 0xffffff, [0.28, 0.28, 0.1], [i * 2.4, 1.9, -DD / 2 + 0.02], g, { kind: 'plastic' }));
            const label = makeTextSprite('🛁 洗澡小屋', 48, '#0d4a7a', true);
            label.position.set(0, 3.9, -DD / 2 + 0.3); label.scale.set(3.4, 0.85, 1);
            g.add(label);
            scene.add(g);
            const tubX = B.x, tubZ = B.z - 0.4;
            OBSTACLES.push({ type: 'box', x: tubX, z: tubZ, hw: 2.2, hd: 1.3 });
            OBSTACLES.push({ type: 'box', x: B.x, z: B.z - DD / 2 - 0.1, hw: DW / 2, hd: 0.3 });
            world.bath = {
                x: B.x, z: B.z, hw: DW / 2, hd: DD / 2, deckY: 0.15,
                spots: [
                    { x: tubX - 0.75, z: tubZ, y: 0.62, occupant: null, exit: { x: tubX - 1.2, z: tubZ + 2.1 } },
                    { x: tubX + 0.75, z: tubZ, y: 0.62, occupant: null, exit: { x: tubX + 1.2, z: tubZ + 2.1 } },
                ],
                stand: { x: tubX, z: tubZ + 2.2 },
                bubbles, showerDrops, foam: 0, showerT: 0,
            };
            addProxy(new THREE.BoxGeometry(DW, 2.5, DD), [B.x, 1.2, B.z], { kind: 'bath' });
        }

        // ---------- 廁所 (沙坑 + 小屋) ----------
        {
            const T = L.toilet;
            const g = new THREE.Group();
            g.position.set(T.x, 0, T.z);
            part('box', 0xd8b26a, [6.4, 0.3, 4.6], [0, 0.15, 0], g);
            part('box', 0xf5deb3, [5.8, 0.32, 4.0], [0, 0.17, 0], g).receiveShadow = true;
            part('box', 0x9fc5ff, [2.2, 2.4, 1.4], [0, 1.2, -2.6], g, { kind: 'plastic' });
            part('box', 0x5a8dee, [2.6, 0.25, 1.8], [0, 2.5, -2.6], g, { kind: 'plastic' });
            part('box', 0xffffff, [0.8, 1.3, 0.05], [0, 0.95, -1.88], g);
            const label = makeTextSprite('🚽 廁所', 48, '#1f3b70', true);
            label.position.set(0, 3.4, -2.6); label.scale.set(2.4, 0.8, 1);
            g.add(label);
            scene.add(g);
            world.toiletSpots = [
                { x: T.x - 1.8, z: T.z + 0.4 }, { x: T.x, z: T.z + 0.6 }, { x: T.x + 1.8, z: T.z + 0.4 },
            ];
        }

        // ---------- 溜滑梯 ----------
        {
            const SL = L.slide;
            const g = new THREE.Group();
            g.position.set(SL.x, 0, SL.z);
            const H = 3.2;
            [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(p => part('cyl', 0xffd166, [0.12, H, 0.12], [p[0], H / 2, p[1]], g, { kind: 'plastic' }));
            part('box', 0x6ec6ff, [2.0, 0.2, 2.0], [0, H, 0], g, { kind: 'plastic' });
            part('cone', 0xff6b6b, [1.6, 1.2, 1.6], [0, H + 2.0, 0], g, { kind: 'plastic' }).geometry = new THREE.ConeGeometry(1, 1, 4);
            [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(p => part('cyl', 0xffd166, [0.08, 1.4, 0.08], [p[0], H + 0.75, p[1]], g, { kind: 'plastic' }));
            [-0.55, 0.55].forEach(z => part('box', 0xff9f43, [0.12, H + 0.5, 0.12], [-1.4, (H + 0.5) / 2, z], g, { rot: [0, 0, -0.18], kind: 'plastic' }));
            for (let i = 0; i < 6; i++) {
                const y = 0.4 + i * 0.52;
                part('box', 0xffffff, [0.1, 0.1, 1.1], [-1.4 + y * 0.18 - 0.05, y, 0], g, { kind: 'plastic' });
            }
            const len = Math.hypot(5, H);
            const slope = new THREE.Group();
            slope.position.set(1.0 + 2.5, H / 2, 0);
            slope.rotation.z = -Math.atan2(H, 5);
            part('box', 0xff6b9a, [len, 0.12, 1.3], [0, 0, 0], slope, { kind: 'plastic' });
            [-0.65, 0.65].forEach(z => part('box', 0xff9ebb, [len, 0.35, 0.1], [0, 0.15, z], slope, { kind: 'plastic' }));
            g.add(slope);
            part('box', 0xff6b9a, [1.2, 0.12, 1.3], [6.4, 0.06, 0], g, { kind: 'plastic' });
            const label = makeTextSprite('🛝 溜滑梯', 48, '#a0204a', true);
            label.position.set(0, H + 3.2, 0); label.scale.set(2.8, 0.8, 1);
            g.add(label);
            scene.add(g);
            world.slide = {
                base: { x: SL.x - 2.5, z: SL.z },
                top: { x: SL.x - 1.0, z: SL.z, y: H },
                start: { x: SL.x + 0.9, z: SL.z, y: H },
                end: { x: SL.x + 6.8, z: SL.z, y: 0.12 },
                exit: { x: SL.x + 7.8, z: SL.z + 1.6 },
                H,
            };
            addProxy(new THREE.BoxGeometry(9, H + 2, 2.6), [SL.x + 2.6, (H + 2) / 2, SL.z], { kind: 'slide' });
        }

        // ---------- 摩天輪 ----------
        {
            const F = L.ferris;
            const g = new THREE.Group();
            g.position.set(F.x, 0, F.z);
            const R = 4.6, hubY = R + 1.3;
            [-1, 1].forEach(sd => {
                [-1, 1].forEach(zz => {
                    const leg = part('box', 0xb0b8c8, [0.25, hubY + 0.6, 0.25], [sd * 1.6, hubY / 2, zz * 0.9], g, { kind: 'metal' });
                    leg.rotation.z = sd * 0.26;
                    leg.rotation.x = -zz * 0.12;
                });
            });
            part('box', 0xe2b04a, [7.0, 0.3, 2.6], [0, 0.15, -0.6], g).receiveShadow = true;
            const wheel = new THREE.Group();
            wheel.position.set(0, hubY, 0);
            g.add(wheel);
            part('cyl', 0x888888, [0.35, 2.2, 0.35], [0, 0, 0], wheel, { rot: [Math.PI / 2, 0, 0], kind: 'metal' });
            [-0.5, 0.5].forEach(z => {
                const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 6, 48), mat(0xff8fb0, 'plastic'));
                rim.position.z = z; rim.castShadow = true;
                wheel.add(rim);
            });
            const N = 8;
            for (let i = 0; i < N; i++) {
                const a = i / N * Math.PI * 2;
                [-0.5, 0.5].forEach(z => {
                    const sp = part('box', 0xffffff, [0.07, R, 0.07], [Math.cos(a) * R / 2, Math.sin(a) * R / 2, z], wheel, { kind: 'metal' });
                    sp.rotation.z = a - Math.PI / 2;
                });
                part('sphere', 0xfff3a0, [0.14, 0.14, 0.14], [Math.cos(a) * R, Math.sin(a) * R, 0.6], wheel, { kind: 'basic', shadow: false });
            }
            const gondolas = [];
            const gColors = [0xff6b6b, 0x6ec6ff, 0xffd166, 0x7ed957, 0xb388ff, 0xff9f43, 0xff8fb0, 0x4dd0e1];
            for (let i = 0; i < N; i++) {
                const a = i / N * Math.PI * 2;
                const holder = new THREE.Group();
                holder.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
                wheel.add(holder);
                const cab = new THREE.Group();
                holder.add(cab);
                part('box', 0x666666, [0.06, 0.7, 0.06], [0, -0.35, 0], cab, { kind: 'metal' });
                part('cyl', gColors[i], [0.75, 0.12, 0.75], [0, -0.9, 0], cab, { kind: 'plastic' });
                const bowl = part('cyl', gColors[i], [0.8, 0.5, 0.8], [0, -1.05, 0], cab);
                bowl.geometry = new THREE.CylinderGeometry(1, 0.75, 1, 12, 1, true);
                bowl.material = new THREE.MeshPhysicalMaterial({ color: gColors[i], side: THREE.DoubleSide, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 });
                part('cyl', gColors[i], [0.75, 0.05, 0.75], [0, -1.3, 0], cab, { kind: 'plastic' });
                part('cone', 0xffffff, [0.85, 0.4, 0.85], [0, -0.45, 0], cab, { kind: 'plastic' });
                gondolas.push({ holder, cab, baseAngle: a, rider: null });
            }
            const label = makeTextSprite('🎡 摩天輪', 48, '#7a2050', true);
            label.position.set(0, hubY + R + 1.6, 0); label.scale.set(2.8, 0.8, 1);
            g.add(label);
            scene.add(g);
            world.ferris = {
                group: g, wheel, gondolas, R, hubY, angle: 0, speed: 0.22,
                board: { x: F.x, z: F.z + 2.3 },
                seatPos(gd, out) {
                    const a = gd.baseAngle + this.angle;
                    out.set(F.x + Math.cos(a) * R, hubY + Math.sin(a) * R - 1.25, F.z);
                    return out;
                },
            };
            addProxy(new THREE.BoxGeometry(11, 12, 3), [F.x, 6, F.z], { kind: 'ferris' });
        }

        // ---------- 盪鞦韆 (三個座位) ----------
        {
            const W = L.swings;
            const g = new THREE.Group();
            g.position.set(W.x, 0, W.z);
            const barY = 3.4, LEN = 2.6, HALF = 4.4;
            // A 字支架
            [-HALF, HALF].forEach(z => {
                [-1, 1].forEach(sx => {
                    const leg = part('cyl', 0x4dd0e1, [0.12, barY / Math.cos(0.32) + 0.1, 0.12], [sx * 0.55, barY / 2, z], g, { kind: 'metal' });
                    leg.rotation.z = sx * 0.32;
                });
                part('sphere', 0xffd166, [0.22, 0.22, 0.22], [0, barY, z], g, { kind: 'plastic' });
            });
            part('cyl', 0xff8fb0, [0.11, HALF * 2, 0.11], [0, barY, 0], g, { rot: [Math.PI / 2, 0, 0], kind: 'metal' });
            // 地墊
            part('box', 0xff9e80, [4.4, 0.05, HALF * 2 - 0.8], [0, 0.03, 0], g, { kind: 'fur' }).receiveShadow = true;
            const seatColors = [0xff6b6b, 0xffd166, 0x6ec6ff];
            const seats = [];
            [-2.6, 0, 2.6].forEach((z, i) => {
                const pv = pivot(g, [0, barY, z]);
                [-0.38, 0.38].forEach(cz => part('cyl', 0xb0b8c8, [0.025, LEN, 0.025], [0, -LEN / 2, cz], pv, { kind: 'metal' }));
                part('box', seatColors[i], [0.6, 0.1, 0.9], [0, -LEN, 0], pv, { kind: 'plastic' });
                seats.push({ pivot: pv, z: W.z + z, angle: 0, amp: 0, t: Math.random() * 6, rider: null, reserved: null });
            });
            const label = makeTextSprite('🪁 盪鞦韆', 48, '#0b6b7a', true);
            label.position.set(0, barY + 1.3, 0); label.scale.set(2.8, 0.8, 1);
            g.add(label);
            scene.add(g);
            world.swings = {
                x: W.x, barY, LEN, seats,
                boardX: W.x - 2.3,
                seatPos(seat, out) {
                    out.set(W.x + Math.sin(seat.angle) * LEN, barY - Math.cos(seat.angle) * LEN + 0.06, seat.z);
                    return out;
                },
            };
            addProxy(new THREE.BoxGeometry(3.6, barY + 0.6, HALF * 2 + 0.6), [W.x, (barY + 0.6) / 2, W.z], { kind: 'swing' });
        }

        // ---------- 飲水槽 ----------
        {
            const TR = L.trough;
            const g = new THREE.Group();
            g.position.set(TR.x, 0, TR.z);
            const W = 8, D = 1.4, H = 0.75;
            part('box', 0x8d6e63, [W, 0.15, D], [0, 0.08, 0], g, { kind: 'wood' });
            [-1, 1].forEach(sd => {
                part('box', 0xa1887f, [W, H, 0.15], [0, H / 2, sd * D / 2], g, { kind: 'wood' });
                part('box', 0xa1887f, [0.15, H, D], [sd * W / 2, H / 2, 0], g, { kind: 'wood' });
            });
            [-3.6, 0, 3.6].forEach(x => part('box', 0x6d4c41, [0.3, 0.2, D + 0.3], [x, 0.1, 0], g, { kind: 'wood' }));
            const waterMat = new THREE.MeshStandardMaterial({ color: 0x3fa9e0, transparent: true, opacity: 0.82, roughness: 0.06, metalness: 0.1 });
            const water = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 1, D - 0.3), waterMat);
            water.position.y = 0.15;
            g.add(water);
            part('cyl', 0x90a4ae, [0.1, 1.6, 0.1], [W / 2 + 0.4, 0.8, 0], g, { kind: 'metal' });
            part('cyl', 0x90a4ae, [0.08, 0.6, 0.08], [W / 2 + 0.15, 1.55, 0], g, { rot: [0, 0, Math.PI / 2], kind: 'metal' });
            const label = makeTextSprite('💧 飲水槽', 48, '#0d4a7a', true);
            label.position.set(0, 2.2, 0); label.scale.set(2.8, 0.8, 1);
            g.add(label);
            scene.add(g);
            world.trough = { group: g, water, H, W, label };
            world.drinkSpots = [];
            for (let i = 0; i < 6; i++) {
                const x = TR.x - 3.2 + i * 1.28;
                world.drinkSpots.push({ x, z: TR.z - D / 2 - 1.1, face: 0 });
                world.drinkSpots.push({ x, z: TR.z + D / 2 + 1.1, face: Math.PI });
            }
            world.troughFill = { x: TR.x + W / 2 + 1.2, z: TR.z - 0.8 };
            addProxy(new THREE.BoxGeometry(W + 1, 2, D + 1), [TR.x, 1, TR.z], { kind: 'trough' });
        }

        // =====================================================
        //  大池塘 (架高的石砌水池)：魚、小烏龜、石頭小島、餵魚機
        // =====================================================
        {
            const P = L.pond;
            // 石牆
            const wall = new THREE.Mesh(new THREE.CylinderGeometry(POND_RIM, POND_RIM + 0.15, POND_Y + 0.15, 64, 1, true),
                new THREE.MeshStandardMaterial({ color: 0xb8b0a4, roughness: 0.95, side: THREE.DoubleSide }));
            wall.position.set(P.x, (POND_Y + 0.15) / 2, P.z);
            wall.castShadow = true; wall.receiveShadow = true;
            scene.add(wall);
            const cap = new THREE.Mesh(new THREE.RingGeometry(POND_R, POND_RIM + 0.05, 64), mat(0xd8d0c4));
            cap.rotation.x = -Math.PI / 2; cap.position.set(P.x, POND_Y + 0.15, P.z); cap.receiveShadow = true;
            scene.add(cap);
            // 石牆上的石頭
            for (let i = 0; i < 26; i++) {
                const a = i / 26 * Math.PI * 2 + srand() * 0.1;
                const s = 0.35 + srand() * 0.25;
                part('sphere', [0x9e9e9e, 0xb0a898, 0x8f8a80][i % 3], [s, s * 0.6, s * 0.8], [P.x + Math.cos(a) * (POND_RIM - 0.2), POND_Y + 0.2, P.z + Math.sin(a) * (POND_RIM - 0.2)], scene, { rot: [0, a, 0] });
            }
            // 池底 (深淺變化)
            const bedMat = new THREE.MeshStandardMaterial({ color: 0x2a6e7a, roughness: 0.9 });
            const bed = new THREE.Mesh(new THREE.CircleGeometry(POND_R + 0.05, 48), bedMat);
            bed.rotation.x = -Math.PI / 2; bed.position.set(P.x, 0.06, P.z);
            scene.add(bed);
            for (let i = 0; i < 18; i++) {
                const a = srand() * Math.PI * 2, r = srand() * (POND_R - 0.6);
                part('sphere', 0x5a8f7a, [0.3 + srand() * 0.3, 0.08, 0.3 + srand() * 0.3], [P.x + Math.cos(a) * r, 0.08, P.z + Math.sin(a) * r], scene, { shadow: false });
            }
            // 水草
            for (let i = 0; i < 16; i++) {
                const a = srand() * Math.PI * 2, r = 2.5 + srand() * (POND_R - 3);
                const h = 0.3 + srand() * 0.3;
                part('cone', 0x3f9a4a, [0.06, h, 0.06], [P.x + Math.cos(a) * r, 0.06 + h / 2, P.z + Math.sin(a) * r], scene, { shadow: false });
            }
            // 中央石頭小島 (烏龜曬太陽)
            const isle = { x: P.x + 1.2, z: P.z - 0.6, r: 1.3, top: POND_Y + 0.22 };
            part('sphere', 0x8f8a80, [1.4, 0.55, 1.2], [isle.x, POND_Y - 0.15, isle.z], scene);
            part('sphere', 0xa09a90, [0.9, 0.4, 0.8], [isle.x - 0.4, POND_Y + 0.05, isle.z + 0.3], scene);
            part('sphere', 0x6fa84a, [0.5, 0.2, 0.4], [isle.x + 0.6, POND_Y + 0.15, isle.z - 0.3], scene);
            world.isle = isle;
            // 水面 (會起漣漪)
            const pond = new THREE.Mesh(new THREE.RingGeometry(0.01, POND_R, 72, 14),
                new THREE.MeshStandardMaterial({ color: 0x6ac0e8, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false }));
            pond.rotation.x = -Math.PI / 2; pond.position.set(P.x, POND_Y, P.z);
            pond.receiveShadow = true;
            pond.renderOrder = 2;
            scene.add(pond);
            world.pond = pond;
            world.pondBase = Float32Array.from(pond.geometry.attributes.position.array);
            // 荷葉 + 荷花
            world.lilies = [];
            [[-3.5, 2], [2.5, 3.2], [-1.5, -3.8], [4.2, -1.8], [-4.4, -1]].forEach((p, i) => {
                const pad = new THREE.Mesh(new THREE.CircleGeometry(0.6, 14, 0.3, Math.PI * 1.8), mat(0x4caf50));
                pad.rotation.x = -Math.PI / 2; pad.position.set(P.x + p[0], POND_Y + 0.02, P.z + p[1]);
                scene.add(pad);
                if (i % 2 === 0) part('sphere', 0xff8fb0, [0.22, 0.16, 0.22], [P.x + p[0], POND_Y + 0.12, P.z + p[1]], scene, { shadow: false });
                world.lilies.push(pad);
            });

            // 魚
            world.fish = [];
            const fishColors = [[0xff7a1a, 0xffffff], [0xffffff, 0xff3b1a], [0xffd23f, 0xff7a1a], [0xff3b3b, 0xffffff], [0xffb03a, 0x222222], [0xffffff, 0xff7a1a], [0xff8c42, 0xffd23f], [0xf5f5f5, 0x333333], [0xff6a00, 0xff6a00]];
            fishColors.forEach((fc, i) => {
                const fg = new THREE.Group();
                const s = 0.75 + srand() * 0.45;
                fg.scale.setScalar(s);
                part('sphere', fc[0], [0.17, 0.13, 0.42], [0, 0, 0], fg, { kind: 'plastic' });
                part('sphere', fc[1], [0.12, 0.1, 0.14], [0, 0.04, 0.05], fg, { kind: 'plastic', shadow: false });
                part('sphere', fc[1], [0.09, 0.08, 0.1], [0.02, 0.03, -0.18], fg, { kind: 'plastic', shadow: false });
                [-1, 1].forEach(sd => part('sphere', 0x111111, [0.03, 0.03, 0.03], [0.12 * sd, 0.04, 0.3], fg, { kind: 'eye', shadow: false }));
                part('cone', fc[0], [0.03, 0.14, 0.14], [0, 0.14, -0.02], fg, { rot: [-0.4, 0, 0], kind: 'plastic', shadow: false });
                const tail = pivot(fg, [0, 0, -0.38]);
                part('cone', fc[0], [0.03, 0.26, 0.2], [0, 0, -0.1], tail, { rot: [-Math.PI / 2, 0, 0], kind: 'plastic', shadow: false });
                scene.add(fg);
                world.fish.push({
                    g: fg, tail, x: P.x + rand(-3, 3), z: P.z + rand(-3, 3), y: POND_Y - 0.18 - srand() * 0.25,
                    yaw: rand(-Math.PI, Math.PI), speed: rand(0.6, 1.1), t: Math.random() * 10, target: null, wanderT: 0, food: null,
                });
            });

            // 小烏龜
            world.turtles = [];
            for (let i = 0; i < 3; i++) {
                const tg = new THREE.Group();
                tg.scale.setScalar(0.85 + i * 0.12);
                part('sphere', 0x5e8f3a, [0.42, 0.24, 0.5], [0, 0.08, 0], tg);
                // 龜殼花紋
                [[0, 0.27, 0], [0.18, 0.22, 0.18], [-0.18, 0.22, 0.18], [0.18, 0.22, -0.18], [-0.18, 0.22, -0.18]].forEach(p => part('sphere', 0x3f6b24, [0.13, 0.05, 0.13], p, tg, { shadow: false }));
                part('sphere', 0xc8d88a, [0.4, 0.08, 0.48], [0, -0.03, 0], tg, { shadow: false });
                const head = pivot(tg, [0, 0.06, 0.5]);
                part('sphere', 0x8fbf5a, [0.13, 0.12, 0.16], [0, 0, 0.06], head);
                [-1, 1].forEach(sd => part('sphere', 0x111111, [0.025, 0.025, 0.025], [0.08 * sd, 0.05, 0.16], head, { kind: 'eye', shadow: false }));
                const flips = [];
                [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
                    const fp = pivot(tg, [0.36 * sx, 0, 0.3 * sz]);
                    part('sphere', 0x8fbf5a, [0.16, 0.04, 0.09], [0.08 * sx, 0, 0], fp, { shadow: false });
                    fp.userData.sx = sx; fp.userData.sz = sz;
                    flips.push(fp);
                });
                scene.add(tg);
                world.turtles.push({
                    g: tg, head, flips, x: P.x + rand(-3, 3), z: P.z + rand(-3, 3), yaw: rand(-3, 3),
                    mode: i === 0 ? 'rest' : 'swim', modeT: rand(8, 20), t: Math.random() * 10, target: null, food: null,
                    restSpot: { x: isle.x + [-0.3, 0.5, 0.1][i], z: isle.z + [0.2, -0.2, 0.6][i] },
                });
            }

            // 漣漪、飼料
            world.ripples = [];
            const rippleGeo = new THREE.RingGeometry(0.85, 1, 32);
            for (let i = 0; i < 24; i++) {
                const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
                m.rotation.x = -Math.PI / 2;
                m.visible = false;
                m.renderOrder = 3;
                scene.add(m);
                world.ripples.push({ m, t: 0, life: 0 });
            }
            world.pellets = [];
            world.pelletGeo = new THREE.SphereGeometry(0.06, 6, 4);
            world.pelletMat = new THREE.MeshStandardMaterial({ color: 0xa0612a, roughness: 0.8 });

            // 餵魚機 (在池塘前方)
            const dir = new THREE.Vector2(-0.72, 0.69).normalize();
            const fdx = P.x + dir.x * (POND_RIM + 1.0), fdz = P.z + dir.y * (POND_RIM + 1.0);
            const fd = new THREE.Group();
            fd.position.set(fdx, 0, fdz);
            fd.rotation.y = Math.atan2(-dir.x, -dir.y); // 面向池塘
            part('box', 0xe53935, [0.8, 1.0, 0.7], [0, 0.5, 0], fd, { kind: 'plastic' });
            part('box', 0xffffff, [0.82, 0.12, 0.72], [0, 1.02, 0], fd, { kind: 'plastic' });
            part('cyl', 0xffd166, [0.18, 0.1, 0.05], [0, 0.6, -0.36], fd, { rot: [Math.PI / 2, 0, 0], kind: 'metal' }); // 投幣孔
            const globe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14),
                new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.35, roughness: 0.05, thickness: 0.2 }));
            globe.position.set(0, 1.55, 0);
            fd.add(globe);
            const pelletsInside = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), world.pelletMat);
            pelletsInside.position.set(0, 1.5, 0);
            fd.add(pelletsInside);
            part('cyl', 0xe53935, [0.22, 0.12, 0.22], [0, 2.08, 0], fd, { kind: 'plastic' });
            // 出料口
            part('box', 0x9e9e9e, [0.18, 0.18, 0.45], [0, 0.85, 0.5], fd, { kind: 'metal' });
            const lever = pivot(fd, [0.42, 0.75, 0]);
            part('cyl', 0x9e9e9e, [0.04, 0.4, 0.04], [0.05, 0.2, 0], lever, { kind: 'metal' });
            part('sphere', 0xffd166, [0.09, 0.09, 0.09], [0.05, 0.42, 0], lever, { kind: 'plastic' });
            const fdLabel = makeTextSprite('🐟 餵魚機', 44, '#a01818', true);
            fdLabel.position.set(0, 2.7, 0); fdLabel.scale.set(2.4, 0.7, 1);
            fd.add(fdLabel);
            scene.add(fd);
            OBSTACLES.push({ type: 'circle', x: fdx, z: fdz, r: 0.6 });
            world.feeder = {
                group: fd, lever, globe, x: fdx, z: fdz,
                stand: { x: fdx + dir.x * 1.3, z: fdz + dir.y * 1.3 },
                spout: { x: P.x + dir.x * (POND_RIM - 0.2), z: P.z + dir.y * (POND_RIM - 0.2) },
                leverT: 0,
            };
            addProxy(new THREE.BoxGeometry(1.4, 2.6, 1.4), [fdx, 1.3, fdz], { kind: 'feeder' });
            addProxy(new THREE.CylinderGeometry(POND_RIM, POND_RIM, POND_Y + 0.4, 24), [P.x, (POND_Y + 0.4) / 2, P.z], { kind: 'pond' });
        }

        // =====================================================
        //  小吃販賣店
        // =====================================================
        {
            const SH = L.shop;
            const g = new THREE.Group();
            g.position.set(SH.x, 0, SH.z);
            const W = 6, D = 3.2, H = 2.6;
            // 後半部是店面，前半部是開放的櫃台區 (店員站在這裡)
            part('box', 0xfff3dc, [W, H, 2.0], [0, H / 2, -1.0], g, { kind: 'wood' });
            [-1, 1].forEach(sd => part('box', 0xfff3dc, [0.15, H, 1.6], [sd * (W / 2 - 0.08), H / 2, 0.75], g, { kind: 'wood' }));
            // 後牆的貨架
            [0.9, 1.6].forEach(y => part('box', 0xd2a066, [W - 0.6, 0.06, 0.4], [0, y, -0.02], g, { kind: 'wood' }));
            [[-2, 0.98, 0xff6b6b], [-1.2, 0.98, 0xffd166], [0.4, 0.98, 0x7ed957], [1.6, 0.98, 0x6ec6ff], [-1.6, 1.68, 0xb388ff], [0, 1.68, 0xff9f43], [1.2, 1.68, 0xff6bd5]].forEach(([x, y, c]) =>
                part('box', c, [0.35, 0.3, 0.25], [x, y + 0.13, -0.02], g, { kind: 'plastic' }));
            part('box', 0xe0a060, [W + 0.2, 0.25, D + 0.2], [0, 0.12, -0.4], g, { kind: 'wood' });
            // 櫃台
            part('box', 0xff8fb0, [W - 0.2, 1.05, 0.7], [0, 0.52, D / 2 - 0.15], g, { kind: 'plastic' });
            part('box', 0xffffff, [W - 0.1, 0.08, 0.85], [0, 1.08, D / 2 - 0.12], g, { kind: 'plastic' });
            // 櫃台上的零食罐
            const jarColors = [0xff6b6b, 0xffd166, 0x7ed957, 0x6ec6ff, 0xb388ff];
            jarColors.forEach((c, i) => {
                const x = -2.2 + i * 1.1;
                part('sphere', c, [0.17, 0.17, 0.17], [x, 1.3, D / 2 - 0.15], g, { kind: 'plastic' });
                part('sphere', c, [0.14, 0.14, 0.14], [x + 0.12, 1.42, D / 2 - 0.2], g, { kind: 'plastic' });
                const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 14),
                    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1 }));
                jar.position.set(x + 0.05, 1.4, D / 2 - 0.17);
                g.add(jar);
            });
            // 條紋遮雨棚
            for (let i = 0; i < 10; i++) {
                const st = part('box', i % 2 ? 0xffffff : 0xff4d6d, [W / 10 + 0.01, 0.07, 1.6], [-W / 2 + (i + 0.5) * W / 10, H + 0.18, D / 2 + 0.3], g, { rot: [0.38, 0, 0], kind: 'fur' });
                st.castShadow = true;
                // 垂下的波浪邊
                part('sphere', i % 2 ? 0xffffff : 0xff4d6d, [W / 20 + 0.01, 0.16, 0.05], [-W / 2 + (i + 0.5) * W / 10, H - 0.15, D / 2 + 1.05], g, { kind: 'fur', shadow: false });
            }
            part('box', 0xff4d6d, [W + 0.3, 0.3, D + 0.3], [0, H + 0.05, -0.4], g, { kind: 'plastic' });
            // 屋頂上的大冰淇淋
            const ice = pivot(g, [W / 2 - 0.9, H + 0.2, -0.6]);
            part('cone', 0xe8b070, [0.45, 1.2, 0.45], [0, 0.6, 0], ice, { rot: [Math.PI, 0, 0], kind: 'wood' });
            part('sphere', 0xffb3c7, [0.52, 0.48, 0.52], [0, 1.35, 0], ice, { kind: 'plastic' });
            part('sphere', 0xfff3b0, [0.44, 0.4, 0.44], [0, 1.85, 0], ice, { kind: 'plastic' });
            part('sphere', 0xff3b3b, [0.12, 0.12, 0.12], [0, 2.3, 0], ice, { kind: 'plastic' });
            // 菜單看板
            const menu = new THREE.Group();
            menu.position.set(-W / 2 - 0.5, 0, D / 2 + 0.2);
            part('box', 0x6d4c41, [0.08, 1.6, 0.08], [0, 0.8, 0], menu, { kind: 'wood' });
            part('box', 0x2e3b32, [0.9, 0.9, 0.06], [0, 1.5, 0], menu);
            const menuTxt = makeTextSprite('今日推薦 🍦', 40, '#ffffff');
            menuTxt.position.set(0, 1.55, 0.05); menuTxt.scale.set(0.85, 0.22, 1);
            menu.add(menuTxt);
            g.add(menu);
            const sign = makeTextSprite('🍦 小吃店 🍿', 56, '#c2185b', true);
            sign.position.set(-0.6, H + 1.15, 0.2); sign.scale.set(3.8, 0.95, 1);
            g.add(sign);
            // 店員 (戴廚師帽的小哥)
            const clerk = PetModels.buildKid('chef');
            clerk.position.set(0, 0.25, D / 2 - 0.9);
            g.add(clerk);
            scene.add(g);
            world.shop = {
                group: g, clerk, clerkRig: clerk.userData.rig,
                stand: { x: SH.x, z: SH.z + D / 2 + 1.9 },
                wave: 0,
            };
            addProxy(new THREE.BoxGeometry(W + 0.6, H + 2, D + 1.4), [SH.x, (H + 2) / 2, SH.z], { kind: 'shop' });
        }

        // ---------- 長椅 + 路燈 ----------
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1c1 });
        world.bulbMat = bulbMat;
        world.lampSpots = [];
        [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5], [L.pond.x - 9, L.pond.z + 2], [L.shop.x + 5, L.shop.z + 3]].forEach(([x, z]) => {
            world.lampSpots.push({ x, y: 3.78, z });   // 麻雀可以停在燈罩上
            const g = new THREE.Group();
            g.position.set(x, 0, z);
            part('cyl', 0x37474f, [0.1, 3.2, 0.1], [0, 1.6, 0], g, { kind: 'metal' });
            part('cyl', 0x37474f, [0.25, 0.15, 0.25], [0, 0.07, 0], g, { kind: 'metal' });
            const bulb = new THREE.Mesh(G_SPHERE(), bulbMat);
            bulb.scale.setScalar(0.32);
            bulb.position.y = 3.3;
            g.add(bulb);
            part('cone', 0x37474f, [0.42, 0.3, 0.42], [0, 3.62, 0], g, { kind: 'metal' });
            scene.add(g);
            OBSTACLES.push({ type: 'circle', x, z, r: 0.25 });
        });
        // 長椅：yaw = 坐下時面對的方向
        world.benches = [];
        [[0, -7.6, 0], [-7.6, 0, Math.PI / 2], [7.6, 0, -Math.PI / 2], [L.pond.x - 9.6, L.pond.z - 1.2, Math.PI / 2], [L.pond.x - 1, L.pond.z - 8.6, 0]].forEach(([x, z, r], i) => {
            const g = new THREE.Group();
            g.position.set(x, 0, z); g.rotation.y = r;
            part('box', 0xb5763a, [2.4, 0.12, 0.7], [0, 0.6, 0], g, { kind: 'wood' });
            [-0.2, 0.05].forEach(dy => part('box', 0xb5763a, [2.4, 0.14, 0.08], [0, 0.95 + dy * 1.6, -0.32], g, { kind: 'wood' }));
            [-1, 1].forEach(sd => {
                part('box', 0x555555, [0.1, 0.6, 0.6], [sd * 1.0, 0.3, 0], g, { kind: 'metal' });
                part('box', 0x555555, [0.08, 0.7, 0.08], [sd * 1.0, 0.85, -0.32], g, { kind: 'metal' });
                part('box', 0x555555, [0.08, 0.08, 0.55], [sd * 1.15, 0.85, -0.05], g, { kind: 'metal' });
            });
            scene.add(g);
            const fx = Math.sin(r), fz = Math.cos(r);
            const horiz = Math.abs(Math.sin(r)) < 0.5;
            OBSTACLES.push({ type: 'box', x, z, hw: horiz ? 1.3 : 0.45, hd: horiz ? 0.45 : 1.3 });
            world.benches.push({
                x, z, yaw: r, seatY: 0.66,
                seat: { x: x + fx * 0.08, z: z + fz * 0.08 },
                front: { x: x + fx * 1.25, z: z + fz * 1.25 },
                occupant: null,
            });
            addProxy(new THREE.BoxGeometry(horiz ? 2.6 : 0.9, 1.4, horiz ? 0.9 : 2.6), [x, 0.7, z], { kind: 'bench', index: i });
        });
        // 夜晚燈光
        const lampLight1 = new THREE.PointLight(0xffd59a, 0, 22, 1.6);
        lampLight1.position.set(0, 4, 0);
        scene.add(lampLight1);
        const lampLight2 = new THREE.PointLight(0xffc27a, 0, 18, 1.6);
        lampLight2.position.set(L.sleep.x, 4, L.sleep.z);
        scene.add(lampLight2);
        const lampLight3 = new THREE.PointLight(0xffd59a, 0, 14, 1.6);
        lampLight3.position.set(L.shop.x, 3.5, L.shop.z + 2.5);
        scene.add(lampLight3);
        world.nightLights = [lampLight1, lampLight2, lampLight3];

        // ---------- 天空：雲、星星、螢火蟲 ----------
        world.cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
        world.clouds = [];
        for (let i = 0; i < 9; i++) {
            const c = new THREE.Group();
            const n = 3 + (i % 3);
            for (let k = 0; k < n; k++) {
                const m = new THREE.Mesh(PetModels.G.sphere, world.cloudMat);
                m.scale.set(rand(1.6, 2.6), rand(1.0, 1.5), rand(1.4, 2.0));
                m.position.set(k * 1.9 - n, rand(-0.3, 0.3), rand(-0.5, 0.5));
                c.add(m);
            }
            c.position.set(rand(-70, 70), rand(18, 26), rand(-70, -32));
            c.userData.speed = rand(0.4, 1.0);
            c.userData.baseY = c.position.y;
            world.clouds.push(c);
            scene.add(c);
        }
        const starGeo = new THREE.BufferGeometry();
        const sp = [];
        for (let i = 0; i < 500; i++) {
            const a = Math.random() * Math.PI * 2, e = rand(0.15, 1.3);
            sp.push(Math.cos(a) * Math.cos(e) * 160, Math.sin(e) * 160, Math.sin(a) * Math.cos(e) * 160);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0, fog: false }));
        scene.add(stars);
        world.stars = stars;

        const ffGeo = new THREE.BufferGeometry();
        const ffPos = new Float32Array(70 * 3);
        world.fireflies = [];
        for (let i = 0; i < 70; i++) {
            // 一部分螢火蟲聚在睡窩附近
            const nearDen = i < 22;
            world.fireflies.push({
                x: nearDen ? L.sleep.x + rand(-7, 7) : rand(-36, 36),
                z: nearDen ? L.sleep.z + rand(-6, 7) : rand(-22, 22),
                y: rand(0.5, 3), p: Math.random() * 6,
            });
        }
        ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
        const ff = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xeaff7a, size: 0.35, transparent: true, opacity: 0 }));
        scene.add(ff);
        world.ffPoints = ff;

        const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff8d6, fog: false }));
        moon.position.set(-60, 55, -110);
        scene.add(moon);
        world.moon = moon;

        scene.fog = new THREE.Fog(0x9fd8ff, 100, 260);

        const sky = makeSkyDome(290);
        scene.add(sky);
        world.sky = sky;

        // ---------- 給「佈置模式」用：檢查能不能放、更新尋路 ----------
        world.invalidateNav = () => { for (const k in navCache) delete navCache[k]; };
        world.canPlace = (x, z, r) => {
            if (x < BOUNDS.minX + r + 0.5 || x > BOUNDS.maxX - r - 0.5 || z < BOUNDS.minZ + r + 0.5 || z > BOUNDS.maxZ - r - 0.5) return false;
            if (Math.hypot(x, z) < 7.2 + r) return false;                       // 中央廣場
            if (Math.abs(x) < 1.6 + r && z > 0) return false;                    // 入口步道
            if (FAC_RECTS.some(f => Math.abs(x - f[0]) < f[2] + r * 0.5 && Math.abs(z - f[1]) < f[3] + r * 0.5)) return false;
            for (const o of OBSTACLES) {
                if (o.type === 'circle') { if (Math.hypot(x - o.x, z - o.z) < o.r + r + 0.2) return false; }
                else if (Math.abs(x - o.x) < o.hw + r + 0.2 && Math.abs(z - o.z) < o.hd + r + 0.2) return false;
            }
            return true;
        };

        world.storm = 0;      // 天氣：雲量 (0~1)
        world.wet = 0;        // 地面濕度
        world.flash = 0;      // 閃電

        // ---------- 池塘動作 API ----------
        world.feedFish = function (count) {
            const F = world.feeder;
            F.leverT = 0.6;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2, r = Math.random() * (POND_R - 1.2);
                const tx = LAYOUT.pond.x + Math.cos(a) * r * 0.8 + (F.spout.x - LAYOUT.pond.x) * 0.35;
                const tz = LAYOUT.pond.z + Math.sin(a) * r * 0.8 + (F.spout.z - LAYOUT.pond.z) * 0.35;
                const m = new THREE.Mesh(world.pelletGeo, world.pelletMat);
                m.castShadow = false;
                m.position.set(F.spout.x, 1.0, F.spout.z);
                scene.add(m);
                world.pellets.push({ m, sx: F.spout.x, sz: F.spout.z, tx, tz, k: -i * 0.05, floating: false, life: 25, eaten: false });
            }
        };
        world.addRipple = function (x, z, size) {
            const r = world.ripples.find(q => q.life <= 0);
            if (!r) return;
            r.m.position.set(x, POND_Y + 0.03, z);
            r.t = 0; r.life = 1.2; r.size = size || 1;
            r.m.visible = true;
        };
        world.scene = scene;
        return world;
    }

    // ---------------------------------------------------------
    //  池塘生物動畫
    // ---------------------------------------------------------
    function inPond(x, z, margin) {
        return Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z) < POND_R - margin;
    }
    function randomPondPoint(margin) {
        for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (POND_R - margin);
            const x = LAYOUT.pond.x + Math.cos(a) * r, z = LAYOUT.pond.z + Math.sin(a) * r;
            return { x, z };
        }
    }
    function turnYaw(cur, target, k) {
        let d = target - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return cur + d * k;
    }
    function updatePond(world, dt, time) {
        const isle = world.isle;
        // 飼料：拋物線飛進水裡 → 浮在水面
        for (let i = world.pellets.length - 1; i >= 0; i--) {
            const p = world.pellets[i];
            if (!p.floating) {
                p.k += dt / 0.7;
                const k = Math.max(0, p.k);
                p.m.visible = p.k >= 0;
                p.m.position.set(p.sx + (p.tx - p.sx) * k, 1.0 + (POND_Y - 1.0) * k + Math.sin(k * Math.PI) * 1.2, p.sz + (p.tz - p.sz) * k);
                if (p.k >= 1) { p.floating = true; world.addRipple(p.tx, p.tz, 0.5); }
            } else {
                p.life -= dt;
                p.m.position.set(p.tx + Math.sin(time * 1.5 + i) * 0.05, POND_Y + 0.02, p.tz + Math.cos(time * 1.3 + i) * 0.05);
                if (p.life <= 0 || p.eaten) {
                    world.scene.remove(p.m);
                    world.pellets.splice(i, 1);
                }
            }
        }
        const floating = world.pellets.filter(p => p.floating && !p.eaten);
        world.fishAte = 0;

        // 魚
        world.fish.forEach((f, i) => {
            f.t += dt;
            let tx, tz, speed = f.speed;
            // 有飼料 → 游過去吃
            if (floating.length) {
                if (!f.food || f.food.eaten) {
                    let best = null, bd = 99;
                    floating.forEach(p => { const d = Math.hypot(p.tx - f.x, p.tz - f.z); if (d < bd) { bd = d; best = p; } });
                    f.food = best;
                }
            } else f.food = null;
            if (f.food) {
                tx = f.food.tx; tz = f.food.tz; speed = f.speed * 2.6;
                if (Math.hypot(tx - f.x, tz - f.z) < 0.25) {
                    f.food.eaten = true; f.food = null;
                    world.addRipple(f.x, f.z, 0.8);
                    world.fishAte++;
                }
            } else {
                f.wanderT -= dt;
                if (!f.target || f.wanderT <= 0 || Math.hypot(f.target.x - f.x, f.target.z - f.z) < 0.4) {
                    f.target = randomPondPoint(0.9);
                    f.wanderT = 4 + Math.random() * 6;
                }
                tx = f.target.x; tz = f.target.z;
            }
            const want = Math.atan2(tx - f.x, tz - f.z);
            f.yaw = turnYaw(f.yaw, want, Math.min(1, dt * (f.food ? 5 : 2)));
            f.x += Math.sin(f.yaw) * speed * dt;
            f.z += Math.cos(f.yaw) * speed * dt;
            // 不要游出池子、不要撞小島
            const dx = f.x - LAYOUT.pond.x, dz = f.z - LAYOUT.pond.z, d = Math.hypot(dx, dz);
            if (d > POND_R - 0.6) { f.x = LAYOUT.pond.x + dx / d * (POND_R - 0.6); f.z = LAYOUT.pond.z + dz / d * (POND_R - 0.6); f.target = null; }
            const ix = f.x - isle.x, iz = f.z - isle.z, idd = Math.hypot(ix, iz);
            if (idd < isle.r + 0.3) { f.x = isle.x + ix / idd * (isle.r + 0.3); f.z = isle.z + iz / idd * (isle.r + 0.3); }
            const yTarget = f.food ? POND_Y - 0.1 : f.y;
            f.g.position.set(f.x, (f.g.position.y || yTarget) + (yTarget - (f.g.position.y || yTarget)) * Math.min(1, dt * 2) + Math.sin(f.t * 1.7 + i) * 0.002, f.z);
            f.g.rotation.y = f.yaw;
            f.g.rotation.z = Math.sin(f.t * 6 + i) * 0.06;
            f.tail.rotation.y = Math.sin(f.t * (f.food ? 18 : 9) + i) * 0.5;
        });

        // 烏龜
        world.turtles.forEach((tt, i) => {
            tt.t += dt;
            tt.modeT -= dt;
            let swimming = true, ty = POND_Y - 0.08;
            if (floating.length && tt.mode !== 'rest' && (!tt.food || tt.food.eaten)) {
                let best = null, bd = 99;
                floating.forEach(p => { const d = Math.hypot(p.tx - tt.x, p.tz - tt.z); if (d < bd) { bd = d; best = p; } });
                tt.food = best;
            }
            if (tt.food && tt.food.eaten) tt.food = null;
            let tx, tz, speed = 0.35;
            if (tt.mode === 'rest') {
                tx = tt.restSpot.x; tz = tt.restSpot.z;
                const d = Math.hypot(tx - tt.x, tz - tt.z);
                if (d < 0.15) { swimming = false; ty = isle.top; }
                else { speed = 0.3; ty = d < isle.r ? isle.top - 0.1 : POND_Y - 0.08; }
                if (tt.modeT <= 0) { tt.mode = 'swim'; tt.modeT = 15 + Math.random() * 20; tt.target = null; }
            } else {
                if (tt.food) { tx = tt.food.tx; tz = tt.food.tz; speed = 0.6; if (Math.hypot(tx - tt.x, tz - tt.z) < 0.3) { tt.food.eaten = true; tt.food = null; world.addRipple(tt.x, tt.z, 0.7); } }
                else {
                    if (!tt.target || Math.hypot(tt.target.x - tt.x, tt.target.z - tt.z) < 0.4) tt.target = randomPondPoint(1.2);
                    tx = tt.target.x; tz = tt.target.z;
                }
                if (tt.modeT <= 0 && !tt.food) { tt.mode = 'rest'; tt.modeT = 12 + Math.random() * 15; }
            }
            if (swimming) {
                const want = Math.atan2(tx - tt.x, tz - tt.z);
                tt.yaw = turnYaw(tt.yaw, want, Math.min(1, dt * 1.5));
                tt.x += Math.sin(tt.yaw) * speed * dt;
                tt.z += Math.cos(tt.yaw) * speed * dt;
                if (tt.mode !== 'rest') {
                    const ix = tt.x - isle.x, iz = tt.z - isle.z, idd = Math.hypot(ix, iz);
                    if (idd < isle.r + 0.2) { tt.x = isle.x + ix / idd * (isle.r + 0.2); tt.z = isle.z + iz / idd * (isle.r + 0.2); }
                }
                if (!inPond(tt.x, tt.z, 0.7)) {
                    const dx = tt.x - LAYOUT.pond.x, dz = tt.z - LAYOUT.pond.z, d = Math.hypot(dx, dz);
                    tt.x = LAYOUT.pond.x + dx / d * (POND_R - 0.7); tt.z = LAYOUT.pond.z + dz / d * (POND_R - 0.7);
                    tt.target = null;
                }
                if (Math.random() < dt * 0.4) world.addRipple(tt.x, tt.z, 0.6);
            }
            const cy = tt.g.position.y || ty;
            tt.g.position.set(tt.x, cy + (ty - cy) * Math.min(1, dt * 3), tt.z);
            tt.g.rotation.y = tt.yaw;
            tt.head.rotation.y = Math.sin(tt.t * 0.8 + i) * (swimming ? 0.2 : 0.5);
            tt.head.position.z = 0.5 + (swimming ? 0 : Math.sin(tt.t * 0.5) * 0.04);
            tt.flips.forEach(fp => {
                fp.rotation.y = swimming ? Math.sin(tt.t * 4 + (fp.userData.sx * fp.userData.sz > 0 ? 0 : Math.PI)) * 0.6 * fp.userData.sx : 0.1;
            });
        });

        // 漣漪
        world.ripples.forEach(r => {
            if (r.life <= 0) return;
            r.t += dt;
            r.life -= dt;
            const s = (0.2 + r.t * 1.4) * r.size;
            r.m.scale.set(s, s, 1);
            r.m.material.opacity = Math.max(0, r.life / 1.2) * 0.55;
            if (r.life <= 0) r.m.visible = false;
        });

        // 餵魚機拉桿
        const F = world.feeder;
        if (F.leverT > 0) {
            F.leverT = Math.max(0, F.leverT - dt);
            F.lever.rotation.z = -Math.sin((F.leverT / 0.6) * Math.PI) * 0.9;
            F.globe.position.x = Math.sin(F.leverT * 40) * 0.02;
        }
    }

    // 漸層天空 (含太陽光暈)；env = true 時是給環境光貼圖用的固定白天版本
    function makeSkyDome(radius, env) {
        const uniforms = {
            topColor: { value: new THREE.Color(0x4f9be8) },
            horizonColor: { value: new THREE.Color(0xcfeaff) },
            bottomColor: { value: new THREE.Color(0x8fbf6a) },
            sunDir: { value: new THREE.Vector3(-0.5, 0.7, 0.3).normalize() },
            sunColor: { value: new THREE.Color(0xfff2d0) },
            sunStrength: { value: 1 },
        };
        const m = new THREE.ShaderMaterial({
            uniforms,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            vertexShader: `varying vec3 vDir;
                void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 bottomColor;
                uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunStrength;
                varying vec3 vDir;
                void main() {
                    vec3 d = normalize(vDir);
                    float h = d.y;
                    vec3 c = mix(horizonColor, topColor, smoothstep(0.0, 0.55, h));
                    c = mix(c, bottomColor, smoothstep(0.0, -0.15, h));
                    float s = max(dot(d, normalize(sunDir)), 0.0);
                    c += sunColor * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.45 + pow(s, 3.0) * 0.12) * sunStrength;
                    gl_FragColor = vec4(c, 1.0);
                    #include <tonemapping_fragment>
                    #include <encodings_fragment>
                }`,
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), m);
        mesh.renderOrder = -10;
        mesh.frustumCulled = false;
        mesh.userData.uniforms = uniforms;
        if (env) { uniforms.sunStrength.value = 0.6; }
        return mesh;
    }

    function makeEnvironment(renderer) {
        const envScene = new THREE.Scene();
        envScene.add(makeSkyDome(50, true));
        const ground = new THREE.Mesh(new THREE.CircleGeometry(50, 32), new THREE.MeshBasicMaterial({ color: 0x6f9f4f }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -2;
        envScene.add(ground);
        const pm = new THREE.PMREMGenerator(renderer);
        const rt = pm.fromScene(envScene, 0.03);
        pm.dispose();
        return rt.texture;
    }

    // ---------- 程序產生的貼圖 ----------
    function makeGrassTexture() {
        const S = 512;
        const cv = document.createElement('canvas'); cv.width = cv.height = S;
        const c = cv.getContext('2d');
        c.fillStyle = '#d2e8bd'; c.fillRect(0, 0, S, S);
        for (let i = 0; i < 260; i++) {
            const x = Math.random() * S, y = Math.random() * S, r = 10 + Math.random() * 40;
            const g = c.createRadialGradient(x, y, 0, x, y, r);
            const l = Math.random() < 0.5 ? 'rgba(170,205,140,0.35)' : 'rgba(255,255,235,0.35)';
            g.addColorStop(0, l); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g;
            for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { c.save(); c.translate(ox, oy); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore(); }
        }
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * S, y = Math.random() * S, len = 3 + Math.random() * 7, a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
            const shade = Math.random();
            c.strokeStyle = shade < 0.5 ? `rgba(140,185,110,${0.35 + Math.random() * 0.3})` : `rgba(250,255,235,${0.25 + Math.random() * 0.3})`;
            c.lineWidth = 1 + Math.random() * 1.2;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
        }
        const t = new THREE.CanvasTexture(cv);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.encoding = THREE.sRGBEncoding;
        t.anisotropy = 8;
        return t;
    }

    function makeStoneTexture() {
        const S = 512;
        const cv = document.createElement('canvas'); cv.width = cv.height = S;
        const c = cv.getContext('2d');
        c.fillStyle = '#9a8a6a'; c.fillRect(0, 0, S, S);
        const rows = 8, h = S / rows;
        for (let r = 0; r < rows; r++) {
            let x = (r % 2) * -h * 0.5;
            while (x < S) {
                const w = h * (0.8 + Math.random() * 0.7);
                const tone = 188 + Math.floor(Math.random() * 30);
                const col = `rgb(${tone + 8},${tone - 2},${tone - 30})`;
                for (const ox of [0, S]) {
                    c.fillStyle = col;
                    roundRect(c, x + 3 - ox, r * h + 3, w - 6, h - 6, 10);
                    c.fill();
                    const g = c.createLinearGradient(0, r * h, 0, r * h + h);
                    g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.10)');
                    c.fillStyle = g;
                    roundRect(c, x + 3 - ox, r * h + 3, w - 6, h - 6, 10);
                    c.fill();
                }
                x += w;
            }
        }
        for (let i = 0; i < 2500; i++) {
            c.fillStyle = `rgba(${Math.random() < 0.5 ? '90,70,40' : '255,255,255'},${Math.random() * 0.12})`;
            c.fillRect(Math.random() * S, Math.random() * S, 2, 2);
        }
        const t = new THREE.CanvasTexture(cv);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.encoding = THREE.sRGBEncoding;
        t.anisotropy = 8;
        return t;
    }

    let blobTex = null;
    function makeBlobShadow() {
        if (!blobTex) {
            const cv = document.createElement('canvas'); cv.width = cv.height = 128;
            const c = cv.getContext('2d');
            const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
            g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.5, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.fillRect(0, 0, 128, 128);
            blobTex = new THREE.CanvasTexture(cv);
        }
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
        m.rotation.x = -Math.PI / 2;
        m.renderOrder = 1;
        return m;
    }

    function G_SPHERE() { return PetModels.G.sphere; }

    function makeTextSprite(text, fontSize, color, bg) {
        const cv = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        ctx.font = `bold ${fontSize}px "Microsoft JhengHei", sans-serif`;
        const w = Math.ceil(ctx.measureText(text).width) + 40;
        cv.width = w; cv.height = fontSize + 30;
        ctx.font = `bold ${fontSize}px "Microsoft JhengHei", sans-serif`;
        if (bg) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            roundRect(ctx, 2, 2, cv.width - 4, cv.height - 4, 22);
            ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
        const tex = new THREE.CanvasTexture(cv);
        tex.encoding = THREE.sRGBEncoding;
        tex.anisotropy = 4;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
        sp.userData.aspect = cv.width / cv.height;
        return sp;
    }
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // ---------- 日夜 + 天氣 ----------
    const SKY_DAY = new THREE.Color(0x9fd8ff);
    const SKY_DUSK = new THREE.Color(0xffa97a);
    const SKY_NIGHT = new THREE.Color(0x141c38);
    const SUN_DAY = new THREE.Color(0xfff6e0);
    const SUN_DUSK = new THREE.Color(0xffa060);
    const HOR_DAY = new THREE.Color(0xd8efff), HOR_DUSK = new THREE.Color(0xffb27a), HOR_NIGHT = new THREE.Color(0x1c2a52);
    const TOP_DAY = new THREE.Color(0x3d8fe6), TOP_DUSK = new THREE.Color(0x6a6fc2), TOP_NIGHT = new THREE.Color(0x070b1e);
    const HOR_STORM = new THREE.Color(0x9aa3ad), TOP_STORM = new THREE.Color(0x6a7480);
    const CLOUD_WHITE = new THREE.Color(0xffffff), CLOUD_DARK = new THREE.Color(0x4a525e);
    const GROUND_DRY = new THREE.Color(0xffffff), GROUND_WET = new THREE.Color(0x9aa89a);
    const tmpC = new THREE.Color();

    // nightAmt: 0 = 白天, 1 = 深夜；duskAmt: 夕陽程度
    function updateWorld(world, scene, dt, time, dayFrac, nightAmt, duskAmt, troughRatio) {
        const storm = world.storm || 0;
        tmpC.copy(SKY_DAY).lerp(SKY_DUSK, duskAmt).lerp(SKY_NIGHT, nightAmt);
        scene.background.copy(tmpC);
        const U = world.sky.userData.uniforms;
        U.horizonColor.value.copy(HOR_DAY).lerp(HOR_DUSK, duskAmt).lerp(HOR_STORM, storm * 0.8 * (1 - nightAmt)).lerp(HOR_NIGHT, nightAmt);
        U.topColor.value.copy(TOP_DAY).lerp(TOP_DUSK, duskAmt * 0.6).lerp(TOP_STORM, storm * 0.85 * (1 - nightAmt)).lerp(TOP_NIGHT, nightAmt);
        U.bottomColor.value.copy(U.horizonColor.value).multiplyScalar(0.8);
        scene.fog.color.copy(U.horizonColor.value);
        scene.fog.near = 100 - storm * 45;
        scene.fog.far = 260 - storm * 110;

        const a = Math.PI * (0.12 + 0.76 * Math.min(1, dayFrac / 0.9));
        world.sun.position.set(Math.cos(a) * -55, Math.max(10, Math.sin(a) * 42), 14);
        U.sunDir.value.copy(world.sun.position).normalize();
        U.sunStrength.value = (1 - nightAmt) * (1 - storm * 0.95);
        U.sunColor.value.copy(SUN_DAY).lerp(SUN_DUSK, duskAmt);
        const flash = world.flash || 0;
        world.sun.intensity = (1.55 * (1 - nightAmt) + 0.22 * nightAmt) * (1 - storm * 0.62) + flash * 2.5;
        world.sun.color.copy(SUN_DAY).lerp(SUN_DUSK, duskAmt);
        if (nightAmt > 0.5) { world.sun.color.setHex(0x9fb4ff); world.sun.position.set(-40, 50, 20); }
        world.hemi.intensity = (0.18 * (1 - nightAmt) + 0.1 * nightAmt) * (1 + storm * 0.6) + flash * 1.2;
        world.hemi.color.setHex(nightAmt > 0.5 ? 0x8fa8ff : 0xdff3ff);
        world.envIntensity = (0.42 * (1 - nightAmt) + 0.08 * nightAmt) * (1 - storm * 0.25);
        world.bloomAmt = nightAmt;
        world.stars.material.opacity = nightAmt * (1 - storm);
        world.moon.visible = nightAmt > 0.05 && storm < 0.6;
        // 下雨天白天也有點暗 → 路燈提早亮
        const lampOn = Math.max(nightAmt, storm * 0.5);
        world.nightLights.forEach(l => { l.intensity = lampOn * 1.4; });
        world.bulbMat.color.setHex(lampOn > 0.3 ? 0xffd27a : 0xfff8e1);
        world.denLightsMat.color.setHex(nightAmt > 0.3 ? 0xffc14d : 0xfff3d0);

        // 背景的雲：下雨時變低、變黑
        tmpC.copy(CLOUD_WHITE).lerp(CLOUD_DARK, storm * 0.85);
        if (nightAmt > 0.5) tmpC.multiplyScalar(0.5);
        world.cloudMat.color.copy(tmpC);
        world.clouds.forEach(c => {
            c.position.x += c.userData.speed * dt * (1 + storm * 1.5);
            if (c.position.x > 90) c.position.x = -90;
            c.position.y += (c.userData.baseY - storm * 9 - c.position.y) * Math.min(1, dt * 0.5);
        });

        // 地面濕度：顏色變深、變得有點反光
        const wet = world.wet || 0;
        world.groundMats.forEach(m => { m.color.copy(GROUND_DRY).lerp(GROUND_WET, wet); m.roughness = 1 - wet * 0.45; });
        world.pathMat.color.copy(GROUND_DRY).lerp(GROUND_WET, wet * 0.8);
        world.pathMat.roughness = 0.92 - wet * 0.55;

        // 池塘漣漪 (下雨時更多)
        const pp = world.pond.geometry.attributes.position, base = world.pondBase;
        const amp = 1 + storm * 1.5;
        for (let i = 0; i < pp.count; i++) {
            const x = base[i * 3], y = base[i * 3 + 1];
            const r = Math.hypot(x, y);
            pp.setZ(i, (Math.sin(r * 2.6 - time * 2.0) * 0.02 + Math.sin(x * 1.8 + time * 1.2) * 0.012) * amp * Math.min(1, (POND_R - r) * 2));
        }
        pp.needsUpdate = true;
        world.pond.geometry.computeVertexNormals();
        if (storm > 0.4 && world.rainAmt > 0.3 && Math.random() < dt * 14 * world.rainAmt) {
            const p = randomPondPoint(0.3);
            world.addRipple(p.x, p.z, 0.35);
        }
        updatePond(world, dt, time);

        world.trees.forEach(l => {
            l.rotation.z = Math.sin(time * (0.9 + storm) + l.userData.phase) * (0.025 + storm * 0.04);
        });
        const f = world.ferris;
        f.angle += f.speed * dt;
        f.wheel.rotation.z = f.angle;
        f.gondolas.forEach(gd => { gd.cab.rotation.z = -f.angle; gd.cab.rotation.x = Math.sin(time * 1.3 + gd.baseAngle) * 0.04; });

        // 鞦韆擺動
        world.swings.seats.forEach(s => {
            s.t += dt;
            const want = s.rider ? 0.62 : 0;
            s.amp += (want - s.amp) * Math.min(1, dt * (s.rider ? 0.6 : 0.35));
            s.angle = s.amp * Math.sin(s.t * 1.95) + (s.rider ? 0 : Math.sin(time * 1.1 + s.z) * 0.02 * (1 + storm * 2));
            s.pivot.rotation.z = s.angle;
        });

        // 洗澡小屋：泡泡多寡、蓮蓬頭出水
        const BA = world.bath;
        BA.bubbles.children.forEach((b, i) => {
            const s = b.userData.base * (0.35 + BA.foam * 1.4) * (1 + Math.sin(time * 3 + i) * 0.08);
            b.scale.set(s / 1.7, s, s);
            b.position.y = Math.sin(time * 2 + i * 1.7) * 0.02;
        });
        if (BA.showerT > 0) BA.showerT -= dt;
        BA.showerDrops.visible = BA.showerT > 0;
        if (BA.showerDrops.visible) {
            BA.showerDrops.children.forEach(d => {
                const k = (time * 1.6 + d.userData.off) % 1;
                d.position.set(d.userData.x * (1 + k), -k * 2.1, d.userData.z * (1 + k));
            });
        }

        // 店員動畫
        const sh = world.shop;
        if (sh.wave > 0) sh.wave -= dt;
        PetModels.animateRig(sh.clerkRig, sh.wave > 0 ? 'happy' : 'idle', dt, 0);

        const tr = world.trough;
        const h = Math.max(0.02, troughRatio * (tr.H - 0.2));
        tr.water.scale.y = h;
        tr.water.position.y = 0.15 + h / 2;
        tr.water.material.color.setHex(troughRatio > 0.3 ? 0x3fa9e0 : 0xff8a80);

        const pos = world.ffPoints.geometry.attributes.position;
        world.fireflies.forEach((p, i) => {
            p.p += dt;
            pos.setXYZ(i, p.x + Math.sin(p.p * 0.7) * 1.5, p.y + Math.sin(p.p * 1.3) * 0.5, p.z + Math.cos(p.p * 0.6) * 1.5);
        });
        pos.needsUpdate = true;
        world.ffPoints.material.opacity = nightAmt * (1 - storm * 0.8) * (0.7 + Math.sin(time * 3) * 0.3);
    }

    window.PetWorld = { buildWorld, updateWorld, makeTextSprite, roundRect, makeEnvironment, makeBlobShadow, BOUNDS, LAYOUT };
})();
