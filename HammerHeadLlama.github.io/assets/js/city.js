/* The city on the home page.
   A small deterministic agent simulation: seeded RNG, fixed 30 Hz ticks, A* on a street graph.
   Same seed + same event schedule = same state hash at the same tick. */
(function () {
  'use strict';
  var canvas = document.getElementById('city');
  if (!canvas || !canvas.getContext) return;
  var wrap = document.getElementById('city-wrap');
  var box = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  // sqrt instead of Math.hypot: hypot may round differently across browser engines, which would break replay.
  function hyp(a, b) { return Math.sqrt(a * a + b * b); }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- World (fixed, generated once) ---------- */
  var G = 130, COLS = 7, ROWS = 5;
  var I0 = -5, I1 = COLS + 5, J0 = -3, J1 = ROWS + 3;
  var wr = mulberry32(9708);
  var nodes = [], nid = {};
  function k(i, j) { return i + ',' + j; }
  for (var j = J0; j <= J1; j++) for (var i = I0; i <= I1; i++) {
    var core = i >= 0 && i <= COLS && j >= 0 && j <= ROWS;
    var jit = core ? 5 : 13;
    nodes.push({ id: nodes.length, i: i, j: j, x: i * G + (wr() * 2 - 1) * jit, y: j * G + (wr() * 2 - 1) * jit, nb: [], core: core, aff: 0.35 });
    nid[k(i, j)] = nodes.length - 1;
  }
  var edges = [];
  function addEdge(a, b) {
    var A = nodes[a], B = nodes[b];
    var major = (A.i === B.i && A.i % 3 === 0) || (A.j === B.j && A.j % 3 === 0);
    var e = { a: a, b: b, major: major, len: hyp(A.x - B.x, A.y - B.y) };
    edges.push(e); A.nb.push({ to: b, e: e }); B.nb.push({ to: a, e: e });
  }
  var cand = [], deg = nodes.map(function () { return 0; });
  for (j = J0; j <= J1; j++) for (i = I0; i <= I1; i++) {
    if (i < I1) cand.push([nid[k(i, j)], nid[k(i + 1, j)]]);
    if (j < J1) cand.push([nid[k(i, j)], nid[k(i, j + 1)]]);
  }
  cand.forEach(function (p) { deg[p[0]]++; deg[p[1]]++; });
  cand.forEach(function (p) {
    var A = nodes[p[0]], B = nodes[p[1]];
    if (!(A.core && B.core) && wr() < 0.15 && deg[p[0]] > 2 && deg[p[1]] > 2) { deg[p[0]]--; deg[p[1]]--; return; }
    addEdge(p[0], p[1]);
  });

  // River through the south-west outskirts.
  var river = [[-5.6 * G, 0.2 * G], [-3.4 * G, 2.2 * G], [-1.9 * G, 5.2 * G], [0.4 * G, 6.6 * G], [3.6 * G, 7.3 * G], [7.6 * G, 7.5 * G], [12.6 * G, 7.1 * G]];
  function distToRiver(x, y) {
    var best = 1e9;
    for (var q = 0; q < river.length - 1; q++) {
      var ax = river[q][0], ay = river[q][1], bx = river[q + 1][0], by = river[q + 1][1];
      var dx = bx - ax, dy = by - ay, t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, hyp(x - (ax + t * dx), y - (ay + t * dy)));
    }
    return best;
  }

  var LANDMARKS = [
    { id: 'lab', i: 3, j: 1, h: 96, name: 'LAB', sub: 'Urban simulation', href: 'simulation.html',
      title: 'Generative-agent urban simulation',
      text: 'LLM-driven pedestrians in Da’an District, Taipei. I built the social gate, byte-identical replay, fork-and-compare and the Gates 0–7 suite. Accepted as a long oral at TAAI 2026.',
      stat: 'Largest run: 500 agents' },
    { id: 'bio', i: 1, j: 1, h: 46, name: 'BIO LAB', sub: 'Peptide ML', href: 'peptides.html',
      title: 'Peptide self-assembly from sequence',
      text: 'Three machine-learning pipelines that predict whether a short peptide self-assembles from its amino-acid sequence. Published through GMU Young Scholars.',
      stat: 'Best CV AUC 0.996. Oversampling ran before the split, so it’s an upper bound.' },
    { id: 'obs', i: 5, j: 0, h: 38, name: 'OBSERVATORY', sub: 'TOI 5147.01', href: 'exoplanet.html',
      title: 'Exoplanet follow-up photometry',
      text: 'Ground-based follow-up photometry on a TESS candidate at the GMU Observatory. Calibrated light curves, and the nearby-eclipsing-binary checks came back clean.',
      stat: '4096 × 4096 FITS frames' },
    { id: 'work', i: 5, j: 3, h: 30, name: 'WORKSHOP', sub: 'Builds', href: 'builds.html',
      title: 'Workshop',
      text: 'A Wirtz pump, two VEX robots, a Monte Carlo model, the math I can’t post yet, and community projects.',
      stat: 'Pump lift: 170.7 cm, under a 379 cm model bound' },
    { id: 'hall', i: 1, j: 3, h: 34, name: 'HALL', sub: 'Honors', href: 'honors.html',
      title: 'Honors',
      text: 'HKYPT Silver, HiMCM Honorable Mention, AIME qualifier, VEX Inspire Award, and the rest of the board.',
      stat: '10 entries' },
    { id: 'home', i: 3, j: 3, h: 24, name: 'HOME', sub: 'About me', href: 'about.html',
      title: 'About',
      text: 'Who I am, how physics started for me, and how to reach me.',
      stat: 'IB Year 2 · Hong Kong' },
    { id: 'post', i: 6, j: 2, h: 22, name: 'POST OFFICE', sub: 'Contact', href: 'about.html#contact',
      title: 'Contact',
      text: 'daniel.tsen9708@gmail.com',
      stat: 'Email is the fastest way' }
  ];
  var lmByCell = {};
  LANDMARKS.forEach(function (L) { lmByCell[k(L.i, L.j)] = L; L.door = nid[k(L.i, L.j + 1)]; nodes[L.door].aff = 0.7; L.cx = 0; });

  var PARK = k(2, 2);
  var cells = [], buildings = [], trees = [];
  for (j = J0; j < J1; j++) for (i = I0; i < I1; i++) {
    var a = nodes[nid[k(i, j)]], b = nodes[nid[k(i + 1, j)]], c = nodes[nid[k(i + 1, j + 1)]], d = nodes[nid[k(i, j + 1)]];
    var cell = { i: i, j: j, x0: Math.max(a.x, d.x), x1: Math.min(b.x, c.x), y0: Math.max(a.y, b.y), y1: Math.min(c.y, d.y) };
    cell.cx = (cell.x0 + cell.x1) / 2; cell.cy = (cell.y0 + cell.y1) / 2;
    var inset = 16, X0 = cell.x0 + inset, X1 = cell.x1 - inset, Y0 = cell.y0 + inset, Y1 = cell.y1 - inset;
    var key = k(i, j);
    if (key === PARK) {
      cell.park = true;
      [a, b, c, d].forEach(function (n) { n.aff = 0.9; });
      for (var t = 0; t < 26; t++) trees.push({ x: X0 + wr() * (X1 - X0), y: Y0 + wr() * (Y1 - Y0), r: 5 + wr() * 6 });
    } else if (distToRiver(cell.cx, cell.cy) < 0.62 * G) {
      cell.water = true;
    } else if (lmByCell[key]) {
      var L = lmByCell[key];
      var pad = 6;
      L.b = { x0: X0 + pad, y0: Y0 + pad + 4, x1: X1 - pad, y1: Y1 - pad, h: L.h };
      buildings.push({ x0: L.b.x0, y0: L.b.y0, x1: L.b.x1, y1: L.b.y1, h: L.h, lm: L, win: [] });
    } else {
      var isCore = i >= 0 && i < COLS && j >= 0 && j < ROWS;
      var nx = 1 + Math.floor(wr() * 3), ny = 1 + Math.floor(wr() * 2), gap = 7;
      var w = (X1 - X0 - gap * (nx - 1)) / nx, hgt = (Y1 - Y0 - gap * (ny - 1)) / ny;
      for (var yy = 0; yy < ny; yy++) for (var xx = 0; xx < nx; xx++) {
        if (wr() < 0.13) continue;
        var bx0 = X0 + xx * (w + gap), by0 = Y0 + yy * (hgt + gap);
        var H = isCore ? 10 + wr() * 30 : 5 + wr() * 22;
        var win = [];
        var cols = Math.floor(w / 9), rows = Math.floor(H / 8);
        for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) if (wr() < 0.16) win.push([bx0 + 4 + q * 9, 4 + r * 8, wr() < 0.8]);
        buildings.push({ x0: bx0, y0: by0, x1: bx0 + w, y1: by0 + hgt, h: H, win: win });
      }
    }
    cells.push(cell);
  }
  buildings.sort(function (p, q) { return (p.y1 - q.y1) || (q.x0 - p.x0); });

  // Reachable set (from the spawn) for destinations.
  var SPAWN = nid[k(3, ROWS)];
  var reach = [], seen = {}; var stack = [SPAWN]; seen[SPAWN] = 1;
  while (stack.length) { var n0 = stack.pop(); reach.push(n0); nodes[n0].nb.forEach(function (o) { if (!seen[o.to]) { seen[o.to] = 1; stack.push(o.to); } }); }
  var coreReach = reach.filter(function (id) { var n = nodes[id]; return n.i >= -1 && n.i <= COLS + 1 && n.j >= -1 && n.j <= ROWS + 1; });
  var parkNodes = [nid[k(2, 2)], nid[k(3, 2)], nid[k(2, 3)], nid[k(3, 3)]];

  function astar(s, goal) {
    if (s === goal) return [s];
    var open = [s], g = {}, f = {}, from = {}, closed = {};
    var gx = nodes[goal].x, gy = nodes[goal].y;
    g[s] = 0; f[s] = hyp(nodes[s].x - gx, nodes[s].y - gy);
    while (open.length) {
      var bi = 0;
      for (var q = 1; q < open.length; q++) if (f[open[q]] < f[open[bi]]) bi = q;
      var cur = open.splice(bi, 1)[0];
      if (cur === goal) { var path = [cur]; while (from[cur] !== undefined) { cur = from[cur]; path.push(cur); } return path.reverse(); }
      closed[cur] = 1;
      var nb = nodes[cur].nb;
      for (var m = 0; m < nb.length; m++) {
        var to = nb[m].to; if (closed[to]) continue;
        var cost = g[cur] + nb[m].e.len * (nb[m].e.major ? 0.88 : 1);
        if (g[to] === undefined || cost < g[to]) {
          from[to] = cur; g[to] = cost; f[to] = cost + hyp(nodes[to].x - gx, nodes[to].y - gy);
          if (open.indexOf(to) < 0) open.push(to);
        }
      }
    }
    return [s];
  }

  /* ---------- Simulation state (reset by replay) ---------- */
  var FACTS = [
    'Same prompt, same SHA-256 key, same answer. That’s how the lab sim replays byte for byte.',
    'On physics alone, bikes won 76% of simulated trips. So the LLM decides the near-ties.',
    'The gate suite caught five silent drifts. Three were hiding in one merge.',
    'Best peptide AUC was 0.996, cross-validated. Oversampling ran before the split, so it’s an upper bound.',
    'I did ground-based follow-up photometry on TESS candidate TOI 5147.01 at the GMU Observatory.',
    'The Wirtz pump lifted 170.7 cm. The model’s bound was 379 cm, and no run beat it.',
    'A VEX robot failed inspection 11.76 cm over the limit. Unit conversion.',
    'The sim paper is a long oral at TAAI 2026, Nov 20–21.',
    'In the HKYPT final, the other team said the model ignored surface tension. They were right.',
    'LLM_CACHE=0 cost a whole night. Strict replay now throws if the cache is off.'
  ];
  var SEED = 20260707, GATE = 0.45, TPS = 30;
  var N_AGENTS = 64; // fixed, so phones and desktops replay the same city
  var sim;
  var schedule = []; // [{tick, type}]

  function newSim() {
    var rng = mulberry32(SEED);
    var agents = [];
    for (var q = 0; q < N_AGENTS; q++) {
      var home = coreReach[Math.floor(rng() * coreReach.length)];
      var hue = rng();
      agents.push({ id: q, name: 'A' + (q < 9 ? '0' : '') + (q + 1), node: home, path: [home], seg: 0, t: 0,
        speed: 0.9 + rng() * 0.7, open: rng(), dwell: Math.floor(rng() * 120), boost: 0,
        col: hue < 0.12 ? '#FFB547' : hue < 0.3 ? '#62D6F5' : '#B8C3D3',
        x: nodes[home].x, y: nodes[home].y, px: nodes[home].x, py: nodes[home].y, trail: [] });
    }
    return { rng: rng, tick: 0, agents: agents, talks: 0, fam: {}, cool: {}, links: [], quakes: [], hash: '00000000', mark: '00000000', branch: 'base' };
  }

  function planNew(A, s) {
    var r = s.rng(), dest;
    if (r < 0.35) dest = LANDMARKS[Math.floor(s.rng() * LANDMARKS.length)].door;
    else if (r < 0.5) dest = parkNodes[Math.floor(s.rng() * parkNodes.length)];
    else dest = coreReach[Math.floor(s.rng() * coreReach.length)];
    A.path = astar(A.node, dest); A.seg = 0; A.t = 0;
  }

  function fnv(h, v) { h ^= v & 0xff; h = Math.imul(h, 16777619); h ^= (v >>> 8) & 0xff; h = Math.imul(h, 16777619); h ^= (v >>> 16) & 0xff; return Math.imul(h, 16777619); }

  var START_MIN = 18 * 60; // the city opens at golden hour
  function hourOf(tick) { return ((START_MIN + tick / TPS * 10) / 60) % 24; }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function daylight(h) { return Math.min(smooth((h - 5.5) / 2), smooth((19.5 - h) / 2)); }
  function duskGlow(h) { return Math.max(0, 1 - Math.abs(h - 18.6) / 1.3, 1 - Math.abs(h - 6.4) / 1.3); }
  function clockOf(tick) {
    var mins = START_MIN + Math.floor(tick / TPS) * 10;
    var day = 1 + Math.floor(mins / 1440); mins %= 1440;
    var hh = Math.floor(mins / 60), mm = mins % 60;
    return { day: day, str: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm };
  }

  function step(s) {
    // scheduled events
    for (var e = 0; e < schedule.length; e++) if (schedule[e].tick === s.tick) quake(s);
    var A, q;
    for (q = 0; q < s.agents.length; q++) {
      A = s.agents[q]; A.px = A.x; A.py = A.y;
      if (A.dwell > 0) { A.dwell--; if (A.dwell === 0) planNew(A, s); continue; }
      if (A.seg >= A.path.length - 1) { A.node = A.path[A.path.length - 1]; A.dwell = 30 + Math.floor(s.rng() * 110); continue; }
      var na = nodes[A.path[A.seg]], nb = nodes[A.path[A.seg + 1]];
      var len = hyp(nb.x - na.x, nb.y - na.y) || 1;
      var v = A.speed * (A.boost > 0 ? 1.8 : 1);
      if (A.boost > 0) A.boost--;
      A.t += v / len;
      if (A.t >= 1) { A.t = 0; A.seg++; A.node = A.path[A.seg]; }
      var n1 = nodes[A.path[A.seg]], n2 = nodes[A.path[Math.min(A.seg + 1, A.path.length - 1)]];
      A.x = n1.x + (n2.x - n1.x) * A.t; A.y = n1.y + (n2.y - n1.y) * A.t;
      if (s.tick % 3 === 0) { A.trail.push(A.x, A.y); if (A.trail.length > 18) A.trail.splice(0, 2); }
    }
    // agent-to-agent social gate, every 6 ticks
    if (s.tick % 6 === 0) {
      for (q = 0; q < s.agents.length; q++) for (var m = q + 1; m < s.agents.length; m++) {
        var P = s.agents[q], Q = s.agents[m];
        if (Math.abs(P.x - Q.x) > 30 || Math.abs(P.y - Q.y) > 30) continue;
        var pk = q * 1000 + m;
        if (s.cool[pk] && s.cool[pk] > s.tick) continue;
        var fam = s.fam[pk] === undefined ? (0.1 + ((q * 37 + m * 11) % 50) / 100) : s.fam[pk];
        var aff = Math.max(nodes[P.node].aff, nodes[Q.node].aff);
        var ctxm = (P.dwell > 0 && Q.dwell > 0) ? 0.9 : 0.5;
        var score = fam * 0.4 + aff * ctxm * 0.4 + ((P.open + Q.open) / 2) * 0.2;
        s.cool[pk] = s.tick + 240;
        if (score >= GATE) {
          s.talks++; s.fam[pk] = Math.min(1, fam + 0.1);
          s.links.push({ a: q, b: m, until: s.tick + 45 });
          P.dwell = Math.max(P.dwell, 24); Q.dwell = Math.max(Q.dwell, 24);
          if (s.talks % 4 === 1) log(clockOf(s.tick).str + '  ' + P.name + ' ↔ ' + Q.name + '  gate ' + score.toFixed(2) + ' ≥ 0.45  talked');
        }
      }
      s.links = s.links.filter(function (L) { return L.until > s.tick; });
    }
    // state hash (visitor excluded)
    var h = 2166136261;
    for (q = 0; q < s.agents.length; q++) { A = s.agents[q]; h = fnv(h, A.node); h = fnv(h, A.seg); h = fnv(h, Math.round(A.t * 4096)); h = fnv(h, A.dwell); }
    s.hash = ('00000000' + (h >>> 0).toString(16)).slice(-8);
    s.tick++;
    if (s.tick % TPS === 0) s.mark = s.hash; // shown in the HUD once per 10 sim minutes
  }

  function quake(s) {
    var spots = coreReach.filter(function (id) { return nodes[id].i >= 1; });
    var epi = spots[Math.floor(s.rng() * spots.length)];
    var E = nodes[epi], count = 0;
    s.agents.forEach(function (A) {
      if (hyp(A.x - E.x, A.y - E.y) < 3.2 * G) {
        var dest = parkNodes[Math.floor(s.rng() * parkNodes.length)];
        A.dwell = 0; A.path = astar(A.node, dest); A.seg = 0; A.t = 0; A.boost = 300; count++;
      }
    });
    s.quakes.push({ x: E.x, y: E.y, tick: s.tick });
    s.branch = 'fork';
    log(clockOf(s.tick).str + '  earthquake at node ' + epi + '  ' + count + ' agents re-planned to the park');
    if (!reduce) shake = 18;
  }

  /* ---------- Visitor ---------- */
  var walk = false;
  var V = { node: SPAWN, path: [SPAWN], seg: 0, t: 0, x: nodes[SPAWN].x, y: nodes[SPAWN].y, px: nodes[SPAWN].x, py: nodes[SPAWN].y, target: null, met: {}, fam: {}, said: 0, nextTalk: 0 };
  var bubbles = [];
  var held = null;

  function visitorStep(s) {
    V.px = V.x; V.py = V.y;
    if (V.seg >= V.path.length - 1) {
      V.node = V.path[V.path.length - 1]; V.x = nodes[V.node].x; V.y = nodes[V.node].y;
      if (V.target) { var L = V.target; V.target = null; openPanel(L.id); }
      if (held) keyStep(held);
    } else {
      var na = nodes[V.path[V.seg]], nb = nodes[V.path[V.seg + 1]];
      var len = hyp(nb.x - na.x, nb.y - na.y) || 1;
      V.t += 2.6 / len;
      if (V.t >= 1) { V.t = 0; V.seg++; V.node = V.path[V.seg]; }
      var n1 = nodes[V.path[V.seg]], n2 = nodes[V.path[Math.min(V.seg + 1, V.path.length - 1)]];
      V.x = n1.x + (n2.x - n1.x) * V.t; V.y = n1.y + (n2.y - n1.y) * V.t;
    }
    // encounters (read-only on NPC state, so replay stays deterministic)
    for (var q = 0; q < s.agents.length; q++) {
      var A = s.agents[q];
      if (Math.abs(A.x - V.x) > 26 || Math.abs(A.y - V.y) > 26) continue;
      if (V.met[q] && V.met[q] > frameTick) continue;
      V.met[q] = frameTick + 260;
      var fam = V.fam[q] === undefined ? 0.2 : V.fam[q];
      var aff = Math.max(nodes[A.node].aff, nodes[V.node].aff);
      var score = fam * 0.4 + aff * 0.8 * 0.4 + A.open * 0.2;
      V.fam[q] = Math.min(1, fam + 0.15);
      if (score >= GATE && frameTick < V.nextTalk) continue; // one conversation at a time
      if (score >= GATE) {
        V.nextTalk = frameTick + 200;
        bubbles = [{ a: q, text: FACTS[V.said % FACTS.length], until: frameTick + 210 }];
        V.said++;
        log('You ↔ ' + A.name + '  gate ' + score.toFixed(2) + ' ≥ 0.45  talked');
      } else {
        log('You · ' + A.name + '  gate ' + score.toFixed(2) + ' < 0.45  skipped');
      }
    }
    bubbles = bubbles.filter(function (B) { return B.until > frameTick; });
  }

  function keyStep(dir) {
    if (V.seg < V.path.length - 1) return;
    var n = nodes[V.node], best = null, bd = 0.5;
    n.nb.forEach(function (o) {
      var m = nodes[o.to], dx = m.x - n.x, dy = m.y - n.y, l = hyp(dx, dy);
      var dot = (dx * dir[0] + dy * dir[1]) / l;
      if (dot > bd) { bd = dot; best = o.to; }
    });
    if (best !== null) { V.path = [V.node, best]; V.seg = 0; V.t = 0; }
  }

  /* ---------- Projection & layers ---------- */
  var W = 0, H = 0, DPR = 1, S = 1, OX = 0, OY = 0, TILT = 0.82, HK = 0.85, XSK = 0.3;
  var groundLayer = document.createElement('canvas'), bldLayer = document.createElement('canvas'), lightLayer = document.createElement('canvas');
  function P(x, y) { return [OX + x * S, OY + y * S * TILT]; }
  function U(sx, sy) { return [(sx - OX) / S, (sy - OY) / (S * TILT)]; }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]); g.closePath(); g.fill(); }

  function fit() {
    var r = box.getBoundingClientRect();
    W = Math.max(300, r.width); H = Math.max(320, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var wide = W >= 1000;
    var leftPad = wide ? Math.min(430, W * 0.34) : 10, rightPad = 10, top = wide ? 70 : 34, bottom = wide ? 118 : 12;
    var cw = COLS * G, ch = ROWS * G * TILT + 70;
    S = Math.min((W - leftPad - rightPad) / cw, (H - top - bottom) / ch);
    S = Math.max(S, 0.26);
    OX = leftPad + (W - leftPad - rightPad - cw * S) / 2;
    OY = top + 70 * S + (H - top - bottom - ch * S) / 2;
    renderLayers();
  }

  function renderLayers() {
    [groundLayer, bldLayer, lightLayer].forEach(function (c) { c.width = canvas.width; c.height = canvas.height; });
    var g = groundLayer.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = '#080B10'; g.fillRect(0, 0, W, H);
    // river
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#0B1B28'; g.lineWidth = 1.05 * G * S;
    g.beginPath(); river.forEach(function (p, q) { var s = P(p[0], p[1]); if (q) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.stroke();
    g.strokeStyle = '#0E2333'; g.lineWidth = 0.75 * G * S; g.stroke();
    // park
    cells.forEach(function (c) {
      if (!c.park) return;
      var a = P(c.x0 + 8, c.y0 + 8), b = P(c.x1 - 8, c.y1 - 8);
      g.fillStyle = '#0D1A14'; g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    });
    trees.forEach(function (t) { var p = P(t.x, t.y); g.fillStyle = '#143022'; g.beginPath(); g.arc(p[0], p[1], t.r * S, 0, 6.283); g.fill(); g.fillStyle = '#1B3E2C'; g.beginPath(); g.arc(p[0] - t.r * S * 0.25, p[1] - t.r * S * 0.3, t.r * S * 0.55, 0, 6.283); g.fill(); });
    // streets
    edges.forEach(function (e) {
      var A = P(nodes[e.a].x, nodes[e.a].y), B = P(nodes[e.b].x, nodes[e.b].y);
      g.strokeStyle = e.major ? '#1A222D' : '#141B24'; g.lineWidth = (e.major ? 26 : 17) * S;
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    });
    g.setLineDash([6 * S, 9 * S]); g.lineWidth = Math.max(0.6, 1.1 * S); g.strokeStyle = 'rgba(160,175,195,0.16)';
    edges.forEach(function (e) {
      if (!e.major) return;
      var A = P(nodes[e.a].x, nodes[e.a].y), B = P(nodes[e.b].x, nodes[e.b].y);
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    });
    g.setLineDash([]);
    // park label + spawn marker
    var pc = cells.filter(function (c) { return c.park; })[0];
    if (pc) { var pl = P(pc.cx, pc.cy); g.fillStyle = 'rgba(120,190,150,0.45)'; g.font = '500 10px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText('PARK', pl[0], pl[1] + 4); }
    var sp = P(nodes[SPAWN].x, nodes[SPAWN].y);
    g.strokeStyle = 'rgba(255,181,71,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.arc(sp[0], sp[1], 9 * S * 2, 0, 6.283); g.stroke();

    // cast shadows (light from the north-west)
    g.fillStyle = 'rgba(0,0,0,0.38)';
    buildings.forEach(function (B) {
      var sh = B.h * 0.55;
      poly(g, [P(B.x0, B.y1), P(B.x1, B.y1), P(B.x1 + sh, B.y1 + sh * 0.6), P(B.x0 + sh, B.y1 + sh * 0.6)]);
      poly(g, [P(B.x1, B.y0), P(B.x1, B.y1), P(B.x1 + sh, B.y1 + sh * 0.6), P(B.x1 + sh, B.y0 + sh * 0.6)]);
    });
    var b = bldLayer.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildings.forEach(function (B) { drawBuilding(b, B); });
    // window lights: painter's order, each building erases the lights it hides
    var lg = lightLayer.getContext('2d');
    lg.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildings.forEach(function (B) {
      var p = boxPts(B.x0, B.y0, B.x1, B.y1, B.h);
      lg.globalCompositeOperation = 'destination-out'; lg.fillStyle = '#000';
      poly(lg, [p.a, p.d, [p.d[0] + p.ox, p.d[1] + p.oy], [p.a[0] + p.ox, p.a[1] + p.oy]]);
      poly(lg, [p.d, p.c, [p.c[0] + p.ox, p.c[1] + p.oy], [p.d[0] + p.ox, p.d[1] + p.oy]]);
      poly(lg, p.roof);
      lg.globalCompositeOperation = 'source-over';
      drawWindows(lg, B);
    });
  }

  function boxPts(x0, y0, x1, y1, h) {
    var a = P(x0, y0), bb = P(x1, y0), c = P(x1, y1), d = P(x0, y1);
    var ox = h * S * XSK, oy = -h * S * HK;
    return { a: a, b: bb, c: c, d: d, ox: ox, oy: oy,
      roof: [[a[0] + ox, a[1] + oy], [bb[0] + ox, bb[1] + oy], [c[0] + ox, c[1] + oy], [d[0] + ox, d[1] + oy]] };
  }

  function drawWindows(g, B) {
    var win = B.win;
    for (var w = 0; w < win.length; w++) {
      var base = P(win[w][0], B.y1), v = win[w][1];
      g.fillStyle = win[w][2] ? 'rgba(255,196,110,0.95)' : 'rgba(120,220,250,0.7)';
      g.fillRect(base[0] + v * S * XSK, base[1] - v * S * HK - 2.4 * S, Math.max(1.2, 3 * S), Math.max(1.2, 2.4 * S));
    }
  }

  function drawBuilding(g, B) {
    var lm = B.lm, p = boxPts(B.x0, B.y0, B.x1, B.y1, B.h);
    var col = lm ? { w: '#18222E', s: '#0E141B', r: '#243246', e: 'rgba(98,214,245,0.6)' } : { w: '#121821', s: '#0C1117', r: '#161D26', e: 'rgba(120,135,155,0.18)' };
    g.fillStyle = col.w; poly(g, [p.a, p.d, [p.d[0] + p.ox, p.d[1] + p.oy], [p.a[0] + p.ox, p.a[1] + p.oy]]);
    g.fillStyle = col.s; poly(g, [p.d, p.c, [p.c[0] + p.ox, p.c[1] + p.oy], [p.d[0] + p.ox, p.d[1] + p.oy]]);
    g.fillStyle = col.r; poly(g, p.roof);
    g.strokeStyle = col.e; g.lineWidth = lm ? 1.2 : 0.7;
    g.beginPath(); g.moveTo(p.roof[0][0], p.roof[0][1]); for (var q = 1; q < 4; q++) g.lineTo(p.roof[q][0], p.roof[q][1]); g.closePath(); g.stroke();
    // unlit window frames; the lit versions live on lightLayer
    var win = B.win;
    g.fillStyle = 'rgba(160,175,195,0.10)';
    for (var w = 0; w < win.length; w++) {
      var base = P(win[w][0], B.y1), v = win[w][1];
      g.fillRect(base[0] + v * S * XSK, base[1] - v * S * HK - 2.4 * S, Math.max(1, 3 * S), Math.max(1, 2.4 * S));
    }
    if (lm) {
      // window bands on landmark south face
      var rows = Math.floor(B.h / 10);
      for (var r = 1; r < rows; r++) {
        var y = r * 10, L0 = P(B.x0 + 6, B.y1), L1 = P(B.x1 - 6, B.y1);
        g.strokeStyle = 'rgba(98,214,245,0.16)'; g.lineWidth = Math.max(1, 2 * S);
        g.beginPath(); g.moveTo(L0[0] + y * S * XSK, L0[1] - y * S * HK); g.lineTo(L1[0] + y * S * XSK, L1[1] - y * S * HK); g.stroke();
      }
    }
  }

  /* ---------- Per-frame drawing ---------- */
  var hover = null, openId = null, shake = 0, frameTick = 0;

  function roofCenter(L) { var p = boxPts(L.b.x0, L.b.y0, L.b.x1, L.b.y1, L.h); var r = p.roof; return [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2, p]; }

  function drawDecor(g, L, time) {
    var rc = roofCenter(L), x = rc[0], y = rc[1], p = rc[2], w = (p.b[0] - p.a[0]);
    var on = hover === L || openId === L.id;
    g.save();
    if (on) {
      g.shadowColor = 'rgba(255,181,71,0.8)'; g.shadowBlur = 16;
      g.strokeStyle = '#FFB547'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(p.roof[0][0], p.roof[0][1]); for (var q = 1; q < 4; q++) g.lineTo(p.roof[q][0], p.roof[q][1]); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(p.d[0], p.d[1]); g.lineTo(p.c[0], p.c[1]); g.lineTo(p.c[0] + p.ox, p.c[1] + p.oy); g.stroke();
      g.beginPath(); g.moveTo(p.d[0], p.d[1]); g.lineTo(p.a[0], p.a[1]); g.lineTo(p.a[0] + p.ox, p.a[1] + p.oy); g.stroke();
      g.shadowBlur = 0;
    }
    var t = reduce ? 0 : time;
    var s = Math.max(0.55, S * 2.2);
    if (L.id === 'lab') {
      g.strokeStyle = 'rgba(98,214,245,0.5)'; g.lineWidth = 1;
      var r0 = p.roof, scan = (t * 0.25) % 1;
      var sx0 = r0[0][0] + (r0[1][0] - r0[0][0]) * scan, sy0 = r0[0][1] + (r0[1][1] - r0[0][1]) * scan;
      var sx1 = r0[3][0] + (r0[2][0] - r0[3][0]) * scan, sy1 = r0[3][1] + (r0[2][1] - r0[3][1]) * scan;
      g.beginPath(); g.moveTo(sx0, sy0); g.lineTo(sx1, sy1); g.stroke();
      g.strokeStyle = '#9AA8BB'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 30 * s); g.stroke();
      var blink = (Math.sin(t * 4) > 0.2);
      g.fillStyle = blink ? '#FF5C4D' : 'rgba(255,92,77,0.25)';
      g.beginPath(); g.arc(x, y - 30 * s, 2.6, 0, 6.283); g.fill();
    } else if (L.id === 'obs') {
      var R = w * 0.22;
      g.fillStyle = '#2A3646'; g.beginPath(); g.ellipse(x, y, R, R * 0.55, 0, Math.PI, 0); g.lineTo(x + R, y); g.fill();
      g.beginPath(); g.ellipse(x, y, R, R * 0.35, 0, 0, Math.PI); g.fill();
      var ang = -Math.PI / 2 + Math.sin(t * 0.35) * 0.7;
      g.strokeStyle = 'rgba(98,214,245,0.18)'; g.lineWidth = 6 * s;
      g.beginPath(); g.moveTo(x, y - R * 0.3); g.lineTo(x + Math.cos(ang) * 160 * s, y - R * 0.3 + Math.sin(ang) * 160 * s); g.stroke();
      g.strokeStyle = '#0B0F14'; g.lineWidth = Math.max(2, R * 0.18);
      g.beginPath(); g.moveTo(x, y - R * 0.05); g.lineTo(x + Math.cos(ang) * R * 0.5, y + Math.sin(ang) * R * 0.5); g.stroke();
      for (var st = 0; st < 7; st++) {
        var sx = x - 60 * s + ((st * 53) % 130) * s, sy = y - 70 * s - ((st * 37) % 60) * s;
        g.fillStyle = 'rgba(230,236,245,' + (0.25 + 0.5 * Math.abs(Math.sin(t * 1.3 + st))) + ')';
        g.fillRect(sx, sy, 1.6, 1.6);
      }
    } else if (L.id === 'bio') {
      for (var hlx = 0; hlx < 2; hlx++) {
        g.strokeStyle = hlx ? 'rgba(255,181,71,0.85)' : 'rgba(98,214,245,0.85)'; g.lineWidth = 1.6;
        g.beginPath();
        for (var z = 0; z <= 30; z++) { var hy = y - z * 1.4 * s, hx = x + Math.sin(z * 0.42 + t * 2 + hlx * Math.PI) * 7 * s; if (z) g.lineTo(hx, hy); else g.moveTo(hx, hy); }
        g.stroke();
      }
    } else if (L.id === 'work') {
      var gr = 9 * s; g.save(); g.translate(x, y - gr - 2); g.rotate(t * 0.8);
      g.fillStyle = '#9AA8BB';
      for (var tooth = 0; tooth < 8; tooth++) { g.rotate(Math.PI / 4); g.fillRect(-1.6 * s, -gr - 2.6 * s, 3.2 * s, 3.4 * s); }
      g.beginPath(); g.arc(0, 0, gr, 0, 6.283); g.fill();
      g.fillStyle = '#1D2734'; g.beginPath(); g.arc(0, 0, gr * 0.4, 0, 6.283); g.fill();
      g.restore();
    } else if (L.id === 'hall') {
      g.strokeStyle = '#9AA8BB'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 26 * s); g.stroke();
      g.fillStyle = '#FFB547'; g.beginPath(); g.moveTo(x, y - 26 * s);
      for (var fz = 0; fz <= 10; fz++) g.lineTo(x + fz * 1.4 * s, y - 26 * s + Math.sin(t * 5 + fz * 0.6) * 1.2 * s);
      for (fz = 10; fz >= 0; fz--) g.lineTo(x + fz * 1.4 * s, y - 18 * s + Math.sin(t * 5 + fz * 0.6) * 1.2 * s);
      g.closePath(); g.fill();
    } else if (L.id === 'home') {
      g.fillStyle = '#26313F'; g.beginPath(); g.moveTo(p.roof[3][0], p.roof[3][1]); g.lineTo(x, y - 18 * s); g.lineTo(p.roof[2][0], p.roof[2][1]); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,190,90,' + (0.55 + 0.25 * Math.sin(t * 1.2)) + ')';
      var wd = P(L.b.x0 + (L.b.x1 - L.b.x0) * 0.45, L.b.y1);
      g.fillRect(wd[0] + 8 * S * XSK, wd[1] - 8 * S * HK - 7 * S, 9 * S, 7 * S);
    } else if (L.id === 'post') {
      var bob = Math.sin(t * 2) * 2;
      g.strokeStyle = '#FFB547'; g.lineWidth = 1.4;
      var ew = 10 * s, eh = 7 * s, ey = y - 14 * s + bob;
      g.strokeRect(x - ew, ey - eh, ew * 2, eh * 2);
      g.beginPath(); g.moveTo(x - ew, ey - eh); g.lineTo(x, ey + 1); g.lineTo(x + ew, ey - eh); g.stroke();
    }
    g.restore();
  }

  function labelRect(L) {
    var rc = roofCenter(L);
    var big = W >= 700;
    var fs = big ? 11 : 10.5;
    ctx.font = '600 ' + fs + 'px "IBM Plex Mono", monospace';
    var tw = Math.max(ctx.measureText(L.name).width, big ? ctx.measureText(L.sub).width * 0.92 : 0);
    var w = tw + 16, h = big ? 34 : 24;
    var lift = L.id === 'lab' ? 44 : L.id === 'obs' ? 34 : 26;
    var x = Math.max(4, Math.min(W - w - 4, rc[0] - w / 2)), y = rc[1] - lift * Math.max(0.6, S * 2.2) - h;
    return { x: x, y: y, w: w, h: h, fs: fs, big: big };
  }

  function drawLabel(L) {
    var r = labelRect(L), on = hover === L || openId === L.id;
    ctx.fillStyle = on ? 'rgba(255,181,71,0.96)' : 'rgba(10,14,19,0.86)';
    ctx.strokeStyle = on ? '#FFB547' : 'rgba(98,214,245,0.45)'; ctx.lineWidth = 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = on ? '#0A0D11' : '#E9ECF1';
    ctx.font = '600 ' + r.fs + 'px "IBM Plex Mono", monospace';
    ctx.fillText(L.name, r.x + r.w / 2, r.y + (r.big ? 14 : 16));
    if (r.big) { ctx.font = '400 ' + (r.fs - 1) + 'px "IBM Plex Sans", sans-serif'; ctx.fillStyle = on ? '#2A2010' : '#A6AFBD'; ctx.fillText(L.sub, r.x + r.w / 2, r.y + 28); }
    // stem
    var rc = roofCenter(L);
    ctx.strokeStyle = on ? '#FFB547' : 'rgba(98,214,245,0.35)';
    ctx.beginPath(); ctx.moveTo(rc[0], r.y + r.h); ctx.lineTo(rc[0], rc[1] - 4); ctx.stroke();
  }

  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }

  function draw(alpha, time) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake * 0.5; sy = (Math.random() - 0.5) * shake * 0.5; shake *= 0.9; if (shake < 0.5) shake = 0; }
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(sx, sy);
    var zp = 0;
    if (zoom) {
      zp = smooth((performance.now() - zoom.t0) / 750);
      var z = 1 + 2.4 * zp;
      ctx.translate(zoom.x, zoom.y); ctx.scale(z, z); ctx.translate(-zoom.x, -zoom.y);
    }
    ctx.drawImage(groundLayer, 0, 0, W, H);
    // quake ripples
    sim.quakes.forEach(function (Q) {
      var age = sim.tick - Q.tick, c = P(Q.x, Q.y);
      if (age < 200) {
        for (var r = 0; r < 3; r++) {
          var rad = (age * 5 + r * 45) * S; if (rad <= 0) continue;
          ctx.strokeStyle = 'rgba(255,92,77,' + Math.max(0, 0.6 - age / 240 - r * 0.12) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(c[0], c[1], rad, rad * TILT, 0, 0, 6.283); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,92,77,' + (age < 600 ? 0.9 : 0.35) + ')';
      ctx.beginPath(); ctx.arc(c[0], c[1], 4, 0, 6.283); ctx.fill();
    });
    // agents
    var dot = Math.max(2.4, 2.8 * S * 1.6);
    sim.agents.forEach(function (A) {
      var x = A.px + (A.x - A.px) * alpha, y = A.py + (A.y - A.py) * alpha;
      var tr = A.trail;
      if (tr.length > 3) {
        ctx.strokeStyle = A.col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.3;
        ctx.beginPath(); var p0 = P(tr[0], tr[1]); ctx.moveTo(p0[0], p0[1]);
        for (var q = 2; q < tr.length; q += 2) { var pq = P(tr[q], tr[q + 1]); ctx.lineTo(pq[0], pq[1]); }
        var pe = P(x, y); ctx.lineTo(pe[0], pe[1]); ctx.stroke(); ctx.globalAlpha = 1;
      }
      var p = P(x, y);
      ctx.fillStyle = A.boost > 0 ? '#FF7A6E' : A.col;
      ctx.beginPath(); ctx.arc(p[0], p[1], dot, 0, 6.283); ctx.fill();
    });
    // conversation links
    sim.links.forEach(function (L) {
      var A = sim.agents[L.a], B = sim.agents[L.b], pa = P(A.x, A.y), pb = P(B.x, B.y);
      ctx.strokeStyle = 'rgba(255,181,71,0.75)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.quadraticCurveTo((pa[0] + pb[0]) / 2, Math.min(pa[1], pb[1]) - 14, pb[0], pb[1]); ctx.stroke();
    });
    ctx.drawImage(bldLayer, 0, 0, W, H);
    var hr = hourOf(sim.tick + alpha), day = daylight(hr), glow = duskGlow(hr);
    ctx.fillStyle = 'rgba(2,4,12,' + (0.34 * (1 - day)).toFixed(3) + ')'; ctx.fillRect(-W, -H, W * 3, H * 3);
    if (day > 0.01) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(70,96,135,' + (0.24 * day).toFixed(3) + ')'; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.globalCompositeOperation = 'source-over'; }
    if (glow > 0.01) { var sky = ctx.createLinearGradient(0, 0, 0, H * 0.65); sky.addColorStop(0, 'rgba(255,128,60,' + (0.26 * glow).toFixed(3) + ')'); sky.addColorStop(1, 'rgba(255,128,60,0)'); ctx.fillStyle = sky; ctx.fillRect(-W, -H, W * 3, H * 0.65 + H); }
    ctx.globalAlpha = 0.12 + 0.88 * (1 - day); ctx.drawImage(lightLayer, 0, 0, W, H); ctx.globalAlpha = 1;
    LANDMARKS.forEach(function (L) { drawDecor(ctx, L, time); });
    // visitor
    if (walk) {
      if (V.seg < V.path.length - 1) {
        ctx.strokeStyle = 'rgba(255,181,71,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); var vp = P(V.x, V.y); ctx.moveTo(vp[0], vp[1]);
        for (var q = V.seg + 1; q < V.path.length; q++) { var pn = P(nodes[V.path[q]].x, nodes[V.path[q]].y); ctx.lineTo(pn[0], pn[1]); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      var vx = V.px + (V.x - V.px) * alpha, vy = V.py + (V.y - V.py) * alpha, v = P(vx, vy);
      var pulse = reduce ? 0 : (time * 1.4) % 1;
      ctx.strokeStyle = 'rgba(255,181,71,' + (1 - pulse) * 0.8 + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(v[0], v[1], 6 + pulse * 14, 0, 6.283); ctx.stroke();
      ctx.fillStyle = '#FFB547'; ctx.beginPath(); ctx.arc(v[0], v[1], 5.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#0A0D11'; ctx.beginPath(); ctx.arc(v[0], v[1], 2, 0, 6.283); ctx.fill();
      ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFB547';
      ctx.fillText('YOU', v[0], v[1] - 12);
    }
    LANDMARKS.forEach(drawLabel);
    // speech bubbles
    bubbles.forEach(function (B) {
      var A = sim.agents[B.a], p = P(A.x, A.y);
      var maxW = Math.min(240, W * 0.6);
      ctx.font = '400 12px "IBM Plex Sans", sans-serif';
      var lines = wrapText(B.text, maxW - 18);
      var bw = Math.min(maxW, Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; })) + 18);
      var bh = lines.length * 16 + 12;
      var bx = Math.max(6, Math.min(W - bw - 6, p[0] - bw / 2)), by = Math.max(6, p[1] - bh - 14);
      ctx.fillStyle = 'rgba(233,236,241,0.97)'; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p[0] - 5, by + bh); ctx.lineTo(p[0], by + bh + 7); ctx.lineTo(p[0] + 5, by + bh); ctx.fill();
      ctx.fillStyle = '#0A0D11'; ctx.textAlign = 'left';
      lines.forEach(function (l, q) { ctx.fillText(l, bx + 9, by + 19 + q * 16); });
    });
    ctx.restore();
    if (zoom) {
      ctx.fillStyle = 'rgba(8,11,16,' + zp.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      if (zp >= 1 && !zoom.gone) { zoom.gone = true; location.href = zoom.href; }
    }
  }
  var zoom = null;
  window.addEventListener('pageshow', function (e) { if (zoom) { zoom = null; frame(performance.now(), true); } });

  function wrapText(text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }

  /* ---------- HUD, log, panel ---------- */
  var logEl = $('city-log');
  function log(line) {
    if (!logEl) return;
    var li = document.createElement('li'); li.textContent = line;
    logEl.insertBefore(li, logEl.firstChild);
    while (logEl.children.length > 4) logEl.removeChild(logEl.lastChild);
  }
  function hud() {
    var c = clockOf(sim.tick);
    setText('hud-clock', 'DAY ' + c.day + ' · ' + c.str);
    setText('hud-agents', String(sim.agents.length));
    setText('hud-talks', String(sim.talks));
    setText('hud-hash', sim.mark);
    setText('hud-branch', sim.branch === 'fork' ? 'fork' : 'base');
    var base = $('btn-base'); if (base) base.hidden = schedule.length === 0;
  }
  function setText(id, t) { var el = $(id); if (el && el.textContent !== t) el.textContent = t; }

  var panel = $('bpanel');
  function openPanel(id) {
    var L = LANDMARKS.filter(function (x) { return x.id === id; })[0]; if (!L || !panel) return;
    openId = id;
    $('bp-kicker').textContent = L.name + ' · ' + L.sub;
    $('bp-title').textContent = L.title;
    $('bp-text').textContent = L.text;
    $('bp-stat').textContent = L.stat;
    var enter = $('bp-enter'); enter.href = L.href; enter.textContent = id === 'post' ? 'Open contact' : 'Enter the ' + L.name.toLowerCase();
    panel.hidden = false; wrap.classList.add('panel-open');
    if (!reduce) { panel.classList.remove('pop'); void panel.offsetWidth; panel.classList.add('pop'); }
  }
  function closePanel() { if (panel) panel.hidden = true; wrap.classList.remove('panel-open'); openId = null; }
  var close = $('bp-close'); if (close) close.addEventListener('click', closePanel);
  var enterBtn = $('bp-enter');
  if (enterBtn) enterBtn.addEventListener('click', function (ev) {
    if (reduce || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
    var L = LANDMARKS.filter(function (x) { return x.id === openId; })[0]; if (!L) return;
    ev.preventDefault();
    var rc = roofCenter(L);
    zoom = { x: rc[0], y: rc[1], t0: performance.now(), href: enterBtn.href };
    if (panel) panel.hidden = true; wrap.classList.remove('panel-open');
    if (!running) play(true);
  });
  var walkThere = $('bp-walk');
  if (walkThere) walkThere.addEventListener('click', function () {
    var L = LANDMARKS.filter(function (x) { return x.id === openId; })[0]; if (!L) return;
    setWalk(true); closePanel(); goTo(L.door, L);
  });

  function goTo(nodeId, L) {
    var start = V.seg < V.path.length - 1 ? V.path[V.seg + 1] : V.node;
    if (V.seg < V.path.length - 1) { V.path = [V.path[V.seg], start].concat(astar(start, nodeId).slice(1)); }
    else { V.path = astar(start, nodeId); V.seg = 0; V.t = 0; }
    V.target = L || null;
  }

  var walkBtn = $('walk-toggle'), hint = $('walk-hint');
  function setWalk(on) {
    walk = on;
    wrap.classList.toggle('walking', on);
    if (walkBtn) { walkBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); walkBtn.textContent = on ? 'Stop walking' : 'Walk in as an agent'; }
    if (hint) hint.hidden = !on;
    if (on) { log('You spawned at node ' + V.node + '. Click anywhere to walk.'); if (!running) play(true); canvas.focus({ preventScroll: true }); if (W < 1000 && box.scrollIntoView) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
  }
  if (walkBtn) walkBtn.addEventListener('click', function () { setWalk(!walk); });

  function hitLandmark(mx, my) {
    for (var q = LANDMARKS.length - 1; q >= 0; q--) {
      var L = LANDMARKS[q], r = labelRect(L);
      if (mx >= r.x - 8 && mx <= r.x + r.w + 8 && my >= r.y - 8 && my <= r.y + r.h + 8) return L;
    }
    for (q = 0; q < LANDMARKS.length; q++) {
      L = LANDMARKS[q]; var p = boxPts(L.b.x0, L.b.y0, L.b.x1, L.b.y1, L.h);
      var xs = [p.a[0], p.b[0], p.c[0], p.d[0], p.roof[1][0], p.roof[2][0]], ys = [p.a[1], p.d[1], p.c[1], p.roof[0][1], p.roof[1][1]];
      if (mx >= Math.min.apply(null, xs) - 4 && mx <= Math.max.apply(null, xs) + 4 && my >= Math.min.apply(null, ys) - 4 && my <= Math.max.apply(null, ys) + 4) return L;
    }
    return null;
  }
  function local(ev) { var r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
  canvas.addEventListener('pointermove', function (ev) {
    var m = local(ev), L = hitLandmark(m[0], m[1]);
    if (L !== hover) { hover = L; canvas.style.cursor = L ? 'pointer' : (walk ? 'crosshair' : 'default'); if (!running) frame(performance.now(), true); }
  });
  canvas.addEventListener('pointerleave', function () { hover = null; });
  canvas.addEventListener('click', function (ev) {
    var m = local(ev), L = hitLandmark(m[0], m[1]);
    if (walk && hint) hint.hidden = true;
    if (L) { if (walk) { goTo(L.door, L); log('Walking to the ' + L.name.toLowerCase() + '.'); } else openPanel(L.id); return; }
    if (walk) {
      var w = U(m[0], m[1]), best = SPAWN, bd = 1e9;
      reach.forEach(function (id) { var n = nodes[id], d = hyp(n.x - w[0], n.y - w[1]); if (d < bd) { bd = d; best = id; } });
      goTo(best, null);
    } else closePanel();
  });
  var KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
  var kb = -1;
  canvas.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { closePanel(); return; }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      var at = walk ? LANDMARKS.filter(function (x) { return x.door === V.node; })[0] : null;
      var L = at || LANDMARKS[(kb = (kb + 1) % LANDMARKS.length)];
      hover = L; openPanel(L.id); if (!running) frame(performance.now(), true);
      return;
    }
    var dir = KEYS[ev.key]; if (!dir) return;
    ev.preventDefault();
    if (!walk) setWalk(true);
    held = dir; keyStep(dir);
  });
  canvas.addEventListener('keyup', function (ev) { if (KEYS[ev.key]) held = null; });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanel(); });

  // Buttons
  function bind(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  bind('btn-quake', function () {
    var at = sim.tick + 1;
    schedule.push({ tick: at, type: 'quake' });
    if (!running) play(true);
  });
  bind('btn-replay', function () {
    sim = newSim(); bubbles = [];
    log('Replay from 18:00 with seed ' + SEED + (schedule.length ? ' and ' + schedule.length + ' scheduled event' + (schedule.length > 1 ? 's' : '') : '') + '. Watch the state hash.');
    hud(); if (!running) play(true);
  });
  bind('btn-base', function () { schedule = []; sim = newSim(); log('Back to the base branch. Events cleared.'); hud(); });
  var playBtn = $('btn-play');
  bind('btn-play', function () { if (running) pause(true); else play(true); });

  /* ---------- Loop ---------- */
  var running = false, last = 0, acc = 0, visible = true, userPaused = false, raf = 0;
  function frame(now, once) {
    if (!once) {
      var dt = Math.min(0.25, (now - last) / 1000); last = now; acc += dt;
      var stepDt = 1 / TPS;
      while (acc >= stepDt) { step(sim); frameTick++; if (walk) visitorStep(sim); acc -= stepDt; if (sim.tick % 5 === 0) hud(); }
    }
    draw(once ? 1 : acc * TPS, now / 1000);
    if (!once && running) raf = requestAnimationFrame(frame);
  }
  function play(byUser) {
    if (byUser) userPaused = false;
    if (running || !visible) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
    if (playBtn) { playBtn.textContent = 'Pause'; playBtn.setAttribute('aria-pressed', 'false'); }
  }
  function pause(byUser) {
    if (byUser) userPaused = true;
    running = false; cancelAnimationFrame(raf);
    if (playBtn) { playBtn.textContent = 'Play'; playBtn.setAttribute('aria-pressed', 'true'); }
  }

  sim = newSim();
  // Warm up so the first frame already shows a living city.
  for (var warm = 0; warm < 90; warm++) step(sim);
  fit(); hud();
  log('Seed ' + SEED + '. 10 sim minutes per second. Click a building.');
  if ('ResizeObserver' in window) new ResizeObserver(function () { fit(); if (!running) frame(performance.now(), true); }).observe(box);
  else window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { renderLayers(); if (!running) frame(performance.now(), true); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (!visible) closePanel();
      if (!visible) pause(false); else if (!userPaused && !reduce) play(false);
    }, { threshold: 0.05 }).observe(wrap);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(false); else if (!userPaused && !reduce && visible) play(false); });

  if (reduce) { userPaused = true; frame(performance.now(), true); if (playBtn) { playBtn.textContent = 'Play'; } }
  else play(false);

  // Directory buttons below the map can open panels too.
  Array.prototype.forEach.call(document.querySelectorAll('[data-open]'), function (el) {
    el.addEventListener('click', function (ev) {
      if (ev.metaKey || ev.ctrlKey) return;
      ev.preventDefault(); openPanel(el.getAttribute('data-open'));
      wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
  if (location.hash === '#walk') setWalk(true);
})();
