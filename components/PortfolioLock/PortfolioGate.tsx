"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PortfolioLock } from "./PortfolioLock";
import { CinematicIntro } from "@/components/CinematicIntro";

type GateState = "locked" | "intro" | "portfolio";

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<GateState>("locked");

  return (
    <>
      <AnimatePresence mode="wait">
        {stage === "locked" && (
          <motion.div
            key="lock"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
          >
            <PortfolioLock onUnlock={() => setStage("intro")} />
          </motion.div>
        )}

        {stage === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
          >
            <CinematicIntro onComplete={() => setStage("portfolio")} />
          </motion.div>
        )}
      </AnimatePresence>

      {stage === "portfolio" && (
        <motion.div
          key="portfolio"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
        >
          {children}
        </motion.div>
      )}
    </>
  );
}
