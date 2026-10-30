/**
 * VoiceReactiveDotField — Full-Area Kokonut UI Halftone Membrane in Gideon's Color Palette.
 *
 * Adapted directly from `kokonut-dot-field.tsx` (@dorianbaffier / kokonutUI, MIT License)
 * into Gideon's React 19 JSX + Canvas architecture:
 * - Spans the full Command Centre workspace area (`fullBleed`) replacing the static grid,
 *   while maintaining explicit `width`/`height` support for standalone/test rendering.
 * - Uses Gideon's signature cybernetic color palette (`#38bdf8` sky blue, `#00f2fe` cyan,
 *   `#10b981` emerald, `#818cf8` indigo, `#f59e0b` amber, `#ef4444` crimson).
 * - Seeded 3D Perlin gradient noise (`createNoise`) sampled on a coarse grid (`TONE_STEP = 3`)
 *   and bilinearly blended (`sampleTone`) with slow idle drift (`NOISE_SPEED = 0.07`, `IDLE_FRAME_MS = 33`).
 * - Spring membrane physics (`ANCHOR = 26`, `COUPLING = 340`, `DAMPING = 2.4`, `STEP = 1 / 120`).
 * - Travelling radial shockwaves (`SHOCK_SPEED = 620`, `SHOCK_WIDTH = 34`, `SHOCK_FORCE = 5200`, `SHOCK_LIFE = 1.3`)
 *   and vocal wake impulses emitted from the female head's mouth/vocal core during outgoing speech.
 * - Compression-based halftone dot sizing (`COMPRESSION_GAIN = 3`) and 10-bucket batched Canvas rendering (`BUCKETS = 10`).
 *
 * STRICT INTERACTION POLICY:
 * - Zero cursor/pointer/click/touch handlers (`pointermove`, `pointerdown`, `pointerleave` removed).
 * - Never reacts to user microphone input (`listening`).
 * - Driven exclusively by Gideon's outgoing speech playback (`isSpeaking`, `speechLevel`, `speechPulse`).
 */

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import voiceService from '../../services/voiceService';
import { shouldReduceMotion } from '../../services/animationService';
import './VoiceReactiveDotField.css';

// Kokonut Dot Field physics & halftone constants
const NOISE_SCALE = 240;
const NOISE_SPEED = 0.07;
const TONE_STEP = 3;
const IDLE_FRAME_MS = 33;
const ANCHOR = 26;
const COUPLING = 340;
const DAMPING = 2.4;
const STEP = 1 / 120;
const SHOCK_SPEED = 620;
const SHOCK_WIDTH = 34;
const SHOCK_FORCE = 5200;
const SHOCK_LIFE = 1.3;
const COMPRESSION_GAIN = 3;
const BUCKETS = 10;
const REST_SPEED = 2;
const REST_OFFSET = 0.15;

export const PHYSICS_CONSTANTS = {
  NOISE_SCALE,
  NOISE_SPEED,
  TONE_STEP,
  IDLE_FRAME_MS,
  ANCHOR,
  COUPLING,
  DAMPING,
  STEP,
  FIXED_DT: STEP,
  MAX_FRAME_DT: 0.05,
  MAX_SUBSTEPS: 6,
  SPRING_STIFFNESS: ANCHOR,
  NEIGHBOUR_COUPLING: COUPLING,
  SHOCK_SPEED,
  SHOCK_WIDTH,
  SHOCK_FORCE,
  SHOCK_LIFE,
  COMPRESSION_GAIN,
  BUCKETS,
  REST_SPEED,
  REST_OFFSET,
  MAX_DISPLACEMENT: 14.0,
  SLEEP_ENERGY_EPSILON: 0.0015,
};

// Gideon Command Centre color palette by state
const GIDEON_DOT_COLORS = {
  idle: '#38bdf8', // --accent-blue
  permission_needed: '#f59e0b', // amber
  standby: '#1e90ff', // dodger blue
  wake_detected: '#00f2fe', // bright cyan
  speaking: '#00f2fe', // --accent-cyan
  listening: '#10b981', // --status-completed emerald
  processing: '#818cf8', // --accent-secondary indigo
  executing: '#f59e0b', // --status-pending amber
  interrupted: '#f59e0b', // amber
  mic_unavailable: '#9ca3af', // gray
  error: '#ef4444', // --status-error crimson
};

/**
 * Seeded 3D gradient noise (Ken Perlin's improved noise from `kokonut-dot-field.tsx`), about -1 to 1.
 */
export function createNoise(seed = 7) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let state = seed >>> 0 || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (hash, x, y, z) => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    let v = z;
    if (h < 4) {
      v = y;
    } else if (h === 12 || h === 14) {
      v = x;
    }
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x, y, z = 0) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const fz = z - Math.floor(z);
    const u = fade(fx);
    const v = fade(fy);
    const w = fade(fz);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(perm[AA], fx, fy, fz), grad(perm[BA], fx - 1, fy, fz), u),
        lerp(
          grad(perm[AB], fx, fy - 1, fz),
          grad(perm[BB], fx - 1, fy - 1, fz),
          u
        ),
        v
      ),
      lerp(
        lerp(
          grad(perm[AA + 1], fx, fy, fz - 1),
          grad(perm[BA + 1], fx - 1, fy, fz - 1),
          u
        ),
        lerp(
          grad(perm[AB + 1], fx, fy - 1, fz - 1),
          grad(perm[BB + 1], fx - 1, fy - 1, fz - 1),
          u
        ),
        v
      ),
      w
    );
  };
}

const DEFAULT_NOISE_FN = createNoise(7);

export function seededGradientNoise2D(x, y, seedOrNoise = DEFAULT_NOISE_FN) {
  const fn = typeof seedOrNoise === 'function' ? seedOrNoise : createNoise(seedOrNoise);
  return fn(x, y, 0);
}

/**
 * Sample the idle halftone pattern on every TONE_STEP-th dot and bilinearly blend in between,
 * plus emboss a subtle central relief contour around the female head's position `(field.cx, field.cy)`.
 */
export function sampleTone(field, noise = DEFAULT_NOISE_FN, time = 0) {
  const { cols, rows, spacing, originX, originY, width, height, tone, coarse } = field;
  const z = time * NOISE_SPEED;
  const step = spacing * TONE_STEP;
  const coarseCols = Math.ceil((cols - 1) / TONE_STEP) + 1;
  const coarseRows = Math.ceil((rows - 1) / TONE_STEP) + 1;

  for (let j = 0; j < coarseRows; j++) {
    const ny = (originY + j * step) / NOISE_SCALE;
    for (let i = 0; i < coarseCols; i++) {
      const nx = (originX + i * step) / NOISE_SCALE;
      const n =
        noise(nx, ny, z) * 0.75 +
        noise(nx * 2.1 + 9.3, ny * 2.1 + 3.7, z * 1.3) * 0.25;
      coarse[j * coarseCols + i] = Math.min(1, Math.max(0, 0.5 + n * 1.1));
    }
  }

  const cx = field.cx ?? width / 2;
  const cy = field.cy ?? height / 2;
  const baseRadius = field.maxRadius || Math.min(width, height) * 0.42;
  const headRadiusX = Math.max(80, baseRadius * 0.58);
  const headRadiusY = Math.max(100, baseRadius * 0.72);

  for (let j = 0; j < rows; j++) {
    const cj = Math.min(Math.floor(j / TONE_STEP), Math.max(0, coarseRows - 2));
    const fy = j / TONE_STEP - cj;
    const py = originY + j * spacing;
    for (let i = 0; i < cols; i++) {
      const ci = Math.min(Math.floor(i / TONE_STEP), Math.max(0, coarseCols - 2));
      const fx = i / TONE_STEP - ci;
      const a = cj * coarseCols + ci;
      const top = coarse[a] + ((coarse[a + 1] ?? coarse[a]) - coarse[a]) * fx;
      const bottomRow = a + coarseCols;
      const bottom =
        (coarse[bottomRow] ?? top) +
        ((coarse[bottomRow + 1] ?? coarse[bottomRow] ?? top) -
          (coarse[bottomRow] ?? top)) *
          fx;

      let baseTone = top + (bottom - top) * fy;

      // Subtle embossed halo transition around the head & neck silhouette so the
      // dense 3D head dots look directly embossed into the continuous background dot membrane
      const px = originX + i * spacing;
      const ellDist = Math.hypot((px - cx) / headRadiusX, (py - cy) / headRadiusY);
      if (ellDist < 0.85) {
        baseTone *= 0.22 + 0.78 * Math.pow(ellDist / 0.85, 1.4);
      } else if (ellDist >= 0.85 && ellDist <= 1.35) {
        const rim = Math.sin(((ellDist - 0.85) / 0.50) * Math.PI);
        baseTone = Math.min(1, baseTone + rim * 0.16);
      }

      tone[j * cols + i] = baseTone;
    }
  }
}

/**
 * Recompute radial lookup tables when the focal center `(cx, cy)` of the female head updates
 * inside a full-bleed workspace.
 */
export function updateFieldFocalCenter(field, cx, cy, headRadius = null) {
  if (!field) return;
  field.cx = cx;
  field.cy = cy;
  const maxRadius = headRadius || Math.min(field.width, field.height) * 0.48;
  field.maxRadius = maxRadius;
  const innerCoreClearance = maxRadius * 0.18;

  const { rows, cols, originX, originY, spacing, radialNorm, dirX, dirY, activeMask } = field;
  for (let j = 0; j < rows; j++) {
    const py = originY + j * spacing;
    const dy = py - cy;
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const px = originX + i * spacing;
      const dx = px - cx;
      const dist = Math.hypot(dx, dy);
      radialNorm[k] = dist / Math.max(1, maxRadius);
      if (dist > 0.0001) {
        dirX[k] = dx / dist;
        dirY[k] = dy / dist;
      } else {
        dirX[k] = 1;
        dirY[k] = 0;
      }
      activeMask[k] = dist < innerCoreClearance ? 0 : 1;
    }
  }
}

/**
 * Create the Kokonut dot field grid and spring buffers in flat typed arrays.
 */
export function createHalftoneGrid(
  width = 640,
  height = 640,
  seed = 7,
  customSpacing = null,
  focalCenter = null
) {
  const safeW = Math.max(120, width);
  const safeH = Math.max(120, height);
  const spacing = customSpacing || (safeW <= 380 ? 16 : 16);

  // One extra dot past each edge, so the membrane has no visible border
  const cols = Math.ceil(safeW / spacing) + 3;
  const rows = Math.ceil(safeH / spacing) + 3;
  const count = cols * rows;

  const originX = (safeW - (cols - 1) * spacing) / 2;
  const originY = (safeH - (rows - 1) * spacing) / 2;

  const tone = new Float32Array(count);
  const coarse = new Float32Array(
    (Math.ceil((cols - 1) / TONE_STEP) + 1) *
      (Math.ceil((rows - 1) / TONE_STEP) + 1)
  );
  const ox = new Float32Array(count);
  const oy = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  const ax = new Float32Array(count);
  const ay = new Float32Array(count);

  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const radialNorm = new Float32Array(count);
  const dirX = new Float32Array(count);
  const dirY = new Float32Array(count);
  const activeMask = new Uint8Array(count);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      baseX[k] = originX + i * spacing;
      baseY[k] = originY + j * spacing;
    }
  }

  const cx = focalCenter?.cx ?? safeW / 2;
  const cy = focalCenter?.cy ?? safeH / 2;
  const maxRadius = focalCenter?.radius ?? Math.min(safeW, safeH) * 0.48;

  const noise = createNoise(seed);
  const field = {
    width: safeW,
    height: safeH,
    cols,
    rows,
    count,
    spacing,
    originX,
    originY,
    cx,
    cy,
    maxRadius,
    tone,
    coarse,
    ox,
    oy,
    vx,
    vy,
    ax,
    ay,
    baseX,
    baseY,
    dispX: ox,
    dispY: oy,
    velX: vx,
    velY: vy,
    accX: ax,
    accY: ay,
    radialNorm,
    dirX,
    dirY,
    activeMask,
    shocks: [],
    noise,
    wavePhase: 0,
    totalEnergy: 0,
    moving: false,
    speechActive: false,
  };

  updateFieldFocalCenter(field, cx, cy, maxRadius);
  sampleTone(field, noise, 0);
  return field;
}

/** Sum of the four neighbours; past the border counts as a still dot (`kokonut-dot-field.tsx`). */
function neighbours(values, field, i, j) {
  const { cols, rows } = field;
  const k = j * cols + i;
  let sum = 0;
  if (i > 0) sum += values[k - 1];
  if (i < cols - 1) sum += values[k + 1];
  if (j > 0) sum += values[k - cols];
  if (j < rows - 1) sum += values[k + cols];
  return sum;
}

/** Spring force on every dot: back to rest, towards neighbours, damping (`kokonut-dot-field.tsx`). */
function accelerate(field) {
  const { cols, rows, ox, oy, vx, vy, ax, ay } = field;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const sx = neighbours(ox, field, i, j);
      const sy = neighbours(oy, field, i, j);
      ax[k] += -ANCHOR * ox[k] + COUPLING * (sx - 4 * ox[k]) - DAMPING * vx[k];
      ay[k] += -ANCHOR * oy[k] + COUPLING * (sy - 4 * oy[k]) - DAMPING * vy[k];
    }
  }
}

/**
 * Travelling vocal shockwave rings emitted from the female head's mouth/core during speech,
 * shoving the halftone dots they cross (`kokonut-dot-field.tsx` `applyShocks` adapted for voice).
 */
function applyShocks(field, shocks) {
  if (!shocks || shocks.length === 0) return;
  const { cols, rows, spacing, originX, originY, ax, ay } = field;
  for (const shock of shocks) {
    const shockX =
      typeof shock.offsetX === 'number' ? field.cx + shock.offsetX : shock.x;
    const shockY =
      typeof shock.offsetY === 'number' ? field.cy + shock.offsetY : shock.y;
    const reach = shock.age * SHOCK_SPEED;
    const fade = Math.max(0, 1 - shock.age / SHOCK_LIFE);
    const strength = shock.strength ?? 1.0;
    const force = SHOCK_FORCE * strength * fade * fade;
    const outer = reach + SHOCK_WIDTH;
    const inner = Math.max(0, reach - SHOCK_WIDTH);

    const i0 = Math.max(0, Math.floor((shockX - outer - originX) / spacing));
    const i1 = Math.min(cols - 1, Math.ceil((shockX + outer - originX) / spacing));
    const j0 = Math.max(0, Math.floor((shockY - outer - originY) / spacing));
    const j1 = Math.min(rows - 1, Math.ceil((shockY + outer - originY) / spacing));

    for (let j = j0; j <= j1; j++) {
      const dy = originY + j * spacing - shockY;
      for (let i = i0; i <= i1; i++) {
        const dx = originX + i * spacing - shockX;
        const dist = Math.hypot(dx, dy);
        if (dist < inner || dist > outer || dist === 0) {
          continue;
        }
        const band = 1 - Math.abs(dist - reach) / SHOCK_WIDTH;
        const k = j * cols + i;
        ax[k] += (dx / dist) * force * band;
        ay[k] += (dy / dist) * force * band;
      }
    }
  }
}

/**
 * How much the membrane is squeezed (+) or stretched (-) at one dot (`kokonut-dot-field.tsx`).
 */
export function compression(field, i, j) {
  const { cols, rows, spacing, ox, oy } = field;
  const k = j * cols + i;
  const left = i > 0 ? ox[k - 1] : 0;
  const right = i < cols - 1 ? ox[k + 1] : 0;
  const up = j > 0 ? oy[k - cols] : 0;
  const down = j < rows - 1 ? oy[k + cols] : 0;
  return -(right - left + down - up) / (2 * spacing);
}

/**
 * Inject outgoing vocal energy & shockwaves from the female head into the halftone membrane.
 * Strictly ignores cursor, clicks, and microphone input.
 */
export function injectSpeechWaveEnergy(
  field,
  { isSpeaking = false, speechLevel = 0, speechPulse = 0, isInitialBurst = false } = {}
) {
  if (!field || !isSpeaking) {
    if (field) {
      field.speechActive = false;
      field.shocks.length = 0;
    }
    return 0;
  }

  const clampedLevel = Math.max(0, Math.min(1, speechLevel || 0));
  const clampedPulse = Math.max(0, Math.min(1, speechPulse || 0));

  if (clampedLevel <= 0.01 && clampedPulse <= 0.01 && !isInitialBurst) {
    field.speechActive = false;
    field.shocks.length = 0;
    return 0;
  }

  field.speechActive = true;

  // Mouth / vocal origin centered on the female head
  const mouthOffsetY = Math.min(field.maxRadius || 220, 240) * 0.12;
  const mouthX = field.cx;
  const mouthY = field.cy + mouthOffsetY;

  // Emit a Kokonut shockwave ring from the head/mouth on speech start or syllable pulse peaks
  if (isInitialBurst || (clampedPulse > 0.35 && field.shocks.length < 3)) {
    const canSpawn =
      field.shocks.length === 0 ||
      field.shocks[field.shocks.length - 1].age > 0.18;
    if (canSpawn) {
      field.shocks.push({
        x: mouthX,
        y: mouthY,
        offsetX: 0,
        offsetY: mouthOffsetY,
        age: 0,
        strength: 0.38 + clampedLevel * 0.52 + clampedPulse * 0.25,
      });
      if (field.shocks.length > 3) {
        field.shocks.shift();
      }
    }
  }

  // Continuous vocal wake around the female head contour during active phonation
  field.wavePhase += 0.22 + clampedLevel * 0.16;
  const phase = field.wavePhase;
  const burstBoost = isInitialBurst ? 24.0 : 0.0;
  const drive = clampedLevel * 42.0 + clampedPulse * 28.0 + burstBoost;

  const { count, radialNorm, dirX, dirY, vx, vy } = field;
  let injectedCount = 0;

  for (let k = 0; k < count; k++) {
    const rn = radialNorm[k];
    // Drive the membrane along the female head / vocal perimeter (0.24 <= rn <= 0.65);
    // neighbour coupling (`COUPLING = 340`) propagates the wake across the entire grid
    if (rn >= 0.24 && rn <= 0.65) {
      const ringFocus = Math.sin(((rn - 0.24) / 0.41) * Math.PI);
      const harmonic =
        0.65 + 0.35 * Math.sin(phase - rn * 7.0 + (dirX[k] * 1.8 + dirY[k] * 1.4));
      const dv = drive * ringFocus * harmonic * STEP;
      vx[k] += dirX[k] * dv;
      vy[k] += dirY[k] * dv;
      injectedCount++;
    }
  }

  return injectedCount;
}

/**
 * One fixed physics step (`kokonut-dot-field.tsx` `integrate`), returning total grid energy.
 */
export function stepDotFieldPhysics(field, h = STEP) {
  if (!field) return 0;

  const { ox, oy, vx, vy, ax, ay, shocks } = field;
  ax.fill(0);
  ay.fill(0);

  const isDrivenStep = Boolean(field.speechActive);
  field.speechActive = false;

  if (isDrivenStep && Array.isArray(shocks) && shocks.length > 0) {
    for (const shock of shocks) {
      shock.age += h;
    }
    while (shocks.length > 0 && shocks[0].age > SHOCK_LIFE) {
      shocks.shift();
    }
    applyShocks(field, shocks);
  }

  accelerate(field);

  let moving = false;
  let totalEnergy = 0;
  const maxDisp = PHYSICS_CONSTANTS.MAX_DISPLACEMENT;
  const settleVelDecay = isDrivenStep ? 0.985 : 0.90;
  const settlePosDecay = isDrivenStep ? 0.995 : 0.93;

  for (let k = 0; k < ox.length; k++) {
    let nvx = (vx[k] + ax[k] * h) * settleVelDecay;
    let nvy = (vy[k] + ay[k] * h) * settleVelDecay;
    let nox = (ox[k] + nvx * h) * settlePosDecay;
    let noy = (oy[k] + nvy * h) * settlePosDecay;

    const mag = Math.hypot(nox, noy);
    if (mag > maxDisp) {
      const scale = maxDisp / mag;
      nox *= scale;
      noy *= scale;
      nvx *= 0.5;
      nvy *= 0.5;
    }

    vx[k] = nvx;
    vy[k] = nvy;
    ox[k] = nox;
    oy[k] = noy;

    if (
      !moving &&
      (Math.abs(nvx) > REST_SPEED ||
        Math.abs(nvy) > REST_SPEED ||
        Math.abs(nox) > REST_OFFSET ||
        Math.abs(noy) > REST_OFFSET)
    ) {
      moving = true;
    }

    const stepVx = nvx * h;
    const stepVy = nvy * h;
    totalEnergy += 0.5 * (nox * nox + noy * noy) + 0.5 * (stepVx * stepVx + stepVy * stepVy);
  }

  if (!isDrivenStep && totalEnergy < PHYSICS_CONSTANTS.SLEEP_ENERGY_EPSILON) {
    ox.fill(0);
    oy.fill(0);
    vx.fill(0);
    vy.fill(0);
    totalEnergy = 0;
    moving = false;
  }

  field.moving = moving;
  field.totalEnergy = totalEnergy;
  return totalEnergy;
}

/**
 * Draw every dot using Kokonut's 10-bucket quantization (`BUCKETS = 10`, `COMPRESSION_GAIN = 3`)
 * in Gideon's cybernetic cyan/blue color palette.
 */
function drawKokonutHalftone(ctx, field, width, height, color, moving) {
  const { cols, rows, spacing, originX, originY, tone, ox, oy } = field;
  const maxRadius = spacing * 0.39;
  const hasPath2D = typeof Path2D !== 'undefined';
  const paths = hasPath2D ? Array.from({ length: BUCKETS }, () => new Path2D()) : null;
  const bucketCoords = hasPath2D ? null : Array.from({ length: BUCKETS }, () => []);
  const filled = new Uint8Array(BUCKETS);
  const TAU = Math.PI * 2;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      let amount = 0.12 + 0.6 * tone[k];
      if (moving) {
        amount *= 1 + COMPRESSION_GAIN * compression(field, i, j);
      }
      const bucket = Math.round(
        Math.min(1, Math.max(0, amount)) * (BUCKETS - 1)
      );
      if (bucket === 0) {
        continue;
      }
      const radius = (maxRadius * bucket) / (BUCKETS - 1);
      const x = originX + i * spacing + ox[k];
      const y = originY + j * spacing + oy[k];

      if (hasPath2D) {
        const path = paths[bucket];
        path.moveTo(x + radius, y);
        path.arc(x, y, radius, 0, TAU);
      } else {
        bucketCoords[bucket].push(x, y, radius);
      }
      filled[bucket] = 1;
    }
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color || GIDEON_DOT_COLORS.idle;

  for (let b = 1; b < BUCKETS; b++) {
    if (!filled[b]) continue;
    // Progressive halftone opacity harmonized with Gideon's deep-space `#050811` background
    ctx.globalAlpha = 0.08 + (0.28 * b) / (BUCKETS - 1);
    if (hasPath2D) {
      try {
        ctx.fill(paths[b]);
      } catch {
        ctx.fill();
      }
    } else {
      const coords = bucketCoords[b];
      ctx.beginPath();
      for (let m = 0; m < coords.length; m += 3) {
        const x = coords[m];
        const y = coords[m + 1];
        const r = coords[m + 2];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Measure the actual rendered CSS box of the dot-field canvas and the exact center
 * of Gideon's 3D head canvas (`headCanvasRef`) in the dot-field's coordinate space.
 * Avoids clamping to `window.innerWidth` when a sidebar is present so the wave is
 * always 100% centered on Gideon's head in both normal and fullscreen modes.
 */
function measureCanvasAndFocalCenter(
  canvas,
  headCanvasRef,
  fullBleed,
  fallbackW = 640,
  fallbackH = 640
) {
  let w = fallbackW;
  let h = fallbackH;
  let fieldRect = null;

  if (fullBleed && canvas) {
    try {
      fieldRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    } catch {
      fieldRect = null;
    }

    if (fieldRect && fieldRect.width > 120 && fieldRect.height > 120) {
      w = fieldRect.width;
      h = fieldRect.height;
    } else {
      const hostElem =
        canvas.closest &&
        (canvas.closest('.is-fullscreen') ||
          canvas.closest('.futuristic-command-centre') ||
          canvas.parentElement);
      const hostRect =
        hostElem && hostElem.getBoundingClientRect
          ? hostElem.getBoundingClientRect()
          : null;
      if (hostRect && hostRect.width > 120 && hostRect.height > 120) {
        w = hostRect.width;
        h = hostRect.height;
        fieldRect = hostRect;
      } else {
        const winW = typeof window !== 'undefined' ? window.innerWidth || 0 : 0;
        const winH = typeof window !== 'undefined' ? window.innerHeight || 0 : 0;
        w = winW > 120 ? winW : fallbackW;
        h = winH > 120 ? winH : fallbackH;
      }
    }
  }

  const safeW = Math.max(120, Math.round(w));
  const safeH = Math.max(120, Math.round(h));

  if (fullBleed && headCanvasRef?.current && canvas?.getBoundingClientRect) {
    try {
      const cRect = fieldRect || canvas.getBoundingClientRect();
      const headRect = headCanvasRef.current.getBoundingClientRect();
      if (
        cRect &&
        cRect.width > 0 &&
        cRect.height > 0 &&
        headRect &&
        headRect.width > 0 &&
        headRect.height > 0
      ) {
        const scaleX = safeW / cRect.width;
        const scaleY = safeH / cRect.height;
        const cx = (headRect.left - cRect.left + headRect.width * 0.5) * scaleX;
        const cy = (headRect.top - cRect.top + headRect.height * 0.46) * scaleY;
        const radius = Math.min(headRect.width * scaleX, headRect.height * scaleY) * 0.48;
        return { width: safeW, height: safeH, cx, cy, radius };
      }
    } catch {
      // Fall back to geometric center
    }
  }

  return {
    width: safeW,
    height: safeH,
    cx: safeW / 2,
    cy: fullBleed ? safeH * 0.38 : safeH / 2,
    radius: Math.min(safeW, safeH) * 0.42,
  };
}

const VoiceReactiveDotField = forwardRef(function VoiceReactiveDotField(
  {
    width = 640,
    height = 640,
    spacing = 16,
    fullBleed = false,
    headCanvasRef = null,
    isSpeaking = false,
    speechLevel = 0,
    speechPulse = 0,
    state = 'idle',
    reducedMotion = false,
    seed = 7,
  },
  ref
) {
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const rafRef = useRef(null);
  const isSleepingRef = useRef(true);
  const isVisibleRef = useRef(true);
  const isInViewportRef = useRef(true);
  const wasSpeakingRef = useRef(false);

  const propsRef = useRef({
    isSpeaking,
    speechLevel,
    speechPulse,
    state,
    reducedMotion,
  });

  propsRef.current = {
    isSpeaking,
    speechLevel,
    speechPulse,
    state,
    reducedMotion,
  };

  useImperativeHandle(ref, () => ({
    getGrid: () => gridRef.current,
    isSleeping: () => isSleepingRef.current,
  }));

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

    let activeW = width;
    let activeH = height;

    const configureCanvasAndGrid = (measured) => {
      activeW = Math.max(120, Math.round(measured.width));
      activeH = Math.max(120, Math.round(measured.height));
      const dpr =
        typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      canvas.width = Math.round(activeW * dpr);
      canvas.height = Math.round(activeH * dpr);
      if (ctx.setTransform) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else if (dpr !== 1 && ctx.scale) {
        ctx.scale(dpr, dpr);
      }

      const nextField = createHalftoneGrid(activeW, activeH, seed, spacing, {
        cx: measured.cx,
        cy: measured.cy,
        radius: measured.radius,
      });
      gridRef.current = nextField;
      return nextField;
    };

    const initialMeasured = measureCanvasAndFocalCenter(
      canvas,
      headCanvasRef,
      fullBleed,
      width,
      height
    );
    let field = configureCanvasAndGrid(initialMeasured);

    const syncGeometryWithDOM = (currentTime = 0) => {
      if (!fullBleed) return field;
      const measured = measureCanvasAndFocalCenter(
        canvas,
        headCanvasRef,
        fullBleed,
        width,
        height
      );
      if (
        Math.abs(measured.width - activeW) > 4 ||
        Math.abs(measured.height - activeH) > 4
      ) {
        field = configureCanvasAndGrid(measured);
        return field;
      }
      if (
        field &&
        (Math.abs(measured.cx - field.cx) > 2 ||
          Math.abs(measured.cy - field.cy) > 2 ||
          Math.abs(measured.radius - field.maxRadius) > 4)
      ) {
        updateFieldFocalCenter(field, measured.cx, measured.cy, measured.radius);
        sampleTone(field, field.noise, currentTime);
      }
      return field;
    };

    const resolveDotColor = () => {
      const curState = propsRef.current.state;
      if (propsRef.current.isSpeaking || curState === 'speaking') {
        return GIDEON_DOT_COLORS.speaking;
      }
      return GIDEON_DOT_COLORS[curState] || GIDEON_DOT_COLORS.idle;
    };

    // Initial halftone draw
    drawKokonutHalftone(ctx, field, activeW, activeH, resolveDotColor(), false);

    let time = 0;
    let last = 0;
    let lastTone = 0;
    let carry = 0;
    let awake = false;

    const stopLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      isSleepingRef.current = true;
    };

    const frame = (now) => {
      rafRef.current = null;
      if (!isVisibleRef.current || !isInViewportRef.current) {
        stopLoop();
        return;
      }

      // Keep the wave origin locked to Gideon's head even if chat messages or layout shift
      field = syncGeometryWithDOM(time);

      const dotColor = resolveDotColor();
      const reduceMotion = shouldReduceMotion(propsRef.current.reducedMotion);
      if (reduceMotion) {
        field.ox.fill(0);
        field.oy.fill(0);
        field.vx.fill(0);
        field.vy.fill(0);
        field.shocks.length = 0;
        field.totalEnergy = 0;
        field.moving = false;
        drawKokonutHalftone(ctx, field, activeW, activeH, dotColor, false);
        stopLoop();
        return;
      }

      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;

      // Sample live outgoing speech state (strictly audio-driven from playback)
      const serviceSample = voiceService.isSpeaking
        ? voiceService.sampleSpeechState(now)
        : null;
      const activeSpeaking = Boolean(
        voiceService.isSpeaking &&
          serviceSample &&
          serviceSample.isSpeaking &&
          !serviceSample.isPause
      );
      const effectiveLevel = activeSpeaking
        ? Math.max(
            propsRef.current.speechLevel || 0,
            serviceSample ? serviceSample.speechLevel || 0 : 0
          )
        : 0;
      const effectivePulse = activeSpeaking
        ? Math.max(
            propsRef.current.speechPulse || 0,
            serviceSample ? serviceSample.speechPulse || 0 : 0
          )
        : 0;

      const isInitialBurst = activeSpeaking && !wasSpeakingRef.current;
      wasSpeakingRef.current = activeSpeaking;

      if (activeSpeaking) {
        awake = true;
      }

      const wasAwake = awake;
      if (awake) {
        carry = Math.min(carry + Math.max(dt, STEP), STEP * 6);
        let substeps = 0;
        while (carry >= STEP && substeps < 6) {
          if (activeSpeaking) {
            injectSpeechWaveEnergy(field, {
              isSpeaking: true,
              speechLevel: effectiveLevel,
              speechPulse: effectivePulse,
              isInitialBurst: isInitialBurst && substeps === 0,
            });
          }
          stepDotFieldPhysics(field, STEP);
          carry -= STEP;
          substeps++;
        }

        if (
          !activeSpeaking &&
          !field.moving &&
          field.shocks.length === 0 &&
          field.totalEnergy < PHYSICS_CONSTANTS.SLEEP_ENERGY_EPSILON
        ) {
          field.ox.fill(0);
          field.oy.fill(0);
          field.vx.fill(0);
          field.vy.fill(0);
          field.totalEnergy = 0;
          awake = false;
        }
      }

      const toneDue = now - lastTone >= IDLE_FRAME_MS;
      if (toneDue) {
        sampleTone(field, field.noise, time);
        lastTone = now;
      }

      if (wasAwake || toneDue) {
        drawKokonutHalftone(ctx, field, activeW, activeH, dotColor, wasAwake);
      }

      if (!awake && !activeSpeaking) {
        stopLoop();
        return;
      }

      isSleepingRef.current = false;
      rafRef.current = requestAnimationFrame(frame);
    };

    const wake = () => {
      field = syncGeometryWithDOM(time);
      if (shouldReduceMotion(propsRef.current.reducedMotion)) {
        drawKokonutHalftone(ctx, field, activeW, activeH, resolveDotColor(), false);
        return;
      }
      if (!isVisibleRef.current || !isInViewportRef.current) return;
      awake = true;
      if (rafRef.current === null) {
        isSleepingRef.current = false;
        last = 0;
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    const unsubSpeech = voiceService.subscribeSpeech((speechState) => {
      if (speechState.isSpeaking) {
        wake();
      }
    });

    if (
      propsRef.current.isSpeaking ||
      propsRef.current.state === 'speaking' ||
      voiceService.isSpeaking
    ) {
      wake();
    }

    let resizeObserver = null;
    if (fullBleed && typeof ResizeObserver !== 'undefined') {
      const targetToObserve =
        (canvas.closest &&
          (canvas.closest('.is-fullscreen') ||
            canvas.closest('.futuristic-command-centre'))) ||
        canvas.parentElement ||
        canvas;
      resizeObserver = new ResizeObserver(() => {
        field = syncGeometryWithDOM(time);
        drawKokonutHalftone(ctx, field, activeW, activeH, resolveDotColor(), awake);
      });
      resizeObserver.observe(targetToObserve);
      if (targetToObserve !== canvas) {
        resizeObserver.observe(canvas);
      }
      if (headCanvasRef?.current) {
        resizeObserver.observe(headCanvasRef.current);
      }
    }

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState !== 'hidden';
      if (
        isVisibleRef.current &&
        (propsRef.current.isSpeaking ||
          propsRef.current.state === 'speaking' ||
          field.totalEnergy > PHYSICS_CONSTANTS.SLEEP_ENERGY_EPSILON)
      ) {
        wake();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let intersectionObserver = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries && entries[0]) {
            isInViewportRef.current = entries[0].isIntersecting !== false;
            if (
              isInViewportRef.current &&
              (propsRef.current.isSpeaking ||
                propsRef.current.state === 'speaking' ||
                field.totalEnergy > PHYSICS_CONSTANTS.SLEEP_ENERGY_EPSILON)
            ) {
              wake();
            }
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(canvas);
    }

    return () => {
      stopLoop();
      unsubSpeech();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
    };
  }, [width, height, spacing, seed, fullBleed, headCanvasRef]);

  // Trigger immediate physics injection or color refresh when speaking/state props change
  useEffect(() => {
    const field = gridRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    if (shouldReduceMotion(reducedMotion)) return;

    if (fullBleed) {
      const measured = measureCanvasAndFocalCenter(
        canvas,
        headCanvasRef,
        fullBleed,
        width,
        height
      );
      if (
        Math.abs(measured.cx - field.cx) > 2 ||
        Math.abs(measured.cy - field.cy) > 2 ||
        Math.abs(measured.radius - field.maxRadius) > 4
      ) {
        updateFieldFocalCenter(field, measured.cx, measured.cy, measured.radius);
      }
    }

    if (isSpeaking || state === 'speaking' || speechLevel > 0.01 || speechPulse > 0.01) {
      injectSpeechWaveEnergy(field, {
        isSpeaking: true,
        speechLevel: Math.max(speechLevel, 0.35),
        speechPulse,
        isInitialBurst: !wasSpeakingRef.current,
      });
      wasSpeakingRef.current = true;
      stepDotFieldPhysics(field, STEP);
    } else {
      wasSpeakingRef.current = false;
    }

    let ctx = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      ctx = null;
    }
    if (ctx) {
      const dotColor =
        isSpeaking || state === 'speaking'
          ? GIDEON_DOT_COLORS.speaking
          : GIDEON_DOT_COLORS[state] || GIDEON_DOT_COLORS.idle;
      drawKokonutHalftone(ctx, field, field.width, field.height, dotColor, field.moving);
    }
  }, [isSpeaking, speechLevel, speechPulse, state, reducedMotion, fullBleed, headCanvasRef, width, height]);

  const effectiveSpeaking = isSpeaking || state === 'speaking';

  return (
    <canvas
      ref={canvasRef}
      width={fullBleed ? undefined : width}
      height={fullBleed ? undefined : height}
      style={fullBleed ? undefined : { width: `${width}px`, height: `${height}px` }}
      className={`voice-reactive-dot-field ${fullBleed ? 'full-bleed' : ''} state-${state} ${
        effectiveSpeaking ? 'is-speaking' : 'is-idle'
      }`}
      data-testid="voice-reactive-dot-field"
      data-speaking={effectiveSpeaking ? 'true' : 'false'}
      data-reduced-motion={shouldReduceMotion(reducedMotion) ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
});

export default VoiceReactiveDotField;
