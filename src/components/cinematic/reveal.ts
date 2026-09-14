import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined' && !(gsap as unknown as { __cineRegistered?: boolean }).__cineRegistered) {
  gsap.registerPlugin(ScrollTrigger);
  (gsap as unknown as { __cineRegistered?: boolean }).__cineRegistered = true;
}

/**
 * useCineReveal — one IntersectionObserver-free reveal pass per container.
 * Elements with [data-cine-reveal] gain .is-in on entry (once). Under
 * reduced motion the CSS shows everything and no triggers are created.
 */
export function useCineReveal<T extends HTMLElement>(reducedMotion: boolean) {
  const ref = React.useRef<T | null>(null);

  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-cine-reveal]').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => el.classList.add('is-in'),
        });
      });
    }, root);
    return () => ctx.revert();
  }, [reducedMotion]);

  return ref;
}
