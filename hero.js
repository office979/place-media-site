/* PLACEMedia — hero: LED wall
   "WE DON'T DO BORING." is drawn from LED dots. Behind it, the same dot grid
   plays a looping show video — tinted to the brand palette
   (black → #C10801 → #E85002 / #F16001 → #D9C3AB).
   Hover: dots near the cursor are pushed away and light up in palette colours.

   Video source:
   - If <video class="hero__video"> exists in the hero and can play, its frames
     are shown on the wall (any footage works — it's re-coloured to the palette).
   - Otherwise a generated show loop (gradient flow, stage beams, pulse, stripes)
     plays instead.
   The real <h1> stays in the DOM for layout, SEO and screen readers. */
(() => {
  const hero = document.querySelector('.hero');
  const title = hero.querySelector('.hero__title');
  const fx$ = hero.querySelector('.hero__fx');
  if (!fx$ || !fx$.getContext) return;
  const video = hero.querySelector('video.hero__video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  /* ---------- palette ---------- */
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  // luminance ramp for the show video: the branding gradient
  const RAMP_STOPS = [[0, '#000000'], [0.3, '#5a0400'], [0.5, '#C10801'], [0.72, '#E85002'], [0.86, '#F16001'], [1, '#D9C3AB']];
  const RAMP_N = 18;
  const ramp = Array.from({ length: RAMP_N }, (_, i) => {
    const t = i / (RAMP_N - 1);
    for (let s = 1; s < RAMP_STOPS.length; s++) {
      const [t1, c1] = RAMP_STOPS[s], [t0, c0] = RAMP_STOPS[s - 1];
      if (t <= t1) return rgb(mix(hex(c0), hex(c1), (t - t0) / (t1 - t0)));
    }
    return RAMP_STOPS.at(-1)[1];
  });
  // cyclic hover palette
  const HOVER = ['#E85002', '#F16001', '#D9C3AB', '#C10801', '#E85002'].map(hex);
  const hover = Array.from({ length: 48 }, (_, i) => {
    const p = (i / 48) * (HOVER.length - 1), s = Math.floor(p);
    return rgb(mix(HOVER[s], HOVER[s + 1], p - s));
  });
  const TEXT = '#F9F9F9', OFF = 'rgba(51,51,51,.55)'; // #333333 = LED "off" pixel

  /* ---------- pointer ---------- */
  const ptr = { x: -9999, y: -9999 };
  addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { ptr.x = ptr.y = -9999; });

  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (video) visible ? video.play().catch(() => {}) : video.pause();
  }).observe(hero);

  /* ---------- headline geometry from the (invisible) h1 ---------- */
  const words = () => [...title.querySelectorAll('.word')].map((w) => {
    const r = w.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { text: w.textContent.toUpperCase(), x: r.left - h.left, y: r.top - h.top, w: r.width };
  });
  function headlineCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    const x = c.getContext('2d');
    const fs = parseFloat(getComputedStyle(title).fontSize);
    x.font = `900 ${fs}px "Inter Tight", "Helvetica Neue", Arial, sans-serif`;
    if ('letterSpacing' in x) x.letterSpacing = `${-0.055 * fs}px`;
    x.fillStyle = '#fff';
    words().forEach((wd) => {
      const sx = wd.w / Math.max(1, x.measureText(wd.text).width);
      x.save(); x.translate(wd.x, wd.y + fs * 0.79); x.scale(sx, 1); x.fillText(wd.text, 0, 0); x.restore();
    });
    return c;
  }

  /* ---------- show video: one pixel per LED ---------- */
  const show = document.createElement('canvas');
  const sx = show.getContext('2d', { willReadFrequently: true });
  const SCENE = 5.2, FADE = 0.9;
  const scenes = [
    // 1 · gradient flow (like the branding gradient, drifting)
    (w, h, t) => {
      const blob = (x, y, r, a) => {
        const g = sx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        sx.fillStyle = g; sx.fillRect(0, 0, w, h);
      };
      blob(w * (0.25 + 0.2 * Math.sin(t * 0.5)), h * (0.75 + 0.12 * Math.cos(t * 0.7)), w * 0.55, 1);
      blob(w * (0.75 + 0.18 * Math.cos(t * 0.4)), h * (0.3 + 0.15 * Math.sin(t * 0.6)), w * 0.4, 0.7);
      blob(w * 0.5, h * (0.5 + 0.3 * Math.sin(t * 0.3)), w * 0.25, 0.55);
    },
    // 2 · stage beams
    (w, h, t) => {
      for (let i = 0; i < 6; i++) {
        const x = w * (0.1 + i * 0.16) + Math.sin(t * 0.9 + i * 1.7) * w * 0.06;
        const bw = w * 0.05;
        const g = sx.createLinearGradient(x - bw, 0, x + bw, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.55 + 0.45 * Math.sin(t * 2 + i)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        sx.fillStyle = g; sx.fillRect(x - bw, 0, bw * 2, h);
      }
      const y = ((t * 0.35) % 1.3 - 0.15) * h;
      const g = sx.createLinearGradient(0, y - h * 0.08, 0, y + h * 0.08);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      sx.fillStyle = g; sx.fillRect(0, y - h * 0.08, w, h * 0.16);
    },
    // 3 · pulse rings from the centre
    (w, h, t) => {
      const cx = w * 0.5, cy = h * 0.45, R = Math.hypot(w, h) * 0.6;
      for (let k = 0; k < 4; k++) {
        const p = ((t * 0.32 + k / 4) % 1);
        const r = p * R, a = (1 - p) * 0.95;
        sx.strokeStyle = `rgba(255,255,255,${a})`; sx.lineWidth = Math.max(2, w * 0.035 * (1 - p * 0.5));
        sx.beginPath(); sx.arc(cx, cy, r, 0, Math.PI * 2); sx.stroke();
      }
      const g = sx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.18);
      g.addColorStop(0, `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      sx.fillStyle = g; sx.fillRect(0, 0, w, h);
    },
    // 4 · diagonal stripes
    (w, h, t) => {
      sx.save(); sx.translate(w / 2, h / 2); sx.rotate(-0.5);
      const D = Math.hypot(w, h), band = D * 0.09, off = (t * band * 1.2) % (band * 2);
      for (let x = -D; x < D; x += band * 2) {
        const g = sx.createLinearGradient(x + off, 0, x + off + band, 0);
        g.addColorStop(0, 'rgba(255,255,255,.15)'); g.addColorStop(1, 'rgba(255,255,255,.95)');
        sx.fillStyle = g; sx.fillRect(x + off, -D, band, D * 2);
      }
      sx.restore();
    },
  ];
  function drawShow(cols, rows, t) {
    if (show.width !== cols || show.height !== rows) { show.width = cols; show.height = rows; }
    sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1;
    sx.fillStyle = '#000'; sx.fillRect(0, 0, cols, rows);
    if (video && video.readyState >= 2 && video.videoWidth) {
      // cover-crop the video into the grid
      const vr = video.videoWidth / video.videoHeight, gr = cols / rows;
      let sw = video.videoWidth, sh = video.videoHeight, ox = 0, oy = 0;
      if (vr > gr) { sw = sh * gr; ox = (video.videoWidth - sw) / 2; } else { sh = sw / gr; oy = (video.videoHeight - sh) / 2; }
      sx.drawImage(video, ox, oy, sw, sh, 0, 0, cols, rows);
    } else {
      const idx = Math.floor(t / SCENE), local = t - idx * SCENE;
      sx.globalCompositeOperation = 'lighter';
      sx.globalAlpha = 1; scenes[idx % scenes.length](cols, rows, t);
      if (local > SCENE - FADE) {           // crossfade into the next scene
        const f = (local - (SCENE - FADE)) / FADE;
        sx.globalCompositeOperation = 'source-over';
        sx.globalAlpha = f; sx.fillStyle = '#000'; sx.fillRect(0, 0, cols, rows);
        sx.globalCompositeOperation = 'lighter';
        scenes[(idx + 1) % scenes.length](cols, rows, t);
      }
    }
    return sx.getImageData(0, 0, cols, rows).data;
  }

  /* ---------- the wall ---------- */
  const ctx = fx$.getContext('2d');
  let W, H, step, cols, rows, cells = [];
  const t0 = performance.now();

  function build() {
    W = hero.clientWidth; H = hero.clientHeight;
    fx$.width = W * DPR; fx$.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    step = W < 720 ? 5 : Math.max(7, Math.round(W / 190));
    const src = headlineCanvas(W, H);
    const d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    cols = Math.ceil(W / step); rows = Math.ceil(H / step);
    cells = [];
    for (let j = 0; j < rows; j++) {
      const y = j * step + step / 2;
      // fade the video towards the bottom so the intro copy + buttons stay readable
      const vmask = y / H < 0.62 ? 1 : Math.max(0.18, 1 - (y / H - 0.62) / 0.38 * 0.82);
      for (let i = 0; i < cols; i++) {
        const x = i * step + step / 2;
        let a = 0;
        for (const [ox, oy] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) {
          const px = Math.round(x + ox * step), py = Math.round(y + oy * step);
          if (px >= 0 && py >= 0 && px < src.width && py < src.height) a += d[(py * src.width + px) * 4 + 3] / 255;
        }
        cells.push({ x, y, a: a / 4, i: j * cols + i, vmask, seed: Math.random() });
      }
    }
  }

  function frame(now) {
    const t = reduced ? 3 : Math.max(0, (now - t0) / 1000);
    const px = drawShow(cols, rows, t);
    ctx.clearRect(0, 0, W, H);
    const R = W < 720 ? 55 : Math.max(110, W * 0.11), R2 = R * R;
    const sweep = (t * 0.18) % 1.4 - 0.2;
    const textPath = new Path2D(), offPath = new Path2D();
    const vidPaths = Array.from({ length: RAMP_N }, () => new Path2D());
    const lit = [];
    for (const c of cells) {
      const dx = c.x - ptr.x, dy = c.y - ptr.y, dd = dx * dx + dy * dy;
      const k = dd < R2 * 4 ? Math.exp(-dd / R2) : 0;
      if (c.a > 0.08) {
        // headline LED
        const sw = Math.exp(-Math.pow((c.x / W - sweep) * 7, 2)) * 0.35;
        const flick = c.seed > 0.985 ? (Math.sin(t * 9 + c.seed * 99) > 0.6 ? 0.45 : 1) : 1;
        const rad = step * 0.46 * Math.min(1, c.a * 1.15) * (1 + k * 0.55) * flick;
        const push = k * step * 2.2, dist = Math.sqrt(dd) || 1;
        const x = c.x + (dx / dist) * push, y = c.y + (dy / dist) * push;
        if (k > 0.12) {
          const hi = Math.floor(((Math.atan2(dy, dx) / 6.2832 + 0.5 + t * 0.12) % 1) * hover.length);
          lit.push({ x, y, rad, col: hover[hi] });
        } else { textPath.moveTo(x + rad, y); textPath.arc(x, y, rad, 0, 6.2832); }
        if (sw > 0.02) lit.push({ x, y, rad, col: `rgba(255,255,255,${sw})` });
      } else {
        // video LED
        const o = c.i * 4;
        const L = ((px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114) / 255) * c.vmask;
        if (L < 0.06) {
          const rad = step * 0.09 + k * step * 0.2;
          offPath.moveTo(c.x + rad, c.y); offPath.arc(c.x, c.y, rad, 0, 6.2832);
        } else {
          const b = Math.min(RAMP_N - 1, Math.floor(L * RAMP_N));
          const rad = step * (0.14 + 0.28 * L) * (1 + k * 0.6);
          vidPaths[b].moveTo(c.x + rad, c.y); vidPaths[b].arc(c.x, c.y, rad, 0, 6.2832);
        }
      }
    }
    ctx.fillStyle = OFF; ctx.fill(offPath);
    ctx.globalAlpha = 0.85;
    for (let b = 1; b < RAMP_N; b++) { ctx.fillStyle = ramp[b]; ctx.fill(vidPaths[b]); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = TEXT; ctx.fill(textPath);
    for (const l of lit) { ctx.beginPath(); ctx.arc(l.x, l.y, l.rad, 0, 6.2832); ctx.fillStyle = l.col; ctx.fill(); }
  }

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 120); });
  const loop = (now) => { requestAnimationFrame(loop); if (visible && cells.length) frame(now); };

  const fontsReady = document.fonts ? document.fonts.load('900 100px "Inter Tight"').catch(() => {}) : Promise.resolve();
  fontsReady.then(() => {
    hero.classList.add('hero--matrix');
    requestAnimationFrame(build);
    setTimeout(build, 1900);            // rebuild once the h1 intro has settled
    requestAnimationFrame(loop);
  });
})();
