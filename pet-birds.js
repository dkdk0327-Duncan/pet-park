// =============================================================
//  寵物樂園 3D － 天空的鳥
//  ・偶爾飛過的鳥群：大雁 (V 字隊形)、海鷗、燕子
//  ・住在樂園的小麻雀：停在屋頂、路燈、樹上，常常飛來飛去、
//    跳到地上啄東西；有人丟食物時會下來吃，吃完再飛回去
// =============================================================
(function () {
    'use strict';
    const { part, pivot } = PetModels;
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // ---------- 鳥的模型 (身體朝 +z) ----------
    const LOOKS = {
        sparrow: { body: 0xa0703f, belly: 0xf0dcc0, head: 0x7a4a24, wing: 0x8b5a2b, tip: 0x4e342e, beak: 0x3a3a3a, cheek: 0xffffff, scale: 0.36 },
        gull:    { body: 0xffffff, belly: 0xffffff, head: 0xffffff, wing: 0xcfd8dc, tip: 0x37474f, beak: 0xffc107, scale: 0.75 },
        goose:   { body: 0x8d7b68, belly: 0xe8e0d0, head: 0x2b2b2b, wing: 0x75644f, tip: 0x4a3f33, beak: 0x222222, cheek: 0xffffff, scale: 0.85, neck: true },
        swallow: { body: 0x1f3a6b, belly: 0xfff3e0, head: 0x1f3a6b, wing: 0x1a2f55, tip: 0x0d1b33, beak: 0x222222, cheek: 0xd84315, scale: 0.45, fork: true },
    };
    function buildBird(kind) {
        const C = LOOKS[kind];
        const root = new THREE.Group();
        const body = pivot(root, [0, 0, 0]);
        part('sphere', C.body, [0.42, 0.38, 0.62], [0, 0.5, 0], body, { kind: 'fur' });
        part('sphere', C.belly, [0.34, 0.3, 0.45], [0, 0.42, 0.12], body, { kind: 'fur', shadow: false });
        const hy = C.neck ? 1.05 : 0.82, hz = C.neck ? 0.68 : 0.46;
        if (C.neck) part('cyl', C.head, [0.12, 0.5, 0.12], [0, 0.82, 0.55], body, { rot: [0.5, 0, 0], kind: 'fur' });
        const head = pivot(body, [0, hy, hz]);
        part('sphere', C.head, [0.27, 0.26, 0.29], [0, 0, 0], head, { kind: 'fur' });
        if (C.cheek) [-1, 1].forEach(sd => part('sphere', C.cheek, [0.06, 0.09, 0.1], [sd * 0.22, -0.05, 0.04], head, { kind: 'fur', shadow: false }));
        [-1, 1].forEach(sd => part('sphere', 0x111111, [0.045, 0.045, 0.045], [sd * 0.2, 0.06, 0.13], head, { kind: 'eye', shadow: false }));
        part('cone', C.beak, [0.08, 0.22, 0.08], [0, -0.03, 0.33], head, { rot: [Math.PI / 2, 0, 0], kind: 'plastic', shadow: false });
        const wings = [-1, 1].map(sd => {
            const w = pivot(body, [sd * 0.3, 0.62, 0.05]);
            part('box', C.wing, [0.75, 0.07, 0.42], [sd * 0.38, 0, 0], w, { kind: 'fur' });
            part('box', C.tip, [0.3, 0.071, 0.36], [sd * 0.82, 0, -0.03], w, { kind: 'fur' });
            w.userData.side = sd;
            return w;
        });
        if (C.fork) [-1, 1].forEach(sd => part('box', C.tip, [0.08, 0.04, 0.6], [sd * 0.1, 0.5, -0.75], body, { rot: [0, sd * 0.25, 0], kind: 'fur' }));
        else part('box', C.tip, [0.28, 0.05, 0.42], [0, 0.55, -0.62], body, { rot: [0.25, 0, 0], kind: 'fur' });
        const legs = pivot(body, [0, 0, 0]);
        [-1, 1].forEach(sd => part('cyl', 0xd08a4a, [0.025, 0.3, 0.025], [sd * 0.1, 0.15, 0.02], legs, { kind: 'plastic', shadow: false }));
        root.scale.setScalar(C.scale);
        return { root, body, head, wings, legs, kind };
    }
    // fold：0 = 張開飛，1 = 收起來 ； flap：拍翅膀的角度
    function poseWings(b, fold, flap) {
        b.wings.forEach(w => {
            const sd = w.userData.side;
            w.rotation.set(0, sd * 1.5 * fold, sd * flap * (1 - fold) - sd * 0.08 * fold);
            w.scale.set(1 - 0.32 * fold, 1 + fold, 1);       // 收起來時貼著身體
        });
        b.legs.visible = fold > 0.5;
    }

    function create(scene, world, opts) {
        const birds = [];       // 麻雀
        const flocks = [];      // 飛過去的鳥群
        let flockTimer = rand(8, 20);
        let chirpCd = 0;

        // ---------- 停的地方 (屋頂、路燈、樹上) ----------
        scene.updateMatrixWorld(true);
        const perches = [];
        const addPerch = (x, y, z, kind) => perches.push({ x, y, z, kind, occ: null });
        (opts.house && opts.house.perches || []).forEach(p => addPerch(p.x, p.y, p.z, 'house'));
        if (world.shop) {
            const s = world.shop.group.position;
            [-2.2, -1.2, -0.2, 0.8].forEach(x => addPerch(s.x + x, 2.83, s.z - 0.7, 'shop'));
        }
        (world.lampSpots || []).forEach(l => addPerch(l.x, l.y, l.z, 'lamp'));
        // 樹：從上面往下打射線找到樹冠表面
        const ray = new THREE.Raycaster();
        const down = new THREE.Vector3(0, -1, 0);
        (world.trees || []).forEach(leaf => {
            const box = new THREE.Box3().setFromObject(leaf);
            const c = box.getCenter(new THREE.Vector3());
            if (Math.abs(c.x) > 40 || Math.abs(c.z) > 26) return;     // 圍欄外的森林太遠，不停
            let n = 0;
            for (let k = 0; k < 6 && n < 2; k++) {
                const a = rand(0, Math.PI * 2), r = rand(0, 0.7);
                ray.set(new THREE.Vector3(c.x + Math.cos(a) * r, box.max.y + 2, c.z + Math.sin(a) * r), down);
                const hit = ray.intersectObject(leaf, true)[0];
                if (hit && hit.face && hit.face.normal.y > 0.3) { addPerch(hit.point.x, hit.point.y + 0.02, hit.point.z, 'tree'); n++; }
            }
        });
        function freePerch(near, maxD) {
            const list = perches.filter(p => !p.occ && (!near || Math.hypot(p.x - near.x, p.z - near.z) < (maxD || 18)));
            return list.length ? pick(list) : (perches.filter(p => !p.occ)[0] || null);
        }
        function sayChirp(pos, name) {
            if (chirpCd > 0) return;
            chirpCd = rand(1.5, 3.5);
            opts.sfx && opts.sfx(name || 'chirp', pos);
        }

        // ---------- 小麻雀 ----------
        const SPARROWS = 8;
        for (let i = 0; i < SPARROWS; i++) {
            const m = buildBird('sparrow');
            scene.add(m.root);
            const b = { m, pos: new THREE.Vector3(), yaw: rand(0, 6.28), state: 'perch', t: rand(2, 12), flapT: rand(0, 6), fold: 1, perch: null, hopT: 0, peck: 0 };
            const p = freePerch();
            if (p) { p.occ = b; b.perch = p; b.pos.set(p.x, p.y, p.z); }
            birds.push(b);
        }
        function release(b) { if (b.perch) { b.perch.occ = null; b.perch = null; } }
        function flyTo(b, x, y, z, then, extra) {
            release(b);
            const d = Math.hypot(x - b.pos.x, z - b.pos.z) + Math.abs(y - b.pos.y);
            b.state = 'fly';
            b.fl = { from: b.pos.clone(), to: new THREE.Vector3(x, y, z), k: 0, dur: Math.max(0.9, d / 7.5), h: Math.min(4, d * 0.22) + 0.8, then, extra };
        }
        function goPerch(b, near) {
            const p = freePerch(near || b.pos, 18);
            if (!p) { b.state = 'ground'; b.t = rand(4, 8); return; }
            p.occ = b;                         // 先佔位，飛到了再停
            flyTo(b, p.x, p.y, p.z, 'perch', p);
        }
        function goGround(b) {
            for (let k = 0; k < 14; k++) {
                const x = b.pos.x + rand(-18, 18), z = b.pos.z + rand(-18, 18);
                if (Math.abs(x) > 35 || Math.abs(z) > 22) continue;
                const q = { x, z };
                world.resolveObstacles(q, 0.6);
                if (Math.hypot(q.x - x, q.z - z) > 0.01) continue;
                if (Math.hypot(x - b.pos.x, z - b.pos.z) > 20) continue;
                if (opts.getActors().some(a => a && Math.hypot(a.pos.x - x, a.pos.z - z) < 3.5)) continue;   // 找沒有人的地方
                flyTo(b, x, opts.groundY(x, z), z, 'ground');
                return;
            }
        }
        function goSoar(b) {
            release(b);
            b.state = 'soar';
            b.so = { cx: b.pos.x + rand(-4, 4), cz: b.pos.z + rand(-4, 4), y: rand(8, 11), a: rand(0, 6.28), r: rand(3, 6), t: rand(4, 8), dir: Math.random() < 0.5 ? 1 : -1 };
            b.fl = null;
        }
        // 有沒有人或動物靠太近
        function scared(b) {
            const acts = opts.getActors();
            for (const a of acts) if (a && Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 1.35 && Math.abs((a.pos.y || 0) - b.pos.y) < 2) return true;
            return false;
        }
        // 找地上的食物
        const foodBirds = new Map();
        let foodScan = 0;
        function scanFood(night) {
            if (night) return;
            const foods = opts.getFoods().filter(f => f.landed && !f.taken);
            foods.forEach(f => {
                const n = foodBirds.get(f) || 0;
                if (n >= 3) return;
                const idle = birds.filter(b => (b.state === 'perch' || b.state === 'ground') && Math.hypot(b.pos.x - f.x, b.pos.z - f.z) < 32);
                if (!idle.length || Math.random() < 0.35) return;
                const b = pick(idle);
                const a = rand(0, 6.28), r = rand(0.45, 0.85);
                const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
                foodBirds.set(f, n + 1);
                b.food = f;
                flyTo(b, x, opts.groundY(x, z), z, 'eat');
                sayChirp(b.pos);
            });
            for (const f of foodBirds.keys()) if (f.taken || opts.getFoods().indexOf(f) < 0) foodBirds.delete(f);
        }
        function leaveFood(b, night) {
            if (b.food) { const n = foodBirds.get(b.food) || 1; foodBirds.set(b.food, n - 1); b.food = null; }
            if (!night && Math.random() < 0.4) goSoar(b); else goPerch(b);
        }

        function updateSparrow(b, dt, time, env) {
            const m = b.m;
            b.flapT += dt;
            let flap = 0, tilt = 0, foldTo = 1, headY = 0;
            if (b.state === 'fly') {
                const f = b.fl;
                f.k = Math.min(1, f.k + dt / f.dur);
                const k = f.k, e = k * k * (3 - 2 * k);
                b.pos.lerpVectors(f.from, f.to, e);
                b.pos.y += Math.sin(Math.PI * k) * f.h;
                const dx = f.to.x - f.from.x, dz = f.to.z - f.from.z;
                if (Math.hypot(dx, dz) > 0.05) b.yaw = Math.atan2(dx, dz);
                foldTo = k > 0.92 ? 0.6 : 0;
                flap = Math.sin(b.flapT * 34) * 1.0;
                tilt = (0.5 - k) * 0.5;
                if (k >= 1) {
                    if (f.then === 'perch') { b.perch = f.extra; b.state = 'perch'; b.t = env.night ? 999 : rand(5, 18); if (Math.random() < 0.4) sayChirp(b.pos); }
                    else if (f.then === 'ground') { b.state = 'ground'; b.t = rand(6, 14); }
                    else if (f.then === 'eat') { b.state = 'eat'; b.t = rand(3, 6.5); }
                    b.fl = null;
                }
            } else if (b.state === 'soar') {
                const s = b.so;
                s.t -= dt;
                s.a += dt * 1.1 * s.dir;
                const tx = s.cx + Math.cos(s.a) * s.r, tz = s.cz + Math.sin(s.a) * s.r;
                const prev = b.pos.clone();
                b.pos.x += (tx - b.pos.x) * Math.min(1, dt * 2);
                b.pos.z += (tz - b.pos.z) * Math.min(1, dt * 2);
                b.pos.y += (s.y - b.pos.y) * Math.min(1, dt * 1.5);
                b.yaw = Math.atan2(b.pos.x - prev.x, b.pos.z - prev.z) || b.yaw;
                foldTo = 0;
                flap = (Math.sin(b.flapT * 0.9) > 0.2) ? Math.sin(b.flapT * 30) : 0.25;   // 拍一拍、滑一滑
                tilt = -0.25 * s.dir;
                if (s.t <= 0) goPerch(b);
            } else if (b.state === 'perch') {
                b.t -= dt;
                if (env.night) {
                    tilt = 0.25; headY = -0.12;                // 縮著頭睡覺
                } else {
                    // 東張西望
                    if (Math.random() < dt * 0.5) b.yaw += rand(-1.2, 1.2);
                    headY = Math.sin(time * 2 + b.flapT) * 0.03;
                    if (Math.random() < dt * 0.06) sayChirp(b.pos);
                    if (b.t <= 0) {
                        const r = Math.random();
                        if (env.rain > 0.3) { b.t = rand(6, 14); if (r < 0.3) goPerch(b); }
                        else if (r < 0.35) goPerch(b);
                        else if (r < 0.88) goGround(b);
                        else goSoar(b);
                        if (b.state === 'perch') b.t = rand(4, 10);
                    }
                }
            } else if (b.state === 'ground' || b.state === 'eat') {
                b.t -= dt;
                b.hopT -= dt;
                const gy = opts.groundY(b.pos.x, b.pos.z);
                if (b.state === 'eat') {
                    // 面向食物一直啄
                    const f = b.food;
                    if (!f || f.taken || opts.getFoods().indexOf(f) < 0) { leaveFood(b); return finish(); }
                    b.yaw = Math.atan2(f.x - b.pos.x, f.z - b.pos.z);
                    b.peck += dt * 9;
                    tilt = Math.max(0, Math.sin(b.peck)) * 0.7;
                    b.pos.y = gy;
                    if (Math.random() < dt * 0.25) sayChirp(b.pos);
                    if (b.t <= 0 || scared(b)) { if (b.t > 0) sayChirp(b.pos); leaveFood(b); }
                } else {
                    // 跳一跳、啄一啄
                    if (b.hopT <= 0) {
                        b.hopT = rand(0.5, 1.4);
                        b.hop = { k: 0, dx: rand(-0.5, 0.5), dz: rand(-0.5, 0.5) };
                        b.yaw = Math.atan2(b.hop.dx, b.hop.dz);
                    }
                    if (b.hop && b.hop.k < 1) {
                        b.hop.k = Math.min(1, b.hop.k + dt * 4);
                        b.pos.x += b.hop.dx * dt * 4; b.pos.z += b.hop.dz * dt * 4;
                        b.pos.y = gy + Math.sin(Math.PI * b.hop.k) * 0.18;
                    } else {
                        b.pos.y = gy;
                        b.peck += dt * 7;
                        tilt = Math.max(0, Math.sin(b.peck)) * 0.6;
                    }
                    if (env.rain > 0.3 || env.night) b.t = Math.min(b.t, 0);
                    if (b.t <= 0) goPerch(b);
                    else if (scared(b)) { sayChirp(b.pos); Math.random() < 0.5 ? goSoar(b) : goPerch(b); }
                }
            }
            return finish();
            function finish() {
                b.fold += (foldTo - b.fold) * Math.min(1, dt * 10);
                poseWings(m, b.fold, flap);
                m.root.position.copy(b.pos);
                m.root.rotation.y = b.yaw;
                m.body.rotation.x = tilt;
                m.head.position.y = 0.82 + headY;
                // 進到屋裡看時，屋頂收起來 → 屋頂上的麻雀也先藏起來
                m.root.visible = !(b.perch && b.perch.kind === 'house' && opts.house && opts.house.viewMode === 'inside');
            }
        }

        // ---------- 偶爾飛過的鳥群 ----------
        function spawnFlock(env, forced) {
            const type = forced || (env.night ? null : pick(['goose', 'goose', 'gull', 'gull', 'swallow']));
            if (!type) return;
            const ang = rand(0, Math.PI * 2);
            const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
            const side = new THREE.Vector3(dir.z, 0, -dir.x);
            const off = rand(-18, 18);
            const start = dir.clone().multiplyScalar(-75).addScaledVector(side, off);
            const n = type === 'goose' ? 5 + Math.floor(rand(0, 4)) : type === 'gull' ? 2 + Math.floor(rand(0, 2)) : 3 + Math.floor(rand(0, 2));
            const speed = type === 'goose' ? 7 : type === 'gull' ? 6 : 12;
            const y = type === 'swallow' ? rand(9, 10.5) : rand(12, 14);   // 比摩天輪高一點，從鏡頭看得到
            const members = [];
            for (let i = 0; i < n; i++) {
                const m = buildBird(type);
                scene.add(m.root);
                let ox, oz;
                if (type === 'goose') {          // V 字隊形
                    const row = Math.ceil(i / 2), sd = i % 2 ? 1 : -1;
                    ox = i === 0 ? 0 : sd * row * 1.6; oz = -row * 1.5;
                } else { ox = rand(-4, 4); oz = rand(-5, 2); }
                members.push({ m, ox, oz, oy: rand(-0.6, 0.6), ph: rand(0, 6), wob: rand(0.5, 1.5) });
            }
            flocks.push({ type, dir, side, start, t: 0, speed, y, members, dist: 150, called: false });
        }
        function updateFlock(F, dt, time) {
            F.t += dt;
            const d = F.t * F.speed;
            const yaw = Math.atan2(F.dir.x, F.dir.z);
            F.members.forEach(b => {
                const p = F.start.clone().addScaledVector(F.dir, d + b.oz).addScaledVector(F.side, b.ox);
                let y = F.y + b.oy, flap, roll = 0, yw = yaw;
                if (F.type === 'swallow') {
                    // 燕子：忽左忽右、忽高忽低
                    const w = Math.sin(time * 2.2 * b.wob + b.ph);
                    p.addScaledVector(F.side, w * 3);
                    y += Math.sin(time * 3 + b.ph) * 1.2;
                    roll = -w * 0.5; yw += Math.cos(time * 2.2 * b.wob + b.ph) * 0.4;
                    flap = Math.sin(time * 26 + b.ph) * 0.9;
                } else if (F.type === 'gull') {
                    // 海鷗：大部分在滑翔
                    p.addScaledVector(F.side, Math.sin(time * 0.6 + b.ph) * 2);
                    y += Math.sin(time * 0.8 + b.ph) * 0.8;
                    flap = Math.sin(time * 0.7 + b.ph) > 0.5 ? Math.sin(time * 12 + b.ph) * 0.7 : 0.12;
                    roll = Math.sin(time * 0.6 + b.ph) * 0.2;
                } else {
                    flap = Math.sin(time * 9 + b.ph * 0.3) * 0.75;
                }
                b.m.root.position.set(p.x, y, p.z);
                b.m.root.rotation.set(0, yw, 0);
                b.m.body.rotation.z = roll;
                poseWings(b.m, 0, flap);
            });
            // 飛到樂園中間時叫一聲
            if (!F.called && d > 70) {
                F.called = true;
                const c = F.members[0].m.root.position;
                opts.sfx && opts.sfx(F.type === 'goose' ? 'honk' : F.type === 'gull' ? 'gull' : 'chirp', c);
            }
            if (d > F.dist + 10) {
                F.members.forEach(b => scene.remove(b.m.root));
                return false;
            }
            return true;
        }

        const api = {
            birds, flocks, perches,
            update(dt, time, env) {
                chirpCd -= dt;
                // 鳥群：白天偶爾飛過，大雨就少一點
                flockTimer -= dt;
                if (flockTimer <= 0) {
                    flockTimer = rand(25, 55) * (env.rain > 0.5 ? 2 : 1);
                    if (!env.night && flocks.length < 2) spawnFlock(env);
                }
                for (let i = flocks.length - 1; i >= 0; i--) if (!updateFlock(flocks[i], dt, time)) flocks.splice(i, 1);
                // 天黑：麻雀都回去停好睡覺
                if (env.night) birds.forEach(b => { if (b.state === 'ground' || b.state === 'eat' || b.state === 'soar') { if (b.food) leaveFood(b, true); else goPerch(b); } });
                foodScan -= dt;
                if (foodScan <= 0) { foodScan = 0.6; scanFood(env.night); }
                birds.forEach(b => updateSparrow(b, dt, time, env));
            },
            spawnFlock: type => spawnFlock({ night: false }, type),
        };
        return api;
    }

    window.PetBirds = { create, buildBird };
})();
