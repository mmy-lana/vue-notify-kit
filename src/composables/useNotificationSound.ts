/**
 * Zero-asset notification audio (architecture plan §3.3).
 *
 * Alert chimes are synthesised with the native Web Audio API, so the library
 * ships no `.mp3`/`.wav` payloads and no network requests. The `AudioContext` is
 * created lazily on the first user interaction (browser autoplay policy), and
 * every failure mode — unsupported runtime, blocked context, suspended state —
 * degrades silently instead of throwing.
 */

import { ref, type Ref } from 'vue';

import type { NotificationType } from '@/types/notify';

/** A single scheduled sine tone. */
interface ToneSpec {
  /** Oscillator frequency in hertz. */
  readonly frequency: number;
  /** Delay from the start of the chime, in seconds. */
  readonly offset: number;
  /** Tone length in seconds. */
  readonly duration: number;
  /** Peak linear gain reached after the attack ramp. */
  readonly peakGain: number;
}

interface ChimeSpec {
  readonly tones: readonly ToneSpec[];
}

/** Linear attack ramp applied to every tone (seconds). */
const ATTACK_SECONDS = 0.012;

/** Exponential release floor — `exponentialRampToValueAtTime` rejects zero. */
const MIN_GAIN = 0.0001;

/** Lead time added before scheduling so oscillators never start in the past. */
const SCHEDULE_LEAD_SECONDS = 0.02;

/**
 * Chime algorithm table.
 *
 * - `success`  : D5 (587.33 Hz, 80 ms) → A5 (880 Hz, 120 ms), ascending.
 * - `error`    : A3 (220 Hz) blended with Bb3 (233.08 Hz) for 180 ms, producing
 *                a dissonant warning beat.
 * - `warning`  : Bb4 (466.16 Hz) double blip, bridging info and error.
 * - `info` / `default` : single pure C5 chime (523.25 Hz, 100 ms).
 * - `loading`  : intentionally silent — persistent spinners must not beep.
 */
const CHIME_LIBRARY: Partial<Record<NotificationType, ChimeSpec>> = {
  success: {
    tones: [
      { frequency: 587.33, offset: 0, duration: 0.08, peakGain: 0.16 },
      { frequency: 880, offset: 0.08, duration: 0.12, peakGain: 0.2 },
    ],
  },
  error: {
    tones: [
      { frequency: 220, offset: 0, duration: 0.18, peakGain: 0.14 },
      { frequency: 233.08, offset: 0, duration: 0.18, peakGain: 0.12 },
    ],
  },
  warning: {
    tones: [
      { frequency: 466.16, offset: 0, duration: 0.09, peakGain: 0.15 },
      { frequency: 466.16, offset: 0.13, duration: 0.09, peakGain: 0.12 },
    ],
  },
  info: {
    tones: [{ frequency: 523.25, offset: 0, duration: 0.1, peakGain: 0.16 }],
  },
  default: {
    tones: [{ frequency: 523.25, offset: 0, duration: 0.1, peakGain: 0.16 }],
  },
};

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

/** Passive options: unlock listeners must never block scrolling or input. */
const UNLOCK_LISTENER_OPTIONS: AddEventListenerOptions = { passive: true };

/** Public surface returned by {@link useNotificationSound}. */
export interface NotificationSoundApi {
  /** Master mute switch shared by every consumer. */
  readonly isMuted: Ref<boolean>;
  /** True when the runtime exposes a usable `AudioContext` constructor. */
  canPlaySound(): boolean;
  /** Resumes the context after a user gesture; resolves `true` when running. */
  unlock(): Promise<boolean>;
  /** Plays the chime mapped to `type`; silent for `loading` and unknowns. */
  play(type: NotificationType): void;
  /** Sets the master mute switch (muting also stops scheduled tones' source). */
  setMuted(value: boolean): void;
  /** Flips the master mute switch; returns the new value. */
  toggleMuted(): boolean;
  /** Closes the audio context and detaches unlock listeners. */
  dispose(): void;
}

/* -------------------------------------------------------------------------- */
/* Singleton audio engine                                                      */
/* -------------------------------------------------------------------------- */

const isMuted = ref(false);

let audioContext: AudioContext | null = null;
let audioUnavailable = false;
let unlockListenersAttached = false;
let consumers = 0;

/** True when a Web Audio constructor exists — never instantiates a context. */
function canPlaySound(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function';
}

/** Lazily instantiates (and memoises) the shared `AudioContext`. */
function getAudioContext(): AudioContext | null {
  if (audioUnavailable || !canPlaySound()) {
    return null;
  }

  if (audioContext !== null) {
    return audioContext;
  }

  const ContextConstructor = window.AudioContext ?? window.webkitAudioContext;

  if (typeof ContextConstructor !== 'function') {
    audioUnavailable = true;
    return null;
  }

  try {
    audioContext = new ContextConstructor();
  } catch {
    // Autoplay policies, hardware limits, or an exhausted context budget.
    audioUnavailable = true;
    audioContext = null;
  }

  return audioContext;
}

function scheduleTone(context: AudioContext, tone: ToneSpec, chimeStart: number): void {
  const start = chimeStart + tone.offset;
  const end = start + tone.duration;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(tone.frequency, start);

  // Attack ramp up, then smooth exponential release back to silence.
  gain.gain.setValueAtTime(MIN_GAIN, start);
  gain.gain.linearRampToValueAtTime(tone.peakGain, start + ATTACK_SECONDS);
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, end);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.addEventListener(
    'ended',
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true },
  );

  oscillator.start(start);
  oscillator.stop(end + 0.01);
}

function emitChime(type: NotificationType): void {
  const chime = CHIME_LIBRARY[type];

  if (chime === undefined) {
    return;
  }

  const context = getAudioContext();

  if (context === null) {
    return;
  }

  const chimeStart = context.currentTime + SCHEDULE_LEAD_SECONDS;

  try {
    for (const tone of chime.tones) {
      scheduleTone(context, tone, chimeStart);
    }
  } catch {
    // A closed or exhausted context: fail silently, never break the toast flow.
  }
}

async function resumeContext(): Promise<boolean> {
  const context = getAudioContext();

  if (context === null) {
    return false;
  }

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    return context.state === 'running';
  } catch {
    return false;
  }
}

function detachUnlockListeners(): void {
  if (!unlockListenersAttached || typeof window === 'undefined') {
    return;
  }

  for (const eventName of UNLOCK_EVENTS) {
    window.removeEventListener(eventName, handleFirstInteraction, UNLOCK_LISTENER_OPTIONS);
  }

  unlockListenersAttached = false;
}

function handleFirstInteraction(): void {
  void resumeContext().then((running) => {
    if (running) {
      detachUnlockListeners();
    }
  });
}

/**
 * Arms one-shot-ish gesture listeners that warm the audio context, satisfying
 * autoplay policies without any app-level wiring. Listeners self-detach once the
 * context is running and stay armed while it remains blocked.
 */
function attachUnlockListeners(): void {
  if (typeof window === 'undefined' || unlockListenersAttached || !canPlaySound()) {
    return;
  }

  for (const eventName of UNLOCK_EVENTS) {
    window.addEventListener(eventName, handleFirstInteraction, UNLOCK_LISTENER_OPTIONS);
  }

  unlockListenersAttached = true;
}

function teardown(): void {
  detachUnlockListeners();

  const context = audioContext;
  audioContext = null;

  if (context !== null && context.state !== 'closed') {
    void context.close().catch(() => {
      // Closing is best-effort; a rejected close leaves a suspended context.
    });
  }
}

const api: NotificationSoundApi = {
  isMuted,

  canPlaySound,

  unlock(): Promise<boolean> {
    return resumeContext();
  },

  play(type: NotificationType): void {
    if (isMuted.value) {
      return;
    }

    const context = getAudioContext();

    if (context === null) {
      return;
    }

    if (context.state === 'suspended') {
      // The browser blocks audio until a gesture: resume, then chime once ready.
      void context
        .resume()
        .then(() => {
          emitChime(type);
        })
        .catch(() => {
          // Autoplay policy still blocking audio — stay silent.
        });

      return;
    }

    emitChime(type);
  },

  setMuted(value: boolean): void {
    isMuted.value = value;
  },

  toggleMuted(): boolean {
    isMuted.value = !isMuted.value;
    return isMuted.value;
  },

  dispose(): void {
    if (consumers === 0) {
      return;
    }

    consumers -= 1;

    if (consumers === 0) {
      teardown();
    }
  },
};

/**
 * Accesses the shared notification sound engine.
 *
 * Safe to call from component setup or plain modules; the first call arms the
 * gesture listeners that unlock audio, and the last `dispose()` releases them.
 */
export function useNotificationSound(): NotificationSoundApi {
  consumers += 1;
  attachUnlockListeners();

  return api;
}
