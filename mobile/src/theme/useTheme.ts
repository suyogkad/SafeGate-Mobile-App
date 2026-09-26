import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { useApp } from '../store/app';
import { useAudience } from '../lib/motion';
import { CHILD_MIN_FONT, colors, strongColors, textScale, type, type TypeName } from './tokens';

export type Colors = { [K in keyof typeof colors]: string };

/**
 * Colours and type that follow the child's Comfort settings.
 * Child screens: text size, stronger colours and letter spacing apply. Parent screens: design as drawn.
 */
export function useTheme() {
  const audience = useAudience();
  const textSize = useApp((s) => s.comfort.textSize);
  const strong = useApp((s) => s.comfort.strongerColours);
  const spacing = useApp((s) => s.comfort.letterSpacing);
  const child = audience === 'child';

  return useMemo(() => {
    const c: Colors = child && strong ? { ...colors, ...strongColors } : { ...colors };
    const scale = child ? textScale[textSize] : 1;
    const t = (name: TypeName): TextStyle => {
      const base = type[name];
      let fontSize = Math.round(base.fontSize * scale);
      if (child) fontSize = Math.max(fontSize, CHILD_MIN_FONT);
      let lineHeight = Math.round(base.lineHeight * (fontSize / base.fontSize));
      let letterSpacing = 0;
      if (child && spacing) {
        letterSpacing = +(fontSize * 0.12).toFixed(1);
        lineHeight = Math.max(lineHeight, Math.round(fontSize * 1.6));
      }
      return { fontFamily: base.fontFamily, fontSize, lineHeight, letterSpacing };
    };
    return { c, t, child, audience };
  }, [child, strong, textSize, spacing, audience]);
}
