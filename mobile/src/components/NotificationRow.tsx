import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { NOTIFICATION_LOOK, type Notification } from '../data/notifications';
import { useApp } from '../store/app';
import { radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Badge } from './ui/Badge';
import { Avatar, FaceCircle } from './ui/bits';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * One notification: the type's character (the same pictures as "Today with Alex") with the child's initial on its
 * corner, the tag + time, the title and one detail line. Unread = bold title + a "New" badge (never a colour-only
 * dot). Urgent items use the bell in amber from "Needs you". Tapping marks it read, then opens its screen.
 */
export function NotificationRow({ n, childName, divider }: { n: Notification; childName: string; divider?: boolean }) {
  const { c } = useTheme();
  const look = NOTIFICATION_LOOK[n.type];
  const open = () => {
    useApp.getState().markRead(n.id);
    router.push(n.href as Href);
  };
  const label = [!n.read ? 'New' : '', n.title, n.detail, n.when, n.opens].filter(Boolean).join('. ');

  return (
    <Tappable label={label} onPress={open}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: space.md,
          minHeight: size.touch + space.lg,
          paddingVertical: space.md,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: c.divider,
        }}
      >
        <View style={{ width: 48, height: 48 }}>
          {n.urgent ? (
            <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: c.warnTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={22} color={c.onWarnTint} />
            </View>
          ) : (
            <FaceCircle face={n.face ?? look.face!} tint={n.tint ?? look.tint} size={48} />
          )}
          {/* the child's initial, so every item names the child even when a family has more than one */}
          <View style={{ position: 'absolute', right: -4, bottom: -4, borderRadius: radius.pill, borderWidth: 2, borderColor: c.bg }}>
            <Avatar initials={childName.charAt(0).toUpperCase()} size={20} tone="brand" />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {/* the time stays top-right; if the tags don't fit (big text), they wrap under each other instead */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 }}>
              <Badge label={look.tag} tone={look.tone} />
              {!n.read ? <Badge label="New" tone="brand" /> : null}
            </View>
            <T v="caption" color="textMuted" style={{ marginTop: 4 }}>
              {n.when}
            </T>
          </View>
          <T v={n.read ? 'bodyLg' : 'section'} style={{ marginTop: space.xs }}>
            {n.title}
          </T>
          <T v="bodySm" color="textMuted" numberOfLines={2}>
            {n.detail}
          </T>
        </View>
        <View style={{ alignSelf: 'center' }}>
          <Icon name="chevron-right" size={20} color={c.textMuted} />
        </View>
      </View>
    </Tappable>
  );
}
