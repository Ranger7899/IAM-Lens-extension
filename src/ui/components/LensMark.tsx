import { useId } from 'react';

/** Brand mark: same artwork as the extension icon (scripts/brand/icon.svg): a lens holding a spectrum, key handle. */
export function LensMark({ size = 28 }: { size?: number }) {
  const gid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F86F6" />
          <stop offset="1" stopColor="#0B4FC4" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill={`url(#${gid})`} />
      <g transform="rotate(45 54 54)" fill="#fff">
        <rect x="86" y="48" width="38" height="13" rx="6.5" />
        <rect x="101" y="57" width="9" height="16" rx="3" />
        <rect x="114" y="57" width="9" height="11" rx="3" />
      </g>
      <circle cx="54" cy="54" r="33" fill="#0A2A66" stroke="#fff" strokeWidth="11" />
      <rect x="33" y="48" width="25" height="12" rx="6" fill="#5FD27F" />
      <rect x="60" y="48" width="14" height="12" rx="6" fill="#FFC21A" />
      <rect x="76" y="48" width="8" height="12" rx="4" fill="#FF6A5C" />
    </svg>
  );
}
