"use client";

import { useEffect, useRef } from "react";

/*
 * Animated Japanese landscape in the style of a woodblock print (ukiyo-e):
 * flat colour shapes, dark ink keylines, graded "bokashi" washes and paper grain.
 * Drawn on a 1000x1000 board. Static parts are painted once into cached layers;
 * only mist, cranes, water, foliage and petals redraw each frame.
 */

const S = 1000;
const PAD = 40; // spare board around the view so parallax never exposes an edge
const HORIZON = 620;
const SHORE = 720;
const INK = "#1f2a44";
const BARK = "#4a3328";
const PINKS = ["#f4b6c2", "#fbdde0", "#e98aa5", "#fff8f2"];
const GREENS = ["#8fae5a", "#a9c46c", "#6b8f4e"];
const DEPTH = { sky: 4, cranes: 7, fuji: 10, mid: 18, fg: 34 }; // parallax, in board units

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];
type Blob = { x: number; y: number; rx: number; ry: number; c: string; line?: boolean; dot?: boolean };
type Group = { blobs: Blob[]; phase: number; amp: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const wrap = (n: number, size: number) => ((n % size) + size) % size;
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const FALLS = [
  { x: 735, w: 40, y0: 346, speed: 150 },
  { x: 880, w: 22, y0: 166, speed: 190 },
];
const PINES: Pt[] = [[60, 292], [172, 432], [862, 252]];
const BANK_TREES: Pt[] = [[640, 716], [830, 718], [952, 716]];
const BRANCHES: [string, number][] = [
  ["M40 1040C90 930 110 860 170 780", 30],
  ["M170 780C220 730 270 720 330 735", 14],
  ["M170 780C150 700 110 660 70 610", 14],
  ["M120 880C60 850 20 800-20 790", 12],
  ["M1040 930C960 900 900 880 840 895", 14],
  ["M930 895C920 850 900 820 870 800", 10],
];

function wash(c: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([at, colour]) => g.addColorStop(at, colour));
  return g;
}
function shape(c: Ctx, pts: Pt[], fill: string | CanvasGradient | null, stroke: string | null = INK, width = 2.2) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (fill) {
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
// A stroke with an ink keyline around it (branches, trunks, bridge).
function inked(c: Ctx, path: string, colour: string, width: number) {
  const p = new Path2D(path);
  c.lineCap = "round";
  c.strokeStyle = INK;
  c.lineWidth = width + 4;
  c.stroke(p);
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.stroke(p);
}
// Pagoda roof with upturned eaves.
function roof(c: Ctx, cx: number, y: number, half: number, h: number) {
  c.beginPath();
  c.moveTo(cx - half, y);
  c.quadraticCurveTo(cx - half * 0.55, y - h * 0.35, cx - half * 0.3, y - h);
  c.lineTo(cx + half * 0.3, y - h);
  c.quadraticCurveTo(cx + half * 0.55, y - h * 0.35, cx + half, y);
  c.quadraticCurveTo(cx, y - h * 0.18, cx - half, y);
  c.fillStyle = "#2b3350";
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2.2;
  c.stroke();
}

function paintSky(c: Ctx) {
  c.fillStyle = wash(c, -PAD, HORIZON, [[0, "#24426f"], [0.2, "#8fa9bf"], [0.42, "#f3e2c4"], [0.75, "#f4b99a"], [1, "#e5674c"]]);
  c.fillRect(-PAD, -PAD, S + PAD * 2, S + PAD * 2);
  c.fillStyle = "#d9482b";
  c.beginPath();
  c.arc(770, 190, 64, 0, 7);
  c.fill();
}

function paintFuji(c: Ctx) {
  c.beginPath();
  c.moveTo(140, HORIZON);
  c.quadraticCurveTo(390, 570, 466, 338);
  c.lineTo(486, 330);
  c.lineTo(508, 337);
  c.lineTo(530, 331);
  c.quadraticCurveTo(620, 570, 880, HORIZON);
  c.closePath();
  c.fillStyle = wash(c, 330, HORIZON, [[0, "#274a7d"], [0.6, "#5d86b0"], [1, "#c8d6d6"]]);
  c.fill();
  c.save();
  c.clip();
  shape(c, [[380, 300], [620, 300], [630, 420], [600, 385], [578, 432], [556, 396], [535, 446], [512, 402], [490, 452], [468, 404], [447, 442], [428, 398], [405, 430], [385, 400]], "#fbf6ec", null);
  ([[448, 440, 430, 500], [490, 450, 486, 520], [535, 445, 548, 510], [575, 430, 600, 490]] as number[][]).forEach(([x0, y0, x1, y1]) =>
    shape(c, [[x0, y0], [x1, y1]], null, "rgba(251,246,236,.7)", 2),
  );
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 2.4;
  c.stroke();

  // Far lake, Fuji's pale reflection, and distant hills.
  c.fillStyle = wash(c, HORIZON, SHORE + 30, [[0, "#f3e6cc"], [1, "#a9c9d6"]]);
  c.fillRect(-PAD, HORIZON, S + PAD * 2, SHORE + 30 - HORIZON);
  shape(c, [[430, 625], [570, 625], [500, 700]], "rgba(251,246,236,.55)", null);
  [640, 660, 685, 705].forEach((y, r) => {
    for (let n = 0; n < 9; n++) {
      const x = -PAD + hash(r, n) * (S + PAD);
      shape(c, [[x, y], [x + 30 + hash(n, r) * 50, y]], null, "rgba(31,42,68,.22)", 1.4);
    }
  });
  const hill = (d: string) => {
    const p = new Path2D(d);
    c.fillStyle = "#4f7198";
    c.fill(p);
    c.strokeStyle = INK;
    c.lineWidth = 2.2;
    c.stroke(p);
  };
  hill(`M-40 ${HORIZON}Q60 560 170 600Q230 575 300 ${HORIZON}Z`);
  hill(`M700 ${HORIZON}Q780 580 860 605Q950 560 1040 600L1040 ${HORIZON}Z`);
}

function paintMid(c: Ctx) {
  const rock = wash(c, 100, 740, [[0, "#c9c5b4"], [1, "#6f7578"]]);
  shape(c, [[-40, 300], [40, 290], [90, 340], [120, 330], [150, 420], [190, 430], [215, 540], [250, 560], [270, 740], [-40, 740]], rock);
  shape(c, [[1040, 120], [960, 110], [930, 170], [880, 165], [850, 250], [800, 255], [770, 340], [720, 350], [690, 450], [640, 470], [615, 600], [590, 740], [1040, 740]], rock);
  const cracks: Pt[][] = [
    [[90, 340], [100, 460], [80, 600]],
    [[190, 430], [200, 560], [180, 700]],
    [[930, 170], [915, 330], [940, 520]],
    [[850, 250], [835, 420], [860, 640]],
    [[690, 450], [700, 580], [680, 700]],
    [[800, 255], [790, 300]],
  ];
  cracks.forEach((line) => shape(c, line, null, "rgba(31,42,68,.5)", 1.6));

  // Bank the tea house stands on.
  const bank = new Path2D("M225 722Q300 700 400 708Q520 700 585 722Q520 748 400 746Q290 750 225 722Z");
  c.fillStyle = "#cdb57c";
  c.fill(bank);
  c.strokeStyle = INK;
  c.lineWidth = 2.2;
  c.stroke(bank);

  // Tea house: stone base, two storeys with vermilion posts, two roofs, gold finial.
  shape(c, [[345, 695], [455, 695], [455, 715], [345, 715]], "#d8d2c0");
  shape(c, [[360, 640], [440, 640], [440, 695], [360, 695]], "#efe2c6");
  [362, 386, 414, 438].forEach((x) => shape(c, [[x, 642], [x, 694]], null, "#c8432c", 4));
  shape(c, [[388, 662], [412, 662], [412, 695], [388, 695]], "#2b3350");
  roof(c, 400, 645, 85, 30);
  shape(c, [[375, 600], [425, 600], [425, 616], [375, 616]], "#efe2c6");
  [377, 400, 423].forEach((x) => shape(c, [[x, 601], [x, 615]], null, "#c8432c", 3.5));
  roof(c, 400, 602, 60, 26);
  shape(c, [[400, 576], [400, 562]], null, "#d9a436", 3);

  // Arched vermilion bridge with a railing.
  inked(c, "M470 714Q545 655 620 714", "#d9482b", 8);
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    const x = 470 + 150 * k;
    const y = 714 - 59 * 2 * k * (1 - k);
    shape(c, [[x, y], [x, y - 16]], null, "#d9482b", 3);
  }
  c.strokeStyle = "#d9482b";
  c.lineWidth = 3;
  c.stroke(new Path2D("M470 698Q545 639 620 698"));

  // Trunks; their foliage is drawn live so it can sway.
  PINES.forEach(([x, y]) => inked(c, `M${x} ${y}Q${x + 8} ${y - 40} ${x - 6} ${y - 80}`, BARK, 7));
  BANK_TREES.forEach(([x, y]) => inked(c, `M${x} ${y}Q${x + 6} ${y - 22} ${x - 2} ${y - 44}`, BARK, 5));
}

function buildFoliage() {
  const mid: Group[] = [];
  const fg: Group[] = [];
  // Pines: flat layered pads, the classic print shorthand.
  PINES.forEach(([x, y], n) => {
    const pads = [[-6, -85, 46, 13], [22, -58, 34, 10], [-28, -52, 30, 9]];
    mid.push({
      phase: n * 1.7,
      amp: 4,
      blobs: pads.flatMap(([dx, dy, rx, ry]) => [
        { x: x + dx, y: y + dy, rx, ry, c: "#2f5d50", line: true },
        { x: x + dx, y: y + dy - ry * 0.35, rx: rx * 0.78, ry: ry * 0.45, c: "#4f8068" },
      ]),
    });
  });
  // Shrubs on the right cliff's ledges.
  ([[905, 165], [825, 250], [745, 345], [665, 460], [985, 112], [628, 600], [960, 420]] as Pt[]).forEach(([x, y], n) => {
    mid.push({
      phase: n * 0.9,
      amp: 3,
      blobs: [0, 1, 2, 3, 4].map((i) => ({
        x: x + (hash(n, i) - 0.5) * 44,
        y: y - 8 - hash(i, n) * 20,
        rx: 14 + hash(n + 3, i) * 5,
        ry: 13 + hash(n + 3, i) * 5,
        c: GREENS[i % 3],
        line: true,
      })),
    });
  });
  const blossom = (out: Group[], x: number, y: number, count: number, spread: number, size: number, seed: number, amp: number) => {
    out.push({
      phase: seed * 1.3,
      amp,
      blobs: Array.from({ length: count }, (_, i) => {
        const angle = hash(seed, i) * 6.283;
        const dist = Math.sqrt(hash(i, seed)) * spread;
        const r = size * (0.75 + hash(seed + 5, i) * 0.5);
        return { x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist * 0.8, rx: r, ry: r, c: PINKS[Math.floor(hash(i, seed + 9) * PINKS.length)], dot: true };
      }),
    });
  };
  BANK_TREES.forEach(([x, y], n) => blossom(mid, x - 2, y - 52, 11, 26, 9, n + 20, 3));
  const anchors: Pt[] = [[330, 735], [270, 722], [215, 745], [70, 610], [110, 665], [150, 720], [170, 780], [-10, 790], [50, 830], [120, 880], [840, 895], [900, 880], [870, 800], [915, 845], [980, 905]];
  anchors.forEach(([x, y], n) => blossom(fg, x, y, 10, 44, 11, n, 6));
  return { mid, fg };
}

function drawCrane(c: Ctx, flap: number) {
  // flap runs -1 (wings down) to 1 (wings up).
  const wing = (lift: number, colour: string) => {
    const tip: Pt = [-12, -3 - lift * 42];
    c.beginPath();
    c.moveTo(-10, -3);
    c.quadraticCurveTo(-18, tip[1] * 0.55, tip[0], tip[1]);
    c.quadraticCurveTo(4, tip[1] * 0.5, 10, -3);
    c.closePath();
    c.fillStyle = colour;
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 1.4;
    c.stroke();
    const mix = (from: Pt): Pt => [from[0] + (tip[0] - from[0]) * 0.62, from[1] + (tip[1] - from[1]) * 0.62];
    shape(c, [mix([-12, -3]), tip, mix([8, -3])], INK, null);
  };
  wing(flap * 0.8 - 0.15, "#e8e2d4");
  shape(c, [[-16, 2], [-46, 7]], null, INK, 2);
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.lineCap = "round";
  const neck = new Path2D("M14-2Q34-9 48-4");
  c.stroke(neck);
  c.strokeStyle = "#fbf6ec";
  c.lineWidth = 4.4;
  c.stroke(neck);
  c.beginPath();
  c.ellipse(0, 0, 20, 7, 0, 0, 7);
  c.fillStyle = "#fbf6ec";
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.4;
  c.stroke();
  shape(c, [[50, -4], [63, -2]], null, INK, 2);
  c.fillStyle = "#d9482b";
  c.beginPath();
  c.arc(47, -7, 3, 0, 7);
  c.fill();
  wing(flap, "#fbf6ec");
}

export function HeroLandscape() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapEl = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrapEl || !canvas || !ctx) return;

    const foliage = buildFoliage();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let u = 1; // pixels per board unit
    let layers: HTMLCanvasElement[] = [];
    let grain: CanvasPattern | null = null;
    let raf = 0;
    let visible = true;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    // Paper grain: speckle plus a few fibres, multiplied over the finished print.
    const tile = document.createElement("canvas");
    tile.width = tile.height = 220;
    const tc = tile.getContext("2d")!;
    tc.fillStyle = "#fff";
    tc.fillRect(0, 0, 220, 220);
    for (let i = 0; i < 5200; i++) {
      tc.fillStyle = `rgba(90,70,40,${(hash(i, 1) * 0.16).toFixed(3)})`;
      tc.fillRect(hash(i, 2) * 220, hash(i, 3) * 220, 1.4, 1.4);
    }
    for (let i = 0; i < 40; i++) {
      tc.fillStyle = "rgba(90,70,40,.07)";
      tc.fillRect(hash(i, 4) * 220, hash(i, 5) * 220, 14 + hash(i, 6) * 30, 1);
    }

    const sway = (groups: Group[], t: number) => {
      for (const g of groups) {
        const dx = Math.sin(t * 0.9 + g.phase) * g.amp;
        for (const b of g.blobs) {
          ctx.beginPath();
          ctx.ellipse(b.x + dx, b.y, b.rx, b.ry, 0, 0, 7);
          ctx.fillStyle = b.c;
          ctx.fill();
          if (b.line) {
            ctx.strokeStyle = INK;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
          if (b.dot) {
            ctx.fillStyle = "#d9607f";
            ctx.beginPath();
            ctx.arc(b.x + dx, b.y, b.rx * 0.22, 0, 7);
            ctx.fill();
          }
        }
      }
    };

    const resize = () => {
      const size = wrapEl.clientWidth;
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.height = Math.round(size * dpr);
      u = canvas.width / S;
      layers = [paintSky, paintFuji, paintMid].map((paint) => {
        const layer = document.createElement("canvas");
        layer.width = layer.height = Math.ceil((S + PAD * 2) * u);
        const c = layer.getContext("2d")!;
        c.scale(u, u);
        c.translate(PAD, PAD);
        c.lineJoin = "round";
        paint(c);
        return layer;
      });
      grain = ctx.createPattern(tile, "repeat");
      if (still) draw(0);
    };

    const draw = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      const at = (depth: number): Pt => [-mouse.x * depth, -mouse.y * depth * 0.5];
      const layer = (i: number, depth: number) => {
        const [ox, oy] = at(depth);
        ctx.drawImage(layers[i], (ox - PAD) * u, (oy - PAD) * u);
      };
      const shifted = (depth: number, paint: () => void) => {
        const [ox, oy] = at(depth);
        ctx.save();
        ctx.scale(u, u);
        ctx.translate(ox, oy);
        ctx.lineJoin = "round";
        paint();
        ctx.restore();
      };

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      layer(0, DEPTH.sky);

      shifted(DEPTH.sky, () => {
        // Bands of mist drifting slowly across the sky.
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(251,238,219,.9)";
        [[80, 250, 300, 22, 5], [600, 300, 260, 18, -4], [320, 420, 220, 16, 3], [760, 470, 200, 14, -3]].forEach(([x, y, w, h, speed], n) => {
          const bx = wrap(x + t * speed, S + 500) - 250;
          ctx.lineWidth = h;
          ctx.beginPath();
          ctx.moveTo(bx, y);
          ctx.lineTo(bx + w, y);
          ctx.moveTo(bx + w * 0.3, y + h * 0.85);
          ctx.lineTo(bx + w * (1.1 + (n % 2) * 0.2), y + h * 0.85);
          ctx.stroke();
        });
      });

      shifted(DEPTH.cranes, () => {
        [{ off: 0, y: 150 }, { off: 210, y: 225 }].forEach((crane, n) => {
          ctx.save();
          ctx.translate(wrap(t * 24 + crane.off, S + 360) - 180, crane.y + Math.sin(t * 0.7 + n * 2) * 12);
          ctx.scale(1.15, 1.15);
          drawCrane(ctx, Math.sin(t * 3.2 + n * 1.4));
          ctx.restore();
        });
      });

      layer(1, DEPTH.fuji);

      shifted(DEPTH.mid, () => {
        // Lake: deep blue wash with rows of wave crests sliding in alternate directions.
        ctx.fillStyle = wash(ctx, SHORE, S + PAD, [[0, "#9dbfd0"], [0.35, "#4f7fae"], [1, "#1b3a6b"]]);
        ctx.fillRect(-PAD * 2, SHORE, S + PAD * 4, S);
        ctx.lineCap = "round";
        for (let r = 0; r < 12; r++) {
          const y = SHORE + 18 + r * 26;
          const len = 46 + r * 6;
          const amp = 3 + r * 0.5;
          const shift = wrap(t * (8 + r * 2) * (r % 2 ? 1 : -1) + r * 17, len);
          ctx.beginPath();
          for (let x = -PAD * 2 - len + shift; x < S + PAD * 2; x += len) {
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + len * 0.25, y - amp * 2, x + len * 0.5, y);
          }
          ctx.strokeStyle = `rgba(240,244,236,${(0.4 + 0.25 * Math.sin(t * 0.8 + r)).toFixed(2)})`;
          ctx.lineWidth = 1.6 + r * 0.08;
          ctx.stroke();
        }
      });

      layer(2, DEPTH.mid);

      shifted(DEPTH.mid, () => {
        // Waterfalls: white ribbons with blue streaks running down, mist at the foot.
        for (const fall of FALLS) {
          ctx.fillStyle = "#f2f0e4";
          ctx.fillRect(fall.x, fall.y0, fall.w, SHORE - fall.y0);
          ctx.strokeStyle = "#5f8fb8";
          ctx.lineWidth = 2;
          ctx.lineCap = "butt";
          const streaks = Math.round(fall.w / 9);
          for (let k = 0; k < streaks; k++) {
            const x = fall.x + ((k + 0.5) * fall.w) / streaks;
            ctx.setLineDash([16 + ((k * 7) % 12), 13]);
            ctx.lineDashOffset = -(t * fall.speed * (0.85 + (k % 3) * 0.1) + k * 11);
            ctx.beginPath();
            ctx.moveTo(x, fall.y0);
            ctx.lineTo(x, SHORE);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          shape(ctx, [[fall.x, fall.y0], [fall.x, SHORE]], null);
          shape(ctx, [[fall.x + fall.w, fall.y0], [fall.x + fall.w, SHORE]], null);
          for (let i = 0; i < 7; i++) {
            const life = (t * 0.6 + i / 7) % 1;
            ctx.fillStyle = `rgba(251,246,236,${(0.9 * (1 - life)).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(fall.x - 8 + hash(i, fall.x) * (fall.w + 16), SHORE + 2 - life * 14, 5 + life * 9, 0, 7);
            ctx.fill();
          }
        }
        sway(foliage.mid, t);
      });

      shifted(DEPTH.fg, () => {
        BRANCHES.forEach(([path, width]) => inked(ctx, path, BARK, width));
        sway(foliage.fg, t);
        // Petals tumbling diagonally.
        const span = S + 160;
        for (let i = 0; i < 26; i++) {
          const x = wrap(hash(i, 1) * span + t * (14 + hash(i, 3) * 14) + Math.sin(t * 0.8 + i) * 18, span) - 80;
          const y = wrap(hash(i, 2) * span + t * (10 + hash(i, 4) * 11), span) - 80;
          ctx.fillStyle = PINKS[i % 3];
          ctx.beginPath();
          ctx.ellipse(x, y, 6, 3.4, t * 0.6 + i, 0, 7);
          ctx.fill();
        }
      });

      if (grain) {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = grain;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
      }
    };

    const loop = (now: number) => {
      draw(now / 1000);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    const onMove = (e: PointerEvent) => {
      const r = wrapEl.getBoundingClientRect();
      mouse.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      mouse.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    };
    const onLeave = () => {
      mouse.tx = mouse.ty = 0;
    };

    const sizeWatch = new ResizeObserver(resize);
    sizeWatch.observe(wrapEl);
    resize();

    // Only animate while on screen.
    const viewWatch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !still) raf = requestAnimationFrame(loop);
    });
    if (!still) {
      viewWatch.observe(wrapEl);
      wrapEl.addEventListener("pointermove", onMove);
      wrapEl.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      sizeWatch.disconnect();
      viewWatch.disconnect();
      wrapEl.removeEventListener("pointermove", onMove);
      wrapEl.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="hero-landscape"
      role="img"
      aria-label="Animated Japanese woodblock-print landscape: Mount Fuji at sunset, waterfalls, a tea house, cherry blossom and two cranes in flight"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
