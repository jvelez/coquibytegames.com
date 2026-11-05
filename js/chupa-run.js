// Chupacabras Run (2026-11-02): the footer's running Chupacabras opens an endless runner after Chrome's dinosaur game, with
// the game's corral fences for the obstacles, in a strip at the top of the footer the full width of the page. The scene is
// 80 pixels tall and as wide as the strip allows at 3 screen-pixel-aligned page pixels per game pixel; the score is HTML.
(function(){
const button = document.getElementById("chupa"), game = document.getElementById("chupa-game"), canvas = document.getElementById("cg-canvas");
if (!button || !game || !canvas) return;
const ctx = canvas.getContext("2d");
const hiEl = document.getElementById("cg-hi"), nowEl = document.getElementById("cg-now"), hint = document.getElementById("cg-hint");
const run = new Image(); run.src = canvas.dataset.run;     // the four side-facing frames, 18x18 with the border baked in, facing right
const fence = new Image(); fence.src = canvas.dataset.fence; // a whole fence at 0 and a broken one at 8, 8x8
const goat = new Image(); goat.src = canvas.dataset.goat;    // the game's goat, 4 walking frames of 16x16, facing right
const bite = new Image(); bite.src = canvas.dataset.bite;    // the game's bite where an animal was collected, 8 frames of 8x8
const BITE_STARTS = [0, 8, 12, 14, 16, 20, 24, 28], BITE_END = 30; // the game's frame timing in updates (the frames don't all last the same)
const DOT_FRAME = 4;                                              // the bite throws its two red dots when it reaches this frame
// The sounds (22 kHz mono WAV), loaded when the game first opens: picking up an animal plays the PC version's AnimalHit and PickUp
// at once, as the game does, losing a life its Hit; the jump is a chiptune square-wave sweep made with ffmpeg (the game has no jump).
// The volumes: the jump is the most frequent sound, the fence hit the one that ends the run. Playing a sound again restarts it
const VOLUMES = {animalHit: 0.3, pickUp: 0.3, hit: 0.35, jump: 0.25};
let sounds = null;
function play(name){ const s = sounds[name]; s.currentTime = 0; s.play().catch(() => {}); }

const H = 80, GROUND = 68;                            // the scene's height and the feet's line
let W = canvas.width, PX = 20;                        // the scene's width and the player's x (the middle), set from the strip's width
const GOAT_POINTS = 10;                               // a goat picked up is worth this much score
const STEP = 1000 / 60;                               // one update, as the game's 60 Hz
const JUMP = -3.3, GRAVITY = 0.17;                    // about 32 px high, 39 updates in the air
const SPEED0 = 1.6, SPEEDMAX = 4.2, SPEEDUP = 0.0012; // px an update; the ground speeds up as it goes

let state = "ready"; // ready, running, over
let y, vy, speed, dist, nextAt, goatAt, animTimer, fences, goats, bites, eaten, stars = [], specks = [], hi = 0, last = 0, acc = 0, raf = 0;
try { hi = +localStorage.getItem("cb-chupa-hi") || 0; } catch (e) {}

const pad = n => String(Math.min(99999, Math.floor(n))).padStart(5, "0");
const score = () => dist / 10 + eaten * GOAT_POINTS;
const rand = (a, b) => a + Math.random() * (b - a);

// The canvas fills the strip: 3 page pixels per game pixel, times the logo's --brand-zoom so they land on whole screen pixels
function resize(){
  const zoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--brand-zoom")) || 1, px = 3 * zoom;
  W = Math.max(80, Math.floor(game.clientWidth / px));
  PX = W < 240 ? 16 : Math.floor(W / 2) - 8; // the player runs in the middle, or near the left edge on a narrow strip (phones: more room to see what comes)
  canvas.width = W; canvas.height = H;
  canvas.style.width = (W * px) + "px"; canvas.style.height = (H * px) + "px";
  stars = Array.from({length: Math.round(W / 11)}, () => ({x: rand(0, W), y: rand(2, 46), big: Math.random() < 0.25}));
  specks = Array.from({length: Math.round(W / 17)}, () => ({x: rand(0, W), y: Math.floor(rand(GROUND + 3, H - 1)), w: Math.random() < 0.5 ? 1 : 2}));
}

function reset(){
  y = GROUND; vy = 0; speed = SPEED0; dist = 0; nextAt = 150; goatAt = 0; animTimer = 0; fences = []; goats = []; bites = []; eaten = 0;
  state = "ready";
  paintHint();
  paintScore();
}
function paintScore(){ nowEl.textContent = pad(score()); hiEl.textContent = "HI " + pad(hi); }
// The hint line under the game, by state
function paintHint(){
  hint.textContent = state === "ready" ? "Space, up or tap to jump"
    : state === "over" ? "Game over, " + eaten + (eaten === 1 ? " goat" : " goats") + ". Space, up or tap to run again"
    : " ";
}

// A fence group: n tiles wide, h tiles tall (two high only once the run is going)
function spawnFence(){
  const n = Math.random() < 0.5 ? 1 : Math.random() < 0.6 ? 2 : 3;
  const h = dist > 1800 && Math.random() < 0.3 ? 2 : 1;
  fences.push({x: W, n, h, broken: false});
  nextAt = dist + 70 + speed * 28 + rand(0, 90);
  if (Math.random() < 0.6) goatAt = dist + (nextAt - dist) / 2; // now and then a goat halfway to the next fence
}

function press(){
  if (state !== "running") { reset(); state = "running"; paintHint(); }
  if (y >= GROUND) { vy = JUMP; play("jump"); } // only a jump from the ground sounds
}

function update(){
  animTimer += state === "over" ? 0 : speed / SPEED0; // the legs keep the game's pace, faster as the ground does
  if (state !== "running") return;
  dist += speed;
  speed = Math.min(SPEEDMAX, speed + SPEEDUP);
  vy += GRAVITY; y += vy;
  if (y > GROUND) { y = GROUND; vy = 0; }
  for (const s of stars) { s.x -= speed * 0.1; if (s.x < -1) s.x += W + 1; }
  for (const s of specks) { s.x -= speed; if (s.x < -2) { s.x += W + 2; s.y = Math.floor(rand(GROUND + 3, H - 1)); } }
  for (const f of fences) f.x -= speed;
  fences = fences.filter(f => f.x + f.n * 8 > 0);
  // The goats walk back and forth on the ground at their own pace and animation, within their range: pacers around their spot,
  // turning at its ends or when they feel like it; roamers the whole gap between the fences, turning at the fences
  for (const g of goats) {
    g.x -= speed; g.off += g.dir * g.pace; g.anim += g.pace * 2;
    if (--g.turnIn <= 0 || (g.dir < 0 && g.off < g.minOff) || (g.dir > 0 && g.off > g.maxOff)) { g.dir = -g.dir; g.turnIn = g.roams ? 9999 : 40 + rand(0, 60); }
  }
  goats = goats.filter(g => g.x + g.off + 16 > 0);
  // The bites play out where a goat was, moving with the ground; their dots hop twice and land
  for (const b of bites) {
    b.x -= speed; b.t++;
    if (b.t === BITE_STARTS[DOT_FRAME]) b.dots = [-1, 1].map(side => ({x: b.x, vx: side * (Math.random() < 0.5 ? 0.5 : 1), h: rand(12, 16), timer: 0}));
    for (const d of b.dots || []) { d.x += d.vx - speed; d.timer++; }
  }
  bites = bites.filter(b => b.t < BITE_END || (b.dots && b.dots[0].timer < 20));
  if (dist >= nextAt) spawnFence();
  if (goatAt && dist >= goatAt) {
    // A third of the goats roam the whole gap: from just past the last fence to just short of where the next one will be
    const roams = Math.random() < 0.34, f = fences[fences.length - 1], reach = 8 + rand(0, 6); // a pacer's range to each side
    const minOff = roams ? (f ? f.x + f.n * 8 - W : -60) + 2 : -reach, maxOff = roams ? nextAt - dist - 16 - 2 : reach;
    goats.push({x: W, off: 0, dir: Math.random() < 0.5 ? -1 : 1, pace: rand(0.3, 0.7), anim: rand(0, 24), roams, minOff, maxOff, turnIn: roams ? 9999 : 20 + rand(0, 60)});
    goatAt = 0;
  }
  // The player's box inside the 16x16 frame, against each fence's tiles and each goat's body
  const bx = PX + 3, by = y - 12, bw = 10, bh = 12;
  for (const f of fences) {
    const fy = GROUND - 8 * f.h;
    if (bx < f.x + f.n * 8 && bx + bw > f.x && by < GROUND && by + bh > fy) {
      f.broken = true; state = "over";
      play("hit");
      if (score() > hi) { hi = score(); try { localStorage.setItem("cb-chupa-hi", String(Math.floor(hi))); } catch (e) {} }
      paintHint();
    }
  }
  goats = goats.filter(g => {
    const gx = g.x + g.off;
    if (bx < gx + 13 && bx + bw > gx + 3 && by + bh > GROUND - 12) { eaten++; bites.push({x: gx + 8, t: 0, dots: null}); play("animalHit"); play("pickUp"); return false; } // picked up: a bite where it was
    return true;
  });
  paintScore();
}

function draw(){
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#080c1f"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#5a62a8";
  for (const s of stars) {
    const x = Math.floor(s.x), yy = Math.floor(s.y);
    ctx.fillRect(x, yy, 1, 1);
    if (s.big) { ctx.fillRect(x - 1, yy, 1, 1); ctx.fillRect(x + 1, yy, 1, 1); ctx.fillRect(x, yy - 1, 1, 1); ctx.fillRect(x, yy + 1, 1, 1); }
  }
  ctx.fillStyle = "#12481d"; ctx.fillRect(0, GROUND + 1, W, 1); // the ground, dark green grass
  ctx.fillStyle = "#0c3414";
  for (const s of specks) ctx.fillRect(Math.floor(s.x), s.y, s.w, 1);
  for (const f of fences) {
    const x = Math.floor(f.x);
    if (f.broken) { for (let i = 0; i < f.n; i++) ctx.drawImage(fence, 8, 0, 8, 8, x + i * 8, GROUND - 8, 8, 8); }
    else for (let j = 0; j < f.h; j++) for (let i = 0; i < f.n; i++) ctx.drawImage(fence, 0, 0, 8, 8, x + i * 8, GROUND - 8 * (j + 1), 8, 8);
  }
  const walk = Math.floor(animTimer / 6) % 4; // 6 updates a frame on the ground, as the game's 0.4 s loop
  for (const g of goats) { // each on its own animation clock; the strip faces right, so walking left the goat is mirrored
    const gx = Math.floor(g.x + g.off), gf = Math.floor(g.anim / 6) % 4;
    if (g.dir > 0) ctx.drawImage(goat, gf * 16, 0, 16, 16, gx, GROUND - 16, 16, 16);
    else { ctx.save(); ctx.translate(gx + 16, GROUND - 16); ctx.scale(-1, 1); ctx.drawImage(goat, gf * 16, 0, 16, 16, 0, 0, 16, 16); ctx.restore(); }
  }
  for (const b of bites) {
    if (b.t < BITE_END) {
      let f = 0; while (f + 1 < BITE_STARTS.length && BITE_STARTS[f + 1] <= b.t) f++;
      ctx.drawImage(bite, f * 8, 0, 8, 8, Math.floor(b.x) - 4, GROUND - 12, 8, 8);
    }
    ctx.fillStyle = "#e02020";
    for (const d of b.dots || []) { // a big hop of 12 updates, then one half as high of 8, landing as it goes
      let dy;
      if (d.timer <= 12) { const u = d.timer / 12; dy = d.h * 4 * u * (1 - u); }
      else if (d.timer <= 20) { const u = (d.timer - 12) / 8; dy = d.h / 2 * 4 * u * (1 - u); }
      else continue;
      ctx.fillRect(Math.floor(d.x), Math.floor(GROUND - 8 - dy), 1, 1);
    }
  }
  const frame = y < GROUND ? 1 : walk; // 18x18 frames: the 16x16 body with its 1 px border baked around it
  ctx.drawImage(run, frame * 18, 0, 18, 18, PX - 1, Math.round(y) - 17, 18, 18);
}

function tick(t){
  if (game.hidden) return;
  acc += Math.min(100, t - last); last = t;
  while (acc >= STEP) { update(); acc -= STEP; }
  draw();
  raf = requestAnimationFrame(tick);
}

function open(){
  if (!sounds) {
    sounds = {animalHit: new Audio(canvas.dataset.soundAnimalHit), pickUp: new Audio(canvas.dataset.soundPickUp), hit: new Audio(canvas.dataset.soundHit), jump: new Audio(canvas.dataset.soundJump)};
    for (const name in sounds) sounds[name].volume = VOLUMES[name];
  }
  button.hidden = true; game.hidden = false;
  resize(); reset(); draw();
  game.scrollIntoView({block: "nearest"}); canvas.focus({preventScroll: true});
  last = performance.now(); acc = 0; raf = requestAnimationFrame(tick);
}
function close(){
  cancelAnimationFrame(raf);
  game.hidden = true; button.hidden = false;
  button.focus({preventScroll: true});
}

button.addEventListener("click", open);
document.getElementById("cg-close").addEventListener("click", close);
canvas.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
document.addEventListener("keydown", e => {
  if (game.hidden || e.repeat) return;
  if (e.code === "Escape") close();
  else if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); press(); }
});
// The strip changing width: the window resizing, and the scrollbar appearing once the strip has opened (that doesn't fire a window resize)
new ResizeObserver(() => { if (!game.hidden) { resize(); draw(); } }).observe(game);
})();
