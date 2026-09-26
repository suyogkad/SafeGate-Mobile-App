/**
 * T01 Therapist Today (tab root). Built like parent Home: the hero is the therapist's own photo under a navy overlay
 * (bell with the unread count + "PS" avatar;
 * the pill button opens My hours), "Needs attention" (calm-step alerts, notes to write, a family sharing their
 * week), today's sessions, "Coming up" as the Sessions cards, open times this week as chips, and quick-action tiles.
 * Every side shares one demo day (Sunday 11 October), so Today says there are no sessions and Coming up leads.
 * Alex's booking comes from the shared store, so a parent's booking shows up here live.
 */
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, type ImageSourcePropType } from 'react-native';
import { HeroBand } from '@/components/HeroBand';
import { QuickTile, TileGrid } from '@/components/QuickTile';
import { Screen } from '@/components/Screen';
import { SessionCard, withComma } from '@/components/SessionCard';
import { Appear } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Avatar, FaceCircle, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { CountBadge } from '@/components/ui/CountBadge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { PHOTOS } from '@/data/faces';
import { NOTIFICATION_LOOK, type Notification } from '@/data/notifications';
import { CLIENTS, DEMO_DAY, PRACTITIONER } from '@/data/practice';
import { addDays, bookableSlots, dayLabel, dayShort, DEMO_TODAY, timeLabel, weekStart } from '@/lib/schedule';
import { needsAttention } from '@/lib/clients';
import { greeting } from '@/lib/time';
import { isOpenUrgent, useApp, useBookings, useChildName, useUnreadCount } from '@/store/app';
import { gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** The parent Home "Needs you" card. Every title already names the child ("Write notes for Alex"). */
function NeedsCard({ n }: { n: Notification }) {
  const { c } = useTheme();
  const look = NOTIFICATION_LOOK[n.type];
  // the child's own character (how the child is recognised everywhere), not decorative art
  const client = CLIENTS[n.childId as keyof typeof CLIENTS];
  const picture: { face?: ImageSourcePropType; tint?: string } = n.urgent ? {} : { face: client?.face ?? look.face, tint: client?.tint ?? look.tint };
  const open = () => {
    useApp.getState().markRead(n.id);
    router.push(n.href as Href);
  };
  return (
    <Card tone="outlined" padding={space.lg} onPress={open} label={`${n.title}. ${n.detail}. ${look.tag}. ${n.opens}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {picture.face ? (
          <FaceCircle face={picture.face} tint={picture.tint} size={48} />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: c.warnTint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={22} color={c.onWarnTint} />
          </View>
        )}
        <View style={{ flex: 1, gap: space.xs }}>
          <T v="section">{n.title}</T>
          <T v="bodySm" color="textMuted">
            {n.detail}
          </T>
          <Badge label={look.tag} tone={look.tone} />
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </View>
    </Card>
  );
}

export default function TherapistToday() {
  const { c } = useTheme();
  const name = useChildName();
  const unread = useUnreadCount('therapist');
  const notifications = useApp((s) => s.notifications);

  // Urgent alerts first, then the rest newest first.
  const needs = notifications.filter(needsAttention).sort((a, b) => Number(isOpenUrgent(b)) - Number(isOpenUrgent(a)));

  // From Priya's calendar (her hours + bookings), so a parent's booking or a change in My hours shows up here live.
  const bookings = useBookings();
  const availability = useApp((s) => s.availability);
  const comingUp = bookings.filter((bk) => bk.date > DEMO_TODAY).slice(0, 3);
  const monday = weekStart(addDays(DEMO_TODAY, 1));
  const openTimes = bookableSlots(availability, bookings, monday, addDays(monday, 6));

  const actions: { title: string; icon: IconName; href: Href }[] = [
    { title: 'Set my hours', icon: 'clock', href: '/therapist/availability' },
    { title: 'Add time off', icon: 'sun', href: '/therapist/slot?mode=off' },
    { title: 'Clients', icon: 'users', href: '/therapist/clients' },
    { title: 'Notifications', icon: 'bell', href: '/therapist/notifications' },
  ];

  return (
    <Screen inTabs padded={false} edgeToEdge>
      <StatusBar style="light" />
      <HeroBand
        photo={PHOTOS.priya.hero}
        topRight={
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Tappable
              label={`Notifications, ${unread ? `${unread} new` : 'none new'}`}
              onPress={() => router.push('/therapist/notifications')}
              visualHeight={44}
            >
              <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={22} color={c.brand} />
                <CountBadge count={unread} ring={c.brand} />
              </View>
            </Tappable>
            <Tappable label={`${PRACTITIONER.name}. Open account`} onPress={() => router.push('/therapist/account')} visualHeight={44}>
              <Avatar initials={PRACTITIONER.initials} size={44} />
            </Tappable>
          </View>
        }
      >
        <View style={{ gap: space.sm }}>
          <T v="heading" color="onBrand" header>
            {greeting(PRACTITIONER.first)}
          </T>
          <T v="bodyLg" color="onBrand">
            {DEMO_DAY.label}
          </T>
        </View>
        <Button title="My hours" size="small" icon="arrow-right" onPress={() => router.push('/therapist/availability')} />
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Needs attention" />
          {needs.length ? (
            needs.map((n, i) => (
              <Appear key={n.id} delay={i * 60}>
                <NeedsCard n={n} />
              </Appear>
            ))
          ) : (
            <Card padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" color="textSecondary">
                  Nothing needs you right now
                </T>
              </View>
            </Card>
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Today" />
          <Card padding={space.lg}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Icon name="calendar" size={22} color={c.textSecondary} />
              <T v="bodyLg" color="textSecondary">
                No sessions today
              </T>
            </View>
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Coming up" action="Calendar" actionLabel="Open the calendar" onAction={() => router.push('/therapist/calendar')} />
          {comingUp.map((b, i) => {
            const client = CLIENTS[b.clientId];
            const who = b.clientId === 'alex' ? name : client.name;
            return (
              <Appear key={b.id} delay={i * 60}>
                <SessionCard
                  date={b.date}
                  start={b.start}
                  initials={who.charAt(0)}
                  tag={b.kind.toUpperCase()}
                  line={`${who} · with ${client.parent}`}
                  label={`${withComma(dayLabel(b.date))}, ${timeLabel(b.start)}. ${who}, ${b.kind.toLowerCase()}, with ${client.parent}. Open the session`}
                  onPress={() => router.push(`/therapist/session?id=${b.id}` as Href)}
                />
              </Appear>
            );
          })}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Open times this week" />
          {openTimes.length ? null : (
            <T v="body" color="textMuted">
              No open times this week. Add some in My hours.
            </T>
          )}
          <ChipRow>
            {openTimes.map((o) => {
              const short = `${dayShort(o.date).split(' ')[0]} ${timeLabel(o.start)}`;
              return (
                <Chip
                  key={`${o.date}${o.start}`}
                  label={short}
                  a11yLabel={`Open time, ${dayLabel(o.date)}, ${timeLabel(o.start)}. Change or remove`}
                  onPress={() => router.push(`/therapist/slot?date=${o.date}&start=${o.start}${o.extraId ? `&extra=${o.extraId}` : ''}` as Href)}
                />
              );
            })}
          </ChipRow>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Quick actions" />
          <TileGrid>
            {actions.map((a) => (
              <QuickTile key={a.title} title={a.title} icon={a.icon} onPress={() => router.push(a.href)} />
            ))}
          </TileGrid>
        </View>
      </View>
    </Screen>
  );
}
