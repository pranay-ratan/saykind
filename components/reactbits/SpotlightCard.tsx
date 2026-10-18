'use client';

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/use-presence';

/*
 * Spotlight Card, in the pattern of the React Bits component of that name (David Haz, reactbits.dev): a soft light
 * follows the pointer across the card. Written for this app, not copied from the package. Reduced motion gets no
 * moving light; the card is simply a soft card.
 */
interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  spotlightColor?: string;
}

const BASE: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '2rem',
  border: '1px solid rgba(45, 30, 47, 0.06)',
  background: 'var(--cream)',
  boxShadow: '0 12px 32px -8px rgba(45, 30, 47, 0.05)',
  padding: '1.25rem',
};

export default function SpotlightCard({ children, className, style, spotlightColor = 'rgba(191, 165, 212, 0.25)' }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || reduced) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    node.style.setProperty('--spot-o', '1');
  };
  const leave = () => ref.current?.style.setProperty('--spot-o', '0');

  return (
    <div ref={ref} className={className} style={{ ...BASE, ...style }} onPointerMove={move} onPointerLeave={leave}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 'var(--spot-o, 0)' as unknown as number,
          transition: 'opacity 300ms ease',
          background: `radial-gradient(circle 220px at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 80%)`,
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
