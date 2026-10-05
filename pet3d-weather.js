// =============================================================
//  寵物樂園 3D － 天氣 (晴天 / 下雨 / 下雪)
//  雨滴、雪花、烏雲畫在 overlay 場景 (不影響 SSAO)，地面積雪與水花在主場景
// =============================================================
(function () {
    const rand = (a, b) => a + Math.random() * (b - a);

    function create(scene, overlay, world) {
        const W = {
            state: 'clear',        // 目前的天氣
            kind: null,            // 正在下的東西 (rain / snow)，淡出時仍保留
            amt: 0,                // 強度 0~1
            timer: rand(90, 160),  // 這個天氣還會持續多久
            wet: 0, snowCover: 0,
            rainAmt: 0, snowAmt: 0,
            onEvent: null,         // (type) => {}：'rain' 'snow' 'stop' 'rainbow' 'thunder'
            _rainbowPending: false, _flash: 0, _thunderT: 0,
        };
        const B = world.bounds;

        // ---------- 烏雲 (低低的、比較黑) ----------
        overlay.add(new THREE.HemisphereLight(0xffffff, 0x5a6070, 0.95));
        const odl = new THREE.DirectionalLight(0xffffff, 0.55);
        odl.position.set(-1, 2, 0.6);
        overlay.add(odl);
        const stormMat = new THREE.MeshLambertMaterial({ color: 0x4a525e, transparent: true, opacity: 0, depthWrite: false });
        const stormClouds = [];
        for (let i = 0; i < 18; i++) {
            const g = new THREE.Group();
            const n = 4 + (i % 3);
            for (let k = 0; k < n; k++) {
                const m = new THREE.Mesh(PetModels.G.sphere, stormMat);
                m.renderOrder = -5;
                m.scale.set(rand(3.0, 5.0), rand(1.2, 2.0), rand(2.5, 3.8));
                m.position.set((k - n / 2) * 3.4, rand(-0.5, 0.6), rand(-1.2, 1.2));
                g.add(m);
            }
            g.position.set(rand(-75, 75), rand(13, 17), rand(-55, -2));
            g.userData.speed = rand(1.5, 3);
            g.visible = false;
            overlay.add(g);
            stormClouds.push(g);
        }

        // ---------- 雨滴 (線段) ----------
        const RN = 2400;
        const rainPos = new Float32Array(RN * 6);
        const drops = [];
        const rainGeo = new THREE.BufferGeometry();
        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
        const rainMat = new THREE.LineBasicMaterial({ color: 0xd0e2ff, transparent: true, opacity: 0, depthWrite: false });
        const rain = new THREE.LineSegments(rainGeo, rainMat);
        rain.frustumCulled = false;
        overlay.add(rain);

        // ---------- 雪花 (點) ----------
        const SN = 2600;
        const snowPos = new Float32Array(SN * 3);
        const flakes = [];
        const snowGeo = new THREE.BufferGeometry();
        snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
        const fcv = document.createElement('canvas'); fcv.width = fcv.height = 64;
        const fc = fcv.getContext('2d');
        const grd = fc.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
        fc.fillStyle = grd; fc.fillRect(0, 0, 64, 64);
        const snowMat = new THREE.PointsMaterial({ size: 0.75, map: new THREE.CanvasTexture(fcv), transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
        const snow = new THREE.Points(snowGeo, snowMat);
        snow.frustumCulled = false;
        overlay.add(snow);

        function spawnDrop(d, cx, cz, anyY) {
            d.x = cx + rand(-42, 42); d.z = cz + rand(-34, 30);
            d.y = anyY ? rand(0, 26) : rand(20, 28);
            d.v = rand(26, 34);
        }
        for (let i = 0; i < RN; i++) { const d = {}; spawnDrop(d, 0, 0, true); drops.push(d); }
        function spawnFlake(f, cx, cz, anyY) {
            f.x = cx + rand(-42, 42); f.z = cz + rand(-34, 30);
            f.y = anyY ? rand(0, 24) : rand(18, 26);
            f.v = rand(1.0, 2.0); f.p = Math.random() * 6; f.s = rand(0.4, 1.0);
        }
        for (let i = 0; i < SN; i++) { const f = {}; spawnFlake(f, 0, 0, true); flakes.push(f); }

        // ---------- 地面水花 ----------
        const splashGeo = new THREE.RingGeometry(0.6, 1, 16);
        const splashes = [];
        for (let i = 0; i < 40; i++) {
            const m = new THREE.Mesh(splashGeo, new THREE.MeshBasicMaterial({ color: 0xdfe9ff, transparent: true, opacity: 0, depthWrite: false }));
            m.rotation.x = -Math.PI / 2;
            m.visible = false;
            m.renderOrder = 2;
            scene.add(m);
            splashes.push({ m, life: 0 });
        }

        // ---------- 積雪 ----------
        const scv = document.createElement('canvas'); scv.width = scv.height = 256;
        const sc = scv.getContext('2d');
        sc.fillStyle = '#000'; sc.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 380; i++) {
            const x = Math.random() * 256, y = Math.random() * 256, r = 8 + Math.random() * 26;
            const g = sc.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            sc.fillStyle = g;
            for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { sc.beginPath(); sc.arc(x + ox, y + oy, r, 0, Math.PI * 2); sc.fill(); }
        }
        const snowAlpha = new THREE.CanvasTexture(scv);
        snowAlpha.wrapS = snowAlpha.wrapT = THREE.RepeatWrapping;
        snowAlpha.repeat.set(9, 6);
        const coverMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, transparent: true, opacity: 0, alphaMap: snowAlpha, depthWrite: false });
        const cover = new THREE.Mesh(new THREE.PlaneGeometry(B.maxX - B.minX + 6, B.maxZ - B.minZ + 6), coverMat);
        cover.rotation.x = -Math.PI / 2;
        cover.position.y = 0.045;
        cover.receiveShadow = true;
        cover.renderOrder = 1;
        cover.visible = false;
        scene.add(cover);

        function emit(type) { if (W.onEvent) W.onEvent(type); }

        W.set = function (type) {
            if (type === W.state) return;
            const prev = W.state;
            W.state = type;
            if (type === 'rain') { W.kind = 'rain'; W.timer = rand(70, 110); emit('rain'); }
            else if (type === 'snow') { W.kind = 'snow'; W.timer = rand(80, 120); emit('snow'); }
            else {
                W.timer = rand(150, 260);
                if (prev === 'rain') W._rainbowPending = true;
                emit('stop');
            }
        };

        W.update = function (dt, cam, nightAmt) {
            // 天氣輪替
            W.timer -= dt;
            if (W.timer <= 0) {
                if (W.state === 'clear') {
                    const r = Math.random();
                    if (r < 0.55) W.set('rain'); else if (r < 0.85) W.set('snow'); else W.timer = rand(90, 150);
                } else W.set('clear');
            }
            // 從雨直接切到雪 (或反過來) 時，先淡出再換
            const want = W.state === 'clear' ? 0 : 1;
            if (W.state !== 'clear' && W.kind !== W.state) {
                W.amt = Math.max(0, W.amt - dt / 4);
                if (W.amt <= 0) W.kind = W.state;
            } else {
                W.amt += Math.sign(want - W.amt) * Math.min(Math.abs(want - W.amt), dt / 8);
            }
            if (W.amt <= 0 && W.state === 'clear') W.kind = null;
            W.rainAmt = W.kind === 'rain' ? W.amt : 0;
            W.snowAmt = W.kind === 'snow' ? W.amt : 0;

            // 雨停了、還是白天 → 出彩虹
            if (W._rainbowPending && W.amt < 0.25) {
                W._rainbowPending = false;
                emit('rainbow');
            }

            // 地面濕度與積雪
            if (W.rainAmt > 0.2) W.wet = Math.min(1, W.wet + dt * 0.12 * W.rainAmt);
            else W.wet = Math.max(0, W.wet - dt * 0.018);
            if (W.snowAmt > 0.3) W.snowCover = Math.min(1, W.snowCover + dt * 0.018 * W.snowAmt);
            else W.snowCover = Math.max(0, W.snowCover - dt * 0.012);
            coverMat.opacity = W.snowCover * 0.92;
            cover.visible = W.snowCover > 0.01;

            // 提供給場地的參數
            world.storm = W.rainAmt * 1.0 + W.snowAmt * 0.55;
            world.rainAmt = W.rainAmt;
            world.wet = W.wet * (1 - W.snowCover * 0.6);

            // 閃電
            if (W.rainAmt > 0.85 && nightAmt < 0.9) {
                W._thunderT -= dt;
                if (W._thunderT <= 0) {
                    W._thunderT = rand(14, 30);
                    if (Math.random() < 0.6) {
                        W._flash = 1;
                        setTimeout(() => emit('thunder'), 300 + Math.random() * 900);
                    }
                }
            }
            W._flash = Math.max(0, W._flash - dt * 4);
            world.flash = W._flash > 0.5 ? W._flash : W._flash * 0.4;

            const cx = cam.x, cz = cam.z;

            // 烏雲
            const cloudAmt = Math.min(1, world.storm * 1.1);
            stormMat.opacity = cloudAmt * 0.6;
            stormMat.color.setHex(W.kind === 'snow' ? 0xc2c8d0 : 0x4a525e);
            if (nightAmt > 0.5) stormMat.color.multiplyScalar(0.45);
            stormClouds.forEach(g => {
                g.visible = cloudAmt > 0.02;
                g.position.x += g.userData.speed * dt;
                if (g.position.x > 80) g.position.x = -80;
            });

            // 雨
            rainMat.opacity = Math.min(0.6, W.rainAmt * 0.7);
            rain.visible = W.rainAmt > 0.01;
            if (rain.visible) {
                const n = Math.floor(RN * W.rainAmt);
                const wind = 0.18;
                for (let i = 0; i < n; i++) {
                    const d = drops[i];
                    d.y -= d.v * dt;
                    d.x += d.v * wind * dt;
                    if (d.y < 0 || Math.abs(d.x - cx) > 46 || Math.abs(d.z - cz) > 38) {
                        // 落地水花
                        if (d.y < 0 && Math.random() < 0.025) {
                            const s = splashes.find(q => q.life <= 0);
                            if (s) { s.m.position.set(d.x, 0.06, d.z); s.life = 0.35; s.m.visible = true; }
                        }
                        spawnDrop(d, cx, cz, false);
                    }
                    const o = i * 6;
                    rainPos[o] = d.x; rainPos[o + 1] = d.y; rainPos[o + 2] = d.z;
                    rainPos[o + 3] = d.x - wind * 0.8; rainPos[o + 4] = d.y + 0.8; rainPos[o + 5] = d.z;
                }
                rainGeo.setDrawRange(0, n * 2);
                rainGeo.attributes.position.needsUpdate = true;
            }
            splashes.forEach(s => {
                if (s.life <= 0) return;
                s.life -= dt;
                const k = 1 - s.life / 0.35;
                s.m.scale.setScalar(0.1 + k * 0.3);
                s.m.material.opacity = (1 - k) * 0.6;
                if (s.life <= 0) s.m.visible = false;
            });

            // 雪
            snowMat.opacity = Math.min(0.95, W.snowAmt * 1.1);
            snow.visible = W.snowAmt > 0.01;
            if (snow.visible) {
                const n = Math.floor(SN * W.snowAmt);
                for (let i = 0; i < n; i++) {
                    const f = flakes[i];
                    f.p += dt;
                    f.y -= f.v * dt;
                    f.x += Math.sin(f.p * 0.9 + i) * 0.5 * dt + 0.25 * dt;
                    f.z += Math.cos(f.p * 0.7 + i) * 0.3 * dt;
                    if (f.y < 0 || Math.abs(f.x - cx) > 46 || Math.abs(f.z - cz) > 38) spawnFlake(f, cx, cz, false);
                    snowPos[i * 3] = f.x; snowPos[i * 3 + 1] = f.y; snowPos[i * 3 + 2] = f.z;
                }
                snowGeo.setDrawRange(0, n);
                snowGeo.attributes.position.needsUpdate = true;
            }
        };

        W.icon = function () {
            if (W.state === 'rain' || (W.kind === 'rain' && W.amt > 0.3)) return '🌧️ 下雨';
            if (W.state === 'snow' || (W.kind === 'snow' && W.amt > 0.3)) return '❄️ 下雪';
            return '';
        };
        return W;
    }

    window.PetWeather = { create };
})();
