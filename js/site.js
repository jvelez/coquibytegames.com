// Coquibyte Games site: placeholder box covers, the navbar coquí, the day/night toggle
(function(){
"use strict";

// PIXEL SPRITES (12x12, '.' = clear)
const S = {
  chicken:["....rr......","...rwwr.....","..wwwkww....","..wwwwwyy...","..wwwwww....",".wwwwwwww...","wwwwwwwwww..","wwwwwwwwwww.",".wwwwwwwww..","..wwwwww....","...y..y.....","..yy.yy....."],
  goat:["k........k..","kk......kk..",".kwwwwwwwk..",".wwkwwkww...",".wwwwwwww...","..wwwpww....","..wwwwww....","...wkkw.....","...wwww.....","............","............","............"],
  mine:["....k..k....","..k.kkkk.k..","...kkkkkk...","..kkwkkkkk..",".kkkwkkkkkk.","kkkkkkkkkkkk",".kkkkkkkkkk.","..kkkkkkkk..","...kkkkkk...","..k.kkkk.k..","....k..k....","............"],
  grid:["kkkkkkkkkkkk","kGG.G..GG.Gk","kG..GG.G..Gk","k.GGGG..GG.k","kG.GGGG.G..k","kGG..GGGG.Gk","k.GG.G..GG.k","kG..GGGG..Gk","kGGG..G.GGGk","k..GGGG.G..k","kG.G..GGGG.k","kkkkkkkkkkkk"],
};
const PAL = {g:"#2f8f5b",G:"#5fd08f",k:"#1d2a24",w:"#fffaf0",r:"#d23b2f",R:"#ef6b4a",y:"#e8a531",p:"#e88aa0"};

// PLACEHOLDER COVERS: sky in hard bands, ground, sun, the game's sprite (replace with real box art);
// a game with real art in img/covers keeps its entry for the spine (sky[1]) and top (sky[0]) colors
const COVERS = {
  "tropigrams":        {sprite:"grid",   sky:["#2f7fc0","#123a78"], ground:"#f2d38a"},
  "vieques":           {sprite:"mine",   sky:["#4fc0f4","#0b7fd0"], ground:"#f0dfa8"},
  "chupacabras":       {sprite:"goat",   sky:["#24427a","#0b1633"], ground:"#3e5a2c"},
  "bad-chicken":       {sprite:"chicken",sky:["#4a4682","#261d40"], ground:"#7a4a2a"},
};

function drawSprite(ctx, spr, ox, oy, scale, pal){
  spr.forEach((row, y) => [...row].forEach((c, x) => {
    if(pal[c]){ ctx.fillStyle = pal[c]; ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale); }
  }));
}
function mix(a, b, t){
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function drawCover(canvas, c){
  const W = 45, H = 60; canvas.width = W; canvas.height = H;
  const x = canvas.getContext("2d"), horizon = Math.floor(H * 0.74), steps = 9;
  for(let i = 0; i < steps; i++){
    x.fillStyle = mix(c.sky[0], c.sky[1], i / (steps - 1));
    x.fillRect(0, Math.floor(i * horizon / steps), W, Math.ceil(horizon / steps) + 1);
  }
  x.fillStyle = c.ground; x.fillRect(0, horizon, W, H - horizon);
  x.fillStyle = "#ffe7a3"; x.fillRect(34, 15, 6, 6); x.fillRect(33, 16, 8, 4); x.fillRect(35, 14, 4, 8);
  drawSprite(x, S[c.sprite], 10, horizon - 24 + 4, 2, PAL);
}
document.querySelectorAll(".box3d[data-game]").forEach(box => {
  const c = COVERS[box.dataset.game]; if(!c) return;
  box.style.setProperty("--box-dark", c.sky[1]);
  box.style.setProperty("--box-light", c.sky[0]);
  const canvas = box.querySelector(".front canvas"); if(canvas) drawCover(canvas, c);
});

// The logo follows the screen scale when the window moves to a monitor with another one (head.html sets it first)
window.addEventListener("resize", cbBrandZoom);

// Anchor links (#facts, #bad-chicken, ...) scroll to just below the menu bar: its height goes into --head-h, which
// html's scroll-padding-top reads; measured again whenever the bar changes size (zoom, the links wrapping on phones)
const head = document.querySelector(".site-head");
if(head){
  const setHeadHeight = () => document.documentElement.style.setProperty("--head-h", head.getBoundingClientRect().height + "px");
  new ResizeObserver(setHeadHeight).observe(head);
  setHeadHeight();
}

// --snap: the fraction that makes the document a whole number of screen pixels tall (the centered look adds it to its footer's
// top padding, above the rows). Text sizes leave the height fractional, the browser rounds the scroll range, and the footer then sits a fraction
// off the window's bottom edge on long pages, its text snapping to a different pixel from page to page. Measured again when the
// content or the footer changes size (fonts arriving, the footer's game opening) and when the window is resized
function snapHeight(){
  const html = document.documentElement, dpr = window.devicePixelRatio || 1, current = parseFloat(html.style.getPropertyValue("--snap")) || 0;
  const natural = (html.getBoundingClientRect().height - current) * dpr, snap = (Math.ceil(natural - 0.001) - natural) / dpr;
  if(Math.abs(snap - current) > 0.001) html.style.setProperty("--snap", snap + "px");
}
const snapWatch = new ResizeObserver(snapHeight);
for(const part of document.querySelectorAll("main, footer")) snapWatch.observe(part);
window.addEventListener("resize", snapHeight);
snapHeight();

// NAVBAR COQUÍ: croaks and squashes (petted on the head) when clicked
const coqui = document.getElementById("coqui");
if(coqui){
  const croak = new Audio(coqui.dataset.sound);
  coqui.addEventListener("click", () => {
    croak.currentTime = 0; croak.play().catch(() => {});
    coqui.classList.remove("croak"); void coqui.offsetWidth; coqui.classList.add("croak");
  });
}

// TRAILERS: the poster's play button becomes the YouTube player (the no-cookie host; nothing is loaded from YouTube before the click)
document.querySelectorAll(".trailer-play").forEach(button => {
  button.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.src = "https://www.youtube-nocookie.com/embed/" + button.dataset.video + "?autoplay=1&rel=0";
    frame.title = button.getAttribute("aria-label").replace(/^Play: /, "");
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    button.replaceWith(frame);
  });
});

// SCREENSHOTS: the arrows scroll the strip a view at a time (hidden at the ends); a click opens the full-size shot in the
// lightbox, where the arrows and the arrow keys move through the strip's shots, Escape or a click outside closes it
document.querySelectorAll(".shots").forEach(shots => {
  const strip = shots.querySelector(".shots-strip");
  const prev = shots.querySelector(".prev");
  const next = shots.querySelector(".next");
  const update = () => {
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  };
  prev.addEventListener("click", () => strip.scrollBy({left: -strip.clientWidth, behavior: "smooth"}));
  next.addEventListener("click", () => strip.scrollBy({left: strip.clientWidth, behavior: "smooth"}));
  strip.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  update();

  const links = [...strip.querySelectorAll(".shot")];
  links.forEach((link, i) => link.addEventListener("click", e => { e.preventDefault(); openLightbox(links, i); }));
});

let lightbox = null;
function openLightbox(links, index){
  if(!lightbox){
    lightbox = document.createElement("dialog");
    lightbox.className = "lightbox";
    lightbox.innerHTML = '<img alt=""><button type="button" class="close" aria-label="Close">×</button>'
      + '<button type="button" class="prev" aria-label="Previous screenshot">‹</button>'
      + '<button type="button" class="next" aria-label="Next screenshot">›</button><span class="count"></span>';
    document.body.appendChild(lightbox);
    lightbox.querySelector(".close").addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", e => { if(e.target === lightbox) lightbox.close(); });
  }
  const img = lightbox.querySelector("img");
  const show = i => {
    index = (i + links.length) % links.length;
    img.src = links[index].href;
    img.alt = links[index].querySelector("img").alt;
    lightbox.querySelector(".count").textContent = (index + 1) + " / " + links.length;
    links[index].scrollIntoView({block: "nearest", inline: "nearest"});
  };
  lightbox.querySelector(".prev").onclick = () => show(index - 1);
  lightbox.querySelector(".next").onclick = () => show(index + 1);
  lightbox.onkeydown = e => {
    if(e.key === "ArrowLeft") show(index - 1);
    else if(e.key === "ArrowRight") show(index + 1);
  };
  show(index);
  lightbox.showModal();
}

// CURRENT PAGE in the menu
const page = document.body.dataset.page;
document.querySelectorAll("[data-nav]").forEach(a => { if(a.dataset.nav === page) a.setAttribute("aria-current", "page"); });

// DAY / NIGHT
const root = document.documentElement;
// The icons are 9x9 pixel art (img/sun.png, img/moon.png; the button carries their paths), shown at 2 CSS px an art pixel times
// --brand-zoom, so they land on whole screen pixels like the logo
const icon = src => '<img src="' + src + '" width="18" height="18" alt="">';
// The button lists its looks in data-modes (Day and Night); a page without the button follows the system setting.
// It shows the look it switches to (the sun by night, the moon by day; 2026-11-04): the page itself shows the current one
const modeButton = document.getElementById("mode");
if (!modeButton) return;
const LOOKS = {light: ["Day", icon(modeButton.dataset.sun)], dark: ["Night", icon(modeButton.dataset.moon)]};
const MODES = (modeButton.dataset.modes || "light dark").split(" ").map(n => [n, ...LOOKS[n]]);
function modeIndex(){ const i = MODES.findIndex(m => m[0] === root.dataset.theme); return i < 0 ? 0 : i; }
function paintMode(){
  const next = MODES[(modeIndex() + 1) % MODES.length];
  modeButton.innerHTML = next[2] + "<span>" + next[1] + "</span>";
  modeButton.setAttribute("aria-label", "Switch to " + next[1].toLowerCase() + " mode");
}
modeButton.addEventListener("click", () => {
  root.dataset.theme = MODES[(modeIndex() + 1) % MODES.length][0];
  cbSet("cb-mode", root.dataset.theme);
  paintMode();
});
paintMode();
})();
