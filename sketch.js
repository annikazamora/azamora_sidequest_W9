/* Week 9 — Example 3: Adding Sound & Music
Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Mar. 19, 2026

Controls:
A or D (Left / Right Arrow)  Horizontal movement
W (Up Arrow)                Jump
Space Bar                   Attack
M                           Toggle debug screen
G                           Toggle moon gravity on/off

Tile key:
g = groundTile.png (surface ground)
d = groundTileDeep.png (deep ground, below surface)
  = empty (no sprite)
*/

let player;
let playerImg, bgImg;
let jumpSfx, musicSfx;
let musicStarted = false;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep;
let groundImg, groundDeepImg;
let sensor;

let attacking = false;
let attackFrameCounter = 0;

// --- DEBUG / GRAVITY SETTINGS ---
let showDebug = false;
let moonGravityOn = false;
let showHitboxes = false;

const NORMAL_GRAVITY = 10;
const MOON_GRAVITY = 1.6;

const NORMAL_JUMP = -4;
const MOON_JUMP = -2.2;

// --- TILE MAP ---
let level = [
  "              ",
  "              ",
  "              ",
  "              ",
  "              ",
  "   ggg        ",
  "gggggggggggggg",
  "dddddddddddddd",
];

// --- LEVEL CONSTANTS ---
const VIEWW = 320,
  VIEWH = 180;
const TILE_W = 24,
  TILE_H = 24;
const FRAME_W = 32,
  FRAME_H = 32;
const MAP_START_Y = VIEWH - TILE_H * 4;

function preload() {
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  if (typeof loadSound === "function") {
    jumpSfx = loadSound("assets/sfx/jump.wav");
    musicSfx = loadSound("assets/sfx/music.wav");
  }
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;

  applyGravityMode();

  if (musicSfx) musicSfx.setLoop(true);
  startMusicIfNeeded();

  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  new Tiles(level, 0, 0, TILE_W, TILE_H);

  player = new Sprite(FRAME_W, MAP_START_Y, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;

  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4;
  player.addAnis(playerAnis);

  player.ani = "idle";
  player.w = 18;
  player.h = 20;
  player.friction = 0;
  player.bounciness = 0;

  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;

  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;
}

function applyGravityMode() {
  world.gravity.y = moonGravityOn ? MOON_GRAVITY : NORMAL_GRAVITY;
}

function getJumpStrength() {
  return moonGravityOn ? MOON_JUMP : NORMAL_JUMP;
}

function toggleMoonGravity() {
  moonGravityOn = !moonGravityOn;
  applyGravityMode();
}

function startMusicIfNeeded() {
  if (musicStarted || !musicSfx) return;

  const startLoop = () => {
    if (!musicSfx.isPlaying()) musicSfx.play();
    musicStarted = musicSfx.isPlaying();
  };

  const maybePromise = userStartAudio();
  if (maybePromise && typeof maybePromise.then === "function") {
    maybePromise.then(startLoop).catch(() => {});
  } else {
    startLoop();
  }
}

function keyPressed() {
  startMusicIfNeeded();

  if (key === "m" || key === "M") {
    showDebug = !showDebug;
  }

  if (key === "g" || key === "G") {
    toggleMoonGravity();
  }

  if (key === "h" || key === "H") {
    showHitboxes = !showHitboxes;
  }
}

function mousePressed() {
  startMusicIfNeeded();
}

function touchStarted() {
  startMusicIfNeeded();
  return false;
}

function draw() {
  // --- BACKGROUND ---
  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, bgImg.width, bgImg.height);
  camera.on();

  // --- PLAYER CONTROLS ---
  let grounded = sensor.overlapping(ground);

  // -- ATTACK INPUT --
  if (grounded && !attacking && kb.presses("space")) {
    attacking = true;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play();
  }

  // -- JUMP --
  if (grounded && kb.presses("up")) {
    player.vel.y = getJumpStrength();
    if (jumpSfx) jumpSfx.play();
  }

  // --- STATE MACHINE ---
  if (attacking) {
    attackFrameCounter++;

    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
    }
  } else if (!grounded) {
    player.ani = "jump";
    player.ani.frame = player.vel.y < 0 ? 0 : 1;
  } else {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  // --- MOVEMENT ---
  if (!attacking) {
    player.vel.x = 0;

    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;
    }
  }

  // --- KEEP IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // --- HITBOX DEBUG ---
  player.debug = showHitboxes;
  sensor.debug = showHitboxes;

  for (let g of ground) {
    g.debug = showHitboxes;
  }

  for (let d of groundDeep) {
    d.debug = showHitboxes;
  }

  // --- DEBUG SCREEN ---
  if (showDebug) {
    drawDebugScreen(grounded);
  }

  // --- DEBUG HINT TEXT ---
  camera.off();

  push();
  fill(255);
  textSize(8);
  textAlign(RIGHT, TOP);
  text('Press "m" for Debug Screen', width - 8, 8);
  pop();

  camera.on();
}

function drawDebugScreen(grounded) {
  camera.off();

  push();
  noStroke();
  fill(0, 180);
  rect(10, 10, 145, 90, 8);

  fill(255);
  textSize(10);
  textAlign(LEFT, TOP);

  text("DEBUG MENU", 18, 16);
  text("Moon Gravity: " + (moonGravityOn ? "ON" : "OFF"), 18, 30);
  text("Hitboxes: " + (showHitboxes ? "ON" : "OFF"), 18, 42);
  text("Grounded: " + grounded, 18, 54);
  text("G = toggle gravity", 18, 66);
  text("H = toggle hitboxes", 18, 78);

  pop();

  camera.on();
}
