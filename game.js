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
  sky1: "#000000",
  sky2: "#000000",
  mountain: "#101010",
  ground: "#0010a8",
  brickDark: "#0010a8",
  brickMid: "#2858ff",
  brickLight: "#58a8ff",
  playerHat: "#ff3030",
  playerShirt: "#00a800",
  playerSkin: "#ffd7a8",
  playerPants: "#2050ff",
  trophy: "#ffd030",
  key: "#ffff58",
  gun: "#a8a8a8",
  enemy: "#ff5858",
  hazard: "#f8f8f8",
  door: "#00a800",
  bullet: "#ffd7a8",
  hudBg: "#000000",
  hudText: "#f8f8f8"
};

const SPRITES = {
  playerStandR: [
    "...RRR.....",
    "..RRRRR....",
    "...SSS.....",
    "..SSsS.....",
    "...GGGG....",
    "..GGGGGG...",
    "..GGGGGG...",
    "...BBBB....",
    "..BB..BB...",
  ],
  playerStandL: [
    ".....RRR...",
    "....RRRRR..",
    ".....SSS...",
    ".....SsSS..",
    "....GGGG...",
    "...GGGGGG..",
    "...GGGGGG..",
    "....BBBB...",
    "...BB..BB..",
  ],
  playerWalkR: [
    "...RRR.....",
    "..RRRRR....",
    "...SSS.....",
    "..SSsS.....",
    "...GGGG....",
    "..GGGGGG...",
    "..GGGGGG...",
    "...BBBB....",
    "..B...BB...",
  ],
  playerWalkL: [
    ".....RRR...",
    "....RRRRR..",
    ".....SSS...",
    ".....SsSS..",
    "....GGGG...",
    "...GGGGGG..",
    "...GGGGGG..",
    "....BBBB...",
    "...BB...B..",
  ],
  enemyA: [
    "..EEEEEE...",
    ".EeeeeeeE..",
    ".E.e..e.E..",
    ".EEEEEEEE..",
    "..E.EE.E...",
    ".E..EE..E..",
  ],
  enemyB: [
    "..EEEEEE...",
    ".EeeeeeeE..",
    ".E.e..e.E..",
    ".EEEEEEEE..",
    ".E..EE..E..",
    "..E.EE.E...",
  ],
  trophy: [
    "..TTTT..",
    ".TTTTTT.",
    "..TTTT..",
    "...TT...",
    "..TTTT..",
  ],
  key: [
    ".KKK....",
    "K...K...",
    ".KKK.KKK",
  ],
  gun: [
    "GGGGGG..",
    "..GG....",
    "..GG....",
  ],
};

const SPRITE_COLORS = {
  R: palette.playerHat,
  S: palette.playerSkin,
  s: "#111111",
  G: palette.playerShirt,
  B: palette.playerPants,
  E: palette.enemy,
  e: "#3a0000",
  T: palette.trophy,
  K: palette.key,
};

function drawSprite(px, py, data, colors = SPRITE_COLORS) {
  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === ".") continue;
      ctx.fillStyle = colors[c] || "#fff";
      ctx.fillRect(px + x, py + y, 1, 1);
    }
  }
}


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
let frameCount = 0;

function cameraOffsetX() {
  return 0;
}

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
  ctx.fillStyle = "#000";
  ctx.fillRect(0, HUD_H, canvas.width, canvas.height - HUD_H);

  ctx.fillStyle = "#111";
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.fillRect(x, HUD_H + 136, 16, 2);
  }

  ctx.fillStyle = "#202020";
  for (let i = 0; i < 20; i++) {
    const x = (i * 43 + (frameCount % 32)) % canvas.width;
    const y = HUD_H + ((i * 29) % 120);
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawTile(x, y, c) {
  if (c !== "#") return;
  const px = x * TILE;
  const py = y * TILE + HUD_H;
  ctx.fillStyle = palette.brickDark;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = palette.brickMid;
  ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = palette.brickLight;
  ctx.fillRect(px + 2, py + 2, TILE - 4, 2);
  ctx.fillRect(px + 2, py + 8, TILE - 4, 1);
  ctx.fillStyle = "#0030d0";
  ctx.fillRect(px + 2, py + TILE - 3, TILE - 4, 1);
}

function drawPlayer(p) {
  const x = Math.round(p.x);
  const y = Math.round(p.y + HUD_H);
  const moving = Math.abs(p.vx) > 0.05;
  const walk = moving && Math.floor(frameCount / 10) % 2 === 0;
  const sprite = p.dir > 0 ? (walk ? SPRITES.playerWalkR : SPRITES.playerStandR) : (walk ? SPRITES.playerWalkL : SPRITES.playerStandL);
  drawSprite(x, y, sprite);
}

function drawEnemy(enemy) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y + HUD_H + 2);
  const sprite = Math.floor(frameCount / 14) % 2 === 0 ? SPRITES.enemyA : SPRITES.enemyB;
  drawSprite(x, y, sprite);
}

function drawTrophy(t) {
  drawSprite(Math.round(t.x), Math.round(t.y + HUD_H + 1), SPRITES.trophy);
}

function drawKey(k) {
  drawSprite(Math.round(k.x), Math.round(k.y + HUD_H + 1), SPRITES.key);
}

function drawGun(g) {
  const x = Math.round(g.x);
  const y = Math.round(g.y + HUD_H + 2);
  ctx.fillStyle = palette.gun;
  drawSprite(x, y, SPRITES.gun, { G: palette.gun });
}

function drawDoor(d) {
  const x = Math.round(d.x);
  const y = Math.round(d.y + HUD_H);
  ctx.fillStyle = "#005000";
  ctx.fillRect(x, y, d.w, d.h);
  ctx.fillStyle = palette.door;
  ctx.fillRect(x + 2, y + 2, d.w - 4, d.h - 4);
  ctx.fillStyle = "#001000";
  ctx.fillRect(x + d.w - 4, y + Math.floor(d.h / 2), 2, 2);
}

function drawHazard(h) {
  const x = Math.round(h.x);
  const y = Math.round(h.y + HUD_H);
  ctx.fillStyle = palette.hazard;
  for (let i = 0; i < h.w; i += 4) {
    ctx.fillRect(x + i, y + h.h - 1, 4, 1);
    ctx.fillRect(x + i + 1, y + h.h - 2, 2, 1);
    ctx.fillRect(x + i + 2, y + h.h - 3, 1, 1);
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
  const levelText = `LEVEL ${Math.min(state.level + 1, LEVEL_TEMPLATES.length)}`;
  const scoreText = `SCORE ${state.score.toString().padStart(5, "0")}`;
  const livesText = `DAVE ${state.lives}`;
  const ammoText = `AMMO ${state.ammo}`;
  const trophyText = `GOLD ${trophiesGot}/${trophiesTotal}`;

  ctx.fillText(levelText, 4, 9);
  ctx.fillText(scoreText, 62, 9);
  ctx.fillText(livesText, 154, 9);
  ctx.fillText(ammoText, 210, 9);
  ctx.fillText(trophyText, 262, 9);
}

function drawOverlay() {
  if (!state.gameOver && !state.gameWin) return;
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(0, HUD_H, canvas.width, canvas.height - HUD_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 14px monospace";
  ctx.fillText(state.gameOver ? "DAVE DIED" : "LEVELS CLEARED", canvas.width / 2, 92 + HUD_H);
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

  frameCount++;
  render();
  requestAnimationFrame(tick);
}

tick();
