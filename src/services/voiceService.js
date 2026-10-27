/**
 * Modular Voice Service for Gideon.
 * Encapsulates Web Speech API SpeechRecognition (STT), SpeechSynthesis (TTS),
 * and Web Audio API microphone volume analysis.
 */

class VoiceService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.audioContext = null;
    this.analyser = null;
    this.audioStream = null;
    this.audioAnimId = null;
    this.currentUtterance = null;
    this.onAudioLevelCallback = null;
  }

  isSpeechRecognitionSupported() {
    return typeof window !== 'undefined' && 
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  isSpeechSynthesisSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getVoices() {
    if (!this.isSpeechSynthesisSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  /**
   * Start push-to-talk / voice recognition session.
   */
  async startListening({ onInterim, onFinal, onError, onStateChange, onAudioLevel }) {
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
   * Speak response text via window.speechSynthesis.
   */
  speak(text, { voiceURI, rate = 1.0, pitch = 1.0, onStart, onEnd, onError } = {}) {
    if (!this.isSpeechSynthesisSupported()) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel existing speech first
    this.stopSpeaking();

    const sanitized = this.sanitizeTextForSpeech(text);
    if (!sanitized) {
      if (onEnd) onEnd();
      return;
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
        return;
      }

      const utterance = new UtteranceClass(sanitized);
      utterance.rate = Math.max(0.7, Math.min(rate || 1.0, 1.8));
      utterance.pitch = Math.max(0.8, Math.min(pitch || 1.0, 1.4));

      // Select voice if specified
      if (voiceURI) {
        const voices = this.getVoices();
        const selected = voices.find((v) => v.voiceURI === voiceURI);
        if (selected) {
          utterance.voice = selected;
        }
      }

      this.isSpeaking = true;
      this.currentUtterance = utterance;
      if (onStart) onStart();

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          if (onError) onError(`Speech synthesis error: ${e.error}`);
        }
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isSpeaking = false;
      if (onError) onError(`Speech failure: ${err.message}`);
      if (onEnd) onEnd();
    }
  }

  /**
   * Immediate speech interruption.
   */
  stopSpeaking() {
    if (this.isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
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
   * Private: Web Audio API microphone stream volume meter.
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
