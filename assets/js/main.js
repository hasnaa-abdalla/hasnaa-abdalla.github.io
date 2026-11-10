(function () {
  var root = document.documentElement;
  var body = document.body;
  var bar = document.querySelector('.topbar');
  var progress = document.querySelector('.progress');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var menuBtn = document.querySelector('.menu-toggle');
  var themeBtn = document.querySelector('.theme-toggle');

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---- Top bar state + reading progress ---- */
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var max = root.scrollHeight - window.innerHeight;
    bar.classList.toggle('is-scrolled', y > 24);
    progress.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1) : 0);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---- Theme toggle ---- */
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (!root.dataset.theme) root.dataset.theme = currentTheme();
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    themeBtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---- Mobile menu ---- */
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () {
    setMenu(!body.classList.contains('menu-open'));
  });
  navLinks.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 681px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ---- Hero: the Alexandria skyline constructs itself as you scroll ---- */
  var hero = document.querySelector('.hero');
  var track = hero && hero.querySelector('.hero-track');
  if (track && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.classList.add('is-scrolly');
    var heroTicking = false;
    var build = function () {
      var r = track.getBoundingClientRect();
      var dist = r.height - window.innerHeight;          // how far the stage stays pinned
      var p = dist > 0 ? -r.top / dist : 1;
      hero.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
      heroTicking = false;
    };
    window.addEventListener('scroll', function () {
      if (!heroTicking) { heroTicking = true; requestAnimationFrame(build); }
    }, { passive: true });
    window.addEventListener('resize', build);
    build();
  }

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal, .section').forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  /* ---- Reveal on scroll (staggered within each group) ---- */
  document.querySelectorAll('.gallery, .timeline, .two-col, .contact').forEach(function (group) {
    group.querySelectorAll('.reveal').forEach(function (el, i) { el.style.setProperty('--i', i); });
  });
  var revealer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  document.querySelectorAll('.reveal, .section').forEach(function (el) { revealer.observe(el); });

  /* ---- Active section in nav ---- */
  var byId = {};
  navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
      var link = byId[entry.target.id];
      if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main .section').forEach(function (s) { spy.observe(s); });
})();
