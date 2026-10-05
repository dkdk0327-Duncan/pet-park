const canvas = document.getElementById('makeupCanvas');
const ctx = canvas.getContext('2d');

// --- 遊戲狀態 ---
let gameState = 'SELECT_CHAR'; // 'SELECT_CHAR', 'DRESS_UP'
let selectedChar = null;

// 裝配狀態
let equipped = {
    hair: null,
    hat: null,
    glasses: null,
    eyeshadow: null,
    lipstick: null,
    blush: false,
    prop: null
};

// 角色資料定義
const CHARACTERS = {
    GIRL: {
        id: 'GIRL',
        emoji: '👧',
        type: 'HUMAN',
        offsets: {
            hat: { x: 0, y: -100 },
            glasses: { x: 0, y: -20 },
            eyeshadow: { left: { x: -35, y: -5 }, right: { x: 35, y: -5 } },
            lipstick: { x: 0, y: 35 },
            blush: { left: { x: -50, y: 20 }, right: { x: 50, y: 20 } },
            prop: { x: 90, y: 90 }
        }
    },
    RABBIT: {
        id: 'RABBIT',
        emoji: '🐰',
        type: 'ANIMAL',
        offsets: {
            hat: { x: 0, y: -140 },
            glasses: { x: 0, y: -30 },
            eyeshadow: { left: { x: -25, y: -15 }, right: { x: 25, y: -15 } },
            lipstick: { x: 0, y: 25 },
            blush: { left: { x: -40, y: 10 }, right: { x: 40, y: 10 } },
            prop: { x: 80, y: 100 }
        }
    }
};

// 裝飾品清單庫
const ITEMS = {
    hair: ['👧', '👱‍♀️', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '👦', '👱‍♂️', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲'], // 12種頭髮樣式與顏色
    hats: ['👑', '🎀', '👒', '🧢', '🎓', '🎩', '🪖', '🤠', '🌸', '🌻'],
    glasses: ['🕶️', '👓', '🥸', '🥽', '🎭', '🤿'],
    eyeshadow: ['#FFB6C1', '#9370DB', '#87CEFA', '#98FB98', '#F0E68C', '#FFA07A', '#FF69B4', '#FFD700', '#00FFFF', '#BA55D3'], // 10色
    lipstick: ['#FF0000', '#FF1493', '#C71585', '#FF4500', '#DC143C', '#8B0000', '#FF69B4', '#FF8C00', '#800080', '#A52A2A'], // 10色
    blush: ['🔴', '❌'],
    props: ['🪄', '💐', '🎈', '🍭', '🧸', '📱', '👜', '🎸', '🎮', '🍦']
};

// UI 按鈕定義
const buttons = [];

function initDressUpButtons() {
    buttons.length = 0; // 清空按鈕
    const startX = 620;
    const colWidth = 50; // 加大按鈕間距
    
    const addCategory = (title, items, type, startY, isColor = false) => {
        let rowX = startX + 100; // 留空間給標題
        
        items.forEach((item, index) => {
            buttons.push({
                type: 'EQUIP',
                category: type,
                value: item,
                emoji: isColor ? '' : item,
                color: isColor ? item : null,
                x: rowX,
                y: startY,
                w: 45,
                h: 45
            });
            rowX += colWidth;
            if ((index + 1) % 8 === 0) { // 換行
                rowX = startX + 100;
                startY += 55;
            }
        });
        return startY + 60; // 回傳下一個分類的 Y 座標
    };

    let nextY = 30;
    nextY = addCategory('頭髮', ITEMS.hair, 'hair', nextY);
    nextY = addCategory('頭飾', ITEMS.hats, 'hat', nextY);
    nextY = addCategory('眼鏡', ITEMS.glasses, 'glasses', nextY);
    nextY = addCategory('眼影', ITEMS.eyeshadow, 'eyeshadow', nextY, true);
    nextY = addCategory('口紅', ITEMS.lipstick, 'lipstick', nextY, true);
    nextY = addCategory('腮紅', ITEMS.blush, 'blush', nextY);
    nextY = addCategory('手持', ITEMS.props, 'prop', nextY);

    // 脫掉全部與返回按鈕
    buttons.push({ type: 'RESET', text: '全部卸下', x: 750, y: nextY + 20, w: 170, h: 50 });
    buttons.push({ type: 'BACK', text: '換角色', x: 950, y: nextY + 20, w: 170, h: 50 });
}

const selectButtons = [
    { type: 'CHAR', value: 'GIRL', emoji: '👧', text: '可愛人類', x: 300, y: 250, w: 250, h: 300 },
    { type: 'CHAR', value: 'RABBIT', emoji: '🐰', text: '小兔子', x: 650, y: 250, w: 250, h: 300 }
];

// --- 互動邏輯 ---
function checkClick(mx, my, btn) {
    return mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'SELECT_CHAR') {
        selectButtons.forEach(btn => {
            if (checkClick(mx, my, btn)) {
                selectedChar = CHARACTERS[btn.value];
                // 重置裝備
                equipped = { hat: null, glasses: null, blush: false, prop: null };
                initDressUpButtons();
                gameState = 'DRESS_UP';
            }
        });
    } else if (gameState === 'DRESS_UP') {
        buttons.forEach(btn => {
            if (checkClick(mx, my, btn)) {
                if (btn.type === 'EQUIP') {
                    if (btn.category === 'blush') {
                        equipped.blush = (btn.value === '🔴');
                    } else {
                        equipped[btn.category] = btn.value;
                    }
                } else if (btn.type === 'RESET') {
                    equipped = { hair: null, hat: null, glasses: null, eyeshadow: null, lipstick: null, blush: false, prop: null };
                } else if (btn.type === 'BACK') {
                    gameState = 'SELECT_CHAR';
                }
            }
        });
    }
});


// --- 繪製邏輯 ---
function drawSelectScreen() {
    ctx.fillStyle = '#fff0f5'; // 淡紫粉背景
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('選一個喜歡的角色開始化妝吧！', canvas.width / 2, 100);

    selectButtons.forEach(btn => {
        // 卡片背景
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.shadowBlur = 0; // 重置

        // 邊框
        ctx.strokeStyle = '#ffb6c1';
        ctx.lineWidth = 4;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        // Emoji
        ctx.fillStyle = '#000'; // 確保透明度與顏色不會被影響
        ctx.font = '100px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.emoji, btn.x + btn.w / 2, btn.y + btn.h / 2 - 20);

        // 文字
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h - 40);
    });
}

function drawDressUpScreen() {
    // 繪製主背景 (展示區與右側面板)
    ctx.fillStyle = '#fffafa'; // 雪白粉背景 (展示區)
    ctx.fillRect(0, 0, 700, canvas.height); // 這裡改成 700 留更多空間
    
    ctx.fillStyle = '#ffe4e1'; // 右側選單背景
    ctx.fillRect(700, 0, 500, canvas.height); // 右側選單 500 寬

    // --- 繪製角色與裝備 ---
    const cx = 350; // 角色中心 X
    const cy = 400; // 角色中心 Y

    // 繪製舞台陰影
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 120, 150, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // 在畫 emoji 之前，強制將 fillStyle 設回黑色（或重設 globalAlpha），避免繼承到前面 rgba 透明度而讓人物變透明！
    ctx.fillStyle = '#000';
    ctx.font = '250px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 畫角色身體 (如果有人類的新頭髮，就用頭髮的表情取代，否則用預設的)
    let currentEmoji = selectedChar.emoji;
    if (selectedChar.type === 'HUMAN' && equipped.hair) {
        currentEmoji = equipped.hair;
    }
    ctx.fillText(currentEmoji, cx, cy);

    // 畫眼影
    if (equipped.eyeshadow) {
        ctx.fillStyle = equipped.eyeshadow;
        ctx.globalAlpha = 0.5; // 半透明
        const offsets = selectedChar.offsets.eyeshadow;
        ctx.beginPath();
        // 將外觀加寬呈橢圓形，更符合眼影形狀
        ctx.ellipse(cx + offsets.left.x, cy + offsets.left.y, 25, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + offsets.right.x, cy + offsets.right.y, 25, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // 畫口紅
    if (equipped.lipstick) {
        ctx.fillStyle = equipped.lipstick;
        ctx.globalAlpha = 0.8;
        const offsets = selectedChar.offsets.lipstick;
        ctx.beginPath();
        ctx.ellipse(cx + offsets.x, cy + offsets.y, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // 畫腮紅
    if (equipped.blush) {
        ctx.fillStyle = 'rgba(255, 105, 180, 0.5)'; // 半透明粉紅
        const offsets = selectedChar.offsets.blush;
        ctx.beginPath();
        ctx.arc(cx + offsets.left.x, cy + offsets.left.y, 25, 0, Math.PI * 2);
        ctx.arc(cx + offsets.right.x, cy + offsets.right.y, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // 畫眼鏡
    ctx.fillStyle = '#000'; // 確保不受前面顏色影響
    if (equipped.glasses) {
        ctx.font = '100px sans-serif';
        const off = selectedChar.offsets.glasses;
        ctx.fillText(equipped.glasses, cx + off.x, cy + off.y);
    }

    // 畫帽子
    if (equipped.hat) {
        ctx.font = '130px sans-serif';
        const off = selectedChar.offsets.hat;
        ctx.fillText(equipped.hat, cx + off.x, cy + off.y);
    }

    // 畫手持道具
    if (equipped.prop) {
        ctx.font = '110px sans-serif';
        const off = selectedChar.offsets.prop;
        ctx.fillText(equipped.prop, cx + off.x, cy + off.y);
    }

    // --- 繪製右側選單 ---
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ 百變衣櫃 ✨', 950, 40);

    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💇 頭髮', 720, 95);
    ctx.fillText('👑 頭飾', 720, 205);
    ctx.fillText('🕶️ 眼鏡', 720, 315);
    ctx.fillText('👁️ 眼影', 720, 425);
    ctx.fillText('💄 口紅', 720, 485);
    ctx.fillText('😊 腮紅', 720, 545);
    ctx.fillText('🪄 道具', 720, 655);

    buttons.forEach(btn => {
        if (btn.type === 'EQUIP') {
            // 色塊背景或是白框
            if (btn.color) {
                ctx.fillStyle = btn.color;
                ctx.beginPath();
                ctx.arc(btn.x + btn.w/2, btn.y + btn.h/2, 18, 0, Math.PI*2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            }
            
            // 如果是被選擇的裝備，加上邊框提示
            if (equipped[btn.category] === btn.value || (btn.category === 'blush' && equipped.blush === (btn.value === '🔴'))) {
                ctx.strokeStyle = '#ff1493';
                ctx.lineWidth = 4;
                if (btn.color) {
                    ctx.beginPath();
                    ctx.arc(btn.x + btn.w/2, btn.y + btn.h/2, 22, 0, Math.PI*2);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
                }
            }

            if (!btn.color) {
                ctx.fillStyle = '#000';
                ctx.font = '28px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(btn.emoji, btn.x + btn.w / 2, btn.y + btn.h / 2);
            }
        } else {
            // 文字按鈕 (Reset, Back)
            ctx.fillStyle = (btn.type === 'RESET') ? '#ffcccb' : '#add8e6';
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

            ctx.fillStyle = '#333';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
        }
    });
}

function gameLoop() {
    if (gameState === 'SELECT_CHAR') {
        drawSelectScreen();
    } else if (gameState === 'DRESS_UP') {
        drawDressUpScreen();
    }
    requestAnimationFrame(gameLoop);
}

// 啟動
requestAnimationFrame(gameLoop);