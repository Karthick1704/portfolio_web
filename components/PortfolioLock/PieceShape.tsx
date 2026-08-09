import type { CSSProperties } from "react";
import { pieceBounds, type PieceDef } from "./puzzleData";

interface PieceShapeProps {
  piece: PieceDef;
  cell: number;
  className?: string;
}

export function PieceShape({ piece, cell, className = "" }: PieceShapeProps) {
  const bounds = pieceBounds(piece);
  return <div className={`lock-piece ${className}`} style={{ width: bounds.cols * cell, height: bounds.rows * cell, "--piece-color": piece.color, "--piece-cell": `${cell}px` } as CSSProperties}>{piece.offsets.map(([row, col]) => <i key={`${row}-${col}`} style={{ left: col * cell, top: row * cell }} />)}</div>;
}
