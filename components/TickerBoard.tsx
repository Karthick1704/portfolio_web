"use client";

import { useState } from "react";
import { motion } from "motion/react"; // if you're on an older install, this is `framer-motion` instead
import { Circle } from "lucide-react";

const ROLES = [
  "Application Software Engineer",
  "System Engineer",
  "UI/UX Enthusiast",
  "DevOps Builder",
  "Linux Admin",
];

const ACCENT = "#93dc5c";

export default function TickerBoard() {
  const [paused, setPaused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="rounded-2xl bg-gradient-to-b from-[#161c14] to-[#030502] p-3.5 shadow-[0_20px_40px_rgba(0,0,0,0.55)]">
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onClick={() => setPaused((p) => !p)} // tap-to-pause for touch devices
          className="relative cursor-pointer overflow-hidden rounded-md bg-[#060a05] py-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(147,220,92,0.08) 1px, transparent 1.4px)",
            backgroundSize: "6px 6px",
          }}
        >
          <div
            className="flex w-max animate-ticker-scroll whitespace-nowrap"
            style={{ animationPlayState: paused ? "paused" : "running" }}
          >
            {[0, 1].map((rep) => (
              <div
                key={rep}
                className="flex items-center pr-12"
                aria-hidden={rep === 1}
              >
                {ROLES.map((role) => (
                  <span key={role} className="flex items-center">
                    <span
                      className="px-6 font-mono text-[clamp(18px,3.6vw,30px)] font-bold tracking-wider"
                      style={{
                        color: ACCENT,
                        textShadow:
                          "0 0 4px rgba(147,220,92,0.75), 0 0 12px rgba(147,220,92,0.75), 0 0 22px rgba(147,220,92,0.4)",
                      }}
                    >
                      {role.toUpperCase()}
                    </span>
                    <motion.span
                      animate={{ opacity: [1, 0.35, 1] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Circle
                        className="h-2 w-2"
                        fill={ACCENT}
                        color={ACCENT}
                        style={{
                          filter: "drop-shadow(0 0 6px rgba(147,220,92,0.75))",
                        }}
                      />
                    </motion.span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-ticker-scroll {
          animation: ticker-scroll 22s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ticker-scroll {
            animation: none;
          }
        }
      `}</style>
    </motion.div>
  );
}
