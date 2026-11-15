"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PortfolioLock } from "./PortfolioLock";
import { CinematicIntro } from "@/components/CinematicIntro";
import { withBasePath } from "@/lib/deployment";

type GateState = "locked" | "intro" | "portfolio";

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<GateState>("locked");
  const [flashing, setFlashing] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>();

  // Download the intro video while the puzzle is on screen, so it plays
  // from memory instead of buffering mid-intro.
  useEffect(() => {
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
            <PortfolioLock onUnlock={() => setStage("intro")} />
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
