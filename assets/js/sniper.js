/* Through the Sniper's Eye: scroll stages and the two-eyes toggle. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Bullet pocks for the war scene (seeded, so they land the same each visit) ---- */
  var seed = 1975;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.pocks').forEach(function (svg) {
    var defs = document.createElementNS(NS, 'defs');
    defs.innerHTML =
      '<radialGradient id="pock"><stop offset="0" stop-color="#050403"/>' +
      '<stop offset=".55" stop-color="#1a140f" stop-opacity=".9"/>' +
      '<stop offset=".8" stop-color="#d8c4a0" stop-opacity=".25"/>' +
      '<stop offset="1" stop-color="#d8c4a0" stop-opacity="0"/></radialGradient>';
    svg.appendChild(defs);
    for (var i = 0; i < 46; i++) {
      var c = document.createElementNS(NS, 'circle');
      // cluster the pocks around the arcade, like a burst of fire
      var x = 25 + rnd() * 55 + (rnd() - .5) * 18;
      var y = 8 + rnd() * 40;
      c.setAttribute('cx', x.toFixed(2));
      c.setAttribute('cy', y.toFixed(2));
      c.setAttribute('r', (.25 + rnd() * .55).toFixed(2));
      c.setAttribute('fill', 'url(#pock)');
      c.style.setProperty('--d', reduce ? '0s' : (1 + i * .09 + rnd() * .2).toFixed(2) + 's');
      svg.appendChild(c);
    }
  });

  /* ---- Scroll stages ---- */
  document.querySelectorAll('.story').forEach(function (story) {
    var layers = story.querySelectorAll('.layer');
    var steps = story.querySelectorAll('.step');
    var yearEl = story.querySelector('.stage-year span');
    var current = null;

    function show(step) {
      steps.forEach(function (s) { s.classList.toggle('is-active', s === step); });
      var scene = step.dataset.scene;
      if (scene !== current) {
        current = scene;
        layers.forEach(function (l) { l.classList.toggle('is-on', l.dataset.scene === scene); });
      }
      var y = step.dataset.year;
      if (y && yearEl && yearEl.textContent !== y) {
        yearEl.classList.add('is-changing');
        setTimeout(function () { yearEl.textContent = y; yearEl.classList.remove('is-changing'); }, reduce ? 0 : 350);
      }
    }
    show(steps[0]);

    if (!('IntersectionObserver' in window)) {
      steps.forEach(function (s) { s.classList.add('is-active'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  });

  /* ---- The two eyes ---- */
  var opening = document.getElementById('opening');
  var buttons = document.querySelectorAll('.eye-btn');
  var copies = document.querySelectorAll('.eye-copy');
  function setEye(eye) {
    opening.dataset.eye = eye;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.eye === eye)); });
    copies.forEach(function (c) { c.hidden = c.dataset.for !== eye; });
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { setEye(b.dataset.eye); });
  });
  // tapping the picture itself also changes the eye
  opening.querySelector('.frame').addEventListener('click', function () {
    setEye(opening.dataset.eye === 'architect' ? 'sniper' : 'architect');
  });
})();
