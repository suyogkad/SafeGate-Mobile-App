/**
 * P09 Parent Home (tab root). A full-bleed hero (the bell and the child's avatar top-right;
 * the pill button opens Find a therapist), "Needs you", "Updates", chips, the upcoming
 * session, the "Today with <child>" timeline and quick-action tiles.
 *
 * "Needs you" answers the parent's first question, so it comes first. It is real: safety
 * alerts about their own child, straight from the backend, and it says SEEN once the
 * parent has said so. Calm, never red.
 *
 * Rows only appear for things that actually happened. Check-ins and the journal have no
 * endpoint yet, so they are not in the timeline at all rather than showing a made-up mood.
 */
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { HeroBand } from '@/components/HeroBand';
import { QuickTile, TileGrid } from '@/components/QuickTile';
import { Screen } from '@/components/Screen';
import { Timeline } from '@/components/Timeline';
import { Appear } from '@/components/ui/Appear';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Avatar, FaceCircle, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CountBadge } from '@/components/ui/CountBadge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { FACES } from '@/data/faces';
import { useChildAlerts, useChildChats, useFamilySessions, useMyChild } from '@/lib/family';
import { localDateIso } from '@/lib/schedule';
import { greeting, initialsOf, clockOf } from '@/lib/time';
import { useApp } from '@/store/app';
import { artTints, gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const DAY = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function ParentHome() {
  const { c } = useTheme();
  const account = useApp((s) => s.account);
  const parentFirstName = account?.name ? account.name.split(' ')[0] : 'there';

  const child = useMyChild();
  const name = child?.full_name || 'your child';
  const { alerts, open } = useChildAlerts(child?.id);
  const sessions = useFamilySessions();
  const { turns } = useChildChats(child?.id);

  // A child tapping "Let <parent> know" in Get help is still local: that child screen
  // has no endpoint yet. Every other item here is real.
  const helpRequest = useApp((s) => s.helpRequest);
  const helpRequestAt = useApp((s) => s.helpRequestAt);
  const helpSeen = useApp((s) => s.helpSeen);

  const today = localDateIso(new Date());
  const now = Date.now();

  const nextSession = sessions
    .filter((s) => s.status === 'booked' && new Date(s.start_time).getTime() > now)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

  // Needs you: alerts nobody has said they've seen, then ones already seen today.
  const needs: { key: string; href: Href; title: string; meta: string; tag: string; tone: BadgeTone }[] = [];
  for (const a of alerts.filter((x) => !x.acknowledged_at || localDateIso(new Date(x.timestamp)) === today)) {
    needs.push({
      key: a.id,
      href: `/parent/alert?id=${a.id}` as Href,
      title: `${name}'s app switched to calm steps`,
      meta: `${DAY.format(new Date(a.timestamp))}, ${clockOf(a.timestamp)}`,
      tag: a.emergency_requested_at ? 'EMERGENCY ASKED' : a.acknowledged_at ? 'SEEN' : 'NEEDS YOU',
      tone: a.acknowledged_at ? 'neutral' : 'warn',
    });
  }
  if (helpRequest) {
    needs.push({
      key: 'help',
      href: '/parent/alert?kind=help',
      title: `${name} tapped “Let ${parentFirstName} know”`,
      meta: `“${helpRequest}” · Today, ${helpRequestAt ?? ''}`.trim(),
      tag: helpSeen ? 'SEEN' : 'NEEDS YOU',
      tone: helpSeen ? 'neutral' : 'warn',
    });
  }
  // The bell counts what genuinely needs the parent.
  const unread = open.length + (helpRequest && !helpSeen ? 1 : 0);

  // Updates: the quiet things, newest first. Nothing urgent appears here, so
  // nothing shows twice on Home.
  const updates: { key: string; title: string; meta: string; href: Href; icon: IconName }[] = [];
  for (const s of sessions.filter((x) => x.notes_shared_at).slice(0, 3)) {
    updates.push({
      key: `notes-${s.id}`,
      title: `${s.therapist_name ?? 'Your therapist'} shared notes`,
      meta: `Session on ${DAY.format(new Date(s.start_time))}`,
      href: `/parent/session-notes?id=${s.id}` as Href,
      icon: 'file-text',
    });
  }
  if (nextSession) {
    updates.push({
      key: `booked-${nextSession.id}`,
      title: `Session booked with ${nextSession.therapist_name ?? 'your therapist'}`,
      meta: `${DAY.format(new Date(nextSession.start_time))} · ${clockOf(nextSession.start_time)}`,
      href: '/parent/sessions',
      icon: 'calendar',
    });
  }
  const shownUpdates = updates.slice(0, 3);

  // Today with <child>: only what actually happened today.
  const todaysTurns = turns.filter((t) => localDateIso(new Date(t.timestamp)) === today);
  const todaysAlerts = alerts.filter((a) => localDateIso(new Date(a.timestamp)) === today);
  const timeline: { key: string; caption: string; label?: string; title: string; href: Href; face: typeof FACES.calmHexagon; tint: string }[] = [];
  for (const a of todaysAlerts) {
    timeline.push({
      key: `calm-${a.id}`,
      caption: `Today · ${clockOf(a.timestamp)}`,
      title: 'calm steps started',
      href: `/parent/alert?id=${a.id}` as Href,
      face: FACES.calmHexagon,
      tint: artTints.cyan,
    });
  }
  if (todaysTurns.length) {
    const last = todaysTurns[todaysTurns.length - 1];
    timeline.push({
      key: 'chat',
      caption: `Today · ${clockOf(last.timestamp)}`,
      label: todaysTurns.length === 1 ? 'Chatted once with' : `Chatted ${todaysTurns.length} times with`,
      title: 'the AI companion',
      href: '/parent/chats',
      face: FACES.monocleWave,
      tint: artTints.blue,
    });
  }

  const chips: { label: string; icon: IconName; href: Href }[] = [
    { label: 'Sessions', icon: 'calendar', href: '/parent/sessions' },
    { label: 'Chats', icon: 'message-circle', href: '/parent/chats' },
    { label: 'Journal', icon: 'book-open', href: '/parent/journal' },
    { label: 'Insights', icon: 'bar-chart-2', href: '/parent/insights' },
    { label: 'Help lines', icon: 'phone', href: '/parent/help-lines' },
  ];

  const actions: { title: string; icon: IconName; href: Href }[] = [
    { title: 'Book a session', icon: 'plus-circle', href: '/parent/find-therapist' },
    { title: 'Read chats', icon: 'message-circle', href: '/parent/chats' },
    { title: 'End their session', icon: 'power', href: '/parent/link-child' },
    { title: `${name}'s day`, icon: 'sun', href: '/parent/alexs-day' },
    { title: 'Comfort settings', icon: 'sliders', href: '/parent/child-comfort?from=home' },
    { title: 'Link code', icon: 'link', href: '/parent/link-child' },
  ];

  return (
    <Screen inTabs padded={false} edgeToEdge>
      <StatusBar style="light" />
      <HeroBand
        topRight={
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Tappable
              label={`Notifications, ${unread ? `${unread} needing you` : 'nothing needing you'}`}
              onPress={() => router.push('/parent/notifications')}
              visualHeight={44}
            >
              <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={22} color={c.brand} />
                <CountBadge count={unread} ring={c.brand} />
              </View>
            </Tappable>
            <Tappable label={`${name}. Open account`} onPress={() => router.push('/parent/account')} visualHeight={44}>
              <Avatar initials={initialsOf(name) || '?'} size={44} />
            </Tappable>
          </View>
        }
      >
        <View style={{ gap: space.sm }}>
          <T v="heading" color="onBrand" header>
            {greeting(parentFirstName)}
          </T>
          <T v="bodyLg" color="onBrand">
            {child ? `Here’s ${name}’s day.` : 'Add your child to get started.'}
          </T>
        </View>
        <Button title="Find a therapist" size="small" icon="arrow-right" onPress={() => router.push('/parent/find-therapist')} />
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Needs you" />
          {needs.length ? (
            needs.map((n, i) => (
              <Appear key={n.key} delay={i * 60}>
                <Card tone="outlined" padding={space.lg} onPress={() => router.push(n.href)} label={`${n.title}. ${n.meta}. ${n.tag}. Open`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radius.pill,
                        backgroundColor: n.tone === 'warn' ? c.warnTint : c.chip,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="bell" size={22} color={n.tone === 'warn' ? c.onWarnTint : c.textSecondary} />
                    </View>
                    <View style={{ flex: 1, gap: space.xs }}>
                      <T v="section">{n.title}</T>
                      <T v="bodySm" color="textMuted">
                        {n.meta}
                      </T>
                      <Badge label={n.tag} tone={n.tone} />
                    </View>
                    <Icon name="chevron-right" size={20} color={c.textMuted} />
                  </View>
                </Card>
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
          <SectionHeader title="Updates" action="View all" actionLabel="View all notifications" onAction={() => router.push('/parent/notifications')} />
          <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {shownUpdates.length ? (
              shownUpdates.map((u, i) => (
                <Tappable key={u.key} label={`${u.title}. ${u.meta}`} onPress={() => router.push(u.href)}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: space.md,
                      borderBottomWidth: i < shownUpdates.length - 1 ? 1 : 0,
                      borderBottomColor: c.divider,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={u.icon} size={20} color={c.brand} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="bodyLg">{u.title}</T>
                      <T v="bodySm" color="textMuted">
                        {u.meta}
                      </T>
                    </View>
                    <Icon name="chevron-right" size={20} color={c.textMuted} />
                  </View>
                </Tappable>
              ))
            ) : (
              <T v="bodyLg" color="textSecondary" style={{ paddingVertical: space.md }}>
                Nothing new about {name}.
              </T>
            )}
          </Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: gutter }}>
          {chips.map((ch) => (
            <Chip key={ch.label} label={ch.label} icon={ch.icon} onPress={() => router.push(ch.href)} />
          ))}
        </ScrollView>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Coming up" />
          {nextSession ? (
            <Card
              tone="outlined"
              padding={space.lg}
              onPress={() => router.push('/parent/sessions')}
              label={`Session with ${nextSession.therapist_name ?? 'your therapist'}, ${DAY.format(new Date(nextSession.start_time))}, ${clockOf(nextSession.start_time)}. Open sessions`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
                <Avatar initials={initialsOf(nextSession.therapist_name) || '?'} size={64} />
                <View style={{ flex: 1, gap: space.xs }}>
                  <T v="heading">Upcoming session</T>
                  <T v="section">{nextSession.therapist_name ?? 'Your therapist'}</T>
                  <T v="bodySm" color="textMuted">
                    {DAY.format(new Date(nextSession.start_time))} · {clockOf(nextSession.start_time)}
                  </T>
                  <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                    <Badge label={nextSession.meeting_kind === 'video' ? 'Video call' : 'In person'} />
                  </View>
                </View>
              </View>
            </Card>
          ) : (
            <Card tone="outlined" padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar" size={22} color={c.brand} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="section">No upcoming sessions</T>
                  <T v="bodySm" color="textMuted">
                    Book a time with a therapist anytime
                  </T>
                </View>
                <Button title="Book" size="small" onPress={() => router.push('/parent/find-therapist')} />
              </View>
            </Card>
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title={`Today with ${name}`} />
          {timeline.length ? (
            <Timeline>
              {timeline.map((it) => (
                <CheckinCard
                  key={it.key}
                  caption={it.caption}
                  label={it.label}
                  title={it.title}
                  right={<FaceCircle face={it.face} tint={it.tint} size={72} />}
                  onPress={() => router.push(it.href)}
                />
              ))}
            </Timeline>
          ) : (
            <Card tone="outlined" padding={space.lg}>
              <T v="bodyLg" color="textSecondary">
                Nothing from {name} today yet.
              </T>
            </Card>
          )}
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
