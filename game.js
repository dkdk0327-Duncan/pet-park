const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 遊戲資料與設定 ---
const TRASH_TYPES = {
    GENERAL: '一般垃圾',
    RECYCLE: '資源回收',
    COMPOST: '廚餘'
};

// 垃圾桶設定
const BINS = [
    { id: TRASH_TYPES.GENERAL, color: '#e74c3c', x: 100, y: 450, w: 150, h: 100, label: '一般垃圾' },
    { id: TRASH_TYPES.RECYCLE, color: '#3498db', x: 325, y: 450, w: 150, h: 100, label: '資源回收' },
    { id: TRASH_TYPES.COMPOST, color: '#2ecc71', x: 550, y: 450, w: 150, h: 100, label: '廚餘' }
];

// 大幅增加的垃圾清單與分類對應
const TRASH_DB = [
    { name: '蘋果核', type: TRASH_TYPES.COMPOST, emoji: '🍎' },
    { name: '香蕉皮', type: TRASH_TYPES.COMPOST, emoji: '🍌' },
    { name: '西瓜皮', type: TRASH_TYPES.COMPOST, emoji: '🍉' },
    { name: '剩飯', type: TRASH_TYPES.COMPOST, emoji: '🍚' },
    { name: '爛掉的報紙', type: TRASH_TYPES.GENERAL, emoji: '🗞️' }, // 髒污紙張算一般垃圾
    { name: '衛生紙', type: TRASH_TYPES.GENERAL, emoji: '🧻' },
    { name: '破掉的衣服', type: TRASH_TYPES.GENERAL, emoji: '👕' },
    { name: '舊鞋子', type: TRASH_TYPES.GENERAL, emoji: '👟' },
    { name: '塑膠袋', type: TRASH_TYPES.GENERAL, emoji: '🛍️' },
    { name: '口罩', type: TRASH_TYPES.GENERAL, emoji: '😷' },
    { name: '寶特瓶', type: TRASH_TYPES.RECYCLE, emoji: '🧴' },
    { name: '紙箱', type: TRASH_TYPES.RECYCLE, emoji: '📦' },
    { name: '鋁罐', type: TRASH_TYPES.RECYCLE, emoji: '🥫' },
    { name: '玻璃瓶', type: TRASH_TYPES.RECYCLE, emoji: '🍾' },
    { name: '報紙', type: TRASH_TYPES.RECYCLE, emoji: '📰' },
    { name: '鐵罐', type: TRASH_TYPES.RECYCLE, emoji: '🥫' },
    { name: '燈泡', type: TRASH_TYPES.RECYCLE, emoji: '💡' },
    { name: '乾電池', type: TRASH_TYPES.RECYCLE, emoji: '🔋' }, // 廣義回收
    { name: '舊手機', type: TRASH_TYPES.RECYCLE, emoji: '📱' },
    { name: '廢紙', type: TRASH_TYPES.RECYCLE, emoji: '📄' }
];

// --- 遊戲狀態 ---
let gameState = 'START'; // 'START', 'PLAYING', 'GAME_OVER'
let score = 0;
let currentTrash = null;
let trashQueue = [];
let isDragging = false;
let mouseX = 0;
let mouseY = 0;
let message = "";
let messageTimer = 0;

// 按鈕設定
const btn = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2 + 50,
    w: 200,
    h: 60,
    text: '開始遊戲'
};

// Initialization
function init() {
    // 綁定滑鼠事件
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0;
    gameState = 'PLAYING';
    message = "把垃圾拖曳到正確的垃圾桶喔！";
    
    // 初始化且打亂垃圾陣列 (Fisher-Yates Shuffle)
    trashQueue = [...TRASH_DB];
    for (let i = trashQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trashQueue[i], trashQueue[j]] = [trashQueue[j], trashQueue[i]];
    }
    
    spawnTrash();
}

// 產生新的垃圾
function spawnTrash() {
    if (trashQueue.length === 0) {
        // 沒有垃圾了，結束遊戲
        gameState = 'GAME_OVER';
        currentTrash = null;
        return;
    }

    const nextItem = trashQueue.pop(); // 從陣列尾端取出
    currentTrash = {
        ...nextItem,
        x: canvas.width / 2,        // 初始 X 座標 (置中)
        y: 150,                     // 初始 Y 座標 (偏上方)
        radius: 40,                 // 感應半徑
        originalX: canvas.width / 2,
        originalY: 150
    };
}

// 顯示畫面上方提示訊息
function showMessage(msg, duration = 2000) {
    message = msg;
    messageTimer = Date.now() + duration; // 計算消失時間
}

// --- 滑鼠互動邏輯 ---
function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'START' || gameState === 'GAME_OVER') {
        // 檢查是否點擊按鈕
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
            startGame();
        }
        return;
    }

    if (gameState === 'PLAYING' && currentTrash) {
        // 計算滑鼠與垃圾中心的距離
        const dist = Math.hypot(mx - currentTrash.x, my - currentTrash.y);
        if (dist <= currentTrash.radius) {
            isDragging = true;
        }
    }
}

function onMouseMove(e) {
    if (gameState !== 'PLAYING') return;

    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isDragging && currentTrash) {
        currentTrash.x = mouseX;
        currentTrash.y = mouseY;
    }
}

function onMouseUp(e) {
    if (gameState !== 'PLAYING') return;

    if (isDragging && currentTrash) {
        isDragging = false;
        checkCollision(); // 放開滑鼠時檢查是否丟進垃圾桶
    }
}

// --- 邏輯判斷 ---
function checkCollision() {
    let droppedInBin = null;

    // 檢查垃圾中心點是否落在某個垃圾桶的範圍內
    for (let bin of BINS) {
        if (
            currentTrash.x > bin.x && currentTrash.x < bin.x + bin.w &&
            currentTrash.y > bin.y && currentTrash.y < bin.y + bin.h
        ) {
            droppedInBin = bin;
            break;
        }
    }

    if (droppedInBin) {
        if (droppedInBin.id === currentTrash.type) {
            // 答對分類
            score += 10;
            showMessage("答對了！+10分 😄");
            spawnTrash(); // 產生下一個
        } else {
            // 答錯分類
            score -= 5;
            showMessage(`答錯了！這是${currentTrash.type}喔 😢`);
            // 退回原位讓小朋友重拿
            currentTrash.x = currentTrash.originalX;
            currentTrash.y = currentTrash.originalY;
        }
    } else {
        // 沒丟進垃圾桶，退回原位
        currentTrash.x = currentTrash.originalX;
        currentTrash.y = currentTrash.originalY;
    }
}

// Update logic (dt = delta time in milliseconds)
function update(dt) {
    if (gameState === 'PLAYING') {
        // 處理訊息顯示時間
        if (messageTimer > 0 && Date.now() > messageTimer) {
            message = "";
            messageTimer = 0;
        }
    }
}

// Draw logic
function draw(ctx) {
    // 繪製背景 (天空色)
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'START') {
        ctx.fillStyle = '#333';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('環保小尖兵：垃圾分類', canvas.width / 2, canvas.height / 2 - 50);

        // 畫按鈕
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('開始遊戲', canvas.width / 2, canvas.height / 2 + 90);
    } 
    else if (gameState === 'GAME_OVER') {
        ctx.fillStyle = '#333';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('遊戲結束！', canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText(`你的總分是：${score}`, canvas.width / 2, canvas.height / 2 - 10);

        // 畫按鈕
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('再玩一次', canvas.width / 2, canvas.height / 2 + 90);
    }
    else if (gameState === 'PLAYING') {
        // 繪製分數與剩餘數量
        ctx.fillStyle = '#333';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`分數: ${score}`, 20, 40);
        
        ctx.textAlign = 'right';
        ctx.fillText(`剩餘: ${trashQueue.length + (currentTrash ? 1 : 0)}`, canvas.width - 20, 40);

        // 繪製指示訊息
        if (message) {
            ctx.fillStyle = '#333';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(message, canvas.width / 2, 80);
        }

        // 繪製三個垃圾桶
        for (let bin of BINS) {
            ctx.fillStyle = bin.color;
            ctx.fillRect(bin.x, bin.y, bin.w, bin.h);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(bin.label, bin.x + bin.w / 2, bin.y + bin.h / 2 + 7);
        }

        // 繪製要分類的垃圾
        if (currentTrash) {
            // 畫一個白色圓底增加能見度
            ctx.beginPath();
            ctx.arc(currentTrash.x, currentTrash.y, currentTrash.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#ddd';
            ctx.stroke();

            // 畫出 Emoji 代替圖片
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(currentTrash.emoji, currentTrash.x, currentTrash.y);
            
            // 寫上垃圾名稱 (在圖示下方)
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(currentTrash.name, currentTrash.x, currentTrash.y + currentTrash.radius + 15);
        }
    }
}

let lastTime = 0;
// Main game loop
function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw(ctx);

    requestAnimationFrame(gameLoop);
}

// Start the game
window.onload = init;