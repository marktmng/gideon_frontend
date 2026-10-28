/**
 * GideonTechBrain — Dense Embossed 3D Halftone Female Head & Upper Neck with Google-Style Lipsync.
 *
 * Features:
 * - Continuous, ring-free, dense 3D halftone dot relief covering the full female head, face,
 *   and upper neck (`buildEmbossedFemaleHeadDots`), rendered with the exact same circular
 *   halftone dot style and Gideon color code as the background `VoiceReactiveDotField`.
 * - Zero ring shapes, zero wireframe lines — pure embossed halftone dot sculpture that emerges
 *   directly from the background dot membrane.
 * - Google-pronunciation-style 12-viseme 3D mouth articulation synchronized with outgoing speech playback.
 * - Fullscreen Hologram Mode toggle (`⛶ FULLSCREEN` / `⤫ EXIT FULLSCREEN`).
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import VoiceReactiveDotField from './VoiceReactiveDotField';
import voiceService from '../../services/voiceService';
import {
  VISEME_CODES,
  VISEME_POSES,
  getVisemePose,
  evaluateTimelineAt,
} from '../../services/lipsyncService';
import './GideonTechBrain.css';

/**
 * Compute deterministic 3D mouth geometry metrics for a given viseme code or pose object.
 * Used both by the 3D renderer and by automated lipsync verification tests.
 */
export function computeMouthArticulationMetrics(visemeOrPose) {
  const pose =
    visemeOrPose && typeof visemeOrPose === 'object' && typeof visemeOrPose.openY === 'number'
      ? visemeOrPose
      : getVisemePose(visemeOrPose || VISEME_CODES.REST);

  const effectiveOpen = Math.max(0, pose.openY * (1 - pose.lipPress * 0.95));
  const baseLipGapY = 0.08 * (1 - pose.lipPress * 0.85);
  const apertureHeight =
    baseLipGapY +
    effectiveOpen * 0.19 +
    pose.jawDrop * 0.045 -
    pose.lowerLipTuck * 0.032;

  const apertureWidth = 0.40 * pose.widthX * (1 - pose.roundness * 0.24);
  const aspectRatio = apertureWidth / Math.max(0.015, apertureHeight);

  return {
    code: pose.code || VISEME_CODES.REST,
    apertureHeight: Number(Math.max(0, apertureHeight).toFixed(4)),
    apertureWidth: Number(Math.max(0.1, apertureWidth).toFixed(4)),
    aspectRatio: Number(aspectRatio.toFixed(4)),
    roundness: pose.roundness,
    lipPress: pose.lipPress,
    protrusionZ: pose.protrusionZ,
    jawDrop: pose.jawDrop,
    upperTeeth: pose.upperTeeth,
    lowerTeeth: pose.lowerTeeth,
    tongueTip: pose.tongueTip,
    lowerLipTuck: pose.lowerLipTuck,
    isClosed: pose.lipPress >= 0.8 || effectiveOpen <= 0.03,
  };
}

/**
 * Build a continuous, dense, ring-free 3D halftone dot lattice for the full female head,
 * facial features, and upper neck so it looks embossed directly into the background dot field.
 */
function buildEmbossedFemaleHeadDots() {
  const dots = [];

  // Dense staggered halftone grid across normalized head & neck coordinates
  const stepY = 0.031;
  const stepX = 0.033;
  let rowIdx = 0;

  for (let y = -0.86; y <= 0.92; y += stepY, rowIdx++) {
    const stagger = (rowIdx & 1) === 1 ? stepX * 0.5 : 0;

    // 1. Feminine Cranium, Temple, Cheekbone, and Tapered Jawline Half-Width
    let headHalfW = 0;
    if (y <= -0.14) {
      // Smooth elliptical cranium dome
      const ny = (y - -0.14) / 0.72;
      headHalfW = 0.62 * Math.sqrt(Math.max(0, 1 - ny * ny));
    } else if (y <= 0.62) {
      // Mid-face cheekbones tapering smoothly to a sculpted feminine chin at y = 0.62
      const t = (y - -0.14) / 0.76;
      const cheekFlare = 0.035 * Math.exp(-Math.pow((y - 0.02) / 0.14, 2));
      headHalfW =
        (0.62 + cheekFlare) *
        Math.pow(Math.max(0, 1 - Math.pow(t, 1.48)), 0.56) *
        (1 - 0.07 * Math.sin(t * Math.PI));
    }

    // 2. Graceful Upper Neck Half-Width (y from 0.46 down to 0.92)
    let neckHalfW = 0;
    if (y >= 0.46) {
      const nt = (y - 0.46) / 0.46;
      neckHalfW = 0.245 + 0.075 * Math.pow(nt, 1.5);
    }

    const maxHalfW = Math.max(headHalfW, neckHalfW);
    if (maxHalfW <= 0.02) continue;

    for (let x = -0.68 + stagger; x <= 0.68; x += stepX) {
      const absX = Math.abs(x);
      const onHead = y <= 0.62 && absX <= headHalfW;
      const onNeck = !onHead && y >= 0.46 && absX <= neckHalfW;

      if (!onHead && !onNeck) continue;

      if (onHead) {
        const nx = x / Math.max(0.06, headHalfW);
        const edgeFade = Math.sqrt(Math.max(0, 1 - nx * nx));

        // Base 3D cranial/facial ellipsoid depth
        let z =
          edgeFade * (0.46 - Math.max(0, y - 0.12) * 0.16) +
          0.12 * Math.exp(-Math.pow(y / 0.55, 2));

        // Forehead frontal bossing
        const forehead =
          Math.exp(-Math.pow((y + 0.45) / 0.24, 2) - Math.pow(x / 0.42, 2)) * 0.15;

        // Feminine arched supraorbital brow ridge
        const browArchY =
          -0.235 -
          0.042 * Math.sin(Math.min(1, Math.max(0, (absX - 0.08) / 0.36)) * Math.PI);
        const brow =
          absX >= 0.08 && absX <= 0.46
            ? Math.exp(
                -Math.pow((y - browArchY) / 0.028, 2) -
                  Math.pow((absX - 0.25) / 0.16, 2)
              ) * 0.18
            : 0;

        // Orbital eye socket recess + almond eyelids + embossed iris center
        const eyeDx = (absX - 0.235) / 0.135;
        const eyeDy = (y - -0.125) / 0.068;
        const eyeDist2 = eyeDx * eyeDx + eyeDy * eyeDy;
        const eyeSocketRecess = -Math.exp(-eyeDist2 * 0.95) * 0.21;
        const eyelidRim =
          Math.exp(-Math.pow(Math.sqrt(eyeDist2) - 0.68, 2) / 0.032) *
          Math.exp(-Math.pow(eyeDx, 2) * 0.6) *
          0.13;
        const pupilCore = Math.exp(-eyeDist2 * 7.2) * 0.29;

        // Sculpted Nose (bridge, tip apex, nostril alae)
        const noseProg = Math.max(0, Math.min(1, (y - -0.21) / 0.33));
        const noseWidth = 0.048 + noseProg * 0.038;
        const noseBridge =
          y >= -0.24 && y <= 0.15
            ? Math.exp(-Math.pow(x / noseWidth, 2)) *
              (0.15 + noseProg * 0.20) *
              Math.exp(
                -Math.pow(Math.max(0, -0.20 - y) / 0.05, 2) -
                  Math.pow(Math.max(0, y - 0.12) / 0.04, 2)
              )
            : 0;
        const noseTip =
          Math.exp(-Math.pow(x / 0.062, 2) - Math.pow((y - 0.115) / 0.044, 2)) * 0.16;
        const nostrilWing =
          Math.exp(
            -Math.pow((absX - 0.082) / 0.036, 2) - Math.pow((y - 0.13) / 0.030, 2)
          ) * 0.10;
        const nostrilShadow =
          -Math.exp(
            -Math.pow((absX - 0.052) / 0.022, 2) - Math.pow((y - 0.145) / 0.018, 2)
          ) * 0.12;

        // Zygomatic cheekbone arch & mid-face fullness
        const cheekbone =
          Math.exp(
            -Math.pow((absX - 0.30) / 0.17, 2) - Math.pow((y - -0.01) / 0.13, 2)
          ) * 0.15;
        const cheekHollow =
          -Math.exp(
            -Math.pow((absX - 0.34) / 0.13, 2) - Math.pow((y - 0.22) / 0.12, 2)
          ) * 0.08;

        // Philtrum columns & Cupid's bow mouth region
        const lipNormX = Math.min(1.5, absX / 0.195);
        const cupidNotch = 0.014 * Math.exp(-Math.pow(x / 0.035, 2));
        const upperLipCenterY =
          0.258 + cupidNotch + 0.024 * Math.pow(Math.min(1, lipNormX), 1.6);
        const lowerLipCenterY =
          0.332 - 0.022 * Math.pow(Math.min(1, lipNormX), 1.6);
        const lipPartY = 0.294 + 0.004 * Math.pow(Math.min(1, lipNormX), 1.4);

        let upperLipBulk = 0;
        let lowerLipBulk = 0;
        let lipCrease = 0;
        let isUpperLip = false;
        let isLowerLip = false;
        let isLip = false;

        if (absX <= 0.205 && y >= 0.21 && y <= 0.385) {
          const horizLipWeight = Math.max(0, 1 - Math.pow(lipNormX, 2.1));
          upperLipBulk =
            Math.exp(-Math.pow((y - upperLipCenterY) / 0.026, 2)) *
            horizLipWeight *
            0.22;
          lowerLipBulk =
            Math.exp(-Math.pow((y - lowerLipCenterY) / 0.030, 2)) *
            horizLipWeight *
            0.24;
          lipCrease =
            -Math.exp(-Math.pow((y - lipPartY) / 0.012, 2)) *
            horizLipWeight *
            0.16;

          if (upperLipBulk > 0.03 || lowerLipBulk > 0.03) {
            isLip = true;
            if (y <= lipPartY) {
              isUpperLip = true;
            } else {
              isLowerLip = true;
            }
          }
        }

        // Labiomental crease below lower lip & sculpted chin mentum
        const mentolabialCrease =
          -Math.exp(-Math.pow(x / 0.14, 2) - Math.pow((y - 0.405) / 0.032, 2)) * 0.09;
        const chinBoss =
          Math.exp(-Math.pow(x / 0.14, 2) - Math.pow((y - 0.53) / 0.075, 2)) * 0.14;

        z +=
          forehead +
          brow +
          eyeSocketRecess +
          eyelidRim +
          pupilCore +
          noseBridge +
          noseTip +
          nostrilWing +
          nostrilShadow +
          cheekbone +
          cheekHollow +
          upperLipBulk +
          lowerLipBulk +
          lipCrease +
          mentolabialCrease +
          chinBoss;

        // Normalized halftone relief intensity (0.15 .. 1.0)
        // Recessed areas (eye sockets, nostril shadow, sub-cheek, lip crease) get smaller/dimmer dots;
        // Elevated features (forehead, brow, pupil, nose bridge/tip, cheekbones, lips, chin) get larger/brighter dots.
        const crownFade = y < -0.68 ? Math.max(0.2, 1 - (-0.68 - y) / 0.20) : 1.0;
        const rimSoftness = Math.pow(edgeFade, 0.45) * crownFade;
        const rawRelief = (z - 0.12) / 0.68;
        const relief = Math.max(0.14, Math.min(1.0, rawRelief * rimSoftness));

        dots.push({
          baseX: x,
          baseY: y,
          baseZ: z,
          relief,
          isLip,
          isUpperLip,
          isLowerLip,
          isForehead: y >= -0.60 && y <= -0.25 && absX <= 0.42,
          isBrow: brow > 0.07,
          isPupil: pupilCore > 0.12,
          isNoseTip: noseTip > 0.08,
          isCheek: absX >= 0.16 && y >= -0.12 && y <= 0.32,
          isJaw: y > 0.36 && !isLip,
          isNeck: false,
        });
      } else if (onNeck) {
        // Upper Neck Column with Submental Chin Shadow & Smooth Fade into Background
        const neckNx = x / Math.max(0.06, neckHalfW);
        const cyl = Math.sqrt(Math.max(0, 1 - neckNx * neckNx));
        const neckVertProg = Math.max(0, Math.min(1, (y - 0.48) / 0.44));
        const bottomFade = Math.max(0.12, 1 - Math.pow(neckVertProg, 1.65));

        // Submental shadow directly beneath the chin/jawline so the jaw pops in 3D relief
        const submentalDist = y - (0.62 - 0.14 * Math.pow(absX / 0.25, 1.4));
        const submentalShadow =
          submentalDist >= 0 && submentalDist < 0.11
            ? 0.45 + 0.55 * (submentalDist / 0.11)
            : 1.0;

        // Subtle sternocleidomastoid (SCM) muscle highlights along the neck
        const scmCenter = 0.16 * (1 - neckVertProg * 0.45);
        const scmHighlight =
          Math.exp(-Math.pow((absX - scmCenter) / 0.055, 2)) * 0.08;

        const z = cyl * 0.26 - 0.04 + scmHighlight;
        const relief = Math.max(
          0.12,
          Math.min(0.76, (0.26 + cyl * 0.46 + scmHighlight * 1.5) * submentalShadow * bottomFade)
        );

        dots.push({
          baseX: x,
          baseY: y,
          baseZ: z,
          relief,
          isLip: false,
          isUpperLip: false,
          isLowerLip: false,
          isForehead: false,
          isBrow: false,
          isPupil: false,
          isNoseTip: false,
          isCheek: false,
          isJaw: false,
          isNeck: true,
        });
      }
    }
  }

  // Add articulatory inner-mouth halftone dots (upper teeth, tongue tip, lower teeth)
  // that stay tucked inside the mouth at rest and emerge as halftone dots when speaking
  for (let ix = -0.135; ix <= 0.136; ix += 0.027) {
    const archZ = 0.58 + 0.06 * (1 - Math.pow(ix / 0.15, 2));
    // Upper dental halftone dots
    dots.push({
      baseX: ix,
      baseY: 0.278,
      baseZ: archZ,
      relief: 0.85,
      isInnerArticulator: true,
      isUpperTeethDot: true,
    });
    // Tongue tip / blade halftone dots
    if (Math.abs(ix) <= 0.09) {
      dots.push({
        baseX: ix,
        baseY: 0.296,
        baseZ: archZ - 0.01,
        relief: 0.78,
        isInnerArticulator: true,
        isTongueDot: true,
      });
    }
    // Lower dental halftone dots
    dots.push({
      baseX: ix,
      baseY: 0.312,
      baseZ: archZ - 0.015,
      relief: 0.80,
      isInnerArticulator: true,
      isLowerTeethDot: true,
    });
  }

  return dots;
}

export default function GideonTechBrain({
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'error'
  audioLevel = 0, // 0.0 to 1.0 (user microphone level when listening)
  speechLevel = 0, // 0.0 to 1.0 (Gideon outgoing speech level)
  speechPulse = 0, // 0.0 to 1.0 (syllable peak pulse)
  isSpeaking = false,
  viseme = null,
  visemePose = null,
  visemeTimeline = null,
  utteranceId = null,
  statusText = 'Ready',
  taskDescription = null,
  reducedMotion = false,
  size = 'large', // 'small' | 'medium' | 'large'
  onInterrupt = null,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const speechPropsRef = useRef({
    isSpeaking,
    speechLevel,
    speechPulse,
    viseme,
    visemePose,
    visemeTimeline,
    utteranceId,
  });

  // Live smoothed articulatory pose for 60fps coarticulation
  const livePoseRef = useRef({ ...VISEME_POSES[VISEME_CODES.REST] });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    speechPropsRef.current = {
      isSpeaking,
      speechLevel,
      speechPulse,
      viseme,
      visemePose,
      visemeTimeline,
      utteranceId,
    };
  }, [isSpeaking, speechLevel, speechPulse, viseme, visemePose, visemeTimeline, utteranceId]);

  // Toggle Fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        try {
          if (next && containerRef.current && containerRef.current.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
          } else if (!next && document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {
          // CSS fullscreen class handles fallback automatically
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        setIsFullscreen(true);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Extra-large, commanding 3D head dimensions tightly framing head + neck with zero dead space
  const dimensions = useMemo(() => {
    if (isFullscreen) {
      return { width: 1000, height: 880, radius: 450, scale: 470 };
    }
    switch (size) {
      case 'small':
        return { width: 420, height: 380, radius: 190, scale: 195 };
      case 'medium':
        return { width: 580, height: 520, radius: 265, scale: 275 };
      case 'large':
      default:
        return { width: 740, height: 640, radius: 335, scale: 345 };
    }
  }, [size, isFullscreen]);

  // Generate dense embossed 3D halftone head + neck dots once
  const headDots = useMemo(() => buildEmbossedFemaleHeadDots(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let ctx = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      ctx = null;
    }
    if (!ctx) return undefined;

    let time = 0;
    let isVisible = true;
    const startWallMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState !== 'hidden';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Resolve target viseme pose and outgoing speech intensity for the current frame.
    // Strictly ignores microphone `audioLevel` when in `listening` state.
    const resolveFrameSpeechAndPose = () => {
      const currentState = stateRef.current;
      const sp = speechPropsRef.current;
      const nowMs =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();

      const liveService = voiceService.isSpeaking ? voiceService.sampleSpeechState(nowMs) : null;
      const activeSpeaking = Boolean(
        currentState === 'speaking' ||
          sp.isSpeaking ||
          (liveService && liveService.isSpeaking) ||
          sp.viseme ||
          sp.visemePose
      );

      if (!activeSpeaking) {
        return {
          isSpeaking: false,
          pose: VISEME_POSES[VISEME_CODES.REST],
          speechLevel: 0,
        };
      }

      if (sp.visemePose && typeof sp.visemePose.openY === 'number') {
        return {
          isSpeaking: true,
          pose: sp.visemePose,
          speechLevel:
            sp.speechLevel > 0 ? sp.speechLevel : sp.visemePose.baseEnergy || 0.45,
        };
      }

      if (sp.viseme) {
        const p = getVisemePose(sp.viseme);
        return {
          isSpeaking: true,
          pose: p,
          speechLevel: sp.speechLevel > 0 ? sp.speechLevel : p.baseEnergy || 0.45,
        };
      }

      if (liveService && liveService.isSpeaking) {
        return {
          isSpeaking: true,
          pose: liveService.visemePose || VISEME_POSES[VISEME_CODES.REST],
          speechLevel: liveService.speechLevel || 0,
        };
      }

      if (sp.visemeTimeline && Array.isArray(sp.visemeTimeline.cues)) {
        const evalResult = evaluateTimelineAt(sp.visemeTimeline, nowMs - startWallMs);
        return {
          isSpeaking: true,
          pose: evalResult.pose,
          speechLevel: sp.speechLevel > 0 ? sp.speechLevel : evalResult.speechLevel,
        };
      }

      return {
        isSpeaking: true,
        pose: VISEME_POSES[VISEME_CODES.REST],
        speechLevel: sp.speechLevel || 0,
      };
    };

    const stepPoseSmoothing = (targetPose) => {
      const cur = livePoseRef.current;
      const alpha = reducedMotion ? 1.0 : 0.34;
      const lerp = (a, b) => a + (b - a) * alpha;

      cur.code = targetPose.code || VISEME_CODES.REST;
      cur.openY = lerp(cur.openY, targetPose.openY);
      cur.widthX = lerp(cur.widthX, targetPose.widthX);
      cur.roundness = lerp(cur.roundness, targetPose.roundness);
      cur.lipPress = lerp(cur.lipPress, targetPose.lipPress);
      cur.protrusionZ = lerp(cur.protrusionZ, targetPose.protrusionZ);
      cur.jawDrop = lerp(cur.jawDrop, targetPose.jawDrop);
      cur.upperTeeth = lerp(cur.upperTeeth, targetPose.upperTeeth);
      cur.lowerTeeth = lerp(cur.lowerTeeth, targetPose.lowerTeeth);
      cur.tongueTip = lerp(cur.tongueTip, targetPose.tongueTip);
      cur.lowerLipTuck = lerp(cur.lowerLipTuck, targetPose.lowerLipTuck);
      return cur;
    };

    // ========================================================================
    // 60FPS Render Loop — Pure Embossed Halftone Dots (Head + Neck + Lipsync)
    // ========================================================================
    const render = () => {
      if (!isVisible) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.024;
      const currentState = stateRef.current;
      const micAudio = currentState === 'listening' ? audioLevelRef.current || 0 : 0;

      const { isSpeaking: frameSpeaking, pose: targetPose, speechLevel: outSpeechLevel } =
        resolveFrameSpeechAndPose();
      const pose = stepPoseSmoothing(targetPose);

      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Match the exact Gideon halftone dot color family used by VoiceReactiveDotField
      let baseDotRGB = '56, 189, 248'; // --accent-blue (#38bdf8)
      let highlightDotRGB = '0, 242, 254'; // --accent-cyan (#00f2fe)
      let peakDotRGB = '224, 242, 254'; // Ice-cyan highlight (#e0f2fe)
      let coreScale = 1.0;

      switch (currentState) {
        case 'listening':
          baseDotRGB = '16, 185, 129';
          highlightDotRGB = '52, 211, 153';
          peakDotRGB = '209, 250, 229';
          coreScale = 1.01 + micAudio * 0.04;
          break;
        case 'processing':
          baseDotRGB = '129, 140, 248';
          highlightDotRGB = '165, 180, 252';
          peakDotRGB = '224, 231, 255';
          coreScale = 1.0 + Math.sin(time * 4.0) * 0.02;
          break;
        case 'speaking':
          baseDotRGB = '56, 189, 248';
          highlightDotRGB = '0, 242, 254';
          peakDotRGB = '240, 249, 255';
          coreScale = 1.015 + outSpeechLevel * 0.035;
          break;
        case 'executing':
          baseDotRGB = '245, 158, 11';
          highlightDotRGB = '251, 191, 36';
          peakDotRGB = '254, 243, 199';
          coreScale = 1.01;
          break;
        case 'error':
          baseDotRGB = '239, 68, 68';
          highlightDotRGB = '248, 113, 113';
          peakDotRGB = '254, 202, 202';
          break;
        case 'idle':
        default:
          baseDotRGB = '56, 189, 248';
          highlightDotRGB = '0, 242, 254';
          peakDotRGB = '224, 242, 254';
          coreScale = 1.0 + Math.sin(time * 0.75) * 0.012;
          break;
      }

      if (reducedMotion) {
        coreScale = 1.0;
      }

      ctx.save();
      ctx.translate(centerX, centerY);

      // Google-Pronunciation-Style 3D Viseme Articulation Parameters
      const effectiveOpen = Math.max(0, pose.openY * (1 - pose.lipPress * 0.95));
      const jawDrop = pose.jawDrop;
      const widthScale = pose.widthX * (1 - pose.roundness * 0.24);
      const wideStretch = Math.max(0, pose.widthX - 1.0);

      // Gentle 3D head movement (yaw & pitch)
      const yaw = reducedMotion ? 0 : Math.sin(time * 0.42) * 0.10;
      const pitch = reducedMotion ? 0 : Math.sin(time * 0.30) * 0.05;

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const cameraDist = 2.5;
      const scale = dimensions.scale * coreScale;
      const maxDotRadius = (dimensions.scale / 350) * 3.8;

      const projectedDots = [];

      for (let i = 0; i < headDots.length; i++) {
        const p = headDots[i];

        // Handle inner oral articulators (teeth & tongue dots) — only visible when mouth opens
        if (p.isInnerArticulator) {
          if (effectiveOpen <= 0.07 || pose.lipPress >= 0.55) continue;
          let visWeight = 0;
          let ptY = p.baseY;
          let ptZ = p.baseZ;
          if (p.isUpperTeethDot) {
            visWeight = pose.upperTeeth;
            ptY = 0.268 - effectiveOpen * 0.025;
          } else if (p.isLowerTeethDot) {
            visWeight = pose.lowerTeeth;
            ptY = 0.322 + effectiveOpen * 0.095 + jawDrop * 0.035;
          } else if (p.isTongueDot) {
            visWeight = pose.tongueTip;
            ptY = 0.292 + effectiveOpen * 0.045;
            ptZ += pose.tongueTip * 0.04;
          }
          if (visWeight <= 0.16) continue;

          const ptX = p.baseX * widthScale;
          const x1 = ptX * cosY - ptZ * sinY;
          const z1 = ptX * sinY + ptZ * cosY;
          const y1 = ptY * cosP - z1 * sinP;
          const z2 = ptY * sinP + z1 * cosP;
          const fov = cameraDist / (cameraDist + z2);

          projectedDots.push({
            x: x1 * fov * scale,
            y: y1 * fov * scale,
            z2,
            radius: Math.max(0.9, maxDotRadius * 0.58 * visWeight),
            alpha: Math.min(0.85, 0.35 + visWeight * 0.50),
            rgb: peakDotRGB,
          });
          continue;
        }

        let ptX = p.baseX;
        let ptY = p.baseY;
        let ptZ = p.baseZ;
        let relief = p.relief;

        // Apply 3D Google-style viseme articulation to lips, jaw, and cheeks
        if (p.isUpperLip) {
          const centerArch = 1 - Math.pow(Math.min(1, Math.abs(p.baseX) / 0.205), 1.6);
          ptX = p.baseX * widthScale;
          ptY =
            p.baseY -
            effectiveOpen * 0.058 * centerArch +
            pose.lipPress * 0.024 * centerArch;
          ptZ = p.baseZ + pose.protrusionZ * (0.55 + 0.45 * centerArch);
          if (frameSpeaking || effectiveOpen > 0.04) {
            relief = Math.min(1.0, relief + 0.22);
          }
        } else if (p.isLowerLip) {
          const centerArch = 1 - Math.pow(Math.min(1, Math.abs(p.baseX) / 0.205), 1.5);
          ptX = p.baseX * widthScale;
          ptY =
            p.baseY +
            (effectiveOpen * 0.138 + jawDrop * 0.045) * centerArch -
            pose.lipPress * 0.030 * centerArch -
            pose.lowerLipTuck * 0.036 * centerArch;
          ptZ =
            p.baseZ +
            pose.protrusionZ * (0.55 + 0.45 * centerArch) -
            pose.lowerLipTuck * 0.048;
          if (frameSpeaking || effectiveOpen > 0.04) {
            relief = Math.min(1.0, relief + 0.22);
          }
        } else if (p.isJaw) {
          const chinWeight = Math.max(0, 1 - Math.abs(p.baseX) / 0.56);
          const vertWeight = Math.max(0, Math.min(1, (p.baseY - 0.34) / 0.26));
          const w = chinWeight * (0.4 + 0.6 * vertWeight);
          ptY = p.baseY + (jawDrop * 0.092 + effectiveOpen * 0.035) * w;
          ptZ = p.baseZ - jawDrop * 0.018 * w;
        } else if (p.isCheek && wideStretch > 0.01) {
          ptX = p.baseX * (1 + wideStretch * 0.06);
          ptY = p.baseY - wideStretch * 0.018;
        }

        // Subtle processing wave across the forehead halftone dots
        if (currentState === 'processing' && p.isForehead && !reducedMotion) {
          const wave = Math.sin(time * 6.5 + ptY * 10.0 + ptX * 5.0);
          relief = Math.max(0.15, Math.min(1.0, relief + wave * 0.12));
        }

        const x1 = ptX * cosY - ptZ * sinY;
        const z1 = ptX * sinY + ptZ * cosY;
        const y1 = ptY * cosP - z1 * sinP;
        const z2 = ptY * sinP + z1 * cosP;
        const fov = cameraDist / (cameraDist + z2);

        // Dynamic 3D directional lighting so rotating the head shifts the halftone dot sizes naturally
        const lightFactor = Math.max(0.25, Math.min(1.15, 0.72 + z2 * 0.42 - x1 * sinY * 0.35));
        const finalTone = Math.max(0.10, Math.min(1.0, relief * lightFactor));

        const dotRadius = Math.max(0.55, maxDotRadius * (0.20 + 0.80 * finalTone));
        const alpha = Math.max(0.10, Math.min(0.92, 0.12 + 0.74 * finalTone));

        let rgb = baseDotRGB;
        if (p.isLip && (frameSpeaking || effectiveOpen > 0.05)) {
          rgb = peakDotRGB;
        } else if (p.isPupil || p.isNoseTip || finalTone > 0.78) {
          rgb = highlightDotRGB;
        }

        projectedDots.push({
          x: x1 * fov * scale,
          y: y1 * fov * scale,
          z2,
          radius: dotRadius,
          alpha,
          rgb,
        });
      }

      // Sort back-to-front for natural 3D depth occlusion
      projectedDots.sort((a, b) => a.z2 - b.z2);

      const TAU = Math.PI * 2;
      for (let i = 0; i < projectedDots.length; i++) {
        const d = projectedDots[i];
        ctx.fillStyle = `rgba(${d.rgb}, ${d.alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, TAU);
        ctx.fill();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [dimensions, reducedMotion, headDots]);

  const stateLabels = {
    idle: 'GIDEON CORE STANDBY',
    listening: 'NEURAL AUDIO RECEPTOR ACTIVE',
    processing: 'SYNAPSE PROCESSING',
    speaking: 'VOCAL SYNTHESIZER TRANSMITTING',
    executing: 'DIRECTIVE IN PROGRESS',
    error: 'ANOMALY DETECTED',
  };

  const activeSpeakingState = Boolean(state === 'speaking' || isSpeaking);
  const currentVisemeCode = activeSpeakingState
    ? visemePose?.code || viseme || voiceService.currentViseme || VISEME_CODES.REST
    : VISEME_CODES.REST;
  const currentMetrics = computeMouthArticulationMetrics(
    activeSpeakingState ? visemePose || currentVisemeCode : VISEME_CODES.REST
  );

  return (
    <div
      ref={containerRef}
      className={`gideon-tech-brain-container state-${state} size-${size} ${
        isFullscreen ? 'is-fullscreen' : ''
      } ${reducedMotion ? 'reduced-motion' : ''}`}
      role="region"
      aria-label={`Gideon Artificial Intelligence Neural Brain in state: ${state}`}
      data-viseme={currentMetrics.code}
      data-mouth-open={currentMetrics.apertureHeight}
      data-mouth-width={currentMetrics.apertureWidth}
      data-mouth-closed={currentMetrics.isClosed ? 'true' : 'false'}
      data-fullscreen={isFullscreen ? 'true' : 'false'}
    >
      {/* Fullscreen Toggle Button */}
      <button
        type="button"
        className="brain-fullscreen-toggle-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen Hologram Mode'}
        aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
      >
        <span className="fullscreen-icon">{isFullscreen ? '⤫' : '⛶'}</span>
        <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
      </button>

      {/* Full-Bleed Kokonut UI Voice-Reactive Halftone Dot Field */}
      <VoiceReactiveDotField
        width={dimensions.width}
        height={dimensions.height}
        fullBleed={true}
        headCanvasRef={canvasRef}
        isSpeaking={activeSpeakingState}
        speechLevel={activeSpeakingState ? speechLevel : 0}
        speechPulse={activeSpeakingState ? speechPulse : 0}
        state={state}
        reducedMotion={reducedMotion}
      />

      {/* Centered Stage for Dense Embossed 3D Halftone Female Head + Neck */}
      <div className="tech-brain-stage">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="tech-brain-canvas"
          data-testid="tech-brain-face-canvas"
        />
      </div>

      {/* Central Telemetry HUD Readout */}
      <div className="tech-brain-hud">
        <div className="brain-hud-pill-row">
          <div className="brain-state-pill">
            <span className="state-pulse-dot"></span>
            <span className="state-title">{stateLabels[state] || state.toUpperCase()}</span>
          </div>
          <button
            type="button"
            className="brain-hud-fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen Hologram Mode'}
          >
            <span className="fullscreen-icon">{isFullscreen ? '⤫' : '⛶'}</span>
            <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
          </button>
        </div>
        <div className="brain-status-text" title={statusText}>
          {statusText}
        </div>
        {taskDescription && (
          <div className="brain-task-banner">
            <span className="task-icon">⚙</span>
            <span className="task-title">{taskDescription}</span>
          </div>
        )}
      </div>

      {/* Interrupt Control for Speaking / Processing State */}
      {(state === 'speaking' || state === 'processing') && onInterrupt && (
        <button
          className="brain-interrupt-btn"
          onClick={onInterrupt}
          type="button"
          title="Interrupt Gideon (Halt action)"
          aria-label="Interrupt Gideon"
        >
          <span className="interrupt-icon">■</span>
          <span>INTERRUPT</span>
        </button>
      )}
    </div>
  );
}
