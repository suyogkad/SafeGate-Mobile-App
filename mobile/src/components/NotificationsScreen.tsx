import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { FACES } from '../data/faces';
import { SESSION_TYPES, type Notification, type NotificationAudience, type NotificationDay } from '../data/notifications';
import { CLIENTS, type ClientId } from '../data/practice';
import { isOpenUrgent, useApp, useChildName } from '../store/app';
import { artTints, space } from '../theme/tokens';
import { Header } from './Header';
import { NotificationRow } from './NotificationRow';
import { Screen } from './Screen';
import { Stagger } from './ui/Appear';
import { FaceCircle, SectionHeader } from './ui/bits';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ListRow } from './ui/ListRow';
import { Segmented } from './ui/Segmented';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { useTheme } from '../theme/useTheme';

const DAYS: { day: NotificationDay; title: string }[] = [
  { day: 'today', title: 'Today' },
  { day: 'yesterday', title: 'Yesterday' },
  { day: 'earlier', title: 'Earlier' },
];

/** The words that differ between the parent's list and the therapist's; the screen itself is the same. */
const COPY = {
  parent: {
    urgent: 'Needs you',
    home: '/parent/home',
    settings: '/parent/account',
    urgentEmpty: (name: string) => ({ title: 'Nothing needs you right now.', line: `We’ll tell you straight away if ${name} needs you.` }),
    sessionsEmpty: { title: 'No session updates yet.', line: 'Bookings, reminders and notes from the therapist show here.' },
    allEmpty: (name: string) => ({ title: 'You’re all caught up.', line: `We’ll tell you when something happens with ${name}.` }),
  },
  therapist: {
    urgent: 'Needs attention',
    home: '/therapist/today',
    settings: '/therapist/account',
    urgentEmpty: () => ({ title: 'Nothing needs you right now.', line: 'Calm-step alerts from your clients show here straight away.' }),
    sessionsEmpty: { title: 'No session updates yet.', line: 'New bookings and notes to write show here.' },
    allEmpty: () => ({ title: 'You’re all caught up.', line: 'We’ll tell you when a family books or shares something.' }),
  },
} as const;

/** On the therapist's side each item shows the child's own character (how the child is recognised), not type art. */
const withClientArt = (n: Notification): Notification => {
  const cl = CLIENTS[n.childId as ClientId];
  return n.audience === 'therapist' && cl ? { ...n, face: cl.face, tint: cl.tint } : n;
};

function Group({ title, items, nameOf }: { title: string; items: Notification[]; nameOf: (n: Notification) => string }) {
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title={title} />
      <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
        {items.map((n, i) => (
          <NotificationRow key={n.id} n={withClientArt(n)} childName={nameOf(n)} divider={i < items.length - 1} />
        ))}
      </Card>
    </View>
  );
}

/**
 * P26 / T10 Notifications. Everything that happened in one list: a segmented All | Needs you | Sessions, urgent items
 * pinned at the top until they're dealt with, then Today / Yesterday / Earlier. Opening the screen doesn't clear the
 * count; tapping an item or "Mark all read" does. The footer row leads to Account → what we tell you about.
 */
export function NotificationsScreen({ audience }: { audience: NotificationAudience }) {
  const { c } = useTheme();
  const childName = useChildName();
  const copy = COPY[audience];
  const filters = ['All', copy.urgent, 'Sessions'] as const;
  const [filter, setFilter] = useState<string>('All');
  const all = useApp((s) => s.notifications).filter((n) => n.audience === audience);

  // Alex's name comes from the store (the parent may have changed it); other clients from the practice data.
  const nameOf = (n: Notification) => (n.childId === 'alex' ? childName : (CLIENTS[n.childId as ClientId]?.name ?? childName));

  const shown = all.filter((n) => (filter === copy.urgent ? n.urgent : filter === 'Sessions' ? SESSION_TYPES.includes(n.type) : true));
  const pinned = shown.filter(isOpenUrgent);
  const rest = shown.filter((n) => !isOpenUrgent(n));
  const anyUnread = all.some((n) => !n.read);
  const empty = filter === copy.urgent ? copy.urgentEmpty(childName) : filter === 'Sessions' ? copy.sessionsEmpty : copy.allEmpty(childName);

  return (
    <Screen
      backdrop="brand"
      header={
        <Header
          title="Notifications"
          getHelp={false}
          fallback={copy.home as Href}
          right={anyUnread ? <Button title="Mark all read" variant="text" onPress={() => useApp.getState().markAllRead(audience)} /> : undefined}
        />
      }
    >
      <Segmented label="Show notifications" options={filters} value={filter} onChange={setFilter} />
      <Stagger key={filter}>
        {pinned.length ? <Group title={copy.urgent} items={pinned} nameOf={nameOf} /> : null}
        {DAYS.map(({ day, title }) => {
          const items = rest.filter((n) => n.day === day);
          return items.length ? <Group key={day} title={title} items={items} nameOf={nameOf} /> : null;
        })}
        {shown.length === 0 ? (
          <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
            {audience === 'parent' ? (
              <FaceCircle face={FACES.smileFlower} tint={artTints.green} />
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={30} color={c.brand} />
              </View>
            )}
            <T v="heading" center>
              {empty.title}
            </T>
            <T v="body" color="textMuted" center>
              {empty.line}
            </T>
          </View>
        ) : null}
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <ListRow title="Choose what we tell you about" icon="bell" chevron onPress={() => router.push(copy.settings as Href)} />
        </Card>
      </Stagger>
    </Screen>
  );
}
