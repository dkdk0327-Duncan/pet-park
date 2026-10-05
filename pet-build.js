// =============================================================
//  寵物樂園 3D － 佈置模式
//  買裝飾、自由擺在樂園裡 (花圃、樹、噴水池、燈籠、彈跳床…)
// =============================================================
(function () {
    'use strict';
    const { part, pivot, mat, G } = PetModels;

    // 裝飾目錄：r = 佔地半徑 (會變成障礙物)；fn = 有沒有特別功能
    const CATALOG = [
        { id: 'sunflower', icon: '🌻', name: '向日葵', price: 8, r: 0.6 },
        { id: 'lantern', icon: '🏮', name: '燈籠', price: 10, r: 0.35 },
        { id: 'flowerbed', icon: '🌷', name: '花圃', price: 12, r: 1.2 },
        { id: 'tree', icon: '🌳', name: '小樹', price: 15, r: 0.7 },
        { id: 'balloons', icon: '🎈', name: '氣球拱門', price: 20, r: 0 },
        { id: 'sakura', icon: '🌸', name: '櫻花樹', price: 25, r: 0.8 },
        { id: 'mushroom', icon: '🍄', name: '蘑菇屋', price: 30, r: 1.3 },
        { id: 'trampoline', icon: '🤸', name: '彈跳床', price: 35, r: 1.45, fn: '動物和主人都能上去跳！' },
        { id: 'fountain', icon: '⛲', name: '噴水池', price: 40, r: 1.7, fn: '夜晚會發光的漂亮噴泉' },
    ];
    const BY_ID = {};
    CATALOG.forEach(c => BY_ID[c.id] = c);
    const MAX_DECOS = 40;

    // ---------- 模型 ----------
    function buildDeco(id) {
        const g = new THREE.Group();
        const anim = {};
        if (id === 'sunflower') {
            [[0, 0, 1.6], [0.35, 0.25, 1.3], [-0.3, 0.2, 1.1]].forEach(([x, z, h]) => {
                part('cyl', 0x4f9a3a, [0.04, h, 0.04], [x, h / 2, z], g);
                part('sphere', 0x4f9a3a, [0.18, 0.04, 0.1], [x + 0.12, h * 0.5, z], g, { rot: [0, 0, 0.5] });
                const head = pivot(g, [x, h, z]);
                head.rotation.x = 0.5;
                part('cyl', 0xffc93c, [0.3, 0.05, 0.3], [0, 0, 0], head, { rot: [Math.PI / 2, 0, 0], kind: 'fur' });
                part('cyl', 0x6d4c41, [0.15, 0.07, 0.15], [0, 0, 0.02], head, { rot: [Math.PI / 2, 0, 0], kind: 'fur' });
            });
        } else if (id === 'lantern') {
            part('cyl', 0x5d4037, [0.06, 2.2, 0.06], [0, 1.1, 0], g, { kind: 'wood' });
            part('box', 0x5d4037, [0.6, 0.06, 0.06], [0.25, 2.2, 0], g, { kind: 'wood' });
            const lampMat = new THREE.MeshStandardMaterial({ color: 0xe53935, emissive: 0xff5a36, emissiveIntensity: 0.2, roughness: 0.6 });
            const lamp = new THREE.Mesh(G.sphere, lampMat);
            lamp.scale.set(0.24, 0.3, 0.24); lamp.position.set(0.5, 1.85, 0); lamp.castShadow = true;
            g.add(lamp);
            part('cyl', 0xffc93c, [0.12, 0.05, 0.12], [0.5, 2.15, 0], g, { kind: 'metal' });
            part('cyl', 0xffc93c, [0.08, 0.05, 0.08], [0.5, 1.55, 0], g, { kind: 'metal' });
            anim.lamp = lampMat;
        } else if (id === 'flowerbed') {
            const bed = part('cyl', 0x8d6e63, [1.15, 0.3, 1.15], [0, 0.15, 0], g, { kind: 'wood' });
            bed.receiveShadow = true;
            part('cyl', 0x5d4037, [1.05, 0.05, 1.05], [0, 0.31, 0], g, { shadow: false });
            const cols = [0xff6b9a, 0xffd166, 0xffffff, 0xb388ff, 0xff8a65];
            for (let i = 0; i < 16; i++) {
                const a = i * 2.4, rr = 0.25 + (i % 4) * 0.22;
                const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
                part('cyl', 0x4f9a3a, [0.025, 0.35, 0.025], [x, 0.48, z], g, { shadow: false });
                part('sphere', cols[i % cols.length], [0.11, 0.09, 0.11], [x, 0.68, z], g, { kind: 'fur' });
            }
        } else if (id === 'tree') {
            part('cyl', 0x8b5a2b, [0.22, 1.4, 0.22], [0, 0.7, 0], g, { kind: 'wood' });
            part('sphere', 0x58b85a, [1.0, 0.9, 1.0], [0, 2.0, 0], g);
            part('sphere', 0x6cc96a, [0.7, 0.6, 0.7], [0.4, 2.5, 0.15], g);
            part('sphere', 0x4caf50, [0.6, 0.55, 0.6], [-0.4, 2.45, -0.2], g);
        } else if (id === 'balloons') {
            const cols = [0xff4d6d, 0xffd23f, 0x3ba7ff, 0x7ed957, 0xb388ff, 0xff9f43];
            for (let i = 0; i <= 14; i++) {
                const a = Math.PI * i / 14;
                const b = part('sphere', cols[i % cols.length], [0.32, 0.36, 0.32], [Math.cos(a) * 1.6, Math.sin(a) * 2.2 + 0.25, 0], g, { kind: 'plastic' });
                b.userData.phase = i;
            }
            anim.sway = true;
        } else if (id === 'sakura') {
            part('cyl', 0x6d4c41, [0.2, 1.6, 0.2], [0, 0.8, 0], g, { kind: 'wood' });
            part('cyl', 0x6d4c41, [0.1, 0.8, 0.1], [0.35, 1.7, 0], g, { rot: [0, 0, -0.6], kind: 'wood' });
            [[0, 2.3, 0, 1.0], [0.6, 2.6, 0.2, 0.7], [-0.5, 2.5, -0.2, 0.7], [0.1, 2.9, -0.3, 0.6]].forEach(([x, y, z, s]) =>
                part('sphere', 0xffb7d0, [s, s * 0.85, s], [x, y, z], g, { kind: 'fur' }));
            anim.petals = true;
        } else if (id === 'mushroom') {
            part('cyl', 0xfff3dc, [0.7, 1.3, 0.7], [0, 0.65, 0], g, { kind: 'plastic' });
            const cap = part('sphere', 0xe53935, [1.3, 0.85, 1.3], [0, 1.45, 0], g, { kind: 'plastic' });
            cap.scale.y = 0.75;
            [[0.6, 1.9, 0.6], [-0.7, 1.75, 0.4], [0.1, 2.05, -0.6], [-0.3, 1.7, -0.8], [0.9, 1.55, -0.3]].forEach(([x, y, z]) =>
                part('sphere', 0xffffff, [0.2, 0.12, 0.2], [x, y, z], g, { kind: 'plastic', shadow: false }));
            part('box', 0x8b5a2b, [0.4, 0.6, 0.05], [0, 0.32, 0.7], g, { kind: 'wood' });
            part('cyl', 0x9fd8ff, [0.15, 0.05, 0.15], [0.35, 0.85, 0.62], g, { rot: [Math.PI / 2, 0, 0], kind: 'basic' });
            anim.window = true;
        } else if (id === 'trampoline') {
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * Math.PI * 2;
                part('cyl', 0x37474f, [0.05, 0.5, 0.05], [Math.cos(a) * 1.25, 0.25, Math.sin(a) * 1.25], g, { kind: 'metal' });
            }
            part('torus', 0x3ba7ff, [1.35, 1.35, 0.5], [0, 0.52, 0], g, { rot: [Math.PI / 2, 0, 0], kind: 'plastic' });
            const mat2 = new THREE.Mesh(new THREE.CircleGeometry(1.15, 28), mat(0x2b2b38));
            mat2.rotation.x = -Math.PI / 2; mat2.position.y = 0.48; mat2.receiveShadow = true;
            g.add(mat2);
            anim.mat = mat2;
        } else if (id === 'fountain') {
            const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.55, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfc8bd, roughness: 0.9, side: THREE.DoubleSide }));
            basin.position.y = 0.27; basin.castShadow = true;
            g.add(basin);
            part('torus', 0xe0dad0, [1.62, 1.62, 0.6], [0, 0.55, 0], g, { rot: [Math.PI / 2, 0, 0] });
            const water = new THREE.Mesh(new THREE.CircleGeometry(1.55, 32), new THREE.MeshStandardMaterial({ color: 0x6ac0e8, roughness: 0.05, transparent: true, opacity: 0.75, emissive: 0x2a7fbf, emissiveIntensity: 0 }));
            water.rotation.x = -Math.PI / 2; water.position.y = 0.45;
            g.add(water);
            part('cyl', 0xcfc8bd, [0.22, 1.2, 0.22], [0, 0.85, 0], g);
            part('cyl', 0xe0dad0, [0.6, 0.12, 0.6], [0, 1.45, 0], g);
            const jets = new THREE.Group();
            jets.position.y = 1.5;
            g.add(jets);
            const dropMat = new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.85 });
            for (let i = 0; i < 24; i++) {
                const d = new THREE.Mesh(G.sphere, dropMat);
                d.scale.setScalar(0.05);
                d.userData = { a: i / 24 * Math.PI * 2, off: (i * 0.37) % 1 };
                jets.add(d);
            }
            anim.jets = jets;
            anim.water = water.material;
        }
        g.traverse(o => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
        g.userData.anim = anim;
        return g;
    }

    function create(api) {
        const { scene, world } = api;
        const B = {
            CATALOG, decos: [], active: false,
            selected: null, removing: false, rot: 0,
            ghost: null, ghostRing: null, ghostOk: false, ghostPos: null,
        };

        // ---------- 放置 / 拆除 ----------
        function addDeco(id, x, z, rot, silent) {
            const c = BY_ID[id];
            if (!c) return null;
            const model = buildDeco(id);
            model.position.set(x, 0, z);
            model.rotation.y = rot || 0;
            scene.add(model);
            const d = { id, x, z, rot: rot || 0, model, obstacle: null, proxy: null, rider: null, reserved: null };
            if (c.r > 0) {
                d.obstacle = { type: 'circle', x, z, r: c.r };
                world.obstacles.push(d.obstacle);
            }
            const pr = Math.max(0.7, c.r);
            d.proxy = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 2.5, 10), new THREE.MeshBasicMaterial());
            d.proxy.visible = false;
            d.proxy.position.set(x, 1.25, z);
            d.proxy.userData.pick = { kind: 'deco', deco: d };
            scene.add(d.proxy);
            world.pickables.push(d.proxy);
            B.decos.push(d);
            world.invalidateNav();
            if (!silent) {
                api.sfx('sit');
                api.fx('✨', x, 2.2, z);
            }
            return d;
        }
        function removeDeco(d) {
            scene.remove(d.model);
            scene.remove(d.proxy);
            const pi = world.pickables.indexOf(d.proxy);
            if (pi >= 0) world.pickables.splice(pi, 1);
            if (d.obstacle) {
                const oi = world.obstacles.indexOf(d.obstacle);
                if (oi >= 0) world.obstacles.splice(oi, 1);
            }
            B.decos = B.decos.filter(x => x !== d);
            world.invalidateNav();
            if (d.rider && d.rider.onTrampRemoved) d.rider.onTrampRemoved();
        }

        // ---------- 預覽 (半透明的影子) ----------
        const okMat = new THREE.MeshBasicMaterial({ color: 0x3fdc8a, transparent: true, opacity: 0.45, depthWrite: false });
        const badMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.45, depthWrite: false });
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
        function makeGhost(id) {
            clearGhost();
            const g = buildDeco(id);
            g.traverse(o => { if (o.isMesh) { o.material = okMat; o.castShadow = false; } });
            g.visible = false;
            scene.add(g);
            B.ghost = g;
            const r = Math.max(0.6, BY_ID[id].r);
            B.ghostRing = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.12, 36), ringMat);
            B.ghostRing.rotation.x = -Math.PI / 2;
            B.ghostRing.visible = false;
            scene.add(B.ghostRing);
        }
        function clearGhost() {
            if (B.ghost) scene.remove(B.ghost);
            if (B.ghostRing) scene.remove(B.ghostRing);
            B.ghost = B.ghostRing = null;
        }
        function setGhostOk(ok) {
            if (B.ghostOk === ok) return;
            B.ghostOk = ok;
            B.ghost.traverse(o => { if (o.isMesh) o.material = ok ? okMat : badMat; });
            ringMat.color.setHex(ok ? 0xffffff : 0xff4d6d);
        }

        // 滑鼠移動 (地面座標)
        B.onMove = function (x, z) {
            if (!B.active || !B.ghost) return;
            const c = BY_ID[B.selected];
            B.ghostPos = { x, z };
            B.ghost.visible = B.ghostRing.visible = true;
            B.ghost.position.set(x, 0, z);
            B.ghost.rotation.y = B.rot;
            B.ghostRing.position.set(x, 0.05, z);
            setGhostOk(world.canPlace(x, z, Math.max(0.5, c.r)) && B.decos.length < MAX_DECOS);
        };
        // 點擊：放下 / 拆除。回傳 true 表示已處理
        B.onClick = function (x, z, hitDeco) {
            if (!B.active) return false;
            if (B.removing) {
                if (hitDeco) {
                    const c = BY_ID[hitDeco.id];
                    const back = Math.floor(c.price / 2);
                    removeDeco(hitDeco);
                    api.addCoins(back, { x: hitDeco.x, y: 0, z: hitDeco.z }, `拆掉${c.name}，退回一半金幣`);
                    api.sfx('plop');
                    api.save();
                    renderBar();
                } else api.toast('🗑️ 點一個你放的裝飾來拆掉');
                return true;
            }
            if (!B.selected) { api.toast('👇 先在下方選一個想放的裝飾'); return true; }
            const c = BY_ID[B.selected];
            B.onMove(x, z);
            if (B.decos.length >= MAX_DECOS) { api.toast(`樂園最多放 ${MAX_DECOS} 個裝飾`); return true; }
            if (!B.ghostOk) { api.toast('❌ 這裡不能放：太靠近設施、步道或其他東西了'); api.sfx('error'); return true; }
            if (api.getCoins() < c.price) { api.toast('🪙 金幣不夠喔！'); api.sfx('error'); return true; }
            api.spendCoins(c.price);
            addDeco(c.id, x, z, B.rot);
            api.track('build');
            api.save();
            renderBar();
            return true;
        };

        // ---------- 佈置列 (畫面下方) ----------
        const bar = document.createElement('div');
        bar.id = 'build-bar';
        bar.className = 'hidden';
        document.getElementById('hud').appendChild(bar);
        function renderBar() {
            const coins = api.getCoins();
            bar.innerHTML = `<div class="bb-head"><b>🏗️ 佈置樂園</b><span>🪙 ${coins}｜已放 ${B.decos.length}/${MAX_DECOS}</span>
                <button class="bb-tool ${B.removing ? 'on' : ''}" data-tool="remove">🗑️ 拆除</button>
                <button class="bb-tool" data-tool="rotate">🔄 轉向</button>
                <button class="bb-tool done" data-tool="done">✔ 完成</button></div>
                <div class="bb-items"></div>
                <div class="bb-tip">${B.removing ? '點一個裝飾把它拆掉（退回一半金幣）' : B.selected ? `移動滑鼠找位置，<b>綠色</b>可以放、<b>紅色</b>不行，點一下放下｜${BY_ID[B.selected].fn || ''}` : '選一個裝飾，再點地面放下去'}</div>`;
            const items = bar.querySelector('.bb-items');
            CATALOG.forEach(c => {
                const b = document.createElement('button');
                b.className = 'bb-item' + (B.selected === c.id && !B.removing ? ' on' : '') + (coins < c.price ? ' poor' : '');
                b.innerHTML = `<span class="bi-icon">${c.icon}</span><span class="bi-name">${c.name}</span><span class="bi-price">🪙${c.price}</span>`;
                b.title = c.fn || c.name;
                b.addEventListener('click', () => {
                    B.removing = false;
                    B.selected = c.id;
                    makeGhost(c.id);
                    if (B.ghostPos) B.onMove(B.ghostPos.x, B.ghostPos.z);
                    api.sfx('click');
                    renderBar();
                });
                items.appendChild(b);
            });
            bar.querySelectorAll('.bb-tool').forEach(t => t.addEventListener('click', () => {
                const tool = t.dataset.tool;
                api.sfx('click');
                if (tool === 'done') B.stop();
                else if (tool === 'rotate') { B.rot += Math.PI / 4; if (B.ghostPos) B.onMove(B.ghostPos.x, B.ghostPos.z); }
                else if (tool === 'remove') { B.removing = !B.removing; if (B.removing) { B.selected = null; clearGhost(); } renderBar(); }
            }));
        }
        B.start = function () {
            B.active = true;
            B.removing = false;
            renderBar();
            bar.classList.remove('hidden');
            document.getElementById('food-bar').classList.add('hidden');
            document.body.classList.add('building');
            api.toast('🏗️ 佈置模式：選一個裝飾，點地面放下（動物們會繼續玩喔）');
        };
        B.stop = function () {
            B.active = false;
            B.selected = null;
            B.removing = false;
            clearGhost();
            bar.classList.add('hidden');
            document.getElementById('food-bar').classList.remove('hidden');
            document.body.classList.remove('building');
        };
        B.refresh = () => { if (B.active) renderBar(); };

        // ---------- 彈跳床 ----------
        B.freeTrampoline = function (ent, near) {
            const list = B.decos.filter(d => d.id === 'trampoline' && !d.rider && !d.reserved);
            if (!list.length) return null;
            if (near) list.sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z));
            return list[0];
        };

        // ---------- 動畫 ----------
        B.update = function (dt, time, night) {
            B.decos.forEach(d => {
                const a = d.model.userData.anim;
                if (a.lamp) a.lamp.emissiveIntensity = 0.2 + night * 2.2;
                if (a.water) a.water.emissiveIntensity = night * 0.8;
                if (a.jets) {
                    a.jets.children.forEach(j => {
                        const k = (time * 0.7 + j.userData.off) % 1;
                        const rr = 0.15 + k * 1.1;
                        j.position.set(Math.cos(j.userData.a) * rr, Math.sin(k * Math.PI) * 0.9 - k * 0.9, Math.sin(j.userData.a) * rr);
                    });
                }
                if (a.sway) d.model.children.forEach((b, i) => { b.position.x += Math.sin(time * 1.5 + i) * 0.0015; });
                if (a.mat) {
                    // 有人在跳 → 床面上下彈
                    const r = d.rider;
                    a.mat.position.y = 0.48 - (r && r.trampSquash ? r.trampSquash * 0.25 : 0);
                }
                if (a.petals && Math.random() < dt * 0.6) api.fx('🌸', d.x + (Math.random() - 0.5) * 2, 2.6, d.z + (Math.random() - 0.5) * 2, { vy: -0.6, vx: 0.3, life: 3, size: 0.5 });
            });
            if (B.active && B.ghost) B.ghost.position.y = Math.sin(time * 4) * 0.05 + 0.05;
        };

        // ---------- 存檔 ----------
        B.serialize = () => B.decos.map(d => ({ id: d.id, x: +d.x.toFixed(2), z: +d.z.toFixed(2), rot: +d.rot.toFixed(3) }));
        B.load = function (list) {
            B.decos.slice().forEach(removeDeco);
            (list || []).forEach(o => { if (BY_ID[o.id]) addDeco(o.id, o.x, o.z, o.rot, true); });
        };
        B.clear = () => B.decos.slice().forEach(removeDeco);
        return B;
    }

    window.PetBuild = { create, CATALOG };
})();
