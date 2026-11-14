import type { Member } from '../../core/types';

/** A cricket ball in the member's colour, seam and initial. Decorative: the name is always shown next to it. */
export function Avatar({ m, size = 40, speaking = false }: { m: Pick<Member, 'name' | 'colour' | 'isSelf'>; size?: number; speaking?: boolean }) {
  return (
    <span className={`avatar${speaking ? ' speaking' : ''}`} style={{ '--c': m.colour, '--size': `${size}px` } as React.CSSProperties} aria-hidden="true">
      <span>{m.isSelf ? 'Y' : m.name.slice(0, 1)}</span>
    </span>
  );
}
