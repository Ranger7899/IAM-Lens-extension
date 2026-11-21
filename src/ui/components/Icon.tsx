import type { CSSProperties } from 'react';

export interface IconProps {
  /** Material Symbols ligature name, e.g. "search" */
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 24, filled = false, className }: IconProps) {
  const style: CSSProperties = {
    fontSize: size,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
  };
  return (
    <span className={`material-symbols-outlined ${className ?? ''}`} style={style} aria-hidden="true">
      {name}
    </span>
  );
}
