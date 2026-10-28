/**
 * Shared Interaction Controller for Gideon Phase 3 & 4.
 * Acts as the single source of truth coordinating:
 * - Interaction state (idle, listening, processing, speaking, executing, error)
 * - Strictly separated microphone input level (`audioLevel`) vs outgoing AI speech activity (`speechLevel`, `speechPulse`)
 * - Playback-synchronized viseme lipsync state (`currentViseme`, `visemePose`, `visemeTimeline`, `utteranceId`)
 * - Voice input (STT) and output (TTS)
 * - Camera streams and local hand gesture recognition
 * - Immediate interruption and graceful recovery
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import voiceService from './voiceService';
import { VISEME_CODES, getVisemePose } from './lipsyncService';
import cameraService from './cameraService';
import gestureService from './gestureService';
import { loadSettings, saveSettings } from './settingsStorage';

export const INTERACTION_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  EXECUTING: 'executing',
  ERROR: 'error',
};

export function useInteractionController({
  onSendMessage,
  onHaltGeneration,
  activeTask = null,
}) {
  const [settings, setSettings] = useState(loadSettings);
  const [interactionState, setInteractionState] = useState(INTERACTION_STATES.IDLE);
  // Microphone input level (strictly user STT receptor)
  const [audioLevel, setAudioLevel] = useState(0);
  // Outgoing AI speech signals (strictly Gideon TTS playback)
  const [speechLevel, setSpeechLevel] = useState(0);
  const [speechPulse, setSpeechPulse] = useState(0);
  const [currentViseme, setCurrentViseme] = useState(VISEME_CODES.REST);
  const [visemePose, setVisemePose] = useState(() => getVisemePose(VISEME_CODES.REST));
  const [visemeTimeline, setVisemeTimeline] = useState(null);
  const [utteranceId, setUtteranceId] = useState(null);

  const [interimTranscript, setInterimTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Gideon Neural Core Online. Standing by.');
  const [errorMessage, setErrorMessage] = useState(null);

  // Vision states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [gestureStatus, setGestureStatus] = useState('disabled');
  const [detectedGesture, setDetectedGesture] = useState('None');
  const [gestureConfidence, setGestureConfidence] = useState(0);
  const [lastGestureAction, setLastGestureAction] = useState(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  const videoElementRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);

  // Keep settings synced with storage
  const updateSettings = useCallback((newPrefs) => {
    setSettings((prev) => {
      const updated = saveSettings({ ...prev, ...newPrefs });
      if (newPrefs.gestureMappings) {
        gestureService.setMappings(newPrefs.gestureMappings);
      }
      if (newPrefs.confidenceThreshold !== undefined) {
        gestureService.setConfidenceThreshold(newPrefs.confidenceThreshold);
      }
      if (newPrefs.gestureCooldownMs !== undefined) {
        gestureService.setCooldown(newPrefs.gestureCooldownMs);
      }
      return updated;
    });
  }, []);

  // Subscribe to outgoing speech & viseme lifecycle from voiceService
  useEffect(() => {
    const unsub = voiceService.subscribeSpeech((speechState) => {
      setSpeechLevel(speechState.isSpeaking ? speechState.speechLevel || 0 : 0);
      setSpeechPulse(speechState.isSpeaking ? speechState.speechPulse || 0 : 0);
      setCurrentViseme(speechState.isSpeaking ? speechState.viseme || VISEME_CODES.REST : VISEME_CODES.REST);
      setVisemePose(speechState.visemePose || getVisemePose(VISEME_CODES.REST));
      setVisemeTimeline(speechState.visemeTimeline || null);
      setUtteranceId(speechState.utteranceId || null);
    });
    return unsub;
  }, []);

  // Subscribe to camera service
  useEffect(() => {
    const unsub = cameraService.subscribe((state) => {
      setCameraActive(state.isActive);
      setCameraStream(state.stream);
      setCameraError(state.error);
      if (!state.isActive) {
        gestureService.stopInference();
        setGestureStatus('disabled');
      }
    });
    return unsub;
  }, []);

  // Subscribe to gesture service
  useEffect(() => {
    const unsub = gestureService.subscribe((state) => {
      setGestureStatus(state.status);
      setDetectedGesture(state.gesture);
      setGestureConfidence(state.confidence);
      if (state.lastAction) {
        setLastGestureAction(state.lastAction);
      }
    });
    return unsub;
  }, []);

  // Reflect active tasks in state
  useEffect(() => {
    if (activeTask) {
      setInteractionState(INTERACTION_STATES.EXECUTING);
      setStatusMessage(`Executing directive: ${activeTask.title || 'In progress'}`);
    } else if (
      interactionState === INTERACTION_STATES.EXECUTING &&
      !isSpeakingRef.current &&
      !isListeningRef.current
    ) {
      setInteractionState(INTERACTION_STATES.IDLE);
      setStatusMessage('Gideon Neural Core Online. Standing by.');
    }
  }, [activeTask, interactionState]);

  // Interruption / Stop Speech
  const stopSpeaking = useCallback(() => {
    voiceService.stopSpeaking();
    isSpeakingRef.current = false;
    setSpeechLevel(0);
    setSpeechPulse(0);
    setCurrentViseme(VISEME_CODES.REST);
    setVisemePose(getVisemePose(VISEME_CODES.REST));
    setVisemeTimeline(null);
    setUtteranceId(null);
    setInteractionState((prev) =>
      prev === INTERACTION_STATES.SPEAKING ? INTERACTION_STATES.IDLE : prev
    );
    setStatusMessage('Gideon Neural Core Online. Standing by.');
  }, []);

  // Stop Listening
  const stopListening = useCallback(() => {
    voiceService.stopListening();
    isListeningRef.current = false;
    setAudioLevel(0);
    setInterimTranscript('');
    setInteractionState((prev) =>
      prev === INTERACTION_STATES.LISTENING ? INTERACTION_STATES.IDLE : prev
    );
    setStatusMessage('Gideon Neural Core Online. Standing by.');
  }, []);

  // Universal halt / interrupt
  const handleInterruption = useCallback(() => {
    stopSpeaking();
    stopListening();
    if (onHaltGeneration) {
      onHaltGeneration();
    }
    setInteractionState(INTERACTION_STATES.IDLE);
    setStatusMessage('Session paused by user.');
  }, [stopSpeaking, stopListening, onHaltGeneration]);

  // Voice Input (Push-to-Talk) — strictly user microphone input
  const startListening = useCallback(async () => {
    if (!voiceService.isSpeechRecognitionSupported()) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      setInteractionState(INTERACTION_STATES.ERROR);
      return;
    }

    // Stop speaking if currently speaking
    stopSpeaking();

    setInteractionState(INTERACTION_STATES.LISTENING);
    setStatusMessage('Listening... Speak now.');
    setErrorMessage(null);
    setInterimTranscript('');

    const started = await voiceService.startListening({
      onInterim: (text) => {
        setInterimTranscript(text);
      },
      onFinal: (finalText) => {
        isListeningRef.current = false;
        setInterimTranscript('');
        setAudioLevel(0);
        if (finalText && finalText.trim()) {
          setInteractionState(INTERACTION_STATES.PROCESSING);
          setStatusMessage(`Processing: "${finalText}"`);
          if (onSendMessage) {
            onSendMessage(finalText.trim());
          }
        } else {
          setInteractionState(INTERACTION_STATES.IDLE);
          setStatusMessage('Gideon Neural Core Online. Standing by.');
        }
      },
      onError: (err) => {
        isListeningRef.current = false;
        setAudioLevel(0);
        setInterimTranscript('');
        setErrorMessage(err);
        setInteractionState(INTERACTION_STATES.ERROR);
        setStatusMessage(err);
      },
      onStateChange: (listening) => {
        isListeningRef.current = listening;
        if (!listening && interactionState === INTERACTION_STATES.LISTENING) {
          setInteractionState(INTERACTION_STATES.IDLE);
          setStatusMessage('Gideon Neural Core Online. Standing by.');
        }
      },
      onAudioLevel: (level) => {
        // Microphone RMS strictly updates user receptor `audioLevel`, never `speechLevel`
        setAudioLevel(level);
      },
    });

    if (started) {
      isListeningRef.current = true;
    }
  }, [stopSpeaking, onSendMessage, interactionState]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current || interactionState === INTERACTION_STATES.LISTENING) {
      stopListening();
    } else {
      startListening();
    }
  }, [interactionState, startListening, stopListening]);

  // Voice Output (Speak completed response with synchronized viseme timeline)
  const speakResponse = useCallback(
    (text, alignment = null) => {
      if (!settings.voiceEnabled || !voiceService.isSpeechSynthesisSupported() || !text) {
        return;
      }

      setInteractionState(INTERACTION_STATES.SPEAKING);
      setStatusMessage('Speaking response...');
      isSpeakingRef.current = true;

      voiceService.speak(text, {
        voiceURI: settings.selectedVoiceURI,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        alignment,
        onStart: (startInfo) => {
          isSpeakingRef.current = true;
          if (startInfo?.utteranceId) {
            setUtteranceId(startInfo.utteranceId);
          }
          if (startInfo?.timeline) {
            setVisemeTimeline(startInfo.timeline);
          }
        },
        onEnd: () => {
          isSpeakingRef.current = false;
          setSpeechLevel(0);
          setSpeechPulse(0);
          setCurrentViseme(VISEME_CODES.REST);
          setVisemePose(getVisemePose(VISEME_CODES.REST));
          setVisemeTimeline(null);
          setUtteranceId(null);
          setInteractionState(INTERACTION_STATES.IDLE);
          setStatusMessage('Gideon Neural Core Online. Standing by.');
        },
        onError: (err) => {
          isSpeakingRef.current = false;
          setSpeechLevel(0);
          setSpeechPulse(0);
          setCurrentViseme(VISEME_CODES.REST);
          setVisemePose(getVisemePose(VISEME_CODES.REST));
          setVisemeTimeline(null);
          setUtteranceId(null);
          console.warn('Voice output notice:', err);
          setInteractionState(INTERACTION_STATES.IDLE);
          setStatusMessage('Gideon Neural Core Online. Standing by.');
        },
      });
    },
    [settings]
  );

  // Gesture Action Dispatcher
  const handleGestureAction = useCallback(
    (action) => {
      switch (action) {
        case 'toggle_listening':
          toggleListening();
          break;
        case 'stop_speech':
          stopSpeaking();
          break;
        case 'confirm':
          // Security policy: Gestures are strictly prohibited from authorizing sensitive operations or desktop directives.
          console.info(
            'Security Policy: Gesture authorization of sensitive actions is strictly prohibited.'
          );
          break;
        case 'reject':
          handleInterruption();
          break;
        case 'toggle_camera_preview':
          setShowCameraPreview((prev) => !prev);
          break;
        default:
          break;
      }
    },
    [toggleListening, stopSpeaking, handleInterruption]
  );

  // Camera Management
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      await cameraService.startCamera();
      setShowCameraPreview(true);
    } catch (err) {
      setCameraError(err.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraService.stopCamera();
    setShowCameraPreview(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraActive, startCamera, stopCamera]);

  // Gesture Recognition Management
  const startGestureRecognition = useCallback(
    async (videoEl) => {
      const el = videoEl || videoElementRef.current;
      if (!el) return;
      await gestureService.initRecognizer();
      gestureService.startInference(el, (action, gesture) => {
        handleGestureAction(action, gesture);
      });
    },
    [handleGestureAction]
  );

  const stopGestureRecognition = useCallback(() => {
    gestureService.stopInference();
  }, []);

  // Update interaction state when processing starts/ends externally
  const setProcessing = useCallback(
    (processing, query = '') => {
      if (processing) {
        setInteractionState(INTERACTION_STATES.PROCESSING);
        setStatusMessage(query ? `Thinking: "${query}"` : 'Synthesizing response...');
      } else if (
        !isSpeakingRef.current &&
        !isListeningRef.current &&
        !activeTask
      ) {
        setInteractionState(INTERACTION_STATES.IDLE);
        setStatusMessage('Gideon Neural Core Online. Standing by.');
      }
    },
    [activeTask]
  );

  return {
    state: interactionState,
    // Microphone input level (strictly user listening)
    audioLevel,
    // Outgoing AI speech signals & viseme lipsync state
    speechLevel,
    speechPulse,
    currentViseme,
    visemePose,
    visemeTimeline,
    utteranceId,

    interimTranscript,
    statusMessage,
    errorMessage,
    settings,
    updateSettings,

    // Voice controls
    isListening: isListeningRef.current,
    isSpeaking: isSpeakingRef.current,
    startListening,
    stopListening,
    toggleListening,
    speakResponse,
    stopSpeaking,
    handleInterruption,
    setProcessing,

    // Camera & Vision controls
    cameraActive,
    cameraStream,
    cameraError,
    showCameraPreview,
    setShowCameraPreview,
    toggleCamera,
    startCamera,
    stopCamera,
    videoElementRef,

    // Gesture controls
    gestureStatus,
    detectedGesture,
    gestureConfidence,
    lastGestureAction,
    startGestureRecognition,
    stopGestureRecognition,
  };
}

export default useInteractionController;
