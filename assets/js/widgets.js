/* Small interactive explainers. Each one only runs if its markup is on the page. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }

  /* ---------- Social gate (simulation page) ---------- */
  (function () {
    var root = $('gate'); if (!root) return;
    var ids = ['rel', 'aff', 'ctx', 'soc'];
    var inputs = ids.map(function (k) { return $('g-' + k); });
    var outs = ids.map(function (k) { return $('g-' + k + '-v'); });
    var fill = $('g-fill'), score = $('g-score'), verdict = $('g-verdict');
    function update() {
      var v = inputs.map(function (i) { return parseFloat(i.value); });
      v.forEach(function (x, q) { outs[q].textContent = x.toFixed(2); });
      var s = v[0] * 0.4 + v[1] * v[2] * 0.4 + v[3] * 0.2;
      score.textContent = s.toFixed(3);
      fill.style.width = Math.min(100, s * 100) + '%';
      var pass = s >= 0.45;
      root.classList.toggle('pass', pass);
      verdict.textContent = pass
        ? 'Gate open: ' + s.toFixed(2) + ' ≥ 0.45. The LLM gets called and these two talk.'
        : 'Gate closed: ' + s.toFixed(2) + ' < 0.45. No LLM call. They walk past each other.';
    }
    inputs.forEach(function (i) { i.addEventListener('input', update); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-preset]'), function (b) {
      b.addEventListener('click', function () {
        b.getAttribute('data-preset').split(',').forEach(function (x, q) { inputs[q].value = x; });
        update();
      });
    });
    update();
  })();

  /* ---------- Content-addressed cache (simulation page) ---------- */
  (function () {
    var inp = $('h-in'); if (!inp) return;
    var out = $('h-out'), st = $('h-state'), btn = $('h-run'), seen = {}, calls = $('h-calls'), nCalls = 0, nHits = 0;
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) { $('cache').hidden = true; return; }
    function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
    function keyOf(text) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(hex); }
    var req = 0;
    function show() { var my = ++req; keyOf(inp.value).then(function (h) { if (my !== req) return; out.textContent = h; st.textContent = seen[h] ? 'Already in the cache' : 'Not in the cache yet'; st.className = seen[h] ? 'hit' : 'miss'; }); }
    function run() {
      keyOf(inp.value).then(function (h) {
        if (seen[h]) { nHits++; st.textContent = 'Cache hit. Same key, same stored answer. 0 LLM calls.'; st.className = 'hit'; }
        else { seen[h] = 1; nCalls++; st.textContent = 'Cache miss. The LLM is called once and the answer is stored under this key.'; st.className = 'miss'; }
        calls.textContent = nCalls + ' LLM call' + (nCalls === 1 ? '' : 's') + ' · ' + nHits + ' replay hit' + (nHits === 1 ? '' : 's');
      });
    }
    inp.addEventListener('input', show); btn.addEventListener('click', run); show();
  })();

  /* ---------- k-mer bag of words (peptides page) ---------- */
  (function () {
    var inp = $('km-in'); if (!inp) return;
    var AA = 'ACDEFGHIKLMNPQRSTVWY', k = 2;
    var chips = $('km-chips'), stats = $('km-stats'), warn = $('km-warn');
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-k]'));
    function update() {
      var raw = inp.value.toUpperCase().replace(/\s+/g, '');
      var bad = raw.replace(new RegExp('[' + AA + ']', 'g'), '');
      var seq = raw.replace(new RegExp('[^' + AA + ']', 'g'), '');
      warn.textContent = bad ? 'Ignored ' + bad.length + ' letter' + (bad.length > 1 ? 's' : '') + ' that aren’t one of the 20 amino acids (' + Array.from(new Set(bad.split(''))).join(', ') + ').' : '';
      var counts = {}, order = [];
      for (var i = 0; i + k <= seq.length; i++) { var w = seq.slice(i, i + k); if (!counts[w]) { counts[w] = 0; order.push(w); } counts[w]++; }
      chips.innerHTML = '';
      order.sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); }).forEach(function (w, q) {
        var li = document.createElement('li');
        li.innerHTML = '<b>' + w + '</b><span>×' + counts[w] + '</span>';
        if (!reduce) li.style.animationDelay = Math.min(q * 18, 400) + 'ms';
        chips.appendChild(li);
      });
      var dim = Math.pow(20, k);
      stats.textContent = seq.length + ' residues · ' + Math.max(0, seq.length - k + 1) + ' windows · vector length 20^' + k + ' = ' + dim.toLocaleString('en-US') + ' · ' + order.length + ' non-zero';
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { k = parseInt(b.getAttribute('data-k'), 10); btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); update(); }); });
    inp.addEventListener('input', update); update();
  })();

  /* ---------- Transit light curve (exoplanet page) ---------- */
  (function () {
    var cv = $('transit'); if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d');
    var pIn = $('tr-p'), bIn = $('tr-b'), pOut = $('tr-p-v'), bOut = $('tr-b-v'), depthOut = $('tr-depth'), geoOut = $('tr-geo'), playBtn = $('tr-play');
    var U1 = 0.40, U2 = 0.26, F0 = Math.PI * (1 - U1 / 3 - U2 / 6);
    var NS = 300, XMAX = 1.45, curve = [], W = 0, H = 0, DPR = 1, phase = 0, running = !reduce, raf = 0, last = 0;
    // fixed polar sample grid over the unit planet disk
    var samp = []; (function () { var nr = 14, nt = 36; for (var i = 0; i < nr; i++) { var r0 = i / nr, r1 = (i + 1) / nr, rm = (r0 + r1) / 2, area = Math.PI * (r1 * r1 - r0 * r0) / nt; for (var j = 0; j < nt; j++) { var a = (j + 0.5) / nt * 2 * Math.PI; samp.push([rm * Math.cos(a), rm * Math.sin(a), area]); } } })();
    function I(r2) { if (r2 >= 1) return 0; var mu = Math.sqrt(1 - r2); return 1 - U1 * (1 - mu) - U2 * (1 - mu) * (1 - mu); }
    function flux(x, y, p) {
      var blocked = 0;
      for (var q = 0; q < samp.length; q++) { var sx = x + samp[q][0] * p, sy = y + samp[q][1] * p; blocked += I(sx * sx + sy * sy) * samp[q][2] * p * p; }
      return 1 - blocked / F0;
    }
    function compute() {
      var p = parseFloat(pIn.value), b = parseFloat(bIn.value);
      pOut.textContent = p.toFixed(3); bOut.textContent = b.toFixed(2);
      curve = []; var min = 1;
      for (var q = 0; q < NS; q++) { var x = -XMAX + 2 * XMAX * q / (NS - 1), f = flux(x, b, p); curve.push(f); if (f < min) min = f; }
      depthOut.textContent = ((1 - min) * 1000).toFixed(2) + ' ppt';
      geoOut.textContent = (p * p * 1000).toFixed(2) + ' ppt';
    }
    function size() {
      var r = cv.getBoundingClientRect(); DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR;
    }
    function draw() {
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
      var p = parseFloat(pIn.value), b = parseFloat(bIn.value);
      var narrow = W < 560;
      var starArea = narrow ? { x: 0, y: 0, w: W, h: H * 0.48 } : { x: 0, y: 0, w: W * 0.42, h: H };
      var plotArea = narrow ? { x: 44, y: H * 0.52, w: W - 56, h: H * 0.48 - 30 } : { x: W * 0.42 + 54, y: 16, w: W * 0.58 - 66, h: H - 50 };
      var R = Math.min(starArea.w, starArea.h) * 0.36, cx = starArea.x + starArea.w / 2, cy = starArea.y + starArea.h / 2;
      // star with limb darkening
      var grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      for (var s = 0; s <= 10; s++) { var rr = s / 10, v = rr < 1 ? I(rr * rr) : 1 - U1 - U2; grad.addColorStop(rr, 'rgb(' + Math.round(255 * v) + ',' + Math.round(200 * v + 20) + ',' + Math.round(120 * v + 20) + ')'); }
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
      g.shadowColor = 'rgba(255,180,80,0.5)'; g.shadowBlur = 30; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.strokeStyle = 'rgba(255,190,110,0.25)'; g.stroke(); g.shadowBlur = 0;
      var x = -XMAX + 2 * XMAX * phase;
      // chord
      g.strokeStyle = 'rgba(98,214,245,0.25)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(cx - XMAX * R, cy + b * R); g.lineTo(cx + XMAX * R, cy + b * R); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#05070A'; g.beginPath(); g.arc(cx + x * R, cy + b * R, p * R, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(98,214,245,0.6)'; g.lineWidth = 1; g.stroke();
      // plot
      var fmin = Math.min.apply(null, curve), lo = Math.min(fmin, 1 - 0.002) - (1 - fmin) * 0.25 - 0.0005, hi = 1 + (1 - lo) * 0.18;
      function Y(f) { return plotArea.y + (hi - f) / (hi - lo) * plotArea.h; }
      function X(q) { return plotArea.x + q / (NS - 1) * plotArea.w; }
      g.strokeStyle = 'rgba(160,175,195,0.18)'; g.lineWidth = 1; g.font = '11px "IBM Plex Mono", monospace'; g.fillStyle = '#8A94A6'; g.textAlign = 'right';
      [1, (1 + lo) / 2, lo].forEach(function (f) { var y = Y(f); g.beginPath(); g.moveTo(plotArea.x, y); g.lineTo(plotArea.x + plotArea.w, y); g.stroke(); g.fillText(f.toFixed(4), plotArea.x - 6, y + 4); });
      g.textAlign = 'center'; g.fillText('time (arbitrary units) →', plotArea.x + plotArea.w / 2, plotArea.y + plotArea.h + 22);
      g.save(); g.translate(12, plotArea.y + plotArea.h / 2); g.rotate(-Math.PI / 2); if (!narrow) g.fillText('relative flux', 0, 0); g.restore();
      var upto = Math.floor(phase * (NS - 1));
      g.strokeStyle = 'rgba(98,214,245,0.25)'; g.lineWidth = 1.5; g.beginPath();
      curve.forEach(function (f, q) { if (q) g.lineTo(X(q), Y(f)); else g.moveTo(X(q), Y(f)); }); g.stroke();
      g.strokeStyle = '#62D6F5'; g.lineWidth = 2; g.beginPath();
      for (var q = 0; q <= upto; q++) { if (q) g.lineTo(X(q), Y(curve[q])); else g.moveTo(X(q), Y(curve[q])); } g.stroke();
      g.fillStyle = '#FFB547'; g.beginPath(); g.arc(X(upto), Y(curve[upto]), 4, 0, 6.283); g.fill();
    }
    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      phase += dt / 6; if (phase > 1) phase = 0;
      draw(); raf = requestAnimationFrame(loop);
    }
    function start() { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(loop); }
    function setRun(on) { running = on; playBtn.textContent = on ? 'Pause' : 'Play'; if (on) start(); else cancelAnimationFrame(raf); }
    [pIn, bIn].forEach(function (i) { i.addEventListener('input', function () { compute(); draw(); }); });
    playBtn.addEventListener('click', function () { setRun(!running); });
    size(); compute(); phase = 0.5; draw(); playBtn.textContent = running ? 'Pause' : 'Play';
    window.addEventListener('resize', function () { size(); draw(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (!es[0].isIntersecting) cancelAnimationFrame(raf); else if (running) start(); }).observe(cv);
    else if (running) start();
  })();
  /* ---------- Peptide hero (illustration) ---------- */
  (function () {
    var cv = $('pep-hero'); if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d'), W = 0, H = 0, DPR = 1, chains = [], t0 = 0, raf = 0, vis = true;
    var seed = 11; function r() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function size() {
      var b = cv.getBoundingClientRect(); DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = b.width; H = b.height; cv.width = W * DPR; cv.height = H * DPR;
    }
    function init() {
      chains = []; seed = 11;
      var n = Math.max(18, Math.round(W / 34)), slots = 0;
      for (var i = 0; i < n; i++) {
        var asm = r() < 0.45;
        chains.push({ x: r() * W, y: r() * H, a: r() * Math.PI * 2, vx: (r() - 0.5) * 0.4, vy: (r() - 0.5) * 0.4, va: (r() - 0.5) * 0.02, asm: asm, slot: asm ? slots++ : -1 });
      }
      chains.nslots = slots;
    }
    function step(T) {
      var phase = (T % 16) / 16, gather = phase < 0.62 ? Math.min(1, phase / 0.4) : Math.max(0, 1 - (phase - 0.62) / 0.12);
      var gap = 14, x0 = W / 2 - (chains.nslots - 1) * gap / 2;
      chains.forEach(function (c) {
        c.x += c.vx + Math.sin(T * 1.3 + c.y * 0.05) * 0.15; c.y += c.vy + Math.cos(T * 1.1 + c.x * 0.05) * 0.15; c.a += c.va;
        if (c.x < -30) c.x = W + 30; if (c.x > W + 30) c.x = -30; if (c.y < -30) c.y = H + 30; if (c.y > H + 30) c.y = -30;
        if (c.asm && gather > 0) {
          var tx = x0 + c.slot * gap, ty = H / 2, k = 0.06 * gather;
          c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
          var da = ((Math.PI / 2 - c.a) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2; c.a += da * k;
        }
      });
    }
    function draw() {
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
      chains.forEach(function (c) {
        var col = c.asm ? '98,214,245' : '154,168,187', dx = Math.cos(c.a) * 7, dy = Math.sin(c.a) * 7;
        g.strokeStyle = 'rgba(' + col + ',0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(c.x - dx * 2, c.y - dy * 2); g.lineTo(c.x + dx * 2, c.y + dy * 2); g.stroke();
        for (var k = -2; k <= 2; k++) {
          g.fillStyle = 'rgba(' + col + ',' + (c.asm ? 0.9 : 0.55) + ')';
          g.beginPath(); g.arc(c.x + dx * k, c.y + dy * k, k === 0 ? 3.2 : 2.6, 0, 6.283); g.fill();
        }
      });
    }
    function loop(now) { if (!vis) return; if (!t0) t0 = now; step((now - t0) / 1000 + 3); draw(); raf = requestAnimationFrame(loop); }
    size(); init();
    if (reduce) { for (var q = 0; q < 300; q++) step(3 + q / 60); draw(); }
    else raf = requestAnimationFrame(loop);
    window.addEventListener('resize', function () { size(); init(); if (reduce) { for (var q = 0; q < 300; q++) step(3 + q / 60); draw(); } });
    if ('IntersectionObserver' in window && !reduce) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; cancelAnimationFrame(raf); if (vis) raf = requestAnimationFrame(loop); }).observe(cv);
  })();
})();
