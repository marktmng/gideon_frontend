import voiceService from '../voiceService';

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

  test('cancels active speech when stopSpeaking is called', () => {
    voiceService.speak('Testing speech output', { rate: 1.0 });
    voiceService.stopSpeaking();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(voiceService.isSpeaking).toBe(false);
  });

  test('starts recognition and handles final transcript', async () => {
    const onFinal = jest.fn();
    const onInterim = jest.fn();

    const started = await voiceService.startListening({
      onInterim,
      onFinal,
    });

    expect(started).toBe(true);
    expect(voiceService.recognition).not.toBeNull();

    // Simulate speech recognition results
    const mockEvent = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'calculate trajectory' }], { isFinal: true }),
      ],
    };

    voiceService.recognition.onresult(mockEvent);
    expect(onFinal).toHaveBeenCalledWith('calculate trajectory');
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
});
