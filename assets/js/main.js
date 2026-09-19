/* Md. Asikur Rahman — portfolio behaviour
   Mobile nav, sticky-header shadow, scroll reveal, active section highlight. */

(function () {
  'use strict';

  var header = document.getElementById('header');
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');

  /* ---------- mobile menu ---------- */
  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }

  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // Close after tapping a link, and on Escape.
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- header shadow once scrolled ---------- */
  function onScroll() {
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- reveal elements as they enter the viewport ---------- */
  var revealables = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    // No observer support: just show everything.
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealables.forEach(function (el, i) {
      // Small stagger so grids animate in sequence rather than all at once.
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      revealObserver.observe(el);
    });
  }

  /* ---------- highlight the nav link for the section in view ---------- */
  var navLinks = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active',
            link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (section) { navObserver.observe(section); });
  }

  /* ---------- footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
