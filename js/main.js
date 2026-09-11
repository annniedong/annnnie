import { GoldenSpiral } from './spiral.js';
import { typeInto } from './typewriter.js';

const SENS = 1 / 1150;              // ~11 mouse notches, rest to fully zoomed in

const hintsEl = document.getElementById('hints');
const nameLine = document.getElementById('typed-name');
const scrollHint = document.getElementById('scroll-hint');
const lifeHint = document.getElementById('life-hint');
const workEl = document.getElementById('work');

const worldEl = document.getElementById('world');
const rectGroup = document.getElementById('gr');
const arcGroup = document.getElementById('ga');
const shellEl = document.getElementById('shell');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const spiral = new GoldenSpiral(worldEl, rectGroup, arcGroup, shellEl);

const ENGAGE_THRESHOLD = 0.5;   // how much upward scroll it takes to "break" out of resting on the name

let zoomCur = 0, zoomTgt = 0, raf = null;
let locked = false;   // page scroll pinned at 0 while a zoom is in progress
let slack = ENGAGE_THRESHOLD;   // remaining resistance before a fresh zoom-in engages

function resize() { spiral.resize(); }
addEventListener('resize', resize);
resize();

function draw() {
  spiral.renderZoom(zoomCur);
  // the hints fade out fast at the very start of the zoom so they don't
  // overlap the shell as it surfaces — the name itself stays put, over
  // the spiral, the whole time
  const hintOpacity = Math.max(0, 1 - zoomCur / 0.15);
  hintsEl.style.opacity = hintOpacity.toFixed(3);
}

function lock() {
  if (locked) return;
  locked = true;
  document.body.classList.add('zoom-locked');
}
function unlock() {
  locked = false;
  slack = ENGAGE_THRESHOLD;   // require pushing through the resistance again next time
  document.body.classList.remove('zoom-locked');
}

function tick() {
  const d = zoomTgt - zoomCur;
  if (Math.abs(d) < 25e-5) {
    zoomCur = zoomTgt;
    draw();
    raf = null;
    if (zoomCur <= 0) unlock();
    return;
  }
  zoomCur += d * (reducedMotion ? 1 : 0.14);
  draw();
  raf = requestAnimationFrame(tick);
}

// amount > 0 zooms in (toward the shell), amount < 0 zooms back out. Zooming
// in from a full stop has to push through `slack` first, so a light scroll
// up doesn't immediately drag the user off the resting name view.
function nudgeZoom(amount) {
  if (amount > 0 && zoomTgt <= 0 && slack > 0) {
    slack -= amount;
    if (slack > 0) return;       // hasn't broken through the resistance yet
    amount = -slack;             // only the overflow past the threshold moves the zoom
    slack = 0;
  }
  lock();
  const t = Math.min(1, Math.max(0, zoomTgt + amount));
  if (t !== zoomTgt) {
    zoomTgt = t;
    raf = raf || requestAnimationFrame(tick);
  }
}

// ---------- input ----------
// Only intercepted at the top of the page (or mid-zoom); otherwise the
// event is left alone and the page scrolls normally.

addEventListener('wheel', e => {
  const atTop = window.scrollY <= 0;
  if (!(zoomCur > 0 || (atTop && e.deltaY < 0))) return;
  e.preventDefault();
  const m = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
  nudgeZoom(Math.max(-160, Math.min(160, -e.deltaY * m)) * SENS);
}, { passive: false });

let lastTouchY = null;
addEventListener('touchstart', e => { lastTouchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  const y = e.touches[0].clientY;
  const amount = lastTouchY !== null ? (y - lastTouchY) * 1.2 * SENS : 0;   // pulling down = zoom in
  const atTop = window.scrollY <= 0;
  lastTouchY = y;
  if (!(zoomCur > 0 || (atTop && amount > 0))) return;
  e.preventDefault();
  nudgeZoom(amount);
}, { passive: false });
addEventListener('touchend', () => { lastTouchY = null; }, { passive: true });

// clicking/tapping a hint does what scrolling in that direction would do
scrollHint.addEventListener('click', () => workEl.scrollIntoView({ behavior: 'smooth' }));
lifeHint.addEventListener('click', () => nudgeZoom(1));

// ---------- boot ----------

scrollHint.classList.add('visible');   // both visible right away — doesn't wait on typing
lifeHint.classList.add('visible');
typeInto(nameLine, 'annie dong', { speed: 60 });
