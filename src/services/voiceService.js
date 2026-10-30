/**
 * Modular Voice Service for Gideon.
 * Encapsulates Web Speech API SpeechRecognition (STT), SpeechSynthesis (TTS),
 * playback-synchronized viseme lipsync orchestration, and Web Audio API microphone volume analysis.
 *
 * Strictly separates:
 * - User microphone input (`isListening`, microphone `onAudioLevel`)
 * - Gideon outgoing speech (`isSpeaking`, `speechLevel`, `speechPulse`, `currentViseme`, `visemeTimeline`)
 */

import {
  VISEME_CODES,
  getVisemePose,
  LipsyncTimelineController,
} from './lipsyncService';

class VoiceService {
  constructor() {
    // Microphone / STT state (strictly user input)
    this.recognition = null;
    this.isListening = false;
    this.audioContext = null;
    this.analyser = null;
    this.audioStream = null;
    this.audioAnimId = null;
    this.onAudioLevelCallback = null;

    // Outgoing Speech / TTS & Lipsync state (strictly Gideon output)
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.currentUtteranceId = null;
    this._utteranceCounter = 0;
    this.lipsync = new LipsyncTimelineController();
    this.visemeTimeline = null;
    this.currentViseme = VISEME_CODES.REST;
    this.currentVisemePose = getVisemePose(VISEME_CODES.REST);
    this.speechLevel = 0;
    this.speechPulse = 0;
    this.speechTickerId = null;
    this.speechListeners = new Set();
    this.activeUtterances = new Set();
    this.speechKeepAliveTimer = null;
    this._bgKeepAliveNode = null;

    this.cachedVoices = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      };
    }
  }

  _now() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  /**
   * Subscribe to outgoing AI speech lifecycle & viseme updates.
   * Never triggered by microphone activity.
   */
  subscribeSpeech(listener) {
    if (typeof listener !== 'function') return () => {};
    this.speechListeners.add(listener);
    listener(this.getSpeechState());
    return () => {
      this.speechListeners.delete(listener);
    };
  }

  _notifySpeech(extra = {}) {
    const snapshot = {
      ...this.getSpeechState(),
      ...extra,
    };
    this.speechListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Speech listener error:', err);
      }
    });
  }

  /**
   * Get current outgoing speech & viseme state snapshot.
   */
  getSpeechState() {
    return {
      isSpeaking: this.isSpeaking,
      utteranceId: this.currentUtteranceId,
      viseme: this.currentViseme,
      visemePose: this.currentVisemePose,
      speechLevel: this.speechLevel,
      speechPulse: this.speechPulse,
      visemeTimeline: this.visemeTimeline,
    };
  }

  /**
   * High-frequency, allocation-light sampler for 60fps Canvas renderers
   * (`GideonTechBrain` and `VoiceReactiveDotField`).
   */
  sampleSpeechState(nowMs = this._now()) {
    if (!this.isSpeaking || !this.currentUtteranceId) {
      return {
        isSpeaking: false,
        utteranceId: null,
        viseme: VISEME_CODES.REST,
        visemePose: getVisemePose(VISEME_CODES.REST),
        speechLevel: 0,
        speechPulse: 0,
        isPause: true,
      };
    }

    const sampled = this.lipsync.sample(nowMs, this.currentUtteranceId);
    this.currentViseme = sampled.viseme;
    this.currentVisemePose = sampled.pose;
    this.speechLevel = sampled.speechLevel;
    this.speechPulse = sampled.speechPulse;

    return {
      isSpeaking: true,
      utteranceId: this.currentUtteranceId,
      viseme: sampled.viseme,
      visemePose: sampled.pose,
      speechLevel: sampled.speechLevel,
      speechPulse: sampled.speechPulse,
      isPause: sampled.isPause,
      elapsedMs: sampled.elapsedMs,
    };
  }

  /**
   * Transcribe recorded audio payload using Gideon backend SAPI or Gemini multimodal STT.
   * Provides guaranteed fallback when browser Web Speech API is blocked or offline.
   */
  async transcribeAudio(audioBlob) {
    if (!audioBlob || audioBlob.size === 0) return '';
    if (typeof FileReader === 'undefined') return '';

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result;
          const baseUrl =
            (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
            'http://localhost:8000/api/v1';
          const response = await fetch(`${baseUrl}/voice/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: base64Data,
              mime_type: audioBlob.type || 'audio/webm',
              format: audioBlob.type?.includes('wav') ? 'wav' : 'webm',
            }),
          });
          if (!response.ok) {
            resolve('');
            return;
          }
          const data = await response.json();
          resolve(data?.text || '');
        } catch {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(audioBlob);
    });
  }

  isSpeechRecognitionSupported() {
    return (
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  /**
   * Enumerate available microphone devices for hands-free device selection.
   */
  async getAudioInputDevices() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch (err) {
      console.warn('Failed to enumerate audio input devices:', err);
      return [];
    }
  }

  isSpeechSynthesisSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getVoices() {
    if (!this.isSpeechSynthesisSupported()) return [];
    const live = window.speechSynthesis.getVoices();
    if (live && live.length > 0) {
      this.cachedVoices = live;
      return live;
    }
    return this.cachedVoices || [];
  }

  /**
   * Find the optimal British female voice matching Actress Amy Louise Pemberton
   * (Gideon AI from DC's Legends of Tomorrow).
   */
  findBestGideonVoice(voices = null) {
    const list = voices || this.getVoices();
    if (!list || list.length === 0) return null;

    // 1. Look for explicit British English (en-GB / en-UK) voices
    const gbVoices = list.filter((v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang === 'en-gb' || lang.startsWith('en-gb') || lang === 'en-uk';
    });

    // Top tier: Known British Natural / Female voices (Libby, Mia, Hazel, Google UK English Female, Amy, Sonia, Serena, Victoria)
    const preferredBritishFemale = gbVoices.find((v) => {
      const name = (v.name || '').toLowerCase();
      return (
        name.includes('amy') ||
        name.includes('pemberton') ||
        name.includes('libby') ||
        name.includes('mia') ||
        name.includes('hazel') ||
        name.includes('sonia') ||
        name.includes('serena') ||
        name.includes('victoria') ||
        name.includes('female') ||
        name.includes('natural') ||
        name.includes('online')
      );
    });
    if (preferredBritishFemale) return preferredBritishFemale;
    if (gbVoices.length > 0) return gbVoices[0];

    // 2. Look for any English female voice (US/AU/CA)
    const enFemale = list.find((v) => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      const isEnglish = lang.startsWith('en');
      const isFemale =
        name.includes('female') ||
        name.includes('zira') ||
        name.includes('jenny') ||
        name.includes('samantha') ||
        name.includes('siri') ||
        name.includes('karen') ||
        name.includes('victoria') ||
        name.includes('natural');
      return isEnglish && isFemale;
    });
    if (enFemale) return enFemale;

    // 3. Fallback to any English voice
    const anyEn = list.find((v) => (v.lang || '').toLowerCase().startsWith('en'));
    return anyEn || list[0];
  }

  /**
   * Start push-to-talk / voice recognition session.
   * Strictly measures user microphone input and never activates AI speaking state.
   * Includes Voice Activity Detection (VAD) / silence timeout so utterances auto-commit
   * when user pauses speaking without needing manual button clicks.
   */
  async startListening({
    onInterim,
    onFinal,
    onError,
    onStateChange,
    onAudioLevel,
    deviceId = '',
    autoSilenceMs = 1100,
  } = {}) {
    if (!this.isSpeechRecognitionSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) {
      this.stopListening(false);
    }

    // Stop speaking if Gideon is currently speaking
    this.stopSpeaking();

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRecognitionClass();
    } catch (err) {
      if (onError) onError('Failed to initialize speech recognition engine.');
      return false;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.onAudioLevelCallback = onAudioLevel;

    let accumulatedFinal = '';
    let latestInterim = '';
    let hasEmittedFinal = false;
    let silenceTimer = null;
    let mediaRecorder = null;
    let audioChunks = [];

    const initMediaRecorder = () => {
      if (typeof MediaRecorder !== 'undefined' && this.audioStream) {
        try {
          const mimeType = (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
            ? 'audio/webm;codecs=opus'
            : (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm'))
            ? 'audio/webm'
            : '';
          mediaRecorder = mimeType ? new MediaRecorder(this.audioStream, { mimeType }) : new MediaRecorder(this.audioStream);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunks.push(e.data);
            }
          };
          mediaRecorder.start(100);
        } catch (err) {
          // MediaRecorder is optional fallback
        }
      }
    };

    const clearSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const commitUtterance = async (forceText = null) => {
      clearSilenceTimer();
      if (hasEmittedFinal) return;

      let fullText = (
        forceText !== null ? forceText : (accumulatedFinal + ' ' + latestInterim)
      ).trim();

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try { mediaRecorder.stop(); } catch {}
      }

      // If Web Speech API produced nothing, fallback to backend SAPI / Gemini transcription!
      if (!fullText && audioChunks.length > 0) {
        try {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
          if (audioBlob.size > 500) {
            const transcribed = await this.transcribeAudio(audioBlob);
            if (transcribed && transcribed.trim()) {
              fullText = transcribed.trim();
            }
          }
        } catch {}
      }

      if (fullText) {
        hasEmittedFinal = true;
        this._activeCommit = null;
        if (this.recognition) {
          try {
            this.recognition.stop();
          } catch {}
        }
        this.isListening = false;
        this._stopAudioAnalysis();
        if (onFinal) onFinal(fullText);
      }
    };

    // Store commit function so external callers (e.g. manual tap stop) commit pending speech
    this._activeCommit = commitUtterance;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStateChange) onStateChange(true);
      this._startAudioAnalysis(onAudioLevel, deviceId)
        .then(() => {
          initMediaRecorder();
        })
        .catch(() => {});
    };

    this.recognition.onresult = (event) => {
      clearSilenceTimer();
      let currentInterim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcript = item[0]?.transcript || '';
        if (item.isFinal) {
          newFinal += transcript + ' ';
        } else {
          currentInterim += transcript + ' ';
        }
      }

      if (newFinal) {
        accumulatedFinal += newFinal;
      }
      latestInterim = currentInterim;

      const liveText = (accumulatedFinal + ' ' + latestInterim).trim();
      if (liveText) {
        if (onInterim) {
          onInterim(liveText);
        }

        // Auto-commit on silence pause (Voice Activity Detection)
        if (autoSilenceMs > 0) {
          silenceTimer = setTimeout(() => {
            commitUtterance();
          }, autoSilenceMs);
        }
      }

      // If browser explicitly marked speech final and there is no pending interim
      if (newFinal.trim() && !latestInterim.trim() && !hasEmittedFinal) {
        commitUtterance();
      }
    };

    this.recognition.onerror = async (event) => {
      const errorType = event.error || 'unknown';
      if (errorType === 'network' || errorType === 'no-speech') {
        // Fallback to recorded audio chunk
        await commitUtterance();
        return;
      }
      clearSilenceTimer();
      let userFriendlyMessage = `Speech recognition error: ${errorType}`;
      if (errorType === 'not-allowed' || errorType === 'permission-denied') {
        userFriendlyMessage = 'Microphone access denied. Please allow microphone permissions.';
      }
      if (onError) onError(userFriendlyMessage);
    };

    this.recognition.onend = async () => {
      clearSilenceTimer();
      if (!hasEmittedFinal) {
        await commitUtterance();
      }
      this.isListening = false;
      this._stopAudioAnalysis();
      if (onStateChange) onStateChange(false);
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      clearSilenceTimer();
      this.isListening = false;
      this._stopAudioAnalysis();
      if (onError) onError(`Could not start microphone: ${err.message}`);
      return false;
    }
  }

  /**
   * Stop recognition session and release mic resources.
   * If commitPending is true, commits whatever user spoke so far rather than discarding it!
   */
  stopListening(commitPending = true) {
    if (commitPending && this._activeCommit) {
      const commit = this._activeCommit;
      this._activeCommit = null;
      commit();
      return;
    }

    this._activeCommit = null;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore if already stopped
      }
      this.recognition = null;
    }
    this.isListening = false;
    this._stopAudioAnalysis();
  }

  /**
   * Keep-alive interval for Chromium/Blink engines.
   * Prevents SpeechSynthesis from prematurely stalling/stopping at ~14 seconds.
   */
  _startSpeechKeepAlive() {
    this._stopSpeechKeepAlive();
    this.speechKeepAliveTimer = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 8500);
  }

  _stopSpeechKeepAlive() {
    if (this.speechKeepAliveTimer) {
      clearInterval(this.speechKeepAliveTimer);
      this.speechKeepAliveTimer = null;
    }
  }

  /**
   * Speak response text via window.speechSynthesis and synchronize the viseme timeline.
   */
  speak(
    text,
    {
      voiceURI,
      rate = 1.0,
      pitch = 1.0,
      alignment = null,
      queueMode = false,
      onStart,
      onEnd,
      onError,
      onVisemeChange,
      onBoundary,
    } = {}
  ) {
    if (!this.isSpeechSynthesisSupported()) {
      if (onEnd) onEnd();
      return null;
    }

    // Cancel prior speech ONLY if not in sequential queue mode!
    // In queueMode, sentences flow continuously without cancel() cutting them off.
    if (!queueMode) {
      this.stopSpeaking();
    }

    const sanitized = this.sanitizeTextForSpeech(text);
    if (!sanitized) {
      if (onEnd) onEnd();
      return null;
    }

    try {
      const UtteranceClass =
        typeof SpeechSynthesisUtterance !== 'undefined'
          ? SpeechSynthesisUtterance
          : typeof window !== 'undefined'
          ? window.SpeechSynthesisUtterance
          : null;

      if (!UtteranceClass) {
        if (onEnd) onEnd();
        return null;
      }

      this._utteranceCounter += 1;
      const utteranceId = `utt-${this._utteranceCounter}-${Date.now()}`;

      const utterance = new UtteranceClass(sanitized);
      // Default rate and pitch tuned for Amy Louise Pemberton's articulate, crisp British Gideon delivery
      const effectiveRate = Math.max(0.7, Math.min(rate || 1.02, 1.8));
      const effectivePitch = Math.max(0.8, Math.min(pitch || 1.06, 1.4));
      utterance.rate = effectiveRate;
      utterance.pitch = effectivePitch;

      // Select voice: user-specified, or automatic Amy Louise Pemberton British female voice
      const voices = this.getVoices();
      let chosenVoice = null;
      if (voiceURI) {
        chosenVoice = voices.find((v) => v.voiceURI === voiceURI);
      }
      if (!chosenVoice) {
        chosenVoice = this.findBestGideonVoice(voices);
      }
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      const locale = chosenVoice?.lang || 'en-GB';

      // Prepare the viseme timeline for this utterance
      const timeline = this.lipsync.prepare(sanitized, {
        utteranceId,
        rate: effectiveRate,
        locale,
        alignment,
      });

      this.currentUtteranceId = utteranceId;
      this.currentUtterance = utterance;
      this.visemeTimeline = timeline;
      this.isSpeaking = true;

      // Start timeline clock immediately; re-anchor on actual browser `onstart`
      const initialNow = this._now();
      this.lipsync.start(utteranceId, initialNow);
      const initialSample = this.sampleSpeechState(initialNow);

      let hasEmittedStart = false;
      const emitStartOnce = () => {
        if (this.currentUtteranceId !== utteranceId) return;
        this.isSpeaking = true;
        this.currentUtterance = utterance;
        this.lipsync.start(utteranceId, this._now());
        this._startSpeechTicker(utteranceId, onVisemeChange);
        this._notifySpeech({
          speechStart: true,
          speechEnd: false,
          speechCancelled: false,
        });
        if (!hasEmittedStart) {
          hasEmittedStart = true;
          if (onStart) onStart({ utteranceId, timeline });
        }
        if (onVisemeChange) {
          onVisemeChange(initialSample);
        }
      };

      utterance.onstart = () => {
        emitStartOnce();
      };

      utterance.onboundary = (event) => {
        // Ignore stale events from earlier utterances
        if (this.currentUtteranceId !== utteranceId || !this.isSpeaking) return;
        if (event && typeof event.charIndex === 'number') {
          this.lipsync.onWordBoundary(utteranceId, event.charIndex, this._now());
          const updated = this.sampleSpeechState(this._now());
          this._notifySpeech({ wordBoundary: event.charIndex });
          if (onVisemeChange) onVisemeChange(updated);
          if (onBoundary) onBoundary(event, updated);
        }
      };

      utterance.onpause = () => {
        if (this.currentUtteranceId !== utteranceId) return;
        this.lipsync.pause(utteranceId, this._now());
        this.currentViseme = VISEME_CODES.REST;
        this.currentVisemePose = getVisemePose(VISEME_CODES.REST);
        this.speechLevel = 0;
        this.speechPulse = 0;
        this._notifySpeech({ speechPaused: true });
      };

      utterance.onresume = () => {
        if (this.currentUtteranceId !== utteranceId) return;
        this.lipsync.resume(utteranceId, this._now());
        this._notifySpeech({ speechPaused: false });
      };

      const finishUtterance = () => {
        // Remove from active utterance Set to allow clean garbage collection once finished
        this.activeUtterances.delete(utterance);
        if (this.activeUtterances.size === 0) {
          this._stopSpeechKeepAlive();
        }

        // Guard against stale events from replaced/cancelled utterances
        if (this.currentUtteranceId !== utteranceId) return;
        this._stopSpeechTicker();
        this.lipsync.stop(utteranceId);
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.currentUtteranceId = null;
        this.currentViseme = VISEME_CODES.REST;
        this.currentVisemePose = getVisemePose(VISEME_CODES.REST);
        this.speechLevel = 0;
        this.speechPulse = 0;
        this.visemeTimeline = null;
        this._notifySpeech({
          speechStart: false,
          speechEnd: true,
          speechCancelled: false,
        });
        if (typeof window !== 'undefined') {
          window._gideonActiveUtterance = null;
        }
        if (onVisemeChange) {
          onVisemeChange(this.getSpeechState());
        }
        if (onEnd) onEnd();
      };

      utterance.onend = () => {
        finishUtterance();
      };

      utterance.onerror = (e) => {
        this.activeUtterances.delete(utterance);
        if (this.activeUtterances.size === 0) {
          this._stopSpeechKeepAlive();
        }
        if (this.currentUtteranceId !== utteranceId) return;
        const errCode = e?.error || 'unknown';
        if (errCode !== 'canceled' && errCode !== 'interrupted') {
          if (onError) onError(`Speech synthesis error: ${errCode}`);
        }
        finishUtterance();
      };

      // Ensure browser audio synthesis isn't suspended (common Chromium idle state)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Maintain strong Set reference to prevent Chromium V8 garbage collector premature cutoff bug
      this.activeUtterances.add(utterance);
      if (typeof window !== 'undefined') {
        window._gideonActiveUtterance = utterance;
      }

      this._startSpeechKeepAlive();
      window.speechSynthesis.speak(utterance);

      return { utteranceId, timeline };
    } catch (err) {
      this._stopSpeechTicker();
      this.lipsync.stop();
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentUtteranceId = null;
      this.currentViseme = VISEME_CODES.REST;
      this.currentVisemePose = getVisemePose(VISEME_CODES.REST);
      this.speechLevel = 0;
      this.speechPulse = 0;
      this.visemeTimeline = null;
      if (onError) onError(`Speech failure: ${err.message}`);
      if (onEnd) onEnd();
      return null;
    }
  }

  /**
   * Internal ticker that advances viseme state and notifies subscribers on viseme/level transitions
   * while speech is active. Automatically stops when speech ends or is cancelled.
   */
  _startSpeechTicker(utteranceId, onVisemeChange) {
    this._stopSpeechTicker();
    let lastEmittedViseme = null;
    let lastNotifyTime = 0;

    const tick = () => {
      if (!this.isSpeaking || this.currentUtteranceId !== utteranceId) {
        this._stopSpeechTicker();
        return;
      }

      const now = this._now();
      const sampled = this.sampleSpeechState(now);

      // Emit updates when viseme changes or every ~45ms for smooth telemetry
      if (sampled.viseme !== lastEmittedViseme || now - lastNotifyTime >= 45) {
        lastEmittedViseme = sampled.viseme;
        lastNotifyTime = now;
        this._notifySpeech();
        if (onVisemeChange) {
          onVisemeChange(sampled);
        }
      }

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this.speechTickerId = window.requestAnimationFrame(tick);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this.speechTickerId = window.requestAnimationFrame(tick);
    }
  }

  _stopSpeechTicker() {
    if (this.speechTickerId !== null) {
      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this.speechTickerId);
      }
      this.speechTickerId = null;
    }
  }

  /**
   * Immediate speech interruption.
   * Cancels all pending viseme cues, stops particle energy injection, and prevents stale utterance events.
   */
  stopSpeaking() {
    const wasSpeaking = this.isSpeaking || this.currentUtteranceId !== null;
    this._stopSpeechKeepAlive();
    this.activeUtterances.clear();
    this._stopSpeechTicker();
    this.lipsync.stop();
    this.currentUtteranceId = null;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.currentViseme = VISEME_CODES.REST;
    this.currentVisemePose = getVisemePose(VISEME_CODES.REST);
    this.speechLevel = 0;
    this.speechPulse = 0;
    this.visemeTimeline = null;

    if (this.isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }

    if (wasSpeaking) {
      this._notifySpeech({
        speechStart: false,
        speechEnd: true,
        speechCancelled: true,
      });
    }
  }

  /**
   * Strip system metadata tags, code blocks, Markdown headers, links, and technical characters
   * so Gideon speaks natural, fluent sentences.
   */
  sanitizeTextForSpeech(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      // Remove system tags and brackets like [Gideon Demo Mode]: or [LOCAL_PC_EVIDENCE]:
      .replace(/\[.*?\]:?/gi, '')
      // Remove multi-line code blocks
      .replace(/```[\s\S]*?```/g, ' [Code excerpt omitted] ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/gi, 'link')
      // Remove Markdown headers (#, ##, etc.)
      .replace(/#{1,6}\s*/g, '')
      // Remove Markdown bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, '')
      // Remove excess whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Start silent background audio keep-alive loop.
   * Keeps Chromium from throttling background timers or suspending wake-word STT
   * when another application (e.g. Spotify, Chrome, VS Code) takes foreground focus.
   */
  _startBackgroundAudioKeepAlive() {
    if (!this.audioContext || this._bgKeepAliveNode) return;
    try {
      const osc = this.audioContext.createOscillator();
      const silentGain = this.audioContext.createGain();
      silentGain.gain.setValueAtTime(0.000001, this.audioContext.currentTime); // Inaudible
      osc.connect(silentGain);
      silentGain.connect(this.audioContext.destination);
      osc.start();
      this._bgKeepAliveNode = osc;
    } catch {}
  }

  handleMicDisconnected() {
    console.warn('Microphone input track ended. Attempting automatic fallback...');
    this._stopAudioAnalysis();
    if (this.isListening) {
      setTimeout(() => {
        this._startAudioAnalysis(this.onAudioLevelCallback, '').catch(() => {});
      }, 500);
    }
  }

  /**
   * Private: Web Audio API microphone stream volume meter (strictly for user STT listening state).
   * Incorporates hardware-level DSP constraints (autoGainControl, echoCancellation, noiseSuppression)
   * and Web Audio GainNode boost (1.8x) for high-sensitivity distant speech recognition from across the desk.
   */
  async _startAudioAnalysis(onAudioLevel, deviceId = '') {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Enhanced WebRTC constraints for distant speech & desk-level acoustic pickup
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          latency: 0,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Handle track ended (e.g. bluetooth headset disconnected)
      const tracks = this.audioStream.getAudioTracks();
      if (tracks && tracks.length > 0) {
        tracks[0].onended = () => {
          this.handleMicDisconnected();
        };
      }

      const source = this.audioContext.createMediaStreamSource(this.audioStream);

      // Hardware/DSP Gain boost node (1.8x) for distant desk voice detection
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(1.8, this.audioContext.currentTime);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;

      source.connect(gainNode);
      gainNode.connect(this.analyser);

      // Start silent background audio keep-alive
      this._startBackgroundAudioKeepAlive();

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || !this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(1.0, (average / 110) * 1.5); // boosted normalized level
        if (onAudioLevel) onAudioLevel(normalized);
        this.audioAnimId = requestAnimationFrame(checkVolume);
      };
      this.audioAnimId = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn('Microphone stream initialisation notice:', err);
    }
  }

  _stopAudioAnalysis() {
    if (this._bgKeepAliveNode) {
      try {
        this._bgKeepAliveNode.stop();
        this._bgKeepAliveNode.disconnect();
      } catch {}
      this._bgKeepAliveNode = null;
    }
    if (this.audioAnimId) {
      cancelAnimationFrame(this.audioAnimId);
      this.audioAnimId = null;
    }
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.audioStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.onAudioLevelCallback) {
      this.onAudioLevelCallback(0);
    }
  }

  getDiagnostics() {
    return {
      isSpeechRecognitionSupported: this.isSpeechRecognitionSupported(),
      isSpeechSynthesisSupported: this.isSpeechSynthesisSupported(),
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      hasAnalyser: !!this.analyser,
      voicesCount: this.getVoices().length,
      currentUtteranceId: this.currentUtteranceId,
      currentViseme: this.currentViseme,
      speechLevel: this.speechLevel,
    };
  }
}

export const voiceService = new VoiceService();
export default voiceService;
