/** Flache, einfarbige Icons (Strich, übernehmen die Textfarbe). */
const PATHS = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  book: (
    <>
      <path d="M2.5 5H9a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2.5z" />
      <path d="M21.5 5H15a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7.5z" />
    </>
  ),
  code: <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />,
  blocks: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  send: <path d="M12 19V5M5 12l7-7 7 7" />,
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  backspace: <path d="M21 5H9l-6 7 6 7h12zM12 9l6 6M18 9l-6 6" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="M7 4.5v15L19 12z" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      {PATHS[name]}
    </svg>
  );
}
