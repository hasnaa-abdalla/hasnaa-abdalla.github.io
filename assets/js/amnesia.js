/* The Amnesia Trajectory: scroll-driven chart, grammar lens, coding bars, proximity matrix.
   No dependencies. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Data (from thesis §4.4.2 and Appendix E) ---------------- */

  var WAR_END = 1990;
  var BLAST = 2020.59; // 4 August 2020

  var BANDS = ["I · Actorless", "II · Structural", "III · Deliberate", "IV · Distinct from resilience"];

  // step index -> one or more points
  var POINTS = [
    { step: 0, name: "Sarraf", year: 2002, band: 0, f: 0.5, side: "right", reach: [{ from: WAR_END, label: "12 years", below: true }] },
    { step: 1, name: "El Hallak", year: 2012, band: 1, f: 0.5, side: "right", reach: [{ from: WAR_END, label: "22 years" }] },
    { step: 2, name: "ICOMOS", year: 2022.62, band: 2, f: 0.28, side: "left", reach: [{ from: BLAST, label: "2 years", below: true }] },
    { step: 2, name: "Fawaz", year: 2022.38, band: 2, f: 0.74, side: "left", reach: [{ from: BLAST, label: "" }] },
    { step: 3, name: "Vartivarian", year: 2025.95, band: 3, f: 0.45, side: "left",
      reach: [{ from: BLAST, label: "5 years", below: true }, { from: WAR_END, label: "35 years · a cousin in the Civil War", dotted: true, dy: 26 }] }
  ];

  var CONTEXT = [
    { year: 1989.8, label: "Taif Accord", on: [1], row: 0, anchor: "start" },
    { year: 1991.5, label: "Amnesty law", on: [0, 1], row: 1, anchor: "start" },
    { year: 1994, label: "Hallak enters the building", on: [1], row: 2, anchor: "start" },
    { year: 2003, label: "Expropriation", on: [0], row: 0, anchor: "middle" },
    { year: 2017, label: "Beit Beirut opens", on: [1, 3], row: 0, anchor: "middle" },
    { year: 2022.28, label: "Cabinet demolition order", on: [2], row: 0, anchor: "end" },
    { year: 2022.64, label: "North silos collapse", on: [2], row: 1, anchor: "end" },
    { year: 2025.9, label: "Exhibition at Beit Beirut", on: [3], row: 1, anchor: "end" }
  ];

  /* ---------------- Chart geometry ---------------- */

  var X0 = 1987, X1 = 2029, PX0 = 14, PX1 = 548;
  var TOP = 46, BOTTOM = 330, BAND_H = (BOTTOM - TOP) / 4;
  function x(yr) { return PX0 + (yr - X0) / (X1 - X0) * (PX1 - PX0); }
  POINTS.forEach(function (p) { p.y = BOTTOM - BAND_H * (p.band + p.f); });

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, s, attrs) { var t = el("text", attrs, parent); t.textContent = s; return t; }

  var svg = document.getElementById("chart");
  var bandEls = [], bandLabels = [], ptEls = [], reachEls = [], ctxEls = [], trail;

  function buildChart() {
    if (!svg) return;
    svg.setAttribute("aria-label", "Chart: five uses of the word amnesia, 2002 to 2025, rising in political charge as the distance to the violence shrinks.");

    // bands
    var gB = el("g", {}, svg);
    for (var i = 0; i < 4; i++) {
      var yTop = BOTTOM - BAND_H * (i + 1);
      bandEls.push(el("rect", { "class": "band", x: PX0, y: yTop, width: PX1 - PX0, height: BAND_H,
        fill: "var(--accent)", "fill-opacity": 0.03 + i * 0.035 }, gB));
      el("line", { x1: PX0, x2: PX1, y1: yTop, y2: yTop, stroke: "var(--rule)", "stroke-width": 0.6 }, gB);
      bandLabels.push(txt(gB, BANDS[i], { "class": "band-label", x: PX0 + 8, y: yTop + 19 }));
    }

    // axis
    var gA = el("g", { "class": "axis" }, svg);
    el("line", { x1: PX0, x2: PX1, y1: BOTTOM, y2: BOTTOM, "stroke-width": 1 }, gA);
    [1990, 2000, 2010, 2020].forEach(function (yr) {
      var g = el("g", { "class": "tick" }, gA);
      el("line", { x1: x(yr), x2: x(yr), y1: BOTTOM, y2: BOTTOM + 5 }, g);
      txt(g, String(yr), { x: x(yr), y: BOTTOM + 20, "text-anchor": "middle" });
    });

    // events
    [[WAR_END, "1990 · Civil War ends", "start", 4], [BLAST, "4 Aug 2020 · port explosion", "end", -4]].forEach(function (e) {
      var g = el("g", { "class": "event" }, svg);
      el("line", { x1: x(e[0]), x2: x(e[0]), y1: TOP - 6, y2: BOTTOM }, g);
      txt(g, e[1], { x: x(e[0]) + e[3], y: TOP - 12, "text-anchor": e[2] });
    });

    // context events on axis
    var gC = el("g", {}, svg);
    CONTEXT.forEach(function (c) {
      var g = el("g", { "class": "ctx" }, gC);
      el("circle", { cx: x(c.year), cy: BOTTOM, r: 2.6 }, g);
      txt(g, c.label, { x: x(c.year), y: BOTTOM + 38 + c.row * 15, "text-anchor": c.anchor });
      ctxEls.push({ g: g, on: c.on });
    });

    // trail
    trail = el("path", { "class": "trail", d: "" }, svg);

    // reach lines
    var gR = el("g", {}, svg);
    POINTS.forEach(function (p, pi) {
      p.reach.forEach(function (r) {
        var yy = p.y + (r.dy || 0);
        var g = el("g", { "class": "reach" + (r.dotted ? " dotted" : ""), opacity: 0 }, gR);
        var line = el("line", { x1: x(p.year), x2: x(p.year), y1: yy, y2: yy }, g);
        el("line", { "class": "cap", x1: x(r.from), x2: x(r.from), y1: yy - 5, y2: yy + 5, stroke: "var(--link)" }, g);
        if (r.label) {
          var mid = r.dotted ? x(r.from) + 6 : (x(r.from) + x(p.year)) / 2;
          txt(g, r.label, { x: mid, y: yy + (r.below ? 18 : -7), "text-anchor": r.dotted ? "start" : "middle" });
        }
        reachEls.push({ g: g, line: line, step: p.step, from: x(r.from), to: x(p.year) });
      });
    });

    // points
    var gP = el("g", {}, svg);
    POINTS.forEach(function (p) {
      var g = el("g", { "class": "pt", tabindex: 0, role: "button", "aria-label": p.name + ", " + Math.floor(p.year) }, gP);
      el("circle", { "class": "halo", cx: x(p.year), cy: p.y, r: 7 }, g);
      el("circle", { "class": "dot", cx: x(p.year), cy: p.y, r: 6 }, g);
      var left = p.side === "left";
      txt(g, p.name, { x: x(p.year) + (left ? -10 : 13), y: p.y + (left ? -11 : 5), "text-anchor": left ? "end" : "start" });
      function go() {
        var target = document.querySelector('.step[data-step="' + p.step + '"]');
        if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
      g.addEventListener("click", go);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      ptEls.push({ g: g, step: p.step, dot: g.querySelector(".dot") });
    });
  }

  function trailTo(step) {
    var pts = POINTS.filter(function (p) { return p.step <= step; });
    if (pts.length < 2) return "";
    return pts.map(function (p, i) { return (i ? "L" : "M") + x(p.year).toFixed(1) + " " + p.y; }).join(" ");
  }

  var ERAS = {
    stone: "Beit Beirut · Civil War, 1975–1990",
    concrete: "Port Grain Silos · explosion, 4 August 2020",
    both: "Both sites · 2002–2025"
  };
  var band = document.getElementById("band");
  var eraText = document.getElementById("era-text");
  function setEra(step) {
    var era = step >= 4 ? "both" : step >= 2 ? "concrete" : "stone";
    if (band && band.getAttribute("data-era") !== era) {
      band.setAttribute("data-era", era);
      if (eraText) eraText.textContent = ERAS[era];
    }
  }

  var current = -2;
  function setStep(step) {
    if (step === current || !svg) return;
    current = step;
    setEra(step);
    var end = step >= 4;

    bandEls.forEach(function (b, i) {
      var active = POINTS.some(function (p) { return p.step === step && Math.floor((BOTTOM - p.y) / BAND_H) === i; });
      b.setAttribute("fill-opacity", (0.03 + i * 0.035 + (active ? 0.08 : 0)).toFixed(3));
      bandLabels[i].classList.toggle("is-on", active || (end && i === 3));
    });

    ptEls.forEach(function (p) {
      p.g.classList.toggle("is-now", p.step === step);
      p.g.classList.toggle("is-seen", p.step < step || end);
      p.dot.setAttribute("r", p.step === step ? 8 : 6);
    });

    reachEls.forEach(function (r) {
      var visible = r.step <= step;
      r.g.setAttribute("opacity", !visible ? 0 : (r.step === step ? 1 : (end ? 0.75 : 0.28)));
      // draw the reach line from speaker back toward the violence
      if (visible && r.step === step && !reduceMotion) {
        r.line.setAttribute("x2", r.to);
        animateAttr(r.line, "x2", r.to, r.from, 700);
      } else {
        r.line.setAttribute("x2", visible ? r.from : r.to);
      }
    });

    ctxEls.forEach(function (c) { c.g.classList.toggle("is-on", c.on.indexOf(step) > -1); });
    trail.setAttribute("d", trailTo(end ? 4 : step));
  }

  function animateAttr(node, attr, from, to, dur) {
    var t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      node.setAttribute(attr, from + (to - from) * e);
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- Step observer ---------------- */

  function observeSteps() {
    var steps = [].slice.call(document.querySelectorAll(".step"));
    if (!("IntersectionObserver" in window)) {
      steps.forEach(function (s) { s.classList.add("is-active"); });
      setStep(4);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          steps.forEach(function (s) { s.classList.toggle("is-active", s === en.target); });
          setStep(+en.target.getAttribute("data-step"));
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
    setStep(-1);
  }

  /* ---------------- Grammar lens ---------------- */

  function lenses() {
    [].forEach.call(document.querySelectorAll(".lens"), function (btn) {
      btn.addEventListener("click", function () {
        var step = btn.closest(".step");
        var on = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", String(on));
        btn.textContent = on ? "Hide the grammar" : "Read the grammar";
        step.classList.toggle("lensed", on);
        var note = btn.nextElementSibling;
        if (note && note.classList.contains("lens-note")) note.hidden = !on;
      });
    });
  }

  /* ---------------- Coding bars ---------------- */

  function codes() {
    var MAX = 10;
    [].forEach.call(document.querySelectorAll(".codes[data-codes]"), function (box) {
      var data;
      try { data = JSON.parse(box.getAttribute("data-codes")); } catch (e) { return; }
      data.forEach(function (d) {
        var row = document.createElement("div");
        var fam = d[0].split(" ")[0].toLowerCase();
        row.className = "code-row" + (fam === "revolution" ? " is-rev" : fam === "healing" ? " is-heal" : "");
        row.innerHTML = '<span></span><span class="code-bar"><i></i></span><span class="code-n"></span>';
        row.children[0].textContent = d[0];
        row.querySelector("i").style.width = (d[1] / MAX * 100) + "%";
        row.children[2].textContent = d[1];
        row.setAttribute("aria-label", d[0] + ": " + d[1] + " coded quotations");
        box.appendChild(row);
      });
    });
  }

  /* ---------------- Proximity matrix ---------------- */

  var DEFS = {
    quant: "Quantitative proximity is the measurable distance between the violence and what is said about it: the years that have passed and the generation doing the speaking. The two move together. As time passes, direct witnesses give way to the postmemory generation.",
    qual: "Qualitative proximity covers the political, institutional and material conditions that make a conflict feel close or distant whatever the calendar says. Is the window for justice open or closed, and where does the speaker stand in relation to the state?",
    disc: "Discursive production of time: speakers do not only respond to time passing, they produce it. Passive, historicising language pushes the past away, while present-tense language that names actors keeps it close."
  };

  var COLS = [
    { year: "2002", who: "Sarraf", word: "“swept up by amnesia”", reg: 1,
      quant: { years: [12], ref: "Civil War", gen: "Official voice" },
      qual: { open: false, window: "Closed: war formally ended, no accountability", pos: "The state" },
      disc: { gram: "Passive voice", does: "Amnesia is the only actor", frame: "Mixed" } },
    { year: "2012", who: "El Hallak", word: "“the general amnesia of Lebanon”", reg: 2,
      quant: { years: [22], ref: "Civil War", gen: "Postmemory" },
      qual: { open: false, window: "Closed since the 1991 amnesty law", pos: "Activist, working against institutions" },
      disc: { gram: "Possessive: “of Lebanon”", does: "Names causes, but as a national condition", frame: "Mixed, present tense" } },
    { year: "2022", who: "ICOMOS", word: "“enhance psychological amnesia”", reg: 3,
      quant: { years: [2], ref: "Port explosion", gen: "International body" },
      qual: { open: true, window: "Open, investigation blocked", pos: "International heritage institution" },
      disc: { gram: "Causal: demolition → amnesia", does: "Frames it as a harm to the public mind", frame: "Proximity" } },
    { year: "2022", who: "Fawaz", word: "“deliberate or forced amnesia”", reg: 3,
      quant: { years: [2], ref: "Port explosion, read through SOLIDERE", gen: "Institutional proxy" },
      qual: { open: true, window: "Open but blocked, amnesty as precedent", pos: "Academic advocacy (Beirut Urban Lab)" },
      disc: { gram: "Adjectival: “deliberate”, “forced”", does: "Forgetting as political strategy", frame: "Proximity" } },
    { year: "2025", who: "Vartivarian", word: "“resilience, and then … amnesia”", reg: 4,
      quant: { years: [5, 35], ref: "The explosion and the Civil War", gen: "Victim family" },
      qual: { open: true, window: "Accountability still absent", pos: "Mother of a victim" },
      disc: { gram: "Contrastive: resilience ≠ amnesia", does: "Takes apart a national virtue", frame: "Proximity" } }
  ];

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function renderMatrix(dim) {
    var box = document.getElementById("matrix");
    var def = document.getElementById("dim-def");
    if (!box) return;
    def.textContent = DEFS[dim];
    box.innerHTML = COLS.map(function (c) {
      var cells = "";
      if (dim === "quant") {
        var bars = c.quant.years.map(function (y, i) {
          return '<div class="yrs"><span class="yrs-track"><span class="yrs-bar' + (i ? " alt" : "") + '" style="width:' + (y / 35 * 100).toFixed(1) + '%"></span></span><span>' + y + " years</span></div>";
        }).join("");
        cells = cell("Years from the violence", bars) + cell("Violence referred to", esc(c.quant.ref)) + cell("Who speaks", esc(c.quant.gen));
      } else if (dim === "qual") {
        cells = cell("Window for justice", '<span class="pill ' + (c.qual.open ? "open" : "closed") + '">' + (c.qual.open ? "Open" : "Closed") + "</span><br>" + esc(c.qual.window)) +
                cell("Speaker’s position", esc(c.qual.pos)) + cell("Register", esc(["", "Actorless", "Structural", "Deliberate", "Distinct from resilience"][c.reg]));
      } else {
        cells = cell("Grammar", esc(c.disc.gram)) + cell("What it does", esc(c.disc.does)) + cell("Framing code", esc(c.disc.frame));
      }
      return '<div class="m-row"><div class="m-head"><span class="m-year">' + c.year + '</span><span class="m-who">' + esc(c.who) +
        '</span><span class="m-word" style="background:var(--charge-' + c.reg + ')">' + esc(c.word) + "</span></div>" + cells + "</div>";
    }).join("");
  }
  function cell(label, html) { return '<div class="m-cell"><b>' + label + "</b>" + html + "</div>"; }

  function tabs() {
    var btns = [].slice.call(document.querySelectorAll(".dim-tabs button"));
    function select(b) {
      btns.forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      renderMatrix(b.getAttribute("data-dim"));
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b); });
      b.addEventListener("keydown", function (e) {
        var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (j === null) return;
        var n = btns[(j + btns.length) % btns.length]; n.focus(); select(n);
      });
    });
    if (btns[0]) select(btns[0]);
  }

  /* ---------------- Init ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    buildChart();
    observeSteps();
    lenses();
    codes();
    tabs();
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
