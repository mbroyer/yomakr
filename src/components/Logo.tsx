/** Das Yomakr-Zeichen: ein Punkt, aus dem drei Striche ein Y bilden. Einfarbig, übernimmt die Textfarbe. */
export function Logo({ size = 40, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Yomakr"
      className={thinking ? "logo logo-thinking" : "logo"}
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    >
      <path d="M12.1 12.6 7.5 8M19.9 12.6 24.5 8M16 22v6.5" />
      <circle cx="16" cy="16.5" r="2.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
