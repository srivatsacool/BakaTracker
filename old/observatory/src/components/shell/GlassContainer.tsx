import React from 'react';
import { CabinetSurface } from './ArcadePrimitives';

/**
 * CabinetContainer — the shared arcade surface wrapper for feature pages.
 * Alias of CabinetSurface (playing state, paper marquee absent) so frozen
 * pages can keep using `GlassContainer` without visual regression to glass.
 */
export const GlassContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  interactive?: boolean;
}> = ({ children, className = '', as = 'div', interactive = false }) => (
  <CabinetSurface as={as} state={interactive ? 'playing' : 'off'} className={className}>
    {children}
  </CabinetSurface>
);

/** GlassSurface — legacy alias for CabinetSurface (no marquee). */
export const GlassSurface: React.FC<React.HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'section' | 'article' }> =
  ({ as = 'div', className = '', children, ...props }) => (
    <CabinetSurface as={as} state="off" className={className} {...props}>
      {children}
    </CabinetSurface>
  );
