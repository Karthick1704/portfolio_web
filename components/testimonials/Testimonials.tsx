"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { testimonials, type Testimonial } from "@/data/testimonials";
import { withBasePath } from "@/lib/deployment";
import { BadgeAvatar } from "./BadgeAvatar";

// Per-slot hanging setup; repeats if there are more testimonials than slots.
const STRING = [56, 108, 74, 128, 88];
const REST = [-2.4, 1.8, -1.2, 2.6, -1.9];

type Wire = { width: number; height: number; path: string; pins: { x: number; y: number }[] };
type Swing = { el: HTMLElement; rest: number; amp: number; freq: number; phase: number; s: number; v: number };

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Portrait({ t, className }: { t: Testimonial; className: string }) {
  if (t.photo) {
    const src = /^https?:/.test(t.photo) ? t.photo : withBasePath(t.photo);
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={src} alt="" loading="lazy" decoding="async" />;
  }
  return <BadgeAvatar className={className} gender={t.avatarGender} />;
}

function Badge({ t, index, onFlip, onHover }: { t: Testimonial; index: number; onFlip: (flipped: boolean) => void; onHover: (dir: number) => void }) {
  const [flipped, setFlipped] = useState(false);
  const rect = useRef<DOMRect | null>(null);
  const toggle = () => { const next = !flipped; setFlipped(next); onFlip(next); };
  const role = [t.designation, t.company].filter(Boolean).join(" · ");

  return (
    <div
      className={`tm-card${flipped ? " flipped" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? `Testimonial from ${t.name}. Flip back to the badge.` : `${t.name}, ${role}. Flip to read their note.`}
      onClick={toggle}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      onPointerEnter={e => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        rect.current = r;
        onHover(e.clientX < r.left + r.width / 2 ? 1 : -1);
      }}
      onPointerMove={e => {
        const r = rect.current;
        if (e.pointerType !== "mouse" || !r) return;
        const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        const s = e.currentTarget.style;
        s.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        s.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        s.setProperty("--tx", `${((0.5 - y) * 14).toFixed(2)}deg`);
        s.setProperty("--ty", `${((x - 0.5) * 16).toFixed(2)}deg`);
      }}
      onPointerLeave={e => {
        rect.current = null;
        const s = e.currentTarget.style;
        s.removeProperty("--tx");
        s.removeProperty("--ty");
      }}
    >
      <div className="tm-tilt">
        <div className="tm-flipper">
          <div className="tm-face tm-front" aria-hidden={flipped}>
            <i className="tm-hole" aria-hidden="true" />
            <div className="tm-meta"><span>Testimonial</span><span>#{t.id}</span></div>
            <div className="tm-portrait" style={{ background: t.accentColor }}><Portrait t={t} className="tm-photo" /></div>
            <p className="tm-name">{t.name}</p>
            <p className="tm-role">{role}</p>
            <div className="tm-cue"><span>Read note</span><i aria-hidden="true"><RotateCw /></i></div>
            <span className="tm-shine" aria-hidden="true" />
          </div>
          <div className="tm-face tm-back" aria-hidden={!flipped}>
            <i className="tm-hole" aria-hidden="true" />
            <div className="tm-meta"><span>Note</span><span>#{t.id}</span></div>
            <div className="tm-who">
              <span className="tm-mini" style={{ background: t.accentColor }}><Portrait t={t} className="tm-photo" /></span>
              <span><b>{t.name}</b><small>{role}</small></span>
            </div>
            <blockquote className="tm-quote">{t.testimonial}</blockquote>
            <div className="tm-cue"><span>{t.tag ?? "Flip back"}</span><i aria-hidden="true"><RotateCw /></i></div>
            <span className="tm-shine" aria-hidden="true" />
          </div>
        </div>
      </div>
      {index === 0 && <span className="sr-only">Press Enter to flip.</span>}
    </div>
  );
}

export function Testimonials() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pivots = useRef<(HTMLDivElement | null)[]>([]);
  const swings = useRef<Swing[]>([]);
  const [wire, setWire] = useState<Wire | null>(null);
  const [entered, setEntered] = useState(false);

  // Measure where each badge sits and run the wire through those points.
  useIsoLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const width = el.scrollWidth;
      const y0 = 22;
      const sag = Math.min(64, Math.max(22, width * 0.04));
      const yAt = (x: number) => y0 + sag * (1 - (2 * x / width - 1) ** 2);
      const pins = pivots.current.map(p => {
        const hanger = p?.parentElement;
        const x = hanger ? hanger.offsetLeft + hanger.offsetWidth / 2 : 0;
        return { x, y: yAt(x) };
      });
      setWire({ width, height: y0 + sag + 12, path: `M0 ${y0} Q${width / 2} ${y0 + 2 * sag} ${width} ${y0}`, pins });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reveal once, and only animate while the section is on screen.
  const visible = useRef(false);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (entry.isIntersecting) setEntered(true);
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One animation loop for every badge: idle sway plus a damped spring for nudges.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    swings.current = pivots.current.map((el, i) => ({
      el: el!, rest: REST[i % REST.length], amp: reduce ? 0 : 0.9 + ((i * 37) % 10) / 14, freq: 0.85 + ((i * 53) % 10) / 22, phase: i * 1.9, s: 0, v: 0,
    }));
    for (const sw of swings.current) sw.el.style.transform = `rotate(${sw.rest}deg)`;
    if (reduce) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible.current) return;
      const t = now / 1000;
      for (const sw of swings.current) {
        sw.v += (-34 * sw.s - 2.6 * sw.v) * dt;
        sw.s += sw.v * dt;
        sw.el.style.transform = `rotate(${(sw.rest + sw.amp * Math.sin(t * sw.freq + sw.phase) + sw.s).toFixed(3)}deg)`;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // A small swing as each badge lands after the entrance drop.
  useEffect(() => {
    if (!entered) return;
    const ids = swings.current.map((sw, i) => window.setTimeout(() => { sw.v += i % 2 ? -38 : 38; }, 1250 + i * 130));
    return () => ids.forEach(window.clearTimeout);
  }, [entered]);

  const kick = (i: number, amount: number) => { const sw = swings.current[i]; if (sw) sw.v += amount; };

  return (
    <section ref={section} id="testimonials" className={`section tm-section${entered ? " in" : ""}`} aria-labelledby="tm-title">
      <header className="tm-head">
        <div>
          <p className="tm-eyebrow"><i aria-hidden="true" /> Testimonials / People</p>
          <h2 id="tm-title">Good work.<br /><span>Great people.</span></h2>
        </div>
        <p className="tm-sub">A few words from the people I’ve had the pleasure of working with.</p>
      </header>

      <div className="tm-scroller">
        <div ref={track} className="tm-track">
          {wire && (
            <svg className="tm-wire" width={wire.width} height={wire.height} viewBox={`0 0 ${wire.width} ${wire.height}`} aria-hidden="true">
              <path d={wire.path} pathLength={1} />
              {wire.pins.map((p, i) => <g key={i} className="tm-pin" transform={`translate(${p.x} ${p.y})`}><circle r="5.5" /><circle r="2" /></g>)}
            </svg>
          )}
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className="tm-hanger"
              style={{ "--l": STRING[i % STRING.length], "--wy": `${wire?.pins[i]?.y ?? 40}px`, "--i": i } as React.CSSProperties}
            >
              <div className="tm-pivot" ref={el => { pivots.current[i] = el; }}>
                <span className="tm-string" aria-hidden="true" />
                <div className="tm-body">
                  <span className="tm-clip" aria-hidden="true" />
                  <Badge t={t} index={i} onFlip={f => kick(i, f ? 48 : -48)} onHover={dir => kick(i, dir * 26)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="tm-hint" aria-hidden="true">Hover to shimmer · Click / tap to flip</p>
    </section>
  );
}
