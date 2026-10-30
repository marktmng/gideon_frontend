/**
 * Local settings persistence for Gideon Phase 3 preferences.
 * Manages voice, vision, gesture, motion, and hands-free wake word preferences.
 */

const STORAGE_KEY = 'gideon_phase3_preferences';

const DEFAULT_SETTINGS = {
  voiceEnabled: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  selectedVoiceURI: '',
  // Hands-free wake word settings (Phase 5)
  wakeWordEnabled: true,
  wakeWordPhrase: 'both', // 'both' | 'hey_gideon' | 'gideon'
  conversationalMode: true, // Continuous auto-listen after Gideon speaks
  audioCueEnabled: true,
  selectedMicrophoneId: '',
  cameraEnabled: false,
  gestureEnabled: false,
  gestureCooldownMs: 1500,
  confidenceThreshold: 0.70,
  reducedMotion: false,
  gestureMappings: {
    Open_Palm: 'toggle_listening',
    Thumb_Up: 'confirm',
    Thumb_Down: 'reject',
    Closed_Fist: 'stop_speech',
    Victory: 'toggle_camera_preview',
  },
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check system reduced motion
      const prefersReduced = typeof window !== 'undefined' && 
        window.matchMedia && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return {
        ...DEFAULT_SETTINGS,
        reducedMotion: !!prefersReduced,
      };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to persist Gideon settings:', err);
    return settings;
  }
}
