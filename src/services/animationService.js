/**
 * Purposeful Anime.js Orchestration Service for Gideon Phase 4.
 * Coordinates non-blocking entrance reveals, holographic transitions,
 * command palette appearances, and confirmation dialog states.
 */
import anime from 'animejs';

/**
 * Check if the user has requested reduced motion either via OS or Gideon preferences.
 */
export function shouldReduceMotion(userPreference = false) {
  if (userPreference) return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/**
 * Orchestrate futuristic panel or workspace entrance transition.
 */
export function animatePanelEntrance(element, reducedMotion = false) {
  if (!element) return null;
  if (shouldReduceMotion(reducedMotion)) {
    element.style.opacity = '1';
    element.style.transform = 'none';
    return null;
  }

  anime.remove(element);
  return anime({
    targets: element,
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 280,
    easing: 'easeOutCubic',
  });
}

/**
 * Orchestrate 21st.dev style Command Palette reveal.
 */
export function animateCommandPaletteOpen(overlayEl, modalEl, reducedMotion = false) {
  if (!modalEl) return null;
  if (shouldReduceMotion(reducedMotion)) {
    if (overlayEl) overlayEl.style.opacity = '1';
    modalEl.style.opacity = '1';
    modalEl.style.transform = 'none';
    return null;
  }

  if (overlayEl) {
    anime.remove(overlayEl);
    anime({
      targets: overlayEl,
      opacity: [0, 1],
      duration: 180,
      easing: 'linear',
    });
  }

  anime.remove(modalEl);
  return anime({
    targets: modalEl,
    opacity: [0, 1],
    translateY: [-16, 0],
    scale: [0.97, 1],
    duration: 220,
    easing: 'easeOutQuint',
  });
}

/**
 * Orchestrate Confirmation Modal entrance with high visual clarity.
 */
export function animateConfirmationModal(modalEl, reducedMotion = false) {
  if (!modalEl) return null;
  if (shouldReduceMotion(reducedMotion)) {
    modalEl.style.opacity = '1';
    modalEl.style.transform = 'none';
    return null;
  }

  anime.remove(modalEl);
  return anime({
    targets: modalEl,
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 240,
    easing: 'easeOutBack',
  });
}

/**
 * Orchestrate Tech Brain initial boot sequence or state change flare.
 */
export function animateTechBrainStateShift(ringElements, state, reducedMotion = false) {
  if (!ringElements || ringElements.length === 0 || shouldReduceMotion(reducedMotion)) {
    return null;
  }

  anime.remove(ringElements);

  let scaleValues = [1, 1.05, 1];
  let duration = 400;

  if (state === 'executing' || state === 'processing') {
    scaleValues = [1, 1.08, 0.98, 1];
    duration = 550;
  }

  return anime({
    targets: ringElements,
    scale: scaleValues,
    duration,
    easing: 'easeInOutSine',
  });
}

/**
 * Orchestrate short arrival micro-transition for new messages.
 */
export function animateMessageArrival(element, reducedMotion = false) {
  if (!element || shouldReduceMotion(reducedMotion)) {
    if (element) {
      element.style.opacity = '1';
      element.style.transform = 'none';
    }
    return null;
  }

  anime.remove(element);
  return anime({
    targets: element,
    opacity: [0, 1],
    translateX: [-8, 0],
    duration: 200,
    easing: 'easeOutQuad',
  });
}

/**
 * Orchestrate desktop task status pill transition.
 */
export function animateTaskStatusChange(pillEl, reducedMotion = false) {
  if (!pillEl || shouldReduceMotion(reducedMotion)) return null;

  anime.remove(pillEl);
  return anime({
    targets: pillEl,
    scale: [0.9, 1.04, 1],
    duration: 300,
    easing: 'easeOutBack',
  });
}

/**
 * Safely remove / cancel all running Anime.js animations on specified targets.
 */
export function cleanupAnimations(targets) {
  if (targets) {
    try {
      anime.remove(targets);
    } catch {
      // Ignore cleanup error if already detached
    }
  }
}
