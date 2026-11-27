"use client";

/**
 * Pager audio, synthesized with Web Audio (no audio files).
 * Nothing plays until the visitor clicks, and the mute choice is remembered.
 */

const SOUND_KEY = "pager-sound";
const listeners = new Set<() => void>();

export const readSound = () => { try { return window.localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } };
export const writeSound = (on: boolean) => {
  try { window.localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* storage blocked */ }
  listeners.forEach(fn => fn());
};
export const subscribeSound = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

let ctx: AudioContext | null = null;
function audio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** Classic pager beeps: alternating on/off durations in ms. */
export function beep(pattern: number[], freq: number) {
  const ac = audio();
  if (!ac) return;
  let t = ac.currentTime + 0.02;
  pattern.forEach((dur, i) => {
    if (i % 2 === 0) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur / 1000);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur / 1000 + 0.02);
    }
    t += dur / 1000;
  });
}

/**
 * Soft bird-like "piyo-piyo" chirps, in the spirit of Japanese pedestrian
 * crossing signals. Each chirp is a short sine sweep with a gentle envelope.
 */
export function piyo(repeats = 2) {
  const ac = audio();
  if (!ac) return;
  const chirp = (start: number, f0: number, f1: number, dur: number, vol: number) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + dur * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  };
  let t = ac.currentTime + 0.05;
  for (let i = 0; i < repeats; i++) {
    chirp(t, 2350, 3250, 0.075, 0.045);        // "pi"
    chirp(t + 0.11, 3050, 2250, 0.11, 0.04);   // "yo"
    t += 0.42;
  }
}
