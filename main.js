/* ============================================================
   MindLift – main.js
   Core logic: mobile menu, dark mode, form validation,
   counters, testimonial slider, accordion, modals,
   breathing exercise, grounding stepper, checklist
   ============================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------
       UTILITY: Toast Notifications
       ---------------------------------------------------------- */
    function showToast(message, type) {
        type = type || 'success';
        var container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.classList.add('toast-container');
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.classList.add('toast', type);
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('show');
        });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 350);
        }, 3500);
    }

    /* ----------------------------------------------------------
       1. MOBILE MENU TOGGLE
       ---------------------------------------------------------- */
    function initMobileMenu() {
        var burger = document.querySelector('.nav-burger');
        var links = document.querySelector('.nav-links');
        if (!burger || !links) return;

        burger.addEventListener('click', function () {
            burger.classList.toggle('open');
            links.classList.toggle('open');
            document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu when a nav link is clicked
        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                burger.classList.remove('open');
                links.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    /* ----------------------------------------------------------
       2. DARK MODE TOGGLE
       ---------------------------------------------------------- */
    function initDarkMode() {
        var btn = document.querySelector('.theme-toggle');
        if (!btn) return;

        // Load saved preference
        var saved = localStorage.getItem('mindlift-theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            btn.textContent = '☀️';
        }

        btn.addEventListener('click', function () {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                btn.textContent = '🌙';
                localStorage.setItem('mindlift-theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                btn.textContent = '☀️';
                localStorage.setItem('mindlift-theme', 'dark');
            }
        });
    }

    /* ----------------------------------------------------------
       3. ANIMATED STATISTICS COUNTER
       ---------------------------------------------------------- */
    function initCounters() {
        var counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        var observed = new Set();

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !observed.has(entry.target)) {
                    observed.add(entry.target);
                    animateCounter(entry.target);
                }
            });
        }, { threshold: 0.3 });

        counters.forEach(function (el) { observer.observe(el); });

        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            var suffix = el.getAttribute('data-suffix') || '';
            var duration = 2000;
            var start = 0;
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                var current = Math.floor(eased * target);
                el.textContent = current.toLocaleString() + suffix;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target.toLocaleString() + suffix;
                }
            }

            requestAnimationFrame(step);
        }
    }

    /* ----------------------------------------------------------
       4. TESTIMONIAL SLIDER
       ---------------------------------------------------------- */
    function initTestimonialSlider() {
        var track = document.querySelector('.testimonial-track');
        var dots = document.querySelectorAll('.testimonial-dot');
        if (!track || !dots.length) return;

        var items = track.querySelectorAll('.testimonial-item');
        var current = 0;
        var total = items.length;
        var autoInterval;

        function goTo(index) {
            current = (index + total) % total;
            track.style.transform = 'translateX(-' + (current * 100) + '%)';
            dots.forEach(function (d, i) {
                d.classList.toggle('active', i === current);
            });
        }

        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () {
                goTo(i);
                resetAuto();
            });
        });

        function resetAuto() {
            clearInterval(autoInterval);
            autoInterval = setInterval(function () { goTo(current + 1); }, 5000);
        }

        goTo(0);
        resetAuto();
    }

    /* ----------------------------------------------------------
       5. CONTACT FORM VALIDATION
       ---------------------------------------------------------- */
    function initContactForm() {
        var form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var valid = true;

            var groups = form.querySelectorAll('.form-group[data-validate]');
            groups.forEach(function (group) {
                var input = group.querySelector('input, textarea');
                var rule = group.getAttribute('data-validate');
                var value = input.value.trim();
                var ok = true;

                if (rule === 'required' && value === '') ok = false;
                if (rule === 'email') {
                    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRe.test(value)) ok = false;
                }

                group.classList.toggle('has-error', !ok);
                if (!ok) valid = false;
            });

            if (valid) {
                showToast('Thank you for reaching out! We will get back to you soon.', 'success');
                form.reset();
            } else {
                showToast('Please fix the highlighted fields.', 'error');
            }
        });

        // Live-clear errors on input
        form.querySelectorAll('input, textarea').forEach(function (input) {
            input.addEventListener('input', function () {
                input.closest('.form-group').classList.remove('has-error');
            });
        });
    }

    /* ----------------------------------------------------------
       6. FAQ ACCORDION
       ---------------------------------------------------------- */
    function initAccordion() {
        var items = document.querySelectorAll('.accordion-item');
        if (!items.length) return;

        items.forEach(function (item) {
            var header = item.querySelector('.accordion-header');
            header.addEventListener('click', function () {
                var isActive = item.classList.contains('active');
                // Close all
                items.forEach(function (it) { it.classList.remove('active'); });
                if (!isActive) item.classList.add('active');
            });
        });
    }

    /* ----------------------------------------------------------
       7. ISSUE DETAIL MODALS
       ---------------------------------------------------------- */
    function initModals() {
        var triggers = document.querySelectorAll('[data-modal]');
        var overlay = document.getElementById('modal-overlay');
        if (!triggers.length || !overlay) return;

        var modals = overlay.querySelectorAll('.modal');
        var closeBtn = overlay.querySelectorAll('.modal-close');

        function openModal(id) {
            modals.forEach(function (m) { m.style.display = 'none'; });
            var target = document.getElementById(id);
            if (target) target.style.display = 'block';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeAllModals() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        triggers.forEach(function (t) {
            t.addEventListener('click', function () {
                openModal(t.getAttribute('data-modal'));
            });
        });

        closeBtn.forEach(function (btn) {
            btn.addEventListener('click', closeAllModals);
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeAllModals();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllModals();
        });
    }

    /* ----------------------------------------------------------
       8. BREATHING EXERCISE
       ---------------------------------------------------------- */
    function initBreathing() {
        var circle = document.querySelector('.breathing-circle');
        var startBtn = document.getElementById('breathing-start');
        var label = document.getElementById('breathing-label');
        if (!circle || !startBtn) return;

        var running = false;
        var timer;

        function cycle() {
            // Inhale 4s
            circle.classList.remove('exhale');
            circle.classList.add('inhale');
            if (label) label.textContent = 'Breathe In…';

            timer = setTimeout(function () {
                // Hold 4s
                if (label) label.textContent = 'Hold…';

                timer = setTimeout(function () {
                    // Exhale 4s
                    circle.classList.remove('inhale');
                    circle.classList.add('exhale');
                    if (label) label.textContent = 'Breathe Out…';

                    timer = setTimeout(function () {
                        if (running) cycle();
                    }, 4000);
                }, 4000);
            }, 4000);
        }

        startBtn.addEventListener('click', function () {
            if (running) {
                running = false;
                clearTimeout(timer);
                circle.classList.remove('inhale', 'exhale');
                if (label) label.textContent = 'Press Start';
                startBtn.textContent = 'Start Exercise';
            } else {
                running = true;
                startBtn.textContent = 'Stop';
                cycle();
            }
        });
    }

    /* ----------------------------------------------------------
       9. GROUNDING TECHNIQUE STEPPER
       ---------------------------------------------------------- */
    function initGrounding() {
        var steps = document.querySelectorAll('.grounding-step');
        var nextBtn = document.getElementById('grounding-next');
        var prevBtn = document.getElementById('grounding-prev');
        if (!steps.length) return;

        var current = 0;

        function show(index) {
            steps.forEach(function (s, i) {
                s.classList.toggle('active', i === index);
            });
            current = index;
            if (prevBtn) prevBtn.disabled = current === 0;
            if (nextBtn) nextBtn.textContent = current === steps.length - 1 ? 'Restart' : 'Next Step';
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                show(current === steps.length - 1 ? 0 : current + 1);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (current > 0) show(current - 1);
            });
        }

        show(0);
    }

    /* ----------------------------------------------------------
       10. SELF-CARE CHECKLIST
       ---------------------------------------------------------- */
    function initChecklist() {
        var items = document.querySelectorAll('.checklist-item');
        if (!items.length) return;

        // Load state
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem('mindlift-checklist') || '{}'); } catch (e) { /* ignore */ }

        items.forEach(function (item, i) {
            if (saved[i]) {
                item.classList.add('checked');
                item.querySelector('.check-box').textContent = '✓';
            }

            item.addEventListener('click', function () {
                var isChecked = item.classList.toggle('checked');
                item.querySelector('.check-box').textContent = isChecked ? '✓' : '';
                saved[i] = isChecked;
                localStorage.setItem('mindlift-checklist', JSON.stringify(saved));
            });
        });
    }

    /* ----------------------------------------------------------
       11. ANIMATED INFOGRAPHIC BARS
       ---------------------------------------------------------- */
    function initInfoBars() {
        var bars = document.querySelectorAll('.info-bar-fill');
        if (!bars.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.style.width = entry.target.getAttribute('data-width');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        bars.forEach(function (bar) { observer.observe(bar); });
    }

    /* ----------------------------------------------------------
       12. ACTIVE NAV LINK HIGHLIGHT
       ---------------------------------------------------------- */
    function initActiveNav() {
        var path = window.location.pathname.split('/').pop() || 'index.html';
        var links = document.querySelectorAll('.nav-links a');
        links.forEach(function (a) {
            var href = a.getAttribute('href');
            if (href === path || (path === '' && href === 'index.html')) {
                a.classList.add('active');
            }
        });
    }

    /* ----------------------------------------------------------
       13. CHATBOX WIDGET
       ---------------------------------------------------------- */
    function initChatbox() {
        var toggle = document.getElementById('chatbox-toggle');
        var chatbox = document.getElementById('chatbox');
        if (!toggle || !chatbox) return;

        var messagesEl = chatbox.querySelector('.chatbox-messages');
        var inputEl = chatbox.querySelector('.chatbox-input input');
        var sendBtn = chatbox.querySelector('.chatbox-input button');
        var suggestionsEl = chatbox.querySelector('.chat-suggestions');

        // Bot response knowledge base (keyword-based)
        var responses = [
            {
                keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
                reply: 'Hello! Welcome to MindLift. 💙 I\'m here to listen and help guide you to the right resources. How are you feeling today?'
            },
            {
                keywords: ['sad', 'depressed', 'unhappy', 'down', 'hopeless', 'crying'],
                reply: 'I\'m sorry you\'re feeling this way. Your feelings are valid, and it\'s okay to not be okay. If these feelings persist, talking to a professional can really help. Would you like to explore our support resources?'
            },
            {
                keywords: ['anxious', 'anxiety', 'worried', 'panic', 'nervous', 'scared', 'fear'],
                reply: 'Anxiety can feel overwhelming, but you\'re not alone. Try our breathing exercise on the Resources page — it can help calm your nervous system. If anxiety is constant, consider speaking with a counselor. 💚'
            },
            {
                keywords: ['stress', 'stressed', 'burnout', 'exhausted', 'overwhelmed', 'tired'],
                reply: 'Burnout and stress are very real. It\'s important to set boundaries and take breaks. Small acts of self-care — even just 5 minutes — can make a difference. Check out our Self-Care Checklist on the Resources page! 🌿'
            },
            {
                keywords: ['help', 'support', 'crisis', 'emergency', 'suicide', 'hurt', 'die'],
                reply: '💛 If you\'re in crisis, please reach out immediately: Call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741. You are not alone, and help is available 24/7. Visit our Support page for more resources.'
            },
            {
                keywords: ['therapy', 'therapist', 'counselor', 'professional', 'doctor'],
                reply: 'Seeking professional help is a sign of strength. Our Support page has guidance on finding therapists, counselors, and affordable options. Would you like me to guide you there?'
            },
            {
                keywords: ['sleep', 'insomnia', 'can\'t sleep', 'nightmares'],
                reply: 'Sleep difficulties often accompany stress and anxiety. Try establishing a calming bedtime routine, limiting screens before bed, and practicing our breathing exercise. If sleep problems persist, a healthcare provider can help. 🌙'
            },
            {
                keywords: ['lonely', 'alone', 'isolated', 'no friends'],
                reply: 'Feeling lonely can be really hard. Remember, you are not truly alone — there are people who care. Support groups, hotlines, and even this chat are here for you. Our Support page has resources for connecting with others. 💜'
            },
            {
                keywords: ['self-care', 'self care', 'wellness', 'relax', 'calm'],
                reply: 'Self-care is so important! We have a daily checklist, a breathing exercise, and a grounding technique on our Resources page. Even small steps count. What would you like to try first? 🌸'
            },
            {
                keywords: ['thank', 'thanks', 'helpful', 'appreciate'],
                reply: 'You\'re welcome! I\'m glad I could help. Remember, it\'s okay to come back anytime you need support. You\'re doing great by taking care of your mental health. 💙'
            },
            {
                keywords: ['mood', 'test', 'quiz', 'assessment', 'check'],
                reply: 'Great idea! Taking a mood check-in can help you understand how you\'re feeling. Visit our Resources page to take the Mood Check-In Quiz — it only takes a minute. 📊'
            },
            {
                keywords: ['bye', 'goodbye', 'see you', 'take care'],
                reply: 'Take care of yourself! Remember, MindLift is always here when you need us. You matter. 💙🌿'
            },
        ];

        var defaultReply = 'Thank you for sharing. I\'m here to listen. If you\'d like to explore specific topics, try asking about anxiety, stress, self-care, or getting professional help. You can also visit our Resources or Support pages for more tools. 💙';

        var suggestions = ['I feel anxious', 'I\'m stressed', 'How to get help?', 'Self-care tips', 'Mood check-in'];

        // Render suggestions
        function renderSuggestions() {
            if (!suggestionsEl) return;
            suggestionsEl.innerHTML = '';
            suggestions.forEach(function (text) {
                var btn = document.createElement('button');
                btn.classList.add('chat-suggestion');
                btn.textContent = text;
                btn.addEventListener('click', function () {
                    sendMessage(text);
                });
                suggestionsEl.appendChild(btn);
            });
        }

        function getTimeStr() {
            var now = new Date();
            var h = now.getHours();
            var m = now.getMinutes();
            var ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
        }

        function addMessage(text, sender) {
            var msg = document.createElement('div');
            msg.classList.add('chat-msg', sender);
            msg.innerHTML = text + '<span class="msg-time">' + getTimeStr() + '</span>';
            messagesEl.appendChild(msg);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function showTyping() {
            var typing = document.createElement('div');
            typing.classList.add('typing-indicator');
            typing.id = 'chat-typing';
            typing.innerHTML = '<span></span><span></span><span></span>';
            messagesEl.appendChild(typing);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function hideTyping() {
            var typing = document.getElementById('chat-typing');
            if (typing) typing.remove();
        }

        function getBotReply(userText) {
            var lower = userText.toLowerCase();
            for (var i = 0; i < responses.length; i++) {
                for (var j = 0; j < responses[i].keywords.length; j++) {
                    if (lower.indexOf(responses[i].keywords[j]) !== -1) {
                        return responses[i].reply;
                    }
                }
            }
            return defaultReply;
        }

        function sendMessage(text) {
            if (!text.trim()) return;
            addMessage(text, 'user');
            inputEl.value = '';
            if (suggestionsEl) suggestionsEl.style.display = 'none';

            showTyping();
            setTimeout(function () {
                hideTyping();
                addMessage(getBotReply(text), 'bot');
            }, 800 + Math.random() * 700);
        }

        // Toggle chatbox
        toggle.addEventListener('click', function () {
            var isOpen = chatbox.classList.toggle('open');
            toggle.classList.toggle('active', isOpen);
            toggle.textContent = isOpen ? '✕' : '💬';
            if (isOpen && messagesEl.children.length === 0) {
                // Welcome message
                setTimeout(function () {
                    addMessage('Hi there! 👋 Welcome to MindLift. I\'m your supportive companion. How are you feeling today? You can type anything or tap a suggestion below.', 'bot');
                    renderSuggestions();
                }, 400);
            }
        });

        // Send on button click
        sendBtn.addEventListener('click', function () {
            sendMessage(inputEl.value);
        });

        // Send on Enter key
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage(inputEl.value);
            }
        });
    }

    /* ----------------------------------------------------------
       14. MOOD TEST QUIZ
       ---------------------------------------------------------- */
    function initMoodTest() {
        var container = document.getElementById('mood-test');
        if (!container) return;

        var questions = container.querySelectorAll('.mood-question');
        var progressSteps = container.querySelectorAll('.mood-progress-step');
        var resultEl = container.querySelector('.mood-result');
        var nextBtn = document.getElementById('mood-next');
        var prevBtn = document.getElementById('mood-prev');

        if (!questions.length) return;

        var current = 0;
        var answers = [];
        var totalQ = questions.length;

        function showQuestion(index) {
            questions.forEach(function (q, i) {
                q.classList.toggle('active', i === index);
            });
            progressSteps.forEach(function (s, i) {
                s.classList.remove('done', 'current');
                if (i < index) s.classList.add('done');
                if (i === index) s.classList.add('current');
            });
            current = index;
            if (prevBtn) prevBtn.style.display = current === 0 ? 'none' : '';
            if (nextBtn) nextBtn.textContent = current === totalQ - 1 ? 'See Results' : 'Next';
            if (nextBtn) nextBtn.disabled = !answers[current] && answers[current] !== 0;
        }

        // Handle option selection
        container.addEventListener('click', function (e) {
            var option = e.target.closest('.mood-option');
            if (!option) return;
            var qBlock = option.closest('.mood-question');
            var qIndex = Array.prototype.indexOf.call(questions, qBlock);
            var value = parseInt(option.getAttribute('data-value'), 10);

            // Deselect siblings
            qBlock.querySelectorAll('.mood-option').forEach(function (o) {
                o.classList.remove('selected');
            });
            option.classList.add('selected');
            answers[qIndex] = value;
            if (nextBtn) nextBtn.disabled = false;
        });

        // Next button
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                if (answers[current] === undefined) return;
                if (current < totalQ - 1) {
                    showQuestion(current + 1);
                } else {
                    showResults();
                }
            });
        }

        // Prev button
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (current > 0) showQuestion(current - 1);
            });
        }

        function showResults() {
            // Hide questions
            questions.forEach(function (q) { q.classList.remove('active'); });
            progressSteps.forEach(function (s) { s.classList.add('done'); s.classList.remove('current'); });
            if (nextBtn) nextBtn.style.display = 'none';
            if (prevBtn) prevBtn.style.display = 'none';

            // Calculate score
            var total = 0;
            var maxScore = totalQ * 4;
            answers.forEach(function (a) { total += a; });
            var pct = Math.round((total / maxScore) * 100);

            // Determine level
            var level, icon, label, message, fillColor;
            if (pct >= 65) {
                level = 'high';
                icon = '😊';
                label = 'High Mood';
                fillColor = 'linear-gradient(90deg, #9dd5b0, #76c08e)';
                message = 'Your mood appears to be in a good place right now. That\'s wonderful! Keep nurturing your well-being with regular self-care, social connection, and activities you enjoy. Remember, maintaining good mental health is an ongoing journey.';
            } else if (pct >= 35) {
                level = 'average';
                icon = '😐';
                label = 'Average Mood';
                fillColor = 'linear-gradient(90deg, #f0c9a6, #e8b4c8)';
                message = 'Your mood seems moderate — some good moments mixed with some challenges. This is completely normal. Consider trying our breathing exercise or grounding technique to boost your day. Small acts of self-care can make a meaningful difference.';
            } else {
                level = 'low';
                icon = '😔';
                label = 'Low Mood';
                fillColor = 'linear-gradient(90deg, #e8b4c8, #c06085)';
                message = 'It looks like you might be going through a tough time. Please know that your feelings are valid and you are not alone. We encourage you to explore our support resources or reach out to a professional. Talking to someone can be the most important first step.';
            }

            // Populate result
            resultEl.querySelector('.mood-result-icon').textContent = icon;
            resultEl.querySelector('h3').textContent = 'Your Mood: ' + label;
            var levelEl = resultEl.querySelector('.mood-level');
            levelEl.textContent = label;
            levelEl.className = 'mood-level ' + level;
            resultEl.querySelector('.mood-result-text').textContent = message;

            // Mood meter
            var meterFill = resultEl.querySelector('.mood-meter-fill');
            meterFill.style.width = '0%';
            meterFill.style.background = fillColor;

            resultEl.classList.add('active');

            // Animate meter
            setTimeout(function () {
                meterFill.style.width = pct + '%';
            }, 300);

            // Retake button
            var retakeBtn = resultEl.querySelector('.mood-retake');
            if (retakeBtn) {
                retakeBtn.addEventListener('click', function () {
                    answers = [];
                    resultEl.classList.remove('active');
                    container.querySelectorAll('.mood-option').forEach(function (o) {
                        o.classList.remove('selected');
                    });
                    if (nextBtn) { nextBtn.style.display = ''; nextBtn.disabled = true; }
                    if (prevBtn) prevBtn.style.display = '';
                    showQuestion(0);
                });
            }
        }

        showQuestion(0);
    }

    /* ----------------------------------------------------------
       INIT ALL
       ---------------------------------------------------------- */
    function init() {
        initMobileMenu();
        initDarkMode();
        initCounters();
        initTestimonialSlider();
        initContactForm();
        initAccordion();
        initModals();
        initBreathing();
        initGrounding();
        initChecklist();
        initInfoBars();
        initActiveNav();
        initChatbox();
        initMoodTest();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
