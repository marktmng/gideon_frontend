import voiceService from '../voiceService';
import { VISEME_CODES } from '../lipsyncService';

describe('VoiceService', () => {
  afterEach(() => {
    voiceService.stopListening();
    voiceService.stopSpeaking();
    jest.clearAllMocks();
  });

  test('reports whether speech recognition is supported', () => {
    expect(voiceService.isSpeechRecognitionSupported()).toBe(true);
  });

  test('reports whether speech synthesis is supported', () => {
    expect(voiceService.isSpeechSynthesisSupported()).toBe(true);
  });

  test('sanitizes text properly for spoken responses', () => {
    const raw = '```python\nprint("hello")\n```\nHere is **important** text with `inline code` and # Header!';
    const sanitized = voiceService.sanitizeTextForSpeech(raw);
    expect(sanitized).not.toContain('```');
    expect(sanitized).not.toContain('**');
    expect(sanitized).not.toContain('#');
    expect(sanitized).toContain('important text with inline code and Header!');
  });

  test('handles empty text gracefully in speak()', () => {
    const onEnd = jest.fn();
    voiceService.speak('', { onEnd });
    expect(onEnd).toHaveBeenCalled();
  });

  test('cancels active speech and resets viseme state when stopSpeaking is called', () => {
    voiceService.speak('Testing speech output', { rate: 1.0 });
    expect(voiceService.isSpeaking).toBe(true);
    expect(voiceService.visemeTimeline).not.toBeNull();

    voiceService.stopSpeaking();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(voiceService.isSpeaking).toBe(false);
    expect(voiceService.currentViseme).toBe(VISEME_CODES.REST);
    expect(voiceService.speechLevel).toBe(0);
    expect(voiceService.visemeTimeline).toBeNull();
  });

  test('handles word boundary events and ignores stale events from superseded utterances', () => {
    const firstResult = voiceService.speak('First utterance text');
    const firstUtterance = voiceService.currentUtterance;
    expect(firstResult).not.toBeNull();

    // Start a second utterance that replaces the first
    const secondResult = voiceService.speak('Mum made me move');
    const secondUtterance = voiceService.currentUtterance;
    expect(secondResult.utteranceId).not.toBe(firstResult.utteranceId);

    // Firing onend on the stale first utterance must NOT stop the active second utterance
    if (firstUtterance && firstUtterance.onend) {
      firstUtterance.onend();
    }
    expect(voiceService.isSpeaking).toBe(true);
    expect(voiceService.currentUtteranceId).toBe(secondResult.utteranceId);

    // Firing word boundary on active second utterance updates clock anchor safely
    if (secondUtterance && secondUtterance.onboundary) {
      secondUtterance.onboundary({ name: 'word', charIndex: 4 });
    }
    expect(voiceService.visemeTimeline.mode).toBe('word_boundary_aligned');
  });

  test('starts recognition and handles final transcript without activating AI speaking state', async () => {
    const onFinal = jest.fn();
    const onInterim = jest.fn();

    const started = await voiceService.startListening({
      onInterim,
      onFinal,
    });

    expect(started).toBe(true);
    expect(voiceService.recognition).not.toBeNull();
    expect(voiceService.isSpeaking).toBe(false);
    expect(voiceService.speechLevel).toBe(0);

    // Simulate speech recognition results
    const mockEvent = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'calculate trajectory' }], { isFinal: true }),
      ],
    };

    voiceService.recognition.onresult(mockEvent);
    expect(onFinal).toHaveBeenCalledWith('calculate trajectory');
    expect(voiceService.isSpeaking).toBe(false);
  });

  test('prevents duplicate final transcript emissions', async () => {
    const onFinal = jest.fn();
    await voiceService.startListening({ onFinal });

    const mockEvent1 = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'execute command' }], { isFinal: true }),
      ],
    };

    voiceService.recognition.onresult(mockEvent1);
    voiceService.recognition.onresult(mockEvent1);

    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  test('handles recognition permission errors with friendly messages', async () => {
    const onError = jest.fn();
    await voiceService.startListening({ onError });

    voiceService.recognition.onerror({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Microphone access denied')
    );
  });

  test('findBestGideonVoice selects Amy Louise Pemberton British female voice', () => {
    const selectedVoice = voiceService.findBestGideonVoice();
    expect(selectedVoice).not.toBeNull();
    expect(selectedVoice.lang.toLowerCase()).toContain('gb');
    expect(selectedVoice.name).toContain('Amy Louise Pemberton');
  });
});
