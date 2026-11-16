"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Shuffle, Sun, type LucideIcon } from "lucide-react";
import { CITIES } from "./cities";
import type { Diorama } from "./scene";

interface Weather {
  temp: number;
  code: number;
  isDay: boolean;
}

const SWITCH_EVERY = 12000;
const TOKYO_SPLINE = "https://my.spline.design/untitled-YrnitOYwQG02N7D6wEpWDM5q/";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${CITIES.map((c) => c.lat)}&longitude=${CITIES.map((c) => c.lon)}` +
  "&current=temperature_2m,weather_code,is_day";

// WMO weather codes, as returned by Open-Meteo.
function describeWeather(code: number, isDay: boolean): { label: string; icon: LucideIcon; cloudy: boolean } {
  if (code <= 1) return { label: code ? "Mostly clear" : "Clear", icon: isDay ? Sun : Moon, cloudy: false };
  if (code === 2) return { label: "Partly cloudy", icon: isDay ? CloudSun : Cloud, cloudy: true };
  if (code === 3) return { label: "Overcast", icon: Cloud, cloudy: true };
  if (code <= 48) return { label: "Fog", icon: CloudFog, cloudy: true };
  if (code <= 57) return { label: "Drizzle", icon: CloudDrizzle, cloudy: true };
  if (code <= 67) return { label: "Rain", icon: CloudRain, cloudy: true };
  if (code <= 77) return { label: "Snow", icon: CloudSnow, cloudy: true };
  if (code <= 82) return { label: "Showers", icon: CloudRain, cloudy: true };
  if (code <= 86) return { label: "Snow showers", icon: CloudSnow, cloudy: true };
  return { label: "Thunderstorm", icon: CloudLightning, cloudy: true };
}

const hourIn = (timeZone: string, now: number) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));

const otherCity = (current?: number) => {
  let i = Math.floor(Math.random() * CITIES.length);
  if (i === current) i = (i + 1) % CITIES.length;
  return i;
};

export function CityDiorama() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Diorama | null>(null);
  // `now` is captured when the city changes so rendering stays pure.
  const [view, setView] = useState<{ city: number; now: number } | null>(null);
  const [weather, setWeather] = useState<(Weather | undefined)[]>([]);

  const shuffle = () => setView((v) => ({ city: otherCity(v?.city), now: Date.now() }));

  useEffect(() => {
    const wrapEl = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrapEl || !canvas) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: Diorama | null = null;
    let gone = false;
    let onScreen = true;

    // One request covers every city. The response is checked field by field;
    // if it fails the overlay simply shows the date and time without weather.
    fetch(WEATHER_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: unknown) => {
        if (gone || !Array.isArray(data)) return;
        setWeather(
          data.map((entry) => {
            const cur = (entry as { current?: Record<string, unknown> } | null)?.current;
            return typeof cur?.temperature_2m === "number" && typeof cur.weather_code === "number"
              ? { temp: cur.temperature_2m, code: cur.weather_code, isDay: cur.is_day !== 0 }
              : undefined;
          }),
        );
      })
      .catch(() => {});

    // three.js is loaded on demand so it stays out of the first page load.
    import("./scene").then(({ createDiorama }) => {
      if (gone) return;
      try {
        scene = createDiorama(canvas, still);
        scene.resize();
        if (onScreen) scene.start();
      } catch {
        // No WebGL: the city name, date and weather still show.
      }
      sceneRef.current = scene;
      shuffle();
    });

    const timer = still ? 0 : window.setInterval(shuffle, SWITCH_EVERY);
    const sizeWatch = new ResizeObserver(() => scene?.resize());
    sizeWatch.observe(wrapEl);
    const viewWatch = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) scene?.start();
      else scene?.stop();
    });
    viewWatch.observe(wrapEl);
    const onMove = (e: PointerEvent) => {
      const r = wrapEl.getBoundingClientRect();
      scene?.setPointer(Math.min(1, Math.max(-1, ((e.clientX - r.left) / r.width) * 2 - 1)));
    };
    const onLeave = () => scene?.setPointer(0);
    wrapEl.addEventListener("pointermove", onMove);
    wrapEl.addEventListener("pointerleave", onLeave);

    return () => {
      gone = true;
      window.clearInterval(timer);
      sizeWatch.disconnect();
      viewWatch.disconnect();
      wrapEl.removeEventListener("pointermove", onMove);
      wrapEl.removeEventListener("pointerleave", onLeave);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const city = view ? CITIES[view.city] : null;
  const current = view ? weather[view.city] : undefined;
  // Prefer the weather service's day/night flag; fall back to the local clock.
  const night = city && view ? (current ? !current.isDay : hourIn(city.tz, view.now) < 6 || hourIn(city.tz, view.now) >= 18) : false;
  const sky = current ? describeWeather(current.code, current.isDay) : null;

  useEffect(() => {
    if (view) sceneRef.current?.show(view.city, night, sky?.cloudy ?? false);
  }, [view, night, sky?.cloudy]);

  const Icon = sky?.icon ?? (night ? Moon : Sun);
  return (
    <div ref={wrapRef} className={`city-diorama${night ? " night" : ""}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {/* Tokyo uses the detailed Spline build; the other cities are drawn by scene.ts. */}
      {city?.name === "Tokyo" && (
        <iframe className="city-spline" src={TOKYO_SPLINE} title="Detailed 3D diorama of Tokyo" loading="lazy" />
      )}
      {city && view && (
        <div className="city-info" key={view.city}>
          <p className="city-name">{city.name}</p>
          <p className="city-country">{city.country}</p>
          <Icon aria-hidden="true" />
          <p className="city-date">
            {new Intl.DateTimeFormat("en-US", { timeZone: city.tz, month: "long", day: "numeric", year: "numeric" }).format(view.now)}
            {" · "}
            {new Intl.DateTimeFormat("en-US", { timeZone: city.tz, hour: "numeric", minute: "2-digit" }).format(view.now)}
          </p>
          {current && sky && (
            <p className="city-temp">
              {Math.round(current.temp)}°C <span>{sky.label}</span>
            </p>
          )}
        </div>
      )}
      <button type="button" className="city-shuffle" onClick={shuffle} aria-label="Show another city">
        <Shuffle aria-hidden="true" />
      </button>
    </div>
  );
}
