/* PLACEMedia — interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- split hero title into chars ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch;
      s.style.transitionDelay = `${0.15 + i * 0.035}s`;
      el.appendChild(s);
    });
  });
  $$('.hero__title .line').forEach((l, li) => $$('.char', l).forEach((c) => {
    c.style.transitionDelay = `${parseFloat(c.style.transitionDelay) + li * 0.18}s`;
  }));

  /* ---------- loader ---------- */
  document.body.classList.add('is-loading');
  const loader = $('.loader');
  const countEl = $('[data-count]');
  const bar = $('.loader__line span');
  let n = 0, done = false;
  const finish = () => {
    if (done) return; done = true;
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.documentElement.classList.add('is-ready');
    setTimeout(() => loader.remove(), 1200);
  };
  if (reduced) { finish(); } else {
    const L0 = performance.now(), LDUR = 1500;
    const tick = () => {
      if (done) return;
      const p = Math.min(1, (performance.now() - L0) / LDUR);
      n = Math.round(100 * (1 - Math.pow(1 - p, 2)));
      countEl.textContent = String(n).padStart(3, '0');
      bar.style.width = n + '%';
      if (p < 1) setTimeout(tick, 40); else setTimeout(finish, 200);
    };
    tick();
    setTimeout(finish, 2600); // hard cap — never block the page
  }

  /* ---------- clocks ---------- */
  const fmt = (tz) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());
  const clocks = () => {
    const v = $('[data-clock-vie]'), d = $('[data-clock-dxb]');
    if (v) v.textContent = 'VIE ' + fmt('Europe/Vienna');
    if (d) d.textContent = 'DXB ' + fmt('Asia/Dubai');
    const u = $('[data-clock-us]');
    if (u) u.textContent = 'NYC ' + fmt('America/New_York');
  };
  clocks(); setInterval(clocks, 30000);

  /* ---------- nav ---------- */
  const nav = $('.nav');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY && !nav.classList.contains('is-open'));
    lastY = y;
  }, { passive: true });

  const burger = $('.nav__burger');
  const menu = $('.menu');
  const toggleMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
  };
  burger.addEventListener('click', () => toggleMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- cursor ---------- */
  if (finePointer && !reduced) {
    const cur = $('.cursor');
    const label = $('.cursor__label');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; });
    const loop = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cur.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; cur.classList.add('is-big'); });
      el.addEventListener('mouseleave', () => cur.classList.remove('is-big'));
    });
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .case').forEach((el) => io.observe(el));

  /* ---------- philosophy word highlight ---------- */
  const words = $('[data-words]');
  if (words) {
    words.innerHTML = words.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    const ws = $$('.w', words);
    const onScroll = () => {
      const r = words.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.35)));
      const k = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('on', i < k));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, to = +el.dataset.to, suf = el.dataset.suffix || '';
      const t0 = performance.now(), dur = reduced ? 0 : 1600;
      const step = (t) => {
        const p = dur ? Math.min(1, (t - t0) / dur) : 1;
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(to * eased) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$('[data-to]').forEach((el) => cio.observe(el));

  /* ---------- work rail: drag + wheel ---------- */
  const rail = $('[data-rail]');
  if (rail) {
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag');
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      moved = Math.abs(e.clientX - sx);
      rail.scrollLeft = sl - (e.clientX - sx);
    });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('is-drag'); });
    rail.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);
  }

  /* ---------- control deck timecode ---------- */
  const tc = $('[data-tc]');
  if (tc) {
    const start = performance.now();
    const pad = (v) => String(v).padStart(2, '0');
    setInterval(() => {
      const ms = performance.now() - start + 42 * 60000 + 17000;
      const f = Math.floor((ms % 1000) / 40), s = Math.floor(ms / 1000);
      tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
    }, 40);
  }

  /* ---------- glass keycap ---------- */
  const key = $('[data-key]');
  if (key) {
    const layers = $('.key__layers', key);
    const N = 16, depth = 70;
    for (let i = 0; i < N; i++) {
      const l = document.createElement('div');
      l.className = 'key__layer';
      const t = i / (N - 1);
      const s = 1 - t * 0.24; // taper towards the top
      l.style.transform = `translateZ(${t * depth}px) scale(${s})`;
      l.style.setProperty('--a', `${i * 22}deg`);
      if (i === N - 1) {
        l.style.background = 'linear-gradient(135deg, rgba(255,255,255,.28), rgba(255,255,255,.04) 45%, rgba(130,170,255,.18) 70%, rgba(255,80,140,.22))';
        l.style.borderColor = 'rgba(255,255,255,.55)';
      }
      layers.appendChild(l);
    }
    key.style.setProperty('--top', depth + 2 + 'px');
    let a = 0, mx = 0, my = 0;
    addEventListener('mousemove', (e) => {
      mx = (e.clientX / innerWidth - 0.5); my = (e.clientY / innerHeight - 0.5);
    });
    const spin = () => {
      a += reduced ? 0 : 0.6;
      $$('.key__layer', layers).forEach((l, i) => l.style.setProperty('--a', `${a + i * 22}deg`));
      key.style.transform = `rotateX(${56 - my * 18}deg) rotateZ(${-38 + mx * 30}deg)`;
      requestAnimationFrame(spin);
    };
    const kio = new IntersectionObserver(([e]) => { key._vis = e.isIntersecting; });
    kio.observe(key);
    spin();
    key.addEventListener('click', () => { key.animate([{ translate: '0 0' }, { translate: '0 14px' }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' }); });
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.classList.contains('is-open')) {
      document.getElementById('contact').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
    if (e.key === 'Escape') toggleMenu(false);
  });

})();

/* ---------- Behind the scenes: click-to-load YouTube (youtube-nocookie) ---------- */
(() => {
  const player = document.querySelector('.bts__player');
  if (!player) return;
  const embed = (src) => {
    const f = document.createElement('iframe');
    f.src = src;
    f.title = 'PLACEMedia — behind the scenes';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    player.querySelector('iframe')?.remove();
    player.appendChild(f);
    player.classList.add('is-playing');
  };
  const srcFor = (id) => id
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(player.dataset.ytList)}&autoplay=1&rel=0&modestbranding=1`;
  player.addEventListener('click', () => { if (!player.classList.contains('is-playing')) embed(srcFor(player.dataset.ytVideo)); });
  player.addEventListener('keydown', (e) => { if (e.key === 'Enter') player.click(); });

  // episodes with data-yt-video become clickable and play in the main player
  document.querySelectorAll('.ep[data-yt-video]').forEach((ep) => {
    ep.classList.add('is-live');
    const st = ep.querySelector('.ep__status'); if (st) st.textContent = 'Watch ↗';
    ep.addEventListener('click', () => {
      embed(srcFor(ep.dataset.ytVideo));
      player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
})();

/* ---------- case videos: play only while visible ---------- */
(() => {
  const vids = document.querySelectorAll('.case__media video');
  if (!vids.length) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target; v.muted = true;
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.25 });
  vids.forEach((v) => io.observe(v));
})();

/* ---------- BTS: compact until the first vlog is set ---------- */
(() => {
  const bts = document.querySelector('.bts');
  if (bts && !bts.querySelector('[data-yt-video]')) bts.classList.add('bts--soon');
})();

/* ---------- inquiry form → Google Sheet + confirmation mail (Apps Script), mail-app fallback ---------- */
(() => {
  const f = document.querySelector('[data-inq]');
  if (!f) return;
  const to = f.querySelector('.inq__alt a[href^="mailto:"]').getAttribute('href').slice(7);
  const endpoint = (f.dataset.endpoint || '').trim();
  const err = f.querySelector('.inq__err');
  const btn = f.querySelector('button[type="submit"]');
  const done = document.querySelector('.inq-done');
  const okMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  const mailFallback = (d) => {
    const subject = `New project — ${d.company || d.name} (${String(d.type).split(' —')[0]})`;
    const body = [`Name: ${d.name}`, `Email: ${d.email}`, `Company: ${d.company || '—'}`, `Need: ${d.type}`, `Budget: ${d.budget}`, `Timing: ${d.timing || '—'}`, '', d.msg].join('\n');
    location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const showError = (msg) => { err.hidden = false; err.innerHTML = msg; };

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const d = Object.fromEntries(new FormData(f));
    const bad = [];
    if (!String(d.name || '').trim()) bad.push('name');
    if (!okMail(String(d.email || '').trim())) bad.push('email');
    if (!String(d.msg || '').trim()) bad.push('msg');
    f.querySelectorAll('input, textarea').forEach((el) => { el.style.borderColor = bad.includes(el.name) ? '#E85002' : ''; });
    if (bad.length) { f.querySelector(`[name="${bad[0]}"]`).focus(); return; }
    if (!endpoint) { mailFallback(d); return; }

    btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.innerHTML = 'Sending…';
    try {
      // text/plain body = "simple" request, no CORS preflight (Apps Script can't answer one)
      const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify({ ...d, source: location.href }) });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || 'failed');
      const n = done.querySelector('[data-inq-name]');
      n.textContent = ', ' + String(d.name).trim().split(/\s+/)[0];
      f.hidden = true; done.hidden = false; done.focus();
    } catch (x) {
      btn.disabled = false; btn.innerHTML = btn.dataset.label;
      showError(x.message === 'invalid_email'
        ? 'That email address doesn\'t look right — please check it.'
        : `Something went wrong on our side. Please write to <a href="mailto:${to}">${to}</a> — we'll still reply within 24 hours.`);
    }
  });
})();
