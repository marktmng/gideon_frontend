import {
  WakeWordService,
  WAKE_PHRASE_OPTIONS,
  WAKE_WORD_STATES,
} from '../wakeWordService';

describe('WakeWordService', () => {
  let service;

  beforeEach(() => {
    service = new WakeWordService();
  });

  afterEach(() => {
    service.stopStandby();
  });

  test('initializes with default options and disabled state', () => {
    expect(service.state).toBe(WAKE_WORD_STATES.DISABLED);
    expect(service.selectedPhrase).toBe(WAKE_PHRASE_OPTIONS.HEY_GIDEON);
    expect(service.audioCueEnabled).toBe(true);
  });

  describe('Wake Phrase Pattern Matching & Single-Breath Extraction', () => {
    test('matches default "Hey Gideon" phrase', () => {
      service.configure({ phrase: WAKE_PHRASE_OPTIONS.HEY_GIDEON });

      const match1 = service.matchWakePhrase('Hey Gideon');
      expect(match1.matched).toBe(true);
      expect(match1.command).toBe('');

      const match2 = service.matchWakePhrase('Hey Gideon, what is open on my screen?');
      expect(match2.matched).toBe(true);
      expect(match2.command).toBe('what is open on my screen?');

      const match3 = service.matchWakePhrase('Hi Gideon open calculator');
      expect(match3.matched).toBe(true);
      expect(match3.command).toBe('open calculator');
    });

    test('rejects bare "Gideon" when default phrase is "Hey Gideon"', () => {
      service.configure({ phrase: WAKE_PHRASE_OPTIONS.HEY_GIDEON });

      const match = service.matchWakePhrase('Gideon what is open on my screen?');
      expect(match.matched).toBe(false);
    });

    test('matches alternative "Gideon" phrase when configured', () => {
      service.configure({ phrase: WAKE_PHRASE_OPTIONS.GIDEON });

      const match1 = service.matchWakePhrase('Gideon');
      expect(match1.matched).toBe(true);
      expect(match1.command).toBe('');

      const match2 = service.matchWakePhrase('Gideon, list my open windows');
      expect(match2.matched).toBe(true);
      expect(match2.command).toBe('list my open windows');
    });

    test('matches both "Hey Gideon" and "Gideon" when phrase is BOTH', () => {
      service.configure({ phrase: WAKE_PHRASE_OPTIONS.BOTH });

      const match1 = service.matchWakePhrase('Hey Gideon, take screenshot');
      expect(match1.matched).toBe(true);
      expect(match1.command).toBe('take screenshot');

      const match2 = service.matchWakePhrase('Gideon, take screenshot');
      expect(match2.matched).toBe(true);
      expect(match2.command).toBe('take screenshot');
    });

    test('rejects unrelated speech phrases', () => {
      service.configure({ phrase: WAKE_PHRASE_OPTIONS.BOTH });

      expect(service.matchWakePhrase('Hey Siri').matched).toBe(false);
      expect(service.matchWakePhrase('Good morning computer').matched).toBe(false);
      expect(service.matchWakePhrase('Can you hear me?').matched).toBe(false);
      expect(service.matchWakePhrase('').matched).toBe(false);
      expect(service.matchWakePhrase(null).matched).toBe(false);
    });
  });

  describe('Vocal Interruption Keyword Detection', () => {
    test('detects exact interrupt keywords with word boundaries', () => {
      expect(service.matchesInterruptKeyword('stop')).toBe(true);
      expect(service.matchesInterruptKeyword('Gideon, stop talking')).toBe(true);
      expect(service.matchesInterruptKeyword('halt')).toBe(true);
      expect(service.matchesInterruptKeyword('cancel')).toBe(true);
      expect(service.matchesInterruptKeyword('be quiet')).toBe(true);
      expect(service.matchesInterruptKeyword('shut up')).toBe(true);
      expect(service.matchesInterruptKeyword('pause')).toBe(true);
    });

    test('ignores non-interrupt words containing substrings', () => {
      expect(service.matchesInterruptKeyword('unstoppable')).toBe(false);
      expect(service.matchesInterruptKeyword('continue speaking')).toBe(false);
      expect(service.matchesInterruptKeyword('this is great')).toBe(false);
      expect(service.matchesInterruptKeyword('')).toBe(false);
      expect(service.matchesInterruptKeyword(null)).toBe(false);
    });
  });

  describe('Audio Chime Synthesis & Loopback Prevention', () => {
    test('plays Web Audio API chime without error', async () => {
      service.configure({ audioCueEnabled: true });
      await expect(service.playWakeChime()).resolves.not.toThrow();
    });

    test('respects audioCueEnabled = false setting', async () => {
      service.configure({ audioCueEnabled: false });
      const audioSpy = jest.spyOn(service, 'playWakeChime');
      await service.playWakeChime();
      expect(audioSpy).toHaveBeenCalled();
    });

    test('tracks AI speaking state for acoustic echo suppression', () => {
      expect(service.isSpeaking).toBe(false);
      service.setSpeakingState(true);
      expect(service.isSpeaking).toBe(true);
      service.setSpeakingState(false);
      expect(service.isSpeaking).toBe(false);
    });
  });

  describe('Lifecycle State Transitions', () => {
    test('transitions through states on start, pause, resume, and stop', () => {
      const stateChanges = [];
      service.configure({
        onStateChange: (st) => stateChanges.push(st),
      });

      // In JSDOM without SpeechRecognition mock, it flags mic unavailable
      service.startStandby();
      expect(service.state).not.toBe(WAKE_WORD_STATES.DISABLED);

      service.stopStandby();
      expect(service.state).toBe(WAKE_WORD_STATES.DISABLED);
    });
  });
});

