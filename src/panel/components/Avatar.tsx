import type { Member } from '../../core/types';

export function Avatar({ m, size = 40, speaking = false }: { m: Pick<Member, 'name' | 'colour' | 'isSelf'>; size?: number; speaking?: boolean }) {
  return (
    <span className={`avatar${speaking ? ' speaking' : ''}`} style={{ '--c': m.colour, width: size, height: size, fontSize: size * 0.42 } as React.CSSProperties} aria-hidden="true">
      {m.isSelf ? 'You'.slice(0, 1) : m.name.slice(0, 1)}
    </span>
  );
}
