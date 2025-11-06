// Get references to canvas and UI elements
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const grid = 20; // Size of each grid cell
const tileCount = canvas.width / grid; // Number of tiles per row/column

// Snake state: array of segments, each with x/y grid coordinates
let snake = [{ x: 8, y: 10 }];
let dx = 1, dy = 0; // Snake movement direction (right by default)
let food = { x: 15, y: 10 }; // Food position
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let speed = 120; // Initial speed (ms per move)
let gameInterval = null;
let paused = false;
let gameOver = false;
// Obstacles
const obstacleCount = 6; // number of obstacles to place on the board
let obstacles = [];

// UI elements
const scoreSpan = document.getElementById('score');
const highScoreSpan = document.getElementById('highscore');
const gameOverDiv = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

// Draw the grid lines on the canvas
function drawGrid() {
    // Gradient background
    let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#232526');
    grad.addColorStop(1, '#414345');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Subtle grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 80, 100, 0.18)';
    for (let i = 0; i < tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * grid, 0);
        ctx.lineTo(i * grid, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * grid);
        ctx.lineTo(canvas.width, i * grid);
        ctx.stroke();
    }
    ctx.restore();
}

// Draw the snake as a series of circles
function drawSnake() {
    snake.forEach((part, i) => {
        ctx.save();
        ctx.shadowColor = i === 0 ? '#fff' : '#7fff00';
        ctx.shadowBlur = i === 0 ? 16 : 8;
        ctx.beginPath();
        ctx.arc(part.x * grid + grid / 2, part.y * grid + grid / 2, grid / 2.2, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#baff70' : '#7fff00';
        ctx.fill();
        // Draw a white border for the head
        if (i === 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    });
}

// Draw the food as a red circle
function drawFood() {
    // Animate food pulse
    let t = Date.now() / 400;
    let pulse = 1 + 0.12 * Math.sin(t);
    ctx.save();
    ctx.shadowColor = '#ff4136';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff4136';
    ctx.beginPath();
    ctx.arc(food.x * grid + grid / 2, food.y * grid + grid / 2, (grid / 2.5) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Draw obstacles as gray squares
function drawObstacles() {
    const pad = Math.max(1, Math.floor(grid * 0.12));
    obstacles.forEach(o => {
        ctx.save();
        ctx.shadowColor = '#222';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(o.x * grid + pad, o.y * grid + pad, grid - pad * 2, grid - pad * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });
}

// Get a random position for the food that is not on the snake
function getRandomPosition() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
        };
    // Ensure the random position is not on the snake, not on existing obstacles, and not on the food
    } while (
        snake.some(part => part.x === pos.x && part.y === pos.y) ||
        obstacles.some(o => o.x === pos.x && o.y === pos.y) ||
        (food && food.x === pos.x && food.y === pos.y)
    );
    return pos;
}

// Generate obstacles ensuring they don't overlap snake or food
function generateObstacles(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
        let pos;
        let attempts = 0;
        do {
            pos = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
            attempts++;
            // safety break if board is too full
            if (attempts > 500) break;
        } while (
            snake.some(s => s.x === pos.x && s.y === pos.y) ||
            out.some(o => o.x === pos.x && o.y === pos.y) ||
            (food && food.x === pos.x && food.y === pos.y)
        );
        out.push(pos);
    }
    return out;
}

// Main game update loop
function update() {
    if (paused || gameOver) return;
    // Calculate new head position
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    // Wall wrap: if head goes off the board, wrap to the other side
    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;
    // Self collision
    if (snake.some(part => part.x === head.x && part.y === head.y)) {
        endGame();
        return;
    }
    // Obstacle collision
    if (obstacles.some(o => o.x === head.x && o.y === head.y)) {
        endGame();
        return;
    }
    // Add new head to the snake
    snake.unshift(head);
    // Check for food collision
    if (head.x === food.x && head.y === food.y) {
        score++;
        speed = Math.max(50, speed - 3); // Increase speed as snake grows
        food = getRandomPosition();
        updateScore();
        restartInterval(); // Update interval for new speed
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
    draw();
}

// Draw everything on the canvas
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawObstacles();
    drawFood();
    drawSnake();
}

// Update the score and high score in the UI
function updateScore() {
    scoreSpan.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreSpan.textContent = highScore;
    }
}

// End the game and show game over UI
function endGame() {
    clearInterval(gameInterval);
    gameOver = true;
    gameOverDiv.style.display = 'block';
    restartBtn.style.display = 'inline-block';
}

// Restart the game to initial state
function restartGame() {
    snake = [{ x: 8, y: 10 }];
    dx = 1;
    dy = 0;
    // regenerate obstacles first so food isn't placed on them
    obstacles = generateObstacles(obstacleCount);
    food = getRandomPosition();
    score = 0;
    speed = 120;
    gameOver = false;
    paused = false;
    updateScore();
    gameOverDiv.style.display = 'none';
    restartBtn.style.display = 'none';
    draw();
    restartInterval();
}

// Restart the game interval with the current speed
function restartInterval() {
    clearInterval(gameInterval);
    gameInterval = setInterval(update, speed);
}

// Handle keyboard input for direction and pause
function handleKey(e) {
    if (gameOver) return;
    // Pause/resume with 'P'
    if (e.key === 'p' || e.key === 'P') {
        paused = !paused;
        if (!paused) restartInterval();
        return;
    }
    if (paused) return;
    // Change direction (prevent reverse)
    if ((e.key === 'ArrowUp' || e.key === 'w') && dy === 0) { dx = 0; dy = -1; }
    else if ((e.key === 'ArrowDown' || e.key === 's') && dy === 0) { dx = 0; dy = 1; }
    else if ((e.key === 'ArrowLeft' || e.key === 'a') && dx === 0) { dx = -1; dy = 0; }
    else if ((e.key === 'ArrowRight' || e.key === 'd') && dx === 0) { dx = 1; dy = 0; }
}

// Event listeners for keyboard and restart button
document.addEventListener('keydown', handleKey);
restartBtn.addEventListener('click', restartGame);

// Initialize game state and UI
highScoreSpan.textContent = highScore;
// initial obstacles and food
obstacles = generateObstacles(obstacleCount);
food = getRandomPosition();
draw();
restartInterval();
