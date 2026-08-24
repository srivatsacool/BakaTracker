import { useState } from 'react';
import { useEffect } from 'react';

/**
 * Rail/assistant chrome state for the app shell.
 *
 * Extracted verbatim from Layout.tsx. Three layers compose into the rendered
 * collapsed states, in the same precedence as before:
 *
 * 1. PERSISTED — bt_sidebar_collapsed / bt_assistant_collapsed (desktop/mobile
 *    user preference; localStorage is the source of truth).
 * 2. TABLET AUTO-RULE — while (768–1179px) matches, the rail compresses to
 *    icons regardless of the persisted preference (never written back), and
 *    BakaSur renders as the orb whose open state is a transient overlay.
 * 3. EDITOR TRANSIENT OVERRIDE — on /notes/:pageId both rails auto-collapse so
 *    the canvas owns the viewport. The override resets on every route ENTRY
 *    via the render-phase adjustment below (React's "adjusting state when a
 *    prop changes" pattern — deliberately NOT an effect) and is never
 *    persisted; toggles flip it, leaving the route restores layer 1/2.
 */
export function useRailChrome(isEditorRoute: boolean) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bt_sidebar_collapsed') === 'true';
  });
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(() => {
    return localStorage.getItem('bt_assistant_collapsed') === 'true';
  });

  // Tablet tier (design gap #9): transient overlay-open flag for BakaSur;
  // never persisted.
  const [assistantOverlayOpen, setAssistantOverlayOpen] = useState(false);

  // Auto icon-rail (design spec gap #8): media-query snapshot + subscription.
  const [autoIconRail, setAutoIconRail] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1180px) and (min-width: 768px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1180px) and (min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setAutoIconRail(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Editor-route transient chrome: { rail: true } means "user re-expanded".
  const [editorChrome, setEditorChrome] = useState<{ rail: boolean; assistant: boolean }>(() => ({
    rail: false,
    assistant: false,
  }));
  const [wasEditorRoute, setWasEditorRoute] = useState(isEditorRoute);
  if (isEditorRoute !== wasEditorRoute) {
    setWasEditorRoute(isEditorRoute);
    if (isEditorRoute) {
      setEditorChrome({ rail: false, assistant: false });
    }
  }

  // Rendered width: the auto tablet rule wins while active; the persisted user
  // preference applies everywhere else. In the editor route the TRANSIENT
  // override replaces both.
  const railCollapsed = isEditorRoute ? !editorChrome.rail : (isCollapsed || autoIconRail);

  // Effective BakaSur collapsed state across the three tiers.
  const assistantCollapsedEffective = isEditorRoute
    ? !editorChrome.assistant
    : (autoIconRail ? !assistantOverlayOpen : isAssistantCollapsed);

  const toggleCollapse = () => {
    // Editor route: flip the transient override — never the persisted pref.
    if (isEditorRoute) {
      setEditorChrome(c => ({ ...c, rail: !c.rail }));
      return;
    }
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('bt_sidebar_collapsed', String(next));
  };

  const toggleAssistant = () => {
    // Editor route: flip the transient override — never the persisted pref.
    if (isEditorRoute) {
      setEditorChrome(c => ({ ...c, assistant: !c.assistant }));
      return;
    }
    // Tablet tier: opening/closing BakaSur flips the transient overlay
    // instead of the persisted desktop preference (which stays untouched).
    if (autoIconRail) {
      setAssistantOverlayOpen(open => !open);
      return;
    }
    const next = !isAssistantCollapsed;
    setIsAssistantCollapsed(next);
    localStorage.setItem('bt_assistant_collapsed', String(next));
  };

  return {
    railCollapsed,
    /** Raw persisted assistant preference — the shell frame class uses this. */
    isAssistantCollapsed,
    assistantCollapsedEffective,
    /** Tablet auto icon-rail media query currently matches. */
    autoIconRail,
    toggleCollapse,
    toggleAssistant,
  };
}
