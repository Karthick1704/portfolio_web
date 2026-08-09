"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { skillGroups } from "@/data/portfolio";
import { withBasePath } from "@/lib/deployment";

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 22, rotate: -0.5 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, amount: .14 }} transition={{ duration: .55 }}>{children}</motion.div>;
}

export function MobileNav({ items }: { items: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return <><button ref={button} className="menu-button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><AnimatePresence>{open && <motion.nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>{items.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}</motion.nav>}</AnimatePresence></>;
}

export function HeroSystemVisual() {
  return null;
}

export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => { if (!visible || reduce || !ref.current) return; let frame = 0; const start = performance.now(); const run = (now: number) => { const progress = Math.min((now - start) / 900, 1); if (ref.current) ref.current.textContent = `${Math.round(value * progress)}${suffix}`; if (progress < 1) frame = requestAnimationFrame(run); }; frame = requestAnimationFrame(run); return () => cancelAnimationFrame(frame); }, [visible, reduce, value, suffix]);
  return <span aria-label={`${value}${suffix}`}><span ref={ref} aria-hidden="true">{value}{suffix}</span></span>;
}

export function AboutStory() { return <a className="text-button" href={withBasePath("/about/")}>Read full bio <span aria-hidden="true">↗</span></a>; }

export function SkillsFilter() {
  const categories = Object.keys(skillGroups);
  const [active, setActive] = useState(categories[0]);
  const visible = Object.entries(skillGroups).filter(([group]) => group === active);
  return <div><div className="filters" aria-label="Filter skills">{categories.map(category => <button key={category} aria-pressed={active === category} onClick={() => setActive(category)}>{category}</button>)}</div><motion.div className="skill-grid" layout aria-live="polite">{visible.flatMap(([group, skills]) => skills.map(skill => <motion.div layout key={skill} className="skill-block"><span>{skill}</span><small>{group}</small></motion.div>))}</motion.div></div>;
}

type ExperienceCardProps = { company: string; role: string; period: string; summary: string; tech: readonly string[]; progression?: readonly { role: string; period: string }[] };
export function ExperienceCard({ company, role, period, summary, tech, progression }: ExperienceCardProps) {
  const [details, setDetails] = useState(false);
  const [wide, setWide] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => { const query = window.matchMedia("(min-width: 850px)"); const update = () => setWide(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  return <motion.article className="flip-card" animate={{ x: details && wide ? "112%" : "0%", rotateY: details ? 180 : 0 }} transition={reduce ? { duration: 0 } : { duration: .65, type: "spring", bounce: .12 }}><div className="flip-face flip-front"><p>{company}</p><h3>{role}</h3><span>{period}</span>{progression && <ol>{progression.map(item => <li key={item.role}>{item.role}<small>{item.period}</small></li>)}</ol>}<button type="button" onClick={() => setDetails(true)}>View role details</button></div><div className="flip-face flip-back"><p>{company} / details</p><h3>{role}</h3><p className="role-summary">{summary}</p><div className="tags">{tech.map(tag => <span key={tag}>{tag}</span>)}</div><button type="button" onClick={() => setDetails(false)}>Back to overview</button></div></motion.article>;
}

export function ProfilePhoto() {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="photo-button" onClick={() => setOpen(true)} aria-label="View full profile photo"><Image src={withBasePath("/profile.jpg")} width={560} height={560} alt="Portrait of Karthick S" priority /></button><AnimatePresence>{open && <motion.div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Full profile photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}><motion.div initial={{ scale: .92 }} animate={{ scale: 1 }}><Image src={withBasePath("/profile.jpg")} width={1200} height={1200} alt="Portrait of Karthick S" /></motion.div><button type="button" aria-label="Close full profile photo" onClick={() => setOpen(false)}><X /></button></motion.div>}</AnimatePresence></>;
}

export function BlockBannerBuild() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: .25 });
  const reduce = useReducedMotion();
  return <div ref={ref} className="classified-visual" aria-label="Abstract unfinished modular structure. Build in progress."><div className="classified-grid" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <motion.i key={i} className={i === 8 || i === 11 ? "missing" : ""} animate={!reduce && inView && i !== 8 && i !== 11 ? { opacity: [0.35, 1, 1], y: [10, 0, 0], rotate: [-2, 0, 0] } : { opacity: i === 8 || i === 11 ? .08 : 1 }} transition={{ duration: 4, delay: i * .1, repeat: Infinity, repeatDelay: 1.5 }} />)}</div><div className="progress"><span>15% COMPLETE</span><div>{Array.from({ length: 20 }).map((_, i) => <b key={i} className={i < 3 ? "filled" : ""} />)}</div></div></div>;
}
