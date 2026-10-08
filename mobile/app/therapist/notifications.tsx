/**
 * T10 Notifications (therapist). Everything that happened in one list: All | Needs attention |
 * Sessions, with the items that need the therapist pinned above Today / Yesterday / Earlier.
 *
 * Built from the therapist's real data rather than a feed table, because there is no
 * notifications service yet and inventing one would show a therapist things that never
 * happened. Three real things can be derived:
 *  - safety alerts about their own clients they have not noted,
 *  - past sessions with no notes written,
 *  - sessions a family booked.
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
import { useTherapistAlerts, useTherapistSessions } from '@/lib/clients';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Item = {
  id: string;
  kind: 'alert' | 'notes' | 'booking';
  icon: IconName;
  title: string;
  detail: string;
  tag: string;
  tone: BadgeTone;
  /** When it happened, for the Today / Yesterday / Earlier grouping. */
  at: number;
  /** Items that need the therapist are pinned above the days. */
  needsAttention: boolean;
  href: Href;
};

const ON = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAYS = ['Today', 'Yesterday', 'Earlier'] as const;
function dayOf(at: number): (typeof DAYS)[number] {
  const day = startOfDay(at);
  const today = startOfDay(Date.now());
  if (day === today) return 'Today';
  if (day === today - 86_400_000) return 'Yesterday';
  return 'Earlier';
}

function Row({ item, divider }: { item: Item; divider: boolean }) {
  const { c } = useTheme();
  const warn = item.needsAttention;
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

export default function TherapistNotifications() {
  const { c } = useTheme();
  const { alerts } = useTherapistAlerts(false);
  const sessions = useTherapistSessions();
  const [filter, setFilter] = useState<string>('All');

  const items: Item[] = [
    ...alerts.map((a): Item => {
      const who = a.child_name ?? 'A client';
      return {
        id: `alert-${a.id}`,
        kind: 'alert',
        icon: 'alert-circle',
        title: `${who}’s app switched to calm steps`,
        detail: a.parent_seen_at ? 'The family has seen this' : 'Not seen by the family yet',
        tag: a.noted_at ? 'NOTED' : 'NEEDS ATTENTION',
        tone: a.noted_at ? 'neutral' : 'warn',
        at: new Date(a.timestamp).getTime(),
        needsAttention: !a.noted_at,
        href: `/therapist/alert?id=${a.id}` as Href,
      };
    }),
    ...sessions
      .filter((s) => s.status === 'completed' && s.notes_written === false)
      .map((s): Item => ({
        id: `notes-${s.id}`,
        kind: 'notes',
        icon: 'edit-2',
        title: `Write notes for ${s.child_name ?? 'your client'}`,
        detail: `Session on ${ON.format(new Date(s.start_time))}`,
        tag: 'NOTES TO WRITE',
        tone: 'warn',
        at: new Date(s.end_time).getTime(),
        needsAttention: true,
        href: `/therapist/notes?session=${s.id}` as Href,
      })),
    ...sessions
      .filter((s) => s.status === 'booked')
      .map((s): Item => ({
        id: `booking-${s.id}`,
        kind: 'booking',
        icon: 'calendar',
        title: `${s.child_name ?? 'A family'}’s session is booked`,
        detail: `${ON.format(new Date(s.start_time))} · ${s.meeting_kind === 'video' ? 'Video call' : 'In person'}`,
        tag: 'NEW BOOKING',
        tone: 'info',
        at: new Date(s.created_at).getTime(),
        needsAttention: false,
        href: `/therapist/session?id=${s.id}` as Href,
      })),
  ].sort((a, b) => b.at - a.at);

  const shown = items.filter((i) =>
    filter === 'Needs attention' ? i.needsAttention : filter === 'Sessions' ? i.kind !== 'alert' : true,
  );
  const pinned = shown.filter((i) => i.needsAttention);
  const rest = shown.filter((i) => !i.needsAttention);

  const empty =
    filter === 'Needs attention'
      ? { title: 'Nothing needs you right now.', line: 'Calm-step alerts from your clients show here straight away.' }
      : filter === 'Sessions'
        ? { title: 'No session updates yet.', line: 'Bookings and notes to write show here.' }
        : { title: 'You’re all caught up.', line: 'We’ll tell you when a family books, or when notes are due.' };

  return (
    <Screen backdrop="brand" header={<Header title="Notifications" getHelp={false} fallback={'/therapist/today' as Href} />}>
      <Segmented
        label="Show notifications"
        options={['All', 'Needs attention', 'Sessions']}
        value={filter}
        onChange={setFilter}
      />
      <Stagger key={filter}>
        {pinned.length ? <Group title="Needs attention" items={pinned} /> : null}
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
          <ListRow title="Choose what we tell you about" icon="bell" chevron onPress={() => router.push('/therapist/account')} />
        </Card>
      </Stagger>
    </Screen>
  );
}
