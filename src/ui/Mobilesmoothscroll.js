/*
  MobileSmoothScroll.js
  ---------------------
  Phones only (<= 768px). Desktop / laptop is never touched.

  Home, About, Services, Careers:
    the page becomes ONE continuous strip that follows your finger 1:1 with a natural
    fling, instead of showing one cut-off section at a time. The 3D scenes keep running
    from the same scroll progress, and each section lines up with its chapter
    (the data-progress values in the chapter / menu list), so menu links still land
    on the right section.

  Team, Contact:
    they already scroll as one long track, so only the smooth fling is added.

  Replaces AboutMobileScroll.js (this file handles About too).
*/

const MOBILE_QUERY = '(max-width: 768px)';
const STRIP_VIEWS = ['home', 'about', 'services', 'careers'];
const MOMENTUM_VIEWS = ['team', 'contact'];
const EXCLUDE = 'input, textarea, select, .ct-chat-msgs, .menu-drawer, .modal-card, .job-panel, .header-dropdown-menu';
const HEADER_GAP = 72;      // a section that a chapter jumps to stops this far below the top (under the logo)
const MIN_SLOPE = 300;      // safety for very short sections
const FADE_MS = 900;        // matches the .view-layer fade, so the old page does not jump while fading out

export class MobileSmoothScroll {
  constructor(cameraRig) {
    this.rig = cameraRig;
    this.mq = window.matchMedia(MOBILE_QUERY);
    this.current = null;     // name of the page being handled
    this.views = {};
    [...STRIP_VIEWS, ...MOMENTUM_VIEWS].forEach((name) => {
      const el = document.getElementById(`${name}-view`);
      if (!el) return;
      const chapters = [...document.querySelectorAll(`#chapters-${name} .chapter-item[data-progress]`)]
        .map((c) => parseFloat(c.dataset.progress))
        .filter((v) => !isNaN(v));
      this.views[name] = { el, strip: STRIP_VIEWS.includes(name), chapters, timer: null };
    });

    this.knots = [[0, 0], [1, 1]];
    this.frame = 0;
    this.lastOffset = -1;

    // touch tracking for the fling
    this.tracking = false;
    this.lastY = 0;
    this.lastT = 0;
    this.vel = 0;            // px per ms
    this.fling = 0;          // px per second

    window.addEventListener('touchstart', (e) => {
      this.fling = 0;
      if (!this.current || !e.touches.length) return;
      this.tracking = !e.target.closest(EXCLUDE);
      this.lastY = e.touches[0].clientY;
      this.lastT = performance.now();
      this.vel = 0;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.current || !this.tracking || !e.touches.length) return;
      const y = e.touches[0].clientY;
      const t = performance.now();
      const dt = Math.max(t - this.lastT, 1);
      this.vel = 0.7 * ((this.lastY - y) / dt) + 0.3 * this.vel;
      this.lastY = y;
      this.lastT = t;
    }, { passive: true });

    const end = () => {
      if (!this.current || !this.tracking) return;
      this.tracking = false;
      if (performance.now() - this.lastT > 90) this.vel = 0;   // finger stopped before lifting
      const v = Math.max(-4, Math.min(4, this.vel));
      if (Math.abs(v) > 0.15) this.fling = v * 1000;
    };
    window.addEventListener('touchend', end, { passive: true });
    window.addEventListener('touchcancel', end, { passive: true });

    window.addEventListener('resize', () => { if (this.current) this.measure(); });
  }

  /* ---------- progress <-> pixels (one straight piece per section) ---------- */
  measure() {
    const v = this.views[this.current];
    if (!v || !v.strip) return;
    const max = Math.max(1, v.el.offsetHeight - window.innerHeight);
    const sections = [...v.el.children].filter((c) => c.classList.contains('story-section'));
    const knots = [[0, 0]];
    const n = Math.min(sections.length, v.chapters.length);
    for (let i = 1; i < n; i++) {
      const p = v.chapters[i];
      const o = Math.min(max, Math.max(0, sections[i].offsetTop - HEADER_GAP));
      const last = knots[knots.length - 1];
      if (p > last[0] && p < 1 && o >= last[1]) knots.push([p, o]);
    }
    knots.push([1, max]);
    this.knots = knots;
  }

  segment(p) {
    const k = this.knots;
    let i = 0;
    while (i < k.length - 2 && p > k[i + 1][0]) i++;
    return [k[i], k[i + 1]];
  }

  offsetAt(p) {
    p = Math.min(1, Math.max(0, p));
    const [a, b] = this.segment(p);
    return a[1] + (b[1] - a[1]) * ((p - a[0]) / (b[0] - a[0]));
  }

  slopeAt(p) {                                   // pixels of content per 1.0 of progress
    const v = this.views[this.current];
    if (!v.strip) return 1 / (this.rig.scrollSpeed * 1.5);   // keep the page's own speed
    const [a, b] = this.segment(Math.min(1, Math.max(0, p)));
    return Math.max(MIN_SLOPE, (b[1] - a[1]) / (b[0] - a[0]));
  }

  /* ---------- switching pages ---------- */
  enter(name) {
    const v = this.views[name];
    this.current = name;
    this.fling = 0;
    this.tracking = false;
    this.lastOffset = -1;
    if (!v.strip) return;
    clearTimeout(v.timer);
    v.el.classList.add('m-strip');
    document.body.classList.add('m-strip-on');
    this.measure();
  }

  leave(name) {
    const v = this.views[name];
    this.current = null;
    this.rig.touchScale = 1;
    this.fling = 0;
    this.tracking = false;
    if (!v || !v.strip) return;
    document.body.classList.remove('m-strip-on');
    clearTimeout(v.timer);
    v.timer = setTimeout(() => {                  // wait for the fade-out, then restore the normal layout
      if (this.current === name) return;
      v.el.classList.remove('m-strip');
      v.el.style.transform = '';
    }, FADE_MS);
  }

  /* ---------- every frame, right after cameraRig.update(dt) ---------- */
  update(dt) {
    let want = null;
    if (this.mq.matches && this.rig.mode === 'scroll') {
      want = Object.keys(this.views).find((n) => this.views[n].el.classList.contains('active')) || null;
    }
    if (want !== this.current) {
      if (this.current) this.leave(this.current);
      if (want) this.enter(want);
    }
    if (!this.current) return;

    const v = this.views[this.current];
    if (v.strip && this.frame++ % 30 === 0) this.measure();    // images / job list can change the height

    const slope = this.slopeAt(this.rig.targetProgress);

    // 1 px of finger movement = 1 px of content movement
    this.rig.touchScale = v.strip ? 1 / (this.rig.scrollSpeed * 1.5 * slope) : 1;

    // momentum after the finger lifts
    if (this.fling) {
      const t = this.rig.targetProgress + (this.fling / slope) * dt;
      this.rig.targetProgress = Math.min(1, Math.max(0, t));
      this.fling *= Math.exp(-dt * 3.2);
      if (t <= 0 || t >= 1 || Math.abs(this.fling) < 15) this.fling = 0;
    }

    // follow the finger more tightly than the default camera easing (feels like native scroll)
    const k = 1 - Math.exp(-dt * (this.tracking ? 18 : 9));
    this.rig.scrollProgress += (this.rig.targetProgress - this.rig.scrollProgress) * k;

    // move the whole page strip
    if (v.strip) {
      const offset = Math.round(this.offsetAt(this.rig.getProgress()));
      if (offset !== this.lastOffset) {
        v.el.style.transform = `translate3d(0, ${-offset}px, 0)`;
        this.lastOffset = offset;
      }
    }
  }
}