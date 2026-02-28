/**
 * MindLift - Main Application Logic
 * Implements: sticky nav, counters, forms, and accordions.
 */

document.addEventListener('DOMContentLoaded', () => {
    initStickyNav();
    initStatsCounter();
    initMobileNav();
});

/**
 * Sticky Navigation with Scroll Progress
 */
function initStickyNav() {
    const header = document.querySelector('.header');
    const navIndicator = document.querySelector('.nav-indicator');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }

        // Update scroll progress indicator
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if (navIndicator) navIndicator.style.width = scrolled + "%";
    });
}

/**
 * Animated Statistics Counter
 */
function initStatsCounter() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200;

    const startCounter = (counter) => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const inc = target / speed;

        if (count < target) {
            counter.innerText = Math.ceil(count + inc);
            setTimeout(() => startCounter(counter), 1);
        } else {
            counter.innerText = target;
        }
    };

    // Use Intersection Observer to trigger counters
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNav() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');

    if (burger) {
        burger.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            burger.classList.toggle('toggle');
        });
    }
}

/**
 * Form Validation
 */
function validateForm(formData) {
    const errors = {};
    if (!formData.name) errors.name = "Name is required";
    if (!formData.email || !formData.email.includes('@')) errors.email = "Valid email is required";
    if (!formData.message) errors.message = "Message cannot be empty";
    return errors;
}

/**
 * Global Success Message Handler
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}
