/**
 * Google-Pronunciation-Style Viseme & Speech Alignment Service for Gideon.
 *
 * Responsibilities:
 * 1. Defines canonical viseme classes and their 3D articulatory mouth parameters:
 *    - REST (Rest / silence): Relaxed, closed or slightly parted lips
 *    - A    (A / AA): More vertically open mouth
 *    - E    (E): Open, wider mouth with stretched lips
 *    - I    (I / EE): Narrower opening with horizontally stretched lips
 *    - O    (O / OH): Rounded lips with a circular or oval opening
 *    - U    (U / OO): Smaller, tightly rounded, protruding lips
 *    - MBP  (M / B / P): Clearly closed, bilabial pressed lips
 *    - FV   (F / V): Labiodental — upper teeth approaching/contacting lower lip
 *    - LDTN (L / D / T / N): Alveolar — lightly open controlled articulation with raised tongue tip
 *    - TH   (TH): Dental — tongue tip visible between upper and lower teeth
 *    - SZ   (S / Z): Sibilant — narrow, controlled mouth opening with close teeth
 *    - SH   (SH / CH / J): Postalveolar — constrained, forward rounded/flared articulation
 *
 * 2. Supports a multi-tier synchronization hierarchy:
 *    - Tier 1 (Timestamped Phoneme / Viseme Alignment): Schedules exact timestamped cues
 *      when alignment metadata is provided.
 *    - Tier 2 (Word-Boundary Synchronized Viseme Timeline): Uses British-English-aware
 *      grapheme-to-phoneme/viseme decomposition and dynamically re-anchors word start times
 *      to actual browser SpeechSynthesisUtterance `boundary` events during playback.
 *    - Tier 3 (Estimated Viseme Timing Fallback): Advances along the prepared phoneme-to-viseme
 *      timeline anchored to `utterance.onstart` when a browser voice does not emit boundary events.
 *
 * 3. Separates articulation (viseme shape) from vocal intensity (`speechLevel` / `speechPulse`).
 */

export const VISEME_CODES = {
  REST: 'REST',
  A: 'A',
  E: 'E',
  I: 'I',
  O: 'O',
  U: 'U',
  MBP: 'MBP',
  FV: 'FV',
  LDTN: 'LDTN',
  TH: 'TH',
  SZ: 'SZ',
  SH: 'SH',
};

/**
 * Articulatory pose definitions for each viseme class.
 * Parameters:
 * - openY: Vertical aperture opening between upper and lower lips (0.0 = closed, 1.0 = max open)
 * - widthX: Horizontal mouth corner stretch relative to neutral (0.55 = tight purse, 1.0 = neutral, 1.32 = wide stretch)
 * - roundness: Circular/oval lip rounding and corner pull-in (0.0 = flat/wide, 1.0 = tight O/U ring)
 * - lipPress: Bilabial compression pressing lips together (0.0 = none, 1.0 = firm M/B/P closure)
 * - protrusionZ: Forward 3D lip pucker/projection (negative = retracted corners, positive = flared/pursed forward)
 * - jawDrop: Downward mandibular displacement (0.0 = rest, 1.0 = full open vowel drop)
 * - upperTeeth: Visibility of upper dental arch (0.0 to 1.0)
 * - lowerTeeth: Visibility of lower dental arch (0.0 to 1.0)
 * - tongueTip: Visibility/elevation of tongue tip/blade (high for TH and LDTN)
 * - lowerLipTuck: Inward/upward tuck of lower lip toward upper teeth (high for F/V)
 * - baseEnergy: Typical outgoing vocal energy weight for this sound group (0.0 = silence, up to 0.95 for open vowels)
 */
export const VISEME_POSES = {
  [VISEME_CODES.REST]: {
    code: VISEME_CODES.REST,
    label: 'Rest / Silence',
    openY: 0.02,
    widthX: 1.0,
    roundness: 0.0,
    lipPress: 0.0,
    protrusionZ: 0.0,
    jawDrop: 0.0,
    upperTeeth: 0.0,
    lowerTeeth: 0.0,
    tongueTip: 0.0,
    lowerLipTuck: 0.0,
    baseEnergy: 0.0,
  },
  [VISEME_CODES.A]: {
    code: VISEME_CODES.A,
    label: 'A / AA',
    openY: 0.88,
    widthX: 1.04,
    roundness: 0.14,
    lipPress: 0.0,
    protrusionZ: 0.02,
    jawDrop: 0.82,
    upperTeeth: 0.48,
    lowerTeeth: 0.36,
    tongueTip: 0.16,
    lowerLipTuck: 0.0,
    baseEnergy: 0.92,
  },
  [VISEME_CODES.E]: {
    code: VISEME_CODES.E,
    label: 'E',
    openY: 0.56,
    widthX: 1.24,
    roundness: 0.0,
    lipPress: 0.0,
    protrusionZ: -0.02,
    jawDrop: 0.50,
    upperTeeth: 0.66,
    lowerTeeth: 0.44,
    tongueTip: 0.22,
    lowerLipTuck: 0.0,
    baseEnergy: 0.78,
  },
  [VISEME_CODES.I]: {
    code: VISEME_CODES.I,
    label: 'I / EE',
    openY: 0.28,
    widthX: 1.32,
    roundness: 0.0,
    lipPress: 0.0,
    protrusionZ: -0.04,
    jawDrop: 0.22,
    upperTeeth: 0.78,
    lowerTeeth: 0.54,
    tongueTip: 0.26,
    lowerLipTuck: 0.0,
    baseEnergy: 0.68,
  },
  [VISEME_CODES.O]: {
    code: VISEME_CODES.O,
    label: 'O / OH',
    openY: 0.68,
    widthX: 0.72,
    roundness: 0.86,
    lipPress: 0.0,
    protrusionZ: 0.08,
    jawDrop: 0.60,
    upperTeeth: 0.18,
    lowerTeeth: 0.12,
    tongueTip: 0.06,
    lowerLipTuck: 0.0,
    baseEnergy: 0.86,
  },
  [VISEME_CODES.U]: {
    code: VISEME_CODES.U,
    label: 'U / OO',
    openY: 0.30,
    widthX: 0.56,
    roundness: 1.0,
    lipPress: 0.0,
    protrusionZ: 0.13,
    jawDrop: 0.24,
    upperTeeth: 0.0,
    lowerTeeth: 0.0,
    tongueTip: 0.0,
    lowerLipTuck: 0.0,
    baseEnergy: 0.64,
  },
  [VISEME_CODES.MBP]: {
    code: VISEME_CODES.MBP,
    label: 'M / B / P',
    openY: 0.0,
    widthX: 0.95,
    roundness: 0.0,
    lipPress: 1.0,
    protrusionZ: 0.02,
    jawDrop: 0.0,
    upperTeeth: 0.0,
    lowerTeeth: 0.0,
    tongueTip: 0.0,
    lowerLipTuck: 0.0,
    baseEnergy: 0.28,
  },
  [VISEME_CODES.FV]: {
    code: VISEME_CODES.FV,
    label: 'F / V',
    openY: 0.14,
    widthX: 1.02,
    roundness: 0.0,
    lipPress: 0.38,
    protrusionZ: -0.02,
    jawDrop: 0.12,
    upperTeeth: 0.90,
    lowerTeeth: 0.0,
    tongueTip: 0.0,
    lowerLipTuck: 0.88,
    baseEnergy: 0.42,
  },
  [VISEME_CODES.LDTN]: {
    code: VISEME_CODES.LDTN,
    label: 'L / D / T / N',
    openY: 0.34,
    widthX: 1.05,
    roundness: 0.05,
    lipPress: 0.0,
    protrusionZ: 0.0,
    jawDrop: 0.28,
    upperTeeth: 0.62,
    lowerTeeth: 0.34,
    tongueTip: 0.76,
    lowerLipTuck: 0.0,
    baseEnergy: 0.52,
  },
  [VISEME_CODES.TH]: {
    code: VISEME_CODES.TH,
    label: 'TH',
    openY: 0.24,
    widthX: 1.06,
    roundness: 0.0,
    lipPress: 0.0,
    protrusionZ: 0.01,
    jawDrop: 0.20,
    upperTeeth: 0.74,
    lowerTeeth: 0.42,
    tongueTip: 0.96,
    lowerLipTuck: 0.0,
    baseEnergy: 0.44,
  },
  [VISEME_CODES.SZ]: {
    code: VISEME_CODES.SZ,
    label: 'S / Z',
    openY: 0.15,
    widthX: 1.16,
    roundness: 0.0,
    lipPress: 0.0,
    protrusionZ: -0.02,
    jawDrop: 0.10,
    upperTeeth: 0.86,
    lowerTeeth: 0.76,
    tongueTip: 0.30,
    lowerLipTuck: 0.0,
    baseEnergy: 0.46,
  },
  [VISEME_CODES.SH]: {
    code: VISEME_CODES.SH,
    label: 'SH / CH / J',
    openY: 0.28,
    widthX: 0.80,
    roundness: 0.70,
    lipPress: 0.0,
    protrusionZ: 0.08,
    jawDrop: 0.22,
    upperTeeth: 0.54,
    lowerTeeth: 0.40,
    tongueTip: 0.36,
    lowerLipTuck: 0.0,
    baseEnergy: 0.54,
  },
};

/**
 * Direct phoneme / sound-group lookup table mapping ARPAbet, IPA, and human-readable
 * sound group labels to the 12 canonical visemes.
 */
const PHONEME_TO_VISEME_MAP = {
  // Rest / Silence
  REST: VISEME_CODES.REST,
  SIL: VISEME_CODES.REST,
  SILENCE: VISEME_CODES.REST,
  SP: VISEME_CODES.REST,
  PAUSE: VISEME_CODES.REST,
  _: VISEME_CODES.REST,

  // A / AA
  A: VISEME_CODES.A,
  AA: VISEME_CODES.A,
  AE: VISEME_CODES.A,
  AH: VISEME_CODES.A,
  'A/AA': VISEME_CODES.A,
  'A / AA': VISEME_CODES.A,
  ɑ: VISEME_CODES.A,
  æ: VISEME_CODES.A,
  ʌ: VISEME_CODES.A,

  // E
  E: VISEME_CODES.E,
  EH: VISEME_CODES.E,
  ER: VISEME_CODES.E,
  EY: VISEME_CODES.E,
  e: VISEME_CODES.E,
  ɛ: VISEME_CODES.E,
  ɜ: VISEME_CODES.E,
  ə: VISEME_CODES.E,

  // I / EE
  I: VISEME_CODES.I,
  EE: VISEME_CODES.I,
  IH: VISEME_CODES.I,
  IY: VISEME_CODES.I,
  Y: VISEME_CODES.I,
  'I/EE': VISEME_CODES.I,
  'I / EE': VISEME_CODES.I,
  i: VISEME_CODES.I,
  ɪ: VISEME_CODES.I,
  j: VISEME_CODES.I,

  // O / OH
  O: VISEME_CODES.O,
  OH: VISEME_CODES.O,
  AO: VISEME_CODES.O,
  OW: VISEME_CODES.O,
  OY: VISEME_CODES.O,
  'O/OH': VISEME_CODES.O,
  'O / OH': VISEME_CODES.O,
  ɒ: VISEME_CODES.O,
  ɔ: VISEME_CODES.O,
  o: VISEME_CODES.O,

  // U / OO
  U: VISEME_CODES.U,
  OO: VISEME_CODES.U,
  UH: VISEME_CODES.U,
  UW: VISEME_CODES.U,
  W: VISEME_CODES.U,
  'U/OO': VISEME_CODES.U,
  'U / OO': VISEME_CODES.U,
  u: VISEME_CODES.U,
  ʊ: VISEME_CODES.U,
  w: VISEME_CODES.U,

  // M / B / P
  M: VISEME_CODES.MBP,
  B: VISEME_CODES.MBP,
  P: VISEME_CODES.MBP,
  MBP: VISEME_CODES.MBP,
  'M/B/P': VISEME_CODES.MBP,
  'M / B / P': VISEME_CODES.MBP,

  // F / V
  F: VISEME_CODES.FV,
  V: VISEME_CODES.FV,
  FV: VISEME_CODES.FV,
  'F/V': VISEME_CODES.FV,
  'F / V': VISEME_CODES.FV,

  // L / D / T / N (+ velar/glottal stops & R that share light open lingual articulation)
  L: VISEME_CODES.LDTN,
  D: VISEME_CODES.LDTN,
  T: VISEME_CODES.LDTN,
  N: VISEME_CODES.LDTN,
  R: VISEME_CODES.LDTN,
  K: VISEME_CODES.LDTN,
  G: VISEME_CODES.LDTN,
  NG: VISEME_CODES.LDTN,
  HH: VISEME_CODES.LDTN,
  H: VISEME_CODES.LDTN,
  LDTN: VISEME_CODES.LDTN,
  'L/D/T/N': VISEME_CODES.LDTN,
  'L / D / T / N': VISEME_CODES.LDTN,

  // TH
  TH: VISEME_CODES.TH,
  DH: VISEME_CODES.TH,
  θ: VISEME_CODES.TH,
  ð: VISEME_CODES.TH,

  // S / Z
  S: VISEME_CODES.SZ,
  Z: VISEME_CODES.SZ,
  SZ: VISEME_CODES.SZ,
  'S/Z': VISEME_CODES.SZ,
  'S / Z': VISEME_CODES.SZ,

  // SH / CH / J
  SH: VISEME_CODES.SH,
  CH: VISEME_CODES.SH,
  J: VISEME_CODES.SH,
  JH: VISEME_CODES.SH,
  ZH: VISEME_CODES.SH,
  'SH/CH/J': VISEME_CODES.SH,
  'SH / CH / J': VISEME_CODES.SH,
  ʃ: VISEME_CODES.SH,
  ʒ: VISEME_CODES.SH,
  tʃ: VISEME_CODES.SH,
  dʒ: VISEME_CODES.SH,
};

/**
 * Map any phoneme code, sound group string, or viseme name to a canonical viseme code.
 */
export function mapSoundToViseme(sound) {
  if (!sound || typeof sound !== 'string') {
    return VISEME_CODES.REST;
  }
  const trimmed = sound.trim();
  if (!trimmed) return VISEME_CODES.REST;

  // Strip stress digits from ARPAbet phonemes (e.g., "AA1" -> "AA", "OW0" -> "OW")
  const upper = trimmed.toUpperCase().replace(/[0-9]+$/, '');
  if (PHONEME_TO_VISEME_MAP[upper]) {
    return PHONEME_TO_VISEME_MAP[upper];
  }
  if (PHONEME_TO_VISEME_MAP[trimmed]) {
    return PHONEME_TO_VISEME_MAP[trimmed];
  }
  return VISEME_CODES.REST;
}

/**
 * Retrieve the articulatory pose object for a given viseme code or sound group.
 */
export function getVisemePose(visemeOrSound) {
  const code = VISEME_POSES[visemeOrSound] ? visemeOrSound : mapSoundToViseme(visemeOrSound);
  return { ...(VISEME_POSES[code] || VISEME_POSES[VISEME_CODES.REST]) };
}

/**
 * Linearly interpolate between two viseme poses with optional smoothstep easing.
 */
export function interpolateVisemePose(fromPose, toPose, t = 1.0) {
  const start = fromPose || VISEME_POSES[VISEME_CODES.REST];
  const end = toPose || VISEME_POSES[VISEME_CODES.REST];
  const clamped = Math.max(0, Math.min(1, t));
  // Smoothstep easing for organic coarticulation
  const alpha = clamped * clamped * (3 - 2 * clamped);

  const lerp = (a, b) => a + (b - a) * alpha;

  return {
    code: alpha >= 0.5 ? end.code : start.code,
    label: alpha >= 0.5 ? end.label : start.label,
    openY: lerp(start.openY, end.openY),
    widthX: lerp(start.widthX, end.widthX),
    roundness: lerp(start.roundness, end.roundness),
    lipPress: lerp(start.lipPress, end.lipPress),
    protrusionZ: lerp(start.protrusionZ, end.protrusionZ),
    jawDrop: lerp(start.jawDrop, end.jawDrop),
    upperTeeth: lerp(start.upperTeeth, end.upperTeeth),
    lowerTeeth: lerp(start.lowerTeeth, end.lowerTeeth),
    tongueTip: lerp(start.tongueTip, end.tongueTip),
    lowerLipTuck: lerp(start.lowerLipTuck, end.lowerLipTuck),
    baseEnergy: lerp(start.baseEnergy, end.baseEnergy),
  };
}

/**
 * British-English-aware pronunciation lexicon for common words, test vocabulary,
 * and words with irregular English orthography.
 * Values are arrays of canonical viseme codes.
 */
const BRITISH_LEXICON = {
  // Manual Verification Test B sentences & key words:
  orange: ['O', 'LDTN', 'I', 'LDTN', 'SH'],
  oranges: ['O', 'LDTN', 'I', 'LDTN', 'SH', 'I', 'SZ'],
  mum: ['MBP', 'A', 'MBP'],
  mom: ['MBP', 'O', 'MBP'],
  made: ['MBP', 'E', 'I', 'LDTN'],
  me: ['MBP', 'I'],
  move: ['MBP', 'U', 'FV'],
  five: ['FV', 'A', 'I', 'FV'],
  very: ['FV', 'E', 'LDTN', 'I'],
  fresh: ['FV', 'LDTN', 'E', 'SH'],
  she: ['SH', 'I'],
  chose: ['SH', 'O', 'U', 'SZ'],
  three: ['TH', 'LDTN', 'I'],
  things: ['TH', 'I', 'LDTN', 'SZ'],
  thing: ['TH', 'I', 'LDTN'],
  hello: ['LDTN', 'E', 'LDTN', 'O', 'U'],
  how: ['LDTN', 'A', 'U'],
  can: ['LDTN', 'A', 'LDTN'],
  cant: ['LDTN', 'A', 'LDTN', 'LDTN'],
  i: ['A', 'I'],
  help: ['LDTN', 'E', 'LDTN', 'MBP'],
  you: ['I', 'U'],
  your: ['I', 'O'],
  youre: ['I', 'O'],
  today: ['LDTN', 'U', 'LDTN', 'E', 'I'],

  // Common Gideon vocabulary & British RP words
  gideon: ['LDTN', 'I', 'LDTN', 'I', 'E', 'LDTN'],
  greetings: ['LDTN', 'LDTN', 'I', 'LDTN', 'I', 'LDTN', 'SZ'],
  am: ['A', 'MBP'],
  are: ['A'], // Non-rhotic British RP
  is: ['I', 'SZ'],
  was: ['U', 'O', 'SZ'],
  were: ['U', 'E'],
  be: ['MBP', 'I'],
  been: ['MBP', 'I', 'LDTN'],
  have: ['LDTN', 'A', 'FV'],
  has: ['LDTN', 'A', 'SZ'],
  had: ['LDTN', 'A', 'LDTN'],
  do: ['LDTN', 'U'],
  does: ['LDTN', 'A', 'SZ'],
  did: ['LDTN', 'I', 'LDTN'],
  done: ['LDTN', 'A', 'LDTN'],
  will: ['U', 'I', 'LDTN'],
  would: ['U', 'U', 'LDTN'],
  could: ['LDTN', 'U', 'LDTN'],
  should: ['SH', 'U', 'LDTN'],
  what: ['U', 'O', 'LDTN'],
  where: ['U', 'E'],
  when: ['U', 'E', 'LDTN'],
  why: ['U', 'A', 'I'],
  who: ['LDTN', 'U'],
  which: ['U', 'I', 'SH'],
  this: ['TH', 'I', 'SZ'],
  that: ['TH', 'A', 'LDTN'],
  these: ['TH', 'I', 'SZ'],
  those: ['TH', 'O', 'U', 'SZ'],
  there: ['TH', 'E'],
  their: ['TH', 'E'],
  they: ['TH', 'E', 'I'],
  them: ['TH', 'E', 'MBP'],
  then: ['TH', 'E', 'LDTN'],
  than: ['TH', 'A', 'LDTN'],
  the: ['TH', 'E'],
  to: ['LDTN', 'U'],
  too: ['LDTN', 'U'],
  two: ['LDTN', 'U'],
  one: ['U', 'A', 'LDTN'],
  four: ['FV', 'O'],
  six: ['SZ', 'I', 'LDTN', 'SZ'],
  seven: ['SZ', 'E', 'FV', 'E', 'LDTN'],
  eight: ['E', 'I', 'LDTN'],
  nine: ['LDTN', 'A', 'I', 'LDTN'],
  ten: ['LDTN', 'E', 'LDTN'],
  zero: ['SZ', 'I', 'LDTN', 'O', 'U'],
  open: ['O', 'U', 'MBP', 'E', 'LDTN'],
  close: ['LDTN', 'LDTN', 'O', 'U', 'SZ'],
  file: ['FV', 'A', 'I', 'LDTN'],
  explorer: ['I', 'LDTN', 'SZ', 'MBP', 'LDTN', 'O', 'LDTN', 'E'],
  calculator: ['LDTN', 'A', 'LDTN', 'LDTN', 'I', 'U', 'LDTN', 'E', 'I', 'LDTN', 'E'],
  current: ['LDTN', 'A', 'LDTN', 'E', 'LDTN', 'LDTN'],
  operational: ['O', 'MBP', 'E', 'LDTN', 'E', 'I', 'SH', 'E', 'LDTN', 'E', 'LDTN'],
  capabilities: ['LDTN', 'E', 'I', 'MBP', 'E', 'MBP', 'I', 'LDTN', 'I', 'LDTN', 'I', 'SZ'],
  remember: ['LDTN', 'I', 'MBP', 'E', 'MBP', 'MBP', 'E'],
  prefer: ['MBP', 'LDTN', 'I', 'FV', 'E'],
  concise: ['LDTN', 'E', 'LDTN', 'SZ', 'A', 'I', 'SZ'],
  bulleted: ['MBP', 'U', 'LDTN', 'I', 'LDTN', 'I', 'LDTN'],
  responses: ['LDTN', 'I', 'SZ', 'MBP', 'O', 'LDTN', 'SZ', 'I', 'SZ'],
  response: ['LDTN', 'I', 'SZ', 'MBP', 'O', 'LDTN', 'SZ'],
  command: ['LDTN', 'E', 'MBP', 'A', 'LDTN', 'LDTN'],
  fast: ['FV', 'A', 'SZ', 'LDTN'],
  last: ['LDTN', 'A', 'SZ', 'LDTN'],
  past: ['MBP', 'A', 'SZ', 'LDTN'],
  task: ['LDTN', 'A', 'SZ', 'LDTN'],
  tasks: ['LDTN', 'A', 'SZ', 'LDTN', 'SZ'],
  ask: ['A', 'SZ', 'LDTN'],
  after: ['A', 'FV', 'LDTN', 'E'],
  path: ['MBP', 'A', 'TH'],
  glass: ['LDTN', 'LDTN', 'A', 'SZ'],
  class: ['LDTN', 'LDTN', 'A', 'SZ'],
  water: ['U', 'O', 'LDTN', 'E'],
  better: ['MBP', 'E', 'LDTN', 'E'],
  neural: ['LDTN', 'I', 'U', 'LDTN', 'E', 'LDTN'],
  core: ['LDTN', 'O'],
  online: ['O', 'LDTN', 'LDTN', 'A', 'I', 'LDTN'],
  standing: ['SZ', 'LDTN', 'A', 'LDTN', 'LDTN', 'I', 'LDTN'],
  by: ['MBP', 'A', 'I'],
  ready: ['LDTN', 'E', 'LDTN', 'I'],
  system: ['SZ', 'I', 'SZ', 'LDTN', 'E', 'MBP'],
  active: ['A', 'LDTN', 'LDTN', 'I', 'FV'],
};

const DIGIT_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
];

const TEEN_WORDS = [
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS_WORDS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

/**
 * Convert an integer (0 - 999999) into spoken words so numeric strings
 * produce natural mouth articulation.
 */
function numberToSpokenWords(numStr) {
  const n = parseInt(numStr, 10);
  if (Number.isNaN(n)) return numStr;
  if (n < 0) return `minus ${numberToSpokenWords(String(Math.abs(n)))}`;
  if (n < 10) return DIGIT_WORDS[n];
  if (n < 20) return TEEN_WORDS[n - 10];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;
    return rem === 0 ? TENS_WORDS[tens] : `${TENS_WORDS[tens]} ${DIGIT_WORDS[rem]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    return rem === 0
      ? `${DIGIT_WORDS[hundreds]} hundred`
      : `${DIGIT_WORDS[hundreds]} hundred and ${numberToSpokenWords(String(rem))}`;
  }
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    return rem === 0
      ? `${numberToSpokenWords(String(thousands))} thousand`
      : `${numberToSpokenWords(String(thousands))} thousand ${numberToSpokenWords(String(rem))}`;
  }
  return numStr
    .split('')
    .map((d) => DIGIT_WORDS[parseInt(d, 10)] || d)
    .join(' ');
}

const ABBREVIATION_MAP = {
  dr: 'doctor',
  mr: 'mister',
  mrs: 'missus',
  ms: 'miz',
  prof: 'professor',
  st: 'saint',
  vs: 'versus',
  etc: 'et cetera',
  eg: 'for example',
  ie: 'that is',
  ai: 'ay eye',
  hud: 'aitch you dee',
  sse: 'ess ess ee',
  api: 'ay pee eye',
  ui: 'you eye',
  uk: 'you kay',
  gb: 'gee bee',
  us: 'you ess',
  cpu: 'see pee you',
  gpu: 'gee pee you',
  fps: 'frames per second',
};

/**
 * Convert a single cleaned word into an ordered sequence of canonical viseme codes.
 * Uses British English (`en-GB`) pronunciation rules by default, with American English (`en-US`)
 * adjustments when a non-British voice locale is specified.
 */
export function wordToVisemes(rawWord, { locale = 'en-GB' } = {}) {
  if (!rawWord || typeof rawWord !== 'string') return [];

  const isBritish =
    !locale ||
    locale.toLowerCase().includes('gb') ||
    locale.toLowerCase().includes('uk') ||
    locale.toLowerCase().includes('au') ||
    locale.toLowerCase().includes('nz');

  // Strip surrounding punctuation, preserve internal apostrophes first
  const cleaned = rawWord
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/['’]/g, '');

  if (!cleaned) return [];

  // Pure number token
  if (/^\d+$/.test(cleaned)) {
    const spoken = numberToSpokenWords(cleaned);
    const subWords = spoken.split(/\s+/);
    const seq = [];
    for (const sw of subWords) {
      seq.push(...wordToVisemes(sw, { locale }));
    }
    return seq;
  }

  // Known abbreviation
  if (ABBREVIATION_MAP[cleaned]) {
    const expanded = ABBREVIATION_MAP[cleaned].split(/\s+/);
    const seq = [];
    for (const sw of expanded) {
      seq.push(...wordToVisemes(sw, { locale }));
    }
    return seq;
  }

  // Direct lexicon hit
  if (BRITISH_LEXICON[cleaned]) {
    const lex = [...BRITISH_LEXICON[cleaned]];
    // If American English locale is explicitly active, adjust LOT-vowel & non-rhotic words
    if (!isBritish) {
      if (cleaned === 'mom') return ['MBP', 'A', 'MBP'];
      if (cleaned === 'are') return ['A', 'LDTN'];
      if (cleaned === 'core') return ['LDTN', 'O', 'LDTN'];
      if (cleaned === 'four') return ['FV', 'O', 'LDTN'];
      if (cleaned === 'water') return ['U', 'O', 'LDTN', 'E', 'LDTN'];
      if (cleaned === 'better') return ['MBP', 'E', 'LDTN', 'E', 'LDTN'];
    }
    return lex;
  }

  // Rule-based Grapheme-to-Viseme Parser
  const visemes = [];
  const len = cleaned.length;

  // Detect magic-e (silent trailing 'e' after consonant preceded by vowel, e.g., "made", "move", "chose", "time")
  const hasSilentFinalE =
    len >= 3 &&
    cleaned[len - 1] === 'e' &&
    !'aeiouy'.includes(cleaned[len - 2]) &&
    /[aeiouy]/.test(cleaned.slice(0, len - 2));

  const effectiveLen = hasSilentFinalE ? len - 1 : len;

  let i = 0;
  while (i < effectiveLen) {
    const ch = cleaned[i];
    const next = i + 1 < effectiveLen ? cleaned[i + 1] : '';
    const next2 = i + 2 < effectiveLen ? cleaned[i + 2] : '';
    const pair = ch + next;
    const triad = ch + next + next2;

    // Skip duplicate adjacent consonant letters (e.g., "ll", "ss", "tt", "mm", "pp", "bb", "ff")
    if (
      next === ch &&
      !'aeiou'.includes(ch) &&
      pair !== 'oo' &&
      pair !== 'ee'
    ) {
      i += 1;
      continue;
    }

    // Trigraphs
    if (triad === 'tch' || triad === 'dge') {
      visemes.push(VISEME_CODES.SH);
      i += 3;
      continue;
    }
    if (triad === 'igh') {
      visemes.push(VISEME_CODES.A, VISEME_CODES.I);
      i += 3;
      continue;
    }
    if (triad === 'ion' || triad === 'ian') {
      visemes.push(VISEME_CODES.E, VISEME_CODES.LDTN);
      i += 3;
      continue;
    }
    if (triad === 'ous') {
      visemes.push(VISEME_CODES.E, VISEME_CODES.SZ);
      i += 3;
      continue;
    }
    if (triad === 'are' || triad === 'air' || triad === 'ear') {
      visemes.push(VISEME_CODES.E);
      if (!isBritish) visemes.push(VISEME_CODES.LDTN);
      i += 3;
      continue;
    }

    // Digraphs — Consonants
    if (pair === 'th') {
      visemes.push(VISEME_CODES.TH);
      i += 2;
      continue;
    }
    if (pair === 'sh' || pair === 'ch' || pair === 'zh') {
      visemes.push(VISEME_CODES.SH);
      i += 2;
      continue;
    }
    if (pair === 'ph') {
      visemes.push(VISEME_CODES.FV);
      i += 2;
      continue;
    }
    if (pair === 'wh') {
      visemes.push(VISEME_CODES.U);
      i += 2;
      continue;
    }
    if (pair === 'qu') {
      visemes.push(VISEME_CODES.LDTN, VISEME_CODES.U);
      i += 2;
      continue;
    }
    if (pair === 'ck' || pair === 'ng' || pair === 'nk') {
      visemes.push(VISEME_CODES.LDTN);
      i += 2;
      continue;
    }
    if (pair === 'kn' || pair === 'gn' || pair === 'wr') {
      // Silent initial k/g/w before n/r
      visemes.push(VISEME_CODES.LDTN);
      i += 2;
      continue;
    }
    if (pair === 'gh') {
      // Silent mid/final gh (e.g., "though", "through", "night")
      i += 2;
      continue;
    }

    // Digraphs — Vowels & R-controlled vowels
    if (pair === 'ee' || pair === 'ea' || pair === 'ie') {
      visemes.push(VISEME_CODES.I);
      i += 2;
      continue;
    }
    if (pair === 'oo') {
      visemes.push(VISEME_CODES.U);
      i += 2;
      continue;
    }
    if (pair === 'ou' || pair === 'ow') {
      visemes.push(VISEME_CODES.A, VISEME_CODES.U);
      i += 2;
      continue;
    }
    if (pair === 'oi' || pair === 'oy') {
      visemes.push(VISEME_CODES.O, VISEME_CODES.I);
      i += 2;
      continue;
    }
    if (pair === 'ai' || pair === 'ay' || pair === 'ei' || pair === 'ey') {
      visemes.push(VISEME_CODES.E, VISEME_CODES.I);
      i += 2;
      continue;
    }
    if (pair === 'oa' || pair === 'oe') {
      visemes.push(VISEME_CODES.O, VISEME_CODES.U);
      i += 2;
      continue;
    }
    if (pair === 'au' || pair === 'aw') {
      visemes.push(VISEME_CODES.O);
      i += 2;
      continue;
    }
    if (pair === 'eu' || pair === 'ew') {
      visemes.push(VISEME_CODES.I, VISEME_CODES.U);
      i += 2;
      continue;
    }
    if (pair === 'ar') {
      visemes.push(VISEME_CODES.A);
      // British English non-rhotic unless followed by a vowel
      if (!isBritish || 'aeiouy'.includes(next2)) {
        visemes.push(VISEME_CODES.LDTN);
      }
      i += 2;
      continue;
    }
    if (pair === 'or') {
      visemes.push(VISEME_CODES.O);
      if (!isBritish || 'aeiouy'.includes(next2)) {
        visemes.push(VISEME_CODES.LDTN);
      }
      i += 2;
      continue;
    }
    if (pair === 'er' || pair === 'ir' || pair === 'ur') {
      visemes.push(VISEME_CODES.E);
      if (!isBritish || 'aeiouy'.includes(next2)) {
        visemes.push(VISEME_CODES.LDTN);
      }
      i += 2;
      continue;
    }

    // Single letters — Vowels (considering magic-e lengthening)
    if (ch === 'a') {
      if (hasSilentFinalE && i === effectiveLen - 2) {
        visemes.push(VISEME_CODES.E, VISEME_CODES.I); // "make", "take", "rate"
      } else {
        visemes.push(VISEME_CODES.A);
      }
      i += 1;
      continue;
    }
    if (ch === 'e') {
      if (hasSilentFinalE && i === effectiveLen - 2) {
        visemes.push(VISEME_CODES.I);
      } else {
        visemes.push(VISEME_CODES.E);
      }
      i += 1;
      continue;
    }
    if (ch === 'i') {
      if (hasSilentFinalE && i === effectiveLen - 2) {
        visemes.push(VISEME_CODES.A, VISEME_CODES.I); // "time", "line", "like"
      } else {
        visemes.push(VISEME_CODES.I);
      }
      i += 1;
      continue;
    }
    if (ch === 'o') {
      if (hasSilentFinalE && i === effectiveLen - 2) {
        visemes.push(VISEME_CODES.O, VISEME_CODES.U); // "code", "mode", "home", "note"
      } else {
        // In British English, short 'o' (LOT vowel) is rounded 'O'; in US English it leans 'A'/'O'
        visemes.push(isBritish ? VISEME_CODES.O : VISEME_CODES.A);
      }
      i += 1;
      continue;
    }
    if (ch === 'u') {
      if (hasSilentFinalE && i === effectiveLen - 2) {
        visemes.push(VISEME_CODES.U); // "rule", "tune", "use"
      } else {
        visemes.push(VISEME_CODES.A); // short 'u' as in "cup", "run", "sun"
      }
      i += 1;
      continue;
    }
    if (ch === 'y') {
      if (i === 0) {
        visemes.push(VISEME_CODES.I); // "yes", "yet"
      } else if (i === effectiveLen - 1 && len <= 3) {
        visemes.push(VISEME_CODES.A, VISEME_CODES.I); // "my", "try", "fly"
      } else {
        visemes.push(VISEME_CODES.I); // "system", "happy"
      }
      i += 1;
      continue;
    }

    // Single letters — Consonants
    if (ch === 'm' || ch === 'b' || ch === 'p') {
      visemes.push(VISEME_CODES.MBP);
      i += 1;
      continue;
    }
    if (ch === 'f' || ch === 'v') {
      visemes.push(VISEME_CODES.FV);
      i += 1;
      continue;
    }
    if (ch === 's' || ch === 'z') {
      visemes.push(VISEME_CODES.SZ);
      i += 1;
      continue;
    }
    if (ch === 'c') {
      if (next === 'e' || next === 'i' || next === 'y') {
        visemes.push(VISEME_CODES.SZ);
      } else {
        visemes.push(VISEME_CODES.LDTN);
      }
      i += 1;
      continue;
    }
    if (ch === 'g') {
      if (next === 'e' || next === 'i' || next === 'y') {
        visemes.push(VISEME_CODES.SH);
      } else {
        visemes.push(VISEME_CODES.LDTN);
      }
      i += 1;
      continue;
    }
    if (ch === 'j') {
      visemes.push(VISEME_CODES.SH);
      i += 1;
      continue;
    }
    if (ch === 'w') {
      visemes.push(VISEME_CODES.U);
      i += 1;
      continue;
    }
    if (ch === 'x') {
      visemes.push(VISEME_CODES.LDTN, VISEME_CODES.SZ);
      i += 1;
      continue;
    }
    if (
      ch === 'l' ||
      ch === 'd' ||
      ch === 't' ||
      ch === 'n' ||
      ch === 'r' ||
      ch === 'k' ||
      ch === 'h'
    ) {
      // Non-rhotic British English drops word-final 'r'
      if (ch === 'r' && isBritish && i === effectiveLen - 1) {
        i += 1;
        continue;
      }
      visemes.push(VISEME_CODES.LDTN);
      i += 1;
      continue;
    }

    i += 1;
  }

  // Coalesce identical consecutive viseme codes within a word so rapid speech stays clean
  const deduplicated = [];
  for (const v of visemes) {
    if (deduplicated.length === 0 || deduplicated[deduplicated.length - 1] !== v) {
      deduplicated.push(v);
    }
  }

  return deduplicated.length > 0 ? deduplicated : [VISEME_CODES.LDTN];
}

/**
 * Base duration (in ms at 1.0x speech rate) for each viseme class.
 * Vowels hold slightly longer than plosive/bilabial consonants for natural cadence.
 */
const VISEME_BASE_DURATION_MS = {
  [VISEME_CODES.REST]: 120,
  [VISEME_CODES.A]: 92,
  [VISEME_CODES.E]: 84,
  [VISEME_CODES.I]: 80,
  [VISEME_CODES.O]: 90,
  [VISEME_CODES.U]: 82,
  [VISEME_CODES.MBP]: 62,
  [VISEME_CODES.FV]: 68,
  [VISEME_CODES.LDTN]: 60,
  [VISEME_CODES.TH]: 70,
  [VISEME_CODES.SZ]: 72,
  [VISEME_CODES.SH]: 74,
};

/**
 * Pause duration (in ms at 1.0x speech rate) for punctuation characters.
 */
function getPunctuationPauseMs(punct) {
  if (!punct) return 0;
  if (punct.includes('...') || punct.includes('…')) return 340;
  if (/[.!?]/.test(punct)) return 280;
  if (/[;:]/.test(punct)) return 210;
  if (/[,—–-]/.test(punct)) return 150;
  if (/\n/.test(punct)) return 260;
  return 0;
}

/**
 * Build a complete timed viseme cue timeline for an utterance.
 *
 * Supports:
 * - Option A: Explicit timestamped alignment (`options.alignment`), where each item has
 *   `{ startMs (or timeMs), durationMs (or endMs), phoneme / viseme, word, charIndex }`.
 * - Option C + Word Boundary Anchoring: Decomposes `text` into words and punctuation pauses,
 *   tracking each word's exact `charIndex` in `text` so `SpeechSynthesisUtterance.onboundary`
 *   events can re-synchronize playback in real time.
 */
export function buildVisemeTimeline(
  text,
  {
    utteranceId = 'utt-0',
    rate = 1.0,
    locale = 'en-GB',
    alignment = null,
  } = {}
) {
  const safeRate = Math.max(0.5, Math.min(rate || 1.0, 2.5));
  const cues = [];
  const wordAnchors = [];

  // Option A: Explicit timestamped phoneme/viseme alignment metadata provided
  if (Array.isArray(alignment) && alignment.length > 0) {
    let cursorMs = 0;
    alignment.forEach((item, idx) => {
      const startMs =
        typeof item.startMs === 'number'
          ? item.startMs
          : typeof item.timeMs === 'number'
          ? item.timeMs
          : cursorMs;
      const durationMs =
        typeof item.durationMs === 'number'
          ? Math.max(20, item.durationMs)
          : typeof item.endMs === 'number' && item.endMs > startMs
          ? item.endMs - startMs
          : 80;
      const endMs = startMs + durationMs;

      // Insert REST cue if there is a gap > 60ms between aligned cues
      if (startMs - cursorMs > 60) {
        cues.push({
          id: `${utteranceId}-gap-${idx}`,
          utteranceId,
          viseme: VISEME_CODES.REST,
          pose: VISEME_POSES[VISEME_CODES.REST],
          startMs: cursorMs,
          endMs: startMs,
          durationMs: startMs - cursorMs,
          charIndex: item.charIndex ?? 0,
          word: '',
          intensity: 0,
          isPause: true,
        });
      }

      const viseme = mapSoundToViseme(item.viseme || item.phoneme || item.sound);
      const pose = VISEME_POSES[viseme] || VISEME_POSES[VISEME_CODES.REST];
      const isPause = viseme === VISEME_CODES.REST;
      const intensity =
        typeof item.intensity === 'number'
          ? Math.max(0, Math.min(1, item.intensity))
          : pose.baseEnergy;

      cues.push({
        id: `${utteranceId}-align-${idx}`,
        utteranceId,
        viseme,
        pose,
        startMs,
        endMs,
        durationMs,
        charIndex: item.charIndex ?? 0,
        word: item.word || '',
        intensity: isPause ? 0 : intensity,
        isPause,
      });

      cursorMs = endMs;
    });

    // Final trailing rest
    cues.push({
      id: `${utteranceId}-end`,
      utteranceId,
      viseme: VISEME_CODES.REST,
      pose: VISEME_POSES[VISEME_CODES.REST],
      startMs: cursorMs,
      endMs: cursorMs + 120,
      durationMs: 120,
      charIndex: text ? text.length : 0,
      word: '',
      intensity: 0,
      isPause: true,
    });

    return {
      utteranceId,
      mode: 'timestamped_alignment',
      cues,
      wordAnchors,
      totalDurationMs: cursorMs,
    };
  }

  // Option C + Word-Boundary Re-anchoring from spoken text
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      utteranceId,
      mode: 'estimated_viseme',
      cues: [],
      wordAnchors: [],
      totalDurationMs: 0,
    };
  }

  let cursorMs = 0;
  // Match sequences of non-whitespace tokens along with their exact character index in `text`
  const tokenRegex = /\S+/g;
  let match;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const rawToken = match[0];
    const charIndex = match.index;

    // Extract leading/trailing punctuation and core word(s) (handle hyphenated/slashed words)
    const trailingPunctMatch = rawToken.match(/([.,!?;:—–\-…]+)$/);
    const trailingPunct = trailingPunctMatch ? trailingPunctMatch[1] : '';

    // Split internal hyphens or slashes into sub-tokens while preserving charIndex
    const subParts = rawToken.split(/[-/—–]+/).filter(Boolean);
    const wordStartMs = cursorMs;

    for (let s = 0; s < subParts.length; s++) {
      const part = subParts[s];
      const visemeSeq = wordToVisemes(part, { locale });

      if (visemeSeq.length === 0) continue;

      for (let vIdx = 0; vIdx < visemeSeq.length; vIdx++) {
        const viseme = visemeSeq[vIdx];
        const pose = VISEME_POSES[viseme] || VISEME_POSES[VISEME_CODES.REST];
        const baseDur = VISEME_BASE_DURATION_MS[viseme] || 72;
        // Scale duration by speech rate and slightly compress very long words
        const lengthFactor = visemeSeq.length > 6 ? 0.86 : 1.0;
        const durationMs = Math.max(28, Math.round((baseDur * lengthFactor) / safeRate));
        const startMs = cursorMs;
        const endMs = startMs + durationMs;

        // Primary stressed vowel in the word gets a subtle syllabic pulse boost
        const isVowel = ['A', 'E', 'I', 'O', 'U'].includes(viseme);
        const stressBoost = isVowel && vIdx <= 2 ? 0.08 : 0.0;
        const intensity = Math.min(1.0, pose.baseEnergy + stressBoost);

        cues.push({
          id: `${utteranceId}-w${tokenIdx}-s${s}-v${vIdx}`,
          utteranceId,
          viseme,
          pose,
          startMs,
          endMs,
          durationMs,
          charIndex,
          word: part,
          intensity,
          isPause: false,
          isSyllablePeak: isVowel,
        });

        cursorMs = endMs;
      }
    }

    wordAnchors.push({
      wordIndex: tokenIdx,
      word: rawToken,
      charIndex,
      charLength: rawToken.length,
      startMs: wordStartMs,
      endMs: cursorMs,
    });

    // Brief inter-word coarticulation gap or punctuation pause
    const punctPauseBase = getPunctuationPauseMs(trailingPunct);
    if (punctPauseBase > 0) {
      const pauseDur = Math.max(60, Math.round(punctPauseBase / safeRate));
      cues.push({
        id: `${utteranceId}-pause-${tokenIdx}`,
        utteranceId,
        viseme: VISEME_CODES.REST,
        pose: VISEME_POSES[VISEME_CODES.REST],
        startMs: cursorMs,
        endMs: cursorMs + pauseDur,
        durationMs: pauseDur,
        charIndex: charIndex + rawToken.length,
        word: '',
        intensity: 0,
        isPause: true,
        isSyllablePeak: false,
      });
      cursorMs += pauseDur;
    } else {
      // Micro transition gap between words (22ms scaled)
      cursorMs += Math.max(10, Math.round(22 / safeRate));
    }

    tokenIdx += 1;
  }

  // Final resting cue at the end of the utterance
  cues.push({
    id: `${utteranceId}-end`,
    utteranceId,
    viseme: VISEME_CODES.REST,
    pose: VISEME_POSES[VISEME_CODES.REST],
    startMs: cursorMs,
    endMs: cursorMs + 140,
    durationMs: 140,
    charIndex: text.length,
    word: '',
    intensity: 0,
    isPause: true,
    isSyllablePeak: false,
  });

  return {
    utteranceId,
    mode: 'estimated_viseme',
    cues,
    wordAnchors,
    totalDurationMs: cursorMs,
  };
}

/**
 * Evaluate a viseme timeline at a given playback timestamp `elapsedMs` (relative to utterance start).
 * Returns the active viseme code, smoothly interpolated pose, outgoing speech level, and syllable pulse.
 */
export function evaluateTimelineAt(timeline, elapsedMs) {
  if (
    !timeline ||
    !Array.isArray(timeline.cues) ||
    timeline.cues.length === 0 ||
    elapsedMs < 0
  ) {
    return {
      viseme: VISEME_CODES.REST,
      pose: { ...VISEME_POSES[VISEME_CODES.REST] },
      speechLevel: 0,
      speechPulse: 0,
      isPause: true,
      completed: false,
      activeCue: null,
    };
  }

  const { cues, totalDurationMs } = timeline;

  if (elapsedMs > totalDurationMs + 120) {
    return {
      viseme: VISEME_CODES.REST,
      pose: { ...VISEME_POSES[VISEME_CODES.REST] },
      speechLevel: 0,
      speechPulse: 0,
      isPause: true,
      completed: true,
      activeCue: null,
    };
  }

  // Find active cue containing elapsedMs (or the closest preceding cue during micro inter-word gaps)
  let activeIdx = -1;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (elapsedMs >= c.startMs && elapsedMs <= c.endMs) {
      activeIdx = i;
      break;
    }
    if (elapsedMs > c.endMs && (i === cues.length - 1 || elapsedMs < cues[i + 1].startMs)) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx === -1) {
    return {
      viseme: VISEME_CODES.REST,
      pose: { ...VISEME_POSES[VISEME_CODES.REST] },
      speechLevel: 0,
      speechPulse: 0,
      isPause: true,
      completed: false,
      activeCue: null,
    };
  }

  const activeCue = cues[activeIdx];
  const prevCue = activeIdx > 0 ? cues[activeIdx - 1] : null;
  const prevPose = prevCue ? prevCue.pose : VISEME_POSES[VISEME_CODES.REST];

  // Smooth coarticulation ramp over the first 35% of the cue (capped at 42ms so rapid speech stays crisp)
  const rampDuration = Math.min(42, Math.max(12, activeCue.durationMs * 0.35));
  const localElapsed = Math.max(0, elapsedMs - activeCue.startMs);
  const blendT = Math.min(1.0, localElapsed / rampDuration);

  const pose = interpolateVisemePose(prevPose, activeCue.pose, blendT);

  // Envelope within the phoneme so syllable energy peaks near the center of the vowel
  const progress = Math.max(0, Math.min(1, localElapsed / Math.max(1, activeCue.durationMs)));
  const syllableEnvelope = Math.sin(progress * Math.PI);
  const speechLevel = activeCue.isPause
    ? 0
    : Math.max(0.08, Math.min(1.0, activeCue.intensity * (0.72 + 0.28 * syllableEnvelope)));

  const speechPulse =
    !activeCue.isPause && activeCue.isSyllablePeak && progress > 0.15 && progress < 0.65
      ? activeCue.intensity
      : 0;

  return {
    viseme: activeCue.viseme,
    pose,
    speechLevel,
    speechPulse,
    isPause: !!activeCue.isPause,
    completed: false,
    activeCue,
  };
}

/**
 * Stateful playback-synchronized controller that manages the active utterance timeline,
 * word-boundary clock re-anchoring, pause/resume handling, and stale-utterance isolation.
 */
export class LipsyncTimelineController {
  constructor() {
    this.activeUtteranceId = null;
    this.timeline = null;
    this.startTimestampMs = null;
    this.pausedAtMs = null;
    this.clockSkewOffsetMs = 0;
    this.isPlaying = false;
    this.isPaused = false;
  }

  /**
   * Prepare a new utterance timeline and invalidate any prior utterance.
   */
  prepare(text, options = {}) {
    const utteranceId =
      options.utteranceId || `utt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.activeUtteranceId = utteranceId;
    this.timeline = buildVisemeTimeline(text, { ...options, utteranceId });
    this.startTimestampMs = null;
    this.pausedAtMs = null;
    this.clockSkewOffsetMs = 0;
    this.isPlaying = false;
    this.isPaused = false;
    return this.timeline;
  }

  /**
   * Start playback clock for the given utteranceId.
   * Returns false if utteranceId is stale.
   */
  start(utteranceId, nowMs = performance.now()) {
    if (utteranceId && utteranceId !== this.activeUtteranceId) {
      return false;
    }
    this.startTimestampMs = nowMs;
    this.pausedAtMs = null;
    this.clockSkewOffsetMs = 0;
    this.isPlaying = true;
    this.isPaused = false;
    return true;
  }

  /**
   * Re-anchor timeline clock when browser `SpeechSynthesisUtterance.onboundary` fires for a word.
   * This prevents cumulative timing drift between estimated phoneme durations and actual browser TTS audio.
   */
  onWordBoundary(utteranceId, charIndex, nowMs = performance.now()) {
    if (!this.isPlaying || (utteranceId && utteranceId !== this.activeUtteranceId)) {
      return false;
    }
    if (!this.timeline || !Array.isArray(this.timeline.wordAnchors)) {
      return false;
    }

    // Find matching or closest word anchor by charIndex
    const anchor = this.timeline.wordAnchors.find(
      (w) => charIndex >= w.charIndex && charIndex <= w.charIndex + w.charLength
    );
    if (!anchor) return false;

    if (this.startTimestampMs === null) {
      this.startTimestampMs = nowMs;
    }
    const rawElapsed = nowMs - this.startTimestampMs;
    this.clockSkewOffsetMs = anchor.startMs - rawElapsed;
    this.timeline.mode = 'word_boundary_aligned';
    return true;
  }

  pause(utteranceId, nowMs = performance.now()) {
    if (!this.isPlaying || (utteranceId && utteranceId !== this.activeUtteranceId)) {
      return false;
    }
    this.isPaused = true;
    this.pausedAtMs = nowMs;
    return true;
  }

  resume(utteranceId, nowMs = performance.now()) {
    if (!this.isPlaying || (utteranceId && utteranceId !== this.activeUtteranceId)) {
      return false;
    }
    if (this.isPaused && this.pausedAtMs !== null && this.startTimestampMs !== null) {
      this.startTimestampMs += nowMs - this.pausedAtMs;
    }
    this.isPaused = false;
    this.pausedAtMs = null;
    return true;
  }

  /**
   * Sample the current mouth pose and speech activity at `nowMs`.
   */
  sample(nowMs = performance.now(), utteranceId = null) {
    if (utteranceId && utteranceId !== this.activeUtteranceId) {
      return {
        utteranceId: this.activeUtteranceId,
        viseme: VISEME_CODES.REST,
        pose: { ...VISEME_POSES[VISEME_CODES.REST] },
        speechLevel: 0,
        speechPulse: 0,
        isPause: true,
        isSpeaking: false,
      };
    }

    if (!this.isPlaying || !this.timeline || this.startTimestampMs === null) {
      return {
        utteranceId: this.activeUtteranceId,
        viseme: VISEME_CODES.REST,
        pose: { ...VISEME_POSES[VISEME_CODES.REST] },
        speechLevel: 0,
        speechPulse: 0,
        isPause: true,
        isSpeaking: false,
      };
    }

    if (this.isPaused) {
      return {
        utteranceId: this.activeUtteranceId,
        viseme: VISEME_CODES.REST,
        pose: { ...VISEME_POSES[VISEME_CODES.REST] },
        speechLevel: 0,
        speechPulse: 0,
        isPause: true,
        isSpeaking: true,
      };
    }

    const effectiveElapsedMs = Math.max(
      0,
      nowMs - this.startTimestampMs + this.clockSkewOffsetMs
    );
    const evaluated = evaluateTimelineAt(this.timeline, effectiveElapsedMs);

    return {
      utteranceId: this.activeUtteranceId,
      viseme: evaluated.viseme,
      pose: evaluated.pose,
      speechLevel: evaluated.speechLevel,
      speechPulse: evaluated.speechPulse,
      isPause: evaluated.isPause,
      activeCue: evaluated.activeCue,
      elapsedMs: effectiveElapsedMs,
      isSpeaking: true,
    };
  }

  /**
   * Immediately cancel or finish the current utterance and clear all pending cues.
   */
  stop(utteranceId = null) {
    if (utteranceId && utteranceId !== this.activeUtteranceId) {
      return false;
    }
    this.activeUtteranceId = null;
    this.timeline = null;
    this.startTimestampMs = null;
    this.pausedAtMs = null;
    this.clockSkewOffsetMs = 0;
    this.isPlaying = false;
    this.isPaused = false;
    return true;
  }
}

export const lipsyncController = new LipsyncTimelineController();
export default lipsyncController;

