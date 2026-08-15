import React from 'react';

/**
 * GlassContainer — the shared dark-glass surface wrapper for feature pages.
 *
 * Wraps page content in a frosted glass panel with the standard surface
 * treatment (blur, border, radius, glow). Prefer this over raw `neo-card`
 * in new code; legacy pages are migrated onto it via the compat layer.
 */
export const GlassContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  interactive?: boolean;
}> = ({ children, className = '', as = 'div', interactive = false }) => {
  const Component = as;
  const classes = `glass-card ${interactive ? 'neo-card-interactive' : ''} ${className}`.trim();
  return <Component className={classes}>{children}</Component>;
};
