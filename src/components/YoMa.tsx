/** YoMa, das Maskottchen: ein kleiner Roboter. */
export function YoMa({ size = 48, mood = "happy" }: { size?: number; mood?: "happy" | "thinking" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="YoMa">
      <line x1="32" y1="6" x2="32" y2="14" stroke="#5b4cf0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="4" fill="#ffb648" />
      <rect x="10" y="14" width="44" height="36" rx="12" fill="#5b4cf0" />
      <rect x="16" y="21" width="32" height="20" rx="8" fill="#e9e6ff" />
      {mood === "happy" ? (
        <>
          <circle cx="25" cy="29" r="3.5" fill="#1d1a33" />
          <circle cx="39" cy="29" r="3.5" fill="#1d1a33" />
          <path d="M26 35 Q32 40 38 35" stroke="#1d1a33" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="21" y="28" width="8" height="3" rx="1.5" fill="#1d1a33" />
          <circle cx="39" cy="29" r="3.5" fill="#1d1a33" />
          <circle cx="32" cy="36" r="2" fill="#1d1a33" />
        </>
      )}
      <rect x="20" y="50" width="8" height="8" rx="3" fill="#5b4cf0" />
      <rect x="36" y="50" width="8" height="8" rx="3" fill="#5b4cf0" />
      <circle cx="10" cy="32" r="4" fill="#ffb648" />
      <circle cx="54" cy="32" r="4" fill="#ffb648" />
    </svg>
  );
}
