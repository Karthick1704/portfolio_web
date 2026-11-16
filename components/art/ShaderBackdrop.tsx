"use client";

import { useEffect, useRef } from "react";

/** Live numbers from the render loop, read by the "Engine" section. */
export const telemetry = { fps: 0, width: 0, height: 0, scale: 1, gpu: "", frames: 0, active: false };

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }`;

// Domain-warped fractal noise, drawn as glowing contour lines.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
out vec4 o;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  mat2 r = mat2(.8, -.6, .6, .8);
  for (int i = 0; i < 4; i++){ v += a * noise(p); p = r * p * 2.03 + 11.7; a *= .5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec2 m = (uMouse - .5 * uRes) / uRes.y;
  float d = length(uv - m);
  float near = exp(-d * d * 7.);

  vec2 p = uv * 1.45;
  p.y -= uScroll * .55;
  p += (uv - m) * .22 * near;

  float t = uTime * .035;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  float f = fbm(p + 1.7 * q + vec2(0., t * .7));

  float bands = f * 15.;
  float line = abs(fract(bands) - .5);
  float w = fwidth(bands);
  float c = 1. - smoothstep(0., w * 1.3, line);

  vec3 cyan = vec3(0., .85, 1.), violet = vec3(.48, .36, 1.), ember = vec3(1., .54, .24);
  float hueShift = sin(uScroll * .9) * .12;
  vec3 col = mix(cyan, violet, smoothstep(.34, .58, f + hueShift));
  col = mix(col, ember, smoothstep(.6, .82, f + hueShift));

  vec3 base = vec3(.039, .039, .059);
  vec3 outc = base + col * f * f * .11;
  outc += col * c * (.07 + .42 * near);
  outc += col * near * .035;

  float vig = smoothstep(1.25, .25, length(uv));
  outc = mix(base, outc, .35 + .65 * vig);
  outc += (hash(gl_FragCoord.xy + fract(uTime)) - .5) * .018;
  o = vec4(outc, 1.);
}`;

export function ShaderBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return; // CSS fallback background stays visible

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uScroll = gl.getUniformLocation(prog, "uScroll");

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    telemetry.gpu = raw.replace(/^ANGLE \((.*)\)$/, "$1").split(",").slice(0, 2).join(",").replace(/\s+Direct3D.*$/, "").trim() || "WebGL2";
    telemetry.active = true;
    canvas.dataset.live = "true";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scale = Math.min(window.devicePixelRatio || 1, 1.5);
    // Parked off-screen until the pointer first moves, so the cursor light never sits on text unprompted.
    let mx = -4000, my = -4000;
    let tx = mx, ty = my;
    let seen = false;
    let scroll = window.scrollY / window.innerHeight;

    const resize = () => {
      const w = Math.max(1, Math.round(window.innerWidth * scale));
      const h = Math.max(1, Math.round(window.innerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      telemetry.width = w;
      telemetry.height = h;
      telemetry.scale = scale;
    };
    resize();

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) { seen = true; mx = tx; my = ty; }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let acc = 0, count = 0;
    const start = last;

    const draw = (now: number) => {
      mx += (tx - mx) * 0.07;
      my += (ty - my) * 0.07;
      scroll += (window.scrollY / window.innerHeight - scroll) * 0.08;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mx * scale, (window.innerHeight - my) * scale);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      telemetry.frames++;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      acc += dt;
      count++;
      if (acc >= 500) {
        const avg = acc / count;
        telemetry.fps = Math.round(1000 / avg);
        // Adaptive resolution: trade pixels for smoothness on weaker GPUs.
        if (avg > 26 && scale > 0.5) { scale = Math.max(0.5, scale * 0.8); resize(); }
        acc = 0;
        count = 0;
      }
      draw(now);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };

    if (reduce) {
      draw(start + 20000);
      window.addEventListener("resize", () => draw(start + 20000));
    } else {
      raf = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelAnimationFrame(raf);
      telemetry.active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="shader-backdrop" aria-hidden="true" />;
}
