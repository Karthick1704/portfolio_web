"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

// 5×7 pixel glyphs. Seven rows, like the seven days of a contribution graph.
const FONT: Record<string, string[]> = {
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
};
const ROWS = 7;
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LOG = ["Enumerating objects", "Compressing commits", "Writing name to graph"];

const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Columns of intensity levels: 0 empty, 1 faint background activity, 3–4 the name. */
function build(text: string) {
  const cols: number[][] = [Array(ROWS).fill(0)];
  for (const ch of text) {
    if (ch === " ") { cols.push(Array(ROWS).fill(0), Array(ROWS).fill(0)); continue; }
    const glyph = FONT[ch];
    for (let c = 0; c < 5; c++) cols.push(glyph.map(row => (row[c] === "1" ? 1 : 0)));
    cols.push(Array(ROWS).fill(0));
  }
  return cols.map((col, c) => col.map((on, r) => (on ? (hash(c, r) > 0.45 ? 4 : 3) : hash(c + 9, r + 3) > 0.9 ? 1 : 0)));
}

export function NameGraph({ text = "KARTHICK S" }: { text?: string }) {
  const cols = useMemo(() => build(text), [text]);
  const commits = useMemo(() => cols.flat().filter(level => level >= 3).length, [cols]);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(0);
  const duration = cols.length * 34 + 700;
  const playing = inView && !reduce;

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round(commits * p));
      setStep(p >= 1 ? LOG.length : Math.min(LOG.length - 1, Math.floor(p * LOG.length)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, run, commits, duration]);

  const done = reduce || step >= LOG.length;
  return (
    <div ref={ref} className={`name-graph${playing ? " play" : ""}${reduce ? " still" : ""}`}>
      <div className="ng-bar">
        <span className="ng-dots" aria-hidden="true"><i /><i /><i /></span>
        <code><b>$</b> git push origin <em>karthick</em></code>
        <button type="button" onClick={() => { setCount(0); setStep(0); setRun(n => n + 1); }} aria-label="Replay the push animation"><RotateCcw aria-hidden="true" /> Replay</button>
      </div>
      <div className="ng-body">
        <div className="ng-days" aria-hidden="true">{DAYS.map((day, i) => <span key={i}>{day}</span>)}</div>
        <div key={run} className="ng-grid" role="img" aria-label={`A contribution graph whose squares spell ${text}`} style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
          {cols.map((col, c) => col.map((level, r) => (
            <i key={`${c}-${r}`} data-l={level} style={{ gridColumn: c + 1, gridRow: r + 1, animationDelay: `${c * 34 + r * 22}ms` }} />
          )))}
        </div>
      </div>
      <div className="ng-foot">
        <p aria-live="polite">
          {done
            ? <><b>{commits}</b> commits pushed. Every square placed by hand, like the rest of this site.</>
            : <>{LOG[step]}… <b>{count}</b>/{commits}</>}
        </p>
        <span className="ng-legend" aria-hidden="true">Less <i data-l="0" /><i data-l="1" /><i data-l="2" /><i data-l="3" /><i data-l="4" /> More</span>
      </div>
    </div>
  );
}
