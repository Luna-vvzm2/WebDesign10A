// ===============================
//  ゲーム状態管理
// ===============================
let gameState = "start";   // "start" / "play" / "gameover"
let gameResult = "";       // "dead" / "clear"
let isPaused = false;      // ポーズ中かどうか

let last = performance.now();

// DOM 参照
const c = document.getElementById('game');
const ctx = c.getContext('2d');
const startScreen = document.getElementById("startScreen");
const gameContainer = document.getElementById("gameContainer");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverMessage = document.getElementById("gameOverMessage");

const playerLife = document.getElementById("life");
const pauseLabel = document.getElementById("pauseLabel");

// ===== ボールパラメータ =====
const CONFIG = {
    r: 16,
    speed:  220,
    dir:    { x: 1, y: -1},
    color:  '#7ef5e1',
    trail:  0.0
};

// ===== 状態 =====
const ball = {
    x: c.width * 0.25,
    y: c.height * 0.5,
    vx: CONFIG.speed * CONFIG.dir.x,
    vy: CONFIG.speed * CONFIG.dir.y
};

// ===============================
//  プレイヤーの状態
// ===============================
const player = {
    x: 80,
    y: c.height - 100,
    w: 80,
    h: 20,
    vx: 0,
    color: "#b52b60ff"
};

// ===============================
//  敵オブジェクト（複数）
// ===============================
let enemyNumber = 30;
let aliveEnemy = enemyNumber;
function createEnemy(i) {
    return {
        x: i % 10 * 64 + 2,
        y: Math.floor(i / 10) * 24,
        w: 60,
        h: 20,
        color: 'red',
        alive: true,
    };
}

const enemies = [];
for (let i = 0; i < enemyNumber; i++) {
    enemies.push(createEnemy(i));
}

const MOVE_SPEED = 400; // 横移動速度(px/s)

// ===============================
//  入力状態管理（keys）
// ===============================
const keys = {};

document.addEventListener('keydown', (e) => {
    // PキーでポーズON/OFF（プレイ中のみ）
    if (e.key === "p" || e.key === "P") {
        if (gameState === "play") {
            isPaused = !isPaused;
            updateHUD();
        }
        return;
    }

    if (e.key === "Escape"){
        gameState = "start";
        updateViewByGameState();
        return;
    }

    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// ===============================
//  マウス入力＆クリック判定用
// ===============================
const mouse = { x: 0, y: 0 };

c.addEventListener('mousemove', (e) => {
    const rect = c.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

c.addEventListener('mousedown', (e) => {
    if (gameState !== "play" || isPaused) return; // プレイ中＆ポーズ中でないときだけ反応

    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit =
        mx >= player.x &&
        mx <= player.x + player.w &&
        my >= player.y &&
        my <= player.y + player.h;

    if (hit) {
        player.x = mx - 12;
    }
    
});

// ===============================
//  爆発エフェクト
// ===============================
const explosions = [];

function updateExplosions(dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const ex = explosions[i];
        ex.life -= dt;
        ex.radius += 60 * dt;

        if (ex.life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    explosions.forEach(ex => {
        const t = ex.life / ex.maxLife;
        const alpha = Math.max(t, 0);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 220, 80, 1)";
        ctx.fill();
        ctx.restore();
    });
}

function updateViewByGameState() {
    startScreen.style.display = "none";
    gameContainer.style.display = "none";
    gameOverScreen.style.display = "none";

    if (gameState === "start") {
        startScreen.style.display = "block";
    } else if (gameState === "play") {
        gameContainer.style.display = "flex";
    } else if (gameState === "gameover") {
        gameOverScreen.style.display = "block";
    }
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", () => {
    gameState = "start";
    updateViewByGameState();
});

function startGame() {
    resetGame();            // playerLife = 1
    gameResult = "";
    isPaused = false;
    last = performance.now();
    gameState = "play";
    updateViewByGameState();
    requestAnimationFrame(loop);
}

function endGame(reason) {
    gameResult = reason; // "dead" / "clear"
    gameState = "gameover";

    if (reason === "clear") {
        gameOverTitle.textContent = "ゲームクリア！";
        gameOverMessage.textContent = "すべてのブロックがなくなりました";
    } else if (reason === "dead") {
        gameOverTitle.textContent = "ゲームオーバー";
        gameOverMessage.textContent = "LIFEが0になりました…。";
    } else {
        gameOverTitle.textContent = "ゲーム終了";
        gameOverMessage.textContent = "おつかれさまでした。";
    }

    updateViewByGameState();
}

// ===============================
//  HUD 更新処理（DOM 連携）
// ===============================
function updateHUD() {
    // ポーズ表示
      pauseLabel.textContent = isPaused ? "PAUSED" : "";
}

// ===============================
//  時間管理とゲームループ
// ===============================

function loop(now) {
    if (gameState !== "play") return;

    const dt = (now - last) / 1000;
    last = now;

    // ポーズ中は時間を進めない
    if (isPaused) {
        draw();
        requestAnimationFrame(loop);
        return;
    }

    update(dt);

    // aliveEnemyが0になったらゲームクリア
    if (aliveEnemy === 0) {
        draw();
        endGame("clear");
        return;
    }

    // LIFEが0になったらゲームオーバー
    if (playerLife.textContent == 0) {
        draw();
        endGame("dead");
        return;
    }
    
    updateViewByGameState();
    draw();

    requestAnimationFrame(loop);
}

// ===============================
//  更新処理
// ===============================
function update(dt) {
    handleInput();
    ballMove(dt);
    playerMove(dt);

    checkCollisionWithEnemies();
    checkCollisionWithPlayer();
    updateExplosions(dt);
}

function handleInput() {
      player.vx = 0;

      if (keys["ArrowLeft"]) {
        player.vx = -MOVE_SPEED;
      }
      if (keys["ArrowRight"]) {
        player.vx = MOVE_SPEED;
      }
}

function ballMove(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y >= c.height) {
        ball.x = c.width * 0.25;
        ball.y = c.height * 0.5;
        ball.vx = CONFIG.speed * CONFIG.dir.x;
        ball.vy = CONFIG.speed * CONFIG.dir.y;
        playerLife.textContent--;
    }

    if (ball.y < 0) {
        ball.y = 0;
        ball.vy *= -1;
    }
    
    if (ball.x < 0) {
        ball.x = 0;
        ball.vx *= -1;
    }

    if (ball.x + CONFIG.r > c.width) {
        ball.x = c.width - CONFIG.r;
        ball.vx *= -1;
    }
}

function playerMove(dt) {
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > c.width) player.x = c.width - player.w;

    player.x += player.vx * dt;
}

// ===============================
//  描画処理
// ===============================
function draw() {
    ctx.clearRect(0, 0, c.width, c.height);

    // プレイヤー
    drawPlayer();
    // ボール
    drawBall();
    // 敵
    drawEnemies();
    // 爆発
    drawExplosions();

    // ポーズ中オーバーレイ
    if (isPaused) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#fff";
        ctx.font = "32px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", c.width / 2, c.height / 2);
        ctx.restore();
    }
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(
        Math.round(player.x),
        Math.round(player.y),
        player.w,
        player.h
    );
}

function drawBall() {
    ctx.fillStyle = CONFIG.color;
    ctx.beginPath();
    ctx.arc(
        Math.round(ball.x),
        Math.round(ball.y),
        CONFIG.r,
        0,
        Math.PI*2
    );
    ctx.fill();
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (!enemy.alive) return;

        ctx.fillStyle = enemy.color;
        ctx.fillRect(
            Math.round(enemy.x),
            Math.round(enemy.y),
            enemy.w,
            enemy.h
        );
    });
}

function checkCollisionWithEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        
        const ehit =
            ball.x + CONFIG.r >= enemy.x &&
            ball.x - CONFIG.r <= enemy.x + enemy.w &&
            ball.y + CONFIG.r >= enemy.y &&
            ball.y - CONFIG.r <= enemy.y + enemy.h;

        if (ehit) {
            enemy.alive = false;
            aliveEnemy--;

            explosions.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y + enemy.h / 2,
                r: 10,
                life: 0.3,
                maxLife: 0.3,
            });

            break;
        }
    }
}

function checkCollisionWithPlayer() {
    const phit = 
        ball.x + CONFIG.r >= player.x &&
        ball.x - CONFIG.r <= player.x + player.w &&
        ball.y + CONFIG.r >= player.y &&
        ball.y - CONFIG.r <= player.y + player.h;

    if (phit) {
        ball.vy *= -1;
    }
}

// ===============================
//  リセット処理
// ===============================
function setupStage() {
    player.x = 80;
    player.y = c.height - 100;
    player.vx = 0;

    explosions.length = 0;
}

function resetGame() {
    playerLife.textContent = 3;
    aliveEnemy = enemyNumber;
    enemies.length = 0;
    for (let i = 0; i < enemyNumber; i++) {
        enemies.push(createEnemy(i));
    }

    ball.x = c.width * 0.25;
    ball.y = c.height * 0.5;
    ball.vx = CONFIG.speed * CONFIG.dir.x;
    ball.vy = CONFIG.speed * CONFIG.dir.y;
    
    setupStage();
    updateViewByGameState();
}

updateViewByGameState();