import type { CSSProperties } from 'react';

const paths = {
  equipment: 'M4 7h16v13H4z M8 7V4h8v3 M4 12h16 M9 12v3h6v-3',
  calendar: 'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14 M8 14h2 M14 14h2',
  requests: 'M7 3h10v18H7z M10 7h4 M10 11h4 M10 15h2 M4 7H2v10h2 M20 7h2v10h-2',
  loans: 'M3 7h15 M14 3l4 4-4 4 M21 17H6 M10 13l-4 4 4 4',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9',
  categories: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  search: 'M21 21l-5-5 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  back: 'M20 12H4 M10 6l-6 6 6 6',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12 M6 18L18 6',
  plus: 'M12 5v14 M5 12h14',
  edit: 'M15 4l5 5 M4 20l5-1L21 7l-4-4L5 15z',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  maintenance: 'M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-3 3-4-4z',
  logout: 'M9 3H4v18h5 M9 12h12 M17 8l4 4-4 4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  refresh: 'M20 7V2l-3 3a8 8 0 1 0 3 11 M20 7h-5',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 11v6 M12 7h.01',
  lock: 'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
  moon: 'M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
