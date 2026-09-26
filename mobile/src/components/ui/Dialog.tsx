import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { gutter, radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from './T';
import { useMotion } from '../../lib/motion';

/**
 * Dialog: a confirmation-style card (radius 24, white) over a scrim.
 */
export function Dialog({
  visible,
  onClose,
  title,
  children,
  art,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  art?: ReactNode;
}) {
  const { c } = useTheme();
  const motion = useMotion();
  return (
    <Modal visible={visible} transparent animationType={motion.enabled ? 'fade' : 'none'} onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'center', padding: gutter }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim }}
        />
        <View
          accessibilityViewIsModal
          style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.xl, gap: space.lg, maxWidth: 480, width: '100%', alignSelf: 'center' }}
        >
          {art ? <View style={{ alignItems: 'center' }}>{art}</View> : null}
          <T v="title" center header>
            {title}
          </T>
          {children}
        </View>
      </View>
    </Modal>
  );
}
