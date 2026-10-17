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

export function EquipmentArt({
  category,
  name = '',
  large = false,
}: {
  category: string;
  name?: string;
  large?: boolean;
}) {
  const text = `${category} ${name}`.toLowerCase();
  const kind = /camera|photo|lens/.test(text)
    ? 'camera'
    : /audio|mic|sound|headphone/.test(text)
      ? 'audio'
      : /light|flash/.test(text)
        ? 'light'
        : /laptop|computer|tablet/.test(text)
          ? 'computer'
          : 'case';
  return (
    <div className={`equipment-art art-${kind}${large ? ' art-large' : ''}`} aria-hidden="true">
      <div className="art-grid" />
      <svg
        viewBox="0 0 240 160"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === 'camera' && (
          <>
            <path
              className="art-fill"
              d="M40 56h38l10-16h49l11 16h45a9 9 0 0 1 9 9v60a9 9 0 0 1-9 9H40a9 9 0 0 1-9-9V65a9 9 0 0 1 9-9Z"
            />
            <circle cx="125" cy="94" r="38" />
            <circle className="art-lens" cx="125" cy="94" r="28" />
            <circle cx="125" cy="94" r="16" />
            <path d="M46 70h22v11H46z M48 46h22v10 M175 70h11 M39 115h34" />
          </>
        )}
        {kind === 'audio' && (
          <>
            <rect className="art-fill" x="93" y="22" width="54" height="81" rx="27" />
            <path d="M80 72v10a40 40 0 0 0 80 0V72 M120 122v20 M95 142h50 M100 40h40 M96 50h48 M96 60h48 M96 70h48" />
            <path strokeOpacity=".35" d="M57 53v40 M44 64v18 M183 53v40 M196 64v18" />
          </>
        )}
        {kind === 'light' && (
          <>
            <path className="art-fill" d="m92 20 56 0 31 27v56l-31 27H92l-31-27V47z" />
            <path d="m97 34 46 0 22 21v40l-22 21H97L75 95V55z M120 130v14 M120 135l-26 16 M120 135l26 16 M88 44l64 62 M152 44l-64 62" />
          </>
        )}
        {kind === 'computer' && (
          <>
            <rect className="art-fill" x="50" y="30" width="140" height="92" rx="5" />
            <path d="M60 41h120v70H60z M50 122l-20 17h180l-20-17 M96 129h48 M105 150h30" />
            <path strokeOpacity=".3" d="m70 99 36-35 24 21 35-36" />
          </>
        )}
        {kind === 'case' && (
          <>
            <rect className="art-fill" x="38" y="50" width="164" height="87" rx="8" />
            <path d="M94 50V34h52v16 M38 87h164 M76 50v87 M164 50v87 M107 80h26v16h-26z M48 59h15 M178 126h14" />
          </>
        )}
      </svg>
      <span className="art-label">GEARFLOW / SHARED EQUIPMENT</span>
    </div>
  );
}
