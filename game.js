const TILE = 32;
const GRID_W = 30;
const GRID_H = 18;
const GRAVITY = 0.45;
const MAX_FALL = 10;
const MOVE_SPEED = 2.6;
const JUMP_SPEED = -8.5;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hud = {
  level: document.getElementById("hudLevel"),
  lives: document.getElementById("hudLives"),
  score: document.getElementById("hudScore"),
  ammo: document.getElementById("hudAmmo"),
  trophies: document.getElementById("hudTrophies")
};

const keys = new Set();
addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "KeyZ", "KeyX", "KeyR", "Enter"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function tone(freq = 440, duration = 0.08, type = "square", volume = 0.04, slide = 0) {
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

const SFX = {
  jump: () => tone(440, 0.09, "square", 0.05, 180),
  shoot: () => tone(180, 0.06, "sawtooth", 0.05, -40),
  pickup: () => { tone(700, 0.06, "square", 0.05, 200); setTimeout(() => tone(980, 0.08, "square", 0.04, 80), 55); },
  hit: () => tone(140, 0.2, "triangle", 0.06, -100),
  door: () => { tone(600, 0.08, "square", 0.04, 30); setTimeout(() => tone(800, 0.1, "square", 0.03, 20), 90); },
  death: () => tone(190, 0.35, "sawtooth", 0.07, -140),
  win: () => [420, 520, 660, 860].forEach((n, i) => setTimeout(() => tone(n, 0.11, "square", 0.04), i * 120))
};

const palette = {
  bg: "#173052",
  wall: "#4f74a1",
  platform: "#8fb2dc",
  spike: "#ff5f5f",
  trophy: "#ffd84d",
  key: "#78f3ab",
  door: "#a47cff",
  gun: "#59d6f8",
  enemy: "#ff875f",
  bullet: "#fefefe",
  player: "#ff3f60"
};

function makeTemplate(rows) {
  return rows.map((r) => r.padEnd(GRID_W, ".").slice(0, GRID_W));
}

const LEVEL_TEMPLATES = [
  makeTemplate([
    "##############################",
    "#..........E.......T.......D.#",
    "#........######..............#",
    "#..............S.............#",
    "#......T...............#####.#",
    "#....#####...................#",
    "#.................T..........#",
    "#..........####..............#",
    "#....P.............G.........#",
    "#.......####................##",
    "#............................#",
    "#..........K.................#",
    "#............................#",
    "#...............####.........#",
    "#....................T.......#",
    "#......................E.....#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#....D........................#",
    "#...######..............T....#",
    "#...........E.....#####......#",
    "#.....S......................#",
    "#.....................E......#",
    "#....T.............######....#",
    "#..........#####.............#",
    "#...P...............G........#",
    "#.................#####......#",
    "#......................T.....#",
    "#....######..................#",
    "#..............K.............#",
    "#..E.........................#",
    "#.....................T......#",
    "#..............#####.........#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#...D....#####.....T.........#",
    "#.............E..............#",
    "#..######....................#",
    "#......S..............#####..#",
    "#..............T.............#",
    "#....E.......................#",
    "#...........######...........#",
    "#...P...............G........#",
    "#........T...............E...#",
    "#....######..................#",
    "#.......................#####.#",
    "#.............K...............#",
    "#.........#####...............#",
    "#....................T........#",
    "#.............................#",
    "#.............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#.....D.............T........#",
    "#...######.....E.............#",
    "#...............#####........#",
    "#....S.......................#",
    "#...........T...........E....#",
    "#....#####...................#",
    "#..............######........#",
    "#..P......G..................#",
    "#..........#####.....T.......#",
    "#....................#####...#",
    "#...........E................#",
    "#.....K......................#",
    "#...................######...#",
    "#.......T....................#",
    "#............................#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#...D.................#####..#",
    "#........T...................#",
    "#..E.........#####...........#",
    "#......S.....................#",
    "#............T.....E.........#",
    "#....#####..............#####.#",
    "#.......................T....#",
    "#..P.........G...............#",
    "#.......######...............#",
    "#....................E.......#",
    "#.....T......................#",
    "#..................K.........#",
    "#.........######.............#",
    "#............................#",
    "#............T...............#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#....D......######.....T.....#",
    "#....................E.......#",
    "#..######....................#",
    "#....S.............#####.....#",
    "#...........T................#",
    "#....E.......................#",
    "#............######..........#",
    "#...P..............G.........#",
    "#.....................T......#",
    "#......#####................##",
    "#.....................E......#",
    "#..T.............K...........#",
    "#.............######.........#",
    "#............................#",
    "#.........T..................#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#...D.............T.........##",
    "#.......E.....######........#",
    "#..######...................#",
    "#....S.................E....#",
    "#..............T............#",
    "#....#####.............#####.#",
    "#................T...........#",
    "#..P........G...............##",
    "#..........#####.............#",
    "#......................E.....#",
    "#....T.......................#",
    "#..................K.........#",
    "#...........######...........#",
    "#............................#",
    "#..............T.............#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#....D.........######...T....#",
    "#..........E................##",
    "#..######....................#",
    "#....S...............E.......#",
    "#...........T......#####.....#",
    "#.....#####..................#",
    "#.................T..........#",
    "#..P.........G...............#",
    "#........######.........E....#",
    "#.........................T..#",
    "#....E.......................#",
    "#...............K............#",
    "#.........######.............#",
    "#............................#",
    "#..............T.............#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#..D.........#####....T......#",
    "#.........E..................#",
    "#..######..............#####.#",
    "#....S.......................#",
    "#.............T........E.....#",
    "#....#####...................#",
    "#......................T.....#",
    "#..P........G................#",
    "#...........######...........#",
    "#....................E.......#",
    "#....T.......................#",
    "#..................K.........#",
    "#.........######.........T...#",
    "#............................#",
    "#..............E.............#",
    "#............................#",
    "##############################"
  ]),
  makeTemplate([
    "##############################",
    "#...D.........#####.....T....#",
    "#.......E....................#",
    "#..######.........E..........#",
    "#....S.......................#",
    "#.............T..............#",
    "#....#####.............#####.#",
    "#.................T..........#",
    "#..P........G.............E..#",
    "#..........######............#",
    "#......................T.....#",
    "#.....E......................#",
    "#.................K..........#",
    "#.........######.............#",
    "#......................T.....#",
    "#..............E.............#",
    "#............................#",
    "##############################"
  ])
];

function parseLevel(rows) {
  const tiles = rows.map(r => r.split(""));
  const entities = { enemies: [], trophies: [], hazards: [], bullets: [] };
  const player = { x: TILE * 2, y: TILE * 8, w: 24, h: 28, vx: 0, vy: 0, onGround: false, dir: 1, alive: true, hasGun: false, hasKey: false };
  let door = { x: TILE * 2, y: TILE * 2, w: TILE, h: TILE * 1.5 };

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const c = tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (c === "P") {
        player.x = px + 4;
        player.y = py - 2;
        tiles[y][x] = ".";
      } else if (c === "E") {
        entities.enemies.push({ x: px + 4, y: py + 6, w: 24, h: 24, vx: Math.random() > 0.5 ? 1.2 : -1.2, alive: true });
        tiles[y][x] = ".";
      } else if (c === "T") {
        entities.trophies.push({ x: px + 8, y: py + 8, w: 16, h: 16, taken: false });
        tiles[y][x] = ".";
      } else if (c === "K") {
        entities.key = { x: px + 8, y: py + 8, w: 16, h: 16, taken: false };
        tiles[y][x] = ".";
      } else if (c === "G") {
        entities.gun = { x: px + 8, y: py + 8, w: 16, h: 16, taken: false };
        tiles[y][x] = ".";
      } else if (c === "D") {
        door = { x: px, y: py - 16, w: TILE, h: TILE * 1.5 };
        tiles[y][x] = ".";
      } else if (c === "S") {
        entities.hazards.push({ x: px, y: py + 16, w: TILE, h: 16 });
        tiles[y][x] = ".";
      }
    }
  }

  return { tiles, entities, player, door };
}

let state = {
  level: 0,
  lives: 3,
  score: 0,
  ammo: 0,
  gameOver: false,
  gameWin: false,
  restartHeld: false,
  enterHeld: false
};

let world = parseLevel(LEVEL_TEMPLATES[state.level]);

function solidAt(tx, ty) {
  if (ty < 0 || ty >= GRID_H || tx < 0 || tx >= GRID_W) return true;
  return world.tiles[ty][tx] === "#";
}

function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function movePlayer() {
  const p = world.player;
  p.vx = 0;
  if (keys.has("ArrowLeft")) { p.vx = -MOVE_SPEED; p.dir = -1; }
  if (keys.has("ArrowRight")) { p.vx = MOVE_SPEED; p.dir = 1; }
  if (keys.has("KeyZ") && p.onGround) {
    p.vy = JUMP_SPEED;
    p.onGround = false;
    SFX.jump();
  }

  p.vy = Math.min(MAX_FALL, p.vy + GRAVITY);

  p.x += p.vx;
  resolveCollision(p, "x");

  p.y += p.vy;
  p.onGround = false;
  resolveCollision(p, "y");

  if (p.y > canvas.height + 100) {
    loseLife();
  }
}

function resolveCollision(ent, axis) {
  const left = Math.floor(ent.x / TILE);
  const right = Math.floor((ent.x + ent.w - 1) / TILE);
  const top = Math.floor(ent.y / TILE);
  const bottom = Math.floor((ent.y + ent.h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (!solidAt(tx, ty)) continue;
      const tileRect = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
      if (!rectCollide(ent, tileRect)) continue;
      if (axis === "x") {
        if (ent.vx > 0) ent.x = tileRect.x - ent.w;
        if (ent.vx < 0) ent.x = tileRect.x + tileRect.w;
        ent.vx = 0;
      } else {
        if (ent.vy > 0) {
          ent.y = tileRect.y - ent.h;
          ent.onGround = true;
        }
        if (ent.vy < 0) ent.y = tileRect.y + tileRect.h;
        ent.vy = 0;
      }
    }
  }
}

function shootIfNeeded() {
  const p = world.player;
  if (!keys.has("KeyX") || !p.hasGun || state.ammo <= 0 || state.shootHeld) return;
  state.shootHeld = true;
  state.ammo--;
  world.entities.bullets.push({
    x: p.x + p.w / 2,
    y: p.y + p.h / 2,
    w: 8,
    h: 3,
    vx: p.dir * 7
  });
  SFX.shoot();
}

function updateBullets() {
  for (const b of world.entities.bullets) {
    b.x += b.vx;
    const tx = Math.floor(b.x / TILE);
    const ty = Math.floor(b.y / TILE);
    if (solidAt(tx, ty)) b.dead = true;
    for (const e of world.entities.enemies) {
      if (!e.alive) continue;
      if (rectCollide(b, e)) {
        e.alive = false;
        b.dead = true;
        state.score += 125;
        SFX.hit();
      }
    }
  }
  world.entities.bullets = world.entities.bullets.filter(b => !b.dead && b.x > -20 && b.x < canvas.width + 20);
}

function updateEnemies() {
  for (const e of world.entities.enemies) {
    if (!e.alive) continue;
    e.x += e.vx;
    const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
    const footY = e.y + e.h + 2;
    const tx = Math.floor(aheadX / TILE);
    const ty = Math.floor((e.y + e.h / 2) / TILE);
    const floorTy = Math.floor(footY / TILE);

    if (solidAt(tx, ty) || !solidAt(tx, floorTy)) e.vx *= -1;

    if (rectCollide(world.player, e)) loseLife();
  }
}

function collectables() {
  const p = world.player;
  const ent = world.entities;

  for (const t of ent.trophies) {
    if (!t.taken && rectCollide(p, t)) {
      t.taken = true;
      state.score += 200;
      SFX.pickup();
    }
  }

  if (ent.key && !ent.key.taken && rectCollide(p, ent.key)) {
    ent.key.taken = true;
    p.hasKey = true;
    state.score += 500;
    SFX.pickup();
  }

  if (ent.gun && !ent.gun.taken && rectCollide(p, ent.gun)) {
    ent.gun.taken = true;
    p.hasGun = true;
    state.ammo += 8;
    SFX.pickup();
  }

  for (const h of ent.hazards) {
    if (rectCollide(p, h)) loseLife();
  }

  const needed = ent.trophies.length;
  const got = ent.trophies.filter(t => t.taken).length;
  if (rectCollide(p, world.door) && p.hasKey && got === needed) {
    SFX.door();
    state.score += 1000;
    state.level++;
    if (state.level >= LEVEL_TEMPLATES.length) {
      state.gameWin = true;
      SFX.win();
    } else {
      world = parseLevel(LEVEL_TEMPLATES[state.level]);
    }
  }
}

function loseLife() {
  if (!world.player.alive) return;
  world.player.alive = false;
  SFX.death();
  state.lives--;
  setTimeout(() => {
    if (state.lives < 0) {
      state.gameOver = true;
    } else {
      world = parseLevel(LEVEL_TEMPLATES[state.level]);
    }
  }, 350);
}

function resetAll() {
  state = { level: 0, lives: 3, score: 0, ammo: 0, gameOver: false, gameWin: false, restartHeld: false, enterHeld: false };
  world = parseLevel(LEVEL_TEMPLATES[0]);
}

function drawTile(x, y, c) {
  if (c !== "#") return;
  ctx.fillStyle = palette.wall;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.fillStyle = palette.platform;
  ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, 8);
}

function drawRect(obj, color) {
  ctx.fillStyle = color;
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
}

function render() {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  world.tiles.forEach((row, y) => row.forEach((c, x) => drawTile(x, y, c)));
  drawRect(world.door, palette.door);

  for (const h of world.entities.hazards) drawRect(h, palette.spike);
  for (const t of world.entities.trophies) if (!t.taken) drawRect(t, palette.trophy);
  if (world.entities.key && !world.entities.key.taken) drawRect(world.entities.key, palette.key);
  if (world.entities.gun && !world.entities.gun.taken) drawRect(world.entities.gun, palette.gun);

  for (const e of world.entities.enemies) if (e.alive) drawRect(e, palette.enemy);
  for (const b of world.entities.bullets) drawRect(b, palette.bullet);
  drawRect(world.player, palette.player);

  if (state.gameOver || state.gameWin) {
    ctx.fillStyle = "rgba(0,0,0,.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 44px Segoe UI";
    ctx.fillText(state.gameOver ? "GAME OVER" : "YOU WIN!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "24px Segoe UI";
    ctx.fillText("Press Enter to restart", canvas.width / 2, canvas.height / 2 + 30);
  }
}

function updateHUD() {
  const total = world.entities.trophies.length;
  const got = world.entities.trophies.filter(t => t.taken).length;
  hud.level.textContent = `Level: ${Math.min(state.level + 1, LEVEL_TEMPLATES.length)}`;
  hud.lives.textContent = `Lives: ${Math.max(0, state.lives)}`;
  hud.score.textContent = `Score: ${state.score}`;
  hud.ammo.textContent = `Ammo: ${state.ammo}`;
  hud.trophies.textContent = `Trophies: ${got} / ${total}`;
}

function tick() {
  if (keys.has("KeyR") && !state.restartHeld) {
    state.restartHeld = true;
    world = parseLevel(LEVEL_TEMPLATES[state.level]);
  }
  if (!keys.has("KeyR")) state.restartHeld = false;

  if ((state.gameOver || state.gameWin) && keys.has("Enter") && !state.enterHeld) {
    state.enterHeld = true;
    resetAll();
  }
  if (!keys.has("Enter")) state.enterHeld = false;

  if (!state.gameOver && !state.gameWin) {
    movePlayer();
    shootIfNeeded();
    if (!keys.has("KeyX")) state.shootHeld = false;
    updateBullets();
    updateEnemies();
    collectables();
  }

  updateHUD();
  render();
  requestAnimationFrame(tick);
}

tick();
