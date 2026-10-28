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

  isSpeechRecognitionSupported() {
    return (
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
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
   */
  async startListening({ onInterim, onFinal, onError, onStateChange, onAudioLevel } = {}) {
    if (!this.isSpeechRecognitionSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
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

    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.onAudioLevelCallback = onAudioLevel;

    let finalTranscript = '';
    let hasEmittedFinal = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStateChange) onStateChange(true);
      this._startAudioAnalysis(onAudioLevel).catch(() => {
        // Audio analysis is optional enhancement; recognition continues if mic stream fails
      });
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (onInterim && interim) {
        onInterim(interim);
      }

      if (finalTranscript.trim() && !hasEmittedFinal) {
        hasEmittedFinal = true;
        if (onFinal) onFinal(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      const errorType = event.error || 'unknown';
      if (errorType === 'no-speech') {
        // Handled as graceful non-fatal
        return;
      }
      let userFriendlyMessage = `Speech recognition error: ${errorType}`;
      if (errorType === 'not-allowed' || errorType === 'permission-denied') {
        userFriendlyMessage = 'Microphone access denied. Please allow microphone permissions.';
      } else if (errorType === 'network') {
        userFriendlyMessage = 'Network error during speech recognition.';
      }
      if (onError) onError(userFriendlyMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this._stopAudioAnalysis();
      if (onStateChange) onStateChange(false);
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      this.isListening = false;
      this._stopAudioAnalysis();
      if (onError) onError(`Could not start microphone: ${err.message}`);
      return false;
    }
  }

  /**
   * Stop recognition session and release mic resources.
   */
  stopListening() {
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
   * Speak response text via window.speechSynthesis and synchronize the viseme timeline.
   */
  speak(
    text,
    {
      voiceURI,
      rate = 1.0,
      pitch = 1.0,
      alignment = null,
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

    // Cancel any existing speech and invalidate prior utterance IDs first
    this.stopSpeaking();

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
        if (onVisemeChange) {
          onVisemeChange(this.getSpeechState());
        }
        if (onEnd) onEnd();
      };

      utterance.onend = () => {
        finishUtterance();
      };

      utterance.onerror = (e) => {
        if (this.currentUtteranceId !== utteranceId) return;
        const errCode = e?.error || 'unknown';
        if (errCode !== 'canceled' && errCode !== 'interrupted') {
          if (onError) onError(`Speech synthesis error: ${errCode}`);
        }
        finishUtterance();
      };

      // Emit initial start before calling speak() in case browser delays `onstart`,
      // while `emitStartOnce` prevents duplicate `onStart` calls when `speak()` triggers synchronously.
      emitStartOnce();
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
   * Strip code blocks, Markdown headers, links, and technical characters
   * so Gideon speaks natural, fluent sentences.
   */
  sanitizeTextForSpeech(text) {
    if (!text || typeof text !== 'string') return '';
    return text
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
   * Private: Web Audio API microphone stream volume meter (strictly for user STT listening state).
   */
  async _startAudioAnalysis(onAudioLevel) {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

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
        const normalized = Math.min(1.0, average / 128); // 0.0 to 1.0
        if (onAudioLevel) onAudioLevel(normalized);
        this.audioAnimId = requestAnimationFrame(checkVolume);
      };
      this.audioAnimId = requestAnimationFrame(checkVolume);
    } catch {
      // Audio stream or permission unavailable; fallback gracefully
    }
  }

  _stopAudioAnalysis() {
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
}

export const voiceService = new VoiceService();
export default voiceService;
