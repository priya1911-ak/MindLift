/* ============================================================
   MindLift – chat.js
   Online community chat room with rooms, localStorage sync,
   BroadcastChannel cross-tab messaging, and simulated users
   ============================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------
       CONFIG & STATE
       ---------------------------------------------------------- */
    var STORAGE_KEY = 'mindlift-chat';
    var USER_KEY = 'mindlift-chat-user';
    var ONLINE_KEY = 'mindlift-chat-online';

    var currentUser = null;
    var currentRoom = 'general';
    var channel = null;

    // Avatar colors
    var avatarColors = [
        '#7eb8da', '#b8a9d4', '#9dd5b0', '#e8b4c8',
        '#f0c9a6', '#82c4c3', '#c9b8e8', '#a8d5ba'
    ];

    // Chat rooms
    var rooms = [
        { id: 'general', icon: '💬', name: 'General Chat', desc: 'Open conversation for everyone' },
        { id: 'support', icon: '💙', name: 'Peer Support', desc: 'Share & listen with compassion' },
        { id: 'anxiety', icon: '🌊', name: 'Anxiety Support', desc: 'For those managing anxiety' },
        { id: 'motivation', icon: '🌟', name: 'Motivation Corner', desc: 'Positive vibes & encouragement' },
        { id: 'selfcare', icon: '🌿', name: 'Self-Care Tips', desc: 'Share wellness routines' }
    ];

    // Simulated community members (bot personas)
    var botUsers = [
        { name: 'Maya', color: '#b8a9d4' },
        { name: 'James', color: '#9dd5b0' },
        { name: 'Priya', color: '#e8b4c8' },
        { name: 'Alex', color: '#82c4c3' },
        { name: 'Sofia', color: '#f0c9a6' }
    ];

    // Bot message pool per room
    var botMessages = {
        general: [
            'Hey everyone! Hope you\'re all having a good day 😊',
            'Just checking in — remember to drink some water! 💧',
            'What\'s one thing that made you smile today?',
            'It\'s okay to take things one step at a time. You\'re doing great! 💪',
            'Has anyone tried journaling? It really helped me clear my head 📝',
            'Sending positive vibes to everyone here! 💙',
            'Remember: progress, not perfection ✨'
        ],
        support: [
            'You\'re not alone in this. We\'re all here for each other 💙',
            'I had a really hard day today, but talking about it helps.',
            'For anyone struggling right now — your feelings are valid.',
            'Sharing my struggles here has made such a difference. Thank you all.',
            'It\'s brave to ask for help. I\'m proud of everyone here.',
            'Healing isn\'t linear. Some days are harder than others, and that\'s okay.'
        ],
        anxiety: [
            'The breathing exercise on this site really helped me during a panic attack 🌬️',
            'Does anyone else get random waves of anxiety? How do you manage it?',
            'Grounding techniques have been a game-changer for me.',
            'Taking things moment by moment when anxiety gets overwhelming.',
            'I just did the 5-4-3-2-1 technique and I feel calmer already 🧘',
            'Remember: anxiety lies to you. You are safe. You are enough.'
        ],
        motivation: [
            'You are stronger than you think! 💪✨',
            '"The only way out is through." — Just keep going!',
            'Small wins count! Celebrate every little victory 🎉',
            'Today is a new opportunity. Make it count! 🌅',
            'You\'ve survived 100% of your worst days. That\'s incredible!',
            'Be gentle with yourself. Growth takes time 🌱'
        ],
        selfcare: [
            'Morning routine tip: 5 minutes of stretching does wonders! 🧘‍♀️',
            'I made myself a warm cup of tea and just sat quietly. It was perfect ☕',
            'Has anyone tried a digital detox weekend? So refreshing!',
            'Self-care isn\'t selfish. It\'s necessary. 💚',
            'Cooked a healthy meal today and felt so accomplished! 🥗',
            'Evening walks have become my favorite self-care ritual 🌆'
        ]
    };

    /* ----------------------------------------------------------
       UTILITY HELPERS
       ---------------------------------------------------------- */
    function getTimeStr() {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
    }

    function getAvatarColor(name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return avatarColors[Math.abs(hash) % avatarColors.length];
    }

    function getInitials(name) {
        return name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().substring(0, 2);
    }

    /* ----------------------------------------------------------
       STORAGE: Messages
       ---------------------------------------------------------- */
    function loadMessages(room) {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return data[room] || [];
        } catch (e) {
            return [];
        }
    }

    function saveMessage(room, msg) {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (!data[room]) data[room] = [];
            data[room].push(msg);
            // Keep last 100 messages per room
            if (data[room].length > 100) data[room] = data[room].slice(-100);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage full fallback */ }
    }

    /* ----------------------------------------------------------
       STORAGE: Online Users
       ---------------------------------------------------------- */
    function registerOnline(name) {
        try {
            var online = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
            online[name] = Date.now();
            localStorage.setItem(ONLINE_KEY, JSON.stringify(online));
        } catch (e) { /* ignore */ }
    }

    function getOnlineUsers() {
        try {
            var online = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
            var now = Date.now();
            var active = {};
            // Clean up stale users (> 30 seconds)
            Object.keys(online).forEach(function (name) {
                if (now - online[name] < 30000) {
                    active[name] = online[name];
                }
            });
            localStorage.setItem(ONLINE_KEY, JSON.stringify(active));
            return Object.keys(active);
        } catch (e) {
            return [];
        }
    }

    /* ----------------------------------------------------------
       BROADCAST CHANNEL (cross-tab sync)
       ---------------------------------------------------------- */
    function initChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel('mindlift-chat-channel');
            channel.onmessage = function (e) {
                var msg = e.data;
                if (msg.type === 'message' && msg.room === currentRoom) {
                    renderMessage(msg.data, false);
                    scrollToBottom();
                }
                if (msg.type === 'user-join' || msg.type === 'user-leave') {
                    renderOnlineUsers();
                }
            };
        }
    }

    function broadcast(type, data) {
        if (channel) {
            channel.postMessage({ type: type, room: currentRoom, data: data });
        }
    }

    /* ----------------------------------------------------------
       DOM ELEMENTS
       ---------------------------------------------------------- */
    var els = {};

    function cacheDom() {
        els.loginOverlay = document.getElementById('chat-login-overlay');
        els.loginInput = document.getElementById('chat-username-input');
        els.loginBtn = document.getElementById('chat-login-btn');
        els.roomsList = document.getElementById('chat-rooms-list');
        els.onlineList = document.getElementById('chat-online-list');
        els.onlineCount = document.getElementById('chat-online-count');
        els.mainMessages = document.getElementById('chat-main-messages');
        els.mainInput = document.getElementById('chat-msg-input');
        els.sendBtn = document.getElementById('chat-send-btn');
        els.emojiBtn = document.getElementById('chat-emoji-btn');
        els.emojiPicker = document.getElementById('chat-emoji-picker');
        els.roomTitle = document.getElementById('chat-room-title');
        els.roomDesc = document.getElementById('chat-room-desc');
    }

    /* ----------------------------------------------------------
       RENDERING
       ---------------------------------------------------------- */
    function renderMessage(msg, save) {
        var isSelf = msg.user === currentUser;
        var div = document.createElement('div');

        if (msg.type === 'system') {
            div.classList.add('chat-system-msg');
            div.textContent = msg.text;
        } else {
            div.classList.add('chat-room-msg');
            if (isSelf) div.classList.add('self');

            var color = getAvatarColor(msg.user);
            div.innerHTML =
                '<div class="msg-avatar" style="background:' + color + '">' + getInitials(msg.user) + '</div>' +
                '<div class="msg-bubble">' +
                (!isSelf ? '<span class="msg-sender">' + msg.user + '</span>' : '') +
                msg.text +
                '<span class="msg-timestamp">' + msg.time + '</span>' +
                '</div>';
        }

        els.mainMessages.appendChild(div);

        if (save) {
            saveMessage(currentRoom, msg);
            broadcast('message', msg);
        }
    }

    function renderAllMessages() {
        els.mainMessages.innerHTML = '';
        var messages = loadMessages(currentRoom);
        messages.forEach(function (msg) {
            renderMessage(msg, false);
        });
        scrollToBottom();
    }

    function renderRooms() {
        els.roomsList.innerHTML = '';
        rooms.forEach(function (room) {
            var item = document.createElement('div');
            item.classList.add('chat-room-item');
            if (room.id === currentRoom) item.classList.add('active');
            item.innerHTML =
                '<div class="room-icon">' + room.icon + '</div>' +
                '<div><h4>' + room.name + '</h4><p>' + room.desc + '</p></div>';
            item.addEventListener('click', function () {
                switchRoom(room.id);
            });
            els.roomsList.appendChild(item);
        });
    }

    function renderOnlineUsers() {
        var users = getOnlineUsers();
        // Add some bots if fewer than 3 online
        var botOnline = botUsers.slice(0, Math.max(2, 5 - users.length));
        var allNames = users.slice();
        botOnline.forEach(function (b) {
            if (allNames.indexOf(b.name) === -1) allNames.push(b.name);
        });

        els.onlineList.innerHTML = '';
        allNames.forEach(function (name) {
            var div = document.createElement('div');
            div.classList.add('online-user');
            div.innerHTML = '<span class="online-dot"></span> ' + name +
                (name === currentUser ? ' (you)' : '');
            els.onlineList.appendChild(div);
        });
        els.onlineCount.textContent = allNames.length + ' online';
    }

    function scrollToBottom() {
        els.mainMessages.scrollTop = els.mainMessages.scrollHeight;
    }

    /* ----------------------------------------------------------
       ROOM SWITCHING
       ---------------------------------------------------------- */
    function switchRoom(roomId) {
        currentRoom = roomId;
        var room = rooms.find(function (r) { return r.id === roomId; });
        if (room) {
            els.roomTitle.textContent = room.icon + ' ' + room.name;
            els.roomDesc.textContent = room.desc;
        }
        renderRooms();
        renderAllMessages();
    }

    /* ----------------------------------------------------------
       SENDING MESSAGES
       ---------------------------------------------------------- */
    function sendUserMessage() {
        var text = els.mainInput.value.trim();
        if (!text || !currentUser) return;

        var msg = {
            user: currentUser,
            text: text,
            time: getTimeStr(),
            type: 'message'
        };

        renderMessage(msg, true);
        scrollToBottom();
        els.mainInput.value = '';

        // Trigger bot response after a delay
        scheduleBotReply();
    }

    /* ----------------------------------------------------------
       BOT SIMULATION
       ---------------------------------------------------------- */
    var botTimer = null;

    function scheduleBotReply() {
        if (botTimer) clearTimeout(botTimer);
        var delay = 3000 + Math.random() * 7000; // 3-10 seconds

        botTimer = setTimeout(function () {
            var pool = botMessages[currentRoom] || botMessages.general;
            var bot = botUsers[Math.floor(Math.random() * botUsers.length)];
            var text = pool[Math.floor(Math.random() * pool.length)];

            var msg = {
                user: bot.name,
                text: text,
                time: getTimeStr(),
                type: 'message'
            };

            renderMessage(msg, true);
            scrollToBottom();
        }, delay);
    }

    // Periodic ambient bot messages
    function startAmbientMessages() {
        setInterval(function () {
            if (Math.random() > 0.6) return; // 40% chance every cycle
            var pool = botMessages[currentRoom] || botMessages.general;
            var bot = botUsers[Math.floor(Math.random() * botUsers.length)];
            var text = pool[Math.floor(Math.random() * pool.length)];

            var msg = {
                user: bot.name,
                text: text,
                time: getTimeStr(),
                type: 'message'
            };

            renderMessage(msg, true);
            scrollToBottom();
        }, 25000 + Math.random() * 20000); // every 25-45 seconds
    }

    /* ----------------------------------------------------------
       EMOJI PICKER
       ---------------------------------------------------------- */
    var emojis = ['💙', '😊', '🙏', '💪', '✨', '🌟', '🌿', '💚', '❤️', '🌈', '☀️', '🧘', '🎉', '👋', '😔', '🤗', '💜', '🌸', '🌊', '🔥', '🦋', '🍃', '💛', '🌻'];

    function initEmojiPicker() {
        els.emojiPicker.innerHTML = '';
        emojis.forEach(function (emoji) {
            var btn = document.createElement('button');
            btn.textContent = emoji;
            btn.type = 'button';
            btn.addEventListener('click', function () {
                els.mainInput.value += emoji;
                els.mainInput.focus();
                els.emojiPicker.classList.remove('open');
            });
            els.emojiPicker.appendChild(btn);
        });

        els.emojiBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            els.emojiPicker.classList.toggle('open');
        });

        document.addEventListener('click', function () {
            els.emojiPicker.classList.remove('open');
        });
    }

    /* ----------------------------------------------------------
       LOGIN FLOW
       ---------------------------------------------------------- */
    function initLogin() {
        // Check if user already logged in
        var saved = localStorage.getItem(USER_KEY);
        if (saved) {
            currentUser = saved;
            els.loginOverlay.classList.add('hidden');
            onUserJoined();
            return;
        }

        els.loginBtn.addEventListener('click', function () {
            attemptLogin();
        });

        els.loginInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    function attemptLogin() {
        var name = els.loginInput.value.trim();
        if (name.length < 2) {
            els.loginInput.style.borderColor = '#e57373';
            els.loginInput.setAttribute('placeholder', 'Please enter at least 2 characters');
            return;
        }
        currentUser = name;
        localStorage.setItem(USER_KEY, name);
        els.loginOverlay.classList.add('hidden');
        onUserJoined();
    }

    function onUserJoined() {
        registerOnline(currentUser);

        // System message
        var joinMsg = {
            type: 'system',
            text: currentUser + ' joined the chat 👋',
            time: getTimeStr()
        };
        renderMessage(joinMsg, true);
        broadcast('user-join', { user: currentUser });

        renderOnlineUsers();
        renderAllMessages();
        scrollToBottom();

        // Keep pinging online status
        setInterval(function () {
            registerOnline(currentUser);
            renderOnlineUsers();
        }, 10000);

        // Start ambient bot messages
        startAmbientMessages();

        els.mainInput.focus();
    }

    /* ----------------------------------------------------------
       INIT
       ---------------------------------------------------------- */
    function init() {
        cacheDom();
        initChannel();
        renderRooms();
        initEmojiPicker();
        initLogin();

        // Send on click
        els.sendBtn.addEventListener('click', sendUserMessage);

        // Send on Enter
        els.mainInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendUserMessage();
            }
        });

        // Switch room initial
        switchRoom('general');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
