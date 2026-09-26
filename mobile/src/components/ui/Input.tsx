import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { radius, size, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon, type IconName } from './Icon';
import { T } from './T';
import { Tappable } from './Tappable';

type Props = TextInputProps & {
  label?: string;
  /** accessible name when there is no visible label */
  a11yLabel?: string;
  icon?: IconName;
  onIconPress?: () => void;
  iconLabel?: string;
  leftIcon?: IconName;
  multiline?: boolean;
  /** text area look (grey50 fill, radius 16) */
  area?: boolean;
};

/**
 * Text field: label above, 48 h field, radius 8, a visible 1 px edge (2 px blue while typing), optional right icon.
 * `area` = multi-line text area (radius 16).
 */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, a11yLabel, icon, onIconPress, iconLabel, leftIcon, area, style, multiline, ...rest },
  ref,
) {
  const { c, t } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      {label ? <T v="label">{label}</T> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: area ? 'flex-start' : 'center',
          minHeight: area ? 110 : size.field,
          borderRadius: area ? radius.card : radius.field,
          // A visible edge (3:1) on every field, and a 2 px blue edge while typing.
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? c.focus : c.fieldBorder,
          backgroundColor: c.bg,
          paddingHorizontal: space.lg,
          paddingVertical: area ? space.md : 0,
          gap: space.sm,
        }}
      >
        {leftIcon ? <Icon name={leftIcon} size={20} color={c.textMuted} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? a11yLabel}
          placeholderTextColor={c.textMuted}
          multiline={multiline || area}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            t('body'),
            { flex: 1, color: c.text, paddingVertical: space.md, outlineStyle: 'none' as never, textAlignVertical: area ? 'top' : 'center' },
            style,
          ]}
          {...rest}
        />
        {icon ? (
          onIconPress ? (
            <Tappable label={iconLabel ?? 'Field action'} onPress={onIconPress} visualHeight={32} style={{ padding: 4 }}>
              <Icon name={icon} size={22} color={c.text} />
            </Tappable>
          ) : (
            <Icon name={icon} size={22} color={c.text} />
          )
        ) : null}
      </View>
    </View>
  );
});
