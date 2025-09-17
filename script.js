/* Snake — Advanced
   Grid-based snake on canvas with:
   - Score & Highscore (localStorage)
   - Levels / speed-up
   - Wrap-around toggle
   - Optional obstacles
   - Pause / Restart / Start
*/

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');

const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnRestart = document.getElementById('btn-restart');
const toggleWrap = document.getElementById('toggle-wrap');
const toggleObstacles = document.getElementById('toggle-obstacles');

// Game settings
const TILE = 16;                 // pixel size of each grid cell
const COLS = Math.floor(canvas.width / TILE);
const ROWS = Math.floor(canvas.height / TILE);
const BASE_SPEED = 140;          // ms per step (lower = faster)
const SPEED_STEP = 10;           // speed increase (ms decrease) per level
const POINTS_PER_LEVEL = 5;      // how many points to level up
const OBSTACLE_COUNT_BY_LEVEL = 1; // new obstacle per level (if enabled)

let snake, dir, food, obstacles, score, highscore, level;
let running = false, paused = false;
let stepInterval = BASE_SPEED;
let loopHandle = null;

// initialize or reset
function initGame() {
  snake = [{x: Math.floor(COLS/2), y: Math.floor(ROWS/2)}];
  dir = {x:1, y:0}; // moving right
  spawnFood();
  obstacles = [];
  score = 0;
  level = 1;
  stepInterval = BASE_SPEED;
  running = false;
  paused = false;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  highscore = parseInt(localStorage.getItem('snake_high') || '0', 10);
  highEl.textContent = highscore;
  hideMessage();
  draw();
}

// draw helpers
function drawCell(x,y,color){
  ctx.fillStyle = color;
  ctx.fillRect(x*TILE, y*TILE, TILE-1, TILE-1);
}
function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

// spawn food in free cell
function spawnFood(){
  let ok=false;
  let tries=0;
  while(!ok && tries<500){
    const fx = Math.floor(Math.random()*COLS);
    const fy = Math.floor(Math.random()*ROWS);
    const collSnake = snake.some(s => s.x===fx && s.y===fy);
    const collObs = obstacles.some(o => o.x===fx && o.y===fy);
    if(!collSnake && !collObs){
      food = {x:fx,y:fy};
      ok = true;
    }
    tries++;
  }
  if(!ok) food = {x:0,y:0}; // fallback
}

// add obstacles for level
function generateObstacles(count){
  const newObs = [];
  let tries = 0;
  while(newObs.length < count && tries < 1000){
    const ox = Math.floor(Math.random()*COLS);
    const oy = Math.floor(Math.random()*ROWS);
    if(snake.some(s=>s.x===ox && s.y===oy)) { tries++; continue; }
    if(food && food.x===ox && food.y===oy) { tries++; continue; }
    if(obstacles.some(o=>o.x===ox && o.y===oy)) { tries++; continue; }
    newObs.push({x:ox,y:oy});
    tries++;
  }
  obstacles = obstacles.concat(newObs);
}

// one step in game
function step(){
  if(!running || paused) return;
  const head = {...snake[0]};
  const nx = head.x + dir.x;
  const ny = head.y + dir.y;
  let newHead = {x:nx, y:ny};

  if(toggleWrap.checked){
    // wrap around edges
    newHead.x = (newHead.x + COLS) % COLS;
    newHead.y = (newHead.y + ROWS) % ROWS;
  } else {
    // wall collision
    if(newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS){
      return gameOver('Hit the wall!');
    }
  }

  // self collision
  if(snake.some(s => s.x === newHead.x && s.y === newHead.y)){
    return gameOver('You bit yourself!');
  }

  // obstacle collision
  if(obstacles.some(o => o.x===newHead.x && o.y===newHead.y)){
    return gameOver('Hit an obstacle!');
  }

  snake.unshift(newHead);

  // eat food?
  if(newHead.x === food.x && newHead.y === food.y){
    score += 1;
    scoreEl.textContent = score;
    spawnFood();

    // level-up if needed
    if(score % POINTS_PER_LEVEL === 0){
      level++;
      levelEl.textContent = level;
      // increase difficulty: speed up
      stepInterval = Math.max(30, BASE_SPEED - (level-1)*SPEED_STEP);
      restartLoop();
      // spawn obstacle(s) if enabled
      if(toggleObstacles.checked){
        generateObstacles(OBSTACLE_COUNT_BY_LEVEL);
      }
    }

    // update highscore
    if(score > highscore){
      highscore = score;
      localStorage.setItem('snake_high', highscore);
      highEl.textContent = highscore;
    }
  } else {
    snake.pop();
  }

  draw();
}

function draw(){
  clearCanvas();

  // food
  drawCell(food.x, food.y, '#ef4444');

  // obstacles
  obstacles.forEach(o => drawCell(o.x, o.y, '#7c3aed'));

  // snake
  snake.forEach((s, idx) => {
    const color = idx === 0 ? '#10b981' : `rgba(16,185,129,${Math.max(0.3,1 - idx/12)})`;
    drawCell(s.x, s.y, color);
  });
}

function showMessage(text){
  messageEl.textContent = text;
  messageEl.classList.remove('hidden');
}
function hideMessage(){
  messageEl.classList.add('hidden');
}

// game control functions
function startGame(){
  if(!running){
    running = true;
    paused = false;
    restartLoop();
    hideMessage();
  }
}
function pauseGame(){
  if(!running) return;
  paused = !paused;
  btnPause.textContent = paused ? 'Resume' : 'Pause';
  showMessage(paused ? 'Paused' : '');
  restartLoop(); // loop won't run while paused
}
function restartLoop(){
  if(loopHandle) clearInterval(loopHandle);
  if(running && !paused){
    loopHandle = setInterval(step, stepInterval);
  }
}

function stopLoop(){
  if(loopHandle) clearInterval(loopHandle);
  loopHandle = null;
}

function gameOver(reason){
  running = false;
  stopLoop();
  showMessage('Game Over — ' + reason + ' Press R to restart.');
}

// input handling
function setDirection(newDir){
  // prevent reverse
  if((newDir.x === -dir.x && newDir.y === -dir.y) || (newDir.x === dir.x && newDir.y === dir.y)) return;
  dir = newDir;
}

window.addEventListener('keydown', e => {
  if(['ArrowUp','w','W'].includes(e.key)){ setDirection({x:0,y:-1}); }
  if(['ArrowDown','s','S'].includes(e.key)){ setDirection({x:0,y:1}); }
  if(['ArrowLeft','a','A'].includes(e.key)){ setDirection({x:-1,y:0}); }
  if(['ArrowRight','d','D'].includes(e.key)){ setDirection({x:1,y:0}); }

  if(e.key === ' ' || e.key === 'p' || e.key === 'P'){ // pause
    e.preventDefault();
    pauseGame();
  }
  if(e.key === 'r' || e.key === 'R'){
    initGame();
    startGame();
  }
});

// UI buttons
btnStart.addEventListener('click', () => {
  startGame();
});
btnPause.addEventListener('click', () => {
  pauseGame();
});
btnRestart.addEventListener('click', () => {
  initGame();
  startGame();
});

// toggles
toggleWrap.addEventListener('change', () => {
  // no special action needed
});
toggleObstacles.addEventListener('change', () => {
  if(!toggleObstacles.checked) obstacles = [];
});

// start
initGame();
