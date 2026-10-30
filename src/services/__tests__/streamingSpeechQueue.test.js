import { StreamingSpeechQueue } from '../streamingSpeechQueue';
import voiceService from '../voiceService';

describe('StreamingSpeechQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new StreamingSpeechQueue();
    jest.spyOn(voiceService, 'speak').mockImplementation((text, opts) => {
      // Mock immediate async completion
      if (opts?.onStart) opts.onStart({ utteranceId: 'utt-test' });
      setTimeout(() => {
        if (opts?.onEnd) opts.onEnd();
      }, 10);
      return 'utt-test';
    });
    jest.spyOn(voiceService, 'stopSpeaking').mockImplementation(() => {});
  });

  afterEach(() => {
    queue.cancel();
    jest.restoreAllMocks();
  });

  test('initializes empty and not busy', () => {
    expect(queue.queue).toEqual([]);
    expect(queue.buffer).toBe('');
    expect(queue.isBusy).toBe(false);
  });

  test('incrementally enqueues sentences at punctuation boundaries', () => {
    const onStart = jest.fn();
    queue.setCallbacks({ onSentenceStart: onStart });
    queue.startStream();

    queue.feedDelta('Good morning. ');
    expect(queue.queue.length + (queue.isSpeaking ? 1 : 0)).toBeGreaterThan(0);

    queue.feedDelta('I am Gideon, your artificial intelligence system. ');
    expect(queue.isBusy).toBe(true);
  });

  test('does not break on common abbreviations or decimals', () => {
    queue.startStream();
    queue.feedDelta('The speed is 3.14 meters per second. ');
    // 3.14 should not split at "3."
    expect(queue.queue[0] || queue.buffer).not.toBe('The speed is 3.');
  });

  test('flushes trailing buffer text on finishStream', (done) => {
    queue.startStream();
    queue.feedDelta('This is a partial sentence without trailing punctuation');

    queue.setCallbacks({
      onQueueComplete: () => {
        expect(queue.isBusy).toBe(false);
        done();
      },
    });

    queue.finishStream();
  });

  test('cancels ongoing speech and clears queue immediately', () => {
    const onInterrupt = jest.fn();
    queue.setCallbacks({ onInterrupt });
    queue.startStream();

    queue.feedDelta('First sentence to be spoken. Second sentence in queue. ');
    expect(queue.isBusy).toBe(true);

    queue.cancel();

    expect(queue.queue).toEqual([]);
    expect(queue.buffer).toBe('');
    expect(queue.isBusy).toBe(false);
    expect(voiceService.stopSpeaking).toHaveBeenCalled();
    expect(onInterrupt).toHaveBeenCalled();
  });
});

