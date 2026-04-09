const TILE = 16;
const GRID_W = 20;
const GRID_H = 12;
const HUD_H = 16;

const GRAVITY = 0.24;
const MAX_FALL = 4.8;
const MOVE_SPEED = 1.35;
const JUMP_SPEED = -4.7;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });

const keys = new Set();
const handledKeys = ["ArrowLeft", "ArrowRight", "KeyZ", "KeyX", "KeyR", "Enter", "Space"];

addEventListener("keydown", (e) => {
  if (handledKeys.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (audioCtx.state === "suspended") audioCtx.resume();
});
addEventListener("keyup", (e) => keys.delete(e.code));

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function tone(freq = 300, duration = 0.08, type = "square", volume = 0.03, slide = 0) {
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

const SFX = {
  jump: () => tone(420, 0.08, "square", 0.04, 130),
  shoot: () => tone(155, 0.07, "square", 0.04, -70),
  pickup: () => {
    tone(640, 0.06, "square", 0.045, 180);
    setTimeout(() => tone(900, 0.08, "square", 0.04, 60), 50);
  },
  enemy: () => tone(190, 0.16, "triangle", 0.06, -120),
  death: () => tone(140, 0.35, "sawtooth", 0.07, -110),
  door: () => {
    tone(450, 0.08, "square", 0.04, 40);
    setTimeout(() => tone(630, 0.11, "square", 0.03, 20), 90);
  },
  win: () => [420, 520, 620, 760].forEach((n, i) => setTimeout(() => tone(n, 0.1, "square", 0.035), i * 120))
};

const palette = {
  sky1: "#120d2c",
  sky2: "#2a1f5e",
  mountain: "#1d3c8f",
  ground: "#0f2258",
  brickDark: "#1f4ca5",
  brickLight: "#6db6ff",
  playerHat: "#e21863",
  playerShirt: "#00d3c8",
  playerSkin: "#ffd29f",
  playerPants: "#2141c9",
  trophy: "#ffd83c",
  key: "#8bff63",
  gun: "#d2d2ff",
  enemy: "#e74a5f",
  hazard: "#f2f2f2",
  door: "#7f58ff",
  bullet: "#ffe4af",
  hudBg: "#02020e",
  hudText: "#f8f8f8"
};

function makeTemplate(rows) {
  return rows.map((r) => r.padEnd(GRID_W, ".").slice(0, GRID_W));
}

const LEVEL_TEMPLATES = [
  makeTemplate([
    "####################",
    "#....T.........D...#",
    "#........####......#",
    "#..E...............#",
    "#......S...........#",
    "#.........T........#",
    "#....####......E...#",
    "#...............G..#",
    "#..P................",
    "#.......####.......#",
    "#....K.............#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#...D..............#",
    "#......####....T...#",
    "#..E...............#",
    "#....S......E......#",
    "#...............####",
    "#..P......G........#",
    "#.......####.......#",
    "#.............T....#",
    "#....E.............#",
    "#........K.........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#..D......####.....#",
    "#.....T............#",
    "#.........E........#",
    "#..S..........###..#",
    "#....####........E.#",
    "#..P........G......#",
    "#.......T..........#",
    "#............####..#",
    "#...E..............#",
    "#.......K..........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#....D...........T.#",
    "#..####......E.....#",
    "#..........####....#",
    "#..S................",
    "#....T.........E...#",
    "#..P......G........#",
    "#.........####.....#",
    "#..E...............#",
    "#......####........#",
    "#....K.............#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#..D.....####......#",
    "#.......T......E...#",
    "#..E..........###..#",
    "#..S................",
    "#......T............#",
    "#..P........G...E..#",
    "#......####........#",
    "#..............T...#",
    "#....E.............#",
    "#........K.........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#...D...........T..#",
    "#......####........#",
    "#...E............E.#",
    "#...S..............#",
    "#.......T.....####.#",
    "#..P.......G.......#",
    "#......####........#",
    "#..............T...#",
    "#....E.............#",
    "#.......K..........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#..D.....####......#",
    "#.....E........T...#",
    "#..###.............#",
    "#..S......E........#",
    "#.......T.....####.#",
    "#..P.......G.......#",
    "#......####....E...#",
    "#..............T...#",
    "#....E.............#",
    "#........K.........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#...D...........T..#",
    "#....####....E.....#",
    "#.........###......#",
    "#..S..........E....#",
    "#......T...........#",
    "#..P......G....###.#",
    "#....E.............#",
    "#...........####...#",
    "#...............T..#",
    "#......K...........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#..D.......####....#",
    "#......E........T..#",
    "#...###...........##",
    "#..S..........E....#",
    "#....T.............#",
    "#..P......G...###..#",
    "#......E...........#",
    "#...........####...#",
    "#...............T..#",
    "#.......K..........#",
    "####################"
  ]),
  makeTemplate([
    "####################",
    "#...D.....####....T#",
    "#.....E............#",
    "#..###.........E...#",
    "#..S................",
    "#....T.......####..#",
    "#..P......G........#",
    "#......E.......###.#",
    "#.........####.....#",
    "#.............T....#",
    "#.......K..........#",
    "####################"
  ])
];

function parseLevel(rows) {
  const tiles = rows.map((r) => r.split(""));
  const entities = { enemies: [], trophies: [], hazards: [], bullets: [] };
  const player = {
    x: TILE * 2 + 2,
    y: TILE * 8,
    w: 11,
    h: 14,
    vx: 0,
    vy: 0,
    dir: 1,
    onGround: false,
    hasKey: false,
    hasGun: false,
    alive: true
  };
  let door = { x: TILE * 17, y: TILE, w: TILE, h: TILE * 2 - 2 };

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const c = tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;

      if (c === "P") {
        player.x = px + 2;
        player.y = py + 1;
        tiles[y][x] = ".";
      } else if (c === "E") {
        entities.enemies.push({ x: px + 2, y: py + 2, w: 11, h: 12, vx: Math.random() > 0.5 ? 0.7 : -0.7, alive: true });
        tiles[y][x] = ".";
      } else if (c === "T") {
        entities.trophies.push({ x: px + 4, y: py + 3, w: 8, h: 9, taken: false });
        tiles[y][x] = ".";
      } else if (c === "K") {
        entities.key = { x: px + 4, y: py + 5, w: 8, h: 6, taken: false };
        tiles[y][x] = ".";
      } else if (c === "G") {
        entities.gun = { x: px + 3, y: py + 5, w: 10, h: 6, taken: false };
        tiles[y][x] = ".";
      } else if (c === "D") {
        door = { x: px + 1, y: py - 13, w: 14, h: 29 };
        tiles[y][x] = ".";
      } else if (c === "S") {
        entities.hazards.push({ x: px, y: py + 10, w: TILE, h: 6 });
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
  shootHeld: false,
  restartHeld: false,
  enterHeld: false,
  gameOver: false,
  gameWin: false
};

let world = parseLevel(LEVEL_TEMPLATES[state.level]);

function solidAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) return true;
  return world.tiles[ty][tx] === "#";
}

function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveCollision(entity, axis) {
  const left = Math.floor(entity.x / TILE);
  const right = Math.floor((entity.x + entity.w - 1) / TILE);
  const top = Math.floor(entity.y / TILE);
  const bottom = Math.floor((entity.y + entity.h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (!solidAt(tx, ty)) continue;
      const tileRect = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
      if (!rectCollide(entity, tileRect)) continue;

      if (axis === "x") {
        if (entity.vx > 0) entity.x = tileRect.x - entity.w;
        else if (entity.vx < 0) entity.x = tileRect.x + tileRect.w;
        entity.vx = 0;
      } else {
        if (entity.vy > 0) {
          entity.y = tileRect.y - entity.h;
          entity.onGround = true;
        } else if (entity.vy < 0) {
          entity.y = tileRect.y + tileRect.h;
        }
        entity.vy = 0;
      }
    }
  }
}

function movePlayer() {
  const p = world.player;
  p.vx = 0;

  if (keys.has("ArrowLeft")) {
    p.vx = -MOVE_SPEED;
    p.dir = -1;
  }
  if (keys.has("ArrowRight")) {
    p.vx = MOVE_SPEED;
    p.dir = 1;
  }
  if ((keys.has("KeyZ") || keys.has("Space")) && p.onGround) {
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

  if (p.y > GRID_H * TILE + 24) loseLife();
}

function shootIfNeeded() {
  const p = world.player;
  if (!keys.has("KeyX") || !p.hasGun || state.ammo <= 0 || state.shootHeld) return;
  state.shootHeld = true;
  state.ammo--;
  world.entities.bullets.push({
    x: p.x + (p.dir > 0 ? 10 : -2),
    y: p.y + 6,
    w: 4,
    h: 2,
    vx: p.dir * 3.7
  });
  SFX.shoot();
}

function updateBullets() {
  for (const bullet of world.entities.bullets) {
    bullet.x += bullet.vx;
    const tx = Math.floor(bullet.x / TILE);
    const ty = Math.floor(bullet.y / TILE);
    if (solidAt(tx, ty)) bullet.dead = true;

    for (const enemy of world.entities.enemies) {
      if (!enemy.alive) continue;
      if (rectCollide(bullet, enemy)) {
        bullet.dead = true;
        enemy.alive = false;
        state.score += 125;
        SFX.enemy();
      }
    }
  }

  world.entities.bullets = world.entities.bullets.filter((b) => !b.dead && b.x > -8 && b.x < GRID_W * TILE + 8);
}

function updateEnemies() {
  for (const enemy of world.entities.enemies) {
    if (!enemy.alive) continue;

    enemy.x += enemy.vx;
    const aheadX = enemy.vx > 0 ? enemy.x + enemy.w + 1 : enemy.x - 1;
    const wallTx = Math.floor(aheadX / TILE);
    const bodyTy = Math.floor((enemy.y + enemy.h / 2) / TILE);
    const floorTy = Math.floor((enemy.y + enemy.h + 1) / TILE);

    if (solidAt(wallTx, bodyTy) || !solidAt(wallTx, floorTy)) enemy.vx *= -1;
    if (rectCollide(world.player, enemy)) loseLife();
  }
}

function collectables() {
  const p = world.player;
  const ent = world.entities;

  for (const trophy of ent.trophies) {
    if (!trophy.taken && rectCollide(p, trophy)) {
      trophy.taken = true;
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

  for (const hazard of ent.hazards) {
    if (rectCollide(p, hazard)) loseLife();
  }

  const totalTrophies = ent.trophies.length;
  const collectedTrophies = ent.trophies.filter((t) => t.taken).length;

  if (rectCollide(p, world.door) && p.hasKey && collectedTrophies === totalTrophies) {
    state.score += 1000;
    state.level++;
    SFX.door();

    if (state.level >= LEVEL_TEMPLATES.length) {
      state.gameWin = true;
      SFX.win();
    } else {
      world = parseLevel(LEVEL_TEMPLATES[state.level]);
    }
  }
}

function loseLife() {
  if (!world.player.alive || state.gameOver || state.gameWin) return;
  world.player.alive = false;
  state.lives--;
  SFX.death();

  setTimeout(() => {
    if (state.lives <= 0) {
      state.gameOver = true;
    } else {
      world = parseLevel(LEVEL_TEMPLATES[state.level]);
    }
  }, 320);
}

function resetAll() {
  state = {
    level: 0,
    lives: 3,
    score: 0,
    ammo: 0,
    shootHeld: false,
    restartHeld: false,
    enterHeld: false,
    gameOver: false,
    gameWin: false
  };
  world = parseLevel(LEVEL_TEMPLATES[0]);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, HUD_H, 0, canvas.height);
  g.addColorStop(0, palette.sky2);
  g.addColorStop(1, palette.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, HUD_H, canvas.width, canvas.height - HUD_H);

  ctx.fillStyle = palette.mountain;
  ctx.fillRect(0, 112 + HUD_H, 64, 72);
  ctx.fillRect(44, 94 + HUD_H, 84, 90);
  ctx.fillRect(118, 124 + HUD_H, 70, 60);
  ctx.fillRect(174, 103 + HUD_H, 78, 81);
  ctx.fillRect(238, 114 + HUD_H, 82, 70);

  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, 176 + HUD_H, canvas.width, 24);

  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 30; i++) {
    const x = (i * 31) % canvas.width;
    const y = HUD_H + ((i * 47) % 120);
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawTile(x, y, c) {
  if (c !== "#") return;
  const px = x * TILE;
  const py = y * TILE + HUD_H;
  ctx.fillStyle = palette.brickDark;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = palette.brickLight;
  ctx.fillRect(px + 1, py + 1, TILE - 2, 4);
  ctx.fillRect(px + 1, py + 8, TILE - 2, 2);
}

function drawPlayer(p) {
  const x = Math.round(p.x);
  const y = Math.round(p.y + HUD_H);
  ctx.fillStyle = palette.playerHat;
  ctx.fillRect(x + 2, y, 8, 3);
  ctx.fillStyle = palette.playerSkin;
  ctx.fillRect(x + 3, y + 3, 6, 4);
  ctx.fillStyle = palette.playerShirt;
  ctx.fillRect(x + 2, y + 7, 8, 4);
  ctx.fillStyle = palette.playerPants;
  ctx.fillRect(x + 2, y + 11, 3, 3);
  ctx.fillRect(x + 7, y + 11, 3, 3);
  ctx.fillStyle = "#0b0b0b";
  const eyeX = p.dir > 0 ? x + 8 : x + 3;
  ctx.fillRect(eyeX, y + 4, 1, 1);
}

function drawEnemy(enemy) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y + HUD_H);
  ctx.fillStyle = palette.enemy;
  ctx.fillRect(x + 1, y + 2, 9, 8);
  ctx.fillStyle = "#22040a";
  ctx.fillRect(x + 3, y + 4, 1, 1);
  ctx.fillRect(x + 7, y + 4, 1, 1);
}

function drawTrophy(t) {
  const x = Math.round(t.x);
  const y = Math.round(t.y + HUD_H);
  ctx.fillStyle = palette.trophy;
  ctx.fillRect(x + 2, y + 1, 4, 3);
  ctx.fillRect(x + 3, y + 4, 2, 3);
  ctx.fillRect(x + 2, y + 7, 4, 1);
}

function drawKey(k) {
  const x = Math.round(k.x);
  const y = Math.round(k.y + HUD_H);
  ctx.fillStyle = palette.key;
  ctx.fillRect(x + 1, y + 1, 3, 3);
  ctx.fillRect(x + 4, y + 2, 3, 1);
  ctx.fillRect(x + 6, y + 2, 1, 2);
}

function drawGun(g) {
  const x = Math.round(g.x);
  const y = Math.round(g.y + HUD_H);
  ctx.fillStyle = palette.gun;
  ctx.fillRect(x + 1, y + 2, 7, 2);
  ctx.fillRect(x + 4, y + 4, 2, 2);
}

function drawDoor(d) {
  const x = Math.round(d.x);
  const y = Math.round(d.y + HUD_H);
  ctx.fillStyle = palette.door;
  ctx.fillRect(x, y, d.w, d.h);
  ctx.fillStyle = "#cab7ff";
  ctx.fillRect(x + 2, y + 2, d.w - 4, d.h - 5);
  ctx.fillStyle = "#673bd9";
  ctx.fillRect(x + d.w - 4, y + Math.floor(d.h / 2), 2, 2);
}

function drawHazard(h) {
  const x = Math.round(h.x);
  const y = Math.round(h.y + HUD_H);
  ctx.fillStyle = palette.hazard;
  for (let i = 0; i < h.w; i += 4) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h.h);
    ctx.lineTo(x + i + 2, y);
    ctx.lineTo(x + i + 4, y + h.h);
    ctx.fill();
  }
}

function drawHUD() {
  ctx.fillStyle = palette.hudBg;
  ctx.fillRect(0, 0, canvas.width, HUD_H);
  ctx.fillStyle = palette.hudText;
  ctx.font = "8px monospace";
  ctx.textBaseline = "middle";

  const trophiesTotal = world.entities.trophies.length;
  const trophiesGot = world.entities.trophies.filter((t) => t.taken).length;
  const levelText = `L ${Math.min(state.level + 1, LEVEL_TEMPLATES.length)}`;
  const scoreText = `S ${state.score.toString().padStart(5, "0")}`;
  const livesText = `V ${state.lives}`;
  const ammoText = `A ${state.ammo}`;
  const trophyText = `T ${trophiesGot}/${trophiesTotal}`;

  ctx.fillText(levelText, 6, 9);
  ctx.fillText(scoreText, 48, 9);
  ctx.fillText(livesText, 136, 9);
  ctx.fillText(ammoText, 176, 9);
  ctx.fillText(trophyText, 216, 9);
}

function drawOverlay() {
  if (!state.gameOver && !state.gameWin) return;
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(0, HUD_H, canvas.width, canvas.height - HUD_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 14px monospace";
  ctx.fillText(state.gameOver ? "GAME OVER" : "YOU DID IT!", canvas.width / 2, 92 + HUD_H);
  ctx.font = "9px monospace";
  ctx.fillText("Press ENTER to restart", canvas.width / 2, 110 + HUD_H);
  ctx.textAlign = "start";
}

function drawScanlines() {
  ctx.fillStyle = "rgba(0,0,0,0.09)";
  for (let y = 0; y < canvas.height; y += 2) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function render() {
  drawBackground();
  world.tiles.forEach((row, y) => row.forEach((cell, x) => drawTile(x, y, cell)));
  drawDoor(world.door);

  for (const hazard of world.entities.hazards) drawHazard(hazard);
  for (const trophy of world.entities.trophies) if (!trophy.taken) drawTrophy(trophy);
  if (world.entities.key && !world.entities.key.taken) drawKey(world.entities.key);
  if (world.entities.gun && !world.entities.gun.taken) drawGun(world.entities.gun);

  for (const enemy of world.entities.enemies) if (enemy.alive) drawEnemy(enemy);
  for (const bullet of world.entities.bullets) {
    ctx.fillStyle = palette.bullet;
    ctx.fillRect(Math.round(bullet.x), Math.round(bullet.y + HUD_H), bullet.w, bullet.h);
  }
  drawPlayer(world.player);
  drawHUD();
  drawOverlay();
  drawScanlines();
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

  render();
  requestAnimationFrame(tick);
}

tick();
