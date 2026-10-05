// =============================================================
//  寵物樂園 3D － 天空的熱氣球
//  在樂園上空慢慢繞圈，下面掛著布條「某某的樂園」
// =============================================================
(function () {
    'use strict';
    const { part, pivot } = PetModels;

    function stripeTexture() {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        const cols = ['#ff5d73', '#ffd166', '#5ec8f2', '#7ed957', '#b388ff', '#ff9f43', '#ff6bd5', '#4dd0c8'];
        const n = 16;
        for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(i * c.width / n, 0, c.width / n + 1, c.height); }
        // 中間一圈白色星星帶
        g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, 118, c.width, 34);
        g.font = '26px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < 8; i++) g.fillText(['⭐', '🐾', '💖', '🐾'][i % 4], (i + 0.5) * c.width / 8, 136);
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
        return t;
    }

    function create(scene, world, opts) {
        const root = new THREE.Group();
        scene.add(root);
        const sway = pivot(root, [0, 0, 0]);
        root.scale.setScalar(1.15);

        // ---------- 氣球本體 (像水滴的形狀) ----------
        const prof = [];
        for (let i = 0; i <= 24; i++) {
            const t = i / 24;                                   // 0 = 底部開口，1 = 頂端
            const y = t * 5.2;
            const r = t < 0.62 ? 0.45 + Math.sin((t / 0.62) * Math.PI / 2) * 1.95 : Math.cos(((t - 0.62) / 0.38) * Math.PI / 2) * 2.4 + 0.0;
            prof.push(new THREE.Vector2(Math.max(0.02, t < 0.62 ? r : Math.max(r, 0.02)), y));
        }
        const env = new THREE.Mesh(new THREE.LatheGeometry(prof, 40),
            new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.55, side: THREE.DoubleSide, emissive: 0xff9a3c, emissiveIntensity: 0 }));
        env.position.y = 0.6;
        env.castShadow = true;
        sway.add(env);
        // ---------- 吊籃 + 繩子 ----------
        part('box', 0xa0703f, [1.0, 0.75, 1.0], [0, -1.55, 0], sway, { kind: 'wood' });
        part('box', 0x7a4a24, [1.08, 0.12, 1.08], [0, -1.15, 0], sway, { kind: 'wood' });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
            const rope = part('cyl', 0x5d4037, [0.025, 1.75, 0.025], [sx * 0.45, -0.32, sz * 0.45], sway, { kind: 'wood', shadow: false });
            rope.rotation.set(sz * 0.05, 0, -sx * 0.05);
        });
        // 爐火
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false, transparent: true, opacity: 0.9 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 10), flameMat);
        flame.position.y = 0.45;
        sway.add(flame);
        part('cyl', 0x555555, [0.16, 0.12, 0.16], [0, 0.15, 0], sway, { kind: 'metal' });

        // ---------- 布條：某某的樂園 ----------
        const cv = document.createElement('canvas');
        cv.width = 640; cv.height = 140;
        const tex = new THREE.CanvasTexture(cv);
        tex.encoding = THREE.sRGBEncoding;
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.84),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
        const bannerPivot = pivot(root, [0, -3.4, 0]);
        bannerPivot.add(banner);
        const bRopes = [-1, 1].map(sd => part('cyl', 0x5d4037, [0.02, 3.63, 0.02], [sd * 2.25, 1.38, 0], bannerPivot, { kind: 'wood', shadow: false }));
        bRopes.forEach((r, i) => r.rotation.z = (i ? 1 : -1) * 1.306);   // 從布條兩端拉到吊籃
        function drawBanner(name) {
            const g = cv.getContext('2d');
            g.clearRect(0, 0, cv.width, cv.height);
            const r = 34;
            g.fillStyle = 'rgba(255,255,255,0.96)';
            g.strokeStyle = '#ff6b9a'; g.lineWidth = 10;
            g.beginPath();
            g.moveTo(r + 6, 6); g.arcTo(cv.width - 6, 6, cv.width - 6, cv.height - 6, r); g.arcTo(cv.width - 6, cv.height - 6, 6, cv.height - 6, r);
            g.arcTo(6, cv.height - 6, 6, 6, r); g.arcTo(6, 6, cv.width - 6, 6, r); g.closePath();
            g.fill(); g.stroke();
            const text = `🎈 ${name} 的樂園`;
            let size = 64;
            g.textAlign = 'center'; g.textBaseline = 'middle';
            do { g.font = `bold ${size}px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif`; size -= 4; } while (g.measureText(text).width > cv.width - 60 && size > 24);
            g.fillStyle = '#d63a6a';
            g.fillText(text, cv.width / 2, cv.height / 2 + 3);
            tex.needsUpdate = true;
        }
        drawBanner(opts.name || '我');

        // 點氣球用的隱形盒子
        const proxy = new THREE.Mesh(new THREE.BoxGeometry(5, 9.5, 5), new THREE.MeshBasicMaterial());
        proxy.visible = false;
        proxy.position.y = 0.4;
        proxy.userData.pick = { kind: 'balloon' };
        root.add(proxy);
        if (world.pickables) world.pickables.push(proxy);

        // ---------- 路線：在樂園上空繞一個大橢圓 ----------
        const P = { a: Math.random() * Math.PI * 2, cx: 0, cz: 7, rx: 20, rz: 7, y: 11.5 };   // 樂園前半部的上空 (鏡頭往下看，高的東西會往畫面上方跑)
        let burn = 0, burnT = 3;
        const api = {
            root, proxy,
            setName: drawBanner,
            update(dt, time, camYaw, night) {
                P.a += dt * 0.045;
                const x = P.cx + Math.cos(P.a) * P.rx, z = P.cz + Math.sin(P.a) * P.rz;
                root.position.set(x, P.y + Math.sin(time * 0.5) * 0.6, z);
                sway.rotation.z = Math.sin(time * 0.7) * 0.04;
                sway.rotation.x = Math.cos(time * 0.55) * 0.03;
                env.rotation.y += dt * 0.05;
                // 布條轉向鏡頭，讓大家都看得到字
                bannerPivot.rotation.y = camYaw;
                bannerPivot.rotation.z = Math.sin(time * 1.3) * 0.05;
                // 偶爾噴一下火 (晚上氣球會亮)
                burnT -= dt;
                if (burnT <= 0) { burn = 1.2; burnT = 4 + Math.random() * 6; opts.onBurn && opts.onBurn(root.position); }
                burn = Math.max(0, burn - dt);
                const f = burn > 0 ? 1 : 0.35;
                flame.scale.set(f * (0.9 + Math.random() * 0.2), f * (1 + Math.random() * 0.6) * (burn > 0 ? 1.8 : 1), f);
                env.material.emissiveIntensity = (burn > 0 ? 0.35 : 0.04) * (0.4 + night * 1.2);
            },
        };
        return api;
    }

    window.PetBalloon = { create };
})();
