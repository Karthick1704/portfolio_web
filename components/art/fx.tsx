"use client";

import { motion, useInView, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { experience } from "@/data/portfolio";
import { telemetry } from "./ShaderBackdrop";

/** Thin reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

const FX_CARDS = ".project-card,.credential-card,.skill-block,.contact-panel,.classified,.xp-card,.engine-cell,.engine-stack li,.name-graph";
const TILT_CARDS = ".project-card,.credential-card,.xp-card";

/** One delegated listener: cursor-tracked spotlight on every card, 3D tilt on the big ones. */
export function PointerFx() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last: HTMLElement | null = null;
    const clear = () => { last?.style.removeProperty("--rx"); last?.style.removeProperty("--ry"); };
    const move = (e: PointerEvent) => {
      const el = e.target instanceof Element ? (e.target.closest(FX_CARDS) as HTMLElement | null) : null;
      if (last !== el) clear();
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      if (!reduce && el.matches(TILT_CARDS)) {
        el.style.setProperty("--rx", `${((0.5 - y) * 5).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((x - 0.5) * 6).toFixed(2)}deg`);
      }
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", clear);
    return () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", clear); };
  }, []);
  return null;
}

const GLYPHS = "ABCDEFGHJKLMNPRSTUVXYZ0123456789#/<>_";

/** Text that resolves out of random glyphs the first time it scrolls into view. */
export function Decode({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!inView || reduce || !el) return;
    const duration = 350 + text.length * 42;
    const start = performance.now();
    let raf = 0, tick = -1;
    const run = (now: number) => {
      const solved = Math.floor(((now - start) / duration) * text.length);
      if (solved >= text.length) { el.textContent = text; return; }
      const step = Math.floor((now - start) / 45);
      if (step !== tick) {
        tick = step;
        el.textContent = text.split("").map((ch, i) => (i < solved || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join("");
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => { cancelAnimationFrame(raf); el.textContent = text; };
  }, [inView, reduce, text]);
  return <span aria-label={text}><span ref={ref} aria-hidden="true">{text}</span></span>;
}

/** Career timeline whose spine draws itself as you scroll through it. */
export function ExperienceTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <ol ref={ref} className="xp">
      <span className="xp-rail" aria-hidden="true" />
      <motion.span className="xp-line" style={{ scaleY: reduce ? 1 : scaleY }} aria-hidden="true" />
      {experience.map((job, i) => (
        <motion.li
          key={job.role}
          className="xp-item"
          initial={reduce ? false : { opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="xp-when">
            <b>{job.company}</b>
            <span>{job.period}</span>
            {i === 0 && <em><i aria-hidden="true" /> Current</em>}
          </div>
          <i className="xp-node" aria-hidden="true" />
          <article className="xp-card">
            <span className="xp-index" aria-hidden="true">{String(experience.length - i).padStart(2, "0")}</span>
            <h3>{job.role}</h3>
            <p>{job.summary}</p>
            <div className="tags">{job.tech.map(tag => <span key={tag}>{tag}</span>)}</div>
          </article>
        </motion.li>
      ))}
    </ol>
  );
}

type Readout = { fps: number; res: string; gpu: string; frames: number; scroll: number; active: boolean };

/** Live readout of the WebGL background running behind the page. */
export function EngineReadout() {
  const [r, setR] = useState<Readout>({ fps: 0, res: "—", gpu: "—", frames: 0, scroll: 0, active: false });
  useEffect(() => {
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setR({
        fps: telemetry.fps,
        res: telemetry.width ? `${telemetry.width} × ${telemetry.height}` : "—",
        gpu: telemetry.gpu || "—",
        frames: telemetry.frames,
        scroll: max > 0 ? Math.round((window.scrollY / max) * 100) : 0,
        active: telemetry.active,
      });
    };
    read();
    const id = window.setInterval(read, 400);
    return () => window.clearInterval(id);
  }, []);
  const cells = [
    { label: "Frame rate", value: r.active ? `${r.fps || "—"}` : "—", unit: "FPS" },
    { label: "Shader resolution", value: r.res, unit: "PX" },
    { label: "Frames drawn", value: r.frames.toLocaleString("en-US"), unit: "THIS VISIT" },
    { label: "Scroll position", value: `${r.scroll}`, unit: "%" },
  ];
  return (
    <div className="engine-readout" aria-label="Live rendering statistics">
      <p className="engine-status"><i className={r.active ? "on" : ""} aria-hidden="true" />{r.active ? "LIVE · RENDERING ON YOUR GPU" : "SHADER PAUSED · STATIC FALLBACK"}</p>
      <div className="engine-cells">
        {cells.map(cell => <div key={cell.label} className="engine-cell"><small>{cell.label}</small><b>{cell.value}</b><span>{cell.unit}</span></div>)}
      </div>
      <p className="engine-gpu"><small>Renderer</small>{r.gpu}</p>
    </div>
  );
}
