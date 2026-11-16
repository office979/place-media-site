/* PLACEMedia — case pages: hero video loads and plays only while visible.
   The poster is a real <img> (fast LCP); the video fades in on top once it plays.
   Mobile / Save-Data get the small variant (data-src-sm). Reduced motion keeps the poster. */
(() => {
  const vids = document.querySelectorAll('video[data-src]');
  if (!vids.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const small = matchMedia('(max-width: 860px)').matches || saveData;
  if (reduced) return;
  const load = (v) => {
    if (v.src) return;
    if (v.dataset.poster) v.poster = v.dataset.poster;
    v.src = (small && v.dataset.srcSm) || v.dataset.src;
    v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target; v.muted = true;
    if (e.isIntersecting) { load(v); v.play().catch(() => {}); } else if (v.src) v.pause();
  }), { threshold: 0.2 });
  // erst nach dem Laden der Seite (Poster = LCP zuerst), dann im Leerlauf
  const start = () => (window.requestIdleCallback || ((cb) => setTimeout(cb, 200)))(() => vids.forEach((v) => io.observe(v)), { timeout: 1200 });
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  document.addEventListener('visibilitychange', () => vids.forEach((v) => { if (document.hidden && v.src) v.pause(); }));
})();
