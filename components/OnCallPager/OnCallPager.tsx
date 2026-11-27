"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Screen = { id: string; header: string; title: string; lines: string[] };
type AlertStep = Omit<Screen, "id"> & { led: "red" | "amber" | "green"; hold: number };

const SCREENS: Screen[] = [
  { id: "status", header: "SYS: PROD-API-01", title: "STATUS: NOMINAL", lines: ["ACTIVE ALERTS: 0", "REGIONS: 4/4 HEALTHY", "PRESS ↵ FOR 2AM TEST"] },
  { id: "profile", header: "ID: KARTHICK S", title: "APP SUPPORT & SRE", lines: ["EXP: 4+ YEARS", "PAGES CLEARED: 900+", "ON-CALL: 4 AWS REGIONS"] },
  { id: "stack", header: "ENV: CORE STACK", title: "LINUX & AUTOMATION", lines: ["BASH / PYTHON / JAVA / SQL", "CLOUDWATCH / SPLUNK", "AWS / AZURE / DOCKER"] },
  { id: "contact", header: "PING: DIRECT LINE", title: "AVAILABLE FOR ROLES", lines: ["FIRST ALARM TO", "ROOT CAUSE.", "SCROLL TO CONNECT ↓"] },
];

// A simulated incident, clearly labelled SIM on the screen.
const ALERT: AlertStep[] = [
  { header: "!! 02:14 AM PAGE !!", title: "PAGE: API FAIL [503]", lines: ["NODE: prod-api-03", "ERR: HIGH MEM (94%)", "ACK'D. TRIAGING..."], led: "red", hold: 1900 },
  { header: "DIAGNOSTIC RUNNING", title: "[INVESTIGATING...]", lines: ["$ journalctl -u worker", "FOUND: STALE LOCK", "ISOLATING PID 4821..."], led: "amber", hold: 1700 },
  { header: "REMEDIATION", title: "[RESOLVING...]", lines: ["CLEARING CACHE LOCK", "GRACEFUL RELOAD: OK", "VERIFYING HEALTH..."], led: "amber", hold: 1700 },
  { header: "INCIDENT CLOSED", title: "OK: SYSTEM HEALTHY", lines: ["HTTP 200 | P95: 41ms", "MTTR: 38 SECONDS", "BACK TO SLEEP. zzz"], led: "green", hold: 2600 },
];

const REST = { x: -6, y: 12 };
const AUTO_CYCLE_MS = 5200;
const SOUND_KEY = "pager-sound";

// Sound preference, persisted per browser; shared with React via an external store.
const soundListeners = new Set<() => void>();
const readSound = () => { try { return window.localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } };
const writeSound = (on: boolean) => {
  try { window.localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* storage blocked */ }
  soundListeners.forEach(fn => fn());
};
const subscribeSound = (fn: () => void) => { soundListeners.add(fn); return () => { soundListeners.delete(fn); }; };

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (fn: () => void) => { const m = window.matchMedia(REDUCE_QUERY); m.addEventListener("change", fn); return () => m.removeEventListener("change", fn); };
const readReduce = () => window.matchMedia(REDUCE_QUERY).matches;

/** Short square-wave beeps, like a real pager. Created lazily on the first user click. */
function usePagerSound() {
  const ctx = useRef<AudioContext | null>(null);
  return useCallback((pattern: number[], freq: number) => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx.current ??= new AC();
      const ac = ctx.current;
      let t = ac.currentTime + 0.02;
      pattern.forEach((dur, i) => {
        if (i % 2 === 0) {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = "square";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur / 1000);
          osc.connect(gain).connect(ac.destination);
          osc.start(t);
          osc.stop(t + dur / 1000 + 0.02);
        }
        t += dur / 1000;
      });
    } catch { /* audio unavailable: stay silent */ }
  }, []);
}

export function OnCallPager() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [alertStep, setAlertStep] = useState(-1);
  const [pressed, setPressed] = useState<string | null>(null);
  const [typedState, setTyped] = useState({ key: "", n: Infinity });
  const [clock, setClock] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  const sound = useSyncExternalStore(subscribeSound, readSound, () => true);
  const reduce = useSyncExternalStore(subscribeReduce, readReduce, () => false);
  const timers = useRef<number[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const engaged = useRef(false); // hovered or focused: pause auto-cycle
  const beep = usePagerSound();

  const alerting = alertStep >= 0;
  const active = alerting ? ALERT[alertStep] : SCREENS[screenIndex];
  const led = alerting ? ALERT[alertStep].led : "green";
  const lines = !alerting && screenIndex === 0 && pages > 0
    ? ["ACTIVE ALERTS: 0", `PAGES TONIGHT: ${pages} · CLOSED`, active.lines[2]]
    : active.lines;
  const content = [active.title, ...lines];
  const total = content.reduce((n, s) => n + s.length, 0);

  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15000);
    timers.current.push(first);
    const pending = timers.current;
    return () => { window.clearInterval(id); pending.forEach(window.clearTimeout); };
  }, []);

  // Typewriter: re-type the screen whenever its content changes.
  const contentKey = content.join("|");
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let start = 0;
    const run = (now: number) => {
      start ||= now;
      const n = Math.floor((now - start) / 11);
      setTyped({ key: contentKey, n });
      if (n < total) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [contentKey, total, reduce]);

  // Idle auto-cycle through the info screens.
  useEffect(() => {
    if (alerting) return;
    const id = window.setInterval(() => {
      if (engaged.current || document.hidden) return;
      setScreenIndex(i => (i + 1) % SCREENS.length);
    }, AUTO_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [alerting, screenIndex]);

  // Spring-driven 3D tilt: pointer sets a target, one rAF loop eases toward it.
  const target = useRef({ ...REST, s: 1 });
  const current = useRef({ ...REST, s: 1 });
  const kickRef = useRef<() => void>(() => {});
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const el = body.current;
      if (!el) { raf = 0; return; }
      const c = current.current, t = target.current;
      c.x += (t.x - c.x) * 0.14;
      c.y += (t.y - c.y) * 0.14;
      c.s += (t.s - c.s) * 0.14;
      el.style.transform = `rotateX(${c.x.toFixed(2)}deg) rotateY(${c.y.toFixed(2)}deg) scale(${c.s.toFixed(4)})`;
      el.style.setProperty("--gx", `${50 + c.y * 2.2}%`);
      el.style.setProperty("--gy", `${50 - c.x * 2.2}%`);
      const settled = Math.abs(t.x - c.x) < 0.02 && Math.abs(t.y - c.y) < 0.02 && Math.abs(t.s - c.s) < 0.0005;
      raf = settled ? 0 : requestAnimationFrame(step);
    };
    kickRef.current = () => { if (!raf) raf = requestAnimationFrame(step); };
    kickRef.current();
    return () => cancelAnimationFrame(raf);
  }, []);
  const kick = () => kickRef.current();

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    target.current = { x: -y * 20, y: x * 22, s: 1.02 };
    kick();
  };
  const onLeave = () => { engaged.current = false; target.current = { ...REST, s: 1 }; kick(); };

  const flash = (name: string) => { setPressed(name); window.setTimeout(() => setPressed(p => (p === name ? null : p)), 140); };

  const cycle = (dir: number) => {
    flash(dir < 0 ? "prev" : "next");
    if (!alerting) setScreenIndex(i => (i + dir + SCREENS.length) % SCREENS.length);
  };

  const triggerAlert = () => {
    flash("enter");
    if (alerting) return;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setAlertStep(0);
    if (sound) beep([140, 90, 140, 90, 140, 260, 140, 90, 140, 90, 140], 2650);
    try { navigator.vibrate?.([220, 90, 220, 90, 420]); } catch { /* unsupported */ }
    let at = 0;
    ALERT.forEach((step, i) => {
      at += step.hold;
      timers.current.push(window.setTimeout(() => {
        if (i < ALERT.length - 1) {
          setAlertStep(i + 1);
          if (i + 1 === ALERT.length - 1 && sound) beep([90, 60, 160], 1760);
        } else {
          setAlertStep(-1);
          setScreenIndex(0);
          setPages(n => n + 1);
        }
      }, at));
    });
  };

  const toggleSound = () => writeSound(!sound);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); cycle(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); cycle(1); }
  };

  // Slice the typed characters across title and lines.
  const typed = typedState.key === contentKey ? typedState.n : 0;
  let left = reduce ? Infinity : typed;
  const shown = content.map(s => { const part = s.slice(0, Math.max(0, left)); left -= s.length; return part; });
  const typing = !reduce && typed < total;
  const buzzing = alertStep === 0;
  const progress = alerting ? ((alertStep + 1) / ALERT.length) * 100 : 0;

  return (
    <div className="pager-stage">
      <div className={`pager-float${buzzing ? " buzzing" : ""}`}>
        <div
          ref={body}
          className={`pager-body${buzzing ? " alert-glow" : ""}`}
          role="group"
          aria-label="Interactive on-call pager. Use the arrow buttons to browse, or the test button for a simulated 2 AM page."
          onPointerEnter={() => { engaged.current = true; }}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onFocus={() => { engaged.current = true; }}
          onBlur={() => { engaged.current = false; }}
          onKeyDown={onKeyDown}
        >
          <span className="pager-glare" aria-hidden="true" />
          <button type="button" className={`pager-top-trigger${pressed === "enter" ? " pressed" : ""}`} onClick={triggerAlert} disabled={alerting} title="Simulate a 2 AM production page">
            2AM PAGE
          </button>

          <div className="pager-led-row">
            <span className="pager-model">KS-99 // {clock ?? "--:--"}</span>
            <div className="pager-leds" aria-hidden="true">
              <button type="button" className={`pager-sound${sound ? "" : " off"}`} onClick={toggleSound} aria-label={sound ? "Mute pager beep" : "Unmute pager beep"} aria-pressed={!sound}>{sound ? "SND" : "MUTE"}</button>
              <span className={`led${led === "red" ? " red-on" : ""}`} />
              <span className={`led${led === "amber" ? " amber-on" : ""}`} />
              <span className={`led${led === "green" ? " green-on" : ""}`} />
            </div>
          </div>

          <div className="pager-bezel">
            <div className={`pager-screen${buzzing ? " alert-mode" : ""}`}>
              <div className="screen-meta">
                <span>{active.header}</span>
                <span>{alerting ? "SIM" : `${screenIndex + 1}/${SCREENS.length}`}</span>
              </div>
              <div className="screen-title">{shown[0]}{typing && shown[0].length < content[0].length && <i className="pager-caret" />}</div>
              <div className="screen-lines">
                {lines.map((line, i) => (
                  <div key={i}>{shown[i + 1]}{typing && shown[i + 1].length > 0 && shown[i + 1].length < line.length && <i className="pager-caret" />}&nbsp;</div>
                ))}
              </div>
              {alerting && <div className="screen-progress" aria-hidden="true"><b style={{ width: `${progress}%` }} /></div>}
              <p className="sr-only" aria-live="polite">{active.title}. {lines.join(". ")}</p>
            </div>
          </div>

          <div className="pager-controls">
            <button type="button" className={`pager-btn${pressed === "prev" ? " pressed" : ""}`} onClick={() => cycle(-1)} aria-label="Previous screen" disabled={alerting}>◀</button>
            <button type="button" className={`pager-btn${pressed === "next" ? " pressed" : ""}`} onClick={() => cycle(1)} aria-label="Next screen" disabled={alerting}>▶</button>
            <button type="button" className={`pager-btn enter${pressed === "enter" ? " pressed" : ""}`} onClick={triggerAlert} aria-label="Simulate a 2 AM alert" disabled={alerting}>↵ TEST</button>
          </div>

          <div className="pager-footer">
            <span className="pager-brand">SRE ON-CALL</span>
            <div className="pager-dots" aria-hidden="true">
              {SCREENS.map((s, i) => <span key={s.id} className={`pager-dot${!alerting && i === screenIndex ? " active" : ""}`} />)}
            </div>
          </div>
        </div>
      </div>

      <p className="pager-hint">Click <span>◀ ▶</span> to browse or <span>↵ TEST</span> for a simulated 2 AM page</p>
    </div>
  );
}
