import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { fonts, radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from './T';

/**
 * Six single-character boxes (C04 Link my phone), styled as text fields (radius 8, grey100 border, blue focus).
 * One real input sits under the boxes, so typing auto-advances, paste works and screen readers hear one field.
 * Uppercase letters and numbers only.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  label,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  label: string;
  onSubmit?: () => void;
}) {
  const { c, t } = useTheme();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const chars = value.split('');
  const active = Math.min(value.length, length - 1);

  return (
    // The wrapper only makes the boxes tappable; the TextInput inside is the labelled, focusable control.
    <Pressable onPress={() => ref.current?.focus()} accessible={false} tabIndex={-1}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {Array.from({ length }, (_, i) => {
          const on = focused && i === active;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 60,
                maxWidth: 56,
                borderRadius: radius.field,
                borderWidth: on ? 2 : 1,
                borderColor: on ? c.focus : chars[i] ? c.textSecondary : c.fieldBorder,
                backgroundColor: c.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T v="title" allowFontScaling={false} style={{ fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 }}>
                {chars[i] ?? ''}
              </T>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        value={value}
        onChangeText={(v) => onChange(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={length}
        caretHidden
        style={[
          t('body'),
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent', outlineStyle: 'none' as never },
        ]}
      />
    </Pressable>
  );
}
