"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PortfolioLock } from "./PortfolioLock";
import { CinematicIntro } from "@/components/CinematicIntro";
import { withBasePath } from "@/lib/deployment";

type GateState = "locked" | "intro" | "portfolio";

// Remembered for the browser tab's session, so coming back from another page
// (e.g. /about) skips the puzzle and intro. A fresh visit still gets both.
const UNLOCK_KEY = "portfolio-unlocked";
const noopSubscribe = () => () => {};
const readUnlocked = () => {
  try { return window.sessionStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
};
const rememberUnlocked = () => {
  try { window.sessionStorage.setItem(UNLOCK_KEY, "1"); } catch { /* storage blocked: puzzle simply shows again */ }
};

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const [rawStage, setStage] = useState<GateState>("locked");
  const alreadyUnlocked = useSyncExternalStore(noopSubscribe, readUnlocked, () => false);
  const stage: GateState = alreadyUnlocked && rawStage === "locked" ? "portfolio" : rawStage;
  const [flashing, setFlashing] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>();

  // Download the intro video while the puzzle is on screen, so it plays
  // from memory instead of buffering mid-intro.
  useEffect(() => {
    if (readUnlocked()) return; // no intro to play, skip the download
    let url: string | undefined;
    fetch(withBasePath("/Portfolio_intro.mp4"))
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setVideoSrc(url);
      })
      .catch(() => {}); // intro falls back to streaming the file
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {stage === "locked" && (
          <motion.div
            key="lock"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
          >
            <PortfolioLock onUnlock={() => { rememberUnlocked(); setStage("intro"); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {stage === "intro" && (
        <div key="intro" style={{ position: "relative", zIndex: 900 }}>
          <CinematicIntro
            videoSrc={videoSrc}
            onSnap={() => setFlashing(true)}
            onComplete={() => setStage("portfolio")}
          />
        </div>
      )}

      {stage === "portfolio" && (
        <motion.div
          key="portfolio"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          {children}
        </motion.div>
      )}

      {/* Global White Flash: starts solid white (the intro ends on white), then fades to reveal the home screen */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            key="white-flash"
            className="global-white-flash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setFlashing(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
