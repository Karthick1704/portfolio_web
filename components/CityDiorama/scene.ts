import * as THREE from "three";
import { CITIES, type CityName } from "./cities";

/*
 * Isometric city diorama. The board is a 3x3 grid of blocks with roads between
 * them. Each city is a plan: a building style plus what stands on each block
 * (generic buildings, a park, water, or a landmark made from simple solids).
 * Cells are numbered row by row from the back-left; the camera sits at the
 * front-right corner, so tall landmarks go in the middle or the back.
 */

type Anim = (t: number) => void;
type Ground = "pave" | "grass" | "water" | "sand";
type Paint = string | THREE.Material;
interface Style {
  walls: string[];
  h: [number, number];
  roof: "flat" | "mansard" | "hip";
  roofColor: string;
  cars: string[];
  bus?: boolean;
}
interface Ctx {
  rand: () => number;
  style: Style;
  anims: Anim[];
}
type Fill = (g: THREE.Group, c: Ctx) => void;
type Cell = [Ground, Fill?];
interface Plan {
  style: Style;
  cells: Cell[];
}

const SPAN = 6.4; // distance between block centres
const BLOCK = 5.4; // block width; the 1.0 left over is road
const AT = [-SPAN, 0, SPAN];
const GROUND: Record<Ground, [string, number]> = {
  pave: ["#d9dee5", 0.15],
  grass: ["#8fc46a", 0.15],
  sand: ["#ecd9a8", 0.12],
  water: ["#4fa8e0", 0.07],
};
const TREES = ["#5fae5a", "#4a9a52", "#7cc46a"];
const WHITE = "#f6f4ee";
const GOLD = "#e3b23c";
const SLATE = "#4d5a66";
const TILE = 1.1; // world size of one window-texture tile (2x2 windows)

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Diorama {
  show(city: number, night: boolean, cloudy: boolean): void;
  resize(): void;
  setPointer(x: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

export function createDiorama(canvas: HTMLCanvasElement, still: boolean): Diorama {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-15, 15, 17, -17, 0.1, 140);
  camera.position.set(26, 21, 26);
  const hemi = new THREE.HemisphereLight("#e6f3ff", "#b8a88c", 1.5);
  const sun = new THREE.DirectionalLight("#fff3dc", 2.6);
  sun.position.set(-9, 22, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(hemi, sun);

  // Everything created is tracked so dispose() can free it.
  const geos: THREE.BufferGeometry[] = [];
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const track = <T extends THREE.BufferGeometry>(geo: T) => (geos.push(geo), geo);
  const unitBox = track(new THREE.BoxGeometry(1, 1, 1));
  const blob = track(new THREE.IcosahedronGeometry(1, 2));
  const disc = track(new THREE.CircleGeometry(1, 24));

  const mat = (color: string, extra?: THREE.MeshStandardMaterialParameters) => {
    const key = color + (extra ? JSON.stringify(extra) : "");
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
    return mats.get(key)!;
  };
  // Glossy, but not metallic: with no environment map a metal surface renders near-black.
  const silver = (color: string) => mat(color, { roughness: 0.4 });
  const WATER = mat(GROUND.water[0], { roughness: 0.25 });
  const paint = (p: Paint) => (typeof p === "string" ? mat(p) : p);

  // Window textures: one for the daytime wall, one that glows at night.
  const windowTexture = (wall: string, panes: string[]) => {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 128;
    const c = tile.getContext("2d")!;
    c.fillStyle = wall;
    c.fillRect(0, 0, 128, 128);
    panes.forEach((pane, i) => {
      c.fillStyle = pane;
      c.fillRect(18 + (i % 2) * 64, 14 + (i >> 1) * 64, 28, 36);
    });
    const tex = new THREE.CanvasTexture(tile);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };
  const wallMap = windowTexture("#ffffff", ["#8fa9c2", "#8fa9c2", "#8fa9c2", "#8fa9c2"]);
  wallMap.colorSpace = THREE.SRGBColorSpace;
  const glowMap = windowTexture("#000000", ["#ffffff", "#ffffff", "#000000", "#ffffff"]);
  const windowMat = (color: string) => {
    const key = "win" + color;
    if (!mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, map: wallMap, emissive: "#ffcf7a", emissiveMap: glowMap, emissiveIntensity: 0 });
      mats.set(key, m);
      windowMats.push(m);
    }
    return mats.get(key)!;
  };

  // ---- solids (y is always the base of the shape, not its centre) ----
  const put = (p: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    p.add(mesh);
    return mesh;
  };
  const box = (p: THREE.Object3D, w: number, h: number, d: number, c: Paint, x = 0, y = 0, z = 0) => {
    const mesh = put(p, unitBox, paint(c), x, y + h / 2, z);
    mesh.scale.set(w, h, d);
    return mesh;
  };
  const cyl = (p: THREE.Object3D, top: number, bottom: number, h: number, c: Paint, x = 0, y = 0, z = 0, sides = 18) =>
    put(p, track(new THREE.CylinderGeometry(top, bottom, h, sides)), paint(c), x, y + h / 2, z);
  // Four-sided tapered block; top and bottom are full widths.
  const pyr = (p: THREE.Object3D, top: number, bottom: number, h: number, c: Paint, x = 0, y = 0, z = 0) => {
    const geo = track(new THREE.CylinderGeometry(top / Math.SQRT2, bottom / Math.SQRT2, h, 4));
    geo.rotateY(Math.PI / 4);
    return put(p, geo, paint(c), x, y + h / 2, z);
  };
  const ball = (p: THREE.Object3D, r: number, c: Paint, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const mesh = put(p, blob, paint(c), x, y, z);
    mesh.scale.set(r * sx, r * sy, r * sz);
    return mesh;
  };
  const clock = (p: THREE.Object3D, r: number, x: number, y: number, z: number, faceX: boolean) => {
    const face = put(p, disc, mat(WHITE), x, y, z);
    face.scale.setScalar(r);
    if (faceX) face.rotation.y = Math.PI / 2;
    const hand = box(p, faceX ? 0.02 : 0.05, r * 0.8, faceX ? 0.05 : 0.02, "#2b3038", x + (faceX ? 0.01 : 0), y, z + (faceX ? 0 : 0.01));
    hand.castShadow = false;
  };

  // A building with windows. Returns the height of its roofline.
  const building = (p: THREE.Object3D, w: number, h: number, d: number, color: string, x: number, z: number, c: Ctx, y = 0, roof = true) => {
    const geo = track(new THREE.BoxGeometry(w, h, d));
    const uv = geo.attributes.uv;
    const tiles = (len: number) => Math.max(1, Math.round(len / TILE));
    for (let i = 0; i < uv.count; i++) {
      const face = i >> 2; // +x, -x, +y, -y, +z, -z
      if (face === 2 || face === 3) uv.setXY(i, 0, 0); // roof samples plain wall
      else uv.setXY(i, uv.getX(i) * tiles(face < 2 ? d : w), uv.getY(i) * tiles(h));
    }
    const side = windowMat(color);
    const top = mat(color);
    put(p, geo, [side, side, top, top, side, side], x, y + h / 2, z);
    if (!roof) return y + h;
    const { style } = c;
    if (style.roof === "flat") {
      if (c.rand() < 0.6) box(p, w * 0.4, 0.25, d * 0.4, "#aab3bd", x + w * 0.12, y + h, z - d * 0.1);
    } else {
      const hip = style.roof === "hip";
      pyr(p, hip ? 0.06 : w * 0.72, w + 0.12, hip ? 0.7 : 0.45, style.roofColor, x, y + h, z).scale.z = d / w;
    }
    return y + h;
  };

  const tree = (p: THREE.Object3D, x: number, z: number, c: Ctx, size = 1) => {
    cyl(p, 0.06 * size, 0.08 * size, 0.4 * size, "#7a5a3c", x, 0, z, 6);
    ball(p, (0.34 + c.rand() * 0.12) * size, TREES[Math.floor(c.rand() * 3)], x, 0.68 * size, z);
  };
  const palm = (p: THREE.Object3D, x: number, z: number) => {
    cyl(p, 0.05, 0.08, 1.3, "#8a6a4a", x, 0, z, 6).rotation.z = 0.12;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const leaf = ball(p, 1, "#4a9a52", x - 0.15 + Math.cos(a) * 0.3, 1.32, z + Math.sin(a) * 0.3, 0.42, 0.07, 0.14);
      leaf.rotation.y = -a;
    }
  };
  const boat = (p: THREE.Object3D, x: number, z: number, hull: string, c: Ctx, sail = true) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    p.add(g);
    box(g, 0.95, 0.2, 0.36, hull, 0, 0.02, 0);
    if (sail) {
      cyl(g, 0.02, 0.02, 1.1, "#6b5a48", 0, 0.2, 0, 5);
      cyl(g, 0, 0.42, 0.95, WHITE, 0.16, 0.32, 0, 3).scale.z = 0.12;
    } else box(g, 0.4, 0.18, 0.26, WHITE, -0.1, 0.22, 0);
    const phase = c.rand() * 6;
    c.anims.push((t) => {
      g.position.y = Math.sin(t * 1.4 + phase) * 0.03;
      g.rotation.z = Math.sin(t * 1.1 + phase) * 0.05;
    });
    return g;
  };
  // Big wheel that faces the camera and turns (London Eye, Riesenrad).
  const wheel = (p: THREE.Object3D, r: number, y: number, rim: string, cabin: string, c: Ctx) => {
    const axis = new THREE.Group();
    axis.position.y = y;
    axis.rotation.y = Math.PI / 4;
    p.add(axis);
    const spin = new THREE.Group();
    axis.add(spin);
    put(spin, track(new THREE.TorusGeometry(r, 0.07, 8, 48)), mat(rim), 0, 0, 0);
    for (let k = 0; k < 6; k++) box(spin, 0.04, r * 2, 0.04, rim, 0, -r, 0).rotation.z = (k * Math.PI) / 6;
    for (let k = 0; k < 12; k++) ball(spin, 0.19, cabin, Math.cos((k * Math.PI) / 6) * r, Math.sin((k * Math.PI) / 6) * r, 0);
    for (const side of [-1, 1]) {
      const leg = box(axis, 0.13, y / Math.cos(0.33), 0.13, rim, side * Math.tan(0.33) * (y / 2), -y - (y / Math.cos(0.33) - y) / 2, -0.25);
      leg.rotation.z = side * 0.33;
    }
    c.anims.push((t) => {
      spin.rotation.z = t * 0.22;
    });
  };

  // ---- generic block fills ----
  const blocks: Fill = (g, c) => {
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      if (c.rand() < 0.18) {
        tree(g, x - 0.4, z + 0.3, c);
        tree(g, x + 0.45, z - 0.35, c);
        continue;
      }
      const [lo, hi] = c.style.h;
      const h = lo + (hi - lo) * c.rand() ** 1.6;
      building(g, 1.6 + c.rand() * 0.6, h, 1.6 + c.rand() * 0.6, c.style.walls[Math.floor(c.rand() * c.style.walls.length)], x, z, c);
    }
  };
  const park: Fill = (g, c) => {
    for (let k = 0; k < 8; k++) tree(g, (c.rand() - 0.5) * 4.4, (c.rand() - 0.5) * 4.4, c, 0.9 + c.rand() * 0.4);
    cyl(g, 0.8, 0.8, 0.03, WATER, 0.5, 0, 0.4, 20);
  };
  const corners: Fill = (g, c) => [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([x, z]) => tree(g, x, z, c));
  const sails: Fill = (g, c) => {
    boat(g, -1.2, 0.9, WHITE, c);
    boat(g, 1.1, -0.8, "#e9c46a", c).rotation.y = 0.6;
  };
  // Sand at the back, sea along the front edge. The sea is drawn wider than the
  // block so neighbouring beach blocks join into one shoreline.
  const beach = (extra?: Fill): Fill => (g, c) => {
    box(g, SPAN, 0.1, 2.3, WATER, 0, -0.06, 1.6);
    box(g, SPAN, 0.11, 0.14, WHITE, 0, -0.06, 0.42);
    palm(g, -1.9, -1.9);
    palm(g, 0.6, -2.1);
    ["#e63946", "#f4a261", "#2a9d8f"].forEach((color, k) => {
      const x = -1.6 + k * 1.5 + c.rand() * 0.4;
      cyl(g, 0.015, 0.015, 0.5, WHITE, x, 0, -0.6, 5);
      cyl(g, 0, 0.36, 0.2, color, x, 0.45, -0.6, 10);
    });
    extra?.(g, c);
  };

  // ---- landmarks ----
  const L: Record<string, Fill> = {
    tokyoTower(g, c) {
      const red = "#e8432d";
      pyr(g, 1.5, 3.2, 2.6, red);
      box(g, 1.9, 0.3, 1.9, WHITE, 0, 2.6);
      pyr(g, 0.95, 1.4, 2.2, WHITE, 0, 2.9);
      pyr(g, 0.6, 0.95, 2, red, 0, 5.1);
      box(g, 0.9, 0.25, 0.9, WHITE, 0, 7.1);
      pyr(g, 0.25, 0.55, 1.8, WHITE, 0, 7.35);
      cyl(g, 0.04, 0.08, 1.6, red, 0, 9.15, 0, 6);
      corners(g, c);
    },
    skytree(g, c) {
      const body = "#c3cfdb";
      cyl(g, 0.3, 0.75, 6.6, body);
      cyl(g, 0.95, 0.7, 0.5, "#e8eef3", 0, 6.6);
      cyl(g, 0.75, 0.95, 0.35, "#9fb3c6", 0, 7.1);
      cyl(g, 0.5, 0.6, 0.4, "#e8eef3", 0, 7.45);
      cyl(g, 0.06, 0.14, 2.6, body, 0, 7.85, 0, 6);
      building(g, 1.5, 2.2, 1.5, c.style.walls[0], -1.8, 1.8, c);
      building(g, 1.4, 3, 1.4, c.style.walls[2], 1.8, -1.8, c);
    },
    pagoda(g, c) {
      for (let k = 0; k < 3; k++) {
        box(g, 1.5 - k * 0.3, 0.6, 1.5 - k * 0.3, "#c8432c", 0, k);
        pyr(g, 0.3, 2.3 - k * 0.4, 0.4, "#3b4252", 0, k + 0.6);
      }
      cyl(g, 0.03, 0.05, 0.7, GOLD, 0, 3, 0, 6);
      corners(g, c);
    },
    eiffel(g, c) {
      const iron = "#8a6f55";
      const dark = "#6f5843";
      pyr(g, 1.5, 3.4, 2.4, iron);
      box(g, 2, 0.22, 2, dark, 0, 2.4);
      pyr(g, 0.75, 1.4, 2.6, iron, 0, 2.62);
      box(g, 1, 0.2, 1, dark, 0, 5.22);
      pyr(g, 0.16, 0.7, 3.8, iron, 0, 5.42);
      cyl(g, 0.03, 0.06, 1.2, iron, 0, 9.22, 0, 6);
      corners(g, c);
    },
    arc(g, c) {
      const stone = "#e9dcc2";
      box(g, 0.9, 2.1, 1.3, stone, -1);
      box(g, 0.9, 2.1, 1.3, stone, 1);
      box(g, 3, 0.9, 1.4, stone, 0, 2.1);
      box(g, 3.2, 0.15, 1.6, "#d8c9aa", 0, 3);
      corners(g, c);
    },
    bigBen(g) {
      const stone = "#cdb17a";
      box(g, 1.2, 6.6, 1.2, stone, 0.9, 0, -0.6);
      box(g, 1.45, 1.4, 1.45, "#dcc594", 0.9, 6.6, -0.6);
      clock(g, 0.5, 0.9 + 0.735, 7.3, -0.6, true);
      clock(g, 0.5, 0.9, 7.3, -0.6 + 0.735, false);
      pyr(g, 0.1, 1.5, 1.9, SLATE, 0.9, 8, -0.6);
      cyl(g, 0.02, 0.05, 0.7, GOLD, 0.9, 9.9, -0.6, 6);
      box(g, 4.4, 1.5, 1.3, stone, -0.3, 0, 0.9);
      box(g, 4.5, 0.2, 1.4, SLATE, -0.3, 1.5, 0.9);
      for (const x of [-2.4, 1.8]) {
        box(g, 0.5, 2.2, 0.5, stone, x, 0, 0.9);
        pyr(g, 0.05, 0.55, 0.5, SLATE, x, 2.2, 0.9);
      }
    },
    eye(g, c) {
      wheel(g, 2.1, 2.5, WHITE, "#9fd3f0", c);
      tree(g, -2, 2, c);
      tree(g, 2, -2, c);
    },
    shard(g, c) {
      pyr(g, 0.08, 2, 8.2, silver("#a9cfe0"));
      building(g, 1.4, 2.4, 1.4, c.style.walls[0], -1.8, 1.8, c);
      building(g, 1.5, 3.2, 1.5, c.style.walls[2], 1.8, 1.8, c);
    },
    empire(g, c) {
      const stone = "#bdb6a8";
      let y = 0;
      for (const [w, h] of [[2.6, 3.2], [2, 3], [1.4, 2.2], [0.8, 0.9]]) y = building(g, w, h, w, stone, 0, 0, c, y, false);
      cyl(g, 0.03, 0.12, 2, "#9aa3ad", 0, y, 0, 6);
    },
    chrysler(g, c) {
      const steel = silver("#c9d2da");
      building(g, 1.5, 5.5, 1.5, "#aeb6bf", 0, 0, c, 0, false);
      cyl(g, 0.45, 0.75, 0.7, steel, 0, 5.5, 0, 8);
      cyl(g, 0.2, 0.45, 0.8, steel, 0, 6.2, 0, 8);
      cyl(g, 0.02, 0.2, 1.4, steel, 0, 7, 0, 8);
      building(g, 1.5, 4.2, 1.5, c.style.walls[2], -1.8, 1.7, c);
      building(g, 1.4, 3.4, 1.4, c.style.walls[3], 1.8, 1.7, c);
    },
    liberty(g, c) {
      const copper = "#7cc4ad";
      cyl(g, 1.5, 1.7, 0.25, GROUND.grass[0], 0, 0, 0, 12);
      cyl(g, 1, 1.1, 0.3, "#cfc6b4", 0, 0.25, 0, 10);
      box(g, 0.8, 1.3, 0.8, "#d9cfb9", 0, 0.55);
      cyl(g, 0.2, 0.34, 1.5, copper, 0, 1.85, 0, 10);
      ball(g, 0.2, copper, 0, 3.5);
      cyl(g, 0.02, 0.24, 0.22, copper, 0, 3.62, 0, 7);
      cyl(g, 0.06, 0.07, 0.9, copper, 0.3, 3.1, 0, 6).rotation.z = -0.3;
      ball(g, 0.11, GOLD, 0.45, 4.05);
      boat(g, -1.7, 1.8, WHITE, c, false);
    },
    sydneyTower(g, c) {
      cyl(g, 0.14, 0.22, 5.6, "#c9b27a", 0, 0, 0, 8);
      cyl(g, 0.7, 0.45, 0.5, "#d9b85a", 0, 5.6);
      cyl(g, 0.55, 0.7, 0.4, "#e8cf7a", 0, 6.1);
      cyl(g, 0.03, 0.1, 1.6, "#c9b27a", 0, 6.5, 0, 6);
      building(g, 1.6, 3.6, 1.6, c.style.walls[1], -1.7, 1.7, c);
      building(g, 1.5, 2.6, 1.5, c.style.walls[0], 1.7, -1.7, c);
      building(g, 1.4, 4.4, 1.4, c.style.walls[3], -1.7, -1.7, c);
    },
    harbourBridge(g, c) {
      const steel = "#6b7785";
      for (const x of [-0.35, 0.35]) {
        const arch = put(g, track(new THREE.TorusGeometry(2.4, 0.09, 8, 28, Math.PI)), mat(steel), x, 0.3, 0);
        arch.rotation.y = Math.PI / 2;
      }
      box(g, 0.9, 0.12, 5.6, "#7b8794", 0, 0.95);
      for (const z of [-2.55, 2.55]) for (const x of [-0.55, 0.55]) box(g, 0.3, 1.7, 0.35, "#d9cfb9", x, 0, z);
      boat(g, 1.9, 0.6, WHITE, c);
    },
    opera(g, c) {
      box(g, 4.2, 0.3, 3, "#d9b79f");
      for (const x of [-0.85, 0.85]) {
        for (let k = 0; k < 3; k++) {
          const shell = ball(g, 1, WHITE, x, 0.5 + (1.5 - k * 0.38) * 0.45, -0.9 + k * 0.95, 0.5, 1.5 - k * 0.38, 0.52);
          shell.rotation.x = -0.5;
        }
      }
      boat(g, -2.2, 2.2, "#e9c46a", c, false);
    },
    petronas(g) {
      const steel = silver("#cfd8e0");
      box(g, 3.8, 0.5, 2.2, "#e3e7ea");
      for (const x of [-0.95, 0.95]) {
        cyl(g, 0.66, 0.7, 4, steel, x, 0.5);
        cyl(g, 0.52, 0.66, 2.3, steel, x, 4.5);
        cyl(g, 0.38, 0.52, 1.3, steel, x, 6.8);
        cyl(g, 0.2, 0.38, 0.9, steel, x, 8.1);
        cyl(g, 0.02, 0.2, 1.7, steel, x, 9, 0, 8);
      }
      box(g, 1.3, 0.16, 0.22, steel, 0, 4.4);
    },
    klTower(g, c) {
      cyl(g, 0.26, 0.42, 5.6, "#e6e1d8");
      cyl(g, 0.85, 0.5, 0.5, "#e8ddd0", 0, 5.6);
      cyl(g, 0.6, 0.85, 0.45, "#b9c7d2", 0, 6.1);
      cyl(g, 0.04, 0.2, 2.2, "#d9413a", 0, 6.55, 0, 6);
      for (let k = 0; k < 7; k++) tree(g, (c.rand() - 0.5) * 4.6, (k % 2 ? 1 : -1) * (1.4 + c.rand()), c);
    },
    skyTower(g, c) {
      const body = "#dfe3e8";
      cyl(g, 0.28, 0.5, 6.2, body);
      cyl(g, 0.9, 0.55, 0.45, "#c9d1d9", 0, 6.2);
      cyl(g, 0.7, 0.9, 0.4, "#eef1f4", 0, 6.65);
      cyl(g, 0.45, 0.6, 0.4, "#c9d1d9", 0, 7.05);
      cyl(g, 0.03, 0.22, 3, body, 0, 7.45, 0, 6);
      building(g, 1.5, 2.6, 1.5, c.style.walls[1], -1.8, 1.8, c);
      building(g, 1.5, 2, 1.5, c.style.walls[0], 1.8, -1.8, c);
    },
    volcano(g, c) {
      cyl(g, 1, 2.5, 2.2, "#6fae5c", 0, 0, 0, 9);
      cyl(g, 0.8, 0.8, 0.05, "#55864a", 0, 2.2, 0, 9);
      corners(g, c);
    },
    stephans(g) {
      const stone = "#d9d0bd";
      box(g, 3.4, 1.7, 1.4, stone, -0.3, 0, 0.3);
      pyr(g, 0.1, 1.5, 1.8, "#3f7f78", -0.3, 1.7, 0.3).scale.x = 3.4 / 1.5;
      box(g, 0.95, 4.6, 0.95, "#cfc5b0", 1.2, 0, -0.9);
      pyr(g, 0.05, 1.05, 4, "#8a8474", 1.2, 4.6, -0.9);
      box(g, 0.8, 2.4, 0.8, "#cfc5b0", -1.6, 0, -0.9);
      ball(g, 0.42, "#6fa89a", -1.6, 2.5, -0.9);
    },
    riesenrad(g, c) {
      wheel(g, 2.1, 2.6, "#8a3b34", "#c8432c", c);
      tree(g, -2, 2, c);
      tree(g, 2, -2, c);
    },
    palace(g, c) {
      const yellow = "#f2d472";
      box(g, 4.4, 1.3, 1.2, yellow, 0, 0, -0.9);
      box(g, 4.5, 0.15, 1.3, "#7b8a86", 0, 1.3, -0.9);
      box(g, 1.5, 1.7, 1.4, yellow, 0, 0, -0.9);
      box(g, 1.6, 0.15, 1.5, "#7b8a86", 0, 1.7, -0.9);
      for (let k = 0; k < 4; k++) box(g, 0.9, 0.22, 0.5, "#4a9a52", -1.8 + k * 1.2, 0, 1.2);
      tree(g, -2.2, 2.1, c);
      tree(g, 2.2, 2.1, c);
    },
    westerkerk(g, c) {
      const brick = "#9c4a3a";
      box(g, 1.1, 4.2, 1.1, brick, 0.6, 0, -0.8);
      box(g, 0.85, 1.1, 0.85, "#e9e1cf", 0.6, 4.2, -0.8);
      box(g, 0.6, 0.9, 0.6, "#e9e1cf", 0.6, 5.3, -0.8);
      ball(g, 0.3, "#3f7fc4", 0.6, 6.45, -0.8);
      cyl(g, 0.02, 0.04, 0.5, GOLD, 0.6, 6.7, -0.8, 6);
      box(g, 2.8, 1.6, 1.2, brick, -0.4, 0, 0.8);
      pyr(g, 0.1, 1.3, 0.8, SLATE, -0.4, 1.6, 0.8).scale.x = 2.8 / 1.3;
      tree(g, 2, 1.8, c);
    },
    windmill(g, c) {
      cyl(g, 0.45, 0.85, 2.3, "#7a5a44", 0, 0, -0.6, 8);
      cyl(g, 0, 0.52, 0.5, "#3b4252", 0, 2.3, -0.6, 8);
      const axis = new THREE.Group();
      axis.position.set(0.35, 2.25, -0.25);
      axis.rotation.y = Math.PI / 4;
      g.add(axis);
      for (const turn of [0, Math.PI / 2]) box(axis, 0.16, 3.2, 0.05, "#efe6d2", 0, -1.6, 0).rotation.z = turn;
      c.anims.push((t) => {
        axis.rotation.z = t * 0.5;
      });
      ["#e63946", "#f4d35e", "#f28cb1", "#e63946"].forEach((color, k) => box(g, 3.6, 0.1, 0.24, color, 0, 0, 1 + k * 0.4));
      tree(g, -2.1, -1.9, c);
    },
    gopuram(g) {
      const tiers = ["#e8b04a", "#d9534f", "#3f8fbf", "#5aa469", "#e8894a"];
      box(g, 2.8, 0.6, 2, WHITE);
      for (let k = 0; k < 6; k++) box(g, 2.5 - k * 0.3, 0.62, 1.7 - k * 0.2, tiers[k % 5], 0, 0.6 + k * 0.62);
      const barrel = cyl(g, 0.33, 0.33, 1.2, GOLD, 0, 4.32, 0);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.y = 4.6;
      for (const x of [-0.4, 0, 0.4]) cyl(g, 0, 0.07, 0.3, GOLD, x, 4.9, 0, 6);
    },
    central(g) {
      const red = "#b5352f";
      box(g, 4.4, 1.5, 1.5, red, 0, 0, 0.2);
      box(g, 4.5, 0.12, 1.6, WHITE, 0, 1.5, 0.2);
      box(g, 0.9, 3.4, 0.9, red, 0, 0, 0.2);
      box(g, 1, 0.12, 1, WHITE, 0, 3.4, 0.2);
      clock(g, 0.3, 0.46, 2.9, 0.2, true);
      clock(g, 0.3, 0, 2.9, 0.66, false);
      pyr(g, 0.05, 1, 0.9, "#7a2a26", 0, 3.52, 0.2);
      for (const x of [-2, 2]) {
        box(g, 0.6, 2.1, 0.6, red, x, 0, 0.2);
        box(g, 0.7, 0.1, 0.7, WHITE, x, 2.1, 0.2);
      }
    },
    lighthouse(g) {
      for (let k = 0; k < 4; k++) cyl(g, 0.24, 0.3, 0.9, k % 2 ? WHITE : "#d9413a", 1.3, k * 0.9, -1.4, 12);
      cyl(g, 0.3, 0.3, 0.3, "#3b4252", 1.3, 3.6, -1.4, 12);
      ball(g, 0.16, GOLD, 1.3, 4.05, -1.4);
    },
    fishingBoats(g, c) {
      boat(g, -1, -0.2, "#2a9d8f", c, false).rotation.y = 0.5;
      boat(g, 1.2, 0, "#e76f51", c, false).rotation.y = -0.4;
    },
    corcovado(g, c) {
      cyl(g, 0.9, 2.6, 4.6, "#4f8f58", 0, 0, 0, 7);
      cyl(g, 0.75, 0.9, 0.5, "#6f7a68", 0, 4.6, 0, 7);
      box(g, 0.45, 0.4, 0.45, "#cfc6b4", 0, 5.1);
      cyl(g, 0.13, 0.2, 1.3, WHITE, 0, 5.5, 0, 8);
      box(g, 1.5, 0.15, 0.15, WHITE, 0, 6.45);
      ball(g, 0.15, WHITE, 0, 6.93);
      corners(g, c);
    },
    sugarloaf(g, c) {
      cyl(g, 1.8, 2.2, 0.6, "#4f8f58", 0, 0, 0, 9);
      ball(g, 1, "#7d6a55", 0.2, 1.5, 0, 1.4, 2.6, 1.4);
      ball(g, 1, "#8a765f", -1.3, 0.7, 0.8, 0.9, 1.2, 0.9);
      tree(g, 2, 2, c);
    },
  };

  const BRICK = ["#9c4a3a", "#7a3b34", "#c46a4a", "#5a3a34", "#e6d2b0", "#8a5a44"];
  // A row of narrow canal houses with stepped gables.
  const houses = (z: number): Fill => (g, c) => {
    for (let k = 0; k < 5; k++) {
      const h = 2 + c.rand() * 1.4;
      const x = -2.1 + k * 1.05;
      const color = BRICK[Math.floor(c.rand() * BRICK.length)];
      building(g, 0.92, h, 1.5, color, x, z, c, 0, false);
      box(g, 0.62, 0.35, 1.5, color, x, h, z);
      box(g, 0.32, 0.3, 1.5, color, x, h + 0.35, z);
    }
    for (let k = 0; k < 4; k++) tree(g, -1.8 + k * 1.2, -z * 1.9, c, 0.85);
  };
  const canal = (bridges: boolean): Fill => (g, c) => {
    const b = boat(g, 0, (c.rand() - 0.5) * 2, "#8a5a44", c, false);
    const phase = c.rand() * 6;
    c.anims.push((t) => {
      b.position.x = Math.sin(t * 0.25 + phase) * 1.8;
    });
    if (bridges) for (const x of [-SPAN / 2, SPAN / 2]) box(g, 1, 0.16, 5.7, "#cfc7b6", x, 0.14);
  };

  const flat = (walls: string[], lo: number, hi: number, cars: string[], bus = false): Style => ({ walls, h: [lo, hi], roof: "flat", roofColor: "", cars, bus });
  const B: Cell = ["pave", blocks];
  const P: Cell = ["grass", park];
  const mixedCars = ["#d9413a", "#f4f4f4", "#3d6fb5", "#f2c230"];
  const PLANS: Record<CityName, Plan> = {
    Chennai: {
      style: flat(["#f1e3c6", "#e9c9a0", "#f6f0e2", "#d9a37a", "#bfd6d9"], 1.8, 4, ["#f2c230", "#f2c230", "#f4f4f4", "#c9413a"]),
      cells: [B, B, B, ["pave", L.central], ["pave", L.gopuram], B, ["sand", beach()], ["sand", beach(L.fishingBoats)], ["sand", beach(L.lighthouse)]],
    },
    Tokyo: {
      style: flat(["#e9edf1", "#cfd8e0", "#b9c6d2", "#f4f1ea", "#a9bccb"], 2, 6, mixedCars),
      cells: [B, B, B, ["pave", L.skytree], ["grass", L.tokyoTower], B, ["grass", L.pagoda], B, B],
    },
    Amsterdam: {
      style: flat(BRICK, 2, 3.4, mixedCars),
      cells: [["pave", houses(0.9)], ["pave", L.westerkerk], ["pave", houses(0.9)], ["water", canal(false)], ["water", canal(true)], ["water", canal(false)], ["grass", L.windmill], ["pave", houses(-0.9)], ["pave", houses(-0.9)]],
    },
    London: {
      style: { walls: ["#c9b79a", "#b5553f", "#d8cdbb", "#8f5a44"], h: [1.8, 4], roof: "hip", roofColor: "#5a5f66", cars: ["#d9413a"], bus: true },
      cells: [B, ["pave", L.shard], B, B, ["pave", L.bigBen], ["grass", L.eye], B, P, B],
    },
    Sydney: {
      style: flat(["#e6ebef", "#bcd3e2", "#f1ede4", "#9fb9cc"], 2.5, 6.5, mixedCars),
      cells: [B, B, B, B, ["pave", L.sydneyTower], ["water", L.harbourBridge], P, ["water", L.opera], ["water", sails]],
    },
    "Kuala Lumpur": {
      style: flat(["#cfd9e2", "#9fb6c9", "#e8e2d6", "#7f9db8"], 3, 7, mixedCars),
      cells: [B, ["grass", L.klTower], B, B, ["pave", L.petronas], B, B, P, B],
    },
    Auckland: {
      style: flat(["#e9eaec", "#c9d3da", "#efe7d9", "#b9c9d6"], 1.8, 4.5, mixedCars),
      cells: [["grass", L.volcano], B, B, B, ["pave", L.skyTower], B, ["water", sails], ["water", sails], ["water", sails]],
    },
    Vienna: {
      style: { walls: ["#f1e7cf", "#ead9b8", "#f4d98a", "#e6cfc0"], h: [2, 3.2], roof: "mansard", roofColor: "#5f7f78", cars: mixedCars },
      cells: [B, B, B, B, ["pave", L.stephans], ["grass", L.riesenrad], ["grass", L.palace], P, B],
    },
    Paris: {
      style: { walls: ["#efe6d2", "#e6dcc6", "#f3ecdc"], h: [2, 3.2], roof: "mansard", roofColor: "#6f7f8f", cars: mixedCars },
      cells: [B, B, B, B, ["grass", L.eiffel], B, ["pave", L.arc], P, B],
    },
    "New York": {
      style: flat(["#b9b3a6", "#8f9aa6", "#a8754f", "#6f8fae", "#d1ccc0"], 4, 8.5, ["#f2c230", "#f2c230", "#f4f4f4"]),
      cells: [B, ["pave", L.chrysler], B, B, ["pave", L.empire], B, P, B, ["water", L.liberty]],
    },
    "Rio de Janeiro": {
      style: flat(["#f4f1ea", "#e6ded0", "#f2c9a0", "#bfdcea", "#f0b8a8"], 2, 5, mixedCars),
      cells: [B, B, ["grass", L.sugarloaf], B, ["grass", L.corcovado], B, ["sand", beach()], ["sand", beach()], ["sand", beach()]],
    },
  };

  // ---- board ----
  const stage = new THREE.Group();
  scene.add(stage);
  box(stage, 20, 2, 20, "#eef1f5", 0, -2.02, 0);
  box(stage, 19.6, 0.06, 19.6, "#5d6672", 0, -0.04, 0);

  const cache = new Map<number, { group: THREE.Group; anims: Anim[] }>();
  const buildCity = (index: number) => {
    const plan = PLANS[CITIES[index].name];
    const group = new THREE.Group();
    const c: Ctx = { rand: seeded(index * 97 + 13), style: plan.style, anims: [] };
    const kind = (r: number, col: number) => plan.cells[r * 3 + col][0];
    const blockedX = [false, false]; // road lines running front-to-back
    const blockedZ = [false, false]; // road lines running left-to-right
    plan.cells.forEach(([ground, fill], i) => {
      const [color, h] = GROUND[ground];
      const cell = new THREE.Group();
      cell.position.set(AT[i % 3], h, AT[Math.floor(i / 3)]);
      group.add(cell);
      box(cell, BLOCK, h, BLOCK, ground === "water" ? WATER : color, 0, -h, 0);
      fill?.(cell, c);
    });
    // Join neighbouring water, sand or grass blocks across the road gap.
    const join = (ground: Ground, w: number, d: number, x: number, z: number) => {
      const [color, h] = GROUND[ground];
      box(group, w, h, d, ground === "water" ? WATER : color, x, 0, z);
    };
    const gap = SPAN - BLOCK;
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 3; col++) {
        const ground = kind(r, col);
        if (ground === "pave") continue;
        const right = col < 2 && kind(r, col + 1) === ground;
        const below = r < 2 && kind(r + 1, col) === ground;
        if (right) {
          join(ground, gap, BLOCK, AT[col] + SPAN / 2, AT[r]);
          blockedX[col] = true;
        }
        if (below) {
          join(ground, BLOCK, gap, AT[col], AT[r] + SPAN / 2);
          blockedZ[r] = true;
        }
        if (right && below && kind(r + 1, col + 1) === ground) join(ground, gap, gap, AT[col] + SPAN / 2, AT[r] + SPAN / 2);
      }
    }
    // Traffic on every road that is not interrupted by water or sand.
    const { cars, bus } = plan.style;
    [0, 1, 2, 3].forEach((line) => {
      const alongZ = line < 2;
      if ((alongZ ? blockedX : blockedZ)[line % 2]) return;
      for (let k = 0; k < 2; k++) {
        const dir = k ? 1 : -1;
        const long = bus ? 0.95 : 0.5 + c.rand() * 0.15;
        const car = box(group, alongZ ? 0.28 : long, bus ? 0.42 : 0.24, alongZ ? long : 0.28, cars[Math.floor(c.rand() * cars.length)]);
        const lane = (line % 2 ? 1 : -1) * (SPAN / 2) + dir * 0.22;
        const speed = 0.9 + c.rand() * 0.8;
        const offset = c.rand() * 19;
        c.anims.push((t) => {
          const along = ((((t * speed + offset) % 19) + 19) % 19) * dir - 9.5 * dir;
          car.position.set(alongZ ? lane : along, 0.1 + car.scale.y / 2, alongZ ? along : lane);
        });
      }
    });
    return { group, anims: c.anims };
  };

  // Clouds drift above the board and do not rotate with it.
  const clouds = new THREE.Group();
  scene.add(clouds);
  const cloudMat = mat("#ffffff", { roughness: 1 });
  const cloudRand = seeded(5);
  for (let k = 0; k < 5; k++) {
    const cloud = new THREE.Group();
    cloud.position.set((cloudRand() - 0.5) * 30, 8.5 + cloudRand() * 2.5, (cloudRand() - 0.5) * 22 - 4);
    cloud.userData.speed = 0.25 + cloudRand() * 0.3;
    for (const [x, r] of [[-0.8, 0.7], [0, 1], [0.9, 0.75]]) ball(cloud, r, cloudMat, x, 0, 0, 1, 0.7, 1).castShadow = false;
    clouds.add(cloud);
  }

  const applyLook = (night: boolean, cloudy: boolean) => {
    hemi.intensity = night ? 1.25 : cloudy ? 1.9 : 1.5;
    hemi.color.set(night ? "#7f93d8" : "#e6f3ff");
    hemi.groundColor.set(night ? "#2c3558" : "#b8a88c");
    sun.intensity = night ? 1.5 : cloudy ? 1.6 : 2.6;
    sun.color.set(night ? "#a9bcff" : "#fff3dc");
    windowMats.forEach((m) => (m.emissiveIntensity = night ? 1.5 : 0));
    cloudMat.color.set(night ? "#7f8bb0" : cloudy ? "#dfe5ec" : "#ffffff");
    clouds.children.forEach((cloud, k) => (cloud.visible = cloudy || k < 2));
  };

  // ---- animation and city switching ----
  let current = -1;
  let next: { city: number; night: boolean; cloudy: boolean } | null = null;
  let mode: "idle" | "out" | "in" = "idle";
  let modeStart = 0;
  let pointer = 0;
  let pointerSmooth = 0;
  let raf = 0;
  let last = 0;

  const swap = () => {
    if (!next) return;
    if (current >= 0) stage.remove(cache.get(current)!.group);
    if (!cache.has(next.city)) cache.set(next.city, buildCity(next.city));
    stage.add(cache.get(next.city)!.group);
    current = next.city;
    applyLook(next.night, next.cloudy);
    next = null;
  };

  const frame = (now: number) => {
    const t = now / 1000;
    last = t;
    let scale = 1;
    if (mode === "out") {
      const k = Math.min(1, (t - modeStart) / 0.4);
      scale = 1 - k * k;
      if (k === 1) {
        swap();
        mode = "in";
        modeStart = t;
      }
    } else if (mode === "in") {
      const k = Math.min(1, (t - modeStart) / 0.8);
      const back = 1.4; // slight overshoot as the new city pops up
      scale = 1 + (back + 1) * (k - 1) ** 3 + back * (k - 1) ** 2;
      if (k === 1) mode = "idle";
    }
    pointerSmooth += (pointer - pointerSmooth) * 0.05;
    stage.scale.setScalar(Math.max(0.001, scale));
    stage.rotation.y = still ? 0 : Math.sin(t * 0.25) * 0.16 + pointerSmooth * 0.3 + (1 - scale) * 1.4;
    if (current >= 0) for (const anim of cache.get(current)!.anims) anim(t);
    for (const cloud of clouds.children) {
      cloud.position.x = ((((t * cloud.userData.speed + cloud.id * 7) % 36) + 36) % 36) - 18;
    }
    renderer.render(scene, camera);
    if (raf) raf = requestAnimationFrame(frame);
  };

  return {
    show(city, night, cloudy) {
      if (city === current && !next) {
        applyLook(night, cloudy);
        if (still) frame(last * 1000);
        return;
      }
      next = { city, night, cloudy };
      if (still || current < 0) {
        swap();
        mode = still ? "idle" : "in";
        modeStart = last;
        if (still) frame(0);
      } else if (mode !== "out") {
        mode = "out";
        modeStart = last;
      }
    },
    resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const halfH = (15 * h) / w;
      // Keep the board in the lower part of the frame; the text sits above it.
      Object.assign(camera, { top: halfH + 2.4, bottom: -halfH + 2.4 });
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      if (still) frame(last * 1000);
    },
    setPointer(x) {
      pointer = x;
    },
    start() {
      if (!raf && !still) raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      geos.forEach((geo) => geo.dispose());
      mats.forEach((m) => m.dispose());
      wallMap.dispose();
      glowMap.dispose();
      renderer.dispose();
    },
  };
}
