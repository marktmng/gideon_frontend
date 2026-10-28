import {
  VISEME_CODES,
  VISEME_POSES,
  mapSoundToViseme,
  getVisemePose,
  wordToVisemes,
  buildVisemeTimeline,
  evaluateTimelineAt,
  LipsyncTimelineController,
} from '../lipsyncService';
import { computeMouthArticulationMetrics } from '../../components/brain/GideonTechBrain';
import voiceService from '../voiceService';

describe('Google-Style Viseme Lipsync & Playback Synchronization Service', () => {
  afterEach(() => {
    voiceService.stopSpeaking();
    jest.clearAllMocks();
  });

  test('1. maps all 12 required phoneme / sound groups to their intended canonical visemes', () => {
    expect(mapSoundToViseme('REST')).toBe(VISEME_CODES.REST);
    expect(mapSoundToViseme('SIL')).toBe(VISEME_CODES.REST);
    expect(mapSoundToViseme('A / AA')).toBe(VISEME_CODES.A);
    expect(mapSoundToViseme('AA1')).toBe(VISEME_CODES.A);
    expect(mapSoundToViseme('E')).toBe(VISEME_CODES.E);
    expect(mapSoundToViseme('EH')).toBe(VISEME_CODES.E);
    expect(mapSoundToViseme('I / EE')).toBe(VISEME_CODES.I);
    expect(mapSoundToViseme('IY')).toBe(VISEME_CODES.I);
    expect(mapSoundToViseme('O / OH')).toBe(VISEME_CODES.O);
    expect(mapSoundToViseme('OW')).toBe(VISEME_CODES.O);
    expect(mapSoundToViseme('U / OO')).toBe(VISEME_CODES.U);
    expect(mapSoundToViseme('UW')).toBe(VISEME_CODES.U);
    expect(mapSoundToViseme('M / B / P')).toBe(VISEME_CODES.MBP);
    expect(mapSoundToViseme('M')).toBe(VISEME_CODES.MBP);
    expect(mapSoundToViseme('B')).toBe(VISEME_CODES.MBP);
    expect(mapSoundToViseme('P')).toBe(VISEME_CODES.MBP);
    expect(mapSoundToViseme('F / V')).toBe(VISEME_CODES.FV);
    expect(mapSoundToViseme('F')).toBe(VISEME_CODES.FV);
    expect(mapSoundToViseme('V')).toBe(VISEME_CODES.FV);
    expect(mapSoundToViseme('L / D / T / N')).toBe(VISEME_CODES.LDTN);
    expect(mapSoundToViseme('L')).toBe(VISEME_CODES.LDTN);
    expect(mapSoundToViseme('TH')).toBe(VISEME_CODES.TH);
    expect(mapSoundToViseme('DH')).toBe(VISEME_CODES.TH);
    expect(mapSoundToViseme('S / Z')).toBe(VISEME_CODES.SZ);
    expect(mapSoundToViseme('S')).toBe(VISEME_CODES.SZ);
    expect(mapSoundToViseme('SH / CH / J')).toBe(VISEME_CODES.SH);
    expect(mapSoundToViseme('SH')).toBe(VISEME_CODES.SH);
    expect(mapSoundToViseme('CH')).toBe(VISEME_CODES.SH);
  });

  test('2. M / B / P produces the closed-lip bilabial configuration', () => {
    for (const sound of ['M', 'B', 'P', 'M / B / P']) {
      const pose = getVisemePose(sound);
      const metrics = computeMouthArticulationMetrics(pose);
      expect(pose.code).toBe(VISEME_CODES.MBP);
      expect(pose.openY).toBe(0);
      expect(pose.lipPress).toBe(1.0);
      expect(metrics.isClosed).toBe(true);
    }

    // Words "Mum made me move" start with MBP
    const mumVisemes = wordToVisemes('Mum');
    expect(mumVisemes[0]).toBe(VISEME_CODES.MBP);
    expect(mumVisemes[mumVisemes.length - 1]).toBe(VISEME_CODES.MBP);
  });

  test('3. A/AA, E, I/EE, O/OH, and U/OO produce distinguishable mouth shapes (vertical open vs wide vs rounded)', () => {
    const mA = computeMouthArticulationMetrics('A');
    const mE = computeMouthArticulationMetrics('E');
    const mI = computeMouthArticulationMetrics('I');
    const mO = computeMouthArticulationMetrics('O');
    const mU = computeMouthArticulationMetrics('U');
    const mFV = computeMouthArticulationMetrics('FV');
    const mTH = computeMouthArticulationMetrics('TH');
    const mSZ = computeMouthArticulationMetrics('SZ');
    const mSH = computeMouthArticulationMetrics('SH');

    // A/AA is the most vertically open vowel with largest jaw drop
    expect(mA.apertureHeight).toBeGreaterThan(mE.apertureHeight);
    expect(mE.apertureHeight).toBeGreaterThan(mI.apertureHeight);
    expect(mA.jawDrop).toBeGreaterThan(mI.jawDrop);

    // E and I/EE are horizontally wider/stretched compared to rounded O and U
    expect(mI.apertureWidth).toBeGreaterThan(mA.apertureWidth);
    expect(mE.apertureWidth).toBeGreaterThan(mO.apertureWidth);
    expect(mI.apertureWidth).toBeGreaterThan(mO.apertureWidth);

    // O/OH and U/OO have strong lip rounding and forward protrusion, with U tighter/smaller than O
    expect(mO.roundness).toBeGreaterThan(0.7);
    expect(mU.roundness).toBeGreaterThan(0.9);
    expect(mO.apertureHeight).toBeGreaterThan(mU.apertureHeight);
    expect(mO.apertureWidth).toBeGreaterThan(mU.apertureWidth);

    // Consonant articulations are distinct:
    // F/V tucks lower lip under upper teeth
    expect(mFV.lowerLipTuck).toBeGreaterThan(0.75);
    expect(mFV.upperTeeth).toBeGreaterThan(0.8);
    // TH elevates tongue tip between teeth
    expect(mTH.tongueTip).toBeGreaterThan(0.9);
    // S/Z has narrow opening and wide dental alignment
    expect(mSZ.apertureHeight).toBeLessThan(mE.apertureHeight);
    expect(mSZ.lowerTeeth).toBeGreaterThan(0.6);
    // SH/CH/J has forward rounded protrusion
    expect(mSH.roundness).toBeGreaterThan(0.5);
    expect(mSH.protrusionZ).toBeGreaterThan(0.05);
  });

  test('4. viseme cues follow their timestamps accurately when timestamped alignment is provided', () => {
    const alignment = [
      { startMs: 0, durationMs: 100, viseme: 'O', word: 'Orange' },
      { startMs: 100, durationMs: 90, viseme: 'LDTN', word: 'Orange' },
      { startMs: 190, durationMs: 80, viseme: 'I', word: 'Orange' },
      { startMs: 270, durationMs: 90, viseme: 'SH', word: 'Orange' },
    ];

    const timeline = buildVisemeTimeline('Orange', {
      utteranceId: 'utt-align-1',
      alignment,
    });

    expect(timeline.mode).toBe('timestamped_alignment');
    expect(evaluateTimelineAt(timeline, 50).viseme).toBe(VISEME_CODES.O);
    expect(evaluateTimelineAt(timeline, 140).viseme).toBe(VISEME_CODES.LDTN);
    expect(evaluateTimelineAt(timeline, 220).viseme).toBe(VISEME_CODES.I);
    expect(evaluateTimelineAt(timeline, 310).viseme).toBe(VISEME_CODES.SH);
  });

  test('5. estimated timing and British English pronunciation decomposition work safely when exact alignment is unavailable', () => {
    const timeline = buildVisemeTimeline(
      'Mum made me move. Five very fresh oranges. She chose three things.',
      { utteranceId: 'utt-gb-1', locale: 'en-GB', rate: 1.0 }
    );

    expect(timeline.mode).toBe('estimated_viseme');
    expect(timeline.cues.length).toBeGreaterThan(15);

    const visemeSet = new Set(timeline.cues.map((c) => c.viseme));
    // Must contain MBP (Mum/made/me/move), FV (Five/very/fresh), O (oranges/chose), SH (fresh/She/chose), TH (three/things), SZ (oranges/chose/things)
    expect(visemeSet.has(VISEME_CODES.MBP)).toBe(true);
    expect(visemeSet.has(VISEME_CODES.FV)).toBe(true);
    expect(visemeSet.has(VISEME_CODES.O)).toBe(true);
    expect(visemeSet.has(VISEME_CODES.SH)).toBe(true);
    expect(visemeSet.has(VISEME_CODES.TH)).toBe(true);
    expect(visemeSet.has(VISEME_CODES.SZ)).toBe(true);
  });

  test('6. punctuation and pauses schedule REST cues with zero speech energy', () => {
    const timeline = buildVisemeTimeline('Hello, how are you... today?', {
      utteranceId: 'utt-pause-1',
    });

    const pauseCues = timeline.cues.filter((c) => c.isPause);
    expect(pauseCues.length).toBeGreaterThanOrEqual(3); // comma, ellipsis, question mark + trailing end

    for (const pc of pauseCues) {
      expect(pc.viseme).toBe(VISEME_CODES.REST);
      expect(pc.intensity).toBe(0);
      const midPause = (pc.startMs + pc.endMs) / 2;
      const sample = evaluateTimelineAt(timeline, midPause);
      expect(sample.viseme).toBe(VISEME_CODES.REST);
      expect(sample.speechLevel).toBe(0);
    }
  });

  test('7 & 8. mouth rests when speech ends and speech cancellation immediately clears pending cues', () => {
    voiceService.speak('Hello, how can I help you today?');
    expect(voiceService.isSpeaking).toBe(true);
    expect(voiceService.visemeTimeline).not.toBeNull();

    // Cancel speech mid-utterance
    voiceService.stopSpeaking();
    expect(voiceService.isSpeaking).toBe(false);
    expect(voiceService.currentViseme).toBe(VISEME_CODES.REST);
    expect(voiceService.speechLevel).toBe(0);
    expect(voiceService.visemeTimeline).toBeNull();

    const postCancelSample = voiceService.sampleSpeechState();
    expect(postCancelSample.viseme).toBe(VISEME_CODES.REST);
    expect(postCancelSample.speechLevel).toBe(0);
  });

  test('9. a new utterance cannot be affected by stale cues or callbacks from an earlier utterance', () => {
    const controller = new LipsyncTimelineController();
    const t1 = controller.prepare('Orange', { utteranceId: 'utt-old' });
    controller.start('utt-old', 1000);

    // Replace with a new utterance
    const t2 = controller.prepare('Mum made me move', { utteranceId: 'utt-new' });
    controller.start('utt-new', 2000);

    expect(t1.utteranceId).toBe('utt-old');
    expect(t2.utteranceId).toBe('utt-new');

    // Stale operations with old utteranceId must be rejected
    expect(controller.onWordBoundary('utt-old', 0, 2100)).toBe(false);
    expect(controller.pause('utt-old', 2100)).toBe(false);
    expect(controller.stop('utt-old')).toBe(false);

    // Active utterance continues unaffected
    const activeSample = controller.sample(2030, 'utt-new');
    expect(activeSample.isSpeaking).toBe(true);
    expect(activeSample.utteranceId).toBe('utt-new');
  });

  test('10. rapid speech produces bounded, stable mouth transitions without NaN or out-of-range values', () => {
    const timeline = buildVisemeTimeline(
      'She chose three things very fast at 125 frames per second.',
      { utteranceId: 'utt-fast', rate: 1.8 }
    );

    expect(timeline.cues.length).toBeGreaterThan(10);

    for (let t = 0; t <= timeline.totalDurationMs + 50; t += 15) {
      const sample = evaluateTimelineAt(timeline, t);
      expect(Number.isNaN(sample.pose.openY)).toBe(false);
      expect(sample.pose.openY).toBeGreaterThanOrEqual(0);
      expect(sample.pose.openY).toBeLessThanOrEqual(1);
      expect(sample.pose.widthX).toBeGreaterThanOrEqual(0.5);
      expect(sample.pose.widthX).toBeLessThanOrEqual(1.4);
      expect(sample.speechLevel).toBeGreaterThanOrEqual(0);
      expect(sample.speechLevel).toBeLessThanOrEqual(1);
    }
  });
});

