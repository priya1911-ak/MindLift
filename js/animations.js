/**
 * MindLift - Animations & Interactions
 * Implements: scroll-based reveals, floating orbs, and parallax.
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initFloatingOrbs();
    initParallax();
});

/**
 * Scroll Reveal Animation
 * Adds 'active' class to elements with 'reveal' class when they enter viewport.
 */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 150;

        reveals.forEach(reveal => {
            const revealTop = reveal.getBoundingClientRect().top;
            if (revealTop < windowHeight - revealPoint) {
                reveal.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check
}

/**
 * Floating Gradient Orbs
 * Creates and animates decorative background orbs for the anti-gravity feel.
 */
function initFloatingOrbs() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    for (let i = 0; i < 3; i++) {
        const orb = document.createElement('div');
        orb.className = 'floating-orb';
        orb.style.left = `${Math.random() * 80 + 10}%`;
        orb.style.top = `${Math.random() * 80 + 10}%`;
        orb.style.animationDelay = `${Math.random() * 5}s`;
        orb.style.background = i === 0 ? 'var(--primary-light)' : 
                               i === 1 ? 'var(--secondary-light)' : 'var(--accent-light)';
        hero.appendChild(orb);
    }
}

/**
 * Parallax Background Effect
 * Subtle movement of background elements on mouse move.
 */
function initParallax() {
    document.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        
        const parallaxElements = document.querySelectorAll('.parallax-bg');
        parallaxElements.forEach(el => {
            el.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
}
