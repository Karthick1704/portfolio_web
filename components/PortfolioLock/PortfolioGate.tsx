"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PortfolioLock } from "./PortfolioLock";

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  return unlocked ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5 }}>{children}</motion.div> : <PortfolioLock onUnlock={() => setUnlocked(true)} />;
}
