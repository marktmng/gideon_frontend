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
import wakeWordService, {
  WAKE_PHRASE_OPTIONS,
  WAKE_WORD_STATES,
} from './wakeWordService';
import { VISEME_CODES, getVisemePose } from './lipsyncService';
import cameraService from './cameraService';
import gestureService from './gestureService';
import streamingSpeechQueue from './streamingSpeechQueue';
import { loadSettings, saveSettings } from './settingsStorage';

export const INTERACTION_STATES = {
  IDLE: 'idle',
  PERMISSION_NEEDED: 'permission_needed',
  STANDBY: 'standby',
  WAKE_DETECTED: 'wake_detected',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  EXECUTING: 'executing',
  INTERRUPTED: 'interrupted',
  MIC_UNAVAILABLE: 'mic_unavailable',
  ERROR: 'error',
};

export function useInteractionController({
  onSendMessage,
  onHaltGeneration,
  activeTask = null,
}) {
  const [settings, setSettings] = useState(loadSettings);
  const [interactionState, setInteractionState] = useState(INTERACTION_STATES.IDLE);
  const [isListeningState, setIsListeningState] = useState(false);
  // Microphone input level (strictly user STT receptor)
  const [audioLevel, setAudioLevel] = useState(0);
  // Outgoing AI speech signals (strictly Gideon TTS playback)
  const [speechLevel, setSpeechLevel] = useState(0);
  const [speechPulse, setSpeechPulse] = useState(0);
  const [currentViseme, setCurrentViseme] = useState(VISEME_CODES.REST);
  const [visemePose, setVisemePose] = useState(() => getVisemePose(VISEME_CODES.REST));
  const [visemeTimeline, setVisemeTimeline] = useState(null);
  const [utteranceId, setUtteranceId] = useState(null);
  const [currentSpokenText, setCurrentSpokenText] = useState('');

  const [interimTranscript, setInterimTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Gideon Neural Core Online. Standing by.');
  const [errorMessage, setErrorMessage] = useState(null);

  // Hands-free Wake Word state
  const [wakeWordState, setWakeWordState] = useState(WAKE_WORD_STATES.DISABLED);

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
  const isProcessingRef = useRef(false);

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
    streamingSpeechQueue.cancel();
    voiceService.stopSpeaking();
    wakeWordService.setSpeakingState(false);
    isSpeakingRef.current = false;
    setCurrentSpokenText('');
    setSpeechLevel(0);
    setSpeechPulse(0);
    setCurrentViseme(VISEME_CODES.REST);
    setVisemePose(getVisemePose(VISEME_CODES.REST));
    setVisemeTimeline(null);
    setUtteranceId(null);
    if (settings.wakeWordEnabled) {
      wakeWordService.resumeStandby();
      setInteractionState(INTERACTION_STATES.STANDBY);
      setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
    } else {
      setInteractionState((prev) =>
        prev === INTERACTION_STATES.SPEAKING ? INTERACTION_STATES.IDLE : prev
      );
      setStatusMessage('Gideon Neural Core Online. Standing by.');
    }
  }, [settings.wakeWordEnabled]);

  // Stop Listening (commits any captured words rather than discarding)
  const stopListening = useCallback((commitPending = true) => {
    if (wakeWordService.isCapturingCommand) {
      wakeWordService.commitManualCapture();
    } else {
      voiceService.stopListening(commitPending);
    }
    isListeningRef.current = false;
    setIsListeningState(false);
    setAudioLevel(0);
    setInterimTranscript('');

    if (settings.wakeWordEnabled) {
      wakeWordService.resumeStandby();
      setInteractionState(INTERACTION_STATES.STANDBY);
      setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
    } else {
      setInteractionState((prev) =>
        prev === INTERACTION_STATES.LISTENING ? INTERACTION_STATES.IDLE : prev
      );
      setStatusMessage('Gideon Neural Core Online. Standing by.');
    }
  }, [settings.wakeWordEnabled]);

  // Universal halt / interrupt
  const handleInterruption = useCallback(() => {
    streamingSpeechQueue.cancel();
    stopSpeaking();
    stopListening(false);
    wakeWordService.setSpeakingState(false);
    if (onHaltGeneration) {
      onHaltGeneration();
    }
    setInteractionState(INTERACTION_STATES.IDLE);
    setStatusMessage('Session paused by user.');
    if (settings.wakeWordEnabled) {
      setTimeout(() => {
        wakeWordService.resumeStandby();
        setInteractionState(INTERACTION_STATES.STANDBY);
        setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
      }, 700);
    }
  }, [stopSpeaking, stopListening, onHaltGeneration, settings.wakeWordEnabled]);

  // Voice Input (Push-to-Talk or Wake-Word Followup) — strictly user microphone input
  const startListening = useCallback(async () => {
    if (!voiceService.isSpeechRecognitionSupported()) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      setInteractionState(INTERACTION_STATES.ERROR);
      return;
    }

    // Stop speaking if currently speaking
    stopSpeaking();

    // Pause wake word detector while capturing active user speech
    wakeWordService.pauseStandby();

    // Play instant acoustic chime cue (like Siri)
    wakeWordService.playWakeChime();

    setInteractionState(INTERACTION_STATES.LISTENING);
    setStatusMessage('Listening to your voice... Speak your command now.');
    setErrorMessage(null);
    setInterimTranscript('');
    isListeningRef.current = true;
    setIsListeningState(true);

    const started = await voiceService.startListening({
      deviceId: settings.selectedMicrophoneId,
      autoSilenceMs: 1200, // 1200ms natural pause -> auto-commit
      onInterim: (text) => {
        setInterimTranscript(text);
      },
      onFinal: (finalText) => {
        isListeningRef.current = false;
        setIsListeningState(false);
        setInterimTranscript('');
        setAudioLevel(0);
        if (finalText && finalText.trim()) {
          setInteractionState(INTERACTION_STATES.PROCESSING);
          setStatusMessage(`Processing: "${finalText}"`);
          if (onSendMessage) {
            onSendMessage(finalText.trim());
          }
        } else {
          if (settings.wakeWordEnabled) {
            wakeWordService.resumeStandby();
            setInteractionState(INTERACTION_STATES.STANDBY);
            setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
          } else {
            setInteractionState(INTERACTION_STATES.IDLE);
            setStatusMessage('Gideon Neural Core Online. Standing by.');
          }
        }
      },
      onError: (err) => {
        isListeningRef.current = false;
        setIsListeningState(false);
        setAudioLevel(0);
        setInterimTranscript('');
        setErrorMessage(err);
        setInteractionState(INTERACTION_STATES.ERROR);
        setStatusMessage(err);
        if (settings.wakeWordEnabled) {
          setTimeout(() => {
            wakeWordService.resumeStandby();
            setInteractionState(INTERACTION_STATES.STANDBY);
          }, 1500);
        }
      },
      onStateChange: (listening) => {
        isListeningRef.current = listening;
        setIsListeningState(listening);
        if (!listening) {
          setInteractionState((prev) => {
            if (prev === INTERACTION_STATES.LISTENING) {
              if (settings.wakeWordEnabled) {
                wakeWordService.resumeStandby();
                setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
                return INTERACTION_STATES.STANDBY;
              }
              setStatusMessage('Gideon Neural Core Online. Standing by.');
              return INTERACTION_STATES.IDLE;
            }
            return prev;
          });
        }
      },
      onAudioLevel: (level) => {
        // Microphone RMS strictly updates user receptor `audioLevel`, never `speechLevel`
        setAudioLevel(level);
      },
    });

    if (!started) {
      isListeningRef.current = false;
      setIsListeningState(false);
    }
  }, [stopSpeaking, onSendMessage, settings.selectedMicrophoneId, settings.wakeWordEnabled]);

  const toggleListening = useCallback(async () => {
    if (isListeningRef.current || isListeningState || interactionState === INTERACTION_STATES.LISTENING) {
      stopListening(true);
    } else if (settings.wakeWordEnabled && wakeWordService.isActive) {
      // Coordinated pipeline: trigger command capture on active wake-word stream without audio re-initialization
      stopSpeaking();
      wakeWordService.triggerManualCapture();
      setInteractionState(INTERACTION_STATES.LISTENING);
      setStatusMessage('Listening to your voice... Speak your command now.');
      setIsListeningState(true);
      isListeningRef.current = true;
    } else {
      await startListening();
    }
  }, [interactionState, isListeningState, settings.wakeWordEnabled, startListening, stopListening, stopSpeaking]);

  // Conversational Talking Loop: Automatically resume listening after Gideon answers
  const scheduleConversationalTurn = useCallback(() => {
    if (settings.conversationalMode !== false && settings.voiceEnabled) {
      setTimeout(() => {
        if (!isSpeakingRef.current && !isProcessingRef.current && !activeTask) {
          startListening();
        }
      }, 400);
    } else if (settings.wakeWordEnabled) {
      wakeWordService.resumeStandby();
      setInteractionState(INTERACTION_STATES.STANDBY);
      setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
    } else {
      setInteractionState(INTERACTION_STATES.IDLE);
      setStatusMessage('Gideon Neural Core Online. Standing by.');
    }
  }, [settings.conversationalMode, settings.voiceEnabled, settings.wakeWordEnabled, activeTask, startListening]);

  // Voice Output (Speak completed response with synchronized viseme timeline)
  const speakResponse = useCallback(
    (text, alignment = null) => {
      if (!settings.voiceEnabled || !voiceService.isSpeechSynthesisSupported() || !text) {
        scheduleConversationalTurn();
        return;
      }

      setInteractionState(INTERACTION_STATES.SPEAKING);
      setStatusMessage('Speaking response...');
      isSpeakingRef.current = true;
      wakeWordService.setSpeakingState(true);

      voiceService.speak(text, {
        voiceURI: settings.selectedVoiceURI,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        alignment,
        onStart: (startInfo) => {
          isSpeakingRef.current = true;
          wakeWordService.setSpeakingState(true);
          if (startInfo?.utteranceId) {
            setUtteranceId(startInfo.utteranceId);
          }
          if (startInfo?.timeline) {
            setVisemeTimeline(startInfo.timeline);
          }
        },
        onEnd: () => {
          isSpeakingRef.current = false;
          wakeWordService.setSpeakingState(false);
          setSpeechLevel(0);
          setSpeechPulse(0);
          setCurrentViseme(VISEME_CODES.REST);
          setVisemePose(getVisemePose(VISEME_CODES.REST));
          setVisemeTimeline(null);
          setUtteranceId(null);
          scheduleConversationalTurn();
        },
        onError: (err) => {
          isSpeakingRef.current = false;
          wakeWordService.setSpeakingState(false);
          setSpeechLevel(0);
          setSpeechPulse(0);
          setCurrentViseme(VISEME_CODES.REST);
          setVisemePose(getVisemePose(VISEME_CODES.REST));
          setVisemeTimeline(null);
          setUtteranceId(null);
          console.warn('Voice output notice:', err);
          scheduleConversationalTurn();
        },
      });
    },
    [settings, scheduleConversationalTurn]
  );

  // Streaming Speech (Concurrent sentence-by-sentence TTS and generation)
  const startStreamingSpeech = useCallback(() => {
    if (!settings.voiceEnabled || !voiceService.isSpeechSynthesisSupported()) {
      return;
    }
    // Do not prematurely transition to SPEAKING before first audio chunk is synthesized!
    isSpeakingRef.current = false;
    setCurrentSpokenText('');

    streamingSpeechQueue.startStream({
      voiceURI: settings.selectedVoiceURI,
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      onStart: (startInfo) => {
        isSpeakingRef.current = true;
        wakeWordService.setSpeakingState(true);
        if (startInfo?.utteranceId) {
          setUtteranceId(startInfo.utteranceId);
        }
        if (startInfo?.timeline) {
          setVisemeTimeline(startInfo.timeline);
        }
      },
    });

    streamingSpeechQueue.setCallbacks({
      onSentenceStart: (sentence) => {
        isSpeakingRef.current = true;
        setInteractionState(INTERACTION_STATES.SPEAKING);
        setCurrentSpokenText(sentence || '');
        setStatusMessage('Speaking response...');
      },
      onQueueComplete: () => {
        isSpeakingRef.current = false;
        setCurrentSpokenText('');
        wakeWordService.setSpeakingState(false);
        setSpeechLevel(0);
        setSpeechPulse(0);
        setCurrentViseme(VISEME_CODES.REST);
        setVisemePose(getVisemePose(VISEME_CODES.REST));
        setVisemeTimeline(null);
        setUtteranceId(null);
        scheduleConversationalTurn();
      },
      onInterrupt: () => {
        isSpeakingRef.current = false;
        setCurrentSpokenText('');
        wakeWordService.setSpeakingState(false);
      },
    });
  }, [settings, scheduleConversationalTurn]);

  const feedStreamingDelta = useCallback(
    (delta) => {
      if (!settings.voiceEnabled || !voiceService.isSpeechSynthesisSupported()) {
        return;
      }
      streamingSpeechQueue.feedDelta(delta);
    },
    [settings.voiceEnabled]
  );

  const finishStreamingSpeech = useCallback((fallbackContent = '') => {
    if (settings.voiceEnabled && voiceService.isSpeechSynthesisSupported()) {
      streamingSpeechQueue.finishStream(fallbackContent);
    } else {
      if (settings.wakeWordEnabled) {
        wakeWordService.resumeStandby();
        setInteractionState(INTERACTION_STATES.STANDBY);
        setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
      } else {
        setInteractionState(INTERACTION_STATES.IDLE);
        setStatusMessage('Gideon Neural Core Online. Standing by.');
      }
    }
  }, [settings.voiceEnabled, settings.wakeWordEnabled]);

  const interruptStreamingSpeech = useCallback(() => {
    streamingSpeechQueue.cancel();
    isSpeakingRef.current = false;
    wakeWordService.setSpeakingState(false);
  }, []);

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
        case 'read_active_window':
          if (onSendMessage) {
            onSendMessage('What is open on my screen?');
          }
          break;
        case 'greet_gideon':
          if (onSendMessage) {
            onSendMessage('Hello Gideon!');
          }
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
    [toggleListening, stopSpeaking, handleInterruption, onSendMessage]
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
      isProcessingRef.current = !!processing;
      if (processing) {
        setInteractionState(INTERACTION_STATES.PROCESSING);
        setStatusMessage(query ? `Thinking: "${query}"` : 'Synthesizing response...');
      } else if (
        !isSpeakingRef.current &&
        !isListeningRef.current &&
        !activeTask
      ) {
        if (settings.wakeWordEnabled) {
          wakeWordService.resumeStandby();
          setInteractionState(INTERACTION_STATES.STANDBY);
          setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
        } else {
          setInteractionState(INTERACTION_STATES.IDLE);
          setStatusMessage('Gideon Neural Core Online. Standing by.');
        }
      }
    },
    [activeTask, settings.wakeWordEnabled]
  );

  // Synchronize Wake Word Lifecycle with Settings and System State
  useEffect(() => {
    if (!settings.wakeWordEnabled) {
      wakeWordService.stopStandby();
      setWakeWordState(WAKE_WORD_STATES.DISABLED);
      setInteractionState((prev) => {
        if (prev === INTERACTION_STATES.STANDBY) {
          setStatusMessage('Gideon Neural Core Online. Standing by.');
          return INTERACTION_STATES.IDLE;
        }
        return prev;
      });
      return;
    }

    wakeWordService.configure({
      phrase: settings.wakeWordPhrase || WAKE_PHRASE_OPTIONS.HEY_GIDEON,
      audioCueEnabled: settings.audioCueEnabled !== false,
      selectedDeviceId: settings.selectedMicrophoneId || '',
      onInterim: (text) => {
        setInterimTranscript(text);
      },
      onWakeWordDetected: (detectedPhrase) => {
        setInteractionState(INTERACTION_STATES.WAKE_DETECTED);
        setStatusMessage(`Wake phrase recognized. Gideon listening...`);
        speakResponse("I'm listening. What would you like me to do?");
      },
      onCommandExtracted: (command) => {
        setInterimTranscript('');
        setInteractionState(INTERACTION_STATES.WAKE_DETECTED);
        setStatusMessage(`Directive received: "${command}"`);
        wakeWordService.pauseStandby();
        setInteractionState(INTERACTION_STATES.PROCESSING);
        if (onSendMessage) {
          onSendMessage(command);
        }
      },
      onInterruption: () => {
        handleInterruption();
        setInteractionState(INTERACTION_STATES.INTERRUPTED);
        setStatusMessage('Vocal interrupt acknowledged. Halting playback.');
        setTimeout(() => {
          if (settings.wakeWordEnabled) {
            wakeWordService.resumeStandby();
            setInteractionState(INTERACTION_STATES.STANDBY);
            setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
          }
        }, 800);
      },
      onStateChange: (st) => {
        setWakeWordState(st);
        if (st === WAKE_WORD_STATES.STANDBY) {
          setInteractionState((prev) => {
            if (
              prev === INTERACTION_STATES.IDLE ||
              prev === INTERACTION_STATES.WAKE_DETECTED ||
              prev === INTERACTION_STATES.LISTENING
            ) {
              setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
              return INTERACTION_STATES.STANDBY;
            }
            return prev;
          });
        } else if (st === WAKE_WORD_STATES.LISTENING) {
          setInteractionState(INTERACTION_STATES.LISTENING);
          setStatusMessage('Receptor active. Speak directive now...');
        } else if (st === WAKE_WORD_STATES.WAKE_DETECTED) {
          setInteractionState(INTERACTION_STATES.WAKE_DETECTED);
          setStatusMessage('Wake phrase acknowledged.');
        } else if (st === WAKE_WORD_STATES.PROCESSING) {
          setInteractionState(INTERACTION_STATES.PROCESSING);
          setStatusMessage('Processing directive...');
        } else if (st === WAKE_WORD_STATES.PERMISSION_NEEDED) {
          setInteractionState(INTERACTION_STATES.PERMISSION_NEEDED);
          setStatusMessage('Microphone permission required. Click to authorize.');
        } else if (st === WAKE_WORD_STATES.MIC_UNAVAILABLE) {
          setInteractionState(INTERACTION_STATES.MIC_UNAVAILABLE);
          setStatusMessage('Microphone receptor unavailable.');
        }
      },
      onError: (err) => {
        setErrorMessage(err);
      },
    });

    if (!isSpeakingRef.current && !isListeningRef.current && !isProcessingRef.current && !activeTask) {
      wakeWordService.startStandby();
      setInteractionState((prev) => (prev === INTERACTION_STATES.IDLE ? INTERACTION_STATES.STANDBY : prev));
      setStatusMessage('Gideon Core Standby. Awaiting "Hey Gideon"...');
    }

    return () => {
      wakeWordService.stopStandby();
    };
  }, [
    settings.wakeWordEnabled,
    settings.wakeWordPhrase,
    settings.audioCueEnabled,
    settings.selectedMicrophoneId,
    handleInterruption,
    onSendMessage,
    startListening,
    speakResponse,
    activeTask,
  ]);

  // Auto-initialize camera if configured and permissions allow
  useEffect(() => {
    if (settings.cameraEnabled && !cameraActive && !cameraError) {
      startCamera();
    }
  }, [settings.cameraEnabled, cameraActive, cameraError, startCamera]);

  // Auto-initialize gesture recognition once camera is active
  useEffect(() => {
    if (cameraActive && settings.gestureEnabled && gestureStatus === 'uninitialized') {
      startGestureRecognition();
    }
  }, [cameraActive, settings.gestureEnabled, gestureStatus, startGestureRecognition]);

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

    currentSpokenText,
    interimTranscript,
    statusMessage,
    errorMessage,
    settings,
    updateSettings,

    // Voice controls
    isListening: isListeningState || isListeningRef.current || interactionState === INTERACTION_STATES.LISTENING,
    isSpeaking: isSpeakingRef.current,
    conversationalMode: settings.conversationalMode !== false,
    toggleConversationalMode: () => {
      updateSettings({ conversationalMode: settings.conversationalMode === false });
    },
    startListening,
    stopListening,
    toggleListening,
    speakResponse,
    stopSpeaking,
    handleInterruption,
    setProcessing,

    // Streaming Speech Queue controls (Concurrent generation and speech)
    startStreamingSpeech,
    feedStreamingDelta,
    finishStreamingSpeech,
    interruptStreamingSpeech,

    // Diagnostics snapshots
    voiceDiagnostics: {
      voice: voiceService.getDiagnostics(),
      wakeWord: wakeWordService.getDiagnostics(),
      gesture: gestureService.getDiagnostics(),
    },

    // Wake Word (Hands-Free) controls
    wakeWordState,
    wakeWordActive: wakeWordService.isActive,
    wakeWordSupported: wakeWordService.isSupported(),
    toggleWakeWord: () => {
      updateSettings({ wakeWordEnabled: !settings.wakeWordEnabled });
    },

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
