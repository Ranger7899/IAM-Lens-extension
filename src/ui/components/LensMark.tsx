import { useId } from 'react';

/** Brand mark: same artwork as the extension icon (scripts/brand/icon.svg): a shield with a magnifier cut out of it. */
export function LensMark({ size = 28 }: { size?: number }) {
  const mid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true" focusable="false">
      <defs>
        <mask id={mid} maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
          <rect width="128" height="128" fill="#fff" />
          <circle cx="60" cy="55" r="15" fill="none" stroke="#000" strokeWidth="8" />
          <path d="M71 66 86 81" fill="none" stroke="#000" strokeWidth="9" strokeLinecap="round" />
        </mask>
      </defs>
      <path
        d="M64 18 102 29.5V58C102 81 87 98 64 110 41 98 26 81 26 58V29.5Z"
        fill="#3f6ddb"
        stroke="#3f6ddb"
        strokeWidth="4"
        strokeLinejoin="round"
        mask={`url(#${mid})`}
      />
    </svg>
  );
}
