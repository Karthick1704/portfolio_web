"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { withBasePath } from "@/lib/deployment";

interface CinematicIntroProps {
  onComplete: () => void;
  videoSrc?: string;
}

const LETTERS = ["P", "O", "R", "T", "F", "O", "L", "I", "O"];
const TOTAL_DURATION = 10.0; // exactly 10 seconds
const FILL_START = 0.2;      // start filling at 0.2s
const FILL_END = 9.8;        // complete all letters at 9.8s
const CHAR_DURATION = (FILL_END - FILL_START) / LETTERS.length; // ~1.066s per character

export function CinematicIntro({
  onComplete,
  videoSrc = "/Portfolio_intro.mp4",
}: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [fills, setFills] = useState<number[]>(() => new Array(LETTERS.length).fill(0));
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const completeIntro = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    // Fill all letters 100%
    setFills(new Array(LETTERS.length).fill(100));

    // Smooth cinematic fade transition out
    setTimeout(() => {
      onComplete();
    }, 700);
  };

  useEffect(() => {
    if (reduce) {
      completeIntro();
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

      if (currentTime > TOTAL_DURATION) currentTime = TOTAL_DURATION;

      // Calculate fill percentages for each of the 9 characters
      const nextFills = LETTERS.map((_, i) => {
        const cStart = FILL_START + i * CHAR_DURATION;
        const cEnd = cStart + CHAR_DURATION;
        if (currentTime <= cStart) return 0;
        if (currentTime >= cEnd) return 100;
        const raw = (currentTime - cStart) / CHAR_DURATION;
        // Smoothstep easing for liquid luxury feel
        const eased = raw * raw * (3 - 2 * raw);
        return eased * 100;
      });

      setFills(nextFills);

      if (currentTime >= TOTAL_DURATION || (v && v.ended)) {
        completeIntro();
        return;
      }

      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") completeIntro();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reduce]);

  return (
    <motion.div
      className="cinematic-intro-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: finished ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        className="intro-skip-button"
        onClick={completeIntro}
        aria-label="Skip Intro"
      >
        Skip
      </button>

      {/* Upper Section: 68% viewport height */}
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

      {/* Lower Section: 32% viewport height */}
      <div className="intro-typography-stage">
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
    </motion.div>
  );
}
