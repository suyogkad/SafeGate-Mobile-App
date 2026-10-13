/**
 * P26 Notifications (parent). All | Needs you | Sessions, with the items that need the
 * parent pinned above Today / Yesterday / Earlier.
 *
 * Built from the parent's own real data rather than a feed table, because there is no
 * notifications service yet and inventing one would show a parent things that never
 * happened. Three real things can be derived: safety alerts about their child, notes a
 * therapist shared, and sessions that were booked.
 *
 * An alert says what happened, never what the child wrote.
 */
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/bits';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { useChildAlerts, useFamilySessions, useMyChild } from '@/lib/family';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const ON = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const DAYS = ['Today', 'Yesterday', 'Earlier'] as const;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayOf(at: number): (typeof DAYS)[number] {
  const day = startOfDay(at);
  const today = startOfDay(Date.now());
  if (day === today) return 'Today';
  if (day === today - 86_400_000) return 'Yesterday';
  return 'Earlier';
}

type Item = {
  id: string;
  kind: 'alert' | 'notes' | 'booking';
  icon: IconName;
  title: string;
  detail: string;
  tag: string;
  tone: BadgeTone;
  at: number;
  needsYou: boolean;
  href: Href;
};

function Row({ item, divider }: { item: Item; divider: boolean }) {
  const { c } = useTheme();
  const warn = item.needsYou;
  return (
    <Tappable label={`${item.title}. ${item.detail}. ${item.tag}`} onPress={() => router.push(item.href)}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.md,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: c.divider,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: warn ? c.warnTint : c.surfaceTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={item.icon} size={20} color={warn ? c.onWarnTint : c.brand} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyLg">{item.title}</T>
          <T v="bodySm" color="textMuted">
            {item.detail}
          </T>
          <Badge label={item.tag} tone={item.tone} />
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </View>
    </Tappable>
  );
}

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title={title} />
      <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
        {items.map((item, i) => (
          <Row key={item.id} item={item} divider={i < items.length - 1} />
        ))}
      </Card>
    </View>
  );
}

export default function ParentNotifications() {
  const { c } = useTheme();
  const child = useMyChild();
  const name = child?.full_name || 'your child';
  const { alerts } = useChildAlerts(child?.id);
  const sessions = useFamilySessions();
  const [filter, setFilter] = useState<string>('All');

  const items: Item[] = [
    ...alerts.map((a): Item => ({
      id: `alert-${a.id}`,
      kind: 'alert',
      icon: 'alert-circle',
      title: `${name}’s app switched to calm steps`,
      detail: a.emergency_requested_at
        ? `You asked for emergency services`
        : a.acknowledged_at
          ? 'You’ve marked this as seen'
          : `${name} is seeing calm steps and phone numbers for help`,
      tag: a.acknowledged_at ? 'SEEN' : 'NEEDS YOU',
      tone: a.acknowledged_at ? 'neutral' : 'warn',
      at: new Date(a.timestamp).getTime(),
      needsYou: !a.acknowledged_at,
      href: `/parent/alert?id=${a.id}` as Href,
    })),
    ...sessions
      .filter((s) => s.notes_shared_at)
      .map((s): Item => ({
        id: `notes-${s.id}`,
        kind: 'notes',
        icon: 'file-text',
        title: `${s.therapist_name ?? 'Your therapist'} shared notes`,
        detail: `Session on ${ON.format(new Date(s.start_time))}`,
        tag: 'NOTES SHARED',
        tone: 'success',
        at: new Date(s.notes_shared_at!).getTime(),
        needsYou: false,
        href: `/parent/session-notes?id=${s.id}` as Href,
      })),
    ...sessions
      .filter((s) => s.status === 'booked')
      .map((s): Item => ({
        id: `booking-${s.id}`,
        kind: 'booking',
        icon: 'calendar',
        title: `Session booked with ${s.therapist_name ?? 'your therapist'}`,
        detail: `${ON.format(new Date(s.start_time))} · ${s.meeting_kind === 'video' ? 'Video call' : 'In person'}`,
        tag: 'BOOKED',
        tone: 'info',
        at: new Date(s.created_at).getTime(),
        needsYou: false,
        href: '/parent/sessions',
      })),
  ].sort((a, b) => b.at - a.at);

  const shown = items.filter((i) =>
    filter === 'Needs you' ? i.needsYou : filter === 'Sessions' ? i.kind !== 'alert' : true,
  );
  const pinned = shown.filter((i) => i.needsYou);
  const rest = shown.filter((i) => !i.needsYou);

  const empty =
    filter === 'Needs you'
      ? { title: 'Nothing needs you right now.', line: `We’ll tell you straight away if ${name} needs you.` }
      : filter === 'Sessions'
        ? { title: 'No session updates yet.', line: 'Bookings, reminders and notes from the therapist show here.' }
        : { title: 'You’re all caught up.', line: `We’ll tell you when something happens with ${name}.` };

  return (
    <Screen backdrop="brand" header={<Header title="Notifications" getHelp={false} fallback={'/parent/home' as Href} />}>
      <Segmented label="Show notifications" options={['All', 'Needs you', 'Sessions']} value={filter} onChange={setFilter} />
      <Stagger key={filter}>
        {pinned.length ? <Group title="Needs you" items={pinned} /> : null}
        {DAYS.map((day) => {
          const group = rest.filter((i) => dayOf(i.at) === day);
          return group.length ? <Group key={day} title={day} items={group} /> : null;
        })}
        {shown.length === 0 ? (
          <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={30} color={c.brand} />
            </View>
            <T v="heading" center>
              {empty.title}
            </T>
            <T v="body" color="textMuted" center>
              {empty.line}
            </T>
          </View>
        ) : null}
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <ListRow title="Choose what we tell you about" icon="bell" chevron onPress={() => router.push('/parent/account')} />
        </Card>
      </Stagger>
    </Screen>
  );
}
