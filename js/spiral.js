// Golden-spiral renderer. resize() lays out the whirling-square construction
// at rest, fit to the viewport (the static hero backdrop). renderZoom(progress)
// dollies in from that rest position toward the pole, fading in the nautilus
// shell as it arrives — driven by js/main.js's "scroll up to zoom in" gesture.

const NS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
const PHI = (1 + Math.sqrt(5)) / 2;
const UNIT = 1e3;
const STEPS = 32;
const EXP = 11;
const ZOOM = PHI ** EXP;
const EYE = [0.6527, 0.6388];         // spiral eye inside the shell image
const RATIO = 395 / 520;
const PHOTO_STEP = 4;                 // which whirling square holds the profile photo

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const f = n => n.toFixed(6);
const Y = n => UNIT - n;              // y flips so it reads like the diagram

export class GoldenSpiral {
  /**
   * @param {SVGGElement} world  the <g> that gets translated/scaled
   * @param {SVGGElement} rectGroup  <g> to hold the whirling-square rects
   * @param {SVGGElement} arcGroup   <g> to hold the quarter-arc path
   * @param {HTMLImageElement} [shell] the nautilus shell image that fades in when zoomed in
   * @param {HTMLElement} [caption] small label that fades in alongside the shell
   * @param {SVGGElement} [photoGroup] <g> to hold the profile-photo square
   * @param {string} [photoSrc] image source, sized into one whirling square
   */
  constructor(world, rectGroup, arcGroup, shell, caption, photoGroup, photoSrc) {
    this.world = world;
    this.rectGroup = rectGroup;
    this.arcGroup = arcGroup;
    this.shell = shell || null;
    this.caption = caption || null;
    this.photoGroup = photoGroup || null;
    this.photoSrc = photoSrc || null;
    this.photoNode = null;
    this.nodes = [];
    this.pole = [0, 0];
    this.base = 0; this.ax = 0; this.ay = 0;   // set by resize()
    this._build();
  }

  // Whirling squares: each step cuts a square off the golden rectangle and
  // draws the quarter arc centred on the corner that square shares with the
  // remainder. The remainder is golden again, so this nests forever — 32
  // levels is past visible.
  _build() {
    const emit = (tag, attrs, size, group) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      el.setAttribute('vector-effect', 'non-scaling-stroke');
      group.appendChild(el);
      this.nodes.push({ el, size });
    };

    let x0 = 0, y0 = 0, x1 = PHI * UNIT, y1 = UNIT;
    for (let k = 0; k < STEPS; k++) {
      const d = k % 4, W = x1 - x0, H = y1 - y0;
      let s, a, b, c;
      emit('rect', { x: f(x0), y: f(Y(y0 + H)), width: f(W), height: f(H) }, Math.min(W, H), this.rectGroup);
      if (d === 0)      { s = H; a = [x0, y1]; b = [x0 + s, y0]; c = [x0 + s, y1]; x0 += s; }  // off the left
      else if (d === 1) { s = W; a = [x0, y0]; b = [x1, y0 + s]; c = [x0, y0 + s]; y0 += s; }  // off the bottom
      else if (d === 2) { s = H; a = [x1, y0]; b = [x1 - s, y1]; c = [x1 - s, y0]; x1 -= s; }  // off the right
      else              { s = W; a = [x1, y1]; b = [x0, y1 - s]; c = [x1, y1 - s]; y1 -= s; }  // off the top
      // sweep straight from the numbers; the flip inverts the sign of the cross product
      const sw = (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]) < 0 ? 1 : 0;
      emit('path', { d: `M ${f(a[0])} ${f(Y(a[1]))} A ${f(s)} ${f(s)} 0 0 ${sw} ${f(b[0])} ${f(Y(b[1]))}` }, s, this.arcGroup);
      if (k === PHOTO_STEP && this.photoGroup && this.photoSrc) {
        // the square cut this step: its bbox is just the extremes of a, b, c
        const px0 = Math.min(a[0], b[0], c[0]), px1 = Math.max(a[0], b[0], c[0]);
        const py0 = Math.min(a[1], b[1], c[1]), py1 = Math.max(a[1], b[1], c[1]);
        const img = document.createElementNS(NS, 'image');
        img.setAttribute('x', f(px0));
        img.setAttribute('y', f(Y(py1)));
        img.setAttribute('width', f(px1 - px0));
        img.setAttribute('height', f(py1 - py0));
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        img.setAttribute('href', this.photoSrc);
        img.setAttributeNS(XLINK, 'href', this.photoSrc);   // legacy Safari/older browsers need xlink:href
        this.photoGroup.appendChild(img);
        this.photoNode = { el: img, size: s };
        this.nodes.push(this.photoNode);
      }
    }
    this.pole = [(x0 + x1) / 2, Y((y0 + y1) / 2)];   // where every square converges
  }

  /** Size the construction (and the shell, if any) at rest, fit to the current viewport. */
  resize() {
    const vw = innerWidth, vh = innerHeight;
    if (vw <= 0 || vh <= 0) return;   // e.g. a backgrounded/hidden tab reporting a collapsed
                                       // viewport — skip rather than cache a zeroed-out layout
    const m = vw < 560 ? 0.92 : 0.86;
    this.base = Math.min(vw * m / (PHI * UNIT), vh * m / UNIT);
    this.ax = vw / 2 + (this.pole[0] - PHI * UNIT / 2) * this.base;
    this.ay = vh / 2 + (this.pole[1] - UNIT / 2) * this.base;

    if (this.shell) {
      const sw = Math.min(vw, vh) * (vw < 560 ? 0.135 : 0.081), sh = sw * RATIO;
      this.shell.style.width = sw + 'px';  this.shell.style.left = (this.ax - EYE[0] * sw) + 'px';
      this.shell.style.height = sh + 'px'; this.shell.style.top  = (this.ay - EYE[1] * sh) + 'px';
      if (this.caption) {
        this.caption.style.left = this.ax + 'px';
        this.caption.style.top = (this.ay + sh * (1 - EYE[1]) + 20) + 'px';
        this.caption.style.transform = 'translateX(-50%)';
      }
    }
    this.renderZoom(this._lastProgress || 0);
  }

  /** progress: 0 (rest) .. 1 (fully zoomed in on the pole, shell surfaced) */
  renderZoom(progress) {
    this._lastProgress = progress;
    const k = this.base * ZOOM ** progress;
    this.world.setAttribute('transform',
      `translate(${(this.ax - this.pole[0] * k).toFixed(3)} ${(this.ay - this.pole[1] * k).toFixed(3)}) scale(${k.toFixed(6)})`);
    for (const n of this.nodes) {                  // detail fades in past a couple of pixels
      const px = n.size * k;
      n.el.style.opacity = (px < 2.5 ? 0 : px > 26 ? 1 : (px - 2.5) / 23.5).toFixed(3);
    }
    if (!this.shell) return;
    const e = ease(Math.min(1, Math.max(0, (progress - 0.9) / 0.1)));   // the shell arrives at the floor
    this.world.style.opacity = (1 - 0.18 * e).toFixed(3);
    this.shell.style.opacity = e.toFixed(3);
    // quarter turn counterclockwise, mirrored left-to-right; the transform origin is the
    // shell's own eye, so it stays pinned to the pole however it is turned
    this.shell.style.transform = `scale(${(0.82 + 0.18 * e).toFixed(4)}) scaleX(-1) rotate(-90deg)`;
    if (this.caption) this.caption.style.opacity = e.toFixed(3);
    // the profile photo gives way to the shell as it surfaces
    if (this.photoNode) {
      const base = parseFloat(this.photoNode.el.style.opacity) || 0;
      this.photoNode.el.style.opacity = (base * (1 - e)).toFixed(3);
    }
  }
}
