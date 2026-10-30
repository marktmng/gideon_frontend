/**
 * Streaming Speech Queue for Gideon (Phase 5).
 * Enables concurrent text generation and real-time speech synthesis.
 *
 * Instead of waiting for the full LLM response to complete, this queue:
 * - Incrementally tokenizes incoming LLM stream deltas at sentence boundaries (. ! ? \n).
 * - Speaks each sentence sequentially in strict chronological FIFO order via Web Speech API.
 * - Prevents overlapping audio, missed sentences, or duplicate playback.
 * - Synchronizes with the 3D lipsync viseme timeline for each sentence.
 * - Supports immediate interruption (vocal "Stop talking" or manual stop button).
 */

import voiceService from './voiceService';

export class StreamingSpeechQueue {
  constructor() {
    this.queue = [];
    this.buffer = '';
    this.isSpeaking = false;
    this.isStreamFinished = false;
    this.currentSentence = null;
    this.spokenCount = 0;

    // Callbacks
    this.onSentenceStart = null;
    this.onSentenceEnd = null;
    this.onQueueComplete = null;
    this.onInterrupt = null;

    // Voice options
    this.voiceOptions = {};
  }

  setVoiceOptions(options = {}) {
    this.voiceOptions = { ...this.voiceOptions, ...options };
  }

  setCallbacks({ onSentenceStart, onSentenceEnd, onQueueComplete, onInterrupt } = {}) {
    if (onSentenceStart) this.onSentenceStart = onSentenceStart;
    if (onSentenceEnd) this.onSentenceEnd = onSentenceEnd;
    if (onQueueComplete) this.onQueueComplete = onQueueComplete;
    if (onInterrupt) this.onInterrupt = onInterrupt;
  }

  getCurrentSentence() {
    return this.currentSentence;
  }

  /**
   * Reset the queue state for a new streaming message.
   */
  startStream(voiceOptions = {}) {
    this.cancel();
    this.voiceOptions = voiceOptions;
    this.buffer = '';
    this.isSpeaking = false;
    this.isStreamFinished = false;
    this.currentSentence = null;
    this.spokenCount = 0;
  }

  /**
   * Ingest an incremental delta token from the AI stream.
   * Splits at valid sentence boundaries and enqueues complete sentences.
   */
  feedDelta(delta) {
    if (!delta || typeof delta !== 'string') return;
    this.buffer += delta;

    this._extractAndEnqueueSentences();
  }

  /**
   * Scan buffer for punctuation delimiters (. ! ? \n :) and natural pause boundaries.
   * Extracts completed sentences or early speech clauses so TTS starts in real time.
   */
  _extractAndEnqueueSentences() {
    // 1. Primary sentence terminators: (. ! ? \n)
    const sentenceRegex = /([.!?\n])\s+/g;
    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(this.buffer)) !== null) {
      const boundaryIndex = match.index + 1; // include delimiter
      const candidate = this.buffer.substring(lastIndex, boundaryIndex).trim();

      // Lower threshold to 4 characters so short phrases ("Yes.", "Sure.", "Hello.") speak immediately
      if (candidate.length >= 4 && !this._isAbbreviation(candidate)) {
        this.queue.push(candidate);
        this.spokenCount++;
        this.buffer = this.buffer.substring(boundaryIndex).trimStart();
        sentenceRegex.lastIndex = 0;
        lastIndex = 0;
        this._processNext();
      }
    }

    // 2. Early clause extraction for longer un-terminated streaming chunks:
    // If the buffer has accumulated >= 7 words or >= 45 characters and has a comma, semicolon, or colon
    if (this.buffer.length >= 45 && !this.isSpeaking && this.queue.length === 0) {
      const clauseMatch = /([,;:—])\s+/g.exec(this.buffer);
      if (clauseMatch && clauseMatch.index >= 20) {
        const boundaryIndex = clauseMatch.index + 1;
        const candidate = this.buffer.substring(0, boundaryIndex).trim();
        if (candidate.length >= 15 && !this._isAbbreviation(candidate)) {
          this.queue.push(candidate);
          this.spokenCount++;
          this.buffer = this.buffer.substring(boundaryIndex).trimStart();
          this._processNext();
        }
      }
    }
  }

  _isAbbreviation(text) {
    const lower = text.toLowerCase();
    return (
      lower.endsWith('mr.') ||
      lower.endsWith('mrs.') ||
      lower.endsWith('dr.') ||
      lower.endsWith('ms.') ||
      lower.endsWith('e.g.') ||
      lower.endsWith('i.e.') ||
      lower.endsWith('vs.') ||
      /\d+\.$/.test(text)
    );
  }

  /**
   * Called when AI stream completes (onComplete).
   * Flushes any remaining trailing text in buffer to the speech queue.
   */
  finishStream(fallbackContent = '') {
    this.isStreamFinished = true;
    let remaining = this.buffer.trim();
    this.buffer = '';

    // If buffer was empty and no sentence was spoken yet, use complete message fallback
    if (!remaining && fallbackContent && !this.isSpeaking && this.queue.length === 0 && this.spokenCount === 0) {
      remaining = typeof fallbackContent === 'string' ? fallbackContent.trim() : '';
    }

    if (remaining.length > 0) {
      this.queue.push(remaining);
      this.spokenCount++;
    }

    this._processNext();

    // If queue is already empty, immediately signal completion
    if (!this.isSpeaking && this.queue.length === 0) {
      this.currentSentence = null;
      if (this.onQueueComplete) {
        this.onQueueComplete();
      }
    }
  }

  /**
   * Process next sentence in FIFO speech queue.
   */
  _processNext() {
    if (this.isSpeaking) return;
    if (this.queue.length === 0) {
      this.currentSentence = null;
      if (this.isStreamFinished) {
        if (this.onQueueComplete) {
          this.onQueueComplete();
        }
      }
      return;
    }

    const nextSentence = this.queue.shift();
    if (!nextSentence || !nextSentence.trim()) {
      this._processNext();
      return;
    }

    this.isSpeaking = true;
    this.currentSentence = nextSentence;
    if (this.onSentenceStart) {
      this.onSentenceStart(nextSentence);
    }

    voiceService.speak(nextSentence, {
      ...this.voiceOptions,
      queueMode: true,
      onStart: (startInfo) => {
        if (this.voiceOptions.onStart) {
          this.voiceOptions.onStart(startInfo);
        }
      },
      onEnd: () => {
        this.isSpeaking = false;
        this.currentSentence = null;
        if (this.onSentenceEnd) {
          this.onSentenceEnd(nextSentence);
        }
        if (this.voiceOptions.onEnd) {
          this.voiceOptions.onEnd();
        }
        this._processNext();
      },
      onError: (err) => {
        console.warn('Sentence synthesis notice:', err);
        this.isSpeaking = false;
        this.currentSentence = null;
        if (this.onSentenceEnd) {
          this.onSentenceEnd(nextSentence);
        }
        this._processNext();
      },
    });
  }

  /**
   * Cancel and halt all queued and ongoing speech playback immediately.
   */
  cancel() {
    this.queue = [];
    this.buffer = '';
    this.isSpeaking = false;
    this.isStreamFinished = false;
    this.currentSentence = null;
    this.spokenCount = 0;
    voiceService.stopSpeaking();
    if (this.onInterrupt) {
      this.onInterrupt();
    }
  }

  get isBusy() {
    return this.isSpeaking || this.queue.length > 0 || this.buffer.length > 0;
  }
}

export const streamingSpeechQueue = new StreamingSpeechQueue();
export default streamingSpeechQueue;

