export type Cell = [row: number, col: number];

export interface PieceDef {
  id: "A" | "B" | "C" | "D" | "E";
  color: string;
  anchor: { row: number; col: number };
  offsets: Cell[];
}

export const CELL = 44;
export const GRID = 5;

export const PIECE_DEFS: PieceDef[] = [
  { id: "A", color: "var(--lock-cyan)", anchor: { row: 0, col: 0 }, offsets: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: "B", color: "var(--lock-amber)", anchor: { row: 0, col: 2 }, offsets: [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]] },
  { id: "C", color: "var(--lock-teal)", anchor: { row: 1, col: 2 }, offsets: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { id: "D", color: "var(--lock-gold)", anchor: { row: 2, col: 0 }, offsets: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0]] },
  { id: "E", color: "var(--lock-copper)", anchor: { row: 3, col: 1 }, offsets: [[0, 3], [1, 0], [1, 1], [1, 2], [1, 3]] },
];

export const pieceBounds = (piece: PieceDef) => ({
  rows: Math.max(...piece.offsets.map(([row]) => row)) + 1,
  cols: Math.max(...piece.offsets.map(([, col]) => col)) + 1,
});
