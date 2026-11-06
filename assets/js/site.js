/* Shared behaviour for every page: background traffic, lightbox, videos, placeholders, copy email, widgets. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* Placeholder links stay hidden until a real URL is pasted in. */
  $$('a[data-placeholder]').forEach(function (a) {
    if (!/^https?:\/\//.test(a.getAttribute('href') || '')) { var li = a.closest('li') || a; li.hidden = true; }
  });

  /* Optional images (the portrait) disappear if the file isn't there yet. */
  $$('img[data-optional]').forEach(function (im) {
    function gone() { im.remove(); }
    if (im.complete && im.naturalWidth === 0) gone(); else im.addEventListener('error', gone);
  });

  /* Optional videos (e.g. the dragon dance clip): only shown once the file exists. */
  $$('[data-video]').forEach(function (box) {
    var src = box.getAttribute('data-video');
    if (!window.fetch) return;
    fetch(src, { method: 'HEAD' }).then(function (r) {
      if (!r.ok) return;
      var v = document.createElement('video');
      v.controls = true; v.playsInline = true; v.preload = 'metadata'; v.src = src;
      var poster = box.getAttribute('data-poster'); if (poster) v.poster = poster;
      box.appendChild(v);
      var c = box.getAttribute('data-caption');
      if (c) { var p = document.createElement('p'); p.className = 'w-note'; p.textContent = c; box.appendChild(p); }
      box.classList.add('on');
    }).catch(function () {});
  });

  /* Copy email */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      function done() { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); }
      function fallback() {
        var t = document.getElementById(btn.getAttribute('aria-controls'));
        if (!t) return; var r = document.createRange(); r.selectNodeContents(t);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected';
      }
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  /* Videos: autoplay muted only while on screen, never with reduced motion. */
  $$('video[data-auto]').forEach(function (v) {
    v.muted = true;
    if (reduce) { v.removeAttribute('autoplay'); v.setAttribute('controls', ''); return; }
    if (!('IntersectionObserver' in window)) { v.play().catch(function () {}); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); });
    }, { threshold: 0.25 }).observe(v);
  });

  /* Lightbox */
  var dlg = $('#lightbox');
  if (dlg && dlg.showModal) {
    var img = $('img', dlg), cap = $('p', dlg);
    $$('img[data-zoom]').forEach(function (im) {
      im.tabIndex = 0; im.setAttribute('role', 'button');
      im.setAttribute('aria-label', 'Enlarge: ' + (im.alt || 'figure'));
      function open() {
        img.src = im.currentSrc || im.src; img.alt = im.alt;
        var fc = im.closest('figure'); cap.textContent = fc && fc.querySelector('figcaption') ? fc.querySelector('figcaption').textContent : '';
        dlg.showModal();
      }
      im.addEventListener('click', open);
      im.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  }

  /* Keep the current tab in view on narrow screens */
  var cur = $('.tabs [aria-current]');
  if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.parentNode.scrollLeft = cur.offsetLeft - 16;

  /* Builds filter */
  var filters = $$('[data-filter]');
  if (filters.length) {
    var items = $$('[data-tags]');
    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        filters.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        var shown = 0;
        items.forEach(function (it) {
          var ok = f === 'all' || it.getAttribute('data-tags').split(' ').indexOf(f) >= 0;
          it.hidden = !ok; if (ok) shown++;
        });
        var c = $('#filter-count'); if (c) c.textContent = shown + (shown === 1 ? ' entry' : ' entries');
      });
    });
  }

  /* Honors board: split-flap on hover/focus */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  $$('.flap').forEach(function (el) {
    var final = el.textContent, busy = false;
    var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = final; el.parentNode.insertBefore(sr, el.nextSibling); el.setAttribute('aria-hidden', 'true');
    function run() {
      if (busy || reduce) return; busy = true;
      var n = 0;
      var iv = setInterval(function () {
        n++;
        el.textContent = final.split('').map(function (ch, i) {
          if (ch === ' ' || i < n * 1.6) return ch;
          return GLYPHS[(i * 7 + n * 13) % GLYPHS.length];
        }).join('');
        if (n * 1.6 >= final.length) { clearInterval(iv); el.textContent = final; busy = false; }
      }, 28);
    }
    var row = el.closest('tr') || el;
    row.addEventListener('mouseenter', run);
  });

  /* Board clock */
  var bc = $('#board-clock');
  if (bc) {
    var tick = function () {
      var d = new Date();
      var f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Hong_Kong', hour12: false });
      bc.textContent = f.format(d) + ' HKT';
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- Background traffic (inner pages) ---------- */
  var c = document.getElementById('bg');
  if (c && c.getContext) {
    var g = c.getContext('2d'), W = 0, H = 0, DPR = 1, GAP = 96, agents = [], mx = -999, my = -999, raf = 0, on = true, lastT = 0;
    var grid = document.createElement('canvas'), gg = grid.getContext('2d');
    var ANG = -0.17, cosA = Math.cos(ANG), sinA = Math.sin(ANG);
    function size() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * DPR; c.height = H * DPR; c.style.width = W + 'px'; c.style.height = H + 'px';
      // grid drawn once, one GAP taller so it can scroll by an offset
      grid.width = W * DPR; grid.height = (H + GAP * 2) * DPR;
      gg.setTransform(DPR, 0, 0, DPR, 0, 0); gg.clearRect(0, 0, W, H + GAP * 2);
      gg.strokeStyle = 'rgba(120,140,165,0.07)'; gg.lineWidth = 1;
      for (var x = -8; x < W / GAP + 8; x++) { var a = toScreen(x, -8, -GAP), b = toScreen(x, H / GAP + 10, -GAP); gg.beginPath(); gg.moveTo(a[0], a[1]); gg.lineTo(b[0], b[1]); gg.stroke(); }
      for (var y = -8; y < H / GAP + 10; y++) { a = toScreen(-8, y, -GAP); b = toScreen(W / GAP + 8, y, -GAP); gg.beginPath(); gg.moveTo(a[0], a[1]); gg.lineTo(b[0], b[1]); gg.stroke(); }
      var n = Math.min(60, Math.round(W * H / 22000));
      agents = [];
      var seed = 7;
      function r() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      for (var q = 0; q < n; q++) {
        var gx = Math.floor(r() * (W / GAP + 6)) - 3, gy = Math.floor(r() * (H / GAP + 6)) - 3;
        agents.push({ gx: gx, gy: gy, h: r() < 0.5, dir: r() < 0.5 ? 1 : -1, t: r(), v: 0.008 + r() * 0.012, col: r() < 0.14 ? '255,181,71' : r() < 0.3 ? '98,214,245' : '184,195,211', rand: r });
      }
    }
    function toScreen(x, y, off) {
      var X = x * GAP, Y = y * GAP - off;
      return [W / 2 + (X - W / 2) * cosA - (Y - H / 2) * sinA, H / 2 + (X - W / 2) * sinA + (Y - H / 2) * cosA];
    }
    function drawBg(now) {
      if (!reduce && on) raf = requestAnimationFrame(drawBg);
      if (!reduce && now && now - lastT < 33) return;
      lastT = now || 0;
      var off = (window.scrollY * 0.12) % GAP;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(grid, 0, -(GAP - off) * DPR);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.lineWidth = 1.4;
      agents.forEach(function (A) {
        if (!reduce) {
          A.t += A.v * A.dir;
          if (A.t > 1 || A.t < 0) {
            if (A.h) A.gx += A.dir; else A.gy += A.dir;
            A.t = A.dir > 0 ? 0 : 1;
            if (A.rand() < 0.35) { A.h = !A.h; A.t = A.dir > 0 ? 0 : 1; }
            if (A.gx < -4 || A.gx > W / GAP + 4 || A.gy < -4 || A.gy > H / GAP + 6) A.dir *= -1;
          }
        }
        var px = A.h ? A.gx + A.t : A.gx, py = A.h ? A.gy : A.gy + A.t;
        var p = toScreen(px, py, off);
        var q = toScreen(A.h ? px - 0.25 * A.dir : px, A.h ? py : py - 0.25 * A.dir, off);
        g.strokeStyle = 'rgba(' + A.col + ',0.22)'; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0], p[1]); g.stroke();
        g.fillStyle = 'rgba(' + A.col + ',0.75)'; g.beginPath(); g.arc(p[0], p[1], 1.8, 0, 6.283); g.fill();
        var dx = p[0] - mx, dy = p[1] - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) { g.strokeStyle = 'rgba(255,181,71,' + (0.28 * (1 - d / 150)) + ')'; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(mx, my); g.stroke(); }
      });
    }
    size(); drawBg(0);
    window.addEventListener('resize', function () { size(); if (reduce) drawBg(0); });
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
    if (reduce) window.addEventListener('scroll', function () { drawBg(0); }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      on = !document.hidden; cancelAnimationFrame(raf); if (on && !reduce) raf = requestAnimationFrame(drawBg);
    });
  }
})();
