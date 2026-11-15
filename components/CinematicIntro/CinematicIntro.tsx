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
const FILL_START = 0.2; // start filling letters at 0.2s
const FILL_END = 7.2;   // all 9 letters completely filled by 7.2s
const CHAR_DURATION = (FILL_END - FILL_START) / LETTERS.length; // ~0.777s per letter
const SNAP_START = 7.5; // when the snap gesture happens and screen flashes white
const SNAP_TRIGGER = 8.1; // when screen is solid white, trigger transition to portfolio

export function CinematicIntro({
  onComplete,
  onSnap,
  videoSrc = "/Portfolio_intro.mp4",
}: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [fills, setFills] = useState<number[]>(() => new Array(LETTERS.length).fill(0));
  const [snapped, setSnapped] = useState(false);
  const snappedRef = useRef(false);
  const finishedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

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

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0;
      video.play().catch(err => {
        console.warn("Autoplay notice:", err);
      });
    }

    startTimeRef.current = performance.now();

    const update = () => {
      if (finishedRef.current) return;

      const v = videoRef.current;
      let currentTime = 0;
      if (v && !v.paused && v.currentTime) {
        currentTime = v.currentTime;
      } else if (startTimeRef.current !== null) {
        currentTime = (performance.now() - startTimeRef.current) / 1000;
      }

      // 1. Calculate letter fills
      const nextFills = LETTERS.map((_, i) => {
        const cStart = FILL_START + i * CHAR_DURATION;
        const cEnd = cStart + CHAR_DURATION;
        if (currentTime <= cStart) return 0;
        if (currentTime >= cEnd) return 100;
        const raw = (currentTime - cStart) / CHAR_DURATION;
        const eased = raw * raw * (3 - 2 * raw);
        return eased * 100;
      });
      setFills(nextFills);

      // 2. Trigger snap & white flash at 7.5s (in sync with video snap)
      if (currentTime >= SNAP_START && !snappedRef.current) {
        snappedRef.current = true;
        setSnapped(true);
        if (onSnap) onSnap();
      }

      // 3. Complete intro and transition into portfolio when flash is solid white
      if (currentTime >= SNAP_TRIGGER || (v && v.ended)) {
        finishedRef.current = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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
    };
  }, [reduce]);

  return (
    <div className={`cinematic-intro-root ${snapped ? "snapped" : ""}`}>
      <button
        type="button"
        className="intro-skip-button"
        onClick={completeImmediately}
        aria-label="Skip Intro"
      >
        Skip
      </button>

      {/* Upper Section: 70% viewport height, anchored to top for full head visibility */}
      <div className="intro-video-stage">
        <video
          ref={videoRef}
          src={withBasePath(videoSrc)}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="intro-video-element"
        />
      </div>

      {/* Lower Section: 30% viewport height, turns pure white during snap */}
      <div className={`intro-typography-stage ${snapped ? "snapped" : ""}`}>
        <div className="intro-word-row" aria-label="PORTFOLIO">
          {LETTERS.map((char, index) => (
            <span key={index} className="intro-char-wrapper">
              <span className="intro-char-outline" aria-hidden="true">
                {char}
              </span>
              <span
                className="intro-char-fill"
                aria-hidden="true"
                style={{
                  clipPath: `inset(${Math.max(0, 100 - fills[index]).toFixed(2)}% 0 0 0)`,
                }}
              >
                {char}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
