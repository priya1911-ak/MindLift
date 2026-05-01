/* ============================================================
   MindLift – voiceflow-assistant.js
   Floating AI Voice Assistant Widget (Voiceflow Dialog API)
   Features: Floating Modal, VAD, TTS, STT, Real-time status
   ============================================================ */

(function () {
  'use strict';

  /* ---- Config ---- */
  var CONFIG = {
    projectID: '69e30193380fec02e85cfa14',
    runtimeURL: 'https://general-runtime.voiceflow.com',
    versionID: 'development',
    voiceEnabled: true,
    maxRetries: 2,
    retryDelay: 2000,
    silenceTimeout: 2500,
    historyKey: 'mindlift-vf-history',
    maxHistory: 120,
    lazyDelay: 1500,
    tooltipDelay: 4000,
    tooltipDuration: 7000
  };

  /* ---- State ---- */
  var state = {
    isOpen: false,
    isListening: false,
    isSpeaking: false,
    isMuted: false,
    isLoading: false,
    isOnline: navigator.onLine,
    userID: null,
    recognition: null,
    synthesis: window.speechSynthesis || null,
    silenceTimer: null,
    launched: false,
    tooltipShown: false
  };

  /* ---- User ID ---- */
  function getUserID() {
    var id = localStorage.getItem('mindlift-vf-uid');
    if (!id) {
      id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('mindlift-vf-uid', id);
    }
    return id;
  }

  /* ---- Time ---- */
  function getTimeStr() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  /* ---- DOM Injection ---- */
  function injectWidget() {
    // 1. FAB
    var fab = document.createElement('button');
    fab.id = 'vf-fab';
    fab.className = 'vf-fab';
    fab.setAttribute('aria-label', 'Open AI Assistant');
    fab.innerHTML =
      '<svg class="vf-fab-icon vf-fab-icon--chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
      '</svg>' +
      '<svg class="vf-fab-icon vf-fab-icon--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
      '</svg>' +
      '<div class="vf-fab-badge" id="vf-fab-badge" style="display:none;"></div>';
    document.body.appendChild(fab);

    // 2. Panel
    var panel = document.createElement('div');
    panel.id = 'vf-panel';
    panel.className = 'vf-panel';
    panel.innerHTML =
      '<div class="vf-panel-header">' +
        '<div class="vf-panel-header-left">' +
          '<div class="vf-avatar">🧠</div>' +
          '<div>' +
            '<h3 class="vf-panel-title">MindLift AI</h3>' +
            '<div class="vf-panel-status" id="vf-status">' +
              '<span class="aichat-status-dot"></span> Online' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="vf-panel-header-actions">' +
          '<button class="vf-header-btn" id="vf-mute-btn" aria-label="Mute voice" title="Mute/Unmute voice">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
              '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>' +
              '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>' +
            '</svg>' +
          '</button>' +
          '<button class="vf-header-btn" id="vf-clear-btn" aria-label="Clear chat" title="Clear conversation">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<polyline points="3 6 5 6 21 6"></polyline>' +
              '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="vf-messages" id="vf-messages" aria-live="polite"></div>' +
      '<div class="vf-input-bar">' +
        '<button class="vf-mic-btn" id="vf-mic-btn" aria-label="Start voice input" title="Click to speak">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>' +
            '<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>' +
            '<line x1="12" y1="19" x2="12" y2="23"></line>' +
            '<line x1="8" y1="23" x2="16" y2="23"></line>' +
          '</svg>' +
        '</button>' +
        '<input type="text" class="vf-text-input" id="vf-text-input" placeholder="Type a message..." autocomplete="off">' +
        '<button class="vf-send-btn" id="vf-send-btn" aria-label="Send message">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<line x1="22" y1="2" x2="11" y2="13"></line>' +
            '<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>' +
          '</svg>' +
        '</button>' +
      '</div>';
    document.body.appendChild(panel);

    // Bind Toggle
    fab.addEventListener('click', toggleWidget);
  }

  function toggleWidget() {
    state.isOpen = !state.isOpen;
    var fab = document.getElementById('vf-fab');
    var panel = document.getElementById('vf-panel');
    var badge = document.getElementById('vf-fab-badge');
    var tooltip = document.getElementById('vf-tooltip');

    if (state.isOpen) {
      fab.classList.add('vf-fab--active');
      panel.classList.add('vf-panel--open');
      if (badge) badge.style.display = 'none';
      if (tooltip && tooltip.parentNode) {
        tooltip.classList.add('vf-tooltip--hide');
        setTimeout(function(){ if(tooltip.parentNode) tooltip.remove(); }, 400);
      }
      setTimeout(function() { document.getElementById('vf-text-input').focus(); }, 300);
      
      // Launch conversation if not yet launched
      if (!state.launched) {
        launchConversation();
      } else {
        scrollToBottom();
      }
    } else {
      fab.classList.remove('vf-fab--active');
      panel.classList.remove('vf-panel--open');
      if (state.isListening) stopListening();
      if (state.synthesis) state.synthesis.cancel();
    }
  }

  function showTooltip() {
    if (state.tooltipShown || state.isOpen) return;
    state.tooltipShown = true;

    var tooltip = document.createElement('div');
    tooltip.className = 'vf-tooltip';
    tooltip.id = 'vf-tooltip';
    tooltip.textContent = 'Need help? Talk to our AI 💙';
    document.body.appendChild(tooltip);

    var badge = document.getElementById('vf-fab-badge');
    if (badge) badge.style.display = 'block';

    setTimeout(function () {
      if (tooltip.parentNode) {
        tooltip.classList.add('vf-tooltip--hide');
        setTimeout(function () {
          if (tooltip.parentNode) tooltip.remove();
        }, 400);
      }
    }, CONFIG.tooltipDuration);
  }

  function scrollToBottom() {
    var wrap = document.getElementById('vf-messages');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }

  /* ---- History ---- */
  function saveHistory(sender, text) {
    try {
      var h = JSON.parse(localStorage.getItem(CONFIG.historyKey) || '[]');
      h.push({ sender: sender, text: text, time: getTimeStr(), ts: Date.now() });
      if (h.length > CONFIG.maxHistory) h = h.slice(-CONFIG.maxHistory);
      localStorage.setItem(CONFIG.historyKey, JSON.stringify(h));
    } catch (e) { /* ignore */ }
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(CONFIG.historyKey) || '[]'); }
    catch (e) { return []; }
  }

  function clearHistory() {
    localStorage.removeItem(CONFIG.historyKey);
    var el = document.getElementById('vf-messages');
    if (el) el.innerHTML = '';
    state.launched = false;
    if (state.isOpen) launchConversation();
  }

  function restoreHistory() {
    var h = loadHistory();
    if (!h.length) return false;
    h.forEach(function (item) { addMessage(item.text, item.sender, item.time, true); });
    return true;
  }

  /* ---- Messages ---- */
  function addMessage(text, sender, timeStr, skipSave) {
    var wrap = document.getElementById('vf-messages');
    if (!wrap) return;
    var msg = document.createElement('div');
    msg.className = 'vf-msg vf-msg--' + sender;
    var bubble = document.createElement('div');
    bubble.className = 'vf-msg-bubble';
    bubble.textContent = text;
    var t = document.createElement('span');
    t.className = 'vf-msg-time';
    t.textContent = timeStr || getTimeStr();
    msg.appendChild(bubble);
    msg.appendChild(t);
    wrap.appendChild(msg);
    scrollToBottom();
    if (!skipSave) saveHistory(sender, text);
    
    // Add badge if panel is closed
    if (!state.isOpen && sender === 'bot' && !skipSave) {
      var badge = document.getElementById('vf-fab-badge');
      if (badge) badge.style.display = 'block';
    }
  }

  function addTyping() {
    var wrap = document.getElementById('vf-messages');
    if (!wrap) return;
    var old = document.getElementById('vf-typing');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'vf-msg vf-msg--bot';
    el.id = 'vf-typing';
    el.innerHTML = '<div class="vf-typing"><span></span><span></span><span></span></div>';
    wrap.appendChild(el);
    scrollToBottom();
  }

  function removeTyping() {
    var el = document.getElementById('vf-typing');
    if (el) el.remove();
  }

  function updateStatus(text, type) {
    var el = document.getElementById('vf-status');
    if (!el) return;
    var cls = 'aichat-status-dot';
    if (type) cls += ' aichat-status-dot--' + type;
    el.innerHTML = '<span class="' + cls + '"></span> ' + text;
  }

  /* ---- Voiceflow API ---- */
  function vfInteract(action, cb, retry) {
    if (typeof retry === 'undefined') retry = 0;
    if (!state.isOnline) { cb(new Error('offline')); return; }

    state.isLoading = true;
    updateStatus('Thinking…', 'thinking');

    var ctrl = new AbortController();
    var tid = setTimeout(function () { ctrl.abort(); }, 15000);

    fetch(CONFIG.runtimeURL + '/state/user/' + state.userID + '/interact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CONFIG.projectID,
        'versionID': CONFIG.versionID
      },
      body: JSON.stringify({ action: action }),
      signal: ctrl.signal
    })
    .then(function (r) { clearTimeout(tid); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (traces) { state.isLoading = false; updateStatus('Online', 'online'); cb(null, traces); })
    .catch(function (err) {
      clearTimeout(tid);
      if (retry < CONFIG.maxRetries) {
        updateStatus('Retrying…', 'retry');
        setTimeout(function () { vfInteract(action, cb, retry + 1); }, CONFIG.retryDelay * (retry + 1));
        return;
      }
      state.isLoading = false;
      updateStatus('Online', 'online');
      cb(err);
    });
  }

  function processTraces(traces) {
    if (!traces || !Array.isArray(traces)) return;
    var fullText = '';
    traces.forEach(function (t) {
      if (t.type === 'text' || t.type === 'speak') {
        var txt = t.payload && t.payload.message ? t.payload.message : (t.payload || '');
        if (typeof txt === 'string' && txt.trim()) {
          var clean = txt.replace(/<[^>]*>/g, '');
          addMessage(clean, 'bot');
          fullText += clean + ' ';
        }
      }
      if (t.type === 'choice' && t.payload && t.payload.buttons) {
        addChoiceButtons(t.payload.buttons);
      }
    });
    if (fullText.trim() && CONFIG.voiceEnabled && !state.isMuted && state.synthesis && state.isOpen) {
      speakText(fullText.trim());
    }
  }

  function addChoiceButtons(buttons) {
    var wrap = document.getElementById('vf-messages');
    if (!wrap) return;
    var c = document.createElement('div');
    c.className = 'vf-choices';
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'vf-choice-btn';
      btn.textContent = b.name;
      btn.addEventListener('click', function () { c.remove(); handleInput(b.name); });
      c.appendChild(btn);
    });
    wrap.appendChild(c);
    scrollToBottom();
  }

  /* ---- STT with VAD ---- */
  function initSTT() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      CONFIG.voiceEnabled = false;
      var mb = document.getElementById('vf-mic-btn');
      if (mb) mb.style.display = 'none';
      return;
    }
    state.recognition = new SR();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = 'en-US';

    state.recognition.onresult = function (e) {
      clearTimeout(state.silenceTimer);
      var final = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final.trim()) { stopListening(); handleInput(final.trim()); }
      else {
        state.silenceTimer = setTimeout(function () { if (state.isListening) stopListening(); }, CONFIG.silenceTimeout);
      }
    };

    state.recognition.onerror = function (e) {
      state.isListening = false; updateMicUI(); updateStatus('Online', 'online');
      if (e.error === 'not-allowed') addMessage('🎤 Microphone access denied. Please allow it in browser settings.', 'bot');
      else if (e.error === 'network') addMessage('🌐 Network error during voice input.', 'bot');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') addMessage('🎤 Voice error. Try again or type instead.', 'bot');
    };

    state.recognition.onend = function () {
      if (state.isListening) { state.isListening = false; updateMicUI(); updateStatus('Online', 'online'); }
    };
  }

  function startListening() {
    if (!state.recognition) return;
    if (state.isListening) { stopListening(); return; }
    if (state.synthesis) state.synthesis.cancel();
    state.isListening = true;
    updateMicUI();
    updateStatus('Listening…', 'listening');
    try {
      state.recognition.start();
      state.silenceTimer = setTimeout(function () { if (state.isListening) stopListening(); }, CONFIG.silenceTimeout + 3000);
    } catch (e) { state.isListening = false; updateMicUI(); updateStatus('Online', 'online'); }
  }

  function stopListening() {
    clearTimeout(state.silenceTimer);
    state.isListening = false;
    updateMicUI();
    updateStatus('Online', 'online');
    try { state.recognition.stop(); } catch (e) { /* ignore */ }
  }

  function updateMicUI() {
    var b = document.getElementById('vf-mic-btn');
    if (b) {
      b.classList.toggle('vf-mic-btn--active', state.isListening);
      b.setAttribute('aria-label', state.isListening ? 'Stop listening' : 'Start voice input');
    }
  }

  /* ---- TTS ---- */
  function speakText(text) {
    if (!state.synthesis || state.isMuted) return;
    state.synthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1; u.lang = 'en-US';
    var voices = state.synthesis.getVoices();
    var pref = voices.find(function (v) { return v.lang.startsWith('en') && v.name.toLowerCase().indexOf('natural') !== -1; })
      || voices.find(function (v) { return v.lang.startsWith('en') && !v.localService; })
      || voices.find(function (v) { return v.lang.startsWith('en'); });
    if (pref) u.voice = pref;
    u.onstart = function () { state.isSpeaking = true; updateStatus('Speaking…', 'speaking'); };
    u.onend = function () { state.isSpeaking = false; updateStatus('Online', 'online'); };
    u.onerror = function () { state.isSpeaking = false; updateStatus('Online', 'online'); };
    state.synthesis.speak(u);
  }

  /* ---- User Input ---- */
  function handleInput(text) {
    if (!text.trim()) return;
    addMessage(text, 'user');
    var inp = document.getElementById('vf-text-input');
    if (inp) inp.value = '';
    addTyping();
    vfInteract({ type: 'text', payload: text }, function (err, traces) {
      removeTyping();
      if (err) {
        addMessage(state.isOnline ? 'Sorry, couldn\'t connect. Try again shortly. 💙' : '📡 You\'re offline. Check your connection.', 'bot');
        return;
      }
      processTraces(traces);
    });
  }

  /* ---- Events ---- */
  function bindEvents() {
    var sendBtn = document.getElementById('vf-send-btn');
    var inp = document.getElementById('vf-text-input');
    var micBtn = document.getElementById('vf-mic-btn');
    var muteBtn = document.getElementById('vf-mute-btn');
    var clearBtn = document.getElementById('vf-clear-btn');

    if (sendBtn) sendBtn.addEventListener('click', function () { handleInput(inp ? inp.value : ''); });
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); handleInput(inp.value); } });
    if (micBtn) micBtn.addEventListener('click', startListening);
    if (muteBtn) muteBtn.addEventListener('click', function () {
      state.isMuted = !state.isMuted;
      muteBtn.classList.toggle('vf-muted', state.isMuted);
      muteBtn.setAttribute('title', state.isMuted ? 'Unmute voice' : 'Mute voice');
      if (state.isMuted && state.synthesis) state.synthesis.cancel();
    });
    if (clearBtn) clearBtn.addEventListener('click', function () {
      clearHistory();
    });
    var closePanelBtn = document.getElementById('vf-close-panel-btn');
    if (closePanelBtn) closePanelBtn.addEventListener('click', toggleWidget);

    window.addEventListener('online', function () { state.isOnline = true; updateStatus('Online', 'online'); });
    window.addEventListener('offline', function () { state.isOnline = false; updateStatus('Offline', 'offline'); });
  }

  /* ---- Launch ---- */
  function launchConversation() {
    state.launched = true;
    var restored = restoreHistory();
    if (!restored) {
      addTyping();
      vfInteract({ type: 'launch' }, function (err, traces) {
        removeTyping();
        if (err) { addMessage('Hi there! 👋 Welcome to MindLift AI. I\'m here to listen and support you. How are you feeling today?', 'bot'); return; }
        processTraces(traces);
      });
    } else {
      scrollToBottom();
    }
  }

  /* ---- Init ---- */
  function init() {
    state.userID = getUserID();
    injectWidget();
    initSTT();
    bindEvents();
    if (state.synthesis && state.synthesis.onvoiceschanged !== undefined) {
      state.synthesis.onvoiceschanged = function () {};
    }
    
    // Automatically launch in background if no history exists to pre-fetch welcome msg
    if (!loadHistory().length) {
      vfInteract({ type: 'launch' }, function (err, traces) {
        if (!err && traces) {
          state.launched = true;
          processTraces(traces);
        }
      });
    } else {
      state.launched = true;
      restoreHistory();
    }
  }

  function lazyInit() {
    if (document.readyState === 'complete') {
      setTimeout(init, CONFIG.lazyDelay);
      setTimeout(showTooltip, CONFIG.lazyDelay + CONFIG.tooltipDelay);
    } else {
      window.addEventListener('load', function () {
        setTimeout(init, CONFIG.lazyDelay);
        setTimeout(showTooltip, CONFIG.lazyDelay + CONFIG.tooltipDelay);
      });
    }
  }

  lazyInit();
})();
