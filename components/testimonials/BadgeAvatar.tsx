import { useId } from "react";

/**
 * Soft-shaded illustrated portraits used when a testimonial has no photo.
 * Transparent background, so the badge's pastel frame shows through.
 */
export function BadgeAvatar({ gender, className }: { gender: "male" | "female"; className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = (name: string) => `${id}-${name}`;
  const female = gender === "female";
  const skin = female ? ["#f6cfb3", "#e5a888", "#c98466"] : ["#e9b994", "#cf9672", "#a96e4e"];
  const hair = female ? ["#5b3a33", "#2f1d1a"] : ["#3a2c27", "#17110f"];
  const top = female ? ["#9d8cf8", "#6e58e6"] : ["#3fc7b4", "#1f8f86"];

  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={g("skin")} cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor={skin[0]} />
          <stop offset="68%" stopColor={skin[1]} />
          <stop offset="100%" stopColor={skin[2]} />
        </radialGradient>
        <linearGradient id={g("neck")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin[2]} />
          <stop offset="100%" stopColor={skin[1]} />
        </linearGradient>
        <linearGradient id={g("hair")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={hair[0]} />
          <stop offset="100%" stopColor={hair[1]} />
        </linearGradient>
        <radialGradient id={g("top")} cx="40%" cy="20%" r="90%">
          <stop offset="0%" stopColor={top[0]} />
          <stop offset="100%" stopColor={top[1]} />
        </radialGradient>
        <radialGradient id={g("shine")} cx="35%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {female && <path d="M50 96C46 52 74 28 100 28s54 24 50 68c3 28 9 46 2 66H48c-7-20-1-38 2-66Z" fill={`url(#${g("hair")})`} />}

      <path d="M26 200c2-34 30-54 74-54s72 20 74 54Z" fill={`url(#${g("top")})`} />
      <path d={female ? "M76 150c6 12 16 18 24 18s18-6 24-18" : "M78 148c4 10 12 16 22 16s18-6 22-16"} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
      <path d="M85 124h30l3 30c-8 9-28 9-36 0Z" fill={`url(#${g("neck")})`} />

      <ellipse cx="63" cy="104" rx="8" ry="11" fill={skin[1]} />
      <ellipse cx="137" cy="104" rx="8" ry="11" fill={skin[1]} />
      <ellipse cx="100" cy="98" rx={female ? 37 : 38} ry={female ? 43 : 44} fill={`url(#${g("skin")})`} />
      <ellipse cx="86" cy="80" rx="22" ry="18" fill={`url(#${g("shine")})`} />

      {female ? (
        <>
          <path d="M60 98c-6-38 16-58 42-58 28 0 46 20 40 56-6-18-20-30-40-34-10 14-26 26-42 36Z" fill={`url(#${g("hair")})`} />
          <circle cx="63" cy="118" r="3.2" fill="#f2c14e" />
          <circle cx="137" cy="118" r="3.2" fill="#f2c14e" />
        </>
      ) : (
        <path d="M62 96c-8-40 12-60 40-60 30 0 46 22 38 58-4-14-10-22-18-26-12 6-34 8-46 2-8 6-12 16-14 26Z" fill={`url(#${g("hair")})`} />
      )}

      <path d={female ? "M78 92q8-5 16-1M106 91q8-4 16 1" : "M77 91q9-5 17-1M106 90q9-4 17 1"} fill="none" stroke={hair[1]} strokeWidth={female ? 2.6 : 3.6} strokeLinecap="round" />
      <ellipse cx="86" cy="104" rx="4.2" ry="5.2" fill="#24191a" />
      <ellipse cx="114" cy="104" rx="4.2" ry="5.2" fill="#24191a" />
      <circle cx="87.6" cy="102.2" r="1.5" fill="#fff" />
      <circle cx="115.6" cy="102.2" r="1.5" fill="#fff" />
      <path d="M100 106q-4 9 1 12" fill="none" stroke={skin[2]} strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".7" />
      <ellipse cx="79" cy="117" rx="7" ry="4" fill="#ff8f7e" opacity=".3" />
      <ellipse cx="121" cy="117" rx="7" ry="4" fill="#ff8f7e" opacity=".3" />
      <path d="M91 124q9 8 18 0" fill={female ? "#c4564c" : "none"} stroke={female ? "#b2453d" : "#8a4a3a"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
