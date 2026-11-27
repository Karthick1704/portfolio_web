"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { OnCallPager } from "./OnCallPager";
import { beep, piyo, readSound, subscribeSound, writeSound } from "./sound";

type Theme = "green" | "amber" | "red";
type Screen = { header: string; title: string; lines: string[]; theme: Theme };
type Step = Screen & { hold: number };

const SCREENS: Screen[] = [
  { header: "SYS: PROD-API-01", title: "STATUS: NOMINAL", lines: ["ACTIVE ALERTS: 0", "REGIONS: 4/4 HEALTHY", "PRESS ↵ FOR 2AM TEST"], theme: "green" },
  { header: "ID: KARTHICK S", title: "APP SUPPORT & SRE", lines: ["EXP: 4+ YEARS", "PAGES CLEARED: 900+", "ON-CALL: 4 AWS REGIONS"], theme: "green" },
  { header: "ENV: CORE STACK", title: "LINUX & AUTOMATION", lines: ["BASH / PYTHON / JAVA / SQL", "CLOUDWATCH / SPLUNK", "AWS / AZURE / DOCKER"], theme: "green" },
  { header: "PING: DIRECT LINE", title: "AVAILABLE FOR ROLES", lines: ["FIRST ALARM TO", "ROOT CAUSE.", "SCROLL TO CONNECT ↓"], theme: "green" },
];

// A simulated incident, labelled SIM on the screen.
const ALERT: Step[] = [
  { header: "!! 02:14 AM PAGE !!", title: "PAGE: API FAIL [503]", lines: ["NODE: prod-api-03", "ERR: HIGH MEM (94%)", "ACK'D. TRIAGING..."], theme: "red", hold: 1900 },
  { header: "DIAGNOSTIC RUNNING", title: "[INVESTIGATING...]", lines: ["$ journalctl -u worker", "FOUND: STALE LOCK", "ISOLATING PID 4821..."], theme: "amber", hold: 1700 },
  { header: "REMEDIATION", title: "[RESOLVING...]", lines: ["CLEARING CACHE LOCK", "GRACEFUL RELOAD: OK", "VERIFYING HEALTH..."], theme: "amber", hold: 1700 },
  { header: "INCIDENT CLOSED", title: "OK: SYSTEM HEALTHY", lines: ["HTTP 200 | P95: 41ms", "MTTR: 38 SECONDS", "BACK TO SLEEP. zzz"], theme: "green", hold: 2800 },
];

const IDLE_HINT = "Drag to inspect in 3D · click ◀ ▶ or ↵ TEST";
const PALETTES: Record<Theme, { bg: [string, string, string]; ink: string; glow: number; led: number }> = {
  green: { bg: ["#9bfad0", "#46cf99", "#26996e"], ink: "#06261a", glow: 0x46cf99, led: 0x34d399 },
  amber: { bg: ["#fde68a", "#f59e0b", "#b45309"], ink: "#291502", glow: 0xf59e0b, led: 0xf59e0b },
  red: { bg: ["#fecaca", "#f87171", "#b91c1c"], ink: "#2b0505", glow: 0xf87171, led: 0xef4444 },
};

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (fn: () => void) => { const m = window.matchMedia(REDUCE_QUERY); m.addEventListener("change", fn); return () => m.removeEventListener("change", fn); };
const readReduce = () => window.matchMedia(REDUCE_QUERY).matches;

function roundedRect(width: number, height: number, radius: number) {
  const s = new THREE.Shape();
  const x = -width / 2, y = -height / 2;
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

/** next/font registers JetBrains Mono under a generated family name; read it from the CSS variable. */
function monoFamily() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
  return v ? `${v}, ui-monospace, monospace` : "ui-monospace, SFMono-Regular, monospace";
}

/** Draw text, shrinking the font if it would overflow the available width. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, weight: number, size: number, family: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 12 && ctx.measureText(text).width > maxW) { s -= 1; ctx.font = `${weight} ${s}px ${family}`; }
  ctx.fillText(text, x, y);
}

export function OnCallPager3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const api = useRef({ prev: () => {}, next: () => {}, test: () => {} });
  const [fallback, setFallback] = useState(false);
  const [hint, setHint] = useState(IDLE_HINT);
  const [announce, setAnnounce] = useState(`${SCREENS[0].title}. ${SCREENS[0].lines.join(". ")}`);
  const sound = useSyncExternalStore(subscribeSound, readSound, () => true);
  const reduce = useSyncExternalStore(subscribeReduce, readReduce, () => false);
  const soundRef = useRef(sound);
  const reduceRef = useRef(reduce);
  useEffect(() => { soundRef.current = sound; reduceRef.current = reduce; }, [sound, reduce]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      const id = window.setTimeout(() => setFallback(true), 0);
      return () => window.clearTimeout(id);
    }

    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.Texture>(t: T) => { textures.push(t); return t; };

    // --- Renderer, camera, studio environment ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.12, 6.4);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);
    const dom = renderer.domElement;
    dom.setAttribute("aria-hidden", "true");

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0b0f17);
    const softbox = (color: number, intensity: number, pos: [number, number, number], scale: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
      m.position.set(...pos); m.scale.set(...scale); m.lookAt(0, 0, 0); envScene.add(m);
    };
    softbox(0xffffff, 2.2, [0, 6, 4], [8, 4, 1]);
    softbox(0x00d9ff, 1.8, [-6, 2, 3], [5, 5, 1]);
    softbox(0xf97316, 0.9, [6, -2, 2], [4, 4, 1]);
    softbox(0x94a3b8, 1.1, [0, 2, -6], [10, 5, 1]);
    const envRT = pmrem.fromScene(envScene, 0.04);
    pmrem.dispose();
    envScene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    scene.environment = envRT.texture;

    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x00d9ff, 1.6); rim.position.set(-5, 3, -3); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xe2e8f0, 0.65); fill.position.set(0, -4, 4); scene.add(fill);

    // --- Textures ---
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = grainCanvas.height = 256;
    const gctx = grainCanvas.getContext("2d")!;
    const img = gctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 24; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gctx.putImageData(img, 0, 0);
    const grain = track(new THREE.CanvasTexture(grainCanvas));
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(4, 4);

    let family = monoFamily();
    const labelTex = (text: string, { w = 256, h = 128, size = 54, color = "#cbd5e1" } = {}) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const t = track(new THREE.CanvasTexture(c));
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      const draw = () => {
        const x = c.getContext("2d")!;
        x.clearRect(0, 0, w, h); x.fillStyle = color; x.textAlign = "center"; x.textBaseline = "middle";
        fitText(x, text, w / 2, h / 2 + 2, w * 0.92, 700, size, family);
        t.needsUpdate = true;
      };
      draw();
      redrawLabels.push(draw);
      return t;
    };
    const redrawLabels: (() => void)[] = [];

    // --- Materials ---
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.46, metalness: 0.18, bumpMap: grain, bumpScale: 0.006, envMapIntensity: 1.1 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0d1015, roughness: 0.35, metalness: 0.3 });
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.38, metalness: 0.15, bumpMap: grain, bumpScale: 0.004 });
    const alertMat = new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xdc2626, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.1 });

    const pager = new THREE.Group();
    scene.add(pager);

    // Chassis, side seam, recessed bezel
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(3.1, 2.15, 0.32), { depth: 0.62, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.09, bevelSegments: 8, curveSegments: 24 });
    bodyGeo.center();
    pager.add(new THREE.Mesh(bodyGeo, bodyMat));
    const seamGeo = new THREE.ExtrudeGeometry(roundedRect(3.16, 2.21, 0.34), { depth: 0.03, bevelEnabled: false, curveSegments: 24 });
    seamGeo.center();
    pager.add(new THREE.Mesh(seamGeo, trimMat));
    const bezelGeo = new THREE.ExtrudeGeometry(roundedRect(2.58, 1.12, 0.14), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4 });
    bezelGeo.center();
    const bezel = new THREE.Mesh(bezelGeo, trimMat);
    bezel.position.set(0, 0.34, 0.42);
    pager.add(bezel);

    // Backlit LCD (canvas texture, aspect matched to its plane)
    const lcdCanvas = document.createElement("canvas");
    lcdCanvas.width = 660; lcdCanvas.height = 266;
    const lcd = lcdCanvas.getContext("2d")!;
    const lcdTex = track(new THREE.CanvasTexture(lcdCanvas));
    lcdTex.colorSpace = THREE.SRGBColorSpace; lcdTex.anisotropy = 4;
    const lcdMat = new THREE.MeshStandardMaterial({ map: lcdTex, emissiveMap: lcdTex, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.32, metalness: 0 });
    const lcdMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 0.96), lcdMat);
    lcdMesh.position.set(0, 0.34, 0.478);
    pager.add(lcdMesh);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 0.99), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.06, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 }));
    glass.position.set(0, 0.34, 0.49);
    pager.add(glass);
    const glow = new THREE.PointLight(0x46cf99, 1.4, 3.2);
    glow.position.set(0, 0.34, 0.85);
    pager.add(glow);

    // LEDs
    const ledGreen = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 2.2, roughness: 0.2 });
    const ledAlert = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.15, roughness: 0.2 });
    const ledGeo = new THREE.CapsuleGeometry(0.032, 0.09, 6, 12);
    ledGeo.rotateZ(Math.PI / 2);
    const led1 = new THREE.Mesh(ledGeo, ledAlert); led1.position.set(0.84, 0.99, 0.43); pager.add(led1);
    const led2 = new THREE.Mesh(ledGeo, ledGreen); led2.position.set(1.06, 0.99, 0.43); pager.add(led2);
    const topLedMat = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 1.8, roughness: 0.15 });
    const topLed = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.16), topLedMat);
    topLed.position.set(0.55, 1.17, 0.05);
    pager.add(topLed);

    // Physical buttons, raycast targets
    type Btn = { name: "prev" | "next" | "enter" | "alert"; group: THREE.Group; mesh: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>; base: THREE.Vector3; press: number; top: boolean };
    const buttons: Btn[] = [];
    const addButton = (o: { name: Btn["name"]; w: number; h: number; x: number; y: number; z: number; label: string; color: string; mat: THREE.MeshStandardMaterial; top?: boolean }) => {
      const group = new THREE.Group();
      group.position.set(o.x, o.y, o.z);
      const geo = new THREE.ExtrudeGeometry(roundedRect(o.w, o.h, 0.07), { depth: o.top ? 0.14 : 0.11, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 4 });
      geo.center();
      const mesh = new THREE.Mesh(geo, o.mat.clone());
      mesh.userData.button = o.name;
      group.add(mesh);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 0.85, o.h * 0.72), new THREE.MeshBasicMaterial({ map: labelTex(o.label, { color: o.color, size: o.top ? 40 : 58 }), transparent: true, depthWrite: false }));
      label.position.z = (o.top ? 0.07 : 0.055) + 0.028;
      label.userData.button = o.name;
      group.add(label);
      if (o.top) group.rotation.x = -Math.PI / 2;
      pager.add(group);
      buttons.push({ name: o.name, group, mesh, base: group.position.clone(), press: 0, top: !!o.top });
    };
    addButton({ name: "prev", w: 0.62, h: 0.34, x: -0.92, y: -0.52, z: 0.45, label: "◀", color: "#cbd5e1", mat: buttonMat });
    addButton({ name: "next", w: 0.62, h: 0.34, x: -0.18, y: -0.52, z: 0.45, label: "▶", color: "#cbd5e1", mat: buttonMat });
    addButton({ name: "enter", w: 0.94, h: 0.36, x: 0.76, y: -0.52, z: 0.45, label: "↵ TEST", color: "#38d8ff", mat: buttonMat });
    addButton({ name: "alert", w: 0.56, h: 0.24, x: -0.78, y: 1.19, z: 0.02, label: "2AM", color: "#ffffff", mat: alertMat, top: true });

    // Front branding, back belt clip and serial plate
    const brand = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.27), new THREE.MeshBasicMaterial({ map: labelTex("SRE ON-CALL", { w: 512, h: 96, size: 34, color: "rgba(203,213,225,.52)" }), transparent: true, depthWrite: false }));
    brand.position.set(-0.55, -0.92, 0.425);
    pager.add(brand);
    const clipGeo = new THREE.ExtrudeGeometry(roundedRect(1.65, 0.55, 0.12), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4 });
    clipGeo.center();
    const clip = new THREE.Mesh(clipGeo, trimMat);
    clip.position.set(0, 0.15, -0.52);
    pager.add(clip);
    const serial = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), new THREE.MeshBasicMaterial({ map: labelTex("KARTHICK S // KS-99 SRE", { w: 512, h: 96, size: 28, color: "rgba(148,163,184,.55)" }), transparent: true, depthWrite: false }));
    serial.position.set(0, -0.62, -0.43);
    serial.rotation.y = Math.PI;
    pager.add(serial);

    // --- Screen state ---
    let screenIndex = 0;
    let alertStep = -1;
    let pages = 0;
    let typed = Infinity;
  let typeStart = 0;
    let timers: number[] = [];
    let lastInteract = performance.now();

    const current = (): Screen => {
      if (alertStep >= 0) return ALERT[alertStep];
      const s = SCREENS[screenIndex];
      return screenIndex === 0 && pages > 0 ? { ...s, lines: ["ACTIVE ALERTS: 0", `PAGES TONIGHT: ${pages} · CLOSED`, s.lines[2]] } : s;
    };

    const drawLcd = () => {
      const data = current();
      const pal = PALETTES[data.theme];
      const W = lcdCanvas.width, H = lcdCanvas.height;
      const g = lcd.createRadialGradient(W * 0.5, H * 0.42, 20, W * 0.5, H * 0.5, W * 0.65);
      g.addColorStop(0, pal.bg[0]); g.addColorStop(0.65, pal.bg[1]); g.addColorStop(1, pal.bg[2]);
      lcd.fillStyle = g; lcd.fillRect(0, 0, W, H);
      lcd.fillStyle = "rgba(0,0,0,.055)";
      for (let y = 0; y < H; y += 5) lcd.fillRect(0, y, W, 2);
      lcd.fillStyle = pal.ink; lcd.textBaseline = "top";
      lcd.textAlign = "left"; fitText(lcd, data.header, 30, 22, W * 0.62, 700, 22, family);
      lcd.textAlign = "right"; fitText(lcd, alertStep >= 0 ? "SIM" : `${screenIndex + 1}/${SCREENS.length}`, W - 30, 22, 90, 700, 22, family);
      lcd.strokeStyle = pal.ink; lcd.lineWidth = 2; lcd.setLineDash([8, 6]);
      lcd.beginPath(); lcd.moveTo(30, 56); lcd.lineTo(W - 30, 56); lcd.stroke(); lcd.setLineDash([]);
      // Typewriter: reveal title and lines character by character
      let left = typed;
      const reveal = (s: string) => { const part = s.slice(0, Math.max(0, Math.floor(left))); left -= s.length; return part; };
      lcd.textAlign = "left";
      fitText(lcd, reveal(data.title), 30, 70, W - 60, 800, 34, family);
      data.lines.forEach((line, i) => fitText(lcd, reveal(line), 30, 122 + i * 36, W - 60, 700, 24, family));
      if (alertStep >= 0) {
        lcd.fillStyle = "rgba(0,0,0,.15)"; lcd.fillRect(30, H - 18, W - 60, 5);
        lcd.fillStyle = pal.ink; lcd.globalAlpha = 0.6; lcd.fillRect(30, H - 18, (W - 60) * ((alertStep + 1) / ALERT.length), 5); lcd.globalAlpha = 1;
      }
      const v = lcd.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, "rgba(0,0,0,.22)"); v.addColorStop(0.12, "rgba(0,0,0,0)"); v.addColorStop(0.88, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.25)");
      lcd.fillStyle = v; lcd.fillRect(0, 0, W, H);
      lcdTex.needsUpdate = true;
    };

    const totalChars = () => { const d = current(); return d.title.length + d.lines.reduce((n, l) => n + l.length, 0); };

    const refresh = (say = true) => {
      const data = current();
      const pal = PALETTES[data.theme];
      typed = reduceRef.current ? Infinity : 0;
      typeStart = performance.now();
      drawLcd();
      glow.color.setHex(pal.glow);
      glow.intensity = data.theme === "red" ? 2.1 : data.theme === "amber" ? 1.8 : 1.4;
      const ok = data.theme === "green";
      ledGreen.emissiveIntensity = ok ? 2.2 : 0.1;
      ledAlert.color.setHex(ok ? 0xf59e0b : pal.led); ledAlert.emissive.setHex(ok ? 0xf59e0b : pal.led); ledAlert.emissiveIntensity = ok ? 0.15 : 2.4;
      topLedMat.color.setHex(pal.led); topLedMat.emissive.setHex(pal.led);
      if (say) setAnnounce(`${data.title}. ${data.lines.join(". ")}`);
    };

    const cycle = (dir: number) => {
      lastInteract = performance.now();
      if (alertStep >= 0) return;
      screenIndex = (screenIndex + dir + SCREENS.length) % SCREENS.length;
      refresh();
    };

    const triggerAlert = () => {
      lastInteract = performance.now();
      if (alertStep >= 0) return;
      timers.forEach(window.clearTimeout); timers = [];
      setHint("Simulating a 2 AM page: triage → fix → verify");
      alertStep = 0; refresh();
      if (soundRef.current) beep([140, 90, 140, 90, 140, 260, 140, 90, 140, 90, 140], 2650);
      try { navigator.vibrate?.([220, 90, 220, 90, 420]); } catch { /* unsupported */ }
      let at = 0;
      ALERT.forEach((step, i) => {
        at += step.hold;
        timers.push(window.setTimeout(() => {
          if (i < ALERT.length - 1) {
            alertStep = i + 1; refresh();
            if (alertStep === ALERT.length - 1 && soundRef.current) piyo();
          } else {
            alertStep = -1; screenIndex = 0; pages += 1; refresh();
            setHint(IDLE_HINT);
            lastInteract = performance.now();
          }
        }, at));
      });
    };

    const pressButton = (name: Btn["name"]) => {
      const b = buttons.find(x => x.name === name);
      if (b) b.press = 1;
      if (name === "prev") cycle(-1);
      else if (name === "next") cycle(1);
      else triggerAlert();
    };
    api.current = { prev: () => pressButton("prev"), next: () => pressButton("next"), test: () => pressButton("enter") };

    refresh(false);
    // Redraw once the real web font is ready (canvas text does not wait for it).
    void document.fonts?.ready.then(() => { family = monoFamily(); redrawLabels.forEach(d => d()); drawLcd(); });

    // --- Pointer: hover parallax, drag to inspect, raycast clicks ---
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const REST = { x: 0.24, y: -0.44, z: 0.16 };
    const target = { ...REST };
    const rot = { ...REST };
    let dragging = false, moved = false, inspecting = false, lastX = 0, lastY = 0, dragEnd = 0, pointerType = "mouse";
    let hovered: Btn | null = null;
    let engaged = false;

    const hit = (cx: number, cy: number) => {
      const r = dom.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(buttons.flatMap(b => b.group.children), false);
      const name = hits[0]?.object.userData.button as Btn["name"] | undefined;
      return name ? buttons.find(b => b.name === name) ?? null : null;
    };
    const restPose = () => { inspecting = false; target.x = REST.x; target.y = REST.y; target.z = REST.z; };

    const onDown = (e: PointerEvent) => {
      dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; pointerType = e.pointerType;
      if (e.pointerType === "mouse") dom.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      engaged = true;
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { moved = true; inspecting = true; }
        target.y += dx * 0.01;
        if (pointerType === "mouse") target.x = Math.max(-1.1, Math.min(1.1, target.x + dy * 0.01));
        lastX = e.clientX; lastY = e.clientY;
        dom.style.cursor = "grabbing";
        return;
      }
      if (e.pointerType !== "mouse") return;
      hovered = hit(e.clientX, e.clientY);
      dom.style.cursor = hovered ? "pointer" : "grab";
      if (!inspecting && !reduceRef.current) {
        const r = dom.getBoundingClientRect();
        target.y = REST.y + ((e.clientX - r.left) / r.width - 0.5) * 0.35;
        target.x = REST.x + ((e.clientY - r.top) / r.height - 0.5) * 0.28;
      }
    };
    const onUp = (e: PointerEvent) => {
      const click = dragging && !moved;
      dragging = false; dragEnd = performance.now();
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
      if (click) { const b = hit(e.clientX, e.clientY); if (b) pressButton(b.name); }
    };
    const onCancel = () => { dragging = false; dragEnd = performance.now(); };
    const onLeave = () => { engaged = false; hovered = null; if (!dragging) restPose(); };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointercancel", onCancel);
    dom.addEventListener("pointerleave", onLeave);

    // --- Size and visibility ---
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      dom.style.width = "100%"; dom.style.height = "100%";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(container);

    // --- Render loop ---
    let raf = 0;
    let last = performance.now();
    const start = last;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      const t = (now - start) / 1000;
      const calm = reduceRef.current;

      // Return from an inspection drag after a few idle seconds.
      if (inspecting && !dragging && now - dragEnd > 4000) restPose();
      // Idle auto-cycle through the info screens.
      if (!calm && alertStep < 0 && !engaged && now - lastInteract > 5200) { lastInteract = now; screenIndex = (screenIndex + 1) % SCREENS.length; refresh(); }

      if (typed < totalChars()) { typed = (now - typeStart) / 11; drawLcd(); }

      const k = 1 - Math.pow(0.0001, dt); // frame-rate independent easing
      rot.x += (target.x - rot.x) * k * 0.6;
      rot.y += (target.y - rot.y) * k * 0.6;
      rot.z += (target.z - rot.z) * k * 0.6;
      pager.rotation.set(rot.x, rot.y, rot.z);

      if (alertStep === 0 && !calm) {
        pager.position.x = Math.sin(t * 75) * 0.045;
        pager.position.y = Math.cos(t * 82) * 0.035;
        const pulse = 0.5 + 0.5 * Math.sin(t * 16);
        ledAlert.emissiveIntensity = 0.8 + pulse * 2.5;
        topLedMat.emissiveIntensity = 0.8 + pulse * 2.5;
      } else {
        pager.position.x *= 0.85;
        pager.position.y = calm ? 0 : Math.sin(t * 1.5) * 0.11;
        topLedMat.emissiveIntensity = 1.8;
      }

      for (const b of buttons) {
        b.press *= Math.pow(0.82, dt * 60);
        const depth = b.press * 0.055;
        if (b.top) b.group.position.y = b.base.y - depth; else b.group.position.z = b.base.z - depth;
        const hov = hovered?.name === b.name;
        if (b.name === "alert") b.mesh.material.emissiveIntensity = hov ? 0.7 : 0.35;
        else { b.mesh.material.emissive.setHex(hov ? 0x38d8ff : 0x000000); b.mesh.material.emissiveIntensity = hov ? 0.18 : 0; }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    container.dataset.ready = "true";

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
      ro.disconnect(); io.disconnect();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onCancel);
      dom.removeEventListener("pointerleave", onLeave);
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
      textures.forEach(t => t.dispose());
      envRT.dispose();
      renderer.dispose();
      dom.remove();
      delete container.dataset.ready;
    };
  }, []);

  if (fallback) return <OnCallPager />;

  return (
    <div className="p3d">
      <div ref={mountRef} className="p3d-stage" />
      <div className="p3d-keys" role="group" aria-label="Pager controls">
        <button type="button" onClick={() => api.current.prev()}>◀ Previous</button>
        <button type="button" onClick={() => api.current.next()}>Next ▶</button>
        <button type="button" onClick={() => api.current.test()}>↵ Simulate 2 AM page</button>
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <div className="p3d-foot">
        <p className="p3d-hint">{hint}</p>
        <button type="button" className={`p3d-sound${sound ? "" : " off"}`} onClick={() => writeSound(!sound)} aria-pressed={!sound} aria-label={sound ? "Mute pager sounds" : "Unmute pager sounds"}>{sound ? "♪ SOUND ON" : "♪ MUTED"}</button>
      </div>
    </div>
  );
}
