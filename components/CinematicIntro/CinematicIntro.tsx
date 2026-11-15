"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { withBasePath } from "@/lib/deployment";

interface CinematicIntroProps {
  onComplete: () => void;
  onSnap?: () => void;
  videoSrc?: string;
}

const LETTERS = ["P", "O", "R", "T", "F", "O", "L", "I", "O"];
// Timings below are measured from the video's own frames (24fps).
const FILL_START = 0.2;
const FILL_END = 6.5; // word completes as the fingers snap
const CHAR_DURATION = (FILL_END - FILL_START) / LETTERS.length;
const SNAP = 6.54; // spark appears at the fingertips
const SNAP_X = 0.73; // fingertip position inside the video frame (0..1)
const SNAP_Y = 0.47;
const IMPACT_END = 6.64; // inverted "impact frame" lasts ~2 video frames
const IRIS_START = 6.58; // white light starts spreading from the fingertips
const IRIS_DURATION = 0.5;
const RING_DURATION = 0.55;
const RING_DELAYS = [0, 0.1, 0.2];
const SHAKE_DURATION = 0.45;
const WORD_OUT = 0.8; // seconds the word takes to blow out into the light
const SNAP_TRIGGER = 7.5; // screen is solid white and the word is gone

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function CinematicIntro({
  onComplete,
  onSnap,
  videoSrc = "/Portfolio_intro.mp4",
}: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  // Fixed at mount: a src change mid-play would restart the video.
  const [src] = useState(() => withBasePath(videoSrc));
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const irisRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fxPlacedRef = useRef(false);
  const wordRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  // Set only if the video cannot play; then a wall clock drives the intro.
  const wallStartRef = useRef<number | null>(null);

  const completeImmediately = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    onComplete();
  };

  useEffect(() => {
    if (reduce) {
      completeImmediately();
      return;
    }

    const startWallClock = () => {
      if (wallStartRef.current === null) wallStartRef.current = performance.now();
    };

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.addEventListener("error", startWallClock);
      video.play().catch(startWallClock);
    } else {
      startWallClock();
    }

    const update = () => {
      if (finishedRef.current) return;

      const v = videoRef.current;
      // The video clock is the single source of truth, so text and flash
      // can never drift from the picture (they pause with it if it buffers).
      const t =
        wallStartRef.current !== null
          ? (performance.now() - wallStartRef.current) / 1000
          : (v?.currentTime ?? 0);

      // Write styles directly: re-rendering React 60x a second caused jank.
      for (let i = 0; i < LETTERS.length; i++) {
        const el = fillRefs.current[i];
        if (!el) continue;
        const raw = Math.min(1, Math.max(0, (t - FILL_START - i * CHAR_DURATION) / CHAR_DURATION));
        const eased = raw * raw * (3 - 2 * raw);
        el.style.clipPath = `inset(${(100 - eased * 100).toFixed(2)}% 0 0 0)`;
      }
      if (t >= SNAP) {
        const fx = fxRef.current;
        if (fx && !fxPlacedRef.current) {
          // Pin the effect to the fingertips: map the point in the video frame
          // through object-fit: cover to screen pixels (once, at the snap).
          fxPlacedRef.current = true;
          let x = window.innerWidth * SNAP_X;
          let y = window.innerHeight * SNAP_Y;
          if (v && v.videoWidth) {
            const r = v.getBoundingClientRect();
            const [px, py] = getComputedStyle(v).objectPosition.split(" ").map((n) => parseFloat(n) / 100);
            const k = Math.max(r.width / v.videoWidth, r.height / v.videoHeight);
            const dw = v.videoWidth * k;
            const dh = v.videoHeight * k;
            x = r.left + (r.width - dw) * px + dw * SNAP_X;
            y = r.top + (r.height - dh) * py + dh * SNAP_Y;
          }
          // Radius that reaches the farthest corner from the fingertips.
          const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
          fx.style.left = `${x}px`;
          fx.style.top = `${y}px`;
          fx.style.setProperty("--fx-size", `${reach * 2}px`);
        }

        // 1. Impact frame: the whole picture flips to negative for an instant.
        if (impactRef.current) impactRef.current.style.opacity = t < IMPACT_END ? "1" : "0";

        // 2. Camera kick: punch in and shake, settling quickly.
        if (stageRef.current) {
          const left = 1 - clamp01((t - SNAP) / SHAKE_DURATION);
          const amp = 14 * left * left;
          stageRef.current.style.transform =
            `translate(${(Math.sin(t * 95) * amp).toFixed(2)}px, ${(Math.cos(t * 78) * amp * 0.7).toFixed(2)}px) scale(${(1 + 0.07 * left).toFixed(4)})`;
        }

        // 3. Shockwave rings race outward from the fingertips.
        RING_DELAYS.forEach((delay, i) => {
          const ring = ringRefs.current[i];
          if (!ring) return;
          const p = clamp01((t - SNAP - delay) / RING_DURATION);
          const out = 1 - Math.pow(1 - p, 3);
          ring.style.transform = `translate(-50%, -50%) scale(${(out * 1.1).toFixed(4)})`;
          ring.style.opacity = p > 0 ? (1 - p).toFixed(3) : "0";
        });

        // 4. Light floods out from the fingertips until the screen is white.
        if (irisRef.current) {
          const p = clamp01((t - IRIS_START) / IRIS_DURATION);
          irisRef.current.style.transform = `translate(-50%, -50%) scale(${(Math.pow(p, 2.4) * 1.4).toFixed(4)})`;
        }
      }
      if (wordRef.current) {
        // On the snap the word is thrown toward the viewer and dissolves in the light.
        const p = clamp01((t - IRIS_START) / WORD_OUT);
        const out = 1 - (1 - p) * (1 - p);
        wordRef.current.style.opacity = (1 - out).toFixed(3);
        wordRef.current.style.transform = `scale(${(1 + 0.35 * out).toFixed(4)})`;
      }

      if (t >= SNAP_TRIGGER || v?.ended) {
        finishedRef.current = true;
        // Screen is solid white here: hand over to the page-level flash.
        if (onSnap) onSnap();
        onComplete();
        return;
      }

      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") completeImmediately();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      video?.removeEventListener("error", startWallClock);
    };
  }, [reduce]);

  return (
    <div className="cinematic-intro-root">
      <div ref={stageRef} className="intro-video-stage">
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="intro-video-element"
        />
      </div>

      {/* Snap effect, anchored to the fingertips at the moment of the snap */}
      <div ref={impactRef} className="intro-impact" aria-hidden="true" />
      <div ref={fxRef} className="intro-fx" aria-hidden="true">
        {RING_DELAYS.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
            className="intro-ring"
          />
        ))}
        <div ref={irisRef} className="intro-iris" />
      </div>

      <div ref={wordRef} className="intro-word-row" aria-label="PORTFOLIO">
        {LETTERS.map((char, index) => (
          <span key={index} className="intro-char-wrapper">
            <span className="intro-char-outline" aria-hidden="true">
              {char}
            </span>
            <span
              ref={(el) => {
                fillRefs.current[index] = el;
              }}
              className="intro-char-fill"
              aria-hidden="true"
            >
              {char}
            </span>
          </span>
        ))}
      </div>

      <button
        type="button"
        className="intro-skip-button"
        onClick={completeImmediately}
        aria-label="Skip Intro"
      >
        Skip
      </button>
    </div>
  );
}
