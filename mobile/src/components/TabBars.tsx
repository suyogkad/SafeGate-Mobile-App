import { router, usePathname, type Href } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, shadow, size, space } from '../theme/tokens';

/** Diameter of the raised centre button (Talk / Book), bigger than the other tab icons. */
const RAISED = 64;
import { useUnreadCount } from '../store/app';
import { useTheme } from '../theme/useTheme';
import { CountBadge } from './ui/CountBadge';
import { Icon, type IconName } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/** expo-router 57 vendors its own bottom tabs, so we type only what we use. */
export type TabBarProps = { navigation: { navigate: (name: string) => void } };

type Item = {
  label: string;
  icon: IconName;
  /** tab route name inside the navigator */
  tab?: string;
  /** full-screen route pushed on top instead of switching tabs */
  push?: Href;
  path?: string;
  kind?: 'raised' | 'help';
  /** unread count on the icon (parent Home only; never in the child app) */
  badge?: number;
};

function TabBar({ items, navigation }: { items: Item[]; navigation: TabBarProps['navigation'] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: c.bg,
        borderTopWidth: 1,
        borderTopColor: c.divider,
        paddingBottom: insets.bottom,
      }}
    >
      {items.map((it) => {
        const active = !!it.path && path === it.path;
        const onPress = () => (it.push ? router.push(it.push) : navigation.navigate(it.tab!));
        // Tab bar: 56 h, 24 px icon over a 12 px label, blue when active.
        // SafeGate: the centre item is a big raised blue circle; Get help sits in the amber help tint.
        const raised = it.kind === 'raised';
        const help = it.kind === 'help';
        const fg = help ? c.onHelpTint : raised || active ? c.primary : c.textMuted;
        const chip = raised ? c.primary : help ? c.helpTint : 'transparent';
        return (
          <Tappable
            key={it.label}
            label={it.badge ? `${it.label}, ${it.badge} new` : it.label}
            role={it.push ? 'button' : 'tab'}
            selected={active}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: size.tabBar + 8, gap: 2 }}
          >
            {raised ? (
              // The centre action (Talk / Book) is a bigger filled circle that rises above the bar, with a white ring
              // so it separates from whatever scrolls underneath.
              <View
                style={{
                  width: RAISED,
                  height: RAISED,
                  marginTop: -RAISED / 2 + 4,
                  borderRadius: radius.pill,
                  backgroundColor: c.primary,
                  borderWidth: 4,
                  borderColor: c.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadow.raised,
                }}
              >
                <Icon name={it.icon} size={28} color={c.onPrimary} />
              </View>
            ) : (
              <View style={{ height: 30, minWidth: 44, borderRadius: radius.pill, backgroundColor: chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm }}>
                <Icon name={it.icon} size={24} color={fg} />
                {it.badge ? <CountBadge count={it.badge} ring={c.bg} /> : null}
              </View>
            )}
            <T
              v="caption"
              tint={fg}
              allowFontScaling={false}
              style={{ fontSize: 12, lineHeight: 14, fontFamily: active || raised || help ? fonts.medium : fonts.regular }}
            >
              {it.label}
            </T>
          </Tappable>
        );
      })}
    </View>
  );
}

/** Home · Explore · Talk (raised, full screen) · Get help (amber, full screen) · You */
export function ChildTabBar({ navigation }: TabBarProps) {
  return (
    <TabBar
      navigation={navigation}
      items={[
        { label: 'Home', icon: 'home', tab: 'home', path: '/home' },
        { label: 'Explore', icon: 'compass', tab: 'explore', path: '/explore' },
        { label: 'Talk', icon: 'message-circle', push: '/talk', kind: 'raised' },
        { label: 'Get help', icon: 'life-buoy', push: '/get-help', kind: 'help' },
        { label: 'You', icon: 'user', tab: 'you', path: '/you' },
      ]}
    />
  );
}

/** Home (with the unread count) · Sessions · Book (+, raised → Find a therapist) · Insights · Account */
export function ParentTabBar({ navigation }: TabBarProps) {
  const unread = useUnreadCount();
  return (
    <TabBar
      navigation={navigation}
      items={[
        { label: 'Home', icon: 'home', tab: 'home', path: '/parent/home', badge: unread },
        { label: 'Sessions', icon: 'calendar', tab: 'sessions', path: '/parent/sessions' },
        { label: 'Book', icon: 'plus', push: '/parent/find-therapist', kind: 'raised' },
        { label: 'Insights', icon: 'bar-chart-2', tab: 'insights', path: '/parent/insights' },
        { label: 'Account', icon: 'user', tab: 'account', path: '/parent/account' },
      ]}
    />
  );
}

/** Today (with the unread count) · Calendar · Add time (+, raised → Add a time) · Clients · Account */
export function TherapistTabBar({ navigation }: TabBarProps) {
  const unread = useUnreadCount('therapist');
  return (
    <TabBar
      navigation={navigation}
      items={[
        { label: 'Today', icon: 'home', tab: 'today', path: '/therapist/today', badge: unread },
        { label: 'Calendar', icon: 'calendar', tab: 'calendar', path: '/therapist/calendar' },
        { label: 'Add time', icon: 'plus', push: '/therapist/slot', kind: 'raised' },
        { label: 'Clients', icon: 'users', tab: 'clients', path: '/therapist/clients' },
        { label: 'Account', icon: 'user', tab: 'account', path: '/therapist/account' },
      ]}
    />
  );
}
