import React from 'react';

export const GlassSurface: React.FC<React.HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'section' | 'article' }> = ({ as = 'div', className = '', children, ...props }) => {
  const Component = as;
  return <Component className={`glass-surface ${className}`.trim()} {...props}>{children}</Component>;
};

export const EmptyState: React.FC<{ title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, description, action, icon }) => (
  <div className="empty-state">
    {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);
