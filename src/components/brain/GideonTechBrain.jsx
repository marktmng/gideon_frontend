/**
 * GideonTechBrain — Futuristic Animated Neural Core UI.
 * Combines high-performance Canvas 2D rendering with SVG holographic rings,
 * audio-reactive waveforms, and state-driven visual kinetics.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import './GideonTechBrain.css';

export default function GideonTechBrain({
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'error'
  audioLevel = 0, // 0.0 to 1.0
  statusText = 'Ready',
  taskDescription = null,
  reducedMotion = false,
  size = 'medium', // 'small' | 'medium' | 'large'
  onInterrupt = null,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);

  // Keep refs in sync for 60fps canvas loop without causing re-renders
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Dimension scaling
  const dimensions = useMemo(() => {
    switch (size) {
      case 'small':
        return { width: 220, height: 220, radius: 80 };
      case 'large':
        return { width: 440, height: 440, radius: 170 };
      case 'medium':
      default:
        return { width: 340, height: 340, radius: 130 };
    }
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let time = 0;
    let isVisible = true;

    // Handle tab visibility to pause animation when hidden
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState !== 'hidden';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Neural nodes data for brain structure
    const nodeCount = 28;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const dist = (dimensions.radius * 0.35) + (Math.sin(i * 3) * 15);
      // Dual brain hemisphere shaping
      const x = Math.cos(angle) * dist * (Math.abs(Math.sin(angle)) * 0.4 + 0.85);
      const y = Math.sin(angle) * dist * 1.1;
      nodes.push({
        baseX: x,
        baseY: y,
        pulseOffset: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.8,
        size: 2.2 + Math.random() * 2,
      });
    }

    // Particles data
    const particleCount = 24;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        orbitRadius: dimensions.radius * (0.6 + Math.random() * 0.35),
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() > 0.5 ? 1 : -1) * (0.008 + Math.random() * 0.012),
        size: 1.2 + Math.random() * 1.8,
        opacity: 0.3 + Math.random() * 0.6,
      });
    }

    const render = () => {
      if (!isVisible) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.025;
      const currentState = stateRef.current;
      const currentAudio = audioLevelRef.current || 0;

      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Color scheme based on state
      let primaryColor = 'rgba(0, 242, 254, '; // Cyan
      let secondaryColor = 'rgba(56, 189, 248, '; // Blue
      let corePulseSpeed = 1.0;
      let coreScale = 1.0;

      switch (currentState) {
        case 'listening':
          primaryColor = 'rgba(34, 197, 94, '; // Emerald green
          secondaryColor = 'rgba(16, 185, 129, ';
          corePulseSpeed = 2.2;
          coreScale = 1.05 + currentAudio * 0.4;
          break;
        case 'processing':
          primaryColor = 'rgba(168, 85, 247, '; // Purple / Violet
          secondaryColor = 'rgba(129, 140, 248, ';
          corePulseSpeed = 2.8;
          coreScale = 1.0 + Math.sin(time * 6) * 0.08;
          break;
        case 'speaking':
          primaryColor = 'rgba(0, 242, 254, '; // Electric Cyan
          secondaryColor = 'rgba(14, 165, 233, ';
          corePulseSpeed = 2.0;
          coreScale = 1.05 + currentAudio * 0.35;
          break;
        case 'executing':
          primaryColor = 'rgba(245, 158, 11, '; // Amber
          secondaryColor = 'rgba(251, 191, 36, ';
          corePulseSpeed = 1.8;
          coreScale = 1.03;
          break;
        case 'error':
          primaryColor = 'rgba(239, 68, 68, '; // Red
          secondaryColor = 'rgba(244, 63, 94, ';
          corePulseSpeed = 0.8;
          break;
        case 'idle':
        default:
          primaryColor = 'rgba(0, 242, 254, ';
          secondaryColor = 'rgba(56, 189, 248, ';
          corePulseSpeed = 0.8;
          coreScale = 1.0 + Math.sin(time) * 0.04;
          break;
      }

      if (reducedMotion) {
        corePulseSpeed = 0;
        coreScale = 1.0;
      }

      ctx.save();
      ctx.translate(centerX, centerY);

      // 1. Central Core Radial Energy Glow
      const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, dimensions.radius * 0.55 * coreScale);
      glowGrad.addColorStop(0, primaryColor + '0.45)');
      glowGrad.addColorStop(0.4, secondaryColor + '0.22)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, dimensions.radius * 0.55 * coreScale, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. Synaptic Pathways (Connected Neural Nodes)
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        const pulseA = Math.sin(time * corePulseSpeed + nodeA.pulseOffset);
        const xA = nodeA.baseX * coreScale + (pulseA * 2);
        const yA = nodeA.baseY * coreScale + (pulseA * 2);

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const xB = nodeB.baseX * coreScale;
          const yB = nodeB.baseY * coreScale;
          const dist = Math.hypot(xA - xB, yA - yB);

          if (dist < dimensions.radius * 0.42) {
            const alpha = (1 - dist / (dimensions.radius * 0.42)) * 0.35 * (0.8 + pulseA * 0.3);
            ctx.strokeStyle = primaryColor + `${Math.max(0.05, alpha)})`;
            ctx.beginPath();
            ctx.moveTo(xA, yA);
            ctx.lineTo(xB, yB);
            ctx.stroke();
          }
        }

        // Draw node dot
        ctx.beginPath();
        ctx.arc(xA, yA, nodeA.size * (0.9 + currentAudio * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = primaryColor + '0.9)';
        ctx.shadowColor = primaryColor + '0.8)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 3. Orbiting Data Particles
      if (!reducedMotion) {
        for (let p of particles) {
          p.angle += p.speed * (currentState === 'processing' ? 2.5 : 1.0);
          const px = Math.cos(p.angle) * p.orbitRadius;
          const py = Math.sin(p.angle) * p.orbitRadius;

          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = secondaryColor + `${p.opacity})`;
          ctx.fill();
        }
      }

      // 4. Audio-Reactive Equalizer Waveform Ring (Active during listening / speaking)
      if (currentState === 'listening' || currentState === 'speaking') {
        const waveRadius = dimensions.radius * 0.88;
        const wavePoints = 48;
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = primaryColor + '0.7)';

        for (let w = 0; w <= wavePoints; w++) {
          const wAngle = (w / wavePoints) * Math.PI * 2;
          const waveAmp = (Math.sin(w * 4 + time * 8) * (10 * currentAudio + 3));
          const r = waveRadius + waveAmp;
          const wx = Math.cos(wAngle) * r;
          const wy = Math.sin(wAngle) * r;
          if (w === 0) {
            ctx.moveTo(wx, wy);
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.closePath();
        ctx.stroke();
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
  }, [dimensions, reducedMotion]);

  // Status badge styling
  const stateLabels = {
    idle: 'GIDEON CORE STANDBY',
    listening: 'NEURAL AUDIO RECEPTOR ACTIVE',
    processing: 'SYNAPSE PROCESSING',
    speaking: 'VOCAL SYNTHESIZER TRANSMITTING',
    executing: 'DIRECTIVE IN PROGRESS',
    error: 'ANOMALY DETECTED',
  };

  return (
    <div
      className={`gideon-tech-brain-container state-${state} size-${size} ${reducedMotion ? 'reduced-motion' : ''}`}
      role="region"
      aria-label={`Gideon Artificial Intelligence Neural Brain in state: ${state}`}
    >
      {/* Outer Holographic SVG Rings Layer */}
      <svg
        className="tech-brain-svg-overlay"
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cyanRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Concentric Holographic Ring 1: Outer Dashed Tactical Ring */}
        <circle
          cx={dimensions.width / 2}
          cy={dimensions.height / 2}
          r={dimensions.radius * 0.96}
          className="holo-ring ring-outer-dashed"
        />

        {/* Concentric Holographic Ring 2: Segmented Scanning Arc */}
        <circle
          cx={dimensions.width / 2}
          cy={dimensions.height / 2}
          r={dimensions.radius * 0.82}
          className="holo-ring ring-mid-scanning"
        />

        {/* Concentric Holographic Ring 3: Counter-rotating Inner Gauge */}
        <circle
          cx={dimensions.width / 2}
          cy={dimensions.height / 2}
          r={dimensions.radius * 0.68}
          className="holo-ring ring-inner-counter"
        />

        {/* Tactical Crosshairs & Cardinal Degree Marks */}
        <line
          x1={dimensions.width / 2 - dimensions.radius * 0.98}
          y1={dimensions.height / 2}
          x2={dimensions.width / 2 - dimensions.radius * 0.90}
          y2={dimensions.height / 2}
          className="holo-crosshair"
        />
        <line
          x1={dimensions.width / 2 + dimensions.radius * 0.90}
          y1={dimensions.height / 2}
          x2={dimensions.width / 2 + dimensions.radius * 0.98}
          y2={dimensions.height / 2}
          className="holo-crosshair"
        />
        <line
          x1={dimensions.width / 2}
          y1={dimensions.height / 2 - dimensions.radius * 0.98}
          x2={dimensions.width / 2}
          y2={dimensions.height / 2 - dimensions.radius * 0.90}
          className="holo-crosshair"
        />
        <line
          x1={dimensions.width / 2}
          y1={dimensions.height / 2 + dimensions.radius * 0.90}
          x2={dimensions.width / 2}
          y2={dimensions.height / 2 + dimensions.radius * 0.98}
          className="holo-crosshair"
        />
      </svg>

      {/* Canvas Layer for Synaptic Nodes, Core Glow & Particle Orbits */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="tech-brain-canvas"
      />

      {/* Central Telemetry HUD Readout */}
      <div className="tech-brain-hud">
        <div className="brain-state-pill">
          <span className="state-pulse-dot"></span>
          <span className="state-title">{stateLabels[state] || state.toUpperCase()}</span>
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
