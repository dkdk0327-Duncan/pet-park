// =============================================================
//  寵物樂園 － 玩家 (每個人有自己的存檔，進度不會混在一起)
//  localStorage:
//    petProfiles        → { list: [{ id, name, icon }], cur: id }
//    petGameSave:<id>   → 這個玩家的存檔
//  舊版只有一個存檔 (petGameSave)，第一次會自動變成「玩家1」
// =============================================================
(function () {
    'use strict';
    const KEY = 'petProfiles';
    const LEGACY = 'petGameSave';
    const ICONS = ['👧', '👦', '🧒', '👩', '👨', '👵', '👴', '🐱', '🐶', '🦄', '🐼', '🌟'];

    const ls = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    };
    let data = null;
    function load() {
        if (data) return data;
        try { data = JSON.parse(ls.get(KEY) || 'null'); } catch (e) { data = null; }
        if (!data || !Array.isArray(data.list)) data = { list: [], cur: null };
        // 舊存檔 → 玩家1
        const legacy = ls.get(LEGACY);
        if (legacy && !data.list.length) {
            const p = { id: 'p' + Date.now().toString(36), name: '玩家1', icon: '🧒' };
            data.list.push(p);
            data.cur = p.id;
            ls.set(LEGACY + ':' + p.id, legacy);
            ls.set(LEGACY + '_backup', legacy);   // 留一份備份
            ls.del(LEGACY);
            persist();
        }
        if (data.cur && !data.list.some(p => p.id === data.cur)) data.cur = data.list.length ? data.list[0].id : null;
        return data;
    }
    function persist() { ls.set(KEY, JSON.stringify(data)); }
    const clean = name => String(name || '').replace(/[<>&"]/g, '').trim().slice(0, 10);

    const API = {
        ICONS,
        list: () => load().list.slice(),
        current: () => { const d = load(); return d.list.find(p => p.id === d.cur) || null; },
        setCurrent(id) { const d = load(); if (d.list.some(p => p.id === id)) { d.cur = id; persist(); } },
        add(name, icon) {
            const d = load();
            name = clean(name);
            if (!name) return null;
            const p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000), name, icon: icon || '🧒' };
            d.list.push(p); d.cur = p.id; persist();
            return p;
        },
        rename(id, name, icon) {
            const p = load().list.find(x => x.id === id);
            name = clean(name);
            if (!p || !name) return false;
            p.name = name; if (icon) p.icon = icon; persist();
            return true;
        },
        remove(id) {
            const d = load();
            d.list = d.list.filter(p => p.id !== id);
            ls.del(LEGACY + ':' + id);
            if (d.cur === id) d.cur = d.list.length ? d.list[0].id : null;
            persist();
        },
        saveKey(id) { const d = load(); return LEGACY + ':' + (id || d.cur || 'none'); },
        // 存檔摘要：第幾天、幾隻寵物、金幣
        summary(id) {
            try {
                const s = JSON.parse(ls.get(API.saveKey(id)) || 'null');
                if (!s) return null;
                return { day: s.dayCount || 1, pets: (s.pets || []).length, coins: s.coins || 0 };
            } catch (e) { return null; }
        },
    };
    window.PetProfiles = API;
})();
