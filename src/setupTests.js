// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock HTMLCanvasElement getContext for JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    drawImage: () => {},
    getImageData: () => ({
      data: new Uint8ClampedArray(160 * 120 * 4),
      width: 160,
      height: 120,
    }),
  });
}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Mock SpeechSynthesisUtterance
if (typeof window !== 'undefined') {
  function MockUtterance(text) {
    this.text = text || '';
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
  window.SpeechSynthesisUtterance = MockUtterance;
  global.SpeechSynthesisUtterance = MockUtterance;
}

// Mock window.speechSynthesis
if (typeof window !== 'undefined') {
  const synthMock = {
    speak: jest.fn((utterance) => {
      if (utterance && utterance.onstart) {
        utterance.onstart();
      }
    }),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: () => [
      { name: 'Gideon English Voice', lang: 'en-US', voiceURI: 'gideon-en-voice' },
    ],
    onvoiceschanged: null,
  };
  window.speechSynthesis = synthMock;
  global.speechSynthesis = synthMock;
}

// Mock SpeechRecognition Class
if (typeof window !== 'undefined') {
  class MockSpeechRecognition {
    constructor() {
      this.continuous = false;
      this.interimResults = true;
      this.lang = 'en-US';
      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
    }
    start() {
      if (this.onstart) this.onstart();
    }
    stop() {
      if (this.onend) this.onend();
    }
    abort() {
      if (this.onend) this.onend();
    }
  }
  window.SpeechRecognition = MockSpeechRecognition;
  window.webkitSpeechRecognition = MockSpeechRecognition;
  global.SpeechRecognition = MockSpeechRecognition;
  global.webkitSpeechRecognition = MockSpeechRecognition;
}

// Mock navigator.mediaDevices
if (typeof navigator !== 'undefined') {
  const mockMediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
          kind: 'video',
          enabled: true,
        },
      ],
      getVideoTracks: () => [
        {
          stop: jest.fn(),
          kind: 'video',
          enabled: true,
        },
      ],
      active: true,
    }),
  };
  try {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      configurable: true,
      writable: true,
    });
  } catch {
    navigator.mediaDevices = mockMediaDevices;
  }
}
