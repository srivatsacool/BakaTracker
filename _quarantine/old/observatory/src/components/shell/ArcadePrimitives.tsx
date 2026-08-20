import React from 'react';

/**
 * ObservatoryPrimitives — the shared surface atoms of The Night Observatory.
 *
 * GlassPane: the glass instrument panel (instrument header + frosted body).
 * States are named and patterned (OFF / ATTRACT / PLAYING / HIGH SCORE /
 * OUT OF ORDER), never color alone. `tone` sets the instrument LED + title
 * band color. `lit` renders the PLAYING aurora state.
 */
export const GlassPane: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    as?: 'div' | 'section' | 'article';
    state?: 'off' | 'attract' | 'playing' | 'highscore' | 'ooo';
    tone?: 'aurora' | 'coral' | 'cobalt' | 'rose' | 'teal' | 'amber' | 'paper';
    paneTitle?: string;
    led?: React.ReactNode;
  }
> = ({ as = 'div', state = 'playing', tone = 'paper', paneTitle, led, className = '', children, ...props }) => {
  const Component = as;
  const toneMap: Record<string, string> = {
    aurora: 'var(--obs-aurora)',
    coral: 'var(--obs-coral)',
    cobalt: 'var(--obs-cobalt)',
    rose: 'var(--obs-rose)',
    teal: 'var(--obs-teal)',
    amber: 'var(--obs-amber)',
    paper: 'var(--obs-paper-dim)',
  };
  const stateCls = state === 'off' ? 'cabinet--off'
    : state === 'attract' ? 'cabinet--attract'
    : state === 'highscore' ? 'cabinet--highscore'
    : state === 'ooo' ? 'cabinet--ooo'
    : 'cabinet--playing';

  return (
    <Component
      className={`cabinet ${stateCls} ${className}`.trim()}
      style={{ '--marquee-color': toneMap[tone] } as React.CSSProperties}
      {...props}
    >
      {paneTitle && (
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">{paneTitle}</span>
          {led}
        </div>
      )}
      <div className="cabinet-screen">{children}</div>
    </Component>
  );
};

/**
 * AttractState — the empty state: ATTRACT MODE, no observations yet.
 * Named + patterned so an empty surface reads as an instrument waiting,
 * never as a gray void.
 */
export const AttractState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="attract-state">
    {icon && <div className="attract-state-icon" aria-hidden="true">{icon}</div>}
    <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

/** EmptyState — legacy alias so the frozen pages' imports keep working. */
export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = (props) => <AttractState {...props} />;

/** CabinetSurface — legacy alias for the arcade-era name. */
export const CabinetSurface = GlassPane;
