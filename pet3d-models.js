// =============================================================
//  寵物樂園 3D － 角色模型與動畫
//  所有寵物、小朋友、送貨大鳥都用簡單幾何體組合而成 (Low-poly 可愛風)
// =============================================================
(function () {
    // 使用正確的 sRGB 色彩管理 (必須在建立任何顏色前設定)
    THREE.ColorManagement.legacyMode = false;

    // --- 共用幾何體 (單位尺寸，靠縮放變形) ---
    const G = {
        sphere: new THREE.SphereGeometry(1, 18, 14),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
        cone: new THREE.ConeGeometry(1, 1, 14),
        box: new THREE.BoxGeometry(1, 1, 1),
        torus: new THREE.TorusGeometry(1, 0.28, 8, 20),
        halfTorus: new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI),
    };

    // 材質 (PBR 物理材質，搭配環境光貼圖會有自然的反光)
    const matCache = {};
    function mat(color, kind) {
        const key = color + '_' + (kind || 'std');
        if (!matCache[key]) {
            let m;
            if (kind === 'eye') {
                // 眼睛：光滑有亮點
                m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
            } else if (kind === 'basic') {
                m = new THREE.MeshBasicMaterial({ color });
            } else if (kind === 'fur') {
                // 毛茸茸：絨面光澤 (sheen)
                const c = new THREE.Color(color);
                m = new THREE.MeshPhysicalMaterial({
                    color, roughness: 0.82, metalness: 0,
                    sheen: 0.55, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.25),
                });
            } else if (kind === 'goldfur') {
                // 稀有金色寶寶：毛帶一點金屬光澤
                m = new THREE.MeshPhysicalMaterial({
                    color, roughness: 0.42, metalness: 0.35,
                    sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0xfff3b0),
                    clearcoat: 0.4, clearcoatRoughness: 0.3,
                });
            } else if (kind === 'metal') {
                m = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.75 });
            } else if (kind === 'plastic') {
                m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 });
            } else if (kind === 'skin') {
                m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 });
            } else if (kind === 'wood') {
                m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
            } else {
                m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0 });
            }
            matCache[key] = m;
        }
        return matCache[key];
    }
    // 把模型裡的一般材質換成指定種類 (例如寵物 → 毛絨材質)
    function convertMaterials(root, kind) {
        root.traverse(o => {
            if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial || o.material.isMeshPhysicalMaterial) return;
            if (o.material.userData.noConvert) return;
            o.material = mat(o.material.color.getHex(), kind);
        });
    }

    // 建立一個零件：幾何、顏色、縮放、位置、父物件
    function part(geo, color, s, p, parent, opts) {
        opts = opts || {};
        const m = new THREE.Mesh(G[geo], mat(color, opts.kind));
        m.scale.set(s[0], s[1], s[2]);
        if (p) m.position.set(p[0], p[1], p[2]);
        if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
        m.castShadow = opts.shadow !== false;
        if (parent) parent.add(m);
        return m;
    }
    function pivot(parent, p) {
        const g = new THREE.Group();
        if (p) g.position.set(p[0], p[1], p[2]);
        parent.add(g);
        return g;
    }

    // 眼睛 (黑眼珠 + 白色亮點)
    function addEyes(head, x, y, z, r, rig) {
        [-1, 1].forEach(side => {
            const eye = part('sphere', 0x1a1a1a, [r, r, r * 0.8], [x * side, y, z], head, { kind: 'eye', shadow: false });
            part('sphere', 0xffffff, [r * 0.34, r * 0.34, r * 0.34], [0.3, 0.35, 0.75], eye, { kind: 'basic', shadow: false });
            rig.eyes.push(eye);
        });
    }
    function addCheeks(head, x, y, z, r) {
        [-1, 1].forEach(side => {
            part('sphere', 0xff9fb0, [r, r * 0.6, r * 0.4], [x * side, y, z], head, { shadow: false });
        });
    }

    function newRig(type, root) {
        const lift = pivot(root);
        return {
            type, root, lift,
            body: null, head: null, legs: [], arms: [], tail: null, wings: [], ears: [], eyes: [],
            gait: 'walk', baseBodyY: 0, legLen: 0.4,
            t: Math.random() * 10, phase: 0,
            cur: {}, // 平滑插值用的目前數值
        };
    }

    // =========================================================
    //  寵物外觀規格
    // =========================================================
    const SPECS = {
        dog:     { type: 'quad', c1: 0xe8b37a, c2: 0xfff3e0, ear: 'floppy', earC: 0xa86b3c, tail: 'wag', snout: 'dog', size: 1.0 },
        cat:     { type: 'quad', c1: 0xffb36b, c2: 0xffffff, ear: 'pointy', tail: 'long', snout: 'cat', size: 0.88, stripes: 0xe08a3c },
        rabbit:  { type: 'quad', c1: 0xf6f3ef, c2: 0xffd6e0, ear: 'long', tail: 'puff', snout: 'cat', size: 0.85, gait: 'hop' },
        hamster: { type: 'quad', c1: 0xf2b15f, c2: 0xfff6e5, ear: 'round', earR: 0.09, tail: 'stub', snout: 'mouse', size: 0.62, chubby: true },
        mouse:   { type: 'quad', c1: 0xf2f2f4, c2: 0xffc7d1, ear: 'round', earR: 0.17, earInner: 0xffb3c1, tail: 'thin', tailC: 0xffb3c1, snout: 'mouse', size: 0.55 },
        fox:     { type: 'quad', c1: 0xf07b2c, c2: 0xffffff, ear: 'fox', tail: 'bushy', snout: 'fox', size: 0.95, legC: 0x3a2a20 },
        bear:    { type: 'quad', c1: 0x8b5a2b, c2: 0xd9b38c, ear: 'round', earR: 0.12, tail: 'stub', snout: 'bear', size: 1.3, chubby: true },
        panda:   { type: 'quad', c1: 0xffffff, c2: 0xffffff, ear: 'round', earR: 0.12, earC: 0x222222, tail: 'stub', snout: 'bear', size: 1.25, legC: 0x222222, panda: true, chubby: true },
        koala:   { type: 'quad', c1: 0x9e9ea6, c2: 0xe8e8ea, ear: 'koala', tail: 'none', snout: 'koala', size: 0.95, chubby: true },
        tiger:   { type: 'quad', c1: 0xf39a2b, c2: 0xffffff, ear: 'round', earR: 0.1, tail: 'long', snout: 'cat', size: 1.15, stripes: 0x3a2a1a },
        lion:    { type: 'quad', c1: 0xe8b04a, c2: 0xfff0c8, ear: 'round', earR: 0.1, tail: 'tuft', snout: 'cat', size: 1.2, mane: 0xb8661f },
        cow:     { type: 'quad', c1: 0xffffff, c2: 0xf7b9c4, ear: 'cow', tail: 'tuft', snout: 'cow', size: 1.35, spots: 0x333333 },
        pig:     { type: 'quad', c1: 0xffb6c1, c2: 0xff8fa5, ear: 'pig', tail: 'curly', snout: 'pig', size: 1.0, chubby: true },
        monkey:  { type: 'quad', c1: 0x8a5a3c, c2: 0xf3d1a8, ear: 'side', tail: 'long', snout: 'monkey', size: 0.9 },
        frog:    { type: 'frog', c1: 0x6cc24a, c2: 0xd8f0a0, size: 0.72, gait: 'hop' },
        penguin: { type: 'penguin', c1: 0x2b2f3a, c2: 0xffffff, beak: 0xffa31a, size: 0.9, gait: 'waddle' },
        bird:    { type: 'bird', c1: 0x5fb0f0, c2: 0xffffff, beak: 0xffc31a, size: 0.6, gait: 'hop' },
        chick:   { type: 'bird', c1: 0xffe14d, c2: 0xfff4a0, beak: 0xff8c1a, size: 0.55, gait: 'hop' },
        duck:    { type: 'bird', c1: 0xffffff, c2: 0xf3f3f3, beak: 0xff8c1a, size: 0.78, gait: 'waddle', bill: true },
        owl:     { type: 'owl', c1: 0x8a6440, c2: 0xe8d2b0, beak: 0xe0a020, size: 0.78, gait: 'hop' },
    };

    // ---------- 四足動物 ----------
    function buildQuad(spec, root) {
        const rig = newRig('quad', root);
        rig.gait = spec.gait || 'walk';
        const chub = spec.chubby ? 1.12 : 1;
        const legLen = spec.chubby ? 0.34 : 0.42;
        rig.legLen = legLen;
        const bodyY = legLen + 0.3;
        rig.baseBodyY = bodyY;

        const body = pivot(rig.lift, [0, bodyY, 0]);
        rig.body = body;
        part('sphere', spec.c1, [0.48 * chub, 0.42 * chub, 0.6], [0, 0, 0], body);
        // 肚子
        part('sphere', spec.c2, [0.36 * chub, 0.3, 0.45], [0, -0.14, 0.08], body);

        // 條紋 / 斑點
        if (spec.stripes) {
            [-0.28, -0.08, 0.12].forEach(z => {
                part('sphere', spec.stripes, [0.49 * chub, 0.43 * chub, 0.045], [0, 0.02, z], body, { shadow: false });
            });
        }
        if (spec.spots) {
            [[0.3, 0.18, 0.1, 0.16], [-0.32, 0.12, -0.2, 0.14], [0.05, 0.36, -0.3, 0.13], [-0.2, 0.3, 0.25, 0.1], [0.36, -0.02, -0.32, 0.1]].forEach(s => {
                part('sphere', spec.spots, [s[3], s[3] * 0.8, s[3]], [s[0], s[1], s[2]], body, { shadow: false });
            });
        }
        if (spec.panda) {
            // 熊貓黑色肩帶
            part('sphere', 0x222222, [0.5 * chub, 0.44 * chub, 0.16], [0, 0.02, 0.22], body);
        }

        // 頭
        const head = pivot(body, [0, 0.3, 0.46]);
        rig.head = head;
        const hr = 0.4;
        part('sphere', spec.c1, [hr, hr * 0.92, hr * 0.9], [0, 0, 0], head);
        if (spec.mane) {
            part('sphere', spec.mane, [hr * 1.45, hr * 1.38, hr * 0.7], [0, 0.0, -0.12], head);
        }
        if (spec.stripes) {
            [-0.09, 0, 0.09].forEach(x => {
                part('box', spec.stripes, [0.035, 0.12, 0.05], [x, 0.3, 0.17], head, { rot: [-0.6, 0, x * 3], shadow: false });
            });
        }
        if (spec.panda) {
            [-1, 1].forEach(sd => part('sphere', 0x222222, [0.1, 0.13, 0.06], [0.15 * sd, 0.04, 0.31], head, { rot: [0, 0, 0.5 * sd], shadow: false }));
        }
        if (spec.snout === 'monkey') {
            part('sphere', spec.c2, [0.3, 0.3, 0.2], [0, -0.02, 0.22], head);
        }
        addEyes(head, 0.15, 0.05, 0.33, 0.065, rig);
        addCheeks(head, 0.25, -0.1, 0.28, 0.07);

        // 鼻吻部
        const sn = spec.snout;
        if (sn === 'dog' || sn === 'bear') {
            const big = sn === 'bear' ? 1.15 : 1;
            part('sphere', spec.c2, [0.17 * big, 0.13 * big, 0.13 * big], [0, -0.1, 0.33], head);
            part('sphere', 0x222222, [0.06, 0.045, 0.045], [0, -0.04, 0.46], head, { kind: 'eye' });
        } else if (sn === 'cat') {
            part('sphere', spec.c2, [0.14, 0.09, 0.08], [0, -0.11, 0.34], head);
            part('sphere', 0xff8fa5, [0.04, 0.03, 0.03], [0, -0.05, 0.4], head);
        } else if (sn === 'fox') {
            part('sphere', spec.c2, [0.14, 0.1, 0.2], [0, -0.11, 0.36], head);
            part('sphere', 0x222222, [0.045, 0.04, 0.04], [0, -0.07, 0.56], head, { kind: 'eye' });
        } else if (sn === 'mouse') {
            part('sphere', 0xff8fa5, [0.045, 0.04, 0.04], [0, -0.06, 0.4], head);
        } else if (sn === 'pig' || sn === 'cow') {
            const w = sn === 'cow' ? 0.2 : 0.13;
            const snout = part('cyl', spec.c2, [w, 0.1, w * 0.72], [0, -0.09, 0.37], head, { rot: [Math.PI / 2, 0, 0] });
            [-1, 1].forEach(sd => part('sphere', 0x7a3040, [0.025, 0.035, 0.02], [w * 0.4 * sd, -0.09, 0.42], head, { shadow: false }));
            snout.castShadow = false;
        } else if (sn === 'koala') {
            part('sphere', 0x2a2a2a, [0.08, 0.11, 0.06], [0, -0.04, 0.38], head, { kind: 'eye' });
        } else if (sn === 'monkey') {
            part('sphere', spec.c2, [0.15, 0.1, 0.1], [0, -0.13, 0.33], head);
            part('sphere', 0x5a3a2a, [0.03, 0.02, 0.02], [0, -0.1, 0.43], head);
        }

        // 耳朵
        const earC = spec.earC || spec.c1;
        const ear = spec.ear;
        if (ear === 'pointy' || ear === 'fox') {
            const big = ear === 'fox' ? 1.35 : 1;
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.2 * sd, 0.28, -0.02]);
                pv.rotation.z = -0.3 * sd;
                part('cone', earC, [0.12 * big, 0.24 * big, 0.08], [0, 0.1 * big, 0], pv);
                part('cone', 0xffb3c1, [0.07 * big, 0.16 * big, 0.04], [0, 0.08 * big, 0.04], pv, { shadow: false });
                rig.ears.push(pv);
            });
        } else if (ear === 'floppy') {
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.31 * sd, 0.22, -0.02]);
                pv.rotation.z = 0.25 * sd;
                part('sphere', earC, [0.1, 0.24, 0.15], [0.03 * sd, -0.18, 0], pv);
                rig.ears.push(pv);
            });
        } else if (ear === 'long') {
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.13 * sd, 0.3, -0.04]);
                pv.rotation.z = -0.15 * sd;
                part('sphere', earC, [0.09, 0.36, 0.06], [0, 0.3, 0], pv);
                part('sphere', spec.c2, [0.05, 0.27, 0.03], [0, 0.3, 0.035], pv, { shadow: false });
                rig.ears.push(pv);
            });
        } else if (ear === 'round') {
            const r = spec.earR || 0.12;
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.27 * sd, 0.28, -0.04]);
                part('sphere', earC, [r, r, r * 0.55], [0, 0, 0], pv);
                part('sphere', spec.earInner || (spec.panda ? 0x444444 : spec.c2), [r * 0.6, r * 0.6, r * 0.3], [0, 0, r * 0.3], pv, { shadow: false });
                rig.ears.push(pv);
            });
        } else if (ear === 'koala') {
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.34 * sd, 0.22, -0.04]);
                part('sphere', earC, [0.2, 0.19, 0.1], [0, 0, 0], pv);
                part('sphere', 0xf4f4f6, [0.13, 0.12, 0.06], [0, 0, 0.05], pv, { shadow: false });
                rig.ears.push(pv);
            });
        } else if (ear === 'side') {
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.4 * sd, 0.03, 0]);
                part('sphere', earC, [0.06, 0.12, 0.12], [0, 0, 0], pv);
                part('sphere', spec.c2, [0.03, 0.08, 0.08], [0.03 * sd, 0, 0], pv, { shadow: false });
                rig.ears.push(pv);
            });
        } else if (ear === 'cow') {
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.38 * sd, 0.14, -0.02]);
                part('sphere', earC, [0.18, 0.07, 0.1], [0.06 * sd, 0, 0], pv);
                rig.ears.push(pv);
                part('cone', 0xf3e2c0, [0.05, 0.14, 0.05], [0.15 * sd, 0.36, -0.02], head, { rot: [0, 0, -0.4 * sd] });
            });
        } else if (ear === 'pig') {
            [-1, 1].forEach(sd => {
                const pv = pivot(head, [0.2 * sd, 0.3, 0.02]);
                pv.rotation.x = 0.7;
                part('cone', earC, [0.1, 0.16, 0.06], [0, 0.06, 0], pv);
                rig.ears.push(pv);
            });
        }

        // 腳
        const legC = spec.legC || spec.c1;
        const lx = 0.25 * chub, lz = 0.3;
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
            const pv = pivot(rig.lift, [lx * sx, legLen, lz * sz]);
            part('sphere', legC, [0.12, legLen * 0.58, 0.12], [0, -legLen * 0.5, 0], pv);
            part('sphere', spec.panda ? 0x222222 : (spec.legC ? spec.legC : spec.c2), [0.12, 0.07, 0.15], [0, -legLen + 0.04, 0.03], pv);
            pv.userData.side = sx; pv.userData.front = sz;
            rig.legs.push(pv);
        });

        // 尾巴
        const tail = pivot(body, [0, 0.1, -0.56]);
        rig.tail = tail;
        const tc = spec.tailC || spec.c1;
        switch (spec.tail) {
            case 'wag':
                tail.rotation.x = -0.7;
                part('sphere', tc, [0.07, 0.2, 0.07], [0, 0.17, 0], tail);
                break;
            case 'long':
            case 'thin': {
                tail.rotation.x = -0.9;
                const th = spec.tail === 'thin' ? 0.035 : 0.06;
                part('sphere', tc, [th, 0.24, th], [0, 0.2, 0], tail);
                const seg = pivot(tail, [0, 0.4, 0]);
                seg.rotation.x = -0.7;
                part('sphere', spec.stripes || tc, [th * 0.9, 0.2, th * 0.9], [0, 0.16, 0], seg);
                break;
            }
            case 'bushy':
                tail.rotation.x = -1.0;
                part('sphere', tc, [0.17, 0.36, 0.17], [0, 0.3, 0], tail);
                part('sphere', 0xffffff, [0.11, 0.12, 0.11], [0, 0.62, 0], tail);
                break;
            case 'puff':
                part('sphere', 0xffffff, [0.13, 0.13, 0.13], [0, 0.02, 0], tail);
                break;
            case 'stub':
                part('sphere', tc, [0.08, 0.08, 0.08], [0, 0.04, 0], tail);
                break;
            case 'curly':
                part('torus', tc, [0.07, 0.07, 0.07], [0, 0.1, -0.02], tail, { rot: [0, Math.PI / 2, 0] });
                break;
            case 'tuft':
                tail.rotation.x = -2.4;
                part('sphere', tc, [0.04, 0.26, 0.04], [0, 0.24, 0], tail);
                part('sphere', spec.mane || 0x333333, [0.08, 0.1, 0.08], [0, 0.5, 0], tail);
                break;
        }
        return rig;
    }

    // ---------- 鳥類 (小鳥 / 小雞 / 小鴨) ----------
    function buildBird(spec, root) {
        const rig = newRig('bird', root);
        rig.gait = spec.gait;
        rig.legLen = 0.22;
        const bodyY = 0.5;
        rig.baseBodyY = bodyY;
        const body = pivot(rig.lift, [0, bodyY, 0]);
        rig.body = body;
        part('sphere', spec.c1, [0.36, 0.34, 0.42], [0, 0, 0], body);
        part('sphere', spec.c2, [0.27, 0.25, 0.3], [0, -0.07, 0.15], body, { shadow: false });
        // 尾羽
        part('cone', spec.c1, [0.14, 0.26, 0.06], [0, 0.1, -0.42], body, { rot: [-2.1, 0, 0] });

        const head = pivot(body, [0, 0.36, 0.18]);
        rig.head = head;
        part('sphere', spec.c1, [0.27, 0.26, 0.26], [0, 0, 0], head);
        addEyes(head, 0.11, 0.05, 0.22, 0.05, rig);
        addCheeks(head, 0.17, -0.06, 0.18, 0.05);
        if (spec.bill) {
            part('sphere', spec.beak, [0.12, 0.045, 0.15], [0, -0.05, 0.27], head);
        } else {
            part('cone', spec.beak, [0.07, 0.14, 0.07], [0, -0.03, 0.29], head, { rot: [Math.PI / 2, 0, 0] });
        }
        if (spec.c1 === 0xffe14d) {
            // 小雞頭頂呆毛
            part('sphere', spec.c1, [0.03, 0.09, 0.03], [0.02, 0.28, 0], head, { rot: [0, 0, -0.4] });
            part('sphere', spec.c1, [0.03, 0.07, 0.03], [-0.04, 0.26, 0], head, { rot: [0, 0, 0.5] });
        }
        [-1, 1].forEach(sd => {
            const w = pivot(body, [0.33 * sd, 0.06, -0.02]);
            part('sphere', spec.c1, [0.06, 0.2, 0.28], [0.02 * sd, -0.08, 0], w);
            w.userData.side = sd;
            rig.wings.push(w);
        });
        [-1, 1].forEach(sd => {
            const pv = pivot(rig.lift, [0.13 * sd, 0.24, 0.02]);
            part('cyl', spec.beak, [0.03, 0.22, 0.03], [0, -0.11, 0], pv);
            part('sphere', spec.beak, [0.08, 0.03, 0.11], [0, -0.22, 0.05], pv);
            pv.userData.side = sd; pv.userData.front = sd;
            rig.legs.push(pv);
        });
        return rig;
    }

    // ---------- 企鵝 ----------
    function buildPenguin(spec, root) {
        const rig = newRig('penguin', root);
        rig.gait = 'waddle';
        rig.legLen = 0.12;
        const bodyY = 0.62;
        rig.baseBodyY = bodyY;
        const body = pivot(rig.lift, [0, bodyY, 0]);
        rig.body = body;
        part('sphere', spec.c1, [0.4, 0.56, 0.38], [0, 0, 0], body);
        part('sphere', spec.c2, [0.3, 0.45, 0.25], [0, -0.06, 0.16], body, { shadow: false });
        const head = pivot(body, [0, 0.42, 0.02]);
        rig.head = head;
        part('sphere', spec.c1, [0.3, 0.28, 0.29], [0, 0, 0], head);
        part('sphere', spec.c2, [0.22, 0.18, 0.18], [0, -0.03, 0.14], head, { shadow: false });
        addEyes(head, 0.1, 0.04, 0.27, 0.05, rig);
        addCheeks(head, 0.17, -0.06, 0.22, 0.05);
        part('cone', spec.beak, [0.06, 0.13, 0.06], [0, -0.04, 0.33], head, { rot: [Math.PI / 2, 0, 0] });
        [-1, 1].forEach(sd => {
            const w = pivot(body, [0.38 * sd, 0.18, 0]);
            part('sphere', spec.c1, [0.07, 0.32, 0.16], [0.03 * sd, -0.25, 0], w);
            w.userData.side = sd;
            rig.wings.push(w);
        });
        [-1, 1].forEach(sd => {
            const pv = pivot(rig.lift, [0.15 * sd, 0.1, 0.05]);
            part('sphere', spec.beak, [0.12, 0.04, 0.17], [0, -0.07, 0.06], pv);
            pv.userData.side = sd; pv.userData.front = sd;
            rig.legs.push(pv);
        });
        return rig;
    }

    // ---------- 貓頭鷹 ----------
    function buildOwl(spec, root) {
        const rig = newRig('owl', root);
        rig.gait = 'hop';
        rig.legLen = 0.15;
        const bodyY = 0.55;
        rig.baseBodyY = bodyY;
        const body = pivot(rig.lift, [0, bodyY, 0]);
        rig.body = body;
        part('sphere', spec.c1, [0.42, 0.46, 0.4], [0, 0, 0], body);
        part('sphere', spec.c2, [0.3, 0.32, 0.25], [0, -0.1, 0.17], body, { shadow: false });
        const head = pivot(body, [0, 0.42, 0.02]);
        rig.head = head;
        part('sphere', spec.c1, [0.38, 0.33, 0.34], [0, 0, 0], head);
        // 臉盤 + 大眼睛
        [-1, 1].forEach(sd => {
            part('sphere', spec.c2, [0.15, 0.15, 0.08], [0.14 * sd, 0.02, 0.27], head, { shadow: false });
            const eye = part('sphere', 0x1a1a1a, [0.075, 0.075, 0.05], [0.14 * sd, 0.03, 0.33], head, { kind: 'eye', shadow: false });
            part('sphere', 0xffffff, [0.3, 0.3, 0.3], [0.3, 0.35, 0.75], eye, { kind: 'basic', shadow: false });
            rig.eyes.push(eye);
            const tuft = pivot(head, [0.22 * sd, 0.26, 0]);
            tuft.rotation.z = -0.5 * sd;
            part('cone', spec.c1, [0.07, 0.18, 0.05], [0, 0.07, 0], tuft);
            rig.ears.push(tuft);
        });
        part('cone', spec.beak, [0.04, 0.1, 0.04], [0, -0.07, 0.34], head, { rot: [2.6, 0, 0] });
        [-1, 1].forEach(sd => {
            const w = pivot(body, [0.38 * sd, 0.12, -0.02]);
            part('sphere', 0x6e4c30, [0.07, 0.3, 0.24], [0.03 * sd, -0.15, 0], w);
            w.userData.side = sd;
            rig.wings.push(w);
        });
        [-1, 1].forEach(sd => {
            const pv = pivot(rig.lift, [0.14 * sd, 0.14, 0.08]);
            part('sphere', spec.beak, [0.08, 0.06, 0.1], [0, -0.1, 0.02], pv);
            pv.userData.side = sd; pv.userData.front = sd;
            rig.legs.push(pv);
        });
        return rig;
    }

    // ---------- 青蛙 ----------
    function buildFrog(spec, root) {
        const rig = newRig('frog', root);
        rig.gait = 'hop';
        rig.legLen = 0.15;
        const bodyY = 0.32;
        rig.baseBodyY = bodyY;
        const body = pivot(rig.lift, [0, bodyY, 0]);
        rig.body = body;
        body.rotation.x = -0.2;
        part('sphere', spec.c1, [0.45, 0.3, 0.48], [0, 0, 0], body);
        part('sphere', spec.c2, [0.36, 0.2, 0.38], [0, -0.1, 0.08], body, { shadow: false });
        const head = pivot(body, [0, 0.12, 0.3]);
        rig.head = head;
        // 嘴巴
        part('halfTorus', 0x2f6b20, [0.22, 0.12, 0.12], [0, -0.04, 0.16], head, { rot: [0, 0, Math.PI], shadow: false });
        [-1, 1].forEach(sd => {
            part('sphere', spec.c1, [0.15, 0.14, 0.15], [0.18 * sd, 0.14, 0], head);
            const eye = part('sphere', 0x1a1a1a, [0.075, 0.075, 0.06], [0.19 * sd, 0.18, 0.11], head, { kind: 'eye', shadow: false });
            part('sphere', 0xffffff, [0.33, 0.33, 0.33], [0.3, 0.35, 0.75], eye, { kind: 'basic', shadow: false });
            rig.eyes.push(eye);
        });
        addCheeks(head, 0.3, 0.0, 0.08, 0.06);
        // 前腳 + 摺疊後腿
        [-1, 1].forEach(sd => {
            const pv = pivot(rig.lift, [0.25 * sd, 0.2, 0.25]);
            part('sphere', spec.c1, [0.07, 0.14, 0.07], [0, -0.1, 0], pv);
            part('sphere', spec.c1, [0.1, 0.03, 0.12], [0, -0.19, 0.04], pv);
            pv.userData.side = sd; pv.userData.front = 1;
            rig.legs.push(pv);
        });
        [-1, 1].forEach(sd => {
            const pv = pivot(rig.lift, [0.33 * sd, 0.2, -0.2]);
            part('sphere', spec.c1, [0.13, 0.12, 0.28], [0, -0.06, 0], pv);
            part('sphere', spec.c1, [0.12, 0.03, 0.16], [0.02 * sd, -0.17, 0.12], pv);
            pv.userData.side = sd; pv.userData.front = -1;
            rig.legs.push(pv);
        });
        return rig;
    }

    // 稀有顏色 (寶寶出生時有機會出現)
    const VARIANTS = {
        gold: { tint: 0xffc93c, amt: 0.62, kind: 'goldfur', name: '金色', icon: '🌟' },
        pink: { tint: 0xff9ec7, amt: 0.55, kind: 'fur', name: '櫻花粉', icon: '🌸' },
        mint: { tint: 0x8ff0c8, amt: 0.55, kind: 'fur', name: '薄荷綠', icon: '🍃' },
    };
    function applyVariant(root, variant) {
        const v = VARIANTS[variant];
        if (!v) return;
        const tint = new THREE.Color(v.tint);
        root.traverse(o => {
            if (!o.isMesh || !o.material || !(o.material.sheen > 0)) return; // 只換毛色，眼睛不變
            const c = o.material.color.clone().lerp(tint, v.amt);
            o.material = mat(c.getHex(), v.kind);
        });
    }

    function buildPet(speciesId, variant) {
        const spec = SPECS[speciesId] || SPECS.dog;
        const root = new THREE.Group();
        let rig;
        if (spec.type === 'bird') rig = buildBird(spec, root);
        else if (spec.type === 'penguin') rig = buildPenguin(spec, root);
        else if (spec.type === 'owl') rig = buildOwl(spec, root);
        else if (spec.type === 'frog') rig = buildFrog(spec, root);
        else rig = buildQuad(spec, root);
        convertMaterials(root, 'fur');
        rig.size = spec.size;
        if (variant) applyVariant(root, variant);
        root.userData.rig = rig;
        return root;
    }

    // =========================================================
    //  小朋友 (主人)
    // =========================================================
    const KID_SPECS = {
        boy_cute:       { skin: 0xffdcb8, hair: 0x6b3f1f, style: 'short',    shirt: 0x4aa3ff, pants: 0x2f4f8f, scale: 0.85 },
        girl_cute:      { skin: 0xffdcb8, hair: 0x2a1a12, style: 'pigtails', shirt: 0xff8fc0, dress: 0xff8fc0, pants: 0xffdcb8, scale: 0.85 },
        boy_handsome:   { skin: 0xf3c9a0, hair: 0x1f1a17, style: 'spiky',    shirt: 0x3fbf7f, pants: 0x39424e, scale: 1.0 },
        girl_beautiful: { skin: 0xffe0c4, hair: 0x4a2a14, style: 'long',     shirt: 0xb07cff, dress: 0xb07cff, pants: 0xffe0c4, scale: 1.0 },
        boy_tall:       { skin: 0xe9b98e, hair: 0x3b2a1a, style: 'short',    shirt: 0x8c96a8, pants: 0x2b2b38, scale: 1.15 },
        girl_tall:      { skin: 0xffe0c4, hair: 0xd2552a, style: 'long',     shirt: 0xffc93c, dress: 0xffc93c, pants: 0xffe0c4, scale: 1.15 },
        kid_short:      { skin: 0xffdcb8, hair: 0x7a4a22, style: 'bowl',     shirt: 0xff9a3c, pants: 0x5a6b3a, scale: 0.72 },
        kid_cool:       { skin: 0xf0c49a, hair: 0x222222, style: 'cap',      shirt: 0x2b2b2b, pants: 0x4a5a7a, scale: 0.92, shades: true },
        // 小吃店店員
        chef:           { skin: 0xffdcb8, hair: 0x5a3a1a, style: 'short',    shirt: 0xffffff, pants: 0x37474f, scale: 1.05, chefHat: true, apron: 0xff6b9a },
    };

    function buildKid(kidId) {
        const k = KID_SPECS[kidId] || KID_SPECS.boy_cute;
        const root = new THREE.Group();
        const rig = newRig('kid', root);
        rig.legLen = 0.55;
        rig.baseBodyY = 0.92;
        const s = new THREE.Group();
        rig.lift.add(s);

        // 腿
        [-1, 1].forEach(sd => {
            const pv = pivot(s, [0.12 * sd, 0.6, 0]);
            part('sphere', k.dress ? k.skin : k.pants, [0.09, 0.3, 0.09], [0, -0.28, 0], pv);
            part('sphere', 0x5a3a2a, [0.1, 0.07, 0.15], [0, -0.56, 0.04], pv);
            pv.userData.side = sd; pv.userData.front = sd;
            rig.legs.push(pv);
        });
        const body = pivot(s, [0, 0.92, 0]);
        rig.body = body;
        part('sphere', k.shirt, [0.25, 0.32, 0.19], [0, 0, 0], body);
        if (k.dress) {
            part('cone', k.dress, [0.38, 0.45, 0.3], [0, -0.28, 0], body);
        } else {
            part('sphere', k.pants, [0.24, 0.14, 0.18], [0, -0.24, 0], body);
        }
        // 手
        [-1, 1].forEach(sd => {
            const pv = pivot(body, [0.29 * sd, 0.18, 0]);
            pv.rotation.z = 0.15 * sd;
            part('sphere', k.shirt, [0.08, 0.22, 0.08], [0, -0.18, 0], pv);
            part('sphere', k.skin, [0.07, 0.07, 0.07], [0, -0.4, 0], pv);
            pv.userData.side = sd;
            rig.arms.push(pv);
        });
        // 頭
        const head = pivot(body, [0, 0.58, 0.02]);
        rig.head = head;
        part('sphere', k.skin, [0.3, 0.3, 0.28], [0, 0, 0], head);
        addEyes(head, 0.1, 0.0, 0.25, 0.042, rig);
        addCheeks(head, 0.17, -0.08, 0.22, 0.05);
        part('halfTorus', 0xc0504d, [0.06, 0.05, 0.05], [0, -0.1, 0.27], head, { rot: [0, 0, Math.PI], shadow: false });
        // 耳朵
        [-1, 1].forEach(sd => part('sphere', k.skin, [0.05, 0.08, 0.05], [0.29 * sd, 0, 0], head));

        // 頭髮
        const hc = k.hair;
        if (k.style !== 'cap') {
            part('sphere', hc, [0.32, 0.25, 0.3], [0, 0.1, -0.03], head);
            part('sphere', hc, [0.25, 0.08, 0.12], [0, 0.2, 0.18], head, { rot: [0.4, 0, 0] });
        }
        if (k.style === 'spiky') {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                part('cone', hc, [0.07, 0.2, 0.07], [Math.cos(a) * 0.14, 0.3, Math.sin(a) * 0.14 - 0.03], head, { rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
            }
        } else if (k.style === 'long') {
            part('sphere', hc, [0.31, 0.42, 0.16], [0, -0.15, -0.17], head);
            [-1, 1].forEach(sd => part('sphere', hc, [0.08, 0.3, 0.1], [0.27 * sd, -0.12, -0.02], head));
        } else if (k.style === 'pigtails') {
            [-1, 1].forEach(sd => {
                part('sphere', hc, [0.12, 0.16, 0.12], [0.35 * sd, -0.02, -0.08], head);
                part('sphere', 0xff4f8b, [0.05, 0.05, 0.05], [0.27 * sd, 0.06, -0.06], head);
            });
        } else if (k.style === 'bowl') {
            part('sphere', hc, [0.34, 0.24, 0.32], [0, 0.07, -0.01], head);
        } else if (k.style === 'cap') {
            part('sphere', hc, [0.31, 0.2, 0.3], [0, 0.04, -0.05], head);
            part('sphere', 0xe23b3b, [0.32, 0.2, 0.31], [0, 0.14, -0.01], head);
            part('box', 0xe23b3b, [0.3, 0.03, 0.22], [0, 0.13, 0.3], head);
        }
        if (k.chefHat) {
            part('cyl', 0xffffff, [0.24, 0.28, 0.24], [0, 0.32, -0.02], head);
            part('sphere', 0xffffff, [0.34, 0.2, 0.34], [0, 0.52, -0.02], head);
        }
        if (k.apron) {
            part('box', k.apron, [0.36, 0.42, 0.04], [0, -0.1, 0.19], body);
            part('box', k.apron, [0.4, 0.05, 0.3], [0, 0.0, 0], body);
        }
        if (k.shades) {
            [-1, 1].forEach(sd => part('box', 0x111111, [0.13, 0.08, 0.03], [0.1 * sd, 0.01, 0.29], head, { kind: 'eye' }));
            part('box', 0x111111, [0.08, 0.02, 0.02], [0, 0.03, 0.29], head);
        }
        convertMaterials(root, 'fur');
        root.scale.setScalar(k.scale * 1.1);
        root.userData.rig = rig;
        return root;
    }

    // =========================================================
    //  送貨大鳥 (老鷹)
    // =========================================================
    function buildEagle() {
        const root = new THREE.Group();
        const rig = newRig('eagle', root);
        const body = pivot(rig.lift, [0, 0, 0]);
        rig.body = body;
        part('sphere', 0x7a4a24, [0.6, 0.5, 1.0], [0, 0, 0], body);
        part('sphere', 0xc28a52, [0.42, 0.34, 0.7], [0, -0.16, 0.1], body, { shadow: false });
        const head = pivot(body, [0, 0.35, 0.9]);
        part('sphere', 0xffffff, [0.42, 0.4, 0.42], [0, 0, 0], head);
        addEyes(head, 0.17, 0.08, 0.33, 0.07, rig);
        part('cone', 0xffc21a, [0.14, 0.38, 0.14], [0, -0.06, 0.52], head, { rot: [Math.PI / 2 + 0.3, 0, 0] });
        // 尾羽
        part('sphere', 0xffffff, [0.5, 0.08, 0.5], [0, 0.05, -1.1], body);
        [-1, 1].forEach(sd => {
            const w = pivot(body, [0.45 * sd, 0.15, 0]);
            part('sphere', 0x6a3e1c, [1.5, 0.09, 0.6], [1.4 * sd, 0, -0.05], w);
            part('sphere', 0x4e2c12, [0.6, 0.07, 0.4], [2.6 * sd, 0, -0.15], w);
            w.userData.side = sd;
            rig.wings.push(w);
        });
        convertMaterials(root, 'fur');
        root.userData.rig = rig;
        return root;
    }

    // =========================================================
    //  動畫：依姿勢平滑驅動骨架
    //  pose: idle | walk | run | sleep | eat | happy | hop | sit | poop | ride | wave
    // =========================================================
    function lerpTo(rig, key, target, k) {
        const c = rig.cur[key];
        rig.cur[key] = (c === undefined) ? target : c + (target - c) * k;
        return rig.cur[key];
    }

    function animateRig(rig, pose, dt, moveSpeed) {
        rig.t += dt;
        const t = rig.t;
        const k = 1 - Math.exp(-12 * dt);
        const isQuad = rig.type === 'quad';
        const isKid = rig.type === 'kid';
        const moving = pose === 'walk' || pose === 'run';
        const cadence = isKid ? 7 : (rig.type === 'quad' ? 9 : 11);
        if (moving) rig.phase += dt * cadence * (pose === 'run' ? 1.5 : 1) * Math.max(0.6, Math.min(1.6, moveSpeed / 2));
        const ph = rig.phase;

        let liftY = 0, bodyY = rig.baseBodyY, bodyRX = 0, bodyRZ = 0;
        let headRX = 0, headRY = 0, headRZ = 0, tailY = 0, tailX = 0;
        let wing = 0, eyeY = 1, legSwing = 0, legTuck = 0, earFlop = 0, armZ = 0, armX = 0;

        // 呼吸
        const breathe = Math.sin(t * 2.2) * 0.012;

        if (moving) {
            const hopGait = rig.gait === 'hop' && !isKid;
            if (hopGait) {
                const hp = Math.abs(Math.sin(ph * 0.5));
                liftY = hp * 0.32;
                legTuck = hp * 0.6;
                bodyRX = -Math.cos(ph * 0.5) * 0.15;
                wing = hp * 0.6;
                earFlop = hp * 0.3;
            } else if (rig.gait === 'waddle') {
                bodyRZ = Math.sin(ph) * 0.18;
                legSwing = Math.sin(ph) * 0.5;
                liftY = Math.abs(Math.sin(ph)) * 0.04;
                wing = 0.25 + Math.abs(Math.sin(ph)) * 0.2;
            } else {
                legSwing = Math.sin(ph) * (isKid ? 0.7 : 0.75);
                liftY = Math.abs(Math.sin(ph)) * (isKid ? 0.05 : 0.06);
                bodyRX = isKid ? 0.05 : 0;
                earFlop = Math.sin(ph) * 0.2;
                armX = -legSwing;
            }
            tailY = Math.sin(ph * 1.2) * 0.4;
            headRX = Math.sin(ph * 2) * 0.04;
        } else if (pose === 'sleep') {
            bodyY = rig.baseBodyY - rig.legLen * (isQuad ? 0.8 : 0.5);
            legTuck = isQuad ? 1.35 : 0;
            headRX = 0.35; headRZ = 0.35;
            eyeY = 0.12;
            tailY = 0.6; earFlop = 0.4;
            bodyRX = 0;
            liftY = Math.sin(t * 1.4) * 0.01;
            if (isKid) { bodyY = rig.baseBodyY - 0.3; legTuck = 1.4; }
        } else if (pose === 'eat' || pose === 'drink') {
            headRX = 0.55 + Math.sin(t * 9) * 0.12;
            if (!isQuad && !isKid) { bodyRX = 0.35 + Math.sin(t * 9) * 0.1; headRX = 0.3; }
            tailY = Math.sin(t * 8) * 0.5;
        } else if (pose === 'happy') {
            liftY = Math.abs(Math.sin(t * 9)) * 0.12;
            bodyRZ = Math.sin(t * 9) * 0.12;
            tailY = Math.sin(t * 18) * 0.8;
            headRZ = Math.sin(t * 4.5) * 0.2;
            wing = Math.abs(Math.sin(t * 14)) * 1.0;
            earFlop = Math.sin(t * 9) * 0.3;
            armZ = 2.6; armX = 0;
        } else if (pose === 'hop') {
            // 原地跳 (由遊戲決定高度，這裡處理四肢)
            legTuck = 0.7;
            wing = 1.0;
            tailY = Math.sin(t * 16) * 0.8;
            armZ = 2.8;
        } else if (pose === 'sit' || pose === 'ride' || pose === 'benchsit' || pose === 'swing') {
            if (isKid) {
                // 小朋友坐下：身體不動，雙腿往前伸 (遊戲會把整個人放到座位高度)
                legTuck = -1.45;
                bodyRX = -0.08;
                headRY = Math.sin(t * 0.6) * 0.25;
                if (pose === 'ride') armZ = 2.4 + Math.sin(t * 3) * 0.3;
                else if (pose === 'swing') { armZ = 2.9; legTuck = -1.45 + Math.sin(t * 1.95) * 0.35; }
                else { armZ = 0.3; }
            } else {
                bodyY = rig.baseBodyY - rig.legLen * 0.5;
                legTuck = 1.1;
                headRY = Math.sin(t * 0.8) * 0.3;
                tailY = Math.sin(t * 3) * 0.3;
                if (pose === 'ride' || pose === 'swing') wing = 0.3;
            }
        } else if (pose === 'bedsleep') {
            // 躺在床上睡覺 (整個人由遊戲轉成平躺)：閉眼、手放兩側、慢慢呼吸
            eyeY = 0.1;
            headRX = -0.05;
            liftY = 0;
        } else if (pose === 'poop') {
            bodyY = rig.baseBodyY - rig.legLen * 0.4;
            bodyRX = -0.25;
            tailX = -0.8;
            eyeY = 0.3 + Math.abs(Math.sin(t * 2)) * 0.3;
        } else {
            // idle：東張西望
            headRY = Math.sin(t * 0.7) * 0.35 + Math.sin(t * 1.9) * 0.1;
            headRX = Math.sin(t * 0.5) * 0.08;
            tailY = Math.sin(t * 3) * 0.3;
            // 偶爾眨眼
            if ((t % 3.7) < 0.12) eyeY = 0.15;
        }

        // 套用 (平滑)
        rig.lift.position.y = lerpTo(rig, 'lift', liftY, moving || pose === 'happy' ? 1 : k);
        if (rig.body) {
            rig.body.position.y = lerpTo(rig, 'by', bodyY + breathe, k);
            rig.body.rotation.x = lerpTo(rig, 'brx', bodyRX, k);
            rig.body.rotation.z = lerpTo(rig, 'brz', bodyRZ, moving ? 1 : k);
            const bs = 1 + breathe * 2;
            if (!isKid) rig.body.scale.set(1, bs, 1);
        }
        if (rig.head) {
            rig.head.rotation.x = lerpTo(rig, 'hrx', headRX, k);
            rig.head.rotation.y = lerpTo(rig, 'hry', headRY, k);
            rig.head.rotation.z = lerpTo(rig, 'hrz', headRZ, k);
        }
        rig.legs.forEach((leg, i) => {
            let rx;
            if (isQuad) {
                // 對角步態
                const diag = (leg.userData.side * leg.userData.front) > 0 ? 1 : -1;
                rx = legSwing * diag - legTuck * leg.userData.front;
            } else if (isKid) {
                rx = legSwing * leg.userData.side + legTuck;
            } else {
                rx = legSwing * leg.userData.side - legTuck * 0.5;
            }
            leg.rotation.x = lerpTo(rig, 'leg' + i, rx, moving ? 1 : k);
        });
        rig.arms.forEach((arm, i) => {
            arm.rotation.x = lerpTo(rig, 'arx' + i, armX * arm.userData.side * 0.8, moving ? 1 : k);
            const z = (armZ ? armZ + Math.sin(t * 10 + i) * 0.15 : 0.15) * arm.userData.side;
            arm.rotation.z = lerpTo(rig, 'arz' + i, z, k);
        });
        if (rig.tail) {
            if (rig.tail.userData.baseX === undefined) rig.tail.userData.baseX = rig.tail.rotation.x;
            rig.tail.rotation.y = tailY;
            rig.tail.rotation.x = lerpTo(rig, 'tx', rig.tail.userData.baseX + tailX, k);
        }
        rig.wings.forEach((w, i) => {
            const flap = rig.type === 'eagle' ? Math.sin(t * (pose === 'hover' ? 9 : 5)) * 0.55 : wing;
            w.rotation.z = lerpTo(rig, 'w' + i, -flap * w.userData.side, rig.type === 'eagle' ? 1 : k);
        });
        rig.ears.forEach((e, i) => {
            if (e.userData.baseZ === undefined) e.userData.baseZ = e.rotation.z;
            e.rotation.z = e.userData.baseZ + earFlop * (i % 2 ? 1 : -1) * 0.5;
        });
        const ey = lerpTo(rig, 'eye', eyeY, pose === 'sleep' ? k * 0.5 : 1);
        rig.eyes.forEach(e => {
            if (e.userData.baseSY === undefined) e.userData.baseSY = e.scale.y;
            e.scale.y = e.userData.baseSY * ey;
        });
    }

    // =========================================================
    //  小主人的配件：雨傘、點心、氣球
    // =========================================================
    function buildUmbrella() {
        const g = new THREE.Group();
        part('cyl', 0x444444, [0.025, 1.5, 0.025], [0, 0.75, 0], g, { kind: 'metal' });
        part('halfTorus', 0x444444, [0.08, 0.08, 0.3], [0.08, 0, 0], g, { rot: [0, 0, Math.PI], kind: 'metal' });
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.42, 8, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
        canopy.position.y = 1.55;
        canopy.castShadow = true;
        g.add(canopy);
        // 彩色條紋
        for (let i = 0; i < 8; i += 2) {
            const seg = new THREE.Mesh(new THREE.ConeGeometry(0.96, 0.43, 8, 1, true, i * Math.PI / 4, Math.PI / 4), new THREE.MeshPhysicalMaterial({ color: 0xff6b9a, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
            seg.position.y = 1.55;
            g.add(seg);
        }
        part('sphere', 0xff6b9a, [0.05, 0.05, 0.05], [0, 1.78, 0], g, { kind: 'plastic' });
        return g;
    }
    // =========================================================
    //  寵物配件：蝴蝶結、帽子、皇冠、圍巾、太陽眼鏡
    //  依每種動物頭的大小與眼睛位置自動對齊
    // =========================================================
    function headInfo(rig) {
        if (rig.headInfo) return rig.headInfo;
        let top = 0.3, r = 0.28;
        rig.head.children.forEach(c => {
            if (c.isMesh && Math.abs(c.position.x) < 0.05 && Math.abs(c.position.z) < 0.25) {
                top = Math.max(top, c.position.y + c.scale.y);
                r = Math.max(r, c.scale.x);
            }
        });
        const e = rig.eyes.find(m => m.parent === rig.head && m.position.x > 0) || rig.eyes[0];
        const eye = e && e.parent === rig.head
            ? { x: Math.abs(e.position.x), y: e.position.y, z: e.position.z, s: e.scale.x }
            : { x: r * 0.38, y: 0.05, z: r * 0.85, s: 0.06 };
        rig.headInfo = { top, r: Math.min(r, 0.5), eye };
        return rig.headInfo;
    }
    const ACCESSORIES = {
        bow: { name: '蝴蝶結', icon: '🎀' },
        hat: { name: '紳士帽', icon: '🎩' },
        crown: { name: '小皇冠', icon: '👑' },
        scarf: { name: '圍巾', icon: '🧣' },
        glasses: { name: '太陽眼鏡', icon: '🕶️' },
    };
    function buildAccessory(type, rig) {
        const H = headInfo(rig);
        const r = H.r, top = H.top;
        const g = new THREE.Group();
        if (type === 'bow') {
            g.position.set(r * 0.5, top - r * 0.12, 0.04);
            g.rotation.z = -0.4;
            [-1, 1].forEach(sd => part('cone', 0xff4f8b, [r * 0.28, r * 0.42, r * 0.16], [sd * r * 0.2, 0, 0], g, { rot: [0, 0, sd * Math.PI / 2], kind: 'plastic' }));
            part('sphere', 0xff8fb7, [r * 0.12, r * 0.12, r * 0.12], [0, 0, 0], g, { kind: 'plastic' });
        } else if (type === 'hat') {
            g.position.set(0, top - r * 0.08, -0.02);
            g.rotation.z = 0.12;
            part('cyl', 0x2b2b38, [r * 0.78, 0.03, r * 0.78], [0, 0, 0], g, { kind: 'plastic' });
            part('cyl', 0x2b2b38, [r * 0.46, r * 0.62, r * 0.46], [0, r * 0.31, 0], g, { kind: 'plastic' });
            part('cyl', 0xe53935, [r * 0.47, r * 0.12, r * 0.47], [0, r * 0.1, 0], g, { kind: 'plastic' });
        } else if (type === 'crown') {
            g.position.set(0, top - r * 0.1, 0);
            const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.52, r * 0.26, 18, 1, true), mat(0xffc93c, 'metal'));
            band.material.side = THREE.DoubleSide;
            band.position.y = r * 0.13;
            band.castShadow = true;
            g.add(band);
            for (let i = 0; i < 5; i++) {
                const a = i / 5 * Math.PI * 2;
                part('cone', 0xffc93c, [r * 0.11, r * 0.24, r * 0.11], [Math.cos(a) * r * 0.5, r * 0.36, Math.sin(a) * r * 0.5], g, { kind: 'metal' });
                part('sphere', [0xff3b6b, 0x3ba7ff, 0x3fdc8a][i % 3], [r * 0.06, r * 0.06, r * 0.06], [Math.cos(a) * r * 0.52, r * 0.13, Math.sin(a) * r * 0.52], g, { kind: 'eye', shadow: false });
            }
        } else if (type === 'scarf') {
            // 圍巾套在脖子 (身體和頭之間)，大小依身體寬度計算
            const hp = rig.head.position;
            const neck = hp.clone().multiplyScalar(0.62);
            const main = rig.body.children.find(c => c.isMesh);
            const sx = main ? main.scale.x : 0.4, sy = main ? main.scale.y : 0.4, sz = main ? main.scale.z : 0.4;
            const k = Math.max(0.25, 1 - (neck.y / sy) ** 2 - (neck.z / sz) ** 2);
            const R = Math.max(r * 0.6, sx * Math.sqrt(k) + 0.03);
            g.position.copy(neck);
            g.rotation.x = Math.atan2(hp.z, hp.y);
            g.userData.onBody = true;
            part('torus', 0xe53935, [R, R, R * 0.9], [0, 0, 0], g, { rot: [Math.PI / 2, 0, 0], kind: 'fur' });
            [-1, 1].forEach((sd, i) => part('box', i ? 0xffffff : 0xe53935, [R * 0.22, R * 0.6, R * 0.1], [R * 0.35 + sd * R * 0.12, -R * 0.35, R * 0.95], g, { rot: [0.25, 0, 0.12], kind: 'fur' }));
        } else if (type === 'glasses') {
            const e = H.eye;
            const lr = Math.max(0.05, e.s * 1.5);
            g.position.set(0, e.y, e.z + lr * 0.35);
            [-1, 1].forEach(sd => {
                const lens = part('cyl', 0x111111, [lr, 0.02, lr], [sd * e.x, 0, 0], g, { rot: [Math.PI / 2, 0, 0], kind: 'eye' });
                lens.castShadow = false;
            });
            part('box', 0x111111, [e.x * 2 - lr * 1.6, 0.02, 0.02], [0, lr * 0.3, 0], g, { kind: 'eye', shadow: false });
        }
        g.userData.accessory = type;
        return g;
    }
    // 換上 / 拿掉配件 (type = null 代表脫下)
    function setAccessory(root, type) {
        const rig = root.userData.rig;
        if (rig.accessory) { rig.accessory.parent.remove(rig.accessory); rig.accessory = null; }
        if (!type || !ACCESSORIES[type]) return;
        const a = buildAccessory(type, rig);
        (a.userData.onBody ? rig.body : rig.head).add(a);
        rig.accessory = a;
    }

    // 玩具：網球 / 飛盤
    function buildToy(type) {
        const g = new THREE.Group();
        if (type === 'frisbee') {
            const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.06, 24), mat(0xff4d6d, 'plastic'));
            disc.castShadow = true;
            g.add(disc);
            part('torus', 0xffffff, [0.26, 0.26, 0.12], [0, 0.035, 0], g, { rot: [Math.PI / 2, 0, 0], kind: 'plastic', shadow: false });
            part('cyl', 0xffd23f, [0.1, 0.07, 0.1], [0, 0.01, 0], g, { kind: 'plastic', shadow: false });
        } else {
            part('sphere', 0xd4f53c, [0.17, 0.17, 0.17], [0, 0, 0], g, { kind: 'fur' });
            part('torus', 0xffffff, [0.165, 0.165, 0.06], [0, 0, 0], g, { rot: [0.5, 0.3, 0], kind: 'plastic', shadow: false });
        }
        return g;
    }

    function buildHeldItem(type) {
        const g = new THREE.Group();
        if (type === 'icecream') {
            part('cone', 0xe8b070, [0.09, 0.26, 0.09], [0, 0.0, 0], g, { rot: [Math.PI, 0, 0], kind: 'wood' });
            part('sphere', 0xffb3c7, [0.1, 0.09, 0.1], [0, 0.16, 0], g, { kind: 'plastic' });
            part('sphere', 0xfff3b0, [0.085, 0.08, 0.085], [0, 0.26, 0], g, { kind: 'plastic' });
            part('sphere', 0xff3b3b, [0.03, 0.03, 0.03], [0, 0.34, 0], g, { kind: 'plastic' });
        } else if (type === 'lollipop') {
            part('cyl', 0xffffff, [0.012, 0.32, 0.012], [0, 0.08, 0], g, { kind: 'plastic' });
            part('cyl', 0xff6bd5, [0.15, 0.04, 0.15], [0, 0.3, 0], g, { rot: [Math.PI / 2, 0, 0], kind: 'plastic' });
            part('torus', 0xffffff, [0.08, 0.08, 0.15], [0, 0.3, 0.02], g, { kind: 'plastic', shadow: false });
        } else if (type === 'juice') {
            part('box', 0xffa31a, [0.13, 0.2, 0.09], [0, 0.05, 0], g, { kind: 'plastic' });
            part('box', 0x7ed957, [0.135, 0.06, 0.095], [0, 0.04, 0], g, { kind: 'plastic' });
            part('cyl', 0xffffff, [0.01, 0.12, 0.01], [0.03, 0.2, 0], g, { rot: [0, 0, -0.3], kind: 'plastic' });
        } else if (type === 'hotdog') {
            part('sphere', 0xe8b070, [0.07, 0.06, 0.18], [0, 0.05, 0], g, { kind: 'wood' });
            part('sphere', 0xc0392b, [0.04, 0.04, 0.2], [0, 0.09, 0], g, { kind: 'plastic' });
            part('box', 0xffd23f, [0.015, 0.01, 0.3], [0, 0.13, 0], g, { kind: 'plastic', shadow: false });
        } else if (type === 'balloon') {
            // 氣球：線 + 球 (球會在上方飄)
            const str = part('cyl', 0xffffff, [0.006, 1.6, 0.006], [0, 0.8, 0], g, { shadow: false });
            str.userData.string = true;
            const ball = new THREE.Group();
            ball.position.y = 1.75;
            const c = [0xff4d6d, 0x6ec6ff, 0xffd23f, 0x7ed957, 0xb388ff][Math.floor(Math.random() * 5)];
            part('sphere', c, [0.3, 0.36, 0.3], [0, 0, 0], ball, { kind: 'plastic' });
            part('cone', c, [0.05, 0.07, 0.05], [0, -0.38, 0], ball, { rot: [Math.PI, 0, 0], kind: 'plastic' });
            part('sphere', 0xffffff, [0.06, 0.09, 0.03], [-0.12, 0.14, 0.24], ball, { kind: 'basic', shadow: false });
            g.add(ball);
            g.userData.ball = ball;
        }
        return g;
    }

    window.PetModels = { SPECS, KID_SPECS, VARIANTS, ACCESSORIES, setAccessory, buildPet, buildKid, buildEagle, buildUmbrella, buildHeldItem, buildToy, animateRig, part, pivot, mat, convertMaterials, G };
})();
