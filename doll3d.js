// =============================================================
//  共用 3D 娃娃模型 (化妝換裝 + 寵物樂園都用這個)
//  Doll3D.build(look, { detail: 'high' | 'low', paintMat })
//   - high：化妝間用，1024 臉部貼圖、細節多
//   - low ：寵物樂園用 (鏡頭很遠)，零件少、貼圖小，效能好
//  臉 (眼睛、眉毛、嘴巴、腮紅、眼影) 都畫在頭前面的一片貼圖上，
//  所以表情、化妝都很細緻，換色只要重畫貼圖。
//  娃娃座標：腳底 y = 0，頭中心 y ≈ 2.05，頭是半徑 1 的球再壓扁。
// =============================================================
(function () {
    'use strict';
    THREE.ColorManagement.legacyMode = false;

    // 角色的身體特徵 (名字、預設值放在遊戲裡)
    const CHAR_BODY = {
        girl: { ears: 'human' }, boy: { ears: 'human' },
        bunny: { ears: 'bunny', fur: true, tail: 'puff', nose: 'pink', whiskers: true },
        kitty: { ears: 'cat', fur: true, tail: 'long', nose: 'pink', whiskers: true },
        bear: { ears: 'bear', fur: true, tail: 'stub', nose: 'brown', muzzle: true },
    };

    const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

    // =========================================================
    //  幾何體 (依細節分兩套)
    // =========================================================
    // 臉部貼圖蓋住的範圍 (經度 ±A、緯度 ±B，單位：弧度)
    const FACE_A = 1.1, FACE_B = 0.9;

    function lathe(points, seg) {
        return new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), seg);
    }
    // 一撮頭髮：上面圓、下面尖的水滴
    function lockPoints(n) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const s = i / n;
            const r = (s < 0.25 ? Math.sin((s / 0.25) * Math.PI / 2) : Math.cos(((s - 0.25) / 0.75) * Math.PI / 2) * 0.92 + 0.08 * (1 - s)) * 0.5;
            pts.push([Math.max(r, 0.0001), 0.5 - s]);
        }
        return pts;
    }
    function ruffle(geo, belowY, waves, amp) {
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
            if (p.getY(i) > belowY) continue;
            const x = p.getX(i), z = p.getZ(i);
            const f = 1 + amp * Math.sin(Math.atan2(z, x) * waves);
            p.setX(i, x * f); p.setZ(i, z * f);
        }
        geo.computeVertexNormals();
        return geo;
    }
    function shapeGeo(shape, depth, curve) {
        const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: curve });
        g.center();
        return g;
    }
    function starShape() {
        const s = new THREE.Shape();
        for (let i = 0; i < 10; i++) {
            const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.45 : 1;
            if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        return s;
    }
    function heartShape() {
        const s = new THREE.Shape();
        s.moveTo(0, -0.9);
        s.bezierCurveTo(-0.2, -0.65, -1, -0.25, -1, 0.3);
        s.bezierCurveTo(-1, 0.75, -0.6, 1, -0.3, 1);
        s.bezierCurveTo(-0.1, 1, 0, 0.85, 0, 0.7);
        s.bezierCurveTo(0, 0.85, 0.1, 1, 0.3, 1);
        s.bezierCurveTo(0.6, 1, 1, 0.75, 1, 0.3);
        s.bezierCurveTo(1, -0.25, 0.2, -0.65, 0, -0.9);
        return s;
    }
    const GEO = {};
    function geos(detail) {
        if (GEO[detail]) return GEO[detail];
        const hi = detail === 'high';
        const q = hi ? 1 : 0.5;
        const n = v => Math.max(6, Math.round(v * q));
        const G = {
            head: new THREE.SphereGeometry(1, n(56), n(40)),
            face: new THREE.SphereGeometry(1.003, n(64), n(48), Math.PI / 2 - FACE_A, FACE_A * 2, Math.PI / 2 - FACE_B, FACE_B * 2),
            sphere: new THREE.SphereGeometry(1, n(28), n(18)),
            cyl: new THREE.CylinderGeometry(1, 1, 1, n(28)),
            tube: new THREE.CylinderGeometry(1, 1, 1, n(28), 1, true),
            cone: new THREE.ConeGeometry(1, 1, n(20)),
            box: new THREE.BoxGeometry(1, 1, 1),
            capsule: new THREE.CapsuleGeometry(1, 1, n(6), n(16)),
            torus: new THREE.TorusGeometry(1, 0.12, n(10), n(32)),
            arc: new THREE.TorusGeometry(1, 0.06, n(8), n(32), Math.PI),
            cap: new THREE.SphereGeometry(1, n(44), n(22), 0, Math.PI * 2, 0, Math.PI * 0.5),
            lock: lathe(lockPoints(hi ? 18 : 9), n(18)),
            star: shapeGeo(starShape(), 0.3, hi ? 10 : 4),
            heart: shapeGeo(heartShape(), 0.25, hi ? 10 : 4),
            // 上衣：肩膀圓、腰身收一點
            torso: lathe([[0.0001, 0.41], [0.13, 0.4], [0.25, 0.34], [0.315, 0.22], [0.305, 0.05], [0.275, -0.1], [0.29, -0.22], [0.25, -0.31], [0.0001, -0.34]], n(28)),
            // 裙子 (下擺有波浪)
            skirt: ruffle(lathe([[0.27, 0], [0.33, -0.08], [0.44, -0.3], [0.56, -0.56], [0.58, -0.62]], n(40)), -0.5, 10, 0.05),
            gown: ruffle(lathe([[0.27, 0], [0.34, -0.12], [0.55, -0.45], [0.78, -0.82], [0.86, -0.96], [0.84, -0.98]], n(48)), -0.85, 12, 0.045),
            tutu: ruffle(lathe([[0.26, 0.02], [0.45, -0.02], [0.64, -0.07], [0.62, -0.1], [0.42, -0.1], [0.27, -0.08]], n(48)), 1, 16, 0.06),
            shorts: lathe([[0.27, 0.02], [0.31, -0.08], [0.33, -0.2], [0.3, -0.24], [0.0001, -0.25]], n(28)),
        };
        G.tutu.computeVertexNormals();
        return (GEO[detail] = G);
    }

    // =========================================================
    //  貼圖：頭髮紋路、衣服花紋
    // =========================================================
    let strandTex = null;
    function hairTexture() {
        if (strandTex) return strandTex;
        const cv = document.createElement('canvas');
        cv.width = cv.height = 256;
        const g = cv.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, 256, 256);
        // 髮絲：一條一條深淺不同的直線
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 90; i++) {
            const x = rnd() * 256, w = 1 + rnd() * 5;
            g.fillStyle = 'rgba(0,0,0,' + (0.05 + rnd() * 0.12) + ')';
            g.fillRect(x, 0, w, 256);
        }
        // 天使光圈 (亮亮的一圈)
        const grd = g.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0.0, 'rgba(255,255,255,0)');
        grd.addColorStop(0.32, 'rgba(255,255,255,0)');
        grd.addColorStop(0.42, 'rgba(255,255,255,0.55)');
        grd.addColorStop(0.52, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 256, 256);
        strandTex = new THREE.CanvasTexture(cv);
        strandTex.encoding = THREE.sRGBEncoding;
        strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping;
        strandTex.anisotropy = 4;
        return strandTex;
    }

    const patternCache = {};
    function pathHeart(g, x, y, s) {
        g.beginPath();
        g.moveTo(x, y + s * 0.9);
        g.bezierCurveTo(x - s * 1.2, y + s * 0.1, x - s * 0.7, y - s * 0.9, x, y - s * 0.3);
        g.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.2, y + s * 0.1, x, y + s * 0.9);
        g.fill();
    }
    function pathStar(g, x, y, s) {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s;
            g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        g.fill();
    }
    function patternTexture(color, pat) {
        const key = color + pat;
        if (patternCache[key]) return patternCache[key];
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const g = cv.getContext('2d');
        g.fillStyle = color;
        g.fillRect(0, 0, 128, 128);
        const light = new THREE.Color(color).getHSL({}).l > 0.85;
        g.fillStyle = light ? '#ff8fc0' : 'rgba(255,255,255,0.9)';
        if (pat === 'dots') {
            [[32, 32], [96, 96]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill(); });
        } else if (pat === 'stripes') {
            g.fillRect(0, 0, 32, 128); g.fillRect(64, 0, 32, 128);
        } else if (pat === 'hearts') {
            pathHeart(g, 32, 34, 18); pathHeart(g, 96, 98, 18);
        } else if (pat === 'stars') {
            pathStar(g, 32, 34, 20); pathStar(g, 96, 98, 20);
        } else if (pat === 'plaid') {
            g.globalAlpha = 0.45;
            g.fillRect(0, 20, 128, 24); g.fillRect(20, 0, 24, 128);
            g.globalAlpha = 0.7;
            g.fillRect(0, 90, 128, 6); g.fillRect(90, 0, 6, 128);
            g.globalAlpha = 1;
        }
        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(6, 3);
        t.anisotropy = 4;
        return (patternCache[key] = t);
    }

    // =========================================================
    //  臉 (畫在貼圖上)
    // =========================================================
    // 在頭上 (x, y) 的位置畫東西；fn 裡用「頭的表面單位」、y 往下
    function atFace(g, S, x, y, fn) {
        const z = Math.sqrt(Math.max(0.0001, 1 - x * x - y * y));
        const a = Math.atan2(x, z), b = Math.asin(y);
        const X = ((a + FACE_A) / (2 * FACE_A)) * S;
        const Y = ((FACE_B - b) / (2 * FACE_B)) * S;
        const sx = S / (2 * FACE_A) / (Math.cos(b) * Math.cos(a));
        const sy = S / (2 * FACE_B) / Math.cos(b);
        g.save();
        g.translate(X, Y);
        g.scale(sx, sy);
        fn(g);
        g.restore();
    }
    function softBlob(g, x, y, rx, ry, color, alpha) {
        const grd = g.createRadialGradient(x, y, 0, x, y, 1);
        const c = new THREE.Color(color);
        const rgb = Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255);
        grd.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
        grd.addColorStop(0.55, 'rgba(' + rgb + ',' + alpha * 0.7 + ')');
        grd.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.save();
        g.translate(x, y);
        g.scale(rx, ry);
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, 1, 0, Math.PI * 2);
        g.fill();
        g.restore();
    }
    const LINE = '#2a1418';
    function drawEye(g, sd, mode, look, hi) {
        const w = 0.135, h = 0.17;
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (mode === 'blink') {
            g.strokeStyle = LINE; g.lineWidth = 0.026;
            g.beginPath(); g.moveTo(-w, 0.02); g.quadraticCurveTo(0, 0.085, w, 0.02); g.stroke();
            if (look.lashes) { g.lineWidth = 0.016; g.beginPath(); g.moveTo(w * sd, 0.02); g.lineTo(w * sd + 0.04 * sd, 0.05); g.stroke(); }
            return;
        }
        if (mode === 'happy') {
            g.strokeStyle = LINE; g.lineWidth = 0.03;
            g.beginPath(); g.moveTo(-w, 0.05); g.quadraticCurveTo(0, -0.12, w, 0.05); g.stroke();
            if (look.lashes) { g.lineWidth = 0.016; g.beginPath(); g.moveTo(w * sd * 0.95, 0.03); g.lineTo(w * sd + 0.045 * sd, -0.0); g.stroke(); }
            return;
        }
        const eye = new THREE.Color(look.eyeColor || '#5a3418');
        const dark = '#' + eye.clone().lerp(new THREE.Color('#000000'), 0.55).getHexString();
        const light = '#' + eye.clone().lerp(new THREE.Color('#ffffff'), 0.4).getHexString();
        // 眼白
        g.fillStyle = '#ffffff';
        g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); g.fill();
        // 瞳孔 (上深下淺)
        g.save();
        g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); g.clip();
        const grd = g.createLinearGradient(0, -h, 0, h);
        grd.addColorStop(0, dark); grd.addColorStop(0.5, '#' + eye.getHexString()); grd.addColorStop(1, light);
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(0, 0.012, w * 0.9, h * 0.92, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#' + eye.clone().lerp(new THREE.Color('#000000'), 0.78).getHexString();
        g.beginPath(); g.ellipse(0, 0.02, w * 0.42, h * 0.46, 0, 0, Math.PI * 2); g.fill();
        if (hi) {
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.beginPath(); g.ellipse(0, h * 0.55, w * 0.55, h * 0.24, 0, 0, Math.PI * 2); g.fill();
        }
        g.restore();
        // 亮點
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(0.042, -0.06, 0.042, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-0.042, 0.062, 0.02, 0, Math.PI * 2); g.fill();
        // 上眼線 + 睫毛
        g.strokeStyle = LINE;
        g.lineWidth = look.lashes ? 0.034 : 0.024;
        g.beginPath(); g.ellipse(0, 0.005, w * 1.04, h * 1.03, 0, Math.PI * 1.06, Math.PI * 1.94); g.stroke();
        if (look.lashes) {
            g.lineWidth = 0.018;
            const ox = w * 0.95 * sd;
            [[0, -0.05, 0.06, -0.1], [0.0, 0.0, 0.07, -0.03]].forEach(([x1, y1, x2, y2]) => {
                g.beginPath(); g.moveTo(ox + x1 * sd, y1 - 0.02); g.lineTo(ox + x2 * sd, y2 - 0.03); g.stroke();
            });
            g.globalAlpha = 0.45; g.lineWidth = 0.012;
            g.beginPath(); g.ellipse(0, 0, w * 0.95, h * 1.0, 0, Math.PI * 0.2, Math.PI * 0.45); g.stroke();
            g.globalAlpha = 1;
        }
    }
    function lipShapeClosed(g, col, gloss, sparkle) {
        const up = '#' + new THREE.Color(col).lerp(new THREE.Color('#000000'), 0.12).getHexString();
        g.fillStyle = up;
        g.beginPath();
        g.moveTo(-0.105, -0.008);
        g.quadraticCurveTo(-0.055, -0.045, -0.012, -0.022);
        g.quadraticCurveTo(0, -0.028, 0.012, -0.022);
        g.quadraticCurveTo(0.055, -0.045, 0.105, -0.008);
        g.quadraticCurveTo(0, 0.01, -0.105, -0.008);
        g.fill();
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(-0.095, -0.004);
        g.quadraticCurveTo(0, 0.082, 0.095, -0.004);
        g.quadraticCurveTo(0, 0.014, -0.095, -0.004);
        g.fill();
        g.strokeStyle = '#' + new THREE.Color(col).lerp(new THREE.Color('#000000'), 0.4).getHexString();
        g.lineWidth = 0.01; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-0.1, -0.012); g.quadraticCurveTo(0, 0.014, 0.1, -0.012); g.stroke();
        if (gloss) {
            g.fillStyle = 'rgba(255,255,255,' + (sparkle ? 0.85 : 0.6) + ')';
            g.beginPath(); g.ellipse(0.025, 0.035, 0.03, 0.012, -0.2, 0, Math.PI * 2); g.fill();
        }
    }
    function drawMouth(g, look, expr, lipCol) {
        const inside = '#7a2234';
        g.lineCap = 'round';
        if (expr === 'laugh' || expr === 'happy') {
            const s = expr === 'laugh' ? 1 : 0.72;
            g.save(); g.scale(s, s);
            g.fillStyle = inside;
            g.beginPath();
            g.moveTo(-0.12, -0.012);
            g.quadraticCurveTo(0, -0.03, 0.12, -0.012);
            g.quadraticCurveTo(0.11, 0.14, 0, 0.145);
            g.quadraticCurveTo(-0.11, 0.14, -0.12, -0.012);
            g.fill();
            g.fillStyle = '#ff7f96';
            g.beginPath(); g.ellipse(0, 0.105, 0.065, 0.038, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath(); g.ellipse(0, 0.0, 0.08, 0.014, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = lipCol; g.lineWidth = 0.024;
            g.beginPath(); g.moveTo(-0.12, -0.012); g.quadraticCurveTo(0, -0.03, 0.12, -0.012); g.stroke();
            g.lineWidth = 0.02;
            g.beginPath(); g.moveTo(-0.11, 0.02); g.quadraticCurveTo(0, 0.17, 0.11, 0.02); g.stroke();
            g.restore();
        } else if (expr === 'kiss') {
            g.fillStyle = lipCol;
            g.beginPath(); g.ellipse(0.005, 0.01, 0.05, 0.045, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#' + new THREE.Color(lipCol).lerp(new THREE.Color('#000000'), 0.4).getHexString();
            g.lineWidth = 0.01;
            g.beginPath(); g.moveTo(-0.018, 0.01); g.lineTo(0.028, 0.01); g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.6)';
            g.beginPath(); g.ellipse(0.02, 0.03, 0.014, 0.008, 0, 0, Math.PI * 2); g.fill();
        } else if (expr === 'wow') {
            g.fillStyle = inside;
            g.beginPath(); g.ellipse(0, 0.02, 0.05, 0.068, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = lipCol; g.lineWidth = 0.022;
            g.beginPath(); g.ellipse(0, 0.02, 0.055, 0.074, 0, 0, Math.PI * 2); g.stroke();
        } else {
            lipShapeClosed(g, lipCol, !!look.lip, look.sparkle);
        }
    }
    // 把整張臉畫到 g (大小 S×S)。eyes：['open'|'blink'|'happy', ...] 左右眼
    function drawFace(g, S, look, eyeModes, hi) {
        const body = CHAR_BODY[look.char] || CHAR_BODY.girl;
        const expr = look.expr || 'smile';
        g.clearRect(0, 0, S, S);
        // 小熊的嘴巴周圍比較淺
        if (body.muzzle) atFace(g, S, 0, -0.33, c => softBlob(c, 0, 0, 0.27, 0.2, mixHex(look.skin, '#ffffff', 0.45), 0.95));
        // 腮紅
        if (look.blush) {
            [-1, 1].forEach(sd => atFace(g, S, 0.55 * sd, -0.22, c => {
                softBlob(c, 0, 0, 0.17, 0.105, look.blush, 0.6);
                if (hi) {
                    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.012; c.lineCap = 'round';
                    [-0.05, 0, 0.05].forEach(x => { c.beginPath(); c.moveTo(x + 0.015, -0.03); c.lineTo(x - 0.015, 0.03); c.stroke(); });
                }
            }));
        }
        // 眼影 (在眼睛上方，下半部會被眼睛蓋住)
        if (look.shadow) {
            [-1, 1].forEach(sd => atFace(g, S, 0.34 * sd, -0.02, c => {
                softBlob(c, 0.01 * sd, -0.09, 0.21, 0.14, look.shadow, 0.85);
                if (look.sparkle && hi) {
                    c.fillStyle = 'rgba(255,255,255,0.9)';
                    [[-0.12, -0.12], [0.02, -0.17], [0.13, -0.1], [-0.05, -0.2], [0.09, -0.19]].forEach(([x, y]) => {
                        c.beginPath(); c.arc(x * sd, y, 0.008, 0, Math.PI * 2); c.fill();
                    });
                }
            }));
        }
        // 眼睛
        [-1, 1].forEach((sd, i) => atFace(g, S, 0.34 * sd, -0.02, c => drawEye(c, sd, eyeModes[i], look, hi)));
        // 眉毛
        const browCol = look.hair === 'none' ? mixHex(look.skin, '#2a1a12', 0.6) : mixHex(look.hairColor, '#000000', 0.2);
        [-1, 1].forEach(sd => atFace(g, S, 0.34 * sd, expr === 'wow' ? 0.36 : 0.3, c => {
            c.strokeStyle = browCol; c.lineWidth = 0.026; c.lineCap = 'round';
            c.beginPath();
            if (expr === 'wow') { c.moveTo(-0.08, 0.01); c.quadraticCurveTo(0, -0.04, 0.08, 0.01); }
            else { c.moveTo(-0.08 * sd, 0.012); c.quadraticCurveTo(0, -0.02, 0.08 * sd, 0.004); }
            c.stroke();
        }));
        // 鼻子
        atFace(g, S, 0, -0.2, c => {
            if (body.nose) {
                c.fillStyle = body.nose === 'brown' ? '#4a2a1a' : '#ff8fae';
                c.beginPath(); c.moveTo(-0.05, -0.02); c.quadraticCurveTo(0, -0.045, 0.05, -0.02);
                c.quadraticCurveTo(0.02, 0.035, 0, 0.035); c.quadraticCurveTo(-0.02, 0.035, -0.05, -0.02); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.6)';
                c.beginPath(); c.ellipse(0.012, -0.018, 0.014, 0.008, 0, 0, Math.PI * 2); c.fill();
            } else {
                c.fillStyle = mixHex(look.skin, '#b05a4a', 0.35);
                c.beginPath(); c.ellipse(0, 0, 0.022, 0.014, 0, 0, Math.PI * 2); c.fill();
            }
        });
        // 鬍鬚
        if (body.whiskers) {
            [-1, 1].forEach(sd => atFace(g, S, 0.3 * sd, -0.3, c => {
                c.strokeStyle = 'rgba(120,90,90,0.75)'; c.lineWidth = 0.008; c.lineCap = 'round';
                [-0.03, 0.01, 0.05].forEach((y, i) => {
                    c.beginPath(); c.moveTo(0.02 * sd, y); c.lineTo(0.2 * sd, y + (i - 1) * 0.04); c.stroke();
                });
            }));
        }
        // 嘴巴
        const lipCol = look.lip || mixHex(look.skin, '#e0707a', 0.5);
        atFace(g, S, 0, -0.42, c => drawMouth(c, look, expr, lipCol));
    }
    function eyeModesFor(look, blink) {
        const e = look.expr;
        if (e === 'happy' || e === 'laugh') return ['happy', 'happy'];
        if (blink) return ['blink', 'blink'];
        if (e === 'wink') return ['open', 'happy'];
        return ['open', 'open'];
    }

    // =========================================================
    //  建模
    // =========================================================
    // 標準瀏海：[x 位置, 長度, 傾斜]
    const STD_BANGS = [[-0.48, 0.34, 0.35], [-0.24, 0.42, 0.15], [0.02, 0.38, -0.05], [0.27, 0.44, -0.2], [0.5, 0.32, -0.38]];
    const matCache = {};
    function fixed(color, kind) {
        const key = color + '_' + (kind || '');
        if (matCache[key]) return matCache[key];
        let m;
        if (kind === 'metal') m = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.85 });
        else if (kind === 'gloss') m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
        else if (kind === 'glass') m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1 });
        else m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
        return (matCache[key] = m);
    }

    function build(look, opts) {
        opts = opts || {};
        const detail = opts.detail === 'low' ? 'low' : 'high';
        const hi = detail === 'high';
        const G = geos(detail);
        const body = CHAR_BODY[look.char] || CHAR_BODY.girl;
        const Std = hi ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;

        // 這個娃娃自己的材質 (換顏色只改這些)
        const M = {
            skin: new Std({ roughness: 0.55 }),
            hair: new Std({ roughness: 0.42, map: hairTexture(), side: THREE.DoubleSide }),
            outfit: new Std({ roughness: 0.7, side: THREE.DoubleSide }),
            face: new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
        };
        if (hi) {
            M.skin.sheen = body.fur ? 0.9 : 0.35;
            M.skin.sheenRoughness = 0.45;
            M.hair.sheen = 0.6; M.hair.sheenRoughness = 0.35;
            M.outfit.sheen = 0.4; M.outfit.sheenRoughness = 0.6;
        }

        function part(geo, mat, s, p, parent, rot) {
            const m = new THREE.Mesh(G[geo], typeof mat === 'string' ? fixed(mat) : mat);
            m.scale.set(s[0], s[1], s[2]);
            if (p) m.position.set(p[0], p[1], p[2]);
            if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
            if (parent) parent.add(m);
            return m;
        }
        function group(parent, p, rot) {
            const g = new THREE.Group();
            if (p) g.position.set(p[0], p[1], p[2]);
            if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
            if (parent) parent.add(g);
            return g;
        }
        // 貼在頭 (單位球) 表面 (x, y)，自己的 +z 朝外
        function onFace(parent, x, y, depth) {
            const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
            const g = new THREE.Group();
            const r = 1 + (depth || 0);
            g.position.set(x * r, y * r, z * r);
            g.rotation.order = 'YXZ';
            g.rotation.y = Math.atan2(x, z);
            g.rotation.x = -Math.atan2(y, Math.sqrt(x * x + z * z));
            parent.add(g);
            return g;
        }

        const root = new THREE.Group();
        const d = { root, M, legs: [], arms: [], eyes: [], look, detail };

        // ---------- 腿 ----------
        const o = look.outfit;
        const bare = o === 'dress' || o === 'gown' || o === 'tutu';
        const legMat = bare ? M.skin : (o === 'overall' ? M.outfit : fixed('#4a6aa8'));
        const shoeMat = fixed(bare ? '#ff5f9a' : '#ffffff', 'gloss');
        [-1, 1].forEach(sd => {
            const pv = group(root, [0.15 * sd, 0.62, 0]);
            pv.userData.side = sd; pv.userData.front = sd;
            part('capsule', legMat, [0.1, 0.3, 0.1], [0, -0.3, 0], pv);
            part('sphere', shoeMat, [0.12, 0.085, 0.17], [0, -0.57, 0.045], pv);
            part('cyl', fixed(bare ? '#ffffff' : '#c8d0e0'), [0.115, 0.025, 0.16], [0, -0.635, 0.045], pv);
            d.legs.push(pv);
        });

        // ---------- 身體 (以 y = 0.95 為中心，跟著呼吸、走路晃) ----------
        const bodyY = 0.95;
        const bd = group(root, [0, bodyY, 0]);
        d.body = bd; d.bodyY = bodyY;
        const topMat = o === 'overall' ? fixed('#ffffff') : M.outfit;
        part('torso', topMat, [1, 1, 0.8], [0, 0.03, 0], bd);
        part('capsule', M.skin, [0.085, 0.06, 0.085], [0, 0.42, 0], bd);
        if (o === 'dress') {
            part('skirt', M.outfit, [1, 1, 0.85], [0, -0.05, 0], bd);
            part('torus', fixed('#ffffff', 'gloss'), [0.16, 0.16, 0.45], [0, 0.4, 0.03], bd, [Math.PI / 2 + 0.25, 0, 0]);
            part('sphere', fixed('#ffffff', 'gloss'), [0.075, 0.06, 0.045], [0, -0.06, 0.245], bd);
        } else if (o === 'tee') {
            part('shorts', fixed('#4a6aa8'), [1, 1, 0.82], [0, -0.24, 0], bd);
            part('star', fixed('#ffffff'), [0.09, 0.09, 0.09], [0, 0.08, 0.25], bd);
        } else if (o === 'gown') {
            part('gown', M.outfit, [1, 1, 0.92], [0, -0.05, 0], bd);
            part('torus', fixed('#ffd23a', 'metal'), [0.29, 0.25, 0.35], [0, -0.07, 0], bd, [Math.PI / 2, 0, 0]);
            part('sphere', fixed('#ffffff', 'gloss'), [0.06, 0.06, 0.04], [0, 0.18, 0.25], bd);
        } else if (o === 'tutu') {
            part('tutu', M.outfit, [1, 1.2, 0.95], [0, -0.2, 0], bd);
            part('tutu', fixed('#ffffff'), [0.85, 1, 0.82], [0, -0.27, 0], bd);
            part('torus', fixed('#ffffff', 'gloss'), [0.16, 0.16, 0.45], [0, 0.4, 0.03], bd, [Math.PI / 2 + 0.25, 0, 0]);
        } else if (o === 'overall') {
            part('shorts', M.outfit, [1, 1, 0.82], [0, -0.24, 0], bd);
            part('box', M.outfit, [0.36, 0.28, 0.05], [0, -0.04, 0.235], bd);
            [-1, 1].forEach(sd => {
                part('box', M.outfit, [0.055, 0.42, 0.035], [0.13 * sd, 0.15, 0.2], bd, [-0.38, 0, 0]);
                part('sphere', fixed('#ffd23a', 'metal'), [0.032, 0.032, 0.02], [0.13 * sd, 0.06, 0.265], bd);
            });
        }
        // 手臂 (右手拿東西時往前抬，由遊戲控制角度)
        [-1, 1].forEach(sd => {
            const arm = group(bd, [0.33 * sd, 0.27, 0]);
            arm.rotation.z = 0.15 * sd;
            arm.userData.side = sd;
            part('sphere', bare && o !== 'gown' ? M.outfit : topMat, [0.12, 0.11, 0.12], [0, 0, 0], arm);
            part('capsule', M.skin, [0.072, 0.26, 0.072], [0, -0.22, 0], arm);
            part('sphere', M.skin, [0.088, 0.085, 0.08], [0, -0.43, 0.01], arm);
            if (sd === 1) { d.hand = group(arm, [0, -0.46, 0.02]); d.armR = arm; } else d.armL = arm;
            d.arms.push(arm);
        });
        // 尾巴
        if (body.tail === 'puff') part('sphere', M.skin, [0.16, 0.16, 0.16], [0, -0.23, -0.31], bd);
        else if (body.tail === 'stub') part('sphere', M.skin, [0.1, 0.1, 0.1], [0, -0.25, -0.28], bd);
        else if (body.tail === 'long') {
            const N = hi ? 9 : 5;
            for (let i = 0; i < N; i++) {
                const t = i / (N - 1);
                part('sphere', M.skin, [0.06, 0.06, 0.06], [0.15 * Math.sin(t * 3), -0.23 + t * 0.55, -0.3 - Math.sin(t * 2.2) * 0.3], bd);
            }
        }

        // ---------- 頭 ----------
        const head = group(bd, [0, 2.05 - bodyY, 0]);
        head.scale.set(0.85, 0.8, 0.78);
        d.head = head;
        part('head', M.skin, [1, 1, 1], null, head);
        // 臉 (貼圖)
        const S = hi ? 1024 : 256;
        const faceCanvas = (n) => { const cv = document.createElement('canvas'); cv.width = cv.height = n; return cv; };
        const fc = faceCanvas(S);
        const faceTex = new THREE.CanvasTexture(fc);
        faceTex.encoding = THREE.sRGBEncoding;
        faceTex.anisotropy = 4;
        M.face.map = faceTex;
        const faceMesh = part('face', M.face, [1, 1, 1], null, head);
        faceMesh.renderOrder = 2;
        d.faceMesh = faceMesh;
        let closedTex = null;
        if (!hi) {
            // 遠看版：先畫好「張眼」和「閉眼」兩張，遊戲改 eyes[].scale.y 就換圖 (睡覺、眨眼)
            const cc = faceCanvas(S);
            closedTex = new THREE.CanvasTexture(cc);
            closedTex.encoding = THREE.sRGBEncoding;
            closedTex.userData.canvas = cc;
            [-1, 1].forEach(sd => { const p = group(head, [0.34 * sd, -0.02, 0.9]); d.eyes.push(p); });
            faceMesh.onBeforeRender = () => {
                const shut = d.eyes[0].scale.y < 0.5;
                const want = shut ? closedTex : faceTex;
                if (M.face.map !== want) M.face.map = want;
            };
        }
        let lastEyes = '';
        d.redrawFace = function (blink) {
            const modes = eyeModesFor(look, blink);
            const sig = modes.join() + JSON.stringify(look);
            if (sig === lastEyes) return;
            lastEyes = sig;
            drawFace(fc.getContext('2d'), S, look, modes, hi);
            faceTex.needsUpdate = true;
            if (closedTex) {
                drawFace(closedTex.userData.canvas.getContext('2d'), S, look, eyeModesFor(look, true), hi);
                closedTex.needsUpdate = true;
            }
        };
        if (opts.paintMat) {
            d.paint = part('head', opts.paintMat, [1.006, 1.006, 1.006], null, head);
            d.paint.renderOrder = 3;
        }

        buildEars(head, body);
        buildHair(head, look.hair);
        if (look.hat) buildHat(head, look.hat);
        if (look.glasses) buildGlasses(head, look.glasses);
        if (look.prop && d.hand) buildProp(d.hand, look.prop);

        root.traverse(m => { if (m.isMesh) { m.castShadow = !m.material.transparent; m.receiveShadow = false; } });

        d.update = function (L) {
            look = d.look = L || look;
            M.skin.color.set(look.skin);
            if (hi) M.skin.sheenColor = new THREE.Color(mixHex(look.skin, '#ffd0d8', 0.6));
            M.hair.color.set(look.hairColor);
            if (hi) M.hair.sheenColor = new THREE.Color(mixHex(look.hairColor, '#ffffff', 0.5));
            const map = look.pattern && look.pattern !== 'none' ? patternTexture(look.outfitColor, look.pattern) : null;
            if (M.outfit.map !== map) { M.outfit.map = map; M.outfit.needsUpdate = true; }
            M.outfit.color.set(map ? '#ffffff' : look.outfitColor);
            if (hi) M.outfit.sheenColor = new THREE.Color(mixHex(look.outfitColor, '#ffffff', 0.5));
            lastEyes = '';
            d.redrawFace(false);
        };
        d.update(look);
        return d;

        // ===== 以下是頭上的零件 =====
        function buildEars(h, b) {
            if (b.ears === 'human') {
                [-1, 1].forEach(sd => part('sphere', M.skin, [0.12, 0.17, 0.09], [0.96 * sd, -0.06, 0], h));
            } else if (b.ears === 'bunny') {
                [-1, 1].forEach(sd => {
                    const p = group(h, [0.32 * sd, 0.85, -0.1], [0, 0, -0.18 * sd]);
                    part('capsule', M.skin, [0.16, 0.62, 0.09], [0, 0.55, 0], p);
                    part('capsule', '#ffb8cc', [0.09, 0.5, 0.04], [0, 0.55, 0.06], p);
                });
            } else if (b.ears === 'cat') {
                [-1, 1].forEach(sd => {
                    const p = group(h, [0.55 * sd, 0.78, 0], [0, 0, -0.55 * sd]);
                    part('cone', M.skin, [0.28, 0.45, 0.16], [0, 0.12, 0], p);
                    part('cone', '#ffb8cc', [0.16, 0.3, 0.05], [0, 0.08, 0.1], p);
                });
            } else if (b.ears === 'bear') {
                [-1, 1].forEach(sd => {
                    part('sphere', M.skin, [0.26, 0.26, 0.16], [0.68 * sd, 0.7, -0.05], h);
                    part('sphere', '#e8c8a8', [0.15, 0.15, 0.06], [0.7 * sd, 0.68, 0.08], h);
                });
            }
        }

        function cap(h, tilt, r) {
            const m = part('cap', M.hair, [r || 1.06, r || 1.06, r || 1.06], [0, 0, -0.02], h);
            m.rotation.x = tilt;
            return m;
        }
        // 一撮頭髮：w 寬、len 長、d 厚
        function lock(parent, w, len, dep, p, rot) {
            return part('lock', M.hair, [w, len, dep], p, parent, rot);
        }
        // 瀏海：沿著額頭一撮一撮排
        function bangs(h, list, y) {
            list.forEach(([x, len, tilt, w]) => {
                const f = onFace(h, x, y, 0.0);
                lock(f, w || 0.38, len, 0.14, [0, -len * 0.3, 0.03], [0.3, 0, tilt * 0.8]);
            });
        }
        function buildHair(h, style) {
            if (style === 'none' || !style) return;
            if (style === 'short') {
                cap(h, -0.42);
                bangs(h, STD_BANGS, 0.62);
                [-1, 1].forEach(sd => lock(h, 0.24, 0.6, 0.26, [0.9 * sd, 0.05, -0.02], [0, 0, 0.12 * sd]));
            } else if (style === 'long') {
                cap(h, -0.42);
                bangs(h, STD_BANGS, 0.62);
                lock(h, 1.95, 1.9, 0.75, [0, -0.5, -0.52], [0.12, 0, 0]);
                [-1, 1].forEach(sd => {
                    lock(h, 0.34, 1.15, 0.3, [0.88 * sd, -0.45, 0.1], [0, 0, 0.07 * sd]);
                    lock(h, 0.36, 1.2, 0.34, [0.72 * sd, -0.55, -0.35], [0, 0, 0.12 * sd]);
                });
            } else if (style === 'pigtails') {
                cap(h, -0.42);
                bangs(h, STD_BANGS, 0.62);
                [-1, 1].forEach(sd => {
                    lock(h, 0.58, 1.3, 0.52, [1.08 * sd, -0.28, -0.25], [0, 0, 0.35 * sd]);
                    part('sphere', fixed('#ff4f8b', 'gloss'), [0.11, 0.11, 0.11], [0.88 * sd, 0.3, -0.2], h);
                });
            } else if (style === 'ponytail') {
                cap(h, -0.42);
                bangs(h, STD_BANGS, 0.62);
                lock(h, 0.6, 1.4, 0.55, [0, -0.4, -1.15], [0.45, 0, 0]);
                part('sphere', fixed('#ff4f8b', 'gloss'), [0.13, 0.13, 0.13], [0, 0.42, -1.0], h);
            } else if (style === 'bun') {
                cap(h, -0.42);
                bangs(h, STD_BANGS, 0.62);
                part('sphere', M.hair, [0.42, 0.4, 0.42], [0, 1.02, -0.25], h);
                part('torus', fixed('#ff4f8b', 'gloss'), [0.3, 0.3, 0.5], [0, 0.72, -0.18], h, [Math.PI / 2 + 0.25, 0, 0]);
                [-1, 1].forEach(sd => lock(h, 0.2, 0.7, 0.18, [0.88 * sd, -0.15, 0.12], [0, 0, 0.06 * sd]));
            } else if (style === 'braids') {
                cap(h, -0.42);
                bangs(h, STD_BANGS, 0.62);
                const N = hi ? 6 : 4;
                [-1, 1].forEach(sd => {
                    for (let i = 0; i < N; i++) {
                        const s = 0.17 - i * (0.07 / N);
                        part('sphere', M.hair, [s, s * 1.15, s], [0.82 * sd, -0.35 - i * (1.45 / N), 0.08 + i * (0.3 / N)], h);
                    }
                    part('sphere', fixed('#ff4f8b', 'gloss'), [0.09, 0.09, 0.09], [0.82 * sd, -1.85, 0.4], h);
                });
            } else if (style === 'bowl') {
                cap(h, -0.2, 1.09);
                bangs(h, [[-0.56, 0.3, 0.2, 0.24], [-0.28, 0.32, 0.08, 0.26], [0, 0.32, 0, 0.26], [0.28, 0.32, -0.08, 0.26], [0.56, 0.3, -0.2, 0.24]], 0.6);
                [-1, 1].forEach(sd => lock(h, 0.32, 0.85, 0.35, [0.88 * sd, -0.2, 0.0], [0, 0, 0.05 * sd]));
            } else if (style === 'curly') {
                const N = hi ? 70 : 30;
                for (let i = 0; i < N; i++) {
                    const y = 1 - (i / (N - 1)) * 1.6;
                    const r = Math.sqrt(1 - y * y);
                    const a = i * 2.39996;
                    const x = Math.cos(a) * r, z = Math.sin(a) * r;
                    if (z > 0.3 && y < 0.62) continue;
                    const s = hi ? 0.26 : 0.34;
                    part('sphere', M.hair, [s, s, s], [x, y + 0.05, z - 0.05], h);
                }
            } else if (style === 'spiky') {
                cap(h, -0.42);
                bangs(h, [[-0.35, 0.36, 0.3], [0.05, 0.42, 0], [0.42, 0.34, -0.3]], 0.66);
                for (let i = 0; i < 9; i++) {
                    const a = (i / 9) * Math.PI * 2;
                    const x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55 - 0.15;
                    part('cone', M.hair, [0.2, 0.55, 0.2], [x, 0.9, z], h, [z * 0.9, 0, -x * 0.9]);
                }
            }
        }

        function buildHat(h, id) {
            if (id === 'bow') {
                const g = onFace(h, 0.52, 0.72, 0.12);
                const rib = fixed('#ff4f9a', 'gloss');
                part('cone', rib, [0.22, 0.34, 0.12], [-0.17, 0, 0], g, [0, 0, -Math.PI / 2]);
                part('cone', rib, [0.22, 0.34, 0.12], [0.17, 0, 0], g, [0, 0, Math.PI / 2]);
                part('sphere', rib, [0.09, 0.09, 0.09], null, g);
            } else if (id === 'crown') {
                const g = group(h, [0, 0.92, 0], [-0.15, 0, 0.1]);
                const gold = fixed('#ffcf3a', 'metal');
                part('tube', gold, [0.45, 0.22, 0.45], null, g);
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    part('cone', gold, [0.08, 0.2, 0.08], [Math.sin(a) * 0.45, 0.2, Math.cos(a) * 0.45], g);
                    part('sphere', fixed(i % 2 ? '#3fa0ff' : '#ff3f6a', 'gloss'), [0.05, 0.05, 0.05], [Math.sin(a) * 0.46, 0, Math.cos(a) * 0.46], g);
                }
            } else if (id === 'tophat') {
                const g = group(h, [0.05, 0.9, -0.05], [-0.1, 0, -0.15]);
                const blk = fixed('#2a2a36', 'gloss');
                part('cyl', blk, [0.7, 0.05, 0.7], null, g);
                part('cyl', blk, [0.44, 0.6, 0.44], [0, 0.3, 0], g);
                part('cyl', fixed('#ff4f9a'), [0.45, 0.1, 0.45], [0, 0.08, 0], g);
            } else if (id === 'flowers') {
                const g = group(h, [0, 0.55, -0.1], [-0.35, 0, 0]);
                const cols = ['#ff8fc0', '#fff07a', '#ffffff', '#c69cff', '#8fd0ff'];
                const N = hi ? 11 : 7;
                for (let i = 0; i < N; i++) {
                    const a = (i / N) * Math.PI * 2;
                    const f = group(g, [Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9], [-Math.PI / 2 + 0.6, a, 0]);
                    f.rotation.order = 'YXZ';
                    for (let k = 0; k < 5; k++) {
                        const b = (k / 5) * Math.PI * 2;
                        part('sphere', cols[i % cols.length], [0.075, 0.075, 0.04], [Math.cos(b) * 0.08, Math.sin(b) * 0.08, 0], f);
                    }
                    part('sphere', '#ffb020', [0.045, 0.045, 0.045], [0, 0, 0.02], f);
                }
            } else if (id === 'strawhat') {
                const g = group(h, [0, 0.62, -0.05], [-0.22, 0, 0.08]);
                const straw = fixed('#f3d68a');
                part('cyl', straw, [1.35, 0.04, 1.35], null, g);
                part('cap', straw, [0.85, 0.7, 0.85], [0, 0, 0], g);
                part('tube', fixed('#ff6fa8'), [0.86, 0.16, 0.86], [0, 0.08, 0], g);
                part('sphere', fixed('#ff6fa8', 'gloss'), [0.14, 0.14, 0.1], [0.65, 0.12, 0.5], g);
            } else if (id === 'catband') {
                const g = group(h, [0, 0, 0.05]);
                part('arc', fixed('#ff6fa8', 'gloss'), [1.06, 1.06, 1.06], null, g);
                [-1, 1].forEach(sd => {
                    const p = group(g, [0.6 * sd, 0.85, 0], [0, 0, -0.6 * sd]);
                    part('cone', fixed('#2a2a36', 'gloss'), [0.22, 0.38, 0.1], [0, 0.12, 0], p);
                    part('cone', fixed('#ffb8cc'), [0.12, 0.24, 0.04], [0, 0.08, 0.07], p);
                });
            } else if (id === 'star') {
                const g = onFace(h, 0.55, 0.58, 0.1);
                part('star', fixed('#ffd23a', 'metal'), [0.16, 0.16, 0.16], null, g, [0, 0, 0.3]);
            } else if (id === 'unicorn') {
                const g = group(h, [0, 0.92, 0.32], [0.45, 0, 0]);
                part('cone', fixed('#ffe48a', 'metal'), [0.13, 0.55, 0.13], [0, 0.22, 0], g);
                part('torus', fixed('#ff9ad0', 'gloss'), [0.1, 0.1, 0.25], [0, 0.12, 0], g, [Math.PI / 2, 0, 0]);
            }
        }

        function buildGlasses(h, id) {
            const g = group(h);
            const lens = (sd, geo, mat, s) => {
                const p = group(g, [0.34 * sd, -0.02, 0.99], [0, 0.33 * sd, 0]);
                part(geo, mat, s, null, p);
            };
            let frame = fixed('#ffcf3a', 'metal');
            [-1, 1].forEach(sd => {
                if (id === 'round') {
                    lens(sd, 'torus', frame, [0.2, 0.2, 0.2]);
                    lens(sd, 'sphere', fixed('#dff4ff', 'glass'), [0.19, 0.19, 0.01]);
                } else if (id === 'sun') {
                    frame = fixed('#1a1a22', 'gloss');
                    lens(sd, 'sphere', frame, [0.23, 0.17, 0.035]);
                } else if (id === 'heart') {
                    frame = fixed('#ff3f8e', 'gloss');
                    lens(sd, 'heart', fixed('#ff6fae', 'glass'), [0.22, 0.22, 0.22]);
                } else if (id === 'starg') {
                    frame = fixed('#ffb020', 'metal');
                    lens(sd, 'star', fixed('#ffe14d', 'glass'), [0.24, 0.24, 0.2]);
                }
                part('box', frame, [0.03, 0.03, 0.85], [0.72 * sd, 0.02, 0.5], g, [0, -0.45 * sd, 0]);
            });
            part('cyl', frame, [0.022, 0.24, 0.022], [0, 0.02, 1.04], g, [0, 0, Math.PI / 2]);
        }

        function buildProp(hand, id) {
            // hand 群組由遊戲抵銷手臂角度，+y 朝上
            if (id === 'wand') {
                part('cyl', fixed('#ffffff', 'gloss'), [0.025, 0.7, 0.025], [0, 0.3, 0], hand);
                part('star', fixed('#ffd23a', 'metal'), [0.18, 0.18, 0.18], [0, 0.72, 0], hand);
            } else if (id === 'balloon') {
                part('cyl', '#ffffff', [0.006, 1.3, 0.006], [0, 0.65, 0], hand);
                part('sphere', fixed('#ff4f8b', 'gloss'), [0.32, 0.38, 0.32], [0, 1.6, 0], hand);
                part('cone', fixed('#ff4f8b', 'gloss'), [0.05, 0.08, 0.05], [0, 1.22, 0], hand);
            } else if (id === 'lolly') {
                part('cyl', '#ffffff', [0.02, 0.55, 0.02], [0, 0.25, 0], hand);
                part('cyl', fixed('#ff6fae', 'gloss'), [0.24, 0.07, 0.24], [0, 0.72, 0], hand, [Math.PI / 2, 0, 0]);
                part('torus', fixed('#ffffff', 'gloss'), [0.14, 0.14, 0.3], [0, 0.72, 0.04], hand);
                part('torus', fixed('#8fd0ff', 'gloss'), [0.07, 0.07, 0.3], [0, 0.72, 0.045], hand);
            } else if (id === 'bouquet') {
                const cols = ['#ff5f7a', '#ffe066', '#ff8fc0', '#ffffff', '#c69cff'];
                part('cone', fixed('#bfe3a0'), [0.14, 0.4, 0.14], [0, 0.12, 0], hand, [Math.PI, 0, 0]);
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2;
                    part('sphere', cols[i], [0.1, 0.1, 0.1], [Math.cos(a) * 0.12, 0.42, Math.sin(a) * 0.12], hand);
                }
                part('sphere', '#ff3f6a', [0.11, 0.11, 0.11], [0, 0.5, 0], hand);
            } else if (id === 'icecream') {
                part('cone', fixed('#e0a060'), [0.14, 0.4, 0.14], [0, 0.12, 0], hand, [Math.PI, 0, 0]);
                part('sphere', fixed('#ffb8d8', 'gloss'), [0.16, 0.15, 0.16], [0, 0.38, 0], hand);
                part('sphere', fixed('#fff3c0', 'gloss'), [0.14, 0.13, 0.14], [0, 0.6, 0], hand);
                part('sphere', fixed('#ff3f3f', 'gloss'), [0.05, 0.05, 0.05], [0, 0.76, 0], hand);
            } else if (id === 'teddy') {
                const b = fixed('#c8905a');
                part('sphere', b, [0.18, 0.2, 0.15], [0, 0.18, 0.05], hand);
                part('sphere', b, [0.16, 0.15, 0.14], [0, 0.48, 0.05], hand);
                [-1, 1].forEach(sd => part('sphere', b, [0.06, 0.06, 0.04], [0.12 * sd, 0.6, 0.05], hand));
                part('sphere', '#ffe8c8', [0.07, 0.05, 0.04], [0, 0.44, 0.18], hand);
                part('sphere', fixed('#ff4f8b', 'gloss'), [0.05, 0.05, 0.05], [0, 0.34, 0.17], hand);
            }
        }
    }

    // 從存檔讀造型 (寵物樂園用)
    // 先找這個玩家的造型；沒有的話用「還沒建立玩家時」存的那份
    function loadLook() {
        try {
            const id = window.PetProfiles ? PetProfiles.saveKey().split(':').pop() : 'none';
            return JSON.parse(localStorage.getItem('makeup3dLook:' + id) || localStorage.getItem('makeup3dLook:none') || 'null');
        } catch (e) { return null; }
    }

    window.Doll3D = { build, loadLook, CHAR_BODY, patternTexture };
})();
