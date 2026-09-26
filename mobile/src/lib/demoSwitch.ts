import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../store/app';

/**
 * DEMO ONLY — presenter shortcuts for the investor demo (web), so the story can jump between the child's and the
 * parent's side without a reload (a reload resets the in-memory demo). Nothing is shown on screen.
 *   Alt+P → parent Home (signs the parent in)
 *   Alt+C → child side: calm mode if it's still running, otherwise child Home
 *   Alt+T → therapist Today (signs Priya in)
 * TODO(safegate): not part of the product. Remove for any real build.
 */
export function useDemoSwitch() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      const s = useApp.getState();
      if (key === 'p' || e.code === 'KeyP') {
        e.preventDefault();
        s.signInParent();
        router.replace('/parent/home');
      } else if (key === 't' || e.code === 'KeyT') {
        e.preventDefault();
        s.signInTherapist();
        router.replace('/therapist/today');
      } else if (key === 'c' || e.code === 'KeyC') {
        e.preventDefault();
        s.linkChild();
        router.replace(s.calmMode !== 'off' && !s.afterCalm ? '/calm-mode' : '/home');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
