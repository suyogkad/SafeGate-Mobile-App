import { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePathname } from 'expo-router';
import { useApp } from '../store/app';
import { motion } from '../theme/tokens';

export type Audience = 'child' | 'parent';

const AudienceContext = createContext<Audience | null>(null);

/** Render a subtree as one side regardless of the route (e.g. the parent's live preview of the child's text). */
export const AudienceProvider = AudienceContext.Provider;

/** Which side of the app a route belongs to. */
export function useAudience(): Audience {
  const forced = useContext(AudienceContext);
  const path = usePathname();
  // The therapist area is a grown-up side too, so it gets the parent's motion tier and text.
  return forced ?? (path.startsWith('/parent') || path.startsWith('/therapist') ? 'parent' : 'child');
}

let reduceMotionCache = false;

export function useReduceMotion() {
  const [reduce, setReduce] = useState(reduceMotionCache);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        reduceMotionCache = v;
        if (alive) setReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      reduceMotionCache = v;
      setReduce(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Tiered motion (product rule 10):
 * - OS reduce-motion: everything off.
 * - Child: one short fade; more only when the child turns Movement on.
 * - Parent: fuller fades.
 */
export function useMotion() {
  const reduce = useReduceMotion();
  const audience = useAudience();
  const movement = useApp((s) => s.comfort.movement);
  const child = audience === 'child';
  if (reduce) return { enabled: false, fade: 0, rich: false, child } as const;
  if (child) return { enabled: true, fade: motion.childFade, rich: movement, child } as const;
  return { enabled: true, fade: motion.parentFade, rich: true, child } as const;
}
