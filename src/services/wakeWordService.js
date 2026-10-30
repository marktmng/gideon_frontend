/**
 * Modular Local-First Wake Word Service for Gideon (Phase 5).
 * Enables hands-free activation using "Hey Gideon" (default) or "Gideon" (optional alternative).
 *
 * Engine Architecture & Lifecycle:
 * - Local-first Continuous Speech & Acoustic Engine (zero external AI keys, zero cloud costs).
 * - Automatic startup with graceful browser microphone permission prompting.
 * - Single-breath utterance extraction ("Hey Gideon, what is open on my screen?").
 * - Two-step conversational turns ("Hey Gideon" -> chime -> captures command on same continuous stream).
 * - Pure local Web Audio API synthesized chime (C5 523Hz -> E5 659Hz).
 * - Acoustic loopback prevention: filters out self-speech while Gideon speaks.
 * - Vocal interruption detection: reacts immediately to "stop", "halt", "cancel", "stop talking".
 * - Watchdog auto-restart: keeps standby listening alive across browser silence timeouts.
 */

export const WAKE_PHRASE_OPTIONS = {
  HEY_GIDEON: 'hey_gideon',
  GIDEON: 'gideon',
  BOTH: 'both',
};

export const WAKE_WORD_STATES = {
  DISABLED: 'disabled',
  PERMISSION_NEEDED: 'permission_needed',
  STANDBY: 'standby',
  WAKE_DETECTED: 'wake_detected',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  INTERRUPTED: 'interrupted',
  MIC_UNAVAILABLE: 'mic_unavailable',
  ERROR: 'error',
};

export const VOCAL_INTERRUPT_KEYWORDS = [
  'stop',
  'halt',
  'cancel',
  'quiet',
  'be quiet',
  'shut up',
  'stop talking',
  'pause',
  'abort',
];

export class WakeWordService {
  constructor() {
    this.recognition = null;
    this.isActive = false;
    this.isStandby = false;
    this.state = WAKE_WORD_STATES.DISABLED;

    this.selectedPhrase = WAKE_PHRASE_OPTIONS.HEY_GIDEON;
    this.audioCueEnabled = true;
    this.selectedDeviceId = '';
    this.isSpeaking = false;

    // Two-step turn capture state
    this.isCapturingCommand = false;
    this.commandTranscript = '';
    this.accumulatedFinal = '';
    this.currentInterim = '';
    this.commandTimer = null;

    this.watchdogTimer = null;
    this.rearmAttempts = 0;
    this.maxRearmAttempts = 30;

    // Callbacks
    this.onWakeWordDetected = null;
    this.onCommandExtracted = null;
    this.onInterim = null;
    this.onInterruption = null;
    this.onStateChange = null;
    this.onError = null;

    // Web Audio Context for synthesized chime
    this.audioContext = null;
  }

  isSupported() {
    return (
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  /**
   * Set configuration options.
   */
  configure({
    phrase = WAKE_PHRASE_OPTIONS.HEY_GIDEON,
    audioCueEnabled = true,
    selectedDeviceId = '',
    onWakeWordDetected = null,
    onCommandExtracted = null,
    onInterim = null,
    onInterruption = null,
    onStateChange = null,
    onError = null,
  } = {}) {
    this.selectedPhrase = phrase;
    this.audioCueEnabled = audioCueEnabled;
    this.selectedDeviceId = selectedDeviceId;

    if (onWakeWordDetected) this.onWakeWordDetected = onWakeWordDetected;
    if (onCommandExtracted) this.onCommandExtracted = onCommandExtracted;
    if (onInterim !== undefined) this.onInterim = onInterim;
    if (onInterruption) this.onInterruption = onInterruption;
    if (onStateChange) this.onStateChange = onStateChange;
    if (onError) this.onError = onError;
  }

  _setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  /**
   * Test whether a transcript starts with or contains the configured wake phrase.
   * Returns: { matched: boolean, phrase: string, command: string }
   */
  matchWakePhrase(text) {
    if (!text || typeof text !== 'string') {
      return { matched: false, phrase: '', command: '' };
    }

    const clean = text.trim();
    let regex = null;

    switch (this.selectedPhrase) {
      case WAKE_PHRASE_OPTIONS.GIDEON:
        // Match "Gideon" or "Gideon," at the start
        regex = /^(?:gideon|gidean|gedion|gideon's)[,\s]*(.*)$/i;
        break;
      case WAKE_PHRASE_OPTIONS.BOTH:
        // Match either "Hey Gideon" or "Gideon"
        regex = /^(?:hey\s+|hello\s+|hi\s+|ok\s+|ay\s+)?(?:gideon|gidean|gedion|gideon's)[,\s]*(.*)$/i;
        break;
      case WAKE_PHRASE_OPTIONS.HEY_GIDEON:
      default:
        // Match "Hey Gideon", "Hello Gideon", "Ay Gideon", "Hi Gideon", "OK Gideon"
        regex = /^(?:hey|hello|hi|ok|ay)\s+(?:gideon|gidean|gedion|gideon's)[,\s]*(.*)$/i;
        break;
    }

    const match = clean.match(regex);
    if (match) {
      const phrase = clean.substring(0, clean.length - (match[1]?.length || 0)).trim();
      const command = (match[1] || '').trim();
      return {
        matched: true,
        phrase: phrase || (this.selectedPhrase === WAKE_PHRASE_OPTIONS.GIDEON ? 'Gideon' : 'Hey Gideon'),
        command,
      };
    }

    return { matched: false, phrase: '', command: '' };
  }

  /**
   * Check if transcript contains any vocal interrupt keyword.
   */
  matchesInterruptKeyword(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase().trim();
    return VOCAL_INTERRUPT_KEYWORDS.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lower);
    });
  }

  /**
   * Native synthesized 2-tone chime using Web Audio API (C5 523Hz -> E5 659Hz).
   * Fully offline, zero external sound files, ultra-low latency.
   */
  async playWakeChime() {
    if (!this.audioCueEnabled || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Tone 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.001, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.24, now + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);

      this._ensureBackgroundKeepAlive();
    } catch (err) {
      console.warn('Could not play wake chime:', err);
    }
  }

  /**
   * Continuous silent audio keep-alive to ensure Chromium treats the tab as an active audio producer.
   * Prevents browser throttling of background wake-word listening when other apps (Spotify, Chrome) are focused.
   */
  _ensureBackgroundKeepAlive() {
    if (!this.audioContext || this._bgKeepAlive) return;
    try {
      const osc = this.audioContext.createOscillator();
      const silentGain = this.audioContext.createGain();
      silentGain.gain.setValueAtTime(0.000001, this.audioContext.currentTime);
      osc.connect(silentGain);
      silentGain.connect(this.audioContext.destination);
      osc.start();
      this._bgKeepAlive = osc;
    } catch {}
  }

  /**
   * Start hands-free wake word standby listening with microphone permission verification.
   */
  startStandby() {
    if (!this.isSupported()) {
      this._setState(WAKE_WORD_STATES.MIC_UNAVAILABLE);
      if (this.onError) {
        this.onError('Speech recognition not supported in this browser.');
      }
      return false;
    }

    this.stopStandby();
    this.isActive = true;
    this.isStandby = true;
    this.isCapturingCommand = false;
    this.commandTranscript = '';
    this.accumulatedFinal = '';
    this.currentInterim = '';
    this.rearmAttempts = 0;
    this._setState(WAKE_WORD_STATES.STANDBY);

    // Non-blocking microphone permission check if supported
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' })
        .then((perm) => {
          if (!this.isActive) return;
          if (perm.state === 'prompt') {
            this._setState(WAKE_WORD_STATES.PERMISSION_NEEDED);
          } else if (perm.state === 'denied') {
            this.isActive = false;
            this.isStandby = false;
            this._setState(WAKE_WORD_STATES.MIC_UNAVAILABLE);
          }
        })
        .catch(() => {});
    }

    return this._initRecognition();
  }

  _initRecognition() {
    if (!this.isActive) return false;

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
    } catch (err) {
      this._setState(WAKE_WORD_STATES.ERROR);
      if (this.onError) this.onError('Failed to initialize speech recognition engine.');
      return false;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.rearmAttempts = 0;
      if (this.isCapturingCommand) {
        this._setState(WAKE_WORD_STATES.LISTENING);
      } else {
        this._setState(WAKE_WORD_STATES.STANDBY);
      }
    };

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcript = item[0]?.transcript || '';

        // Case 1: Gideon is speaking aloud -> listen exclusively for vocal interruption keywords
        if (this.isSpeaking) {
          if (this.matchesInterruptKeyword(transcript)) {
            this._setState(WAKE_WORD_STATES.INTERRUPTED);
            if (this.onInterruption) {
              this.onInterruption();
            }
            return;
          }
          continue;
        }

        // Case 2: In command capture mode (after wake word was recognized)
        if (this.isCapturingCommand) {
          let hasFinal = false;
          for (let r = event.resultIndex; r < event.results.length; ++r) {
            const item = event.results[r];
            const text = (item[0]?.transcript || '').trim();
            if (!text) continue;
            if (item.isFinal) {
              hasFinal = true;
              this.accumulatedFinal = (this.accumulatedFinal ? this.accumulatedFinal + ' ' : '') + text;
              this.currentInterim = '';
            } else {
              this.currentInterim = text;
            }
          }

          const fullTranscript = (this.accumulatedFinal + ' ' + this.currentInterim).trim();
          if (fullTranscript) {
            this.commandTranscript = fullTranscript;
            if (this.onInterim) {
              this.onInterim(this.commandTranscript);
            }
          }

          if (this.commandTimer) {
            clearTimeout(this.commandTimer);
          }

          if (hasFinal) {
            // User finished speaking this phrase; commit immediately within 60ms
            this.commandTimer = setTimeout(() => {
              this._finishCommandCapture();
            }, 60);
          } else {
            // Natural brief pause detection for interim speech (450ms)
            this.commandTimer = setTimeout(() => {
              this._finishCommandCapture();
            }, 450);
          }
          continue;
        }

        // Case 3: In standby mode -> listen for wake word
        const match = this.matchWakePhrase(transcript);
        if (match.matched) {
          this.playWakeChime();

          if (match.command && match.command.length > 0) {
            // Single-breath command captured: e.g. "Hey Gideon, open calculator"
            this._setState(WAKE_WORD_STATES.PROCESSING);
            if (this.onCommandExtracted) {
              this.onCommandExtracted(match.command);
            }
          } else {
            // Wake word alone ("Hey Gideon"):
            // Dispatch wake detection so Gideon responds aloud immediately!
            this.isCapturingCommand = false;
            this._setState(WAKE_WORD_STATES.WAKE_DETECTED);
            if (this.onWakeWordDetected) {
              this.onWakeWordDetected(match.phrase);
            }
          }
          return;
        }
      }
    };

    this.recognition.onerror = (event) => {
      const err = event.error;
      if (err === 'no-speech') {
        if (this.isCapturingCommand && !this.commandTranscript) {
          this.isCapturingCommand = false;
          this._setState(WAKE_WORD_STATES.STANDBY);
        }
        return;
      }
      if (err === 'not-allowed' || err === 'permission-denied') {
        this.isActive = false;
        this.isStandby = false;
        this._setState(WAKE_WORD_STATES.MIC_UNAVAILABLE);
        if (this.onError) {
          this.onError('Microphone permission denied for wake word activation.');
        }
        return;
      }
      if (err === 'network') {
        return;
      }
    };

    this.recognition.onend = () => {
      // Browser speech engines automatically terminate after silence.
      // Auto-rearm watchdog keeps standby alive seamlessly.
      if (this.isActive && this.isStandby) {
        this._scheduleRearm();
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      this._scheduleRearm();
      return false;
    }
  }

  _finishCommandCapture() {
    if (!this.isCapturingCommand) return;
    this.isCapturingCommand = false;
    if (this.commandTimer) {
      clearTimeout(this.commandTimer);
      this.commandTimer = null;
    }

    let command = this.commandTranscript.trim();
    this.commandTranscript = '';
    this.accumulatedFinal = '';
    this.currentInterim = '';
    if (this.onInterim) {
      this.onInterim('');
    }

    // Strip redundant wake phrase if user repeated it during capture
    const match = this.matchWakePhrase(command);
    if (match.matched && match.command) {
      command = match.command;
    }

    if (command) {
      this._setState(WAKE_WORD_STATES.PROCESSING);
      if (this.onCommandExtracted) {
        this.onCommandExtracted(command);
      }
    } else {
      this._setState(WAKE_WORD_STATES.STANDBY);
    }
  }

  _scheduleRearm() {
    if (!this.isActive || !this.isStandby) return;

    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }

    this.rearmAttempts++;
    if (this.rearmAttempts > this.maxRearmAttempts) {
      this.watchdogTimer = setTimeout(() => {
        this.rearmAttempts = 0;
        this._initRecognition();
      }, 2000);
      return;
    }

    this.watchdogTimer = setTimeout(() => {
      this._initRecognition();
    }, 100);
  }

  /**
   * Temporarily suspend wake standby while Gideon is processing.
   */
  pauseStandby() {
    this.isStandby = false;
    this.isCapturingCommand = false;
    if (this.commandTimer) {
      clearTimeout(this.commandTimer);
      this.commandTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }

  /**
   * Manually trigger command capture on the active standby stream without restarting speech recognition.
   * Plays the wake chime and immediately listens for the user's directive.
   */
  triggerManualCapture() {
    if (!this.isActive || !this.recognition) {
      this.startStandby();
    }

    this.playWakeChime();
    this.isCapturingCommand = true;
    this.commandTranscript = '';
    this.accumulatedFinal = '';
    this.currentInterim = '';
    if (this.onInterim) {
      this.onInterim('');
    }
    this._setState(WAKE_WORD_STATES.LISTENING);
    if (this.commandTimer) clearTimeout(this.commandTimer);
    this.commandTimer = setTimeout(() => {
      if (this.isCapturingCommand && !this.commandTranscript) {
        this.isCapturingCommand = false;
        this._setState(WAKE_WORD_STATES.STANDBY);
      }
    }, 7000);
    return true;
  }

  /**
   * Immediately commit whatever was spoken during manual command capture.
   */
  commitManualCapture() {
    if (this.isCapturingCommand) {
      this._finishCommandCapture();
      return true;
    }
    return false;
  }

  /**
   * Resume standby listening after response playback completes.
   */
  resumeStandby() {
    if (!this.isActive) return;
    this.isStandby = true;
    this.isCapturingCommand = false;
    this.commandTranscript = '';
    this._initRecognition();
  }

  /**
   * Inform wake service whether Gideon is speaking aloud (for loopback prevention).
   */
  setSpeakingState(speaking) {
    this.isSpeaking = !!speaking;
    if (speaking) {
      this.isCapturingCommand = false;
      if (this.commandTimer) {
        clearTimeout(this.commandTimer);
        this.commandTimer = null;
      }
    }
  }

  /**
   * Completely stop wake-word service and release microphone resources.
   */
  stopStandby() {
    this.isActive = false;
    this.isStandby = false;
    this.isCapturingCommand = false;
    if (this.commandTimer) {
      clearTimeout(this.commandTimer);
      this.commandTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this._setState(WAKE_WORD_STATES.DISABLED);
  }

  getDiagnostics() {
    return {
      isSupported: this.isSupported(),
      isActive: this.isActive,
      isStandby: this.isStandby,
      isCapturingCommand: this.isCapturingCommand,
      isSpeaking: this.isSpeaking,
      state: this.state,
      selectedPhrase: this.selectedPhrase,
      audioCueEnabled: this.audioCueEnabled,
      rearmAttempts: this.rearmAttempts,
      hasRecognition: !!this.recognition,
    };
  }
}

export const wakeWordService = new WakeWordService();
export default wakeWordService;
