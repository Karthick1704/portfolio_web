"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { Lightbulb, Lock, Play, RotateCcw, Unlock } from "lucide-react";
import { flushSync } from "react-dom";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GRID, PIECE_DEFS, type PieceDef } from "./puzzleData";
import { PieceShape } from "./PieceShape";

interface PortfolioLockProps { onUnlock: () => void; }
interface DragState { id: PieceDef["id"]; x: number; y: number; offsetX: number; offsetY: number; cell: number; }
interface AutoGhost { id: PieceDef["id"]; x: number; y: number; cell: number; }

export function PortfolioLock({ onUnlock }: PortfolioLockProps) {
  const board = useRef<HTMLDivElement>(null);
  const trayRefs = useRef<Partial<Record<PieceDef["id"], HTMLButtonElement | null>>>({});
  const unlockStarted = useRef(false);
  const unlockRun = useRef(0);
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  const [cell, setCell] = useState(44);
  const [placed, setPlaced] = useState<PieceDef["id"][]>([]);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [rejected, setRejected] = useState<PieceDef["id"] | null>(null);
  const [hint, setHint] = useState<PieceDef["id"] | null>(null);
  const [solving, setSolving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [autoGhost, setAutoGhost] = useState<AutoGhost | null>(null);
  const solved = placed.length === PIECE_DEFS.length;

  useEffect(() => {
    const target = board.current;
    if (!target) return;
    const resize = new ResizeObserver(() => setCell(target.getBoundingClientRect().width / GRID));
    resize.observe(target);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => setDragging(current => current ? { ...current, x: event.clientX - current.offsetX, y: event.clientY - current.offsetY } : null);
    const release = (event: PointerEvent) => {
      const active = dragging;
      const rect = board.current?.getBoundingClientRect();
      const piece = PIECE_DEFS.find(item => item.id === active.id);
      if (!rect || !piece) { setDragging(null); return; }
      const anchorX = event.clientX - active.offsetX;
      const anchorY = event.clientY - active.offsetY;
      const col = Math.round((anchorX - rect.left) / cell);
      const row = Math.round((anchorY - rect.top) / cell);
      if (row === piece.anchor.row && col === piece.anchor.col) setPlaced(current => [...current, piece.id]);
      else setRejected(piece.id);
      setDragging(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", release); };
  }, [cell, dragging]);

  useEffect(() => {
    if (!solved || unlockStarted.current) return;
    unlockStarted.current = true;
    const run = ++unlockRun.current;
    const reveal = async () => {
      // Smooth cinematic fade out into pure black screen
      await animate(".lock-main", { opacity: 0, scale: 0.94 }, { duration: reduce ? 0.2 : 0.65, ease: "easeInOut" });
      if (run === unlockRun.current) {
        onUnlock();
      }
    };
    void reveal();
  }, [animate, onUnlock, reduce, solved]);

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, piece: PieceDef) => {
    if (solving || solved) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setRejected(null);
    setDragging({ id: piece.id, x: rect.left, y: rect.top, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, cell });
  };

  const autoSolve = async () => {
    if (solving || solved) return;
    setSolving(true); setHint(null);
    for (const piece of PIECE_DEFS.filter(item => !placed.includes(item.id))) {
      const start = trayRefs.current[piece.id]?.getBoundingClientRect();
      const target = board.current?.getBoundingClientRect();
      if (!start || !target) continue;
      flushSync(() => setAutoGhost({ id: piece.id, x: start.left, y: start.top, cell }));
      await animate(`[data-auto-ghost="${piece.id}"]`, { left: target.left + piece.anchor.col * cell, top: target.top + piece.anchor.row * cell, scale: [1, 1.06, 1] }, { duration: .6, ease: [.4, 0, .2, 1] });
      flushSync(() => { setPlaced(current => [...current, piece.id]); setAutoGhost(null); });
      await animate(scope.current, { opacity: 1 }, { duration: .17 });
    }
    setSolving(false);
  };

  const showHint = async () => {
    const next = PIECE_DEFS.find(piece => !placed.includes(piece.id));
    if (!next || solving || solved) return;
    flushSync(() => setHint(next.id));
    await animate(`[data-hint="${next.id}"]`, { opacity: [.35, 1, .35, 1, .35] }, { duration: 1.8, ease: "easeInOut" });
    setHint(null);
  };

  const reset = () => { unlockRun.current += 1; unlockStarted.current = false; setPlaced([]); setDragging(null); setRejected(null); setHint(null); setSolving(false); setRevealed(false); setAutoGhost(null); void animate(".lock-main", { opacity: 1, scale: 1 }, { duration: .2 }); };

  return (
    <section ref={scope} className="portfolio-lock">
      <motion.div className="lock-main">
        <div className={`lock-badge ${solved ? "granted" : ""}`}>
          {solved ? <Unlock /> : <Lock />} {solved ? "ACCESS GRANTED" : "SYSTEM LOCKED"}
        </div>
        <h1>Assemble the Modules</h1>
        <p>Drag all five pieces into place to unlock the portfolio.</p>
        <div className="lock-progress">
          <span>{placed.length}/5 MODULES DOCKED</span>
          <i><b style={{ width: `${placed.length / 5 * 100}%` }} /></i>
        </div>
        <div ref={board} className="lock-board" aria-label="Five by five module board">
          {Array.from({ length: 25 }).map((_, index) => <i className="lock-grid-cell" key={index} />)}
          {PIECE_DEFS.filter(piece => placed.includes(piece.id)).map(piece => (
            <motion.div className="lock-docked" key={piece.id} initial={{ scale: .7 }} animate={{ scale: [1.08, 1] }} style={{ left: piece.anchor.col * cell, top: piece.anchor.row * cell }}>
              <PieceShape piece={piece} cell={cell} />
            </motion.div>
          ))}
          {hint && PIECE_DEFS.find(piece => piece.id === hint)?.offsets.map(([row, col]) => {
            const piece = PIECE_DEFS.find(item => item.id === hint)!;
            return <motion.i data-hint={hint} className="lock-hint" key={`${row}-${col}`} style={{ left: (piece.anchor.col + col) * cell, top: (piece.anchor.row + row) * cell, width: cell - 3, height: cell - 3 }} />;
          })}
        </div>
        <div className="lock-tray" aria-label="Undocked modules">
          {PIECE_DEFS.filter(piece => !placed.includes(piece.id)).map(piece => (
            <motion.button ref={node => { trayRefs.current[piece.id] = node; }} className="lock-tray-piece" key={piece.id} onPointerDown={event => beginDrag(event, piece)} animate={rejected === piece.id ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: .4 }} onAnimationComplete={() => setRejected(null)} aria-label={`Drag module ${piece.id}`}>
              <PieceShape piece={piece} cell={34} />
            </motion.button>
          ))}
        </div>
        <div className="lock-controls">
          <button disabled={solving || solved} onClick={() => void autoSolve()}><Play /> Auto-Solve</button>
          <button disabled={solving || solved} onClick={() => void showHint()}><Lightbulb /> Hint</button>
          <button onClick={reset}><RotateCcw /> Reset</button>
        </div>
      </motion.div>
      {dragging && (() => {
        const piece = PIECE_DEFS.find(item => item.id === dragging.id)!;
        return <div className="lock-drag-ghost" style={{ left: dragging.x, top: dragging.y }}><PieceShape piece={piece} cell={dragging.cell} /></div>;
      })()}
      {autoGhost && (() => {
        const piece = PIECE_DEFS.find(item => item.id === autoGhost.id)!;
        return <div data-auto-ghost={autoGhost.id} className="lock-drag-ghost" style={{ left: autoGhost.x, top: autoGhost.y }}><PieceShape piece={piece} cell={autoGhost.cell} /></div>;
      })()}
    </section>
  );
}
