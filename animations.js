/* ============================================================
   MindLift – animations.js
   Professional scroll reveals, staggered children,
   floating orbs, parallax, scroll progress, counter animation
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. SCROLL PROGRESS BAR
     ---------------------------------------------------------- */
  const progressBar = document.querySelector('.scroll-progress');

  function updateProgress() {
    if (!progressBar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
  }

  /* ----------------------------------------------------------
     2. SCROLL-REVEAL OBSERVER (with stagger support)
     ---------------------------------------------------------- */
  function initReveals() {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => observer.observe(el));
  }

  /* ----------------------------------------------------------
     3. FLOATING GRADIENT ORBS (JS-generated)
     ---------------------------------------------------------- */
  function spawnOrbs() {
    const container = document.querySelector('.hero-orbs');
    if (!container) return;

    const orbData = [
      { size: 320, color: 'rgba(126,184,218,.35)', top: '8%', left: '12%', delay: '0s' },
      { size: 240, color: 'rgba(184,169,212,.3)', top: '45%', left: '72%', delay: '2s' },
      { size: 280, color: 'rgba(157,213,176,.25)', top: '68%', left: '20%', delay: '5s' },
      { size: 200, color: 'rgba(232,180,200,.3)', top: '15%', left: '82%', delay: '8s' },
      { size: 220, color: 'rgba(240,201,166,.25)', top: '55%', left: '48%', delay: '11s' },
      { size: 160, color: 'rgba(126,184,218,.2)', top: '80%', left: '65%', delay: '14s' },
    ];

    orbData.forEach((o) => {
      const orb = document.createElement('div');
      orb.classList.add('floating-orb');
      orb.style.width = o.size + 'px';
      orb.style.height = o.size + 'px';
      orb.style.background = o.color;
      orb.style.top = o.top;
      orb.style.left = o.left;
      orb.style.animationDelay = o.delay;
      container.appendChild(orb);
    });
  }

  /* ----------------------------------------------------------
     4. PARALLAX MOUSE TRACKING (Hero only)
     ---------------------------------------------------------- */
  function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const orbs = hero.querySelectorAll('.floating-orb');
    let ticking = false;

    hero.addEventListener('mousemove', (e) => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        orbs.forEach((orb, i) => {
          const factor = (i + 1) * 15;
          orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
        });
        ticking = false;
      });
    });
  }

  /* ----------------------------------------------------------
     5. NAVBAR SCROLL STATE (with smooth shrink)
     ---------------------------------------------------------- */
  function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastScrollY = 0;

    function check() {
      const scrollY = window.scrollY;
      navbar.classList.toggle('scrolled', scrollY > 40);

      // Add a subtle hide/show on scroll direction for clean look
      if (scrollY > 300) {
        if (scrollY > lastScrollY && scrollY - lastScrollY > 5) {
          navbar.style.transform = 'translateY(-100%)';
        } else {
          navbar.style.transform = 'translateY(0)';
        }
      } else {
        navbar.style.transform = 'translateY(0)';
      }
      lastScrollY = scrollY;
    }

    navbar.style.transition = 'background .3s ease, box-shadow .3s ease, height .3s ease, transform .35s cubic-bezier(.22,1,.36,1)';
    check();
    window.addEventListener('scroll', check, { passive: true });
  }

  /* ----------------------------------------------------------
     6. ANIMATED COUNTERS (for stat numbers)
     ---------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-count'), 10);
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 2000;
            const start = performance.now();

            function step(now) {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              // Ease out cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              el.textContent = Math.floor(eased * target) + suffix;
              if (progress < 1) requestAnimationFrame(step);
            }

            requestAnimationFrame(step);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /* ----------------------------------------------------------
     7. SMOOTH SECTION TRANSITIONS
     ---------------------------------------------------------- */
  function initSectionTransitions() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
          }
        });
      },
      { threshold: 0.05 }
    );

    sections.forEach((section) => {
      if (!section.classList.contains('hero') && !section.classList.contains('page-hero')) {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)';
        observer.observe(section);
      }
    });
  }

  /* ----------------------------------------------------------
     8. PAGE-HERO ENTRANCE
     ---------------------------------------------------------- */
  function initPageHeroAnimation() {
    const pageHero = document.querySelector('.page-hero');
    if (!pageHero) return;

    const h1 = pageHero.querySelector('h1');
    const p = pageHero.querySelector('p');

    if (h1) {
      h1.style.opacity = '0';
      h1.style.transform = 'translateY(30px)';
      h1.style.transition = 'opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)';
      setTimeout(() => {
        h1.style.opacity = '1';
        h1.style.transform = 'translateY(0)';
      }, 200);
    }

    if (p) {
      p.style.opacity = '0';
      p.style.transform = 'translateY(20px)';
      p.style.transition = 'opacity .9s cubic-bezier(.22,1,.36,1) .15s, transform .9s cubic-bezier(.22,1,.36,1) .15s';
      setTimeout(() => {
        p.style.opacity = '1';
        p.style.transform = 'translateY(0)';
      }, 350);
    }
  }

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */
  function init() {
    initNavbarScroll();
    spawnOrbs();
    initParallax();
    initReveals();
    initCounters();
    initSectionTransitions();
    initPageHeroAnimation();
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
