// Order matters: scene.ts builds each city by the same name, and the weather
// request sends the coordinates in this order.
export const CITIES = [
  { name: "Chennai", country: "India", tz: "Asia/Kolkata", lat: 13.08, lon: 80.27 },
  { name: "Tokyo", country: "Japan", tz: "Asia/Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Amsterdam", country: "Netherlands", tz: "Europe/Amsterdam", lat: 52.37, lon: 4.9 },
  { name: "London", country: "United Kingdom", tz: "Europe/London", lat: 51.51, lon: -0.13 },
  { name: "Sydney", country: "Australia", tz: "Australia/Sydney", lat: -33.87, lon: 151.21 },
  { name: "Kuala Lumpur", country: "Malaysia", tz: "Asia/Kuala_Lumpur", lat: 3.14, lon: 101.69 },
  { name: "Auckland", country: "New Zealand", tz: "Pacific/Auckland", lat: -36.85, lon: 174.76 },
  { name: "Vienna", country: "Austria", tz: "Europe/Vienna", lat: 48.21, lon: 16.37 },
  { name: "Paris", country: "France", tz: "Europe/Paris", lat: 48.86, lon: 2.35 },
  { name: "New York", country: "United States", tz: "America/New_York", lat: 40.71, lon: -74.01 },
  { name: "Rio de Janeiro", country: "Brazil", tz: "America/Sao_Paulo", lat: -22.91, lon: -43.17 },
] as const;

export type CityName = (typeof CITIES)[number]["name"];
