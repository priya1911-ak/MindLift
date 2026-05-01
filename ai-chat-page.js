/* ============================================================
   MindLift – ai-chat-page.js
   Full-page AI voice + text chat (Voiceflow Dialog API)
   Features: VAD, conversation history, TTS, error handling
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
    historyKey: 'mindlift-aichat-history',
    maxHistory: 120
  };

  /* ---- State ---- */
  var state = {
    isListening: false,
    isSpeaking: false,
    isMuted: false,
    isLoading: false,
    isOnline: navigator.onLine,
    userID: null,
    recognition: null,
    synthesis: window.speechSynthesis || null,
    silenceTimer: null,
    launched: false
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
    var el = document.getElementById('aichat-messages');
    if (el) el.innerHTML = '';
  }

  function restoreHistory() {
    var h = loadHistory();
    if (!h.length) return false;
    h.forEach(function (item) { addMessage(item.text, item.sender, item.time, true); });
    return true;
  }

  /* ---- Time ---- */
  function getTimeStr() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  /* ---- Messages ---- */
  function addMessage(text, sender, timeStr, skipSave) {
    var wrap = document.getElementById('aichat-messages');
    if (!wrap) return;
    var msg = document.createElement('div');
    msg.className = 'aichat-msg aichat-msg--' + sender;
    var bubble = document.createElement('div');
    bubble.className = 'aichat-msg-bubble';
    bubble.textContent = text;
    var t = document.createElement('span');
    t.className = 'aichat-msg-time';
    t.textContent = timeStr || getTimeStr();
    msg.appendChild(bubble);
    msg.appendChild(t);
    wrap.appendChild(msg);
    wrap.scrollTop = wrap.scrollHeight;
    if (!skipSave) saveHistory(sender, text);
  }

  function addTyping() {
    var wrap = document.getElementById('aichat-messages');
    if (!wrap) return;
    var old = document.getElementById('aichat-typing');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'aichat-msg aichat-msg--bot';
    el.id = 'aichat-typing';
    el.innerHTML = '<div class="aichat-typing"><span></span><span></span><span></span></div>';
    wrap.appendChild(el);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById('aichat-typing');
    if (el) el.remove();
  }

  function updateStatus(text, type) {
    var el = document.getElementById('aichat-status');
    if (!el) return;
    var cls = 'aichat-status-dot';
    if (type) cls += ' aichat-status-dot--' + type;
    el.innerHTML = '<span class="' + cls + '"></span> ' + text;

    var wf = document.getElementById('aichat-waveform');
    var emoji = document.querySelector('.aichat-avatar-emoji');
    if (wf && emoji) {
      var active = type === 'listening' || type === 'speaking';
      wf.classList.toggle('aichat-waveform--active', active);
      emoji.style.display = active ? 'none' : '';
    }
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

  /* ---- Process Traces ---- */
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
    if (fullText.trim() && CONFIG.voiceEnabled && !state.isMuted && state.synthesis) {
      speakText(fullText.trim());
    }
  }

  function addChoiceButtons(buttons) {
    var wrap = document.getElementById('aichat-messages');
    if (!wrap) return;
    var c = document.createElement('div');
    c.className = 'aichat-choices';
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'aichat-choice-btn';
      btn.textContent = b.name;
      btn.addEventListener('click', function () { c.remove(); handleInput(b.name); });
      c.appendChild(btn);
    });
    wrap.appendChild(c);
    wrap.scrollTop = wrap.scrollHeight;
  }

  /* ---- STT with VAD ---- */
  function initSTT() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      CONFIG.voiceEnabled = false;
      var mb = document.getElementById('aichat-mic-btn');
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
    var b = document.getElementById('aichat-mic-btn');
    if (b) {
      b.classList.toggle('aichat-mic-btn--active', state.isListening);
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
    var inp = document.getElementById('aichat-text-input');
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
    var sendBtn = document.getElementById('aichat-send-btn');
    var inp = document.getElementById('aichat-text-input');
    var micBtn = document.getElementById('aichat-mic-btn');
    var muteBtn = document.getElementById('aichat-mute-btn');
    var clearBtn = document.getElementById('aichat-clear-btn');

    if (sendBtn) sendBtn.addEventListener('click', function () { handleInput(inp ? inp.value : ''); });
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); handleInput(inp.value); } });
    if (micBtn) micBtn.addEventListener('click', startListening);
    if (muteBtn) muteBtn.addEventListener('click', function () {
      state.isMuted = !state.isMuted;
      muteBtn.classList.toggle('aichat-muted', state.isMuted);
      muteBtn.setAttribute('title', state.isMuted ? 'Unmute voice' : 'Mute voice');
      if (state.isMuted && state.synthesis) state.synthesis.cancel();
    });
    if (clearBtn) clearBtn.addEventListener('click', function () {
      clearHistory();
      state.launched = false;
      launchConversation();
    });

    window.addEventListener('online', function () { state.isOnline = true; updateStatus('Online', 'online'); });
    window.addEventListener('offline', function () { state.isOnline = false; updateStatus('Offline', 'offline'); });
  }

  /* ---- Launch ---- */
  function launchConversation() {
    if (state.launched) return;
    state.launched = true;
    var restored = restoreHistory();
    if (!restored) {
      addTyping();
      vfInteract({ type: 'launch' }, function (err, traces) {
        removeTyping();
        if (err) { addMessage('Hi there! 👋 Welcome to MindLift AI. I\'m here to listen and support you. How are you feeling today?', 'bot'); return; }
        processTraces(traces);
      });
    }
  }

  /* ---- Init ---- */
  function init() {
    state.userID = getUserID();
    initSTT();
    bindEvents();
    if (state.synthesis && state.synthesis.onvoiceschanged !== undefined) {
      state.synthesis.onvoiceschanged = function () {};
    }
    launchConversation();
    // Focus input
    setTimeout(function () {
      var inp = document.getElementById('aichat-text-input');
      if (inp) inp.focus();
    }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
