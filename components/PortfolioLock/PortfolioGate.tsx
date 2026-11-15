"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PortfolioLock } from "./PortfolioLock";
import { CinematicIntro } from "@/components/CinematicIntro";

type GateState = "locked" | "intro" | "portfolio";

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<GateState>("locked");
  const [flashing, setFlashing] = useState(false);

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

      {/* Global White Flash: Sweeps whole screen pure white on the snap, then reveals home screen */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            key="white-flash"
            className="global-white-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === "portfolio" ? 0 : 1 }}
            transition={{
              duration: stage === "portfolio" ? 0.95 : 0.35,
              ease: stage === "portfolio" ? [0.16, 1, 0.3, 1] : "easeIn",
            }}
            onAnimationComplete={() => {
              if (stage === "portfolio") setFlashing(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
